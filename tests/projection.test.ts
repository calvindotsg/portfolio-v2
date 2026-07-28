import {readFileSync} from "node:fs";

import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import {EVENTS, GOAL_YEAR, GOALS, type Goal} from "../src/lib/constants";
import stravaProgress from "../src/data/strava-progress.json";
import {
    UPDATED_AT, bookedAhead, daysRemaining, formatDateline, goalStatus, goalStatusLine,
    nextRace, parseIsoDate, patchesEarned, patchState, patchWall, stampYearMatchesGoalYear,
} from "../src/lib/projection";
import type {RaceEvent} from "../src/lib/constants";
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

        // The pairing, pinned to values rather than to an inequality. Round the Island
        // is a single-day cycling event on 2 August. On that date its whole 121.98 km
        // is still owed, and the day count must still contain the day it is ridden on;
        // the day after, both drop by exactly that event and exactly that day.
        //
        // An inequality here is not enough: `>` and `-1` are satisfied by a version
        // that books the event on the WRONG side of its own start date, so long as it
        // does so consistently.
        expect(bookedAhead("cycling", "2026-08-02")).toBeCloseTo(1143.98, 2);
        expect(bookedAhead("cycling", "2026-08-03")).toBeCloseTo(1022.00, 2);
        expect(daysRemaining("2026-08-02")).toBe(152);
        expect(daysRemaining("2026-08-03")).toBe(151);
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

describe("booked race distance", () => {
    it("counts only future events, per sport", () => {
        // At 2026-07-27 both July DCR rides are done; three cycling races remain
        // ahead only in the sense that 121.98 + 1022.00 are still to ride.
        expect(bookedAhead("cycling", "2026-07-27")).toBeCloseTo(1143.98, 2);
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
});

/**
 * EVERY ASSERTION BELOW PINS ITS OWN INPUTS, and that is a deploy-safety rule
 * rather than a style preference.
 *
 * `GOALS[].raw_progress` and `UPDATED_AT` are rewritten by the nightly Strava bot,
 * and `netlify.toml` runs `pnpm check && pnpm test` as the BUILD COMMAND. So an
 * assertion against the live values turns an ordinary ride into a failed
 * production deploy, pushed by a bot with no human in the loop — and the failure
 * freezes the very "Updated …" dateline this feature adds, because the deploy that
 * would refresh it is the one being blocked.
 *
 * Not theoretical, not distant, and no longer hypothetical: this fired in production
 * six hours after the feature merged. The bot's own push took running 152.7 → 158.6,
 * which moves the required rate 18 → 17, and the merged assertion had the literal 18
 * in it. The honest expectancy for a test coupled to bot-written data is ONE BOT
 * CYCLE, not whatever change size the arithmetic makes look distant.
 *
 * The same holds for the cycling card: `cycling_km: 2309.7` — one 30 km ride — is
 * already enough, and the Round the Island booking drains out of `bookedAhead` on
 * 3 August, taking the required rate 70 → 73 → 79.
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
            expect.objectContaining({kind: "rate", kmPerWeek: 70, days: 158}));
        expect(goalStatus(at("running", RUNNING_KM), AS_OF)).toEqual(
            expect.objectContaining({kind: "rate", kmPerWeek: 18, days: 158}));
    });

    it("rounds UP, because a rounded-down rate followed exactly MISSES the goal", () => {
        // TWO DATES, because one of them does not discriminate. At AS_OF the
        // requirement is 69.8370 km/wk: floor gives 69 and misses, but round gives 70
        // and clears, so this date alone cannot tell ceil from round. One day later
        // the requirement is 70.2818 and round gives 70, delivering 1570.00 km against
        // 1576.32 needed — the case that rules round out. Measured over the rest of
        // the calendar, round under-states on 154 of the 288 remaining sport-days.
        for (const iso of [AS_OF, "2026-07-28"]) {
            const cycling = goalStatus(at("cycling", CYCLING_KM), iso);
            if (cycling.kind !== "rate") throw new Error(`expected a rate at ${iso}`);
            const weeks = cycling.days / 7;
            expect(cycling.kmPerWeek * weeks, iso).toBeGreaterThanOrEqual(cycling.km);
            expect((cycling.kmPerWeek - 1) * weeks, iso).toBeLessThan(cycling.km);
        }
        // The discriminating assertion, stated outright: on 28 July, round is wrong.
        const day2 = goalStatus(at("cycling", CYCLING_KM), "2026-07-28");
        if (day2.kind !== "rate") throw new Error("expected a rate");
        expect(Math.round(day2.km / (day2.days / 7))).toBeLessThan(day2.km / (day2.days / 7));
        expect(day2.kmPerWeek).toBe(71);
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
        // "1000 km/wk to go" = 99.31px, the widest the rate branch can produce, and
        // it fits with 10.7px to spare. "1000 km to go" = 80.11px covers `final`.
        const longest = "1000 km/wk to go";
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
            expect(Number.isFinite(e.km) && e.km >= 0, `${e.name} km`).toBe(true);
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
     * A FINISHING TIME ONLY EXISTS FOR A RACE THAT HAS BEEN RUN, and the direction of
     * this check is the whole of it: `elapsed_time` implies finished, never the reverse.
     * Round the Island finishes on 3 August with nothing recorded and is a legitimate
     * timeless finished bib, so the converse would be a red build on correct data.
     *
     * Written against `patchState` at the bot's own stamp rather than against a literal
     * date. That makes it bot-driven — which is safe here in the one direction that
     * matters, because a race that has been run stays run. The only way this goes red is
     * a time typed against a race still ahead, which is exactly the mistake worth
     * catching: the bib would print a result for a day that has not happened.
     */
    it("carries a finishing time only for races that have finished", () => {
        // No `toBeGreaterThan(0)` on the subset — see the note in tests/patch-wall.test.ts.
        // `timed` is legitimately empty every January, and the suite is the Netlify build
        // command. The loop asserts a property OF each timed event; zero of them is a true
        // state of the calendar, not a broken test.
        const timed = EVENTS.filter((e) => e.elapsed_time !== undefined);
        for (const e of timed) {
            expect(patchState(e), `${e.name} is not finished but carries elapsed_time ${e.elapsed_time}`)
                .toBe("finished");
            expect(e.elapsed_time, `${e.name} elapsed_time must read H:MM:SS`).toMatch(/^\d{1,2}:[0-5]\d:[0-5]\d$/);
        }
    });

    /**
     * An activity id is an opaque identifier that only ever goes into a URL. Digits only,
     * and a STRING: 19-digit ids are close enough to Number.MAX_SAFE_INTEGER that a
     * numeric literal would round one silently, and the rounded id 404s rather than
     * failing anywhere a build could see.
     */
    it("carries activity ids as digit strings, so none can be rounded into a dead link", () => {
        const linked = EVENTS.filter((e) => e.strava_activity_id !== undefined);
        const seen = new Set<string>();
        for (const e of linked) {
            expect(typeof e.strava_activity_id, `${e.name} activity id must be a string`).toBe("string");
            expect(e.strava_activity_id, `${e.name} activity id must be digits only`).toMatch(/^\d+$/);
            // Two races pointing at one ride is the transposition this cannot otherwise
            // see — both ids are valid, both pages load, and only reading them tells.
            expect(seen.has(e.strava_activity_id!), `${e.name} shares an activity id with another race`).toBe(false);
            seen.add(e.strava_activity_id!);
        }
    });
});

/**
 * The goal card's countdown. Every assertion passes its own `iso` and its own events:
 * which race is next is a function of the day, and the bot moves the day nightly.
 */
describe("the next race for a sport", () => {
    const ev = (over: Partial<RaceEvent> = {}): RaceEvent =>
        ({date: "2026-06-01", name: "Fixture", km: 10, sport: "cycling", country: "Nowhere", ...over});

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
     */
    it("always names the first booked bib of that sport's wall, on every day of the year", () => {
        const wrong: string[] = [];
        for (let day = 0; day < 366; day++) {
            const iso = new Date(Date.UTC(GOAL_YEAR, 0, 1 + day)).toISOString().slice(0, 10);
            for (const goal of GOALS) {
                const first = patchWall(goal.sport, iso).find((p) => p.state === "booked")?.event.name ?? null;
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
     */
    it("accounts for every race of the sport between the two branches", () => {
        const wrong: string[] = [];
        for (let day = 0; day < 366; day++) {
            const iso = new Date(Date.UTC(GOAL_YEAR, 0, 1 + day)).toISOString().slice(0, 10);
            for (const goal of GOALS) {
                const wall = patchWall(goal.sport, iso);
                const booked = wall.filter((p) => p.state === "booked").length;
                const hasNext = nextRace(goal.sport, iso) !== null;
                if ((booked > 0) !== hasNext) wrong.push(`${iso} ${goal.sport}: ${booked} booked but next=${hasNext}`);
                if (patchesEarned(goal.sport, iso) + booked !== wall.length) {
                    wrong.push(`${iso} ${goal.sport}: earned + booked != wall`);
                }
            }
        }
        expect(wrong.slice(0, 5)).toEqual([]);
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

    it("gives the footer card its second lg row, without which the dateline shears", () => {
        // Measured: without this the dateline loses 5px of glyphs at the DEFAULT
        // 16px text size, at every viewport whose height puts `main` on its floor.
        const card = document.querySelector("main")!.lastElementChild!;
        expect(card.getAttribute("class")).toContain("lg:row-span-2");
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

    it("does not add a child to <main>", () => {
        // card-fill.test.ts:347 fires at +1 child with a message naming neither
        // cards nor datelines, so an implementer would hunt the wrong red.
        expect(document.querySelector("main")!.children.length).toBe(6);
    });
});
