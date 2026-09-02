import type {APIRoute} from "astro"

import {markFill, markSvg} from "../../lib/brand-mark"
import {token} from "../../lib/palette"

/**
 * `/brand/mark-dark.svg` — the mark pinned to the dark theme's pair.
 *
 * The twin of `mark-light.svg`, for the same reason and with the same caveat: this is NOT the
 * file a browser should load as an icon. `/brand/mark.svg` themes itself and is the one linked
 * from every page. See `mark.svg.ts` for the argument the three routes share.
 */
export const GET: APIRoute = () =>
    new Response(
        markSvg({
            ink: token("--brand-ink").dark,
            track: token("--progress-track").dark,
            fill: markFill(),
        }),
        {headers: {"content-type": "image/svg+xml; charset=utf-8"}},
    )
