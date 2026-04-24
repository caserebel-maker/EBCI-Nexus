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
