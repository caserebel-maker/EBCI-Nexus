'use client'

import { useState, useTransition } from "react"
import { publishAnnouncement } from "../actions"
import { AlertTriangle, Send, Megaphone, Info, CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AnnouncementPage() {
    const [isPending, startTransition] = useTransition()
    const [priority, setPriority] = useState("internal")
    const [success, setSuccess] = useState(false)

    const handleSubmit = (formData: FormData) => {
        setSuccess(false)
        if (priority === 'emergency') {
            if (!confirm("⚠️ CONFIRM EMERGENCY BROADCAST ⚠️\n\nThis will:\n1. Show a sticky banner to ALL employees.\n2. Send an immediate EMAIL to everyone.\n\nAre you sure this is a real emergency?")) {
                return
            }
        }

        startTransition(async () => {
            const result = await publishAnnouncement(formData)
            if (result.success) {
                setSuccess(true)
                // Optional: Reset form
            } else {
                alert(result.error)
            }
        })
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-lg">
                    <Megaphone size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Post Announcement</h1>
                    <p className="text-white/80 font-medium text-sm mt-0.5">Broadcast news, updates, or emergency alerts to the organization.</p>
                </div>
            </div>

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle size={20} />
                    <span className="font-bold">Announcement published successfully!</span>
                </div>
            )}

            <form action={handleSubmit} className="bg-card border border-white/10 p-8 rounded-2xl shadow-xl space-y-6">

                {/* Priority Selection */}
                <div className="grid grid-cols-3 gap-4">
                    <PriorityOption
                        id="internal"
                        label="Internal News"
                        icon={Info}
                        color="bg-blue-500"
                        current={priority}
                        onClick={setPriority}
                    />
                    <PriorityOption
                        id="promote"
                        label="Promotion / Event"
                        icon={Megaphone}
                        color="bg-purple-500"
                        current={priority}
                        onClick={setPriority}
                    />
                    <PriorityOption
                        id="emergency"
                        label="Emergency Alert"
                        icon={AlertTriangle}
                        color="bg-amber-500"
                        current={priority}
                        onClick={setPriority}
                    />
                </div>
                <input type="hidden" name="priority" value={priority} />

                {/* Priority Context Warning */}
                {priority === 'emergency' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex gap-3 text-amber-500">
                        <AlertTriangle className="shrink-0" size={20} />
                        <div className="text-sm">
                            <strong className="block mb-1 uppercase tracking-wider text-xs">Critical Warning</strong>
                            This urgency level will trigger an <u>immediate email broadcast</u> to all employees and display a sticky banner on their dashboard. Use only for genuine emergencies.
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Headline</label>
                    <input
                        name="headline"
                        required
                        placeholder={priority === 'emergency' ? "e.g., FIRE ALARM: EVACUATE IMMEDIATELY" : "e.g., Annual Town Hall Meeting"}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/20"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Content</label>
                    <textarea
                        name="content"
                        required
                        rows={5}
                        placeholder="Write the full details here..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/20"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Image Attachment (Optional)</label>
                    <div className="bg-gray-200 text-gray-900 rounded-xl p-6 text-center hover:bg-white transition-all group cursor-pointer relative flex flex-col items-center justify-center gap-2 border-2 border-transparent hover:border-primary/20 shadow-lg active:scale-[0.99] h-48">
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
                            <span className="text-[10px] text-gray-600 mt-1">PNG, JPG up to 10MB</span>
                        </div>
                        <div id="preview-container" className="hidden relative z-0 pointer-events-none w-full">
                            <img id="preview-image" src="" alt="Preview" className="max-h-64 rounded-lg mx-auto shadow-lg object-contain w-full" />
                            <p className="text-xs text-emerald-400 mt-2 font-bold uppercase tracking-wider">Image Selected</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
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
                        {priority === 'emergency' ? "Broadcast Alert" : "Publish Now"}
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
