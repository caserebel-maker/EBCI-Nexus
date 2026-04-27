'use client'

import { MapPin, ExternalLink } from 'lucide-react'

/**
 * LocationSection — renders the home-location block on the employee
 * profile. Two visual states:
 *
 *   - Display: shows the lat/long, label, optional note, an embedded
 *     Google Maps iframe centred on the coordinates, and a link out
 *     to the full Maps app for directions. Hides itself entirely if
 *     no coordinates are set.
 *
 *   - Edit: rendered inline by the parent via the FormState fields
 *     (this component is display-only; the edit UI lives in the
 *     parent profile view's edit panel).
 *
 * The print stylesheet swaps the iframe for a static address line
 * since iframes don't render reliably in PDFs.
 */
interface Props {
    latitude: number | null
    longitude: number | null
    label: string | null
    note: string | null
    updatedAt: string | null
}

export function LocationSection({ latitude, longitude, label, note, updatedAt }: Props) {
    const hasCoords = latitude !== null && longitude !== null
    if (!hasCoords) return null

    // Google Maps embed requires a `q=lat,lng` query so the marker
    // sits exactly on the point. `output=embed` strips Maps' own
    // chrome (sign-in nag, hamburger). The unsigned embed endpoint
    // is rate-limited per-IP but free — perfectly fine for HR
    // viewing a few profiles a day.
    const embedSrc = `https://maps.google.com/?q=${latitude},${longitude}&z=16&output=embed`
    const externalUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`

    return (
        <div data-print-section className="space-y-3">
            {label && (
                <p className="text-[0.95rem] text-white font-semibold">
                    {label}
                </p>
            )}
            {note && (
                <p className="text-[0.85rem] text-white/65 leading-relaxed">
                    {note}
                </p>
            )}

            {/* Coords + external link — always visible, also useful in
                print where the iframe is hidden. */}
            <div className="flex flex-wrap items-center gap-3 text-[0.78rem] text-white/65">
                <span className="font-mono tabular-nums">
                    {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
                </span>
                <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-200/85 hover:text-amber-100 transition-colors print:hidden"
                >
                    เปิดใน Google Maps <ExternalLink size={11} />
                </a>
                {updatedAt && (
                    <span className="text-white/40 print:hidden">
                        · อัปเดต {new Date(updatedAt).toLocaleDateString('th-TH', {
                            day: '2-digit', month: 'short', year: 'numeric',
                        })}
                    </span>
                )}
            </div>

            {/* Embedded map — hidden in print to keep the PDF clean. */}
            <div
                className="rounded-xl overflow-hidden border border-white/10 print:hidden"
                style={{ height: 240 }}
            >
                <iframe
                    src={embedSrc}
                    title="Home location map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
        </div>
    )
}

/**
 * LocationEmpty — placeholder shown when coordinates aren't set yet.
 * Surfaces a soft CTA to nudge HR to capture this during onboarding.
 */
export function LocationEmpty() {
    return (
        <div className="text-center py-6">
            <MapPin size={28} className="mx-auto text-white/30 mb-2" />
            <p className="text-white/65 text-[0.95rem]">
                ยังไม่มีพิกัดที่อยู่ในระบบ
            </p>
            <p className="text-white/45 text-[0.8rem] mt-1">
                กด "แก้ไขข้อมูล" แล้วกรอก Latitude / Longitude
            </p>
        </div>
    )
}
