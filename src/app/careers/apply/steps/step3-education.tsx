'use client'

import { GraduationCap, Briefcase, FileText, Plus, Trash2 } from 'lucide-react'
import type { ApplyFormValues, EducationRow, ExperienceRow, OtherDocumentRow } from '../form-types'
import { TextField, TextareaField, FormSection, SelectField } from '../fields'
import { DocumentUpload } from '../document-upload'

interface Props {
    values: ApplyFormValues
    onChange: (v: ApplyFormValues) => void
    applicationId: string | null
    referenceCode: string | null
}

const EDUCATION_LEVELS = [
    { value: 'มัธยมปลาย', label: 'มัธยมปลาย / ม.6' },
    { value: 'ปวช.', label: 'ปวช.' },
    { value: 'ปวส.', label: 'ปวส.' },
    { value: 'ปริญญาตรี', label: 'ปริญญาตรี' },
    { value: 'ปริญญาโท', label: 'ปริญญาโท' },
    { value: 'ปริญญาเอก', label: 'ปริญญาเอก' },
    { value: 'อื่นๆ', label: 'อื่น ๆ' },
]

export function Step3Education({ values, onChange, applicationId, referenceCode }: Props) {
    const set = <K extends keyof ApplyFormValues>(key: K, v: ApplyFormValues[K]) => {
        onChange({ ...values, [key]: v })
    }

    // ── Education ──────────────────────────────────────────────────────
    const addEducation = () => set('education', [
        ...values.education,
        { level: 'ปริญญาตรี', institution: '', major: '', start_year: '', end_year: '' },
    ])
    const updateEducation = (idx: number, patch: Partial<EducationRow>) => {
        set('education', values.education.map((e, i) => i === idx ? { ...e, ...patch } : e))
    }
    const removeEducation = (idx: number) => {
        if (values.education.length <= 1) return // keep at least one row
        set('education', values.education.filter((_, i) => i !== idx))
    }

    // ── Experience ─────────────────────────────────────────────────────
    const addExperience = () => set('work_experience', [
        ...values.work_experience,
        { workplace: '', position: '', start_date: '', end_date: '', salary: '', description: '', reason_leaving: '' },
    ])
    const updateExperience = (idx: number, patch: Partial<ExperienceRow>) => {
        set('work_experience', values.work_experience.map((e, i) => i === idx ? { ...e, ...patch } : e))
    }
    const removeExperience = (idx: number) => {
        set('work_experience', values.work_experience.filter((_, i) => i !== idx))
    }

    // ── Other documents (append-on-upload) ────────────────────────────
    const handleOtherUploaded = (row: OtherDocumentRow) => {
        // The /upload route for kind='other' has already appended to the
        // jsonb column server-side. We mirror the change in form state so
        // the UI renders the updated list without a refetch.
        set('other_documents', [...values.other_documents, row])
    }

    return (
        <div className="space-y-8">
            {/* 3.1 Education */}
            <FormSection
                title="การศึกษา"
                description="กรอกอย่างน้อย 1 ระดับ (จากต่ำสุดไปสูงสุด)"
                icon={<GraduationCap size={15} />}
            >
                <div className="space-y-3">
                    {values.education.map((e, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/55">ระดับที่ {i + 1}</p>
                                {values.education.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeEducation(i)}
                                        className="h-7 w-7 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-200 flex items-center justify-center"
                                        aria-label="ลบระดับการศึกษา"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                <div className="sm:col-span-1">
                                    <SelectField
                                        label="ระดับ"
                                        required
                                        value={e.level}
                                        onChange={v => updateEducation(i, { level: v })}
                                        options={EDUCATION_LEVELS}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <TextField label="สถาบัน" required value={e.institution} onChange={v => updateEducation(i, { institution: v })} />
                                </div>
                                <div className="sm:col-span-2">
                                    <TextField label="สาขาวิชา / วุฒิ" value={e.major} onChange={v => updateEducation(i, { major: v })} />
                                </div>
                                <TextField label="ปีที่เข้า" value={e.start_year} onChange={v => updateEducation(i, { start_year: v })} placeholder="พ.ศ." />
                                <TextField label="ปีที่จบ" value={e.end_year} onChange={v => updateEducation(i, { end_year: v })} placeholder="พ.ศ." />
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addEducation}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
                >
                    <Plus size={14} />
                    เพิ่มระดับการศึกษา
                </button>
            </FormSection>

            {/* 3.2 Work experience */}
            <FormSection
                title="ประสบการณ์ทำงาน"
                description="เรียงจากล่าสุดไปเก่าสุด (ถ้าจบใหม่สามารถข้ามได้)"
                icon={<Briefcase size={15} />}
            >
                {values.work_experience.length === 0 && (
                    <p className="text-sm text-white/55 italic">ยังไม่มีประสบการณ์ทำงาน — กดปุ่มด้านล่างเพื่อเพิ่ม</p>
                )}
                <div className="space-y-3">
                    {values.work_experience.map((e, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/55">ประสบการณ์ที่ {i + 1}</p>
                                <button
                                    type="button"
                                    onClick={() => removeExperience(i)}
                                    className="h-7 w-7 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-200 flex items-center justify-center"
                                    aria-label="ลบประสบการณ์"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <TextField label="บริษัท / สถานที่ทำงาน" required value={e.workplace} onChange={v => updateExperience(i, { workplace: v })} />
                                <TextField label="ตำแหน่ง" required value={e.position} onChange={v => updateExperience(i, { position: v })} />
                                <TextField label="เริ่มงาน (YYYY-MM)" value={e.start_date} onChange={v => updateExperience(i, { start_date: v })} placeholder="2022-01" />
                                <TextField label="ออก (YYYY-MM หรือ 'ปัจจุบัน')" value={e.end_date} onChange={v => updateExperience(i, { end_date: v })} />
                                <TextField label="เงินเดือนสุดท้าย (บาท)" value={e.salary} onChange={v => updateExperience(i, { salary: v })} />
                                <TextField label="เหตุผลที่ออก" value={e.reason_leaving} onChange={v => updateExperience(i, { reason_leaving: v })} />
                            </div>
                            <TextareaField
                                label="ลักษณะงานที่รับผิดชอบ"
                                rows={2}
                                value={e.description}
                                onChange={v => updateExperience(i, { description: v })}
                            />
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addExperience}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
                >
                    <Plus size={14} />
                    เพิ่มประสบการณ์
                </button>
            </FormSection>

            {/* 3.3 Documents */}
            <FormSection
                title="เอกสารแนบ"
                description="อัปโหลดเอกสารประกอบใบสมัคร · ไฟล์ละไม่เกิน 10 MB"
                icon={<FileText size={15} />}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DocumentUpload
                        label="CV / Resume"
                        required
                        description="PDF หรือ DOC"
                        kind="cv"
                        currentUrl={values.cv_url}
                        applicationId={applicationId}
                        referenceCode={referenceCode}
                        onUploaded={url => set('cv_url', url)}
                        onCleared={() => set('cv_url', null)}
                    />
                    <DocumentUpload
                        label="Transcript / ใบแสดงผลการเรียน"
                        description="PDF"
                        kind="transcript"
                        currentUrl={values.transcript_url}
                        applicationId={applicationId}
                        referenceCode={referenceCode}
                        onUploaded={url => set('transcript_url', url)}
                        onCleared={() => set('transcript_url', null)}
                    />
                    <DocumentUpload
                        label="สำเนาบัตรประชาชน"
                        description="ภาพหรือ PDF"
                        kind="id_card_copy"
                        currentUrl={values.id_card_copy_url}
                        applicationId={applicationId}
                        referenceCode={referenceCode}
                        onUploaded={url => set('id_card_copy_url', url)}
                        onCleared={() => set('id_card_copy_url', null)}
                    />
                    <DocumentUpload
                        label="สำเนาทะเบียนบ้าน"
                        description="ภาพหรือ PDF"
                        kind="house_registration"
                        currentUrl={values.house_registration_url}
                        applicationId={applicationId}
                        referenceCode={referenceCode}
                        onUploaded={url => set('house_registration_url', url)}
                        onCleared={() => set('house_registration_url', null)}
                    />
                </div>

                <div className="mt-3">
                    <OtherDocumentsList
                        rows={values.other_documents}
                        applicationId={applicationId}
                        referenceCode={referenceCode}
                        onUploaded={handleOtherUploaded}
                    />
                </div>
            </FormSection>
        </div>
    )
}

// ── Other-documents section (append-only) ────────────────────────────────
function OtherDocumentsList({
    rows, applicationId, referenceCode, onUploaded,
}: {
    rows: OtherDocumentRow[]
    applicationId: string | null
    referenceCode: string | null
    onUploaded: (row: OtherDocumentRow) => void
}) {
    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/55">เอกสารอื่น ๆ (ถ้ามี)</p>
            {rows.length > 0 && (
                <ul className="space-y-1.5">
                    {rows.map((r, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                            <FileText size={13} className="text-white/45 shrink-0" />
                            <span className="flex-1 truncate">{r.name}</span>
                            {r.url && (
                                <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-amber-200 hover:text-amber-100"
                                >
                                    เปิดดู
                                </a>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <DocumentUpload
                label="เพิ่มเอกสารอื่น"
                kind="other"
                currentUrl={null}
                applicationId={applicationId}
                referenceCode={referenceCode}
                onUploaded={url => {
                    // Build a minimal local row matching what the server wrote
                    onUploaded({
                        name: `เอกสาร #${rows.length + 1}`,
                        path: '',
                        url,
                        kind: 'other',
                        uploaded_at: new Date().toISOString(),
                    })
                }}
            />
        </div>
    )
}
