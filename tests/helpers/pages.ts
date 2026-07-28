import {readdirSync, readFileSync} from "node:fs";

/**
 * EVERY PRERENDERED PAGE IN `dist/`, as `dist/`-relative paths.
 *
 * This exists because the site stopped being one page, and a handful of
 * whole-output assertions quietly narrowed the moment it did. They are the ones
 * shaped "the stylesheet ships nothing nobody wears" and "every class token has a
 * rule" — questions about the BUILD, asked against `dist/index.html` because that
 * was the only page there was.
 *
 * Those two are not per-page questions and must not be re-scoped as if they were.
 * Astro emits ONE shared CSS chunk for this site, so a rule that only `/patches`
 * wears is present in the home page's stylesheet, and an index-only orphan check
 * reports it as dead. Four real, worn classes failed that way on the first build of
 * the patch wall — `text-3xl`, `max-w-4xl`, `max-w-[60ch]` and the back link's icon
 * — which is a gate going red about the correct behaviour of the thing it guards.
 * Widen the question to the whole output and it is answerable again.
 *
 * Contrast `pageCss()`, which is deliberately per-page for the opposite reason:
 * "what does the cascade do on THIS page" is a question a union would answer wrong.
 * The distinction to keep is whether the assertion is about a page or about a build.
 *
 * DISCOVERED RATHER THAN LISTED, so a new route joins every one of these gates by
 * existing. A hand-kept list is the failure mode this whole file is a response to.
 */
export function builtPages(): string[] {
    const pages = readdirSync("dist", {recursive: true, encoding: "utf8"})
        .filter((f) => f.endsWith(".html"))
        .map((f) => `dist/${f}`)
        .sort();
    if (pages.length === 0) throw new Error("dist/ contains no HTML — every page-walking assertion would be vacuous");
    return pages;
}

/** Every class token worn by any element on `page`. */
export function classTokens(page: string): Set<string> {
    return new Set(
        [...readFileSync(page, "utf8").matchAll(/class="([^"]*)"/g)]
            .flatMap((m) => m[1].split(/\s+/).filter(Boolean)),
    );
}
