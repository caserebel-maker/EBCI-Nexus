# Codex Skills Sync

Use this repo as the source of truth for the optional Codex skills we use on both laptop and office machines.

## Installed Skill Set

Source: `https://github.com/thananon/9arm-skills`

- `scrutinize`
- `post-mortem`
- `management-talk`

## Sync On Any Machine

After pulling this repo, run:

```bash
npm run skills:sync
```

The script installs or updates the selected skills into:

```bash
~/.codex/skills
```

Restart Codex after syncing so the app can discover the new or updated skills.

## Office / Home Handoff

When switching machines:

```bash
git pull origin main --ff-only
npm run skills:sync
```

This makes the current machine match the skill set tracked by this repo.

## Disable A Skill Temporarily

Move it out of the active skills directory:

```bash
mkdir -p ~/.codex/skills-disabled
mv ~/.codex/skills/scrutinize ~/.codex/skills-disabled/
```

Move it back, or run `npm run skills:sync`, to restore it.
