import prisma from "@/lib/prisma"
import { ApplicantTable } from "./applicant-table"
import { UserCircle } from 'lucide-react'

// Force dynamic fetch to ensure fresh data
export const dynamic = 'force-dynamic'

export default async function RecruitmentPage() {
    try {
        // Fetch real data from DB
        const applicantsRaw = await prisma.applicant.findMany({
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

        console.log('DEBUG: Recruitment Data Fetched:', applicantsRaw.length, 'applicants found.')
        if (applicantsRaw.length > 0) {
            console.log('DEBUG: First applicant:', applicantsRaw[0].firstName, applicantsRaw[0].lastName)
        }

        const applicants = [
            {
                id: "mock-1",
                firstName: "สมชาย",
                lastName: "รักงาน",
                nickname: "ชาย",
                positionApplied: "Fullstack Developer",
                status: "pending",
                createdAt: new Date().toISOString(),
                email: "somchai.r@example.com",
                phone: "081-222-3333",
                photoPath: null
            },
            {
                id: "mock-2",
                firstName: "สมศรี",
                lastName: "ดีใจ",
                nickname: "ศรี",
                positionApplied: "UI/UX Designer",
                status: "reviewed",
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                email: "somsri.d@example.com",
                phone: "089-999-8888",
                photoPath: null
            },
            {
                id: "mock-3",
                firstName: "วิชัย",
                lastName: "กล้าหาญ",
                nickname: "ชัย",
                positionApplied: "Project Manager",
                status: "pending",
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                email: "wichai.g@example.com",
                phone: "085-555-4444",
                photoPath: null
            },
            ...applicantsRaw.map((a: any) => ({
                ...a,
                createdAt: a.createdAt?.toISOString() || new Date().toISOString()
            }))
        ]

        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-white dark:text-foreground flex items-center gap-2 uppercase tracking-[0.1em]">
                        <UserCircle className="h-7 w-7 text-white" />
                        Recruitment
                    </h1>
                    <p className="text-white/70 dark:text-muted-foreground text-sm font-medium">
                        จัดการผู้สมัครงานและติดตามสถานะใบสมัครที่ส่งเข้ามา
                    </p>
                </div>
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
