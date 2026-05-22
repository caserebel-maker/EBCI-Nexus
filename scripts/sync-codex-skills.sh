#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${CODEX_SKILLS_REPO_URL:-https://github.com/thananon/9arm-skills.git}"
REF="${CODEX_SKILLS_REF:-main}"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
DEST_DIR="$CODEX_HOME_DIR/skills"

SKILLS=(
  "skills/engineering/scrutinize"
  "skills/engineering/post-mortem"
  "skills/productivity/management-talk"
)

command -v git >/dev/null 2>&1 || {
  echo "git is required to sync Codex skills" >&2
  exit 1
}

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

mkdir -p "$DEST_DIR"

echo "Syncing Codex skills from $REPO_URL@$REF"
git clone --depth 1 --branch "$REF" "$REPO_URL" "$tmp_dir/repo" >/dev/null 2>&1

updated=0
unchanged=0

for skill_path in "${SKILLS[@]}"; do
  name="$(basename "$skill_path")"
  src="$tmp_dir/repo/$skill_path"
  dest="$DEST_DIR/$name"

  if [[ ! -f "$src/SKILL.md" ]]; then
    echo "Missing SKILL.md for $skill_path" >&2
    exit 1
  fi

  if [[ -d "$dest" ]] && diff -qr "$src" "$dest" >/dev/null 2>&1; then
    echo "OK $name is already up to date"
    unchanged=$((unchanged + 1))
    continue
  fi

  rm -rf "$dest"
  mkdir -p "$dest"
  cp -R "$src"/. "$dest"/
  echo "OK synced $name"
  updated=$((updated + 1))
done

echo
echo "Done. Updated: $updated, unchanged: $unchanged"
echo "Restart Codex to pick up newly installed or updated skills."
