import type {APIRoute} from "astro"

import {renderDesignTokens} from "../lib/design-doc"

/**
 * `/design_tokens.json` — this design system's token groups as data.
 *
 * THE NAME IS THE DISCOVERY MECHANISM. It is what the DESIGN.md format's own examples put beside
 * a `DESIGN.md`, so a tool globbing for one finds this. Renaming it to something more descriptive
 * would make it invisible to the only readers it is for.
 *
 * IT IS BYTE-IDENTICAL TO `design_tokens.json` AT THE REPOSITORY ROOT, rendered by one function,
 * and `pnpm test` asserts the two rather than trusting they came from one call. The argument is
 * written out above `/design.md`'s route, which has the same arrangement for the same reason: a
 * header, a stamp or a banner added to one copy makes them two documents.
 *
 * THE STATIC BUILD DISCARDS THE HEADER BELOW. With `output: "static"` and no adapter, Astro keeps
 * a route's response headers only for an adapter that asks for them; what actually serves this
 * file is the host, deciding from the `.json` extension, and `public/_headers` is the only place
 * that can overrule it. The header stays because it is the correct answer the day this site gains
 * an adapter — the same reasoning `src/pages/llms.txt.ts` sets down first.
 */
export const GET: APIRoute = () =>
    new Response(renderDesignTokens(), {headers: {"content-type": "application/json; charset=utf-8"}})
