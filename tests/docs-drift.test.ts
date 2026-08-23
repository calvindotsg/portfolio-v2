import {existsSync, readFileSync, readdirSync, statSync} from "node:fs";
import {join, resolve} from "node:path";
import {describe, expect, it} from "vitest";

import unoConfig from "../uno.config";
import {CAREER} from "../src/content/home";

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
 * `uno.config.ts`; a suite whose pre-`describe` header is too short to explain it;
 * a frozen count written into the wiki; a component filename written into the wiki;
 * and a wiki page stripped of its derivation directive.
 *
 * ONE ENTRY IN THAT LIST WENT STALE, which is the same defect this file exists to
 * catch and is worth leaving on the record rather than quietly rewriting. It used to
 * read "a new suite added without a README mention", and that gate was deleted in
 * #151 along with the README's suite list; the mutation named here reddened nothing
 * for as long as the sentence survived it. A calibration log is a claim about what
 * this file covers, so it rots exactly like any other fact — and it rots the most
 * quietly, because a reader takes it as evidence rather than as prose.
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
     * narrow: a name with a source or config extension and no slash. Prose is full of backticked
     * code that would read as a filename to a looser pattern. THE EXTENSIONS STAY LOWERCASE even
     * though the stem no longer has to — every source extension written in this tree is
     * lowercase, so folding their case buys nothing and starts matching prose that is not a
     * filename.
     *
     * THE STEM MAY BE PascalCase, and that is the difference between watching this repository's
     * prose and watching half of it: everything under `src/components/` is PascalCase, so while
     * the stem had to open lowercase, renaming any component left every sentence still naming
     * the old file unguarded. That was proven live — a component renamed, a document left
     * pointing at the old name, and the full suite green. MEASURED with the pattern as it stands
     * and this comment in place: the rule reaches 155 bare tokens and every one resolves, and
     * the case widening is what brought 40 of those sites in.
     *
     * IT IS ALSO WHAT BROUGHT IN THREE SITES NAMING SOMETHING THAT WAS NEVER A FILE OF OURS — a
     * race-module naming pattern, twice, and one of Cloudflare's own source files, described
     * rather than quoted here so that this comment does not become a fourth. That is what
     * NOT_A_FILE_OF_OURS below is for, and why those two names cannot go in GONE instead: GONE's
     * come-back gate asserts the name never returns, which is a claim nobody can make about a
     * name this repository never owned, and would redden the suite if a file legitimately took
     * one of them one day.
     *
     * A CENSUS IN THIS FILE COUNTS ITSELF. The rule scans every live document and this is one,
     * so writing the rule's own rationale adds sites to its own totals — and the anchor-stripping
     * two lines down means a token carrying a `:12` suffix counts as the name it points at. The
     * first draft of this comment was measured with a probe that did neither and reported one
     * miss fewer than the gate it was sizing. Any figure above therefore has to name its pattern
     * AND be taken with this file included; one quantity here has already produced four honest
     * numbers depending on which of those was true.
     *
     * A MEDIAL UNDERSCORE IS ALLOWED AND A LEADING ONE IS NOT, which is not a style preference:
     * `_worker.js` and `_routes.json` are named in this suite precisely to assert they are NOT
     * in the build, so a rule that accepted a leading underscore would redden on the two names
     * whose absence is the assertion. Allowing the medial one is what finally makes the `py`
     * arm live — the only Python file here is `dns/test_filters.py`.
     */
    const BARE_SOURCE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(ts|astro|mjs|js|json|yml|yaml|sh|py)$/;

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
     * rule reported nine sites for two names: six were records and three were ordinary rot
     * in a comment, and all three were fixed rather than covered. Excusing them would have been a
     * green suite over the exact defect the rule was added to find.
     *
     * AND AN ENTRY OUTLIVES ITS REASON, which is why the gate below asks each scope to still be
     * carrying one. The second name here was the pre-rename spelling of content.test.ts — written
     * without backticks here for the reason the head of this file gives, since the whole point is
     * that no such file exists; its `why` said the suite-list gate named it "to record the hole that rename
     * walked into". #151 deleted that gate, and with it the only sentence anywhere that named the
     * file — leaving an excuse that excused nothing, in a list whose whole value is that a reader
     * can tell a live scope from a leftover. It went unnoticed because a dead excuse is green.
     */
    const GONE: readonly Excuse[] = [
        {
            name: "constants.ts",
            where: ["plans/README.md", "tests/docs-drift.test.ts", "tests/rendered-html.test.ts"],
            why: "split into src/content/ and src/data/ by plan 021 and deleted. The plans index names it as that plan's own title and in its dated audit findings; this file names it in the rule's rationale; the rendered-HTML suite quotes what two past failures said, and repointing those would make the record false",
        },
    ];

    /**
     * NAMES THAT WERE NEVER FILES OF OURS, which is a different fact from GONE and needs a
     * different list to hold it. GONE means "we had this and deleted it", and its come-back gate
     * asserts the name stays absent forever; both halves are false here. A naming convention is
     * a shape no file will ever have, and another project's source file is theirs — if this
     * repository ever legitimately created a file with one of these names, a GONE entry would
     * redden the suite with a message about a deletion that never happened.
     *
     * SO THIS LIST IS DELIBERATELY NOT ASSERTED IN BOTH DIRECTIONS, and it is the only excuse
     * list here that is not. It keeps the other half: the scope gate below covers it, because a
     * `where` pointing at a document that has moved is a leftover in this list exactly as much
     * as in the other two.
     *
     * IT IS THE LAST RESORT AND STAYS AT TWO ENTRIES UNTIL A THIRD EARNS IT. The test is not
     * "does an excuse make the gate green" — a name that this repository DID have and dropped is
     * rot, belongs in GONE or in a fixed sentence, and putting it here would launder it.
     */
    const NOT_A_FILE_OF_OURS: readonly Excuse[] = [
        {
            name: "YYYY-MM-DD-slug.ts",
            where: ["src/data/races/README.md", "src/data/races/index.ts"],
            why: "a naming convention rather than a name — the shape one race module per file is written in, so a directory listing of src/data/races/ reads as a calendar. Both documents quote the shape while telling an author how to name a new race; no file has this name and none ever should",
        },
        {
            name: "parseHeaders.ts",
            where: ["tests/build-output.test.ts"],
            why: "Cloudflare's own source file, not ours. The _headers gate records that it was calibrated by executing against the real parser rather than against a third grammar the test invented, which is the evidence for the shape that gate now has",
        },
    ];

    const NAMED_AS_ABSENT: readonly Excuse[] = [
        {
            name: "public/llms.txt",
            where: ["src/content/home.ts", "src/pages/llms.txt.ts", "tests/build-output.test.ts", "plans/README.md"],
            why: "replaced by the generated endpoint src/pages/llms.txt.ts in PR #108; named in several places precisely to record that the hand-written file is gone",
        },
        {
            name: "public/404.html",
            where: ["src/pages/404.astro"],
            why: "the alternative src/pages/404.astro rejects in its own comment — a static copy of the shell outside the theme, the analytics tag and the build-date stamp",
        },
        {
            name: "public/.well-known/",
            where: [".github/workflows/ci.yml"],
            why: "ci.yml names it as the ordinary way a dot-prefixed path would come to exist under dist/, where upload-artifact would silently drop it. There is no such file today, which is the point",
        },
        {
            name: "src/content.config.ts",
            where: ["CLAUDE.md"],
            why: "CLAUDE.md names both spellings of Astro's content-collection config to say that NEITHER may be added: src/content/ is a directory Astro reserves, and the modules there are ordinary source only while no collection config exists. The absence IS the permission",
        },
        {
            name: "src/content/config.ts",
            where: ["CLAUDE.md"],
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
                // Only the bare arm consults NOT_A_FILE_OF_OURS: a foreign name is a name, not a
                // repository-relative path, so the path arm above can never reach one.
                if (excused(GONE, bare, doc) || excused(NOT_A_FILE_OF_OURS, bare, doc)) continue;
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
        expect(found, "these documents name files that do not exist. Fix the reference, or add it to one of the three excuse lists, scoped to the documents that name it and with the reason it is named at all: NAMED_AS_ABSENT for a path, GONE for a bare filename this repository HAD and no longer has, NOT_A_FILE_OF_OURS for a name it never had at all. A name we once had does not belong in the third — GONE is what records that, and putting it in the third launders rot").toEqual([]);
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
     * THE THIRD LIST IS ACTUALLY CONSULTED, which no test of its contents can say. A list the
     * rule never reads passes every assertion about its entries, its scopes and its shape while
     * doing nothing — so this pushes a real entry through `unmetNames` with the real predicates,
     * in both directions. The name is one the filesystem genuinely does not hold, which is what
     * makes the excused direction mean something: without the consultation it is a miss.
     *
     * THE SCOPE IS HALF THE WIRING. Reading the list but ignoring `where` would be an unscoped
     * excuse — the licence the shape above exists to refuse — and only the second half sees it.
     *
     * The backtick is built rather than typed, for the reason the fixture below is: this file is
     * gated by the rule it defines, so a quoted foreign name here would be a claim of its own and
     * would drag this document into that entry's `where`.
     */
    it("consults the foreign-name list, and only where it is scoped", () => {
        const tick = "`";
        const [{name, where}] = NOT_A_FILE_OF_OURS;
        expect(hasFile(name), `${name} is now a real file, so this test no longer proves anything`).toBe(false);
        const doc = `${tick}${name}${tick}`;

        expect(unmetNames(backtickedIn(doc), where[0], hasPath, hasFile).misses,
            "the entry is scoped to this document, so the rule must consult the list and skip the name")
            .toEqual([]);

        expect(unmetNames(backtickedIn(doc), "README.md", hasPath, hasFile).misses
            .map(({token, kind}) => `${kind} ${token}`),
            "outside its scope the same name is ordinary rot — an excuse that travels is a licence")
            .toEqual([`file ${name}`]);
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
     * THE PASCALCASE PAIR IS LOAD-BEARING, and it now pins the closure rather than the gap. The
     * bare form is REPORTED, because the stem may open uppercase; the path form is reported by
     * the other arm, as it always was. Without a case holding both, re-narrowing that character
     * class back to lowercase is a change that passes every other test in this file — and since
     * every component here is PascalCase, it is exactly the components' prose that would go
     * unwatched again.
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
            `a PascalCase stem is a name too: ${quoted("Vanished.astro")}`,
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
            "file Vanished.astro",
            "path src/components/Vanished.astro",
        ]);
        // Five names reached a predicate and were satisfied or reported; only the
        // leading-underscore token reached none, which is the one exclusion the pattern keeps.
        expect(considered, "the names that ARE there must reach a predicate too, or the rule is only half exercised").toBe(7);
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
        // NOT_A_FILE_OF_OURS is deliberately absent from this gate. Coming back is something only
        // a name we once had can do; those names we never had, so there is nothing to resurrect —
        // and asserting it anyway would redden the suite the day this repository legitimately
        // created a file called one of them, over a deletion that never happened.
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
     *
     * EXISTING IS THE WEAKER HALF, AND ON ITS OWN IT MISSES THE COMMON CASE. A document is far
     * likelier to stop NAMING something than to stop existing: the sentence gets rewritten and the
     * scope entry survives it, still pointing at a live file that says nothing on the subject. That
     * is the same leftover in the same list, and it was green here — #151 rewrote README.md without
     * its mention of the generated endpoint and left the scope behind. Measured when this half was
     * added: nine dead scopes across five entries, one of them the last scope of an excuse whose
     * `why` cited a gate that #151 had deleted, so the entry as a whole excused nothing anywhere.
     *
     * SO THE GATE ASKS BOTH, and it asks the naming question in the gate's own vocabulary —
     * BACKTICKED tokens, because that is the only thing the rule ever reads. A name written as
     * bare prose is invisible to the rule and therefore needs no excuse, which is why three of
     * those nine were dead from the day they were written rather than rotted into.
     *
     * A DIRECTORY SCOPE IS EXEMPT FROM THE SECOND HALF and nothing here uses one today: it excuses
     * a whole subtree, so there is no single document that must carry the name.
     */
    it("scopes every excuse to documents that still name it", () => {
        for (const {name, where} of [...NAMED_AS_ABSENT, ...GONE, ...NOT_A_FILE_OF_OURS]) {
            expect(where, `${name} has no scope, which is the global form this shape replaced`).not.toEqual([]);
            const bare = name.replace(/\/$/, "");
            for (const w of where) {
                expect(hasPath(w.replace(/\/$/, "")),
                    `${name} is excused in ${w}, which does not exist`).toBe(true);
                if (w.endsWith("/")) continue;
                const named = backticked(w).some(({token}) => token.replace(/:\d+(-\d+)?$/, "").replace(/\/$/, "") === bare);
                expect(named, `${name} is excused in ${w}, which no longer names it in backticks — `
                    + `delete the scope, or restore the sentence that needed it`).toBe(true);
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
        "exec", "why", "list", "run", "import", "link", "outdated", "store", "rebuild", "dedupe"]);

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
     * NAMING A REAL SCRIPT IS NOT THE SAME AS NAMING THE RIGHT SET OF THEM, and the gate above
     * cannot tell the difference: every command in CONTRIBUTING.md's change-gate block would stay
     * green if a fourth check joined the build job tomorrow and the document never learned about
     * it. What the reader is promised there is not "these commands exist" but "these are the ones
     * that decide whether your change can land", and that promise is a claim about `ci.yml`.
     *
     * WHY THIS DOCUMENT AND NOT THE OTHERS. CONTRIBUTING.md is the only place that states the gate
     * as an executable list — README.md describes it in prose and CLAUDE.md explains what each arm
     * reaches, and gating a sentence would be gating a paraphrase. The list is also the one thing
     * in that file a contributor will copy verbatim, so it is the one where being a step behind
     * costs them a red CI run they were told they had already passed.
     *
     * THE ORDER IS ASSERTED, not just the set. The block is a sequence somebody types top to
     * bottom, and the build job's order is the one that fails cheapest first — a type error before
     * a lint pass before a build-and-assert. Two documents agreeing on the members while disagreeing
     * on the order is still one of them being wrong about the pipeline.
     *
     * `install` is excluded because it is setup rather than a gate: it is how CI gets a tree to
     * check, and the contributor already has one by the time they read this.
     */
    it("keeps CONTRIBUTING.md's change gate in step with the build job", () => {
        const ci = read(".github/workflows/ci.yml");
        const rest = ci.slice(ci.indexOf("\n  build:") + 1);
        const end = rest.search(/\n {2}[a-z][a-z0-9-]*:\n/);
        const build = end === -1 ? rest : rest.slice(0, end);
        const gates = [...build.matchAll(/^ {6}- run: pnpm ([a-z][a-z0-9:-]*)/gm)]
            .map((m) => m[1]).filter((s) => s !== "install");
        expect(gates.length, "no pnpm step found in ci.yml's build job — this gate is vacuous")
            .toBeGreaterThan(1);

        const doc = read("CONTRIBUTING.md");
        const heading = doc.indexOf("## The change gate");
        expect(heading, "CONTRIBUTING.md has no change-gate section to hold").toBeGreaterThan(-1);
        const fence = /```bash\n([\s\S]*?)```/.exec(doc.slice(heading));
        expect(fence, "the change-gate section carries no fenced block of commands").not.toBeNull();

        const told = [...fence![1].matchAll(/^pnpm ([a-z][a-z0-9:-]*)$/gm)].map((m) => m[1]);
        expect(told, "CONTRIBUTING.md's change gate no longer matches the build job in "
            + ".github/workflows/ci.yml — the deploy is behind whichever list is shorter").toEqual(gates);
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
        GITHUB_TOKEN: "GitHub Actions injects it; strava-progress.yml names it to explain why nothing done with it — the nightly's merge, or the direct push that merge replaced — triggers a workflow run",
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
     * THE JOB TITLE IS ONE FACT WITH MANY SURFACES, AND A TYPED COPY OF IT HAS BEEN WRONG TWICE.
     * `CAREER[0].job_name` is the site's only record of the current job; the head of that module
     * lists the surfaces that DERIVE from it, and everything on that list moves when it does. The
     * README's lede does not — it is prose, typed by hand, and #151 put a fresh copy of the title
     * into it on the front page of the repository.
     *
     * BOTH HALVES ARE MODELLED ON REAL DEFECTS RATHER THAN IMAGINED ONES. The site once shipped
     * the PREVIOUS employer's title in the intro card's own largest type, character-identical to
     * `CAREER[1].job_name`, while the role card below announced the current one — the note above
     * WELCOME in src/content/home.ts records it. And on 2026-08-08 both entries' titles were
     * corrected at once, which is precisely the moment a hand-typed copy elsewhere goes stale. So
     * this asks for the current title AND refuses a past one, and it asks in the lede rather than
     * anywhere in the file, because "somewhere in the README" is satisfied by a sentence about
     * 2022.
     *
     * A PAST TITLE IS LOOKED FOR ONLY IN WHAT IS LEFT once the current one is removed. Titles
     * nest — a promotion to "Senior Business Analyst" contains the junior title verbatim — and a
     * gate that reddened on that would be punishing the correct edit it exists to encourage.
     *
     * ONE SURFACE IS HALF OUT OF REACH, AND THE HALF THAT IS NOT NOW HAS ITS OWN GATE.
     * public/resume.pdf states the job twice: once as body text, and once as the document's own
     * /Title, which is what a browser tab and a search result show for a public URL.
     *
     * THE BODY TEXT REALLY IS UNREACHABLE. Measured rather than assumed — the title appears in
     * the raw bytes zero times and in none of that file's ten inflated content streams, because
     * the fonts are subsetted and the text is stored as glyph indices. A check written against
     * the bytes finds nothing and an external PDF tool is needed to read a word of it.
     *
     * THE /Title WAS NEVER OUT OF REACH, and this note used to say the whole file was — a
     * conclusion drawn from the body measurement and then stated about everything in the file,
     * which is the wider-than-the-measurement move the rest of this suite exists to catch. It is
     * a plain literal in the document information dictionary and needs no dependency to read;
     * "holds the résumé's declared title to the job CAREER records" in tests/content.test.ts
     * follows /Info from the trailer and does exactly that.
     *
     * It stays the maintainer's file to regenerate — it has both agreed and disagreed with CAREER,
     * so read it rather than assuming either, and never resolve a disagreement by editing CAREER.
     * The note on that constant carries the state and the way to check it.
     */
    it("keeps the README's lede in step with the current job title", () => {
        const current = CAREER[0].job_name;
        expect(current.length, "CAREER[0] has no job title — this gate is vacuous").toBeGreaterThan(3);

        const lede = read("README.md").split(/^## /m)[0];
        expect(lede, `README.md's lede must say the job CAREER[0] records, which is "${current}"`)
            .toContain(current);

        const stale = CAREER.slice(1).map((job) => job.job_name)
            .filter((past) => past !== current && lede.split(current).join(" ").includes(past));
        expect(stale, "README.md's lede states a job title held in the past as though it were "
            + "current — the site shipped exactly this defect once, in the intro card").toEqual([]);
    });

    /**
     * WHAT A SUITE IS FOR IS A PROPERTY OF THE SUITE, NOT OF THE README. This gate replaces one
     * that held README.md's Testing section to a complete list of the files under `tests/`, and
     * the replacement is a straight trade of the same property for a durable form of it.
     *
     * THE OLD GATE WAS DEFENDING SOMETHING REAL: that section was the only place saying what each
     * suite ANSWERED, and `pnpm test` prints filenames without saying which question any of them
     * is for. But the form it defended that in was an enumeration of the tree kept in prose on the
     * front page of the repository — the exact failure the rest of this file exists to catch,
     * committed deliberately and then policed. It made the README grow by a paragraph per suite,
     * and it put the cost of adding a suite on a document a reader of that suite never opens.
     *
     * SO THE EXPLANATION MOVED TO WHERE IT CANNOT DRIFT: beside the thing it explains. A reader
     * asking what `patch-wall` is for opens `patch-wall.test.ts` and finds out. Nothing has to be
     * kept in step with anything, renaming a suite carries its own reason along with it, and a
     * suite added with no reason at all is RED rather than merely unmentioned — which is strictly
     * more than the old gate could see, since a README sentence could always name a suite without
     * saying anything about it.
     *
     * THE FLOOR IS MEASURED RATHER THAN CHOSEN. Every suite already complied when this was
     * written, and the smallest pre-`describe` docblock ran to 611 characters, so 300 sits at
     * roughly half the real minimum: it reddens on a header that is a line of throat-clearing and
     * on a suite with no header at all, and it cannot redden on correct code. Tuning it upward
     * until it bites one specific short header would be fitting the gate to today's tree, which
     * is the habit this file argues against everywhere else.
     */
    it("holds every suite to its own explanation", () => {
        const suites = readdirSync("tests").filter((f) => f.endsWith(".test.ts")).sort();
        expect(suites.length, "there are no suites — this gate is vacuous").toBeGreaterThan(5);

        /*
         * THE DOCBLOCK HAS TO PRECEDE THE FIRST `describe(`. A suite explained only in comments
         * scattered among its assertions is explained to someone already reading it, which is not
         * the reader this replaces the README list for. Anything after that point is ordinary
         * commentary and is deliberately not counted.
         */
        const unexplained = suites.filter((f) => {
            const src = read(`tests/${f}`);
            const firstDescribe = src.indexOf("describe(");
            const head = firstDescribe === -1 ? src : src.slice(0, firstDescribe);
            const blocks = head.match(/^\/\*\*[\s\S]*?\*\//gm) ?? [];
            return blocks.reduce((n, b) => n + b.length, 0) < 300;
        });
        expect(unexplained,
            "these suites do not say what they are for, above their first describe()").toEqual([]);
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
     * is this repository's documented failure mode — it began as a fork, and its earlier
     * generated docs described upstream features as present because they sounded plausible.
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
