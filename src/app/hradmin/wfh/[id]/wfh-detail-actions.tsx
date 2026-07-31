'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export function WfhDetailActions({ request }: { request: { id: string; status: string } }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState<string>('')
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false)

  const handleDecision = (decision: 'approve' | 'reject', note?: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/wfh/${request.id}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, note }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setErrorMsg(data.error || 'ไม่สามารถบันทึกรายการได้')
          return
        }
        setShowRejectModal(false)
        router.refresh()
      } catch (err: any) {
        setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
      }
    })
  }

  if (request.status !== 'pending' && request.status !== 'cancellation_requested') {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {errorMsg && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-200">
          {errorMsg}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleDecision('approve')}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/25 border border-emerald-400/40 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/40 disabled:opacity-50 transition-all shadow-lg"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          <span>อนุมัติคำขอ (HR Override)</span>
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowRejectModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500/25 border border-rose-400/40 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/40 disabled:opacity-50 transition-all shadow-lg"
        >
          <XCircle size={16} />
          <span>ปฏิเสธคำขอ</span>
        </button>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-neutral-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">ระบุเหตุผลในการปฏิเสธคำขอ WFH</h3>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="ระบุเหตุผล (ไม่บังคับ)..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white focus:outline-none focus:border-rose-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/70 hover:bg-white/10"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDecision('reject', rejectNote)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {isPending ? 'กำลังบันทึก...' : 'ยืนยันปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
