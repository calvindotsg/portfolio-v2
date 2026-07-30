import {execFileSync} from "node:child_process";
import {existsSync, rmSync} from "node:fs";

/**
 * Builds the site once before the suite so `tests/build-output.test.ts` can assert
 * against real `dist/` artifacts. Export SKIP_BUILD=1 to reuse an existing build
 * while iterating locally.
 *
 * `.netlify/` is cleared first because "this build emitted no server runtime" is
 * only a meaningful assertion about *this* build. A checkout that ever built with
 * the old `@astrojs/netlify` adapter (deleted in plan 002) keeps that directory
 * around forever — nothing regenerates it now, and nothing else deletes it — so
 * the test would fail on a developer's machine while passing in CI. The whole
 * directory goes rather than the two build subdirectories: the carve-out that used
 * to spare `.netlify/state.json` existed to protect the Netlify CLI's link to a
 * site that no longer exists.
 */
export default function setup() {
    rmSync(".netlify", {recursive: true, force: true});

    if (process.env.SKIP_BUILD === "1" && existsSync("dist")) return;
    execFileSync("pnpm", ["build"], {stdio: "inherit"});
}
