#!/usr/bin/env bash
# agent-loop.sh — run Pi unattended over a queue of feature tasks.
#
# Layout (all untracked, under .agent/):
#   .agent/tasks/todo/*.md      one task per file (goal + acceptance criteria)
#   .agent/tasks/done/          verified + committed
#   .agent/tasks/blocked/       gave up after MAX_ATTEMPTS (patch + notes saved)
#   .agent/PROGRESS.md          shared notes, read by every fresh run
#   .agent/logs/<task>/         pi output, verify output, session files
#
# Usage (inside a container / VM, in the repo root):
#   VERIFY_CMD="npm test && npm run lint" PI_ARGS="--provider X --model Y" \
#   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..." ./agent-loop.sh
#
# Never pushes. All tasks commit onto one local run branch (agent/run-<timestamp>) cut from
# BASE_BRANCH, so later tasks build on earlier ones. A failed task is reset to the last good commit.

set -uo pipefail

REPO="${REPO:-$PWD}"
BASE_BRANCH="${BASE_BRANCH:-main}"
VERIFY_CMD="${VERIFY_CMD:-npm test}"
PI_CMD="${PI_CMD:-pi}"            # swap in your rate-limit wrapper (e.g. your stagger script)
PI_ARGS="${PI_ARGS:-}"            # provider/model/thinking flags you already use
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
RUN_TIMEOUT="${RUN_TIMEOUT:-30m}" # per Pi run
DEADLINE_HOURS="${DEADLINE_HOURS:-8}"
COOLDOWN_SECS="${COOLDOWN_SECS:-5}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"  # optional: Discord channel webhook (treat as a secret)

AGENT_DIR="$REPO/.agent"
TODO="$AGENT_DIR/tasks/todo"
DONE="$AGENT_DIR/tasks/done"
BLOCKED="$AGENT_DIR/tasks/blocked"
PROGRESS="$AGENT_DIR/PROGRESS.md"

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$AGENT_DIR/loop.log"; }

notify() {
  [ -n "$DISCORD_WEBHOOK_URL" ] || return 0
  local msg="${1:0:1900}"   # Discord caps message content at 2000 chars
  curl -sS --max-time 15 \
    --form-string "username=Pi loop" \
    --form-string "content=$msg" \
    "$DISCORD_WEBHOOK_URL" >/dev/null 2>&1
  return 0
}

cd "$REPO" || exit 1
mkdir -p "$TODO" "$DONE" "$BLOCKED" "$AGENT_DIR/logs"
touch "$PROGRESS"
grep -qxF '.agent/' .git/info/exclude 2>/dev/null || echo '.agent/' >> .git/info/exclude

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first." >&2
  exit 1
fi

# One branch for the whole run: each verified task is committed on top of the last,
# so later tasks build on earlier ones. Set RUN_BRANCH to resume an earlier run.
RUN_BRANCH="${RUN_BRANCH:-agent/run-$(date +%Y%m%d-%H%M)}"
if git rev-parse --verify -q "$RUN_BRANCH" >/dev/null; then
  git checkout -q "$RUN_BRANCH" || exit 1
else
  git checkout -q "$BASE_BRANCH" && git checkout -q -b "$RUN_BRANCH" || exit 1
fi
log "Run branch: $RUN_BRANCH (base: $BASE_BRANCH)"

deadline=$(( $(date +%s) + DEADLINE_HOURS * 3600 ))
n_done=0; n_blocked=0; blocked_ids=""

build_prompt() { # $1=task file  $2=attempt  $3=feedback
  cat <<EOF
You are working unattended on one task in this repository. No human is available to answer questions; make reasonable decisions and note them.

## Task
$(cat "$1")

## Rules
- First read AGENTS.md (if present) and .agent/PROGRESS.md for project conventions and earlier lessons.
- Make the smallest change that fully satisfies the acceptance criteria. Add or update tests for new behavior.
- Verification command (must exit 0 when you are done): $VERIFY_CMD
  Run it yourself and fix failures before you stop.
- Do NOT run git commit, git push, or switch branches. The harness handles git.
- Do NOT edit files under .agent/ except appending a short note to .agent/PROGRESS.md
  (what you did, anything surprising, anything a later task should know).
- If the task is impossible or ambiguous, stop and explain why in your final message instead of guessing wildly.

## Attempt
This is attempt $2 of $MAX_ATTEMPTS.
EOF
  if [ -n "${3:-}" ]; then
    cat <<EOF

The previous attempt's changes are still in the working tree (git diff --stat below),
but the verification command failed. Last output:

--- git diff --stat ---
$(git diff --stat HEAD 2>/dev/null | tail -n 30)

--- verify output (tail) ---
$3
EOF
  fi
}

while IFS= read -r task; do
  [ -z "$task" ] && continue
  if [ "$(date +%s)" -ge "$deadline" ]; then log "Deadline reached; stopping."; break; fi

  id="$(basename "$task" .md)"
  logdir="$AGENT_DIR/logs/$id"
  mkdir -p "$logdir"

  log "=== $id ==="

  ok=0; attempt=1; feedback=""
  while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    log "attempt $attempt/$MAX_ATTEMPTS"
    prompt="$(build_prompt "$task" "$attempt" "$feedback")"

    # shellcheck disable=SC2086  # PI_CMD / PI_ARGS are intentionally word-split
    timeout "$RUN_TIMEOUT" $PI_CMD $PI_ARGS --print \
      --session-dir "$logdir/sessions" "$prompt" \
      > "$logdir/attempt-$attempt.out" 2>&1
    log "pi exited with $?"

    if bash -c "$VERIFY_CMD" > "$logdir/verify-$attempt.out" 2>&1; then
      ok=1; break
    fi
    feedback="$(tail -n 60 "$logdir/verify-$attempt.out")"
    attempt=$((attempt + 1))
    sleep "$COOLDOWN_SECS"
  done

  if [ "$ok" -eq 1 ]; then
    git add -A
    if git diff --cached --quiet; then
      log "$id verified but produced no changes; marking blocked"
      mv "$task" "$BLOCKED/"; n_blocked=$((n_blocked + 1)); blocked_ids="$blocked_ids $id"
    else
      git commit -q -m "agent: $id" -m "Verified with: $VERIFY_CMD"
      mv "$task" "$DONE/"; n_done=$((n_done + 1))
      log "$id DONE (committed on $RUN_BRANCH)"
    fi
  else
    git add -A
    git diff --cached > "$BLOCKED/$id.patch"
    cp "$logdir/verify-$((attempt - 1)).out" "$BLOCKED/$id.last-verify.txt" 2>/dev/null
    git reset -q --hard && git clean -qfd
    mv "$task" "$BLOCKED/"; n_blocked=$((n_blocked + 1)); blocked_ids="$blocked_ids $id"
    log "$id BLOCKED after $MAX_ATTEMPTS attempts (patch saved)"
    notify "Pi loop: $id blocked after $MAX_ATTEMPTS attempts"
  fi

  sleep "$COOLDOWN_SECS"
done < <(find "$TODO" -maxdepth 1 -name '*.md' | sort)

git checkout -q "$BASE_BRANCH"
summary="Pi loop finished: $n_done done, $n_blocked blocked${blocked_ids:+ (${blocked_ids# })}. Review: git log --oneline $BASE_BRANCH..$RUN_BRANCH"
log "$summary"
notify "$summary"