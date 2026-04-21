'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, ArrowRight, CheckCircle2, Loader2, Save, Hash, Mail, X,
    AlertCircle, ImageIcon, UploadCloud, Sparkles, RefreshCw, Briefcase,
    Construction,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageCropModal } from '@/components/ImageCropModal'
import {
    ApplyFormValues,
    defaultApplyFormValues,
    SAVABLE_FIELDS,
    STEP_TITLES,
    TOTAL_STEPS,
} from './form-types'
import { useAutosave, type SaveState } from './use-autosave'

interface Props {
    initialRef: string | null
    initialStep: number
}

// ─── Tiny design tokens ─────────────────────────────────────────────────────
const glass = {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '20px',
} as const

// Build a `fields` payload restricted to SAVABLE_FIELDS + coerced for DB types
function buildFieldsPayload(values: ApplyFormValues): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const k of SAVABLE_FIELDS) {
        const v = values[k]
        if (k === 'expected_salary') {
            out[k] = typeof v === 'number' && !isNaN(v) ? v : null
        } else {
            out[k] = typeof v === 'string' ? v.trim() : v
        }
    }
    return out
}

// ─── Main ───────────────────────────────────────────────────────────────────
export function ApplyForm({ initialRef, initialStep }: Props) {
    const router = useRouter()

    // Identity pair that proves ownership to every server call
    const [applicationId, setApplicationId] = useState<string | null>(null)
    const [referenceCode, setReferenceCode] = useState<string | null>(initialRef)

    const [values, setValues] = useState<ApplyFormValues>(() => defaultApplyFormValues())
    const [step, setStep] = useState<number>(initialStep)
    const [completedSteps, setCompletedSteps] = useState<number[]>([])

    const [bootstrapping, setBootstrapping] = useState<boolean>(!!initialRef) // resume case
    const [bootstrapError, setBootstrapError] = useState<string | null>(null)
    const [resumeEmail, setResumeEmail] = useState('')
    const [resumingPending, setResumingPending] = useState(false)

    const [advancing, setAdvancing] = useState(false)

    // Dirty tracking: we only call /start once the user has actually typed
    // something. Before then there's nothing worth persisting.
    const hasUserInteracted = useMemo(() => {
        const v = values
        return Boolean(
            v.position_applied || v.first_name_th || v.last_name_th ||
            v.first_name_en || v.last_name_en || v.nickname ||
            v.email || v.phone_mobile || v.phone_home ||
            (v.expected_salary !== null && !isNaN(v.expected_salary)),
        )
    }, [values])

    // ── API helpers ─────────────────────────────────────────────────────────
    const startDraft = useCallback(async () => {
        const body = buildFieldsPayload(values)
        const res = await fetch('/api/careers/apply/start', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`start failed: HTTP ${res.status}`)
        const json = await res.json()
        const id = String(json.id)
        const ref = String(json.reference_code)
        setApplicationId(id)
        setReferenceCode(ref)
        // Sync URL so a refresh / share preserves the draft
        const params = new URLSearchParams()
        params.set('ref', ref)
        if (step > 1) params.set('step', String(step))
        router.replace(`/careers/apply?${params.toString()}`, { scroll: false })
    }, [values, step, router])

    const patchAutosave = useCallback(async (payload: Record<string, unknown>) => {
        if (!applicationId || !referenceCode) return
        const res = await fetch(`/api/careers/apply/${applicationId}/autosave`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ reference_code: referenceCode, fields: payload }),
        })
        if (!res.ok) {
            const j = await res.json().catch(() => ({}))
            throw new Error(j?.error ?? `autosave failed: HTTP ${res.status}`)
        }
    }, [applicationId, referenceCode])

    // Wire autosave. Dirty payload is non-null as soon as user has typed.
    // Before /start returns we delay autosave — the hook only saves when
    // we actually have an applicationId.
    const autosavePayload = useMemo(
        () => (applicationId && hasUserInteracted ? buildFieldsPayload(values) : null),
        [applicationId, hasUserInteracted, values],
    )
    const { state: saveState, flush } = useAutosave(
        autosavePayload,
        patchAutosave,
    )

    // First time user types, create the draft.
    const starting = useRef(false)
    useEffect(() => {
        if (applicationId) return
        if (!hasUserInteracted) return
        if (referenceCode && !bootstrapping) {
            // URL had ?ref= but no email resolved yet — wait for resume modal
            return
        }
        if (starting.current) return
        starting.current = true
        startDraft().catch(err => {
            console.error('[apply] start error:', err)
            alert('สร้างใบสมัครไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err)))
            starting.current = false
        })
    }, [applicationId, hasUserInteracted, referenceCode, bootstrapping, startDraft])

    // ── Resume flow (URL has ?ref= but no id yet) ───────────────────────────
    const resume = useCallback(async () => {
        if (!referenceCode) return
        setResumingPending(true)
        setBootstrapError(null)
        try {
            const res = await fetch('/api/careers/apply/resume', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email: resumeEmail.trim(), reference_code: referenceCode }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error ?? 'ไม่พบใบสมัคร')
            const app = json.application as Record<string, unknown>
            setApplicationId(String(app.id))
            setReferenceCode(String(app.reference_code))
            setValues(() => hydrateValuesFromRow(app))
            const cs = Array.isArray(app.completed_steps) ? app.completed_steps.map(Number) : []
            setCompletedSteps(cs)
            const cur = Number(app.current_step ?? 1)
            if (Number.isFinite(cur) && cur >= 1 && cur <= TOTAL_STEPS) setStep(cur)
            setBootstrapping(false)
        } catch (e) {
            setBootstrapError(e instanceof Error ? e.message : 'ไม่พบใบสมัคร')
        } finally {
            setResumingPending(false)
        }
    }, [referenceCode, resumeEmail])

    // ── Navigation between steps ────────────────────────────────────────────
    const canGoNext = step >= 1 && step < TOTAL_STEPS
    const goNext = useCallback(async () => {
        if (advancing) return
        setAdvancing(true)
        try {
            // Flush any pending autosave so the server has the latest values
            await flush()
            const nextStep = Math.min(step + 1, TOTAL_STEPS)
            const nextCompleted = Array.from(new Set([...completedSteps, step])).sort((a, b) => a - b)
            setCompletedSteps(nextCompleted)
            setStep(nextStep)
            // Persist step metadata
            if (applicationId && referenceCode) {
                await fetch(`/api/careers/apply/${applicationId}/autosave`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        reference_code: referenceCode,
                        fields: { current_step: nextStep, completed_steps: nextCompleted },
                    }),
                }).catch(err => console.error('[apply] step advance autosave:', err))
            }
            // URL sync
            if (referenceCode) {
                const params = new URLSearchParams()
                params.set('ref', referenceCode)
                if (nextStep > 1) params.set('step', String(nextStep))
                router.replace(`/careers/apply?${params.toString()}`, { scroll: false })
            }
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setAdvancing(false)
        }
    }, [advancing, flush, step, completedSteps, applicationId, referenceCode, router])

    const goBack = useCallback(() => {
        if (step <= 1) return
        setStep(step - 1)
        if (referenceCode) {
            const params = new URLSearchParams()
            params.set('ref', referenceCode)
            if (step - 1 > 1) params.set('step', String(step - 1))
            router.replace(`/careers/apply?${params.toString()}`, { scroll: false })
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [step, referenceCode, router])

    // ── Render ──────────────────────────────────────────────────────────────
    // If we came in with ?ref= but haven't hydrated yet, show the resume modal
    if (initialRef && bootstrapping && !applicationId) {
        return (
            <ResumeGate
                referenceCode={initialRef}
                email={resumeEmail}
                onEmailChange={setResumeEmail}
                onResume={resume}
                pending={resumingPending}
                error={bootstrapError}
                onCancel={() => {
                    // Discard ref — start a fresh draft instead
                    setBootstrapping(false)
                    setReferenceCode(null)
                    setBootstrapError(null)
                    router.replace('/careers/apply', { scroll: false })
                }}
            />
        )
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header: title */}
            <div className="text-center pt-2">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-200/85">ใบสมัครงาน</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
                    {STEP_TITLES[step - 1]}
                </h1>
            </div>

            {/* Reference-code + save-state bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white" style={glass}>
                    <Hash size={14} className="text-amber-200" />
                    {referenceCode ? (
                        <>
                            <span className="text-xs text-white/55 uppercase tracking-wider">รหัสใบสมัคร</span>
                            <span className="font-mono font-semibold text-amber-100 tabular-nums">
                                {referenceCode}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-white/55">รหัสจะถูกสร้างเมื่อเริ่มกรอก</span>
                    )}
                </div>
                <div className="flex-1" />
                <SaveIndicator state={saveState} hasId={!!applicationId} />
            </div>

            {/* Progress bar */}
            <ProgressStrip step={step} completed={completedSteps} />

            {/* Body */}
            <section className="p-5 sm:p-8" style={glass}>
                {step === 1 && (
                    <Step1Personal
                        values={values}
                        onChange={setValues}
                        applicationId={applicationId}
                        referenceCode={referenceCode}
                    />
                )}
                {step > 1 && <StepPlaceholder step={step} />}
            </section>

            {/* Navigation buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 justify-between">
                <button
                    type="button"
                    onClick={goBack}
                    disabled={step <= 1 || advancing}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/15 transition-all disabled:opacity-40"
                >
                    <ArrowLeft size={15} />
                    ย้อนกลับ
                </button>
                <NextButton
                    disabled={!canGoNext || advancing || !applicationId}
                    loading={advancing}
                    onClick={goNext}
                    step={step}
                />
            </div>

            <p className="text-[11px] text-white/40 text-center px-4">
                ระบบบันทึกข้อมูลของคุณอัตโนมัติทุก 3 วินาที
                {referenceCode && ' · เก็บรหัสใบสมัครไว้เพื่อกรอกต่อในภายหลัง'}
            </p>
        </div>
    )
}

// ─── Resume gate ────────────────────────────────────────────────────────────
function ResumeGate({
    referenceCode, email, onEmailChange, onResume, pending, error, onCancel,
}: {
    referenceCode: string
    email: string
    onEmailChange: (v: string) => void
    onResume: () => void
    pending: boolean
    error: string | null
    onCancel: () => void
}) {
    return (
        <div className="max-w-md mx-auto py-6 sm:py-10">
            <div className="p-6 sm:p-7 text-center text-white" style={glass}>
                <div className="h-12 w-12 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-100 flex items-center justify-center mx-auto mb-4">
                    <RefreshCw size={22} />
                </div>
                <h1 className="text-xl font-bold mb-1">กรอกใบสมัครต่อ</h1>
                <p className="text-sm text-white/70 mb-5">
                    กรุณายืนยัน email เพื่อโหลดใบสมัคร
                </p>
                <div className="flex items-center gap-2 bg-black/25 border border-white/10 rounded-lg px-3 py-2 mb-4">
                    <Hash size={14} className="text-amber-200" />
                    <span className="font-mono font-semibold text-amber-100">{referenceCode}</span>
                </div>
                <label className="block mb-3 text-left">
                    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/55 font-bold mb-1.5">
                        <Mail size={12} /> Email ที่ใช้สมัคร
                    </span>
                    <input
                        type="email"
                        value={email}
                        onChange={e => onEmailChange(e.target.value)}
                        placeholder="your.email@example.com"
                        autoComplete="email"
                        disabled={pending}
                        className="w-full h-11 px-3.5 rounded-lg bg-black/30 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-all"
                    />
                </label>
                {error && (
                    <p className="text-red-300 text-sm mb-2" role="alert">{error}</p>
                )}
                <button
                    type="button"
                    onClick={onResume}
                    disabled={pending || !email.trim()}
                    className="mt-2 w-full h-11 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-bold rounded-lg transition-all inline-flex items-center justify-center gap-2"
                >
                    {pending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    โหลดใบสมัคร
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={pending}
                    className="mt-3 text-xs text-white/55 hover:text-white underline underline-offset-2"
                >
                    เริ่มสมัครใหม่แทน
                </button>
            </div>
        </div>
    )
}

// ─── Save state indicator ──────────────────────────────────────────────────
function SaveIndicator({ state, hasId }: { state: SaveState; hasId: boolean }) {
    if (!hasId) {
        return (
            <p className="text-xs text-white/50 italic text-right inline-flex items-center gap-1.5">
                <Sparkles size={12} />
                กำลังรอข้อมูลเริ่มต้น…
            </p>
        )
    }
    if (state.kind === 'saving') {
        return (
            <p className="text-xs text-amber-200 inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                กำลังบันทึก…
            </p>
        )
    }
    if (state.kind === 'saved') {
        const hh = String(state.at.getHours()).padStart(2, '0')
        const mm = String(state.at.getMinutes()).padStart(2, '0')
        return (
            <p className="text-xs text-emerald-200 inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                บันทึกแล้ว {hh}:{mm}
            </p>
        )
    }
    if (state.kind === 'error') {
        return (
            <p className="text-xs text-red-300 inline-flex items-center gap-1.5" title={state.message}>
                <AlertCircle size={12} />
                บันทึกล้มเหลว — จะลองใหม่เมื่อพิมพ์เพิ่ม
            </p>
        )
    }
    return (
        <p className="text-xs text-white/50 inline-flex items-center gap-1.5">
            <Save size={12} />
            บันทึกอัตโนมัติทุก 3 วินาที
        </p>
    )
}

// ─── Progress strip ─────────────────────────────────────────────────────────
function ProgressStrip({ step, completed }: { step: number; completed: number[] }) {
    return (
        <ol className="grid grid-cols-5 gap-1.5">
            {STEP_TITLES.map((title, i) => {
                const n = i + 1
                const isDone = completed.includes(n)
                const isActive = step === n
                return (
                    <li key={n} className="flex flex-col items-center gap-1.5">
                        <div
                            className={cn(
                                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                                isActive
                                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/25'
                                    : isDone
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white/10 text-white/55 border border-white/15',
                            )}
                        >
                            {isDone && !isActive ? <CheckCircle2 size={13} strokeWidth={2.5} /> : n}
                        </div>
                        <span className={cn(
                            'text-[10px] sm:text-[11px] text-center leading-tight transition-colors',
                            isActive ? 'text-white font-semibold' : 'text-white/55',
                        )}>
                            {title}
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}

// ─── Next button ────────────────────────────────────────────────────────────
function NextButton({
    disabled, loading, onClick, step,
}: {
    disabled: boolean
    loading: boolean
    onClick: () => void
    step: number
}) {
    const label = step < TOTAL_STEPS ? 'บันทึกและไปต่อ' : 'ส่งใบสมัคร'
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-bold transition-all active:scale-95 shadow-lg shadow-amber-400/25"
        >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {label}
            {!loading && <ArrowRight size={15} />}
        </button>
    )
}

// ─── Step 1: Position + personal ────────────────────────────────────────────
function Step1Personal({
    values, onChange, applicationId, referenceCode,
}: {
    values: ApplyFormValues
    onChange: (v: ApplyFormValues) => void
    applicationId: string | null
    referenceCode: string | null
}) {
    const setField = <K extends keyof ApplyFormValues>(key: K, v: ApplyFormValues[K]) => {
        onChange({ ...values, [key]: v })
    }

    return (
        <div className="space-y-6">
            <section>
                <h2 className="text-white font-bold text-sm inline-flex items-center gap-2 mb-3">
                    <Briefcase size={14} />
                    ตำแหน่งที่สมัคร
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                        label="ตำแหน่งที่ต้องการ"
                        required
                        value={values.position_applied}
                        onChange={v => setField('position_applied', v)}
                        placeholder="เช่น นักบัญชี, Shipping Officer"
                    />
                    <NumberField
                        label="เงินเดือนที่คาดหวัง (บาท/เดือน)"
                        value={values.expected_salary}
                        onChange={v => setField('expected_salary', v)}
                        placeholder="เช่น 25000"
                        min={0}
                    />
                </div>
            </section>

            <section>
                <h2 className="text-white font-bold text-sm mb-3">ข้อมูลส่วนตัว</h2>
                <RadioGroup
                    label="คำนำหน้า"
                    required
                    value={values.title_th}
                    onChange={v => setField('title_th', v)}
                    options={['นาย', 'นาง', 'นางสาว']}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <TextField
                        label="ชื่อ (ภาษาไทย)"
                        required
                        value={values.first_name_th}
                        onChange={v => setField('first_name_th', v)}
                    />
                    <TextField
                        label="นามสกุล (ภาษาไทย)"
                        required
                        value={values.last_name_th}
                        onChange={v => setField('last_name_th', v)}
                    />
                    <TextField
                        label="First name (English)"
                        value={values.first_name_en}
                        onChange={v => setField('first_name_en', v)}
                    />
                    <TextField
                        label="Last name (English)"
                        value={values.last_name_en}
                        onChange={v => setField('last_name_en', v)}
                    />
                    <TextField
                        label="ชื่อเล่น"
                        value={values.nickname}
                        onChange={v => setField('nickname', v)}
                        placeholder="เช่น มด"
                    />
                </div>
            </section>

            <section>
                <h2 className="text-white font-bold text-sm mb-3">ช่องทางติดต่อ</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                        label="Email"
                        required
                        type="email"
                        value={values.email}
                        onChange={v => setField('email', v)}
                        placeholder="your.email@example.com"
                        help="ระบบจะส่งรหัสใบสมัครไปยัง email นี้"
                    />
                    <TextField
                        label="เบอร์มือถือ"
                        required
                        type="tel"
                        value={values.phone_mobile}
                        onChange={v => setField('phone_mobile', v)}
                        placeholder="08x-xxx-xxxx"
                    />
                    <TextField
                        label="เบอร์บ้าน (ถ้ามี)"
                        type="tel"
                        value={values.phone_home}
                        onChange={v => setField('phone_home', v)}
                    />
                </div>
            </section>

            <section>
                <h2 className="text-white font-bold text-sm inline-flex items-center gap-2 mb-3">
                    <ImageIcon size={14} />
                    รูปถ่าย <span className="text-red-300">*</span>
                </h2>
                <PhotoUploader
                    photoUrl={values.photo_url}
                    onUploaded={url => setField('photo_url', url)}
                    applicationId={applicationId}
                    referenceCode={referenceCode}
                />
                <p className="text-[11px] text-white/45 mt-2">
                    รูปถ่ายหน้าตรง ชัดเจน พื้นหลังเรียบ · ระบบจะ crop เป็นสี่เหลี่ยมจัตุรัสอัตโนมัติ
                </p>
            </section>
        </div>
    )
}

// ─── Photo uploader (react-easy-crop via ImageCropModal) ───────────────────
function PhotoUploader({
    photoUrl, onUploaded, applicationId, referenceCode,
}: {
    photoUrl: string | null
    onUploaded: (url: string) => void
    applicationId: string | null
    referenceCode: string | null
}) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [rawSrc, setRawSrc] = useState<string | null>(null)
    const [cropOpen, setCropOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        setError(null)
        const reader = new FileReader()
        reader.onload = () => {
            setRawSrc(String(reader.result))
            setCropOpen(true)
        }
        reader.readAsDataURL(f)
        e.target.value = ''
    }

    const onCropped = async (blob: Blob) => {
        setCropOpen(false)
        setRawSrc(null)
        if (!applicationId || !referenceCode) {
            setError('กรอกข้อมูลอื่นก่อน ระบบจะสร้างใบสมัครก่อนจึงจะอัปโหลดรูปได้')
            return
        }
        setUploading(true)
        try {
            const form = new FormData()
            form.append('file', blob, 'photo.jpg')
            form.append('reference_code', referenceCode)
            form.append('kind', 'photo')
            const res = await fetch(`/api/careers/apply/${applicationId}/upload`, {
                method: 'POST',
                body: form,
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)
            onUploaded(String(json.url))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'อัปโหลดรูปไม่สำเร็จ')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex items-start gap-4 flex-wrap">
            <div
                className="h-28 w-28 rounded-xl overflow-hidden border border-white/15 flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#561e23,#882136)' }}
            >
                {photoUrl ? (
                    <img src={photoUrl} alt="รูปถ่ายของผู้สมัคร" className="h-full w-full object-cover" />
                ) : (
                    <ImageIcon size={32} className="text-white/30" />
                )}
            </div>
            <div className="flex-1 min-w-[200px]">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPickFile}
                    disabled={uploading || !applicationId}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !applicationId}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/15 disabled:opacity-50"
                >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                    {photoUrl ? 'เปลี่ยนรูป' : 'เลือกรูปถ่าย'}
                </button>
                {!applicationId && (
                    <p className="text-[11px] text-white/45 mt-2">
                        กรอกข้อมูลส่วนอื่นก่อน — ระบบจะสร้างรหัสใบสมัครให้อัตโนมัติ
                    </p>
                )}
                {error && (
                    <p className="text-[11px] text-red-300 mt-2">{error}</p>
                )}
            </div>

            {rawSrc && cropOpen && (
                <ImageCropModal
                    imageSrc={rawSrc}
                    open={cropOpen}
                    onClose={() => { setCropOpen(false); setRawSrc(null) }}
                    onCropComplete={onCropped}
                    aspectRatio={1}
                />
            )}
        </div>
    )
}

// ─── Step 2–5 placeholders ──────────────────────────────────────────────────
function StepPlaceholder({ step }: { step: number }) {
    return (
        <div className="text-center py-10 text-white/70">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-4">
                <Construction size={22} />
            </div>
            <p className="font-semibold text-white mb-1">
                Step {step}: {STEP_TITLES[step - 1]}
            </p>
            <p className="text-sm text-white/55 max-w-sm mx-auto leading-relaxed">
                ขั้นตอนนี้กำลังพัฒนา ระบบบันทึกข้อมูล Step 1 ของคุณไว้แล้ว
                ใช้รหัสใบสมัครกลับมากรอกต่อได้เมื่อเปิดให้บริการ
            </p>
        </div>
    )
}

// ─── Tiny controlled input helpers ──────────────────────────────────────────
function TextField({
    label, value, onChange, required, placeholder, type = 'text', help,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    required?: boolean
    placeholder?: string
    type?: 'text' | 'email' | 'tel'
    help?: string
}) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="mt-1.5 w-full h-11 px-3.5 rounded-lg bg-black/25 border border-white/15 text-white placeholder:text-white/30 text-[15px] focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-colors"
            />
            {help && <p className="text-[11px] text-white/40 mt-1">{help}</p>}
        </label>
    )
}

function NumberField({
    label, value, onChange, required, placeholder, min, max,
}: {
    label: string
    value: number | null
    onChange: (v: number | null) => void
    required?: boolean
    placeholder?: string
    min?: number
    max?: number
}) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <input
                type="number"
                value={value ?? ''}
                onChange={e => {
                    const s = e.target.value
                    onChange(s === '' ? null : Number(s))
                }}
                placeholder={placeholder}
                required={required}
                min={min}
                max={max}
                className="mt-1.5 w-full h-11 px-3.5 rounded-lg bg-black/25 border border-white/15 text-white placeholder:text-white/30 text-[15px] focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-colors tabular-nums"
            />
        </label>
    )
}

function RadioGroup({
    label, value, onChange, options, required,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    options: string[]
    required?: boolean
}) {
    return (
        <div>
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
                {options.map(opt => {
                    const active = value === opt
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={cn(
                                'px-4 h-10 rounded-lg text-sm font-semibold transition-all border',
                                active
                                    ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/25'
                                    : 'bg-black/25 text-white/80 border-white/15 hover:bg-white/10',
                            )}
                        >
                            {opt}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Hydrate /resume row → form values ──────────────────────────────────────
function hydrateValuesFromRow(row: Record<string, unknown>): ApplyFormValues {
    const str = (k: string) => (row[k] == null ? '' : String(row[k]))
    const num = (k: string) => {
        const v = row[k]
        if (v === null || v === undefined || v === '') return null
        const n = Number(v)
        return isNaN(n) ? null : n
    }
    return {
        position_applied: str('position_applied'),
        expected_salary: num('expected_salary'),
        title_th: str('title_th') || 'นาย',
        first_name_th: str('first_name_th'),
        last_name_th: str('last_name_th'),
        first_name_en: str('first_name_en'),
        last_name_en: str('last_name_en'),
        nickname: str('nickname'),
        email: str('email'),
        phone_mobile: str('phone_mobile'),
        phone_home: str('phone_home'),
        photo_url: row.photo_url ? String(row.photo_url) : null,
    }
}
