"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface StatusSelectorProps {
    applicantId: string
    initialStatus: string
}

export function StatusSelector({ applicantId, initialStatus }: StatusSelectorProps) {
    const [status, setStatus] = useState(initialStatus)
    const [loading, setLoading] = useState(false)

    const updateStatus = async (newStatus: string) => {
        if (newStatus === status) return
        setLoading(true)
        try {
            const res = await fetch(`/api/applicants/${applicantId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus }),
                headers: { "Content-Type": "application/json" }
            })
            if (res.ok) setStatus(newStatus)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const statuses = [
        { id: "pending", label: "New", color: "bg-blue-500" },
        { id: "reviewed", label: "Interview", color: "bg-amber-500" },
        { id: "hired", label: "Hired", color: "bg-emerald-500" },
        { id: "rejected", label: "Rejected", color: "bg-rose-500" },
    ]

    return (
        <div className="flex gap-1">
            {statuses.map((s) => (
                <button
                    key={s.id}
                    disabled={loading}
                    onClick={() => updateStatus(s.id)}
                    className={cn(
                        "px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all",
                        status === s.id
                            ? `${s.color} text-white shadow-lg scale-105`
                            : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                >
                    {s.label}
                </button>
            ))}
        </div>
    )
}
