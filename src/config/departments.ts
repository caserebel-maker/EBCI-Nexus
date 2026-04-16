/**
 * Canonical department list — source of truth for all dropdowns.
 * Add new departments here; they will appear across the system automatically.
 */
export const DEPARTMENTS = [
    'Innovation & Technology',
    'แผนก IT',
    'บัญชีและการเงิน',
    'ขาย / การตลาด',
    'ทรัพยากรบุคคล (HR)',
    'ปฏิบัติการ',
    'วิศวกรรม',
    'คลังสินค้า / โลจิสติกส์',
    'Unassigned',
] as const

export type Department = (typeof DEPARTMENTS)[number]
