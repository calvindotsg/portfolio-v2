import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import UnoCSS from "@unocss/astro";
import stravaProgress from "./src/data/strava-progress.json" with { type: "json" };

// https://astro.build/config
export default defineConfig({
  site: "https://calvin.sg/",
  integrations: [
    // `lastmod` is the day the CONTENT last changed, which on this site is the day the
    // kilometres last moved — NOT the day the site was built.
    //
    // THE BUILD DATE WOULD BE A LIE, and it is worth being precise about why, because
    // `BUILD_DATE` is right there and is the obvious thing to reach for. This site
    // rebuilds every night whether or not anything happened; on a rest day the only thing
    // that moves is a countdown ticking down by one. Google uses `lastmod` only "if it's
    // consistently and verifiably accurate", and says an update to the MAIN CONTENT is
    // significant where "an update to the copyright date is not" — a countdown decrementing
    // on an otherwise identical page is much closer to the copyright date. Stamping today
    // on all four pages nightly is exactly the pattern that gets a feed's `lastmod`
    // discounted wholesale, and the discount would land hardest on the days that matter:
    // the ones where the kilometres really did jump.
    //
    // `updated_at` IS THE RIGHT SIGNAL, and it is right for a reason that looks like a bug
    // until you read `today.ts`: the Strava bot deliberately FREEZES it when the numbers do
    // not move, so the workflow's `git diff --quiet` gate can suppress a pointless nightly
    // commit. That makes it useless as a clock — which is why `today.ts` exists — and
    // precisely correct as a last-modified stamp. On 2026-07-30 the site rebuilt while
    // `updated_at` still read 2026-07-29, which is the honest answer.
    //
    // THE KNOWN GAP, stated rather than discovered later: editing `EVENTS` in
    // `constants.ts` changes what the patch pages render without moving `updated_at`, so
    // that edit ships with a stale `lastmod`. It is rare and manual. If it stops being
    // rare, give the events list its own edited-on date and take the max here — do not
    // fall back to the build date.
    sitemap({ serialize: (item) => ({ ...item, lastmod: stravaProgress.updated_at }) }),
    UnoCSS({ injectReset: true }),
  ],
  output: "static",
});
