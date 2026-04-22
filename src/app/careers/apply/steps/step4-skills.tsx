'use client'

import { Languages, Sparkles, Plane, HeartPulse, Car, Plus, Trash2 } from 'lucide-react'
import type { ApplyFormValues, LanguageRow, VehicleRow } from '../form-types'
import { TextField, NumberField, TextareaField, FormSection, YesNoField } from '../fields'

const LANGUAGE_LEVELS = ['ดีมาก', 'ดี', 'พอใช้']

interface Props {
    values: ApplyFormValues
    onChange: (v: ApplyFormValues) => void
}

export function Step4Skills({ values, onChange }: Props) {
    const set = <K extends keyof ApplyFormValues>(key: K, v: ApplyFormValues[K]) => {
        onChange({ ...values, [key]: v })
    }

    // ── Languages ──────────────────────────────────────────────────────
    const addLanguage = () => set('languages', [
        ...values.languages,
        { language: '', speaking: 'พอใช้', reading: 'พอใช้', writing: 'พอใช้' },
    ])
    const updateLanguage = (idx: number, patch: Partial<LanguageRow>) => {
        set('languages', values.languages.map((l, i) => i === idx ? { ...l, ...patch } : l))
    }
    const removeLanguage = (idx: number) => {
        set('languages', values.languages.filter((_, i) => i !== idx))
    }

    // ── Vehicles ───────────────────────────────────────────────────────
    const addVehicle = () => set('vehicles', [
        ...values.vehicles,
        { type: '', brand: '', model: '', year: '' },
    ])
    const updateVehicle = (idx: number, patch: Partial<VehicleRow>) => {
        set('vehicles', values.vehicles.map((v, i) => i === idx ? { ...v, ...patch } : v))
    }
    const removeVehicle = (idx: number) => {
        set('vehicles', values.vehicles.filter((_, i) => i !== idx))
    }

    return (
        <div className="space-y-8">
            {/* 4.1 Languages */}
            <FormSection
                title="ภาษา"
                description="เลือกระดับความสามารถทั้ง 3 ด้าน"
                icon={<Languages size={15} />}
            >
                <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm">
                        <thead className="text-white/55">
                            <tr className="text-left">
                                <th className="py-2 px-2 font-semibold w-[28%]">ภาษา</th>
                                <th className="py-2 px-2 font-semibold">พูด</th>
                                <th className="py-2 px-2 font-semibold">อ่าน</th>
                                <th className="py-2 px-2 font-semibold">เขียน</th>
                                <th className="py-2 px-2 font-semibold w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {values.languages.map((lang, i) => (
                                <tr key={i} className="border-t border-white/5">
                                    <td className="py-2 px-2">
                                        <input
                                            type="text"
                                            value={lang.language}
                                            onChange={e => updateLanguage(i, { language: e.target.value })}
                                            placeholder="เช่น ไทย, อังกฤษ, จีน"
                                            className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                                        />
                                    </td>
                                    {(['speaking', 'reading', 'writing'] as const).map(skill => (
                                        <td key={skill} className="py-2 px-2">
                                            <select
                                                value={lang[skill]}
                                                onChange={e => updateLanguage(i, { [skill]: e.target.value })}
                                                className="w-full h-10 px-2 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                                            >
                                                {LANGUAGE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </td>
                                    ))}
                                    <td className="py-2 px-2">
                                        <button
                                            type="button"
                                            onClick={() => removeLanguage(i)}
                                            className="h-8 w-8 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-200 flex items-center justify-center"
                                            aria-label="ลบภาษา"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    type="button"
                    onClick={addLanguage}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
                >
                    <Plus size={14} />
                    เพิ่มภาษา
                </button>
            </FormSection>

            {/* 4.2 Skills */}
            <FormSection
                title="ความสามารถพิเศษ"
                icon={<Sparkles size={15} />}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <NumberField label="พิมพ์ดีดไทย (คำ/นาที)" value={values.typing_thai_wpm} onChange={v => set('typing_thai_wpm', v)} min={0} max={200} />
                    <NumberField label="พิมพ์ดีดอังกฤษ (คำ/นาที)" value={values.typing_english_wpm} onChange={v => set('typing_english_wpm', v)} min={0} max={200} />
                </div>
                <TextField label="ทักษะคอมพิวเตอร์" value={values.computer_skills} onChange={v => set('computer_skills', v)} placeholder="เช่น Word, Excel, Photoshop, SAP" />
                <TextField label="ทักษะเครื่องใช้สำนักงาน" value={values.office_equipment_skills} onChange={v => set('office_equipment_skills', v)} placeholder="เช่น เครื่องถ่ายเอกสาร, โทรสาร" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/55">ใบขับขี่รถยนต์</p>
                        <TextField label="เลขที่ใบขับขี่" value={values.driving_license_car} onChange={v => set('driving_license_car', v)} />
                        <TextField label="ประเภท" value={values.driving_license_car_type} onChange={v => set('driving_license_car_type', v)} placeholder="เช่น ประเภท 1" />
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/55">ใบขับขี่มอเตอร์ไซค์</p>
                        <TextField label="เลขที่ใบขับขี่" value={values.driving_license_motorcycle} onChange={v => set('driving_license_motorcycle', v)} />
                        <TextField label="ประเภท" value={values.driving_license_motorcycle_type} onChange={v => set('driving_license_motorcycle_type', v)} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <TextField label="งานอดิเรก" value={values.hobbies} onChange={v => set('hobbies', v)} />
                    <TextField label="กีฬา" value={values.sports} onChange={v => set('sports', v)} />
                    <TextField label="ความรู้พิเศษ" value={values.special_knowledge} onChange={v => set('special_knowledge', v)} />
                    <TextField label="ทักษะอื่น ๆ" value={values.other_skills} onChange={v => set('other_skills', v)} />
                </div>
            </FormSection>

            {/* 4.3 Work flexibility / vehicle */}
            <FormSection
                title="การทำงานและยานพาหนะ"
                icon={<Plane size={15} />}
            >
                <YesNoField
                    label="ทำงานต่างจังหวัดได้หรือไม่?"
                    value={values.can_work_upcountry}
                    onChange={v => set('can_work_upcountry', v)}
                />
                {values.can_work_upcountry !== null && (
                    <TextField
                        label="รายละเอียด (ถ้ามี)"
                        value={values.can_work_upcountry_note}
                        onChange={v => set('can_work_upcountry_note', v)}
                        placeholder="เช่น เฉพาะบางช่วง / มีเงื่อนไข"
                    />
                )}

                <YesNoField
                    label="มียานพาหนะส่วนตัวหรือไม่?"
                    value={values.has_vehicle}
                    onChange={v => {
                        onChange({ ...values, has_vehicle: v, vehicles: v ? (values.vehicles.length ? values.vehicles : [{ type: '', brand: '', model: '', year: '' }]) : [] })
                    }}
                />
                {values.has_vehicle === true && (
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/55 inline-flex items-center gap-1.5">
                            <Car size={12} /> ยานพาหนะ
                        </p>
                        <div className="space-y-2">
                            {values.vehicles.map((v, i) => (
                                <div key={i} className="p-3 rounded-lg bg-black/25 border border-white/10 grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-6 sm:col-span-3">
                                        <TextField label="ประเภท" value={v.type} onChange={nv => updateVehicle(i, { type: nv })} placeholder="รถยนต์ / จักรยานยนต์" />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <TextField label="ยี่ห้อ" value={v.brand} onChange={nv => updateVehicle(i, { brand: nv })} />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <TextField label="รุ่น" value={v.model} onChange={nv => updateVehicle(i, { model: nv })} />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <TextField label="ปี" value={v.year} onChange={nv => updateVehicle(i, { year: nv })} />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <button
                                            type="button"
                                            onClick={() => removeVehicle(i)}
                                            className="w-full h-11 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-200 inline-flex items-center justify-center"
                                            aria-label="ลบ"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addVehicle}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
                        >
                            <Plus size={14} /> เพิ่มคัน
                        </button>
                    </div>
                )}
            </FormSection>

            {/* 4.4 Health + record */}
            <FormSection
                title="สุขภาพและประวัติ"
                icon={<HeartPulse size={15} />}
            >
                <div className="space-y-4">
                    <HealthQuestion
                        label="มีโรคประจำตัวหรือไม่?"
                        flag={values.has_chronic_disease}
                        detail={values.chronic_disease_details}
                        onFlag={v => set('has_chronic_disease', v)}
                        onDetail={v => set('chronic_disease_details', v)}
                        detailLabel="รายละเอียดโรค"
                    />
                    <HealthQuestion
                        label="เคยผ่าตัดหรือไม่?"
                        flag={values.had_surgery}
                        detail={values.surgery_details}
                        onFlag={v => set('had_surgery', v)}
                        onDetail={v => set('surgery_details', v)}
                        detailLabel="รายละเอียดการผ่าตัด"
                    />
                    <HealthQuestion
                        label="เคยมีประวัติต้องโทษหรือไม่?"
                        flag={values.has_criminal_record}
                        detail={values.criminal_record_details}
                        onFlag={v => set('has_criminal_record', v)}
                        onDetail={v => set('criminal_record_details', v)}
                        detailLabel="รายละเอียดประวัติ"
                    />
                </div>
            </FormSection>
        </div>
    )
}

function HealthQuestion({
    label, flag, detail, onFlag, onDetail, detailLabel,
}: {
    label: string
    flag: boolean | null
    detail: string
    onFlag: (v: boolean) => void
    onDetail: (v: string) => void
    detailLabel: string
}) {
    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3">
            <YesNoField label={label} value={flag} onChange={onFlag} />
            {flag === true && (
                <TextareaField label={detailLabel} value={detail} onChange={onDetail} rows={2} />
            )}
        </div>
    )
}
