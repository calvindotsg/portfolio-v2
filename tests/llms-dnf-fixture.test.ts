import {describe, expect, it, vi} from "vitest";

import type {RaceEvent} from "../src/lib/constants";

/**
 * THE ONE SHAPE `EVENTS` DOES NOT CURRENTLY HOLD, AND THE ONLY PLACE IT CAN BE HELD.
 *
 * `llms.txt.ts` omits the distance clause for a race that was abandoned with nothing
 * recorded, because `raceKm` falls back to the ADVERTISED distance where no metres exist —
 * so without the omission the file written for machines states that the rider covered the
 * whole of a route he did not finish. That is the exact claim the bib beside it is drawn to
 * refuse.
 *
 * WHAT THIS FILE EXISTS TO FIX: every assertion guarding that branch in
 * `tests/build-output.test.ts` is written against `dist/llms.txt`, and reaches the branch
 * only through `if (patchState(event) === "dnf" && recordingsOf(event).length === 0)`. No row
 * in `EVENTS` satisfies it — the calendar's one abandoned race carries two recordings — so
 * every one of those assertions takes its else-arm on every build. MEASURED: replacing the
 * endpoint's whole condition with `false`, which restores the defect exactly, rebuilt and
 * left the suite at 451 passed / 7 skipped. The fix was shipped completely unguarded, which
 * is the state a later tidy-up undoes in silence.
 *
 * The bib half of the same fix does NOT have this hole — `tests/patch-wall.test.ts` drives it
 * from a synthetic fixture — so this is the asymmetry closed rather than a new idea.
 *
 * WHY A SEPARATE FILE, AND IT IS THE REASON `clock-split.test.ts` GIVES. `vi.mock` is
 * file-scoped and this one must not leak: `build-output.test.ts`, `projection.test.ts` and
 * `patch-wall.test.ts` all compare recomputed values against pages in `dist/`, which were
 * built from the REAL `EVENTS`. A mocked calendar reddens those on correct code. One file,
 * one mock, no reach.
 *
 * THE FIXTURE IS BOOKED-SHAPED ON PURPOSE — an advertised `km` and no `recordings` — because
 * that is the shape carrying the lie. It is legal: `outcome` sits on the union's booked arm,
 * so this is one data edit away rather than an impossible state, and the day a race is
 * abandoned before the watch records anything it is the shape the calendar will hold.
 */

const ABANDONED_KM = 1022.00;

const DNF_NOTHING_RECORDED = {
    date: "2020-03-01",
    name: "Fixture Tour That Was Abandoned",
    km: ABANDONED_KM,
    sport: "cycling",
    country: "Nowhere",
    outcome: "dnf",
} as unknown as RaceEvent;

vi.mock("../src/lib/constants", async (importOriginal) => {
    const real = await importOriginal<typeof import("../src/lib/constants")>();
    return {...real, EVENTS: [...real.EVENTS, DNF_NOTHING_RECORDED]};
});

const {GET} = await import("../src/pages/llms.txt");
const {patchState} = await import("../src/lib/projection");

const render = async (): Promise<string> => {
    const response = GET({site: new URL("https://example.test/")} as never) as Response;
    return await response.text();
};

describe("llms.txt on a race abandoned with nothing recorded", () => {
    it("puts the fixture in the state this file is about, or nothing below discriminates", () => {
        // The calibration. If the fixture stopped reaching the `dnf` branch — a changed
        // `patchState`, a changed union — every assertion below would pass by never being
        // about anything, which is the failure mode this whole file was written against.
        expect(patchState(DNF_NOTHING_RECORDED), "the fixture must be an abandoned race")
            .toBe("dnf");
        expect(DNF_NOTHING_RECORDED.recordings, "the fixture must carry no recordings")
            .toBeUndefined();
    });

    it("reaches the endpoint at all, so the mock is doing something", async () => {
        const row = (await render()).split("\n").find((l) => l.includes(DNF_NOTHING_RECORDED.name));
        expect(row, "the mocked calendar must reach llms.txt, or this file tests the real EVENTS")
            .toBeDefined();
    });

    it("claims no distance for it", async () => {
        const row = (await render()).split("\n").find((l) => l.includes(DNF_NOTHING_RECORDED.name))!;
        // NOT a check for the specific figure. Any distance at all is the defect: there is
        // no honest number for a route he abandoned before anything was recorded, so the
        // row must carry none rather than a smaller one.
        expect(row, `the row must claim no distance — the only figure available is the `
            + `advertised ${ABANDONED_KM} km, which is the whole route he did not finish`)
            .not.toMatch(/\d+(\.\d+)? km/);
        expect(row, "and it must not say it anywhere else on the line either")
            .not.toContain(String(ABANDONED_KM));
    });

    it("still names the race, its date and its country", async () => {
        // The omission must be the CLAUSE, not the row. Dropping the race entirely would
        // also satisfy the assertion above, and would hide a race he entered.
        const row = (await render()).split("\n").find((l) => l.includes(DNF_NOTHING_RECORDED.name))!;
        expect(row).toContain(DNF_NOTHING_RECORDED.date);
        expect(row).toContain(DNF_NOTHING_RECORDED.country);
        // No doubled or dangling separator where the clause used to be.
        expect(row, "the separators must close up around the missing clause").not.toMatch(/,\s*,/);
        expect(row.trimEnd(), "the row must not end on a separator").not.toMatch(/,$/);
    });

    it("still prints a distance for an abandoned race that WAS recorded", async () => {
        // The other side of the branch, so this file cannot be satisfied by an endpoint that
        // simply stopped printing distances for every DNF. The calendar's real abandoned race
        // carries recordings and its covered distance is honest — it is how far he got.
        const {EVENTS, PATCHES, raceKm, recordingsOf} = await import("../src/lib/constants");
        const recordedDnf = EVENTS.find((e) => patchState(e) === "dnf" && recordingsOf(e).length > 0);
        expect(recordedDnf, "the calendar must still hold a recorded abandoned race").toBeDefined();
        // BY NAME AND DATE. The calendar holds the same race name in more than one year —
        // he rode Pesta Sukan again the season after abandoning it — so a name-only match
        // silently reads the FINISHED row and asserts the wrong race's figure.
        const row = (await render()).split("\n")
            .find((l) => l.includes(recordedDnf!.name) && l.includes(recordedDnf!.date))!;
        expect(row, `${recordedDnf!.name} (${recordedDnf!.date}) must have a row of its own`).toBeDefined();
        expect(row).toContain(`${PATCHES.covered_label.toLowerCase()} ${raceKm(recordedDnf!).toFixed(2)} km`);
    });
});
