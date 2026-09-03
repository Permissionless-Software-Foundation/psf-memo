#!/usr/bin/env bash
# Consolidated architect startup verification.
#
# Verifies every SwarmForge tool the architect needs is present, at the latest
# upstream version, and runnable — in a single command. Run this once at startup
# instead of issuing many separate checks. It is read-only: it never reinstalls
# or rebuilds tools, it only confirms they are ready.
#
# Usage: swarmforge/scripts/architect-startup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

pass=0; fail=0
ok()  { echo "  [ok]   $1"; pass=$((pass+1)); }
bad() { echo "  [FAIL] $1"; fail=$((fail+1)); }

echo "== Tool repos at latest upstream =="
for d in tmp/aps-spec tmp/crap4javascript tmp/dry4javascript tmp/mutate4javascript; do
  if [ ! -d "$d/.git" ]; then
    bad "$d missing (reinstall per constitution)"; continue
  fi
  if ! git -C "$d" fetch --quiet origin 2>/dev/null; then
    bad "$d fetch failed"; continue
  fi
  head=$(git -C "$d" rev-parse HEAD)
  up=$(git -C "$d" rev-parse origin/HEAD 2>/dev/null \
       || git -C "$d" rev-parse origin/master 2>/dev/null \
       || git -C "$d" rev-parse origin/main 2>/dev/null || true)
  if [ -n "$up" ] && [ "$head" = "$up" ]; then
    ok "$d at latest"
  else
    bad "$d behind upstream (reinstall per constitution)"
  fi
done

echo "== Language tools (JavaScript) =="
if grep -q "Missing source file argument" \
    <<< "$(psf-memo-client/node_modules/.bin/mutate4javascript 2>&1)"; then
  ok "mutate4javascript"
else
  bad "mutate4javascript"
fi
if psf-memo-client/node_modules/.bin/dry4javascript >/dev/null 2>&1; then
  ok "dry4javascript"
else
  bad "dry4javascript"
fi
if psf-memo-client/node_modules/.bin/crap4javascript >/dev/null 2>&1; then
  ok "crap4javascript"
else
  bad "crap4javascript"
fi

echo "== APS Babashka tools =="
if grep -q "usage: gherkin-parser" \
    <<< "$(cd tmp/aps-spec && bb gherkin-parser 2>&1)"; then
  ok "gherkin-parser"
else
  bad "gherkin-parser"
fi
if grep -qF -- "--runner-worker is required" \
    <<< "$(cd tmp/aps-spec && bb gherkin-mutator 2>&1)"; then
  ok "gherkin-mutator"
else
  bad "gherkin-mutator"
fi

echo "== Runner adapters =="
for c in psf-memo-client psf-memo-db psf-memo-indexer; do
  [ -f "$c/acceptance/lib/runner-worker.js" ] \
    && ok "$c runner-worker" || bad "$c runner-worker"
done

echo "== Bloated build dirs (slow mutation copies) =="
# tmp/acceptance and target/mutation-workers are gitignored build artifacts
# that mutate4javascript copies into every worker. If they grow large, the
# worker copy alone can be many GB and mutation runs appear to hang. Flag any
# dir over the threshold so it can be cleaned before a mutation run.
BLOAT_KB=102400  # 100 MB
for d in psf-memo-client/tmp/acceptance psf-memo-client/target/mutation-workers \
         psf-memo-db/tmp/acceptance psf-memo-db/target/mutation-workers \
         psf-memo-indexer/tmp/acceptance psf-memo-indexer/target/mutation-workers; do
  if [ -d "$d" ]; then
    size_kb=$(du -sk "$d" 2>/dev/null | awk '{print $1}')
    if [ -n "$size_kb" ] && [ "$size_kb" -gt "$BLOAT_KB" ]; then
      bad "$d is ${size_kb}KB (clean with: rm -rf $d)"
    else
      ok "$d clean"
    fi
  else
    ok "$d absent"
  fi
done

echo
echo "Result: $pass ok, $fail fail"
[ "$fail" -eq 0 ]
