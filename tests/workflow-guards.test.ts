import {readFileSync, readdirSync} from "node:fs";
import {Evaluator, Lexer, Parser, data} from "@actions/expressions";
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

const CI_PATH = ".github/workflows/ci.yml";
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
 * A step-level `if:` is deliberately NOT rejected. The review flagged it, and it is real
 * blindness, but it is not reachable here: `pnpm test` is the only step that produces `dist/`,
 * so skipping it makes the next step's `find dist -name '*.html'` exit 1 under `bash -e` and
 * the job goes red anyway. Gating on it would be a rule with no defect behind it.
 */
const NEUTERED = (v: boolean | string | undefined) => v === true || v === "true";

const suiteSteps = (id: string): Step[] =>
    (CI.jobs[id]?.steps ?? []).filter((s) => (s.run ?? "")
        .split("\n")
        .filter((line) => !/^\s*#/.test(line))
        .some((line) => /^pnpm (run )?test$/.test(line.trim())));

const runsTheSuite = (id: string): boolean =>
    !NEUTERED(CI.jobs[id]?.["continue-on-error"])
    && suiteSteps(id).some((s) => !NEUTERED(s["continue-on-error"]));

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
 * NON-VACUITY. Nine contexts sound thorough, but the previous version of this gate had four
 * and reported clean on a guard that deployed a feature branch to production — the row that
 * would have caught it simply was not in the table. So each historical defect is replayed
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
    const WORKFLOWS = ".github/workflows";
    const NVMRC = readFileSync(".nvmrc", "utf8").trim();

    const setupNodeSteps = readdirSync(WORKFLOWS)
        .filter((file) => /\.ya?ml$/.test(file))
        .flatMap((file) => {
            const doc = parse(readFileSync(`${WORKFLOWS}/${file}`, "utf8")) as {jobs?: Record<string, Job>};
            return Object.entries(doc.jobs ?? {}).flatMap(([job, definition]) =>
                (definition.steps ?? [])
                    .filter((step) => /^actions\/setup-node@/.test(step.uses ?? ""))
                    .map((step) => ({where: `${file} → ${job}`, with: step.with ?? {}})));
        });

    it("reads a version out of .nvmrc at all, so the assertions below are not comparing to nothing", () => {
        expect(NVMRC, ".nvmrc is empty or unreadable").toMatch(/^v?\d+(\.\d+)*$/);
        expect(setupNodeSteps.length, `no job in ${WORKFLOWS} uses actions/setup-node, so every assertion `
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
