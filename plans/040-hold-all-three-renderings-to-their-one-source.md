# Plan 040: Hold all three renderings to their one source

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md` — **except in this repository, where you must NOT.** That file's status
> table is the reviewer's alone; it says so in its own words, and it is gated in full, so an edit
> from you can redden a branch you cannot then make green. Report your status in the pull request
> body instead and leave the index untouched.
>
> **Drift check (run first)**:
> `git diff --stat 71bc7e1..HEAD -- src tests CLAUDE.md DESIGN.md .design-sync`
> If any file named in "Scope" changed, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.
>
> **Do not push, open a pull request, or merge unless the operator has instructed it.** Finish
> every step up to that point.

## Status

- **Priority**: P1 — every plan after this one adds to `src/content/design.ts`, and until this
  lands an addition can reach one surface and not the others with a green suite.
- **Effort**: M
- **Risk**: LOW — this plan adds assertions and makes one renderer iterate a list it currently
  hand-writes. No drawing changes, no values move, no stylesheet is touched.
- **Depends on**: **039**, for sequencing rather than semantics. 039 is in flight and removes one
  entry from `CONTROLS` in `src/content/design.ts` and one specimen from `src/pages/design.astro`.
  This plan reads both but changes neither, and gate 5 stays green under that removal because 039
  deletes the entry and its specimen together. Land 039 first for a clean apply.
  **Do not execute these two in parallel**: both modify `tests/design-system.test.ts` and both
  regenerate `DESIGN.md` and `.design-sync/conventions.md`, so whichever lands second must re-run
  `pnpm test:update` and re-read the diff.
- **Category**: tests
- **Planned at**: commit `71bc7e1`, 2026-08-26
- **Baseline measured at `71bc7e1`**: `pnpm test` → 22 files passed, 1 skipped; 661 passed,
  7 skipped; exit 0. **Re-measure this yourself before step 1 and compare deltas, not totals.**

## Why this matters

The design system is described in one module and rendered onto four surfaces:

```
src/content/design.ts   ← the one authored description
    ├── src/pages/design.astro        → /design            (HTML)
    └── src/lib/design-doc.ts
            ├── renderDesignDoc("full")   → DESIGN.md  ==  /design.md   (byte-identical)
            └── renderDesignDoc("agent")  → .design-sync/conventions.md
```

**That architecture is stated everywhere and enforced almost nowhere.** The snapshots in
`tests/design-system.test.ts` compare each generated document with its own committed copy, which is
a check that the file was regenerated — not a check that the renderer rendered anything. The header
of that suite says so about a different failure and the same reasoning applies here: *a snapshot
only ever compares a document with itself.*

**Both directions of drift were measured at `71bc7e1`, by mutation, and both are silent.**

**Mutation A — a section reaches the page and no document.** A fifth entry was added to `SECTIONS`
in `src/content/design.ts` (heading, lede, one do, one don't) and the key added to the type union.
Result:

| Surface | Contains the new section |
|---|---|
| `dist/design/index.html` | **yes** |
| `DESIGN.md` | no |
| `dist/design.md` | no |
| `.design-sync/conventions.md` | no |

`pnpm test` → **exit 0, 22 files passed, 661 tests passed, 7 skipped** — identical to the
unmutated baseline. Nothing reddened, and `pnpm test:update` would have had nothing to rewrite,
because `renderFull()` never rendered it.

**Mutation B — a section leaves the page and stays in the documents.** `src/pages/design.astro`'s
section loop was given `.filter((k) => k !== "icons")`, so the built page ships with no Marks
section at all. Result: `grep -c '>Marks<' dist/design/index.html` → **0**, `DESIGN.md` unchanged
and still carrying it. `pnpm test` → **exit 0, 661 passed, 7 skipped**. Again identical.

The cause is two-sided and each side is a separate defect:

1. **`renderFull()` hand-lists its sections** (`SECTIONS.palette`, `SECTIONS.type`,
   `SECTIONS.controls`, `SECTIONS.icons`) while `src/pages/design.astro` iterates
   `Object.keys(SECTIONS)`. The `SECTIONS` type is a closed union, so widening it does not make the
   compiler ask the renderer about the new key — it just goes unrendered.
2. **The only assertion SPECIFIC to the built page is a type-step census** —
   `tests/design-system.test.ts:387`. Other gates do reach this page, but every one of them is a
   build-wide universal walked over all pages — link signifiers, hover, presses, the page header —
   and none of them can see which sections the page carries. Nothing checks that it carries a
   section heading, a token role, a control's role or a line of guidance.

This is the failure the whole `src/content/design.ts` architecture was built to prevent, and it is
the one the next three plans walk straight into: 041 adds values, 042 redraws the page, 043 adds
two whole sections. Land this first and each of those is caught by construction.

## Current state

### The renderer that hand-lists

`src/lib/design-doc.ts`, inside `renderFull()`:

```ts
        `## ${SECTIONS.palette.heading}`,
        "",
        SECTIONS.palette.lede,
        "",
        tokenTable(),
        "",
        guidance(SECTIONS.palette),
        "",
        `## ${SECTIONS.type.heading}`,
        "",
        SECTIONS.type.lede,
        "",
        guidance(SECTIONS.type),
        ...
```

`renderAgent()` hand-lists too, and **that one is correct as it stands**: the agent audience
deliberately carries a *subset* — it drops the ledes, the dos, the type section and the marks
guardrails, and each drop has a measured reason in that file's header. The two renderers are not
the same problem and must not get the same fix. See step 3.

### The section type

`src/content/design.ts:199`:

```ts
export const SECTIONS: Readonly<Record<"palette" | "type" | "controls" | "icons", {
    heading: string
    lede: string
    does: readonly string[]
    donts: readonly string[]
}>> = {
```

### The page's section loop

`src/pages/design.astro`:

```astro
        {(Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]).map((key) => (
                <Card title={SECTIONS[key].heading}>
                    <p class="text-sm max-w-[60ch] mt-0 mb-4">{SECTIONS[key].lede}</p>
```

Generic over the list already — this half is right.

### What is already gated, and must not be duplicated

`tests/design-system.test.ts` already holds:

- both generated documents against their committed copies (`toMatchFileSnapshot`)
- the agent rendering inside its 4,096-character budget
- the agent rendering naming no `src/` path, and the full rendering naming at least one
- every token in `TOKEN_ROLES` appearing in **both** renderings (line 284) — this is the shape to
  copy, and the reason it exists is written above it
- every section having a non-empty heading, lede, `does` and `donts` (line 302) — a *content* gate,
  not a *rendering* gate
- the theme list, the mark census, the type ramp against the built stylesheet

`tests/build-output.test.ts:572-577` already holds `dist/design.md` byte-identical to `DESIGN.md`.
**That pairing is complete and needs nothing from this plan.**

### The helper you will need

`tests/helpers/pages.ts` exports `classTokens`; `tests/helpers/css.ts` exports `pageCss`. For
reading the page's *text* rather than its classes, `tests/design-system.test.ts` already reads
`DESIGN_PAGE_FILE = "dist/design/index.html"` with `readFileSync`. Follow whichever the file
already does; do not add a new HTML parser.

### Repo conventions this plan must honour

- **A suite says what it is for, above its own first `describe(`.** Gated by
  `tests/docs-drift.test.ts`. If you add a file, it needs that paragraph.
- **A gate needs a vacuity floor.** Every census assertion in this suite opens by asserting the
  input is non-empty, with a message saying the gate would assert nothing otherwise. Match it.
- **Assert what a thing MUST HAVE, and discover on what it IS.** A discovery predicate that
  excludes the defect makes its assertion unfalsifiable — the repository has shipped that mistake
  before and it is recorded in `plans/done/README.md`.
- **A deliberate exemption is named and justified in place**, never silently skipped. The agent
  audience's drops are the model: `src/lib/design-doc.ts`'s header names each one and why.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Full gate | `pnpm test` | exit 0; it builds first |
| Iterate | `SKIP_BUILD=1 pnpm test <filter>` | reuses `dist/` |
| Build only | `pnpm build` | exit 0 |
| Regenerate the generated docs | `pnpm test:update` | rewrites `DESIGN.md` and `.design-sync/conventions.md` |

## Scope

**In scope** (the only files you may modify):

- `tests/design-system.test.ts` (modify — new gates)
- `src/lib/design-doc.ts` (modify — `renderFull()` iterates; the audience contract is written down)
- `DESIGN.md` (regenerate — never hand-edit)
- `.design-sync/conventions.md` (regenerate — never hand-edit)
- `CLAUDE.md` (modify — one bullet, step 5)

**Out of scope** (do NOT touch, even though they look related):

- `src/content/design.ts`. This plan adds no content and changes no wording. If a new gate goes red
  against the module as it stands, the gate is wrong or the exemption list is incomplete — fix the
  gate, and say so.
- `src/pages/design.astro`. Its section loop is already generic. Plan 042 redraws the page; this
  plan only starts asserting things about what it emits.
- `renderAgent()`'s section list. Its subset is deliberate and measured; step 3 makes the subset
  *declared* rather than implicit, which is not the same as making it complete.
- `tests/build-output.test.ts`. The `dist/design.md` == `DESIGN.md` pairing is already there.
- The snapshot mechanism, the budget assertion, and every existing `it(` block. Add; do not rewrite.

## Git workflow

- Branch: `advisor/040-hold-all-three-renderings`
- Conventional commits, matching `git log` — e.g.
  `test(design): fail when a section reaches one surface and not the others`
- Do NOT push or open a pull request unless the operator instructed it.

## Steps

### Step 1: Reproduce both mutations before changing anything

You are about to write gates for two defects. Confirm they are still live on your tree, so that a
green result in step 4 means something.

**Mutation A.** In `src/content/design.ts`, widen the `SECTIONS` type union with `| "probe"` and add
a fifth entry with a heading, a lede, one `does` and one `donts`. Run `pnpm test`.

Expected on an unfixed tree: **exit 0**, and
`grep -c 'Probe' dist/design/index.html DESIGN.md dist/design.md .design-sync/conventions.md`
returns a non-zero count for the first and zero for the other three.

**Mutation B.** Revert A. In `src/pages/design.astro`, add `.filter((k) => k !== "icons")` to the
section loop. Run `pnpm test`.

Expected on an unfixed tree: **exit 0**, and `grep -c '>Marks<' dist/design/index.html` returns 0.

**Revert both by hand or with `git checkout <path>` naming the exact files.** Do not run a bare
`git checkout --` or `git restore .` — it will eat any other uncommitted work in the tree.

Record both observed results in the pull request body. If either mutation already reddens the
suite, **STOP** — the tree has moved and this plan's premise needs re-deriving.

**Verify**: `git status` clean of these two files after reverting.

### Step 2: Make the full rendering iterate

In `src/lib/design-doc.ts`, `renderFull()` renders every entry of `SECTIONS` by iterating it,
in the object's own key order, instead of naming four keys.

The complication is that three of the four sections carry an extra block between the lede and the
guidance —
`palette` gets `tokenTable()`, `icons` gets `markInventory()`, and `controls` gets `controlList()`.
Keep those as a lookup keyed by section name, so an unknown section renders heading, lede and
guidance and nothing else — which is the right default, and is exactly what
`src/pages/design.astro` already does with its per-key conditionals — it branches on all four keys,
not only `palette`.

The theming block and the Overview stay where they are: neither is a member of `SECTIONS`.

Write the reason above the change. The register is that file's own: state that the sections are
iterated so a section cannot be added to the module and reach the page alone, and that the
per-section extra blocks are a lookup rather than a chain of conditionals so that adding one is
adding an entry.

**Verify**: `pnpm test:update` → `git diff DESIGN.md` is **empty**. That is the point: iterating
the four existing sections in their existing order must produce byte-identical output. If the diff
is non-empty, the iteration changed the document and you have introduced a second defect — read the
diff and fix the order or the extra-block placement rather than accepting the new snapshot.

### Step 3: Declare the agent audience's subset instead of leaving it implicit

`renderAgent()` deliberately carries fewer sections than `renderFull()`. After step 2 that
difference is the only remaining place a section can go missing without anyone noticing, and today
it is expressed as "which lines somebody happened to write".

Make it a **declared list** in `src/lib/design-doc.ts`: the section keys the agent rendering
carries, and — beside it, in the same structure or in a comment keyed to each — the reason that
audience drops each of the others. The reasons already exist in that file's header; move or
reference them, do not re-author them.

This is not cosmetic. Step 4 asserts over that list, so a section dropped from the agent audience
without a recorded reason becomes red.

**Verify**: `pnpm test:update` → `git diff .design-sync/conventions.md` is **empty**.

### Step 4: The gates

Add to `tests/design-system.test.ts`. Each needs a comment above it saying what failure it exists
to catch, in the register of the block at line 284 — which is the closest existing model and is
doing the same job for tokens that these do for sections.

**Gate 1 — every section reaches the full rendering.** For every entry of `SECTIONS`, its `heading`
appears in `renderDesignDoc("full")`, and so does its `lede`, and so does every string in `does`
and in `donts`. Open with a vacuity floor on `Object.keys(SECTIONS).length`.

This is the gate that catches Mutation A. Assert the *strings*, not a count: a count gate passes
when one heading is swapped for another.

**Gate 2 — every section reaches the page.** For every entry of `SECTIONS`, its `heading` and its
`lede` appear in the built `dist/design/index.html`, and so does every `does` and `donts` line.

**NORMALISE THE PAGE ONCE, AND USE IT FOR EVERY ASSERTION IN THIS PLAN THAT READS
`dist/design/index.html` — gates 2 and 5 both.** Two traps, and both are handled by normalising the
haystack, never by loosening the needle to a substring:

- The page is HTML, so an apostrophe ships as `&#39;`. That is not hypothetical and it is not
  confined to guidance lines: four entries in `TOKEN_ROLES` carry an apostrophe in their `role`
  (`a card's plate…`, `that plate's edge`, `the Now card's live indicator dot`, `that dot's
  decorative pulsing halo`), so gate 5 fails on **correct content** without this. Decode the
  entities in the page text before comparing, or compare against an encoded copy of the needle —
  pick one and say which in a comment.
- Astro may split a text node. Strip tags from the page body before matching, so a needle broken
  across an element boundary still matches.

Write this as one shared helper both gates call, so a third page-reading gate added later inherits
it rather than rediscovering the apostrophe.

Before trusting this gate, **prove it can fail**: re-run Mutation B and confirm gate 2 goes red
naming `icons`. Record the message in the pull request body.

**Gate 3 — the agent rendering carries what it declares, and only that.** For every key in the
declared list from step 3, that section's heading appears in `renderDesignDoc("agent")`. For every
key *not* in the list, its heading does **not** appear — a two-way assertion, so the list cannot
quietly stop matching the document.

**Gate 4 — every section key is accounted for by exactly one of the two.** Every key of `SECTIONS`
is either in the agent list or in its recorded-drops list. A key in neither is a section nobody
decided about, which is the state this whole plan exists to make impossible.

**Gate 5 — every control and every token role reaches the page.** For every entry of `CONTROLS`,
its `name` appears in `dist/design/index.html`; for every entry of `TOKEN_ROLES`, its `token` and
its `role` appear. Vacuity floors on both lists.

**Verify**: `SKIP_BUILD=1 pnpm test design-system` → all pass. Then each mutation in turn reddens
the gate named above and nothing else unrelated.

### Step 5: Say what is now guaranteed

`CLAUDE.md`'s Content Management section says each content module's own head says what it holds.
Add to the design system's neighbourhood — two sentences, no more — that `src/content/design.ts` is
the one authored description of this system, and that `tests/design-system.test.ts` now holds every
rendering of it to that module in both directions, with the agent audience's subset declared rather
than implicit. **State the property, not the cardinality**: do not write how many surfaces there
are, which is what the next paragraph forbids and what this repository has a standing rule about.

Do not enumerate the surfaces as a count and do not list the gates. `tests/docs-drift.test.ts`
resolves backticked paths against the tree, so every path you name must exist.

**Verify**: `SKIP_BUILD=1 pnpm test docs-drift` → all pass.

### Step 6: Full gate

**Verify**: `pnpm test` → exit 0; `pnpm check` → exit 0; `pnpm eslint` → exit 0.
`git diff --name-only` lists only In-scope files. `git diff DESIGN.md .design-sync/conventions.md`
is **empty** — this plan changes no published prose.

## Test plan

New tests, all in `tests/design-system.test.ts`:

- every section's heading, lede, does and donts reach `renderDesignDoc("full")`
- every section's heading, lede, does and donts reach `dist/design/index.html`
- the agent rendering carries exactly the sections it declares, both directions
- every section key is either declared or recorded as dropped
- every `CONTROLS` name, and every `TOKEN_ROLES` token and role, reaches the page

Each opens with a vacuity floor and carries a failure message that names the consequence, not the
comparison. Model on `tests/design-system.test.ts:284`.

**Mutation evidence is part of the deliverable.** The pull request body must carry, for each of
Mutations A and B: the command run, the suite result before the gates, and the exact failure
message after. A gate whose mutation was never run is a gate nobody has shown can fail.

**Verification**: `pnpm test` → exit 0, with the new tests present and passing.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `git diff --exit-code DESIGN.md` → exit 0 (no published prose changed)
- [ ] `git diff --exit-code .design-sync/conventions.md` → exit 0
- [ ] `grep -n 'SECTIONS\.\(palette\|type\|controls\|icons\)' src/lib/design-doc.ts` → **every
      hit's line number falls outside `renderFull()`'s span.** Use `grep -n` and check the
      positions, not `grep -c`: a count cannot establish *where* the matches are, which is the whole
      property. Gate 1 and the byte-identical `DESIGN.md` diff are what actually own this; the grep
      is how you see it at a glance
- [ ] Mutation A reddens the suite, and the failing tests are **gate 4** and the `DESIGN.md` file
      snapshot — *not* gates 1 or 2. After step 2 a fifth key renders into the document by
      construction and the page already iterates, so neither of those can see it; what catches it
      is that the key is in no declared list. Record gate 4's message in the pull request body
- [ ] **Gate 1 has its own mutation, because Mutation A no longer reaches it**: re-hand-list one
      section out of the iteration in `renderFull()` (or make the extra-block lookup swallow a key)
      and confirm gate 1 goes red naming that section. Record the message. A gate whose mutation was
      never run is a gate nobody has shown can fail — which is this plan's own standard
- [ ] Mutation B reddens the suite, and the failing test is gate 2
- [ ] `git diff --name-only` lists only files from the In-scope section
- [ ] `plans/README.md` is **unmodified**

## STOP conditions

Stop and report back (do not improvise) if:

- Either mutation in step 1 already reddens the suite on your tree. The premise has moved and the
  plan needs re-deriving rather than executing.
- Step 2's `git diff DESIGN.md` is non-empty after `pnpm test:update`. Iterating four sections in
  their existing order must be byte-neutral; a diff means the refactor changed the document, and
  accepting the new snapshot would hide that.
- Gate 2 cannot be made to pass against the page as it stands for a reason other than entity
  encoding or a split text node — for example, a guidance line the page genuinely does not render.
  That is a real defect in the page and it belongs to whoever owns it, not to a weakened assertion.
- You find yourself adding a carve-out so a gate passes. An exemption is allowed only where an
  audience *declares* the drop and records the reason, which is step 3's structure — not a list of
  strings a gate skips.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **Adding a section to `src/content/design.ts` is now a two-decision change**: the content, and
  whether the agent audience carries it. Gate 4 makes forgetting the second one red. The agent's
  budget is the constraint on that answer — see `AGENT_BUDGET` in `tests/design-system.test.ts`.
- **What a reviewer should scrutinise**: that both mutations were actually run and both messages
  reported; that gate 2 normalises the page rather than loosening the needle; and that
  `git diff DESIGN.md` really was empty, because a non-empty one means step 2 changed the document
  while claiming to be a refactor.
- **Deliberately deferred**: gating the *order* sections appear in (the page and the document could
  still disagree about sequence, which matters less than presence and would pin a decision nobody
  has made); and gating `/design`'s heading levels against the document's, which is a structural
  claim the redraw in plan 042 will move anyway.
