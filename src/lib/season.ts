import {EVENTS} from "../data/races"
import {WEEKS} from "../data/weeks"
import {GOALS, goalForSport, type Sport} from "./goal"
import {patchState, type PatchState} from "./projection"
import {type RaceEvent, recordingsOf} from "./race"
import {BUILD_DATE} from "./today"
import {
    isoWeekKey,
    isoWeekKeysOfYear,
    isoWeekMonday,
    sportOf,
    type TrainingWeek,
    type WeekTotals,
    weekTotals,
} from "./training"

/**
 * ONE YEAR OF TRAINING AND THE RACES ON IT, MERGED INTO ONE ORDERED SEQUENCE.
 *
 * THE TWO ARE ALREADY ONE DATASET AND THIS MODULE IS WHERE THAT STOPS BEING A CLAIM. A race
 * stores `recordings: [{id, metres, elapsed_time}]` — one entry per Strava activity — and a
 * `TrainingWeek` stores the same activities as sessions. The only things a race has that an
 * ordinary Tuesday does not are a name, a country, a results sheet and a bib. So nothing here
 * builds a second series beside the weeks; it puts the races ON them.
 *
 * A RACE IS A SUBSET OF ITS WEEK, NEVER AN ADDITION, AND THE ARITHMETIC IS THE WHOLE POINT.
 * Its metres are already inside a session, because a race IS a Strava activity. So the year
 * summary reads "N km, M of it in races" — **"of it", never "plus"**. Any figure that adds the
 * two is double counting, which is the class the header of `./projection.ts` refuses at length
 * and the class `src/data/races/index.ts` records costing 5 km/wk once already.
 *
 * {@link seasonTotals} therefore derives the race figure by SET MEMBERSHIP rather than by
 * summing `raceKm`: a session counts as race distance exactly when its Strava id is one of a
 * race's recording ids. That makes "of it" true by construction — the race metres are literally
 * a subset of the metres they are quoted against — where summing the races separately would be
 * two independent figures that happen to agree today. A booked race has no recording and so
 * contributes nothing, which is right: nobody has ridden it.
 *
 * THE YEAR FILTER SCOPES BY THE WEEK'S MONDAY, AND THE FILE'S KEY DOES NOT. These are plan
 * 045's two separate rules and collapsing them is the mistake that plan had to correct.
 * `2026-W01.ts` is an ISO-week key holding December-2025 sessions, and the 2026 spine excludes
 * it because its Monday (29 December 2025) is not in 2026. The Mondays partition the calendar:
 * every ISO week has exactly one, so every week belongs to exactly one year's spine and no week
 * belongs to two. See {@link isoWeekKey} in `./training.ts` for the measurement.
 *
 * WHICH IS WHY A RACE IS SCOPED BY ITS WEEK RATHER THAN BY `eventsInYear`, and the
 * difference is deliberate rather than an oversight of the one scope rule in `CLAUDE.md`. That
 * function files a race under the calendar year it STARTS in, which is what a goal card needs:
 * a goal is a calendar-year promise. A spine is a partition of WEEKS, and a race sits on the
 * week it was ridden in — so a race on 2 January 2026 belongs to the week beginning 29 December
 * 2025, and that week is on the 2025 spine. Filing it by its own year instead would put a race
 * on a spine that holds no week for it: a bib under nothing. The two rules disagree for at most
 * three days a year and agree everywhere else, and each is right for its own consumer.
 *
 * `BUILD_DATE`, NEVER `UPDATED_AT`. "Has this week happened" is a calendar question, and the
 * two-clocks rule in `CLAUDE.md` assigns those to `./today.ts`. {@link patchState} already does
 * this and this module matches it — the spine and the wall must agree about every race or the
 * page contradicts the wall one click away.
 *
 * IT REUSES {@link patchState} RATHER THAN RE-DERIVING WHETHER A BIB IS EARNED. Two consumers
 * deriving that separately is exactly how a page and the wall come to draw one race two ways;
 * the maintenance note in this plan's own file says the bug, if the two ever disagree, IS the
 * re-derivation.
 *
 * NOTHING `uno.config.ts` IMPORTS MAY IMPORT THIS MODULE. It pulls in two `import.meta.glob`
 * collectors, and those config modules are loaded through unconfig/jiti rather than Vite, where
 * `import.meta.glob` does not exist — four lines of `glob is not a function` with no test
 * executed. The same rule, with the same measurement, is at the bottom of
 * `src/data/races/index.ts` and in `src/data/weeks/index.ts`.
 */

const MS_PER_DAY = 86_400_000

/** `YYYY-MM-DD` plus `days`, as `YYYY-MM-DD`. UTC throughout, so no zone can shift a day. */
const addDays = (iso: string, days: number): string =>
    new Date(Date.parse(`${iso}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10)

/** One week on the spine. `totals` is already scoped to the page's sport. */
export type SpineWeek = {
    kind: "week"
    /** The ISO week key, which is the module filename in `src/data/weeks/`. */
    key: string
    /** That week's Monday, `YYYY-MM-DD`. The year filter reads THIS, never the key. */
    monday: string
    /** That week's Sunday. Derived, never stored — a week is seven days by definition. */
    sunday: string
    /** True when the week has not begun. A week in progress is not ahead. */
    ahead: boolean
    totals: WeekTotals
}

/** One race, sitting on the week it was ridden in. */
export type SpineRace = {
    kind: "race"
    event: RaceEvent
    /** {@link patchState}'s answer, asked rather than re-derived. */
    state: PatchState
}

export type SpineRow = SpineWeek | SpineRace

/** The calendar year a spine is drawn for. The site's clock, not the bot's stamp. */
export const seasonYear = (iso: string = BUILD_DATE): number => Number(iso.slice(0, 4))

/**
 * EVERY ISO WEEK WHOSE MONDAY FALLS IN `year`, IN ORDER.
 *
 * The candidates are drawn from three week-years rather than one, because a week-year and a
 * calendar year do not line up: `2026-W01` begins in December 2025 and `2026-W53` ends in
 * January 2027, so the weeks with a Monday in 2026 run from `2026-W02` to `2026-W53` and the
 * neighbours have to be offered before they can be rejected. Taking `isoWeekKeysOfYear(year)`
 * alone would be correct for most years and silently wrong at both ends of every one of them.
 */
export const seasonWeekKeys = (year: number): readonly string[] =>
    [year - 1, year, year + 1]
        .flatMap((y) => isoWeekKeysOfYear(y))
        .filter((key) => isoWeekMonday(key).startsWith(`${year}-`))

/** A week's sessions narrowed to one sport, or left whole where the page has no sport. */
const scopeWeek = (week: TrainingWeek, sport?: Sport): TrainingWeek =>
    sport === undefined ? week : {sessions: week.sessions.filter((s) => sportOf(s.sport_type) === sport)}

/** An empty week, so a year the fetcher has not reached still draws its own shape. */
const NO_WEEK: TrainingWeek = {sessions: []}

/**
 * THE WHOLE YEAR, TOP TO BOTTOM, WITH THE RACES ON IT.
 *
 * ORDERED FORWARDS — January at the top, December at the bottom — WHICH IS A DEPARTURE FROM THE
 * PLAN THIS MODULE WAS WRITTEN FROM, and the reason is the plan's own founding argument. Plan
 * 046 asked for the wall's order, "future-first", because `patchWall` sorts the next race first.
 * That order is right for the wall and wrong here, measured on this calendar: a spine is every
 * week of the year rather than the handful that hold a race, so the run pointing away from today
 * is EIGHTEEN empty weeks. Future-first therefore opens the page on eighteen rows of nothing
 * before the first fact, and it reverses the series in the bargain — a ramp, a taper and a gap
 * are the properties this page exists to show, and they are only legible when the series reads
 * in one direction. The wall's own note argues the opposite case from the same principle: there,
 * the booked run is four races and burying the next one is the defect. Same principle, different
 * population, opposite answer.
 *
 * A RACE ROW FOLLOWS THE WEEK IT BELONGS TO, so the sequence is week, that week's races, next
 * week. Races inside one week are ordered by date and then by name, which is the wall's own
 * tiebreak and for the wall's own reason: a tie resolved by fixture position makes the printed
 * order a property of how `EVENTS` was typed.
 *
 * A WEEK WITH NO MODULE IS STILL A WEEK. `src/data/weeks/` holds only what the fetcher has
 * reached, so the rest of the year has no files at all — and drawing the year as a spine means
 * drawing those too, because that is where the booked races sit and where "how much of the year
 * is left" is visible. An absent module is an empty week, never an error; `src/data/weeks/`'s
 * own README says an empty glob means exactly that no week has been fetched yet.
 */
export function seasonSpine(
    year: number,
    sport?: Sport,
    iso: string = BUILD_DATE,
    events: readonly RaceEvent[] = EVENTS,
    weeks: ReadonlyMap<string, TrainingWeek> = WEEKS,
): SpineRow[] {
    const keys = seasonWeekKeys(year)
    const inSeason = new Set(keys)

    const racesByWeek = new Map<string, RaceEvent[]>()
    for (const event of events) {
        if (sport !== undefined && event.sport !== sport) continue
        const key = isoWeekKey(event.date)
        if (!inSeason.has(key)) continue
        const bucket = racesByWeek.get(key)
        if (bucket) bucket.push(event)
        else racesByWeek.set(key, [event])
    }

    const rows: SpineRow[] = []
    for (const key of keys) {
        const monday = isoWeekMonday(key)
        rows.push({
            kind: "week",
            key,
            monday,
            sunday: addDays(monday, 6),
            ahead: monday > iso,
            totals: weekTotals(scopeWeek(weeks.get(key) ?? NO_WEEK, sport)),
        })
        const races = (racesByWeek.get(key) ?? []).slice().sort((a, b) =>
            a.date !== b.date ? (a.date < b.date ? -1 : 1)
                : a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
        for (const event of races) rows.push({kind: "race", event, state: patchState(event, iso)})
    }
    return rows
}

/**
 * THE SAME SEQUENCE, WITH EACH WEEK HOLDING ITS OWN RACES — a pure regrouping of what
 * {@link seasonSpine} returns, in one place because two consumers need it and a second
 * implementation is a second answer.
 *
 * The page needs it because a race is drawn as a bib and a bib is a `<li>`: two bibs in one week
 * belong side by side in one list rather than stacked as two separate rows. The document needs
 * it because a week is a heading and its races are what goes under it. Neither is free to invent
 * its own grouping.
 */
export function groupSpine(rows: readonly SpineRow[]): {week: SpineWeek, races: SpineRace[]}[] {
    const groups: {week: SpineWeek, races: SpineRace[]}[] = []
    for (const row of rows) {
        if (row.kind === "week") groups.push({week: row, races: []})
        else groups[groups.length - 1]?.races.push(row)
    }
    return groups
}

/** What a year adds up to. Every field is derived on read; none is stored. */
export type SeasonTotals = {
    /** Every scoped session's metres, over every week on the spine. */
    metres: number
    /** The subset of those metres that was ridden IN a race. Never added to {@link metres}. */
    race_metres: number
    /** How many scoped sessions the year holds. */
    sessions: number
    /** Time actually moving. Not elapsed: a year's stops are not training. */
    moving_seconds: number
    /** The busiest week's metres, which is what every bar on the spine is drawn against. */
    busiest_metres: number
}

/**
 * THE YEAR, SUMMED FROM THE ROWS THE PAGE DRAWS AND FROM NOTHING ELSE.
 *
 * IT TAKES THE ROWS RATHER THAN THE YEAR, so the summary and the spine cannot disagree: they are
 * one array read twice. A summary computed from `WEEKS` directly would be a second traversal
 * with its own filter, and the first year boundary would have shown two different totals on one
 * screen.
 *
 * `race_metres` IS A SET INTERSECTION, for the reason this module's header gives. The ids come
 * off every event rather than the year's, which costs nothing and cannot go wrong: a session is
 * only counted at all if it is inside a week the spine draws, so the year is already decided by
 * the week rather than by the race.
 */
export function seasonTotals(
    rows: readonly SpineRow[],
    sport?: Sport,
    weeks: ReadonlyMap<string, TrainingWeek> = WEEKS,
    events: readonly RaceEvent[] = EVENTS,
): SeasonTotals {
    const raceSessions = new Set(events.flatMap((event) => recordingsOf(event).map((r) => r.id)))
    const totals: SeasonTotals =
        {metres: 0, race_metres: 0, sessions: 0, moving_seconds: 0, busiest_metres: 0}
    for (const row of rows) {
        if (row.kind !== "week") continue
        totals.metres += row.totals.metres
        totals.sessions += row.totals.sessions
        totals.moving_seconds += row.totals.moving_seconds
        totals.busiest_metres = Math.max(totals.busiest_metres, row.totals.metres)
        for (const session of scopeWeek(weeks.get(row.key) ?? NO_WEEK, sport).sessions) {
            if (raceSessions.has(session.id)) totals.race_metres += session.metres
        }
    }
    return totals
}

/**
 * A DURATION AS `H:MM`, WHICH IS THE UNIT A WEEK IS ACTUALLY TRAINED IN.
 *
 * NOT THE BIB'S `H:MM:SS`, and the difference is a claim about precision rather than a
 * shortening. A race clock is a RESULT and its seconds are the result — `3:30:59` beat
 * `3:31:00`. A week's moving time is an accumulation of a dozen separate sessions, so its
 * seconds are the sum of a dozen rounding decisions somebody else's device made; printing them
 * claims a precision nothing here has. Minutes are what a training week is written in.
 *
 * IT DOES NOT CAP THE HOURS, deliberately. A year's total runs past a hundred — `187:24` — and
 * the alternative is a second unit appearing on one row of the page and nowhere else.
 */
export const hoursMinutes = (seconds: number): string => {
    const minutes = Math.round(seconds / 60)
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`
}

/**
 * "AUG", THE SAME THREE UPPERCASE LETTERS A BIB'S DATE LINE PRINTS.
 *
 * THIS IS A SECOND COPY OF A LIST `./projection.ts` ALSO HOLDS, AND IT IS DECLARED RATHER THAN
 * HIDDEN. That module's `MONTHS_SHORT` is private and plan 046 puts the module out of scope, so
 * the choice was between duplicating twelve names and inventing a second date vocabulary for
 * this page. Twelve names is the cheaper of the two: the months of the Gregorian calendar are
 * not a decision this site makes, so this list cannot DRIFT from the other one the way two
 * derived figures can — it can only be wrong, and wrong is visible on the first row. A second
 * date idiom on a second page would be a real divergence, and `CLAUDE.md` records at length
 * what one object drawn two ways costs.
 *
 * WHAT IS OWED: fold both into one exported list the first time `./projection.ts` is in scope.
 */
const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

/**
 * A DAY AS `24 AUG`, WHICH IS A WEEK ROW'S WHOLE DATE AND NOT A RANGE.
 *
 * THE SPAN IS NOT DRAWN, deliberately. A week runs Monday to Sunday by definition and the
 * page's lede says so once; printing both ends on all fifty-two rows spends a third of the
 * row's ink restating the definition. It also removes the one place a range would have had to
 * grow a second month (`28 DEC – 3 JAN`) and, in that same week, a second year.
 *
 * NO YEAR EITHER, and for the mirror of the reason a bib prints one: a bib sits on a wall that
 * spans years, and a spine is one year with the year in its card's own heading.
 */
export const shortDate = (iso: string): string => {
    const [, month, day] = iso.split("-")
    return `${Number(day)} ${MONTHS_SHORT[Number(month) - 1]}`
}

/**
 * THE UNIT EVERY DISTANCE ON THIS PAGE IS IN, TAKEN FROM THE GOALS RATHER THAN TYPED.
 *
 * A sport page asks its own goal, exactly as a bib does. The ALL-SPORTS page has no goal to ask
 * and cannot invent one, so it asks whether the goals agree — and throws where they do not,
 * which is the loud failure rather than the flattering one. A year total summed across two
 * sports measured in different units is not a number, so there is nothing correct to print and
 * a page that printed something would be publishing a figure with no meaning. Today both goals
 * say `km`; the day one says `mi`, this page is what has to be redesigned.
 */
export const seasonUnit = (
    sport?: Sport,
    goals: readonly {sport: string, measurable_unit: string}[] = GOALS,
): string => {
    if (sport !== undefined) return goalForSport(sport).measurable_unit
    const units = new Set(goals.map((g) => g.measurable_unit))
    if (units.size !== 1) {
        throw new Error(`The goals measure distance in ${[...units].join(" and ")}, so an all-sports `
            + "total has no unit. See seasonUnit in src/lib/season.ts")
    }
    return [...units][0]
}
