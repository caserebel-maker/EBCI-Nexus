import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { signApplicantAsset, signApplicantPath } from '@/lib/applicant-files'
import type { SavedEvaluation } from '@/components/hradmin/applicants/InterviewEvaluation'
import { ApplicantDetailView } from './detail-view'

export const dynamic = 'force-dynamic'

export default async function ApplicantDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    // HR-staff guard — legacy hr_admin role OR can_edit_employees / can_manage_system
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/hradmin/dashboard')

    const { data: a } = await supabaseAdmin
        .from('job_applications')
        .select('*')
        .eq('id', id)
        .maybeSingle()
    if (!a) notFound()

    // Re-sign every private-bucket URL on each render. *_path is the
    // canonical source of truth post-2026-05-03 migration; *_url falls
    // back for any pre-migration row that hasn't been backfilled.
    // signApplicantAsset does the right thing for either input.
    const row = a as Record<string, string | null>
    const [photo, cv, transcript, idCard, house] = await Promise.all([
        signApplicantAsset(row.photo_path, row.photo_url),
        signApplicantAsset(row.cv_path, row.cv_url),
        signApplicantAsset(row.transcript_path, row.transcript_url),
        signApplicantAsset(row.id_card_copy_path, row.id_card_copy_url),
        signApplicantAsset(row.house_registration_path, row.house_registration_url),
    ])

    // Other documents too — array of { name, path, url, ... }. Path is
    // the canonical key for re-signing; url is just the legacy preview
    // value (1-hour) we wrote at upload time.
    const rawOthers = Array.isArray(a.other_documents) ? a.other_documents as Array<Record<string, unknown>> : []
    const refreshedOthers = await Promise.all(rawOthers.map(async d => {
        const path = typeof d.path === 'string' ? d.path : null
        const legacyUrl = typeof d.url === 'string' ? d.url : null
        return {
            name: typeof d.name === 'string' ? d.name : undefined,
            url: path ? await signApplicantPath(path) : await signApplicantAsset(null, legacyUrl),
        }
    }))

    const savedEvaluations = parseEvaluations(a.interview_evaluation)
    const currentUserId = auth.session.employeeId ?? auth.session.id

    return (
        <ApplicantDetailView
            application={a as Record<string, unknown>}
            id={id}
            refreshedFiles={{
                photo_url: photo,
                cv_url: cv,
                transcript_url: transcript,
                id_card_copy_url: idCard,
                house_registration_url: house,
            }}
            otherDocuments={refreshedOthers}
            savedEvaluations={savedEvaluations}
            currentUserId={currentUserId}
        />
    )
}

function parseEvaluations(raw: unknown): SavedEvaluation[] {
    if (!raw) return []
    if (Array.isArray(raw)) {
        return raw as SavedEvaluation[]
    }
    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>
        if (Array.isArray(obj.factors)) {
            return [raw as SavedEvaluation]
        }
    }
    return []
}

