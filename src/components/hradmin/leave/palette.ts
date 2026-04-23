/**
 * Fallback palette used when `leave_types.color` is null.
 * Values picked to harmonize with the maroon brand canvas while
 * staying visually distinct across 6 slices.
 */
export const FALLBACK_PALETTE = [
    '#f9c5cd', // soft rose   (annual)
    '#fbbf24', // amber       (personal)
    '#a78bfa', // violet      (sick)
    '#34d399', // emerald     (marriage)
    '#60a5fa', // sky         (bereavement)
    '#f87171', // red         (training)
    '#cbd5e1', // slate       (default-6+)
]

/**
 * Resolve a color for a leave type. Uses the DB `color` when present,
 * otherwise assigns a stable fallback based on `display_order` (or
 * index) so colors don't shuffle between renders.
 */
export function resolveLeaveColor(
    dbColor: string | null | undefined,
    index: number,
): string {
    if (dbColor && dbColor.trim().length > 0) return dbColor
    return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length] ?? FALLBACK_PALETTE[0]
}
