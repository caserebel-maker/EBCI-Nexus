import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { refreshSignedUrl } from '@/lib/applicant-files'
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

    // Re-sign private bucket URLs (upload signed them for 7 days, which
    // expires long before the average hiring cycle finishes).
    const [photo, cv, transcript, idCard, house] = await Promise.all([
        refreshSignedUrl(a.photo_url as string | null),
        refreshSignedUrl(a.cv_url as string | null),
        refreshSignedUrl(a.transcript_url as string | null),
        refreshSignedUrl(a.id_card_copy_url as string | null),
        refreshSignedUrl(a.house_registration_url as string | null),
    ])

    // Other documents too — array of { name, path, url, ... }
    const rawOthers = Array.isArray(a.other_documents) ? a.other_documents as Array<Record<string, unknown>> : []
    const refreshedOthers = await Promise.all(rawOthers.map(async d => ({
        name: typeof d.name === 'string' ? d.name : undefined,
        url: await refreshSignedUrl(typeof d.url === 'string' ? d.url : null),
    })))

    const savedEvaluation =
        (a.interview_evaluation && typeof a.interview_evaluation === 'object')
            ? (a.interview_evaluation as unknown as SavedEvaluation)
            : null

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
            savedEvaluation={savedEvaluation}
        />
    )
}
