'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { X, RotateCw, Loader2 } from 'lucide-react'

interface Props {
    imageSrc: string
    open: boolean
    onClose: () => void
    onCropComplete: (croppedBlob: Blob) => void
    aspectRatio?: number
}

// Modal for cropping a profile photo before upload.
// - Square (1:1) by default
// - Pinch/drag on touch, scroll/drag on desktop
// - Zoom slider (1–3x) + 90° rotate button
// - Output: JPEG blob, quality 0.9, capped at 500×500 px
export function ImageCropModal({
    imageSrc,
    open,
    onClose,
    onCropComplete,
    aspectRatio = 1,
}: Props) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [busy, setBusy] = useState(false)

    const onCropCompleteInternal = useCallback((_area: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels)
    }, [])

    const handleConfirm = async () => {
        if (!croppedAreaPixels || busy) return
        setBusy(true)
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
            if (blob) {
                onCropComplete(blob)
                onClose()
                // Reset for next open
                setCrop({ x: 0, y: 0 })
                setZoom(1)
                setRotation(0)
            }
        } finally {
            setBusy(false)
        }
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
            style={{ background: 'rgba(47,0,0,0.5)', backdropFilter: 'blur(6px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="ปรับรูปโปรไฟล์"
        >
            <div
                className="w-full max-w-[520px] rounded-2xl border border-white/15 overflow-hidden flex flex-col"
                style={{
                    background: 'linear-gradient(160deg, #561e23 0%, #7a2d35 60%, #ad5f6c 100%)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
                }}
            >
                {/* Header */}
                <header className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
                    <h2 className="text-white font-bold text-base">ปรับรูปโปรไฟล์</h2>
                    <button
                        onClick={onClose}
                        aria-label="ปิด"
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </header>

                {/* Crop area */}
                <div
                    className="relative w-full bg-black/40"
                    style={{ aspectRatio: '1 / 1', maxHeight: '60vh' }}
                >
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropCompleteInternal}
                        showGrid={true}
                        objectFit="contain"
                    />
                </div>

                {/* Controls */}
                <div className="p-4 space-y-3 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <label className="text-white/75 text-xs font-semibold w-16 flex-shrink-0">
                            ย่อ-ขยาย
                        </label>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={e => setZoom(Number(e.target.value))}
                            aria-label="ย่อ-ขยาย"
                            className="flex-1 accent-amber-400"
                        />
                        <span className="text-white/60 text-xs font-mono w-10 text-right">
                            {zoom.toFixed(1)}×
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-white/75 text-xs font-semibold w-16 flex-shrink-0">
                            หมุน
                        </label>
                        <button
                            onClick={() => setRotation(r => (r + 90) % 360)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/85 text-xs font-semibold transition-colors"
                        >
                            <RotateCw size={12} />
                            หมุน 90°
                        </button>
                        <span className="text-white/60 text-xs font-mono ml-1">{rotation}°</span>
                    </div>
                </div>

                {/* Footer */}
                <footer className="flex items-center justify-end gap-2 p-4 border-t border-white/10 bg-black/15">
                    <button
                        onClick={onClose}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/85 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={busy || !croppedAreaPixels}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#561e23] text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        ใช้รูปนี้
                    </button>
                </footer>
            </div>
        </div>
    )
}

// ─── Canvas helper ─────────────────────────────────────────────────────────

// Produces a JPEG blob from the chosen crop rectangle + rotation.
// Output capped at 500×500 to keep storage small.
export async function getCroppedImg(
    src: string,
    pixelCrop: Area,
    rotation = 0,
    maxSize = 500,
): Promise<Blob | null> {
    const img = await loadImage(src)

    // 1) Place the source on a rotated canvas so the crop box can read pixels
    //    in "normal" coordinates, matching what the user saw.
    const safeSize = Math.max(img.width, img.height) * 2
    const rotCanvas = document.createElement('canvas')
    rotCanvas.width = safeSize
    rotCanvas.height = safeSize
    const rotCtx = rotCanvas.getContext('2d')
    if (!rotCtx) return null
    rotCtx.translate(safeSize / 2, safeSize / 2)
    rotCtx.rotate((rotation * Math.PI) / 180)
    rotCtx.translate(-img.width / 2, -img.height / 2)
    rotCtx.drawImage(img, 0, 0)

    // react-easy-crop's pixelCrop is relative to the un-rotated image; shift
    // origin to the rotated canvas by the same amount we offset the image.
    const offsetX = (safeSize - img.width) / 2
    const offsetY = (safeSize - img.height) / 2

    // 2) Resize target to max cap while keeping 1:1 crop ratio
    const outW = Math.min(pixelCrop.width, maxSize)
    const outH = Math.min(pixelCrop.height, maxSize)

    const outCanvas = document.createElement('canvas')
    outCanvas.width = outW
    outCanvas.height = outH
    const outCtx = outCanvas.getContext('2d')
    if (!outCtx) return null

    outCtx.drawImage(
        rotCanvas,
        pixelCrop.x + offsetX,
        pixelCrop.y + offsetY,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outW,
        outH,
    )

    return new Promise(resolve =>
        outCanvas.toBlob(b => resolve(b), 'image/jpeg', 0.9),
    )
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        // Allow canvas export even if served from a different origin (Supabase)
        if (!src.startsWith('data:') && !src.startsWith('blob:')) {
            img.crossOrigin = 'anonymous'
        }
        img.src = src
    })
}
