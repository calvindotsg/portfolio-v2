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
    /**
     * `string | boolean`, LIKE `continue-on-error` BELOW AND FOR THE SAME REASON. `if: false`
     * is legal YAML and legal GitHub, and `parse()` hands back a BOOLEAN rather than the
     * string "false" — so typing this `string` alone made the `typeof` test in
     * `stepAlwaysRuns` read a never-true guard as NO GUARD AT ALL, and the step counted as
     * always-running. MEASURED on the analytics step: `if: false` left the whole suite green,
     * which is the unsafe direction — the gate reports a step as reachable on a payload where
     * GitHub skips it.
     */
    if?: string | boolean;
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

/**
 * A UNION, BECAUSE `read-all` AND `write-all` ARE LEGAL AND A MAPPING IS ONLY THE ORDINARY FORM.
 * Typing this as the record alone lets `Object.entries` on the shorthand compile and then read
 * the STRING'S INDICES as scope names — a shape error that type-checks, and one that would make
 * `write-all`, the single most permissive spelling GitHub accepts, read as granting nothing.
 */
type Permissions = string | Record<string, string>;

interface Job {
    needs?: string | string[];
    if?: string;
    environment?: string | {name?: string; url?: string};
    permissions?: Permissions;
    steps?: Step[];
    "continue-on-error"?: boolean | string;
}

/**
 * A STEP'S COMMANDS, WITH THE STEP'S OWN COMMENTS TAKEN OUT. A `run:` body here carries `#`
 * lines explaining the command below them, and a gate that read those as commands would be
 * holding the prose rather than the invocation. `stepsRunning` below strips them for the same
 * reason; the semantics are shared deliberately rather than written twice.
 *
 * IT SITS HERE RATHER THAN BESIDE ITS FIRST READER because `publishingJobs` now needs it, and a
 * `const` is not hoisted — reading it from further down the file is a temporal-dead-zone crash
 * at import, not a lint complaint.
 */
const commandLines = (step: Step): string[] =>
    (step.run ?? "").split("\n").filter((line) => !/^\s*#/.test(line)).map((line) => line.trim());

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
 * site is exactly a job that can obtain a credential; without one wrangler cannot
 * authenticate and nothing reaches the host. Keying on `deploy-` in the job id
 * would instead be a naming convention, and a third publishing job called
 * `release-production` would slip past every assertion below while looking reviewed.
 * `tests/control-geometry.test.ts` discovers controls from the CSS signature for the same
 * reason and says so in the same words.
 *
 * IT USED TO KEY ON ONE SECRET'S NAME, WHICH IS THE SAME DEFECT ONE LEVEL DOWN. The
 * predicate was `secrets.CLOUDFLARE_API_TOKEN appears in this job's YAML`, and this file's
 * own docblock argues against exactly that — a publishing job authenticating through OIDC,
 * or through a differently-named token after a provider change, is not classified as
 * publishing, and the `toEqual` assertion listing the two deploy jobs goes on passing while
 * the new job's guard is never executed by anything. So the question asked is now "can this
 * job obtain a credential at all", in the three shapes GitHub offers: it declares an
 * `environment:`, it references any secret, or it asks for an OIDC token.
 *
 * THE FALSE-POSITIVE DIRECTION IS THE SAFE ONE and is chosen deliberately. `GITHUB_TOKEN`
 * is a secret by this test, so a future job merely reading it is held to the publishing
 * job's standards — which is loud, visible in review, and fixed by an argument. A false
 * NEGATIVE is a job that can reach the host with nothing checking when it runs, and that is
 * the error this whole file exists to prevent.
 */
/**
 * BOTH SPELLINGS, because GitHub accepts both and a substring match on the dot form is a
 * naming convention wearing a capability check. `secrets['NAME']` and `secrets["NAME"]` are
 * exactly equivalent index syntax, and a job spelled that way was invisible to every
 * assertion in this file.
 */
const SECRET_REFERENCE = /secrets\s*(?:\.\s*[A-Za-z_][A-Za-z0-9_]*|\[\s*(['"])[^'"\n]+\1\s*])/;

/**
 * A STEP THAT NAMES A SECRET IN ORDER TO PROVE IT CANNOT READ ONE, which is not a capability
 * and must not be counted as one.
 *
 * `ci.yml`'s `build` job carries exactly such a step: it reads `CLOUDFLARE_API_TOKEN` into the
 * environment and fails when the value is NON-empty, which is how the "exists only as an
 * environment secret" half of the branch-policy invariant stopped being GitHub-side and
 * untestable. Counting that reference as a capability would classify `build` as a publishing
 * job — and then `build` would have to wait transitively on a job running `pnpm test`, which it
 * cannot, being that job. MEASURED before this predicate existed: adding the step reddened the
 * job-list assertion and the transitive-suite assertion together, and the plan that prescribed
 * the step gave its verification as "`pnpm test` green".
 *
 * DERIVED FROM THE STEP'S OWN TEXT, NOT FROM ITS NAME, which is the same discipline
 * `failingRunSteps` applies further down and for the same reason: a name is a convention and a
 * convention is what this file replaces. A step qualifies only when EVERY secret it pulls into
 * its environment is one it goes on to test, and when it can exit non-zero — so a deploy step
 * that happens to test some unrelated variable is not mistaken for a canary, and a canary whose
 * `exit` was deleted stops being one.
 *
 * `-n` AND NOT `-z`, AND THE DIFFERENCE IS THE WHOLE MEANING RATHER THAN A SPELLING. A step that
 * fails when the value is EMPTY is asserting the credential is PRESENT, because it is about to
 * use it; a step that fails when the value is NON-EMPTY is asserting it is absent. MEASURED: a
 * first draft accepted both, and `dns.yml`'s `octodns-sync` step — which names a write-scoped DNS
 * token, checks `-z`, exits 1, and then writes DNS with it — was classified as proving that token
 * unreadable. That is the classifier inverting the one fact it exists to establish.
 *
 * Returns the variables proven absent, so a caller can assert the set is non-empty rather than
 * trusting a boolean that is indistinguishable from "there was nothing to prove".
 */
const absenceCanary = (step: Step): string[] => {
    const named = Object.entries(step.env ?? {})
        .filter(([, value]) => SECRET_REFERENCE.test(String(value)))
        .map(([key]) => key);
    if (named.length === 0) return [];
    const live = commandLines(step).join("\n");
    if (!/(^|\s)exit\s+[1-9]/.test(live)) return [];
    const proven = named.filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
        && new RegExp(`-n\\s+"?\\$\\{?${name}\\b`).test(live));
    return proven.length === named.length ? proven : [];
};

/**
 * Takes a `Job` rather than a job id so the classifier can be put to synthetic jobs and shown
 * to discriminate — the same reason `evaluate` is exercised on bare literals further down. A
 * detector nobody calibrates is how the one it replaced stayed narrow for as long as it did.
 */
const canPublish = (job: Job | undefined): boolean => {
    if (job === undefined) return false;
    if (job.environment !== undefined) return true;
    const permissions = job.permissions;
    if (permissions === "write-all") return true;
    if (typeof permissions === "object" && permissions["id-token"] === "write") return true;
    const carrying = {...job, steps: (job.steps ?? []).filter((step) => absenceCanary(step).length === 0)};
    return SECRET_REFERENCE.test(JSON.stringify(carrying));
};

const publishingJobs = jobIds.filter((id) => canPublish(CI.jobs[id]));

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

/**
 * Does this step's own `if:` let it run wherever the site can be published?
 *
 * THE ABSENT KEY IS THE ONLY THING THAT MEANS "UNGUARDED", and separating that from the two
 * spellings that merely LOOK unguarded is the whole of this helper. A step with no `if:` runs
 * everywhere, so `true` is right for it. Everything else is a guard and gets evaluated, even
 * when YAML has already turned it into something that is not a string: `if: false` arrives as
 * a BOOLEAN, and the `typeof` test this line used to carry sent it down the ungarded path.
 * MEASURED, before and after this file learned to check step guards at all: `if: false` on the
 * analytics step leaves the suite fully green. That is a fix that looks applied and is not.
 */
const stepAlwaysRuns = (s: Step): boolean => {
    if (s.if === undefined) return true;
    const guard = String(s.if);
    return PUBLISHING_PATHS.every((name) => evaluate(guard, CONTEXTS[name]));
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
     * job that omits `environment:` cannot read it. This assertion holds the file half, which
     * is where the mistake would actually be made — copy a deploy job, drop the `environment:`
     * block, and the job silently falls back to inheriting a repository-level secret of the
     * same name if one is ever added, with the branch policy void and nothing reporting it.
     *
     * THE OTHER HALF IS NO LONGER UNTESTABLE, and this sentence used to say it was. It is a
     * fact about GitHub's settings rather than about this repository's files, so no assertion
     * here can reach it — but a STEP can: `build` declares no `environment:`, so it reads the
     * empty string for that secret exactly while the invariant holds, and a real value the
     * moment it does not. `ci.yml`'s first `build` step is that canary, `absenceCanary` above
     * is what stops it being mistaken for a capability, and the block "the canary that makes
     * the environment-secret invariant testable" below asserts it is still there and still
     * shaped like a canary. A stale reason outlives every review that trusts it, which is why
     * this paragraph replaced the claim rather than sitting beside it.
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
     *
     * AND THE STEP'S OWN `if:` IS ASKED THE SAME QUESTION, which is the discipline this
     * predicate was missing while the one above it had it. A step that cannot RUN cannot fail
     * anything either — exactly the reasoning the `#` comment clause already gives — so the
     * protection this file offered was one-sided: mutate a JOB-level guard to something
     * never-true and the suite went red, mutate a STEP-level `if:` the same way and it stayed
     * green. MEASURED against the analytics step, whose `github.actor != 'dependabot[bot]'`
     * clause plan 027 promoted from hypothetical to load-bearing: `if: github.event_name ==
     * 'workflow_dispatch'` left all 543 tests passing while deleting the only check that the
     * shipped pages carry the right `data-website-id`.
     *
     * THE ASYMMETRY IS THE LESSON, NOT THE LINE. Both helpers read as covered from their test
     * names, and only one was. When adding any future guard assertion, ask which of the two it
     * is and whether the helper it uses applies `stepAlwaysRuns`.
     */
    const failingRunSteps = (id: string, mustMention: RegExp[]): Step[] =>
        (CI.jobs[id]?.steps ?? []).filter((s) => {
            const live = (s.run ?? "").split("\n").filter((line) => !/^\s*#/.test(line)).join("\n");
            return stepAlwaysRuns(s)
                && mustMention.every((re) => re.test(live))
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

/**
 * `${{ … }}` IS A LEGAL WRAPPER ON ANY `if:` AND MEANS THE SAME THING, so both parser entry
 * points in this file strip it and NEITHER owns a second copy of the rule.
 *
 * It lived only on the step-guard path, which is how the job/step-reachability path came to
 * CRASH on a spelling GitHub accepts. MEASURED: `if: ${{ false }}` on the analytics step took
 * five assertions down — four of them about `pnpm test`, `pnpm check` and `pnpm eslint`, none
 * of which the mutation touched — with `Unexpected symbol: '${{'`, a message about this
 * harness's own lexer rather than about the workflow. That is the failure mode the
 * `always()` block above already names and fixes for status functions: a guard the gate
 * cannot parse must be reported as a guard, not as a broken test.
 */
const unwrapExpression = (expr: string): string => expr.trim().replace(/^\$\{\{([\s\S]*)\}\}$/, "$1");

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
    const parser = new Parser(new Lexer(unwrapExpression(expr)).lex().tokens, ["github"], []);
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

/** The wrapper is stripped by `unwrapExpression`, which says why and is the only copy. */
const evaluateStep = (expr: string, situation: {failed: boolean; cancelled: boolean}): boolean => {
    const funcs = statusFunctions(situation);
    const infos = [...funcs.values()].map(({name, minArgs, maxArgs}) => ({name, minArgs, maxArgs}));
    const parser = new Parser(new Lexer(unwrapExpression(expr)).lex().tokens, ["github"], infos);
    const context = new data.Dictionary({key: "github", value: toData({})});
    return truthy(new Evaluator(parser.parse(), context, funcs).evaluate());
};

/**
 * A step with no `if:` runs under `success()`. See above — this default IS the gate.
 *
 * `String(…)` FOR THE REASON `stepAlwaysRuns` GIVES: `if: false` is legal and arrives from
 * `parse()` as a boolean, which `??` does not catch — it is neither null nor undefined — so
 * the boolean reached the lexer and crashed it. A YAML boolean is handed on as its own
 * spelling and answered by the evaluator, which reads `false` as the literal it is.
 */
const guardOfStep = (step: Step): string => String(step.if ?? "success()");

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

/** `npx` as a command, rather than the word appearing inside one. */
const INVOKES_NPX = /(?:^|[|&;(]\s*)npx(?=\s|$)/;

/**
 * EVERY LINE IN EVERY WORKFLOW THAT FETCHES A PACKAGE AND RUNS IT, discovered from what the
 * step does rather than from which job it sits in — `publishingJobs` and `dispatchers` above
 * are discovered the same way and say why in the same words. Naming the two deploy jobs would
 * hold the two invocations that exist today and review nothing added tomorrow, in this file or
 * in the next workflow. The whole directory is swept for the second half of that: the deploy
 * is not the only job here that holds a credential.
 */
const npxCommands = readdirSync(WORKFLOW_DIR)
    .filter((file) => /\.ya?ml$/.test(file))
    .flatMap((file) => {
        const doc = parse(readFileSync(`${WORKFLOW_DIR}/${file}`, "utf8")) as {jobs?: Record<string, Job>};
        return Object.entries(doc.jobs ?? {}).flatMap(([job, definition]) =>
            (definition.steps ?? []).flatMap((step) => commandLines(step)
                .filter((line) => INVOKES_NPX.test(line))
                .map((line) => ({where: `${file} → ${job} → ${step.name ?? "(unnamed step)"}`, line}))));
    });

/**
 * THE OPTIONS npx ITSELF READS, WHICH IS THE WHOLE OF THE QUESTION AND NOT A SUBSTRING OF IT.
 * npm hands everything after the package specifier to the package, so an `--ignore-scripts`
 * written after it is passed to wrangler — which has no such flag and ignores it — while
 * reading, to grep and to a reviewer, exactly like the fix. Only the leading run of options
 * belongs to npm, so only the leading run is looked at.
 */
const npxOptions = (line: string): string[] => {
    const options: string[] = [];
    for (const token of line.slice(line.indexOf("npx") + "npx".length).trim().split(/\s+/)) {
        if (!token.startsWith("-")) break;
        options.push(token);
    }
    return options;
};

/**
 * THE DEPLOY RESOLVES ITS OWN TOOLCHAIN AT RUN TIME, IN THE PROCESS THAT HOLDS THE TOKEN.
 *
 * `npx` consults no lockfile, so nothing in this repository carries an integrity expectation
 * for any of the packages it resolves — and it resolves them in the same step that exports
 * `CLOUDFLARE_API_TOKEN`, while every `uses:` in the same file is SHA-pinned against exactly
 * that threat. `--ignore-scripts` does not close the gap. It closes the half that can execute
 * with nobody running anything, and that half costs one word.
 *
 * IT IS ASSERTED BECAUSE A VERSION BUMP IS WHERE IT WOULD GO MISSING. What makes the exposure
 * low today is a property of a dependency graph rather than of the pin: the packages that
 * re-resolve on every deploy and the packages that run install scripts are disjoint sets.
 * Dependabot moves `WRANGLER_VERSION` without re-checking that, and this flag is what makes
 * such a bump safe to merge on green. Nothing else here would notice it being dropped.
 */
describe("nothing a workflow fetches may run its own install scripts", () => {
    it("passes --ignore-scripts to every npx invocation, ahead of the package it names", () => {
        expect(npxCommands.length, "no workflow step invokes npx, so this gate is vacuous. If the deploy "
            + "stopped fetching wrangler at run time the exposure is gone and this block should go with "
            + "it; if it merely moved, follow it").toBeGreaterThan(0);

        for (const {where, line} of npxCommands) {
            expect(npxOptions(line), `${where} runs npx without --ignore-scripts among npm's own options. `
                + "That step holds the Cloudflare deploy token and npx resolves its packages with no "
                + "lockfile, so an install script anywhere in that graph executes beside the credential. "
                + "The flag must sit before the package specifier — after it, npm passes it to the "
                + "package instead and the guard is decorative.").toContain("--ignore-scripts");
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// The properties that are true of EVERY workflow — and were each held against ONE of them.
// ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * THE DIRECTORY, PARSED ONCE, BECAUSE THE BLIND SPOT THESE BLOCKS CLOSE IS "DISCOVERED WITHIN A
 * SINGLE FILE".
 *
 * Every gate below was, before this, either absent or scoped to whichever workflow the suite
 * that grew it happened to read. The sharpest case: the only assertion in the repository that
 * every `uses:` is pinned to a commit SHA lived in `tests/dns-config.test.ts` and iterated
 * `dns.yml` — so `ci.yml`, which deploys production, and `strava-progress.yml`, which holds
 * `contents: write` and both Strava secrets, had no such gate at all. Nothing was wrong with
 * those two files; the point is that nothing would have said so.
 *
 * The three sweeps above this line — the Node version's homes, the dispatchers, the npx
 * invocations — each re-derive this list for themselves. They are deliberately left alone here:
 * collapsing them is a refactor of working gates rather than a gap being closed, and this change
 * is already the widest one this file has taken. A fourth copy is what is avoided.
 */
interface WorkflowFile {
    file: string;
    doc: {env?: Record<string, string>; permissions?: Permissions; jobs?: Record<string, Job>};
}

const WORKFLOWS: WorkflowFile[] = readdirSync(WORKFLOW_DIR)
    .filter((file) => /\.ya?ml$/.test(file))
    .map((file) => ({file, doc: parse(readFileSync(`${WORKFLOW_DIR}/${file}`, "utf8")) as WorkflowFile["doc"]}));

/** Every job in the directory, carrying the file it came from so a failure can name it. */
const ALL_JOBS = WORKFLOWS.flatMap(({file, doc}) =>
    Object.entries(doc.jobs ?? {}).map(([id, job]) => ({where: `${file} → ${id}`, file, doc, id, job})));

const ALL_STEPS = ALL_JOBS.flatMap(({where, job}) =>
    (job.steps ?? []).map((step) => ({where: `${where} → ${step.name ?? step.uses ?? "(unnamed step)"}`, step})));

describe("every action every workflow runs is pinned to a commit", () => {
    const used = ALL_STEPS.filter(({step}) => step.uses !== undefined);

    /**
     * THE FLOOR IS THE WHOLE POINT OF MOVING THE ASSERTION. A directory sweep that matched
     * nothing passes silently and reads exactly like a clean run — which is the failure mode of
     * the single-file constant it replaces, arrived at from the other direction. More than one
     * file, because one file is where this started.
     */
    it("sweeps more than one workflow and finds actions in them, so the assertion below is not vacuous", () => {
        expect(WORKFLOWS.map((w) => w.file), `${WORKFLOW_DIR} yielded fewer than two workflows`)
            .toHaveLength(WORKFLOWS.length);
        expect(WORKFLOWS.length, `${WORKFLOW_DIR} yielded fewer than two workflow files, so this gate has `
            + "gone back to reviewing one of them").toBeGreaterThan(1);
        expect(used.length, "no step in any workflow declares `uses:`, so the pin assertion inspects nothing")
            .toBeGreaterThan(0);
    });

    /**
     * A TAG IS A MOVEABLE POINTER AND THAT IS THE WHOLE OBJECTION. `@v7` resolves to whatever the
     * action's owner last pushed it to, so a compromised or merely careless release runs inside a
     * job holding this repository's credentials, with no review and no diff. A SHA cannot move.
     *
     * NO EXEMPTION FOR A LOCAL OR DOCKER `uses:`, and that is deliberate rather than an oversight.
     * Neither shape exists here today; adding one is a design change to argue for in review, not a
     * carve-out to write into the gate ahead of time — and a carve-out written now is one nobody
     * re-reads when the shape it excuses stops being hypothetical.
     */
    it("pins every one of them to a full commit SHA rather than to a tag", () => {
        for (const {where, step} of used) {
            expect(step.uses, `${where} runs \`${step.uses}\`, which is not pinned to a 40-character commit SHA. `
                + "A tag is a pointer its owner can move, so the code this job runs is whatever was pushed there "
                + "last — inside a runner that holds this repository's credentials. Dependabot can bump a SHA but "
                + "cannot convert a tag into one, so a new `uses:` line has to be written pinned by hand.")
                .toMatch(/@[0-9a-f]{40}$/);
        }
    });
});

/**
 * GITHUB'S OWN SCOPE LIST, so a typo is a failure rather than a scope silently granted `none`.
 * A misspelled key is not rejected by GitHub — it is simply not a scope, and every scope the
 * block does not name is `none`, so `content: write` (singular) reads as a job that asked for
 * write access and got nothing. That fails at run time, on whichever path nobody watches.
 */
const KNOWN_SCOPES = new Set([
    "actions", "artifact-metadata", "attestations", "checks", "code-quality", "contents",
    "deployments", "discussions", "id-token", "issues", "models", "packages", "pages",
    "pull-requests", "repository-projects", "security-events", "statuses", "vulnerability-alerts",
]);

/**
 * WORKFLOW-LEVEL COUNTS, and it has to. `ci.yml` and `dns.yml` write a block on every job;
 * `strava-progress.yml` writes one at the top and none on its single job, which is equally
 * explicit and equally replaces the defaults. An assertion worded "every job declares a
 * `permissions:` block" reddens on that file on the day it lands, and the fix — adding a block
 * the workflow does not need — is a change this gate has no business demanding.
 */
const effectivePermissions = (entry: {doc: WorkflowFile["doc"]; job: Job}): Permissions | undefined =>
    entry.job.permissions ?? entry.doc.permissions;

describe("every job runs under an explicit permissions block", () => {
    it("finds jobs to inspect at all", () => {
        expect(ALL_JOBS.map((j) => j.where).length, "no workflow declares a job, so every assertion in this "
            + "block is vacuous").toBeGreaterThan(1);
    });

    /**
     * `ci.yml` ARGUES THIS IN PROSE AND NOTHING EXECUTED IT. Its header says a `permissions:`
     * block replaces the defaults wholesale, so an unlisted scope is `none` — which is the
     * intent, and is also how a job loses a scope it silently depended on. The corollary is the
     * part worth gating: a job with NO block anywhere inherits the repository's
     * `default_workflow_permissions`, a setting that lives outside this repository, can be
     * changed without a commit, and applies to `build` — the one job that executes
     * pull-request-authored code.
     */
    it("gives every job a block, workflow-level or job-level, so none inherits a repository default", () => {
        for (const entry of ALL_JOBS) {
            expect(effectivePermissions(entry), `${entry.where} declares no permissions: block and sits in a `
                + "workflow that declares none either, so its token's scopes come from the repository's "
                + "default_workflow_permissions setting — which is not in this repository, is not in this diff, "
                + "and can be widened without a commit.").toBeDefined();
        }
    });

    /**
     * THE SHAPE, BECAUSE A KEY GITHUB DOES NOT RECOGNISE IS NOT AN ERROR — IT IS A `none`.
     * Asserting presence alone accepts `permissions: {contnets: read}` and reports it reviewed.
     */
    it("writes every block out of scopes GitHub actually recognises", () => {
        for (const entry of ALL_JOBS) {
            const permissions = effectivePermissions(entry);
            if (typeof permissions === "string") {
                expect(["read-all", "write-all"], `${entry.where} sets permissions: ${permissions}, which is `
                    + "neither a mapping nor one of GitHub's two shorthands").toContain(permissions);
                continue;
            }
            for (const [scope, value] of Object.entries(permissions ?? {})) {
                expect([...KNOWN_SCOPES], `${entry.where} asks for "${scope}", which is not a scope GitHub `
                    + "recognises. It is not rejected — it is simply not granted, so a job that needs the scope "
                    + "this was meant to spell runs with `none` and fails wherever it uses it.").toContain(scope);
                expect(["read", "write", "none"], `${entry.where} sets ${scope}: ${value}`).toContain(String(value));
            }
        }
    });

    /**
     * THE ONE VALUE THE FILE SINGLES OUT, PINNED. `ci.yml`'s header states that `contents: read`
     * is all `build` needs — nothing writes to the repository and nothing comments on the PR —
     * and `build` is the job that executes fork-pull-request-authored code. Presence alone would
     * accept `contents: write` there and read as reviewed.
     *
     * NAMED WITHOUT HARDCODING THE STRING `build`, the way the analytics assertion above does:
     * the job that runs the suite is asserted to be exactly one further up this file, so it is
     * the job's role that is pinned rather than its id.
     *
     * DELIBERATELY NOT GENERALISED TO "every block is MINIMAL". Minimality is a judgement rather
     * than a predicate, and encoding today's judgement would redden on a legitimate future need
     * — a job that must comment on a pull request, say. Presence plus this one explicit value is
     * the durable half.
     */
    it("keeps the fork-code-executing job at contents: read, which is what its own file says it needs", () => {
        const [suiteJob] = jobIds.filter(runsTheSuite);
        expect(suiteJob).toBeDefined();
        expect(CI.jobs[suiteJob].permissions, `job "${suiteJob}" runs the suite, which means it checks out and `
            + "executes code authored in a pull request. ci.yml states that contents: read is all it needs. Any "
            + "wider scope here is a scope that PR-authored code can reach.").toEqual({contents: "read"});
    });
});

describe("no workflow interpolates an expression into a shell", () => {
    const runSteps = ALL_STEPS.filter(({step}) => step.run !== undefined);

    it("finds run: bodies to inspect", () => {
        expect(runSteps.length, "no step in any workflow has a `run:` body, so this gate is vacuous")
            .toBeGreaterThan(0);
    });

    /**
     * `${{ }}` INSIDE A `run:` IS A TEXTUAL SUBSTITUTION PERFORMED BEFORE THE SHELL EXISTS.
     * GitHub pastes the value into the script, so a value containing a quote, a newline or a
     * `;` is not an argument that happens to be odd — it is more script. Every `run:` in this
     * repository already takes its values through `env:` and reads them as `"$VAR"`, where the
     * shell's own quoting applies and nothing can escape it.
     *
     * A PROPERTY OF THE TEXT HELD BY CONVENTION IS THE THING THIS FILE REPLACES. The two-run
     * security audit reported "zero `${{` in any `run:` body" as a finding-free result; it was
     * true of the text on the day it was read and nothing kept it true. Asserted across the
     * whole directory rather than over `ci.yml`, because the next `run:` body may well be in a
     * workflow that does not exist yet.
     */
    it("takes every value through env: instead, where the shell's own quoting applies", () => {
        for (const {where, step} of runSteps) {
            expect(step.run, `${where} interpolates a \${{ }} expression directly into its script. GitHub `
                + "substitutes the text before any shell runs, so a value carrying a quote or a newline stops "
                + "being an argument and becomes more script. Pass it through the step's env: block and read "
                + 'it as "$VAR".').not.toContain("${{");
        }
    });
});

describe("the flags the deploy path depends on and nothing read", () => {
    /**
     * THREE ONE-WORD PROPERTIES, EACH LOAD-BEARING, EACH PREVIOUSLY HELD BY A COMMENT.
     * `grep -rn 'wrangler\|WRANGLER' tests/` returned six hits before this block and every one
     * of them was inside a comment — this suite discussed the deploy at length and asserted
     * nothing about how it is invoked.
     */
    const installLines = ALL_STEPS.flatMap(({where, step}) =>
        commandLines(step).filter((line) => /^pnpm\s+(?:install|i)\b/.test(line)).map((line) => ({where, line})));

    it("makes every pnpm install honour the lockfile", () => {
        expect(installLines.length, "no workflow step runs `pnpm install`, so this assertion inspects nothing")
            .toBeGreaterThan(0);
        for (const {where, line} of installLines) {
            expect(line, `${where} runs \`${line}\`. Without --frozen-lockfile, pnpm RESOLVES rather than `
                + "installs: a dependency whose range admits a newer version silently gets it, the tree CI "
                + "gates is not the tree the lockfile describes, and the artifact that ships was built against "
                + "packages nobody reviewed.").toContain("--frozen-lockfile");
        }
    });

    /**
     * THE FLAG THE ARTIFACT'S IDENTITY RESTS ON. `ci.yml` calls it "what makes the identity claim
     * above TRUE": the deploy jobs publish the uploaded artifact unchanged, so anything the
     * upload drops is present for every assertion the suite made and absent from what ships.
     * The action defaults it to `false`, and `if-no-files-found: error` cannot see the
     * difference — that fires only when the whole path is empty.
     */
    const uploads = ALL_STEPS.filter(({step}) => /^actions\/upload-artifact@/.test(step.uses ?? ""));

    it("uploads hidden files with the rest of the artifact", () => {
        expect(uploads.length, "no workflow uploads an artifact, so this assertion inspects nothing")
            .toBeGreaterThan(0);
        for (const {where, step} of uploads) {
            expect(String(step.with?.["include-hidden-files"]), `${where} uploads an artifact without `
                + "include-hidden-files: true. The action defaults it to false, so any dot-prefixed path under "
                + "dist/ — a public/.well-known/ entry is the ordinary way one appears — is asserted against "
                + "locally and then silently missing from what the deploy publishes.").toBe("true");
        }
    });

    /**
     * THE PIN IS ASSERTED AS A REFERENCE, NEVER AS A VALUE. Dependabot moves `WRANGLER_VERSION`,
     * and a test that pins the number turns every routine bump red — which trains a reader to
     * edit the gate, which is how a gate stops meaning anything. What must not change is that
     * the version comes from the workflow's own `env:` at all: a literal written into the deploy
     * line is a second home for the version, and the two homes then disagree the first time one
     * of them is bumped.
     */
    it("resolves wrangler through the workflow's version variable rather than a literal", () => {
        const wranglerLines = npxCommands.filter(({line}) => /wrangler/.test(line));
        expect(wranglerLines.length, "no workflow step invokes wrangler through npx — if the deploy stopped "
            + "fetching it at run time this block should follow it rather than be deleted").toBeGreaterThan(0);
        for (const {where, line} of wranglerLines) {
            expect(line, `${where} names a literal wrangler version. The pin belongs in the workflow's env: `
                + "block, which is the only home Dependabot updates; a literal here is a second home that "
                + "disagrees with it after the first bump.").not.toMatch(/wrangler@["']?\d/);
            expect(line, `${where} does not resolve its wrangler version from WRANGLER_VERSION`)
                .toMatch(/wrangler@\$\{?WRANGLER_VERSION\}?/);
            expect(line, `${where} does not deploy the built directory`).toContain("pages deploy dist");
        }
        const ci = WORKFLOWS.find((w) => w.file === "ci.yml");
        expect(ci?.doc.env?.WRANGLER_VERSION, "ci.yml's deploy steps resolve wrangler through WRANGLER_VERSION "
            + "and the workflow declares no such env: value, so the reference expands to nothing and `npx "
            + "wrangler@` is what actually runs").toBeTruthy();
    });
});

describe("the canary that makes the environment-secret invariant testable", () => {
    const canaries = ALL_STEPS.filter(({step}) => absenceCanary(step).length > 0);

    /**
     * ASSERTED TO EXIST, because the step is the only thing standing between a repository-level
     * copy of the deploy token and a silently void deployment branch policy — and deleting it is
     * invisible: every other assertion in this file goes on passing, since a step that proves a
     * secret is absent grants no capability anybody else is checking for.
     *
     * AND ASSERTED TO SIT IN A JOB WITH NO `environment:`, which is the entire mechanism. A
     * canary inside `deploy-production` would read a real value on every run and fail forever;
     * one inside a job with no environment reads the empty string exactly while the invariant
     * holds. The check is a canary for a GitHub SETTINGS mistake, so when it fails the fix is in
     * repository settings and never in the workflow.
     */
    it("keeps one, in a job that declares no environment, so it reads empty while the invariant holds", () => {
        expect(canaries.map((c) => c.where), "no step in any workflow reads a secret in order to prove it "
            + "cannot read one. ci.yml's build job carries that canary: it is what makes the `exists only as "
            + "an environment secret` half of the branch-policy invariant testable from here at all, and "
            + "deleting it is invisible to every other assertion in this file.").not.toEqual([]);

        for (const {where, step} of canaries) {
            const [file, id] = where.split(" → ");
            const job = WORKFLOWS.find((w) => w.file === file)?.doc.jobs?.[id];
            expect(job?.environment, `${where} proves ${JSON.stringify(absenceCanary(step))} unreadable, but its `
                + "job declares an environment: — so it CAN read that environment's secrets and the step will "
                + "fail on every correct run. A canary belongs in a job with no environment, where the empty "
                + "string is the correct answer.").toBeUndefined();
        }
    });

    /**
     * NEVER ECHOED, ASSERTED RATHER THAN REVIEWED. Reproducing a secret into a log is the defect
     * this step exists to detect, committed by the detector — and a workflow log is readable by
     * anyone who can read the repository. Emptiness is the whole question and testing it needs no
     * echo, so any `$NAME` outside the test itself is the failure.
     */
    it("never prints the value it is testing", () => {
        for (const {where, step} of canaries) {
            for (const name of absenceCanary(step)) {
                for (const line of commandLines(step)) {
                    if (/\[\s*-n\s/.test(line)) continue;
                    expect(line, `${where} mentions $${name} on a line that is not the emptiness test: `
                        + `\`${line}\`. If this ever runs on a misconfigured repository that value is real, and `
                        + "a workflow log is readable by everyone who can read the repository.")
                        .not.toMatch(new RegExp(`\\$\\{?${name}\\b`));
                }
            }
        }
    });

    /**
     * THE CLASSIFIER, CALIBRATED — the half that makes the widening above mean something. The
     * predicate it replaced was "this job's YAML contains the string `secrets.CLOUDFLARE_API_TOKEN`",
     * and every assertion keyed on it passed while a job authenticating any other way went
     * entirely unexecuted. A detector nobody puts a known answer to is indistinguishable from one
     * that answers the same thing to everything, which is how the narrow version survived.
     */
    it("classifies a job as publishing from any credential, and a canary as none", () => {
        expect(canPublish({environment: "production", steps: []}), "an environment: is a credential").toBe(true);
        expect(canPublish({permissions: {"id-token": "write"}, steps: []}), "OIDC is a credential").toBe(true);
        expect(canPublish({permissions: "write-all", steps: []}), "write-all includes id-token").toBe(true);
        expect(canPublish({steps: [{run: "deploy", env: {TOKEN: "${{ secrets.SOME_OTHER_HOST_TOKEN }}"}}]}),
            "a differently-named secret is still a credential — this is the case the old detector missed")
            .toBe(true);
        expect(canPublish({steps: [{run: "deploy", env: {TOKEN: "${{ secrets['BRACKET_SPELLING'] }}"}}]}),
            "the index spelling is equivalent syntax").toBe(true);

        expect(canPublish({steps: [{run: "echo hello"}]}), "a job with no credential of any kind").toBe(false);
        expect(canPublish({steps: [{
            run: 'if [ -n "$A_TOKEN" ]; then\n  echo "::error::set"\n  exit 1\nfi\n',
            env: {A_TOKEN: "${{ secrets.A_TOKEN }}"},
        }]}), "a step that proves it cannot read a secret has not thereby acquired one").toBe(false);
        expect(canPublish({steps: [{
            run: 'if [ -n "$A_TOKEN" ]; then\n  echo "::error::set"\nfi\n',
            env: {A_TOKEN: "${{ secrets.A_TOKEN }}"},
        }]}), "a canary that cannot exit non-zero proves nothing, so it is a plain secret reference again")
            .toBe(true);
        expect(canPublish({steps: [{
            run: 'if [ -z "$A_TOKEN" ]; then\n  echo "::error::unset"\n  exit 1\nfi\nuse-it\n',
            env: {A_TOKEN: "${{ secrets.A_TOKEN }}"},
        }]}), "-z is the OPPOSITE step: it fails when the value is empty, which is a job asserting it HAS "
            + "the credential it is about to use. dns.yml carries exactly that shape and a first draft of "
            + "this classifier read it as proving a write-scoped DNS token unreadable").toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// The job that can write to this repository — the only one, and the last one without a guard.
// ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * DISCOVERED FROM THE PRIVILEGE, NOT FROM THE FILE. `strava-progress.yml`'s `update` job is the
 * only job in this repository whose token can write — `contents: write` to push the nightly
 * commit, `actions: write` to dispatch the deploy afterwards — and it was the only one of the
 * three credentialed jobs with no test on the ref it runs against. `deploy-production` and
 * `dns.yml`'s `apply` both carry one.
 *
 * Naming the file would hold today's job and review nothing added tomorrow, which is the exact
 * defect the blocks above this line repair. Asking "which jobs can write" answers for whatever
 * the directory contains.
 */
const writeScopesOf = (permissions: Permissions | undefined): string[] => {
    if (permissions === "write-all") return [...KNOWN_SCOPES];
    if (typeof permissions !== "object" || permissions === null) return [];
    return Object.entries(permissions).filter(([, value]) => String(value) === "write").map(([scope]) => scope);
};

const credentialedJobs = ALL_JOBS.filter((entry) => writeScopesOf(effectivePermissions(entry)).length > 0);

/**
 * THE REF TEST, EXECUTED. Reading the string would be the weaker form of the same check and this
 * file has a docblock explaining why: `github.event.pull_request.head.repo` is not merely
 * different on a push, the whole object is absent, and only an evaluator gets that right.
 *
 * THE CRON IS THE ROW THAT MATTERS, and it is here because breaking the nightly would be a worse
 * outcome than the gap staying open. GitHub runs a scheduled workflow only on the default branch
 * and sets `github.ref` to it, so this row is what proves the guard costs the nightly nothing —
 * asserted rather than reasoned about, since "surely a cron runs on main" is exactly the kind of
 * belief this file exists to replace with an evaluation.
 */
const REF_SITUATIONS: Record<string, {context: unknown; runs: boolean}> = {
    "the nightly cron, which GitHub runs only on the default branch": {
        context: {actor: "github-actions[bot]", event_name: "schedule", repository: REPO, ref: "refs/heads/main", event: {}},
        runs: true,
    },
    "a manual dispatch on main": {
        context: {actor: "calvindotsg", event_name: "workflow_dispatch", repository: REPO, ref: "refs/heads/main", event: {}},
        runs: true,
    },
    "a manual dispatch on a feature branch": {
        context: {actor: "calvindotsg", event_name: "workflow_dispatch", repository: REPO, ref: "refs/heads/wp3", event: {}},
        runs: false,
    },
    "a manual dispatch on a tag": {
        context: {actor: "calvindotsg", event_name: "workflow_dispatch", repository: REPO, ref: "refs/tags/v1", event: {}},
        runs: false,
    },
};

/**
 * ANY LINE THAT FETCHES CODE AND RUNS IT. Comments are stripped first, the way every other
 * command predicate in this file does it, so a step explaining why it needs no toolchain is not
 * read as acquiring one.
 */
const FETCHES_A_DEPENDENCY = /\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|ci|add|dlx)\b|(?:^|[|&;(]\s*)npx(?=\s|$)|\bpip3?\s+install\b|\buv\s+(?:pip\s+install|sync|add)\b|\b(?:go|cargo)\s+install\b/;

describe("the job that can write to this repository", () => {
    it("finds one, so every row below is not vacuous", () => {
        expect(credentialedJobs.map((j) => j.where), "no job in any workflow holds a write scope. If that is "
            + "genuinely true the nightly Strava commit and the deploy dispatch have both gone, and this whole "
            + "block should follow them rather than pass").not.toEqual([]);
    });

    /**
     * WITHOUT THIS, a `workflow_dispatch` on ANY ref — every branch and every tag, including one
     * pushed for the purpose — runs that job's script from that ref with `contents: write`,
     * `actions: write` and both Strava secrets, and dispatches the production deploy afterwards.
     *
     * Assessed honestly it is a lateral move rather than an escalation: dispatching a workflow
     * needs write access already. What it is, is the QUIETEST path to those credentials, because
     * the job commits only when the kilometres moved — so a run on another ref leaves no commit
     * on `main` and nothing but an Actions entry nobody reads.
     */
    it.each(Object.keys(REF_SITUATIONS))("runs it exactly when it should on: %s", (name) => {
        const {context, runs} = REF_SITUATIONS[name];
        for (const {where, job} of credentialedJobs) {
            expect(job.if, `${where} holds ${JSON.stringify(writeScopesOf(effectivePermissions({doc: {}, job})))} `
                + "and carries no if: at all, so a workflow_dispatch on any branch or tag in the repository runs "
                + "it with those credentials.").toBeDefined();
            expect(evaluate(String(job.if), context), `${where} holds a write scope, and on "${name}" its guard `
                + `\`${String(job.if)}\` must evaluate to ${runs}. A scheduled run carries `
                + "github.ref = the default branch, so a ref test costs the nightly nothing; a dispatch on any "
                + "other ref is the case being refused.").toBe(runs);
        }
    });

    /**
     * A GUARD UNIFORMLY TRUE IS NOT A GUARD, which the deploy jobs' own block above says in the
     * same words. Kept separate from the table so that a table written to match a broken guard
     * still reddens here.
     */
    it("gives it a guard that actually discriminates", () => {
        for (const {where, job} of credentialedJobs) {
            const answers = Object.values(REF_SITUATIONS).map((s) => evaluate(String(job.if), s.context));
            expect(answers, `${where}'s guard answers the same thing to every ref`).toContain(true);
            expect(answers, `${where}'s guard answers the same thing to every ref`).toContain(false);
        }
    });

    /**
     * IT INSTALLS NOTHING, WHICH IS A DESIGN PROPERTY AND NOT AN ACCIDENT. The job's own comment
     * says so — ubuntu-latest ships a Node with built-in fetch, the script has zero dependencies,
     * and `grep -rn "scripts/" .github/workflows/` returns exactly its one `run:` line. That is
     * what bounds the exposure of everything under `scripts/` to a single reviewed entry point.
     *
     * A JOB THAT CAN WRITE TO THE REPOSITORY AND RESOLVES A DEPENDENCY TREE AT RUN TIME is the
     * shape this refuses: `npx` and every package manager's install consult the network, and the
     * only lockfile that could constrain them is the one this job deliberately never installs
     * from. A future write-privileged job that genuinely needs a toolchain is a fresh argument to
     * make in review, which is what a red gate asks for.
     */
    it("gives it no toolchain to resolve at run time, beside those credentials", () => {
        for (const {where, job} of credentialedJobs) {
            for (const step of job.steps ?? []) {
                expect(step.uses ?? "", `${where} adds \`${step.uses}\`, a toolchain setup, to a job holding a `
                    + "write scope").not.toMatch(/setup-|action-setup/);
                for (const line of commandLines(step)) {
                    expect(line, `${where} runs \`${line}\`, which fetches or installs a dependency inside a job `
                        + "holding a write scope and long-lived secrets. Nothing here consults a lockfile, so "
                        + "that resolve happens over the network beside the credentials.")
                        .not.toMatch(FETCHES_A_DEPENDENCY);
                }
            }
        }
    });
});

/**
 * A DISPATCH NAMES A REF, AND THAT REF DECIDES WHAT GETS BUILT AND PUBLISHED. `gh workflow run
 * ci.yml --ref main` is the site's only unattended deploy; a `--ref` computed from anything the
 * run can influence turns it into "publish whatever ref this run was handed", which is precisely
 * what the guard on the job above refuses at the other end. Both halves are needed: the job may
 * only run on `main`, and what it asks CI to build may only be `main`.
 *
 * `dispatchers` is discovered from what the step does and says why in its own docblock, so this
 * assertion inherits that rather than naming a file.
 */
describe("the unattended deploy names the ref it publishes", () => {
    const REF_FLAG = /--ref[=\s]+("?)([^"\s]+)\1/;

    it("finds the dispatch and reads a literal ref out of it", () => {
        expect(dispatchers.length, "no step dispatches another workflow, so this gate is vacuous")
            .toBeGreaterThan(0);
        for (const {where, step} of dispatchers) {
            const line = commandLines(step).find((l) => /gh workflow run/.test(l));
            expect(line, `${where} no longer carries a readable \`gh workflow run\` line`).toBeDefined();
            const match = REF_FLAG.exec(String(line));
            expect(match, `${where} dispatches a workflow without naming a --ref. The dispatch then defaults to `
                + "the repository's default branch, which is correct today by coincidence rather than by "
                + "instruction.").not.toBeNull();
            expect(match![2], `${where} computes its --ref from \`${match![2]}\` rather than naming one. This `
                + "step is the site's only unattended deploy: whatever ref it hands CI is the ref that gets "
                + "built, stamped with today's date and published over production.").not.toMatch(/[$`]/);
        }
    });
});
