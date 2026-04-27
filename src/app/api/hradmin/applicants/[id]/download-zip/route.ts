import { NextRequest } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

const BUCKET = 'applicant-assets'

/** Fields on job_applications that hold a single signed URL each. */
const SINGLE_FIELDS = [
    { col: 'photo_url',                label: 'photo' },
    { col: 'cv_url',                   label: 'cv' },
    { col: 'transcript_url',           label: 'transcript' },
    { col: 'id_card_copy_url',         label: 'id-card' },
    { col: 'house_registration_url',   label: 'house-registration' },
    { col: 'signature_url',            label: 'signature' },
] as const

/**
 * GET /api/hradmin/applicants/[id]/download-zip
 *
 * Bundles every uploaded document for one applicant into a single ZIP
 * so HR can hand the package off to the hiring manager in one click.
 * Each file lives at the top level of the archive prefixed with its
 * doc kind (photo, cv, transcript, …) and the original filename.
 *
 * Storage objects are pulled directly via service-role download (no
 * pre-signed URL), so file rights stay scoped to the API route — the
 * generated ZIP is the only artifact that leaves the server.
 *
 * Missing files are silently skipped (logged), so an applicant who
 * didn't upload a transcript still gets a usable archive.
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth()
    if (!auth) return new Response('Unauthorized', { status: 401 })
    if (!isHrStaff(auth)) return new Response('Forbidden', { status: 403 })

    const { id } = await context.params
    if (!id) return new Response('missing id', { status: 400 })

    const { data: row, error } = await supabaseAdmin
        .from('job_applications')
        .select('id, reference_code, first_name_th, last_name_th, nickname, photo_url, cv_url, transcript_url, id_card_copy_url, house_registration_url, signature_url, other_documents')
        .eq('id', id)
        .maybeSingle()
    if (error) {
        console.error('[applicants/download-zip] query error:', error)
        return new Response('Query failed', { status: 500 })
    }
    if (!row) return new Response('Not found', { status: 404 })

    const zip = new JSZip()
    const skipped: string[] = []

    // Collect (label, filename, path) tuples first so the ZIP loop is uniform.
    type Entry = { label: string; storedUrl: string }
    const entries: Entry[] = []

    for (const f of SINGLE_FIELDS) {
        const url = (row as Record<string, unknown>)[f.col] as string | null | undefined
        if (url) entries.push({ label: f.label, storedUrl: url })
    }

    // other_documents: array of { name?, url? } from the apply form
    const others = Array.isArray(row.other_documents) ? row.other_documents as Array<Record<string, unknown>> : []
    others.forEach((d, idx) => {
        const url = typeof d.url === 'string' ? d.url : null
        if (!url) return
        const baseName = typeof d.name === 'string' ? sanitize(d.name) : `doc-${idx + 1}`
        entries.push({ label: `other-${idx + 1}-${baseName}`, storedUrl: url })
    })

    if (entries.length === 0) {
        return new Response('No documents uploaded yet', { status: 404 })
    }

    // Download each file's bytes and add to the archive.
    await Promise.all(entries.map(async entry => {
        const path = extractStoragePath(entry.storedUrl)
        if (!path) {
            skipped.push(`${entry.label}: cannot parse storage path`)
            return
        }
        try {
            const { data, error: dlErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .download(path)
            if (dlErr || !data) {
                skipped.push(`${entry.label}: ${dlErr?.message ?? 'no data'}`)
                return
            }
            const buf = new Uint8Array(await data.arrayBuffer())
            const ext = guessExtension(path, data.type)
            const name = entry.label.includes('.') ? entry.label : `${entry.label}${ext}`
            zip.file(name, buf)
        } catch (err) {
            console.warn('[applicants/download-zip] file failed:', entry.label, err)
            skipped.push(`${entry.label}: download exception`)
        }
    }))

    // Add a small README so HR knows what's inside (and what was missing).
    const readme = buildReadme(row, entries.length, skipped)
    zip.file('README.txt', readme)

    // Wrap the Uint8Array in a Blob — the Web Response constructor in
    // the lib.dom.d.ts shipped with Next 16 / Node 24 accepts Blob
    // unconditionally, while raw typed arrays trip a typing edge-case.
    const archiveBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
    const archiveBlob = new Blob([archiveBytes as BlobPart], { type: 'application/zip' })

    const filename = buildFilename(row)
    return new Response(archiveBlob, {
        status: 200,
        headers: {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="${filename}"`,
            'content-length': String(archiveBlob.size),
        },
    })
}

// ─── helpers ───────────────────────────────────────────────────────────────

function extractStoragePath(url: string): string | null {
    const m = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?#]+)/)
    if (!m || m[1] !== BUCKET) return null
    try { return decodeURIComponent(m[2]) } catch { return m[2] }
}

function guessExtension(path: string, mime: string | undefined): string {
    const fromPath = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
    if (fromPath) return `.${fromPath}`
    const map: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png':  '.png',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
    }
    return mime ? map[mime] ?? '' : ''
}

function sanitize(name: string): string {
    return name
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
}

function buildFilename(row: Record<string, unknown>): string {
    const ref = sanitize(String(row.reference_code ?? row.id))
    const nick = sanitize(String(row.nickname ?? ''))
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const suffix = nick ? `-${nick}` : ''
    return `applicant-${ref}${suffix}-${stamp}.zip`
}

function buildReadme(
    row: Record<string, unknown>,
    fileCount: number,
    skipped: string[],
): string {
    const fullName = `${String(row.first_name_th ?? '')} ${String(row.last_name_th ?? '')}`.trim()
        + (row.nickname ? ` (${row.nickname})` : '')
    return [
        `EBCI Nexus — Applicant Document Bundle`,
        ``,
        `Reference:    ${row.reference_code ?? row.id}`,
        `Applicant:    ${fullName || '(no name)'}`,
        `Generated at: ${new Date().toISOString()}`,
        `File count:   ${fileCount}`,
        ``,
        skipped.length === 0
            ? `All linked files downloaded successfully.`
            : `Skipped (${skipped.length}):\n` + skipped.map(s => `  - ${s}`).join('\n'),
        ``,
        `Generated automatically by /api/hradmin/applicants/[id]/download-zip`,
    ].join('\n')
}
