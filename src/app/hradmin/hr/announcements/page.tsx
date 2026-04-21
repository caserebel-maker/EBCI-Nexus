'use client'

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { publishAnnouncement } from "../actions"
import { AlertTriangle, Send, Megaphone, Info, Loader2, ArrowLeft, X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { SuccessPopup } from "@/components/success-popup"

import { useTranslation } from "@/contexts/language-context"

const LIST_PATH = '/hradmin/announcements'

export default function AnnouncementPage() {
    const { t } = useTranslation()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [priority, setPriority] = useState("internal")
    const [success, setSuccess] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

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
        if (priority === 'emergency' || priority === 'urgent') {
            const label = priority === 'emergency' ? 'ฉุกเฉิน' : 'ด่วน'
            if (!confirm(`ยืนยันการส่งประกาศประเภท "${label}"\n\nระบบจะ:\n1. แสดง banner บนหน้า Dashboard พนักงานทุกคน\n2. ส่งอีเมลหาพนักงานทุกคนทันที\n\nยืนยันหรือไม่?`)) {
                return
            }
        }

        startTransition(async () => {
            const result = await publishAnnouncement(formData)
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
                <span className="text-white/80 font-semibold">สร้างใหม่</span>
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
                        {t('announcements.create')}
                    </h1>
                    <p className="hidden sm:block text-white/70 text-sm mt-0.5">
                        Broadcast news, updates, or emergency alerts to the organization.
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
                title="สร้างประกาศสำเร็จ"
                subtitle="ประกาศของคุณได้ถูกเผยแพร่เรียบร้อยแล้ว"
                autoCloseMs={3000}
                onClose={handleSuccessClose}
            />

            <form
                action={handleSubmit}
                onInput={() => setIsDirty(true)}
                onChange={() => setIsDirty(true)}
                className="bg-card border border-white/10 p-4 lg:p-8 rounded-2xl shadow-xl space-y-6"
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
                            ? "bg-red-500/10 border border-red-500/30 text-red-400"
                            : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    )}>
                        <AlertTriangle className="shrink-0" size={20} />
                        <div className="text-sm">
                            <strong className="block mb-1 uppercase tracking-wider text-xs">
                                {priority === 'emergency' ? '⚠️ คำเตือน — ฉุกเฉิน' : '🚨 คำเตือน — ด่วน'}
                            </strong>
                            การเผยแพร่ประกาศระดับนี้จะ<u>ส่งอีเมลหาพนักงานที่ปฏิบัติงานทุกคนทันที</u> และแสดง banner บน Dashboard
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('announcements.form.headline')}</label>
                    <input
                        name="headline"
                        required
                        placeholder={priority === 'emergency' ? "e.g., FIRE ALARM: EVACUATE IMMEDIATELY" : "e.g., Annual Town Hall Meeting"}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/20"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('announcements.form.content')}</label>
                    <textarea
                        name="content"
                        required
                        rows={5}
                        placeholder={t('announcements.form.content')}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/20"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                        วันหมดอายุ (Optional)
                    </label>
                    <input
                        type="date"
                        name="expires_at"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                        ถ้าไม่ระบุ ประกาศ emergency จะหมดอายุภายใน 7 วัน • ประกาศทั่วไปจะยังแสดงในหน้ารวมประกาศ
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('announcements.form.image')}</label>
                    <div className="bg-gray-200 text-gray-900 rounded-xl p-6 text-center hover:bg-white transition-all group cursor-pointer relative flex flex-col items-center justify-center gap-2 border-2 border-transparent hover:border-primary/20 shadow-lg active:scale-[0.99] min-h-48 overflow-hidden">
                        <input
                            type="file"
                            name="image"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        const img = document.getElementById('preview-image') as HTMLImageElement;
                                        if (img && ev.target?.result) img.src = ev.target.result as string;
                                        const container = document.getElementById('preview-container');
                                        if (container) container.style.display = 'block';
                                        const placeholder = document.getElementById('upload-placeholder');
                                        if (placeholder) placeholder.style.display = 'none';
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                        <div id="upload-placeholder" className="pointer-events-none flex flex-col items-center">
                            <div className="h-12 w-12 rounded-full bg-gray-900/10 flex items-center justify-center mb-2 text-gray-900 group-hover:scale-110 transition-transform">
                                <Megaphone size={24} className="-rotate-12" />
                            </div>
                            <span className="text-gray-900 font-bold uppercase tracking-wider text-sm">Click to Upload Image</span>
                            <span className="text-[10px] text-gray-600 mt-1">PNG, JPG up to 10MB · แนะนำ 16:9 (1920×1080)</span>
                        </div>
                        <div id="preview-container" className="hidden relative z-0 pointer-events-none w-full">
                            <img id="preview-image" src="" alt="Preview" className="max-h-40 rounded-lg mx-auto shadow-lg object-contain w-auto" />
                            <p className="text-xs text-emerald-400 mt-2 font-bold uppercase tracking-wider">Image Selected</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-center">
                    <button
                        type="submit"
                        disabled={isPending}
                        className={cn(
                            "flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all transform active:scale-95 shadow-lg",
                            priority === 'emergency'
                                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
                                : "bg-primary hover:bg-primary/90 text-white shadow-primary/20",
                            isPending && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                        {priority === 'emergency' ? "Broadcast Alert" : t('announcements.form.publish')}
                    </button>
                </div>
            </form>
        </div>
    )
}

function PriorityOption({ id, label, icon: Icon, color, current, onClick }: any) {
    const isSelected = current === id
    return (
        <button
            type="button"
            onClick={() => onClick(id)}
            className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                isSelected
                    ? `${color} border-transparent text-white shadow-lg scale-105`
                    : "bg-black/20 border-white/5 text-muted-foreground hover:bg-black/30 hover:text-white"
            )}
        >
            <Icon size={24} />
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </button>
    )
}
