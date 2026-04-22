'use client'

import { Home, User, Users2, Heart, Plus, Trash2, IdCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApplyFormValues, SiblingRow } from '../form-types'
import {
    TextField, NumberField, DateField, RadioGroup, FormSection, CheckboxField, SelectField,
} from '../fields'

interface Props {
    values: ApplyFormValues
    onChange: (v: ApplyFormValues) => void
}

export function Step2Address({ values, onChange }: Props) {
    const set = <K extends keyof ApplyFormValues>(key: K, v: ApplyFormValues[K]) => {
        onChange({ ...values, [key]: v })
    }

    const isMale = values.title_th === 'นาย'
    const isMarried = values.marital_status === 'สมรส'

    // When "same as ID" toggles on, copy the ID address over current so the
    // server doesn't need to compute it; easier for admin display too.
    const handleSameAsToggle = (next: boolean) => {
        if (next) {
            onChange({
                ...values,
                same_as_id_address: true,
                current_address_no: values.id_card_address_no,
                current_address_moo: values.id_card_address_moo,
                current_address_road: '',
                current_address_subdistrict: values.id_card_address_subdistrict,
                current_address_district: values.id_card_address_district,
                current_address_province: values.id_card_address_province,
                current_address_postal: values.id_card_address_postal,
            })
        } else {
            set('same_as_id_address', false)
        }
    }

    // Siblings helpers
    const addSibling = () => set('siblings_details', [
        ...values.siblings_details,
        { name: '', age: '', occupation: '', phone: '' },
    ])
    const updateSibling = (idx: number, patch: Partial<SiblingRow>) => {
        const next = values.siblings_details.map((s, i) => i === idx ? { ...s, ...patch } : s)
        set('siblings_details', next)
    }
    const removeSibling = (idx: number) => {
        set('siblings_details', values.siblings_details.filter((_, i) => i !== idx))
    }

    return (
        <div className="space-y-8">
            {/* 2.1 ID-card address */}
            <FormSection
                title="ที่อยู่ตามบัตรประชาชน"
                description="กรอกตามที่ปรากฏบนบัตรประชาชน"
                icon={<IdCard size={15} />}
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <TextField label="เลขที่" required value={values.id_card_address_no} onChange={v => set('id_card_address_no', v)} />
                    <TextField label="หมู่" value={values.id_card_address_moo} onChange={v => set('id_card_address_moo', v)} />
                    <TextField label="ตำบล/แขวง" required value={values.id_card_address_subdistrict} onChange={v => set('id_card_address_subdistrict', v)} />
                    <TextField label="อำเภอ/เขต" required value={values.id_card_address_district} onChange={v => set('id_card_address_district', v)} />
                    <TextField label="จังหวัด" required value={values.id_card_address_province} onChange={v => set('id_card_address_province', v)} />
                    <TextField label="รหัสไปรษณีย์" required value={values.id_card_address_postal} onChange={v => set('id_card_address_postal', v)} placeholder="10xxx" />
                </div>
            </FormSection>

            {/* 2.2 Current address */}
            <FormSection
                title="ที่อยู่ปัจจุบัน"
                icon={<Home size={15} />}
            >
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <CheckboxField
                        label="เหมือนที่อยู่ตามบัตรประชาชน"
                        checked={values.same_as_id_address}
                        onChange={handleSameAsToggle}
                    />
                </div>
                {!values.same_as_id_address && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <TextField label="เลขที่" value={values.current_address_no} onChange={v => set('current_address_no', v)} />
                        <TextField label="หมู่" value={values.current_address_moo} onChange={v => set('current_address_moo', v)} />
                        <TextField label="ถนน" value={values.current_address_road} onChange={v => set('current_address_road', v)} />
                        <TextField label="ตำบล/แขวง" value={values.current_address_subdistrict} onChange={v => set('current_address_subdistrict', v)} />
                        <TextField label="อำเภอ/เขต" value={values.current_address_district} onChange={v => set('current_address_district', v)} />
                        <TextField label="จังหวัด" value={values.current_address_province} onChange={v => set('current_address_province', v)} />
                        <TextField label="รหัสไปรษณีย์" value={values.current_address_postal} onChange={v => set('current_address_postal', v)} />
                    </div>
                )}
                <RadioGroup
                    label="อาศัยกับ"
                    value={values.living_with}
                    onChange={v => set('living_with', v)}
                    options={['ครอบครัว', 'บ้านตัวเอง', 'บ้านเช่า', 'หอพัก']}
                />
            </FormSection>

            {/* 2.3 Personal info */}
            <FormSection
                title="ข้อมูลส่วนบุคคล"
                icon={<User size={15} />}
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <DateField label="วันเกิด" required value={values.date_of_birth} onChange={v => set('date_of_birth', v)} />
                    <TextField label="สัญชาติ" value={values.nationality} onChange={v => set('nationality', v)} />
                    <TextField label="เชื้อชาติ" value={values.ethnicity} onChange={v => set('ethnicity', v)} />
                    <TextField label="ศาสนา" value={values.religion} onChange={v => set('religion', v)} />
                    <NumberField label="ส่วนสูง (ซม.)" value={values.height_cm} onChange={v => set('height_cm', v)} min={0} max={250} />
                    <NumberField label="น้ำหนัก (กก.)" value={values.weight_kg} onChange={v => set('weight_kg', v)} min={0} max={300} />
                    <SelectField
                        label="กรุ๊ปเลือด"
                        value={values.blood_type}
                        onChange={v => set('blood_type', v)}
                        options={[
                            { value: '', label: '— เลือก —' },
                            { value: 'A', label: 'A' }, { value: 'B', label: 'B' },
                            { value: 'O', label: 'O' }, { value: 'AB', label: 'AB' },
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <TextField label="เลขบัตรประชาชน 13 หลัก" required value={values.id_card_number} onChange={v => set('id_card_number', v)} placeholder="X-XXXX-XXXXX-XX-X" />
                    <DateField label="วันออกบัตร" value={values.id_card_issued_date} onChange={v => set('id_card_issued_date', v)} />
                    <DateField label="วันหมดอายุ" value={values.id_card_expiry_date} onChange={v => set('id_card_expiry_date', v)} />
                </div>

                <RadioGroup
                    label="สถานภาพสมรส"
                    required
                    value={values.marital_status}
                    onChange={v => set('marital_status', v)}
                    options={['โสด', 'สมรส', 'สมรสไม่จดทะเบียน', 'หม้าย', 'แยกกันอยู่']}
                />

                {isMale && (
                    <RadioGroup
                        label="ภาวะทหาร"
                        value={values.military_status}
                        onChange={v => set('military_status', v)}
                        options={['ยกเว้น', 'ปลดเป็นทหารกองหนุน', 'ยังไม่ได้เกณฑ์']}
                    />
                )}
            </FormSection>

            {/* 2.4 Family */}
            <FormSection
                title="ประวัติครอบครัว"
                icon={<Users2 size={15} />}
            >
                {/* Father + mother */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/55">บิดา</p>
                        <TextField label="ชื่อ-สกุล" value={values.father_name} onChange={v => set('father_name', v)} />
                        <div className="grid grid-cols-2 gap-3">
                            <NumberField label="อายุ" value={values.father_age} onChange={v => set('father_age', v)} min={0} max={130} />
                            <RadioGroup
                                label="สถานะ"
                                value={values.father_status}
                                onChange={v => set('father_status', v)}
                                options={[
                                    { value: 'alive', label: 'มีชีวิต' },
                                    { value: 'deceased', label: 'เสียชีวิต' },
                                ]}
                            />
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/55">มารดา</p>
                        <TextField label="ชื่อ-สกุล" value={values.mother_name} onChange={v => set('mother_name', v)} />
                        <div className="grid grid-cols-2 gap-3">
                            <NumberField label="อายุ" value={values.mother_age} onChange={v => set('mother_age', v)} min={0} max={130} />
                            <RadioGroup
                                label="สถานะ"
                                value={values.mother_status}
                                onChange={v => set('mother_status', v)}
                                options={[
                                    { value: 'alive', label: 'มีชีวิต' },
                                    { value: 'deceased', label: 'เสียชีวิต' },
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Spouse */}
                {isMarried && (
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/55 inline-flex items-center gap-1.5">
                            <Heart size={12} /> คู่สมรส
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <TextField label="ชื่อ-สกุล" value={values.spouse_name} onChange={v => set('spouse_name', v)} />
                            <TextField label="อาชีพ" value={values.spouse_occupation} onChange={v => set('spouse_occupation', v)} />
                            <TextField label="ที่ทำงาน" value={values.spouse_workplace} onChange={v => set('spouse_workplace', v)} />
                            <TextField label="ตำแหน่ง" value={values.spouse_position} onChange={v => set('spouse_position', v)} />
                            <TextField label="เบอร์โทร" type="tel" value={values.spouse_phone} onChange={v => set('spouse_phone', v)} />
                        </div>
                    </div>
                )}

                {/* Children */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/55">บุตร</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <NumberField label="จำนวนทั้งหมด" value={values.children_count} onChange={v => set('children_count', v)} min={0} />
                        <NumberField label="ชาย" value={values.children_male} onChange={v => set('children_male', v)} min={0} />
                        <NumberField label="หญิง" value={values.children_female} onChange={v => set('children_female', v)} min={0} />
                        <NumberField label="ยังไม่เรียน" value={values.children_not_in_school} onChange={v => set('children_not_in_school', v)} min={0} />
                        <NumberField label="กำลังเรียน" value={values.children_studying} onChange={v => set('children_studying', v)} min={0} />
                    </div>
                    <TextField label="ชั้นสูงสุดของบุตร" value={values.children_school_level} onChange={v => set('children_school_level', v)} placeholder="เช่น ปริญญาตรี" />
                </div>

                {/* Siblings */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/55">พี่น้อง</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <NumberField label="ทั้งหมด" value={values.siblings_total} onChange={v => set('siblings_total', v)} min={0} />
                        <NumberField label="ชาย" value={values.siblings_male} onChange={v => set('siblings_male', v)} min={0} />
                        <NumberField label="หญิง" value={values.siblings_female} onChange={v => set('siblings_female', v)} min={0} />
                        <NumberField label="ผู้สมัครคนที่" value={values.applicant_birth_order} onChange={v => set('applicant_birth_order', v)} min={1} />
                    </div>

                    {values.siblings_details.length > 0 && (
                        <div className="space-y-2">
                            {values.siblings_details.map((s, i) => (
                                <div key={i} className="p-3 rounded-lg bg-black/25 border border-white/10 grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-12 sm:col-span-4">
                                        <TextField label={`พี่น้องคนที่ ${i + 1} · ชื่อ`} value={s.name} onChange={v => updateSibling(i, { name: v })} />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <TextField label="อายุ" value={s.age} onChange={v => updateSibling(i, { age: v })} />
                                    </div>
                                    <div className="col-span-8 sm:col-span-3">
                                        <TextField label="อาชีพ" value={s.occupation} onChange={v => updateSibling(i, { occupation: v })} />
                                    </div>
                                    <div className="col-span-10 sm:col-span-2">
                                        <TextField label="เบอร์" type="tel" value={s.phone} onChange={v => updateSibling(i, { phone: v })} />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <button
                                            type="button"
                                            onClick={() => removeSibling(i)}
                                            className={cn(
                                                'w-full h-11 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-200 inline-flex items-center justify-center',
                                            )}
                                            aria-label="ลบ"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={addSibling}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
                    >
                        <Plus size={14} />
                        เพิ่มพี่น้อง
                    </button>
                </div>
            </FormSection>
        </div>
    )
}

