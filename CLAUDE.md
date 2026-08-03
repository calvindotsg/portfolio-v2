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
word each one prints — `Booked` in the meta row, or `DNF` in the slot the distance
would have had. See `patchState` in `projection.ts` and `.bib--dnf` in
`Patch.astro`.

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
  - measurement and rationale are ungated everywhere; `plans/done/` is exempt as
    an archive. When one of these goes red, the document is what is wrong
- **`pnpm test` does not cover the DNS zone.** What a plan would actually do to
  `calvin.sg` — that Email Routing's `MX` records, the `read_only` DKIM key and
  `_dmarc` all survive the reject lists, and that `pagerules` stays off so the
  `www` redirect is invisible rather than deleted — is proved by
  `dns/test_filters.py`, which needs Python plus octoDNS and runs only in
  `.github/workflows/dns.yml`. `tests/dns-config.test.ts` *is* in the suite, but
  it guards that workflow's `if:` gates and reads the shipped `dns/config.yaml`;
  it says nothing about the resulting plan. A green `pnpm test` is therefore not
  evidence that a DNS change is safe — read the `plan` job's output for that

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
  absence let five links ship drawn exactly like the prose beside them. A bib is
  the exception the gate names explicitly: the whole bib is the anchor and its
  signifier is the action row inside it, drawn in the bib's own idiom rather than
  as a text link
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
  what excludes every bib), so it follows the markup rather than a list
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
  earned is DERIVED every build (`patchState` in `projection.ts`) and must never
  become a stored flag
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
  recorded on the day it happened, and `bookedAhead` must skip the same races or the
  wall and the goal cards contradict each other. Recording a race you have just run is a
  two-step edit, and **which step goes first depends on whether the race is already in
  `EVENTS`**: a race not yet listed — fetch first (`gh workflow run strava-progress.yml`),
  then add it; a race already listed — add the recording first and let the cron follow.
  Fetching first on an already-listed race counts its distance twice, measured at 66 km/wk
  against an honest 71. There is no order that is right at both moments; read the note
  above `EVENTS` in `constants.ts` before doing either, and `hasRecording` in
  `projection.ts` for why the pair means "run"
- **A race can be recorded as MORE THAN ONE Strava activity, and the bib's shape follows
  the count.** `recordings` is a list — a mechanical, a lost signal or a watch that died
  splits one race across several files. Count the rows rather than trusting any sentence
  about how many there are — and note that being split and being a DNF are INDEPENDENT:
  one race is both, and neither fact implies the other. The race's `km` is the summed METRES converted once (not the sum of the parts'
  printed figures, which rounds twice) and its `elapsed_time` is first start to last stop,
  never the sum of the parts: elapsed already contains stops, so it must not depend on
  where the rider pressed the button. **The rule the bib is drawn by: a bib is the link
  when there is one place to go; when there is more than one, the bib HOLDS the links.**
  Strava cannot merge activities, so no single URL is the whole race, and anchors do not
  nest — a split bib is therefore a `div` whose stub carries one link per recording, each
  printing that part's own distance and clock so no link promises the bib's summed hero.
  A one-recording bib is untouched by any of this, which is deliberate: delegating on every
  bib would give all of them the same accessible name. See `Patch.astro` for the whole
  argument and `Recording` in `constants.ts` for why the parts' figures are stored

## Content Management

All site content is managed through `src/lib/constants.ts`. The entries below
are the ones carrying non-obvious constraints; the rest are self-explanatory in
the file:
- `NEXT_RACE`: the goal cards' countdown ladder and the control's label — width-budgeted,
  and the label is also the heading of the page it opens; see the note there
- `EVENTS`: every race entered, in any year — read by both the projection and the patch
  wall, at two different scopes (see the rule above). Adding a past race is a data edit:
  `elapsed_time` and `recordings` are optional, so a race remembered without a
  recording is still a complete bib
- `PATCHES`: the wall's own prose, now one lede rather than a scope sentence plus a key.
  Its heading is `My events`; "patch wall" survives in the URL and the metaphor, not as a
  visible title

## Memories

- Any user configurable variable belongs in one of exactly three places: a
  GitHub repository secret, a GitHub repository variable, or
  `src/lib/constants.ts`. Scripts and workflows hold no configuration of their
  own — see README.md "Configuration".