// The one place anything in this repository gets a Strava access token.
//
// Zero dependencies, plain node, no TypeScript — the same posture as
// scripts/fetch-strava-progress.mjs, which runs on GitHub Actions' preinstalled node
// with no `pnpm install` in front of it.
//
// THE CREDENTIAL MODEL, WHICH IS THE WHOLE REASON THIS FILE EXISTS: 1PASSWORD IS THE
// SOURCE OF TRUTH AND THE GITHUB SECRET IS A COPY. A GitHub secret cannot be read back,
// so it can never be compared with anything and can never be recovered from; the
// 1Password item `calvindotsg-strava` is the only readable copy that exists. It follows
// that only a caller who can reach the truth may change the credential, and that it
// writes the truth BEFORE the copy — a copy written first is a copy that can outlive the
// thing it copies.
//
// This script holds no configuration of its own. Every name below arrives in the
// environment: the three Strava credentials under the names CI already uses, and — for
// the rotation path alone — where the truth lives and which repository holds the copy.
// See `.env.op`, which supplies all of them locally as `op://` references, and
// README.md "Configuration".
import { spawnSync } from "node:child_process";

const TOKEN_URL = "https://www.strava.com/oauth/token";

/**
 * READ WHEN CALLED, NEVER AT IMPORT. `tests/projection.test.ts` imports
 * `scripts/fetch-strava-progress.mjs` for `nextProgress`, which imports this module — so a
 * `const CLIENT_ID = process.env.STRAVA_CLIENT_ID` at the top of this file would throw
 * during collection on any machine without Strava credentials in its environment, which is
 * every machine that runs `pnpm test`. The suite would go red for want of a secret it has
 * no business holding.
 */
function required(env, name) {
    const value = env[name];
    if (!value) throw new Error(`Missing env: ${name}`);
    return value;
}

/**
 * CAN THIS PROCESS REACH THE TRUTH? Asked as a capability rather than inferred from a
 * hostname: `op` on PATH and answering `--version` is what "1Password is reachable here"
 * actually means, and a runner that one day installs the CLI should be governed by the
 * SECOND clause rather than by the first silently becoming false.
 *
 * `GITHUB_ACTIONS` is checked as well and it is not redundant. A workflow that gained the
 * 1Password CLI would be able to write the truth from a context that cannot be watched,
 * and the posture below is deliberate about that: CI persists nothing at all.
 */
export function canReachTheTruth(env = process.env) {
    if (env.GITHUB_ACTIONS === "true") return false;
    const probe = spawnSync("op", ["--version"], { stdio: "ignore" });
    return probe.status === 0;
}

/**
 * WHAT A ROTATION COSTS, WRITTEN DOWN BECAUSE A FUTURE READER WILL ACT ON IT.
 *
 * Strava MAY return a new refresh token on a refresh, and the old one is spent the moment
 * it does. Locally that is a two-line chore: write 1Password, re-copy to GitHub. In CI it
 * is unrecoverable, and not merely inconvenient — the runner cannot reach 1Password, so
 * the chain dies in BOTH stores at once. The truth is dead too, and `pnpm strava:sync`
 * would then push a dead credential over a dead credential. The only way back is a fresh
 * OAuth authorize by hand.
 *
 * That is the ACCEPTED COST of a static-secret posture, not a gap in it. The alternative —
 * letting CI write its own credentials — buys a self-healing chain and pays for it with a
 * secret-writing path that runs unattended every night. So CI fails loudly on the day it
 * happens, which is the only day the message can still be useful.
 */
function persistRotation(env, refreshToken) {
    if (!canReachTheTruth(env)) {
        throw new Error(
            "Strava rotated the refresh token and this process cannot reach 1Password, so the "
            + "credential chain is now broken in BOTH stores: the token in the GitHub secret and "
            + "the token in 1Password are each spent. Nothing was written. Recovery is a fresh "
            + "OAuth authorize against the Strava app, then `pnpm strava:sync --write`. Do NOT "
            + "run a sync first — it would copy the dead credential over the dead credential.",
        );
    }

    const vault = required(env, "STRAVA_OP_VAULT");
    const item = required(env, "STRAVA_OP_ITEM");
    const repo = required(env, "STRAVA_SECRET_REPO");

    // THE TRUTH FIRST. If this fails, nothing else is attempted: a GitHub secret written
    // ahead of 1Password is a credential whose only readable copy is already stale, which
    // is the one state this whole model exists to prevent.
    //
    // The value goes in argv here because `op item edit` takes its assignments that way and
    // has no stdin form. It is briefly visible to `ps` on the local machine — accepted, and
    // named rather than hidden. The GitHub half below does have a stdin form and uses it.
    const written = spawnSync("op", [
        "item", "edit", item, "--vault", vault, `refresh_token[concealed]=${refreshToken}`,
        "--format", "json",
    ], { stdio: ["ignore", "ignore", "inherit"] });
    if (written.status !== 0) {
        throw new Error(
            `Strava rotated the refresh token and \`op item edit\` failed (exit ${written.status}). `
            + "Nothing was written to either store, and the old token is already spent — write the "
            + "new one into 1Password by hand, then run `pnpm strava:sync --write`.",
        );
    }

    const copied = spawnSync("gh", ["secret", "set", "STRAVA_REFRESH_TOKEN", "-R", repo], {
        input: refreshToken,
        stdio: ["pipe", "ignore", "inherit"],
    });
    if (copied.status !== 0) {
        throw new Error(
            `Strava rotated the refresh token. 1Password now holds the new one; \`gh secret set\` `
            + `failed (exit ${copied.status}), so the GitHub copy is STALE and tonight's bot run `
            + "will fail. Re-copy with `pnpm strava:sync --write`.",
        );
    }
    console.log("NOTE: Strava rotated the refresh token; 1Password updated, then the GitHub copy.");
}

/**
 * ONE ACCESS TOKEN, FROM THE THREE CREDENTIALS CI ALREADY NAMES.
 *
 * The env var names are the ones `.github/workflows/strava-progress.yml` sets, which is
 * what makes this one code path in both places rather than two that agree today.
 *
 * The token is RETURNED, never logged and never written anywhere. A caller that wants to
 * see what it was talking to should print the request it made, not the credential it made
 * it with.
 */
export async function accessToken(env = process.env) {
    const refreshToken = required(env, "STRAVA_REFRESH_TOKEN");

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: required(env, "STRAVA_CLIENT_ID"),
            client_secret: required(env, "STRAVA_CLIENT_SECRET"),
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);

    const body = await res.json();
    if (typeof body.access_token !== "string") {
        throw new Error("Token refresh returned no access_token");
    }
    // The response carries a refresh token on every call and it is USUALLY the same one.
    // Comparing rather than assuming is the whole difference between this and the inline
    // refresh it replaced, which destructured `access_token` alone and could not have
    // noticed a rotation at all.
    if (typeof body.refresh_token === "string" && body.refresh_token !== refreshToken) {
        persistRotation(env, body.refresh_token);
    }
    return body.access_token;
}
