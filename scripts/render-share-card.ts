/**
 * REFUSE TO PUBLISH ANYTHING THE PUBLISHER DID NOT PUBLISH.
 *
 * 🔴 THIS IS A REFUSAL, NOT A SCRUBBER. It raises rather than silently removing, because a card
 * or a description that quietly lost a clause is worse than one that never shipped: nobody
 * reviews what was removed.
 *
 * The risk is concrete rather than hypothetical. Both surfaces bind FREE PROSE out of a private
 * training record — `note`, `progressionNote` and `intensity` on {@link Session} — so anything a
 * future editor types into one of those cells reaches a public post.
 *
 * WHY THIS LIVES ON THE SCRIPT AND NOT IN `src/lib/share-card.ts`. The `/design` specimen is
 * invented and cannot leak, and a site build that required the list below would fail on any
 * machine that does not have it — every CI runner included. The refusal belongs on the path that
 * renders REAL sessions, which is this file and only this file.
 *
 * NAMES CANNOT BE CAUGHT BY PATTERN. They need a list, and the list is deliberately NOT in this
 * repository: it lives outside it, git-ignored, so it can never be committed anywhere. If that
 * file is absent this module says so out loud rather than reporting a clean scan.
 *
 * Ported from `bft_card_lib/redact.py`, in a declared-disposable proof of concept that is not
 * kept in sync. `tests/share-card-redaction.test.ts` carries its mutation harness.
 */

import {existsSync, readFileSync} from "node:fs"
import {homedir} from "node:os"
import {join} from "node:path"

import {cardStrings, shareDescription, type Session} from "../src/lib/share-card"

/** Where the protected-name list lives, outside every repository and git-ignored where it sits. */
export const PROTECTED_LIST = join(
    homedir(), "Documents/github/calvindotsg/training-sources/tools/protected.txt",
)

/**
 * WHAT MAY NOT BE PUBLISHED, BY PATTERN.
 *
 * MONEY NEEDS A CURRENCY MARKER. A bare two- or three-digit number is a session code, a rep count
 * or a date here, so matching those plainly would refuse nearly every legitimate card — which is
 * a guard people learn to switch off rather than one that catches anything.
 */
export const PATTERNS: readonly (readonly [string, RegExp])[] = [
    ["money", /(?:\b(?:sgd|usd|aud)\b|\bs?\$)\s*\d/gi],
    ["money-word", /\b(?:fortnight|fortnightly|monthly)\s+(?:rate|fee|payment)/gi],
    ["membership", /\b(?:membership|direct debit|minimum term|joining fee|lock[- ]in|contract term|cancellation fee|referral (?:credit|bonus))\b/gi],
    ["hrv", /\b(?:hrv|heart[- ]rate variability|rmssd|sdnn)\b/gi],
    ["body-comp", /\b(?:body fat|skeletal muscle mass|visceral|evolt|bmi|fat mass|body composition)\b/gi],
    ["weight", /\b\d{2,3}(?:\.\d)?\s?kg\b(?!\s*(?:plate|bar|ball|bag))/gi],
]

/** What a refusal is. It is thrown; there is no code path that returns a scrubbed string. */
export class LeakRefusal extends Error {
    constructor(message: string) {
        super(message)
        this.name = "LeakRefusal"
    }
}

/** One thing that matched, and which class it matched as. */
export type Finding = {kind: string, matched: string}

/**
 * THE PROTECTED NAMES, AND WHETHER THE LIST COULD BE CONSULTED AT ALL.
 *
 * `available: false` is not "no names" — it is "nobody looked", and every caller has to treat the
 * two differently or an absent file reads as a clean scan.
 */
export function protectedNames(): {names: Set<string>, available: boolean} {
    if (!existsSync(PROTECTED_LIST)) return {names: new Set(), available: false}
    const names = new Set<string>()
    for (const raw of readFileSync(PROTECTED_LIST, "utf8").split("\n")) {
        const line = raw.trim()
        if (!line || line.startsWith("#")) continue
        // Entries may be written `kind: value`; the value is what must not be published.
        const value = line.includes(":") ? line.slice(line.indexOf(":") + 1).trim() : line
        if (value.length >= 3) names.add(value.toLowerCase())
    }
    return {names, available: true}
}

/** Everything that matched in one string. An empty list means nothing matched — not that it is safe. */
export function scan(text: string, options: {
    names: ReadonlySet<string>
    patterns?: boolean
    nameCheck?: boolean
}): Finding[] {
    const {names, patterns = true, nameCheck = true} = options
    const found: Finding[] = []
    if (patterns) {
        for (const [kind, rx] of PATTERNS) {
            for (const m of (text ?? "").matchAll(rx)) found.push({kind, matched: m[0]})
        }
    }
    if (nameCheck) {
        const low = (text ?? "").toLowerCase()
        for (const name of names) if (low.includes(name)) found.push({kind: "protected-name", matched: name})
    }
    return found
}

/** Everything, over text that WILL be published. */
export const scanPublished = (text: string, names: ReadonlySet<string>) => scan(text, {names})

/**
 * 🔴 NAMES ONLY, over source fields this renderer does not currently publish.
 *
 * WHY THE TWO CLASSES DIFFER IN REACH, measured rather than assumed:
 *
 * A protected name is another person who did not agree to be anywhere near this. It cannot be
 * caught downstream, and it is the one class where the harm lands on somebody other than the
 * author. So it is refused wherever it appears in the source record, even in a field no layout
 * binds today — because "no layout binds it today" is an accident of the layout rather than a
 * guarantee.
 *
 * The pattern classes are the author's OWN data. Scanning unpublished fields for them refuses
 * real cards over content that provably never leaves: one week's calendar column carried a body
 * composition scan's name, which blocked 2 of 90 legitimate sessions. A guard that cries wolf on
 * 2% of a corpus is one people learn to switch off, so those are scanned over what is actually
 * published, and there only.
 */
export const scanSource = (text: string, names: ReadonlySet<string>) =>
    scan(text, {names, patterns: false, nameCheck: true})

/**
 * EVERY STRING IN THE SESSION RECORD, whether or not today's renderer binds it.
 *
 * 🔴 Scanning only the bound fields makes the guard depend on which fields the layout happens to
 * use. A name typed into a "what it is, as published" cell reaches a public surface ONLY for
 * sessions with no format quote — so a field-by-field guard would pass eighty-nine times and leak
 * on the ninetieth. Scan the record.
 */
export function recordText(session: Session): string {
    const out: string[] = []
    for (const value of Object.values(session as Record<string, unknown>)) {
        if (typeof value === "string") out.push(value)
        else if (Array.isArray(value)) out.push(...value.filter((v): v is string => typeof v === "string"))
    }
    return out.join("\n")
}

/**
 * THE GATE BOTH SURFACES PASS THROUGH. It throws or it returns; there is no third outcome and no
 * scrubbed string.
 *
 * `requireNames` defaults on. Turning it off is for a caller that has already established the
 * list is unavailable and is deliberately proceeding — which nothing in this repository does.
 */
/**
 * BOTH SURFACES AS PUBLISHED TEXT — the card's own words and the description, and NOT the card's
 * markup. See `cardStrings` in `src/lib/share-card.ts` for the measurement that forced the
 * distinction: the card embeds an anatomical drawing, so scanning its HTML scans tens of
 * thousands of path coordinates and a short protected value matches one immediately.
 */
export function publishedText(session: Session): string {
    return [...cardStrings(session), shareDescription(session)].join("\n")
}

export function assertPublishable(session: Session, published: string, options?: {
    names?: ReadonlySet<string>
    namesAvailable?: boolean
    requireNames?: boolean
    where?: string
}): void {
    const supplied = options?.names !== undefined
    const {names, available} = supplied
        ? {names: options!.names!, available: options?.namesAvailable ?? true}
        : protectedNames()
    const where = options?.where ?? "this surface"
    if ((options?.requireNames ?? true) && !available) {
        throw new LeakRefusal(
            `refusing to publish ${where} — the protected-name list is absent (${PROTECTED_LIST}), `
            + "so names were not checked. A clean pattern scan is not evidence of a clean surface.",
        )
    }
    const onSurface = scanPublished(published, names)
    if (onSurface.length) {
        throw new LeakRefusal(`refusing to publish ${where} — `
            + onSurface.map((f) => `${f.kind}: ${JSON.stringify(f.matched)}`).join("; "))
    }
    const inRecord = scanSource(recordText(session), names)
    if (inRecord.length) {
        throw new LeakRefusal(
            `refusing to publish ${where} — a protected name appears in the source record `
            + `(${inRecord.map((f) => f.matched).join("; ")}). It is not on the rendered surface, `
            + "but the record it was built from carries it.",
        )
    }
}
