import { ArrowLeft, User, Phone, Mail, MapPin, Building, Briefcase, Calendar, Clock, Shield, Bell, FileText, ChevronRight, MessageSquare } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: PageProps) {
    const { id } = await params

    // 1. Fetch Employee from Supabase Cloud
    // Include the applicant relation to get recruitment origin data
    const { data: employee, error } = await supabase
        .from('employees')
        .select(`
            *,
            applicants (
                photo_path,
                nickname,
                phone,
                email,
                current_address,
                applicant_educations (*),
                applicant_experiences (*)
            ),
            User:user_id (
                username,
                role
            )
        `)
        .eq('id', id)
        .single()

    if (error || !employee) {
        if (error) console.error("Supabase Error:", error)
        notFound()
    }

    const displayName = `${employee.first_name_th} ${employee.last_name_th}`

    // Resolve Photo URL
    let photoUrl = null
    const photoPath = employee.photo_path || employee.applicants?.photo_path
    if (photoPath) {
        const { data } = await supabase.storage
            .from(employee.photo_path ? 'employee-assets' : 'applicant-assets')
            .createSignedUrl(photoPath, 3600)
        photoUrl = data?.signedUrl
    }

    const stats = {
        attendance: "100%", // Logic for attendance will be in Phase 4
        leave: { annual: 6, sick: 30 },
        supervisor: "HR Admin",
        emergencyContact: employee.applicants?.phone || "N/A",
        lastLogin: "Recently",
        notes: `Onboarded from Applicant System on ${new Date(employee.created_at).toLocaleDateString()}.`
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Breadcrumbs & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-white/90 dark:text-muted-foreground">
                    <Link href="/dashboard/employees" className="hover:text-white dark:hover:text-primary transition-colors">Employees</Link>
                    <ChevronRight size={14} />
                    <span className="text-white dark:text-foreground font-medium">Employee Profile (Cloud)</span>
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
                <div className="lg:col-span-2 flex flex-col md:flex-row gap-6 glass p-6 rounded-2xl border border-white/10 shadow-xl">
                    <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl bg-brand-gradient flex items-center justify-center text-white font-bold text-4xl border-2 border-white/20 shrink-0 overflow-hidden shadow-inner">
                        {photoUrl ? (
                            <img src={photoUrl} className="h-full w-full object-cover" alt={displayName} />
                        ) : (
                            displayName.charAt(0)
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tight">{displayName}</h1>
                                <p className="text-white/60 flex items-center gap-2 mt-1 text-sm font-medium">
                                    <span className="px-2 py-0.5 rounded bg-white/5 text-xs font-mono border border-white/10 text-white/40">
                                        {employee.employee_code}
                                    </span>
                                    <span>•</span>
                                    <span className="font-bold text-primary-light uppercase tracking-wider text-xs">{employee.position}</span>
                                </p>
                            </div>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5",
                                employee.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/40 border-white/10"
                            )}>
                                <span className="h-2 w-2 rounded-full bg-current" />
                                {employee.status.toUpperCase()}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-light border border-white/5">
                                    <Mail size={16} />
                                </div>
                                {employee.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-light border border-white/5">
                                    <Phone size={16} />
                                </div>
                                {employee.phone || "-"}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-light border border-white/5">
                                    <Building size={16} />
                                </div>
                                {employee.department}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-light border border-white/5">
                                    <MapPin size={16} />
                                </div>
                                Head Office (Nexus)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Card */}
                <div className="bg-brand-gradient/10 rounded-2xl border border-white/10 p-6 space-y-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                        <Clock size={120} />
                    </div>
                    <h3 className="text-sm font-black text-primary-light uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock size={16} /> Quick Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Attendance</p>
                            <p className="text-2xl font-black text-white">{stats.attendance}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Annual Leave</p>
                            <p className="text-2xl font-black text-white">{stats.leave.annual}d</p>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/10 relative z-10">
                        <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-2">Last Activity</p>
                        <p className="text-xs text-white font-bold flex items-center gap-2">
                            <Shield size={12} className="text-emerald-500" />
                            {stats.lastLogin}
                        </p>
                    </div>
                </div>
            </div>

            {/* Employment & Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6 border border-white/10 shadow-xl space-y-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText size={20} className="text-primary-light" /> Employment Info
                    </h2>
                    <div className="space-y-4">
                        <InfoRow label="Join Date" value={new Date(employee.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} icon={Calendar} />
                        <InfoRow label="Type" value={employee.employment_type?.toUpperCase() || "FULL-TIME"} icon={User} />
                        <InfoRow label="Supervisor" value={stats.supervisor} icon={Shield} />
                        <InfoRow label="Linked Account" value={employee.User?.username || "Not Linked"} icon={Briefcase} />
                    </div>
                </div>

                <div className="glass rounded-2xl p-6 border border-white/10 shadow-xl space-y-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Bell size={20} className="text-primary-light" /> Contact Info
                    </h2>
                    <div className="space-y-4">
                        <InfoRow label="Official Email" value={employee.email} icon={Mail} />
                        <InfoRow label="Emergency Contact" value={stats.emergencyContact} icon={Phone} />
                        <div className="pt-4 mt-4 border-t border-white/10">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Address Overview</p>
                            <p className="text-sm text-white/70 leading-relaxed italic">{employee.applicants?.current_address || "No address data from recruitment."}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* HR Internal Notes */}
            <div className="glass rounded-2xl p-6 border border-white/10 shadow-xl">
                <h2 className="text-lg font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-primary-light" /> HR Log
                </h2>
                <div className="bg-white/5 border border-dashed border-white/10 p-5 rounded-xl text-sm text-white/40 italic">
                    {stats.notes}
                </div>
                <p className="mt-4 text-[10px] text-white/20 uppercase tracking-[0.2em]">* System generated log based on conversion from Applicant ID: {id}</p>
            </div>
        </div>
    )
}

function InfoRow({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-lg transition-colors">
            <div className="flex items-center gap-3 text-white/40">
                <Icon size={16} className="text-primary-light" />
                <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-sm font-bold text-white">{value}</span>
        </div>
    )
}
