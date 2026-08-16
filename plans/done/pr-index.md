# Pull request index — 153 PRs, May 2024 to August 2026

**Why this file exists.** `calvindotsg/portfolio-v2` left its upstream fork network on
2026-08-16. [Leaving a fork network](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/detaching-a-fork)
does not retain "issues, pull requests, wikis, stars, watchers, comments, or other
metadata" — only git commit metadata survives. Every `github.com/calvindotsg/portfolio-v2/pull/N`
URL therefore stopped resolving, and **42 citations of the form `PR #N`, referencing 33
distinct pull requests across eight files**, pointed at them. Five of those eight are live
source rather than archive: `uno.config.ts`, `src/pages/index.astro`,
`tests/build-output.test.ts`, `tests/docs-drift.test.ts` and `plans/README.md`.

This index resolves those citations. The archive files beside it carry the prose.

**What was preserved where.** The 148 squash commit messages (376,369 characters) were
already safe: they are git objects and detaching does not touch them. What existed only on
GitHub was 141 PR bodies (535,384 characters) and 45 substantive comments across 39 PRs.
Those are in the archive files. 103 Netlify deploy-preview bot comments were dropped —
they are a link and a status table, and the preview URLs died with the PRs.

A complete GitHub migration archive (`pull_requests`, `issues`, `issue_comments`,
599 `issue_events`, and a bare clone) was taken separately and is held offline. This
directory is the readable half.

**There were no code reviews to lose.** Across all 153 PRs: 0 inline review comments and
0 submitted reviews. Single maintainer, squash merges.

| PR | Title | Merged | Squash | Diff |
|---|---|---|---|---|
| #1 | [initial commit](pr-archive-2024-to-2026-06.md#pr-1) | 2024-05-24 | `106ffcabf` | +347/−14481 |
| #2 | [Update upstream fork](pr-archive-2024-to-2026-06.md#pr-2) | 2024-06-05 | `76ee425d9` | +4361/−3519 |
| #3 | [dependencies updated](pr-archive-2024-to-2026-06.md#pr-3) | — | closed unmerged | +223/−304 |
| #4 | [dependencies updated](pr-archive-2024-to-2026-06.md#pr-4) | 2024-06-11 | `6d97a230b` | +223/−304 |
| #5 | [Merge from upstream](pr-archive-2024-to-2026-06.md#pr-5) | 2024-08-22 | `3c5615d9b` | +1321/−1202 |
| #6 | [Ladvace master](pr-archive-2024-to-2026-06.md#pr-6) | 2024-08-22 | `d9a24fc15` | +14/−16 |
| #7 | [Add dark/light theme](pr-archive-2024-to-2026-06.md#pr-7) | 2024-08-24 | `87878c0d8` | +109/−28 |
| #8 | [Update cycling progress for 2025](pr-archive-2024-to-2026-06.md#pr-8) | 2025-01-02 | `5cd65167e` | +10/−4 |
| #9 | [Merge upstream fork](pr-archive-2024-to-2026-06.md#pr-9) | — | closed unmerged | +3256/−2375 |
| #10 | [Merge Updates from Upstream Repository to Sync with Astro v5](pr-archive-2024-to-2026-06.md#pr-10) | 2025-01-23 | `6a86af1ea` | +27/−20 |
| #11 | [Merge Updates from Upstream Repository to Sync with Astro v5](pr-archive-2024-to-2026-06.md#pr-11) | 2025-01-23 | `e04cd5a53` | +27/−20 |
| #12 | [Sync upstream](pr-archive-2024-to-2026-06.md#pr-12) | — | closed unmerged | +7/−2 |
| #13 | [Sync upstream](pr-archive-2024-to-2026-06.md#pr-13) | 2025-02-04 | `fa74a94a4` | +7/−2 |
| #14 | [Sync upstream](pr-archive-2024-to-2026-06.md#pr-14) | 2025-02-04 | `4cc9d48c0` | +0/−0 |
| #15 | [Add Umami to the tools list in README](pr-archive-2024-to-2026-06.md#pr-15) | 2025-02-04 | `3f4039cd4` | +1/−0 |
| #16 | [Sync upstream changes from Ladvace/astro-bento-portfolio](pr-archive-2024-to-2026-06.md#pr-16) | 2025-08-24 | `e9a010364` | +132/−34 |
| #17 | [Add claude GitHub actions 1756010557935](pr-archive-2024-to-2026-06.md#pr-17) | 2025-08-24 | `9b80300d8` | +142/−0 |
| #19 | [Fix resume link path to resolve 404 error](pr-archive-2024-to-2026-06.md#pr-19) | 2025-08-24 | `d4c356a89` | +1/−1 |
| #20 | [Delete public/Calvin_Loh_Technical-customer-support_Resume.pdf](pr-archive-2024-to-2026-06.md#pr-20) | 2025-08-24 | `cd45ef441` | +1/−1 |
| #21 | [Sync upstream: Astro 6 migration + npm to pnpm](pr-archive-2024-to-2026-06.md#pr-21) | 2026-03-23 | `3e3165734` | +12224/−33 |
| #22 | [Add llms.txt for AI discoverability](pr-archive-2024-to-2026-06.md#pr-22) | 2026-04-08 | `258357b49` | +14/−0 |
| #23 | [sync: merge upstream dep bumps + TS 6, ESLint 10, husky/lint-staged](pr-archive-2024-to-2026-06.md#pr-23) | 2026-04-08 | `7a1d9bf4b` | +3007/−3132 |
| #24 | [chore(mcp): drop unused sequential-thinking + context7 MCP servers](pr-archive-2024-to-2026-06.md#pr-24) | 2026-06-15 | `033f2ea76` | +1/−19 |
| #25 | [chore: prune dead template dependencies ahead of the Astro 7 sync](pr-archive-2026-07a.md#pr-25) | 2026-07-21 | `9481ae0ca` | +3/−1166 |
| #26 | [chore: sync upstream — Astro 6 → 7 major bump](pr-archive-2026-07a.md#pr-26) | 2026-07-21 | `4550e1f50` | +1376/−1252 |
| #27 | [perf: delete the client-side runtime — Svelte and motion out, CSS in](pr-archive-2026-07a.md#pr-27) | 2026-07-21 | `621dd5af6` | +183/−407 |
| #28 | [fix: correct five rendered-output defects, and assert every one](pr-archive-2026-07a.md#pr-28) | 2026-07-21 | `ef0da280a` | +142/−70 |
| #29 | [fix(image): serve the portrait at 2x density for high-DPI screens](pr-archive-2026-07a.md#pr-29) | 2026-07-21 | `b14287d36` | +172/−1 |
| #30 | [chore: delete dead configuration and template cruft](pr-archive-2026-07a.md#pr-30) | 2026-07-21 | `255dbca4c` | +11/−145 |
| #31 | [refactor(icons): render icons via UnoCSS presetIcons, drop astro-icon](pr-archive-2026-07a.md#pr-31) | 2026-07-21 | `ad7c5bf72` | +81/−362 |
| #32 | [docs: correct the documentation and shipped metadata](pr-archive-2026-07a.md#pr-32) | 2026-07-21 | `759ed8f51` | +123/−36 |
| #33 | [chore(plans): archive the completed run, leave a living index for the next one](pr-archive-2026-07a.md#pr-33) | 2026-07-21 | `c8fe10f35` | +409/−291 |
| #34 | [docs(plans): add run-2 plans 009–010 and update the living index](pr-archive-2026-07a.md#pr-34) | 2026-07-21 | `82cef9d42` | +536/−5 |
| #35 | [chore(deps): refresh the lockfile in-range, clearing 9 of 10 audit advisories](pr-archive-2026-07a.md#pr-35) | 2026-07-21 | `c00dd73b0` | +901/−883 |
| #36 | [fix(layout): default the theme for no-JS visitors, drop the dead og:image fallback, assert the social tags](pr-archive-2026-07a.md#pr-36) | 2026-07-21 | `1f06c2780` | +21/−3 |
| #37 | [chore(plans): archive run 2 — both plans live, index and evidence updated](pr-archive-2026-07a.md#pr-37) | 2026-07-21 | `662561774` | +97/−18 |
| #38 | [chore(content): refresh preview.jpg from a current screenshot](pr-archive-2026-07a.md#pr-38) | 2026-07-21 | `4f39e651f` | +8/−7 |
| #39 | [chore(content): recompose preview.jpg as a hero-card crop filling the OG canvas](pr-archive-2026-07a.md#pr-39) | 2026-07-21 | `18f5670e9` | +9/−7 |
| #40 | [chore(content): center the hero card in preview.jpg from a retaken screenshot](pr-archive-2026-07a.md#pr-40) | 2026-07-21 | `719a78ed7` | +10/−6 |
| #41 | [feat: add running goal card and generalize goal rendering](pr-archive-2026-07a.md#pr-41) | 2026-07-22 | `782622ef3` | +141/−44 |
| #42 | [fix: restore Now card content at desktop by repacking the spare row](pr-archive-2026-07a.md#pr-42) | 2026-07-22 | `4e1567420` | +7/−3 |
| #43 | [docs(plans): run-3 plans 011–014 (emoji→icons, UnoCSS cleanup, stagger fix, coverage)](pr-archive-2026-07a.md#pr-43) | 2026-07-22 | `3ddf269c1` | +1250/−13 |
| #44 | [refactor: migrate every emoji to a UnoCSS presetIcons icon (plan 011)](pr-archive-2026-07a.md#pr-44) | 2026-07-22 | `79502035b` | +96/−27 |
| #45 | [docs(plans): mark plan 011 DONE](pr-archive-2026-07a.md#pr-45) | 2026-07-22 | `9ed1c3a2a` | +1/−1 |
| #46 | [refactor: remove no-op UnoCSS classes left by the deleted tilt effect (plan 012)](pr-archive-2026-07a.md#pr-46) | 2026-07-22 | `6f0e24c4b` | +68/−16 |
| #47 | [docs(plans): mark plan 012 DONE](pr-archive-2026-07a.md#pr-47) | 2026-07-22 | `51514177a` | +1/−1 |
| #48 | [docs: add .devin/wiki.json to steer DeepWiki generation](pr-archive-2026-07a.md#pr-48) | 2026-07-22 | `5b73719a9` | +102/−0 |
| #49 | [fix: extend the entrance stagger to the 8th card and pin the ladder (plan 013)](pr-archive-2026-07a.md#pr-49) | 2026-07-22 | `8036d3c8a` | +16/−1 |
| #50 | [docs(plans): mark plan 013 DONE](pr-archive-2026-07a.md#pr-50) | 2026-07-22 | `cca04fe85` | +1/−1 |
| #51 | [test: assert Now and Career dates/company survive the render (plan 014)](pr-archive-2026-07a.md#pr-51) | 2026-07-22 | `b7439e762` | +11/−1 |
| #52 | [docs(plans): archive run-3 plans 011–014 with the evidence log](pr-archive-2026-07a.md#pr-52) | 2026-07-22 | `60e324464` | +119/−18 |
| #53 | [fix(ui): center the goal progress icon and keep it inside a narrow fill](pr-archive-2026-07a.md#pr-53) | 2026-07-22 | `32fb69a37` | +2/−2 |
| #54 | [feat: automate goal progress from Strava via a daily bot-committed JSON](pr-archive-2026-07a.md#pr-54) | 2026-07-22 | `a4b419b0c` | +810/−9 |
| #55 | [docs(plans): record 015 as DONE and close out DIRECT-01](pr-archive-2026-07a.md#pr-55) | 2026-07-22 | `1bb32f62b` | +28/−13 |
| #56 | [docs(plans): archive plan 015 with its evidence log](pr-archive-2026-07a.md#pr-56) | 2026-07-22 | `eec31289f` | +112/−6 |
| #57 | [fix(a11y): give the goal icon its own ink on the pink progress fill](pr-archive-2026-07a.md#pr-57) | 2026-07-24 | `73713dac3` | +120/−1 |
| #58 | [fix(a11y): make the mobile hero type readable over the portrait](pr-archive-2026-07a.md#pr-58) | 2026-07-24 | `72f4b1ef4` | +363/−5 |
| #59 | [fix(a11y): make the navigating controls anchors, not buttons in anchors](pr-archive-2026-07a.md#pr-59) | 2026-07-24 | `c2a3cf9db` | +143/−23 |
| #60 | [feat(design): give the progress bar its own ink and make the controls cast their plate](pr-archive-2026-07a.md#pr-60) | 2026-07-25 | `9266cdbaa` | +638/−89 |
| #61 | [fix(design): one control box, no clipped cards at md, one Strava name](pr-archive-2026-07a.md#pr-61) | 2026-07-26 | `779392e61` | +1335/−53 |
| #62 | [feat(design): one Strava link, brand-ink heart, a toggle that reports its state](pr-archive-2026-07a.md#pr-62) | 2026-07-26 | `a192a8994` | +726/−249 |
| #63 | [fix(cards): let a card take its content's height, not its grid area's](pr-archive-2026-07a.md#pr-63) | 2026-07-26 | `ebcf8efee` | +1576/−16 |
| #64 | [docs: correct two documents that assert false things about this repo](pr-archive-2026-07a.md#pr-64) | 2026-07-27 | `96c99975c` | +4/−4 |
| #65 | [fix(a11y): let the page grow with the reader's text instead of clipping it](pr-archive-2026-07a.md#pr-65) | 2026-07-27 | `73d3cf136` | +504/−80 |
| #66 | [fix(now): move the explainer into the card's corner, so Now inherits its heading](pr-archive-2026-07a.md#pr-66) | 2026-07-27 | `6321acfda` | +578/−32 |
| #67 | [fix(a11y): let the control ladder reach one column, so a narrow card stops shearing](pr-archive-2026-07a.md#pr-67) | 2026-07-27 | `8f71f0de2` | +566/−35 |
| #68 | [feat(controls): wrap the control row, deleting three hand-tuned column queries](pr-archive-2026-07a.md#pr-68) | 2026-07-27 | `add7b6c0d` | +848/−392 |
| #69 | [docs(controls): correct two figures measured before the portrait was pinned](pr-archive-2026-07a.md#pr-69) | 2026-07-27 | `293435949` | +16/−4 |
| #70 | [feat(goals): show the rate each goal still needs, and date the figures](pr-archive-2026-07a.md#pr-70) | 2026-07-27 | `deb2cff5a` | +852/−15 |
| #71 | [fix(goals): count the stamped day as a riding day](pr-archive-2026-07b.md#pr-71) | 2026-07-28 | `ada9d73cf` | +104/−28 |
| #72 | [test(css): read the CSS a page actually loads, not a guessed chunk filename](pr-archive-2026-07b.md#pr-72) | 2026-07-28 | `e4ae44f41` | +144/−32 |
| #73 | [feat(patches): a wall of race bibs, one prerendered page per sport](pr-archive-2026-07b.md#pr-73) | 2026-07-28 | `3496381cc` | +1984/−71 |
| #74 | [feat(patches): put the next race at the top of the wall](pr-archive-2026-07b.md#pr-74) | 2026-07-28 | `27aad9b03` | +122/−24 |
| #75 | [fix(patches): sweep the ten review leftovers from the patch wall](pr-archive-2026-07b.md#pr-75) | 2026-07-28 | `17c123226` | +335/−44 |
| #76 | [feat(goals): give each goal card its next race and a way to the wall](pr-archive-2026-07b.md#pr-76) | 2026-07-28 | `a8d94307e` | +622/−77 |
| #77 | [feat(patches): print where each race is, and drop the two Strava enrichments](pr-archive-2026-07b.md#pr-77) | 2026-07-28 | `4b800cf55` | +209/−30 |
| #78 | [feat(goals): rebuild the goal card body around the one number a visitor came for](pr-archive-2026-07b.md#pr-78) | 2026-07-28 | `dd7633da1` | +845/−434 |
| #79 | [feat(patches): say what a finished ride cost, and where to watch it](pr-archive-2026-07b.md#pr-79) | — | closed unmerged | +556/−27 |
| #80 | [feat(patches): say what a finished ride cost, and where to watch it](pr-archive-2026-07b.md#pr-80) | 2026-07-28 | `e96ea12e7` | +556/−27 |
| #81 | [fix(a11y): let the grid grow so text spacing stops deleting content](pr-archive-2026-07b.md#pr-81) | 2026-07-28 | `c1468478d` | +503/−96 |
| #82 | [docs: correct four measured claims and a mixed-scope figure](pr-archive-2026-07b.md#pr-82) | 2026-07-28 | `4c859eb2e` | +44/−17 |
| #83 | [feat(a11y): tell a screen reader when a link will open a new tab](pr-archive-2026-07b.md#pr-83) | 2026-07-28 | `54dc192ff` | +236/−16 |
| #84 | [docs(claude): cut what the repo already says, and name the commands it does not](pr-archive-2026-07b.md#pr-84) | 2026-07-28 | `c55d00495` | +14/−56 |
| #85 | [fix(a11y): draw every link so a reader can tell it is one](pr-archive-2026-07b.md#pr-85) | 2026-07-28 | `a858d078f` | +725/−103 |
| #86 | [docs(claude): correct three claims the repo contradicts](pr-archive-2026-07b.md#pr-86) | 2026-07-28 | `d1c7642d4` | +15/−8 |
| #87 | [feat(patches): keep every race on the wall, and name the earned bib](pr-archive-2026-07b.md#pr-87) | 2026-07-29 | `45e286f5a` | +515/−130 |
| #88 | [docs(plans): re-measure the README baseline at 45e286f for run 4](pr-archive-2026-07b.md#pr-88) | 2026-07-29 | `d5da2aaf7` | +30/−5 |
| #89 | [docs(plans): record the run-4 audit and add plans 016–017](pr-archive-2026-07b.md#pr-89) | 2026-07-29 | `9066d6ad4` | +518/−2 |
| #90 | [perf(html): stop shipping rationale comments in built pages](pr-archive-2026-07b.md#pr-90) | 2026-07-29 | `c3734b121` | +24/−18 |
| #91 | [docs(plans): mark 016 DONE](pr-archive-2026-07b.md#pr-91) | 2026-07-29 | `dbe7a7ed8` | +1/−1 |
| #92 | [chore(deps): refresh lockfile in-range, clearing one brace-expansion HIGH](pr-archive-2026-07b.md#pr-92) | 2026-07-29 | `6647c3149` | +227/−263 |
| #93 | [docs(plans): close out run 4 — archive 016–017 with evidence](pr-archive-2026-07b.md#pr-93) | 2026-07-29 | `338bb287d` | +89/−3 |
| #94 | [feat(goal): make the way out a labelled CTA, not a run of words](pr-archive-2026-07b.md#pr-94) | 2026-07-29 | `c61ee7e4b` | +870/−147 |
| #95 | [fix(mobile): make the CTA read as a button on a phone, and stop hover sticking on touch](pr-archive-2026-07b.md#pr-95) | 2026-07-29 | `6c5872e9f` | +547/−66 |
| #96 | [fix(mobile): acknowledge the tap, and stop making the reader wait for it](pr-archive-2026-07b.md#pr-96) | 2026-07-29 | `8b07d41e9` | +615/−12 |
| #97 | [fix(projection): give the site a clock, and let a race be recorded the day it is run](pr-archive-2026-07b.md#pr-97) | 2026-07-29 | `f2e662164` | +658/−48 |
| #98 | [feat(events): add the Garmin Run Virtual Challenge 10km](pr-archive-2026-07b.md#pr-98) | — | closed unmerged | +6/−4 |
| #99 | [feat(events): add the Garmin Run Virtual Challenge 10km](pr-archive-2026-07b.md#pr-99) | 2026-07-29 | `bd4396296` | +6/−4 |
| #100 | [chore(ci): pin the nightly job's action, and pin the Node it runs on](pr-archive-2026-07b.md#pr-100) | 2026-07-30 | `6bad51458` | +77/−1 |
| #101 | [feat(ci): build and test on GitHub Actions, and port the cache header to the artifact](pr-archive-2026-07b.md#pr-101) | 2026-07-30 | `af77b81af` | +305/−7 |
| #102 | [docs(config): say what UMAMI_ID is, and that it fails open](pr-archive-2026-07b.md#pr-102) | 2026-07-30 | `a6172eb20` | +23/−0 |
| #103 | [feat(ci): deploy to Cloudflare Pages, with the panel's findings fixed first](pr-archive-2026-07b.md#pr-103) | 2026-07-30 | `cf2df57c3` | +331/−5 |
| #104 | [refactor(config): a Strava client id is public, so make it a variable](pr-archive-2026-07b.md#pr-104) | 2026-07-30 | `895f3d24a` | +26/−4 |
| #105 | [feat(ci): let the nightly reach a deploy, and build every day not just every ride](pr-archive-2026-07b.md#pr-105) | 2026-07-30 | `c2ab11c59` | +64/−4 |
| #106 | [test(ci): execute the deploy guards instead of trusting a comment](pr-archive-2026-07b.md#pr-106) | 2026-07-30 | `15f7a3de3` | +452/−11 |
| #107 | [feat(404): answer an unknown URL with a race bib, not a soft 200](pr-archive-2026-07b.md#pr-107) | 2026-07-30 | `08ca25ac8` | +431/−11 |
| #108 | [feat(seo): derive robots.txt and llms.txt, and date the sitemap honestly](pr-archive-2026-07b.md#pr-108) | 2026-07-30 | `ee3f54e9d` | +587/−24 |
| #109 | [chore(ci): finish leaving Netlify, and re-source every claim that named it](pr-archive-2026-07b.md#pr-109) | 2026-07-30 | `69a4c70af` | +261/−188 |
| #110 | [docs(plans): correct the www finding — the cause is a Pages binding, not a missing rule](pr-archive-2026-07b.md#pr-110) | 2026-07-30 | `f7aeead45` | +23/−5 |
| #111 | [docs(plans): www now redirects — and record the two instruments that lied](pr-archive-2026-07b.md#pr-111) | 2026-07-30 | `5b6d8a7e8` | +26/−23 |
| #112 | [feat(dns): put the zone in git, and prove the exclusions cannot delete](pr-archive-2026-07b.md#pr-112) | 2026-07-31 | `6628dc728` | +1605/−14 |
| #113 | [fix(seo): serve one job title, everywhere, and a title that fits the result](pr-archive-2026-07b.md#pr-113) | 2026-07-31 | `52ce0525a` | +262/−14 |
| #114 | [docs(plans): point at the archived location of plan 019](pr-archive-2026-07b.md#pr-114) | 2026-07-31 | `4c8011804` | +3/−2 |
| #115 | [docs: gate the prose against the code, and make the wiki config evergreen](pr-archive-2026-07b.md#pr-115) | 2026-07-31 | `82fa75469` | +576/−42 |
| #116 | [feat(events): add the back catalogue, close the double count, and round km from the API](pr-archive-2026-08.md#pr-116) | 2026-08-02 | `3ea25e743` | +537/−142 |
| #117 | [feat(patches): let a bib tell the truth about a race recorded in parts](pr-archive-2026-08.md#pr-117) | 2026-08-02 | `bce04d95a` | +948/−108 |
| #118 | [fix(events): the Phuket escort is part 1 of the 10 July race, not a separate ride](pr-archive-2026-08.md#pr-118) | 2026-08-03 | `3d4b57d54` | +46/−24 |
| #119 | [feat(patches): give the wall a state for a race that was not finished](pr-archive-2026-08.md#pr-119) | 2026-08-03 | `0524635bb` | +1052/−111 |
| #120 | [feat(events): add OCBC Cycle Singapore 2023 to the wall](pr-archive-2026-08.md#pr-120) | 2026-08-03 | `c2ee0b9b3` | +8/−0 |
| #121 | [fix(events): round a recorded distance down, and store the metres it comes from](pr-archive-2026-08.md#pr-121) | 2026-08-03 | `05af62d77` | +671/−338 |
| #122 | [fix: what an eight-dimension audit panel found on calvin.sg and /patches](pr-archive-2026-08.md#pr-122) | 2026-08-03 | `ea6fa8fa2` | +1166/−78 |
| #123 | [fix(tests): guard the oracle that guards the deploy, and record what was measured](pr-archive-2026-08.md#pr-123) | 2026-08-03 | `894a3aa84` | +115/−1 |
| #124 | [fix(events): record OCBC Cycle Johor Bahru as a race that was not finished](pr-archive-2026-08.md#pr-124) | 2026-08-03 | `0bec32937` | +22/−10 |
| #125 | [feat(patches): put the organiser's result on the bib, beside the ride](pr-archive-2026-08.md#pr-125) | 2026-08-03 | `575d65a38` | +1758/−1009 |
| #126 | [fix(patches): keep the ledger's unit with its figure at narrow widths](pr-archive-2026-08.md#pr-126) | 2026-08-04 | `aec893bd0` | +203/−9 |
| #127 | [fix(patches): track the ledger's inline unit like the caption it replaces, and gate what it says](pr-archive-2026-08.md#pr-127) | 2026-08-04 | `5a2f65810` | +223/−13 |
| #128 | [feat(events): book the OCBC Cycle Johor Bahru 42 km for 11 October](pr-archive-2026-08.md#pr-128) | 2026-08-05 | `d3c62bcc6` | +66/−29 |
| #129 | [refactor: apply the ponytail audit and close its review panel](pr-archive-2026-08.md#pr-129) | 2026-08-07 | `8ce7565e0` | +997/−1142 |
| #130 | [feat(plans): treat a proposal as its own document class, and land plans 018-023](pr-archive-2026-08.md#pr-130) | 2026-08-07 | `232f75189` | +1351/−17 |
| #131 | [docs: stop CLAUDE.md counting a set that lives in plans/README.md](pr-archive-2026-08.md#pr-131) | 2026-08-07 | `f79e57fa4` | +9/−5 |
| #132 | [docs(plans): archive 018, and record the sign-off plan 021 was waiting on](pr-archive-2026-08.md#pr-132) | 2026-08-07 | `0ee97b494` | +91/−10 |
| #133 | [docs(projection): generate the derived figures instead of writing them by hand](pr-archive-2026-08.md#pr-133) | 2026-08-07 | `14d652e2f` | +793/−85 |
| #134 | [docs(plans): mark 019 done and archive it](pr-archive-2026-08.md#pr-134) | 2026-08-07 | `86f9a15b5` | +85/−3 |
| #135 | [refactor(events): make each race its own module](pr-archive-2026-08.md#pr-135) | 2026-08-07 | `46119aeb9` | +1267/−770 |
| #136 | [docs(plans): mark 020 done and archive it](pr-archive-2026-08.md#pr-136) | 2026-08-07 | `8b32a4ba2` | +83/−4 |
| #137 | [docs(plans): record the 020 criterion that reads false on correct code](pr-archive-2026-08.md#pr-137) | 2026-08-07 | `fd8b5cf8c` | +9/−0 |
| #138 | [refactor(content): split constants.ts by kind and delete it](pr-archive-2026-08.md#pr-138) | 2026-08-07 | `4bf156d51` | +1498/−1295 |
| #139 | [docs(plans): mark 021 done and archive it](pr-archive-2026-08.md#pr-139) | 2026-08-07 | `316b83700` | +118/−2 |
| #140 | [test(events): separate the data contract from behaviour, promote the Strava tooling](pr-archive-2026-08.md#pr-140) | 2026-08-08 | `a00c8195a` | +1982/−388 |
| #141 | [docs(plans): mark 022 done and archive it](pr-archive-2026-08.md#pr-141) | 2026-08-08 | `96ec8fa6f` | +136/−2 |
| #142 | [docs: retire the last references to constants.ts, and gate the bare filename](pr-archive-2026-08.md#pr-142) | 2026-08-08 | `5b9c79453` | +363/−108 |
| #143 | [docs(plans): mark 023 done, archive it, and close run 5](pr-archive-2026-08.md#pr-143) | 2026-08-08 | `219dcde17` | +110/−3 |
| #144 | [docs(plans): open run 6 with three plans from a re-audit of the record](pr-archive-2026-08.md#pr-144) | 2026-08-08 | `b58c0fdd7` | +1381/−8 |
| #145 | [chore(deps): refresh the lockfile in-range, clearing six high advisories](pr-archive-2026-08.md#pr-145) | 2026-08-08 | `c2558bef5` | +320/−613 |
| #146 | [test(docs): see a PascalCase filename, and name a foreign one as foreign](pr-archive-2026-08.md#pr-146) | 2026-08-08 | `557af8f86` | +105/−28 |
| #147 | [test(a11y): assert which system colour repaints each mark in forced colours](pr-archive-2026-08.md#pr-147) | 2026-08-08 | `4b9d5eae9` | +135/−1 |
| #148 | [docs(plans): mark 024-026 done, archive them, and close run 6](pr-archive-2026-08.md#pr-148) | 2026-08-08 | `fad42037a` | +197/−17 |
| #149 | [fix(content): correct both job titles, and retake the hero they had left stale](pr-archive-2026-08.md#pr-149) | 2026-08-08 | `a1c6605ad` | +30/−23 |
| #150 | [docs(readme): name the on-demand Strava refresh where the bot is described](pr-archive-2026-08.md#pr-150) | 2026-08-13 | `bea56a9b0` | +23/−0 |
| #151 | [docs: rewrite the README, and move the record beside the code](pr-archive-2026-08.md#pr-151) | 2026-08-13 | `81393303f` | +485/−405 |
| #152 | [fix(docs): close the drift holes the README rewrite opened](pr-archive-2026-08.md#pr-152) | 2026-08-14 | `20c53f8a6` | +249/−27 |
| #153 | [fix(content): say the résumé disagrees now, not that it once did](pr-archive-2026-08.md#pr-153) | 2026-08-14 | `80bd66589` | +12/−6 |
| #154 | [fix(content): publish the résumé that agrees with the site's job titles](pr-archive-2026-08.md#pr-154) | 2026-08-14 | `0eacf9bdb` | +9/−7 |
