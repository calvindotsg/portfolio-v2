# calvin.sg — building with this system

This system ships **colour, type and three controls — no components**. The site it comes
from is built in Astro, whose components compile to a server render and have no runtime
form, so there is nothing to mount: the component namespace is deliberately empty. Build
with plain elements, styled the way this section describes.

## Set data-theme, or nothing is styled

Every token is defined **only** under `:root[data-theme=light]` and `:root[data-theme=dark]`.
There is no bare `:root` fallback, so a page without the attribute renders every colour
as an invalid value: unstyled text on an unstyled ground. Put it on the root element:

    <html data-theme="light">

Both themes are equal citizens and every design must work in both. Light is what the
site serves by default.

## Colour is the whole system

Never hardcode a hex. Fifteen tokens carry the design, and each has one job:

| Token | Role |
|---|---|
| `--background` | the page ground |
| `--card-background` | a card's plate, one step off the ground |
| `--card-border` | that plate's edge |
| `--text` | body ink |
| `--accent` | the interactive affordance: control borders, hover ink |
| `--shadow` | the hard offset plate cast beneath controls and the portrait |
| `--progress-fill` / `--progress-track` | the marked region of a progress bar, and its unmarked remainder |
| `--status-live` / `--status-halo` | a live-state dot, and its decorative pulsing halo |
| `--brand-ink` | a brand-coloured glyph standing in for a word in prose |
| `--sport-ride` / `--sport-run` | the cycling and running marks, on a card |
| `--sport-ride-on-ink` / `--sport-run-on-ink` | the same two marks on an INK-coloured surface |

The `-on-ink` pair is not decoration: a surface flooded with `--text` inverts the ground,
so a mark tuned for a card goes invisible on it. `--brand-ink` and `--accent` match in
light mode and are still not interchangeable — accent means "you can interact with this".

## The stylesheet is a closed set, not a utility framework

This is the one that will bite. The classes were generated from the source site's own
markup and shipped as static CSS; **no utility engine is running**, so a class the site
never used does not exist. About 150 selectors ship in total, and the padding, margin and
colour utilities you might reach for by habit are mostly absent. Use the named classes
below, write ordinary CSS with `var(--token)` for everything else, and check the
stylesheet before assuming a utility exists.

Guaranteed present: `control`, `control-cta`, `text-link`, `sr-only`, `break-anywhere`,
the icon classes, and a full CSS reset (box-sizing, border reset, a system sans stack —
there are no webfonts to load).

**`control-surface` is not in the stylesheet.** It is a source-level shortcut the other
controls compose, and nothing wears it directly; writing it produces no styling.

## The three controls

- **`control`** — a 64×48 icon-only square button. Accent border, hard 2px offset plate,
  colour transition over 300ms. The social links and the theme toggle wear it.
- **`control-cta`** — the same surface at the full width of its container, holding a text
  label and its mark centred together as one legend.
- **`text-link`** — a link that is a run of words: underlined, offset from the baseline,
  inheriting `--text` rather than announcing itself in accent.

Every link must carry a signifier a reader can perceive — an underline, a mark, a border.
A link drawn exactly like the prose beside it is a defect in this system, not a style.

## Icons

Icons are background-image glyphs sized by `font-size`, in two sets: thirteen `i-ri-*`
(Remix Icon — arrows, sun and moon, documents, the sport marks) and five `i-fa6-brands-*`
(GitHub, LinkedIn, Instagram, Telegram, Strava). Only those eighteen ship. Never
substitute an emoji for a missing one.

## Where the truth lives

Read the stylesheet you have been given: the fifteen tokens are restated in readable form
at the very top of it, both themes, ahead of the minified rules. In the source repository,
`src/layouts/BasicLayout.astro` documents what each token is for and the progress-bar
polarity rule, and `uno.config.ts` holds the shortcuts and says what each control is for.

## An idiomatic build

    <section style="background: var(--card-background);
                    border: 1px solid var(--card-border);
                    border-radius: .5rem; padding: 1rem;
                    display: flex; flex-direction: column; gap: .75rem">
      <h2 style="color: var(--text); font-size: 1.125rem; margin: 0">This month</h2>
      <p style="color: var(--text); margin: 0">
        Read the <a class="text-link" href="/patches">full event wall</a>.
      </p>
      <a class="control-cta" href="/patches/cycling">
        My cycling events <span class="i-ri-arrow-right-line"></span>
      </a>
    </section>

Layout glue is written by hand with flex or grid and a `gap`; the controls and the colour
come from the system.
