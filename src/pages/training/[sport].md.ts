import type {APIRoute} from "astro"
import {renderTrainingSpine} from "../../lib/training-doc"
import {GOALS, type Sport} from "../../lib/goal"

/**
 * `/training/cycling.md` and `/training/running.md` — the markdown twins of the two sport spines.
 *
 * THE PATHS COME FROM `GOALS`, exactly as `[...sport].astro` derives its own, so a third sport
 * gets its page, its twin and its announcement together rather than two of the three. A list
 * written out here would be the second home that arrangement exists to prevent.
 *
 * A PLAIN PARAMETER, NOT A REST ONE, and the split from `../training.md.ts` is forced rather than
 * stylistic: a rest parameter matches zero segments only where it is the whole path segment, and
 * `[...sport].md` is not one, so no single file here can also emit `/training.md`. Read the
 * sibling's header before merging these.
 *
 * See `../training.md.ts` for what the document is for and for why the response header below does
 * not survive a static build.
 */
export function getStaticPaths() {
    return GOALS.map((goal) => ({params: {sport: goal.sport}, props: {sport: goal.sport}}))
}

export const GET: APIRoute = ({props}) =>
    new Response(renderTrainingSpine((props as {sport: Sport}).sport),
        {headers: {"content-type": "text/markdown; charset=utf-8"}})
