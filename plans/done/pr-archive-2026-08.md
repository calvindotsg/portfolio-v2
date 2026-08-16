# Pull request archive — August 2026

39 pull requests. Bodies and comments as they stood on 2026-08-16, the day `portfolio-v2` left its fork network and the originals stopped resolving. Index and rationale: [`pr-index.md`](pr-index.md).

Netlify deploy-preview bot comments are omitted. Nothing else is edited: bodies and comments are verbatim, including their own broken cross-references.

---

<a id="pr-116"></a>

## #116 — feat(events): add the back catalogue, close the double count, and round km from the API

`merged` · opened 2026-08-02 by **calvindotsg** · merged 2026-08-02 as `3ea25e743` · `worktree-events+back-catalogue-and-riba-recording` → `main` · +537/−142 across 9 files

## Summary

Five completed races added, a change of rule for what `km` means, and the test and prose
changes both force. Eleven commits, 9 files, +537/−142. Every figure re-derived from `8435433`,
after a 14-agent review panel (verdict table in the comment below).

| Date | Race | km | Country | Elapsed | Activity |
|---|---|---|---|---|---|
| 2022-12-04 | Standard Chartered Singapore Half Marathon | 22.45 | Singapore | 3:44:25 | `8204481233` |
| 2024-08-04 | Pesta Sukan Round Island Bike Adventure | 117.41 | Singapore | 5:53:34 | `12058885236` |
| 2025-12-14 | OCBC Cycle Johor Bahru | 78.60 | Malaysia | 7:40:25 | `16736512210` |
| 2026-05-09 | OCBC Cycle Singapore Virtual Ride | 130.03 | Malaysia | 8:14:15 | `18433212592` |
| 2026-08-02 | Pesta Sukan Round Island Bike Adventure | 160.57 | Singapore | 10:56:17 | `19566067972` |

Three rows already on the calendar also move, because the rule changed under them: the
Garmin virtual run `10.00 → 10.17`, 10 July `160.59 → 140.50`, and 12 July `158.13 →
158.10`. `EVENTS` is 11 rows; the wall is **11 bibs — 8 anchors, 3 outlines, 7 cycling,
4 running**.

## Problem

**The live site double-counts the 2 August ride.** `strava-progress` was dispatched first
and banked it (2279.7 → 2440.3 km ride), while the race sat in `EVENTS` with no recording —
and `bookedAhead` books a race while `today <= start`, which on its own start date it was.
The deficit came off both ends, in the flattering direction. `curl https://calvin.sg/`
right now returns **66 km/wk** on the cycling card; the honest figure is **71**. Merging
closes it.

Separately, `km` had **no doc comment**, and the rule it followed — always the event's
advertised distance — was recorded only indirectly, inside a paragraph about elapsed time.
It was also the wrong rule for this site: the bib links to an activity, so it should print
that activity's figure.

## Solution

- The recording on the 2 August row, which is what `hasRecording` reads to take the race out
  of `bookedAhead`.
- Five back-catalogue rows.
- **`km` is now the linked activity's distance**, with the rule written on the field. Where a
  race has no recording it can only be the event's distance, which is what every booked race
  carries.
- **No exception for a split recording.** 10 July was carved out first, on the grounds that
  its day holds two activities (a 22.56 km escort plus the 140.50 km ride) so no single
  recorded distance exists. That was the wrong reading and the carve-out is gone: the row
  already names ONE activity, and that activity has a distance.

**This is display-only, verified rather than assumed.** Every row whose `km` moved carries a
recording, so `bookedAhead` skips it and no projection reads its distance. Required rates
re-read after every change — still 17 and 71.

## Three things this PR got wrong and then fixed, which are the parts worth reviewing

### 1. It drew a Finisher Patch for a race that was not finished

RIBA 2023 is a **DNF** — the maintainer exceeded the cut-off and did not complete the route.
The row had a recording, so `patchState` derived `finished` and the wall rendered a solid
patch, against the page's own lede ("every one I finish becomes a Finisher Patch") and the
definition in `CLAUDE.md`. A DNF is neither an earned patch nor a booked outline, and the
model has no third state, so **the row is out** rather than shipping a false claim.

Nothing in the projection moves — 2023 is not in `GOAL_YEAR` — which is the whole reason the
row could be dropped without touching a pinned figure.

The wall now omits a race he entered, which contradicts its own scope. That is the smaller
of the two lies and it is deliberate: closing it needs a real third bib state (a stored
outcome, a third `patchState`, a treatment carrying the word, `patchesEarned` excluding it)
under the geometry and contrast gates. Handed over in
`.scratchpad/handover-dnf-bib-state.md` with the data and the design already worked out.

The same row is also a **split recording** — `9593519661` (87.42 km) plus a rider-titled
"RIBA 2023 2/2" (22.61 km) seven minutes later, 110.04 km over 13:14:12 in total. One
`strava_activity_id` cannot express that, and summing it would make the bib print an
aggregate while linking to one part — the exact mismatch the `elapsed_time` note exists to
prevent. `km`'s comment now records that a race like that **cannot be entered correctly
yet**, rather than implying the short row is fine.

### 2. `km` was TRUNCATED for four commits, with a persuasive story, and the story was the problem

The rule is metres **rounded half-up**, on the maintainer's instruction and because the API is
the source of record. Four rows move: `78.59→78.60`, `140.49→140.50`, `10.16→10.17`,
`160.56→160.57`.

The truncation story was that Strava's page truncates, so truncating means a reader following a
bib's link sees the digits the bib showed them. **I then replaced it with an equally shaky story
in the other direction** — "the page does NOT truncate", on one unreproducible reading — and the
review panel took it apart. Measured: Strava's *embed* renderer truncates on **5 of 5**
discriminating activities (`78595.0 m → 78.5`, `140498.0 → 140.4`, `10166.6 → 10.1`,
`160566.0 → 160.5`, `22558.8 → 22.5`), with three imperial readings agreeing. The activity page
itself cannot be read without the owner's session.

So the rule is unchanged and now rests on nothing that needs a renderer. What is in the comment
instead:

- **A conversion rule is not settled until you have a case where the candidates DISAGREE.**
  Three of the four rows originally cited as evidence give the same answer either way.
- **A rule that arrives with its own rationale is harder to re-open than a bare one.** That is
  what let truncation survive a review — and then I did the same thing to its replacement.

### 3. I "corrected" a true finding into a false one

An intermediate commit softened *"the activity was edited between the screenshot and the
fetch"* to *"the figure matches no recording on that day"*, because 13:36:10 matches neither
of that day's activities nor their sum nor their span. That reasoning has a hole — a
pre-edit value has no obligation to be consistent with anything that survived the edit.

The original finding stands, and the evidence is specific: screenshot 13:36:10 / 6:31:11
moving / 433 m, API an hour later 10:47:28 / 5:54:53 / 468.5 m, **distance unchanged at
87.42 km** — the most a screenshot can witness, and enough to identify a re-process rather than a
crop, since a crop of that size moves a 2dp distance. The note now carries the before/after fields
rather than the conclusion alone, which is what would have stopped me re-litigating it.

## The Strava API is the source now, and a suite holds it

`tests/strava-verify.test.ts` (new, opt-in) reads every `EVENTS` row that names an activity
and holds it against that activity over the API: distance, elapsed time, and that it was
recorded on the race's own day. **It passes on all 8 recorded rows**, including after the
rounding change.

Opt-in for a load-bearing reason: `pnpm test` is the change gate and both deploy jobs sit
behind it, so a network call in the default run hands Strava — or a flight's wifi — a veto
over deploying this site. `describe.skipIf` keeps it out unless `STRAVA_VERIFY=1`, which is
why the run reports one skipped file.

### The logged-out page cannot verify every id — measured

The old technique was to fetch an activity's page while logged out and read the race name out
of the title. That works for `everyone` visibility. One of the shipped activities is
`followers_only` (it was two until the DNF row came out), and its logged-out page answers **307
with a 14-byte body** — no page, no title, nothing to read. So the id that most needs an
independent witness is exactly the one the old technique cannot check, and the API is its only
witness. Note the 307 alone proves nothing: a *nonexistent* id answers identically, which a
skeptic on the panel demonstrated against a control I had built without one.

### 4. The new gate could not fail on the error its own comment promised

Found by the panel's method dimension, in code added by this PR.
`expect(e.km).toBeCloseTo(km2(d.distance), 2)` passes whenever the gap is under 0.005 — and
`|m/1000 − round(m/10)/100|` is at most 0.005 **by construction**. So a `km` pasted straight from
the API as raw metres over 1000 was green in the verifier *and* in the full suite, while shipping
`160.566 km` to `llms.txt` and `160.57` to the bib: two surfaces, one row, different distances,
everything green.

Now `toBe`. Mutation battery rather than trust: the raw-metres paste goes **RED** (it was green
before the fix), a truncated figure RED, a wrong elapsed time RED, and a harmless comment reword
stays **GREEN** — the negative control is what makes the other three mean anything.

## Known limitation shipped deliberately: RIBA 2024 is a split race

The maintainer confirmed that ride broke a bike, was repaired at a shop and finished — and that
both recordings are the race. Its true figures are **135.32 km / 10:05:34** (17908.4 + 117411.0
metres; 06:41:25 → 16:46:59). The row ships **117.41 / 5:53:34**, the second recording only,
because one `strava_activity_id` cannot express a race in two parts and summing it would make the
bib print an aggregate while linking to one part.

That is recorded on `km` in place, and handed over rather than half-built:
`.scratchpad/handover-split-race-recordings.md`. Same treatment as the DNF row, and the two are
sequenced split-first — restoring RIBA 2023 before the split model exists would put an 87.42 km
figure back on a 110.04 km race.

## Test Plan

- `pnpm test` — **14 passed | 1 skipped files, 410 passed | 4 skipped tests**. `pnpm check` —
  0 errors, 0 warnings, 2 pre-existing hints. `pnpm eslint` — clean.
- **The opt-in verifier against the live API**: 1 file, 4 tests, passing on 8 rows.
- **Read the rendered distances out of `dist/`**, not out of the source: all 11 bibs print
  two places, and the DNF row is absent from `/patches` and from `llms.txt`. Note the bib
  splits the number across two elements (`140` + `<span class="bib-fraction">.50</span>`), so
  a contiguous grep for `140.50` finds nothing — my first probe returned zero for that reason
  and the calibration is in the commit trail.
- **Calibrated the new llms.txt row key** rather than trusting it green: mutating the endpoint
  to emit a wrong distance, and to divorce a race from its date, each turns it red.
- **Every arithmetic claim re-derived by an independent implementation** — `bookedAhead`,
  `daysRemaining` and `goalStatus` reimplemented in Python, agreeing on all six pinned
  figures, on 150-of-290, and on both ends of the 66-vs-71 double count.

## What moved in the tests, and why each is a rewrite rather than a literal bump

- `bookedAhead("cycling", …)` → the November tour alone: 1143.98 → 1022.00.
- Required rate at the pinned stamp: 70 → 76 km/wk. A race being *recorded* moves this as
  surely as a ride does, in the opposite direction.
- **The two dates in the round-UP test swapped roles.** A changed numerator changes the
  fractional part of every rate: 27 July is now where `round` under-states (75.2411, round 75
  delivers 1692.86 against 1698.30 needed) and 28 July the date that cannot tell `ceil` from
  `round`. Re-measured its companion claim: 150 of the 290 remaining sport-days, not 154 of 288.
- The single-day booking pairing moved to a **running** race. It needs a single-day event with
  no recording, and every un-recorded cycling race is now the multi-day tour, which moves pro
  rata instead of dropping whole. That property became *inexpressible* for cycling rather than
  merely wrong, which is why the fix is a different subject and not a new number.

### A class defect, fixed separately (first commit)

`build-output.test.ts` keyed each llms.txt row by `event.name`. With two same-named editions
`.find()` returns the first for both, so assertions compare one year's row against another
year's facts — **red on correct data, and green on an endpoint that had genuinely separated a
race from its distance**. `patch-wall.test.ts` records fixing the same `.find()`-on-a-name
defect in its own helper; this one survived because a name-keyed lookup is silently wrong
rather than absent, so no failure points at it.

### Prose swept twice

The first pass fixed the places that NAMED the round-island race. The second (`7c38fe1`)
fixed the places that quoted a NUMBER derived from it, which is the harder half: a name is
greppable and a figure is not, and every one of these reads as settled fact.

- `goalStatus`'s ceil rationale exhibited 2026-07-28 as the date where `round` under-states.
  On today's data round and ceil **agree** there, so the example had stopped demonstrating
  the rule it exists to justify — and a reader following that file's own instruction to
  "re-derive them before quoting one as current" would have concluded round is fine. The
  source and `tests/projection.test.ts` had drifted into disagreeing.
- The fetch-first hazard was quoted at "67 km/wk against an honest 73". That was a
  *simulation* run before the ride, off the advertised 121.98 km. The ride came in longer than
  the route, so when the hazard actually happened it produced **66 against 71**. Same figure
  in `CLAUDE.md`.
- `elapsed_label` justified itself with a gap of "9 km/h". Nine was the old event-scope
  arithmetic; with both figures off one activity the gap is **11.27**.
- Two counts that die with the data became rules: the heading note's "four booked outlines
  beside two earned bibs", and patch-wall's "these six races".

**None of these were catchable by a gate**, by design rather than omission — measurement and
rationale are ungated everywhere, which is what lets them state a fact worth reading. The
cost is that they rot silently, and a figure inside a `because` clause is load-bearing when it
does.

## Notes

- `strava_activity_id` stays **optional**. Requiring it on completed events would forbid a race
  remembered without a recording, and would turn the morning after any race into a red deploy.
- **Open question for the maintainer:** only 2023 was called a DNF. The 2024 round-island row
  is 117.41 km where the 2026 edition rode 160.57 — worth one confirmation that it was a
  completion.
- `preview.jpg` is further out of date now the home figures have moved. It was already stale on
  `main`; not touched here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-08-02

## Review panel — 14 agents, ~1.19M subagent tokens, ~23 min, at `b823229`

5 finder dimensions → one cold-started adversarial skeptic per finding (capped per dimension),
plus two controls planted in the **skeptic** tier. 15 findings raised, 7 verified, 6 stood.
Fixes in `8435433`.

### The instrument first, because it decides how much the rest is worth

| control | expected | got |
|---|---|---|
| `ctl-false` — "the opt-in Strava suite runs in CI, so the deploy depends on Strava" | REFUTED | **REFUTED** ✅ |
| `ctl-true` — "two linked activities are `followers_only` and answer 307/14 bytes" | STANDS | REFUTED ❌ |

**My known-true control was not true, so the calibration is void in that direction — my fault,
not the panel's.** I wrote it against the pre-DNF-drop tree and relaunched the panel at a HEAD
where only *one* row is `followers_only`. The skeptic caught that, and went further: it showed
the probe I built the control on does not discriminate at all, because a *nonexistent* id
(`99999999999999`) also returns `307` with a 14-byte body. So "307 + 14 bytes" was never evidence
of `followers_only` — it is Strava's redirect for anything not publicly viewable.

What survives: the agreeableness direction is tested and clean — a plausible, well-argued false
finding was killed by measurement rather than ratified. The reflexive-refuter direction is
untested, so I adjudicated the one refutation myself (below).

Lesson recorded: **a planted control must be re-validated against the HEAD the panel actually
reviews.** Mine went stale between drafting and launch because I dropped a row in between.

### Confirmed and fixed

| # | Dim | Sev | Finding | Resolution |
|---|---|---|---|---|
| 1 | method | **major** | `toBeCloseTo(km2(…), 2)` tolerates 0.005, and `\|m/1000 − round(m/10)/100\|` is ≤ 0.005 **by construction** — so a `km` pasted as raw metres over 1000 was green here *and* in the full suite, while shipping `160.566 km` to llms.txt and `160.57` to the bib | `toBe`. Battery: raw-metres paste RED (was GREEN), truncated RED, wrong elapsed RED, harmless reword GREEN |
| 2 | rounding / data / argue-against *(3 dimensions converged)* | **major** | `km`'s worked example still carried `22.55 / 140.49 / 163.04` — the truncated values this PR exists to retire — three lines above the corrected copy of the same day | Rewritten; the two split-day shapes separated |
| 3 | argue-against | **major** | "no exception for a split **recording**" collides with the split-RACE case it must not license | Now "split **DAY**", with the race-in-parts case stated as a known gap |
| 4 | argue-against | major *(inflated)* | `projection.ts`'s header read `122 → 71 / 42%` and `65.99 < 70.28 < 76.72`; the data change made those `122 → 76` and `62.30 < 75.72 < 76.72` | Re-pinned to the stamp **the tree carries** (2026-08-02 / 2440.3) so all six re-derive from the checked-out repo: `118 → 71`, 40%, `60.55 < 70.82 < 79.82` |
| 5 | data | minor *(inflated)* | `country: "Malaysia"` on a Singapore-branded virtual ride is undocumented | One paragraph on `country`. **The skeptic refuted the proposed remedy** — changing it to Singapore would ship a false fact; the ride was in Johor Bahru |
| 6 | rounding | — | The rounding justification asserted "the page does NOT truncate" on one unreproducible sample | See below |

### The one refutation, adjudicated — and it was half right

The finder claimed Strava truncates, so the reversal to rounding was wrong. The skeptic killed it
on the grounds that the evidence came from `strava-embeds.com`, a 1-dp surface no reader of this
site is ever sent to, while both disputed readings are 2 dp.

**I reproduced the embed readings myself and the skeptic's kill only half holds.** The embed does
truncate — 5 of 5 discriminating activities, `78595.0 m → 78.5`, `140498.0 → 140.4`,
`10166.6 → 10.1`, `160566.0 → 160.5`, `22558.8 → 22.5`, plus 3 imperial readings — so the
*conclusion* ("revert to truncation") is correctly refuted, but the *sub-claim* that my comment
overstates its evidence is true and shipped. The skeptic's own `harness_doubt` said as much.

**The rule is unchanged** — `km` is the API's metres rounded half-up, which rests on the API being
the source of record and on the maintainer's instruction, not on any renderer. The sentence
claiming the page rounds is gone, and the embed measurement is recorded in its place. Having just
written that *a rule with a persuasive rationale is harder to re-open than a bare one*, I attached
another shaky rationale to its replacement. Twice in one change.

### Also fixed — found by the dimension my cap silenced

`argue-against` returned **8 findings and my per-dimension cap verified only 2**, which is exactly
the mistake my own notes warn about. I checked the other six by hand; four were real and are fixed
in `8435433`: `patch-wall.test.ts` still cited the `9 km/h` that became 11; the fetch-first note's
"6 km/wk" no longer derived from its own figures (5); "two of these rows are `followers_only`"
became one when the DNF row left; "unchanged to the centimetre" claimed precision a 2-dp
screenshot cannot witness. A fifth — the `bookedAhead` comment crediting *recordings* for excluding
the 2024 edition, when it is excluded by **year** — came from the same list.

### Not fixed, disclosed instead

- **`deploy` returned nothing.** I verified that negative myself rather than accept silence: the
  suite is collected and skipped (`1 skipped` file), `beforeAll` never runs disabled — proved with
  a positive control, since arming it without credentials exits 1 — and no workflow sets
  `STRAVA_VERIFY`.
- **The wall's meta description still reads "Every race Calvin has entered…"** while RIBA 2023 is
  deliberately withheld. Left alone: it is the maintainer's copy, and the claim's precision has
  always depended on `EVENTS` being complete — this PR takes it from 6 rows to 11.


---

<a id="pr-117"></a>

## #117 — feat(patches): let a bib tell the truth about a race recorded in parts

`merged` · opened 2026-08-02 by **calvindotsg** · merged 2026-08-02 as `bce04d95a` · `worktree-split-race-recordings` → `main` · +948/−108 across 9 files

## Summary

`strava_activity_id?: string` asserted that a race has at most **one** recording. That is false for two of the round-island rides, so the 2024 row shipped carrying only its post-repair activity — **117.41 km of a 135.32 km race**, under-reporting it by 17.91 km and about four hours.

This replaces the field with `recordings: readonly Recording[]`, and gives the bib a shape that can say so.

## Problem

| | |
|---|---|
| `12058884605` | 06:41:25 → 08:10:06 · 17908.4 m · 1:28:41 |
| `12058885236` | 10:53:25 → 16:46:59 · 117411.0 m · 5:53:34 — **the only one on the wall** |
| the race | 06:41:25 → 16:46:59 · **135.32 km** · **10:05:34** |

The arithmetic was never the hard part. A bib printing the aggregate while linking to **one** part sends a reader to a smaller number — the mismatch `elapsed_time`'s note exists to prevent, one layer up. Strava [cannot merge activities](https://support.strava.com/en-us/articles/15401839-merge-or-combine-activities), so no URL is the whole race, and anchors do not nest.

## Solution

**A bib is the link when there is one place to go; when there is more than one, the bib holds the links.**

A split bib's stub carries one line per recording, each printing that part's own distance and clock, so no link promises the bib's hero. The lines carry **figures and no words** — a shared label repeated per recording is information at two parts and noise at four — with the destination and race name in the accessible name instead.

- `km` is the summed **metres** converted once (135319.4 m; truncating gives 135.31, so this row discriminates), never the sum of the parts' printed figures.
- `elapsed_time` is first start to last stop, never the sum of the parts (7:22:15): elapsed already contains stops, so it must not depend on where the rider pressed the button.

**A one-recording bib is untouched, and that is the design rather than a shortcut.** Delegating on every bib was drawn and rejected: it would give all eight the same accessible name — eight links reading "View on Strava" to eight different races, an SC 2.4.4 failure — and shrink a 260×188 target to a 24px row on races with nothing wrong with them. You mark the exception, not the norm.

### Two things measured, not reasoned

Both were wrong in the first draft:

- **The focus outline changes surface.** The bib's own paints *outside* the bib and clears the card at 6.52:1 / 12.55:1. A stub's paints *inside* the inverted face, where `--accent` is **2.77:1** and **1.37:1** — both under SC 1.4.11. Drawn in `currentColor` instead, measured at **18.09:1** on the built page in both themes.
- **The stub is a target where the whole bib used to be one.** It renders 24.59px against SC 2.5.8's 24px, and two lines sit adjacent with no gap — so the spacing exception is *arithmetically identical* to the size rule (centre-to-centre distance **is** the row height) and can never rescue it. The floor is declared with a font-relative `min-height`.

## Test plan

- `pnpm test` — **411 passed | 6 skipped** (from 410 | 4). `pnpm check` 0 errors, `pnpm eslint` clean.
- The anchor assertion in `patch-wall.test.ts` is now a three-way exhaustive equivalence (none / exactly one / more than one), and each branch asserts the others' markup is **absent**, so a bib cannot satisfy it wearing both shapes.
- New: each recording's figures held to the shapes the bib prints them in, and a single recording must agree with its race — the redundancy that stops the two drifting.
- Activity-id uniqueness now holds **across** the arrays, not only between rows.
- `strava-verify.test.ts` (opt-in) gains two assertions the one-id model could not express: the race's `km` against the **summed metres**, and its `elapsed_time` against the **span**. Before this, a race recorded in two files was verified against one of them and the other half went unseen.

### Verified on the built page, not just green

- 7 linked bibs unchanged, all still `<a>`; 1 split bib as a `<div>` with 2 links.
- Distinct accessible names: `17.91 km 1:28:41 on Strava, Pesta Sukan… (opens in a new tab)` and the same for `117.41 km 5:53:34`.
- Split lines exactly **24.00 × 237.59px**; no ink escapes any bib; no horizontal document scroll.
- Exactly **one** perforation per bib — the device does not repeat per line.
- Required rates still **17 and 71 km/wk**: the 2024 distance change pays off nothing in `GOAL_YEAR`, which is the scope rule holding.

## Notes

The design went through a three-lens review (design-conformance, accessibility, and one briefed to argue for reversal). It killed the ordinals — `Run 1 of 2` collides with the sport word and reads as an instruction — the repeated perforation (a real bib has one stub; a device that scales with an array stops being material vocabulary), and the explanatory caption. The reversal case's surviving objection was row-height contagion: a split bib grows ~25px and the wall stretches its row-mate to match. Measured against the **118px** spread the wall already carries between a finished bib (283px) and a booked one (165px), that is 21% of existing variance rather than a new kind of problem.

RIBA 2023 is the second split race. It stays off the wall until the DNF state exists — see `.scratchpad/handover-dnf-bib-state.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (2)

**calvindotsg** — 2026-08-02

### One verification I could not run

`tests/strava-verify.test.ts` is opt-in and needs live Strava credentials. **1Password is locked in this session** (`op` reports `account is not signed in` — the commit still signed because that goes through the SSH agent, a different path), so the two new assertions it gained — the race's `km` against the **summed metres**, and its `elapsed_time` against the **span** — have not been executed against the API on this branch.

What the figures rest on instead:

- They were measured from the Strava API on 2026-08-02 and recorded in `.scratchpad/handover-split-race-recordings.md`.
- The arithmetic was re-derived independently here: `17908.4 + 117411.0 = 135319.4 m` → `135.32` rounded (`135.31` truncated, so this row discriminates the two rules), and `06:41:25 → 16:46:59` = `10:05:34`.
- `pnpm test` proves the shapes, the uniqueness and the single-recording agreement, but **none of that is evidence the ids point where the file says** — only the API is.

To close it:

```
STRAVA_VERIFY=1 STRAVA_CLIENT_ID=… STRAVA_CLIENT_SECRET=… STRAVA_REFRESH_TOKEN=… \
  SKIP_BUILD=1 pnpm vitest run tests/strava-verify.test.ts
```

An activity's fields change under you — this repo has been bitten by exactly that — so this is worth running before or shortly after merge, not treated as optional.

**calvindotsg** — 2026-08-03

### ✅ Closed: verified against the live Strava API

1Password is unlocked, so the verification flagged as outstanding above has now run against `main` at `bce04d9`.

```
Test Files  1 passed (1)
     Tests  7 passed (7)
```

All seven executed — including the three this change added:

- `agrees with the summed metres of all a race's recordings, converted once`
- `agrees with the span from the first recording's start to the last one's stop`
- `lists each race's recordings in the order they were ridden`

**A green pass is not evidence an assertion bites, so all three were mutation-tested against the live API.** Each was caught by exactly the assertion that should catch it, and by no other:

| mutation | caught by | others |
|---|---|---|
| `km: 135.32` → `135.31` (the truncation rule) | summed metres | 6 passed |
| `elapsed_time: 10:05:34` → `10:05:33` | span | 6 passed |
| the two recordings transposed | order | 6 passed |

The first is the one worth noting: **the API's own metres confirm the rounding rule on the one row that discriminates it.** `17908.4 + 117411.0 = 135319.4 m` rounds to `135.32` and truncates to `135.31`; the file says `135.32`, and truncating turns the assertion red. That rule was reversed twice in this repo's history on weaker evidence than this.

Incidentally: the token survived five consecutive refreshes, so Strava is not rotating it on this app and the nightly cron is unaffected by these runs.

The working tree was restored after each mutation; `git status` is clean.


---

<a id="pr-118"></a>

## #118 — fix(events): the Phuket escort is part 1 of the 10 July race, not a separate ride

`merged` · opened 2026-08-03 by **calvindotsg** · merged 2026-08-03 as `3d4b57d54` · `worktree-split-race-10-july` → `main` · +46/−24 across 2 files

## Summary

The rider's call, and it reverses how this day was recorded. 10 July holds two activities, and the first was read as a separate outing that happened to share the date — so the bib printed only the second.

| | |
|---|---|
| `19250544118` 07:35:15 | 22558.8 m · 1:23:04 · *VIP escort through Phuket* — **part 1** |
| `19254155835` 09:12:44 | 140498.0 m · 8:32:05 · *MBG DCR 2026 Phuket to Krabi* — **part 2** |
| **the race** | **163.06 km** · **10:09:34** |

- `km` 140.50 → **163.06** — summed metres converted once. `163056.8 m` rounds to `163.06` and truncates to `163.05`, so this is a **second row that discriminates the rounding rule** (the 2024 ride was the first).
- `elapsed_time` 8:32:05 → **10:09:34** — first start to last stop. Summing gives 9:55:09, which is not the figure; the 14:25 between the two is inside the span exactly as a pause would be.

## Nothing in the data distinguished the two readings

The titles didn't, and neither did the gap — 14 minutes looks exactly like a transfer between two outings *and* exactly like a pause inside one. Same lesson the 2024 round-island ride taught, where the second recording is named for a mechanical rather than `2/2`.

So the long note above `km` **no longer names an example** of the day-holds-something-else shape. It now records that 10 July was read both ways and says to ask rather than infer. That shape still exists as a rule; it just has no live instance to point at, and pointing at one is what went wrong.

Two rationale comments quoted this bib's old pair as their *reason* and were rewritten rather than repointed:

- `elapsed_time`'s 16.5-vs-27.7 argument now attributes those figures to the **recording** they came off, which is still true of part 2.
- `.bib-time`'s note now states the rule the argument actually rests on — both figures from the same scope, the activity on a single-recording bib and the race on a split one, never a mixture.

What did **not** change: the event's advertised 160.59 km was never a candidate under either reading, and is not one now. A bib prints what was recorded.

## Test plan

- `pnpm test` **421 passed | 7 skipped**; `pnpm check` 0 errors; `pnpm eslint` clean.
- **Verified against the live Strava API** — 7/7 in `strava-verify`, including the summed metres, the span, and the part order. The two offline bounds also hold: `|163.06 − (22.56 + 140.50)| = 0` against a 0.01 window, and the span exceeds the 9:55:09 of recording it contains.
- **Required rates unchanged at 17 and 71 km/wk.** The distance is display-only: a race with a recording is already out of `bookedAhead`, and the bot's YTD total held both activities all along. This is the scope rule doing its job on a row inside `GOAL_YEAR`, which the 2024 change could not exercise.
- Wall is now **6 linked bibs and 2 split**; `llms.txt` reads `163.06 km, 10:09:34`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-119"></a>

## #119 — feat(patches): give the wall a state for a race that was not finished

`merged` · opened 2026-08-03 by **calvindotsg** · merged 2026-08-03 as `0524635bb` · `worktree-dnf-bib-state` → `main` · +1052/−111 across 10 files

## Summary

The patch wall had two states — earned and still-to-come — and a DNF is neither. The 2023 round-island ride was therefore **removed from `EVENTS`** rather than drawn, and `constants.ts` carried a note saying it would stay out "until that exists". This adds the state and puts the race back.

## Problem

A race he rode 110 km of was missing from a wall that claims to be every race he has entered. Filing it under either existing state was worse than omitting it: `finished` draws an earned patch for a race he did not finish, and `booked` says a race from 2023 is still ahead of him — which is exactly what `llms.txt` was already doing to any such row.

Nothing in the build can derive it. Neither Strava nor Garmin models a DNF at all — an abandoned ride is stored exactly like a completed one, distance, clock and map — so no recording, no elapsed time and no date comparison can tell the two apart.

## Solution

The bib withholds the earned face and prints `DNF` in the slot the distance would have had; the kilometres drop to a labelled `COVERED 110.04 KM` row. Seven treatments were drawn as real components against the shipped stylesheet and reviewed. Three arguments settled it, and all three are recorded in `Patch.astro`:

1. **It is the results sheet's own device** — `DNF` goes in the column a finishing *position* would have, a status code that REPLACES a result rather than annotating one. With no app pattern to borrow, the sport's paperwork is the only vernacular available.
2. **It is the only candidate drawn in TEXT.** A hatch or perforation is `background-image`, which print discards; a border weight or knockout chip is colour, which forced colours replaces. Each of those owes a second drawing of the same distinction in two modes. This one adds **no `@media` rule at all** — `.bib--dnf` joins the selector list of the two `border-width` overrides the booked outline already had, and nothing else in either mode changes.
3. **It cannot be missed.** The other six carried the state in a tag — and the meta row wraps, so three letters land tucked in after the sport at a fraction of the hero's size. In the hero slot they are the largest thing on the bib: `.bib-value` is `min(3rem, 22cqi)` against `0.6875rem` for the next largest element.

It also costs **no new theme token**: `.bib--dnf` declares the same four values as `.bib--booked`, and a mid-tone "ghosted" ground was rejected on exactly that cost (4 tokens, 4 more contrast pairs).

`outcome` is *stored*, which the rule above `EVENTS` appears to forbid. It does not — that rule forbids a flag that goes **stale**, and an abandonment is immutable history like the `elapsed_time` beside it. The three places that state the rule now say so.

## The sharp edge

`STATE_RANK` is `Record<PatchState, number>`, so a third state fails `pnpm check` until it is ranked. Ranking `dnf` **with** `finished` — which a chronological wall wants — then breaks the sort if the comparator still opens with `a.state !== b.state`: that returns `0` for a finished/dnf pair, never reaches the date comparison, and leaves the two in fixture order. Types green, suite green, wall silently unsorted. The comparator now compares ranks and falls through.

**And the type system stops there.** `bookedAhead` reasons about the state *indirectly*, by asking `hasRecording`, so it took no type error and no red test — and it books an abandoned race that has no recording. Abandon the nine-day Formosa tour part-way and the cycling card pro-rates 1,022 km of a race that is over, which the cross-consumer sweep catches as a blocked deploy with no way to enter the data honestly. It now books only what the wall calls `booked`, which is the same rule stated positively.

## Review

A 21-agent panel (5 lenses, one cold-start skeptic per finding, two planted controls) raised 14 findings; 13 stood, 8 severities were corrected and 10 of 14 remedies were rewritten by their skeptic. Both controls came back correct in the same window — the known-false one refuted by a headless-Chrome negative control, the known-true one confirmed — so the survival rate is a result rather than a rubber stamp. Everything it found is fixed in `ac5099c`; the verdict table is in a comment below.

## Test plan

- `pnpm test` **438 passed / 7 skipped**, `pnpm check` 0 errors, `pnpm eslint` clean, all at `ac5099c`
- **Eleven assertions extended, none weakened.** Two were red on correct code; the rest were **blind** — including both colour sweeps, which built their token list as `state === "booked" ? [...] : []` and so certified every `dnf` ratio against the *finished* ground while reporting the right state in the message
- **Every new gate is calibrated in both directions**, and three carry a negative control that must stay GREEN: a per-sport label, an unconditional covered row, a missing date in a split link's name, a deleted grid rule and a reverted `bookedAhead` all redden — while a harmless reword, and a stylesheet whose rules are merely reordered, do not
- **Data simulation, which mutation testing cannot substitute for:** a second DNF, a running DNF, a DNF with no recording, a DNF inside `GOAL_YEAR`, a DNF-only year and a reordered `EVENTS` are all green and render correctly. The reordered calendar produces a **byte-identical** wall, so the sort does not lean on fixture order
- **Clock advanced to 2026-09-28, 2026-11-11, 2026-12-07 (zero booked races) and 2027-01-15 (past `GOAL_YEAR`)** — green at every one, as are both goals met
- **Measured in a real browser, both themes, transitions frozen:** the DNF bib is contrast-identical to a booked bib — **zero differing pairs** — confirming the no-new-token claim rather than asserting it
- **Live Strava API** (opt-in verifier, 7/7): the summed metres give 110.04 and the first-start-to-last-stop span gives 13:14:12. Calibrated by mutating both figures, which reddens exactly those two assertions

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-08-03

## Review panel: 21 agents, 0 dead, 1.94M subagent tokens, ~35 min

5 read-only lenses over the diff (test-quality, silent-failure, lessons-in-place, argue-against, rendered-and-a11y), one **cold-start** skeptic per finding under a kill mandate, and two planted controls injected into the skeptic tier. No cap: the partition audit reports **14 filed, 14 skepticked, 0 dropped**.

### Calibration

| control | expected | verdict |
|---|---|---|
| `ctl-a` — plausible but FALSE | `stands:false` | `stands=False` @ 97 ✅ |
| `ctl-b` — risky-sounding but TRUE | `stands:true` | `stands=True` @ 93 ✅ |

Both cells correct, so the tier **discriminates** and the survival rate is reportable. `ctl-a`'s skeptic built its own negative control — deleted the rule under test from a copy of the sheet and measured the bib growing 240px → 328px in headless Chrome — rather than settling it by reading.

### Findings

| sev | finding | verdict | resolution |
|---|---|---|---|
| 2 | `argue-against/bookedahead-blind-to-dnf`<br>`bookedAhead` never asks `outcome` — a recording-less DNF in GOAL_YEAR is booked as still-to-ride | stands @93 | **Fixed** `79830de`, independently and before this verdict landed. The skeptic endorsed that exact broader form over the filer's one-liner. |
| 2→1 | `argue-against/lede-collapses-the-distinction`<br>The new lede calls three not-yet-run races "races I have not finished", the site's own words for a DNF | stands @72, remedy rewritten | **Fixed** `ac5099c` — back to `every one I finish`, which also repairs the verbatim quote of it this PR had stranded at `constants.ts:1023`. |
| 2→1 | `argue-against/ridden-label-is-cycling-only`<br>`Ridden` is hardcoded for every sport — a running DNF bib will print "RIDDEN 42.20 KM" | stands @93, remedy rewritten | **Fixed** `ac5099c` — see above. |
| 2→0 | `lessons-in-place/lede-promise-falsified-by-its-own-wall`<br>The wall's lede promises "every one I do becomes a Finisher Patch" beside a bib that disproves it | **refuted** @80, remedy rewritten | **REFUTED** — the skeptic read `do` as VP-anaphora and it is right that the conditional holds. Reworded anyway for the reason the OTHER lens gave. |
| 2→1 | `lessons-in-place/never-stored-rule-left-standing`<br>Three current-state docs still state the "never a stored flag" rule this PR breaks | stands @78, remedy rewritten | **Fixed** `ac5099c` — all three sites plus `404.astro`'s stated reason and one cross-reference that pointed the wrong way, which the skeptic found and the filer missed. |
| 2 | `lessons-in-place/ridden-label-is-cycling-only`<br>The DNF distance row is labelled "Ridden" for every sport, so a running DNF prints RIDDEN 22.45 KM | stands @95 | **Fixed** `ac5099c` — third independent report of the same defect. |
| 2→1 | `silent-failure/dnf-row-comment-arithmetic-is-false`<br>New DNF row's comment claims summing the printed parts gives 110.03; it gives 110.04 | stands @93, remedy rewritten | **Fixed** `ac5099c` — same defect as above, found independently. |
| 2→1 | `silent-failure/ridden-label-is-a-cycling-verb`<br>ridden_label is hard-coded "Ridden" for every sport; a running DNF prints "RIDDEN 22.45 KM" | stands @93, remedy rewritten | **Fixed** `ac5099c` — `covered_label: "Covered"`. Converged with two other lenses. |
| 2→1 | `test-quality/dnf-grid-placement-ungated`<br>The only rule positioning the shipped DNF bib's distance row is ungated; deleting it keeps the suite green | stands @93, remedy rewritten | **Fixed** `ac5099c` — adopted the skeptic's built gate, which resolves the winning template by SPECIFICITY. The filer's cheaper stopgap was measured giving a false red on a merely-reordered sheet. |
| 2 | `test-quality/dnf-ridden-row-unverified`<br>A `dnf` row with no recording prints the race's PLANNED distance under a "Ridden" label | stands @92, remedy rewritten | **Fixed** `ac5099c` — the covered row is now conditional on a recording. Took the skeptic's remedy over the filer's: the filed one (require every DNF to carry a recording) forecloses the recording-less bib three written decisions design for. |
| 1→0 | `rendered-and-a11y/llms-dnf-km-unlabelled`<br>llms.txt prints the DNF's ridden distance in the same unlabelled slot a finished race uses | stands @86, remedy rewritten | **Fixed** `ac5099c` — same defect as the `silent-failure` report. |
| 1 | `rendered-and-a11y/split-link-name-omits-date`<br>Split link names carry the race name and no date, so the DNF's two links collide with the 2024 bib's | stands @88 | **Fixed** `ac5099c` — `{date}` in `split_name`, from the same helper the whole-bib form uses. First gate written for it was BLIND (the stubs' own distances already made names unique); replaced with one that asserts edition identification. |
| 1 | `silent-failure/llms-txt-dnf-distance-unmarked`<br>/llms.txt prints a DNF's ridden distance in the slot every other row uses for race distance | stands @82, remedy rewritten | **Fixed** `ac5099c` — the row says `covered 110.04 km` itself, using the bib's own constant, and a gate now pins it. |
| 1 | `test-quality/split-sum-comment-arithmetic`<br>The new EVENTS comment's stated reason for the DNF row's `km` is arithmetically false | stands @95 | **Fixed** `ac5099c` — 87.42 + 22.62 is 110.04, so the row discriminates nothing. Reworded without reintroducing a count, per the skeptic. |

**13 of 14 stood, 8 severities corrected, 10 of 14 remedies rewritten by their skeptic.** A high survival rate with the controls green and that much correction in the other fields is a discriminating tier, not a rubber stamp.

### What the chair found in parallel, which the panel did not

- **`bookedAhead` books an abandoned race** (`79830de`) — found by data simulation before the panel reported, and independently by the `argue-against` lens after. Its skeptic endorsed the broader fix I had already shipped over the one that was filed.

- **`Recording.km`'s "both races" went stale** the moment this PR added a third split race — the enumeration-rots class, committed while I was writing the note about it.

- The comparator is order-independent: **200 shuffles of `EVENTS` produce a byte-identical wall** (the `silent-failure` lens proved the same thing by brute-forcing the ordering axioms).

### Withdrawn

One of my own probes reported a red on "both goals met". It was an artefact: my synthetic JSON wrote `5100.0` where the bot writes `5100`, so the byte-for-byte stamp assertion failed on formatting. Re-run with the bot's own format: green. Recording it because a probe artefact that reaches a PR body is a defect I have shipped before.


---

<a id="pr-120"></a>

## #120 — feat(events): add OCBC Cycle Singapore 2023 to the wall

`merged` · opened 2026-08-03 by **calvindotsg** · merged 2026-08-03 as `c2ee0b9b3` · `worktree-ocbc-cycle-2023` → `main` · +8/−0 across 1 files

## Summary

A back-catalogue race, added as one row. The wall is the whole calendar, so a 2023 ride belongs on it; nothing else in the site changes.

| | |
|---|---|
| `9024119101` 2023-05-07 05:46 | 22115.1 m · 6795 s · *OCBC Cycle SG 2023* (`followers_only`) |
| **the bib** | **22.12 km** · **1:53:15** · 7 MAY 2023 · Singapore |

- `km` is **22.12**, not the **22.11** on Strava's page. 22115.1 m rounds half-up to 22.12 and truncates to 22.11, so this is another row that discriminates the rounding rule — and it lands on the side `km`'s note says the API, not the renderer, decides.
- `elapsed_time` **1:53:15** is the activity's own 6795 s, elapsed rather than moving (5192 s). Both figures come off the same recording, which is the scope rule the bib is drawn by.

## The row carries a comment because it invites a correction it must not get

22.12 km under a **40 km** sportive reads like a typo. It is not: the activity's own description says *"Rainy rainy morning! Our 40km sportive ride turns out to be a 20km scenic ride!"* — the rain cut the ride short. The comment quotes that and points at the rule above `km`: a bib prints the ride that was ridden, never the route that was entered. Without it, the next reader "fixes" 22.12 to 40 and ships a false fact.

## No two-step hazard, because this race was never booked

The fetch-first / recording-first choice above `EVENTS` is about a race whose kilometres could land in two places at once. This one is outside `GOAL_YEAR`, so `eventsInYear` never hands it to a goal card and `bookedAhead` never held it. It is a pure data edit.

## Test plan

- `pnpm test` **421 passed | 7 skipped**; `pnpm check` 0 errors; `pnpm eslint` clean.
- **Verified against the live Strava API** — `STRAVA_VERIFY=1`, 7/7, which holds this row on its own distance, its elapsed time to the second, and the **day** it was recorded. The `followers_only` visibility is exactly the case only the API can answer.
- **The home page does not move, proven rather than assumed.** Built with and without the row: `dist/index.html` is byte-identical (`67144469…`). The comparison is calibrated — adding 100 km to a *booked* 2026 race changes that hash (`31b27ba4…`), so the detector is not simply blind. Required rates stay **17** and **71 km/wk**.
- Wall goes from 11 to **12 bibs**, 8 of them cycling; rendered line reads *7 MAY 2023 · Ride · 22.12 km · OCBC Cycle Singapore · Singapore · Elapsed 1:53:15 · View on Strava*, drawn as an earned patch because the `elapsed_time` + `recordings` pair outranks the calendar.

**Named without the year** — the bib already prints `7 MAY 2023`, and the neighbours are `OCBC Cycle Johor Bahru` and `OCBC Cycle Singapore Virtual Ride`. The activity's own title is `OCBC Cycle SG 2023`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-121"></a>

## #121 — fix(events): round a recorded distance down, and store the metres it comes from

`merged` · opened 2026-08-03 by **calvindotsg** · merged 2026-08-03 as `05af62d77` · `worktree-km-round-down` → `main` · +671/−338 across 13 files

## Summary

A recorded distance now rounds **down**, which is what Strava does — and the rows stop storing the converted figure altogether, so the next time that rule changes it is one line instead of every row.

| | before | after |
|---|---|---|
| the rule | metres rounded half-up | metres rounded **down** (`kmFromMetres`) |
| what a row stores | `km: 78.60` | `metres: 78595.0` |
| what a race's `km` is | a typed figure | `raceKm(event)`, derived |
| the bot's YTD totals | `toFixed(1)`, half-up | `Math.floor(m / 100) / 10` |
| a recorded row carrying `km` | allowed, and drifted twice | **a compile error** |

Seven of the eleven recordings discriminate the two rules, and every figure was re-derived from a live API read rather than from a comment: **22.11, 17.90, 78.59, 22.55, 140.49, 10.16, 160.56**, plus the split-race sums **135.31** and **163.05**.

## The rule, and why it keeps being re-argued

`km`'s rule is the maintainer's and this is its third setting: down, then half-up, then down again. What the first two arguments kept reaching for was a *Strava surface* — an embed, a screenshot of an activity page — and the rule does not take one as input. It reads `distance` off the API and drops the third decimal, so a rendered figure neither confirms nor contradicts it. Those readings are gone from the comment rather than left standing as evidence.

Strava does say it displays what it received *"rounded down"* — the "Strava tax" — so a bib and the page it links to agree and the site never overstates a ride. That is recorded as consistency, in one sentence, **not** as the reason. Each earlier setting shipped with a story doing its arguing, and each story outlived the rule it was written for.

## Storing metres is what makes the next reversal cheap

The rows stored the *converted* number, so each of the three settings meant hand-editing every recorded row from figures only a live API call could recover. They now store what the source said.

The type carries the invariant rather than a test: a race is either **recorded** (a non-empty `recordings` tuple, `km?: never`) or **booked** (an advertised `km`, no recordings). A recorded race with a hand-typed distance beside its metres is now rejected by `pnpm check`, which gates the deploy. The tuple is what keeps `recordings: []` falling to the booked shape — the type finally saying what `recordingsOf` has always said at runtime. `raceKm` is the single accessor: `Patch.astro`, `llms.txt` and `bookedAhead` all read it, and the compiler enumerated all 28 call sites, which is how the sweep stayed honest.

Cost, stated plainly: four test fixture builders need `as RaceEvent`, because a spread over a union cannot be verified. Each says so in place.

## Coverage moved with the logic, and one gate is deleted

- **`tests/constants.test.ts`** gains the conversion itself, on a table of real activity distances **labelled by whether they discriminate** rounding down from half-up. The test fails if none of them does — the self-confirmation trap the original evidence for this rule fell into ("measured on four cases", three of which agreed either way). It also pins the float boundary (`158100 m` must not fall to `158.09`) and shows `toFixed` agreeing on exactly one row and differing on four.
- **`tests/strava-verify.test.ts`** now asserts stored metres **=== API metres**, with no conversion on either side, plus `raceKm` end to end against the API's own numbers.
- **`tests/projection.test.ts`** loses the split-race distance bound. It bounded one hand-typed figure against other hand-typed figures; with the race figure derived it would assert the code's arithmetic against the code's own output — green whatever the rule. Its subject moved to the conversion tests rather than being dropped.

## The bot's totals move too, and that was measured before shipping

The goal card and the wall were briefly on opposite conventions. `kmFromMeters` now floors at one decimal — one decimal stays, because a year's total against a four-figure target prints as `2440.3` and a second decimal is noise.

The bot's `updated_at` means *"the day the kilometres last moved"*, so a rule change that shifted a figure would fake a ride. Today's totals are **2440314 m** and **174500 m**; both rules convert those to **2440.3** and **174.5**, the values already in the JSON. The next run writes an identical file and the stamp does not lie. (The run total landing exactly on a whole tenth is also the float case the new test pins.)

## Test plan

- [x] `pnpm check` — 0 errors; `pnpm eslint` — clean
- [x] `pnpm test` — **428 passed**, 7 skipped
- [x] `STRAVA_VERIFY=1 pnpm vitest run tests/strava-verify.test.ts` — 7 passed against the live API with the stored metres
- [x] Every rendered figure unchanged by the refactor — `dist/patches` and `dist/llms.txt` compared before and after
- [x] No home-page figure moves — a recorded race is out of `bookedAhead`; rendered `index.html` identical apart from a build-mode attribute
- [x] Mutation-calibrated, all four:
  - `kmFromMetres` → half-up: **red** (`expected 22.12 to be 22.11`)
  - a hand-typed `km` on a recorded row: **red at the type-check**
  - the bot's converter → `toFixed(1)`: **red** (`expected 2246.5 to be 2246.4`)
  - a mistyped `metres`: **green offline on a fresh build**, red only against the live API — so the README says that is the one thing only the opt-in suite can catch

**Size note:** 853 lines, above the usual target. It is one change and splitting it would ship a half-migrated model — the bulk is prose and comments (`constants.ts` alone is 366 lines of mostly rewritten rationale), not logic.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvin-heymax** — 2026-08-03

## Review panel: 12 agents + one relaunched dimension

Four finder dimensions over the diff, one adversarial skeptic per finding with a default-refute prior, plus two planted controls. One finder (`method-audit`) died to a network drop mid-run and was relaunched separately, seeded with what its transcript had already established — `pipeline` returns `null` for a dead agent, so without the pulse check that dimension would have gone missing silently and the report would have looked complete.

### Verdicts

| Sev → after | Finding | Verdict | Resolution |
|---|---|---|---|
| minor | `raceKm` summed the parts' metres as doubles, so a **3+-part race can print a hundredth short — and the figure depends on the order the parts were ridden**. 86432.4 + 47793.2 + 24244.4 → 158469.99999999997 → 158.46 for a 158.47 ride; 1 permutation of 6 disagreed. 413/14973 boundary cases. | **CONFIRMED** | Fixed. Snap the sum to a micron before applying the rule. The finding's own fix (scale to integer tenths) was rejected by its skeptic — it assumes 1dp input and rounds a 2dp value **up**, the one direction this rule forbids. |
| major → minor | `bookedAhead`'s new comment claims "every race reaching this line is unrecorded"; a row with `recordings` but no `elapsed_time` is `booked` and gets its **recorded** distance. Found independently by two dimensions. | DOWNGRADED (behaviour unchanged, stated reason false) | Fixed in the merge — the comment now names both shapes. |
| major → minor | `strava-verify.test.ts` pointed four sentences at `km` for the recorded-distance rule, which now means the **advertised** figure a recorded race does not carry. | DOWNGRADED | Fixed — retargeted at `kmFromMetres`/`raceKm`, and the file now says what `km` means. |
| major → nit | The NaN test called `recordings: []` beside no `km` "a legal booked race". The union rejects it. | DOWNGRADED | Fixed — the branch stays for the doors the type does not cover (casts, `JSON.parse`), and now says so. |
| minor | `CLAUDE.md`: "the parts drop a hundredth apiece" — flooring drops [0, 0.01), and one of the two split races drops nothing. | **CONFIRMED** | Fixed in the merge. |
| major | *(relaunched dimension)* The exactness gate compared against `kmFromMetres(m) * 100` — itself a float op, **red on correct code** at 158110 — and all six inputs agreed under `Math.floor(m / 1000 * 100) / 100`, the "km first" spelling the comment calls load-bearing. That substitution differs on **1145 of 21001** multiples of 10 m with the whole suite green. | — | Fixed — 2dp literals, inputs labelled by whether they discriminate, and a counter that fails if none does. It immediately caught my own mislabelling of one input. |
| minor | *(relaunched dimension)* The bot script's comment used 2246450 m as the case separating floor from `toFixed(1)`. It does not — 2246.45 is 2246.4499999999998 as a double — so the test case added to pin the change was green under the code it replaced. | — | Fixed — 2246480 is the discriminator; each case is now labelled by what it actually separates. |

**Refuted, and worth recording as decisions:**

- *"The rounding change moves the goal cards' required rates."* Refuted three ways: `bookedAhead` skips recorded races before reading any distance (a 100 km mutation to a recorded race moved it by 0), the printed figure has 17.7 km of headroom to its next `ceil` boundary, and `dist/index.html` is md5-identical across the merge-base, `origin/main` and this branch.
- *"A mistyped `metres` ships green offline."* The mechanism reproduces, but the skeptic killed it as a finding: `origin/main` has the identical hole (a consistent two-site typo is green there too, 438 passed), it is the standing property of every hand-entered field rather than anything about `metres`, and the diff already documents it in three places. Its proposed remedy — per-sport plausibility bounds — was **green on the finding's own evidence mutation**, i.e. it would have manufactured exactly the "green on the defect it names" gate this repo forbids.

### Calibration

The false control was correctly refuted. The true control was **also** refuted — and the skeptic was right: I built it with a true mechanism and a false conclusion, which is the recipe for a *false* control, not a true one. The judge tier is strict rather than miscalibrated; the control was misdesigned.

### Negatives verified rather than assumed

All four mutation calibrations reproduce, including the load-bearing one — a mistyped `metres` is green across the whole offline suite on a **fresh** build and red only against the live API, which is what the README and `CLAUDE.md` now tell readers. The opt-in suite was proven non-blind by stubbing `fetch` with a *frozen* fixture (so the fake API cannot move with the constants file). Every other new assertion was mutation-tested and bites. No other instance of the `* 100` round-trip formulation exists in the diff.

**Gates after the fixes:** `pnpm check` 0 errors · `pnpm eslint` clean · `pnpm test` **446 passed**, 7 skipped · live `STRAVA_VERIFY=1` green on all 13 recordings · both new gates mutation-calibrated (removing the micron snap reddens the order assertion; the km-first spelling reddens the table that used to be blind to it).


---

<a id="pr-122"></a>

## #122 — fix: what an eight-dimension audit panel found on calvin.sg and /patches

`merged` · opened 2026-08-03 by **calvindotsg** · merged 2026-08-03 as `ea6fa8fa2` · `worktree-worktree-audit-panel-fixes` → `main` · +1166/−78 across 23 files

## Summary

A fan-out audit panel over `calvin.sg` and `/patches` — 8 dimensions plus 3 planted controls, 27 agents, one adversarial skeptic per finding — scored against Anthropic's `frontend-design` skill and shadcn/`improve`'s audit playbook. This ships everything that survived verification.

**The panel's own instrument reading, so the verdicts can be weighed:** all three controls behaved. A 10-statement adjudication set scored 10/10 including both traps; a planted true finding was CONFIRMED; a planted false one was REFUTED — and that skeptic proved the proposed remedy would have *introduced* the defect (1 → 10 distinct wall orders across 120 fixture permutations). Four findings were killed, including one refuted on a decision already recorded at `constants.ts:978`.

## Problem

Eight confirmed defects, in three groups.

**The deploy gate held one third of what it claims.** `CLAUDE.md` states the build job runs `check`, `eslint` and `test` and that a red run of any of them blocks the deploy. Only `pnpm test` was pinned, so both others could be deleted with 446 assertions green — removing the only type gate on every `.ts` file. Two deploy-time guards were unheld the same way, including the one `ci.yml` itself calls the sole defence against republishing an older tree over production.

**Seven controls disappeared in forced colours.** presetIcons paints an icon as a mask over `background-color`, which a forced-colours mode overrides. Measured white-on-white at 1.00:1: six social links and the theme toggle became identically-sized empty boxes, and the footer heart — which stands in for a word — vanished.

**A supported data shape reddens the deploy, and would tell a crawler something false.** A DNF recorded without activities is permitted by the type; three assertions demand a distance row the component deliberately omits, and `llms.txt` would fall back to the advertised distance — publishing a route the rider abandoned as one he covered. No row in `EVENTS` is that shape today, so this is one data edit away rather than a defect that shipped; on the calendar's longest advertised race it would be four figures of distance he did not ride.

## Solution

Beyond the fixes, four things were decided by the maintainer and one by measurement:

- **The goal card now says what its rate is already banking** — `71 km/wk to go, 1022 booked`. Five treatments were built as the real card in the real page; this is the only shape that costs nothing.
- **The wall's bibs take the home page's entrance**, not a second cascade with its own timing — same keyframe, step and ceiling.
- **The hero ships one `h1`** and no inherited-template eyebrow.
- **The bib hero stops inverting under text zoom** at 30cqi. The obvious fix — a `rem` floor — was built and rejected: `rem` grows with the very setting it defends against and spills 14.2px past the bib's edge, a loss the clip sweep reports as zero.

Two claims in my own prose were corrected after measurement rather than shipped: "pixel-neutral" was true on desktop and false on mobile, and "costs no height" was a desktop figure quoted as a page-wide one.

## Test plan

- `pnpm check && pnpm eslint && pnpm test` — **451 passed / 7 skipped**, 0 type errors, 2 pre-existing hints, eslint clean.
- **Every new guard mutation-tested.** Deleting each CI step reddens exactly the row naming it, including the copy-paste-drop case where the stale-artifact guard survives in only one of two deploy jobs. The entrance gate was mutated four ways (duration, step, cap, reduced-motion arm) — all killed.
- **The DNF fix proven both directions**: with such a race in `EVENTS`, pre-fix code fails twice and fixed code is green.
- **280-configuration sweep** on the final build (5 pages × 7 viewports 320→1920 × 4 root sizes × 2 themes, correct reader lever): 0 clipping rows, 0 horizontal overflow, 0 unguarded `:hover`, 0 console errors.
- **Contrast measured for the first time in this site's history** — 372 distinct ink/ground pairs, 0 failures, tightest 6.52:1, probe calibrated in both directions. SC 1.4.11 non-text contrast remains unmeasured and is called out as such.
- Forced colours re-measured after the fix against the one control the repo had already corrected, in the same run.

## A second panel reviewed this one

Five dimensions, a cold cross-model skeptic per finding, and a ten-statement adjudication set whose answers were known — it scored **10/10 including both traps**, so the verdicts are weighable. **Nine findings confirmed, one refuted.** Five skeptics died on API errors and were re-run as fresh cold agents rather than silently dropped; every one of the five came back CONFIRMED, two with a better remedy than the finder proposed.

What it found in this PR's own work:

- **Three new guards could not fail.** The wall's entrance gate read `.astro` source and never checked that anything *sets* `--i` — deleting that one attribute put every bib at `animation-delay: 0s`, the whole cascade gone, with the suite unchanged at 451. The goal card's booked clause — this PR's one shipped feature — was asserted against `GOALS.map(goalStatusLine)`, so deleting the clause moved the expectation with it. The `llms.txt` DNF branch is reachable only through a condition no row in `EVENTS` satisfies. All three now resolve the artifact, or a second source.
- **A CSS bug the perforation fix introduced.** `grid-template-areas` rows must agree on column count; a `"."` spacer among two-column rows made both bib templates invalid, so the browser dropped them whole and `.bib--linked` computed the *base* five-row template with no `go` area at all. Measured: `/patches` at 1440 went 1279 → 1725px. Spelled `". ."`, it is 1298 — and there is now a gate over every emitted sheet.
- **An eighth icon-only control.** The Now card's explainer link wears no shared class, so the sweep that repaired seven missed it and it became an empty box in forced colours. Its gate is derived from the built markup rather than a list, and turns on whether the glyph *is* the name — a rule covering every glyph would redden this build on 13 correctly-labelled bibs.
- **A step-level `if:` could disable the type gate.** The CI predicate's exemption was argued for `pnpm test`, whose absence starves `dist/`; `check` and `eslint` inherited it and nothing downstream reads their output. Now evaluated in GitHub's own evaluator rather than banned outright.
- **Four claims that were not true**, including one in this PR body: a defect described as history that never shipped, a mobile height that was never a state of the tree, and a spacing figure off by 90px.

The refuted finding is recorded rather than hidden: a skeptic argued the `llms.txt` guard *can* fail once a qualifying row exists, and that the proposed dist-based remedy was unimplementable. Both true — the fix taken instead was a file-scoped fixture, which is why `tests/llms-dnf-fixture.test.ts` exists.

**Gate after the fixes:** `pnpm check` 0 errors, `pnpm eslint` clean, **459 passed / 7 skipped**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-08-03

## Second-panel verdict table

Five dimensions, cold cross-model skeptic per finding, partition-not-slice on severity (every critical and major verified; minors capped at 2 per dimension, and the cap logged what it dropped rather than truncating silently).

**Instrument reading first, so the verdicts can be weighed.** A ten-statement adjudication set whose answers were known scored **10/10**, including the true-but-sounds-wrong item (`.bib-cell` is a global rule in a layout that wraps every page, though only `/patches` uses it) and the false-but-sounds-right one (`expectedKm` calls `raceKm`). Five skeptics died on API `server_error`; the dead-agent fallback returns `UNCERTAIN` with an unforgeable marker rather than a pass, and all five were **re-run as fresh cold agents** — every one came back CONFIRMED, two with a better remedy than the finder proposed.

| # | finding | severity | verdict | outcome |
|---|---|---|---|---|
| 1 | Stagger gate never checks anything *sets* `--i` | critical | CONFIRMED | Fixed — gate now reads the built markup on all three wall pages and asserts render order |
| 2 | `grid-template-areas` `"."` spacer invalidates both bib templates | major | CONFIRMED, remedy unsound | Fixed per the skeptic's corrected remedy (`". ."`), plus a gate over every emitted sheet |
| 3 | Booked clause — the one shipped feature — asserted tautologically | major | CONFIRMED | Fixed — gate derives from `bookedAhead`, and covers the empty case |
| 4 | `llms.txt` DNF branch unreachable by any row in `EVENTS` | major | **REFUTED** | Fixed anyway, by a different route — see below |
| 5 | Eighth icon-only control erased in forced colours | major | CONFIRMED | Fixed + build-wide gate derived from markup, not a list |
| 6 | Step-level `if:` can disable the only `.ts` type gate | major | CONFIRMED | Fixed by *evaluating* the `if:`, not banning it — a blanket ban would forbid legitimate conditionals |
| 7 | `expectedKm` drops the micron snap `raceKm` documents | major | CONFIRMED | Fixed — a three-part race would have reddened the deploy against a correct build |
| 8 | "1,022 km of a race he did not finish" never happened | major | CONFIRMED | Reworded here and in the PR body |
| 9 | "the document stays 900 / 1754" — never a state of the tree | major | CONFIRMED | Absolute pair dropped; the claim that matters is a difference |
| 10 | Hero link's arrow erased in forced colours | major → **minor** | CONFIRMED, downgraded | Fixed in all *three* places the skeptic found, not the one the finder did |
| 11 | Commit attribution: hero restructure in the a11y commit | major | CONFIRMED, **not actionable** | No history rewrite — see below |
| 12 | Filter-chip wording ships with no assertion | minor | CONFIRMED | Gate added, read off `GOALS` |
| 13 | Icon-alignment counts left at "ten" in two sentences | minor | CONFIRMED | Rephrased against the relation, not the figure |
| 14 | "250px below" is 158.8px | minor | CONFIRMED | Number dropped rather than re-pinned |

**The refutation (#4), recorded because it changed the fix.** A skeptic argued the guard *can* fail once a qualifying row exists — the defect is impossible today only because no row has that shape — and that the proposed `dist/`-based remedy was unimplementable, since those assertions read a static artifact built from the real `EVENTS`. Both correct. So the fix is a file-scoped `vi.mock` fixture instead, which is why `tests/llms-dnf-fixture.test.ts` exists and why it lives in its own file: `clock-split.test.ts` already documents that a leaked mock reddens every suite comparing against `dist/`.

**Not actionable (#11).** The facts check out — the hero restructure landed in the forced-colours commit, and that commit is red in isolation. But under `--squash` no intermediate commit becomes an ancestor of `main`, so `git bisect` can never reach it, and no check-run was ever recorded against it. A history rewrite buys nothing. The only thing that survives is the squash message, which was written by hand accordingly.

**Two things the panel got wrong and the skeptics caught**, worth recording so they are not re-found: one finder's grep count was 2 where it is 5, and one framed the hero link as added by a *later* commit than the rule that misses it — both are in the same commit.

**Geometry after the grid fix**, measured against `main` across 5 widths × 5 pages:

| | main | with the invalid template | after |
|---|---|---|---|
| `/patches` @1440 | 1279 | 1725 (+446) | 1298 (**+19**) |
| `/patches/cycling` @1024 | 935 | 1318 (+383) | 949 (**+14**) |
| `/` @390 | 1774 | — | 1787 (**+13**, as documented) |

Zero horizontal overflow at any configuration. The residual 14–19px is the spacer row's own `row-gap` — intended, where the invalid template was costing up to 446px.

Gate at merge: `pnpm check` 0 errors, `pnpm eslint` clean, **459 passed / 7 skipped**.


---

<a id="pr-123"></a>

## #123 — fix(tests): guard the oracle that guards the deploy, and record what was measured

`merged` · opened 2026-08-03 by **calvindotsg** · merged 2026-08-03 as `894a3aa84` · `followup-1411-and-snap-guard` → `main` · +115/−1 across 2 files

## Summary

Two follow-ups from the #122 review panels. **No production code changes** — a test-oracle guard and a measured record.

## The oracle that guards the deploy was itself unguarded

#122 fixed `expectedKm` to apply the micron snap `raceKm` documents as load-bearing. That fix had nothing behind it: the snap only changes an answer for a race of **three or more** parts, and the calendar holds seven one-part races and three two-part ones. Deleting the snap left the whole suite green — the same "guard cannot fail" class the panel had just found three times, sitting inside the repair for one of them.

`tests/constants.test.ts` already guards the snap inside `raceKm` with a synthetic fixture. This is the mirror.s half, held to a **hand-computed** 158.47 rather than to a second call to `raceKm` — asking `raceKm` for the answer would put the coupling straight back and the oracle would stop being independent.

Mutation-proved: dropping the snap now fails with `expected '158.46' to be '158.47'`.

## What the panels deferred, measured before being recorded

The handover asked for these to be written into `plans/README.md`. Measuring first mattered — **one of its three claims was false.**

**SC 1.4.11 was not "never measured."** That claim had been carried forward twice. Four surfaces are already gated: progress-bar fill vs track, control accent vs surface (it shipped at 1.89:1 once), the Now card.s live dot, and a bib.s sport mark at the 4.5:1 text floor.

Newly measured on the shipped build:

| surface | result |
|---|---|
| Focus indicators | **Pass**, 3.00:1–18.86:1 across both themes, both pages, seven focusable kinds |
| Perforation | **Exempt, not unmeasured** — a `radial-gradient` at 45% ink on screen; SC 1.4.11 exempts decoration. It is a border only in the print and forced-colours arms |
| Booked / DNF bib outline | **2.13:1 light, 2.84:1 dark** against a 3:1 floor — the one real gap |

The bib outline goes to **Open items owned by the maintainer**, because the only remedy is a palette change and the palette is settled. The entry records the argument *against* it being a failure too: neither state depends on the border — a booked bib prints `Booked` and a DNF prints `DNF` — so what the outline carries alone is the bib.s extent, not its state.

Also verified and downgraded: the `ping` halo does keep animating under `prefers-reduced-motion` (the arm names `main > *` and `.bib-cell`; the halo is a span inside a card), and `Pulse.astro`.s rationale is about contrast, not motion — so it does not settle the question. Recorded as open rather than resolved.

## Note on the probe

The first measurement run reported the bib borders as 1.06:1 and called three transparent borders failures. Both were probe artefacts: `getComputedStyle` returns `color(srgb 0.98 …)` with **0–1 floats** where `rgb()` gives 0–255, and a fully transparent border is no border rather than a low-contrast one. The corrected probe carries two calibration pairs whose ratios are known, and they check out arithmetically (21:1 and 2.23:1) — the figures above are from that run.

## Test plan

`pnpm check` 0 errors / `pnpm eslint` clean / **459 passed, 7 skipped**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-124"></a>

## #124 — fix(events): record OCBC Cycle Johor Bahru as a race that was not finished

`merged` · opened 2026-08-03 by **calvindotsg** · merged 2026-08-03 as `0bec32937` · `worktree-ocbc-jb-dnf` → `main` · +22/−10 across 3 files

## Summary

- `OCBC Cycle Johor Bahru` (2025-12-14) now carries `outcome: "dnf"` — the 42 km road ride was not completed, and the wall was drawing a Finisher Patch for it.
- The bib becomes the first `.bib--dnf.bib--linked` on the wall: a DNF recorded as a single Strava activity.
- Two comments that the new row falsified are corrected in the same commit.

## Problem

Calvin was past the cut-off and marshalled onto the shortcut, so the race was never finished. Nothing the build can see says so — and this row is the case that shows why `outcome` has to be TOLD rather than looked up:

- **Strava** stores an abandoned ride exactly like a completed one.
- **The calendar** only knows the race is in the past.
- **The official result** actively disagrees: checkpointspot prints `Status: Finished` against bib 2192, because a timing mat records who crossed it and a diverted rider crosses the same finish mat.

That third one is new. `RaceEvent.outcome`'s note argued the vernacular comes from the results sheet; this row shows the results sheet is a third blind witness, not a fallback source.

## Solution

One data edit — `outcome: "dnf"` on the row — plus the prose it invalidated:

- `constants.ts` called the 2023 abandonment *the only* row carrying an `outcome`. Reworded so it names what that row still uniquely shows: that being split and being a DNF are independent.
- `Patch.astro` said `.bib--dnf.bib--linked` was written for a shape not yet on the wall. It is on the wall now, so the comment records that the speculative rule paid off and says to keep it if the case empties again.
- `tests/projection.test.ts` said "the one DNF on the calendar is from 2023". Both DNFs still predate `GOAL_YEAR`, so the substance holds — the count did not.

A row comment on the event itself warns the next reader not to "correct" this back on the strength of the results page.

## Test Plan

- [x] `pnpm check` — 0 errors, 0 warnings
- [x] `pnpm eslint` — clean
- [x] `pnpm test` — 459 passed, 7 skipped
- [x] Rendered `dist/patches/cycling/index.html`: the bib carries `bib--dnf bib--linked`, hero reads `DNF` with an `Did not finish` screen-reader expansion, `Covered 78.59 km` on its own labelled row, and the Strava link survives
- [x] `dist/llms.txt` lists the race under `Did not finish:` with `covered 78.59 km`
- [x] No home-page movement: 2025 is outside `GOAL_YEAR`, and `bookedAhead` already skipped this race — the cross-consumer sweep in `tests/projection.test.ts` covers the partition

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-125"></a>

## #125 — feat(patches): put the organiser's result on the bib, beside the ride

`merged` · opened 2026-08-03 by **calvindotsg** · merged 2026-08-03 as `575d65a38` · `worktree-official-results-ledger` → `main` · +1758/−1009 across 14 files

## Summary

- Every earned bib now carries a **ledger**: one row per source, each holding that source's own distance beside that source's own clock — `OFFICIAL 21.10 3:30:59` over `RECORDED 22.45 3:44:25`. The two accounts are published side by side and **nothing reconciles them**.
- `elapsed_label` and `covered_label` retire into it. `km` becomes `advertised_km` and gains an `official` block, paired by a `Documented | Undocumented` union.
- **No bib is the anchor any more.** Every destination is a line on the stub, results sheet above Strava — because a race can now have two kinds of destination and anchors do not nest.

## Problem

A race can be known twice. The organiser measures a certified course with a Jones counter along the shortest legal line and times it off a mat; a watch samples GPS around whatever line was actually run and stops when a thumb presses a button. On the 2022 half marathon those two accounts read **21.10 km / 3:30:59** and **22.45 km / 3:44:25**. Both are correct. Neither is a correction of the other.

The bib could only print one of them. It printed the ride, under labels — `Elapsed`, `Covered` — that named the *measurement* rather than the *source*, so there was no vocabulary for a second account and no place to put one.

The failure mode a naive fix walks into is worse than the omission: averaging the two, or picking the "better" one, or printing a distance from one source next to a time from the other. That last one is the real hazard, and it is what the whole layout is built to prevent.

## Solution

### The invariant

**Nothing a reader can divide crosses two sources.** That is strictly stronger than the `Elapsed` label it replaced, and it is what forces the shape: a ledger row is a source, and a row's distance and clock are both that source's. A `KM` / `TIME` heading states the unit once, above.

### What it cost, and where the coverage went

`RecordedRace` used to spell `advertised_km` as `km?: never` — a hand-typed distance beside stored metres was two copies of one fact, and this repo shipped that drift twice. **The compiler can no longer refuse the pair**, because the pair is the ledger's entire subject.

What the guard actually protected was the *precedence*, and that moved into `raceKm`: it reaches for an advertised figure only where there is nothing recorded to convert. `tests/constants.test.ts` names the rule ("prefers the recorded metres over an advertised distance on the same row"), and three further gates redden on the mutation — including the `llms.txt` oracle, which derives the figure independently. The rename is the other half: `advertised_km` cannot be misread as the distance ridden the way a bare `km` could.

`Documented | Undocumented` keeps the rest: `official` may only appear beside an `advertised_km`, so an official row can never be a time next to a blank.

### Why the whole bib stopped being a link

A bib is the link when there is one place to go, and holds the links when there is more than one. A published results sheet makes "more than one" the ordinary case, and anchors do not nest — one destination would have had to sit inside the other.

What paid for it is `race_name`: every stub link's accessible name now carries the race and its date, which is the disambiguation the whole-bib form got for free from announcing the bib's entire text. **The results link goes above the Strava one** — both cited sheets render for a logged-out visitor, and every Strava link on the wall is a login wall. (Verified in a real browser. `curl` gets 403 from both WAFs and proves nothing either way.)

### Two reversals under review, both now gated

Both were caught by looking at the rendered page. The suite could not see either.

1. **`auto 1fr auto` stranded the clock.** The flexible track in the middle put **127.4px** of ink between `160.56` and `10:56:17` at 390px — a rift falling exactly between the two figures the ledger exists to keep together. Fixed to `1fr minmax(0,auto) minmax(0,auto)`: the slack goes after the row's *name*, which is what a results sheet, an index and a scorecard all do.
2. **Grouping them made the two figures read as one number.** Both tabular, both 800 weight, 5.5px apart. A wider `column-gap` is uniform and pays twice — measured wrapping 4 cells at 1.5em and 10 at 2.2em on a 218px bib. **Padding on the clock column alone** wraps nothing at 1.4em and gives 19.5px. (That 218px was later shown *not* to be the wall's floor — the column is `min(13rem, 100%)`, so it is 208px. Corrected in the comment, and superseded by the container arms below.)

A hairline column divider was drawn and rejected: it would be the only rule on an object whose vocabulary is perforations and pin-holes, and would owe forced-colors, print and contrast arguments. Whitespace owed none.

## Test Plan

- [x] `pnpm test` — **464 passed, 7 skipped** (was 459 on `main`)
- [x] `pnpm check` — 0 errors
- [x] `pnpm eslint` — clean
- [x] New gate **"puts the ledger's slack after the row's name, and lets its figure tracks shrink"** parses `grid-template-columns` into top-level tracks and holds all three properties. **3 mutations verified red** — flexible track moved, `minmax(0,…)` reverted to bare `auto`, clock padding dropped below the gap.
- [x] New gate **"prefers the recorded metres over an advertised distance on the same row"** — the coverage that replaced `km?: never`. Mutation reddens this plus 3 independent gates.
- [x] Ledger gates: each account gets its own row and **mixes none of them**; stub carries every destination in usable order; every stub line has a visible label and a glyph with a real rule; the external-link warning is the last child of every stub link.
- [x] Measured on the built wall (WebKit, 5 viewports × both themes): tightest composited contrast **10:1**; stub link target height **24px exactly, all 15**; **no ledger or stub ink outside the bib** from root 16→32px; **15 of 15** distinct stub link names on one wall.
- [x] **Re-swept in Chromium after review, 10 viewports × 5 root sizes (16→32px): 0 wrapped cells, 0 escape, 50/50 bands.** The original sweep's "0 wrapped cells at default size" was wrong — three viewport bands wrapped at the default size, and 280 cells wrapped once the reader enlarged the text. See the review comment below.
- [x] The build-wide link-signifier gate's two bib carve-outs collapse to **one**, now that every destination is a stub line.

## What the review panel changed

A 15-agent panel over this branch found a **WCAG SC 1.4.4 regression** that the measurement above was structurally blind to: at a 32px root the ledger's three-column form shattered `RECORDED` into eight stacked single letters. `overflow-wrap: anywhere` converts an overflow into a break, so a sweep looking for ink outside the bib found none — correctly, and uselessly.

Six commits follow the feature commit:

- **`fix`** — two container arms on the bib's own inline size, thresholds in `em` because the broken widths straddle the healthy ones in px. 280 wrapped cells before, 0 after.
- **`test`** — gates the reflow (4 mutations red), pins **which clock** an official result announces (both sources red — the word was unpinned and could ship a gun time labelled `net`, 17 minutes wrong), and guards an official result the way a finishing time is guarded.
- **`docs`** — four claims the ledger falsified, including this file's own.

Full verdict table, including the two refutations and the three unverified majors I checked by hand, is in the review comment on this PR.

## Notes for review

**This PR is 2,767 lines against the 200–400 target and is not split.** The three parts are not independently shippable: the data model exists only to feed the ledger, and the stub is *forced* by it — a second destination cannot go inside the first. A stacked split would ship a field nothing renders, and would have to justify removing `km?: never` in a PR with no ledger in it. Of the total, 1,121 lines are tests and 97 are docs; `src/` is +914/−635 for a net of **+279**.

**The open question was argued and landed, not dodged.** The ledger has **no table semantics** — a screen reader gets the flat run `"km Time Official 42.00 2:19:11 Recorded 78.59 7:40:25"`. The panel measured it (0 table/row/columnheader roles across 764 AX nodes) and landed on the flat run being adequate at this size: the ledger reads linearly the way a small table does, and `KM` sits in the text stream three nodes ahead of the figures, so SC 1.3.1's "or are available in text" branch is satisfied. Recorded here so the next reader knows it was decided rather than missed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-08-03

## Review panel: 5 dimensions, 24 findings, 10 verified, 8 confirmed

A fan-out panel ran over this branch — 5 finder dimensions, one **reproducing** skeptic per finding (capped 2/dimension), 15 agents. Skeptics were told to default to REFUTED without reproduction, to compare against `origin/main` rather than an ideal, and to judge the remedy separately from the defect.

**It found a real regression that this PR shipped and that my own measurement was blind to.** Six commits follow.

### The one that mattered

Two dimensions that could not see each other — a11y and layout — converged on the same defect with matching numbers.

At a **32px root, WCAG SC 1.4.4's required 200%**, a 390px phone gives a bib 260px, and `RECORDED` rendered as **eight stacked single letters** beside a two-line `10:56:17`. Reproduced independently: **280 wrapped cells** across 10 viewports × 5 root sizes, against **0 on `origin/main`**.

The measurement in the PR body — *"no ledger or stub ink outside the bib from root 16→32"* — was true and useless. `overflow-wrap: anywhere` and `minmax(0, auto)` are a pair that **converts an overflow into a break**, so the escape sweep was measuring the one failure mode the design had already made impossible. A containment measurement cannot see a legibility failure.

Fixed with two container arms on the bib's own inline size (`.bib` already declares `container-type: inline-size`):

| | condition | what gives way |
|---|---|---|
| Arm A | `< 14em` | the row's **name** takes a line of its own; the figures keep their shared columns, so `21.10` still sits over `22.45` |
| Arm B | `< 9em` | the **clock** takes a line too |

Arm B exists because a clock that wraps after `10:5` reads as a **different time**, not a damaged one — a figure that lies is worse than one that is hard to read.

**The threshold is in `em` because it has to be.** The broken widths *straddle* the healthy ones in px — 254px healthy at a 16px root, 245px broken at 32px, 208px broken on a tablet band — so no pixel threshold separates them. Divided by the reader's root size they separate cleanly: everything ≤ 13.08em wrapped, everything ≥ 13.63em did not.

Final sweep against HEAD: **0 wrapped, 0 escape, 50/50 bands.**

### Verdict table

| # | dimension | finding | verdict | disposition |
|---|---|---|---|---|
| 1 | method-audit | net-vs-gun clock **name** unpinned in both its sources | CONFIRMED | gate added, both mutations red |
| 2 | data-model | official clocks escape the `H:MM:SS` shape every other clock has | CONFIRMED | fixed (panel's remedy was red on correct data — both fields are optional) |
| 3 | data-model | `official` on a race that has not happened renders a stub link | CONFIRMED | data gate added |
| 4 | a11y | ledger collapses to one-character columns at 200% | CONFIRMED | fixed |
| 5 | layout | same defect, found independently | CONFIRMED | fixed |
| 6 | layout | `RECORDED` breaks at **default** size on 3 viewport bands; the 218px in the comment is not the floor | CONFIRMED | fixed by the arms; comment corrected |
| 7 | docs | README's strava-verify rationale falsified | CONFIRMED | rewritten |
| 8 | docs | strava-verify's own header still describes the old `km` field | CONFIRMED | rewritten |
| — | method-audit | finished race prints advertised km beside a recorded clock | **REFUTED** | the invariant is scoped to the ledger; the hero is defined as best-available |
| — | a11y | the km unit is no longer in text with its figure (SC 1.3.1) | **REFUTED** | `KM` *is* in the text stream, three nodes ahead — measured, 764 AX nodes |

Both refutations cite a `file:line` rationale the finder never engaged, which is the usual tell.

### The clock that could have lied

Worth calling out separately. The word saying whether an official time is **net** or **gun** had two sources — the component's ternary and the two constants — and **neither was held**. Swapping either shipped `net time 2:19:11` for a race whose sheet publishes a gun time and nothing else, with all 461 tests, `pnpm check` and `pnpm eslint` green.

On the 2022 half marathon the two clocks are **17 minutes 5 seconds apart**. Nothing on screen states which one is printed — the word lives in the results link's accessible name — so the reader using it is the only one told, and the only one who can be mis-told.

The gate writes the two words out as literals rather than reading `PATCHES`, for the same reason the Strava base URL is a literal a few tests above: deriving the expectation from the constant that drew the page cannot see that constant being wrong.

### What I checked that the panel did not

The 2-per-dimension cap dropped 14 findings unverified. I verified the three labelled major myself:

- **"CLAUDE.md says only an EARNED bib carries a ledger"** — true, and wrong. The DNF bib carries one too (confirmed in the shipped HTML). Corrected, and the correction says *why* it is the point rather than an edge case.
- **"A clock breaks mid-token into a readable but wrong figure"** — real, and it is what Arm B exists for.
- **"Finished + `official` + no recording prints the same figure twice"** — reachable (`today > end` makes any past race finished), but **zero such rows exist**, and it is not the duplication the booked branch refuses: that case repeats a distance and adds nothing, while this one attributes the figure to a named source and carries that source's clock. Documented in place rather than restructured.

### Accepted holes, named rather than closed

- **The hand-typed figures have no witness.** `advertised_km`, `net_time` and `gun_time` are transcribed from a results sheet and printed unconverted. Nothing can check them — there is no API behind a timing provider's page — and comparing them to the activity would be the *wrong* repair, since the two accounts are supposed to disagree. Guarded for shape and sense only (`H:MM:SS`, a gun time no shorter than its own net time, a race that is actually over). Named in `README.md`.
- **Table semantics.** The seeded question was argued and landed rather than dodged: 0 table/row/columnheader roles across 764 AX nodes, and the ledger reads linearly as a small table does, with `KM` in the text stream immediately before the figures. SC 1.3.1's second branch is "or are available in text", and it is.

### Gates

`pnpm test` **464 passed / 7 skipped** (was 461) · `pnpm check` 0 errors · `pnpm eslint` clean · every new gate mutation-verified red · all 7 commits signed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-126"></a>

## #126 — fix(patches): keep the ledger's unit with its figure at narrow widths

`merged` · opened 2026-08-04 by **calvindotsg** · merged 2026-08-04 as `aec893bd0` · `worktree-ledger-unit-narrow` → `main` · +203/−9 across 3 files

## Summary

Two follow-ups to #125, both found by **rendering the live site and looking at it**. No new feature — the ledger's unit now survives the container arms that #125 introduced.

- At the narrowest arm the `KM` heading was left standing over a stack holding a distance **and** a clock. The heading and an inline unit now swap, so the unit is stated exactly once at every width.
- The ledger's `overflow-wrap` then reached that new unit and split `160.56km` after the `k`, leaving **`160.56k`** alone on a line — which reads as a hundred and sixty *thousand*.

## Problem

#125 fixed the ledger shattering at WCAG SC 1.4.4's required 200%, and the fix works: re-verified on production at **112 bands** (4 pages × 8 widths × 2 themes × 3 root sizes) with 0 wrapped cells, 0 ink escaping any bib, no horizontal scroll, 15/15 distinct stub link names.

Every one of those measurements was clean, and every one was right. Then I looked at a screenshot.

In the `< 9em` arm each figure takes its own line. That leaves the `KM` heading — which exists to state the unit once, above a column — heading nothing:

```
        KM
OFFICIAL
      42.00
    2:19:11      <- a reader following KM down arrives here
```

**A heading pointing at the wrong figure is not a quantity any of those probes carry.** No wrap, no overflow, no contrast failure. It needed an eye.

## Solution

The heading and an inline unit **swap in the same arm**, so the unit is stated exactly once at every width — never twice, never zero times:

```
OFFICIAL
     42.00 KM
     2:19:11
RECORDED
     78.59 KM
     7:40:25
```

`.bib-ledger-unit` joins the two existing caption selector lists (`opacity: 0.8`, `font-weight: 700`), reusing the exact treatment of the heading it stands in for — so it **adds no new contrast pair**, which is provable as an equality rather than needing measurement.

### The second defect, which the first fix caused

Adding ` KM` costs width. At a 320px viewport and a 32px root the ledger split `160.56km` after the `k`. The *figure* was never wrong — the number stayed whole — but `160.56k` on its own line reads as 160,560. Six cells did this.

`white-space: nowrap` on the unit moves the break in front of it, so the line reads `160.56` and the unit follows on its own.

**I found this by sweeping, not by looking** — the screenshot I had checked was of the one bib whose `42.00` fits either way. One bib is not a sample.

## Test Plan

- [x] `pnpm test` — **465 passed**, 7 skipped (was 464) · `pnpm check` 0 errors · `pnpm eslint` clean
- [x] New gate **"states the ledger's unit exactly once, whichever carrier is showing"** holds the **pair**, not either rule: for every `@container` arm, heading-off must equal unit-on — reading the EFFECTIVE (last) declaration, plus a structural assertion that each carrier is decided by exactly one conditional rule and it is the same one. The first version of this gate compared per-prelude and folded silence into agreement; see the review comment.
- [x] **Seven mutations verified red:** unit off while the heading is off (a distance with no unit anywhere); heading on while the unit is on (stated twice); the unit span deleted from the markup (reddens 2); the `nowrap` guard dropped; a second same-prelude arm hiding the unit; a separate narrower arm hiding it; `white-space: normal` inside the arm where it renders.
- [x] **0 orphaned units** across the width × root-size matrix, calibrated — removing the row-span reproduces exactly 6 at 320×32.
- [x] `kmFigure()` strips the unit so ledger assertions still compare `22.45`, not `22.45 km` — without it every ledger assertion reddens at once, which is how the change announced itself.
- [x] **Rendered and looked at** at 320/390 × root 16/24/32, both carriers confirmed in a real browser: exactly one is showing at every size.
- [x] **No figure is ever split across lines** — swept 12 bands, 0 splits. Both detectors calibrated: the number-split detector fires at a 48px root (42 splits), the unit-split detector fires when the guard is stripped at runtime (6).

## What the review panel changed

A 9-agent panel found a **major defect in the gate this PR added**: `decl()` reads the first match of a property, and the minifier merges two rules sharing a selector and prelude into one body — so `{display:revert;display:none}` reads as `revert` while the browser paints `none`. Reproduced with **both carriers hidden, no unit on the bib, 465 tests green**. Fixed with a new `lastDecl()` plus a structural assertion, since a stylesheet gate cannot fold a cascade without becoming a browser.

The rendering was also still wrong: at 320×32 the unit orphaned onto its own line between the figure and the clock. The distance now takes the whole row there — 6 orphans to 0, calibrated.

Full verdict table in the review comment.

## Notes

- Beyond the 200% SC 1.4.4 requires — at a 48px root and above — numbers do split. That is `overflow-wrap: anywhere` doing its job, breaking rather than painting on the card, and it is outside the bracket the site undertakes to survive.
- At 320px × 200% the race *name* breaks mid-word (`ADVENTUR/E`) on a 190px bib. Pre-existing `break-word` behaviour, untouched here: breaking a word is acceptable where breaking a number is not.
- Two links on `/` are 16px tall against SC 2.5.8's 24px (`HeyMax`, `NCS Group`). Pre-existing, on a page neither PR touched, and plausibly covered by the inline exception since the height is the line-height of the text they sit in. Recorded, not addressed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


### Discussion (1)

**calvindotsg** — 2026-08-04

## Review panel: 3 dimensions, 13 findings, 6 verified, 6 confirmed

A smaller panel than #125's — 9 agents, one **reproducing** skeptic per finding, capped 2 per dimension. Nothing was refuted, and the worst finding was in **the gate this PR added**.

### The gate passed a page with the defect it exists to prevent

`tests/helpers/css.ts` `decl()` returns the **first** match of a property in a rule body. The build's minifier **merges two rules that share a selector and an at-rule prelude into one body** — so a second declaration for `.bib-ledger-unit` ships as `{display:revert;display:none}`. `decl` reads `revert`; the browser paints `none`.

Reproduced in a browser at 320×48px root: **both carriers hidden, no unit anywhere on the bib, 465 tests green.** Exactly the failure the swap gate was written to forbid.

A sibling hole in the same gate: it compared the two carriers *within one prelude*. A third, narrower arm can hide the unit while saying nothing about the heading — the lookup returns `undefined`, the loop folded that to "hidden", and silence read as agreement.

**Fixes**
- New `lastDecl()` reads the effective (last) value. Swapped in at **one** call site only — the skeptic measured that `decl`'s first-match semantics are load-bearing at ~111 others and explicitly warned against a blanket change.
- A stylesheet gate cannot fold a cascade without becoming a browser, so it now holds the **structure**: each carrier is decided by exactly one conditional rule, and it is the same rule. The multi-arm case becomes unrepresentable rather than merely unchecked.
- The `nowrap` gate was scoped to `r.at === ""` — every width at which the unit is *hidden*, and silent about the one arm where it renders.

### The rendering was still wrong

At 320px × 32px root the unit wrapped onto its own line, landing **between the figure and the clock**, where it reads as a caption for the clock — the same mis-cue the heading was removed for, one line lower.

The distance now takes the whole row in that arm. Measured **6 orphaned units → 0**, and the detector is calibrated: removing the fix reproduces exactly 6.

### Verdicts

| # | dimension | finding | severity | disposition |
|---|---|---|---|---|
| 1 | method-audit | swap gate reads the first `display`; minifier merges rules | **major** | fixed (`lastDecl` + structural assertion) |
| 2 | method-audit | `nowrap` gate scoped to the widths where the unit is hidden | minor | fixed |
| 3 | rendered | unit orphans onto its own line at 320×32 | minor | fixed (distance spans the row) |
| 4 | rendered | empty leading grid row in the `< 9em` arm | nit | **not taken** — remedy reddens the suite (`fix_is_safe: false`) |
| 5 | consistency | same orphan, reached from the design side | minor | covered by #3; the finder's own remedy is self-contradictory (`nowrap` suppresses the break opportunities `overflow-wrap` needs) |
| 6 | consistency | two contradicting paragraphs in the arm's rationale | minor | rewritten |

**Three mutations that previously shipped green now redden**: a second same-prelude arm hiding the unit, a separate narrower arm hiding it, and `white-space: normal` inside the arm where it renders.

### Dropped by the cap, recorded not dismissed

The 2-per-dimension cap left 7 findings unverified, including two labelled major: the unit's letter-spacing differing from the caption it replaces, and the unit's *text* being pinned to nothing (`kmFigure()` strips whatever it says, so a wrong unit is invisible to the suite). Neither is a correctness regression in this PR; both are worth a look later.

### Gates

`pnpm test` **465 passed / 7 skipped** · `pnpm check` 0 errors · `pnpm eslint` clean · all three commits signed · 0 orphans and 0 split figures re-measured across the width × root-size matrix.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-127"></a>

## #127 — fix(patches): track the ledger's inline unit like the caption it replaces, and gate what it says

`merged` · opened 2026-08-04 by **calvindotsg** · merged 2026-08-04 as `5a2f65810` · `worktree-ledger-unit-followups` → `main` · +223/−13 across 2 files

## Summary

The four follow-ups #126's review panel found but dropped unverified under its per-dimension cap — both of the ones it labelled **major**, plus the two minors that were in the same corner of the wall.

- The inline unit joined the caption selector lists and **still did not render like a caption**, because the property it differed on was named by neither list.
- The unit's *text* was pinned to nothing, and the helper that reads a ledger row was consuming it.
- The `km === ""` branch had no test, because no data reaches it.

## The defect the selector lists could not prevent

`.bib-ledger-unit` stands in for the `KM` heading at the narrowest widths. #126 gave it that heading's treatment by adding it to the two lists that define one — `opacity: 0.8` and `font-weight: 700` — under a comment saying, in capitals, that those must stay lists *precisely* so a heading and its column cannot drift apart.

It drifted anyway, on the one property no list names:

| property | unit | the caption beside it | |
|---|---|---|---|
| `letter-spacing` | **1.2px** | **2.4px** | ← |
| `font-weight` | 700 | 700 | |
| `opacity` | 0.8 | 0.8 | |

Measured on the rendered page at a 32px root, both on screen together.

**A selector list only confers what it DECLARES.** The other three captions are children of `.bib-ledger` and take its `0.12em` by inheritance. The unit sits inside the *figure* cell, whose tracking is tightened to `0.06em` so a run of tabular digits reads as one quantity — so inheritance hands the unit the figures' value instead. The rules read as equivalent; the render was not.

The fix restates the ledger's own value. The gate compares it against the ledger's *declaration* rather than a literal, so moving one moves both.

## Re-swept, because the fix widens the unit where there is least room

30 bands — three pages × 10 width/root combinations, 16px to 32px root: **0 orphaned units, 0 split figures, 0 wrapped cells, no horizontal scroll**, across 120 rendered units.

Calibrated rather than asserted. Removing the row-span reproduces **exactly 6 orphans at 320×32** — and the suite stays **green** through that, which is why the sweep exists.

## A stale measurement, corrected in place

The re-sweep turned up something the panel did not ask about. Two comments claimed, in the present tense, that stripping the unit's `white-space: nowrap` splits six cells. **It splits none today.**

The arm that gives the distance a whole row landed *after* the `nowrap` guard, and a two-letter unit on a whole row has nothing left to break against. Two guards came to overlap.

`nowrap` is kept — a unit longer than `km` still reaches the `160.56k` failure, and this is the only thing in front of it. That was **verified reachable rather than assumed**: with the declaration off, a twelve-character unit splits on **48 cells** at the very widths that report zero for `km`. Both comments now say this instead of the number that expired.

## The gate that was consuming the thing it should have checked

`kmFigure()` stripped the unit from the figure by `cell.textContent.replace(unitText, "")`. That is wrong in two directions:

- It removes the **first** occurrence of whatever the unit says — a unit reading `2` turns `22.45` into `2.45`, a corrupted figure every ledger assertion then agrees with.
- It treats the unit's text as an **input** rather than a claim, so a wrong unit is stripped exactly as obediently as a right one.

**Measured, not argued:** rendering an *empty* unit leaves the pre-change suite at **465 green**, because `"22.45".replace("", "")` is the identity. The unit could say nothing at all and nothing would notice.

The figure is now read from the cell's own **text nodes**; the unit is a child element. The hazard becomes unrepresentable rather than guarded, and the unit's text is pinned separately — to the goal's `measurable_unit`, the same source the heading it replaces is held to.

## The branch no data reaches

A race remembered with a finishing time and no recording earns a `RECORDED` row carrying a clock and **no honest distance** — `raceKm` would fall back to the advertised figure, which would have the bib claim a course the site has no evidence he rode.

Zero events reach it. That was established by **executing the predicate over `EVENTS`**, not by grepping — a line-oriented search answered *ten* and was wrong, because the records are multi-line and `recordings:` sits on a continuation line.

It is now a component fixture, including a two-row ledger where one row has a figure and one does not — the only place the unit's per-**row** conditionality is visible at all.

## Test Plan

- [x] `pnpm test` **468 passed** / 7 skipped (was 465) · `pnpm check` 0 errors · `pnpm eslint` clean · both commits signed
- [x] **Six mutations verified red:** unit tracking deleted; tracking set to the figures' `0.06em`; the unit saying the wrong word; the unit saying nothing; the unit emitted unconditionally on a row with no figure; the recorded row borrowing the organiser's distance
- [x] **Control, old vs new on the same mutation:** an empty unit is **465 green** against the pre-change suite and **red** against this one — which is what makes the pin a gate rather than a restatement
- [x] **Computed-style diff** against a rendered sibling caption, before and after: `letter-spacing` leaves the drift list; the two survivors are explained rather than fixed — `font-variant-numeric: tabular-nums` is inert on letters, and `white-space: nowrap` is deliberate
- [x] **All four detectors calibrated on a known-true stimulus.** Orphans, split figures and wrapped cells fire hard past 200%; `splitUnits` reported zero everywhere, so it was fired deliberately with a long unit — **48 splits** — before its zero was trusted
- [x] **Rendered and looked at** at 320/390 × root 16/32, both themes: the narrowest arm reads `RECORDED / 160.56 KM / 10:56:17` with the unit tracked to match the caption above it, and the default band still shows the three-column `KM` / `TIME` form

## Notes

- `font-variant-numeric: tabular-nums` reaches the unit by the same inheritance and is deliberately **not** reset — it affects digits, and the unit is letters. Adding a declaration for zero visual effect would be noise.
- The race name still breaks mid-word (`ADVENTUR/E`) on a 190px bib at 200%. Pre-existing and untouched, recorded in #126: breaking a word is acceptable where breaking a number is not.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-128"></a>

## #128 — feat(events): book the OCBC Cycle Johor Bahru 42 km for 11 October

`merged` · opened 2026-08-05 by **calvindotsg** · merged 2026-08-05 as `d3c62bcc6` · `worktree-events-ocbc-jb-2026` → `main` · +66/−29 across 3 files

## Summary

- Books **OCBC Cycle Johor Bahru, 11 October 2026, 42.00 km** — the 42 km City Ride, entered solo.
- It is the **same race as the DNF already on the wall**, so that name now appears twice in two states: an outline for October beside December's abandoned bib.
- Booking a race is never only a data edit. `bookedAhead` subtracts it before the rate is divided out, so **every pinned figure it moved is re-derived rather than relaxed.**

## The row

```ts
{date: "2026-10-11", name: "OCBC Cycle Johor Bahru", advertised_km: 42.00, sport: "cycling", country: "Malaysia"},
```

Two things the comment beside it records, because neither is visible from the row:

**The repeated name needs nothing.** Every bib carries its own date, and the wall's tests key on **position** rather than on `name` — the helper that pairs a rendered bib with its race says so in capitals, having been fixed the first time an annual race arrived twice.

**42.00 is the DIVISION entered, not a fact about the event.** The organiser sells a 21 km entry to the same start line — two laps of one city circuit — so the same name with `21.10` beside it would be a correct row for a different race to ride.

## What it moved, re-derived at the stamp the tree carries

| figure | before | after |
|---|---|---|
| cycling card's required rate | `73 km/wk to go, 1022 booked` | **`71 km/wk to go, 1064 booked`** |
| booked-vs-unbooked pair (header block) | 118 → 71, 40% | **121 → 71, 41%** |
| de-raced < required < observed | 60.55 / 70.82 / 79.82 | **58.99 / 70.27 / 78.72** |
| ceil-not-round example at the pinned 2026-07-27 | 75.2411, round delivers 1692.86 of 1698.30 | **73.3804, round delivers 1647.71 of 1656.30** |
| sport-days where round under-states | 150 of 290 | **146 of 290** (re-measured, not scaled) |

The header block asks for exactly this — *"If you change a race, re-derive this block"* — and the two assertions that read live `EVENTS` on purpose went red, which is the feedback they exist to give.

**One stale figure fixed on the way past.** The de-raced pace of 60.55 was computed while 10 July counted 140.49 km rather than the escort's 22.55 beside it; it is now 2440.3 less this year's four recorded cycling races (611.74) over the same 31.0 weeks, with the subtraction spelled out so the next reader can check the term that went missing. The pinned stamp also said 2026-08-02 while the tree carries 2026-08-05.

**Two roles that did NOT move, which is why they were measured rather than reasoned about.** 27 July still rules `round` out and 28 July still cannot discriminate — the last edit of this size swapped them.

## Test plan

- [x] `pnpm check` — 0 errors
- [x] `pnpm eslint` — clean
- [x] `pnpm test` — **468 passed**, 7 skipped, 1 file skipped (the opt-in Strava verify)
- [x] Rendered `dist/` read, not just built:
  - `/patches/cycling` prints `11 OCT 2026 · Ride · Booked · 42.00 km · OCBC Cycle Johor Bahru · Malaysia`, sorted ahead of the November tour, counts `All 14 / Running 4 / Cycling 10`
  - home page cycling card reads `71 km/wk to go, 1064 booked` and `Next race in 9 weeks`
  - `llms.txt` row: `- 2026-10-11 — OCBC Cycle Johor Bahru, 42.00 km, Malaysia`
- [ ] CI green before merge

No Strava call was involved and none was possible: a booked race has no recording, by the type.


---

<a id="pr-129"></a>

## #129 — refactor: apply the ponytail audit and close its review panel

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `8ce7565e0` · `worktree-ponytail-audit-2026-08-07` → `main` · +997/−1142 across 36 files

## Summary

- Applies all 11 findings of the `/ponytail-audit` whole-repo report (`.scratchpad/ponytail-audit-2026-08-07.md`, run read-only at `0292003`): **36 files, −145 net lines**, with `postcss` replacing a hand-rolled CSS parser, one WCAG contrast helper replacing three, one forced-colours rule replacing eight, and ~60 comment paragraphs losing their archaeology.
- A **13-agent review panel** then found 18 issues in that work. The 9th commit closes them — including one MAJOR that I introduced *while thinking I was strengthening a gate*.
- Gates green throughout: **478 assertions**, `pnpm check` 0 errors / 2 hints, `pnpm eslint` clean.

## Problem

`src/` carries 2.4 comment lines per code line, and the audit found that ratio is where the mass is: four of its top five findings were prose, not code. Underneath that, three real duplications had accumulated — a brace-counting CSS parser doing a job `postcss` was already on disk for, WCAG luminance written three times with three different hex conventions, and one `@media (forced-colors: active)` icon rule copied into eight components across 211 lines.

## Solution

Eight commits, one per finding class, each carrying the mutation that settles it:

| | change | settled by |
|---|---|---|
| 1 | `parseRules`/`splitSelectorList` → postcss; a nested at-rule is now **read** rather than thrown on | rule-for-rule parity on all 5 pages + the nesting mutation run both ways |
| 2 | `tests/helpers/contrast.ts` replaces three implementations | pinning `contrast` to 1 reddens 30 assertions across all three files |
| 3 | one selector model for both of the wall's cascade resolvers | `.bib--dnf:first-child` reddens 2 now, passed **98/98** before |
| 4 | `dns/test_drift.sh` → six `it.each` rows, so they run on every PR | deleting `drift.sh`'s contradiction branch reddens exactly one case |
| 5 | eight forced-colours copies → three rules in `BasicLayout` | per-element resolution on all 5 pages: **0 lost, 0 changed, 31 gained** |
| 6 | `.bib--dnf` joins `.bib--booked`; duplicated mode blocks merged | effective-cascade diff: declaration-for-declaration identical |
| 7 | `--on-brand` and `stampYearMatchesGoalYear` deleted | both had a written keeper that survives them |
| 8 | ~60 comment paragraphs keep the correction, drop the confession | both builds hash-compared: **17 files, 0 differing bytes** |

**Commit 5 is scoped more narrowly than the audit proposed.** It asked for `span[aria-hidden]`; the rules are keyed to presetIcons masks (`[class^="i-"]`) instead, because `forced-color-adjust: none` lets *all* author colour through and the guidance is to keep it tightly scoped ([Higley](https://sarahmhigley.com/writing/forced-color-adjust-none/)).

### What the review panel changed

**MAJOR — the per-page forced-colours floor stopped discriminating.** Commit 5 gave every page a forced-colours rule for free, so `forced.length > 0` became satisfiable everywhere by three rules no page owns; I then removed the 404's carve-out reasoning "every page ships them now" — true, and precisely why the floor could no longer bite. Measured: **every forced-colours rule the patch wall owns could be deleted with the suite green at 475.** The floor now counts page-owned rules, and the 404 is exempt by name again but *asserted* with `toBe(0)` — without that arm a typo'd predicate silently reopens the hole.

**Two dimensions independently caught a real bug in the new parser.** `descend` emitted a container's declarations before its nested at-rules, so `.control{@media (max-width:40rem){width:7rem}width:3rem}` resolved to `7rem` at 320px where Chromium paints `3rem`. Declarations now flush in runs, in source order.

**"Declaring postcss downloads nothing" was false** — `^8.5.26` re-resolved postcss for `rolldown-vite`, the production CSS pipeline. Pinned to `^8.5.24`; the lockfile diff is now three lines.

Five findings were real and **deliberately not fixed** — two whose remedies a skeptic measured as reopening the hole they close, one REFUTED, and four ungated prose figures. All are recorded in `plans/README.md` under "Findings considered and rejected" so the next run neither re-derives them nor "fixes" a non-defect.

## Test Plan

- [x] `pnpm test` — 478 passed, 7 skipped (16 files)
- [x] `pnpm check` — 0 errors, 0 warnings, 2 hints
- [x] `pnpm eslint` — clean
- [x] Forced-colours parity resolved **per element** on all five built pages, base vs head: 0 lost coverage, 0 changed colour, 31 marks gained
- [x] Commit 8 proven to change no shipped byte (both builds hash-compared, content-hashed asset names normalised)
- [x] Every review fix re-mutated **both ways** — the survivor goes red, and the original red direction stays red
- [x] `parseRules` differential-tested against the old implementation over 22 CSS shapes, plus a real Chromium cross-check of the nesting case
- [ ] CI `build` job green before merge (`pnpm check` + `pnpm eslint` + `pnpm test`, with both deploy jobs behind `needs: build`)

## Notes for the reviewer

**This is larger than the 200–400 line target** (997+/1142−) and deliberately not split. It is one audit applied in full: the findings interlock (commit 5's consolidation is what makes commit 9's floor fix necessary), every commit is independently green, and splitting would mean re-running the same whole-suite verification eight times against eight bases. Reviewing it commit-by-commit is the intended path.

`.devin/wiki.json` is untouched: it is gated for *durability* rather than accuracy, and none of these changes adds a fact it should carry.

## Related Issues

None — this repository tracks work in `plans/`, not Linear. The audit report and its drop list are in `plans/README.md`.


---

<a id="pr-130"></a>

## #130 — feat(plans): treat a proposal as its own document class, and land plans 018-023

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `232f75189` · `worktree-plan-018-live-plans` → `main` · +1351/−17 across 10 files

## Summary

- Adds a **third document class** to `tests/docs-drift.test.ts`: a numbered plan is a *proposal*, and is exempt from the three gates that check a name against the tree that **exists**.
- Lands **six plans, 018–023**, in `plans/` — the first live plans since 2026-07-29.
- Records what governs `plans/` as a **pointer** to the improve pipeline, writing down only what is local to this repo.

> **Three commits, and the later ones correct the earlier.** `a68903c` proposed plan 018 and staged 019–023 outside the tree. `9686ebf` executes 018 and **supersedes that approach** — the staging was wrong and is gone. `12fcbdb` applies a 13-agent review panel. Read the last two as the accurate account.

## Problem

Every plan sat in `plans/done/`, which `docs-drift` exempts as an archive. That reads as "archives are stale by nature", but the property that actually matters is different: **a plan is a proposal, and a proposal names the tree it intends to create.**

Three gates iterate `liveDocs()` and each checks a name against the tree that *exists*. Measured with all six plans present:

| gate | misses |
|---|---|
| `names no file that is not there` | **51** |
| `names no pnpm script that is not in package.json` | **7** |
| `names no configured value that is declared nowhere` | **0** — unexercised |

The clearest single case: plan 019 names the two scripts CLAUDE.md already warns do not exist here, inside a sentence whose entire purpose is to warn an executor about exactly that. A document penalised for saying the true thing this suite exists to enforce.

This is a gap rather than a regression, and the dates say why nobody hit it: 016 and 017 sat at top level until 2026-07-29, and `docs-drift` landed 2026-07-31. **The two had never met.**

## Solution

**One predicate, three gates, nothing else.** `isProposal` is anchored to the `NNN-` prefix so the distinction is structural rather than a judgement about a filename. `plans/README.md` is not a proposal and stays fully gated — its execution table and baseline are claims about now. So is `tests/docs-drift.test.ts` itself, which reddened on the first draft of its own explanatory comment.

**Non-vacuity comes from the predicate, not the tree.** The first draft asserted that some live plan is *currently* exempted. That reads as the stronger check and is the weaker one: it passes only while `plans/` happens to hold a live plan, so **archiving the last one turns it red** — and "completed plans move to `done/`" is the first local rule this directory writes down. The gate would have punished someone for following the documented lifecycle and blamed the exemption while doing it. It now asks the predicate about a filename, which is unconditionally answerable.

**Controls, because an exemption is the gate's new single point of failure:**

| stimulus | result |
|---|---|
| bad path + bad script name **inside a proposal** | green — the exemption does work |
| the same two tokens in `plans/README.md` | **red**, naming both |
| the six plans **without** the exemption | **red**, 51 + 7 misses |
| `isProposal` broken so it never matches | **red**, with the intended message |
| every plan archived to `plans/done/` | green — the defect the first draft had |

**The configured-value gate is exempted while unexercised.** The class is what is being exempted rather than the three symptoms, and the reason is the one `uno.config.ts` already gives when it safelists an icon class another constant emits: a member left out of a set it belongs to fails silently the first time it is needed.

**The standard is a pointer, not a copy.** `plans/` implements the improve pipeline from `github.com/shadcn/improve`; none of the pipeline is restated. What is written down is only what upstream cannot tell you: the `plans/done/` archive convention, the override of the user-level rule about where a plan is drafted, the proposal class, and that **a plan never waits outside `plans/`**.

## Review

A 13-agent panel — six cold-start lenses, an adversarial skeptic per lens, a completeness pass — raised **24 findings, 6 blocking**, all applied in `12fcbdb`. The ones worth naming:

- **The vacuity floor failed on correct code** (two lenses, independently). Fixed as above.
- **The script figure was wrong** — 5 became 7. The 5 was measured on plans 019–023 before plan 018's own text quoted those two scripts, and three downstream restatements re-scoped to "six" without re-measuring. 51 reproduces exactly.
- **The third document class needed saying in four places**, not one — `CLAUDE.md`, `README.md`, `plans/README.md`'s baseline row, and the header of the very test file being changed, which still opened "TWO KINDS OF DOCUMENT LIVE HERE".
- **Monotonic numbering was upstream's rule wearing a local label** — `SKILL.md`'s rule, sitting under a heading that promises only what cannot be derived from upstream. Deleted; the execution table is the genuinely local fact.
- Plan 019's `AT_REF` is now scoped per figure (the literal reading zeroes `bookedAhead` and collapses two figures onto one number its own verify would pass), its frozen triple moves to `tests/helpers/` rather than being imported from another test file (which re-registers 54 cases twice on vitest 4.1.10), and a STOP condition that pinned a digit computed on the wrong denominator convention now names the definition to re-check.

## Test Plan

- [x] `pnpm check` — 0 errors, 0 warnings, 2 hints
- [x] `pnpm eslint` — clean
- [x] `pnpm test` — **479 passed**, 7 skipped (478 before; one new assertion)
- [x] All five controls in the table above, executed
- [x] Self-control: the gate caught `pnpm typecheck` in this test file's own comment, confirming non-proposals are unaffected

## What this does not do

It does not execute plans 019–023. Those are the actual work — decoupling race data and site copy from the code that renders them — and 021 changes a standing configuration rule, so its STOP conditions require maintainer sign-off before it starts.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-131"></a>

## #131 — docs: stop CLAUDE.md counting a set that lives in plans/README.md

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `f79e57fa4` · `worktree-fix-plans-enumeration` → `main` · +9/−5 across 1 files

## Summary

CLAUDE.md's new `## Plans` section enumerated what this repo records as local, and was wrong in both directions within one commit of being written. It now names where the list lives instead of repeating it.

## Problem

The section said the local facts are *"the archive convention, the numbering, and the fact that a plan is authored into `plans/` rather than a home directory."*

- **"the numbering" is not local.** #130's own review found the monotonic-numbering bullet was upstream's rule (`SKILL.md`) sitting under a heading that promises only what cannot be derived from upstream, and deleted it from `plans/README.md`. CLAUDE.md kept advertising it.
- **Two of the four are missing** — the proposal document class, and the rule that a plan never waits outside `plans/`.

**No gate can see this.** Prose enumerating a set is one of the three rot classes `tests/docs-drift.test.ts` is structurally blind to — it resolves names that must *exist*, and a count or a list in a sentence is neither. It is the class plan 023 exists to sweep by hand, and it produced a defect here inside a single PR.

## Solution

Stop counting. The paragraph now names `plans/README.md` as where the list lives and says why it is not repeated — which is the same argument the section already makes about upstream, applied one level in. An enumeration kept in two places is an enumeration that will disagree with itself.

## Test Plan

- [x] `pnpm check` — 0 errors, 0 warnings, 2 hints
- [x] `pnpm eslint` — clean
- [x] `pnpm test` — 479 passed, 7 skipped (unchanged)
- [x] `plans/README.md`'s local list is unchanged and remains the single source

Documentation only; no site output changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-132"></a>

## #132 — docs(plans): archive 018, and record the sign-off plan 021 was waiting on

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `0ee97b494` · `worktree-archive-018-signoff-021` → `main` · +91/−10 across 5 files

## Summary

- Archives plan **018** to `plans/done/` — it is implemented, so the directory's own lifecycle applies to it.
- Records the maintainer **sign-off** that plan **021**'s STOP condition was waiting on, with its scope.
- Small consequential fixes: the index row takes the repo's SHA form, and 019's dependency parenthetical stops describing a state that has passed.

## The archival, against upstream's convention

Upstream marks a finished plan DONE in the index and leaves the file where it is — `skills/improve/references/closing-the-loop.md`: *"Update index status to DONE"* (`:65`) and *"Don't delete plan files — they're the record"* (`:77`). It defines **no** archive directory of its own, so moving satisfies both instructions and the repo-owner convention wins. `plans/README.md` already records `plans/done/` as a local deviation and says what upstream does instead.

**The move is also a control.** The review panel's blocking finding on #130 was a non-vacuity floor that counted *live* plans — so archiving the last one would have turned it red, the gate punishing someone for following the rule the same directory documents. It now asks the predicate about a filename instead. This archival is the first real exercise of that fix: **479 passed, unchanged.**

## The sign-off

Plan 021 refuses to start without it, because it makes a standing configuration rule false and rewrites it — and the rule is the maintainer's rather than the repository's. Granted, and now recorded in the plan rather than living in a conversation:

> *"a GitHub repository secret, a GitHub repository variable, or `src/lib/constants.ts`"* becomes *"…or `src/content/` and `src/data/`"*, counted as one home so the sanctioned-homes count stays at three. The allocation table is approved with it, including `RAW_GOALS` and `GOAL_YEAR` under `src/data/` rather than `src/lib/`.

The STOP condition now fails closed on **scope** as well as absence: it stops if the sign-off is missing *or* if the plan's Scope has grown past what the sign-off names. Sign-off is not approval to change copy text, to touch `uno.config.ts` beyond its import lines, or to alter site output — the `dist/` hash-compare in step 5 is what holds that boundary.

## Test Plan

- [x] `pnpm check` — 0 errors, 0 warnings, 2 hints
- [x] `pnpm eslint` — clean
- [x] `pnpm test` — 479 passed, 7 skipped (unchanged; archiving a plan does not move the count, which is the point of the #130 fix)
- [x] No live plan references `plans/018` as a path; 019's dependency line updated to reflect that 018 is done

Documentation only; no site output changes. Plans 019–023 remain TODO and will be executed in a separate session.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-133"></a>

## #133 — docs(projection): generate the derived figures instead of writing them by hand

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `14d652e2f` · `plan/019-gate-derived-figures` → `main` · +793/−85 across 7 files

Executes [`plans/019-gate-the-derived-figures.md`](plans/019-gate-the-derived-figures.md).

`src/lib/projection.ts`'s header block carried six derived figures and told the reader, in bold, to
re-derive them when a race changed. Nothing gated them, and six were wrong on `main` with the suite
green — five pinned to the bot's live stamp, which rots on a push that moves only the date. The cost
was never the wrong digits: **not one of the six had its definition written down anywhere**, so a
reader had to reverse-engineer "the de-raced pace" from a shipped value before they could tell
whether it had rotted.

This writes the definitions down once, in code, and publishes what they produce as a generated file
the suite regenerates. A data edit now produces a diff instead of an archaeology session, and the
diff is the re-derivation.

## What changed

- **`tests/derived-figures.test.ts`** (new) — computes every figure from the real
  `goalStatus` / `bookedAhead` / `raceKm`, and writes `src/lib/derived-figures.md` via
  `toMatchFileSnapshot`.
- **`src/lib/derived-figures.md`** (new, generated, committed) — the figures **with their
  derivations**, which is the half that was missing.
- **`tests/helpers/reference.ts`** (new) — the frozen `AS_OF` / `CYCLING_KM` / `RUNNING_KM` triple
  moved out of `tests/projection.test.ts` so both files import one declaration. It is a move:
  the values and the rationale comment are unchanged. `tests/projection.test.ts` is not imported
  from another test file — on vitest 4.1.10 that re-registers its 54 cases under the importer and
  runs them twice.
- **`src/lib/projection.ts`** — comments only. Every argument survives (the double count, the
  comparator rule, "the ORDERING is the rule; the gaps move", why ceil rather than round); every
  rotting digit is deleted and points at the generated file instead.
- **`package.json`** — `test:update`. **`README.md`** — names the new suite.

## The one deviation from the plan, and why

**The plan's step-2 precondition is unsatisfiable on this tree.** It asks the test to FAIL if any
recorded `GOAL_YEAR` race post-dates `AS_OF`. Two do — `2026-07-29 Garmin Run Virtual Challenge`
(10.16 km) and `2026-08-02 Pesta Sukan Round Island Bike Adventure` (160.56 km). A literal
implementation reddens the suite, contradicting the plan's own done criteria, and the plan's stated
remedy (advance the reference) moves every assertion in `tests/projection.test.ts` — which the
plan's own Scope section assigns to plan 022.

So the refusal became a **disclosure**. The scoping the plan calls "the whole point" is implemented
exactly as specified — the de-raced numerator subtracts only races ridden by the reference — and the
two races that sit in neither account are **named in the generated document**, with a section saying
why they are in neither, plus an assertion that fails if a future recording is missing from that
list or leaks into the numerator. The epoch mix is stated rather than silent.

Materiality, measured: `bookedAhead` skips both (a recorded race is already ridden) and the frozen
totals exclude both, so the published cycling required rate is 74 km/wk — **exactly what
`tests/projection.test.ts` already asserts for the same triple**. No new figure is introduced; the
document now says why.

## Mutation evidence

Every new gate was proved able to fail. Each mutation was applied to one file, confirmed to have
landed (`git diff --quiet` on the exact path), run, and reverted against `HEAD`:

| mutation | result |
|---|---|
| one recording's `metres` changed by a single digit (`130033.0` → `130133.0`) | **RED** — snapshot diff naming the two figures that moved: de-raced pace `61.54 → 61.53`, races ridden `451.18 → 451.28 km` |
| the de-raced numerator stops excluding post-reference races | **RED** — `keeps the de-raced numerator inside the frozen totals`, plus the snapshot |
| the disclosure list forced empty (post-reference races hidden) | **RED** — same assertion, plus the snapshot |
| `bookedAhead` asked at year end, so nothing is booked | **RED** — `asks more of a sport that books no races than of one that does`, plus the snapshot |

The third of those is the check the plan singles out: handing the reference-scoped list to
`bookedAhead` books nothing, the required rate and the ignoring-races comparator collapse onto one
number, and a "finite and non-zero" sweep passes on all of it. The strict inequality is what catches
it.

**`toMatchFileSnapshot` fails under `CI=true` rather than writing silently** — checked deliberately,
because the plan names the opposite as a STOP condition. The published `.md` was not rewritten by
the failing run.

## Verification

| gate | result |
|---|---|
| `pnpm check` | 0 errors, 0 warnings, 2 hints |
| `pnpm eslint` | exit 0 |
| `pnpm test` | **483 passed / 7 skipped**, up from 479 on `main` |

## Notes

- The `withBooked` **width-measurement specimen strings** (`71 km/wk to go   83.56`,
  `` `71 km/wk to go, 1022 km booked` measures 182.59px ``) are left intact. Those digits are the
  measured px width of one exact string; deleting the string falsifies the measurement, and this
  repo holds measurement as ungated.
- Two of the deleted digits were still **correct** (`73.3804 / 1,647.71 / 1,656.30` and "146 of the
  290" all reproduce at the reference). They went because they are pinned and ungated, not because
  they had rotted.
- `daysRemaining`'s inclusive convention was checked against the plan's STOP condition 4: inclusive
  gives a de-raced cycling pace of 61.54, exclusive gives 61.83 — the figure the plan warns an
  earlier draft used. This matches the definitions table.


### Discussion (1)

**calvindotsg** — 2026-08-07

## Review panel — 12 agents, 4 dimensions, 0 deaths

17 findings (2 MAJOR, 8 MINOR, 7 NIT). Every MAJOR was verified by an adversarial skeptic that
reproduced it by **execution**; MINORs verified to a cap of 6; NITs and 2 MINORs passed through
unverified and are listed at the bottom as *unverified, not cleared*.

**The skeptics were worth more than the finders.** On both MAJORs they judged the suggested remedy
**unsound** and built a better one. Fixes landed in `5cb69e5`.

### Confirmed and fixed

| sev | finding | resolution |
|---|---|---|
| **MAJOR** | The document's whole argument — `de-raced < required < observed` — had **no assertion**, and `render()` prints "the requirement does not sit between the two paces" under a heading saying the ordering *is* the rule. A skeptic made the document self-contradictory with all four tests green under `pnpm test -u`. | The heading now derives from `demonstratesOrdering()`, so the document can never contradict itself; the flip is a loud snapshot diff. New `never publishes a comparator section that contradicts its own heading` holds the unconditional invariant (`deRaced < observed` where raced, `===` where not) plus a non-vacuity floor. `projection.ts`'s "sits BETWEEN the two paces" softened to the durable half. |
| **MAJOR** | `expect(f.booked).toBeGreaterThan(0)` **reddens on correct data** — recording the two remaining 2026 running races is legal, imminent and certain, and `-u` cannot clear it. Found independently by two dimensions. | Asks the **wall's own predicate** (`patchState`) rather than counting the tree's contents. Per sport: unconditional `booked >= 0` and `ignoringRaces >= required`; then either `booked === 0` in the exempt arm (asserted, never skipped) or `booked > 0` **and** `ignoringRacesExact > requiredExact`. |
| MINOR | The epoch mix was disclosed but never **priced**, and the `POST_REFERENCE` docblock promised "a future recording cannot quietly widen the gap" — measured false: a future recording widens it 4.43 km/wk with `-u` fully green. | The disclosure now prices it per sport (`cycling: overstated by 7.11 km/wk … 9.7% of the 73.3804 published below`) and the `required rate` **cell** carries the caveat, because prose two sections up does not travel with a copy-pasted table cell. The false guarantee is gone. |
| MINOR | The scoping test's docblock said "ASSERTED ON A FIXTURE"; it ran on the live calendar, and both sets it compared were built by the predicate it then re-checked — a tautology. | Predicates lifted to `riddenBy` / `recordedAfter`, disclosure text extracted to `disclosure()` (verified output-neutral). New fixture over a hand-made 4-race calendar including one race **exactly on the reference day** — without it the inclusive→exclusive boundary mutation is fully green. Live case kept and retitled for its floor. |
| NIT×5 | Two published rows absent from the derivation table the lede promises; no non-vacuity floor on the ceil-vs-round census; `test:update` named nowhere; the rotting digits deleted from `projection.ts` surviving hand-typed in `tests/projection.test.ts`'s comment. | All fixed. The `projection.test.ts` edit is **comment-only** — no assertion in that file was touched. |
| NIT | "six of them were wrong at once", restated in three files, reproduces only under a partition none of them states — re-derived, **five** of the six named figures were wrong (`71` was correct) and counting everything gives seven. | Replaced with "every figure in that block except the ceiled required rate". No bare numeral in any of the three files. |

### Refuted, with the evidence — recorded so they are not re-found

- **`AS_OF` literals not migrated out of `tests/projection.test.ts`.** Pre-existing: the identical
  literals are at the same lines on `origin/main`, and the same stimulus produces the same
  asymmetry there. Not this PR's defect.
- **The disclosure "names the wrong cause".** The finding's counterfactual is a definitional no-op —
  deleting a row that is *in neither account* holds that property fixed, so it cannot test the
  sentence's antecedent.

### Deliberately NOT done

A percentage **bound** on the epoch mix was proposed and built. Rejected: the threshold would be
arbitrary, and its only remediation — advancing the reference — moves every assertion in
`tests/projection.test.ts`, which this plan's own Scope assigns to plan 022.

### Verification of the fixes (a review fix is a claim, so each was re-measured)

| stimulus | result |
|---|---|
| every remaining running race recorded — **correct data** | only the snapshot fails; named assertions green and `-u` clears it |
| `bookedAhead` handed the reference-scoped list (the anti-`AT_REF` probe) | still **RED** on a named assertion — the old hole did not reopen |
| de-raced numerator stops excluding post-reference races | still **RED**, now on four assertions |
| inclusive boundary flipped to exclusive | **RED** — fully green before the new fixture |

`pnpm check` 0 errors / 2 pre-existing hints · `pnpm eslint` exit 0 · `pnpm test` **486 passed |
7 skipped**, from 483 on the reviewed commit and 479 on `main`.

### Unverified, NOT cleared

Passed through without a skeptic (2 MINOR over the cap, 7 NIT). Two were fixed anyway above;
the rest are recorded rather than actioned:

- the de-raced numerator is all-or-nothing on `end_date` while `bookedAhead` pro-rates the same
  span — a design difference, not a defect;
- the epoch-mix disclosure not naming its direction/size — **superseded**, fixed above.


---

<a id="pr-134"></a>

## #134 — docs(plans): mark 019 done and archive it

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `86f9a15b5` · `archive/019` → `main` · +85/−3 across 3 files

Closes out plan 019, merged as `14d652e` (#133).

- `plans/019-gate-the-derived-figures.md` → `plans/done/`, verified as a 100% rename so the file's contents are provably unchanged by the move.
- `plans/README.md`: the 019 row becomes **DONE** with its squash SHA, the header's *"019 is next"* becomes 020, and the baseline test row is **replaced** — 486 assertions across 16 files, strava-verify now the 17th — rather than appended to, which is what that row's own instruction demands.
- `plans/done/README.md`: the Run 5 log. It carries what the plan file cannot — that the plan **contradicted itself** (its step-2 refusal is unsatisfiable on this tree and its stated remedy is out of its own scope), the review panel's two MAJORs with the skeptics' corrected remedies, the two REFUTED findings with their evidence, the bound that was built and deliberately rejected, and the six-stimulus verification table.

`pnpm test` 486 passed / 7 skipped — `docs-drift` gates `plans/README.md` in full, so this is not a free edit.


---

<a id="pr-135"></a>

## #135 — refactor(events): make each race its own module

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `46119aeb9` · `plan/020-one-module-per-race` → `main` · +1267/−770 across 32 files

Executes [`plans/020-one-module-per-race.md`](plans/020-one-module-per-race.md).

Adding a race meant a unique-match edit into a 1,900-line file in which three rows share the name
`Pesta Sukan Round Island Bike Adventure` and two share `OCBC Cycle Johor Bahru`. The failure mode
is a silently wrong edit, and the reader — human or agent — had to load 116 KB to make a 20-line
change. It is now a `Write` to a new path: no read-before-edit, no unique-string requirement, no
ambiguity. Every compile-time guarantee is kept, which is why this is TypeScript modules rather
than Markdown with a schema.

## What changed

- **`src/lib/race.ts`** (new) — `RaceEvent`, `Recording`, `OfficialResult` and the five derivation
  helpers, moved out of `constants.ts` with their comments intact.
- **`src/data/races/*.ts`** (new) — 14 race modules plus `index.ts`, which globs them and **sorts by
  the `date` field, not the glob key**. Sorting by key would make the filename a second, unchecked
  copy of `date`, and `src/pages/llms.txt.ts` renders in array order into a shipped artifact.
- **`src/data/races/README.md`** (new) — the procedure beside the data: both edit orders and which
  applies when, and that a **booked** race inside `GOAL_YEAR` moves the required rate while a past
  one does not (`constants.ts` said "a data edit and not a code change", true of a past race and
  false of a booked one).
- **`tests/data-contract.test.ts`** (new) — five invariants, each proved to fail on its own stimulus.
- 11 importers retargeted; `EVENTS` and the moved helpers deleted from `constants.ts`.

## The importer count was wrong, and `pnpm check` is what found it

The plan enumerates **nine** importers. There are **eleven**: `tests/derived-figures.test.ts`
(landed in plan 019) and `tests/clock-split.test.ts` were both missing from the list. The census
came from the compiler, not from the plan.

## No compatibility re-export, deliberately

`uno.config.ts:3` imports `src/lib/constants`, and `@unocss/config` loads that config through
**unconfig/jiti, not Vite**. A transitional re-export would drag `import.meta.glob` into the jiti
graph and kill `astro build` *and vitest itself* — vitest resolves its own config through UnoCSS,
so there is no `SKIP_BUILD=1` escape and no test output to read. `grep -n "export .*from.*data/races"
src/lib/constants.ts` returns nothing.

## Proof this changed nothing

`dist/` is **byte-for-byte identical**, 17 files each side — including the content-hashed asset
names, which is stronger than the plan asked for. The baseline was built from a clean
`git archive 86f9a15` extraction, **not** `git stash` (the stash stack is shared across every
worktree of this repo). `<meta name="build-date">` read `2026-08-08` on both builds, so the
comparison did not straddle Singapore midnight.

Independently: the 14 row object literals diff clean against `86f9a15` whitespace-normalised —
14 before, 14 after, identical.

## Invariant proofs

Each stimulus applied alone and reverted before the next; each reddened exactly one test.

| stimulus | assertion that reddened |
|---|---|
| delete the `end_date` bullet from the README | `documents every field the type declares…` — `expected [ 'end_date' ] to deeply equal []` |
| add a `priority` bullet the type does not declare | same test, reverse direction |
| **add a `weather?: string` field to `src/lib/race.ts`** | same test — `expected [ 'weather' ] to deeply equal []`. This is the direction that matters most: a new field must be documented |
| rename a module's date prefix | `names each module for the date inside it` — `expected '2026-12-07' to be '2026-12-06'` |
| duplicate a race at the same date+name | `holds no two modules for the same race` |
| narrow `index.ts`'s glob so it drops modules | `puts every module in the array, so the glob has dropped nothing` — `expected 9 to be 14` |
| reword the `fetch first` / `moves the required rate` phrases | `keeps the procedure beside the data` |

The glob-drop gate is **not** in the plan. It is the one failure mode this migration introduces that
nothing else in the suite can see, and it reads the directory with `readdirSync` rather than globbing
a second time, so it does not share the mechanism it checks.

## Verification

`pnpm check` 0 errors / 2 pre-existing hints · `pnpm eslint` exit 0 · `pnpm test` **491 passed /
7 skipped**, from 486 on `main`. `uno.config.ts` is untouched.

## Out-of-scope edit, flagged for review

**`CLAUDE.md` is not on the plan's scope list and was edited anyway.** Three of its pointers became
false silently — `OfficialResult` and `Recording` "in `constants.ts`", and "read the note above
`EVENTS` in `constants.ts`" — and no gate can see it, because `constants.ts` still exists. Plan 023's
own doctrine is that *docs travel with the WP that invalidates them*, so this is where they belong.
Plan 021 rewrites that section wholesale; this is the minimum to stop it being wrong in the interim.

Three row-comment lines are not verbatim, and only those three: each pointed at a neighbouring array
row that is now a separate file (`pairing below` → `pairing on 2026-05-09`, and two of that shape).
75 of the 78 comment lines are byte-identical whitespace-normalised.


### Discussion (1)

**calvindotsg** — 2026-08-07

## Review panel — 14 agents, 4 dimensions, 0 deaths

20 findings (4 MAJOR, 12 MINOR, 4 NIT). Every MAJOR verified by an adversarial skeptic that
reproduced it by execution. Fixes in `5feb4f7` and `a2456f7`.

### The one that matters: a race could vanish from the site with `pnpm test` GREEN

Two dimensions found this independently. The glob-drop gate this PR added — the gate written
specifically to catch a dropped race — read `readdirSync(DIR).filter(f => f.endsWith(".ts"))`, and
its own comment claimed it read the directory rather than globbing a second time *"because a second
glob shares the mechanism it is checking"*. **That reason was false of its own implementation.**

Measured, on full builds:

| stimulus | before the fix | `dist/` |
|---|---|---|
| `git mv <race>.ts <race>.mts` | **491 passed, exit 0** | race gone — `grep -c "OCBC Cycle Singapore," dist/llms.txt` → 0 |
| `git mv <race>.ts races/2023/` | **491 passed, exit 0** | race gone from `llms.txt` and the patch wall |

The gate now enumerates every file under `src/data/races/` **recursively, with no extension
filter**, `await import()`s each one, and requires it to have put its default export into `EVENTS`
by identity — an import that throws is reported with its error rather than skipped. The naming gate
tests the path relative to the directory, not the basename. The false comment is replaced with what
the code does.

### Also confirmed and fixed

| sev | finding | resolution |
|---|---|---|
| MINOR | **`pnpm check` no longer type-checked a race module.** `import.meta.glob<{default: RaceEvent}>` *asserts* the shape; a module with `sport: "runing"` and no `satisfies` gave 0 errors. The plan's own rationale promises "every compile-time guarantee is kept". | A gate requires every enumerated module to carry `satisfies RaceEvent`. |
| MINOR | **The README field gate compared a FLAT set of names**, so a nested field is "documented" by a top-level namesake — and `recordings.elapsed_time` already was. Adding a required `date` to `Recording` left the suite green while making all 14 modules a compile error. | Compares field **paths** on both sides, deriving nesting from the type and from bullet indentation. `recordings.elapsed_time` is now documented. |
| MINOR | **Nothing asserted `EVENTS` is in date order**, and `llms.txt` renders in array order. A *partial* reorder shipped a misordered artifact at 491 green. | One assertion; reddens on the partial reorder in isolation. |
| MAJOR→MINOR | `README.md`'s Configuration step still sent race edits to `constants.ts`, and four "read the note above X in `constants.ts`" pointers were false. | Retargeted. |
| MINOR | **7 `{@link}` identifiers newly unresolvable across 16 sites** (compiler-API resolver, not grep). | Closed. The head set is now a strict subset of the base set. |

### Deliberately not done

**`.devin/wiki.json` is stale in the same way and was left alone.** Plan 023 owns it, and it is gated
for *durability* rather than accuracy — adding a fact there is the mistake that file exists to record.
21 `{@link}` identifiers remain unresolvable; all are pre-existing at `86f9a15`.

### Re-verification of the fixes (a review fix is a claim)

| stimulus | result |
|---|---|
| `.mts` rename | RED — `puts every file in the directory into the array, whatever it is called` |
| subdirectory move | RED — same named assertion |
| partial reorder, **in isolation** | RED — `keeps the array in date order, because llms.txt renders it in array order`, and nothing else |
| a module without `satisfies` | RED — named |
| required `date` added to `Recording` | RED — `expected [ 'recordings.date' ] to deeply equal []` |

`dist/` re-checked after the fixes: **byte-for-byte identical** to the `86f9a15` build, 17 files each
side, `build-date` 2026-08-08 on both. `pnpm check` 0 errors · `pnpm eslint` clean · `pnpm test`
**493 passed / 7 skipped**.

### Unverified, NOT cleared

6 MINOR over the cap and 4 NIT passed through without a skeptic. Two were fixed anyway above. The
rest are recorded: the two-step edit procedure now has a third prose home (only one phrase-gated);
`.devin/wiki.json` (deferred to 023); and a PR-body slip — claim 6 said "14 row comments" when there
are **8**. The 75-of-78 line figure beside it is exactly right.


---

<a id="pr-136"></a>

## #136 — docs(plans): mark 020 done and archive it

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `8b32a4ba2` · `archive/020` → `main` · +83/−4 across 3 files

Closes out plan 020, merged as `46119ae` (#135).

- `plans/020-one-module-per-race.md` → `plans/done/` (100% rename).
- `plans/README.md`: 020 row **DONE** with its squash SHA; header advanced to 021; test row **replaced** (493 across 17 files, strava-verify now the 18th).
- **The baseline's `content source` row was false** and is corrected — it still said everything user-facing is in `src/lib/constants.ts`, which plan 020 made untrue for the races. No gate could see it.
- `plans/done/README.md`: the 020 entry, carrying what the plan file cannot — the stale importer list, and the panel finding this migration's defining defect **inside the gate written to prevent it** (a race renamed `.mts` or moved into a subdirectory vanished from `dist/llms.txt` and the patch wall with `pnpm test` green at 491).

`pnpm test` 493 passed / 7 skipped.


---

<a id="pr-137"></a>

## #137 — docs(plans): record the 020 criterion that reads false on correct code

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `fd8b5cf8c` · `docs/020-criterion-note` → `main` · +9/−0 across 1 files

Post-merge verification of plans 019 and 020 against `main` found every done criterion met except one, and that one is the criterion's fault rather than the code's.

Plan 020 asks that `grep -c "EVENTS" src/lib/constants.ts` return 0. It did at the reviewed commit `980471e`. It returns **1** on `main`, because the review-fix commit `a2456f7` retargeted a stale pointer into a comment that now reads *"the rule it must not break is the one above \`EVENTS\` in \`src/data/races/index.ts\`"* — the repo's own "delete the claim and name its source" doctrine producing exactly the sentence it should.

The criterion's **intent** is met and is separately checked: no `EVENTS` export, and `grep -c "export .*from.*data/races" src/lib/constants.ts` → 0, which is the compatibility-re-export hazard the plan actually cares about.

Recorded rather than "fixed", because deleting the pointer to satisfy a grep would be the wrong trade. Neither `plans/done/README.md` nor the squash commit body ever claimed the 0 — only PR #135's body, which is an accurate snapshot of the commit it reviewed.

Everything else verified on `main` at `8b32a4b`: `pnpm check` 0 errors, `pnpm eslint` clean, `pnpm test` 493 passed / 7 skipped, 15 race modules, no `import.meta.glob` in the jiti-reachable files, both new suites named in `README.md`, and production serving 14 bib cells on the live wall.


---

<a id="pr-138"></a>

## #138 — refactor(content): split constants.ts by kind and delete it

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `4bf156d51` · `plan/021-split-constants` → `main` · +1498/−1295 across 45 files

Executes [plan 021](plans/021-split-and-delete-constants.md). `src/lib/constants.ts` is gone; the copy, the goals and the goal derivation now live in five modules split **by kind**, so a reader looking for the footer and a reader looking for the goal target no longer open the same file.

| destination | holds |
|---|---|
| `src/content/site.ts` | `METADATA`, `LINKS`, `FOOTER`, `THEME_TOGGLE`, `NEW_TAB_NOTICE`, `NOT_FOUND` (+ private `STRAVA_PROFILE_URL`, `FULL_NAME`) |
| `src/content/home.ts` | `WELCOME`, `ABOUT_ME`, `CAREER`, `PROJECTS`, `NOW` |
| `src/content/races.ts` | `PATCHES`, `NEXT_RACE` |
| `src/data/goals.ts` | `GOAL_YEAR`, `RAW_GOALS` (newly exported), private `GoalSource`, and the `strava-progress.json` import |
| `src/lib/goal.ts` | `Goal`, `Sport`, `GOALS`, `goalForSport`, `clampToGoal` |

**No barrel survives.** A barrel everything imports re-couples exactly what this separates.

## This is a move, and the proof is that `dist/` did not change

**17 files each side, identical filename sets, 0 differing** after normalising only `<meta name="build-date">`. The content hashes never moved, so no filename normalisation was needed at all. Verified three times: by the executor, by the reviewer before review, and by the reviewer again after the review fixes.

**Control the build mode on both sides or this comparison lies.** A `pnpm test`-produced `dist/` carries `data-image-component="true"` on the portrait `<img>` that a plain `pnpm build` does not — vitest exports `NODE_ENV=test` and `tests/setup/build.ts` inherits it. Rebuilding the *unchanged* tree at `fd8b5cf` with `NODE_ENV=test` reproduces the attribute, so it is not this change. It cost one false "index.html differs" during review.

## Review-panel fixes (second commit)

A 20-agent panel across 5 lenses returned 29 findings. Two were real defects **this branch introduced**:

1. **18 broken `{@link}`s.** Splitting one module into five left 18 links pointing at identifiers no editor could follow — the unresolved set went from a strict subset of the base's to a **superset**, the opposite of the standard this repo set one merge ago. Fixed with six `import type` lines across four files. Measured: the unresolved set is now **identical** to `fd8b5cf`'s, 18 names either side, zero regressed. They must stay `import type` — `verbatimModuleSyntax` is on, so a value import would close real `site↔home` and `goal↔races` cycles inside the graph unconfig/jiti drags through, whose failure names no source file.
2. **A gate the rename opened.** docs-drift's "lists every test suite in the README" matched the bare stem, so renaming `constants.test.ts` → `content.test.ts` moved the suite's identity onto the token `content` — which the same commit wrote into README seven times as `src/content/`. Proven both ways: with the whole `tests/content.test.ts` bullet deleted, the old predicate reports **zero misses** and the new one catches it. Three further suites were already vouched for by prose about the code rather than about the suite.

Also from the panel: the `src/content/` reserved-directory hazard is written down for the first time (both config spellings are in `NAMED_AS_ABSENT`, so the absence is asserted rather than assumed); `src/lib/icons.ts` stops enumerating directories and points at the safelist that already is the census; a new positioning sentence said "above" of something 21 lines below; `RAW_GOALS` records that reading it directly bypasses the clamp; and `uno.config.ts` joins plan 023's residue greps, which no glob reached — three agents found that line independently and all three noted it was owned by nobody.

Both planted controls were correctly killed. 5 of 5 lenses passed calibration.

## Scope: six edits forced, three elective — each measured individually

The plan's Scope names neither. Every one of the nine was reverted on its own and the suite re-run:

- **Forced** (suite red when reverted): `src/lib/icons.ts`, `src/lib/race.ts`, `src/data/races/index.ts`, `src/data/races/README.md`, `tests/strava-verify.test.ts`, `tests/llms-dnf-fixture.test.ts`. Each backticks a `src/`-prefixed path that no longer exists, and docs-drift fails on those.
- **Elective** (suite green when reverted, kept deliberately): `.devin/wiki.json` — reverting re-ships an instruction telling an external generator to read a deleted file; `scripts/fetch-strava-progress.mjs` — reverting restores a pointer that was *already wrong at `fd8b5cf`*, where it said `kmFromMetres` lives in `constants.ts` after plan 020 had moved it to `race.ts`; `tests/data-contract.test.ts`.

`plans/README.md` was edited **by the reviewer, not the executor** — the plan forbids the executor to touch it, and the plan's own step 2 makes that file's gate red. That is a self-contradiction in the plan, not a deviation by the executor, and it is recorded for the archive commit.

## The rule the maintainer signed off is rewritten

*A GitHub repository secret, a GitHub repository variable, or the repository's own content — `src/content/` and `src/data/`, counted as **one** home because the split between them is by kind rather than by who may edit it.* `README.md`'s "two of the three sanctioned homes" survives as an edit rather than a recount, and still reads three.

## Verification

- `pnpm check` → 0 errors / 0 warnings / 2 hints (both `astro(4000)` in `src/layouts/BasicLayout.astro`, unchanged in kind from the baseline)
- `pnpm eslint` → exit 0
- `pnpm test` → **493 passed / 7 skipped across 18 suites** (17 run, 1 opt-in skipped) — exactly the `fd8b5cf` baseline
- `pnpm build` → exit 0, which is what proves the jiti graph is clean
- 45 files changed across three commits
- 33 prose references to `constants.ts` survive and are plan 023's, measured with `grep -rn "constants\.ts" --include='*.ts' --include='*.astro' --include='*.md' --include='*.mjs' src/ tests/ scripts/ README.md CLAUDE.md uno.config.ts | wc -l`

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-139"></a>

## #139 — docs(plans): mark 021 done and archive it

`merged` · opened 2026-08-07 by **calvindotsg** · merged 2026-08-07 as `316b83700` · `docs/archive-021` → `main` · +118/−2 across 3 files

Closes out [plan 021](plans/done/021-split-and-delete-constants.md), merged as `4bf156d` (#138). Index row → **DONE**, plan file moved to `plans/done/` (`git mv`, rename detected at 100%), and a run log appended to `plans/done/README.md`.

The log carries what the plan file cannot:

- **What the plan was wrong about** — it was authored at `8ce7565`, before 020 landed, so its size figures were pre-020 and its allocation table named only the *exports*, leaving four module-private declarations unaccounted for. All four were handed to the executor as corrections rather than left to be discovered.
- **`src/content/` was probed, not assumed.** Astro reserves that name for content collections, which reads like a blocker for an allocation the maintainer had already signed off. A throwaway worktree settled it — including a load through unconfig/jiti, which is the half that actually mattered.
- **The panel's two real findings**, both introduced by the branch and both invisible to the whole suite: 18 `{@link}`s that stopped resolving, and a docs-drift gate the rename opened.
- **The mutation table**, including the pair that proves the gate hole was real (old predicate green on the defect, new one red).
- **Two measurement traps** worth not rediscovering: a `pnpm test` dist and a `pnpm build` dist differ by one attribute, so comparing them reports a false failure; and `git checkout <sha> -- <file>` stages as well as writes, so a `git diff --quiet -- <file>` check reports NO-OP for every file and silently voids the whole census.
- **The forced-vs-elective census** of the nine out-of-scope files, settled by nine individual reverts after the panel's two lenses disagreed about it.

## One new local convention

*"Your reviewer maintains `plans/README.md` — do not edit it"* now has a condition-triggered carve-out. That file is gated in full, so a plan that renames or deletes something it names in backticks makes it red **as part of the change** — and the executor then has no green branch, because obeying the instruction fails the plan's own "all pass" criterion. Plan 021 hit exactly that. The executor still leaves it alone and says so; the reviewer makes the smallest retargeting edit in its own commit.

Verification: `pnpm test` → 493 passed / 7 skipped across 18 suites.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-140"></a>

## #140 — test(events): separate the data contract from behaviour, promote the Strava tooling

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `a00c8195a` · `plan/022-data-contract-and-tooling` → `main` · +1982/−388 across 21 files

Executes [plan 022](plans/022-data-contract-and-strava-tooling.md), then closes a 19-agent review panel's three MAJORs and seven MINORs. 21 files, three commits. Suite **493 → 527** passed, 7 skipped.

## The data contract is now its own suite

`describe("EVENTS")`'s **eight** `it` blocks moved verbatim from `tests/projection.test.ts` into `tests/data-contract.test.ts`. Verified mechanically by three panel lenses using three different extraction methods, all byte-identical, with an `expect(` ledger conserving exactly (`projection` 165→136, `data-contract` 18→47, both ±29). The activity-id uniqueness assertion appears exactly once across `tests/`.

`describe("the bot's write contract")` stayed put deliberately — a script-behaviour suite against literal fixtures, not a live-data contract.

## What a booked race costs — and the answer depends on its date

| tree | booked race dated 2026-09-01 | dated 2026-11-28 |
|---|---|---|
| `316b837` (main) | 4 red | 4 red |
| this branch | **2 red** | **3 red** |

The third is `booked race distance > PRO-RATES a multi-day event`, which pins `bookedAhead("cycling", "2026-11-07")` — a September race is already past by that date, a November one is not. **An earlier version of this PR body stated the 4/2 table unconditionally, which was wrong.** Two panel instruments found the date-dependency independently; the condition is now written into `tests/projection.test.ts` beside the number so the next quoter gets both.

`describe("required rate")` no longer reads live `EVENTS`. `booked race distance` stays live on purpose — the calendar genuinely is its subject.

**The plan named one assertion to fixture and there were two**, pinning the same literal `74` on the same edit. Fixturing only the named one would have defeated the step. Documented deviation, upheld by the panel and independently reproduced by five lenses.

## One place that gets an access token — now actually true

`scripts/strava-auth.mjs` exports `accessToken(env)` and `canReachTheTruth(env, run)`. **The credential model is stated: 1Password is the source of truth, the GitHub secret is a copy** — because a GitHub secret cannot be read back, so it can be compared with nothing and recovered from nothing.

The first version of this PR claimed "the one place anything in this repository gets a Strava access token" while `tests/strava-verify.test.ts` still POSTed its own refresh against the live credential. That suite now imports `accessToken()`; its invocation became the `op run --env-file=.env.op` form; and the note saying credentials never come from a secret store read there is amended, because a rotation now writes 1Password and then `gh`.

`accessToken` reads its environment **when called, never at import** — the suite imports the bot script, so a module-load read would throw on every run.

## The production behaviour change is now gated in both directions

The daily dispatch gains `if: '!cancelled()'`, **reversing a decision written into that file**. The old argument is rewritten in place, not deleted: its premise was false, because `gh workflow run ci.yml --ref main` names a REF and `ci.yml`'s checkout carries no explicit `ref:`, so CI builds `main` as GitHub has it and the runner's own checkout never reaches the deploy. `!cancelled()` rather than `always()` because `always()` also fires on Cancel.

That `if:` was ungated in **both** directions — `always()` green, guard deleted green, a silent revert to `success()` green. `tests/workflow-guards.test.ts` now evaluates it in GitHub's own expression engine. Measured, and re-run independently by the reviewer:

| mutation | result |
|---|---|
| guard **deleted** | **2 red** |
| `always()` | **1 red** (the cancellation row) |
| `success()` | 2 red |
| `${{ !cancelled() }}` | green — a legitimate spelling must not redden |
| `success() \|\| failure()` | green |
| engine broken (`cancelled()` always false) | 3 red |

A string pin (`toBe("!cancelled()")`) was rejected: it reddens on correct code. The load-bearing details, each measured: status functions registered on **both** `Parser` and `Evaluator`; `FunctionDefinition` imported from `@actions/expressions/funcs/info` (the wrong path passes vitest and fails `pnpm check`); **a missing `if:` defaults to `"success()"`, without which deleting the guard SKIPS instead of reddening**.

## Panel findings closed

- **A generated document asserted an identity the change dissolved.** `src/lib/derived-figures.md` said its published rate "is the same thing the pinned assertions mean"; after Step 2 the doc divides against live `EVENTS` and the assertions against `REFERENCE_CALENDAR`. They agree today by construction and are designed to diverge. Rewritten with the measurement; census pointer cut, because it counts a denominator that is no longer that test's.
- **A Strava activity title containing `*/` closed the module's JSDoc and landed as executable top-level code**, which `pnpm check` accepted. `JSON.stringify` escapes quotes, not `*/`. Now escaped, with a case.
- **The same activity id passed twice emitted two identical `recordings` rows**, doubling the race's distance, exit 0. Now refused before the network.
- **A 1 January race scaffolded as 31 December and left `GOAL_YEAR`** — the calendar date came from `start_date` rather than `start_date_local`, on an untested line whose neighbouring comment asserted it was right. `calendarDate()` extracted, with an SGT fixture whose two spellings fall in different *years*.
- **The absent-field gate was a deny-list of five names**; a sixth field passed silently. Now an allow-list `Set`, with a per-row loop over `recordings` — without which `official:` inside a recording row stays green.
- **The credential suite read one field of one request.** Six mutations green, including wrong URL, wrong method, and `client_secret` sourced from the refresh token. This repo is public, so a future `console.log` would publish a live token to a world-readable Actions log. Now pins URL + method + content-type + `toEqual` on the whole body, plus a `console.log` sentinel whose comment names its three escapes.
- **`scripts/**/*.mjs` was linted by nothing** — a `ReferenceError` shipped green through all three gates. `eslint.config.js` block plus the globs; proven non-vacuous by injection (widening the glob alone is a measured no-op).
- Four stale-reason comments repointed, including three in `src/` that cite `tests/projection.test.ts` for gates this PR moved.

**Two remedies were rejected as measurably harmful**, both on the skeptics' evidence: switching `canReachTheTruth()` to `op whoami` (this machine has `"accounts": null`, so `op whoami` is non-zero in the *ordinary* working state and a real rotation would refuse a write that would have succeeded), and moving the tour's dates to make a fixture comment true (it cascades into 1064, then 74/18, then `derived-figures.md`).

## Credential paths: what was NOT executed

- **Nothing touching the vault or a live credential ran** — no `op`, no `op read`, no `op item get`, no `gh secret set`. Every credential assertion is offline against a stubbed `fetch` or an injected `spawnSync`.
- `pnpm strava:sync` is dry by default and requires an explicit `--write`. Overwriting a live repository secret is irreversible and breaks the daily bot if the copy has drifted — the maintainer's call.
- **1Password is locked in this session**, so `.env.op`'s `op://` references are unverified by execution, and `strava:sync --write` plus the local arm of `persistRotation` are untested. Run the dry form once with an unlocked vault before trusting `--write`.
- No secret value appears in the diff.

## Verification

- `pnpm check` → 0 errors / 0 warnings / 2 hints
- `pnpm eslint` → exit 0, and now actually covers `scripts/`
- `pnpm test` → **527 passed / 7 skipped across 19 suites** (was 493/7 across 18)
- Every mutation table above re-run independently by the reviewer

## Known residue

- `.scratchpad/strava-activity-details.sh` and `strava-verify-events.sh` are superseded and can be deleted by hand — they are gitignored, so no commit can do it.
- `.env.op` is arguably a fourth configuration home alongside the three the standing rule names. It holds `op://` **references** and three public addresses, no values.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-141"></a>

## #141 — docs(plans): mark 022 done and archive it

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `96ec8fa6f` · `docs/archive-022` → `main` · +136/−2 across 3 files

Closes out [plan 022](plans/done/022-data-contract-and-strava-tooling.md), merged as `a00c819` (#140). Index row → **DONE**, plan file `git mv`d into `plans/done/`, run log appended.

The log carries what the plan file cannot. Three premises cost something rather than nothing:

- **A Maintenance note was simply false.** The plan says `src/lib/today.ts`'s comment points at `describe("the bot's write contract")`. It names `"the site's clock"`, a different block. The conclusion survives; the reason did not, and the correct pairing is now recorded on both describes.
- **`.scratchpad/` is gitignored**, so Step 4's "promote this rather than write it fresh" named a file no executor's worktree contains.
- **One assertion was named to fixture and there were two**, pinning the same literal on the same edit.

It also records a correction to my own work: **the booked-race mutation count is date-dependent** (2 red before the Formosa tour, 3 after), and my "independent verification" used a date inside the window, so it confirmed a claim that is only conditionally true.

## The piece most worth reusing

`tests/workflow-guards.test.ts` now evaluates a workflow `if:` in GitHub's own expression engine, with the four details that are each easy to get wrong and were each measured — including that **a missing `if:` must default to `"success()"`, or deleting the guard skips instead of reddening**. A string pin reddens on correct code and was rejected.

## Two remedies rejected as measurably harmful

Switching `canReachTheTruth()` to `op whoami` (this machine authenticates per-command, so that is non-zero in the *ordinary* working state — the fix would make a real rotation refuse a write that would have succeeded), and moving the tour's dates to make a comment true.

## One process note worth keeping

Two panel agents ran `op read` and `op item get` against the vault. The prompt told them never to reproduce a secret value; it did not tell them not to **fetch** one, and those are different instructions. Nothing reached the repo.

Verification: `pnpm test` → 527 passed / 7 skipped across 19 suites.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-142"></a>

## #142 — docs: retire the last references to constants.ts, and gate the bare filename

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `5b9c79453` · `plan/023-prose-sweep` → `main` · +363/−108 across 18 files

Executes [plan 023](plans/023-sweep-the-prose-no-gate-catches.md), the last of a five-plan run, then closes a 20-agent panel's two MAJORs and nine MINORs. Suite **527 → 531**.

`pnpm test` gates the prose and it is the only thing that does — but a bare backticked `` `constants.ts` `` never reached `existsSync`, so it gated less than it appeared to.

## Step 1: widen the gate

Chosen on a measurement taken before anything was written, and the alternative was priced by this very run: plan 021 renamed a file and **33 bare references survived a fully green suite**.

Measured at `96ec8fa` — **both patterns stated, because the figure depends on which one you run:**

| pattern | matched | resolved | missed |
|---|---|---|---|
| pre-widening (paths only) | 109 | 101 | 8 |
| shipped (paths + bare filenames) | **119** | **111** | **8** |

The 8 splits **7 + 1** — deleted (`constants.ts`) versus *renamed* (`constants.test.ts`), which is the distinction `GONE`'s two entries exist to keep apart. An earlier draft of this PR said 7, from a probe that **did not strip line anchors the way the rule does** and so dropped `plans/README.md:289`'s `` `constants.ts:978` ``. Separately and genuinely: **the file scans itself**, so writing the rule's own comment moves the count — which is why "nine sites" thirty lines below is right.

## Three holes in the new gate, all found by execution and all closed

1. **The live predicates were unasserted.** They were inline lambdas at the call site, so no single definition existed to assert against, and replacing the real `hasFile` with `() => true` left the **whole suite green**. They are bound once at describe scope and asserted now — stubbing either one reddens 2 tests. *This closes the same pre-existing hole on the path half.*
2. **`GONE` was keyed on a bare name with no location**, so a flatly false `` `constants.ts` `` claim in a live `src/` comment shipped green. Both excuse lists are now `{name, where[], why}`, matched by exact path or `/`-terminated directory prefix — a bare `startsWith` would silently excuse `plans/README.md.bak`. **Scoping immediately caught a site the flat form had hidden**: `src/content/home.ts:73` names `public/llms.txt` and was missing from that excuse's scope.
3. **`BARE_SOURCE_FILE` rejected PascalCase and underscore stems and omitted `.yaml`.** Proven by a real `git mv Pulse.astro Beat.astro`: full suite green while `plans/README.md` still named `Pulse.astro`. Now `/^[a-z0-9][a-z0-9._-]*\.(ts|astro|mjs|js|json|yml|yaml|sh|py)$/` — **medial** underscore only, because a leading one would redden `_worker.js` and `_routes.json`, which are deliberately named as absent. The case gap is **measured at 42 tokens** (39 `.astro`, 3 `.ts`) and deferred in a comment naming the three excuses it would cost — those belong in a "not a file of ours" map, not in `GONE`, whose come-back gate would then lie about its own subject.

## The sweep repointed archaeology, and one instance condemned the correct line below it

`tests/rendered-html.test.ts:217` and `:1214` **record what a past failure message said**. Repointing them made the record false — and `:1214` then read *"the failure message claimed the value came from the content module when it did not"*, three lines above the live message correctly rewritten to say `` `src/content/site.ts` ``. Both restored verbatim and qualified ("as it was then"), and both sites are now in `GONE`'s `where`, so the record is protected rather than merely repaired. The rest of the diff was swept for the same shape; these two were the only instances.

## The plan's premise for the wiki edit was false

Plan 023's Out-of-scope says naming `src/content/` in `.devin/wiki.json` is *"the exact mistake that file's own opening note records"*. The durability gate's own comment says the opposite, verbatim at `tests/docs-drift.test.ts:576-577`: **"Directories and documents are fine and are how the instruction should point"**, and two lines on, **"NOTHING HERE FORBIDS SPECIFICITY."** `repo_notes[3]` already named both directories plainly and passed every gate.

So the indirection bought zero durability. `pages[3].purpose` now names the directories directly, which resolved three further findings at once. The plan's premise is corrected in its archive entry.

## Counts corrected — every one of them in prose this run wrote

- **`index.ts` is one file, not "fourteen"** — 14 was the race-module count, transposed. **Deleted rather than corrected**: substituting the true count re-arms the same class one notch lower.
- **The jiti graph reaches six modules, not four**, and `src/lib/icons.ts` carried no head rule. Proven by adding an import edge: `pnpm build` exit 1, `glob is not a function`. The note is added there, and `projection.ts` plus the pre-existing undercount at `src/data/races/index.ts` now point at `uno.config.ts`'s own import list as the census, following it one hop.
- **Four scripts talk to Strava, not three** (`scaffold-race.mjs` calls `api/v3/activities`); **`scaffold-race.mjs` has three siblings, not two**.
- **The `my` note stated a false universal.** `Goal.astro:66` builds `` title=`My ${…} goal this year` `` as template text. The conclusion held; the reason did not. Rewritten to name **case** as the real protection — as written it invited exactly the one-word lowercase edit it claimed was impossible.

## `uno.config.ts`: a retired block cut

A ~50-line block headed **"TWO SHORTCUTS"**, with a `control` definition contradicting the live one, sat directly above a heading reading "THERE ARE THREE NOW" and listing four — in the file `docs-drift` derives CLAUDE.md's gated count from. Cut to the measurement that justified `text-link`: **−27/+5, comment lines only**, no expression touched. The contrast measurement, the cited sources and the "not the control box" sentence are kept, that last because the live block at :424 depends on it. The orphaned heading now names the `shortcuts` object as the census rather than carrying a number.

## Verification

- `pnpm check` → 0 errors / 0 warnings / 2 hints; `pnpm eslint` → exit 0
- `pnpm test` → **531 passed / 7 skipped across 19 suites**
- Both directions of the widened rule re-run by the reviewer: a backticked `totallynotafile.ts` reddens and names the line; a backticked `projection.ts` stays green
- Both gate-hole mutations re-run by the reviewer: stubbing the live predicate reddens 2; the planted false claim reddens 1
- **Line accounting, two populations**: prose **+82 / −82 = net 0** (the `uno.config.ts` cut paying for the `icons.ts` note and the corrections); gate code **+281 / −26**. The plan's net-deletion criterion now reads true-or-neutral on the population it was about.

Step 4 ("shrink the memory") is outside this repository and was skipped; the coordinator owns it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-143"></a>

## #143 — docs(plans): mark 023 done, archive it, and close run 5

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `219dcde17` · `docs/archive-023` → `main` · +110/−3 across 3 files

Closes out [plan 023](plans/done/023-sweep-the-prose-no-gate-catches.md), merged as `5b9c794` (#142), and with it **run 5**. `plans/` now holds no proposal — a "continue the refactor" request means re-audit or ask.

Also refreshes the baseline **tests** row, which still reported the figures measured two plans ago (a review lens caught it): 531 across 18 files, was 493 across 17.

## What the run log carries that the plan file cannot

- **The archaeology-repointing class.** Two comments in `tests/rendered-html.test.ts` *record what a past failure message said*. The sweep repointed them, which made the record false — and one then condemned the correct line three lines below it as the defect it warns against. A repointing sweep has to distinguish a live pointer from a record of what was true then, and the grep for it is in the log.
- **Three holes execution found in the new gate**, none visible by reading: the live predicates were unasserted (stub one and the whole suite stayed green, and the *path* half had had the same hole for months); the excuse list was keyed on a name with no location, so a flatly false claim in a live `src/` comment shipped green; and the filename pattern missed 42 tokens, proven by a real `git mv` that left the suite green while the index still named the old file.
- **Four different honest numbers for one census** — 108/101/7, 79/74/5, 109/101/8, 119/111/8 — produced by the executor, the reviewer and five review lenses. They differ by extension set, document set, and whether line anchors are stripped. Two real causes are named. **Record the pattern with the figure or the next reader sees a contradiction.**
- **The plan's own premise was false.** It said naming `src/content/` in `.devin/wiki.json` is "the exact mistake that file's own opening note records"; the durability gate's own comment says *"Directories and documents are fine and are how the instruction should point"*. Obeying the plan bought zero durability and caused three further findings. **Corrected in the log rather than in the archived plan, which stays as the record.**
- **The Maintenance note's question answered**: the gate was widened, because the alternative was measured on this very run — a rename left 33 bare references green.
- **The line-accounting lesson**: the "fewer prose lines" criterion reads false on a raw `git diff --stat` whenever a plan widens a gate. Measure the two populations separately; never delete a gate to make an arithmetic criterion pass.

Verification: `pnpm test` → 531 passed / 7 skipped across 19 suites.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-144"></a>

## #144 — docs(plans): open run 6 with three plans from a re-audit of the record

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `b58c0fdd7` · `worktree-plans-024-026-authoring` → `main` · +1381/−8 across 4 files

## What this is

Run 6, authored at `219dcde`. Every earlier run audited the source; **this one audited `plans/` itself** — the twenty-four archived plan files, `plans/done/README.md` and the living index — for items that were deferred, "recorded not fixed", or accepted as a coverage gap during an earlier run. Three read-only agents produced roughly seventy candidates; each was then held against the live tree, and the three that survived **with a measurement behind them** became plans.

No source changes. Three plan files and the index.

## The three plans

| | why it survived vetting |
|---|---|
| **024** — refresh the lockfile in-range | `pnpm audit` reads **1 moderate + 8 high** against a documented floor of 1 + 1. Measured on a scratch copy of `package.json` + `pnpm-lock.yaml`: one `pnpm update --no-save` takes it to **0 moderate + 2 high**, and both survivors are the `image-size` pair whose "Patched versions" is `<0.0.0` — no fix exists. `package.json` comes out byte-identical. |
| **025** — assert what forced colours *paint* | The gate that keeps an icon-only control named in forced colours asserts that *some* rule reaches the glyph and never reads the declaration. Mutating `CanvasText` to `Canvas` paints 32 marks the ground colour — invisible — with the suite green. A probe of the proposed assertion is green on the current build (78 glyphs: 32 bare, 44 in an anchor, 2 in a button) and red on all three mutations (32 / 44 / 2). |
| **026** — close the bare-filename gate's case gap | The docs-drift rule is case-sensitive, so the gate that exists to catch a rename cannot see a rename of any of six PascalCase components live prose names. Census at this commit: widening costs exactly **four sites across two names**, and the gate's own comment already specifies the fix (a "not a file of ours" list, not a `GONE` entry). |

They have no dependencies on each other.

## Two recorded reasons had expired — the run's most transferable result

Both `pnpm audit` residuals were written down as unfixable by construction, and both clear with an ordinary in-range refresh:

- the record says the brace-expansion advisory's *"only patched release is 5.0.8 (no patched 1.x)"* — `1.1.17` and `1.1.18` are published, and `minimatch@3` declares `^1.1.7`, so no override is needed;
- `@opentelemetry/core` was *"pinned exactly by `@netlify/otel@6.0.3`"* — `6.0.5` lifts it, which is what that record's own prediction said would happen.

Meanwhile six *new* highs had appeared. A residual's reason has a shelf life; plan 024's maintenance note carries the general form.

## Also in this PR

A claim this index made about itself, found by the 2026-08-07 review panel and fixed here because the index is the reviewer's to maintain: it sent the reader to `plans/done/` for four maintainer-direct changes. Measured — the archive mentions none of `control-geometry`, `page-fit`, `aria-pressed` or SC 1.4.12 even once.

Everything vetted and **not** selected is written into § "Run 6" so it is not swept a third time, including two items confirmed still open and deliberately not planned (`main()` in the Strava writer is unexported and untested; the pre-paint theme script's unguarded `localStorage.getItem`) and one stale finding restated against the current host rather than dropped.

## Verification

`pnpm test` → **531 passed | 7 skipped**, unchanged. `pnpm check` and `pnpm eslint` clean. `dist/` untouched — this change ships no bytes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-145"></a>

## #145 — chore(deps): refresh the lockfile in-range, clearing six high advisories

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `c2558bef5` · `worktree-agent-a1704215135d799f2` → `main` · +320/−613 across 1 files

Executes [`plans/024-refresh-the-lockfile-again.md`](https://github.com/calvindotsg/portfolio-v2/blob/main/plans/024-refresh-the-lockfile-again.md). One file moves: `pnpm-lock.yaml`.

## What it does

`pnpm update --no-save`, in range. `package.json` is byte-identical (`git diff --exit-code` exits 0) and no override, resolution or `packageExtensions` entry was added — the plan forbids them and `grep -c overrides package.json` returns 0.

**`pnpm audit`: 1 moderate + 8 high → 0 moderate + 2 high.** Both survivors are the `image-size` pair whose `Patched versions` reads `<0.0.0` — how the advisory database spells *no patched release exists*. They arrive build-time only, via `astro → unstorage → @netlify/blobs → @netlify/dev-utils`.

## The two recorded residuals, and which reason actually expired

Both were written down as unfixable by construction. They cleared for opposite reasons, and the difference is the transferable part:

- **`brace-expansion` — the reason was false.** The record says the advisory's *"only patched release is 5.0.8 (no patched 1.x)"*. `1.1.17` and `1.1.18` are published, and `minimatch@3` declares `^1.1.7`, so `1.1.18` arrives in range. No override needed — and the measured-broken `brace-expansion@5` override stays un-attempted.
- **`@opentelemetry/core` — the prediction came true on schedule.** The record said it would clear when `@netlify/otel` bumped. `6.0.5` **still pins the package exactly**, now at the patched `2.8.0`. The pin was never lifted; the pinned version became a safe one.

## Verification — reviewer-re-derived, not read from the executor's report

| gate | result |
|---|---|
| `pnpm check` | 0 errors, 0 warnings, 2 hints |
| `pnpm eslint` | 0 problems |
| `pnpm test` | **531 passed / 7 skipped** — identical to baseline |
| `git diff --name-only origin/main...HEAD` | exactly `pnpm-lock.yaml` |
| `pnpm audit` | 0 moderate, 0 critical, every survivor `<0.0.0` |

**The `dist/` comparison was re-derived independently** rather than taken from the report, because `astro 7.1.5 → 7.2.0` is a minor of the thing that renders every page. Built the branch, swapped in `origin/main`'s lockfile, rebuilt, and diffed:

- **zero files gained or lost** (`diff -rq | grep -c '^Only in'` → 0);
- all four `_astro/` assets keep their content-hashed filenames and are byte-identical, both stylesheets included;
- the five HTML pages differ, at **identical byte length**, and each is byte-identical once `Astro v7.2.0` is normalised back to `Astro v7.1.5`.

So the generator meta is the sole delta site-wide. `vite 8.1.5 → 8.2.1` carries `rolldown 1.1.5 → 1.2.3`; there is no bundler swap — vite 8 already used rolldown, and the `rollup` removal is astro 7.2.0's own dependency change.

## Notes

- `nanoid` landed on **3.3.18**, which is what the plan's table said; 3.3.17 is the advisory's patched floor, a different quantity. `postcss 8.5.24 → 8.5.26` is what carries that bump and the plan's table did not name it — the plan names `git diff -- pnpm-lock.yaml` as the complete record for exactly this reason.
- The executor committed on its harness worktree branch rather than the plan's `advisor/024-…` name, and judged renaming a branch the tooling tracks to be the riskier move for a cosmetic gain. Agreed.
- The executor reported that the `main...HEAD` done criterion could not pass in its checkout. Diagnosed correctly as ref staleness — its `main` sat at `219dcde` with no fetch. After fetching and rebasing onto the merged `b58c0fd`, the criterion lists exactly `pnpm-lock.yaml`.

## Panel

A three-lens panel (supply chain / what `dist` cannot see / ponytail), each finding handed to a reproduce-first skeptic with a KILL mandate: **14 raised, 0 survived.** Two results are worth carrying into the run-6 close rather than this branch:

- **The two surviving highs are not permanent, and the reason is not upstream.** `@netlify/blobs` is an *optional* peer that a fresh resolution never installs — measured: `pnpm install` against this same `package.json` with no lockfile yields zero `@netlify/blobs` and zero `image-size`. They survive only because `pnpm update --no-save` carries forward a peer resolution orphaned when the Netlify SSR adapter was dropped in `32071fe`. Clearing them means re-resolving the whole tree, which needs its own plan and its own `dist/` comparison.
- **`astro preview` changed behaviour in 7.2.0 under a non-interactive shell** — it now forks a detached server and returns immediately, with `astro preview stop|status|logs` to manage it. Nothing ships or is gated on it and CLAUDE.md's sentence stays accurate, but it will surprise the next agent that runs it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-146"></a>

## #146 — test(docs): see a PascalCase filename, and name a foreign one as foreign

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `557af8f86` · `advisor/026-close-the-bare-filename-case-gap` → `main` · +105/−28 across 1 files

Executes [`plans/026-close-the-bare-filename-case-gap.md`](https://github.com/calvindotsg/portfolio-v2/blob/main/plans/026-close-the-bare-filename-case-gap.md). One file: `tests/docs-drift.test.ts`. Suite 531 → **532**.

## What was wrong

`docs-drift`'s bare-filename rule exists because plan 021 deleted one file and **33 bare references to it survived a fully green suite**. But the rule opened `[a-z0-9]`, and everything under `src/components/` is PascalCase — so the gate written to catch a rename could not see a rename of any component. A rename's broken *imports* are caught by the compiler; this gate's subject is the *prose* left behind, and for those names nothing was watching it.

## The reviewer's decisive check

Not the plan's mutation list — the real scenario, run independently in the executor's worktree:

```
git mv src/components/Pulse.astro src/components/Beat.astro
SKIP_BUILD=1 pnpm test docs-drift
```

→ **red**, naming a live source comment in `src/components/Now.astro` that still points at `Pulse.astro`. That same rename was green before this change. Restored clean afterwards.

Two more reviewer mutations, each reverted and re-confirmed green:

| mutation | result |
|---|---|
| re-narrow the class to `[a-z0-9]` | 2 failed — the calibration pair **and** the new wiring test |
| repoint an excuse's `where` at a document that does not name it | 2 failed — the scope gate and the wiring test |

## The third list, and why it is not two `GONE` entries

Widening costs exactly three sites naming something this repository never owned: `YYYY-MM-DD-slug.ts` (a race-module *naming convention*, twice) and Cloudflare's own `parseHeaders.ts`. They go in a new `NOT_A_FILE_OF_OURS` rather than in `GONE`, because `GONE`'s come-back gate asserts the name never returns — a claim nobody can make about a name we never had, and one that would redden the suite the day a file legitimately took it.

That makes it the one excuse list here **not** asserted in both directions, so it says so in place and keeps the half that does apply: the scope gate covers it, since a `where` pointing at a moved document is a leftover in this list exactly as much as in the other two.

## The census moved, in the direction the gate predicts

The plan measured **four** foreign sites; the executor measured **three**. The fourth was the old comment *quoting* the slug pattern in backticks — and the rewrite describes both foreign names instead of quoting them, so that site stopped existing. This is the plan's own "A CENSUS IN THIS FILE COUNTS ITSELF" warning firing in the opposite direction, and it is why `YYYY-MM-DD-slug.ts` is scoped to two documents rather than three. Final state: **155 bare tokens reached, 155 resolve, 0 misses**, 43 of those sites brought in by the case widening.

## Verification

`pnpm check` 0 errors / 0 warnings / 2 hints · `pnpm eslint` 0 problems · `pnpm test` **532 passed | 7 skipped** · `git diff --name-only origin/main...HEAD` → exactly `tests/docs-drift.test.ts`.

## Two plan defects found by execution, recorded rather than hidden

- The plan predicted mutation 4 would give `1 failed | 12 passed`; it gives `1 failed | 13 passed`, because step 5 adds a test before step 6 runs. The plan's own step ordering made its prediction stale.
- The plan said mutation 1 "fails on both the `misses` list and `considered`". Vitest throws on the first failing assertion, so the second half is unobservable. The executor flagged it rather than claiming it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-147"></a>

## #147 — test(a11y): assert which system colour repaints each mark in forced colours

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `4b9d5eae9` · `advisor/025-assert-what-forced-colours-paint` → `main` · +135/−1 across 1 files

Executes [`plans/025-assert-what-forced-colours-paint.md`](https://github.com/calvindotsg/portfolio-v2/blob/main/plans/025-assert-what-forced-colours-paint.md). One file: `tests/build-output.test.ts`. Suite 531 → **532**.

## What was wrong

A mark on this site is a `presetIcons` **mask painted over `background-color`**, and forced-colours mode overrides `background-color` — so the mode erases it. `BasicLayout.astro` repairs that in two halves: `forced-color-adjust: none`, which lets author colour through at all, and the system colour the mark is then given (`CanvasText` bare, `LinkText` in an anchor, `ButtonText` in a button, so a glyph agrees with the words beside it).

**The gate written to protect that read neither half.** It collects selectors and discards the declaration bodies, asking only whether *some* forced-colours rule reaches the glyph. Both measured on this tree, both with the whole suite green:

- `CanvasText` → `Canvas` paints **32 marks the ground colour** — invisible;
- moving the opt-out out of the base rule into the two arms **erases all 32 bare marks**, since without it the mode discards the author's colour entirely.

The 32 bare marks are exactly the population the existing gate skips, because a bare mark is in no control at all.

## Reviewer's independent checks

The executor's four mutations all landed (32 / 44 / 2 / 32, each failing only the new test). Two more were run by the reviewer, because neither is covered by any mutation in the plan:

**M-B, the load-bearing one.** A component-level override injected into `ThemeSwitcher.astro`'s inline `<style>`:

```
@media (forced-colors: active) { .theme-toggle span[aria-hidden][class^="i-"] { background-color: Canvas; } }
```

→ **red**: `Expected buttontext, found canvas`. This is the check that proves the review panel's cascade fix bites. The built page links the shared sheet *before* its inline `<style>`, so the plan's originally-specified `inline + shared` join was the **inverse** of the cascade and would have resolved the shared `buttontext` as last — green on this exact defect. Reading through `pageCss(page)`, which interleaves in document order, is what makes it red.

**M-A.** Deleting the entire shared `@media` block → red, `expected '(unreached)' to be 'linktext'`, plus the existing reach-only gate — the expected blast radius. This confirms an unreached mark **fails rather than being skipped**, which no value-changing mutation can detect.

Both reverted; worktree clean; suite back to 87 in that file.

## Implementation points worth a look

- CSS read per page via `parseRules(pageCss(page))`; `lastDecl` throughout, never `decl` — the minifier merges same-selector rules into one body and `decl` returns the first occurrence.
- Pseudo-**element** selectors are skipped before `matches`: linkedom *throws* on them, and `index.html` genuinely ships `.intro-type:after{background-color:canvas}` inside the forced-colours block. Attributing that `canvas` to a glyph would report a mark invisible on a correct build. `:focus-visible` also throws and is caught to `false` — "does not reach this mark at rest" — and that catch cannot hide a rule that mattered, because an unreached mark fails.
- `background` shorthand vs `background-color` longhand is resolved by position in the body, since the shorthand resets the longhand.
- One `toBeGreaterThan(0)` total floor (33 → 34), **no per-arm floors**: a per-arm floor counts the current tree, and the theme toggle becoming an anchor would take the button arm to zero on entirely correct code.

## Verification

`pnpm check` 0 errors / 0 warnings / 2 hints · `pnpm eslint` 0 problems · `pnpm test` **532 passed | 7 skipped** · `git diff --name-only origin/main...HEAD` → exactly `tests/build-output.test.ts` · `src/layouts/BasicLayout.astro` byte-identical to main.

## One plan defect found by execution

The plan claimed `lastDecl` was already imported at `tests/build-output.test.ts:16-17`. It was not — the import list had `decl` but not `lastDecl`. The executor checked rather than trusted, and added it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-148"></a>

## #148 — docs(plans): mark 024-026 done, archive them, and close run 6

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `fad42037a` · `worktree-close-run-6` → `main` · +197/−17 across 5 files

Closes run 6. Plans 024–026 marked DONE and moved to `plans/done/`, the baseline re-derived, and the run written up in the archive. No source changes.

## What run 6 was

Five runs audited the source. This one audited **`plans/` itself** — the twenty-three archived plan files, `plans/done/README.md` and the living index — for items deferred, "recorded not fixed", or accepted as a coverage gap during an earlier run. Roughly seventy candidates; each held against the live tree; **three survived with a measurement** and became the plans.

| plan | merged | what it bought |
|---|---|---|
| 024 | `c2558be` | `pnpm audit` 1 moderate + 8 high → **0 moderate + 2 high** |
| 026 | `557af8f` | a renamed PascalCase component now reddens the prose gate |
| 025 | `4b9d5ea` | a mark painted the ground colour in forced colours now reddens |

## Baseline re-derived, not incremented

- **`pnpm audit`** — the cell now names a *derivation* and a **test** for unpatchability (`Patched versions: <0.0.0`) rather than a story. Every reason previously written there has since either expired or come true, and no gate can see either happen.
- **tests** 531 → **533**.
- **`uno.config.ts`** read 719. It is 700 — and was 700 at `219dcde` too, so that figure was never right rather than having gone stale. Exactly what the word "derive" in that cell is for.

## Two results worth carrying past this run

**A residual's REASON has a shelf life.** The audit floor was recorded as "1 moderate + 1 high", both named unfixable by construction, while the tool said 1 + 8. Of the two recorded reasons, `brace-expansion`'s was **false** (a patched 1.x now exists, in range, no override needed) and `@opentelemetry/core`'s **came true on schedule**. Both cleared with one in-range refresh.

**An absolute suite count inside a plan is an undeclared dependency edge.** All three plans originally hard-pinned 531/532 while the index promised "any order" — 025 and 026 each add one assertion, so whichever landed second would have failed, and 024 would have hard-STOPped on a `main` that had absorbed either. Replacing those with a self-recorded baseline is what let all three executors run at once, the first parallel execution here.

## Also recorded

From plan 024's panel, and it changes how the audit floor should be described: **the two surviving highs are not permanent and not upstream's to fix.** `@netlify/blobs` is an *optional* peer a fresh resolution never installs — measured, `pnpm install` against this same `package.json` with no lockfile yields zero of it and zero `image-size`. They survive because `pnpm update --no-save` carries forward a peer resolution orphaned when the SSR adapter was dropped in `32071fe`. Clearing them means re-resolving the whole tree, which needs its own plan and its own `dist/` comparison.

Deferred items, each with its reason, are in § "Run 6" of the index so they are not swept a third time: `main()` in the Strava writer is unexported and untested; the pre-paint theme script's unguarded `localStorage.getItem`; the entrance-stagger middle rung; `max-h-[415px]` on the portrait; and the `<project>.pages.dev` duplicate, restated against the current host rather than dropped.

## Verification

`pnpm test` → **533 passed | 7 skipped**. `dist/` untouched — this change ships no bytes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-149"></a>

## #149 — fix(content): correct both job titles, and retake the hero they had left stale

`merged` · opened 2026-08-08 by **calvindotsg** · merged 2026-08-08 as `a1c6605ad` · `worktree-job-titles` → `main` · +30/−23 across 5 files

## Summary

Calvin's title at HeyMax is **Business Systems Analyst**; the one he held at NCS Group was **Business Analyst**. Two `job_name` edits in `CAREER` — everything else on the site derives from that record and moved on its own — plus a retake of `public/preview.jpg`, which is a render of the intro card and so was falsified by the h1 moving.

## Problem

`CAREER[0].job_name` said "Founding Business Systems Analyst" and `CAREER[1].job_name` said "Business Systems Analyst". Because five surfaces derive from `CAREER[0]`, a stale value there is stale in the tab, in the social cards, in the schema and in `/llms.txt` simultaneously. `public/preview.jpg` derives from the same fact but derives by hand, so nothing moved it — and it turned out to be **two design changes behind already**.

## Solution

**The content** — `src/content/home.ts`, two strings.

**The prose the edit falsified**, and only the live claims: `CAREER[0].job_name` "says" the old string (`llms.txt.ts`), the old h1 being "character-identical to `CAREER[1]`" (`home.ts`), and a job title being "33 characters like today's" (`tests/content.test.ts`). Records of what was true *then* are left alone as records. Two measurements in the `METADATA.title` note move with the string: the shipped title now renders **489px** of Arial 20px rather than 578px, and the **601px** that ruled out naming both sports was measured against the longer job title — marked expired rather than left standing as a live reason.

**The hero** — retaken, not recomposed. The card renders 824x357 at a 1200px viewport, resizes to 1180x511 and composites at (10, 63) on a 1200x630 `#111111` canvas: the established parameters, and that canvas is load-bearing because it is the OG aspect ratio. Captured at `deviceScaleFactor: 2` x `clip.scale: 2` (a 3296px source, so 1180 is a downscale) with animations frozen and the dark theme proved by reading `--text` back as `#fafafa`. q82 4:4:4 mozjpeg, 54,096 B against the old 54,510 B.

## Test Plan

- `pnpm check` — 0 errors, 0 warnings. `pnpm eslint` — clean.
- `pnpm test` — **533 passed / 7 skipped**, matching the baseline on `main`.
- Built output read off disk: `<title>Calvin Loh — Business Systems Analyst | Road Cyclist</title>`, `"jobTitle":"Business Systems Analyst"`, `dist/llms.txt` "Business Systems Analyst at HeyMax … Previously Business Analyst at NCS Group", and **zero** occurrences of "Founding" anywhere in `dist/`.
- Rendered against this branch's `dist/` at desktop 1440x900 and mobile 390x844: the h1 line, the HeyMax role heading (two lines at lg now, not three) and the NCS role heading all read correctly, nothing clipped in either layout.
- **Two image diffs, since a hero regeneration is easy to get silently wrong.** Running the same pipeline against a build of `origin/main` (`fad4203`) and diffing that render against this branch's: **one 446x28 band at y=147** — a single line of type — with the portrait, the plates and the frame identical. That is the containment proof. Diffing that same main render against the **committed** `preview.jpg`: RMSE 21.1 over a 451x157 block covering the `welcome` eyebrow, the greeting and the link row — i.e. the file was stale before this branch touched it, which is why this is a retake of the current card rather than a restoration of the old one.

GitHub renders an image diff for `public/preview.jpg` below, which is the review for that half.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

<a id="pr-150"></a>

## #150 — docs(readme): name the on-demand Strava refresh where the bot is described

`merged` · opened 2026-08-10 by **calvindotsg** · merged 2026-08-13 as `bea56a9b0` · `claude/strava-action-manual-trigger-w7o24b` → `main` · +23/−0 across 1 files

## What this is

A focused reference, in `README.md`'s Configuration §3, saying that the Strava progress workflow accepts a run on demand — and recording the two behaviours that make a *correct* on-demand run read like a broken one.

23 added lines in one file. No code, no workflow, no behaviour change.

## Why here, when it was already documented three times

`gh workflow run strava-progress.yml` is named in `CLAUDE.md`, in `src/data/races/index.ts` and in `src/data/races/README.md` — but every one of those is subordinate to the *"recording a race you have just run"* procedure. Someone who simply rode after the 05:13 cron and wants tonight's figure now has no reason to open any of them.

Configuration §3 is where the bot **is** described — its inputs, its variable/secret split, its 1Password model — and it never said the workflow takes a manual run at all. That is the gap this closes: the reference now sits where the question gets asked.

## What it records

Both are things that make a healthy run look like a failed one:

- **A run that commits nothing is the ordinary outcome.** `scripts/fetch-strava-progress.mjs` re-reads the year-to-date totals in full every time rather than tracking what it last saw, so unchanged kilometres produce byte-identical JSON and `git diff --quiet` suppresses the push. `updated_at` stays with them, because it means the day the kilometres last *moved* rather than the day they were last checked.
- **The deploy is dispatched either way.** The last step runs unless the run was cancelled, so an on-demand run rebuilds the site even when it banks no distance — which is what turns `BUILD_DATE` over on a rest day, and is why green there means the build was *asked for* rather than that it landed.

The race-ordering trap is **pointed at, not restated** — duplicating that procedure here is the enumeration-in-two-places failure `CLAUDE.md` names.

## Verification

| Gate | Result |
| --- | --- |
| `pnpm test` | 533 passed, 7 skipped |
| `pnpm eslint` | 0 errors, 0 warnings |
| `pnpm check` | 0 errors, 0 warnings (2 pre-existing hints) |

**The docs-drift gate was calibrated by mutation rather than trusted.** A green prose gate says nothing unless the new prose actually reaches a predicate, so both checkable kinds the addition introduces were broken on purpose:

- `src/lib/today.ts` → a path that does not exist — reddened the path gate, naming the line
- `BUILD_DATE` → an undeclared name — reddened the configured-value gate, naming the line

Both restored; the suite is green on the committed text. The pass is not vacuous.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---
_Generated by [Claude Code](https://claude.ai/code/session_01HEJc1PDPpRWhrYNozguKzv)_


---

<a id="pr-151"></a>

## #151 — docs: rewrite the README, and move the record beside the code

`merged` · opened 2026-08-13 by **calvindotsg** · merged 2026-08-13 as `81393303f` · `worktree-readme-rewrite` → `main` · +485/−405 across 5 files

## Summary

- The README is rewritten for the reader who actually arrives here — someone landing from my GitHub profile — and goes from **399 lines to 156**.
- Nothing true was deleted. The operational record moved to where it is found at the moment it is needed: **`scripts/README.md`** (new) for the Strava credential model, **`CONTRIBUTING.md`** (new) for how a change gets landed.
- The README's test-suite enumeration is deleted, and the gate that policed it is **replaced rather than dropped**.

## Problem

The README was two documents in one file, and the operations manual had won. Credential rotation, 1Password precedence, the document-class taxonomy and per-suite test philosophy sat above the fold, ahead of anything telling a visitor who I am or why they should click through to calvin.sg. The Testing section alone ran longer than the entire rest of the page, and a gate required it to name every suite — so the front page of the repository grew by a paragraph every time `tests/` did.

An audit of the old text also turned up claims that were simply wrong: it said "the three scripts that talk to Strava" when `scripts/` holds four, and described the home page as showing content that no card renders.

## Solution

**Split by where a fact is looked for**, following the pattern this repo already used for `dns/README.md` and `src/data/races/README.md`:

| Document | Subject |
|---|---|
| `README.md` | Who I am, what this is, how to run it, how it deploys |
| `scripts/README.md` | The Strava automation: credential model, variable-vs-secret test, 1Password precedence, `.env.op` |
| `CONTRIBUTING.md` | Landing a change: the gate, worktrees, commits, PRs, what merging means |
| `CLAUDE.md` | Unchanged in subject — the code, its invariants and traps |

`CONTRIBUTING.md` is deliberately **not** a second `CLAUDE.md`. It carries no architecture and no invariants; where that knowledge is needed it points at `CLAUDE.md` by name. It exists because the process knowledge — the gate, the conventions, and the fact that merging deploys production — had no home at all and was being re-derived from `git log`.

**The suite-list gate is replaced, not dropped.** The old gate defended something real: it was the only place saying what each suite was *for*. That property moved to where it cannot drift — every suite must now explain itself above its own first `describe()`. A reader asking what a suite is for opens it; a suite added with no reason at all is red rather than merely unmentioned, which is strictly more than the old gate could see, since a README sentence could name a suite without saying anything about it.

The floor is **measured rather than chosen**: every suite already complied and the smallest pre-`describe` docblock ran to 611 characters, so 300 sits at roughly half the real minimum and cannot redden correct code.

`CLAUDE.md` stated "`README.md` must name every suite". This change makes that false in an accuracy-gated document, so it is corrected in the same commit.

## Test plan

- [x] `pnpm test` — **533 passed, 7 skipped**, matching the pre-change baseline exactly (one gate removed, one added)
- [x] `pnpm check` — 0 errors, 0 warnings (2 pre-existing hints)
- [x] `pnpm eslint` — clean
- [x] **New gate proved in both directions**: green on all nineteen suites; red on a probe suite whose header was 24 characters, failing with `expected [ 'zz-mutation-probe.test.ts' ] to deeply equal []`. Probe removed.
- [x] Every badge probed live before inclusion: `calvin.sg live`, `build passing`, `last commit today`, `license MIT`
- [x] Deploy claims verified against `.github/workflows/ci.yml` rather than against the old prose
- [x] `scripts/README.md` claims verified against `.github/workflows/strava-progress.yml`: cron `13 21 * * *` (05:13 SGT), `git diff --quiet -- src/data/strava-progress.json`, `if: '!cancelled()'`
- [ ] Preview deploy renders — verified after CI

## Notes

Badges were re-chosen rather than carried over: `commit-activity/w` is dropped for `last-commit` ("today" answers *is this alive?*; "3/week" does not), a live `calvin.sg` badge is added as the click-through, and Ask DeepWiki is demoted from the badge row to an inline link in Contributing — it is a docs destination, not a trust signal.

The diff is large for a single PR, but a documentation split is atomic: the README cannot lose the material before its new homes exist, and the gate cannot be removed in a different commit from the README section it gates.


---

<a id="pr-152"></a>

## #152 — fix(docs): close the drift holes the README rewrite opened

`merged` · opened 2026-08-14 by **calvindotsg** · merged 2026-08-14 as `20c53f8a6` · `worktree-drift-holes` → `main` · +249/−27 across 5 files

#151 moved ~270 lines out of the README and into two new documents. The audit
after it found six statements that stopped being true and three copies of a fact
that nothing holds. Every one of them was green.

FOUR FALSE CLAIMS, each fixed where it sits rather than deleted:

CLAUDE.md said a local `pnpm preview` is byte-identical to production. The
artifact-reuse half is true and is kept; the conclusion is not, and it is wrong
for two independent reasons measured here — `UMAMI_ID` is a repository variable,
so the analytics attribute is dropped whole on a local build, and `today.ts`
stamps the day the build ran. What that reuse actually buys is a property of CI:
nothing is rebuilt between the green check and the deploy.

docs-drift's own calibration log named "a new suite added without a README
mention" as a mutation it was proved against. #151 deleted that gate, so the
mutation reddened nothing. A calibration log is a claim about coverage and rots
like any other fact — more quietly, because a reader takes it as evidence.

src/content/home.ts said the preview hero's recipe "is recorded with the file".
No such record had ever been written; `public/` holds four files and none of them
is a recipe. The warning pointed at nothing.

The wiki's documentation map recited README.md and plans/ as the division of
labour. That division moved. It now derives the map instead, which is what that
file's own rule has always required of it.

THREE GATES, each proved in both directions:

CONTRIBUTING.md's change-gate block is asserted against ci.yml's build job, in
order. Naming a real pnpm script is not the same as naming the right SET of
them: a fourth check in CI would have left that block green and a step behind,
and it is the one list a contributor copies verbatim. Red on a fourth CI step;
red on a fourth documented command.

README.md's lede is held to CAREER[0].job_name, and refused a title from further
down that list — the defect the intro card actually shipped, where the previous
employer's title stood in the page's largest type. Red on either half.

public/preview.jpg is fingerprinted against what the intro card renders: the h1
stack, the greeting mark, the link out to the wall, the social glyphs in order,
and the portrait's bytes. It is the hero and the og:image, nothing builds it, and
it has gone stale invisibly twice. The recipe is recorded beside the gate, as
acceptance criteria rather than advice. It watches the copy, not the drawing, and
says so.

AND NINE DEAD EXCUSE SCOPES. `it("scopes every excuse to documents that exist")`
only ever asked whether the document existed, never whether it still named the
thing — so #151 rewrote README.md without its mention of the generated endpoint
and the scope survived. Six had rotted; three were dead from the day they were
written, naming things no document ever backticked. One entry lost its last
scope: its `why` cited the very gate #151 deleted, so it excused nothing anywhere.

DELIBERATELY NOT DONE: CONTRIBUTING.md is not added to the durability gate. It is
a current-state document by the taxonomy's own discriminator — read by people who
would notice, and already accuracy-gated by liveDocs. Two of the four durability
predicates are wiki-specific by their own rationale, and against Markdown they
read a CLI flag as a CSS custom property and a repository variable as an exported
constant: 3 findings on CONTRIBUTING.md, 10 on README.md, 20 on scripts/README.md,
all 33 prose the documents exist to carry. scripts/README.md needs nothing for the
same reason.

Suite 533 -> 536 passed, 7 skipped, 19 files. check and eslint clean.


---

<a id="pr-153"></a>

## #153 — fix(content): say the résumé disagrees now, not that it once did

`merged` · opened 2026-08-14 by **calvindotsg** · merged 2026-08-14 as `80bd66589` · `worktree-resume-note` → `main` · +12/−6 across 2 files

The note added in #152 put the résumé's disagreement with `CAREER` in the past
tense and attributed the reason to a cause nobody measured. Both halves are
wrong, and in a comment class this repository gates for accuracy.

IT DISAGREES TODAY, on both entries. `pdftotext public/resume.pdf` reads
"Founding Solutions Engineer", Sep 2023 – Present, for HeyMax, where `CAREER[0]`
says Business Systems Analyst from Aug 2023; and it gives the NCS role the title
the site gives HeyMax. The earlier claim came from grepping the extracted text
for "analyst" and reading the single hit as the current job — it was the NCS
line. One hit is not the entry you were looking for.

AND THE REASON IS NOW WHAT WAS ACTUALLY MEASURED: the title is absent from every
inflated content stream in that file, so a check written against the bytes finds
nothing. "The fonts are subset" was a plausible explanation for that absence,
not an observation, and it read as the harder evidence of the two.

The file is the maintainer's to regenerate, so the disagreement is recorded
rather than resolved — with an explicit warning not to "fix" CAREER to match it,
which is the tempting wrong direction now that the mismatch is written down.

Suite 536 passed, 7 skipped, 19 files. check and eslint clean.


---

<a id="pr-154"></a>

## #154 — fix(content): publish the résumé that agrees with the site's job titles

`merged` · opened 2026-08-14 by **calvindotsg** · merged 2026-08-14 as `0eacf9bdb` · `worktree-resume-update` → `main` · +9/−7 across 3 files

The PDF a visitor downloads from the intro card stated a different job from the
page it was downloaded from, on both entries: "Founding Solutions Engineer" for
HeyMax where the site says Business Systems Analyst, and the site's HeyMax title
attached to the NCS role. The maintainer regenerated it; this publishes it.

Verified by reading the artifact rather than the source file: `pdftotext
dist/resume.pdf` gives Business Systems Analyst for HeyMax and Business Analyst
for NCS, which is CAREER[0] and CAREER[1] exactly. Nothing else on the site
derives from this file — the education and certification sections changed too and
reach no card, no page and no generated endpoint.

The two comments added in #152 and corrected in #153 said the résumé disagrees
TODAY. It does not any more, so they now say what is actually durable: that it
has been on both sides, that no gate can read it — the title is absent from every
inflated content stream in the file, so poppler or nothing — and how to check it
without repeating the mistake that produced the wrong answer last time, which was
grepping for a word two roles share and taking the single hit for the current job.

ONE FIELD STILL DIFFERS AND IS DELIBERATELY LEFT ALONE: the résumé dates the
HeyMax role from Sep 2023, CAREER[0] from Aug 2023 — the same month CAREER[1]
ends. Each document is internally consistent; they disagree by a month about
where the boundary falls, and which is right is not a question this repository
can answer.

Suite 536 passed, 7 skipped, 19 files. check and eslint clean.


---
