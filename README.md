<!-- PROJECT LOGO -->
<br />
<p align="center">
  <h1 align="center">👋 Hi, I'm Calvin</h1>
</p>
<!-- PROJECT LOGO -->

[![GitHub commit activity (branch)](https://img.shields.io/github/commit-activity/w/calvindotsg/portfolio-v2/main)](https://github.com/calvindotsg/portfolio-v2/commits/main/)
[![GitHub license](https://img.shields.io/github/license/calvindotsg/portfolio-v2)](./LICENSE)
[![CI](https://github.com/calvindotsg/portfolio-v2/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/calvindotsg/portfolio-v2/actions/workflows/ci.yml)
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
- **Two accounts of a race, side by side.** Where an organiser has published a result,
  the bib carries a ledger: the official distance and time on one row, the recorded ride
  on the next, each source's figures kept together so nothing invites a reader to divide
  one source's distance into another's clock. A certified course and a GPS trace disagree
  by design; the bib publishes the disagreement rather than picking a winner. The
  results page is linked above the Strava activity, because it is the one a reader who
  is not logged in can actually open
- Fully responsive layout
- Dark/Light mode support
- Optimized for performance, accessibility, and SEO
- CI/CD on [GitHub Actions](https://github.com/calvindotsg/portfolio-v2/actions),
  deployed to [Cloudflare Pages](https://pages.cloudflare.com/)

## Tech Stack

- [Astro](https://astro.build)
- [UnoCSS](https://unocss.dev/)
- [Iconify](https://iconify.design/) (Font Awesome 6 Brands + Remix Icon sets)
- [Umami](https://umami.is/)
- [Vitest](https://vitest.dev/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [octoDNS](https://github.com/octodns/octodns) (the `calvin.sg` DNS zone, kept
  in `dns/` and applied by `.github/workflows/dns.yml`)

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
   content lives there: links, career, projects, about, both goals (cycling and
   running), the races in `EVENTS`, the next-race countdown, the patch wall's and
   the 404 page's copy, footer and SEO metadata.
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

Suites live under `tests/`, with shared helpers in `tests/helpers/`. The three
that carry most of the weight:

- `tests/rendered-html.test.ts` — renders `src/pages/index.astro` in-process with
  Astro's Container API and asserts on the result: page title, meta description,
  canonical link, the JSON-LD block, and that every entry in
  `src/lib/constants.ts` (welcome lines, about bullets, career entries and dates,
  links, goal figures, the Now card, footer) reaches the page.
- `tests/constants.test.ts` — data invariants for `src/lib/constants.ts`: link
  URLs are absolute or root-relative, icon names come from an installed Iconify
  collection, each goal's figures are finite and within range, and the SEO title
  and description stay within useful lengths — the description has to name every
  goal's target, which is the gate a 3000km-vs-5000km drift bought.
- `tests/build-output.test.ts` — asserts on what `pnpm build` actually emits into
  `dist/`: `robots.txt` pointing at the sitemap, the sitemap index, zero external
  JavaScript, no serverless function, and the public assets the page links to.
- `tests/data-contract.test.ts` — holds the one module per race under
  `src/data/races/` to the three things an array used to say for free. That every
  module is in the array: the collector globs its siblings, and a file the pattern
  misses is an absence rather than an error, invisible to every other assertion here.
  That each filename's date is the `date` inside it, so the name stays a convenience
  and never becomes a second, unchecked copy of the field the collector sorts on. And
  that `src/data/races/README.md` names every field the type declares and no field it
  does not — derived from `src/lib/race.ts` through the TypeScript checker rather than
  from the data, so an optional field no current race carries cannot drop out of the
  set. It also holds that README's two edit orders and its booked-race rule by
  canonical phrase, in the shape `docs-drift` holds `CLAUDE.md`'s shortcut count.

The rest are geometry and content gates — `page-fit`, `card-fill`,
`control-geometry`, `icon-alignment`, `mobile-hero-contrast`, `patch-wall`,
`projection`, `clock-split` and `llms-dnf-fixture` — plus `workflow-guards` and
`dns-config`, which read `.github/workflows/` rather than the site and execute
those workflows' `if:` guards in GitHub's own expression evaluator: the deploy
gate and the DNS apply gate respectively. Deliberately no counts in prose, of
suites or of assertions: read them from `pnpm test`.

One suite WRITES a document rather than only asserting against one:

- `tests/derived-figures.test.ts` — computes the projection's derived figures at the
  frozen reference in `tests/helpers/reference.ts` (the required rate, the rate that
  ignores races, the observed and de-raced paces, and a census of the days where
  rounding to nearest would under-state the requirement) and holds
  `src/lib/derived-figures.md` against them. Those figures used to be typed into a
  comment where nothing could check them, and every one of them except the ceiled required
  rate was wrong at once with the suite green; regenerate with `pnpm test -u`, spelled
  `pnpm test:update` in `package.json`, and read the diff. It also writes down what each
  figure MEANS, which is what a reader reverse-engineering one from a shipped value has
  no way to recover.

A suite that MOCKS A MODULE gets a file of its own, and `clock-split` and
`llms-dnf-fixture` are why that rule is written down rather than assumed. Both
forge a fact the live data does not currently hold — a bot stamp lagging the build
day, and a race abandoned before anything was recorded — because in each case the
gates around it could only discriminate on data the calendar happens not to
contain, so they were passing without proving anything. `vi.mock` is file-scoped,
and one that leaked into a suite comparing against `dist/` would redden it on
correct code.

One suite is OPT-IN and reaches the network, which is why it is listed apart:

- `tests/strava-verify.test.ts` — holds every Strava activity named in `EVENTS` against
  that activity, over the API: its distance, its elapsed time, and that it was recorded on
  the race's own day. A race recorded in parts names several, so it also holds the RACE's
  own two figures — its distance against the summed metres, and its elapsed time against
  the span from the first recording's start to the last one's stop, which is not any single
  activity's figure and cannot be checked anywhere else. It skips unless `STRAVA_VERIFY=1`, and needs
  `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` and `STRAVA_REFRESH_TOKEN` in the environment —
  the same names `scripts/fetch-strava-progress.mjs` reads. Deliberately not part of the
  default run: `pnpm test` gates both deploys, so a rate limit or an expired token would read
  as a broken site. It is the ONLY thing that can catch a mistyped `metres`, which no offline
  test can see: a row stores the API's own figure and the kilometres a reader sees for the ride
  are computed from it by `raceKm`, so the conversion is unit-tested offline and the stored
  input is what needs a witness. It also catches the older failure, a figure read off a
  screenshot before the activity was edited. The token needs `activity:read_all`; a detailed read answers 404,
  not 403, when the scope is missing, so an under-scoped token looks exactly like a wrong id.

  **It is not the only hand-typed figure on a bib any more, and the others have no witness at
  all.** A ledger prints the ORGANISER's account beside the rider's, and that side is
  transcribed from a results sheet by hand: `advertised_km` goes to the page unconverted, and
  `net_time` and `gun_time` with it. Nothing can check them — there is no API behind a timing
  provider's page, and this suite deliberately does not compare a recorded race against its
  advertised route, because for the ride the activity is the authority. What guards them is
  shape and sense rather than truth (`H:MM:SS`, a gun time no shorter than its own net time, a
  race that is actually over), so a transposed digit off the sheet ships. That is an accepted
  hole, named here so it is not rediscovered as a surprise.

One suite has the repository itself as its subject rather than the site:

- `tests/docs-drift.test.ts` — asserts this README, `CLAUDE.md`, `.devin/wiki.json`
  and the comments under `src/` against the code they describe. Nothing else here
  can: a comment naming a deleted file, a README naming a renamed script, or a wiki
  counting two of something there are now three of all build, lint, type-check and
  deploy green.

  It treats three kinds of document differently, which is the whole design. A
  **current-state document** — this README, `CLAUDE.md`, the baseline table in
  `plans/README.md`, every comment under `src/` — describes the repository as it is
  today, so it may state facts and is gated for **accuracy**: paths, `pnpm` scripts
  and configured names in backticks must exist, this section must name every suite,
  and `CLAUDE.md` must name every UnoCSS shortcut and how many there are.

  A **standing-instruction document** is read on every future run against a codebase
  that has moved, and nothing prompts anyone to revisit it. `.devin/wiki.json` is the
  one here — it configures the generated [DeepWiki](https://deepwiki.com/calvindotsg/portfolio-v2).
  A fact written there is a fact nobody will check again, so it is gated for
  **durability** instead: it may state no count, no component filename and no exported
  constant, and every page it specifies has to say where the generator should read
  those things at generation time. What it carries instead is what a generator cannot
  derive — the audience, the traps that make a careful reading come out wrong anyway,
  and where the non-derivable knowledge is written down.

  A **proposal** describes a repository that does not exist yet. A numbered plan under
  `plans/` is the one here, and it needs neither gate: naming the files it intends to
  create is its entire subject, so it is exempt from the three checks that hold a name
  against the tree that exists, and gated for everything else. `plans/README.md` is the
  living index rather than a proposal and is held to the same standard as this file.

  Measurement and rationale are deliberately left alone in all three. `plans/done/` is
  exempt entirely: it is an archive, and a plan that stopped naming what it deleted
  would stop being a record of the deletion.

  This is why the suite list above has to stay complete — that enumeration is one of
  the things the suite checks, so a new suite is red until this section mentions it.

`pnpm test` runs `pnpm build` once as a global setup so the build-output suite
has real artifacts. Set `SKIP_BUILD=1` to reuse an existing `dist/` while
iterating.

## Deployment

The site builds to a fully static `dist/` directory — no adapter, no serverless
function — and `.github/workflows/ci.yml` is the only thing that builds it.

One `build` job runs `pnpm check`, `pnpm eslint` and `pnpm test` (the suite runs
`pnpm build` itself), then uploads that `dist/` as an artifact. Two deploy jobs
download **that same artifact** and publish it to Cloudflare Pages with
`wrangler pages deploy` — a preview per pull request, production on a push to
`main`. Neither rebuilds, so what ships is what the suite asserted against, and
both sit behind `needs: build`, so a red run of any of the three commands blocks
the deploy. That edge is the whole of the gate; `tests/workflow-guards.test.ts`
is what stops a refactor dropping it quietly.

DNS is in git as well, and separately: `dns/zones/calvin.sg.yaml` is the
`calvin.sg` zone, and `.github/workflows/dns.yml` plans it against Cloudflare on
every pull request touching `dns/` and again weekly, so drift shows up as a red
check rather than a surprise. Applying is a manual dispatch from `main` that has
to quote the checksum its own plan printed, and the plan and apply jobs hold
different Cloudflare tokens — read and edit — so nothing scheduled, and nothing
running on a pull request, can change a record. Details in
[`dns/README.md`](dns/README.md).

To deploy your own copy:

1. Fork this repository.
2. Create a Cloudflare Pages project and point `PAGES_PROJECT` in `ci.yml` at it.
3. Add the `CLOUDFLARE_API_TOKEN` secret (scoped `Cloudflare Pages: Edit`) to a
   `production` and a `preview` [environment], and the `CLOUDFLARE_ACCOUNT_ID`
   and `UMAMI_ID` repository variables. The account id is a variable rather than
   a secret on purpose — it appears in every dashboard URL, so masking it would
   redact that substring from unrelated log lines while protecting nothing.

[environment]: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments

## Contact

For any questions or feedback, feel free to [open an issue](https://github.com/calvindotsg/portfolio-v2/issues) in the repository.

## Support 💗

- This project is open-source. Feel free to fork it and customize it with your details as described in the **Configuration** section.
- If you like the project, don't forget to star ⭐ the repository.

## Acknowledgements

This portfolio is inspired by [Gianmarco's work](https://github.com/Ladvace) and deployed at [calvin.sg](https://calvin.sg).