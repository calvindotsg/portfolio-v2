# Contributing

How a change gets landed here — process only. **Nothing about the code itself is in this
file.** `CLAUDE.md` holds the architecture, the invariants and the traps that make a
careful change come out wrong; read it before editing anything under `src/`, and follow
its pointers rather than looking for a summary here.

## What this repository accepts

One person's personal site, maintained by that person. **Forking is the expected path** —
the README invites it, the MIT licence permits it, and a change making the site more
yours belongs in your copy rather than in this one.

- **Issues are welcome** — a bug, a broken link, a wrong fact, an accessibility problem.
- **Pull requests are read, but not owed a merge, and there is no review SLA.** A fix to
  something genuinely broken is likely to land; a change to content, copy or layout is
  not — that is the maintainer's own record, and the answer will usually be "fork it".
  Open an issue first if a refusal would waste your time.

`origin` is itself a fork of an upstream template, so **`gh pr create` targets upstream by
default** — pass `--repo calvindotsg/portfolio-v2` or your PR opens on someone else's
project.

## Setup

The README's **Getting Started** section. It is not repeated here.

## The change gate

These must pass before anything lands:

```bash
pnpm check
pnpm eslint
pnpm test
```

`.github/workflows/ci.yml` runs every one of them in its `build` job, and both deploy jobs
sit behind `needs: build` — so **a red run of any of them blocks the deploy**, not just
the suite. Run them locally before you push; CI is the backstop, not the first look.

`pnpm test` builds the site itself before asserting against `dist/`. While iterating,
`SKIP_BUILD=1 pnpm test` reuses an existing `dist/` — never for the run you are trusting.

What the gate does *not* cover — which files `pnpm eslint` reaches, and the DNS zone — is
named in `CLAUDE.md`. Read that before trusting a green run.

## Isolating the work

**Never commit to `main`.** Every change gets its own branch in its own worktree, so the
tree you are editing is never the one a build or another session is using:

```bash
git worktree add .claude/worktrees/<short-name> -b <short-name>
```

`.claude/worktrees/` is already ignored, so a worktree inside the repository never shows up
as untracked. Branch names follow no convention here — short and descriptive is enough.
Remove the worktree once the branch is merged.

One trap belongs to the worktree rather than to git: a fresh worktree has no
`node_modules`, and every command above needs one. Symlink the main checkout's instead of
installing a second copy — `.gitignore` carries both spellings so the link stays ignored.

## Commits

[Conventional Commits](https://www.conventionalcommits.org), with an optional scope:

```
type(scope): lowercase imperative subject
```

Take the vocabulary from `git log` rather than from a list here. Subjects are lowercase
and imperative, and describe the change rather than the file touched.

**The body is where the value is.** History here explains *why* the change was made and
*what was verified* — measurements, what was ruled out, what a reviewer should not have
to re-derive. A body that only restates the subject is not worth writing.

A husky `pre-commit` hook runs `lint-staged`, configured in `package.json`, which applies
`eslint --fix` to the files it matches. It is a formatter, not the gate — it does not run
the commands above.

## Pull requests

The PR title becomes the commit subject, so write it as one — same shape, same lowercase
imperative. Everything lands by squash-merge, and GitHub appends the PR number to that
subject, so it is never typed by hand. The description carries the reasoning; if your
final commit body says it well, that is the description.

## What merging means

**A push to `main` deploys to production at [calvin.sg](https://calvin.sg).** No staging
branch, no manual promotion: the `build` job's artifact is what the production job
uploads, unchanged. A pull request from this repository gets its own preview deploy
first — use it. The README's **Deployment** section has the shape of the pipeline.

## Documentation changes

Documents here are **gated by kind, not uniformly**: what a document is for decides which
rules apply to it, so editing one means knowing which kind it is first. `CLAUDE.md`
defines the kinds and `tests/docs-drift.test.ts` enforces them — read both. A failing
docs gate means the document is wrong, not the test.

## Configuration

A configurable value has a small, closed set of legal homes, listed in the README's
**Configuration** section. Scripts and workflows hold none of their own; do not add one.

## Reporting a problem

[Open an issue](https://github.com/calvindotsg/portfolio-v2/issues) with the URL, the
browser, and what you expected instead.
