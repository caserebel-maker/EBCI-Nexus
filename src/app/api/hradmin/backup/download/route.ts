import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, canManageSystem, isLegacyHrAdmin } from '@/lib/route-auth'
import { toCsv, buildManifestMd, buildSystemMd, sanitizeForZip, type BackupManifestInput } from '@/lib/backup'

export const dynamic = 'force-dynamic'
// The ZIP build can take ~30–60s once the slips bucket fills up (54
// employees × monthly PDFs). Bump the function timeout above the 10s
// default. Vercel's hard cap on the current plan is 300s.
export const maxDuration = 300

/**
 * GET /api/hradmin/backup/download
 *
 * Builds a ZIP that contains every HR-relevant table (as CSV) plus
 * every binary in every Supabase Storage bucket, alongside two
 * markdown briefings (SYSTEM.md + MANIFEST.md) so a future operator —
 * human or AI — has the context to interpret + restore the snapshot.
 *
 * Permission: super-admin only (`can_manage_system` flag) or the
 * legacy `hr_admin` role for accounts predating the flag rollout.
 *
 * Memory note: JSZip buffers the whole archive in memory because
 * Vercel's response API doesn't currently expose a clean Node stream.
 * At <500 MB this fits in the 1 GB memory ceiling; if salary slips
 * push the archive past that we'll need to split per-bucket or move
 * to S3 + presigned URLs. See SYSTEM.md for the long-term plan.
 */
export async function GET() {
    const auth = await getAuth()
    if (!auth) return new Response('Unauthorized', { status: 401 })
    if (!canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        return new Response('Forbidden — super-admin only', { status: 403 })
    }

    if (process.env.BACKUP_DOWNLOAD_ENABLED !== 'true') {
        return new Response(
            'System backup download is temporarily disabled to preserve Vercel free-tier CPU. Set BACKUP_DOWNLOAD_ENABLED=true only when you need to run a manual backup.',
            {
                status: 503,
                headers: {
                    'cache-control': 'no-store',
                },
            },
        )
    }

    const startedAt = new Date()
    const zip = new JSZip()
    const failures: string[] = []

    // ─── 1. Tables → CSV ────────────────────────────────────────────────
    // Each entry: { name, columns?, query }. `columns` pins the CSV
    // header order so the file is stable across runs even if the
    // Postgres column list shifts (it's read-only, but readability
    // matters when Mod opens these in Excel).
    const tables: Array<{
        name: string
        columns?: string[]
        select: string
        order?: { column: string; ascending?: boolean }
    }> = [
        { name: 'employees',
          select: '*',
          order: { column: 'employee_code', ascending: true } },
        { name: 'User',
          select: '*',
          order: { column: 'username', ascending: true } },
        { name: 'leave_requests',
          select: '*',
          order: { column: 'created_at', ascending: false } },
        { name: 'leave_balances',
          select: '*',
          order: { column: 'employee_id' } },
        { name: 'leave_types',
          select: '*',
          order: { column: 'display_order' } },
        { name: 'holidays',
          select: '*',
          order: { column: 'date' } },
        { name: 'announcements',
          select: '*',
          order: { column: 'publish_date', ascending: false } },
        { name: 'salary_slips',
          select: '*',
          order: { column: 'period_year_month', ascending: false } },
        { name: 'offices',
          select: '*' },
        { name: 'check_ins',
          select: '*',
          order: { column: 'check_in_at', ascending: false } },
        { name: 'job_applications',
          select: '*',
          order: { column: 'submitted_at', ascending: false } },
    ]

    const tableCounts: Record<string, number> = {}

    await Promise.all(tables.map(async t => {
        try {
            let q = supabaseAdmin.from(t.name).select(t.select)
            if (t.order) {
                q = q.order(t.order.column, { ascending: t.order.ascending ?? true })
            }
            const { data, error } = await q
            if (error) {
                // Some tables may not exist yet in older deploys (e.g. brand-new
                // ones added this session). Record the miss in failures so the
                // manifest reflects reality, but keep building the rest of the
                // ZIP — a partial backup beats a hard 500.
                failures.push(`table ${t.name}: ${error.message}`)
                tableCounts[t.name] = 0
                zip.file(`data/${t.name}.csv`, toCsv([]))
                return
            }
            const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
            tableCounts[t.name] = rows.length
            zip.file(`data/${t.name}.csv`, toCsv(rows, t.columns))
        } catch (err) {
            console.error('[backup] table fetch failed:', t.name, err)
            failures.push(`table ${t.name}: ${(err as Error).message ?? 'unknown error'}`)
            tableCounts[t.name] = 0
            zip.file(`data/${t.name}.csv`, toCsv([]))
        }
    }))

    // ─── 2. Storage buckets → files/ ────────────────────────────────────
    const buckets = [
        'employee-photos',
        'employee-contracts',
        'salary-slips',
        'announcement-images',
        'applicant-assets',
        'leave-attachments',
        'employee-assets',
    ] as const

    const bucketStats: BackupManifestInput['bucketStats'] = []

    for (const bucket of buckets) {
        const stat = { bucket, files: 0, bytes: 0, failed: 0 }
        try {
            const paths = await listAllFiles(bucket)
            for (const p of paths) {
                const safe = sanitizeForZip(p)
                try {
                    const { data, error } = await supabaseAdmin.storage
                        .from(bucket)
                        .download(p)
                    if (error || !data) {
                        stat.failed++
                        failures.push(`storage ${bucket}/${p}: ${error?.message ?? 'no data'}`)
                        continue
                    }
                    const buf = new Uint8Array(await data.arrayBuffer())
                    stat.files++
                    stat.bytes += buf.byteLength
                    zip.file(`files/${bucket}/${safe}`, buf)
                } catch (err) {
                    stat.failed++
                    failures.push(`storage ${bucket}/${p}: ${(err as Error).message}`)
                }
            }
        } catch (err) {
            failures.push(`bucket ${bucket}: ${(err as Error).message}`)
        }
        bucketStats.push(stat)
    }

    // ─── 3. SYSTEM.md + MANIFEST.md ─────────────────────────────────────
    // SessionUser doesn't carry email — pull it from auth.users so the
    // manifest captures who triggered the backup. Best-effort: if the
    // lookup fails we fall through with just the display name.
    let triggerEmail = ''
    try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(auth.session.id)
        triggerEmail = data?.user?.email ?? ''
    } catch (err) {
        console.warn('[backup] could not resolve trigger email:', err)
    }
    const triggeredBy = {
        name: auth.session.name ?? 'unknown',
        email: triggerEmail,
    }

    zip.file('SYSTEM.md', buildSystemMd())
    zip.file('MANIFEST.md', buildManifestMd({
        createdAt: startedAt,
        triggeredBy,
        tableCounts,
        bucketStats,
        failures,
    }))

    // ─── 4. Stream out as one Blob ──────────────────────────────────────
    const archiveBytes = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    })
    const blob = new Blob([archiveBytes as BlobPart], { type: 'application/zip' })

    const stamp = startedAt.toISOString().slice(0, 10)
    const filename = `ebci-nexus-backup-${stamp}.zip`

    return new Response(blob, {
        status: 200,
        headers: {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="${filename}"`,
            'content-length': String(blob.size),
            // Tell intermediate caches (Vercel CDN especially) not to keep a
            // copy — the archive contains every employee record in the company.
            'cache-control': 'private, no-store',
        },
    })
}

// ─── helpers ──────────────────────────────────────────────────────────────

/**
 * Recursively walk a Supabase Storage bucket and return every object
 * path. Supabase's `list` API only returns one folder level at a time
 * and caps at 100 entries per call by default; we page through each
 * folder until exhausted, then recurse into subfolders.
 */
async function listAllFiles(bucket: string, prefix = ''): Promise<string[]> {
    const paths: string[] = []
    let offset = 0
    const PAGE = 100

    while (true) {
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
        if (error) {
            console.error('[backup] list error:', bucket, prefix, error)
            return paths
        }
        if (!data || data.length === 0) break

        for (const entry of data) {
            // Folder rows have id === null in Supabase's list response.
            if (entry.id === null) {
                const sub = prefix ? `${prefix}/${entry.name}` : entry.name
                const childPaths = await listAllFiles(bucket, sub)
                paths.push(...childPaths)
            } else {
                paths.push(prefix ? `${prefix}/${entry.name}` : entry.name)
            }
        }

        if (data.length < PAGE) break
        offset += PAGE
    }

    return paths
}
