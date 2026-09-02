/**
 * THE STUDIO'S PUBLISHED PROGRAM TYPES, AND THE TWO KINDS OF FACT THIS FILE HOLDS.
 *
 * They are kept apart deliberately, because one of them may not be edited and the other is this
 * repository's own reading:
 *
 *   - {@link FORMAT_QUOTES} is QUOTED THIRD-PARTY PROSE. It is the publisher's own one-line
 *     description of each program, read off their site on {@link FORMATS_READ_DATE}. It is
 *     attributed on the card, it is the card's hero, and it MAY NOT BE PARAPHRASED — a
 *     tightened sentence attributed to somebody else is a misquote however much better it
 *     reads.
 *   - {@link FORMAT_MUSCLES} is DERIVED, and the card says so in as many words when it falls
 *     back to it. It is coarse by construction: a program type says what a session is for, not
 *     which movements the coach chose that day, so shading from it is honest only while the card
 *     prints the sentence admitting that is what it did.
 *
 * RE-READING THE PUBLISHER'S PAGE IS A MAINTAINER TASK, NEVER A BUILD STEP, and the read date is
 * carried for the reason a training wiki carries one: a stale programme page is worse than none,
 * because nothing about it looks stale. Nothing here reaches the network.
 */

/** The day {@link FORMAT_QUOTES} was read off the publisher's own page. */
export const FORMATS_READ_DATE = "2026-08-31"

/** Where it was read. Recorded so a re-read starts from the same place a first read did. */
export const FORMATS_SOURCE = "bodyfittraining.com/sessions"

/** Who published the prose. The card cites this beside the quote; the description cites it too. */
export const PUBLISHER = "BFT"

/** The studio this site's sessions are prescribed by. Named in the description, not on the card. */
export const STUDIO = "BFT Yishun"

/**
 * ONE PROGRAM TYPE: the name the publisher gives it, and their own sentence about it.
 *
 * `name` is not always the key — the key is the prefix a session code carries (`Cardio U 170`),
 * and the name is what the publisher calls the program. Both are theirs.
 */
export type ProgramFormat = {
    /** The publisher's name for the program. */
    name: string
    /** The publisher's own one-line description. Quoted verbatim; see the head of this file. */
    quote: string
}

/**
 * THE FOURTEEN PUBLISHED PROGRAM TYPES. The keys are the prefixes a session code carries, which
 * is what makes {@link formatOf} a longest-prefix match rather than a lookup.
 */
export const FORMAT_QUOTES: Readonly<Record<string, ProgramFormat>> = {
    HIIT: {
        name: "Cardio HIIT",
        quote: "Train at an intensity only possible in short bursts. Simple, not easy.",
    },
    Summit: {name: "Cardio Summit", quote: "Working hard but not at max effort."},
    "Cardio U": {name: "Cardio U", quote: "Extended work periods with varying intensities."},
    Strength: {
        name: "Strength",
        quote: "Challenged to lift heavier weights, and because of that expect longer rest periods.",
    },
    Pump: {
        name: "Pump",
        quote: "A high-volume resistance session giving your muscles the ultimate pump through "
            + "isolation exercises.",
    },
    Hyper: {
        name: "Hyper",
        quote: "High volume, hypertrophy style, with form and function as the main focus.",
    },
    HIRT: {name: "H.I.R.T", quote: "Three different styles of training in one session."},
    Power: {name: "Power", quote: "Challenged through explosive movements at a fast pace."},
    XTX: {name: "XTX", quote: "Built around metabolic complexes and resistance training."},
    SE: {
        name: "Strength Endurance",
        quote: "Building lasting strength by combining resistance training with conditioning.",
    },
    Shred: {name: "Shred", quote: "The perfect mix of conditioning and strength training."},
    Balanced: {
        name: "Balanced",
        quote: "A full-body session designed to keep your body strong, stable, and balanced.",
    },
    Podium: {
        name: "Podium",
        quote: "A full-body strength and conditioning feat with a competitive edge.",
    },
    CrewFit: {name: "CrewFit", quote: "Teamwork is key. Equal parts synergy and performance."},
}

/**
 * FORMAT-LEVEL SHADING, WHICH IS DERIVED AND IS THE COARSE ANSWER.
 *
 * Sourced from the publisher's own catalogue, which describes the hypertrophy programs as
 * targeting "either upper and lower body muscle groups". The `LB` / `UB` / `M` suffixes are the
 * local coach's bookkeeping rather than a fifteenth program type, so they refine a program
 * rather than naming one.
 *
 * A CARD SHADED THIS WAY MUST PRINT THAT IT WAS. The whole licence for this map is the sentence
 * beside it: without it the card claims a measurement it did not make. See `PROVENANCE` in
 * `src/lib/share-card.ts`.
 */
const UB = ["chest", "deltoids", "triceps", "biceps", "upper-back", "trapezius", "forearm", "abs"]
const LB = ["quadriceps", "hamstring", "gluteal", "calves", "adductors", "lower-back", "abs"]
const FULL = [...new Set([...UB, ...LB])].sort()
const CONDITIONING = ["quadriceps", "hamstring", "gluteal", "calves", "tibialis", "abs",
    "deltoids", "upper-back"]

/** Which programs the suffix refines rather than merely decorates. */
const SUFFIXED = new Set(["Strength", "Pump", "Hyper", "HIRT"])

const SUFFIX_MUSCLES: Readonly<Record<string, readonly string[]>> = {
    UB, LB, M: FULL, MIXED: FULL,
}

const FORMAT_MUSCLES: Readonly<Record<string, readonly string[]>> = {
    HIIT: CONDITIONING,
    Summit: CONDITIONING,
    "Cardio U": CONDITIONING,
    CrewFit: CONDITIONING,
    XTX: FULL,
    SE: FULL,
    Shred: FULL,
    Balanced: FULL,
    Podium: FULL,
    Power: FULL,
    Strength: FULL,
    Pump: FULL,
    Hyper: FULL,
    HIRT: FULL,
}

/**
 * WHICH PROGRAM A SESSION CODE NAMES — LONGEST PREFIX FIRST, which is not a micro-optimisation.
 * `Cardio U 170` starts with neither `C` nor `Cardio` alone, and a shortest-first scan over these
 * keys would have to be lucky rather than correct.
 */
export function formatOf(code: string): string | null {
    const keys = Object.keys(FORMAT_QUOTES).sort((a, b) => b.length - a.length)
    return keys.find((key) => code.toUpperCase().startsWith(key.toUpperCase())) ?? null
}

/**
 * THE COARSE, HONEST SHADING FOR A SESSION WHOSE MOVEMENTS WERE NEVER PUBLISHED.
 *
 * Returns the empty list for a code naming no program, and that is the right answer rather than
 * a gap: a benchmark test names no format, so there is nothing to shade from and the card has to
 * say so instead of drawing a body it guessed.
 */
export function musclesFromFormat(code: string): readonly string[] {
    const format = formatOf(code)
    if (format === null) return []
    if (SUFFIXED.has(format)) {
        const rest = code.slice(format.length).trim()
        const suffix = /^(UB|LB|M|Mixed)\b/i.exec(rest)
        return suffix ? SUFFIX_MUSCLES[suffix[1]!.toUpperCase()]! : FULL
    }
    return FORMAT_MUSCLES[format] ?? []
}
