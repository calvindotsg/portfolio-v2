import {PATCHES} from "../content/races"
import {TRAINING} from "../content/training"
import {goalForSport, type Sport} from "./goal"
import {formatPatchDate, patchState} from "./projection"
import {kmFromMetres, raceKm, recordingsOf, type RaceEvent} from "./race"
import {
    groupSpine,
    hoursMinutes,
    seasonSpine,
    seasonTotals,
    seasonUnit,
    seasonYear,
    type SpineWeek,
} from "./season"

/**
 * THE TRAINING SPINE AS MARKDOWN — the same year, for a reader that does not parse HTML.
 *
 * IT RESTATES NOTHING, and that is the whole contract rather than a style note. Every string comes
 * from `TRAINING` or `PATCHES`; every figure comes from `seasonSpine`, `seasonTotals`, `raceKm`
 * and `patchState`. The moment a distance, a clock, a count or a state word is TYPED into this
 * file rather than derived, it is a second home for that value and nothing in the suite will
 * notice — because a rendered document matches its own snapshot perfectly whatever it says. That
 * failure mode is `src/lib/patch-doc.ts`'s header, said once more because this file could commit
 * it independently.
 *
 * ONE HEADING AND ONE LIST, WHICH IS WHERE IT PARTS COMPANY WITH THE WALL'S DOCUMENT. That one
 * gives each race an H2 because a race has several accounts and each needs somewhere to live. A
 * week has exactly one account of itself — its own sessions — so fifty-two headings would be
 * fifty-two headings over one line each, and the SERIES, which is the thing this page exists to
 * show, would be spread across fifty-two sections rather than readable as a column.
 *
 * A RACE IS A CHILD OF ITS WEEK IN THE LIST, WHICH IS THE ONE-DATASET RULE MADE STRUCTURAL. Its
 * kilometres are already inside the week above it; a sibling bullet would invite the addition that
 * the page's own lede and `seasonTotals` both refuse. Nesting says "part of" in the only vocabulary
 * a list has.
 *
 * A WEEK AHEAD PRINTS A WORD WHERE ITS FIGURES WOULD HAVE BEEN, which is the bib's device and the
 * page's: a status word REPLACES a result rather than annotating one. It is not an omission — a
 * document that simply left those weeks out would be answering a different question from the page
 * beside it, which draws the whole year.
 *
 * IT NAMES NO PATH IN THIS TREE. Its readers are fetching a URL and have no checkout to open,
 * which is the rule `renderPatchWall` and `renderDesignDoc("agent")` already follow.
 */

/**
 * THE BIB'S OWN WORD FOR EACH STATE, AND THIS IS THE SECOND COPY OF THAT MAPPING.
 *
 * `stateWord` in `src/lib/patch-doc.ts` is the first, and the two must agree: one race described
 * two ways by one site is the defect the whole of `src/content/` is arranged to prevent. It is
 * copied rather than shared because that file is out of scope for the plan this module was built
 * from — exporting from it would have been a one-line change to a file whose whole rendering is
 * asserted byte-identical, and a rule copied WITH ITS POINTER is recoverable where a silent
 * divergence is not.
 *
 * WHAT IS OWED: export the original and delete this the first time the wall's document is in
 * scope. The values themselves are not duplicated — both read `PATCHES` — so what can drift is
 * only which word answers which state.
 */
const stateWord = (event: RaceEvent): string => {
    const state = patchState(event)
    if (state === "booked") return PATCHES.booked_label
    // `dnf_name` rather than the bib's three letters, following `llms.txt.ts` and the wall's
    // document: this is read by a machine with no wall around it, and DNF is unambiguous only
    // inside its own venue.
    if (state === "dnf") return PATCHES.dnf_name
    return PATCHES.finished_name
}

/**
 * A RACE'S OWN DISTANCE, OR NOTHING, AND THE THIRD CASE IS WHERE THE CARE IS.
 *
 * `raceKm` falls back to the ADVERTISED distance where no metres exist. That is the right answer
 * for a booked race — the course IS that long and nobody has ridden it — and the worst possible
 * one for a race that was abandoned with nothing recorded, where it would state that he covered
 * the whole of a course he did not finish. So the fallback is reached only on the branch that
 * wants it. The rule and the reasoning are `bullets()` in `src/lib/patch-doc.ts`; this is the same
 * condition, and the two must not drift.
 */
const raceDistance = (event: RaceEvent): number | undefined => {
    if (recordingsOf(event).length > 0) return raceKm(event)
    return patchState(event) === "booked" ? raceKm(event) : undefined
}

/** `130.03` prints itself and `158.10` does not, so one site must not describe one race two ways. */
const fixed = (value: number) => value.toFixed(2)

const weekLine = (week: SpineWeek, unit: string): string => {
    const span = TRAINING.week_span.replace("{from}", week.monday).replace("{to}", week.sunday)
    const figures = week.ahead
        ? TRAINING.ahead_label
        : `${fixed(kmFromMetres(week.totals.metres))} ${unit}, `
            + `${week.totals.sessions} ${TRAINING.sessions_head.toLowerCase()}, `
            + `${hoursMinutes(week.totals.moving_seconds)} ${TRAINING.time_head.toLowerCase()}`
    return `- ${week.key} (${span}) — ${figures}`
}

const raceLine = (event: RaceEvent, unit: string): string => {
    const when = formatPatchDate(event)
    const far = raceDistance(event)
    return `  - ${[
        event.name,
        ...(when === null ? [] : [when]),
        event.country,
        stateWord(event),
        ...(far === undefined ? [] : [`${fixed(far)} ${unit}`]),
    ].join(" · ")}`
}

/**
 * The document for one spine. `undefined` is the all-sports page, exactly as the route's own rest
 * parameter means it.
 */
export function renderTrainingSpine(sport?: Sport): string {
    // THE HEADING IS THE PAGE'S HEADING, by the same expression `[...sport].astro` uses. A parallel
    // template here is how a twin and the page it twins come to be headed differently.
    const heading = sport === undefined
        ? TRAINING.heading
        : TRAINING.control.replace("{sport}", goalForSport(sport).goal_name.toLowerCase())

    const year = seasonYear()
    const unit = seasonUnit(sport)
    const rows = seasonSpine(year, sport)
    const totals = seasonTotals(rows, sport)

    const summary = [
        TRAINING.summary_distance
            .replace("{km}", fixed(kmFromMetres(totals.metres)))
            .replace("{unit}", unit)
            .replace("{races}", fixed(kmFromMetres(totals.race_metres))),
        (totals.sessions === 1 ? TRAINING.summary_effort_one : TRAINING.summary_effort)
            .replace("{count}", String(totals.sessions))
            .replace("{time}", hoursMinutes(totals.moving_seconds)),
    ].join(" ")

    const body: string[] = [
        `# ${heading}`, "",
        TRAINING.lede, "",
        summary, "",
        `## ${TRAINING.spine_heading.replace("{year}", String(year))}`, "",
    ]

    for (const {week, races} of groupSpine(rows)) {
        body.push(weekLine(week, unit))
        for (const {event} of races) body.push(raceLine(event, unit))
    }
    body.push("")

    return body.join("\n")
}
