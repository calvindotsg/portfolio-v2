/**
 * THE SITE'S BRAND MARK: a five-ray sunrise over a two-tone bar, and THIS MODULE IS THE
 * DRAWING. Every number below is authored here and nowhere else — a second copy of a ray
 * angle or a rect width is a second mark, and the two would disagree the first time either
 * moved.
 *
 * It is the only module in `src/` that authors geometry, and that is the same bargain
 * `src/lib/palette.ts` makes in the other direction: the palette authors no value and reads
 * them all out of `BasicLayout.astro`, so between the two of them nothing about the mark is
 * written down twice. THIS MODULE NEVER CHOOSES A COLOUR — `markSvg` takes `ink` and `track`
 * from its caller, which is what lets one drawing serve a CSS-variable inline SVG, a pinned
 * light file and a pinned dark one without branching on a theme.
 *
 * WHERE IT CAME FROM. The mark was drawn in a Python module in a dotfiles repository
 * (`bft_card_lib/card_layout.py`), with this site's token VALUES typed in as literal hexes.
 * That module is a declared-disposable proof of concept and is not kept in sync: this
 * repository owns the palette, so it owns the mark. The port is faithful — same viewBox,
 * same angles, same arc, same bar — because the drawing was already right; what changes is
 * that the colours are now read rather than retyped.
 *
 * THE BAR IS LIVE, AND WHAT IT MEASURES IS AN IDENTITY DEVICE RATHER THAN A READING. The
 * fill is the average of the two goals' own fractions, so the mark says how the year is
 * going. `/design`'s Brand Mark section states that this stands outside the Data
 * Visualization rules and why; do not silently make it decorative by pinning the fraction,
 * and do not silently make it a chart by captioning it where it has no room to be read.
 *
 * THIS MODULE IS NOT IN THE GRAPH `uno.config.ts` DRAGS THROUGH jiti, and that is worth
 * stating because it imports one module that IS. The config reaches `src/lib/icons.ts` and
 * whatever that pulls in; it does not traverse `.astro` components, so nothing here is loaded
 * by the extractor. What that buys is the freedom this module does not currently spend: it
 * could read the filesystem. It does not, because it authors the drawing and reads no value —
 * `src/lib/palette.ts` is the module that does the reading, and it carries the same note from
 * the other side.
 */

import {GOALS} from "./goal"

/**
 * A rectangle in the mark's own coordinate space, optionally rotated about the sunrise's
 * centre. `rotate` is degrees; the pivot is the dome's centre rather than the rect's, which
 * is what makes the five rays a fan rather than five spins in place.
 */
export type MarkRect = {
    x: number
    y: number
    width: number
    height: number
    rotate?: number
}

/**
 * THE DRAWING, AS DATA RATHER THAN AS A TEMPLATE STRING.
 *
 * A string would be shorter and would be wrong for one reason: the `components` token group
 * publishes these figures, and a consumer that wants the ray's width cannot get it out of a
 * `<rect x="49" …>` without parsing SVG. Authoring the shape and rendering it are two jobs,
 * so they are two exports.
 *
 * `rayPivotY` is the dome's centre, and every ray rotates about it. The rays are drawn from
 * `y = 6`, which is above the dome's top edge — they are a corona, not spokes, and the gap
 * between a ray's foot and the dome's rim is what reads as light rather than as a wheel.
 */
export const MARK_GEOMETRY = {
    /** Square, so the mark can be sized by one number wherever it is drawn. */
    viewBox: "0 0 100 100",
    /** Five rays; the fan is symmetric about the vertical, which is why the middle is 0. */
    rayAngles: [-58, -29, 0, 29, 58],
    rayPivotX: 50,
    rayPivotY: 62,
    ray: {x: 49, y: 6, width: 2.6, height: 13},
    /** A half-disc: a horizontal chord at `y = 62`, closed back to its start. */
    dome: "M21 62 A29 29 0 0 1 79 62 Z",
    /** The bar's full extent — the whole year, drawn in `--progress-track`. */
    barTrack: {x: 8, y: 73, width: 84, height: 13},
} as const

/**
 * THE SIZES THE MARK IS DRAWN AT, LARGEST FIRST, AND WHAT EACH ONE COSTS.
 *
 * There is ONE drawing at every step of this ladder — no ray-less small variant — and the
 * consequence is recorded rather than discovered: at 120 and 48 the fan is fully legible;
 * at 24 the rays are thin but still read as separate; at 16 they close up against the dome
 * and the mark reads as a filled half-disc over a bar. THAT IS ACCEPTED. A second drawing
 * would be a second mark to keep in step for a gain nobody can see at 16px, and the shape
 * that survives — dome over a two-tone bar — is still this mark and nothing else's.
 *
 * The rays are the first thing to fill in because they are the mark's thinnest ink: 2.6
 * units of a 100-unit viewBox, so 0.42px at the smallest step.
 */
export const SIZE_LADDER = [120, 48, 24, 16] as const

/**
 * HOW FULL THE BAR IS: the average of each goal's OWN clamped fraction, in `0..1`.
 *
 * NOT the sum of kilometres over the sum of targets, and the difference is the whole reason
 * this function exists rather than being one expression at the call site. Cycling's target
 * is 5000 km against running's 600, so a sum-based ratio is the cycling goal with a rounding
 * error attached — a running year that doubled would move it by under a percentage point.
 * The average is the reading in which both sports are visible, which is what a mark for a
 * person who does both should say.
 *
 * `current_progress` is already clamped to `total_goal` by `src/lib/goal.ts`, so the result
 * cannot exceed 1 and the bar cannot overrun its track. That is `GOALS`' clamp doing its
 * job; do not re-clamp here, or the day the clamp changes there are two answers.
 */
export function markFill(): number {
    if (GOALS.length === 0) return 0
    const sum = GOALS.reduce((acc, goal) => acc + goal.current_progress / goal.total_goal, 0)
    return sum / GOALS.length
}

/**
 * The mark as an SVG string.
 *
 * `ink` and `track` are whatever the caller can use where the result is going: a
 * `var(--brand-ink)` on a page that re-tones with the theme, a literal hex in a file a
 * consumer fetches without a stylesheet. This module has no opinion, which is the point —
 * see the head of the file.
 *
 * `title` is the accessible name. Given one, the SVG announces itself with a `<title>` and
 * `role="img"`; given none, it is `aria-hidden` and the thing beside it does the announcing.
 * There is no third state: a mark that is neither named nor hidden is one a screen reader
 * reads as "image" and nothing more.
 *
 * `fill` is in `0..1` and is applied to the track's own width, so the filled bar is a
 * fraction of the bar rather than of the viewBox.
 *
 * `style` and `prelude` are the seams the standalone files need and the inline form does not.
 * A file loaded as an icon carries its own theme switch, which means an attribute on the root
 * and a `<style>` element inside it; without these two the route would have to reach into the
 * returned string and patch it, which is a parser nobody wants to own. THE DRAWING IS STILL
 * RENDERED ONCE — the alternative, one render per theme, puts two copies of the same geometry
 * in one file and lets them drift by a rounded fill.
 */
export function markSvg(options: {
    ink: string
    track: string
    fill: number
    px?: number
    title?: string
    style?: string
    prelude?: string
}): string {
    const {ink, track, fill, px, title, style, prelude} = options
    const g = MARK_GEOMETRY
    const size = px === undefined ? "" : ` width="${px}" height="${px}"`
    const styled = style === undefined ? "" : ` style="${escapeAttribute(style)}"`
    const label = title === undefined
        ? ` aria-hidden="true"`
        : ` role="img" aria-label="${escapeAttribute(title)}"`
    const rays = g.rayAngles
        .map((angle) => `<rect x="${g.ray.x}" y="${g.ray.y}" width="${g.ray.width}"`
            + ` height="${g.ray.height}" fill="${ink}"`
            + ` transform="rotate(${angle} ${g.rayPivotX} ${g.rayPivotY})"/>`)
        .join("")
    const filled = round(g.barTrack.width * clamp01(fill))
    return `<svg viewBox="${g.viewBox}"${size}${styled} xmlns="http://www.w3.org/2000/svg"${label}>`
        + (prelude ?? "")
        + rays
        + `<path d="${g.dome}" fill="${ink}"/>`
        + `<rect x="${g.barTrack.x}" y="${g.barTrack.y}" width="${g.barTrack.width}"`
        + ` height="${g.barTrack.height}" fill="${track}"/>`
        + `<rect x="${g.barTrack.x}" y="${g.barTrack.y}" width="${filled}"`
        + ` height="${g.barTrack.height}" fill="${ink}"/>`
        + `</svg>`
}

/**
 * Two decimal places, and trailing zeroes dropped so a whole number prints as one. The bar's
 * filled width is the only computed figure in the drawing, and an unrounded float would put
 * seventeen digits in a file three routes and a favicon serve on every build.
 */
function round(value: number): number {
    return Math.round(value * 100) / 100
}

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value))
}

/**
 * The mark's accessible name reaches an attribute, and the name carries a figure and a
 * scale rather than a fixed string, so it is escaped rather than trusted. Only the five
 * characters that can end an attribute or open a tag.
 */
function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}
