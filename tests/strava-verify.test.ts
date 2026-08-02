import {beforeAll, describe, expect, it} from "vitest";

import {EVENTS, type RaceEvent} from "../src/lib/constants";

/**
 * EVERY RECORDED ROW IN `EVENTS`, HELD AGAINST THE ACTIVITY IT NAMES.
 *
 * WHY THIS EXISTS. A finishing time and a distance are typed in by hand, and the source
 * used to be a screenshot of Strava's web page. Both ways that goes wrong were real:
 *
 *   THE LAST DIGIT IS A CONVERSION CHOICE, and this file and `km` have to make the SAME one or
 *   every row is off by 0.01. It is metres rounded half-up to two places. It was TRUNCATION for
 *   four commits, on the argument that Strava's page truncates — which turned out to be wrong,
 *   measured on the one rendered figure that could be compared against its own raw metres
 *   (22619.7 m renders as `22.62`, not `22.61`). Two things to carry from that: a conversion
 *   rule needs a case where the two candidates DISAGREE before it is settled at all, and a
 *   rule that arrives with a persuasive rationale is harder to re-open than a bare one.
 *
 *   AN ACTIVITY CAN BE EDITED AFTER YOU READ IT, so a screenshot is a reading of a MUTABLE
 *   record. One row was authored from a screenshot showing 13:36:10 elapsed, 6:31:11 moving
 *   and 433 m of elevation. An hour later the API answered 10:47:28, 5:54:53 and 468.5 m for
 *   the same activity, with the distance unchanged to the centimetre — which is what says it
 *   was re-processed rather than cropped, since a crop moves the distance. The file was
 *   recording a result the activity no longer claimed and nothing in the repository could have
 *   said so. That row has since left `EVENTS` for an unrelated reason (it was a DNF, and the
 *   wall cannot draw one yet), but it is the failure this suite exists for.
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
 * a wrong id. And a `followers_only` activity needs the `_all` half: two of these rows are
 * that, and they are also the two that cannot be checked any other way, since a logged-out
 * page leaks a title only for `everyone` visibility.
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT is `km` against a route's advertised distance. The
 * rule is that `km` is the LINKED activity's distance — see the field's own note — so the
 * activity is the authority here, not the event.
 */
const ENABLED = process.env.STRAVA_VERIFY === "1";

type Detail = {distance: number; elapsed_time: number; start_date_local: string; name: string; visibility?: string};

const recorded: readonly RaceEvent[] = EVENTS.filter((e) => e.strava_activity_id !== undefined);

/** Whole seconds -> `H:MM:SS`, the shape `elapsed_time` is authored in. */
const hms = (total: number): string => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Metres -> km at two places, rounded half-up, which is what `km` holds. Scale first and
 * `Math.round` the integer hundredths rather than `toFixed`, which returns a string and would
 * make every failure message read as a type mismatch instead of a distance one.
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

        for (const e of recorded) {
            const id = e.strava_activity_id!;
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
        expect(details.size).toBe(recorded.length);
    });

    it("agrees with each activity's own distance, to the two places a bib prints", () => {
        for (const e of recorded) {
            const d = details.get(e.strava_activity_id!)!;
            expect(
                e.km,
                `${e.date} ${e.name}: file says ${e.km} km, activity ${e.strava_activity_id} is `
                + `${d.distance} m, which ROUNDS to ${km2(d.distance)} km. A gap of exactly 0.01 `
                + "means the figure was truncated rather than rounded — this file held that rule "
                + "for four commits and it was wrong; see the note above `km` in constants.ts.",
            ).toBeCloseTo(km2(d.distance), 2);
        }
    });

    it("agrees with each activity's own elapsed time, to the second", () => {
        for (const e of recorded) {
            const d = details.get(e.strava_activity_id!)!;
            expect(
                e.elapsed_time,
                `${e.date} ${e.name}: file says ${e.elapsed_time}, activity ${e.strava_activity_id} `
                + `says ${hms(d.elapsed_time)}. An activity that has been cropped or re-uploaded `
                + "since the figure was typed in moves this.",
            ).toBe(hms(d.elapsed_time));
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
        for (const e of recorded) {
            const d = details.get(e.strava_activity_id!)!;
            expect(
                d.start_date_local.slice(0, 10),
                `${e.date} ${e.name} points at activity ${e.strava_activity_id} ("${d.name}"), which `
                + `started on ${d.start_date_local.slice(0, 10)} — two ids transposed between races `
                + "is the failure this catches",
            ).toBe(e.date);
        }
    });
});
