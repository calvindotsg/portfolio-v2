import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import UnoCSS from "@unocss/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://calvin.sg/",
  integrations: [
    sitemap(),
    UnoCSS({ injectReset: true }),
  ],
  output: "static",
});
