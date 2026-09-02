# calvin.sg — building with this system

**Colors, controls and marks** — the source is Astro, so there is nothing to mount.
The token table and the class list are complete; every other list is a guardrail.

## Set data-theme, or nothing is styled

Every token is defined only under the two theme blocks — there is no bare :root fallback — so a page without the attribute resolves every color to an invalid value and renders unstyled text on unstyled ground. Both themes are equal citizens and every design has to work in each; light is what the site serves by default. Put it on the root element:

    <html data-theme="light">
    <html data-theme="dark">

## Colors

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
| `--brand-ink` | a brand-colored glyph standing in for a word in prose |
| `--sport-ride` | the cycling mark where it sits on a card |
| `--sport-ride-on-ink` | the same mark on an ink-colored surface |
| `--sport-run` | the running mark on a card |
| `--sport-run-on-ink` | the same mark on ink |

Don't:

- Hardcode a hex, even one printed here. Only the token name carries BOTH values, so a literal is right in at most one theme and wrong in the other.
- Reach for --brand-ink to draw something interactive. That is --accent's job, and the two only coincide in the light theme.
- Assume dark is light with the lightness inverted. --progress-fill and --progress-track deliberately trade places.

## The stylesheet is a closed set

**No utility engine runs here.** These classes came from the source site's markup and
shipped as static CSS, so one that site never used does not exist: the stylesheet is the
only authority on what a class does, and it restates both themes' tokens above its rules.

Guaranteed present: `control-cta`, `text-link`, `chip`, `chip-icon`, `sr-only`,
`break-anywhere`, the mark classes, and a reset over a system sans stack.

## Controls

- **`control-cta`** — The plated surface at the width of whatever contains it, holding a label and its mark centered together as one legend. It is the mark for a card's ONE action and is spent nowhere else. Its label comes from data and must be allowed to wrap, so its height is floored rather than pinned. The intro card's way in, and each goal card's way out.
- **`text-link`** — A link that is a run of words inside a sentence or a column of figures. Each role card's company name.
- **`chip`** — The quiet surface, holding a label that names it in a word. For getting somewhere and for setting a preference — chrome rather than a page's one action, so it wears no plate. Its label comes from data, so its box is floored rather than pinned. The patch wall's filter row, and every item in a page header.
- **`chip-icon`** — That same quiet surface holding one mark, for a member of a set where the marks are the vocabulary, and for a preference. Its content is a glyph the design picked the size of, so its box is pinned. The intro card's row of destinations, and the theme toggle wherever it appears.

Don't:

- Reach for a surface class. control-surface and chip-surface are source-level shortcuts the boxes compose, nothing wears either directly, and neither is in the shipped stylesheet.
- Draw a link exactly like the prose beside it.
- Pin a control's height in pixels. The box is sized in rem so that it grows with the reader's text.

## Iconography

19 marks ship and no others, each a `.i-` class sized with `font-size`.
