/**
 * THE TRAINING'S OWN PROSE: every string `/training` prints, and the four the goal card spends on
 * the week it leads with.
 *
 * THE HOME PAGE IS THE SECOND READER AND IT ARRIVED WITH PLAN 047, which is why the heading above
 * no longer says "the spine's". A goal card leads with the week and its one control opens
 * `/training/<sport>`, so the card is quoting this page rather than describing itself — and a
 * sentence about weeks belongs where the weeks are described. The four are grouped at the foot of
 * the type below, each saying what it costs and why it is worded as it is.
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
    /**
     * THE HALF OF THE GOAL CARD'S HERO THAT IS NOT THE FIGURE — `{unit}` is the goals' own.
     *
     * THE CARD'S HERO IS A WEEK NOW, WHICH IS WHY THESE FOUR STRINGS LIVE HERE RATHER THAN BESIDE
     * THE GOAL. They are the training's account of itself and this module is where the training's
     * prose is; a card that leads with the week and points at the spine is reading from the spine's
     * own vocabulary, and putting them next to `NEXT_RACE` would have made the wall's module the
     * home of a sentence about weeks.
     *
     * `this week` IS PRINTED RATHER THAN IMPLIED, and the reason is that the card carries two
     * figures a reader could swap. The hero is one week and {@link card_year} is the whole year;
     * neither is legible from its own digits, so each names its own span in the same breath.
     * Measured at the `lg` breakpoint itself, which is the tightest the card ever is: the hero
     * costs 169.25px of a 182px column at the widest figure this account can produce, so the words
     * fit and a spark cannot also sit beside them — that is why the drawing sits on the row below.
     */
    card_week: string
    /**
     * THE YEAR, AS THE FIGURE THE HERO USED TO BE. `{done}` and `{target}` are the goal's own
     * kilometres and `{unit}` its own unit.
     *
     * IT IS A LINE AND NOT THE HERO, AND THAT IS THE POINT OF THE WHOLE REARRANGEMENT rather than
     * a demotion. `src/lib/projection.ts` returns `Goal met` from the day the kilometres pass the
     * target until 31 December and `0 / 600` on 1 January, so for roughly six weeks a year, twice
     * over, this was the loudest thing on the card and it was saying nothing. It says the same
     * thing here and stops being the first thing read.
     *
     * NO `this year` SUFFIX, because the card's own heading already carries it — `My cycling goal
     * this year` sits four lines above. Two statements of one span is the duplication the hero's
     * old pill was deleted for, and it costs 14.34px of a column with 31px to spare.
     */
    card_year: string
    /**
     * WHAT THE TWELVE BARS ARE ANNOUNCED AS — ONE SENTENCE, NOT TWELVE READINGS.
     *
     * `{km}` is this week's distance, `{unit}` the goals' own, `{direction}` one of the three words
     * below and `{mean}` the twelve weeks' average. The card's hero is `aria-hidden`, so this is
     * the ONLY place a listener meets that figure and it has to carry it verbatim —
     * `tests/rendered-html.test.ts` fails if the two disagree by a digit.
     *
     * IT NAMES A TREND AND NOT A SHAPE, which is the honest translation. What a sighted reader
     * takes off a sparkline is where the last bar sits against the rest; a description of twelve
     * heights is a list nobody can hold. The average is over all twelve including this one, which
     * is the ordinary reading of "against its own recent run" and is stated rather than left to be
     * inferred from a bare direction word.
     */
    card_spark: string
    /** `{direction}` when this week beats the average, when it trails it, and when it ties. */
    card_spark_above: string
    card_spark_below: string
    card_spark_level: string
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
    card_week: "{unit} this week",
    card_year: "{done} / {target} {unit}",
    card_spark: "{km} {unit} this week, {direction} a twelve-week average of {mean} {unit}.",
    card_spark_above: "above",
    card_spark_below: "below",
    card_spark_level: "level with",
    week_span: "{from} to {to}",
}
