import {readFileSync, readdirSync} from "node:fs";
import {join, relative, resolve} from "node:path";
import ts from "typescript";
import {describe, expect, it} from "vitest";

import {EVENTS} from "../src/data/races";
import type {RaceEvent} from "../src/lib/race";

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
 * as easy to get wrong as the top-level ones — `metres` in particular, which nothing offline
 * can check. This used to union the bare property names of the three shapes into one flat set,
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
