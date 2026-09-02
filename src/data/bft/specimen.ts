/**
 * THIS SESSION NEVER HAPPENED. It is invented, in full, for `/design`'s Share Cards specimen, and
 * it is the ONLY thing on that page that is not the real thing — which is why the page carries a
 * caption saying so and why its lede is qualified. Read that first if you are here to add a
 * second one.
 *
 * WHY INVENTED RATHER THAN REAL. The site publishes this specimen at two URLs; a real session is a
 * private training record, and three of the fields below are free prose out of a private source. A
 * specimen drawn from a real week would put that record in a public repository forever, in
 * exchange for a picture that looks exactly the same.
 *
 * WHY IT IS SHADED FROM THE CLASS TYPE RATHER THAN FROM A MOVEMENT LIST, which is the one
 * deliberate choice here and was made by looking at both. A conditioning session with its
 * movements published lights nearly every muscle group, so the card's two fills stop being
 * distinguishable and the legend below them stops meaning anything — the figure reads as "a body,
 * in red". The coarse shading lights about a third of them, so a reader can actually see what
 * "worked" and "not worked" are, which is what a specimen is for. It also puts the FALLBACK
 * wording on the page — "Shaded from the class type only" — which is the sentence the section's
 * own guidance asks for and the one a reader most needs to have seen.
 *
 * WHAT THAT COSTS, said rather than glossed: the specimen no longer exercises the movement-list
 * path, so `tests/share-card.test.ts` constructs its own session for that half instead of leaning
 * on this one. A specimen chosen for legibility is not a fixture, and the suite is where coverage
 * belongs.
 *
 * WHY IT STILL LOOKS REAL. Everything about its SHAPE is faithful — a quote and its attribution, a
 * session code, a progression counter, a provenance line, and free prose in all three fields that
 * carry it. Only the facts are made up. The quote and the program name it resolves to ARE the
 * publisher's own published prose, quoted rather than invented: making up marketing copy and
 * attributing it to a real business would be the one thing worse than publishing a real session.
 *
 * THE SPECIMEN IS FROZEN. New cards are rendered from a file by `scripts/render-share-card.ts`
 * and are never committed. A second specimen would need the same caption and the same scrutiny.
 */

import type {Session} from "../../lib/share-card"

export const SPECIMEN: Session = {
    // No movement list, so the card shades from the program type and prints that it did.
    shading: "format",
    code: "Cardio U 50",
    progressionCounter: "5/5 — final",
    progressionNote: "the hard block lengthened by two minutes",
    intensity: "steady, then hard, then steady again",
    note: "one long block at three intensities",
    block: "an invented block",
    span: "Mon 31 Aug – Sat 5 Sep 2026",
    readDate: "2026-08-31",
}
