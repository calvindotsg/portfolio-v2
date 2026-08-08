import {afterEach, describe, expect, it, vi} from "vitest";

import {accessToken} from "../scripts/strava-auth.mjs";
import {
    editOrderNote, hms, modulesOn, orderedByStart, raceSpanSeconds, recordingsFrom, renderModule,
    slugify, sportOf,
} from "../scripts/scaffold-race.mjs";

/**
 * THE THREE SCRIPTS UNDER `scripts/` THAT TALK TO STRAVA, held offline.
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
        for (const field of ["name:", "country:", "outcome:", "advertised_km:", "official:"]) {
            expect(code, `the scaffold wrote a ${field} — the API does not know it`).not.toContain(field);
        }
        expect(code).toContain("satisfies RaceEvent");
        expect(code).toContain('date: "2024-08-04"');
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
