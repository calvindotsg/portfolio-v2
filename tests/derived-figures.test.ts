import {describe, expect, it} from "vitest";

import {GOALS, GOAL_YEAR, type Goal, type RaceEvent, type Recording, raceKm, recordingsOf, type Sport} from "../src/lib/constants";
import {bookedAhead, daysRemaining, eventsInYear, goalStatus, parseIsoDate, patchState} from "../src/lib/projection";
import {AS_OF, CYCLING_KM, RUNNING_KM} from "./helpers/reference";

/**
 * THE FIGURES THAT USED TO BE TYPED INTO A COMMENT, GENERATED INSTEAD.
 *
 * src/lib/projection.ts argues its design in numbers — a required rate against the pace
 * it replaces, a comparator that must be the de-raced pace and not the observed one, a
 * rounding rule that ceil gets right and round gets wrong. Every one of those arguments
 * needs a worked example to be readable, and every worked example was typed by hand into
 * a comment that nothing could check. On the tree this file landed against, every figure in
 * that block except the ceiled required rate was wrong at once, with the suite green.
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
 * THE TWO SCOPING PREDICATES, TAKING THEIR CALENDAR AND THEIR REFERENCE AS ARGUMENTS rather
 * than closing over the live ones. That is what lets a fixture below exercise the rule on a
 * calendar somebody chose: a test that re-implements the filter it is checking asserts that
 * two copies of one expression agree, which they always will.
 */
const riddenBy = (events: readonly RaceEvent[], ref: number): readonly RaceEvent[] =>
    events.filter((e) => isRecorded(e) && parseIsoDate(eventEnd(e)) <= ref);
const recordedAfter = (events: readonly RaceEvent[], ref: number): readonly RaceEvent[] =>
    events.filter((e) => isRecorded(e) && parseIsoDate(eventEnd(e)) > ref);

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
 * on all of it. What catches that mistake is {@link BOOKED_AT_REFERENCE} below: the wall
 * still books the same races while every booked figure goes to zero, and the two are held
 * against each other sport by sport.
 */
const RIDDEN_BY_REFERENCE: readonly RaceEvent[] = riddenBy(THIS_YEAR, REFERENCE);

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
 * What is available is a refusal to publish the mix in silence, and it is worth being exact
 * about how much that buys. NOTHING HERE BOUNDS THE MIX: a race recorded tomorrow widens the
 * gap between the two epochs, and every assertion in this file stays green while it does.
 * What the generator does instead is name every such race and PRICE it — the kilometres, the
 * km/wk they overstate the required rate by, and that rate's share of the published figure —
 * and the snapshot then puts the new race and the new price in front of a reviewer before the
 * document can ship. A bound would have to pick a percentage nobody can defend, and its only
 * remedy is to advance the reference, which moves every assertion in
 * tests/projection.test.ts and is a different change from this one.
 */
const POST_REFERENCE: readonly RaceEvent[] = recordedAfter(THIS_YEAR, REFERENCE);

/**
 * WHAT THE WALL ITSELF CALLS BOOKED AT THE REFERENCE, asked of {@link patchState} rather than
 * re-derived, because it is the gate on `booked` below and a gate that re-derives its subject
 * cannot fail. It is computed HERE and not inside {@link figuresFor} on purpose: under the one
 * wiring mistake this file is most afraid of — handing the reference-scoped list to
 * {@link bookedAhead} — this set stays exactly as it is while every `booked` figure collapses
 * to zero, which is the disagreement the assertion reads.
 */
const BOOKED_AT_REFERENCE: readonly RaceEvent[] = THIS_YEAR.filter((e) => patchState(e, AS_OF) === "booked");

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
    /** This sport's share of the epoch mix: kilometres ridden after the reference, in neither account. */
    unaccounted: number
    /** What that share overstates the required rate by, in the rate's own units. */
    unaccountedRate: number
};

/** One sport's distance out of a list of races, through {@link raceKm} like every other consumer. */
const kmOfSport = (events: readonly RaceEvent[], sport: Sport): number =>
    events.filter((e) => e.sport === sport).reduce((sum, e) => sum + raceKm(e), 0);

function figuresFor(goal: Goal, frozen: number): Figures {
    const status = goalStatus({...goal, raw_progress: frozen}, AS_OF);
    if (status.kind !== "rate") throw new Error(`${goal.sport}: expected a rate at ${AS_OF}, got ${status.kind}`);
    const booked = bookedAhead(goal.sport, AS_OF);
    const raced = kmOfSport(RIDDEN_BY_REFERENCE, goal.sport);
    const unaccounted = kmOfSport(POST_REFERENCE, goal.sport);
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
        unaccounted,
        unaccountedRate: unaccounted / weeksLeft,
    };
}

/**
 * THE ORDERING THE COMPARATOR SECTION EXISTS TO SHOW, as a predicate rather than as a
 * sentence, because the section's heading has to be able to ask whether any sport actually
 * demonstrates it. A sport with nothing recorded by the reference demonstrates nothing: its
 * two paces are one figure.
 */
const demonstratesOrdering = (f: Figures) => f.racedCount > 0 && f.deRaced < f.required && f.required < f.observed;

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

/**
 * THE DISCLOSURE SECTION'S BODY, AS A FUNCTION OF THE RACES IT DISCLOSES, so the fixture
 * below can read what a given calendar would publish instead of trusting that it would.
 * The empty arm is the one this repository's own data has never reached, which is exactly
 * the arm a reader would assume works.
 */
function disclosure(post: readonly RaceEvent[]): string[] {
    const lines: string[] = [];
    if (post.length === 0) {
        lines.push("None. Every recorded race of this year sits inside the frozen totals, so the figures");
        lines.push("below are one coherent day.");
        return lines;
    }
    lines.push("These races are in NEITHER account, and the required rate below is affected by it. Their");
    lines.push("kilometres are not in the frozen totals — they had not been ridden — and they are not in");
    lines.push("the booked figure either, because a race carrying a recording is one the projection");
    lines.push("treats as already ridden. So the required rate is the model evaluated with the");
    lines.push("reference's kilometres against the calendar as this commit holds it, which is the same");
    lines.push("thing the pinned assertions in `tests/projection.test.ts` mean by the same reference.");
    lines.push("");
    for (const e of post) {
        lines.push(`- ${e.date} · ${e.sport} · ${e.name} · ${n2(raceKm(e))} km`);
    }
    lines.push("");
    lines.push("WHAT THE MIX IS WORTH, which is the half a list of names leaves out. Those kilometres");
    lines.push("were ridden and are not in the frozen totals, so the required rate below asks for them a");
    lines.push("second time — by this much:");
    lines.push("");
    for (const f of FIGURES) {
        const km = kmOfSport(post, f.goal.sport);
        if (km === 0) continue;
        const rate = km / weeksLeft;
        lines.push(`- ${f.goal.sport}: the required rate is overstated by ${n2(rate)} km/wk `
            + `(${n2(km)} km / ${n2(weeksLeft)} weeks), `
            + `${(100 * rate / f.requiredExact).toFixed(1)}% of the ${f.requiredExact.toFixed(4)} published below`);
    }
    lines.push("");
    lines.push("The de-raced pace is NOT affected: its numerator subtracts only races that ended on or");
    lines.push("before the reference, which is the one scoping rule this generator applies.");
    return lines;
}

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
    lines.push(...disclosure(POST_REFERENCE));
    lines.push("");
    lines.push("## Per sport");
    lines.push("");
    lines.push(`| figure | ${FIGURES.map((f) => f.goal.sport).join(" | ")} |`);
    lines.push(`|---|${FIGURES.map(() => "---").join("|")}|`);
    const row = (label: string, cell: (f: Figures) => string) =>
        lines.push(`| ${label} | ${FIGURES.map(cell).join(" | ")} |`);
    row("booked ahead", (f) => `${n2(f.booked)} km`);
    // THE CAVEAT TRAVELS WITH THE CELL, not only with the prose two sections up, because a
    // figure is quoted by being copied out of a table and the paragraph does not come with it.
    // Unconditional in form: the sentence is true at any size of mix, zero included, so there
    // is no threshold here to argue about or to drift past.
    row("required rate", (f) =>
        `${f.required} km/wk (exactly ${f.requiredExact.toFixed(4)}; ${n2(f.unaccountedRate)} of that is the epoch mix)`);
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
    lines.push("still contains past race kilometres reimports the double count by juxtaposition.");
    lines.push("");
    // THE HEADING IS DERIVED, so this section cannot announce a rule and then print its
    // negation underneath. Which arm fires is a loud diff in a generated file, which is the
    // job this document already gives the snapshot.
    if (FIGURES.some(demonstratesOrdering)) {
        lines.push("The ORDERING is the rule and the gaps move:");
    } else {
        lines.push("The de-raced pace is always the LOWER of the two — same denominator, a numerator less");
        lines.push("this year's races — and that much holds on any calendar. Where the REQUIREMENT falls");
        lines.push("between them is not a rule but a fact about the year, and at this reference no sport");
        lines.push("puts it there. Read the lines below as a counter-example to the ordering sentence in");
        lines.push("`src/lib/projection.ts`, not as an illustration of it:");
    }
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
    lines.push("| what booking races is worth | the reduction from the second of those rates to the first, taken between them AS ROUNDED UP rather than between their exact values — both operands are printed in the cell |");
    lines.push("| observed pace | banked / weeks elapsed |");
    lines.push("| de-raced pace | the same denominator; the numerator less this year's races RIDDEN BY THE REFERENCE |");
    lines.push("| races ridden by the reference | this year's races of that sport carrying BOTH a finishing time and a recording — the pair the projection reads as \"run\" — and ending on or before the reference day; the count, and the distance they add up to |");
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
     * THE SCOPING RULE, ON A CALENDAR THIS TEST CHOSE, which is the only way to ask the
     * question at all: the live case below compares two lists built by the very predicates it
     * would then re-check, so it can only ever agree with itself.
     *
     * FOUR RACES, AND THE ONE RECORDED ON THE DAY IS THE ONE THAT EARNS ITS PLACE. A race ON the
     * reference day sits on the boundary the rule is drawn at, and `<=` narrowing to `<` is
     * green on every other race in the fixture — before, after and booked all keep their side.
     * The booked race is here for the other half of the rule: neither list may hold a race
     * with nothing recorded, whatever day it falls on.
     *
     * THE REFERENCE IS A LITERAL, NOT `AS_OF`. A fixture that moves when the frozen reference
     * advances is a fixture that stops testing the boundary it was written for.
     */
    it("puts a race on either side of the reference, and one exactly on it", () => {
        const REF = parseIsoDate("2026-07-27");
        const recorded = (metres: number): readonly [Recording, ...Recording[]] =>
            [{id: "1", metres, elapsed_time: "1:00:00"}];
        const ran = (name: string, date: string): RaceEvent =>
            ({date, name, sport: "running", country: "Singapore", elapsed_time: "1:00:00", recordings: recorded(10000)});
        const calendar: readonly RaceEvent[] = [
            ran("Fixture BEFORE", "2026-07-01"),
            ran("Fixture ON THE DAY", "2026-07-27"),
            ran("Fixture AFTER", "2026-08-02"),
            {date: "2026-09-01", name: "Fixture BOOKED", sport: "running", country: "Singapore", advertised_km: 10},
        ];

        expect(riddenBy(calendar, REF).map((e) => e.name))
            .toEqual(["Fixture BEFORE", "Fixture ON THE DAY"]);
        expect(recordedAfter(calendar, REF).map((e) => e.name)).toEqual(["Fixture AFTER"]);

        const named = disclosure(recordedAfter(calendar, REF)).join("\n");
        expect(named, "the disclosure must name the race that sits in neither account").toContain("Fixture AFTER");
        for (const silent of ["Fixture BEFORE", "Fixture ON THE DAY", "Fixture BOOKED"]) {
            expect(named, `${silent} is accounted for and must not be disclosed as though it were not`)
                .not.toContain(silent);
        }
        expect(disclosure([]).join("\n"), "the empty arm is never exercised by the live calendar")
            .toContain("None.");
    });

    /**
     * THE LIVE CALENDAR'S OWN FLOOR, WHICH IS A DIFFERENT QUESTION FROM THE ONE ABOVE. This
     * cannot check the split — both lists come out of the same two predicates the fixture
     * exercises — and it is not trying to. What it can do is refuse a calendar on which every
     * figure below would be vacuous: no recorded race at all leaves the de-raced pace equal to
     * the observed one, and the comparator section demonstrates nothing while staying finite,
     * non-zero and perfectly green. It also holds the two lists to ONE source: they partition
     * this year's recorded races, so pointing one of them at a different list is caught here
     * rather than in the published document.
     */
    it("refuses a calendar on which the de-raced pace would be the observed one", () => {
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
     *
     * IT ASKS THE WALL, NOT THE TREE, AND THAT IS THE WHOLE DIFFERENCE. This used to require
     * every sport to book something, which is a claim about the calendar rather than about the
     * arithmetic: recording the last remaining running race of the year — a legal, ordinary,
     * imminent data edit — makes running's booked figure honestly zero and reddens a correct
     * build, with `pnpm test -u` powerless to clear it. So the exempt case is ASSERTED rather
     * than skipped: a sport the wall books nothing for must book nothing here either, which is
     * a real gate in the opposite direction and the arm that would otherwise be a hole.
     *
     * THE STRICT INEQUALITY IS BETWEEN THE EXACT RATES, NEVER THE CEILED ONES. `ignoringRaces
     * > required` on the published integers is not an invariant: two small booked races put
     * both ceilings on the same number, and the suite goes red on a calendar that is simply
     * true. Exactly, the comparison reduces to `booked / weeks left > 0`, which holds wherever
     * anything is booked at all. The unconditional half — that booking races can never RAISE
     * the requirement — is asserted for every sport on the ceiled figures, where it is safe.
     */
    it("books what the wall books, and asks less of a sport once its own races count", () => {
        for (const f of FIGURES) {
            const bookedRaces = BOOKED_AT_REFERENCE.filter((e) => e.sport === f.goal.sport);
            expect(f.booked, `${f.goal.sport}: a booked distance cannot be negative`).toBeGreaterThanOrEqual(0);
            expect(f.ignoringRaces, `${f.goal.sport}: booking races RAISED the required rate, which no calendar can do`)
                .toBeGreaterThanOrEqual(f.required);
            if (bookedRaces.length === 0) {
                expect(f.booked, `${f.goal.sport}: the wall books no race of this sport at ${AS_OF}, so nothing may be booked here either`)
                    .toBe(0);
            } else {
                expect(f.booked, `${f.goal.sport}: the wall books ${bookedRaces.length} race(s) at ${AS_OF} and this figure is zero, so the live calendar did not reach bookedAhead`)
                    .toBeGreaterThan(0);
                expect(f.ignoringRacesExact, `${f.goal.sport}: kilometres are booked, so ignoring them must ask for strictly more`)
                    .toBeGreaterThan(f.requiredExact);
            }
        }
        expect(BOOKED_AT_REFERENCE.length + RIDDEN_BY_REFERENCE.length + POST_REFERENCE.length,
            "this year's calendar holds no race the wall books and none it calls run — every arm above is vacuous")
            .toBeGreaterThan(0);
    });

    /**
     * THE COMPARATOR SECTION MAY NOT PUBLISH THE NEGATION OF ITS OWN HEADING, which it could:
     * the per-sport lines have an honest arm for a sport whose requirement does NOT sit between
     * the two paces, and it used to print under a heading announcing that the ordering is the
     * rule. Recording one more race is enough to reach it, with every other assertion here
     * green and `pnpm test -u` happily writing the contradiction into the file.
     *
     * THE FIRST ASSERTION IS THE ONE THAT CAN NEVER REDDEN ON CORRECT DATA, and it is the
     * durable half of the claim: same denominator, a numerator less this year's races, so the
     * de-raced pace is below the observed one wherever anything was raced and equal to it
     * where nothing was. Where the REQUIREMENT falls is a fact about the year, so it is gated
     * as consistency between the heading and the lines rather than as an ordering.
     */
    it("never publishes a comparator section that contradicts its own heading", () => {
        for (const f of FIGURES) {
            if (f.racedCount > 0) {
                expect(f.deRaced, `${f.goal.sport}: races were subtracted and the pace did not fall`)
                    .toBeLessThan(f.observed);
            } else {
                expect(f.deRaced, `${f.goal.sport}: nothing was raced, so the two paces must be one figure`)
                    .toBe(f.observed);
            }
        }
        const doc = render();
        const from = doc.indexOf("## The comparator");
        const to = doc.indexOf("\n## ", from + 1);
        const section = doc.slice(from, to === -1 ? undefined : to);
        expect(section.includes("The ORDERING is the rule and the gaps move:")
            && section.includes("the requirement does not sit between the two paces at this reference"),
        "the comparator section announces the ordering as a rule and then prints a sport that breaks it")
            .toBe(false);
        expect(FIGURES.filter((f) => f.racedCount > 0).length,
            "no sport raced anything by the reference, so this section can neither show the ordering nor break it")
            .toBeGreaterThan(0);
    });

    /**
     * THE CENSUS'S OWN FLOOR. `ceilVsRound` is the one derivation here with no figure to be
     * wrong about — it publishes two counts — so the way it fails is by counting nothing and
     * reading as an argument anyway.
     */
    it("sweeps a census the rounding argument can rest on", () => {
        const sweep = ceilVsRound();
        expect(sweep.sportDays,
            "no day from the reference to the year end lands in the rate branch, so the census is empty")
            .toBeGreaterThan(0);
        expect(sweep.roundUnderstates,
            "round never under-states at this reference, so this section argues nothing")
            .toBeGreaterThan(0);
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
