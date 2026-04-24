# CLAUDE.md — EBCI Nexus session rules

> These rules apply to **every** Claude Code session on this repo.
> Read this first before any file inspection, question answering, or
> code change. They encode lessons from multi-device sessions where
> stale local checkouts caused Claude to "not see" work that was
> already shipped.

---

## Session Start Protocol

Every time a new Claude Code session starts on this repo, BEFORE doing
any file inspection or answering questions about project state:

1. Run `git fetch origin` to see what's on remote.
2. Run `git status` — if behind `origin/main`, **STOP and report to
   user** (how many commits behind + a sample of what landed).
3. Suggest `git pull origin main --ff-only` before proceeding.
4. After pulling, **THEN** start answering / working.

Do not skip this even if the user's first prompt seems urgent or
trivial. The cost of a stale checkout (wrong answers, duplicate work,
re-doing a feature that already shipped) is much higher than a
fetch + pull at the top of the session.

---

## Source of Truth Hierarchy

When asked about files or features that "should exist":

1. **Check `origin/main` on GitHub first** — via
   `git log origin/main`, `git show origin/main:path/to/file`, or
   `git ls-tree origin/main <path>`.
2. **Check Vercel production deployments** — via
   `npx vercel ls`, `npx vercel inspect`, or the Vercel MCP server
   when available. Live URLs are `https://nexus.ebcitrade.com` +
   `https://ebci-nexus.vercel.app`.
3. **THEN check local working tree.**

If local is missing something that exists on remote, the user's
local checkout is stale — **do not** assume the file doesn't exist.
Ask them to pull or run the fetch yourself.

---

## Don't blindly trust user claims of "I just committed X"

When the user says "I pushed commit X" or "file Y is on main":

- Verify via `git log origin/main --oneline | grep <hash>` or
  `git log origin/main --oneline -20`.
- Or `git show origin/main:<path>` to inspect the file directly.
- Only report back after verifying.

This prevents the "home machine hasn't pulled" confusion pattern
where Claude confidently says "that file doesn't exist" because it's
looking at a stale local index.

---

## On every resume

- **Default to reading `docs/NEXT.md`** if it exists — the living
  single-entry handoff that points to the next priority.
- **Fall back to `docs/SESSION_HISTORY.md`** for archived context
  from prior sessions.
- The per-day `docs/SESSION_HANDOFF_APR*.md` files are historical
  snapshots — read them only if `NEXT.md` references them or the
  user asks explicitly.

A typical resume in this repo looks like:

```
$ git fetch origin
$ git status              # 3 commits behind origin/main? report + pull
$ git pull origin main --ff-only
$ cat docs/NEXT.md        # pick up from the §3.x priority
```

---

## Other repo-specific conventions

- **Push pattern:** `git push origin HEAD:main` (we work on a worktree
  branch, push refs to `main` directly).
- **Deploy:** Vercel auto-deploys on every push to `main`. No manual
  step. Smoke-test at `https://nexus.ebcitrade.com` after ~60 s.
- **Test accounts:** Admin `tumyen@gmail.com / 0000` · L1 `l1test@ebci.test / 0000`
  (see `docs/NEXT.md §4` for the full list).
- **Notification `recipient_user_id`** holds the Supabase `auth.users.id`
  UUID, **not** the legacy `public."User".id` CUID. See
  `src/lib/notifications.ts` and the note in the APR24 handoff for
  the rationale (FK to `User` was dropped).
- **Leave balance transitions** must be verified via the DB after any
  approve/reject/force-action test — `leave_requests.status` + the
  matching `leave_balances` row are the authoritative record.

---

*Maintained alongside `docs/NEXT.md`. If a rule here conflicts with
recent workflow reality, update this file **first**, then adjust
`docs/NEXT.md` to match.*
