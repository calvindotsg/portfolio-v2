import {describe, expect, it} from "vitest";

import {GOALS, GOAL_YEAR, type Goal, type RaceEvent, raceKm, recordingsOf} from "../src/lib/constants";
import {bookedAhead, daysRemaining, eventsInYear, goalStatus, parseIsoDate} from "../src/lib/projection";
import {AS_OF, CYCLING_KM, RUNNING_KM} from "./helpers/reference";

/**
 * THE FIGURES THAT USED TO BE TYPED INTO A COMMENT, GENERATED INSTEAD.
 *
 * src/lib/projection.ts argues its design in numbers — a required rate against the pace
 * it replaces, a comparator that must be the de-raced pace and not the observed one, a
 * rounding rule that ceil gets right and round gets wrong. Every one of those arguments
 * needs a worked example to be readable, and every worked example was typed by hand into
 * a comment that nothing could check. Six of them were wrong at once on the tree this
 * file landed against, with the suite green.
 *
 * WHAT COST THE MOST WAS NOT THE WRONG DIGITS. It was that not one of them had its
 * DEFINITION written down anywhere: a later reader had to reverse-engineer "the de-raced
 * pace" from the shipped value before they could tell whether it had rotted. So this file
 * writes the definitions down once, in code, and publishes the figures they produce as
 * src/lib/derived-figures.md. A data edit now produces a diff instead of an archaeology
 * session, and the diff is the re-derivation.
 *
 * IT IS A SNAPSHOT ON PURPOSE. There is no independent oracle for any of these — an
 * assertion pinning the de-raced pace to a literal would be the hand-written figure again,
 * one file over. What a snapshot holds is the thing actually worth holding: that nobody
 * changed a race, a goal or the arithmetic without the published figures moving in front
 * of a reviewer.
 *
 * THE REFERENCE IS FROZEN AND THE CALENDAR IS NOT, and that asymmetry is the one thing a
 * reader of the generated file has to understand — it is why the file's own first line
 * says the figures illustrate the model at a reference rather than what the site publishes
 * today. tests/helpers/reference.ts explains why the kilometres may not be read live. The
 * consequences are worked through beside `RIDDEN_BY_REFERENCE` and `POST_REFERENCE` below;
 * they are not symmetrical between the figures, and treating them as though they were is
 * exactly the mistake that would put an authoritative wrong number in a generated file.
 */

const goalBySport = (sport: string): Goal => {
    const g = GOALS.find((x) => x.sport === sport);
    if (!g) throw new Error(`no goal for sport ${sport}`);
    return g;
};

const MS_PER_DAY = 86_400_000;
const eventEnd = (e: RaceEvent): string => e.end_date ?? e.date;

/**
 * A RACE IS RECORDED WHEN IT CARRIES BOTH A FINISHING TIME AND THE ACTIVITY IT WAS
 * RECORDED AS. This mirrors `hasRecording` in src/lib/projection.ts, which is module-private
 * there and deliberately stays that way — exporting it to save four tokens here would widen
 * a module's surface for a test's convenience. The pair is the point: see that function for
 * why a time alone and an id alone are each insufficient.
 */
const isRecorded = (e: RaceEvent): boolean => e.elapsed_time !== undefined && recordingsOf(e).length > 0;

const THIS_YEAR = eventsInYear(GOAL_YEAR);
const REFERENCE = parseIsoDate(AS_OF);

/**
 * THE ONE FIGURE THAT MAY NOT SEE THE LIVE CALENDAR: the de-raced pace's numerator, which
 * is the frozen kilometres LESS the races already inside them.
 *
 * The frozen totals in tests/helpers/reference.ts are what the bot had banked on one
 * particular day. A race ridden AFTER that day is not inside them, so subtracting it
 * removes kilometres that were never added — measured at the reference this landed with,
 * roughly 5 km/wk of cycling, in the direction that flatters the de-raced pace and
 * therefore flatters the comparator argument the whole paragraph exists to make. A
 * generated, gated, CI-blessed wrong number is worse than the ungated wrong number it
 * replaces, because a snapshot confers an authority a hand-written comment does not.
 *
 * So this scopes the numerator to the reference, and NOTHING ELSE IS SCOPED THIS WAY.
 * {@link bookedAhead} and {@link goalStatus} take the live year, because their whole
 * subject is races still AHEAD: hand them this list and every race in it has already
 * happened, so nothing is booked, the required rate and the ignoring-races comparator
 * collapse onto the same number, and a "every figure is finite and non-zero" check passes
 * on all of it. The gate that catches that mistake is the strict inequality between the
 * two, asserted below.
 */
const RIDDEN_BY_REFERENCE: readonly RaceEvent[] =
    THIS_YEAR.filter((e) => isRecorded(e) && parseIsoDate(eventEnd(e)) <= REFERENCE);

/**
 * THE RACES THAT SIT IN NEITHER ACCOUNT, and the reason this document names them out loud
 * rather than quietly excluding them.
 *
 * A race recorded AFTER the reference is in neither the frozen kilometres (it had not been
 * ridden) nor the booked figure (it carries a recording, so {@link bookedAhead} calls it
 * ridden and books nothing for it). The required rate published below is therefore the
 * model evaluated with the reference's kilometres against THIS COMMIT's calendar — which
 * is exactly what the same triple has always meant in tests/projection.test.ts, whose
 * pinned rate is the same number this file publishes.
 *
 * THAT IS AN EPOCH MIX AND IT IS DISCLOSED RATHER THAN DESIGNED OUT, because the two
 * available ways to design it out are both worse. Advancing the reference moves every
 * assertion in tests/projection.test.ts, which is a different change from this one.
 * Reconstructing the calendar as it stood at the reference is not possible from the data:
 * a race is often ADDED to `EVENTS` at the moment it is recorded, so a row that post-dates
 * the reference may carry no advertised distance at all and there is nothing to book.
 *
 * What is available is a refusal to publish the mix in silence. The document names every
 * such race and the assertion below fails if it does not, so a future recording cannot
 * quietly widen the gap between the two epochs.
 */
const POST_REFERENCE: readonly RaceEvent[] =
    THIS_YEAR.filter((e) => isRecorded(e) && parseIsoDate(eventEnd(e)) > REFERENCE);

/** The reference's own week counts: elapsed since 1 January, and remaining to 31 December. */
const DAYS_ELAPSED = Math.round((REFERENCE - parseIsoDate(`${GOAL_YEAR}-01-01`)) / MS_PER_DAY) + 1;
const DAYS_LEFT = daysRemaining(AS_OF);

/**
 * BOTH SPANS COUNT BOTH ENDS, and the convention is not free to choose: `daysRemaining`
 * counts the stamped day because {@link bookedAhead} treats a race starting that day as
 * wholly ahead, and the two are the numerator and denominator of one fraction. The elapsed
 * span matches it so the two paces and the requirement are all weeks of the same length.
 * An exclusive elapsed span moves the de-raced pace by about 0.3 km/wk at the reference —
 * small enough to read as a real disagreement rather than as a convention, which is
 * precisely why it is stated here.
 */
const weeksElapsed = DAYS_ELAPSED / 7;
const weeksLeft = DAYS_LEFT / 7;

type Figures = {
    goal: Goal
    frozen: number
    /** Kilometres booked ahead of the reference, from the live calendar. */
    booked: number
    /** `ceil((goal − ridden − booked) / weeks left)` — what the card prints. */
    required: number
    requiredExact: number
    /** The same with nothing booked: the rate the card would ask for without races. */
    ignoringRaces: number
    ignoringRacesExact: number
    /** `frozen / weeks elapsed`. Contains every race already ridden. */
    observed: number
    /** The same numerator less this year's races ridden by the reference. */
    deRaced: number
    raced: number
    racedCount: number
};

function figuresFor(goal: Goal, frozen: number): Figures {
    const status = goalStatus({...goal, raw_progress: frozen}, AS_OF);
    if (status.kind !== "rate") throw new Error(`${goal.sport}: expected a rate at ${AS_OF}, got ${status.kind}`);
    const booked = bookedAhead(goal.sport, AS_OF);
    const raced = RIDDEN_BY_REFERENCE
        .filter((e) => e.sport === goal.sport)
        .reduce((sum, e) => sum + raceKm(e), 0);
    return {
        goal,
        frozen,
        booked,
        required: status.kmPerWeek,
        requiredExact: status.km / weeksLeft,
        ignoringRaces: Math.ceil((goal.total_goal - frozen) / weeksLeft),
        ignoringRacesExact: (goal.total_goal - frozen) / weeksLeft,
        observed: frozen / weeksElapsed,
        deRaced: (frozen - raced) / weeksElapsed,
        raced,
        racedCount: RIDDEN_BY_REFERENCE.filter((e) => e.sport === goal.sport).length,
    };
}

const FIGURES: Figures[] = [
    figuresFor(goalBySport("cycling"), CYCLING_KM),
    figuresFor(goalBySport("running"), RUNNING_KM),
];

/**
 * CEIL AGAINST ROUND, SWEPT RATHER THAN ARGUED. `goalStatus` rounds the required rate UP,
 * and the case for it is that round UNDER-STATES wherever the exact requirement has a
 * fractional part below .5 — a rider following a rounded-down rate exactly misses the goal.
 * One date cannot show that: on most days round and ceil agree, and WHICH days they differ
 * on moves with the numerator, so any single worked example rots on the next data edit.
 * The census does not: it counts the whole rest of the calendar, both sports.
 */
function ceilVsRound(): {sportDays: number, roundUnderstates: number} {
    let sportDays = 0;
    let roundUnderstates = 0;
    const end = parseIsoDate(`${GOAL_YEAR}-12-31`);
    for (let day = REFERENCE; day <= end; day += MS_PER_DAY) {
        const iso = new Date(day).toISOString().slice(0, 10);
        for (const {goal, frozen} of FIGURES) {
            const status = goalStatus({...goal, raw_progress: frozen}, iso);
            if (status.kind !== "rate") continue;
            sportDays++;
            const exact = status.km / (status.days / 7);
            if (Math.round(exact) < exact) roundUnderstates++;
        }
    }
    return {sportDays, roundUnderstates};
}

const n2 = (x: number): string => x.toFixed(2);
const pct = (from: number, to: number): string => `${(100 * (1 - to / from)).toFixed(1)}%`;

function render(): string {
    const sweep = ceilVsRound();
    const [first] = FIGURES;
    const lines: string[] = [];

    lines.push(`# Derived figures — the projection's model at the ${AS_OF} reference, not what the site publishes today`);
    lines.push("");
    lines.push("GENERATED by `tests/derived-figures.test.ts`. Do not edit it by hand: change the");
    lines.push("generator, or change the data and run `pnpm test -u` to see what moved. Every figure");
    lines.push("here exists to make an argument in `src/lib/projection.ts` readable, and each one is");
    lines.push("defined in the table at the foot of this file rather than left to be reverse-engineered.");
    lines.push("");
    lines.push(`The reference is a FROZEN day and a frozen pair of totals — \`AS_OF\`, \`CYCLING_KM\` and`);
    lines.push("`RUNNING_KM` in `tests/helpers/reference.ts` — because the kilometres are rewritten by a");
    lines.push("nightly bot and a suite that read them live would fail a production deploy on an");
    lines.push("ordinary ride. The CALENDAR is not frozen, so read the disclosure below before quoting");
    lines.push("the required rate as a state of the site on that day.");
    lines.push("");
    lines.push(`## The reference`);
    lines.push("");
    lines.push("| | |");
    lines.push("|---|---|");
    lines.push(`| reference day | ${AS_OF} |`);
    for (const f of FIGURES) {
        lines.push(`| ${f.goal.sport} banked by then | ${n2(f.frozen)} km of ${n2(f.goal.total_goal)} |`);
    }
    lines.push(`| days elapsed, 1 January to the reference inclusive | ${DAYS_ELAPSED} (${n2(weeksElapsed)} weeks) |`);
    lines.push(`| days remaining, the reference to 31 December inclusive | ${DAYS_LEFT} (${n2(weeksLeft)} weeks) |`);
    lines.push("");
    lines.push("## Races recorded AFTER the reference");
    lines.push("");
    if (POST_REFERENCE.length === 0) {
        lines.push("None. Every recorded race of this year sits inside the frozen totals, so the figures");
        lines.push("below are one coherent day.");
    } else {
        lines.push("These races are in NEITHER account, and the required rate below is affected by it. Their");
        lines.push("kilometres are not in the frozen totals — they had not been ridden — and they are not in");
        lines.push("the booked figure either, because a race carrying a recording is one the projection");
        lines.push("treats as already ridden. So the required rate is the model evaluated with the");
        lines.push("reference's kilometres against the calendar as this commit holds it, which is the same");
        lines.push("thing the pinned assertions in `tests/projection.test.ts` mean by the same reference.");
        lines.push("");
        for (const e of POST_REFERENCE) {
            lines.push(`- ${e.date} · ${e.sport} · ${e.name} · ${n2(raceKm(e))} km`);
        }
        lines.push("");
        lines.push("The de-raced pace is NOT affected: its numerator subtracts only races that ended on or");
        lines.push("before the reference, which is the one scoping rule this generator applies.");
    }
    lines.push("");
    lines.push("## Per sport");
    lines.push("");
    lines.push(`| figure | ${FIGURES.map((f) => f.goal.sport).join(" | ")} |`);
    lines.push(`|---|${FIGURES.map(() => "---").join("|")}|`);
    const row = (label: string, cell: (f: Figures) => string) =>
        lines.push(`| ${label} | ${FIGURES.map(cell).join(" | ")} |`);
    row("booked ahead", (f) => `${n2(f.booked)} km`);
    row("required rate", (f) => `${f.required} km/wk (exactly ${f.requiredExact.toFixed(4)})`);
    row("ignoring races", (f) => `${f.ignoringRaces} km/wk (exactly ${f.ignoringRacesExact.toFixed(4)})`);
    row("what booking races is worth", (f) => `${f.ignoringRaces} → ${f.required} km/wk, ${pct(f.ignoringRaces, f.required)}`);
    row("observed pace", (f) => `${n2(f.observed)} km/wk`);
    row("de-raced pace", (f) => `${n2(f.deRaced)} km/wk`);
    row("races ridden by the reference", (f) => `${f.racedCount} (${n2(f.raced)} km)`);
    lines.push("");
    lines.push("## The comparator");
    lines.push("");
    lines.push("A pace displayed beside the required rate must be the DE-RACED one. The required rate");
    lines.push("already has future race kilometres subtracted; setting it beside an observed pace that");
    lines.push("still contains past race kilometres reimports the double count by juxtaposition. The");
    lines.push("ORDERING is the rule and the gaps move:");
    lines.push("");
    for (const f of FIGURES) {
        const ordered = f.deRaced < f.required && f.required < f.observed;
        const note = f.racedCount === 0
            ? " — nothing was recorded for this sport by the reference, so the two paces are the same figure and this sport cannot demonstrate the rule"
            : ordered
                ? " — de-raced < required < observed, the requirement sitting BETWEEN the two paces"
                : " — the requirement does not sit between the two paces at this reference";
        lines.push(`- ${f.goal.sport}: ${n2(f.deRaced)} de-raced · ${f.required} required · ${n2(f.observed)} observed${note}`);
    }
    lines.push("");
    lines.push("## Ceil against round");
    lines.push("");
    lines.push(`Over every day from the reference to 31 December, both sports: **${sweep.sportDays}** sport-days`);
    lines.push(`land in the rate branch, and on **${sweep.roundUnderstates}** of them rounding the requirement`);
    lines.push("to nearest would ask for LESS than the goal needs. That is the whole case for rounding up:");
    lines.push("a rider following a rounded-down rate exactly misses the goal, and which days discriminate");
    lines.push("moves with the numerator, so no single worked example survives a data edit.");
    lines.push("");
    lines.push("## How each figure is derived");
    lines.push("");
    lines.push("| figure | derivation |");
    lines.push("|---|---|");
    lines.push("| days remaining | the reference to 31 December, counting BOTH ends |");
    lines.push("| days elapsed | 1 January to the reference, counting BOTH ends |");
    lines.push("| booked ahead | the distance of every race of that sport the patch wall still calls booked |");
    lines.push("| required rate | `ceil((total goal − banked − booked ahead) / weeks remaining)` |");
    lines.push("| ignoring races | the same with nothing booked, also rounded up |");
    lines.push("| observed pace | banked / weeks elapsed |");
    lines.push("| de-raced pace | the same denominator; the numerator less this year's races RIDDEN BY THE REFERENCE |");
    lines.push("| ceil against round | every day from the reference to 31 December × both sports, counting the days in the rate branch and then those where rounding to nearest under-states |");
    lines.push("");
    lines.push("Every argument these figures serve is written out in `src/lib/projection.ts`: the double");
    lines.push("count and the comparator rule at the head of the file, the rounding rule above the rate");
    lines.push("branch, and what the rate is already assuming above `withBooked`. The figures live here");
    lines.push(`because they rot and the arguments do not — the ${first.goal.sport} card is the one they are made on.`);
    lines.push("");
    return lines.join("\n");
}

describe("the projection's derived figures", () => {
    /**
     * THE SCOPING RULE, ASSERTED ON A FIXTURE RATHER THAN ON THE CALENDAR, because the
     * calendar is exactly the thing that moves. A race recorded after the reference must be
     * excluded from the de-raced numerator and named in the document; a race recorded before
     * it must be inside the numerator. Both directions, because an exclusion that widened to
     * everything would leave the de-raced pace equal to the observed one and pass any
     * "finite and non-zero" check.
     */
    it("keeps the de-raced numerator inside the frozen totals", () => {
        const ridden = new Set(RIDDEN_BY_REFERENCE);
        const named = new Set(POST_REFERENCE);
        for (const e of THIS_YEAR.filter(isRecorded)) {
            const after = parseIsoDate(eventEnd(e)) > REFERENCE;
            expect(ridden.has(e), `${e.date} ${e.name} is ${after ? "after" : "on or before"} ${AS_OF}`).toBe(!after);
            expect(named.has(e), `${e.date} ${e.name} must be disclosed if it post-dates the reference`).toBe(after);
        }
        expect(RIDDEN_BY_REFERENCE.length + POST_REFERENCE.length,
            "no recorded race of this year at all — every figure below would be vacuous")
            .toBe(THIS_YEAR.filter(isRecorded).length);
        expect(RIDDEN_BY_REFERENCE.length, "nothing was ridden by the reference, so the de-raced pace is the observed one")
            .toBeGreaterThan(0);
    });

    /**
     * THE CHECK THAT CATCHES THE ONE MISTAKE A "FINITE AND NON-ZERO" SWEEP CANNOT SEE.
     * Handing the reference-scoped list to {@link bookedAhead} books nothing, and the two
     * rates collapse onto one number while every figure stays perfectly finite.
     */
    it("asks more of a sport that books no races than of one that does", () => {
        for (const f of FIGURES) {
            expect(f.booked, `${f.goal.sport}: nothing is booked, so the live calendar did not reach bookedAhead`)
                .toBeGreaterThan(0);
            expect(f.ignoringRaces, `${f.goal.sport}: the ignoring-races comparator must exceed the required rate`)
                .toBeGreaterThan(f.required);
        }
    });

    it("publishes no figure that is not a finite number", () => {
        for (const f of FIGURES) {
            for (const [name, value] of Object.entries(f)) {
                if (typeof value !== "number") continue;
                expect(Number.isFinite(value), `${f.goal.sport}.${name} is ${value}`).toBe(true);
            }
            for (const rate of ["required", "observed", "deRaced", "ignoringRaces"] as const) {
                expect(f[rate], `${f.goal.sport}.${rate} is zero`).toBeGreaterThan(0);
            }
        }
        expect(DAYS_ELAPSED).toBeGreaterThan(0);
        expect(DAYS_LEFT).toBeGreaterThan(0);
    });

    /**
     * THE GENERATED FILE. `toMatchFileSnapshot` writes it on `pnpm test -u` and FAILS on a
     * mismatch otherwise — including under CI, which is what makes this a gate rather than a
     * build artifact: a data edit that moves a figure reddens the deploy until somebody has
     * looked at the diff.
     */
    it("matches the published document", async () => {
        await expect(render()).toMatchFileSnapshot("../src/lib/derived-figures.md");
    });
});
