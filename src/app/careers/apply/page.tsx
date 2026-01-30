'use client'

import { useState } from 'react'
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form'
import { Upload, Plus, Trash2, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getDictionary } from '@/config/i18n'

// Type definitions
interface Education {
    level: string; institution: string; major: string; graduatedYear: number; gpa: number;
}
interface Experience {
    company: string; position: string; salary: number; startDate: string; endDate: string; reasonForLeaving: string;
}
interface LanguageSkill {
    language: string; speaking: string; reading: string; writing: string;
}
interface FormData {
    positionApplied: string; expectedSalary: number; startDate: string; employmentStatus: string;
    firstName: string; lastName: string; nickname: string; dateOfBirth: string; age: number;
    gender: string; nationality: string; religion: string; race: string;
    address: string; phone: string; email: string; residenceType: string; livingDuration: number;
    maritalStatus: string; militaryStatus: string; childrenCount: number;
    educations: Education[];
    experiences: Experience[];
    skills: {
        languages: LanguageSkill[];
        computer: string;
        drivingLicense: boolean;
        ownCar: boolean;
    };
    photo: FileList;
    resume: FileList;
}

export default function ApplicationForm() {
    const router = useRouter()
    const dict = getDictionary('th'); // Default to Thai

    // STEPS derived from dictionary
    const STEPS = [
        { number: 1, title: dict.career.step_1 },
        { number: 2, title: dict.career.step_2 },
        { number: 3, title: dict.career.step_3 },
        { number: 4, title: dict.career.step_4 },
        { number: 5, title: dict.career.step_5 },
    ]

    const [currentStep, setCurrentStep] = useState(1)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { register, control, handleSubmit, trigger, getValues, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            nationality: 'ไทย',
            maritalStatus: 'โสด',
            militaryStatus: 'ได้รับการยกเว้น',
            educations: [{ level: 'ปริญญาตรี', institution: '', major: '', graduatedYear: new Date().getFullYear(), gpa: 0 }],
            experiences: [],
            skills: {
                languages: [{ language: 'อังกฤษ', speaking: 'พอใช้', reading: 'พอใช้', writing: 'พอใช้' }],
                computer: '',
                drivingLicense: false,
                ownCar: false,
            }
        }
    })

    const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: 'educations' })
    const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({ control, name: 'experiences' })
    const { fields: langFields, append: appendLang, remove: removeLang } = useFieldArray({ control, name: 'skills.languages' })

    const nextStep = async () => {
        let isValid = false;
        if (currentStep === 1) isValid = await trigger(['positionApplied', 'firstName', 'lastName', 'dateOfBirth', 'phone', 'email']);
        else if (currentStep === 2) isValid = await trigger(['address']);
        else isValid = true;

        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, 5))
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1))
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        if (!confirm(dict.common.confirm_action + '?')) return;

        setSubmitting(true)
        setError(null)

        try {
            const formData = new FormData()
            if (data.photo?.[0]) formData.append('photo', data.photo[0])
            if (data.resume?.[0]) formData.append('resume', data.resume[0])

            const { photo, resume, ...jsonData } = data
            formData.append('data', JSON.stringify(jsonData))

            const res = await fetch('/api/applicants', {
                method: 'POST',
                body: formData
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.message || 'Submission failed')

            setSuccess(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err: any) {
            setError(err.message)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setSubmitting(false)
        }
    }

    if (success) {
        return (
            <div className="bg-card p-12 rounded-xl shadow-lg text-center max-w-2xl mx-auto mt-10">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">{dict.career.success_msg}</h2>
                <p className="text-muted-foreground mb-8">{dict.career.success_desc}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => window.location.reload()} className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors text-foreground">
                        {dict.career.apply_more}
                    </button>
                    <button onClick={() => router.push('/')} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                        {dict.career.back_home}
                    </button>
                </div>
            </div>
        )
    }

    const formDataValues = getValues();

    return (
        <div className="space-y-6">
            {/* Progress Bar (Glassmorphism) */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 text-primary-foreground">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 -z-10 rounded"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-secondary -z-10 rounded transition-all duration-500" style={{ width: `${((currentStep - 1) / 4) * 100}%` }}></div>

                    {STEPS.map((step) => (
                        <div key={step.number} className={`flex flex-col items-center gap-2 ${currentStep >= step.number ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${currentStep >= step.number ? 'bg-secondary text-secondary-foreground shadow-lg scale-110' : 'bg-white/20 text-white'
                                }`}>
                                {step.number}
                            </div>
                            <span className="text-[10px] md:text-xs font-light hidden md:block">{step.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-6 md:p-10 flex-1">
                    <h2 className="text-2xl font-bold text-primary mb-6 pb-2 border-b border-border flex items-center gap-2">
                        <span className="text-3xl opacity-20">0{currentStep}</span>
                        {STEPS[currentStep - 1].title}
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* STEP 1 */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.position_label} <span className="text-destructive">*</span></label>
                                    <input {...register("positionApplied", { required: true })} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                    {errors.positionApplied && <span className="text-xs text-destructive">{dict.common.required_field}</span>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.salary_label}</label>
                                    <input type="number" {...register("expectedSalary")} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.start_date_label}</label>
                                    <input type="date" {...register("startDate")} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                            </div>
                            <hr className="border-border" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.firstname_label} <span className="text-destructive">*</span></label>
                                    <input {...register("firstName", { required: true })} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.lastname_label} <span className="text-destructive">*</span></label>
                                    <input {...register("lastName", { required: true })} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.nickname_label}</label>
                                    <input {...register("nickname")} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.dob_label} <span className="text-destructive">*</span></label>
                                    <input type="date" {...register("dateOfBirth", { required: true })} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.age_label}</label>
                                    <input type="number" {...register("age")} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.nationality_label}</label>
                                    <input {...register("nationality")} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.address_label} <span className="text-destructive">*</span></label>
                                    <textarea {...register("address", { required: true })} rows={3} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.phone_label} <span className="text-destructive">*</span></label>
                                    <input {...register("phone", { required: true })} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.email_label} <span className="text-destructive">*</span></label>
                                    <input type="email" {...register("email", { required: true })} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.military_label}</label>
                                    <select {...register("militaryStatus")} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none">
                                        <option value="ได้รับการยกเว้น">ได้รับการยกเว้น</option>
                                        <option value="ผ่านการเกณฑ์">ผ่านการเกณฑ์</option>
                                        <option value="ศึกษาวิชาทหาร">ศึกษาวิชาทหาร (รด.)</option>
                                        <option value="ยังไม่เกณฑ์">ยังไม่เกณฑ์</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{dict.career.marital_label}</label>
                                    <select {...register("maritalStatus")} className="w-full p-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none">
                                        <option value="โสด">โสด</option>
                                        <option value="แต่งงาน">แต่งงาน</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 */}
                    {currentStep === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Education */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-lg text-foreground">{dict.career.step_3} (Education)</h3>
                                    <button type="button" onClick={() => appendEdu({ level: '', institution: '', major: '', graduatedYear: 2024, gpa: 0 })} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                                        <Plus size={16} /> {dict.career.add_edu}
                                    </button>
                                </div>
                                {eduFields.map((field, index) => (
                                    <div key={field.id} className="p-4 bg-muted/50 rounded-lg relative mb-3 border border-border">
                                        <button type="button" onClick={() => removeEdu(index)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            <div className="col-span-2 lg:col-span-1"><input {...register(`educations.${index}.level`)} className="w-full p-2 border border-border rounded text-sm bg-background" placeholder={dict.career.edu_level} /></div>
                                            <div className="col-span-2"><input {...register(`educations.${index}.institution`)} className="w-full p-2 border border-border rounded text-sm bg-background" placeholder={dict.career.edu_institute} /></div>
                                            <div><input type="number" {...register(`educations.${index}.graduatedYear`)} className="w-full p-2 border border-border rounded text-sm bg-background" placeholder={dict.career.edu_year} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Experience */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-lg text-foreground">{dict.career.step_3} (Work)</h3>
                                    <button type="button" onClick={() => appendExp({ company: '', position: '', salary: 0, startDate: '', endDate: '', reasonForLeaving: '' })} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                                        <Plus size={16} /> {dict.career.add_exp}
                                    </button>
                                </div>
                                {expFields.map((field, index) => (
                                    <div key={field.id} className="p-4 bg-muted/50 rounded-lg relative mb-3 border border-border">
                                        <button type="button" onClick={() => removeExp(index)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                                        <div className="grid grid-cols-2 gap-3 mb-2">
                                            <input {...register(`experiences.${index}.company`)} className="w-full p-2 border border-border rounded text-sm bg-background" placeholder={dict.career.exp_company} />
                                            <input {...register(`experiences.${index}.position`)} className="w-full p-2 border border-border rounded text-sm bg-background" placeholder={dict.career.exp_position} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input {...register(`experiences.${index}.salary`)} className="w-full p-2 border border-border rounded text-sm bg-background" placeholder={dict.career.exp_salary} type="number" />
                                            <input {...register(`experiences.${index}.reasonForLeaving`)} className="w-full p-2 border border-border rounded text-sm bg-background" placeholder={dict.career.exp_reason} />
                                        </div>
                                    </div>
                                ))}
                                {expFields.length === 0 && <div className="text-center text-muted-foreground text-sm py-4 bg-muted/30 rounded-lg border border-dashed border-border">{dict.career.no_exp}</div>}
                            </div>
                        </div>
                    )}

                    {/* STEP 4 */}
                    {currentStep === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Languages */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-lg text-foreground">{dict.career.skill_lang}</h3>
                                    <button type="button" onClick={() => appendLang({ language: '', speaking: 'พอใช้', reading: 'พอใช้', writing: 'พอใช้' })} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                                        <Plus size={16} /> {dict.common.next}
                                    </button>
                                </div>
                                {langFields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-4 gap-2 mb-2 p-3 bg-muted/50 rounded border border-border items-end">
                                        <div className="col-span-4 lg:col-span-1">
                                            <label className="text-xs text-muted-foreground mb-1 block">Language</label>
                                            <input {...register(`skills.languages.${index}.language`)} className="w-full p-2 border border-border rounded text-sm bg-background" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-xs text-muted-foreground mb-1 block">Speaking</label>
                                            <select {...register(`skills.languages.${index}.speaking`)} className="w-full p-2 border border-border rounded text-sm bg-background"><option value="ดีมาก">ดีมาก</option><option value="ดี">ดี</option><option value="พอใช้">พอใช้</option></select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-xs text-muted-foreground mb-1 block">Reading</label>
                                            <select {...register(`skills.languages.${index}.reading`)} className="w-full p-2 border border-border rounded text-sm bg-background"><option value="ดีมาก">ดีมาก</option><option value="ดี">ดี</option><option value="พอใช้">พอใช้</option></select>
                                        </div>
                                        <div className="col-span-1 flex items-center gap-2">
                                            <div className="flex-1">
                                                <label className="text-xs text-muted-foreground mb-1 block">Writing</label>
                                                <select {...register(`skills.languages.${index}.writing`)} className="w-full p-2 border border-border rounded text-sm bg-background"><option value="ดีมาก">ดีมาก</option><option value="ดี">ดี</option><option value="พอใช้">พอใช้</option></select>
                                            </div>
                                            <button type="button" onClick={() => removeLang(index)} className="text-muted-foreground hover:text-destructive mb-1"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Computer Skills */}
                            <div>
                                <label className="block font-semibold text-lg mb-2 text-foreground">{dict.career.skill_comp}</label>
                                <textarea {...register("skills.computer")} rows={3} className="w-full p-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-secondary outline-none" placeholder="Microsoft Office, Photoshop..." />
                            </div>

                            {/* Documents */}
                            <div>
                                <h3 className="font-semibold text-lg mb-4 text-foreground">{dict.career.step_4}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                                        <Upload className="mx-auto text-muted-foreground mb-2" />
                                        <label className="block text-sm font-medium mb-1 text-foreground">{dict.career.upload_photo}</label>
                                        <input type="file" {...register("photo")} className="text-xs block mx-auto text-muted-foreground" />
                                    </div>
                                    <div className="border border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                                        <Upload className="mx-auto text-muted-foreground mb-2" />
                                        <label className="block text-sm font-medium mb-1 text-foreground">{dict.career.upload_resume}</label>
                                        <input type="file" {...register("resume")} className="text-xs block mx-auto text-muted-foreground" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 5 */}
                    {currentStep === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-muted/30 p-6 rounded-lg border border-border text-sm space-y-4">
                                <h3 className="font-bold text-lg text-primary border-b border-border pb-2">{dict.career.review_title}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-foreground">
                                    <p><span className="font-semibold text-muted-foreground">{dict.career.position_label}:</span> {formDataValues.positionApplied}</p>
                                    <p><span className="font-semibold text-muted-foreground">{dict.career.salary_label}:</span> {formDataValues.expectedSalary}</p>
                                    <p><span className="font-semibold text-muted-foreground">{dict.career.firstname_label}:</span> {formDataValues.firstName} {formDataValues.lastName}</p>
                                    <p><span className="font-semibold text-muted-foreground">{dict.career.phone_label}:</span> {formDataValues.phone}</p>
                                    <p><span className="font-semibold text-muted-foreground">{dict.career.email_label}:</span> {formDataValues.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-yellow-50/50 text-yellow-800 border border-yellow-200 rounded-lg text-sm dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800">
                                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                <p>{dict.career.consent_disclaimer}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-muted/30 p-6 border-t border-border flex justify-between items-center">
                    {currentStep > 1 ? (
                        <button type="button" onClick={prevStep} className="px-6 py-2.5 text-muted-foreground hover:text-foreground font-medium flex items-center gap-2 hover:bg-muted rounded-lg transition-colors">
                            <ChevronLeft size={18} /> {dict.common.back}
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {currentStep < 5 ? (
                        <button type="button" onClick={nextStep} className="px-8 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg shadow-lg hover:bg-primary/90 flex items-center gap-2 transition-all">
                            {dict.common.next} <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit(onSubmit)}
                            disabled={submitting}
                            className="px-8 py-2.5 bg-green-600 text-white font-medium rounded-lg shadow-lg hover:bg-green-700 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {submitting ? dict.common.processing : dict.common.submit} <Save size={18} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}
