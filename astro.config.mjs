import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import UnoCSS from "@unocss/astro";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://calvin.sg/",
  integrations: [
    sitemap(),
    robotsTxt({
      sitemap: [
        "https://calvin.sg/sitemap-index.xml",
        "https://calvin.sg/sitemap-0.xml",
      ],
    }),
    UnoCSS({ injectReset: true }),
    icon(),
  ],
  output: "static",
});
