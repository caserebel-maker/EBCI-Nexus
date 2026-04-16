'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, User, Briefcase, Phone, Mail, MapPin,
    Building, Calendar, Shield, AlertCircle, CheckCircle2, Save, UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createEmployee, CreateEmployeePayload } from './actions'
import { EMPLOYEE_LEVELS } from '@/config/employee-levels'

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderTop: '1px solid rgba(255,255,255,0.30)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
}

const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-[1.05rem] text-white placeholder-white/30 focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors"
const selectClass = "w-full bg-[#1a0608] border border-white/20 rounded-xl px-4 py-2.5 text-[1.05rem] text-white focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors appearance-none"
const labelClass = "block text-[0.85rem] font-semibold text-white/60 mb-1.5 uppercase tracking-wide"
const requiredMark = <span className="text-[#ad5f6c] ml-0.5">*</span>

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    departments: string[]
    supervisors: { id: string; name: string }[]
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-white/10">
            <div className="h-8 w-8 rounded-lg bg-[#882136]/50 flex items-center justify-center text-[#ad5f6c]">
                <Icon size={16} />
            </div>
            <h2 className="text-[1.05rem] font-semibold text-white tracking-wide">{label}</h2>
        </div>
    )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export function NewEmployeeForm({ departments, supervisors }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const [form, setForm] = useState<CreateEmployeePayload & { supervisor: string }>({
        employee_code: '',
        first_name_th: '',
        last_name_th: '',
        nickname: '',
        title: 'นาย',
        date_of_birth: '',
        position: '',
        department: departments[0] ?? '',
        employment_type: 'full-time',
        start_date: '',
        status: 'active',
        email: '',
        phone: '',
        address: '',
        emergency_name: '',
        emergency_phone: '',
        supervisor: '',
        approval_level: 1,
    })

    const set = (field: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            setForm(prev => ({ ...prev, [field]: e.target.value }))

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        if (type === 'error') setTimeout(() => setToast(null), 4000)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.employee_code || !form.first_name_th || !form.last_name_th || !form.position || !form.start_date) {
            showToast('error', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
            return
        }
        startTransition(async () => {
            const result = await createEmployee({
                employee_code: form.employee_code,
                first_name_th: form.first_name_th,
                last_name_th: form.last_name_th,
                nickname: form.nickname,
                title: form.title,
                date_of_birth: form.date_of_birth,
                position: form.position,
                department: form.department,
                employment_type: form.employment_type,
                start_date: form.start_date,
                status: form.status,
                email: form.email,
                phone: form.phone,
                address: form.address,
                emergency_name: form.emergency_name,
                emergency_phone: form.emergency_phone,
                approval_level: form.approval_level,
            })
            if (result.error) {
                showToast('error', `เกิดข้อผิดพลาด: ${result.error}`)
            } else {
                showToast('success', result.emailSent
                    ? 'เพิ่มพนักงานสำเร็จ ส่งอีเมลตั้งรหัสผ่านแล้ว'
                    : 'เพิ่มพนักงานสำเร็จ')
                setTimeout(() => router.push('/dashboard/employees'), 1800)
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Toast */}
            {toast && (
                <div className={cn(
                    'fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-[1.05rem] font-semibold transition-all',
                    toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                )}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {toast.msg}
                </div>
            )}

            {/* Breadcrumb + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[0.95rem] text-white/70">
                    <Link href="/dashboard/employees" className="hover:text-white transition-colors">พนักงาน</Link>
                    <span>/</span>
                    <span className="text-white font-medium">เพิ่มพนักงานใหม่</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/employees"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[0.95rem] font-semibold bg-white/10 hover:bg-white/15 text-white/70 hover:text-white border border-white/15 transition-all"
                    >
                        <ArrowLeft size={15} /> ยกเลิก
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[0.95rem] font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-500/40 transition-all disabled:opacity-60"
                    >
                        <Save size={15} /> {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>

            {/* Page title */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                    <UserPlus size={20} />
                </div>
                <div>
                    <h1 className="text-[1.4rem] font-bold text-white">เพิ่มพนักงานใหม่</h1>
                    <p className="text-[0.95rem] text-white/45">กรอกข้อมูลพนักงานเพื่อสร้างโปรไฟล์ในระบบ</p>
                </div>
            </div>

            {/* ── ข้อมูลส่วนตัว ── */}
            <div style={cardStyle} className="p-6">
                <SectionHead icon={User} label="ข้อมูลส่วนตัว" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>คำนำหน้า</label>
                        <select className={selectClass} value={form.title} onChange={set('title')}>
                            <option value="นาย">นาย</option>
                            <option value="นาง">นาง</option>
                            <option value="นางสาว">นางสาว</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>ชื่อ (ภาษาไทย) {requiredMark}</label>
                        <input className={inputClass} value={form.first_name_th} onChange={set('first_name_th')} placeholder="ชื่อ" required />
                    </div>
                    <div>
                        <label className={labelClass}>นามสกุล (ภาษาไทย) {requiredMark}</label>
                        <input className={inputClass} value={form.last_name_th} onChange={set('last_name_th')} placeholder="นามสกุล" required />
                    </div>
                    <div>
                        <label className={labelClass}>ชื่อเล่น</label>
                        <input className={inputClass} value={form.nickname ?? ''} onChange={set('nickname')} placeholder="เช่น ก้อง, แนน" />
                    </div>
                    <div>
                        <label className={labelClass}>วันเกิด</label>
                        <input type="date" className={inputClass} value={form.date_of_birth} onChange={set('date_of_birth')} />
                    </div>
                </div>
            </div>

            {/* ── ข้อมูลการทำงาน ── */}
            <div style={cardStyle} className="p-6">
                <SectionHead icon={Briefcase} label="ข้อมูลการทำงาน" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>รหัสพนักงาน {requiredMark}</label>
                        <input className={inputClass} value={form.employee_code} onChange={set('employee_code')} placeholder="เช่น EMP-001" required />
                    </div>
                    <div>
                        <label className={labelClass}>ตำแหน่ง {requiredMark}</label>
                        <input className={inputClass} value={form.position} onChange={set('position')} placeholder="เช่น HR Officer" required />
                    </div>
                    <div>
                        <label className={labelClass}>แผนก</label>
                        <select className={selectClass} value={form.department} onChange={set('department')}>
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                            <option value="Unassigned">ยังไม่กำหนด</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>ประเภทพนักงาน</label>
                        <select className={selectClass} value={form.employment_type} onChange={set('employment_type')}>
                            <option value="full-time">ประจำ (Full-time)</option>
                            <option value="contract">สัญญาจ้าง (Contract)</option>
                            <option value="probation">ทดลองงาน (Probation)</option>
                            <option value="part-time">นอกเวลา (Part-time)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>วันที่เริ่มงาน {requiredMark}</label>
                        <input type="date" className={inputClass} value={form.start_date} onChange={set('start_date')} required />
                    </div>
                    <div>
                        <label className={labelClass}>ผู้บังคับบัญชา</label>
                        <select className={selectClass} value={form.supervisor} onChange={set('supervisor')}>
                            <option value="">— ไม่ระบุ —</option>
                            {supervisors.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>สถานะ</label>
                        <select className={selectClass} value={form.status} onChange={set('status')}>
                            <option value="active">ปฏิบัติงาน</option>
                            <option value="inactive">ลาออก / พักงาน</option>
                            <option value="probation">ทดลองงาน</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>ระดับพนักงาน (Level)</label>
                        <select
                            className={selectClass}
                            value={form.approval_level ?? 1}
                            onChange={(e) => setForm(prev => ({ ...prev, approval_level: Number(e.target.value) }))}
                        >
                            {Object.entries(EMPLOYEE_LEVELS).map(([lvl, { label }]) => (
                                <option key={lvl} value={lvl}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── ข้อมูลติดต่อ ── */}
            <div style={cardStyle} className="p-6">
                <SectionHead icon={Phone} label="ข้อมูลติดต่อ" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>อีเมล</label>
                        <input type="email" className={inputClass} value={form.email} onChange={set('email')} placeholder="email@company.com" />
                    </div>
                    <div>
                        <label className={labelClass}>เบอร์โทรศัพท์</label>
                        <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="08x-xxx-xxxx" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>ที่อยู่</label>
                        <textarea
                            className={cn(inputClass, 'min-h-[80px] resize-none')}
                            value={form.address}
                            onChange={set('address')}
                            placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>ชื่อผู้ติดต่อฉุกเฉิน</label>
                        <input className={inputClass} value={form.emergency_name} onChange={set('emergency_name')} placeholder="ชื่อ-นามสกุล" />
                    </div>
                    <div>
                        <label className={labelClass}>เบอร์ผู้ติดต่อฉุกเฉิน</label>
                        <input className={inputClass} value={form.emergency_phone} onChange={set('emergency_phone')} placeholder="08x-xxx-xxxx" />
                    </div>
                </div>
            </div>

            {/* Bottom save/cancel */}
            <div className="flex justify-end gap-3 pt-2">
                <Link
                    href="/dashboard/employees"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[1rem] font-semibold bg-white/10 hover:bg-white/15 text-white/70 hover:text-white border border-white/15 transition-all"
                >
                    <ArrowLeft size={16} /> ยกเลิก
                </Link>
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[1rem] font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-500/40 transition-all disabled:opacity-60"
                >
                    <Save size={16} /> {isPending ? 'กำลังบันทึก...' : 'บันทึกพนักงานใหม่'}
                </button>
            </div>
        </form>
    )
}
