'use client'

import { useRef, useState } from 'react'
import { Paperclip, UploadCloud, X, Loader2, FileText, ImageIcon } from 'lucide-react'

type DocKind = 'cv' | 'transcript' | 'id_card_copy' | 'house_registration' | 'other'

interface Props {
    label: string
    required?: boolean
    description?: string
    kind: DocKind
    currentUrl: string | null
    currentName?: string | null
    applicationId: string | null
    referenceCode: string | null
    onUploaded: (url: string) => void
    onCleared?: () => void
    accept?: string
}

/**
 * One document slot. Hits POST /api/careers/apply/[id]/upload with the
 * right `kind` so the server knows which column to write to
 * (cv_url / transcript_url / id_card_copy_url / house_registration_url;
 * 'other' appends to other_documents jsonb). Max 10 MB enforced
 * server-side; this component surfaces the error if it comes back.
 */
export function DocumentUpload({
    label, required, description, kind, currentUrl, currentName,
    applicationId, referenceCode, onUploaded, onCleared,
    accept = '.pdf,image/png,image/jpeg,image/webp,.doc,.docx',
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(currentName ?? null)

    const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = '' // allow picking same file again after clearing
        if (!file) return
        if (!applicationId || !referenceCode) {
            setError('กรอกข้อมูล Step 1 ให้เสร็จก่อน ระบบจะสร้างรหัสใบสมัครก่อนจึงจะอัปโหลดได้')
            return
        }
        setUploading(true)
        setError(null)
        try {
            const form = new FormData()
            form.append('file', file)
            form.append('reference_code', referenceCode)
            form.append('kind', kind)
            const res = await fetch(`/api/careers/apply/${applicationId}/upload`, {
                method: 'POST',
                body: form,
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)
            setFileName(file.name)
            onUploaded(String(json.url))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'อัปโหลดล้มเหลว')
        } finally {
            setUploading(false)
        }
    }

    const clear = () => {
        setFileName(null)
        setError(null)
        onCleared?.()
    }

    const Icon = guessIcon(currentUrl, fileName)

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-300">*</span>}
                </span>
                {currentUrl && (
                    <a
                        href={currentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-200 hover:text-amber-100 inline-flex items-center gap-1"
                    >
                        <Paperclip size={11} /> ดูไฟล์
                    </a>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handlePick}
                disabled={uploading || !applicationId}
            />

            {currentUrl ? (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
                    <Icon size={18} className="text-emerald-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                            {fileName ?? 'ไฟล์ที่อัปโหลดแล้ว'}
                        </p>
                        <p className="text-[11px] text-emerald-200">บันทึกแล้ว</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="text-white/70 hover:text-white text-xs font-semibold px-2"
                    >
                        เปลี่ยนไฟล์
                    </button>
                    {onCleared && (
                        <button
                            type="button"
                            onClick={clear}
                            disabled={uploading}
                            className="h-7 w-7 rounded-full text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center"
                            aria-label="ลบไฟล์"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading || !applicationId}
                    className="w-full p-4 rounded-lg border-2 border-dashed border-white/20 hover:border-amber-300/40 bg-white/[0.03] text-white/70 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {uploading ? 'กำลังอัปโหลด…' : 'คลิกเพื่อเลือกไฟล์'}
                </button>
            )}

            {description && <p className="text-[11px] text-white/45">{description}</p>}
            {error && <p className="text-[11px] text-red-300">{error}</p>}
        </div>
    )
}

function guessIcon(url: string | null, name: string | null) {
    const hint = (name ?? url ?? '').toLowerCase()
    if (hint.match(/\.(png|jpe?g|gif|webp)/)) return ImageIcon
    return FileText
}
