import {describe, expect, it, vi} from "vitest";

import type {Goal, RaceEvent} from "../src/lib/constants";

/**
 * THE GATE ON THE CLOCK SPLIT ITSELF, AND IT LIVES IN ITS OWN FILE BECAUSE IT HAS TO MOCK
 * THE BOT'S JSON.
 *
 * The three "the site's clock" tests in projection.test.ts can only discriminate on a day
 * `UPDATED_AT` and `BUILD_DATE` actually differ — they say so themselves. What none of us
 * noticed until a review panel measured it: **the bot's own commit inside this PR made
 * today such a day of coincidence**, so at the moment of merge every one of those gates
 * was passing without proving anything, and reverting the entire split — all four
 * `= BUILD_DATE` defaults back to `= UPDATED_AT` — left `pnpm check && pnpm test` fully
 * green at 314. The production code was correct and completely unguarded, which is the
 * state a later tidy-up undoes in silence.
 *
 * THE FIX IS TO STOP LETTING BOT DATA DECIDE WHETHER THE GATE RUNS. Mocking the JSON
 * module forces the divergence, so these assertions bite on every day of the year,
 * including the days the owner rides.
 *
 * WHY A SEPARATE FILE. `vi.mock` is file-scoped, and this mock is exactly the kind that
 * must not leak: projection.test.ts and patch-wall.test.ts compare recomputed values
 * against pages in `dist/`, which were built with the REAL stamp. Mocking there reddens
 * two of those assertions on correct code (measured: 2 failed). One file, one mock, no
 * reach.
 *
 * EVERY DAY IS PINNED AS A LITERAL and the stamp is derived by subtracting a lag, so
 * nothing here can go red on a future build day — the failure mode this repo cares most
 * about, since a red suite blocks the deploy.
 */

/** A fixed "today" for the build clock. Never `new Date()`: see projection.ts's header. */
const BUILD = "2026-07-29";
const day = (iso: string, delta: number): string =>
    new Date(Date.parse(`${iso}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

/** How far the bot's stamp lags the build. 9 days = an ordinary rest week plus a weekend. */
const LAG = 9;
const STAMP = day(BUILD, -LAG);

vi.mock("../src/data/strava-progress.json", () => ({
    default: {cycling_km: 2279.7, running_km: 168.8, updated_at: STAMP},
}));
vi.mock("../src/lib/today", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../src/lib/today")>()),
    BUILD_DATE: BUILD,
}));

const {UPDATED_AT, daysRemaining, goalStatus, nextRace, patchState, patchWall, patchesEarned} =
    await import("../src/lib/projection");
const {BUILD_DATE} = await import("../src/lib/today");

// Booked by default; an override carrying `recordings` makes it recorded. See the same
// builder in patch-wall.test.ts for why the cast is here.
const ev = (over: Partial<RaceEvent> = {}): RaceEvent =>
    ({date: BUILD, name: "Fixture", advertised_km: 10, sport: "running", country: "Nowhere", ...over}) as RaceEvent;

describe("the two clocks are wired to the questions they answer", () => {
    it("mocks a stamp that lags the build day, or none of this discriminates", () => {
        expect(UPDATED_AT, "the mock must reach projection.ts").toBe(STAMP);
        expect(BUILD_DATE).toBe(BUILD);
        expect(UPDATED_AT).not.toBe(BUILD_DATE);
    });

    /**
     * One assertion per calendar function, because a mutation that flips all four defaults
     * at once only proves the UNION is covered. Each of these fails alone.
     */
    it("answers every CALENDAR question from the build day", () => {
        const yesterday = ev({date: day(BUILD, -1), name: "Run Yesterday"});
        const ahead = ev({date: day(BUILD, 10), name: "Ten Days Out"});

        expect(patchState(yesterday), "patchState").toBe("finished");
        expect(patchState(ev({date: BUILD})), "patchState: a day is not over until it is over").toBe("booked");
        expect(nextRace("running", undefined, [ahead])?.daysAway, "nextRace").toBe(10);
        expect(patchesEarned("running", undefined, [yesterday]), "patchesEarned").toBe(1);
        // patchWall gets its own line because reverting it ALONE was still green after the
        // other three were pinned — the precise hole a group mutation cannot report. Booked
        // sorts before finished, so a stamp-read wall returns ["booked", "booked"].
        expect(
            patchWall("running", undefined, [yesterday, ev({date: BUILD, name: "Racing Now"})]).map((p) => p.state),
            "patchWall",
        ).toEqual(["booked", "finished"]);
    });

    it("answers the KILOMETRE question from the stamp, so numerator and denominator age together", () => {
        const goal: Goal = {
            total_goal: 600, current_progress: 168.8, raw_progress: 168.8, progress_last_year: null,
            goal_name: "Running", short_name: "running", goal_logo: "ri:run-line",
            measurable_unit: "km", sport: "running",
        } as Goal;
        const status = goalStatus(goal, undefined, []);
        if (status.kind !== "rate" && status.kind !== "final") throw new Error(`unexpected ${status.kind}`);
        expect(status.days, "goalStatus must divide by the days left from the STAMP").toBe(daysRemaining(STAMP));
        expect(status.days).not.toBe(daysRemaining(BUILD));
    });
});
