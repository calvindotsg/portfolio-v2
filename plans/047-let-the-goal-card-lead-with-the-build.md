# Plan 047: Let the goal card lead with the build, and point its one plate at the spine

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 719d3d6..HEAD -- src/components/Goal.astro src/components/EventsLink.astro src/content/races.ts src/lib/goal.ts src/pages/index.astro src/pages/patches/ src/lib/patch-doc.ts src/pages/llms.txt.ts src/pages/design.astro tests/`
> The last four are the other consumers of `NEXT_RACE.control` — see step 3. They are OUT OF SCOPE
> to edit and IN SCOPE to watch.
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts
> against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — it reverses a rule `CLAUDE.md` states, and it edits the one page with no height to spare
- **Depends on**: `plans/045-fetch-the-weekly-training-series.md`, `plans/046-draw-the-year-as-one-spine.md`
- **Category**: direction
- **Planned at**: commit `719d3d6`, 2026-08-27

## Why this matters

A progress bar carries the most information in the middle of the year and almost none at either end.
Traced in `src/lib/projection.ts`: `goalStatus` returns `{kind: "met"}` the moment the kilometres
pass the target, so from that day `goalStatusLine` prints **`Goal met`** against a full rule until
31 December; on 1 January the card resets to `0 / 600 km` against an empty one. Roughly six weeks a
year, twice over, the card says nothing.

*What is the training doing* is interesting on all of those days. This plan makes it the hero.

The second half is the part that has to be said out loud rather than slipped in. Once plan 046 has
shipped a page that holds the weeks **and** the races, there is **one destination**, so the card's
single plate has nothing to compete with — and the sparkline in the card is literally the last
twelve rows of the page the button opens. That pairing is the strongest relationship a card and its
control can have, and it is only available because the two datasets were integrated.

## Current state

### What a goal card renders today

`src/components/Goal.astro`, one per entry in `GOALS` (`src/lib/goal.ts`), in the right-hand column
of the `lg` grid. Measured from the live page at 1440×900:

| Slot | Running card | Source |
|---|---|---|
| heading | `My running goal this year` | `goal_name`, lowercased in the template |
| hero | `284.6 / 600 km` — `aria-hidden`; the progress bar carries the accessible value | `.goal-figure` |
| rule | 2px progress bar, `--progress: 47.43%` | `ProgressBar.astro` |
| line 1 | `14 km/wk to go, 63 booked` | `goalStatusLine()` |
| line 2 | `Next race in 4 weeks` | `nextRaceLine(nextRace(sport), patchesEarned(sport))` |
| action | `My running events →` plate → `/patches/running` | `EventsLink.astro`, `.control-cta` |

Cycling is the same with `2602.2 / 5000 km`, `74 km/wk to go, 1064 booked`, `Next race in 6 weeks`.

The card's own comment states its shape:

> THE CARD IS ONE NUMBER, A RULE UNDER IT, TWO SENTENCES AND A WAY OUT — in that order, and the
> order is the argument.

and

> THE FIGURE IS ANNOUNCED BY THE MEASURE, NOT BY ITSELF. The hero is `aria-hidden` and the progress
> bar directly under it carries `aria-valuetext` with the same two numbers in words a screen reader
> can say … the pairing is gated: `tests/rendered-html.test.ts` fails if the hero is taken out of
> the tree without an equivalent `aria-valuetext` beside it.

### Where the words live

`src/content/races.ts`:
```ts
export const NEXT_RACE = {
    today: "Next race is today",
    tomorrow: "Next race is tomorrow",
    in_days: "Next race in {days} days",
    in_weeks: "Next race in {weeks} weeks",
    under_way: "Race under way now",
    earned: "{count} patches earned",
    earned_one: "1 patch earned",
    none: "No races booked",
    control: "My {sport} events",
    icon: "ri:arrow-right-line",
}
```
`src/data/goals.ts` — the authored targets. `src/lib/goal.ts` — derives `GOALS`, owns the clamp.

**Copy is content, not markup: do not type a new string into `Goal.astro`.**

### The gates that bind this card

Every one of these is live. Do not discover them by breaking them.

1. **`tests/control-geometry.test.ts` → *"spends the plate once per card, which is what makes it a
   mark"***. There are exactly **three** plates on the home page: the intro card's `My events`, and
   one per goal card. A second `.control-cta` on a goal card is red.
2. **`tests/page-fit.test.ts`** — the single-screen contract at `lg`. `<main>` is
   `lg:grid-rows-[repeat(8,min-content)] lg:grid-cols-4 lg:min-h-[clamp(46rem,100vh,50rem)]`.
   It is a **floor with no ceiling**; read the long note in `index.astro` before touching it. A
   ceiling breaks WCAG SC 1.4.12 and has been re-added by mistake before.
3. **`index.astro`, at the grid**: *"The lg grid is packed exactly 32/32 cells. Adding a goal card
   requires re-balancing the lg row/col spans in IntroCard/AboutMe/Now."* This plan adds no card.
4. **`tests/card-fill.test.ts`** — exactly one card is exempt from the fill rule (the intro card),
   and nothing inside a card may carry an absolute height.
5. **`tests/rendered-html.test.ts`** — several bind this card directly: *"gives every goal card a
   control leading to its own sport's events"*, *"prints the countdown as a figure, outside the
   control"*, *"words the countdown for every state a year passes through"*, *"lets the control's
   label break rather than clip when the reader enlarges their text"* (measured at 42.2px of lost
   ink at a 40px root), *"never hides the card's figure without an accessible equivalent beside
   it"*, and **`links to Strava exactly once`** — so no new Strava link anywhere on this page.
6. **`tests/build-output.test.ts`** walks the link graph from `/` and asserts the destination page
   is **headed with the control's own words**.
7. **`project_intro_card_geometry`** (agent memory) — the intro card's chip block's max-content sets
   both the copy column and the `My events` button width. Read it before resizing anything.

### The home page has no slack

Measured: `<main>` asks for **797px** at the default text size, from a 797px-tall viewport up.
`index.astro` records that adding the `/design` link cost 32px and put a reader at 800px tall into a
scrollbar. **A change here that adds height is a change that costs something.** This plan is
close to height-neutral by construction — the sparkline replaces the progress rule rather than
joining it — but it must be measured, not assumed.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Preview | `pnpm preview` | serves `dist/` on http://localhost:4321 |

## Scope

**In scope**:
- `src/components/Goal.astro` (edit)
- `src/components/EventsLink.astro` (edit or rename — see step 3)
- `src/components/VolumeSpark.astro` (create) — the twelve-week series
- `src/content/races.ts` — **NOT edited. Listed here so its absence is deliberate**; see step 3
- `src/content/training.ts` (edit — the card's own new strings, created by plan 046)
- `src/lib/season.ts` (edit — a `recentWeeks(sport, n)` derivation)
- `tests/rendered-html.test.ts`, `tests/build-output.test.ts`, `tests/control-geometry.test.ts`,
  `tests/page-fit.test.ts` (edit)
- `CLAUDE.md` (edit — the rule this plan reverses)
- `plans/README.md` (edit — status row only, at the end)

**Out of scope**:
- `src/pages/index.astro`'s grid. No card is added or removed; **no `lg` span changes**.
- `src/lib/projection.ts`. `goalStatus`, `goalStatusLine`, `bookedAhead` and `nextRaceLine` are
  unchanged — the card reads one more derived figure, it does not change how any existing one is
  derived.
- `src/pages/patches/`, `src/components/Patch.astro`, `src/lib/patch-doc.ts`,
  `src/pages/llms.txt.ts`, `src/pages/design.astro`. All five read `NEXT_RACE.control`, which this
  plan does **not** edit — see step 3. The three walls keep their headings: `/patches` is headed
  `My events` from `PATCHES.heading`, and `/patches/running` and `/patches/cycling` are headed
  `My running events` / `My cycling events` from `NEXT_RACE.control`. All three stay reachable from
  the intro card's plate.
- `src/components/IntroCard.astro`. Its `My events` plate keeps pointing at `/patches` — that is
  what keeps the wall one click from the home page after this change.

## Git workflow

- Branch: `advisor/047-let-the-goal-card-lead-with-the-build`
- Conventional commits; match `git log --oneline -20`.
- Do NOT push or open a pull request unless the operator instructs it.

## Steps

### Step 1: Derive the twelve weeks

Add `recentWeeks(sport: Sport, n: number)` to `src/lib/season.ts` — the last `n` completed weeks plus
the current one, scoped to one sport, each carrying its kilometres. `BUILD_DATE` decides which week
is current, per the two-clocks rule.

Return the figures, not the geometry. A bar height is a rendering concern and belongs in the
component.

**Verify**: `pnpm check` → exit 0; a unit test in `tests/season.test.ts` covers a year boundary
(the twelve weeks before 2027-W01 include weeks from 2026).

### Step 2: Draw the series

Create `src/components/VolumeSpark.astro` — twelve bars, `--progress-track` for the ground and the
sport's own token for the fill, the current week emphasised.

It **replaces** `ProgressBar.astro` in the goal card; it does not sit beside it. That is what keeps
the card height-neutral, and it is also the argument: the card shows a direction where it used to
show a position.

Accessibility is the part most likely to be got wrong, and the card's existing comment says exactly
how: **the figure is announced by the measure, not by itself.** Today the hero is `aria-hidden` and
`ProgressBar` carries `aria-valuetext` with the same two numbers in words. Keep that shape:
- the hero (`71 km this week`) stays `aria-hidden`;
- the spark carries the accessible equivalent — a single readable sentence naming this week's figure
  and the trend, not twelve announced bars;
- the year fraction moves into line 1 as ordinary text, where a screen reader gets it for free.

`tests/rendered-html.test.ts` already fails if the hero is hidden without an equivalent beside it.
**Extend that gate to name the spark**, do not weaken it.

No absolute height inside the card (`tests/card-fill.test.ts`). Any `:hover` carries
`@media (hover: hover)` in its own prelude.

**Verify**: `pnpm build` → exit 0; `pnpm test` → exit 0.

### Step 3: Repoint the plate, and rename it in content

**DO NOT EDIT `NEXT_RACE.control`.** That string is not the goal card's private label — it is the
name of the events wall, read by **five** consumers, and renaming it silently re-heads two shipped
pages:

| Consumer | What it does with the string |
|---|---|
| `src/pages/patches/[...sport].astro:99` | the sport walls' `<h1>`, and `:106` derives their `<title>` from it |
| `src/lib/patch-doc.ts:136` | the heading of the two sport markdown twins |
| `src/pages/llms.txt.ts:204` | the link label for each sport wall |
| `src/pages/design.astro:164` | the control specimen's label |
| `src/components/EventsLink.astro:139` | the goal card's own plate |

The comment at `src/pages/patches/[...sport].astro:87-92` records that the wall reads this string
**on purpose**, so a control and its destination cannot drift apart. Editing it would contradict
this plan's own out-of-scope list and make its byte-identical Done criterion unsatisfiable.

**Instead, add a NEW key** — `TRAINING.control` in `src/content/training.ts` (created by plan 046),
holding `My {sport}` — and point `EventsLink.astro` at it. `NEXT_RACE.control` keeps saying
`My {sport} events` and keeps naming the wall, which is what leaves `/patches` byte-identical.

Gate 6 asserts the destination is headed with the control's own words, so **the heading
`src/content/training.ts` gives the spine and `TRAINING.control` must agree**. Plan 046 chose that heading;
read it there rather than inventing one, and if they cannot be made to agree, fix the content
module — never the gate.

`EventsLink.astro` is now misnamed. Rename it (`SportLink.astro` or similar) in the same change, or
leave the filename and say why in its own comment. Do not leave a component called `EventsLink`
pointing at training with no note.

**The wall is not orphaned.** The intro card's `My events` plate still goes to `/patches`, and the
spine's own filter reaches the races. `tests/build-output.test.ts`'s reachability gate is what
proves this — run it and read it, do not assume.

**Verify**: `pnpm test` → exit 0. `tests/build-output.test.ts` passes **without** any new exemption;
if plan 046 shipped an expiring exemption for `/training`, **delete it in this plan** — the page is
reachable now, and that is what the expiry was waiting for.

### Step 4: Rewrite the two lines

Line 1 carries the year and the demand: the fraction and `goalStatusLine`'s output together. Line 2
is unchanged (`nextRaceLine`).

Every string is content. `goalStatusLine` still returns `Goal met` when the goal is met — that is
correct and is now a *line*, not the hero, which is the whole point.

**A copy change is a layout change.** The card's text column is narrow. Measure the new line 1 at a
40px root before accepting it; `tests/rendered-html.test.ts` already gates the control's label
breaking rather than clipping, and the same hazard applies to a lengthened line.

**Verify**: `pnpm test` → exit 0.

### Step 5: Measure the page, do not assume it

At the default text size and at a 40px root, across at least `1024×600`, `1024×768`, `1280×800`,
`1440×900` and `1920×1080`, measure against a build of `main` as the before-tree:

- the height `<main>` asks for (was 797px at default);
- text ink past each card's **bottom** clip edge;
- control-box overflow past each card's **right** edge.

Name the edge in every figure you record. `index.astro` records that quoting one of these as
"nothing clips" is the error that let a regression ship.

**Verify**: no configuration is worse than `main`. If `<main>` grew, say by how much and at which
viewport in the PR body; if it grew past 800px, **STOP and report** — that is a reader gaining a
scrollbar, and it is the operator's call.

### Step 6: Reverse the rule in writing

`CLAUDE.md` currently says:

> A goal card's body is a hero figure, a 2px progress rule spanning the body, the required rate, the
> countdown, and a full-width CTA (`components/EventsLink.astro`) reading `My <sport> events →`.
> That control is the only path from the home page to `/patches/<sport>`.

Rewrite it to what is now true: the hero is the week's volume, the rule is a twelve-week series, the
control leads to `/training/<sport>`, and the wall is reached from the intro card's plate and from
the spine's own filter. Say plainly that this **reverses** the earlier rule and why — a correct
instruction with a false reason survives every check, so the reason has to move with the value.

`tests/docs-drift.test.ts` gates this file for accuracy.

**Verify**: `pnpm test` → exit 0.

### Step 7: Watch the gates fail

Mutate and record, one at a time, reverting each:

| Mutation | Expected red |
|---|---|
| Add a second `.control-cta` to `Goal.astro` | `tests/control-geometry.test.ts` |
| Change `training.ts`'s heading so it no longer matches `NEXT_RACE.control` | `tests/build-output.test.ts` |
| Remove the spark's accessible equivalent, leaving the hero `aria-hidden` | `tests/rendered-html.test.ts` |
| Put `height: 120px` on the spark | `tests/card-fill.test.ts` |
| Put a `max-height` back on `<main>` | `tests/page-fit.test.ts` |
| Point the intro card's plate at `/training` | `tests/build-output.test.ts` reachability |

Run the **full** `pnpm test` for each — `SKIP_BUILD=1` makes a source change invisible to any
`dist/`-reading gate, and four of these six are `dist/`-reading.

**Verify**: every mutation reddens its intended test. A green mutation is a vacuous gate; fix it.

## Test plan

Extended, not new: `tests/rendered-html.test.ts` (the spark's accessible equivalent; the new line 1
breaking rather than clipping), `tests/build-output.test.ts` (control label ↔ destination heading;
reachability without an exemption), `tests/control-geometry.test.ts` (still one plate per card),
`tests/page-fit.test.ts` (the height budget survives), `tests/season.test.ts` (`recentWeeks` across a
year boundary).

Verification: `pnpm test` → exit 0.

## Done criteria

ALL must hold:

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test` all exit 0
- [ ] `grep -c "control-cta" dist/index.html` returns **3** — unchanged
- [ ] `grep -c "My running events" dist/patches/running/index.html` returns at least 1 — the wall keeps its name
- [ ] `git diff --stat 719d3d6..HEAD -- src/content/races.ts src/pages/patches/ src/lib/patch-doc.ts src/pages/llms.txt.ts src/pages/design.astro` is empty
- [ ] `/patches`, `/patches/running`, `/patches/cycling` are byte-identical to `main`
      (`find dist -type f | LC_ALL=C sort | xargs shasum -a 256`, manifests diffed)
- [ ] `tests/build-output.test.ts` passes with no exemption for `/training`
- [ ] Step 5's measurements are in the PR body, with the edge named for every figure
- [ ] Each of step 7's six mutations was run and reddened the intended test; results in the PR body
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `<main>` asks for more than 800px at the default text size at any measured viewport.
- Any measured configuration loses more ink past a clip edge than `main` does.
- The change appears to require a second plate on a goal card, or a chip beneath the plate. Both are
  the shape this plan exists to avoid; if the design needs one, the integration argument has failed
  and the operator should hear that rather than see a chip.
- `tests/build-output.test.ts` cannot be satisfied without an exemption.
- Plan 046 has not landed. The control would point at a page that does not exist.
- A mutation in step 7 leaves the suite green.

## Maintenance notes

- **The card and its destination now rhyme on purpose.** The twelve bars in the card are the last
  twelve rows of `/training/<sport>`. If one changes its week window or its sport scope, the other
  must move with it, or the card stops being a preview and becomes a second figure.
- **`Goal met` is now a line, not a hero.** That is the fix, not a regression — the card keeps saying
  something true after the goal is met because the hero is elsewhere.
- **The wall's route to the home page is now the intro card alone.** That is one link holding the
  whole reachability of three pages. `tests/build-output.test.ts` is what notices if it goes; treat
  a change to `IntroCard.astro`'s plate as a change to the wall.
- **What a reviewer should scrutinise**: the step 5 measurements against `main`, with edges named;
  that the accessible equivalent is a sentence rather than twelve announced bars; and that the
  `CLAUDE.md` edit records the reversal rather than quietly restating the new rule.
- **Deferred**: whether the two goal cards should merge into one `My training` card. That frees a
  whole card of grid and is the same components rearranged, but it re-packs a 32/32 `lg` grid and
  flattens the difference between a 600 km year and a 5000 km one. Revisit only if the page feels
  tight after this lands.
