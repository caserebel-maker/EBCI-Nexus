import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileUp } from 'lucide-react'
import { CardImportView } from './import-view'

export const dynamic = 'force-dynamic'

export default async function CardImportPage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')

    try {
        const session = JSON.parse(sessionCookie.value)
        if (session.role !== 'hr_admin') redirect('/portal')
    } catch {
        redirect('/login')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <Link
                    href="/hradmin/attendance"
                    className="text-white/70 hover:text-white text-sm inline-flex items-center gap-1 w-fit"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    กลับหน้าการเข้างาน
                </Link>
                <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                    <FileUp className="h-6 w-6 text-white dark:text-primary" />
                    นำเข้าข้อมูลจากเครื่องอ่านบัตร
                    <span className="ml-2 px-2 py-0.5 bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-md border border-white/10 text-white/40">
                        CSV
                    </span>
                </h1>
                <p className="text-white/80 dark:text-muted-foreground text-sm">
                    อัปโหลดไฟล์ CSV จาก HIP Ci100S เพื่อเพิ่มรายการเข้างานเข้าสู่ระบบ
                </p>
            </div>

            <CardImportView />
        </div>
    )
}
