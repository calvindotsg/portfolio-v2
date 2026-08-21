# calvin.sg

[![calvin.sg live](https://img.shields.io/website?url=https%3A%2F%2Fcalvin.sg&label=calvin.sg&up_message=live&down_message=down)](https://calvin.sg)
[![Build status](https://img.shields.io/github/actions/workflow/status/calvindotsg/portfolio-v2/ci.yml?branch=main&label=build)](https://github.com/calvindotsg/portfolio-v2/actions/workflows/ci.yml)
[![Last commit](https://img.shields.io/github/last-commit/calvindotsg/portfolio-v2/main?label=last%20commit)](https://github.com/calvindotsg/portfolio-v2/commits/main/)
[![License](https://img.shields.io/github/license/calvindotsg/portfolio-v2)](./LICENSE)

Hi, I am Calvin. Business Systems Analyst by day, road cyclist before sunrise. This is my
[landing page](https://calvin.sg): who I am, what I am working on now, and a live tracker for
this year's cycling and running goals.

[![The calvin.sg home page](public/preview.jpg)](https://calvin.sg)

## Overview

| Page | What is on it |
| --- | --- |
| [`/`](https://calvin.sg) | A bento grid: an introduction, my career, a few interests, what I am doing now, and a card per goal showing how far along it is, the weekly rate it still asks for, and the countdown to my next race |
| [`/patches`](https://calvin.sg/patches) | Every race I have entered, in any year, drawn as a race bib. A finished race carries a patch; an outline is one still booked, or one I started and did not finish. A prerendered page per sport |

Dark and light themes, applied before first paint. Sized in text-relative units, so the layout
grows with the reader's font size instead of clipping it. No client-side UI framework and no
JavaScript bundle; animation is CSS only. And the distances are not typed in — a scheduled job
reads them from Strava overnight and commits whatever changed.

## Background

I wanted one link to hand people who ask what I do, and I wanted it to still be true on the day
they open it rather than the day I last edited it. The goal tracker came out of the same
impulse: if the kilometres sit on a public page that updates itself while I sleep, a skipped
week is something I have to look at. The rest of the site is that idea applied to work — what I
do, what I am building now, and where to find me.

## Tech stack

[Astro](https://astro.build), building to static output with no adapter and no serverless
function; [UnoCSS](https://unocss.dev/) for atomic CSS, configured in `uno.config.ts`;
[Iconify](https://iconify.design/) for icons; [Vitest](https://vitest.dev/) as the change gate;
[Umami](https://umami.is/) for analytics; [Cloudflare Pages](https://pages.cloudflare.com/) for
hosting; and [octoDNS](https://github.com/octodns/octodns) for the `calvin.sg` zone under `dns/`.

## Getting started

Node and pnpm are both pinned — Node in `.nvmrc`, pnpm in `package.json` under `packageManager`.

```sh
git clone https://github.com/calvindotsg/portfolio-v2
cd portfolio-v2
pnpm install
pnpm dev
```

Use pnpm rather than npm: the lockfile is `pnpm-lock.yaml`, and `npm install` would ignore it.
Analytics is optional locally — copy `.env.example` to `.env` if you want the tracking id to
render; without it the page works and simply records nothing.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on http://localhost:4321 |
| `pnpm build` | Static build into `dist/` |
| `pnpm preview` | Serves the built `dist/` |
| `pnpm check` | Type-checks the project |
| `pnpm eslint` | Lints the components and the scripts |
| `pnpm test` | Builds, then runs the test suite |

## Configuration

A configurable value lives either in a GitHub repository secret or variable, or in the
repository's own content under `src/content/` and `src/data/`. Scripts and workflows hold none
of their own.

| Where | What you edit there |
| --- | --- |
| `src/content/home.ts` | The home page's cards — the introduction, career, interests, and what I am doing now |
| `src/content/site.ts` | Copy every page wears: social links, footer, the 404 page, SEO metadata, and the security contact `/.well-known/security.txt` publishes |
| `src/content/races.ts` | The racing copy and the next-race line |
| `src/data/goals.ts` | The year's targets and `GOAL_YEAR` |
| `src/data/races/` | One module per race. The procedure, and every field a race may carry, are in [`src/data/races/README.md`](src/data/races/README.md) — read that rather than this |
| `astro.config.mjs` | `site`, the origin the sitemap and the canonical URLs are built from. `METADATA.site_url` in `src/content/site.ts` carries the same origin for the structured data, so change both |

**Goal progress.** The current figures are bot-owned: `.github/workflows/strava-progress.yml`
fetches them from Strava overnight, writes `src/data/strava-progress.json`, and dispatches a
deploy. To bump a figure by hand, edit that JSON rather than the goal — `total_goal` stays in
`src/data/goals.ts`. The credentials that workflow needs, and where they are kept, are in
[scripts/README.md](scripts/README.md).

The athlete id has two homes doing two different jobs: `STRAVA_ATHLETE_ID` decides whose
kilometres are fetched, and `STRAVA_PROFILE_URL` in `src/content/site.ts` decides where the
site's Strava link points. Changing accounts means editing both.

**Analytics.** `UMAMI_ID` is a repository variable, read at build time by
`src/layouts/BasicLayout.astro`.

**Security contact.** `SECURITY` in `src/content/site.ts` is what
`/.well-known/security.txt` publishes, and its `expires` field is a live commitment rather
than decoration: `tests/build-output.test.ts` fails the suite — and so the deploy — thirty
days before that date. When it does, confirm the address still reaches a monitored inbox
*before* moving the date, not after.

## Testing

```sh
pnpm test        # builds first, then asserts against the real output
pnpm test:watch
```

`pnpm check` and `pnpm eslint` run alongside it in CI, and each of them gates the deploy.

The suite asserts the built site rather than the source: that pages stay legible when a reader
enlarges their text, that every link is perceivable as one, that the content matches the types
describing it, that the workflows keep the ordering the deploy depends on, and that this
documentation still says what the code does. Suites live under `tests/`; the conventions for
adding one are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Deployment

The site builds to a static `dist/` directory, and `.github/workflows/ci.yml` is the only thing
that builds it. Its build job runs the checks above and uploads `dist/`; the deploy jobs
download that same artifact and hand it to wrangler. A pull request opened from this repository
gets a preview deploy, and a push to `main` — or a manual dispatch from it, which is the path
the overnight Strava run uses — goes to production.

The `calvin.sg` zone is in git under `dns/`, planned by `.github/workflows/dns.yml` on every
pull request that touches it and again weekly, so drift between the repository and the live
zone shows up as a red check. What it manages and how it is applied are in
[`dns/README.md`](dns/README.md); a fork inherits the directory, so repoint `dns/zones/` at
your own zone or leave it unused.

To deploy your own copy:

1. Fork the repository, then set your own origin in `astro.config.mjs` and `src/content/site.ts`.
2. Create a Cloudflare Pages project whose production branch is `main`, and point
   `PAGES_PROJECT` in `.github/workflows/ci.yml` at it.
3. Add `CLOUDFLARE_API_TOKEN` as an environment secret in a `production` and a `preview`
   [environment][env], and add the `CLOUDFLARE_ACCOUNT_ID` and `UMAMI_ID` repository variables.
4. For the goal cards to move, add the Strava variables and secrets named in
   [scripts/README.md](scripts/README.md).

[env]: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments

## Contributing

Issues and pull requests are welcome. How a change gets landed here — the gates it has to pass,
the branch and commit conventions, and what merging to `main` means — is in
[CONTRIBUTING.md](CONTRIBUTING.md). For a generated tour of the codebase, there is
[DeepWiki](https://deepwiki.com/calvindotsg/portfolio-v2).

## Contact

Calvin Loh — [calvin.sg](https://calvin.sg) ·
[LinkedIn](https://www.linkedin.com/in/calvin-loh/) ·
[résumé](https://calvin.sg/resume.pdf) · hello[at]calvin.sg ·
[open an issue](https://github.com/calvindotsg/portfolio-v2/issues)

## Acknowledgements

This started as a fork of [Gianmarco Cavallo's](https://github.com/Ladvace) bento portfolio
template and has diverged a long way since. Fork it and make it yours; a star is welcome.

## License

MIT — see [`LICENSE`](./LICENSE), whose copyright covers the upstream authors as well as me.
