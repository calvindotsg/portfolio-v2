import {readFileSync} from "node:fs";
import {experimental_AstroContainer as AstroContainer} from "astro/container";
import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import Patch from "../src/components/Patch.astro";
import {
    EVENTS, GOAL_YEAR, goalForSport, GOALS, NEW_TAB_NOTICE, PATCHES, raceKm, type RaceEvent,
    type Recording, recordingKm, recordingsOf, type Sport, stravaActivityUrl,
} from "../src/lib/constants";
import {
    bookedAhead, formatPatchDate, patchDateSegments, patchState, type PatchState, patchWall, UPDATED_AT,
} from "../src/lib/projection";
import {iconClass} from "../src/lib/icons";
import {decl, isKeyframeStep, lastDecl, pageCss, parseRules, type Rule, structuralSelector} from "./helpers/css";

/**
 * THE STATE A BIB WEARS, AS A MAP RATHER THAN A BOOLEAN, and it is `Record<PatchState, …>`
 * on purpose: adding a fourth state fails `pnpm check` here until someone says what it is
 * drawn as, which is the only mechanism in this file that cannot be forgotten.
 *
 * `finished` IS `null` BECAUSE IT IS THE UNMARKED CASE — an earned bib wears no state class
 * at all. Spelling that as a name nothing emits would make every assertion below quietly
 * pass on a bib that carries nothing.
 *
 * IT REPLACED A LONE `contains("bib--booked")` IN FOUR PLACES, which was the whole truth
 * while there were two states and went blind the moment there were three: the two UNEARNED
 * states share a treatment, so a DNF mistakenly drawn as `bib--booked` — which is to say, a
 * bib reading "Booked" over a race from 2023 — satisfied every one of them.
 */
const STATE_CLASS: Record<PatchState, string | null> = {
    booked: "bib--booked",
    dnf: "bib--dnf",
    finished: null,
};

/** Every state class a bib can wear, for the sweeps that need to name them all. */
const STATE_CLASSES = Object.values(STATE_CLASS).filter((c): c is string => c !== null);

/** Every state, for the `it.each` sweeps — derived, so a fourth one cannot be left out. */
const ALL_STATES = Object.keys(STATE_CLASS) as PatchState[];

/**
 * THE CLASS TOKENS A BIB OF ONE SPORT AND ONE STATE ACTUALLY WEARS, which is what the colour
 * model below resolves against. Shared rather than spelled out at each call site: the two
 * ratio sweeps and the polarity check each built this list by hand, and each was written as
 * `state === "booked" ? ["bib--booked"] : []` — a conditional that silently returns the
 * FINISHED token set for `dnf`, so every ratio would have been certified against the wrong
 * ground while reporting the right state in its message.
 */
const bibTokensFor = (sport: Sport, state: PatchState): string[] => {
    const cls = STATE_CLASS[state];
    return ["bib", `bib--${sport}`, ...(cls === null ? [] : [cls])];
};

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

// The default fixture is a BOOKED race, and an override that adds `recordings` makes it a
// recorded one. The cast is what lets one builder produce both: a spread over a union cannot
// be verified by the compiler, though every call site below is one legal shape or the other.
//
// IT KEEPS `advertised_km` UNDER EITHER OVERRIDE, and that is now deliberate rather than
// incidental. A recorded race may legitimately carry the organiser's own division beside its
// metres — that pair is what the ledger publishes — so a fixture that dropped the field the
// moment recordings arrived could not exercise the precedence `raceKm` is built on.
const ev = (over: Partial<RaceEvent> = {}): RaceEvent =>
    ({date: "2026-06-01", name: "Fixture", advertised_km: 10, sport: "cycling", country: "Nowhere", ...over}) as RaceEvent;

/**
 * THE LEDGER AS A READER MEETS IT: one entry per row, each carrying whose account it is and
 * that account's own two figures. The heading row is deliberately NOT here — it is chrome,
 * asserted separately, and folding it in would make every row-count assertion read one high.
 *
 * READ BY CLASS AND NOT BY POSITION. A row's three cells are `display: contents`, so the DOM
 * still nests them under `.bib-ledger-row` while the GRID sees nine children — which means an
 * nth-child reading would be measuring the markup and reporting on the drawing. Whether the
 * columns actually line up is a rendered fact and belongs in the browser sweep, not here.
 */
/**
 * THE FIGURES A LEDGER ROW HOLDS. The distance cell also carries the unit that travels with
 * it at the narrowest widths — hidden at every other size, but always in the DOM — so it is
 * left out here and asserted separately below. Reading it as part of the figure would compare
 * `22.45 km` against `22.45` and redden every ledger assertion at once.
 *
 * IT IS TAKEN OUT BY STRUCTURE, NOT BY STRING SURGERY, and the first version did the latter:
 * `cell.textContent.replace(unitText, "")`. That is wrong in two directions at once. It removes
 * the FIRST occurrence of whatever the unit happens to say — so a unit reading `2` would turn
 * `22.45` into `2.45`, a corrupted figure that every ledger assertion then agrees with. And it
 * treats the unit's text as an input rather than as a claim, so a unit saying the WRONG thing
 * is stripped exactly as obediently as one saying the right thing, and disappears from the
 * suite's view entirely.
 *
 * The figure is the cell's OWN text; the unit is a child element. Reading only the direct text
 * nodes says precisely that, cannot corrupt a figure whatever the unit contains, and leaves the
 * unit's text to be pinned on its own terms — which it now is, below.
 */
const kmFigure = (row: Element) => {
    const cell = row.querySelector(".bib-ledger-km");
    if (cell === null) return "";
    return [...cell.childNodes]
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim();
};

const ledgerOf = (doc: {querySelectorAll: (s: string) => Iterable<Element>}) =>
    [...doc.querySelectorAll(".bib-ledger-row")].map((row) => ({
        who: row.querySelector(".bib-ledger-who")?.textContent?.trim() ?? "",
        km: kmFigure(row),
        time: row.querySelector(".bib-ledger-time")?.textContent?.trim() ?? "",
    }));

/**
 * THE DAY A BUILT PAGE WAS DRAWN FOR, read off the page rather than recomputed.
 *
 * Every assertion that compares a rendered wall against `patchWall()` has to hand it a
 * day, and the only correct one is the day that page was built for. Taking the default
 * would take THIS process's day, which is a different thing the moment the artifact is
 * older than the run — routine with SKIP_BUILD=1, and once a night for anyone whose
 * suite straddles Singapore midnight. Both would redden entirely correct code, and the
 * failure would read as a broken wall rather than a stale build.
 *
 * Fails loudly if the meta tag is missing: a page with no build date silently falling
 * back to "today" is the exact bug this helper exists to prevent.
 */
const buildDateOf = (page: string): string => {
    const found = /<meta name="build-date" content="(\d{4}-\d{2}-\d{2})"/.exec(read(page));
    if (found === null) throw new Error(`${page} carries no <meta name="build-date">`);
    return found[1];
};

/**
 * EVERY RENDERED BIB PAIRED WITH THE RACE IT DRAWS, BY POSITION RATHER THAN BY NAME.
 *
 * A race's name was a usable key until the wall became the whole calendar, and the same
 * revision took its uniqueness away: an annual race entered two years running gives two
 * events the same `name`, so `.find()` on it returns the FIRST edition for both bibs and
 * every assertion downstream compares one year's bib against the other year's facts.
 *
 * Measured rather than feared, and NO LONGER HYPOTHETICAL: the back catalogue landed and
 * `EVENTS` now holds more than one edition of the same annual round-island ride. When this was
 * written the collision had to be simulated — a 2025 edition beside the 2026 one reddened
 * two of these tests on data that is entirely correct (`expected 'Booked' to be null` and
 * `expected '121.98' to be '118.50'`), with the messages naming the race twice and unable
 * to say which edition they meant. A red suite BLOCKS THE DEPLOY, so that is a failed
 * production deploy caused by an ordinary data edit: precisely the edit {@link GOAL_YEAR}'s
 * January checklist now asks for, having stopped telling the maintainer to delete last
 * year's races.
 *
 * FIXING IT HERE DID NOT FIX IT EVERYWHERE, which is the part worth carrying forward. The
 * same `.find()`-on-a-name lookup survived in tests/build-output.test.ts's llms.txt row
 * check and went unnoticed until a second edition arrived — a name-keyed lookup is silently
 * wrong rather than absent, so it cannot be found by watching for failures. Grep for the
 * pattern when a display string stops being unique, do not wait for red.
 *
 * POSITION IS NOT A NEW ASSUMPTION. The wall's DOM order IS `patchWall`'s order, bib by
 * bib, and "renders one bib per race, in the wall's order" is the test that says so. This
 * helper is a second reader of that guarantee, not a second guarantee.
 */
const wallBibs = (page: string, sport?: Sport) => {
    const wall = patchWall(sport, buildDateOf(page));
    const bibs = [...parseHTML(read(page)).document.querySelectorAll(".bib")];
    expect(bibs.length, `${page} must render one bib per race`).toBe(wall.length);
    return bibs.map((bib, i) => ({bib, event: wall[i].event, state: wall[i].state}));
};

describe("every link out of the wall names a different destination", () => {
    /**
     * SC 2.4.4: two links with the same name and different destinations are one defect, and
     * this wall is built to produce them. The round-island ride is ANNUAL, so its name repeats
     * down the page — and once a second running of it is recorded in parts, four links carry
     * that one name. The visible text differs (each stub prints its own distance and clock),
     * but a reader listing every link on the page gets the NAME, and the name is what has to
     * disambiguate.
     *
     * READ AS THE READER GETS IT: the whole subtree's text, whitespace collapsed, which is what
     * the accessible name computes to here — no `aria-label` appears anywhere on a bib, by the
     * rule stated in `Patch.astro`. Both link forms are collected, because the two forms
     * disagreeing about whether a date belongs in a name is exactly how this last regressed:
     * the whole-bib anchor opens with the bib's date and the split stub did not.
     */
    it("names every link for the running of the race it belongs to", () => {
        for (const [key, page] of Object.entries(PAGES)) {
            let checked = 0;
            for (const {bib, event} of wallBibs(page, key === "all" ? undefined : key as Sport)) {
                const when = formatPatchDate(event);
                if (when === null) continue;
                for (const link of [...bib.querySelectorAll("a.bib-stub-link"), ...(bib.matches("a.bib") ? [bib] : [])]) {
                    const name = (link.textContent ?? "").replace(/\s+/g, " ").trim();
                    expect(name, `${key}: "${event.name}" link must say which running it is`).toContain(when);
                    checked += 1;
                }
            }
            // NOT `toBeGreaterThan(0)` ON THE PAGE — the running wall holds no linked bib on a
            // day nothing has been recorded, and a floor there is a deploy failure waiting for
            // that day. The floor belongs to the ALL page, which is every race there is.
            if (key === "all") expect(checked, "the wall must hold links to check").toBeGreaterThan(0);
        }
    });

    /**
     * The uniqueness check is kept SEPARATE and it is NOT what catches a missing date — each
     * split stub already prints its own distance and clock, so the four round-island names
     * differ whether or not they say which year. Written as one assertion first, it passed the
     * mutation it was written for. It stays because it guards a different regression (a stub
     * that stops printing its own figures, or a delegated name repeated across bibs), and it
     * is recorded here so nobody reads it as covering the one above.
     */
    it("gives no two links on a page the same name", () => {
        for (const [key, page] of Object.entries(PAGES)) {
            const doc = parseHTML(read(page)).document;
            const names = [...doc.querySelectorAll("a.bib, a.bib-stub-link")]
                .map((a) => (a.textContent ?? "").replace(/\s+/g, " ").trim());
            const seen = new Map<string, number>();
            for (const name of names) seen.set(name, (seen.get(name) ?? 0) + 1);
            expect([...seen].filter(([, n]) => n > 1).map(([name]) => name),
                `${key}: these link names are shared by more than one destination`).toEqual([]);
        }
    });
});

describe("a bib's state is derived from the calendar, never stored", () => {
    it("is finished only once the whole event is behind the build day", () => {
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

    /**
     * THE CASE THE CLOCK COULD NOT EXPRESS, and the reason a recording outranks it.
     *
     * A race run this morning is run. Under `stamp > end` it could not be entered as run
     * until the bot pushed the NEXT day — and if no ride followed, the stamp froze and it
     * stayed an outline indefinitely. Both halves are exercised here: the same-day case,
     * and a clock left two weeks stale.
     */
    it("earns a bib from the recording, on the day of the race and against a frozen clock", () => {
        const run = ev({date: "2026-06-10", elapsed_time: "0:58:26",
            recordings: [{id: "19513789157", metres: 10000, elapsed_time: "0:58:26"}]});
        expect(patchState(run, "2026-06-10"), "the day itself, hours after finishing").toBe("finished");
        expect(patchState(run, "2026-05-27"), "a clock that stopped a fortnight ago").toBe("finished");
    });

    /**
     * BOTH FIELDS, OR THE CLOCK RULES. Each half alone is a thing that can exist before
     * the race does — a time can be typed, and an id can be pasted from a mapping made in
     * advance — so neither alone may draw a solid bib.
     */
    it("takes a half-recording as no recording, leaving the day to decide", () => {
        const timed = ev({date: "2026-06-10", elapsed_time: "0:58:26"});
        const linked = ev({date: "2026-06-10",
            recordings: [{id: "19513789157", metres: 10000, elapsed_time: "0:58:26"}]});
        for (const half of [timed, linked]) {
            expect(patchState(half, "2026-06-10"), `${JSON.stringify(half)} on the day`).toBe("booked");
            expect(patchState(half, "2026-06-11"), "the day after, by the clock as before").toBe("finished");
        }
    });

    /**
     * A recorded race is not "still to ride", so the projection must stop counting it the
     * moment the wall starts calling it earned. This is the same invariant the year-long
     * sweep below enforces across the calendar; pinned here too because the sweep would
     * still pass if BOTH sides forgot, and this one names which side did.
     */
    it("stops booking a recorded race's kilometres, on the day it is run", () => {
        const run = ev({date: "2026-06-10", sport: "running", elapsed_time: "0:58:26",
            recordings: [{id: "1", metres: 10000, elapsed_time: "0:58:26"}]});
        expect(bookedAhead("running", "2026-06-01", [run]), "still ahead by the calendar").toBe(0);
        expect(bookedAhead("running", "2026-06-10", [run]), "the day of the race").toBe(0);
        // The comparison: the same race unrecorded carries the ADVERTISED distance — the only
        // one it can have — and is booked exactly as before. It is built rather than stripped
        // from `run`: a recorded race has no `km` to keep, which is the shape change.
        const plain = ev({date: "2026-06-10", advertised_km: 10, sport: "running"});
        expect(bookedAhead("running", "2026-06-01", [plain]), "no recording, so the clock still books it").toBe(10);
    });

    /**
     * THE ONE STATE THE DATA CANNOT PRODUCE, so it is the one that has to be told — and the
     * ORDER it is asked in is the whole of the risk, not the answer.
     *
     * A DNF looks to every other question on this function exactly like a finished race: it
     * has an elapsed time, it has recordings, and its date is behind the build day. No
     * device models an abandonment — Strava stores the ride it produced like any other — so
     * each branch below `outcome` would resolve one to `finished`, and the bib would print
     * a result the rider did not get. That failure is silent: types check, wall renders,
     * nothing counts wrong. Only this pins it.
     */
    it("calls an abandoned race a dnf, before it asks the recording or the clock", () => {
        const abandoned = ev({
            date: "2026-06-10", outcome: "dnf", elapsed_time: "5:00:00",
            recordings: [{id: "1", metres: 10000, elapsed_time: "5:00:00"}],
        });
        for (const iso of ["1970-01-01", "2026-06-09", "2026-06-10", "2026-06-11", "2030-01-01"]) {
            expect(patchState(abandoned, iso), `${iso}: an abandonment does not become a finish`).toBe("dnf");
        }
        // THE DISCRIMINATOR. Strip the outcome and leave everything else — the same row is
        // `finished` on its recording alone, on the same day. So this pair fails the moment
        // `outcome` stops being asked FIRST, which no assertion about the answer alone can
        // see. A race is not made a DNF by anything it recorded.
        const {outcome: _o, ...recorded} = abandoned;
        expect(patchState(recorded, "1970-01-01"), "the same race without its outcome").toBe("finished");
        // And an abandonment on a race that has not happened is still not a finish — the
        // clock cannot promote it either.
        expect(patchState(ev({date: "2030-01-01", outcome: "dnf"}), "2026-06-10")).toBe("dnf");
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
     * A wall calling the Formosa tour finished while the cycling card is still counting
     * its 1,022 km as booked is the site contradicting itself, and neither figure is
     * obviously the wrong one to a reader.
     *
     * THEY NO LONGER READ ONE CLOCK, and this comment used to say they did ("rendered on
     * two pages a click apart, from one stamp"). Since the clock split, the wall takes
     * `BUILD_DATE` and the goal card's `bookedAhead` takes `UPDATED_AT`. So what this
     * sweep pins is that the two COMPARISONS agree GIVEN THE SAME DAY — it hands both the
     * same `iso` on purpose. The page's own build/stamp gap is a separate, deliberate
     * disagreement, and the reasoning for leaving it alone is above `patchState` in
     * projection.ts. Do not extend this sweep to build/stamp PAIRS expecting agreement.
     *
     * Swept across the whole year rather than at one day: today's date
     * exercises one point on a curve, and the disagreement these two could develop
     * lives at the boundaries — the start day, the days inside a span, the end day.
     *
     * THE SCOPE SPLIT DOES NOT WEAKEN THIS, and the reason is the explicit `[event]`
     * below. A goal card now reads only this year's races (see the scope block in
     * projection.test.ts), so `bookedAhead()` AT ITS DEFAULT would rightly ignore a race
     * from another year while the wall still draws it — an intended difference, not a
     * contradiction, and asserting it away here would forbid the calendar this repo just
     * gained. Handing the function one event at a time asks the question this test is
     * actually about: given a race the card IS counting, do the two agree about whether it
     * has happened? That comparison is the shared one and stays exactly as strong.
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
                // `!== "booked"` RATHER THAN `=== "finished"`, because the question this
                // sweep asks is "has this race happened yet" and there is now more than one
                // way to have happened. A DNF has been ridden — `bookedAhead` skips it on
                // its recording — so spelling this as `=== "finished"` made the invariant
                // claim the projection should still be booking a race from 2023.
                const happened = patchState(event, iso) !== "booked";
                if (happened === contributes) {
                    disagreements.push(
                        `${iso}: the wall calls "${event.name}" ${patchState(event, iso)} `
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
     * default build day would be a hand-counted property of the date, and that day moves
     * every night.
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

    /**
     * THE COMPARATOR'S FIRST LINE, WHICH NO TYPE CAN CHECK AND NO LIVE-DATA SWEEP CAN REACH.
     *
     * `STATE_RANK` is a `Record<PatchState, number>`, so a third state fails `pnpm check`
     * until it is ranked — and ranking `dnf` WITH `finished`, which is what a chronological
     * history wants, is exactly what breaks the sort if the comparator still opens with
     * `a.state !== b.state`. That returns `RANK[a] - RANK[b]`, which for a finished/dnf pair
     * is `0`: an "equal" verdict that never reaches the date comparison, so the two fall
     * back to the order `EVENTS` happens to be typed in. Types green, suite green, and the
     * wall quietly stops sorting.
     *
     * FIXTURE ORDER IS SHUFFLED AND INTERLEAVED ON PURPOSE. Two DNFs on either side of two
     * finishes is the smallest arrangement that a stable sort cannot rescue: with the broken
     * comparator every cross-state pair compares equal and the input order survives.
     */
    it("sorts a dnf into the history run by date, not into a group of its own", () => {
        const mixed: readonly RaceEvent[] = [
            ev({name: "dnf-oldest", date: "2026-01-05", outcome: "dnf"}),
            ev({name: "done-newest", date: "2026-06-14"}),
            ev({name: "dnf-newest", date: "2026-06-01", outcome: "dnf"}),
            ev({name: "done-oldest", date: "2026-02-01"}),
            ev({name: "ahead", date: "2026-09-01"}),
        ];
        expect(patchWall(undefined, MID, mixed).map((p) => p.event.name)).toEqual([
            "ahead", "done-newest", "dnf-newest", "done-oldest", "dnf-oldest",
        ]);
        // The states really are mixed — otherwise the order above would prove nothing about
        // where a DNF sorts, only that dates sort.
        expect(new Set(patchWall(undefined, MID, mixed).map((p) => p.state)))
            .toEqual(new Set(["booked", "finished", "dnf"]));
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
            // TWO RUNS, THREE STATES — so the split is booked against EVERYTHING ELSE, and
            // that is the assertion rather than a convenience. A DNF is history: it sorts by
            // date among the finished bibs, because the run is a chronology and not a
            // ranking of how each race went. Written as `finished` alone, both checks below
            // stay green with every DNF swept to the foot of the page, which is precisely
            // the arrangement this pins against.
            const states = wall.map((p) => p.state);
            const firstHistory = states.findIndex((s) => s !== "booked");
            if (firstHistory !== -1 && states.lastIndexOf("booked") > firstHistory) {
                wrong.push(`${iso}: a booked bib is printed after a race that has already happened`);
            }
            const booked = wall.filter((p) => p.state === "booked").map((p) => p.event.date);
            const history = wall.filter((p) => p.state !== "booked").map((p) => p.event.date);
            if (booked.join() !== [...booked].sort().join()) wrong.push(`${iso}: booked run is not ascending`);
            if (history.join() !== [...history].sort().reverse().join()) {
                wrong.push(`${iso}: history run is not descending`);
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

        const tour = await render(ev({date: "2026-11-07", end_date: "2026-11-15", advertised_km: 1022}));
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
     * after any race on the calendar is run — a red suite blocks the deploy. No count
     * in that sentence either: the wall is the whole back catalogue now, so a number
     * here would have gone stale on the commit that grew it.
     */
    it("renders one bib per race, in the wall's order, in the state the calendar says", () => {
        for (const [key, page] of Object.entries(PAGES)) {
            const sport = key === "all" ? undefined : GOALS.find((g) => g.goal_name.toLowerCase() === key)!.sport;
            const expected = patchWall(sport, buildDateOf(page));
            const bibs = [...parseHTML(read(page)).document.querySelectorAll(".bib")];
            expect(bibs.length, `${page} must render ${expected.length} bibs`).toBe(expected.length);
            bibs.forEach((bib, i) => {
                const {event, state} = expected[i];
                expect(bib.querySelector(".bib-name")?.textContent, `${page} bib ${i} is out of order`).toBe(event.name);
                expect(bib.querySelector("time")?.getAttribute("datetime")).toBe(event.date);
                // Every state class, present or absent, against the one the calendar named
                // — not just `bib--booked`. See STATE_CLASS at the head of this file for
                // what a single-class check stopped being able to see.
                const worn = STATE_CLASSES.filter((c) => bib.classList.contains(c));
                for (const [named, cls] of Object.entries(STATE_CLASS)) {
                    if (cls === null) continue;
                    expect(
                        bib.classList.contains(cls),
                        `${page}: "${event.name}" wears [${worn.join(" ") || "no state class"}] but the calendar `
                        + `says ${state} at the ${UPDATED_AT} stamp, so ${cls} must be `
                        + `${state === named ? "present" : "absent"}`,
                    ).toBe(state === named);
                }
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
     * finished and that floor goes red. A red suite blocks the deploy and the Strava
     * bot pushes unattended at 05:13 SGT, so the first symptom
     * would have been a failed production deploy with nobody watching. Simulated: the
     * suite is green on five future bot pushes and red on 2026-12-07 and 2026-12-31.
     *
     * The replacement is an EQUIVALENCE against the same derivation the page used, so
     * it cannot be vacuous and cannot depend on the date: every bib carries the tag if
     * and only if the calendar calls it booked. The non-vacuity that remains is a
     * property of the fixture, not of the day — there are always events to render.
     *
     * Proving that the treatment can DISTINGUISH one state from another is a separate
     * job, and it belongs to the component rather than to whatever today happens to look
     * like. See the container-rendered test below, which drives every state.
     */
    it("says 'booked' in words on exactly the bibs the calendar calls booked", () => {
        for (const {bib, event, state} of wallBibs(PAGES.all)) {
            const tag = bib.querySelector(".bib-tag")?.textContent?.trim() ?? null;
            expect(
                tag,
                `"${event.name}" (${event.date}) is ${state} at the ${UPDATED_AT} stamp, so its tag must be `
                + `${state === "booked" ? `"${PATCHES.booked_label}"` : "absent"}`,
            ).toBe(state === "booked" ? PATCHES.booked_label : null);
            // THE SECOND UNEARNED STATE SAYS ITS WORD IN A DIFFERENT SLOT, which is why the
            // assertion above stopped being the whole of SC 1.4.1 here. A DNF bib carries no
            // tag, so it satisfies that line by being untagged — exactly as an earned bib
            // does — and the two would be indistinguishable to this test while differing in
            // the one channel that matters. So the word it DOES carry is asserted in the
            // slot it took: the hero, where the distance goes on every other bib.
            expect(
                bib.querySelector(".bib-value")?.textContent?.trim() === PATCHES.dnf_result,
                `"${event.name}" (${event.date}) is ${state} at the ${UPDATED_AT} stamp, so its hero must `
                + `${state === "dnf" ? `read "${PATCHES.dnf_result}"` : `be a distance rather than "${PATCHES.dnf_result}"`}`,
            ).toBe(state === "dnf");
        }
    });

    /**
     * THAT THE TREATMENTS DISTINGUISH THE STATES AT ALL, asked of the component instead
     * of the calendar.
     *
     * Rendering `Patch` directly in every state is the only form of this assertion that
     * is date-independent. Reading it off the built page means the coverage silently
     * depends on the wall happening to hold one of each today — which is exactly the
     * coupling that turned the deploy red above, and it will be false again for the
     * whole of any January before the year's first race, and was false for DNF from the
     * day the state existed until the day a race was entered into it.
     */
    it("gives each of the three states its own words and its own class, whatever the date", async () => {
        const container = await AstroContainer.create();
        // A RACE THIS TEST CONTROLS, NOT `EVENTS[0]`. Forcing a state onto whatever race
        // happens to sit first in the calendar makes this test's meaning depend on how the
        // fixture is ordered: the covered-row assertions below need a race that HAS
        // recordings, and the day someone adds a DNF-with-nothing-recorded to the top of
        // `EVENTS` — a supported shape — this reddens against a component behaving exactly
        // as specified. Picking the first race that carries recordings states the
        // requirement instead of inheriting it.
        const event = EVENTS.find((e) => recordingsOf(e).length > 0)!;
        expect(event, "this test needs a recorded race to force states onto").toBeDefined();
        const rendered = async (state: PatchState) =>
            parseHTML(await container.renderToString(Patch, {props: {event, state}})).document;

        // EVERY STATE IS RENDERED HERE, and this is the ONLY place that is guaranteed. The
        // built-page assertions above compare against whatever the calendar says today, so
        // their coverage of any one state lasts exactly as long as a race is in it — the
        // wall held no DNF at all until one was entered, and holds no booked bib from the
        // morning after the last race of a year. Driving the component directly is what
        // makes the three-way distinction a property of the code rather than of the date.
        for (const state of Object.keys(STATE_CLASS) as PatchState[]) {
            const doc = await rendered(state);
            const bib = doc.querySelector(".bib")!;
            for (const [named, cls] of Object.entries(STATE_CLASS)) {
                if (cls === null) continue;
                expect(bib.classList.contains(cls), `a ${state} bib and ${cls}`).toBe(state === named);
            }
        }

        const dnf = await rendered("dnf");
        expect(dnf.querySelector(".bib-tag"), "a DNF says its word in the hero, so it takes no tag").toBeNull();
        expect(dnf.querySelector(".bib-value")?.textContent?.trim()).toBe(PATCHES.dnf_result);
        expect(dnf.querySelector(".bib-unit"), "a verdict is not a quantity, so it takes no unit").toBeNull();
        expect(ledgerOf(dnf), "an abandoned race's own account is a ledger row like any other")
            .toContainEqual({who: PATCHES.recorded_row, km: raceKm(event).toFixed(2), time: event.elapsed_time ?? ""});
        // The abbreviation is expanded for a listener and for nobody else — the repo's rule
        // is that the accessible name is a SUPERSET of the visible text, never a
        // replacement, so this must be present AND must not have leaked onto the bib.
        expect([...dnf.querySelectorAll(".sr-only")].map((s) => s.textContent?.trim()))
            .toContain(PATCHES.dnf_name);
        expect(dnf.querySelector(".bib-value")?.textContent, "the expansion must stay outside the hero")
            .not.toContain(PATCHES.dnf_name);

        // THE ROW NAME IS THE SAME WORD FOR EVERY SPORT, and this is the only form of that
        // assertion that is not a tautology. Asserting the render matches
        // `PATCHES.recorded_row` proves the component reads the constant and says nothing
        // about the constant's VALUE — it stays green with a cycling verb back in it, which
        // is the defect that shipped once. Comparing the two sports' rendered labels to EACH
        // OTHER cannot: any per-sport lookup, and any sport-conditional branch in the
        // component, separates them. `outcome` sits on the shared event shape, so a running
        // DNF is data the type already permits and the wall would otherwise call a run a ride.
        // WITH RECORDINGS, for the same reason the event above is chosen rather than taken:
        // the row exists only when there is something to report, so a sport whose first race
        // happens to be a DNF-with-nothing-recorded would compare a real label against
        // `undefined` and read as two sports disagreeing about the word.
        const bySport = await Promise.all(GOALS.map(async ({sport}) => {
            const one = EVENTS.find((e) => e.sport === sport && recordingsOf(e).length > 0);
            if (one === undefined) throw new Error(`no recorded ${sport} event to render`);
            const doc = parseHTML(await container.renderToString(Patch, {props: {event: one, state: "dnf"}})).document;
            return ledgerOf(doc).at(-1)?.who;
        }));
        expect(new Set(bySport).size, `every sport's DNF bib says the same word, got ${bySport.join(" / ")}`)
            .toBe(1);
        expect(bySport[0]).toBe(PATCHES.recorded_row);

        /*
         * AND THE ROW'S TWO CELLS ARE INDEPENDENTLY CONDITIONAL, which is the guard the
         * ledger inherited from the row it replaced and then had to make finer.
         *
         * THE DISTANCE CELL NEEDS METRES. `raceKm` falls back to the ADVERTISED figure where
         * there are none — the Formosa tour carries 1022.00 having never been ridden — so a
         * DNF the owner remembers without a recording would otherwise have its bib claim he
         * covered the whole route under a row headed `Recorded`. That is the one assertion
         * this whole treatment exists to stop a bib making.
         *
         * THE CLOCK CELL NEEDS ONLY A TIME, and separating the two is what the ledger added.
         * A race remembered with a finishing time and no file has a real clock and no honest
         * distance, and the old pair of rows got that right by accident — they were two
         * elements. Collapsing them into one row is exactly where a blanket
         * `recordings.length > 0` guard would have silently deleted a true figure.
         *
         * ALL THREE COMBINATIONS, or the assertion cannot tell a component that drops a cell
         * from one that never had it.
         */
        const dnfBib = async (over: Record<string, unknown>) => parseHTML(await container.renderToString(
            Patch, {props: {event: ev({outcome: "dnf", ...over}), state: "dnf"}})).document;

        const remembered = await dnfBib({recordings: undefined});
        expect(remembered.querySelector(".bib-value")?.textContent?.trim(),
            "a remembered DNF still prints the verdict").toBe(PATCHES.dnf_result);
        expect(remembered.querySelector(".bib-ledger"),
            "a DNF with no recording and no time has no account to report, so it prints no ledger").toBeNull();

        const timedOnly = await dnfBib({recordings: undefined, elapsed_time: "2:00:00"});
        expect(ledgerOf(timedOnly), "a remembered time is real; the advertised distance beside it is not")
            .toEqual([{who: PATCHES.recorded_row, km: "", time: "2:00:00"}]);

        const recorded = await dnfBib({recordings: [{id: "1", metres: 12500, elapsed_time: "1:00:00"}], elapsed_time: "1:00:00"});
        expect(ledgerOf(recorded), "a recorded DNF prints what was covered and how long it took")
            .toEqual([{who: PATCHES.recorded_row, km: "12.50", time: "1:00:00"}]);

        /*
         * A BOOKED BIB HAS NO LEDGER AT ALL, and a finished one has the same row an abandoned
         * one has. The state does not change the ledger's SHAPE — only the hero above it —
         * which is the claim that let two of the four grid templates be deleted.
         */
        for (const other of ["booked", "finished"] as const) {
            const doc = await rendered(other);
            expect(doc.querySelector(".bib-value")?.textContent, `a ${other} bib prints no verdict`)
                .not.toContain(PATCHES.dnf_result);
            if (other === "booked") {
                expect(doc.querySelector(".bib-ledger"), "a race that has not happened has nothing to report").toBeNull();
            } else {
                expect(ledgerOf(doc), "a finished bib's ledger is the DNF bib's, row for row")
                    .toEqual(ledgerOf(dnf));
            }
        }

        // Selected by CLASS, not by element name — the bib is not the list item, the cell
        // wrapper is. Everything else in this file was already class-based, which is what
        // kept the change that made the bib a plain `div` again to one component.
        const booked = await rendered("booked");
        expect(booked.querySelector(".bib-tag")?.textContent?.trim()).toBe(PATCHES.booked_label);
        expect(booked.querySelector(".bib")?.classList.contains("bib--booked")).toBe(true);

        const finished = await rendered("finished");
        expect(finished.querySelector(".bib-tag"), "a finished bib is the unmarked case").toBeNull();
        expect(finished.querySelector(".bib")?.classList.contains("bib--booked")).toBe(false);
    });

    /**
     * EVERY DESTINATION IS A LINE ON THE STUB, AND THE BIB IS NEVER THE ANCHOR. Asserted from
     * the built page because the shape only exists there.
     *
     * THE BIB USED TO BE A LINK where a race had exactly one recording, and the assertion
     * this replaces was a three-way split on how many there were: none, one (the whole box),
     * more than one (the stub). What killed that is a second KIND of destination — a race can
     * have a published results sheet as well as a file, anchors do not nest, and one of the
     * two would have had to sit inside the other. So the count no longer chooses the shape,
     * and the only remaining question is whether there is anywhere to go at all.
     *
     * CONDITIONAL ON THE DESTINATIONS, NOT ON THE STATE. `recordings` is optional, so a
     * finished race without one must render as an ordinary finished bib — the branches below
     * are all real cases rather than a happy path and a guard. Driven from EVENTS, so a race
     * added with or without a recording joins whichever branch it belongs to, and no branch is
     * pinned to a named race: this note used to cite one that has since been recorded.
     *
     * THE EXPECTED LINES ARE BUILT HERE FROM THE ROW'S OWN FIELDS rather than read back off
     * the page, and the ORDER is asserted rather than the set. The results sheet goes first
     * because it is the one a logged-out reader can follow; a check that accepted any order
     * would be green on the arrangement this feature exists to avoid.
     */
    it("puts every destination on the stub, in the order a stranger can use them", () => {
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
        // A red suite BLOCKS THE DEPLOY, so either failure is a failed production deploy
        // triggered by ordinary data entry.
        //
        // The loops below need no floor. Each covers every race on the wall — not the subset —
        // and asserts the equivalence in BOTH directions per race, so they are vacuous only if
        // EVENTS is empty, which is what the one guard that IS safe checks.
        expect(EVENTS.length, "EVENTS is empty, so every loop below is vacuous").toBeGreaterThan(0);

        for (const {bib, event} of wallBibs(PAGES.all)) {
            const parts = recordingsOf(event);
            const url = event.official?.url;

            // THE BASE URL IS WRITTEN OUT HERE, and the duplication is the point. Comparing the
            // built href against `stravaActivityUrl(part)` alone compares the page to the very
            // function that produced it: mistype the constant and every bib ships a 404 with the
            // suite green and `pnpm check` silent — verified by mutating the base and watching
            // 256/256 pass. The literal is the only thing in the build that can disagree with it.
            // A results URL takes no such treatment: it is stored whole, so there is no
            // construction to disagree with.
            const expected = [
                ...(url === undefined ? [] : [{href: url, says: [PATCHES.official_link, event.name]}]),
                ...(parts.length === 1
                    ? [{href: stravaActivityUrl(parts[0]), says: [PATCHES.strava_name, event.name]}]
                    : parts.map((part) => ({
                        href: `https://www.strava.com/activities/${part.id}`,
                        // THE LINE MUST PROMISE WHAT IT DELIVERS. A split bib's hero is the
                        // SUMMED distance and its ledger row the whole span, so a link that
                        // named neither would send a reader to smaller figures than the bib
                        // showed them — the mismatch the stub exists to close.
                        says: [recordingKm(part).toFixed(2), part.elapsed_time, event.name],
                    }))),
            ];

            expect(bib.tagName.toLowerCase(), `${event.name}: no bib is ever the anchor`).not.toBe("a");

            if (expected.length === 0) {
                expect(bib.querySelector(".bib-stub"),
                    `${event.name} has nowhere to go, so it grows no stub`).toBeNull();
                continue;
            }

            const lines = [...bib.querySelectorAll(".bib-stub-link")];
            expect(lines.map((a) => a.getAttribute("href")),
                `${event.name} must list every destination it has, sheet first`)
                .toEqual(expected.map((e) => e.href));
            if (parts.length === 1) expect(lines.at(-1)?.getAttribute("href")).toBe(stravaActivityUrl(parts[0]));

            for (const [i, line] of lines.entries()) {
                expect(line.tagName.toLowerCase(), "each stub line is its own link").toBe("a");
                expect(line.getAttribute("target"), "matching Now.astro and IntroCard.astro").toBe("_blank");
                expect(line.getAttribute("rel"), "this site uses a bare target and lets the browser imply noopener; "
                    + "introducing rel on one link out of three makes the convention look accidental").toBeNull();
                expect(line.getAttribute("aria-label"),
                    "an aria-label would REPLACE the name; the sr-only spans EXTEND it").toBeNull();

                // The accessible name is name-from-content, so it is a superset of what is on
                // screen. The race has to be in it, or a reader listing every link on the page
                // cannot tell which wall entry it belongs to.
                const name = (line.textContent ?? "").replace(/\s+/g, " ").trim();
                for (const said of [...expected[i].says, NEW_TAB_NOTICE]) {
                    expect(name, `${event.name} stub line ${i + 1} must announce "${said}"`).toContain(said);
                }
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
        // 320px viewport, and it had been doing so since it was written. A stub line is the same shape
        // again ("Strava" and "RESULT" do not break).
        //
        // Both are outside the WCAG 1.4.4 bracket, which tops out at a 32px root, so neither is
        // a conformance failure — which is presumably how two passes over that file walked past
        // the tag. The ink still lands on the card at 1.045:1 and is lost.
        //
        // TWO ESCAPERS ARE DELIBERATELY NOT IN THIS LIST, and naming them is the point — a list
        // that silently omits known instances is the failure this comment is about. Measured on
        // both trees at 320px: `.bib-word` ("Ride"/"Run") escapes 9.22px at a 44px root and
        // 38.84 at 48, and the `<time>` element inside `.bib-date` escapes 6.91 at 48. Both are
        // pre-existing, both are unchanged by this branch, and neither is fixed here because the
        // remedy is not free the way it is for the four above: `anywhere` on a three-letter sport
        // word breaks it mid-word ("Ri/de"), which is a legibility trade rather than a fix, and
        // that is the owner's call. Recorded, not smuggled in.
        // `bib-stub-link` joins them: its tokens are a label, a distance and a clock, the same
        // unbreakable shape as the row measured escaping from a 42px root.
        //
        // `bib-ledger` REPLACES `bib-time` AND `bib-covered` AND IS CHECKED ONCE, which is a
        // real narrowing of what this loop reads and is why it is written down. Those were two
        // elements with a rule each; the ledger is one element whose CELLS carry the tokens —
        // `OFFICIAL`, `21.10`, `3:30:59` — and `overflow-wrap` inherits, so declaring it on the
        // container covers every cell including ones no fixture has produced yet. The risk this
        // trades away is a future cell rule that overrides it locally, which no cell rule below
        // does and which this loop could not see in any case: it reads the declaration, not the
        // rendered box. The browser sweep is what measures the ink.
        for (const cls of ["bib-ledger", "bib-place", "bib-tag", "bib-stub-link"]) {
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
        // EVERY `.bib-cell` RULE, not the first one. `.find` asked which rule comes first in
        // the sheet and then asked IT for `display` — so the day a second `.bib-cell` rule was
        // added anywhere earlier (the shared entrance cascade in BasicLayout.astro is one), a
        // correct `display: grid` further down became invisible and this reddened on a page
        // that was fine. The property is "the cell is declared a grid SOMEWHERE", and the
        // cascade is what the browser reads, so the search has to span the sheet.
        const rules = parseRules(pageCss(PAGES.all)).filter((r) => r.selectors.some((sel) => /\.bib-cell\b/.test(sel)));
        expect(rules.length, "the cell must ship a rule — without one it is an inert wrapper").toBeGreaterThan(0);
        const displays = rules.map((r) => decl(r.body, "display")).filter(Boolean);
        expect(displays, "the cell must stretch its bib to the row's height").toContain("grid");
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
     * a red suite BLOCKS THE DEPLOY, so that failure is a failed production deploy
     * triggered by ordinary data entry. The loop covers every race on the wall and both
     * branches per race, so it is vacuous only if EVENTS is empty — the one guard that is safe.
     */
    it("gives every stub line a label a reader can see, and a glyph with a real rule", () => {
        const doc = parseHTML(read(PAGES.all)).document;
        expect(EVENTS.length, "EVENTS is empty, so the loop below is vacuous").toBeGreaterThan(0);

        for (const {bib, event} of wallBibs(PAGES.all)) {
            const lines = [...bib.querySelectorAll(".bib-stub-link")];
            if (lines.length === 0) {
                expect(bib.querySelector(".bib-stub"), `${event.name} has nowhere to go and grows no stub`).toBeNull();
                continue;
            }

            for (const line of lines) {
                // THE POINT OF THE WHOLE CHANGE THAT PRECEDED THIS ONE: the words are ON SCREEN,
                // in their own span rather than behind an sr-only one. Read the way a reader
                // gets it — clone, strip the hidden subtrees, and take what is left. Asserted
                // this way because the arrangement that shipped once, and that two reviewers
                // could not see, satisfied every clause of a check written the other way round.
                const seen = line.cloneNode(true) as Element;
                for (const hidden of [...seen.querySelectorAll(".sr-only")]) hidden.remove();
                const visible = (seen.textContent ?? "").replace(/\s+/g, " ").trim();
                expect(visible.length,
                    `${event.name}: a stub line with no words a reader can see is a 7.5x10px glyph, which is `
                    + "the affordance two reviewers could not find").toBeGreaterThan(0);
                expect(line.querySelector(".bib-stub-label")?.textContent?.trim(),
                    "the label is its own element, so the sweep can measure it").toBeTruthy();

                // THE GLYPH NAMES THE DESTINATION AND MUST HAVE A RULE. An icon class UnoCSS
                // never generated renders as a mask box at zero size — correct markup, no icon,
                // nothing red — which is why `official_icon` had to become a PATCHES field.
                const glyph = line.querySelector(".bib-stub-mark");
                expect(glyph, `${event.name}: every stub line keeps its mark`).toBeTruthy();
                expect(glyph?.getAttribute("aria-hidden"),
                    "the glyph is decorative: the words say what the mark used to have to").toBe("true");
                const token = [...(glyph?.classList ?? [])].find((c) => c.startsWith("i-"));
                expect(token, "the mark must wear an icon class").toBeTruthy();
                expect(pageCss(PAGES.all), `${token} has no rule, so it ships as a mask box at zero size`)
                    .toContain(`.${token}`);
            }

            // AND THE RESULTS SHEET IS FIRST WHERE THERE IS ONE. Asserted here as well as by
            // href order above, because this is the half a reader actually meets: the visible
            // words, in the order they are read.
            if (event.official?.url !== undefined) {
                expect(lines[0].querySelector(".bib-stub-label")?.textContent?.trim(),
                    `${event.name} publishes a result, and it is the one link a logged-out reader can follow`)
                    .toBe(PATCHES.official_link);
            }
        }

        // The marks that USED to carry this are gone, and so are their rules. Left behind, the
        // orphan gate in build-output.test.ts would fail the build — but only if the rules went
        // too, and a stray element with no rule fails nothing at all. This is the half that
        // catches a half-finished revert.
        for (const dead of [".bib-strava", ".bib-go"]) {
            expect(doc.querySelector(dead),
                `${dead} must not come back alongside the stub — one affordance, one place`).toBeNull();
        }
    });

    /**
     * A STUB LINE MUST NOT BE DRAWN LIKE THE CAPTIONS AROUND IT, and it must not be drawn like a
     * web link either. Both halves are the assertion; the second was added after the first
     * revision got it wrong.
     *
     * The ledger sits immediately above the stub in the same 10px uppercase letterspaced idiom,
     * and several lines on the bib — the date, the tag, the ledger's captions, the place —
     * share `opacity: 0.8`. A line that joined that group would be a control drawn exactly like
     * the captions around it, which is this change's defect re-committed one element down.
     *
     * The other way to get it wrong is to reach for the site's TEXT-LINK idiom. A bib is a
     * printed artifact whose every row is undecorated, so a rule under the words is foreign
     * vocabulary here. That is asserted rather than merely commented, because it was shipped
     * once and only caught by eye.
     *
     * A STUB LINE IS DIMMED AS A WHOLE AND ITS LABEL IS NOT, WHICH IS NOT THE CAPTION CASE. The
     * line carries `opacity: 0.8` on the anchor — where the retired action row carried full ink
     * — and that is a deliberate difference recorded rather than smuggled: it is a run of small
     * type inside an inverted face, and the composited-contrast sweep below holds it to the
     * text floor in every state and both themes. What must NOT happen is the LABEL being dimmed
     * again on top of that, which would composite twice.
     */
    it("draws a stub line as a bib annotation — not as a caption, and not as a web link", () => {
        const rules = parseRules(pageCss(PAGES.all));
        const owned = rules.filter((r) => r.selectors.some((s) => /\.bib-stub-link\b/.test(s)));
        expect(owned.length, "no .bib-stub-link rules — this assertion would be vacuous").toBeGreaterThan(0);

        const weight = owned.map((r) => decl(r.body, "font-weight")).find((v) => v !== undefined);
        expect(Number(weight ?? 400),
            "a stub line must carry the bib's emphatic weight — it is what separates a control from the "
            + "captions once the decoration is (correctly) gone").toBeGreaterThanOrEqual(700);

        for (const r of rules.filter((x) => x.selectors.some((s) => /\.bib-stub-label\b/.test(s)))) {
            const o = decl(r.body, "opacity");
            expect(o === undefined || Number(o) >= 1,
                `${r.selectors.join(",")} dims the label to ${o} on a line that is already dimmed — the `
                + "two alphas composite and the control lands under the captions it sits beside").toBe(true);
        }

        // BOTH SPELLINGS, and that is not defensiveness: the minifier collapses a
        // `text-decoration` pair into the shorthand, while the `text-link` shortcut emits
        // `text-decoration-line`. A gate matching one spelling would miss the other.
        for (const r of rules.filter((x) => x.selectors.some((s) => /\.bib-stub(-link|-label)?\b/.test(s)))) {
            const v = decl(r.body, "text-decoration") ?? decl(r.body, "text-decoration-line");
            expect(v === undefined || !/underline/i.test(v),
                `${r.selectors.join(",")} rules a stub line's text. The bib is a printed artifact `
                + "with no decorated rows, so a rule here imports web vocabulary into a paper one").toBe(true);
        }
    });

    /**
     * EVERY ACCOUNT OF A RACE IS A LEDGER ROW, AND NO ROW MIXES TWO OF THEM. That is the whole
     * property: a reader who divides the two figures on a line gets a speed the instrument that
     * produced them would recognise.
     *
     * IT REPLACES A LABELLED ELAPSED ROW, and the reason the label existed is the reason the
     * rows are named now. Elapsed and moving are far apart on these rides — 8:32:05 against
     * 5:03:55 over the same 140.49 km — so a bare time invites a reader to divide it into
     * whatever distance is nearest and be 11 km/h wrong (16.5 against 27.7). Naming the source
     * is strictly stronger than naming the clock, because it also rules out dividing an
     * organiser's distance into a watch's time.
     *
     * THE EXPECTED ROWS ARE BUILT FROM THE EVENT'S OWN FIELDS, in order, and compared whole. A
     * per-row `toContain` would be green on a bib that printed the official time against the
     * recorded distance, which is the single failure this device exists to prevent.
     */
    it("gives each account of a race its own ledger row, and mixes none of them", () => {
        // Same reasoning as the link test above: no floor on the filtered subset. The loop
        // below covers every branch per race and is vacuous only if EVENTS is.
        expect(EVENTS.length, "EVENTS is empty, so the loop below is vacuous").toBeGreaterThan(0);

        for (const {bib, event, state} of wallBibs(PAGES.all)) {
            const official = event.official;
            const clock = official?.net_time ?? official?.gun_time;
            const expected = state === "booked" ? [] : [
                ...(official === undefined ? [] : [{
                    who: PATCHES.official_row,
                    km: (event.advertised_km ?? NaN).toFixed(2),
                    time: clock ?? "",
                }]),
                ...(recordingsOf(event).length > 0 || event.elapsed_time !== undefined ? [{
                    who: PATCHES.recorded_row,
                    km: recordingsOf(event).length > 0 ? raceKm(event).toFixed(2) : "",
                    time: event.elapsed_time ?? "",
                }] : []),
            ];

            expect(ledgerOf(bib), `${event.name} (${state}) ledger`).toEqual(expected);
            if (expected.length === 0) {
                expect(bib.querySelector(".bib-ledger"),
                    `${event.name} has no account to report, so it prints no ledger at all`).toBeNull();
                continue;
            }

            // THE UNIT IS STATED ONCE, IN THE COLUMN IT GOVERNS. Repeating it on every figure
            // was built first and does not fit — see `time_head` in constants.ts. The distance
            // heading comes from the GOAL, so it cannot disagree with the hero's sideways unit.
            const head = [...bib.querySelectorAll(".bib-ledger-head span")].map((s) => s.textContent?.trim());
            expect(head, `${event.name} heading row`)
                .toEqual(["", goalForSport(event.sport).measurable_unit, PATCHES.time_head]);

            /*
             * AND THE OTHER CARRIER SAYS THE SAME WORD. The heading above has been pinned since
             * the ledger was built; the inline unit that REPLACES it at the narrowest widths was
             * pinned to nothing at all — it could have said `mi`, or `2`, or nothing, on the one
             * arm where it is the only statement of the unit a reader gets.
             *
             * IT WAS INVISIBLE FOR A REASON WORTH RECORDING: the helper that reads a ledger row
             * used to strip the unit's text from the figure by string replacement, so whatever
             * the unit said was removed before anything compared it to anything. A gate that
             * consumes a value in order to ignore it will never be the gate that checks it.
             *
             * EVERY row that prints a distance carries one, and a row printing no distance
             * carries none — a bare unit beside nothing is a caption for an absence.
             */
            const rows = [...bib.querySelectorAll(".bib-ledger-row")];
            for (const [i, row] of rows.entries()) {
                const unit = row.querySelector(".bib-ledger-unit");
                if (expected[i].km === "") {
                    expect(unit, `${event.name} row ${i} prints no distance, so it owes no unit`).toBeNull();
                    continue;
                }
                expect(unit?.textContent?.trim(), `${event.name} row ${i}: the unit travelling with `
                    + "the figure must say what the heading it stands in for says")
                    .toBe(goalForSport(event.sport).measurable_unit);
            }
        }
    });

    /**
     * THE LEDGER'S SLACK GOES AFTER THE ROW'S NAME, NEVER BETWEEN ITS TWO FIGURES.
     *
     * WRITTEN BECAUSE THE SUITE COULD NOT SEE THE DEFECT AND A READER COULD, IMMEDIATELY. The
     * first build put the flexible track in the middle (`auto 1fr auto`), which strands the
     * clock at the bib's right-hand edge on any bib wider than the ledger's content: measured
     * on a 390px viewport, where the wall gives a bib the full 324px, the ink gap between
     * `160.56` and `10:56:17` was **127.4px** against 5.5px everywhere else. Every assertion in
     * this file was green. The owner spotted it on a phone.
     *
     * IT IS A CORRECTNESS PROPERTY AND NOT A TASTE ONE, which is why it is gated rather than
     * left to review. The ledger's whole claim is that one row carries ONE source's distance
     * beside that SAME source's clock — see `official_row` in constants.ts — and a 127px rift
     * between exactly those two figures argues the opposite of the thing the row exists to say.
     * A gap after the row's NAME has no such problem: a leader rail between a key and its
     * figures is what a results sheet already does.
     *
     * AND THE FIGURE TRACKS MUST CARRY A ZERO MINIMUM. A bare `auto` minimum is the content's
     * MIN-CONTENT size, which an unbreakable token like `10:09:34` cannot go below however the
     * text is allowed to wrap — so the track holds the grid wider than the bib and the ink
     * paints on the card at 1.045:1, unreadable rather than absent, and `.bib` does not clip so
     * no sweep that walks clipping ancestors sees it. Measured at 320px: +3.52px past the
     * border box from a 44px root and +4.61px at 48, against 39.39px INSIDE with the floor
     * removed. `overflow-wrap` alone does not fix it; the two are a pair.
     *
     * READ FROM THE SHIPPED SHEET, because the source is not what the browser parses.
     */
    it("puts the ledger's slack after the row's name, and lets its figure tracks shrink", () => {
        const rules = parseRules(pageCss(PAGES.all))
            .filter((r) => r.selectors.some((s) => /\.bib-ledger\b/.test(s)));
        const tracks = rules.map((r) => decl(r.body, "grid-template-columns")).find((v) => v !== undefined);
        expect(tracks, "the ledger must declare its columns — without them there is no table").toBeTruthy();

        // Split on top-level spaces: `minmax(0, auto)` carries one of its own.
        const cols: string[] = [];
        let depth = 0, cur = "";
        for (const ch of tracks!) {
            if (ch === "(") depth++;
            if (ch === ")") depth--;
            if (ch === " " && depth === 0) { if (cur) cols.push(cur); cur = ""; continue; }
            cur += ch;
        }
        if (cur) cols.push(cur);
        expect(cols.length, `three columns: source, distance, clock — got ${tracks}`).toBe(3);

        const flexible = cols.map((c, i) => /(^|[(,\s])[\d.]*fr\b/.test(c) ? i : -1).filter((i) => i >= 0);
        expect(flexible, `only the FIRST track may be flexible, or the slack lands between a source's `
            + `distance and that source's own clock. Got "${tracks}"`).toEqual([0]);

        for (const i of [1, 2]) {
            expect(cols[i], `track ${i + 1} holds an unbreakable figure, so it needs a zero minimum — `
                + `a bare "auto" cannot shrink below min-content and pushes the ink onto the card`)
                .toMatch(/^minmax\(\s*0\s*,/);
        }

        /*
         * AND THE CLOCK COLUMN MUST BE SEPARATED FROM THE DISTANCE BY MORE THAN THE GAP.
         *
         * Grouping the two figures fixed the rift and created its opposite: `160.56` and
         * `10:56:17` are both tabular, both 800, both 10px, and at the ledger's own column gap
         * they read as ONE run of digits. Reported by the owner within minutes of the first
         * build. A distance and a clock are different fields and the drawing has to say so.
         *
         * ASSERTED AS "MORE THAN THE GAP", NOT AS A NUMBER, because the number is a rendered
         * fact and this test reads a stylesheet. What is checkable here is the PROPERTY: the
         * clock column carries separation of its own, on top of whatever the gap gives every
         * column. Deleting the padding — the way this defect would return — makes the two
         * quantities equal and reddens this.
         */
        // BOTH SPELLINGS, and it is not defensiveness — it is what the build actually emits.
        // The source declares `row-gap` and `column-gap`; the minifier collapses the pair into
        // the `gap` shorthand, ROW FIRST, so a gate reading only the longhand asks the built
        // sheet for a property that is not in it and fails on correct code. This file records
        // the same trap for `text-decoration`.
        // UNCONDITIONAL RULES ONLY, on both sides of the comparison. The ledger's narrow arms
        // set this same padding to zero (a clock alone on a line has no distance to be told
        // apart from), and `parseRules` returns an at-rule's children as ordinary rules
        // carrying an `at`. Source order happens to put the base rule first today, so a bare
        // `.find()` reads 1.4em — but it would read the arm's 0 the moment the sheet is
        // reordered, and fail on correct code. What this gate is about is the UNCONDITIONAL
        // separation, so it asks for exactly that.
        const gapDecl = rules.filter((r) => r.at === "")
            .map((r) => decl(r.body, "column-gap") ?? decl(r.body, "gap"))
            .find((v) => v !== undefined);
        expect(gapDecl, "the ledger must declare a column gap").toBeTruthy();
        const parts = gapDecl!.trim().split(/\s+/);
        const gap = parts.length > 1 ? parts[1] : parts[0];
        const padRules = parseRules(pageCss(PAGES.all))
            .filter((r) => r.at === "" && r.selectors.some((s) => /\.bib-ledger-time\b/.test(s)));
        const pad = padRules.map((r) => decl(r.body, "padding-left")).find((v) => v !== undefined);
        const em = (v: string | undefined) => Number.parseFloat(v ?? "0");
        expect(em(pad), `the clock column needs air of its own — at the gap alone (${gap}) a distance `
            + "and a clock in the same weight, size and tabular figures read as one run of digits")
            .toBeGreaterThan(em(gap));

        // AND THE HEADING TAKES THE SAME PADDING, or it stops sitting over its column.
        const headPad = parseRules(pageCss(PAGES.all))
            .filter((r) => r.selectors.some((s) => /\.bib-ledger-time-head\b/.test(s)))
            .map((r) => decl(r.body, "padding-left")).find((v) => v !== undefined);
        expect(headPad, "the clock heading must move with its column").toBe(pad);

        // AND THE HEADING'S OWN RULE IS READ UNCONDITIONALLY TOO, for the reason above.
    });

    /**
     * THE LEDGER MUST REFLOW ON THE BIB'S OWN WIDTH, AND THE CONDITION MUST BE FONT-RELATIVE.
     *
     * WHAT THIS CATCHES. `overflow-wrap: anywhere` and `minmax(0, auto)` above are a pair that
     * turns an overflow into a break — which is what keeps the clock off the card, and is also
     * a licence for the leader track to be squeezed to nothing. Measured on the shipped wall at
     * a 32px root, the size WCAG SC 1.4.4 requires the page to survive: a 390px phone gave the
     * bib 260px and `RECORDED` rendered as EIGHT STACKED SINGLE LETTERS. 280 wrapped cells
     * across ten viewports and five root sizes, with the whole suite green and no ink escaping
     * any bib — because the failure is legibility, and the sweep that passed this design was
     * measuring containment. A containment measurement cannot see this class at all.
     *
     * WHY `em` IS THE ASSERTION AND NOT A NUMBER. The broken widths STRADDLE the healthy ones
     * in px — 320px at a 16px root is fine at 254px while 375px at 32px is broken at 245px, and
     * a 490px tablet band is broken at 208px — so no pixel threshold separates them. Divided by
     * the reader's own root size the two sets separate cleanly: everything at or under 13.08em
     * wrapped, everything at or over 13.63em did not. A px-valued query would therefore be
     * either a no-op or a false positive, and it would also stop moving when the reader
     * enlarges the text, which is the one thing this rule exists to respond to.
     *
     * WHAT IS NOT ASSERTED HERE. The rendered result. This file reads a stylesheet, so what is
     * checkable is the PROPERTY — the arms exist, they key on the bib's inline size, their
     * thresholds are font-relative, and the row's name is what gives way. The figures are
     * re-swept in a browser when this area changes; the numbers above are that sweep.
     */
    it("reflows the ledger on the bib's own width, in units that follow the reader's text", () => {
        const rules = parseRules(pageCss(PAGES.all))
            .filter((r) => r.selectors.some((s) => /\.bib-ledger/.test(s)) && r.at !== "");

        const arms = [...new Set(rules.map((r) => r.at))].filter((a) => /@container/.test(a));
        expect(arms.length, "the ledger must reflow on the bib's own inline size — at the "
            + "reader's 200% the three-column form shatters `RECORDED` into single letters")
            .toBeGreaterThan(0);

        // BOTH SPELLINGS, and it is what the build actually emits rather than defensiveness.
        // The source declares `(max-width: 14em)` and the minifier rewrites it to the range
        // form `(width<=14em)`. A gate written against the source spelling asks the shipped
        // sheet for text that is not in it and fails on correct code — the same trap this file
        // records for the `gap` shorthand and for `text-decoration`.
        for (const at of arms) {
            expect(at, `"${at}" must key on the container's WIDTH`).toMatch(/max-width|width\s*<=/);
            const value = /(?:max-width\s*:|width\s*<=)\s*([\d.]+)(\w+)/.exec(at);
            expect(value, `"${at}" must carry a readable width threshold`).toBeTruthy();
            expect(value![2], `"${at}" must be font-relative. A pixel threshold cannot express `
                + "this condition — the broken bib widths straddle the healthy ones in px — and "
                + "it would stop moving when the reader enlarges the text, which is the only "
                + "thing this rule responds to")
                .toMatch(/^r?em$/);
        }

        // THE ROW'S NAME IS WHAT GIVES WAY, and it must give way to a WHOLE row: spanning only
        // part of the track list leaves it in a column narrow enough to break again.
        const whoSpans = rules
            .filter((r) => r.selectors.some((s) => /\.bib-ledger-who\b/.test(s)))
            .map((r) => decl(r.body, "grid-column"))
            .filter((v) => v !== undefined);
        expect(whoSpans.length, "some arm must give the row's name a line of its own — it is the "
            + "one cell here a reader can do without on its own row, and the figures' shared "
            + "columns are what the ledger is FOR").toBeGreaterThan(0);
        expect(whoSpans.some((v) => /1\s*\/\s*-1/.test(v!)), `the name must span every column, `
            + `got ${JSON.stringify(whoSpans)}`).toBe(true);
    });

    /**
     * THE UNIT IS STATED EXACTLY ONCE AT EVERY WIDTH, AND THE TWO CARRIERS SWAP.
     *
     * The heading row exists to say `KM` once instead of on every figure. The narrowest arm
     * gives each figure its own line, and at that point the heading is standing over a stack
     * holding a distance AND a clock — a reader following `KM` down arrives at `2:19:11`.
     * Rendered and looked at; every measurement said that band was clean, and it was.
     *
     * So the unit moves onto the figure there and the heading goes away in the same arm. What
     * this holds is the INVARIANT that makes the swap safe: the two are never both on, and
     * never both off. It cannot be checked by reading one rule — it is a property of the pair.
     */
    it("states the ledger's unit exactly once, whichever carrier is showing", () => {
        const rules = parseRules(pageCss(PAGES.all));

        // `lastDecl`, NOT `decl`. The minifier merges two rules that share a selector AND a
        // prelude into ONE body, so a second `display` for the same class arrives as
        // `{display:revert;display:none}`. `decl` reads the FIRST — `revert` — while the browser
        // paints `none`. Measured: 465 tests green with BOTH carriers of the unit hidden at the
        // 200% text size this arm exists for. Reading the first value here proves nothing.
        //
        // `undefined` means the arm says nothing about this class, which is NOT the same as
        // saying it is hidden.
        const isShown = (cls: string, at: string): boolean | undefined => {
            const found = rules
                .filter((r) => r.at === at && r.selectors.some((sel) => new RegExp(`\\.${cls}\\b`).test(sel)))
                .map((r) => lastDecl(r.body, "display"))
                .filter((v): v is string => v !== undefined);
            return found.length === 0 ? undefined : found.at(-1)!.trim() !== "none";
        };

        const doc = parseHTML(read(PAGES.all)).document;
        expect([...doc.querySelectorAll(".bib-ledger-unit")].length,
            "the ledger must carry a unit that can travel with its figure").toBeGreaterThan(0);
        expect(isShown("bib-ledger-unit", ""),
            "the unit is off by default — the heading row states it once, which is why it exists")
            .toBe(false);

        const arms = [...new Set(rules.map((r) => r.at))].filter((a) => /@container/.test(a));
        let swapped = 0;
        for (const at of arms) {
            const headOff = isShown("bib-ledger-km-head", at) === false;
            const unitOn = isShown("bib-ledger-unit", at) === true;
            expect(headOff, `"${at}": the unit heading and the inline unit must not both be off — `
                + "that leaves a distance with no unit anywhere in its own utterance — and not "
                + "both on, which states it twice").toBe(unitOn);
            if (headOff) swapped++;
        }
        expect(swapped, "some arm must perform the swap, or the heading outlives the column it heads")
            .toBeGreaterThan(0);

        /*
         * AND THE SWAP LIVES IN EXACTLY ONE PLACE. The loop above compares the two carriers
         * WITHIN a single at-rule prelude, so a THIRD arm with its own prelude — narrower, and
         * therefore also in force — can hide the unit while saying nothing about the heading.
         * `isShown` then answers `undefined` for the heading, the loop folds that to `false`,
         * and silence is read as agreement: both carriers off, gate green, no unit on the bib.
         *
         * A stylesheet gate cannot fold a cascade without becoming a browser. What it CAN hold
         * is the structure the design actually wants — each carrier is decided once, in the same
         * breath as the other — which makes the multi-arm case unrepresentable rather than
         * merely unchecked.
         */
        const armsNaming = (cls: string) => [...new Set(rules
            .filter((r) => r.at !== "" && r.selectors.some((sel) => new RegExp(`\\.${cls}\\b`).test(sel))
                && lastDecl(r.body, "display") !== undefined)
            .map((r) => r.at))];
        const unitArms = armsNaming("bib-ledger-unit");
        const headArms = armsNaming("bib-ledger-km-head");
        expect(unitArms.length, `the inline unit's visibility must be decided in ONE conditional `
            + `rule, or a narrower arm can hide it behind the gate's back. Got ${JSON.stringify(unitArms)}`)
            .toBe(1);
        expect(headArms, "and the heading it swaps with must be decided in the SAME one")
            .toEqual(unitArms);

        /*
         * AND THE UNIT MUST BREAK AWAY WHOLE. The ledger sets `overflow-wrap: anywhere`, which
         * is what keeps an unbreakable token off the card, and it reaches the unit too: at the
         * narrowest bib it split `160.56km` after the `k`, leaving `160.56k` alone on a line.
         * The figure was still correct and the pair still read as a different number — a
         * hundred and sixty THOUSAND. Holding the two letters together moves the break in
         * front of them. Six cells on the wall split that way at a 320px viewport and a 32px
         * root when it was written.
         *
         * THAT NUMBER IS NOW ZERO AND THE GATE STAYS, which is worth stating rather than
         * quietly re-measuring. The arm that gives the distance a whole row landed afterwards
         * and left a two-letter unit nothing to break against, so stripping the declaration
         * today splits nothing anywhere in the bracket the site undertakes. What still rests
         * on it is a unit LONGER than `km` — the word comes from the goal — and that was
         * confirmed reachable rather than assumed: a twelve-character unit splits on 48 cells
         * at the very widths that report zero for this one. A guard whose defect has been
         * covered by a second guard is not a dead guard; it is the one holding the case the
         * second does not.
         */
        // EVERY rule that reaches the unit, not just the unconditional one. Scoping this to
        // `at === ""` checked only the widths at which the unit is HIDDEN, and said nothing
        // about the one arm where it actually renders — the only place the break can happen.
        // A rule that does not mention `white-space` passes: `{opacity:.8}` and
        // `{font-weight:700}` reach this class too, and requiring the property in all of them
        // would redden correct code.
        const unitRules = rules.filter((r) => r.selectors.some((sel) => /\.bib-ledger-unit\b/.test(sel)));
        expect(unitRules.length, "no rule reaches the unit — this assertion would be vacuous")
            .toBeGreaterThan(0);
        for (const r of unitRules) {
            const wrap = lastDecl(r.body, "white-space");
            if (wrap === undefined) continue;
            expect(wrap.trim(), `"${r.at || "unconditional"}" must not let the unit break — `
                + "`160.56k` alone on a line reads as 160,560").toBe("nowrap");
        }
        expect(unitRules.some((r) => lastDecl(r.body, "white-space")?.trim() === "nowrap"),
            "some rule must actually hold the unit together").toBe(true);

        /*
         * AND IT MUST BE TRACKED LIKE THE CAPTION IT STANDS IN FOR, WHICH IT CANNOT INHERIT.
         *
         * The unit was given the caption treatment by joining two selector lists — the dimming
         * and the weight — and that reads, in the source, as settled. It is not: a list confers
         * only the properties it NAMES, and the remaining ones arrive from the DOM parent. The
         * other three captions are children of `.bib-ledger` and take its tracking; the unit sits
         * inside the FIGURE cell, which tightens tracking for a run of tabular digits, so the
         * unit was drawn at the figures' 0.06em while the caption beside it drew at 0.12em.
         * Measured on the rendered page at a 32px root, both on screen together: 1.2px and 2.4px.
         *
         * WHY THIS IS A STYLESHEET GATE AND NOT A RENDERED ONE. The failure is a MISSING
         * declaration, and what makes it missing is a fact about the DOM parent that no rule
         * states — so there is nothing to read unless the restatement is required outright. The
         * value is compared against the ledger's OWN, not against a literal, so moving the
         * ledger's tracking moves both and this stays true; hard-coding `0.12em` here would gate
         * a number instead of the property that number expresses.
         */
        // `.bib-ledger[data-astro-cid-…]` is how a scoped rule ships, so the anchor has to admit
        // the attribute — and `(?![-\w])` is what stops `.bib-ledger-km` answering for the ledger.
        const ledgerRule = rules.find((r) => r.at === ""
            && r.selectors.some((s) => /^\.bib-ledger(?![-\w])/.test(s.trim())));
        const ledgerTracking = ledgerRule && lastDecl(ledgerRule.body, "letter-spacing");
        expect(ledgerTracking, "the ledger must set the tracking its captions inherit").toBeTruthy();
        const unitTracking = unitRules
            .map((r) => lastDecl(r.body, "letter-spacing"))
            .filter((v): v is string => v !== undefined);
        expect(unitTracking.at(-1)?.trim(), "the unit sits inside a figure cell, so it inherits the "
            + "FIGURES' tracking unless it restates the ledger's — and a caption set at the "
            + "figures' tracking is exactly the drift the caption lists exist to prevent")
            .toBe(ledgerTracking?.trim());
    });

    /**
     * A CLOCK MUST BE CALLED BY ITS RIGHT NAME, AND THE NAME IS THE ONLY PLACE THIS IS SAID.
     *
     * WHY IT MATTERS MORE THAN IT LOOKS. A gun time and a net time differ by however long the
     * rider stood in the pen — 17 minutes and 5 seconds apart on the 2022 half marathon, where
     * the sheet publishes both. Nothing on SCREEN states which one a bib is printing; the word
     * lives in the results link's accessible name, so a reader using it is the one reader who
     * is told, and the only one who can be MIStold.
     *
     * WHAT WAS UNPINNED. The word has TWO sources — the component's derivation and these two
     * constants — and neither was held. Swapping either shipped `net time 2:19:11` for a race
     * whose sheet publishes a gun time and nothing else, with 461 tests, `pnpm check` and
     * `pnpm eslint` all green. The figure was already gated; the word naming it was not, which
     * is exactly the asymmetry the component's own note warns about.
     *
     * THE TWO WORDS ARE WRITTEN OUT, and the duplication is the point — the same reason the
     * Strava base URL is a literal a few tests above. Deriving the expectation from
     * `PATCHES.net_clock` would compare the page against the very constant that drew it, and
     * swapping the two VALUES would keep this green while every bib announced the wrong clock.
     * These are the sport's own words, not configuration: a field whose whole job is to name
     * the correct clock cannot also be free to say anything.
     */
    it("names the right clock on an official result, and prints the figure that word names", () => {
        expect(PATCHES.net_clock, "a chip time is a NET time").toBe("net");
        expect(PATCHES.gun_clock, "the starting gun to the finish mat is a GUN time").toBe("gun");

        let net = 0, gun = 0;
        for (const {bib, event} of wallBibs(PAGES.all)) {
            const official = event.official;
            if (official?.url === undefined) continue;

            const line = [...bib.querySelectorAll("a.bib-stub-link")]
                .find((a) => a.getAttribute("href") === official.url);
            expect(line, `${event.name} publishes a results sheet, so its stub must link it`)
                .toBeTruthy();

            const said = (line!.textContent ?? "").replace(/\s+/g, " ").toLowerCase();
            // DERIVED FROM THE EVENT, NOT FROM THE COMPONENT'S CHOICE. `net_time` is the
            // rider's own race and wins where the sheet publishes one; where it does not, what
            // is left is a gun time and must be called that. constants.ts refuses to derive a
            // net time by subtraction for exactly this reason.
            const right = official.net_time !== undefined ? "net" : "gun";
            const wrong = right === "net" ? "gun" : "net";
            if (right === "net") net++; else gun++;

            expect(said, `${event.name}: the sheet publishes a ${right} time, so the link must `
                + `say so — a reader is told this ONCE and nothing on screen contradicts it`)
                .toContain(`${right} time`);
            expect(said, `${event.name} must not announce a ${wrong} time; the two are `
                + "17 minutes apart on the one race whose sheet publishes both")
                .not.toContain(`${wrong} time`);
            expect(said, `${event.name}: the word and the figure must be the SAME clock`)
                .toContain((official.net_time ?? official.gun_time)!.toLowerCase());
        }

        // BOTH BRANCHES, or the gate covers one word and calls the other proven. The calendar
        // holds one race of each kind; if that stops being true this must be told, not skipped.
        expect(net, "a race whose sheet publishes a net time").toBeGreaterThan(0);
        expect(gun, "a race whose sheet publishes only a gun time").toBeGreaterThan(0);
    });

    /**
     * Compared against {@link EVENTS} rather than against a list of countries written
     * here: `country` is human-edited, so a mismatch is wanted feedback, and a literal
     * would have to be updated in two places every time a race is added.
     */
    it("prints each race's country on its own bib", () => {
        for (const {bib, event} of wallBibs(PAGES.all)) {
            expect(bib.querySelector(".bib-place")?.textContent, `${event.name} must print its country`)
                .toBe(event.country);
        }
    });

    it("prints every distance to two decimals, split so the fraction can be set small", () => {
        for (const {bib, event} of wallBibs(PAGES.all)) {
            const value = bib.querySelector(".bib-value")!;
            const km = raceKm(event).toFixed(2);
            // THE HERO IS NOT ALWAYS THE DISTANCE. On a bib for a race that was not
            // finished the hero is the RESULT, and the kilometres are reported by the
            // ledger like every other account of the race — held whole by the ledger test
            // above, so this branch only holds the hero to NOT being a number. That half
            // still matters on its own: printing 110.04 large again would put the bib back
            // to claiming a result nobody got.
            if (bib.classList.contains("bib--dnf")) {
                expect(value.textContent?.trim(), `${event.name} hero`).toBe(PATCHES.dnf_result);
                expect(value.querySelector(".bib-fraction"), `${event.name} splits no fraction off a verdict`)
                    .toBeNull();
                expect(bib.querySelector(".bib-unit"), `${event.name} puts no unit on a verdict`).toBeNull();
                continue;
            }
            expect(value.textContent?.replace(/\s+/g, ""), `${event.name} distance`).toBe(km);
            expect(value.querySelector(".bib-fraction")?.textContent, `${event.name} fraction`)
                .toBe(`.${km.split(".")[1]}`);
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

            /*
             * AND EACH CHIP MUST SAY THE SPORT, NOT THE VERB. The labels moved from
             * `short_name` to `goal_name` because a chip reading "Ride" named the activity
             * where the wall beside it names the sport — the same defect the heading pairing
             * was changed to close, in the one element whose whole job is to say where you
             * are. Everything above this loop passes on either wording: it asserts the link
             * COUNT, the `aria-current`, the `href` and the number badge, and none of those
             * move when the word does. Reverting the one-word change left the whole suite
             * green, so the wording was shipped with nothing holding it.
             *
             * Read off `GOALS` rather than written out, so a third sport joins by existing.
             */
            const spoken = links.map((a) => a.textContent?.replace(/\d+/g, "").replace(/\s+/g, " ").trim());
            for (const goal of GOALS) {
                expect(spoken, `${page}: no filter chip is named "${goal.goal_name}" — a chip must name the SPORT `
                    + `the way the wall does, not the activity verb (${goal.short_name})`)
                    .toContain(goal.goal_name);
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
     * WHAT THE LEDE IS FOR NOW, AND WHY IT NO LONGER NARROWS PER PAGE.
     *
     * It used to open with a sentence of scope, and this test used to assert that the
     * sentence narrowed: "every race I have entered this year" is a claim only /patches
     * could make, and /patches/cycling shipped it while showing four of six. That defect
     * is gone by DELETION rather than by narrowing — the heading and the filter row were
     * already saying which page a reader is on, so the sentence was a second telling, and
     * a claim that is not made cannot be overclaimed.
     *
     * What is left is the one thing neither the heading nor the bibs say: the name of the
     * earned bib. It is the same string on all three pages, deliberately.
     */
    it("gives every page the lede that names the earned bib", () => {
        for (const page of Object.values(PAGES)) {
            const lede = parseHTML(read(page)).document.querySelector("main p.text-sm")?.textContent ?? "";
            expect(lede, `${page} must carry a lede`).toContain(PATCHES.lede);
            expect(lede, `${page} ships an unsubstituted placeholder`).not.toContain("{sport}");
        }
    });

    /**
     * THE SCOPE CLAIM MOVED TO THE COPY A CRAWLER READS, and this is the assertion that
     * followed it there.
     *
     * A META DESCRIPTION IS THE ONE PLACE THE CLAIM STILL EARNS ITS KEEP: it is read
     * alone, with no heading and no filter row beside it, so an unnarrowed one cannot be
     * caught by looking at the page. That is not hypothetical — a review panel found the
     * single unnarrowed `description` shipping on all three routes for two revisions
     * after the visible copy had been fixed.
     */
    it("narrows the meta description to what each page actually shows", () => {
        for (const [key, page] of Object.entries(PAGES)) {
            const doc = parseHTML(read(page)).document;
            const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
            expect(description, `${page} must carry a meta description`).not.toBe("");
            expect(description, `${page} ships an unsubstituted placeholder`).not.toContain("{sport}");
            if (key === "all") {
                expect(description).toBe(PATCHES.description_all);
            } else {
                const goal = GOALS.find((g) => g.goal_name.toLowerCase() === key)!;
                expect(description, `${page} must say which sport it is showing`).toContain(goal.goal_name.toLowerCase());
                expect(description, `${page} tells a crawler it shows every race, and it does not`)
                    .not.toBe(PATCHES.description_all);
            }
        }
    });

    /**
     * NOTHING THAT DESCRIBES THE WALL MAY SCOPE IT TO A YEAR, and this gate is written
     * against the CLASS rather than against the four strings that were wrong.
     *
     * `EVENTS` is the owner's whole racing history now, so "this year" is false wherever
     * it appears about the wall — and it appeared in five places at once: two lede
     * strings, two meta descriptions and the `<title>`, which carried a literal `· 2026`.
     * Four of the five are prose that a future edit could reintroduce in a new string, and
     * the fifth is not prose at all, which is why this walks the built pages as well as
     * the constants.
     *
     * The bibs are deliberately out of scope: a bib PRINTS its year, and that is the whole
     * point of keeping several.
     */
    it("never scopes the wall to a single year, on the page or in the copy a crawler reads", () => {
        const YEAR_CLAIM = /this year|last year|\b(19|20)\d{2}\b/i;
        for (const [name, text] of Object.entries({
            lede: PATCHES.lede,
            description_all: PATCHES.description_all,
            description_sport: PATCHES.description_sport,
            heading: PATCHES.heading,
        })) {
            expect(text, `PATCHES.${name} scopes a lifetime wall to one year: "${text}"`).not.toMatch(YEAR_CLAIM);
        }
        for (const page of Object.values(PAGES)) {
            const doc = parseHTML(read(page)).document;
            const parts = {
                title: doc.querySelector("title")?.textContent ?? "",
                description: doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
                heading: doc.querySelector("h1")?.textContent ?? "",
                lede: doc.querySelector("main p.text-sm")?.textContent ?? "",
            };
            for (const [what, text] of Object.entries(parts)) {
                expect(text, `${page} ${what} is empty, so this assertion would be vacuous`).not.toBe("");
                expect(text, `${page} ${what} scopes the wall to a year: "${text}"`).not.toMatch(YEAR_CLAIM);
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
            // EVERY state class, not just the one the wall happens to hold today. Omitting
            // one lets a rule reaching a bib through that class — `.bib--dnf .bib-tag`, a
            // combinator this model cannot represent — slip past the refusal entirely on
            // any day no race is in that state, which for `dnf` was every day until now.
            "bib", ...STATE_CLASSES, ...GOALS.map((g) => `bib--${g.sport}`),
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
            ALL_STATES.flatMap((state) =>
                (["light", "dark"] as const).map((theme) => ({goal, state, theme})))),
    )("holds the $goal.short_name mark at 4.5:1 on a $state bib in the $theme theme", ({goal, state, theme}) => {
        const tokens = bibTokensFor(goal.sport, state);
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
            ALL_STATES.flatMap((state) =>
                (["light", "dark"] as const).map((theme) => ({goal, state, theme})))),
    )("keeps every dimmed line on a $state $goal.short_name bib readable in the $theme theme", ({goal, state, theme}) => {
        const bibTokens = bibTokensFor(goal.sport, state);
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
        // ONE STATE IS INVERTED AND EVERY OTHER SITS ON THE CARD, so the on-card side is a
        // set rather than a single token set. `bib--booked` was written in here literally,
        // which made the check blind to a second unearned state getting the polarity
        // backwards — the exact 2.77:1 mistake the note above is about.
        const unearned = ALL_STATES.filter((s) => s !== "finished");
        expect(unearned.length, "the on-card side must not be empty, or this proves nothing").toBeGreaterThan(0);
        for (const theme of ["light", "dark"] as const) {
            const t = themeBlock(theme);
            const onInk = resolve(bibTokensFor(goal.sport, "finished"), declared(["bib-sport"], "color")!, t);
            const cardIsDark = luminance(t["--card-background"]) < luminance(t["--text"]);
            const onCards = unearned.map((state) =>
                [state, resolve(bibTokensFor(goal.sport, state), declared(["bib-sport"], "color")!, t)] as const);
            for (const [state, onCard] of onCards) {
                expect(
                    luminance(onInk) > luminance(onCard),
                    `${goal.short_name} on a ${state} bib in ${theme}: the inverted face is `
                    + `${cardIsDark ? "light" : "dark"}, so the mark on it must be the `
                    + `${cardIsDark ? "darker" : "paler"} hue — got ${onInk} on ink and ${onCard} on card`,
                ).toBe(!cardIsDark);
            }
            // AND THEY MUST BE THE SAME HUE AS EACH OTHER. That identity is the whole reason
            // a third state costs no new token and no new contrast pair — the claim in
            // `.bib--dnf`'s note in Patch.astro. The two rules repeat the triple rather than
            // sharing it (each must stay single-class for the model above), so a re-tone of
            // one and not the other is a real and silent way for them to drift apart.
            expect(
                new Set(onCards.map(([, hue]) => hue)).size,
                `${goal.short_name} in ${theme}: every unearned bib draws the mark on the same card, so they must `
                + `resolve to one hue — got ${onCards.map(([s, hue]) => `${s}=${hue}`).join(", ")}`,
            ).toBe(1);
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
        date: `${GOAL_YEAR}-07-10`, name: "A Race With A Recording", sport: "cycling",
        country: "Thailand", elapsed_time: "5:00:00",
        recordings: [{id: "1234567890123", metres: 100000, elapsed_time: "5:00:00"}],
    };
    const unlinked: RaceEvent = {
        date: `${GOAL_YEAR}-07-10`, name: "A Race With No Recording", advertised_km: 100, sport: "cycling",
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

    it("puts the warning inside every stub link, as its LAST child", async () => {
        // A RACE WITH BOTH KINDS OF DESTINATION, so this reads more than one link. Every stub
        // line opens a new tab and every one of them owes the warning; a fixture with a single
        // link would be green on a component that emitted it once for the whole stub.
        const doc = await render({...linked, advertised_km: 99, official: {gun_time: "5:10:00", url: "https://example.test/r"}});
        const anchors = [...doc.querySelectorAll("a.bib-stub-link")];
        expect(anchors.length, "this fixture must produce a sheet link and a Strava link").toBe(2);
        expect(doc.querySelector("a.bib"), "no bib is ever the anchor").toBeNull();

        for (const anchor of anchors) {
            expect(anchor.getAttribute("target")).toBe("_blank");

            const notice = [...anchor.querySelectorAll(".sr-only")]
                .filter((el) => el.textContent?.includes(NEW_TAB_NOTICE));
            expect(notice.length, "exactly one new-tab warning per link, or it is announced twice").toBe(1);

            // THE POSITION, which is the whole assertion. `lastElementChild` is what makes
            // appending to the label — the implementation this replaced — go red: that puts the
            // warning ahead of the race's own name, where it warns nobody about anything yet.
            expect(
                anchor.lastElementChild?.textContent?.trim(),
                "the warning must be the link's last child so it lands at the END of the accessible name",
            ).toBe(NEW_TAB_NOTICE);

            // AND IT MUST REACH THE TREE. `aria-hidden="true"` here deletes the announcement
            // from the accessibility tree with every assertion above still green — they read
            // textContent and class tokens, neither of which `aria-hidden` touches. Measured:
            // 0 of 17 links announce with the attribute, 3 without it.
            expect(notice[0].getAttribute("aria-hidden"), "an aria-hidden warning announces nothing").toBeNull();
            expect(notice[0].closest('[aria-hidden="true"]'), "and neither may an ancestor hide it").toBeNull();
        }
    });

    it("says nothing on a bib that opens nothing", async () => {
        const doc = await render(unlinked);
        expect(doc.querySelector(".bib-stub"), "no activity id and no results sheet means no stub").toBeNull();
        expect(
            allText(doc).includes(NEW_TAB_NOTICE),
            "a bib with no recording is a plain div and navigates nowhere; warning about a tab it never opens is a lie",
        ).toBe(false);
    });

    it("is conditional on the LINK, not on the state", async () => {
        // An earned bib with no id is a real case rather than a hypothetical: the type makes
        // the id optional so a race can be remembered without a recording. A booked bib with
        // an id would be one too. Both are rendered from fixtures, so neither depends on live
        // EVENTS happening to contain an instance.
        const finishedNoLink = await render(unlinked, "finished");
        const bookedNoLink = await render(unlinked, "booked");
        for (const doc of [finishedNoLink, bookedNoLink]) {
            expect(doc.querySelector(".bib-stub")).toBeNull();
            expect(allText(doc).includes(NEW_TAB_NOTICE)).toBe(false);
        }
    });
});

/**
 * A RACE RECORDED IN PARTS, RENDERED DIRECTLY, and the direct render is the point.
 *
 * Every other assertion about this shape reads the built wall, so all of them are hostage
 * to the calendar holding a split race on the day the suite runs. There is exactly ONE
 * today; the moment that row gains or loses a recording — an ordinary data edit — every
 * data-driven split assertion in this file goes vacuous WITHOUT going red, which is the
 * failure mode this repo has recorded more than any other. A fixture cannot be edited away
 * by touching `EVENTS`.
 *
 * IT ALSO COVERS THE COUNTS THE DATA CANNOT REACH. The live row has two recordings; three
 * and four exist only here, and they are what prove the shape is a list rather than a pair.
 */
describe("a race recorded in parts lists them, and the bib stops being the link", () => {
    const parts = (n: number): [Recording, ...Recording[]] =>
        Array.from({length: n}, (_, i) => ({
            id: `${1000000000 + i}`,
            metres: 10000 + i * 1000,
            elapsed_time: `${i + 1}:0${i}:00`,
        })) as [Recording, ...Recording[]];

    const split = (n: number): RaceEvent => ({
        date: `${GOAL_YEAR}-07-10`, name: "A Race Recorded In Parts", sport: "cycling",
        country: "Thailand", elapsed_time: "9:00:00", recordings: parts(n),
    });

    const render = async (event: RaceEvent, state: PatchState = "finished") =>
        parseHTML(await (await AstroContainer.create()).renderToString(Patch, {props: {event, state}})).document;

    it.each([2, 3, 4])("draws one link per recording and none for the bib (%i parts)", async (n) => {
        const doc = await render(split(n));

        expect(doc.querySelector("a.bib"), "the bib itself must not be an anchor").toBeNull();
        expect(doc.querySelector(".bib-go"), "the retired action row must not come back").toBeNull();

        const lines = [...doc.querySelectorAll("a.bib-stub-link")];
        expect(lines.length, "one link per recording").toBe(n);

        for (const [i, part] of parts(n).entries()) {
            const line = lines[i];
            expect(line.getAttribute("href")).toBe(`https://www.strava.com/activities/${part.id}`);
            expect(line.getAttribute("target"), "the same new tab the single-recording bib opens").toBe("_blank");
            expect(line.getAttribute("rel"), "a bare target, as everywhere else on this site").toBeNull();
            expect(line.getAttribute("aria-label"), "an aria-label REPLACES the name; sr-only EXTENDS it").toBeNull();

            // THE WARNING LANDS LAST ON EVERY LINE, not only on the bib. Same argument as the
            // block above: accname is assembled in DOM order, so a notice that is not last is
            // announced in the middle of the figures it is meant to qualify.
            const last = line.lastElementChild;
            expect(last?.classList.contains("sr-only"), `line ${i + 1} must end with a hidden span`).toBe(true);
            expect(last?.textContent, `line ${i + 1} must end with the new-tab warning`).toBe(NEW_TAB_NOTICE);

            // AND THE LINE MUST PROMISE WHAT IT DELIVERS. The bib's hero is the summed distance
            // and its time row the whole span, so a link naming neither would send a reader to
            // smaller figures than the bib showed. The verb is asserted because without it the
            // line is typographically identical to the elapsed caption above it.
            const name = (line.textContent ?? "").replace(/\s+/g, " ").trim();
            const said = PATCHES.split_line.replace("{distance}", `${recordingKm(part).toFixed(2)} km`);
            for (const token of [said, part.elapsed_time, "A Race Recorded In Parts", NEW_TAB_NOTICE]) {
                expect(name, `line ${i + 1} must announce "${token}"`).toContain(token);
            }
            expect(name.startsWith(said), "the verb leads, so the line reads as a control before a figure").toBe(true);
        }

        // NO TWO LINES MAY ANNOUNCE THE SAME THING while going to different places — the
        // practice failure this whole shape was drawn to avoid rather than introduce.
        const names = lines.map((a) => (a.textContent ?? "").replace(/\s+/g, " ").trim());
        expect(new Set(names).size, "every split line needs its own accessible name").toBe(n);
    });

    /**
     * THE SPLIT LINE'S VISIBLE AFFORDANCE, ASSERTED — the companion this shape was missing.
     *
     * The single-line stub has one ("gives every stub line a label a reader can see")
     * and it exists because this component ONCE SHIPPED the defect it now guards: a control
     * whose only visible cue was a 7.5x10px glyph, its words hidden behind `sr-only`, which
     * two readers could not find. The split line is the same kind of control and had no such
     * assertion, so the words could go back behind `sr-only` — or the glyph could be deleted
     * outright — and every gate in the repo would stay green. The build-wide signifier gate
     * cannot cover it: it exempts this line by class, so it is blind by construction.
     *
     * VISIBLE MEANS WITH THE `sr-only` SUBTREES REMOVED. Asserting on `textContent` is what
     * makes this vacuous — the race name and the new-tab notice both live in hidden spans, so
     * a `toContain` over the whole string is satisfied by text nobody can see. That is the
     * exact substitution the reviewer caught, so the reading is done explicitly here.
     */
    it.each([2, 3])("says what a split line does in words a reader can SEE (%i parts)", async (n) => {
        const doc = await render(split(n));
        const lines = [...doc.querySelectorAll("a.bib-stub-link")];
        expect(lines.length, "one link per recording").toBe(n);

        for (const [i, part] of parts(n).entries()) {
            const line = lines[i];

            // Strip what is hidden, and read what is left.
            const shown = line.cloneNode(true) as Element;
            for (const hidden of [...shown.querySelectorAll(".sr-only")]) hidden.remove();
            const visible = (shown.textContent ?? "").replace(/\s+/g, " ").trim();

            const label = PATCHES.split_line.replace("{distance}", `${recordingKm(part).toFixed(2)} km`);
            expect(visible, `line ${i + 1} must SHOW its label, not hide it`).toContain(label);
            expect(visible.startsWith(PATCHES.split_line.split("{")[0].trim()),
                "the imperative leads, so the line reads as a control rather than as a caption").toBe(true);
            expect(visible, `line ${i + 1} must SHOW its own clock`).toContain(part.elapsed_time);

            // And the mark, which names the destination. aria-hidden because the words carry
            // it — the same arrangement every stub line is held to.
            const glyph = line.querySelector(`span[class~="${iconClass(PATCHES.strava_icon)}"]`);
            expect(glyph, `line ${i + 1} must keep the configured brand mark`).toBeTruthy();
            expect(glyph!.getAttribute("aria-hidden"), "the mark is decorative; the words carry the meaning")
                .toBe("true");
        }
    });

    /**
     * AND IT MUST NOT BE DRAWN AS A WEB LINK. The counterpart to the rule already enforced on
     * every stub line: a bib is a printed artifact, every row on it is uppercase, letterspaced and
     * undecorated, and a rule under 15px of ink would describe the wrong target anyway. The
     * split line replaced that row on a split bib, so it inherits the rule.
     */
    it("draws the split line in the bib's own idiom, not as a ruled web link", () => {
        const rules = parseRules(pageCss(PAGES.all))
            .filter((r) => r.selectors.some((sel) => /\.bib-stub-link\b/.test(sel)));
        expect(rules.length, "the split line must have rules at all").toBeGreaterThan(0);
        for (const rule of rules) {
            for (const prop of ["text-decoration", "text-decoration-line"] as const) {
                expect(decl(rule.body, prop) ?? "", `${rule.selectors.join(",")} { ${prop} }`)
                    .not.toContain("underline");
            }
        }
    });

    /**
     * ONE RECORDING IS A STUB WITH ONE LINE, AND IT SAYS WHERE IT GOES RATHER THAN HOW FAR.
     *
     * This used to assert the opposite — one destination, so the whole bib was the anchor —
     * and the difference between the two lines is the whole of what a stub costs and buys. It
     * costs a 260px target, which becomes a 24px row. It buys one idiom instead of two: a
     * reader no longer has to work out which KIND of bib they are looking at before they know
     * where to aim, and a race that gains a published result gains a line rather than a
     * redrawing.
     *
     * THE LABEL IS THE DESTINATION, NOT A FIGURE, and that is the one thing that separates
     * this line from a split race's. There is only one place to go, so a distance would be the
     * bib's own hero repeated four rows down; naming the destination is what a lone line has
     * to do that a run of them does not.
     */
    it("gives a one-recording bib a stub with a single line naming its destination", async () => {
        const one: RaceEvent = {
            date: `${GOAL_YEAR}-07-10`, name: "A Race With One Recording", sport: "cycling",
            country: "Thailand", elapsed_time: "5:00:00",
            recordings: [{id: "1234567890123", metres: 100000, elapsed_time: "5:00:00"}],
        };
        const doc = await render(one);

        expect(doc.querySelector("a.bib"), "no bib is ever the anchor").toBeNull();
        const lines = [...doc.querySelectorAll(".bib-stub-link")];
        expect(lines.length, "one destination, one line").toBe(1);

        const shown = lines[0].cloneNode(true) as Element;
        for (const hidden of [...shown.querySelectorAll(".sr-only")]) hidden.remove();
        expect((shown.textContent ?? "").replace(/\s+/g, " ").trim(),
            "a lone line names where it goes; a distance here would be the hero repeated")
            .toBe(PATCHES.strava_name);
        expect(lines[0].querySelector(".bib-stub-time"),
            "and it prints no clock: there is only one, and the ledger above already has it").toBeNull();
    });

    /**
     * AN EMPTY ARRAY IS NOT A RECORDING. `recordings: []` is reachable through the type, and
     * it must mean the same as the field being absent — otherwise the wall could draw a bib
     * that claims a recording it cannot link to.
     */
    it("treats an empty recordings array as no recording at all", async () => {
        const empty: RaceEvent = {
            date: `${GOAL_YEAR}-07-10`, name: "A Race With An Empty List", advertised_km: 100, sport: "cycling",
            country: "Thailand", elapsed_time: "5:00:00", recordings: [],
        };
        const doc = await render(empty);

        expect(doc.querySelector("a.bib"), "no bib is ever the anchor").toBeNull();
        expect(doc.querySelector(".bib-stub"), "nothing to list").toBeNull();
        expect(doc.querySelector(".bib-stub-link"), "and nothing to link to").toBeNull();
        expect((doc.documentElement?.textContent ?? "").includes(NEW_TAB_NOTICE), "no tab is opened").toBe(false);
    });
});

/**
 * A ROW WITH A CLOCK AND NO DISTANCE — the one ledger shape the calendar does not currently hold.
 *
 * WHAT REACHES IT. A race remembered with a finishing time and no recording is `finished` once
 * its day has passed, so it earns a `RECORDED` row; but there are no metres, and printing the
 * ADVERTISED figure against `RECORDED` would have the bib claim he covered a course the site has
 * no evidence he rode. So the distance cell is left empty and the clock cell is not — the two are
 * conditional independently, which is what makes this shape reachable at all.
 *
 * WHY A FIXTURE. Every other assertion about the ledger reads the built wall, and the wall holds
 * ZERO of these today — verified by EXECUTING the predicate over `EVENTS` rather than grepping
 * for it, which is a distinction this repo has paid for: a line-oriented search of the source
 * returned ten plausible candidates and running the condition returned none, because the records
 * are multi-line and `recordings:` sits on a continuation line. A branch no data reaches is a
 * branch no data-driven test can defend, and it will be reached the first time a race is
 * remembered from a paper result.
 *
 * WHAT IT PROVES that the wall cannot: the unit belongs to the FIGURE, not to the ledger. The
 * second fixture puts a row that has a distance beside a row that does not, in one ledger, so a
 * component that emitted the unit once per ledger — or unconditionally — fails here and nowhere
 * else.
 */
describe("a race remembered with a clock and no recording prints the clock alone", () => {
    const render = async (event: RaceEvent, state: PatchState = "finished") =>
        parseHTML(await (await AstroContainer.create()).renderToString(Patch, {props: {event, state}})).document;

    const rowsOf = (doc: Document) => [...doc.querySelectorAll(".bib-ledger-row")].map((row) => ({
        who: row.querySelector(".bib-ledger-who")?.textContent?.trim() ?? "",
        km: kmFigure(row),
        time: row.querySelector(".bib-ledger-time")?.textContent?.trim() ?? "",
        unit: row.querySelector(".bib-ledger-unit")?.textContent?.trim() ?? null,
    }));

    /*
     * REMEMBERED, NOT RECORDED. No `recordings`, so the type puts this in the booked shape and
     * requires an advertised distance — which is exactly the figure that must NOT appear in the
     * recorded row. Rendering it `finished` is what a past date does.
     */
    const remembered: RaceEvent = {
        date: `${GOAL_YEAR}-03-15`, name: "A Race Remembered From Paper", advertised_km: 42.20,
        sport: "running", country: "Singapore", elapsed_time: "4:12:33",
    };

    it("leaves the distance cell empty rather than borrowing the advertised figure", async () => {
        const doc = await render(remembered);

        expect(rowsOf(doc), "one row, a clock, and no distance the site can stand behind")
            .toEqual([{who: PATCHES.recorded_row, km: "", time: "4:12:33", unit: null}]);

        // AND THE ADVERTISED FIGURE IS NOWHERE IN THAT ROW. Asserting the cell is empty says
        // nothing about a component that writes the number somewhere else in the same row.
        const recorded = doc.querySelector(".bib-ledger-row");
        expect(recorded?.textContent?.includes("42.20"), "the ledger's recorded row must not "
            + "reach for the organiser's distance — the whole point of leaving the cell empty")
            .toBe(false);
    });

    it("gives the unit to the row that has a figure and withholds it from the row that does not", async () => {
        const doc = await render({
            ...remembered,
            official: {net_time: "4:10:02", url: "https://example.test/results"},
        });

        expect(rowsOf(doc), "the organiser's row carries a distance and therefore a unit; the "
            + "recorded row carries neither, and a unit beside nothing is a caption for an absence")
            .toEqual([
                {who: PATCHES.official_row, km: "42.20", time: "4:10:02", unit: goalForSport("running").measurable_unit},
                {who: PATCHES.recorded_row, km: "", time: "4:12:33", unit: null},
            ]);

        expect([...doc.querySelectorAll(".bib-ledger-unit")].length,
            "exactly one unit on a two-row ledger where one row has no figure").toBe(1);
    });

    /*
     * AND THE SHAPE IS STILL REACHED WHEN NOTHING ELSE IS. A booked bib prints no ledger at all,
     * so the empty-distance row must not be what turns one on: this is the same event, unridden.
     */
    it("prints no ledger at all while the race is still ahead", async () => {
        const doc = await render(remembered, "booked");
        expect(doc.querySelector(".bib-ledger"), "a booked bib has no account to report").toBeNull();
    });
});

/**
 * EVERY `grid-area` A BIB'S ROWS CLAIM MUST EXIST IN THE TEMPLATE THAT WINS FOR THAT BIB.
 *
 * The gap this closes: a row placed by a rule that gets deleted keeps rendering. It was
 * written when the only rule placing a DNF bib's distance was a COMPOUND one, and deleting
 * that rule left the whole suite green while the rendered bib grew from 240px to 328px and
 * dropped its 110.04 km into the implicit grid, below the stub and in the wrong column.
 * Nothing in the repo asserted `grid-template-areas` or `grid-area` at all — every other
 * assertion asks whether a row EXISTS and what it says, never where it lands.
 *
 * THE COMPOUND RULE IT WAS WRITTEN AGAINST IS GONE and this gate is kept anyway, which is a
 * deliberate call rather than an oversight. The ledger collapsed four grid templates into
 * one, so the bib subtree currently ships no two-class rule at all — but the failure this
 * catches is "a row claims an area its winning template does not declare", which is a
 * property of every template that will ever be added here, and the four-template arrangement
 * is exactly what a future per-state hero would rebuild.
 *
 * IT RESOLVES BY SPECIFICITY, NOT BY SOURCE ORDER, and that stays for the same reason. The
 * `declared()` helper elsewhere in this file states its own precondition — "sheet order
 * decides, which is sound here because every rule involved is a single class" — which held
 * only while that was true. A source-order model reports a false RED on a sheet that has
 * merely been reordered and still renders correctly; it was written that way first and
 * measured saying so.
 *
 * The template is derived from the class set each bib ACTUALLY WEARS on the built page, so a
 * fourth state, or a new combination of existing ones, joins this gate by existing rather
 * than by being added to a list.
 */
describe("the bib's grid template holds every area its rows claim", () => {
    /** Class-only selectors: this model cannot represent anything else, so it skips the rest. */
    const modellable = (sel: string) =>
        !/[\s>+~:[]/.test(sel.replace(/\\./g, "x").replace(/\[data-astro-cid-[\w-]+\]/g, "").trim());
    const tokensOf = (sel: string) => [...sel.matchAll(/\.((?:[\w-]|\\.)+)/g)].map((m) => m[1].replace(/\\/g, ""));
    /** Class + attribute count — enough to order the selectors this component ships. */
    const spec = (sel: string) => tokensOf(sel).length + (sel.match(/\[[^\]]*\]/g) ?? []).length;

    const winner = (rules: Rule[], tokens: string[], prop: string): string | undefined => {
        let best: {s: number, i: number, v: string} | undefined;
        rules.forEach((rule, i) => {
            const v = decl(rule.body, prop);
            if (v === undefined) return;
            for (const sel of rule.selectors) {
                if (!modellable(sel)) continue;
                const need = tokensOf(sel);
                if (need.length === 0 || !need.every((c) => tokens.includes(c))) continue;
                const s = spec(sel);
                if (!best || s > best.s || (s === best.s && i >= best.i)) best = {s, i, v};
            }
        });
        return best?.v;
    };

    it.each(Object.entries(PAGES))("every bib on /%s places every row it renders", (_name, page) => {
        const rules = parseRules(pageCss(page)).filter((r) => r.at === "");
        const doc = parseHTML(read(page)).document;
        const bibs = [...doc.querySelectorAll(".bib")];
        expect(bibs.length, "no bibs — this assertion would be vacuous").toBeGreaterThan(0);
        for (const bib of bibs) {
            const tokens = (bib.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
            const template = winner(rules, tokens, "grid-template-areas");
            expect(template, `.${tokens.join(".")} declares no grid-template-areas`).toBeTruthy();
            const areas = new Set(template!.match(/[\w-]+/g) ?? []);
            for (const el of [...bib.querySelectorAll("*")]) {
                const own = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
                if (own.length === 0) continue;
                const area = winner(rules, [...tokens, ...own], "grid-area");
                if (area === undefined || area === "auto") continue;
                expect(areas.has(area.trim()), `.${own.join(".")} claims grid-area ${area} on .${tokens.join(".")}`)
                    .toBe(true);
            }
        }
    });
});
