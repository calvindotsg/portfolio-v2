import stravaProgress from "../data/strava-progress.json"
import {GOAL_YEAR, type Goal, NEXT_RACE, type Sport} from "./constants"
import {EVENTS} from "../data/races"
import {type RaceEvent, raceKm, recordingsOf} from "./race"
import {BUILD_DATE} from "./today"

/**
 * WHAT THIS FILE REFUSES TO COMPUTE, and why that is the whole design.
 *
 * The obvious thing to put on a goal card is a projected year-end total:
 * `current + observed_pace * days_remaining + booked_race_km`. It is wrong, and it
 * is wrong in a way that reads as authoritative.
 *
 * THE DOUBLE COUNT. The owner had already ridden 318.72 km of races this year when
 * this was written, and those kilometres are inside the bot's `cycling_km`. So they
 * are already inside the observed pace, and adding the 1,143.98 km of BOOKED races
 * on top counts race riding twice. That single error is the entire source of the
 * "on track, +144 km" verdict the naive formula produces: strip it out and the same
 * projection reads 96 km SHORT.
 *
 * WHY NOT JUST FIX IT. Because the corrected models do not agree either. Removing
 * the past races from the pace gives 4,904 km; also accounting for the fact that a
 * nine-day tour REPLACES nine days of ordinary riding rather than adding to it
 * gives 4,810. Against a 5,000 km goal, three defensible models land on both sides
 * of the line — and the closest of them flips from "short" to "on track" after
 * 55 more kilometres, about six days' riding. A card that prints one of those
 * numbers is not reporting a fact about the year; it is reporting a modelling
 * choice, in the voice of a measurement.
 *
 * SO THE CARD SHOWS A REQUIRED RATE INSTEAD. `(goal - ridden - booked) / weeks
 * remaining` extrapolates nothing. It contains no pace term, so the composition of
 * what is already banked cannot corrupt it, and it claims nothing about what the
 * owner will do. It still carries the point the owner cared about — counting his
 * booked races is worth a large share of the rate the cycling card would otherwise
 * ask for — without a forecast.
 *
 * THE COMPARATOR RULE, if a pace is ever displayed beside this. It must be the
 * DE-RACED pace, never the observed one. The required rate already has future race
 * km subtracted; setting it next to an observed pace that still contains past race
 * km reimports the double count by juxtaposition, and the reader does the wrong
 * subtraction themselves. THE ORDERING IS THE RULE; THE GAPS MOVE — and the durable half
 * of it is that the DE-RACED pace is always the LOWER of the two, because it is the same
 * numerator less this year's races over the same weeks. Where the REQUIREMENT falls
 * relative to them is a fact about the year rather than a rule, and it is the class of
 * fact this file no longer states: `src/lib/derived-figures.md` states it at its
 * reference, and flips its own heading when a year stops demonstrating it.
 *
 * THE DE-RACED PACE IS THE ONE THAT NEEDS SAYING OUT LOUD, because it is the only figure
 * in the set that reads `EVENTS` for a race already RIDDEN: the banked kilometres less
 * this year's recorded races of that sport, over the same weeks the observed pace divides
 * by. It went stale once by exactly the term a reader would forget — a race recorded in
 * two parts, counted as one of them.
 *
 * NOT ONE OF THOSE FIGURES IS WRITTEN DOWN HERE ANY MORE, AND THAT IS THE FIX RATHER THAN
 * AN OMISSION. Each is a pure function of the bot's stamp and of `EVENTS`, so they rot on
 * a push that moves only the date and on any race edit at all — every figure in that block
 * except the ceiled required rate was wrong at once, with the suite green, because nothing
 * can check a digit typed into a comment. They
 * are generated instead, WITH THEIR DEFINITIONS, into `src/lib/derived-figures.md` by
 * `tests/derived-figures.test.ts`; change a race and `pnpm test -u` turns the re-derivation
 * into a diff. Read that file rather than quoting anything here as current — it states the
 * reference it is computed at, and what it therefore cannot claim about today.
 *
 * (The DOUBLE COUNT paragraph at the top keeps its numbers, and that is not special
 * pleading. It says "when this was written", and its figures are that moment's — the
 * measurement that settled the design, not a description of the calendar.)
 *
 * ---
 *
 * EVERYTHING HERE IS PURE AND TAKES `today` AS AN ARGUMENT. Nothing calls
 * `new Date()`; the clock is read once in `today.ts` and arrives here as a default
 * argument, so every assertion in the suite can still pin its own day.
 *
 * TWO CLOCKS, AND WHICH ONE A FUNCTION TAKES IS A STATEMENT ABOUT ITS QUESTION.
 * They were one clock until it emerged that one of them was not a clock at all.
 *
 *   `UPDATED_AT` — the bot's stamp — answers HOW FRESH THE KILOMETRES ARE, and every
 *   function whose arithmetic touches them keeps it: {@link goalStatus},
 *   {@link goalStatusLine}, {@link formatDateline}. The suite adds one more reader of
 *   the stamp — the assertion that its YEAR matches `GOAL_YEAR`, which lives in
 *   tests/projection.test.ts rather than here because it is a claim ABOUT the data
 *   rather than a step in rendering it.
 *   The reason is unchanged and still load-bearing: the required rate divides a
 *   deficit by the days left, and a fresh clock divided into stale distance
 *   over-states the rate. Numerator and denominator must age together.
 *
 *   `BUILD_DATE` — the Singapore day this build ran — answers WHAT DAY IT IS, and the
 *   calendar questions take it: {@link patchState}, {@link patchWall},
 *   {@link patchesEarned}, {@link nextRace}. Whether a race has been run is not a fact
 *   about kilometre freshness, and answering it from the stamp meant the wall and the
 *   countdown froze for as long as the owner rested — see the measurement in
 *   `today.ts`.
 *
 * {@link bookedAhead} takes neither: it has no default, because it is called by both
 * sides and must be handed the caller's own day rather than quietly pick one.
 *
 * This module deliberately lives outside `constants.ts`: that file is imported by
 * `uno.config.ts`, and arithmetic there would be evaluated during CSS generation.
 */

/** The bot's stamp: the day the kilometres last MOVED, not the day they were last checked. */
export const UPDATED_AT: string = stravaProgress.updated_at

const MS_PER_DAY = 86_400_000
const DAYS_PER_WEEK = 7

/** `YYYY-MM-DD` -> UTC midnight. Returns NaN for anything that is not a real date. */
export function parseIsoDate(iso: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NaN
    const ms = Date.parse(`${iso}T00:00:00Z`)
    if (Number.isNaN(ms)) return NaN
    // `Date.parse` normalises rather than rejects: "2026-02-30" silently becomes
    // 2 March. Round-trip it so an impossible day fails instead of shifting.
    return new Date(ms).toISOString().slice(0, 10) === iso ? ms : NaN
}

/**
 * THE ONE SCOPE RULE ON THIS SITE, AND EVERY DEFAULT BELOW IS AN APPLICATION OF IT:
 *
 *     the patch wall is the WHOLE calendar; a goal card is GOAL_YEAR alone.
 *
 * It did not need saying while {@link EVENTS} held one year — "every race" and "this
 * year's races" were the same list, so no function had to choose. The wall keeps every
 * race the owner has entered now, which makes them different lists, and the difference
 * is not cosmetic. A race that has not been run is `booked` whatever year it is in, so
 * without this split {@link bookedAhead} subtracts a race booked for NEXT November from
 * THIS year's deficit: the 1,022 km Formosa tour alone takes the cycling card from
 * "71 km/wk to go" to "Races cover it", silently, under a heading that says this year.
 *
 * So the five functions a GOAL CARD reads — {@link bookedAhead}, {@link goalStatus},
 * {@link goalStatusLine}, {@link nextRace} and {@link patchesEarned} — default to this
 * year's races, and {@link patchWall}, which is what the WALL reads, defaults to all of
 * them. Those six are the whole of it: {@link patchState} is the wall's other half but
 * takes ONE race and no list at all, so it has no scope to get wrong — it answers "has
 * this happened yet" about whatever it is handed. The `events` parameter still means
 * "these events, whatever you pass" in every case: the year lives in the DEFAULT, where
 * `GOAL_YEAR` already lives (see {@link daysRemaining}), so a caller handing over a
 * fixture gets exactly the list it handed over and every test below stays a test of the
 * arithmetic.
 *
 * A RACE BELONGS TO THE YEAR IT STARTS IN. No arithmetic, and it is how a person files
 * one. The event that would probe the rule — a span crossing new year — is not on this
 * calendar, and would count wholly into the year it began; that is also what the
 * single-year array already did with it, so nothing changed direction here.
 *
 * AN UNPARSEABLE DATE FALLS OUT OF THE YEAR, and the direction is deliberate: a race
 * missing from `bookedAhead` makes the required rate HIGHER, never lower, so a typo
 * cannot flatter the card. The wall still draws the bib — `patchState` calls an
 * unreadable date booked, and a recording on an unreadable date is refused at build —
 * so the bad data is visible on the site rather than silently dropped from it.
 */
export function eventsInYear(year: number, events: readonly RaceEvent[] = EVENTS): readonly RaceEvent[] {
    return events.filter((e) => !Number.isNaN(parseIsoDate(e.date)) && e.date.slice(0, 4) === String(year))
}

/** This year's races: the goal cards' calendar. Computed once — `EVENTS` is a constant. */
const GOAL_YEAR_EVENTS: readonly RaceEvent[] = eventsInYear(GOAL_YEAR)

/**
 * THE EVIDENCE THAT A RACE HAS BEEN RUN, which is a different question from what day
 * it is — and getting those two confused is what made a race unrecordable on the day
 * it was run.
 *
 * A finishing time AND the activity it was recorded as. Both, deliberately:
 *
 *   A TIME ALONE is not enough because a time is typed, and this file's own rule is
 *   that a race remembered without a recording is still a complete bib. Someone
 *   filling in a back catalogue from memory should not thereby claim a result the
 *   calendar has not reached.
 *
 *   AN ID ALONE is not enough because the mapping can exist before the race does.
 *   Nothing stops an activity id being pasted next to a race still ahead, and a bib
 *   drawn as earned for a race nobody has run is the failure this file most wants to
 *   avoid — a page that claims a result is worse than a page that claims a plan.
 *
 * TOGETHER THEY ARE A RECORDING: a clock reading that came off a device, and the
 * device's own record of it. You cannot have both for a race you have not run.
 *
 * THIS IS NOT THE FORBIDDEN `done` FLAG, and the difference is not a technicality. A
 * flag has no content, so it says nothing when it is wrong and rots in the direction
 * nobody notices. These two fields are facts with content: they are printed on the
 * bib, one of them is a link a reader can follow, and typing either against a race
 * that has not happened is caught at build by the gate in tests/projection.test.ts,
 * which refuses a finishing time on a race that has not started.
 *
 * THE CLOCK STILL RULES EVERY RACE WITHOUT ONE. A race with no recording — one ridden
 * with nothing on a device, or a back-catalogue entry typed from memory — becomes a
 * finished bib the day after it is ridden, exactly as before. This is a second,
 * sufficient way to be finished, not a replacement.
 *
 * IT DELIBERATELY NAMES NO EXAMPLE. This paragraph used to point at one race in `EVENTS`,
 * which stopped being true the day that race was recorded; which races currently lack a
 * recording is a property of the data on the day you read this, and the rule holds even on
 * a calendar where every finished race happens to have one.
 */
const hasRecording = (event: RaceEvent): boolean =>
    event.elapsed_time !== undefined && recordingsOf(event).length > 0

/**
 * Riding days from `iso` to 31 December of `GOAL_YEAR`, counting BOTH ends, never
 * negative.
 *
 * INCLUSIVE IS NOT A STYLE CHOICE — `bookedAhead` forces it. That function counts
 * an event starting on `iso` as wholly ahead (`today <= start`), so it treats the
 * stamped day as still to be ridden. The two are the numerator and the denominator
 * of one fraction and must agree on that day; an exclusive count divides the
 * deficit by one day too few and over-states the rate the card asks for.
 *
 * The bot settles which way to agree. `updated_at` is stamped by a cron that fires
 * at 05:13 Singapore time, naming a day whose riding is entirely ahead of anyone
 * reading the page. So the stamped day counts, and `bookedAhead` was the one that
 * already had it right.
 *
 * THE KNOCK-ON, accepted deliberately: 31 December returns 1 rather than 0, so the
 * last day of the year reads as `final` ("N km to go") instead of `closed`
 * (renders nothing). It is a real riding day. `closed` now begins on 1 January.
 */
export function daysRemaining(iso: string, year: number = GOAL_YEAR): number {
    const from = parseIsoDate(iso)
    if (Number.isNaN(from)) return NaN
    const end = Date.parse(`${year}-12-31T00:00:00Z`)
    return Math.max(0, Math.round((end - from) / MS_PER_DAY) + 1)
}

/**
 * Booked distance for a sport that has NOT been ridden yet as of `iso`.
 *
 * A multi-day event is counted pro rata across its span. Booking the whole of a
 * nine-day tour on its start date would drop this figure by the tour's full
 * distance the moment it begins, while the rider has covered one day of it.
 *
 * IT COUNTS ONLY THIS YEAR'S RACES, which is carried by the default rather than by
 * anything in the loop below — see the scope rule above {@link eventsInYear}. Pass a
 * list and it books whatever is in it; the year is not smuggled into the arithmetic.
 */
export function bookedAhead(sport: Sport, iso: string, events: readonly RaceEvent[] = GOAL_YEAR_EVENTS): number {
    const today = parseIsoDate(iso)
    if (Number.isNaN(today)) return NaN
    let km = 0
    for (const e of events) {
        if (e.sport !== sport) continue
        // ONLY A RACE THE WALL CALLS `booked` HAS KILOMETRES AHEAD OF IT, and this asks
        // the wall's own function rather than re-deriving the reasons — which is the
        // whole point. This line used to read `if (hasRecording(e)) continue`, an
        // enumeration of ONE reason to skip, and it was complete only while the wall had
        // two states:
        //
        //   FINISHED — the race has been RIDDEN whatever the day says, so its kilometres
        //   are in the bot's total or will be at the next fetch, and booking them here
        //   would count the race twice.
        //
        //   DNF — the race will never be ridden, so booking it promises kilometres that
        //   are not coming. `hasRecording` catches a DNF that was recorded and MISSES one
        //   that was not: abandoning the 1,022 km Formosa tour mid-way books all 1,022 km
        //   of it into the cycling card while the wall draws the bib as DNF.
        //
        // Skipping is also the safe direction while the bot catches up: the deficit stays
        // whole, so the rate reads high rather than flattering. The cross-consumer sweep
        // in tests/patch-wall.test.ts forces this line — without it the wall and the card
        // contradict each other — and `books nothing for a race that was abandoned` below
        // holds the DNF half, which the sweep cannot see while every DNF on the calendar
        // happens to carry a recording.
        if (patchState(e, iso) !== "booked") continue
        // WHICH DISTANCE THAT IS depends on the row, and the accessor is what stops this
        // line having to know. A booked race is USUALLY unrecorded, so `raceKm` hands back
        // the ADVERTISED figure — the only one it has. But `booked` is not a synonym for
        // unrecorded: a row carrying `recordings` without an `elapsed_time` is booked too
        // (`hasRecording` needs both), and there `raceKm` returns the distance derived from
        // the metres. Both are the best figure that row holds, which is why one reader of
        // the distance beats two. NOT every race reaching here is unrecorded — that reading
        // was found false twice over, and it is what a single-reader shortcut rests on.
        const booked = raceKm(e)
        if (!Number.isFinite(booked) || booked < 0) continue
        const start = parseIsoDate(e.date)
        if (Number.isNaN(start)) continue
        const end = e.end_date ? parseIsoDate(e.end_date) : start
        if (Number.isNaN(end) || end < start) continue
        if (today <= start) { km += booked; continue }       // wholly ahead
        if (today > end) continue                            // wholly done
        // Mid-event: the days not yet ridden, inclusive of today.
        const totalDays = Math.round((end - start) / MS_PER_DAY) + 1
        const doneDays = Math.round((today - start) / MS_PER_DAY)
        km += booked * ((totalDays - doneDays) / totalDays)
    }
    return km
}

/**
 * What the card can say about a goal. A discriminated union rather than a number,
 * because the honest answer is a different SENTENCE in each case and a caller that
 * receives only a number will invent the wrong one — a met goal and a goal needing
 * 0.4 km/wk both round to "0 km/wk to go".
 */
export type GoalStatus =
    /** Already at or past the target. */
    | {kind: "met"}
    /** Booked races alone cover the remainder; no ordinary training needed. */
    | {kind: "covered"; km: number}
    /** The year is over — from 1 January, since 31 December is still a riding day. */
    | {kind: "closed"}
    /** Under a fortnight left — a weekly rate is the wrong unit at that range. */
    | {kind: "final"; km: number; days: number}
    /** The ordinary case: kilometres per week, rounded UP. */
    | {kind: "rate"; kmPerWeek: number; km: number; days: number}
    /** Inputs did not parse. Render nothing rather than a guess. */
    | {kind: "unknown"}

/** Below this many days remaining, a weekly rate misleads and an absolute total does not. */
const FINAL_STRETCH_DAYS = 14

export function goalStatus(goal: Goal, iso: string = UPDATED_AT, events: readonly RaceEvent[] = GOAL_YEAR_EVENTS): GoalStatus {
    const {raw_progress: ridden, total_goal: target} = goal
    if (!Number.isFinite(ridden) || !Number.isFinite(target) || target <= 0) return {kind: "unknown"}

    // Checked BEFORE the deficit, and the order matters: a met goal and a goal
    // needing nothing more are different sentences, and `raw_progress` is the
    // unclamped figure precisely so this branch can fire.
    if (ridden >= target) return {kind: "met"}

    const days = daysRemaining(iso)
    const booked = bookedAhead(goal.sport, iso, events)
    if (Number.isNaN(days) || Number.isNaN(booked)) return {kind: "unknown"}

    const km = target - ridden - booked
    if (km <= 0) return {kind: "covered", km: target - ridden}
    if (days <= 0) return {kind: "closed"}
    if (days < FINAL_STRETCH_DAYS) return {kind: "final", km: Math.ceil(km), days}

    // CEIL, not round or floor, and this is a correctness choice rather than taste. Round
    // UNDER-STATES wherever the exact requirement has a fractional part below .5, which is
    // most days on the calendar: a rider following a rounded-down rate exactly delivers
    // less than the goal needs and MISSES it. Ceil never under-states. One km/wk is the
    // same absolute distance on both cards and a far larger fraction of the smaller goal,
    // so the identical rounding step is the more consequential one on the running card.
    //
    // NO WORKED EXAMPLE HERE, DELIBERATELY, AND THAT IS THE SECOND TIME THIS PARAGRAPH HAS
    // BEEN WRONG. Which dates discriminate moves with the numerator: every rate's
    // fractional part shifts when the kilometres owed change, and recording a race and
    // booking one move it in opposite directions — measured twice, once SWAPPING the roles
    // of two adjacent days and once leaving them exactly where they were, so the roles
    // cannot be reasoned about either. A stale example is worse than none, because it
    // invites a reader to re-derive it and conclude that round is fine. The census that
    // replaces it — how many of the remaining sport-days round would under-state — is swept
    // over the whole calendar and generated into `src/lib/derived-figures.md`, and
    // tests/projection.test.ts pins the current discriminating pair and says how to move
    // the roles.
    const kmPerWeek = Math.ceil(km / (days / DAYS_PER_WEEK))
    return {kind: "rate", kmPerWeek, km, days}
}

/**
 * The card's third line, or null to render nothing.
 *
 * EVERY STRING HERE IS WIDTH-BUDGETED. The ceiling is the goal card's ROW content
 * width — **182px at 1024px wide, 201 at 1100, 214 from 1152 up** — and the widest
 * single line that fits at 1024 is about 156.7px of ink. Measured at 12px in the
 * page's own stack:
 *
 *     1000 km/wk to go        99.31   worst case of the rate branch
 *     71 km/wk to go          83.56
 *     1000 km to go           80.11   worst case of the final branch
 *     Races cover it          78.78
 *     Goal met                50.22
 *
 * BE CAREFUL WHICH BOX YOU MEASURE. 110.02px is NOT the budget, though it is the
 * figure most easily reached for: it is the RUNNING card's inner `max-content` column,
 * which is not a budget at all — it widens with its own content, and the cycling card's
 * is 125.89px. Reading that box also supports a claim that
 * `Booked races cover it` "wraps at every viewport"; it does not — measured on the
 * built page it is ONE line at 1024/1100/1152/1440 with the card height unchanged
 * at 226 and no overflow. The shorter wording below ships because it is plainer,
 * not because the longer one broke.
 *
 * The line COUNT is the real constraint, and it is about height rather than width:
 * the right-hand stack has 18px of free height once both goal cards carry one line,
 * and a second line takes it to zero — at which point the flex column contracts all
 * three cards, the Now card included, 154 -> 149.39px. Glyphs are not sheared until
 * FOUR lines, so the budget protects the Now card, not against clipping.
 * `tests/projection.test.ts` pins the literals below against these measurements.
 */
export function goalStatusLine(goal: Goal, iso: string = UPDATED_AT, events: readonly RaceEvent[] = GOAL_YEAR_EVENTS): string | null {
    const s = goalStatus(goal, iso, events)
    switch (s.kind) {
        case "met": return "Goal met"
        case "covered": return "Races cover it"
        case "closed": return null
        case "final": return `${s.km} ${goal.measurable_unit} to go`
        case "rate": return withBooked(`${s.kmPerWeek} ${goal.measurable_unit}/wk to go`, goal, iso, events)
        case "unknown": return null
    }
}

/**
 * WHAT THE RATE IS ALREADY ASSUMING, SAID OUT LOUD.
 *
 * `bookedAhead` subtracts every booked race's kilometres from the deficit before the rate
 * is divided out, and `src/lib/derived-figures.md` prices it: booking races is worth a large
 * share of the rate the cycling card would otherwise ask for. So the card's one actionable number rests
 * on an assumption the card never showed — that a race not yet ridden WILL be finished —
 * and the wall two clicks away draws a DNF bib proving that assumption can fail.
 *
 * IT IS A CLAUSE, NOT A SECOND LINE, and that is a measured choice rather than a stylistic
 * one. Five treatments were built as the real card in the real page: a second line costs
 * 20px on each of two cards and 40px of mobile document, and putting the clause on the
 * countdown row instead desynchronises the pair (257 vs 273px) because the cycling figure
 * wraps — and the two cards sit one directly above the other. Extending this line costs
 * nothing at all: both cards and the document are the same height with the clause as
 * without it, at every width and every reader text size measured.
 *
 * NO ABSOLUTE PAIR HERE ANY MORE, deliberately. This sentence used to end "the document
 * stays 900 / 1754", and the mobile figure was never a state of the tree: 1754 is what the
 * document WOULD have measured had the eyebrow been deleted without the hero's door landing
 * too, and the two shipped together. The claim that matters is a DIFFERENCE — this clause
 * moves nothing — and a difference survives the next unrelated change to the hero where a
 * pinned absolute silently stops being true. Measure the pair if you need it; do not
 * re-pin it here.
 *
 * A COMMA RATHER THAN A MIDDOT. Both were rendered and both fit. The middot is Garmin's
 * separator and reads as an instrument row; this card is deliberately a sentence — the
 * maintainer kept the prose lines when aligned label/value rows were offered and measured
 * as fitting. Take the pattern from the reference apps, not the register.
 *
 * THE UNIT IS NOT REPEATED, AND THAT IS A MEASURED CONSTRAINT BEFORE IT IS A COPY ONE.
 * `71 km/wk to go, 1022 km booked` measures 182.59px against the goal card's tightest text
 * column — 182px, at exactly 1024px wide, which is the `lg` breakpoint itself. It overflows
 * by 0.59px and wraps, and a wrapped line takes the cycling card to 273px against the
 * running card's 257: the two cards sit one directly above the other, so they visibly stop
 * matching. That is the same defect that ruled out putting the clause on the countdown row,
 * and it is invisible at 1440 — where both forms fit — which is why the first sweep missed
 * it. Dropping the second `km` measures 162.52px and clears the column by 19.5px.
 *
 * It is better copy for the same reason it is narrower: the unit is already in the clause
 * before the comma, so printing it twice is a word doing no work.
 *
 * THE TWO FIGURES ARE ANTI-CORRELATED, so do not price the worst case as the product of
 * their maxima. `1000 km/wk to go, 9999 booked` measures 181.31px and would clear 182 by
 * 0.69px, but it is not reachable: kilometres booked are SUBTRACTED from the deficit before
 * the rate is divided out, so a booked figure that large drives the rate to zero and the
 * `covered` branch answers instead — and `covered` takes no clause at all.
 *
 * ONLY ON THE `rate` BRANCH. `met`, `covered` and `final` are answers, not forecasts:
 * "Goal met" is not made truer or falser by what is booked, and `covered` already SAYS the
 * booked races cover it, so appending this there would be the same fact twice.
 */
function withBooked(line: string, goal: Goal, iso: string, events: readonly RaceEvent[]): string {
    const booked = Math.round(bookedAhead(goal.sport, iso, events))
    return booked > 0 ? `${line}, ${booked} booked` : line
}

/** "2026-07-27" -> "27 July 2026". Full month name: it fits the footer's tightest
 *  182px at the worst date the calendar offers, and it hands a screen reader a word
 *  rather than the token "Jul". */
const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]

export function formatDateline(iso: string = UPDATED_AT): string | null {
    if (Number.isNaN(parseIsoDate(iso))) return null
    const [y, m, d] = iso.split("-")
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

// ---------------------------------------------------------------------------
// The patch wall. Everything below serves /patches; nothing above it reads any
// of this, and the goal cards are unchanged by it.
// ---------------------------------------------------------------------------

/**
 * Whether a bib has been EARNED, derived from the calendar and never stored.
 *
 * {@link RaceEvent} has no `done` flag and must not gain one. A stored flag rots in
 * the one direction nobody notices: a race that has been run keeps rendering as
 * still-to-come, indefinitely, with the build green and the page confidently wrong.
 * Derivation cannot do that — the wall is rebuilt on every deploy and the bot
 * deploys whenever the kilometres move.
 *
 * `RaceEvent.outcome` IS STORED AND IS NOT THAT FLAG, said here because this
 * paragraph is where a reader meets the rule and the exception is 300 lines away in
 * another file. The test is not "is it stored" but "does the calendar keep
 * re-deriving the answer": it does for `done`, which is why that flag rots, and it
 * cannot for an abandonment, which nothing in the data records at all. The argument
 * is written out above `outcome` in constants.ts; satisfy it before storing a second
 * one.
 *
 * THERE ARE TWO WAYS TO BE `finished`, AND THE ORDER MATTERS. A race with a
 * recording is finished because it was run; a race without one is finished once the
 * whole event is behind the day. The first is asked first, and it is the only reason
 * a race can become a patch on the day it was run — the clock cannot see this
 * morning's race, because a day is not over until it is over.
 *
 * WHY THE CLOCK ALONE WAS NOT ENOUGH, since this was one comparison for a while. It
 * was `stamp > end`, and BOTH halves refused a same-day record: the stamp is the bot's
 * kilometre-freshness date and freezes when the kilometres do not move, and `>`
 * excludes the race's own day even from a perfect clock. So a race run on a Wednesday
 * could not be entered as run until the bot pushed on the Thursday — and if no ride
 * followed, not then either. The fix is not a looser comparison but a better question:
 * ask the recording, and keep the clock for races that have none.
 *
 * BOTH WAYS STAY IN STEP WITH THE PROJECTION *GIVEN ONE DAY*, and the qualifier is
 * load-bearing: the sentence is simply false without it.
 * `bookedAhead` answers the same "has this happened yet" for the goal cards, one click
 * away, so it skips a race with a recording and shares the `today > end` comparison for
 * every other. A wall that calls the Formosa tour finished while the cycling card still
 * counts its 1,022 km as booked is the page contradicting itself on one screen; the
 * year-long sweep in tests/patch-wall.test.ts is what holds the two COMPARISONS together,
 * and it fails on exactly that — but it hands both functions the SAME `iso`, which the
 * page no longer does.
 *
 * WHAT THE SWEEP THEREFORE CANNOT SEE, since the two consumers stopped sharing a day.
 * `patchState` takes `BUILD_DATE` and `goalStatus` takes `UPDATED_AT`, so on any build
 * later than the stamp, a race that ended in between is `finished` on the wall while
 * `bookedAhead` still books its kilometres. Ride a race on the Sunday, deploy anything on
 * the Monday before the bot pushes, and the wall draws an earned patch while the goal card
 * is still counting that race's kilometres ahead.
 *
 * THAT IS THE DELIBERATE CONSEQUENCE OF THE SPLIT, NOT A BUG TO CLOSE, and the arithmetic
 * is why: the stamp's kilometres do not include that ride yet, so booking it keeps the
 * numerator and the denominator the same age and the distance counted exactly ONCE.
 * Measured across one such push — 71 km/wk before, 74 after, and the difference is five days
 * of denominator, not a double count. Those three figures are that push's, kept as the
 * measurement that settled the question; the live rate has moved many times since and is not
 * what this paragraph is claiming. Dropping the race from `booked` the moment the WALL
 * calls it finished, without banking its kilometres, reads 77: further from the settled
 * figure than leaving it alone, and it would be inventing a distance nobody has measured,
 * which is the one thing the header of this file refuses to do. So do NOT "fix" this by
 * moving `bookedAhead` onto `BUILD_DATE`, and do NOT add a sweep over (stamp, build)
 * PAIRS — every pair where the stamp lags a finished race disagrees BY DESIGN, so such a
 * gate is red on correct code.
 *
 * A MULTI-DAY EVENT IN PROGRESS IS THEREFORE `booked`, which is a choice rather than
 * a fallout of the comparison: you earn the bib at the finish line, not at the start
 * one, and the outline treatment says exactly "not yet". `bookedAhead` disagrees in
 * a way that is correct for its own job — it counts the untravelled days of a tour
 * pro rata, because it is measuring distance rather than completion.
 *
 * AN UNPARSEABLE DATE IS `booked` FOR EVERY RACE THE CLOCK RULES. That direction is
 * deliberate and is the only one available: the alternative failure renders a race
 * nobody has run as finished, and a page that claims a result is worse than a page that
 * claims a plan. A race with a recording never reaches the comparison — it is finished
 * on its recording — and that is not a way round the rule, because a finishing time on
 * an unreadable date fails the build outright (tests/projection.test.ts).
 *
 * `dnf` IS THE ONE STATE NOTHING HERE DERIVES, and it is asked first for exactly that
 * reason. Every other answer this function gives is read off the data — a recording, a
 * date, a clock — and a race that was abandoned carries all three of those looking
 * exactly like a race that was completed, because no device models the difference (see
 * `RaceEvent.outcome` in constants.ts). So it is hand-entered, and every question below
 * it would resolve such a race `finished`: it has a recording, and its date is years
 * past. Moving this line down the function is silent — the type still checks, the wall
 * still renders, and the bib simply claims a result the rider did not get.
 *
 * IT IS NOT A SECOND WAY OF BEING BOOKED, though it is DRAWN like one. A booked bib says
 * "not yet" and a DNF says "not at all"; they share a treatment because the treatment
 * means "no patch here", and the DNF bib carries its own word in the largest type it
 * has. What follows from that is arithmetic rather than styling: {@link patchesEarned}
 * counts `finished` and so skips it, which is right — a DNF is not a Finisher Patch —
 * while {@link bookedAhead} skips it too, for the unrelated reason that it has a
 * recording, which is also right: he rode those kilometres and the bot's total holds
 * them. The two exclusions have different causes and must not be merged.
 */
export type PatchState = "finished" | "booked" | "dnf"

/** The last day an event occupies — its own date unless it spans several. */
const eventEnd = (event: RaceEvent): string => event.end_date ?? event.date

export function patchState(event: RaceEvent, iso: string = BUILD_DATE): PatchState {
    // ASKED FIRST, AND THE ORDER IS LOAD-BEARING — see the paragraph above the type. A DNF
    // has both halves of a recording and a date long past, so every question below this one
    // answers "finished" for it.
    if (event.outcome === "dnf") return "dnf"
    // The recording is the finish line. Asked before the clock, because the clock
    // cannot see a race run this morning and this is the only way a race becomes a
    // patch on the day it is run. See `hasRecording` for why it takes both fields.
    if (hasRecording(event)) return "finished"
    const today = parseIsoDate(iso)
    const end = parseIsoDate(eventEnd(event))
    if (Number.isNaN(today) || Number.isNaN(end)) return "booked"
    return today > end ? "finished" : "booked"
}

export type Patch = {event: RaceEvent, state: PatchState}

/**
 * The wall: every race, or every race of one sport, NEXT RACE FIRST — the booked
 * races in ascending date order, then the finished ones in descending.
 *
 * EVERY RACE MEANS EVERY YEAR. This is the one function whose default is the whole of
 * {@link EVENTS}, and the sort needs nothing added for it: both runs already point away
 * from today, so the finished run walks backwards out of this year into the last one and
 * the one before it, which is the order a person reads a history in. A bib prints its
 * full year, so nothing here has to draw a boundary between them.
 *
 * The goal cards see a subset — see the scope rule above {@link eventsInYear} — and that
 * is the whole of the difference between this and {@link nextRace} two functions down.
 *
 * WHY NOT NEWEST-FIRST, WHICH THIS REPLACED. One flat descending sort means "most
 * recent thing at the top", and on a calendar that runs past today that buries the
 * race the owner is actually training for at the BOTTOM of the booked group, three
 * further-away races above it. Both groups therefore start at today and move away
 * from it, in opposite directions: booked counts forward (2 Aug, 27 Sep, 7–15 Nov,
 * 6 Dec) and finished counts back (12 Jul, 10 Jul).
 *
 * WHICH MAKES THE STATE PART OF THE SORT KEY, and that is the one thing here that
 * can surprise a caller: this order is a function of `iso`, so the same fixture
 * reorders itself as races fall behind the build day — and on the day after the last
 * race the booked run empties and the whole wall is plain descending. That is the
 * intended behaviour, not a degenerate case, and it is why the tests assert the
 * shape of the order at pinned dates rather than the order of today's calendar.
 *
 * THE GROUP BOUNDARY IS NOT DRAWN, because the bibs already draw it: a booked bib is
 * an outline wearing the word BOOKED and a finished one is a solid inverted face, so
 * the two runs read as two blocks with nothing between them. A heading or rule would
 * belong to the page, not to this function.
 *
 * A DNF IS AN OUTLINE INSIDE THE SOLID RUN, and that is the one place the paragraph above
 * stops being tidy. It is deliberate rather than a cost tolerated: the run is a history
 * in date order, and an abandoned race happened on its day like every other race around
 * it, so sorting it anywhere else would be sorting by outcome. The outline says no patch
 * was earned; the position says when it was ridden. Those are different questions and the
 * bib answers both.
 *
 * SORTED HERE RATHER THAN IN THE FIXTURE, and the reason is a defect that already
 * shipped once in the design previews for this feature: their captions claimed an
 * order the array happened to supply, and nobody read the render against the
 * caption. {@link EVENTS} is hand-edited in date order because that is the order a
 * person adds races in, so relying on it would mean the wall's ordering is a
 * property of how the list was typed.
 *
 * THE ORDER IS TOTAL, which is why `name` breaks the tie rather than leaving it to
 * the sort's stability: a tie resolved by fixture position is the same defect as
 * sorting in the fixture, just narrower. {@link EVENTS} has no same-day pair today —
 * the two Phuket legs are two days apart — so the tie is exercised by a fixture in
 * the tests rather than by the calendar, and a weekend double is one edit away.
 *
 * THE TIEBREAK IS ASCENDING IN BOTH GROUPS, deliberately out of step with the dates.
 * Reversing it inside the finished group would make the printed order of two
 * same-day races depend on whether they have happened yet, which is a stranger rule
 * than one alphabetical tiebreak that never moves.
 */
/*
 * TWO RUNS, THREE STATES — so this is a RANK rather than an ordering of the states, and
 * `dnf` shares its rank with `finished`. The wall is a HISTORY, not a ranking: a race
 * abandoned in 2023 belongs in date order among the races completed either side of it,
 * not gathered into a third group that would read as a league table of how well each one
 * went.
 *
 * A SHARED RANK IS WHY THE COMPARATOR BELOW CANNOT ASK `a.state !== b.state` FIRST, which
 * is what it did while there were only two states and what the `Record<PatchState, …>`
 * type will NOT catch when a third is added. That line returned `RANK[a] - RANK[b]` for
 * any pair whose states differ — which for a finished/dnf pair is `0`, an "equal" verdict
 * that never reaches the date comparison and leaves the two in fixture order. Green
 * types, green suite on any calendar with no DNF, and a wall that silently stops sorting
 * the moment one appears. Compare the RANKS and fall through when they match.
 */
const STATE_RANK: Record<PatchState, number> = {booked: 0, finished: 1, dnf: 1}

export function patchWall(
    sport?: Sport,
    iso: string = BUILD_DATE,
    events: readonly RaceEvent[] = EVENTS,
): Patch[] {
    return events
        .filter((e) => sport === undefined || e.sport === sport)
        .map((event) => ({event, state: patchState(event, iso)}))
        .sort((a, b) => {
            const byRank = STATE_RANK[a.state] - STATE_RANK[b.state]
            if (byRank !== 0) return byRank
            if (a.event.date !== b.event.date) {
                const earlierFirst = a.event.date < b.event.date ? -1 : 1
                // Equal rank, states not necessarily equal — a finished bib and a DNF share
                // one. So this asks the RANK rather than the state name: the forward-pointing
                // run counts up towards the next race, and everything behind today counts
                // back, whatever kind of history it is.
                return STATE_RANK[a.state] === STATE_RANK.booked ? earlierFirst : -earlierFirst
            }
            return a.event.name < b.event.name ? -1 : a.event.name > b.event.name ? 1 : 0
        })
}

/** "JUL", for a bib's date line. Three letters is what fits beside the sport mark. */
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3).toUpperCase())

/**
 * An event's date as a bib prints it, BROKEN INTO THE PIECES A `<time>` CAN CLAIM:
 * "12 JUL 2026" for a day, "7–15 NOV 2026" for a tour.
 *
 * A SPAN IS COLLAPSED TO WHAT ACTUALLY DIFFERS, so the nine-day tour reads as nine
 * days without spending a second month and year saying so. The alternative — one
 * date, the start — understates a 1,022 km event as a single day's ride, on the one
 * bib where the distance makes that reading absurd.
 *
 * Three shapes, and the boundaries between them are the calendar's rather than a
 * preference: same month and year collapses to `7–15 NOV 2026`; a span crossing a
 * month keeps both months (`30 NOV – 2 DEC 2026`); a span crossing new year keeps
 * both years too. The en dash is a range dash and is deliberately not a hyphen.
 *
 * WHY SEGMENTS RATHER THAN ONE STRING. `<time datetime>` names ONE instant, and HTML
 * has no interval form for it — so a tour rendered as `<time datetime="2026-11-07">`
 * around the text "7–15 NOV 2026" tells a machine the nine-day event happened on the
 * 7th. A review of the patch wall caught exactly that shipping. The endpoints are
 * separable, so each gets its own element and the dash between them belongs to
 * neither; the segment with no `iso` is punctuation and the caller renders it as text.
 *
 * {@link formatPatchDate} is DERIVED from this rather than written beside it, which is
 * the point: two functions producing the same string is how the range a reader sees
 * and the dates a machine reads start to disagree, and that is the defect one layer up
 * from the one being fixed here.
 *
 * Returns null on an unparseable date, for the same reason everything else here
 * does: the caller renders nothing rather than a guess.
 */
export type PatchDateSegment = {
    text: string
    /** The day this segment names, `YYYY-MM-DD`. Absent on the range dash. */
    iso?: string
}

export function patchDateSegments(event: RaceEvent): PatchDateSegment[] | null {
    const from = event.date
    const to = eventEnd(event)
    const start = parseIsoDate(from)
    const end = parseIsoDate(to)
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null

    const part = (iso: string) => {
        const [y, m, d] = iso.split("-")
        return {d: String(Number(d)), m: MONTHS_SHORT[Number(m) - 1], y}
    }
    const a = part(from)
    const b = part(to)
    if (start === end) return [{text: `${a.d} ${a.m} ${a.y}`, iso: from}]
    if (a.y !== b.y) {
        return [{text: `${a.d} ${a.m} ${a.y}`, iso: from}, {text: " – "}, {text: `${b.d} ${b.m} ${b.y}`, iso: to}]
    }
    if (a.m !== b.m) {
        return [{text: `${a.d} ${a.m}`, iso: from}, {text: " – "}, {text: `${b.d} ${b.m} ${b.y}`, iso: to}]
    }
    return [{text: a.d, iso: from}, {text: "–"}, {text: `${b.d} ${a.m} ${a.y}`, iso: to}]
}

/** The same date line as one string. See {@link patchDateSegments}, which owns it. */
export function formatPatchDate(event: RaceEvent): string | null {
    const segments = patchDateSegments(event)
    return segments === null ? null : segments.map((s) => s.text).join("")
}

/**
 * THE NEXT RACE FOR A SPORT, and it is deliberately the FIRST ENTRY OF THAT SPORT'S
 * WALL rather than a second sort over {@link EVENTS}.
 *
 * {@link patchWall} already orders booked races ascending ahead of finished ones, so
 * its first booked entry is by definition the next one. Re-deriving that here with
 * another comparator is how the goal card and the wall come to disagree about which
 * race is next — the same failure the wall's own docstring describes for the fixture,
 * one level up. One derivation, two consumers.
 *
 * `daysAway` COUNTS FROM THE STAMP TO THE START DAY and can be NEGATIVE, which is not
 * a bug to clamp: a multi-day event stays booked for every day it runs (you earn the
 * bib at the finish line), so mid-tour the start is behind the build day while the race is
 * still the next one. `underWay` is that case named, so a caller does not have to
 * decide what "in -3 days" means.
 *
 * Returns null when the sport has nothing booked — every race run, or none entered.
 * That is a state the site passes through every January and again the morning after
 * the last race, so it is an ordinary branch and not an error.
 *
 * NEXT MEANS NEXT THIS YEAR, because this is a goal card's line and a goal card is one
 * year (see {@link eventsInYear}). So the days between a year's last race and 31 December
 * return `null` even with January's race already on the calendar, and the card offers the
 * year's patch count instead. That is the cost of the scope rule and it is paid
 * deliberately: the alternative counts down to a race whose kilometres every other figure
 * on the card refuses to count. The race is one click away on the wall, which is the
 * object that keeps the whole calendar.
 */
export type NextRace = {
    event: RaceEvent
    /** Days from the build day to the START day. Negative while a multi-day race runs. */
    daysAway: number
    /** True when the race has begun and has not finished. */
    underWay: boolean
}

export function nextRace(
    sport: Sport,
    iso: string = BUILD_DATE,
    events: readonly RaceEvent[] = GOAL_YEAR_EVENTS,
): NextRace | null {
    const next = patchWall(sport, iso, events).find((p) => p.state === "booked")
    if (next === undefined) return null
    const start = parseIsoDate(next.event.date)
    const today = parseIsoDate(iso)
    if (Number.isNaN(start) || Number.isNaN(today)) return null
    const daysAway = Math.round((start - today) / MS_PER_DAY)
    return {event: next.event, daysAway, underWay: daysAway < 0}
}

/**
 * Patches already earned for a sport — what the card offers when nothing is booked.
 *
 * THIS YEAR'S, not the owner's whole collection, and the difference now exists: the wall
 * keeps every race he has ever entered. A lifetime count under a heading that reads "My
 * cycling goal this year", beside three year-to-date figures, would be one figure in a
 * different unit from its neighbours — the mixed-scope defect this repo has already had
 * to correct once. The lifetime COLLECTION has a home — it is the wall, where every patch
 * ever earned is drawn, in every year. What the wall does not print is a lifetime COUNT:
 * its filter row is a census of races ENTERED (`patchWall(sport).length`, outlines
 * included), not of patches earned, so this function is the only place the site counts
 * patches at all. Scoping it to the year is therefore a decision about which question the
 * card answers, not a choice between two figures the site already shows.
 */
export function patchesEarned(
    sport: Sport,
    iso: string = BUILD_DATE,
    events: readonly RaceEvent[] = GOAL_YEAR_EVENTS,
): number {
    return patchWall(sport, iso, events).filter((p) => p.state === "finished").length
}

/**
 * Where the countdown stops counting in days and starts counting in weeks.
 *
 * A FORTNIGHT RATHER THAN A WEEK, because the rung it would otherwise print is the one
 * that reads worst: "in 1 week" is vaguer than "in 9 days" while being no shorter, and a
 * single week is a span a reader already holds in days. Starting at 14 means the smallest
 * week count this can produce is two, which is also why there is no singular string.
 */
const DAYS_BEFORE_WEEKS = 14

/**
 * THE SENTENCE THE GOAL CARD PRINTS, and it lives here rather than in the component so
 * that the tests can assert the wording rules against the real thing. A component that
 * assembled this inline would leave the suite either untested or asserting a copy of the
 * branch — which is a test that cannot fail.
 *
 * Two shapes of day, not a happy path and a fallback. While a race is booked the line
 * counts down to it; while none is, it offers what has been earned. Nothing is booked for
 * a sport every January before its first race and again from the morning after its last,
 * so both are ordinary.
 *
 * `underWay` is checked BEFORE the day count for the reason it exists: mid-tour the start
 * is behind the build day, and the arithmetic branch would print "in -3 days".
 *
 * THE WEEK COUNT IS FLOORED, AND THAT DIRECTION IS DELIBERATE. 61 days is eight weeks and
 * five days; floored it reads "in 8 weeks", which says the race arrives sooner than it
 * does, and rounded it would read "in 9 weeks", which says there is a week of preparation
 * that does not exist. Of the two ways to be wrong by up to six days, the one that leaves
 * the reader early is the safe one. The exact date is on the bib either way.
 */
export function nextRaceLine(next: NextRace | null, earned: number): string {
    if (next === null) {
        if (earned === 0) return NEXT_RACE.none
        return earned === 1 ? NEXT_RACE.earned_one : NEXT_RACE.earned.replace("{count}", String(earned))
    }
    if (next.underWay) return NEXT_RACE.under_way
    if (next.daysAway === 0) return NEXT_RACE.today
    if (next.daysAway === 1) return NEXT_RACE.tomorrow
    if (next.daysAway < DAYS_BEFORE_WEEKS) return NEXT_RACE.in_days.replace("{days}", String(next.daysAway))
    return NEXT_RACE.in_weeks.replace("{weeks}", String(Math.floor(next.daysAway / 7)))
}
