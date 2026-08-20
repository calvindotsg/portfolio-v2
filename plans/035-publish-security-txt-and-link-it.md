# Plan 035: Serve `/.well-known/security.txt` on calvin.sg, and point SECURITY.md at it

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `plans/README.md`.
>
> **This plan spans TWO repositories.** Steps 1–4 are in this repo (`portfolio-v2`).
> Step 5 is in a *different* repo, `calvindotsg/.github`, and is marked as such. Do
> not attempt step 5 from inside this checkout.
>
> **Drift check (run first)**:
> `git diff --stat f522418..HEAD -- src/pages/ tests/build-output.test.ts astro.config.mjs`
> If any of those changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none — disjoint from 031–034, may run in parallel with any of them
- **Category**: security
- **Planned at**: commit `f522418`, 2026-08-20

## Why this matters

`security@calvin.sg` is now published as the security contact in `SECURITY.md` of
`calvindotsg/.github`, which GitHub inherits into **all 40** `calvindotsg` repositories,
and the Cloudflare Email Routing rule behind it is live. A human reporter browsing a repo
can find it.

An automated scanner cannot. RFC 9116 defines `/.well-known/security.txt` as *the*
machine-readable location for a security contact, and it is what vulnerability-disclosure
tooling and many researchers check first, before hunting for a SECURITY.md. Today
`https://calvin.sg/.well-known/security.txt` returns **404** (verified 2026-08-20).

When this lands, both the human path and the scanner path lead to the same monitored
mailbox, and the `Policy` field ties the machine-readable file back to the human-readable
policy so the two cannot drift apart silently.

## Current state

### This is an Astro static site

- `astro.config.mjs` — `output: "static"`, `site` declares the origin. Built with
  `pnpm build` into `dist/`.
- `src/pages/` — routes. **Machine-readable root files are generated here as endpoints,
  not shipped as files in `public/`.** Two already exist and are the pattern to copy:
  - `src/pages/robots.txt.ts`
  - `src/pages/llms.txt.ts`
- `public/` — verbatim-copied assets only (`favicon.ico`, `preview.jpg`, `resume.pdf`,
  `_headers`). **Do not put security.txt here.** See "Why an endpoint, not public/" below.
- `tests/build-output.test.ts` — asserts on what `pnpm build` actually emits. Its own
  header comment: *"A green build is not evidence the site is correct — these checks are
  what make it evidence."*

### `.well-known` in `src/pages/` is explicitly supported

This was verified against the installed Astro, not assumed. `astro@7.2.2`,
`node_modules/astro/dist/core/routing/create-manifest.js` lines 92–97:

```js
if (name[0] === "_") {
  continue;
}
if (basename[0] === "." && basename !== ".well-known") {
  continue;
}
```

Astro skips every dot-prefixed entry in `src/pages/` **except `.well-known`**, which is
special-cased. So `src/pages/.well-known/security.txt.ts` is a first-class supported
route and will emit `dist/.well-known/security.txt`.

### The exemplar to match — `src/pages/robots.txt.ts`

Read this file in full before writing anything. Its shape, verbatim:

```ts
import type {APIRoute} from "astro"

/**
 * `robots.txt`, generated rather than kept as a file in `public/`.
 * ...
 */
export const GET: APIRoute = ({site}) => {
    // `site` is `astro.config.mjs`'s `site`. Typed optional because a project may omit it;
    // this one cannot — the sitemap integration and every canonical URL already require
    // it — so a missing value should be a build failure rather than the string
    // "undefined/sitemap-index.xml" reaching the served file.
    if (!site) throw new Error("`site` must be set in astro.config.mjs for robots.txt to name the sitemap")

    const body = [
        "# Everything on this site is public and may be crawled, indexed and cited,",
        "# including by AI and answer engines. /llms.txt is the same site as plain text.",
        "User-agent: *",
        "Allow: /",
        "",
        `Sitemap: ${new URL("sitemap-index.xml", site).href}`,
        "",
    ].join("\n")

    return new Response(body, {headers: {"content-type": "text/plain; charset=utf-8"}})
}
```

Conventions visible there and **required** of your new file:

- 4-space indent, double-quoted strings, **no semicolons**, `{APIRoute}` with no spaces
  inside the braces.
- `export const GET: APIRoute = ({site}) => { ... }`.
- **Derive the origin from `site`, never hard-code it.** The comment above states why:
  *"Two copies of an origin agree until one of them moves, and this repo moved hosts the
  same week this was written."* Use `new URL(path, site).href`.
- Throw on missing `site` so it is a build failure, not the string `undefined` in output.
- Return `text/plain; charset=utf-8`.
- A block comment that explains **why**, not what. This repo's files argue their own
  decisions and record rejected alternatives.

### The test to match — `tests/build-output.test.ts`

Inside `describe("dist/", ...)`, the very first test is the structural pattern:

```ts
it("emits a robots.txt that points crawlers at the sitemap", () => {
    expect(existsSync("dist/robots.txt")).toBe(true);
    const robots = read("dist/robots.txt");
    expect(robots).toMatch(/User-agent:\s*\*/);
    expect(robots).toContain("Sitemap:");
    expect(robots).toContain(new URL("sitemap-index.xml", METADATA.site_url).href);
});
```

Note `read` is a local helper — `const read = (p: string) => readFileSync(p, "utf8")` —
and `METADATA` is imported from `../src/content/site`, where
`site_url: "https://calvin.sg/"`. Note also this test file **does** use semicolons; match
the file you are editing, not the other file.

### The `Expires` field, and the repo rule that constrains it

RFC 9116 makes exactly two fields **required**: `Contact` and `Expires`. `Expires` must be
a single date-time after which the data should be considered stale.

**Do not compute `Expires` from the build date.** `astro.config.mjs` carries an argued
rule against build-date stamping, and its closing sentence is explicit:

> *"Whatever comes next, do not reach for `BUILD_DATE`: a nightly rebuild stamping today
> on four unchanged pages is the exact pattern that gets a feed's `lastmod` discounted
> wholesale."*

Beyond matching the house rule, a computed `now + 1 year` is *wrong on its own terms*: it
would push the expiry out on every rebuild, so the file could never expire, which defeats
the only thing `Expires` is for — forcing a human to periodically re-confirm that the
contact still reaches someone.

So `Expires` is a **hard-coded constant**, and a test turns its approach into a build
failure rather than a silent lapse. That is this repo's idiom: an assertion that has to
keep being earned.

## Commands you will need

| Purpose        | Command                              | Expected on success            |
|----------------|--------------------------------------|--------------------------------|
| Install        | `pnpm install`                       | exit 0                         |
| Build          | `pnpm build`                         | exit 0, writes `dist/`         |
| Tests          | `pnpm test`                          | exit 0, all pass               |
| Single test    | `pnpm test -- build-output`          | exit 0                         |
| Typecheck      | `pnpm check`                         | exit 0, no errors              |
| Lint           | `pnpm eslint`                        | exit 0                         |

Package manager is **pnpm** (`packageManager: pnpm@10.32.1`). Never `npm`.

## Scope

**In scope** (this repo — the only files you may create or modify):
- `src/pages/.well-known/security.txt.ts` (create)
- `tests/build-output.test.ts` (add one `it(...)` block)
- `plans/README.md` (status row only)

**In scope** (the OTHER repo, step 5 only):
- `calvindotsg/.github` → `SECURITY.md` (add one paragraph)

**Out of scope** (do NOT touch, even though they look related):
- `public/_headers` — the cache rule there covers `/_astro/*` only, and its comment says
  it is the only thing caching the site's assets. `security.txt` needs no cache rule;
  adding one risks pinning a stale contact.
- `src/pages/robots.txt.ts` and `src/pages/llms.txt.ts` — read them as patterns, change
  neither.
- `astro.config.mjs` — no config change is required; `.well-known` routing is built in.
- `dns/` — no DNS record is involved. `security.txt` is served over HTTPS from the
  existing origin.
- Anything to do with plans 031–034.

## Git workflow

- Branch: `advisor/035-security-txt`
- Conventional commits, matching `git log`. Recent examples from this repo:
  `chore: archive 030, and record the regression its review panel caught (#174)`,
  `test(ci): gate every workflow, not the one file each gate happened to read (#173)`.
- Commit per logical unit (endpoint + test can be one commit).
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the endpoint

Create `src/pages/.well-known/security.txt.ts`.

Required RFC 9116 fields: `Contact`, `Expires`. Also include `Preferred-Languages`,
`Canonical` and `Policy`. Field order does not matter to the spec; `Contact` first is
conventional.

Target shape — match `robots.txt.ts` style exactly (4-space indent, no semicolons):

```ts
import type {APIRoute} from "astro"

/**
 * `/.well-known/security.txt` — RFC 9116.
 *
 * <Explain WHY this exists: SECURITY.md is inherited by 40 repos and serves the human
 *  path; this is the machine-readable path scanners check first. Explain why EXPIRES is
 *  a constant and not derived from the build date, citing the astro.config.mjs rule.
 *  Explain why the origin comes from `site`. Follow the house style: argue the
 *  decisions and record what was rejected.>
 */

// RFC 9116 requires Expires. Hard-coded ON PURPOSE - see the note above. The test in
// tests/build-output.test.ts fails once this is within 30 days, so it cannot lapse quietly.
const EXPIRES = "2027-08-20T00:00:00.000Z"

const CONTACT = "mailto:security@calvin.sg"
const POLICY = "https://github.com/calvindotsg/.github/blob/main/SECURITY.md"

export const GET: APIRoute = ({site}) => {
    if (!site) throw new Error("`site` must be set in astro.config.mjs for security.txt to name its canonical URL")

    const body = [
        `Contact: ${CONTACT}`,
        `Expires: ${EXPIRES}`,
        "Preferred-Languages: en",
        `Canonical: ${new URL(".well-known/security.txt", site).href}`,
        `Policy: ${POLICY}`,
        "",
    ].join("\n")

    return new Response(body, {headers: {"content-type": "text/plain; charset=utf-8"}})
}
```

**Verify**: `pnpm build` → exit 0, then
`cat dist/.well-known/security.txt` → prints the five fields, with
`Canonical: https://calvin.sg/.well-known/security.txt`.

If `dist/.well-known/security.txt` does **not** exist after a successful build, that is a
STOP condition — see below.

### Step 2: Add the build-output assertion

In `tests/build-output.test.ts`, inside the existing `describe("dist/", ...)`, add one
`it(...)` block immediately after the `robots.txt` test. Match that file's style —
semicolons, `existsSync`, the local `read` helper, `METADATA` for the origin.

It must assert all of:

- `dist/.well-known/security.txt` exists
- it contains `Contact: mailto:security@calvin.sg`
- it contains an `Expires:` line
- the `Canonical:` line equals `new URL(".well-known/security.txt", METADATA.site_url).href`
- **the `Expires` value is more than 30 days in the future** — parse it with `new Date(...)`
  and compare against `Date.now()`. This is the gate that makes the expiry a build failure
  instead of a silent lapse. Write the failure message so it says what to do, e.g.
  *"security.txt Expires is within 30 days — confirm security@calvin.sg still reaches
  someone, then push the date in src/pages/.well-known/security.txt.ts"*.

**Verify**: `pnpm test -- build-output` → exit 0, all pass, and the new test is listed in
the output.

### Step 3: Prove the assertion actually bites

A test that cannot fail is not a gate. Temporarily edit `EXPIRES` in the endpoint to a
date in the past, e.g. `"2020-01-01T00:00:00.000Z"`.

**Verify**: `pnpm build && pnpm test -- build-output` → the new test **FAILS**, and the
failure message names the file to edit.

Then restore `EXPIRES` to `2027-08-20T00:00:00.000Z` and re-run:

**Verify**: `pnpm build && pnpm test -- build-output` → exit 0, all pass.

### Step 4: Full gates

**Verify**, all four, all exit 0:
- `pnpm check`
- `pnpm eslint`
- `pnpm build`
- `pnpm test`

### Step 5: Link it from SECURITY.md — DIFFERENT REPOSITORY

This step is in `calvindotsg/.github`, not this repo. Clone or open it separately.

In its `SECURITY.md`, immediately after the paragraph that begins **"If the Security tab
shows no "Report a vulnerability" button"**, add one short paragraph:

> Machine-readable contact details for the website are published at
> <https://calvin.sg/.well-known/security.txt>.

Keep it to one sentence. That file is inherited by all 40 `calvindotsg` repositories, so
every added line is served on 40 repos — this repo's own commit history treats
over-claiming there as a defect class in its own right.

Commit in that repo with a `docs:` conventional-commit subject.

**Verify**: `grep -n "well-known/security.txt" SECURITY.md` in that repo → one match.

**Do not** claim in SECURITY.md that the file is live until step 6 confirms it.

### Step 6: Confirm it is actually served (after deploy)

Only meaningful once the site has deployed.

**Verify**: `curl -sS -o /dev/null -w '%{http_code}\n' https://calvin.sg/.well-known/security.txt`
→ `200`. Then `curl -sS https://calvin.sg/.well-known/security.txt` → the five fields.

If this returns 404 while `dist/.well-known/security.txt` exists locally, the host is
dropping the dot-directory — report that; do not start reconfiguring the host.

## Test plan

- **One** new test in `tests/build-output.test.ts`, modelled structurally on the existing
  `"emits a robots.txt that points crawlers at the sitemap"` test.
- Cases covered: file emitted; contact address correct; `Expires` present; canonical URL
  derived from the configured origin rather than hard-coded; `Expires` not within 30 days.
- Negative case is proven manually in step 3 rather than committed — do not commit a test
  that asserts a past date.
- Verification: `pnpm test` → all pass, including 1 new test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` exits 0 and `dist/.well-known/security.txt` exists
- [ ] `pnpm test` exits 0; the new security.txt test is present and passing
- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `grep -c "calvin.sg" src/pages/.well-known/security.txt.ts` returns `0` — the origin
      is derived from `site`, never written down twice
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row for 035 updated
- [ ] In `calvindotsg/.github`: `grep -n "well-known/security.txt" SECURITY.md` → 1 match

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm build` succeeds but `dist/.well-known/security.txt` does not exist. The
  `.well-known` special case was verified in `astro@7.2.2`; if the installed Astro has
  moved, re-read `node_modules/astro/dist/core/routing/create-manifest.js` and report what
  it does now. **Do not silently fall back to `public/.well-known/` without saying so** —
  that changes which mechanism serves the file and needs a decision, not a workaround.
- The excerpt of `src/pages/robots.txt.ts` in "Current state" does not match the live file.
- Step 3 shows the test still passing with a past `EXPIRES` — the gate is not wired up.
- Any gate in step 4 fails twice after a reasonable fix attempt.
- You find yourself needing to change `astro.config.mjs`, `public/_headers`, or anything
  under `dns/`.
- Step 6 returns anything other than 200 for a reason you cannot explain.

## Maintenance notes

For whoever owns this next:

- **`Expires` is a live commitment, not decoration.** The test fails 30 days out by design.
  When it goes red, the job is to confirm `security@calvin.sg` still reaches a monitored
  inbox — check the Cloudflare Email Routing rule for `calvin.sg` still exists and its
  destination is still verified — and only then push the date.
- The address is currently served by an explicit Email Routing rule *and* by an enabled
  catch-all on the zone. If the catch-all is ever removed, the explicit rule is what keeps
  this working; if the explicit rule is removed, the catch-all silently covers for it. Do
  not assume removing either is a no-op.
- `Policy` points at `calvindotsg/.github`'s `SECURITY.md` on `main`. If that file is ever
  renamed or moved, this link breaks silently — nothing tests a cross-repo URL.
- A reviewer should scrutinise: that the origin is not hard-coded anywhere in the new file,
  and that the `Expires` test compares against a real parsed date rather than doing a
  string comparison.
- **Deliberately deferred**: signing the file with PGP (`Signature:` / a detached `.asc`).
  RFC 9116 permits it and does not require it; there is no published key for this identity
  today, and an unsigned file is strictly better than one pointing at a key nobody holds.
