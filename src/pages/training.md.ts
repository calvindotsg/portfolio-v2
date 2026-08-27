import type {APIRoute} from "astro"
import {renderTrainingSpine} from "../lib/training-doc"

/**
 * `/training.md` — the markdown twin of `/training`, for a reader that does not parse HTML.
 *
 * THE CONVENTION IS THE POINT, and `/design` established it: a page's markdown rendering lives at
 * its own URL plus `.md`, is announced from the page's head with
 * `<link rel="alternate" type="text/markdown">`, and is listed in `llms.txt`. All three halves of
 * that discovery exist for this page too, because an alternate representation nothing announces is
 * one only a reader who already guessed the convention can find.
 *
 * WHY THE SPINE EARNS ONE. It is fifty-two rows whose whole meaning is the SHAPE of a column of
 * bars — a series is the one thing an agent scraping absolutely-positioned markup cannot
 * reconstruct, and `llms.txt` deliberately publishes one line per RACE and nothing at all about
 * the weeks between them. This document is the only place the year's own shape is available as
 * text.
 *
 * TWO ENDPOINT FILES RATHER THAN ONE, AND THAT IS FORCED RATHER THAN PREFERRED. A rest parameter
 * matches zero segments only where it IS the whole path segment, and `[...sport].md` is not one —
 * so no single file under `training/` can emit `/training.md`. The sibling
 * `training/[sport].md.ts` answers the two sport spines; this one answers the spine itself. The
 * wall's pair next door is split for the identical reason.
 *
 * THE STATIC BUILD DISCARDS THE HEADER BELOW, and `src/pages/llms.txt.ts` carries the measurement:
 * with `output: "static"` and no adapter, Astro keeps a route's response headers only for an
 * adapter that asks for them, so nothing here reaches `dist/`. What actually serves this file is
 * the HOST, deciding from the `.md` extension. The header stays because it is the correct answer
 * the day this site gains an adapter.
 */
export const GET: APIRoute = () =>
    new Response(renderTrainingSpine(), {headers: {"content-type": "text/markdown; charset=utf-8"}})
