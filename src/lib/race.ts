/**
 * A RACE, AND EVERY RULE FOR READING ONE. The type the site's calendar is made of, and the
 * five accessors every consumer goes through instead of reaching for a field.
 *
 * IT LIVES APART FROM THE RACES THEMSELVES, which is the whole point of the split: the data
 * is one module per race under `src/data/races/`, so adding a race is writing a file rather
 * than editing a list. This module is what those files are checked against, and it is what
 * `src/data/races/index.ts` collects them into.
 *
 * NOTHING HERE READS A CLOCK OR A TOTAL. Whether a bib is earned is derived in
 * `src/lib/projection.ts` from the build's own date; this module only says what a race IS
 * and what its figures mean.
 */
import type {Sport} from "./goal"

/**
 * Where a finished bib's link points, with {@link Recording.id} appended.
 *
 * It is a base rather than a full URL per event so the domain lives in one place: two
 * spellings of the same host is how one of them ends up on `strava.app.link` or a stale
 * regional subdomain years later, with nothing failing. The ids themselves stay beside
 * the races they belong to, because that is the fact being recorded.
 */
const STRAVA_ACTIVITY_URL = "https://www.strava.com/activities/";

/** Where one recording lives. Takes the RECORDING, not the race — a race can hold several. */
export const stravaActivityUrl = (recording: Recording): string =>
    STRAVA_ACTIVITY_URL + recording.id;

/**
 * A race's recordings, always an array — empty where the race has none.
 *
 * Every consumer wants the list rather than the optional, and normalising here is what
 * keeps `?? []` from being written at each of them. `hasRecording` in projection.ts asks
 * the length; `Patch.astro` asks the length AND iterates.
 */
export const recordingsOf = (event: RaceEvent): readonly Recording[] => event.recordings ?? [];

/**
 * METRES -> KILOMETRES AT TWO PLACES, ROUNDED DOWN. The site's one distance conversion.
 *
 * THE INPUT IS THE API'S `distance` AND NOTHING RENDERED. That is the maintainer's rule in his
 * own words — round down based on the distance retrieved from the Strava API — and the scope of
 * it is the point: what any Strava surface prints for a ride is not an input here, so a
 * screenshot neither confirms this nor contradicts it. Readings of those surfaces have gone both
 * ways in this repository (an embed dropping the third decimal on 5 of 5 discriminating rides;
 * two activity-page figures that disagree with each other), which is why none of them is
 * recorded as evidence. The metres are the record.
 *
 * IT ALSO HAPPENS TO BE WHAT STRAVA DOES, worth one sentence and no more: Strava says it
 * displays the figure it received "rounded down" — riders call it the "Strava tax"
 * (https://www.bikeradar.com/news/strava-tax) — so a bib and the page it links to agree, and the
 * site never overstates a ride. Consistency, not the reason.
 *
 * THE RULE HAS BEEN SET THREE TIMES: down, then half-up, then down again on 2026-08-03. Each
 * earlier setting shipped with a story doing its arguing — "a reader following the link sees the
 * digits the bib showed them", then a renderer claim resting on a single sample — and each story
 * outlived the rule it was written for, with correct rows rewritten underneath them twice. A
 * rule with a persuasive rationale attached is harder to re-examine than a bare one, so this one
 * is kept bare: reverse it on his say-so, not on a paragraph, and never on a reading of a page.
 * The cost of doing so is now this line rather than every module under `src/data/races/`.
 *
 * `Math.floor` OVER `Math.trunc` is only a spelling — a distance is never negative — but it is
 * the one that keeps saying "drop the third decimal" if a signed value ever reaches it. Scaling
 * to integer hundredths first is NOT a spelling: `Number((metres / 1000).toFixed(2))` rounds the
 * double it is handed, which agrees with this on some rides and not others. And the division is
 * exact where it has to be: `metres / 10` can only land below an integer if that integer is not
 * representable, and every quotient here is far under 2^53, so a whole multiple of 10 m does not
 * fall to the hundredth beneath it. `tests/content.test.ts` executes both claims.
 */
export const kmFromMetres = (metres: number): number => Math.floor(metres / 10) / 100;

/** One activity's own distance, as its bib line prints it. */
export const recordingKm = (recording: Recording): number => kmFromMetres(recording.metres);

/**
 * THE DISTANCE A BIB PRINTS FOR A RACE, whichever shape the race is: the recorded one where
 * there are recordings, the advertised one where there are none. Every consumer goes through
 * here — `Patch.astro`, `llms.txt`, the projection — so none of them has to know the shape.
 *
 * THE RECORDED FIGURE WINS WHEREVER BOTH EXIST, AND THAT PRECEDENCE IS NOW THE WHOLE
 * INVARIANT. {@link RaceEventCommon.advertised_km} used to be spelled `km?: never` on a
 * recorded race, so a stored distance beside stored metres was a COMPILE error; the ledger
 * needs the organiser's own division printed beside the ride, so the two facts legitimately
 * coexist on one row and the type can no longer forbid the pair. What it forbade is enforced
 * here instead — this function reaches for the advertised figure only when there is nothing
 * recorded to convert — and `tests/content.test.ts` holds that by handing a recorded race
 * an advertised distance and asserting the metres still decide.
 *
 * A SPLIT RACE SUMS THE METRES AND CONVERTS ONCE. Adding up what the parts print would convert
 * once per part and drop a third decimal each time: 22558.8 + 140498.0 is 163.05 as a race,
 * where its own two bib lines read 22.55 and 140.49 and add to 163.04. That is the rule working,
 * and it is why nothing may reconstruct a race's distance from its parts' printed figures.
 */
export const raceKm = (event: RaceEvent): number => {
    const parts = recordingsOf(event);
    if (parts.length === 0) return event.advertised_km ?? NaN;
    /*
     * THE SUM IS SNAPPED TO A MICRON BEFORE THE RULE IS APPLIED, and that is not a rounding of
     * the distance. Adding doubles is not exact: 86432.4 + 47793.2 + 24244.4 is
     * 158469.99999999997, so flooring it prints 158.46 for a race that rode 158.47 — and the
     * same three parts summed in a different order print 158.47, which makes a bib's figure
     * depend on the order the rider happened to ride them in. Two parts cannot reach it; three
     * can, at a measured 413 of 14973 boundary cases.
     *
     * 1e-6 m is six orders of magnitude below anything Strava expresses, so this can only move
     * float noise and never an honest figure — a genuine 12349.96 m is still 12.34 km. DO NOT
     * replace it with a scale to integer tenths: that assumes every `metres` carries one
     * decimal, which nothing here guarantees, and it ROUNDS UP a two-decimal value into a
     * hundredth nobody rode — the one direction this file's rule forbids.
     */
    const metres = parts.reduce((sum, part) => sum + part.metres, 0);
    return kmFromMetres(Math.round(metres * 1e6) / 1e6);
};

/**
 * A race the site owner has entered — completed ones are in the past, booked ones
 * are ahead. Completion is derived from the date rather than stored, so no flag can
 * go stale.
 *
 * `end_date` is for multi-day events and it is not decoration. With a single date,
 * the whole of a 1,022 km nine-day tour books as ridden on its start date while
 * Strava has recorded one day of it — a discontinuity that would drop a projection
 * by roughly 930 km mid-tour and recover it eight days later. Spreading the booking
 * across the span keeps the figure continuous.
 *
 * Deliberately NO `priority` field, though the owner's Garmin export has one:
 * neither consumer reads it, and this file's tests assert that unrendered fields
 * are absent rather than left for a future editor to fill in expecting them to do
 * something.
 *
 * `recordings` SHIPS WITH A KNOWN COST, AND THE COST IS NOT A MISTAKE. Keep both
 * halves of this paragraph: the evidence, so nobody re-proposes the link as an oversight,
 * and the decision, so nobody removes it as one.
 *
 * The evidence. A logged-out reader who follows one of these lands on a LOGIN WALL. This
 * was recorded the other way first, on good-looking evidence: `curl` gets HTTP 200 with no
 * redirect from `strava.com/activities/<id>`, which reads as "public". Fetched and READ,
 * the page is *"Log in to see 'MBG DCR 2026 Krabi to Phuket'"* and a sign-up prompt — the
 * title is there, the distance and the time are not. A status code is not an answer to "can
 * a reader see this"; re-check by reading, not by curling.
 *
 * AND THE 200 IS NOT UNIVERSAL EITHER, which the paragraph above used to imply. That code
 * belongs to an activity whose visibility is `everyone`. A `followers_only` one answers 307
 * with a 14-byte body: no page, no title, nothing to read. Both kinds are on the wall,
 * so the wall is partial for some of these links and total for others — and the ones a
 * reader can learn least from are the ones the owner shared least widely, which is the
 * expected direction rather than a defect.
 *
 * The decision. The owner read that and asked for the links anyway. A visitor who has
 * Strava — which is most of the audience for a wall of race bibs — gets the ride; one who
 * does not gets a page that at least names it. That is a smaller loss than it looked,
 * because the bib already prints the distance, the date and the time, so the link adds to
 * a complete object rather than being the only way to learn anything.
 *
 * (THE TITLE LEAK VERIFIES A PUBLIC ID AND ONLY A PUBLIC ID, which is why it is no longer
 * the technique here. Fetching the page logged out and reading which race the title names
 * works wherever visibility is `everyone`; where it is `followers_only` there is nothing to
 * read at all, so the ids needing an independent witness most are exactly the ones this
 * cannot check. `tests/strava-verify.test.ts` is the technique now — it reads each activity
 * over the API, which answers for both visibilities, and holds the row against its
 * distance, its elapsed time and the DAY it was recorded. Two valid ids transposed between
 * events would otherwise produce a wall where every link resolves and every bib looks
 * right; comparing the day is what catches that.)
 *
 * `elapsed_time` IS HAND-ENTERED AND STAYS THAT WAY. A finishing time is immutable
 * history, so it belongs beside `name` and the metres here rather than in the bot's JSON: the
 * bot exists to track a total that MOVES, and fetching an unchanging number nightly would
 * add a second API endpoint, an event-to-activity mapping, a new bot-owned key, and a new
 * way for an unattended push to turn the deploy red — for a figure that stopped changing
 * when the race ended.
 *
 * Named `RaceEvent` because `Event` is a live DOM global in this module.
 */

/**
 * WHAT THE ORGANISER'S OWN RESULTS SHEET SAYS. It is a SECOND ACCOUNT of a race the rider
 * also recorded, and the bib prints the two side by side rather than reconciling them.
 *
 * THE TWO ACCOUNTS DISAGREE, AND THAT IS THE FACT BEING PUBLISHED. A certified course is
 * measured with a Jones counter along the shortest legal line; a watch samples GPS around
 * whatever line was actually run, so it reads long — 22.45 against a 21.10 half. The clocks
 * disagree for a different reason again (see {@link net_time}). Nothing here is a correction
 * of {@link raceKm} and nothing here may be averaged with it: they are two instruments
 * answering the same question, and a reader is owed both readings, not a synthesis of them.
 *
 * IT IS THE ONE LINK ON A BIB A STRANGER CAN ACTUALLY FOLLOW, which is why the stub puts it
 * ABOVE the Strava links rather than after them. Both sheets this site cites render fully for
 * a logged-out visitor; every Strava activity link on the wall is a login wall. (Verified by
 * loading both pages in a real browser. `curl` gets 403 from both WAFs and proves nothing
 * either way — do not conclude a sheet is private from a command line.)
 *
 * HAND-ENTERED, and for the reason {@link RaceEventCommon.elapsed_time} is: a finishing time
 * on a results sheet stopped changing the day the race ended. There is no API here to fetch
 * it from in any case — each timing provider publishes its own page and nothing else.
 */
export type OfficialResult = {
    /**
     * CHIP TIME: the mat at the start to the mat at the finish, as `H:MM:SS`. It is the
     * rider's own race and is the figure a runner quotes.
     *
     * ABSENT WHERE THE SHEET DOES NOT PUBLISH ONE. checkpointspot prints a single time
     * against a start split, so what it gives is a gun time and this stays away rather
     * than being derived by subtraction — a derived figure would print as though the
     * organiser had stated it.
     */
    net_time?: string
    /**
     * GUN TIME: the starting gun to the finish mat, as `H:MM:SS`. It includes however long
     * the rider spent in the pen, so it is the LONGER of the two and belongs to the event
     * rather than to the athlete — 3:48:04 against a 3:30:59 net on the same half.
     */
    gun_time?: string
    /**
     * The public results page, where one exists.
     *
     * OPTIONAL BECAUSE A RESULT CAN BE PUBLISHED WITH NOWHERE TO POINT AT — a certificate
     * mailed as an image, a sheet taken down. The ledger row still earns its place then:
     * the figures are the organiser's account whether or not a reader can go and look.
     */
    url?: string
}

/**
 * A RACE WITH A SECOND ACCOUNT OF IT. The two fields travel together and the pairing is the
 * point: an official result is a row in the bib's ledger, and a ledger row needs the
 * distance the organiser says the race WAS, not the distance a watch recorded.
 *
 * SO {@link RaceEventCommon.advertised_km} IS REQUIRED HERE rather than optional-and-checked.
 * Without it the official row would have a time and a blank where its distance goes, on a bib
 * whose whole argument is that each row carries one source's distance beside that same
 * source's clock. `pnpm check` gates the deploy, so the type is the cheapest place to say it.
 */
type Documented = {
    /**
     * The event's ADVERTISED distance in km, as the organiser publishes it — 21.10 for a half
     * marathon, 1022.00 for a nine-day tour. It is the same fact a results sheet calls the
     * DIVISION entered, which is why one field serves both the booked bib's hero and the
     * ledger's official row rather than the two being stored separately and drifting.
     *
     * IT IS NOT A RECORDED FIGURE AND MUST NOT BE ROUNDED LIKE ONE. {@link kmFromMetres} is
     * about a ride that happened; this is a number off a race entry, and the two only look
     * alike.
     *
     * THE GAP BETWEEN THE TWO IS NOT SMALL, so do not treat one as a stand-in for the other:
     * the 2026 round-island ride recorded 160.56 km against a 121.98 km advertised route, and a
     * 21.10 km half marathon recorded 22.45. That gap is exactly what the ledger publishes.
     *
     * IT WAS CALLED `km`, AND THE RENAME IS WHAT MAKES THE PAIR SAFE TO STORE. Under the old
     * name a recorded race carrying one was a compile error ({@link raceKm} records why that
     * guard existed and where its coverage went); under this one the field says which account
     * it belongs to, so a reader adding a row cannot mistake it for the distance ridden.
     */
    advertised_km: number
    official: OfficialResult
}

/**
 * A RACE NOBODY ELSE HAS PUBLISHED A RESULT FOR. Its advertised distance is still allowed —
 * a booked race needs one, and a race can be entered without the organiser ever posting a
 * sheet — but there is no official account to pair it with.
 *
 * `official?: never` RATHER THAN OMITTING THE KEY, so the two members of the union are
 * DISCRIMINATED. Without it a row could carry `official` while omitting the distance its
 * ledger row needs, and TypeScript would accept it by matching this member.
 */
type Undocumented = {
    /** See {@link Documented.advertised_km}. Optional here; {@link BookedRace} requires it. */
    advertised_km?: number
    official?: never
}

type RaceEventCommon = {
    /** ISO `YYYY-MM-DD`, the day the event starts. */
    date: string
    /** ISO `YYYY-MM-DD`, the last day — multi-day events only. */
    end_date?: string
    name: string
    sport: Sport
    /**
     * Where the race is, as a country name a reader would say out loud.
     *
     * FOR A VIRTUAL EVENT THIS IS WHERE IT WAS RIDDEN, NOT WHERE THE EVENT IS BRANDED, which is
     * why a row can read "OCBC Cycle Singapore Virtual Ride" beside `Malaysia` and be correct:
     * that one was ridden in Johor Bahru. The word "Virtual" is in the name and ships uncut on
     * the bib and in llms.txt, which is what tells a reader the Singapore is the brand. Written
     * down because the pairing looks like a typo, and a reviewer proposed "fixing" it to
     * Singapore — which would have shipped a false fact about a real ride.
     *
     * REQUIRED RATHER THAN OPTIONAL, deliberately. Every bib prints it, so an event
     * without one is a bib with a blank line — and `pnpm check` gates the deploy, so
     * making it required means the next race added cannot quietly omit it. Optional would put that guarantee in a test that has to be
     * written and remembered; the type does it for free.
     *
     * A NAME, NOT AN ISO CODE AND NOT A FLAG. This string is printed for a person to
     * read, so "SG" would make them expand it; a flag emoji would be the only emoji on
     * the site, and `tests/build-output.test.ts` gates against emoji shipping at all —
     * neither theme can tone one, and a screen reader announces it as a country name
     * anyway, which is exactly this string. `METADATA.address_country` in
     * `src/content/site.ts` is an ISO code for the opposite reason: schema.org's
     * `addressCountry` is consumed by a machine. Same fact, two audiences, so two
     * spellings is correct here rather than a duplication to unify.
     */
    country: string
    /**
     * HOW THE RACE ENDED, WHERE IT DID NOT END THE WAY EVERY OTHER ROW'S DID. Absent on a
     * race that was finished and on one that has not been run.
     *
     * IT IS THE ONE FACT ON A BIB NOTHING CAN DERIVE. Neither Strava nor Garmin has any
     * concept of a DNF: an abandoned ride is stored exactly like a finished one — distance,
     * clock, map — so no recording, no elapsed time and no calendar comparison can tell the
     * two apart. `patchState` reads every other bib off the data; this one it can only be
     * told. A race abandoned at 110 km looks, to the build, precisely like a race completed
     * at 110 km.
     *
     * THE OBVIOUS OBJECTION, PRE-EMPTED, because otherwise this reads as a violation of the
     * rule above `PATCHES` in `src/content/races.ts` and the next reader deletes it. That rule
     * forbids a STORED `done` flag, because such a flag "goes stale in the one direction nobody
     * notices — a race that has been run still rendering as still-to-come". A DNF cannot go
     * stale in that direction or in any other: it is immutable history, settled the day the
     * rider stopped, exactly like the `elapsed_time` beside it. Storing a fact that
     * stopped changing is what this file already does everywhere; the forbidden thing is
     * storing an answer the calendar keeps re-deriving.
     *
     * A UNION RATHER THAN `dnf?: true`, and the difference costs nothing today. A DSQ and a
     * cancelled event are the same shape of fact, and each would otherwise arrive as another
     * boolean that has to be checked against the first. It is also what this codebase already
     * reaches for — `GoalStatus` and `PatchState` in projection.ts are both unions for the
     * same reason. Do not add a member he has not asked for; the point is only not to
     * foreclose one.
     */
    outcome?: "dnf"
    /**
     * How long the race took, as `H:MM:SS`. Absent until the race has been run and the
     * figure typed in; a bib without one simply prints no time line.
     *
     * WITH AN ACTIVITY ID BESIDE IT, THIS IS WHAT MAKES THE BIB A PATCH. The pair is the
     * site's evidence that a race was run, and it outranks the calendar — which is the
     * only reason a race can be recorded on the day it happened. See `hasRecording` in
     * projection.ts for why one field alone is not enough, and read the two-step note
     * above `EVENTS` in `src/data/races/index.ts` before adding either to a race you
     * have just finished.
     *
     * IT IS ELAPSED, NOT MOVING, AND THE BIB SAYS SO. The two are far apart on these
     * rides — the 10 July ride is 8:32:05 elapsed against 5:03:55 moving — so an unlabelled
     * time invites a reader to divide it into the distance printed beside it and get 16.5
     * km/h, where that ride actually moved at 27.7 (140.49 km / 5:03:55). The label is not
     * decoration; it names which clock.
     *
     * BOTH FIGURES COME OFF THE SAME SCOPE, which is what {@link km} changed and it settled
     * a long argument in this comment rather than continuing it. 16.5 is that recording's own
     * 140.49 km over its own 8:32:05, and 27.7 is the same distance over its own moving time:
     * a reader dividing the two numbers on the bib gets a real elapsed speed for a real ride.
     * They used to be different scopes — the EVENT's 160.59 km over the ACTIVITY's clock, which
     * is 18.8 and belonged to nothing — and three revisions of this paragraph went wrong
     * inside that mismatch, one of them quoting 160.59 / 5:03:55 = 31.7 as a speed no ride
     * held. Keep the two figures on a bib coming from the same scope and that whole class
     * of error is gone.
     *
     * WHERE A RACE WAS RECORDED IN PARTS THAT SCOPE IS THE RACE, NOT AN ACTIVITY, and the rule
     * survives because both figures move together: the summed distance over the whole span is
     * still a real elapsed speed for the race as ridden (135.31 km over 10:05:34 is 13.4 km/h,
     * and the 2h43m in a bike shop is inside both terms). What would break it is mixing the
     * scopes again — a summed distance over one part's clock. Each PART's own pair is printed
     * on its own link for the same reason, so a reader who follows one is never dividing two
     * numbers that belong to different rides. See {@link Recording}.
     *
     * WHICH ACTIVITIES, WHERE A DAY HOLDS MORE THAN ONE: the ones in `recordings`, the ones
     * these times came off, the ones the bib links to — and which those are is the rider's
     * call, not a reading of the data. 10 July is the case that names the rule, and it has
     * been read BOTH ways: the day's 22.55 km escort and its 140.49 km ride are now parts 1
     * and 2 of one event, so the row prints their summed 163.05 over a 10:09:34 span. It
     * printed 140.49 over 8:32:05 while the escort counted as a separate outing.
     *
     * NOTE WHAT DID NOT CHANGE WITH IT: the event's ADVERTISED 160.59 km was never a candidate
     * under either reading, and still is not. A bib prints what was recorded, so the only
     * question a day like this asks is WHICH recordings belong to the race — never whether to
     * reach for the route's figure instead.
     *
     * (That day is also why a 20km "silent disagreement" was once reported here and was
     * not one. A single Strava activity is not a day. Before concluding that a
     * hand-entered figure disagrees with a recorded one, ask whether the recording is
     * split.)
     */
    elapsed_time?: string
} & (Documented | Undocumented)

/**
 * A RACE THAT WAS RECORDED. Its distance is not stored anywhere: it is DERIVED from the metres
 * in {@link Recording}, by {@link raceKm}.
 *
 * IT USED TO CARRY `km?: never`, AND LOSING THAT GUARD IS THE ONE THING THIS SHAPE PAID FOR
 * THE LEDGER. A recorded race carrying a hand-typed distance beside its metres was two copies
 * of one fact, and this repository shipped that drift twice — the conversion rule was reset
 * three times and every row had to be rewritten by hand each time, from figures only a live
 * API call could recover. The compiler used to refuse the second copy outright.
 *
 * It can no longer, because the second figure stopped being a copy. A ledger prints the
 * ORGANISER's distance beside the RIDER's, and on a recorded race those are two different
 * facts that must both be storable — see {@link Documented.advertised_km}. What the old
 * spelling actually protected is the PRECEDENCE, and that moved into {@link raceKm}, which
 * reaches for an advertised figure only where there is nothing recorded to convert, with a
 * test that hands a recorded race both and asserts the metres decide. The rename is the other
 * half: `advertised_km` cannot be misread as the distance ridden the way a bare `km` could.
 *
 * AT LEAST ONE RECORDING, spelled as a non-empty tuple. `recordings: []` cannot satisfy this
 * shape, so an empty list falls to {@link BookedRace} where an advertised distance is
 * required — which is the type saying what `recordingsOf` has always said at runtime: an
 * empty array is not a recording, and a race with nothing to link to still has to have a
 * distance from somewhere.
 */
type RecordedRace = RaceEventCommon & {
    /**
     * Every Strava activity this race was recorded as, in the order they were ridden.
     *
     * ONE ELEMENT FOR ALMOST EVERY RACE. More where the rider stopped and restarted — a
     * mechanical, a lost signal, a watch that died. This replaced a single
     * `strava_activity_id?: string`, which asserted that a race has at most ONE recording;
     * that was false for the round-island rides, and the wall printed one part of a race as
     * though it were the whole thing. Do not read "the split races" as a plural of what is
     * here; count the rows. A `string | readonly string[]`
     * union was considered and rejected — it pushes normalisation onto every consumer —
     * as was keeping the singular field and adding a second one beside it, which is the
     * positional-multiplicity smell.
     *
     * PRESENT ONLY WHERE THE MAPPING HAS BEEN VERIFIED against the activity itself:
     * `tests/strava-verify.test.ts` holds every element against the API, on its own metres,
     * its own elapsed time and the day it was recorded. See the note above the type for the
     * login wall a reader following the link knowingly accepts.
     *
     * IT IS ALSO HALF OF THE PROOF THAT THE RACE WAS RUN, so it is not only a link.
     * Beside an `elapsed_time` it earns the bib outright, whatever day it is — see
     * `hasRecording` in projection.ts. Do not paste one in ahead of a race because the
     * mapping happens to exist: with a time already present that draws a solid patch for
     * a race nobody has run, which is the one failure this file works hardest to avoid.
     * The build refuses it (`tests/data-contract.test.ts`), so the cost is a red deploy.
     */
    recordings: readonly [Recording, ...Recording[]]
}

/**
 * A RACE WITH NO RECORDING — one still to ride, or one remembered without a file.
 *
 * Its distance can only be the EVENT's advertised one, because nothing else exists: no
 * activity, no metres. That is the honest floor of this shape rather than a compromise, and it
 * is why {@link Documented.advertised_km} is required here where the common shape leaves it
 * optional.
 *
 * WHEN THIS RACE IS RIDDEN IT KEEPS THE FIELD RATHER THAN LOSING IT, which is the one thing
 * the ledger changed about this edit. The row gains `recordings` and from then on
 * {@link raceKm} answers off the metres; the advertised figure stays because it is the
 * organiser's own account of the same race and the bib prints both.
 */
type BookedRace = RaceEventCommon & {
    /** Required here. See {@link Documented.advertised_km} for what it is and is not. */
    advertised_km: number
    /** Allowed only as an empty list, which means the same as absent. See {@link RecordedRace}. */
    recordings?: readonly []
}

/**
 * A RACE, IN EXACTLY ONE OF TWO SHAPES: recorded, or booked. The union is the EVIDENCE rule —
 * a race either has activities to link to or it does not, and one of those two things is
 * always true.
 *
 * IT IS NO LONGER THE DISTANCE RULE, and that sentence is retired rather than reworded because
 * it was load-bearing for three revisions. It read "a race has a recorded distance or an
 * advertised one, never both and never neither", which the ledger makes false in the "both"
 * direction on purpose: a race that was ridden AND published still has the organiser's own
 * division beside the metres. What survives of it is "never neither" — see {@link BookedRace}.
 *
 * READ IT THROUGH {@link raceKm} rather than reaching for a field. That accessor is the only
 * place that knows which shape it has AND which figure wins where a row carries both, and it
 * is what every consumer — the bib's hero, llms.txt, the projection — actually wants. The
 * ledger is the ONE consumer that legitimately reads both fields, because printing the
 * disagreement is its entire job.
 *
 * WHICH ACTIVITIES BELONG TO A RACE IS THE RIDER'S CALL, and the type cannot help there. A race
 * day very often holds more than the race, and TWO DIFFERENT THINGS LOOK LIKE A SPLIT DAY:
 *
 *   THE DAY HOLDS THE RACE PLUS SOMETHING ELSE — a shake-out, a ride to the start, dinner. Then
 *   `recordings` names the race's activity and the day's total was never a candidate. NO
 *   EXAMPLE IS NAMED HERE ON PURPOSE, and the reason is the paragraph below.
 *
 *   THE RACE ITSELF WAS RECORDED IN PARTS — the rider stopped and restarted, so no single
 *   activity holds the ride. Then every part is in `recordings` and {@link raceKm} sums their
 *   metres before converting, which is not the same as adding up what the parts print.
 *
 *   THESE TWO ARE NOT TOLD APART BY THE DATA, AND 10 JULY PROVES IT THE EXPENSIVE WAY. That day
 *   held a 22.55 km "VIP escort through Phuket" and a 140.49 km ride, 14:25 apart, and it was
 *   recorded here as the first shape for two revisions. **The rider then said the escort is part
 *   1 of the event and the ride is part 2**, which makes it the second. Nothing in the API
 *   changed; the titles never discriminated it, and neither did the gap. Only he can. So: ASK,
 *   do not infer, and do not restore an example here from a reading of a day.
 *   `GET /api/v3/athlete/activities?after=&before=` lists a day, but the titles do not settle
 *   it: 2023's parts are named `1/2` and `2/2` while 2024's second recording is named for the
 *   mechanical, and both are one race.
 */
export type RaceEvent = RecordedRace | BookedRace

/**
 * ONE STRAVA ACTIVITY A RACE WAS RECORDED AS, carrying its own figures and not only its id.
 *
 * THE FIGURES ARE HERE BECAUSE THE BIB PRINTS THEM, and that is the whole reason this is a
 * record rather than a bare id. A race recorded in parts prints a SUMMED distance and a
 * first-start-to-last-stop {@link RaceEventCommon.elapsed_time}, while each link opens ONE
 * part — so a reader who follows one meets a smaller distance and a shorter clock than the bib
 * showed them. That mismatch is exactly what `elapsed_time`'s note exists to prevent, one layer
 * up. The answer is that the bib lists the parts and each line prints what is at the other end
 * of it, which it can only do if the parts' own figures are here.
 *
 * ONE FIGURE IS STORED AND THE OTHER IS DERIVED, which is not an inconsistency. {@link metres}
 * is what the API said; a printed distance is a rendering of it and is computed. The clock has
 * no equivalent raw form worth keeping — `H:MM:SS` is already the API's seconds in the shape
 * the bib prints — so it stays as typed.
 *
 * HAND-ENTERED, for the reason {@link RaceEventCommon.elapsed_time} is: these stopped changing
 * when the race ended, and the bot exists to track a total that MOVES. Nothing fetches them
 * at build.
 */
export type Recording = {
    /**
     * The Strava activity id.
     *
     * A string rather than a number: it is an opaque identifier that only ever goes into
     * a URL, and 19-digit ids are close enough to `Number.MAX_SAFE_INTEGER` that treating
     * them as arithmetic is a category error waiting to round one.
     */
    id: string
    /**
     * THIS ACTIVITY's distance in METRES, exactly as the API's `distance` reports it —
     * 78595.0, 140498.0, 10166.6. Copy the number; do not convert it, round it, or read it off
     * a page.
     *
     * THE RAW FIGURE IS STORED RATHER THAN THE KILOMETRES BECAUSE THE CONVERSION IS A
     * DECISION, and decisions change: this repository has set the rounding rule three times and
     * hand-rewritten every row each time, from metres that only a live API call could give back.
     * Storing what the source said and converting in code ({@link kmFromMetres}) makes a fourth
     * setting a one-line edit, and makes `tests/strava-verify.test.ts` an EXACT equality against
     * the API rather than a comparison through whichever rule was current.
     *
     * IT IS ALSO THE ONLY FORM THAT SUMS CORRECTLY. A race recorded in parts converts the
     * SUMMED metres once — see {@link raceKm} — which is not the sum of what the parts print.
     * Each conversion drops whatever is below a hundredth, which is somewhere in [0, 0.01) and
     * NOT a hundredth apiece: a part landing exactly on a hundredth loses nothing. So the sum
     * of the printed parts is at or below the race's own figure, never above it, and whether a
     * given race shows the gap depends on its parts — count the rows rather than trusting any
     * sentence here about how many do. Do not derive either figure from the other;
     * `tests/strava-verify.test.ts` holds each against the API separately, which is the only
     * check that can tell them apart.
     */
    metres: number
    /** THIS ACTIVITY's elapsed time, `H:MM:SS`. Not the race's — see the type note. */
    elapsed_time: string
}
