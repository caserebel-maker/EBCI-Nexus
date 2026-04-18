'use client'

import { useState, useTransition, useRef } from "react"
import {
    ArrowLeft, User, Phone, Mail, MapPin, Building, Briefcase,
    Calendar, Shield, ChevronRight, Pencil, X, Check,
    AlertCircle, CheckCircle2, Camera, Trash2, Clock, FileText
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { updateEmployee, uploadEmployeePhoto, deleteEmployee } from "./actions"
import { EMPLOYEE_LEVELS, LEVEL_BADGE_COLORS } from "@/config/employee-levels"
import { DEPARTMENTS } from "@/config/departments"
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList
} from "recharts"

// ─── Styles ──────────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.16)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: '18px',
}
const silverCard: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(200,200,220,0.04) 50%, rgba(255,255,255,0.18) 100%)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.65)',
    borderRadius: '18px',
}
const inp = "w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-[1rem] text-white placeholder-white/30 focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors"
const sel = "w-full bg-[#1a0608] border border-white/20 rounded-xl px-3 py-2 text-[1rem] text-white focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors appearance-none"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LEAVE_LABELS: Record<string, string> = {
    annual: 'ลาพักร้อน',
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    maternity: 'ลาคลอด',
    ordination: 'ลาบวช',
    other: 'อื่นๆ',
}
const LEAVE_STATUS_STYLE: Record<string, string> = {
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
}
const LEAVE_STATUS_LABEL: Record<string, string> = {
    approved: 'อนุมัติ',
    pending: 'รออนุมัติ',
    rejected: 'ไม่อนุมัติ',
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface LeaveBalance {
    leave_type: string
    entitled_days: number
    used_days: number
    remaining_days: number
}
interface LeaveRequest {
    id: string
    leave_type: string
    start_date: string
    end_date: string
    days: number
    status: string
    created_at: string
    reason: string | null
}
interface EmployeeOption {
    id: string
    first_name_th: string
    last_name_th: string
    position: string
}
interface Props {
    employee: any
    photoUrl: string | null
    displayName: string
    supervisorName: string
    tenure: string
    leaveBalances: LeaveBalance[]
    recentLeaves: LeaveRequest[]
    allEmployees: EmployeeOption[]
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
    supervisor_id: string
}

// ─── Section header ───────────────────────────────────────────────────────────
function SHead({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/10">
            <div className="h-8 w-8 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center text-white shrink-0">
                <Icon size={16} />
            </div>
            <h2 className="text-[1.1rem] font-bold text-white tracking-wide">{label}</h2>
        </div>
    )
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon, editing, editNode }: {
    label: string; value: string; icon: any; editing?: boolean; editNode?: React.ReactNode
}) {
    return (
        <div className="flex items-start justify-between py-3 border-b border-white/5 last:border-0 px-2 hover:bg-white/5 rounded-lg transition-colors gap-4">
            <div className="flex items-center gap-2.5 text-white/75 shrink-0 pt-0.5">
                <Icon size={15} className="text-amber-300" />
                <span className="text-[0.8rem] font-bold uppercase tracking-widest">{label}</span>
            </div>
            {editing && editNode
                ? <div className="flex-1 min-w-0">{editNode}</div>
                : <span className="text-[1rem] font-semibold text-white text-right">{value || '—'}</span>
            }
        </div>
    )
}

// ─── Recharts custom tooltip ──────────────────────────────────────────────────
function LeaveTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: 'rgba(20,4,10,0.95)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '10px 14px' }}>
            <p className="text-white font-bold text-sm mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} className="text-xs" style={{ color: p.fill }}>
                    {p.name}: <span className="font-bold">{p.value} วัน</span>
                </p>
            ))}
        </div>
    )
}

const LEAVE_PAGE_SIZE = 10

// ─── Leave History Sub-component ─────────────────────────────────────────────
function LeaveHistory({ leaves }: { leaves: LeaveRequest[] }) {
    const years = Array.from(new Set(leaves.map(l => new Date(l.start_date).getFullYear()))).sort((a, b) => b - a)
    const [yearFilter, setYearFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [page, setPage] = useState(1)

    const filtered = leaves.filter(l => {
        const y = String(new Date(l.start_date).getFullYear())
        return (yearFilter === 'all' || y === yearFilter)
            && (typeFilter === 'all' || l.leave_type === typeFilter)
            && (statusFilter === 'all' || l.status === statusFilter)
    })

    const totalPages = Math.max(1, Math.ceil(filtered.length / LEAVE_PAGE_SIZE))
    const pageData = filtered.slice((page - 1) * LEAVE_PAGE_SIZE, page * LEAVE_PAGE_SIZE)

    const selCls = "h-9 px-3 rounded-lg border border-white/12 bg-white/6 text-white/96 text-[0.85rem] focus:outline-none focus:border-[#ad5f6c] appearance-none cursor-pointer"

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select className={selCls} value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1) }}>
                    <option value="all" className="bg-[#1a0608]">ทุกปี</option>
                    {years.map(y => <option key={y} value={String(y)} className="bg-[#1a0608]">{y + 543}</option>)}
                </select>
                <select className={selCls} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
                    <option value="all" className="bg-[#1a0608]">ทุกประเภท</option>
                    {Object.entries(LEAVE_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-[#1a0608]">{l}</option>)}
                </select>
                <select className={selCls} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
                    <option value="all" className="bg-[#1a0608]">ทุกสถานะ</option>
                    <option value="approved" className="bg-[#1a0608]">อนุมัติ</option>
                    <option value="pending" className="bg-[#1a0608]">รออนุมัติ</option>
                    <option value="rejected" className="bg-[#1a0608]">ไม่อนุมัติ</option>
                </select>
                <span className="ml-auto text-[0.82rem] text-white/92 self-center">{filtered.length} รายการ</span>
            </div>

            {/* List */}
            {pageData.length === 0 ? (
                <p className="text-white/65 text-[0.95rem] text-center py-8">ไม่พบรายการ</p>
            ) : (
                <div className="space-y-2">
                    {pageData.map(lr => (
                        <div key={lr.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-3 rounded-xl hover:bg-white/5 transition-colors border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#882136]/30 flex items-center justify-center shrink-0">
                                    <Calendar size={16} className="text-amber-300" />
                                </div>
                                <div>
                                    <p className="text-[1rem] font-semibold text-white">
                                        {LEAVE_LABELS[lr.leave_type] ?? lr.leave_type}
                                        <span className="text-white/75 font-normal ml-2 text-[0.85rem]">{lr.days} วัน</span>
                                    </p>
                                    <p className="text-[0.85rem] text-white/75">
                                        {fmtDate(lr.start_date)}
                                        {lr.end_date && lr.end_date !== lr.start_date && ` — ${fmtDate(lr.end_date)}`}
                                    </p>
                                    {lr.reason && <p className="text-[0.8rem] text-white/65 mt-0.5 truncate max-w-xs">{lr.reason}</p>}
                                </div>
                            </div>
                            <span className={cn(
                                "text-[0.8rem] font-bold px-3 py-1 rounded-full border w-fit shrink-0",
                                LEAVE_STATUS_STYLE[lr.status] ?? 'bg-white/10 text-white/82 border-white/15'
                            )}>
                                {LEAVE_STATUS_LABEL[lr.status] ?? lr.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg text-[0.85rem] font-semibold bg-white/8 hover:bg-white/14 text-white/88 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >ก่อนหน้า</button>
                    <span className="text-[0.85rem] text-white/75 px-2">{page} / {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 rounded-lg text-[0.85rem] font-semibold bg-white/8 hover:bg-white/14 text-white/88 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >ถัดไป</button>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function EmployeeProfileView({
    employee, photoUrl, displayName, supervisorName, tenure,
    leaveBalances, recentLeaves, allEmployees, id, isHrAdmin
}: Props) {
    const router = useRouter()

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
        supervisor_id: employee.supervisor_id ?? '',
    })

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<FormState>(initForm)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [isPending, startTransition] = useTransition()
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const photoInputRef = useRef<HTMLInputElement>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const set = (field: keyof FormState) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
                supervisor_id: form.supervisor_id || null,
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

    const handleDelete = async () => {
        setIsDeleting(true)
        const result = await deleteEmployee(employee.id)
        if (result.error) {
            setIsDeleting(false)
            setShowDeleteConfirm(false)
            showToast('error', `ลบไม่สำเร็จ: ${result.error}`)
        } else {
            router.push('/hradmin/employees')
        }
    }

    const currentDisplayName = isEditing ? `${form.first_name_th} ${form.last_name_th}` : displayName
    const lvl = employee.approval_level ?? 1
    const levelColor = LEVEL_BADGE_COLORS[lvl] ?? LEVEL_BADGE_COLORS[1]
    const levelLabel = EMPLOYEE_LEVELS[lvl]?.label.split('—')[0].trim() ?? `Level ${lvl}`

    // ── Leave chart data — primary: leave_balances, fallback: leave_requests ──
    const chartData = (() => {
        if (leaveBalances.length > 0) {
            return leaveBalances
                .filter(b => b.entitled_days > 0 || b.used_days > 0)
                .map(b => ({
                    name: LEAVE_LABELS[b.leave_type] ?? b.leave_type,
                    ใช้ไปแล้ว: b.used_days,
                    คงเหลือ: Math.max(0, b.remaining_days),
                    entitled: b.entitled_days,
                }))
        }
        // Fallback: tally approved days from leave_requests
        const counts: Record<string, number> = {}
        recentLeaves.filter(l => l.status === 'approved').forEach(l => {
            counts[l.leave_type] = (counts[l.leave_type] ?? 0) + (l.days ?? 1)
        })
        return Object.entries(counts).map(([type, days]) => ({
            name: LEAVE_LABELS[type] ?? type,
            ใช้ไปแล้ว: days,
            คงเหลือ: 0,
            entitled: days,
        }))
    })()

    const EMPLOYMENT_LABELS: Record<string, string> = {
        'full-time': 'ประจำ',
        'part-time': 'นอกเวลา',
        'contract': 'สัญญาจ้าง',
        'probation': 'ทดลองงาน',
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-24" style={{ fontSize: '1.05rem' }}>

            {/* ── Delete Confirm Dialog ─────────────────────────────────────── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
                    <div style={{
                        background: 'rgba(20,4,10,0.96)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(220,38,38,0.40)',
                        borderRadius: '18px',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
                    }} className="w-full max-w-md p-7 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                                <Trash2 size={22} className="text-red-400" />
                            </div>
                            <h2 className="text-base font-bold text-white">ยืนยันการลบพนักงาน</h2>
                        </div>
                        <p className="text-[1rem] text-white/92 leading-relaxed">
                            คุณต้องการลบ <span className="text-white font-bold">{displayName}</span> ออกจากระบบใช่หรือไม่?<br />
                            <span className="text-red-400 font-semibold">การกระทำนี้ไม่สามารถย้อนกลับได้</span>
                        </p>
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl text-[1rem] font-semibold bg-white/10 hover:bg-white/15 text-white/92 hover:text-white border border-white/15 transition-all disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl text-[1rem] font-semibold bg-red-600/80 hover:bg-red-600 text-white border border-red-500/40 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={15} />
                                {isDeleting ? 'กำลังลบ...' : 'ลบพนักงาน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ────────────────────────────────────────────────────── */}
            {toast && (
                <div className={cn(
                    'fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-[1rem] font-semibold',
                    toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                )}>
                    {toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                    {toast.msg}
                </div>
            )}

            {/* ── Breadcrumb + Actions ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[0.95rem] text-white/92">
                    <Link href="/hradmin/employees" className="hover:text-white transition-colors">พนักงาน</Link>
                    <ChevronRight size={14} />
                    <span className="text-white font-medium">โปรไฟล์พนักงาน</span>
                </div>
                <div className="flex items-center gap-3">
                    {isHrAdmin && !isEditing && (
                        <button
                            onClick={handleEdit}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[0.95rem] font-semibold bg-[#882136]/60 hover:bg-[#882136]/80 text-white border border-[#ad5f6c]/30 hover:border-[#ad5f6c]/60 transition-all"
                        >
                            <Pencil size={14} /> แก้ไขข้อมูล
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button onClick={handleCancel} disabled={isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[0.95rem] font-semibold bg-white/10 hover:bg-white/15 text-white/92 hover:text-white border border-white/15 transition-all disabled:opacity-50">
                                <X size={14} /> ยกเลิก
                            </button>
                            <button onClick={handleSave} disabled={isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[0.95rem] font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-500/40 transition-all disabled:opacity-60">
                                <Check size={14} /> {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </>
                    )}
                    {!isEditing && (
                        <Link href="/hradmin/employees"
                            className="inline-flex items-center gap-2 text-[0.95rem] font-medium text-white/88 hover:text-white transition-colors">
                            <ArrowLeft size={15} /> กลับ
                        </Link>
                    )}
                </div>
            </div>

            {/* ── 1. HERO SECTION ──────────────────────────────────────────── */}
            <div style={silverCard} className="p-6 shadow-2xl">
                <div className="flex flex-col md:flex-row gap-6 items-start">

                    {/* Photo */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className="relative">
                            <div className="h-36 w-36 rounded-2xl bg-gradient-to-br from-[#882136] to-[#3a0d14] flex items-center justify-center text-white font-black text-5xl border-2 border-white/20 overflow-hidden shadow-xl">
                                {(photoPreview || photoUrl)
                                    ? <img src={photoPreview ?? photoUrl!} className="h-full w-full object-cover" alt={currentDisplayName} />
                                    : <span>{currentDisplayName.charAt(0)}</span>
                                }
                            </div>
                            {photoPreview && isEditing && (
                                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">ใหม่</span>
                            )}
                        </div>
                        {isEditing && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/18 border border-white/15 text-white/92 hover:text-white text-[0.82rem] font-semibold transition-all"
                                >
                                    <Camera size={13} /> เปลี่ยนรูป
                                </button>
                                <p className="text-[0.72rem] text-white/65 text-center">JPG / PNG ไม่เกิน 5 MB</p>
                                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                                    className="hidden" onChange={handlePhotoChange} />
                            </>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-3">
                        {/* Name row */}
                        {isEditing ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input className={inp} value={form.first_name_th} onChange={set('first_name_th')} placeholder="ชื่อ" />
                                    <input className={inp} value={form.last_name_th} onChange={set('last_name_th')} placeholder="นามสกุล" />
                                </div>
                                <input className={inp} value={form.nickname} onChange={set('nickname')} placeholder="ชื่อเล่น (ถ้ามี)" />
                            </div>
                        ) : (
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-[1.8rem] font-black text-white leading-tight">
                                        {displayName}
                                        {employee.nickname && (
                                            <span className="text-white/78 font-normal text-base ml-2">({employee.nickname})</span>
                                        )}
                                    </h1>
                                    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", levelColor)}>
                                        {levelLabel}
                                    </span>
                                    {/* Status badge */}
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5",
                                        employee.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/25"
                                            : employee.status === "on_leave" ? "bg-amber-500/20 text-amber-400 border-amber-500/25"
                                                : "bg-slate-500/15 text-slate-400 border-slate-500/20"
                                    )}>
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        {employee.status === "active" ? "ปฏิบัติงาน" : employee.status === "on_leave" ? "ลา" : "พ้นสภาพ"}
                                    </span>
                                </div>
                                {isEditing
                                    ? <input className={cn(inp, 'mt-2 max-w-xs text-sm')} value={form.position} onChange={set('position')} placeholder="ตำแหน่ง" />
                                    : <p className="text-amber-100/90 font-bold text-[1rem] mt-0.5">{employee.position} — {employee.department}</p>
                                }
                            </div>
                        )}

                        {/* Badge row */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/12 text-white/92 text-[0.85rem] font-semibold">
                                <Briefcase size={13} className="text-amber-300" />
                                {employee.employee_code}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/12 text-white/92 text-[0.85rem] font-semibold">
                                <Clock size={13} className="text-amber-300" />
                                อายุงาน {tenure}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/12 text-white/92 text-[0.85rem] font-semibold">
                                <User size={13} className="text-amber-300" />
                                {isEditing
                                    ? <select className="bg-transparent text-white/92 focus:outline-none text-[0.85rem]" value={form.employment_type} onChange={set('employment_type')}>
                                        <option value="full-time">ประจำ</option>
                                        <option value="part-time">นอกเวลา</option>
                                        <option value="contract">สัญญาจ้าง</option>
                                        <option value="probation">ทดลองงาน</option>
                                    </select>
                                    : EMPLOYMENT_LABELS[employee.employment_type] ?? employee.employment_type
                                }
                            </span>
                        </div>

                        {/* Status + Department edit */}
                        {isEditing && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                <select className={cn(sel, 'max-w-[160px]')} value={form.status} onChange={set('status')}>
                                    <option value="active">ปฏิบัติงาน</option>
                                    <option value="on_leave">ลา</option>
                                    <option value="inactive">พ้นสภาพ</option>
                                </select>
                                <select className={cn(sel, 'max-w-[200px]')} value={form.department} onChange={set('department')}>
                                    {form.department && !(DEPARTMENTS as readonly string[]).includes(form.department) && (
                                        <option value={form.department}>{form.department}</option>
                                    )}
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                {form.status === 'inactive' && (
                                    <>
                                        <input type="date" className={cn(inp, 'max-w-[160px]')} value={form.quit_date} onChange={set('quit_date')} />
                                        <select className={cn(sel, 'max-w-[160px]')} value={form.quit_reason} onChange={set('quit_reason')}>
                                            <option value="">— สาเหตุ —</option>
                                            <option value="resigned">ลาออกเอง</option>
                                            <option value="retired">เกษียณอายุ</option>
                                            <option value="contract_ended">สัญญาหมด</option>
                                            <option value="other">อื่นๆ</option>
                                        </select>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 2+3. Contact & Work Info ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Contact */}
                <div style={glass} className="p-6 shadow-xl">
                    <SHead icon={Phone} label="ข้อมูลติดต่อ" />
                    <div className="space-y-0.5">
                        <InfoRow label="อีเมล" icon={Mail}
                            value={employee.email || '—'}
                            editing={isEditing}
                            editNode={<input type="email" className={inp} value={form.email} onChange={set('email')} placeholder="อีเมล" />}
                        />
                        <InfoRow label="โทรศัพท์" icon={Phone}
                            value={employee.phone || '—'}
                            editing={isEditing}
                            editNode={<input className={inp} value={form.phone} onChange={set('phone')} placeholder="เบอร์โทร" />}
                        />
                        <InfoRow label="ผู้ติดต่อฉุกเฉิน" icon={AlertCircle}
                            value={employee.applicants?.phone || '—'}
                            editing={isEditing}
                            editNode={<input className={inp} value={form.emergency_contact} onChange={set('emergency_contact')} placeholder="เบอร์ผู้ติดต่อฉุกเฉิน" />}
                        />
                        <div className="pt-3 mt-1 border-t border-white/8">
                            <p className="text-[0.75rem] font-bold text-white/65 uppercase tracking-widest mb-2">ที่อยู่</p>
                            {isEditing ? (
                                <textarea className={cn(inp, 'min-h-[72px] resize-none')} value={form.address}
                                    onChange={set('address')} placeholder="ที่อยู่" />
                            ) : (
                                <p className="text-[0.95rem] text-white/88 leading-relaxed">
                                    {employee.applicants?.current_address || '—'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Work info */}
                <div style={glass} className="p-6 shadow-xl">
                    <SHead icon={Briefcase} label="ข้อมูลการทำงาน" />
                    <div className="space-y-0.5">
                        <InfoRow label="วันเริ่มงาน" icon={Calendar}
                            value={fmtDate(employee.start_date)}
                            editing={isEditing}
                            editNode={<input type="date" className={inp} value={form.start_date} onChange={set('start_date')} />}
                        />
                        <InfoRow label="แผนก" icon={Building}
                            value={employee.department || '—'}
                        />
                        <InfoRow label="ตำแหน่ง" icon={Briefcase}
                            value={employee.position || '—'}
                        />
                        <InfoRow label="ระดับพนักงาน" icon={Shield}
                            value={EMPLOYEE_LEVELS[employee.approval_level ?? 1]?.label ?? `Level ${employee.approval_level ?? 1}`}
                            editing={isEditing && isHrAdmin}
                            editNode={
                                <select className={sel} value={form.approval_level}
                                    onChange={e => setForm(prev => ({ ...prev, approval_level: Number(e.target.value) }))}>
                                    {Object.entries(EMPLOYEE_LEVELS).map(([lvl, { label }]) => (
                                        <option key={lvl} value={lvl}>{label}</option>
                                    ))}
                                </select>
                            }
                        />
                        <InfoRow label="ผู้บังคับบัญชา" icon={User}
                            value={supervisorName}
                            editing={isEditing}
                            editNode={
                                <select className={sel} value={form.supervisor_id}
                                    onChange={set('supervisor_id')}>
                                    <option value="">— ไม่ระบุ —</option>
                                    {allEmployees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.first_name_th} {e.last_name_th} — {e.position}
                                        </option>
                                    ))}
                                </select>
                            }
                        />
                        <InfoRow label="สถานที่" icon={MapPin} value="Head Office (Nexus)" />
                    </div>
                </div>
            </div>

            {/* ── 4. Leave Statistics Chart ─────────────────────────────────── */}
            <div style={glass} className="p-6 shadow-xl">
                <SHead icon={FileText} label="สถิติการลา" />
                {chartData.length === 0 ? (
                    <p className="text-white/65 text-[0.95rem] text-center py-8">ยังไม่มีข้อมูลวันลา</p>
                ) : (
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
                                barCategoryGap="30%"
                            >
                                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }}
                                    axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" width={80}
                                    tick={{ fill: '#fcd34d', fontSize: 13, fontWeight: 600 }}
                                    axisLine={false} tickLine={false} />
                                <Tooltip content={<LeaveTooltip />} cursor={{ fill: 'rgba(255,255,255,0.22)' }} />
                                <Bar dataKey="ใช้ไปแล้ว" stackId="a" fill="#ad5f6c" radius={[4, 0, 0, 4]} />
                                <Bar dataKey="คงเหลือ" stackId="a" fill="rgba(255,255,255,0.25)"
                                    radius={[0, 4, 4, 0]}>
                                    <LabelList dataKey="คงเหลือ" position="right"
                                        content={({ x, y, width, height, index }: any) => {
                                            const d = chartData[index]
                                            if (!d) return null
                                            const label = `${d.ใช้ไปแล้ว}/${d.entitled} วัน`
                                            return (
                                                <text
                                                    x={Number(x) + Number(width) + 8}
                                                    y={Number(y) + Number(height) / 2 + 4}
                                                    fill="rgba(255,255,255,0.85)"
                                                    fontSize={11}
                                                    fontWeight={700}
                                                >
                                                    {label}
                                                </text>
                                            )
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {/* Legend */}
                {chartData.length > 0 && (
                    <div className="flex items-center gap-5 mt-3 pl-2">
                        <div className="flex items-center gap-2 text-[0.85rem] text-white/82">
                            <span className="h-2.5 w-5 rounded-sm bg-[#ad5f6c]" /> ใช้ไปแล้ว
                        </div>
                        <div className="flex items-center gap-2 text-[0.85rem] text-white/82">
                            <span className="h-2.5 w-5 rounded-sm bg-white/18 border border-white/20" /> คงเหลือ
                        </div>
                    </div>
                )}
            </div>

            {/* ── 5. Leave History (full, with filter + pagination) ─────────── */}
            <div style={glass} className="p-6 shadow-xl">
                <SHead icon={Calendar} label="ประวัติใบลาทั้งหมด" />
                {recentLeaves.length === 0 ? (
                    <p className="text-white/65 text-[0.95rem] text-center py-8">ยังไม่มีประวัติใบลา</p>
                ) : (
                    <LeaveHistory leaves={recentLeaves} />
                )}
            </div>

            {/* ── 6. Danger Zone (hr_admin only) ───────────────────────────── */}
            {isHrAdmin && (
                <div style={{
                    background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
                    border: '2px solid #ef4444',
                    borderRadius: '16px',
                    padding: '24px',
                }}>
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/20">
                        <AlertCircle size={22} className="text-white shrink-0" />
                        <h2 className="text-[1.3rem] font-bold text-white tracking-wide">⚠️ Danger Zone</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                        <p className="text-[0.95rem] font-medium" style={{ color: 'rgba(255,255,255,0.98)' }}>
                            การลบพนักงานจะลบข้อมูลและบัญชีผู้ใช้ออกจากระบบอย่างถาวร ไม่สามารถย้อนกลับได้
                        </p>
                        <div className="flex gap-3 shrink-0">
                            {!isEditing && (
                                <button
                                    onClick={handleEdit}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.95rem] font-bold text-white transition-all active:scale-95"
                                    style={{ background: 'transparent', border: '2px solid white' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.20)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Pencil size={15} /> แก้ไขข้อมูล
                                </button>
                            )}
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.95rem] font-bold text-white transition-all active:scale-95"
                                style={{ background: '#ef4444', border: 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
                            >
                                <Trash2 size={15} /> ลบพนักงาน
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
