import type {APIRoute} from "astro"

import {markFill, markSvg} from "../../lib/brand-mark"
import {token} from "../../lib/palette"

/**
 * `/brand/mark-light.svg` — the mark pinned to the light theme's pair.
 *
 * FOR THE CONSUMER THAT CANNOT EVALUATE CSS. `/brand/mark.svg` carries its own
 * `prefers-color-scheme` block and is what a browser should be pointed at; a raster pipeline,
 * a README's `<img>`, or a card generator compositing onto a known ground gets a file that has
 * already decided. Which theme it wants is the caller's question, so there are two files
 * rather than one guess.
 *
 * Every value is read from `src/lib/palette.ts`, and the drawing is the same call the other
 * two routes make. See `mark.svg.ts` for the whole argument.
 */
export const GET: APIRoute = () =>
    new Response(
        markSvg({
            ink: token("--brand-ink").light,
            track: token("--progress-track").light,
            fill: markFill(),
        }),
        {headers: {"content-type": "image/svg+xml; charset=utf-8"}},
    )
