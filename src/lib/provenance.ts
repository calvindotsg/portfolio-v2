/**
 * WHERE EVERY PUBLISHED FIGURE COMES FROM, DECLARED ONCE.
 *
 * THIS FILE IS INTERNAL AND MUST STAY THAT WAY. Nothing here is rendered: no page, no
 * markdown twin, no `llms.txt` line and no future surface prints a field's origin. It exists
 * to be read by `tests/data-contract.test.ts` and by a person deciding what may be published.
 * A site that prints its own provenance is making a claim about a source; this site makes the
 * claim in its repository instead, where it can be checked and changed without republishing.
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────
 *
 * Strava's API Policy says two things that bear on a site which publishes what it publishes:
 *
 *   §2.3  "Strava Data provided by a specific Strava user may be displayed or disclosed in
 *          your Developer Application only to that user."
 *   §5.5  "You may not store Strava Data, or any data derived from Strava Data, in any
 *          Persistent Index" — naming "archives, and any other storage configured to enable
 *          subsequent retrieval, query, or use".
 *
 * §6.2 permits a seven-day transient cache and nothing longer.
 *
 * THE POSITION THIS REPOSITORY TAKES, WITH THOSE CLAUSES IN VIEW, is that the figures on this
 * site are commentary on the owner's own training rather than a redisplay of another user's
 * data. That is a decision taken by the account holder, not a reading this file argues for.
 * What this file does is make the decision legible: every published field states where its
 * value originates, so the question "which figures would have to go" has an answer that is
 * derived rather than reconstructed. THE COST OF REVERSING IS REAL AND IS NOT PAID HERE —
 * a race whose only distance is {@link SOURCE_OF_RECORD}'s `strava` set has no other figure to
 * fall back on, and neither does the year-to-date total. Making reversal cheap would mean
 * carrying an organiser distance on every recorded race; that was considered and deferred.
 *
 * ── THE RULE THE MAP RESTS ON ────────────────────────────────────────────────────────────
 *
 * AN ORIGIN IS THE ORIGINAL SOURCE OF RECORD, NEVER A STORE THE FACT PASSED THROUGH. This is
 * the one a later reader gets wrong, so it is stated before the table rather than after it.
 * `recordings.metres` originates at Strava. It does NOT originate at
 * `src/data/strava-progress.json`, at a cache, or at any downstream store that happens to
 * hold a copy — those are routes. The same principle already governs `raceKm` in
 * `src/lib/race.ts`: store the source, derive at the edge.
 *
 * THE DISCRIMINATOR IS "WOULD THIS VALUE EXIST WITHOUT THE API", not "did a script touch the
 * API to get it". `scripts/scaffold-race.mjs` seeds `date` and `sport` from an activity as a
 * convenience, and both are facts the EVENT owns — the day a race is run and what sport it is
 * are true whether or not anybody recorded it. `recordings.metres` is the opposite: it is a
 * figure Strava computed, and without the API there is no such number to publish.
 *
 * ── THE ROUTE, WHICH IS A DIFFERENT QUESTION ─────────────────────────────────────────────
 *
 * A source is stable; a route changes. Today every Strava-sourced value arrives through a
 * DETERMINISTIC SCRIPT — `scripts/fetch-strava-progress.mjs` for the totals and
 * `scripts/scaffold-race.mjs` for a race's recordings. Neither is an AI application, which is
 * why neither has ever been in question under the policy's §5.3.
 *
 * THE SANCTIONED ROUTE FOR ANYTHING AGENT-MEDIATED IS THE STRAVA MCP. §5.3 forbids Strava API
 * Materials in "the development, training, evaluation, or operation of any AI Application",
 * naming "ingestion into a context window or working memory"; §3.5 carves out one exception,
 * for a subscriber's own AI application interacting with their own data through the Strava
 * MCP, which it names the sole authorised agent-mediated interface; §5.16 rules out
 * third-party MCP servers. So an agent must read what a script has already committed to this
 * repository, or go through the Strava MCP — never the v3 API into its own context. Written
 * down here because the next surface to want this data will otherwise re-derive it.
 */

/**
 * WHERE A VALUE ORIGINATES. Four members, and the set is deliberately small: a fifth would
 * mean a fact this site publishes that none of these describes, which is a finding rather
 * than a gap to fill quietly.
 *
 * `strava` IS THE ONLY MEMBER WITH A CONSEQUENCE ATTACHED. It marks the values that would
 * have to stop being published if the position above were reversed, which is the whole reason
 * the map is machine-readable rather than a paragraph.
 */
export type SourceOfRecord =
    /** Strava computed it. Without the API there is no such figure to publish. */
    | "strava"
    /** The event's own account of itself — its name, its date, its advertised distance. */
    | "organiser"
    /** The published results sheet: a certified course and an official clock. */
    | "results"
    /** Told, because nothing holds it. `outcome` is the whole of this category today. */
    | "athlete";

/**
 * EVERY FIELD `RaceEvent` DECLARES, AGAINST ITS SOURCE.
 *
 * THE KEYS ARE THE COMPILER'S FIELD PATHS, NOT A HAND-WRITTEN LIST. `declaredFieldPaths()` in
 * `tests/data-contract.test.ts` derives the same set from `src/lib/race.ts` and holds this map
 * to it in both directions, so a field added to the type without an entry here is red, and an
 * entry here for a field the type has dropped is red. That is the same shape as the gate which
 * already holds `src/data/races/README.md` to the type, and for the same reason: this map sits
 * beside the data and looks authoritative, and nothing about adding a race prompts anyone to
 * revisit it.
 *
 * A NESTED PATH IS ITS OWN ENTRY. `recordings.metres` is a different question from
 * `recordings`, exactly as it is for the README — the parent's answer does not cover it.
 */
export const SOURCE_OF_RECORD: Readonly<Record<string, SourceOfRecord>> = {
    /** ISO `YYYY-MM-DD`, the day the event starts — the event's, not an activity's. */
    date: "organiser",
    /** The last day of a multi-day event; the tour's own span. */
    end_date: "organiser",
    /** The race as the organiser calls it. An activity's title is explicitly not this. */
    name: "organiser",
    /** Which goal the race joins. A property of the event, not of how it was recorded. */
    sport: "organiser",
    /** Where it was RIDDEN — see the note on the declaration; a virtual event's country is not its brand's. */
    country: "organiser",
    /** The organiser's distance. The figure on the registration page, not the one a watch measured. */
    advertised_km: "organiser",

    /** The published results sheet, present only where one exists and is citable. */
    official: "results",
    /** Chip time, from that sheet. */
    "official.net_time": "results",
    /** Gun time, from that sheet. */
    "official.gun_time": "results",
    /** Where the sheet is published. */
    "official.url": "results",

    /**
     * THE ONE FACT ON A BIB NOTHING CAN DERIVE. No device models a DNF — an abandoned ride is
     * stored exactly like a finished one — so this is told or it is not known.
     */
    outcome: "athlete",

    /**
     * FIRST START TO LAST STOP, computed by `scripts/scaffold-race.mjs` across the recordings.
     * Derived from Strava rather than supplied by it, and derived data is named by §5.5
     * alongside the data it comes from, so it is marked at its origin rather than as its own
     * category.
     */
    elapsed_time: "strava",
    /** The list itself: which activities a race was recorded as. */
    recordings: "strava",
    /** Strava's activity id. It addresses a page on Strava and means nothing anywhere else. */
    "recordings.id": "strava",
    /** The API's `distance`, verbatim. `kmFromMetres` owns the conversion; this is the source figure. */
    "recordings.metres": "strava",
    /** That activity's own clock, as the API reported it. */
    "recordings.elapsed_time": "strava",
};

/**
 * THE BOT'S FILE, WHICH IS NOT PART OF `RaceEvent` AND SO NEEDS ITS OWN ENTRY.
 *
 * `src/data/strava-progress.json` carries a year's totals and the day they last moved. The two
 * kilometre figures are the API's, converted down by `kmFromMeters` in
 * `scripts/fetch-strava-progress.mjs`. `updated_at` is a stamp the script writes, so it
 * originates here rather than at Strava — see that script's note on why it means "the day the
 * kilometres last MOVED" rather than the day they were checked.
 *
 * THESE TWO FIGURES ARE THE DEEPEST OF THE `strava` SET. Both goal cards, both progress bars,
 * the required rate, the projection and `llms.txt` all rest on them, and there is no second
 * source for either — which is what makes the reversal noted at the top of this file a project
 * rather than an afternoon.
 */
export const PROGRESS_SOURCE_OF_RECORD: Readonly<Record<string, SourceOfRecord>> = {
    cycling_km: "strava",
    running_km: "strava",
    updated_at: "athlete",
};

/**
 * THE WEEKLY TRAINING SERIES, WHICH IS NOT PART OF `RaceEvent` EITHER AND SO NEEDS ITS OWN ENTRY.
 *
 * `src/data/weeks/` holds one module per ISO week, each a list of sessions written by
 * `scripts/fetch-strava-weeks.mjs`. Every field of a session is `strava`, and that uniformity is
 * the CHECK rather than a coincidence: it is what says the store-the-source decision held.
 * `tests/data-contract.test.ts` holds this map to `SESSION_KEYS` in both directions.
 *
 * A FIELD HERE THAT NEEDS ANY OTHER ORIGIN IS A DERIVED VALUE THAT HAS LEAKED INTO STORAGE.
 * A weekly total would be the obvious one, and it has no legal answer: every member of
 * {@link SourceOfRecord} names a source, and a sum this repository computed originates nowhere
 * but in the computation. That is the argument for storing sessions rather than totals, stated
 * from the provenance side — see `weekTotals` in `src/lib/training.ts` for the other half.
 *
 * THE RULE AT THE TOP OF THIS FILE STILL APPLIES: an origin names the original source of record
 * and never a store the fact passed through, so `src/data/weeks/` is not a legal value here any
 * more than `src/data/strava-progress.json` is.
 *
 * THE KEYS ARE PATHS INTO `TrainingWeek`, so a session's field is `sessions.<field>` for the same
 * reason `recordings.metres` is nested above: the parent's answer does not cover it.
 */
export const WEEK_SOURCE_OF_RECORD: Readonly<Record<string, SourceOfRecord>> = {
    /** The list itself: which activities a week was recorded as. */
    sessions: "strava",
    /** Strava's activity id. It addresses a page on Strava and means nothing anywhere else. */
    "sessions.id": "strava",
    /** Strava's own classification of the activity. `sportOf` maps it; it does not restate it. */
    "sessions.sport_type": "strava",
    /** `start_date_local`, verbatim — the wall clock Strava recorded the activity against. */
    "sessions.start_local": "strava",
    /** The API's `distance`, verbatim. `kmFromMetres` owns the conversion; this is the source figure. */
    "sessions.metres": "strava",
    /** The API's `moving_time`, in seconds. */
    "sessions.moving_seconds": "strava",
    /** The API's `elapsed_time`, in seconds. */
    "sessions.elapsed_seconds": "strava",
};

/**
 * THE FIELD PATHS A REVERSAL WOULD HAVE TO STOP PUBLISHING, derived rather than listed so the
 * two can never disagree. Exported because the gate asserts against it and because it is the
 * answer to the only question this file exists to make answerable.
 */
export const STRAVA_SOURCED: readonly string[] = Object.entries(SOURCE_OF_RECORD)
    .filter(([, source]) => source === "strava")
    .map(([path]) => path);
