import {readFileSync, readdirSync} from "node:fs";
import {Evaluator, Lexer, Parser, data} from "@actions/expressions";
// THE SUBPATH MATTERS AND vitest WILL NOT TELL YOU. `FunctionDefinition` is not re-exported
// from the package root; importing it from there type-checks as `any` under the bundler's
// resolution and runs perfectly green, then `pnpm check` — which is the only type gate over
// this file — fails. The package's `exports` map sends `./*` to `./dist/*`, so this is the
// path the declaration actually lives at.
import type {FunctionDefinition} from "@actions/expressions/funcs/info";
import {truthy} from "@actions/expressions/result";
import {parse} from "yaml";
import {describe, expect, it} from "vitest";

/**
 * WHAT SHIPS THE SITE IS NOW A YAML FILE, AND NOTHING USED TO READ IT.
 *
 * Netlify gave this repository one safety property for free: the build command WAS the
 * suite, so a red suite could not produce a deploy. Moving the build into Actions turned
 * that platform guarantee into an edge in a job graph — `needs: build` — and until this
 * file existed the only thing holding it was a comment at the top of `ci.yml` asking
 * politely that nobody remove it. A refactor that drops the edge is green everywhere:
 * `pnpm test` passes, `actionlint` passes, the run is a row of ticks, and the deploy no
 * longer waits for the tests.
 *
 * THE SECOND THING READING CANNOT DO is tell you what an `if:` guard evaluates to on a
 * payload where the referenced object is ABSENT. `github.event.pull_request.head.repo` is
 * not merely different on a push — the whole `pull_request` object is missing, the
 * dereference yields null, and loose equality makes the comparison FALSE. A job guarded
 * that way SKIPS, and a skipped job renders as a grey check that reads as a pass. That is
 * how this plan's first draft shipped a production deploy no context could ever reach,
 * behind an entirely green run. So the guards are not read here, they are EXECUTED, in
 * GitHub's own evaluator — `@actions/expressions` is the build of `actions/languageservices`
 * that powers the Actions language server, so `truthy()` below is GitHub's coercion rule
 * (null, "" and 0 are false) rather than JavaScript's.
 *
 * These checks lived outside the repository, in `~/.claude/plans/019-assets/`, and had to
 * be remembered and run by hand against a copy of the workflow that could silently drift
 * from the real one. They read the real file now, and they run in `pnpm test`, which is
 * the same gate everything else in this suite sits behind.
 */

interface Step {
    name?: string;
    uses?: string;
    run?: string;
    if?: string;
    env?: Record<string, string>;
    with?: Record<string, string>;
    /**
     * HYPHENATED, BECAUSE THAT IS THE KEY GITHUB READS. Spelling this `continue_on_error`
     * type-checks, reads `undefined` off every real workflow, and leaves the guard below
     * permanently satisfied — a fix that looks applied and is not, which is the exact trap
     * this repository's doctrine names. `parse()` hands back the literal key.
     */
    "continue-on-error"?: boolean | string;
}

interface Job {
    needs?: string | string[];
    if?: string;
    environment?: string | {name?: string; url?: string};
    steps?: Step[];
    "continue-on-error"?: boolean | string;
}

/**
 * The directory, module-scoped because two blocks below sweep it for different reasons — the
 * Node version's homes and the unattended deploy's guard. It was declared inside the first of
 * those until the second needed it, and a second literal is how the two would come to disagree.
 */
const WORKFLOW_DIR = ".github/workflows";
const CI_PATH = `${WORKFLOW_DIR}/ci.yml`;
const CI = parse(readFileSync(CI_PATH, "utf8")) as {jobs: Record<string, Job>};

const jobIds = Object.keys(CI.jobs);
const needsOf = (id: string): string[] => {
    const n = CI.jobs[id]?.needs;
    return n === undefined ? [] : typeof n === "string" ? [n] : n;
};

/**
 * DISCOVERED FROM THE CAPABILITY, NOT FROM A LIST OR A NAME. A job that can publish the
 * site is exactly a job that can read the Cloudflare deploy token; without it wrangler
 * cannot authenticate and nothing reaches the host. Keying on `deploy-` in the job id
 * would instead be a naming convention, and a third publishing job called
 * `release-production` would slip past every assertion below while looking reviewed.
 * `tests/control-geometry.test.ts` discovers controls from the CSS signature for the same
 * reason and says so in the same words.
 */
/**
 * BOTH SPELLINGS, because GitHub accepts both and a substring match on the dot form is a
 * naming convention wearing a capability check. `secrets['CLOUDFLARE_API_TOKEN']` and
 * `secrets["CLOUDFLARE_API_TOKEN"]` are exactly equivalent index syntax, and a job spelled
 * that way was invisible to every assertion in this file.
 */
const TOKEN_REFERENCE = /secrets\s*(?:\.\s*CLOUDFLARE_API_TOKEN\b|\[\s*(['"])CLOUDFLARE_API_TOKEN\1\s*])/;
const publishingJobs = jobIds.filter((id) => TOKEN_REFERENCE.test(JSON.stringify(CI.jobs[id])));

/** Every job reachable from `id` by following `needs`, `id` excluded. */
const upstreamOf = (id: string): Set<string> => {
    const seen = new Set<string>();
    const queue = [...needsOf(id)];
    while (queue.length > 0) {
        const next = queue.shift() as string;
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(...needsOf(next));
    }
    return seen;
};

/**
 * "RUNS THE SUITE" HAS TO MEAN "A RED SUITE FAILS THIS JOB", NOT "THIS STRING APPEARS".
 *
 * The first version of this predicate was a substring match on the step's `run` text, and an
 * adversarial review put four one-line bypasses through it, each leaving all 21 tests green
 * while a red suite shipped an untested artifact:
 *
 *   - `continue-on-error: true` on the step (or on the job) — the step cannot fail the job
 *   - `pnpm test || true` — the shell swallows the exit code
 *   - a `run:` block whose only mention of the suite is inside a `#` comment
 *   - conversely `pnpm run test`, the other legal spelling of the same command, reddened a
 *     CORRECT workflow with a message accusing it of no longer gating the deploy, which is
 *     how a reader gets trained to loosen a gate
 *
 * So the command is matched as a whole line, comments are stripped first, both pnpm spellings
 * are accepted, and anything that neuters the exit code disqualifies the step. `|| true` and
 * friends fail the line match rather than being blocklisted, which is the right way round: an
 * exact command is a small set, and the ways to swallow a status are not.
 *
 * A step-level `if:` IS now rejected when it does not hold on the paths that publish, and the
 * history of that line is the argument for executing a rationale rather than inheriting one.
 * It used to read "deliberately NOT rejected … not reachable here: `pnpm test` is the only
 * step that produces `dist/`, so skipping it makes the next step's `find dist -name '*.html'`
 * exit 1 under `bash -e` and the job goes red anyway." That is TRUE of `pnpm test`. It is
 * false of `pnpm check` and `pnpm eslint`, which produce nothing any later step reads — and
 * when this predicate was parameterised to cover them, the exemption came along silently.
 * MEASURED: adding `if: github.event_name == 'workflow_dispatch'` to the `pnpm check` step
 * leaves the suite fully green while deleting the only type gate over every `.ts` file from
 * every PR and every push to main.
 *
 * IT IS EVALUATED, NOT BANNED, which is this file's whole method. A blanket "no `if:`" would
 * forbid a legitimate future conditional that still holds on both publishing paths; asking
 * GitHub's own evaluator whether the step actually runs is the question the invariant is
 * really made of.
 */
const NEUTERED = (v: boolean | string | undefined) => v === true || v === "true";

/*
 * PARAMETERISED ON THE COMMAND, BECAUSE THE GATE IS THREE COMMANDS AND ONLY ONE WAS HELD.
 *
 * This pair used to hardcode `test`. CLAUDE.md states the invariant as "the `build` job runs
 * all three (`check`, `eslint`, `test`) … so a red run of any of them blocks the deploy", and
 * that sentence was true of the workflow and false of this file: deleting the `pnpm check` and
 * `pnpm eslint` steps from ci.yml left the suite fully green, which silently removes the ONLY
 * type gate on every `.ts` file in the repository — `pnpm eslint` globs `.js` and `.astro`
 * under `src` plus `.mjs` under `scripts`, and no `.ts` at all, so `src/lib/projection.ts`
 * and every test file are checked by `astro check` and by nothing else. A gate that holds one third of a documented
 * invariant reads, to anyone who greps for it, exactly like a gate that holds all of it.
 *
 * The semantics below are unchanged and are the point of reusing them rather than writing a
 * second matcher: comments stripped, whole-line match, both the bare and the `run` spelling
 * of the command, and anything that neuters the exit code disqualifies the step.
 */
/**
 * THE TWO CONTEXTS THAT BUILD AND PUBLISH. A gate step has to actually run on both of them or
 * the invariant CLAUDE.md states — a red run of any of the three blocks the deploy — is not
 * true. Named here rather than inlined so `CONTEXTS` stays the single list of situations this
 * file reasons about.
 */
const PUBLISHING_PATHS = ["same-repo PR from a human", "push to main"] as const;

/** Does this step's own `if:` let it run wherever the site can be published? */
const stepAlwaysRuns = (s: Step): boolean => {
    if (typeof s.if !== "string") return true;
    return PUBLISHING_PATHS.every((name) => evaluate(s.if as string, CONTEXTS[name]));
};

const stepsRunning = (id: string, command: string): Step[] =>
    (CI.jobs[id]?.steps ?? []).filter((s) => stepAlwaysRuns(s) && (s.run ?? "")
        .split("\n")
        .filter((line) => !/^\s*#/.test(line))
        .some((line) => new RegExp(`^pnpm (run )?${command}$`).test(line.trim())));

const runsCommand = (id: string, command: string): boolean =>
    !NEUTERED(CI.jobs[id]?.["continue-on-error"])
    && stepsRunning(id, command).some((s) => !NEUTERED(s["continue-on-error"]));

const runsTheSuite = (id: string): boolean => runsCommand(id, "test");

/** `environment:` takes a bare string or a mapping; both spellings name the same thing. */
const environmentNameOf = (id: string): string | undefined => {
    const env = CI.jobs[id]?.environment;
    return typeof env === "string" ? env : env?.name;
};

describe("a red suite still blocks a deploy", () => {
    /**
     * THE ASSERTION THAT REPLACES A COMMENT. Stated as "depends on a job that runs the
     * suite" rather than "has `needs: build`", because the property is about the suite and
     * not about a name: renaming `build`, or inserting a job between it and the deploy,
     * both keep the property and both would break a literal check on the string `build`.
     * Transitive for the same reason — the edge may run through an intermediate job.
     */
    it("makes every job that can publish wait, transitively, on the job that runs pnpm test", () => {
        expect(publishingJobs.length).toBeGreaterThan(0);
        for (const id of publishingJobs) {
            const upstream = [...upstreamOf(id)];
            expect(upstream.some(runsTheSuite), `job "${id}" can read the Cloudflare deploy token, so it publishes `
                + `the site, but no job it needs runs \`pnpm test\` in a way that can FAIL — it reaches `
                + `${JSON.stringify(upstream)}. Check for continue-on-error, a swallowed exit code such as `
                + `\`pnpm test || true\`, or a suite step that has been commented out. A red suite would no longer `
                + `block a deploy, and nothing else in this repository would notice.`).toBe(true);
        }
    });

    /**
     * THE OTHER TWO THIRDS OF THE SAME INVARIANT. `pnpm test` was gated above and these were
     * not, so both could be deleted from ci.yml with all 446 assertions green.
     *
     * They are asserted with the SAME predicate rather than a looser one, because the ways to
     * neuter a step do not depend on which command it runs — and `it.each` rather than one
     * assertion over both, so a failure names the command that is no longer gating instead of
     * making the reader diff two lists.
     */
    it.each(["check", "eslint"])(
        "makes every job that can publish wait, transitively, on a job that runs pnpm %s",
        (command) => {
            expect(publishingJobs.length).toBeGreaterThan(0);
            for (const id of publishingJobs) {
                const upstream = [...upstreamOf(id)];
                expect(upstream.some((j) => runsCommand(j, command)), `job "${id}" can read the Cloudflare `
                    + `deploy token, so it publishes the site, but no job it needs runs \`pnpm ${command}\` in a `
                    + `way that can FAIL — it reaches ${JSON.stringify(upstream)}. CLAUDE.md states that the `
                    + `build job runs check, eslint and test and that a red run of ANY of them blocks the `
                    + `deploy; deleting this step makes that sentence false. \`pnpm check\` is the only type `
                    + `gate on the repository's .ts files, since \`pnpm eslint\` globs no .ts at all — .js and .astro under src, .mjs under scripts.`)
                    .toBe(true);
            }
        },
    );

    /**
     * `always()` IS THE ONE SPELLING THAT DECOUPLES A JOB FROM ITS `needs:`, and before this
     * assertion existed the gate's response to it was a parser crash. `@actions/expressions`
     * ships `wellKnownFunctions` without the status functions, so any of them in a guard threw
     * before evaluation and took 13 of 21 tests down with a message about the test's own parser
     * — identical treatment for `always()`, which is the hole, and `success()`, which is the
     * implicit default and harmless. Named here so the two fail differently and legibly.
     */
    it("lets no publishing job run regardless of whether the suite passed", () => {
        for (const id of publishingJobs) {
            expect(guardOf(id), `job "${id}" publishes the site and its if: calls a status function. `
                + "`always()` runs the job even when a job it needs FAILED, which silently deletes the "
                + "`needs:` edge this whole file exists to hold; `failure()` and `cancelled()` do the same. "
                + "If you meant the implicit default, write no status function at all.")
                .not.toMatch(/\b(always|failure|cancelled)\s*\(/);
        }
    });

    /**
     * The check above is satisfied by ANY upstream suite job, so it would still pass if the
     * suite ran somewhere that could not gate — this pins that there is exactly one, and
     * that the artifact the deploys download is the one it asserted against.
     */
    it("runs that suite in exactly one job, so the artifact deployed is the artifact tested", () => {
        expect(jobIds.filter(runsTheSuite)).toHaveLength(1);
    });

    /**
     * `ci.yml` states this as prose and calls it the thing that keeps the production branch
     * policy meaningful: `CLOUDFLARE_API_TOKEN` exists only as an ENVIRONMENT secret, so a
     * job that omits `environment:` cannot read it. That half is GitHub-side and untestable
     * from here. The file half is testable and is where the mistake would actually be made —
     * copy a deploy job, drop the `environment:` block, and the job silently falls back to
     * inheriting a repository-level secret of the same name if one is ever added, with the
     * branch policy void and nothing reporting it.
     */
    it("gives every publishing job an environment, which is what binds its token to a branch policy", () => {
        for (const id of publishingJobs) {
            expect(environmentNameOf(id), `job "${id}" reads the Cloudflare deploy token without declaring an `
                + `environment:, so it is not covered by any deployment branch policy.`).toBeDefined();
        }
    });

    /**
     * THE NAME, NOT MERELY THE PRESENCE, and the difference is the likelier mistake. Only the
     * `production` environment carries the deployment branch policy limited to `main`; asserting
     * that a block EXISTS lets `deploy-production` point at `preview` and keep a green board,
     * which voids the structural control `ci.yml` leans on while looking untouched in review.
     * Copy-pasting a deploy job and forgetting to change the environment name is a far more
     * ordinary error than deleting the block outright.
     */
    it("points each publishing job at its own environment, since only one carries the main-only policy", () => {
        expect(environmentNameOf("deploy-production")).toBe("production");
        expect(environmentNameOf("deploy-preview")).toBe("preview");
    });

    /*
     * TWO GUARDS THAT LIVE ONLY IN THE WORKFLOW, AND SO HAD NOTHING HOLDING THEM.
     *
     * Everything above this point protects the EDGE between the suite and the deploy. These two
     * steps are different: they are the checks that exist nowhere else, so deleting either one
     * removed a production safety property with the whole suite green — including the one
     * `ci.yml` describes in its own comment as the only thing standing between a stale artifact
     * and production.
     *
     * ASSERTED AS A PROPERTY OF THE `run:` TEXT, NOT AS ITS PRESENCE. A step can be present and
     * neutered, so each check below requires the step to contain the comparison it exists to
     * make AND to be able to exit non-zero — and `exit 1` is looked for with comments stripped,
     * the same discipline `stepsRunning` already uses, because a step whose only `exit 1` sits
     * in a `#` comment cannot fail anything.
     */
    const failingRunSteps = (id: string, mustMention: RegExp[]): Step[] =>
        (CI.jobs[id]?.steps ?? []).filter((s) => {
            const live = (s.run ?? "").split("\n").filter((line) => !/^\s*#/.test(line)).join("\n");
            return mustMention.every((re) => re.test(live))
                && /(^|\s)exit\s+[1-9]/.test(live)
                && !NEUTERED(s["continue-on-error"]);
        });

    it("keeps the stale-artifact stamp check on EVERY job that can publish, not just one of them", () => {
        expect(publishingJobs.length).toBeGreaterThan(0);
        for (const id of publishingJobs) {
            expect(
                failingRunSteps(id, [/build-date/, /TZ=Asia\/Singapore date \+%F/]).length,
                `job "${id}" can publish the site but carries no step that compares the artifact's `
                + `\`build-date\` stamp against today in Asia/Singapore and exits non-zero on a mismatch. `
                + `ci.yml calls this the defence against "Re-run all jobs" on an OLD run — which rebuilds `
                + `an older commit, stamps it today and publishes that tree over whatever is live. It is `
                + `duplicated across both deploy jobs deliberately (a shared file would need a checkout), `
                + `so dropping it from ONE job is the likely mistake and is what this asserts per job.`,
            ).toBeGreaterThan(0);
        }
    });

    /*
     * TARGETED AT THE SUITE-RUNNING JOB RATHER THAN AT `publishingJobs`, and that distinction is
     * the whole reason this is a second assertion instead of another loop above. The analytics
     * check lives in `build`, which never touches the Cloudflare token and is therefore NEVER a
     * member of `publishingJobs` — a loop over that set would inspect nothing and pass forever.
     * `jobIds.filter(runsTheSuite)` is asserted to have length 1 further down this file, so it
     * names the same job without hardcoding the string `build`.
     */
    it("keeps the analytics check on the job that runs the suite", () => {
        const [suiteJob] = jobIds.filter(runsTheSuite);
        expect(suiteJob).toBeDefined();
        expect(
            failingRunSteps(suiteJob, [/UMAMI_ID/, /data-website-id/]).length,
            `job "${suiteJob}" runs the suite but carries no step that compares the built pages' `
            + `\`data-website-id\` against $UMAMI_ID and exits non-zero when they disagree. Nothing in `
            + `the suite can see this: the analytics tag comes from a repository VARIABLE, so a build `
            + `with the tag silently dropped or the wrong id pasted in is green everywhere else.`,
        ).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// The guards, executed rather than read.
// ─────────────────────────────────────────────────────────────────────────────────────────

const toData = (v: unknown): data.ExpressionData => {
    if (v === null || v === undefined) return new data.Null();
    if (typeof v === "string") return new data.StringData(v);
    if (typeof v === "boolean") return new data.BooleanData(v);
    if (typeof v === "number") return new data.NumberData(v);
    /*
     * THE ARRAY BRANCH IS NOT OPTIONAL, and its absence failed SILENTLY IN THE UNSAFE
     * DIRECTION. Without it an array fell through to `Object.entries` and arrived as a
     * Dictionary keyed "0","1",… — on which `contains(arr, x)` returns false where GitHub
     * returns true, and `join(arr, ',')` returns "" where GitHub returns the joined value.
     * A guard using either would be reported as "this job does not deploy" for a payload
     * where GitHub deploys, which is the one error direction a deploy gate must not have.
     * Nothing in `ci.yml` uses an array today; the point is that the harness must model the
     * platform whether or not the current file exercises the case. Proved below.
     */
    if (Array.isArray(v)) return new data.Array(...v.map(toData));
    return new data.Dictionary(...Object.entries(v as object).map(([key, value]) => ({key, value: toData(value)})));
};

/**
 * The Evaluator wants a `Dictionary` specifically, not any `ExpressionData` — so the top
 * level is built directly rather than routed through `toData`, which is typed to return
 * the union. The original of this gate lived in an untyped `.mjs` outside the repository
 * and this was invisible there; `pnpm check` found it the first time the file was checked.
 */
const evaluate = (expr: string, github: unknown): boolean => {
    const parser = new Parser(new Lexer(expr).lex().tokens, ["github"], []);
    const context = new data.Dictionary({key: "github", value: toData(github)});
    return truthy(new Evaluator(parser.parse(), context).evaluate());
};

const REPO = "calvindotsg/portfolio-v2";
/**
 * `pull_request.user.login` IS POPULATED BECAUSE GITHUB ALWAYS SENDS IT, and omitting it made
 * a defect row below pass for the wrong reason. The author-keyed spelling of the fork guard
 * evaluated true against the old fixture only because the dereference yielded null — nothing
 * to do with authorship — so the row demonstrated a missing field rather than the defect it
 * names. It defaults to the actor, which is the ordinary case; the tenth context below is the
 * one where they legitimately differ.
 */
const prContext = (n: number, headRepo: string, actor: string, author: string = actor) => ({
    actor,
    event_name: "pull_request",
    repository: REPO,
    ref: `refs/pull/${n}/merge`,
    event: {
        number: n,
        pull_request: {number: n, head: {repo: {full_name: headRepo}, sha: "deadbeef"}, user: {login: author}},
    },
});

/**
 * The last two are events this workflow does NOT list under `on:`, and that is the point:
 * both carry `github.ref` = `refs/heads/main`, so a ref test alone admits them. They are
 * here so that adding either trigger later leaves production inert until someone changes
 * the guard on purpose. `pull_request_target` is the dangerous one — it runs a PR's own ref
 * with secrets available.
 */
const CONTEXTS: Record<string, unknown> = {
    "push to main": {actor: "calvindotsg", event_name: "push", repository: REPO, ref: "refs/heads/main", event: {}},
    "workflow_dispatch on main": {actor: "calvindotsg", event_name: "workflow_dispatch", repository: REPO, ref: "refs/heads/main", event: {}},
    "workflow_dispatch on a feature branch": {actor: "calvindotsg", event_name: "workflow_dispatch", repository: REPO, ref: "refs/heads/wp3", event: {}},
    "push to a feature branch": {actor: "calvindotsg", event_name: "push", repository: REPO, ref: "refs/heads/wp3", event: {}},
    "same-repo PR from a human": prContext(1, REPO, "calvindotsg"),
    "fork PR": prContext(2, "someone/portfolio-v2", "someone"),
    "Dependabot PR": prContext(3, REPO, "dependabot[bot]"),
    // THE ROW WHERE ACTOR AND AUTHOR DIVERGE, and the only one that can tell the shipped guard
    // apart from the author-keyed spelling of it. A human pushing a commit onto a bot's branch
    // gets a run whose ACTOR is the human and whose `pull_request.user` is frozen at the bot;
    // secrets follow the actor, so this run has them and must get its preview.
    "human pushes onto a Dependabot branch": prContext(4, REPO, "calvindotsg", "dependabot[bot]"),
    "pull_request_target, ref=main": {actor: "someone", event_name: "pull_request_target", repository: REPO, ref: "refs/heads/main",
        event: {number: 9, pull_request: {number: 9, head: {repo: {full_name: "someone/portfolio-v2"}, sha: "cafe"}}}},
    "issue_comment, ref=main": {actor: "someone", event_name: "issue_comment", repository: REPO, ref: "refs/heads/main", event: {}},
};

/** Exactly which publishing jobs SHOULD run in each context. */
const INTENDED: Record<string, string[]> = {
    "push to main": ["deploy-production"],
    "workflow_dispatch on main": ["deploy-production"],
    "workflow_dispatch on a feature branch": [],
    "push to a feature branch": [],
    "same-repo PR from a human": ["deploy-preview"],
    "fork PR": [],
    "Dependabot PR": [],
    "human pushes onto a Dependabot branch": ["deploy-preview"],
    "pull_request_target, ref=main": [],
    "issue_comment, ref=main": [],
};

const guardOf = (id: string): string => {
    const guard = CI.jobs[id]?.if;
    if (typeof guard !== "string") throw new Error(`job "${id}" can publish the site and has no if: guard at all`);
    // An explicit leading `success() &&` is GitHub's implicit default written out, and is
    // semantically identical to omitting it. The evaluator has no status functions, so it
    // would throw; stripping it keeps a harmless spelling readable. The genuinely dangerous
    // ones — always/failure/cancelled — are NOT stripped, and are rejected by their own
    // assertion above so they fail with a message about the workflow rather than the parser.
    return guard.replace(/^\s*success\s*\(\s*\)\s*&&\s*/, "");
};

const deployedBy = (context: unknown): string[] => publishingJobs.filter((id) => evaluate(guardOf(id), context));

describe("the deploy guards, executed in GitHub's own evaluator", () => {
    it("names an intended outcome for every context, and covers every publishing job", () => {
        expect(Object.keys(INTENDED).sort()).toEqual(Object.keys(CONTEXTS).sort());
        expect(publishingJobs.sort()).toEqual(["deploy-preview", "deploy-production"]);
    });

    it.each(Object.keys(CONTEXTS))("deploys exactly what it should on: %s", (name) => {
        expect(deployedBy(CONTEXTS[name])).toEqual(INTENDED[name]);
    });

    /**
     * A guard uniformly true is not a guard; a guard uniformly false is a job that never
     * runs, which is precisely the defect that shipped once — production unreachable behind
     * a green board. Both are invisible to reading and neither is caught by the partition
     * above if the intent table is written to match the bug.
     */
    it.each(["deploy-preview", "deploy-production"])("gives %s a guard that actually discriminates", (id) => {
        const results = Object.values(CONTEXTS).map((c) => evaluate(guardOf(id), c));
        expect(results).toContain(true);
        expect(results).toContain(false);
    });
});

/**
 * NON-VACUITY. A table this size sounds thorough — and the previous version of this gate had
 * four rows, reported clean, and let a guard that deployed a feature branch to production
 * through, because the row that would have caught it simply was not in the table. So do not
 * read the length as evidence; the count is deliberately not written down here, because a
 * number in a comment is one edit away from being wrong about the list beside it. So each historical defect is replayed
 * here against the SAME context set, and each must be caught. A future edit that trims the
 * contexts, or relaxes the intent table, goes red here rather than quietly reporting a pass.
 *
 * These are the real spellings, not inventions: every one of them was either shipped or was
 * one review comment away from shipping.
 *
 * A ROW READS IN ONE OF TWO DIRECTIONS, and conflating them is how the last row came to pass
 * for the wrong reason. `admits` means the defective guard says YES where the shipped one says
 * no — a run that should not deploy, deploying. `refuses` is the mirror: the defective guard
 * says NO where the shipped one says yes, which is the shape of a defect that silently skips a
 * job, and a skipped job renders as a grey check that reads as a pass.
 */
const HISTORICAL_DEFECTS: {defect: string; job: string; guard: string; admits?: string; refuses?: string}[] = [
    {
        defect: "the ref-blind production guard — true for a workflow_dispatch on ANY ref, while the job hardcodes --branch=main",
        job: "deploy-production",
        guard: "github.event_name != 'pull_request'",
        admits: "workflow_dispatch on a feature branch",
    },
    {
        defect: "the deny-list spelling — every trigger added to on: later would deploy production by default",
        job: "deploy-production",
        guard: "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
        admits: "pull_request_target, ref=main",
    },
    {
        defect: "the deny-list spelling, reached by the other event that carries ref=main",
        job: "deploy-production",
        guard: "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
        admits: "issue_comment, ref=main",
    },
    {
        defect: "the fork guard without the actor test — bot branches are same-repo, but Dependabot runs get no secrets and wrangler dies non-interactively",
        job: "deploy-preview",
        guard: "github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository",
        admits: "Dependabot PR",
    },
    {
        defect: "the fork test written against the PR author instead of the actor — a human pushing onto a bot branch is still refused",
        job: "deploy-preview",
        guard: "github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository && github.event.pull_request.user.login != 'dependabot[bot]'",
        // Read the other way round from every row above it: here the defective guard REFUSES a
        // run the shipped one admits. Row asserted by `refuses` rather than `admits` below.
        refuses: "human pushes onto a Dependabot branch",
    },
];

describe("the context set is sharp enough to catch the defects it was written for", () => {
    it.each(HISTORICAL_DEFECTS)("catches $defect", ({job, guard, admits, refuses}) => {
        expect(guard, "the defective spelling is identical to the shipped one, so this row proves nothing")
            .not.toBe(guardOf(job));

        // Exactly one direction per row, or the row is not saying anything definite.
        const context = admits ?? refuses;
        expect([admits, refuses].filter(Boolean), "a row must name `admits` OR `refuses`, not both and not neither")
            .toHaveLength(1);

        // The two clauses are the same shape read opposite ways: the defective guard and the
        // shipped one must DISAGREE on this context. Asserting both halves is what stops a row
        // passing because the context is degenerate for both.
        const want = admits !== undefined;
        expect(evaluate(guard, CONTEXTS[context as string]),
            `"${context}" no longer distinguishes this defect from the shipped guard, so the context set has `
            + "gone blunt — restore the context or the intent row that made it discriminate.").toBe(want);
        expect(evaluate(guardOf(job), CONTEXTS[context as string]),
            want
                ? `the shipped guard for "${job}" admits "${context}", which is the defect itself.`
                : `the shipped guard for "${job}" also refuses "${context}", so it has the defect this row names.`)
            .toBe(!want);
    });

    /** The array branch in `toData`, proved rather than assumed — see its note. */
    it("hands GitHub's own functions a real Array, so contains() and join() answer as the platform does", () => {
        expect(evaluate("contains(github.labels, 'deploy')", {labels: ["deploy", "other"]})).toBe(true);
        expect(evaluate("contains(github.labels, 'absent')", {labels: ["deploy", "other"]})).toBe(false);
        expect(evaluate("join(github.labels, ',') == 'a,b'", {labels: ["a", "b"]})).toBe(true);
    });

    it("evaluates literals the way GitHub does, so a green run above is not an engine that answers false to everything", () => {
        expect(evaluate("true", {})).toBe(true);
        expect(evaluate("false", {})).toBe(false);
        expect(evaluate("'' == 0", {})).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// The Node version, which had three homes and one of them was a comment asking nicely.
// ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * `.nvmrc` IS THE SINGLE SOURCE OF TRUTH AND TWO JOBS COULD NOT READ IT.
 *
 * The `build` job takes `node-version-file: .nvmrc`. The two deploy jobs cannot — they have
 * no checkout, deliberately, so that no repository source runs in a runner holding the deploy
 * token — and so they hardcode the version instead. `ci.yml` said as much and asked the reader
 * to bump the literals by hand, which is the shape of every drift this repository has a test
 * for: one fact, three homes, nothing comparing them.
 *
 * It is a real defect and not a tidiness complaint. The deploy jobs run `npx wrangler`, so a
 * `.nvmrc` bump past a major wrangler has dropped leaves the build green on the new Node and
 * the publish running on the old one — and the two jobs that would notice are the two nobody
 * reads when the board is green.
 *
 * Asserted over EVERY workflow rather than over `ci.yml` alone: the defect is "a Node version
 * written somewhere other than `.nvmrc`", and a new workflow is exactly where the next copy
 * would land. `strava-progress.yml` has no `setup-node` at all today and is silently fine.
 */
describe("the Node version has one home", () => {
    const NVMRC = readFileSync(".nvmrc", "utf8").trim();

    const setupNodeSteps = readdirSync(WORKFLOW_DIR)
        .filter((file) => /\.ya?ml$/.test(file))
        .flatMap((file) => {
            const doc = parse(readFileSync(`${WORKFLOW_DIR}/${file}`, "utf8")) as {jobs?: Record<string, Job>};
            return Object.entries(doc.jobs ?? {}).flatMap(([job, definition]) =>
                (definition.steps ?? [])
                    .filter((step) => /^actions\/setup-node@/.test(step.uses ?? ""))
                    .map((step) => ({where: `${file} → ${job}`, with: step.with ?? {}})));
        });

    it("reads a version out of .nvmrc at all, so the assertions below are not comparing to nothing", () => {
        expect(NVMRC, ".nvmrc is empty or unreadable").toMatch(/^v?\d+(\.\d+)*$/);
        expect(setupNodeSteps.length, `no job in ${WORKFLOW_DIR} uses actions/setup-node, so every assertion `
            + "in this block is vacuous").toBeGreaterThan(0);
    });

    it("points at least one job at the file itself, which is what makes it the source", () => {
        const fromFile = setupNodeSteps.filter((s) => s.with["node-version-file"] !== undefined);
        expect(fromFile.map((s) => s.where), "no job reads `node-version-file`, so `.nvmrc` is documentation "
            + "rather than configuration and the literals below agree with nothing").not.toEqual([]);
        for (const step of fromFile) {
            expect(step.with["node-version-file"], `${step.where} reads a version file that is not .nvmrc`).toBe(".nvmrc");
        }
    });

    it("gives every hardcoded version the same value .nvmrc holds", () => {
        for (const step of setupNodeSteps) {
            const literal = step.with["node-version"];
            if (literal === undefined) continue;
            expect(String(literal), `${step.where} pins Node ${String(literal)} while .nvmrc says ${NVMRC}. That job `
                + "has no checkout by design and so cannot read the file — bump the literal with it, or the job that "
                + "builds the site and the job that publishes it run on different Node versions.").toBe(NVMRC);
        }
    });

    it("lets no setup-node step decide the version for itself", () => {
        for (const step of setupNodeSteps) {
            const declared = ["node-version", "node-version-file"].filter((key) => step.with[key] !== undefined);
            expect(declared, `${step.where} declares ${JSON.stringify(declared)}. With neither, the step takes `
                + "whatever Node the runner image happens to ship and the version silently tracks GitHub's "
                + "rollout schedule; with both, `node-version` wins and the file is decoration.").toHaveLength(1);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// The step that asks CI to build and deploy — the one production behaviour in its own PR
// that nothing could see.
// ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * A STEP-LEVEL GUARD, EXECUTED IN FOUR SITUATIONS, BECAUSE READING IT PROVES NOTHING.
 *
 * `strava-progress.yml`'s last step dispatches `ci.yml`, and that dispatch is THE ONLY
 * UNATTENDED DEPLOY THE SITE HAS: a push made with `GITHUB_TOKEN` triggers no workflow run,
 * so without this step the nightly commit reaches `main` and nothing builds. The step used to
 * run under the implicit `if: success()`, which cost the site its daily rebuild whenever the
 * fetch or the push failed — and the site has a CLOCK as well as a distance, so a day without
 * a build is a day of stale countdowns whether or not the owner rode.
 *
 * MEASURED BEFORE THIS BLOCK EXISTED, and each of these left the whole suite green:
 * `always()` in place of the shipped guard, the guard DELETED entirely, and a silent revert
 * to `success()`. Three mutually exclusive behaviours, one green board.
 *
 * NOT PINNED AS A STRING, and that is the whole reason this is an evaluation rather than a
 * `toBe`. `!cancelled()`, `${{ !cancelled() }}` and `success() || failure()` are three
 * spellings of one guard, and a string pin reddens on two correct ones. What the guard has to
 * SAY is a four-row table, so the table is what is asserted.
 *
 * THE DEFAULT IS THE LOAD-BEARING PART. A step with no `if:` runs under `success()`, so
 * modelling "absent" as "unguarded" would make DELETING the guard skip the case instead of
 * failing it — which is precisely the hole this block exists to close. `guardOfStep` returns
 * `"success()"` for a missing key rather than `undefined`.
 */
const STATUS_FUNCTIONS = ["success", "failure", "cancelled", "always"] as const;

/**
 * THE FOUR SITUATIONS, NAMED RATHER THAN REDUCED. Two of them — a failed fetch and a failed
 * push — currently produce the same status triple, and both are kept on purpose: they are the
 * two failures the workflow's own comment reasons about separately, and a future guard
 * reading `steps.<id>.outcome` would tell them apart. A table listing only the distinct
 * triples would silently stop covering one of them on the day that happened.
 */
const STEP_SITUATIONS: Record<string, {failed: boolean; cancelled: boolean}> = {
    "every earlier step succeeded": {failed: false, cancelled: false},
    "the Strava fetch step failed": {failed: true, cancelled: false},
    "the commit-and-push step failed": {failed: true, cancelled: false},
    "the run was cancelled": {failed: false, cancelled: true},
};

/**
 * GitHub's status functions as the platform defines them, including the two easy mistakes:
 * on a CANCELLED run `success()` is false and `failure()` is ALSO false, because a
 * cancellation is neither. `always()` is the only one true in every row, which is exactly why
 * it is the wrong guard here.
 *
 * REGISTERED ON BOTH THE PARSER AND THE EVALUATOR. `@actions/expressions` ships
 * `wellKnownFunctions` WITHOUT the status functions — the block above records that any of
 * them in a guard used to THROW during parsing, before evaluation could happen — so handing
 * them to the evaluator alone yields a parse error rather than an answer.
 */
const statusFunctions = (situation: {failed: boolean; cancelled: boolean}): Map<string, FunctionDefinition> => {
    const answers: Record<typeof STATUS_FUNCTIONS[number], boolean> = {
        success: !situation.failed && !situation.cancelled,
        failure: situation.failed && !situation.cancelled,
        cancelled: situation.cancelled,
        always: true,
    };
    return new Map(STATUS_FUNCTIONS.map((name) => [name, {
        name, minArgs: 0, maxArgs: 0,
        call: () => new data.BooleanData(answers[name]),
    }]));
};

/**
 * `${{ … }}` IS A LEGAL WRAPPER ON AN `if:` AND MEANS THE SAME THING — GitHub evaluates a
 * bare `if:` as an expression already, and both forms appear in real workflows. Lexing the
 * braces would be a parse error reported as a broken guard.
 */
const evaluateStep = (expr: string, situation: {failed: boolean; cancelled: boolean}): boolean => {
    const funcs = statusFunctions(situation);
    const infos = [...funcs.values()].map(({name, minArgs, maxArgs}) => ({name, minArgs, maxArgs}));
    const bare = expr.trim().replace(/^\$\{\{([\s\S]*)\}\}$/, "$1");
    const parser = new Parser(new Lexer(bare).lex().tokens, ["github"], infos);
    const context = new data.Dictionary({key: "github", value: toData({})});
    return truthy(new Evaluator(parser.parse(), context, funcs).evaluate());
};

/** A step with no `if:` runs under `success()`. See above — this default IS the gate. */
const guardOfStep = (step: Step): string => step.if ?? "success()";

/**
 * DISCOVERED FROM WHAT THE STEP DOES, not from a workflow path or a step name, for the reason
 * `publishingJobs` above is discovered from the deploy token: a second dispatcher added in
 * another file is exactly where the next copy of this defect lands, and a hardcoded path
 * would go on reviewing the old one forever.
 */
const dispatchers = readdirSync(WORKFLOW_DIR)
    .filter((file) => /\.ya?ml$/.test(file))
    .flatMap((file) => {
        const doc = parse(readFileSync(`${WORKFLOW_DIR}/${file}`, "utf8")) as {jobs?: Record<string, Job>};
        return Object.entries(doc.jobs ?? {}).flatMap(([job, definition]) =>
            (definition.steps ?? [])
                .filter((step) => /gh workflow run/.test(step.run ?? ""))
                .map((step) => ({where: `${file} → ${job} → ${step.name ?? "(unnamed step)"}`, step})));
    });

/**
 * WHAT A DISPATCHER MUST SAY. Run when everything worked; run when an earlier step FAILED —
 * the clock moved even if the kilometres did not, and the dispatch names a REF, so `ci.yml`
 * checks out and builds `main` regardless of what the failing runner did or did not push —
 * and do NOT run when a human or a concurrency rule cancelled the run, which would turn a
 * deliberate stop into a deploy.
 */
const DISPATCH_INTENT: Record<string, boolean> = {
    "every earlier step succeeded": true,
    "the Strava fetch step failed": true,
    "the commit-and-push step failed": true,
    "the run was cancelled": false,
};

describe("the unattended deploy's own guard", () => {
    it("finds a step that dispatches another workflow at all, so the rows below are not vacuous", () => {
        expect(dispatchers.map((d) => d.where), "no step in .github/workflows/ runs `gh workflow run`, so every "
            + "assertion in this block is vacuous — and the site's only unattended deploy is gone")
            .not.toEqual([]);
        expect(Object.keys(DISPATCH_INTENT).sort(), "the intent table and the situation table have drifted apart")
            .toEqual(Object.keys(STEP_SITUATIONS).sort());
    });

    /**
     * THE ENGINE ITSELF, asked whether it can still tell the four situations apart. Without
     * this the whole block could pass on an evaluator that answered `true` to everything —
     * not a hypothetical, since `always()` is a real function that does exactly that and the
     * rows below would be satisfied by an engine stuck on it.
     */
    it.each(Object.keys(STEP_SITUATIONS))("computes GitHub's status functions on: %s", (name) => {
        const situation = STEP_SITUATIONS[name];
        expect(evaluateStep("always()", situation), "always() is true in every situation").toBe(true);
        expect(evaluateStep("cancelled()", situation)).toBe(situation.cancelled);
        expect(evaluateStep("success()", situation)).toBe(!situation.failed && !situation.cancelled);
        expect(evaluateStep("failure()", situation)).toBe(situation.failed && !situation.cancelled);
        // The `${{ }}` wrapper is the same expression, not a different one.
        expect(evaluateStep("${{ !cancelled() }}", situation)).toBe(evaluateStep("!cancelled()", situation));
    });

    it.each(Object.keys(STEP_SITUATIONS))("runs the dispatch exactly when it should on: %s", (name) => {
        expect(dispatchers.length).toBeGreaterThan(0);
        for (const {where, step} of dispatchers) {
            expect(evaluateStep(guardOfStep(step), STEP_SITUATIONS[name]),
                `${where} dispatches CI, and on "${name}" its guard \`${guardOfStep(step)}\` must evaluate to `
                + `${DISPATCH_INTENT[name]}. This step is the site's only unattended deploy: it must survive a `
                + "failed fetch and a failed push — the dispatch names a ref, so CI builds `main` either way — and "
                + "it must NOT fire on a cancellation, which would turn a deliberate stop into a deploy.")
                .toBe(DISPATCH_INTENT[name]);
        }
    });

    /**
     * THE CRITERION, ASKED IN THE OTHER DIRECTION. The three wrong guards are the three that
     * were each measured green before this block existed, so the table has to be shown
     * REJECTING them — otherwise a criterion that happened to accept everything would look
     * exactly like this one. `success()` is also what a DELETED `if:` means, so that row does
     * double duty.
     */
    it("rejects every guard that was measured green while behaving differently", () => {
        const says = (guard: string) => Object.fromEntries(
            Object.entries(STEP_SITUATIONS).map(([name, s]) => [name, evaluateStep(guard, s)]));
        for (const wrong of ["success()", "always()", "failure()"]) {
            expect(says(wrong), `\`${wrong}\` satisfies the dispatch intent, so this table cannot tell it apart `
                + "from the shipped guard").not.toEqual(DISPATCH_INTENT);
        }
        for (const right of ["!cancelled()", "${{ !cancelled() }}", "success() || failure()"]) {
            expect(says(right), `\`${right}\` is a legitimate spelling of the shipped guard and this table must `
                + "accept it — a string pin would redden on it").toEqual(DISPATCH_INTENT);
        }
    });
});
