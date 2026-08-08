// Scaffolds one `src/data/races/` module from the Strava activities a race was recorded as.
//
//     op run --env-file=.env.op -- pnpm race:add 12058884605 12058885236
//
// A SCAFFOLD, NEVER A GENERATOR, and the distinction is not modesty. A race can never be
// fully derived from Strava: no source has a DNF, no activity knows the organiser's name for
// the event, and `advertised_km` is the organiser's account of a distance rather than the
// rider's. So this writes exactly what the API knows and leaves every other field ABSENT —
// which makes `pnpm check` the checklist, naming each missing field on the module it is
// missing from, instead of a placeholder that compiles and ships wrong.
//
// It grew out of `.scratchpad/strava-activity-details.sh`, which printed the same fields for
// a human to retype. Retyping is where the three mistakes below were made, each more than
// once, which is why each is a computation here rather than an instruction:
//
//   1. `metres` is the API's `distance` VERBATIM. Not converted, not rounded, not read off a
//      page. `kmFromMetres` in src/lib/race.ts owns the conversion; storing the raw figure is
//      what let the rounding rule change three times without rewriting every row.
//   2. A race's `elapsed_time` is FIRST START TO LAST STOP — never the sum of the parts.
//      Elapsed already contains stops, so the race's clock must not depend on where the rider
//      pressed the button. The 2024 round-island ride is 10:05:34 against 7:22:15 summed; the
//      2h43m in the bike shop is the difference.
//   3. Recordings are ordered by START TIME, because the bib lists them in ride order and the
//      order the ids were typed on the command line is not that.
//
// Zero dependencies, plain node — the same posture as every sibling in this directory.
// Credentials come from `scripts/strava-auth.mjs`, which reads the environment when called.
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { accessToken } from "./strava-auth.mjs";

const RACES_DIR = new URL("../src/data/races/", import.meta.url);

/**
 * STRAVA'S VOCABULARY, MAPPED ONTO THIS SITE'S. The `sport` field joins a race to a goal, so
 * its legal values are whatever `src/data/goals.ts` declares — which this zero-dependency
 * script cannot import, since that file is TypeScript.
 *
 * That makes the map below a copy, and the copy is safe for one reason worth naming: a race
 * whose `sport` matches no goal is caught by `tests/data-contract.test.ts` ("sport … matches
 * no goal") the moment the module lands. A wrong value here cannot reach the site quietly; it
 * reddens the suite, which gates both deploys.
 *
 * An unmapped activity type is a REFUSAL rather than a guess — see `sportOf`.
 */
const SPORT_BY_STRAVA_TYPE = {
    Ride: "cycling",
    VirtualRide: "cycling",
    GravelRide: "cycling",
    MountainBikeRide: "cycling",
    EBikeRide: "cycling",
    Run: "running",
    TrailRun: "running",
    VirtualRun: "running",
};

/**
 * THE RIDER'S OWN CALENDAR DAY, FROM `start_date_local` AND NEVER FROM `start_date`.
 *
 * A FUNCTION BECAUSE IT WAS A LINE INSIDE `main` WITH A COMMENT ASSERTING IT WAS RIGHT, and
 * nothing could ask it anything. MEASURED: changing that line to read `start_date` — the UTC
 * instant — was green across the whole suite. Singapore is UTC+8, so a 06:00 SGT start is
 * 22:00 the PREVIOUS day in UTC; a New Year's Day race would scaffold as 31 December, which
 * is not merely the wrong date but the wrong YEAR, and `eventsInYear` would drop it out of
 * `GOAL_YEAR` — off the goal card, off the countdown, off the required rate.
 *
 * Strava's `start_date_local` is an ISO string carrying a `Z` that is a lie: the instant is
 * already shifted into the athlete's own zone and the suffix is left on. So the day is TAKEN
 * OFF THE FRONT OF THE STRING rather than parsed — parsing it would apply the `Z` and undo
 * the shift the field exists to encode.
 */
export function calendarDate(activity) {
    const local = String(activity.start_date_local ?? "");
    if (!/^\d{4}-\d\d-\d\d/.test(local)) {
        throw new Error(`Activity ${activity.id} has no readable start_date_local (${JSON.stringify(activity.start_date_local)})`);
    }
    return local.slice(0, 10);
}

export function sportOf(activity) {
    const sport = SPORT_BY_STRAVA_TYPE[activity.sport_type] ?? SPORT_BY_STRAVA_TYPE[activity.type];
    if (!sport) {
        throw new Error(
            `Activity ${activity.id} is a "${activity.sport_type ?? activity.type}", which maps to no `
            + "sport this site has a goal for. Add it to SPORT_BY_STRAVA_TYPE beside a goal in "
            + "src/data/goals.ts, or write the module by hand.",
        );
    }
    return sport;
}

/**
 * SECONDS AS `H:MM:SS`, which is the only clock format anything in this repository stores.
 * Hours are not padded and minutes and seconds always are — `tests/data-contract.test.ts`
 * holds every clock on a bib to `^\d{1,2}:[0-5]\d:[0-5]\d$`.
 */
export function hms(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        throw new Error(`Not a duration: ${JSON.stringify(seconds)}`);
    }
    const whole = Math.round(seconds);
    const mm = String(Math.floor(whole / 60) % 60).padStart(2, "0");
    const ss = String(whole % 60).padStart(2, "0");
    return `${Math.floor(whole / 3600)}:${mm}:${ss}`;
}

/**
 * The activities in the order they were RIDDEN. Argv order is the order the ids were pasted
 * out of a browser, which is not the same thing and has been wrong.
 */
export function orderedByStart(activities) {
    return [...activities].sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date));
}

/**
 * FIRST START TO LAST STOP, IN SECONDS — the one computation this script exists for.
 *
 * NOT the sum of the parts, and the difference is the whole subject: a race split by a
 * mechanical holds the workshop inside its span, so summing under-reports it by however long
 * the rider stood still. Summing is also unstable in the other direction — it changes if the
 * rider pauses and restarts — which is why the race's clock is defined by the two INSTANTS at
 * its ends rather than by anything that was recorded between them.
 *
 * `start_date` (UTC), never `start_date_local`: parts of one race can legitimately straddle a
 * zone boundary or a DST change, and subtracting two local wall-clock strings across one
 * silently moves the answer by an hour. The local field is used for the calendar DATE alone,
 * where it is exactly the right one.
 *
 * The span is `max(start + elapsed) - min(start)` rather than `last.start + last.elapsed -
 * first.start`, so an activity that is CONTAINED in another one — the shape a duplicate
 * upload makes — cannot shorten the answer.
 */
export function raceSpanSeconds(activities) {
    if (activities.length === 0) throw new Error("no activities");
    const starts = activities.map((a) => {
        const start = Date.parse(a.start_date);
        if (Number.isNaN(start)) throw new Error(`Activity ${a.id} has an unreadable start_date`);
        if (!Number.isFinite(a.elapsed_time)) throw new Error(`Activity ${a.id} has no elapsed_time`);
        return { start, end: start + a.elapsed_time * 1000 };
    });
    return (Math.max(...starts.map((s) => s.end)) - Math.min(...starts.map((s) => s.start))) / 1000;
}

/**
 * ONE `recordings` ROW PER ACTIVITY, IN RIDE ORDER.
 *
 * A FUNCTION RATHER THAN A LINE INSIDE `main`, and that is not tidiness: while it was inline
 * no test could reach it, and MEASURED — replacing `metres: a.distance` with a helpful
 * `Math.floor(distance / 10) / 100` left the whole suite green. `renderModule` is handed rows
 * that are already built, so a test against it can only see what the caller decided.
 *
 * IT WAS NOT THE ONLY ONE, which is what the first version of this note claimed. The calendar
 * date was a second unreachable line in the same function, carrying its own comment asserting
 * its own correctness, and reading `start_date` there was green too. It is `calendarDate` now.
 * The rest of `main` is I/O and is deliberately left as I/O.
 *
 * `metres` IS THE API's `distance`, COPIED. Not converted, not rounded. `kmFromMetres` in
 * src/lib/race.ts owns the conversion and has been reset three times; each reset rewrote every
 * row by hand from figures only a live API call could give back, which is precisely what
 * storing the raw number ends.
 */
export function recordingsFrom(activities) {
    return orderedByStart(activities)
        .map((a) => ({ id: String(a.id), metres: a.distance, elapsed_time: hms(a.elapsed_time) }));
}

/**
 * A FILENAME STEM FROM THE ACTIVITY TITLE, and it is a PLACEHOLDER on purpose. The filename
 * carries no load — `src/data/races/index.ts` sorts on the `date` field — but a reader
 * listing the directory reads it as the race's name, and an activity title is not that
 * ("Morning Ride", "Lunch Run", or whatever the rider typed at the time). Rename the file
 * when you fill in `name`.
 */
export function slugify(title) {
    const slug = String(title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return slug === "" ? "rename-me" : slug;
}

/**
 * TEXT THAT IS SAFE TO PUT INSIDE A `/** … *\/` BLOCK, as a JSON string literal.
 *
 * AN ACTIVITY TITLE IS ATTACKER-INFLUENCED TEXT FROM AN API — the rider types it, but so does
 * anyone who can get a title in front of this script — and a title containing the two
 * characters that CLOSE a block comment ends the comment early. Everything after it lands as
 * TOP-LEVEL EXECUTABLE CODE in a module that is about to be committed, and `pnpm check` reads
 * it as ordinary source: a title of `*\/ globalThis.x = 1; /*` produces a file that
 * type-checks. Demonstrated, which is why this is a function and not a warning in prose.
 *
 * `JSON.stringify` alone is NOT enough and that is the trap: it escapes quotes, backslashes
 * and newlines, and leaves `*\/` exactly as it found it — no JSON escape can produce a `/`,
 * so the sequence survives verbatim. The one further step is to escape that `/` as `\/`,
 * which JSON already defines as meaning `/`. The value a reader parses back is therefore the
 * true title, unmangled, and the comment cannot be closed.
 */
export function commentSafe(text) {
    return JSON.stringify(String(text ?? "")).replace(/\*\//g, "*\\/");
}

/**
 * ONE ACTIVITY MAY ONLY APPEAR ONCE IN A RACE.
 *
 * Passing an id twice used to emit two identical `recordings` rows and exit 0. Both the race's
 * distance and its recorded time then DOUBLE — `raceKm` sums the metres — and the resulting
 * bib is wrong in the flattering direction, on a wall whose whole argument is that it prints
 * what the sources said. Nothing downstream catches it either: `tests/data-contract.test.ts`
 * refuses one activity id shared by two RACES, and this is one race holding it twice.
 *
 * Refused rather than de-duplicated, because a repeated id is a person having made a mistake
 * about which activities this race is, and quietly dropping one would hide the question.
 */
export function distinctIds(ids) {
    const repeated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (repeated.length > 0) {
        throw new Error(
            `Activity ${repeated.join(", ")} was given more than once. One activity is one recording: `
            + "repeating it would emit the row twice and DOUBLE the race's distance and its recorded "
            + "time. If the race really was recorded in parts, pass each part's own id.",
        );
    }
    return ids;
}

/**
 * THE MODULE'S TEXT. `name`, `country`, `outcome`, `advertised_km` and `official` are absent
 * rather than stubbed, so `pnpm check` names the two that are required and the reader decides
 * about the three that are not.
 *
 * The activity titles ride along as a COMMENT, which is the evidence a reviewer needs to
 * agree that these ids are this race — and the one place a title may appear, because it is
 * not the race's name. They go through `commentSafe`, and so does the echoed command line:
 * both are text this script did not author.
 */
export function renderModule({ date, sport, elapsed_time, recordings, titles, argv }) {
    const rows = recordings
        .map((r) => `{id: "${r.id}", metres: ${r.metres}, elapsed_time: "${r.elapsed_time}"}`);
    const evidence = titles.map(({ id, title }) => ` *   ${id}  ${commentSafe(title)}`).join("\n");
    return `import type {RaceEvent} from "../../lib/race"

/**
 * SCAFFOLDED BY \`pnpm race:add\` with ${commentSafe(argv.join(" "))}, then finished by hand. The fields the API
 * cannot know are MISSING, not blank: \`pnpm check\` will name \`name\` and \`country\`, and it
 * will not ask about \`outcome\` — a race that was abandoned needs \`outcome: "dnf"\` written in,
 * because no device models an abandonment.
 *
 * The activity titles, as evidence that these ids are this race. A title is not the race's
 * name, so it is quoted here and nowhere else:
${evidence}
 */
export default {date: "${date}", sport: "${sport}", elapsed_time: "${elapsed_time}",
                recordings: [${rows.join(",\n                             ")}]} satisfies RaceEvent
`;
}

/** Every race module already in the directory whose filename claims this day. */
export function modulesOn(date, entries) {
    return entries.filter((f) => f.startsWith(`${date}-`) && f.endsWith(".ts") && f !== "index.ts");
}

/**
 * WHICH EDIT ORDER APPLIES, printed rather than assumed, because there is no order that is
 * right at both moments and the wrong one costs real kilometres. The rule and the measurement
 * are in `src/data/races/README.md`; this reports which arm of it the directory says you are
 * on, which is the part a person cannot check at a glance across fourteen files.
 */
export function editOrderNote(date, existing) {
    if (existing.length > 0) {
        return `A race dated ${date} is ALREADY a module here (${existing.join(", ")}). If that is this `
            + "race, delete the file just written and add the `recordings` to the existing module "
            + "instead — ADD THE RECORDING FIRST, then let the 05:13 cron move the kilometres. "
            + "Fetching first on an already-listed race counts its distance twice: measured at "
            + "66 km/wk against an honest 71.";
    }
    return `No race dated ${date} was listed before this one, so FETCH FIRST: run `
        + "`gh workflow run strava-progress.yml` and let the bot bank the kilometres before this "
        + "module lands. A race the site never saw was never booked, so banking it first can "
        + "double nothing.";
}

async function main(ids) {
    if (ids.length === 0) {
        throw new Error("Usage: pnpm race:add <activity-id> [<activity-id> …] — one race, "
            + "however many activities it was recorded as. Which activities belong together is "
            + "the rider's call and nothing can derive it.");
    }
    // BEFORE THE NETWORK, so a repeated id costs nothing and the message is the first thing
    // the reader sees rather than the last.
    distinctIds(ids);

    const token = await accessToken(process.env);
    const activities = await Promise.all(ids.map(async (id) => {
        const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            // A detailed read answers 404, not 403, when the token lacks `activity:read_all`,
            // so an under-scoped token looks exactly like a wrong id. Say so here rather than
            // letting the reader re-check the id three times.
            throw new Error(`Activity ${id}: HTTP ${res.status}. A 404 can mean the id is wrong OR that `
                + "the token lacks `activity:read_all` — a detailed read answers 404, not 403, for a "
                + "missing scope.");
        }
        return res.json();
    }));

    const ordered = orderedByStart(activities);
    const sports = new Set(ordered.map(sportOf));
    if (sports.size > 1) {
        throw new Error(`These activities are ${[...sports].join(" and ")}, so they are not one race. `
            + "A race joins exactly one goal.");
    }

    const date = calendarDate(ordered[0]);
    const module = renderModule({
        date,
        sport: [...sports][0],
        elapsed_time: hms(raceSpanSeconds(ordered)),
        recordings: recordingsFrom(ordered),
        titles: ordered.map((a) => ({ id: String(a.id), title: a.name })),
        argv: ids,
    });

    const entries = readdirSync(fileURLToPath(RACES_DIR));
    const existing = modulesOn(date, entries);
    const target = new URL(`${date}-${slugify(ordered[0].name)}.ts`, RACES_DIR);

    if (existsSync(target)) {
        // REFUSED, not merged and not overwritten: this file may already carry an `outcome`,
        // an `official` block or a hand-corrected name, none of which the API can give back.
        console.log(module);
        throw new Error(`${fileURLToPath(target)} already exists. Nothing was written — the module it `
            + "would have written is above. Merge by hand if that is what you meant.");
    }

    writeFileSync(target, module);
    console.log(`Wrote ${fileURLToPath(target)} — ${ordered.length} recording(s).`);
    console.log("Fill in `name` and `country`; rename the file to match. `pnpm check` names what is missing.");
    console.log(editOrderNote(date, existing));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main(process.argv.slice(2));
}
