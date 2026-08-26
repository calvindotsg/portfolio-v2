import {NEXT_RACE, PATCHES} from "../content/races"
import {goalForSport, type Sport} from "./goal"
import {formatPatchDate, patchState, patchWall} from "./projection"
import {raceKm, recordingKm, recordingsOf, stravaActivityUrl, type RaceEvent} from "./race"

/**
 * THE PATCH WALL AS MARKDOWN — the same wall, for a reader that does not parse HTML.
 *
 * IT RESTATES NOTHING, and that is the whole contract rather than a style note. Every string
 * comes from `PATCHES`, `NEXT_RACE` or the goal that owns the sport; every figure comes from
 * `raceKm`, `recordingKm`, `recordingsOf`, `patchState` and the event's own fields. The moment
 * a distance, a clock, a count or a state word is TYPED into this file rather than derived, it
 * is a second home for that value and nothing in the suite will notice — because a rendered
 * document matches its own snapshot perfectly whatever it says.
 *
 * WHY IT EXISTS. `/patches` is the site's most citable page and it is a grid of
 * absolutely-positioned bibs; an agent asked "what races has Calvin done" gets either that or
 * the one-line-per-race summary in `llms.txt`, which deliberately publishes only the RIDER'S
 * figures and drops the results-sheet account entirely. This is the document that can carry
 * both, because it is the wall's own rendering rather than a summary of the site.
 *
 * THE ORDER IS THE WALL'S ORDER. `patchWall(sport)` is asked and what it returns is rendered
 * as it returns it — not sorted, grouped or filtered here. Two consumers ordering one wall
 * with two comparators is how a document and the page it twins come to disagree about which
 * race is next, which `nextRace` in `projection.ts` already argues at length.
 *
 * ONE BULLET PER SOURCE, AND NOTHING A READER CAN DIVIDE CROSSES TWO OF THEM. A race can be
 * known twice — a certified course and a GPS trace, a chip time and a watch — and each account
 * keeps its own distance beside its own clock. That is the rule the bib's ledger rests on; see
 * `OfficialResult` in `./race.ts` for the argument and `.bib-ledger` in
 * `src/components/Patch.astro` for the drawing. A race recorded in parts gets one bullet per
 * part, each carrying THAT PART'S own figures, because the race's summed distance and its
 * first-start-to-last-stop elapsed belong to the race and never to a part.
 *
 * A KNOWN DUPLICATION, NAMED RATHER THAN HIDDEN. One derivation here — which of the two
 * official clocks a row prints — also exists in `src/components/Patch.astro`, which built it
 * first. It is two lines and it is the same rule said twice, which is a second home by any
 * honest reading. The right fix is to lift it into `./race.ts` and have the bib and this file
 * both read it; that touches a component this change was scoped away from, so it is recorded
 * here and left for whoever takes it deliberately. Change one and you must change the other.
 *
 * IT NAMES NO PATH IN THIS TREE. Its readers are fetching a URL and have no checkout to open,
 * which is the same rule `renderDesignDoc("agent")` follows and for the same reason.
 */

/** The bib's own word for each state. A finished bib is DRAWN on the wall and has to be SAID here. */
const stateWord = (event: RaceEvent): string => {
    const state = patchState(event)
    if (state === "booked") return PATCHES.booked_label
    // `dnf_name` rather than the bib's three letters, following `llms.txt.ts`: this is read by
    // a machine with no wall around it, and DNF is unambiguous only inside its own venue.
    if (state === "dnf") return PATCHES.dnf_name
    return PATCHES.finished_name
}

/** Which of the two clocks an official row is quoting. See `OfficialResult` in `./race.ts`. */
const officialClockWord = (event: RaceEvent): string =>
    event.official?.net_time === undefined ? PATCHES.gun_clock : PATCHES.net_clock

const link = (label: string, url: string) => `[${label}](${url})`

/** `130.03` prints itself and `158.10` does not, so one site must not describe one race two ways. */
const km = (value: number) => value.toFixed(2)

function bullets(event: RaceEvent, unit: string): string[] {
    if (patchState(event) === "booked") return []
    const out: string[] = []
    const official = event.official
    const officialTime = official?.net_time ?? official?.gun_time

    // THE RESULTS SHEET GOES FIRST, which is the bib's order and its reason: both cited sheets
    // render for a logged-out visitor where every Strava link on this wall is a login wall.
    if (official !== undefined && event.advertised_km !== undefined) {
        const figures = [`${km(event.advertised_km)} ${unit}`];
        if (officialTime !== undefined) figures.push(`${officialClockWord(event)} ${officialTime}`)
        const row = `- ${PATCHES.official_row} — ${figures.join(", ")}`
        out.push(official.url === undefined ? row : `${row} — ${link(PATCHES.official_link, official.url)}`)
    }

    /*
     * THE RIDER'S ACCOUNT, AND THE FALLBACK IT MUST NEVER PRINT.
     *
     * `raceKm` falls back to the ADVERTISED distance where no metres exist. That is the right
     * answer for a booked bib's hero and the worst possible one here: on an abandoned race it
     * would state that he covered the whole of a course he did not finish — the exact claim the
     * bib beside it is drawn to refuse, in the document written for machines that cannot see
     * the bib.
     *
     * THE PROTECTION IS THE BRANCHING AND NOT A CONDITION, which is worth saying because the
     * obvious guard is dead code. `raceKm` is called in the two branches below and both are
     * already gated on there BEING recordings, so the fallback is unreachable by construction;
     * a `recordingsOf(event).length > 0` test inside them can only ever be true. That was
     * written first and measured — a probe throwing whenever it ran with no recordings never
     * fired, and inverting it to always-true left the suite green. A guard that cannot fail is
     * worse than none: it reads as the thing protecting you.
     *
     * SO THE THIRD BRANCH IS WHERE THE CARE IS. A race with a clock and no recording — legal in
     * the type, absent from today's calendar — has an honest time and no honest distance, so it
     * prints the time alone and never asks `raceKm` at all.
     */
    const recordings = recordingsOf(event)
    const raceFigures = () => [`${km(raceKm(event))} ${unit}`,
        ...(event.elapsed_time !== undefined ? [event.elapsed_time] : [])].join(", ")

    if (recordings.length === 1) {
        // One recording, so the race's figures ARE the part's and the link may carry them.
        out.push(`- ${PATCHES.recorded_row} — ${raceFigures()} — `
            + link(PATCHES.strava_name, stravaActivityUrl(recordings[0])))
    } else if (recordings.length > 1) {
        // A RACE SPLIT ACROSS SEVERAL ACTIVITIES: the race line carries the summed distance and
        // the first-start-to-last-stop elapsed, and each part carries its own, so no link
        // promises the race's own hero. `elapsed` already contains stops, which is why it must
        // not depend on where the rider pressed the button.
        out.push(`- ${PATCHES.recorded_row} — ${raceFigures()}`)
        for (const part of recordings) {
            out.push(`  - ${km(recordingKm(part))} ${unit}, ${part.elapsed_time} — `
                + link(PATCHES.strava_name, stravaActivityUrl(part)))
        }
    } else if (event.elapsed_time !== undefined) {
        // A clock and no honest distance. See the note above: this branch must not reach `raceKm`.
        out.push(`- ${PATCHES.recorded_row} — ${event.elapsed_time}`)
    }
    return out
}

/**
 * The document for one wall. `undefined` is the all-sports wall, exactly as the route's own
 * rest parameter means it.
 */
export function renderPatchWall(sport?: Sport): string {
    // THE HEADING IS THE PAGE'S HEADING, by the same expression `[...sport].astro` uses. A
    // parallel template here is how the twin and the page it twins come to be headed
    // differently — the break that file already fixed once between its control and its title.
    const goal = sport === undefined ? undefined : goalForSport(sport)
    const heading = goal === undefined
        ? PATCHES.heading
        : NEXT_RACE.control.replace("{sport}", goal.goal_name.toLowerCase())

    const body: string[] = [`# ${heading}`, "", PATCHES.lede, ""]

    for (const {event} of patchWall(sport)) {
        const unit = goalForSport(event.sport).measurable_unit
        const when = formatPatchDate(event)
        body.push(`## ${event.name}`, "")
        body.push([...(when === null ? [] : [when]), event.country, stateWord(event)].join(" · "), "")
        const rows = bullets(event, unit)
        if (rows.length > 0) body.push(...rows, "")
    }

    return body.join("\n")
}
