/**
 * Retire Cloudflare Pages preview deployments, and refuse to retire anything else.
 *
 * WHY THIS EXISTS. A preview deployment is permanent. Removing a file from `public/` does not
 * unpublish it, and nothing retired them — so a preview alias goes on serving whatever it was
 * built with, indefinitely. Measured while plan 034 was written: an alias for a long-merged pull
 * request served a résumé 23kB larger than production's, advertising a job title a merged pull
 * request had already corrected. The repository is public and every alias carries `x-robots-tag`,
 * so this is bounded rather than alarming. What it costs is the assumption that the current tree
 * describes what is served.
 *
 * THIS IS THE ONLY THING IN THIS REPOSITORY THAT DELETES SOMETHING PERMANENTLY. There is no undo
 * and `wrangler pages` has no rollback, so the shape below is deliberate and a reviewer should
 * read the classifier line by line:
 *
 *   - IT REPORTS BY DEFAULT. Deleting needs `--delete` passed explicitly. The two phases are
 *     separate on purpose and must not be merged: phase one's list is meant to be read by a human
 *     before phase two runs.
 *   - IT FAILS CLOSED. Every deployment starts as KEEP and has to be argued down to DELETE. A
 *     branch that is null, a branch that is not a pull-request branch, a pull request whose state
 *     cannot be read — every one of those is kept. The asymmetry is the whole design: keeping
 *     something that could have gone costs a row in a list, and the other mistake is unrecoverable.
 *   - IT NEVER TOUCHES PRODUCTION. Asserted twice, once as a classification and once as a refusal
 *     immediately before the request is sent.
 *
 * PULL-REQUEST STATE IS ASKED, NEVER STORED. `.github/workflows/ci.yml` deploys previews with
 * `--branch=pr-<number>`, so the deployment itself carries the number, and this asks GitHub what
 * that pull request's state is now. A list of open pull requests written down anywhere would be
 * wrong by the time it was read.
 *
 * Usage:
 *   node scripts/pages-retention.mjs              # classify and print; deletes nothing
 *   node scripts/pages-retention.mjs --delete     # classify, print, then delete the DELETE set
 *
 * Environment:
 *   CLOUDFLARE_API_TOKEN    Pages:Edit on the account. Required.
 *   CLOUDFLARE_ACCOUNT_ID   Required.
 *   PAGES_PROJECT           Required.
 *   GITHUB_REPOSITORY       owner/name, for resolving pull-request state. Required.
 *   GITHUB_TOKEN            Optional; raises the rate limit and is needed for a private repo.
 */

import {pathToFileURL} from "node:url";

const CF = "https://api.cloudflare.com/client/v4";
const GH = "https://api.github.com";

/*
 * NOTHING ABOVE `main` READS THE ENVIRONMENT OR REACHES THE NETWORK, and that is a rule this
 * directory enforces rather than a style. `tests/strava-scripts.test.ts` imports every script here
 * in a fresh node process and fails any whose import changes the world around it — so a program
 * that did its work at top level would run, and exit, during `pnpm test`. Which is exactly what
 * the first draft of this file did: it exited 2 on a missing credential from inside the suite.
 */

const need = (name) => {
    const value = process.env[name];
    if (!value) {
        console.error(`::error::${name} is not set, so this run cannot enumerate deployments. Refusing to continue rather than reporting an empty set, which would read exactly like "there is nothing to retire".`);
        process.exit(2);
    }
    return value;
};

const cf = async (token, path, init = {}) => {
    const response = await fetch(`${CF}${path}`, {
        ...init,
        headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
    });
    const body = await response.json().catch(() => null);
    return {ok: response.ok && body?.success === true, status: response.status, body};
};

/**
 * Every deployment, oldest page last.
 *
 * PAGINATION IS ASSERTED RATHER THAN ASSUMED. The API caps `per_page` at 25 and rejects anything
 * larger outright, so a single request sees a fraction of the set — and a classifier that read one
 * page would report a short DELETE list that looks like a healthy repository rather than a broken
 * enumerator. The loop stops on a short page and cross-checks the total the API reports.
 */
async function allDeployments(token, account, project) {
    const out = [];
    let expected = null;
    for (let page = 1; page <= 200; page += 1) {
        const {ok, status, body} = await cf(token, `/accounts/${account}/pages/projects/${project}/deployments?per_page=25&page=${page}`);
        if (!ok) {
            console.error(`::error::listing deployments failed on page ${page} with HTTP ${status}: ${JSON.stringify(body?.errors ?? body)}`);
            process.exit(2);
        }
        expected ??= body.result_info?.total_count ?? null;
        out.push(...body.result);
        if (body.result.length < 25) break;
    }
    if (expected !== null && out.length !== expected) {
        console.error(`::error::the API reports ${expected} deployments and this run enumerated ${out.length}. A partial enumeration produces a partial DELETE list that reads like a clean project, so refusing to classify.`);
        process.exit(2);
    }
    return out;
}

/** Pull-request state by number, asked once per number and cached for this run. */
const prState = new Map();
async function stateOfPullRequest(repository, number) {
    if (prState.has(number)) return prState.get(number);
    const headers = {Accept: "application/vnd.github+json", "User-Agent": "pages-retention"};
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    let state;
    try {
        const response = await fetch(`${GH}/repos/${repository}/pulls/${number}`, {headers});
        // A 404 is a real answer — that pull request does not exist — but any other failure is
        // NOT, and must not read as "closed". Unknown keeps the deployment.
        if (response.status === 404) state = "absent";
        else if (!response.ok) state = "unknown";
        else state = (await response.json()).state === "open" ? "open" : "closed";
    } catch {
        state = "unknown";
    }
    prState.set(number, state);
    return state;
}

const branchOf = (d) => d.deployment_trigger?.metadata?.branch ?? null;

/**
 * KEEP unless there is a positive reason to delete. Returns the reason either way, because the
 * report is the deliverable of phase one and a bare verdict cannot be reviewed.
 */
async function classify(repository, deployment, newestId) {
    if (deployment.id === newestId) return {verdict: "keep", why: "newest deployment in the project"};
    if (deployment.environment === "production") return {verdict: "keep", why: "production"};
    if (deployment.environment !== "preview") {
        return {verdict: "keep", why: `environment is ${JSON.stringify(deployment.environment)}, which this classifier does not know how to reason about`};
    }
    const branch = branchOf(deployment);
    if (!branch) return {verdict: "keep", why: "carries no branch, so its pull request cannot be resolved"};
    const match = /^pr-(\d+)$/.exec(branch);
    if (!match) return {verdict: "keep", why: `branch ${branch} is not a pull-request branch this repository deploys`};
    const number = Number(match[1]);
    const state = await stateOfPullRequest(repository, number);
    if (state === "open") return {verdict: "keep", why: `pull request #${number} is open`};
    if (state === "unknown") return {verdict: "keep", why: `pull request #${number} state could not be read`};
    return {verdict: "delete", why: `pull request #${number} is ${state}`};
}

async function main(argv) {
    const token = need("CLOUDFLARE_API_TOKEN");
    const account = need("CLOUDFLARE_ACCOUNT_ID");
    const project = need("PAGES_PROJECT");
    const repository = need("GITHUB_REPOSITORY");
    const doDelete = argv.includes("--delete");

    const deployments = await allDeployments(token, account, project);
    if (deployments.length === 0) {
        console.error("::error::the project reports zero deployments, which cannot be true of a site that is live. Treating as a failed enumeration.");
        process.exit(2);
    }

    // `created_on` is an ISO-8601 string, so lexical ordering is chronological ordering.
    const newestId = deployments.reduce((a, b) => (a.created_on > b.created_on ? a : b)).id;

    const rows = [];
    for (const d of deployments) {
        rows.push({d, ...await classify(repository, d, newestId)});
    }

    const keep = rows.filter((r) => r.verdict === "keep");
    const drop = rows.filter((r) => r.verdict === "delete");

    console.log(`project ${project}: ${rows.length} deployments — ${keep.length} keep, ${drop.length} delete`);
    console.log("");
    const summarise = (list) => {
        const byReason = new Map();
        for (const r of list) byReason.set(r.why, (byReason.get(r.why) ?? 0) + 1);
        return [...byReason].sort((a, b) => b[1] - a[1]);
    };
    console.log("KEEP:");
    for (const [why, n] of summarise(keep)) console.log(`  ${String(n).padStart(4)}  ${why}`);
    console.log("");
    console.log("DELETE:");
    for (const r of drop) console.log(`  ${r.d.id}  ${branchOf(r.d)}  ${r.d.created_on}  (${r.why})`);

    /*
     * THE REFUSAL, SEPARATE FROM THE CLASSIFICATION. The rules above already exclude production
     * and the newest deployment, so this can only fire if one of them is edited wrongly — which is
     * exactly when it is worth having. A guard that restates its own classifier is worthless; this
     * one reads the deployment's OWN fields immediately before the request that cannot be undone.
     */
    const forbidden = drop.filter((r) => r.d.environment === "production" || r.d.id === newestId);
    if (forbidden.length > 0) {
        console.error(`::error::the classifier put ${forbidden.length} protected deployment(s) in the DELETE set: ${forbidden.map((r) => r.d.id).join(", ")}. This is unrecoverable if executed, so nothing was deleted.`);
        process.exit(2);
    }

    if (!doDelete) {
        console.log("");
        console.log(`reported only — nothing was deleted. Re-run with --delete to remove the ${drop.length} deployment(s) above.`);
        return;
    }

    let deleted = 0;
    let failed = 0;
    for (const r of drop) {
        const {ok, status, body} = await cf(token, `/accounts/${account}/pages/projects/${project}/deployments/${r.d.id}`, {method: "DELETE"});
        if (ok) {
            deleted += 1;
        } else {
            failed += 1;
            console.error(`failed to delete ${r.d.id}: HTTP ${status} ${JSON.stringify(body?.errors ?? body)}`);
        }
    }
    console.log("");
    console.log(`deleted ${deleted} of ${drop.length}${failed ? `, ${failed} failed` : ""}`);
    if (failed > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main(process.argv.slice(2));
}
