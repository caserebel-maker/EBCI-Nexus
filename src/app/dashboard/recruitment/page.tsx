import prisma from "@/lib/prisma"
import { ApplicantTable } from "./applicant-table"
import { UserCircle } from 'lucide-react'
import { User } from 'lucide-react'

// Force dynamic fetch to ensure fresh data
export const dynamic = 'force-dynamic'

export default async function RecruitmentPage() {
    try {
        const [applicantsRaw] = await Promise.all([
            prisma.applicant.findMany({
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    nickname: true,
                    positionApplied: true,
                    status: true,
                    createdAt: true,
                    email: true,
                    phone: true,
                    photoPath: true,
                }
            })
        ])

        const applicants = applicantsRaw.map((a: any) => ({
            ...a,
            createdAt: a.createdAt?.toISOString() || new Date().toISOString()
        }))

        return (
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                        <User className="h-6 w-6 text-white dark:text-primary" />
                        Recruitment
                    </h1>
                    <p className="text-white/80 dark:text-muted-foreground text-sm">
                        จัดการผู้สมัครงานและติดตามสถานะใบสมัครที่ส่งเข้ามา
                    </p>
                </div>

                {/* Main Content */}
                <ApplicantTable initialData={applicants} />
            </div>
        )
    } catch (error) {
        console.error("DEBUG: Recruitment Page Error:", error)
        return (
            <div className="p-8 text-white bg-rose-500/20 rounded-xl border border-rose-500/30">
                <h2 className="text-xl font-bold mb-2">Error loading recruitment data</h2>
                <p className="text-sm opacity-80">Please check server logs or ensure the database is initialized.</p>
                <div className="mt-4 p-4 bg-black/40 rounded text-[10px] overflow-auto font-mono text-rose-300">
                    {error instanceof Error ? error.message : String(error)}
                </div>
            </div>
        )
    }
}
