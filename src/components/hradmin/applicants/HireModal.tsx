'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { UserPlus, X, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { DEPARTMENTS } from '@/config/departments'

/**
 * "จ้างเข้าทำงาน" modal — promotes a job applicant into the employees
 * table. Most fields are inferred from the applicant row (name, photo,
 * contact, emergency contact, DOB) and the only thing HR has to type
 * is the bits that don't exist on the application form: employee code,
 * department, employment type, start date, optional probation end.
 *
 * The modal is portal-mounted so it can sit above the sticky applicant
 * header (z-index 80) without being clipped by overflow rules on the
 * detail page.
 */

interface ApplicantSnapshot {
    id: string
    fullName: string
    referenceCode: string
    positionApplied: string | null
    email: string | null
    phone: string | null
    photoUrl: string | null
    dateOfBirth: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    canStartDate: string | null
}

interface Props {
    open: boolean
    onClose: () => void
    applicant: ApplicantSnapshot
}

const EMPLOYMENT_TYPES: Array<{ value: string; label: string }> = [
    { value: 'fulltime',  label: 'พนักงานประจำ (Full-time)' },
    { value: 'parttime',  label: 'พนักงานชั่วคราว (Part-time)' },
    { value: 'contract',  label: 'สัญญาจ้าง (Contract)' },
    { value: 'intern',    label: 'ฝึกงาน (Intern)' },
    { value: 'probation', label: 'ทดลองงาน (Probation)' },
]

// Native dark-themed <select> on a glass panel still ships a near-black
// chevron — replicate the inline-SVG trick we use elsewhere so the
// dropdown affordance is visible.
const SEL_CHEVRON: React.CSSProperties = {
    backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '16px 16px',
    paddingRight: '34px',
    appearance: 'none',
    WebkitAppearance: 'none',
}

export function HireModal({ open, onClose, applicant }: Props) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    // Default start date — applicant's "can_start_date" if it exists
    // and is in the future, otherwise today (Bangkok-local).
    const todayKey = useMemo(() => {
        const d = new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }, [])
    const defaultStartDate = useMemo(() => {
        if (applicant.canStartDate && applicant.canStartDate >= todayKey) {
            return applicant.canStartDate
        }
        return todayKey
    }, [applicant.canStartDate, todayKey])

    const [employeeCode, setEmployeeCode] = useState('')
    const [department, setDepartment] = useState('')
    const [position, setPosition] = useState(applicant.positionApplied ?? '')
    const [employmentType, setEmploymentType] = useState<string>('probation')
    const [startDate, setStartDate] = useState(defaultStartDate)
    const [probationEndDate, setProbationEndDate] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset form whenever the modal re-opens for a different applicant.
    useEffect(() => {
        if (!open) return
        setEmployeeCode('')
        setDepartment('')
        setPosition(applicant.positionApplied ?? '')
        setEmploymentType('probation')
        setStartDate(defaultStartDate)
        setProbationEndDate('')
        setError(null)
        setSubmitting(false)
    }, [open, applicant.id, applicant.positionApplied, defaultStartDate])

    // Auto-suggest a probation end date 119 days after start
    // (Thai labour law's max no-severance probation window).
    function suggestProbationEnd() {
        if (!startDate) return
        const d = new Date(startDate + 'T00:00:00')
        d.setDate(d.getDate() + 119)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        setProbationEndDate(`${y}-${m}-${day}`)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return
        setError(null)

        if (!employeeCode.trim() || !department || !employmentType || !startDate || !position.trim()) {
            setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ')
            return
        }

        const confirmSubmit = window.confirm('ยืนยันที่จะจ้างเข้าทำงาน? หากดำเนินการต่อ พนักงานคนนี้จะถูกเพิ่มเข้าระบบฐานข้อมูล Nexus ทันที')
        if (!confirmSubmit) return

        setSubmitting(true)
        try {
            const res = await fetch(`/api/hradmin/applicants/${applicant.id}/hire`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_code: employeeCode.trim(),
                    department,
                    position: position.trim(),
                    employment_type: employmentType,
                    start_date: startDate,
                    probation_end_date: probationEndDate || null,
                }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(json.error ?? `Error ${res.status}`)
                return
            }
            // Success — go straight to the new employee's profile.
            const newId = json.employee?.id
            if (newId) {
                router.push(`/hradmin/employees/${newId}`)
            } else {
                router.refresh()
                onClose()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
        } finally {
            setSubmitting(false)
        }
    }

    if (!mounted || !open) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#15040a] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#15040a]">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 inline-flex items-center justify-center">
                            <UserPlus size={16} className="text-emerald-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base leading-tight">จ้างเข้าทำงาน</h2>
                            <p className="text-white/55 text-xs">โอนข้อมูลจากใบสมัคร · {applicant.referenceCode}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                        disabled={submitting}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Auto-copied summary */}
                <div className="px-5 pt-4">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                        <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-200/80 mb-2 inline-flex items-center gap-1.5">
                            <Check size={11} />
                            จะคัดลอกอัตโนมัติจากใบสมัคร
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
                                {applicant.photoUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={applicant.photoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-white/50">
                                        ?
                                    </div>
                                )}
                            </div>
                            <div className="text-sm text-white min-w-0">
                                <p className="font-bold truncate">{applicant.fullName}</p>
                                <p className="text-white/65 text-xs truncate">
                                    {applicant.email ?? '—'} · {applicant.phone ?? '—'}
                                </p>
                                <p className="text-white/40 text-[11px] mt-0.5">
                                    + รูปถ่าย, วันเกิด, ผู้ติดต่อฉุกเฉิน, ที่อยู่
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="รหัสพนักงาน *" hint="เช่น 060-01">
                            <input
                                type="text"
                                value={employeeCode}
                                onChange={(e) => setEmployeeCode(e.target.value)}
                                required
                                disabled={submitting}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                                placeholder="060-01"
                                autoFocus
                            />
                        </Field>

                        <Field label="แผนก *">
                            <select
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                required
                                disabled={submitting}
                                style={SEL_CHEVRON}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            >
                                <option value="" className="bg-[#15040a]">— เลือกแผนก —</option>
                                {DEPARTMENTS.map((d) => (
                                    <option key={d} value={d} className="bg-[#15040a]">{d}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="ตำแหน่ง *">
                            <input
                                type="text"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                required
                                disabled={submitting}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            />
                        </Field>

                        <Field label="ประเภทการจ้าง *">
                            <select
                                value={employmentType}
                                onChange={(e) => setEmploymentType(e.target.value)}
                                required
                                disabled={submitting}
                                style={SEL_CHEVRON}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            >
                                {EMPLOYMENT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value} className="bg-[#15040a]">{t.label}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="วันที่เริ่มงาน *">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                                disabled={submitting}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            />
                        </Field>

                        <Field
                            label="สิ้นสุดทดลองงาน"
                            hint={
                                <button
                                    type="button"
                                    onClick={suggestProbationEnd}
                                    disabled={submitting || !startDate}
                                    className="text-amber-300 hover:text-amber-200 text-[11px] underline-offset-2 hover:underline disabled:opacity-40"
                                >
                                    + 119 วัน
                                </button>
                            }
                        >
                            <input
                                type="date"
                                value={probationEndDate}
                                onChange={(e) => setProbationEndDate(e.target.value)}
                                disabled={submitting}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            />
                        </Field>
                    </div>

                    {/* What will happen note */}
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-[12px] text-amber-200 leading-relaxed">
                        <p className="font-bold text-amber-300 mb-1 inline-flex items-center gap-1.5">
                            <AlertTriangle size={13} />
                            คำเตือน: หากกดปุ่มนี้ จะเป็นการเพิ่มพนักงานคนนี้เข้าระบบฐานข้อมูล Nexus ทันที
                        </p>
                        <ol className="list-decimal list-inside space-y-0.5 text-amber-100/80 mt-1">
                            <li>สร้างพนักงานใหม่ ({employeeCode || 'รหัส'}) ในระบบ</li>
                            <li>โควต้าลาทุกประเภท seed อัตโนมัติ (ลาป่วย 30, ลากิจ 3, ลาพ่อแม่เสียชีวิต 5)</li>
                            <li>ใบสมัครอัปเดตเป็นสถานะ <b>hired</b></li>
                            <li>ส่งคุณไปหน้า profile พนักงานใหม่</li>
                        </ol>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200 inline-flex items-start gap-2 w-full">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Footer actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 h-11 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-sm font-semibold border border-white/10 disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 h-11 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-500/30"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    กำลังจ้าง…
                                </>
                            ) : (
                                <>
                                    <Check size={14} />
                                    ยืนยันจ้างเข้าทำงาน
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    )
}

function Field({
    label, hint, children,
}: {
    label: string
    hint?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <label className="block">
            <span className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">{label}</span>
                {hint && <span className="text-[11px] text-white/45">{hint}</span>}
            </span>
            {children}
        </label>
    )
}
