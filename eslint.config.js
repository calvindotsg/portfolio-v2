import eslintPluginAstro from "eslint-plugin-astro";

export default [
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs["jsx-a11y-recommended"],
  {
    files: ["**/*.{js,astro}"],
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "warn",
      "no-debugger": "error",
      "astro/no-unused-define-vars-in-style": "error",
      /*
       * `astro/valid-compile` IS GONE FROM HERE BECAUSE THE PLUGIN DEPRECATED IT, not because
       * the check stopped mattering. eslint-plugin-astro v3 parses `.astro` with Astro's Rust
       * compiler and dropped this rule from `recommended`; it still resolves, so setting it
       * stayed green, which is exactly why it would have sat here until the release that
       * deletes it turned a silent deprecation into `Definition for rule not found`.
       *
       * WHAT REPLACES IT IS ALREADY IN THE GATE. `pnpm check` runs `astro check` over 76
       * files, and the compiler now rejects at parse time what this rule used to report — so
       * removing it narrows what eslint claims, not what CI enforces. `.github/workflows/ci.yml`
       * runs `check` and `eslint` as separate steps for this reason: they cover different
       * files, and `tests/workflow-guards.test.ts` holds both against every publishing path.
       */
    },
  },
  /*
   * THE SCRIPTS, WHICH NO STATIC ANALYSIS REACHED AT ALL.
   *
   * `scripts/*.mjs` is not `.js`, so the block above never matched it, and `astro check` reads
   * `.ts` and `.astro` — between them the three gates that guard every change left three plain
   * node programs entirely unanalysed. A bare `ReferenceError` in `scripts/strava-sync.mjs`
   * ships green through `pnpm check`, `pnpm eslint` and `pnpm test` alike, and the first thing
   * to notice is the person running it or the nightly bot failing at 05:13.
   *
   * WIDENING THE `package.json` GLOB ALONE IS A SILENT NO-OP, which is the trap worth naming:
   * the CLI would then hand these files to eslint, this config would match none of them, and
   * eslint reports zero problems for zero rules — a green run that means nothing. Both halves
   * have to move, and the block has to come with its own globals.
   *
   * THE GLOBALS ARE LISTED RATHER THAN IMPORTED. Flat config gives a file the ECMAScript
   * built-ins and nothing else, so `process`, `console`, `fetch` and `URL` — the whole
   * platform surface these scripts touch — would every one be reported by `no-undef`, and the
   * fix a reader reaches for is to disable the rule that just found something. `globals` is a
   * dependency this repository does not have and four names do not earn one.
   */
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {console: "readonly", fetch: "readonly", process: "readonly", URL: "readonly"},
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error",
      "no-debugger": "error",
    },
  },
];
