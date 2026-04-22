'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import type SignatureCanvasType from 'react-signature-canvas'
import { RotateCcw, CheckCircle2 } from 'lucide-react'

// react-signature-canvas reads `window` at import time. Dynamic import
// with ssr:false so the server build doesn't explode, and the pad mounts
// only in the browser.
//
// The `as` cast preserves the forwardRef + props typing that `dynamic()`
// strips — without it TS complains "Property 'ref' does not exist on
// type 'IntrinsicAttributes'". The runtime is unchanged; this is purely
// a type-system nudge.
const SignatureCanvas = dynamic(
    () => import('react-signature-canvas'),
    { ssr: false },
) as unknown as React.ForwardRefExoticComponent<
    ComponentProps<typeof SignatureCanvasType> & React.RefAttributes<SignatureCanvasType>
>

interface Props {
    /** Current signature (base64 data URL). Null when not signed. */
    value: string | null
    /** Fires on stroke end with the serialized PNG data URL. */
    onChange: (dataUrl: string | null) => void
    disabled?: boolean
}

/**
 * Touch-friendly signature input.
 *
 * - Renders a maroon-tinted canvas at 2:1 aspect (400 × 200 logical px).
 * - Value flows up on stroke end as a PNG data URL so it drops straight
 *   into `signature_data` (text column) on autosave.
 * - Clearing the pad also clears the stored value.
 * - Hydrates from props: if the user resumes a draft, the last-saved
 *   signature is drawn back onto the canvas so they can see + re-sign.
 */
export function SignaturePad({ value, onChange, disabled }: Props) {
    const padRef = useRef<SignatureCanvasType | null>(null)
    const [isEmpty, setIsEmpty] = useState<boolean>(!value)

    // Resize the canvas to its container width on mount + orientation
    // change. react-signature-canvas needs an explicit pixel width/height
    // to render crisply on devicePixelRatio > 1.
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const [canvasSize, setCanvasSize] = useState({ width: 400, height: 200 })
    useEffect(() => {
        const node = wrapperRef.current
        if (!node) return
        const measure = () => {
            const width = node.clientWidth
            const height = Math.max(160, Math.round(width / 2))
            setCanvasSize({ width, height })
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(node)
        return () => ro.disconnect()
    }, [])

    // Paint stored value onto the pad whenever it (re)mounts.
    useEffect(() => {
        if (!value || !padRef.current) return
        // fromDataURL has a scaling issue on HiDPI displays — passing
        // width/height keeps the rendering aligned with the canvas box.
        padRef.current.fromDataURL(value, { width: canvasSize.width, height: canvasSize.height })
        setIsEmpty(false)
    }, [value, canvasSize.width, canvasSize.height])

    const handleEnd = useCallback(() => {
        const pad = padRef.current
        if (!pad) return
        if (pad.isEmpty()) {
            setIsEmpty(true)
            onChange(null)
            return
        }
        setIsEmpty(false)
        // toDataURL triggers a repaint; use 'image/png' default for
        // maximum fidelity. PNG keeps transparent background.
        onChange(pad.toDataURL('image/png'))
    }, [onChange])

    const handleClear = useCallback(() => {
        padRef.current?.clear()
        setIsEmpty(true)
        onChange(null)
    }, [onChange])

    return (
        <div className="space-y-2">
            <div
                ref={wrapperRef}
                className="relative rounded-xl border-2 border-dashed border-white/20 bg-white/5 overflow-hidden"
                style={{ aspectRatio: '2 / 1' }}
            >
                <SignatureCanvas
                    ref={(r: SignatureCanvasType | null) => { padRef.current = r }}
                    penColor="#ffffff"
                    backgroundColor="rgba(0,0,0,0)"
                    onEnd={handleEnd}
                    canvasProps={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        className: 'w-full h-full touch-none',
                    }}
                />
                {isEmpty && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/30 text-sm">
                        เซ็นลายเซ็นที่นี่
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between gap-3">
                <p className={`text-xs inline-flex items-center gap-1.5 ${isEmpty ? 'text-white/50' : 'text-emerald-200'}`}>
                    {isEmpty
                        ? 'ยังไม่มีลายเซ็น'
                        : <><CheckCircle2 size={12} /> บันทึกลายเซ็นแล้ว</>
                    }
                </p>
                <button
                    type="button"
                    onClick={handleClear}
                    disabled={disabled || isEmpty}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white/75 hover:text-white text-xs font-semibold transition-all"
                >
                    <RotateCcw size={12} />
                    ลบ เซ็นใหม่
                </button>
            </div>
        </div>
    )
}
