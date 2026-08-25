// Normalises this site's compiled CSS into stable paths the design-sync converter
// can point at. Run after `pnpm build` (see cfg.buildCmd).
//
// WHY THIS EXISTS: Astro content-hashes every emitted stylesheet, so `cssEntry`
// cannot name a file directly without rotting on the next build. It also splits the
// output — one sheet every page links (tokens, base rules, the UnoCSS utilities and
// shortcuts, the icon classes) and one per-page chunk holding only
// `[data-astro-cid-*]`-scoped component CSS, whose selectors cannot match anything
// written outside this repo. The global sheet is the design system; the chunk is not.
//
// The global sheet is identified BY CONTENT (it is the one defining the theme
// tokens), never by filename — the hash moves and the stem is whichever module
// Astro happened to name the shared chunk after.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ASTRO_DIR = "dist/_astro";
const OUT_DIR = ".design-sync/.cache/css";
const TOKEN_RULE = /(:root[^{}]*)\{([^{}]*)\}/g;

const sheets = readdirSync(ASTRO_DIR).filter((f) => f.endsWith(".css")).sort();
if (!sheets.length) {
  console.error(`[PREPARE_CSS] no stylesheets in ${ASTRO_DIR} — run the site build first`);
  process.exit(1);
}

const globals = sheets.filter((f) => readFileSync(join(ASTRO_DIR, f), "utf8").includes(":root[data-theme"));
if (globals.length !== 1) {
  console.error(
    `[PREPARE_CSS] expected exactly one sheet defining :root[data-theme], found ${globals.length}`
    + ` (${globals.join(", ") || "none"}).`,
  );
  // The likely cause, and it is measured history here rather than a guess. Astro's default
  // `inlineStylesheets: "auto"` moves a small sheet INTO the page as a <style> block, and
  // this site has already had the whole theme-token block move that way once — 2,889 bytes
  // of it — when adding one small page rebalanced the chunks. The header comment on
  // `tests/helpers/css.ts` carries that measurement and the idiom that survives it: ask the
  // page what CSS it loads, not the directory what files are in it. This script reads the
  // directory on purpose, because it wants the sheet EVERY page shares rather than one
  // page's cascade — so it cannot follow that idiom, and fails loudly here instead.
  if (!globals.length) {
    console.error("[PREPARE_CSS] the tokens are most likely inlined into the pages rather than"
      + " emitted as a file. Read the header of tests/helpers/css.ts, then decide whether to"
      + " harvest them from a built page's <style> blocks instead of this directory.");
  }
  process.exit(1);
}

const css = readFileSync(join(ASTRO_DIR, globals[0]), "utf8");
mkdirSync(OUT_DIR, { recursive: true });

// Tokens are re-emitted one declaration per line: same values, read by an agent
// rather than a browser.
const blocks = [];
for (const [, selector, body] of css.matchAll(TOKEN_RULE)) {
  const decls = body.split(";").map((d) => d.trim()).filter((d) => d.startsWith("--"));
  if (decls.length) blocks.push(`${selector.trim()} {\n${decls.map((d) => `  ${d};`).join("\n")}\n}`);
}
if (!blocks.length) {
  console.error("[PREPARE_CSS] no custom-property blocks extracted — the token rule shape changed");
  process.exit(1);
}
const tokens = `/* Theme tokens, extracted verbatim from the compiled ${globals[0]}.\n`
  + `   Authored in src/layouts/BasicLayout.astro, where each token's role is documented. */\n\n`
  + blocks.join("\n\n") + "\n";
writeFileSync(join(OUT_DIR, "tokens.css"), tokens);

// The readable block is PREPENDED to the sheet the converter ships, rather than left
// beside it, because the sync only carries what `styles.css` can reach by @import and a
// separate file here is reachable by nothing: `tokensGlob` globs inside a published
// tokens package, which this repository does not have. Restating the same declarations
// ahead of the minified copy costs about 1.5 KB and no cascade — the values are
// identical, so whichever wins paints the same colour — and it puts the whole palette in
// the first forty lines of the one stylesheet a design agent is handed.
writeFileSync(join(OUT_DIR, "site.css"), `${tokens}\n${css}`);
console.error(`[PREPARE_CSS] ${globals[0]} -> site.css (${css.length}B + ${blocks.length} token blocks)`);
