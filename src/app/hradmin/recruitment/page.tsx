import { redirect } from 'next/navigation'

/**
 * Legacy recruitment page — the old applicants / applicant_educations
 * tables it used are retired. The new /hradmin/applicants route reads
 * job_applications. Keep this stub so old bookmarks redirect cleanly
 * instead of 404ing. The old child components (applicant-table.tsx,
 * header.tsx, loading.tsx) are left in place unreferenced — safe to
 * delete in a future cleanup pass.
 */
export default function LegacyRecruitmentPage() {
    redirect('/hradmin/applicants')
}
