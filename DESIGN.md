---
name: "How this site is drawn"
description: "The colors, the type ramp, the controls and the marks this site is built from, drawn live from the stylesheet it ships."
colors:
  primary: "{colors.light-accent}"
  neutral: "{colors.light-background}"
  light-background: "#FAFAFA"
  light-card-background: "#F5F5F5"
  light-card-border: "#E5E5E5"
  light-shadow: "#A82334"
  light-accent: "#A82334"
  light-text: "#0B0B0B"
  light-progress-fill: "#A82334"
  light-progress-track: "#E3B3B8"
  light-status-live: "#A82334"
  light-status-halo: "#A82334"
  light-brand-ink: "#A82334"
  light-sport-ride: "#A82334"
  light-sport-ride-on-ink: "#F3A3AA"
  light-sport-run: "#1F4E9C"
  light-sport-run-on-ink: "#9FC0F0"
  dark-background: "#111111"
  dark-card-background: "#171717"
  dark-card-border: "#2C2C2C"
  dark-shadow: "#F3A3AA"
  dark-accent: "#F9CDD3"
  dark-text: "#FAFAFA"
  dark-progress-fill: "#F9CDD3"
  dark-progress-track: "#462F32"
  dark-status-live: "#F3A3AA"
  dark-status-halo: "#F9CDD3"
  dark-brand-ink: "#F3A3AA"
  dark-sport-ride: "#F3A3AA"
  dark-sport-ride-on-ink: "#A82334"
  dark-sport-run: "#9FC0F0"
  dark-sport-run-on-ink: "#1F4E9C"
components:
  control-cta:
    backgroundColor: "{colors.light-background}"
    textColor: "{colors.light-text}"
    rounded: "0.5rem"
    height: "3rem"
    width: "100%"
    padding: "0.25rem 0.75rem"
  text-link:
    textColor: "{colors.light-text}"
  chip:
    backgroundColor: "{colors.light-background}"
    textColor: "{colors.light-text}"
    rounded: "2px"
    height: "2.75rem"
    width: "2.75rem"
    padding: "0.3rem 0.7rem"
  chip-icon:
    backgroundColor: "{colors.light-background}"
    textColor: "{colors.light-text}"
    rounded: "2px"
    height: "2.75rem"
    width: "2.75rem"
  brand-mark:
    height: "120px"
    width: "120px"
    textColor: "{colors.light-brand-ink}"
    backgroundColor: "{colors.light-progress-track}"
omitted:
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
---

# How this site is drawn

## Overview

This is one site's whole design vocabulary: a palette of theme tokens, a short type ramp,
a handful of kinds of control and a set of marks. It is deliberately quiet — no webfont,
no display face and no decoration that carries meaning on its own — and it is drawn to work
identically in a light theme and a dark one, which is the constraint most of what follows
exists to protect.

It authors no value. What each token is FOR is authored in `src/content/design.ts`; what
each token IS lives in the theme block of `src/layouts/BasicLayout.astro`, and the classes
come from `uno.config.ts`. This document and the page at `/design` are both rendered from
the first of those, so neither can disagree with it — and the table below can still carry
both of a token's values, in the front matter and in prose, because every one of them is
READ out of that theme block by `src/lib/palette.ts` rather than written down again here.

## Set data-theme, or nothing is styled

Every token is defined only under the two theme blocks — there is no bare :root fallback — so a page without the attribute resolves every color to an invalid value and renders unstyled text on unstyled ground. Both themes are equal citizens and every design has to work in each; light is what the site serves by default. Put it on the root element:

    <html data-theme="light">
    <html data-theme="dark">

## Colors

The tokens below carry the whole design. Each is defined twice — once per theme — and nowhere else, so a design is on-brand exactly to the degree it reaches for these and nothing else. A mark meant for an ink-flooded surface is drawn on one here, because showing it against the page ground renders the pale half of every pair as a mistake. Each token has two keys in this document, {colors.light-accent} and {colors.dark-accent} for one token; in CSS it is var(--accent), and the live theme decides which of the two you get. Guidance below cites the light key, because a reference has to name one and light is what this site serves by default — the instruction is about the token, never about that theme.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | `#FAFAFA` | `#111111` | the page ground |
| `--card-background` | `#F5F5F5` | `#171717` | a card's plate, one step off the ground |
| `--card-border` | `#E5E5E5` | `#2C2C2C` | that plate's edge |
| `--shadow` | `#A82334` | `#F3A3AA` | the offset plate cast by the portrait and the controls |
| `--accent` | `#A82334` | `#F9CDD3` | the interactive affordance: control border, hover ink |
| `--text` | `#0B0B0B` | `#FAFAFA` | body ink |
| `--progress-fill` | `#A82334` | `#F9CDD3` | the marked region of a progress bar |
| `--progress-track` | `#E3B3B8` | `#462F32` | the unmarked remainder of that bar |
| `--status-live` | `#A82334` | `#F3A3AA` | the Now card's live indicator dot |
| `--status-halo` | `#A82334` | `#F9CDD3` | that dot's decorative pulsing halo |
| `--brand-ink` | `#A82334` | `#F3A3AA` | a brand-colored glyph standing in for a word in prose |
| `--sport-ride` | `#A82334` | `#F3A3AA` | the cycling mark where it sits on a card |
| `--sport-ride-on-ink` | `#F3A3AA` | `#A82334` | the same mark on an ink-colored surface |
| `--sport-run` | `#1F4E9C` | `#9FC0F0` | the running mark on a card |
| `--sport-run-on-ink` | `#9FC0F0` | `#1F4E9C` | the same mark on ink |

Do:

- Reach for the token whose role matches what you are drawing, not the one whose color you like.
- Design in both themes. Every token is defined in each, and several swap polarity rather than merely darkening.
- Use an -on-ink variant on a surface flooded with {colors.light-text}, which is the only place it is right.

Don't:

- Hardcode a hex, even one printed here. Only the token name carries BOTH values, so a literal is right in at most one theme and wrong in the other.
- Reach for {colors.light-brand-ink} to draw something interactive. That is {colors.light-accent}'s job, and the two only coincide in the light theme.
- Assume dark is light with the lightness inverted. {colors.light-progress-fill} and {colors.light-progress-track} deliberately trade places.

## Typography

A deliberately short ramp. There is no webfont and no display face — the system sans stack is the typeface, and restraint in the ramp is what carries hierarchy instead. Each step below is set in the size it names.

Do:

- Carry hierarchy with size, weight and space, taken from the ramp as it stands.
- Let the reader's own text size drive the layout: every breakpoint and every box here is sized in rem for exactly that reason.
- Space sibling groups with a gap on a flex or grid parent.

Don't:

- Introduce a decorative or display face. There is no webfont to pair one with.
- Invent an intermediate step because something is a little too big.
- Pin a height in pixels. Text that grows then clips instead of pushing.

## Brand Mark

A sunrise over a bar, and the bar is not ornament: it is filled to how far this year's two goals have come, averaged, so the mark moves as the year does. That makes it the one drawing here the rules below about quantities do not govern. Those rules ask that a bar name its scale in words the reader meets first, and the smallest place this mark appears is a browser tab, which has room for no words at all — so it is an identity device whose proportion happens to be measured, rather than a quantity offered for reading. Where there IS room to say so, it is said: the mark in the home page's own heading carries the figure and its scale in its accessible name. One drawing serves every size below. The rays are its thinnest ink and are the first thing to close against the dome as the box shrinks; at the smallest step they are barely ink at all, and that is accepted rather than answered with a second drawing to keep in step.

Do:

- Fetch the mark rather than redrawing it. /brand/mark.svg carries its own dark-mode block and is what a browser should be pointed at; the pinned light and dark files beside it are for a consumer that cannot evaluate CSS at all.
- Draw it in {colors.light-brand-ink} over {colors.light-progress-track}, which is the one place this palette's brand ink is spent on identity rather than on a flourish.
- Let it take its size from the font-size of whatever contains it, the way every mark here is sized, so it grows with the reader's text instead of being pinned beside it.

Don't:

- Recolor it. The ink token is the only one carrying this mark in both themes, so any other choice is a different mark in one of them — and {colors.light-accent} in particular would claim the mark is interactive.
- Draw it where a control's own mark belongs. The way back in a page header, and the way home on a missing page, are their control's signifier; identity is not, and putting it there adds a thing to press that does nothing.
- Take /favicon.ico as the live mark or redraw the mark from the geometry printed here. That file is a raster fallback, frozen at the proportion the mark was designed at; the geometry is published so a consumer can lay the mark out, not so the drawing can be retyped and quietly stop agreeing with this year.

## Controls

Which kind to reach for is decided by what the control CONTAINS and by how loud it should be. The surface belongs to the kind rather than to all of them: the offset plate under an --accent hairline is the mark for a page's ONE action and is spent on nothing else, and a quiet hairline at a fraction of the ink is for chrome — getting somewhere, and setting a preference. So there is no plated box for a mark alone: an action names itself in words, and a control that is only a glyph is a member of a set or a preference, which is the quiet kind. Every specimen below is a working link to the page it names.

- **`control-cta`** — The plated surface at the width of whatever contains it, holding a label and its mark centered together as one legend. It is the mark for a card's ONE action and is spent nowhere else. Its label comes from data and must be allowed to wrap, so its height is floored rather than pinned. The intro card's way in, and each goal card's way out.
- **`text-link`** — A link that is a run of words inside a sentence or a column of figures. Each role card's company name.
- **`chip`** — The quiet surface, holding a label that names it in a word. For getting somewhere and for setting a preference — chrome rather than a page's one action, so it wears no plate. Its label comes from data, so its box is floored rather than pinned. The patch wall's filter row, and every item in a page header.
- **`chip-icon`** — That same quiet surface holding one mark, for a member of a set where the marks are the vocabulary, and for a preference. Its content is a glyph the design picked the size of, so its box is pinned. The intro card's row of destinations, and the theme toggle wherever it appears.

Do:

- Give every link a signifier a reader can perceive: an underline, a mark, or a border.
- Let a labeled control wrap. Its width belongs to its container; its height belongs to its text.
- Draw the press, and snap it. A tap is over long before a 300ms color ramp finishes, so a pressed state must not ease.

Don't:

- Reach for a surface class. control-surface and chip-surface are source-level shortcuts the boxes compose, nothing wears either directly, and neither is in the shipped stylesheet.
- Draw a link exactly like the prose beside it.
- Pin a control's height in pixels. The box is sized in rem so that it grows with the reader's text.

## Iconography

Every mark here is in the stylesheet because some page uses it, so the set grows with the site rather than ahead of it. Nothing outside this set is available: a class with no rule renders as a mask box at zero size, which is an absent icon with correct markup and a green build.

These 19 ship and no others. Remix Icon (13):

`i-ri-arrow-left-line`, `i-ri-arrow-right-line`, `i-ri-file-list-3-line`, `i-ri-file-pdf-2-line`, `i-ri-heart-fill`, `i-ri-information-line`, `i-ri-markdown-line`, `i-ri-moon-line`, `i-ri-riding-line`, `i-ri-run-line`, `i-ri-search-line`, `i-ri-sun-line`, `i-ri-tools-line`.

Brand marks (6):

`i-fa6-brands-github`, `i-fa6-brands-instagram`, `i-fa6-brands-lastfm`, `i-fa6-brands-linkedin`, `i-fa6-brands-strava`, `i-fa6-brands-telegram`.

Do:

- Size a mark with font-size. They are background images scaled to the text box.
- Pair a mark with a word wherever the mark alone would be a guess.
- Give an icon-only control an accessible name, since the mark is the whole control.

Don't:

- Substitute an emoji for a mark that is not in the set.
- Mix another icon family in. The ones that ship do different jobs and were chosen against each other.
- Recolor a brand mark away from what the surface it sits on needs for contrast.

## Data Visualization

A quantity is drawn as a flat two-pixel stroke: a marked region over the remainder, and nothing else in the box. The same stroke answers two different questions, and which one it is answering is the whole of what a reader has to be told. A FRACTION is drawn once and measured against a target the design chose — how much of a year's goal is banked. A SERIES is drawn many times and measured against its own largest member, so the lengths are comparable to each other and to nothing outside the set: that is what makes a ramp, a taper and a gap visible, and it is the one thing a grid of cards cannot show however the cards are sorted. The brand mark's bar is the one drawing this section does not govern, and the Brand Mark section says why.

Do:

- Say what a bar is measured against, in words the reader meets before the bars. A length means nothing until the scale is named, and a target and the largest value in the set are two different pictures drawn identically.
- Give the marked region more contrast against the surface than the unmarked remainder has. Whichever region stands further from the ground is the one a reader takes for the mark, so a bar drawn the other way round reads as full when it is empty.
- Draw a value that does not exist yet as an absence rather than as a zero, and print the word for it. A quantity nobody has measured and a measured zero are different facts, and the drawing can only separate them by leaving one of them undrawn.

Don't:

- Split one bar into segments a reader can only separate by hue. Two categories at the same lightness arrive as one bar in two indistinguishable halves; give each category its own view and let the reader choose one.
- Put ink inside a bar. The fill flips polarity between the themes, so a label on it has to be legible against both poles, and the same words have more room beside the bar than on it.
- Let the drawing be the only carrier of a figure it encodes. Print the number as well: a bar is a shape, and the reader who cannot resolve the shape is the reader who most needs the value.

## Interaction States

Every control here has states, and the states are what tell a reader that something can be pressed and that a press landed. This is the half of the system that is invisible on a desktop with a mouse and obvious on a phone: hover is not a state a finger can enter and leave, and a tap is over long before an easing curve has finished, so a design carrying its whole affordance in hover and its whole feedback in a transition arrives with neither.

Do:

- Hold a press on anything that navigates until the page actually changes. The press ends when the finger lifts and the reader then waits, with nothing on screen saying the tap landed.
- Draw keyboard focus on every device, and draw it apart from hover. Hover is a pointer's affordance and some readers have no pointer; focus is how anyone driving the page from a keyboard knows where they are.
- Honor a reduced-motion preference. A reader who set it is saying that movement costs them something, so the design has to still work with every transition taken out.

Don't:

- Write a hover style a touch device will apply. A touch browser puts hover on whatever was tapped and leaves it there until something else is tapped, so an affordance carried by hover arrives as a state stuck on the last thing the reader touched.
- Put a hover rule and a focus rule in one selector list. One is a pointer's affordance and the other is a keyboard indicator every device needs, so suppressing the first takes the second with it.
- Carry information in motion alone. A still frame — a reduced-motion preference, a screenshot, a device that dropped the animation — has to say what the moving one said.

## Voice & Tone

The words in this interface are design material, and this vocabulary is decided rather than inherited. A control's label is the name of the thing it opens; two states that share a treatment are told apart by the word each one prints; and the word for a thing somebody finished is not the word for the set it belongs to. Every one of those was learned by shipping the other version first.

Do:

- Name a destination with the same words at both ends. A control that says one thing and opens a page headed with another breaks the vocabulary at the click, which is the moment a reader is least able to absorb it.
- Where two states share a treatment, let the word carry the difference, and print it where the reader is already looking rather than somewhere they have to go and find it.
- Say what a thing is in the reader's terms rather than the system's. A name that only makes sense once you know how the data is stored is a name every reader has to be taught.

Don't:

- Use the word for the earned thing as the heading for the whole set. A page listing everything that was entered cannot be headed with the word for the ones that were finished.
- Leave two states that share a treatment with no word between them. The treatment can say that neither of them is the finished thing, and nothing but a word can say which of them this one is.
- Let a label change between the control and its destination. Two strings that have to agree are one string, and a label that does not fit is shortened in both places at once.

## Accessibility

Reaching and reading, which is the one subject here that is not about drawing. A design is finished when somebody can get to every part of it with a finger, with a keyboard, at the text size they chose, and with the colors replaced — and every one of those is a different reader rather than the same one described again.

Do:

- Give every control a target a fingertip can find, on both axes. Something comfortable under a mouse can still be a target a thumb misses, and the two dimensions fail separately: a wide, thin row is the usual one.
- Put one landmark around each region a reader might skip to, and make the page's own name its first heading. Skipping is how a page is read without being seen, and it only works on regions that were declared.
- Let a reader double the text without the page seeing a font-size change. That size is the reader's own setting rather than an input the design gets to read, so every box has to survive the result already.

Don't:

- Let reading order drift from visual order. A keyboard meets the markup, so a column moved by the layout is still read where it was written.
- Depend on a color surviving. A forced-colors mode replaces every one of them, so whatever a color alone was carrying arrives blank.
- Hide from the accessibility tree something a sighted reader can act on. A control nobody can name is a control only some readers have.

## Do's and Don'ts

Every line below is repeated from the section it names, which is where its reason is. This
section exists because the format this document follows makes it the one place a consumer
reads for guardrails, and guidance that sits only under a heading that format does not know
reaches that reader not at all.

### Do

- **Colors** — Reach for the token whose role matches what you are drawing, not the one whose color you like.
- **Colors** — Design in both themes. Every token is defined in each, and several swap polarity rather than merely darkening.
- **Colors** — Use an -on-ink variant on a surface flooded with {colors.light-text}, which is the only place it is right.
- **Typography** — Carry hierarchy with size, weight and space, taken from the ramp as it stands.
- **Typography** — Let the reader's own text size drive the layout: every breakpoint and every box here is sized in rem for exactly that reason.
- **Typography** — Space sibling groups with a gap on a flex or grid parent.
- **Brand Mark** — Fetch the mark rather than redrawing it. /brand/mark.svg carries its own dark-mode block and is what a browser should be pointed at; the pinned light and dark files beside it are for a consumer that cannot evaluate CSS at all.
- **Brand Mark** — Draw it in {colors.light-brand-ink} over {colors.light-progress-track}, which is the one place this palette's brand ink is spent on identity rather than on a flourish.
- **Brand Mark** — Let it take its size from the font-size of whatever contains it, the way every mark here is sized, so it grows with the reader's text instead of being pinned beside it.
- **Controls** — Give every link a signifier a reader can perceive: an underline, a mark, or a border.
- **Controls** — Let a labeled control wrap. Its width belongs to its container; its height belongs to its text.
- **Controls** — Draw the press, and snap it. A tap is over long before a 300ms color ramp finishes, so a pressed state must not ease.
- **Iconography** — Size a mark with font-size. They are background images scaled to the text box.
- **Iconography** — Pair a mark with a word wherever the mark alone would be a guess.
- **Iconography** — Give an icon-only control an accessible name, since the mark is the whole control.
- **Data Visualization** — Say what a bar is measured against, in words the reader meets before the bars. A length means nothing until the scale is named, and a target and the largest value in the set are two different pictures drawn identically.
- **Data Visualization** — Give the marked region more contrast against the surface than the unmarked remainder has. Whichever region stands further from the ground is the one a reader takes for the mark, so a bar drawn the other way round reads as full when it is empty.
- **Data Visualization** — Draw a value that does not exist yet as an absence rather than as a zero, and print the word for it. A quantity nobody has measured and a measured zero are different facts, and the drawing can only separate them by leaving one of them undrawn.
- **Interaction States** — Hold a press on anything that navigates until the page actually changes. The press ends when the finger lifts and the reader then waits, with nothing on screen saying the tap landed.
- **Interaction States** — Draw keyboard focus on every device, and draw it apart from hover. Hover is a pointer's affordance and some readers have no pointer; focus is how anyone driving the page from a keyboard knows where they are.
- **Interaction States** — Honor a reduced-motion preference. A reader who set it is saying that movement costs them something, so the design has to still work with every transition taken out.
- **Voice & Tone** — Name a destination with the same words at both ends. A control that says one thing and opens a page headed with another breaks the vocabulary at the click, which is the moment a reader is least able to absorb it.
- **Voice & Tone** — Where two states share a treatment, let the word carry the difference, and print it where the reader is already looking rather than somewhere they have to go and find it.
- **Voice & Tone** — Say what a thing is in the reader's terms rather than the system's. A name that only makes sense once you know how the data is stored is a name every reader has to be taught.
- **Accessibility** — Give every control a target a fingertip can find, on both axes. Something comfortable under a mouse can still be a target a thumb misses, and the two dimensions fail separately: a wide, thin row is the usual one.
- **Accessibility** — Put one landmark around each region a reader might skip to, and make the page's own name its first heading. Skipping is how a page is read without being seen, and it only works on regions that were declared.
- **Accessibility** — Let a reader double the text without the page seeing a font-size change. That size is the reader's own setting rather than an input the design gets to read, so every box has to survive the result already.

### Don't

- **Colors** — Hardcode a hex, even one printed here. Only the token name carries BOTH values, so a literal is right in at most one theme and wrong in the other.
- **Colors** — Reach for {colors.light-brand-ink} to draw something interactive. That is {colors.light-accent}'s job, and the two only coincide in the light theme.
- **Colors** — Assume dark is light with the lightness inverted. {colors.light-progress-fill} and {colors.light-progress-track} deliberately trade places.
- **Typography** — Introduce a decorative or display face. There is no webfont to pair one with.
- **Typography** — Invent an intermediate step because something is a little too big.
- **Typography** — Pin a height in pixels. Text that grows then clips instead of pushing.
- **Brand Mark** — Recolor it. The ink token is the only one carrying this mark in both themes, so any other choice is a different mark in one of them — and {colors.light-accent} in particular would claim the mark is interactive.
- **Brand Mark** — Draw it where a control's own mark belongs. The way back in a page header, and the way home on a missing page, are their control's signifier; identity is not, and putting it there adds a thing to press that does nothing.
- **Brand Mark** — Take /favicon.ico as the live mark or redraw the mark from the geometry printed here. That file is a raster fallback, frozen at the proportion the mark was designed at; the geometry is published so a consumer can lay the mark out, not so the drawing can be retyped and quietly stop agreeing with this year.
- **Controls** — Reach for a surface class. control-surface and chip-surface are source-level shortcuts the boxes compose, nothing wears either directly, and neither is in the shipped stylesheet.
- **Controls** — Draw a link exactly like the prose beside it.
- **Controls** — Pin a control's height in pixels. The box is sized in rem so that it grows with the reader's text.
- **Iconography** — Substitute an emoji for a mark that is not in the set.
- **Iconography** — Mix another icon family in. The ones that ship do different jobs and were chosen against each other.
- **Iconography** — Recolor a brand mark away from what the surface it sits on needs for contrast.
- **Data Visualization** — Split one bar into segments a reader can only separate by hue. Two categories at the same lightness arrive as one bar in two indistinguishable halves; give each category its own view and let the reader choose one.
- **Data Visualization** — Put ink inside a bar. The fill flips polarity between the themes, so a label on it has to be legible against both poles, and the same words have more room beside the bar than on it.
- **Data Visualization** — Let the drawing be the only carrier of a figure it encodes. Print the number as well: a bar is a shape, and the reader who cannot resolve the shape is the reader who most needs the value.
- **Interaction States** — Write a hover style a touch device will apply. A touch browser puts hover on whatever was tapped and leaves it there until something else is tapped, so an affordance carried by hover arrives as a state stuck on the last thing the reader touched.
- **Interaction States** — Put a hover rule and a focus rule in one selector list. One is a pointer's affordance and the other is a keyboard indicator every device needs, so suppressing the first takes the second with it.
- **Interaction States** — Carry information in motion alone. A still frame — a reduced-motion preference, a screenshot, a device that dropped the animation — has to say what the moving one said.
- **Voice & Tone** — Use the word for the earned thing as the heading for the whole set. A page listing everything that was entered cannot be headed with the word for the ones that were finished.
- **Voice & Tone** — Leave two states that share a treatment with no word between them. The treatment can say that neither of them is the finished thing, and nothing but a word can say which of them this one is.
- **Voice & Tone** — Let a label change between the control and its destination. Two strings that have to agree are one string, and a label that does not fit is shortened in both places at once.
- **Accessibility** — Let reading order drift from visual order. A keyboard meets the markup, so a column moved by the layout is still read where it was written.
- **Accessibility** — Depend on a color surviving. A forced-colors mode replaces every one of them, so whatever a color alone was carrying arrives blank.
- **Accessibility** — Hide from the accessibility tree something a sighted reader can act on. A control nobody can name is a control only some readers have.
