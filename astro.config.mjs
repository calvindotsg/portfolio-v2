import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import UnoCSS from "@unocss/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://calvin.sg/",
  integrations: [
    // NO `lastmod`, DELIBERATELY, AND THIS IS THE SECOND ANSWER TO THAT QUESTION.
    //
    // The first was `lastmod: stravaProgress.updated_at`, argued from Google's rule that
    // `lastmod` is used only "if it's consistently and verifiably accurate". The argument
    // was right and it condemns its own implementation: measured on this site, that stamp
    // is wrong in BOTH directions, on every URL.
    //
    // FALSE POSITIVE. Move the kilometres (`updated_at` 07-29 -> 07-30) and rebuild: all
    // four URLs get a new `lastmod`, while `patches/`, `patches/cycling/` and
    // `patches/running/` come out BYTE-IDENTICAL. Those pages contain no Strava kilometre
    // at all — grep one for 2279.7 and you get nothing — so the stamp is not a weak signal
    // for them, it is an unrelated one. The file's history says the kilometres moved on 6
    // of the 8 days it has existed, so this is the common case, not the corner.
    //
    // FALSE NEGATIVE, which is the harmful direction. Freeze the kilometres and let the
    // calendar run six days: every one of the four pages changes — countdowns tick and the
    // 2026-08-02 bib flips outline to earned through `patchState` — while `lastmod` still
    // reads 2026-07-29. The one day the wall genuinely changed is the day the feed says
    // nothing happened, and a frozen `lastmod` is an instruction not to come back.
    //
    // The home page is no exception, which is what settled it. On that same rest week its
    // cycling card goes from "Next race in 3 days" to "in 13 weeks" because a race passed
    // — a change to the main content by any reading — with the stamp unmoved.
    //
    // SO THE HONEST OPTIONS WERE TWO, and this is the cheap one. An absent `lastmod` is
    // simply ignored, at no cost; that is what the base revision did and what this does.
    // The expensive one is to derive the date from the OUTPUT rather than an input — hash
    // each built page into a committed manifest and stamp each URL with the day its own
    // hash last changed. That is verifiably accurate by construction and would also close
    // the `EVENTS`-edit gap, but note before reaching for it that every page embeds
    // `<meta name="build-date">`, so a naive hash changes nightly and the manifest churns
    // forever. Whatever comes next, do not reach for `BUILD_DATE`: a nightly rebuild
    // stamping today on four unchanged pages is the exact pattern that gets a feed's
    // `lastmod` discounted wholesale.
    sitemap(),
    UnoCSS({ injectReset: true }),
  ],
  output: "static",
});
