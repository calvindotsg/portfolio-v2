# Plan 027: Every premise that depended on this being a fork is retired, and Dependabot governs all three dependency surfaces

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat daffa04..HEAD -- .github/ CLAUDE.md CONTRIBUTING.md .devin/wiki.json src/content/home.ts tests/docs-drift.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt (with a security-hygiene component)
- **Planned at**: commit `daffa04`, 2026-08-17

## Why this matters

This repository left the GitHub fork network of `Ladvace/astro-bento-portfolio` on
2026-08-16. Being a fork was a *premise* that six live files reasoned from, and every
one of those reasons is now false. Five are stale prose; the sixth was costing
something real. `.github/dependabot.yml` has been inert since it landed on 2026-07-30,
because GitHub withholds version updates from a fork whose configuration file arrived
that way — so the repository's SHA-pinned actions had something that *looked* like it
was refreshing them and was not. Detaching arms that file with no setting change. The
work here is to correct the false claims, and to rebuild the configuration for the
three dependency surfaces this repository actually has rather than the one it declared.

## Current state

Files in scope, each with one line on its role:

- `.github/dependabot.yml` — declares only the `github-actions` ecosystem; its comment
  block asserts the file is inert because the repository is a fork.
- `.github/workflows/ci.yml` — the only builder. Line ~128 ends a Dependabot comment
  with a parenthetical calling the guard moot.
- `CONTRIBUTING.md` — lines 19-21 instruct contributors to pass `--repo` to `gh pr create`.
- `CLAUDE.md` — lines ~89-90 carry a measured census of durability-predicate hits.
- `.devin/wiki.json` — page-notes entry asserting present-tense fork status.
- `tests/docs-drift.test.ts` — a comment asserting the same.
- `src/content/home.ts` — the `PROJECTS` head; its counterexample against an
  API-derived list turns on a "not a fork" predicate.

Excerpts as they exist at `daffa04`:

`.github/dependabot.yml:13-19`
```
# THIS FILE IS INERT UNTIL SOMEONE CLICKS ENABLE, because this repository is a FORK
# (of Ladvace/astro-bento-portfolio). GitHub: "Version updates are not automatically
# enabled on forks when a `dependabot.yml` configuration file is present" — on a fork
# you must also enable it under Settings > Advanced Security > Dependabot version
# updates.
```

`.github/workflows/ci.yml:128-129`
```
      # back. (Moot until someone enables Dependabot: this repo is a fork, see
      # `.github/dependabot.yml`.)
```

`CONTRIBUTING.md:19-21`
```
`origin` is itself a fork of an upstream template, so **`gh pr create` targets upstream by
default** — pass `--repo calvindotsg/portfolio-v2` or your PR opens on someone else's
project.
```

`CLAUDE.md:89-90`
```
    constant. Measured: `CONTRIBUTING.md` 3 findings, `README.md` 10,
    `scripts/README.md` 20, and every one of the 33 is prose the document exists
```

`src/content/home.ts:95-97`
```
 * REPOS API: that gets the membership wrong in both directions, because it needs an
 * invented inclusion rule ("public, not a fork, has a description") which pulls in tools
 * he does not lead with and drops `portfolio-v2` and `homebrew-tap`, which he does.
```

Repository conventions that apply here:

- **Comments argue rather than assert.** Every non-obvious decision in this repository
  carries its reasoning in place, including the alternatives rejected and why. The
  exemplar for a config file is `.github/dependabot.yml` itself at `daffa04`, and for a
  workflow `.github/workflows/dns.yml:1-30`. Match that density; a bare config block
  with no argument will read as out of place.
- **Prose is gated by the test suite.** `tests/docs-drift.test.ts` walks the tree
  (`liveDocs()`, line ~196) and includes `.yml`, `.json` and `.ts`. Every backticked
  token that looks like a repository path, a bare source filename, a `pnpm` script or an
  `ALL_CAPS_WITH_UNDERSCORES` configured value must resolve against the real tree.
  Writing a comment here means every backticked name in it is an assertion.
- **`.devin/wiki.json` has stricter rules than any other document**: no counts, no
  `*.astro` filenames, no `--css-custom-property` tokens, no exported constant names.
  Only change tense there; add no new fact.
- Facts a document states must be re-derivable. Where a count is stated, the derivation
  command is stated with it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0, no output |
| Tests (builds first) | `pnpm test` | exit 0, all files pass |
| Fast iteration | `SKIP_BUILD=1 pnpm test` | reuses `dist/` — never for the run you trust |

A fresh worktree has no `node_modules`; symlink the main checkout's rather than
installing a second copy. `.gitignore` carries both spellings so the link stays ignored.

## Suggested executor toolkit

- The authoritative Dependabot option list is not in this repository. Read it before
  writing the config:
  `gh api repos/github/docs/contents/content/code-security/reference/supply-chain-security/dependabot-options-reference.md --jq .content | base64 -d`
- Validate the finished YAML against `https://json.schemastore.org/dependabot-2.0.json`
  before pushing. A malformed `dependabot.yml` fails silently as "configured and doing
  nothing", which is the exact failure mode this plan exists to end.

## Scope

**In scope** (the only files you should modify):

- `.github/dependabot.yml` (rewrite)
- `.github/workflows/ci.yml` (comment only — no `if:` line may move)
- `CONTRIBUTING.md`
- `CLAUDE.md`
- `.devin/wiki.json`
- `tests/docs-drift.test.ts` (comment only)
- `src/content/home.ts` (comment only)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch, even though they look related):

- `README.md` "Acknowledgements", the `LICENSE` copyright line, and the `FOOTER.suffix`
  string in `src/content/site.ts` — **this is the attribution and it stays.** It is
  already past tense and correct. Removing it would be the one genuinely wrong outcome
  of this work.
- `plans/done/**` — the archive is exempt from the prose gates by design and its
  statements were true when written. Leaving a historical document in the past tense is
  correct; editing it is not.
- The two stale action SHA pins (`pnpm/action-setup@0ebf471`, and
  `actions/checkout@fbc6f39` in `strava-progress.yml`). **Deliberately left unbumped**:
  the first grouped bot pull request is the end-to-end proof this change worked, and
  bumping them by hand destroys that signal.
- Every fork-PR guard in `.github/workflows/ci.yml` and `.github/workflows/dns.yml`, and
  their fixtures in `tests/workflow-guards.test.ts` and `tests/dns-config.test.ts`.
  These are about *other people* forking this repository, which is still possible. They
  are correct and must not be "cleaned up".
- `package.json` — do not add `private: true` or a `description`. Both are unrelated
  hygiene items, and adding a `description` would silently change how Dependabot
  classifies this package (see step 1).

## Git workflow

- Branch: short and descriptive, in its own worktree under `.claude/worktrees/`.
- Conventional Commits, lowercase imperative subject, optional scope. Take the
  vocabulary from `git log`. The body carries *why* and *what was verified* —
  measurements, what was ruled out, what a reviewer should not have to re-derive.
- Squash-merge; the PR title becomes the commit subject.

## Steps

### Step 1: Rebuild `.github/dependabot.yml` for three ecosystems

Replace the single `github-actions` entry with three, and rewrite the comment block to
argue for them. The three surfaces and the reason each is here:

- `github-actions` at `/` — the `uses:` pins under `.github/workflows/`.
- `npm` at `/` — the build tree. pnpm is read through the `npm` ecosystem, which
  supports the v9 lockfile this repository carries. There is no separate pnpm ecosystem.
- `pip` at `/dns` — `dns/requirements.txt`. This is the strongest of the three, not an
  afterthought: the same two packages are installed into the `dns.yml` job that holds
  the Cloudflare DNS write token. It is already reviewable for free — `dns.yml` fires on
  `paths: dns/**`, its first job runs credential-free and executes `dns/test_filters.py`
  plus `octodns-validate`, and the two jobs that can read the zone already exclude
  `dependabot[bot]` by actor.

Target shape (full block style in the file):

```yaml
version: 2

updates:
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: monthly }
    open-pull-requests-limit: 2
    commit-message: { prefix: chore(deps) }
    cooldown: { default-days: 7 }
    groups:
      actions: { patterns: ["*"] }

  - package-ecosystem: npm
    directory: /
    schedule: { interval: monthly }
    open-pull-requests-limit: 5
    commit-message: { prefix: chore(deps), prefix-development: chore(deps-dev) }
    cooldown: { semver-major-days: 30, semver-minor-days: 7, semver-patch-days: 3 }
    groups:
      npm-routine: { patterns: ["*"], update-types: [minor, patch] }

  - package-ecosystem: pip
    directory: /dns
    schedule: { interval: monthly }
    open-pull-requests-limit: 2
    commit-message: { prefix: chore(deps) }
    cooldown: { semver-major-days: 30, semver-minor-days: 7, semver-patch-days: 3 }
    groups:
      octodns: { patterns: ["*"] }
```

Four decisions the comment must record, because each has a wrong-looking alternative:

1. **`cooldown` is a supply-chain control, not tidiness.** A release is not adopted until
   it has been public long enough for a compromised publish to be yanked. It delays
   version updates only and never security updates, so it costs no latency against an
   advisory. `github-actions` supports only `default-days`; `npm` and `pip` also support
   the per-bump figures, which is why the shapes differ.
2. **No `applies-to` key, deliberately.** It defaults to version updates, so these groups
   cannot capture a security update — which is the intent. Security advisories keep
   GitHub's default one-PR-per-dependency shape: they are exempt from
   `open-pull-requests-limit` and unlimited, so each stays independently mergeable.
   **Do not add `applies-to: security-updates` groups.** They would not stop advisories
   queueing (the exemption is what precludes that); they would bundle concurrent
   advisories into one un-mergeable pull request.
3. **The npm group takes `minor` and `patch` only**, so majors fall out individually. A
   framework, type-checker or linter major is a migration, not a chore.
4. **No `versioning-strategy`.** It would be a no-op on both manifests: Dependabot's
   library heuristic needs a `description` in `package.json` (absent here) or a pyproject
   under `dns/` (absent), so the default already resolves to the increase strategy.
   Setting it would state a preference that does nothing and invite a false explanation.

The comment must also delete the fork paragraph, replace the opening paragraph's
"declares only the `github-actions` ecosystem … alerts and security updates are both
switched off" claim, keep the "cannot convert a tag into a SHA" note, and extend the
"re-derive rather than trust" instruction from one count to three.

**Verify**: the YAML parses and every key is known to the schema —

```bash
node -e 'const d=require("yaml").parse(require("fs").readFileSync(".github/dependabot.yml","utf8"));console.log(d.version,d.updates.length,d.updates.map(u=>u["package-ecosystem"]).join(","))'
```
→ `2 3 github-actions,npm,pip`

### Step 2: Correct `.github/workflows/ci.yml`

Delete the trailing parenthetical "(Moot until someone enables Dependabot: this repo is
a fork …)". The rest of that comment explains why the analytics step is keyed on
`github.actor != 'dependabot[bot]'` and is correct — it becomes live rather than
hypothetical. Replace the parenthetical with a sentence saying so.

**Verify**: `git diff .github/workflows/ci.yml | grep -E '^[+-]\s*(if:|-)'` → no output
(comment-only change; no `if:` line and no step moved).

### Step 3: Delete the `gh pr create` paragraph from `CONTRIBUTING.md`

Remove lines 19-21 entirely, leaving the `## Setup` heading directly after the bullet
list above it. With no parent repository there is nothing for `gh` to resolve to but
`origin`, so the instruction now sends a contributor chasing a flag they do not need.

**Verify**: `grep -c -- '--repo' CONTRIBUTING.md` → `0`

### Step 4: Correct the census in `CLAUDE.md` — measure, do not transcribe

This step exists **because of step 3** and nothing catches it. The deleted paragraph
held `CONTRIBUTING.md`'s only `--repo`, which is one of the durability-predicate hits
that sentence counts. `backtickedIn()` discards whitespace-bearing tokens, so nothing in
the suite asserts these figures.

Re-run the four predicates (they are in `tests/docs-drift.test.ts`, in the
`states no fact in the wiki` test) over `CONTRIBUTING.md`, `README.md` and
`scripts/README.md`, **after** step 3, and write the numbers you actually measure.

Expected at the time of writing: `3 / 10 / 20 = 33` before step 3, `2 / 10 / 20 = 32`
after. Do not copy those figures without re-running — they were measured against
`daffa04`. Also add the derivation to the sentence, so the next person re-runs rather
than trusts; these figures have now drifted silently twice.

**Verify**: the number in `CLAUDE.md` equals the number your own run printed.

### Step 5: Fix the tense in `.devin/wiki.json` and `tests/docs-drift.test.ts`

Both assert present-tense fork status inside an argument that is otherwise still true
and worth keeping — generated documentation here really does invent plausible upstream
features. Change only the tense. In `.devin/wiki.json` also change "the fork's whole
identity" to name the repository instead.

**Add no new fact to `.devin/wiki.json`** — no date, no count, no filename. Its
durability gate will fail on any of those.

**Verify**: `node -e 'JSON.parse(require("fs").readFileSync(".devin/wiki.json","utf8"));console.log("valid")'` → `valid`

### Step 6: Repair the counterexample in `src/content/home.ts`

The `PROJECTS` head rejects rebuilding the list from the GitHub repos API on the ground
that a rule of "public, not a fork, has a description" *drops* `portfolio-v2`. Detaching
inverted that: the rule now **selects** it.

**Delete the whole "drops …" clause, not just the fork predicate** — the `homebrew-tap`
half is independently false and was never detach-caused, so a repair that only removes
the two words leaves the sentence wrong. The surviving argument (a curated list answers a
different question from an API query) is untouched and is already carried fork-free by
the paragraph below it. The repair is an opportunity rather than a loss: what this
demonstrates is that a metadata rule and an editorial one answer different questions, and
this is what it looks like when the metadata moves.

**Verify**: `grep -c 'not a fork' src/content/home.ts` → `0`

### Step 7: Run the gate

**Verify**: `pnpm check` → `0 errors`; `pnpm eslint` → no output; `pnpm test` → all test
files pass. Record the pass/skip totals in the commit body; do not assert an absolute
total anywhere in the repository.

## Operator steps (not executable by the executor)

These need repository-admin credentials and are recorded here so they are not lost.
**Check the active login in the same command as every write** — this repository is
public, so a wrong account fails only on writes and reads as a typo:

```bash
gh api user -q .login
gh api -X PUT repos/calvindotsg/portfolio-v2/topics \
  -f 'names[]=astro' -f 'names[]=portfolio' -f 'names[]=personal-website' -f 'names[]=website'
gh api -X PUT repos/calvindotsg/portfolio-v2/private-vulnerability-reporting
gh api -X PUT repos/calvindotsg/portfolio-v2/automated-security-fixes
```

**Quote each `names[]=` field.** The agent shell is zsh, which reads `[]` as a bracket
glob; unquoted, this aborts at expansion with `no matches found` *before* `gh` runs, and
because NOMATCH is fatal to a non-interactive eval it silently takes the following writes
down with it. Reproduced: unquoted exit 1, quoted exit 0. The unquoted form is safe in
the maintainer's Fish terminal, which is exactly why it reads correct.

Dropping the `svelte` topic: there is no Svelte dependency and no `.svelte` file. This is
drift rather than fork inheritance, but it matters more now — forks are excluded from
GitHub repository search by default, so this repository has only just become discoverable.

Locally, the dead `upstream` remote and the orphaned `refs/remotes/pr/*` refs can go:
`git remote remove upstream`.

## Test plan

**No new tests.** This is the honest answer and it is worth stating rather than padding:

- The prose changes are already gated. `tests/docs-drift.test.ts` reaches every file in
  scope through `liveDocs()`, which discovers rather than lists, so the edits are checked
  the moment they land.
- The workflow change is comment-only, and `tests/workflow-guards.test.ts` already
  **executes** the `if:` expressions against a `dependabot[bot]` actor fixture
  (`"Dependabot PR"`). It must stay green; if it changes at all, the change was not
  comment-only.
- `.github/dependabot.yml` cannot be gated offline in a way that is worth the code. What
  would catch a real defect is the SchemaStore validation in "Suggested executor toolkit",
  which is a one-off pre-flight rather than a suite member, and the first bot pull request.

If you find yourself writing a test that asserts the *contents* of `dependabot.yml`, stop:
it would restate the config in a second place, which is the drift class this repository's
whole documentation gate exists to prevent.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0 with `0 errors`
- [ ] `pnpm eslint` exits 0 with no output
- [ ] `pnpm test` exits 0, every test file passing or skipped
- [ ] `.github/dependabot.yml` parses and declares exactly three ecosystems:
      `github-actions`, `npm`, `pip`
- [ ] Every key in it is known to `https://json.schemastore.org/dependabot-2.0.json`,
      including the `cooldown` and `groups` sub-keys
- [ ] `grep -rn 'this repo is a fork\|is a fork of\|not a fork' --include='*.md' --include='*.yml' --include='*.ts' --include='*.json' . | grep -v plans/done` returns nothing outside an explicitly past-tense sentence
- [ ] `grep -c -- '--repo' CONTRIBUTING.md` returns `0`
- [ ] `git diff .github/workflows/ci.yml` shows no change to any `if:` expression
- [ ] The attribution is intact: `grep -c 'Gianmarco' src/content/site.ts README.md LICENSE` finds all three
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live code — the tree has drifted
  since `daffa04`.
- `gh api repos/calvindotsg/portfolio-v2 -q .fork` returns `true`. The entire premise of
  this plan is that it returns `false`; if the detach was reverted or never happened,
  **every edit here makes the documentation wrong in the opposite direction.**
- `pnpm test` fails on `tests/workflow-guards.test.ts` or `tests/dns-config.test.ts`.
  Those are executed guards, not prose — a failure means step 2 was not comment-only.
- The `.devin/wiki.json` durability gate reddens. That means the tense fix introduced a
  fact; revert to a pure tense change rather than arguing with the gate.
- You conclude the attribution in `README.md`, `LICENSE` or `src/content/site.ts` should
  also be removed. It should not. That is the one irreversible mistake available here.

## Maintenance notes

- **The first grouped `chore(deps)` pull request is the real verification, and it is
  deferred by a month.** Until it appears, "Dependabot is live" is inference from
  GitHub's documented fork rule, not measurement. Record it that way.
- **Do not use the presence of a "Dependabot Updates" workflow as an early proxy.**
  Measured across the maintainer's 20 repositories that carry a `dependabot.yml`, only 2
  have that workflow entry, so its absence does not discriminate live from dark.
- A reviewer should scrutinise: that no `if:` expression moved in `ci.yml`; that the
  `CLAUDE.md` figures were re-measured rather than copied from this plan; and that the
  attribution is untouched.
- When the npm entry starts producing pull requests, watch the interaction with the
  `dist/` byte-comparison the suite rests on — a lockfile bump changes build output, and
  the suite is what decides whether that is acceptable.
- Deferred out of this plan on purpose: clearing the two surviving `pnpm audit` highs.
  They come from an orphaned optional peer and need a whole-tree re-resolution with its
  own `dist/` comparison, which is its own plan.
