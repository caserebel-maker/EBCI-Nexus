import { FileText, ImageIcon, Download, Eye, Paperclip } from 'lucide-react'

interface DocRow {
    label: string
    url: string | null
    name?: string | null
}

interface Props {
    rows: DocRow[]
    otherDocuments?: Array<{ name?: string; url?: string | null }> | null
}

/**
 * Read-only file list used in the Education tab. Each row shows a
 * thumbnail/icon + filename + "ดู" (opens in new tab) and "ดาวน์โหลด"
 * (download attribute). Missing files render a muted "— ไม่มีไฟล์".
 */
export function FilesList({ rows, otherDocuments }: Props) {
    const all = [
        ...rows,
        ...(otherDocuments ?? []).map((d, i) => ({
            label: d.name || `เอกสารอื่น #${i + 1}`,
            url: d.url ?? null,
            name: d.name ?? null,
        })),
    ]
    return (
        <ul className="space-y-2">
            {all.map((d, i) => (
                <li key={i}>
                    <FileRow label={d.label} url={d.url} name={d.name ?? null} />
                </li>
            ))}
        </ul>
    )
}

function FileRow({
    label, url, name,
}: {
    label: string
    url: string | null
    name: string | null
}) {
    const isImage = /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.test(url ?? '') || /\.(png|jpe?g|gif|webp)$/i.test(name ?? '')
    const Icon = isImage ? ImageIcon : FileText

    if (!url) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-white/45">
                <Icon size={16} className="shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{label}</p>
                    <p className="text-[11px] text-white/35 italic">— ไม่มีไฟล์</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="h-10 w-10 rounded-md bg-emerald-500/15 text-emerald-200 flex items-center justify-center shrink-0">
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{label}</p>
                <p className="text-[11px] text-emerald-200 inline-flex items-center gap-1 truncate">
                    <Paperclip size={10} />
                    {name ?? 'อัปโหลดแล้ว'}
                </p>
            </div>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/15 text-white/75 hover:text-white text-xs font-semibold"
            >
                <Eye size={12} />
                ดู
            </a>
            <a
                href={url}
                download={name ?? undefined}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/15 text-white/75 hover:text-white text-xs font-semibold"
            >
                <Download size={12} />
                โหลด
            </a>
        </div>
    )
}
