#!/usr/bin/env bash
#
# Ask a live origin whether the edge in front of it is still configured the way this
# repository assumes, and say so loudly when it is not.
#
# WHY THIS IS NOT PART OF THE DEPLOY. The deploy job answers "did the bytes I just built reach
# the edge?", which is caused by the deploy and belongs where a failure means the deploy failed.
# This answers "is something rewriting them on the way out?", which is DRIFT: nobody deployed
# when a zone setting changed, and binding the question to a deploy would redden a build for
# something the build did not cause while noticing only when someone happens to ship. The same
# argument, in the same words, is in the header of the DNS workflow, which is the scheduled
# drift job this one is modelled on.
#
# WHY IT MUST FAIL CLOSED, and what that costs. Read the header of `dns/drift.sh`: a drift check
# that cannot tell has to go red, not green, because the realistic way one stops working is that
# the thing it reads changes shape, and the failure that produces is a scheduled run reporting
# "clean" while blind. So a non-200, a body too short to contain the page, or a body missing the
# marker every render of this site carries is exit 2 — undetermined — and never exit 0.
#
#   origin-canary.sh <origin-url>
#     exit 0   the origin serves what the artifact says it should
#     exit 1   DRIFT — at least one named assertion failed; each is printed
#     exit 2   UNDETERMINED — the origin could not be read well enough to judge
#
# THE NON-DEGENERACY CONTROL IS A REAL ORIGIN RATHER THAN A FIXTURE, and running it is the only
# thing that proves these assertions discriminate. The Pages origin serves the identical bytes
# with none of the zone's controls attached, so it genuinely does not send
# `strict-transport-security` — a canary that passes against both is asserting nothing:
#
#   scripts/origin-canary.sh https://calvin.sg          # expect exit 0
#   scripts/origin-canary.sh https://calvindotsg.pages.dev   # expect exit 1
#
# THIS SCRIPT HOLDS NO CREDENTIAL AND MUST NOT ACQUIRE ONE. Everything it reads is public. That
# is what lets the workflow around it declare an empty permissions block, which makes it the
# lowest-privilege job in the repository — the right shape for the thing that watches everything
# else. The moment it needs a token it has stopped being a check on a public surface.

set -uo pipefail

origin=${1:?usage: origin-canary.sh <origin-url>}
origin=${origin%/}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

body=$work/body.html
head=$work/head.txt

# ONE FETCH, TO A FILE, AND EVERY ASSERTION READS THE FILE. Measured previously on this origin:
# a post-deploy fetch can be stale despite `cf-cache-status: DYNAMIC`, and one fetch per grep
# straddles the warm-up — two greps then read two different responses and disagree for reasons
# that have nothing to do with the zone. `--fail` is deliberately NOT used: it suppresses the
# body on an error status, and the status is what this needs to report.
if ! curl -sS --max-time 30 -D "$head" -o "$body" "$origin/"; then
  echo "origin-canary: could not fetch $origin/ at all. Treating as undetermined rather than clean." >&2
  exit 2
fi

status=$(awk 'toupper($1) ~ /^HTTP/ {print $2}' "$head" | tail -1)
if [ "$status" != "200" ]; then
  echo "origin-canary: $origin/ answered $status. A canary cannot read a zone's behaviour out of an error page, so this is undetermined rather than clean." >&2
  exit 2
fi

# A TRUNCATED BODY IS THE FAILURE THAT LOOKS LIKE A PASS. Every assertion below is an ABSENCE
# check or a lookup, so an empty file satisfies most of them — the marker and the floor are what
# stop a half-delivered response reading as a clean origin.
bytes=$(wc -c < "$body" | tr -d ' ')
if [ "$bytes" -lt 2000 ]; then
  echo "origin-canary: $origin/ returned only $bytes bytes, which is far short of any render of this page. The absence checks below would all pass on a truncated body, so this is undetermined." >&2
  exit 2
fi
if ! grep -qi '</html>' "$body"; then
  echo "origin-canary: $origin/ returned $bytes bytes with no closing html tag, so the response is truncated or is not this site. Undetermined." >&2
  exit 2
fi

findings=0
fail() {
  echo "origin-canary: DRIFT — $1"
  findings=$((findings + 1))
}

# ---------------------------------------------------------------------------
# What an HTML rewriter at the edge leaves behind.
#
# Rocket Loader was ON for this zone until plan 034 turned it off, and what it did is the
# reason this file exists: it rewrote four of the five shipped script tags and injected its own
# loader, which deferred the pre-paint theme resolver that the layout documents as running
# before first paint. Email Obfuscation and Server-Side Excludes are the other two rewriters,
# inert today because no mailto is rendered and no marker exists — so both would arm silently
# the day the content changes, which is exactly what a canary is for.
#
# ALL THREE ARE CAUGHT BY WHAT THEY INJECT, not by reading a setting. Reading the setting needs
# a credential this repository does not have; reading the OUTPUT needs nothing, and is the
# stronger question anyway — it is the reader's bytes rather than the dashboard's opinion.
# ---------------------------------------------------------------------------

if grep -q 'rocket-loader' "$body"; then
  fail "the served HTML references rocket-loader. Rocket Loader is on for this zone; it defers the pre-paint theme script and reintroduces the light flash that script exists to prevent."
fi

if grep -q '/cdn-cgi/' "$body"; then
  fail "the served HTML references /cdn-cgi/, so an edge feature has injected something into the page. Email Obfuscation rewrites a mailto into /cdn-cgi/l/email-protection and Rocket Loader injects a loader from the same prefix; neither is in the artifact this repository builds."
fi

# A rewritten tag looks like `<script type="a1b2c3d4e5f6a7b8-text/javascript">`. Matching the
# hex-then-dash prefix rather than the word "text/javascript" is what makes this specific to a
# rewriter: the artifact's own tags carry no type at all.
rewritten=$(grep -o 'type="[0-9a-f]\{16,\}-' "$body" | wc -l | tr -d ' ')
if [ "$rewritten" != "0" ]; then
  fail "$rewritten script tag(s) carry a rewritten type attribute. The artifact ships none, so an edge rewriter has taken ownership of when this page's scripts run."
fi

# ---------------------------------------------------------------------------
# The headers, and the one that tells the two origins apart.
#
# THE ARTIFACT'S OWN HEADERS ARE READ FROM THE FILE THAT DECLARES THEM rather than listed here,
# because listing them is the enumeration-in-two-places failure this repository has a rule
# about: adding a header to that file and forgetting this line would leave the canary quietly
# checking the old set. The file is parsed for its `/*` block, which is the rule that applies to
# every path.
#
# `strict-transport-security` IS NAMED SEPARATELY AND ON PURPOSE. It is deliberately absent from
# that file — it is a transport decision belonging to whoever owns the zone, and the Pages origin
# does not send it. That makes it the single assertion that discriminates between the two
# origins, which is what the non-degeneracy control at the top of this file exercises. Deleting
# this line would leave a canary that passes against an origin with no zone in front of it.
# ---------------------------------------------------------------------------

headers_file=$(dirname "$0")/../public/_headers
if [ ! -r "$headers_file" ]; then
  echo "origin-canary: cannot read $headers_file, so the set of headers the artifact declares is unknown and this run would assert a set of zero. Undetermined." >&2
  exit 2
fi

# Everything indented under the `/*` rule, up to the next unindented line.
declared=$(awk '/^\/\*[[:space:]]*$/ {inblock=1; next} inblock && /^[^[:space:]]/ {inblock=0} inblock && /^[[:space:]]+[a-zA-Z-]+:/ {sub(/:.*/, "", $1); print tolower($1)}' "$headers_file")

if [ -z "$declared" ]; then
  echo "origin-canary: found no header names under the /* rule in $headers_file. That file's format has changed and this parser no longer understands it, so refusing to report a clean origin." >&2
  exit 2
fi

for name in $declared strict-transport-security; do
  if ! grep -qi "^$name:" "$head"; then
    fail "$origin/ does not send the $name header."
  fi
done

# ---------------------------------------------------------------------------
# The files this repository publishes verbatim at the root.
#
# Derived from the directory Astro copies rather than written out, for the same reason as the
# headers above. Names beginning with an underscore are skipped: those are configuration the
# host consumes and never serves, and asserting one is reachable would fail on a correct origin.
#
# WHAT THIS CATCHES THAT THE ARTIFACT CANNOT. A redirect rule, a WAF rule or a hotlink setting
# added at the zone can intercept one of these paths without any deploy happening — and one of
# them, the résumé, is the file whose staleness on a preview alias this plan was written about.
# ---------------------------------------------------------------------------

published=$(dirname "$0")/../public
for path in "$published"/*; do
  [ -f "$path" ] || continue
  name=$(basename "$path")
  case $name in _*) continue ;; esac
  code=$(curl -sS --max-time 30 -o /dev/null -w '%{http_code}' "$origin/$name" || echo "000")
  if [ "$code" = "000" ]; then
    echo "origin-canary: could not reach $origin/$name at all. Undetermined rather than clean." >&2
    exit 2
  fi
  if [ "$code" != "200" ]; then
    fail "$origin/$name answered $code, but this repository publishes that file at the root."
  fi
done

# ---------------------------------------------------------------------------
# Hotlink Protection, which is invisible to every request a canary makes by default.
#
# It answers 403 only when the `Referer` is foreign, so a bare fetch of the same URL above
# succeeds and reports nothing. The site's own og:image is the file it blocks, so the setting
# costs exactly the honest consumers — a social card unfurled from another host — while Pages
# bandwidth is unmetered and `Referer` is client-supplied. That is why it is off, and why this
# asks the question in the only way that can see it.
# ---------------------------------------------------------------------------

card=$(grep -o 'property="og:image" content="[^"]*"' "$body" | grep -o 'https\?://[^"]*' | head -1)
if [ -z "$card" ]; then
  echo "origin-canary: the served HTML declares no og:image, so the hotlink assertion has no subject and would pass vacuously. Undetermined." >&2
  exit 2
fi

foreign=$(curl -sS --max-time 30 -o /dev/null -w '%{http_code}' -H 'Referer: https://www.linkedin.com/' "$card" || echo "000")
if [ "$foreign" = "000" ]; then
  echo "origin-canary: could not reach $card with a foreign Referer. Undetermined." >&2
  exit 2
fi
if [ "$foreign" != "200" ]; then
  fail "$card answered $foreign to a request carrying a foreign Referer. Hotlink Protection blocks this site's own og:image, so every social card unfurled from another host is broken."
fi

if [ "$findings" -ne 0 ]; then
  echo "origin-canary: $findings assertion(s) failed against $origin. These are properties of the EDGE rather than of the artifact, so the fix is in the Cloudflare dashboard and never in this repository — see dns/README.md for what is configured and why." >&2
  exit 1
fi

echo "origin-canary: $origin serves what the artifact declares — no injected loader, no rewritten script tags, every declared header present, every published root file reachable, and the card readable from a foreign referrer."
