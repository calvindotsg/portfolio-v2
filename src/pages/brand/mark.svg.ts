import type {APIRoute} from "astro"

import {markFill, markSvg} from "../../lib/brand-mark"
import {token} from "../../lib/palette"

/**
 * `/brand/mark.svg` — THE MARK AS A FILE, AND THE SITE'S FAVICON.
 *
 * THE THREE ROUTES IN THIS DIRECTORY ARE ONE DRAWING WITH THREE DELIVERY PROBLEMS. The inline
 * form in `src/components/BrandMark.astro` paints in `var(--brand-ink)` and follows the theme
 * for free, because it sits inside a document that defines those properties. A file a browser
 * loads as an icon, or an agent fetches over HTTP, has no such document — so the colours have
 * to be literal here, and that is exactly the condition under which somebody types a hex
 * rather than reading one. Nothing in these three files may: every value comes from
 * `src/lib/palette.ts`, which reads them out of the layout, and `tests/brand-mark.test.ts`
 * refuses any hex in the built output that the palette does not publish.
 *
 * THIS ONE THEMES ITSELF WHERE THE BROWSER LETS IT, AND THAT CAVEAT IS MEASURED RATHER THAN
 * ASSUMED. The light pair is the default and a `prefers-color-scheme: dark` block swaps to the
 * dark pair. Firefox and Safari honour that in a favicon; **CHROMIUM DOES NOT** — an open bug
 * (crbug 1311553) means Chromium evaluates the `<style>` when the file is opened as a document
 * and ignores it when the same file is used as an icon. Observed 2026-09-03 on the deploy
 * preview in a Chromium browser: the tab drew the LIGHT pair against dark browser chrome.
 *
 * SO THE DARK BLOCK IS A PROGRESSIVE ENHANCEMENT, NOT A GUARANTEE, and the light pair has to be
 * the one that reads on both grounds — which it does, and which is also why `public/favicon.ico`
 * is drawn from the same pair. Do not "fix" this by shipping the dark values as the default:
 * that trades a browser that degrades gracefully for one that gets it wrong the other way.
 *
 * `mark-light.svg` and `mark-dark.svg` exist beside it for a consumer that cannot evaluate CSS
 * at all — a raster pipeline, a README, a card generator — and neither is what a browser is
 * pointed at.
 *
 * THE TWO COLOURS ARE CARRIED DIFFERENTLY AND THE ASYMMETRY IS DELIBERATE. The ink is
 * `currentColor`, so one `color` declaration re-tones the rays, the dome and the filled bar
 * together; the track is a custom property because it has no such keyword. Both are set on the
 * root element and both are overridden in one media block, so the dark theme is four values in
 * one place rather than eight scattered through the drawing.
 *
 * THE FILL IS LIVE, so this file changes whenever the bot writes new kilometres. That is
 * intended — the bar is the year, and a mark frozen on the day it was drawn would be saying
 * something untrue rather than saying nothing. `public/favicon.ico` is the one placement where
 * it cannot move; the note beside its link in `src/layouts/BasicLayout.astro` says why.
 */
export const GET: APIRoute = () => {
    const ink = token("--brand-ink")
    const track = token("--progress-track")

    const svg = markSvg({
        ink: "currentColor",
        track: "var(--mark-track)",
        fill: markFill(),
        style: `color:${ink.light};--mark-track:${track.light}`,
        prelude: "<style>@media (prefers-color-scheme: dark){"
            + `svg{color:${ink.dark};--mark-track:${track.dark}}}</style>`,
    })

    return new Response(svg, {headers: {"content-type": "image/svg+xml; charset=utf-8"}})
}
