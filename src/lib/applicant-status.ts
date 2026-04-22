/**
 * Applicant-status state machine shared between API + UI.
 *
 * Canonical states (stored in job_applications.application_status):
 *   draft        — applicant still filling in (HR can't transition)
 *   submitted    — applicant clicked "ส่งใบสมัคร"
 *   reviewing    — HR acknowledged and is reviewing
 *   shortlisted  — passed first pass, queueing interview
 *   interview    — interview scheduled / done
 *   hired        — offer extended (terminal)
 *   rejected     — not moving forward (terminal)
 *
 * Legacy values (interviewed, offered, withdrawn) from before the
 * Iteration-2 rename still render in the UI but aren't reachable
 * via transitions.
 */
export type ApplicantStatus =
    | 'draft'
    | 'submitted'
    | 'reviewing'
    | 'shortlisted'
    | 'interview'
    | 'hired'
    | 'rejected'

export const APPLICANT_STATUSES: readonly ApplicantStatus[] = [
    'draft', 'submitted', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected',
] as const

const TRANSITIONS: Record<ApplicantStatus, readonly ApplicantStatus[]> = {
    draft:       [],                              // only applicant advances out of draft
    submitted:   ['reviewing', 'rejected'],
    reviewing:   ['shortlisted', 'rejected'],
    shortlisted: ['interview', 'rejected'],
    interview:   ['hired', 'rejected'],
    hired:       [],                              // terminal
    rejected:    [],                              // terminal
}

export function allowedTransitions(from: ApplicantStatus): readonly ApplicantStatus[] {
    return TRANSITIONS[from] ?? []
}

export function canTransition(from: ApplicantStatus, to: ApplicantStatus): boolean {
    return allowedTransitions(from).includes(to)
}
