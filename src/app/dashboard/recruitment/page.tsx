import { supabase } from "@/lib/supabase"
import { ApplicantTable, Applicant } from "./applicant-table"
import { RecruitmentHeader } from "./header"
import { User, ShieldAlert } from 'lucide-react'

// Force dynamic fetch to ensure fresh data
export const dynamic = 'force-dynamic'

export default async function RecruitmentPage() {
    try {
        // Fetch applicants from Supabase
        const { data: applicantsRaw, error } = await supabase
            .from('applicants')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        const applicants: Applicant[] = (applicantsRaw || []).map((a: any) => ({
            id: a.id,
            firstName: a.first_name,
            lastName: a.last_name,
            nickname: a.nickname,
            positionApplied: a.position_applied,
            status: a.status,
            createdAt: a.created_at,
            email: a.email,
            phone: a.phone,
            photoPath: a.photo_path,
        }))

        return (
            <div className="space-y-6">
                {/* Page Header */}
                {/* Page Header */}
                <RecruitmentHeader />

                {/* Main Content */}
                <ApplicantTable initialData={applicants} />
            </div>
        )
    } catch (error: any) {
        console.error("DEBUG: Recruitment Page Error:", error)
        return (
            <div className="p-8 text-white bg-rose-500/20 rounded-xl border border-rose-500/30">
                <div className="flex items-center gap-3 mb-2 text-rose-400">
                    <ShieldAlert size={24} />
                    <h2 className="text-xl font-bold">Error loading cloud recruitment data</h2>
                </div>
                <p className="text-sm opacity-80">Please check your Supabase connection settings in .env</p>
                <div className="mt-4 p-4 bg-black/40 rounded text-[10px] overflow-auto font-mono text-rose-300">
                    {error.message || String(error)}
                </div>
            </div>
        )
    }
}
