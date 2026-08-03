import {beforeAll, describe, expect, it} from "vitest";

import {EVENTS, type RaceEvent, type Recording, recordingsOf} from "../src/lib/constants";

/**
 * EVERY RECORDED ROW IN `EVENTS`, HELD AGAINST THE ACTIVITY IT NAMES.
 *
 * WHY THIS EXISTS. A finishing time and a distance are typed in by hand, and the source
 * used to be a screenshot of Strava's web page. Both ways that goes wrong were real:
 *
 *   THE LAST DIGIT IS A CONVERSION CHOICE, and this file and `km` have to make the SAME one or
 *   every row is off by 0.01. It is metres rounded half-up to two places, because the API's
 *   metres are the source of record and that is the maintainer's instruction. See `km` in
 *   constants.ts for why the rule does NOT rest on what Strava's own surfaces render, and for
 *   the evidence that they truncate.
 *
 *   AN ACTIVITY CAN BE EDITED AFTER YOU READ IT, so a screenshot is a reading of a MUTABLE
 *   record. One row was authored from a screenshot showing 13:36:10 elapsed, 6:31:11 moving
 *   and 433 m of elevation. An hour later the API answered 10:47:28, 5:54:53 and 468.5 m for
 *   the same activity, with the distance unchanged at 87.42 km — the most a screenshot can
 *   witness, and enough to say it was re-processed rather than cropped, since a crop of that
 *   size would move a 2dp distance. The file was
 *   recording a result the activity no longer claimed and nothing in the repository could have
 *   said so. That row is back in `EVENTS` — the wall draws a DNF now — and this suite holds it
 *   against the API like every other, which is the point: it is the failure this suite exists
 *   for, on a row that was once removed for want of a state to draw it in.
 *
 *   DO NOT TRY TO EXPLAIN THE OLD FIGURE — one revision of this note argued the row must have
 *   been quoting a whole-day total, because 13:36:10 matches nothing derivable from the
 *   activity today. It does not have to: a pre-edit value has no obligation to be consistent
 *   with anything that survived the edit. The check is the point, not the diagnosis.
 *
 * IT IS OPT-IN, AND THAT IS THE LOAD-BEARING PART. `pnpm test` is the change gate and both
 * deploy jobs sit behind it, so a network call in the default run hands Strava — or a
 * flight's wifi — a veto over deploying this site. A rate limit, an expired token or a
 * five-second timeout would read as "the site is broken". So it skips unless asked:
 *
 *     STRAVA_VERIFY=1 STRAVA_CLIENT_ID=… STRAVA_CLIENT_SECRET=… STRAVA_REFRESH_TOKEN=… \
 *       pnpm vitest run tests/strava-verify.test.ts
 *
 * Credentials come from the environment, never from this file and never from a secret
 * store read in here: the repo's rule is that a configurable value lives in a GitHub
 * secret, a GitHub variable or `src/lib/constants.ts`, and `scripts/fetch-strava-progress.mjs`
 * reads the same four names. Locally they can come out of 1Password —
 * `op read 'op://Personal/calvindotsg-strava/refresh_token'` and its siblings — which is
 * where the workflow's own comment says the durable copies are.
 *
 * IT NEEDS `activity:read_all`, NOT `activity:read`. A detailed activity read answers 404
 * — not 403 — when the token lacks the scope, so an under-scoped token looks exactly like
 * a wrong id. And a `followers_only` activity needs the `_all` half, and such a row cannot be
 * checked any other way, since a logged-out page leaks a title only for `everyone` visibility.
 * (No count here on purpose: how many rows are `followers_only` is a property of the data on
 * the day you read this, and this note has already been wrong about it once. Treat it as an
 * example of the class rather than a census.)
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT is `km` against a route's advertised distance. The
 * rule is that `km` is the LINKED activity's distance — see the field's own note — so the
 * activity is the authority here, not the event.
 */
const ENABLED = process.env.STRAVA_VERIFY === "1";

type Detail = {distance: number; elapsed_time: number; start_date_local: string; name: string; visibility?: string};

const recorded: readonly RaceEvent[] = EVENTS.filter((e) => recordingsOf(e).length > 0);

/**
 * EVERY (race, recording) PAIR, flattened, because the per-activity assertions below are
 * about a RECORDING and the race is only there to name it in the failure message. A race
 * recorded in parts contributes one pair per part.
 */
const pairs: readonly {event: RaceEvent; part: Recording}[] =
    recorded.flatMap((event) => recordingsOf(event).map((part) => ({event, part})));

/** Whole seconds -> `H:MM:SS`, the shape `elapsed_time` is authored in. */
const hms = (total: number): string => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Metres -> km at two places, rounded half-up, which is what `km` holds.
 *
 * SCALE TO INTEGER HUNDREDTHS FIRST. The obvious `Number((metres / 1000).toFixed(2))` gives a
 * DIFFERENT answer on a row that ships: 78595.0 m is 78.60 here and 78.59 through `toFixed`,
 * because 78.595 lands just below the decimal midpoint once it is a binary double. Dividing by
 * ten and rounding integer hundredths is the true half-up. Swapping this for `toFixed` reddens
 * correct data — or, worse, invites someone to edit the row to match the helper.
 */
const km2 = (metres: number): number => Math.round(metres / 10) / 100;

const details = new Map<string, Detail>();

describe.skipIf(!ENABLED)("EVENTS against the Strava API", () => {
    beforeAll(async () => {
        const {STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN} = process.env;
        if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
            throw new Error("STRAVA_VERIFY=1 needs STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and STRAVA_REFRESH_TOKEN");
        }
        const tokenRes = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                refresh_token: STRAVA_REFRESH_TOKEN,
                grant_type: "refresh_token",
            }),
        });
        if (!tokenRes.ok) throw new Error(`token refresh failed: ${tokenRes.status}`);
        const {access_token} = await tokenRes.json() as {access_token?: string};
        if (!access_token) throw new Error("no access_token in the refresh response");

        for (const {event: e, part} of pairs) {
            const id = part.id;
            const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
                headers: {authorization: `Bearer ${access_token}`},
            });
            // 404 here is ambiguous on purpose in Strava's API: a wrong id and a token
            // without `activity:read_all` answer identically. Say so, or the next reader
            // spends the afternoon checking ids that were right all along.
            if (!res.ok) {
                throw new Error(
                    `activity ${id} (${e.name}) returned HTTP ${res.status}`
                    + (res.status === 404 ? " — a wrong id, OR a token without activity:read_all" : ""),
                );
            }
            details.set(id, await res.json() as Detail);
        }
    }, 120_000);

    it("has rows to check, so the assertions below are not vacuous", () => {
        expect(recorded.length).toBeGreaterThan(0);
        expect(pairs.length).toBeGreaterThanOrEqual(recorded.length);
        expect(details.size).toBe(pairs.length);
    });

    it("agrees with each activity's own distance, to the two places a bib prints", () => {
        for (const {event: e, part} of pairs) {
            const d = details.get(part.id)!;
            // `toBe`, NOT `toBeCloseTo(…, 2)`, and the difference is the whole gate. `toBeCloseTo`
            // with 2 digits passes whenever the gap is under 0.005, which is EVERY value the wrong
            // authoring routes produce: |m/1000 − round(m/10)/100| ≤ 0.005 always, so a `km` pasted
            // as the API's raw metres over 1000 — `160.566` — was green here AND green in the whole
            // suite, while shipping `160.566 km` to llms.txt and `160.57` to the bib. The comment on
            // `km` promises this suite reddens "a figure typed in by any other route"; only exact
            // equality keeps that promise. Safe because `Math.round(m/10)/100` and a 2dp literal
            // parse to the same double — checked with `Object.is` on all eight rows.
            expect(
                part.km,
                `${e.date} ${e.name}: file says ${part.km} km, activity ${part.id} is `
                + `${d.distance} m, which ROUNDS to ${km2(d.distance)} km. A gap of exactly 0.01 `
                + "means the figure was truncated rather than rounded — this file held that rule "
                + "for four commits and it was wrong; see the note above `km` in constants.ts. "
                + "More decimal places than two means it was pasted from the API unconverted.",
            ).toBe(km2(d.distance));
        }
    });

    it("agrees with each activity's own elapsed time, to the second", () => {
        for (const {event: e, part} of pairs) {
            const d = details.get(part.id)!;
            expect(
                part.elapsed_time,
                `${e.date} ${e.name}: file says ${part.elapsed_time}, activity ${part.id} `
                + `says ${hms(d.elapsed_time)}. An activity that has been cropped or re-uploaded `
                + "since the figure was typed in moves this.",
            ).toBe(hms(d.elapsed_time));
        }
    });

    /**
     * THE RACE'S OWN TWO FIGURES, WHICH ARE NOT ANY ONE ACTIVITY'S ONCE A RACE IS SPLIT.
     * This is where the model earns its keep: before it, the suite could only ever check the
     * single linked ride, so a race recorded in two files was verified against one of them
     * and the other half went unseen.
     *
     * `km` IS THE SUMMED METRES CONVERTED ONCE, not the sum of the parts' converted figures.
     * Two roundings can compound where one cannot. The two agree on both split races in
     * `EVENTS` today and are not guaranteed to in general — which is exactly why this
     * assertion reads the metres rather than adding up `part.km`, and why nothing else in the
     * suite can stand in for it.
     */
    it("agrees with the summed metres of all a race's recordings, converted once", () => {
        for (const e of recorded) {
            const metres = recordingsOf(e).reduce((sum, part) => sum + details.get(part.id)!.distance, 0);
            expect(
                e.km,
                `${e.date} ${e.name}: file says ${e.km} km, its ${recordingsOf(e).length} recording(s) `
                + `sum to ${metres} m, which ROUNDS to ${km2(metres)} km. Sum the metres and convert `
                + "ONCE — adding up the parts' printed figures is a second rounding.",
            ).toBe(km2(metres));
        }
    });

    /**
     * `elapsed_time` IS FIRST START TO LAST STOP, AND THAT IS NOT THE SUM OF THE PARTS.
     * Elapsed already contains stops, so it must not depend on where the rider happened to
     * press the button — a stop that falls on an activity boundary is a recording artifact,
     * not a fact about the race. On the 2024 round-island ride the span is 10:05:34 against
     * 7:22:15 summed, and the 2h43m in the bike shop is exactly the kind of stop a single
     * activity's elapsed would have contained anyway.
     *
     * Every `start_date_local` carries the same trailing `Z`, so parsing them as instants is
     * safe for a DIFFERENCE even though they are local wall-clock times.
     */
    it("agrees with the span from the first recording's start to the last one's stop", () => {
        for (const e of recorded) {
            const parts = recordingsOf(e).map((part) => details.get(part.id)!);
            const starts = parts.map((d) => Date.parse(d.start_date_local));
            const stops = parts.map((d, i) => starts[i] + d.elapsed_time * 1000);
            const span = Math.round((Math.max(...stops) - Math.min(...starts)) / 1000);
            expect(
                e.elapsed_time,
                `${e.date} ${e.name}: file says ${e.elapsed_time}, first start to last stop is `
                + `${hms(span)} across ${parts.length} recording(s). The SUM of the parts' elapsed `
                + "times is not this figure and must not be used.",
            ).toBe(hms(span));
        }
    });

    /**
     * RECORDINGS ARE IN THE ORDER THEY WERE RIDDEN, and nothing offline can know that.
     *
     * The order is not cosmetic: the bib prints one line per recording in array order, so a
     * transposed pair shows a reader the second half of a race above the first. It is also
     * the assumption the span rule leans on — first start to last stop only reads as "the
     * race" if the parts are the race in sequence.
     *
     * The file holds ids, distances and clocks; only the API holds a START TIME, so this is
     * the one place the claim can be checked at all. Ascending and STRICT: two recordings
     * cannot begin at the same instant.
     */
    it("lists each race's recordings in the order they were ridden", () => {
        for (const e of recorded) {
            const starts = recordingsOf(e).map((part) => Date.parse(details.get(part.id)!.start_date_local));
            for (let i = 1; i < starts.length; i++) {
                expect(
                    starts[i] > starts[i - 1],
                    `${e.date} ${e.name}: recording ${i + 1} starts at `
                    + `${details.get(recordingsOf(e)[i].id)!.start_date_local}, which is not after recording ${i} at `
                    + `${details.get(recordingsOf(e)[i - 1].id)!.start_date_local}. The bib prints them in array `
                    + "order, so a transposed pair shows the second half of a race above the first.",
                ).toBe(true);
            }
        }
    });

    /**
     * THE TRANSPOSITION GUARD, and it is the one thing here no amount of care with a
     * screenshot replaces: two valid ids swapped between two races produce a wall where every
     * link resolves and every bib looks right, each pointing at the other's ride. Comparing
     * the DATE is what catches it, because the one thing a race and its recording must share
     * is the day it happened.
     */
    it("points each race at an activity recorded on that race's own day", () => {
        for (const {event: e, part} of pairs) {
            const d = details.get(part.id)!;
            expect(
                d.start_date_local.slice(0, 10),
                `${e.date} ${e.name} points at activity ${part.id} ("${d.name}"), which `
                + `started on ${d.start_date_local.slice(0, 10)} — two ids transposed between races `
                + "is the failure this catches",
            ).toBe(e.date);
        }
    });
});
