// Fetches Strava YTD ride/run totals and writes src/data/strava-progress.json.
// Runs in GitHub Actions (.github/workflows/strava-progress.yml) on node 20+
// built-in fetch — zero dependencies. Fail-loud: any error exits non-zero,
// the workflow goes red, and no file is written.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// This script holds no configuration of its own: the athlete comes from the
// STRAVA_ATHLETE_ID repository variable, and the goal targets live in
// src/lib/constants.ts, which clamps the raw km written here. See README.md
// "Configuration".
/**
 * A YEAR'S TOTAL, IN KILOMETRES TO ONE PLACE, ROUNDED DOWN.
 *
 * DOWN, NOT HALF-UP, AND IT IS THE SAME RULE `kmFromMetres` FOLLOWS IN src/lib/constants.ts —
 * the site's other conversion, which turns a race's metres into the figure on its bib. Strava
 * displays what it received rounded down, so both figures agree with the source they quote, and
 * neither ever claims a metre nobody rode. Read the note above `kmFromMetres` for the argument;
 * this is its sibling, and changing one without the other puts the goal card and the wall on
 * different conventions.
 *
 * ONE DECIMAL RATHER THAN TWO, deliberately: this is a year's total against a four-figure
 * target, printed as `2246.4`, where the second decimal would be noise. That is the ONLY
 * difference between the two functions, and it is why this is not shared code — the other side
 * is TypeScript that this zero-dependency script cannot import.
 *
 * SCALE TO INTEGER TENTHS FIRST, and do not reach for `Number((meters / 1000).toFixed(1))`:
 * it rounds the double it is handed, so it agrees with this rule on some totals and not others.
 * 2246480 m is 2246.5 through it and 2246.4 here; 2246450 m is 2246.4 through BOTH, because
 * 2246.45 is 2246.4499999999998 once it is binary. An earlier revision of this comment used
 * that second figure as the example and was wrong — the test beside it was green under the very
 * implementation it was added to exclude.
 */
export function kmFromMeters(meters, label) {
    if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) {
        throw new Error(`Bad ${label} distance from Strava: ${JSON.stringify(meters)}`);
    }
    return Math.floor(meters / 100) / 10;
}

// The Singapore calendar date. The cron fires 21:13 UTC, which is 05:13 the NEXT
// morning in Singapore, so a UTC-derived stamp is off by one on every scheduled
// run for the only reader this site has. `en-CA` yields ISO order.
export function singaporeDate(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(now);
}

/**
 * The bytes to write, given the fetched km and whatever is already on disk.
 *
 * `updated_at` MUST survive a run that changes nothing. The workflow commits only
 * when `git diff --quiet` reports a change, and that gate is the only thing
 * standing between this repo and a commit-push-deploy every single night. Stamping
 * the date unconditionally makes the file differ on every run by construction, so
 * the gate can never fire — verified by running it: an identical-km file carrying a
 * fresh date reports CHANGED.
 *
 * So the date means "the day the kilometres last MOVED", not "the day they were
 * last checked", and the page's "Updated" line has to be true of that.
 *
 * A missing or malformed file is treated as a first run and stamped fresh, rather
 * than thrown. The fail-loud posture elsewhere in this script is about bad data
 * from Strava; turning a bootstrap into a red workflow would be a different thing.
 */
export function nextProgress(cycling_km, running_km, previousRaw, today = singaporeDate()) {
    let previous = null;
    try {
        const parsed = JSON.parse(previousRaw);
        if (parsed && typeof parsed === "object") previous = parsed;
    } catch { /* first run, or a hand-mangled file — stamp fresh */ }

    const unchanged = previous
        && previous.cycling_km === cycling_km
        && previous.running_km === running_km
        && typeof previous.updated_at === "string";

    // Key order is part of the byte-stability contract, alongside the 4-space
    // indent and the trailing newline. (The commit message reads keys by name, so
    // it is order-indifferent — the diff is not.)
    return {
        cycling_km,
        running_km,
        updated_at: unchanged ? previous.updated_at : today
    };
}

export const serialise = (progress) => JSON.stringify(progress, null, 4) + "\n";

async function main() {
    const env = (name) => {
        const value = process.env[name];
        if (!value) throw new Error(`Missing env: ${name}`);
        return value;
    };

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: env("STRAVA_CLIENT_ID"),
            client_secret: env("STRAVA_CLIENT_SECRET"),
            refresh_token: env("STRAVA_REFRESH_TOKEN"),
            grant_type: "refresh_token"
        })
    });
    if (!tokenRes.ok) throw new Error(`Token refresh failed: ${tokenRes.status} ${await tokenRes.text()}`);
    // The response contains a rotated refresh_token. It is IGNORED by design
    // (static-secret, fail-loud posture — see plan 015). Do not persist it.
    const { access_token } = await tokenRes.json();

    const statsRes = await fetch(`https://www.strava.com/api/v3/athletes/${env("STRAVA_ATHLETE_ID")}/stats`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    if (!statsRes.ok) throw new Error(`Stats fetch failed: ${statsRes.status} ${await statsRes.text()}`);
    const stats = await statsRes.json();

    const target = new URL("../src/data/strava-progress.json", import.meta.url);
    let previousRaw = "";
    try { previousRaw = readFileSync(target, "utf8"); } catch { /* first run */ }

    const progress = nextProgress(
        kmFromMeters(stats.ytd_ride_totals?.distance, "ride"),
        kmFromMeters(stats.ytd_run_totals?.distance, "run"),
        previousRaw
    );

    // Formatting must stay byte-stable (4-space indent, trailing newline, this
    // key order) so unchanged values produce a zero diff and no commit.
    writeFileSync(target, serialise(progress));
    console.log(`Wrote cycling ${progress.cycling_km} km, running ${progress.running_km} km`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
