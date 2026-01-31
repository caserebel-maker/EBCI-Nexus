"use client"

import { useState } from "react"
import { Search, Filter, MoreHorizontal, User, Briefcase, Calendar, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export type Applicant = {
    id: string
    firstName: string
    lastName: string
    nickname?: string | null
    positionApplied: string
    status: string
    createdAt: string
    email: string
    phone: string
    photoPath?: string | null
}

interface ApplicantTableProps {
    initialData: Applicant[]
}

export function ApplicantTable({ initialData }: ApplicantTableProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [positionFilter, setPositionFilter] = useState<string>("all")

    // Filtering Logic
    const filteredData = initialData.filter((applicant) => {
        const fullName = `${applicant.firstName} ${applicant.lastName}`.toLowerCase()
        const nickName = (applicant.nickname || "").toLowerCase()
        const matchesSearch =
            fullName.includes(searchTerm.toLowerCase()) ||
            nickName.includes(searchTerm.toLowerCase()) ||
            applicant.positionApplied.toLowerCase().includes(searchTerm.toLowerCase()) ||
            applicant.email.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || applicant.status === statusFilter
        const matchesPosition = positionFilter === "all" || applicant.positionApplied === positionFilter

        return matchesSearch && matchesStatus && matchesPosition
    })

    // Sort by New (pending) first, then by date
    const sortedData = [...filteredData].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Group unique positions for filter
    const positions = Array.from(new Set(initialData.map(a => a.positionApplied)))

    return (
        <div className="space-y-6">
            {/* Toolbar - Glass Style */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/10 dark:bg-card backdrop-blur-md p-4 rounded-xl border border-white/20 dark:border-border shadow-lg">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 dark:text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search applicants by name, nickname, position..."
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-white/10 dark:border-input bg-black/30 dark:bg-muted/50 text-white dark:text-foreground placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-sans text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        className="h-10 px-3 rounded-lg border border-white/10 dark:border-input bg-black/30 dark:bg-card text-white dark:text-foreground text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-white/40"
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                    >
                        <option value="all">All Positions</option>
                        {positions.map(pos => <option key={pos} value={pos} className="text-black">{pos}</option>)}
                    </select>

                    <select
                        className="h-10 px-3 rounded-lg border border-white/10 dark:border-input bg-black/30 dark:bg-card text-white dark:text-foreground text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-white/40"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="pending" className="text-black">New</option>
                        <option value="reviewed" className="text-black">Interview</option>
                        <option value="hired" className="text-black">Hired</option>
                        <option value="rejected" className="text-black">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                {sortedData.length > 0 ? (
                    sortedData.map((applicant) => (
                        <div
                            key={applicant.id}
                            onClick={() => router.push(`/dashboard/recruitment/${applicant.id}`)}
                            className="group relative flex flex-col bg-white/10 dark:bg-card backdrop-blur-xl rounded-2xl border border-white/20 dark:border-border overflow-hidden hover:scale-[1.02] hover:border-white/40 transition-all duration-300 cursor-pointer shadow-xl"
                        >
                            {/* Photo / Placeholder */}
                            <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
                                {applicant.photoPath ? (
                                    <img
                                        src={applicant.photoPath}
                                        alt={applicant.firstName}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-brand-gradient/20">
                                        <User className="h-16 w-16 text-white/20" />
                                    </div>
                                )}
                                {/* Floating Badge */}
                                <div className="absolute top-3 right-3">
                                    <StatusBadge status={applicant.status} compact />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 flex flex-col flex-1">
                                <div className="mb-2">
                                    <h3 className="text-lg font-normal text-white dark:text-foreground leading-tight line-clamp-1">
                                        {applicant.firstName} {applicant.lastName}
                                    </h3>
                                    {applicant.nickname && (
                                        <span className="text-sm font-bold uppercase tracking-wider text-primary-foreground/60 dark:text-primary/80 block mt-0.5">
                                            ({applicant.nickname})
                                        </span>
                                    )}
                                </div>

                                <div className="mt-auto space-y-3">
                                    <div className="flex items-center gap-2 text-white/90 dark:text-foreground/90 text-base font-bold">
                                        <Briefcase size={16} className="shrink-0 text-white/60" />
                                        <span className="line-clamp-1">{applicant.positionApplied}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm uppercase font-bold tracking-wider text-white/50">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            {new Date(applicant.createdAt).toLocaleDateString('en-GB')}
                                        </div>
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>

                            {/* Glass Glow effect */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))
                ) : (
                    <div className="col-span-full h-96 flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-white/40">
                        <User className="h-16 w-16 mb-4 opacity-10" />
                        <p className="text-xl font-black uppercase tracking-widest">No matching applicants</p>
                        <p className="text-xs font-medium opacity-60">ไม่พบผู้สมัครที่ตรงกับเงื่อนไขการค้นหา</p>
                    </div>
                )}
            </div>

            {/* Footer Summary */}
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 dark:text-muted-foreground text-center pt-8 italic">
                Showing {filteredData.length} of {initialData.length} recruitment cards
            </div>
        </div>
    )
}

function StatusBadge({ status, compact }: { status: string; compact?: boolean }) {
    const styles: Record<string, string> = {
        "pending": "bg-blue-500/20 text-blue-400 dark:text-blue-400 border-blue-500/30",
        "reviewed": "bg-amber-500/20 text-amber-400 dark:text-amber-400 border-amber-500/30",
        "hired": "bg-emerald-500/20 text-emerald-400 dark:text-emerald-400 border-emerald-500/30",
        "rejected": "bg-rose-500/20 text-rose-400 dark:text-rose-400 border-rose-500/30",
    }

    const labels: Record<string, string> = {
        "pending": "New",
        "reviewed": "Interview",
        "hired": "Hired",
        "rejected": "Rejected",
    }

    const defaultStyle = "bg-white/10 text-white border-white/20"

    return (
        <span className={cn(
            "rounded-full font-black uppercase tracking-widest border inline-flex items-center gap-1.5",
            compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
            styles[status] || defaultStyle
        )}>
            {!compact && (
                <span className={cn("h-1.5 w-1.5 rounded-full",
                    status === 'pending' ? 'bg-current animate-pulse' : 'bg-current'
                )} />
            )}
            {labels[status] || status}
        </span>
    )
}
