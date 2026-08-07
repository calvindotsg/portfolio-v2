# Plan 018: Let a plan live in `plans/` again, and write down what governs it

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Your reviewer maintains `plans/README.md` —
> do not edit it beyond what step 4 specifies.
>
> **Drift check (run first)**:
> `git diff --stat 8ce7565..HEAD -- tests/docs-drift.test.ts plans/README.md CLAUDE.md`
> STOP if `tests/docs-drift.test.ts` gained or lost a gate that iterates `liveDocs()`, or if any
> file matching `plans/0*.md` other than this one already exists — the gap may already be closed.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (one test file, two documents; no runtime code)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `8ce7565`, 2026-08-07

## Why this matters

Two things are wrong, and they compound.

**The conventions are tacit.** `plans/` implements the *improve* skill pipeline from
`github.com/shadcn/improve`. Nothing in the repository says so, so every session re-derives the
numbering, the template and the executor/advisor split by reading archived files — and gets a
slightly different answer each time.

**A live plan cannot exist here any more.** Every plan sits in `plans/done/`, which
`tests/docs-drift.test.ts` exempts as an archive. That exemption reads as "archives are stale by
nature", but the property that actually matters is different: **a plan is a proposal, and a
proposal names the tree it intends to create.** Three gates check names against the tree that
exists, so a live plan reddens all three. Measured against the five plans queued behind this one:
**29 path misses, 5 `pnpm`-script misses, 1 configured-value miss.**

The gate has never met a live plan — 016 and 017 sat at top level until 2026-07-29, and
`tests/docs-drift.test.ts` landed 2026-07-31. So this is not a regression; it is a gap that every
future run of the pipeline hits.

## Current state

- `tests/docs-drift.test.ts:111` —
  `const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", ".venv", "coverage", ".scratchpad"]);`
- `tests/docs-drift.test.ts:113` — `const ARCHIVE = "plans/done/";`
- `tests/docs-drift.test.ts:139` — `liveDocs()`, which walks the tree and filters out `ARCHIVE`.
- **Three gates iterate `liveDocs()`**, and a proposal names tomorrow's tree in all three
  dimensions:

  | line | gate | misses on the queued plans |
  |---|---|---|
  | `:196` | `it("names no file that is not there")` | **29** |
  | `:238` | `it("names no pnpm script that is not in package.json")` | **5** |
  | `:281` | `it("names no configured value that is declared nowhere")` | **1** |

- `tests/docs-drift.test.ts:201-202` — the two filters that already exist, and which decide how
  narrow the new one has to be:
  ```ts
  if (!TOP_LEVEL.some((t) => token.startsWith(t))) continue;
  if (/[*${}]/.test(token)) continue; // globs and interpolations are not paths
  ```
  The second means a token written `plans/NNN-*.md` is **already** skipped. The problem is not the
  plan's own filename — it is the paths a plan file *contains*.
- `tests/docs-drift.test.ts:180` — `TOP_LEVEL`, which does not include `.scratchpad/`; that is why
  staging a plan there is invisible to the path gate as well as to `walk()`.
- `plans/README.md:3` — "**Nothing is executable right now.**" This plan makes that false.
- `plans/README.md:71-73` — the execution table, currently ending at 017.
- `CLAUDE.md` — has no section on `plans/` at all.

**The repo convention for a plan's shape** is the upstream template; `plans/done/015-*.md` is the
closest exemplar in-tree — executor instructions, a drift check against a stamped SHA, a Status
block, Current state with inlined excerpts, per-step **Verify**, machine-checkable Done criteria,
STOP conditions.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Tests | `pnpm test` | all pass |
| Read the upstream skill | `pnpm dlx opensrc path shadcn/improve` | prints a cached source path |

## Scope

**In scope**:
- `tests/docs-drift.test.ts`
- `plans/README.md`
- `CLAUDE.md` (one short section)
- `plans/019-*.md` … `plans/023-*.md` (moved in, not authored — they are staged already)

**Out of scope**:
- **Restating anything the upstream repository or its `SKILL.md` already says** — not the
  template, not the numbering rule, not the file naming, not the advisor/executor split. Name the
  source and how to read it. A copied convention goes stale silently, which is the failure mode
  `.devin/wiki.json` exists to record.
- `plans/done/` — an archive. Nothing in it changes.
- Widening the path gate to catch bare basenames. That is a real idea and it belongs to plan 023,
  which is sized on it; doing it here mixes two arguments.

## Git workflow

- Branch: `plan/018-live-plans`
- Conventional commits, matching `git log`: e.g.
  `docs(plans): let a plan live in plans/ again, and record what governs it`

## Steps

### Step 1: exempt a proposal from the three name gates

In `tests/docs-drift.test.ts`, add one predicate beside `ARCHIVE`:

```ts
/** A numbered plan under `plans/`. Distinct from `plans/README.md`, which is current-state. */
const isProposal = (file: string) => /^plans\/\d{3}-/.test(file);
```

Skip proposals in the three gates at `:196`, `:238` and `:281` — and **only** those three. Record
the reason in place: a plan names the tree it intends to create, so gating its names against the
tree that exists is a category error, and the document class is neither current-state nor a
standing instruction. `plans/README.md` is **not** a proposal and stays fully gated: its baseline
table is a claim about now.

Assert the exemption in **both** directions, the way `NAMED_AS_ABSENT` already is at `:214` — a
test that the predicate matches a numbered plan and does not match `plans/README.md`, so the
exemption cannot silently widen.

**Verify**: `pnpm test` → all pass.

### Step 2: prove the exemption is doing work

Temporarily add a line to this file naming a path that does not exist and a `pnpm` script that
does not exist, both backticked.

**Verify**: `pnpm test` → still green (the exemption catches them). Then move the same two tokens
into `plans/README.md` and confirm `pnpm test` → **red**, naming both. Remove them.

This is the minimum stimulus for both halves; a floor proved only on the path gate stays green on
a bad script name.

### Step 3: finish the standard

`plans/README.md`'s "What governs this directory" section and `CLAUDE.md`'s "Plans" section were
written in the same commit as this plan, so most of this step is already done — read them before
adding anything. They deliberately name `github.com/shadcn/improve` as the source and restate
none of the pipeline, and they record only what is local: the `plans/done/` archive convention,
monotonic numbering, the override of the user-level lifecycle, and the staging directory.

**One bullet was held back because it was not true yet**, and step 1 makes it true. Add it to
"What governs this directory":

> A numbered plan is a **proposal** and is exempt from the three gates that check a name against
> the tree that exists — paths, `pnpm` scripts and configured values. `plans/README.md` is not a
> proposal and is fully gated.

Do not restate the exemption's mechanism there; the reason belongs beside the predicate in
`tests/docs-drift.test.ts`, and a second copy is a second thing to keep in step.

**Verify**: `pnpm test` → all pass. `grep -c "shadcn/improve" plans/README.md` → at least 1.

### Step 4: open the ledger

In `plans/README.md`: delete "Nothing is executable right now" and the sentence that says every
plan is archived, both now false. Add rows 018–023 to the execution table with their dependencies,
and move the five staged plan files into `plans/`.

The five are staged in the repository's scratch directory as `019-…` through `023-…`. Move, do not
rewrite.

**Verify**: `pnpm test` → all pass, **with all six plans present**. This is the whole point of the
plan: if it is green here, a live plan can exist again.

## Test plan

- Extend `tests/docs-drift.test.ts` with the both-directions assertion on `isProposal` described
  in step 1. No new file.
- Step 2 is the executable proof and its result belongs in the PR body: a bad path and a bad
  script name in a proposal are green; the same two in `plans/README.md` are red.
- Verification: `pnpm test` → all pass.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0 with six files matching `plans/0*.md` present
- [ ] `grep -c "isProposal" tests/docs-drift.test.ts` returns at least 4 (definition, three gates)
- [ ] the both-directions assertion exists and fails if `isProposal` is widened to match `plans/README.md`
- [ ] step 2's red-and-green pair recorded in the PR body
- [ ] `plans/README.md` no longer says "Nothing is executable right now"
- [ ] `plans/README.md` names `github.com/shadcn/improve` and states only the local deviations
- [ ] `CLAUDE.md` points at that section without restating it
- [ ] `git status --porcelain` lists only in-scope files

## STOP conditions

- Step 2's second half is green — `plans/README.md` is being exempted too, and the whole gate has
  been switched off rather than scoped.
- A gate other than the three at `:196`, `:238` and `:281` turns out to iterate `liveDocs()`.
  Re-read before exempting it; durability and internal-consistency gates must still apply.
- The five staged plans are not where step 4 expects them. They are gitignored, so they do not
  travel with a branch or a fresh clone — get them from the author rather than reconstructing them.
- `pnpm test` is red after step 4 for a reason that is not a name gate. That is a real finding
  about one of the five plans; report it rather than editing the plan to pass.

## Maintenance notes

- The exemption is scoped to `plans/NNN-*.md`. A plan named any other way is gated like ordinary prose,
  which is the safe default — do not loosen the pattern to accommodate a filename; rename the file.
- Plans 019–023 assume this landed. 019 is independent of the rest; 020 must precede 021 and 022;
  023 is sized on all four.
- If plan 023 widens the path gate to catch bare basenames, re-check that `isProposal` still short-
  circuits before the new rule, or a proposal starts failing on filenames it legitimately predicts.
