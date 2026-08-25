# calvin.sg — building with this system

**Colour, type and controls; no components** — the source site is Astro, so nothing mounts.
The token table and the class list are complete; every other list is a guardrail.

## Set data-theme, or nothing is styled

Every token is defined only under the two theme blocks — there is no bare :root fallback — so a page without the attribute resolves every colour to an invalid value and renders unstyled text on unstyled ground. Both themes are equal citizens and every design has to work in each; light is what the site serves by default. Put it on the root element:

    <html data-theme="light">
    <html data-theme="dark">

## Colour

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

Don't:

- Hardcode a hex. There is no token here whose value is worth restating.
- Reach for --brand-ink to draw something interactive. That is --accent's job, and the two only coincide in light mode.
- Assume dark is light with the lightness inverted. --progress-fill and --progress-track deliberately trade places.

## The stylesheet is a closed set

**No utility engine runs here.** These classes came from the source site's own markup and
shipped as static CSS, so one that site never used does not exist. The stylesheet is the
only authority on what a class does, and it restates the tokens in readable form, both
themes, above the minified rules.

Guaranteed present: `control`, `control-cta`, `text-link`, `sr-only`,
`break-anywhere`, the mark classes, and a reset over a system sans stack.

**`control-surface` is not in the stylesheet** — see the controls below.

## Controls

- **`control`** — The plated surface at a box the design picks, icon-only: its content is one mark and never a word, so its width is a number rather than a guess. The social links and the theme toggle wear it.
- **`control-cta`** — That same surface at the width of whatever contains it, holding a label and its mark centred together as one legend. Its label comes from data and must be allowed to wrap, so its height is floored rather than pinned. The goal cards' way out.
- **`text-link`** — A link that is a run of words inside a sentence or a column of figures. The wall's way back, and each role card's company name.

Don't:

- Reach for control-surface. It is a source-level shortcut the other two compose, nothing wears it directly, and it is not in the shipped stylesheet.
- Draw a link exactly like the prose beside it.
- Pin a control's height in pixels. The box is sized in rem so that it grows with the reader's text.

## Type

Don't:

- Introduce a decorative or display face. There is no webfont to pair one with.
- Invent an intermediate step because something is a little too big.
- Pin a height in pixels. Text that grows then clips instead of pushing.

## Marks

20 marks ship and no others, each a `.i-` class sized with `font-size`.

Don't:

- Substitute an emoji for a mark that is not in the set.
- Mix another icon family in. The ones that ship do different jobs and were chosen against each other.
- Recolour a brand mark away from what the surface it sits on needs for contrast.
