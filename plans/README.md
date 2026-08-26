# Implementation Plans

**Nothing is queued.** 038 and 039 are both done — merged as `0e78e22` (#213) and `b1eea8a`
(#217), archived, and live. They were written on 2026-08-26 after a measured review of the site's
control vocabulary, and both were revised before merging by an adversarial panel — four review
lenses, a refute-first skeptic per finding, then a judge. It raised twelve findings, eight
survived, and three were BLOCK; every one of them was invisible to `pnpm test`, for a reason worth
stating plainly here rather than rediscovering: **a numbered plan is a proposal and the suite
exempts it from the three gates that resolve a name against the tree.** Probed both ways at
`f767cf2` — a nonexistent path, a nonexistent script and an undeclared constant inside a plan leave
the suite green, and the same three tokens in a non-proposal document turn all three gates red. A
green run is not evidence about a plan file; review is.

**What executing those two added to that, and it is the same lesson twice.** The panel's eight
surviving findings were all about the plans' prose. Every defect that mattered surfaced only once
the code ran, and each is in `done/README.md`: from 038, a guard the plan prescribed that turns out
to be **unreachable**, an assertion whose discovery predicate made it **unfalsifiable**, and a 6px
horizontal overflow at 320px that no gate here can see because there is no layout engine in the
suite; from 039, a plan that **contradicted itself** about how many plated controls the page ends
with, a required regeneration whose gate **cannot see the class of change that owed it**, and a
central geometric claim that did not reproduce because the plan had mis-modelled the box it was
about. Most were found by mutating or by measuring rather than by reading. **Review hardens a
plan's reasoning; only execution measures it.**

**And 039 added one that generalises past this repository**: read a STOP condition's *consequence*,
not only its predicate. Its predicate was false and the consequence it guarded against — "the
height saving this plan promises is not there" — was false in the other direction, by up to 607px.

The rest of this section is the record up to that point.

**Nothing was queued between 037 and 038.** The two-run security audit of this repository completed on 2026-08-18
and produced the first proposals here since 028 landed; all of them — 029 through 034 — are merged,
archived and live, as are plans 024–028 and 035. 036 and 037 were the first proposals written since
this directory last emptied, and both are done. **Neither came from an audit, and that is what
makes them a different shape from everything above them**: the six audit plans each closed a defect
the code already had, while 036 closed a duplication that a change of ours CREATED — the
design-system export in #203 left this repository describing its own vocabulary in two places that
could disagree. A plan whose subject is the cost of the last change is the one kind the numbering
here had not seen. 037 followed 036 rather than standing beside it, adding the markdown surfaces
on top of the single source 036 created; both are live.

**035 is the first plan whose defect was in its own prescribed CODE rather than in a premise, and it
shipped green.** Six runs of executors measuring what a plan asserted, and nobody checked whether the
snippet a plan told them to type obeyed this repository's documented conventions: step 1 put a
mailbox, an external URL and a maintenance date in `src/pages/`, which the Configuration rule does not
allow as a home for any of them. Every gate passed, because that rule is prose. Read a plan's code
against `CLAUDE.md` before typing it, the same way its premises get measured rather than read — see
[`done/README.md`](done/README.md) § "Plan 035" for what it cost and why a gate for it is harder than
it looks.

**Every plan in this set so far has carried defects its executor had to measure rather than read,
and 032 is the first whose executor DELETED one of the plan's own findings** — it claimed a gate was
vacuous, the mutation it named to prove that came back red, and the step was not taken. That makes
six consecutive runs in which the advisor/executor split has paid for itself. See
[`done/README.md`](done/README.md) § "Plan 030", § "Plan 031" and § "Plan 032" for what that cost,
and for the regression each plan's review panel then found in its own fix. 033 was the audit's
optional tail and is done: two of its six steps rested on a mechanism it had stated wrongly, and
both were caught by measuring rather than by reading. **034 could not go green until four Cloudflare
zone settings were off, and that is now the first precondition in this directory that was actually
met** — the plan named them and stopped rather than weakening an assertion to pass, and they were
turned off through the signed-in dashboard's own API before step 1 was written. Its executor also
answered a STOP condition instead of obeying it: see [`done/README.md`](done/README.md) § "Plan 034"
for why a count of 133 and a measurement of 61 were both correct. Read each plan's own Status block
for its dependencies; do not infer them from the numbering, which is leverage order rather than a chain.

**The audit stopped short of a plan on purpose, and its artifacts live outside this repository.**
Every plan below inlines what it needs, so an executor does not have to find them.

**028 was the FIRST plan handed to a fresh session** rather than run by its author — the upstream
advisor/executor split this directory had otherwise only used in one direction — and that
separation is what paid off. 029 was the second and repeated the result exactly. Every correction the executor made came from measuring something the
plan asserted rather than from reading it, which is the argument for the split stated as an
outcome. The corrections themselves are listed at the top of
[`done/028-close-the-step-guard-hole-and-take-two-majors.md`](done/028-close-the-step-guard-hole-and-take-two-majors.md);
do not re-count them here, because a figure in this file and a list in that one is the
enumeration-in-two-places failure this directory has a rule about.

**What the handoff actually proved.** A plan is a claim about a repository, and the only thing
that tests a claim is running it. 028's own worked example is worth keeping: it told the executor
to mutate a step guard to `${{ false }}` and read a red suite as "the hole is already closed". The
suite does go red on that spelling — as a LEXER CRASH, in the helper the plan was about to fix —
so obeying the plan meant abandoning the defect it was written to close. The advisor could not
have known that without executing it, and the executor could not have missed it while measuring.

**027 did not come from an audit run**, which makes it the second of its kind after 015: it came
from the maintainer resolving a repository-level event — this repository left the GitHub fork
network on 2026-08-16 — rather than from a finding. It used the `plan <description>` shape of the
upstream skill rather than audit-then-plan, and was written and executed in the same branch. It
is still written for a zero-context executor, because that is what made it reviewable, and a
five-lens panel did review it. See [`done/README.md`](done/README.md) § "Plan 027" for the
outcome, including the three follow-ups that panel measured and this plan deliberately did not
take.

Run 6 audited **this directory** rather than the source: every archived plan, this index, and
`done/README.md` were swept for items deferred, "recorded not fixed" or accepted as a coverage
gap during an earlier run, and each survivor was held against the live tree. The three that
survived with a measurement became 024–026 and everything else is in § "Run 6" below. They were
executed **in parallel**, which was safe because of a mechanism rather than a hope: each plan
re-measured its own suite baseline in its own worktree and none asserted an absolute total. Run 5
before it decoupled the race data and the
site copy from the code that renders them, and all five of plans 019–023 are merged, archived
and live. Four earlier runs are complete: plans 001–014 are all DONE,
merged, and live on https://calvin.sg, as is plan **015**, which came from the
maintainer resolving DIRECT-01 rather than from an audit run. Those plan files
and the full evidence log are archived in [`done/`](done/README.md).

Plans 019–023 were the first live plans since 2026-07-29, and they exist because **018** made a
live plan possible again: three name gates in `tests/docs-drift.test.ts` check what a
document names against the tree that exists, and a plan names the tree it intends to
create. 018 closed that in the same change that landed 019–023, which decouple the race
data and the site copy from the code that renders them. It is `done/` already — the
directory's own lifecycle, applied to the plan that reopened it.

Run 3 (2026-07-22, audited at `4e15674`, completed the same day) had two
mandated items from the maintainer (emoji→icons migration,
unnecessary-UnoCSS-classes cleanup — plans 011–012) plus a deep audit: nine
read-only opus auditors, one opus skeptic per finding. The audit returned
**3 findings, all skeptic-CONFIRMED, but two were the same defect** (the
entrance-stagger off-by-one, reported by both the correctness and debt
auditors) — net **2 surviving findings** (plans 013–014). Six categories
(security, performance, deps, DX, docs, direction) returned zero findings,
which on this baseline is the correct outcome. After run 3 the suite is **64
assertions** and the shipped page contains zero emoji and zero dead class
tokens (both now test-locked).

Run 2's deep audit had returned 8 findings, of which the adversarial skeptic
pass and advisor review left 2 worth acting on. Everything killed in any run
is recorded below so it is not re-derived.

This file is the **living index**: the state a new `improve` run needs before it
audits anything. Read it first.

## What governs this directory

`plans/` implements the **improve** skill pipeline from `github.com/shadcn/improve`.
Read it rather than this file for the pipeline itself — the plan template, the file
naming, the numbering rule, the advisor/executor split and the audit workflow all
live there and are deliberately **not** restated here. A copied convention goes stale
in silence, which is the failure `.devin/wiki.json` exists to record.

    pnpm dlx opensrc path shadcn/improve

then read `skills/improve/SKILL.md` and `skills/improve/references/plan-template.md`.
The closest in-tree exemplar of the template is [`done/015-automate-goal-progress-from-strava.md`](done/015-automate-goal-progress-from-strava.md).

What follows is only what is **local**, and therefore cannot be derived from upstream:

- **Completed plans move to [`done/`](done/README.md)** and are archived permanently.
  Upstream leaves them in place carrying a DONE status; this repo does not. This file
  stays the living index either way, and the archive is exempt from the prose gates.
- **This repository overrides the user-level plan lifecycle.** The global instruction
  is that plans are drafted in a home directory; here they are written into `plans/`.
- **A numbered plan is a proposal, and the suite treats that as its own document class.**
  It is exempt from the three gates that check a name against the tree that exists —
  paths, `pnpm` scripts and configured values — because a plan names the tree it intends
  to create. This file is not a proposal and is fully gated; so is everything else. The
  reason lives beside the predicate in `tests/docs-drift.test.ts`, not here.
- **A plan never waits outside `plans/`.** If a plan cannot land green because the change
  it depends on has not shipped, ship that change first — do not stage the plan somewhere
  gitignored, where it would not travel with a branch, appear in a PR, or survive a fresh
  clone. That was tried while closing this very gap and it is what the exemption above
  replaced.
- **"Your reviewer maintains `plans/README.md` — do not edit it" has ONE condition-triggered
  carve-out, and plan 021 is why.** This file is gated in full, so a plan that renames or
  deletes something this file names in backticks makes it red *as part of the change*, and
  the executor then has no green branch: obeying the instruction fails the plan's own "all
  pass" criterion. Where that happens the executor still leaves the file alone and says so;
  the **reviewer** makes the smallest edit that retargets the reference, in its own commit,
  named in the PR body. The status table and the archive stay the reviewer's alone either
  way. A plan whose steps redden this file without saying who fixes it is a plan defect,
  not an execution one.

## If you are starting a new run

- **The next number is one below the last row of the execution table.** Do not
  restart at 001 and do not reuse a number; the table is the only thing that knows,
  which is why no figure is written here.
- **Do not re-audit the refuted findings or re-propose CI** — see below. Six
  findings were killed by an adversarial skeptic pass with evidence; re-deriving
  them wastes a full audit cycle that has already been paid for once.
- **The "deliberately not planned" item is the maintainer's call**, not an
  agent's. It is not an oversight. (DIRECT-01, formerly the second, was resolved
  by the maintainer on 2026-07-22 → plan 015.)
- **Re-verify the baseline below before trusting it.** It was true at `f129245`.
  Every failure in the last run came from a plan believing something about the
  repo that had stopped being true — not from bad code.

### ⚠️ The standing run prompt goes stale between runs — the baseline below wins

The re-pasted run prompt has carried a stale premise both times: run 1's said
*"this repo has zero automated tests"* (there were tests by then), run 2's said
*"51 assertions"* and *"6 high advisories"* (now **53** and **1 moderate** after
plans 009–010). Treat every number in the prompt as unverified until checked
against the baseline table below; the suite must always be **extended**, never
recreated.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | Establish a regression safety net | P1 | M | — | **DONE** (`6b2cfde`) |
| 002 | Prerender the site and delete the SSR adapter | P1 | M | 001 | **DONE** (`32071fe`) |
| 003 | Delete the client runtime: Svelte and motion out, CSS in | P1 | M | 002 | **DONE** (`621dd5a`) |
| 004 | Fix the rendered-output defects, and assert each one | P1 | M | 003 | **DONE** (`ef0da28`) |
| 005 | Delete dead configuration and template cruft | P2 | S | 004 | **DONE** (`255dbca`) |
| 006 | Replace astro-icon with UnoCSS presetIcons | P2 | S | 005 | **DONE** (`ad7c5bf`) |
| 007 | Correct the documentation and shipped metadata | P3 | S | 006 | **DONE** (`759ed8f`) |
| 008 | Serve the portrait at device resolution | P2 | XS | 002, 004 | **DONE** (`b14287d`) |
| 009 | Refresh the lockfile in-range, clearing 9 of 10 audit advisories | P2 | S | — | **DONE** (`c00dd73`) |
| 010 | Harden the layout head: no-JS default theme, dead og:image fallback, social-tag assertions | P2 | S | — | **DONE** (`1f06c27`) |
| 011 | Migrate every emoji to a UnoCSS presetIcons icon | P1 | M | — | **DONE** (`7950203`) |
| 012 | Remove the no-op UnoCSS classes and lock the class↔rule pairing | P2 | S | 011 | **DONE** (`6f0e24c`) |
| 013 | Fix the entrance-stagger off-by-one and lock the ladder to the card count | P2 | S | 012 | **DONE** (`8036d3c`) |
| 014 | Assert the Now card and Career dates/company survive the render | P3 | S | 011 | **DONE** (`b7439e7`) |
| 015 | Automate goal progress from Strava | P2 | M | — | **DONE** (`a4b419b`) |
| 016 | Stop shipping rationale comments in the built HTML | P2 | S | — | **DONE** (`c3734b1`) |
| 017 | Clear the clearable brace-expansion HIGH with an in-range lockfile refresh | P2 | S | — | **DONE** (`6647c31`) |
| 018 | Let a plan live in this directory again, and record what governs it | P1 | S | — | **DONE** (`232f751`) |
| 019 | Generate the projection's derived figures instead of writing them by hand | P1 | M | 018 | **DONE** (`14d652e`) |
| 020 | Make each race its own module, so adding one is adding a file | P1 | L | 019 | **DONE** (`46119ae`) |
| 021 | Split the copy out of `constants.ts` and delete the file | P2 | L | 020 | **DONE** (`4bf156d`) |
| 022 | Separate the data contract from behaviour, and promote the Strava tooling | P2 | L | 020 | **DONE** (`a00c819`) |
| 023 | Sweep the prose references no gate catches | P2 | M | 019, 020, 021, 022 | **DONE** (`5b9c794`) |
| 024 | Refresh the lockfile in-range, taking the audit from eight highs to two unpatchable ones | P1 | S | — | **DONE** (`c2558be`) |
| 025 | Assert what forced colours PAINT a mark, not merely that some rule reaches it | P2 | S | — | **DONE** (`4b9d5ea`) |
| 026 | Close the bare-filename gate's case gap, and give a foreign name a list of its own | P2 | M | — | **DONE** (`557af8f`) |
| 027 | Retire the fork premise, and govern all three dependency surfaces | P1 | M | — | **DONE** (`8e91ec2`) |
| 028 | Close the step-guard hole, and decide the two held major bumps | P1 | M | — | **DONE** (`c941e3a`) |
| 029 | Build the gated artifact in production mode, and bound the deploy step | P1 | S | — | **DONE** (`eae05af`) |
| 030 | Make every workflow gate cover every workflow | P1 | M | 029 | **DONE** (`85d5ff3`) |
| 031 | Validate what the two script seams accept | P2 | M | — | **DONE** (`6f8fbfe`) |
| 032 | Correct the reasons, and make the vacuous gates bite | P2 | M | 030 | **DONE** (`4583bd1`) |
| 033 | The six remaining hardenings | P3 | S | 029, 030 | **DONE** (`cca3d8b`) |
| 034 | Govern the origin, not just the artifact | P1 | M | 029, 030 + zone preconditions | **DONE** (`5b90ed0`) |
| 035 | Serve /.well-known/security.txt, and link it from SECURITY.md | P2 | S | — | **DONE** (`3f1d582`) |
| 036 | Serve the design system as a page, and generate the agent's copy from it | P2 | M | — | **DONE** (`f052f68`) |
| 037 | Serve the design system as markdown, in the repo and on the web | P3 | M | 036 | **DONE** (`0f923c4`) |
| 038 | Publish the chip, put one header on every page but the home page, and give the wall a markdown twin | P2 | L | 036, 037 | **DONE** (`0e78e22`) |
| 039 | Give the home page two tiers of control, and retire the icon plate | P2 | M | 038 | **DONE** (`b1eea8a`) |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

**Why 038 and 039 were two files, and why 039 could not have gone first.** 038 published the chip
as a real, gated kind of control; 039 spent it on the home page and deleted the icon plate the chip
made orphaned. The dependency was mechanical rather than editorial — 039's first STOP condition was
the chip's absence — so they were **not** parallel-safe, and 039 executed first would have deleted a
class its own replacement did not yet have. They also shared `uno.config.ts`,
`src/content/design.ts`, `src/pages/design.astro` and four test files, which is why 039 was
reconciled against the merged tree before it was dispatched; that reconcile is the reason its
execution found three plan defects rather than a stale excerpt.

**What made them necessary is one finding: the site shipped four kinds of pressable thing and
published three.** The wall's filter chip was spelled only as a descendant selector, was in no
census, and was invisible to `tests/control-geometry.test.ts`, which discovers controls by the
plate's signature in the shipped sheet — while the build-wide link-signifier gate already had to
name it as a special case. A gate knowing about a kind the design system does not is the defect;
038 closed it, and that gate now reads the chip's own class like every other kind.
Two consequences are decisions rather than discoveries and are recorded in the plans themselves: the
chip is floored at 44px on both axes, which **grew the wall's filter row from 29.59px** and is a
visible change to three pages nobody asked to redesign; and `/patches` gained a theme toggle, which it
had never had. 039 then spent that floor a second time — the home page's six destinations are 44px
glyph chips on one line where seven plated boxes took two.

**Why 036 and 037 were two files rather than one, and why 037 could not go first.** 036 made one new
content module the single authored source of this site's design vocabulary and rendered it as a page;
037 renders the same module as markdown. Splitting them kept each reviewable, and the order was a
real dependency rather than a preference — 037's whole subject is a renderer over a module that did
not exist until 036 landed. It exists now, so the dependency is discharged rather than merely
satisfied on paper, and the parallel-safety question is moot: **they were NOT parallel-safe**, both
touching that module, the design page and `tests/design-system.test.ts`, so unlike 031 they could not
have been run in separate worktrees at the same time. (Their own files are named in the plans, not here: this index is a current-state document
and is gated as one, so naming a path a plan intends to CREATE reddens the suite — which it did,
three times, while this note was being written.) One thing 037 deliberately does not do is merge
`.design-sync/conventions.md` into `DESIGN.md`; the two look interchangeable and are not, and the
reason is written out in 037's "Current state".

**Why 029–034 are six files rather than one.** Twenty-nine items in one pull request is not
reviewable, and the precedent here is a numbered chain of small ones — 019–023 was five. They are
numbered in leverage order. 031 shared no file with any of the others, which is what made it
parallel-safe, and it is the same mechanism run 6 relied on: each plan re-measures its own baseline
in its own worktree and **none asserts an absolute suite total**.

**Two of these plans carried work this repository cannot do.** 034's Cloudflare zone preconditions
were met before it started, and its retention step is the only permanently irreversible action in
the set — it deletes preview deployments, with the enumerate-and-report phase separated from the
delete phase for that reason, and the report reviewed in the pull request body before the delete ran.
032 edited this file's prose beyond a status row, which is normally the reviewer's alone; the
maintainer waived that for two specific corrections, and they landed in a commit of their own.

**What was deliberately NOT planned**, so it is not re-derived: the audit re-raised
`Person.nationality` (refuted as CORRECT-02 below), deleting `METADATA.email_obfuscated` (DEBT-01,
the maintainer's call), the published race calendar (the maintainer's, and the point of the site)
and `rel="noopener noreferrer"` (refuted as SEC-04 below). Branch protection on `main` was
considered and declined on a measurement rather than an opinion — a required status check breaks the
nightly bot's push, and a push-via-PR redesign needs a long-lived credential strictly more powerful
than the run-scoped `GITHUB_TOKEN` it would replace, because a `GITHUB_TOKEN` pull request does not
trigger workflows. Plan 032 recorded that reasoning in the tree.

**THAT DECISION WAS OVERTAKEN BY AN EVENT ON 2026-08-21, AND THE HALF THAT SURVIVES IS NOT THE HALF
THE PARAGRAPH LEANS ON.** The `calvindotsg/.github` baseline was applied to this repository from
outside it, so `main` now carries classic branch protection whether or not this directory declined
it, and the nightly died on the next run with `GH006: Protected branch update failed … Changes must
be made through a pull request`. Read the two reasons above separately, because they came apart:
the first is about a REQUIRED STATUS CHECK, and the baseline set none, so nothing stood between the
bot's pull request and its merge. The second reason is about identity, and it is the one that
actually decided the repair.

**BOTH HALVES HAVE SINCE BEEN SETTLED, THE SECOND ONE AGAINST THE PREDICTION THIS PARAGRAPH MADE.**
It said the second reason "bites only once a required check exists, and on that day the deadlock it
describes is real and unbreakable from inside the run". `build and test` is a required status check
on `main` as of 2026-08-23, so that day came the same week — and the deadlock did not happen. The
reason was right about the mechanism and wrong about the conclusion, because it assumed the pull
request would go on being opened by `GITHUB_TOKEN`. It is opened by the `calvindotsg-release` GitHub
App, and the suppression that would starve the check is a rule about the ACTING IDENTITY rather
than about pull requests: an App's events are not suppressed, so `ci.yml` runs on the bot's pull
request exactly as it does on a human's, and the check reports.

The run-scoped token turned out not to be enough either, for a reason neither half named: the
baseline also sets `can_approve_pull_request_reviews` false, and despite the name that governs
CREATING a pull request as well as approving one. So the ambient token could commit, push and merge,
and was refused at exactly one call. The repair was not a plan — it was an incident fix, taken in
one branch the way 027 was; `.github/workflows/strava-progress.yml` carries the whole argument.

**027 is the first plan whose premise was an event rather than a defect**, and that changes what
the plan has to guard. An audit finding is true until someone fixes it; this one was true only
while the repository sat outside the fork network, so the plan carries a STOP condition on
`.fork` reading `true` — because if the premise is wrong, every edit it prescribes makes the
documentation wrong in the OPPOSITE direction rather than merely failing. It also records an
operator section it cannot execute itself: three repository-settings writes that need admin
credentials. Plan 015 had one too — its preconditions were delivered separately and only
verified; 027 carries the commands themselves.

**Run 6's three plans touched disjoint files** — one moved only `pnpm-lock.yaml`, one added an
assertion to `tests/build-output.test.ts`, one changed `tests/docs-drift.test.ts`. They were
numbered in leverage order rather than in a chain, and all three executors ran at once. That is
the first parallel execution here, and what paid for it was deleting every absolute suite count
from the plans: 025 and 026 each add one assertion, so whichever landed second would have failed
a plan that said "532".

Plan 008 did not come from the audit — it was raised from a production PageSpeed
report mid-run and executed out of numeric order.

**The host and CI moved outside this numbering, and the table is silent about it
on purpose.** On 2026-07-30 the site left Netlify for Cloudflare Pages, with
`.github/workflows/ci.yml` becoming its only builder; the Netlify project and
`netlify.toml` are deleted. That work was planned and executed under a separate
lifecycle (`~/.claude/plans/done/019-cloudflare-migration.md`, archived there on
2026-07-31 once WP6 merged), so it has no plan file in this repository's
`plans/done/` and adding a row here would point at nothing. It is recorded
here because two entries below — the DX-01 rejection and the deploy-gate baseline
— would otherwise read as current policy and send a run to re-derive a decision
that has already been reversed.

**That work package closed on 2026-07-31 with DNS-as-code (`dns/`), the last item
in it.** One correction is worth carrying forward, because the plan asserted the
opposite and a future run would inherit it: WP6 proposed excluding the apex and
`www` CNAMEs as "Pages-managed". They are not. Cloudflare marks what it owns —
the Email Routing records carry `meta.email_routing`, the DKIM key also carries
`read_only` — and both CNAMEs carry `meta: {}`, i.e. they are ordinary
hand-managed records. They are in git. What the plan did *not* anticipate is the
`pagerules: true` default, which would have planned the deletion of the very
redirect rules WP5 had created the day before; `dns/config.yaml` turns it off and
`dns/test_filters.py` executes both settings to show the difference.

## Baseline: what this repo is now

Re-measured at `45e286f` (2026-07-29) and updated in place since. **Read every
figure below as of that measurement and re-derive anything you intend to rely on**
— this section has gone stale under its own heading four times, once carrying a
chain of four superseded assertion counts (277 → 362 → 402 → 410) against a real
451. Nothing here is gated for its VALUES: `tests/docs-drift.test.ts` resolves the
names in backticks and is structurally blind to a quoted number.

The commands are one line each: `pnpm test` for the suite, `pnpm check` and
`pnpm eslint` for the gates, `wc` and a local `gzip -9` or a production `curl`
with `content-encoding: br` confirmed for weight. What is worth recording here is
the SHAPE — one test file per gated concern, all of them run by that one command
— not the integer. **Do not add the next figure to a running list; replace it.**

Four maintainer-direct changes landed between runs with no plan number, and they
took none of the numbering with them: the control-geometry and page-fit fixes, one
Strava link with a brand-ink heart and a toggle reporting `aria-pressed`, the
`/patches` wall with its projection model, and the SC 1.4.12 text-resize work.
Each is written up where it can be checked — **in the source comments beside the
code it changed, and in its own PR** — rather than re-narrated here. This
sentence used to send the reader to `plans/done/` as well, and that was wrong:
the archive is the record of *numbered plans*, and none of these four has one.
Measured — the archive mentions none of `control-geometry`, `page-fit`,
`aria-pressed` or SC 1.4.12 even once.

| | value |
|---|---|
| output mode | `static` — no adapter, no SSR function, no middleware |
| astro integrations | `sitemap()`, `UnoCSS({injectReset: true})` — that is all |
| direct dependencies | derive: `jq '(.dependencies + .devDependencies) | length' package.json` (**21** at 2026-08-07) |
| client JavaScript | **zero external files**, which is not the same as none. **Four first-party scripts, all inline**, re-derived from the script elements in `dist/` at `0f923c4` rather than incremented: the pre-paint theme resolver and the press-hold (`data-leaving`) listener, both in `BasicLayout.astro` and on every page; `ThemeSwitcher`'s toggle listener, inlined as a module on every page that renders a toggle — the home page and, since 036, `/design`, which needs one because half of what it exists to show is that several tokens SWAP rather than darken; and, since 037, the copy-as-markdown handler on `/design` alone, which is an enhancement over a link that works without it and reveals its control only once it has run. Counting `<script>` elements will overcount by one on every page: the Umami tag is the site's only external script and it is third-party. The ~525 B figure quoted here before was the theme resolver alone, and it was labelled as the total. **Nothing gates this row**, and the general reason is enough: pinning a count is what puts a rotting fact somewhere nobody revisits. This entry used to add that a census gate "was written and then deliberately deleted", which git does not support — `git log --all -S 'querySelectorAll("script")' -- tests/` returns exactly one commit, and that commit ADDED the inline-script filter still live in `tests/rendered-html.test.ts`. No such gate has ever existed, so the row was resting a correct instruction on an event that did not happen. Re-derive the count from the script elements in `dist/` when you touch it |
| `<svg>` in the HTML | **zero** — icons are UnoCSS `presetIcons` mask rules |
| components | 11 components, 1 layout and a handful of page routes; **no UI framework**, no `.svelte`, no islands. **Derive the page set from the routes `pnpm build` prints** rather than reading a list here — this cell has enumerated it twice and been made incomplete twice, by `/.well-known/security.txt` (035) and by `/design` (036). What is stable is the shape: one route file per URL family, one of them a rest parameter that prerenders three, plus the generated text endpoints |
| `uno.config.ts` | derive: `wc -l uno.config.ts` (**700** at 2026-08-08) — safelist, blocklist, five `rem` breakpoints, the `hover-needs-a-pointer` preset and **four shortcuts** (`control-surface`, `control`, `control-cta`, `text-link`); mostly measured rationale. The figure here read 719 until run 6 re-derived it; the file was 700 lines at `219dcde` too, so that number was never right rather than having gone stale — which is what "derive" in this cell is for |
| tests | **628** assertions across **20** files (+ `tests/helpers/`, `tests/setup/`), run by `pnpm test`, re-derived 2026-08-26 at `0f923c4`. A 21st file, `tests/strava-verify.test.ts`, holds 7 more and is opt-in — it skips by default, so it contributes none of the 628. **DERIVE THIS, DO NOT ADD TO IT** — a running list of superseded counts lived here and was wrong every time it was read, because `docs-drift` resolves names that must EXIST and is structurally blind to a quoted VALUE. The SHAPE is what matters: one file per gated concern, all of them run by that one command, including `docs-drift` itself, which asserts this repository's prose against its code and splits it into three kinds — a current-state document (this table included) is gated for accuracy; `.devin/wiki.json`, a standing instruction read on every future generation, is gated for *durability*, forbidden from stating a count, a component filename or an exported constant at all and required to say where each is derived instead; and a numbered plan is a *proposal*, exempt from the checks that hold a name against a tree it exists to change. A further 13 checks live in `dns/test_filters.py`, which needs Python and octoDNS and so runs in `.github/workflows/dns.yml` rather than here |
| lint | `pnpm eslint` → **0 problems**; `pnpm check` → 0 errors, 2 hints |
| `pnpm audit` | derive: `pnpm audit --json \| jq .metadata.vulnerabilities` — **zero at every severity** since 2026-08-20 (`e53c53e`), and **no documented residual survives**. **Do not transcribe a figure; the advisory database moves with no commit here.** What is worth writing down is the TEST for a residual rather than a reason: a survivor is unpatchable when its `Patched versions` reads `<0.0.0`. The last two that did were the `image-size` ICNS and JXL/HEIF advisories, reached build-time only via `astro` → `unstorage` → `@netlify/blobs` → `@netlify/dev-utils`, and they are gone — not by a bump, which was never possible, but by pruning the residue the SSR adapter left when `32071fe` dropped it. **What this cell got wrong is worth more than what it got right.** It recorded the correct diagnosis for twelve days — a fresh resolve never installs `@netlify/blobs`, so this is orphaned peer resolution — and then priced the fix as *"re-resolving the whole tree, which needs its own plan and its own `dist/` comparison"*. Measured, it needed neither: `autoInstallPeers: false` in `pnpm-workspace.yaml` prunes 47 packages with **no version drift at all**, and the `dist/` comparison it demanded came out byte-identical. A residual outlives its diagnosis when the COST of clearing it is guessed rather than measured. **Every prior REASON recorded in this cell has since expired or come true**, which is why it names a derivation and a test instead of a story |
| deploy gate | **Changed after run 4.** `.github/workflows/ci.yml` — a `build` job runs `pnpm check`, `pnpm eslint` and `pnpm test`, uploads `dist/`, and two `wrangler pages deploy` jobs sit behind `needs: build` and publish that same artifact without rebuilding. It replaced `netlify.toml` running `pnpm check && pnpm test`; that file and the Netlify project are both deleted. `tests/workflow-guards.test.ts` is what holds the `needs:` edge |
| host | **Cloudflare Pages** (project `calvindotsg`), zone on Cloudflare DNS. Was Netlify until 2026-07-30 |
| DNS | **In git since 2026-07-31** — `dns/zones/calvin.sg.yaml` (octoDNS), planned and applied by `.github/workflows/dns.yml`. Ten of the zone's fifteen records; the three Email Routing `MX`, the `read_only` DKIM key and `_dmarc` are each excluded for a different reason, stated in `dns/config.yaml` beside the exclusion. **Live since 2026-07-31**: the first plan against the real zone reported *"No changes were planned"* (11 records returned, 3 rejected, 8 matched). Two zone-scoped tokens, read-only for planning and edit-only for applying — see `dns/README.md`; nothing in this repository can mint them |
| content source | split by kind (plan 021): `src/content/` holds the copy, `src/data/goals.ts` the two goals as authored, and the races are one module each under `src/data/races/`, collected by the `index.ts` beside them (plan 020). There is no single content file and deliberately no barrel |

The obvious simplifications were taken. A new run should expect *fewer and
smaller* wins than the first one found, and should say so plainly when a finding
is cosmetic.

## Findings considered and rejected

### The control-vocabulary design review (2026-08-26, specimens drawn at `f767cf2`)

Not an audit. Five header treatments and four intro-card treatments were built as live specimens in
the site's own tokens and measured in a browser, then chosen by the maintainer. What follows is what
was **rejected**, so no later run re-derives it. The reasoning sits in 038 and 039, both archived
under `done/` now that they have shipped; only the verdicts are here.

- **A plated header row.** Rejected on two measurements: `/patches` shipped **zero** plated controls
  even then, so this would have introduced the plate to a page that has none, one rung above a filter
  row drawn deliberately in the bib's treatments; and `uno.config.ts` reserves the plate as the mark
  for a primary action, which twelve plates of furniture across four pages dilutes. That reservation
  is now the whole rule — 039 deleted the plate's icon box, so the plate is spent on a card's single
  action and on nothing else.
- **A `Copy page` split button with a dropdown** — the Stripe / Mintlify / GitBook pattern. Rejected:
  an accessible menu-button contract would be the largest piece of client code on a domain that ships
  zero external JavaScript files and fails the build if one appears; every "Open in …" entry
  hard-codes a third-party origin; and it inverts the failure, making the clipboard the primary path
  and hiding the link that always works inside a menu that needs a script.
- **A copy-to-clipboard control at all.** The maintainer's call: opening the markdown page and
  selecting all reaches the same outcome with no client code. This *deletes* the site's only
  clipboard path rather than moving it.
- **"Copy as a prompt for Claude Code / Codex".** A control aimed at another control's document,
  copying either a URL the markdown link's `href` already is, or a sentence with no source of truth.
- **A skip link in the header.** WCAG 2.4.1's own Understanding document excludes "individual words,
  phrases or single links" from what counts as a block; ARIA landmarks are a sufficient technique on
  their own, and the header is three items.
- **A breadcrumb.** The site is two levels deep and the wall's filter row already does the sideways
  move.
- **Labelling the six intro-card destinations.** Measured: six labels need three lines in a 339px
  column, trading the density problem for the one it was meant to fix.
- **A neutral-bordered plate** (accent only on interaction). Removed the wall of red with one token
  change, but flattened a card's one action and a social link into one drawing and left the 112px
  row density untouched. 039 took the density instead: that row is 44px on one line now.
- **A visible label on the theme toggle.** SC 2.5.3 requires the accessible name to contain the
  visible label, and the name is deliberately the theme its pressed state means. 039 recorded it as
  worth revisiting via a fixed moon plus the chip's own filled state, which would make the toggle's
  state visible for the first time; that idea is still open and is now the cheapest of the three
  things 039 deferred.

**Deferred rather than rejected**, and named so it is not discovered late: the Now card's explainer is
a bare 24x24 glyph with no box, and below the target size every other control clears. 039 listed it
out of scope on purpose and it is now the **fourth** drawing on the home page rather than the fifth,
since the plated glyph box that made a fifth is gone. It is the obvious next plan: it is the last
control on that page that answers to none of the four kinds.

### Run 6 (2026-08-08, audited at `219dcde`) — a re-audit of the record, not of the source

Every earlier run audited the code. This one audited **this directory**: the twenty-three
archived plan files, `done/README.md` and this index, swept by three read-only agents for
anything deferred, "recorded not fixed", "noted not fixed", accepted as a coverage gap, or
conditional on a trigger. Roughly seventy candidates came back. Each was then held against
the live tree, and the three that survived with a **measurement** behind them became plans
024–026. What follows is everything else, so it is not swept for a third time.

**A recorded reason had EXPIRED, and that is the run's most transferable result.** Both
`pnpm audit` residuals were written down as unfixable by construction, and both are cleared by
an ordinary in-range refresh — but for opposite reasons, and the difference is the lesson. The
`brace-expansion` reason is simply **false now**: a patched `1.x` exists where the record says
*"no patched 1.x"*. The `@opentelemetry/core` entry, by contrast, **came true on schedule** —
it predicted that a bump to `@netlify/otel` would clear it, and that is what happened;
`6.0.5` still pins the package exactly, now at a patched version. Meanwhile six *new* high
advisories had appeared, so the documented floor of "1 moderate + 1 high" was reading as
current policy while the tool said 1 moderate + 8 high. A residual's REASON has a shelf life;
re-derive it before quoting it. Plan 024 is the fix and its maintenance note carries the
general form.

**Confirmed still open, and deliberately not planned this run:**

- **`main()` in `scripts/fetch-strava-progress.mjs` is unexported and untested**, so a
  ride/run field swap passes the whole suite. Recorded not fixed by plan 015's panel and
  untouched by plan 022, which promoted the surrounding tooling but scoped itself to the
  token path. Verified still true at `219dcde`: `kmFromMeters`, `singaporeDate`,
  `nextProgress` and `serialise` are exported and covered; `main()` is not. Not planned
  because the fix is a testability refactor of the one script a bot runs daily, and the
  failure it protects against is loud rather than silent — the swapped figures would be
  visible on the home page the next morning. Worth doing next to any other change in that
  file, not on its own.
- **The pre-paint theme script calls `localStorage.getItem` unguarded.** Deferred on purpose
  by plan 003 to keep the script byte-identical to its measured spike, and plan 010's head
  hardening did not claim it. Still unguarded. Its blast radius shrank when plan 010 made
  `data-theme="light"` the served default: a browser that throws on storage access now gets
  the designed light theme rather than an unstyled page. Taste-tier, two lines, no gate.
- **The entrance-stagger test pins only the tail rung**, so deleting a middle one passes.
  That is by design and is recorded in plan 013 — the tail is the observed regression class.
- **`.scratchpad/plan-018-panel/` outlived its stated retention condition** ("while 019–023
  are open"; they are closed). Housekeeping in a gitignored, session-shared directory, not a
  plan, and not to be swept without attributing what is in it.
- **`max-h-[415px]` on the portrait is dead code** — the element renders at 275px. Plan 008
  noted it and left it, because making it real is a design change. Unchanged; still the
  maintainer's call.

**One stale finding restated rather than dropped.** Plan 002 recorded that the
`calvindotsg.netlify.app` deploy alias was an indexable duplicate of `calvin.sg`, and that
*"no plan owns it"*. Netlify is gone, so the finding as written is dead — but the shape
survives the move: a Cloudflare Pages project serves `<project>.pages.dev` alongside the
custom domain. The canonical tag is emitted from the configured `site` and so points at
`calvin.sg` from either origin, which is the strong half of the mitigation; `robots.txt` is
generated with a single `Allow: /` and cannot be made host-conditional from a static build.
Whether to add a redirect rule is a dashboard decision and remains maintainer-owned.

**Not re-derived, and specifically not re-litigated:** plan 025 asserts what the shared
forced-colours rules *paint*, which is the first ponytail-panel item recorded below — the one
sized there as real and *"worth one assertion"*. It does **not** revisit the refuted item in
the same list, the claim that the icon-only gate should itself check the opt-out. That gate's
contract is unchanged and plan 025 puts its assertion in a sibling rather than in it, which is
the distinction the refutation turned on.

**Unchanged and still maintainer-owned**, each already recorded below or in `done/README.md`:
the booked/DNF bib outline's 2.13:1 contrast, the `ping` halo under `prefers-reduced-motion`,
`ABOUT_ME`'s thirteen-month-old "latest" challenge copy, `METADATA.email_obfuscated`, the
`llms.txt` projects asymmetry, the HSTS ramp, and the `preview.jpg` refresh.

### The ponytail-audit review panel (2026-08-07, 13 agents over the audit-application branch)

18 findings; 8 verified by an adversarial skeptic each, 4 more verified by hand out of
the unverified passthrough. The confirmed ones were fixed in the branch. **These five
were real and deliberately NOT fixed** — each is recorded with what makes it real, so a
future run neither re-derives it nor "fixes" a non-defect.

- **`CanvasText` and `ButtonText` in `BasicLayout.astro`'s shared mark block are ungated.**
  The pairing walk in `tests/build-output.test.ts` drops every wordless mask
  (`if (!textContent.trim()) continue`), so only `LinkText` is held, and only by the
  chevron assertion in `rendered-html.test.ts`. Mutating `CanvasText` to `Canvas` ships
  invisible marks with the suite green. **Not fixed because the hole is INHERITED, not
  created**: on the revision before the consolidation, 31 of those 32 mark instances had
  no forced-colours rule at all and were already painting Canvas-on-Canvas — measured. The
  branch's net effect on a forced-colours reader is +31 marks correctly painted, 0 lost,
  and the same mutation is equally green on the base revision. What the consolidation does
  change is BLAST RADIUS: one literal now decides 32 instances where seven literals decided
  one each. Worth one assertion; not worth +67 lines of new gate inside a cleanup.
- **The grid-template refusal collector is blind to an unmodellable selector with zero
  class tokens** (`tests/patch-wall.test.ts`, `winner()`'s `classTokensOf(sel).some(...)`).
  An element- or attribute-only rule still mis-attributes silently. Downgraded to NIT: the
  component ships no such rule, and the skeptic showed the obvious repair is a no-op whose
  natural fix measurably reopens the hole it closes.
- **The same collector can redden a CORRECT build**: a variant-scoped descendant rule that
  places its element in an area the template does declare fails all three wall pages.
  Reproduced, and genuinely new to this branch. Not fixed because the trigger does not
  exist (`grep -E '^\s+\.bib[\w-]*\s+\.bib' src/components/Patch.astro` returns 0), the
  failure names its own two remedies, and erring strict is the safer side — a false GREEN
  here shipped an invisible sport mark to production once.
- **The icon-only forced-colours gate accepts a rule that paints without opting out**
  (`build-output.test.ts`'s `covered` checks only that a selector matches, not what the
  matching rule declares). REFUTED as a finding against this branch: the skeptic showed the
  gate's contract is "is this glyph named by any forced-colours rule", which the split
  opt-out still satisfies, and the paint/opt-out pairing is held elsewhere.
- **Four prose figures** in commit bodies and comments: "211 lines" is above the ceiling of
  what that commit could have removed from the eight named files; commit 3's "the two
  disagreed on any escaped class token" does not reproduce against the shipped sheet; a
  rewritten `BasicLayout.astro` paragraph attributes "seven" to the eight-root clipping
  sweep; `plans/README.md` points at `plans/done/` for four changes not archived there.
  Ungated by construction — `docs-drift` resolves names that must exist and is blind to a
  quoted VALUE. Recorded rather than corrected one at a time, because the class is the
  finding: **a figure in a commit body is unreviewable after the fact.** The last of the four
  was **corrected 2026-08-08** — see the Baseline section, which now says where those four
  changes are actually written up. The other three sit in commit bodies and stay as they are.

### Two review panels over PR #122 (2026-08-03, merged at `ea6fa8f`)

An 8-dimension audit panel over the shipped site, then a 5-dimension panel over
that panel's own work. Every entry below was **re-measured on 2026-08-03 before
being written here**, because the handover that proposed this section stated three
things that turned out not to be true.

**SC 1.4.11 non-text contrast was NOT "never measured".** That claim was carried
forward twice and is wrong. Four surfaces are gated in the suite today:

| surface | floor | where |
|---|---|---|
| progress-bar fill vs track | 3:1 | `tests/build-output.test.ts` |
| control accent vs surface | 3:1 | same file — it shipped at 1.89:1 once |
| the Now card's live dot | 3:1 | same file |
| a bib's sport mark | 4.5:1 | `tests/patch-wall.test.ts` — the mark includes the word, so it takes the text floor |

What was genuinely unmeasured, and now is:

- **Focus indicators — measured, all pass.** 3.00:1 to 18.86:1 across both themes,
  both pages, seven focusable kinds. The bibs and the goal cards' control carry an
  authored ring in the accent; the rest inherit the browser's own ring, which
  clears 3:1 on both grounds. Nothing is owed here, but note the dependency: three
  control kinds pass on a colour this repo does not choose.
- **The perforation is exempt, not unmeasured.** On screen it is a
  `radial-gradient` at 45% of the row's ink — a texture, and SC 1.4.11 exempts
  purely decorative graphics. `Patch.astro` says so in place ("quiet enough to stay
  behind the words it introduces"). Filing it as a gap would be a false positive;
  it is a border only in the print and forced-colours arms.
- **A booked or DNF bib's outline is 2.13:1 in light and 2.84:1 in dark**, against
  a 3:1 floor. This is the one real gap and it is **the maintainer's call, because
  the remedy is a palette change** — see "Open items" below.

**Also verified and downgraded:**

- **The `ping` halo under `prefers-reduced-motion`.** `Pulse.astro` states a
  rationale, and it is about CONTRAST ("the halo carries no information the dot
  does not"), not about motion — so the rationale does not answer the motion
  question, and the reduced-motion arm in `BasicLayout.astro` names `main > *` and
  `.bib-cell`, neither of which reaches a span inside a card. Recorded as open
  rather than resolved; it is a small, real inconsistency, not a WCAG A failure.
- **A year axis on the patch wall.** Rejected on measurement in the first panel
  (+47.4% document height at 1440, from empty grid cells beside singleton years,
  and it breaks the one-cell-per-race contract). The stale premise it originally
  rested on was fixed in #122. The prototype was not retained, so that figure is
  quoted from the run that made it and has not been re-derived here.

**Findings the panels killed, so they are not re-found:** a "new tab" notice on the
six intro links (refuted on the recorded decision at `constants.ts:978`, which
cites G201's own noise guidance); a claim that the `llms.txt` DNF guard "cannot
fail" (refuted — it can, once a qualifying row exists; the coverage hole was real
and is closed by `tests/llms-dnf-fixture.test.ts`, but the reasoning was wrong);
and a proposed rewrite of this file's DNS record counts that replaced two true
figures with one false one.

### Run 4 (2026-07-29, audited at `45e286f`)

Nine read-only opus auditors (playbook categories, with the maintainer's
three directed leads folded into their natural categories), one opus skeptic
per finding. **Seven categories returned zero findings; two findings total
survived** — PERF-01 (skeptic-CONFIRMED → plan 016) and DEP-01
(skeptic-DOWNGRADED with corrections → plan 017). On this baseline that
shape is the correct outcome, and it matches runs 2–3's trajectory of fewer,
smaller wins.

**The three directed leads, resolved with evidence:**

- **Lead 1 (simplification pass over the post-run-3 surface): zero findings.**
  The debt and tests auditors read the whole new surface and every plausible
  simplification was refuted by a measured comment already in the file (the
  `w-max` removal, the `::before`→background-image perforation rewrite, the
  `text-link` shortcut vs three inline copies, the duplicated
  `grid-template-areas` on `.bib--linked` — a documented height decision).
  Near-misses recorded so they are not re-derived: the WCAG contrast math
  appears in three test files (~20 lines total) but with three different
  input types — extraction is signature negotiation, not simplification;
  `build-output.test.ts` shadows the imported `decl` helper with a local one
  (lexically correct, reader-confusing, taste-tier); `formatPatchDate` is
  called only from tests but is the named anti-drift witness for
  `patchDateSegments`, not dead code.
- **Lead 2 (UnoCSS/CSS cleanup): zero findings.** Every `.bib*`,
  `.patch-*`, `.events-link*`, `.goal-*` and `.measure`/`.progress-fill`
  class was traced authored→worn→emitted in `dist/_astro/*.css`; nothing
  orphaned, nothing cancelled, no repeated group worth a third shortcut
  (Now.astro's corner anchor shares 4 tokens with `text-link`'s expansion
  but is neither of the site's two declared control kinds — a third
  vocabulary would be abstraction for its own sake).
- **Lead 3 (`/patches` loading time): no problem exists**, measured two
  ways. Production transfer (brotli confirmed, 3 identical samples/URL):
  `/patches` 3,717 B + 6,798 B + 1,392 B CSS ≈ 11.9 KB cold, zero external
  first-party JS. Lighthouse (local runs over headless Chrome, mobile
  emulation, 3 runs × 3 URLs): performance 0.95–1.00, median 0.99, TBT 0
  everywhere. The two mechanisms the lead named were both **refuted**:
  per-bib CSS is O(1) — Astro scoped styles emit one ruleset per component,
  so a new race costs ~700 B raw HTML and zero CSS; and the two-stylesheet
  split is clean — the 1.4 KB patches-only sheet is quarantined to the three
  patch pages, and `/` does not load it. (The shared sheet does carry 12
  icon data-URIs `/patches` never uses; per-route CSS splitting on UnoCSS's
  single-sheet architecture would be a large change for ~2 KB brotli — bad
  trade, deliberately not raised.) The one real item on this surface is
  PERF-01 → plan 016: ten `<!-- -->` rationale comments survive the build
  and are ~45–50% of the compressed markup on the patch pages.

**Also recorded by the auditors as deliberately-not-findings** (do not
re-derive): `actions/checkout@v5` pinned by major tag is standard for
first-party actions; the Strava workflow's commit-message interpolation is
digit-only by construction (validated via `kmFromMeters`); ignoring Strava's
rotated `refresh_token` is plan 015's documented fail-loud posture;
`Goal.progress_last_year` configured-but-unrendered is documented in
Goal.astro as "one edit from returning"; the wall's lack of a lifetime
patch-count summary is the settled census-vs-count decision in
`projection.ts`; in-range patch bumps (astro 7.1.5, eslint 10.8) are
hygiene, picked up as a side effect of plan 017.

**Run-4 closing state (both plans merged 2026-07-29, main `6647c31`):**
suite **278**; production `/patches/` markup **2,005 B** brotli (was 3,717),
`/patches/running/` **1,656 B** (was 3,359); `pnpm audit` **1 moderate +
1 high, both documented residuals** (@opentelemetry/core via @netlify/otel;
brace-expansion via jsx-a11y's minimatch@3 — no patched 1.x exists and the
override is measured-broken, see plan 017 in `done/`). Per-plan verification
evidence is in [`done/README.md`](done/README.md) § Run 4.

**DEP-01's skeptic corrections, preserved** (DOWNGRADED, not flattened):
the vulnerable resolutions are real (`brace-expansion@5.0.7` via
`minimatch@10.2.5`, pulled by typescript-estree, eslint itself, and
`@eslint/config-array`), but impact is dev-only posture erosion, not
exposure — the deploy gate never runs eslint. The chair's own dry-run
established the rest: `pnpm update --no-save` clears exactly one of the two
HIGHs; the `eslint-plugin-jsx-a11y → minimatch@3.1.5 → brace-expansion@1.1.16`
path has **no patched 1.x** (the advisory's only patched release is 5.0.8),
`eslint-plugin-jsx-a11y@6.10.2` is its latest release, and an override was
built and measured to **break at runtime** (`brace-expansion@5`'s CJS entry
is a namespace object; `minimatch@3` calls it → `TypeError: expand is not a
function`). Plan 017 therefore leaves it as a second documented residual
beside the `@opentelemetry/core` moderate.

### PR #61 review (2026-07-26, uniform controls / md height lock / one Strava name)

Out of scope for that PR, which covered the controls' box, the page's height and
the Strava naming. Recorded so they are not rediscovered as new:

**Both theme-toggle entries below are RESOLVED as of 2026-07-26** — see the
"one Strava link, brand-ink heart, toggle state" change recorded above. Kept here
because the reasoning for deferring them is what shaped the fix.

- **The theme toggle announces no state.** It carries `aria-live="polite"`, but
  everything inside it that changes on activation is `aria-hidden` (the sun and
  moon spans, swapped by CSS `display`), and its only text node never changes —
  so the live region has nothing to announce, and there is no `aria-pressed` or
  state-bearing name either. A screen-reader user activates it, the page repaints,
  and nothing is said; re-reading the button still gives "Toggle Theme, button".
  Verified against Chrome's own AX tree. Pre-existing and untouched by #61, which
  changed only the button's class. The fix is a real decision, not a typo — drop
  the inert `aria-live`, or make the state real with a per-theme accessible name —
  and it changes announced copy, so it is the maintainer's call.
- **`aria-label="Toggle Theme"` and an `sr-only` span with the same text both sit
  on that button.** AccName takes the `aria-label`, so the span is inert. Harmless
  today because the two strings agree; it is a trap if either is ever edited alone.

### Run 3 (2026-07-22, audited at `4e15674`)

The mandated UnoCSS-classes lead **reproduced with evidence** — nine dead or
no-op class tokens, all relics of the upstream tilt effect deleted in plan
003 (see plan 012 for the per-class evidence table). The audit's near-misses,
recorded by the auditors themselves as not-findings — do not re-derive:

- **Goal.astro's CTA name hardcodes "Strava" while `cta_logo` is a variable.**
  No bug today (both goals point at Strava); a future non-Strava goal would
  mislabel its CTA. Maintainer-owned content surface; not planned. **Resolved
  since, twice over.** First as a side effect of the Strava-naming fix, which moved
  the name into `GOALS[].cta_label` so it followed the destination; then
  permanently on 2026-07-26, when the goal cards' CTAs were removed altogether and
  that field went with them. There is no CTA left to mislabel. (The finding named
  `aria-label`; the element was always an `sr-only` span.)
- **README.md:68 says "cycling goal" (singular)** vs the two-goal reality
  after PR #41. One-word incompleteness; the same sentence points at
  `constants.ts` where the running goal is visible, and CLAUDE.md is correct.
  Taste-tier; not planned.
- **`public/llms.txt` lists projects the site never shows** (surface
  asymmetry). Proposing a projects section is the maintainer's call, and the
  lg grid is packed exactly 32/32 (see the comment in `src/pages/index.astro`)
  — adding a card has a real layout cost. Not planned.
- **No browser-driven test for the theme toggle / localStorage round-trip.**
  Adopting Playwright infrastructure for two lines of client JS on a static
  one-pager is disproportionate; the SSR-only test posture is deliberate.
- **CORRECT-01 and DEBT-01 were the same finding** (entrance-stagger
  off-by-one) reported through two category lenses; merged into plan 013.

### Run 2 (2026-07-21, audited at `c8fe10f`)

Killed by the run-2 skeptic pass or advisor review — do not re-audit:

- **CORRECT-02 — Person.nationality derived from `address_locality`.** Correct
  today (Singapore is both locality and country); the divergence scenario is
  speculative on a single-maintainer, single-file content surface. Refuted.
- **TEST-01 — a test asserting `llms.txt` agrees with `CAREER[0]`.** The
  llms.txt hand-sync is an "Open item owned by the maintainer" with a chosen
  mitigation (manual checklist); shipping a prose-coupling test would override
  that decision. Refuted — exactly the "helpfully doing them" this file warns
  about.
- **DEBT-01 — delete the unused `METADATA.email_obfuscated`.** The field is
  author contact data (his voice/intent, plans 005 and 007 both left it), so
  deletion is the maintainer's call; its self-referential test is 3 harmless
  lines. Recorded, not planned.
- **eslint-plugin-astro 1.7.0 → 3.0.1. REVERSED 2026-08-17 — MERGED as #162; do not read the
  rejection below as standing policy.** What changed is not the argument but who was making it:
  the repository left the fork network on 2026-08-16, Dependabot armed, and the upgrade arrived
  as a pull request that had already run `pnpm eslint` in CI. That turned "the parser peers are
  a risk" into a measured fact — v3 parses `.astro` with Astro's Rust compiler, and the job
  passed, so the compiler accepted every file here. The engine range (`^22.22.3 || ^24.16.0 ||
  >=26.3.0`) is satisfied by `.nvmrc`, and the parser peer floor was real: v2 requires
  `@typescript-eslint/parser >=8.61.0` while this repo declared `^8.58.0`, corrected in the same
  change. The rest is recorded as it stood: *lints clean today; the upgrade forces new Node
  engine ranges and parser peers for zero articulable gain on a 10-file .astro repo.* One
  residual, since CLOSED — `eslint.config.js` still set `astro/valid-compile`, which v3
  DEPRECATED and dropped from `recommended`. Deprecated is not deleted, so lint stayed green and
  nothing reddened; the rule was removed anyway, because the alternative was discovering it on
  the release that deletes it. See the DX-04 entry below, which is the reason it needed a
  decision rather than a sweep.
- **typescript 6.0.2 → 7.x (native compiler).** `@astrojs/check` /
  `@typescript-eslint` compatibility unestablished, and the repo has almost no
  hand-written TS. Investigate-only; no leverage.
- **lint-staged 16 → 17. REVERSED 2026-08-17 — MERGED as #163.** The original reading survives
  contact: *no changelog signal affecting the hook.* Checked rather than assumed this time — the
  Node and Git floors are satisfied, and the `yaml` optional-dependency change does not apply
  because the configuration is the inline `lint-staged` key in `package.json` rather than a YAML
  file. The one behavioural risk is the staging path, which churned across the whole 17.0.x
  range, and it is unreachable from CI by construction: this tool runs only in
  `.husky/pre-commit`. So it was verified by hand, twice — once under the shipped config, and
  once with a task rewritten to genuinely MODIFY the staged file, because none of the four
  eslint rules configured here is fixable and `eslint --fix` therefore never modifies anything.
  Both left the file correctly staged. **A check that cannot reach the path it names is not a
  check** — the shipped-config run alone would have proved only that lint-staged starts.
- **Security headers (CSP etc.) via the host's headers file.** Static one-pager, no
  forms/auth/cookies/user input. Marginal value, deliberately not raised. (Raised against
  `netlify.toml`; the file that would carry it now is `public/_headers`, and the
  reasoning is unchanged by the move.)
  **THE SECOND HALF OF THIS ENTRY'S REASONING IS WITHDRAWN AND NOT REPLACED.** It used to
  claim a real CSP here needs `unsafe-inline`, and a later audit run reported measuring a
  hash-based `script-src` working under the live Rocket Loader with a non-degeneracy control
  — which contradicts it. **That measurement has not been reproduced**, and the run's own
  notes call it the most load-bearing unreproduced claim it made, so it is not installed here
  either: swapping a wrong reason for an unverified one is the same defect twice. What stands
  is that the ground is unmeasured. Settling it means reproducing the hash-based `script-src`
  against the deployed site with Rocket Loader in its current state, including a control that
  fails when the hashes are wrong — and only then rewriting this decision, in either
  direction. The decision itself is untouched by this correction.
- **DX micro-items** — silencing the two `astro(4000)` is:inline hints (they
  communicate intent), `.editorconfig`, widening the eslint glob (settled:
  constants.ts is test-gated), pre-commit check/test duplication, a Umami
  `preconnect`. All rejected as taste-tier or duplicative.

Also corrected in run 2: the original DEP-01 claim "all 10 advisories clear
in-range" is false — `@netlify/otel@6.0.3` pins `@opentelemetry/core@2.7.1`
exactly, so plan 009 expects a 1-moderate residual and says so.

### Run 1 (2026-07-21, audited at `4550e1f`)

Six findings were refuted by the skeptic pass. Recorded here so they are not
re-audited next run:

- **SEC-03 — canonical/OG URLs derived from the request Host header.** Duplicate
  of CORRECT-03, which plan 002 fixes as a side effect of prerendering. Not a
  separate finding.
- **SEC-04 — add `rel="noopener noreferrer"` to `target="_blank"` links.** The
  four line citations are accurate, but every current browser applies
  `noopener` implicitly to `target="_blank"`. Hygiene at best, not a
  vulnerability.
- **DEP-05 / DX-05 — remove `@typescript-eslint/parser` as unused.** False, and
  the fix would break linting. `eslint-plugin-astro` resolves it at runtime via
  `createRequire` and switches its processor depending on whether it is present.
  Verified empirically by linting in a sandbox with the package removed.
  **Do not remove this package.**
- **DX-01 — add a GitHub Actions CI workflow. REVERSED 2026-07-30 — this is now
  how the site ships; do not read the rejection below as standing policy.** The
  maintainer decided to leave Netlify, and with the host went the platform
  guarantee the rejection rested on, so `.github/workflows/ci.yml` became the only
  builder rather than a second one. What survives of the original reasoning is the
  part that was never about Netlify: there must be exactly ONE pipeline, and the
  thing that gates must be the thing that builds — which is why the deploy jobs
  publish the `build` job's artifact instead of rebuilding.
  The rest is recorded as it stood. The finding's impact claim was inverted: the
  commit it cited as proof that a type error "reached production" (`2595328`)
  actually shows `astro build` rejecting the file and the deploy failing, so
  production kept serving the previous build. And the maintainer was offered a CI
  workflow on 2026-07-21 and chose to skip it; plan 002 instead made the *existing*
  pipeline run `pnpm check && pnpm test`, which closed the gap at the time.
- **DX-04 — the eslint config and pre-commit hook cannot block anything.** False.
  `no-undef`, `no-debugger` and `astro/no-unused-define-vars-in-style` are all set
  to `error`, and a probe through the real config exits non-zero. The `.ts`
  coverage gap the finding worries about is largely closed by `astro check`, which
  reads the root configs as well as the source. **The refutation lost one of its
  four rules on 2026-08-17 and still holds**: `astro/valid-compile` was the fourth,
  and eslint-plugin-astro v3 deprecated it and dropped it from `recommended`, so it
  was removed from `eslint.config.js` rather than left to fail on the release that
  deletes it. What it used to report the Astro compiler now rejects at parse time,
  which is `pnpm check` rather than `pnpm eslint` — a different step of the same
  gate, not a gap. Do not read the missing rule as this entry weakening.

## Deliberately not planned

Two direction findings survived vetting as the maintainer's call, not an
agent's. **DIRECT-01 has since been decided** (2026-07-22 → plan 015); it is
kept below with its resolution so the reasoning is not re-derived. DIRECT-04
remains open:

- **DIRECT-01 — resolved 2026-07-22, see plan 015.** The maintainer supplied the
  decision this finding was waiting on: a daily GitHub Actions cron writes
  Strava's YTD totals to a bot-owned `src/data/strava-progress.json` that
  `constants.ts` imports, with a static refresh token in repo secrets and a
  fail-loud posture (a Strava-side invalidation turns the run red and freezes the
  number rather than self-healing). The objections above were addressed rather
  than overruled: the fetch happens in CI, not at build time, so the static build
  can still never fail on someone else's API — a bad or missing response simply
  produces no commit.
- **DIRECT-04 — stale time-bounded copy.** `ABOUT_ME.description` has advertised a
  "latest cycling challenge 1000km in 5 weeks" unchanged for 13 months, and it is
  live in production right now. It is a ten-second edit, but it is the owner's
  own voice; an agent should not rewrite someone's self-description. Plan 007
  flags it and changes nothing.

## Open items owned by the maintainer

None of these is an agent's call. They are recorded so a new run does not
"helpfully" do them; two have since been resolved and are kept with
their resolutions rather than deleted.

- **A booked or DNF bib's outline is below the SC 1.4.11 floor.** Measured
  2026-08-03 on the shipped build: **2.13:1 in light, 2.84:1 in dark**, against 3:1.
  The border is the row's own ink at 32% alpha, composited over the wall's card.
  **It is the maintainer's call because the only remedy is a palette change**, and
  the palette is a settled decision — raising the alpha or picking a second token
  changes how every outline bib reads against every earned one beside it.
  There is a real argument that it is not a failure at all: SC 1.4.11 covers visual
  information *required* to identify a state, and neither state depends on the
  border — a booked bib prints the word `Booked` in its meta row and a DNF prints
  `DNF` where the distance would be, which is the distinction `CLAUDE.md` says is
  load-bearing. What the outline carries alone is the bib's EXTENT, not its state.
  Do not change a token to close this without asking; do not delete this entry
  because the argument above is persuasive, either. It is measured and open.
- **The `ping` halo keeps animating under `prefers-reduced-motion`.** The
  reduced-motion arm in `BasicLayout.astro` names `main > *` and `.bib-cell`;
  the halo is a span inside a card, so neither reaches it. `Pulse.astro` states a
  rationale for not gating the halo, but that rationale is about contrast, not
  motion, so it does not settle this. Small and real; a design call rather than a
  conformance failure, since SC 2.2.2 is about content that moves for more than
  five seconds and this is a decorative pulse on a status dot.

- ~~**`www.calvin.sg` serves the site instead of redirecting.**~~ **Resolved 2026-07-30.**
  `https://www.calvin.sg/` now answers `301` to the apex, preserving path and query, in
  one hop. `.scratchpad/verify-canonical.sh` is **15/15**, from 9/5 before. HSTS is on at
  180 days (deliberately no `includeSubDomains`, no preload — it is close to irreversible,
  so this is the ramp), both legacy Page Rules are deleted, and the slickshots forward
  moved to a Single Redirect.

  **The cause was never a missing rule**, and that matters for the next hostname. `www`
  was an *attached custom domain on the Pages project*, with its own certificate — so
  Pages routed it by Host exactly as it routed the apex, and the two were equal origin
  bindings. A redirect rule *masks* that; detaching removes it. When a hostname serves
  something you did not intend, read the custom-domain list before the rules list.

  **Order was load-bearing**: redirect rule first, detach second. Single Redirects execute
  first in the rules pipeline and take precedence over Page Rules, so the rule answers
  before origin selection and the hostname never stops responding.

  **Two instrument failures worth keeping**, both caught only because the config was
  re-read after the run rather than trusting it. (1) The apply script reported `www`
  "already detached" when its API read had been *refused* — a failed GET and an absent
  domain were indistinguishable to it, and it gave the reassuring one. It now probes every
  surface it will later write to, and exits rather than interpreting a failed read.
  (2) The gate passed **14/14 while `www` was still bound**: the redirect fires before
  origin selection, so from outside every observable was correct and the structure was
  not. A behavioural probe cannot see a redundancy that something upstream is masking —
  check 11 reads the binding itself and is the one that would have caught it.

- ~~`public/preview.jpg` is still the August 2024 screenshot.~~ **Resolved
  2026-07-21**: the maintainer supplied a current dark-theme screenshot. It
  ships as a **hero-card crop filling the full 1200×630 canvas** (42,946
  bytes) rather than a whole-page pillarbox — the maintainer asked for the
  optimum social composition, and cropping to the welcome card (name, role
  lines, buttons, portrait) renders the text ~2× larger in unfurls. Recipe
  (maintainer supplies a hero-card screenshot on the `#111111` page
  background): detect the card's pixel bounds by scanning for non-`#111111`
  rows/columns, `extract` the card plus a uniform 24px margin, then
  `resize(1200×630, fit contain, background #111111)` → mozjpeg q80 — contain
  centers the card with equal letterbox bands (vertical asymmetry in the
  first crop was called out and fixed). The README hero, `og:image` and
  `twitter:image` all resolve from this one filename — a future refresh is a
  new screenshot through this same recipe.
- ~~**`public/llms.txt` duplicates the site's content by hand**,
  with nothing keeping them in sync.~~ **Resolved 2026-07-30 (PR #108).** Both
  `llms.txt` and `robots.txt` are now generated endpoints — `src/pages/llms.txt.ts`
  and `src/pages/robots.txt.ts` — deriving every fact from the content modules, and
  `tests/build-output.test.ts` asserts the association row by row rather than
  token by token. `public/` holds no text file at all now. The checklist item this
  used to add is gone: nothing about the current role can go stale there any more,
  which is what made it stale once and what plan 007 nearly re-staled in the
  opposite direction.

## Where the evidence lives

[`done/README.md`](done/README.md) carries the per-plan verification log for every
archived plan — count them from `plans/done/` rather than from this sentence, which
said "all eight plans" for nine plans after that stopped being true: what was
mutation-tested, what each preview-vs-production diff showed, and every plan defect
found during execution. Read it when you need to
know *why* something was done a particular way, or before assuming a past
decision was arbitrary.
