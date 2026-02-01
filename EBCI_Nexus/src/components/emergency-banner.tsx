import { AlertTriangle } from "lucide-react"

interface EmergencyBannerProps {
    headline: string
    content: string
}

export function EmergencyBanner({ headline, content }: EmergencyBannerProps) {
    if (!headline) return null

    return (
        <div className="bg-amber-500 text-black px-6 py-3 shadow-lg z-50 animate-in slide-in-from-top duration-500 relative">
            <div className="container mx-auto flex items-start gap-4 max-w-6xl">
                <div className="bg-black/10 p-2 rounded-full shrink-0 animate-pulse">
                    <AlertTriangle size={24} className="text-black" strokeWidth={2.5} />
                </div>
                <div className="flex-1 pt-0.5">
                    <h3 className="font-black text-lg uppercase tracking-wider mb-1 flex items-center gap-2">
                        {headline}
                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] rounded-full animate-pulse">URGENT</span>
                    </h3>
                    <p className="font-medium text-black/80 leading-snug">{content}</p>
                </div>
            </div>
        </div>
    )
}
