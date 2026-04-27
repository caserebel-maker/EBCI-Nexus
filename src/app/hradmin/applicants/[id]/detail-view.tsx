'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Printer, Mail, Phone, Calendar, MapPin, Briefcase,
    User, Users2, Heart, IdCard, Home, GraduationCap, FileText,
    Languages, Sparkles, HeartPulse, PhoneCall, ShieldCheck,
    FileSignature, Car, Download, UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/hradmin/applicants/StatusBadge'
import { StatusDropdown } from '@/components/hradmin/applicants/StatusDropdown'
import { FilesList } from '@/components/hradmin/applicants/FilesList'
import { InterviewEvaluation, type SavedEvaluation } from '@/components/hradmin/applicants/InterviewEvaluation'
import { ReviewNotes } from '@/components/hradmin/applicants/ReviewNotes'
import { HireModal } from '@/components/hradmin/applicants/HireModal'

// ── Types ────────────────────────────────────────────────────────────────
// We keep everything as `unknown` pulled from the DB row and narrow at
// read sites. It's simpler than mirroring the 126-column schema.
type Row = Record<string, unknown>

interface Props {
    application: Row
    id: string
    refreshedFiles: {
        photo_url: string | null
        cv_url: string | null
        transcript_url: string | null
        id_card_copy_url: string | null
        house_registration_url: string | null
    }
    otherDocuments: Array<{ name?: string; url?: string | null }>
    savedEvaluation: SavedEvaluation | null
}

type TabKey = 'personal' | 'education' | 'skills'

export function ApplicantDetailView({
    application: a, id, refreshedFiles, otherDocuments, savedEvaluation,
}: Props) {
    const [tab, setTab] = useState<TabKey>('personal')
    const [hireOpen, setHireOpen] = useState(false)

    const fullName = `${str(a.first_name_th)} ${str(a.last_name_th)}`.trim()
        + (str(a.nickname) ? ` (${str(a.nickname)})` : '')
    const photoUrl = refreshedFiles.photo_url
    const status = (str(a.application_status) || 'submitted')

    // Hire button is hidden only on the two states where it makes no
    // sense: 'draft' (applicant hasn't even submitted yet) and
    // 'rejected' (HR already said no). Every other state — submitted,
    // reviewing, shortlisted, interview, hired — is fair game, since
    // sometimes HR meets a candidate offline and decides to hire on
    // the spot without walking through every status step.
    const canHire = status !== 'draft' && status !== 'rejected'

    return (
        <div className="max-w-5xl mx-auto space-y-5 pb-10">
            {/* Back + print row */}
            <div className="flex items-center justify-between gap-3 print:hidden">
                <Link
                    href="/hradmin/applicants"
                    className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm"
                >
                    <ArrowLeft size={14} />
                    กลับไปหน้ารายการ
                </Link>
                <div className="flex items-center gap-1.5">
                    {canHire && (
                        <button
                            type="button"
                            onClick={() => setHireOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold border border-emerald-400 shadow-lg shadow-emerald-500/30"
                            title="โอนข้อมูลใบสมัครไปสร้างพนักงานใหม่"
                        >
                            <UserPlus size={13} />
                            จ้างเข้าทำงาน
                        </button>
                    )}
                    <a
                        href={`/api/hradmin/applicants/${id}/download-zip`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/75 hover:text-white text-xs font-semibold border border-white/10"
                        title="ดาวน์โหลดเอกสารทั้งหมดเป็น ZIP"
                    >
                        <Download size={13} />
                        ดาวน์โหลด ZIP
                    </a>
                    <button
                        type="button"
                        // INP fix: double rAF so at least one paint cycle
                        // completes between the click and the print
                        // dialog opening — setTimeout(0) wasn't enough
                        // because window.print() still blocks paints.
                        onClick={() => {
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => window.print())
                            })
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/75 hover:text-white text-xs font-semibold border border-white/10"
                    >
                        <Printer size={13} />
                        พิมพ์
                    </button>
                </div>
            </div>

            {/* Hire modal — portal-mounted so it sits above the sticky header */}
            <HireModal
                open={hireOpen}
                onClose={() => setHireOpen(false)}
                applicant={{
                    id,
                    fullName: fullName || 'ไม่ระบุชื่อ',
                    referenceCode: str(a.reference_code) || '—',
                    positionApplied: str(a.position_applied) || null,
                    email: str(a.email) || null,
                    phone: str(a.phone_mobile) || null,
                    photoUrl,
                    dateOfBirth: str(a.date_of_birth) || null,
                    emergencyContactName: str(a.emergency_contact_name) || null,
                    emergencyContactPhone: str(a.emergency_contact_phone) || null,
                    canStartDate: str(a.can_start_date) || null,
                }}
            />

            {/* Sticky header card */}
            <header
                className="sticky top-0 z-20 rounded-2xl border border-white/10 p-4 sm:p-5 shadow-xl"
                style={{ background: 'rgba(21,4,10,0.92)', backdropFilter: 'blur(12px)' }}
            >
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <div className="h-[60px] w-[60px] rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
                        {photoUrl ? (
                            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/60 text-xl font-bold">
                                {(str(a.first_name_th)[0] ?? '?').toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-amber-200 font-mono text-[12px] tracking-wider">{str(a.reference_code)}</p>
                        <h1 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">{fullName || 'ไม่ระบุชื่อ'}</h1>
                        <p className="text-[12px] text-white/65 inline-flex items-center gap-1.5 mt-0.5 truncate">
                            <Briefcase size={11} />
                            {str(a.position_applied) || 'ไม่ระบุตำแหน่ง'}
                        </p>
                    </div>
                    <StatusDropdown
                        applicationId={id}
                        currentStatus={status}
                        applicantEmail={str(a.email) || null}
                    />
                </div>

                {/* Tab switcher */}
                <nav className="mt-4 flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/5">
                    {([
                        { key: 'personal',  label: 'ข้อมูลส่วนตัว',     icon: User },
                        { key: 'education', label: 'การศึกษา + เอกสาร', icon: GraduationCap },
                        { key: 'skills',    label: 'ทักษะ + อ้างอิง + การประเมิน', icon: Sparkles },
                    ] as const).map(t => {
                        const isOn = tab === t.key
                        const Icon = t.icon
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setTab(t.key)}
                                className={cn(
                                    'flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap',
                                    isOn ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40' : 'text-white/60 hover:text-white hover:bg-white/5',
                                )}
                            >
                                <Icon size={13} />
                                <span className="truncate">{t.label}</span>
                            </button>
                        )
                    })}
                </nav>
            </header>

            {/* Tab body */}
            <main className="space-y-5">
                {tab === 'personal' && <PersonalTab a={a} photoUrl={photoUrl} />}
                {tab === 'education' && (
                    <EducationTab
                        a={a}
                        refreshedFiles={refreshedFiles}
                        otherDocuments={otherDocuments}
                    />
                )}
                {tab === 'skills' && (
                    <SkillsTab a={a} applicationId={id} savedEvaluation={savedEvaluation} />
                )}
            </main>
        </div>
    )
}

// ── Tab 1: Personal ─────────────────────────────────────────────────────
function PersonalTab({ a, photoUrl }: { a: Row; photoUrl: string | null }) {
    return (
        <>
            <SectionCard title="ข้อมูลพื้นฐาน" icon={<User size={14} />}>
                <div className="flex items-start gap-4 flex-wrap">
                    {photoUrl && (
                        <div className="h-32 w-32 rounded-xl overflow-hidden bg-white/10 border border-white/15 shrink-0">
                            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                    )}
                    <div className="flex-1 min-w-[240px] grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        <Field label="คำนำหน้า" value={str(a.title_th)} />
                        <Field label="ชื่อ-สกุล (ไทย)" value={`${str(a.first_name_th)} ${str(a.last_name_th)}`.trim()} />
                        <Field label="First / Last name" value={`${str(a.first_name_en)} ${str(a.last_name_en)}`.trim()} />
                        <Field label="ชื่อเล่น" value={str(a.nickname)} />
                        <Field label="วันเกิด" value={str(a.date_of_birth)} />
                        <Field label="อายุ" value={num(a.age) !== null ? `${num(a.age)} ปี` : null} />
                        <Field label="สัญชาติ" value={str(a.nationality)} />
                        <Field label="เชื้อชาติ" value={str(a.ethnicity)} />
                        <Field label="ศาสนา" value={str(a.religion)} />
                        <Field label="ส่วนสูง" value={num(a.height_cm) !== null ? `${num(a.height_cm)} ซม.` : null} />
                        <Field label="น้ำหนัก" value={num(a.weight_kg) !== null ? `${num(a.weight_kg)} กก.` : null} />
                        <Field label="กรุ๊ปเลือด" value={str(a.blood_type)} />
                        <Field label="สถานภาพสมรส" value={str(a.marital_status)} />
                        <Field label="ภาวะทหาร" value={str(a.military_status)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="ตำแหน่งและช่องทางติดต่อ" icon={<Briefcase size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="ตำแหน่งที่ต้องการ" value={str(a.position_applied)} />
                    <Field label="เงินเดือนที่คาดหวัง" value={num(a.expected_salary) !== null ? `${Number(a.expected_salary).toLocaleString('th-TH')} บาท` : null} />
                    <Field label="Email" value={str(a.email)} icon={<Mail size={11} />} />
                    <Field label="เบอร์มือถือ" value={str(a.phone_mobile)} icon={<Phone size={11} />} />
                    <Field label="เบอร์บ้าน" value={str(a.phone_home)} icon={<Phone size={11} />} />
                    <Field label="เริ่มงานได้" value={str(a.can_start_date)} />
                </div>
            </SectionCard>

            <SectionCard title="บัตรประชาชน" icon={<IdCard size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                    <Field label="เลขบัตรประชาชน" value={str(a.id_card_number)} />
                    <Field label="วันออกบัตร" value={str(a.id_card_issued_date)} />
                    <Field label="วันหมดอายุ" value={str(a.id_card_expiry_date)} />
                </div>
            </SectionCard>

            <SectionCard title="ที่อยู่ตามบัตรประชาชน" icon={<MapPin size={14} />}>
                <AddressBlock
                    no={str(a.id_card_address_no)}
                    moo={str(a.id_card_address_moo)}
                    road={null}
                    subdistrict={str(a.id_card_address_subdistrict)}
                    district={str(a.id_card_address_district)}
                    province={str(a.id_card_address_province)}
                    postal={str(a.id_card_address_postal)}
                />
            </SectionCard>

            <SectionCard title="ที่อยู่ปัจจุบัน" icon={<Home size={14} />}>
                {bool(a.same_as_id_address) ? (
                    <p className="text-sm text-white/65 italic">เหมือนที่อยู่ตามบัตรประชาชน</p>
                ) : (
                    <AddressBlock
                        no={str(a.current_address_no)}
                        moo={str(a.current_address_moo)}
                        road={str(a.current_address_road)}
                        subdistrict={str(a.current_address_subdistrict)}
                        district={str(a.current_address_district)}
                        province={str(a.current_address_province)}
                        postal={str(a.current_address_postal)}
                    />
                )}
                <div className="mt-3"><Field label="อาศัยกับ" value={str(a.living_with)} /></div>
            </SectionCard>

            <SectionCard title="ครอบครัว" icon={<Users2 size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PersonBlock
                        title="บิดา"
                        name={str(a.father_name)}
                        age={num(a.father_age)}
                        status={str(a.father_status)}
                    />
                    <PersonBlock
                        title="มารดา"
                        name={str(a.mother_name)}
                        age={num(a.mother_age)}
                        status={str(a.mother_status)}
                    />
                </div>
                {str(a.marital_status) === 'สมรส' && (
                    <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold mb-2 inline-flex items-center gap-1.5">
                            <Heart size={11} /> คู่สมรส
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            <Field label="ชื่อ-สกุล" value={str(a.spouse_name)} />
                            <Field label="อาชีพ" value={str(a.spouse_occupation)} />
                            <Field label="ที่ทำงาน" value={str(a.spouse_workplace)} />
                            <Field label="ตำแหน่ง" value={str(a.spouse_position)} />
                            <Field label="เบอร์โทร" value={str(a.spouse_phone)} />
                        </div>
                    </div>
                )}
                <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold mb-2">บุตร</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <Field label="ทั้งหมด" value={num(a.children_count) !== null ? String(num(a.children_count)) : null} />
                        <Field label="ชาย" value={num(a.children_male) !== null ? String(num(a.children_male)) : null} />
                        <Field label="หญิง" value={num(a.children_female) !== null ? String(num(a.children_female)) : null} />
                        <Field label="ยังไม่เรียน" value={num(a.children_not_in_school) !== null ? String(num(a.children_not_in_school)) : null} />
                        <Field label="กำลังเรียน" value={num(a.children_studying) !== null ? String(num(a.children_studying)) : null} />
                    </div>
                    <div className="mt-2"><Field label="ชั้นสูงสุดของบุตร" value={str(a.children_school_level)} /></div>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold mb-2">พี่น้อง</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Field label="ทั้งหมด" value={num(a.siblings_total) !== null ? String(num(a.siblings_total)) : null} />
                        <Field label="ชาย" value={num(a.siblings_male) !== null ? String(num(a.siblings_male)) : null} />
                        <Field label="หญิง" value={num(a.siblings_female) !== null ? String(num(a.siblings_female)) : null} />
                        <Field label="ผู้สมัครคนที่" value={num(a.applicant_birth_order) !== null ? String(num(a.applicant_birth_order)) : null} />
                    </div>
                    {Array.isArray(a.siblings_details) && a.siblings_details.length > 0 && (
                        <ul className="mt-3 space-y-1.5 text-sm text-white/80">
                            {(a.siblings_details as Array<Record<string, string>>).map((s, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs">
                                    <span className="text-white/40">#{i + 1}</span>
                                    <span className="font-medium">{s.name || '—'}</span>
                                    {s.age && <span className="text-white/50">อายุ {s.age}</span>}
                                    {s.occupation && <span className="text-white/50">· {s.occupation}</span>}
                                    {s.phone && <span className="text-white/50">· {s.phone}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </SectionCard>
        </>
    )
}

// ── Tab 2: Education + documents ────────────────────────────────────────
function EducationTab({
    a, refreshedFiles, otherDocuments,
}: {
    a: Row
    refreshedFiles: Props['refreshedFiles']
    otherDocuments: Array<{ name?: string; url?: string | null }>
}) {
    const education = Array.isArray(a.education) ? (a.education as Array<Record<string, string>>) : []
    const experience = Array.isArray(a.work_experience) ? (a.work_experience as Array<Record<string, string>>) : []

    return (
        <>
            <SectionCard title="การศึกษา" icon={<GraduationCap size={14} />}>
                {education.length === 0 ? (
                    <p className="text-sm text-white/55 italic">ไม่มีข้อมูลการศึกษา</p>
                ) : (
                    <ol className="space-y-3 relative">
                        {education.map((e, i) => (
                            <li key={i} className="relative pl-5 before:absolute before:left-1.5 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-amber-300">
                                <p className="text-white font-semibold">{e.level || '—'}</p>
                                <p className="text-sm text-white/75">{e.institution || '—'}</p>
                                {e.major && <p className="text-[12px] text-white/55">สาขา: {e.major}</p>}
                                {(e.start_year || e.end_year) && (
                                    <p className="text-[11px] text-white/45 tabular-nums">
                                        {e.start_year || '—'} → {e.end_year || '—'}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </SectionCard>

            <SectionCard title="ประสบการณ์ทำงาน" icon={<Briefcase size={14} />}>
                {experience.length === 0 ? (
                    <p className="text-sm text-white/55 italic">ไม่มีข้อมูลประสบการณ์</p>
                ) : (
                    <ol className="space-y-3">
                        {experience.map((e, i) => (
                            <li key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div>
                                        <p className="text-white font-semibold">{e.position || '—'}</p>
                                        <p className="text-sm text-white/70">{e.workplace || '—'}</p>
                                    </div>
                                    <p className="text-[11px] text-white/45 tabular-nums">
                                        {e.start_date || '—'} → {e.end_date || 'ปัจจุบัน'}
                                    </p>
                                </div>
                                {e.salary && <p className="text-[12px] text-white/55 mt-1.5">เงินเดือน: {e.salary}</p>}
                                {e.description && <p className="text-[13px] text-white/80 mt-1.5 whitespace-pre-wrap">{e.description}</p>}
                                {e.reason_leaving && (
                                    <p className="text-[11px] text-white/50 mt-1.5">เหตุผลออก: {e.reason_leaving}</p>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </SectionCard>

            <SectionCard title="เอกสารแนบ" icon={<FileText size={14} />}>
                <FilesList
                    rows={[
                        { label: 'CV / Resume',            url: refreshedFiles.cv_url },
                        { label: 'Transcript',             url: refreshedFiles.transcript_url },
                        { label: 'สำเนาบัตรประชาชน',        url: refreshedFiles.id_card_copy_url },
                        { label: 'สำเนาทะเบียนบ้าน',        url: refreshedFiles.house_registration_url },
                    ]}
                    otherDocuments={otherDocuments}
                />
            </SectionCard>
        </>
    )
}

// ── Tab 3: Skills + references + eval ───────────────────────────────────
function SkillsTab({
    a, applicationId, savedEvaluation,
}: {
    a: Row
    applicationId: string
    savedEvaluation: SavedEvaluation | null
}) {
    const languages = Array.isArray(a.languages) ? (a.languages as Array<Record<string, string>>) : []
    const vehicles = Array.isArray(a.vehicles) ? (a.vehicles as Array<Record<string, string>>) : []
    const references = Array.isArray(a.reference_persons) ? (a.reference_persons as Array<Record<string, string>>) : []

    return (
        <>
            <SectionCard title="ภาษา" icon={<Languages size={14} />}>
                {languages.length === 0 ? (
                    <p className="text-sm text-white/55 italic">ไม่มีข้อมูลภาษา</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-white/55">
                                <tr className="text-left">
                                    <th className="py-2 px-2 font-semibold">ภาษา</th>
                                    <th className="py-2 px-2 font-semibold">พูด</th>
                                    <th className="py-2 px-2 font-semibold">อ่าน</th>
                                    <th className="py-2 px-2 font-semibold">เขียน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {languages.map((l, i) => (
                                    <tr key={i} className="border-t border-white/5">
                                        <td className="py-2 px-2 text-white">{l.language || '—'}</td>
                                        <td className="py-2 px-2 text-white/80">{l.speaking || '—'}</td>
                                        <td className="py-2 px-2 text-white/80">{l.reading || '—'}</td>
                                        <td className="py-2 px-2 text-white/80">{l.writing || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>

            <SectionCard title="ความสามารถและทักษะ" icon={<Sparkles size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="ทักษะคอมพิวเตอร์" value={str(a.computer_skills)} />
                    <Field label="เครื่องใช้สำนักงาน" value={str(a.office_equipment_skills)} />
                    <Field label="ใบขับขี่รถยนต์" value={str(a.driving_license_car)} />
                    <Field label="ประเภทใบขับขี่รถยนต์" value={str(a.driving_license_car_type)} />
                    <Field label="ใบขับขี่มอเตอร์ไซค์" value={str(a.driving_license_motorcycle)} />
                    <Field label="ประเภทใบขับขี่มอไซ" value={str(a.driving_license_motorcycle_type)} />
                    <Field label="งานอดิเรก" value={str(a.hobbies)} />
                    <Field label="กีฬา" value={str(a.sports)} />
                    <Field label="ความรู้พิเศษ" value={str(a.special_knowledge)} />
                    <Field label="ทักษะอื่น ๆ" value={str(a.other_skills)} />
                </div>
            </SectionCard>

            <SectionCard title="การทำงานและยานพาหนะ" icon={<Car size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="ทำงานต่างจังหวัดได้" value={boolLabel(a.can_work_upcountry)} />
                    <Field label="หมายเหตุ" value={str(a.can_work_upcountry_note)} />
                    <Field label="มียานพาหนะ" value={boolLabel(a.has_vehicle)} />
                    {vehicles.length > 0 && (
                        <div className="sm:col-span-2">
                            <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1">ยานพาหนะ</p>
                            <ul className="text-sm text-white/85 space-y-1">
                                {vehicles.map((v, i) => (
                                    <li key={i} className="inline-flex items-center gap-2 text-[13px]">
                                        <span className="text-white/55">·</span>
                                        <span>{v.type || '—'}</span>
                                        {v.brand && <span className="text-white/50">· {v.brand}</span>}
                                        {v.model && <span className="text-white/50">· {v.model}</span>}
                                        {v.year && <span className="text-white/50">· ปี {v.year}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </SectionCard>

            <SectionCard title="สุขภาพและประวัติ" icon={<HeartPulse size={14} />}>
                <div className="space-y-3">
                    <HealthRow label="โรคประจำตัว" flag={a.has_chronic_disease} detail={str(a.chronic_disease_details)} />
                    <HealthRow label="เคยผ่าตัด" flag={a.had_surgery} detail={str(a.surgery_details)} />
                    <HealthRow label="ประวัติต้องโทษ" flag={a.has_criminal_record} detail={str(a.criminal_record_details)} />
                </div>
            </SectionCard>

            <SectionCard title="ติดต่อฉุกเฉิน" icon={<PhoneCall size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="ชื่อ-สกุล" value={str(a.emergency_contact_name)} />
                    <Field label="เกี่ยวข้องเป็น" value={str(a.emergency_contact_relation)} />
                    <Field label="เบอร์โทร" value={str(a.emergency_contact_phone)} />
                    <Field label="ที่อยู่" value={str(a.emergency_contact_address)} />
                </div>
            </SectionCard>

            <SectionCard title="บุคคลอ้างอิง" icon={<Users2 size={14} />}>
                {references.length === 0 ? (
                    <p className="text-sm text-white/55 italic">ไม่มีบุคคลอ้างอิง</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {references.map((r, i) => (
                            <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-white font-semibold">{r.name || '—'}</p>
                                {r.relation && <p className="text-[12px] text-white/55">{r.relation}</p>}
                                {r.occupation && <p className="text-[12px] text-white/55">{r.occupation}</p>}
                                {r.phone && <p className="text-[12px] text-white/70 mt-1">โทร {r.phone}</p>}
                                {r.address && <p className="text-[11px] text-white/50 mt-1">{r.address}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            <SectionCard title="ข้อมูลเพิ่มเติม" icon={<ShieldCheck size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="ยินยอมตรวจประวัติ" value={boolLabel(a.allow_background_check)} />
                    {bool(a.allow_background_check) === false && str(a.background_check_reason) && (
                        <Field label="เหตุผลที่ไม่ยินยอม" value={str(a.background_check_reason)} />
                    )}
                    <Field label="เคยสมัคร EBCI มาก่อน" value={boolLabel(a.applied_before)} />
                    {bool(a.applied_before) && str(a.applied_before_date) && (
                        <Field label="วันที่สมัครครั้งก่อน" value={str(a.applied_before_date)} />
                    )}
                    <Field label="รู้จักพนักงาน EBCI" value={str(a.knows_ebci_employees)} />
                    <Field label="ทราบข่าวจาก" value={str(a.heard_from) === 'อื่นๆ' ? str(a.heard_from_other) : str(a.heard_from)} />
                    <Field label="สนใจตำแหน่งอื่นถ้าไม่ได้" value={boolLabel(a.consider_other_positions)} />
                </div>
            </SectionCard>

            <SectionCard title="PDPA และลายเซ็น" icon={<FileSignature size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 items-start">
                    <Field label="ยินยอม PDPA" value={boolLabel(a.pdpa_consented)} />
                    <Field label="วันที่เซ็น" value={str(a.signed_date)} />
                    <Field label="สถานที่เซ็น" value={str(a.signed_location)} />
                </div>
                {str(a.signature_data) && (
                    <div className="mt-3">
                        <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">ลายเซ็น</p>
                        <div className="inline-block rounded-lg bg-white p-2 border border-white/15">
                            <img
                                src={str(a.signature_data)}
                                alt="ลายเซ็นผู้สมัคร"
                                className="max-h-24 max-w-full"
                            />
                        </div>
                    </div>
                )}
            </SectionCard>

            <InterviewEvaluation applicationId={applicationId} initial={savedEvaluation} />

            <ReviewNotes
                applicationId={applicationId}
                initialNotes={str(a.review_notes) || null}
            />
        </>
    )
}

// ── Small shared helpers ────────────────────────────────────────────────
function SectionCard({
    title, icon, children,
}: {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <h2 className="text-white font-bold text-[15px] inline-flex items-center gap-2 mb-3">
                {icon}
                {title}
            </h2>
            {children}
        </section>
    )
}

function Field({
    label, value, icon,
}: {
    label: string
    value: string | null | undefined
    icon?: React.ReactNode
}) {
    const shown = value && value.trim() ? value : null
    return (
        <div>
            <p className="text-[11px] uppercase tracking-wider text-white/50 font-bold">{label}</p>
            <p className={cn(
                'text-sm mt-0.5 inline-flex items-center gap-1.5',
                shown ? 'text-white' : 'text-white/35 italic',
            )}>
                {icon}
                {shown ?? '—'}
            </p>
        </div>
    )
}

function AddressBlock({
    no, moo, road, subdistrict, district, province, postal,
}: {
    no: string
    moo: string
    road: string | null
    subdistrict: string
    district: string
    province: string
    postal: string
}) {
    const parts = [
        no && `เลขที่ ${no}`,
        moo && `หมู่ ${moo}`,
        road && `ถ. ${road}`,
        subdistrict && `ต./แขวง ${subdistrict}`,
        district && `อ./เขต ${district}`,
        province && `จ. ${province}`,
        postal && `${postal}`,
    ].filter(Boolean)
    if (parts.length === 0) {
        return <p className="text-sm text-white/35 italic">— ยังไม่ได้กรอก</p>
    }
    return <p className="text-sm text-white/85 leading-relaxed">{parts.join(' · ')}</p>
}

function PersonBlock({
    title, name, age, status,
}: {
    title: string
    name: string
    age: number | null
    status: string
}) {
    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">{title}</p>
            <p className="text-white font-semibold">{name || '—'}</p>
            <p className="text-[12px] text-white/55 mt-0.5">
                {age !== null ? `อายุ ${age} ปี` : 'อายุ —'}
                <span className="mx-2 text-white/30">·</span>
                {status === 'deceased' ? 'เสียชีวิต' : status === 'alive' ? 'มีชีวิต' : '—'}
            </p>
        </div>
    )
}

function HealthRow({
    label, flag, detail,
}: {
    label: string
    flag: unknown
    detail: string
}) {
    const yes = flag === true
    const no = flag === false
    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white font-semibold">{label}</span>
                <span className={cn(
                    'text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md',
                    yes ? 'bg-red-500/30 text-red-100' : no ? 'bg-emerald-500/30 text-emerald-100' : 'bg-white/10 text-white/50',
                )}>
                    {yes ? 'มี' : no ? 'ไม่มี' : '—'}
                </span>
            </div>
            {yes && detail && (
                <p className="mt-2 text-[13px] text-white/75 whitespace-pre-wrap">{detail}</p>
            )}
        </div>
    )
}

// ── DB value coercion ───────────────────────────────────────────────────
function str(v: unknown): string {
    if (v === null || v === undefined) return ''
    return String(v)
}
function num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}
function bool(v: unknown): boolean | null {
    if (v === true || v === false) return v
    return null
}
function boolLabel(v: unknown): string | null {
    const b = bool(v)
    if (b === true) return 'ใช่'
    if (b === false) return 'ไม่'
    return null
}
