# Pull request archive — 28–31 July 2026

45 pull requests. Bodies and comments as they stood on 2026-08-16, the day `portfolio-v2` left its fork network and the originals stopped resolving. Index and rationale: [`pr-index.md`](pr-index.md).

Netlify deploy-preview bot comments are omitted. Nothing else is edited: bodies and comments are verbatim, including their own broken cross-references.

---

<a id="pr-71"></a>

## #71 — fix(goals): count the stamped day as a riding day

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `ada9d73cf` · `fix-inclusive-day-count` → `main` · +104/−28 across 2 files

`bookedAhead` counts an event starting on the stamp date as wholly ahead;
`daysRemaining` excluded that date. Exactly one of them was wrong.

The bot settles it. `updated_at` is written by a cron firing at 05:13
Singapore time, so it names a day whose riding is entirely ahead of anyone
reading the page. The stamped day counts, and `daysRemaining` was one short —
dividing the deficit by one day too few and over-stating the rate the card
asks for.

## This changes no rendered byte today

Calvin decided this against the 27 July stamp, where the card read 71 and
should have read 70. The bot has since stamped 28 July, and at that date the
buggy exclusive count (156 days) and the correct inclusive count (157) both
ceil to **71 km/wk** for cycling and **17** for running.

Verified rather than argued: built `origin/main` and this branch and diffed
the output — **byte-identical**. So this lands as a semantics and test change.
The bug is real and will surface on some future date; it just is not visible
on this one.

## The knock-on, accepted

31 December returns 1 day rather than 0, so the last day of the year reads as
`final` ("N km to go") instead of `closed` (renders nothing). It is a real
riding day. `closed` now begins on 1 January.

## Tests

Three assertions updated, four added, all mutation-verified:

| Mutation | Result |
|---|---|
| revert `daysRemaining` to exclusive | 4 failed |
| off-by-two (over-correct) | 4 failed |
| `bookedAhead` exclusive **and** pro-rata shifted | 2 failed |
| drop an event on its own start date | 1 failed |
| `round` instead of `ceil` for the rate | 2 failed |
| `FINAL_STRETCH_DAYS` 14 → 13, and → 15 | 1 failed each |
| `days <= 0` → `days < 0` | 1 failed |
| `bookedAhead` `today <= start` → `today < start` | **survives — equivalent** |

The survivor is genuinely equivalent, not a hole: when `today === start` the
pro-rata path computes `e.km * (totalDays - 0) / totalDays`, which is `e.km`
exactly, so the `<=` guard is only a shortcut.

Two assertions were strengthened as a result of that round. The pairing test
originally used an inequality, which a version that books an event on the
wrong side of its own start date satisfies so long as it does so consistently;
it now pins values. And both sides of the `final`/`rate` boundary are pinned,
since the day count that decides it is what this PR moves.

## Bot-push simulation

Six plausible future pushes, fixtures generated through the producer's own
`serialise()` rather than hand-written, each verified to have actually landed
on disk before running:

| Pushed | Suite | Cards (running \| cycling) |
|---|---|---|
| 2320.4 / 165.3 @ 05 Aug | 176 pass | 18 km/wk · 78 km/wk |
| 2500 / 200 @ 01 Sep | 176 pass | 20 km/wk · 85 km/wk |
| 3800.7 / 350.2 @ 20 Nov | 176 pass | 35 km/wk · 200 km/wk |
| 5100 / 400 @ 10 Dec | 176 pass | 64 km/wk · Goal met |
| 4900.5 / 600 @ 30 Dec | 176 pass | Goal met · 100 km to go |
| 5000 / 601.4 @ 31 Dec | 176 pass | Goal met · Goal met |
| 12 / 3 @ 02 Jan 2027 | **1 fails** | — |

The last one is the designed tripwire: `stampYearMatchesGoalYear` blocks the
deploy until `GOAL_YEAR` is bumped, rather than letting the page divide a
fresh year's kilometres by last year's target.

Two false starts worth recording, both caught before they became conclusions:
hand-writing `2320.0` into the JSON failed a byte-stability test that the real
bot cannot fail (`JSON.stringify` emits `2320`), and a sim script placed in
`/tmp` silently resolved its import against `/tmp` and never ran at all — every
run in that round was a false green against an unmodified file.

## Drive-by corrections to stale figures

Found while re-deriving; each is measured from the real code, not recomputed
by hand, and anchored to the stamp it describes so it stops drifting:

- The no-races comparison read "121 km/wk to 71" — 121 was the un-ceiled value
  where the card ceils. It is 122.
- The `ceil` rationale's worked example was true only at one day count. It now
  names its date, and adds the measured frequency: round under-states on **154
  of the 288** remaining sport-days that reach that branch.
- A test comment claimed both goals return `closed` on 31 December. Under this
  change that day is `final`; the comment now says 1 January.
- The bot-coupling warning cited a hypothetical failure. It fired for real six
  hours after #70 merged (running 152.7 → 158.6 moved the rate 18 → 17 against
  a pinned `18`), so it now records that, and the honest expectancy: one bot
  cycle, not whatever change size the arithmetic makes look distant.

## Verification

`pnpm check` 0 errors · `pnpm test` 176/176 · `pnpm eslint` clean

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-72"></a>

## #72 — test(css): read the CSS a page actually loads, not a guessed chunk filename

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `e4ae44f41` · `fix-css-chunk-helper` → `main` · +144/−32 across 7 files

Prerequisite for `/patches`. No source change — the site build is untouched.

## The problem

Fifteen call sites found their stylesheet with

```js
readdirSync("dist/_astro").find((f) => f.endsWith(".css"))
```

That is wrong in two independent ways once this site has a second route.

**It takes the first match of an unordered directory listing.** Vite splits CSS
per entry, so with several chunks the one `find` returns is arbitrary and every
rule in the others is invisible. A test that cannot see a rule reports the rule
does not exist — which for a guard shaped "no rule anywhere may do X" is a
silent pass, not a failure.

**It never sees an inlined block, and that is the one that actually fires.**
Astro's default `inlineStylesheets: "auto"` moves a small sheet into the page.
Adding one four-line route rebalanced the split and pushed **2,889 bytes** — the
whole layout `<style>`, `body`, and every theme custom property on
`:root[data-theme]` — inline, where no call site was looking.

Reproduced here rather than taken on trust: **16 of 176 tests red across four
files**, with nothing wrong with the site. Two of them were contrast assertions
that could no longer resolve `--text`.

Worth noting the handover described this as CSS *re-chunking*. Measured, the
build still emits exactly one external chunk — the failure is entirely the
inline split. Same fix, different mechanism.

## The fix

`pageCss(page = "dist/index.html")` reads the page's own head and returns every
byte of CSS it loads, links and inline blocks interleaved in document order, so
later-wins reasoning over the result stays sound.

It is **per-page on purpose**. Concatenating every route's CSS would let a rule
only `/patches` loads satisfy an assertion about the home page.

It throws rather than degrading on a non-root-relative href or a page with no
CSS at all — both would otherwise hand a caller a partial sheet as if it were
the whole one, in the same silently-green direction as the bug being fixed.

## Verification

Calibrated in both directions, because a helper that widens what tests can see
could just as easily stop them seeing anything:

| | Tests |
|---|---|
| one route, before | 176 pass |
| **two routes, before** | **16 fail** |
| one route, after | 178 pass |
| **two routes, after** | **178 pass** |
| dark `--text` → a failing value *(inline-only region)* | 1 fails |
| dark `--text` deleted *(inline-only region)* | 1 fails |
| `control` shortcut plate 2px → 3px *(external chunk)* | 4 fail |
| old idiom reintroduced in one file | 1 fails |

The two inline-region mutations are the load-bearing ones: those tokens live
only in the block the old idiom could not read, so they confirm the helper
widened coverage rather than merely rearranging it.

## Two new tests

`hands callers every byte of CSS the page loads` keeps `pageCss()` honest, so a
future rebalance stays invisible to its callers. Its blind spot is stated in
the test rather than implied: today's single-route build has no inline block,
so that loop is vacuous — it exists for the build where that stops being true.

`routes every CSS read in the suite through pageCss()` fails if the old idiom
returns. The two `readdirSync` survivors in `build-output.test.ts` are
deliberate and excluded by shape: they count emitted files as an output-hygiene
check and never read a rule out of one.

## One thing left coupled, deliberately

`emits exactly one stylesheet` still asserts a file count, and a real `/patches`
route may or may not keep that true. It passed against the probe route, so I
have left it alone rather than pre-emptively loosening an assertion that is
currently correct.

## Checks

`pnpm check` 0 errors · `pnpm test` 178/178 · `pnpm eslint` clean

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-73"></a>

## #73 — feat(patches): a wall of race bibs, one prerendered page per sport

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `3496381cc` · `feat-patches-route` → `main` · +1984/−71 across 13 files

Adds `/patches`, `/patches/cycling` and `/patches/running` — every race in `EVENTS`
drawn as a race bib, solid once earned and an outline while it is still ahead.

Direction D1 "Bib" in treatment **C · Outline**, which you picked on 28 July.

**Renders, both themes, narrow, filtered, and every measurement:**
https://claude.ai/code/artifact/7a0ea23f-492f-42d7-90da-054240a5f6ea

## Three pages, not one page with a filter

The site ships no client JavaScript and a per-sport view has to be **linkable** — the
whole point is that a goal card can send a reader straight to it in PR 4. Three
prerendered URLs give both for free. The two alternatives each lose one:

| | zero JS | linkable | markup matches the page |
|---|---|---|---|
| radio inputs + `:has()` | yes | **no** | yes |
| `#cycling` + `:target` | yes | yes | **no** — every bib is still in the HTML |
| three routes | yes | yes | yes |

One rest-parameter file, `src/pages/patches/[...sport].astro`, prerenders all three:
the rest parameter matches zero segments, so `/patches` is one of the three rather
than a fourth file repeating it.

**This retires an expired premise.** `constants.ts` argued at length that a goal card
carries no CTA because there is no public per-sport URL and a logged-out visitor
meets a login wall. The first half stops being true here — this site now serves its
own per-sport page — so that prose is rewritten rather than silently contradicted.
What is still open, and now stated as the actual open question, is whether a goal
card should spend a control on it at all.

## Completion is derived, never stored

`EVENTS` has no `done` flag and must not gain one — a stored flag rots in the one
direction nobody notices, a race that has been run rendering as still-to-come
indefinitely with the build green.

`patchState()` reuses `bookedAhead()`'s "wholly done" comparison, so the wall and the
goal cards cannot disagree about the same day. **Asserted across all 366 days of
2026** rather than at today's stamp, because the disagreement these two could develop
lives at the boundaries: the start day, the days inside a nine-day tour, the end day.
A tour in progress is `booked` — you earn the bib at the finish line.

## Two contrast defects found while measuring

Both were carried in from the design rig, and neither is findable by reading the
stylesheet.

**The sport mark inherited an ancestor `opacity`.** The date row was dimmed as a unit
and the mark lives in it, so the mark that resolves to `#F3A3AA` rendered as
`rgb(196,132,138)` — 9.96:1 authored, **6.57:1 rendered**, on a bib where nothing was
meant to be dimmed. The dimming is now scoped to the date and the tag, which are
siblings of the mark.

**The vertical "KM" shipped at `opacity: .55`.** That composites to **4.29:1** on a
booked bib in light and **4.11:1** on a finished one in dark, against the 4.5:1 a
10px word needs. Now `.7`, at 7.28 and 6.92. I found this by writing the assertion
first and watching it go red.

So the suite now composites *every* dimmed line on a bib against the face behind it,
and separately forbids any translucent ancestor over the sport mark — the guard that
a ratio test structurally cannot be.

## The sport palette inverts, and the tokens say so

A finished bib's mark sits on an inverted face; a booked bib's sits on the card. Same
sport, same theme, opposite value. Four new tokens name the surface each was chosen
against, following `--on-brand`'s existing convention:

```css
--sport-ride: #A82334;         /* on the card */
--sport-ride-on-ink: #F3A3AA;  /* on the inverted bib face */
```

The dark block is the light block with each pair swapped and nothing else. Getting
this backwards is how `--brand-ink` once reached 2.77:1 with every structural
assertion green, so the test resolves the colour through the element's own classes
(`.bib-sport` → `--sport` → `--sport-on-ink` → `--sport-ride-on-ink` → the hex)
rather than looking a token up by name.

### All four combinations, two independent instruments

| sport mark vs its ground | light | dark |
|---|---|---|
| booked · ride (on card) | 6.52 | 9.08 |
| booked · run (on card) | 7.33 | 9.62 |
| finished · ride (on ink) | 9.96 | 6.81 |
| finished · run (on ink) | 10.57 | 7.66 |

Floor is **4.5:1**, not 3:1 — the mark is an icon *and* the word RIDE or RUN.
Every figure agrees to 2dp between the stylesheet resolution and a composited-pixel
sample of the rendered page, which is what says nothing is compositing.

There is no finished *running* bib on today's page — the first run of the year has
not happened — so that fourth combination was measured by removing `bib--booked` from
a running bib in the DOM, i.e. the state the page will render on 28 September.

## The three traps in the handover

1. **The icon safelist does not know about `EVENTS`.** Solved by *not* adding a
   second lookup: `goalForSport()` reaches a sport's icon through the goal that owns
   it, which the safelist already reads. A map beside `EVENTS` would ship classes
   UnoCSS never generated a rule for — a mask box at zero size, correct markup, green
   build. Mutation-tested: swapping in a private map turns two tests red.
2. **`card-fill.test.ts` selects `main [data-card]`.** Deliberately *not* widened.
   Its invariants are about the lg bento grid, which `/patches` does not have. The one
   rule in it that is universal — no absolute height inside a clipping card — is
   restated in the new file instead.
3. **"emits exactly one stylesheet" asserts a file count.** It survived: still one
   chunk, renamed `index.*.css` → `projection.*.css`. What actually changed is that
   `inlineStylesheets: "auto"` now inlines a block into *every* page where there was
   none before, which is exactly what #72 was built for. The blind spot that test
   documented ("the inline loop below is vacuous") is now live on all four pages.

## Seven build-wide gates now walk every page

> **Correction (#75):** this section originally said *four*, and the list under it named
> *six*. Counted properly: **seven** pre-existing gates were widened from
> `dist/index.html` to every built page, one gate is new (the sitemap census), and one
> more walk is the CSS helper's own contract test — nine tests in all.

These ask about the **output**, and one shared CSS chunk means a class worn only by
`/patches` is present in the home page's stylesheet and absent from its markup. The
orphan gate called four live classes dead on the first build. Widened: the orphan
gate, its anti-rot pair, the emoji check, the stagger ladder, the hover-affordance
check, the class-has-a-rule check, and the social-preview check — the last of these is
the one the original list left out, and it is the one that caught `og:url` advertising
the home page from all three `/patches` routes.

`pageCss()` stays **per-page** — "what does the cascade do on this page" is the
opposite question and a union would answer it wrong. `tests/helpers/pages.ts` records
the distinction.

## Verification

- **225 tests green** (was 178). `pnpm check` 0 errors, `pnpm eslint` clean.
- **12 mutations, 12 killed.** Swapping the palette, giving the wall its own icon map,
  dropping the BOOKED word, sorting oldest-first, `>=` instead of `>` in `patchState`,
  fixture-order ties, a hard-coded census, one shared title, a px font-size, and two
  ancestor-opacity variants that no ratio assertion could see.
- **Geometry: 144 configurations** (3 routes × 8 widths 320–2560 × 6 root sizes
  16–40px). Zero ink and zero boxes past any clip edge, right and bottom named
  separately; zero horizontal document overflow; zero content above the scroll origin
  at six short viewports. The probe is calibrated both ways — clean on the real page,
  205.91 and 2178.00 on injected text and box defects.
- **The home page is untouched: 56 configurations compared rect-for-rect and
  colour-for-colour against a build of `e4ae44f`, 0 differences.** The theme block is
  shared, so this is the thing worth proving rather than assuming. That differ is
  calibrated too: 103 differing elements under a 1px nudge.

One probe bug worth recording: `Browser.theme()` seeds the *next* navigation, so my
first measurement run reported the light theme's numbers under a "dark" label — in
range, plausible, and wrong. The instrument now reads `--text` back and throws if the
theme did not take.

## Known gap, deliberate

**Nothing on the home page links here yet.** The page is in the sitemap and reachable
by URL, and it has a Home link back — but a visitor on the home page cannot find it.
Wiring it up is PR 4's job (the goal cards absorb their sport's next event plus a
button to `/patches/<sport>`), and doing a throwaway link here that PR 4 removes is
churn. Flagging it rather than letting it slip.

## One thing to look at

The wall is sorted **newest-first**, as locked. With today's calendar that happens to
group cleanly — all four outlines, then both solid bibs — because every finished race
precedes every booked one. The side effect is that your *next* race sits at the
bottom of the booked group rather than the top. Booked-ascending-then-finished-
descending would put "what's next" first; it is a one-line change and I did not make
it, because the ordering was your call.

> **Resolved:** you chose next-race-first on 2026-07-28, shipped in #74.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-28

## Review panel: 16 agents, 5 dimensions, 32 findings

`method` / `claims` / `correctness` / `render` / `regression`, each in its own worktree, one
adversarial skeptic per finding. All majors verified (partitioned, never sliced); minors capped at
one per dimension and the rest passed through unjudged — **I read and triaged every one of those
myself**, and several are fixed below.

0 agents died. 1.65M subagent tokens, 39 min. 11 judged: **8 CONFIRMED, 3 DOWNGRADED, 0 REFUTED** —
and **7 of 11 remedies were unsound**, which is where most of the value was.

### Majors — all five confirmed, all five fixed

| # | dimension | finding | fix |
|---|---|---|---|
| 1 | method | The contrast resolver took a rule the browser **never applies** as the answer. `.bib-sport:first-child` after a broken resting rule renders RIDE/RUN at **1.01:1** — invisible on every booked bib, both themes — with all 48 assertions green. | `required()` now **refuses** a selector it cannot model, and a new assertion turns any refusal touching the bib into a failure. Refusing alone would only convert a wrong answer into a quiet skip. |
| 2 | method | The translucent-ancestor guard could not see a **descendant combinator**. `.bib--booked .bib-sport{opacity:.5}` is invisible to a token-subset walk from both ends: 2.43:1, suite green — the exact 2.53:1 defect that guard's own docstring cites. | Asks the DOM through `structuralSelector` instead of the token set. The icon span gained a class so the one legitimate combinator rule in the component is gone. |
| 3 | correctness | **2026-12-07**: the morning after the last race, no bib is booked and the vacuity guard goes red. Unattended bot push, failed production deploy. | Replaced with an equivalence against the same derivation the page used, plus a container-rendered test proving the component distinguishes both states with no calendar involved. *(Found independently before the panel reported — see below.)* |
| 4 | correctness | Same date trips the orphan gate: `.bib--booked` and `.bib-tag` are data-conditional classes whose scoped CSS always ships. | I first shipped a hand-kept list; **the judge's remedy is better and replaced mine** — a structural discriminator (scoped selector + authored literal) that closes the class instead of deferring it to the next state class. |
| 5 | render | In forced-colors the current filter link's label was reported invisible — Chromium's text backplate is Canvas and `HighlightText` matches it. | `forced-color-adjust: none` + an explicit `CanvasText` border. **See the honesty note below — I could not reproduce this.** |

### One finding I could not reproduce, and what I did about it

Finding 5 is applied, but **three attempts to reproduce it all failed their own calibration.**
`Emulation.setEmulatedMedia` makes `(forced-colors: active)` match and resolves the system colours,
but does not appear to reproduce Chromium's real forced-colors *painting*: with it on, the rendering
is identical whether the fix is present or absent, and a probe that deliberately sets ink := surface
still reports the label visible.

My first "confirmation" of it was an artefact — `screenshotFullPage` resizes the viewport, which
moves a vertically-centred page, so I was sampling a rectangle that had shifted. The 1586-pixel
measurement that produced is **withdrawn**, and the code comment says so rather than repeating it.

The fix stays anyway: it is the documented pattern, it costs one declaration, and being wrong about
the mechanism costs nothing while being wrong about the label costs a user the filter row. **Owed: a
check in a real OS high-contrast mode**, which is the only thing that renders the backplate.

### Minors fixed (nine)

- **meta description** shipped unnarrowed on all three routes — the same "every race" overclaim the
  lede machinery had just been added to prevent, in the copy a crawler reads. Reported by two
  dimensions independently.
- **`og:url` was the origin on every page**, so each new URL advertised the home page and
  contradicted its own canonical. Now `Astro.url.href`; the test asserts the two *agree* rather than
  pinning either to a literal.
- **the 366-day sweep hard-coded 2026** (and iterated 366 times over a 365-day year) — it went
  vacuous the moment `EVENTS` moved to next year. Derived from `GOAL_YEAR`; re-verified it still
  kills the `>=` boundary mutant.
- **the sitemap gate never widened with the route count.** A panel dropped three of four pages from
  `sitemap-0.xml` with the suite green — and since nothing links to `/patches` yet, the sitemap is
  those routes' only discovery path.
- **the stagger gate demanded a `<main>` on every page**, so adding a 404 page would have failed the
  deploy.
- **the class-token floor of 20** was a hand-counted property of today's pages.
- **the dimmed-line composite guard walked only `.bib *`**, leaving the filter row's opacity
  unmeasured (fine today at 7.03:1 — but measured by hand, which is what that assertion replaces).
- **`short_name` had no gate** despite being the word beside an aria-hidden icon.
- **`BasicLayout` claimed `patch-wall.test.ts` measures composited pixels.** It does not and cannot —
  there is no browser in the suite. Also `.devin/wiki.json` still called this a single-page site in
  three places.

### Confirmed but deliberately not fixed

- **Print: the finished bibs come out at 2.4:1** (downgraded to NIT). Inverted bibs are solid black
  by design; a print stylesheet is a separate change and this page is not print-first.
- **Past a 42px root at 320px the date row escapes the bib.** WCAG 1.4.4 asks 200% (a 32px root);
  the swept envelope is clean to 40px. Recorded rather than chased.
- **`<time datetime>` names the start day of a multi-day range.** Valid HTML, and the alternative
  splits the visible text awkwardly.
- Four prose nits in my own comments (an `uppercase` element count, a stale safelist inventory, the
  two-decimals rationale, a same-date example that uses different dates). Real, and not worth a
  round-trip against the merge.

### Three defects I found myself while the panel ran

Rather than waiting on it. Two would have been failed production deploys:

1. **Eight simulated future bot pushes** — five green, two red, both in assertions written that
   morning. That is findings 3 and 4 above; the panel independently confirmed both.
2. **The Home link measured 60.25 × 20**, under the 24px floor `Now.astro` sets deliberately. Not a
   WCAG failure — SC 2.5.8's spacing exception applies at 143.82px clearance — so it was reported as
   the repo's own standard, not the specification's.

### Verification after every fix

- **229 tests** (was 178 on main, 225 at the panel's SHA). `pnpm check` 0 errors, eslint clean.
- **Every fix mutation-tested**, and the earlier mutations re-run to confirm nothing reopened. Both
  resolver holes now bite (8 and 2 failures); the state-class discriminator still catches a
  style-only dead class, a deleted rule, and an unscoped prose orphan.
- **Eight bot pushes green** except the deliberate, labelled January tripwire.
- **144 geometry configurations** clean; probe calibrated both ways.
- **The home page is still untouched**: 56 configurations rect-for-rect and colour-for-colour against
  a fresh build of `e4ae44f`, 0 differences.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-74"></a>

## #74 — feat(patches): put the next race at the top of the wall

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `27aad9b03` · `worktree-feat-wall-next-first` → `main` · +122/−24 across 3 files

## What changed

The patch wall was sorted **newest first**. On a calendar that runs past today, that
buries the race actually being trained for at the *bottom* of the booked group, three
further-away races above it. The wall now leads with the next race:

| position | before (newest first) | after (next race first) |
|---|---|---|
| 1 | 6 DEC 2026 | **2 AUG 2026** ← next |
| 2 | 7–15 NOV 2026 | 27 SEP 2026 |
| 3 | 27 SEP 2026 | 7–15 NOV 2026 |
| 4 | 2 AUG 2026 | 6 DEC 2026 |
| 5 | 12 JUL 2026 | 12 JUL 2026 ← most recent finish |
| 6 | 10 JUL 2026 | 10 JUL 2026 |

Booked ascending, then finished descending — both runs start at today and move away
from it, in opposite directions. Read off the built page, not from the source.

The legend also names the outlines first now (`PATCHES.key`), because the wall shows
them first; a legend that opened with the solid bibs would introduce the two
treatments in the opposite order to the one the reader meets them in.

**No group heading or separator.** The bibs already draw the boundary — an outline
wearing the word BOOKED against a solid inverted face — so the two runs read as two
blocks with nothing between them. If one is ever wanted it belongs to the page rather
than to `patchWall`.

## The consequence worth reviewing

This makes **the state part of the sort key**, so the wall's order is now a function of
the bot-written `updated_at` as well as of the fixture. On 7 December — the morning
after the last race — the booked run empties and the wall is plain descending. That is
intended, and it is the reason the tests are shaped the way they are:

- the two exact-order assertions pass **their own `iso` and their own events**, so
  neither is a hand-counted property of today's calendar;
- the invariant the page relies on (both runs point away from today; booked never
  printed after finished) is **swept over all 366 days** of `GOAL_YEAR` against live
  `EVENTS`, which cannot go vacuous and cannot depend on the date;
- the same-day tiebreak is asserted in **both groups and both fixture orders**, because
  the dates run in opposite directions there while the tiebreak deliberately does not.
  The tiebreak stays ascending everywhere: reversing it inside the finished group would
  make the printed order of two same-day races depend on whether they had happened yet.

## Verification

- `pnpm test` **231 passed** (was 229); `pnpm check` 0 errors / 0 warnings / 2 hints
  (both pre-existing on `BasicLayout.astro`); `pnpm eslint` clean.
- **Four mutations, four killed**, each by the assertion that should own it: revert to
  flat descending (3 tests), finished ascending too (2), tiebreak reversed inside the
  finished group (1), finished group ranked first (4).
- **Seven simulated bot pushes**, fixture written through the bot's own
  `serialise(nextProgress(...))` and asserted applied before each run — one ordinary
  ride, the day after each of the four remaining races, 31 December, 1 January. Six
  green; the one red is `stampYearMatchesGoalYear` on 2027-01-01, which is the
  deliberate labelled tripwire. The 7 December case is the one that matters here: the
  booked run empties and nothing goes red.
- **144-configuration geometry sweep** on the rebuilt page (3 routes × 8 widths × 6
  root sizes) plus six short viewports: `rightText 0  bottomText 0  rightBox 0
  bottomBox 0  docOverflow 0  aboveOrigin 0`. Reordering redistributes grid row
  heights, so this was measured rather than assumed.
- Rendered in both themes at 1100px with `--text` read back to prove the theme applied
  (`#0b0b0b` / `#fafafa`).

No colour, token or geometry declaration changed, so the contrast figures from #73 still
stand unchanged.

## One review leftover retired here

The `patchWall` docstring claimed *"two races on one date is not hypothetical here"* and
then cited the two Phuket legs, which are **two days apart**. Corrected in the rewritten
docstring: `EVENTS` has no same-day pair today, which is exactly why the tie is exercised
by a fixture in the tests rather than by the calendar. The other ten leftovers from the
#73 review land in their own sweep PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-75"></a>

## #75 — fix(patches): sweep the ten review leftovers from the patch wall

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `17c123226` · `worktree-fix-review-leftovers` → `main` · +335/−44 across 7 files

Decision 3 from 2026-07-28: sweep the review leftovers from #73 as one PR. Eleven were
recorded; one (the `patchWall` docstring citing two races on *different* dates as proof
that same-day races are not hypothetical) was retired in #74, so ten are here.

**Every finding was re-checked before acting, and the two substantive ones were both
wrong in their specifics.** Details below, because in one case that changed the fix.

## Substantive

### The 320px render defect is real, but not where or when it was reported

Reported as *"past a 42px root at 320px the date row escapes the bib and `1022.00` lands
on the vertical KM"*. Swept 320/360/414 × roots 40/41/42/44/48 on all three routes:

| | 42px root | 44px root | 48px root |
|---|---|---|---|
| `/patches/` | clean | clean | clean |
| `/patches/cycling/` | clean | docOverflow **6** | docOverflow **36** |
| `/patches/running/` | clean | docOverflow **14** | docOverflow **44** |

At 42px **nothing is lost on any route**, and where loss appears it is horizontal
*document* overflow with `rightText 0  bottomText 0  rightBox 0  bottomBox 0` — nothing
clipped, nothing overlapping. `1022.00` cannot land on the KM at that root: the hero
resolves to **17.78px** there, because `22cqi` of a 150px-wide bib binds long before the
`3rem` cap.

The actual cause is the page heading, and it is a whole-page property rather than a bib
one. Every text column on the home page sits inside a card that clips — measured, cards
on `/` want 325–404px of minimum width at these roots and the document still overflows
by 0 — so `/patches`' header is **the site's only un-clipped text column**, and its
minimum intrinsic width sets the document's. The word "patches" alone demands 311.8px at
a 44px root.

`break-anywhere` on the heading: **docOverflow 0 at 320px out to a 48px root, all three
routes.**

**`break-words` does not fix it.** I shipped that first and measured afterwards:
`overflow-wrap: break-word` breaks the rendered line but is defined *not* to affect
intrinsic minimum sizing, so the heading still demanded 311.8px and the scroll was
unchanged to the pixel — with the class visibly applied in the built markup. The comment
records the distinction, because the "tidy" edit back to the familiar utility silently
reintroduces the overflow.

### `goalForSport`'s premise holds; the fact that only the type said so did not

`Sport` is `typeof RAW_GOALS[number]["sport"]` and `GOALS` is an unfiltered 1:1 `map` of
`RAW_GOALS`, so the `find` cannot miss for any value the compiler will pass — the review's
literal claim is not right. What *is* right is that nothing enforced it: add a `.filter`
to that map and the type is unchanged while the lookup empties, and `!` then hands the
caller a property read on `undefined` two frames away. It now throws with the sport's
name, and `constants.test.ts` checks the totality over `GOALS` (derived, so a third goal
joins by existing) plus the unreachable branch reached past the type.

## Nits

- **A multi-day bib's `<time>` claimed the wrong day.** `datetime` names one instant and
  HTML has no interval form, so the tour shipped as `<time datetime="2026-11-07">` around
  the text "7–15 NOV 2026". The date line is now segments: one `<time>` per endpoint, no
  date on the dash. `formatPatchDate` is **derived from the segments** rather than written
  beside them — two functions producing the same string is how the range on screen and
  the dates a machine reads start to disagree, which is the same defect one layer up.
- **Print.** Chrome's default `print-color-adjust: economy` drops the face and keeps the
  ink. Measured on the rendered page with print media emulated, one treatment vanished in
  each theme: a **finished** bib at **1.04:1** in light, a **booked** bib at **1.04:1** in
  dark (worse than the 2.43:1 the review recorded; I did not try to reproduce that exact
  figure). Print now mirrors the forced-colours answer — every bib is an outline in
  literal black, the earned one keeps a thicker border, worst dimmed line **8.52:1**.
  Literal colours rather than tokens: paper is white whichever theme was on screen.

## Six comments that claimed something untrue

Each was checked rather than reworded:

1. **The pin-hole hazard is impossible.** `--hole` is `--card-background` and so is the
   surface behind the bib, so re-toning it moves both together and no grey dots can
   appear. The real reason the holes are removed explicitly: the coincidence only holds
   while a bib sits on a card.
2. **The container-query prose.** Measured across 320→3840px at roots 16 and 42: the wall
   reaches **three** columns, never four (`main` is `max-w-4xl`), and at a 16px root the
   `3rem` cap binds at **every** width except 768 — so the hero is a constant 48px across
   the desktop range rather than proportional to anything. The `cqi` term earns its place
   under *text zoom*, where it takes the number to 33px on a 150px bib. Rewritten to say
   which term binds where.
3. **The safelist inventory** was stale in the same commit that added `PATCHES` to it.
4. **`uppercase`** is on three of the bib's elements, not four.
5. **The two-decimals rationale** said five of six distances already print two places and
   only the tour is bare. Actually three change shape without `toFixed(2)`: `21.1`,
   `42.2` and `1022`. The two single-place ones are what make the case.
6. **#73's own body** said "four build-wide gates now walk every page". Counted: **nine
   tests** walk every built page — seven pre-existing gates widened from
   `dist/index.html`, one new gate (the sitemap census), and one contract test for the CSS
   helper itself. That PR's body has been corrected in place.

## Two new guards, both calibrated by injecting the defect

- **No at-rule may repaint the bib in a context the sighted screen reader is also in.**
  The colour model in `patch-wall.test.ts` filters `!r.nested`, so it does not *refuse* an
  at-rule the way it refuses an unmodellable selector — it cannot see one at all. That is
  correct for forced-colours and for the print rules this PR adds (their colours come from
  the OS or from paper, not from the theme block) and wrong for a viewport query, which
  applies to the same reader on the same screen. Injecting
  `@media (min-width: 40rem) { .bib { --ink: red } }` turns it red.
- **The print treatment must use literal colours and must drop the face.** Deleting the
  print rules turns it red.

## Verification

- `pnpm test` **237 passed** (was 231); `pnpm check` 0 errors / 0 warnings / 2 pre-existing
  hints; `pnpm eslint` clean.
- **144-configuration geometry sweep** on the rebuilt page: `rightText 0  bottomText 0
  rightBox 0  bottomBox 0  docOverflow 0  aboveOrigin 0`, plus six short viewports at
  `aboveOrigin 0`. Extreme sweep at roots 40–48 as tabulated above.
- **Contrast unchanged**, re-measured from composited pixels: 6.52 / 7.33 / 9.96 / 10.57
  light, 9.08 / 9.62 / 6.81 / 7.66 dark; worst sport mark 6.52 against a 4.5 floor. The
  instrument's own two-way calibration passed (18.86 authored vs computed; a forced
  colour collision reads 1).
- **Seven simulated bot pushes** through the bot's own `serialise(nextProgress(...))`,
  asserted applied before each run: six green, and the one red is the labelled
  `stampYearMatchesGoalYear` tripwire on 2027-01-01. This caught a real failure on the
  first pass — two utility names written inside my own new `.astro` comment
  (`break-words`, `h1`) emitted rules with no wearer. Reworded rather than blocklisted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-76"></a>

## #76 — feat(goals): give each goal card its next race and a way to the wall

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `a8d94307e` · `worktree-feat-next-event-card` → `main` · +622/−77 across 10 files

**[Visual review page — before/after, the measured budget, and the one question left for you](https://claude.ai/code/artifact/ba16f5e9-34db-4601-98c2-85d08debc995)**

Decision 2 from 2026-07-28: absorb the next event into each goal card. What shipped is
smaller than the shape you chose, and the reason is that the budget you chose it against
does not exist. Everything below is measured on the built page.

## What shipped

Each goal card gained a 24px chip linking to `/patches/<sport>`:

| calendar state | the chip reads |
|---|---|
| a race ahead | `Next race in 5 days` / `…is tomorrow` / `…is today` |
| a multi-day race running | `Race under way now` |
| nothing booked | `4 patches earned`, or `See the patch wall` before the first |

Every state was rendered by building at a date that produces it, not reasoned about.

It is **the only path from the home page to the wall** — until now `/patches` was an
indexed page nothing on the site linked to. `tests/build-output.test.ts` now walks the
link graph from `/` and fails if any built page becomes unreachable.

## Why it is not a drawn patch, a countdown and a button

Three separate things is three boxes, and there is room for most of one.

| right-hand stack | tightest lg | roomiest lg |
|---|---|---|
| unspent height, before | 18px | 82px |
| the chip, ×2 cards | 48px | 48px |
| refunded by dropping one text line ×2 | −40px | −40px |
| **unspent height, after** | **2px** | **66px** |
| cards that contract or clip | none | none |

Tightest lg is any viewport whose height puts `main` on its 46rem floor while lg is
active — 1024×600, 1152×700, 1280×720. Past the leftover the flex column contracts all
three cards and the Now card *clips* rather than scrolls, so the real ceiling was about
**9px per card**. A bib is 116px tall and wants 13rem of width to size its own number,
against a goal-card row that is **158px** wide at 1024. Neither dimension was available.

**The handover's second half was wrong and it is worth naming:** "condense About me / the
role cards / Now / the footer" cannot be done — every card outside the stack is at 0 slack
and four are negative (About me −18, footer −22, HeyMax −6, intro −2.5, content sitting
into padding that `Card/index.astro` documents as not ink-loss). Total reclaimable: **0px**.
Condensing there means cutting copy, not tightening space.

## What paid for it

`Last year's: N km` used to sit between the figure and the weekly rate. One of the two
goals has no figure for it — running's `progress_last_year` is `null`, so that card spent
20px printing a dash. The value stays configured and unrendered, one edit from returning;
the note in `Goal.astro` says that if it comes back something else has to leave.

## The hairline had to get darker than the bib's

The border is the mark that says "control", so SC 1.4.11 holds it to 3:1 against the card.
Composited from the rendered pixel, because the authored ink is 18:1 before the alpha
touches it:

| border, % of `--text` | light | dark | |
|---|---|---|---|
| 32% — the booked bib's value | 2.13 | 2.81 | under in both |
| 40% | 2.68 | 3.72 | still under in light |
| **48% — shipped** | **3.38** | **4.79** | clears both |

Easy to get wrong by hand: the light side of the pair is the card at `#F5F5F5`, not white.
A new assertion does the blend itself and fails at 32% and 40%. The chevron carries the
same affordance as a shape, so neither channel is alone — and forced-colours maps both to
`LinkText`, verified resolving to `rgb(0,0,159)`.

## Verification

- `pnpm test` **248 passed**, against **237** on a fresh build of `main`; `pnpm check`
  0 errors / 0 warnings / 2 pre-existing hints; `pnpm eslint` clean.
- **66 clipping configurations** on the home page (11 widths × 6 root sizes) plus six short
  viewports. Result is **identical to a fresh build of `main`**, including the one
  documented pre-existing residual (48.16px of `<h1>` ink at 320px and a 40px root) — so
  that number is not this change's.
- **100 before/after configurations** compared card-for-card and colour-for-colour:
  **0 differences at lg** outside the goal stack. All 70 sub-lg differences are the flow
  moving down 16px, on a page that already scrolls there.
- **Seven simulated bot pushes** through the bot's own `serialise(nextProgress(...))`:
  six green, one red, and the red is the labelled `stampYearMatchesGoalYear` tripwire.
- **Three mutations, three killed** — the border back to 32% (the new contrast assertion),
  the chip removed entirely (7 tests, including the new reachability walk), and an
  over-wide chip.

Two calibration notes, because both were nearly silent passes:

- The **first over-wide injection did nothing**: `max-width: 100%` capped it, so the sweep
  reported a clean page. Re-injected as `min-width` and confirmed the rule reached `dist`
  before trusting the result — it then reported `rightBox 854.00` naming `<a next-race>`.
- The home-page sweep **needed a fix before it could be believed**. Walking text nodes
  naively counts `.sr-only` spans, which are absolutely positioned a viewport away, and it
  reported 4259px "lost" at 2560×900 on a page that clips nothing. The exclusion had to
  match `clip`, not `clip-path` — checking only the modern property missed every span and
  the number did not move.
- The **first version of the reachability gate did not catch its own mutation**: it asked
  whether some other page linked to each one, and `/patches` ↔ `/patches/cycling` satisfy
  that as an island while being exactly as unreachable. Rewritten as a walk from `/`.

## Also retired here

Three comments whose premise this change spends: `constants.ts`'s "what has NOT been
decided is whether a goal card should carry a link" (it does now), the Strava URL note's
"what is still open is whether a goal card should spend a control on it", and
`build-output.test.ts`'s "nothing links to /patches from the home page yet, so the sitemap
is those three routes' ONLY discovery path".

## The one thing that needs you

What shipped costs no viewport anything. If you want the drawn patch, it has to be paid
for, and there are four places it can come from — cut named copy elsewhere, raise the
46rem/50rem budget (only viewports 736–768px tall start scrolling), accept scrolling below
some height, or take it from the Now card. **Doing nothing is a real answer**: the chip
works, it is at the accessibility floor rather than near it, and the wall is one click away.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-77"></a>

## #77 — feat(patches): print where each race is, and drop the two Strava enrichments

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `4b800cf55` · `worktree-feat-events-country` → `main` · +209/−30 across 8 files

Decision 4 asked for all three EVENTS enrichments. **One ships. One is dropped because the
premise it rested on is false, and I measured that rather than inheriting it. One is
blocked on data only you have.**

## `country` — ships

A **required** field on `RaceEvent`, printed on every bib under the race name and dimmed
with the date and the tag. Today: Thailand ×2, Singapore ×3, Taiwan.

Required rather than optional so `pnpm check` — the first half of Netlify's build command —
catches the next race added without one. That immediately broke three test fixtures, which
is the guarantee working rather than a cost.

A **name, not an ISO code or a flag**: this string is read by a person, so "SG" would make
them expand it, and a flag emoji would be the only emoji on a site whose build gates
against emoji entirely. `METADATA.address_country` stays `"SG"` for the opposite reason —
schema.org's `addressCountry` is consumed by a machine.

The values were inferred from the event names. Five name their country outright or
unambiguously (Phuket/Krabi → Thailand); **the one to check is "Round the Island Bike
Adventure" → Singapore**, which I took from context rather than from the name.

## Per-activity Strava links — dropped, and the premise was wrong

The plan rested on "per-activity URLs are public — HTTP 200, no redirect, verified by
curl". That status code is real. What it means is not:

> **Log in to see 'MBG DCR 2026 Krabi to Phuket'**
> …plus a sign-up prompt. The title, and nothing else.

Fetched and *read* for both finished rides (`19279762093`, `19254155835`) on 2026-07-28. No
distance, no date, no time. It is the same login wall the goal cards' Strava CTAs were
removed for — so a linked bib would spend the wall's strongest treatment on a dead end, and
**the offset-plate question this was meant to re-open stays closed**.

The evidence is now in the `STRAVA_PROFILE_URL` note, next to the per-*sport* finding it
sits beside, because the lesson generalises: a status code is not an answer to "can a reader
see this" — read the page.

## `elapsed_time` — blocked on the data, not the design

A finishing time is **immutable history**, so it belongs beside `km` and `name` in
`constants.ts`, not in bot-owned JSON. The bot exists to track a total that *moves*;
fetching an unchanging number nightly would add a second API endpoint, an
event→activity mapping, a new bot-written key and a new way for an unattended push to fail
the deploy — for a figure that was true the moment the race ended. (It would also need
`activity:read` on a token I cannot test.)

The two figures are not in this repository and cannot be read off Strava without an account.
**Two numbers from you and it ships** — and it has to arrive *with* them: a rendered line no
event fills makes its CSS an orphan and fails the build, which is the gate telling the truth.

## Two gates changed, both tripped honestly by this build

**"Emits exactly one stylesheet" was a byte count wearing a design invariant's clothes.**
Adding one 15px line to the bib pushed `Patch.astro`'s scoped CSS past Astro's ~4kB inline
threshold, so a second chunk appeared and the gate went red with nothing wrong. Measured
before rewriting it:

| visitor path | before (1 chunk + inline) | after (2 chunks) |
|---|---|---|
| `/` only | 26.3kB | 26.3kB |
| `/` then `/patches` | 26.3 + 4.1 inline = **30.4kB** | 26.3 + 4.2 = **30.5kB** |
| all three wall pages | 26.3 + 3×4.1 = **38.6kB** | 26.3 + 4.2 = **30.5kB** |

One extra request on the first wall page, **8kB saved across the wall** — a chunk is cached
where an inline block is re-sent per page. The old assertion would have blocked that as a
regression. It now asserts what luck cannot satisfy: no rule ships in two chunks, and no
page both inlines and links the same rule. Calibrated by copying a chunk in `dist/_astro`
(fails) and removing it (passes).

**The `pageCss()` meta-gate only ever matched two spellings.** Answering the question above
needs the rules per *file*, which that gate forbids — so chunk reads moved into a named
helper (`cssChunks()`) and the exemption became the helpers *layer* rather than one
filename. Strengthening it exposed the hole: a plain `readFileSync` of a named chunk walked
straight through the old pattern while its docstring claimed "every CSS read in the suite".
Verified by injecting exactly that — old pattern green, new pattern red. It now matches any
literal path into the asset directory, and says plainly that a **computed** path still
evades it. It also briefly reported *itself*, because the comment explaining the pattern
spelled the path it matches.

## Verification

- `pnpm test` **249 passed** (237 on `main` before this chain); `pnpm check` 0 errors /
  0 warnings / 2 pre-existing hints; `pnpm eslint` clean.
- **144-configuration wall sweep** (3 routes × 8 widths × 6 root sizes) plus six short
  viewports: `rightText 0  bottomText 0  rightBox 0  bottomBox 0  docOverflow 0
  aboveOrigin 0`. The bib grows 116.13 → 135.92px; `/patches` has no height clamp, so it
  scrolls rather than clips, and that was measured rather than assumed.
- **Contrast unchanged**: worst sport mark 6.52 against a 4.5 floor, instrument
  self-calibration passing in both directions.
- **The new dimmed line is under the existing composited-contrast assertion** — verified by
  dimming it to 0.25, which fails in all four bib states and both themes. A dimmed line
  nothing checks is the defect that shipped at 4.11:1 in #73.
- **Seven simulated bot pushes**: six green, one red, and the red is the labelled
  `stampYearMatchesGoalYear` tripwire.

## One correction carried in

`Goal.astro`'s new comment opened "FOUR ROWS IN THE FIGURES COLUMN"; there are three — the
figure, the status line and the chip. Fixed here rather than in its own PR, and named so the
correction is not silent.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-78"></a>

## #78 — feat(goals): rebuild the goal card body around the one number a visitor came for

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `dd7633da1` · `worktree-goal-card-body` → `main` · +845/−434 across 15 files

**Visual before/after, with the measured budget:** https://claude.ai/code/artifact/056d2bef-2cf3-46d9-b00e-4106ac3f30bb

## Why

Calvin: the components inside the two goal cards are too tight, and the countdown
control needs rethinking against the frontend-design skill. Asked to rethink the
body from scratch, four directions were built as real rendered components and
looked at; this is the one that won.

The body carried three objects and two of them were repeating each other. A 24px
capsule showed the fraction as a shape AND carried the sport's icon, which the
card heading already says. A line underneath restated the same fraction in prose.
A bordered chip both reported the countdown and was the link out.

What ships is a hero figure, a 2px rule under it, the required rate, the countdown
as a plain line, and a quiet control. Each element does exactly one job.

## What it costs — measured on the built page, not derived

| | goal card | Now card | unspent, tight lg | unspent, roomy |
|---|---|---|---|---|
| before (`main` @ 4b800cf) | 234.0px | 154px | 2.0px | 66.0px |
| **after** | **232.8px** | **154px** | **4.4px** | **68.4px** |

Tight lg is any viewport whose height puts `main` on its 46rem floor while lg is
still active — 1024x600, 1152x700 and 1280x720 all tie. **The redesign is strictly
cheaper than what it replaced**: deleting the pill paid for the extra row, so the
fourth line arrives with change and the Now card never moves. Below zero unspent
the flex column contracts every card in it, Now included, which is the failure this
budget exists to prevent.

Card padding is untouched at 24px. The 4px came out of the hero-to-rule gap
instead, which also ties the rule to the number it measures.

## Three decisions worth reviewing

**The rule spans the body, not the figure.** Underlining the hero looked best of
everything built and is wrong: the full scale becomes the number's own width, so
`2279.7 / 5000` and `158.6 / 600` would measure against different 100% and the two
cards could not be compared. Correctness, not taste — please do not tidy it back.

**The countdown floors to whole weeks from a fortnight out.** 61 days reads
"in 8 weeks" — sooner than it is, rather than promising a week of preparation that
does not exist. Under 14 days it counts in days, so it can never print "in 1 week".
The exact date is on the bib, one click away.

**The control and its destination share one string.** The card offers
`My cycling events` and that page is now headed with the same three words, read
from the same constant. The previous pairing said "events" on the control and
"Cycling patches" at the destination, so a reader was handed one name and shown
another. The rename is a correctness fix rather than a preference: a patch is a
race **completed and earned**, and the wall shows booked outlines beside earned
bibs. `/patches` stays as the URL; "patch wall" survives in the prose and the
metaphor, not as a visible title.

## What was verified

- **251/251 green**, `pnpm check` 0 errors / 0 warnings / 2 pre-existing hints,
  `pnpm eslint` clean.
- **All 15 new or changed assertions mutation-tested** — every one goes red when
  its subject is broken. Including the new box-width gate: without `align-self`
  the control stretched to 182px for 115px of ink, and 67px of empty card
  navigated when clicked. Nothing else in the suite could see that.
- **Seven simulated bot pushes** through the producer's own
  `serialise(nextProgress(...))`, fixture verified applied before each run. Six
  green; the only red is the labelled `stampYearMatchesGoalYear` tripwire.
- **Stack re-measured** at six viewports: goal cards 232.8, Now 154, nothing clips.
- **Home sweep**, 66 configurations plus six short viewports: the single residual
  is 48.16px of hero `<h1>` ink at 320px / 40px root, **verified identical on a
  fresh build of `main`**. Wall sweep, 144 configurations: clean.
- **Contrast from the painted pixel**, both themes: fill against track 3.86:1
  (light) and 8.58:1 (dark), with the fill the stronger mark against the card in
  both — the polarity rule holds.
- **Forced colours**: the control resolves LinkText, the rule keeps a CanvasText
  border and a Highlight fill. Cascade verified; painting cannot be checked headless.
- **Screenshots looked at** in both themes at 1024x800, 1440x900 and 375x812.

## Two corrections carried into the code

The variant rig said 1.75rem wraps the cycling figure and desynchronises the pair
to 227.5/251.7px. **It does not** — measured across 20 configurations in the real
component, the hero is one line at both sizes and the cards stay identical. 1.5rem
is still right, but for a height reason (3.8px per card, more than the stack has),
not a wrapping one. The comment in `Goal.astro` says so.

Two probes lied on the way to that: `getClientRects()` on the paragraph returns one
border box however many lines it holds, and a Range over its contents returns one
rect per inline box — and the denominator is half the size, so it sits at its own
top even on a shared line. Both reported a wrap that was not there. The third probe
was calibrated in both directions in the same run.

## Not in this PR

The finished bib's elapsed time and its Strava link — a `/patches` change that
touches nothing here. Next.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-28

## Review panel outcome — 31 agents, 22 findings judged

8 review dimensions, one adversarial skeptic per finding. **9 confirmed, 11 downgraded, 2 refuted.** Nothing survived at major severity.

Two finders died mid-run (`API Error: Connection closed mid-response` / `Response stalled mid-stream`) — `79-correctness` and `method`. Their coverage is partly replaced by work done directly: see the envelope sweep below.

### Fixed in `76443d8`

| Sev | Finding | Resolution |
|---|---|---|
| minor | **The chevron vanishes in forced colours**, leaving the control identified by colour alone | Fixed + gated. An icon class paints its mask over `background-color: currentColor`, which the mode overrides. Measured before: glyph `rgb(255,255,255)` on a card of `rgb(255,255,255)`. **A regression** — the old chip kept a 1px `LinkText` box. Now `rgb(0,0,159)`. |
| minor | The width budget says **158px in six places**; the row is **182px** | Corrected at all six. Deleting the `px-3` wrapper widened it; `EventsLink.astro` already said 182 two files away. The skeptic found two sites the finder missed, one in a file this branch edits. Docs only — `dist` byte-identical. |
| minor | The `align-self` gate tested **presence, not value** | `align-self: stretch` is a declaration *and* the default, so it passed on the exact edit it forbids. Now checks the value; mutation-tested. |
| minor | The hero/meter gate did not check the meter is **in the accessibility tree** | Both halves could be `aria-hidden` with the suite green. Now walks to the card refusing `aria-hidden`; mutation-tested. |
| nit | `--on-brand` has no consumer since the bar lost its glyph | BasicLayout now describes it in the conditional, not the present tense. |
| nit | The "FOUR extra lines" headroom figure was measured at **roomy** viewports | Qualified — at the tight end contraction starts at the *first* extra line. |

### Refuted, for the record

- *"The floor-vs-round justification asserts a symmetric ±6-day error"* — rounding's error is at most 3 days, but the direction argument the comment makes is unaffected.
- *"WCAG 1.4.12 clips the control away; baseline is clean"* — the second half is false. `origin/main` also fails 1.4.12, **worse and page-wide** (664px of lost ink at 1024×600 against this branch's 810). Pre-existing site-wide failure, not introduced here; the suggested `position: sticky` fix was not verified safe. Recorded, not fixed — it needs its own change.

### Verification beyond the panel

The `method` dimension died, so I ran its remit directly. My original claim of *"4.4px at the tightest configuration"* rested on six viewports at one root size, while the clipping sweep varied width × root at one height — **neither crossed the other**, and the crossing is where the quantity lives (`main` is `lg:h-screen lg:min-h-[46rem]`, all rem).

Swept the cross: **480 lg configurations** (7 roots × 10 widths × 10 heights).

```
origin/main   tightest 2.0px    this branch   tightest 4.4px
0 configurations at or below zero unspent
0 with ink past a clip edge
0 with the two goal cards at different heights
```

So 4.4px is a **bound**, not a sample that happened to be right. Calibrated: injecting a fifth row drives it to 0 and pulls Now from 154 → 146.7px.

Also: eight calendar dates the bot simulation never reached (race day, mid-tour with negative `daysAway`, both sides of the 14-day boundary) — all green, with the printed copy read directly rather than inferred from a green suite.

252/252, check and eslint clean.


---

<a id="pr-79"></a>

## #79 — feat(patches): say what a finished ride cost, and where to watch it

`closed` · opened 2026-07-28 by **calvindotsg** · merged not merged as `—` · `worktree-finished-bib` → `worktree-goal-card-body` · +556/−27 across 5 files

**Stacked on #78** — base is `worktree-goal-card-body`, so the diff here is only the wall. Retarget to `main` once #78 merges.

## Two changes to one component, and they belong together

"A finished bib says what the day cost and where to see it" is one idea. Both
figures land in the same object, and neither touches anything #78 touches.

```
10 JUL 2026  RIDE            ▲     <- fa6-brands:strava, in the meta row
160.59
KM
MBG DCR 2026 - PHUKET TO KRABI
THAILAND
ELAPSED  8:32:05
```

## The Strava links reverse #77 — deliberately, not by oversight

#77 dropped them with evidence: a logged-out visitor meets a login wall. **That
evidence is still true and is still in the code.** Calvin read it and asked for the
links anyway. Both halves now sit beside each other in `constants.ts`, so the next
person neither re-proposes the link nor deletes it as a mistake.

The trade, stated plainly: a visitor with Strava — most of the audience for a wall
of race bibs — gets the ride; one without gets a page that at least names it. That
is a smaller loss than it first looked, because the bib already prints the
distance, the date, the place and now the time, so the link adds to a complete
object rather than being the only way to learn anything.

**Both ids were verified, not trusted**, and the method is worth keeping:

```
19254155835 -> "MBG DCR 2026 Phuket to Krabi"   (10 Jul bib)
19279762093 -> "MBG DCR 2026 Krabi to Phuket"   (12 Jul bib)
```

The logged-out page leaks the activity TITLE, so one fetch per id confirms which
race it is without an account. Two valid ids transposed between these two events
would produce a wall that loads, passes every check, and is wrong — there is now an
assertion for the duplicate case and a digits-only one for the id format.

## Why the time is labelled

`ELAPSED` is not a caption. Elapsed and moving are far apart on these rides —
8:32:05 against 5:03:55 — so a bare time invites a reader to divide it into the
160.59 printed directly above and conclude 18.8 km/h where the ride was 27.7.

The times stay hand-entered. A finishing time is immutable history; fetching it
nightly would add a second endpoint, an event-to-activity mapping, a bot-owned key
and a new way for an unattended 05:13 push to fail the deploy — for a number that
stopped changing when the race ended.

## A real clipping defect, found and fixed on the way

At a 40px root on a 320px viewport the bib is 150px wide and `ELAPSED 8:32:05`
wanted **72.44px more than it had**, running off the edge of a box that clips. The
time row wraps now; the label and value are two words with a natural break.

**The wall's own sweep could not see it.** That instrument had no visually-hidden
exclusion — `/patches` had never contained an `sr-only` element — so the very
change that introduced the defect also introduced thousands of pixels of *fake*
loss that buried it. The instrument now carries the same exclusion the home sweep
already had, and was calibrated in both directions in the same run: clean on the
page, red on an injected 420px overflow.

## What was verified

- **256/256 green**, `pnpm check` 0 errors / 0 warnings / 2 pre-existing hints,
  `pnpm eslint` clean.
- **11 mutations, all caught** — wrong href, missing target, an added aria-label,
  the mark on every bib, the transcription removed, the time unlabelled, a time row
  on an untimed race, a time typed against a future race, two races sharing one
  activity, a non-digit id, a malformed time.
- **Seven simulated bot pushes**; six green, only the labelled year tripwire red.
  Includes 2026-08-03, where Round the Island finishes with no activity and must
  render as an ordinary finished bib — the case the conditional is written for.
- **144 wall configurations** (3 routes x 8 widths x 6 root sizes) plus six short
  viewports: no ink or box past any clip edge, no document overflow.
- **Contrast from the painted pixel**: the glyph 18.86:1 (light) and 18.09:1
  (dark) on the bib face; the focus outline 6.52:1 and 12.55:1 against the card.
  Printed output re-measured — the time label 10.00:1, the value 18.88:1 on paper.
- **Cell and bib heights measured at three widths**: the wrapper does not make the
  wall ragged; every cell in a row is still equal.
- **Screenshots looked at** in both themes.

## One structural note for review

The bib is now an `<a>` (or a `<div>`) inside its `<li>`, because an anchor cannot
be a child of `.patch-wall`. Every selector in the component and in
`tests/patch-wall.test.ts` was already class-based, so exactly one assertion
changed — the one that reached for `querySelector("li")`. First draft of this had
the bib rendering as a nested `<li>`, which no test in this repo reads markup
strictly enough to catch; it showed on the built page.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (2)

**calvindotsg** — 2026-07-28

## Review panel outcome — fixed in `269d3fe`

Same panel as #78. Two of the confirmed minors would have shipped real damage.

### The two that mattered

**Six assertions would have failed a production deploy on ordinary data entry.** Four `toBeGreaterThan(0)` floors counted a *filtered subset* of `EVENTS` — empty three weeks ago, empty again every January after step 3 of the rollover checklist. The two paired `toBeLessThan(EVENTS.length)` bounds are worse: they assert some race must **forever** lack a Strava id, and go red the day the last one is recorded. `netlify.toml` runs the suite as the build command.

This repo had already litigated the identical pattern against itself — `patch-wall.test.ts` records one causing *"a bot-triggered failed deploy"* — and I wrote six more a few hours after re-reading that note. Proven both directions with the producer's own serialiser:

```
January (no race has a time or an id)              was 4 red  ->  259/259
Season complete (all recorded, stamp past them)    was 2 red  ->  259/259
```

**The elapsed time was losing characters.** `flex-wrap` splits the row but sizes each line independently, and `ELAPSED` / `9:41:31` are single unbreakable tokens — so past a 40px root each is wider than the bib and paints *outside* it, where the ink is `--background` on the card at **1.045:1**. `"9:41:31"` rendered as `"9:41:"`.

`.bib-place` was escaping earlier and further (**+98.3px** at a 48px root) and had been since #77, so the fix goes on both. `anywhere`, not `break-word` — a gate now refuses the weaker value, which would have looked like a fix and done nothing.

Neither instrument could see it: the wall sweep walks elements inside a **clipping** ancestor, and `.bib` does not clip (`container-type` is not a clip), so the ink escapes onto the card unmeasured. After the fix, zero escapes past the bib border box at all eight text sizes tested.

### Also fixed

| Sev | Finding | Resolution |
|---|---|---|
| minor | The Strava glyph vanishes in forced colours | Same mask/`background-color` mechanism as #78's chevron. Now `LinkText`, measured `rgb(0,0,159)`. |
| minor | The print and forced-colors outline overrides were **dead** | An at-rule adds no specificity, so the plain rule 200 lines later won. Grouping by mode read well and did nothing; they now sit at the foot of the sheet. |
| minor | The href assertion was **partially tautological** | It compared the page against the function that built it, so a typo in the base URL ships 404s with the suite green. The literal is pinned; mutation-tested with a typo. |
| minor | `.bib-cell` is load-bearing and untested | Gated: the grid item must be the `<li>`, the bib must be its child, and the cell must declare `display: grid`. |
| nit | The documented accessible name was wrong | `"on Strava"` lands **third**, not last — read off the accessibility tree. The guard used `toContain`, order-blind by construction. Comment corrected. |
| nit | The flex-wrap comment quoted an edge it had not measured | Replaced with the bib-border-box figures. |

### Not fixed, deliberately

**No new-tab warning.** Real, but the site has no such announcement anywhere and the other two `target="_blank"` links behave identically — so it is a site-wide copy decision rather than something this PR regresses. The one-string form would be `strava_name: "on Strava (opens in a new tab)"` if you want it.

### Clean negatives worth recording

The 92-character link name is **not** a 2.4.4/2.4.9 failure (unique, fully descriptive). Focus ring keyboard-reachable at **6.52:1** light / **12.55:1** dark, no occlusion at 390px. The `bib-cell` wrapper costs no list semantics (6 `listitem` before and after). Nothing accessible was removed — StaticText 57 → 63, strictly additive.

259/259, check and eslint clean, 144 wall configurations with no lost ink, seven simulated bot pushes with only the labelled year tripwire red.

**calvindotsg** — 2026-07-28

Closed automatically by GitHub when its base branch `worktree-goal-card-body` (#78) was deleted on merge — a closed PR cannot be retargeted or reopened. Continued as #80, rebuilt on the merged `main` with every review fix from the verdict table above included. The review discussion stays here.


---

<a id="pr-80"></a>

## #80 — feat(patches): say what a finished ride cost, and where to watch it

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `e96ea12e7` · `worktree-finished-bib-v2` → `main` · +556/−27 across 5 files

**Replaces #79**, which GitHub auto-closed when its base branch (`worktree-goal-card-body`, PR #78) was deleted on merge — a closed PR cannot be retargeted or reopened, so this is the same change rebuilt cleanly on top of the merged `main`. The review discussion and verdict table are on #79 and still apply; nothing was dropped.


## Two changes to one component, and they belong together

"A finished bib says what the day cost and where to see it" is one idea. Both
figures land in the same object, and neither touches anything #78 touches.

```
10 JUL 2026  RIDE            ▲     <- fa6-brands:strava, in the meta row
160.59
KM
MBG DCR 2026 - PHUKET TO KRABI
THAILAND
ELAPSED  8:32:05
```

## The Strava links reverse #77 — deliberately, not by oversight

#77 dropped them with evidence: a logged-out visitor meets a login wall. **That
evidence is still true and is still in the code.** Calvin read it and asked for the
links anyway. Both halves now sit beside each other in `constants.ts`, so the next
person neither re-proposes the link nor deletes it as a mistake.

The trade, stated plainly: a visitor with Strava — most of the audience for a wall
of race bibs — gets the ride; one without gets a page that at least names it. That
is a smaller loss than it first looked, because the bib already prints the
distance, the date, the place and now the time, so the link adds to a complete
object rather than being the only way to learn anything.

**Both ids were verified, not trusted**, and the method is worth keeping:

```
19254155835 -> "MBG DCR 2026 Phuket to Krabi"   (10 Jul bib)
19279762093 -> "MBG DCR 2026 Krabi to Phuket"   (12 Jul bib)
```

The logged-out page leaks the activity TITLE, so one fetch per id confirms which
race it is without an account. Two valid ids transposed between these two events
would produce a wall that loads, passes every check, and is wrong — there is now an
assertion for the duplicate case and a digits-only one for the id format.

## Why the time is labelled

`ELAPSED` is not a caption. Elapsed and moving are far apart on these rides —
8:32:05 against 5:03:55 — so a bare time invites a reader to divide it into the
160.59 printed directly above and conclude 18.8 km/h where the ride was 27.7.

The times stay hand-entered. A finishing time is immutable history; fetching it
nightly would add a second endpoint, an event-to-activity mapping, a bot-owned key
and a new way for an unattended 05:13 push to fail the deploy — for a number that
stopped changing when the race ended.

## A real clipping defect, found and fixed on the way

At a 40px root on a 320px viewport the bib is 150px wide and `ELAPSED 8:32:05`
wanted **72.44px more than it had**, running off the edge of a box that clips. The
time row wraps now; the label and value are two words with a natural break.

**The wall's own sweep could not see it.** That instrument had no visually-hidden
exclusion — `/patches` had never contained an `sr-only` element — so the very
change that introduced the defect also introduced thousands of pixels of *fake*
loss that buried it. The instrument now carries the same exclusion the home sweep
already had, and was calibrated in both directions in the same run: clean on the
page, red on an injected 420px overflow.

## What was verified

- **256/256 green**, `pnpm check` 0 errors / 0 warnings / 2 pre-existing hints,
  `pnpm eslint` clean.
- **11 mutations, all caught** — wrong href, missing target, an added aria-label,
  the mark on every bib, the transcription removed, the time unlabelled, a time row
  on an untimed race, a time typed against a future race, two races sharing one
  activity, a non-digit id, a malformed time.
- **Seven simulated bot pushes**; six green, only the labelled year tripwire red.
  Includes 2026-08-03, where Round the Island finishes with no activity and must
  render as an ordinary finished bib — the case the conditional is written for.
- **144 wall configurations** (3 routes x 8 widths x 6 root sizes) plus six short
  viewports: no ink or box past any clip edge, no document overflow.
- **Contrast from the painted pixel**: the glyph 18.86:1 (light) and 18.09:1
  (dark) on the bib face; the focus outline 6.52:1 and 12.55:1 against the card.
  Printed output re-measured — the time label 10.00:1, the value 18.88:1 on paper.
- **Cell and bib heights measured at three widths**: the wrapper does not make the
  wall ragged; every cell in a row is still equal.
- **Screenshots looked at** in both themes.

## One structural note for review

The bib is now an `<a>` (or a `<div>`) inside its `<li>`, because an anchor cannot
be a child of `.patch-wall`. Every selector in the component and in
`tests/patch-wall.test.ts` was already class-based, so exactly one assertion
changed — the one that reached for `querySelector("li")`. First draft of this had
the bib rendering as a nested `<li>`, which no test in this repo reads markup
strictly enough to catch; it showed on the built page.

## Review panel fixes are included in this branch

The fan-out review ran against #79 before it was closed. Its confirmed findings are already fixed here — the full verdict table is in the comment on #79. The two that mattered:

- **Six assertions would have failed a production deploy on ordinary data entry.** Four `toBeGreaterThan(0)` floors counted a *filtered subset* of `EVENTS` (empty every January), and two `toBeLessThan(EVENTS.length)` bounds asserted some race must forever lack a Strava id. `netlify.toml` runs the suite as the build command. Proven both ways with the producer's own serialiser: January was 4 red, season-complete 2 red, both now 259/259.
- **The elapsed time was losing characters.** `ELAPSED` and `9:41:31` are unbreakable tokens, so past a 40px root each was wider than the bib and painted outside it at 1.045:1 — `"9:41:31"` rendered as `"9:41:"`. `.bib-place` was worse and predates this PR. Fixed with `overflow-wrap: anywhere` on both, gated against the weaker `break-word`.

Plus: the Strava glyph vanishing in forced colours, two dead at-rule overrides (an at-rule adds no specificity, so the plain rule 200 lines later won), a partially-tautological href assertion, and a `.bib-cell` gate.

**259/259**, three new gates all mutation-tested, 144 wall configurations with no lost ink, zero escapes past the bib border box at eight text sizes, and seven simulated bot pushes with only the labelled year tripwire red.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-81"></a>

## #81 — fix(a11y): let the grid grow so text spacing stops deleting content

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `c1468478d` · `worktree-text-spacing` → `main` · +503/−96 across 9 files

## Summary

The home page fails **WCAG SC 1.4.12 Text Spacing (AA)** and always has. This closes it by letting the bento grid get taller when the text inside it does.

## Problem

A reader who applies the criterion's four metrics — `line-height: 1.5`, `letter-spacing: 0.12em`, `word-spacing: 0.16em`, `p { margin-bottom: 2em }` — changes **no font-size**. So nothing font-relative on this page moves: not `main`'s budget, not the breakpoints, not the card padding. The type inside the cards grows anyway, `main` was clamped between a floor and a **cap**, its rows were eight equal fractions, and every card clips. The difference was deleted, not scrolled.

Measured as ink past each card's clip edge, summed over the page. Calibration: the same probe reports **0** with the override off, at every viewport.

| viewport | ink deleted | right edge | bottom edge |
|---|---|---|---|
| 1024x600 | **1157.7px** | 0 | 1157.7 |
| 1024x768 | **850.7px** | 0 | 850.7 |
| 1280x800 / 1440x900 / 1920x1080 | **63.0px** | 0 | 63.1 |

By card at 1024x600: HeyMax role 452 · About me 220 · Cycling goal 155 · NCS role 144 · Running goal 114 · footer 72.

**This is pre-existing and site-wide.** It is not a regression from any recent PR.

## Solution

Three changes, all in `index.astro`:

- `lg:h-screen lg:min-h-[46rem] lg:max-h-[50rem]` → `lg:min-h-[clamp(46rem,100vh,50rem)]`. The clamp survives; the **ceiling** does not.
- `lg:grid-rows-8` → `lg:grid-rows-[repeat(8,min-content)]`. `grid-rows-8` compiles to `repeat(8, minmax(0,1fr))`, and a fraction track sums to its container rather than asking it for room.
- The footer card `lg:row-span-2` → `lg:row-span-3`.

Both of the first two are load-bearing, and each was measured alone:

| variant | 1024x600 | 1024x768 | 1440x900 |
|---|---|---|---|
| no fix | 1157.7 | 850.7 | 63.0 |
| floor freed, rows untouched | 1157.7 | 850.7 | 63.0 |
| rows content-sized, cap kept | 3096.7 | 2190.7 | 208.6 |
| **both** | **0** | **0** | **0** |

Content-sized rows under a still-capped container are *worse* than shipping neither.

### Why the footer needed a third row

It was auto-placed into row 8 plus an implicit row worth 0px, so its area was **92px for 105px of content** — and the 13px being cut was its own **bottom padding**, which is why no ink probe ever saw it. Under a fraction template that is invisible; under a content-sized one the whole page pays for it, and the grid asked for 813px instead of 797. The third row costs nothing either way: rows 9 and 10 already exist, empty, from the career cards' six-row spans.

## What it costs a reader who changes nothing

From a **797px-tall viewport up, nothing scrolls that did not scroll before.** Below that the page grows: at **1024x768 and 1366x768** the document goes 768 → 797px and gains a **29px scroll** where it used to fit exactly — by squeezing every row 5px and eating the footer's padding.

Rect-diffed against a build of `main` across ten lg viewports:

- no card moves horizontally or changes width, at any viewport
- intro card **+5px**, footer **+14px** (its own padding coming back), everything below the first row shifts down 5px
- at ≥800px tall, `main` is still exactly 800px

**This is the one judgement call in the PR.** A 29px scrollbar on a 1366x768 laptop, against up to 1157px of silently deleted content. It is also the same trade this repo already took for text zoom, at your instruction ("let the page grow with the text").

## The stack budget is retired

Measured by building the same mutation against both revisions — one extra `text-xs` line into one goal card, at 1024x600:

| | Now | the *other* goal card | the edited card |
|---|---|---|---|
| before | 154 → 150.7 → 146.7 | 232.8 → 227 → 220 | grows |
| after | 154, unmoved | 232.8, unmoved | 232.8 → 252.8 → 272.8 |

So "anything added to either goal card or to Now must remove something first" no longer holds, and neither does the 4.4px. `CLAUDE.md` and `Goal.astro` are updated; the old arithmetic is kept as history because the card-level figures are still current.

## A real defect in the test helper, surfaced by this

`parseRules` split selector lists on **every** comma, so any UnoCSS arbitrary value containing one — `grid-rows-[repeat(8,min-content)]`, `min-h-[clamp(...)]`, any multi-stop shadow — was torn into two invalid selectors. Every guard shaped *"no rule anywhere may do X to element Y"* then either threw or **silently matched nothing and reported the rule absent**. Fixed with an escape-, bracket- and quote-aware splitter, applied at both call sites.

## Test plan

- `pnpm test` **259/259**, `pnpm check` 0 errors / 0 warnings / 2 pre-existing hints, `pnpm eslint` clean
- **7 mutations, 7 caught** — restoring the ceiling, restoring `h-screen`, restoring the fraction template, deleting the floor, the footer back to two rows, an *ungated* ceiling, and reverting the selector splitter
- **480-configuration cross sweep** (7 roots × 10 widths × 10 heights): 0 ink past a clip edge, 0 goal-card desync
- **66-configuration width × root sweep**: only the documented 48.16px residual at 320px / root 40, identical to `main`
- **15 simulated bot pushes** (7 ordinary + 8 edge dates): 14 green, the only red being the labelled `stampYearMatchesGoalYear` year-rollover tripwire
- Screenshots at 1024x800 / 1440x900 / 375x812 in both themes, before and after

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-28

## Review panel verdict — 47 agents, 10 dimensions, 0 dead

64 findings across the three PRs, **25 MAJOR / 27 MINOR / 12 NIT**. Every major was verified (partitioned, never sliced) plus 12 minors: **26 CONFIRMED, 11 DOWNGRADED, 0 REFUTED, 0 unjudged.** 4.06M subagent tokens, 83 minutes.

Rebased onto `d1c7642` — main moved during the review (#84, #86), both touching `CLAUDE.md`, which this PR also edits. Both sessions' work is preserved.

### Confirmed against this PR, and fixed

| sev | finding | what it cost | fix |
|---|---|---|---|
| MAJOR | **The row-template gate was an enumeration** (3 dimensions found it independently) | `lg:grid-rows-[repeat(8,4.75rem)]` passes all 259 tests and deletes **243.1px** at 1024x600 | inverted allowlist of growable tracks — which `isDefiniteSize` 80 lines above already does, and says it does, for this exact reason |
| MAJOR | **The ceiling gate was scoped to exactly `lg`** (3 dimensions) | `xl:max-h-[50rem]` restores **215.6px** of unrecoverable loss at ≥1280 — worse than the 63px this PR fixes — with 259 green | ceiling + track checks run on `min-width >= lg`; existence assertions stay pinned to `lg` |
| MAJOR | **A third `split(",")` survived** | the hover-affordance guard goes blind to `hover:shadow-[0_0_0_1px_rgb(0,0,0)]` on a non-interactive element | `splitSelectorList` at `build-output.test.ts:695` |
| MAJOR | **My central justification was false** | I claimed "the floor alone still loses all 1157.7px". It loses **0**. Removing the ceiling closes SC 1.4.12 on its own | prose rewritten; the rows defend the *default-size page* (797 vs 810 vs 912px), not the criterion |
| MINOR | `contain: size` / `aspect-ratio` cap `main` harder than any max-height | **2188.7px** at 1024x600, and 78px at the **default** text size — a loss main does not have | asserted as an invariant over every rule reaching `main`, matched on the containment *value* so `inline-size` stays legal |
| MINOR | inline `style` invisible to every assertion in the file | scoping the fix to body+main still leaks via the stack wrapper (105.5px at default size) | sweep `body`, `main` and every `[style]` under it |
| MINOR | only the longhand was read | `grid-template` / `grid` both reset `grid-template-rows` | shared `ROW_TEMPLATE_PROPS` + `rowTracks` at all four sites, rows half only |
| MINOR ×6 | numeric claims in my prose | footer is 106px cut by 14, not 105/13; its area is 106/109px, never 108; implicit tracks 7.5px at 1440x900; stack 705px not 720; intro 357px not 352 | each re-measured on the built page, not taken from the finding |

### One correction the panel did not find

I described the cost as "gains a 29px scroll where it used to fit exactly". Measured at 1024x768 and 1366x768: **text ink below the fold is 0.** The 29px is 5px of the footer's own box plus `main`'s padding — a scrollbar, not a line of copy. Corrected in the code comment and above.

### Verification after the fixes

- `pnpm test` **260**, `pnpm check` 0/0/2 pre-existing hints, `pnpm eslint` clean
- **Every mutation above is red now**, and the originally-red directions stay red
- **480 lg configurations**: 0 ink past a clip edge, 0 goal-card desync
- Combined tree (this + #82 + #83) on the new main: **265 passing**, 0 loss at every viewport
- Measured on the **deployed preview**, not a local build: production loses 1157.7 / 850.7 / 63.0; this preview loses **0**
- 45 zoom × viewport configs never worse than main; 28 sub-lg configs byte-identical


---

<a id="pr-82"></a>

## #82 — docs: correct four measured claims and a mixed-scope figure

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `4c859eb2e` · `worktree-staleness-sweep` → `main` · +44/−17 across 4 files

## Summary

A staleness sweep of the docs and comments, with **every premise re-checked rather than inherited**. Two of the three items on the list turned out to be false; they are recorded below and deliberately not touched.

Independent of #81 — different files, no overlap.

## Premises that died

- **`.devin/wiki.json` "names `ProgressBar` 7× describing a component that no longer has an icon or a capsule."** It does name it seven times, and every mention is *correct*: they are cautionary notes saying the **deleted Svelte** `ProgressBar` had an `IntersectionObserver` and that the current one has zero JavaScript. Nothing describes a capsule or an icon.
- **`README.md` says "patch wall" where the pages now say "My events".** `CLAUDE.md` explicitly keeps that word for the URL and the metaphor. The line was not false — it was ambiguous, and it is reworded rather than corrected.

## What was actually wrong

**1. `wiki.json`: one stylesheet → two.** `dist/_astro` holds **two** CSS chunks and has since `/patches` added a second entry (Vite splits per entry). The note also cites a test name — `"emits exactly one stylesheet"` — that **no longer exists in the suite**. The note's own header says *"treat contradictions as errors"*, so a false ground truth there is worse than no note. Replaced with the two-chunk reality plus the reason a caller should use `pageCss()` rather than read `dist/_astro`: `inlineStylesheets: "auto"` also moves small sheets into the page.

**2. `wiki.json`: the `constants.ts` export list predates the patch wall.** It listed nine names; the file exports `GOAL_YEAR`, `EVENTS`, `PATCHES`, `NEXT_RACE`, `THEME_TOGGLE`, `stravaActivityUrl`, `clampToGoal`, `goalForSport` and the `Goal`/`Sport`/`RaceEvent` types as well. It also claimed `progress_last_year` *"renders as a dash"* — **nothing renders it**, since the goal card gave up its last-year line to pay for the countdown.

**3. `18.8 km/h vs 27.7` mixes two distances.** Quoted in `constants.ts` and `Patch.astro` as the argument for labelling the clock. They are not one ride divided two ways:

| | distance | clock | km/h |
|---|---|---|---|
| the `18.8` | **event** 160.59 km | elapsed 8:32:05 | 18.82 |
| the `27.7` | **activity** 140.49 km | moving 5:03:55 | 27.74 |

The consistent pairs are **18.8 / 31.7** (event scope — which is the distance the bib actually prints beside the time) and **16.5 / 27.7** (activity scope). Corrected to the event pair at both sites, with the trap recorded so the next reader does not re-derive the wrong one. **The conclusion survives untouched** — an unlabelled time still invites the wrong division, by an even wider margin than the comment claimed.

**4. `README.md`** now names the page by its heading and says plainly that "patch wall" is the URL and the metaphor, not a title.

## Test plan

- `pnpm test` **259/259**, `pnpm check` 0 errors / 0 warnings / 2 pre-existing hints, `pnpm eslint` clean
- Every corrected figure recomputed in code, not by hand
- Every wiki claim checked against the repo before editing: test names grepped in `tests/`, exports read from `constants.ts`, the CSS chunk count read from a fresh `dist/`
- `wiki.json` diff is **2 lines** — the rewrite preserved the file's existing formatting rather than reflowing it

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-28

## Review panel verdict — the correction PR needed correcting

Two dimensions on this PR (`82-facts`, `82-consumer`) returned **10 findings between them, 4 of them MAJOR**. Rebased onto `d1c7642`.

### The one that matters: my own fix was wrong

| sev | finding | verdict |
|---|---|---|
| MAJOR | **"18.8 km/h for a ride that moved at 31.7"** | I replaced a mixed-scope pairing and installed a worse one. `8:32:05` and `5:03:55` are **both the 140.49 km activity's clocks**, so `160.59 / 5:03:55 = 31.7` is a speed nothing rode — and the file said so 24 lines below. A judge bounded the event's real moving speed over any plausible escort pace at **25.4–28.9 km/h**, a band that brackets 27.7 and excludes 31.7. |

The original `18.8` vs `27.7` pairing is restored, with what was actually missing: a sentence saying the two figures **deliberately do not share a scope**, and that this is *why the clock must be named* rather than a defect in the comparison. A warning against re-deriving 31.7 is now in the file.

That also resolves the panel's second MAJOR — two `"9 km/h wrong"` siblings flagged as stale. They were stale only because of my edit. `27.7 − 18.8 = 8.9`, so **9 was right all along** and needs no change.

### The sweep only opened `repo_notes`

Every remaining stale claim was in the `pages` array, mostly in `purpose` — a field my own grep never read, which is why I reported the file clean.

| sev | claim | truth |
|---|---|---|
| MAJOR | `og:url` is origin-only **by design**; "never assert or describe them as equal" (3 places) | both are `Astro.url.href` and `BasicLayout.astro` carries a comment saying they agree — the note was **inverted**, telling a generator to write a falsehood |
| MAJOR | Architecture page pins the grid to `lg:max-h-[50rem]` and eight `1fr` rows | the exact ceiling #81 deletes to close a 1157.7px failure |
| MINOR | Styling page: "uno.config.ts declares no `theme` block at all" | it has had one since #65, and the Architecture page cites it |
| MINOR | Test Harness page: "exactly one stylesheet" + a repeat of the og:url warning | two chunks since `/patches` |
| MINOR | Deploy page: "why this repo has no GitHub Actions" | `strava-progress.yml` has shipped since plan 015 |
| MINOR | Content page: `progress_last_year` "rendered as a dash" | nothing renders it — the same claim this PR's own `repo_note` forbids |
| MAJOR | the Now explainer's "whole accessible name is `NOW.explainer_name`" | false the moment #83 lands; fixed here because this is the wiki's PR |

### Verification

`pnpm test` **259**, `pnpm check` 0 errors, `pnpm eslint` clean, `wiki.json` still valid JSON with its formatting preserved (the diffs are 6–7 lines, not a reflow). Every corrected figure recomputed in code.


---

<a id="pr-83"></a>

## #83 — feat(a11y): tell a screen reader when a link will open a new tab

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `54dc192ff` · `worktree-new-tab-announcement` → `main` · +236/−16 across 6 files

## Summary

Builds the thing decided last session and not yet built: the two links that open a new tab now say so to a screen reader. The tab itself stays — that was your call, and the argument is recorded in the code.

Independent of #81 and #82; different files, no overlap.

## Why the tab stays

The usual objection is that forcing a new tab destroys the back button. That rule has a **premise** — the reader needs to get back — and it does not hold here: the source page is never left, so closing or switching a tab is both cheaper and more certain than Back.

What it *does* leave is a reader who cannot see the tab open, finds Back does nothing, and is told nothing about why. **SC 3.2.5 (AAA)** and technique **G201** ask for the warning in advance. This is it.

## Where it goes, and where it deliberately doesn't

| link | announces | why |
|---|---|---|
| a race bib linking to Strava | **yes** | reads as page content, not as a link off-site |
| the Now card's `/now` explainer | **yes** | an information icon reads as a disclosure, not navigation |
| the six intro-card social icons | **no** | conventional for a social row, and six identical suffixes is exactly the noise G201's own guidance warns about |

The silence is gated too. Without an assertion the obvious "improvement" is to announce it everywhere, and nothing else on the page would catch that — every other test here is satisfied by *more* hidden text, not less.

## Position is the assertion, not presence

Appending to `PATCHES.strava_name` — the obvious implementation — puts the warning **third** in a 92-character name, because `.bib-strava` sits in the meta row and accname is assembled in DOM order. A presence-only check passes for that, so it would not be a gate.

It is a separate `sr-only` span, the anchor's **last child**, and the test pins `lastElementChild`. Read back off `Accessibility.getFullAXTree`, never `textContent`:

```
"12 JUL 2026 RIDE ON STRAVA 158.13 KM MBG DCR 2026 - KRABI TO PHUKET
 THAILAND ELAPSED 9:41:31 (opens in a new tab)"
"What's a /now page? (opens in a new tab)"
```

All 17 links on the two pages were read off the tree; the other 15 are unchanged.

## One of my own new assertions was vacuous, and a mutation found it

`it("says nothing on a bib that opens nothing")` read `doc.body.textContent`. A container render is a **fragment**, so linkedom leaves `document.body` empty while `documentElement` holds the markup — measured, **0 characters against 32**. The check passed without looking at anything, and survived a mutation that announced a new tab on a bib that opens none. Now read off `documentElement`, behind a guard that fails on an empty haystack.

`pnpm check` caught a second one: the tests used `state: "earned"`, which is not a `PatchState` — the values are `"finished" | "booked"`. They passed anyway because any non-`"booked"` value falls through, so `pnpm test` alone would have shipped it. This is why the build command is `pnpm check && pnpm test`.

## Test plan

- `pnpm test` **264/264** (was 259; five new), `pnpm check` 0 errors / 0 warnings / 2 pre-existing hints, `pnpm eslint` clean
- **7 mutations, 7 caught** — warning deleted from either link, appended to `strava_name` instead, moved above the time row, made unconditional, put before the explainer name, and added to the six social links
- Bib assertions render the component **directly with a synthetic event**, so coverage does not depend on the calendar holding a linked race — the January-vacuity trap this file already records twice
- **15 simulated bot pushes**: 14 green, the only red being the labelled year-rollover tripwire
- **Wall sweep 0 loss**, home sweep unchanged from `main` (the documented 48.16px residual at 320px / root 40) — new `sr-only` text is exactly what has faked loss in this repo before, so both sweeps were re-run with the visually-hidden exclusion

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-28

## Review panel verdict — nine mutations, two survived

`83-a11y` and `83-tests` ran nine mutations against this branch. Seven were caught. Two were not, and both let the page keep announcing something untrue with all 264 tests green. Rebased onto `d1c7642`.

| sev | finding | evidence | fix |
|---|---|---|---|
| MAJOR | **Nothing asserted the explainer actually opens a new tab** | delete `target="_blank"` from `Now.astro` and the page still says a new tab will open, on a link that navigates in place. The judge proved the mutation applied by reading the shipped markup, not the exit code | one assertion; the bib was already gated twice, its home-page twin was not |
| MINOR | **`aria-hidden="true"` on the notice deletes the feature** | measured **0 of 17 links announce** with it, 3 without — and all five new assertions stay green, because they read `textContent` and class tokens | gated on both pages, and on the **pre-existing name span** too: hiding that leaves the link with an *empty* accessible name, which nothing caught before |
| MAJOR | `explainer_name` documented in four places as "the link's **whole** accessible name" | this PR appends a second span — and the comment it added justified that by citing the very sentence it invalidated, a circular chain a maintainer could follow into lengthening the wrong string | it is the **subject half** now, with the announced result written out |
| MINOR | the silence rationale calls all six intro-card links "social" | `/resume.pdf` is same-origin and not a profile | keeps the silence for a different, named reason |

**Deliberately not taken:** the finding's "better" anchor-walk. Written the obvious way, `includes(NOTICE) === (target === "_blank")` goes **red on the six intro-card links**, which all open new tabs and are deliberately silent — a gate that fails on correct code. One-announcer plus that-announcer-has-target is already the biconditional, using an assertion that exists.

**Bounded honestly:** linkedom computes no accessibility tree, so these gates cannot police `hidden`, `display:none` or `role=presentation`. Those need the browser-driven AX read this PR describes, and the limit is stated in the test.

### Verification

`pnpm test` **264**, `pnpm check` 0 errors, `pnpm eslint` clean. **Re-mutated after the fix: all five survivors now red, and both originally-red directions still red.** Accessible names re-read off `Accessibility.getFullAXTree` on the deployed preview — all three links announce, warning last.


---

<a id="pr-84"></a>

## #84 — docs(claude): cut what the repo already says, and name the commands it does not

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `c55d00495` · `docs/claude-md-trim-and-commands` → `main` · +14/−56 across 1 files

## Summary

`CLAUDE.md` loads into context on every session in this repo. This trims the part
a fresh agent can rebuild from the codebase itself, keeps the part the code cannot
teach, and adds the commands that were genuinely missing.

**5944 → 4755 bytes, 127 → 84 lines.**

## What was cut, and why it is safe

Each removed block was verified derivable against a real file in this repo:

| Cut | Reconstructible from |
|---|---|
| `pnpm dev/build/check/test/eslint` list | `package.json` scripts |
| Framework / Styling / Icons / Deployment bullets | `package.json`, `astro.config.mjs:12` |
| `### Component Structure` | `ls src/components` |
| `### Configuration & Content` | restated by `## Content Management` + `## Memories` |
| 7 constants glosses (LINKS, CAREER, ABOUT_ME, GOALS, WELCOME, NOW, METADATA) | `src/lib/constants.ts` |
| `## Deployment` | `netlify.toml`, `public/robots.txt`, `@astrojs/sitemap` |

Kept, because the code cannot explain them: the patch-vs-bib definition, the whole
`### Styling System` and `### Layout Hierarchy` bodies, the 4.4px height budget, the
derived-never-stored rule for patch state, the `## Memories` three-homes rule, and
the `NEXT_RACE` / `EVENTS` / `PATCHES` entries that carry rationale.

## What was added

A `## Commands` section, because the doc cited `page-fit` / `card-fill` /
`build-output` as change gates without ever saying how to run them:

- `pnpm test` runs `pnpm build` first via `globalSetup` in `vitest.config.ts`, and
  honours `SKIP_BUILD=1` (`tests/setup/build.ts:20`) to reuse an existing `dist/`
- the scripts are `eslint` and `check` — `lint` and `typecheck` do not exist, and
  guessing them exits non-zero, which reads as "no linter configured"
- Netlify builds with `pnpm check && pnpm test` (`netlify.toml:20`)

Three headings were renamed or folded so none describes content that no longer
sits under it: `## Development Commands` → `## Local Preview`, the
`## Tech Stack & Architecture` heading folded into `## Key Architecture Points`,
and the Content Management intro now signals its list is deliberately partial.

## Known issue this PR does NOT fix

A reviewer found a pre-existing factual error in the `### Styling System` bullet,
untouched by this PR. It claims `tests/page-fit.test.ts` and
`tests/card-fill.test.ts` forbid an absolute length for the **control box**. They
do not — neither file contains a control-box assertion. The real gates are
`tests/control-geometry.test.ts:153` (the `control` shortcut, width and height) and
`tests/rendered-html.test.ts:512` (`.events-link` min-height). `uno.config.ts`
already points at the right file, so `CLAUDE.md` contradicts the source it is
summarising. Left for a separate change since it alters what an existing sentence
asserts.

## Test plan

- [x] Documentation-only; no source file touched (`git diff --stat` = `CLAUDE.md` alone)
- [x] Every cross-reference in the surviving text resolved against its target file
      (`uno.config.ts:41-77`, `page-fit.test.ts:12-61`, `BasicLayout.astro:231`,
      `Goal.astro:29-56`, `constants.ts:598`, `README.md:66`)
- [x] Every factual claim in the new `## Commands` section verified against
      `vitest.config.ts`, `tests/setup/build.ts`, `package.json`, `netlify.toml`
- [x] `### Styling System`, `### Layout Hierarchy`, `## Project Overview` and
      `## Memories` byte-compared against `HEAD` — unchanged

🤖 Generated with [Claude Code](https://claude.com/claude-code)


## Review fixes (second commit)

A review panel plus manual verification found three defects in the section this
PR adds. All three are fixed on the branch:

- the `globalSetup` pointer stopped at `vitest.config.ts`, which only declares the
  hook — `pnpm build` and `SKIP_BUILD` both live in `tests/setup/build.ts:20-21`,
  so a reader following the pointer found neither. Now points at both
- `## Local Preview` was a one-command section adjacent to `## Commands`; preview
  is now a third bullet there, and the separate heading is gone
- restored the `# CLAUDE.md` H1 (the filler sentence under it stays cut)

`### Styling System`, `### Layout Hierarchy` and `## Memories` were byte-compared
against `e96ea12` after the fixes — unchanged.


---

<a id="pr-85"></a>

## #85 — fix(a11y): draw every link so a reader can tell it is one

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `a858d078f` · `worktree-worktree-link-affordance` → `main` · +725/−103 across 10 files

**Before/after with the measurements:** https://claude.ai/code/artifact/7852fc58-a905-4479-9909-8b85d693bc57
**The six options this was chosen from:** https://claude.ai/code/artifact/e369f832-f525-474d-a88c-727727dc36cb

## Problem

Two friends reviewing the site did not know `My running events ›` / `My cycling events ›` could be clicked, and did not know a bib could be — then could not tell which bibs were.

Both are one defect: **a text link on this site was drawn identically to the sentence beside it.** Measured on the shipped build at 1024×600, the goal-card control against the figure line directly above it — `rgb(250,250,250)` vs `rgb(250,250,250)`, 12px vs 12px, no decoration. **A contrast ratio of 1.00:1 between a link and a sentence**, with a 13px chevron the whole of the difference. On the bib, the entire "clickable" signal was a **7.5×10px glyph — 0.16% of a 324×141px bib** — monochrome, unlabelled, its only words `sr-only`. Both reports came from phone screenshots, where the hover colour, the only other cue either had, cannot happen.

Auditing the class found **five** instances. The worst went unreported because nobody could guess it was a link: the company name on each role card carried exactly `text-xs font-light`, the same two classes as the date line above it.

## Solution

**`text-link`, a second UnoCSS shortcut beside `control`** — the site had two kinds of control all along and had only named one. Worn by the goal cards' way out, the wall's Home link, and the role cards' company name, so the three cannot drift apart.

**The bib says it opens the ride in its own idiom.** The mute glyph is replaced by a labelled action row at the foot of a linked bib — `View on Strava` — introduced by a **tear-off perforation**. A race bib is perforated above the stub carrying your result, which is exactly what the Strava recording is, so the device encodes something true rather than decorating.

Deliberately **no text decoration on the bib**: that is web vocabulary on a printed artifact whose every row is undecorated, and it would advertise 15px of ink as the target when the whole 260px bib is the anchor. What carries it instead is bib-native — an imperative verb phrase, the brand glyph, and full ink at the bib's emphatic weight against four captions dimmed to 0.8.

**Two pre-existing defects found while measuring:**
- `.bib-tag` — "Booked", the sole text carrier of a bib's state — escaped the bib by **31.45px at a 44px root and 63.11px at 48**, and had since it was written. Now 0/0.
- Both mode blocks in `Patch.astro` sat *above* four plain rules despite a comment claiming they were at the foot of the sheet. The action row's print override measured **dead** in the built stylesheet (offset 3680 vs a base rule at 3955).

## Test plan

`pnpm check` 0/0/2 pre-existing hints · `pnpm eslint` clean · **suite 259 → 264** · Netlify preview green.

New: a build-wide gate walking every `<a>` on every page requiring a perceivable signifier — the assertion whose absence let all five ship. **10 of 10 mutations caught, 0 survived**, including two that guard this specific design decision (a decoration returning to the bib; the row drifting to caption weight).

Measured over raw CDP, both builds served side by side, instrument calibrated against this repo's four recorded figures first *and* in the negative direction (the `lg` gate is confirmed to exclude a non-`lg` configuration, so a clean run cannot mean the probe measured nothing):

| | before | after |
|---|---|---|
| goal card height | 232.8px | 232.8px |
| stack unspent height | 4.41px | 4.41px |
| Now card | 154px | 154px |
| boxes moved under `main` | — | **0** |
| home-page ink past a clip edge, roots 16–40 | 0 | 0 |
| "Booked" escaping a bib @ root 44 / 48 | 31.45 / 63.11px | **0 / 0** |
| bib accessible name | 92 chars, CTA 3rd | 97 chars, CTA last |
| linked bib height | 146.2px | 173.2px |

Keyboard focus verified on all four link kinds (none suppressed, no `outline: none`). Forced colours and print both redraw the perforation as a dashed border, since a background image is discarded there.

## Deliberately not done

- **No wording changes.** `My {sport} events` is the destination page's own `h1`, gated both ways.
- **No offset plate on a linked bib** — the open question from Run 5, now answered: a `box-shadow` dies in forced colours and print, where the perforation survives.
- **The whole bib stays the anchor.** The block-link alternative shrinks the visible cue to 11px of race name and the tap target to ~120px, on the device both reports came from.
- **Two smaller escapers recorded, not fixed:** `.bib-word` ("Ride") at 9.22/38.84px and a `<time>` at 6.91px, both pre-existing and unchanged. Their remedy breaks a three-letter word mid-word — a legibility trade, and the owner's call.

## Review

A 12-agent panel ran over the plan before implementation (18 findings → 6 verified → 0 confirmed, 6 downgraded); its corrections are in the diff. The bib treatment was then chosen by the owner from **six options rendered on the real component and measured**, after he rejected the first attempt as breaking design convention — which it did, twice over.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## Review panel (13 agents) — outcome

**23 findings → 6 verified → 2 CONFIRMED as blockers, 4 downgraded, 0 refuted.** Both blockers were mine, and both were invisible to the suite: each mutation survived a full green run before the fix.

1. **The new gate accepted a hover-only border** — the exact defect it exists to catch, since a hover cannot happen on the phones both reports came from. Deleting the filter chips' permanent border left the suite green at 264/264. It also matched `.patch-filter-count`, a sibling that draws nothing, because `\b` treats the hyphen as a boundary. Fixed in both signifier probes.
2. **The `underline` blocklist rationale cited a declaration that no longer exists** — true when written, then falsified by the owner's own rejection of a decoration on the bib, and never revisited. The entry still earns its place on the English-word reason alone.

Three more the skeptics under-rated, all fixed:

3. **The role-card link presented 182px of navigating card for 45px of ink** — a flex item of a column with no cross-axis control, the trap `EventsLink.astro` documents and fixes locally. Harmless while nobody knew it was a link; *making it visible is what turned it into a defect*. `self-start` folded into the shortcut, plus a gate on the shortcut's own rule — the existing assertion reads `.events-link`, which keeps its own `align-self`, so the shortcut could lose it with the suite green. Measured: **box 182 → 45px, exactly its ink**.
4. A stacked draft of one comment survived a scripted edit.
5. `Patch.astro` still described "the Strava mark in the meta row", which this PR moved.

**Upheld against the panel, on the chair's advice:** the mode-block ordering finding was downgraded — a match-based scan found **zero dead overrides** across all four bib states, so the two remaining blocks stay where they are (moving them is refactor risk for no rendering change, and the proposed order gate would red-light legal CSS inside Netlify's build command).

**Two real builds rect-diffed across 36 configurations** (9 viewports × 4 root sizes, 3,542 element-reads): on the home page exactly **two elements change, both career anchors, width only** — no x, no y, no height, nothing else.

**13/13 mutations caught**, including the three that previously survived.

**Cross-PR:** #85 and #81 conflict in exactly one line — both add different imports to the same statement in `tests/build-output.test.ts`. Resolution is mechanical: `import {decl, pageCss, parseRules, splitSelectorList} from "./helpers/css";`


---

<a id="pr-86"></a>

## #86 — docs(claude): correct three claims the repo contradicts

`merged` · opened 2026-07-28 by **calvindotsg** · merged 2026-07-28 as `d1c7642d4` · `worktree-claude-md-gate-attribution` → `main` · +15/−8 across 1 files

## Summary

Three claims in `CLAUDE.md` that the repository contradicts. Every premise was
re-checked against the working tree before editing; one item from the original
list is **deliberately not here** because an open PR already fixes it.

## 1. The control box is gated somewhere else entirely

The `### Styling System` bullet named `page-fit` and `card-fill` as forbidding an
absolute length in four places. They do gate **three** of them — the breakpoints
(`page-fit:366`), `<main>`'s height budget (`page-fit:279`) and the heading's
space (`card-fill:429`, `card-fill:595`). They say nothing about the control box.

All nine occurrences of `control` across those two files are comment prose about
the **intro card's control row**, a different thing:

| file | lines |
|---|---|
| `page-fit.test.ts` | 17, 19, 111, 380 |
| `card-fill.test.ts` | 227, 234, 259, 265, 497 |

The actual gates:

- `tests/control-geometry.test.ts:153` — *"sizes that box in the reader's text, not in device pixels"*, the `control` shortcut's own width **and** height
- `tests/rendered-html.test.ts:512` — *"sizes the control in the reader's own text, never in device pixels"*, `.events-link`

`uno.config.ts` has pointed at `control-geometry.test.ts` all along (lines 184,
207, 263), so the file contradicted the source it summarises. The cost is
concrete: an agent re-pinning `.events-link` min-height to `24px` was sent to two
files that never mention it, finding neither the rationale nor the failing
assertion.

## 2. Two goal cards, not one

"cycling goals" → "his cycling and running goals". `RAW_GOALS` carries
`sport: "running"` and `sport: "cycling"`; `type Sport = "running" | "cycling"`;
`index.astro:154` maps over both.

## 3. A clean `pnpm eslint` is less coverage than it reads as

The script globs `src/**/*.{js,astro}`, so it never opens `constants.ts`,
`projection.ts`, `icons.ts` or `env.d.ts`. **Measured, not assumed** — a type
error appended to `src/lib/icons.ts`:

| gate | result |
|---|---|
| `pnpm eslint` | green, exit 0 |
| `pnpm check` | **1 error**, exit 1 |

So the note says what *does* gate those files (`astro check`, tsconfig `include:
["**/*"]`, plus the suite) rather than implying nothing does. This documents the
coverage story; it does not propose changing the glob.

## Deliberately not included

**README.md's "Three suites, all under `tests/`"** (there are 10). Already fixed
by **#82**, which rewrites that line to "Ten suites … plus shared helpers" and
removes the exact count from prose. Fixing it here too would collide with a PR
that has it right.

## Blast radius

Four PRs are open and all four are based on `e96ea12`, one commit behind `main`.
Test-merged this branch against every one of them with
`git merge-tree --write-tree`:

| PR | touches | vs. this branch |
|---|---|---|
| #81 | `CLAUDE.md` (`### Layout Hierarchy`) | clean |
| #82 | `README.md` | clean |
| #83 | — | clean |
| #85 | `CLAUDE.md` (`### Styling System`, the UnoCSS bullet) | clean |

#85 edits the bullet immediately above this one and #81 the section below; both
merge without conflict. This branch does not restate the 4.4px stack budget that
#81 retires.

## Test plan

Run in the worktree with its own `node_modules`, after a first attempt silently
proved nothing (`astro: command not found` swallowed by `tail`):

- `pnpm test` — **259/259**, 10 files
- `pnpm check` — 0 errors, 0 warnings, 2 pre-existing hints
- `pnpm eslint` — clean
- Both halves of claim 3 mutation-tested, then the mutation reverted and the tree
  confirmed clean

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-28

## Review panel verdict — 5 agents, 12 findings, all judged true

Four lenses (fact-check-new-sentences, staleness/collision, authoring standards, omissions)
plus one skeptic judging **truth only**, with `worth_fixing_before_merge` kept as a separate
boolean so scope could never masquerade as falsity.

**Instrument calibration:** two controls were planted in the skeptic's input — a known-true
claim and a known-false one. It returned `CONTROL-A: true`, `CONTROL-B: false`. Both correct,
so the 12/12 truth rate is discrimination rather than a rubber stamp.

### Fixed in `956093f` — both defects were in text this PR itself added

| # | finding | proof |
|---|---|---|
| F1/F7 | `card-fill.test.ts` **does** gate the control box — its in-card ban forbids an absolute *height* on every element inside a card, and a control is inside a card. "in the first three" understated it. | `h-12`→`h-[48px]`: card-fill:641 **and** control-geometry fail. `w-16`→`w-[64px]`: only control-geometry fails, page-fit and card-fill green. Height gated twice, width once. |
| F2/F3 | `.events-link` is **not** the control box and must not be filed under it. | `EventsLink.astro:23` — *"that shared idiom is also why there is no box here"*. It carries no `control` class and is absent from the signature set `control-geometry` derives. The two gates assert opposites: `control-geometry` requires a declared width **and** height; `rendered-html:522` requires `.events-link` to declare **no** height. |

The bullet now says the height is gated twice and the width once, and treats `.events-link`
as its own idiom — no box, a font-relative floor.

### True, deliberately not fixed here

- **`README.md:69` and `:109` carry the same cycling-only framing** (`:109` also mis-describes
  `constants.test.ts`, which loops both goals). Recorded as *"taste-tier; not planned"* in
  `plans/README.md:244` — and worth noting that rejection's stated reason was *"CLAUDE.md is
  correct"*, which was **false when written**: `CLAUDE.md` said "cycling goals" from its first
  commit `844310a` until this PR. This PR makes that reason true for the first time. #82 owns
  README and does not touch either line.
- **"clamp" survives #81** — its `index.astro:164` keeps a literal
  `lg:min-h-[clamp(46rem,100vh,50rem)]`, so the word stays accurate. Checked because I had
  planned to change it; the panel's verdict stopped a change for the worse.
- **`scripts/fetch-strava-progress.mjs` is read by neither `eslint` nor `astro check`** —
  true, and outside the note's `.ts` claim.
- **`"All site content is managed through src/lib/constants.ts"`** is false in both directions
  (`src/data/strava-progress.json` supplies both hero figures; `public/llms.txt` ships
  unrouted). Pre-existing, and it alters what an authored sentence asserts.
- **`"one screen at the default text size"`** is false below a 736px-tall lg viewport. #81
  rewrites exactly this sentence.

### Gates after the fix

`pnpm test` **259/259** · `pnpm check` 0 errors / 0 warnings / 2 pre-existing hints ·
`pnpm eslint` clean · test-merged clean against #81, #82, #83, #85.


---

<a id="pr-87"></a>

## #87 — feat(patches): keep every race on the wall, and name the earned bib

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `45e286f5a` · `worktree-016-lifetime-patch-wall` → `main` · +515/−130 across 9 files

## Summary

Two maintainer asks: **show every bib, not just this year's**, and **call the solid bib a Finisher Patch**.

The wall showed one year because `EVENTS` held one year — the January checklist in `constants.ts` said, in as many words, to delete last year's races. It keeps the whole calendar now, and the earned bib has a name.

## Problem

`EVENTS` feeds two consumers whose scopes were identical only by accident.

`bookedAhead` subtracts every un-run race from the year's deficit. Add one race booked for next November and it pays off **this** year's requirement — measured at the live stamp, a single 1,022 km 2027 tour takes the cycling card from **"71 km/wk to go" to "25 km/wk to go"**: 46 km/wk understated, silently, under a heading that says *this year*. So the wall could not become a lifetime wall until the projection stopped reading the wall's list.

## Solution

**One scope rule**: *the wall is the whole calendar; a goal card is `GOAL_YEAR` alone.*

Applied as **defaults** in `projection.ts` — the five functions a goal card reads default to `eventsInYear(GOAL_YEAR)`, the two the wall reads default to all of them. The `events` parameter still means "these events, whatever you pass", so every fixture-driven test is untouched and the year lives where `GOAL_YEAR` already lived (`daysRemaining(iso, year = GOAL_YEAR)`). A race belongs to the year it starts in; an unparseable date falls out of the year, which is the safe direction — a missing race makes the required rate *higher*, never lower.

**The copy loses more than it gains, and that is the maintainer's call.** The lede's scope sentence ("Every race I have entered this year") said nothing the heading *My events* and a filter row reading `ALL 9 / RUN 3 / RIDE 6` had not already said, so it is **gone rather than reworded** — and `· 2026` is out of the `<title>`. What survives is the one thing neither the heading nor the bibs say:

> The outlines are races still ahead of me; every one I finish becomes a Finisher Patch.

Phrased as a rule, not a caption, so it stays true on a wall with nothing earned yet and on one with nothing left booked. The meta description keeps its per-page narrowing — a crawler reads it with no heading beside it, which is the one place the claim has nothing to lean on.

**No tag on the earned bib** to mirror `BOOKED`. You mark the exception, not the norm, and with a lifetime calendar the earned bib is the majority — a word repeated on nine bibs in ten is noise. Both options were drawn before this was decided.

## Evidence

**The suite is green against a real four-year calendar.** Three races (2024, 2025, 2027) added to `EVENTS`: 9 bibs render across four years, in the right two runs, and **the goal cards are byte-identical** — `17 km/wk to go / Next race in 8 weeks` and `71 km/wk to go / Next race in 5 days`, with and without the extra years.

| Mutation | Result |
|---|---|
| `bookedAhead` default reverted to `EVENTS` (with off-year races present) | red — wiring assertion, names the sport |
| `eventsInYear` filters nothing | red — 9 assertions |
| "this year" back in the lede | red — the year gate, quoting the string |
| `· 2026` back in the title | red — the year gate, quoting the page |

That simulation also caught a defect in **my own new tests**: they were built as `[old, ...EVENTS, next]` and compared against `EVENTS`, so they went red on correct code the moment the calendar spanned years. Fixed in the second commit — the fixtures own their races now.

Suite **270 → 277**. `pnpm check`, `pnpm eslint` clean.

## What this does NOT do

**No past races were added.** They are not in this repo (`git log -S"2025-"` over `constants.ts` finds nothing) and Strava's per-activity pages are login walls, so there was nothing to recover and I did not invent any. Adding them is now a pure data edit — append to `EVENTS` in date order and they appear as Finisher Patches, contributing to no projection. `elapsed_time` and `strava_activity_id` are optional, so a race remembered without a recording is still a complete bib.

## Test plan

- [x] `pnpm check && pnpm test` — 277 passed, 10 files
- [x] Every new assertion mutation-tested (table above)
- [x] Whole suite green against a simulated 2024–2027 calendar
- [x] `/patches` rendered and read in the browser: heading, lede, filter counts, both bib treatments, four years in the correct order
- [x] Home page goal cards diffed with and without off-year races — unchanged

## Review

A five-lens adversarial panel (14 agents: five reviewers, one skeptic per finding instructed to refute) raised 11 findings; 6 were refuted, 2 dropped unjudged by the severity cap, 3 survived. All three are fixed in `c77ba21`.

**The one that mattered.** A lifetime calendar takes `RaceEvent.name`'s uniqueness away, and six built-page assertions were using it as a lookup key. An annual race entered two years running gives two events the same name, so `.find()` returns the first edition for both bibs. Confirmed by measurement, not argument — a 2025 *Round the Island Bike Adventure* beside the 2026 one:

```
× says 'booked' in words on exactly the bibs the calendar calls booked
  expected 'Booked' to be null
× prints every distance to two decimals
  Round the Island Bike Adventure distance: expected '121.98' to be '118.50'
```

Entirely correct data, and `netlify.toml` runs this suite as the **build** command — so that is a failed production deploy caused by exactly the data edit this PR's own rewritten January checklist now asks for. Fixed as a class: one `wallBibs` helper pairs each bib to its race by **position**, which is not a new assumption (the wall's DOM order *is* `patchWall`'s order, and a test already asserts it bib by bib). The obvious alternative — gating `EVENTS` for unique names — would have been wrong, since it forbids the data the wall now exists to keep.

Verified both ways: with the backfill the suite goes **2 failed → 277 passed**, and an off-by-one in the helper reddens **all six** sites, so none is vacuous.

**Two claims the code contradicted**, both in prose this PR added: the scope block said `patchState` "defaults to all of them" (it takes one race and no list, so it has no scope), and `patchesEarned` justified year-scoping by pointing the lifetime figure at the wall's filter row — which counts races *entered*, outlines included, not patches earned. The decision stands; the reason given for it did not. `.devin/wiki.json` still told its generator `/patches` was "a wall of the year's races".

**Refuted, and worth recording as measured negatives** so they are not re-proposed: the wiring assertion being an identity today (real, self-documented, and no formulation discriminates until an off-year race lands); the cross-consumer sweep's explicit `[event]` (pre-existing at `a858d07` — this PR adds only the comment above it); the deleted `scope_*` strings (a net coverage *gain* — base had no meta-description assertion at all); and the un-tagged earned bib (state is carried in text and in a full printed year, and the fill/outline distinction is luminance and shape, not hue).

**Rollover simulation.** `GOAL_YEAR = 2027` with no races yet entered for it: cards render `N km/wk to go` + `No races booked` — no NaN, no empty line, no "0 patches earned" — and the wall keeps its 2026 bibs. Under the base code the same state prints a lifetime `6 patches earned` beneath a heading reading *this year*, so the split measurably improves the January state too.

`NEXT_RACE.earned` deliberately keeps "{count} patches earned": "Finisher Patches" is roughly double the ink against a recorded 182px row budget, and the card's count is year-scoped, so stamping the lifetime object's proper noun on it would make the mixed-scope reading worse.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-88"></a>

## #88 — docs(plans): re-measure the README baseline at 45e286f for run 4

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `d5da2aaf7` · `advisor/run4-rebaseline` → `main` · +30/−5 across 1 files

## What

Run 4's first plan-writing act: re-measure `plans/README.md`'s baseline, which still described the pre-`/patches` one-pager (3 test files, 21-line uno.config, 53 assertions).

Measured fresh at `45e286f` (2026-07-29): **277 assertions / 10 test files**, 14 `.astro` files building **4 pages**, 506-line `uno.config.ts`, per-page weights (local gzip -9 and production brotli, `content-encoding` confirmed, 3 identical samples per URL), and the `pnpm audit` movement to **1 moderate + 2 high** (addressed by plan 017, arriving in the next PR).

Docs-only; no page bytes change — Netlify should note `Pages changed: skipping` or an unchanged deploy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-89"></a>

## #89 — docs(plans): record the run-4 audit and add plans 016–017

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `9066d6ad4` · `advisor/run4-plans` → `main` · +518/−2 across 3 files

## What

Run 4's audit record and its two surviving plans.

**Audit shape**: 9 read-only opus auditors (playbook categories + the three directed leads), 1 opus skeptic per finding. Seven categories returned zero findings; two survived vetting.

**Leads resolved with evidence** (full detail in `plans/README.md` § Run 4):
- **Simplification pass**: zero findings — every plausible simplification is refuted by a measured comment already in the file. Near-misses recorded so they aren't re-derived.
- **UnoCSS/CSS**: zero findings — every post-run-3 class traced authored→worn→emitted; nothing orphaned or cancelled.
- **/patches loading time**: no problem exists — ~11.9 KB brotli cold visit (3 identical samples/URL), Lighthouse perf 0.95–1.00 across 3 runs × 3 URLs, TBT 0. Both suspected mechanisms (per-bib CSS growth, stylesheet split) refuted with dist evidence.

**Plans added**:
- **016** — stop shipping ten `<!-- -->` rationale comments in built HTML (4,311 B raw per patch page, ~45–50% of compressed markup; convert to Astro `{/* */}`, add a no-HTML-comments gate).
- **017** — in-range lockfile refresh clears one of two new brace-expansion HIGHs (GHSA-mh99-v99m-4gvg); the jsx-a11y path is unclearable (no patched 1.x; override measured-broken) and becomes a documented residual.

Docs-only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-90"></a>

## #90 — perf(html): stop shipping rationale comments in built pages

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `c3734b121` · `advisor/016-stop-shipping-rationale-comments` → `main` · +24/−18 across 5 files

## What (plan 016, run 4)

Ten HTML-form (`<!-- -->`) rationale comments in four `.astro` templates survived the build and shipped on every page — 4,311 raw bytes per `/patches` page (~45–50% of the compressed markup on the smallest page), 5,970 B on `/`. This converts them to Astro's `{/* */}` form (stripped at build; `Patch.astro`'s existing convention), **preserving every byte of prose** — the word-diff touches only comment markers. A new build-wide gate in `tests/build-output.test.ts` fails the deploy on any `<!--` in a built page.

## Measured (local, gzip -9)

| Page | before | after |
|---|---|---|
| `/` | 6,564 B | 4,209 B (−36%) |
| `/patches` | 4,000 B | 2,173 B (−46%) |
| `/patches/cycling` | 3,901 B | 2,081 B (−47%) |
| `/patches/running` | 3,609 B | 1,779 B (−51%) |

Stylesheets and every other asset unchanged. Suite 277 → 278 (the new gate).

## Verification

- Full ladder green in the executor's worktree and re-run by the reviewer: `pnpm check` 0 errors, `pnpm eslint` clean, `pnpm test` 278/278.
- Mutation-tested twice, independently: an own-line `<!-- probe -->` reddens exactly the new gate; a probe glued to a tag is stripped by the compiler itself (nothing ships → gate rightly green). Both probes removed; final run green.
- Predicted markup delta: comment removal only. The deploy preview should differ from production by exactly the comment bytes on the 4 HTML pages.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-91"></a>

## #91 — docs(plans): mark 016 DONE

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `dbe7a7ed8` · `advisor/016-index-done` → `main` · +1/−1 across 1 files

Index row update: plan 016 merged as `c3734b1` (PR #90). Preview-vs-production diff was comment-removal only; visible text identical on all four pages; suite 278 green on main.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-92"></a>

## #92 — chore(deps): refresh lockfile in-range, clearing one brace-expansion HIGH

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `6647c3149` · `advisor/017-brace-expansion-refresh` → `main` · +227/−263 across 1 files

## What (plan 017, run 4)

`pnpm update --no-save` — lockfile-only, `package.json` untouched. Clears one of the two brace-expansion HIGHs (GHSA-mh99-v99m-4gvg): `minimatch` 10.2.5 → 10.2.6 pulls `brace-expansion@5.0.8` on the typescript-estree/eslint paths. Side-effect in-range bumps: astro 7.1.3 → 7.1.5, @astrojs/check 0.9.9 → 0.9.10, eslint 10.7.0 → 10.8.0.

**Audit posture**: `1 moderate | 2 high` → **`1 moderate | 1 high`**. The remaining HIGH (`eslint-plugin-jsx-a11y → minimatch@3.1.5 → brace-expansion@1.1.16`) is a **deliberate residual**, documented in `plans/README.md`: the advisory's only patched release is 5.0.8 (no patched 1.x exists), jsx-a11y@6.10.2 is its latest release, and an override was built and measured to break at runtime (`brace-expansion@5`'s CJS entry is a namespace object; `minimatch@3` calls it → `TypeError: expand is not a function`). Dev-only path; the deploy gate never runs eslint. It clears the day jsx-a11y ships off minimatch@3.

## Verification

- Ladder green in the worktree, executor and reviewer both: `pnpm check` 0 errors, `pnpm eslint` clean (the functional test of the refreshed minimatch graph), `pnpm test` 278/278.
- `dist/` byte-identical before/after the refresh (same page byte counts, same hashed CSS filenames) — Netlify's "Pages changed" check should report skipping/zero.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-93"></a>

## #93 — docs(plans): close out run 4 — archive 016–017 with evidence

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `338bb287d` · `advisor/run4-closeout` → `main` · +89/−3 across 4 files

Run-4 closeout: plan files moved to `plans/done/`, per-plan verification log appended to `done/README.md` (mutation checks incl. the Astro glued-comment stripping behaviour, preview-vs-production diffs, production before/after brotli), index updated — both plans DONE, nothing executable, numbering continues at 018.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-94"></a>

## #94 — feat(goal): make the way out a labelled CTA, not a run of words

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `c61ee7e4b` · `worktree-goal-cta` → `main` · +870/−147 across 7 files

## Summary

The goal cards offered their events as an underlined run of words with a 13px chevron. Two reviewers had already failed to read it as a link; #85 closed the "this is a link" half with the underline and left the other half open — on a card whose one job is a figure, the way out was still prose a reader had to notice. It is now the card's one **action**, drawn the way this site draws an action.

**Seven variants rendered from the real page, scored, and the shipped one:** https://claude.ai/code/artifact/4b94a568-d006-4a2c-a4e5-27a018e42d90

## Problem

`My cycling events ›` was a `text-link` — 115x24px of underlined prose in a 182px card. The underline distinguishes it from the sentence above it; nothing makes it read as the card's call to action.

## Solution

A full-width plated 48px `control-cta`: the label, then `ri:arrow-right-line` at the far edge, on the same accent border, offset plate and press affordance as the intro card's controls.

Icon-only was the literal request. It was built, rendered and **rejected on evidence**: no glyph names "my cycling events", and dropping the label would also silently drop the control-to-heading pairing `build-output.test.ts` asserts in both directions. A leading calendar glyph was also built and rejected — it restates the word "events" standing beside it, while the arrow carries what the words cannot (that the press leaves the card).

`ri:arrow-right-s-line` becomes `ri:arrow-right-line`: a chevron sized to sit inside 12px prose reads as a leftover alone at the edge of a 48px box, and the full arrow mirrors the wall's `arrow-left-line` way back.

## Measurements

| | before | after |
|---|---|---|
| goal card, 1024x797 | 232.8px | 256.8px |
| `main` | 797px | **797px** |
| control | 115.5 x 24 | 182 x 48 |

**3rem is the LAST height that is free.** The right-hand stack's height is set by the taller left column, so it carries slack; at 3.5rem `main` goes to 807.59 and the page starts to scroll.

**The seven pre-existing controls are byte-identical** (box, border, plate, radius, font-size, colours, transition) across 4 viewports x 2 themes — so restoring `control-surface` as a shared base is a pure factoring. The base `uno.config.ts` retires by name was never the defect; three *capped* boxes were.

Border 13.22:1 dark / 6.81:1 light vs the button fill. Focus outline 12.55:1 / 6.52:1 vs the card. The arrow still paints in forced colours at 13.99:1.

## The defect the browser sweep caught

Everything at the default text size was clean. A **root font-size sweep** found the first draft clipping its own label:

```
ink lost past the card's right edge, 1024x797
root      16   20   24   28   32   36    40
was        0    0    0    0    0    0     0    the run of words this replaced
draft      0    0    0    0    0  12.7  42.2   a 3rem box, bare text node
ships      0    0    0    0    0    0     0
```

Structural, not a slip: a button spends padding, a gap and a 1em mark on chrome, while these cards get *narrower* as the root grows (their own padding is font-relative). Three fixes, each necessary — the label in its own element with `min-width: 0` (a bare text node is an anonymous flex item no selector can reach), `overflow-wrap` beside it, and a height **floor** plus `flex-wrap` so the box grows instead of spilling.

**Not fixed, stated plainly:** at a 32px root (WCAG 1.4.4's 200%) the control is 202px tall where the run of words was 96. No content is lost and the page scrolls, so the criterion is met — the box is simply the more expensive object at that setting.

## Test Plan

- `pnpm test` 281 passing (was 278), `pnpm check` and `pnpm eslint` clean
- `control-geometry.test.ts` went from a two-kind world to three, partitioned on the **declared width** rather than a class name so it inherits the surface discovery: `100%` is a label control, a length is an icon control, and anything else (no width, a cap, `max-content`) still fails
- Shared height and shared border moved to an assertion covering **every** control — where the 40px-tall toggle defect actually lived
- **11 mutations run against the new gates, all killed** (no `justify-between`; `h-14`; `w-max`; unmeasured focus colour; no border; unpinned glyph; no `control-cta` class; no `forced-color-adjust`; pinned height; `break-word` for `anywhere`; no `overflow-wrap`)
- Browser sweep: 6 lg viewports x 2 themes, root sizes 16-40, widths 390-1920, forced colours, `:focus-visible`

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-29

## Review panel: 6 dimensions, 20 agents, 1.64M subagent tokens, ~33 min

14 findings → **9 confirmed, 5 downgraded, 0 refuted, 0 lost.** No dimension returned nothing.
Every skeptic reproduced with its own probe rather than re-reading; several built `origin/main`
in their own copy to prove causation.

### Fixed in `838f8e4` + `e686675`

| sev | finding | resolution |
|---|---|---|
| **major** | **Forced-colours rule `.events-link span` painted the LABEL, not just the arrow** — LinkText ink on a LinkText background, 102.95×16px, **1.00:1**, the CTA's whole on-screen name replaced by a solid block in High Contrast, on both cards. Found independently by **four** dimensions (a11y, correctness, tests, and me). Caused by this diff: wrapping the label in a `<span>` for the zoom fix gave the one-child selector a second target. | Scoped to `.events-link span[aria-hidden]`. Label now **13.99:1**, arrow still paints at 13.99:1. |
| **major** | **None of the 11 mutations could catch it** — every one alters a *declaration*; this defect was in a *selector's reach*. The nearest gate matched the rule by regex and never asked which elements it hits, so it certified the broken and fixed selectors identically. | New gate in `build-output.test.ts` resolves forced-colours selectors **against the built DOM**: opt out of the mode and paint a background, and you owe the matched element its background's *paired* system colour. Correctly passes `.patch-filter a[aria-current]` (Highlight/HighlightText) and fails the shipped defect. |
| moderate | `"sizes the control in the reader's own text"` was **fully vacuous** — scoped to `.events-link` while the box moved into `control-cta`. Proven: `text-xs` → `text-[12px]` shipped green. | Filter widened to every class the element wears, plus a **non-vacuity guard** that at least one in-scope rule declares one of the four properties. |
| minor | **Label controls were exempted from the whole min-width/max-* guard**, not just `min-height` as the comment claimed. Proven: `min-w-[20rem]` resolves the control to 320px inside a 182px card, suite green at 281/281. | Loop reads every control; only `min-height` is exempt, only for label controls. |
| minor | **`justify-between` puts the arrow at the LEFT edge on every wrapped line** — from a 20px root up. Measured offsets from left/right: root 16 `157/13` (correct), root 20 `16/133`, root 32 `25/61`. | `margin-inline-start: auto` on the mark. Verified no-op at the default size (`157/13` both ways). Gated: a label control that wraps must carry it. |
| minor | **Focus outline was flush against the plate**, not clear of it — `outline-offset: 2px` against a plate offset 2px means the right and bottom edges paint accent-on-accent at **1.00:1** in light theme. My comment claimed the offset kept it clear. | Offset → 3px. Contrast restated as a pair (card on left/top, `--shadow` on right/bottom). |
| minor | **`"shipped at 1.15em … 13.8px … 1.8px"` is false** — `git log -S'1.15em'` returns only this PR. The shipped value was `1.1em` / 13.2px / 1.2px. | Corrected, with a note recording that the number came from a throwaway variant rig. |
| minor | `control-geometry.test.ts`'s **header still said "seven controls"** and "the goal cards' CTAs were removed" — contradicted by the paragraph this diff added 40 lines below. | Header rewritten. |
| nit | **"the chrome wants 40 of them"** — the four items the same sentence enumerates sum to **90px**, not 40. | Corrected to 90 (48 padding + 16 gap + 24 arrow + 2 border), leaving 20px for words that want 163. |

### Downgraded — real, measured, accepted with the claim corrected

| finding | why not fixed |
|---|---|
| **At a 125% root the +24px/card is not absorbed at all** — it passes 1:1 into page height, and lg viewport heights **928–987 go from fitting to scrolling** (up to 59px). My "3rem is the LAST size that is free" was measured only at 1024×797 and read as general. | The candidate fix (zeroing the control's `margin-top`) was **built and measured by a judge**: reclaims 15px of 60, still scrolls at 1440×960, and spends a decision `Goal.astro` documents in prose. Not worth 12px. The cost is now stated in `uno.config.ts` with the root-16/20/24 breakdown. No test can see it — there is no layout engine in the suite. |
| **The label breaks mid-word at WCAG's 200%** — `My` / `cyclin` / `g` / `event` / `s`. My table measured only ink-past-the-clip-edge, which is 0, so it certified roots 36–40 as clean when they are the worst configurations. | Nothing is clipped, obscured or unreachable, so no criterion fails. The suggested fix — pinning padding and gap to device pixels — was rejected: this repo's layout is font-relative on purpose. The per-root line breakdown now replaces the single-number claim. |
| **Two of the "11 mutations, all killed" could not have applied** — M10/M11 targeted `overflow-wrap: anywhere`, a value the shipped component no longer has. | Correct, and a fair hit on the claim. **Battery re-run against the final code: 15 mutations, all killed** — the two rewritten, plus four new ones for the fixes above (widened forced-colours selector, px font-size, `min-w` floor, mark loses its auto margin). |

### Verified personally rather than delegated

- **Now card never contracts** — 154.00px at all 10 lg configurations vs a clean `origin/main` build. The stack's unspent height goes **53.4px → 5.4px**, which is the real headroom number and is now recorded.
- **Accessible name unchanged** — `Accessibility.getFullAXTree` gives `link "My running events"` from contents on both builds, still exactly the destination `<h1>`; the arrow contributes nothing.

285 tests passing (was 278 on main), `pnpm check` 0 errors, `pnpm eslint` clean.

### Open, not addressed here

Reviewing the **mobile** view surfaced two things this PR does not fix, both better as follow-ups:

1. **The full-width CTA is mostly empty on phones.** Ink fill by width: 45% at 320, **31.6% at 430**, 20.6% at 640 — at 430px the control is 364px wide holding 103px of label with **223px of gap**. The full-width decision was measured at the *182px desktop card*, where it is snug; the justification ("a content-width button leaves 29px of dead card") does not survive the trip to a 414px card, where full width leaves 223px of dead space *inside* the button.
2. **`:hover` sticks after a tap on iOS** — visible on a physical iPhone as one CTA rendering its accent hover colour indefinitely. There is no `@media (hover: hover)` guard anywhere in the repo, so this affects all nine controls and every `text-link`; it is pre-existing, not introduced here, but a large button makes it conspicuous.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-95"></a>

## #95 — fix(mobile): make the CTA read as a button on a phone, and stop hover sticking on touch

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `6c5872e9f` · `worktree-mobile-pass` → `main` · +547/−66 across 8 files

**Evidence, with the renders: https://claude.ai/code/artifact/bd4069cf-aeca-4402-85b7-9e4f7b3e9f4e**

Two defects that only a real device showed, fixed together because they are both "the site
on a phone". Everything below was measured in a browser against two real page builds.

## 1. The CTA drew a form field below `lg`

`justify-content: space-between` was chosen against the 182px `lg` card, where it opens a
41px gap and draws almost the same object as centring. Below `lg` the page is one column and
the card is as wide as the viewport, so the same rule strands the label at the left rail and
the mark at the right one:

| viewport | control | gap | ink fill |
|---|---|---|---|
| 320 | 254 | 113 | 45.3% |
| 430 | 364 | **223** | 31.6% |
| 640 | 558 | **417** | 20.6% |
| 1024 | 182 | 41 | 63.2% |

A wide bordered box with a small label at the left and a lone glyph at the right is the
silhouette of a select or a text field, and it sits directly under two lines of plain text —
where a form would put one. Reported from a physical iPhone 15 Pro Max against a deploy
preview. **The label and its mark are one centred legend now.** The 640px pair in the artifact
is the clearest look at it.

Note *why the original decision survived*: at `lg` both arrangements read as a button, so it
was never tested anywhere it could fail.

### It changes no geometry

Every box under `<main>` diffed between builds at six viewports x two themes: **exactly two
move**, both the 12x12 arrow, both keeping their size, both on one axis. `main`'s height is
identical everywhere and the seven pre-existing plated controls are byte-identical. Across the
zoom sweep (3 viewports x 7 root sizes) the control's box is identical in **all 21** cells and
ink lost past the card's clip edge is 0 in all 21 of both builds.

### The alternative that was built and rejected

Content width (`fit-content`) also draws a proper button, and was rejected on measurement, not
taste: it **loses 23.2px of ink** past the card's right edge at 1024 at a 40px root where both
other builds lose none, and at `lg` it draws the two goal cards' controls 3px apart (148.95 vs
145.94) one directly above the other.

## 2. Hover stuck on touch — site-wide, pre-existing

A touch browser applies `:hover` on tap and holds it until the reader taps elsewhere. **There
was no `(hover: hover)` query anywhere in the repository**, so this reached twelve elements
over two pages: nine plated controls, three text links, the wall's sport chips and linked bibs.
On the patch wall it faked the one distinction that row exists to draw, since the chips have a
real `[aria-current]` state.

> **Reviewers: this is the blast radius to look at.** The fix is one config entry that changes
> how *every* `hover:` utility on the site is emitted. It is deliberately not scoped to the two
> goal cards.

Fixed once, in the config: a variant emits every `hover:` utility inside the query. It **must
sit above `presetWind3`** — variants resolve in preset order, and below it the probe emitted
zero guarded rules while looking exactly like a working config. The two hand-written rules on
the wall carry the guard in their own preludes, **split from `:focus-visible`**, which is a
keyboard indicator every device needs.

Verified 2x2 per element, with the emulation lever read back in all 24 cells: repaints on a
pointer in both builds, repaints on touch **before** and not **after**. In every touch cell
`el.matches(':hover')` is still `true`, so the element genuinely is in the hover state and it is
the media query doing the work.

`Emulation.setEmulatedMedia` **cannot** set this feature — it reports `hover: hover` in both
states, so a probe written that way passes on a completely unguarded build.
`setDeviceMetricsOverride({mobile: true})` + `setTouchEmulationEnabled` is the lever whose
read-back differs.

## Gates

- **New universal** in `build-output`: no `:hover` rule may ship outside a `(hover: hover)`
  context, on any page, with **no carve-outs**. The two mode overrides on the wall could not
  misfire on a phone even unguarded and were guarded anyway — an exemption list is where a gate
  like this rots.
- **`control-geometry`'s packing assertion inverts with the design** rather than being deleted.
  It required an auto inline margin to hold the mark on the trailing edge; it now forbids one
  anywhere inside a label control, because that same declaration would undo the centring with
  `justify-content` still reading `center`.
- It also now asserts `flex-wrap`, which is half the anti-clipping pair and was previously read
  but never checked.

**12/12 mutations** behave as intended, including the subtle preset-ordering one and the
vacuity floor; the control run stays green. 290 tests, `pnpm check` and `pnpm eslint` clean.

## Commits are signed

Both commits are signed and GitHub reports `verified=true` on each. (They were pushed unsigned
initially — 1Password was locked for that session — then re-signed with
`git rebase --exec 'git commit --amend --no-edit -S'`. The rewrite is signatures only: the tree
hash is identical before and after, `de89aa0`, and the suite was re-run at 290 passing before the
force-push.)

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvin-heymax** — 2026-07-29

## Review panel — 28 agents, 7 dimensions, ~39 min, 2.43M subagent tokens

**21 findings: 10 CONFIRMED / 10 DOWNGRADED / 1 REFUTED.** No dimension silent, no agent lost.
**16 of 21 proposed remedies were unsound when a skeptic built them** — the diagnoses landed, the
fixes mostly did not, which is what that field is in the schema for.

### Fixed (`c1f435f`)

| Sev | Finding | Resolution |
|---|---|---|
| major | Hover gate substring-matches the prelude, so `@media not (hover: hover)` — true **only** on touch — is accepted; so is `(hover: hover), (hover: none)` | Replaced with a real predicate: some enclosing at-rule must positively gate hover, every comma branch of it must gate hover, no negation. Found independently by two dimensions and by me. |
| major | Same gate **reds correct code** on the boolean form `@media (hover)` | Both spellings accepted. Testing each at-rule separately (not the joined string) also stops an ordinary `md:hover:` utility reddening — it lands inside two nested at-rules. |
| major | `justify-content`/`flex-wrap` read from **one rule**; the cascade walk listed no layout property, so a media-query override restores the pre-fix layout below `lg` with 290 green | Layout properties added to `BOX_PROPS`. Two dimensions found this independently. |
| major | Auto-margin walk enumerates 4 longhands with `=== "auto"`; `margin: 0 0 0 auto`, `margin-inline: auto 0` and `auto !important` all pass | Widened to shorthands + a token test. Measured: the third returns the mark to 339/13, verbatim the pre-fix arrangement. |
| minor | **The control was only half centred** — `justify-content` centres the flex *items*; the label span is the control's full content width, so its text still started at the leading rail. Wrapped labels drew flush-left lines under a centred mark | `text-align: center`. Wraps in 15 of 42 per-card cells; worst line was 24.4–61.1px off centre, now ≤0.01px. Exact no-op at every default text size. Now gated. |
| minor | Guarding hover left the wall with **zero press feedback on touch** — the preflight disables the platform tap flash, and the bib/chip have no `:active` | `:active` on `.bib--linked` and `.patch-filter a`, matching what the plated controls already do. |
| major | "twelve elements across two pages" is wrong — the breakdown reaches twelve before the wall is added, and omits the Now card's info link | Corrected to twelve on the home page + six on the wall, counted against the built DOM. |
| minor | "exactly two boxes move" is four — the regression instrument's exclusion regex swallowed both `.events-link-label` spans | Claim corrected to "no box's **size** changes"; the instrument's key was also fixed. |
| minor | "418px" for a no-wrap control does not reproduce, and is a control height described as a label height | Corrected to 402 (cycling) / 434 (running), measured on a real rebuild. |
| nit | "182x48 through 74x652" is the 1024 column, not the sweep's range | Corrected. |

### Accepted with the claim corrected, not the code

- **`fit-content` / a capped `max-width` variant** — DOWNGRADED. The proposed `max-w-[22rem]` fails
  the suite outright (`.control-cta must not cap its width`), which is a pre-existing gate doing its
  job. Code unchanged.
- **`group-hover:` / `peer-hover:` bypass the variant** — CONFIRMED, but the gate catches them, so a
  future one fails the build loudly rather than shipping. Only the failure message changed, to stop
  pointing at preset order for a cause preset order cannot fix.
- **The two pinned review builds differ by `data-image-component`** — DOWNGRADED and root-caused to
  `NODE_ENV`, not to the diff. No code implication; the geometry findings were independently
  re-derived by skeptics anyway.

### Refuted

- **`HOVER` matches `:hover` inside `:not(:hover)`** — a skeptic proved a `:not(:hover)` rule is
  itself tap-held on touch, so matching it is *correct* and excluding it would be the
  gate-defeating change. **Do not "fix" this.**

### Verification after the fixes

**18/18 mutations behave**, now including two positive controls that must stay GREEN — the nested
at-rule case (`md:hover:`) and the boolean media form. 290 tests, `pnpm check` and `pnpm eslint`
clean. Hover 2×2 re-verified over six idioms with the emulation lever read back in all 24 cells;
press feedback confirmed painting on bib, chip and current chip; label centring measured 36.4→0.01,
56.3→0.01, 61.1→0.01 with a true no-op at root 16.


---

<a id="pr-96"></a>

## #96 — fix(mobile): acknowledge the tap, and stop making the reader wait for it

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `8b07d41e9` · `worktree-mobile-tap-feedback` → `main` · +615/−12 across 8 files

Reported from a phone: tapping a control produced no feedback, and a visitor tapped
**My cycling events** several times because the first tap looked ignored. Two defects behind
one symptom.

Measured over raw CDP at 430x932 with touch emulation and Chrome's Slow-4G preset, 5 trials,
medians. Every probe carries a positive and a negative control — a zero from a broken
instrument already cost one false finding while writing this.

## Result

| | before | after |
|---|---|---|
| tap → first contentful paint, first visit | 800 ms | **388 ms** |
| tap → first contentful paint, returning | 768 ms | **188 ms** |
| tap → full-contrast ink | 751 ms | **no blank frame at all** |
| `text-link` pixels repainted on press | **0** | 785 / 884 |

The old build swapped to a near-white screen at 481 ms and ramped to readable over 270 ms.
The new one never goes blank.

## One idiom drew nothing at all

Full-viewport pixel diff, idle against pressed:

| idiom | box | changed px |
|---|---|---|
| `control-cta` | 364x48 | 15,243 |
| `control` | 64x48 | 3,336 / 3,773 |
| bib | 364x173 | 8,794 |
| **`text-link`** | 60x24, 45x16 | **0** |

`text-link` carried only `hover:`, which #95 correctly put behind a pointer, so on a phone the
wall's way back and both role-card company names acknowledged a tap with nothing. It now takes
the accent on `:active`, in the shortcut, so all wearers move together.

`active:transition-none` is paired with the ink and is not tidiness: both shortcuts carry
`transition-colors duration-300`, so without it the press **ramps** — 8.5% of the delta at a
50 ms tap, 36.7% at 90 ms. Every press that already worked comes from `transform`/`box-shadow`/
`outline`, none of which is transitioned. A pixel probe cannot see this, so it is asserted
statically — and that gate then found the wall's own chips ramping too.

## And every press ended at touchend

`data-leaving` holds the press until the page actually goes, set by a ~12-line inline script
beside the theme one. An **attribute rather than a class is forced**: the orphan gate reads a
selector's leading class token and its state-class excuse needs a scoped selector, which
UnoCSS output never is — `.is-leaving{}` would redden a correct deploy.

The chips' twin sits **above** `[aria-current="page"]` where its `:active` sibling sits below.
Both repaint the label `var(--accent)`, which on the current chip's `var(--text)` fill is
**2.77:1 light and 1.37:1 dark** — defensible for a ~100 ms tap, not for a whole navigation.
Source order is the entire fix; verified in a browser at 18.86:1 / 18.09:1.

## The wait was mostly the entrance animation

Chromium records no contentful paint for a composited opacity animation until it resolves, so
`card-in`'s `from { opacity: 0 }` was a wait paid on every arrival. Dropping it exposed what
the fade had been hiding — `translateY(40%)` is 40% of each child's **own** height:

| variant, first frame at 1440x900 | opacity | displaced | clipped by `main` |
|---|---|---|---|
| 40% travel, faded (today) | 0 | 282 px | 327.6 px |
| 40% travel, no fade | 1 | 282 px | 327.6 px |
| **12 px travel, no fade** | 1 | 12 px | **0** |

My first film reported none of this: shot at 430x932, where `main`'s second child is
`display: contents` and children 3–6 are below the fold, so exactly one box was animating.

## Not done, and the rejection is now measured rather than asserted

Prefetch. An earlier run "measured" it as useless while prefetching `/patches/cycling/` and
navigating to `/patches/cycling` — a cache key the navigation never asked for, with nothing
asserting the lever had fired. Re-run with the URL taken from the anchor and a
`requestWillBeSent`/`loadingFinished` read-back, it saves 40 ms of HTML body and **12 ms** of
first paint, because the render-blocking stylesheet round trip is serial after it and
dominates. 12 ms does not justify a client script.

## Gates

13/13 mutations caught by the expected gate, baseline green, each attacked on its own
**predicate**. Notably: making a bib a same-tab link reddens the twin gate (the exclusion is
derived from `target="_blank"`, not listed), and a `:active` rule that exists but paints
nothing is caught, where an existence check is satisfied by the exact measured defect.

**One existing gate was silently disarmed by this change.** The link-signifier gate tested
statefulness with a list of pseudo-classes, so `[data-leaving]` — an attribute — read as
*unconditional* and satisfied `chipIsDrawn` on its own: with the chips' permanent border
deleted the wall shipped borderless prose on all three pages and the suite stayed green at
290/290. That is the "worse than no gate" case its own comment names. Replaced with a
structural test hoisted to `tests/helpers/css.ts`, so the next state cannot walk through it.

## Test plan

- `pnpm check` 0 errors, `pnpm eslint` clean, 300 tests pass.
- 13/13 mutation battery, plus the browser verification above.
- **Still owed: a physical iPhone.** iOS `:active` is the one claim not measurable locally, and
  the tap highlight is the floor under it. Worth checking press feel, the held state through a
  real navigation, and that nothing sticks on back-navigation.
- `curl -I` the deploy preview for the real `cache-control` on `/_astro/*` — the local harness
  hard-codes that policy and the TOML gate only reads the file.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-29

## Review round: 22-agent panel, six dimensions, per-dimension verification

**Two blockers, both mine, both reproduced before being fixed.** Neither was findable on a device.

### B1 — `pageshow` fires on the ordinary first load, not just a bfcache restore

Measured against the built site: `pageshow persisted=false` at **44 ms** warm and **468 ms** on Slow-4G. Registered unguarded, it deleted the hold of any tap landing before `load` *and* cleared the 8 s fallback with it — so the mechanism this PR exists to install was off for precisely the reader it is for: the one whose page is still loading when they tap.

Controlled A/B, identical timing, only the guard differing:

| | tap | load | held press at +4 s |
|---|---|---|---|
| before | 309 ms | 1607 ms | **wiped** |
| after | 304 ms | 1606 ms | **survives** |

A device check cannot find this — a human taps a page that has settled. **The script had zero test coverage, which is why it shipped**; the suite now asserts the guard.

Folded in: `clear()` before setting, since `timer` is a single slot — a second press left both controls drawn pressed and the first press's orphaned timeout cut the second short (499 ms instead of 8000).

### B2 — this PR disarmed two statefulness walks, and its own docstring said otherwise

`isStateful` was hoisted for three call sites and wired into one. Worse than incomplete: merging `[data-leaving]` into the same rule as `:active` means two of four selectors carry no pseudo-class, so `.every()` flipped false and `rendered-html.test.ts`'s two walks read the held-press rule as **unconditional**. Moving `text-decoration-line` out of `.text-link` into it left the underline gate green. All three call sites now share the helper, and that exploit is mutation `M15`.

### Also fixed

- **The current sport chip's label.** `transition: none` was right for a press that ramped, and it turned an accepted approximation into a real one — a ~100 ms tap used to travel a quarter of the way to the accent and now goes all the way, putting the current chip's label at **2.77:1 light / 1.37:1 dark**. The accent border still fires, so the press is still acknowledged; only the glyphs keep readable ink. Verified at 18.86:1 pressed and held.
- **My twin gate was over-specified** — it demanded identical declarations, which forbids that fix. The invariant is weaker and truer: a press that repaints must still repaint while held, sharing at least one property.
- **A `transition` is not ink.** The battery caught this, not review: every press declares `transition: none`, so it was always in the overlap and a twin repainting *nothing* passed. Transition longhands are now excluded.

### Verification

**16/16 mutations caught**, baseline green, tree restored. `pnpm check` 0 errors, eslint clean, **304 tests**.

Not blocking, recorded as follow-ups from the panel: the netlify header gate matches two substrings rather than one block; the card-in gate forbids `%` where `vh`/`em` would also reproduce the defect; `readdirSync` on `/_astro` would trip on a nested emission (Astro's fonts API); and there is still no behavioural test for the script itself.

> Note: these commits are **unsigned** — 1Password is locked and `failed to write commit object` did not clear across three attempts.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-97"></a>

## #97 — fix(projection): give the site a clock, and let a race be recorded the day it is run

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `f2e662164` · `worktree-add-garmin-run-2026` → `main` · +658/−48 across 10 files

## Summary

The patch wall and the goal-card countdown were asking the Strava bot's `updated_at` what day it was. It does not know — it means *"the day the kilometres last MOVED"*, and it is frozen deliberately when they do not move so the workflow's `git diff --quiet` gate can stop a nightly commit-push-deploy.

This splits the two questions onto two clocks, and makes a race's own recording — not the calendar — the proof that it was run.

## Problem

**1. The stamp is not a clock, and can freeze indefinitely.** Measured against the shipped `nextProgress`, not argued:

| bot runs on | kilometres | `updated_at` written |
|---|---|---|
| 2026-07-29 | unchanged | `2026-07-28` |
| 2026-08-05 | unchanged | `2026-07-28` |
| 2026-08-12 | unchanged | `2026-07-28` |

**2. It was already wrong on the live page.** The home page said Round the Island was **"in 5 days"**, counting from the 28th. It was 4.

**3. A race could not be recorded on the day it was run.** `patchState` was `stamp > end`, and *both* halves refused it: the stamp lags, and `>` excludes the race's own day even from a perfect clock. A race run on a Wednesday could not be entered as run until the bot pushed on the Thursday — and if no ride followed, not then either.

## Solution

**Two clocks, and which one a function takes states what it is asking.**

- `UPDATED_AT` — how fresh the kilometres are. Keeps `goalStatus`, `goalStatusLine`, `formatDateline`, `stampYearMatchesGoalYear`. The original reasoning is untouched and still load-bearing: the required rate divides a deficit by the days left, so numerator and denominator must age together.
- `BUILD_DATE` — what day it is (`src/lib/today.ts`, the only place in `src/` that reads a clock). Takes `patchState`, `patchWall`, `patchesEarned`, `nextRace`.

A static site has exactly one free source of "today": the moment it is built. Having the bot write a `checked_at` cannot work — a field that changes nightly makes the file differ by construction, so the `git diff --quiet` gate could never fire and the repo would redeploy every night.

**A recording outranks the clock.** A race carrying *both* `elapsed_time` and `strava_activity_id` is finished because it was run. Each field alone can exist before the race does — a time can be typed, an id pasted from a mapping made in advance — so neither alone earns a bib. Races with no recording are ruled by the clock exactly as before, so Round the Island stays a legitimate timeless finished bib.

This is not the forbidden `done` flag: a flag has no content and rots silently, while these are facts printed on the bib, one of them a link, and typing either against a race that has not started fails the build.

`bookedAhead` skips the same races, or the wall would call a race finished while the goal card still counted its kilometres as booked — the contradiction the year-long cross-consumer sweep exists to catch.

**Purity is preserved.** `projection.ts` still calls no `new Date()`; the clock is read once in `today.ts` and arrives as a default argument, so every assertion can still pin its own day.

## Test Plan

`pnpm check` clean, `pnpm eslint` clean, **319 passing** (was 304 on main).

A 19-agent adversarial review panel ran against this branch and found the change had shipped
**correct and completely ungated**. The mutation table originally posted here was measured before
the bot commit merged into this branch set `updated_at` to the build day — which silently switched
off the very gates that table cited. Corrected, current numbers:

| mutant | before review | now |
|---|---|---|
| revert all four calendar defaults to the stamp | **314 passed — nothing caught it** | 1 failed |
| revert `patchState` alone | 314 passed | 1 failed |
| revert `patchWall` alone | 314 passed | 1 failed |
| revert `patchesEarned` alone | 314 passed | 1 failed |
| revert `nextRace` alone | 314 passed | 1 failed |
| `goalStatus` dragged onto the build clock | 314 passed | 1 failed |
| `patchState` forgets the recording | 2 failed | 3 failed |
| `bookedAhead` books a recorded race | 2 failed | 2 failed |
| `<meta name="build-date">` deleted | not gated | 8 failed |
| a recording typed into a tour still under way | not gated | 16 failed |

Two lessons are now encoded rather than remembered. `tests/clock-split.test.ts` mocks the bot's JSON
so **bot data can no longer decide whether the gate runs** — the gates in `projection.ts` only
discriminate on a day the two clocks differ, and the bot stamping today made them vacuous. And
mutating one default at a time is what exposed `patchWall`: flipping all four at once only proves
the *union* is covered, which is how it stayed uncovered even after the other three were pinned.

Date-independence swept separately: the full suite is green at every pinned build date from
2026-07-30 through 2027-03-01, including the `GOAL_YEAR` rollover, race days and mid-tour.

**Visible result:** the cycling countdown corrects from "in 5 days" to "in 4 days".

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-29

## Adversarial review panel — 19 agents, 14 findings judged, 13 survived

5 finders (method-audit, time-travel, logic, rendered, claims-and-data), one skeptic per finding tasked with refuting it and with **testing the suggested fix separately from the diagnosis**. That separation earned its keep: `remedy_is_sound` came back **false on 12 of 13** — the diagnoses were right and the proposed fixes mostly weren't.

### Acted on

| sev | finding | resolution |
|---|---|---|
| major | The split shipped ungated — reverting every calendar default left `check && test` green at 314 | `tests/clock-split.test.ts` mocks the bot JSON so the gate no longer depends on bot data |
| major | `patchesEarned` (and, once I mutated one at a time, `patchWall`) ungated even on a divergent day | one assertion per function; all four now fail alone |
| major | "BOTH WAYS STAY IN STEP" was false — the sweep hands both functions the same iso, the page does not | claim corrected, and what the sweep *cannot* see is now written out |
| major | The documented "fetch first" order double-counts an already-listed race | order is now conditional on whether the race is in `EVENTS`; measured 67 vs an honest 73 km/wk |
| major | The "has not started" gate read the START date, so a recording typed mid-tour drew an earned patch | both gates read `end_date`; mutant now fails 16 tests |
| major | `<meta name="build-date">` neither present- nor value-gated | artifact-level gate in `build-output.test.ts`, deliberately clock-free |
| minor | The new EVENTS gate opened with an assertion that could not fail | pinned against a 1970 clock so only the recording branch can answer |
| minor | Eight comments/messages still said "stamp" for values now on `BUILD_DATE` | reworded |
| minor | Cross-consumer sweep comment claimed a guarantee it no longer gives | rewritten in both files |

### Rejected, with the measurement

**The panel's fix for the goal-card/wall disagreement would have made the number worse.** It proposed moving `bookedAhead` onto the build day so the card stops booking a race the wall calls finished. Measured across the 2 August push: **71 km/wk before, 74 after — the distance is counted exactly once in each window**, and the drift is five days of denominator, not a double count. The proposed fix reads **77**, further from the settled figure, and it would credit a distance nobody has measured — which this file's header exists to refuse. A second skeptic reached the same conclusion independently and warned that gating build/stamp *pairs* would be red on correct code.

So `bookedAhead` stays on the stamp, and the disagreement is now documented as the deliberate consequence it is, with the reasoning and the numbers in place so nobody re-derives the "fix".

### Refuted

One finding argued the bib should print 10.16 km (what Strava recorded) rather than 10.00 (the division), since the run banked 10.2 km into the goal total. Its own skeptic refuted it against the repo's existing convention — the cycling bibs already print event distance over recorded distance.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-98"></a>

## #98 — feat(events): add the Garmin Run Virtual Challenge 10km

`closed` · opened 2026-07-29 by **calvindotsg** · merged not merged as `—` · `add-garmin-run-event` → `worktree-add-garmin-run-2026` · +6/−4 across 1 files

## Summary

Adds the 10km division of the 2026 Garmin Run Virtual Challenge, run on 29 July 2026 in 58:26.

**Stacked on #97** — merge that first. This PR is a three-line data edit that depends on it: without the recording rule, a race dated today is still `booked`, and a finishing time on a booked race fails the build.

```ts
{date: "2026-07-29", name: "Garmin Run Virtual Challenge", km: 10.00, sport: "running",
 country: "Singapore", elapsed_time: "0:58:26", strava_activity_id: "19513789157"},
```

## The three data judgements

- **`km: 10.00`, not the 10.16 recorded.** The certificate and medal both certify the 10km division, and the two running races beside it carry official distances (21.10, 42.20) rather than GPS traces. The cycling entries do the same — 160.59 for a ride Strava recorded as 140.49.
- **Name drops the year.** The certificate reads "2026 Garmin Run Virtual Challenge"; the bib already prints `29 JUL 2026` two lines above the name. The `aminoVITAL` sponsor line is set apart and smaller on the certificate, so it reads as a presenting sponsor rather than part of the name.
- **Activity id verified by reading the page**, not trusted. `strava.com/activities/19513789157` returns *"Log in to see "10km time trial: 2026 Garmin Run Virtual Challenge""* — the login wall leaks the title, which is the only way to check an id without an account. Two valid ids transposed between races would otherwise produce a wall nothing here could catch.

## Order of operations

The `strava-progress` workflow was run by hand **before** this edit ([run 30457162294](https://github.com/calvindotsg/portfolio-v2/actions/runs/30457162294)), taking running from 158.6 to 168.8 km.

That order is now the documented process above `EVENTS`, and it is not cosmetic: the recording is what stops the race being counted as booked ahead, so its kilometres have to already be in the bot's total. Edit first and the distance is in neither place, and the card asks for a rate too high by the length of the race until the bot next pushes — which is not guaranteed to be the next day.

## Test Plan

`pnpm check` clean, **314 passing** — and **no pinned figure moved**, which is the design working: a recorded race never enters `bookedAhead`, so the projection's frozen snapshots are untouched by adding a completed race.

Rendered `/patches/running` — a solid, linked patch (`bib bib--running bib--linked`, no `bib--booked`):

```
29 JUL 2026 | Run | 10.00 km | Garmin Run Virtual Challenge | Singapore | Elapsed 0:58:26 | View on Strava
```

Goal card: `168.8 of 600 km`, `17 km/wk to go`, `Next race in 8 weeks` — the countdown having moved on to the Kiprun in September, since this race is done.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-29

Superseded by #99 — same content rebased onto main. GitHub auto-closed this when #97 merged and deleted its base branch, and a closed PR whose base is gone can be neither reopened nor retargeted.


---

<a id="pr-99"></a>

## #99 — feat(events): add the Garmin Run Virtual Challenge 10km

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-29 as `bd4396296` · `add-garmin-run-event` → `main` · +6/−4 across 1 files

## Summary

Adds the 10km division of the 2026 Garmin Run Virtual Challenge, run on 29 July 2026 in 58:26.

Supersedes #98, which GitHub auto-closed when its base branch (`worktree-add-garmin-run-2026`, now merged as #97) was deleted — a closed PR whose base is gone cannot be reopened or retargeted. Same content, rebased onto main; the review discussion lives on #98.

```ts
{date: "2026-07-29", name: "Garmin Run Virtual Challenge", km: 10.00, sport: "running",
 country: "Singapore", elapsed_time: "0:58:26", strava_activity_id: "19513789157"},
```

Now that #97 has landed, this is the first race entered under the rule that **a recording is what makes a bib a patch** — so it lands as an earned Finisher Patch on the day it was run rather than the morning after.

## The three data judgements

- **`km: 10.00`, not the 10.16 recorded.** The certificate and medal both certify the 10km division, and the two running races beside it carry official distances (21.10, 42.20) rather than GPS traces. A review finding argued for 10.16; its own skeptic refuted it against this existing convention — the cycling bibs already print event distance over recorded distance (160.59 for a ride Strava recorded as 140.49).
- **Name drops the year.** The certificate reads "2026 Garmin Run Virtual Challenge"; the bib already prints `29 JUL 2026` two lines above the name.
- **Activity id verified by reading the page**, not trusted. `strava.com/activities/19513789157` returns *"Log in to see "10km time trial: 2026 Garmin Run Virtual Challenge""* — the login wall leaks the title, which is the only way to check an id without an account.

## Also: three comments this race falsified

Adding a seventh event invalidated three literals in `constants.ts` that nothing tests — a filter row quoted as `All 6 / Ride 4 / Run 2`, and two passages calling the Strava login-wall evidence "both ids" / "the two below" when there are now three. Found by the review panel.

De-pinned rather than re-quoted: the paragraph's argument (the filter row already states the scope) does not depend on the numbers, and a fresh literal would be invalidated by the very next race with nothing to catch it.

## Order of operations

The `strava-progress` workflow was run by hand **before** this edit ([run 30457162294](https://github.com/calvindotsg/portfolio-v2/actions/runs/30457162294)), taking running from 158.6 to 168.8 km.

That is the correct order **for this race specifically** — one not yet in `EVENTS`, so banking its kilometres first can double nothing. #97's review corrected the general rule: for a race already listed, fetching first counts its distance twice (measured 67 km/wk against an honest 73), so those get the recording first instead. Both cases are now written out above `EVENTS`.

## Test Plan

`pnpm check` clean, **319 passing**, and **no pinned projection figure moved** — a recorded race never enters `bookedAhead`, so adding a completed race leaves the frozen snapshots untouched.

Rendered `/patches/running` — a solid, linked patch (`bib bib--running bib--linked`, no `bib--booked`):

```
29 JUL 2026 | Run | 10.00 km | Garmin Run Virtual Challenge | Singapore | Elapsed 0:58:26 | View on Strava
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-100"></a>

## #100 — chore(ci): pin the nightly job's action, and pin the Node it runs on

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-30 as `6bad51458` · `worktree-wp1-pin-and-node` → `main` · +77/−1 across 4 files

Part of plan 019 (retire Netlify → GitHub Actions + Cloudflare Pages). This is WP1's repo-side half; the infrastructure half (token rotation, repo settings) is listed below and needs Calvin.

## Why this lands before the policy, not after

WP1 enables `sha_pinning_required`. GitHub's documentation states **no exemption** for GitHub-authored actions or for immutable tags, and `actions/checkout@v5` is a tag — so enabling the policy first would fail the Strava job on its next nightly run. That is the one workflow whose failure nothing is watching, which is the whole reason WP4 exists.

The ordering is correct under both readings: if an undocumented exemption does exist, pinning first costs nothing.

## What is in here

- **Pin, not upgrade.** `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` is exactly what `@v5` resolved to (verified via `gh api`), so the job's behaviour is unchanged. Deliberately not bumped to v7 in the same PR — that is a reviewable change, and Dependabot will propose it.
- **`.github/dependabot.yml`** — monthly. A pin with nothing bumping it decays into an outdated dependency. Note it can bump a SHA but **cannot convert a tag into one**, so new `uses:` lines must be written pinned by hand.
- **`.nvmrc` = 26** — matches local v26.5.0 exactly. Checked against every constraint in the tree rather than assumed: `astro@7.1.5` `>=22.12.0`, `vitest@4.1.10` `^20 || ^22 || >=24` (it excludes 23), `sharp@0.35.3` `>=20.9.0`.
- **One shellcheck suppression**, because plan 019 makes `actionlint` a gate and this pre-existing SC2016 is a false positive: the `${...}` in the commit-message command are a JS template literal read by `node -e`. The double quotes shellcheck asks for would expand them to empty strings and commit a message with no numbers in it.

## Verification

- `actionlint` — clean (exit 0). It was exit 1 before the suppression.
- `pnpm check` — 0 errors, 0 warnings.
- `pnpm test` — 319 passed, 11 files.

## Still needs Calvin (not doable from here)

1. **Rotate `CLOUDFLARE_API_TOKEN`.** It is stored on Netlify with `is_secret: false` — its plaintext value came straight out of `netlify env:list --json`, so treat it as disclosed, not merely over-scoped. It can `purge_everything` across a zone serving five proxied subdomains. Check "Last used" first, then revoke at Cloudflare and delete both Netlify vars.
2. **Revoke `CLAUDE_CODE_OAUTH_TOKEN`** — a live token in a public repo's secret store with no consumer.
3. Then the two `gh api` settings changes, with `sha_pinning_required` **last**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-101"></a>

## #101 — feat(ci): build and test on GitHub Actions, and port the cache header to the artifact

`merged` · opened 2026-07-29 by **calvindotsg** · merged 2026-07-30 as `af77b81af` · `worktree-wp2-ci-build` → `main` · +305/−7 across 7 files

**Stacked on #100** — base is `worktree-wp1-pin-and-node`, because `ci.yml` reads `.nvmrc`, which #100 adds. **Retarget this to `main` before merging #100**, or merging the parent will strand it.

Plan 019 WP2. Netlify still builds and still deploys; this adds a second builder so the two can be compared before anything is switched off. No deploy job yet — those land in WP3, and the header comment records the graph they attach to.

## The cache header moves to a file the build emits

`netlify.toml` is **untouched**, because Netlify is still serving the site. `public/_headers` is added alongside it — Astro copies `public/` verbatim, so it lands at `dist/_headers`, and **both hosts read that format**. Same rule, same value, two places on purpose for the duration of the migration. `netlify.toml` goes away in WP5 with the cutover.

The assertion moving is the part worth reviewing. It used to read `netlify.toml` — a file the host parsed and the build never touched, so it proved the rule had been *written*, not that it had *shipped*. It now reads `dist/_headers`, the artifact the deploy uploads. That also survives the next host change: nothing in it names a platform.

## Calibration, because a green suite proves nothing on its own

Three mutations, each confirmed red, then confirmed green on restore:

| mutation | result |
|---|---|
| drop the `/_astro/*` rule from `public/_headers` | red — "dist/_headers no longer caches /_astro/*" |
| delete `public/_headers` entirely | red — "dist/_headers is missing — public/_headers did not reach the build" |
| change `max-age=31536000` to `max-age=60` | red — regex mismatch |
| restore | 319 passed |

The second one caught a defect in my own first draft: `read()` throws `ENOENT`, so the guard message was unreachable dead code. It is an `existsSync` check now, and the message actually fires.

## Why the analytics step exists

Umami fails **open**. With `UMAMI_ID` unset, `data-website-id={import.meta.env.UMAMI_ID}` drops the whole attribute and the `<script>` still loads — so the page looks correct, returns 200, and records nothing. Measured on a local build with the variable absent.

It is skipped for fork PRs, which are never deployed, so the seven historical upstream-sync PRs do not redden on an id that cannot matter to them.

## Before this can go green

`UMAMI_ID` must be added as a repository **variable** (not a secret — the value is already public in the shipped HTML, and it matches the `vars.STRAVA_ATHLETE_ID` precedent). Its current value is in the Netlify env.

## Verification

- `actionlint` — clean. Additionally gated with GitHub's own expression evaluator: every `if:` was evaluated against push / workflow_dispatch / same-repo-PR / fork-PR, and the harness was calibrated by confirming it reddens on the known-bad guard.
- `pnpm check` — 0 errors, 0 warnings. `pnpm eslint` — clean. `pnpm test` — 319 passed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-102"></a>

## #102 — docs(config): say what UMAMI_ID is, and that it fails open

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `a6172eb20` · `worktree-env-docs` → `main` · +23/−0 across 2 files

`UMAMI_ID` needed no change as a value — it already exists as a repository variable and the merged CI run proves it works. What was missing is any record of *what it is*.

The README documents the Strava variable/secret split in detail and says nothing about analytics; `.env.example` was a bare placeholder. Two non-obvious facts now live in both:

- **It is a variable, not a secret, on purpose.** The id is served in the HTML of every page, so it is already public. Marking it secret would mask it in build logs — degrading debugging while protecting nothing — and a secret cannot be read back, so drift would be undetectable.
- **It fails open.** With the value unset, `data-website-id={import.meta.env.UMAMI_ID}` drops the whole attribute and the Umami `<script>` still loads. The page looks correct, returns 200, and records nothing. That is why `ci.yml` greps *every* built page for the exact value rather than one page for a pattern — the tag comes from the shared layout, so asking `index.html` alone is a build-wide question put to a quarter of the build.

Docs only; no code, no workflow, no configuration change.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-103"></a>

## #103 — feat(ci): deploy to Cloudflare Pages, with the panel's findings fixed first

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `cf2df57c3` · `worktree-wp3-deploy` → `main` · +331/−5 across 2 files

Plan 019 WP3.4 — the two deploy jobs, with the ten defects a review panel found in the draft corrected **before** the draft ever ran. Cloudflare-side prerequisites are already in place: Pages project `calvindotsg` (`production_branch: main`, direct upload, no git integration), both GitHub Environments, and an account-owned `Pages: Edit` token whose scope was verified by a real write attempt.

## This PR deploys itself

Merging is not the test — **this PR's own `deploy preview` job is**. It will publish to `pr-103.calvindotsg.pages.dev` while calvin.sg stays on Netlify, untouched. If the preview deploys and the URL serves the site with its cache header, WP3 is proven on real infrastructure before anything reaches production.

## The two guards that were wrong

Both fail only in contexts the original four-row truth table never contained.

- **`deploy-production` was ref-blind.** `github.event_name != 'pull_request'` is TRUE for a `workflow_dispatch` on *any* ref, while the job hardcodes `--branch=main`. A dispatch from a feature branch would have published that branch to production — and the output assertion would have confirmed `environment: production`, because it genuinely got there.
- **`deploy-preview` admitted Dependabot.** Bot branches live in this repo, so the fork guard passes; GitHub withholds Actions secrets from those runs, so wrangler dies non-interactively on every bot PR.

The gate now evaluates **seven** contexts in GitHub's own expression engine and asserts the two jobs *partition* them. Each new term is calibrated by removal:

```
ok   push to main                       [deploy-production]
ok   workflow_dispatch on main          [deploy-production]
ok   workflow_dispatch FEATURE branch   []
ok   push to a feature branch           []
ok   same-repo PR (human)               [deploy-preview]
ok   FORK PR                            []
ok   DEPENDABOT PR                      []

drop the ref test   -> dispatch on FEATURE branch deploys production: true
drop the actor test -> DEPENDABOT PR deploys preview: true
```

## The artifact is perishable and nothing checked its age

The build stamps a Singapore calendar day into every page, and *"re-run failed jobs"* does not re-run `build`. A deploy failing at 23:xx SGT and re-run next morning would republish yesterday's `dist` — wrong countdown, races finished overnight still drawn as unearned outlines. Netlify could not hit this because its retry re-ran the build command and re-derived the day.

**Measured: the suite is green against a `dist` stamped one day stale.** No test can catch it, so each deploy job now refuses one. Calibrated four ways: red on stale, red on a missing stamp, green on today, green on the real artifact.

## `CLOUDFLARE_ACCOUNT_ID` becomes a variable, not a secret

Both honest and *required*. It appears in every dashboard URL, so masking it redacts that substring from unrelated log lines — including the link wrangler prints when it cannot ascertain a deployment's status. And wrangler's `getActiveAccountId` resolves it with no API call, falling back to `GET /accounts` when absent — which a Pages-scoped token cannot do, producing an auth error that looks like a bad token.

## Smaller corrections

- Concurrency now keys on the event name. `cancel-in-progress: false` protects only a *started* run; GitHub cancels the *pending* member of a group, so a push could silently cancel a queued nightly dispatch.
- The output reader no longer exits with a stack trace on an unreadable or truncated file.
- Comments claiming the version pin bounds wrangler's supply chain, and that these jobs "run no repo code", now state what is actually true — the pin covers wrangler's own version and not its 91-package tree, and the no-code property covers the runner, not the workflow file.
- New suite assertion: the build ships no `_worker.js` or `_routes.json`, the two filenames Cloudflare executes rather than serves. Calibrated red by planting one.

## Deliberately deferred

Vendoring the expression gate into the repo so it runs in CI. It is a real gap — `needs: build` is currently held by a comment — but it is a separate change from landing the deploys.

## Verification

`actionlint -shellcheck=shellcheck` clean · partition gate 7/7 with both calibrations flipping · `pnpm check`, `pnpm eslint` clean · suite **320 passed** (was 319).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-104"></a>

## #104 — refactor(config): a Strava client id is public, so make it a variable

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `895f3d24a` · `worktree-strava-clientid` → `main` · +26/−4 across 2 files

`STRAVA_CLIENT_ID` was a repository secret. It should be a variable, by the project's own test: **does the value ship publicly?** A Strava client id is a query parameter of the OAuth authorize URL — anyone who has connected the app has seen it in their address bar.

Storing a public value as a secret buys nothing and costs two real things:

- GitHub **masks** it, so it prints as `***` exactly when you are trying to read what the job sent.
- A secret **cannot be read back**, so drift between GitHub and the 1Password copy is undetectable.

The client secret and refresh token genuinely authenticate, so they stay secrets — and both are now backed up in 1Password (`calvindotsg-strava`). That backup was verified by *using* it: exchanging the stored refresh token for an access token and reading the athlete stats back returned **2279.7 km**, matching what the site publishes. It is the only recoverable copy that exists.

## Verification

The new variable's value, read back from the GitHub API, runs `scripts/fetch-strava-progress.mjs` to completion and produces a **byte-identical** `strava-progress.json` (no diff). `actionlint -shellcheck=shellcheck` clean.

## Ordering

The variable already exists (additive, nothing referenced it). The **secret is deleted only after this merges**, so the workflow on `main` never points at a store that is not there.

## A reversal, stated plainly

Plan 019 originally said to leave this alone because "the churn buys nothing". That was fair while the credentials had no backup at all. Now that the GitHub store and 1Password must agree, being able to read one of them back is worth a one-line change.

I also predicted that masking a 6-digit value would redact unrelated numbers from logs. I measured it against a real run log and found **zero** occurrences, so that argument is dropped rather than repeated here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-105"></a>

## #105 — feat(ci): let the nightly reach a deploy, and build every day not just every ride

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `c2ab11c59` · `wp4-strava-dispatch` → `main` · +64/−4 across 2 files

## What this fixes

A push made with `GITHUB_TOKEN` **does not trigger a workflow run** — GitHub suppresses it to stop recursion. So the nightly bot commit reaches `main` and, on its own, nothing builds. Netlify never had this problem because its webhook watched the *repository*, not the Actions event stream; moving the build into Actions moved the failure mode in with it. `workflow_dispatch` is one of the two documented exceptions to the suppression rule, which is why the fix is a dispatch rather than a second push or a tag.

## The part worth reviewing: the dispatch is unconditional

This is more than Netlify parity, and it is a deliberate design decision.

The commit step fires only when the **kilometres** moved. But the site has a clock as well as a distance — `BUILD_DATE` in `src/lib/today.ts` feeds the countdown, `patchState`, `patchWall` and `nextRace`, and every one of those turns over at Singapore midnight whether or not anyone trained. Dispatching only on a commit would reinstate, by a different mechanism, the exact defect `CLAUDE.md` records being fixed once already: *the home page reading "in 5 days" on the day it was 4*, frozen for as long as the owner rested.

**Measured before writing it, not assumed.** The cron ran and *succeeded* every day from 2026-07-22 to 2026-07-30:

```
2026-07-29 schedule success     2026-07-25 schedule success
2026-07-28 schedule success     2026-07-24 schedule success   <- no commit
2026-07-27 schedule success     2026-07-23 schedule success
2026-07-26 schedule success     2026-07-22 schedule success
```

…and committed nothing on 07-24. That day the live site was never rebuilt at all. So the defect is live right now, on the outgoing host.

One build a night is also the pipeline's cheapest possible heartbeat: a broken build surfaces within a day instead of whenever the owner next happens to ride.

## `actions: write`

Written out explicitly because a `permissions:` block **replaces the defaults wholesale** — before this line the scope was `none` and the dispatch would have returned `403`, on the one path nobody watches. It is also independent of the repository's `default_workflow_permissions: read`; an explicit block is the only way a job gets more than that.

## Failure behaviour

- **A failed push cannot deploy.** Steps default to `if: success()`, so a non-fast-forward rejection stops the run and the day goes unbuilt loudly rather than publishing a tree that is not on `main`.
- **The dispatch fails loudly.** `gh workflow run` exits non-zero when the API refuses. The comment records who that reaches: GitHub sends a scheduled workflow's failure notification to whoever **last edited the cron syntax**, not to the repository owner.
- **Green here means "the build was asked for", never "the build passed"** — the step does not wait for the dispatched run.

## The `ci.yml` change is a comment sweep, not behaviour

Its concurrency block claimed a real fix for the deploy-ordering inversion *"belongs with WP4"*. WP4 looked and **deliberately did not fix it**: a monotonicity check has to know whether the live deployment's commit is a *descendant* of this one, which is a git ancestry question, and these jobs have no checkout by design. Comparing `run_number` or wrangler timestamps answers a different question and would pass exactly when the inversion happens. The comment now says so, so nobody hunts for a fix that was never written.

## Verification

- `actionlint` clean — and **calibrated**: planting `github.tokenn` in place of `github.token` makes it exit 1 with a context error, so the green run is reading this file rather than finding none.
- End-to-end proof is a manual `workflow_dispatch` of `strava-progress.yml` from `main` **after** merge, per the plan's own step 3. Until that run is green, the cron is not trusted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-106"></a>

## #106 — test(ci): execute the deploy guards instead of trusting a comment

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `15f7a3de3` · `vendor-guard-gate` → `main` · +452/−11 across 3 files

Two properties that ship this site were held by prose and nothing else. This makes both of them assertions in `pnpm test`.

## 1. The ordering edge

Netlify gave this repository one safety property for free: **the build command WAS the suite**, so a red suite could not produce a deploy. Moving the build into Actions turned that platform guarantee into an edge in a job graph — `needs: build` — and the only thing holding it was a comment at the top of `ci.yml` asking that nobody remove it.

A refactor that drops the edge is **green everywhere**: `pnpm test` passes, `actionlint` passes, the board is a row of ticks, and the deploy no longer waits for the tests.

## 2. The guards

Reading an `if:` cannot tell you what it evaluates to on a payload where the referenced object is **absent**. `github.event.pull_request.head.repo` is not merely different on a push — the whole object is missing, the dereference yields null, and loose equality makes the comparison false. The job SKIPS, and a skipped job renders as a grey check that reads as a pass. That is how the first draft of this plan shipped a production deploy no context could ever reach, behind an entirely green run.

So the guards are **executed**, not read, in `@actions/expressions` — the build of `actions/languageservices` that powers the Actions language server, so `truthy()` is GitHub's coercion rule (null, `""` and `0` are false) rather than JavaScript's.

## Why vendoring it changes anything

These checks already existed, in `~/.claude/plans/019-assets/`. They had to be remembered, run by hand, and pointed at a **copy** of the workflow that could silently drift from the real one. They read the real file now, and they run behind the same gate as everything else.

Three things are stronger than the originals:

- **Publishing jobs are discovered from the capability, not the name.** A job that can publish is exactly a job that can read `secrets.CLOUDFLARE_API_TOKEN`. Keying on a `deploy-` prefix would be a naming convention, and a third job called `release-production` would slip past every assertion while looking reviewed.
- **The ordering property is stated as the property**, not the string: *depends transitively on the job that runs `pnpm test`*. A rename, or an inserted intermediate job, both keep the property and would both break a literal check on `needs: build`.
- **Each historical defect is replayed against the same nine contexts and must be caught.** The previous gate had four contexts and reported clean on a guard that deployed a feature branch to production — the row that would have caught it was simply absent. This is the non-vacuity proof for the context table, and it is the check I most wanted and did not have.

It also gates the invariant `ci.yml` calls out as prose: a job holding the deploy token must declare `environment:`, or it is covered by no deployment branch policy.

## Calibration — every assertion made to fail on the defect it claims to catch

| Mutation to `ci.yml` | Result |
|---|---|
| `deploy-production` loses `needs: build` | **1 red** — the transitive-suite assertion |
| `deploy-preview` loses its `environment:` | **1 red** — the branch-policy assertion |
| production guard reverts to the deny-list spelling | **4 red** — 2 partition rows + 2 non-vacuity rows |
| a third publishing job named `release-to-the-world` | **10 red** — proves discovery is capability-keyed |
| `build` renamed to `verify` | **stays green** — proves the rename-robustness claim |
| restored | **21 pass** |

## Incidental

`pnpm check` found a real bug the untyped `.mjs` original hid: `Evaluator` wants a `Dictionary`, not the `ExpressionData` union `toData` returns. Typing the gate was worth it on its own.

Suite **320 → 341**. New devDependencies: `@actions/expressions` (pinned to `0.3.60`, the version the gate was written against) and `yaml` — the workflow is parsed with a real parser rather than regexed, so a guard reformatted from `>-` to `|` or onto one line still reads correctly.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-107"></a>

## #107 — feat(404): answer an unknown URL with a race bib, not a soft 200

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `08ca25ac8` · `not-found-page` → `main` · +431/−11 across 5 files

## The defect this closes

Cloudflare Pages resolves an unknown path by walking up looking for `${dir}/404.html` and, finding none, serves `/index.html` — **with a 200**. Measured on a real preview deployment:

| path | calvin.sg (Netlify) | calvindotsg.pages.dev |
|---|---|---|
| `/does-not-exist` | `404` | **`200` + the home page** |
| `/patches/nonsense` | `404` | **`200` + the home page** |

A dead link that answers 200 is invisible to every uptime monitor, crawler and link checker there is. Without this page, the entire class of broken URL stops being reportable the moment the domain moves. **Hard prerequisite for the cutover.**

Astro emits this route as `dist/404.html`, which is the file *both* hosts look for — so one page fixes the incoming host and improves the outgoing one. No redirect rule, nothing host-specific in the repo, and a real route on the shared layout rather than a `public/404.html` that would rot out of the theme, the analytics tag and the build-date stamp.

## The design

The stock answers — a cartoon, a magnifying glass, the number set huge in the body face — could be lifted onto any site on the internet. This site already owns one object drawn nowhere else: **the race bib** on `/patches`. An HTTP status code is a number handed to a reader for something that is not there; a bib is a number pinned to something that is. So `404` is set as a race number, and nothing captions the joke.

```
  ┌ ∘ ─────────────────── ∘ ┐
  │                         │
  │         4 0 4           │   <- the bib: hairline edge, four pin holes,
  │                         │      the number centred in the wall.s own
  └ ∘ ─────────────────── ∘ ┘      display metric

  Page not found
  That number is not on the start list. The rest of the site is:
  <- Home
     My events
```

### Arrived at by building the opposite first

`Patch.astro` punches four pin holes for a run and two for a ride — *"the count is the information"* — and `.bib--booked` removes them because a hole is a void in an opaque face. Following that argument gave a bib with **no** holes, which I built, screenshotted and threw away: alone on the page it reads as *a rectangle with a number in it*, which is precisely the stock 404 this design exists to avoid. Five neighbouring bibs are what keep the wall.s outline treatment legible; this one has none.

So the holes come back, painted as the **edge of the punch** rather than as the void. Using `--background` as the fill was measured and rejected: `#FAFAFA` on `#FAFAFA` light and `#111111` on `#111111` dark — four invisible dots.

### What was cut

The bib was tagged **`DNS — Did Not Start`**, which is exactly what a results sheet prints against a number that never crossed the line, and it is the best phrase in the whole subject. It is gone because on a *web* error page those three letters read as **Domain Name System**, and a reader who takes it that way has been told their network is broken. Right word, wrong venue.

### No new vocabulary

- **Colour:** theme tokens only, and deliberately *not* `--accent` — this site spends the accent on controls, and an error is not one.
- **Type:** no new face. The numeral wears the bib.s own display metric (weight 800, `line-height: 0.82`, `-0.045em`), which was designed for a number printed on a bib.
- **Motion:** none. The site is static and minimal; a bib that slid in would be the one moving thing on the domain. Nothing animates, so there is nothing for `prefers-reduced-motion` to turn off.

Verified in both themes, at 390px, and at a **40px root** where `docOverflow` is `0`, nothing clips, and keyboard focus is visible.

## The gates

Two build-wide gates cannot hold this page — it is in no sitemap and reachable from no link — so it is **named in both** rather than either being loosened, and it is separately *required* to link home so a reader who lands here is not stranded.

A third gate turned out to be **wrong rather than inapplicable**. The forced-colours non-vacuity check demanded a `forced-colors` rule on *every* page, which was two questions wearing one assertion. Split, both are still asked and neither is weaker: every page must resolve to some CSS, and the *build* must ship `forced-colors` rules somewhere. The old spelling never checked that what it found was what it wanted.

### Calibration — six mutations, each proving the assertion it claims

| Mutation | Result |
|---|---|
| a real page dropped from the sitemap | **red** |
| the 404 added to the sitemap | **red** |
| the 404 stripped of its way home | **red** |
| a **second** unreachable page added | **red** — it does not inherit the exemption |
| `forced-colors` stripped build-wide | **red** |
| one page resolving to no CSS at all | **red** |

Suite **320 → 327**.

### Incidental finding

`pnpm preview` cannot be used to check this page: `astro preview` intercepts unknown paths *and* `/404.html` itself with its own built-in error page. Serve `dist/` as plain static files instead.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-108"></a>

## #108 — feat(seo): derive robots.txt and llms.txt, and date the sitemap honestly

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `ee3f54e9d` · `seo-aeo-single-source` → `main` · +587/−24 across 9 files

## What

`robots.txt` and `llms.txt` become generated Astro endpoints derived from `constants.ts`, and schema.org gets a full name. A sitemap `lastmod` was part of this PR and has been **removed again** after review — see below.

## Why

Both files were hand-written in `public/`, restating identity that already lives in `constants.ts` — and both had drifted. `llms.txt` said "Business Systems Analyst" where `CAREER[0].job_name` says **Founding** Business Systems Analyst, paraphrased two project descriptions rather than quoting them, and omitted `homebrew-tap` entirely while listing `granola-to-minutes`, which his profile README does not. Nothing caught it because nothing looked — and *"nothing could"*, which an earlier version of this PR claimed, is too strong: a test could always have grepped the static file. What a flat file in `public/` really costs is that every such check must be written and remembered one fact at a time, against a copy with no relationship to its source.

The fix is not to correct the wording. It is to make the files derived.

## The sitemap `lastmod` was removed — the PR's own argument condemned it

This PR originally added `lastmod: stravaProgress.updated_at`, justified by [Google using `lastmod` only "if it's consistently and verifiably accurate"](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Measured on this site, that stamp fails the test **in both directions, on every URL**:

- **False positive.** Move the kilometres and rebuild: all four URLs get a new `lastmod`, while `/patches/`, `/patches/cycling/` and `/patches/running/` come out **byte-identical**. Those pages contain no Strava kilometre at all. The file's history shows kilometres moving on 6 of the 8 days it has existed, so this is the common case.
- **False negative**, the harmful one. Freeze the kilometres and let the calendar run six days: all four pages change — countdowns tick and the 2026-08-02 bib flips outline→earned through `patchState` — while `lastmod` still reads 2026-07-29. A frozen date on a page that did change is an instruction not to come back.

The home page is no exception, which settled it: on that same rest week its cycling card goes from "Next race in 3 days" to "in 13 weeks" because a race passed, with the stamp unmoved.

An absent `lastmod` is simply ignored at no cost, so that is what ships. `astro.config.mjs` records what a genuinely accurate per-URL date would take (hash the built **output** into a committed manifest — and note every page embeds `<meta name="build-date">`, so a naive hash churns nightly) and why `BUILD_DATE` remains the wrong answer.

## Two things in the first draft were wrong

Both are kept as comments so they are not re-made.

**`robots.txt` had eight answer-engine groups** — `GPTBot`, `ClaudeBot`, `PerplexityBot` and friends, each with `Allow: /`. It changed nothing (`User-agent: *` already allowed them) and armed a trap: a crawler obeys the single most specific group matching its name and **ignores `*` entirely**, so the day a `Disallow:` is added to `*`, all eight sail past it. Name an agent only to give it rules that *differ*.

**`llms.txt` violated the spec.** It put goals under a `## Goals` heading as bare bullets; [llmstxt.org](https://llmstxt.org/) requires every H2 list item to carry a `[name](url)` link. Facts belong in the free-prose region, which also puts the most citable content first.

## What the review changed

A 24-agent panel over this PR, plus my own reproductions. Every finding landed on the guards this PR added or the prose it wrote; the shipped pages measured clean throughout.

- **Nothing gated what `robots.txt` *says*.** The gate asserted which groups exist and never what they allow, so `Allow: /` → `Disallow: /` de-indexed the entire site with the suite green and the deploy gate open — while the test's own docstring warned about exactly that scenario. It now asserts the whole directive list.
- **The H2 rule gated a spelling, not a rule.** Markdown treats `-`, `*`, `+` and `1.` alike, so the exact violation the gate exists to catch shipped green written `* `. It now asserts every non-blank, non-heading line below the first heading, which makes the marker irrelevant, and that no section is empty.
- **Content was asserted token-by-token**, so the endpoint could pair any name with another row's URL, description or distance and stay green. Each row is now found by its own key and the rest asserted *on that line*.
- **Nothing asserted `## Pages` at all** — the whole section could be deleted green. Every built page must now be linked.
- **`llms.txt` said "Races and challenges in 2026" over `EVENTS`**, which is the whole calendar in any year. That is the goal card's scope worn as a label on the wall's list; the wall itself dropped "My events · 2026" for this reason. The heading no longer names a year, and a gate holds it.
- **It invented page names.** "Patches" and "Running patches" appear nowhere a reader can see; the links now carry `PATCHES.heading` and the very string the goal card's control wears.
- The blockquote carries the job rather than the meta description; the company is **linked** rather than described as "a loyalty and travel rewards platform" (the one hand-written fact left in a derived file); the résumé path comes off `LINKS`; the slice markers are asserted before being sliced on; and `llms.txt`/`robots.txt` join the emoji scan, whose excuse for skipping them was false.

## Gates

Suite **354 → 359**, five new gates. Fifteen mutations run against the final state: **fourteen red, and one harmless reword green**, so the gates discriminate rather than merely being strict.

| mutation | result |
|---|---|
| `Disallow: /` under the `*` group | red |
| a second `User-agent` group | red |
| bare bullet under an H2 — `- `, `* `, `+ `, `1. ` | red |
| delete a `## Pages` link | red |
| cross-wire a name with another row's description | red |
| emoji in a project description | red |
| re-add a build-date `lastmod` | red |
| put the goal year back on the race heading | red |
| blockquote back to the meta description | red |
| rename a heading the race gate slices on | red |
| drop the completed-race list / the `full_name` H1 | red |
| *reword a page's trailing note* | *green (control)* |

Two calibrations are worth reading, because both are cases where the obvious record would have been false:

**The `patchState` race-split gate is green on its own mutation today.** Reverting the endpoint to a date comparison leaves the suite at 359, because the two predicates diverge only on a race dated *today* carrying a recording, and the newest is 2026-07-29 against a 2026-07-30 build. It is red with that input present and green on correct code with the same input — so it is sound, with **calendar-dependent reach**, not a proof that ran. Writing "calibrated red" for it would have recorded a calibration that never happened.

**Mutating a description in `constants.ts` leaves the content gate green**, because the endpoint regenerates from the same constant the assertion reads — both sides move and the comparison is a tautology. That is not a hole to plug; pinning the literal would restore the duplication this removes. The axis gated is *omission* and *association*, so the calibration must mutate the **endpoint**.

## Known and deliberately not fixed

`METADATA.title` and `WELCOME.description` still say "Business Systems Analyst" without "Founding", disagreeing with `CAREER[0].job_name` and with the JSON-LD `jobTitle`, which already derived it before this PR. It is the same drift class — but the fix is a visible copy change to the page heading and the browser title, and doing one without the other adds a third spelling. Left for a copy decision rather than folded into an SEO PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-07-30

## Review panel — 24 agents, 0 dead, ~1.56M subagent tokens, ~36 min

5 dimensions (`gates` / `consumer` / `claims` / `code` / `argue-against`) → one skeptic per finding, capped **per dimension** (every blocker and major verified; minors capped at one each). **24 findings raised, 17 verified: 17 stand, 0 refuted, 2 out of scope, and 13 of 17 remedies judged unsound.**

**Brief used: neutral** — *"judge on the merits, do not default to either verdict."* That matters for reading the number: on this repo, adding *"default toward refuted"* has been measured to swing survival from ~90% to ~10% without the code changing. A survival rate is only meaningful alongside the brief that produced it, so this one is not comparable to earlier runs.

**Both planted calibration controls came back correct**, which is what licenses trusting the rest:

| control | verdict | |
|---|---|---|
| known-**true** (the body's suite count is wrong) | `stands` | ✅ and it went further — see below |
| known-**false** (robots.txt emits `Disallow: /patches/`) | `refuted` | ✅ refuted by building and grepping, not by reading |

0 refuted across the real findings is therefore *not* a soft panel: discrimination showed up as severity correction and as remedy rejection, which is the healthy shape here.

### Fixed in c9f3048

| sev | finding | resolution |
|---|---|---|
| **blocker** | Nothing gated robots.txt's *permission* — `Allow: /` → `Disallow: /` de-indexes the site with the suite green | gate asserts the whole directive list |
| major | H2 gate matched only `- `, so `* `/`+ `/`1. ` carried the exact violation through | inverted: every non-blank non-heading line below the first H2 must be a link item |
| major | Content asserted token-by-token, so rows could be cross-wired | each row found by its own key, rest asserted on that line |
| major | `## Pages` asserted by nothing — deletable green | every built page must be linked |
| major | `lastmod` inaccurate in both directions on every URL | **removed**; reasoning recorded in the config |
| major | "Races and challenges in 2026" over the whole-calendar `EVENTS` | year dropped, gated |
| major | PR body stale: 5 gates not 4, 359 not 358 | corrected, with an honest fifth row |
| major | `PROJECTS` docstring named the wrong project and contradicted itself | corrected |
| minor | Invented page names ("Patches", "Running patches") | derive from `PATCHES.heading` / the goal card's own string |
| minor | Hand-written "a loyalty and travel rewards platform" in a derived file | company linked via `company_url` |
| minor | Blockquote carried the meta description, not the identity | carries the job + summary |
| minor | Emoji gate's excuse for skipping llms.txt was false | llms.txt and robots.txt now scanned |
| minor | `indexOf` slice bounds unguarded (`-1` → wrong window) | markers asserted before slicing |
| minor | `/resume.pdf` typed a second time | derived from `LINKS` |
| minor | `"nothing could"` overclaimed | softened to what is true |

### Two calibrations that would have been recorded falsely

- **The `patchState` gate is green on its own mutation today.** The control measured it: the two predicates diverge only on a race dated *today* carrying a recording. It is red with that input and green on correct code with it, so it is sound with **calendar-dependent reach**. Recording it as "calibrated red" would have invented a calibration.
- **Mutating a description in `constants.ts` leaves the content gate green** — the endpoint regenerates from the constant the assertion reads, so both sides move. Not a hole; pinning the literal would restore the duplication. The calibration must mutate the *endpoint*, which is how the cross-wiring hole was found.

### Verified, and deliberately not fixed here

`METADATA.title` and `WELCOME.description` still omit "Founding", disagreeing with `CAREER[0].job_name` and the JSON-LD `jobTitle` (which already derived it *before* this PR — the mismatch is pre-existing, not introduced). Same drift class, but the remedy is a visible copy change to the page heading and browser title, and fixing one without the other adds a third spelling. That is a copy decision, not an SEO one.

Also logged, all pre-existing: `public/_headers` is a second ungated path to de-indexing (`X-Robots-Tag`); the HTML-comment gate and the asset gate are page-only and hardcode filenames; `PROJECTS` membership is gated by nothing, since its source of truth is a README the build cannot fetch.

### Fix verification

15 mutations against the final tree: **14 red, 1 green** — the green being a harmless reword, present so the battery proves the gates discriminate rather than merely being strict. Both previously-red directions were re-run and stayed red, so no fix reopened an old hole. Suite 354 → 359, `pnpm check` 0 errors / 0 warnings / 2 hints (identical to `origin/main`).

One caught by the battery and worth naming: my *own* first version of the new year-scope gate **passed the mutation it was written for**, because it sliced from the `completed:` marker and the year sat before the window. Fixed to read the whole line.


---

<a id="pr-109"></a>

## #109 — chore(ci): finish leaving Netlify, and re-source every claim that named it

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `69a4c70af` · `chore/complete-cloudflare-cutover` → `main` · +261/−188 across 15 files

Completes the move Calvin asked to finish now, with no 14-day rollback window: the Netlify project is **deleted**, and every claim in the repository that named it is either re-sourced or marked as history. Measured at `8cf2817` (three commits: the cutover, then two follow-ups that removed hand-counted numbers from comments).

## The deletion

| | |
|---|---|
| Netlify project `calvindotsg` (`1e7b40f5`) | deleted — `calvindotsg.netlify.app` now 404s |
| `netlify.toml` (63 lines) | deleted — verified first that no test read it |
| local `.netlify/` (189 MB) | deleted |
| its DNS zone | already gone; the site record just carried a stale `dns_zone_id` |

**Nothing was lost, checked before deleting.** `UMAMI_ID` was the project's only setting, and it exists three other ways: the GitHub repository variable, 1Password, and — decisively — live in the HTML production already serves, which proves the Cloudflare path injects it independently. Registrar NS point only at Cloudflare, so the Netlify zone was unreachable either way.

## Most of this is not deletion

Ten comments said a red suite fails a *production deploy* **because** the suite was the Netlify build command. The consequence is still true — it now rests on `ci.yml`'s `needs: build` edge, which `tests/workflow-guards.test.ts` executes rather than reads — so those are **re-sourced, not cut**. The reasoning is why several assertions are shaped the way they are (no per-category floors, no hand-counted non-vacuity guards), and deleting it would invite someone to add them back.

Seven mentions in `ci.yml` and `strava-progress.yml` say *"Netlify gave us this for free; this design does not"*. **Left alone** — deleting them deletes the reason those guards exist.

## Two comments that expired on the deletion step itself

Swept as part of it rather than after, because the step is what falsified them:

- `public/_headers` promised its lower-case header name *"must stay that way until `netlify.toml` is deleted at the cutover"*.
- `tests/setup/build.ts` spared `.netlify/state.json` to protect a CLI link to a site that no longer exists. It now clears the whole directory.

`_headers` is the **only** carrier of the immutable cache rule now, so its header records the measurement that proves it: one host, one deploy, `/` returns `max-age=0, must-revalidate` and `/_astro/icons.*.css` returns `max-age=31536000, immutable` — and the only difference between them is that one path is named there.

## `.devin/wiki.json` — stale on two axes, tested by nothing

33 KB of DeepWiki steering. Beyond the host, **PR #108 had already invalidated it**: it still instructed a generator to *"hand-update `public/llms.txt`"* and said `public/robots.txt` *"hand-codes the sitemap URL"*, when `public/` holds no text file at all — both are generated endpoints. It also carried a *"never recommend a second CI system"* directive that now forbids describing what actually ships. Both axes fixed; the deploy page retitled off `netlify.toml`.

## One defect closed while in there

**The Node version had three homes.** `.nvmrc` says `26`; both deploy jobs hardcode `node-version: "26"` because they have no checkout by design, and `ci.yml` said in as many words that *nothing tested the agreement*. A `.nvmrc` bump would leave the build on the new Node and the `npx wrangler` publish on the old one, green.

Now asserted — over **every** workflow, not just `ci.yml`, since a new workflow is where the next copy would land. Calibrated:

| mutation | |
|---|---|
| `.nvmrc` bumped, literals left behind | RED |
| build job stops reading `.nvmrc` | RED |
| a `setup-node` step pins neither | RED |
| a step declares both keys | RED |
| **negative control** — reword a comment | GREEN |

## Gate

`pnpm check` 0 errors / 0 warnings / 2 hints — identical to `main`. `pnpm eslint` clean. Suite **359 → 362 in 12 files**: four new assertions, and the two "no server runtime" tests merged into one that names no platform.

Production re-checked after the deletion: apex 200, `/_astro/` still `public, max-age=31536000, immutable`.

And checked on **this branch's own preview deploy**, which is the sharper test now that `netlify.toml` is gone — a build that has never seen it: `/` returns `max-age=0, must-revalidate`, `/_astro/icons.*.css` returns `max-age=31536000, immutable`, and `/_headers` itself 404s. The only difference between the two paths is that one is named in that file, so it is demonstrably the thing doing the work.

## Still open, and recorded in `plans/README.md` rather than fixed here

`www.calvin.sg` answers 200 in its own right instead of redirecting to the apex. The fix is a Cloudflare Redirect Rule and it is **dashboard-only** — the Rules API 403s for the OAuth profile the CLI holds — so no agent can apply it, and it is now written down so none keeps proposing it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-110"></a>

## #110 — docs(plans): correct the www finding — the cause is a Pages binding, not a missing rule

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `f7aeead45` · `docs/www-canonical-finding` → `main` · +23/−5 across 1 files

Corrects the open item I recorded in #109. It blamed a missing Redirect Rule; that was the symptom.

## The actual cause

`www.calvin.sg` is an **attached custom domain on the Pages project** — `active`, with its own Google Trust Services certificate issued three minutes before the apex's. Pages routes by Host header, so `www` and `calvin.sg` are *equal origin bindings*. A Redirect Rule would have masked the duplicate; detaching the domain removes it.

I found this by reading the Pages custom-domain list, which the first pass never checked — I went to Page Rules because that is where the screenshot pointed.

## Order is load-bearing

Rule first, **then** detach. Per Cloudflare's docs, Single Redirects *"execute first in the rules pipeline"* and *"take precedence over Page Rules"*, so once the rule lands `www` never reaches Pages. Detaching first would break `www` until the rule existed.

## Two more findings from the same review

- The `Always Use HTTPS` Page Rule is **disabled**, and its pattern `http://*.calvin.sg/*` **cannot match the apex** (`*.` requires a label) — so it never did the job it looks like it does. Both hostnames upgrade anyway from the zone-level setting, which is the contrast that proves it: the pattern matches `www`, the rule is off, `www` still upgrades.
- Neither hostname sends HSTS.

## Why no agent can apply it

Measured against the API rather than inferred from the CLI's command surface:

```
zones/<id>/rulesets                   403  10000
zones/<id>/pagerules                  403   9109
zones/<id>/settings/security_header   403   9109
user/tokens                           403   9109   <- cannot mint a token
accounts/<id>/tokens                  403   9109   <- nor an account-owned one
```

The `cf` OAuth profile cannot grant itself the scope, and the 1Password token is Pages-only ("Pages Write, entire Calvin account"). So this is genuinely maintainer-only, and now says so with evidence instead of a guess.

## Deliverables (in `.scratchpad/`, gitignored)

- `canonicalise-www.sh` — does all four changes in the safe order behind a `--apply` flag. Verified: aborts at step 0 on an under-scoped token before mutating anything, appends to the redirect phase rather than blind-`PUT`ting over it, is idempotent on re-run, and stops before the destructive steps if `www` has not started answering 301.
- `verify-canonical.sh` — 14 checks, no credentials needed. **Calibrated against today: 9 pass, 5 fail**, exactly the five the change should fix. Its header comment first said "four failures" from recall; the run said five, and the comment now records that.

No production change in this PR — `dist/` is untouched, `plans/` is not in the build.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-111"></a>

## #111 — docs(plans): www now redirects — and record the two instruments that lied

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-30 as `5b6d8a7e8` · `docs/www-canonical-resolved` → `main` · +26/−23 across 1 files

`www.calvin.sg` now redirects. Verified end to end, and the verification found something the first pass had wrong.

## Result

```
https://www.calvin.sg/                  hops=1  final=https://calvin.sg/                  [200]
https://www.calvin.sg/patches/cycling/  hops=1  final=https://calvin.sg/patches/cycling/  [200]
https://www.calvin.sg/robots.txt        hops=1  final=https://calvin.sg/robots.txt        [200]
http://www.calvin.sg/                   hops=1  final=https://calvin.sg/                  [200]
```

`verify-canonical.sh`: **15 passed, 0 failed** — from 9/5 at the calibration run. HSTS on at `max-age=15552000`, no `includeSubDomains`, no preload. Both legacy Page Rules deleted; slickshots moved to a Single Redirect and still forwards (`302` → Instagram). All four GitHub Pages subdomains untouched.

## Two instruments lied, and both are recorded rather than quietly patched

**1. The apply script reported `www` "already detached" when its API read had been refused.**

The token I specified was zone-scoped only — I omitted `Account → Cloudflare Pages → Edit`. So step 2's `GET` 403d, `.result` came back null, the `select()` matched nothing, and the else branch printed the reassuring answer. **A failed read and an absent domain were indistinguishable to it.** Same shape as a green run whose risky path never executed.

Caught by re-reading the Pages custom-domain list afterwards instead of trusting the run — it still said `www.calvin.sg  active`. Fixed three ways: the permission list now includes Pages, step 0 probes *every* surface a later step writes to, and step 2 exits rather than interpreting a read it did not get. Confirmed the fixed script now fails closed on all four probes.

**2. The gate passed 14/14 while `www` was still bound to Pages.**

This is the more interesting one. The redirect fires before origin selection, so from outside every observable was already correct — the duplicate binding was completely invisible to a behavioural probe. **A behavioural gate cannot see a redundancy that something upstream is masking.** Check 11 now reads the binding itself, calibrated by the transition: `calvin.sg active` + `www.calvin.sg active` before, `calvin.sg` alone after.

## What I did versus what you did

You ran the script; it did the redirect rules, the Page Rule deletions and HSTS. The detach it silently skipped, so I did that one from the session — `pages:write` was the single permission this OAuth profile always had, and the precondition (`www` already answering 301) was verified before the DELETE rather than assumed.

No production content change — `dist/` untouched, `plans/` is not in the build.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-112"></a>

## #112 — feat(dns): put the zone in git, and prove the exclusions cannot delete

`merged` · opened 2026-07-30 by **calvindotsg** · merged 2026-07-31 as `6628dc728` · `feat/dns-as-code` → `main` · +1605/−14 across 15 files

## What this is

The zone in git. `dns/zones/calvin.sg.yaml` holds **10 of the zone's 15 records**; the other five are excluded, each for a different reason stated in `dns/config.yaml` beside the exclusion:

| Excluded | Why |
|---|---|
| 3 × `MX` | Cloudflare Email Routing owns them and marks them `meta.email_routing` |
| `cf2024-1._domainkey` | also marked **`read_only`** — the API refuses to write it at all |
| `_dmarc` | its `rua=` is a personal mailbox, and **no email address appears anywhere else in this public repo**. Not a DNS decision; one line deletes the exclusion |

## Verified against the live zone, not against itself

- `dns/test_filters.py` runs a **real octoDNS plan** against a fixture of the live zone with only the HTTP call stubbed — pagination, the SUPPORTS filter, the root-CNAME↔ALIAS rewrite are all the shipped code path. **9/9.** Its first check is the migration plan's own apply precondition ("forbidden until a dry-run reports an empty plan"), answered offline.
- Cross-checked against Cloudflare's own **BIND export** (an oracle derived from nothing in this repo): the 15 records partition exactly into managed-or-excluded, nothing unaccounted for.
- Mutation battery: **8 of 9** mutations turn the suite red, harmless-comment control stays green. The 9th is documented below.

## Two things the plan had wrong, found by measuring

**1. `pagerules` defaults to `true`.** That makes the provider read legacy Page Rules as records it owns and delete any absent from `dns/zones/` — so the first plan would have proposed deleting the **www → apex redirect created the day before** in WP5. No reject list defends it: the rule surfaces under the name of the host it matches (`URLFWD www`), the same name as the www CNAME. `config.yaml` sets `pagerules: false`; the test executes both settings and asserts the difference.

**2. The apex and `www` CNAMEs are not "Pages-managed".** The plan proposed excluding them on that basis. Cloudflare marks what it owns, and both carry `meta: {}` — they are ordinary hand-managed records. They are in git.

## Where the safety lives

`enable_checksum` gives DNS `terraform plan -out` semantics: an apply must be handed the checksum of the plan a human read, and a zone that moved in between fails the run. **It also relocates the safety** — with it on, octoDNS documents `--doit` as *ignored*, and `Manager.sync` has no dry-run guard on its apply loop. What decides whether a run writes is whether it got `--checksum`.

`dns.yml` splits on exactly that, plus two independent locks: the plan job holds a **read-only** token, the apply job a write token behind the `dns` environment.

## Why a TypeScript test as well as a Python one

`dns.yml` only triggers itself on `dns/**` — so a refactor that guts its safety need not run it. `tests/dns-config.test.ts` (31 checks) runs in `pnpm test` on every PR and executes the workflow's `if:` guards in GitHub's own evaluator. **It caught a real bug in this PR**: the plan job admitted `pull_request_target`, the deny-list mistake `ci.yml` already documents.

## Live — verified against the real zone

Both zone-scoped tokens exist and are loaded (`CLOUDFLARE_DNS_READ_TOKEN` as a repository secret, `CLOUDFLARE_DNS_WRITE_TOKEN` in the `dns` environment, which is restricted to `main`). **The first plan against the live zone reported "No changes were planned"** — Cloudflare returned 11 records, the reject lists removed 3, and the remaining 8 matched `dns/zones/calvin.sg.yaml` exactly. That is the migration plan's own apply precondition, satisfied for real rather than offline.

**The two-token split is measured, not asserted.** Each token lists only `calvin.sg` and reads all 15 records; on an attempted write the read token returns **403 Authentication error** and the write token returns 400 for an invalid record type — permission present, body rejected. Zone unchanged at 15 records throughout.

## Honest limits

- **TTL is invisible to every check.** Every record is auto-TTL, and the provider copies the existing TTL over the desired one before comparing (`"TTLs are ignored for these"`). `300` and `1` both diff to nothing. I originally claimed the opposite in a comment; the mutation battery refuted it and the comment now says so.

`pnpm test` **394 passing in 13 files** (was 362/12) · `pnpm check` 0 errors · `actionlint` clean

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-113"></a>

## #113 — fix(seo): serve one job title, everywhere, and a title that fits the result

`merged` · opened 2026-07-31 by **calvindotsg** · merged 2026-07-31 as `52ce0525a` · `worktree-founding-title` → `main` · +262/−14 across 8 files

## Summary

- One page gave two answers to "what is his job". `<title>`, the JSON-LD and the intro card's h1 now all derive from `CAREER[0]`, so the page has one record of the fact instead of a corrected copy and a forgotten one.
- The title copy is rewritten because it has never fitted a search result — **724px** at its longest, against a ~600px estimate — and the gate on it measures **width**, not characters.
- "Enthusiastic learner." is cut from the h1 as well as the title, and `public/preview.jpg` is regenerated.
- `ABOUT_ME`'s cycling-challenge line is kept, with a note recording why the next audit will flag it and why that is wrong.

## Problem

**1. The "Founding" split.** On production, in the same document:

```
<title>Calvin - Business Systems Analyst | Road Cyclist | Enthusiastic Learner</title>
"jobTitle":"Founding Business Systems Analyst"
```

The JSON-LD reads `CAREER[0].job_name`. The title was a hand-typed copy of the same fact, and it missed the promotion.

**2. So was the h1, and worse.** `WELCOME.description[1]` read `"Business Systems Analyst."` — character-identical to `CAREER[1].job_name`, the title held at NCS until Aug 2023 — rendered in the page's largest type directly above a role card announcing the current one, and a second card showing the NCS one with its own dates. Correcting the title alone would have moved the defect rather than closed it.

**3. The title has never fitted.** A result truncates by pixel width. Measured in Chrome (canvas `measureText`, cross-checked against a laid-out span in the same face, agreeing to 0.34%):

| title | px | fits ~600 |
|---|---|---|
| `Calvin - Business Systems Analyst \| Road Cyclist \| Enthusiastic Learner` (production) | 635 | no |
| `Calvin - Founding Business Systems Analyst \| Road Cyclist \| Enthusiastic Learner` (fix alone) | 724 | no |
| `Calvin Loh — Founding Business Systems Analyst \| Road Cyclist` (this PR) | **578** | yes |

The ~600px is an **SEO convention, not a documented constant** — Google states only that a title link is truncated "typically to fit the device width", and the vendor figures in circulation disagree. It is a tripwire that says front-load, not a budget with slack to spend, and the code comment now says so.

## Solution

**Everything about the current job derives from `CAREER[0]`:** the JSON-LD `jobTitle`, both `/llms.txt` lines, the intro card's h1, and `METADATA.title` — which also feeds `og:title` and `twitter:title`. `FULL_NAME` gets the same treatment for the name. A pointer above `CAREER` says so, since editing it is now a five-surface change.

**The copy.** "Enthusiastic Learner" went first: no card, page, goal or event on this site is about it. It is cut from the h1 too, so that is a decision about the copy rather than a truncation forced by a budget — and it pays for the longer job line, leaving three h1s where there were four. Cycling stays because it is what the h1 claims and what half the site is; running has an equal claim and does not fit (five phrasings naming both sports were measured, cheapest 601px). The name is the full one because a title is where an engine decides which Calvin this is.

**`public/preview.jpg` is regenerated.** It renders that card, and it is both the OG image and README's hero, so `og:title` saying "Founding" over a picture saying otherwise was a defect this PR would have introduced. It was already stale against main before this branch — RMSE 17.1, card 5px taller than when the file was made. Composition is unchanged and reproduced from the recorded recipe: card 824px wide, resized to 1180 at (10,63) on a 1200×630 `#111111` canvas, captured at 4× and downscaled.

**Four gates**, three of them added or fixed after the review:

- `tests/constants.test.ts` sums **Arial 20px advance widths** (`tests/helpers/arial-20px.ts`) and asserts ≤600px. Summing is an upper bound — kerning only pulls glyphs closer — so it errs toward failing a title that would just have fitted.
- `tests/build-output.test.ts` holds `dist/index.html`'s `<title>` against `CAREER[0].job_name` and `METADATA.full_name` — the shipped bytes.
- `tests/rendered-html.test.ts` does the same on the in-process render, which is what catches the expression being re-typed as a literal.
- `tests/constants.test.ts` asserts `job_name` is set and that the full name agrees with the independent `METADATA.name` literal.

## Review panel

Four dimensions ran against `4aefb8a` in isolated worktrees — method-audit, claims/numbers, correctness/regression, copy/SEO. **26 findings, 15 distinct defects after deduping, all acted on**; the claims dimension was calibrated with planted true/false statements and classified all five correctly. Every number in the original body reproduced exactly; every finding landed on the prose or on the gates, none on the shipped page. Verdict table in a comment below.

## Test Plan

At `99263c8`.

- [x] `pnpm test` — 365 passed (12 files); `pnpm check` 0 errors; `pnpm eslint` clean
- [x] Shipped artifacts agree: `<title>`, `og:title`, `twitter:title`, `"jobTitle"` and both `dist/llms.txt` lines carry `Founding Business Systems Analyst`; the h1 stack is `Hi, I'm Calvin` / `Founding Business Systems Analyst.` / `Road cyclist.`
- [x] **Mutation battery, seven cases, all moved the required way.** Must go red: empty `job_name` (the vacuous-`toContain` case), empty `FULL_NAME`, a title that drops the name, a 33-char job title rendering 606px (which the old character cap *passed*), and the stale typed literal. Must stay green: a 40-char job title rendering 565px (which the old cap *failed*), and a harmless copy edit as a control.
- [x] **The artifact gate is real.** Corrupting `dist/index.html`'s `<title>` by hand reds `build-output.test.ts` (2 failed) and correctly leaves `rendered-html.test.ts` green — it renders in-process, which is what the corrected comments now say.
- [x] Whole-tree `dist/` diff against `origin/main`: `index.html` is the only page that differs, in `<title>`, `og:title` and `twitter:title`; em dash is raw UTF-8 through every surface
- [x] Font measurement has a face read-back (0.34%) and a 20px Times negative control; the advance-width table reproduces `measureText` to 0.000px on four of five real titles, 1.846px high on the fifth (kerning, in the safe direction)
- [ ] CI green on this branch before merge

## Related Issues

None — this repo does not use Linear.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_019UbGv9xHmyTpnD4QQYxGS1


### Discussion (1)

**calvindotsg** — 2026-07-31

## Review panel verdicts

Four dimensions against `4aefb8a`, isolated worktrees, ~330k subagent tokens. **26 findings → 15 distinct defects** after deduping on defect identity rather than location. Not one landed on the shipped page: every finding was in the prose I wrote or in the gates I added, which is what a "fix plus new guards" PR should expect.

The claims dimension carried planted control statements (three true, one false, one true-but-subtle). It classified all five correctly, so its other verdicts are worth the weight given here.

| # | Sev | Defect | Found by | Resolution at `99263c8` |
|---|---|---|---|---|
| 1 | MAJOR | h1 was a second, stale record of the job — character-identical to the NCS title | claims, copy | h1 derives from `CAREER[0]`; "one record" is now true |
| 2 | MAJOR | Character cap was not a width proxy — broke in **both** directions | copy, method | Width gate over a measured Arial 20px advance table |
| 3 | MAJOR | `toContain("")` is true — empty `job_name` satisfied three assertions at once | method | `job_name` asserted non-empty in the CAREER loop |
| 4 | MAJOR | Nothing pinned the **name**; `FULL_NAME=""` shipped 5 wrong strings green | method, correctness | Both title gates check the name; full name related to `METADATA.name` |
| 5 | MAJOR | "reads the BUILT page" was false — that test never opens `dist/` | claims, method, correctness | Artifact assertion added to `build-output.test.ts`; both comments corrected |
| 6 | MAJOR | `METADATA.full_name`'s own doc still said page titles use the short name | copy, claims | Doc rewritten; `BasicLayout.astro`'s parenthetical swept too |
| 7 | MINOR | `og:image` showed the old title under an `og:title` saying "Founding" | correctness | `preview.jpg` regenerated (it was already stale on main: RMSE 17.1) |
| 8 | MINOR | "matches the `<heading> — <name>` shape" — the home title inverts it | all four | Comment says it inverts the shape, and why |
| 9 | MINOR | ~600px presented as a documented constant | claims, copy | Labelled an SEO convention; Google's actual wording quoted |
| 10 | MINOR | `wiki.json` told editors a job change has "nothing to hand-update" | correctness | Recipe updated; pointer added above `CAREER` |
| 11 | NIT | "Enthusiastic Learner names nothing on this site" — the h1 said it | claims, correctness | Dissolved: cut from the h1 too |
| 12 | NIT | "Road Cyclist" rationale didn't distinguish cycling from running | copy | Comment gives the measured reason: no both-sports phrasing fits (601px cheapest) |
| 13 | NIT | Cap had zero headroom while the prose described "two characters" of slack | copy, correctness | Dissolved by the width gate |
| 14 | NIT | Quoted 0.3% face agreement; measured 0.341% | claims | Corrected |
| 15 | NIT | Test Plan's mutation reds two tests, not the one quoted | method | Battery now reports the isolating 52-char case |

### Deliberately not acted on

- **`/now` card says "probably running when you find me" while `METADATA.description` says "probably cycling"** (copy, surprises). Real, pre-existing, and a copy decision rather than a defect this PR introduced.
- **An emptied `CAREER` array would now throw during module evaluation** rather than failing a test cleanly (correctness). Pre-existing in `BasicLayout.astro`; this PR moves the first dereference into `constants.ts`. Not worth a guard for a one-element-minimum array that a test already asserts is non-empty.
- **The build is not byte-deterministic between cold and warm image caches** (`data-image-component` on the portrait `<img>`). Worth knowing before anyone diffs two `dist/` trees; not this PR's.

### Corrections to the panel

Two dimensions rated the "BUILT page" claim MINOR on the grounds that `build-output.test.ts:1717` already pins `dist` transitively. That pin compares the artifact to `METADATA.title` — the expression the comment said the gate was deliberately *not* on — so the transitive guarantee was of the wrong thing. Treated as MAJOR and fixed at the artifact.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-114"></a>

## #114 — docs(plans): point at the archived location of plan 019

`merged` · opened 2026-07-31 by **calvindotsg** · merged 2026-07-31 as `4c8011804` · `docs/plan-019-archived` → `main` · +3/−2 across 1 files

Plan 019 finished when #112 merged, so its plan file moved to `~/.claude/plans/done/`. That made the path in `plans/README.md` wrong on the very step that completed the work — the stale-on-completion case worth fixing immediately rather than leaving for a later sweep to rediscover.

Also disambiguates the sentence: the point was that plan 019 has no file in **this repository's** `plans/done/`, which reads confusingly next to a path that now itself ends in `done/`.

Docs only — no code, no workflow, no test changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-115"></a>

## #115 — docs: gate the prose against the code, and make the wiki config evergreen

`merged` · opened 2026-07-31 by **calvindotsg** · merged 2026-07-31 as `82fa75469` · `claude/docs-rot-drift-review-gg9h1j` → `main` · +576/−42 across 6 files

Nothing in this repository could catch documentation rot. A comment naming a deleted file, a README naming a renamed script, or a generator config counting two of something there are now three of all build, lint, type-check and deploy green — and prose is the largest surface here, most of it inside comments hundreds of lines long.

## What this does

**Corrects twelve drift items found by reading.** The three that mattered:

- `.devin/wiki.json` told a generator the site's total first-party client JavaScript was *"two tiny inline scripts"*. The build ships **three** — the missing one is the press-hold script every `data-[leaving]:` declaration in `uno.config.ts` depends on.
- The wiki's enumeration of `src/lib/constants.ts` had silently lost two exports.
- The offset plate was located *"in the single `control` shortcut"* — there are four, and the plate had been factored out to `control-surface`, so a reader was sent to the variant that declares the box rather than the base that draws the plate.

**Rewrites `.devin/wiki.json` from a description of the repository into a standing instruction set.** It configures a generated wiki: written once, read on every future generation against a codebase that has moved, with nothing to prompt anyone to revisit it. A fact stated there is a fact nobody will check again. So eighteen count-phrases, every component filename, every exported constant and every CSS custom property are **deleted rather than corrected**, each replaced by a directive naming where to derive it. What the file keeps is what a generator cannot derive: audience and voice, the why-comments as primary sources to be quoted rather than paraphrased, the rule that absence here is usually a recorded decision, and the measurement traps that stay true as the code changes.

**Adds `tests/docs-drift.test.ts`**, which splits documents by kind — the load-bearing idea:

| kind | examples | gated for |
|---|---|---|
| current-state | `README.md`, `CLAUDE.md`, `plans/README.md`'s baseline table, comments under `src/` | **accuracy** — paths, `pnpm` scripts and configured names must exist; README names every suite; CLAUDE.md names every shortcut and how many, by canonical phrase |
| standing instruction | `.devin/wiki.json` | **durability** — no counts, no component filenames, no exported constant names; every page spec must say where to derive them |

`plans/done/` is exempt: a plan that stopped naming what it deleted would stop being a record of the deletion.

## What it does not do

Stated plainly, because omitting it is how the first draft of this PR went wrong.

The referential gates found **zero** defects against the pre-PR documents (80 path references and 33 commands checked), and the added gates would have caught roughly **a third** of what this change fixes by reading. They are regression insurance, not the audit.

**The durability gate holds spelling, not closure.** It detects a numeral before a noun, a filename, a constant name, a custom property — *not a closed set written in English*. A review panel caught this rewrite re-committing the very falsehood it exists to remove: a sentence calling the layout's scripts "the site's entire client runtime" and enumerating "one … and the other". Three ship. The gate saw nothing, because "one … and the other" is a count spelled in words. Review still owns that. The wiki now instructs enumeration from both the authored source and the built HTML, and forbids implying the scripts found are all there are.

Known limits, left for their own calibration pass rather than patched under merge pressure:

- the count regex false-positives on partitive English (*"one of the pages"*);
- the path gate covers top-level directories only, so widening it needs an exemption for files the archive legitimately names as deleted (`netlify.toml` appears five times, correctly, as history);
- the derivation-directive gate is weak by design and does not distinguish the new wiki from the old one.

## Also

Restores to `vitest.config.ts` the reason its unocss inlining is load-bearing — non-derivable, previously recorded only in the wiki and a frozen archive, and the line reads like dead config without it.

## Verification

- `pnpm test` 410 passing / 14 files, `pnpm check` 0 errors, `pnpm eslint` clean.
- **Site impact: none.** All 17 emitted files byte-identical to `main`.
- Runtime cost inside run-to-run noise; the suite executes in ~120 ms.
- Gates calibrated by mutation, and the two that were initially green against the change they exist to catch were fixed and re-calibrated.


---
