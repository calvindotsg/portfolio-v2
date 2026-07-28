import {readFileSync} from "node:fs";
import {experimental_AstroContainer as AstroContainer} from "astro/container";
import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import Patch from "../src/components/Patch.astro";
import {EVENTS, GOAL_YEAR, GOALS, NEW_TAB_NOTICE, PATCHES, type RaceEvent, stravaActivityUrl} from "../src/lib/constants";
import {
    bookedAhead, formatPatchDate, patchDateSegments, patchState, type PatchState, patchWall, UPDATED_AT,
} from "../src/lib/projection";
import {iconClass} from "../src/lib/icons";
import {decl, isKeyframeStep, pageCss, parseRules, type Rule, structuralSelector} from "./helpers/css";

/**
 * The patch wall: `/patches`, `/patches/cycling`, `/patches/running`.
 *
 * Split deliberately between the pure derivation (which the goal cards also depend
 * on) and the three built pages. Nothing here reads a kilometre figure, so the
 * nightly Strava commit cannot turn the deploy red — but note that everything here
 * DOES read `updated_at`, which the bot moves. Every assertion below is written
 * against the stamp rather than against a hard-coded date for that reason; the two
 * that need a specific day pass their own `iso` instead of taking the default.
 */

const read = (p: string) => readFileSync(p, "utf8");
const PAGES = {
    all: "dist/patches/index.html",
    cycling: "dist/patches/cycling/index.html",
    running: "dist/patches/running/index.html",
} as const;

const ev = (over: Partial<RaceEvent> = {}): RaceEvent =>
    ({date: "2026-06-01", name: "Fixture", km: 10, sport: "cycling", country: "Nowhere", ...over});

describe("a bib's state is derived from the calendar, never stored", () => {
    it("is finished only once the whole event is behind the stamp", () => {
        const race = ev({date: "2026-06-10"});
        expect(patchState(race, "2026-06-09"), "the day before").toBe("booked");
        expect(patchState(race, "2026-06-10"), "the day itself — you have not finished it at 05:13").toBe("booked");
        expect(patchState(race, "2026-06-11"), "the day after").toBe("finished");
    });

    /**
     * The choice, not a fallout: you earn a bib at the finish line. A tour whose
     * kilometres are half-ridden is still a tour you have not completed, and the
     * outline treatment says exactly that.
     */
    it("keeps a multi-day event booked for every day it is still running", () => {
        const tour = ev({date: "2026-11-07", end_date: "2026-11-15"});
        for (const iso of ["2026-11-06", "2026-11-07", "2026-11-11", "2026-11-15"]) {
            expect(patchState(tour, iso), `${iso} is inside or before the tour`).toBe("booked");
        }
        expect(patchState(tour, "2026-11-16")).toBe("finished");
    });

    it("calls an unparseable date booked, never finished", () => {
        // The two failures are not symmetric: a race rendered as still-to-come is
        // wrong, and a race rendered as run is a claim about a result.
        expect(patchState(ev({date: "not-a-date"}), "2026-06-10")).toBe("booked");
        expect(patchState(ev({date: "2026-02-30"}), "2026-06-10")).toBe("booked");
        expect(patchState(ev({date: "2026-01-01"}), "garbage")).toBe("booked");
    });

    /**
     * THE CROSS-CONSUMER INVARIANT, and the reason `patchState` reuses
     * `bookedAhead`'s comparison rather than inventing its own.
     *
     * Both answer "has this race happened yet", for the wall and for the goal cards.
     * They are rendered on two pages a click apart, from one stamp. A wall calling
     * the Formosa tour finished while the cycling card is still counting its 1,022 km
     * as booked is the site contradicting itself, and neither figure is obviously the
     * wrong one to a reader.
     *
     * Swept across the whole year rather than at the current stamp: today's date
     * exercises one point on a curve, and the disagreement these two could develop
     * lives at the boundaries — the start day, the days inside a span, the end day.
     */
    it("agrees with the projection about which races are still ahead, on every day of the year", () => {
        // DERIVED FROM GOAL_YEAR, not hard-coded. With 2026 baked in, the sweep goes
        // vacuous the moment EVENTS moves to next year's races: every day of 2026 is
        // after every 2027 race, so both sides agree trivially and the test stops
        // testing. (The literal was also 366 for a 365-day year, so the last iteration
        // was silently 1 January of the following year.)
        const days: string[] = [];
        for (let d = new Date(Date.UTC(GOAL_YEAR, 0, 1)); d.getUTCFullYear() === GOAL_YEAR;
             d = new Date(d.getTime() + 86_400_000)) {
            days.push(d.toISOString().slice(0, 10));
        }
        expect(days.length, "the sweep must cover a whole year").toBeGreaterThanOrEqual(365);

        const disagreements: string[] = [];
        for (const event of EVENTS) {
            for (const iso of days) {
                const contributes = bookedAhead(event.sport, iso, [event]) > 0;
                const finished = patchState(event, iso) === "finished";
                if (finished === contributes) {
                    disagreements.push(
                        `${iso}: the wall calls "${event.name}" ${finished ? "finished" : "booked"} `
                        + `while the projection books ${bookedAhead(event.sport, iso, [event]).toFixed(2)} km of it`,
                    );
                }
            }
        }
        expect(disagreements.slice(0, 5), "the wall and the goal cards must agree about the same day").toEqual([]);
    });
});

describe("the wall's order", () => {
    /**
     * The wall is sorted NEXT RACE FIRST, so its order is a function of the day as
     * well as of the fixture. Every assertion in this block therefore passes its own
     * `iso` and its own events: an expected order taken from today's calendar at the
     * default stamp would be a hand-counted property of the date, and the bot moves
     * the stamp nightly.
     *
     * `SPREAD` straddles a pinned midpoint — three races behind it, three ahead, in
     * shuffled fixture order so nothing here can pass on fixture position.
     */
    const MID = "2026-06-15";
    const SPREAD: readonly RaceEvent[] = [
        ev({name: "ahead-far", date: "2026-09-01"}),
        ev({name: "done-old", date: "2026-01-05"}),
        ev({name: "ahead-next", date: "2026-06-20"}),
        ev({name: "done-recent", date: "2026-06-14"}),
        ev({name: "ahead-mid", date: "2026-07-04"}),
        ev({name: "done-mid", date: "2026-03-10"}),
    ];

    it("opens with the next race and closes with the oldest finish", () => {
        expect(patchWall(undefined, MID, SPREAD).map((p) => p.event.name)).toEqual([
            "ahead-next", "ahead-mid", "ahead-far",
            "done-recent", "done-mid", "done-old",
        ]);
    });

    it("puts a race still running today at the very front, not among the finishes", () => {
        // A tour is booked for every day it runs, so mid-event it is the next race.
        const tour = ev({name: "tour", date: "2026-06-10", end_date: "2026-06-20"});
        expect(patchWall(undefined, MID, [...SPREAD, tour]).map((p) => p.event.name)[0]).toBe("tour");
    });

    /**
     * The invariant the page actually relies on, asserted across a whole year so it
     * cannot depend on which side of today the fixture happens to sit. This is the
     * one assertion here that runs against live {@link EVENTS} — the fixture is
     * human-edited, and the shape below stays true however the calendar moves,
     * including on the day the booked run empties.
     */
    it("keeps both runs pointing away from today, on every day of the year", () => {
        const wrong: string[] = [];
        for (let day = 0; day < 366; day++) {
            const iso = new Date(Date.UTC(GOAL_YEAR, 0, 1 + day)).toISOString().slice(0, 10);
            const wall = patchWall(undefined, iso);
            const states = wall.map((p) => p.state);
            if (states.lastIndexOf("booked") > states.indexOf("finished") && states.includes("finished")) {
                wrong.push(`${iso}: a booked bib is printed after a finished one`);
            }
            const booked = wall.filter((p) => p.state === "booked").map((p) => p.event.date);
            const finished = wall.filter((p) => p.state === "finished").map((p) => p.event.date);
            if (booked.join() !== [...booked].sort().join()) wrong.push(`${iso}: booked run is not ascending`);
            if (finished.join() !== [...finished].sort().reverse().join()) {
                wrong.push(`${iso}: finished run is not descending`);
            }
        }
        expect(wrong.slice(0, 5)).toEqual([]);
    });

    /**
     * Total, so the order cannot depend on how EVENTS happens to be typed. Sorting in
     * the fixture is the defect this replaced — the design previews for this feature
     * captioned themselves in an order the array happened to supply — and a tie left
     * to sort stability is the same defect, narrower.
     *
     * Asserted in BOTH groups and in both fixture orders, because the dates run in
     * opposite directions there while this tiebreak deliberately does not.
     */
    it("breaks a same-day tie by name, ascending in both groups", () => {
        const sameDay = [
            ev({name: "Zulu ahead", date: "2026-08-08"}), ev({name: "Alpha ahead", date: "2026-08-08"}),
            ev({name: "Zulu done", date: "2026-05-05"}), ev({name: "Alpha done", date: "2026-05-05"}),
        ];
        const expected = ["Alpha ahead", "Zulu ahead", "Alpha done", "Zulu done"];
        expect(patchWall(undefined, MID, sameDay).map((p) => p.event.name)).toEqual(expected);
        expect(patchWall(undefined, MID, [...sameDay].reverse()).map((p) => p.event.name)).toEqual(expected);
    });

    it("partitions the whole wall between the sports, losing and duplicating nothing", () => {
        const all = patchWall().map((p) => p.event.name).sort();
        const split = GOALS.flatMap((g) => patchWall(g.sport)).map((p) => p.event.name).sort();
        expect(split).toEqual(all);
        expect(all.length).toBe(EVENTS.length);
    });

    it("leaves EVENTS untouched, since it is a shared readonly fixture", () => {
        const before = EVENTS.map((e) => e.date).join();
        patchWall();
        patchWall("cycling");
        expect(EVENTS.map((e) => e.date).join()).toBe(before);
    });
});

describe("a bib's date line", () => {
    it("prints a single day, and collapses a span to what differs", () => {
        expect(formatPatchDate(ev({date: "2026-07-12"}))).toBe("12 JUL 2026");
        expect(formatPatchDate(ev({date: "2026-11-07", end_date: "2026-11-15"}))).toBe("7–15 NOV 2026");
        expect(formatPatchDate(ev({date: "2026-11-30", end_date: "2026-12-02"}))).toBe("30 NOV – 2 DEC 2026");
        expect(formatPatchDate(ev({date: "2026-12-30", end_date: "2027-01-02"}))).toBe("30 DEC 2026 – 2 JAN 2027");
    });

    it("collapses a span whose end equals its start, so end_date cannot print a fake range", () => {
        expect(formatPatchDate(ev({date: "2026-07-12", end_date: "2026-07-12"}))).toBe("12 JUL 2026");
    });

    it("renders nothing rather than a guess when a date does not parse", () => {
        expect(formatPatchDate(ev({date: "2026-13-01"}))).toBeNull();
        expect(formatPatchDate(ev({date: "2026-07-12", end_date: "2026-07-01"})), "end before start").toBeNull();
    });

    it("formats every configured race, so no bib ships a blank date", () => {
        for (const event of EVENTS) {
            expect(formatPatchDate(event), `${event.name} has no printable date`).toBeTruthy();
        }
    });

    /**
     * `<time datetime>` names ONE instant and HTML has no interval form, so a tour
     * wrapped in a single `<time>` would tell a machine that nine days of riding
     * happened on the start date. The segments are how each endpoint gets to claim
     * only itself; the dash claims nothing.
     */
    it("gives each endpoint of a span its own date, and the dash none", () => {
        expect(patchDateSegments(ev({date: "2026-07-12"})))
            .toEqual([{text: "12 JUL 2026", iso: "2026-07-12"}]);
        expect(patchDateSegments(ev({date: "2026-11-07", end_date: "2026-11-15"})))
            .toEqual([{text: "7", iso: "2026-11-07"}, {text: "–"}, {text: "15 NOV 2026", iso: "2026-11-15"}]);
        expect(patchDateSegments(ev({date: "2026-11-30", end_date: "2026-12-02"})))
            .toEqual([{text: "30 NOV", iso: "2026-11-30"}, {text: " – "}, {text: "2 DEC 2026", iso: "2026-12-02"}]);
        expect(patchDateSegments(ev({date: "2026-12-30", end_date: "2027-01-02"})))
            .toEqual([{text: "30 DEC 2026", iso: "2026-12-30"}, {text: " – "}, {text: "2 JAN 2027", iso: "2027-01-02"}]);
        expect(patchDateSegments(ev({date: "2026-13-01"}))).toBeNull();
    });

    /**
     * The drift this pair of representations invites, closed structurally: whatever a
     * reader sees is the segments joined, so the range on screen cannot come to
     * disagree with the dates a machine reads. Checked over every shape the calendar
     * offers AND over the live fixture, since a new event could introduce a fourth.
     */
    it("keeps the printed line and the segments the same string, in every shape", () => {
        const shapes = [
            ev({date: "2026-07-12"}),
            ev({date: "2026-07-12", end_date: "2026-07-12"}),
            ev({date: "2026-11-07", end_date: "2026-11-15"}),
            ev({date: "2026-11-30", end_date: "2026-12-02"}),
            ev({date: "2026-12-30", end_date: "2027-01-02"}),
            ev({date: "not-a-date"}),
            ...EVENTS,
        ];
        for (const event of shapes) {
            const joined = patchDateSegments(event)?.map((s) => s.text).join("") ?? null;
            expect(joined, `${event.date}..${event.end_date ?? event.date}`).toBe(formatPatchDate(event));
        }
    });

    /**
     * Asserted on the component rather than on the built page: whether a multi-day
     * event is on the wall is a property of the fixture, and the markup rule is not.
     */
    it("renders one <time> per endpoint, never one around the whole range", async () => {
        const container = await AstroContainer.create();
        const render = async (event: RaceEvent) =>
            parseHTML(await container.renderToString(Patch, {props: {event, state: "booked"}})).document;

        const tour = await render(ev({date: "2026-11-07", end_date: "2026-11-15", km: 1022}));
        const times = [...tour.querySelectorAll("time")];
        expect(times.map((t) => t.getAttribute("datetime"))).toEqual(["2026-11-07", "2026-11-15"]);
        for (const t of times) {
            expect(t.textContent, "a <time> must not contain the whole range").not.toContain("–");
        }
        expect(tour.querySelector(".bib-date")?.textContent?.replace(/\s+/g, " ").trim()).toBe("7–15 NOV 2026");

        const day = await render(ev({date: "2026-08-02"}));
        expect([...day.querySelectorAll("time")].map((t) => t.getAttribute("datetime"))).toEqual(["2026-08-02"]);
    });
});

describe("dist/patches", () => {
    it("prerenders all three routes", () => {
        for (const page of Object.values(PAGES)) {
            expect(read(page).length, `${page} must be built`).toBeGreaterThan(0);
        }
    });

    /**
     * Three pages one back-button press apart. A shared title makes the browser's tab
     * strip and its history list unusable, and it is the kind of thing that is
     * obviously right at authoring time and silently regresses when a heading is
     * refactored into a shared constant.
     */
    it("gives each route its own title and canonical URL", () => {
        const titles = new Set<string>();
        const canonicals = new Set<string>();
        for (const [key, page] of Object.entries(PAGES)) {
            const doc = parseHTML(read(page)).document;
            const title = doc.querySelector("title")?.textContent ?? "";
            expect(title, `${key} must carry a title`).not.toBe("");
            titles.add(title);
            canonicals.add(doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "");
        }
        expect(titles.size, `the three routes share a title: ${[...titles].join(" / ")}`).toBe(3);
        expect(canonicals.size, "each route must self-canonicalise").toBe(3);
    });

    /**
     * The rendered state is compared against `patchState` recomputed here rather than
     * against a list of races written into this file. A hard-coded expectation would
     * be correct today and would become a bot-triggered failed deploy the morning
     * after any of these six races is run — the suite is the Netlify build command.
     */
    it("renders one bib per race, in the wall's order, in the state the calendar says", () => {
        for (const [key, page] of Object.entries(PAGES)) {
            const sport = key === "all" ? undefined : GOALS.find((g) => g.goal_name.toLowerCase() === key)!.sport;
            const expected = patchWall(sport);
            const bibs = [...parseHTML(read(page)).document.querySelectorAll(".bib")];
            expect(bibs.length, `${page} must render ${expected.length} bibs`).toBe(expected.length);
            bibs.forEach((bib, i) => {
                const {event, state} = expected[i];
                expect(bib.querySelector(".bib-name")?.textContent, `${page} bib ${i} is out of order`).toBe(event.name);
                expect(bib.querySelector("time")?.getAttribute("datetime")).toBe(event.date);
                expect(
                    bib.classList.contains("bib--booked"),
                    `${page}: "${event.name}" renders as ${bib.classList.contains("bib--booked") ? "booked" : "finished"} but the calendar says ${state} at the ${UPDATED_AT} stamp`,
                ).toBe(state === "booked");
            });
        }
    });

    /**
     * SC 1.4.1: the outline treatment carries "not yet earned" in colour and shape,
     * and colour and shape alone are not an acceptable sole carrier. The word is the
     * other channel. A finished bib is the unmarked case and must NOT carry it —
     * otherwise the tag stops meaning anything.
     *
     * THIS ASSERTED THE COUNTS FIRST, AND THAT WAS A BOT-TRIGGERED FAILED DEPLOY.
     * It opened with `expect(booked.length).toBeGreaterThan(0)` as a non-vacuity
     * floor — a hand-counted property of *today's calendar* dressed as an invariant.
     * On 7 December 2026, the morning after the last race on the list, every bib is
     * finished and that floor goes red. `netlify.toml` runs the suite as the build
     * command and the Strava bot pushes unattended at 05:13 SGT, so the first symptom
     * would have been a failed production deploy with nobody watching. Simulated: the
     * suite is green on five future bot pushes and red on 2026-12-07 and 2026-12-31.
     *
     * The replacement is an EQUIVALENCE against the same derivation the page used, so
     * it cannot be vacuous and cannot depend on the date: every bib carries the tag if
     * and only if the calendar calls it booked. The non-vacuity that remains is a
     * property of the fixture, not of the day — there are always events to render.
     *
     * Proving the tag logic can DISTINGUISH the two states is a separate job, and it
     * belongs to the component rather than to whatever today happens to look like. See
     * the container-rendered test below.
     */
    it("says 'booked' in words on exactly the bibs the calendar calls booked", () => {
        const state = new Map(patchWall().map((p) => [p.event.name, p.state]));
        const bibs = [...parseHTML(read(PAGES.all)).document.querySelectorAll(".bib")];
        expect(bibs.length, "the wall must render every event").toBe(EVENTS.length);
        for (const bib of bibs) {
            const name = bib.querySelector(".bib-name")?.textContent ?? "";
            const tag = bib.querySelector(".bib-tag")?.textContent?.trim() ?? null;
            expect(
                tag,
                `"${name}" is ${state.get(name)} at the ${UPDATED_AT} stamp, so its tag must be `
                + `${state.get(name) === "booked" ? `"${PATCHES.booked_label}"` : "absent"}`,
            ).toBe(state.get(name) === "booked" ? PATCHES.booked_label : null);
        }
    });

    /**
     * THAT THE TAG DISTINGUISHES THE TWO STATES AT ALL, asked of the component instead
     * of the calendar.
     *
     * Rendering `Patch` directly in both states is the only form of this assertion that
     * is date-independent. Reading it off the built page means the coverage silently
     * depends on the wall happening to hold one of each today — which is exactly the
     * coupling that turned the deploy red above, and it will be false again for the
     * whole of any January before the year's first race.
     */
    it("renders the tag for a booked bib and omits it for a finished one, whatever the date", async () => {
        const container = await AstroContainer.create();
        const event = EVENTS[0];
        const rendered = async (state: PatchState) =>
            parseHTML(await container.renderToString(Patch, {props: {event, state}})).document;

        // Selected by CLASS, not by element name. The bib is no longer the list item: a
        // race with a verified Strava activity renders its bib as an anchor inside the
        // cell, so `querySelector("li")` now finds the wrapper and reads none of the
        // treatment classes. Everything else in this file was already class-based, which
        // is what kept the change to one component and one assertion.
        const booked = await rendered("booked");
        expect(booked.querySelector(".bib-tag")?.textContent?.trim()).toBe(PATCHES.booked_label);
        expect(booked.querySelector(".bib")?.classList.contains("bib--booked")).toBe(true);

        const finished = await rendered("finished");
        expect(finished.querySelector(".bib-tag"), "a finished bib is the unmarked case").toBeNull();
        expect(finished.querySelector(".bib")?.classList.contains("bib--booked")).toBe(false);
    });

    /**
     * A FINISHED BIB'S WHOLE BOX IS THE LINK, and this is asserted from the built page
     * because the shape only exists there: the bib renders as an anchor inside its list
     * item, and the previous structure was one element.
     *
     * CONDITIONAL ON THE ID, NOT ON THE STATE. Round the Island finishes on 3 August with
     * no activity recorded and must render as an ordinary finished bib, so the two halves
     * below are both real cases rather than a happy path and a guard. Driven from EVENTS,
     * so a race added with or without an id joins whichever half it belongs to.
     */
    it("makes the whole bib a link exactly where the race has a verified activity", () => {
        const bibs = [...parseHTML(read(PAGES.all)).document.querySelectorAll(".bib")];
        expect(bibs.length, "no bibs — this assertion would be vacuous").toBe(EVENTS.length);

        // NO NON-VACUITY FLOOR ON THE FILTERED SUBSET, and this is the repo's own hardest-won
        // test lesson applied to code I wrote a few hours after re-reading it. A
        // `toBeGreaterThan(0)` over a subset of EVENTS is a hand-counted property of TODAY'S
        // calendar dressed as an invariant: the subset was empty three weeks ago and is empty
        // again every January after step 3 of the rollover checklist. The paired
        // `toBeLessThan(EVENTS.length)` is worse — it asserts that some race must FOREVER lack
        // a Strava id, which is not a property of this site at all, and it goes red the day the
        // owner records the last one. A skeptic proved that: at a 31 December 2026 stamp this
        // file was red for that reason alone while origin/main was green.
        //
        // netlify.toml runs the suite as the BUILD command, so either failure is a failed
        // production deploy triggered by ordinary data entry.
        //
        // The loops below need no floor. Each iterates EVENTS — not the subset — and asserts
        // the equivalence in BOTH directions per event, so they are vacuous only if EVENTS is
        // empty, which is what the one guard that IS safe checks.
        expect(EVENTS.length, "EVENTS is empty, so every loop below is vacuous").toBeGreaterThan(0);

        for (const event of EVENTS) {
            const bib = bibs.find((b) => b.querySelector(".bib-name")?.textContent === event.name)!;
            expect(bib, `${event.name} must render a bib`).toBeTruthy();
            const url = stravaActivityUrl(event);

            if (url === null) {
                expect(bib.tagName.toLowerCase(), `${event.name} has no activity id, so its bib must not be a link`)
                    .not.toBe("a");
                expect(bib.querySelector(".bib-strava"), `${event.name} must wear no Strava mark`).toBeNull();
                continue;
            }

            expect(bib.tagName.toLowerCase(), `${event.name} has an activity id, so the whole bib is the link`).toBe("a");
            // THE BASE URL IS WRITTEN OUT HERE, and the duplication is the point. Comparing the
            // built href against `stravaActivityUrl(event)` alone compares the page to the very
            // function that produced it: mistype the constant and every bib ships a 404 with the
            // suite green and `pnpm check` silent — verified by mutating the base and watching
            // 256/256 pass. The literal is the only thing in the build that can disagree with it.
            expect(url, `${event.name} must point at strava.com/activities/<id>`)
                .toBe(`https://www.strava.com/activities/${event.strava_activity_id}`);
            expect(bib.getAttribute("href")).toBe(url);
            expect(bib.getAttribute("target"), "matching Now.astro and IntroCard.astro").toBe("_blank");
            expect(bib.getAttribute("rel"), "this site uses a bare target and lets the browser imply noopener; "
                + "introducing rel on one link out of three makes the convention look accidental").toBeNull();
            expect(bib.getAttribute("aria-label"), "an aria-label would REPLACE the bib's text with a summary")
                .toBeNull();

            // The accessible name is name-from-content, so it must be a superset of what
            // is on screen — including the transcription of the aria-hidden glyph.
            const name = (bib.textContent ?? "").replace(/\s+/g, " ").trim();
            for (const part of [event.name, event.country, String(event.km).split(".")[0], PATCHES.strava_name]) {
                expect(name, `the announced name must carry "${part}"`).toContain(part);
            }
        }
    });

    /**
     * A BIB DOES NOT CLIP, so a row that cannot break paints its ink onto the CARD.
     *
     * This is the failure the wall's own geometry sweep is structurally blind to: that
     * instrument walks elements inside a clipping ancestor, and `.bib` sets only
     * `container-type`, which does not clip. So the escaped ink is invisible to it — and it is
     * invisible to a reader too, because outside the bib the ink is `--background` on the card
     * at 1.045:1. Measured before the fix at 320px: "9:41:31" rendered as "9:41:" from a 42px
     * root, and "SINGAPORE" was escaping from 40px and had been since it was added.
     *
     * `anywhere` and NOT `break-word`, which is the distinction the wall's page heading records
     * at length: `break-word` breaks the rendered line but is defined not to affect intrinsic
     * minimum sizing, so the box still demands the full token's width and still overflows. A
     * gate that accepted either value would pass on the fix that does nothing.
     */
    it("lets every unbreakable line on a bib break, since the bib does not clip", () => {
        const rules = parseRules(pageCss(PAGES.all));
        // Single-token lines: a date wraps at its spaces and a name has several words, but each
        // of these is one token that must break or escape.
        //
        // THE LIST WAS THE INSTANCES SOMEONE HAPPENED TO NOTICE, and it was two short. It named
        // the two rows that had already been caught escaping, so it was a record of past
        // incidents rather than a gate on the property. Sweeping ORIGIN/MAIN as the baseline for
        // this change found `.bib-tag` — the word "Booked", the sole text carrier of a bib's
        // state — escaping the border box by 31.45px at a 44px root and 63.11px at 48, on a
        // 320px viewport, and it had been doing so since it was written. `.bib-go` is the new
        // action row and is the same shape ("Strava" does not break).
        //
        // Both are outside the WCAG 1.4.4 bracket, which tops out at a 32px root, so neither is
        // a conformance failure — which is presumably how two passes over that file walked past
        // the tag. The ink still lands on the card at 1.045:1 and is lost.
        for (const cls of ["bib-time", "bib-place", "bib-tag", "bib-go"]) {
            const owned = rules.filter((r) => r.selectors.some((sel) => new RegExp(`\\.${cls}\\b`).test(sel)));
            expect(owned.length, `no rule for .${cls} — this assertion would be vacuous`).toBeGreaterThan(0);
            const wrap = owned.map((r) => decl(r.body, "overflow-wrap") ?? decl(r.body, "word-wrap")).find((v) => v !== undefined);
            expect(
                wrap,
                `.${cls} is one unbreakable token at large text sizes and the bib does not clip, so `
                + "without a break rule its ink paints onto the card at 1.045:1 and the line is lost",
            ).toBe("anywhere");
        }
    });

    /**
     * THE WRAPPER IS LOAD-BEARING, so it gets an assertion of its own.
     *
     * `.bib-cell { display: grid }` is what makes a bib fill a wall row that a taller
     * neighbour has stretched; without it a row of bibs goes ragged. That is a geometry
     * property no test here can measure, but the two facts it rests on are checkable: the
     * grid item must be the list item, and the bib must be its child rather than the item
     * itself. Deleting the wrapper, or moving `.bib` back onto the `<li>`, breaks both.
     */
    it("keeps the bib inside a cell that can stretch, so a wall row cannot go ragged", () => {
        const doc = parseHTML(read(PAGES.all)).document;
        const cells = [...doc.querySelectorAll(".patch-wall > li")];
        expect(cells.length, "the wall must render one list item per race").toBe(EVENTS.length);
        for (const cell of cells) {
            expect(cell.classList.contains("bib-cell"), "every wall item must be a cell").toBe(true);
            expect(cell.classList.contains("bib"), "the bib must be INSIDE the cell, not be it").toBe(false);
            expect(cell.querySelector(".bib"), "each cell must hold exactly one bib").toBeTruthy();
            expect(cell.querySelectorAll(".bib").length).toBe(1);
        }
        const rule = parseRules(pageCss(PAGES.all)).find((r) => r.selectors.some((sel) => /\.bib-cell\b/.test(sel)));
        expect(rule, "the cell must ship a rule — without one it is an inert wrapper").toBeTruthy();
        expect(decl(rule!.body, "display"), "the cell must stretch its bib to the row's height").toBe("grid");
    });

    /**
     * THE AFFORDANCE IS A LABEL A READER CAN SEE, and the previous version of this assertion is
     * the reason it has to be said that way.
     *
     * That version required a shape plus an `sr-only` transcription of it, and it passed on the
     * build two friends could not use. Measured on the shipped page at 390x844, the mark it was
     * asserting rendered 7.5 x 10px — 75px² on a 324 x 141px bib, 0.16% of it, monochrome and
     * unlabelled — with its only words hidden from everyone who could see the bib. Every clause
     * held; the affordance did not exist for a sighted reader.
     *
     * So the property is inverted. The words must be VISIBLE, and the assertion below fails on
     * exactly the arrangement that used to pass: a glyph whose label is `sr-only`. The glyph is
     * kept and still aria-hidden, because it names the destination and the visible words now
     * carry the meaning — which is also what discharges SC 1.1.1 without a second transcription.
     *
     * NO FLOOR ON THE LINKED SUBSET. `.toBeGreaterThan(0)` here would be a hand-counted property
     * of today's calendar: no race carries an activity id every January after the rollover, and
     * this suite is the Netlify BUILD COMMAND, so that failure is a failed production deploy
     * triggered by ordinary data entry. The loop iterates EVENTS and covers both branches per
     * event, so it is vacuous only if EVENTS is empty — which is the one guard that is safe.
     */
    it("gives a linked bib a visible label saying what using it does", () => {
        const doc = parseHTML(read(PAGES.all)).document;
        expect(EVENTS.length, "EVENTS is empty, so the loop below is vacuous").toBeGreaterThan(0);
        const bibs = [...doc.querySelectorAll(".bib")];

        for (const event of EVENTS) {
            const bib = bibs.find((b) => b.querySelector(".bib-name")?.textContent === event.name)!;
            const row = bib.querySelector(".bib-go");

            if (stravaActivityUrl(event) === null) {
                expect(row, `${event.name} has no activity id, so its bib must offer no action row`).toBeNull();
                continue;
            }

            expect(row, `${event.name} links out, so it must say so in words`).toBeTruthy();
            expect(bib.tagName.toLowerCase(), "a bib wearing the row must actually link").toBe("a");

            const label = row!.querySelector(".bib-go-label");
            expect(label?.textContent?.trim(), "the row's words are the configured label").toBe(PATCHES.strava_name);

            // THE POINT OF THE WHOLE CHANGE: the words are on screen. `sr-only` is what the
            // previous revision shipped and is the defect this guards, so it is named directly
            // rather than inferred — a class check is what the markup can actually answer, and
            // the rendered half is the browser sweep in the PR.
            expect(label?.classList.contains("sr-only"),
                "the label must be VISIBLE — an sr-only label is the arrangement two reviewers could not see")
                .toBe(false);
            expect(row!.querySelector(".sr-only"),
                "and nothing in the row may be visually hidden: the glyph is decorative and the words carry it")
                .toBeNull();

            const glyph = row!.querySelector(`span[class~="${iconClass(PATCHES.strava_icon)}"]`);
            expect(glyph, "the row keeps the configured glyph, and it must have a rule — an icon class "
                + "UnoCSS never generated renders as a mask box at zero size").toBeTruthy();
            expect(glyph?.getAttribute("aria-hidden"),
                "the glyph is decorative now: the visible words say what the mark used to have to")
                .toBe("true");
        }

        // The mark that USED to carry this is gone, and so are its rules. Left behind, the
        // orphan gate in build-output.test.ts would fail the build — but only if the rules went
        // too, and a stray element with no rule fails nothing at all. This is the half that
        // catches a half-finished revert.
        expect(doc.querySelector(".bib-strava"),
            "the old corner mark must not come back alongside the row — one affordance, one place")
            .toBeNull();
    });

    /**
     * THE ACTION ROW MUST NOT BE DRAWN LIKE THE CAPTION DIRECTLY ABOVE IT.
     *
     * `ELAPSED 9:41:31` sits immediately above the row in the same 10px uppercase letterspaced
     * idiom, and four other lines on the bib share `opacity: 0.8`. A row that joined that group
     * would be a control drawn exactly like the captions around it — which is the defect this
     * whole change exists to fix, re-committed one element further down.
     *
     * Two properties, both read from the shipped stylesheet: the row carries a text decoration
     * (the cue that survives a phone, where there is no hover), and it is NOT dimmed.
     */
    it("draws the action row as a control rather than as another caption", () => {
        const rules = parseRules(pageCss(PAGES.all));

        const labelRules = rules.filter((r) => r.selectors.some((s) => /\.bib-go-label\b/.test(s)) && !r.at);
        expect(labelRules.length, "no unconditional .bib-go-label rule — this assertion would be vacuous")
            .toBeGreaterThan(0);
        // BOTH SPELLINGS, and that is not defensiveness: the minifier collapses
        // `text-decoration: underline` + `text-decoration-thickness` into the `text-decoration`
        // shorthand, while the `text-link` shortcut emits `text-decoration-line`. A gate matching
        // only one of them goes red on correct CSS the first time the other minifier path wins.
        const decorated = labelRules.some((r) => {
            const v = decl(r.body, "text-decoration") ?? decl(r.body, "text-decoration-line");
            return v !== undefined && /underline/i.test(v);
        });
        expect(decorated, "the row's label must carry a text decoration — on a phone it is the only "
            + "cue there is, and the bib sets text-decoration: none on the anchor itself").toBe(true);

        for (const r of rules.filter((x) => x.selectors.some((s) => /\.bib-go\b/.test(s)))) {
            const o = decl(r.body, "opacity");
            expect(o === undefined || Number(o) >= 1,
                `${r.selectors.join(",")} dims the action row to ${o} — the four captions on this bib are `
                + "the dimmed ones, and a control drawn like them is the defect being fixed").toBe(true);
        }
    });

    /**
     * THE TIME IS LABELLED, and the label is the assertion rather than a nicety. Elapsed
     * and moving are far apart on these rides — 8:32:05 against 5:03:55 — so a bare time
     * invites a reader to divide it into the distance above it and be 9 km/h wrong.
     */
    it("prints a finished race's elapsed time, labelled, and only where there is one", () => {
        const bibs = [...parseHTML(read(PAGES.all)).document.querySelectorAll(".bib")];
        // Same reasoning as the link test above: no floor on the filtered subset. The loop
        // below covers both branches per event and is vacuous only if EVENTS is.
        expect(EVENTS.length, "EVENTS is empty, so the loop below is vacuous").toBeGreaterThan(0);

        for (const event of EVENTS) {
            const bib = bibs.find((b) => b.querySelector(".bib-name")?.textContent === event.name)!;
            const row = bib.querySelector(".bib-time");
            if (event.elapsed_time === undefined) {
                expect(row, `${event.name} has no time, so its bib must print no time row`).toBeNull();
                continue;
            }
            expect(row, `${event.name} must print its time`).toBeTruthy();
            expect(row!.querySelector(".bib-time-value")?.textContent?.trim()).toBe(event.elapsed_time);
            expect(
                row!.querySelector(".bib-time-label")?.textContent?.trim(),
                "an unlabelled time does not say which clock it is",
            ).toBe(PATCHES.elapsed_label);
        }
    });

    /**
     * Compared against {@link EVENTS} rather than against a list of countries written
     * here: `country` is human-edited, so a mismatch is wanted feedback, and a literal
     * would have to be updated in two places every time a race is added.
     */
    it("prints each race's country on its own bib", () => {
        const bibs = [...parseHTML(read(PAGES.all)).document.querySelectorAll(".bib")];
        expect(bibs.length, "no bibs — this assertion would be vacuous").toBe(EVENTS.length);
        const byName = new Map(EVENTS.map((e) => [e.name, e.country]));
        for (const bib of bibs) {
            const name = bib.querySelector(".bib-name")?.textContent ?? "";
            expect(bib.querySelector(".bib-place")?.textContent, `${name} must print its country`)
                .toBe(byName.get(name));
        }
    });

    it("prints every distance to two decimals, split so the fraction can be set small", () => {
        for (const {event} of patchWall()) {
            const bib = [...parseHTML(read(PAGES.all)).document.querySelectorAll(".bib")]
                .find((b) => b.querySelector(".bib-name")?.textContent === event.name)!;
            const value = bib.querySelector(".bib-value")!;
            expect(value.textContent?.replace(/\s+/g, ""), `${event.name} distance`).toBe(event.km.toFixed(2));
            expect(value.querySelector(".bib-fraction")?.textContent, `${event.name} fraction`)
                .toBe(`.${event.km.toFixed(2).split(".")[1]}`);
        }
    });

    /**
     * THE SAFELIST TRAP, asserted rather than trusted.
     *
     * `uno.config.ts` builds its icon safelist from GOALS, LINKS, CAREER, WELCOME,
     * FOOTER, NOW and PATCHES — never from EVENTS. A presetIcons class with no rule
     * is not a visible failure: the span keeps its class, ships its markup bytes and
     * renders as a mask box at zero size. So the day someone gives the wall its own
     * sport→icon map instead of going through `goalForSport`, every bib loses its
     * icon and nothing else changes.
     *
     * Read from the built stylesheet the page actually loads — which for these rules
     * is partly an inlined `<style>`, since Astro moved this component's CSS into the
     * page rather than the shared chunk.
     */
    it("gives every bib's sport icon a real rule with a mask", () => {
        const css = pageCss(PAGES.all);
        const doc = parseHTML(read(PAGES.all)).document;
        // Split the class list: the icon span also wears `bib-icon`, so reading the whole
        // attribute would produce "i-ri-run-line bib-icon" and match no rule.
        const icons = [...doc.querySelectorAll(".bib-sport span[class]")]
            .flatMap((s) => (s.getAttribute("class") ?? "").split(/\s+/))
            .filter((c) => c.startsWith("i-"));
        expect(new Set(icons).size, "the wall must render both sports' icons").toBe(GOALS.length);
        for (const cls of new Set([...icons, iconClass(PATCHES.home_icon)])) {
            const rule = css.match(new RegExp(`\\.${cls}\\{([^}]*)\\}`))?.[1];
            expect(rule, `${cls} has no CSS rule — it renders at zero size, silently`).toBeTruthy();
            expect(rule, `${cls} must carry a mask image`).toContain("--un-icon:url(");
        }
        // The classes must be the GOALS' own, so the two cannot drift apart.
        for (const goal of GOALS) {
            expect(icons, `${goal.goal_name} bibs must wear the goal's icon`).toContain(iconClass(goal.goal_logo));
        }
    });

    it("marks exactly one filter link as the current page, and counts what it links to", () => {
        for (const [key, page] of Object.entries(PAGES)) {
            const doc = parseHTML(read(page)).document;
            const links = [...doc.querySelectorAll(".patch-filter a")];
            expect(links.length, `${page} filter row`).toBe(GOALS.length + 1);

            const current = links.filter((a) => a.getAttribute("aria-current") === "page");
            expect(current.length, `${page} must mark exactly one filter as current`).toBe(1);
            const href = key === "all" ? "/patches" : `/patches/${GOALS.find((g) => g.goal_name.toLowerCase() === key)!.sport}`;
            expect(current[0].getAttribute("href"), `${page} marks the wrong filter current`).toBe(href);

            // Each count is the number of bibs the page it points at renders. This is
            // the one number on the page that could quietly disagree with the wall.
            for (const a of links) {
                const target = a.getAttribute("href") === "/patches"
                    ? PAGES.all
                    : `dist${a.getAttribute("href")}/index.html`;
                const shown = Number(a.querySelector(".patch-filter-count")?.textContent);
                const actual = parseHTML(read(target)).document.querySelectorAll(".bib").length;
                expect(shown, `${page}: "${a.textContent?.trim()}" advertises ${shown} but ${target} renders ${actual}`).toBe(actual);
            }
        }
    });

    /**
     * Same rule the home page holds every control to: named by content, never by an
     * aria-label that can silently go stale against the words beside it.
     */
    it("names every link from its own content, and never twice for one destination", () => {
        for (const page of Object.values(PAGES)) {
            const byHref = new Map<string, Set<string>>();
            for (const a of parseHTML(read(page)).document.querySelectorAll("a[href]")) {
                expect(a.getAttribute("aria-label"), `${page}: ${a.getAttribute("href")} carries an aria-label`).toBeNull();
                const name = a.textContent?.trim().replace(/\s+/g, " ") ?? "";
                expect(name, `${page}: ${a.getAttribute("href")} has no accessible name`).not.toBe("");
                const href = a.getAttribute("href")!;
                byHref.set(href, (byHref.get(href) ?? new Set()).add(name));
            }
            for (const [href, names] of byHref) {
                expect([...names].length, `${page}: ${href} is announced as ${[...names].join(" and ")}`).toBe(1);
            }
        }
    });

    /**
     * The lede is where a reader looks for what the page contains, so a filtered page
     * saying "every race I have entered this year" is a claim it cannot make — it
     * shows four of six. The heading and the filter row both narrow; this made it
     * three for three. Also asserts the placeholder was actually substituted, since a
     * literal `{sport}` on the page is the obvious way for this to fail.
     */
    it("narrows the lede's claim to what each page actually shows", () => {
        for (const [key, page] of Object.entries(PAGES)) {
            const lede = parseHTML(read(page)).document.querySelector("main p.text-sm")?.textContent ?? "";
            expect(lede, `${page} must carry a lede`).toContain(PATCHES.key);
            expect(lede, `${page} ships an unsubstituted placeholder`).not.toContain("{sport}");
            if (key === "all") {
                expect(lede).toContain(PATCHES.scope_all);
            } else {
                const goal = GOALS.find((g) => g.goal_name.toLowerCase() === key)!;
                expect(lede, `${page} must say which sport it is showing`).toContain(goal.goal_name.toLowerCase());
                expect(lede, `${page} claims to show every race and does not`).not.toContain(PATCHES.scope_all);
            }
        }
    });

    it("keeps the wall a list, so it announces its length", () => {
        for (const page of Object.values(PAGES)) {
            const doc = parseHTML(read(page)).document;
            const wall = doc.querySelector("ul.patch-wall");
            expect(wall, `${page} must render the wall as a list`).toBeTruthy();
            expect([...wall!.children].every((c) => c.tagName.toLowerCase() === "li"), `${page}: every bib is an <li>`).toBe(true);
        }
    });
});

/**
 * THE SPORT MARK, RESOLVED THROUGH THE ELEMENT'S OWN CLASSES.
 *
 * Reading `--sport-ride` out of the theme block by name would certify a hex that
 * nothing is guaranteed to paint — the same shape as the 1.89:1 progress-bar defect
 * and the 2.77:1 brand-ink one, both of which had perfectly contrasting tokens
 * pointed at by nothing. So this walks the actual chain the browser walks:
 *
 *   .bib-sport            color: var(--sport)
 *   .bib / .bib--booked   --sport: var(--sport-on-ink | --sport-on-card)
 *   .bib--cycling|running --sport-on-*: var(--sport-ride* | --sport-run*)
 *   :root[data-theme]     the hex
 *
 * Get any link wrong — most easily by swapping the two halves of the last one, which
 * is precisely the mistake the `-on-ink` naming exists to prevent — and this fails.
 *
 * THE BAR IS 4.5:1, the text floor, not the 3:1 graphics floor. The mark is an icon
 * AND the word RIDE or RUN beside it, and the word is text.
 *
 * Cross-checked against composited pixels sampled from the rendered page, which is
 * the only instrument that can see an ancestor `opacity` — the mechanism that put
 * this mark at 2.53:1 in the design rig. Measured there: light 6.52 ride / 7.33 run
 * booked, 9.96 / 10.57 finished; dark 9.08 / 9.62 booked, 6.81 / 7.66 finished. The
 * stylesheet resolution below must land on the same numbers; if it stops doing so,
 * something is compositing that this file cannot see.
 */
describe("the sport mark reads as text on the surface it lands on", () => {
    const css = pageCss(PAGES.all);

    /** Every flat, unconditional rule — forced-colours overrides are not the sighted case. */
    const rules = parseRules(css).filter((r) => !r.nested && !isKeyframeStep(r));

    /** The class tokens a selector mentions, unescaped. */
    const classTokensOf = (selector: string) =>
        [...selector.matchAll(/\.((?:[\w-]|\\.)+)/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));

    /**
     * WHETHER THIS FILE'S MODEL CAN REPRESENT A SELECTOR AT ALL — and the answer has to
     * be a refusal rather than a guess, because a guess is wrong in BOTH directions.
     *
     * The model below is "a rule applies to an element when every class token in its
     * selector is worn by that element". That is a subset test, and it silently
     * discards combinators, pseudo-classes and structural pseudos. A review panel
     * exploited it twice, and each exploit runs the opposite way:
     *
     *   - A rule the browser NEVER applies, taken as the answer:
     *         .bib-sport { color: var(--hole) }        <- the resting rule, broken
     *         .bib-sport:first-child { color: var(--sport) }
     *     The mark is not its parent's first child (the date is), so the browser paints
     *     the broken value and the words RIDE and RUN render at 1.01:1 — invisible on
     *     every booked bib, in both themes. Every one of this file's assertions passed.
     *
     *   - A rule the browser DOES apply, missed entirely:
     *         .bib--booked .bib-sport { opacity: .5 }
     *     "bib-sport" is not in the <li>'s token set and "bib--booked" is not in the
     *     <span>'s, so neither end of the walk sees it. 2.43:1 rendered, suite green.
     *
     * Both are the defect the header comment above says this file exists to prevent.
     *
     * So a selector this model cannot represent is not skipped — it is REFUSED, and the
     * assertion below turns any refusal touching the bib into a failure. That is the
     * precedent `parseRules` and `widthPx` already set in helpers/css.ts: a parser that
     * cannot read something must go red, because the alternative is a silent pass.
     *
     * The `\\.` neutralisation is load-bearing. UnoCSS arbitrary-value classes ship as
     * `.bg-\[var\(--card-background\)\]`, whose escaped brackets would otherwise read as
     * an attribute selector and reject a perfectly modellable rule. Astro's scoping
     * attribute is stripped for the same reason — it is on every rule in the component
     * and constrains nothing this model cares about.
     */
    const unmodellable = (selector: string) => {
        const bare = selector
            .replace(/\\./g, "x")
            .replace(/\[data-astro-cid-[\w-]+\]/g, "")
            .trim();
        return /[\s>+~:[]/.test(bare);
    };

    /** The class tokens a selector requires, or null when this model cannot represent it. */
    const required = (selector: string): string[] | null =>
        unmodellable(selector) ? null : classTokensOf(selector);

    /**
     * The last value declared for `prop` by any rule every one of whose class tokens
     * is worn by `tokens`. Sheet order decides, which is sound here because every
     * rule involved is a single class plus Astro's scoping attribute — the same
     * precondition `effectiveDecl` states.
     */
    const declared = (tokens: string[], prop: string): string | undefined => {
        let value: string | undefined;
        for (const rule of rules) {
            const hits = rule.selectors.some((s) => {
                const need = required(s);
                // null means "this model cannot represent the selector". It is neither a
                // hit nor a safe miss — the assertion below is what stops it being one.
                return need !== null && need.length > 0 && need.every((c) => tokens.includes(c));
            });
            if (hits) value = decl(rule.body, prop) ?? value;
        }
        return value;
    };

    const themeBlock = (theme: string) => {
        const block = css.match(new RegExp(`\\[data-theme=['"]?${theme}['"]?\\]\\{([^}]*)\\}`))?.[1];
        expect(block, `the ${theme} theme block must ship`).toBeTruthy();
        return Object.fromEntries(
            [...block!.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)].map((m) => [m[1], m[2]]),
        ) as Record<string, string>;
    };

    /** Follow `var()` through the element's own rules, then the theme block. */
    const resolve = (tokens: string[], start: string, theme: Record<string, string>): string => {
        let value = start;
        for (let hop = 0; hop < 8; hop++) {
            const name = value.trim().match(/^var\((--[\w-]+)\)$/)?.[1];
            if (!name) return value.trim();
            value = declared(tokens, name) ?? theme[name] ?? "";
            expect(value, `${name} resolves to nothing for .${tokens.join(".")}`).not.toBe("");
        }
        throw new Error(`var() chain from ${start} did not terminate`);
    };

    const expand = (hex: string) => {
        const h = hex.replace("#", "");
        return h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    };
    const channel = (hex: string, at: number) => {
        const v = parseInt(expand(hex).slice(at, at + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 2) + 0.0722 * channel(hex, 4);
    const contrast = (a: string, b: string) => {
        const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
        return (x + 0.05) / (y + 0.05);
    };

    /**
     * THE OTHER HALF OF THE REFUSAL. Returning null from `required()` only stops the
     * resolver reading a selector wrongly; on its own it converts a wrong answer into a
     * quiet skip, which is the same silent pass in a better disguise.
     *
     * So: no rule that this model cannot represent may touch the bib at all. If one
     * appears, the choice is to restructure the CSS into single-class rules or to teach
     * the resolver — and this failure is what forces that choice to be made rather than
     * discovered later by a review panel.
     *
     * Scoped to the bib's own tokens deliberately. The sheet is full of legitimately
     * unmodellable selectors (the preflight, `main > *`, `.space-y-1>:not([hidden])`),
     * and demanding the whole stylesheet be single-class would be a gate nobody could
     * keep green. What matters is the subtree whose colours the assertions below certify.
     */
    it("lets no rule the resolver cannot model reach the bib, so a refusal is not a quiet skip", () => {
        const doc = parseHTML(read(PAGES.all)).document;
        const bibTokens = new Set<string>([
            // synthetic states the assertions below construct, which the page may not
            // be rendering today — a booked-only wall is a real December configuration
            "bib", "bib--booked", ...GOALS.map((g) => `bib--${g.sport}`),
            ...[...doc.querySelectorAll(".bib, .bib *")]
                .flatMap((el) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)),
        ]);
        expect(bibTokens.size, "no bib tokens found — this assertion would be vacuous").toBeGreaterThan(6);

        // Only the properties this file's model actually resolves. A combinator rule
        // setting `letter-spacing` cannot corrupt a colour chain, and blocking it would
        // be a gate going red on legitimate work — which is its own kind of defect.
        const READ = /(?:^|;)\s*(?:color|background-color|opacity|--[\w-]+)\s*:/;
        const offenders: string[] = [];
        for (const rule of rules) {
            if (!READ.test(rule.body)) continue;
            for (const selector of rule.selectors) {
                if (!unmodellable(selector)) continue;
                if (!classTokensOf(selector).some((t) => bibTokens.has(t))) continue;
                offenders.push(`${selector} { ${rule.body.slice(0, 70)} }`);
            }
        }
        expect(
            offenders,
            "this rule reaches the bib through a combinator or a pseudo-class, which the class-subset"
            + " resolver in this file cannot represent — it would be read as applying when it does not,"
            + " or missed when it does. Make it a single-class rule, or teach the resolver.",
        ).toEqual([]);
    });

    /**
     * THE THIRD WAY THE MODEL CAN BE WRONG, and the one the two guards above do not
     * cover: `rules` drops every rule inside an at-rule, so a nested rule that changes a
     * colour the assertions below certify is not refused — it is invisible.
     *
     * That is correct for the at-rules the bib actually has. A forced-colours or a print
     * override is not the sighted-on-screen case at all: its colours come from the OS or
     * from paper rather than from the theme block, so resolving them against the theme
     * would be meaningless. It is NOT correct for a viewport query. `@media (min-width:
     * 40rem) { .bib { --ink: … } }` applies to the same sighted reader on the same
     * screen, and dropping it would leave every ratio below certifying a colour the
     * browser paints at one width and not another.
     *
     * So the discriminator is whether the condition can be true in the default screen
     * context, not which feature it names: anything gated on paper, on forced colours or
     * on a contrast preference is out of the model by construction; anything else that
     * touches a modelled property must go red and be taught to the resolver.
     */
    it("keeps every at-rule that repaints the bib out of the sighted screen case", () => {
        const OUT_OF_MODEL = /print|forced-colors|prefers-contrast|monochrome/;
        const READ = /(?:^|;)\s*(?:color|background-color|opacity|--[\w-]+)\s*:/;
        const nested = parseRules(css).filter((r) => r.nested && !isKeyframeStep(r));
        expect(nested.length, "no nested rules parsed — this assertion would be vacuous").toBeGreaterThan(0);

        const offenders = nested
            .filter((r) => READ.test(r.body))
            .filter((r) => r.selectors.some((s) => /\.bib\b|\.bib--|\.bib-/.test(s)))
            .filter((r) => !OUT_OF_MODEL.test(r.at))
            .map((r) => `${r.at} { ${r.selectors.join(",")} { ${r.body.slice(0, 60)} } }`);

        expect(
            offenders,
            "this at-rule repaints the bib in a context the sighted screen reader is also in,"
            + " and the colour model in this file drops every nested rule — so the ratios below"
            + " would certify a colour the browser does not always paint. Teach the resolver.",
        ).toEqual([]);
    });

    it("resolves the mark through .bib-sport rather than by looking a token up by name", () => {
        // The chain has to START at the element that paints, or every ratio below
        // certifies a token nothing is wired to.
        expect(declared(["bib-sport"], "color"), ".bib-sport must paint the sport mark").toBe("var(--sport)");
    });

    it.each(
        GOALS.flatMap((goal) =>
            (["finished", "booked"] as const).flatMap((state) =>
                (["light", "dark"] as const).map((theme) => ({goal, state, theme})))),
    )("holds the $goal.short_name mark at 4.5:1 on a $state bib in the $theme theme", ({goal, state, theme}) => {
        const tokens = ["bib", `bib--${goal.sport}`, ...(state === "booked" ? ["bib--booked"] : [])];
        const t = themeBlock(theme);

        const mark = resolve(tokens, declared(["bib-sport"], "color")!, t);
        // The ground is the bib's own face — except on a booked bib, whose face is
        // transparent, where it is the card the bib is drawn on.
        const face = resolve(tokens, declared(tokens, "background-color")!, t);
        const ground = face === "transparent" ? t["--card-background"] : face;

        expect(mark, `${goal.short_name}/${state}/${theme}: the mark did not resolve to a colour`).toMatch(/^#[0-9a-fA-F]{3,6}$/);
        expect(ground, `${goal.short_name}/${state}/${theme}: the ground did not resolve to a colour`).toMatch(/^#[0-9a-fA-F]{3,6}$/);

        const ratio = contrast(mark, ground);
        expect(
            ratio,
            `${goal.short_name} on a ${state} bib in ${theme}: ${mark} on ${ground} is ${ratio.toFixed(2)}:1 — the mark`
            + " includes the word, so it is held to the 4.5:1 text floor, not the 3:1 graphics one",
        ).toBeGreaterThanOrEqual(4.5);
    });

    /**
     * NOTHING OVER THE MARK MAY BE TRANSLUCENT, and this is the one assertion in this
     * file that exists because the ratios above CANNOT see the thing it guards.
     *
     * An ancestor `opacity` composites the mark toward whatever is behind it, and
     * `getComputedStyle` — and therefore any stylesheet resolution, including the one
     * above — reports the AUTHORED colour, which ancestor opacity does not touch. So
     * every ratio here would stay green while the rendered mark drifted anywhere.
     *
     * That is not hypothetical. It is the original defect: the design rig dimmed the
     * whole date row as a unit, the sport mark lives in that row, and the mark that
     * resolves to #F3A3AA sampled as rgb(196,132,138) — 9.96:1 authored, 6.57:1
     * rendered, on a bib where nothing was meant to be dimmed at all. Stacked with a
     * second dimming on the un-earned bibs it reached 2.53:1, which is what started
     * this whole redesign.
     *
     * Verified by mutation: re-attaching that opacity to `.bib-meta` leaves every
     * ratio above green and only trips this.
     *
     * The dimming the design DOES want — the date and the tag — is a SIBLING of the
     * mark and is untouched by this, which is exactly the distinction the component
     * splits those three elements to make.
     */
    it("puts no translucent ancestor over the sport mark, which no ratio here could see", () => {
        const doc = parseHTML(read(PAGES.all)).document;
        const mark = doc.querySelector(".bib-sport");
        expect(mark, "the wall must render a sport mark").toBeTruthy();

        // The mark, everything inside it, and every ancestor up to the document.
        const chain = new Set<Element>([...mark!.querySelectorAll("*")] as Element[]);
        for (let el: Element | null = mark; el; el = el.parentElement) chain.add(el);

        /**
         * ASK THE DOM, NOT THE TOKEN SET. This walked `declared(tokens, "opacity")` per
         * element, which is the class-subset model — and that model cannot see a
         * DESCENDANT COMBINATOR. `.bib--booked .bib-sport{opacity:.5}` was invisible to
         * it from both ends: "bib-sport" is not among the <li>'s tokens and
         * "bib--booked" is not among the <span>'s. Measured at 2.43:1 rendered with the
         * whole suite green — the exact 2.53:1 defect this assertion's own docstring
         * says it exists to prevent, walking straight through it.
         *
         * `structuralSelector` + `querySelectorAll` asks the question the browser asks.
         * It is the idiom `control-geometry.test.ts` and `page-fit.test.ts` already use,
         * and it is deliberately NOT wrapped in try/catch: a selector linkedom cannot
         * parse must go red, because swallowing the throw is exactly how a guard stops
         * being able to fail.
         */
        const dimming = rules
            .filter((r) => !/forced-colors|prefers-contrast/.test(r.at))
            .map((r) => ({rule: r, value: decl(r.body, "opacity")}))
            .filter((x) => x.value !== undefined && parseFloat(x.value!) < 1);

        const reaches = (rule: Rule): Element[] => {
            const hit: Element[] = [];
            for (const selector of rule.selectors) {
                const structural = structuralSelector(selector);
                if (!structural) continue;
                hit.push(...([...doc.querySelectorAll(structural)] as unknown as Element[]));
            }
            return hit;
        };

        const offenders: string[] = [];
        for (const {rule, value} of dimming) {
            const over = reaches(rule).filter((el) => chain.has(el));
            for (const el of over) {
                offenders.push(`${rule.selectors.join(",")} { opacity: ${value} } reaches <${el.tagName.toLowerCase()}>`);
            }
        }
        expect(
            offenders,
            "an opacity here composites the sport mark toward its ground, and every contrast assertion in this"
            + " file resolves the AUTHORED colour and would stay green. Dim a sibling of the mark instead",
        ).toEqual([]);

        // Non-vacuity: the component really does dim something, and this must be
        // able to tell that apart from dimming the mark.
        const dimmedSomewhere = dimming.flatMap(({rule}) => reaches(rule))
            .filter((el) => el.closest(".bib"));
        expect(dimmedSomewhere.length, "nothing on a bib is dimmed at all — this assertion cannot distinguish anything").toBeGreaterThan(0);
    });

    /**
     * DIMMED TEXT IS STILL TEXT, and `opacity` is the one way to make it fail a
     * contrast check while every colour token involved is perfectly chosen.
     *
     * Three things on a bib are deliberately quiet — the date, the "Booked" tag and
     * the vertical "KM" — and each is its authored ink composited toward the face
     * behind it. `--background` on `--text` is 18.86:1; the same ink at 0.55 opacity
     * is 4.29:1 on a booked bib, which is under the floor. That is not a
     * hypothetical: it is what this component shipped at until this assertion was
     * written, and neither the token pair nor the ratio test above could see it,
     * because both resolve the AUTHORED colour.
     *
     * So the composite is done here, per element, per state, per theme. `opacity`
     * blends the element toward whatever is painted behind it, which for a booked bib
     * is the card rather than its own transparent face.
     */
    it.each(
        GOALS.flatMap((goal) =>
            (["finished", "booked"] as const).flatMap((state) =>
                (["light", "dark"] as const).map((theme) => ({goal, state, theme})))),
    )("keeps every dimmed line on a $state $goal.short_name bib readable in the $theme theme", ({goal, state, theme}) => {
        const bibTokens = ["bib", `bib--${goal.sport}`, ...(state === "booked" ? ["bib--booked"] : [])];
        const t = themeBlock(theme);
        const ink = resolve(bibTokens, declared(bibTokens, "color")!, t);
        const face = resolve(bibTokens, declared(bibTokens, "background-color")!, t);
        const ground = face === "transparent" ? t["--card-background"] : face;

        const doc = parseHTML(read(PAGES.all)).document;
        // `.bib *` was too narrow: the filter row carries its own `opacity` on
        // `.patch-filter-count` and was unguarded by this, which a review panel found.
        // It measures fine today (7.03:1 at worst of four states) — but "fine today"
        // measured by hand is exactly what this assertion exists to replace.
        const dimmed = [...doc.querySelectorAll(".bib *, .patch-filter *")]
            .map((el) => ({el, tokens: (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)}))
            .map((x) => ({...x, opacity: declared(x.tokens, "opacity")}))
            .filter((x) => x.opacity !== undefined && parseFloat(x.opacity) < 1);
        expect(dimmed.length, "nothing is dimmed — this assertion would be vacuous").toBeGreaterThan(0);

        const rgb = (hex: string) => {
            const h = expand(hex);
            return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
        };
        const composite = (fg: string, bg: string, a: number) => {
            const [f, b] = [rgb(fg), rgb(bg)];
            return "#" + f.map((c, i) => Math.round(c * a + b[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
        };

        for (const {el, tokens, opacity} of new Map(dimmed.map((d) => [d.tokens.join(" "), d])).values()) {
            const a = parseFloat(opacity!);
            const composited = composite(ink, ground, a);
            const ratio = contrast(composited, ground);
            expect(
                ratio,
                `.${tokens.join(".")} on a ${state} ${goal.short_name} bib in ${theme}: ${ink} at opacity ${a}`
                + ` composites to ${composited} on ${ground}, which is ${ratio.toFixed(2)}:1. It is text —`
                + ` <${el.tagName.toLowerCase()}>"${el.textContent?.trim().slice(0, 12)}" — so the floor is 4.5:1.`
                + " Raise the opacity, or make the line quiet with size and weight instead",
            ).toBeGreaterThanOrEqual(4.5);
        }
    });

    /**
     * THE POLARITY ITSELF, asserted separately from the ratios.
     *
     * A pair of hues swapped between the two grounds could in principle still clear
     * 4.5:1 on both — the ratios do not pin WHICH hue goes where, and the whole point
     * of the `-on-ink` convention is that the swap is the easy mistake. So: the mark
     * on an inverted face must be the paler of the pair in the light theme, and the
     * darker of it in the dark theme, because the face it sits on is the opposite of
     * the card.
     */
    it.each(GOALS)("puts $short_name's paler hue on the face that is dark, in both themes", (goal) => {
        for (const theme of ["light", "dark"] as const) {
            const t = themeBlock(theme);
            const onCard = resolve(["bib", `bib--${goal.sport}`, "bib--booked"], declared(["bib-sport"], "color")!, t);
            const onInk = resolve(["bib", `bib--${goal.sport}`], declared(["bib-sport"], "color")!, t);
            const cardIsDark = luminance(t["--card-background"]) < luminance(t["--text"]);
            expect(
                luminance(onInk) > luminance(onCard),
                `${goal.short_name} in ${theme}: the inverted face is ${cardIsDark ? "light" : "dark"}, so the mark on it`
                + ` must be the ${cardIsDark ? "darker" : "paler"} hue — got ${onInk} on ink and ${onCard} on card`,
            ).toBe(!cardIsDark);
        }
    });
});

/**
 * `Card` clips (`overflow: hidden`), so an absolute height anywhere inside it turns
 * the reader's own text size into deleted ink. `card-fill.test.ts` polices this on
 * the home page and is scoped to `main [data-card]` there; the patch wall's card is
 * on a different page with a different layout, and the layout invariants in that
 * file are about the lg bento grid rather than about clipping. This is the one rule
 * from it that is universal, so it is the one restated here rather than widening a
 * whole file of grid assertions onto a page that has no grid.
 */
describe("nothing inside the wall's card is pinned to a device pixel", () => {
    it("declares no absolute height on the bib or anything in it", () => {
        const rules = parseRules(pageCss(PAGES.all)).filter((r) => !isKeyframeStep(r));
        const bibRules = rules.filter((r) => r.selectors.some((s) => /\.(bib|patch-)/.test(s)));
        expect(bibRules.length, "no bib rules found — this assertion would be vacuous").toBeGreaterThan(5);

        const absolute = (v: string) =>
            [...v.matchAll(/(?:^|[\s(,])(-?[\d.]+)(px|pt|pc|in|cm|mm|q)\b/gi)].some((m) => parseFloat(m[1]) !== 0);
        const offenders: string[] = [];
        for (const r of bibRules) {
            for (const prop of ["height", "max-height", "block-size", "max-block-size", "font-size"] as const) {
                const v = decl(r.body, prop);
                if (v && absolute(v)) offenders.push(`${r.selectors.join(",")} { ${prop}: ${v} }`);
            }
        }
        expect(offenders, "spell it font-relative — a clipping card turns an absolute length into lost text").toEqual([]);
    });

    /**
     * The pin holes are the one place device pixels are correct, and stating why
     * keeps the rule above from being widened into nonsense. A hole is a punched
     * hole: it is the same 3.4px across whatever size the reader's text is, exactly
     * as it would be on paper. It carries no text and cannot clip anything.
     */
    /**
     * PRINT IS THE ONE CONTEXT WHERE A THEME TOKEN IS A BUG. Chrome's default
     * `print-color-adjust: economy` drops the face and keeps the ink, so a finished bib
     * printed the pale half of the palette onto white paper — a review measured 2.43:1,
     * and in the dark theme that ink is #FAFAFA. Paper is white whichever theme the
     * reader had on screen, so every `var(--text)`/`var(--background)` in a print rule
     * carries an assumption that is only true half the time.
     *
     * Asserted structurally rather than by ratio: this suite has no print rendering, and
     * a literal-colour rule is the thing that makes the printed ratio knowable at all.
     */
    it("prints the bib as ink on paper, with no theme token deciding the ink", () => {
        const printRules = parseRules(pageCss(PAGES.all))
            .filter((r) => r.at.includes("print"))
            .filter((r) => r.selectors.some((s) => /\.bib\b|\.bib--/.test(s)));
        expect(printRules.length, "the bib must carry a print treatment").toBeGreaterThan(0);

        const bib = printRules.find((r) => r.selectors.some((s) => /^\.bib\[/.test(s)))!;
        expect(bib, "the base .bib must be the one that drops the face").toBeTruthy();
        expect(decl(bib.body, "background-image"), "the pin holes are punched out of a face there is none of")
            .toBe("none");
        expect(decl(bib.body, "--face"), "an inverted face cannot survive print-color-adjust: economy")
            .toBe("transparent");

        for (const rule of printRules) {
            for (const prop of ["--ink", "--face", "--sport", "color", "background-color", "border-color"] as const) {
                const value = decl(rule.body, prop);
                expect(value ?? "", `${rule.selectors.join(",")} { ${prop} } must not read a theme token in print`)
                    .not.toMatch(/var\(--(text|background|card-background|accent)\b/);
            }
        }
        expect(decl(bib.body, "--ink"), "the printed ink must be a literal colour").toMatch(/^#[0-9a-fA-F]{3,6}$/);
    });

    it("keeps the pin holes in device pixels, which is what a punched hole is", () => {
        const rules: Rule[] = parseRules(pageCss(PAGES.all));
        const bib = rules.find((r) => r.selectors.some((s) => /^\.bib\[/.test(s)) && decl(r.body, "background-image"));
        expect(bib, "the bib must declare its holes").toBeTruthy();
        expect(decl(bib!.body, "background-image")).toContain("radial-gradient");
        expect(decl(bib!.body, "background-image")).toContain("7px");
    });
});

/**
 * THE NEW-TAB WARNING, and specifically WHERE IT LANDS.
 *
 * The bib opens a new tab and keeps doing so — the maintainer's call, and the argument
 * is recorded on NEW_TAB_NOTICE in constants.ts. What it owes a reader who cannot see
 * that happen is the warning WCAG SC 3.2.5 and technique G201 ask for, in advance.
 *
 * "In advance" is why the position is asserted rather than the presence. The obvious
 * implementation — appending it to PATCHES.strava_name — puts it THIRD in a 92-character
 * accessible name, because `.bib-strava` sits in the meta row and accname is assembled
 * in DOM order. A presence-only assertion passes for that, so it would not be a gate.
 *
 * EVERYTHING HERE RENDERS THE COMPONENT DIRECTLY with a synthetic event, for the reason
 * this file already records twice: reading it off the built wall makes the coverage
 * depend on the calendar holding a linked race today, which is false for the whole of
 * any January and would turn an unattended bot deploy red.
 */
describe("a bib that opens a new tab says so, last", () => {
    const linked: RaceEvent = {
        date: `${GOAL_YEAR}-07-10`, name: "A Race With A Recording", km: 100, sport: "cycling",
        country: "Thailand", elapsed_time: "5:00:00", strava_activity_id: "1234567890123",
    };
    const unlinked: RaceEvent = {
        date: `${GOAL_YEAR}-07-10`, name: "A Race With No Recording", km: 100, sport: "cycling",
        country: "Thailand", elapsed_time: "5:00:00",
    };
    const render = async (event: RaceEvent, state: PatchState = "finished") =>
        parseHTML(await (await AstroContainer.create()).renderToString(Patch, {props: {event, state}})).document;

    /**
     * ALL the rendered text, and it must not be read off `document.body`.
     *
     * A container render is a fragment, so linkedom leaves `body` EMPTY while
     * `documentElement` holds the markup — measured, 0 characters against 32. Every
     * "this text is absent" assertion written against `body.textContent` therefore
     * passes without looking at anything, and one here did: it survived a mutation that
     * announced a new tab on a bib that opens none. The guard below is what makes the
     * absence assertions mean something, because an empty haystack cannot fail them.
     */
    const allText = (doc: Document) => {
        const text = doc.documentElement?.textContent ?? "";
        expect(text.length, "nothing rendered — every absence assertion below would be vacuous").toBeGreaterThan(0);
        return text;
    };

    it("puts the warning inside the anchor, as its LAST child", async () => {
        const doc = await render(linked);
        const anchor = doc.querySelector("a.bib");
        expect(anchor, "a bib with a verified activity must render as an anchor").toBeTruthy();
        expect(anchor!.getAttribute("target")).toBe("_blank");

        const notice = [...anchor!.querySelectorAll(".sr-only")]
            .filter((el) => el.textContent?.includes(NEW_TAB_NOTICE));
        expect(notice.length, "exactly one new-tab warning per link, or it is announced twice").toBe(1);

        // THE POSITION, which is the whole assertion. `lastElementChild` is what makes
        // appending to strava_name — the implementation this replaced — go red: that puts
        // the warning in the meta row, third in the name, where it warns nobody.
        expect(
            anchor!.lastElementChild?.textContent?.trim(),
            "the warning must be the anchor's last child so it lands at the END of the accessible name; "
            + "inside the meta row it is announced third, before the reader knows what the link is",
        ).toBe(NEW_TAB_NOTICE);

        // AND IT MUST REACH THE TREE. `aria-hidden="true"` here deletes the announcement
        // from the accessibility tree with every assertion above still green — they read
        // textContent and class tokens, neither of which `aria-hidden` touches. Measured:
        // 0 of 17 links announce with the attribute, 3 without it.
        expect(notice[0].getAttribute("aria-hidden"), "an aria-hidden warning announces nothing").toBeNull();
        expect(notice[0].closest('[aria-hidden="true"]'), "and neither may an ancestor hide it").toBeNull();
    });

    it("says nothing on a bib that opens nothing", async () => {
        const doc = await render(unlinked);
        expect(doc.querySelector("a.bib"), "no activity id means no link").toBeNull();
        expect(
            allText(doc).includes(NEW_TAB_NOTICE),
            "a bib with no recording is a plain div and navigates nowhere; warning about a tab it never opens is a lie",
        ).toBe(false);
    });

    it("is conditional on the LINK, not on the state", async () => {
        // An earned bib with no id is a real case, not a hypothetical: Round the Island
        // finishes with no recording. A booked bib with an id would be one too.
        const finishedNoLink = await render(unlinked, "finished");
        const bookedNoLink = await render(unlinked, "booked");
        for (const doc of [finishedNoLink, bookedNoLink]) {
            expect(doc.querySelector("a.bib")).toBeNull();
            expect(allText(doc).includes(NEW_TAB_NOTICE)).toBe(false);
        }
    });
});
