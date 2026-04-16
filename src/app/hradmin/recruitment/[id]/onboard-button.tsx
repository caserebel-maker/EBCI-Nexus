'use client'

import { useState, useTransition } from "react"
import { onboardCandidate } from "../actions" // assuming actions is in parent directory
import { UserPlus, Loader2, CheckCircle, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface OnboardButtonProps {
    applicantId: string
    status: string
    existingEmployeeId?: string | null
    existingEmployeeCode?: string | null
}

export function OnboardButton({ applicantId, status, existingEmployeeId, existingEmployeeCode }: OnboardButtonProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    if (existingEmployeeId) {
        return (
            <Link
                href={`/dashboard/employees/${existingEmployeeId}`}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all font-bold uppercase tracking-wider text-xs"
            >
                <CheckCircle size={16} />
                <span>Onboarded ({existingEmployeeCode})</span>
                <ExternalLink size={14} />
            </Link>
        )
    }

    if (status !== 'hired') {
        return null
    }

    const handleOnboard = () => {
        if (!confirm("Are you sure you want to onboard this candidate?\n\nThis will create a new Employee record and generate an Employee ID.")) {
            return
        }

        setError(null)
        startTransition(async () => {
            const result = await onboardCandidate(applicantId, null) // prevState is null
            if (result.error) {
                setError(result.error)
                alert(result.error)
            } else if (result.success) {
                alert("Candidate successfully onboarded!")
                router.refresh()
            }
        })
    }

    return (
        <button
            onClick={handleOnboard}
            disabled={isPending}
            className={cn(
                "flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl shadow-lg shadow-emerald-500/20 font-bold uppercase tracking-wider text-xs transition-all transform active:scale-95",
                isPending && "opacity-70 cursor-not-allowed"
            )}
        >
            {isPending ? (
                <Loader2 size={16} className="animate-spin" />
            ) : (
                <UserPlus size={16} />
            )}
            <span>{isPending ? "Onboarding..." : "Onboard Candidate"}</span>
        </button>
    )
}
