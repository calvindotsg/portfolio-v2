# Plan 023: Sweep the ~52 prose references that no gate catches

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Your reviewer maintains `plans/README.md` —
> do not edit it.
>
> **Drift check (run first)**: `git log --oneline 8ce7565..HEAD`
> This plan is sized against plans 019–022 having landed. If any has not, its references have not
> gone stale yet and this plan is premature.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (prose only, but this repo treats a stale fact in a `because` clause as a defect)
- **Depends on**: plans/019, 020, 021, 022
- **Category**: docs
- **Planned at**: commit `8ce7565`, 2026-08-07

## Why this matters

`pnpm test` gates the prose, and it is the only thing that does — but it gates less than it
appears to. Measured at `8ce7565`: of 62 live-tree prose references to `constants.ts`,
`tests/docs-drift.test.ts` sees **10**. The rest ship stale with a green suite, in a repo whose
stated doctrine is that a stale fact stated as a reason is load-bearing.

**Docs travel with the WP that invalidates them.** Most of this work belongs inside plans 019–022
and lands there. This plan exists for the residue those plans cannot see coming, and to record the
sizing honestly so nobody calls it free — an earlier draft of this work did, and it was wrong.

## Current state

**How much each mechanism actually catches** (measured, not estimated):

- `tests/docs-drift.test.ts:201` — `if (!TOP_LEVEL.some((t) => token.startsWith(t))) continue;`
  A bare backticked `` `constants.ts` `` never reaches `existsSync`. **10 of 62 references are
  gate-visible.**
- The 26 import sites are a **disjoint** population, not a subset: an import specifier omits `.ts`
  and appears in none of the 62 lines. The compiler catches those, and only those.
- **~52 lines in ~20 files are caught by nothing.** `tests/rendered-html.test.ts` carries 10,
  `tests/patch-wall.test.ts` 5, `CLAUDE.md` 4, `README.md` 3.

**Three classes no gate can see**, each needing its own grep:

| class | grep | example found at `8ce7565` |
|---|---|---|
| prose enumerating a set | `two\|three\|both\|neither\|the two` | `.devin/wiki.json` says "the content module" at lines 34 and 52 and instructs a generator to read `src/lib/constants.ts` at line 13 |
| a stale fact stated as a **reason** | `because\|so that\|since\|rather than` | `src/lib/projection.ts:94`, `tests/build-output.test.ts:119` |
| carve-outs whose subject moved | `except\|only\|all but` | `uno.config.ts:11` — "NOTE WHAT IS NOT IN THIS LIST: `EVENTS`" |

**Claims that become false, and are not path rot:**

| where | what it says | what it becomes |
|---|---|---|
| `README.md:82` | "every piece of site content lives there", then enumerates it | name the two homes; drop the enumeration |
| `README.md:106-111` | `STRAVA_PROFILE_URL` "in `constants.ts`" — bare-backticked, gate-invisible | edited in the same passage as the sanctioned-homes count |
| `README.md:145` | names `tests/constants.test.ts` **and** the deleted path | plan 021 |
| `src/lib/constants.ts:427` | a race is "a data edit and not a code change" | false for a booked race; moves to `src/data/races/README.md` |
| `CLAUDE.md` "Content Management" | entirely about `constants.ts` | rewritten around `src/content/` and `src/data/` |
| `.github/workflows/strava-progress.yml:55` | 1Password is a "backup" | the **truth**; GitHub is the copy (plan 022) |
| `scripts/fetch-strava-progress.mjs:109` | discards rotation for a "static-secret posture" | right behaviour, wrong reason; state the both-stores cost (plan 022) |
| `src/lib/projection.ts:94` | arithmetic "would be evaluated during CSS generation" | shallow; the mechanism is unconfig/jiti, and it now decides who may use `import.meta.glob` |

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `pnpm test` | all pass |
| Residue check | `grep -rn "constants" --include="*.md" --include="*.ts" --include="*.astro" src/ tests/ *.md .devin/ .github/` | only intended matches |

## Scope

**In scope**: `CLAUDE.md`, `README.md`, `.devin/wiki.json`, and comments under `src/`, `tests/`,
`scripts/`, `.github/`.

**Out of scope**:
- `plans/done/` — an archive; its prose is a record of what was true then.
- Any behavioural change. Comments and documents only.
- **Adding facts to `.devin/wiki.json`.** It is gated for durability, not accuracy: no counts, no
  component filenames, no exported constant names. Its update must say *where to derive* the
  content homes at generation time. Writing "read `src/content/` and `src/data/`" as a fact is the
  exact mistake that file's own opening note records.

## Git workflow

- Branch: `plan/023-prose-sweep`
- e.g. `docs: retire the last references to constants.ts`

## Steps

### Step 1: decide the mechanism, and do it first

Either **budget the enumerated sweep** (~52 lines, ~20 files) or **widen the gate** so it really is
the checklist: treat a backticked `^[a-z-]+\.(ts|astro|mjs)$` as a path to resolve against the
known source directories. `tests/docs-drift.test.ts` already has `NAMED_AS_ABSENT` for the excuse
direction, so the shape exists.

If widening: land it **before** the sweep, so the gate names each miss rather than you hunting them.

**Verify**: if widened, `pnpm test` reddens with a list; that list is the work.

### Step 2: run the three greps

One pass per class in the table above. Each hit is a judgement call, not a mechanical replace —
that is why they cannot be gated.

### Step 3: rewrite, do not accumulate

Superseded prose is greppable (`an earlier draft of this`, "this used to"). **Keep the imperative,
cut the archaeology.** This plan should leave the repo with *less* prose than it found, not more.

`src/lib/projection.ts:94` is the one to strengthen rather than trim: its reason is true but
shallow, and the real mechanism — unconfig/jiti loading `uno.config.ts` outside Vite — now governs
which modules may use `import.meta.glob`. Carry that note in each of the four jiti-pinned roots,
not only in `uno.config.ts`.

**Verify**: `pnpm test` → all pass.

### Step 4: shrink the memory

The ~80-line "adding a booked race" section in the maintainer's memory exists because none of this
was written in the repo. Once `src/data/races/README.md` is gated it becomes a pointer to it, and
the 1Password entry gains the truth-versus-copy rule.

## Test plan

No new tests unless step 1 widens the gate, in which case: prove the widened rule fires on a bare
backticked filename that does not exist, and does **not** fire on one that does.

## Done criteria

- [ ] `pnpm test` exits 0
- [ ] `grep -rn "lib/constants\|constants\.ts" src/ tests/ scripts/ *.md .devin/ .github/` returns only intended matches
- [ ] each of the three class greps run and its hits resolved or explicitly judged fine
- [ ] `.devin/wiki.json` names no new file, count or exported constant
- [ ] the repo has fewer prose lines than before, not more (`git diff --stat` shows net deletion)

## STOP conditions

- A grep hit is in `plans/done/` — leave it; it is an archive.
- Rewriting a comment would change what the code does. Stop; that is a code change.
- `.devin/wiki.json` cannot be made accurate without stating a fact. That is the signal to delete
  the claim and name its source instead.

## Maintenance notes

- If the gate was widened in step 1, every future file rename gets named by it. If it was not,
  the next migration pays this cost again — record which was chosen and why.
