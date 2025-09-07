#!/usr/bin/env bash
# process-and-deploy.sh — compact mode by default
# Flags:
#   VERBOSE=1  -> show full process logs
#   QUIET=1    -> force compact (default if VERBOSE not set)
#   LOG_RUNS=1 -> tee output to run-logs/<timestamp>.log
#   KEEP_FLIPS=1 -> don't delete flips.csv on success
#   BYPASS_HUSKY=1 -> commit/push with --no-verify

set -Eeuo pipefail

# ---------- config ----------
VERBOSE=${VERBOSE:-0}
QUIET=${QUIET:-$(( VERBOSE ? 0 : 1 ))}

# ---------- helpers ----------
pause_if_interactive() { if [[ "${NO_PAUSE:-0}" -ne 1 && -t 0 ]]; then echo; read -rp "Press Enter to close..."; fi; }
on_exit() {
  trap - EXIT
  code=${1:-$?}; echo
  (( code == 0 )) && echo "✅ Done." || echo "❌ Script failed (exit $code). See output above."
  pause_if_interactive; exit "$code"
}
trap 'on_exit $?' EXIT

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing dependency: $1"; exit 1; }; }
brief_summary() {
  node - <<'NODE' 2>/dev/null || true
const fs=require('fs');
const pick=(o,ks)=>ks.find(k=>k in o);
try{
  const meta=JSON.parse(fs.readFileSync('public/data/meta.json','utf8'));
  const idx=JSON.parse(fs.readFileSync('public/data/summary-index.json','utf8'));
  const csv=fs.readFileSync('public/data/item-stats.csv','utf8');
  const items=Math.max(0,(csv.match(/\n/g)||[]).length-1);
  const flipsKey=pick(meta,['totalFlips','flipCount','flips'])||'flips';
  const profitKey=pick(meta,['totalProfit','profit'])||'profit';
  const flips=meta[flipsKey] ?? '—';
  const profit=meta[profitKey] ?? '—';
  const days=Array.isArray(idx)?idx.length:'—';
  console.log(`🧾 Summary: flips=${flips} | profit=${profit} | items=${items} | days=${days}`);
}catch(e){/* ignore */ }
NODE
}

# ---------- optional logging ----------
if [[ "${LOG_RUNS:-0}" -eq 1 ]]; then
  mkdir -p run-logs
  logfile="run-logs/$(date '+%Y-%m-%d_%H-%M-%S').log"
  echo "📝 Logging to $logfile"
  exec > >(tee -a "$logfile") 2>&1
fi

# ---------- preflight ----------
need_cmd git; need_cmd npm
if [[ ! -f "package.json" || ! -d "public/data" || ! -d ".git" ]]; then
  echo "❌ Run from repo root (package.json, public/data, .git)."; exit 1; fi

# Warn if non-data changes exist (non-blocking)
if ! git diff --quiet --exit-code -- . ':(exclude)public/data' || \
   ! git diff --cached --quiet --exit-code -- . ':(exclude)public/data'; then
  echo "⚠️  You have changes outside public/data. This script won't push them."
fi

# Ensure we're up-to-date before generating data (reduces post-build conflicts)
set +e
git fetch origin
git rebase --autostash origin/$(git rev-parse --abbrev-ref HEAD)
set -e

# Locate flips.csv
if [[ -z "${FLIPS_FILE:-}" ]]; then
  candidates=("$HOME/Documents/flips.csv")
  [[ -n "${USERPROFILE:-}" ]] && candidates+=("$(echo "$USERPROFILE" | sed 's#\\#/#g')/Documents/flips.csv")
  [[ -n "${USERNAME:-}"   ]] && candidates+=("/mnt/c/Users/${USERNAME}/Documents/flips.csv")
  for p in "${candidates[@]}"; do [[ -f "$p" ]] && FLIPS_FILE="$p" && break; done
fi
if [[ -z "${FLIPS_FILE:-}" || ! -f "$FLIPS_FILE" ]]; then
  echo "❌ flips.csv not found. Set FLIPS_FILE=/abs/path/to/flips.csv and rerun."; exit 1; fi
echo "📄 Using flips file: $FLIPS_FILE"

# ---------- Step 1: process ----------
if (( QUIET )); then
  echo "⚙️  Processing data..."
  t0=$(date +%s)
  if ! npm run -s process-flips >/dev/null; then
    echo "❌ Data processing failed."
    exit 1
  fi
  t1=$(date +%s)
  brief_summary
  echo "⏱️  Processed in $((t1 - t0))s"
else
  echo "=========================================="
  echo " Step 1: Processing flip data"
  echo "=========================================="
  npm run process-flips
fi


# ---------- Step 2: diff ----------
if git diff --quiet --exit-code -- public/data; then
  echo "ℹ️  No data changes."; CHANGES=0
else
  CHANGES=1
  if (( VERBOSE )); then
    echo "🧾 Changes in public/data:"
    git diff --name-only -- public/data
  else
    cnt=$(git diff --name-only -- public/data | wc -l | awk '{print $1}')
    echo "🧾 Data changes: ${cnt} file(s)."
  fi
fi

# ---------- Step 3: commit & push (data only) ----------
PUSHED=0
if (( CHANGES )); then
  git add -A public/data
  CC_MSG="chore(data): refresh public data ($(date '+%Y-%m-%d %H:%M %Z'))"
  commit_no_verify=""; push_no_verify=""
  [[ "${BYPASS_HUSKY:-0}" -eq 1 ]] && commit_no_verify="--no-verify" && push_no_verify="--no-verify"

  set +e
  git commit -q $commit_no_verify -m "$CC_MSG" -- public/data
  commit_rc=$?
  set -e
  if (( commit_rc != 0 )); then
    echo "❌ Commit failed (hooks?). Using: $CC_MSG"; KEEP_FLIPS=1; exit 1; fi

  branch=$(git rev-parse --abbrev-ref HEAD)
  sha=$(git rev-parse --short HEAD)
  echo "📝 Committed ${sha} on ${branch}"

  set +e
  if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    git push -q $push_no_verify
  else
    git push -q $push_no_verify -u origin "$branch"
  fi
  push_rc=$?
  set -e

  if (( push_rc != 0 )); then
    echo "🔁 Push rejected (likely non-fast-forward). Attempting auto fetch + rebase..."

    # Determine upstream remote/branch if configured
    upstream=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)
    if [ -n "$upstream" ]; then
      remote="${upstream%%/*}"
      remote_branch="${upstream#*/}"
    else
      remote="origin"
      remote_branch="$branch"
    fi

    git fetch "$remote" || { echo "❌ Fetch failed"; KEEP_FLIPS=1; exit 1; }

    set +e
    git rebase --autostash "$remote/$remote_branch"
    rebase_rc=$?
    set -e

    if (( rebase_rc != 0 )); then
      echo "⚠️  Rebase conflicts detected. Preferring locally generated public/data ..."
      # Keep our newly generated data on conflicts in public/data
      git checkout --ours -- public/data || true
      git add public/data || true
      set +e
      git rebase --continue
      rebase_rc=$?
      set -e
      if (( rebase_rc != 0 )); then
        echo "❌ Rebase failed. Aborting. Your local changes are preserved."
        git rebase --abort || true
        KEEP_FLIPS=1; exit 1
      fi
    fi

    echo "🔁 Retrying push after rebase..."
    set +e
    if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
      git push -q $push_no_verify
    else
      git push -q $push_no_verify -u "$remote" "$branch"
    fi
    push_rc=$?
    set -e
    if (( push_rc != 0 )); then
      echo "❌ Push failed after auto-rebase — keeping flips.csv for retry."
      KEEP_FLIPS=1; exit 1
    fi
  fi

  echo "🚀 Pushed."
  PUSHED=1
fi

# ---------- Step 4: cleanup ----------
if [[ "${KEEP_FLIPS:-0}" -eq 1 ]]; then
  echo "↩️  KEEP_FLIPS=1 — leaving: $FLIPS_FILE"
else
  if (( CHANGES == 0 || PUSHED == 1 )); then
    rm -f "$FLIPS_FILE" && echo "🧹 Deleted: $FLIPS_FILE" || echo "⚠️  Could not delete: $FLIPS_FILE"
  else
    echo "↩️  Skipping deletion to preserve input: $FLIPS_FILE"
  fi
fi
