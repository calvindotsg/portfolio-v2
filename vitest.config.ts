/// <reference types="vitest/config" />
import {getViteConfig} from "astro/config";

export default getViteConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        globalSetup: ["tests/setup/build.ts"],
        testTimeout: 30_000,
        /*
         * LOAD-BEARING, AND IT LOOKS LIKE TIDY-UP. `astro.config.mjs` uses
         * `UnoCSS({injectReset: true})`, which pulls a real `.css` file into the module
         * graph; without inlining these packages the whole run dies before a single
         * assertion with `TypeError: Unknown file extension ".css" for
         * @unocss/reset/tailwind.css`. Nothing about the line says that, which is why
         * it has been proposed for removal as dead config.
         *
         * The reason is recorded here rather than by pointer because it had drifted out
         * of every live document: it lived in `.devin/wiki.json` until that file was
         * rewritten to carry no implementation facts, and the only other copy is in
         * `plans/done/001-regression-safety-net.md`, which is a frozen archive nobody
         * reads before editing a config. A trap that a careful reader cannot derive
         * belongs beside the line that sets it.
         *
         * `getViteConfig` above is the same class of thing: with a plain vitest config,
         * importing an `.astro` page fails with "Failed to parse source for import
         * analysis because the content contains invalid JS syntax".
         */
        server: {deps: {inline: [/@unocss/, /unocss/]}},
    },
});
