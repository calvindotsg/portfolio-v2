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

import {readFileSync} from "node:fs"

import {FORMAT_QUOTES, formatOf, musclesFromFormat, PUBLISHER, STUDIO} from "../data/bft/formats"
import {canonical, resolve} from "../data/bft/aliases"
import {bodyMapSvg} from "./body-map"
import {markFill, markSvg} from "./brand-mark"
import {token, valueIn} from "./palette"

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
 * post. The refusal lives in `scripts/render-share-card.ts`, on the path that renders REAL
 * sessions, and deliberately not here: the `/design` specimen is invented and cannot leak, and a
 * site build that required the protected-name list would fail on every machine without it.
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

/* ------------------------------------------------------------------------------------------ *
 * THE FRAME. Every figure below is a rule with a reason, not an incidental number.
 * ------------------------------------------------------------------------------------------ */

/**
 * THE CARD IS SQUARE AT 1080, AND IT IS NOT 4:5.
 *
 * Every integration card the platform shows beside an activity — the cycling, running, lifting
 * and recovery apps whose names sit in its own attribution chip — is square-ish, and the
 * platform's photo carousel CROPS a portrait. A 4:5 card is therefore a square card with a
 * decision about which fifth to lose taken by somebody else.
 */
export const CARD_PX = 1080

/**
 * THE TYPE FLOOR, AND WHERE THE NUMBER COMES FROM.
 *
 * The card renders about 350pt wide in the feed, so a step at 1080 arrives at roughly a third of
 * its nominal size: 20px lands near 6.5pt. That is the edge of legible, which is why it is the
 * floor rather than a step — going below it stops being readable at all rather than merely
 * becoming quiet.
 *
 * THE DESIGN NOTE SAID "~22px" AND THE CARD KEEPS 20, which is the same estimate rounded the
 * other way and is worth stating rather than quietly reconciling. Three lines sit on this floor —
 * the legend's two labels and the provenance — and every one of them is a line whose job is to be
 * AVAILABLE rather than read first. Raising them would also move the map, which is measured
 * against the drawing this was ported from; the port is faithful and the floor records where it
 * actually landed.
 */
export const TYPE_FLOOR_PX = 20

/**
 * THE TYPE STEPS, LARGEST FIRST. A short ramp for the same reason the site's is short: on a
 * surface this small, hierarchy has to come from a few decisive jumps rather than from many
 * near-neighbours nobody can tell apart at a third scale.
 */
const TYPE = {
    /** The hero. The class's stated intention, quoted. */
    quote: 58,
    /** The session code in the footer — the join key, and the second-loudest thing here. */
    code: 34,
    /** The attribution under the quote, and the wordmark in the chip. */
    cite: 26,
    /** Everything on the floor: the legend, the provenance, the progression. */
    quiet: TYPE_FLOOR_PX,
} as const

/**
 * THE CARD'S REGIONS, TOP TO BOTTOM, AND WHY EACH SITS WHERE IT DOES.
 *
 * The order is by loudness rather than by importance, which is what makes it a card and not a
 * report: the hero is the class's stated INTENTION, the map is the evidence for it, and the
 * footer is everything a reader consults rather than reads.
 *
 * THE LEGEND SITS IN THE FOOTER, BELOW THE MAP, AND THAT IS A DEPARTURE WORTH NAMING. The design
 * system asks that a quantity name its scale in words the reader meets FIRST. The map is not a
 * quantity — nothing here is decoded into a number — and its two fills are self-evident on a
 * body, so the legend confirms a reading rather than enabling one. Putting a 20px key above a
 * 596px figure would also put the quietest element in the middle of the card. Inside the footer
 * the legend DOES come first, ahead of the provenance and the code, because that is the order a
 * reader consults them in.
 */
export const CARD_REGIONS = ["chip", "hero", "map", "footer"] as const

/**
 * 🔴 THE BRAND CHIP GOES TOP-RIGHT, AND THAT IS NOT A TASTE DECISION.
 *
 * Strava overlays its OWN chip on the TOP-LEFT of every activity photo — the sport type
 * ("Workout"), or the connected app's name. It is the same slot that reads "Rouvy", "Runna",
 * "Hevy" and "Peloton" in the reference screenshots: those are Strava's attribution chips, not
 * those apps' own logos. Observed 2026-09-02 in the iOS app covering "calvin.sg" completely.
 * Top-left belongs to Strava; do not move the mark back.
 */
export const CHIP_CORNER = "top-right"

/**
 * THE CARD'S INNER MARGIN. Published because `src/lib/component-tokens.ts` derives the card's
 * `padding` token from it; typing that figure there would be a second home for this one.
 */
export const CARD_PADDING_PX = 50

/** The gap between the card's four regions. */
const REGION_GAP_PX = 18

/**
 * THE MAP'S DRAWN SIZE. It is a fixed square rather than a fraction of what is left, because the
 * box it sits in has to be able to grow and shrink around a quote of unknown length without the
 * figure resizing between one card and the next — two cards in a feed with differently-sized
 * bodies read as two different scales rather than as two sessions.
 */
const MAP_PX = 596

/** The wordmark beside the mark in the chip, and the site this card belongs to. */
const WORDMARK = "calvin.sg"

/** The mark's drawn size in the chip. Small, because the chip is an attribution, not a logo. */
const CHIP_MARK_PX = 30

/**
 * THE FIVE TOKENS THE CARD IS DRAWN IN, resolved out of the layout by `src/lib/palette.ts`.
 *
 * The module this was ported from typed all five in as literal hexes, twice over — once per
 * theme — and that is the entire reason the card moved into the repository that owns the palette.
 * `tests/share-card.test.ts` asserts this file contains no hex at all.
 */
function palette(theme: string) {
    const of = (name: string) => valueIn(token(name), theme)
    return {
        ground: of("--background"),
        rule: of("--card-border"),
        text: of("--text"),
        ink: of("--brand-ink"),
        track: of("--progress-track"),
    }
}

/**
 * THE TYPEFACE, READ OUT OF THE LAYOUT RATHER THAN RETYPED.
 *
 * The card carries its own font because it is rendered with no stylesheet — a specimen that
 * inherited the page's font would look right on `/design` and ship a different face in the PNG.
 * Reading the declaration is the same bargain `src/lib/palette.ts` makes with the colour blocks,
 * and for the same reason: this site's Typography section opens by saying there is no webfont, so
 * the stack IS the typeface and a second copy of it is a second typeface waiting to drift.
 *
 * THIS READ IS WHY NOTHING REACHABLE FROM `uno.config.ts` MAY IMPORT THIS MODULE, which is the
 * guard `src/lib/palette.ts` states at length from the other side. Nothing does: this file is
 * read by `src/pages/design.astro` and by `scripts/render-share-card.ts`, and the config reaches
 * neither.
 *
 * 🔴 THE FAMILY NAMES ARE RE-QUOTED, AND SKIPPING THAT SILENTLY DELETES THE WHOLE CARD'S TYPE.
 * The layout writes `"Segoe UI"` with double quotes, which is correct CSS in a stylesheet and
 * fatal inside a double-quoted `style` attribute: the first one ends the attribute, so every
 * declaration after `font-family` — size, weight, tracking, colour — is dropped by the parser
 * with no error anywhere. Measured: the first render of this card came back set in the
 * renderer's default serif at its default size, and the HTML was valid. Single quotes are
 * equally valid CSS and cannot end the attribute.
 */
function fontStack(): string {
    const source = readFileSync("src/layouts/BasicLayout.astro", "utf8")
    const found = /font-family:\s*([^;]+);/.exec(source)
    if (!found) {
        throw new Error(
            "src/lib/share-card.ts found no font-family declaration in "
            + "src/layouts/BasicLayout.astro. The card renders with no stylesheet, so it would "
            + "ship in the renderer's default serif while /design showed the right face.",
        )
    }
    return found[1]!.trim().replace(/"/g, "'")
}

/**
 * THE ONE SINK. Every string the card prints comes from a typed module in this repository, and
 * every one of them is escaped anyway — because the next person to add a session will be
 * thinking about muscles rather than markup, and because `/design` embeds the result with
 * `set:html`, which does not escape.
 */
function text(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

type Ink = ReturnType<typeof palette>

/** The attribution chip: the mark, the wordmark, and an opaque ground under both. */
function chip(ink: Ink, font: string): string {
    const mark = markSvg({ink: ink.ink, track: ink.track, fill: markFill(), px: CHIP_MARK_PX})
    return `<div style="display:flex;justify-content:flex-end;align-items:flex-start">`
        + `<div style="display:inline-flex;align-items:center;gap:13px;background:${ink.ground};`
        + `padding:12px 22px 12px 17px;align-self:flex-end">${mark}`
        + `<div style="font-family:${font};font-size:${TYPE.cite}px;font-weight:650;`
        + `letter-spacing:-0.01em;color:${ink.text}">${text(WORDMARK)}</div></div></div>`
}

/** The hero: the class's stated intention, quoted, and attributed to whoever published it. */
function hero(session: Session, ink: Ink, font: string): string {
    const program = programOf(session.code)
    const quote = program?.quote ?? ""
    const says = program === null ? PUBLISHER : `${PUBLISHER}, on ${program.name}`
    return `<div style="display:flex;flex-direction:column;gap:14px">`
        + `<div style="font-family:${font};font-size:${TYPE.quote}px;font-weight:700;`
        + `letter-spacing:-0.03em;line-height:1.1;color:${ink.text};text-wrap:pretty">`
        + `&ldquo;${text(quote)}&rdquo;</div>`
        + `<div style="font-family:${font};font-size:${TYPE.cite}px;font-weight:600;`
        + `color:${ink.ink}">&mdash; ${text(says)}</div></div>`
}

/** One legend entry: a swatch of the fill, and the word for what it means. */
function swatch(fill: string, label: string, ink: Ink, font: string): string {
    return `<div style="display:flex;align-items:center;gap:9px">`
        + `<div style="width:24px;height:10px;background:${fill}"></div>`
        + `<div style="font-family:${font};font-size:${TYPE.quiet}px;font-weight:500;`
        + `color:${ink.text};opacity:0.7">${text(label)}</div></div>`
}

/** The footer: the legend, the provenance, and the join key with its progression. */
function footer(session: Session, shading: Shading["shading"], ink: Ink, font: string): string {
    return `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;`
        + `border-top:1px solid ${ink.rule};padding-top:20px">`
        + `<div style="display:flex;flex-direction:column;gap:10px">`
        + `<div style="display:flex;align-items:center;gap:20px">`
        + swatch(ink.ink, "worked", ink, font)
        + swatch(ink.track, "not worked", ink, font)
        + `</div>`
        + `<div style="font-family:${font};font-size:${TYPE.quiet}px;font-weight:500;`
        + `color:${ink.text};opacity:0.5">${text(PROVENANCE[shading])}</div></div>`
        + `<div style="text-align:right">`
        + `<div style="font-family:${font};font-size:${TYPE.code}px;font-weight:750;`
        + `letter-spacing:-0.015em;color:${ink.text}">${text(session.code)}</div>`
        + `<div style="font-family:${font};font-size:${TYPE.quiet}px;font-weight:500;`
        + `color:${ink.text};opacity:0.55;padding-top:6px">`
        + `${text(session.progressionCounter)}</div></div></div>`
}

/**
 * EVERY STRING THE CARD PRINTS, AS TEXT — the surface a leak gate must scan, and NOT the HTML.
 *
 * MEASURED, AND THE REASON THIS FUNCTION EXISTS AT ALL: scanning the rendered card refuses honest
 * sessions. The card embeds a 1448-unit anatomical drawing, so its markup carries tens of
 * thousands of path coordinates, and a protected-name list holding any short value matches one of
 * them immediately — the first real run refused the invented specimen over two three-digit runs
 * inside `d="…"`. Path data is not published prose. What a reader can read is this list.
 *
 * IT IS DERIVED FROM THE SAME PLACES THE DRAWING READS, so a field added to the card and not here
 * would be a field the gate stops seeing. That is the one way this can go quietly wrong; the
 * ordering below follows `cardHtml`'s own regions for exactly that reason.
 */
export function cardStrings(session: Session): string[] {
    const program = programOf(session.code)
    return [
        WORDMARK,
        program?.quote ?? "",
        program === null ? PUBLISHER : `${PUBLISHER}, on ${program.name}`,
        "worked",
        "not worked",
        PROVENANCE[workedBy(session).shading],
        session.code,
        session.progressionCounter,
    ]
}

/**
 * THE CARD, AS ONE HTML STRING WITH EVERY STYLE INLINE.
 *
 * Inline rather than a stylesheet because the card has exactly two consumers and neither can use
 * one: `/design` embeds this into a page whose own sheet must not reach in, and the renderer
 * screenshots it with no sheet at all. A `<style>` block would also make the specimen's rules
 * global to `/design`, which is a class of bug this repository has a gate for.
 *
 * THE DATE AND THE PROGRAM NAME APPEAR ON NEITHER SURFACE. The platform prints the date above the
 * photo, and the activity's own title already carries the program — printing either here would be
 * the card competing with its own container.
 */
export function cardHtml(session: Session, options: {theme: string}): string {
    const ink = palette(options.theme)
    const font = fontStack()
    const {slugs, shading} = workedBy(session)
    const lit = new Set(slugs)
    const map = bodyMapSvg({
        front: new Set([...lit].filter((slug) => FRONT_SLUGS.has(slug))),
        back: new Set([...lit].filter((slug) => BACK_SLUGS.has(slug))),
        colours: {fillOn: ink.ink, fillOff: ink.track, outline: ink.text},
        px: MAP_PX,
    })
    return `<div style="width:${CARD_PX}px;height:${CARD_PX}px;box-sizing:border-box;`
        + `background:${ink.ground};padding:${CARD_PADDING_PX}px;display:flex;flex-direction:column;`
        + `gap:${REGION_GAP_PX}px;font-family:${font}">`
        + chip(ink, font)
        + hero(session, ink, font)
        + `<div style="flex-grow:1;display:flex;align-items:center;justify-content:center;`
        + `min-height:0">${map}</div>`
        + footer(session, shading, ink, font)
        + `</div>`
}
