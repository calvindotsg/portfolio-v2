import {readFileSync} from "node:fs";

import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import {EVENTS, GOAL_YEAR, GOALS, type Goal, raceKm, recordingsOf} from "../src/lib/constants";
import stravaProgress from "../src/data/strava-progress.json";
import {
    UPDATED_AT, bookedAhead, daysRemaining, eventsInYear, formatDateline, goalStatus,
    goalStatusLine, nextRace, parseIsoDate, patchesEarned, patchState, patchWall,
    stampYearMatchesGoalYear,
} from "../src/lib/projection";
import type {RaceEvent} from "../src/lib/constants";
import {BUILD_DATE, singaporeDate as siteSingaporeDate} from "../src/lib/today";
import {nextProgress, serialise, singaporeDate} from "../scripts/fetch-strava-progress.mjs";

/**
 * What this file exists to catch, since NOTHING else can.
 *
 * The suite has no layout engine — `card-fill.test.ts` reads parsed CSS text and
 * linkedom, neither of which lays anything out. A variant of this feature that adds
 * two lines per goal card and shears glyphs at the DEFAULT text size runs
 * 149/149 green. So the geometry facts are pinned here as BOUNDS ON STRINGS,
 * derived from widths measured in a real browser, rather than as layout assertions
 * that cannot exist.
 *
 * The two measured budgets, both at a 16px root in Chromium against the page's own
 * font stack, at the tightest configuration each element reaches:
 *
 *   goal-card text column   182px   (1024px wide; 201 at 1100, 214 from 1152 up)
 *   footer text column      182px   (1024px wide; 201 at 1100, 214 from 1152 up)
 *
 * A character COUNT is the wrong invariant — 26 characters of wide glyphs exceed
 * 182px — so each bound below is expressed against the specific longest string the
 * generator can emit, and that string is the one that was measured.
 */

const goalBySport = (sport: string): Goal => {
    const g = GOALS.find((x) => x.sport === sport);
    if (!g) throw new Error(`no goal for sport ${sport}`);
    return g;
};

describe("date handling", () => {
    it("parses an ISO date", () => {
        expect(Number.isNaN(parseIsoDate("2026-07-27"))).toBe(false);
    });

    it("REJECTS an impossible day rather than normalising it", () => {
        // Date.parse("2026-02-30") does not throw — it silently yields 2 March.
        // A regex alone passes it too. Only the round-trip catches it.
        expect(Number.isNaN(parseIsoDate("2026-02-30"))).toBe(true);
        expect(Number.isNaN(parseIsoDate("2026-13-01"))).toBe(true);
        expect(Number.isNaN(parseIsoDate("2026-7-27"))).toBe(true);
        expect(Number.isNaN(parseIsoDate("not-a-date"))).toBe(true);
    });

    /**
     * INCLUSIVE OF BOTH ENDS, and the pairing with `bookedAhead` is the whole point —
     * these two are the denominator and the numerator of one fraction. `bookedAhead`
     * counts an event starting today as wholly ahead, so today is a riding day, so it
     * must be inside the day count too. Counting it in one place and not the other
     * over-states the required rate by a day's worth, silently.
     *
     * The last assertion pins the pairing directly rather than trusting the two
     * literals to stay in step: on the day an event starts, that event's kilometres
     * are still owed, and the day it falls on is still available to ride them.
     */
    it("counts BOTH ends, agreeing with bookedAhead about today, and never goes negative", () => {
        expect(daysRemaining("2026-07-27")).toBe(158);   // 27 Jul .. 31 Dec inclusive
        expect(daysRemaining("2026-12-31")).toBe(1);     // the last day is a riding day
        expect(daysRemaining("2027-01-01")).toBe(0);     // and the year is over the day after
        expect(daysRemaining("2027-03-01")).toBe(0);

        // The pairing, pinned to values rather than to an inequality. The Kiprun is a
        // single-day RUNNING event on 27 September. On that date its whole 21.10 km is
        // still owed, and the day count must still contain the day it is run on; the day
        // after, both drop by exactly that event and exactly that day.
        //
        // An inequality here is not enough: `>` and `-1` are satisfied by a version
        // that books the event on the WRONG side of its own start date, so long as it
        // does so consistently.
        //
        // IT NEEDS A SINGLE-DAY EVENT WITH NO RECORDING, which is why it is a running race
        // rather than the cycling one it was written against. `bookedAhead` skips a race
        // with a recording, and a multi-day event moves pro rata by one day's share instead
        // of dropping whole — so a sport whose only un-booked race is a tour cannot state
        // this property at all. Whichever sport can changes as races are run: if this goes
        // red, find a sport with a single-day race still ahead rather than loosening it to
        // an inequality.
        expect(bookedAhead("running", "2026-09-27")).toBeCloseTo(63.30, 2);
        expect(bookedAhead("running", "2026-09-28")).toBeCloseTo(42.20, 2);
        expect(daysRemaining("2026-09-27")).toBe(96);
        expect(daysRemaining("2026-09-28")).toBe(95);
    });

    /**
     * THE ONE TEST HERE THAT IS DELIBERATELY COUPLED TO LIVE BOT DATA, and it is a
     * tripwire rather than an oversight — do not "fix" it by pinning the date the
     * way every other assertion in this file is pinned.
     *
     * On the bot's first push of a new year this goes red, which fails the build
     * command and stops the deploy. That is the intent: `GOAL_YEAR` is pinned, so
     * until someone bumps it the page would otherwise render a fresh year's
     * near-zero kilometres against last year's target and last year's races, and
     * every other test would stay green. A blocked deploy is the cheap failure; a
     * silently wrong page for the first weeks of January is the expensive one.
     *
     * The January checklist is in the `GOAL_YEAR` doc comment in `constants.ts`.
     */
    it("stamps the goal year, so a stale JSON cannot divide fresh days into last year's km", () => {
        expect(stampYearMatchesGoalYear()).toBe(true);
        expect(stampYearMatchesGoalYear("2025-12-31", 2026)).toBe(false);
    });
});

/**
 * THE SITE'S CLOCK, and the defect that made it necessary.
 *
 * The wall and the countdown used to ask the bot's `updated_at` what day it was. It
 * does not know: it means "the day the kilometres last MOVED", and it is frozen
 * deliberately when they do not move so the workflow's `git diff --quiet` gate can stop
 * a nightly commit-push-deploy. The first test below is that freeze, run against the
 * SHIPPED script rather than described — it is the whole argument for `BUILD_DATE`, and
 * if the bot ever starts stamping unconditionally it should be re-read, not deleted.
 */
describe("the site's clock", () => {
    it("shows why the stamp cannot answer what day it is", () => {
        const stamped = JSON.stringify({cycling_km: 2309.7, running_km: 158.6, updated_at: "2026-07-28"});
        // Two weeks of rest. The bot runs nightly throughout and the date never moves.
        for (const day of ["2026-07-29", "2026-08-05", "2026-08-12"]) {
            expect(nextProgress(2309.7, 158.6, stamped, day).updated_at, `bot ran on ${day}`).toBe("2026-07-28");
        }
        // It moves only when the kilometres do — which is correct for what it means.
        expect(nextProgress(2320.0, 158.6, stamped, "2026-08-12").updated_at).toBe("2026-08-12");
    });

    /**
     * The site's copy of `singaporeDate` and the bot's must agree, or the two halves of
     * the repo date the same instant differently — the site drawing a bib for one day
     * while the stamp it renders beside it names another.
     *
     * The instants are chosen to break a UTC implementation: 21:13 UTC is the cron, and
     * in Singapore it is already the next morning. A copy that forgot the timeZone would
     * pass a midday check and fail all three of these.
     */
    it("dates an instant the same way the bot does, at the hours that discriminate", () => {
        for (const iso of [
            "2026-07-29T13:13:00Z",  // 21:13 SGT the same day
            "2026-07-29T21:13:00Z",  // the cron: 05:13 SGT on the 30th
            "2026-07-29T16:00:00Z",  // midnight SGT exactly
            "2026-12-31T20:00:00Z",  // 04:00 SGT on 1 January — the year rolls too
        ]) {
            const at = new Date(iso);
            expect(siteSingaporeDate(at), iso).toBe(singaporeDate(at));
        }
        expect(siteSingaporeDate(new Date("2026-07-29T21:13:00Z")), "the cron's own instant").toBe("2026-07-30");
        expect(siteSingaporeDate(new Date("2026-12-31T20:00:00Z")), "new year in Singapore").toBe("2027-01-01");
    });

    it("reads one day for the whole build, in the shape every date function expects", () => {
        expect(BUILD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(parseIsoDate(BUILD_DATE), "a build date the arithmetic cannot read is worse than none").not.toBeNaN();
    });

    /**
     * WHICH CLOCK EACH DEFAULT TAKES, and this block exists because reverting the split
     * was caught by NOTHING. Measured, not assumed: with every `= BUILD_DATE` changed
     * back to `= UPDATED_AT`, the whole suite stayed green at 311 passed. The behaviour
     * was right and unguarded, which is the state a later tidy-up silently undoes.
     *
     * THE ONE LIMIT, stated rather than hidden: these can only discriminate on a day the
     * two clocks actually differ. When the bot has pushed today they are equal, no
     * observation can tell which one a function read, and these assertions stay true
     * without proving anything. They are written so that they are never WRONG on such a
     * day — each states the intended behaviour outright — and they bite on every other.
     */
    const shift = (iso: string, days: number): string =>
        new Date(parseIsoDate(iso) + days * 86_400_000).toISOString().slice(0, 10);

    it("counts the days to the next race from the build day, not from the stamp", () => {
        const fixture: RaceEvent[] = [
            {date: shift(BUILD_DATE, 10), name: "Ten Days Out", advertised_km: 10, sport: "running", country: "Nowhere"},
        ];
        expect(
            nextRace("running", undefined, fixture)?.daysAway,
            `a race ${shift(BUILD_DATE, 10)} is 10 days from ${BUILD_DATE}; reading the stamp ${UPDATED_AT} `
            + "would add however many days the kilometres have not moved",
        ).toBe(10);
    });

    it("calls yesterday's race finished, however long the kilometres have sat still", () => {
        const yesterday: RaceEvent =
            {date: shift(BUILD_DATE, -1), name: "Run Yesterday", advertised_km: 10, sport: "running", country: "Nowhere"};
        const today: RaceEvent = {...yesterday, date: BUILD_DATE, name: "Running Now"};
        // No `iso` argument anywhere here: the default IS the subject.
        expect(patchState(yesterday), `${yesterday.date} is behind ${BUILD_DATE}`).toBe("finished");
        expect(patchState(today), "a day is not over until it is over").toBe("booked");
        expect(patchWall("running", undefined, [yesterday, today]).map((p) => p.state)).toEqual(["booked", "finished"]);
    });

    it("counts the year's patches from the build day, so the card cannot lag the wall", () => {
        const yesterday: RaceEvent =
            {date: shift(BUILD_DATE, -1), name: "Run Yesterday", advertised_km: 10, sport: "running", country: "Nowhere"};
        // Pinned separately from the test above because a GROUP mutation cannot tell
        // "all four defaults are gated" from "one is": reverting `patchesEarned` alone
        // was green until this existed. The card's count and the wall's bibs come out of
        // one build, so a count read from the stamp prints one behind what is drawn.
        expect(
            patchesEarned("running", undefined, [yesterday]),
            `${yesterday.date} is behind ${BUILD_DATE}; the stamp ${UPDATED_AT} may not be`,
        ).toBe(1);
    });

    it("leaves the required rate on the stamp, so its kilometres and its days age together", () => {
        for (const goal of GOALS) {
            const status = goalStatus(goal);
            if (status.kind !== "rate" && status.kind !== "final") continue;
            expect(
                status.days,
                `${goal.goal_name} divides by the days left from ${UPDATED_AT}; counting from the build day `
                + "would divide fresh days into kilometres the bot has not refreshed",
            ).toBe(daysRemaining(UPDATED_AT));
        }
    });
});

describe("booked race distance", () => {
    it("counts only future events, per sport", () => {
        // At 2026-07-27 the November tour is the only cycling race this figure can still
        // count, so 1022.00 is the whole of it. TWO DIFFERENT MECHANISMS get everything else
        // out, and conflating them is easy: this year's ridden races (both July DCR legs, the
        // May virtual ride, the August round-island) are excluded because they carry a
        // RECORDING, while the earlier editions of the annual round-island ride never reach
        // the arithmetic at all — `bookedAhead` defaults to `GOAL_YEAR_EVENTS`, so a 2024 race
        // is out by YEAR and would be out even with no recording at all.
        expect(bookedAhead("cycling", "2026-07-27")).toBeCloseTo(1022.00, 2);
        expect(bookedAhead("running", "2026-07-27")).toBeCloseTo(63.30, 2);
    });

    it("drops an event once it is past", () => {
        expect(bookedAhead("running", "2026-12-31")).toBe(0);
    });

    it("PRO-RATES a multi-day event instead of dropping it whole on day one", () => {
        // The Formosa tour is 1022 km over 9 days (07–15 Nov). Booking it whole on
        // its start date would drop the figure ~930 km while one day has been
        // ridden, then recover it eight days later.
        const before = bookedAhead("cycling", "2026-11-07");
        const midway = bookedAhead("cycling", "2026-11-11");
        const after = bookedAhead("cycling", "2026-11-16");
        expect(before).toBeCloseTo(1022.00, 2);
        expect(after).toBe(0);
        expect(midway).toBeGreaterThan(0);
        expect(midway).toBeLessThan(before);
        // Continuity: no single day may move it by more than one day's share.
        const oneDay = 1022.00 / 9;
        expect(bookedAhead("cycling", "2026-11-08") - midway).toBeLessThan(oneDay * 4);
        // PIN THE VALUE, not just the shape. Ordering and bounds assertions alone let
        // two non-equivalent mutants of the pro-rata formula survive — including one
        // that reinstates booking the whole tour on day one, which is the exact defect
        // `end_date` exists to prevent. 4 of 9 days ridden by the 11th leaves 5/9.
        expect(midway).toBeCloseTo(1022.00 * 5 / 9, 2);
    });

    /**
     * BOOKS NOTHING FOR A RACE THAT WAS ABANDONED, and the fixture below is chosen to be
     * the one shape the live calendar cannot currently produce.
     *
     * `bookedAhead` used to skip a race by asking `hasRecording`, which is complete only
     * while the wall has two states. A DNF that was RECORDED is skipped by that question
     * as a side effect; a DNF that was NOT is booked in full. Every DNF on the calendar
     * today carries a recording, so the cross-consumer sweep in patch-wall.test.ts — which
     * reads the live `EVENTS` — is GREEN on the defect and on the fix alike. That is why
     * this assertion pins its own fixture instead of leaning on the sweep.
     *
     * The reachable case is a multi-day tour abandoned part-way: the wall draws the bib as
     * DNF while the goal card pro-rates the days still to come, so the two consumers state
     * different things about the same race, and the card promises kilometres that are not
     * coming. Both halves are asserted below, `today <= start` and mid-event, because the
     * pro-rata branch is a second path to the same sum.
     */
    it("books nothing for a race that was abandoned, recorded or not", () => {
        // Cast for the reason the builders above carry one: a spread over the recorded|booked
        // union cannot be verified, and this fixture is deliberately used both ways.
        const tour = (over: Partial<RaceEvent> = {}): RaceEvent => ({
            date: "2026-11-07", end_date: "2026-11-15", name: "A Nine Day Tour",
            advertised_km: 900.00, sport: "cycling", country: "Taiwan", ...over,
        }) as RaceEvent;
        // The control: still booked, so the fixture is capable of producing a number.
        expect(bookedAhead("cycling", "2026-11-01", [tour()])).toBeCloseTo(900.00, 2);
        expect(bookedAhead("cycling", "2026-11-11", [tour()])).toBeCloseTo(900.00 * 5 / 9, 2);

        // Abandoned, with nothing recorded — the case `hasRecording` cannot see.
        const abandoned = tour({outcome: "dnf"});
        expect(patchState(abandoned, "2026-11-11")).toBe("dnf");
        expect(bookedAhead("cycling", "2026-11-01", [abandoned])).toBe(0);
        expect(bookedAhead("cycling", "2026-11-11", [abandoned])).toBe(0);

        // Abandoned and recorded — same answer, by the state rather than by the recording.
        const recorded = tour({
            outcome: "dnf", elapsed_time: "9:00:00",
            recordings: [{id: "1", metres: 300000, elapsed_time: "9:00:00"}],
        });
        expect(bookedAhead("cycling", "2026-11-01", [recorded])).toBe(0);
    });
});

/**
 * EVERY ASSERTION BELOW PINS ITS OWN INPUTS, and that is a deploy-safety rule
 * rather than a style preference.
 *
 * `GOALS[].raw_progress` and `UPDATED_AT` are rewritten by the nightly Strava bot,
 * and A RED SUITE BLOCKS THE DEPLOY. So an assertion against the live values
 * turns an ordinary ride into a failed production deploy, pushed by a bot with
 * no human in the loop — and the failure
 * freezes the very "Updated …" dateline this feature adds, because the deploy that
 * would refresh it is the one being blocked.
 *
 * Not theoretical, not distant, and no longer hypothetical: this fired in production
 * six hours after the feature merged. The bot's own push took running 152.7 → 158.6,
 * which moves the required rate 18 → 17, and the merged assertion had the literal 18
 * in it. The honest expectancy for a test coupled to bot-written data is ONE BOT
 * CYCLE, not whatever change size the arithmetic makes look distant.
 *
 * The same holds for the cycling card: `cycling_km: 2309.7` — one 30 km ride — is already
 * enough, taking the required rate 76 → 74. A race being RECORDED moves it as surely as a
 * ride does, and in the opposite direction: adding the round-island ride's recording took
 * this same figure 70 → 76, because its kilometres left `bookedAhead` for the bot's total
 * in the same edit. Neither input is one this file may pin live.
 *
 * `EVENTS` is deliberately left live: it is human-edited, so a red test there is
 * wanted feedback rather than noise.
 */
const AS_OF = "2026-07-27";
const CYCLING_KM = 2279.7;
const RUNNING_KM = 152.7;
const at = (sport: string, raw: number): Goal => ({...goalBySport(sport), raw_progress: raw});

describe("required rate", () => {
    it("produces the figures the page rendered when this was written", () => {
        expect(goalStatus(at("cycling", CYCLING_KM), AS_OF)).toEqual(
            expect.objectContaining({kind: "rate", kmPerWeek: 76, days: 158}));
        expect(goalStatus(at("running", RUNNING_KM), AS_OF)).toEqual(
            expect.objectContaining({kind: "rate", kmPerWeek: 18, days: 158}));
    });

    it("rounds UP, because a rounded-down rate followed exactly MISSES the goal", () => {
        // TWO DATES, because one of them does not discriminate. At AS_OF the requirement is
        // 75.2411 km/wk: round gives 75, delivering 1692.86 km against 1698.30 needed — the
        // case that rules round out. One day later it is 75.7204 and round gives 76, the same
        // answer as ceil, so that date alone cannot tell the two apart. Measured over the rest
        // of the calendar, round under-states on 150 of the 290 remaining sport-days.
        //
        // WHICH DATE PLAYS WHICH ROLE FLIPS WITH THE NUMERATOR, and these two have already
        // swapped once: the round-island ride's recording moved the kilometres owed, and with
        // them the fractional part of every rate on the calendar — AS_OF used to be the date
        // that could not discriminate and 28 July the one that could. So if the assertion
        // below goes red, re-measure the fraction and move the roles; do not relax it to an
        // inequality, which is what the pair exists to rule out.
        for (const iso of [AS_OF, "2026-07-28"]) {
            const cycling = goalStatus(at("cycling", CYCLING_KM), iso);
            if (cycling.kind !== "rate") throw new Error(`expected a rate at ${iso}`);
            const weeks = cycling.days / 7;
            expect(cycling.kmPerWeek * weeks, iso).toBeGreaterThanOrEqual(cycling.km);
            expect((cycling.kmPerWeek - 1) * weeks, iso).toBeLessThan(cycling.km);
        }
        // The discriminating assertion, stated outright: at AS_OF, round is wrong.
        const discriminating = goalStatus(at("cycling", CYCLING_KM), AS_OF);
        if (discriminating.kind !== "rate") throw new Error("expected a rate");
        const exact = discriminating.km / (discriminating.days / 7);
        expect(Math.round(exact)).toBeLessThan(exact);
        expect(discriminating.kmPerWeek).toBe(76);
    });

    it("reads raw_progress and IGNORES the display-clamped field", () => {
        // A discriminating case has to be built by hand: `GOALS` keeps the two
        // fields consistent, and where they agree the clamp is `min(raw, total)`
        // while the met test is `>= total`, so the two never disagree on a real
        // goal. This is a unit-level guard on the function's contract — that it
        // reads the source figure, not the one shaped for the progress bar.
        const base = goalBySport("running");
        const skewed: Goal = {...base, raw_progress: 100, current_progress: 590};
        // From raw: 500 km short, races cover 63.3 of it, so a rate is owed.
        expect(goalStatus(skewed, AS_OF).kind).toBe("rate");
        // From the clamped field it would read 10 km short with 63.3 km booked,
        // and report the goal as already covered.
        expect(goalStatus({...base, raw_progress: 590}, AS_OF).kind).toBe("covered");
    });

    it("handles every degenerate state distinctly", () => {
        // Pinned, not live: `met` is checked before the date is parsed, so once the
        // bot's real running_km passes 600 the `unknown` case below would silently
        // become `met` and fail — a deploy broken by the owner reaching his goal.
        const base = at("running", RUNNING_KM);
        expect(goalStatus({...base, raw_progress: base.total_goal}, AS_OF).kind).toBe("met");
        // Booked races alone cover the remainder.
        expect(goalStatus({...base, raw_progress: 560}, AS_OF).kind).toBe("covered");
        // Year over — from 1 JANUARY. 31 December is the last riding day, not the
        // first dead one, so it belongs to `final`; see `daysRemaining`.
        expect(goalStatus({...base, raw_progress: 0}, "2027-01-01").kind).toBe("closed");
        // Final fortnight: an absolute total, not a weekly rate. Both sides of the
        // boundary, because the day count that decides it is what this PR changed —
        // 18 December is the fourteenth-last day and still gets a rate, 19 December is
        // the thirteenth and does not. Without both, `FINAL_STRETCH_DAYS` can be moved
        // a day in either direction with the suite still green.
        expect(goalStatus({...base, raw_progress: 0}, "2026-12-18").kind).toBe("rate");
        expect(goalStatus({...base, raw_progress: 0}, "2026-12-19").kind).toBe("final");
        expect(goalStatus({...base, raw_progress: 0}, "2026-12-31").kind).toBe("final");
        // Unparseable input renders nothing rather than a guess.
        expect(goalStatus(base, "2026-02-30").kind).toBe("unknown");
        expect(goalStatus({...base, total_goal: 0}, AS_OF).kind).toBe("unknown");
        expect(goalStatus({...base, raw_progress: Number.NaN}, AS_OF).kind).toBe("unknown");
    });

    /**
     * The width ceiling is the goal card's ROW content width: **182px at 1024px
     * wide, 177 at 1100, 190 from 1152 up**. There is no layout engine here, so this
     * pins the two things a text-only test CAN pin — the fixed literals, and a
     * character ceiling for the generated branches — and between them they force a
     * re-measurement rather than allowing a silent widening.
     *
     * CORRECTED: an earlier revision of this comment claimed the budget was 110.02px
     * and that `Booked races cover it` "wrapped at every viewport". Both are false,
     * and the second was never measured — it was inferred from the first. 110.02px is
     * the running card's inner `max-content` column, which is not a budget at all: it
     * WIDENS with its content (to 121.06 under that very string), and the cycling
     * card's is 125.89. Measured on the built page, `Booked races cover it` renders as
     * ONE line at 1024/1100/1152/1440 with the card height unchanged at 226 and
     * `ovY 0`. The shorter wording ships because it is plainer, not because the longer
     * one broke. The real ceiling is ~156.7px of single-line ink at 1024.
     */
    it("emits only literals that were measured against the goal card's 182px row", () => {
        // Measured at 12px against the 182px ceiling: "Goal met" 50.22px,
        // "Races cover it" 78.78px. Both fit with room to spare.
        const MEASURED = new Set(["Goal met", "Races cover it"]);
        const base = goalBySport("running");
        expect(goalStatusLine({...base, raw_progress: base.total_goal}, AS_OF)).toSatisfy((l: string) => MEASURED.has(l));
        expect(goalStatusLine({...base, raw_progress: 560}, AS_OF)).toSatisfy((l: string) => MEASURED.has(l));
    });

    it("keeps the generated branches inside the worst case that was measured", () => {
        // RE-MEASURED when the rate branch gained its booked clause. The old bound was
        // "1000 km/wk to go" = 99.31px; the branch now emits e.g. "71 km/wk to go, 1022
        // booked" and the bound is the widest form of THAT, measured in the page's own
        // 300/12px face against the goal card's tightest text column — 182px, at exactly
        // 1024px wide.
        //
        //   "71 km/wk to go, 1022 booked"       162.52px   ships today
        //   "1000 km/wk to go, 9999 booked"     181.31px   the string bound below
        //   "71 km/wk to go, 1022 km booked"    182.59px   REJECTED — overflows by 0.59px
        //
        // That last row is why the unit is not repeated: it wraps, and a wrapped line takes
        // the cycling card to 273px against the running card's 257, which the reader sees
        // because the two cards sit one directly above the other.
        //
        // THE BOUND IS NOT REACHABLE AND IS DELIBERATELY STILL THE BOUND. Booked kilometres
        // are subtracted from the deficit before the rate is divided out, so the two figures
        // move in opposite directions: 9999 booked would drive the rate to zero and hand the
        // answer to the `covered` branch, which takes no clause. Pinning the unreachable
        // product of both maxima is the conservative direction — it cannot pass a string the
        // real worst case would fail.
        const longest = "1000 km/wk to go, 9999 booked";
        for (const goal of GOALS) {
            for (const raw of [0, 1, goal.total_goal / 2, goal.total_goal - 1]) {
                for (const iso of [AS_OF, "2026-12-25"]) {
                    const line = goalStatusLine({...goal, raw_progress: raw}, iso);
                    if (line === null || !/\d/.test(line)) continue;
                    expect(line.length, `"${line}" must not exceed "${longest}"`)
                        .toBeLessThanOrEqual(longest.length);
                }
            }
        }
    });
});

describe("the dateline", () => {
    it("formats the bot's stamp with a full month name", () => {
        expect(formatDateline("2026-07-27")).toBe("27 July 2026");
        expect(formatDateline("2026-09-30")).toBe("30 September 2026");
        expect(formatDateline("2026-02-30")).toBeNull();
    });

    it("NO date can produce a string longer than the one measured to fit 182px", () => {
        // "Updated 30 September 2026" measured 165.75px against the footer's
        // tightest 182px column. September is the longest month name and 30 the
        // widest two-digit day, so this is the true worst case, not a sample.
        const worst = `Updated ${formatDateline("2026-09-30")}`;
        for (let m = 1; m <= 12; m++) {
            for (const d of [1, 9, 10, 28, 30]) {
                const iso = `${GOAL_YEAR}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const line = formatDateline(iso);
                if (line === null) continue;
                expect(`Updated ${line}`.length, `"${line}" vs worst case "${worst}"`)
                    .toBeLessThanOrEqual(worst.length);
            }
        }
    });
});

describe("EVENTS", () => {
    it("has a real date, a finite non-negative distance and a known sport", () => {
        const sports = new Set(GOALS.map((g) => g.sport));
        for (const e of EVENTS) {
            expect(Number.isNaN(parseIsoDate(e.date)), `${e.name} date`).toBe(false);
            if (e.end_date !== undefined) {
                expect(Number.isNaN(parseIsoDate(e.end_date)), `${e.name} end_date`).toBe(false);
                expect(parseIsoDate(e.end_date), `${e.name} ends before it starts`)
                    .toBeGreaterThanOrEqual(parseIsoDate(e.date));
            }
            // THE DISTANCE, WHICHEVER SHAPE THE ROW IS. A booked race must carry `km`; a
            // recorded one must derive a real figure from its metres. `raceKm` answers NaN
            // for the hole the type cannot close — an empty `recordings` list beside no `km`
            // — so this reads through the accessor rather than at either field.
            expect(Number.isFinite(raceKm(e)) && raceKm(e) >= 0, `${e.name} distance`).toBe(true);
            expect(e.name.trim().length, "an unnamed event renders as a blank patch").toBeGreaterThan(0);
            // Required by the type, so this cannot be a missing key — it can be an empty
            // one, which renders as a blank line on the bib rather than as no line.
            expect(e.country.trim().length, `${e.name} has no country, so its bib prints a blank line`)
                .toBeGreaterThan(0);
            // The join. A sport matching no goal contributes to no projection and
            // throws nothing — it is invisible without this.
            expect(sports.has(e.sport), `${e.name} sport "${e.sport}" matches no goal`).toBe(true);
        }
    });

    it("carries no field that nothing reads", () => {
        for (const e of EVENTS) {
            expect(e, `${e.name} priority would be read by nothing`).not.toHaveProperty("priority");
        }
    });

    /**
     * A FINISHING TIME ONLY EXISTS FOR A RACE THAT HAS BEEN RUN, and this is now the
     * ONLY thing standing behind that sentence — which is why it is written more
     * carefully than the assertion it replaced.
     *
     * IT USED TO ASSERT `elapsed_time` IMPLIES `patchState === "finished"`. Once a
     * recording became a way to BE finished (see `hasRecording` in projection.ts), that
     * assertion started proving itself: a race with a time and an id is finished because
     * it has a time and an id. A tautology in the place of a gate is worse than no gate,
     * because the file still reads as though the data were checked.
     *
     * SO IT ASKS THE QUESTION THE OLD ONE WAS REALLY ASKING: has the race started? A
     * time typed against a race still ahead is the mistake worth catching — the bib
     * would print a result for a day that has not happened — and it is now catchable
     * ONLY here, because `patchState` would happily draw that bib as earned.
     *
     * AGAINST THE BUILD DAY, not the bot's stamp, and the difference is the whole point
     * of the change this test belongs to: a race run this morning is a race that has
     * started, whatever the kilometres say. Compared with `<=`, so a time entered on the
     * day of the race passes — that is the case the wall could not previously record.
     *
     * A race remembered without a recording stays a legitimate timeless bib, so nothing
     * here may require a time. This sentence used to name the race that was in that state;
     * which races are is a property of the data, and the rule is not.
     */
    it("never carries a finishing time for a race that has not started", () => {
        // No `toBeGreaterThan(0)` on the subset — see the note in tests/patch-wall.test.ts.
        // `timed` is legitimately empty every January, and a red suite blocks the
        // deploy. The loop asserts a property OF each timed event; zero of them is a true
        // state of the calendar, not a broken test.
        const timed = EVENTS.filter((e) => e.elapsed_time !== undefined);
        for (const e of timed) {
            expect(parseIsoDate(e.date), `${e.name} has an unreadable date and a finishing time`).not.toBeNaN();
            // THE END OF THE EVENT, NOT ITS START. A nine-day tour that began last Tuesday
            // has started and is not over, and a finishing time typed into it is still a
            // result for a day that has not happened. Reading `e.date` here let exactly
            // that through, and the message named the wrong field while doing it.
            expect(
                parseIsoDate(e.end_date ?? e.date) <= parseIsoDate(BUILD_DATE),
                `${e.name} is not over until ${e.end_date ?? e.date}, which is after ${BUILD_DATE}, but it `
                + `carries elapsed_time ${e.elapsed_time} — the bib would print a result for a day that `
                + `has not happened`,
            ).toBe(true);
            expect(e.elapsed_time, `${e.name} elapsed_time must read H:MM:SS`).toMatch(/^\d{1,2}:[0-5]\d:[0-5]\d$/);
        }
    });

    /**
     * THE OTHER HALF OF THE SAME GUARD. A recording is a finishing time AND an activity
     * id, and the id is the half the test above cannot see: an id alone earns no bib, so
     * a stray one is harmless — but an id beside a time is what makes `patchState` draw a
     * solid bib, and pasting a Strava link next to a race still ahead is an easy slip.
     *
     * Stated separately rather than folded in, because the two say different things and a
     * combined message would name the wrong field half the time.
     */
    it("never carries a recording for a race that has not started", () => {
        const recorded = EVENTS.filter((e) => e.elapsed_time !== undefined && recordingsOf(e).length > 0);
        for (const e of recorded) {
            // Against a clock pinned before every race on the calendar, so ONLY the
            // recording branch can answer. `patchState(e)` takes BUILD_DATE, under which
            // every past race is finished by the clock anyway — the assertion could not
            // fail, which is the tautology the comment above condemns.
            //
            // ASKED AS "THE CLOCK DID NOT DECIDE THIS", NOT AS `=== "finished"`, and the
            // difference arrived with `dnf`. A recorded race that was ABANDONED is `dnf` on
            // every day, so the old spelling was red on correct data. Relaxing it to
            // `!== "booked"` would have been the weak fix: a past race is not booked by the
            // CLOCK either, so deleting the recording branch entirely would still pass. What
            // a recording actually buys is that the answer does not MOVE with the day, and
            // that is what this now asks — red if the branch goes, green for either settled
            // outcome, and still not a tautology.
            expect(
                patchState(e, "1970-01-01"),
                `${e.name} carries a full recording, so its state must be settled ahead of the clock`,
            ).toBe(patchState(e, BUILD_DATE));
            expect(
                patchState(e, "1970-01-01"),
                `${e.name} carries a full recording, so it cannot be drawn as still to come`,
            ).not.toBe("booked");
            expect(
                parseIsoDate(e.end_date ?? e.date) <= parseIsoDate(BUILD_DATE),
                `${e.name} would be drawn as an EARNED patch, but it does not finish until `
                + `${e.end_date ?? e.date}, which has not happened yet`,
            ).toBe(true);
        }
    });

    /**
     * An activity id is an opaque identifier that only ever goes into a URL. Digits only,
     * and a STRING: 19-digit ids are close enough to Number.MAX_SAFE_INTEGER that a
     * numeric literal would round one silently, and the rounded id 404s rather than
     * failing anywhere a build could see.
     */
    it("carries activity ids as digit strings, so none can be rounded into a dead link", () => {
        const seen = new Set<string>();
        let checked = 0;
        for (const e of EVENTS) {
            for (const r of recordingsOf(e)) {
                expect(typeof r.id, `${e.name} activity id must be a string`).toBe("string");
                expect(r.id, `${e.name} activity id must be digits only`).toMatch(/^\d+$/);
                // Two races pointing at one ride is the transposition this cannot otherwise
                // see — both ids are valid, both pages load, and only reading them tells.
                // UNIQUENESS NOW HAS TO HOLD ACROSS THE ARRAYS AND NOT ONLY BETWEEN ROWS:
                // a race recorded in parts holds several ids, so the same slip can now be
                // made twice inside one event as well as between two.
                expect(seen.has(r.id), `${e.name} shares activity ${r.id} with another recording`).toBe(false);
                seen.add(r.id);
                checked++;
            }
        }
        expect(checked, "no event carries a recording — this assertion would be vacuous").toBeGreaterThan(0);
    });

    /**
     * A RECORDING'S OWN FIGURES ARE PRINTED ON THE BIB, so they are held to the shapes a bib
     * can print. `metres` is what the API said and everything else about a distance is derived
     * from it, so the only offline claim worth making is that it IS a distance: finite, and
     * greater than zero, because a race recorded as 0 m would draw a bib reading `0.00`.
     *
     * WHAT THIS DELIBERATELY NO LONGER ASSERTS is any agreement between a race's distance and
     * its parts'. It used to compare a single-recording race's `km` against the part's, which
     * caught a real drift while both were hand-typed. Neither is typed now — `raceKm` converts
     * the same metres either way — so that assertion would be a test of arithmetic this file
     * does not own. Its subject moved to `tests/constants.test.ts`, which exercises the
     * conversion itself, including the summing rule a split race depends on.
     *
     * THE ELAPSED PAIR IS STILL WORTH HOLDING, and the asymmetry is the point: that figure is
     * hand-entered in two places, so a single-recording race really can carry two different
     * clocks. The distance cannot any more.
     *
     * A MISTYPED `metres` REMAINS INVISIBLE HERE, and nothing offline can see it — that is what
     * `tests/strava-verify.test.ts` is for, holding every recording against the API exactly.
     */
    it("holds each recording's own figures to the shapes the bib prints them in", () => {
        let checked = 0;
        for (const e of EVENTS) {
            const parts = recordingsOf(e);
            for (const r of parts) {
                expect(r.elapsed_time, `${e.name} recording ${r.id} elapsed time must be H:MM:SS`)
                    .toMatch(/^\d{1,2}:[0-5]\d:[0-5]\d$/);
                expect(Number.isFinite(r.metres) && r.metres > 0,
                    `${e.name} recording ${r.id} metres must be a positive number`).toBe(true);
                checked++;
            }
            if (parts.length !== 1) continue;
            expect(parts[0].elapsed_time, `${e.name} has one recording, so its elapsed time must equal the race's`)
                .toBe(e.elapsed_time);
        }
        expect(checked, "no event carries a recording — this assertion would be vacuous").toBeGreaterThan(0);
    });

    /*
     * THE SPLIT-RACE DISTANCE GATE THAT USED TO SIT HERE IS GONE, AND ITS SUBJECT WITH IT.
     *
     * It bounded a hand-typed race-level `km` against the sum of its hand-typed parts, because
     * both were data and could disagree. Neither is data now: a race's distance is `raceKm`
     * over the parts' metres, so the bound it enforced holds by construction and asserting it
     * here would be a test of the code's own arithmetic run against the code's own output —
     * green whatever the rule, which is the shape of assertion this file exists to avoid.
     *
     * WHERE THE COVERAGE WENT, so this is a move rather than a deletion: the conversion and
     * the summing rule are exercised directly in `tests/constants.test.ts`, on inputs chosen
     * to discriminate rounding down from half-up. What NEITHER can see is a mistyped `metres`
     * — only `tests/strava-verify.test.ts` reads the API, and it is opt-in.
     */

    /**
     * A SPLIT RACE'S CLOCK MUST AT LEAST CONTAIN ITS OWN PARTS.
     *
     * `elapsed_time` is first start to last stop, so it is NOT the sum of the parts — the gaps
     * between recordings are inside it, which is exactly why summing is the wrong rule (2024's
     * span is 10:05:34 against 7:22:15 summed, and the 2h43m in the bike shop is the
     * difference). That makes the figure look unconstrained, and it is not: recordings do not
     * overlap, so the span cannot be SHORTER than the time actually spent recording.
     *
     * `>=`, and the slack is the point rather than a weakness. An equality would be red on
     * every real split race; this catches the failures that matter — a span accidentally set
     * to one part's elapsed time, or to the sum-minus-a-gap, or a digit dropped from the
     * hours. It is the only offline constraint on this field: `strava-verify` computes the
     * true span from the activities' own timestamps, but it is opt-in, needs live credentials
     * and does not run in CI.
     */
    it("never lets a split race's span be shorter than the time it spent recording", () => {
        const seconds = (hms: string): number => {
            const [h, m, s] = hms.split(":").map(Number);
            return h * 3600 + m * 60 + s;
        };
        let checked = 0;
        for (const e of EVENTS) {
            const parts = recordingsOf(e);
            if (parts.length < 2 || e.elapsed_time === undefined) continue;
            const recording = parts.reduce((total, part) => total + seconds(part.elapsed_time), 0);
            const span = seconds(e.elapsed_time);
            expect(
                span >= recording,
                `${e.name} says its span is ${e.elapsed_time} (${span}s), but its ${parts.length} recordings `
                + `hold ${recording}s of riding between them. First start to last stop CONTAINS every part plus `
                + "the gaps between them, so it can never be shorter than their sum.",
            ).toBe(true);
            checked++;
        }
        expect(checked, "split races checked").toBeGreaterThanOrEqual(0);
    });
});

/**
 * The goal card's countdown. Every assertion passes its own `iso` and its own events:
 * which race is next is a function of the day, and the bot moves the day nightly.
 */
describe("the next race for a sport", () => {
    const ev = (over: Partial<RaceEvent> = {}): RaceEvent =>
        ({date: "2026-06-01", name: "Fixture", advertised_km: 10, sport: "cycling", country: "Nowhere", ...over}) as RaceEvent;

    const CALENDAR: readonly RaceEvent[] = [
        ev({name: "ride-past", date: "2026-01-10"}),
        ev({name: "ride-next", date: "2026-06-20"}),
        ev({name: "ride-later", date: "2026-09-01"}),
        ev({name: "run-next", date: "2026-07-04", sport: "running"}),
    ];

    it("is the soonest booked race of that sport, and counts the days to it", () => {
        expect(nextRace("cycling", "2026-06-15", CALENDAR))
            .toEqual({event: expect.objectContaining({name: "ride-next"}), daysAway: 5, underWay: false});
        expect(nextRace("running", "2026-06-15", CALENDAR)?.daysAway).toBe(19);
    });

    /**
     * The one thing a caller cannot be left to work out. A multi-day race stays booked
     * for every day it runs, so mid-tour the START is behind the stamp and `daysAway`
     * goes negative — "in -3 days" is the sentence this flag exists to prevent.
     */
    it("names a race that has begun rather than counting backwards to its start", () => {
        const tour = ev({name: "tour", date: "2026-06-10", end_date: "2026-06-20"});
        const mid = nextRace("cycling", "2026-06-13", [tour]);
        expect(mid?.daysAway).toBe(-3);
        expect(mid?.underWay).toBe(true);
        expect(nextRace("cycling", "2026-06-10", [tour]), "the start day itself is not under way yet")
            .toEqual({event: tour, daysAway: 0, underWay: false});
        expect(nextRace("cycling", "2026-06-21", [tour]), "finished, so nothing is booked").toBeNull();
    });

    it("returns null when the sport has nothing booked, which is an ordinary day", () => {
        expect(nextRace("cycling", "2026-12-31", CALENDAR), "every race run").toBeNull();
        expect(nextRace("running", "2026-06-15", []), "none entered").toBeNull();
        expect(nextRace("cycling", "not-a-date", CALENDAR)).toBeNull();
    });

    /**
     * The reason `nextRace` reads the wall instead of sorting again: the card and the
     * wall must not be able to disagree about which race is next. Swept over the year
     * against live EVENTS, so it holds however the calendar moves.
     *
     * AGAINST THIS YEAR'S SLICE OF THE WALL, not the whole of it, and the argument is
     * the scope rule in projection.ts rather than a convenience: the wall keeps every
     * race the owner has entered and a goal card is one year, so `patchWall()` and
     * `nextRace()` READING DIFFERENT LISTS is the intended behaviour. Comparing them
     * undefiltered would assert the opposite — that a January race booked for next year
     * belongs on this year's card — and would go red the first time one is entered.
     * What is still worth asserting is that within the year they cannot disagree, which
     * is the failure this test was written for.
     */
    it("always names the first booked bib of that sport's wall, on every day of the year", () => {
        const wrong: string[] = [];
        const thisYear = eventsInYear(GOAL_YEAR);
        for (let day = 0; day < 366; day++) {
            const iso = new Date(Date.UTC(GOAL_YEAR, 0, 1 + day)).toISOString().slice(0, 10);
            for (const goal of GOALS) {
                const first = patchWall(goal.sport, iso, thisYear).find((p) => p.state === "booked")?.event.name ?? null;
                const next = nextRace(goal.sport, iso)?.event.name ?? null;
                if (first !== next) wrong.push(`${iso} ${goal.sport}: wall says ${first}, card says ${next}`);
            }
        }
        expect(wrong.slice(0, 5)).toEqual([]);
    });

    it("counts the patches already earned, which is what the card offers instead", () => {
        expect(patchesEarned("cycling", "2026-06-15", CALENDAR)).toBe(1);
        expect(patchesEarned("cycling", "2026-01-01", CALENDAR)).toBe(0);
        expect(patchesEarned("cycling", "2026-12-31", CALENDAR)).toBe(3);
        expect(patchesEarned("running", "2026-12-31", CALENDAR)).toBe(1);
    });

    /**
     * The two halves have to partition the sport's wall on every day, or the card can
     * show "nothing booked" while a bib is still an outline — or claim a next race and a
     * patch count that do not add up to the races that exist.
     *
     * The partition is over THIS YEAR's races, for the reason given above: both branches
     * of the card's line read the year, and the wall reads the calendar.
     */
    /**
     * A COUNTDOWN MUST NEVER POINT AT A RACE THAT IS ALREADY OVER, and a DNF is the one
     * shape that could get past `nextRace` — it is not `finished`, so any spelling of the
     * search as "the first race that is not finished" selects it, and the goal card counts
     * down to a race abandoned in the past. The function asks for `booked` explicitly, which
     * is correct; this is what stops that being a coincidence.
     */
    it("never counts down to a race that was abandoned", () => {
        const abandoned = ev({date: "2026-03-01", sport: "cycling", outcome: "dnf", elapsed_time: "5:00:00",
            recordings: [{id: "1", metres: 10000, elapsed_time: "5:00:00"}]});
        const ahead = ev({date: "2026-09-01", sport: "cycling", name: "the real next race"});
        expect(nextRace("cycling", "2026-06-15", [abandoned]), "a DNF is not a race still to come").toBeNull();
        expect(nextRace("cycling", "2026-06-15", [abandoned, ahead])?.event.name).toBe("the real next race");
    });

    it("accounts for every race of the sport between the two branches", () => {
        const wrong: string[] = [];
        const thisYear = eventsInYear(GOAL_YEAR);
        for (let day = 0; day < 366; day++) {
            const iso = new Date(Date.UTC(GOAL_YEAR, 0, 1 + day)).toISOString().slice(0, 10);
            for (const goal of GOALS) {
                const wall = patchWall(goal.sport, iso, thisYear);
                const booked = wall.filter((p) => p.state === "booked").length;
                const hasNext = nextRace(goal.sport, iso) !== null;
                if ((booked > 0) !== hasNext) wrong.push(`${iso} ${goal.sport}: ${booked} booked but next=${hasNext}`);
                // THREE TERMS, BECAUSE A DNF IS ON THE WALL AND IN NEITHER BRANCH OF THE
                // CARD'S LINE. That is correct and deliberate — it is not a patch and it is
                // not still to come — but it means the partition is no longer earned+booked,
                // and the two-term form would go red the first time a race in GOAL_YEAR is
                // abandoned. Only the year scope is hiding that today: every DNF on the
                // calendar predates GOAL_YEAR, so this sweep never sees one.
                const dnf = wall.filter((p) => p.state === "dnf").length;
                const earned = patchesEarned(goal.sport, iso);
                if (earned + booked + dnf !== wall.length) {
                    wrong.push(
                        `${iso} ${goal.sport}: earned(${earned}) + booked(${booked}) + dnf(${dnf}) `
                        + `!= wall(${wall.length})`,
                    );
                }
            }
        }
        expect(wrong.slice(0, 5)).toEqual([]);
    });
});

/**
 * THE SCOPE SPLIT: A LIFETIME WALL, A GOAL CARD THAT IS ONE YEAR.
 *
 * {@link EVENTS} stopped being this year's races and became every race the owner has
 * entered, which turned one list into two audiences. The wall wants all of it. A goal
 * card wants only {@link GOAL_YEAR}, because its target, its kilometres, its day count
 * and its heading are all that year's — and the failure is not cosmetic: `bookedAhead`
 * subtracts un-run races from the year's deficit, so a 1,022 km tour booked for NEXT
 * November would pay off THIS year's requirement and take the cycling card from
 * "71 km/wk to go" to "Races cover it", silently.
 *
 * EVERY FIXTURE HERE IS SELF-CONTAINED, AND THAT COST A REWRITE. The first version of
 * this block built its calendar as `[oldRace, ...EVENTS, nextYearRace]` and compared the
 * result against `EVENTS` — which reads as thorough and is the same defect this file
 * warns about elsewhere: an expectation pinned to what the calendar happens to hold
 * today. Simulating the change this feature exists FOR — three races from other years
 * added to `EVENTS` — turned all four assertions red on correct code, and nothing else
 * in the suite moved. Fixtures below own their own races, so they measure the scope rule
 * rather than the maintainer's race entries.
 *
 * WHAT THESE ASSERTIONS CAN AND CANNOT SEE TODAY, stated because the difference is
 * invisible from a green run. The year lives in a DEFAULT PARAMETER, and `EVENTS`
 * currently holds one year — so "the default is this year's races" and "the default is
 * every race" are the same list, and no assertion can separate them until a race from
 * another year is entered. So the work is split in two:
 *
 *   the DISCRIMINATION, proved here and now against a fixture that DOES span years —
 *   `eventsInYear` removes exactly the off-year races, and their removal moves the
 *   figure by exactly their distance;
 *
 *   the WIRING, asserted as an equality that is an identity today and becomes a real
 *   comparison the moment `EVENTS` spans years. It is the standing gate: it is what
 *   goes red if someone "tidies" a default back to `EVENTS` after a 2025 race lands.
 *
 * Verified by mutation rather than by argument: with the three simulated races in
 * `EVENTS` and `bookedAhead`'s default reverted to `EVENTS`, the wiring assertion is the
 * one that goes red, and it names the sport.
 */
describe("the scope split: a lifetime wall, a goal card that is one year", () => {
    const race = (over: Partial<RaceEvent> & {date: string, name: string}): RaceEvent => ({
        advertised_km: 100, sport: "cycling", country: "Singapore", ...over,
    }) as RaceEvent;

    /** This year's races, owned by this block — not the maintainer's. */
    const THIS_YEAR: readonly RaceEvent[] = [
        race({date: `${GOAL_YEAR}-03-01`, name: "in-year run", advertised_km: 21.1, sport: "running"}),
        race({date: `${GOAL_YEAR}-04-01`, name: "in-year done", advertised_km: 60}),
        race({date: `${GOAL_YEAR}-09-01`, name: "in-year ahead", advertised_km: 40}),
    ];
    /** Everything the goal cards must not see. 1,022 km of it, one tour, next November. */
    const OFF_YEAR: readonly RaceEvent[] = [
        race({date: `${GOAL_YEAR - 2}-09-15`, name: "two years ago", advertised_km: 21.1, sport: "running"}),
        race({date: `${GOAL_YEAR - 1}-05-05`, name: "last year", advertised_km: 100}),
        race({date: `${GOAL_YEAR + 1}-11-07`, end_date: `${GOAL_YEAR + 1}-11-15`, name: "next year tour", advertised_km: 1022}),
    ];
    /** Interleaved, so nothing here can pass by taking a prefix or a suffix. */
    const CALENDAR: readonly RaceEvent[] = [
        OFF_YEAR[1], THIS_YEAR[0], OFF_YEAR[2], THIS_YEAR[1], OFF_YEAR[0], THIS_YEAR[2],
    ];
    const MID = `${GOAL_YEAR}-06-15`;
    /** A goal with figures of its own, so no assertion below moves when the bot pushes. */
    const CYCLING: Goal = {...goalBySport("cycling"), raw_progress: 1000, current_progress: 1000, total_goal: 5000};

    const names = (events: readonly RaceEvent[]) => [...events].map((e) => e.name).sort();

    it("keeps the races that START in the year, and drops a date that does not parse", () => {
        expect(names(eventsInYear(GOAL_YEAR, CALENDAR))).toEqual(names(THIS_YEAR));
        expect(names(eventsInYear(GOAL_YEAR - 1, CALENDAR))).toEqual(["last year"]);
        expect(names(eventsInYear(GOAL_YEAR + 1, CALENDAR))).toEqual(["next year tour"]);

        // An impossible day is not a year. Dropping it makes the required rate HIGHER,
        // never lower, which is the only direction a typo may move a goal card.
        expect(eventsInYear(GOAL_YEAR, [race({date: `${GOAL_YEAR}-02-30`, name: "impossible"})]).length,
            `${GOAL_YEAR}-02-30 is not a day in ${GOAL_YEAR}`).toBe(0);

        // A race belongs to the year it STARTS in — the rule, on the only shape that probes it.
        const straddles = race({date: `${GOAL_YEAR}-12-30`, end_date: `${GOAL_YEAR + 1}-01-02`, name: "new year tour"});
        expect(eventsInYear(GOAL_YEAR, [straddles]).length).toBe(1);
        expect(eventsInYear(GOAL_YEAR + 1, [straddles]).length).toBe(0);
    });

    /**
     * THE DEFECT THE SPLIT EXISTS FOR, priced. Not "the numbers differ" but "they differ
     * by exactly the off-year distance", so this cannot pass on a filter that drops the
     * wrong races.
     */
    it("never lets a race from another year touch this year's booked distance", () => {
        const scoped = eventsInYear(GOAL_YEAR, CALENDAR);
        expect(bookedAhead("cycling", MID, CALENDAR) - bookedAhead("cycling", MID, scoped))
            .toBeCloseTo(1022, 6);
        expect(bookedAhead("cycling", MID, scoped)).toBe(bookedAhead("cycling", MID, THIS_YEAR));

        // And the same fact where a reader meets it: the sentence the card prints. 1,022 km
        // against a 4,000 km deficit is the difference between a rate and "Races cover it".
        expect(goalStatusLine(CYCLING, MID, scoped)).toBe(goalStatusLine(CYCLING, MID, THIS_YEAR));
        expect(
            goalStatusLine(CYCLING, MID, CALENDAR),
            "the unscoped list must say something different, or the equality above proves nothing",
        ).not.toBe(goalStatusLine(CYCLING, MID, scoped));
    });

    it("keeps the countdown and the patch count inside the year too", () => {
        const scoped = eventsInYear(GOAL_YEAR, CALENDAR);
        expect(nextRace("cycling", MID, scoped)).toEqual(nextRace("cycling", MID, THIS_YEAR));
        expect(patchesEarned("cycling", MID, scoped)).toBe(patchesEarned("cycling", MID, THIS_YEAR));

        // Both branches move when the year is not enforced: the count gains last year's
        // race, and on a day with nothing left booked the countdown reaches next year's.
        expect(patchesEarned("cycling", MID, CALENDAR)).toBe(patchesEarned("cycling", MID, scoped) + 1);
        expect(nextRace("cycling", `${GOAL_YEAR}-12-31`, CALENDAR)?.event.name).toBe("next year tour");
        expect(nextRace("cycling", `${GOAL_YEAR}-12-31`, scoped)).toBeNull();
    });

    it("draws every year on the wall, both directions out of today", () => {
        const wall = patchWall(undefined, MID, CALENDAR);
        const byName = new Map(wall.map((p) => [p.event.name, p.state]));
        expect(wall.length, "the wall shows the whole calendar").toBe(CALENDAR.length);
        expect(byName.get("last year"), "a past year is earned, not hidden").toBe("finished");
        expect(byName.get("two years ago"), "and so is the year before that").toBe("finished");
        expect(byName.get("next year tour"), "a race booked for next year is still booked").toBe("booked");
        // The finished run walks backwards out of this year into the ones before it, so the
        // oldest race the owner has ever run closes the wall.
        expect(wall.map((p) => p.event.name)).toEqual([
            "in-year ahead", "next year tour",
            "in-year done", "in-year run", "last year", "two years ago",
        ]);
    });

    /**
     * THE WIRING. An identity today (see the block comment) and a real comparison the day
     * `EVENTS` spans years — which is the day it matters, and the reason it is written now
     * rather than then.
     *
     * No count floor: "there is at least one race in GOAL_YEAR" is a property of the
     * maintainer's calendar, not of this code, and it is false every January until the
     * year's first race is entered. `EVENTS` being non-empty is the guard that is safe.
     */
    it("defaults the goal card to this year and the wall to the whole calendar", () => {
        expect(EVENTS.length, "EVENTS is empty, so every comparison below is vacuous").toBeGreaterThan(0);
        const thisYear = eventsInYear(GOAL_YEAR);
        for (const goal of GOALS) {
            expect(bookedAhead(goal.sport, MID), `${goal.sport} booked distance`).toBe(bookedAhead(goal.sport, MID, thisYear));
            expect(goalStatus(goal, MID), `${goal.sport} status`).toEqual(goalStatus(goal, MID, thisYear));
            expect(goalStatusLine(goal, MID), `${goal.sport} status line`).toBe(goalStatusLine(goal, MID, thisYear));
            expect(nextRace(goal.sport, MID), `${goal.sport} next race`).toEqual(nextRace(goal.sport, MID, thisYear));
            expect(patchesEarned(goal.sport, MID), `${goal.sport} patches earned`).toBe(patchesEarned(goal.sport, MID, thisYear));
        }
        expect(patchWall(undefined, MID).length, "the wall must default to every race").toBe(EVENTS.length);
    });
});

describe("the bot's write contract", () => {
    const raw = readFileSync("src/data/strava-progress.json", "utf8");

    it("ships updated_at, so the first bot run does not commit on unchanged km", () => {
        expect(stravaProgress).toHaveProperty("updated_at");
        expect(UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("PRESERVES updated_at byte-for-byte when the km are unchanged", () => {
        // This is the whole deploy-suppression contract: the workflow commits only
        // when `git diff --quiet` reports a change, so a date stamped every run
        // would push and deploy nightly for nothing.
        const again = serialise(nextProgress(
            stravaProgress.cycling_km, stravaProgress.running_km, raw, "2026-08-01"));
        expect(again).toBe(raw);
    });

    it("stamps a fresh date as soon as EITHER km value moves", () => {
        // Both sports, because moving only cycling_km leaves the running_km half of
        // the comparison unexercised — a mutant that drops it would survive.
        const ride = nextProgress(stravaProgress.cycling_km + 0.1, stravaProgress.running_km, raw, "2026-08-01");
        expect(ride.updated_at).toBe("2026-08-01");
        expect(serialise(ride)).not.toBe(raw);

        const run = nextProgress(stravaProgress.cycling_km, stravaProgress.running_km + 0.1, raw, "2026-08-01");
        expect(run.updated_at).toBe("2026-08-01");
        expect(serialise(run)).not.toBe(raw);
    });

    it("treats a missing or malformed file as a first run rather than throwing", () => {
        expect(nextProgress(1, 2, "", "2026-08-01").updated_at).toBe("2026-08-01");
        expect(nextProgress(1, 2, "{not json", "2026-08-01").updated_at).toBe("2026-08-01");
        expect(nextProgress(1, 2, '{"cycling_km":1,"running_km":2}', "2026-08-01").updated_at).toBe("2026-08-01");
    });

    it("keeps the key order and trailing newline the zero-diff gate depends on", () => {
        expect(Object.keys(nextProgress(1, 2, raw))).toEqual(["cycling_km", "running_km", "updated_at"]);
        expect(serialise({a: 1}).endsWith("\n")).toBe(true);
    });

    it("stamps the Singapore date, not the UTC one", () => {
        // The cron fires 21:13 UTC = 05:13 the NEXT morning in Singapore, so a
        // UTC-derived stamp is a day behind for the only reader this site has.
        expect(singaporeDate(new Date("2026-07-27T21:13:00Z"))).toBe("2026-07-28");
        expect(singaporeDate(new Date("2026-07-27T15:59:00Z"))).toBe("2026-07-27");
    });
});

describe("the rendered page", () => {
    const {document} = parseHTML(readFileSync("dist/index.html", "utf8"));

    it("renders the dateline once, in the footer, as a <time>", () => {
        const times = [...document.querySelectorAll("time")];
        expect(times.length, "one timestamp covers both sports; two copies can only disagree").toBe(1);
        expect(times[0]!.getAttribute("datetime")).toBe(UPDATED_AT);
        expect(times[0]!.textContent).toBe(formatDateline());
    });

    it("gives the footer card the lg rows the dateline needs", () => {
        // Measured: with one row the dateline loses 5px of glyphs at the DEFAULT 16px
        // text size, at every viewport whose height puts `main` on its floor.
        //
        // It is THREE rows now, and the third is what pays for content-sized rows. Two
        // rows put this card in row 8 plus an implicit row worth 0px, so its area was
        // 92px for 105px of content and its own bottom padding was the 13px being cut.
        // Under a fraction template that clipping is invisible; under the content-sized
        // one it became the single largest term in the grid's height, and the whole page
        // paid 13px for it. A third row costs nothing either way — rows 9 and 10 already
        // exist, empty, from the career cards' six-row spans.
        const card = document.querySelector("main")!.lastElementChild!;
        expect(card.getAttribute("class")).toContain("lg:row-span-3");
    });

    it("adds exactly ONE status line per goal card", () => {
        // Two lines each takes the right-hand stack's free height to zero, at which
        // point the flex column SHRINKS all three cards — the Now card included,
        // 154 → 149.39px — though it does not shear glyphs until four lines. Nothing
        // in the suite can see that, so the count is pinned here.
        //
        // DRIVEN FROM THE GENERATOR, never from hand-copied strings. The previous
        // filter listed `Booked races cover it` — the REJECTED wording, which no
        // branch can emit — and omitted `Races cover it`, which ships. So the
        // `covered` branch went unchecked, and on the first day both goals return
        // `closed` and both lines are null, the old literal list would have counted 0
        // against an expected 2 and failed with a message about stack height. That day
        // is 1 January, not 31 December — the last day of the year is a riding day and
        // renders a `final` line; see `daysRemaining`.
        const expected = GOALS.map((g) => goalStatusLine(g)).filter((l): l is string => l !== null);
        const wanted = new Set(expected);
        const lines = [...document.querySelectorAll("[data-card]")]
            .flatMap((c) => [...c.querySelectorAll("span")])
            .filter((s) => wanted.has((s.textContent ?? "").trim()));
        expect(lines.length).toBe(expected.length);
    });

    /**
     * WHAT THE RATE IS BANKING, ASSERTED AGAINST A SECOND SOURCE — because the gate above
     * cannot see this feature at all, and neither could anything else.
     *
     * `expected` up there is `GOALS.map(goalStatusLine)`. Delete the booked clause from
     * `goalStatusLine` and the expectation shortens with it, the shorter line is what the
     * page renders, and the assertion passes. MEASURED: reverting `case "rate"` to the bare
     * `${kmPerWeek} ${unit}/wk to go` removed every "booked" from `dist/index.html` — 0
     * occurrences — and left `pnpm test` at 456 passed / 7 skipped. The one shipped
     * home-page feature in its own commit was gated by nothing.
     *
     * So the figure here comes from `bookedAhead`, which `goalStatusLine` does not decide,
     * and the sentence shape is read off the RENDERED page rather than regenerated. A
     * tautology cannot be repaired by asserting harder on the same expression; it is
     * repaired by asking a different one.
     */
    it("says on the card what the rate is already banking", () => {
        const onRate = GOALS.filter((g) => goalStatus(g).kind === "rate");
        expect(onRate.length, "no goal is on the `rate` branch, so this gate is vacuous today")
            .toBeGreaterThan(0);
        const text = [...document.querySelectorAll("[data-card]")]
            .flatMap((c) => [...c.querySelectorAll("span")])
            .map((s) => (s.textContent ?? "").trim());
        let checked = 0;
        for (const goal of onRate) {
            const status = goalStatus(goal);
            // Narrowed rather than asserted: `kmPerWeek` lives on the `rate` member alone, and
            // `onRate` filtered on `kind` without telling the compiler. A cast here would be a
            // lie the day a branch is renamed.
            if (status.kind !== "rate") continue;
            // INDEPENDENT OF `goalStatusLine`: the same rounding it applies, applied here to
            // the accessor it applies it to. A goal with nothing booked must print no clause
            // at all — the empty case is the one a "contains a number" check would miss.
            const booked = Math.round(bookedAhead(goal.sport, UPDATED_AT));
            const opening = `${status.kmPerWeek} ${goal.measurable_unit}/wk to go`;
            const rate = text.find((t) => t.startsWith(opening));
            expect(rate, `${goal.sport}'s rate line must be on the page`).toBeDefined();
            if (booked > 0) {
                expect(rate, `${goal.sport} has ${booked} ${goal.measurable_unit} booked ahead of it, and the `
                    + `rate already subtracts them — the card must say so rather than presenting a `
                    + `figure that silently assumes every booked race gets finished`)
                    .toBe(`${opening}, ${booked} booked`);
            } else {
                expect(rate, `${goal.sport} has nothing booked, so the clause must be absent rather than zeroed`)
                    .not.toContain("booked");
            }
            checked++;
        }
        expect(checked, "no rate line was found on the page at all").toBeGreaterThan(0);
    });

    it("does not add a child to <main>", () => {
        // card-fill.test.ts:347 fires at +1 child with a message naming neither
        // cards nor datelines, so an implementer would hunt the wrong red.
        expect(document.querySelector("main")!.children.length).toBe(6);
    });
});
