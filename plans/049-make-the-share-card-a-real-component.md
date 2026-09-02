# Plan 049: Make the share card a real component of this design system

> **Executor instructions**: Follow this plan step by step. Run every verification command
> and confirm the expected result before moving to the next step. If anything in the "STOP
> conditions" section occurs, stop and report — do not improvise. Your reviewer maintains
> `plans/README.md` — do not edit it (the edits execution implies are listed at the end for
> the reviewer). This repository overrides the upstream instruction to update your own status
> row.
>
> **Drift check (run first)**:
>
> ```sh
> git log --oneline -1 -- src/lib/brand-mark.ts src/lib/component-tokens.ts
> ls src/pages/brand/mark.svg.ts src/pages/brand/mark-light.svg.ts src/pages/brand/mark-dark.svg.ts
> grep -c 'section: "components"' src/content/design.ts
> git diff --stat a1b8ee5..HEAD -- \
>   src/content/design.ts src/lib/design-doc.ts src/pages/design.astro \
>   src/lib/palette.ts scripts/README.md package.json README.md
> ```
>
> **Plan 048 must have landed**: both modules must exist, all three `brand/*.svg.ts` ROUTES
> must exist, and the `components` grep must return `0`. (Check the routes, not `dist/` —
> `dist/` is gitignored and a fresh checkout has none, so an artifact check would stop a
> correct tree before step 1.) If any of the four fails, STOP — every
> step below builds on all of them. For the last command, compare the "Current state"
> excerpts against the live code and treat a mismatch as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: L (the largest in this directory; see "Scope" for what is deliberately excluded
  to keep it one plan)
- **Risk**: HIGH — vendors third-party licensed data into a public repository, adds a
  rasterising script, and puts a fixed-pixel object on a page whose gates forbid absolute
  heights
- **Depends on**: `plans/048-give-the-site-a-brand-mark.md`
- **Category**: direction (design system)
- **Planned at**: commit `a1b8ee5`, 2026-09-02

## Why this matters

The maintainer posts a square card to Strava for every gym session; it is drawn in this
site's palette, wears this site's mark, and is currently defined by a Python module in a
dotfiles repository whose own plan calls it a disposable proof of concept. That module
hardcodes this site's palette as literal hexes — eleven distinct values over 28 occurrences,
every one of them a published token — and the card's design rules —
why it is square, why the mark sits top-right, what the type floor is — live in a plan file
that will be archived. This plan brings the drawing, its rules and its tokens into the
repository that owns the palette, so the card becomes a published component of the design
system instead of a copy of it.

## Design decisions — settled by the maintainer. Do NOT relitigate

Locked 2026-09-02, the last two against rendered specimens at
[Sunrise Mark Mockups](https://claude.ai/code/artifact/1ab56b6b-f9a1-49eb-b37f-93890c4f1cf0).

1. **This repository holds the production implementation.** `~/.config/bin` is disposable and
   is not edited, imported, ported back to, or kept in sync.
2. **The card is published as a `components` entry**, derived from the implementation, in the
   DESIGN.md format's own vocabulary.
3. **No new runtime dependency.** `sharp` is already a devDependency and the machine already
   has `chrome-headless-shell`; the rasteriser is a script, not a build step.
4. **The anatomy is vendored from `HichamELBSI/react-native-body-highlighter` (MIT)** — the
   original source of the paths — and **not** from `Rippy1911/anatome` (Apache-2.0). See "The
   licence finding" below; this decision was made on evidence, and reversing it re-imports an
   obligation that was deliberately shed.
5. **The `/design` specimen is an INVENTED session, and the page says so** (mockup option
   4B). It carries one caption naming it as a specimen with invented values. This is the only
   specimen on that page that is not the real thing, and the caption is what keeps the page
   honest about it.

## The licence finding, and why it decides step 1

`Rippy1911/anatome` is Apache-2.0, and its `NOTICE` — which Apache-2.0 §4(d) requires a
redistributor to reproduce — contains the vendor's advertising for a separate commercial
product. **But the paths are not theirs.** Anatome's own `TERMS.md` §2:

> **Anatomical SVG paths**: MIT license, © Hicham El Boussarghini, originally from
> react-native-body-highlighter

Verified against the upstream on 2026-09-02, and it is a complete drop-in:

| What is needed | Where it is upstream | Licence |
|---|---|---|
| Muscle paths, front | `assets/bodyFront.ts` — `{slug, path:{left,right,common}}` | MIT |
| Muscle paths, back | `assets/bodyBack.ts` — same shape | MIT |
| viewBoxes | `components/SvgMaleWrapper.tsx` — `0 0 724 1448` front, `724 0 724 1448` back | MIT |
| Silhouette outline | the same file's `border` `<Path d=…>` | MIT |

The two viewBoxes tile into the `0 0 1448 1448` dual view the card uses, with no transform
arithmetic. **Every slug the card shades exists upstream** — front `abs adductors biceps
calves chest deltoids forearm neck obliques quadriceps tibialis trapezius triceps`, back
`adductors calves deltoids forearm gluteal hamstring lower-back neck trapezius triceps
upper-back` — checked one by one.

So the POC's own note that the outlines are Anatome's work is **wrong**, and taking the data
from upstream removes the Apache obligation, the advertising, and the mixed-licence question
from a public MIT repository, for exactly the same pixels.

**Attribution**: MIT requires the copyright and permission notice be carried — that is
`HichamELBSI`, and it is mandatory. The maintainer has additionally asked for a courtesy
credit to `Rippy1911/anatome`, whose own NOTICE invites one ("attribution is appreciated but
not required"); carry it as a credit line, **not** as their NOTICE file, which would import
the obligation this decision sheds.

**What is not taken, and must never be**: Anatome's bundled exercise photography. Its own
terms say the origin is unverified and it is not cleared for redistribution
(`Rippy1911/anatome` issue #48). It is not upstream either. And the exercise catalogue is
deliberately absent: fuzzy-matching the studio's vocabulary against it was measured at 13
hits / 26 misses with several actively wrong, which is the failure the alias table exists to
close.

## Current state

Evidence gathered 2026-09-02 at `a1b8ee5`.

### The files this plan creates or touches, and each one's role

- `src/lib/share-card.ts` (create) — **the whole card implementation**: one function
  returning an HTML string.
- `src/lib/body-map.ts` (create) — emits the dual-figure SVG from the vendored paths.
- `src/lib/anatome/` (create) — the vendored MIT path data plus its LICENSE and a refresh
  script.
- `src/data/bft/` (create) — the format quotes, the movement-to-muscle alias table, and the
  invented specimen session.
- `scripts/render-share-card.ts` (create) — writes the HTML, screenshots it, emits PNG+text.
  A `.ts` script run through `vite-node`, not a `.mjs` run through `node` — see the
  architecture note.
- `src/content/design.ts`, `src/lib/design-doc.ts`, `src/pages/design.astro`,
  `src/lib/component-tokens.ts` — the published section and its tokens.

### The implementation being ported, as it exists today

`~/.config/bin/bft_card_lib/card_layout.py:10-11` — the hardcoded palette this plan deletes:

```python
L = dict(bg="#FAFAFA", card="#F5F5F5", bord="#E5E5E5", text="#0B0B0B", ink="#A82334", track="#E3B3B8")
D = dict(bg="#111111", card="#171717", bord="#2C2C2C", text="#FAFAFA", ink="#F3A3AA", track="#462F32")
```

Every value in those two dicts is a token published by `src/lib/palette.ts`, and so is every
other hex in the module. **The ported module must contain none of them.** Do not carry a
count across: derive it if you need one (`grep -oE '#[0-9A-Fa-f]{6}' … | sort -u | wc -l`).

`~/.config/bin/bft_card_lib/render_body.py:24-32` — the renderer to port, with an ellipsis
between the signature and the loop body. Note the skipped slugs and the two opacities:

```python
def render(front_on, back_on, *, gender="male", w=724, h=1448,
           fill_on="#A82334", fill_off="#E3B3B8", outline="#0B0B0B",
           op_on=1.0, op_off=0.28, side="dual"):
        parts=[f'<path d="{out}" fill="none" stroke="{outline}" stroke-width="2" opacity="0.55"/>']
        for entry in BODY[gender][view]:
            slug=entry["slug"]
            if slug in ("hair","head","hands","feet","ankles","knees"): continue
```

`~/.config/bin/bft_card_lib/card_layout.py:54-59` — the rule that is easiest to get wrong,
carried verbatim into the ported module's comment:

```python
# 🔴 THE BRAND CHIP GOES TOP-RIGHT, AND THAT IS NOT A TASTE DECISION.
# Strava overlays its OWN chip on the TOP-LEFT of every activity photo — the sport type
# ("Workout"), or the connected app's name. … Observed 2026-09-02 in the iOS app
# covering "calvin.sg" completely. Top-left belongs to Strava; do not move the mark back.
```

`~/.config/bin/bft_card_lib/test_dry.py` — the disjointness gate, and **its documented limit
must be carried across verbatim, not silently dropped**:

```python
PUBLISHER = "BFT"
def card_text(s):
    """The card's own words, EXCLUDING the quote.
    🔴 A documented limit of this test, not a loophole. The quote is the one card element
    that is QUOTED rather than derived — BFT's published marketing prose. … Measured across
    all 90, that is 11 of the 13 remaining collisions."""
def leaks_for(s, mutate=False):
    allowed = words(s["code"]) | words(PUBLISHER)
    return sorted((words(card_text(s)) & words(desc)) - allowed)
```

### The card's design rules, from the plan that will be archived

Each is a constant with its reason, not an incidental number
(`~/.claude/plans/bft-programme-ingest/010-PROGRESS-strava-workout-images.md`, "Design facts
settled 2026-09-02"):

- **1080×1080, square, not 4:5.** Every integration card the platform shows — Rouvy, Runna,
  Hevy, Peloton, Whoop — is square-ish, and Strava's photo carousel crops a portrait.
- **Type must be huge.** The card renders about 350pt wide in the feed; anything under ~22px
  at 1080 is decoration, not information.
- **The hero is the class's stated intention**, quoted and attributed. The session code drops
  to a footer caption — it means nothing outside the studio, and it is the join key that
  makes an activity auditable back to a training week.
- **The date and the format name appear on neither surface.** The platform prints the date
  above the photo and the activity title already carries the format.
- **`preserveAspectRatio` renders a square viewBox at the smaller dimension.** A non-square
  box letterboxes the figures silently; this shrank every map in the first two design rounds.
- **The accepted cost, recorded rather than glossed**: the quote lives inside an image and
  Strava has no alt text, so it is the one element a screen reader cannot reach. Everything
  factual stays in text. **Do not "fix" this by moving facts into the image.**

### Conventions this plan must match

- **A derived-value module**: `src/lib/palette.ts`. Reads a source as text at build,
  publishes what it finds, types nothing twice.
- **A test in this suite**: `tests/design-system.test.ts` — its `describe`/`it` shape, its
  `tests/helpers/css` and `tests/helpers/pages` imports, and its practice of writing the
  reason for an assertion above it.
- **A script in this repo**: `scripts/fetch-strava-weeks.mjs` — argument parsing, error
  posture, and the fact that `scripts/README.md` documents every flag.

### Design constraints quoted from the repository's own docs

The executor has not read these. They are binding.

From `src/content/design.ts`'s header:

> if you find yourself typing a hex, a rem, a pixel count or a class name that the page could
> read out of the build instead, it does not belong here.

From `src/pages/design.astro`:

> THE SITE, DESCRIBING ITSELF WITH ITSELF. Every specimen on this page is the real thing

**That sentence is what decision 5 makes an exception to**, which is why the caption is not
optional: the page states a rule about itself, and this specimen is the one thing on it that
does not satisfy that rule.

**And the rule is asserted in TWO places, not one.** The second is
`src/content/design.ts:81`, where `DESIGN_PAGE.lede` opens *"Everything below is the real
thing."* — the sentence a reader meets at the top of the page, above every specimen. Step 6
must qualify that lede as well as caption the specimen; captioning alone leaves the page's
own opening sentence asserting a rule the page no longer keeps.

**Scoped precisely, because the obvious next worry does not apply**: that lede is
`/design`-only and does NOT reach `DESIGN.md` or `/design.md`. The full rendering writes its
own Overview — `src/lib/design-doc.ts:97` says why ("that lede is about the page you are
looking at") — and `grep -c 'real thing' DESIGN.md` returns `0`. So there is one string to
qualify, not two, and the markdown twin needs no change on this account.

From `CLAUDE.md`, on the two gates that constrain the specimen's box:

> `tests/page-fit.test.ts` and `tests/card-fill.test.ts` forbid an absolute length in the
> first three, and card-fill catches an absolute *height* inside any card

From `src/layouts/BasicLayout.astro`, on the sink the specimen uses:

> `set:html` DOES NOT ESCAPE, AND THIS IS THE ONE SINK ON THE SITE THAT REACHES A READER
> WITHOUT PASSING THROUGH ASTRO'S ESCAPING.

## The architecture, and the two things it refuses

**The card is authored once as a function returning an HTML string.** `src/lib/share-card.ts`
exports `cardHtml(session, {theme})`. That is the whole implementation, and it has exactly
two consumers: `/design` embeds the string as its specimen, and `scripts/render-share-card.ts`
writes it to a file, opens it in headless Chrome and captures a 2160px PNG — the same driver
`public/preview.jpg` is made with.

**That script runs through the toolchain, NOT through plain `node`, and this is a measured
constraint rather than a preference.** Every module in the `share-card` → `icons` → `palette`
chain uses extensionless relative specifiers (`src/lib/design-doc.ts:3` is
`from "./palette"`), and `src/lib/projection.ts:1` imports JSON bare — neither of which
Node's ESM resolver handles. **No existing `scripts/*.mjs` imports from `src/` at all**; the
three that mention `src/` paths do so only in comments. So run it as
`npx vite-node scripts/render-share-card.ts`, and run it **from the repository root**:
`src/lib/palette.ts` reads `src/layouts/BasicLayout.astro` by a cwd-relative path.

**It refuses a second markup.** An Astro component for the page plus a template for the
renderer is two homes for one drawing, which is the defect this repository is organised
against.

**It refuses Satori.** Satori cannot use a system font stack, so it would force a bundled
webfont into a site whose Typography section opens by saying there is no webfont — and the
card would then be set in a different face from the one it is designed in.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0, no output |
| Full gate | `pnpm test` | exit 0 (runs `pnpm build` first) |
| One test, fast | `SKIP_BUILD=1 npx vitest run tests/<file>` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Serve the build | `pnpm preview --port 4322` | listening — **no `--` separator** |
| Render a card | `npx vite-node scripts/render-share-card.ts --demo <slug> --out .scratchpad` | a PNG and a `.txt` |
| Regenerate snapshots | `pnpm test:update` | rewrites `DESIGN.md`, `conventions.md`, `design_tokens.json` |
| Fetch the upstream | `opensrc path HichamELBSI/react-native-body-highlighter` | prints a path |

## Suggested executor toolkit

- **`EnterWorktree`** for all file changes — this repository's standing instruction.
- **`/git-commit-helper`** and **`/pr-helper`**.
- The upstream data is on disk at
  `~/.opensrc/repos/github.com/HichamELBSI/react-native-body-highlighter/main`. **That path
  is a cache** — `opensrc path …` repopulates it, and step 1 vendors precisely so the build
  never depends on it.
- The POC is at `~/.config/bin/bft_card_lib/`. **Read it; do not edit it.**
- The DESIGN.md spec's "Components" section is at
  `~/.opensrc/repos/github.com/google-labs-code/design.md/main/docs/spec.md`.

## Scope

**In scope** (the only files you may modify or create):

- `src/lib/share-card.ts`, `src/lib/body-map.ts`, `src/lib/anatome/**` (create)
- `src/data/bft/formats.ts`, `src/data/bft/aliases.ts`, `src/data/bft/specimen.ts` (create)
- `scripts/render-share-card.ts` (create), `scripts/README.md`, `package.json` (one script)
- `DESIGN.md`, `design_tokens.json`, `.design-sync/conventions.md`, `.design-sync/NOTES.md` —
  **the snapshots these renderings own.** Adding a `SECTIONS` key regenerates all of them;
  they are in scope because plan 048's "and any snapshot they own" clause does not reach here.
  Regenerate with `pnpm test:update`, never by hand.
- `tests/share-card-redaction.test.ts` (create)
- `src/content/design.ts`, `src/lib/design-doc.ts`, `src/lib/component-tokens.ts`,
  `src/pages/design.astro`
- `tests/share-card.test.ts`, `tests/body-map.test.ts` (create),
  `tests/design-system.test.ts`, `tests/component-tokens.test.ts`
- `CLAUDE.md`, `README.md`

**Out of scope** (do NOT touch, even though they look related):

- **`~/.config/bin/**`** — declared disposable by the maintainer. Porting changes back is
  explicitly not wanted, and editing it would create the second answer this plan removes.
- **Anatome's exercise photography and exercise catalogue** — see "The licence finding".
- **The female figure.** Upstream ships one; this plan vendors and draws the male figure
  only, because that is what the card uses. Adding a second is a separate decision.
- **Any real training session.** Decision 5 is an invented specimen; no session from the
  training wiki enters this repository.
- **Delivery.** Nothing here writes to Strava, Telegram, or any network. The maintainer
  attaches both surfaces by hand.
- **`src/components/ProgressBar.astro`** — orphaned, and owed a deletion by plan 047.
- **`.devin/wiki.json`** — durability-gated; no counts, no filenames, no constant names.
- **`plans/README.md`** — the reviewer's.

## Git workflow

- Branch: `EnterWorktree` on `feat/049-share-card` off `main`, after 048 has merged.
- One commit per step. Conventional commits, matching `git log --oneline`:
  `feat(dns): today.calvin.sg, answered by a Worker and nothing else (#251)`.
- Open a PR. The Cloudflare Pages deploy preview is the evidence for the specimen.

## Steps

### Step 1: Vendor the anatomy from the MIT upstream

Create `src/lib/anatome/` containing:

- `body-paths.json` — the front and back muscle paths, converted from the upstream's
  `assets/bodyFront.ts` and `assets/bodyBack.ts`. Convert rather than copy the `.ts`: those
  files `import { BodyPart } from ".."`, which does not resolve here.
- `body-wrappers.json` — the two viewBoxes and the silhouette outline path, extracted from
  `components/SvgMaleWrapper.tsx`.
- `LICENSE` — the upstream's MIT licence, **verbatim**, with its copyright line
  (`Copyright (c) 2022 ELABBASSI Hicham`). This is the mandatory attribution.
- `README.md` — what was vendored, from where, at what date, and **why it is a copy rather
  than a cache read**: the POC's renderer read `~/.opensrc`, measured at 7.9 GB, and
  `mac-upkeep` runs weekly against user caches, so a cleared cache would have broken the
  renderer silently. That reason applies here identically.
- `refresh.mjs` — re-vendors from the cache, so the conversion is reproducible rather than a
  one-time hand edit.

Add to `README.md`'s licensing section: the MIT attribution to
`HichamELBSI/react-native-body-highlighter` (required), and a courtesy credit to
`Rippy1911/anatome` for the shading approach (decision 4 — a credit line, **not** their
NOTICE file).

**Verify**:

```sh
node -e "const p=require('./src/lib/anatome/body-paths.json');
const f=new Set(p.male.front.map(e=>e.slug)), b=new Set(p.male.back.map(e=>e.slug));
const need_f='abs adductors biceps calves chest deltoids forearm neck obliques quadriceps tibialis trapezius triceps'.split(' ');
const need_b='adductors calves deltoids forearm gluteal hamstring lower-back neck trapezius triceps upper-back'.split(' ');
const miss=[...need_f.filter(s=>!f.has(s)),...need_b.filter(s=>!b.has(s))];
console.log(miss.length?'MISSING '+miss:'all slugs present')"
grep -c 'ELABBASSI Hicham' src/lib/anatome/LICENSE      # → 1
grep -ci 'apache' src/lib/anatome/ -r                   # → 0
```

→ `all slugs present`, then `1`, then `0`.

### Step 2: Port the body renderer

Create `src/lib/body-map.ts`: given the lit front and back slugs and a pair of colours, emit
the dual-figure SVG. Colours are arguments; **this module chooses none.** Carry across the
skipped slugs (`hair head hands feet ankles knees`), the `0.55` outline opacity and the
`0.28` unlit opacity, each with the reason beside it.

**Verify**: `SKIP_BUILD=1 npx vitest run tests/body-map.test.ts` → all pass, including the
square-viewBox assertion.

### Step 3: Bring the session model across

Create three modules under `src/data/bft/`, each with its own head:

- **`formats.ts`** — the 14 published program types and the publisher's own one-line
  description of each, with the read date and source URL. This is **quoted third-party
  prose**: it is attributed on the card and may not be paraphrased.
- **`aliases.ts`** — the movement-label table, ported from the POC's `bft_aliases.py` and
  `vocab.json`. **An unmapped label must fall back to format-level shading and say so on the
  card; it may never guess a muscle.** That refusal is the table's whole point — building it
  proved the hand-shaded mockups were wrong in both directions, inventing trapezius and
  missing biceps and triceps.
- **`specimen.ts`** — the single invented session (decision 5). It exercises every slot: a
  quote, an attribution, a mapped movement list, a session code, a progression counter and a
  provenance line. **It is invented, and its module head says so in its first sentence.**

`src/lib/share-card.ts` also exports the session type, and the type must make a session
either shaded from its own published movements **or** shaded from its format — the two cases
the provenance line distinguishes in words. Encode that in the type so a session cannot be
constructed that draws one line while meaning the other.

**Verify**: `pnpm check` → exit 0. Then a negative check — constructing a session with
movements *and* a format-only provenance line must fail to compile; confirm by writing it,
seeing the error, and deleting it.

### Step 4: Draw the card

Create `src/lib/share-card.ts` → `cardHtml(session, {theme})`. Every colour from `PALETTE`,
every ray and bar from `src/lib/brand-mark.ts`. **The module may not contain a hex.**

Express each frame rule from "Current state" as a named constant with its reason: the 1080
square, the chip's top-right position (carry the comment verbatim), the ~22px-at-1080 type
floor, the legend-before-marks order, the hero and the footer caption.

**Verify**:

```sh
pnpm check
grep -nE '#[0-9A-Fa-f]{3,8}' src/lib/share-card.ts      # → no matches
SKIP_BUILD=1 npx vitest run tests/share-card.test.ts
```

### Step 5: Draw the description, and gate the split

Add `shareDescription(session)`: the stations, the intensity and recovery, the muscles named
in words, the block and week, and the provenance and read-date.

Port `test_dry.py` into `tests/share-card.test.ts`, running over the specimen against **both
real renderers** — not a fixture, which is what let the original pass while the shipping
renderer drifted. **Carry its documented limit verbatim**: the quote is excluded from the
word-overlap proxy, with the reason in place. The allowed intersection is the session code
and the publisher's name, and nothing else.

**Verify**: `SKIP_BUILD=1 npx vitest run tests/share-card.test.ts` → passes. Then append a
card-owned fact to the description, re-run, and confirm it **fails**; restore it. An
assertion that cannot fail is decoration.

### Step 5b: Port the refusal, not just the disjointness proxy

**The POC ships TWO gates and step 5 only ports one.** `redact.py` is the other, and it is
the guard that makes publishing safe rather than merely tidy. Its own head says why:

> This is a REFUSAL, not a scrubber. It raises rather than silently removing, because a card
> or a description that quietly lost a clause is worse than one that never shipped: nobody
> reviews what was removed. … Both surfaces bind FREE PROSE out of the wiki's tables —
> `session_note`, `progression`, `intensity` — so anything a future editor types into one of
> those cells reaches a public post.

Those are the same three fields step 4's session type binds. **The `/design` specimen is
invented and cannot leak** (decision 5), so this is not about the site — it is about step 7,
which renders REAL sessions from a file. Shipping the renderer without the refusal moves the
production path into this repository and leaves its only safety gate behind.

Port `redact.py`'s refusal and `test_leak.py`'s mutation harness alongside the disjointness
test. **The protected-names list stays outside this repository**, read by path, exactly as it
is today — it is git-ignored so it can never be committed anywhere. **If that file is absent
the renderer must say so and refuse, never report a clean scan.**

**Verify**:

```sh
SKIP_BUILD=1 npx vitest run tests/share-card-redaction.test.ts
```

→ passes. Then, one at a time: feed a session containing a protected pattern and confirm it
**raises**; move the protected-names file aside and confirm the renderer **refuses** rather
than reporting clean. Restore both.

### Step 6: Put the specimen on `/design`

Add a `card` key to `SECTIONS` in `src/content/design.ts` — heading **`Share Cards`**, the
term a reader arriving from another design system searches for. Its guidance is the frame
rules as do's and don'ts, plus the disjointness rule stated generally: *when one dataset
feeds two surfaces, no fact may appear on both; they share a join key and a citation.* That
sentence belongs to this section; Voice & Tone and Data Visualization may point at it but may
not restate it.

Draw the specimen at true 1080px inside a container scaled to the container's width, so **no
absolute length enters the card's own box** and the specimen still is the artifact rather
than a picture of one. Add the caption required by decision 5, naming it as an invented
specimen and acknowledging that every other specimen on the page is real.

The specimen is embedded with `set:html` — the site's **second** such sink and the first
outside `BasicLayout.astro`. Everything interpolated comes from typed modules in this
repository, but `cardHtml` must escape every text field anyway and a test must prove it,
because the next person to add a session will be thinking about muscles rather than markup.

Add the card's entries to `src/lib/component-tokens.ts`, derived from the frame constants.

**Verify**:

```sh
pnpm build
grep -n '^## Share Cards' DESIGN.md                     # → one hit
diff DESIGN.md dist/design.md                           # → no output
SKIP_BUILD=1 npx vitest run tests/card-fill.test.ts tests/page-fit.test.ts \
  tests/design-system.test.ts tests/component-tokens.test.ts
```

### Step 6b: Declare the new section to the agent audience, and re-measure

`tests/design-system.test.ts` fails any `SECTIONS` key that appears in neither
`AGENT_SECTIONS` nor `AGENT_DROPS` with a reason of its own — so adding `card` without
deciding its audience is red, in a gate this plan would otherwise never mention.

Declare `card` in `AGENT_DROPS` with its reason: that audience builds screens from a
stylesheet and does not make off-site raster artifacts, so the card's rules spend a budget it
gets no use from. Then **re-measure** `renderDesignDoc("agent").length` against
`AGENT_BUDGET` and record the trade in `.design-sync/NOTES.md`, in the shape its existing
entries use. Headroom was roughly 200 characters at the last recorded measurement; re-derive
rather than trusting that.

**Verify**:

```sh
pnpm test:update
SKIP_BUILD=1 npx vitest run tests/design-system.test.ts
```

→ the suite passes. `pnpm test:update` is what rewrites the `conventions.md` file snapshot; a
plain `vitest run` never does.

### Step 7: Ship the renderer

Create `scripts/render-share-card.ts`:

```
npx vite-node scripts/render-share-card.ts --session <file.json> --out <dir> [--px 2160]
npx vite-node scripts/render-share-card.ts --demo <slug> --out <dir>
```

Run from the repository root — `src/lib/palette.ts` resolves its source by a cwd-relative
path. **It must refuse rather than render** when step 5b's protected-names file is missing.

It writes `cardHtml` to a temp file in the scratchpad, drives `chrome-headless-shell` over it,
captures at the declared pixel size, and writes the PNG plus the description `.txt` beside it.
**`--px` is declared, never inherited**: a browser snapshots at the display's backing scale,
so the same command otherwise yields 2160 on a Retina Mac and 1080 headless. It makes **no
network call and writes to no platform.**

Add `"card:render"` to `package.json` and a section to `scripts/README.md` — a current-state
document gated for accuracy, so every path and flag it names must exist.

**Verify**:

```sh
npx vite-node scripts/render-share-card.ts --demo specimen --out .scratchpad
node -e "const s=require('sharp');s('.scratchpad/<file>.png').metadata().then(m=>console.log(m.width,m.height))"
SKIP_BUILD=1 npx vitest run tests/docs-drift.test.ts
```

→ `2160 2160`, and the docs gate passes.

### Step 8: Documentation

`CLAUDE.md` gains the card: one implementation with two consumers, the chip's top-right rule
with its reason, the type floor, the disjointness contract, and the specimen's invented
status. `README.md` carries the attribution from step 1. `.devin/wiki.json` gets **nothing**.

**Verify**: `pnpm check && pnpm eslint && pnpm test` → all exit 0.

## Test plan

New tests, modelled structurally on `tests/design-system.test.ts`.

**`tests/body-map.test.ts`** (new): every needed slug resolves; the dual viewBox is square;
skipped slugs are absent from the output; passing sentinel colours yields an SVG containing
only those sentinels.

**`tests/share-card.test.ts`** (new): the module contains no colour outside `PALETTE`; every
type step clears the ~22px-at-1080 floor; the card is square and the chip is top-right; an
unmapped movement falls back to format shading **and prints the fallback wording**; every text
field is escaped; card and description share only the session code and the publisher's name.

**Extended**: `tests/design-system.test.ts` (the Share Cards section and its position),
`tests/component-tokens.test.ts` (the card's entries, both directions).

**Every assertion must be mutation-proven** — break it, watch the named test redden, restore
it:

| Mutation | Test that must redden |
|---|---|
| type a hex into `share-card.ts` | palette check |
| drop one type step below the floor | type floor |
| move the chip to the left | chip position |
| make the map's viewBox non-square | `body-map` |
| append a card-owned fact to the description | disjointness |
| make the alias resolver guess an unmapped label | fallback |
| put `<script>` in the specimen's name | escaping |
| change a frame constant | `component-tokens` |
| pin the specimen's height in px | `card-fill` |
| delete `src/lib/anatome/LICENSE` | attribution gate |
| delete the specimen's caption | `design-system` |
| put a protected pattern in a session | redaction refusal |
| remove `card` from `AGENT_DROPS` | `design-system` audience gate |

**Verification**: `pnpm test` → exit 0, with both new files passing and no obsolete snapshot.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0; `tests/share-card.test.ts` and `tests/body-map.test.ts` exist and
      pass
- [ ] `grep -nE '#[0-9A-Fa-f]{3,8}' src/lib/share-card.ts src/lib/body-map.ts` returns no
      matches
- [ ] `grep -ci apache -r src/lib/anatome/` returns `0`
- [ ] `grep -c 'ELABBASSI Hicham' src/lib/anatome/LICENSE` returns `1`, and `README.md` names
      both the MIT upstream and the courtesy credit to Anatome
- [ ] `grep -n '^## Share Cards' DESIGN.md` returns exactly one hit
- [ ] `diff DESIGN.md dist/design.md` and `diff design_tokens.json dist/design_tokens.json`
      both produce no output
- [ ] `npx vite-node scripts/render-share-card.ts --demo specimen --out .scratchpad` writes a
      **2160×2160** PNG and a `.txt`
- [ ] The rendered specimen is **visually indistinguishable** from
      `~/.config/.scratchpad/bft-cards/bft-2026-09-02-HIIT-410.png` in everything but its
      content, the now-live mark bar, and font rasterisation — compared with `sharp` by
      **changed box**, never RMSE. Anything else is a regression against the POC and must be
      explained in the PR.
- [ ] `<main>` on the home page is **unchanged** — this plan does not touch it, and the
      measurement is the proof
- [ ] No files outside the in-scope list are modified (`git status --porcelain`)
- [ ] The `/design` specimen carries the invented-session caption
- [ ] A session containing a protected pattern **raises rather than renders**, and the
      renderer **refuses** when the protected-names file is absent (step 5b)
- [ ] `card` is declared in `AGENT_DROPS`, and `renderDesignDoc("agent").length` is under
      `AGENT_BUDGET` with the trade recorded in `.design-sync/NOTES.md`

## STOP conditions

Stop and report back — do not improvise — if:

- **The "Current state" excerpts do not match the live code**, or the drift check's four
  preconditions from plan 048 are not all satisfied.
- **A step's verification fails twice** after a reasonable fix attempt.
- **A fix appears to require touching an out-of-scope file** — in particular anything under
  `~/.config/bin`.
- **A slug the card needs is missing from the upstream data.** Step 1's check is exactly this;
  do not substitute Anatome's copy to make it pass, because that silently reverses decision 4.
- **The specimen cannot be drawn without an absolute height in a card.** Report it; do not add
  a carve-out to `tests/card-fill.test.ts`.
- **The ported disjointness test passes on the specimen but does not redden under the
  mutation in step 5.** The assertion is decoration; fix the test before trusting the claim.
- **The rendered card differs from the POC's PNG outside content, the mark bar and font
  rasterisation.** Something in the port is wrong. Report the changed box.
- **`vite-node` cannot run the renderer** because of something in the `share-card` → `icons`
  → `palette` chain. Do not fall back to duplicating the card markup into a standalone
  script — that is the second home this plan's architecture exists to refuse. Report it.
- **The protected-names file cannot be located.** Do not render anything, do not stub the
  check, and do not report a clean scan. Report it.
- **The upstream's licence terms turn out to differ** from the MIT text recorded here. Stop —
  do not vendor anyway, and do not fall back to Anatome without asking.

## Maintenance notes

For whoever owns this after it lands:

- **The specimen is frozen and invented.** New sessions are rendered from a file and never
  committed. A second specimen would need the same caption and the same scrutiny.
- **`formats.ts` quotes a third party's live web page** and carries a read date for the same
  reason the training wiki's rulebook does. Re-reading it is a maintainer task, not a build
  step; a stale programme page is worse than none.
- **`src/lib/anatome/` is vendored, not depended on.** `refresh.mjs` re-derives it; the build
  never reads `~/.opensrc`.
- **What a reviewer should scrutinise**: that no hex was typed into either new module; that
  the disjointness test's documented limit came across verbatim rather than being quietly
  widened; that the specimen's caption is present and truthful; that the vendored LICENSE is
  the upstream's MIT and no Apache text came with it.
- **Deferred out of this plan, deliberately**: delivery to any platform; the female figure;
  ingesting real sessions; and teaching `calvin-sg-token-drift` about `/design_tokens.json`,
  which is a terminal-config change and outside the maintainer's stated blast radius.

## plans/README.md updates (reviewer applies at acceptance — not the executor)

- Add row 049 to the execution table: P3 / L / depends on 048 / status.
- Note under "Dependency notes" that 049 requires 048 because the card's chip is drawn from
  `src/lib/brand-mark.ts` and its tokens extend the `components` group 048 publishes.
