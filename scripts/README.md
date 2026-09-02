# Scripts

**Three kinds of thing live here, and each arrived later than the last.** Most of this directory is
everything the site needs from Strava; then come the two that watch the origin the site is served
from; and one draws a share card. The first two kinds
are plain node or plain shell with zero dependencies, no TypeScript — because the workflows that
run them do so on GitHub Actions' preinstalled node with no `pnpm install` in front of them, and a
dependency would buy an install step on the paths nobody watches.

**The third kind breaks that rule and is the only thing here that does**, for a reason written out
under "Drawing a share card": it is invoked by hand, never by a workflow, and it imports from
`src/`, which no other script in this directory does at all.

Each file argues its own decisions at the line that makes them. This page is the part that
lives nowhere else: how they are invoked, what the nightly run does, and where the credentials
come from.

## Watching the origin

Neither of these is about Strava, and neither is invoked by hand as a chore. They exist because
this repository governed the artifact and nothing governed the origin — see
[`../dns/EDGE.md`](../dns/EDGE.md) for what that meant in practice.

**`scripts/origin-canary.sh`** — `scripts/origin-canary.sh <origin-url>`. Asks a live origin
whether the edge in front of it is still serving the artifact unmodified: no injected loader, no
rewritten script tags, every header the artifact declares, every published root file reachable,
and the card readable from a foreign referrer. It holds **no credential** and must not acquire
one; everything it reads is public, which is what lets
`.github/workflows/origin.yml` declare an empty permissions block. It has three answers rather
than two — clean, drifted, and *could not tell* — for the reason `dns/drift.sh` gives about the
last one. Its own header carries the two commands that verify it, including the control that
proves its assertions discriminate.

**`scripts/pages-retention.mjs`** — `node scripts/pages-retention.mjs [--delete]`. Classifies
every Cloudflare Pages deployment as keep or delete and prints the result; it removes nothing
unless handed the flag. This is the only thing in this repository that deletes something
permanently, so it fails closed in every direction — production is never touched, a pull request
whose state cannot be read keeps its preview, and a refusal fires immediately before the request
rather than restating the classifier. `.github/workflows/pages-retention.yml` binds the
irreversible half to the default branch.

## Drawing a share card

**`scripts/render-share-card.ts`** — a square PNG for a gym session, plus the description that
goes beside it. Two files out, nothing else: it makes **no network call and writes to no
platform**, and both surfaces are attached by hand.

```sh
pnpm card:render -- --demo specimen --out .scratchpad
pnpm card:render -- --session <file.json> --out <dir> [--px 2160]
```

| Flag | What it does |
|---|---|
| `--demo specimen` | draws the invented session `/design` shows. The only demo there is. |
| `--session <file>` | draws a session read from JSON, validated at the boundary |
| `--out <dir>` | where the two files go. Created if absent. Required. |
| `--px <n>` | the capture size. Defaults to 2160 — see below, this one matters. |

**Run it from the repository root.** The colour tokens and the type stack are read out of
`src/layouts/BasicLayout.astro` by a path relative to the working directory, so a run from
anywhere else would draw a card with no colours. The script checks and refuses.

**`--px` IS DECLARED, NEVER INHERITED.** A browser screenshots at the display's backing scale, so
the same command yields 2160 on a Retina Mac and 1080 headless — the same card at half the
resolution, soft in a feed, with nothing reporting it. The script sets the scale explicitly from
this flag and the card's own CSS size. The browser is found rather than pasted: set `CHROME_PATH`
to override, or it searches the Playwright cache and the two ordinary application paths and
throws with all of them named.

**IT REFUSES RATHER THAN SCRUBBING, AND IT REFUSES WHEN IT CANNOT CHECK.** A session binds free
prose out of a private training record, so both surfaces pass a leak gate before anything is
written. The protected-name list lives outside this repository and is git-ignored where it sits;
when it is absent the script says so and refuses, because "no names matched" and "nobody looked"
are different answers and only one is evidence. `tests/share-card-redaction.test.ts` carries the
mutation harness that proves the gate fires.

**IT IS THE ONE SCRIPT HERE RUN THROUGH THE TOOLCHAIN, AND THAT IS MEASURED RATHER THAN A
PREFERENCE.** Every module in the chain it imports uses extensionless relative specifiers and one
of them imports JSON bare, neither of which Node's ESM resolver handles — so `node` cannot run it
and `vite-node` can. **`vite-node` is not a dependency of this repository**: the `card:render`
script reaches it through `npx`, which fetches it on a machine that has never run this. That is a
deliberate trade — no workflow runs this script, so the alternative was a dependency on the
install path of everything that does.

## The Strava scripts

**`scripts/fetch-strava-progress.mjs`** — the bot. Fetches the athlete's year-to-date ride and
run totals and writes `src/data/strava-progress.json`, which `src/data/goals.ts` imports. The
workflow invokes it as `node scripts/fetch-strava-progress.mjs`; it has no `pnpm` script of its
own, because nothing about it is meant to be a local chore. It is fail-loud: any error exits
non-zero, the workflow goes red, and no file is written. `updated_at` in that JSON means *the
day the kilometres last moved*, not the day they were last checked, which is what lets an
unchanged run produce a byte-identical file. To bump a figure by hand, edit that JSON rather
than the goal; the target stays in `src/data/goals.ts` and caps the displayed figure.

**`scripts/fetch-strava-weeks.mjs`** — the bot's other half. Fetches one ISO week-year of the
athlete's activities and writes one module per week into `src/data/weeks/`, each holding that
week's sessions. Like the fetch above it has no `pnpm` script of its own and is invoked by the
workflow as `node scripts/fetch-strava-weeks.mjs`; `STRAVA_WEEKS_YEAR` names a year for a
backfill and is empty on every scheduled run.

It calls a **different endpoint** — `GET /athlete/activities`, not `GET /athletes/{id}/stats` —
because the totals endpoint returns totals and nothing else. Two consequences worth knowing
before editing it. First, it reads no athlete id: that endpoint is scoped to whoever the token
belongs to. Second, **a summary activity already carries the private fields** — an
athlete-authored title, a route polyline, start and end coordinates, a heart rate — so the
writer projects onto six named keys one at a time and never spreads. `src/data/weeks/README.md`
lists the six; `tests/training.test.ts` asserts the projection rather than the fixture.

It rewrites the **whole** week-year every run rather than tracking a watermark, which is two
requests and is the only shape that sees a retro-edited distance or a late upload. What pays
for that is byte-stability, exactly as it is for the totals: an unchanged year writes
byte-identical files and the commit step finds nothing staged.

**`scripts/scaffold-race.mjs`** — `pnpm race:add <activity-id> [<activity-id> …]`. Writes a
module under `src/data/races/` from the Strava activities a race was recorded as. One race,
however many activities it was recorded as; which ones belong together is the rider's call and
nothing can derive it. It is a scaffold and never a generator: it writes what the API knows and
leaves every other field **absent**, so `pnpm check` names each missing field on the module it
is missing from, instead of a placeholder that compiles and ships wrong.

**`scripts/strava-sync.mjs`** — `pnpm strava:sync`. Re-copies the refresh token from 1Password
onto the GitHub repository secret the bot reads. Dry by default; `-- --write` does it. The flag
is the point: `gh secret set` is an irreversible write to the credential an unattended nightly
job authenticates with, and the value it overwrites cannot be read back to compare or to
restore.

**`scripts/strava-auth.mjs`** — not invoked directly. It is the one place anything in this
repository gets a Strava access token, imported by the others, and it holds the credential
model described below.

## The nightly run

`.github/workflows/strava-progress.yml` runs **both** fetches on a cron at 21:13 UTC — 05:13 in
Singapore, after a full Singapore day, and off the top of the hour to avoid GitHub's peak
scheduling delays. It writes `src/data/strava-progress.json` and `src/data/weeks/`, commits
whatever moved, and asks `.github/workflows/ci.yml` to build and deploy.

**One job, not two, and that is the decision.** The two scripts read one account at one moment,
seconds apart, so a new upload lands in both files or in neither — which is what lets a gate
hold the weekly sessions against the year total they are published beside. Two workflows would
be two pull requests a night racing the same protected branch, and a night where one merged and
the other did not would leave `main` carrying weeks that do not sum to their own year.

**The commit guard stages first and then tests the index**, rather than diffing one path. Both
halves of that matter: the staging has to reach a directory rather than a file, and `git diff`
cannot see an untracked file at all — so the older `git diff --quiet -- <path>` spelling would
have reported "no change" on the very night a brand-new week module appeared. `git add -A` also
stages a *deletion*, which is what carries a week whose Strava activities were all deleted out
of the repository.

**The commit reaches `main` through a pull request the run opens and merges itself**, on a
branch called `bot/strava-progress` that is reused every night and force-pushed each time. That
is not a preference: `main` requires one. The repository's baseline settings arrived from
`calvindotsg/.github` on 2026-08-21 and the nightly died on the next run with `GH006: Protected
branch update failed … Changes must be made through a pull request`. So a night that moves the
kilometres now leaves a merged pull request behind it, and the pull request is the audit trail —
its description carries the run that opened it. A night whose merge fails leaves that pull
request OPEN, which is the recovery path rather than a mess to clean up: the next run
force-pushes over the branch and merges the pull request that is already there. The workflow's
own comment holds the whole argument, including the one setting that would deadlock this and
why it cannot clear itself.

**The run uses two identities, and which one acts where is deliberate.** The ambient
`GITHUB_TOKEN` does everything except two calls; a GitHub App token pushes the branch and opens
or updates the pull request. Two reasons, and only the first is about permission:

- **The ambient token is refused outright at `gh pr create`.** The repository setting
  `can_approve_pull_request_reviews` governs whether GitHub Actions may *create* a pull request as
  well as approve one — the field name says only half of it — and with it off the run dies on
  `GitHub Actions is not permitted to create or approve pull requests`. No `permissions:` block
  can grant round it, because the setting scopes the ambient token itself.
- **Nothing done with `GITHUB_TOKEN` triggers a workflow run.** So a pull request it opened, and a
  branch it force-pushed, would carry commits that `ci.yml` never sees — which is fine while
  nothing gates the merge and fatal the moment something does. The App is a different identity and
  its events are not suppressed, so the pull request builds like a human's.

**The merge stays on the ambient token for the opposite reason.** A merge it makes triggers
nothing, so `main` is not rebuilt behind this workflow's back and the dispatch below remains the
single deploy. Were the App to merge, `ci.yml` would fire on that push *and* on the dispatch — two
production deploys of one commit, which `ci.yml`'s own header explains can publish the older of
two same-day artifacts.

The credentials are `BOT_APP_CLIENT_ID` (a repository variable) and `BOT_APP_PRIVATE_KEY` (a
secret), and they are
they are the App `calvindotsg-release` — the same one `mac-upkeep` runs release-please on, under
its own names. **1Password holds the source of truth for both**, exactly as it does for the Strava
credentials below, because a GitHub secret cannot be read back and so can be compared with
nothing. Rotating the key means writing 1Password first and then re-copying to *both*
repositories; nothing notices one being left behind.

Outcomes in its log that read like failures and are not:

**A run that commits nothing is the ordinary outcome.** Both scripts re-read their whole
subject every time rather than tracking what they last saw — the year-to-date totals in full,
and the whole week-year — so when nothing has moved they write byte-identical files, the commit
step finds an empty index, and there is nothing to push. That gate is the only thing standing
between this repository and a commit-merge-deploy every night, which is why `updated_at` has to
survive an unchanged run: a freshly stamped date would make the file differ by construction and
the gate could never fire. **A rest day still moves nothing and a gym session still moves
something** — the year totals count only rides and runs, but every session reaches its week
module, so a night can commit a week and no kilometre at all. The commit subject names which.

**The deploy is dispatched either way.** The last step carries `if: '!cancelled()'`, so it runs
on success and on failure and stops only on a cancel. It exists because nothing done with
`GITHUB_TOKEN` triggers a workflow run — GitHub suppresses it to stop recursion, and that is a
rule about the identity acting rather than about the act, so the merge is suppressed exactly as
the direct push it replaced was — so the commit reaches `main` and, on its own, nothing builds.
It is independent of whether
anything was committed because the site has a clock as well as a distance: `BUILD_DATE` in
`src/lib/today.ts` feeds the countdown, `patchState`, `patchWall` and `nextRace`, and every one
of those turns over at Singapore midnight whether or not the owner trained. Firing only on a
commit froze the home page's countdown for as long as the owner rested. A failed fetch or a
failed merge must not cost the day's build either: the dispatch names a ref, so CI checks out
`main` and builds whatever is on it, and the runner's own checkout never reaches the deploy.

The dispatch step does not wait for the run it asks for. Green there means the build was
*asked for*, never that it passed; read the CI run itself for that.

**A second CI run on the bot's own branch is expected, and is not the deploy.** Because the App
opens the pull request, `ci.yml` runs on it like any other — which is the point, since that is
what a required status check would read. It builds the *branch*: `deploy-production` tests
`github.ref` and skips, so it cannot publish. What it does leave behind is a preview deployment
every night the kilometres move, which is what `.github/workflows/pages-retention.yml` clears.

## Asking for a run on demand

The schedule does not use up the day. The workflow takes `workflow_dispatch`, so a run can be
asked for at any time and as often as you like — the **Run workflow** button on the Actions
tab, or:

```bash
gh workflow run strava-progress.yml --ref main
```

There is no cooldown and nothing to reset. That is the answer to "I rode after this morning's
cron".

## Which values are variables, and which are secrets

The split follows this test: **does the value ship publicly?** — not "does it feel private".

| Name | Kind | Why |
|---|---|---|
| `STRAVA_ATHLETE_ID` | Repository **variable** | Public on the site's own Strava links |
| `STRAVA_CLIENT_ID` | Repository **variable** | Public by protocol — it is a query parameter of the OAuth authorize URL, so anyone who has connected the app has already seen it in their address bar |
| `STRAVA_CLIENT_SECRET` | Repository **secret** | It authenticates |
| `STRAVA_REFRESH_TOKEN` | Repository **secret** | It authenticates |

Storing a public value as a secret costs something real and buys nothing. GitHub masks it, so
it prints as `***` exactly when you are trying to read what the job sent, and a secret cannot
be read back at all, which makes drift against the 1Password copy undetectable.

The scripts hold no configuration of their own. Every name above arrives in the environment:
from the repository's variables and secrets in CI, and from `.env.op` locally.

## 1Password is the source of truth; the GitHub secrets are a copy

That reads backwards until you notice that a GitHub secret cannot be read back. It can be
compared with nothing and recovered from nothing, so the readable store — the
`calvindotsg-strava` item — is the only one that can be authoritative.

What follows from it:

- Only a caller that can reach 1Password may **change** either credential.
- It writes 1Password **before** re-copying to GitHub. A GitHub secret written first is a
  credential whose only readable copy is already stale, which is the state this whole model
  exists to prevent.

`scripts/strava-auth.mjs` is where both rules live. Strava may return a new refresh token on a
refresh, and the old one is spent the moment it does — so the script compares rather than
assumes, and when it sees a rotation it persists it: 1Password first, then the GitHub copy.

**When it cannot persist a rotation it writes nothing and throws.** CI is that case by design.
The runner cannot reach 1Password, and the refusal is deliberate rather than incidental: a
workflow that gained the 1Password CLI would be able to write the truth from a context nobody
watches. A rotation there kills the chain in **both** stores at once — the token in the GitHub
secret and the token in 1Password are each spent — and a sync would then push a dead credential
over a dead credential. Recovery is a fresh OAuth authorize against the Strava app by hand, and
only then `pnpm strava:sync -- --write`. Do not sync first.

That is the accepted cost of a static-secret posture, not a gap in it. The alternative — letting
CI write its own credentials — buys a self-healing chain and pays for it with a secret-writing
path that runs unattended every night. So CI fails loudly on the day it happens, which is the
only day the message can still be useful.

The client secret has no re-copy tool, because nothing rotates it: it changes only when a
person changes it in the Strava app, and then both stores are updated by hand.

Locally, a locked 1Password does not announce itself. The command hangs for about a minute
waiting for a desktop approval nobody gave and then fails with `authorization timeout`, which
reads like a network or account problem. Unlock the desktop app and run the command again;
nothing here retries.

## `.env.op` holds references, not values

Every credential line in it is an `op://` address, which is why the file is committed. An
address is not a secret — reading it needs an authenticated 1Password session that the file
cannot supply — and `.gitignore` ignores `.env*` but negates this file by name, so it is
committed on purpose rather than by omission. The wildcard replaced a list of three exact
names that missed the five filenames Astro and Vite's own `.env.[mode]` convention produces;
the negation is what keeps the reference file itself committable, because the credential path
has to be discoverable at all.

`op run --env-file=.env.op -- <command>` resolves each reference and hands the command the
secret in its environment, so no Strava credential is ever written to disk here or pasted into
a shell:

```bash
# Scaffold a race module from the Strava activities it was recorded as.
op run --env-file=.env.op -- pnpm race:add 12058884605 12058885236

# Re-copy the refresh token from 1Password onto the GitHub secret. Dry by default:
# this prints the plan and touches nothing.
op run --env-file=.env.op -- pnpm strava:sync

# Do it, then spend the credential once to prove it is live. That is the only
# verification that exists — nothing can read a GitHub secret back to compare it, so
# whether GitHub holds those same bytes is proved by the next bot run and by nothing
# in this repository.
op run --env-file=.env.op -- pnpm strava:sync -- --write

# Hold every recorded row in EVENTS against the activity it names. Opt-in, because
# `pnpm test` is the change gate and a network call in the default run would hand
# Strava a vote on whether this repository can deploy.
op run --env-file=.env.op -- env STRAVA_VERIFY=1 pnpm vitest run tests/strava-verify.test.ts
```

`.env.op` also carries, as plain values rather than references, which 1Password item is the
truth and which repository holds the copy. Those are addresses rather than credentials, and
they are read only on the paths that **write** a credential — `pnpm strava:sync`, and the
rotation branch in `scripts/strava-auth.mjs`. A process that lacks them cannot persist a
rotation, which is the correct behaviour in CI and is why they are supplied here and nowhere
else.

## The athlete id has more than one sanctioned home

It appears in the repository's configuration and in its content, doing different jobs. The
`STRAVA_ATHLETE_ID` repository variable decides *whose kilometres* are fetched;
`STRAVA_PROFILE_URL` in `src/content/site.ts` decides *where the site's Strava link goes*.
Changing accounts means editing both. Updating only the variable publishes the new athlete's
distances while the link still points at the old profile, and nothing in the build or the suite
can catch that.

## Recording a race you have just run

There is an ordering hazard, and it belongs to the race procedure rather than to this workflow:
whether you fetch first or write the module first depends on whether the race is already
listed, and taking the wrong arm counts the race's distance twice.
`src/data/races/README.md` has the rule, both of its arms, and the measurement. Read it before
doing either.
