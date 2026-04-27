import { sendEmail } from './email'

/**
 * Thin wrapper — legacy leave templates all route through the same
 * 'hr' sender identity as the newer email-leave.ts module.
 */
function sendLeaveEmail(args: { to: string | string[]; subject: string; html: string }) {
    return sendEmail({
        to: args.to,
        subject: args.subject,
        html: args.html,
        sender: 'hr',
    })
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    annual: 'ลาพักร้อน',
    maternity: 'ลาคลอด',
    ordination: 'ลาบวช',
}

const STATUS_LABELS: Record<string, string> = {
    approved: 'อนุมัติ',
    rejected: 'ปฏิเสธ',
    pending: 'รออนุมัติ',
}

function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

// Notify manager when employee submits a leave request
export async function sendLeaveRequestNotification({
    managerEmail,
    managerName,
    employeeName,
    leaveType,
    startDate,
    endDate,
    totalDays,
    reason,
    approveUrl,
}: {
    managerEmail: string
    managerName: string
    employeeName: string
    leaveType: string
    startDate: Date | string
    endDate: Date | string
    totalDays: number
    reason: string
    approveUrl: string
}) {
    const leaveLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType

    return sendLeaveEmail({
        to: managerEmail,
        subject: `[EBCI Nexus] ใบลาใหม่ — ${employeeName} ขอ${leaveLabel}`,
        html: `
      <div style="font-family: 'Kanit', Tahoma, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(180deg, #561e23 0%, #7a2f35 50%, #ad5f6c 100%); padding: 24px; color: white;">
          <h2 style="margin: 0; font-size: 20px;">📋 ใบขออนุมัติการลา</h2>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.85;">EBCI Nexus HR System</p>
        </div>
        <div style="padding: 24px; background: white;">
          <p style="color: #374151;">เรียน คุณ${managerName},</p>
          <p style="color: #374151;">พนักงาน <strong>${employeeName}</strong> ได้ยื่นใบลา กรุณาพิจารณาอนุมัติ</p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280; width: 40%;">ประเภทการลา</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leaveLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">วันที่เริ่มลา</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${formatDate(startDate)}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">วันที่สิ้นสุด</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${formatDate(endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">จำนวนวัน</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${totalDays} วัน</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">เหตุผล</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${reason}</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${approveUrl}" style="display: inline-block; background: #7a2f35; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
              ไปยังหน้าอนุมัติใบลา
            </a>
          </div>

          <p style="color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
            ⚠️ หากไม่มีการตอบสนองภายใน 24 ชั่วโมง ระบบจะแจ้งเตือนฝ่าย HR โดยอัตโนมัติ
          </p>
        </div>
      </div>
    `,
    })
}

// Notify employee when their leave is approved or rejected
export async function sendLeaveDecisionNotification({
    employeeEmail,
    employeeName,
    leaveType,
    startDate,
    endDate,
    totalDays,
    status,
    rejectionReason,
    approverName,
}: {
    employeeEmail: string
    employeeName: string
    leaveType: string
    startDate: Date | string
    endDate: Date | string
    totalDays: number
    status: 'approved' | 'rejected'
    rejectionReason?: string
    approverName: string
}) {
    const leaveLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType
    const statusLabel = STATUS_LABELS[status]
    const isApproved = status === 'approved'
    const badgeColor = isApproved ? '#16a34a' : '#dc2626'
    const badgeBg = isApproved ? '#dcfce7' : '#fee2e2'

    return sendLeaveEmail({
        to: employeeEmail,
        subject: `[EBCI Nexus] ใบลาของคุณ${isApproved ? 'ได้รับการอนุมัติ' : 'ถูกปฏิเสธ'} — ${leaveLabel}`,
        html: `
      <div style="font-family: 'Kanit', Tahoma, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(180deg, #561e23 0%, #7a2f35 50%, #ad5f6c 100%); padding: 24px; color: white;">
          <h2 style="margin: 0; font-size: 20px;">${isApproved ? '✅' : '❌'} ผลการพิจารณาใบลา</h2>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.85;">EBCI Nexus HR System</p>
        </div>
        <div style="padding: 24px; background: white;">
          <p style="color: #374151;">เรียน คุณ${employeeName},</p>

          <div style="background: ${badgeBg}; border: 1px solid ${badgeColor}; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: inline-block;">
            <span style="color: ${badgeColor}; font-weight: 700; font-size: 16px;">
              ${isApproved ? '✅' : '❌'} ใบลาของคุณ${statusLabel}แล้ว
            </span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280; width: 40%;">ประเภทการลา</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leaveLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">วันที่ลา</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${formatDate(startDate)} – ${formatDate(endDate)}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">จำนวนวัน</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${totalDays} วัน</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">ผู้พิจารณา</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${approverName}</td>
            </tr>
            ${!isApproved && rejectionReason ? `
            <tr style="background: #fef2f2;">
              <td style="padding: 10px 12px; border: 1px solid #fca5a5; font-weight: 600; color: #991b1b;">เหตุผลที่ปฏิเสธ</td>
              <td style="padding: 10px 12px; border: 1px solid #fca5a5; color: #991b1b;">${rejectionReason}</td>
            </tr>
            ` : ''}
          </table>

          <p style="color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
            หากมีข้อสงสัยกรุณาติดต่อฝ่าย HR โดยตรง
          </p>
        </div>
      </div>
    `,
    })
}

// Escalate to HR when manager doesn't respond within 24 hours
export async function sendEscalationNotification({
    hrEmail,
    hrName,
    employeeName,
    managerName,
    leaveType,
    startDate,
    endDate,
    totalDays,
    submittedAt,
    approveUrl,
}: {
    hrEmail: string
    hrName: string
    employeeName: string
    managerName: string
    leaveType: string
    startDate: Date | string
    endDate: Date | string
    totalDays: number
    submittedAt: Date | string
    approveUrl: string
}) {
    const leaveLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType

    return sendLeaveEmail({
        to: hrEmail,
        subject: `[EBCI Nexus] ⚠️ Escalation — ใบลาของ ${employeeName} ยังไม่ได้รับการพิจารณา`,
        html: `
      <div style="font-family: 'Kanit', Tahoma, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: #b45309; padding: 24px; color: white;">
          <h2 style="margin: 0; font-size: 20px;">⚠️ แจ้งเตือน: ใบลาเกิน 24 ชั่วโมงยังไม่ได้รับการพิจารณา</h2>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.85;">EBCI Nexus HR System — Escalation Alert</p>
        </div>
        <div style="padding: 24px; background: white;">
          <p style="color: #374151;">เรียน คุณ${hrName} (HR),</p>
          <p style="color: #374151;">
            ใบลาของ <strong>${employeeName}</strong> ถูกยื่นตั้งแต่ <strong>${formatDate(submittedAt)}</strong>
            และยังไม่ได้รับการพิจารณาจาก <strong>คุณ${managerName}</strong> เกิน 24 ชั่วโมงแล้ว
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280; width: 40%;">พนักงาน</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">หัวหน้า</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${managerName}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">ประเภทการลา</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leaveLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #6b7280;">วันที่ลา</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${formatDate(startDate)} – ${formatDate(endDate)} (${totalDays} วัน)</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${approveUrl}" style="display: inline-block; background: #b45309; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
              ไปยังหน้าจัดการใบลา (HR Admin)
            </a>
          </div>
        </div>
      </div>
    `,
    })
}
