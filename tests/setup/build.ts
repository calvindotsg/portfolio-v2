import {execFileSync} from "node:child_process";
import {existsSync, rmSync} from "node:fs";

/**
 * Builds the site once before the suite so `tests/build-output.test.ts` can assert
 * against real `dist/` artifacts. Export SKIP_BUILD=1 to reuse an existing build
 * while iterating locally.
 *
 * `.netlify/v1` is cleared first because "no SSR function was emitted" is only a
 * meaningful assertion about *this* build. A checkout that ever built with the
 * old `@astrojs/netlify` adapter keeps that directory around forever — nothing
 * regenerates it now, and nothing else deletes it — so the test would fail on a
 * developer's machine while passing in CI. `.netlify/state.json` is the Netlify
 * CLI's site link, not build output, so it must survive.
 */
export default function setup() {
    rmSync(".netlify/v1", {recursive: true, force: true});
    rmSync(".netlify/build", {recursive: true, force: true});

    if (process.env.SKIP_BUILD === "1" && existsSync("dist")) return;
    execFileSync("pnpm", ["build"], {stdio: "inherit"});
}
