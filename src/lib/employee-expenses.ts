import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { EmployeeExpenseBenefit, EmployeeExpensePayment } from '@/lib/employee-expense-shared'

type RawBenefit = Omit<EmployeeExpenseBenefit, 'default_amount' | 'payments'> & {
    default_amount: number | string | null
}

type RawPayment = Omit<EmployeeExpensePayment, 'amount'> & {
    amount: number | string | null
}

function isMissingExpenseTableError(error: { code?: string | null; message?: string | null }) {
    const message = (error.message ?? '').toLowerCase()
    return error.code === '42P01' || message.includes('employee_expense_')
}

function normalizeBenefits(benefits: RawBenefit[], groupedPayments = new Map<string, EmployeeExpensePayment[]>()) {
    return benefits.map((benefit) => ({
        ...benefit,
        default_amount: benefit.default_amount === null ? null : Number(benefit.default_amount),
        payments: groupedPayments.get(benefit.id) ?? [],
    }))
}

export async function fetchEmployeeExpenses(employeeId: string): Promise<EmployeeExpenseBenefit[]> {
    const { data: benefits, error } = await supabaseAdmin
        .from('employee_expense_benefits')
        .select('id, employee_id, title, category, description, default_amount, start_month, end_month, is_active, created_at, updated_at')
        .eq('employee_id', employeeId)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) {
        if (isMissingExpenseTableError(error)) return []
        throw new Error(`Failed to load employee expenses: ${error.message}`)
    }

    if (!benefits?.length) return []

    const benefitIds = benefits.map((benefit) => String(benefit.id))
    const { data: payments, error: paymentError } = await supabaseAdmin
        .from('employee_expense_payments')
        .select('id, benefit_id, employee_id, payment_year, payment_month, amount, status, paid_on, receipt_path, receipt_file_name, receipt_file_size, receipt_mime_type, notes, recorded_by, created_at, updated_at')
        .in('benefit_id', benefitIds)
        .order('payment_year', { ascending: false })
        .order('payment_month', { ascending: false })

    if (paymentError) {
        if (isMissingExpenseTableError(paymentError)) {
            return normalizeBenefits((benefits ?? []) as RawBenefit[])
        }
        throw new Error(`Failed to load employee expense payments: ${paymentError.message}`)
    }

    const groupedPayments = new Map<string, EmployeeExpensePayment[]>()
    for (const rawPayment of (payments ?? []) as RawPayment[]) {
        const payment: EmployeeExpensePayment = {
            ...rawPayment,
            amount: rawPayment.amount === null ? null : Number(rawPayment.amount),
        }
        const list = groupedPayments.get(payment.benefit_id) ?? []
        list.push(payment)
        groupedPayments.set(payment.benefit_id, list)
    }

    return normalizeBenefits((benefits ?? []) as RawBenefit[], groupedPayments)
}
