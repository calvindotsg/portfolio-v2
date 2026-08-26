import type {APIRoute} from "astro"
import {renderPatchWall} from "../lib/patch-doc"

/**
 * `/patches.md` — the markdown twin of `/patches`, for a reader that does not parse HTML.
 *
 * THE CONVENTION IS THE POINT, and plan 037 established it on `/design`: a page's markdown
 * rendering lives at its own URL plus `.md`, is announced from the page's head with
 * `<link rel="alternate" type="text/markdown">`, and is listed in `llms.txt`. All three halves
 * of that discovery exist for this page too, because an alternate representation nothing
 * announces is one only a reader who already guessed the convention can find.
 *
 * WHY THE WALL EARNS ONE MORE THAN ANY OTHER PAGE. It is the site's most citable page and it
 * is drawn as a grid of absolutely-positioned bibs. The alternative an agent has today is the
 * one-line-per-race summary in `llms.txt`, which publishes the RIDER'S figures alone and drops
 * the results-sheet account entirely — deliberately, because a crawler quoting one line per
 * race is owed the site's own claim rather than two sources to reconcile in a sentence. This
 * document has room for both, which is the whole reason it is the wall's rendering rather than
 * a second summary.
 *
 * TWO ENDPOINT FILES RATHER THAN ONE, AND THAT IS FORCED RATHER THAN PREFERRED. A rest
 * parameter matches zero segments only where it IS the whole path segment, and `[...sport].md`
 * is not one — so no single file under `patches/` can emit `/patches.md`. The sibling
 * `patches/[sport].md.ts` answers the two sport walls; this one answers the wall itself.
 *
 * THE STATIC BUILD DISCARDS THE HEADER BELOW, and `src/pages/llms.txt.ts` carries the
 * measurement: with `output: "static"` and no adapter, Astro keeps a route's response headers
 * only for an adapter that asks for them, so nothing here reaches `dist/`. What actually
 * serves this file is the HOST, deciding from the `.md` extension. The header stays because it
 * is the correct answer the day this site gains an adapter, and because deleting it would
 * leave the question unanswered somewhere else.
 */
export const GET: APIRoute = () =>
    new Response(renderPatchWall(), {headers: {"content-type": "text/markdown; charset=utf-8"}})
