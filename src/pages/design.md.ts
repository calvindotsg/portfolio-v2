import type {APIRoute} from "astro"
import {renderDesignDoc} from "../lib/design-doc"

/**
 * `/design.md` — the markdown twin of `/design`, for a reader that does not parse HTML.
 *
 * THE CONVENTION IS THE POINT: a page's markdown rendering lives at its own URL plus `.md`,
 * announced from the page's head with `<link rel="alternate" type="text/markdown">` and listed
 * in `llms.txt`. Both halves of that discovery are here — the page carries the link, this route
 * serves what it points at — because an alternate representation nothing announces is one only
 * a reader who already guessed the convention can find.
 *
 * IT IS BYTE-IDENTICAL TO `DESIGN.md` AT THE REPOSITORY ROOT, and deliberately so: the same
 * function renders both, so the file a coding agent finds in a checkout and the document an
 * agent fetches over HTTP cannot describe the same design system two ways. `pnpm test` asserts
 * the two are identical rather than trusting that they came from one call. Nothing here may add
 * a header, a stamp or a banner to one copy — the moment it does, they are two documents.
 *
 * THE STATIC BUILD DISCARDS THE HEADER BELOW, and `src/pages/llms.txt.ts` sets the precedent
 * and gives the measurement: with `output: "static"` and no adapter, Astro keeps a route's
 * response headers only for an adapter that asks for them, so nothing here reaches `dist/`.
 * What actually serves this file is the HOST, deciding from the `.md` extension, and
 * `public/_headers` is the only place that can overrule it. The header stays because it is the
 * correct answer the day this site gains an adapter, and because deleting it would leave the
 * question unanswered somewhere else.
 */
export const GET: APIRoute = () =>
    new Response(renderDesignDoc("full"), {headers: {"content-type": "text/markdown; charset=utf-8"}})
