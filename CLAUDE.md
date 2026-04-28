# EBCI Nexus — Claude Code Session Protocol

> These rules apply to **every** Claude Code session on this repo,
> across every machine. They encode lessons from the multi-device
> workflow where a stale local checkout caused Claude to confidently
> report "file does not exist" when the file was already on remote.

---

## MUST DO ON EVERY SESSION START (MANDATORY)

Before answering ANY question, inspecting ANY file, or making ANY
assumption about project state — run this sync protocol:

**Step 1:** `git fetch origin`

**Step 2:** `git status` and `git log HEAD..origin/main --oneline`

**Step 3:** If behind, STOP and report to user in this format:

```
Local main is N commits behind origin/main.
Latest remote commits:
  <hash> <subject>
  <hash> <subject>
  ...
กรุณา pull ก่อน: git pull origin main --ff-only
รอจนกว่าจะ sync เสร็จก่อน ถึงจะตอบคำถามหรือทำงานได้ต่อ.
```

**Step 4:** After pulling (or if already in sync), read `docs/NEXT.md`
— this is the living handoff doc. Use its priority list to suggest
what to work on. If `NEXT.md` doesn't exist, fall back to
`docs/SESSION_HISTORY.md`, then the most recent
`docs/SESSION_HANDOFF_*.md`.

**Do NOT proceed** until user has pulled or explicitly says "ข้าม"
(skip, with awareness of the risk).

---

## SOURCE OF TRUTH HIERARCHY

When user says "I committed X" or "file Y should exist":

1. **FIRST check `origin/main` (remote)** via:
   - `git show origin/main:path/to/file`
   - `git log origin/main --oneline | grep <hash>`
2. **THEN check Vercel production** — `list_deployments` MCP or
   `npx vercel ls`. Latest deploy commit = production truth.
3. **LAST check local working tree** — local can be stale even if
   user just pushed from another machine.

**DO NOT** report "file does not exist" until all 3 are checked.

---

## MULTI-MACHINE CONTEXT

User works across 3 machines:

| Machine | User | Path |
|---|---|---|
| Office Mac mini | `ebcimord` | `/Volumes/1TB-NVME/2026/FEB26-EBCI/EBCI-Nexus-App` |
| Home Mac | — | `~/C1TB/EB-CI/EBCI-Nexus` |
| Laptop (in car) | — | varies (travel/meetings) |

At session start, ask: **"อยู่เครื่องไหน? (office / home / laptop)"**
Then confirm path matches, run sync protocol, proceed with `NEXT.md`.

---

## HANDOFF DOC PROTOCOL

**`docs/NEXT.md`** — LIVING DOCUMENT (overwrite each session):

- §0 TL;DR in 30 seconds
- §1 commits shipped this session (table)
- §2 what's live + usable right now
- §3 priority list of what's open (§3.1 = most urgent)
- §4 env vars + test accounts (stable reference)
- §5 git state (last commit hash)
- §6 quirks learned this session

**User invocation:** `อ่าน docs/NEXT.md แล้วทำต่อ` (optionally append
`§3.3` to jump to specific priority).

**`docs/SESSION_HISTORY.md`** — APPEND ONLY ARCHIVE, never overwrite.
Table of contents at top + each session verbatim below.

**Before ending every session:** update `NEXT.md` with current state.
Append a summary block to `SESSION_HISTORY.md`. **Don't create new
`SESSION_HANDOFF_*.md` files going forward** — old ones stay as
archive but new handoffs go through `NEXT.md` + `SESSION_HISTORY.md`.

---

## MUST DO ON EVERY SESSION END (MANDATORY)

This is the *bookend* of the session-start sync protocol. The same
multi-machine setup that demands "pull before working" also demands
"push before leaving" — otherwise the next machine's Claude Code
inherits a stale `origin/main` and the work done at this machine is
invisible.

**Trigger phrases to watch for:**
- `กลับบ้าน`, `ไปบ้าน`, `เลิกแล้ว`, `ปิดเครื่อง`
- `พรุ่งนี้ทำต่อ`, `วันหลังเปิดมา`, `ทำต่อที่บ้าน`
- `เปลี่ยนเครื่อง`, `ย้ายไปที่...`
- Or any cue that the work session is wrapping up.

**When triggered, do this without being asked:**

**Step 1 — Verify clean tree:** `git status`. If anything is staged or
modified, commit it. Don't leave uncommitted work behind.

**Step 2 — Push to main:** `git push origin HEAD:main`.
(`HEAD:main` because solo work on `main` happens via worktree
branches; the user's other machines pull from `origin/main`.)

**Step 3 — Refresh `docs/NEXT.md`:**
- Update §0 TL;DR + §1 commits table to match what just shipped.
- Pin a prominent "🔁 ที่เครื่องถัดไป" banner near the top with the
  literal one-liner the user should type into Claude Code on arrival.
- The next-machine prompt must be specific (point at §X.Y, not "ดูทุก
  อย่าง"). Example: `อ่าน docs/NEXT.md แล้วทำต่อ — เริ่มที่ §3.4`.

**Step 4 — Create BOTH a Google Calendar event AND a Claude
scheduled-task (MANDATORY — both, not either-or):**

The user lives out of Google Calendar; a Claude-internal scheduled
task only buzzes inside the Claude Code app and is invisible
otherwise. The GCal event is what shows up on the phone, the laptop
notification, the email reminder. The Claude scheduled-task is what
actually fires a pre-loaded session at the right moment so the
prompt is one click away. Both, every time.

**4a. Google Calendar event** via
`mcp__95d22b32-b8ea-4064-a0f0-af68ce632d11__create_event`:
- summary: `🚀 EBCI Nexus — <session label>` (short, scannable)
- startTime/endTime: ISO without offset, e.g.
  `2026-04-29T07:00:00` to `2026-04-29T07:30:00`
- timeZone: `Asia/Bangkok`
- colorId: `11` (Tomato — pops on the calendar grid)
- description: the full handoff (git pull command + literal Thai
  one-liner + checklist + last commit hash + prod URL). This is
  the canonical handoff the user reads in the morning.

**4b. Claude scheduled-task** via
`mcp__scheduled-tasks__create_scheduled_task` with a `fireAt` at the
same moment. The prompt mirrors the GCal description so opening
Claude Code at the reminder fires a session ready to go. Use a
fresh `taskId` per session (e.g. `ebci-handoff-YYYY-MM-DD`).

**Why mandatory, not optional:** The user explicitly pushed back on
"NEXT.md is enough" and on "scheduled-task is enough" — they've
asked for the GCal event specifically by name. Skipping either
half of 4a/4b breaks the loop they designed.

If a prior unfired task/event exists from an earlier session
that's already past, ignore it; if one is still pending, decide
whether to update or layer fresh.

**Step 5 — Tell the user, in one short message:**
- Confirm what was pushed (commit count + last hash).
- Quote the exact Thai prompt to type at the next machine.
- Remind them to `git pull origin main --ff-only` BEFORE typing it.
- Confirm the scheduled task ID + fire time so they know a reminder
  will land in the morning.

**Do NOT:**
- End a session with uncommitted work.
- End a session with commits that aren't pushed.
- Hand the user a vague "อ่าน NEXT.md" — give them the specific
  section pointer.
- Skip the scheduled-task creation just because NEXT.md is updated.
  The MD is for the assistant + the user reading by hand; the
  scheduled task is for "actively buzzing the user's screen at the
  right moment so the prompt doesn't get lost in the next day's
  context."

---

## ANTI-PATTERNS TO AVOID

1. **Don't blindly trust user claims of "I pushed X"** — user works
   across machines, may have pushed from different one. Verify via
   `origin/main` or Vercel MCP before confirming.

2. **Don't assume local state = project state.** Local can be days
   behind. Always sync first.

3. **Don't confirm "file doesn't exist"** without checking remote.
   Check `git show origin/main:<path>` first. 9/10 times file is on
   remote and local needs pulling.

4. **Don't start work on stale code.** Building on outdated local =
   merge conflicts + confusion. Sync first, always.

---

## USER PREFERENCES (CONSISTENT ACROSS ALL MACHINES)

- Thai language (casual, occasional English tech terms OK)
- Prefer `ask_user_input_v0` tool for choices (not inline text)
- UI fonts 20-30% larger than default (older staff use the app)
- Explicit commits per feature (not one big mega-commit)
- Test incrementally — small features then verify before next
- When in doubt, ask via `ask_user_input_v0` — don't assume

---

## QUICK REFERENCE

| Key | Value |
|---|---|
| Repo | `github.com/caserebel-maker/EBCI-Nexus` |
| Prod URL | `https://ebci-nexus.vercel.app` (alias: `https://nexus.ebcitrade.com`) |
| Dev URL | `localhost:3001` |
| Supabase project | `cluirxjykhchthcpgosz` |
| Vercel project | `prj_buArBae3HxOjH0wstTxZfZszCZT9` |
| Vercel team | `team_EE8l0QHf5AlQg5klF8YhfpFJ` |
| Default branch | `main` (direct push, no PRs for solo work) |
| Default dev server port | `3001` |
| Push pattern | `git push origin HEAD:main` (when on worktree branch) |

---

*Maintained alongside `docs/NEXT.md`. If a rule here conflicts with
recent workflow reality, update this file **first**, then adjust
`docs/NEXT.md` to match.*
