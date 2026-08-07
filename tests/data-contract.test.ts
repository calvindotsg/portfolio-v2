import {readFileSync, readdirSync} from "node:fs";
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
 * EVERY FIELD NAME `RaceEvent` DECLARES, ASKED OF THE COMPILER RATHER THAN OF THE DATA.
 *
 * Deriving it from `EVENTS` would be the obvious shortcut and it is the wrong question: an
 * optional field that no current race happens to carry would drop out of the expected set,
 * so the README could stop documenting `end_date` on the day the last multi-day tour was
 * archived, and this gate would agree. The type is what a person writing a new module is
 * held to, so the type is what the README is held to.
 *
 * The nested shapes come with it. `recordings` and `official` are the two fields whose value
 * is itself a record, and their members are exactly as easy to get wrong as the top-level
 * ones — `metres` in particular, which nothing offline can check.
 */
function declaredFields(): Set<string> {
    const file = "src/lib/race.ts";
    const program = ts.createProgram([file], {
        strict: true,
        target: ts.ScriptTarget.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
    });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(file);
    expect(source, `${file} did not compile — this gate cannot answer`).toBeDefined();

    const names = new Set<string>();
    const collect = (type: ts.Type): void => {
        for (const symbol of checker.getPropertiesOfType(type)) names.add(symbol.name);
    };

    for (const statement of source!.statements) {
        if (!ts.isTypeAliasDeclaration(statement)) continue;
        if (!["RaceEvent", "Recording", "OfficialResult"].includes(statement.name.text)) continue;
        const type = checker.getTypeAtLocation(statement.name);
        for (const member of type.isUnion() ? type.types : [type]) collect(member);
    }
    return names;
}

/** Every `- \`field\`` bullet under the README's Fields heading, at any nesting depth. */
function documentedFields(): string[] {
    const section = readFileSync(README, "utf8").split(/^## /m).find((s) => s.startsWith("Fields"));
    expect(section, "the README has no Fields section").toBeDefined();
    return [...section!.matchAll(/^\s*- `([a-z_]+)`/gm)].map((m) => m[1]);
}

/**
 * THE MODULES AS FILES, keyed by basename. Globbed rather than read off `EVENTS` — that is
 * the whole point of the comparison below, and reading the array would make it a tautology.
 */
const modules = import.meta.glob<{default: RaceEvent}>("../src/data/races/*.ts", {eager: true});
const raceFiles = Object.entries(modules)
    .filter(([key]) => !key.endsWith("/index.ts"))
    .map(([key, module]) => ({basename: key.split("/").pop()!, race: module.default}))
    .sort((a, b) => a.basename.localeCompare(b.basename));

describe("the race modules, against the contract they are written to", () => {
    it("documents every field the type declares, and no field it does not", () => {
        const declared = declaredFields();
        expect(declared.size, "no fields were derived from src/lib/race.ts — this gate is vacuous")
            .toBeGreaterThan(5);
        expect(declared, "RaceEvent no longer declares `date`, so this gate is reading the wrong type")
            .toContain("date");

        const documented = documentedFields();
        expect([...declared].filter((f) => !documented.includes(f)).sort(),
            `${README} does not name these fields. A field the README omits is a field the next `
            + "race silently lacks").toEqual([]);
        expect(documented.filter((f) => !declared.has(f)).sort(),
            `${README} names these as fields and src/lib/race.ts does not declare them. Delete the `
            + "bullet — it sends a reader to write a key the compiler will refuse").toEqual([]);
    });

    it("names each module for the date inside it", () => {
        expect(raceFiles.length, "the glob found no race modules — this gate is vacuous")
            .toBeGreaterThan(5);
        for (const {basename, race} of raceFiles) {
            expect(basename.slice(0, 10),
                `${basename} is named for a different day than the \`date\` it carries (${race.date}). `
                + "The collector sorts on the field, so the two disagreeing misorders `dist/llms.txt` "
                + "with nothing else noticing").toBe(race.date);
            expect(basename, `${basename} is not YYYY-MM-DD-slug.ts`)
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

    it("puts every module in the array, so the glob has dropped nothing", () => {
        // THE ONE FAILURE THIS MIGRATION INTRODUCED. A file the pattern in
        // `src/data/races/index.ts` does not match is not an error anywhere: the race is simply
        // absent from the wall, from llms.txt and from the projection, and every other
        // assertion in the suite agrees with the calendar that is left.
        //
        // The directory is READ rather than globbed a second time, because a second glob shares
        // the mechanism it is supposed to be checking — both would agree about a race saved
        // under an extension neither of them matches.
        const onDisk = readdirSync(DIR).filter((f) => f.endsWith(".ts") && f !== "index.ts").sort();
        expect(raceFiles.map(({basename}) => basename),
            "the glob and the directory listing disagree about which files are races").toEqual(onDisk);
        expect(EVENTS.length, "the array holds a different number of races than the directory does")
            .toBe(raceFiles.length);
        const missing = raceFiles
            .filter(({race}) => !EVENTS.includes(race))
            .map(({basename}) => basename);
        expect(missing, "these modules are on disk and not in `EVENTS` — the glob in "
            + "src/data/races/index.ts is not reaching them").toEqual([]);
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
            + "the old note in src/lib/constants.ts stated on its own",
    };

    it("keeps the procedure beside the data", () => {
        const text = readFileSync(README, "utf8").toLowerCase();
        for (const [phrase, why] of Object.entries(REQUIRED_PHRASES)) {
            expect(text, `${README} must contain the phrase "${phrase}" — it is ${why}`)
                .toContain(phrase);
        }
    });
});
