/// <reference types="vitest/config" />
import {getViteConfig} from "astro/config";

export default getViteConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        globalSetup: ["tests/setup/build.ts"],
        testTimeout: 30_000,
        server: {deps: {inline: [/@unocss/, /unocss/]}},
    },
});
