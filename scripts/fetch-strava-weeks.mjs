// Fetches one ISO week-year of Strava sessions and writes one module per week into
// src/data/weeks/. Runs in GitHub Actions (.github/workflows/strava-progress.yml) on node 20+
// built-in fetch — zero dependencies. Fail-loud: any error exits non-zero, the workflow goes
// red, and no file is written.
//
// THE SIBLING SCRIPT FETCHES TOTALS AND THIS ONE FETCHES SESSIONS, and they are two scripts
// rather than one because they call two endpoints for two different questions.
// `GET /athletes/{id}/stats` returns year/recent/all-time totals ONLY — there is no
// per-activity or per-week data in it at all — so the series needs
// `GET /athlete/activities`, which is a different shape, a different pagination and a
// different hazard. They run in the SAME JOB, seconds apart, so the year total and the weeks
// it should sum to always move together; see the workflow.
//
// THE HAZARD, WHICH IS THE REASON THIS FILE IS WRITTEN THE WAY IT IS: a summary activity
// already carries the private fields. No detail fetch is needed to leak physiology or a home
// address — measured on 2026-08-27, over the 200 most recent activities, `name`, `map`,
// `start_latlng` and `end_latlng` came back on all 200, `suffer_score` on 199, `device_name`
// on 195 and `average_heartrate` on 170, out of 48 keys on each object. So `toSession` below
// PROJECTS onto six named keys, one at a time. It never spreads, never deletes, and every
// field it copies is validated on the way past.
//
// A FULL REWRITE OF THE YEAR EVERY RUN, NEVER A WATERMARK. It is two requests, and it is the
// only shape that sees a retro-edited distance or a late upload — which a "since I last
// looked" fetch cannot. What pays for it is byte-stability: an unchanged year writes
// byte-identical files, so the workflow's staged-index gate finds nothing and no commit,
// merge or deploy happens. Break that and this repository deploys every night.
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { singaporeDate } from "./fetch-strava-progress.mjs";
import { accessToken } from "./strava-auth.mjs";

// This script holds no configuration of its own: the athlete comes from the
// STRAVA_ATHLETE_ID repository variable, and the year is either today's in Singapore or the
// STRAVA_WEEKS_YEAR the workflow's `year` input supplies for a backfill.
// See README.md "Configuration".

const API = "https://www.strava.com/api/v3";
const DAY = 86400000;

/**
 * THE ISO-8601 WEEK A LOCAL DATETIME FALLS IN, as `2026-W35`.
 *
 * DUPLICATED FROM `src/lib/training.ts` ON PURPOSE, and the duplication is GATED rather than
 * merely admitted: this is a zero-dependency `.mjs` that Actions runs with no build step, so
 * it cannot import a `.ts`, and `tests/training.test.ts` runs both implementations over one
 * shared table of dated cases and asserts they agree on every one. A silent second
 * implementation is the thing to refuse; a checked one is the only option available here.
 *
 * ONLY THE DATE HEAD IS READ, which is what makes Strava's `start_date_local` safe to use.
 * That field is a local wall clock spelled with a trailing `Z` the API stamps on a value that
 * is not UTC; handing it to `new Date()` would be a real bug and nothing here does.
 */
export function isoWeekKey(startLocal) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(startLocal));
    if (!match) throw new Error(`Not an ISO local datetime: ${JSON.stringify(startLocal)}`);
    const thursday = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    // Monday is 0. Step to this week's Thursday: that day's year IS the ISO week-year.
    thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3);
    const year = thursday.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(year, 0, 4));
    firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
    const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY));
    return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The ISO date of that week's Monday, as `2025-12-29` for `2026-W01`. */
export function isoWeekMonday(key) {
    const match = /^(\d{4})-W(\d{2})$/.exec(String(key));
    if (!match) throw new Error(`Not an ISO week key: ${JSON.stringify(key)}`);
    const fourth = new Date(Date.UTC(Number(match[1]), 0, 4));
    const monday = new Date(fourth.getTime());
    monday.setUTCDate(fourth.getUTCDate() - ((fourth.getUTCDay() + 6) % 7) + (Number(match[2]) - 1) * 7);
    return monday.toISOString().slice(0, 10);
}

/**
 * EVERY ISO WEEK KEY OF ONE WEEK-YEAR, IN ORDER — `2026` yields `2026-W01`…`2026-W53`.
 *
 * THIS IS THE SET THE SWEEP IS SCOPED BY, and computing it rather than globbing `2026-W*.ts`
 * is the whole point. A glob answers a question about filenames; this answers the question the
 * fetch can actually vouch for, which is "which weeks did I just look at". They agree today
 * because the window below is derived from this same set — and if the window is ever narrowed,
 * the sweep narrows with it instead of deleting a week nobody fetched.
 *
 * 28 December is in the last ISO week of its own week-year every year, which is what makes the
 * 52-or-53 question answerable without a table.
 */
export function weekKeysOfYear(year) {
    const last = Number(isoWeekKey(`${year}-12-28`).slice(6));
    return Array.from({ length: last }, (_, i) => `${year}-W${String(i + 1).padStart(2, "0")}`);
}

/**
 * THE FETCH WINDOW FOR A WEEK-YEAR, IN EPOCH SECONDS, WITH EIGHT DAYS OF MARGIN EACH SIDE.
 *
 * `after` and `before` filter on the activity's `start_date`, which is UTC, and every bucket
 * decision downstream is made on `start_date_local`, which is not — so the window has to be
 * wider than the span it is trying to cover or a Monday-morning session falls outside it. The
 * margin is a week plus a day rather than the 14 hours the worst timezone offset needs: it
 * costs nothing (out-of-range weeks are discarded after bucketing) and it survives a race ridden
 * abroad, which this calendar has several of.
 */
export function yearWindow(year) {
    const keys = weekKeysOfYear(year);
    // Midnight in Singapore is 16:00 UTC the previous day; the margin absorbs any other zone.
    const sgtMidnight = (isoDate) => Date.parse(`${isoDate}T00:00:00Z`) - 8 * 3600 * 1000;
    const start = sgtMidnight(isoWeekMonday(keys[0]));
    const end = sgtMidnight(isoWeekMonday(keys[keys.length - 1])) + 7 * DAY;
    return {
        after: Math.floor((start - 8 * DAY) / 1000),
        before: Math.floor((end + 8 * DAY) / 1000),
    };
}

/**
 * ONE ACTIVITY, PROJECTED ONTO THE SIX KEYS THIS SITE KEEPS.
 *
 * EXPLICIT, ONE KEY AT A TIME. Never `{...activity}` and never a `delete` — a spread is a
 * deny-list, and a deny-list is wrong on the day Strava adds a field. `tests/training.test.ts`
 * hands this function a fixture carrying `name`, `map`, `start_latlng`, `average_heartrate`
 * and `suffer_score`, and asserts the PROJECTION rather than the fixture: a test that lists
 * what must be absent passes on the day a new field appears.
 *
 * EVERY FIELD IS VALIDATED AND A BAD ONE THROWS, the way `kmFromMeters` does in the sibling
 * script. This runs unattended at 05:13; the failure that matters is the one that writes a
 * plausible wrong number rather than the one that goes red.
 */
export function toSession(activity) {
    const bad = (field, value) => new Error(`Bad ${field} from Strava: ${JSON.stringify(value)}`);

    const id = String(activity?.id ?? "");
    if (!/^\d+$/.test(id)) throw bad("activity id", activity?.id);

    const sport_type = activity?.sport_type;
    if (typeof sport_type !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(sport_type)) {
        throw bad("sport_type", sport_type);
    }

    const start_local = activity?.start_date_local;
    if (typeof start_local !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$/.test(start_local)) {
        throw bad("start_date_local", start_local);
    }

    const metres = activity?.distance;
    // Zero is legal and common — 34 weight-training sessions recorded none in 2026.
    if (typeof metres !== "number" || !Number.isFinite(metres) || metres < 0) throw bad("distance", metres);

    const seconds = (value, field) => {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw bad(field, value);
        return value;
    };
    const moving_seconds = seconds(activity?.moving_time, "moving_time");
    const elapsed_seconds = seconds(activity?.elapsed_time, "elapsed_time");
    if (elapsed_seconds < moving_seconds) {
        throw new Error(`elapsed_time ${elapsed_seconds} is below moving_time ${moving_seconds} on activity ${id}`);
    }

    return { id, sport_type, start_local, metres, moving_seconds, elapsed_seconds };
}

/**
 * A TOTAL ORDER OVER A WEEK'S SESSIONS, so a re-fetch cannot reorder a file.
 *
 * `start_local` first because that is what a reader of the module wants, then the id to settle
 * two sessions started in the same second — which a duplicated upload really does produce.
 * Without the tiebreak the order would follow whatever order the API paged them in, and the
 * byte-stability contract would hold on most nights and not all of them.
 */
export const orderSessions = (sessions) =>
    [...sessions].sort((a, b) => a.start_local.localeCompare(b.start_local) || a.id.localeCompare(b.id));

/**
 * THE BYTES OF ONE WEEK MODULE.
 *
 * Fixed key order, 4-space indent, one session per line, trailing newline. Every string goes
 * through `JSON.stringify` rather than being interpolated between quotes, so nothing Strava
 * can put in a `sport_type` can close the literal it is written into — the same hardening
 * `scripts/scaffold-race.mjs` carries, for the same reason.
 */
export function renderWeek(sessions) {
    const rows = orderSessions(sessions).map((s) => "    {"
        + `id: ${JSON.stringify(s.id)}, `
        + `sport_type: ${JSON.stringify(s.sport_type)}, `
        + `start_local: ${JSON.stringify(s.start_local)}, `
        + `metres: ${JSON.stringify(s.metres)}, `
        + `moving_seconds: ${JSON.stringify(s.moving_seconds)}, `
        + `elapsed_seconds: ${JSON.stringify(s.elapsed_seconds)}`
        + "},");
    return 'import type {TrainingWeek} from "../../lib/training"\n'
        + "\n"
        + "export default {sessions: [\n"
        + rows.join("\n") + "\n"
        + "]} satisfies TrainingWeek\n";
}

/** Bucket sessions by ISO week, keeping only the weeks the fetch actually covered. */
export function bucketByWeek(sessions, coveredKeys) {
    const covered = new Set(coveredKeys);
    const weeks = new Map();
    for (const session of sessions) {
        const key = isoWeekKey(session.start_local);
        if (!covered.has(key)) continue;
        if (!weeks.has(key)) weeks.set(key, []);
        weeks.get(key).push(session);
    }
    return weeks;
}

async function main() {
    // THIS SCRIPT READS NO ATHLETE ID, AND THAT IS A PROPERTY OF THE ENDPOINT RATHER THAN AN
    // OMISSION. `GET /athlete/activities` is scoped to whoever the access token belongs to —
    // there is no `{id}` in the path, unlike `GET /athletes/{id}/stats` next door, which is why
    // the sibling script needs `STRAVA_ATHLETE_ID` and this one does not. Plan 045 said to reuse
    // that variable rather than add a second; reusing it here would mean READING a value nothing
    // acts on, which this repository already has a name for: a variable nothing reads is not
    // configuration, it is something to go stale. The workflow still supplies it to the step, so
    // the two scripts share one env block.

    // THE WEEK-YEAR TODAY FALLS IN, WHICH IS NOT THE CALENDAR YEAR AND MUST NOT BE.
    //
    // Plan 045 said to take "the Singapore calendar year", and running the boundary found the
    // hole: ISO week 2026-W53 runs Monday 28 December 2026 to Sunday 3 January 2027, so on
    // 1 January 2027 a CALENDAR-year rule asks for week-year 2027 — whose weeks begin on
    // Monday 4 January — and the ride ridden that morning falls in 2026-W53, a week the fetch
    // no longer covers. The 2026 runs had already stopped. Three days of sessions would be
    // dropped every year, silently, and the cross-check in `tests/training.test.ts` would go
    // red against a year total that still counted them.
    //
    // Asking which week-year TODAY is in closes it by construction, because the answer only
    // moves once the previous week-year is complete: `2025-12-30` answers `2026`, and week-year
    // 2025 ended on 28 December; `2027-01-01` answers `2026`, and `2027-01-04` answers `2027`.
    // And it costs the ordinary case nothing — every day of calendar 2026 answers `2026`.
    //
    // A BACKFILL NAMES A WEEK-YEAR TOO, and that is complete for the calendar year of the same
    // name: ISO week-year Y contains every date of calendar year Y by definition.
    //
    // `singaporeDate` is imported rather than re-derived: a second timezone conversion is a
    // second thing to get wrong, and the sibling script's copy already carries the argument.
    const raw = process.env.STRAVA_WEEKS_YEAR;
    if (raw !== undefined && raw !== "" && !/^\d{4}$/.test(raw)) {
        throw new Error(`STRAVA_WEEKS_YEAR is not a four-digit year: ${JSON.stringify(raw)}`);
    }
    const year = raw ? Number(raw) : Number(isoWeekKey(singaporeDate()).slice(0, 4));

    const access_token = await accessToken(process.env);
    const headers = { Authorization: `Bearer ${access_token}` };
    const { after, before } = yearWindow(year);

    // FIVE PAGES IS A CEILING, NOT AN EXPECTATION. A year of this athlete is 230 activities,
    // so two pages; the plan that added this script made "more than five requests for one year"
    // a stop condition, because it means the year is larger than anything measured here and the
    // rate budget (100 requests per 15 minutes) deserves a look before it is spent silently.
    const activities = [];
    for (let page = 1; ; page++) {
        if (page > 5) throw new Error(`More than 5 pages of activities for ${year} — read the note above this line`);
        const url = `${API}/athlete/activities?per_page=200&after=${after}&before=${before}&page=${page}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Activities fetch failed on page ${page}: ${res.status} ${await res.text()}`);
        const batch = await res.json();
        if (!Array.isArray(batch)) throw new Error(`Activities page ${page} is not an array`);
        activities.push(...batch);
        console.log(`page ${page}: ${batch.length} activities (rate usage ${res.headers.get("x-ratelimit-usage") ?? "unknown"})`);
        if (batch.length < 200) break;
    }

    const covered = weekKeysOfYear(year);
    const weeks = bucketByWeek(activities.map(toSession), covered);

    const dir = new URL("../src/data/weeks/", import.meta.url);
    mkdirSync(dir, { recursive: true });

    let written = 0;
    let removed = 0;
    const onDisk = new Set(readdirSync(dir).filter((name) => name.endsWith(".ts") && name !== "index.ts"));
    for (const key of covered) {
        const file = new URL(`./${key}.ts`, dir);
        const sessions = weeks.get(key);
        if (sessions && sessions.length > 0) {
            const next = renderWeek(sessions);
            let current = "";
            try { current = readFileSync(file, "utf8"); } catch { /* new week */ }
            if (current !== next) { writeFileSync(file, next); written++; }
            continue;
        }
        // A COVERED WEEK THAT CAME BACK EMPTY IS DELETED, which is what makes a deleted Strava
        // activity leave this repository. Scoped to `covered` rather than to a `<year>-W*` glob:
        // the two agree today only because `yearWindow` is derived from the same list.
        if (onDisk.has(`${key}.ts`)) { unlinkSync(file); removed++; }
    }

    const sessions = [...weeks.values()].reduce((total, list) => total + list.length, 0);
    console.log(`${year}: ${sessions} sessions across ${weeks.size} weeks — ${written} module(s) written, ${removed} removed`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
