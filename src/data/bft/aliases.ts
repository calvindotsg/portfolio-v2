/**
 * THE STUDIO'S PUBLISHED MOVEMENT VOCABULARY, MAPPED ONTO MUSCLE SLUGS — BY HAND, AND THE HAND IS
 * THE POINT.
 *
 * Fuzzy-matching these labels against a published 873-exercise catalogue was measured on
 * 2026-09-02 and rejected: 13 hits against 26 misses, with `Seated Bike` matching "Seated Biceps"
 * and a bare `PRESS` matching "JM Press". Both of those are confidently wrong rather than
 * absent, which is the failure mode that makes a fuzzy table worse than no table — a card shades
 * biceps for a cycling station and nobody reading it can tell.
 *
 * THREE OUTCOMES, AND THE THIRD IS A REFUSAL RATHER THAN A GUESS:
 *
 *   - `mapped` — a movement whose worked muscles are known.
 *   - `excluded` — prose, equipment or timing that the label extractor swept up. It contributes
 *     nothing and is named here so a reader can see the exclusion was a decision.
 *   - `unmapped` — a real movement nobody has mapped yet. THE SESSION FALLS BACK TO FORMAT-LEVEL
 *     SHADING AND THE CARD PRINTS THAT IT DID. It may never guess, and that refusal is the whole
 *     reason this table exists: building it proved the hand-shaded mockups were wrong in BOTH
 *     directions, inventing trapezius and missing biceps and triceps.
 *
 * PORTED FROM `bft_card_lib/bft_aliases.py` and the vocabulary file beside it, both in a
 * declared-disposable proof of concept that is not kept in sync. THE PORT WAS VERIFIED RATHER
 * THAN ASSUMED: resolving all 240 observed labels through both implementations returned identical
 * status and identical slugs for every one.
 *
 * THIS TABLE NOW SERVES THE DESIGN, NOT PRODUCTION (2026-09-27). Real cards are drawn by the
 * training wiki, which keeps its own alias table and its own corpus of observed labels. The real
 * labels this module used to carry were removed with the renderer that consumed them; what stays
 * is what the `/design` specimen and `tests/share-card.test.ts` need to shade a session.
 */

/** The muscle slugs the map can light — `src/lib/anatome/`'s set minus its non-muscle regions. */
export const VALID_SLUGS: ReadonlySet<string> = new Set([
    "abs", "adductors", "biceps", "calves", "chest", "deltoids", "forearm", "gluteal",
    "hamstring", "lower-back", "neck", "obliques", "quadriceps", "tibialis", "trapezius",
    "triceps", "upper-back",
])

/** Movement patterns several labels share. Named so a correction lands in one place. */
const HINGE = ["hamstring", "gluteal", "lower-back"]
const PULL = ["upper-back", "biceps", "forearm", "trapezius"]
const OHP = ["deltoids", "triceps", "trapezius", "abs"]
const HPRESS = ["chest", "deltoids", "triceps"]
const SQUAT = ["quadriceps", "gluteal", "adductors", "abs"]
const CARRY = ["forearm", "trapezius", "abs", "obliques", "gluteal", "quadriceps"]
const OLY = ["hamstring", "gluteal", "quadriceps", "trapezius", "deltoids", "lower-back", "forearm"]
const RUN = ["quadriceps", "hamstring", "gluteal", "calves", "tibialis"]
const CYCLE = ["quadriceps", "hamstring", "gluteal", "calves"]
const ROPE = ["deltoids", "forearm", "abs", "upper-back"]
const JUMP = ["quadriceps", "gluteal", "hamstring", "calves"]
const LUNGE = ["quadriceps", "gluteal", "hamstring", "adductors"]
const THRUST = ["quadriceps", "gluteal", "deltoids", "triceps", "abs"]

const MAP: Readonly<Record<string, readonly string[]>> = {
    // --- machines and conditioning ---
    "ski erg": ["upper-back", "triceps", "abs", "deltoids", "lower-back"],
    skierg: ["upper-back", "triceps", "abs", "deltoids", "lower-back"],
    rower: ["quadriceps", "hamstring", "gluteal", "upper-back", "biceps", "lower-back", "abs"],
    bike: CYCLE,
    "bike seated": CYCLE,
    "seated bike": CYCLE,
    "keiser bike": CYCLE,
    // The bionic bike has driving arm levers — athlete-confirmed 2026-09-02, which is why it is
    // the one cycling station carrying upper-body groups.
    "bionic bike": [...CYCLE, "deltoids", "upper-back", "chest"],
    "out of seat climbing": ["quadriceps", "gluteal", "calves", "hamstring"],
    sprinting: RUN,
    running: RUN,
    "running on track": RUN,
    "track running": RUN,
    jogging: RUN,
    "mid grip jog": RUN,
    skipping: ["calves", "tibialis", "quadriceps", "forearm"],
    "double unders": ["calves", "tibialis", "quadriceps", "forearm"],
    "sled run": ["quadriceps", "gluteal", "calves", "hamstring"],
    sleds: ["quadriceps", "gluteal", "calves", "hamstring"],
    "battle rope": ROPE,
    "rope alt wave big": ROPE,
    "rope dbl wave big": ROPE,
    "rope alt 5 l 5 r wave big": ROPE,
    "battle rope / burpee combo": [...ROPE, "quadriceps", "gluteal", "chest"],

    // --- squat pattern ---
    "front squat": SQUAT,
    "kb front squat": SQUAT,
    "goblet squat": SQUAT,
    "bb zercher squat": SQUAT,
    "zercher squat": SQUAT,
    "deadball squat": SQUAT,
    "torsonator hack squat": ["quadriceps", "gluteal", "adductors"],
    "sprinter squat": ["quadriceps", "gluteal", "hamstring", "adductors"],
    "db sprinter squat": ["quadriceps", "gluteal", "hamstring", "adductors"],
    "db front squat paired with box jump": [...SQUAT, "calves"],

    // --- hinge pattern ---
    deadlift: [...HINGE, "upper-back", "trapezius", "forearm", "quadriceps"],
    "bb conventional deadlift": [...HINGE, "upper-back", "trapezius", "forearm", "quadriceps"],
    "trap bar deadlift": [...HINGE, "upper-back", "trapezius", "forearm", "quadriceps"],
    "snatch grip deadlift": [...HINGE, "upper-back", "trapezius", "forearm"],
    "snatch grip deficit deadlift": [...HINGE, "upper-back", "trapezius", "forearm"],
    "snatch grip rdl": [...HINGE, "upper-back", "trapezius", "forearm"],
    "snatch grip rdl paired with double kb cleans": OLY,
    rdl: HINGE,
    "db rdl": HINGE,
    "kb romanian deadlift": HINGE,
    "db split stance rdl": HINGE,
    "cable db split stance rdl": HINGE,
    "good morning": HINGE,
    arabesque: [...HINGE, "abs"],

    // --- lunge and carry ---
    "reverse lunge": LUNGE,
    "alt bkwd lunge": LUNGE,
    "db reverse lunge l racked": [...LUNGE, "abs"],
    "powerbag lunge": LUNGE,
    "side lunge": ["quadriceps", "gluteal", "adductors"],
    "cossack lunge": ["quadriceps", "gluteal", "adductors"],
    "step up": ["quadriceps", "gluteal", "hamstring", "calves"],
    "reverse lunge with rotation": [...LUNGE, "obliques", "abs"],
    "powerbag forward lunge with rotation": [...LUNGE, "obliques", "abs"],
    "rotational and curtsy lunge": ["quadriceps", "gluteal", "adductors", "obliques", "abs"],
    "alt contra lunge press": [...LUNGE, "deltoids", "triceps"],
    "step up row": ["quadriceps", "gluteal", "hamstring", "calves", "upper-back", "biceps"],
    "rack walk": CARRY,
    "rack walk l": CARRY,
    "kb rack walk": CARRY,
    "rack walk / loaded carry": CARRY,
    "farmer's carry": CARRY,
    "loaded carries": CARRY,

    // --- vertical press ---
    "bb military press": OHP,
    "shoulder press": OHP,
    "sh press": OHP,
    "seated shoulder press": OHP,
    "arnold press": OHP,
    "kneeling arnold press": OHP,
    "double kb shoulder press": OHP,
    "push press": OHP,
    "kb push press": OHP,
    "single arm press": [...OHP, "obliques"],
    "bottoms up press": [...OHP, "forearm"],
    "db shoulder press paired with push press": OHP,
    // A bare `PRESS` is a dumbbell flat bench press. The label was ambiguous; it was resolved
    // from the tile image on the studio's own card and confirmed by the athlete, 2026-09-02.
    press: HPRESS,

    // --- horizontal press ---
    "bench press": HPRESS,
    "db bench press": HPRESS,
    "incline bench press": HPRESS,
    "dumbbell incline bench press": HPRESS,
    "incline press": HPRESS,
    dips: ["chest", "triceps", "deltoids"],
    "single leg push up": ["chest", "triceps", "deltoids", "abs"],
    "push up with power bag pull through": ["chest", "triceps", "deltoids", "abs", "obliques"],
    "db fly": ["chest", "deltoids"],

    // --- pull ---
    "chin up": ["upper-back", "biceps", "forearm", "abs"],
    "incline row": PULL,
    "gorilla row": PULL,
    "db bent over row": PULL,
    "torsonator row": PULL,
    rows: PULL,
    "kb renegade row": [...PULL, "abs"],
    "single arm row": [...PULL, "obliques"],
    "upright row": ["deltoids", "trapezius", "biceps"],
    "pull overs": ["upper-back", "chest", "triceps"],
    "reverse flys": ["deltoids", "upper-back", "trapezius"],
    "bicep curl": ["biceps", "forearm"],

    // --- olympic and ballistic ---
    "clean r": OLY,
    "sa kb clean": OLY,
    "single arm kb clean": OLY,
    "burpee clean": [...OLY, "chest"],
    "kb snatch": OLY,
    "kb swing": [...HINGE, "abs", "deltoids", "forearm"],
    "kb swings": [...HINGE, "abs", "deltoids", "forearm"],
    swing: [...HINGE, "abs", "deltoids", "forearm"],
    slam: ["abs", "obliques", "deltoids", "upper-back", "lower-back"],
    thruster: THRUST,
    "dead ball thruster": THRUST,
    "devil press": ["deltoids", "triceps", "chest", "quadriceps", "gluteal", "abs"],
    "wall ball": THRUST,
    "wall balls": THRUST,
    "box jump": JUMP,
    "step jump l": JUMP,
    "trx squat jump": JUMP,

    // --- core ---
    "dead bug": ["abs"],
    "l sit": ["abs", "forearm", "quadriceps"],
    "plank jackknife with shoulder taps": ["abs", "obliques", "deltoids"],
    "side plank with rotation": ["obliques", "abs", "deltoids"],
    "kneeling iron cross": ["abs", "obliques", "deltoids"],
    windmill: ["obliques", "abs", "deltoids", "hamstring"],
    "hip switches": ["abs", "obliques", "adductors"],
}

/**
 * SWEPT UP BY THE LABEL EXTRACTOR AND NOT MOVEMENTS. Each is named with the reason, so a future
 * reader can see the exclusion was a decision rather than an oversight — an unnamed exclusion and
 * an unmapped movement look identical from the outside and mean opposite things.
 */
export const NOT_A_MOVEMENT: Readonly<Record<string, string>> = {
    "30 second efforts": "a work interval, not a movement",
    "3:40 per station": "a station duration",
    "lateral movement patterns": "a category the post names without listing movements",
    track: "a place; 'track running' is the movement",
    "trap bar": "equipment; 'trap bar deadlift' is the movement",
}

/** Variant spellings, folded onto the canonical key the table is written against. */
const ALIASES: Readonly<Record<string, string>> = {
    "snatch grip deadlift (introduced this week)": "snatch grip deadlift",
    "kb swings": "kb swing",
    "wall balls": "wall ball",
    skierg: "ski erg",
    "bike seated": "seated bike",
    "sa kb clean": "single arm kb clean",
    "sh press": "shoulder press",
    sleds: "sled run",
    rows: "single arm row",
}

/** What {@link resolve} decided about a label. */
export type ResolveStatus = "mapped" | "excluded" | "unmapped"

/**
 * THE PUBLISHED LABEL WITH EDITORIAL ASIDES STRIPPED, for printing.
 *
 * The source writes things like `snatch-grip deadlift (introduced this week)`; the parenthetical
 * is the coach's note about the week, not part of the movement's name, and a card that printed it
 * would be quoting an aside as a station.
 */
export function canonical(label: string): string {
    return label.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim().replace(/^[.,;:—-]+|[.,;:—-]+$/g, "")
}

/**
 * ONE LABEL -> ITS SLUGS AND WHAT WAS DECIDED.
 *
 * THE NORMALISATION IS THE PART THAT BROKE ONCE AND IS WORTH READING. It has to match whatever
 * produced the labels in the first place: in the proof of concept the extractor spaced a slash
 * and this function did not, so `battle rope/burpee combo` resolved as unmapped in the real
 * pipeline while the table's own unit test — which reads pre-normalised keys — passed. The
 * integration gate caught it; the unit gate could not. A table checked only against its own keys
 * cannot see that class of defect, which is why the corpus of real labels is the gate wherever
 * real cards are drawn.
 */
export function resolve(label: string): {slugs: readonly string[], status: ResolveStatus} {
    let key = label.toLowerCase().replace(/-/g, " ").replace(/’/g, "'").replace(/\//g, " / ")
    key = key.replace(/\s+/g, " ").trim().replace(/^[.;:—-]+|[.;:—-]+$/g, "")
    key = key.replace(/\bups\b/g, "up").replace(/\bcurls\b/g, "curl")
        .replace(/\bjumps\b/g, "jump").replace(/\bsquats\b/g, "squat")
        .replace(/\blunges\b/g, "lunge").replace(/\bropes\b/g, "rope")
        .replace(/\bwaves\b/g, "wave")
    key = ALIASES[key] ?? key
    if (key in NOT_A_MOVEMENT) return {slugs: [], status: "excluded"}
    const found = MAP[key]
    if (found) {
        const bad = found.filter((slug) => !VALID_SLUGS.has(slug))
        if (bad.length) {
            throw new Error(
                `${key} maps to slugs the vendored anatomy does not have: ${bad.join(", ")}. `
                + "It would light nothing and the card would draw a body with a group silently "
                + "missing.",
            )
        }
        return {slugs: [...new Set(found)].sort(), status: "mapped"}
    }
    return {slugs: [], status: "unmapped"}
}
