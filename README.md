<!-- PROJECT LOGO -->
<br />
<p align="center">
  <h1 align="center">👋 Hi, I'm Calvin</h1>
</p>
<!-- PROJECT LOGO -->

[![GitHub commit activity (branch)](https://img.shields.io/github/commit-activity/w/calvindotsg/portfolio-v2/main)](https://github.com/calvindotsg/portfolio-v2/commits/main/)
[![GitHub license](https://img.shields.io/github/license/calvindotsg/portfolio-v2)](./LICENSE)
[![Netlify Status](https://api.netlify.com/api/v1/badges/1e7b40f5-97bf-4baa-8648-dd03494f3e53/deploy-status)](https://app.netlify.com/sites/calvindotsg/deploys)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/calvindotsg/portfolio-v2)

## Overview

A personal portfolio website built with [Astro](https://astro.build), showcasing my skills, projects, and interests.

![Portfolio Preview](public/preview.jpg)

## Features

- Bento-style, minimal design: a single-screen home page, plus **My events** at
  `/patches` — every race entered, in any year, drawn as bibs, one prerendered page
  per sport. A *Finisher Patch* is a race completed and earned, so the page is headed
  by the events and only the earned bibs are patches; "patch wall" survives as the URL
  and the metaphor, not as anything the site calls itself. The goal cards stay scoped
  to the goal year while the wall keeps everything
- Fully responsive layout
- Dark/Light mode support
- Optimized for performance, accessibility, and SEO
- CI/CD integration with [Netlify](https://www.netlify.com/)

## Tech Stack

- [Astro](https://astro.build)
- [UnoCSS](https://unocss.dev/)
- [Iconify](https://iconify.design/) (Font Awesome 6 Brands + Remix Icon sets)
- [Umami](https://umami.is/)
- [Vitest](https://vitest.dev/)
- [Netlify](https://www.netlify.com/)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/calvindotsg/portfolio-v2
   ```

2. Navigate to the project directory:
   ```bash
   cd portfolio-v2
   ```

3. Install dependencies (this repo pins pnpm; `npm install` would ignore
   `pnpm-lock.yaml`):
   ```bash
   pnpm install
   ```

4. Copy the environment template — `UMAMI_ID` enables the analytics snippet and
   can be left as-is for local development:
   ```bash
   cp .env.example .env
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

## Configuration

1. Update your personal details in `src/lib/constants.ts` — every piece of site
   content (links, career, about, cycling goal, footer, SEO metadata) lives
   there.
2. Modify the `site` and other relevant properties in `astro.config.mjs`.
3. The goals' `current_progress` figures are the one exception: they are
   bot-owned. A daily GitHub Actions run
   (`.github/workflows/strava-progress.yml`) writes Strava's year-to-date ride
   and run totals to `src/data/strava-progress.json`, which `constants.ts`
   imports. Its only inputs are the `STRAVA_ATHLETE_ID` and `STRAVA_CLIENT_ID`
   repository *variables* and the `STRAVA_CLIENT_SECRET` and
   `STRAVA_REFRESH_TOKEN` repository *secrets* — the script holds no
   configuration of its own. To bump a figure by hand, edit that JSON rather
   than `constants.ts`; `total_goal` stays in `constants.ts` and caps the
   displayed figure.

   The variable/secret split follows the one test: **does the value ship
   publicly?** The athlete id is on the site's Strava links, and a Strava client
   id is a query parameter of the OAuth authorize URL, so both are public and
   both are variables. Only the client secret and the refresh token authenticate,
   so only those are secrets — and because a GitHub secret can never be read
   back, those two are also kept in 1Password (`calvindotsg-strava`), which is
   the only recoverable copy that exists.

   Note that the athlete id appears in two of the three sanctioned homes, for two
   different jobs: the `STRAVA_ATHLETE_ID` variable decides *whose kilometres* are
   fetched, and the `STRAVA_PROFILE_URL` constant in `constants.ts` decides *where
   the site's Strava link goes*. Changing accounts means editing both. Updating only
   the variable publishes the new athlete's distances while the link still points at
   the old profile, and nothing in the build or the suite can catch that.
4. Analytics is the `UMAMI_ID` repository *variable*, read at build time by
   `BasicLayout.astro`. It is deliberately a variable and not a secret: the id is
   served in the HTML of every page, so it is already public, and marking it secret
   would mask it in build logs while protecting nothing — and a secret cannot be read
   back, so drift becomes undetectable.

   **It fails open**, which is the reason CI asserts on it. When the value is unset the
   `data-website-id` attribute is dropped entirely and the Umami `<script>` still loads,
   so the page looks correct, returns 200, and records nothing. The `build` job in
   `.github/workflows/ci.yml` therefore greps *every* built page for the id's exact
   value — not one page, and not a pattern — because the tag comes from the shared
   layout and a build-wide property asked of `index.html` alone would miss the other
   three. That step is skipped for fork PRs and for Dependabot, which are never
   deployed and may not be able to read the variable at all.

## Testing

```bash
# Run the full suite once
pnpm test

# Re-run on change
pnpm test:watch
```

Ten suites under `tests/`, plus shared helpers in `tests/helpers/`. The three
that carry most of the weight:

- `tests/rendered-html.test.ts` — renders `src/pages/index.astro` in-process with
  Astro's Container API and asserts on the result: page title, meta description,
  canonical link, the JSON-LD block, and that every entry in
  `src/lib/constants.ts` (welcome lines, about bullets, career entries, links,
  goal figures, footer) reaches the page.
- `tests/constants.test.ts` — data invariants for `src/lib/constants.ts`: link
  URLs are absolute or root-relative, icon names come from an installed Iconify
  collection, the cycling figures are finite and within range, and the SEO title
  and description stay within useful lengths.
- `tests/build-output.test.ts` — asserts on what `pnpm build` actually emits into
  `dist/`: `robots.txt` pointing at the sitemap, the sitemap index, zero external
  JavaScript, no serverless function, and the public assets the page links to.

The rest are geometry and content gates — `page-fit`, `card-fill`,
`control-geometry`, `icon-alignment`, `mobile-hero-contrast`, `patch-wall` and
`projection`. Deliberately no exact count in prose: read it from `pnpm test`.

`pnpm test` runs `pnpm build` once as a global setup so the build-output suite
has real artifacts. Set `SKIP_BUILD=1` to reuse an existing `dist/` while
iterating.

## Deployment

### Deploy on Netlify

The site builds to a fully static `dist/` directory — no adapter, no serverless
function. `netlify.toml` is the single source of truth for the build: the command
is `pnpm check && pnpm test` — the suite runs `pnpm build` itself, so every
deploy is gated on typechecking and the assertions — and the publish directory is
`dist`. To deploy your own copy:

1. Fork this repository.
2. Link the forked repo to your Netlify account.

Alternatively, deploy directly with this button:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/calvindotsg/portfolio-v2)

## Contact

For any questions or feedback, feel free to [open an issue](https://github.com/calvindotsg/portfolio-v2/issues) in the repository.

## Support 💗

- This project is open-source. Feel free to fork it and customize it with your details as described in the **Configuration** section.
- If you like the project, don't forget to star ⭐ the repository.

## Acknowledgements

This portfolio is inspired by [Gianmarco's work](https://github.com/Ladvace) and deployed at [calvin.sg](https://calvin.sg).