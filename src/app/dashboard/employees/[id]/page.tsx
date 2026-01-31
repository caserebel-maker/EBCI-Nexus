import { ArrowLeft, User, Phone, Mail, MapPin, Building, Briefcase, Calendar, Clock, Shield, Bell, FileText, ChevronRight, MessageSquare } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Fetch from Real DB
    const data = await prisma.employee.findUnique({
        where: { id },
        include: {
            user: true, // Login Account
            applicant: true // Recruitment Origin
        }
    })

    if (!data) {
        notFound()
    }

    // Prepare Display Data (Map DB -> UI)
    // Handle Name: Prefer EN name if available for "international" look, or TH.
    // Prompt said "name_th" was important. Let's show TH name as primary or both.
    // UI existing design has one big name. Let's use TH Name as primary for Thai context.
    const displayName = `${data.firstNameTH} ${data.lastNameTH}`

    // Fallbacks for missing schema fields (Future Phases)
    const stats = {
        attendance: "100%", // Not tracked yet
        leave: { annual: 6, sick: 30 }, // Default policy
        supervisor: "HR Admin", // Not tracked yet
        emergencyContact: data.applicant?.phone || "N/A", // Use applicant phone as fallback? Or just N/A
        lastLogin: "Recently",
        notes: "Onboarded from Applicant System."
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Breadcrumbs & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-white/90 dark:text-muted-foreground">
                    <Link href="/dashboard/employees" className="hover:text-white dark:hover:text-primary transition-colors">Employees</Link>
                    <ChevronRight size={14} />
                    <span className="text-white dark:text-foreground font-medium">Employee Detail</span>
                </div>
                <Link
                    href="/dashboard/employees"
                    className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-white dark:text-muted-foreground dark:hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={16} /> Back to List
                </Link>
            </div>

            {/* Header / Identity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col md:flex-row gap-6 bg-card p-6 rounded-xl border border-white/20 dark:border-border shadow-sm">
                    <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl border-2 border-primary/20 shrink-0">
                        {displayName.charAt(0)}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground font-sans tracking-tight">{displayName}</h1>
                                <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm font-medium">
                                    <span className="px-2 py-0.5 rounded bg-muted text-xs font-mono border border-border">
                                        {data.employeeCode}
                                    </span>
                                    <span>•</span>
                                    <span className="font-bold text-primary dark:text-primary/80 uppercase tracking-wider text-xs">{data.position}</span>
                                </p>
                            </div>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5",
                                data.status === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-500 border-emerald-500/20" : "bg-slate-500/15 text-slate-700 border-slate-500/20"
                            )}>
                                <span className="h-2 w-2 rounded-full bg-current" />
                                {data.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center gap-3 text-sm text-foreground/80 dark:text-foreground/70">
                                <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center text-primary">
                                    <Mail size={16} />
                                </div>
                                {data.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-foreground/80 dark:text-foreground/70">
                                <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center text-primary">
                                    <Phone size={16} />
                                </div>
                                {data.phone || "-"}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-foreground/80 dark:text-foreground/70">
                                <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center text-primary">
                                    <Building size={16} />
                                </div>
                                {data.department}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-foreground/80 dark:text-foreground/70">
                                <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center text-primary">
                                    <MapPin size={16} />
                                </div>
                                Bangkok Office
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Summary Quick Cards */}
                <div className="bg-white/15 dark:bg-primary/10 rounded-xl border border-white/30 dark:border-primary/20 p-6 space-y-6">
                    <h3 className="text-sm font-bold text-white dark:text-primary uppercase tracking-widest flex items-center gap-2 underline underline-offset-4 decoration-white/30 dark:decoration-transparent">
                        <Clock size={16} /> Quick Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-white/90 dark:text-muted-foreground/70">Attendance</p>
                            <p className="text-2xl font-black text-white dark:text-foreground">{stats.attendance}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-white/90 dark:text-muted-foreground/70">Leave (Annual)</p>
                            <p className="text-2xl font-black text-white dark:text-foreground">{stats.leave.annual}d</p>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/20 dark:border-primary/10">
                        <p className="text-[10px] uppercase font-bold text-white/90 dark:text-muted-foreground/70 mb-2">Last System Activity</p>
                        <p className="text-xs text-white dark:text-foreground font-bold flex items-center gap-2">
                            <Shield size={12} className="text-white dark:text-emerald-500" />
                            {stats.lastLogin}
                        </p>
                    </div>
                </div>
            </div>

            {/* Employment & Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employment Info */}
                <div className="bg-card rounded-xl border border-white/10 dark:border-border p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2">
                        <FileText size={20} className="text-primary" /> Employment Details
                    </h2>
                    <div className="space-y-4">
                        <InfoRow label="Join Date" value={new Date(data.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} icon={Calendar} />
                        <InfoRow label="Employee Type" value={data.employmentType} icon={User} />
                        <InfoRow label="Direct Supervisor" value={stats.supervisor} icon={Shield} />
                        <InfoRow label="Reporting Line" value="Core Team" icon={Briefcase} />
                    </div>
                </div>

                {/* Contact & Emergency */}
                <div className="bg-card rounded-xl border border-white/10 dark:border-border p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2">
                        <Bell size={20} className="text-primary" /> Contact & Emergency
                    </h2>
                    <div className="space-y-4">
                        <InfoRow label="Work Email" value={data.email} icon={Mail} />
                        <InfoRow label="Mobile" value={data.phone || "-"} icon={Phone} />
                        <div className="pt-4 mt-4 border-t border-border">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Emergency Contact</p>
                            <p className="text-sm text-card-foreground font-medium">{stats.emergencyContact}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* HR Notes Placeholder */}
            <div className="bg-card rounded-xl border border-white/10 dark:border-border p-6 shadow-sm">
                <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-primary" /> HR Internal Notes
                </h2>
                <div className="bg-muted/30 border border-dashed border-border p-4 rounded-lg text-sm text-muted-foreground italic">
                    {stats.notes}
                </div>
                <p className="mt-4 text-[10px] text-muted-foreground italic uppercase tracking-wider">* Only HR Admins can view and edit these notes.</p>
            </div>
        </div>
    )
}

function InfoRow({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-3 text-muted-foreground">
                <Icon size={16} strokeWidth={2.5} />
                <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-sm font-semibold text-card-foreground">{value}</span>
        </div>
    )
}
