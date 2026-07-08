'use client'

import { useEffect, useState, useTransition, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { publishAnnouncement } from "../actions"
import { AlertTriangle, Send, Megaphone, Info, Loader2, ArrowLeft, X, ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { SuccessPopup } from "@/components/success-popup"

import { useTranslation } from "@/contexts/language-context"

const LIST_PATH = '/hradmin/announcements'
const FIELD_CLASS = "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 shadow-inner shadow-slate-900/5 outline-none transition focus:border-blue-500/80 focus:bg-white focus:ring-2 focus:ring-blue-400/25 placeholder:text-slate-400"
const LABEL_CLASS = "text-sm font-bold text-slate-700 uppercase tracking-wider"

export default function AnnouncementPage() {
    const { t } = useTranslation()
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get('edit')

    const [isPending, startTransition] = useTransition()
    const [priority, setPriority] = useState("internal")
    const [success, setSuccess] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    // Form field states for editing/creating
    const [headline, setHeadline] = useState("")
    const [content, setContent] = useState("")
    const [expiresAt, setExpiresAt] = useState("")
    const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [shouldDeleteImage, setShouldDeleteImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setPreviewUrl(null)
        setExistingImageUrl(null)
        setShouldDeleteImage(true)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    // Fetch existing announcement data if editing
    useEffect(() => {
        if (!editId) return
        setIsLoading(true)
        startTransition(async () => {
            try {
                const { getAnnouncement } = await import("../actions")
                const res = await getAnnouncement(editId)
                if (res.success && res.announcement) {
                    const a = res.announcement
                    setHeadline(a.headline || "")
                    setContent(a.content || "")
                    setPriority(a.priority || "internal")
                    if (a.expires_at) {
                        setExpiresAt(new Date(a.expires_at).toISOString().split('T')[0])
                    }
                    if (a.image_path) {
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
                        const url = a.image_path.startsWith('http')
                            ? a.image_path
                            : `${supabaseUrl}/storage/v1/object/public/announcement-images/${a.image_path}`
                        setExistingImageUrl(url)
                    }
                } else {
                    alert(res.error || "โหลดข้อมูลประกาศไม่สำเร็จ")
                    router.push(LIST_PATH)
                }
            } catch (err) {
                console.error("Error loading announcement:", err)
                alert("เกิดข้อผิดพลาดในการโหลดข้อมูล")
                router.push(LIST_PATH)
            } finally {
                setIsLoading(false)
            }
        })
    }, [editId, router])

    // Changing priority away from the default counts as a modification too
    const handlePriorityChange = (id: string) => {
        setPriority(id)
        if (id !== 'internal') setIsDirty(true)
    }

    // Warn on hard-refresh / tab-close if the form has unsaved input
    useEffect(() => {
        if (!isDirty) return
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty])

    const handleBack = () => {
        if (isDirty) {
            const go = confirm('คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจริงหรือไม่?')
            if (!go) return
        }
        router.push(LIST_PATH)
    }

    const handleSubmit = (formData: FormData) => {
        setSuccess(false)
        
        // Only warn for new emergency/urgent publishes. Edits don't broadcast new emails/banners.
        if (!editId && (priority === 'emergency' || priority === 'urgent')) {
            const label = priority === 'emergency' ? 'ฉุกเฉิน' : 'ด่วน'
            if (!confirm(`ยืนยันการส่งประกาศประเภท "${label}"\n\nระบบจะ:\n1. แสดง banner บนหน้า Dashboard พนักงานทุกคน\n2. ส่งอีเมลหาพนักงานทุกคนทันที\n\nยืนยันหรือไม่?`)) {
                return
            }
        }
        if (shouldDeleteImage) {
            formData.set('delete_image', 'true')
        }
        startTransition(async () => {
            let result
            if (editId) {
                const { updateAnnouncement } = await import("../actions")
                result = await updateAnnouncement(editId, formData)
            } else {
                result = await publishAnnouncement(formData)
            }
            
            if (result.success) {
                // Form is persisted — clear dirty flag so success autoclose
                // doesn't prompt the unsaved-changes dialog
                setIsDirty(false)
                setSuccess(true)
            } else {
                alert(result.error)
            }
        })
    }

    const handleSuccessClose = () => {
        setSuccess(false)
        router.push(LIST_PATH)
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 size={36} className="animate-spin text-amber-400" />
                <p className="text-white/60 text-sm font-medium">กำลังโหลดข้อมูลประกาศ...</p>
            </div>
        )
    }

    const successTitle = editId ? "แก้ไขประกาศสำเร็จ" : "สร้างประกาศสำเร็จ"
    const successSubtitle = editId ? "ประกาศของคุณได้ถูกแก้ไขเรียบร้อยแล้ว" : "ประกาศของคุณได้ถูกเผยแพร่เรียบร้อยแล้ว"

    return (
        <div className="max-w-3xl mx-auto space-y-6 lg:space-y-8">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-white/50">
                <Link
                    href={LIST_PATH}
                    onClick={(e) => {
                        if (isDirty && !confirm('คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจริงหรือไม่?')) {
                            e.preventDefault()
                        }
                    }}
                    className="hover:text-white transition-colors font-medium"
                >
                    ประกาศข่าวสาร
                </Link>
                <ChevronRight size={14} className="text-white/30" />
                <span className="text-white/80 font-semibold">{editId ? "แก้ไขประกาศ" : "สร้างใหม่"}</span>
            </nav>

            {/* Header: back · title · close */}
            <div className="flex items-center gap-3 sm:gap-4 mb-8">
                <button
                    type="button"
                    onClick={handleBack}
                    className="h-11 w-11 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all active:scale-95"
                    aria-label="กลับไปหน้าประกาศ"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="h-11 w-11 shrink-0 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-lg">
                    <Megaphone size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                        {editId ? "แก้ไขประกาศ" : t('announcements.create')}
                    </h1>
                    <p className="hidden sm:block text-white/70 text-sm mt-0.5">
                        {editId 
                            ? "Edit the announcement headline, content, status, or image details."
                            : "Broadcast news, updates, or emergency alerts to the organization."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleBack}
                    className="h-11 w-11 shrink-0 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all active:scale-95"
                    aria-label="ปิด"
                    title="ปิดและกลับไปหน้าประกาศ"
                >
                    <X size={18} />
                </button>
            </div>

            <SuccessPopup
                open={success}
                title={successTitle}
                subtitle={successSubtitle}
                autoCloseMs={3000}
                onClose={handleSuccessClose}
            />

            <form
                action={handleSubmit}
                onInput={() => setIsDirty(true)}
                onChange={() => setIsDirty(true)}
                className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-2xl shadow-black/20 space-y-6 lg:p-8"
            >

                {/* Priority Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <PriorityOption
                        id="internal"
                        label={t('announcements.priorities.internal')}
                        icon={Info}
                        color="bg-blue-500"
                        current={priority}
                        onClick={handlePriorityChange}
                    />
                    <PriorityOption
                        id="promote"
                        label={t('announcements.priorities.promote')}
                        icon={Megaphone}
                        color="bg-purple-500"
                        current={priority}
                        onClick={handlePriorityChange}
                    />
                    <PriorityOption
                        id="urgent"
                        label={t('announcements.priorities.urgent')}
                        icon={AlertTriangle}
                        color="bg-amber-400"
                        current={priority}
                        onClick={handlePriorityChange}
                    />
                    <PriorityOption
                        id="emergency"
                        label={t('announcements.priorities.emergency')}
                        icon={AlertTriangle}
                        color="bg-red-600"
                        current={priority}
                        onClick={handlePriorityChange}
                    />
                </div>
                <input type="hidden" name="priority" value={priority} />

                {/* Priority Context Warning */}
                {(priority === 'emergency' || priority === 'urgent') && (
                    <div className={cn(
                        "p-4 rounded-xl flex gap-3",
                        priority === 'emergency'
                            ? "bg-red-50 border border-red-200 text-red-700"
                            : "bg-amber-50 border border-amber-200 text-amber-800"
                    )}>
                        <AlertTriangle className="shrink-0" size={20} />
                        <div className="text-sm">
                            <strong className="block mb-1 uppercase tracking-wider text-xs">
                                {priority === 'emergency' ? '⚠️ คำเตือน — ฉุกเฉิน' : '🚨 คำเตือน — ด่วน'}
                            </strong>
                            {editId 
                                ? "การแก้ไขประกาศระดับนี้จะบันทึกการเปลี่ยนแปลงและอัปเดตข้อมูลบนหน้า Dashboard"
                                : "การเผยแพร่ประกาศระดับนี้จะส่งอีเมลหาพนักงานที่ปฏิบัติงานทุกคนทันที และแสดง banner บน Dashboard"}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className={LABEL_CLASS}>{t('announcements.form.headline')}</label>
                    <input
                        name="headline"
                        required
                        value={headline}
                        onChange={e => setHeadline(e.target.value)}
                        placeholder={priority === 'emergency' ? "e.g., FIRE ALARM: EVACUATE IMMEDIATELY" : "e.g., Annual Town Hall Meeting"}
                        className={cn(FIELD_CLASS, "text-lg font-bold")}
                    />
                </div>

                <div className="space-y-2">
                    <label className={LABEL_CLASS}>{t('announcements.form.content')}</label>
                    <textarea
                        name="content"
                        required
                        rows={5}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={t('announcements.form.content')}
                        className={cn(FIELD_CLASS, "min-h-[150px] resize-y leading-relaxed")}
                    />
                </div>

                <div className="space-y-2">
                    <label className={LABEL_CLASS}>
                        วันหมดอายุ (Optional)
                    </label>
                    <input
                        type="date"
                        name="expires_at"
                        value={expiresAt}
                        onChange={e => setExpiresAt(e.target.value)}
                        className={FIELD_CLASS}
                    />
                    <p className="text-xs text-slate-500">
                        ถ้าไม่ระบุ ประกาศ emergency จะหมดอายุภายใน 7 วัน • ประกาศทั่วไปจะยังแสดงในหน้ารวมประกาศ
                    </p>
                </div>

                <div className="space-y-2">
                    <label className={LABEL_CLASS}>{t('announcements.form.image')}</label>
                    <div className="relative">
                        <div className="bg-slate-200 text-slate-900 rounded-xl p-6 text-center hover:bg-slate-50 transition-all group cursor-pointer relative flex flex-col items-center justify-center gap-2 border-2 border-slate-300 hover:border-blue-300/70 shadow-lg shadow-slate-900/10 active:scale-[0.99] min-h-48 overflow-hidden">
                            <input
                                ref={fileInputRef}
                                type="file"
                                name="image"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                        setShouldDeleteImage(false)
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            if (ev.target?.result) {
                                                setPreviewUrl(ev.target.result as string)
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <div id="upload-placeholder" style={{ display: (existingImageUrl || previewUrl) ? 'none' : 'flex' }} className="pointer-events-none flex flex-col items-center">
                                <div className="h-12 w-12 rounded-full bg-slate-900/10 flex items-center justify-center mb-2 text-slate-900 group-hover:scale-110 transition-transform">
                                    <Megaphone size={24} className="-rotate-12" />
                                </div>
                                <span className="text-slate-900 font-bold uppercase tracking-wider text-sm">Click to Upload Image</span>
                                <span className="text-[10px] text-slate-600 mt-1">PNG, JPG up to 10MB · แนะนำ 16:9 (1920×1080)</span>
                            </div>
                            <div id="preview-container" style={{ display: (existingImageUrl || previewUrl) ? 'block' : 'none' }} className="relative z-0 pointer-events-none w-full">
                                <img id="preview-image" src={previewUrl || existingImageUrl || ""} alt="Preview" className="max-h-40 rounded-lg mx-auto shadow-lg object-contain w-auto" />
                                <p className="text-xs text-emerald-600 mt-2 font-bold uppercase tracking-wider">
                                    {previewUrl ? "New Image Selected" : "Existing Image (Click/Drag to Replace)"}
                                </p>
                            </div>
                        </div>
                        {(previewUrl || existingImageUrl) && (
                            <button
                                type="button"
                                onClick={handleClearImage}
                                className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-900/20 transition-all border border-rose-500/30"
                                title="ลบรูปภาพปกประกาศ"
                            >
                                <X size={14} />
                                ลบรูปภาพ
                            </button>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex justify-center">
                    <button
                        type="submit"
                        disabled={isPending}
                        className={cn(
                            "flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all transform active:scale-[0.98] shadow-lg",
                            priority === 'emergency'
                                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
                                : "bg-[#882136] hover:bg-[#a02640] text-white shadow-[#882136]/20",
                            isPending && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                        {editId 
                            ? "บันทึกการแก้ไข" 
                            : (priority === 'emergency' ? "Broadcast Alert" : t('announcements.form.publish'))}
                    </button>
                </div>
            </form>
        </div>
    )
}

type PriorityOptionProps = {
    id: string
    label: string
    icon: LucideIcon
    color: string
    current: string
    onClick: (id: string) => void
}

function PriorityOption({ id, label, icon: Icon, color, current, onClick }: PriorityOptionProps) {
    const isSelected = current === id
    return (
        <button
            type="button"
            onClick={() => onClick(id)}
            className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                isSelected
                    ? `${color} border-transparent text-white shadow-lg scale-105`
                    : "bg-slate-200 border-slate-300 text-slate-700 shadow-sm shadow-slate-900/5 hover:bg-slate-100 hover:text-slate-950"
            )}
        >
            <Icon size={24} />
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </button>
    )
}
