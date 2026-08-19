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

/**
 * WHAT THE HARNESS SAYS ABOUT ITSELF, WHICH THIS BUILD MUST NOT INHERIT AND REPUBLISH.
 *
 * `vitest.config.ts` builds its config with astro's getViteConfig, and loading it leaves
 * vitest's own `import.meta.env` mirrored into this process's environment — measured on
 * the spawn below as DEV=1, PROD=, MODE=test, TEST=true, VITEST=true, plus BASE_URL and
 * SITE. Astro surfaces the environment as `import.meta.env` for the server build, which is
 * how UMAMI_ID reaches `src/layouts/BasicLayout.astro` without a prefix, and it is also
 * how an inherited DEV=1 tells the prerender it is a development build. A VARIABLE
 * OUTVOTES THE MODE: no build flag can argue with it, because it is not read as a flag at
 * all. Every name here is one the child would answer an `import.meta.env` question with.
 *
 * THE WHOLE SET GOES, NOT THE ONE NAME THAT MOVES THIS SITE'S OUTPUT TODAY. Only DEV
 * changes a byte of the current build; MODE, TEST and VITEST are inert and are stripped
 * anyway, because an artifact that still describes itself as a test run is the same defect
 * waiting for a different reader. Sparing the inert ones would be a carve-out from the rule
 * rather than an application of it, and the reason they are inert is that nothing asks yet.
 * SSR is the one name never observed here — it is Vite's, it would be mirrored the same
 * way, and deleting an absent key costs nothing.
 */
const HARNESS_ENV = ["MODE", "BASE_URL", "PROD", "DEV", "SSR", "TEST", "VITEST", "SITE"];

export default function setup() {
    rmSync(".netlify", {recursive: true, force: true});

    if (process.env.SKIP_BUILD === "1" && existsSync("dist")) return;

    /*
     * PRODUCTION MODE, SET ON THE CHILD, BECAUSE THIS SPAWN IS THE ONLY BUILD CI RUNS.
     *
     * vitest sets NODE_ENV=test in its own process and a spawn with no environment of its
     * own inherits it. Vite resolves its production flag as an equality against
     * process.env.NODE_ENV and only DEFAULTS that variable when it is UNSET, so an
     * inherited "test" is respected rather than corrected and the whole prerender runs in
     * development mode.
     *
     * AND IT REACHED VISITORS. `.github/workflows/ci.yml` has no bare build step — this
     * globalSetup is the only build in the pipeline — and both deploy jobs publish the
     * artifact the suite asserted against without ever rebuilding it. That identity is the
     * point of the design, and it is also what carried the mode all the way to the origin:
     * the live home page was measured serving data-image-component="true", the attribute
     * astro emits around an image only under a development build.
     *
     * BOTH HALVES ARE LOAD-BEARING AND EITHER ALONE IS GREEN-LOOKING AND WRONG. Measured,
     * four builds, counting that attribute in the emitted home page: production mode with
     * DEV inherited emits it, a stripped environment at NODE_ENV=test emits it, and only
     * the two together produce the tree a plain `pnpm build` produces — byte for byte,
     * `dist/` compared whole.
     *
     * WHAT IT COST WAS 28 BYTES, WHICH IS THE ARGUMENT FOR FIXING IT RATHER THAN AGAINST.
     * The production tree and the test tree differed in `index.html` alone, by that one
     * attribute. The exposure is latent rather than bounded — astro ships development
     * branches in client modules this site does not load yet, so the day anything here
     * adds a router or prefetch, development-only code reaches visitors on a green run and
     * nothing in the pipeline notices.
     *
     * ONE HOME, AND IT IS THIS ONE. Setting the value in `vitest.config.ts` instead would
     * put it where it also changes the mode of every test process, and a second place to
     * write it is how the two come to disagree. What survives that argument is the gate in
     * `tests/build-output.test.ts`: it asserts the ARTIFACT carries no development marker
     * rather than asserting this line exists, so a second build invocation added to CI
     * without this environment goes red too.
     */
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        NODE_ENV: "production",
    };
    for (const name of HARNESS_ENV) delete env[name];

    execFileSync("pnpm", ["build"], {stdio: "inherit", env});
}
