import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { INTERVIEW_FACTORS } from '@/lib/interview-factors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hradmin/applicants/[id]/evaluate
 * Body: {
 *   scores: Record<factorId, 1..5>,
 *   notes?: string,
 * }
 *
 * Writes the 12-factor evaluation + computed totals to
 * job_applications.interview_evaluation (jsonb). HR-admin only.
 * Overwrites any previous evaluation — the audit trail is the
 * evaluated_at timestamp + evaluator_name fields stored inside.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden — HR only' }, { status: 403 })
    }
    const session = auth.session

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const rawScores = (body.scores ?? {}) as Record<string, unknown>
    const notes: string | null = body.notes ? String(body.notes).trim() || null : null

    // Validate every factor has a 1..5 score. Drop keys we don't know.
    const factors: Array<{ id: number; label: string; score: number }> = []
    for (const f of INTERVIEW_FACTORS) {
        const raw = rawScores[String(f.id)] ?? rawScores[f.id as unknown as string]
        const n = Number(raw)
        if (!Number.isFinite(n) || n < 1 || n > 5 || !Number.isInteger(n)) {
            return NextResponse.json({
                error: `คะแนนข้อ ${f.id} ต้องเป็น 1-5`,
                factor_id: f.id,
            }, { status: 400 })
        }
        factors.push({ id: f.id, label: f.label, score: n })
    }

    const total = factors.reduce((sum, f) => sum + f.score, 0)
    const average = +(total / factors.length).toFixed(2)

    // Resolve evaluator display name
    let evaluatorName: string | null = session.name || null
    try {
        const empId = session.employeeId
        if (empId) {
            const { data: emp } = await supabaseAdmin
                .from('employees')
                .select('first_name_th, last_name_th, nickname')
                .eq('id', empId)
                .maybeSingle()
            if (emp) {
                const base = `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim()
                evaluatorName = emp.nickname ? `${base || evaluatorName} (${emp.nickname})` : (base || evaluatorName)
            }
        }
    } catch (err) {
        console.warn('[applicants/evaluate] evaluator name lookup failed:', err)
    }

    const nowIso = new Date().toISOString()
    const evaluation = {
        factors,
        total,
        average,
        max_score: factors.length * 5,
        percentage: +((total / (factors.length * 5)) * 100).toFixed(1),
        notes,
        evaluated_by: session.employeeId ?? session.id,
        evaluator_name: evaluatorName,
        evaluated_at: nowIso,
    }

    // Fetch existing evaluations
    const { data: app, error: getErr } = await supabaseAdmin
        .from('job_applications')
        .select('interview_evaluation')
        .eq('id', id)
        .maybeSingle()

    if (getErr) {
        console.error('[applicants/evaluate] fetch error:', getErr)
        return NextResponse.json({ error: getErr.message }, { status: 500 })
    }
    if (!app) {
        return NextResponse.json({ error: 'ไม่พบผู้สมัครรายนี้' }, { status: 404 })
    }

    // Parse existing evaluations
    const rawEval = app.interview_evaluation
    let evaluations: any[] = []
    if (rawEval) {
        if (Array.isArray(rawEval)) {
            evaluations = [...rawEval]
        } else if (typeof rawEval === 'object') {
            const obj = rawEval as Record<string, unknown>
            if (Array.isArray(obj.factors)) {
                evaluations = [rawEval]
            }
        }
    }

    // Upsert current evaluator's evaluation
    const evaluatorId = session.employeeId ?? session.id
    const existingIndex = evaluations.findIndex(e => e && e.evaluated_by === evaluatorId)
    if (existingIndex > -1) {
        evaluations[existingIndex] = evaluation
    } else {
        evaluations.push(evaluation)
    }

    const { error: upErr } = await supabaseAdmin
        .from('job_applications')
        .update({
            interview_evaluation: evaluations,
            updated_at: nowIso,
        })
        .eq('id', id)
    if (upErr) {
        console.error('[applicants/evaluate] update error:', upErr)
        return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, evaluation })
}
