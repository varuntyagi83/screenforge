#!/bin/bash
# ============================================================
# ScreenForge — Automated Build Runner for Claude Code
# ============================================================
#
# USAGE:
#   chmod +x run-build.sh
#   ./run-build.sh              # Run all phases from the start
#   ./run-build.sh --from 5     # Resume from phase 5
#   ./run-build.sh --only 7     # Run only phase 7
#
# PREREQUISITES:
#   - Claude Code CLI installed: npm install -g @anthropic-ai/claude-code
#   - ANTHROPIC_API_KEY set in environment
#   - PLAN.md in the same directory as this script
#
# HOW IT WORKS:
#   1. Reads PLAN.md (single file with all 20 phases)
#   2. Splits it into phases using <!-- PHASE NN --> markers
#   3. Feeds each phase to Claude Code with project context
#   4. Runs validation gate after each phase
#   5. If validation fails, re-feeds errors to Claude Code (up to 3 retries)
#   6. Logs everything to build-log/
# ============================================================

set -euo pipefail

# ── Config ──────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLAN_FILE="$PROJECT_DIR/PLAN.md"
LOG_DIR="$PROJECT_DIR/build-log"
MAX_RETRIES=3
RESUME_FROM=1
ONLY_PHASE=""
TOTAL_PHASES=20

# ── Parse arguments ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --from)
      RESUME_FROM="$2"
      shift 2
      ;;
    --only)
      ONLY_PHASE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./run-build.sh [--from N] [--only N]"
      echo "  --from N    Resume from phase N"
      echo "  --only N    Run only phase N"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# ── Verify PLAN.md exists ──────────────────────────────────
if [ ! -f "$PLAN_FILE" ]; then
  echo "❌ PLAN.md not found at: $PLAN_FILE"
  echo "   Place PLAN.md in the same directory as this script."
  exit 1
fi

# ── Setup ───────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── Extract phase content from PLAN.md ──────────────────────
# Splits on <!-- PHASE NN --> markers
extract_phase() {
  local phase_num=$1
  local padded=$(printf "%02d" "$phase_num")
  local next_num=$((phase_num + 1))
  local next_padded=$(printf "%02d" "$next_num")

  if [ "$phase_num" -eq "$TOTAL_PHASES" ]; then
    # Last phase: from marker to end of file
    sed -n "/<!-- PHASE ${padded} -->/,\$p" "$PLAN_FILE"
  else
    # Extract between current and next phase marker
    sed -n "/<!-- PHASE ${padded} -->/,/<!-- PHASE ${next_padded} -->/{ /<!-- PHASE ${next_padded} -->/!p; }" "$PLAN_FILE"
  fi
}

# Extract the header/context (everything before Phase 01)
extract_context() {
  sed -n "1,/<!-- PHASE 01 -->/{ /<!-- PHASE 01 -->/!p; }" "$PLAN_FILE"
}

# ── Helper functions ────────────────────────────────────────

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

log() {
  echo "[$(timestamp)] $1" | tee -a "$LOG_DIR/build.log"
}

run_claude_code() {
  local prompt="$1"
  local phase_num="$2"
  local attempt="$3"
  local log_file="$LOG_DIR/phase-${phase_num}-attempt-${attempt}.log"

  log "  Running Claude Code (attempt $attempt)..."

  claude --print \
    --dangerously-skip-permissions \
    "$prompt" \
    2>&1 | tee "$log_file"

  return ${PIPESTATUS[0]}
}

run_validation() {
  local phase_num="$1"
  local log_file="$LOG_DIR/phase-${phase_num}-validation.log"

  log "  Running validation gate..."

  if [ ! -f "$PROJECT_DIR/screenforge/package.json" ]; then
    log "  ⚠ Project not yet initialized (Phase 1 may not be complete yet)"
    return 0
  fi

  cd "$PROJECT_DIR/screenforge"

  local validation_passed=true

  if pnpm typecheck 2>&1 | tee -a "$log_file"; then
    log "  ✅ typecheck passed"
  else
    log "  ❌ typecheck failed"
    validation_passed=false
  fi

  if pnpm lint 2>&1 | tee -a "$log_file"; then
    log "  ✅ lint passed"
  else
    log "  ❌ lint failed"
    validation_passed=false
  fi

  if pnpm test 2>&1 | tee -a "$log_file"; then
    log "  ✅ tests passed"
  else
    log "  ❌ tests failed"
    validation_passed=false
  fi

  # Build check on verification phases
  if [[ "$phase_num" =~ ^(7|12|17|20)$ ]]; then
    if pnpm build 2>&1 | tee -a "$log_file"; then
      log "  ✅ build passed"
    else
      log "  ❌ build failed"
      validation_passed=false
    fi
  fi

  cd "$PROJECT_DIR"

  if $validation_passed; then
    return 0
  else
    return 1
  fi
}

# ── Main build loop ─────────────────────────────────────────

log "============================================================"
log "ScreenForge Automated Build — Starting"
log "Reading phases from: $PLAN_FILE"
log "============================================================"

# Get project context (everything before Phase 01)
PROJECT_CONTEXT=$(extract_context)

# Determine which phases to run
if [ -n "$ONLY_PHASE" ]; then
  phases_to_run=("$ONLY_PHASE")
else
  phases_to_run=()
  for i in $(seq "$RESUME_FROM" "$TOTAL_PHASES"); do
    phases_to_run+=("$i")
  done
fi

log "Phases to run: ${phases_to_run[*]}"
log ""

for phase_num in "${phases_to_run[@]}"; do
  phase_content=$(extract_phase "$phase_num")

  if [ -z "$phase_content" ]; then
    log "❌ Could not extract Phase $phase_num from PLAN.md"
    log "   Make sure <!-- PHASE $(printf '%02d' $phase_num) --> marker exists"
    exit 1
  fi

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "PHASE $phase_num"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Build prompt: project context + phase instructions
  prompt="You are building the ScreenForge screen recorder application.

Here is the project specification and architecture:
---
$PROJECT_CONTEXT
---

Now execute the following phase. Follow EVERY instruction precisely. Write ALL code, create ALL files, run ALL commands. Do not skip anything. Do not ask questions — just build it.

After completing all instructions, run the VALIDATION GATE commands at the end and fix any issues before finishing.

---
$phase_content"

  # Retry loop
  attempt=1
  phase_passed=false

  while [ $attempt -le $MAX_RETRIES ]; do
    log "  Attempt $attempt of $MAX_RETRIES"

    if run_claude_code "$prompt" "$phase_num" "$attempt"; then
      log "  Claude Code completed"
    else
      log "  ⚠ Claude Code exited with error"
    fi

    if run_validation "$phase_num"; then
      log "  ✅ Phase $phase_num PASSED"
      phase_passed=true
      break
    else
      log "  ❌ Phase $phase_num validation FAILED (attempt $attempt)"

      if [ $attempt -lt $MAX_RETRIES ]; then
        validation_errors=$(cat "$LOG_DIR/phase-${phase_num}-validation.log" 2>/dev/null || echo "Validation failed")

        prompt="The previous Phase $phase_num had validation failures. Here are the errors:

---
$validation_errors
---

Fix ALL of these errors. Run the validation commands again after fixing:
- pnpm typecheck
- pnpm lint
- pnpm test

Do not rewrite working code. Only fix the specific errors shown above."

        log "  Retrying with error context..."
      fi

      attempt=$((attempt + 1))
    fi
  done

  if ! $phase_passed; then
    log ""
    log "❌ PHASE $phase_num FAILED after $MAX_RETRIES attempts"
    log "   Check logs in: $LOG_DIR/"
    log "   Fix manually, then resume with: ./run-build.sh --from $phase_num"
    exit 1
  fi

  log ""
done

log "============================================================"
log "🎉 ALL PHASES COMPLETE — ScreenForge is ready!"
log "============================================================"
log ""
log "Next steps:"
log "  1. Review build logs in $LOG_DIR/"
log "  2. Run manual walkthrough (Phase 20, Step 9)"
log "  3. Deploy: cd screenforge && vercel --prod"
