# CLAUDE.md

## Project Overview

This is a personal portfolio website built with Astro, featuring a bento-style,
minimal design. The home page is a single-screen bento grid showing Calvin's
professional background, his cycling and running goals, and personal interests;
`/patches` is a wall of **every race he has entered**, in any year, drawn as bibs,
with a prerendered page per sport; `/training` is the same dataset drawn as a
series — one bar a week for a whole calendar year, with the races on the weeks
they were ridden in. A **Finisher Patch** is a race completed and
earned, which is why the wall's headings say "events" and only the earned bibs are
patches. **An outline is a bib with no patch on it, and that is TWO different
facts**: a race still to come, or one that was started and not finished. They share
a treatment because the treatment means "not earned"; what tells them apart is the
word each one prints — `Booked` in the meta row, or `DNF` in the hero slot. See
`patchState` in `projection.ts` and `.bib--dnf` in `Patch.astro`.

**THAT OUTLINE IS ONE TREATMENT WORN BY THREE OBJECTS, AND THE THIRD IS ON THE
OTHER PAGE.** A week that has not happened is drawn exactly like a race not yet
earned — the same `color-mix(in srgb, var(--text) 32%, transparent)` hairline, no
fill — because the treatment means "not earned, not yet, nothing here" and it means
that wherever it appears. The word is again what separates them: `Ahead` on a week,
where a bib prints `Booked` or `DNF`. It is a hairline rather than a stroke on a
week, which is what keeps eighteen weeks nobody has ridden from being the loudest
thing in the column. See `.spine-row--ahead` in `WeekRow.astro`, and note the second
half of the same rule: an elapsed week with no training draws a full-length TRACK
with no fill, so a rest week in March and a week in November are not one picture.

**THE RACES AND THE TRAINING ARE ONE DATASET, AND `/training` IS WHERE THAT STOPS
BEING A CLAIM.** A race stores `recordings: [{id, metres, elapsed_time}]`, one entry
per Strava activity, and a `TrainingWeek` stores the same activities as sessions —
so a race's kilometres are ALREADY INSIDE its week. The year summary therefore reads
"N km this year, M **of it** in races", never "plus": any figure that adds them is
the double count `src/lib/projection.ts` refuses at length. `seasonTotals` in
`src/lib/season.ts` makes it true by construction rather than by arithmetic that
happens to agree — the race figure is the sum of the sessions whose Strava id is one
of a race's recording ids, so it is literally a subset of the total it is quoted
against. **The spine adds nothing to the year; it only marks it.**

**A race can be known TWICE and the bib prints both accounts without reconciling
them.** Any bib that is not booked carries a **ledger**, and a DNF carries one too —
which is the point rather than an edge case, since an abandoned race is exactly
where the two accounts are most worth reading side by side. Each row is one source,
holding that source's own distance beside that source's own clock —
`OFFICIAL 21.10 3:30:59` over `RECORDED 22.45 3:44:25`. The rule the whole device
rests on is that **nothing a reader can divide crosses two sources**, which is
strictly stronger than the `Elapsed` label it replaced. A certified course and a GPS
trace disagree by design, and so do a chip time and a watch; publishing the
disagreement is the point. `OfficialResult` in `src/lib/race.ts` has the argument, and
`.bib-ledger` in `Patch.astro` has the drawing — **including the two container arms
that restack it as the reader enlarges the text**, without which the three-column
form shatters a row's name into single letters at the 200% WCAG requires.

**The one scope rule**: the wall is the whole calendar; a goal card is `GOAL_YEAR`
alone. `EVENTS` feeds both, and `eventsInYear` in `projection.ts` is what keeps a
race booked for next November from paying off this year's required rate. Read the
block above it before giving either consumer the other's list.

## Commands

- **`pnpm-workspace.yaml` is pnpm's settings file and this is NOT a workspace** — read
  it before adding, removing or bumping a dependency. It turns peer auto-install off,
  so a package needing a required peer no longer gets one silently; the argument, and
  what was measured to reject every narrower lever, are in the file. Settings do not go
  in `package.json` — pnpm ignores that field and says so in a warning that reads like a
  setting having no effect
- `pnpm test` — the change gate the sections below refer to. It runs `pnpm build`
  first (`globalSetup` in `vitest.config.ts` points at `tests/setup/build.ts`), so
  the `dist/` assertions have real artifacts; that setup honours `SKIP_BUILD=1` to
  reuse an existing `dist/` while iterating
- `pnpm eslint` and `pnpm check` — not `lint`, not `typecheck`; neither of those
  script names exists. The `build` job in `.github/workflows/ci.yml` runs all
  three (`check`, `eslint`, `test`), and both deploy jobs sit behind
  `needs: build`, so a red run of any of them blocks the deploy — and now blocks the
  MERGE as well, because `build and test` is a required status check on `main`. Those
  are two different guarantees and only the second one is new: `needs: build` always
  stopped a red run from publishing, but nothing stopped a red pull request from
  landing on `main` in the first place. **The required check lives in repository
  settings rather than in this tree**, so nothing here can assert it and no gate will
  notice if it is removed
  `eslint` globs `src/**/*.{js,astro}` and `scripts/**/*.mjs`, so a clean run
  still says nothing about the `.ts` files — those are gated by `pnpm check`
  (tsconfig includes `**/*`) and by the suite. The scripts arm needs its own
  block in `eslint.config.js` carrying its own globals; widening the glob alone
  matches no config and reports zero problems, which reads exactly like a pass
- `pnpm preview` serves the built `dist/` directory locally on
  http://localhost:4321 — the site is a static build with no adapter, and the
  deploy jobs upload the very `dist/` the suite asserted against rather than
  rebuilding. **What that buys is a property of CI, not of your machine**: it is
  the artifact the suite gated that ships, so nothing is rebuilt between the
  green check and the deploy. A LOCAL preview is not those bytes. Two inputs are
  read at build time and neither is yours: `UMAMI_ID` comes from a repository
  variable, so the analytics tag in `BasicLayout.astro` renders without its id
  and the whole attribute is dropped; and `src/lib/today.ts` stamps the day the
  build ran, so a page built today differs from one built yesterday by
  construction. Use the preview to check what you changed, and a preview deploy
  to check what will ship
- **`pnpm test` gates the prose too, and it is the only thing that does.**
  `tests/docs-drift.test.ts` **discovers** its subjects rather than listing them —
  `liveDocs` walks the tree, so a document added today is gated the moment it
  lands, and a new file that no gate reaches is treated as the same defect as a
  stale one. **Which gate applies depends on what kind of document it is**, and
  that distinction is the design rather than a detail:
  - a **current-state** document (this file, `README.md`, `CONTRIBUTING.md`,
    `scripts/README.md`, `plans/README.md`'s baseline table, every comment under
    `src/`) may state facts and is gated for
    accuracy — a path, a `pnpm` script or a configured name in backticks must
    exist; this file must name every shortcut
    and how many there are, by **canonical phrase**: the number is derived from
    `uno.config.ts` and the sentence must contain it spelled out (`four
    shortcuts`), so reword around it freely and never edit the number by hand
  - `.devin/wiki.json` is a **standing instruction** for a wiki generator, read on
    every future run against code that has moved. It is gated for durability, not
    accuracy: **no counts, no component filenames, no exported constant names**,
    and every page it specifies must say where to derive those at generation
    time. Do not "helpfully" add a fact to it — the right fix for a fact that
    could go stale is to delete the claim and name its source. That file once
    said the site's client JS was two inline scripts when the build shipped three.
    **It is the only member of this class, and widening it is the tempting wrong
    move**: two of the four durability predicates are wiki-specific by their own
    rationale — a generator can look up whatever a thing is called today, and a
    contributor setting a secret cannot. Run against the Markdown, they read a
    CLI flag as a CSS custom property and a repository variable as an exported
    constant. Measured by running those four predicates — they are in
    `tests/docs-drift.test.ts` — over the three documents: `CONTRIBUTING.md` 2
    findings, `README.md` 10, `scripts/README.md` 20, and every one of the 32 is
    prose the document exists to carry. **Re-derive rather than trust: nothing
    gates these four figures**, so an edit to any of the three moves them
    silently — as one did here, deleting a single paragraph from
    `CONTRIBUTING.md` and taking the total from 33 to 32 with nothing reddening
  - a numbered plan under `plans/` is a **proposal** — it describes a repository
    that does not exist yet, so it is exempt from the three gates that check a name
    against the tree that does, and gated for everything else. `plans/README.md` is
    the living index rather than a proposal and is gated in full. The argument sits
    beside `isProposal` in `tests/docs-drift.test.ts`
  - measurement and rationale are ungated everywhere; `plans/done/` is exempt as
    an archive. When one of these goes red, the document is what is wrong
- **`.claude/skills/` IS EXECUTABLE CONTENT, AND IS GATED AS SUCH.** A skill is
  tracked, so it is on disk for anyone who checks out a branch, and it can run shell
  at load time before the agent reads the policy in it.
  `tests/skill-guards.test.ts` holds what any skill may declare and what a
  merge-capable one must say; its header states which of its assertions are
  structural and which are shape checks over prose that cannot read meaning. **The
  trap that is not discoverable from the code: a rule against a phrase is enforced by
  matching that phrase, so the document may not QUOTE the exception it refuses** —
  state the rule instead. That is measured rather than hypothetical, and reddened on
  correct prose the first time
- **A DOCUMENT THAT RESTATES A LIST THE CODE OWNS IS HELD TO THAT LIST.** Naming a
  real `pnpm` script is not the same as naming the right SET of them, so
  `CONTRIBUTING.md`'s change-gate block is asserted against the steps in
  `.github/workflows/ci.yml`'s `build` job, in order. Add a check to CI and that
  document reddens until it learns about it — which is the point, since it is the
  one list a contributor copies verbatim
- **A SUITE SAYS WHAT IT IS FOR, ABOVE ITS OWN FIRST `describe(`.** `README.md`
  used to carry a complete list of the suites and was gated on it, which put an
  enumeration of `tests/` in prose on the front page — the exact failure the rest
  of `docs-drift` exists to catch. The explanation moved to the suite instead, so
  a reader asking what one is for opens it, and a suite added without a reason is
  red rather than merely unmentioned. The floor is measured rather than chosen;
  the argument and the measurement sit beside the gate in
  `tests/docs-drift.test.ts`
- **`pnpm test` does not cover the DNS zone.** What a plan would actually do to
  `calvin.sg` — that Email Routing's `MX` records, the `read_only` DKIM key and
  `_dmarc` all survive the reject lists, and that `pagerules` stays off so the
  `www` redirect is invisible rather than deleted — is proved by
  `dns/test_filters.py`, which needs Python plus octoDNS and runs only in
  `.github/workflows/dns.yml`. `tests/dns-config.test.ts` *is* in the suite, and it
  guards that workflow's `if:` gates, reads the shipped `dns/config.yaml` and
  executes `dns/drift.sh` against fixtures of every output shape octodns can print
  — but it says nothing about the resulting plan. A green `pnpm test` is therefore
  not evidence that a DNS change is safe — read the `plan` job's output for that

## Key Architecture Points

- **UI Components**: Astro components only — no client-side UI framework
- **Animation**: CSS animations only

### Styling System
- **UnoCSS**: Atomic CSS. `uno.config.ts` holds the icon safelist, the
  `blocklist`, **six shortcuts**, the presets, and a `theme` key holding **only**
  the five breakpoints. Those are presetWind3's own defaults restated in `rem`,
  which is load-bearing rather than cosmetic — see the note there. No colour or
  shadow token lives in `theme`; those are CSS custom properties in
  `BasicLayout.astro`
- **The shortcuts are the site's kinds of control, and they come in TWO WORLDS
  divided by loudness rather than by page.** THE RULE IS ONE SENTENCE: **the plate
  is spent on a card's SINGLE ACTION and on nothing else**; everything that is
  chrome — getting somewhere, and setting a preference — is a chip. Draw a plate in
  a page header, or on a member of a set, and you have spent the strongest mark
  this palette has on furniture. Each kind has one sentence:
  - `control-surface` — the plate, accent border, hover and press. No box, and
    nothing wears it directly
  - `control-cta` — that surface at the width of what contains it, holding a label
    and its mark centred as one legend: **this card's one action**. Three cards on
    the home page have one, so three plates are drawn — the intro card's way into
    the wall, and each goal card's way out to its sport
  - `text-link` — **a link inside a run of words**: each role card's company name
  - `chip-surface` — a hairline at a fraction of the ink, the bib's 2px corner, an
    opaque ground, NO plate. A base nothing wears directly
  - `chip` — that surface floored at 44px on both axes, holding a label set small
    and tracked wide: **a quiet control that names itself**. The wall's filter row,
    and every item in a page header
  - `chip-icon` — the same surface pinned at 44x44 for one mark: **one of a set, or
    a preference**. The intro card's block of destinations, and the theme toggle
    everywhere it appears — including the last cell of that block, where nothing
    marks it out but its own stroked mark, its `button` element and its position

  There is deliberately **no plated box for a mark alone**. There was one, worn nine
  times on the home page, and retiring it is what this vocabulary is: an action names
  itself in words, so a control that is only a glyph is a member of a set or a
  preference, which is the quiet kind.
  **A control PINS its box or FLOORS it, and which one is decided by whether its
  content comes from data**; `tests/control-geometry.test.ts` discovers every
  control from ITS OWN surface's signature in the shipped sheet — one route per
  world, deliberately not collapsed, because a plate and a chip have different
  contracts, plus a third for the intro card's block of quiet controls, which is the
  one place a row of them has to fit a column — and holds that line, so a further
  variant is caught rather than skipped. **That block groups its cells a fixed number
  to a row and this is a GROUPING, not a column count**: nothing reads a width, each
  row is still an ordinary wrapping row whose minimum is one box, and the preference
  takes the last cell whatever `LINKS` holds. The count that is forbidden is the one
  a media query grants. Every link must carry a
  signifier a reader can perceive, and a build-wide gate in
  `tests/build-output.test.ts` walks every `<a>` on every page to enforce it — its
  absence let five links ship drawn exactly like the prose beside them. A bib's stub
  is the one exception the gate names: a `.bib-stub-link` on a `.bib-stub` carries its
  signifier in the bib's own idiom — a mark, an imperative label at the bib's emphatic
  weight, and the perforation the stub is drawn with — rather than as a text link. It
  was TWO exemptions until every destination became a stub line
- **A hover style must need a pointer to produce it.** A touch browser applies
  `:hover` on tap and holds it until the reader taps elsewhere, so every `hover:`
  utility is emitted inside `@media (hover: hover)` by the `hover-needs-a-pointer`
  preset in `uno.config.ts` — which **must stay above `presetWind3`**, since
  variants resolve in preset order and below it the guard silently emits nothing.
  A hand-written `:hover` carries the guard in its own prelude and must be split
  from any `:focus-visible` it shares a selector list with, because that one is a
  keyboard indicator every device needs. `tests/build-output.test.ts` enforces this
  as a universal with no carve-outs
- **A press must be drawn, and must outlive the finger** — two gates in
  `tests/build-output.test.ts` fail the DEPLOY, not just the suite, so read this before
  adding a control. Any `:active` that paints ink must also carry `transition-none`
  (both shortcuts transition `color` over 300ms, so a bare press ink ramps and a ~100ms
  tap shows a third of it), and any press on a link the inline script would hold needs a
  `[data-leaving]` twin touching at least one of the same properties. **`data-leaving` is
  an ATTRIBUTE, never a class**: the orphan gate reads a selector's leading class token
  and its state-class excuse needs a scoped selector, which UnoCSS output never is, so
  `.is-leaving` would redden a correct build. The twin may differ from the press where
  holding it would be wrong — the current sport chip is the one case, and says why in
  place. Held-eligibility is derived from the script's own refusals (`target="_blank"` is
  what excludes every link on a bib), so it follows the markup rather than a list
- **Text-relative sizing**: every breakpoint, `main`'s height clamp, the card
  heading's space and the control box are font-relative, so the page grows with
  the reader's text instead of clipping it. `tests/page-fit.test.ts` and
  `tests/card-fill.test.ts` forbid an absolute length in the first three, and
  card-fill catches an absolute *height* inside any card, the control box
  included; only `tests/control-geometry.test.ts` gates that box's width. **A box
  is not enough on its own**: the goal cards' control also has to let its label
  break, or the reader's own text size pushes the words into a clipping card —
  measured at 42.2px of lost ink at a 40px root, and gated by
  `tests/rendered-html.test.ts`. Read the rationale before re-pinning one to
  pixels
- **Theme Support**: dark/light mode via CSS custom properties on
  `:root[data-theme]` in `src/layouts/BasicLayout.astro`; that block's header
  comment defines each token's role and the progress-bar polarity rule — read it
  before changing a colour. The active theme is written to `<html data-theme>`
  by an inline `<script is:inline>` in `<head>` before first paint.
  **Those two blocks are also READ AT BUILD TIME, as text, by `src/lib/palette.ts`**,
  which is what lets `/design` and `DESIGN.md` print what each token IS without a
  second home for any value. Their selector shape is therefore load-bearing for
  three readers rather than one — that module, `themeTokens()` in
  `tests/design-system.test.ts`, and `.design-sync/prepare-css.mjs` — so
  de-anchoring `:root` or moving the block retargets all three

### Layout Hierarchy
- `src/layouts/BasicLayout.astro` wraps every page
- **`src/components/PageHeader.astro` is the site's chrome, and it is ONE component
  with four consumers.** The layout renders it from a `header` prop: the way back, the
  markdown twin where the page has one, and the theme toggle, every item drawn as a
  chip. `/design` and the three wall routes carry it; **`index.astro` and `404.astro`
  do not**, and both are decisions — the home page's `<main>` has a measured height
  budget with zero slack and keeps its chrome in the intro card, and the 404's way back
  IS its content. A fifth page gets the header by setting the prop; do not draw a fifth
  way back by hand, which is the duplication this closed — only one of the four pages
  had a theme toggle, so a reader landing on the wall could not change theme at all.
  **The header is a sibling of `<main>` and never a descendant, because that is what
  makes it a `banner` landmark**: nested inside `<main>` it is silently demoted to a
  generic box, nothing renders differently, and `tests/page-header.test.ts` is the only
  thing that notices — measured, that mutation left every other test in the suite green
- `src/pages/index.astro` — the bento grid, responsive, one screen at the default
  text size from a 797px-tall viewport up. Its `<main>` owns the height budget and the
  32/32 lg grid. That budget is a **floor with no ceiling**, and the lg rows size to
  their content (`min-content`, not `grid-rows-8`): both halves are required by WCAG
  SC 1.4.12, which lets a reader enlarge the type without touching any font-size the
  page can see, so a grid that cannot grow deletes the difference. Read the note in
  `index.astro` before putting any ceiling — `max-height`, `height`, or a fraction row
  track — back on `<main>`. The right-hand stack no longer has a fixed height to
  exhaust, so the old "remove something before adding a line" rule is retired;
  `components/Goal.astro` records what it used to cost
- A goal card's body is a hero figure, a 2px progress rule spanning the body, the
  required rate, the countdown, and a full-width CTA (`components/EventsLink.astro`)
  reading `My <sport> events →`. That control is the only path from the home page to
  `/patches/<sport>`, and `tests/build-output.test.ts` walks the link graph from `/`
  to keep it that way — and asserts the destination is headed with the control's own
  words, which is a pairing no single-page test can see
- `src/pages/404.astro` — the answer to a URL the site does not have, and the only
  user of `BasicLayout`'s `noindex` prop, which flips the robots directive to
  `noindex, follow` **and** drops the canonical and `og:url` together. It exists because Cloudflare Pages serves
  `/index.html` with a 200 for an unknown path where no `404.html` is present, which is
  the textbook soft-404. Two build-wide gates in `tests/build-output.test.ts` name it as
  their one exemption — it is in no sitemap and nothing links to it — and both
  exemptions are asserted as facts about this page, so a second unreachable page fails
- `src/pages/patches/[...sport].astro` — the patch wall. One rest-parameter route
  prerenders three pages (`/patches`, `/patches/cycling`, `/patches/running`), so
  filtering by sport is a real URL rather than client state. Whether a bib is
  earned is DERIVED every build (`patchState` in `projection.ts`) **from facts the
  build can see**, and must never become a stored `done` flag. The ONE fact no build
  can see is an abandonment — no device models a DNF — so that one is TOLD, as
  `RaceEvent.outcome`. It is immutable history rather than an answer the calendar
  keeps re-deriving, which is the test the rule is actually made of; read the note on
  the field before adding a second
- `src/pages/training/[...sport].astro` — the spine. One rest-parameter route
  prerenders three pages (`/training`, `/training/cycling`, `/training/running`), the
  wall's own shape for the wall's own reasons. **The YEAR is not in the URL and that is
  a limit rather than a design**: a spine is one calendar year, so the page takes the
  year the build is in, and `src/data/weeks/` holds one year today. A second year of
  weeks is what makes a year segment real, and adding one moves every URL below
  `/training`. **Which weeks a year holds is decided by the week's MONDAY**
  (`seasonWeekKeys` in `src/lib/season.ts`), never by the first four digits of the ISO
  week key — those are a week-YEAR and answer a different question. The Mondays
  partition the calendar, so every week belongs to exactly one year's spine.
  **A RACE IS SCOPED BY ITS WEEK HERE AND BY `eventsInYear` ON A GOAL CARD**, and the
  two disagree for at most three days a year: a goal is a calendar-year promise, and a
  spine is a partition of weeks, so a race on 2 January sits on the week beginning in
  December. Read the block above `seasonSpine` before giving either consumer the
  other's rule.
- **The spine reads FORWARDS — January at the top — where the wall reads next-race
  first.** Both come from one principle and land in opposite places because the
  populations differ: the wall's forward-pointing run is four races and burying the
  next one is the defect, while the spine's is eighteen empty weeks, so future-first
  would open the page on eighteen rows of nothing and reverse the series in the
  bargain. A ramp, a taper and a gap are only legible in one direction.
- **Each of `/training`'s three URLs has a markdown twin too, and it takes the same TWO
  endpoint files.** `src/lib/training-doc.ts` renders the spine as markdown;
  `src/pages/training.md.ts` answers `/training.md` and
  `src/pages/training/[sport].md.ts` answers the two sport spines. The split is forced
  for the wall's reason, and the same restatement rule binds: type a distance, a clock,
  a count or a state word into `training-doc.ts` rather than deriving it and it is a
  second home nothing will notice.
- **Each of the wall's three URLs has a markdown twin, and it takes TWO endpoint files
  to serve them.** `src/lib/patch-doc.ts` renders the wall as markdown; the route
  filenames are the addresses. `src/pages/patches.md.ts` answers `/patches.md` and
  `src/pages/patches/[sport].md.ts` answers the two sport walls — a rest parameter
  matches zero segments only where it IS a whole path segment, so no single file under
  `patches/` can also emit `/patches.md`. The document restates nothing: type a
  distance, a clock, a count or a state word into `patch-doc.ts` rather than deriving
  it and it is a second home nothing will notice, because a rendered document matches
  its own snapshot whatever it says. It carries what `llms.txt` deliberately does not —
  **every source that has an account of a race, each keeping its own distance beside its
  own clock**
- **The site has TWO clocks and they answer different questions.** `UPDATED_AT` is
  the bot's stamp — "the day the kilometres last MOVED", frozen on purpose when they
  do not — and it stays on the dateline and the required rate, whose numerator and
  denominator must age together. `BUILD_DATE` (`src/lib/today.ts`, the one place in
  `src/` that reads a clock) is what day it is, and the calendar questions take it:
  `patchState`, `patchWall`, `patchesEarned`, `nextRace`. Using the stamp for those
  froze the wall and the countdown for as long as the owner rested — the home page
  said "in 5 days" on the day it was 4. **`tests/clock-split.test.ts` is what holds the
  split**, and it mocks the bot's JSON on purpose: the gates in `projection.ts`'s "the
  site's clock" block can only discriminate on a day the two clocks differ, so the bot
  stamping today silently switched them off — reverting the whole split was green at 314
  before that file existed. Mutate one default at a time when you touch this; flipping all
  four at once only proves the union is covered, which is how `patchWall` stayed uncovered
- **A race with BOTH `elapsed_time` and a `recordings` entry is finished because it
  was run**, whatever the clock says — that pair is the only way a race can be
  recorded on the day it happened. **`bookedAhead` books ONLY what the wall calls
  `booked`**, and it asks `patchState` to find out rather than re-deriving the reasons:
  the two consumers have to agree about every race or the card promises kilometres the
  wall says are not coming. Asking `hasRecording` instead was complete only while the
  wall had two states — it skips an abandoned race that was recorded and books one that
  was not. Recording a race you have just run is a
  two-step edit, and **which step goes first depends on whether the race is already in
  `EVENTS`**: a race not yet listed — fetch first (`gh workflow run strava-progress.yml`),
  then add it; a race already listed — add the recording first and let the cron follow.
  Fetching first on an already-listed race counts its distance twice, measured at 66 km/wk
  against an honest 71. There is no order that is right at both moments; read the note
  above `EVENTS` in `src/data/races/index.ts` before doing either, and `hasRecording` in
  `projection.ts` for why the pair means "run"
- **A race can be recorded as MORE THAN ONE Strava activity, and the bib's shape follows
  the count.** `recordings` is a list — a mechanical, a lost signal or a watch that died
  splits one race across several files. Count the rows rather than trusting any sentence
  about how many there are — and note that being split and being a DNF are INDEPENDENT:
  one race is both, and neither fact implies the other. The race's distance is the summed
  METRES converted once by `raceKm` (not the sum of the parts' printed figures: each
  conversion drops whatever is under a hundredth, so the parts' figures sum to at or below
  the race's own — never above it) and its `elapsed_time` is first start to last stop,
  never the sum of the parts: elapsed already contains stops, so it must not depend on
  where the rider pressed the button. Each part's own figures are printed on its own link
  so no link promises the bib's summed hero; see `Recording` in `src/lib/race.ts` for why they
  are stored
- **NO BIB IS EVER THE ANCHOR. Every destination is a line on the stub.** The rule it comes
  from is unchanged — a bib is the link when there is one place to go, and HOLDS the links
  when there is more than one — but a race can now have a published results sheet as well as
  a recording, so "more than one" is the ordinary case rather than the exception. Anchors do
  not nest, so one destination would have had to sit inside the other. What paid for it is
  `race_name` in `src/content/races.ts`: every stub link's accessible name carries the race and its
  date, which is the disambiguation the whole-bib form used to get for free from announcing
  the bib's entire text. **The results link goes ABOVE the Strava one**, because both cited
  sheets render for a logged-out visitor and every Strava link on the wall is a login wall.
  See `Patch.astro` for the whole argument

## Content Management

**Site content is split BY KIND, not by page**, so each piece is found by looking where
its kind lives rather than by opening one file and scrolling. The copy is under
`src/content/`, the authored goals and the races under `src/data/`, and `src/lib/goal.ts`
is what the cards actually read — it derives `GOALS` from the authored figures and is the
only thing that applies the clamp. **Each module's own head says what it holds; read that
rather than a list here**, which is the enumeration-in-two-places failure the Plans
section names.

**`src/content/` IS A NAME ASTRO RESERVES, and this repo is using it because the reserved
meaning is not switched on.** Astro treats that directory as the home of *content
collections*; with no `src/content.config.ts` and no `src/content/config.ts` present, a
plain `.ts` module there is ordinary source — measured before plan 021 shipped, build and
`astro check` clean, including a load through unconfig/jiti. **The day anyone adds a
collection config, that stops being true**, and these modules move rather than the
collection. Do not add one without reading this first.

The entries below are the ones carrying non-obvious constraints:
- `WELCOME`, and everything else the intro card renders: **`public/preview.jpg` is a render
  of that card**, and it is both README's hero and the site's `og:image`. Nothing builds it,
  so it went stale invisibly twice. `tests/content.test.ts` now fingerprints what the card
  depicts — the h1 stack, the greeting mark, the link out to the wall, the social glyphs in
  order and the portrait's bytes — so editing any of them reddens the suite until the hero is
  regenerated. **The recipe is beside that gate**, and it is acceptance criteria rather than
  advice: a regeneration that cannot reproduce the composition is recomposing the hero. A
  restyle still slips past, because the fingerprint watches the copy rather than the drawing
- `CAREER[0].job_name`: the site's only record of the current job. Most surfaces derive from
  it; `README.md`'s lede and `public/resume.pdf` are typed copies, and one of them has been
  wrong before. The README is gated — including against a title from further down the list,
  which is the defect the intro card once shipped. **The PDF is gated in HALF**: its declared
  `/Title` — what a browser tab and a search result show — is held to this value by
  `tests/content.test.ts`, which also refuses a title from further down the list. Its BODY text
  is unreachable from here and is still owed by hand on every re-export
- `NEXT_RACE`: the goal cards' countdown ladder and the control's label — width-budgeted,
  and the label is also the heading of the page it opens; see the note there
- `EVENTS`: every race entered, in any year, collected from `src/data/races/` by the
  `index.ts` beside them — read by both the projection and the patch wall, at two
  different scopes (see the rule above). Adding a past race is writing one module:
  `elapsed_time` and `recordings` are optional, so a race remembered without a
  recording is still a complete bib. **A race is one of TWO SHAPES and the type enforces it:**
  recorded, carrying each activity's `metres` exactly as the API reported them, or booked,
  carrying no recordings. Every consumer reads `raceKm`, which rounds the metres DOWN to two
  places — Strava's own rule, and the input is the API's `distance` rather than anything
  Strava renders. That rounding has been reversed twice and is now one line in `kmFromMetres`
  rather than a figure in every row, which is the point of storing the metres. **WHETHER an
  offline run catches a mistyped `metres` depends on the race's YEAR**, and knowing which
  half you are editing is the useful part: a row inside `GOAL_YEAR` feeds the projection's
  published figures, so `tests/derived-figures.test.ts` reddens on it — measured by adding a
  kilometre to one recording, which took exactly that one test red. A past-year row feeds no
  derived figure and is green everywhere; only
  `tests/strava-verify.test.ts` reads the API, and it is opt-in.
  **`advertised_km` IS THE ORGANISER'S DISTANCE AND MAY SIT BESIDE THE METRES**, which is the
  one guard the ledger cost: that field was `km?: never` on a recorded race, so the compiler
  refused the pair. It cannot now, because the pair is the ledger's whole subject. What the
  type used to enforce is the PRECEDENCE, and that moved into `raceKm` — the metres win
  wherever both exist — with a test in `tests/content.test.ts` that names the rule and
  three more gates that redden on the mutation. `official` may only appear beside an
  `advertised_km`; the `Documented | Undocumented` pairing is what says so.
  **EVERY FIELD `RaceEvent` DECLARES ALSO HAS A DECLARED ORIGIN**, in `src/lib/provenance.ts`
  — which carries the site's position on Strava's API Policy and the argument for it, and is
  held to the type in both directions by `tests/data-contract.test.ts`. Adding a field to the
  type without an entry there is red. **That module is INTERNAL: nothing renders it, and a
  gate walks the built output to keep it that way.** An origin names the original source of
  record and never a store the fact passed through, so `src/data/strava-progress.json` is not
  a legal value — read the rule at the top of the file before adding one
- `PATCHES`: the wall's own prose, now one lede rather than a scope sentence plus a key.
  Its heading is `My events`; "patch wall" survives in the URL and the metaphor, not as a
  visible title
- `src/content/design.ts`: the one authored description of this design system, and every
  surface that publishes it is a rendering of that module rather than a second copy of it.
  `tests/design-system.test.ts` holds each of those renderings to the module in BOTH
  directions, so a section that reaches one surface and not the rest is red rather than
  silent — and the smaller subset the design agent's document carries is now DECLARED in
  `src/lib/design-doc.ts`, with the reason for each drop beside it, rather than being
  whichever lines somebody happened to write. **The system publishes what it DOES and what it
  CALLS things alongside what it looks like** — its interaction states, its vocabulary and what it
  takes to reach and read any of it, sitting beside colour, type, controls and iconography as
  ordinary sections rather than an appendix. No section may restate another, wherever it sits: the
  sections are subjects and not owners, so a line belongs where it was first written down and a
  later section that wants it has to find the thing only it can say.
  **EVERY SURFACE CALLS A SECTION THE SAME THING, AND THAT THING IS THE INDUSTRY'S WORD RATHER THAN
  THIS SITE'S.** The DESIGN.md format names two of these sections itself; the rest take the term a
  reader arriving from another design system would search for. A heading is a lookup key, so it is
  not the place to be distinctive — the prose under it still says `a mark`, `a press`, `a word`.
  There was briefly a mapping in the renderer that let the page and the document disagree; it is
  gone, the content module authors the names, and `tests/design-system.test.ts` asserts the module
  and the format agree rather than translating between them. **A SECTION'S KEY IS NOT ITS HEADING
  and does not follow it** — the key is a public `#design-<key>` URL, so `palette` still addresses
  the section headed `Colors`. The argument for all of it is in `src/content/design.ts`

## Plans

`plans/` implements the **improve** skill pipeline from `github.com/shadcn/improve`;
`plans/README.md` is the living index and the first thing to read before writing or
executing one. Everything about the pipeline itself — the template, the file naming,
the numbering rule, the advisor/executor split — is read from upstream and never
restated, because a copied convention is one that goes stale in silence.

**What this repo writes down is only what upstream cannot say**, and that list lives in
`plans/README.md` rather than here, for the reason this whole section exists: an
enumeration kept in two places is an enumeration that will disagree with itself, and no
gate can see prose counting a set. This paragraph names where to read it, not what it
says.

## Memories

- Any user configurable variable belongs in one of exactly three places: a
  GitHub repository secret, a GitHub repository variable, or the repository's own
  content — `src/content/` and `src/data/`, which count as ONE home because the
  split between them is by kind rather than by who may edit it. Scripts and
  workflows hold no configuration of their own — see README.md "Configuration".