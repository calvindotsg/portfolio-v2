# Plan 014: Assert the Now card and Career dates/company survive the render

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md` — do
> not edit it.
>
> **Drift check (run first)**: `git diff --stat 4e15674..HEAD -- tests/rendered-html.test.ts src/components/Now.astro src/components/Career.astro src/pages/index.astro`
> Plans 011–013 land before this plan; 011 edits `tests/rendered-html.test.ts`
> (footer assertions + a new icons test) and Career's title line, and 012
> edits class attributes. None of them touch what this plan asserts (the Now
> paragraph, the Career dates/company block). If those blocks don't match the
> excerpts below, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/011-emoji-to-icons.md (merge order only — shared test file)
- **Category**: tests
- **Planned at**: commit `4e15674`, 2026-07-22
- **Finding**: run-3 audit TESTS-01 (skeptic-CONFIRMED)

## Why this matters

`tests/constants.test.ts` validates that `NOW.description` and every CAREER
entry's `company`, `company_url`, `start_date`, `end_date` are well-formed —
but nothing asserts those fields survive the render. Deleting `<Now/>` from
the page, or dropping the dates/company block from `Career.astro` during a
layout refactor, leaves the entire suite green today. A few lines in the
existing rendered-page loops close the gap. (Note: `NOW.description` is a
substring of `METADATA.description`, which reaches the page only inside
`<meta content>` attributes — so asserting against the body-text `text`
variable, as the existing block does, is what gives the assertion teeth.)

## Current state

`tests/rendered-html.test.ts` — the "page content" describe (starts ~line 73)
asserts WELCOME, ABOUT_ME, CAREER (job_name + bullets only), FOOTER, GOALS.
There is no NOW import and no assertion on dates/company. The career test:

```ts
    it("renders one card per career entry, with its bullets", () => {
        for (const job of CAREER) {
            expect(text).toContain(job.job_name);
            for (const line of job.description) expect(text).toContain(line);
        }
    });
```

`src/components/Now.astro:17` renders `<p class="text-sm">{NOW.description}</p>`.

`src/components/Career.astro:17-22` renders:

```astro
        <p class="text-xs font-light">
            {job.start_date} - {job.end_date}
        </p>
        <a href={job.company_url} class="text-xs font-light">
            {job.company}
        </a>
```

The `text` variable in the test file is decoded, whitespace-normalised
visible text (see its declaration comment ~line 11) — `{job.start_date} -
{job.end_date}` normalises to `"Aug 2023 - Present"` style strings.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Tests | `pnpm test` | all pass (measure baseline in step 1) |
| Typecheck | `pnpm check` | 0 errors, 0 warnings, 2 hints |
| Lint | `pnpm eslint` | exit 0, no output |

pnpm ONLY — never npm. The `lint-staged` pre-commit hook is expected.

## Scope

**In scope** (the only file you may modify):
- `tests/rendered-html.test.ts`

**Out of scope** (do NOT touch):
- Any `src/` file — this plan is pure test additions.
- The other two test files.
- `plans/README.md`.

## Git workflow

- Branch: `improve/014-rendered-coverage`
- Conventional commit, e.g. `test: assert Now and Career dates/company survive the render`
- Do NOT push, do NOT open a PR.

## Steps

### Step 1: Baseline

`pnpm install && pnpm test` — record the passing test count.

### Step 2: extend the career assertions

In the existing "renders one card per career entry, with its bullets" test,
extend the loop body:

```ts
        for (const job of CAREER) {
            expect(text).toContain(job.job_name);
            for (const line of job.description) expect(text).toContain(line);
            expect(text).toContain(`${job.start_date} - ${job.end_date}`);
            expect(text).toContain(job.company);
            expect([...doc.querySelectorAll("a")].map((a) => a.getAttribute("href")), `${job.company} link`).toContain(job.company_url);
        }
```

### Step 3: assert the Now card renders

Add `NOW` to the constants import at the top of the file, then add a new test
in the "page content" describe:

```ts
    it("renders the Now card's status line", () => {
        // NOW.description is a substring of METADATA.description, which only
        // reaches <meta content> attributes — `text` is body-only, so this
        // fails if <Now/> is dropped from the page.
        expect(text).toContain(NOW.description);
    });
```

**Verify**: `pnpm test` → all pass, count = step-1 baseline + 1 (step 2
extends an existing test; step 3 adds one).

### Step 4: mutation-test the new assertions

Three mutations, one at a time, each reverted before the next (these touch
`src/` temporarily — allowed only as mutations, never committed):

1. In `src/pages/index.astro`, comment out `<Now/>`: `pnpm test` → exactly
   "renders the Now card's status line" fails.
2. In `src/components/Career.astro`, delete the `{job.start_date} - {job.end_date}`
   paragraph: `pnpm test` → exactly the career test fails.
3. In `src/components/Career.astro`, change the anchor to `href="#"`:
   `pnpm test` → exactly the career test fails on the company link.

Revert all; `pnpm test` fully green; `git status` shows only
`tests/rendered-html.test.ts` modified. Report all outcomes.

### Step 5: full ladder + commit

`pnpm check && pnpm eslint && pnpm test` — all green. Commit.

## Test plan

This plan IS the test plan: one extended test, one new test, three mutations.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` → 0 errors; `pnpm eslint` → exit 0
- [ ] `pnpm test` → all pass, count = step-1 baseline + 1
- [ ] `grep -c 'NOW.description' tests/rendered-html.test.ts` → ≥ 1
- [ ] `grep -c 'start_date' tests/rendered-html.test.ts` → ≥ 1
- [ ] All three mutation checks reported (fail-then-green each)
- [ ] `git status` — only `tests/rendered-html.test.ts` modified

## STOP conditions

Stop and report back (do not improvise) if:

- The career/Now excerpts don't match the live components (drift).
- A mutation does NOT make the expected test fail — that means the assertion
  is not covering what this plan claims; report rather than strengthening it
  ad hoc.
- Step 2's date assertion fails because whitespace normalisation renders the
  dates differently than `"start - end"` — inspect `text` and report the
  actual rendering; do not loosen the assertion to a regex without reporting.

## Maintenance notes

- If the maintainer ever renames/reshapes NOW or CAREER fields, these
  assertions fail loudly at `pnpm test` — that is intended; update them with
  the constants change.
- Reviewer should scrutinize: assertions target `text` (body-only), not raw
  `html` — the METADATA.description substring trap in "Why this matters".
