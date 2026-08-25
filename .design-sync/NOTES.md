# design-sync notes

What a future sync of this repository needs to know before it starts. Read this first.

## This is a tokens-only design system, on purpose

The site's UI is Astro components. They compile to a server render and have no runtime
form, so nothing can be mounted in a design tool, and the project rule that there is no
client-side UI framework makes that permanent rather than a gap to close. The converter's
`[ZERO_MATCH] no component exports — treating as tokens-only DS` line is therefore the
expected outcome, not a failure to debug. What ships is the palette, the reset and the
three controls; the component namespace is empty by construction.

## Running it

- The entry is mandatory and is `.design-sync/ds-entry.mjs`, which exports nothing. Without
  an explicit entry the converter looks for the package inside a node_modules directory,
  where a repository never installs itself: it then reports version 0.0.0, finds no source,
  and the run is quietly wrong rather than loudly broken. The file's own header says this
  too.
- Point the converter's node-modules flag at the staged tool's own install, not this
  repository's. React, its types and playwright live there because the converter needs them
  and **this project must never acquire a React dependency**.
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

## The suite had to learn about the sync

`tests/docs-drift.test.ts` walks the filesystem rather than git, so the staged converter's
own documentation was read as this repository's prose: four failures, measured, from one
document describing a Storybook workflow this site does not have. Both sync directories are
now in that file's skip list, beside the other gitignored, agent-provisioned trees. CI never
saw it, because a fresh checkout provisions neither.

## The maintenance model: one authored source, two renderings

There is nothing in this directory to keep in step by hand any more, and that is the whole of
what changed.

`src/content/design.ts` is the single authored description of this design system. It holds
MEANING and no values — every token's name and role, the guidance under each heading, and the
three controls — and it holds no counts either, because a count in a sentence is a sentence
waiting to go stale. Two surfaces render it:

- `/design`, a real page on the site. Its swatches are `background: var(--token)`, its type
  ramp wears the real utility classes, and its controls are working links, so nothing on it
  restates a value and nothing on it can be out of date.
- `.design-sync/conventions.md`, this directory's copy, generated from the same module and
  held to it by a vitest file snapshot in `tests/design-system.test.ts`. `pnpm test:update`
  regenerates it; drift fails `pnpm test`. **Do not hand-edit it** — an edit here is
  overwritten by the next regeneration, and the fix for a sentence you disagree with is to
  change the module.

The two renderings are deliberately not the same text. The page is for a person reading
calvin.sg; this file is inlined into a system prompt, is read by an agent that cannot open
this repository, and therefore carries three passages the page does not: the empty component
namespace, the closed stylesheet, and where the truth lives. Those live beside the renderer
rather than in the module, because each is a fact about the EXPORTED BUNDLE and false of the
site — a utility engine really is running here.

**It is bigger than it was, on purpose, and that is the one trade in this change worth
re-deciding rather than inheriting.** The design-sync skill suggests a two-to-four thousand
character preamble; the hand-written file was already past that at about 5 kB and this one is
about 7 kB. The difference is roughly two dozen do/don't lines that used to exist only on the
four generated reference cards, which this change deletes. The judgement was that a design
agent's output depends far more on that guidance than on the context it costs. Trim the
guidance in the module, not the renderer, if a future run disagrees.

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
