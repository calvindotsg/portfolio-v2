import {readFileSync} from "node:fs"

/**
 * WHAT EVERY THEME TOKEN RESOLVES TO, READ OUT OF THE BLOCK THAT DECLARES IT.
 *
 * `src/content/design.ts` says what each token is FOR and `src/layouts/BasicLayout.astro` says
 * what each token IS. Until this module the second half was unreachable from anything that
 * publishes the system: `/design` drew fifteen swatches without naming a single value, and all
 * three markdown renderings declined to carry one, so anyone building against this palette had
 * to open the layout and read the stylesheet — which is the situation those surfaces exist to
 * replace.
 *
 * DERIVING IS NOT RESTATING, AND THE DIFFERENCE IS THE WHOLE LICENCE FOR THIS FILE. The rule in
 * `src/content/design.ts`'s header is about AUTHORING — "if you find yourself typing a hex … it
 * does not belong here" — and a swatch has always published the same value as colour by exactly
 * this mechanism. Printing it as text is that mechanism with a different output: nothing here is
 * typed, so nothing here can drift. Type a hex into this file and the licence is gone.
 *
 * THE READ FORM IS LOAD-BEARING AND WAS MEASURED, NOT CHOSEN. Three ways to reach the source
 * were run against a real `astro build`, a real `vitest run` AND the orphan-rule gate in
 * `tests/build-output.test.ts`, which is the one that decided it:
 *
 *   - `readFileSync` on a path relative to the working directory — works everywhere. This one.
 *   - `import … from "../layouts/BasicLayout.astro?raw"` — builds and tests clean, and SHIPS
 *     DEAD CSS. UnoCSS's Vite pipeline includes any id matching `.astro` followed by end-of-id
 *     or a query, so the raw module's id matches and the extractor is handed the layout's
 *     entire text — 806 lines of prose, comments and declarations. Measured: eight ordinary
 *     words in that file became utility rules nobody wears, and the orphan gate went red on a
 *     correct page. There is no query that escapes the pattern, so this form cannot be kept
 *     without editing the utility config to exclude it — which is a decision about the whole
 *     engine, not about this module.
 *   - `readFileSync(new URL("…", import.meta.url))` — works under vitest and FAILS the build
 *     with `ENOENT`, because Astro bundles the SSR modules into a temporary directory before
 *     running them, so the path resolves next to the bundle rather than next to the source.
 *
 * WHAT THE CHOSEN FORM COSTS, said plainly: it has no module edge, so `astro dev` serves the
 * values it read when the module first loaded until the server restarts. Every shipped artifact
 * is built from scratch and `pnpm test` builds first, so nothing a reader or a gate sees can be
 * stale — and the read happens at module scope, on the server, during a build. This file must
 * never reach a browser.
 *
 * NOTHING REACHABLE FROM `uno.config.ts` MAY IMPORT THIS MODULE. That config loads
 * `src/lib/icons.ts` through unconfig/jiti, and a config that read the filesystem at load time
 * would run this read on every extractor pass. State the guard as a graph rather than as a
 * directory: `src/lib/goal.ts` is in that graph and this file is not. `src/lib/design-doc.ts`
 * and `src/pages/design.astro` are the two consumers and neither is reachable from the config.
 */

/**
 * WHERE THE VALUES ARE AUTHORED, as a path from the project root.
 *
 * `CLAUDE.md` names this file as the home of every colour token and that stays true — this
 * module adds a reader, not a second author.
 */
const THEME_SOURCE = "src/layouts/BasicLayout.astro"

/** One token, and what it resolves to in each theme. Ordered as the stylesheet declares them. */
export type TokenValues = {token: string, light: string, dark: string}

/**
 * The two theme blocks, keyed by the name in their own selector.
 *
 * The selector shape is the same one `themeTokens()` in `tests/design-system.test.ts` and the
 * single-sheet detector in `.design-sync/prepare-css.mjs` match, and quoting is accepted or
 * absent the way both of those accept it — the source writes single quotes and the minifier
 * drops them. A plan that de-anchors `:root`, moves this block into a `.css` file or generates it
 * from TypeScript has to retarget all three readers, not one.
 */
function themeBlocks(source: string): Record<string, Record<string, string>> {
    const blocks: Record<string, Record<string, string>> = {}
    for (const block of source.matchAll(/:root\[data-theme=['"]?(\w+)['"]?\]\s*\{([^}]*)\}/g)) {
        const declarations: Record<string, string> = {}
        // Capture up to the `;` so a trailing `/* … */` note stays out of the value.
        for (const d of block[2]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
            declarations[d[1]!] = d[2]!.trim()
        }
        if (Object.keys(declarations).length) blocks[block[1]!] = declarations
    }
    return blocks
}

/**
 * THIS THROWS RATHER THAN EXPORTING AN EMPTY LIST, AND THAT IS THE POINT.
 *
 * A parser that quietly returned nothing would render a page with fifteen blank cells, a spec
 * with an empty table and a green build — the same silent-staleness failure every surface here
 * was built to make impossible. The layout is a file somebody edits, so the failure has to be
 * loud at the moment it happens: `astro build` stops with the message below.
 *
 * THE ORDER IS THE LIGHT BLOCK'S AND EVERY NAME IS LOOKED UP IN THE DARK ONE. Both blocks happen
 * to declare the same names in the same order today; relying on that would turn a token added to
 * one and forgotten in the other into an `undefined` rendering as a blank cell, which is the
 * defect `tests/design-system.test.ts` opens by refusing.
 */
function parsePalette(source: string): readonly TokenValues[] {
    const blocks = themeBlocks(source)
    const light = blocks.light, dark = blocks.dark
    if (!light || !dark) {
        throw new Error(
            `src/lib/palette.ts parsed no light and/or dark theme block out of ${THEME_SOURCE}. `
            + "Every surface that publishes a value reads this module, so an empty palette would "
            + "ship a page and a spec with blank cells and a green build. Check the "
            + "`:root[data-theme=…]` selectors.",
        )
    }
    return Object.keys(light).map((token) => {
        const inDark = dark[token]
        if (inDark === undefined) {
            throw new Error(
                `${THEME_SOURCE} declares ${token} in the light theme and not in the dark one, so `
                + "it resolves to nothing for every reader on dark.",
            )
        }
        return {token, light: light[token]!, dark: inDark}
    })
}

/**
 * EVERY TOKEN'S TWO VALUES. `tests/palette.test.ts` holds this against `TOKEN_ROLES` and against
 * the BUILT stylesheet in both directions, which is what makes printing it safe: the values a
 * reader copies off `/design` are the values a browser resolves.
 *
 * NOT NORMALISED. The source spelling is what ships, and the comparison against the minified
 * sheet — which lower-cases and folds `#111111` to `#111` — is normalised at the assertion
 * instead. Lower-casing here would change what every surface prints.
 */
export const PALETTE: readonly TokenValues[] = parsePalette(readFileSync(THEME_SOURCE, "utf8"))

/**
 * ONE TOKEN'S VALUE IN ONE NAMED THEME, so a surface can label its cells from
 * `THEMING.themes` rather than typing a theme name of its own.
 *
 * The two names live in this module because it has to look them up in the parsed blocks anyway;
 * `src/content/design.ts` declares them for the surfaces and is gated against the stylesheet's
 * own selectors. A THIRD home on a page or in a renderer is what this exists to prevent — and
 * because it THROWS on a name it does not know, a theme added to that list without being added
 * here fails the build instead of rendering a row with an empty cell.
 */
export function valueIn(values: TokenValues, theme: string): string {
    if (theme === "light") return values.light
    if (theme === "dark") return values.dark
    throw new Error(
        `src/lib/palette.ts has no reading of ${values.token} in a theme called "${theme}". A `
        + "theme was added to src/content/design.ts or to the layout and this module was not "
        + "taught to read its block.",
    )
}
