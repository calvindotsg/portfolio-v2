# CLAUDE.md

## Project Overview

This is a personal portfolio website built with Astro, featuring a bento-style,
minimal design. The home page is a single-screen bento grid showing Calvin's
professional background, his cycling and running goals, and personal interests;
`/patches` is a wall of this year's races drawn as bibs, with a prerendered page
per sport. A patch is a race **completed and earned** — an outline bib is an event
that has not become one yet, which is why the wall's headings say "events" and only
earned bibs are called patches.

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
  `blocklist`, the single `control` shortcut (the styled control's whole box,
  including the offset-plate shadow — every styled control wears it, and it
  deliberately has no variants), the presets, and a `theme` key holding **only**
  the five breakpoints. Those are presetWind3's own defaults restated in `rem`,
  which is load-bearing rather than cosmetic — see the note there. No colour or
  shadow token lives in `theme`; those are CSS custom properties in
  `BasicLayout.astro`
- **Text-relative sizing**: every breakpoint, `main`'s height clamp, the card
  heading's space and the control box are font-relative, so the page grows with
  the reader's text instead of clipping it. `tests/page-fit.test.ts` and
  `tests/card-fill.test.ts` forbid an absolute length in the first three, and
  card-fill catches an absolute *height* inside any card, the control box
  included; only `tests/control-geometry.test.ts` gates that box's width. The goal
  cards' `.events-link` is a different idiom — no box, just a font-relative floor,
  gated by `tests/rendered-html.test.ts`. Read the rationale before re-pinning one
  to pixels
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
  required rate, the countdown, and a control (`components/EventsLink.astro`) reading
  `My <sport> events ›`. That control is the only path from the home page to
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
- `EVENTS`: Races entered this year — read by both the projection and the patch wall
- `PATCHES`: the wall's own prose. Its heading is `My events`; "patch wall" survives in
  the URL and the metaphor, not as a visible title

## Memories

- Any user configurable variable belongs in one of exactly three places: a
  GitHub repository secret, a GitHub repository variable, or
  `src/lib/constants.ts`. Scripts and workflows hold no configuration of their
  own — see README.md "Configuration".