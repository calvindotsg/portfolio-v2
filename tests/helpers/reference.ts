/**
 * THE FROZEN REFERENCE: one day, and the kilometres the bot had banked by it.
 *
 * EVERY ASSERTION AGAINST THE PROJECTION PINS ITS OWN INPUTS, and that is a
 * deploy-safety rule rather than a style preference.
 *
 * `GOALS[].raw_progress` and `UPDATED_AT` are rewritten by the nightly Strava bot,
 * and A RED SUITE BLOCKS THE DEPLOY. So an assertion against the live values
 * turns an ordinary ride into a failed production deploy, pushed by a bot with
 * no human in the loop — and the failure
 * freezes the very "Updated …" dateline the goal cards carry, because the deploy that
 * would refresh it is the one being blocked.
 *
 * Not theoretical, not distant, and no longer hypothetical: this fired in production
 * six hours after the feature merged. The bot's own push took running 152.7 → 158.6,
 * which moves the required rate 18 → 17, and the merged assertion had the literal 18
 * in it. The honest expectancy for a test coupled to bot-written data is ONE BOT
 * CYCLE, not whatever change size the arithmetic makes look distant.
 *
 * The same holds for the cycling card: `cycling_km: 2309.7` — one 30 km ride — is already
 * enough, taking the required rate 74 → 73. A race being RECORDED moves it as surely as a
 * ride does, and in the opposite direction: adding the round-island ride's recording took
 * this same figure 70 → 76, because its kilometres left `bookedAhead` for the bot's total
 * in the same edit. BOOKING one moves it down by the same mechanism read backwards: entering
 * the October city ride took 76 → 74, which is the edit that last reddened the assertion
 * in tests/projection.test.ts. Neither input is one this repository may pin live.
 *
 * `EVENTS` USED TO BE LEFT LIVE EVERYWHERE, on the argument that it is human-edited so a
 * red test is wanted feedback rather than noise. That argument survives only where the
 * calendar is the SUBJECT. `bookedAhead` is subtracted from the deficit before a rate is
 * divided out, so the required-rate assertions in tests/projection.test.ts read the live
 * calendar through a default argument while claiming to be about arithmetic — measured, one
 * added booked ride took them 74 → 69, which is a data fact reported as an arithmetic
 * failure. Those two now divide against `REFERENCE_CALENDAR`, declared beside them; the
 * assertions whose subject IS the calendar still read it live, and tests/derived-figures.test.ts
 * still publishes from these three literals against live `EVENTS`, which is where a data
 * edit is meant to show up.
 *
 * THERE IS EXACTLY ONE TRIPLE AND IT LIVES HERE, which is the whole reason this file
 * exists rather than the constants sitting in the suite that first needed them. Two
 * readers now share it — tests/projection.test.ts asserts against it and
 * tests/derived-figures.test.ts publishes from it — and a second declaration would let
 * the published document and the pinned assertions drift apart while both stayed green.
 * Do NOT import a test file from another test file to share them: measured on vitest
 * 4.1.10, that re-registers the imported file's suites under the importer and runs its
 * cases twice.
 *
 * ADVANCING THE REFERENCE IS AN EDIT, NOT MAINTENANCE. Every figure derived from it
 * moves, in both readers at once; see tests/derived-figures.test.ts for what the
 * regenerated document is claiming and what it cannot claim.
 */
export const AS_OF = "2026-07-27";
export const CYCLING_KM = 2279.7;
export const RUNNING_KM = 152.7;
