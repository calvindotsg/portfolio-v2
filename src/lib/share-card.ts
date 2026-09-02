/**
 * THE SHARE CARD: a square image posted beside a gym activity, drawn in this site's palette and
 * wearing this site's mark.
 *
 * ONE IMPLEMENTATION, TWO CONSUMERS, AND THAT IS THE WHOLE ARCHITECTURE. `cardHtml` returns an
 * HTML string; `/design` embeds it as a specimen and `scripts/render-share-card.ts` writes it to
 * a file and screenshots it. An Astro component for the page plus a template for the renderer
 * would be two homes for one drawing, which is the defect this repository is organised against —
 * and the page would then be showing a picture of the card rather than the card.
 *
 * IT WAS PORTED FROM A PYTHON MODULE THAT HARDCODED THIS SITE'S PALETTE. Eleven distinct hexes
 * over twenty-eight occurrences, every one of them a token `src/lib/palette.ts` publishes. THIS
 * MODULE MAY NOT CONTAIN A HEX, and `tests/share-card.test.ts` says so — that is the entire
 * reason the card moved into the repository that owns the palette rather than staying in the one
 * that copied it.
 *
 * THE TWO SURFACES ARE DISJOINT AND THAT IS A CONTRACT RATHER THAN A TIDINESS. A session feeds
 * both the card and {@link shareDescription}, and no fact may appear on both: they share a join
 * key (the session code) and a citation (the publisher's name), and nothing else. The card owns
 * the quote, the map, the shading provenance, the code and the progression; the text owns the
 * stations, the intensity, the muscle names and the citation. `tests/share-card.test.ts` runs
 * both real renderers over the specimen and asserts the intersection.
 *
 * THE ONE THING THE CARD CANNOT DO, recorded rather than glossed: the quote lives inside an image
 * and the platform it is posted to has no alt text, so it is the one element a screen reader
 * cannot reach. Everything factual is in the description, which is text. DO NOT "FIX" THIS BY
 * MOVING FACTS INTO THE IMAGE — that trades one unreachable decoration for unreachable
 * information.
 */

import {FORMAT_QUOTES, formatOf, musclesFromFormat, PUBLISHER, STUDIO} from "../data/bft/formats"
import {canonical, resolve} from "../data/bft/aliases"

/**
 * WHERE THE SHADING CAME FROM, AS THE TWO SENTENCES THE CARD ACTUALLY PRINTS.
 *
 * It is DERIVED from {@link Session}'s own shape and never authored, which is what makes the type
 * below load-bearing rather than decorative: a session cannot carry a provenance line that
 * disagrees with how it was shaded, because it carries no provenance line at all.
 */
export const PROVENANCE = {
    movements: "Shaded from this session's published list",
    format: "Shaded from the class type only",
} as const

/**
 * A SESSION SHADED FROM ITS OWN PUBLISHED MOVEMENTS — the measured case.
 *
 * `movements` are the labels the coach published for THAT DAY. They are never the week's: a
 * week-level list is what was published across six days, so shading one activity from it colours
 * muscles belonging to a different session. Measured in the proof of concept at a nearly
 * all-red figure on 60 of 90 sessions, which said very little while looking authoritative.
 */
export type ShadedFromMovements = {
    shading: "movements"
    movements: readonly string[]
}

/**
 * A SESSION SHADED FROM ITS PROGRAM TYPE — the coarse case, and the card says so.
 *
 * `movements?: never` is the half that matters. Without it a session could carry a movement list
 * AND claim format-level shading, so the card would print "Shaded from the class type only" over
 * a figure drawn from a list — one line drawn, a different one meant, and nothing able to tell.
 */
export type ShadedFromFormat = {
    shading: "format"
    movements?: never
}

/** Which of the two accounts of a session's muscles this one is. */
export type Shading = ShadedFromMovements | ShadedFromFormat

/**
 * ONE SESSION, AS BOTH SURFACES SEE IT.
 *
 * THREE OF THESE FIELDS ARE FREE PROSE OUT OF A PRIVATE SOURCE — `note`, `progressionNote` and
 * `intensity` — which is why `tests/share-card-redaction.test.ts` exists and why the renderer
 * refuses rather than scrubs. Anything a future editor types into one of those reaches a public
 * post. See `src/lib/redaction.ts`.
 */
export type Session = Shading & {
    /** The studio's own code. The join key back to a training week, and the ONLY fact on both surfaces. */
    code: string
    /** How far through the block this session is — `3 of 6`, optionally with a marker. */
    progressionCounter: string
    /** The coach's prose about what changed. Text-shaped, so it goes in the description. */
    progressionNote: string
    /** The target intensity as published. Free prose. */
    intensity: string
    /** What the session is, as published. Free prose. */
    note: string
    /** Which training block it belongs to. */
    block: string
    /** The week's span, for the description's citation. */
    span: string
    /** The day the coach's post was read, ISO. */
    readDate: string
}

/**
 * THE MUSCLE NAMES A READER USES, WHICH ARE NOT THE SLUGS THE ANATOMY USES.
 *
 * `upper-back` is a vendored path's identifier; `lats` is what somebody says out loud. The
 * description is prose for a person, so it prints the second. The card prints neither — it draws
 * them, which is the point of drawing them.
 */
const MUSCLE_NAMES: Readonly<Record<string, string>> = {
    quadriceps: "quads",
    hamstring: "hamstrings",
    gluteal: "glutes",
    calves: "calves",
    tibialis: "shins",
    adductors: "adductors",
    abs: "core",
    obliques: "obliques",
    "lower-back": "lower back",
    "upper-back": "lats",
    trapezius: "traps",
    chest: "chest",
    deltoids: "delts",
    biceps: "biceps",
    triceps: "triceps",
    forearm: "forearms",
    neck: "neck",
}

/**
 * THE ORDER MUSCLES ARE NAMED IN — ground up, then out along the arms. It is anatomical rather
 * than alphabetical because the list is read as a sentence about a body, and `abs, calves, delts`
 * reads as a lookup table.
 */
const MUSCLE_ORDER = ["quadriceps", "hamstring", "gluteal", "calves", "tibialis", "adductors",
    "abs", "obliques", "lower-back", "upper-back", "trapezius", "chest", "deltoids", "biceps",
    "triceps", "forearm", "neck"]

/** The slugs the front figure can light. The two views overlap; a caller intersects. */
export const FRONT_SLUGS: ReadonlySet<string> = new Set(["abs", "adductors", "biceps", "calves",
    "chest", "deltoids", "forearm", "neck", "obliques", "quadriceps", "tibialis", "trapezius",
    "triceps"])

/** The slugs the back figure can light. */
export const BACK_SLUGS: ReadonlySet<string> = new Set(["adductors", "calves", "deltoids",
    "forearm", "gluteal", "hamstring", "lower-back", "neck", "trapezius", "triceps", "upper-back"])

/**
 * WHAT A SESSION WORKED, and the ONE place the fallback is decided.
 *
 * A movement list that resolves to nothing falls back to the program type — an unmapped label
 * contributes no slugs, so a session of nothing but unmapped labels is indistinguishable from
 * one with no list at all, and both deserve the coarse answer with the sentence that admits it.
 * THE TABLE NEVER GUESSES; this is what "never guesses" costs and it is the cost worth paying.
 */
export function workedBy(session: Session): {slugs: readonly string[], shading: Shading["shading"]} {
    if (session.shading === "movements") {
        const slugs = new Set(session.movements.flatMap((label) => resolve(label).slugs))
        if (slugs.size > 0) return {slugs: [...slugs].sort(), shading: "movements"}
    }
    return {slugs: [...musclesFromFormat(session.code)].sort(), shading: "format"}
}

/** The published stations, canonicalised, and only for a session that published its own. */
export function stationsOf(session: Session): readonly string[] {
    if (session.shading !== "movements") return []
    return session.movements
        .filter((label) => resolve(label).status === "mapped")
        .map(canonical)
}

/** The program this code names, with the publisher's own name and sentence for it. */
export function programOf(code: string): {name: string, quote: string} | null {
    const key = formatOf(code)
    return key === null ? null : FORMAT_QUOTES[key]!
}

/**
 * THE DESCRIPTION — the text half of the pair, and the half a screen reader can reach.
 *
 * It owns the stations, the intensity and the coach's note, the muscles NAMED, and the citation
 * with its read date. It owns none of the card's five facts, which is the disjointness contract
 * at the top of this file; `tests/share-card.test.ts` runs both renderers and proves it.
 */
export function shareDescription(session: Session): string {
    const lines: string[] = []
    const stations = stationsOf(session)
    if (stations.length) {
        lines.push(`${stations.length} stations: ${stations.join(" · ")}`)
    }
    const detail = [session.note, session.intensity, session.progressionNote]
        .filter((part) => part && part !== "—")
    if (detail.length) lines.push(`${detail.join(". ").replace(/\.+$/, "")}.`)
    const worked = new Set(workedBy(session).slugs)
    const named = MUSCLE_ORDER.filter((slug) => worked.has(slug)).map((slug) => MUSCLE_NAMES[slug]!)
    if (named.length) lines.push(`Muscles: ${named.join(", ")}.`)
    lines.push("")
    // THE SPAN RATHER THAN THE WEEK NUMBER. The card's provenance line already carries the word
    // "week", and a reader gets more from two dates than from an ordinal anyway.
    const span = session.span.replace(/\s*20\d\d$/, "")
    lines.push(`${session.code} — ${session.block}, ${span}. `
        + `Prescribed by ${STUDIO}; coach's post read ${readableDate(session.readDate)}.`)
    return lines.join("\n").trim()
}

/** `2026-09-02` -> `2 Sep 2026`. The one date format either surface prints. */
function readableDate(iso: string): string {
    const [year, month, day] = iso.split("-").map(Number) as [number, number, number]
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${day} ${months[month - 1]} ${year}`
}

/** The publisher's name, re-exported so a consumer of the card need not know where it is authored. */
export {PUBLISHER}
