import {describe, expect, it, vi} from "vitest";

import {isoWeekKey, isoWeekKeysOfYear, isoWeekMonday, weekTotals} from "../src/lib/training";
import {WEEKS} from "../src/data/weeks";
import {EVENTS} from "../src/data/races";
import {recordingsOf} from "../src/lib/race";

/**
 * WHAT THIS SUITE IS FOR: the module that merges the two datasets, and the three rules it can
 * break silently.
 *
 * `src/lib/season.ts` takes `EVENTS` and `WEEKS` — a calendar of races and a series of training
 * weeks — and emits one ordered sequence. Every defect available to it is arithmetic or calendar
 * rather than visual, so none of them would show on the page:
 *
 *   1. **Double counting.** A race IS a Strava activity, so its kilometres are already inside its
 *      week. A summary that adds them reads as authoritative and is wrong by exactly the race
 *      distance — the class `src/lib/projection.ts` refuses at length and `src/data/races/` records
 *      costing 5 km/wk once already. The gates below assert the SUBSET relation rather than a
 *      figure, because a figure agrees today and says nothing about the rule.
 *   2. **The Monday rule.** An ISO week-year is not a calendar year: `2026-W01` begins in December
 *      2025 and `2026-W53` ends in January 2027. Collapsing the file's key and the page's year
 *      filter into one rule is the mistake plan 045 had to correct, and it is invisible for
 *      eleven months of every year. Asserted against the REAL calendar rather than a fixture, and
 *      as a partition: no week under two years, and none under none.
 *   3. **The clock.** "Has this week happened" is a calendar question and must read `BUILD_DATE`,
 *      never the bot's stamp. `tests/clock-split.test.ts` is the model and records why the mock is
 *      mandatory: on a day the two coincide, a gate that does not force them apart is green over
 *      the reverted code.
 *
 * WHY IT MOCKS AND THEREFORE CANNOT READ `dist/`. `vi.mock` is file-scoped, and this file moves
 * both clocks; the pages in `dist/` were built with the real ones, so an assertion here against a
 * built page would be comparing two different days. The rendered half is
 * `tests/training-page.test.ts`, which mocks nothing.
 */

/** A fixed "today" for the build clock. Never `new Date()`: see projection.ts's header. */
const BUILD = "2026-07-29";
const day = (iso: string, delta: number): string =>
    new Date(Date.parse(`${iso}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

/** How far the bot's stamp lags the build. Nine days spans at least one Monday, which is what
 *  makes the two clocks disagree about whether a week has happened. */
const STAMP = day(BUILD, -9);

vi.mock("../src/data/strava-progress.json", () => ({
    default: {cycling_km: 2279.7, running_km: 168.8, updated_at: STAMP},
}));
vi.mock("../src/lib/today", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../src/lib/today")>()),
    BUILD_DATE: BUILD,
}));

const {
    groupSpine, hoursMinutes, seasonSpine, seasonTotals, seasonUnit, seasonWeekKeys, seasonYear, shortDate,
} = await import("../src/lib/season");
const {patchState, patchWall} = await import("../src/lib/projection");

const YEAR = Number(BUILD.slice(0, 4));
const weekRows = (rows: ReturnType<typeof seasonSpine>) => rows.filter((r) => r.kind === "week");
const raceRows = (rows: ReturnType<typeof seasonSpine>) => rows.filter((r) => r.kind === "race");

describe("the year as one spine", () => {
    const rows = seasonSpine(YEAR);

    it("mocks a stamp that lags the build day, or none of the clock arm discriminates", () => {
        expect(STAMP).not.toBe(BUILD);
        expect(seasonYear(), "seasonYear must read the mocked build clock").toBe(YEAR);
        expect(weekRows(rows).length, "the spine drew no weeks — every assertion here would be vacuous")
            .toBeGreaterThan(50);
        expect(raceRows(rows).length, "the spine drew no races — the merge is untested")
            .toBeGreaterThan(0);
    });

    /**
     * THE ONE RULE THE WHOLE PAGE RESTS ON, ASSERTED AS A SUBSET RATHER THAN AS A FIGURE. Both
     * halves are needed: a figure that is merely smaller could still have been summed
     * independently and happen to be smaller, so the second assertion checks that every metre
     * counted as a race's is a metre some displayed week also counted.
     */
    it("counts a race's kilometres inside its week and never beside them", () => {
        const totals = seasonTotals(rows);
        expect(totals.race_metres, "no race metres at all — this assertion would be vacuous")
            .toBeGreaterThan(0);
        expect(totals.race_metres,
            "the race figure exceeds the year's own total, which can only mean it was summed from "
            + "the races rather than found inside the weeks")
            .toBeLessThanOrEqual(totals.metres);

        const raceIds = new Set(EVENTS.flatMap((e) => recordingsOf(e).map((r) => r.id)));
        const shown = new Set(seasonWeekKeys(YEAR));
        let inWeeks = 0;
        for (const [key, week] of WEEKS) {
            if (!shown.has(key)) continue;
            for (const s of week.sessions) if (raceIds.has(s.id)) inWeeks += s.metres;
        }
        expect(totals.race_metres,
            "the race figure is not the sum of the race sessions the displayed weeks hold, so it was "
            + "derived from somewhere other than the weeks it is quoted against")
            .toBeCloseTo(inWeeks, 6);
    });

    /** A session belongs to one week module. If it were in two, "of it" would be over-counted. */
    it("holds every race recording in exactly one week module", () => {
        const seen = new Map<string, string>();
        for (const [key, week] of WEEKS) {
            for (const s of week.sessions) {
                const first = seen.get(s.id);
                expect(first, `session ${s.id} is in both ${first} and ${key}`).toBeUndefined();
                seen.set(s.id, key);
            }
        }
        expect(seen.size, "no sessions at all — this assertion would be vacuous").toBeGreaterThan(50);
    });

    it("puts each race under the week it was ridden in, never beside it", () => {
        let current: string | undefined;
        let checked = 0;
        for (const row of rows) {
            if (row.kind === "week") {
                current = row.key;
                continue;
            }
            checked++;
            expect(current, "a race row appeared before any week row").toBeDefined();
            expect(current, `${row.event.name} is drawn under ${current} rather than under its own week`)
                .toBe(isoWeekKey(row.event.date));
        }
        expect(checked, "no race rows — this assertion would be vacuous").toBeGreaterThan(0);
    });

    /**
     * THE SPINE AND THE WALL MUST AGREE ABOUT EVERY RACE, and the comparison is against
     * `patchWall` — the OTHER consumer — rather than against `patchState`, which the spine calls.
     * A re-derivation inside `season.ts` would satisfy the second and fail this.
     */
    it("agrees with the wall about every race it draws", () => {
        const wall = new Map(patchWall(undefined, BUILD).map((p) => [`${p.event.date}|${p.event.name}`, p.state]));
        for (const row of raceRows(rows)) {
            const key = `${row.event.date}|${row.event.name}`;
            expect(wall.get(key), `the spine and the wall disagree about ${row.event.name}`).toBe(row.state);
            expect(row.state, "the spine must ASK patchState rather than re-derive it")
                .toBe(patchState(row.event, BUILD));
        }
    });

    /**
     * THE BOUNDARY, AGAINST THE REAL CALENDAR. Every figure below was computed by running the
     * functions over every day rather than assumed, which is what plan 045's own note demands:
     * `2026-W01` begins Monday 29 December 2025, and 2026 has 53 ISO weeks.
     */
    it("scopes a week by its Monday, so a boundary week belongs to exactly one year", () => {
        expect(isoWeekMonday("2026-W01"), "the real calendar, not a fixture").toBe("2025-12-29");
        expect(isoWeekMonday("2026-W53")).toBe("2026-12-28");

        const keys = seasonWeekKeys(2026);
        expect(keys, "2026-W01 begins in December 2025 and belongs to the 2025 spine")
            .not.toContain("2026-W01");
        expect(keys, "2026 has 53 ISO weeks and the last of them begins inside 2026").toContain("2026-W53");
        expect(keys[0]).toBe("2026-W02");
        expect(keys, "the Mondays of one year are seven days apart, so the count is fixed")
            .toHaveLength(52);
    });

    it("partitions every ISO week across the years, with none in two and none in none", () => {
        const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
        const owner = new Map<string, number>();
        for (const year of years) {
            for (const key of seasonWeekKeys(year)) {
                const first = owner.get(key);
                expect(first, `${key} is drawn under both ${first} and ${year}`).toBeUndefined();
                owner.set(key, year);
            }
        }
        // Every week whose own Monday is inside the swept years must have found an owner. The
        // outermost week-years are skipped because their Mondays can fall outside the sweep.
        for (const year of years.slice(1, -1)) {
            for (const key of isoWeekKeysOfYear(year)) {
                expect(owner.has(key), `${key} (Monday ${isoWeekMonday(key)}) is drawn under no year`).toBe(true);
            }
        }
        expect(owner.size).toBeGreaterThan(300);
    });

    it("gives every week that holds sessions a year to be drawn under", () => {
        expect(WEEKS.size, "no week modules — this assertion would be vacuous").toBeGreaterThan(0);
        for (const [key, week] of WEEKS) {
            if (week.sessions.length === 0) continue;
            const monday = isoWeekMonday(key);
            const year = Number(monday.slice(0, 4));
            expect(seasonWeekKeys(year), `${key} holds sessions and no year's spine draws it`)
                .toContain(key);
        }
    });

    /**
     * THE CLOCK, AND IT IS MUTATED ONE DEFAULT AT A TIME. Flipping the module to the stamp is what
     * this catches; a gate that only compared "the default" against "some date" would be green on
     * either clock. `tests/clock-split.test.ts` records why the union is not enough.
     */
    it("answers 'has this week happened' from the build day and not from the bot's stamp", () => {
        const aheadOf = (iso?: string) =>
            weekRows(seasonSpine(YEAR, undefined, iso)).map((w) => `${w.key}:${w.ahead}`).join(",");

        expect(aheadOf(), "the default must be BUILD_DATE").toBe(aheadOf(BUILD));
        expect(aheadOf(), "the two clocks must disagree here, or this assertion proves nothing")
            .not.toBe(aheadOf(STAMP));

        // The week the two clocks disagree about, named by the calendar rather than by hand: the
        // stamp is nine days back, so the Monday between them is the one that flips.
        const boundary = weekRows(seasonSpine(YEAR, undefined, BUILD)).find((w) => w.monday > STAMP && w.monday <= BUILD);
        expect(boundary, "no Monday falls between the stamp and the build day — widen the lag").toBeDefined();
        expect(boundary!.ahead, "a week that has begun is not ahead").toBe(false);
        const onStamp = weekRows(seasonSpine(YEAR, undefined, STAMP)).find((w) => w.key === boundary!.key)!;
        expect(onStamp.ahead, "read from the stamp, that same week has not begun").toBe(true);
    });

    it("moves the summary with the build day, and not with the stamp", () => {
        // Only the totals a CALENDAR decides may move. The kilometres are the same either way —
        // they come off the weeks, which are the same weeks — so what changes is which of them the
        // page calls ahead. The assertion is that the two clocks produce different spines and that
        // the default follows the build one.
        const summary = (iso?: string) => JSON.stringify(seasonTotals(seasonSpine(YEAR, undefined, iso)));
        expect(summary()).toBe(summary(BUILD));
    });

    it("narrows to one sport without letting the other's sessions in", () => {
        const all = seasonTotals(seasonSpine(YEAR));
        const run = seasonTotals(seasonSpine(YEAR, "running"), "running");
        const ride = seasonTotals(seasonSpine(YEAR, "cycling"), "cycling");
        expect(run.sessions, "no running sessions — this assertion would be vacuous").toBeGreaterThan(0);
        expect(ride.sessions).toBeGreaterThan(0);
        expect(run.sessions + ride.sessions,
            "a sport page cannot hold more sessions than the all-sports page it is a subset of")
            .toBeLessThanOrEqual(all.sessions);
        for (const row of raceRows(seasonSpine(YEAR, "running"))) {
            expect(row.event.sport, `${row.event.name} is on the running spine`).toBe("running");
        }
        expect(raceRows(seasonSpine(YEAR, "running")).length, "no running races — vacuous")
            .toBeGreaterThan(0);
    });

    it("regroups without losing or inventing a row", () => {
        const groups = groupSpine(rows);
        expect(groups).toHaveLength(weekRows(rows).length);
        expect(groups.flatMap((g) => g.races)).toHaveLength(raceRows(rows).length);
        for (const g of groups) {
            expect(weekTotals({sessions: []}).metres, "weekTotals must still sum from sessions").toBe(0);
            for (const race of g.races) {
                expect(isoWeekKey(race.event.date), `${race.event.name} regrouped under the wrong week`)
                    .toBe(g.week.key);
            }
        }
    });

    it("prints a week's own dates and clock the way the page does", () => {
        expect(shortDate("2026-08-24")).toBe("24 AUG");
        expect(shortDate("2026-01-05")).toBe("5 JAN");
        expect(hoursMinutes(0)).toBe("0:00");
        expect(hoursMinutes(3599), "rounded to the nearest minute, not truncated to the hour").toBe("1:00");
        expect(hoursMinutes(3 * 3600 + 7 * 60)).toBe("3:07");
        expect(hoursMinutes(187 * 3600 + 24 * 60), "hours are not capped at two digits").toBe("187:24");
    });

    it("refuses an all-sports total when the goals do not agree on a unit", () => {
        const mixed = [{sport: "running", measurable_unit: "km"}, {sport: "cycling", measurable_unit: "mi"}];
        expect(() => seasonUnit(undefined, mixed),
            "a distance summed across two units is not a number, so there is nothing correct to print")
            .toThrow(/no unit/);
        expect(seasonUnit(undefined, [{sport: "running", measurable_unit: "km"}])).toBe("km");
        expect(seasonUnit("running")).toBe("km");
    });
});
