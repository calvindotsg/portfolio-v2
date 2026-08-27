import {readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

import {
    isoWeekKey as scriptIsoWeekKey,
    isoWeekMonday as scriptIsoWeekMonday,
    orderSessions,
    renderWeek,
    toSession,
    weekKeysOfYear,
    yearWindow,
} from "../scripts/fetch-strava-weeks.mjs";
import {EVENTS} from "../src/data/races";
import stravaProgress from "../src/data/strava-progress.json";
import {WEEKS} from "../src/data/weeks";
import {recordingsOf} from "../src/lib/race";
import {BUILD_DATE} from "../src/lib/today";
import {
    isoWeekKey, isoWeekMonday, isoWeeksInYear, SESSION_KEYS, sessionKm, sportOf, weekTotals,
} from "../src/lib/training";

/**
 * THE WEEKLY TRAINING SERIES, AND THE FOUR THINGS THAT CAN GO WRONG WITH IT SILENTLY.
 *
 * `src/data/weeks/` is written by a script nobody watches, at 05:13, into a repository that
 * merges its own pull request. Nothing about that arrangement produces a red anything when the
 * data is subtly wrong, so this file is where "subtly wrong" is defined:
 *
 *   1. **THE WEEK BOUNDARY.** An ISO week-year is not a calendar year and the two are easy to
 *      collapse into one. The script cannot import `src/lib/training.ts` — it is a
 *      zero-dependency `.mjs` that Actions runs with no build step — so the week function
 *      exists twice, and the FIRST block below is what makes that duplication safe rather than
 *      merely admitted. Both implementations are run over one shared table.
 *   2. **THE ALLOW-LIST.** A Strava summary activity carried 48 keys when this was measured,
 *      including an athlete-authored title, a route polyline, start and end coordinates and a
 *      heart rate. One spread publishes all of them. Two assertions cover it from both ends:
 *      what is STORED, and what the WRITER produces — and the writer's is asserted as a
 *      projection, because a test that lists forbidden fields passes on the day a new one is
 *      added.
 *   3. **THE SPORT MAPPING.** Which `sport_type` values sit inside `ytd_ride_totals` and
 *      `ytd_run_totals` is an empirical fact about one Strava account rather than a documented
 *      one. Get it wrong and every derived figure is quietly short by whole kilometres, with
 *      the year total on the same page still right. The cross-check is what discriminates.
 *   4. **A SESSION ID REACHING A PAGE.** A race's activity id is published by design, with
 *      "View on Strava" beside it. An ordinary Tuesday's is not, and this plan renders nothing
 *      — so the gate is a set difference rather than a ban, for the reason written on it.
 *
 * WHAT IS DELIBERATELY NOT HERE: anything about how a week is DRAWN. Nothing renders this data
 * yet. `tests/data-contract.test.ts` holds the provenance map; this file holds the data.
 */

const sessions = [...WEEKS.values()].flatMap((week) => week.sessions);

describe("the ISO week, computed twice and held to one answer", () => {
    /**
     * ONE TABLE, BOTH IMPLEMENTATIONS. Each row was computed independently before it was
     * written down — by walking every day of the relevant years — rather than reasoned about,
     * because an off-by-one in an ISO week rule reads exactly like a correct one.
     *
     * THE BOUNDARY ROWS ARE THE POINT. Three of these fall in a different CALENDAR year from
     * the week-year that owns them, which is the fact `src/data/weeks/2026-W01.ts` rests on and
     * the one an earlier draft of plan 045 got backwards.
     */
    const CASES: readonly (readonly [string, string])[] = [
        // A mid-year Wednesday, and its own week's Sunday and the Monday after it.
        ["2026-08-26T19:31:29Z", "2026-W35"],
        ["2026-08-23T23:59:59Z", "2026-W34"],
        ["2026-08-24T00:00:00Z", "2026-W35"],
        // A W01 that begins in the previous calendar year — the case the wall of files rests on.
        ["2025-12-28T10:00:00Z", "2025-W52"],
        ["2025-12-29T00:00:00Z", "2026-W01"],
        ["2026-01-01T09:00:00Z", "2026-W01"],
        ["2026-01-04T23:00:00Z", "2026-W01"],
        ["2026-01-05T00:00:00Z", "2026-W02"],
        // A W53 that runs into the NEXT calendar year. 2026 has 53 ISO weeks; see below.
        ["2026-12-28T06:00:00Z", "2026-W53"],
        ["2027-01-03T23:00:00Z", "2026-W53"],
        ["2027-01-04T00:00:00Z", "2027-W01"],
        // Two more W01s beginning in December, eleven years apart.
        ["2024-12-30T00:00:00Z", "2025-W01"],
        ["2029-12-31T00:00:00Z", "2030-W01"],
    ];

    it("agrees with the script on every case, which is what makes the duplication safe", () => {
        expect(CASES.length, "the table is empty — this block would pass on anything")
            .toBeGreaterThan(10);
        for (const [startLocal, expected] of CASES) {
            expect(isoWeekKey(startLocal), `src/lib/training.ts on ${startLocal}`).toBe(expected);
            expect(scriptIsoWeekKey(startLocal), `the script on ${startLocal}`).toBe(expected);
        }
    });

    it("puts a Sunday and the Monday after it in different weeks, from both sides", () => {
        // The single most likely way to get this wrong is `getDay()`, which calls Sunday 0 and
        // so closes the week one day early. Asserted as a property over a whole year rather
        // than as one pair, so a rule that is right in August and wrong in March is still red.
        for (let day = new Date(Date.UTC(2026, 0, 1)); day < new Date(Date.UTC(2027, 0, 1)); day.setUTCDate(day.getUTCDate() + 1)) {
            const today = day.toISOString().slice(0, 10);
            const tomorrow = new Date(day.getTime() + 86400000).toISOString().slice(0, 10);
            const sameWeek = isoWeekKey(today) === isoWeekKey(tomorrow);
            // A week ends on Sunday, so today and tomorrow differ exactly when today IS Sunday.
            expect(sameWeek, `${today} → ${tomorrow}`).toBe(day.getUTCDay() !== 0);
            expect(scriptIsoWeekKey(today), `the script on ${today}`).toBe(isoWeekKey(today));
        }
    });

    it("counts 53 weeks in 2026, derived independently of the function that answers it", () => {
        /*
         * DERIVED RATHER THAN ASSUMED, and by a rule that shares no code with `isoWeeksInYear`:
         * a week-year has 53 weeks exactly when 1 January is a Thursday, or when it is a leap
         * year and 1 January is a Wednesday. 1 January 2026 is a Thursday, so 2026 has 53 —
         * which is what makes `2026-W53` a real week and `2027-01-03` a member of it.
         */
        const longYear = (year: number): boolean => {
            const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay();
            const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
            return jan1 === 4 || (leap && jan1 === 3);
        };
        for (const year of [2024, 2025, 2026, 2027, 2028, 2029, 2030]) {
            expect(isoWeeksInYear(year), `ISO weeks in ${year}`).toBe(longYear(year) ? 53 : 52);
        }
        expect(isoWeeksInYear(2026), "2026 is the year this repository's first data lands in").toBe(53);
    });

    it("names the Monday a week starts on, which is what a year filter reads", () => {
        // Rule 2 in `src/lib/training.ts`: a page filtering by CALENDAR year asks this rather
        // than the key's first four digits, because those four digits are a week-year.
        expect(isoWeekMonday("2026-W01")).toBe("2025-12-29");
        expect(scriptIsoWeekMonday("2026-W01")).toBe("2025-12-29");
        expect(isoWeekMonday("2026-W53")).toBe("2026-12-28");
        expect(isoWeekMonday("2025-W01")).toBe("2024-12-30");
        expect(isoWeekMonday("2030-W01")).toBe("2029-12-31");

        // Every Monday a key names must belong to the week that key names — the two functions
        // are inverses, and asserting that closes the case a fixed table cannot reach.
        for (const key of weekKeysOfYear(2026)) {
            expect(isoWeekKey(isoWeekMonday(key)), `${key} round-trips`).toBe(key);
        }
    });

    it("rejects a string that is not a week, rather than answering a wrong week for it", () => {
        for (const bad of ["2026-W", "2026W35", "26-W35", "", "2026-W1"]) {
            expect(() => isoWeekMonday(bad), JSON.stringify(bad)).toThrow(/ISO week key/);
        }
        for (const bad of ["", "not-a-date", "2026/08/27"]) {
            expect(() => isoWeekKey(bad), JSON.stringify(bad)).toThrow(/ISO local datetime/);
        }
    });
});

describe("what a week module is allowed to hold", () => {
    it("stores every session under exactly the six allow-listed keys, and no others", () => {
        expect(sessions.length, "no sessions are stored — every assertion in this block is vacuous")
            .toBeGreaterThan(0);
        const expected = [...SESSION_KEYS].sort();
        for (const session of sessions) {
            expect(Object.keys(session).sort(), `session ${session.id}`).toEqual(expected);
        }
    });

    it("holds each field to the shape the writer promises", () => {
        for (const session of sessions) {
            expect(session.id, `session id ${session.id}`).toMatch(/^\d+$/);
            expect(session.sport_type, `session ${session.id}`).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
            expect(session.start_local, `session ${session.id}`).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$/);
            expect(Number.isFinite(session.metres) && session.metres >= 0, `metres on ${session.id}`).toBe(true);
            expect(Number.isInteger(session.moving_seconds) && session.moving_seconds >= 0, `moving on ${session.id}`).toBe(true);
            expect(session.elapsed_seconds, `elapsed below moving on ${session.id}`)
                .toBeGreaterThanOrEqual(session.moving_seconds);
        }
    });

    it("carries no weekly TOTAL, which is the one decision this directory exists to make", () => {
        // A total is a derived value resting on three rules that have each moved. Storing one
        // is the failure that cannot be seen from a rendered page, because a stale total looks
        // exactly like a fresh one. `weekTotals` is where a total comes from; nothing else.
        for (const [key, week] of WEEKS) {
            expect(Object.keys(week).sort(), `${key} holds something besides its sessions`).toEqual(["sessions"]);
        }
    });

    it("puts only its own week in a file, and asserts nothing about the calendar year of it", () => {
        /*
         * A FILE'S KEY IS ITS ISO WEEK KEY AND CARRIES NO CALENDAR-YEAR CLAIM. `2026-W01.ts`
         * legitimately holds sessions dated December 2025 — that week begins on Monday
         * 29 December 2025 — and the module for `2026-W53` will hold sessions dated January
         * 2027. A gate
         * that says otherwise is RED ON CORRECT DATA, verified against three separate years:
         * `2025-W01`, `2026-W01` and `2030-W01` all begin in the previous calendar year.
         */
        expect(WEEKS.size, "no weeks are collected — this gate is vacuous").toBeGreaterThan(0);
        for (const [key, week] of WEEKS) {
            expect(key, "a week module is named for its ISO week and nothing else").toMatch(/^\d{4}-W\d{2}$/);
            for (const session of week.sessions) {
                expect(isoWeekKey(session.start_local), `session ${session.id} is filed under ${key}`).toBe(key);
            }
        }
    });

    it("sorts every stored week the way the writer would write it", () => {
        // The byte-stability contract, asserted against the data rather than against a re-run:
        // a hand edit that reorders a file survives `pnpm check` and would be rewritten by the
        // next nightly, which is a diff nobody asked for.
        for (const [key, week] of WEEKS) {
            const ordered = orderSessions(week.sessions).map((s: {id: string}) => s.id);
            expect(week.sessions.map((s) => s.id), `${key} is out of order`).toEqual(ordered);
        }
    });
});

describe("the writer's allow-list, asked of the writer rather than of the data", () => {
    /**
     * THE PROJECTION IS WHAT IS ASSERTED, NOT THE FIXTURE. The obvious spelling of this test
     * lists the fields that must not survive and checks each is absent — and that spelling
     * passes on the day Strava adds a 49th field, which is the exact failure the allow-list
     * exists to prevent. Comparing the RESULT'S KEY SET to `SESSION_KEYS` fails on any extra
     * key, named or not.
     */
    const ACTIVITY = {
        id: 19876422727,
        sport_type: "Run",
        start_date_local: "2026-08-24T18:27:38Z",
        distance: 6007.3,
        moving_time: 2439,
        elapsed_time: 2971,
        // Everything below was present on real activities when this was measured on 2026-08-27:
        // `name`, `map`, `start_latlng` and `end_latlng` on all 200 of the most recent,
        // `suffer_score` on 199, `device_name` on 195, `average_heartrate` on 170.
        name: "Evening Run",
        description: "felt easy",
        map: {id: "a19876422727", summary_polyline: "}~mFyz_xRnAoB", resource_state: 2},
        start_latlng: [1.3521, 103.8198],
        end_latlng: [1.3530, 103.8200],
        average_heartrate: 152.4,
        max_heartrate: 171,
        suffer_score: 88,
        average_watts: 231,
        gear_id: "g12345678",
        device_name: "Garmin Forerunner 965",
        athlete: {id: 37641259, resource_state: 1},
        start_date: "2026-08-24T10:27:38Z",
        timezone: "(GMT+08:00) Asia/Singapore",
        achievement_count: 3,
    };

    it("returns exactly the six keys, whatever it was handed", () => {
        const session = toSession(ACTIVITY);
        expect(Object.keys(session).sort()).toEqual([...SESSION_KEYS].sort());
    });

    it("copies each of the six through unchanged, and stringifies the id", () => {
        expect(toSession(ACTIVITY)).toEqual({
            id: "19876422727",
            sport_type: "Run",
            start_local: "2026-08-24T18:27:38Z",
            metres: 6007.3,
            moving_seconds: 2439,
            elapsed_seconds: 2971,
        });
    });

    it("cannot be made to emit a private field by any value of it", () => {
        // The negative control for the block above: if `toSession` spread its input, this
        // rendered module would carry a polyline and a heart rate. Rendering rather than
        // inspecting, because rendering is what actually reaches the repository.
        const rendered = renderWeek([toSession(ACTIVITY)]);
        for (const forbidden of ["polyline", "latlng", "heartrate", "suffer", "watts", "gear_id", "device", "Evening Run", "felt easy", "Garmin"]) {
            expect(rendered.toLowerCase(), `\`${forbidden}\` reached a week module`)
                .not.toContain(forbidden.toLowerCase());
        }
    });

    it("throws on a bad value rather than writing a plausible wrong one", () => {
        const withField = (patch: Record<string, unknown>) => ({...ACTIVITY, ...patch});
        expect(() => toSession(withField({id: "not-an-id"}))).toThrow(/activity id/);
        expect(() => toSession(withField({sport_type: 'Ride", evil: "1'}))).toThrow(/sport_type/);
        expect(() => toSession(withField({sport_type: 42}))).toThrow(/sport_type/);
        expect(() => toSession(withField({start_date_local: "2026-08-24"}))).toThrow(/start_date_local/);
        expect(() => toSession(withField({distance: -1}))).toThrow(/distance/);
        expect(() => toSession(withField({distance: null}))).toThrow(/distance/);
        expect(() => toSession(withField({moving_time: 12.5}))).toThrow(/moving_time/);
        expect(() => toSession(withField({elapsed_time: 100}))).toThrow(/below moving_time/);
        // Zero distance is LEGAL and must not throw — 34 weight-training sessions recorded none.
        expect(toSession(withField({distance: 0})).metres).toBe(0);
    });

    it("asks for a window that covers every week it will then sweep", () => {
        /*
         * THE SWEEP DELETES A COVERED WEEK THAT CAME BACK EMPTY, so a window narrower than the
         * covered set would delete a real week every night. Asserted as a containment rather
         * than as two epoch literals: the numbers are derived, and pinning them here would make
         * this a copy of the implementation instead of a check on it.
         */
        for (const year of [2025, 2026, 2027]) {
            const keys = weekKeysOfYear(year);
            const {after, before} = yearWindow(year);
            const firstMonday = Date.parse(`${isoWeekMonday(keys[0])}T00:00:00Z`) / 1000;
            const lastSunday = Date.parse(`${isoWeekMonday(keys[keys.length - 1])}T00:00:00Z`) / 1000 + 7 * 86400;
            // A day of margin beyond the widest timezone offset any activity can carry.
            expect(after, `${year} starts too late`).toBeLessThan(firstMonday - 86400);
            expect(before, `${year} ends too early`).toBeGreaterThan(lastSunday + 86400);
            expect(keys[0]).toBe(`${year}-W01`);
        }
    });
});

describe("the sessions, against the year total they are published beside", () => {
    /**
     * THE CROSS-CHECK, AND IT IS THE ONLY THING THAT CAN SEE A WRONG SPORT MAPPING.
     *
     * MEASURED ON 2026-08-27 against the live API, over all 228 activities Strava returned for
     * calendar 2026: the subset whose metres sum to `ytd_ride_totals.distance` is exactly
     * `Ride`, and the subset that sums to `ytd_run_totals.distance` is exactly `Run` and
     * `TrailRun`. The residual disagreement was **1.6 m on the ride total and 0.3 m on the run
     * total** — 0.0001 % of each — which is float summation rather than a missing activity.
     * `TOLERANCE_M` below is that measurement rounded up to the next whole metre, and it is a
     * measured figure rather than a round number chosen to make the suite green: plan 045 made
     * "needs more than 1 % to pass" a stop condition, and 2 m is 0.00008 % of the ride total.
     *
     * THE HUNDRED-METRE BUCKET IS THE STORED FIGURE'S OWN, NOT SLACK. The bot writes
     * kilometres to ONE decimal, rounded DOWN (`kmFromMeters` in
     * `scripts/fetch-strava-progress.mjs`), so `2602.2` means "somewhere in [2602200, 2602300)".
     * A comparison that ignored that would be wrong by up to 99.9 m by construction.
     */
    const TOLERANCE_M = 2;

    const year = Number(BUILD_DATE.slice(0, 4));
    const inYear = sessions.filter((session) => session.start_local.slice(0, 4) === String(year));
    const metresFor = (sport: "cycling" | "running") => inYear
        .filter((session) => sportOf(session.sport_type) === sport)
        .reduce((total, session) => total + session.metres, 0);

    it("has sessions to compare at all", () => {
        expect(sessions.length, "src/data/weeks/ is empty — every row below would pass on nothing")
            .toBeGreaterThan(0);
    });

    for (const [sport, stored] of [
        ["cycling", stravaProgress.cycling_km],
        ["running", stravaProgress.running_km],
    ] as const) {
        it(`sums this year's ${sport} sessions to what the bot published`, () => {
            const summed = metresFor(sport);
            const floor = stored * 1000;
            /*
             * THE ZERO CASE IS NOT AN EXEMPTION, it is the first week of January: the year
             * totals reset on 1 January and there may genuinely be nothing yet. The interval
             * assertion is made either way and is correct at zero; only the non-emptiness check
             * below is conditional, and it is conditional on the STORED figure rather than on
             * the summed one, so a mapping that returned null for everything is still red.
             */
            expect(summed, `${sport}: sessions sum below what strava-progress.json publishes`)
                .toBeGreaterThanOrEqual(floor - TOLERANCE_M);
            expect(summed, `${sport}: sessions sum above the 0.1 km bucket strava-progress.json publishes`)
                .toBeLessThan(floor + 100 + TOLERANCE_M);
            if (stored > 0) {
                expect(summed, `${sport}: the bot published ${stored} km and no session maps to this sport`)
                    .toBeGreaterThan(0);
            }
        });
    }

    it("assigns every stored sport_type deliberately, to a goal or to neither", () => {
        // Not an assertion that the map is COMPLETE — it cannot be, and `sportOf` returning
        // null for an unseen value is the fail-loud half of the design. This is the record of
        // what was measured, so a value appearing that the measurement never saw shows up here
        // as a named surprise rather than as a silent zero in the rows above.
        const MEASURED_2026 = [
            "Elliptical", "HighIntensityIntervalTraining", "Hike", "Kayaking", "Ride", "Run",
            "TrailRun", "Walk", "WeightTraining", "Workout",
        ];
        const seen = [...new Set(sessions.map((session) => session.sport_type))].sort();
        const unmeasured = seen.filter((sport) => !MEASURED_2026.includes(sport));
        expect(unmeasured,
            "a sport_type nobody measured is now stored. Re-run the step-1 measurement before "
            + "deciding whether it belongs in a goal — `sportOf` returns null for it today, so "
            + "its metres are in no total").toEqual([]);
        expect(sportOf("Ride")).toBe("cycling");
        expect(sportOf("Run")).toBe("running");
        expect(sportOf("TrailRun")).toBe("running");
        expect(sportOf("Walk"), "walking is training and is not a goal").toBeNull();
    });

    it("derives a week's totals rather than reading them, and keeps the two sports apart", () => {
        for (const [key, week] of WEEKS) {
            const totals = weekTotals(week);
            expect(totals.sessions, `${key} counts its sessions`).toBe(week.sessions.length);
            expect(totals.metres, `${key} sums every session`)
                .toBeCloseTo(week.sessions.reduce((t, s) => t + s.metres, 0), 6);
            // The two sports never exceed the whole, and the residue is the unassigned sports.
            expect(totals.run_metres + totals.ride_metres, `${key} over-counts`)
                .toBeLessThanOrEqual(totals.metres + 1e-6);
        }
        // The conversion is `kmFromMetres` and is not restated: 6007.3 m rounds DOWN to 6.00 km.
        expect(sessionKm({
            id: "1", sport_type: "Run", start_local: "2026-08-24T18:27:38Z",
            metres: 6007.3, moving_seconds: 1, elapsed_seconds: 1,
        })).toBe(6.00);
    });
});

describe("no ordinary session's id reaches a published page", () => {
    /**
     * THE SET DIFFERENCE, AND THE NAIVE SPELLING OF THIS GATE IS RED ON CORRECT CONTENT.
     *
     * The obvious assertion is "no id from `src/data/weeks/` appears in `dist/`", and it is
     * false the day it is written: a race IS a Strava activity, so its `recordings[].id` is a
     * session id AND is already published as an href — `stravaActivityUrl` in
     * `src/lib/race.ts` builds it, `src/components/Patch.astro` renders it on the stub, and
     * `src/lib/patch-doc.ts` emits it into the markdown twins. Those links are required to
     * read "View on Strava" and they stay.
     *
     * SO THE INVARIANT IS THE SUBTRACTION: every id the weeks hold, minus every id a race
     * names, must appear nowhere in the built output. Plan 045 renders nothing, and this is
     * what says so in a way that survives 046 rendering a spine — a page may draw a week, and
     * may not address one of its sessions on Strava.
     *
     * THE SUBTRACTION IS ASSERTED NON-EMPTY FIRST, or the gate is vacuous on a week that
     * happens to contain only races.
     */
    const raceIds = new Set(EVENTS.flatMap((event) => recordingsOf(event).map((r) => r.id)));
    const ordinary = [...new Set(sessions.map((s) => s.id))].filter((id) => !raceIds.has(id));

    it("has ids to look for, and races to subtract", () => {
        expect(raceIds.size, "no race names a recording — the subtraction below removes nothing "
            + "and the gate proves less than it claims").toBeGreaterThan(0);
        expect(ordinary.length, "every stored session is a race, so this gate is vacuous")
            .toBeGreaterThan(0);
    });

    it("publishes none of them anywhere in dist/", () => {
        const found: string[] = [];
        const walk = (dir: string): void => {
            for (const entry of readdirSync(dir, {withFileTypes: true})) {
                const path = join(dir, entry.name);
                if (entry.isDirectory()) { walk(path); continue; }
                if (!/\.(html|txt|md|xml|json|js|css)$/.test(entry.name)) continue;
                const text = readFileSync(path, "utf8");
                found.push(...ordinary.filter((id) => text.includes(id)).map((id) => `${path}: ${id}`));
            }
        };
        walk("dist");
        expect(found.sort(),
            "a training session's Strava id reached the built output. A race's id is published "
            + "by design, with \"View on Strava\" beside it; an ordinary Tuesday's is not.")
            .toEqual([]);
    });

    it("still publishes the race ids, so the subtraction is not hiding a regression", () => {
        // The control. If the wall stopped linking its recordings, the gate above would go on
        // passing and would mean nothing — the exemption would be exempting nobody.
        const wall = readFileSync("dist/patches.md", "utf8");
        const published = [...raceIds].filter((id) => wall.includes(id));
        expect(published.length, "no race id is published on the wall's markdown twin, so the "
            + "exemption this gate is built around no longer describes the site").toBeGreaterThan(0);
    });
});
