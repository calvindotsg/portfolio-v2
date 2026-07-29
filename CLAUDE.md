# CLAUDE.md

## Project Overview

This is a personal portfolio website built with Astro, featuring a bento-style,
minimal design. The home page is a single-screen bento grid showing Calvin's
professional background, his cycling and running goals, and personal interests;
`/patches` is a wall of **every race he has entered**, in any year, drawn as bibs,
with a prerendered page per sport. A **Finisher Patch** is a race completed and
earned — an outline bib is an event that has not become one yet, which is why the
wall's headings say "events" and only the earned bibs are patches.

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
  script names exists. Netlify's build command is `pnpm check && pnpm test`.
  `eslint` globs `src/**/*.{js,astro}` only, so a clean run says nothing about
  the `.ts` files — those are gated by `pnpm check` (tsconfig includes `**/*`)
  and by the suite
- `pnpm preview` serves the built `dist/` directory locally on
  http://localhost:4321 — the site is a static build with no adapter, so the
  preview is byte-identical to what Netlify serves

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
- `src/pages/patches/[...sport].astro` — the patch wall. One rest-parameter route
  prerenders three pages (`/patches`, `/patches/cycling`, `/patches/running`), so
  filtering by sport is a real URL rather than client state. Whether a bib is
  earned is DERIVED from the calendar every build (`patchState` in
  `projection.ts`) and must never become a stored flag

## Content Management

All site content is managed through `src/lib/constants.ts`. The entries below
are the ones carrying non-obvious constraints; the rest are self-explanatory in
the file:
- `NEXT_RACE`: the goal cards' countdown ladder and the control's label — width-budgeted,
  and the label is also the heading of the page it opens; see the note there
- `EVENTS`: every race entered, in any year — read by both the projection and the patch
  wall, at two different scopes (see the rule above). Adding a past race is a data edit:
  `elapsed_time` and `strava_activity_id` are optional, so a race remembered without a
  recording is still a complete bib
- `PATCHES`: the wall's own prose, now one lede rather than a scope sentence plus a key.
  Its heading is `My events`; "patch wall" survives in the URL and the metaphor, not as a
  visible title

## Memories

- Any user configurable variable belongs in one of exactly three places: a
  GitHub repository secret, a GitHub repository variable, or
  `src/lib/constants.ts`. Scripts and workflows hold no configuration of their
  own — see README.md "Configuration".