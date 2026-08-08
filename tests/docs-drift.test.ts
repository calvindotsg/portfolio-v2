import {existsSync, readFileSync, readdirSync, statSync} from "node:fs";
import {join, resolve} from "node:path";
import {describe, expect, it} from "vitest";

import unoConfig from "../uno.config";

/**
 * THE PROSE IS NOT GATED BY ANYTHING ELSE IN THIS SUITE, AND IT IS THE LARGEST
 * SURFACE IN THE REPOSITORY.
 *
 * Every other file here asserts that the site is right. This one asserts that what
 * the repository SAYS about itself is right, because nothing else can: a comment
 * that names a deleted file, a README that names a script that was renamed, a
 * generator config that counts two of something there are now three of — all of
 * them build, lint, type-check and deploy green.
 *
 * THREE KINDS OF DOCUMENT LIVE HERE, AND THE FIRST TWO NEED OPPOSITE GATES. Getting
 * that wrong is what the first version of this file did, so the distinction is the
 * load-bearing idea rather than a taxonomy:
 *
 *   A CURRENT-STATE DOCUMENT describes the repository as it is today. README.md,
 *   CLAUDE.md, plans/README.md's baseline table and every comment under src/ are
 *   these. They are allowed — required — to state facts, and the gate they need is
 *   ACCURACY: the facts must match the code.
 *
 *   A STANDING-INSTRUCTION DOCUMENT is read on every future run against a codebase
 *   that has moved. `.devin/wiki.json` is the one here: it configures the generated
 *   DeepWiki, and it is written once and consulted indefinitely. A fact stated in
 *   such a document is a fact nobody will revisit, so the gate it needs is not
 *   accuracy but DURABILITY — it must not contain the kind of claim that can go
 *   stale at all. Facts belong in the code, where they are true by construction;
 *   the instruction belongs here, and says where to read them.
 *
 *   A PROPOSAL describes a repository that does not exist yet. A numbered plan under
 *   `plans/` is the one here. It needs neither gate, because its whole subject is the
 *   tree it intends to create — the argument is beside `isProposal` below, and is not
 *   repeated here.
 *
 * THE FIRST VERSION OF THIS FILE GATED THE WRONG PROPERTY, and the mistake is worth
 * recording because it is the more tempting of the two. `.devin/wiki.json` said the
 * site's total first-party client JavaScript was 'two tiny inline scripts'. The build
 * ships three; the missing one is the press-hold script that every `data-[leaving]:`
 * declaration in uno.config.ts depends on. The fix taken then was to correct the
 * sentence to three and add an assertion pinning it to a census of the build — which
 * works, and which entrenches a rotting fact in the one document that must not carry
 * one, and pays for it with a test that fails whenever a script is legitimately added.
 * The fix taken now is to delete the claim: the wiki says how to enumerate the scripts
 * at generation time, the generator reads them out of the repository, and the class of
 * defect is designed out rather than monitored. Where a claim can be deleted instead
 * of gated, delete it.
 *
 * WHAT REMAINS GATEABLE, in the current-state documents:
 *
 *   1. REFERENCES — a path, a command, a configured name. Checkable against the
 *      filesystem and the manifest with no judgement at all, and the checks apply to
 *      standing instructions too: a durable pointer still has to point somewhere.
 *   2. ENUMERATIONS — "these are the suites", "these are the shortcuts". Derive the
 *      real set from the code and require the document to name every member.
 *   3. COUNTS — "four shortcuts". Derive the number, then require the document to
 *      contain the phrase it belongs to, spelled out. This is the mechanism
 *      `tests/content.test.ts` already uses to keep `METADATA.description` naming
 *      each goal's target figure: everything around the phrase is free prose, the
 *      number is not. Parsing prose instead invites a gate that is right about
 *      grammar and wrong about facts.
 *
 * Rationale, measurement and history are none of those and are deliberately left
 * alone in every document. A gate that tried to hold them would be a gate on writing.
 *
 * `plans/done/` IS EXCLUDED, AND THAT IS THE ONE STRUCTURAL DECISION HERE. Those
 * files are an archive: plan 003 describes deleting the Svelte ProgressBar component
 * and must go on naming it. A plan that stopped naming what it deleted would stop
 * being a record of the deletion. `plans/README.md` is NOT archived — it calls itself
 * the living index and its baseline table claims to be updated in place, so it is
 * held to the same standard as everything else.
 *
 * IT GATES ITSELF, which is not a curiosity: the first run of this file failed on its
 * own prose three times over — for naming a deleted component in backticks, for the
 * words meaning a pnpm script reading as a command, and for a shape name reading as a
 * constant. Two of those were the extractors being too loose and were fixed there; one
 * was this comment being wrong in exactly the way it exists to catch.
 *
 * CALIBRATED BY MUTATION, one gate at a time, because two of the original gates were
 * green against the change they exist to catch and looked correct while being so. Each
 * of these was executed and turned this file red: a document naming a component under
 * src/components that does not exist; a document telling the reader to run a pnpm
 * script that is not in package.json (typecheck — the very name CLAUDE.md warns
 * about); a document naming an undeclared constant; a fifth shortcut added to
 * `uno.config.ts`; a new suite added without a README mention; a frozen count written
 * into the wiki; a component filename written into the wiki; and a wiki page stripped
 * of its derivation directive.
 *
 * Note that the first two of those had to be written WITHOUT backticks here. Putting a
 * fake path or command in backticks in this comment makes it a claim like any other and
 * reddens the build — which is the gate working, and is why the examples are described
 * rather than quoted.
 */

/**
 * `.scratchpad` AND `.claude/worktrees` ARE SKIPPED BECAUSE `.gitignore` PROVISIONS THEM,
 * and leaving them in made this suite fail on a developer's machine while passing in CI —
 * the worst shape a gate can have, because the person who hits it did nothing wrong and
 * the obvious response is to delete the gate.
 *
 * Both hold agent working files: scratch notes naming a path that was never real, and
 * whole nested checkouts of this repository. The second is the sharper one. `plans/done/`
 * is exempt as an archive, but the exemption tested the START of the path, so a worktree
 * at `.claude/worktrees/x` put the archive at `.claude/worktrees/x/plans/done/` where the
 * prefix no longer matched — measured at 13 failures from one copied plan file, every one
 * of them naming a component that plan exists to record deleting. The archive test now
 * matches the segment anywhere in the path, which is correct for a nested checkout and
 * costs nothing otherwise.
 *
 * CI never saw either, because a fresh `actions/checkout` has neither directory. That is
 * exactly why it is worth a comment: a green pipeline was not evidence here.
 */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", ".venv", "coverage", ".scratchpad"]);
const SKIP_PATHS = new Set([".claude/worktrees"]);
const ARCHIVE = "plans/done/";
const WIKI = ".devin/wiki.json";

/**
 * A NUMBERED PLAN IS A **PROPOSAL**, AND THAT IS A THIRD DOCUMENT CLASS.
 *
 * CLAUDE.md splits documents two ways: a current-state document may state facts and is
 * gated for accuracy; `.devin/wiki.json` is a standing instruction and is gated for
 * durability instead. A plan is neither. It describes a tree that does not exist yet —
 * the files it will create, the `pnpm` script it will add, the configured value it will
 * introduce — so the three gates below, each of which checks a name against the tree that
 * DOES exist, are asking a proposal the wrong question. Every one of its forward
 * references is a miss, and a plan that has to spell its own subject matter without
 * backticks to stay green is a plan nobody will keep writing.
 *
 * THIS IS A GAP RATHER THAN A REGRESSION, and the dates are why nobody hit it: plans 016
 * and 017 sat at the top level of `plans/` until 2026-07-29, and this file landed
 * 2026-07-31. The two had never met until plan 018.
 *
 * `plans/README.md` IS NOT A PROPOSAL and is deliberately not matched here. It is the
 * living index — its execution table and its baseline are claims about now, which is
 * exactly what these gates are for. The pattern is anchored to the `NNN-` prefix so the
 * distinction is structural rather than a judgement about a filename; a plan named any
 * other way is gated like ordinary prose, which is the safe default. Rename the file
 * rather than loosening this.
 *
 * WHAT A PROPOSAL IS STILL GATED FOR: everything else in this suite. Only the three
 * name-versus-today gates skip it.
 *
 * MEASURED, on the six plans this landed with: the path gate reports 51 misses and the
 * script gate 7, every one of them a forward reference. The clearest of them is plan 019
 * naming the two scripts CLAUDE.md already warns do not exist here — `typecheck` and
 * `lint` — inside a sentence whose entire purpose is to warn an executor about exactly
 * that. A document penalised for saying the true thing this suite exists to enforce.
 * (Written without the invocation prefix here on purpose: this file is not a proposal, so
 * the gate below reads its own comment, and it reddened on the first draft of this note.)
 *
 * THE CONFIGURED-VALUE GATE IS UNEXERCISED TODAY: those six plans produce zero misses
 * there. It is exempted anyway, for the reason `uno.config.ts` gives when it safelists an
 * icon class another constant already emits — a member left out of a set it belongs to
 * fails silently the first time it is needed, and the next plan to propose a new
 * repository variable would redden with no hint that this argument had ever been had.
 * The class is what is being exempted, not the three symptoms.
 */
const isProposal = (file: string) => /^plans\/\d{3}-/.test(file);
const read = (p: string) => readFileSync(p, "utf8");

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (SKIP_DIRS.has(name)) continue;
        const p = join(dir, name);
        if (SKIP_PATHS.has(p.replace(/^\.\//, ""))) continue;
        if (statSync(p).isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

/**
 * EVERY FILE THAT CARRIES PROSE ABOUT THIS REPOSITORY, discovered rather than listed
 * for the reason `tests/helpers/pages.ts` gives about routes: a hand-kept list is the
 * failure mode this whole file is a response to, and a new document that no gate
 * reaches is the same defect as a stale one.
 *
 * Source files are in scope alongside the Markdown because that is where most of the
 * prose actually lives — `uno.config.ts` is the better part of a thousand lines,
 * overwhelmingly comment, and `src/layouts/BasicLayout.astro` explains two client
 * scripts and a palette. Excluding them would gate the small half.
 */
function liveDocs(): string[] {
    return walk(".")
        .map((p) => p.replace(/^\.\//, ""))
        .filter((p) => /\.(md|ts|astro|mjs|yml|yaml|json|py|sh)$/.test(p))
        .filter((p) => !p.includes(ARCHIVE) && p !== "pnpm-lock.yaml" && p !== "package.json")
        .sort();
}

/** Every backticked run of non-whitespace in `text`, with the line it sits on. */
function backtickedIn(text: string): {token: string, line: number}[] {
    const out: {token: string, line: number}[] = [];
    text.split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/`([^`\n]{2,120})`/g)) {
            const token = m[1].trim().replace(/[\\),.:;]+$/, "");
            if (token && !/\s/.test(token)) out.push({token, line: i + 1});
        }
    });
    return out;
}

/** As {@link backtickedIn}, over the contents of `file`. */
const backticked = (file: string) => backtickedIn(read(file));

/** Every basename in the tree, so a document naming a file with no directory can be checked. */
function basenamesInTree(): Set<string> {
    return new Set(walk(".").map((p) => p.split("/").pop()!));
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "eleven", "twelve"];

describe("documentation, against the code it describes", () => {
    /**
     * WHAT A DOCUMENT NAMES MUST BE THERE. The cheapest class of rot and the only one
     * with no judgement in it: a path is either on disk or it is not.
     *
     * Only repository-relative paths are considered — a token has to begin with one of
     * the real top-level directories. Everything else in backticks on this site is code:
     * template literals, regular expressions, URL paths, CSS selectors and npm specifiers,
     * none of which is a claim about the filesystem. Restricting by prefix rather than by
     * shape is what keeps this at zero false positives; the earlier draft matched anything
     * containing a slash and reported 261 "misses", of which every one was code.
     *
     * A `:12` or `:12-30` line anchor is stripped before the check. Anchors DO rot — the
     * line moves and the pointer silently starts citing something else — but a gate on
     * them would fail on every unrelated edit above the cited line, which is a gate that
     * gets deleted rather than obeyed. They survive in the archive and are not written in
     * live prose.
     */
    const TOP_LEVEL = ["src/", "tests/", "dns/", "plans/", "public/", "scripts/",
        ".github/", ".husky/", ".devin/", ".vscode/"];

    /**
     * PATHS NAMED IN ORDER TO SAY THEY ARE NOT THERE, each with the reason it is worth
     * naming. This is an excuse list, so it is asserted in BOTH directions: the gate below
     * skips these, and the one after it fails if any of them comes back. An excuse that
     * outlives the thing it excuses is the same defect this file exists to catch, one
     * level up.
     */
    /**
     * A BARE FILENAME IS A CLAIM ABOUT THE FILESYSTEM TOO, and until this rule existed it was
     * the claim nothing checked. The prefix restriction above is what keeps the path rule at
     * zero false positives, and it also means a token with no directory in it never reaches
     * `existsSync` — so `constants.ts` written without its `src/lib/` was invisible. MEASURED,
     * and this is the whole argument for the rule: plan 021 deleted that file and 33 bare
     * references to it survived a fully green suite. Renaming anything is a migration whose
     * prose half no gate could see.
     *
     * IT ASKS THE WEAK QUESTION ON PURPOSE — does the repository hold a file with this name,
     * anywhere. It cannot say the pointer leads to the RIGHT file, because a bare name does not
     * say which directory it meant, and nothing stops two directories holding the same one.
     * What it does say is that the name still refers to something, which is exactly the rot a
     * deletion or a rename leaves behind.
     *
     * THE EXTENSIONS ARE THE ONES THIS REPOSITORY ROTS IN, and the shape is deliberately
     * narrow: a lowercase name with a source or config extension and no slash. Prose is full of
     * backticked code that would read as a filename to a looser pattern. MEASURED against the
     * tree at `96ec8fa`, the commit this landed on: this pattern matches 119 tokens and 111
     * resolve; the narrower first draft, without the underscore or `yaml`, saw 109 and 101 of
     * the same. Both find the same 8 misses, and those split 7 + 1 — seven naming the file plan
     * 021 DELETED, one naming the suite it RENAMED, which is the distinction the two excuses
     * below exist to keep apart.
     *
     * A CENSUS IN THIS FILE COUNTS ITSELF. The rule scans every live document and this is one,
     * so writing the rule's own rationale adds sites to its own totals — and the anchor-stripping
     * two lines down means a token carrying a `:12` suffix counts as the name it points at. The
     * first draft of this comment was measured with a probe that did neither and reported one
     * miss fewer than the gate it was sizing.
     *
     * A MEDIAL UNDERSCORE IS ALLOWED AND A LEADING ONE IS NOT, which is not a style preference:
     * `_worker.js` and `_routes.json` are named in this suite precisely to assert they are NOT
     * in the build, so a rule that accepted a leading underscore would redden on the two names
     * whose absence is the assertion. Allowing the medial one is what finally makes the `py`
     * arm live — the only Python file here is `dns/test_filters.py`.
     *
     * KNOWN GAP, MEASURED AND DEFERRED: the rule is case-sensitive, so it does not see a
     * PascalCase stem. That is 42 further tokens at this commit, 39 of them `.astro` component
     * names — proven live by renaming a component and watching the full suite stay green while
     * a document went on naming the old file. It is not widened here because a case-insensitive
     * rule reports three tokens that were never files of ours: a `YYYY-MM-DD-slug.ts` naming
     * pattern, twice, and one of Cloudflare's own source files. Those need a "not a file of
     * ours" list rather than an entry in GONE, whose come-back gate would then be asserting
     * something false about its own subject.
     */
    const BARE_SOURCE_FILE = /^[a-z0-9][a-z0-9._-]*\.(ts|astro|mjs|js|json|yml|yaml|sh|py)$/;

    /**
     * AN EXCUSE IS SCOPED TO THE DOCUMENTS THAT EARNED IT. Both lists below share this shape,
     * because a repository carrying two excuse lists of two shapes is one where the weaker shape
     * is the one nobody notices using.
     *
     * `where` IS THE WHOLE POINT. An unscoped excuse says "this name may be missing anywhere",
     * which is a licence rather than a record: with the earlier global form, a flatly false
     * claim about a deleted file planted in a live `src/` comment shipped green. The come-back
     * gate does not bound that — it guards RESURRECTION, and this guards ROT, which are
     * different failures with different fixes.
     *
     * A DIRECTORY PREFIX ENDS IN `/` AND IS COMPARED AS ONE. A bare `startsWith` would hand any
     * document whose path merely BEGINS with an excused one — a backup copy beside it, say — the
     * excuse written for the original, which is the same silent widening this file exists to
     * catch. (Described rather than quoted: naming that copy in backticks would make this comment
     * a claim about the filesystem, and it reddened the gate on the first draft of this note.)
     */
    type Excuse = {name: string, where: readonly string[], why: string}

    const excused = (list: readonly Excuse[], name: string, doc: string) =>
        list.some((e) => e.name === name
            && e.where.some((w) => (w.endsWith("/") ? doc.startsWith(w) : doc === w)));

    /**
     * NAMES KEPT IN ORDER TO RECORD THAT THEY ARE GONE — the bare-filename half. `plans/done/`
     * is exempt wholesale because a plan that stopped naming what it deleted would stop being a
     * record of the deletion; these are the live documents doing the same job.
     *
     * AN ENTRY IS THE LAST RESORT RATHER THAN THE CHEAP WAY OUT. When this list was written the
     * rule reported nine sites for these two names: six were records and three were ordinary rot
     * in a comment, and all three were fixed rather than covered. Excusing them would have been a
     * green suite over the exact defect the rule was added to find.
     */
    const GONE: readonly Excuse[] = [
        {
            name: "constants.ts",
            where: ["plans/README.md", "tests/docs-drift.test.ts", "tests/rendered-html.test.ts"],
            why: "split into src/content/ and src/data/ by plan 021 and deleted. The plans index names it as that plan's own title and in its dated audit findings; this file names it in the rule's rationale; the rendered-HTML suite quotes what two past failures said, and repointing those would make the record false",
        },
        {
            name: "constants.test.ts",
            where: ["tests/docs-drift.test.ts"],
            why: "renamed to content.test.ts by the same plan. The suite-list gate below names it to record the hole that rename walked into, which is the reason that gate has its current shape",
        },
    ];

    const NAMED_AS_ABSENT: readonly Excuse[] = [
        {
            name: "public/llms.txt",
            where: ["README.md", "CLAUDE.md", "src/content/home.ts", "src/pages/llms.txt.ts", "tests/build-output.test.ts", "plans/README.md", ".devin/wiki.json"],
            why: "replaced by the generated endpoint src/pages/llms.txt.ts in PR #108; named in several places precisely to record that the hand-written file is gone",
        },
        {
            name: "public/404.html",
            where: ["src/pages/404.astro", "tests/build-output.test.ts", "plans/README.md"],
            why: "the alternative src/pages/404.astro rejects in its own comment — a static copy of the shell outside the theme, the analytics tag and the build-date stamp",
        },
        {
            name: "public/.well-known/",
            where: [".github/workflows/ci.yml", "tests/build-output.test.ts"],
            why: "ci.yml names it as the ordinary way a dot-prefixed path would come to exist under dist/, where upload-artifact would silently drop it. There is no such file today, which is the point",
        },
        {
            name: "src/content.config.ts",
            where: ["CLAUDE.md", "tests/docs-drift.test.ts"],
            why: "CLAUDE.md names both spellings of Astro's content-collection config to say that NEITHER may be added: src/content/ is a directory Astro reserves, and the modules there are ordinary source only while no collection config exists. The absence IS the permission",
        },
        {
            name: "src/content/config.ts",
            where: ["CLAUDE.md", "tests/docs-drift.test.ts"],
            why: "the legacy spelling of the same config, named in the same sentence and absent for the same reason",
        },
    ];

    /**
     * THE RULE ITSELF, TAKEN OUT OF THE LOOP SO IT CAN BE EXERCISED ON A DOCUMENT THAT DOES NOT
     * EXIST. A gate whose only stimulus is the live tree can only be calibrated by breaking the
     * tree, which means in practice it is not calibrated at all — both directions of this one
     * are asserted below against text written for the purpose, with the two predicates stubbed.
     *
     * `hasPath` and `hasFile` are handed in for that reason and are the real `existsSync` and
     * the real basename index in the gate.
     */
    type Named = {token: string, line: number, kind: "path" | "file"}
    function unmetNames(
        tokens: {token: string, line: number}[],
        doc: string,
        hasPath: (p: string) => boolean,
        hasFile: (name: string) => boolean,
    ): {misses: Named[], considered: number} {
        const misses: Named[] = [];
        let considered = 0;
        for (const {token, line} of tokens) {
            if (/[*${}]/.test(token)) continue; // globs and interpolations are not paths
            const bare = token.replace(/:\d+(-\d+)?$/, "").replace(/\/$/, "");
            if (TOP_LEVEL.some((t) => token.startsWith(t))) {
                if (excused(NAMED_AS_ABSENT, token, doc) || excused(NAMED_AS_ABSENT, `${bare}/`, doc)) continue;
                considered++;
                if (!hasPath(bare)) misses.push({token, line, kind: "path"});
            } else if (BARE_SOURCE_FILE.test(bare)) {
                if (excused(GONE, bare, doc)) continue;
                considered++;
                if (!hasFile(bare)) misses.push({token, line, kind: "file"});
            }
        }
        return {misses, considered};
    }

    /**
     * THE TWO REAL PREDICATES, BOUND ONCE. They are named here rather than written inline at the
     * call site so that exactly one definition exists for the gate to use and for the wiring
     * assertion below to hold — with them inline, replacing either with something that answers
     * yes to everything left the whole suite green, and the synthetic test could not see it
     * because it supplies its own stubs.
     */
    const treeBasenames = basenamesInTree();
    const hasPath = (p: string) => existsSync(resolve(p));
    const hasFile = (name: string) => treeBasenames.has(name);

    it("names no file that is not there", () => {
        const found: string[] = [];
        let considered = 0;
        for (const file of liveDocs()) {
            if (isProposal(file)) continue;
            const run = unmetNames(backticked(file), file, hasPath, hasFile);
            considered += run.considered;
            for (const {token, line} of run.misses) found.push(`${file}:${line} names \`${token}\``);
        }
        expect(considered, "no document named a repository path or file — this gate is vacuous").toBeGreaterThan(50);
        expect(found, "these documents name files that do not exist. Fix the reference, or add it to NAMED_AS_ABSENT (a path) or GONE (a bare filename), scoped to the documents that name it and with the reason it is named at all").toEqual([]);
    });

    /**
     * THE REAL PREDICATES ARE WIRED TO THE RULE — the assertion the synthetic test above cannot
     * make, because it stubs exactly the thing that has to be checked. Two names this repository
     * has and two it does not, pushed through `unmetNames` with the bindings the gate itself
     * uses: the split must fall where the filesystem says, not where a stub says.
     */
    it("asks the real filesystem, on both halves of the rule", () => {
        const tick = "`";
        const doc = ["src/lib/projection.ts", "projection.ts", "src/lib/vanished.ts", "vanished.ts"]
            .map((s) => `${tick}${s}${tick}`).join("\n");
        const {misses} = unmetNames(backtickedIn(doc), "README.md", hasPath, hasFile);
        expect(misses.map(({token}) => token),
            "the real predicates must find the two absent names and pass the two present ones")
            .toEqual(["src/lib/vanished.ts", "vanished.ts"]);
    });

    /**
     * BOTH DIRECTIONS OF BOTH HALVES, on text this file owns rather than on the tree. The
     * stimulus each assertion needs is the one the gate would otherwise never meet: a name that
     * is not there.
     *
     * THE FIXTURE'S BACKTICKS ARE BUILT RATHER THAN TYPED, and the first draft of this test is
     * why. This file is gated by the rule it defines, so a quoted fake name is a claim like any
     * other — writing the two absent names in real backticks reddened the gate, naming this test
     * as the offending document. The names are assembled here so they exist for the extractor
     * without existing for the gate.
     *
     * THE PASCALCASE PAIR IS LOAD-BEARING. The rule's case-sensitivity is a deliberate, measured
     * gap rather than an oversight, and without a case that pins the current behaviour the next
     * narrowing of that pattern is a green one.
     */
    it("catches a name that is gone, and passes one that is there", () => {
        const tick = "`";
        const quoted = (s: string) => `${tick}${s}${tick}`;
        const doc = [
            `a path that is there: ${quoted("src/lib/projection.ts")}`,
            `a path that is not: ${quoted("src/lib/vanished.ts")}`,
            `a bare name that is there: ${quoted("projection.ts")}`,
            `a bare name that is not: ${quoted("vanished.ts")}`,
            `a medial underscore is a name: ${quoted("test_filters.py")}`,
            `a leading one is not: ${quoted("_routes.json")}`,
            `PascalCase is the known gap: ${quoted("Vanished.astro")}`,
            `and its path form is not: ${quoted("src/components/Vanished.astro")}`,
            `not a filename at all: ${quoted("display:contents")}`,
        ].join("\n");
        const present = new Set(["projection.ts"]);
        const {misses, considered} = unmetNames(backtickedIn(doc), "README.md",
            (p) => p === "src/lib/projection.ts", (n) => present.has(n));
        expect(misses.map(({token, kind}) => `${kind} ${token}`)).toEqual([
            "path src/lib/vanished.ts",
            "file vanished.ts",
            "file test_filters.py",
            "path src/components/Vanished.astro",
        ]);
        // Four names reached a predicate and were satisfied or reported; the leading-underscore
        // and PascalCase tokens reached none, which is the deferred gap stated in place.
        expect(considered, "the names that ARE there must reach a predicate too, or the rule is only half exercised").toBe(6);
    });

    /**
     * AN EXCUSE DOES NOT TRAVEL. The scoping is the fix for a global excuse letting a false claim
     * ride anywhere in the tree, so it is asserted rather than described — including the
     * `.bak` case, which is what a bare prefix comparison would silently wave through.
     */
    it("applies an excuse only where it was written down", () => {
        const list: Excuse[] = [
            {name: "ghost.ts", where: ["README.md", "plans/"], why: "fixture"},
        ];
        expect(excused(list, "ghost.ts", "README.md"), "named where it was excused").toBe(true);
        expect(excused(list, "ghost.ts", "plans/README.md"), "a directory prefix covers what is under it").toBe(true);
        expect(excused(list, "ghost.ts", "src/lib/projection.ts"), "an excuse must not travel").toBe(false);
        expect(excused(list, "ghost.ts", "README.md.bak"), "a prefix must match whole segments").toBe(false);
        expect(excused(list, "other.ts", "README.md"), "the excuse is per name").toBe(false);
    });

    it("keeps no excuse for a file that has come back", () => {
        for (const {name, why} of NAMED_AS_ABSENT) {
            expect(hasPath(name.replace(/\/$/, "")),
                `${name} exists again, so its NAMED_AS_ABSENT entry is now false: "${why}"`).toBe(false);
        }
        for (const {name, why} of GONE) {
            expect(hasFile(name),
                `a file called ${name} exists again, so its GONE entry is now false: "${why}"`).toBe(false);
        }
    });

    /**
     * AN EXCUSE POINTS AT DOCUMENTS, AND THOSE ROT TOO. A `where` naming a document that has been
     * renamed or deleted silently widens nothing and hides nothing — it simply stops meaning
     * anything, and the next reader cannot tell a scope from a leftover.
     */
    it("scopes every excuse to documents that exist", () => {
        for (const {name, where} of [...NAMED_AS_ABSENT, ...GONE]) {
            expect(where, `${name} has no scope, which is the global form this shape replaced`).not.toEqual([]);
            for (const w of where) {
                expect(hasPath(w.replace(/\/$/, "")),
                    `${name} is excused in ${w}, which does not exist`).toBe(true);
            }
        }
    });

    /**
     * THE PROPOSAL EXEMPTION IS ASSERTED IN BOTH DIRECTIONS, for the reason the excuse list
     * above is: an exemption is the gate's new single point of failure, and one that only
     * ever widens is one nobody notices widening. So this checks that it catches what it is
     * for AND that it does not reach the index or the archive.
     *
     * NON-VACUITY COMES FROM THE PREDICATE, NOT FROM THE TREE, and the difference is the
     * whole reason this note exists. The obvious form — assert that some live plan is
     * currently exempted — reads as the stronger test and is the weaker one: it passes only
     * while `plans/` happens to hold a live plan, so ARCHIVING THE LAST ONE turns this red.
     * That is not a hypothetical, it is the first local rule this directory writes down
     * ("completed plans move to `done/`"), so the gate would have punished someone for
     * following the documented lifecycle, and blamed the exemption while doing it. Asking
     * the predicate about a filename instead is unconditionally answerable and says the
     * same thing.
     */
    it("exempts a numbered plan and nothing else", () => {
        expect(isProposal("plans/024-a-plan-that-does-not-exist-yet.md"),
            "the exemption no longer recognises a numbered plan, so every proposal is gated as ordinary prose")
            .toBe(true);
        for (const file of liveDocs().filter(isProposal)) expect(file).toMatch(/^plans\/\d{3}-[a-z0-9-]+\.md$/);

        for (const notAProposal of ["plans/README.md", "README.md", "CLAUDE.md",
            `${ARCHIVE}015-automate-goal-progress-from-strava.md`, "src/lib/projection.ts"]) {
            expect(isProposal(notAProposal),
                `${notAProposal} is not a proposal — it states what is true now and must stay gated`).toBe(false);
        }
    });

    /**
     * EVERY `pnpm <thing>` A DOCUMENT NAMES IS A SCRIPT THAT EXISTS. CLAUDE.md warns in
     * prose that the scripts are `eslint` and `check` — "not `lint`, not `typecheck`;
     * neither of those script names exists" — which is a rule stated where nothing can
     * enforce it. This enforces it, for every document at once.
     *
     * pnpm's own subcommands are not scripts and are named legitimately throughout
     * (`pnpm install`, `pnpm audit`, `pnpm dlx`). They are listed rather than pattern
     * matched, so a mistyped script name cannot hide behind looking like a subcommand.
     *
     * ONLY A COMMAND COUNTS — backticked, or a line of a fenced block. In prose "pnpm"
     * is an English noun and the next word is not an invocation: "package management is
     * pnpm only" and "the two pnpm spellings" both read as commands to a bare pattern,
     * and both did on the first run of this gate.
     */
    const PNPM_SUBCOMMANDS = new Set(["install", "add", "remove", "update", "audit", "dlx",
        "exec", "why", "list", "run", "import", "link", "outdated", "store", "rebuild"]);

    it("names no pnpm script that is not in package.json", () => {
        const scripts = new Set(Object.keys(JSON.parse(read("package.json")).scripts));
        const misses: string[] = [];
        let checked = 0;
        for (const file of liveDocs()) {
            if (isProposal(file)) continue;
            let fenced = false;
            read(file).split("\n").forEach((text, i) => {
                if (/^\s*```/.test(text)) {
                    fenced = !fenced;
                    return;
                }
                const commands = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
                if (fenced) commands.push(text);
                for (const command of commands) {
                    const m = /^\s*(?:SKIP_BUILD=1 )?pnpm (?:run )?([a-z][a-z:.-]*)/.exec(command);
                    if (!m || PNPM_SUBCOMMANDS.has(m[1])) continue;
                    checked++;
                    if (!scripts.has(m[1])) misses.push(`${file}:${i + 1} names \`pnpm ${m[1]}\``);
                }
            });
        }
        expect(checked, "no document named a pnpm script — this gate is vacuous").toBeGreaterThan(20);
        expect(misses, `these are not scripts in package.json (${[...scripts].sort().join(", ")})`).toEqual([]);
    });

    /**
     * EVERY CONFIGURED NAME A DOCUMENT NAMES IS DECLARED SOMEWHERE. Upper-case-with-
     * underscores is this repository's spelling for exactly two things — a module-level
     * constant and a GitHub secret, variable or environment input — and the CLAUDE.md rule
     * that every configurable value lives in one of three places is what makes that
     * reliable enough to gate. A token of that shape naming nothing is a constant that was
     * renamed or deleted with its prose left behind.
     *
     * The declared set is DERIVED, not listed: constants come from the source, inputs
     * from `.env.example`, the workflows' `env:` keys, and every `secrets.X` / `vars.X`
     * / `env/X` reference. Only the names owned by somebody else need an entry.
     */
    const OWNED_ELSEWHERE: Record<string, string> = {
        GITHUB_TOKEN: "GitHub Actions injects it; strava-progress.yml names it to explain why a push made with it triggers no workflow run",
        WRANGLER_OUTPUT_FILE_DIRECTORY: "wrangler's own env var, named in ci.yml as the one NOT used — it addresses a directory holding a randomly-named file, which a later step cannot read",
        STATUS_CODE_PAGES: "@astrojs/sitemap's own constant, named in build-output.test.ts to record that the sitemap integration already excludes the 404 without this repository asking it to",
    };

    it("names no configured value that is declared nowhere", () => {
        const declared = new Set<string>(Object.keys(OWNED_ELSEWHERE));
        for (const file of walk(".").map((p) => p.replace(/^\.\//, ""))) {
            if (!/\.(ts|astro|mjs|js|yml|yaml|example)$/.test(file) || file === "pnpm-lock.yaml") continue;
            const text = read(file);
            for (const m of text.matchAll(/\b(?:const|let|var|function)\s+([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) declared.add(m[1]);
            for (const m of text.matchAll(/\b(?:secrets|vars|env)\.([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) declared.add(m[1]);
            for (const m of text.matchAll(/\benv\/([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) declared.add(m[1]);
            for (const m of text.matchAll(/^\s*([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\s*[:=]/gm)) declared.add(m[1]);
        }

        const misses: string[] = [];
        let checked = 0;
        for (const file of liveDocs()) {
            if (isProposal(file)) continue;
            for (const {token, line} of backticked(file)) {
                if (!/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(token)) continue;
                checked++;
                if (!declared.has(token)) misses.push(`${file}:${line} names \`${token}\``);
            }
        }
        expect(checked, "no document named a configured value — this gate is vacuous").toBeGreaterThan(20);
        expect(misses, "these names are declared nowhere in the repository. Rename the reference, or add the name to OWNED_ELSEWHERE if it belongs to GitHub or to a dependency").toEqual([]);
    });

    /**
     * THE SHORTCUTS ARE THE SITE'S KINDS OF CONTROL, and CLAUDE.md enumerates them by
     * name and by count. It is a current-state document written for a coding agent about
     * to touch this code, so a fact is exactly what belongs in it — and a stale one sends
     * that agent to the wrong member of the set. The vocabulary has gone from one entry to
     * several, and the plate moved from a variant to the base while prose went on placing
     * it in the variant.
     *
     * The count works by CANONICAL PHRASE: the document must contain the spelled-out
     * number in the phrase it belongs to. Reword around it freely; the number is the part
     * that may not drift. `.devin/wiki.json` is deliberately NOT held to this — it is a
     * standing instruction and states no counts at all, which the durability gate below
     * enforces from the other side.
     */
    it("keeps CLAUDE.md's shortcut vocabulary in step with uno.config.ts", () => {
        const names = Object.keys(unoConfig.shortcuts as Record<string, string>);
        expect(names.length, "uno.config.ts declares no shortcuts — this gate is vacuous").toBeGreaterThan(1);

        const text = read("CLAUDE.md");
        expect(names.filter((n) => !text.includes(n)),
            "CLAUDE.md does not name every shortcut in uno.config.ts").toEqual([]);
        expect(text.toLowerCase(), `CLAUDE.md must contain the phrase "${NUMBER_WORDS[names.length]} shortcuts"`)
            .toContain(`${NUMBER_WORDS[names.length]} shortcuts`);
    });

    /**
     * README.md'S TESTING SECTION LISTS THE SUITES, so a suite it does not list is a suite
     * that does not exist as far as a reader is concerned. That is how this repository
     * accumulated more than a dozen suites under a section that describes three of them at
     * length and gestures at the rest — the gesture is fine, and it has to be complete.
     *
     * The section is authoritative rather than decorative for a specific reason: it is the
     * only place that says what each suite is FOR, and `pnpm test` prints filenames without
     * saying which question any of them answers.
     */
    it("lists every test suite in the README", () => {
        const suites = readdirSync("tests")
            .filter((f) => f.endsWith(".test.ts"))
            .map((f) => f.replace(/\.test\.ts$/, ""))
            .sort();
        expect(suites.length, "there are no suites — this gate is vacuous").toBeGreaterThan(5);

        /*
         * THE MENTION HAS TO BE OF THE SUITE, AND A BARE SUBSTRING IS NOT. This read
         * `readme.includes(s)` against the stem alone, which any prose containing that word
         * satisfies — and plan 021 walked straight into it: renaming `constants.test.ts` to
         * `content.test.ts` moved the suite's identity onto the token `content`, which the
         * same commit wrote into README seven times as `src/content/`. The suite could then
         * have been deleted from the Testing section with this gate still green, and three
         * others (`build-output`, `derived-figures`, `projection`) were already vouched for
         * by prose about the code rather than about the suite.
         *
         * A FULL PATH IS THE STRONG FORM AND A BACKTICKED STEM IS THE WEAK ONE, and both
         * are needed: requiring the path form alone reddens on ten suites this README
         * describes perfectly well in its own voice, which would be a gate failing on
         * correct code rather than a gate finding anything.
         */
        const readme = read("README.md");
        const named = (s: string) => readme.includes(`tests/${s}.test.ts`) || readme.includes(`\`${s}\``);
        expect(suites.filter((s) => !named(s)),
            "README.md's Testing section does not mention these suites").toEqual([]);
    });

    /**
     * THE DURABILITY GATE, AND THE ONLY ONE HERE POINTED AT A DOCUMENT'S KIND RATHER THAN
     * ITS CONTENT. `.devin/wiki.json` configures a generated wiki: it is read on every
     * future generation, against a codebase that has moved, and nothing prompts anyone to
     * revisit it. So the property worth holding is not that its facts are current — it is
     * that it states no fact that can stop being current.
     *
     * WHAT IT MAY NOT CONTAIN, all three measured on the revision this replaced:
     *
     *   A COUNT of anything the repository can be asked. There were eighteen — two inline
     *   scripts, two CSS chunks, two shortcuts, four pages, six social links. Every one was
     *   derivable at generation time, and several were already wrong.
     *
     *   A COMPONENT FILENAME. Components get renamed, split and deleted; the file that
     *   ships a script today is not necessarily the one that ships it next year, and an
     *   instruction naming one is an instruction to look in the wrong place. Directories
     *   and documents are fine and are how the instruction should point.
     *
     *   AN IMPLEMENTATION IDENTIFIER — an exported constant's name, a CSS custom property.
     *   These are the spellings most likely to change without anything about the site
     *   changing, and a generator reading the repository will find whatever they are called
     *   at the time.
     *
     * The replacement for each is a derivation directive, which the next gate requires.
     * NOTHING HERE FORBIDS SPECIFICITY: the wiki is at its most valuable when it is
     * specific about WHY something is the way it is, about the traps that make a careful
     * reading come out wrong, and about where the non-derivable knowledge is written down.
     * Those do not rot, and they are the whole reason the file exists.
     *
     * ONE EXEMPTION, and it is narrow: a count is allowed inside a sentence that is
     * explicitly recording a past error, because "this file once said two when there were
     * three" is a warning rather than a claim, and deleting it would delete the evidence
     * for the rule. The sentence has to say so — the allowance is keyed to the words that
     * mark it as history.
     */
    const HISTORICAL_MARKERS = /\b(?:earlier revision|earlier draft|used to|once said|previous revision|had lost|was wrong)\b/i;

    it("states no fact in the wiki that generation time would answer", () => {
        const wiki = JSON.parse(read(WIKI));
        const blocks: {where: string, text: string}[] = [
            ...wiki.repo_notes.map((n: {content: string}, i: number) => ({where: `repo_notes[${i}]`, text: n.content})),
            ...wiki.pages.flatMap((p: {title: string, purpose: string, page_notes?: {content: string}[]}) => [
                {where: `page "${p.title}"`, text: p.purpose},
                ...(p.page_notes ?? []).map((n) => ({where: `page_notes of "${p.title}"`, text: n.content})),
            ]),
        ];
        expect(blocks.length, "the wiki config carries no prose — this gate is vacuous").toBeGreaterThan(5);

        const NOUNS = "shortcuts|scripts|pages|routes|components|suites|files|dependencies|chunks"
            + "|records|breakpoints|stylesheets|icons|elements|links|cards|children|entries"
            + "|assertions|controls|variants|columns|rows|integrations|tokens|props|slots|workflows|jobs|goals";
        const COUNT = new RegExp(`\\b(?:${NUMBER_WORDS.join("|")}|\\d{1,3})\\s+(?:[A-Za-z][A-Za-z-]*\\s+){0,2}(?:${NOUNS})\\b`, "gi");

        const findings: string[] = [];
        for (const {where, text} of blocks) {
            // Sentence-wise, so the historical exemption applies to the sentence making the
            // claim rather than to a whole note that happens to mention an old mistake.
            for (const sentence of text.split(/(?<=[.;])\s+/)) {
                if (HISTORICAL_MARKERS.test(sentence)) continue;
                for (const m of sentence.matchAll(COUNT)) {
                    findings.push(`${where}: counts "${m[0].replace(/\s+/g, " ")}" — derive it at generation time instead`);
                }
            }
            for (const m of text.matchAll(/\b[A-Z]\w*\.astro\b/g)) {
                findings.push(`${where}: names the component file ${m[0]} — point at a directory and let the generator find it`);
            }
            for (const m of text.matchAll(/--[a-z][a-z-]{2,}\b/g)) {
                findings.push(`${where}: names the CSS custom property ${m[0]} — read the token block at generation time`);
            }
            for (const m of text.matchAll(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g)) {
                findings.push(`${where}: names the exported constant ${m[0]} — read the module's exports at generation time`);
            }
        }
        expect(findings, `${WIKI} is a standing instruction read against a codebase that moves, so it may not state a fact that will go stale. Replace each of these with an instruction for deriving it`).toEqual([]);
    });

    /**
     * AND THE OTHER HALF OF THE SAME RULE: taking the facts out only helps if something
     * tells the generator where to get them. A page spec with no derivation directive is
     * one that either states facts or leaves the generator to invent them, and inventing
     * is this repository's documented failure mode — it is a fork whose earlier generated
     * docs described upstream features as present because they sounded plausible.
     *
     * Deliberately a weak check: it asks whether each page tells the generator to go and
     * look, not whether it does so well. A strong version would be a gate on writing.
     */
    it("tells the generator where to look, on every wiki page", () => {
        const pages: {title: string, purpose: string}[] = JSON.parse(read(WIKI)).pages;
        expect(pages.length, "the wiki config specifies no pages — this gate is vacuous").toBeGreaterThan(3);

        const DIRECTIVE = /\b(?:derive[sd]?|at generation time|read (?:it |them |each )?(?:out of|from)|enumerate)\b/i;
        expect(pages.filter((p) => !DIRECTIVE.test(p.purpose)).map((p) => p.title),
            "these wiki pages state what to write without saying where to read it — a page spec that names no source is one the generator will fill from plausibility").toEqual([]);
    });
});
