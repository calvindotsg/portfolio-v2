# Plan 046: Draw the year as one spine, with the races on it

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 719d3d6..HEAD -- src/pages/ src/components/ src/content/ src/lib/ tests/`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts
> against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED — it adds a route family and a new drawing to a design system with a published spec
- **Depends on**: `plans/045-fetch-the-weekly-training-series.md` (the series does not exist without it)
- **Category**: direction
- **Planned at**: commit `719d3d6`, 2026-08-27

## Why this matters

The site can already answer *"what races has he entered"* — that is `/patches`, a wall of bibs. It
cannot answer *"what has the training been doing"*, which is the question that stays interesting
after the December marathon and on the January after it.

The two are **already one dataset**. A race stores `recordings: [{id, metres, elapsed_time}]` — one
entry per Strava activity — which is a session record. The only things a race has that an ordinary
Tuesday does not are a name, a country, a results sheet and a bib. So this plan does not build a
second page beside the wall; it builds the **spine both of them sit on**, and leaves `/patches` in
place as the races-only view of the same data.

The shape was chosen against three alternatives and the deciding argument is short: **a grid cannot
show a series.** The wall is `repeat(auto-fill, minmax(min(13rem, 100%), 1fr))` — right for fourteen
races you scan, useless at fourteen races plus fifty weeks a year, where a ramp, a taper and a gap
all stop being visible. "What is the training doing" is a series property.

## Current state

### The wall as it ships

`src/pages/patches/[...sport].astro` — one rest-parameter route prerendering `/patches`,
`/patches/cycling`, `/patches/running`.

```astro
<main class="text-[var(--text)] m-auto p-2 grid gap-2 max-w-4xl w-full sm:p-4 md:gap-3 md:p-6 lg:gap-4">
    <h1 class="text-3xl font-bold m-0 break-anywhere">{heading}</h1>
    <p class="text-sm max-w-[60ch] m-0">{lede}</p>
    <nav class="patch-filter" aria-label={PATCHES.filter_label}>
        <a href={f.href} class="chip" aria-current={f.active ? "page" : undefined}>…</a>
    </nav>
    <ul class="patch-wall">…</ul>
</main>
```
```css
.patch-wall {
    list-style: none; margin: 0; padding: 0; display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(13rem, 100%), 1fr));
    gap: 0.5rem;
}
```

`src/components/Patch.astro` — the bib. Its anatomy, which this plan **reuses unchanged**:

```css
.bib {
    --face: var(--text); --hole: var(--card-background); --ink: var(--background);
    --sport: var(--sport-on-ink);
    container-type: inline-size;
    display: grid; grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "date date" "value unit" "name name" "place place" "ledger ledger";
    align-content: start; row-gap: 0.3rem; padding: 0.7rem 0.8rem 0.65rem;
    border: 1px solid transparent; border-radius: 2px;
    color: var(--ink); background-color: var(--face);
    background-image: radial-gradient(circle at 7px 7px, var(--hole) 0 1.7px, transparent 1.8px), …;
}
.bib--booked, .bib--dnf {
    --face: transparent; --ink: var(--text); --sport: var(--sport-on-card);
    border-color: color-mix(in srgb, var(--text) 32%, transparent);
    background-image: none;
}
.bib-value { font-size: min(3rem, 30cqi); font-weight: 800; line-height: 0.82; letter-spacing: -0.045em; }
.bib-unit { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 0.625rem; font-weight: 800; letter-spacing: 0.2em; }
```

`src/components/PageHeader.astro` — the site's chrome, one component, rendered by
`BasicLayout.astro` from a `header` prop: the way back, the markdown twin, the theme toggle, every
item a `chip`. **It is a sibling of `<main>` and never a descendant**, because that is what makes it
a `banner` landmark; `tests/page-header.test.ts` is the only thing that notices otherwise.

`src/lib/patch-doc.ts` renders the wall as markdown; `src/pages/patches.md.ts` and
`src/pages/patches/[sport].md.ts` are the two endpoint files that serve the three twins. A rest
parameter matches zero segments only where it *is* a whole path segment, which is why one file
cannot serve both `/patches.md` and `/patches/running.md`.

### The design vocabulary this plan must obey

From `CLAUDE.md`, verbatim where it binds:

> **The shortcuts are the site's kinds of control, and they come in TWO WORLDS divided by loudness
> rather than by page.** THE RULE IS ONE SENTENCE: **the plate is spent on a card's SINGLE ACTION
> and on nothing else**; everything that is chrome — getting somewhere, and setting a preference —
> is a chip.

> **A hover style must need a pointer to produce it.** … every `hover:` utility is emitted inside
> `@media (hover: hover)` … A hand-written `:hover` carries the guard in its own prelude and must be
> split from any `:focus-visible` it shares a selector list with.

> **A press must be drawn, and must outlive the finger** — two gates in `tests/build-output.test.ts`
> fail the DEPLOY, not just the suite.

> **Text-relative sizing**: every breakpoint, `main`'s height clamp, the card heading's space and
> the control box are font-relative … `tests/page-fit.test.ts` and `tests/card-fill.test.ts` forbid
> an absolute length in the first three.

> Every link must carry a signifier a reader can perceive, and a build-wide gate in
> `tests/build-output.test.ts` walks every `<a>` on every page to enforce it — **a bib's stub is the
> one exception the gate names**.

And the design system publishes itself: `src/content/design.ts` is the one authored description, and
`tests/design-system.test.ts` holds `/design`, `DESIGN.md`, `/design.md` and
`.design-sync/conventions.md` to it **in both directions**. A new drawing that a reader can see must
reach that module or the suite is red — which is the point.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Preview | `pnpm preview` | serves `dist/` on http://localhost:4321 |

`pnpm eslint` globs `src/**/*.{js,astro}` — a clean run says nothing about `.ts`. Those are gated by
`pnpm check` and the suite.

## Scope

**In scope**:
- `src/lib/season.ts` (create) — merges `EVENTS` and `WEEKS` into spine rows
- `src/pages/training/[...sport].astro` (create) — the route, prerendering three pages
- `src/pages/training.md.ts` and `src/pages/training/[sport].md.ts` (create) — the markdown twins
- `src/lib/training-doc.ts` (create) — the markdown rendering
- `src/components/WeekRow.astro` (create) — one week on the spine
- `src/content/training.ts` (create) — every string this page prints
- `src/content/design.ts` (edit) — publish the volume rule as part of the system
- `src/pages/llms.txt.ts` (edit) — the new URLs
- `tests/season.test.ts` (create), `tests/training-page.test.ts` (create)
- `tests/build-output.test.ts`, `tests/design-system.test.ts` (edit — new surfaces)
- `CLAUDE.md` (edit — the new route family and the one-dataset rule)
- `plans/README.md` (edit — status row only, at the end)

**Out of scope**:
- `src/pages/patches/`, `src/components/Patch.astro`, `src/lib/patch-doc.ts`. **The wall does not
  change in this plan.** Every existing URL, heading, twin and gate survives untouched. If the
  spine appears to need a change to the bib, it needs a container change instead.
- `src/pages/index.astro` and `src/components/Goal.astro` — that is plan 047. Nothing on the home
  page moves here, and in particular no control on the home page points at `/training` yet.
- `src/lib/projection.ts` — unchanged, for the reason plan 045 gives.
- `src/data/weeks/` — read only.

## Git workflow

- Branch: `advisor/046-draw-the-year-as-one-spine`
- Conventional commits; match `git log --oneline -20`.
- Do NOT push or open a pull request unless the operator instructs it.

## Steps

### Step 1: Merge the two datasets in one module

Create `src/lib/season.ts`. It reads `EVENTS` (`src/data/races/index.ts`) and `WEEKS`
(`src/data/weeks/index.ts`) and emits, for one calendar year and one sport scope, an ordered list of
spine rows:

```ts
export type SpineRow =
    | {kind: "week"; key: string; monday: string; sunday: string; ahead: boolean; totals: WeekTotals}
    | {kind: "race"; event: RaceEvent; state: PatchState}
```

Rules, each of which must be a comment in the file:

- **Ordering is future-first**, matching the wall (`patchWall` sorts next race first). A race row
  sits directly under the week row it falls in.
- **A race is a subset of its week, never an addition.** Its metres are already in a `TrainingWeek`
  session, because a race is a Strava activity. The year summary therefore reads
  *"2886.8 km this year, 621.9 of it in races"* — **"of it", never "plus"**. Any figure that adds
  them is double counting, which is the class `src/data/races/index.ts` records costing 5 km/wk once
  already.
- **The year filter scopes by the week's MONDAY, and the file's key does not.** These are plan
  045's two separate rules and collapsing them is the mistake that plan had to correct: `2026-W01.ts`
  is an ISO-week key holding December-2025 sessions, and `/training/2026` excludes it because its
  Monday (29 December 2025) is not in 2026. Verified: `2025-W01`, `2026-W01` and `2030-W01` all
  begin in the previous calendar year, and 2026 has **53** ISO weeks.
- **`BUILD_DATE`, never `UPDATED_AT`.** "Is this week ahead" is a calendar question, and
  `CLAUDE.md`'s two-clocks rule assigns those to `src/lib/today.ts`. `patchState` already does this;
  match it.
- **Do not import this module from anything `uno.config.ts` reaches** — it pulls in a glob.

Reuse `patchState` from `src/lib/projection.ts` rather than re-deriving whether a bib is earned. The
two consumers must agree about every race or the page contradicts the wall.

**Verify**: `pnpm check` → exit 0.

### Step 2: Write the copy

Create `src/content/training.ts`. Every string the page prints lives here — heading, lede, the
filter labels, the year labels, the summary captions, the legend words. **Do not type a string into
an `.astro` file**; `CLAUDE.md` states copy is content, not markup, and `src/content/races.ts` is
the exemplar for the shape and for the doc-comment style.

The heading is the string plan 047's control will be held to. Choose it here and note in the file
that `tests/build-output.test.ts` asserts a control's label against its destination's heading.

**Verify**: `pnpm check` → exit 0.

### Step 3: Draw the spine

Create `src/components/WeekRow.astro` — one week: its number, its date span, a stacked run/ride
volume bar, its kilometres, its session count and its time.

The volume bar is **the one new drawing this plan adds**, and it is deliberately the same vocabulary
the progress rule already speaks: a flat 2px-family bar filled from `--sport-run` and `--sport-ride`
over `--progress-track`. It is a *series* where the progress rule is a *fraction* — say that in the
component's own comment, because it is the reason a second bar is allowed to exist at all.

**A week that has not happened is drawn exactly like a race not yet earned**: no fill, a hairline at
`color-mix(in srgb, var(--text) 32%, transparent)`. One rule, two objects — this is the strongest
argument for the whole integration and it must be written down where the rule lives, not only here.

Constraints that will redden a gate if broken:
- No absolute height anywhere inside a card (`tests/card-fill.test.ts`).
- Every length that a reader's text size should move is font-relative (`tests/page-fit.test.ts`).
- Any hand-written `:hover` carries `@media (hover: hover)` in its own prelude and is split from any
  `:focus-visible` sharing its selector list.
- Any `:active` that paints ink also carries `transition-none`, and any press on a held link needs a
  `[data-leaving]` twin — an **attribute**, never a class.
- The row must survive 200 % text zoom without shattering. The bib's ledger already solves this
  problem with two container queries (`@container (max-width: 14em)` and `(max-width: 9em)`) —
  read `.bib-ledger` in `src/components/Patch.astro` and follow it. **Measure at a 40px root before
  claiming it holds**; a copy change is a layout change here.

**Verify**: `pnpm build` → exit 0; `pnpm test` → exit 0.

### Step 4: Add the route

Create `src/pages/training/[...sport].astro`, prerendering `/training`, `/training/running`,
`/training/cycling` — the same rest-parameter shape as the wall, so filtering by sport is a real URL
rather than client state.

Render, in order: the page header (via the layout's `header` prop — **do not draw a second way back
by hand**), the heading, the lede, a year chip row, a sport chip row, then a card holding the year
summary, the legend and the spine.

Every item in both chip rows is a `chip`. **No plate appears on this page**: a plate is a card's
single action, and this page is a wall, not a card. `tests/control-geometry.test.ts` discovers
controls from their surface's signature in the shipped sheet and will notice.

The year chip row is what replaces the wall's *every-race-in-any-year* scope. Ship **only the
current year** unless `src/data/weeks/` holds others; a year with no weeks gets no chip.

**Verify**: `pnpm build` prints the three new routes; `pnpm preview` renders them.

### Step 5: Give it a markdown twin

Create `src/lib/training-doc.ts` plus the two endpoint files, mirroring `patch-doc.ts` /
`patches.md.ts` / `patches/[sport].md.ts` exactly — including *why* it takes two files: a rest
parameter matches zero segments only where it is a whole path segment, so nothing under
`training/` can also emit `/training.md`.

**The document restates nothing.** Type a distance, a clock, a count or a state word into
`training-doc.ts` rather than deriving it and it is a second home nothing will notice, because a
rendered document matches its own snapshot whatever it says. That failure mode is written out in
`CLAUDE.md`; do not reproduce it.

Add the three new URLs to `src/pages/llms.txt.ts`.

**Verify**: `pnpm test` → exit 0, snapshots regenerated with `pnpm test:update` **run twice** —
judge the second run (the first writes, the second proves).

### Step 6: Publish the new drawing into the design system

The volume bar is a mark a reader can see, so it belongs in `src/content/design.ts` — the one
authored description of this system, which `/design`, `DESIGN.md`, `/design.md` and
`.design-sync/conventions.md` all render.

`tests/design-system.test.ts` holds every rendering to that module in both directions: a section
that reaches one surface and not the rest is red rather than silent. Add the bar where it belongs by
subject (it is a mark, not a control), give it the industry's word for a heading rather than this
site's, and **do not restate anything another section already says** — the sections are subjects,
not owners.

**Verify**: `pnpm test` → exit 0.

### Step 7: Gate it, then watch each gate fail

Create `tests/season.test.ts` and `tests/training-page.test.ts`, each opening with a block above its
first `describe(` stating what the suite is for.

At minimum:

1. **No double counting.** The year summary's "of it in races" figure is less than or equal to the
   total, and every race's metres appear in exactly one week.
2. **The wall and the spine agree.** For every race in the scoped year, the state the spine draws
   equals `patchState`'s answer.
3. **The Monday rule at the boundary.** Assert against the real calendar, not a fixture:
   `/training/2026` excludes `2026-W01` (Monday 29 December 2025) and includes `2026-W53`
   (2026 has 53 ISO weeks); no week appears under two years, and no week with sessions appears
   under none.
4. **The clock.** With `BUILD_DATE` mocked forward, weeks flip from ahead to behind and the summary
   moves; with `UPDATED_AT` mocked and `BUILD_DATE` held, nothing on this page moves.
   `tests/clock-split.test.ts` is the model — and note its lesson: mutate **one** default at a time,
   because flipping all of them only proves the union is covered.
5. **Reachability.** `tests/build-output.test.ts` walks the link graph from `/` and fails a page
   nothing reaches. **This plan does not link the new pages from `/`** — plan 047 does. Add the
   route to the gate's known-unreachable exemption **with an expiry note naming plan 047**, or ship
   046 and 047 in one pull request. Pick one and say which in the PR body. Do not silently widen the
   exemption: `CLAUDE.md` records that `/404` is its one exemption and that both exemptions are
   asserted as facts about that page.
6. **Rendered HTML, not a green build.** Assert the spine's actual output — a week row's figures, an
   ahead week's outline treatment, a race row's bib — against `dist/`, not against a component's
   props.

Then mutate each gate on purpose and record in the PR body which test reddened. A gate nobody has
watched fail is a claim about a gate.

**Verify**: `pnpm test` → exit 0, and every mutation reddened its intended test.

### Step 8: Write the rule down

Edit `CLAUDE.md`: the new route family, the two markdown-twin endpoint files, and — the part that
matters — **the one-dataset rule**: a race is a Strava activity, so it is already in its week; the
spine adds nothing to the year, it only marks it. And the outline rule: *not earned yet* now covers
a booked race, a DNF and a week ahead.

`tests/docs-drift.test.ts` gates this file for accuracy: every path, `pnpm` script and configured
name in backticks must exist. The shortcut count is derived from `uno.config.ts` and must be spelled
out — reword around it, never edit the number by hand.

**Verify**: `pnpm test` → exit 0.

## Test plan

New: `tests/season.test.ts` (the merge and the two scopes; pattern after `tests/projection.test.ts`),
`tests/training-page.test.ts` (the rendered page; pattern after `tests/patch-wall.test.ts` and
`tests/rendered-html.test.ts`).

Extended: `tests/build-output.test.ts` (the new routes), `tests/design-system.test.ts` (the new
section), `tests/docs-drift.test.ts` picks up `CLAUDE.md` automatically — `liveDocs` discovers its
subjects rather than listing them.

Verification: `pnpm test` → exit 0.

## Done criteria

ALL must hold:

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test` all exit 0
- [ ] `pnpm build` prints `/training`, `/training/running`, `/training/cycling`, `/training.md`, `/training/running.md`, `/training/cycling.md`
- [ ] `/patches`, `/patches/running`, `/patches/cycling` and their three twins are byte-identical to `main` — prove it: `find dist -type f | LC_ALL=C sort | xargs shasum -a 256` on both trees, and diff the manifests; every `patches` line matches
- [ ] `grep -rn "control-cta" src/pages/training/` returns no matches (no plate on this page)
- [ ] Rendered assertions read `dist/`, not component props
- [ ] Each new gate was watched failing; the results are in the PR body
- [ ] Measured at a 40px root: no control box and no text ink past a clip edge on the new page
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `src/data/weeks/` is empty. Plan 045 has not landed; this plan has nothing to draw.
- The spine appears to require a change to `src/components/Patch.astro`. It does not — the bib is
  reused unchanged, and a container problem is solved in the container.
- `tests/build-output.test.ts`'s reachability gate cannot be satisfied without widening its
  exemption beyond the single expiring entry in step 7.
- The year summary's total and the sum of its week rows disagree.
- A gate you added stays green under its own mutation.
- The work appears to require touching `src/lib/projection.ts`, `src/pages/index.astro` or
  `src/components/Goal.astro`.

## Maintenance notes

- **`/patches` is now a view, not a page.** It renders the races-only slice of the same dataset. If
  a future change makes the two disagree about a race's state, the bug is that something re-derived
  `patchState` instead of calling it.
- **The year chip row is the wall's old scope, relocated.** The wall still shows every year at once;
  the spine shows one. That asymmetry is deliberate — a wall of fourteen is scannable and a spine of
  five years is not.
- **What a reviewer should scrutinise**: that no figure adds races to weeks; that the markdown twin
  derives rather than restates; that the reachability exemption is expiring rather than permanent.
- **Deferred**: the authored weekly record (prose, photographs), and the models and forecast
  scorecard. Both land *into* this page rather than needing one, which is the whole point of
  building the surface first. Keep the learned layer in its own module when it comes — that is the
  obligation the deferred ownership question carries.
