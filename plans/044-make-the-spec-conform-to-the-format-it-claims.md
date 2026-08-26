# Plan 044: Make the spec conform to the format it claims

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
> **This plan does not stand alone.** It reorganises a document whose sections 043 adds to and whose
> front matter 041 fills in. If `DESIGN.md` has no `colors:` key in its front matter, **STOP** — 041
> has not landed. If `SECTIONS` in `src/content/design.ts` has fewer than seven entries, **STOP** —
> 043 has not landed and the canonical mapping this plan writes would be incomplete.
>
> **Do not push, open a pull request, or merge unless the operator has instructed it.** Finish
> every step up to that point.

## Status

- **Priority**: P3 — the document is *tolerated* by the format today. This plan makes it legible to
  the format's own tooling rather than merely accepted by it.
- **Effort**: M
- **Risk**: LOW — one renderer, one generated file, no page changes, no values.
- **Depends on**: **041** (front-matter tokens) and **043** (the full section set). Both hard.
- **Category**: docs
- **Planned at**: commit `71bc7e1`, 2026-08-26. **Reconciled at `b1eea8a`** after 039 merged.
- **Requested by the maintainer on 2026-08-26**: *"design.md and /design.md route page should use
  `google-labs-code/design.md` repo standards."* 041 does the front matter half; this is the body.
- **Baseline**: re-measure `pnpm test` on your own branch point.

## Why this matters

`DESIGN.md` and `/design.md` are the same bytes, and they claim a format:
`github.com/google-labs-code/design.md`. **The claim is currently true only in the weak sense that
nothing rejects the file.** Measured on 2026-08-26 with the official linter, `@google/design.md`
v0.4.0:

```
npx --yes @google/design.md@latest lint DESIGN.md
→ { "errors": 0, "warnings": 0, "infos": 5 }
```

Clean. But the linter checks the front matter, and the **body** diverges from the spec in three ways
that cost a consumer real information. From `docs/spec.md` in that repository:

1. **The canonical section names are not the ones used.** The spec's normative list is *Overview,
   Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts*. This document
   emits `## Colour` and `## Type`. Both are *unknown* headings to the format — the spec's own
   "Consumer Behavior for Unknown Content" table says an unknown section heading is
   "Preserve; do not error" — so a consumer looking for `## Colors` does not find it and treats the
   colour guidance as arbitrary prose.
2. **There is no `## Do's and Don'ts` section.** The spec makes it a canonical section and describes
   it as the guardrails. This document scatters a Do and a Don't list under every other heading
   instead, so a consumer that reads only the canonical guardrail section reads none of them.
3. **Section order is not asserted anywhere.** The spec says sections that are present "should appear
   in the sequence listed", and nothing in this repository holds that.

**Only one thing in that format is a hard error**: a duplicate section heading. Everything above is
tolerated, which is exactly why it has drifted — there was never a signal.

**The tension this plan has to resolve, and it is a real one.** `/design` and `DESIGN.md` render from
one module, and the page's heading is Calvin's word: *Colour*, in British English, in the site's own
voice. The spec's heading is a **protocol name**. Renaming the authored heading to satisfy a format
would put an American spelling on the page to please a linter — the configuration-homes rule in
`CLAUDE.md` names this shape exactly: *a route decides wire format, content holds values*. So the
resolution is a mapping in the renderer, not a rename in the module.

## Current state

### What the full rendering emits today

`src/lib/design-doc.ts`, `renderFull()` — after 040 it iterates `SECTIONS`, so the headings come
straight from `section.heading`:

```
# How this site is drawn
## Overview
## Set data-theme, or nothing is styled
## Colour
## Type
## Controls
## Marks
```

Verify this against the live file before starting; 043 adds three more.

### The section keys, which are the stable identifiers

`src/content/design.ts` — `SECTIONS` is keyed `palette`, `type`, `controls`, `icons`, plus whatever
043 added. **The key is the identity and the heading is prose**; 042 already relies on that
distinction for its anchor ids, and this plan relies on it for the canonical mapping.

### The spec, and how to read it without guessing

```
npx --yes @google/design.md@latest spec
```

prints the format specification. The section list, the unknown-content table and the Colors example
with inline hex are all in it. **Read it from the tool rather than from this plan** — it moves, and
every claim above is stamped at v0.4.0.

### Repo conventions this plan must honour

- **A route decides wire format; content holds values.** The canonical heading is the wire format's
  name for a section. It belongs in the renderer.
- **No enumeration in two places.** The mapping is one table, keyed by section key. Do not also write
  the canonical order out as prose in `CLAUDE.md`.
- `pnpm test:update` regenerates; drift fails `pnpm test`.
- **A duplicate `##` heading is the format's one hard error.** Whatever the mapping does, it must not
  be able to emit two sections with the same heading.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Full gate | `pnpm test` | exit 0 |
| Iterate | `SKIP_BUILD=1 pnpm test <filter>` | reuses `dist/` |
| Regenerate | `pnpm test:update` | rewrites `DESIGN.md` and `.design-sync/conventions.md` |
| Conformance | `npx --yes @google/design.md@latest lint DESIGN.md` | `errors: 0, warnings: 0` |
| The spec itself | `npx --yes @google/design.md@latest spec` | prints the format |
| What it exports | `npx --yes @google/design.md@latest export DESIGN.md --format css-vars` | one property per token |

## Scope

**In scope** (the only files you may modify):

- `src/lib/design-doc.ts` (modify — the canonical mapping, the order, the guardrail section)
- `tests/design-system.test.ts` (modify — new gates)
- `DESIGN.md`, `.design-sync/conventions.md` (regenerate — never hand-edit)
- `CLAUDE.md` (modify — one sentence, step 5)

**Out of scope** (do NOT touch, even though they look related):

- **`SECTIONS[*].heading` in `src/content/design.ts`.** The page's heading is the site's own word and
  does not become American to satisfy a linter. If you find yourself editing a heading, you have
  taken the wrong branch of this plan's central argument.
- `src/pages/design.astro`. The page is unchanged: it keeps rendering the authored headings.
- The `agent` audience. It is prepended to a README and carries no front matter; the spec's section
  names are not its problem, and its budget cannot afford a restructure.
- Adding `@google/design.md` as a dependency, or wiring the linter into CI. Named as deferred in 041
  for reasons that have not changed.
- Any value, and any part of the front matter. 041 owns those.

## Git workflow

- Branch: `advisor/044-conform-to-the-design-md-format`
- Conventional commits — e.g. `feat(design): emit the spec's own section names in the full rendering`
- Do NOT push or open a pull request unless the operator instructed it.

## Steps

### Step 1: Read the spec from the tool, and record what it says

Run `npx --yes @google/design.md@latest spec` and `npx --yes @google/design.md@latest lint DESIGN.md`.

Write into the pull request body: the version the tool reports, the canonical section list it prints,
and the lint result before you change anything. **If the canonical list differs from the one in "Why
this matters", the spec has moved — use the tool's list and say so.** Every step below is written
against v0.4.0.

**Verify**: both commands ran; the baseline lint result is recorded.

### Step 2: Map each section key to its canonical heading

In `src/lib/design-doc.ts`, one table from section key → the heading the **full** rendering emits.
Only the `full` audience uses it.

At v0.4.0 the mapping that has a canonical target is:

| key | authored heading | canonical heading |
|---|---|---|
| `palette` | Colour | `Colors` |
| `type` | Type | `Typography` |

Every other section has **no canonical equivalent** and keeps its authored heading — `Controls`,
`Marks`, and whatever 043 added. That is correct and not a gap: the spec's unknown-content table
preserves them, and `Components` is not the right target for `Controls` because this system's
`components` group is empty by construction and says so.

**A section with no mapping entry must fall through to its authored heading**, not to a blank or a
guess. Write it so that adding a section needs no edit here.

**Verify**: `pnpm test:update`, then `grep -c '^## Colors' DESIGN.md` → 1 and
`grep -c '^## Colour$' DESIGN.md` → 0. The page is untouched:
`grep -c '>Colour<' dist/design/index.html` → still non-zero after `pnpm build`.

### Step 3: Emit the sections in the spec's order, and add the guardrail section

Two changes, both in `renderFull()`:

1. **Order.** Emit sections in the spec's canonical sequence where a section has a canonical name,
   then the rest in the module's own key order. `Overview` stays first and the theming block stays
   with it — it is the precondition every other sentence depends on, and it is an unknown section
   the format preserves.
2. **`## Do's and Don'ts`.** Add it as the last section, carrying every section's `does` and `donts`
   **as one flat list, each line prefixed with the section it came from** so nothing is ambiguous.

   **This duplicates guidance that already appears under each section, and that is the decision to
   make consciously.** Two options, and this plan takes the first:

   - *Aggregate, and keep the per-section lists.* The per-section placement is what a human reading
     the page needs; the canonical section is what a format consumer reads. The duplication is
     mechanical — one list rendered twice from one source — so it cannot disagree with itself. This
     is the same shape as the token table appearing in both audiences.
   - *Move the guidance to the canonical section only.* Rejected: it would strip the reasons out of
     the sections they belong to and make the body a list of rules with no context, which is the
     opposite of what the per-section register was written for.

   Say which was taken and why, in the renderer, in that file's register.

**Verify**: `pnpm test:update`, then `grep -c "^## Do's and Don'ts" DESIGN.md` → 1, and
`npx --yes @google/design.md@latest lint DESIGN.md` → `errors: 0, warnings: 0`.

### Step 4: Gate what the tool cannot see, and only that

In `tests/design-system.test.ts`. The linter is not in the suite and must not be assumed:

1. **No duplicate `##` heading in the full rendering.** This is the format's one hard error and the
   cheapest possible gate. Vacuity floor: at least four headings parsed.
2. **Every canonical mapping target appears exactly once**, and no authored heading it replaces
   appears at all. Both directions, so the mapping cannot quietly stop applying.
3. **Every section's `does` and `donts` line appears in the `Do's and Don'ts` section**, keyed by
   section — the aggregation cannot silently drop a list.
4. **The order is asserted**: the canonical sections appear in the spec's sequence. Assert the
   *relative* order of the ones present, not a fixed index, so adding a section does not redden it.

**Prove gate 1 can fail**: temporarily give two sections the same canonical target and confirm it
goes red. Revert by editing, never a bare `git checkout --`.

**Verify**: `SKIP_BUILD=1 pnpm test design-system` → all pass; the mutation above → gate 1 red.

### Step 5: Tell `CLAUDE.md`

One sentence in the design-system neighbourhood: the full markdown rendering emits the DESIGN.md
format's canonical section names, which are a wire format rather than the site's own words, so the
page's headings and the document's can differ by design — and the mapping is in
`src/lib/design-doc.ts`.

Do not enumerate the mapping and do not name a count.

**Verify**: `SKIP_BUILD=1 pnpm test docs-drift` → all pass.

### Step 6: Full gate

**Verify**: `pnpm test` → exit 0; `pnpm check` → exit 0; `pnpm eslint` → exit 0;
`npx --yes @google/design.md@latest lint DESIGN.md` → `errors: 0, warnings: 0`.
`git diff --name-only` lists only In-scope files.

## Test plan

New, in `tests/design-system.test.ts`:

- no duplicate `##` heading in `renderDesignDoc("full")` (the format's one hard error)
- every canonical heading present exactly once; every heading it replaces absent
- every section's guidance lines reach the aggregated `Do's and Don'ts` section
- the canonical sections appear in the spec's relative order

**The conformance check itself is external** and its output belongs in the pull request body: the
linter's JSON summary before and after, and the `css-vars` export count. A green `pnpm test` is not
evidence about the format.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `npx --yes @google/design.md@latest lint DESIGN.md` → `errors: 0, warnings: 0`
- [ ] `grep -c '^## Colors' DESIGN.md` → 1; `grep -c '^## Colour$' DESIGN.md` → 0
- [ ] `grep -c '^## Typography' DESIGN.md` → 1; `grep -c '^## Type$' DESIGN.md` → 0
- [ ] `grep -c "^## Do's and Don'ts" DESIGN.md` → 1
- [ ] `grep -o '^## ' DESIGN.md | wc -l` equals the number of distinct `##` headings — no duplicates
- [ ] `pnpm build && grep -c '>Colour<' dist/design/index.html` is non-zero — **the page still says
      Calvin's word**
- [ ] `git diff --exit-code src/content/design.ts` → exit 0. No authored heading was renamed
- [ ] `diff <(cat DESIGN.md) <(cat dist/design.md)` is empty — the twin is still byte-identical
- [ ] `git diff --name-only` lists only files from the In-scope section
- [ ] `plans/README.md` is **unmodified**

## STOP conditions

Stop and report back (do not improvise) if:

- `DESIGN.md`'s front matter has no `colors:` key (041 has not landed) or `SECTIONS` has fewer than
  seven entries (043 has not landed).
- `npx --yes @google/design.md@latest spec` prints a canonical section list that differs from the one
  in this plan. The format has moved; report the difference rather than following a stale table.
- The linter reports an error you cannot clear without renaming an authored heading. That is the one
  trade this plan refuses to make on its own.
- You are about to edit `SECTIONS[*].heading`, `src/pages/design.astro`, or add a dependency.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **The canonical mapping is a claim about somebody else's format and it will go stale.** It is
  stamped at v0.4.0 here. The tool prints the spec on demand, which is the right way to re-derive it;
  do not paraphrase the spec into this repository.
- **The document now has two names for two sections** — the site's word on the page, the format's in
  the file. That is deliberate and it is the thing a reviewer is most likely to "fix" by mistake.
  The reason is in `src/lib/design-doc.ts`; keep it there.
- **What a reviewer should scrutinise**: that no authored heading moved; that the aggregated guardrail
  section is rendered from the same source as the per-section lists rather than authored twice; and
  that the duplicate-heading gate was actually mutated.
- **Deliberately deferred**: wiring the linter into CI (a pinned dependency decision); a `Layout`,
  `Elevation & Depth` or `Shapes` section (this system has no scale for any of them, and the front
  matter already declares them omitted with reasons); and mapping `Controls` onto the spec's
  `Components` (the component namespace is empty by construction — the site is Astro and nothing
  mounts — so the mapping would assert something false).
