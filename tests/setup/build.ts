import {execFileSync} from "node:child_process";
import {existsSync} from "node:fs";

/**
 * Builds the site once before the suite so `tests/build-output.test.ts` can assert
 * against real `dist/` artifacts. Export SKIP_BUILD=1 to reuse an existing build
 * while iterating locally.
 */
export default function setup() {
    if (process.env.SKIP_BUILD === "1" && existsSync("dist")) return;
    execFileSync("pnpm", ["build"], {stdio: "inherit"});
}
