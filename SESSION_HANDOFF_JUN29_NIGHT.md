# EBCI Nexus Handoff - 2026-06-29 Night

## Production status

- Production deploy completed and aliased to `https://ebci-nexus.vercel.app`.
- Latest production deployment URL: `https://ebci-nexus-ihn1bi2q8-suriyas-projects-d1b3e6b3.vercel.app`.
- GitHub `main` pushed through commit `07fe1a9 fix: use daily leave reminder cron`.

## What changed tonight

- Updated the employee leave request step 1 UI so annual leave advance notice is visually emphasized as a yellow notice with black text.
- Updated the leave policy page expanded annual leave rule to use the same yellow notice treatment.
- Fixed missing annual leave entitlement display for Anutuey (`999-69`) by setting 2026 annual leave to 6 total / 0 used / 0 pending in production DB.
- Clarified the zero-quota label earlier so true missing entitlement rows read as "ยังไม่ได้กำหนดสิทธิ์" instead of implying leave was used up.
- Changed Vercel cron schedule for `/api/cron/leave-reminders` from hourly to daily at `0 2 * * *` (09:00 Bangkok time).

## Why the cron changed

Vercel Hobby blocks cron schedules that run more than once per day. The hourly reminder cron caused production deploys to fail with:

`Hobby accounts are limited to daily cron jobs. This cron expression (0 * * * *) would run more than once per day.`

Daily cron keeps the stale pending approval reminder as a morning safety net and allows production deploys to succeed on the current plan. If the account is upgraded to Pro, this can be changed back to a more frequent reminder.

## Notes for next Codex session

- If the user still sees the old leave modal text, first ask them to reload the tab once. The deployed production alias is updated, but an already-open browser tab may still hold the previous client bundle.
- Do not revert unrelated untracked local files:
  - `.claude/launch.json`
  - `.vscode/settings.json`
  - `Gemini_Generated_Image_6sd1m46sd1m46sd1.psd`
  - `n152logo.psd`
  - `public/n192.png`
  - `public/n512.png`
- Anutuey test login reminder from user: employee code `999-69` or `99969`, password `1111`.
