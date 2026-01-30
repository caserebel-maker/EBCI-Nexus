"use client"

import { Printer } from "lucide-react"
import { cn } from "@/lib/utils"

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white/90 transition-all shadow-xl active:scale-95"
        >
            <Printer size={16} />
            Print to A4
        </button>
    )
}
