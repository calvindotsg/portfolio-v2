/**
 * THE MUSCLE MAP: two figures, front and back, with the worked regions lit.
 *
 * THIS MODULE CHOOSES NO COLOUR, and that is the same bargain `src/lib/brand-mark.ts` makes.
 * `fillOn`, `fillOff` and `outline` are arguments, so one drawing serves the light card, the
 * dark card and a test passing sentinels — and a hex typed here would be a value with no home
 * in `src/lib/palette.ts`, which is the one thing this repository's whole publishing chain
 * exists to prevent. `tests/body-map.test.ts` holds it to that with sentinel values.
 *
 * THE PATHS ARE VENDORED AND ARE NOT THIS SITE'S WORK. `src/lib/anatome/` carries them with the
 * upstream's MIT licence; nothing here is drawn by hand and nothing here should ever be. Read
 * that directory's README before touching either JSON file.
 *
 * PORTED FROM A PYTHON PROOF OF CONCEPT (`bft_card_lib/render_body.py`) that is declared
 * disposable and is not kept in sync. The port is faithful — same skipped regions, same two
 * opacities, same dual viewBox — because the drawing was already right; what changes is that
 * the colours are now passed in rather than typed in.
 */

import paths from "./anatome/body-paths.json"
import wrappers from "./anatome/body-wrappers.json"

/** Which figure. The card draws both; a caller may want one. */
export type BodyView = "front" | "back"

/**
 * ANATOMY THE FIGURE DRAWS AND THE MAP NEVER SHADES, so it is not drawn at all.
 *
 * Upstream's data covers the whole silhouette, these six regions included. They are not muscle
 * groups, no movement in `src/data/bft/aliases.ts` maps to one, and so none of them can ever be
 * lit. Drawing them at the UNLIT colour would therefore be a claim rather than an omission: the
 * map's two fills mean "worked" and "not worked", and a head painted "not worked" says somebody
 * looked. Leaving them out lets the silhouette outline carry the head and the hands, which is
 * what a reader reads them as anyway.
 */
const NOT_A_MUSCLE = new Set(["hair", "head", "hands", "feet", "ankles", "knees"])

/**
 * HOW HARD THE SILHOUETTE IS DRAWN. It is context rather than data — the edge that makes the
 * shaded regions read as a body instead of as a scatter of shapes — so at full strength it
 * competes with the one thing on the card that is actually being measured. Two pixels at just
 * over half opacity is enough line to read the figure by and not enough to be looked at.
 */
const OUTLINE_OPACITY = 0.55

/** The worked regions, at full strength: this is the marked region and it carries the reading. */
const LIT_OPACITY = 1

/**
 * THE REMAINDER, AND THE FIGURE IS THE POLARITY RULE RATHER THAN A TASTE. `/design`'s Data
 * Visualization section requires the marked region to stand further from the surface than the
 * unmarked one, because whichever region has more contrast is the one a reader takes for the
 * mark — a map drawn the other way round reads as a whole body worked. So the unlit muscles sit
 * near enough to the ground to read as remainder while staying visible as the shape they are;
 * dropping them entirely would lose the body, and matching the lit fill would lose the reading.
 */
const UNLIT_OPACITY = 0.28

/** The stroke the silhouette is drawn with, in the figure's own coordinate space. */
const OUTLINE_WIDTH = 2

/**
 * THE DUAL VIEW'S BOX, AND IT IS SQUARE FOR A REASON A NON-SQUARE ONE HIDES.
 *
 * Upstream's two viewBoxes are `0 0 724 1448` and `724 0 724 1448` — the back figure is offset
 * by exactly one figure's width, so the two tile side by side with no transform arithmetic. The
 * union is 1448 wide by 1448 tall, which is square, and that squareness is load-bearing:
 * `preserveAspectRatio` renders a box at its SMALLER dimension, so a non-square box letterboxes
 * both figures inside their own frame and shrinks the map silently. That is measured rather than
 * theorised — it shrank every map in the first two design rounds of the proof of concept.
 */
const DUAL_VIEW_BOX = "0 0 1448 1448"

/** Every slug the vendored data holds for one view, whether or not this map ever shades it. */
export function slugsIn(view: BodyView): string[] {
    return paths.male[view].map((entry) => entry.slug)
}

/** The slugs this map can actually light — the vendored set minus the six non-muscle regions. */
export function muscleSlugsIn(view: BodyView): string[] {
    return slugsIn(view).filter((slug) => !NOT_A_MUSCLE.has(slug))
}

/**
 * ONE FIGURE. The outline first so every shaded region sits on top of it, then one `<path>` per
 * side of each muscle — upstream splits several of them into `left`, `right` and `common` runs,
 * and all three are drawn with the same fill because they are one muscle group.
 */
function figure(view: BodyView, lit: ReadonlySet<string>, colours: BodyColours): string {
    const wrapper = wrappers[view]
    const parts = [
        `<path d="${wrapper.outline}" fill="none" stroke="${colours.outline}"`
        + ` stroke-width="${OUTLINE_WIDTH}" opacity="${OUTLINE_OPACITY}"/>`,
    ]
    for (const entry of paths.male[view]) {
        if (NOT_A_MUSCLE.has(entry.slug)) continue
        const on = lit.has(entry.slug)
        const fill = on ? colours.fillOn : colours.fillOff
        const opacity = on ? LIT_OPACITY : UNLIT_OPACITY
        const side = entry.path as Partial<Record<"left" | "right" | "common", string[]>>
        for (const key of ["left", "right", "common"] as const) {
            for (const d of side[key] ?? []) {
                parts.push(`<path d="${d}" fill="${fill}" opacity="${opacity}"/>`)
            }
        }
    }
    return `<g>${parts.join("")}</g>`
}

/** The three colours the map is drawn in. None of them is decided here. */
export type BodyColours = {
    /** The worked regions. */
    fillOn: string
    /** The remainder. */
    fillOff: string
    /** The silhouette. */
    outline: string
}

/**
 * THE DUAL FIGURE AS AN SVG STRING, sized by one number because the box is square.
 *
 * `front` and `back` are the slugs to light in each view, and they are separate sets rather than
 * one because several slugs exist in both — `calves`, `deltoids`, `forearm`, `trapezius`,
 * `triceps`, `adductors` and `neck` — and a movement that works the front of one does not
 * necessarily work the back. The caller intersects; this module lights what it is handed.
 */
export function bodyMapSvg(options: {
    front: ReadonlySet<string>
    back: ReadonlySet<string>
    colours: BodyColours
    px: number
}): string {
    const {front, back, colours, px} = options
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${DUAL_VIEW_BOX}"`
        + ` width="${px}" height="${px}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`
        + figure("front", front, colours)
        + figure("back", back, colours)
        + `</svg>`
}

/**
 * The dual view's box, published so a test can assert it is square without re-deriving it from
 * the two vendored viewBoxes — which is the arithmetic the constant above exists to settle once.
 */
export const DUAL_BOX = DUAL_VIEW_BOX

/** The two opacities, published for the same reason: a gate should read them, not restate them. */
export const OPACITIES = {lit: LIT_OPACITY, unlit: UNLIT_OPACITY, outline: OUTLINE_OPACITY} as const

/** The six regions the map refuses to draw, published so the gate can assert their absence. */
export const SKIPPED_REGIONS: readonly string[] = [...NOT_A_MUSCLE]
