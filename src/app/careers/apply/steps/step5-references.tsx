'use client'

import { PhoneCall, Users2, Plus, Trash2, ShieldCheck, Info, FileSignature } from 'lucide-react'
import type { ApplyFormValues, ReferenceRow } from '../form-types'
import {
    TextField, TextareaField, FormSection, YesNoField, DateField, SelectField,
    CheckboxField,
} from '../fields'
import { SignaturePad } from '../signature-pad'

interface Props {
    values: ApplyFormValues
    onChange: (v: ApplyFormValues) => void
}

const HEARD_FROM_OPTIONS = [
    { value: '', label: '— เลือก —' },
    { value: 'เว็บบริษัท', label: 'เว็บบริษัท' },
    { value: 'JobsDB', label: 'JobsDB' },
    { value: 'Facebook', label: 'Facebook' },
    { value: 'LinkedIn', label: 'LinkedIn' },
    { value: 'คนแนะนำ', label: 'คนแนะนำ' },
    { value: 'เดินเข้ามา', label: 'เดินเข้ามาเอง' },
    { value: 'อื่นๆ', label: 'อื่น ๆ (ระบุ)' },
]

// Full PDPA consent text — sourced from the paper application form.
const PDPA_TEXT = `ข้าพเจ้ายินยอมให้บริษัท EBCI Trade จำกัด ("บริษัท") เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลที่ข้าพเจ้าได้ให้ไว้ในใบสมัครนี้ เพื่อวัตถุประสงค์ในการพิจารณารับเข้าทำงาน การตรวจสอบประวัติ การติดต่อสื่อสาร และการจัดเก็บเป็นข้อมูลสำหรับการจ้างงาน

ข้าพเจ้ารับทราบสิทธิภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ได้แก่ สิทธิในการเข้าถึง ขอสำเนา คัดค้าน ลบ เพิกถอนความยินยอม และร้องเรียนต่อคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล

ข้อมูลดังกล่าวจะถูกเก็บรักษาไว้ในระยะเวลาที่จำเป็นตามวัตถุประสงค์ของการพิจารณา และจะถูกทำลายเมื่อสิ้นสุดวัตถุประสงค์ดังกล่าวตามนโยบายการจัดเก็บข้อมูลของบริษัท

ข้าพเจ้ายินยอมและรับทราบข้อกำหนดข้างต้นโดยปราศจากการบังคับ`

export function Step5References({ values, onChange }: Props) {
    const set = <K extends keyof ApplyFormValues>(key: K, v: ApplyFormValues[K]) => {
        onChange({ ...values, [key]: v })
    }

    // ── References ─────────────────────────────────────────────────────
    const addReference = () => set('reference_persons', [
        ...values.reference_persons,
        { name: '', relation: '', occupation: '', phone: '', address: '' },
    ])
    const updateReference = (idx: number, patch: Partial<ReferenceRow>) => {
        set('reference_persons', values.reference_persons.map((r, i) => i === idx ? { ...r, ...patch } : r))
    }
    const removeReference = (idx: number) => {
        if (values.reference_persons.length <= 2) return // minimum 2 per spec
        set('reference_persons', values.reference_persons.filter((_, i) => i !== idx))
    }

    // PDPA check toggles the stored flag; the timestamp is stamped
    // server-side on submit (pdpa_consented_at) so we only mirror the bool.
    const handlePdpa = (v: boolean) => set('pdpa_consented', v)

    return (
        <div className="space-y-8">
            {/* 5.1 Emergency contact */}
            <FormSection
                title="ติดต่อฉุกเฉิน"
                description="บุคคลที่ HR สามารถติดต่อได้ในกรณีจำเป็น"
                icon={<PhoneCall size={15} />}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField label="ชื่อ-สกุล" required value={values.emergency_contact_name} onChange={v => set('emergency_contact_name', v)} />
                    <TextField label="เกี่ยวข้องเป็น" required value={values.emergency_contact_relation} onChange={v => set('emergency_contact_relation', v)} placeholder="เช่น พ่อ / พี่ชาย / คู่สมรส" />
                    <TextField label="เบอร์โทร" required type="tel" value={values.emergency_contact_phone} onChange={v => set('emergency_contact_phone', v)} />
                    <TextField label="ที่อยู่" value={values.emergency_contact_address} onChange={v => set('emergency_contact_address', v)} />
                </div>
            </FormSection>

            {/* 5.2 References (min 2) */}
            <FormSection
                title="บุคคลอ้างอิง"
                description="กรอกอย่างน้อย 2 ท่านที่รู้จักและเห็นการทำงานของคุณ (ไม่ใช่ญาติ)"
                icon={<Users2 size={15} />}
            >
                <div className="space-y-3">
                    {values.reference_persons.map((r, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/55">ท่านที่ {i + 1}</p>
                                {values.reference_persons.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeReference(i)}
                                        className="h-7 w-7 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-200 flex items-center justify-center"
                                        aria-label="ลบบุคคลอ้างอิง"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <TextField label="ชื่อ-สกุล" required value={r.name} onChange={v => updateReference(i, { name: v })} />
                                <TextField label="เกี่ยวข้องกันอย่างไร" value={r.relation} onChange={v => updateReference(i, { relation: v })} placeholder="เช่น อดีตหัวหน้างาน" />
                                <TextField label="อาชีพ/ตำแหน่ง" value={r.occupation} onChange={v => updateReference(i, { occupation: v })} />
                                <TextField label="เบอร์โทร" required type="tel" value={r.phone} onChange={v => updateReference(i, { phone: v })} />
                            </div>
                            <TextField label="ที่อยู่/สถานที่ติดต่อ" value={r.address} onChange={v => updateReference(i, { address: v })} />
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addReference}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
                >
                    <Plus size={14} /> เพิ่มบุคคลอ้างอิง
                </button>
            </FormSection>

            {/* 5.3 Additional info */}
            <FormSection
                title="ข้อมูลเพิ่มเติม"
                icon={<Info size={15} />}
            >
                <YesNoField
                    label="ยินยอมให้ตรวจสอบประวัติหรือไม่?"
                    value={values.allow_background_check}
                    onChange={v => set('allow_background_check', v)}
                />
                {values.allow_background_check === false && (
                    <TextareaField
                        label="เหตุผลที่ไม่ยินยอม"
                        rows={2}
                        value={values.background_check_reason}
                        onChange={v => set('background_check_reason', v)}
                    />
                )}

                <YesNoField
                    label="เคยสมัครงานกับ EBCI มาก่อนหรือไม่?"
                    value={values.applied_before}
                    onChange={v => set('applied_before', v)}
                />
                {values.applied_before === true && (
                    <TextField
                        label="วันที่สมัครครั้งก่อน (ถ้าจำได้)"
                        value={values.applied_before_date}
                        onChange={v => set('applied_before_date', v)}
                        placeholder="เช่น มกราคม 2568"
                    />
                )}

                <TextField
                    label="รู้จักพนักงาน EBCI ท่านใดหรือไม่"
                    value={values.knows_ebci_employees}
                    onChange={v => set('knows_ebci_employees', v)}
                    placeholder="ระบุชื่อ — แผนก (ถ้าทราบ)"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectField
                        label="ทราบข่าวการรับสมัครจาก"
                        value={values.heard_from}
                        onChange={v => set('heard_from', v)}
                        options={HEARD_FROM_OPTIONS}
                    />
                    {values.heard_from === 'อื่นๆ' && (
                        <TextField
                            label="โปรดระบุ"
                            value={values.heard_from_other}
                            onChange={v => set('heard_from_other', v)}
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DateField label="เริ่มงานได้วันที่" value={values.can_start_date} onChange={v => set('can_start_date', v)} />
                    <YesNoField
                        label="สนใจตำแหน่งอื่นหากไม่ได้ตำแหน่งที่สมัคร?"
                        value={values.consider_other_positions}
                        onChange={v => set('consider_other_positions', v)}
                    />
                </div>
            </FormSection>

            {/* 5.4 PDPA consent */}
            <FormSection
                title="ข้อตกลงและความยินยอม PDPA"
                icon={<ShieldCheck size={15} />}
            >
                <div
                    className="p-4 rounded-lg bg-black/30 border border-white/10 text-[13px] text-white/80 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap"
                    tabIndex={0}
                >
                    {PDPA_TEXT}
                </div>
                <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-300/30">
                    <CheckboxField
                        label={(
                            <span>
                                ข้าพเจ้ายินยอมตามข้อตกลงข้างต้น <span className="text-red-300">*</span>
                            </span>
                        )}
                        checked={values.pdpa_consented}
                        onChange={handlePdpa}
                    />
                </div>
            </FormSection>

            {/* 5.5 Signature */}
            <FormSection
                title="ลายเซ็นดิจิทัล"
                description="เซ็นชื่อเพื่อยืนยันข้อมูลในใบสมัคร"
                icon={<FileSignature size={15} />}
            >
                <SignaturePad
                    value={values.signature_data}
                    onChange={v => set('signature_data', v)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <DateField label="วันที่เซ็น" value={values.signed_date} onChange={v => set('signed_date', v)} />
                    <TextField label="สถานที่เซ็น" value={values.signed_location} onChange={v => set('signed_location', v)} />
                </div>
            </FormSection>
        </div>
    )
}
