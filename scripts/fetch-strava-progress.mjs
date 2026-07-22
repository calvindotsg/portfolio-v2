// Fetches Strava YTD ride/run totals and writes src/data/strava-progress.json.
// Runs in GitHub Actions (.github/workflows/strava-progress.yml) on node 20+
// built-in fetch — zero dependencies. Fail-loud: any error exits non-zero,
// the workflow goes red, and no file is written.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// This script holds no configuration of its own: the athlete comes from the
// STRAVA_ATHLETE_ID repository variable, and the goal targets live in
// src/lib/constants.ts, which clamps the raw km written here. See README.md
// "Configuration".
export function kmFromMeters(meters, label) {
    if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) {
        throw new Error(`Bad ${label} distance from Strava: ${JSON.stringify(meters)}`);
    }
    // Meters → km, 1 decimal (matches the existing 2246.4 style).
    return Number((meters / 1000).toFixed(1));
}

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

    const progress = {
        cycling_km: kmFromMeters(stats.ytd_ride_totals?.distance, "ride"),
        running_km: kmFromMeters(stats.ytd_run_totals?.distance, "run")
    };

    // Formatting must stay byte-stable (4-space indent, trailing newline, this
    // key order) so unchanged values produce a zero diff and no commit.
    writeFileSync(
        new URL("../src/data/strava-progress.json", import.meta.url),
        JSON.stringify(progress, null, 4) + "\n"
    );
    console.log(`Wrote cycling ${progress.cycling_km} km, running ${progress.running_km} km`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
