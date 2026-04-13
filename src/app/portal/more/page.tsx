'use client'

import Link from 'next/link'
import { CalendarDays, UserCircle, LogOut, ChevronRight } from 'lucide-react'

const MENU_ITEMS = [
    {
        label: 'ใบลา',
        desc: 'ดูและยื่นคำขอลา',
        href: '/portal/leave',
        icon: CalendarDays,
    },
    {
        label: 'โปรไฟล์',
        desc: 'ข้อมูลส่วนตัว',
        href: '/portal/profile',
        icon: UserCircle,
    },
]

export default function MorePage() {
    return (
        <div className="max-w-md mx-auto flex flex-col gap-3 pt-2">
            <h1 className="text-lg font-bold text-white/90 px-1 mb-1">เพิ่มเติม</h1>

            {MENU_ITEMS.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors"
                >
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
                        <item.icon size={20} className="text-white" />
                    </span>
                    <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{item.label}</p>
                        <p className="text-white/50 text-xs">{item.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-white/40" />
                </Link>
            ))}

            <div className="mt-4 border-t border-white/10 pt-4">
                <button
                    onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' })
                        window.location.href = '/login'
                    }}
                    className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-white/5 hover:bg-red-500/20 active:bg-red-500/30 transition-colors text-left"
                >
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20">
                        <LogOut size={20} className="text-red-300" />
                    </span>
                    <div className="flex-1">
                        <p className="text-red-300 font-semibold text-sm">ออกจากระบบ</p>
                        <p className="text-white/40 text-xs">Sign out</p>
                    </div>
                </button>
            </div>
        </div>
    )
}
