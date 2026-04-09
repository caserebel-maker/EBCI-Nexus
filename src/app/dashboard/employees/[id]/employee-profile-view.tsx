'use client'

import { ArrowLeft, User, Phone, Mail, MapPin, Building, Briefcase, Calendar, Clock, Shield, Bell, FileText, ChevronRight, MessageSquare } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/contexts/language-context"

const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
}
const silverCard: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(200,200,220,0.04) 50%, rgba(255,255,255,0.07) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
}

interface Props {
    employee: any
    photoUrl: string | null
    displayName: string
    stats: {
        attendance: string
        leave: { annual: number; sick: number }
        supervisor: string
        emergencyContact: string
        lastLogin: string
        notes: string
    }
    id: string
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
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

export function EmployeeProfileView({ employee, photoUrl, displayName, stats, id }: Props) {
    const { t } = useTranslation()

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Breadcrumbs & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-white/90 dark:text-muted-foreground">
                    <Link href="/dashboard/employees" className="hover:text-white dark:hover:text-primary transition-colors">
                        {t('dashboard.employees')}
                    </Link>
                    <ChevronRight size={14} />
                    <span className="text-white dark:text-foreground font-medium">{t('employees.profile.title')}</span>
                </div>
                <Link
                    href="/dashboard/employees"
                    className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-white dark:text-muted-foreground dark:hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={16} /> {t('employees.profile.backToList')}
                </Link>
            </div>

            {/* Header / Identity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div style={silverCard} className="lg:col-span-2 flex flex-col md:flex-row gap-6 p-6 shadow-xl">
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
                                employee.status === "active"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                    : "bg-white/5 text-white/40 border-white/10"
                            )}>
                                <span className="h-2 w-2 rounded-full bg-current" />
                                {employee.status === "active" ? t('employees.profile.active') : employee.status.toUpperCase()}
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
                <div style={glassCard} className="p-6 space-y-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                        <Clock size={120} />
                    </div>
                    <h3 className="text-sm font-black text-primary-light uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock size={16} /> {t('employees.profile.quickStats')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t('employees.profile.attendance')}</p>
                            <p className="text-2xl font-black text-white">{stats.attendance}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t('employees.profile.annualLeave')}</p>
                            <p className="text-2xl font-black text-white">{stats.leave.annual}d</p>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/10 relative z-10">
                        <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-2">{t('employees.profile.lastActivity')}</p>
                        <p className="text-xs text-white font-bold flex items-center gap-2">
                            <Shield size={12} className="text-emerald-500" />
                            {t('employees.profile.recently')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Employment & Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div style={silverCard} className="p-6 shadow-xl space-y-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText size={20} className="text-primary-light" /> {t('employees.profile.employmentInfo')}
                    </h2>
                    <div className="space-y-4">
                        <InfoRow
                            label={t('employees.profile.joinDate')}
                            value={new Date(employee.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                            icon={Calendar}
                        />
                        <InfoRow
                            label={t('employees.profile.type')}
                            value={employee.employment_type?.toUpperCase() || t('employees.profile.permanent').toUpperCase()}
                            icon={User}
                        />
                        <InfoRow label={t('employees.profile.supervisor')} value={stats.supervisor} icon={Shield} />
                        <InfoRow
                            label={t('employees.profile.linkedAccount')}
                            value={employee.User?.username || t('employees.profile.notLinked')}
                            icon={Briefcase}
                        />
                    </div>
                </div>

                <div style={silverCard} className="p-6 shadow-xl space-y-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Bell size={20} className="text-primary-light" /> {t('employees.profile.contactInfo')}
                    </h2>
                    <div className="space-y-4">
                        <InfoRow label={t('employees.profile.officialEmail')} value={employee.email} icon={Mail} />
                        <InfoRow
                            label={t('employees.profile.emergencyContact')}
                            value={stats.emergencyContact === 'N/A' ? t('employees.profile.na') : stats.emergencyContact}
                            icon={Phone}
                        />
                        <div className="pt-4 mt-4 border-t border-white/10">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">
                                {t('employees.profile.addressOverview')}
                            </p>
                            <p className="text-sm text-white/70 leading-relaxed italic">
                                {employee.applicants?.current_address || t('employees.profile.na')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* HR Internal Notes */}
            <div style={glassCard} className="p-6 shadow-xl">
                <h2 className="text-lg font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-primary-light" /> {t('employees.profile.hrLog')}
                </h2>
                <div className="bg-white/5 border border-dashed border-white/10 p-5 rounded-xl text-sm text-white/40 italic">
                    {stats.notes}
                </div>
                <p className="mt-4 text-[10px] text-white/20 uppercase tracking-[0.2em]">
                    * System generated log based on conversion from Applicant ID: {id}
                </p>
            </div>
        </div>
    )
}
