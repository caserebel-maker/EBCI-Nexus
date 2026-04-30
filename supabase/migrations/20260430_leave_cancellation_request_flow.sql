-- §1.4 from BETA_FEEDBACK.md — cancel/withdraw approved leave.
--
-- Pending leave already cancels directly via /api/leave/[id]/cancel.
-- Approved leave needs a two-step flow because the approver already
-- committed to it: the employee files a cancellation request, the
-- approver decides, then the request either becomes 'cancelled' (with
-- a balance refund if the leave hadn't started yet) or reverts back
-- to 'approved'.
--
-- Status state machine after this migration:
--
--                               ┌─────────────────────────┐
--                               ▼                         │
--   pending ──approve──▶ approved ──request_cancel──▶ cancellation_requested
--      │                    │                              │
--      │                    │                       ┌──────┴──────┐
--      reject               │                       │             │
--      │                    │                    approve         reject
--      ▼                    │                       │             │
--   rejected                │                       ▼             │
--                           │                   cancelled         │
--      ┌──────cancel────────┘                                     │
--      ▼                                                          │
--   cancelled                                                     │
--                                                                 │
--                                          (status reverts)       │
--                                                                 ▼
--                                                            approved
--
-- Three new metadata columns let us audit the cancellation flow.

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_decided_by text,
  ADD COLUMN IF NOT EXISTS cancellation_decision_reason text;

COMMENT ON COLUMN leave_requests.cancellation_requested_at IS
  'Set when an approved leave is filed for cancellation by the owner. NULL until they request.';
COMMENT ON COLUMN leave_requests.cancellation_decided_by IS
  'employees.id of the approver who resolved the cancellation request (approve or reject).';
COMMENT ON COLUMN leave_requests.cancellation_decision_reason IS
  'Free-text reason supplied by the approver. Required when rejecting; optional when approving.';
