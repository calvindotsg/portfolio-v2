import {readFileSync} from "node:fs";

import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import {EVENTS, GOAL_YEAR, GOALS, type Goal} from "../src/lib/constants";
import stravaProgress from "../src/data/strava-progress.json";
import {
    UPDATED_AT, bookedAhead, daysRemaining, formatDateline, goalStatus, goalStatusLine,
    parseIsoDate, stampYearMatchesGoalYear,
} from "../src/lib/projection";
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
 *   goal-card text column   158px   (1024px wide; 177 at 1100, 190 from 1152 up)
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

    it("counts days to 31 December and never goes negative", () => {
        expect(daysRemaining("2026-07-27")).toBe(157);
        expect(daysRemaining("2026-12-31")).toBe(0);
        expect(daysRemaining("2027-03-01")).toBe(0);
    });

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
    });
});

describe("required rate", () => {
    it("produces the figures the page renders today", () => {
        expect(goalStatus(goalBySport("cycling"))).toEqual(
            expect.objectContaining({kind: "rate", kmPerWeek: 71}));
        expect(goalStatus(goalBySport("running"))).toEqual(
            expect.objectContaining({kind: "rate", kmPerWeek: 18}));
    });

    it("rounds UP, because a rounded-down rate followed exactly MISSES the goal", () => {
        // Cycling needs 70.2818 km/wk. Floor and round both give 70, which over the
        // remaining 22.43 weeks delivers 1570.00 km against 1576.32 needed.
        const cycling = goalStatus(goalBySport("cycling"));
        if (cycling.kind !== "rate") throw new Error("expected a rate");
        const weeks = cycling.days / 7;
        expect(cycling.kmPerWeek * weeks).toBeGreaterThanOrEqual(cycling.km);
        expect((cycling.kmPerWeek - 1) * weeks).toBeLessThan(cycling.km);
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
        expect(goalStatus(skewed).kind).toBe("rate");
        // From the clamped field it would read 10 km short with 63.3 km booked,
        // and report the goal as already covered.
        expect(goalStatus({...base, raw_progress: 590}).kind).toBe("covered");
    });

    it("handles every degenerate state distinctly", () => {
        const base = goalBySport("running");
        expect(goalStatus({...base, raw_progress: base.total_goal}).kind).toBe("met");
        // Booked races alone cover the remainder.
        expect(goalStatus({...base, raw_progress: 560}).kind).toBe("covered");
        // Year over.
        expect(goalStatus({...base, raw_progress: 0}, "2026-12-31").kind).toBe("closed");
        // Final fortnight: an absolute total, not a weekly rate.
        expect(goalStatus({...base, raw_progress: 0}, "2026-12-25").kind).toBe("final");
        // Unparseable input renders nothing rather than a guess.
        expect(goalStatus(base, "2026-02-30").kind).toBe("unknown");
        expect(goalStatus({...base, total_goal: 0}).kind).toBe("unknown");
        expect(goalStatus({...base, raw_progress: Number.NaN}).kind).toBe("unknown");
    });

    /**
     * The status line sits in a 110.02px column. There is no layout engine here, so
     * this pins the two things a text-only test CAN pin, and between them they force
     * a re-measurement rather than allowing a silent widening:
     *
     *   1. the fixed literals, against the exact strings that were measured, and
     *   2. a character ceiling for the two generated branches.
     *
     * A character count alone would be the wrong invariant — wide glyphs break it —
     * which is why (1) exists: any new wording has to be added here deliberately,
     * and the comment in `projection.ts` carries the measured widths to add it from.
     */
    it("emits only literals that were measured against the 110px goal-card column", () => {
        // Measured at 12px: "Goal met" 50.22px, "Races cover it" 78.78px, both fit.
        // "Booked races cover it" was the first wording and measured 121.06px — it
        // wrapped at every viewport, and a wrap costs a 20px line the stack has not
        // got. That is the regression this literal list exists to prevent.
        const MEASURED = new Set(["Goal met", "Races cover it"]);
        const base = goalBySport("running");
        expect(goalStatusLine({...base, raw_progress: base.total_goal})).toSatisfy((l: string) => MEASURED.has(l));
        expect(goalStatusLine({...base, raw_progress: 560})).toSatisfy((l: string) => MEASURED.has(l));
    });

    it("keeps the generated branches inside the worst case that was measured", () => {
        // "1000 km/wk to go" = 99.31px, the widest the rate branch can produce, and
        // it fits with 10.7px to spare. "1000 km to go" = 80.11px covers `final`.
        const longest = "1000 km/wk to go";
        for (const goal of GOALS) {
            for (const raw of [0, 1, goal.total_goal / 2, goal.total_goal - 1]) {
                for (const iso of [UPDATED_AT, "2026-12-25"]) {
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

    it("stamps a fresh date as soon as a km value moves", () => {
        const moved = nextProgress(stravaProgress.cycling_km + 0.1, stravaProgress.running_km, raw, "2026-08-01");
        expect(moved.updated_at).toBe("2026-08-01");
        expect(serialise(moved)).not.toBe(raw);
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
        // Two lines each exhausts the right-hand stack's free height and makes the
        // flex column shrink all three cards, the Now card included. Nothing in the
        // suite can see that, so the count is pinned here.
        const lines = [...document.querySelectorAll("[data-card]")]
            .flatMap((c) => [...c.querySelectorAll("span")])
            .filter((s) => /\bto go\b|Goal met|Booked races cover it/.test(s.textContent ?? ""));
        expect(lines.length).toBe(GOALS.length);
    });

    it("does not add a child to <main>", () => {
        // card-fill.test.ts:347 fires at +1 child with a message naming neither
        // cards nor datelines, so an implementer would hunt the wrong red.
        expect(document.querySelector("main")!.children.length).toBe(6);
    });
});
