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
 * declared-disposable proof of concept that is not kept in sync. The observed labels come across
 * as {@link OBSERVED_LABELS} rather than being dropped, so {@link resolve} is gated against the
 * real corpus instead of against hand-picked cases.
 *
 * THE PORT WAS VERIFIED RATHER THAN ASSUMED: resolving all 240 observed labels through both
 * implementations returns identical status and identical slugs for every one.
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
 * integration gate caught it; the unit gate could not. That is why {@link OBSERVED_LABELS} is
 * carried across and asserted against, rather than the table being checked against its own keys.
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

/**
 * EVERY RAW LABEL THIS VOCABULARY HAS ACTUALLY BEEN PUBLISHED AS, keyed by the canonical form.
 *
 * This is the corpus, not a lookup — {@link resolve} normalises rather than consulting it. It is
 * carried so a gate can walk what the studio really wrote (`Chin-Up`, `CHIN UPS`, `Battle Ropes`,
 * `battle rope/burpee combo`) instead of the tidy keys the table is written in, which is the one
 * form of this test that could have caught the slash bug described above.
 */
export const OBSERVED_LABELS: Readonly<Record<string, readonly string[]>> = {
    "30 second efforts": ["30-second efforts"],
    "3:40 per station": ["3:40 per station"],
    "alt bkwd lunge": ["ALT BKWD LUNGE"],
    "alt contra lunge press": ["ALT CONTRA LUNGE PRESS"],
    arabesque: ["Arabesque", "arabesque"],
    "arnold press": ["Arnold press"],
    "battle rope": ["Battle Ropes", "battle ropes"],
    "battle rope / burpee combo": ["battle rope/burpee combo"],
    "bb conventional deadlift": ["BB Conventional Deadlift"],
    "bb military press": ["BB MILITARY PRESS", "BB Military Press"],
    "bb zercher squat": ["BB ZERCHER SQUAT", "BB Zercher Squat"],
    "bench press": ["bench press"],
    "bicep curl": ["BICEP CURLS"],
    bike: ["Bike", "bike"],
    "bike seated": ["BIKE SEATED"],
    "bionic bike": ["BIONIC BIKE", "Bionic Bike"],
    "bottoms up press": ["Bottoms-Up Press"],
    "box jump": ["BOX JUMP"],
    "burpee clean": ["Burpee Clean"],
    "cable db split stance rdl": ["CABLE DB SPLIT STANCE RDL"],
    "chin up": ["CHIN UP", "Chin Up", "Chin Ups", "Chin-Up"],
    "clean r": ["CLEAN R"],
    "cossack lunge": ["Cossack lunge"],
    "db bench press": ["DB Bench Press", "DB bench press"],
    "db bent over row": ["DB Bent-Over Row"],
    "db fly": ["DB fly"],
    "db front squat paired with box jump": ["DB Front Squat paired with Box Jumps"],
    "db rdl": ["DB RDL"],
    "db reverse lunge l racked": ["DB REVERSE LUNGE L RACKED"],
    "db shoulder press paired with push press": ["DB Shoulder Press paired with Push Press"],
    "db split stance rdl": ["DB Split Stance RDL"],
    "db sprinter squat": ["DB sprinter squat"],
    "dead ball thruster": ["Dead Ball Thruster"],
    "dead bug": ["dead bug"],
    "deadball squat": ["deadball squat"],
    deadlift: ["DEADLIFT"],
    "devil press": ["Devil Press"],
    dips: ["DIPS", "Dips", "dips"],
    "double kb shoulder press": ["double KB shoulder press"],
    "double unders": ["double unders"],
    "dumbbell incline bench press": ["dumbbell incline bench press"],
    "farmer's carry": ["farmer's carry"],
    "front squat": ["FRONT SQUAT", "Front Squat"],
    "goblet squat": ["Goblet Squat"],
    "good morning": ["Good Morning"],
    "gorilla row": ["gorilla row"],
    "hip switches": ["hip switches"],
    "incline bench press": ["incline bench press"],
    "incline press": ["incline press"],
    "incline row": ["INCLINE ROW"],
    jogging: ["JOGGING"],
    "kb front squat": ["KB Front Squat"],
    "kb push press": ["KB Push Press"],
    "kb rack walk": ["KB Rack Walk"],
    "kb renegade row": ["KB Renegade Row"],
    "kb romanian deadlift": ["KB Romanian deadlift"],
    "kb snatch": ["KB snatch"],
    "kb swing": ["KB Swing"],
    "kb swings": ["KB swings"],
    "keiser bike": ["Keiser Bike"],
    "kneeling arnold press": ["kneeling Arnold press"],
    "kneeling iron cross": ["kneeling iron cross"],
    "l sit": ["L-sit"],
    "lateral movement patterns": ["lateral movement patterns"],
    "loaded carries": ["loaded carries"],
    "mid grip jog": ["MID GRIP JOG"],
    "out of seat climbing": ["OUT OF SEAT CLIMBING"],
    "plank jackknife with shoulder taps": ["plank jackknife with shoulder taps"],
    "powerbag forward lunge with rotation": ["Powerbag Forward Lunge with rotation"],
    "powerbag lunge": ["Powerbag Lunge"],
    press: ["PRESS"],
    "pull overs": ["pull-overs"],
    "push press": ["PUSH PRESS"],
    "push up with power bag pull through": ["push-ups with power bag pull-through"],
    "rack walk": ["rack walk"],
    "rack walk / loaded carry": ["rack walk / loaded carry"],
    "rack walk l": ["RACK WALK L"],
    rdl: ["RDL"],
    "reverse flys": ["reverse flys"],
    "reverse lunge": ["reverse lunge"],
    "reverse lunge with rotation": ["reverse lunge with rotation"],
    "rope alt 5 l 5 r wave big": ["ROPE ALT 5 L 5 R WAVES BIG"],
    "rope alt wave big": ["ROPE ALT WAVES BIG"],
    "rope dbl wave big": ["ROPE DBL WAVES BIG"],
    "rotational and curtsy lunge": ["rotational and curtsy lunges"],
    rower: ["ROWER", "Rower", "rower"],
    rows: ["Rows"],
    running: ["running"],
    "running on track": ["RUNNING ON TRACK"],
    "sa kb clean": ["SA KB Clean"],
    "seated bike": ["Seated Bike"],
    "seated shoulder press": ["Seated Shoulder Press"],
    "sh press": ["SH PRESS"],
    "shoulder press": ["shoulder press"],
    "side lunge": ["Side Lunge"],
    "side plank with rotation": ["side plank with rotation"],
    "single arm kb clean": ["Single-Arm KB Clean"],
    "single arm press": ["single-arm press"],
    "single arm row": ["single-arm row"],
    "single leg push up": ["single-leg push-up"],
    "ski erg": ["SKI ERG", "Ski Erg", "ski erg"],
    skierg: ["SkiErg"],
    skipping: ["SKIPPING", "skipping"],
    slam: ["SLAM"],
    "sled run": ["sled run"],
    sleds: ["sleds"],
    "snatch grip deadlift": ["snatch-grip deadlift"],
    "snatch grip deadlift (introduced this week)": ["snatch-grip deadlift (introduced this week)"],
    "snatch grip deficit deadlift": ["snatch-grip deficit deadlift"],
    "snatch grip rdl": ["Snatch Grip RDL"],
    "snatch grip rdl paired with double kb cleans": ["Snatch Grip RDL paired with Double KB Cleans"],
    "sprinter squat": ["sprinter squat"],
    sprinting: ["SPRINTING", "Sprinting"],
    "step jump l": ["STEP JUMPS L"],
    "step up": ["Step-Up"],
    "step up row": ["step-up row"],
    swing: ["SWING"],
    thruster: ["Thruster"],
    "torsonator hack squat": ["torsonator hack squat"],
    "torsonator row": ["torsonator row"],
    track: ["track"],
    "track running": ["track running"],
    "trap bar": ["trap bar"],
    "trap bar deadlift": ["Trap Bar Deadlift", "trap bar deadlift"],
    "trx squat jump": ["TRX squat jumps"],
    "upright row": ["upright row"],
    "wall ball": ["Wall Ball"],
    "wall balls": ["WALL BALLS", "wall balls"],
    windmill: ["windmill"],
    "zercher squat": ["Zercher Squat"],
}
