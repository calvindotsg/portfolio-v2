/**
 * THE TRAINING SPINE'S OWN PROSE: every string `/training` prints, and nothing else.
 *
 * WHAT IS DELIBERATELY NOT HERE is the same half `PATCHES` leaves out next door. There is no
 * list of weeks — that is `src/data/weeks/`, written by a script — and no figure, no count and
 * no state flag: whether a week has happened is derived from the calendar every build
 * (`seasonSpine` in `src/lib/season.ts`), and how far it went is summed from its sessions. A
 * figure typed here would be a second home nothing could see, because a rendered page matches
 * its own snapshot whatever it says.
 *
 * THERE ARE NO PER-SPORT HEADINGS EITHER, for `src/content/races.ts`'s reason: a sport is
 * called what {@link Goal.goal_name} calls it, in one place, so this page cannot name a sport
 * something the goal card does not.
 *
 * `uno.config.ts` DOES NOT READ THIS MODULE and must not be made to. `src/lib/icons.ts` is what
 * drags a content module into that graph, and it pulls in only the modules that DECLARE AN
 * ICON. This page declares none — the spine is bars and figures, and its filter row is the
 * wall's own unmarked chip — so this module stays out of the jiti graph by having nothing that
 * graph wants. Give a string here an icon id and it joins it; read the constraint above
 * `PATCHES` before doing so.
 */

import type {Goal} from "../lib/goal"
import type {PATCHES} from "./races"

/**
 * The spine at `/training`, and the two per-sport pages beside it.
 *
 * THE HEADING IS HALF OF A PAIR THAT DOES NOT EXIST YET. `tests/build-output.test.ts` asserts
 * that a control's visible label is the heading of the page it opens — the defect it was
 * written for is a reader pressing "My cycling events" and landing on a page headed "Cycling
 * patches". Plan 047 puts a control on the home page pointing here, and {@link control} is the
 * string it will wear: ONE string at both ends, which is what makes the break impossible rather
 * than merely corrected. It is the heading of the sport pages today and gains its second reader
 * then; see {@link PATCHES} and `NEXT_RACE.control`, which are the same arrangement one page over.
 *
 * "TRAINING" RATHER THAN "SESSIONS" OR "VOLUME", and that is the reader's word rather than the
 * system's. `src/data/weeks/` stores sessions and this module renders their totals, but nobody
 * describes their year as a set of sessions; they describe it as training. A name that only
 * makes sense once you know how the data is stored is a name every reader has to be taught.
 *
 * WHY THE LEDE NAMES THE SCALE. A bar whose length means nothing until you know what it is
 * measured against is a decoration, and this one is measured against the busiest week of the
 * year rather than against a target — the page has no target, which is exactly what separates
 * it from a goal card. It names the outline for the reason {@link PATCHES}'s lede names the
 * Finisher Patch: a treatment that means "this has not happened" has to be given its meaning
 * somewhere, and a rule ("weeks that have not happened") stays true in January and in December
 * where a description of what is currently on screen would not.
 *
 * AND IT NAMES WHERE A RACE SITS, because that is the one thing about this page a reader could
 * otherwise get wrong in the expensive direction. A race is a Strava activity, so its
 * kilometres are already inside its week's bar; a reader who took the bib as an addition would
 * double count exactly the way the header of `src/lib/projection.ts` refuses to.
 */
export const TRAINING: {
    heading: string
    /** `{sport}` is the goal's own name, lowercased. See the note above — one string, two ends. */
    control: string
    lede: string
    description_all: string
    description_sport: string
    all_label: string
    filter_label: string
    /** The spine card's own heading. `{year}` is the calendar year the page draws. */
    spine_heading: string
    /**
     * THE YEAR IN ONE SENTENCE. `{km}` is the distance, `{unit}` the goals' own unit and
     * `{races}` the part of that distance ridden in races.
     *
     * "OF IT", NEVER "PLUS", AND THE PREPOSITION IS THE WHOLE CLAIM. A race is a Strava
     * activity, so its kilometres are already inside the weeks this figure sums; a sentence
     * adding the two would double count, which is the class the header of
     * `src/lib/projection.ts` refuses at length. `seasonTotals` makes it true by construction
     * rather than by arithmetic that happens to agree — read its note before rewording this.
     */
    summary_distance: string
    /** `{count}` sessions and `{time}` moving. There is a singular because a January has one. */
    summary_effort: string
    summary_effort_one: string
    /**
     * THE COLUMN HEADING OVER A WEEK'S SESSION COUNT. A heading rather than a unit repeated on
     * every row, which is {@link PATCHES.time_head}'s argument applied to a longer column: the
     * spine is fifty-two rows, so a word on each of them is fifty-two copies of a fact stated
     * once at the top.
     */
    sessions_head: string
    /**
     * THE COLUMN HEADING OVER A WEEK'S MOVING TIME, AND IT IS DELIBERATELY NOT
     * {@link PATCHES.time_head}. That string heads a bib's ledger, where the figure under it is
     * a RESULT — a race clock, to the second, that a rider was placed by. This one heads an
     * accumulation of a dozen sessions to the nearest minute. Two captions that happen to be
     * the same word are not one string: coupling them would mean that rewording the bib's
     * ledger reworded this page, and the two are answering different questions.
     */
    time_head: string
    /**
     * WHAT A WEEK THAT HAS NOT HAPPENED PRINTS, and it is the whole reason the outline is
     * legible. The treatment says "nothing here yet" in shape; SC 1.4.1 does not accept a
     * treatment as the only carrier, and the ambiguity is real rather than theoretical — a
     * REST week and a week still ahead both draw an empty bar, and only the word tells them
     * apart. `Booked` was the obvious borrow from the bib beside it and is wrong: a race is
     * booked because somebody entered it, and nobody books a week.
     */
    ahead_label: string
    /**
     * A WEEK'S SPAN IN THE MARKDOWN TWIN, `{from}` to `{to}`, AS ISO DAYS.
     *
     * THE PAGE DOES NOT PRINT A SPAN AT ALL — `shortDate` in `src/lib/season.ts` records why —
     * and the document does, which is the two renderings answering to their own readers rather
     * than a divergence. A reader of the page has fifty-two rows in order and a lede saying a
     * bar is a week; a machine quoting one line out of the document has neither, so the line
     * has to carry both ends and carry them unambiguously.
     */
    week_span: string
} = {
    heading: "My training",
    control: "My {sport} training",
    lede: "One bar a week, drawn against the busiest week of the year. The outlines are weeks "
        + "that have not happened, and every race sits on the week it was ridden in rather than "
        + "beside it.",
    description_all: "Every week of Calvin's training year, drawn as one bar each, with the races on it.",
    description_sport: "Every week of Calvin's {sport} year, drawn as one bar each, with the races on it.",
    all_label: "All",
    filter_label: "Filter by sport",
    spine_heading: "{year} week by week",
    summary_distance: "{km} {unit} this year, {races} of it in races.",
    summary_effort: "{count} sessions, {time} moving.",
    summary_effort_one: "1 session, {time} moving.",
    sessions_head: "Sessions",
    time_head: "Moving",
    ahead_label: "Ahead",
    week_span: "{from} to {to}",
}
