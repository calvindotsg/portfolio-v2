#!/usr/bin/env bash
#
# Executes dns/drift.sh against fixtures of all four output shapes.
#
# The fixtures are not invented: the CLEAN and DRIFT ones are the literal lines octodns 1.21.0
# printed on 2026-07-31 — CLEAN from the live plan job against calvin.sg, DRIFT from a local run
# of two YamlProviders differing by one added record. The two failure fixtures are the shapes a
# format change would produce, which is the whole point of the cross-check.
#
#   bash dns/test_drift.sh     # from the repository root; no network, no credentials

set -uo pipefail

here=$(cd "$(dirname "$0")" && pwd)
drift="$here/drift.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

passed=0
failed=0

check() {
  local name=$1 want_status=$2 want_stdout=$3 body=$4
  printf '%s' "$body" > "$tmp/plan.txt"
  local out status
  out=$(bash "$drift" "$tmp/plan.txt" 2>/dev/null)
  status=$?
  if [ "$status" = "$want_status" ] && [ "$out" = "$want_stdout" ]; then
    printf '  \033[32mPASS\033[0m  %s\n' "$name"
    passed=$((passed + 1))
  else
    printf '  \033[31mFAIL\033[0m  %s\n          got      status=%s stdout=%s\n          expected status=%s stdout=%s\n' \
      "$name" "$status" "${out:-<empty>}" "$want_status" "$want_stdout"
    failed=$((failed + 1))
  fi
}

CS=3ba77b5bb4a88d80ad9b14733236ee74e88e0237e8d0e69a88a073308820f595

echo "── the two shapes octodns actually produces ───────────────────────────────────"
check "a matching zone reports CLEAN" 0 "CLEAN" \
  "INFO  CloudflareProvider[cloudflare] plan:   No changes
No changes were planned
"
check "a drifted zone reports DRIFT and the checksum to apply" 0 "DRIFT $CS" \
  "INFO  Plan
********************************************************************************
* calvin.sg.
********************************************************************************
Create <CNAME gallery.calvin.sg.>
INFO  Checksum checksum=$CS
"

echo
echo "── the controls: an output this parser cannot read must be RED, never CLEAN ───"
# This is the regression that matters. Before the cross-check, this fixture returned "no changes"
# and a scheduled run went green while the zone had drifted.
check "a plan with changes whose checksum line changed format is NOT reported clean" 2 "" \
  "INFO  Plan
Create <CNAME gallery.calvin.sg.>
INFO  Checksum sha256:$CS
"
check "both signals at once is a contradiction, not a coin toss" 2 "" \
  "No changes were planned
INFO  Checksum checksum=$CS
"
check "an empty plan file is unreadable, not clean" 2 "" ""

echo
# A missing file must also be an error rather than "clean" — same failure mode, different cause.
if bash "$drift" "$tmp/definitely-not-here.txt" >/dev/null 2>&1; then
  printf '  \033[31mFAIL\033[0m  a missing plan file is an error\n'
  failed=$((failed + 1))
else
  printf '  \033[32mPASS\033[0m  a missing plan file is an error\n'
  passed=$((passed + 1))
fi

echo
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
