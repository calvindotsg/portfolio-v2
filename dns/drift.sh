#!/usr/bin/env bash
#
# Decide, from octodns-sync's own output, whether the live zone drifted from the zone file.
#
# WHY THIS IS NOT A ONE-LINE GREP IN THE WORKFLOW. octodns-sync exits 0 whether or not it found
# changes, so the exit code answers nothing. The first version of this read one signal — the
# `checksum=<sha256>` line, emitted only when there is at least one change — and treated its
# ABSENCE as "no changes". That is fail-open: the realistic way that line stops matching is a
# format change on a version bump, and the failure it produces is a Monday drift run reporting
# "No changes" while blind. A drift check that cannot tell must go red, not green.
#
# So read BOTH signals and require them to agree. octoDNS prints exactly one of them, verified on
# octodns 1.21.0 in both directions (a plan with one added record: checksum present, "No changes
# were planned" absent; a plan against a matching zone: the reverse):
#
#   checksum=<64 hex>          -> there is at least one change   (manager.py:1128)
#   "No changes were planned"  -> there are none
#
# Anything else — both, or neither — means this parser no longer understands octodns' output, and
# is reported as such rather than guessed at.
#
#   drift.sh <plan-output-file>
#     stdout "CLEAN"            exit 0   the zone matches the file
#     stdout "DRIFT <checksum>" exit 0   they disagree; the checksum names the plan to apply
#     stderr <reason>           exit 2   the output could not be read; treat as drift until known
#
# Executed by tests/dns-config.test.ts against fixtures of every shape above, under `pnpm test` —
# so the cases run on every pull request, not only on one that touches dns/.

set -euo pipefail

plan_file=${1:?usage: drift.sh <plan-output-file>}

if [ ! -r "$plan_file" ]; then
  echo "drift.sh: cannot read '$plan_file' — the plan step must write its output there" >&2
  exit 2
fi

# `|| true` because grep exits 1 on no match, which is an expected outcome here, not an error.
checksum=$(grep -o 'checksum=[0-9a-f]\{64\}' "$plan_file" | head -1 | cut -d= -f2 || true)

quiet=no
if grep -qF 'No changes were planned' "$plan_file"; then
  quiet=yes
fi

if [ -n "$checksum" ] && [ "$quiet" = yes ]; then
  echo "drift.sh: octodns printed BOTH a checksum and 'No changes were planned'. These are meant to be mutually exclusive, so one of the two signals has changed meaning. Refusing to guess." >&2
  exit 2
fi

if [ -z "$checksum" ] && [ "$quiet" = no ]; then
  echo "drift.sh: octodns printed NEITHER a checksum nor 'No changes were planned', so whether the zone drifted cannot be determined from its output. This is what a version bump that changed the output format looks like. Treating it as unreadable rather than as 'no changes'." >&2
  exit 2
fi

if [ -n "$checksum" ]; then
  echo "DRIFT $checksum"
else
  echo "CLEAN"
fi
