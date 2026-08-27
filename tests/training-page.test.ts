import {readFileSync} from "node:fs";
import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import {TRAINING} from "../src/content/training";
import {GOALS} from "../src/lib/goal";
import {kmFromMetres} from "../src/lib/race";
import {PALETTE, valueIn} from "../src/lib/palette";
import {
    groupSpine, hoursMinutes, seasonSpine, seasonTotals, seasonUnit, seasonWeekKeys, shortDate,
} from "../src/lib/season";
import {renderTrainingSpine} from "../src/lib/training-doc";
import {contrast} from "./helpers/contrast";
import {decl, pageCss, parseRules} from "./helpers/css";

/**
 * WHAT THIS SUITE IS FOR: the spine as it actually ships, read out of `dist/`.
 *
 * A GREEN BUILD IS NOT EVIDENCE THAT ANYTHING WAS DRAWN. `tests/season.test.ts` proves the merge
 * arithmetic and the calendar, and it can prove nothing about the page — it mocks both clocks, so
 * it may not look at a built page at all. Every assertion here reads the rendered HTML and the
 * stylesheet the page loads, because the whole class of defect between the two is a figure that
 * is computed correctly and never reaches an element.
 *
 * IT READS THE PAGE'S OWN `<meta name="build-date">` rather than today's clock, for the reason
 * `tests/patch-wall.test.ts` records: comparing a page built yesterday against today's calendar is
 * a red suite on correct code, and a red suite blocks the deploy.
 *
 * THE CONTRAST ARM IS HERE AND NOT IN A COLOUR FILE because the polarity is the one thing about
 * this drawing that can be inverted without anything looking broken: a bar whose track stands
 * further from the card than its fill reads as FULL when it is empty. Three ratios say it —
 * dominance, quiet track, findable boundary — and they are the three the home page's own bar is
 * held to, asserted again here rather than assumed from a shared token name.
 */

const read = (p: string) => readFileSync(p, "utf8");

const PAGES = ["dist/training/index.html", "dist/training/running/index.html", "dist/training/cycling/index.html"];
const SPORT_OF: Record<string, "running" | "cycling" | undefined> = {
    "dist/training/index.html": undefined,
    "dist/training/running/index.html": "running",
    "dist/training/cycling/index.html": "cycling",
};

/** Fails loudly rather than silently falling back to "today". See the suite's header. */
const buildDateOf = (page: string): string => {
    const found = /<meta name="build-date" content="(\d{4}-\d{2}-\d{2})"/.exec(read(page));
    if (found === null) throw new Error(`${page} carries no <meta name="build-date">`);
    return found[1];
};

const docOf = (page: string) => parseHTML(read(page)).document;
const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("the training spine, as it ships", () => {
    it("builds all three pages, each with its own heading", () => {
        const headings = PAGES.map((page) => text(docOf(page).querySelector("h1")));
        expect(headings[0]).toBe(TRAINING.heading);
        for (const goal of GOALS) {
            const page = `dist/training/${goal.sport}/index.html`;
            expect(text(docOf(page).querySelector("h1")),
                "a sport page must be headed with the very string plan 047's control will wear")
                .toBe(TRAINING.control.replace("{sport}", goal.goal_name.toLowerCase()));
        }
        expect(new Set(headings).size, "two of the three spines share a heading").toBe(PAGES.length);
    });

    it.each(PAGES)("draws one row per week of the year, in order (%s)", (page) => {
        const iso = buildDateOf(page);
        const year = Number(iso.slice(0, 4));
        const expected = seasonWeekKeys(year);
        expect(expected.length, "no weeks in the year — this assertion would be vacuous").toBeGreaterThan(50);

        const rows = [...docOf(page).querySelectorAll(".spine-weeks > .spine-row")];
        expect(rows.length, `${page} draws ${rows.length} week rows against ${expected.length} weeks in the year`)
            .toBe(expected.length);
        expect(rows.map((r) => text(r.querySelector(".spine-no"))),
            "the rows are not the year's weeks in order")
            .toEqual(expected.map((key) => key.slice(5)));
        expect(rows.map((r) => r.querySelector(".spine-day")?.getAttribute("datetime")),
            "each row must claim its own Monday as an instant a machine can read")
            .toEqual(expected.map((key) => seasonSpine(year, SPORT_OF[page], iso)
                .filter((row) => row.kind === "week").find((row) => row.key === key)!.monday));
    });

    /**
     * THE FIGURES ON THE PAGE ARE THE FIGURES THE MODULE DERIVED — every row, not a sample. A
     * spot check passes on a page that renders one week's numbers into every row.
     */
    it.each(PAGES)("prints each week's own distance, session count and moving time (%s)", (page) => {
        const iso = buildDateOf(page);
        const sport = SPORT_OF[page];
        const unit = seasonUnit(sport);
        const weeks = seasonSpine(Number(iso.slice(0, 4)), sport, iso).filter((r) => r.kind === "week");
        const rows = [...docOf(page).querySelectorAll(".spine-weeks > .spine-row")];
        expect(rows).toHaveLength(weeks.length);

        let elapsed = 0;
        let ahead = 0;
        for (const [i, week] of weeks.entries()) {
            const row = rows[i]!;
            expect(text(row.querySelector(".spine-day"))).toBe(shortDate(week.monday));
            if (week.ahead) {
                ahead++;
                expect(row.classList.contains("spine-row--ahead"), `${week.key} is ahead and is not drawn as one`)
                    .toBe(true);
                expect(row.querySelector(".spine-fill"), "a week that has not happened must draw no fill")
                    .toBeNull();
                expect(text(row.querySelector(".spine-ahead")),
                    "the outline says 'not yet' in shape and SC 1.4.1 needs the word as well")
                    .toBe(TRAINING.ahead_label);
                expect(row.querySelector(".spine-km"), "an ahead week has no figures to print").toBeNull();
                continue;
            }
            elapsed++;
            expect(row.classList.contains("spine-row--ahead")).toBe(false);
            expect(text(row.querySelector(".spine-km")),
                `${week.key} prints a distance the module did not derive`)
                .toBe(`${kmFromMetres(week.totals.metres).toFixed(2)}${unit}`);
            expect(text(row.querySelector(".spine-sessions")))
                .toBe(`${week.totals.sessions}${TRAINING.sessions_head}`);
            expect(text(row.querySelector(".spine-time")))
                .toBe(`${hoursMinutes(week.totals.moving_seconds)}${TRAINING.time_head}`);
        }
        expect(elapsed, `${page} drew no elapsed week — the figure assertions are vacuous`).toBeGreaterThan(0);
        expect(ahead, `${page} drew no week ahead — the outline assertions are vacuous`).toBeGreaterThan(0);
    });

    /**
     * THE BAR'S LENGTH IS THE DATA, so it is the one inline value on this page that has to be
     * checked against the derivation rather than merely present. A fill of a constant width is a
     * page that looks like a series and is not one.
     */
    it.each(PAGES)("gives each bar the length its own week earned, against the busiest (%s)", (page) => {
        const iso = buildDateOf(page);
        const sport = SPORT_OF[page];
        const rows = seasonSpine(Number(iso.slice(0, 4)), sport, iso);
        const totals = seasonTotals(rows, sport);
        expect(totals.busiest_metres, "no week has any distance — the scale is vacuous").toBeGreaterThan(0);

        const weeks = rows.filter((r) => r.kind === "week");
        const drawn = [...docOf(page).querySelectorAll(".spine-weeks > .spine-row")];
        const widths = new Set<string>();
        for (const [i, week] of weeks.entries()) {
            const fill = drawn[i]!.querySelector(".spine-fill");
            if (week.ahead) continue;
            expect(fill, `${week.key} has happened and draws no fill`).not.toBeNull();
            const value = /--fill:\s*([\d.]+)%/.exec(fill!.getAttribute("style") ?? "")?.[1];
            expect(value, `${week.key}'s fill carries no width`).toBeDefined();
            widths.add(value!);
            expect(Number(value), `${week.key}'s bar is not its share of the busiest week`)
                .toBeCloseTo((week.totals.metres / totals.busiest_metres) * 100, 3);
        }
        expect(widths.size, "every bar is the same length — the page draws a series that is not one")
            .toBeGreaterThan(3);
        expect([...widths].map(Number).some((v) => v > 99.9),
            "no bar reaches the scale, so nothing on the page is the busiest week").toBe(true);
    });

    it.each(PAGES)("prints the year the module summed, and never adds the races to it (%s)", (page) => {
        const iso = buildDateOf(page);
        const sport = SPORT_OF[page];
        const unit = seasonUnit(sport);
        const totals = seasonTotals(seasonSpine(Number(iso.slice(0, 4)), sport, iso), sport);
        const summary = text(docOf(page).querySelector("[data-card] p"));

        const km = kmFromMetres(totals.metres).toFixed(2);
        const races = kmFromMetres(totals.race_metres).toFixed(2);
        expect(summary).toContain(TRAINING.summary_distance
            .replace("{km}", km).replace("{unit}", unit).replace("{races}", races));
        expect(Number(races), "the races' share cannot exceed the year it is quoted out of")
            .toBeLessThanOrEqual(Number(km));
        expect(summary).toContain((totals.sessions === 1 ? TRAINING.summary_effort_one : TRAINING.summary_effort)
            .replace("{count}", String(totals.sessions)).replace("{time}", hoursMinutes(totals.moving_seconds)));
    });

    it.each(PAGES)("hangs every race on the week it was ridden in, and stagger-indexes each bib (%s)", (page) => {
        const iso = buildDateOf(page);
        const sport = SPORT_OF[page];
        const groups = groupSpine(seasonSpine(Number(iso.slice(0, 4)), sport, iso));
        const expected = groups.filter((g) => g.races.length > 0);
        expect(expected.length, `${page} expects no races — this assertion would be vacuous`).toBeGreaterThan(0);

        const list = docOf(page).querySelector(".spine-weeks")!;
        const children = [...list.children];
        for (const group of expected) {
            const at = children.findIndex((c) => text(c.querySelector(".spine-no")) === group.week.key.slice(5));
            const after = children[at + 1];
            expect(after?.classList.contains("spine-race"),
                `${group.week.key} holds ${group.races.length} race(s) and the row after it is not their list`)
                .toBe(true);
            expect([...after!.querySelectorAll(".bib-cell .bib-name")].map((n) => text(n)),
                `${group.week.key} draws the wrong races`)
                .toEqual(group.races.map((r) => r.event.name));
        }

        const cells = [...docOf(page).querySelectorAll(".bib-cell")];
        expect(cells.map((c) => /--i:\s*(\d+)/.exec(c.getAttribute("style") ?? "")?.[1]),
            "every bib must carry its own render index as --i, or `calc()` over an unset custom "
            + "property is invalid and the whole cascade collapses onto one frame")
            .toEqual(cells.map((_, i) => String(i)));
    });

    it.each(PAGES)("counts each chip's own page, and wears no plate anywhere (%s)", (page) => {
        const doc = docOf(page);
        const iso = buildDateOf(page);
        const year = Number(iso.slice(0, 4));
        const chips = [...doc.querySelectorAll(".training-filter .chip")];
        expect(chips.length, "the sport chips are missing").toBe(GOALS.length + 1);

        const counts = [seasonTotals(seasonSpine(year, undefined, iso)).sessions,
                        ...GOALS.map((g) => seasonTotals(seasonSpine(year, g.sport, iso), g.sport).sessions)];
        expect(chips.map((c) => text(c.querySelector(".training-filter-count"))),
            "a chip promises a count the page it opens does not print")
            .toEqual(counts.map(String));

        const current = chips.filter((c) => c.getAttribute("aria-current") === "page");
        expect(current, `${page} must mark exactly one chip as the page you are on`).toHaveLength(1);

        expect(doc.querySelectorAll(".control-cta"),
            "the plate is a card's SINGLE action and this page is a wall, not a card — every control "
            + "here is chrome and wears a chip").toHaveLength(0);
    });

    /**
     * THE POLARITY, MEASURED. Three ratios, and the first is the one a contrast checker cannot
     * ask: whichever region stands further from the card is the one a reader takes for the mark.
     */
    it("draws the marked region as the mark, in both themes", () => {
        const css = pageCss(PAGES[0]);
        const rules = parseRules(css);
        // UNCONDITIONAL RULES ONLY. `@media print` and `@media (forced-colors: active)` both
        // repaint this bar with a literal, deliberately — see WeekRow.astro — and taking the last
        // declaration in document order would ask this gate about paper.
        const paints = (selector: string, prop: string, not?: string) => {
            const hit = rules.filter((r) => !r.at && decl(r.body, prop)
                && r.selectors.some((s) => s.includes(selector) && (not === undefined || !s.includes(not))));
            expect(hit.length, `no unconditional rule paints ${prop} on ${selector}`).toBeGreaterThan(0);
            return decl(hit[hit.length - 1]!.body, prop)!;
        };
        expect(paints(".spine-fill", "background-color"),
            "the bar must own its fill colour rather than borrowing one").toContain("--progress-fill");
        // The ahead variant is excluded by name: it deliberately paints the outline value rather
        // than a track, and it is asserted as that value in its own test below.
        expect(paints(".spine-bar", "background-color", "--ahead"),
            "the bar must own its track colour").toContain("--progress-track");

        const token = (name: string, theme: string) => {
            const found = PALETTE.find((t) => t.token === name);
            expect(found, `${name} is not in the theme blocks`).toBeDefined();
            return valueIn(found!, theme);
        };
        for (const theme of ["light", "dark"]) {
            const fill = token("--progress-fill", theme);
            const track = token("--progress-track", theme);
            const card = token("--card-background", theme);
            const fillVsCard = contrast(fill, card);
            const trackVsCard = contrast(track, card);
            expect(fillVsCard,
                `${theme}: fill ${fill} at ${fillVsCard.toFixed(2)}:1 must exceed track ${track} at `
                + `${trackVsCard.toFixed(2)}:1, or the empty part of a week reads as the full part`)
                .toBeGreaterThan(trackVsCard);
            expect(trackVsCard, `${theme}: the track is ${trackVsCard.toFixed(2)}:1 against its card — too `
                + "loud for the unmarked region of fifty-two rows").toBeLessThanOrEqual(2);
            expect(contrast(fill, track),
                `${theme}: the boundary between the two regions is ${contrast(fill, track).toFixed(2)}:1`)
                .toBeGreaterThanOrEqual(3);
        }
    });

    /**
     * A WEEK AHEAD IS DRAWN IN THE VALUE A BIB NOT YET EARNED IS DRAWN IN — one rule, three
     * objects. Asserted as the literal `color-mix` the bib and the chip both carry, because the
     * whole claim is that they are the SAME value rather than two similar ones.
     */
    it("draws a week that has not happened exactly like a race not yet earned", () => {
        const wall = pageCss("dist/patches/index.html");
        const bib = /\.bib--booked[^{]*\{[^}]*border-color:\s*([^;}]+)/.exec(wall)?.[1]?.trim();
        expect(bib, "the wall ships no booked-bib hairline, so this comparison would be vacuous").toBeTruthy();

        const spine = /\.spine-row--ahead[^{]*\.spine-bar[^{]*\{[^}]*background-color:\s*([^;}]+)/
            .exec(pageCss(PAGES[0]))?.[1]?.trim();
        expect(spine, "the spine ships no outline for a week that has not happened").toBeTruthy();
        expect(spine!.replace(/\s+/g, ""),
            "the outline means 'not earned, not yet, nothing here' and it must mean it in one value")
            .toBe(bib!.replace(/\s+/g, ""));
    });

    /**
     * THE TWIN IS THE PAGE, NOT A SUMMARY OF IT. Both are rendered from `seasonSpine`, so what is
     * asserted is that the DOCUMENT carries the same figures — a document that restated a figure
     * would match its own snapshot perfectly and say something else from the page beside it.
     */
    it.each(PAGES)("serves a markdown twin carrying the page's own figures (%s)", (page) => {
        const sport = SPORT_OF[page];
        const iso = buildDateOf(page);
        const href = docOf(page)
            .querySelector('link[rel="alternate"][type="text/markdown"]')?.getAttribute("href");
        expect(href, `${page} announces no markdown twin`).toBe(sport === undefined ? "/training.md" : `/training/${sport}.md`);
        const served = read(`dist${href}`);
        expect(served, "the route and the renderer must produce one document").toBe(renderTrainingSpine(sport));

        const weeks = seasonSpine(Number(iso.slice(0, 4)), sport, iso).filter((r) => r.kind === "week");
        const lines = served.split("\n").filter((l) => l.startsWith("- "));
        expect(lines, `${href} lists ${lines.length} weeks against ${weeks.length} on the page`)
            .toHaveLength(weeks.length);
        for (const [i, week] of weeks.entries()) {
            expect(lines[i], `${href} and the page disagree about ${week.key}`).toContain(week.key);
            if (week.ahead) {
                expect(lines[i]).toContain(TRAINING.ahead_label);
            } else {
                expect(lines[i]).toContain(kmFromMetres(week.totals.metres).toFixed(2));
                expect(lines[i]).toContain(hoursMinutes(week.totals.moving_seconds));
            }
        }
    });
});
