# CLAUDE.md

## Project Overview

This is a personal portfolio website built with Astro, featuring a bento-style,
minimal design. The home page is a single-screen bento grid showing Calvin's
professional background, his cycling and running goals, and personal interests;
`/patches` is a wall of **every race he has entered**, in any year, drawn as bibs,
with a prerendered page per sport. A **Finisher Patch** is a race completed and
earned, which is why the wall's headings say "events" and only the earned bibs are
patches. **An outline is a bib with no patch on it, and that is TWO different
facts**: a race still to come, or one that was started and not finished. They share
a treatment because the treatment means "not earned"; what tells them apart is the
word each one prints — `Booked` in the meta row, or `DNF` in the hero slot. See
`patchState` in `projection.ts` and `.bib--dnf` in `Patch.astro`.

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

- `pnpm test` — the change gate the sections below refer to. It runs `pnpm build`
  first (`globalSetup` in `vitest.config.ts` points at `tests/setup/build.ts`), so
  the `dist/` assertions have real artifacts; that setup honours `SKIP_BUILD=1` to
  reuse an existing `dist/` while iterating
- `pnpm eslint` and `pnpm check` — not `lint`, not `typecheck`; neither of those
  script names exists. The `build` job in `.github/workflows/ci.yml` runs all
  three (`check`, `eslint`, `test`), and both deploy jobs sit behind
  `needs: build`, so a red run of any of them blocks the deploy.
  `eslint` globs `src/**/*.{js,astro}` only, so a clean run says nothing about
  the `.ts` files — those are gated by `pnpm check` (tsconfig includes `**/*`)
  and by the suite
- `pnpm preview` serves the built `dist/` directory locally on
  http://localhost:4321 — the site is a static build with no adapter, and the
  deploy jobs upload the very `dist/` the suite asserted against rather than
  rebuilding, so the preview is byte-identical to production
- **`pnpm test` gates the prose too, and it is the only thing that does.**
  `tests/docs-drift.test.ts` reads this file, `README.md`, `.devin/wiki.json` and
  every comment under `src/`, and holds each against the code. **Which gate applies
  depends on what kind of document it is**, and that distinction is the design
  rather than a detail:
  - a **current-state** document (this file, `README.md`, `plans/README.md`'s
    baseline table, every comment under `src/`) may state facts and is gated for
    accuracy — a path, a `pnpm` script or a configured name in backticks must
    exist; `README.md` must name every suite; this file must name every shortcut
    and how many there are, by **canonical phrase**: the number is derived from
    `uno.config.ts` and the sentence must contain it spelled out (`four
    shortcuts`), so reword around it freely and never edit the number by hand
  - `.devin/wiki.json` is a **standing instruction** for a wiki generator, read on
    every future run against code that has moved. It is gated for durability, not
    accuracy: **no counts, no component filenames, no exported constant names**,
    and every page it specifies must say where to derive those at generation
    time. Do not "helpfully" add a fact to it — the right fix for a fact that
    could go stale is to delete the claim and name its source. That file once
    said the site's client JS was two inline scripts when the build shipped three
  - a numbered plan under `plans/` is a **proposal** — it describes a repository
    that does not exist yet, so it is exempt from the three gates that check a name
    against the tree that does, and gated for everything else. `plans/README.md` is
    the living index rather than a proposal and is gated in full. The argument sits
    beside `isProposal` in `tests/docs-drift.test.ts`
  - measurement and rationale are ungated everywhere; `plans/done/` is exempt as
    an archive. When one of these goes red, the document is what is wrong
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
  `blocklist`, **four shortcuts**, the presets, and a `theme` key holding **only**
  the five breakpoints. Those are presetWind3's own defaults restated in `rem`,
  which is load-bearing rather than cosmetic — see the note there. No colour or
  shadow token lives in `theme`; those are CSS custom properties in
  `BasicLayout.astro`
- **The shortcuts are the site's kinds of control**: `control-surface` (the
  plate, accent border, hover and press — no box, and nothing wears it directly),
  `control` (that surface at 64x48, icon-only: six social links and the theme
  toggle), `control-cta` (that surface at the width of what contains it, holding a
  label and its mark centred as one legend — the two goal cards' way out) and
  `text-link` (a link that is a run of words — the wall's way back, each role
  card's company name).
  **A control PINS its box or FLOORS it, and which one is decided by whether its
  content comes from data**; `tests/control-geometry.test.ts` discovers every
  control from the surface's signature in the shipped sheet and holds that line,
  so a third variant is caught rather than skipped. Every link must carry a
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
  by an inline `<script is:inline>` in `<head>` before first paint

### Layout Hierarchy
- `src/layouts/BasicLayout.astro` wraps every page
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
its kind lives rather than by opening one file and scrolling. `src/content/home.ts` is
the home page's cards, `src/content/site.ts` the copy every page wears plus the 404 page,
`src/content/races.ts` the racing copy, `src/data/goals.ts` the two goals as authored —
and THE RACES are one module each under `src/data/races/`, so adding one is writing a
file rather than editing a list. The procedure and every field are in the README beside
them. Each module's own head says what it holds; read that rather than a list here, which
is the enumeration-in-two-places failure the Plans section names. The entries below are
the ones carrying non-obvious constraints:
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
  rather than a figure in every row, which is the point of storing the metres. Nothing
  offline can catch a mistyped `metres`; only `tests/strava-verify.test.ts` can, and it is
  opt-in.
  **`advertised_km` IS THE ORGANISER'S DISTANCE AND MAY SIT BESIDE THE METRES**, which is the
  one guard the ledger cost: that field was `km?: never` on a recorded race, so the compiler
  refused the pair. It cannot now, because the pair is the ledger's whole subject. What the
  type used to enforce is the PRECEDENCE, and that moved into `raceKm` — the metres win
  wherever both exist — with a test in `tests/content.test.ts` that names the rule and
  three more gates that redden on the mutation. `official` may only appear beside an
  `advertised_km`; the `Documented | Undocumented` pairing is what says so
- `PATCHES`: the wall's own prose, now one lede rather than a scope sentence plus a key.
  Its heading is `My events`; "patch wall" survives in the URL and the metaphor, not as a
  visible title

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