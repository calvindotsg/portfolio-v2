import {readFileSync, readdirSync} from "node:fs";
import {join, relative, resolve} from "node:path";
import ts from "typescript";
import {describe, expect, it} from "vitest";

import {EVENTS} from "../src/data/races";
import stravaProgress from "../src/data/strava-progress.json";
import {GOALS} from "../src/lib/goal";
import {parseIsoDate, patchState, stampLagDays} from "../src/lib/projection";
import {PROGRESS_SOURCE_OF_RECORD, SOURCE_OF_RECORD, STRAVA_SOURCED} from "../src/lib/provenance";
import type {SourceOfRecord} from "../src/lib/provenance";
import {raceKm, recordingKm, recordingsOf} from "../src/lib/race";
import type {RaceEvent} from "../src/lib/race";
import {BUILD_DATE} from "../src/lib/today";

/**
 * WHAT A DIRECTORY OF FILES CANNOT SAY ABOUT ITSELF.
 *
 * The races used to be one array, and an array states three things for free that fourteen
 * modules do not: that every row is in it, that the rows are in an order somebody chose, and
 * that a row's neighbours are visible when you edit it. The migration bought a `Write` to a
 * new path in place of a unique-match `Edit` into 1,902 lines, and this file is what it cost
 * — each of those three, said out loud and held.
 *
 * THE SILENT FAILURE IS A RACE THAT IS SIMPLY NOT THERE. `src/data/races/index.ts` collects
 * its siblings with `import.meta.glob`, and a glob answers a question about filenames: a
 * module the pattern misses is not an error, it is an absence. Nothing else in the suite can
 * see it, because every other assertion about the wall derives from `EVENTS` and would agree
 * perfectly with a calendar that had quietly lost a race. So the directory is compared to the
 * array here rather than trusted to be it.
 *
 * THE README IS GATED IN BOTH DIRECTIONS FOR THE REASON `tests/docs-drift.test.ts` gates the
 * rest of the prose: it is the document a person adding a race actually reads, it sits beside
 * the data so it looks authoritative, and nothing about writing a race module prompts anyone
 * to revisit it. A field it omits is a field the next race silently lacks; a field it names
 * that the type has dropped sends the same person to write a key the compiler will refuse.
 */

const DIR = "src/data/races";
const README = `${DIR}/README.md`;

/**
 * EVERY FIELD `RaceEvent` DECLARES, AS A PATH, ASKED OF THE COMPILER RATHER THAN OF THE DATA.
 *
 * Deriving it from `EVENTS` would be the obvious shortcut and it is the wrong question: an
 * optional field that no current race happens to carry would drop out of the expected set,
 * so the README could stop documenting `end_date` on the day the last multi-day tour was
 * archived, and this gate would agree. The type is what a person writing a new module is
 * held to, so the type is what the README is held to.
 *
 * THE NESTING IS PART OF THE NAME, AND FLATTENING IT COST A REQUIRED FIELD. `recordings` and
 * `official` are the two fields whose value is itself a record, and their members are exactly
 * as easy to get wrong as the top-level ones — `metres` in particular, which an offline run can
 * only partly check. This used to union the bare property names of the three shapes into one flat set,
 * which let a top-level bullet stand in for a nested field of the same name: `elapsed_time` is
 * required on {@link Recording} and the README's `recordings` sub-bullets never named it, and
 * the gate agreed because the race's own `elapsed_time` bullet was there. Adding a second
 * required field to that shape was green while every module was a compile error. So both sides
 * are compared as `recordings.elapsed_time`, which is a different string from `elapsed_time`.
 *
 * A nested shape is found rather than listed: any property whose type — once the optional and
 * the array are peeled off — is an object with properties of its own is descended into. That
 * way a third record added beside these two is documented on the day it is declared, instead of
 * on the day somebody remembers to add its name here.
 */
function declaredFieldPaths(): Set<string> {
    const file = "src/lib/race.ts";
    const program = ts.createProgram([file], {
        strict: true,
        target: ts.ScriptTarget.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
    });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(file);
    expect(source, `${file} did not compile — this gate cannot answer`).toBeDefined();

    const members = (type: ts.Type): readonly ts.Type[] => (type.isUnion() ? type.types : [type]);

    // The shapes a field's value can be, with `undefined` and `never` dropped — the first is
    // what optional means, the second is how `official?: never` spells the union's other arm —
    // and a list peeled to its element, because `recordings` documents ONE recording's fields.
    const shapesOf = (type: ts.Type): readonly ts.Type[] => members(type)
        .filter((part) => !(part.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Never)))
        .flatMap((part) => members(checker.getIndexTypeOfType(part, ts.IndexKind.Number) ?? part))
        .filter((shape) => shape.flags & ts.TypeFlags.Object && checker.getPropertiesOfType(shape).length > 0);

    const paths = (type: ts.Type, prefix: string, depth: number): string[] => {
        if (depth > 3) return [];
        return members(type).flatMap((part) => checker.getPropertiesOfType(part).flatMap((symbol) => {
            const path = prefix + symbol.name;
            const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
            if (!declaration) return [path];
            const valueType = checker.getTypeOfSymbolAtLocation(symbol, declaration);
            return [path, ...shapesOf(valueType).flatMap((shape) => paths(shape, `${path}.`, depth + 1))];
        }));
    };

    const root = source!.statements
        .find((statement): statement is ts.TypeAliasDeclaration =>
            ts.isTypeAliasDeclaration(statement) && statement.name.text === "RaceEvent");
    expect(root, "src/lib/race.ts no longer declares `RaceEvent` — this gate cannot answer")
        .toBeDefined();
    return new Set(paths(checker.getTypeAtLocation(root!.name), "", 0));
}

/**
 * Every `- \`field\`` bullet under the README's Fields heading, as a path — the indentation is
 * what says a bullet is a member of the one above it, so it is read rather than discarded.
 */
function documentedFieldPaths(): string[] {
    const section = readFileSync(README, "utf8").split(/^## /m).find((s) => s.startsWith("Fields"));
    expect(section, "the README has no Fields section").toBeDefined();
    const stack: {indent: number; name: string}[] = [];
    return [...section!.matchAll(/^([ \t]*)- `([a-z_]+)`/gm)].map(([, indent, name]) => {
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent.length) stack.pop();
        stack.push({indent: indent.length, name});
        return stack.map((level) => level.name).join(".");
    });
}

/**
 * EVERY FILE UNDER `src/data/races/` THAT IS NOT THE COLLECTOR OR THE README, recursively and
 * whatever it is called. This is the enumeration the drop gate below rests on, and its shape is
 * the whole point: it asks the FILESYSTEM what is there, so a race saved under an extension no
 * pattern matches, or moved into a subdirectory, is still a file this gate has to account for.
 *
 * IT USED TO BE `readdirSync(DIR).filter((f) => f.endsWith(".ts"))`, WHICH IS A GLOB WITH EXTRA
 * STEPS. The comment beside it said the directory was read rather than globbed a second time
 * "because a second glob shares the mechanism it is checking" — and then shared both of the
 * blind spots that matter. Moving a race into a year-named subdirectory, and renaming one to an
 * `.mts` extension, each deleted it from the wall, from `dist/llms.txt` and from the projection
 * with the whole suite green. Nothing here may narrow this list; a file that cannot be a race is
 * a finding rather than something to skip past.
 */
const RACE_FILES = readdirSync(DIR, {recursive: true, withFileTypes: true})
    .filter((entry) => entry.isFile())
    .map((entry) => relative(DIR, join(entry.parentPath, entry.name)))
    .filter((path) => path !== "index.ts" && path !== "README.md")
    .sort();

/**
 * WHAT EACH OF THOSE FILES ACTUALLY CONTRIBUTED, by importing it and asking whether the object
 * it exports is one of the objects in `EVENTS`. Identity rather than equality: two races could
 * legitimately be deep-equal one day, and a module the collector's glob never reached would
 * still answer `false` here, which is exactly the question being asked.
 *
 * A file that cannot be imported at all is kept with its error rather than dropped, because
 * skipping it would put the one shape this gate exists to catch back out of view.
 */
const loaded: readonly {path: string; race?: RaceEvent; failure?: string}[] = await Promise.all(
    RACE_FILES.map(async (path) => {
        try {
            const module = await import(resolve(DIR, path)) as {default?: unknown};
            return EVENTS.includes(module.default as RaceEvent)
                ? {path, race: module.default as RaceEvent}
                : {path, failure: "its default export is not one of the races in `EVENTS`"};
        } catch (error) {
            return {path, failure: `it cannot be imported: ${error instanceof Error ? error.message : String(error)}`};
        }
    }),
);
const raceFiles = loaded.flatMap(({path, race}) => (race ? [{path, race}] : []));

describe("the race modules, against the contract they are written to", () => {
    it("documents every field the type declares, and no field it does not", () => {
        const declared = declaredFieldPaths();
        expect(declared.size, "no fields were derived from src/lib/race.ts — this gate is vacuous")
            .toBeGreaterThan(5);
        expect(declared, "RaceEvent no longer declares `date`, so this gate is reading the wrong type")
            .toContain("date");
        expect([...declared].filter((path) => path.includes(".")),
            "no NESTED field was derived — `recordings` and `official` hold records, and a flat set "
            + "is what let a top-level bullet stand in for a member of one").not.toEqual([]);

        const documented = documentedFieldPaths();
        expect([...declared].filter((f) => !documented.includes(f)).sort(),
            `${README} does not name these fields. A field the README omits is a field the next `
            + "race silently lacks. A dotted path is a member of the record above it, and it needs "
            + "its own indented bullet — the parent's name does not cover it").toEqual([]);
        expect(documented.filter((f) => !declared.has(f)).sort(),
            `${README} names these as fields and src/lib/race.ts does not declare them. Delete the `
            + "bullet — it sends a reader to write a key the compiler will refuse").toEqual([]);
    });

    it("names each module for the date inside it", () => {
        expect(raceFiles.length, "the glob found no race modules — this gate is vacuous")
            .toBeGreaterThan(5);
        for (const {path, race} of raceFiles) {
            expect(path.slice(0, 10),
                `${path} is named for a different day than the \`date\` it carries (${race.date}). `
                + "The collector sorts on the field, so the two disagreeing misorders `dist/llms.txt` "
                + "with nothing else noticing").toBe(race.date);
            expect(path, `${path} is not YYYY-MM-DD-slug.ts sitting directly in ${DIR}`)
                .toMatch(/^\d{4}-\d\d-\d\d-[a-z0-9-]+\.ts$/);
        }
    });

    it("holds no two modules for the same race", () => {
        const keys = raceFiles.map(({race}) => `${race.date} ${race.name}`);
        expect(keys.filter((k, i) => keys.indexOf(k) !== i),
            "these races are in the calendar twice. An annual race repeats its NAME legitimately — "
            + "the wall prints `OCBC Cycle Johor Bahru` in two states — but a name on the same DAY "
            + "is one race entered as two files, which double-counts its kilometres").toEqual([]);
    });

    it("puts every file in the directory into the array, whatever it is called", () => {
        // THE ONE FAILURE THIS MIGRATION INTRODUCED. A file the pattern in
        // `src/data/races/index.ts` does not match is not an error anywhere: the race is simply
        // absent from the wall, from llms.txt and from the projection, and every other
        // assertion in the suite agrees with the calendar that is left.
        //
        // So the question asked here is not "do two patterns agree" — the version this replaced
        // asked exactly that and both patterns were blind the same way. It is "did this FILE put
        // a race in `EVENTS`", asked of every file the directory holds, and answered by importing
        // the file and looking for what it exported in the array. `RACE_FILES` says where the
        // list comes from and what two moves it was measured against.
        expect(RACE_FILES.length, "the directory holds no race files — this gate is vacuous")
            .toBeGreaterThan(5);
        const orphans = loaded
            .filter(({race}) => race === undefined)
            .map(({path, failure}) => `${path} — ${failure}`);
        expect(orphans, "these files are in src/data/races/ and put no race in `EVENTS`. The glob "
            + "in src/data/races/index.ts is not reaching them, so the races they hold are absent "
            + "from the wall, from dist/llms.txt and from the projection, with nothing else in this "
            + "suite able to tell").toEqual([]);
        expect(EVENTS.length, "the array holds a different number of races than the directory does")
            .toBe(RACE_FILES.length);
    });

    it("checks each race against the type rather than asserting it", () => {
        // `import.meta.glob<{default: RaceEvent}>` is an ASSERTION about what the modules export,
        // not a check on them: the type parameter tells the compiler what to believe and nothing
        // reads the modules to find out. A module whose object says `sport: "runing"` and omits
        // `satisfies RaceEvent` passes `pnpm check` with 0 errors — measured — so the compile-time
        // guarantee that is the whole reason these are TypeScript modules rather than data files
        // lives in the modules themselves, one phrase at a time. Hence a gate on the phrase.
        const asserted = RACE_FILES
            .filter((path) => !readFileSync(join(DIR, path), "utf8").includes("satisfies RaceEvent"));
        expect(asserted, "these modules do not end `satisfies RaceEvent`, so nothing checks their "
            + "shape: the collector's glob asserts the type instead of verifying it, and a "
            + "misspelled key or a missing field ships green").toEqual([]);
    });

    it("keeps the array in date order, because llms.txt renders it in array order", () => {
        // `src/pages/llms.txt.ts` walks `EVENTS` and prints as it goes, so the array's order IS
        // the shipped artifact's order. The collector sorts, which makes this a gate on the sort
        // rather than on the data — and a sort is exactly the kind of line that gets simplified
        // away by someone who can see that the files are already in order on disk. A PARTIAL
        // reorder is what proved it needed saying: reversing only the pre-2026 races left the
        // whole suite green while dist/llms.txt printed the calendar backwards at the top.
        const dates = EVENTS.map(({date}) => date);
        expect(dates, "`EVENTS` is not in date order. `src/data/races/index.ts` sorts on the `date` "
            + "field, so this is that sort having been weakened or removed — and dist/llms.txt "
            + "ships whatever order the array is in").toEqual([...dates].sort());
    });

    /**
     * THE PROCEDURE, BY CANONICAL PHRASE, in the shape the shortcut-count gate in
     * `tests/docs-drift.test.ts` uses: the wording around each phrase is free, the phrase
     * itself is the part that may not quietly go missing.
     *
     * These four are the claims that cost real kilometres when they are absent. The two edit
     * orders were written down only after fetching first on an already-listed race measured
     * 66 km/wk against an honest 71, in the flattering direction; the booked-race rule was
     * stated as half of itself for longer still, so a note that meant "a PAST race is a data
     * edit" read as though every race were.
     */
    const REQUIRED_PHRASES: Record<string, string> = {
        "fetch first": "the edit order for a race that is not yet a module here",
        "add the recording first": "the edit order for a race that already is one",
        "moves the required rate": "what a BOOKED race inside GOAL_YEAR does to the goal cards",
        "moves no figure on the home page": "and what a past one does not do, which is the half "
            + "the note this README replaced stated on its own",
    };

    it("keeps the procedure beside the data", () => {
        const text = readFileSync(README, "utf8").toLowerCase();
        for (const [phrase, why] of Object.entries(REQUIRED_PHRASES)) {
            expect(text, `${README} must contain the phrase "${phrase}" — it is ${why}`)
                .toContain(phrase);
        }
    });
});

/**
 * THE SAME CONTRACT, ASKED OF THE ROWS RATHER THAN OF THE FILES. Everything above holds the
 * DIRECTORY to what a single array used to say for free; everything below holds each RACE to
 * what the type cannot say about it — that its dates are readable and ordered, that a finishing
 * time or a published result belongs to a day that has happened, that no two recordings claim
 * the same Strava activity, and that a split race's span contains its own parts.
 *
 * IT WAS IN `tests/projection.test.ts`, WHICH IS WHERE THE SPLIT COMES FROM. That file pins
 * DIGITS: figures measured off the rendered page on a named day, which is what makes it able to
 * catch a projection that has quietly changed its arithmetic. Not one assertion below pins a
 * digit — each states a property that holds for any valid calendar and names the offending race
 * when it does not. Mixed together, the two kinds fail identically, so an editor who adds a race
 * cannot tell "you typed something impossible" from "the page's figures moved, as they were
 * always going to": the honest answer to the second is a regenerated
 * `src/lib/derived-figures.md`, and the honest answer to the first is a fix.
 */
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
            // THE DISTANCE, WHICHEVER SHAPE THE ROW IS. A booked race must carry `km`; a
            // recorded one must derive a real figure from its metres. `raceKm` answers NaN
            // for the hole the type cannot close — an empty `recordings` list beside no `km`
            // — so this reads through the accessor rather than at either field.
            expect(Number.isFinite(raceKm(e)) && raceKm(e) >= 0, `${e.name} distance`).toBe(true);
            expect(e.name.trim().length, "an unnamed event renders as a blank patch").toBeGreaterThan(0);
            // Required by the type, so this cannot be a missing key — it can be an empty
            // one, which renders as a blank line on the bib rather than as no line.
            expect(e.country.trim().length, `${e.name} has no country, so its bib prints a blank line`)
                .toBeGreaterThan(0);
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

    /**
     * A FINISHING TIME ONLY EXISTS FOR A RACE THAT HAS BEEN RUN, and this is now the
     * ONLY thing standing behind that sentence — which is why it is written more
     * carefully than the assertion it replaced.
     *
     * IT USED TO ASSERT `elapsed_time` IMPLIES `patchState === "finished"`. Once a
     * recording became a way to BE finished (see `hasRecording` in projection.ts), that
     * assertion started proving itself: a race with a time and an id is finished because
     * it has a time and an id. A tautology in the place of a gate is worse than no gate,
     * because the file still reads as though the data were checked.
     *
     * SO IT ASKS THE QUESTION THE OLD ONE WAS REALLY ASKING: has the race started? A
     * time typed against a race still ahead is the mistake worth catching — the bib
     * would print a result for a day that has not happened — and it is now catchable
     * ONLY here, because `patchState` would happily draw that bib as earned.
     *
     * AGAINST THE BUILD DAY, not the bot's stamp, and the difference is the whole point
     * of the change this test belongs to: a race run this morning is a race that has
     * started, whatever the kilometres say. Compared with `<=`, so a time entered on the
     * day of the race passes — that is the case the wall could not previously record.
     *
     * A race remembered without a recording stays a legitimate timeless bib, so nothing
     * here may require a time. This sentence used to name the race that was in that state;
     * which races are is a property of the data, and the rule is not.
     */
    it("never carries a finishing time for a race that has not started", () => {
        // No `toBeGreaterThan(0)` on the subset — see the note in tests/patch-wall.test.ts.
        // `timed` is legitimately empty every January, and a red suite blocks the
        // deploy. The loop asserts a property OF each timed event; zero of them is a true
        // state of the calendar, not a broken test.
        const timed = EVENTS.filter((e) => e.elapsed_time !== undefined);
        for (const e of timed) {
            expect(parseIsoDate(e.date), `${e.name} has an unreadable date and a finishing time`).not.toBeNaN();
            // THE END OF THE EVENT, NOT ITS START. A nine-day tour that began last Tuesday
            // has started and is not over, and a finishing time typed into it is still a
            // result for a day that has not happened. Reading `e.date` here let exactly
            // that through, and the message named the wrong field while doing it.
            expect(
                parseIsoDate(e.end_date ?? e.date) <= parseIsoDate(BUILD_DATE),
                `${e.name} is not over until ${e.end_date ?? e.date}, which is after ${BUILD_DATE}, but it `
                + `carries elapsed_time ${e.elapsed_time} — the bib would print a result for a day that `
                + `has not happened`,
            ).toBe(true);
            expect(e.elapsed_time, `${e.name} elapsed_time must read H:MM:SS`).toMatch(/^\d{1,2}:[0-5]\d:[0-5]\d$/);
        }
    });

    /**
     * THE SAME GUARD FOR THE OTHER ACCOUNT. An official result is a finishing time too, and it
     * arrived without either half of the protection its sibling above has had for months.
     *
     * A RACE THAT HAS NOT HAPPENED HAS NO RESULT. The ledger already refuses to draw for a
     * booked bib, but the stub does not: an `official` block on a race still ahead publishes a
     * link announcing a finishing time for a day that has not come. The type cannot say this —
     * `booked` is derived from the CALENDAR, not from the row's shape — so it is said here,
     * where the two other date-versus-result rules already live.
     *
     * AND THE CLOCKS MUST READ LIKE CLOCKS. `net_time` and `gun_time` are hand-typed and are
     * printed verbatim into the ledger's Time column and into the link a reader is told the
     * clock's name in. Every other clock in this file is held to `H:MM:SS`; these two escaped
     * it purely because they were new.
     *
     * BOTH ARE OPTIONAL AND THE LOOP MUST SAY SO. A sheet can publish a gun time alone — one on
     * this calendar does, and `net_time` in `src/lib/race.ts` refuses to derive one by subtraction — so
     * asserting either field unconditionally would fail on correct data.
     */
    it("never carries an official result for a race that has not happened, and reads its clocks", () => {
        // No `toBeGreaterThan(0)` on the subset, for the reason the sibling above gives: a
        // calendar with no published sheet on it is a true state, not a broken test.
        for (const e of EVENTS.filter((x) => x.official !== undefined)) {
            const official = e.official!;
            expect(
                parseIsoDate(e.end_date ?? e.date) <= parseIsoDate(BUILD_DATE),
                `${e.name} is not over until ${e.end_date ?? e.date}, which is after ${BUILD_DATE}, but it `
                + "carries an official result — the stub would link a finishing time for a day that has "
                + "not happened",
            ).toBe(true);

            // AT LEAST ONE CLOCK, or the row is a distance beside a blank on a bib whose whole
            // argument is that a source's figures travel together.
            expect(official.net_time ?? official.gun_time,
                `${e.name} has an official result with no time on it at all`).toBeTruthy();

            for (const [field, value] of [["net_time", official.net_time], ["gun_time", official.gun_time]] as const) {
                if (value === undefined) continue;
                expect(value, `${e.name} official ${field} must read H:MM:SS`)
                    .toMatch(/^\d{1,2}:[0-5]\d:[0-5]\d$/);
            }

            // A GUN TIME IS THE LONGER OF THE TWO, always — it starts at the gun and the net
            // clock starts when the rider crosses the mat, which is never earlier. Reversed,
            // the pair would be mislabelled rather than merely odd.
            if (official.net_time !== undefined && official.gun_time !== undefined) {
                const secs = (t: string) => t.split(":").reduce((a, n) => a * 60 + Number(n), 0);
                expect(secs(official.gun_time), `${e.name}: a gun time cannot be shorter than its own net `
                    + `time (${official.gun_time} against ${official.net_time}) — the pen is never negative`)
                    .toBeGreaterThan(secs(official.net_time));
            }

            if (official.url !== undefined) {
                expect(official.url, `${e.name} official url must be absolute`).toMatch(/^https:\/\//);
            }
        }
    });

    /**
     * THE OTHER HALF OF THE SAME GUARD. A recording is a finishing time AND an activity
     * id, and the id is the half the test above cannot see: an id alone earns no bib, so
     * a stray one is harmless — but an id beside a time is what makes `patchState` draw a
     * solid bib, and pasting a Strava link next to a race still ahead is an easy slip.
     *
     * Stated separately rather than folded in, because the two say different things and a
     * combined message would name the wrong field half the time.
     */
    it("never carries a recording for a race that has not started", () => {
        const recorded = EVENTS.filter((e) => e.elapsed_time !== undefined && recordingsOf(e).length > 0);
        for (const e of recorded) {
            // Against a clock pinned before every race on the calendar, so ONLY the
            // recording branch can answer. `patchState(e)` takes BUILD_DATE, under which
            // every past race is finished by the clock anyway — the assertion could not
            // fail, which is the tautology the comment above condemns.
            //
            // ASKED AS "THE CLOCK DID NOT DECIDE THIS", NOT AS `=== "finished"`, and the
            // difference arrived with `dnf`. A recorded race that was ABANDONED is `dnf` on
            // every day, so the old spelling was red on correct data. Relaxing it to
            // `!== "booked"` would have been the weak fix: a past race is not booked by the
            // CLOCK either, so deleting the recording branch entirely would still pass. What
            // a recording actually buys is that the answer does not MOVE with the day, and
            // that is what this now asks — red if the branch goes, green for either settled
            // outcome, and still not a tautology.
            expect(
                patchState(e, "1970-01-01"),
                `${e.name} carries a full recording, so its state must be settled ahead of the clock`,
            ).toBe(patchState(e, BUILD_DATE));
            expect(
                patchState(e, "1970-01-01"),
                `${e.name} carries a full recording, so it cannot be drawn as still to come`,
            ).not.toBe("booked");
            expect(
                parseIsoDate(e.end_date ?? e.date) <= parseIsoDate(BUILD_DATE),
                `${e.name} would be drawn as an EARNED patch, but it does not finish until `
                + `${e.end_date ?? e.date}, which has not happened yet`,
            ).toBe(true);
        }
    });

    /**
     * An activity id is an opaque identifier that only ever goes into a URL. Digits only,
     * and a STRING: 19-digit ids are close enough to Number.MAX_SAFE_INTEGER that a
     * numeric literal would round one silently, and the rounded id 404s rather than
     * failing anywhere a build could see.
     */
    it("carries activity ids as digit strings, so none can be rounded into a dead link", () => {
        const seen = new Set<string>();
        let checked = 0;
        for (const e of EVENTS) {
            for (const r of recordingsOf(e)) {
                expect(typeof r.id, `${e.name} activity id must be a string`).toBe("string");
                expect(r.id, `${e.name} activity id must be digits only`).toMatch(/^\d+$/);
                // Two races pointing at one ride is the transposition this cannot otherwise
                // see — both ids are valid, both pages load, and only reading them tells.
                // UNIQUENESS NOW HAS TO HOLD ACROSS THE ARRAYS AND NOT ONLY BETWEEN ROWS:
                // a race recorded in parts holds several ids, so the same slip can now be
                // made twice inside one event as well as between two.
                expect(seen.has(r.id), `${e.name} shares activity ${r.id} with another recording`).toBe(false);
                seen.add(r.id);
                checked++;
            }
        }
        expect(checked, "no event carries a recording — this assertion would be vacuous").toBeGreaterThan(0);
    });

    /**
     * A RECORDING'S OWN FIGURES ARE PRINTED ON THE BIB, so they are held to the shapes a bib
     * can print. `metres` is what the API said and everything else about a distance is derived
     * from it, so the only offline claim worth making is that it IS a distance: finite, and
     * greater than zero, because a race recorded as 0 m would draw a bib reading `0.00`.
     *
     * WHAT THIS DELIBERATELY NO LONGER ASSERTS is any agreement between a race's distance and
     * its parts'. It used to compare a single-recording race's `km` against the part's, which
     * caught a real drift while both were hand-typed. Neither is typed now — `raceKm` converts
     * the same metres either way — so that assertion would be a test of arithmetic this file
     * does not own. Its subject moved to `tests/content.test.ts`, which exercises the
     * conversion itself, including the summing rule a split race depends on.
     *
     * THE ELAPSED PAIR IS STILL WORTH HOLDING, and the asymmetry is the point: that figure is
     * hand-entered in two places, so a single-recording race really can carry two different
     * clocks. The distance cannot any more.
     *
     * A MISTYPED `metres` REMAINS INVISIBLE HERE, and how much of the suite can see it depends on
     * the race's year: a row inside `GOAL_YEAR` feeds the projection's published figures and takes
     * `tests/derived-figures.test.ts` red, a past-year row feeds nothing and is green everywhere.
     * `tests/strava-verify.test.ts` is what covers both, holding every recording against the API
     * exactly, and it is opt-in.
     */
    it("holds each recording's own figures to the shapes the bib prints them in", () => {
        let checked = 0;
        for (const e of EVENTS) {
            const parts = recordingsOf(e);
            for (const r of parts) {
                expect(r.elapsed_time, `${e.name} recording ${r.id} elapsed time must be H:MM:SS`)
                    .toMatch(/^\d{1,2}:[0-5]\d:[0-5]\d$/);
                expect(Number.isFinite(r.metres) && r.metres > 0,
                    `${e.name} recording ${r.id} metres must be a positive number`).toBe(true);
                checked++;
            }
            if (parts.length !== 1) continue;
            expect(parts[0].elapsed_time, `${e.name} has one recording, so its elapsed time must equal the race's`)
                .toBe(e.elapsed_time);
        }
        expect(checked, "no event carries a recording — this assertion would be vacuous").toBeGreaterThan(0);
    });

    /*
     * THE SPLIT-RACE DISTANCE GATE THAT USED TO SIT HERE IS GONE, AND ITS SUBJECT WITH IT.
     *
     * It bounded a hand-typed race-level `km` against the sum of its hand-typed parts, because
     * both were data and could disagree. Neither is data now: a race's distance is `raceKm`
     * over the parts' metres, so the bound it enforced holds by construction and asserting it
     * here would be a test of the code's own arithmetic run against the code's own output —
     * green whatever the rule, which is the shape of assertion this file exists to avoid.
     *
     * WHERE THE COVERAGE WENT, so this is a move rather than a deletion: the conversion and
     * the summing rule are exercised directly in `tests/content.test.ts`, on inputs chosen
     * to discriminate rounding down from half-up. What NEITHER can see is a mistyped `metres`
     * — only `tests/strava-verify.test.ts` reads the API, and it is opt-in.
     */

    /**
     * A SPLIT RACE'S CLOCK MUST AT LEAST CONTAIN ITS OWN PARTS.
     *
     * `elapsed_time` is first start to last stop, so it is NOT the sum of the parts — the gaps
     * between recordings are inside it, which is exactly why summing is the wrong rule (2024's
     * span is 10:05:34 against 7:22:15 summed, and the 2h43m in the bike shop is the
     * difference). That makes the figure look unconstrained, and it is not: recordings do not
     * overlap, so the span cannot be SHORTER than the time actually spent recording.
     *
     * `>=`, and the slack is the point rather than a weakness. An equality would be red on
     * every real split race; this catches the failures that matter — a span accidentally set
     * to one part's elapsed time, or to the sum-minus-a-gap, or a digit dropped from the
     * hours. It is the only offline constraint on this field: `strava-verify` computes the
     * true span from the activities' own timestamps, but it is opt-in, needs live credentials
     * and does not run in CI.
     */
    it("never lets a split race's span be shorter than the time it spent recording", () => {
        const seconds = (hms: string): number => {
            const [h, m, s] = hms.split(":").map(Number);
            return h * 3600 + m * 60 + s;
        };
        let checked = 0;
        for (const e of EVENTS) {
            const parts = recordingsOf(e);
            if (parts.length < 2 || e.elapsed_time === undefined) continue;
            const recording = parts.reduce((total, part) => total + seconds(part.elapsed_time), 0);
            const span = seconds(e.elapsed_time);
            expect(
                span >= recording,
                `${e.name} says its span is ${e.elapsed_time} (${span}s), but its ${parts.length} recordings `
                + `hold ${recording}s of riding between them. First start to last stop CONTAINS every part plus `
                + "the gaps between them, so it can never be shorter than their sum.",
            ).toBe(true);
            checked++;
        }
        // THE FLOOR IS `>` BECAUSE `>= 0` COUNTED NOTHING. `checked` starts at zero and only
        // increments, so the old spelling was satisfied by a loop that skipped every race — and
        // it sat under a docblock calling this the only offline constraint on the field. The
        // whole worth of that claim is that some race reaches the comparison above. If this
        // reddens because the last split race left EVENTS, the constraint has genuinely stopped
        // applying and the docblock above owes an edit, not this line.
        expect(checked, "no split race reached the comparison above, so this gate held nothing")
            .toBeGreaterThan(0);
    });
});

/** One day, for the two date windows below. Both bounds are counted in whole days. */
const DAY_MS = 86_400_000;

/**
 * A RACE ENTERED AND THEN NEVER RESOLVED, WHICH THE WALL PUBLISHES AS EARNED.
 *
 * `patchState` falls through to `today > end ? "finished" : "booked"`, so a row with no
 * recording, no finishing time and no `outcome` becomes a solid bib the morning after its
 * date — on the calendar alone, with nothing behind it. That is the correct default and
 * must not change: the alternative directions are worse, and the reasoning is written out
 * above the function. A booked race that WAS run and simply has not been typed up yet is
 * finished, and the wall saying so is right.
 *
 * WHAT IS WRONG IS LEAVING IT THAT WAY. The claim is only honest while the entry is on its
 * way; a row that has sat past its own date for a month with none of the three fields is a
 * race nobody recorded, and the wall is asserting a result on the strength of a date.
 *
 * A BUILD CAN SEE THIS, WHICH IS THE PART THAT WAS DOUBTED. The row is fully visible: an end
 * date well past, and all three of the resolving fields absent. It is the same shape as the
 * three assertions above it, pointed the other way — those refuse a RESULT on a race that has
 * not happened, this refuses SILENCE on a race that has.
 *
 * THE GRACE WINDOW IS A HUMAN'S TURNAROUND, not an inference from data. There is none to
 * infer from: every race module in this repository was written in the single migration
 * commit that created the directory, so git holds no distribution of "days between racing
 * and recording it" to derive a number from. What it has to cover is an organiser publishing
 * a results sheet and the owner making the two-step edit described above `EVENTS`, on a
 * calendar where those things happen at weekends. Thirty days covers that with room and is
 * still inside the month the wrong claim starts being made.
 *
 * THE FAILURE DIRECTION IS DELIBERATE, and it is why the window is generous rather than
 * tight: a red suite blocks the deploy, so this must not fire on a race that is merely
 * being written up slowly. If it fires, the answer is in the data — record the race, or
 * mark it `outcome: "dnf"` — never in this number.
 */
describe("a race that has been and gone says what became of it", () => {
    /** See the docblock: the owner's turnaround, not a measured distribution. */
    const RESOLUTION_GRACE_DAYS = 30;

    it("leaves no long-past race with nothing behind its bib", () => {
        const today = parseIsoDate(BUILD_DATE);
        const overdue = EVENTS.filter((e) => {
            const end = parseIsoDate(e.end_date ?? e.date);
            return !Number.isNaN(end) && today - end > RESOLUTION_GRACE_DAYS * DAY_MS;
        });
        // WITHOUT THIS THE FILTER IS THE ASSERTION. An empty list satisfies every property,
        // and the day a typo in the window or in the date comparison empties it, the gate
        // would report the calendar as clean. The count only ever grows.
        expect(overdue.length, `no race ended more than ${RESOLUTION_GRACE_DAYS} days before `
            + `${BUILD_DATE}, so this gate examined nothing`).toBeGreaterThan(0);

        const unresolved = overdue.filter((e) =>
            e.elapsed_time === undefined && recordingsOf(e).length === 0 && e.outcome === undefined);
        expect(unresolved.map((e) => `${e.date} ${e.name}`),
            `these races ended more than ${RESOLUTION_GRACE_DAYS} days ago and carry no recording, no `
            + "elapsed_time and no outcome, so patchState draws each of them as an earned Finisher Patch "
            + "on the strength of the calendar alone. Record the race, or say it was abandoned with "
            + 'outcome: "dnf"').toEqual([]);
    });
});

/**
 * THE BOT'S STAMP, BOUNDED — the one thing the two-clock split left unmeasured.
 *
 * `src/lib/projection.ts` argues at length that `UPDATED_AT` and `BUILD_DATE` answer different
 * questions and must be allowed to differ. Nothing said how far. The build day advances every
 * night by construction — the nightly workflow dispatches a build whether or not the fetch
 * worked — while the stamp advances only when the kilometres move, so the gap opens on its own
 * and closes only when the owner rides.
 *
 * WHAT THE GAP COSTS IS THE PUBLISHED REQUIRED RATE. It divides the deficit by the days
 * remaining measured from the STAMP, so `n` days of lag is `n` days of already-spent
 * denominator, and the card prints a smaller number than the truth under a heading that says
 * how much is left. `stampLagDays` measures it; the number lives here because this is where it
 * bites.
 *
 * THIRTY DAYS, AND HERE IS WHY THAT NUMBER. The bot has never been near it: across its whole
 * history to date the largest gap between successive stamps is four days, and
 * `tests/clock-split.test.ts` builds its fixture on nine as "an ordinary rest week plus a
 * weekend". Thirty is several times either, so it cannot fire on a rest week, a holiday or a
 * bad fortnight.
 *
 * THE COMPARISON IS STRICT — a lag OF thirty days is already too far, not the last acceptable
 * value. That is the difference between a limit and a target, and it is the spelling that
 * makes "a stamp thirty days behind reddens the suite" true as written rather than off by
 * one day.
 *
 * IT CAN STILL FIRE ON SOMEBODY WHO SIMPLY STOPPED RIDING, and that is the honest limit of
 * this gate rather than a hole in it. The stamp cannot distinguish a dead credential from a
 * month off — `nextProgress` in `scripts/fetch-strava-progress.mjs` moves it only when the
 * kilometres change — so the bound is on the CONSEQUENCE, which is identical either way: a
 * month-old numerator over a today-sized window is a misleading rate whatever caused it.
 *
 * WHAT TO DO WHEN IT FIRES, since a red suite blocks the deploy and the temptation will be to
 * raise the number. Do not. Check the nightly workflow first — a failed fetch is the cause
 * that is fixable, and the run is red. If the fetch is healthy and the kilometres genuinely
 * have not moved in a month, the rate on the goal cards is the thing that is wrong, and it is
 * a real one.
 */
describe("the bot's stamp, against the day the build ran", () => {
    /** See the docblock: measured against the bot's own history, not chosen. */
    const STAMP_LAG_LIMIT_DAYS = 30;

    it("has not fallen further behind the build day than the rate can survive", () => {
        const lag = stampLagDays();
        // Non-finite rather than large is the malformed-stamp case, and it must not read as
        // fresh: every `<=` against a NaN is false, so this is asserted before the bound.
        expect(Number.isFinite(lag), `the bot's stamp or the build day is unreadable — stampLagDays `
            + "answered a non-number, so nothing below could have compared it").toBe(true);
        expect(lag, `the kilometres were last updated ${lag} days before this build. The required rate `
            + "divides the deficit by the days left measured from that stamp, so it is understating by "
            + "that many days of denominator. Check the nightly workflow before touching this bound")
            .toBeLessThan(STAMP_LAG_LIMIT_DAYS);
    });

    it("measures the lag from the days it is given, not from whatever today is", () => {
        /*
         * PINNED LITERALS RATHER THAN A MODULE MOCK, and the difference from
         * `tests/clock-split.test.ts` is worth stating because that file is the pattern this
         * one was pointed at. It mocks the JSON because the functions it tests read their
         * days from module-level DEFAULTS, so forcing a divergence is the only way to make
         * them discriminate. `stampLagDays` takes both days as parameters, so handing it two
         * is the same forcing with none of the reach — a `vi.mock` here is file-scoped and
         * would reach every other assertion in this file, several of which compare against a
         * `dist/` built with the real stamp.
         *
         * WITHOUT THIS the assertion above passes on a stamp that equals the build day, which
         * is what today's data looks like, and would go on passing if the bound were deleted
         * or the subtraction reversed.
         */
        expect(stampLagDays("2026-07-01", "2026-07-31"), "thirty days behind must measure thirty")
            .toBe(30);
        expect(stampLagDays("2026-07-31", "2026-07-31"), "a stamp on the build day has no lag").toBe(0);
        // THE BOUNDARY, BOTH SIDES OF IT, because an off-by-one here is a silent month of grace.
        expect(stampLagDays("2026-07-02", "2026-07-31") < STAMP_LAG_LIMIT_DAYS,
            "a stamp twenty-nine days behind is inside the bound").toBe(true);
        expect(stampLagDays("2026-07-01", "2026-07-31") < STAMP_LAG_LIMIT_DAYS,
            "a stamp thirty days behind must FAIL the bound — the comparison is strict, and a "
            + "`<=` here would quietly grant a thirtieth day").toBe(false);
        expect(Number.isFinite(stampLagDays("not-a-date", "2026-07-31")),
            "an unreadable stamp must not answer a number, or it would compare as fresh").toBe(false);
    });
});

/**
 * WHERE EVERY PUBLISHED FIGURE COMES FROM.
 *
 * A TOP-LEVEL `describe` RATHER THAN AN ADDITION TO THE ONE ABOVE, deliberately: appending to a
 * file's tail lands a test inside whatever block happens to end there, and two of these read
 * `dist/` rather than the modules that block is scoped to.
 *
 * `src/lib/provenance.ts` carries the argument and the position it records. These are the four
 * things that hold it up, and each was measured before it was written.
 */
describe("where every published figure comes from", () => {
    it("declares an origin for every field the type has, and none it does not", () => {
        const declared = declaredFieldPaths();
        expect(declared.size, "no fields were derived from src/lib/race.ts — this gate is vacuous")
            .toBeGreaterThan(5);

        const mapped = Object.keys(SOURCE_OF_RECORD);
        expect([...declared].filter((path) => !mapped.includes(path)).sort(),
            "src/lib/provenance.ts does not say where these fields come from. A field with no "
            + "declared origin is a figure nobody can answer for, which is the one question that "
            + "file exists to make answerable").toEqual([]);
        expect(mapped.filter((path) => !declared.has(path)).sort(),
            "src/lib/provenance.ts names these as fields and src/lib/race.ts does not declare them. "
            + "Delete the entry — an origin for a field that does not exist is a claim about "
            + "nothing").toEqual([]);
    });

    it("names a source of record, never a store a fact passed through", () => {
        /*
         * THE RULE THE MAP RESTS ON, ASSERTED RATHER THAN LEFT TO THE TYPE. `SourceOfRecord` is
         * erased at runtime, so a fifth member added to the union — or a string widened past it —
         * compiles and ships without this.
         *
         * `src/data/strava-progress.json` IS THE ONE A LATER READER WILL REACH FOR, because it is
         * where the kilometres are read from. It is a ROUTE. Naming it as an origin would put the
         * site's own store in the position of the source, which is the mistake this catches.
         */
        const allowed: readonly SourceOfRecord[] = ["strava", "organiser", "results", "athlete"];
        const used = [...new Set([
            ...Object.values(SOURCE_OF_RECORD),
            ...Object.values(PROGRESS_SOURCE_OF_RECORD),
        ])].sort();
        expect(used.filter((source) => !allowed.includes(source)),
            "a source that is not one of the four. If it names a file, a cache or a downstream "
            + "repository it is a route and not an origin — read the rule at the top of "
            + "src/lib/provenance.ts before widening this").toEqual([]);

        expect(STRAVA_SOURCED.length,
            "nothing is marked `strava`, so the reversal question that file exists to answer has "
            + "no subject — either the map is wrong or the site stopped publishing those figures")
            .toBeGreaterThan(0);
        expect(STRAVA_SOURCED.every((path) => SOURCE_OF_RECORD[path] === "strava"),
            "STRAVA_SOURCED must be derived from the map, never listed beside it").toBe(true);
    });

    it("explains every figure printed on a published surface", () => {
        /*
         * EVERY DISTANCE AND CLOCK ON THE MARKDOWN TWINS, TRACED TO A DECLARED FIELD. The expected
         * set is built ONLY from paths the map declares, so this fails in two directions: a
         * renderer that starts printing a figure from somewhere undeclared, and a map that quietly
         * loses a path something still prints.
         *
         * MEASURED BOTH WAYS BEFORE IT WAS WRITTEN. On the tree this landed against: 43 expected
         * values and ZERO unexplained. Deleting `recordings.metres` from the map left TWELVE
         * figures unexplained across `patches.md` and `patches/cycling.md`, so the coupling is
         * real rather than argued.
         *
         * THE MARKDOWN TWINS RATHER THAN THE HTML, because a figure is a bare string in one and is
         * wrapped in per-component attributes in the other. They are the same numbers;
         * `tests/patch-wall.test.ts` holds the wall to the same modules.
         */
        const km = (n: number) => n.toFixed(2);
        const has = (path: string) => path in SOURCE_OF_RECORD;
        const expected = new Set<string>();

        for (const race of EVENTS) {
            if (has("recordings.metres") || has("advertised_km")) expected.add(km(raceKm(race)));
            if (has("advertised_km") && race.advertised_km !== undefined) expected.add(km(race.advertised_km));
            if (has("elapsed_time") && race.elapsed_time) expected.add(race.elapsed_time);
            if (has("official.net_time") && race.official?.net_time) expected.add(race.official.net_time);
            if (has("official.gun_time") && race.official?.gun_time) expected.add(race.official.gun_time);
            for (const recording of recordingsOf(race)) {
                if (has("recordings.metres")) expected.add(km(recordingKm(recording)));
                if (has("recordings.elapsed_time")) expected.add(recording.elapsed_time);
            }
        }
        // The goal targets are authored in `src/data/goals.ts` and are not race fields;
        // `PROGRESS_SOURCE_OF_RECORD` is what answers for the two kilometre totals.
        for (const goal of GOALS) {
            expected.add(String(goal.total_goal));
            expected.add(String(goal.raw_progress));
            expected.add(String(goal.current_progress));
        }
        if (PROGRESS_SOURCE_OF_RECORD.cycling_km) expected.add(String(stravaProgress.cycling_km));
        if (PROGRESS_SOURCE_OF_RECORD.running_km) expected.add(String(stravaProgress.running_km));

        const unexplained: string[] = [];
        for (const file of ["dist/patches.md", "dist/patches/cycling.md", "dist/patches/running.md", "dist/llms.txt"]) {
            const text = readFileSync(file, "utf8");
            const figures = [
                ...[...text.matchAll(/\b(\d+(?:\.\d+)?) km\b/g)].map(([, value]) => value),
                ...[...text.matchAll(/\b(\d+:\d{2}:\d{2})\b/g)].map(([, value]) => value),
            ];
            unexplained.push(...figures.filter((figure) => !expected.has(figure)).map((f) => `${file}: ${f}`));
        }
        expect(expected.size, "the expected set is empty — this gate would pass on anything")
            .toBeGreaterThan(20);
        expect([...new Set(unexplained)].sort(),
            "these figures are printed but trace to no field src/lib/provenance.ts declares. Either "
            + "a renderer gained a number from somewhere undeclared, or the map lost a path "
            + "something still prints").toEqual([]);
    });

    it("never publishes the origin record itself", () => {
        /*
         * THE ORIGIN RECORD IS INTERNAL, and that is the whole of what this gate holds. A site
         * that prints where its figures came from is making a claim about a source on every page;
         * this one makes that claim in its repository instead, where it can be changed without
         * republishing.
         *
         * DELIBERATELY NOT A BAN ON THE WORD "STRAVA", AND THE ALTERNATIVE WAS MEASURED. Strava's
         * brand guidelines require a link to an activity to read "View on Strava", and that is
         * accepted here — the links stay. An allow-list around the brand name was tried first and
         * would have REDDENED A CORRECT BUILD 42 TIMES, on two forms that are not link labels at
         * all: the icon token `i-fa6-brands-strava`, which `/design` also publishes as
         * documentation, and the accessible name on a split race's part link, which reads
         * ", on Strava, <race>, <date>". Five carve-outs around a brand name is a rule that goes
         * red on correct prose the first time somebody writes some. One rule about the origin
         * record does not.
         *
         * IT READS `dist/`, so a source-only mutation is dead for it under `SKIP_BUILD=1`: a
         * negative control has to rebuild, or change what a renderer emits.
         */
        const banned = [
            "SOURCE_OF_RECORD", "PROGRESS_SOURCE_OF_RECORD", "STRAVA_SOURCED",
            "SourceOfRecord", "source of record", "provenance",
        ];
        const found: string[] = [];
        const walk = (dir: string): void => {
            for (const entry of readdirSync(dir, {withFileTypes: true})) {
                const path = join(dir, entry.name);
                if (entry.isDirectory()) { walk(path); continue; }
                if (!/\.(html|txt|md|xml|json)$/.test(entry.name)) continue;
                const text = readFileSync(path, "utf8").toLowerCase();
                found.push(...banned
                    .filter((term) => text.includes(term.toLowerCase()))
                    .map((term) => `${path}: ${term}`));
            }
        };
        walk("dist");
        expect(found.sort(),
            "the origin record reached a published surface. It is read by this suite and by a "
            + "person deciding what may be published, and by nothing else — see the header of "
            + "src/lib/provenance.ts").toEqual([]);
    });
});
