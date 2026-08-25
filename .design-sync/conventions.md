# calvin.sg — building with this system

This system ships **colour, type and controls — no components**. The site it comes from is
built in Astro, whose components compile to a server render and have no runtime form, so
there is nothing to mount: the component namespace is deliberately empty. Build with plain
elements, styled the way this document describes.

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

## The stylesheet is a closed set, not a utility framework

This is the one that will bite. The classes were generated from the source site's own markup
and shipped as static CSS; **no utility engine is running here**, so a class the site never
used does not exist. The padding, margin and colour utilities you might reach for by habit
are mostly absent. Use the named classes below, write ordinary CSS with `var(--token)` for
everything else, and check the stylesheet before assuming a utility exists.

Guaranteed present: `control`, `control-cta`, `text-link`, `sr-only`,
`break-anywhere`, the mark classes listed below, and a full CSS reset (box-sizing, border
reset, a system sans stack — there are no webfonts to load).

**`control-surface` is not in the stylesheet.** It is a source-level shortcut the other
controls compose, and nothing wears it directly; writing it produces no styling.

## Controls

Three kinds, and which one to use is decided by what the control CONTAINS rather than by how important it is. All three share one surface: a hairline in --accent, a hard offset plate in --shadow, and colour moving over 300ms. Every specimen below is a working link to the page it names.

- **`control`** — The plated surface at a box the design picks, icon-only: its content is one mark and never a word, so its width is a number rather than a guess. The social links and the theme toggle wear it.
- **`control-cta`** — That same surface at the width of whatever contains it, holding a label and its mark centred together as one legend. Its label comes from data and must be allowed to wrap, so its height is floored rather than pinned. The goal cards' way out.
- **`text-link`** — A link that is a run of words inside a sentence or a column of figures. The wall's way back, and each role card's company name.

Do:

- Give every link a signifier a reader can perceive: an underline, a mark, or a border.
- Let a labelled control wrap. Its width belongs to its container; its height belongs to its text.
- Draw the press, and snap it. A tap is over long before a 300ms colour ramp finishes, so a pressed state must not ease.

Don't:

- Reach for control-surface. It is a source-level shortcut the other two compose, nothing wears it directly, and it is not in the shipped stylesheet.
- Draw a link exactly like the prose beside it.
- Pin a control's height in pixels. The box is sized in rem so that it grows with the reader's text.

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

## Marks

Every mark here is in the stylesheet because some page uses it, so the set grows with the site rather than ahead of it. Nothing outside this set is available: a class with no rule renders as a mask box at zero size, which is an absent icon with correct markup and a green build.

These 18 ship and no others. Remix Icon (13):

`i-ri-arrow-left-line`, `i-ri-arrow-right-line`, `i-ri-file-list-3-line`, `i-ri-file-pdf-2-line`, `i-ri-heart-fill`, `i-ri-information-line`, `i-ri-moon-line`, `i-ri-open-arm-line`, `i-ri-riding-line`, `i-ri-run-line`, `i-ri-search-line`, `i-ri-sun-line`, `i-ri-tools-line`.

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

## Where the truth lives

Read the stylesheet you have been given: the tokens are restated in readable form at the very
top of it, both themes, ahead of the minified rules. That file is the only authority on what
a class does; this document is the only authority on what to reach for.
