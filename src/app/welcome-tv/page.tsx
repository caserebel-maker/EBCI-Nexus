import { Suspense } from 'react'
import WelcomeTvDashboard from './welcome-tv-dashboard'

export const metadata = {
    title: 'Welcome TV - EBCI Nexus',
    description: 'หน้าจอแสดงผลต้อนรับพนักงานแบบเรียลไทม์เมื่อแตะบัตรเข้างาน',
}

export default function WelcomeTvPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen bg-[#070709] flex flex-col items-center justify-center text-white px-4">
                <div className="text-xl font-medium text-neutral-400 animate-pulse">
                    กำลังเริ่มระบบหน้าจอต้อนรับ...
                </div>
            </div>
        }>
            <WelcomeTvDashboard />
        </Suspense>
    )
}
