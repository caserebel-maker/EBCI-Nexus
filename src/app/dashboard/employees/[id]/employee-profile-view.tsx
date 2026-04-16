'use client'

import { useState, useTransition, useRef } from "react"
import {
    ArrowLeft, User, Phone, Mail, MapPin, Building, Briefcase,
    Calendar, Clock, Shield, Bell, FileText, ChevronRight,
    MessageSquare, Pencil, X, Check, AlertCircle, CheckCircle2, Camera
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/contexts/language-context"
import { updateEmployee, uploadEmployeePhoto } from "./actions"
import { EMPLOYEE_LEVELS, LEVEL_BADGE_COLORS } from "@/config/employee-levels"
import { DEPARTMENTS } from "@/config/departments"

// ─── Styles ──────────────────────────────────────────────────────────────────
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
const editInputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors"
const editSelectClass = "w-full bg-[#1a0608] border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors appearance-none"

// ─── Types ───────────────────────────────────────────────────────────────────
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
    isHrAdmin: boolean
}

interface FormState {
    first_name_th: string
    last_name_th: string
    nickname: string
    position: string
    department: string
    phone: string
    email: string
    employment_type: string
    status: string
    start_date: string
    quit_date: string
    quit_reason: string
    address: string
    emergency_contact: string
    approval_level: number
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoRow({
    label, value, icon: Icon, editing, editNode
}: {
    label: string; value: string; icon: any; editing?: boolean; editNode?: React.ReactNode
}) {
    return (
        <div className="flex items-start justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-lg transition-colors gap-3">
            <div className="flex items-center gap-3 text-white/40 shrink-0 pt-1">
                <Icon size={16} className="text-primary-light" />
                <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
            </div>
            {editing && editNode
                ? <div className="flex-1 min-w-0">{editNode}</div>
                : <span className="text-sm font-bold text-white text-right">{value}</span>
            }
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function EmployeeProfileView({ employee, photoUrl, displayName, stats, id, isHrAdmin }: Props) {
    const { t } = useTranslation()

    const initForm = (): FormState => ({
        first_name_th: employee.first_name_th ?? '',
        last_name_th: employee.last_name_th ?? '',
        nickname: employee.nickname ?? '',
        position: employee.position ?? '',
        department: employee.department ?? '',
        phone: employee.phone ?? '',
        email: employee.email ?? '',
        employment_type: employee.employment_type ?? 'full-time',
        status: employee.status ?? 'active',
        start_date: employee.start_date ? employee.start_date.slice(0, 10) : '',
        quit_date: employee.quit_date ? employee.quit_date.slice(0, 10) : '',
        quit_reason: employee.quit_reason ?? '',
        address: employee.applicants?.current_address ?? '',
        emergency_contact: employee.applicants?.phone ?? '',
        approval_level: employee.approval_level ?? 1,
    })

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<FormState>(initForm)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [isPending, startTransition] = useTransition()
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const photoInputRef = useRef<HTMLInputElement>(null)

    const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }))

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
    }

    const handleEdit = () => { setForm(initForm()); setPhotoPreview(null); setPhotoFile(null); setIsEditing(true) }
    const handleCancel = () => { setForm(initForm()); setPhotoPreview(null); setPhotoFile(null); setIsEditing(false) }

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 3500)
    }

    const handleSave = () => {
        startTransition(async () => {
            // Upload photo first if a new file was selected
            if (photoFile) {
                const fd = new FormData()
                fd.append('photo', photoFile)
                const photoResult = await uploadEmployeePhoto(id, fd)
                if (photoResult.error) {
                    showToast('error', `อัปโหลดรูปไม่สำเร็จ: ${photoResult.error}`)
                    return
                }
            }

            const result = await updateEmployee(id, {
                first_name_th: form.first_name_th,
                last_name_th: form.last_name_th,
                nickname: form.nickname,
                position: form.position,
                department: form.department,
                phone: form.phone,
                email: form.email,
                employment_type: form.employment_type,
                status: form.status,
                start_date: form.start_date,
                quit_date: form.quit_date || undefined,
                quit_reason: form.quit_reason || undefined,
                approval_level: form.approval_level,
                applicant_current_address: form.address,
                applicant_phone: form.emergency_contact,
            })
            if (result.error) {
                showToast('error', `เกิดข้อผิดพลาด: ${result.error}`)
            } else {
                showToast('success', 'บันทึกข้อมูลสำเร็จ')
                setPhotoFile(null)
                setIsEditing(false)
            }
        })
    }

    const currentDisplayName = isEditing ? `${form.first_name_th} ${form.last_name_th}` : displayName

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Toast */}
            {toast && (
                <div className={cn(
                    'fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all',
                    toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                )}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Breadcrumbs & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-white/90">
                    <Link href="/dashboard/employees" className="hover:text-white transition-colors">
                        {t('dashboard.employees')}
                    </Link>
                    <ChevronRight size={14} />
                    <span className="text-white font-medium">{t('employees.profile.title')}</span>
                </div>
                <div className="flex items-center gap-3">
                    {isHrAdmin && !isEditing && (
                        <button
                            onClick={handleEdit}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#882136]/60 hover:bg-[#882136]/80 text-white border border-[#ad5f6c]/30 hover:border-[#ad5f6c]/60 transition-all"
                        >
                            <Pencil size={14} /> แก้ไขข้อมูล
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button
                                onClick={handleCancel}
                                disabled={isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 text-white/70 hover:text-white border border-white/15 transition-all disabled:opacity-50"
                            >
                                <X size={14} /> ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-500/40 transition-all disabled:opacity-60"
                            >
                                <Check size={14} /> {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </>
                    )}
                    {!isEditing && (
                        <Link
                            href="/dashboard/employees"
                            className="inline-flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={16} /> {t('employees.profile.backToList')}
                        </Link>
                    )}
                </div>
            </div>

            {/* Header / Identity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div style={silverCard} className="lg:col-span-2 flex flex-col md:flex-row gap-6 p-6 shadow-xl">
                    <div className="relative shrink-0">
                        <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl bg-brand-gradient flex items-center justify-center text-white font-bold text-4xl border-2 border-white/20 overflow-hidden shadow-inner">
                            {(photoPreview || photoUrl)
                                ? <img src={photoPreview ?? photoUrl!} className="h-full w-full object-cover" alt={currentDisplayName} />
                                : currentDisplayName.charAt(0)
                            }
                        </div>
                        {isEditing && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="absolute inset-0 rounded-2xl flex items-end justify-center pb-3 bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5 bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                                        <Camera size={13} /> เปลี่ยนรูป
                                    </span>
                                </button>
                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </>
                        )}
                        {photoPreview && isEditing && (
                            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">ใหม่</span>
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <div className="space-y-2 mb-2">
                                        <div className="flex gap-2">
                                            <input className={editInputClass} value={form.first_name_th} onChange={set('first_name_th')} placeholder="ชื่อ" />
                                            <input className={editInputClass} value={form.last_name_th} onChange={set('last_name_th')} placeholder="นามสกุล" />
                                        </div>
                                        <input className={editInputClass} value={form.nickname} onChange={set('nickname')} placeholder="ชื่อเล่น (ถ้ามี)" />
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h1 className="text-3xl font-black text-white uppercase tracking-tight">{displayName}</h1>
                                            {(() => {
                                                const lvl = employee.approval_level ?? 1
                                                const color = LEVEL_BADGE_COLORS[lvl] ?? LEVEL_BADGE_COLORS[1]
                                                const label = EMPLOYEE_LEVELS[lvl]?.label.split('—')[0].trim() ?? `Level ${lvl}`
                                                return (
                                                    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", color)}>
                                                        {label}
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                        {employee.nickname && (
                                            <p className="text-white/50 text-sm mt-0.5">ชื่อเล่น: <span className="text-white/80 font-semibold">{employee.nickname}</span></p>
                                        )}
                                    </div>
                                )}
                                <p className="text-white/60 flex items-center gap-2 mt-1 text-sm font-medium flex-wrap">
                                    <span className="px-2 py-0.5 rounded bg-white/5 text-xs font-mono border border-white/10 text-white/40">
                                        {employee.employee_code}
                                    </span>
                                    <span>•</span>
                                    {isEditing
                                        ? <input className={cn(editInputClass, 'max-w-[180px] text-xs')} value={form.position} onChange={set('position')} placeholder="ตำแหน่ง" />
                                        : <span className="font-bold text-primary-light uppercase tracking-wider text-xs">{employee.position}</span>
                                    }
                                </p>
                            </div>
                            {isEditing ? (
                                <div className="flex flex-col gap-2 items-end">
                                    <select className={cn(editSelectClass, 'max-w-[160px]')} value={form.status} onChange={set('status')}>
                                        <option value="active">ปฏิบัติงาน</option>
                                        <option value="on_leave">ลา</option>
                                        <option value="inactive">พ้นสภาพ</option>
                                    </select>
                                    {form.status === 'inactive' && (
                                        <>
                                            <input
                                                type="date"
                                                className={cn(editInputClass, 'max-w-[160px] text-xs')}
                                                value={form.quit_date}
                                                onChange={set('quit_date')}
                                                placeholder="วันที่พ้นสภาพ"
                                            />
                                            <select className={cn(editSelectClass, 'max-w-[160px] text-xs')} value={form.quit_reason} onChange={set('quit_reason')}>
                                                <option value="">— สาเหตุ —</option>
                                                <option value="resigned">ลาออกเอง</option>
                                                <option value="retired">เกษียณอายุ</option>
                                                <option value="contract_ended">สัญญาหมด</option>
                                                <option value="other">อื่นๆ</option>
                                            </select>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5",
                                    employee.status === "active"
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                        : employee.status === "on_leave"
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/20"
                                        : "bg-slate-500/15 text-slate-400 border-slate-500/20"
                                )}>
                                    <span className="h-2 w-2 rounded-full bg-current" />
                                    {employee.status === "active" ? t('employees.profile.active') : employee.status === "on_leave" ? "ลา" : "พ้นสภาพ"}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-light border border-white/5 shrink-0">
                                    <Mail size={16} />
                                </div>
                                {isEditing
                                    ? <input className={editInputClass} value={form.email} onChange={set('email')} placeholder="อีเมล" type="email" />
                                    : employee.email
                                }
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-light border border-white/5 shrink-0">
                                    <Phone size={16} />
                                </div>
                                {isEditing
                                    ? <input className={editInputClass} value={form.phone} onChange={set('phone')} placeholder="เบอร์โทร" />
                                    : (employee.phone || "-")
                                }
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-light border border-white/5 shrink-0">
                                    <Building size={16} />
                                </div>
                                {isEditing
                                    ? (
                                        <select
                                            className={editSelectClass}
                                            value={form.department}
                                            onChange={set('department')}
                                        >
                                            {/* Show current value if not in canonical list (legacy data) */}
                                            {form.department && !(DEPARTMENTS as readonly string[]).includes(form.department) && (
                                                <option value={form.department}>{form.department}</option>
                                            )}
                                            {DEPARTMENTS.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    )
                                    : employee.department
                                }
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-light border border-white/5 shrink-0">
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
                    <div className="space-y-1">
                        <InfoRow
                            label={t('employees.profile.joinDate')}
                            value={new Date(employee.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                            icon={Calendar}
                            editing={isEditing}
                            editNode={<input type="date" className={editInputClass} value={form.start_date} onChange={set('start_date')} />}
                        />
                        <InfoRow
                            label={t('employees.profile.type')}
                            value={employee.employment_type?.toUpperCase() || t('employees.profile.permanent').toUpperCase()}
                            icon={User}
                            editing={isEditing}
                            editNode={
                                <select className={editSelectClass} value={form.employment_type} onChange={set('employment_type')}>
                                    <option value="full-time">Full-time (ประจำ)</option>
                                    <option value="part-time">Part-time (ชั่วคราว)</option>
                                    <option value="contract">Contract (สัญญาจ้าง)</option>
                                </select>
                            }
                        />
                        <InfoRow
                            label="ระดับพนักงาน"
                            value={EMPLOYEE_LEVELS[employee.approval_level ?? 1]?.label ?? `Level ${employee.approval_level ?? 1}`}
                            icon={Shield}
                            editing={isEditing && isHrAdmin}
                            editNode={
                                <select
                                    className={editSelectClass}
                                    value={form.approval_level}
                                    onChange={(e) => setForm(prev => ({ ...prev, approval_level: Number(e.target.value) }))}
                                >
                                    {Object.entries(EMPLOYEE_LEVELS).map(([lvl, { label }]) => (
                                        <option key={lvl} value={lvl}>{label}</option>
                                    ))}
                                </select>
                            }
                        />
                        <InfoRow
                            label={t('employees.profile.supervisor')}
                            value={stats.supervisor}
                            icon={Shield}
                        />
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
                    <div className="space-y-1">
                        <InfoRow
                            label={t('employees.profile.officialEmail')}
                            value={employee.email}
                            icon={Mail}
                            editing={isEditing}
                            editNode={<input type="email" className={editInputClass} value={form.email} onChange={set('email')} />}
                        />
                        <InfoRow
                            label={t('employees.profile.emergencyContact')}
                            value={stats.emergencyContact === 'N/A' ? t('employees.profile.na') : stats.emergencyContact}
                            icon={Phone}
                            editing={isEditing}
                            editNode={<input className={editInputClass} value={form.emergency_contact} onChange={set('emergency_contact')} placeholder="ผู้ติดต่อฉุกเฉิน" />}
                        />
                        <div className="pt-4 mt-2 border-t border-white/10">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">
                                {t('employees.profile.addressOverview')}
                            </p>
                            {isEditing ? (
                                <textarea
                                    className={cn(editInputClass, 'min-h-[72px] resize-none')}
                                    value={form.address}
                                    onChange={set('address')}
                                    placeholder="ที่อยู่"
                                />
                            ) : (
                                <p className="text-sm text-white/70 leading-relaxed italic">
                                    {employee.applicants?.current_address || t('employees.profile.na')}
                                </p>
                            )}
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
