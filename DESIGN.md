---
name: "How this site is drawn"
description: "The colours, the type ramp, the controls and the marks this site is built from, drawn live from the stylesheet it ships."
omitted:
  - section: colors
    reason: >-
      Every token is defined twice, once per theme, and several swap polarity rather than
      darkening. One name to one value cannot say that, so the roles are published here
      and the values stay in the stylesheet, where both themes are.
  - section: typography
    reason: >-
      There is no webfont and no display face: the ramp is a handful of steps over the
      system sans stack, and each step is drawn at its own size on the page this renders
      from rather than restated as a measurement.
  - section: spacing
    reason: >-
      There is no authored spacing scale. Space comes from the utility engine's own steps
      and from gaps on flex and grid parents, so a scale written down here would be an
      invention rather than a record.
  - section: rounded
    reason: >-
      One radius, worn by the controls, and one two-pixel corner that is a bib's mark
      rather than a measurement. Neither is a scale.
  - section: components
    reason: >-
      The site is built in Astro, whose components compile to a server render and have no
      runtime form, so there is nothing to mount and the component namespace is empty by
      construction. Build with plain elements and the named classes below.
---

# How this site is drawn

## Overview

This is one site's whole design vocabulary: a palette of theme tokens, a short type ramp,
a handful of kinds of control and a set of marks. It is deliberately quiet — no webfont,
no display face and no decoration that carries meaning on its own — and it is drawn to work
identically in a light theme and a dark one, which is the constraint most of what follows
exists to protect.

It restates no value. What each token is FOR is authored in `src/content/design.ts`; what
each token IS lives in the theme block of `src/layouts/BasicLayout.astro`, and the classes
come from `uno.config.ts`. This document and the page at `/design` are both rendered from
the first of those, so neither can disagree with it — and neither can tell you a colour,
because neither is where a colour is written down.

## Set data-theme, or nothing is styled

Every token is defined only under the two theme blocks — there is no bare :root fallback — so a page without the attribute resolves every colour to an invalid value and renders unstyled text on unstyled ground. Both themes are equal citizens and every design has to work in each; light is what the site serves by default. Put it on the root element:

    <html data-theme="light">
    <html data-theme="dark">

## Colour

The tokens below carry the whole design. Each is defined twice — once per theme — and nowhere else, so a design is on-brand exactly to the degree it reaches for these and nothing else. A mark meant for an ink-flooded surface is drawn on one here, because showing it against the page ground renders the pale half of every pair as a mistake.

| Token | Role |
|---|---|
| `--background` | the page ground |
| `--card-background` | a card's plate, one step off the ground |
| `--card-border` | that plate's edge |
| `--shadow` | the offset plate cast by the portrait and the controls |
| `--accent` | the interactive affordance: control border, hover ink |
| `--text` | body ink |
| `--progress-fill` | the marked region of a progress bar |
| `--progress-track` | the unmarked remainder of that bar |
| `--status-live` | the Now card's live indicator dot |
| `--status-halo` | that dot's decorative pulsing halo |
| `--brand-ink` | a brand-coloured glyph standing in for a word in prose |
| `--sport-ride` | the cycling mark where it sits on a card |
| `--sport-ride-on-ink` | the same mark on an ink-coloured surface |
| `--sport-run` | the running mark on a card |
| `--sport-run-on-ink` | the same mark on ink |

Do:

- Reach for the token whose role matches what you are drawing, not the one whose colour you like.
- Design in both themes. Every token is defined in each, and several swap polarity rather than merely darkening.
- Use an -on-ink variant on a surface flooded with --text, which is the only place it is right.

Don't:

- Hardcode a hex. There is no token here whose value is worth restating.
- Reach for --brand-ink to draw something interactive. That is --accent's job, and the two only coincide in light mode.
- Assume dark is light with the lightness inverted. --progress-fill and --progress-track deliberately trade places.

## Type

A deliberately short ramp. There is no webfont and no display face — the system sans stack is the typeface, and restraint in the ramp is what carries hierarchy instead. Each step below is set in the size it names.

Do:

- Carry hierarchy with size, weight and space, taken from the ramp as it stands.
- Let the reader's own text size drive the layout: every breakpoint and every box here is sized in rem for exactly that reason.
- Space sibling groups with a gap on a flex or grid parent.

Don't:

- Introduce a decorative or display face. There is no webfont to pair one with.
- Invent an intermediate step because something is a little too big.
- Pin a height in pixels. Text that grows then clips instead of pushing.

## Controls

Which kind to reach for is decided by what the control CONTAINS and by how loud it should be. The surface belongs to the kind rather than to all of them: the offset plate under an --accent hairline is the mark for a page's ONE action and is spent on nothing else, and a quiet hairline at a fraction of the ink is for chrome — getting somewhere, and setting a preference. So there is no plated box for a mark alone: an action names itself in words, and a control that is only a glyph is a member of a set or a preference, which is the quiet kind. Every specimen below is a working link to the page it names.

- **`control-cta`** — The plated surface at the width of whatever contains it, holding a label and its mark centred together as one legend. It is the mark for a card's ONE action and is spent nowhere else. Its label comes from data and must be allowed to wrap, so its height is floored rather than pinned. The intro card's way in, and each goal card's way out.
- **`text-link`** — A link that is a run of words inside a sentence or a column of figures. Each role card's company name.
- **`chip`** — The quiet surface, holding a label that names it in a word. For getting somewhere and for setting a preference — chrome rather than a page's one action, so it wears no plate. Its label comes from data, so its box is floored rather than pinned. The patch wall's filter row, and every item in a page header.
- **`chip-icon`** — That same quiet surface holding one mark, for a member of a set where the marks are the vocabulary, and for a preference. Its content is a glyph the design picked the size of, so its box is pinned. The intro card's row of destinations, and the theme toggle wherever it appears.

Do:

- Give every link a signifier a reader can perceive: an underline, a mark, or a border.
- Let a labelled control wrap. Its width belongs to its container; its height belongs to its text.
- Draw the press, and snap it. A tap is over long before a 300ms colour ramp finishes, so a pressed state must not ease.

Don't:

- Reach for a surface class. control-surface and chip-surface are source-level shortcuts the boxes compose, nothing wears either directly, and neither is in the shipped stylesheet.
- Draw a link exactly like the prose beside it.
- Pin a control's height in pixels. The box is sized in rem so that it grows with the reader's text.

## Marks

Every mark here is in the stylesheet because some page uses it, so the set grows with the site rather than ahead of it. Nothing outside this set is available: a class with no rule renders as a mask box at zero size, which is an absent icon with correct markup and a green build.

These 19 ship and no others. Remix Icon (14):

`i-ri-arrow-left-line`, `i-ri-arrow-right-line`, `i-ri-file-list-3-line`, `i-ri-file-pdf-2-line`, `i-ri-heart-fill`, `i-ri-information-line`, `i-ri-markdown-line`, `i-ri-moon-line`, `i-ri-open-arm-line`, `i-ri-riding-line`, `i-ri-run-line`, `i-ri-search-line`, `i-ri-sun-line`, `i-ri-tools-line`.

Brand marks (5):

`i-fa6-brands-github`, `i-fa6-brands-instagram`, `i-fa6-brands-linkedin`, `i-fa6-brands-strava`, `i-fa6-brands-telegram`.

Do:

- Size a mark with font-size. They are background images scaled to the text box.
- Pair a mark with a word wherever the mark alone would be a guess.
- Give an icon-only control an accessible name, since the mark is the whole control.

Don't:

- Substitute an emoji for a mark that is not in the set.
- Mix another icon family in. The ones that ship do different jobs and were chosen against each other.
- Recolour a brand mark away from what the surface it sits on needs for contrast.
