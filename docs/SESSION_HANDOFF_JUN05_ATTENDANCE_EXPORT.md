# Session Handoff - 2026-06-05 Attendance Export + HIP Sync

## Current State

- Repo: `caserebel-maker/EBCI-Nexus`
- Branch: `main`
- Latest code commit before this handoff: `eeeac39 fix: paginate attendance export source queries`
- The attendance CSV export issue was traced to Supabase pagination, not missing HIP data.

## Root Cause Found

The export range `2026-05-01` to `2026-06-05` had more than 1,000 `card_scans` rows.

Supabase returns only 1,000 rows by default when using a single `.select()` request. The export route was fetching `card_scans` once, so it only saw the first 1,000 rows. That made the CSV show data for early May only and miss most later dates.

Direct Supabase check from the HIP sync environment confirmed:

- `card_scans` total for `2026-05-01` to `2026-06-05`: `3,880`
- First scan in that range: `2026-05-04T06:09:07`
- Last scan in that range: `2026-06-05T17:05:38`
- `2026-06-05` alone had `140` `card_scans` rows in Supabase during the final check.

## Fixes Pushed

Important commits:

- `b3cb3a7 fix: prevent cached attendance exports`
  - Added `force-dynamic`, `revalidate = 0`, and no-store headers.
  - Added `_ts=Date.now()` to the export URL.

- `eb86345 chore: add attendance export debug counts`
  - Added `debug=1` mode to `/api/hradmin/attendance/export`.
  - Use this to verify production sees source rows without downloading CSV.

- `0dcfa18 fix: export attendance from live Nexus records`
  - Removed dependency on `attendance_logs` for CSV export.
  - Export now reads live Nexus sources directly: `card_scans`, `checkins`, and `leave_requests`.

- `eeeac39 fix: paginate attendance export source queries`
  - Added pagination helpers for `card_scans`, `checkins`, and `leave_requests`.
  - This is the key fix for long date ranges.

## Files Changed

- `src/app/api/hradmin/attendance/export/route.ts`
  - Now fetches all rows using `.range(...)` pages of 1,000 until exhausted.
  - Builds CSV from live `card_scans` and `checkins`, matching what Nexus attendance screens use.
  - Keeps leave fallback from `leave_requests`.
  - Includes debug JSON mode via `debug=1`.

- `src/app/hradmin/attendance/export-modal.tsx`
  - Adds `_ts` cache-busting query param to export URL.

## HIP Sync Runtime Found On Office Machine

The active HIP SQL sync is running from:

`C:\Users\ADMIN\Documents\EBCI_Nexus_HIP_Migration_Package\EBCI-Nexus-main`

Files checked:

- `.hip-card-agent-state.json`
  - Last observed `last_sql_transcantime_id`: `11312`
- `hip-sql-sync.log`
  - Shows successful webhook inserts on `2026-06-05`.
- `.env.local`
  - `NEXUS_CARD_SCAN_WEBHOOK=https://ebci-nexus.vercel.app/api/webhooks/card-scan`
  - `NEXT_PUBLIC_SUPABASE_URL=https://cluirxjykhchthcpgosz.supabase.co`

## Verification Commands Used

Supabase direct check, run from the HIP sync folder with `.env.local`:

```powershell
@'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const envPath = 'C:/Users/ADMIN/Documents/EBCI_Nexus_HIP_Migration_Package/EBCI-Nexus-main/.env.local'
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
  const [key, ...rest] = trimmed.split('=')
  process.env[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const byDate = new Map()
let total = 0, first = null, last = null
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('card_scans')
    .select('scan_time')
    .gte('scan_time', '2026-05-01T00:00:00')
    .lte('scan_time', '2026-06-05T23:59:59.999')
    .order('scan_time')
    .range(from, from + 999)
  if (error) throw error
  if (!data?.length) break
  for (const r of data) {
    const t = String(r.scan_time)
    first ??= t
    last = t
    const d = t.split('T')[0]
    byDate.set(d, (byDate.get(d) || 0) + 1)
    total++
  }
  if (data.length < 1000) break
}
console.log(JSON.stringify({ total, first, last, byDate: Object.fromEntries([...byDate.entries()].sort()) }, null, 2))
'@ | node --input-type=module -
```

## Next Steps At Home

1. Pull latest `main`.
2. Confirm commit `eeeac39` or newer is present.
3. Wait for Vercel deployment to finish.
4. Test debug URL while logged in as HR:

`https://ebci-nexus.vercel.app/api/hradmin/attendance/export?from=2026-05-01&to=2026-06-05&debug=1`

Expected after deployment:

- `cardScanRows` across the date range should reflect thousands of rows, not only the first 1,000.
- `2026-06-05` should show about `140` card scan rows based on the final office check.

5. Export CSV from Nexus for `2026-05-01` to `2026-06-05`.
6. Confirm later dates such as `2026-05-14`, `2026-05-28`, `2026-06-04`, and `2026-06-05` show card scan times.

## Caveats

- Local `npm run build` in the Codex repo failed when using only the HIP sync `.env.local` because that env file does not include all app build keys, especially the anon key. This does not invalidate the route lint result.
- `npx eslint src/app/api/hradmin/attendance/export/route.ts` passed after the pagination change.
- If production still does not show the fix after deployment, the next thing to verify is Vercel production deployment commit SHA.
