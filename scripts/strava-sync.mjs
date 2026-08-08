// Re-copies the Strava refresh token from 1Password — the source of truth — onto the GitHub
// repository secret that the nightly bot reads.
//
//     op run --env-file=.env.op -- pnpm strava:sync              # says what it would do
//     op run --env-file=.env.op -- pnpm strava:sync -- --write   # does it, then proves it
//
// DRY BY DEFAULT, AND THE FLAG IS THE POINT. `gh secret set` is an irreversible write to the
// credential a nightly unattended job authenticates with, and the value it overwrites cannot
// be read back to compare or to restore. So the default prints the plan and touches nothing;
// `--write` is a deliberate second act.
//
// NOTHING CAN ASSERT THAT THE TWO STORES MATCH. A GitHub secret is write-only by design:
// after the copy there is no read that could compare the bytes. That leaves exactly one honest
// verification, and it is functional rather than comparative — take the credential this run
// just copied, refresh it, and spend the resulting access token on a real request. If that
// works, the token is live; whether GitHub received those same bytes is proved by tomorrow's
// bot run and by nothing here. The claim is bounded on purpose.
//
// This script holds no configuration. `.env.op` supplies which 1Password item is the truth and
// which repository holds the copy; see README.md "Configuration".
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { accessToken, canReachTheTruth } from "./strava-auth.mjs";

const SECRET = "STRAVA_REFRESH_TOKEN";

function required(env, name) {
    const value = env[name];
    if (!value) throw new Error(`Missing env: ${name} — run this under \`op run --env-file=.env.op\`.`);
    return value;
}

/**
 * THE TRUTH ITSELF, read from 1Password rather than taken out of the environment.
 *
 * `op run --env-file=.env.op` has already resolved `STRAVA_REFRESH_TOKEN` into the
 * environment, so reading it from there would be one fewer call and would work. It is not
 * done, because this is the one tool in the repository whose entire job is to state which
 * store is authoritative: reading the item by name makes the source visible in the code
 * instead of resting on how the process happened to be launched.
 *
 * The value is returned and never printed. `op read` writes it to this process's stdout pipe
 * and nowhere else.
 */
function truth(env) {
    const ref = `op://${required(env, "STRAVA_OP_VAULT")}/${required(env, "STRAVA_OP_ITEM")}/refresh_token`;
    const read = spawnSync("op", ["read", ref], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
    if (read.status !== 0) throw new Error(`\`op read ${ref}\` failed (exit ${read.status}).`);
    const value = read.stdout.trim();
    if (value === "") throw new Error(`\`op read ${ref}\` returned nothing.`);
    return { ref, value };
}

async function main(argv) {
    const write = argv.includes("--write");
    const env = process.env;

    if (!canReachTheTruth(env)) {
        throw new Error("1Password is not reachable from this process, and it is the source of truth "
            + "for this credential. Nothing to sync from. (In CI this is expected and this script "
            + "should never run there.)");
    }

    const repo = required(env, "STRAVA_SECRET_REPO");
    const { ref, value } = truth(env);

    if (!write) {
        console.log(`DRY RUN — nothing was written. Would set the ${SECRET} secret on ${repo} from ${ref}`);
        console.log(`         (${value.length} characters read from 1Password; the value is never printed.)`);
        console.log("Re-run with `-- --write` to copy it, which also spends the credential once to prove it is live.");
        return;
    }

    // THE COPY. Value on stdin rather than in argv, so it is never visible to `ps`.
    const set = spawnSync("gh", ["secret", "set", SECRET, "-R", repo], {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
    });
    if (set.status !== 0) throw new Error(`\`gh secret set ${SECRET}\` failed (exit ${set.status}).`);
    console.log(`Set ${SECRET} on ${repo} from ${ref}.`);

    // THE VERIFICATION, AND IT RUNS SECOND FOR A REASON. `accessToken` persists a rotation
    // itself — 1Password first, then the GitHub copy — so refreshing BEFORE the copy would let
    // this script push the token it had already read over the newer one the refresh had just
    // stored. Copy, then spend.
    const token = await accessToken({ ...env, [SECRET]: value });
    const res = await fetch("https://www.strava.com/api/v3/athlete", {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`The credential refreshed but the API refused it: ${res.status}`);
    const athlete = await res.json();
    console.log(`Verified by use: the refreshed token reached Strava as athlete ${athlete.id}.`);
    console.log("That the GitHub copy holds these same bytes is not provable here — a secret cannot be "
        + "read back. Tomorrow's strava-progress run is the proof.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main(process.argv.slice(2));
}
