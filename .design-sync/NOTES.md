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

## The reference cards, and what they cannot do

`.design-sync/emit-cards.mjs` writes four reference cards — palette, type and space,
controls, icons — and must run AFTER the converter, which clears its own output directory
and would destroy anything written there first. Every value on them is derived: colours from
the extracted token file, roles parsed from the theme-variables block in
`src/layouts/BasicLayout.astro`, and the ramp, radii and icon names read back out of the
compiled stylesheet. Nothing on a card is typed by hand, so nothing on one can rot
independently of the site. The script exits non-zero if a token turns up with no documented
role, which is the same fail-loud posture as the CSS prep.

**They are not listed in the design tool's own card index, and this was measured rather than
assumed.** The cards live outside the components directory because the validator counts every
`.html` under that directory and holds the count against the component count, which is zero
here and correctly so. The app rebuilds its manifest from the components directory alone: the
explicit registration call reports success, the manifest still comes back with an empty card
list, and re-registering after the manifest settled changed nothing. So the cards are files in
the project that open by direct link rather than entries a person finds by browsing. The
palette itself does NOT depend on them — the app parses all thirty token declarations out of
the stylesheet on its own, with scopes and kinds, and picks up the two control classes as
themeable selectors.

Two consequences worth knowing before the next sync: the verification anchor does not cover
the preview directory, so a card change is invisible to the diff and must be uploaded
deliberately; and if a future version of the tool starts indexing cards from outside the
components directory, these are already in the right shape.

## What the repository now gates on its own

`tests/design-system.test.ts` runs in `pnpm test` and holds `.design-sync/conventions.md`
against the built stylesheet — the token table both ways, the classes it promises are present,
the one it warns is absent, and the invariant that both themes define the same set. It exists
because everything in this directory is a snapshot and nothing here re-runs when the site
changes. Each of its assertions was killed by its own mutation before it was kept; one of them
was green against its mutation on the first attempt, because it matched token names anywhere
in the document rather than in the table, and the surrounding prose named the deleted token.

Also: this run replaced a hand-kept skip list in `tests/docs-drift.test.ts` with a question put
to git. **Do not add a skip entry for a sync directory** — an ignored tree is already out of
scope, and the reason the list was the wrong mechanism is argued in place there.

## Re-sync risks

- **The stylesheet is a closed set of about 150 selectors, generated from what the SITE
  uses.** Stop using a class here and it silently leaves the design system. The conventions
  file names six classes as guaranteed present and calls one absent; nothing gates any of
  that, so re-run the validation pass over the fresh build every sync rather than trusting
  the list.
- **The token table in `.design-sync/conventions.md` is hand-listed**, fifteen entries with
  their roles, taken from the block in `src/layouts/BasicLayout.astro` that documents them.
  Add or rename a token there and the table rots with nothing reddening. The same is true of
  the stated icon counts.
- **The conventions file is human-editable and is not to be rewritten** by a later run.
  Validate its names against the new build, report what no longer verifies, and propose
  edits.
- The render check covers zero previews, which is correct here but means a green validate
  says nothing about how anything looks. The only visual evidence is the site itself.
- A playwright version bump needs its matching browser downloaded before validate will run.
- The CSS prep reads the emitted stylesheet directory, which is the idiom `tests/helpers/css.ts`
  exists to warn against: Astro can inline a small sheet into the page instead, and the whole
  token block has moved that way here once before. The prep wants the sheet every page shares
  rather than one page's cascade, so it cannot use that helper's approach — it fails loudly and
  names the likely cause instead. If it ever does, read that helper's header first.
- The cards restate no value but they do restate STRUCTURE: the icon card assumes two families,
  and the palette card assumes every token belongs to a theme block. A third icon set or a token
  defined outside those blocks needs the generator looked at, not just re-run.
- The vendored React is uploaded and unused — there are no preview cards to mount it.
