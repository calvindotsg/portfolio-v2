/**
 * THIS SESSION NEVER HAPPENED. It is invented, in full, for `/design`'s Share Cards specimen, and
 * it is the ONLY thing on that page that is not the real thing — which is why the page carries a
 * caption saying so and why its lede is qualified. Read that first if you are here to add a
 * second one.
 *
 * WHY INVENTED RATHER THAN REAL. The site publishes this specimen and its description at two
 * URLs; a real session is a private training record, and three of the fields below are free prose
 * out of a private source. A specimen drawn from a real week would put that record in a public
 * repository forever, in exchange for a picture that looks exactly the same.
 *
 * WHY IT STILL LOOKS REAL. It exercises every slot the layout has — a quote and its attribution,
 * a mapped movement list, a session code, a progression counter and a provenance line — because a
 * specimen that skips a slot is a specimen of a card the renderer does not draw. Everything about
 * its SHAPE is faithful; only the facts are made up.
 *
 * THE CODE IS `HIIT 000` AND THE ZERO IS DELIBERATE. It is shaped exactly like a real session
 * code, so the footer's typography and width are the real ones, and it is a number no session
 * has — so nobody can mistake it for a record or try to join it back to a training week. The
 * quote and the program name it resolves to ARE the publisher's own published prose, which is
 * quoted rather than invented: inventing marketing copy and attributing it to a real business
 * would be the one thing worse than publishing a real session.
 *
 * THE SPECIMEN IS FROZEN. New cards are rendered from a file by `scripts/render-share-card.ts`
 * and are never committed. A second specimen would need the same caption and the same scrutiny.
 */

import type {Session} from "../../lib/share-card"

export const SPECIMEN: Session = {
    shading: "movements",
    // Six stations, each one a label the alias table maps, so the specimen's figure is drawn the
    // way a real conditioning session's is rather than falling back to the program type.
    movements: ["Ski Erg", "Rower", "Bike", "Bionic Bike", "Sprinting", "Battle Ropes"],
    code: "HIIT 000",
    progressionCounter: "6 of 6 — final",
    progressionNote: "third round added at the same work-to-rest ratio",
    intensity: "hard but repeatable — every round the same",
    note: "six stations, three rounds",
    block: "an invented block",
    span: "Mon 31 Aug – Sat 5 Sep 2026",
    readDate: "2026-08-31",
}
