'use client'

import { useState, useTransition, useRef } from "react"
import {
    ArrowLeft, User, Phone, Mail, MapPin, Building, Briefcase,
    Calendar, Shield, ChevronRight, Pencil, X, Check,
    AlertCircle, CheckCircle2, Camera, Trash2, Clock, FileText,
    Lock, LogOut, Printer,
} from "lucide-react"
import type { LucideIcon } from 'lucide-react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { updateEmployee, uploadEmployeePhoto, deleteEmployee } from "./actions"
import { ImageCropModal } from "@/components/ImageCropModal"
import { EMPLOYEE_LEVELS, LEVEL_BADGE_COLORS } from "@/config/employee-levels"
import { DEPARTMENTS } from "@/config/departments"
import { ContractsCard } from "@/components/hradmin/employees/ContractsCard"
import { LocationSection, LocationEmpty } from "@/components/hradmin/employees/LocationSection"
import { SalarySlipsCard, type SalarySlip } from "@/components/hradmin/employees/SalarySlipsCard"
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
// `appearance-none` strips the native ⌄ chevron — without re-adding one
// the field reads as a plain dark button. Inline SVG via background-image
// keeps the chevron visible so HR can spot which fields are dropdowns.
const sel = "w-full bg-[#1a0608] border border-white/20 rounded-xl px-3 py-2 pr-9 text-[1rem] text-white cursor-pointer focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors appearance-none bg-no-repeat"
const SEL_CHEVRON: React.CSSProperties = {
    backgroundImage:
        "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.65)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e\")",
    backgroundPosition: 'right 12px center',
    backgroundSize: '14px 14px',
}

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

/**
 * "32 ปี" / "32 ปี 6 เดือน" — chooses precision based on remaining
 * months so a freshly-30 person doesn't read as "30 ปี" the same as
 * someone three months past their birthday. Returns empty string for
 * missing or invalid input so the caller can fall back gracefully.
 */
function calcAgeText(dob: string | Date | null | undefined): string {
    if (!dob) return ''
    const d = new Date(dob)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    let years = now.getFullYear() - d.getFullYear()
    let months = now.getMonth() - d.getMonth()
    if (now.getDate() < d.getDate()) months--
    if (months < 0) { years--; months += 12 }
    if (years < 0) return ''
    if (years === 0) return months > 0 ? `${months} เดือน` : 'น้อยกว่า 1 เดือน'
    return months > 0 ? `${years} ปี ${months} เดือน` : `${years} ปี`
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
    contracts: ContractEntry[]
    canViewPayroll: boolean   // page-level gate from can_manage_payroll
    salarySlips: SalarySlip[]
}

// Mirrors employee_contracts schema (only the fields the card consumes).
interface ContractEntry {
    id: string
    contract_type: 'probation' | 'permanent' | 'amendment' | 'renewal' | 'termination'
    signed_date: string
    effective_start: string | null
    effective_end: string | null
    file_path: string
    file_name: string | null
    file_size: number | null
    mime_type: string | null
    page_count: number | null
    notes: string | null
    uploaded_at: string
}

interface FormState {
    employee_code: string
    first_name_th: string
    last_name_th: string
    first_name_en: string
    last_name_en: string
    nickname: string
    position: string
    department: string
    secondary_department: string
    phone: string
    email: string
    employment_type: string
    status: string
    start_date: string
    probation_end_date: string
    date_of_birth: string
    gender: string
    quit_date: string
    quit_reason: string
    address: string
    emergency_contact: string
    emergency_contact_name: string
    emergency_contact_phone: string
    emergency_contact_relation: string
    emergency_contact_address: string
    approval_level: number
    manager_id: string
    leave_approver_id: string
    // Home location for the inline map preview. Stored as strings in
    // the form to match the date-of-birth pattern; coerced to numeric
    // (or null) before sending to the server action.
    home_latitude: string
    home_longitude: string
    home_location_label: string
    home_location_note: string
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
        <div data-info-row className="flex items-start justify-between py-3 border-b border-white/5 last:border-0 px-3 hover:bg-white/5 rounded-lg transition-colors gap-4">
            <div className="flex items-center gap-2.5 text-white/75 shrink-0 pt-0.5">
                <Icon size={15} className="text-amber-300" />
                <span className="text-[0.8rem] font-bold uppercase tracking-widest">{label}</span>
            </div>
            {editing && editNode
                ? <div className="flex-1 min-w-0">{editNode}</div>
                : <span className="text-[0.95rem] font-semibold text-white text-right break-all">{value || '—'}</span>
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
    leaveBalances, recentLeaves, allEmployees, id, isHrAdmin,
    contracts, canViewPayroll, salarySlips,
}: Props) {
    const router = useRouter()

    const initForm = (): FormState => ({
        employee_code: employee.employee_code ?? '',
        first_name_th: employee.first_name_th ?? '',
        last_name_th: employee.last_name_th ?? '',
        first_name_en: employee.first_name_en ?? '',
        last_name_en: employee.last_name_en ?? '',
        nickname: employee.nickname ?? '',
        position: employee.position ?? '',
        department: employee.department ?? '',
        secondary_department: employee.secondary_department ?? '',
        phone: employee.phone ?? '',
        email: employee.email ?? '',
        employment_type: employee.employment_type ?? 'full-time',
        status: employee.status ?? 'active',
        start_date: employee.start_date ? employee.start_date.slice(0, 10) : '',
        probation_end_date: employee.probation_end_date
            ? String(employee.probation_end_date).slice(0, 10) : '',
        date_of_birth: employee.date_of_birth
            ? String(employee.date_of_birth).slice(0, 10) : '',
        gender: employee.gender ?? '',
        quit_date: employee.quit_date ? employee.quit_date.slice(0, 10) : '',
        quit_reason: employee.quit_reason ?? '',
        address: employee.applicants?.current_address ?? '',
        emergency_contact: employee.applicants?.phone ?? '',
        emergency_contact_name:     employee.emergency_contact_name     ?? '',
        emergency_contact_phone:    employee.emergency_contact_phone    ?? '',
        emergency_contact_relation: employee.emergency_contact_relation ?? '',
        emergency_contact_address:  employee.emergency_contact_address  ?? '',
        approval_level: employee.approval_level ?? 1,
        manager_id: employee.manager_id ?? '',
        leave_approver_id: employee.leave_approver_id ?? '',
        home_latitude: employee.home_latitude != null ? String(employee.home_latitude) : '',
        home_longitude: employee.home_longitude != null ? String(employee.home_longitude) : '',
        home_location_label: employee.home_location_label ?? '',
        home_location_note: employee.home_location_note ?? '',
    })

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<FormState>(initForm)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [isPending, startTransition] = useTransition()
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [cropSrc, setCropSrc] = useState<string | null>(null) // raw file → crop modal
    const photoInputRef = useRef<HTMLInputElement>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const set = (field: keyof FormState) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            setForm(prev => ({ ...prev, [field]: e.target.value }))

    // File picker → validate → open crop modal.
    // Actual photoFile is set by handleCropped once the user confirms the crop.
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const allowed = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowed.includes(file.type)) {
            showToast('error', 'ไฟล์ต้องเป็น JPG, PNG หรือ WebP')
            if (photoInputRef.current) photoInputRef.current.value = ''
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'ขนาดไฟล์ต้องไม่เกิน 5 MB')
            if (photoInputRef.current) photoInputRef.current.value = ''
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result === 'string') setCropSrc(reader.result)
        }
        reader.readAsDataURL(file)
    }

    // Crop modal committed — convert the cropped blob into a File + preview
    // so the existing Save flow picks it up.
    const handleCropped = (blob: Blob) => {
        const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
        setCropSrc(null)
        if (photoInputRef.current) photoInputRef.current.value = ''
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
                const photoResult = await uploadEmployeePhoto(employee.id, fd)
                if (photoResult.error) {
                    showToast('error', `อัปโหลดรูปไม่สำเร็จ: ${photoResult.error}`)
                    return
                }
            }
            // Coerce home_latitude/longitude to numeric, treating empty
            // strings as NULL (the CHECK constraint rejects empty
            // strings cast to numeric).
            const lat = form.home_latitude.trim()
                ? Number(form.home_latitude.trim())
                : null
            const lng = form.home_longitude.trim()
                ? Number(form.home_longitude.trim())
                : null
            if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
                showToast('error', 'Latitude ต้องอยู่ระหว่าง -90 ถึง 90')
                return
            }
            if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
                showToast('error', 'Longitude ต้องอยู่ระหว่าง -180 ถึง 180')
                return
            }

            const result = await updateEmployee(employee.id, {
                employee_code: form.employee_code.trim(),
                first_name_th: form.first_name_th,
                last_name_th: form.last_name_th,
                first_name_en: form.first_name_en || null,
                last_name_en: form.last_name_en || null,
                nickname: form.nickname,
                position: form.position,
                department: form.department,
                secondary_department: form.secondary_department || null,
                phone: form.phone,
                email: form.email,
                employment_type: form.employment_type,
                status: form.status,
                start_date: form.start_date,
                probation_end_date: form.probation_end_date || null,
                date_of_birth: form.date_of_birth || null,
                gender: form.gender || null,
                quit_date: form.quit_date || undefined,
                quit_reason: form.quit_reason || undefined,
                approval_level: form.approval_level,
                applicant_current_address: form.address,
                applicant_phone: form.emergency_contact,
                manager_id: form.manager_id || null,
                leave_approver_id: form.leave_approver_id || null,
                emergency_contact_name:     form.emergency_contact_name     || null,
                emergency_contact_phone:    form.emergency_contact_phone    || null,
                emergency_contact_relation: form.emergency_contact_relation || null,
                emergency_contact_address:  form.emergency_contact_address  || null,
                home_latitude: lat,
                home_longitude: lng,
                home_location_label: form.home_location_label || null,
                home_location_note: form.home_location_note || null,
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
        <div className="space-y-6 max-w-5xl mx-auto pb-24 print-employee" style={{ fontSize: '1.05rem' }}>

            {/* ── Print-only header — only renders on paper. Carries the
                org name + employee identity + the print date so the
                printout stands on its own when filed away from the app.
                Tailwind's `hidden print:block` swaps display for print. */}
            <header className="hidden print:block preserve-color" style={{
                borderBottom: '2px solid #000',
                paddingBottom: 12,
                marginBottom: 14,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '10pt', letterSpacing: '0.2em', color: '#666' }}>
                            EBCI · ข้อมูลพนักงาน
                        </p>
                        <h1 style={{ margin: '4px 0 0', fontSize: '18pt', fontWeight: 700, color: '#000' }}>
                            {displayName}
                            <span style={{ marginLeft: 10, fontSize: '11pt', fontWeight: 400, color: '#666' }}>
                                {employee.employee_code}
                            </span>
                        </h1>
                    </div>
                    <p style={{ margin: 0, fontSize: '9pt', color: '#666' }}>
                        พิมพ์เมื่อ {new Date().toLocaleDateString('th-TH', {
                            day: '2-digit', month: 'long', year: 'numeric',
                        })}
                    </p>
                </div>
            </header>

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
                    'fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-[1rem] font-semibold print:hidden',
                    toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                )}>
                    {toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                    {toast.msg}
                </div>
            )}

            {/* ── Breadcrumb + Actions ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-2 text-[0.95rem] text-white/92">
                    <Link href="/hradmin/employees" className="hover:text-white transition-colors">พนักงาน</Link>
                    <ChevronRight size={14} />
                    <span className="text-white font-medium">โปรไฟล์พนักงาน</span>
                </div>
                <div className="flex items-center gap-3">
                    {isHrAdmin && !isEditing && (
                        <button
                            // INP fix: setTimeout(0) wasn't enough — window
                            // .print() still blocks the event loop while
                            // the dialog is open, so the next paint after
                            // the click never happens until the user
                            // dismisses it. Brave/Chrome then attribute
                            // the entire dialog duration to the click as
                            // an INP regression. Double requestAnimation
                            // Frame guarantees at least one paint cycle
                            // completes between the click event and the
                            // dialog open, which reset the INP timer.
                            onClick={() => {
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => window.print())
                                })
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[0.95rem] font-semibold bg-white/10 hover:bg-white/18 text-white/92 hover:text-white border border-white/15 transition-all"
                            title="พิมพ์ / บันทึกเป็น PDF (ขาวดำ + รูปสี)"
                        >
                            <Printer size={14} /> ส่งออก PDF
                        </button>
                    )}
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

                    {/* Photo — `preserve-color` keeps the print version
                        in colour while the rest of the card flattens to
                        b/w. The wrapper carries the class because the
                        photo's gradient placeholder also needs to print
                        with its EBCI maroon when there's no real image. */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className="relative preserve-color">
                            <div className="h-36 w-36 rounded-2xl bg-gradient-to-br from-[#882136] to-[#3a0d14] flex items-center justify-center text-white font-black text-5xl border-2 border-white/20 overflow-hidden shadow-xl">
                                {(photoPreview || photoUrl)
                                    ? <img src={photoPreview ?? photoUrl!} className="h-full w-full object-cover preserve-color" alt={currentDisplayName} />
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

                        {/* Display mode: read-only badges. Tenure is computed
                            (always read-only); employee_code + employment_type
                            move to the edit form below when isEditing flips. */}
                        {!isEditing && (
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
                                    {EMPLOYMENT_LABELS[employee.employment_type] ?? employee.employment_type}
                                </span>
                            </div>
                        )}

                        {/* Edit mode: read-only band (tenure only) + grouped
                            editable card so HR can spot at a glance which
                            fields are interactive vs computed. */}
                        {isEditing && (
                            <div className="space-y-3 pt-1">
                                {/* Read-only band — gray border + lock icon
                                    so it's obviously not editable */}
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/8 text-white/55 text-[0.78rem]">
                                        <Lock size={11} />
                                        <Clock size={11} />
                                        อายุงาน {tenure}
                                        <span className="text-white/30 ml-1">(คำนวณอัตโนมัติ)</span>
                                    </span>
                                </div>

                                {/* Editable controls — labelled + chevron-bearing dropdowns */}
                                <div
                                    className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                                >
                                    <EditField label="รหัสพนักงาน" icon={Briefcase}>
                                        <input
                                            className={cn(inp, 'text-sm')}
                                            value={form.employee_code}
                                            onChange={set('employee_code')}
                                            placeholder="เช่น 180-52"
                                        />
                                    </EditField>
                                    <EditField label="ประเภทการจ้าง" icon={User}>
                                        <select
                                            className={cn(sel, 'text-sm')}
                                            style={SEL_CHEVRON}
                                            value={form.employment_type}
                                            onChange={set('employment_type')}
                                        >
                                            <option value="full-time">ประจำ</option>
                                            <option value="part-time">นอกเวลา</option>
                                            <option value="contract">สัญญาจ้าง</option>
                                            <option value="probation">ทดลองงาน</option>
                                        </select>
                                    </EditField>
                                    <EditField label="สถานะการทำงาน" icon={CheckCircle2}>
                                        <select
                                            className={cn(sel, 'text-sm')}
                                            style={SEL_CHEVRON}
                                            value={form.status}
                                            onChange={set('status')}
                                        >
                                            <option value="active">ปฏิบัติงาน</option>
                                            <option value="on_leave">ลา</option>
                                            <option value="inactive">พ้นสภาพ</option>
                                        </select>
                                    </EditField>
                                    <EditField label="แผนก" icon={Building}>
                                        <select
                                            className={cn(sel, 'text-sm')}
                                            style={SEL_CHEVRON}
                                            value={form.department}
                                            onChange={set('department')}
                                        >
                                            {form.department && !(DEPARTMENTS as readonly string[]).includes(form.department) && (
                                                <option value={form.department}>{form.department}</option>
                                            )}
                                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </EditField>
                                    {form.status === 'inactive' && (
                                        <>
                                            <EditField label="วันที่พ้นสภาพ" icon={Calendar}>
                                                <input
                                                    type="date"
                                                    className={cn(inp, 'text-sm')}
                                                    value={form.quit_date}
                                                    onChange={set('quit_date')}
                                                />
                                            </EditField>
                                            <EditField label="สาเหตุ" icon={LogOut}>
                                                <select
                                                    className={cn(sel, 'text-sm')}
                                                    style={SEL_CHEVRON}
                                                    value={form.quit_reason}
                                                    onChange={set('quit_reason')}
                                                >
                                                    <option value="">— สาเหตุ —</option>
                                                    <option value="resigned">ลาออกเอง</option>
                                                    <option value="retired">เกษียณอายุ</option>
                                                    <option value="contract_ended">สัญญาหมด</option>
                                                    <option value="other">อื่นๆ</option>
                                                </select>
                                            </EditField>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 2+3. Contact & Work Info ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-3" data-print-section>

                {/* Contact */}
                <div style={glass} className="p-4 shadow-xl">
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
                        <div className="pt-3 mt-1 border-t border-white/8 px-3">
                            <p className="text-[0.75rem] font-bold text-white/65 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <AlertCircle size={13} className="text-rose-300" />
                                ผู้ติดต่อฉุกเฉิน
                            </p>
                            <div className="space-y-1.5">
                                <InfoRow label="ชื่อ-สกุล" icon={User}
                                    value={employee.emergency_contact_name || '—'}
                                    editing={isEditing}
                                    editNode={<input className={inp} value={form.emergency_contact_name} onChange={set('emergency_contact_name')} placeholder="ชื่อ-นามสกุลผู้ติดต่อ" />}
                                />
                                <InfoRow label="เบอร์โทร" icon={Phone}
                                    value={employee.emergency_contact_phone || '—'}
                                    editing={isEditing}
                                    editNode={<input type="tel" className={inp} value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} placeholder="0812345678" />}
                                />
                                <InfoRow label="ความสัมพันธ์" icon={User}
                                    value={employee.emergency_contact_relation || '—'}
                                    editing={isEditing}
                                    editNode={
                                        <select className={sel} value={form.emergency_contact_relation} onChange={set('emergency_contact_relation')}>
                                            <option value="">— ไม่ระบุ —</option>
                                            <option value="พ่อ">พ่อ</option>
                                            <option value="แม่">แม่</option>
                                            <option value="พี่ชาย">พี่ชาย</option>
                                            <option value="พี่สาว">พี่สาว</option>
                                            <option value="น้องชาย">น้องชาย</option>
                                            <option value="น้องสาว">น้องสาว</option>
                                            <option value="สามี">สามี</option>
                                            <option value="ภรรยา">ภรรยา</option>
                                            <option value="บุตรชาย">บุตรชาย</option>
                                            <option value="บุตรสาว">บุตรสาว</option>
                                            <option value="คู่สมรส">คู่สมรส</option>
                                            <option value="ญาติ">ญาติ</option>
                                            <option value="เพื่อน">เพื่อน</option>
                                            <option value="อื่นๆ">อื่นๆ</option>
                                        </select>
                                    }
                                />
                                <InfoRow label="ที่อยู่" icon={MapPin}
                                    value={employee.emergency_contact_address || '—'}
                                    editing={isEditing}
                                    editNode={<textarea className={cn(inp, 'min-h-[60px] resize-none')} value={form.emergency_contact_address} onChange={set('emergency_contact_address')} placeholder="ที่อยู่ผู้ติดต่อฉุกเฉิน" />}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work info */}
                <div style={glass} className="p-4 shadow-xl">
                    <SHead icon={Briefcase} label="ข้อมูลการทำงาน" />
                    <div className="space-y-0.5">
                        <InfoRow label="วันเริ่มงาน" icon={Calendar}
                            value={fmtDate(employee.start_date)}
                            editing={isEditing}
                            editNode={<input type="date" className={inp} value={form.start_date} onChange={set('start_date')} />}
                        />
                        <InfoRow label="สิ้นสุดทดลองงาน" icon={Calendar}
                            value={employee.probation_end_date ? fmtDate(employee.probation_end_date) : '—'}
                            editing={isEditing}
                            editNode={<input type="date" className={inp} value={form.probation_end_date} onChange={set('probation_end_date')} />}
                        />
                        <InfoRow label="แผนก" icon={Building}
                            value={employee.department || '—'}
                        />
                        <InfoRow label="แผนกที่ 2 (รักษาการ)" icon={Building}
                            value={employee.secondary_department || '—'}
                            editing={isEditing && isHrAdmin}
                            editNode={
                                <input
                                    type="text"
                                    className={inp}
                                    value={form.secondary_department}
                                    onChange={set('secondary_department')}
                                    placeholder="เว้นว่างถ้าไม่มี"
                                />
                            }
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
                                <select className={sel} value={form.manager_id}
                                    onChange={set('manager_id')}>
                                    <option value="">— ไม่ระบุ —</option>
                                    {allEmployees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.first_name_th} {e.last_name_th} — {e.position}
                                        </option>
                                    ))}
                                </select>
                            }
                        />
                        <InfoRow label="ผู้อนุมัติการลา" icon={User}
                            value={
                                form.leave_approver_id
                                    ? (allEmployees.find(e => e.id === form.leave_approver_id)
                                        ? `${allEmployees.find(e => e.id === form.leave_approver_id)!.first_name_th} ${allEmployees.find(e => e.id === form.leave_approver_id)!.last_name_th}`
                                        : '—')
                                    : (employee.leave_approver_id ? '—' : 'ใช้ผู้บังคับบัญชา')
                            }
                            editing={isEditing}
                            editNode={
                                <select className={sel} value={form.leave_approver_id}
                                    onChange={set('leave_approver_id')}>
                                    <option value="">— ใช้ผู้บังคับบัญชา —</option>
                                    {allEmployees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.first_name_th} {e.last_name_th}
                                        </option>
                                    ))}
                                </select>
                            }
                        />
                    </div>
                </div>
            </div>

            {/* ── 3b. Personal info + Address + Location (2-col grid) ────────────
                The 4 columns (DOB / gender / EN name + address + map) are
                grouped under one row of cards so HR sees biographical
                detail and home location next to each other. The print
                stylesheet drops the map iframe — see LocationSection.

                `print:grid-cols-2 print:gap-3` keeps the 2-col layout on
                paper even when Tailwind's md: breakpoint isn't hit by the
                print viewport — without this, both cards stack and tip
                onto page 2, which the user (Apr 27) reported as "ข้อมูล
                ส่วนตัว + ที่อยู่ ยังแสดงไม่ครบ". */}
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-3" data-print-section>

                {/* Personal info */}
                <div style={glass} className="p-4 shadow-xl">
                    <SHead icon={User} label="ข้อมูลส่วนตัว" />
                    <div className="space-y-0.5">
                        <InfoRow label="ชื่อ-สกุล (อังกฤษ)" icon={User}
                            value={
                                [employee.first_name_en, employee.last_name_en]
                                    .filter(Boolean).join(' ') || '—'
                            }
                            editing={isEditing}
                            editNode={
                                <div className="flex gap-2">
                                    <input className={inp} value={form.first_name_en} onChange={set('first_name_en')} placeholder="First name" />
                                    <input className={inp} value={form.last_name_en} onChange={set('last_name_en')} placeholder="Last name" />
                                </div>
                            }
                        />
                        <InfoRow label="วันเกิด" icon={Calendar}
                            value={
                                employee.date_of_birth
                                    ? `${fmtDate(employee.date_of_birth)}${calcAgeText(employee.date_of_birth) ? ` · อายุ ${calcAgeText(employee.date_of_birth)}` : ''}`
                                    : '—'
                            }
                            editing={isEditing}
                            editNode={<input type="date" className={inp} value={form.date_of_birth} onChange={set('date_of_birth')} />}
                        />
                        <InfoRow label="เพศ" icon={User}
                            value={form.gender ? (form.gender === 'male' ? 'ชาย' : form.gender === 'female' ? 'หญิง' : form.gender) : (employee.gender === 'male' ? 'ชาย' : employee.gender === 'female' ? 'หญิง' : employee.gender || '—')}
                            editing={isEditing}
                            editNode={
                                <select className={sel} value={form.gender} onChange={set('gender')}>
                                    <option value="">— ไม่ระบุ —</option>
                                    <option value="male">ชาย</option>
                                    <option value="female">หญิง</option>
                                    <option value="other">อื่นๆ</option>
                                </select>
                            }
                        />
                    </div>
                </div>

                {/* Address + Location */}
                <div style={glass} className="p-4 shadow-xl">
                    <SHead icon={MapPin} label="ที่อยู่" />
                    <div className="space-y-3">
                        <div>
                            <p className="text-[0.72rem] font-bold text-white/55 uppercase tracking-widest mb-1.5">
                                ที่อยู่ปัจจุบัน
                            </p>
                            {isEditing ? (
                                <textarea
                                    className={cn(inp, 'min-h-[64px] resize-none')}
                                    value={form.address}
                                    onChange={set('address')}
                                    placeholder="ที่อยู่ปัจจุบันของพนักงาน"
                                />
                            ) : (
                                <p className="text-[0.95rem] text-white/88 leading-relaxed">
                                    {employee.applicants?.current_address || '—'}
                                </p>
                            )}
                        </div>

                        {/* Lat/Long inputs (edit) or map preview (read).
                            Inline number fields keep the form short — most
                            HR users will paste from Google Maps right-click
                            "What's here?" which gives them a comma-separated
                            string they can split into the two boxes. */}
                        {isEditing ? (
                            <div className="space-y-2 pt-2 border-t border-white/8">
                                <p className="text-[0.72rem] font-bold text-white/55 uppercase tracking-widest">
                                    พิกัด GPS
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        className={inp}
                                        type="text"
                                        inputMode="decimal"
                                        value={form.home_latitude}
                                        onChange={set('home_latitude')}
                                        placeholder="Latitude (เช่น 13.756331)"
                                    />
                                    <input
                                        className={inp}
                                        type="text"
                                        inputMode="decimal"
                                        value={form.home_longitude}
                                        onChange={set('home_longitude')}
                                        placeholder="Longitude (เช่น 100.501765)"
                                    />
                                </div>
                                <input
                                    className={inp}
                                    type="text"
                                    value={form.home_location_label}
                                    onChange={set('home_location_label')}
                                    placeholder="ป้ายชื่อ (เช่น บ้าน / หอพัก / บ้านพ่อแม่)"
                                />
                                <input
                                    className={inp}
                                    type="text"
                                    value={form.home_location_note}
                                    onChange={set('home_location_note')}
                                    placeholder="หมายเหตุ (เช่น ตึก B ห้อง 502, ใกล้ปั๊ม PT)"
                                />
                                <p className="text-[0.7rem] text-white/45 leading-relaxed">
                                    💡 หาพิกัดได้โดยเปิด Google Maps → คลิกขวาที่จุด → คลิกตัวเลขที่ขึ้นมาเพื่อ copy
                                </p>
                            </div>
                        ) : (
                            (employee.home_latitude != null && employee.home_longitude != null) ? (
                                <div className="pt-2 border-t border-white/8">
                                    <p className="text-[0.72rem] font-bold text-white/55 uppercase tracking-widest mb-2">
                                        พิกัดบนแผนที่
                                    </p>
                                    <LocationSection
                                        latitude={Number(employee.home_latitude)}
                                        longitude={Number(employee.home_longitude)}
                                        label={employee.home_location_label ?? null}
                                        note={employee.home_location_note ?? null}
                                        updatedAt={employee.home_location_updated_at ?? null}
                                    />
                                </div>
                            ) : (
                                <div className="pt-2 border-t border-white/8 print:hidden">
                                    <LocationEmpty />
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* ── 4. Leave Statistics Chart ─────────────────────────────────── */}
            {/* Hidden on print — Recharts SVGs grayscale weirdly and
                eat ~30% of the page; the numeric balances are already
                in the leave history snapshot below if needed. */}
            <div style={glass} className="p-4 shadow-xl print:hidden">
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
            {/* Hidden on print — the filter + pagination chrome doesn't
                make sense on paper, and the full history can run for
                pages. The hire-date + tenure on the hero card already
                give HR enough signal for a file copy. */}
            <div style={glass} className="p-4 shadow-xl print:hidden">
                <SHead icon={Calendar} label="ประวัติใบลาทั้งหมด" />
                {recentLeaves.length === 0 ? (
                    <p className="text-white/65 text-[0.95rem] text-center py-8">ยังไม่มีประวัติใบลา</p>
                ) : (
                    <LeaveHistory leaves={recentLeaves} />
                )}
            </div>

            {/* ── 5b. Employment contracts (HR-only — RLS enforces this on
                the server too, but we hide the card client-side so non-HR
                viewers don't even see the empty state). Hidden in print
                because the contract files themselves are big and live as
                separate PDFs that HR exports individually. ───────────── */}
            {/* canEdit gates the upload form + per-row delete button.
                Following the user's request: even HR can only upload
                while in profile edit mode — keeps the read view tidy
                and avoids accidental clicks on the green button. */}
            {isHrAdmin && (
                <div className="print:hidden">
                    <ContractsCard
                        employeeId={id}
                        contracts={contracts}
                        canEdit={isEditing}
                    />
                </div>
            )}

            {/* ── 5c. Salary slips — gated by can_manage_payroll flag.
                Decoupled from isHrAdmin: HR Manager (มด) lands on this
                page fine, but the salary card is invisible because she
                doesn't have payroll permission. Hidden in print too —
                slips are exported via the dedicated download flow, not
                bundled into the profile PDF. ─────────────────────────── */}
            {canViewPayroll && (
                <SalarySlipsCard
                    employeeId={id}
                    slips={salarySlips}
                    canEdit={isEditing}
                />
            )}

            {/* ── 6. Danger Zone (hr_admin only) ───────────────────────────── */}
            {isHrAdmin && (
                <div className="print:hidden" style={{
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

            {/* Profile photo crop modal (mounted at root so it overlays) */}
            {cropSrc && (
                <ImageCropModal
                    imageSrc={cropSrc}
                    open={true}
                    onClose={() => setCropSrc(null)}
                    onCropComplete={handleCropped}
                    aspectRatio={1}
                />
            )}
        </div>
    )
}

/**
 * EditField — labelled wrapper for an editable form control. Used inside
 * the amber-tinted "editable" card so HR sees a clear label above each
 * input/select instead of guessing what each box represents.
 */
function EditField({
    label, icon: Icon, children,
}: {
    label: string
    icon: LucideIcon
    children: React.ReactNode
}) {
    return (
        <label className="flex flex-col gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-amber-200/85 font-bold uppercase tracking-wider text-[10px]">
                <Icon size={11} />
                {label}
            </span>
            {children}
        </label>
    )
}
