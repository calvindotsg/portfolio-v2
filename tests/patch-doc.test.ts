import {describe, expect, it, vi} from "vitest";

import type {RaceEvent} from "../src/lib/race";

/**
 * THE WALL'S MARKDOWN TWIN, HELD TO THE WALL.
 *
 * A rendered document is the single best hiding place a defect has, because it always looks
 * like a document: lose a race, duplicate one, print a distance against the wrong source, and
 * the output is still well-formed markdown that reads plausibly. Nothing about the shape of
 * the file can tell you, and a snapshot cannot either — a snapshot only ever compares a
 * document with itself, which is the argument `tests/design-system.test.ts` makes at length
 * about the design spec. So every assertion here is a comparison against the SOURCE the
 * document claims to render rather than against a literal.
 *
 * THE FOUR PROPERTIES THAT MATTER, in the order they would go wrong:
 *
 *   1. COMPLETENESS. Every race `patchWall(sport)` returns appears, exactly once, by name.
 *   2. PARTITION. The three documents divide the wall — each race in the all-sports document
 *      is in exactly one sport document, and the reverse.
 *   3. NOTHING DIVISIBLE CROSSES TWO SOURCES. A race can be known twice, and the rule the bib's
 *      ledger rests on is that each account keeps its own distance beside its own clock. A
 *      document that prints the organiser's distance against the watch's time is the one defect
 *      here that is invisible to every structural check, because both figures are real.
 *   4. NO FALLBACK DISTANCE ON AN ABANDONED RACE. `raceKm` falls back to the ADVERTISED
 *      distance where no metres exist, which would publish the whole of a route he did not
 *      finish, in the document written for machines that cannot see the bib refusing it.
 *
 * THE CALENDAR IS MOCKED, AND IT IS THE WHOLE FILE RATHER THAN ONE TEST. Property 4 has no
 * subject on the real calendar — the one abandoned race carries two recordings — so every
 * assertion about that branch would take its else-arm on every run, which is the hole
 * `tests/llms-dnf-fixture.test.ts` was written to close on the endpoint side. This is the same
 * fix for the same defect, and the fixture is BOOKED-SHAPED on purpose: an advertised distance
 * and no recordings is the shape that carries the lie, it is legal because `outcome` sits on
 * the union's booked arm, and it is the shape the calendar WILL hold the day a race is
 * abandoned before the watch records anything.
 *
 * MOCKING THE WHOLE FILE IS SAFE HERE AND IS NOT SAFE EVERYWHERE. `vi.mock` is file-scoped,
 * and the reason `llms-dnf-fixture` had to be a file of its own is that its siblings compare
 * recomputed values against pages in `dist/`, which were built from the REAL calendar — a
 * mocked one reddens those on correct code. Nothing in THIS file reads `dist/`: every
 * assertion compares the document against `patchWall()`, and both sides read the same mocked
 * `EVENTS`, so the fixture is consistent rather than contradictory. The calibration in the
 * fixture's own describe is what says the mock is actually doing something.
 *
 * IT MOCKS THE MODULE THE LIBRARY IMPORTS FROM, which is the collector over `src/data/races/`
 * and not `src/content/races.ts`. Mocking the wrong one leaves every assertion below running
 * against the real calendar and passing by never being about anything.
 */

const ABANDONED_KM = 1022.00;

const DNF_NOTHING_RECORDED = {
    date: "2020-03-01",
    name: "Fixture Tour That Was Abandoned",
    advertised_km: ABANDONED_KM,
    sport: "cycling",
    country: "Nowhere",
    outcome: "dnf",
} as unknown as RaceEvent;

vi.mock("../src/data/races", async (importOriginal) => {
    const real = await importOriginal<typeof import("../src/data/races")>();
    return {...real, EVENTS: [...real.EVENTS, DNF_NOTHING_RECORDED]};
});

const {NEXT_RACE, PATCHES} = await import("../src/content/races");
const {GOALS, goalForSport} = await import("../src/lib/goal");
const {renderPatchWall} = await import("../src/lib/patch-doc");
const {patchState, patchWall} = await import("../src/lib/projection");
const {raceKm, recordingsOf} = await import("../src/lib/race");

const documents = () => ({
    all: renderPatchWall(),
    ...Object.fromEntries(GOALS.map((g) => [g.sport, renderPatchWall(g.sport)])),
});

/** Every `## ` heading, which is one per race. */
const headingsOf = (doc: string) => (doc.match(/^## (.+)$/gm) ?? []).map((h) => h.slice(3).trim());

describe("the patch wall as markdown", () => {
    it("renders every race the wall returns, exactly once, by name", () => {
        for (const sport of [undefined, ...GOALS.map((g) => g.sport)] as const) {
            const wall = patchWall(sport);
            const label = sport ?? "all sports";
            expect(wall.length, `the ${label} wall is empty — every assertion here would be vacuous`)
                .toBeGreaterThan(0);
            const headings = headingsOf(renderPatchWall(sport));
            // Counted rather than set-compared: the calendar holds two races with the SAME NAME
            // in different years (OCBC Cycle Johor Bahru, 2025 and 2026), so a set would call a
            // document that dropped one of them complete.
            expect(headings.length, `the ${label} document renders ${headings.length} races against `
                + `${wall.length} on the wall — a rendered document hides a lost race better than `
                + "anything else on this site").toBe(wall.length);
            for (const {event} of wall) {
                expect(headings, `the ${label} document does not name ${event.name}`)
                    .toContain(event.name);
            }
        }
    });

    it("divides the wall between the sport documents, losing and duplicating nothing", () => {
        const all = headingsOf(renderPatchWall()).sort();
        const perSport = GOALS.flatMap((g) => headingsOf(renderPatchWall(g.sport)));
        expect(GOALS.length, "one goal — a partition of one set is not a partition")
            .toBeGreaterThan(1);
        expect(perSport.length, "the sport documents do not add up to the whole wall")
            .toBe(all.length);
        expect([...perSport].sort(), "the sport documents and the whole wall name different races")
            .toEqual(all);
    });

    it("heads each document with the heading of the page it twins", () => {
        // Compared against the same expression `[...sport].astro` builds its own heading from,
        // never against a literal. A parallel template is how a twin and its page come to be
        // headed differently — the break that file already fixed once between its control and
        // its title.
        expect(renderPatchWall().split("\n")[0]).toBe(`# ${PATCHES.heading}`);
        for (const goal of GOALS) {
            expect(renderPatchWall(goal.sport).split("\n")[0])
                .toBe(`# ${NEXT_RACE.control.replace("{sport}", goal.goal_name.toLowerCase())}`);
        }
    });

    it("prints two decimals on every distance, so one race is not described two ways", () => {
        // `raceKm` returns a NUMBER, and a number has no trailing zero to keep: 130.03 prints
        // itself while 158.10 reaches a reader as 158.1 against the bib's own 158.10.
        const doc = renderPatchWall();
        const unitless = [...GOALS.map((g) => g.measurable_unit)];
        expect(unitless.length, "no units to look for").toBeGreaterThan(0);
        const figures = [...doc.matchAll(new RegExp(`(\\d+(?:\\.\\d+)?) (?:${unitless.join("|")})\\b`, "g"))];
        expect(figures.length, "the document prints no distances at all — this gate is vacuous")
            .toBeGreaterThan(5);
        for (const [, figure] of figures) {
            expect(figure, `${figure} is printed with the wrong precision`).toMatch(/^\d+\.\d{2}$/);
        }
    });

    it("names no path in this repository, because its reader is fetching a URL", () => {
        for (const doc of Object.values(documents())) {
            expect(doc, "the document names a source path, which its reader has no copy of")
                .not.toMatch(/\bsrc\//);
            expect(doc, "the document names a test path").not.toMatch(/\btests\//);
            expect(doc, "the document names a TypeScript module").not.toMatch(/\.ts\b/);
        }
    });

    it("says which of the three states each race is in, in the site's own words", () => {
        const doc = renderPatchWall();
        const wall = patchWall();
        // Every state the wall actually holds must be named. Written as a loop over what is
        // THERE rather than over the three literals, because a wall with nothing abandoned is
        // an ordinary state of this site and not a reason to redden.
        const states = new Set(wall.map((p) => p.state));
        expect(states.size, "the wall holds one state — the discrimination below is weak")
            .toBeGreaterThan(1);
        const word = {booked: PATCHES.booked_label, dnf: PATCHES.dnf_name, finished: PATCHES.finished_name};
        for (const state of states) {
            expect(doc, `no race is marked ${state}, though the wall holds one`).toContain(word[state]);
        }
    });
});

/**
 * THE LEDGER'S ONE RULE, ASSERTED AS A PROPERTY OF EACH LINE.
 *
 * "Nothing a reader can divide crosses two sources" is strictly stronger than any label check,
 * and it is what the bib spends two container queries protecting. In markdown the row is a
 * line, so the property is: a line carrying the organiser's distance carries the organiser's
 * clock and NEITHER of the rider's figures, and the reverse.
 */
describe("no figure a reader can divide crosses two sources", () => {
    const doubled = () => patchWall()
        .map((p) => p.event)
        .filter((e) => e.official !== undefined && recordingsOf(e).length > 0);

    it("finds a race known twice at all, or the assertion below is about nothing", () => {
        expect(doubled().length, "no race on the wall carries both an official result and a "
            + "recording, so the two-account assertion has no subject").toBeGreaterThan(0);
    });

    it("keeps each account's distance on its own line, with its own clock", () => {
        const doc = renderPatchWall();
        const lines = doc.split("\n");
        for (const event of doubled()) {
            const unit = goalForSport(event.sport).measurable_unit;
            const officialKm = `${event.advertised_km!.toFixed(2)} ${unit}`;
            const recordedKm = `${raceKm(event).toFixed(2)} ${unit}`;
            const officialTime = event.official!.net_time ?? event.official!.gun_time;

            const officialLine = lines.find((l) => l.includes(PATCHES.official_row) && l.includes(officialKm));
            expect(officialLine, `${event.name} has no official line carrying ${officialKm}`).toBeDefined();
            const recordedLine = lines.find((l) => l.includes(PATCHES.recorded_row) && l.includes(recordedKm));
            expect(recordedLine, `${event.name} has no recorded line carrying ${recordedKm}`).toBeDefined();

            // The calibration: if the two accounts happen to agree, this race cannot tell a
            // correct document from a crossed one, and the assertions below would pass on both.
            expect(officialKm, `${event.name}'s two accounts agree, so it discriminates nothing`)
                .not.toBe(recordedKm);

            if (officialTime !== undefined) {
                expect(officialLine, `${event.name}: the official line does not carry the official clock`)
                    .toContain(officialTime);
                expect(recordedLine, `${event.name}: the RIDER'S line carries the ORGANISER'S clock — `
                    + "a reader dividing that row gets a speed neither source would recognise")
                    .not.toContain(officialTime);
            }
            if (event.elapsed_time !== undefined) {
                expect(recordedLine, `${event.name}: the recorded line does not carry the watch`)
                    .toContain(event.elapsed_time);
                expect(officialLine, `${event.name}: the ORGANISER'S line carries the WATCH'S clock`)
                    .not.toContain(event.elapsed_time);
            }
            expect(officialLine, `${event.name}: the organiser's line carries the rider's distance`)
                .not.toContain(recordedKm);
            expect(recordedLine, `${event.name}: the rider's line carries the organiser's distance`)
                .not.toContain(officialKm);
        }
    });
});

/**
 * A RACE ABANDONED WITH NOTHING RECORDED PRINTS NO DISTANCE AT ALL.
 *
 * `raceKm` falls back to the ADVERTISED distance where no metres exist. That is the right
 * answer for a booked bib, whose hero is the route it intends to ride, and the worst possible
 * one here: the document would state that he covered the whole of a course he abandoned — the
 * exact claim the bib beside it is drawn to refuse, in the file written for machines that
 * cannot see the bib.
 */
describe("on a race abandoned with nothing recorded", () => {
    it("puts the fixture in the state this describe is about, or nothing below discriminates", () => {
        // The calibration. If the fixture stopped reaching the branch — a changed `patchState`,
        // a changed union — every assertion below would pass by never being about anything,
        // which is the failure mode this fixture exists against.
        expect(patchState(DNF_NOTHING_RECORDED), "the fixture must be an abandoned race").toBe("dnf");
        expect(recordingsOf(DNF_NOTHING_RECORDED), "the fixture must carry no recordings").toHaveLength(0);
        // And it must reach the renderer, or the mock is doing nothing.
        expect(headingsOf(renderPatchWall()), "the mocked calendar does not reach the document")
            .toContain(DNF_NOTHING_RECORDED.name);
        // The fallback really is what it would print, so the assertion below has a subject.
        expect(raceKm(DNF_NOTHING_RECORDED), "raceKm no longer falls back, so this gate is moot")
            .toBe(ABANDONED_KM);
    });

    it("prints the state word and no distance", () => {
        const doc = renderPatchWall();
        const start = doc.indexOf(`## ${DNF_NOTHING_RECORDED.name}`);
        expect(start, "the fixture is not in the document").toBeGreaterThan(-1);
        const next = doc.indexOf("\n## ", start + 1);
        const section = doc.slice(start, next === -1 ? undefined : next);

        expect(section, "an abandoned race must still say that it was abandoned")
            .toContain(PATCHES.dnf_name);
        expect(section, `the document prints ${ABANDONED_KM.toFixed(2)} against a race that was `
            + "abandoned — the advertised distance published as though it had been covered")
            .not.toContain(ABANDONED_KM.toFixed(2));
        // Nothing at all that looks like a distance, so a future change of units cannot slip a
        // fallback back in under a different spelling.
        expect(section, "the abandoned race's section prints a distance from somewhere")
            .not.toMatch(new RegExp(`\\d+\\.\\d{2} (?:${GOALS.map((g) => g.measurable_unit).join("|")})\\b`));
    });
});
