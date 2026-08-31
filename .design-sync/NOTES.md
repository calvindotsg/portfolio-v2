# design-sync notes

What a future sync of this repository needs to know before it starts. Read this first.

## This is a tokens-only design system, on purpose

The site's UI is Astro components. They compile to a server render and have no runtime
form, so nothing can be mounted in a design tool, and the project rule that there is no
client-side UI framework makes that permanent rather than a gap to close. The converter's
`[ZERO_MATCH] no component exports — treating as tokens-only DS` line is therefore the
expected outcome, not a failure to debug. What ships is the palette, the reset and the
control classes; the component namespace is empty by construction.

## Running it

- The entry is mandatory and is `.design-sync/ds-entry.mjs`, which exports nothing. Without
  an explicit entry the converter looks for the package inside a node_modules directory,
  where a repository never installs itself: it then reports version 0.0.0, finds no source,
  and the run is quietly wrong rather than loudly broken. The file's own header says this
  too.
- Point the converter's node-modules flag at the staged tool's own install, not this
  repository's. React, its types and playwright live there because the converter needs them
  and **this project must never acquire a React dependency**.
- **Install five packages there, not the three the skill's own command line names.** That
  line installs the bundler, the type reader and the React type definitions; the converter
  also vendors React and React DOM into the upload it publishes, and drives a headless
  browser to check renders, and the line says neither. Leaving them out gets all the way
  through configuration and then dies inside the emit stage complaining that React is not
  under the node-modules flag — which reads like a wrongly pointed flag, or a broken
  repository, rather than a short install. Add React, React DOM and playwright to the same
  isolated install. Measured on 31 August 2026: that was the whole of the first run's
  failure, and the second run was clean.
- **Install those with the workspace-ignoring flag, or the project's lockfile is polluted.**
  This was measured, not feared: a plain pnpm install inside the staged directory added it
  to the root lockfile as an importer — 102 lines pinning React, playwright and the rest into
  a tree that must never see them. CI installs from a frozen lockfile and the staged
  directory is gitignored, so it would have arrived there as a failure with no local
  symptom. The repository is not a workspace and has no member packages; pnpm inferred one
  from the nested manifest anyway. The isolated install writes its own lockfile beside
  itself, which is gitignored. The skill this came from says to use npm here, which sidesteps
  the whole thing; the flag is how it stays pnpm, per this repository's package-manager rule.
  Check that the root lockfile is untouched before committing anything.
- Ignored build scripts on esbuild are harmless here — the platform binary arrives through
  its optional dependency, and both the build and the render check were re-run clean
  afterwards to confirm it.
- The build command is recorded in `.design-sync/config.json`: the site build, then
  `.design-sync/prepare-css.mjs`.

## Why prepare-css.mjs exists

Astro content-hashes every stylesheet it emits and splits the output, so no config key can
name a file directly without rotting on the next build. The script therefore picks the
global sheet **by content** — it is the one defining the theme tokens — and copies it to a
stable path. It also prepends the token blocks in readable form, because the sync only
carries what the root stylesheet reaches by import and a separate tokens file here is
reachable by nothing: the token-glob config key globs inside a *published* tokens package,
which this repository does not have. That key was set once, silently did nothing, and was
removed.

The script exits non-zero if the CSS splitting ever changes shape. That is deliberate — a
silent fallback would ship the wrong sheet.

**It picks that sheet by EXTRACTING the tokens rather than by looking for a string, and it
learned to on 31 August 2026 by crying wolf.** The old test was whether a sheet's text
contained the opening characters of the theme selector. The design page then grew a
specimen drawing the two themes beside each other, and that page's scoped chunk uses the
very same selector as an ANCESTOR of the specimen's own class — declaring no token
whatsoever — so two sheets matched where the script permits one, and a correct build
failed. It now asks each sheet for its custom-property blocks and takes the one that
yields any, which is the same pass that emits them, so the identifier and the extractor
cannot come apart. **The looser test was not merely unlucky, it was answering a different
question**: whether the selector appears, rather than whether the tokens are declared.
Measured on that build — the old test found two sheets and the new one finds one, while
both real failures still fail: strip the declarations out of every sheet and it exits
naming none, plant a second sheet that genuinely declares tokens and it exits naming two.

## The suite had to learn about the sync

`tests/docs-drift.test.ts` walks the filesystem rather than git, so the staged converter's
own documentation was read as this repository's prose: four failures, measured, from one
document describing a Storybook workflow this site does not have. Both sync directories are
now in that file's skip list, beside the other gitignored, agent-provisioned trees. CI never
saw it, because a fresh checkout provisions neither.

## The maintenance model: one authored source, three renderings

There is nothing in this directory to keep in step by hand any more, and that is the whole of
what changed.

`src/content/design.ts` is the single authored description of this design system. It holds
MEANING and no values — every token's name and role, the guidance under each heading, and each
kind of control — and it holds no counts either, because a count in a sentence is a sentence
waiting to go stale. (This paragraph said "the three controls" until a fourth kind arrived,
one line above the clause explaining why it should not have.) Three surfaces render it:

- `/design`, a real page on the site. Its swatches are `background: var(--token)`, its type
  ramp wears the real utility classes, and its controls are working links, so nothing on it
  restates a value and nothing on it can be out of date.
- `DESIGN.md` at the repository root, and `/design.md` on the web — the SAME BYTES, rendered
  once by `renderDesignDoc("full")` in `src/lib/design-doc.ts`. One is committed and pinned by
  a file snapshot, the other is served by a route, and a build gate compares the two artifacts
  rather than trusting that they came from one call.
- `.design-sync/conventions.md`, this directory's copy, `renderDesignDoc("agent")` and held to
  it by a vitest file snapshot in `tests/design-system.test.ts`. `pnpm test:update` regenerates
  it; drift fails `pnpm test`. **Do not hand-edit it** — an edit here is overwritten by the
  next regeneration, and the fix for a sentence you disagree with is to change the module.

The renderings are deliberately not the same text. The page is for a person reading
calvin.sg; this file is inlined into a system prompt, is read by an agent that cannot open
this repository, and therefore carries two passages the page does not: the empty component
namespace and the closed stylesheet. Those live beside the renderer rather than in the module,
because each is a fact about the EXPORTED BUNDLE and false of the site — a utility engine
really is running here. **Add an audience to that function rather than a second renderer**: two
functions producing design prose would disagree in silence, since a snapshot only ever compares
a document with itself.

### The budget, re-decided rather than inherited

This file used to say it was over its budget on purpose, at about 7 kB against the skill's
two-to-four thousand characters, on the judgement that a design agent's output depends more on
the guidance than on the context it costs. **That judgement is not available any more, and the
reason is arithmetic rather than a change of mind.** Measured before anything was cut: the
module's own strings — both theme lines, every token role, every control role, and both
guidance lists — come to 4,128 characters. They overrun a 4,096 budget before a single word of
the document's own. "Carry everything" was never on the table.

The old note said to trim the guidance in the module rather than in the renderer. **Do not.**
That was written when there was one rendering, and trimming the module now would take the
guidance off `/design` and out of `DESIGN.md` to buy room in a third document. Trim the AGENT
audience in `src/lib/design-doc.ts` instead — the full rendering carries the module whole, so
nothing leaves the repository.

What that audience drops today, and why:

- **The dos, keeping the don'ts.** A don't names an output that looks right and is wrong, which
  is the one thing a table of tokens cannot imply; a do largely restates the table and the class
  list beside it.
- **The section ledes and the mark inventory.** The ledes are written for a person reading a
  page. The mark classes are in the stylesheet that agent was handed, which the closed-set
  section sends it to, and an inventory a reader can enumerate for itself is the most expensive
  kind of sentence to inline. Only the SIZE of the set survives.

**What that cost, named rather than glossed.** Every dropped do but one is carried by a don't
saying the same thing from the other side, or by the token table. The exception is the
instruction to give an icon-only control an accessible name, which no don't twins, and which
the agent rendering therefore no longer carries. If a future run gets more room — a raised
budget, a shorter module — re-add that one first.

#### The second trim: publishing the chip

The paragraph above ended by predicting that "a couple of new token roles will redden it". Two
new CONTROL roles did, and the arithmetic was settled before a word of them was written: the
rendering came to 4,137 characters over its budget's 4,096 — 441 over — the moment `chip` and
`chip-icon` joined the one list this audience carries whole.

Two things were dropped for it, measured at 242 and 251 characters, and the document landed at
3,933 — slightly MORE headroom than the 155 it had before. That is deliberate: a budget spent
down to nothing reddens on whatever anybody adds next, so a trim that only just fits is a trim
that has to be done again immediately.

- **The whole `## Type` section.** Its three don'ts were the set whose claims survive closest
  by: "no decorative or display face" and "no intermediate step" both restate the closed
  stylesheet declared two sections above, and "don't pin a height in pixels" is twinned almost
  verbatim by the controls don't that remains. The section went entirely rather than being left
  as a heading with nothing under it.
- **The `## Marks` guardrails**, keeping the size line so the section still says something.
  "Don't mix another icon family in" is the closed set again, and "don't recolour a brand mark
  away from what its surface needs" is the positive form of the `--sport-*-on-ink` roles the
  token table still carries in full.

**The one genuine loss is the emoji instruction** — "don't substitute an emoji for a mark that
is not in the set" — which nothing else in the document twins. It is now SECOND in the re-add
queue, behind the accessible-name instruction named above.

A standalone sentence in the renderer warning that `control-surface` is absent went at the same
time, and that one is a strict improvement rather than a cost: the module's own controls don't
now names BOTH surfaces and says the same thing, so the claim survives wider than it was.
`tests/design-system.test.ts` was retargeted to read that don't and hold every surface it names
against the shipped sheet — do not put a hand-written line back in front of it.

The gate is `AGENT_BUDGET` in `tests/design-system.test.ts` and it is asserted rather than
written down in prose, because the failure is silent: a longer preamble still renders, still
matches its own committed copy, and simply spends more of a context window belonging to
somebody else. It sits at the TOP of the skill's stated range, so it is a ceiling and not a
target, and there is not much slack left under it — a couple of new token roles will redden it,
which is the gate doing its job rather than a defect.

#### The third decision: the values are published, and this document does not carry them

`/design`, `DESIGN.md` and `/design.md` now print each token's LIGHT and DARK value, read out of
the theme blocks by `src/lib/palette.ts`. **This document keeps the roles-only table, and that is
measured rather than an omission.** Re-measured on the merged tree before the change: the agent
rendering was 3,859 characters against the 4,096 budget, so 237 spare, and two value columns over
the current token list cost about 384. They do not fit.

**They also should not.** This audience is handed the exported stylesheet, and the closed-set
section already tells it that sheet "restates both themes' tokens above its rules" — so the values
are in an artifact the reader is holding. Spending a system prompt on a table that reader can read
out of its own bundle is the most expensive duplication available. `tests/palette.test.ts` asserts
the decision in BOTH directions: every value reaches the full rendering, and none reaches this one.

Rewriting the palette's first don't — it said "there is no token here whose value is worth
restating", which had become false about its own page — moved the figure to **3,935 characters,
161 spare**. That is a real narrowing and the next thing added to the module will feel it.

#### The fourth decision: three whole subjects the budget refused

The prediction above came true immediately. The design system published three new sections —
**States**, **Words** and **Access** — and **this document carries none of them**. That is a
refusal recorded with its arithmetic, not an omission: each is declared in `AGENT_DROPS` with
what its reader is losing, and `tests/design-system.test.ts` reddens on a section that is in
neither list.

Measured in the exact shape a carried section is drawn in — a heading, the don'ts label, its
don'ts and the blank line after them, which is all this audience ever gets — against the 161
spare that existed when they were written:

| Section | Its don'ts alone | Document would stand at | Over budget by |
|---|---|---|---|
| States | 636 | 4,571 | 475 |
| Words | 565 | 4,500 | 404 |
| Access | 436 | 4,371 | 275 |

**The cheapest of the three overruns the spare by more than the spare itself**, so there was no
trade to weigh: carrying any one of them means dropping something already here. Every carried
block was then read against the standard the drops above were held to — does the claim survive
elsewhere in THIS document — and none of them passes it. The token table and the control list are
what this audience is promised complete. The theming block is the precondition that decides
whether anything is styled at all. The closed-set section, the palette don'ts and the controls
don'ts each carry a claim nothing else here says twice, and the whole `## Marks` section is far
too small to pay for anything even if it did. The only true duplication in the document is the
four control class names, which appear in the guaranteed-present line and again as the headings
of the control list — measured at 49 characters, against a bill of 275.

**The re-add queue is therefore rewritten rather than appended to.** A whole subject the document
never mentions outranks a single instruction missing from a section it does carry, so:

1. **The States don'ts.** For an agent building screens out of an exported bundle these are the
   most valuable lines this system has — a hover style a touch device gets stuck in, and a press
   that finishes after the finger has gone, are precisely what a table of tokens cannot warn
   anybody about.
2. **The Access don'ts**, cheapest of the three and the one to try first if a little room appears.
   A forced-colours mode and a drifted reading order are failures that agent cannot see anywhere
   in its own output, where a stuck hover state at least shows up the first time somebody taps.
3. The accessible-name instruction, and then the emoji instruction — the two that used to head
   this queue.

**Words is not in the queue at any budget**, and that is on merit rather than arithmetic: that
agent is handed a bundle and writes screens, not this site's copy, and every line in that section
is about this site's own domain words.

### What was retired, and why it was not repaired

A generator script in this directory wrote four reference HTML cards — palette, type and
space, controls, icons — into a gitignored preview directory. It is deleted, and it is not
named here, because a document that keeps saying a path is a document `docs-drift` fails the
moment the path stops existing. Every value on them was
derived rather than typed, which was the right instinct, and they still had to go: they were a
third description of the same system, they were never listed in the design tool's own card
index (measured — the validator builds its manifest from the components directory alone, and
explicit registration reported success while the manifest came back empty), and the tool's
verification anchor did not cover the preview directory, so a card change was invisible to the
diff. A committed generated artifact nobody browses and no gate watches is exactly what
`public/preview.jpg` is, and that one has gone stale silently twice.

The palette itself never depended on them: the app parses the token declarations out of the
stylesheet on its own, with scopes and kinds, and picks up the control classes as themeable
selectors.

## What the repository now gates on its own

`tests/design-system.test.ts` runs in `pnpm test`. It holds the module against the built
stylesheet — every token named in both directions, every mark in the census matched to an
`i-` rule in both directions, every type step the sheet ships shown on `/design`, the classes
the document promises present, the one it warns is absent absent, and the invariant that both
themes define the same set — and it holds the committed `conventions.md` against a fresh
rendering of the module. It exists because everything in this directory is a snapshot and
nothing here re-runs when the site changes.

Each of its original assertions was killed by its own mutation before it was kept; one was
green against its mutation on the first attempt, because it matched token names anywhere in
the document rather than in the table, and the surrounding prose named the deleted token.

The mark census gate caught a real gap the first time it ran. `ICON_IDS` in `src/lib/icons.ts`
never had to be exhaustive while its only reader was the safelist — the theme toggle writes
its sun and moon out as literal class names, so UnoCSS extracts those two by itself. The
moment a page started rendering that list as "the marks a designer may reach for", it was
sixteen of eighteen, and this document told an agent that sixteen was all there was.

Also: this run replaced a hand-kept skip list in `tests/docs-drift.test.ts` with a question put
to git. **Do not add a skip entry for a sync directory** — an ignored tree is already out of
scope, and the reason the list was the wrong mechanism is argued in place there.

## Re-sync risks

- **The project held four retired preview cards for four days, and no diff would ever
  have found them.** The generator that wrote them was deleted here on 27 August 2026, and
  that deletion never reached the project: the verification anchor records components, this
  is a system with none, so the preview directory sits outside everything the diff models
  and it reported nothing to delete. They were removed by hand on 31 August 2026, after
  reading the project's own file listing. **Read that listing every sync.** For a system
  with no components it is the only thing that can see a file the build has stopped
  producing, and an orphan nobody deletes at the moment it appears is an orphan for good.
  Leave the two files the design tool writes for itself alone — the converter does not emit
  them and the tool regenerates them on open.
- Validate printed **no warn lines at all** on the 31 August 2026 run, so there is no
  known-warn list to check a future run against, because nothing is on it. Treat any warn
  line that appears as new.
- **The stylesheet is a closed set of about 150 selectors, generated from what the SITE
  uses.** Stop using a class here and it silently leaves the design system. The suite catches
  the part of that which is nameable — the classes the conventions file promises are present,
  the one it calls absent, the tokens, the marks and the type steps are each held against the
  build in both directions — and catches nothing about a class the document never mentions.
  Re-run the validation pass over the fresh build every sync all the same.
- **The conventions file is GENERATED and must not be hand-edited.** It used to be written by
  hand, and this bullet used to warn that its token table and its icon counts would rot with
  nothing reddening. Both are now rendered from `src/content/design.ts` and pinned by a file
  snapshot, so an edit here is overwritten by the next `pnpm test:update` and a stale figure
  cannot be committed. Propose edits to the module; the document follows.
- The render check covers zero previews, which is correct here but means a green validate
  says nothing about how anything looks. The only visual evidence is the site itself — and
  `/design` is now the page to look at, since it draws every token, step, control and mark on
  one screen in whichever theme is selected.
- A playwright version bump needs its matching browser downloaded before validate will run.
- The CSS prep reads the emitted stylesheet directory, which is the idiom `tests/helpers/css.ts`
  exists to warn against: Astro can inline a small sheet into the page instead, and the whole
  token block has moved that way here once before. The prep wants the sheet every page shares
  rather than one page's cascade, so it cannot use that helper's approach — it fails loudly and
  names the likely cause instead. If it ever does, read that helper's header first.
- The renderings restate no value, but they do restate STRUCTURE, and that outlived the cards
  that first had the problem. `conventions.md` groups the marks into two families by class
  prefix, and `/design` draws an `-on-ink` token on a plate of `--text` by reading the suffix
  of its name. A third icon family, or a token whose name stops carrying that suffix, needs
  those two readers looked at rather than merely re-run.
- The vendored React is uploaded and unused — there is nothing here to mount it in.

## What the host answers for /design.md — measured, and nothing is owed

**`content-type: text/markdown; charset=utf-8`, with no `content-disposition`**, so the twin
displays rather than downloading. Measured 2026-08-26 against the preview deploy of PR #209, on
the immutable hash URL `d00ecf20.calvindotsg.pages.dev` taken from the deploy job's own log
rather than the `pr-N` alias, which moves. The same request confirmed the served bytes share
`DESIGN.md`'s SHA-256 — so this is one measurement of two things: the header, and that the host
publishes the artifact the suite gated.

**Why it needed measuring at all, and why the local answer did not count.** The static build
discards a route's response headers — `src/pages/llms.txt.ts` carries that measurement — so the
value a reader receives is decided by Cloudflare Pages from the `.md` extension, and nothing in
this repository can assert it. `pnpm preview` also answers `text/markdown`, and that is Astro's
preview server reading a MIME table on somebody's machine: the repository's own standing
distinction is that a local preview is not the bytes the host serves, and this is that gap one
header along. The two agreeing is a coincidence worth having and was not evidence in advance.

**So `public/_headers` is untouched, on purpose.** A rule setting a header the host already sends
correctly is a rule nobody can tell is doing anything, and this file has **no most-specific-match
rule** — every rule whose path matches applies in the order written, the first to set a name
replaces the host's value and a LATER one APPENDS to it, so a header name may appear in exactly
one rule. `tests/build-output.test.ts` holds that invariant.

**Re-measure rather than trusting this.** The value is the host's, derived from an extension, and
nothing in this tree gates it: a Pages change to that MIME table would move it with no commit
here. If it ever answers `application/octet-stream`, the twin downloads instead of displaying and
the surface is worse than not shipping it — the remedy is the `_headers` rule above, placed
deliberately and re-measured after the deploy.

    curl -sI https://<hash>.calvindotsg.pages.dev/design.md | grep -i content-type
