/**
 * THE RACING COPY: the patch wall's own prose, and the goal cards' next-race lines with
 * the control beneath them. The races themselves are one module each under
 * `src/data/races/` — nothing here lists one, and the note above `PATCHES` says why.
 *
 * `uno.config.ts` READS THIS MODULE THROUGH unconfig/jiti RATHER THAN VITE, and that is a
 * standing constraint on what may ever be written here: no `import.meta.glob`, no
 * `astro:content`, no top-level `await`, and no `.astro` import — directly or through
 * anything this file pulls in. jiti has no `import.meta.glob`, so one reaching this graph
 * kills `astro build` and vitest itself, four lines of `glob is not a function` with no test
 * executed. The collector over `src/data/races/` is the module that constraint is really
 * about; the rule and the failure are written out above `EVENTS` in `src/data/races/index.ts`.
 */

// TYPE-ONLY, AND ONLY SO THE `{@link}`s BELOW RESOLVE. The race shapes live in
// `src/lib/race.ts` and took nothing with them but their names, which left a dozen references
// in the prose here pointing at identifiers no editor could follow — a link that does not
// resolve is worse than a backticked name, because it looks navigable. `import type` is erased
// before anything runs, so this adds no edge to the graph `uno.config.ts` drags through jiti and
// no byte to `dist/`; the rule it must not break is the one above `EVENTS` in
// `src/data/races/index.ts`, which is about re-exporting the COLLECTOR and is untouched by
// naming a type.
import type {OfficialResult, RaceEvent} from "../lib/race"
import type {NEW_TAB_NOTICE} from "./site"
import type {Goal, goalForSport} from "../lib/goal"

/**
 * The patch wall at `/patches`, and the two per-sport pages beside it.
 *
 * WHAT IS DELIBERATELY NOT HERE is the interesting half. There is no list of races
 * — that is `src/data/races/`, which the projection also reads, so a second copy could
 * only disagree with the goal cards about the same day. There is no "finished" or
 * "booked" flag either, on an event or in this block: whether a bib has been earned
 * is derived from the calendar every build (`patchState` in projection.ts), because
 * a stored flag goes stale in the one direction nobody notices — a race that has
 * been run still rendering as still-to-come. {@link RaceEvent.outcome} is the one
 * stored fact about a race's result, and it passes that test rather than being
 * excused from it: the calendar never re-derives an abandonment, so there is no
 * answer for it to drift from. The argument is written out where it is declared. And there are no per-sport headings or
 * titles, because those are built from {@link Goal.goal_name}; adding them here
 * would let the wall call a sport something the goal card does not.
 *
 * So what remains is only the page's own prose.
 *
 * `booked_label` is the tag an un-earned bib wears, and it is the ONE piece of text
 * carrying that state redundantly on purpose. The outline treatment says the same
 * thing in colour and shape, which is exactly why the word has to be there too:
 * SC 1.4.1 does not accept a visual treatment as the only carrier of information,
 * and a reader who cannot tell a hairline border from a filled one gets the word.
 *
 * `heading` NO LONGER NAMES THE METAPHOR, and `lede` is what carries it now. It used to
 * read "Patch wall", on the argument that the phrase is a cyclist's rather than a
 * self-evident one and so wants explaining underneath. The explanation is still there and
 * still in that order; what changed is that the heading itself now says what is on the
 * page — races, some run and some booked — rather than naming the drawing. See
 * {@link heading}, and {@link NEXT_RACE.control}, which is literally the same string.
 *
 * THE LEDE USED TO OPEN WITH A SENTENCE OF SCOPE AND NO LONGER DOES, and both halves of
 * why are worth keeping. `scope_all` said "Every race I have entered this year" and
 * `scope_sport` narrowed it, because the single unnarrowed string was a claim
 * `/patches/cycling` could not make. Two things then made the pair pointless at once: the
 * calendar became the owner's whole racing history, so the year came off every string that
 * had one, and what was left — "Every race I have entered" — says nothing the heading "My
 * events" and a filter row that already counts them by sport had not already said. The
 * maintainer's call, and the right one: a lede that restates the heading is a line a reader
 * pays for twice.
 *
 * WHAT SURVIVES IS THE ONE THING NEITHER THE HEADING NOR THE BIBS SAY. `lede` names the
 * earned bib. The treatments are close to self-explanatory — an outline wearing the word
 * BOOKED beside a solid bib is legible without a legend, which is exactly why the scope
 * sentence went — but a Finisher Patch is an OBJECT with a name, and a name has to be
 * given somewhere or it is not a name. That is this string's whole job now; it stopped
 * being a legend describing ink when it started being an introduction.
 *
 * IT NAMES THE OUTLINES FIRST because the wall shows them first: sorted next race first, a
 * sentence opening with the patches would introduce the two in the opposite order to the
 * one a reader meets them in. It closes on the patch because that is the payoff — and it
 * is phrased as a RULE ("every one I finish becomes…") rather than as a description of
 * what is currently on screen, so it stays true on the day the booked run empties and on
 * the January when nothing has been earned yet.
 *
 * `description_*` IS STILL A PAIR, and it must stay one even though the visible lede
 * stopped being scoped. The META description has no heading and no filter row beside it —
 * it is read alone, out of context, by a machine — so it is the one place a scope sentence
 * still earns its keep, and the one place an unnarrowed claim cannot be caught by looking
 * at the page. A review panel found exactly that shipping once: the visible copy was fixed
 * and the crawler's copy kept the overclaim for another two revisions.
 */
export const PATCHES: {
    heading: string
    /** The one line under the heading. See the note above — it names the Finisher Patch. */
    lede: string
    description_all: string
    description_sport: string
    all_label: string
    booked_label: string
    /**
     * WHAT A BIB PRINTS WHERE THE DISTANCE GOES, ON A RACE THAT WAS NOT FINISHED. It is a
     * RESULT, not a tag, and the difference is the whole design.
     *
     * IT IS THE RESULTS SHEET'S OWN DEVICE. A sheet prints `DNF` in the column a finishing
     * POSITION would have gone in — a status code that REPLACES a result rather than
     * annotating one — and that is exactly what this does to the hero. There is no app
     * pattern to borrow: neither Strava nor Garmin models a DNF at all (see
     * {@link RaceEvent.outcome}), so the sport's own paperwork is the only vernacular
     * available, and this audience reads the three letters without a legend.
     *
     * THE TAG WAS DRAWN AND LOST, which is worth recording because it is the obvious move.
     * Six of the seven candidates reviewed carried the state in the meta row beside
     * {@link booked_label}. Measured in the rig: that row wraps, so the word lands tucked in
     * after the sport at a fraction of the hero's size — the QUIETEST thing on the bib
     * carrying the most important fact about it, while "Booked" gets a line of its own. In
     * the hero slot the same three letters are the largest thing there. So there is no
     * `dnf_label`; the word IS the result.
     *
     * THREE CHARACTERS IS WHAT LETS IT BE THE HERO at all — `.bib-value` is sized against the
     * bib's own inline size and caps at 3rem, so a longer word would either shrink or escape.
     * The counter-case is the one the 404 page hit from the other side, where `DNS` reads as
     * Domain Name System: an abbreviation is unambiguous only inside its own venue, and a
     * wall of race bibs is this one's venue.
     */
    dnf_result: string
    /**
     * WHAT {@link dnf_result} IS SHORT FOR, said in the accessible name and nowhere on
     * screen. It is the same device {@link split_name} and {@link NEW_TAB_NOTICE} use, and
     * for the same reason: the name stays a true SUPERSET of the visible text rather than an
     * `aria-label` replacing it.
     *
     * THREE LETTERS ARE WHY THE HERO WORKS AND ALSO WHY THIS IS OWED. `DNF` announces as
     * three letters or as one nonsense syllable depending on the reader, and neither is the
     * fact. A sighted visitor who does not know the abbreviation at least has the bib around
     * it — an outline, no patch, a distance labelled as merely ridden — to read it against;
     * a listener meeting it in a run of announced text has less. `<abbr title>` is the
     * textbook answer and was rejected: `title` is unannounced by most screen readers and
     * unreachable entirely on touch, so it would look like a fix and be one nowhere.
     *
     * SENTENCE CASE, NOT CAPITALS. It is spoken, never printed — the bib's uppercase is a
     * `text-transform` on ink this string never becomes — and a capitalised run invites a
     * reader to spell it out.
     */
    dnf_name: string
    home_label: string
    home_icon: string
    filter_label: string
    /**
     * WHOSE ACCOUNT A LEDGER ROW IS. These two words are the whole reason the ledger works,
     * and they were chosen over the obvious alternative with both drawn.
     *
     * THE ALTERNATIVE WAS CLOCK NAMES — `NET` / `GUN` / `ELAPSED` — and it fails on the
     * DISTANCE column. A row reading `GUN 42.00 2:19:11` says a gun measured 42 kilometres.
     * Naming the SOURCE instead makes every cell in the row true of the same thing: the
     * organiser says 42.00 km in 2:19:11, the watch says 78.59 km in 7:40:25. A reader
     * dividing either row gets a speed that source would recognise, which is the invariant
     * the note above `elapsed_time` in `src/lib/race.ts` spends four paragraphs protecting on
     * a bib that only had one account to protect.
     *
     * WHAT THAT COSTS IS THE CLOCK KIND, AND IT IS PAID BACK IN THE LINK'S NAME. Which of
     * the two clocks an official row prints is said in {@link official_name}, where it costs
     * no ink and a listener still gets it — see {@link OfficialResult.net_time}.
     *
     * `Recorded` REPLACES BOTH `Elapsed` AND `Covered`, which is one word doing the work of
     * two captions because the row now carries both figures. `Covered` had to exist when a
     * DNF's distance was a lone labelled line arguing it was not a result; inside a ledger
     * the row name already says it is one account among two, so the participle has nothing
     * left to do. Note what is NOT lost with it: `Covered` was deliberately sport-neutral,
     * because `outcome` in `src/lib/race.ts` is on the shared event shape and a cycling verb
     * would have shipped `RIDDEN 21.10 KM` on the first abandoned run. `Recorded` is neutral
     * for the same reason and by the same rule — do not replace either of these with a
     * per-sport lookup, however available {@link goalForSport} makes one.
     */
    official_row: string
    /** See {@link official_row}. The rider's own account: the metres and the watch. */
    recorded_row: string
    /**
     * THE LEDGER'S CLOCK COLUMN HEADING. It is a heading rather than a unit repeated on
     * every figure, and the difference is measured rather than stylistic.
     *
     * THE FIRST ANSWER WAS A UNIT ON EVERY FIGURE AND IT DOES NOT FIT. At the wall's
     * narrowest bib the ledger row has 180.4px; `RECORDED 163.05 KM 10:09:34` needs 189.6px
     * and the Formosa tour's 1022.00 needs 197.1px, so on three of the calendar's races the
     * unit orphans onto a line of its own. Even the ordinary case cleared by 2.7px, which one
     * notch of text zoom removes. A heading states the unit ONCE, in the column it governs.
     *
     * IT ALSO SURVIVES A DNF, WHICH BARE FIGURES DO NOT. The hero on that branch is a word,
     * so `.bib-unit` is deliberately not rendered — with no heading and no per-figure unit,
     * an abandoned race's bib would print no unit anywhere at all.
     *
     * THERE IS NO MATCHING FIELD FOR THE DISTANCE COLUMN. That heading is
     * {@link Goal.measurable_unit}, the same string the hero sets on its side, so the two
     * cannot word the unit differently.
     *
     * AND IT IS THE DEVICE BOTH CITED SHEETS ALREADY USE: sportsplits heads its splits
     * `Location / Race Time / Pos`, checkpointspot heads its `Name / Time / Split Time`. A
     * ledger under a heading is a results table, which is what this is.
     */
    time_head: string
    /**
     * The glyph on a bib's Strava stub line. It names the destination — it no longer has to
     * carry the affordance by itself, which is the correction below.
     *
     * A hover state is not an option — there is no hover on a phone, and this site has
     * already removed one card hover for advertising an affordance that did not exist;
     * the opposite failure is an affordance that exists and is never advertised.
     * Safelisted in uno.config.ts: this is a second reference to a class LINKS already
     * carries, and relying on that coincidence is how a bib ships a mask box at zero size
     * with a green build.
     */
    strava_icon: string
    /**
     * THE ACTION ROW'S VISIBLE LABEL. It used to be an `sr-only` transcription of
     * {@link strava_icon}, and that was the defect rather than the fix.
     *
     * The argument for a bare glyph was that a shape satisfies SC 1.4.1 without leaning on
     * colour. True, and beside the point: a mark can be a legal carrier of information and
     * still be unreadable. Measured on the shipped build at 390x844, the glyph rendered
     * 7.5 x 10px — **75px² on a 324 x 141px bib, 0.16% of it** — monochrome, unlabelled,
     * in a corner, with its only words hidden from everyone who could see the bib. Two
     * friends reviewing the site did not know a bib could be clicked, and could not tell
     * which ones could.
     *
     * So the words come out of `sr-only` and the mark gets a label. NN/g's rule for exactly
     * this case is to "combine icons with text labels when icons aren't instantly
     * recognizable"; the phrasing is imperative because a control should say what happens
     * when it is used, not name a brand. It is also what answers the SECOND half of the
     * report — only a bib with EXACTLY ONE recording carries this row, so the row is what
     * tells a reader those bibs are clickable, in text rather than by inference from a
     * treatment. A race recorded in parts cannot wear it: the bib is not the link there, and
     * its stub carries {@link split_line} once per recording instead, which is the same
     * argument applied to a control that has to repeat.
     *
     * Announced last now rather than third: it sits at the foot of the bib, where a call to
     * action belongs, instead of interrupting the meta row between the sport and the
     * distance. See Patch.astro, which records the whole accessible name.
     */
    strava_name: string
    /**
     * WHICH RACE A STUB LINK BELONGS TO, said in the accessible name and nowhere on screen.
     * `{race}` is the event's name and `{date}` its {@link formatPatchDate} form.
     *
     * IT IS OWED BY EVERY LINK WHOSE VISIBLE WORDS ARE THE SAME ON EVERY BIB, which is most
     * of them: {@link strava_name} and {@link official_link} are fixed strings, so a reader
     * listing every link on the page (NVDA Insert+F7, the VoiceOver rotor) would otherwise
     * get one phrase repeated once per race with no surrounding bib to tell them apart. That
     * is the SC 2.4.4 failure this bib works hardest to avoid, and it arrived the moment the
     * whole bib stopped being the anchor — the old whole-bib link self-disambiguated, because
     * its name was the bib's entire text starting with the date.
     *
     * `{date}` IS NOT DECORATION HERE. The round-island ride is an ANNUAL event, so its name
     * repeats down the wall; the name alone would not say which running.
     *
     * A SUPERSET, NOT A REPLACEMENT. It is appended to the visible words rather than being an
     * `aria-label` over them — the device {@link split_name} and {@link NEW_TAB_NOTICE}
     * already use, and this repo's rule for every name on a bib.
     */
    race_name: string
    /**
     * THE GLYPH ON THE OFFICIAL RESULT LINK. A ruled sheet, which is what a results page is.
     *
     * SAFELISTED IN uno.config.ts, AND THAT IS NOT OPTIONAL. Icon classes are built from
     * these constants at render time, so UnoCSS never sees the token in source; one it has no
     * rule for renders as a mask box at zero size — correct markup, no icon, nothing red.
     * This one is the first icon on the site that no other constant already emits, so it has
     * no coincidence to lean on even briefly.
     */
    official_icon: string
    /**
     * THE OFFICIAL RESULT LINK'S VISIBLE LABEL, and it sits ABOVE the Strava link on the stub.
     *
     * THAT ORDER IS THE ONE THING THIS FEATURE CHANGED ABOUT WHAT A STRANGER CAN DO. Both
     * cited results pages render fully for a logged-out visitor; every Strava activity link on
     * this wall is a login wall. So the results link is the first piece of evidence on the bib
     * a reader can actually follow, and burying it under the one they cannot would be exactly
     * backwards. See {@link OfficialResult}.
     *
     * IMPERATIVE, MATCHING {@link strava_name}, for the reason recorded there: a control says
     * what happens when it is used rather than naming a brand. "Official result" alone was
     * measured too and reads as a caption sitting under a perforation — which is what the row
     * beside it would then look like as well.
     *
     * IT FITS, MEASURED: 150.1px of ink in the 170.6px a stub row has at the wall's narrowest
     * bib. Do not lengthen it without re-measuring — this is the widest string on the stub.
     */
    official_link: string
    /**
     * WHAT AN OFFICIAL RESULT LINK SAYS THAT THE LEDGER BESIDE IT CANNOT. `{clock}` is
     * {@link net_clock} or {@link gun_clock}, `{time}` the figure the ledger row prints,
     * `{race}` and `{date}` as in {@link race_name}.
     *
     * THIS IS WHERE THE CLOCK KIND LIVES, AND IT IS THE COMPENSATION FOR NAMING THE LEDGER'S
     * ROWS BY SOURCE. {@link official_row} explains why a row cannot be headed `NET` or `GUN`:
     * the same word would then be claiming a distance. The distinction is real all the same —
     * a chip time and a gun time are 17 minutes apart on the one race that has both — so it
     * goes here, where it costs no ink on a 208px bib and a listener still gets it. It is the
     * only place on the page the two clocks are told apart.
     */
    official_name: string
    /** The word for a chip time in {@link official_name}. See {@link OfficialResult.net_time}. */
    net_clock: string
    /** The word for a gun time in {@link official_name}. See {@link OfficialResult.gun_time}. */
    gun_clock: string
    /**
     * WHAT A SPLIT RACE'S LINK SAYS THAT THE READER CANNOT SEE. `{race}` is the event's name.
     *
     * A race recorded in parts lists them at the foot of the bib, one link per recording, and
     * each line prints figures rather than words — a shared label repeated once per part is
     * information at two and noise at four, which is the argument {@link booked_label} is
     * already decided by. That leaves the accessible name short of two things a reader
     * listing every link on the page needs: where it goes, and which race it belongs to.
     *
     * SO THE WORDS GO IN THE NAME RATHER THAN ON THE BIB. This is the device
     * {@link NEW_TAB_NOTICE} already uses, and the reason no `aria-label` appears anywhere on
     * a bib: an aria-label REPLACES the name with a summary, where this extends it. The name
     * stays a true superset of what is on screen, which is this repo's rule.
     *
     * It opens with a leading separator in `Patch.astro` rather than here, so the string
     * reads as a phrase rather than as punctuation with a fragment attached.
     *
     * `{race}` IS NOT ENOUGH ON ITS OWN, AND `{date}` IS HERE BECAUSE THE CALENDAR PROVED IT.
     * The round-island ride is an ANNUAL event, so its name repeats down the wall — and two of
     * its runnings are recorded in parts, which puts four links carrying one race name on a
     * single page. A reader listing every link on the page (NVDA Insert+F7, the VoiceOver
     * rotor) gets exactly these strings and no surrounding bib, so the name has to say WHICH
     * running. The whole-bib link form already self-disambiguates — its name opens with the
     * bib's date — so without this the two forms disagree about whether a date is part of a
     * link's identity. Same source, {@link formatPatchDate}, so they cannot word it differently.
     */
    split_name: string
    /**
     * THE VISIBLE LABEL ON A SPLIT RACE'S LINK. `{distance}` is that recording's own distance.
     *
     * IT OPENS WITH A VERB, AND THAT IS THE PART THAT IS LOAD-BEARING. Measured on the built
     * sheet, a split line is typographically IDENTICAL to the elapsed row above it — same
     * 0.625rem, same 0.14em tracking, same uppercase, same 800 weight — so without words the
     * only thing separating a control from a caption is a 7.5x10px glyph and the perforation
     * it sits under. This component has already measured that exact arrangement and rejected
     * it: {@link strava_icon} records two readers who could not tell a bib was clickable when
     * a mark that size was the whole cue. Repeating four characters per recording is a far
     * smaller price than an under-signified control, and it is why {@link strava_name} is an
     * imperative rather than a brand name.
     *
     * THE DISTANCE IS IN THE LABEL RATHER THAN BESIDE IT because it is what tells one link
     * from another — for a reader and for a screen reader listing every link on the page. The
     * elapsed time follows in its own element, dimmed, as context rather than as identity.
     */
    split_line: string
} = {
    /**
     * "My events", not "Patch wall", and the sport pages take `My {sport} events` from the
     * same words. The rename came from the goal card's control — see {@link NEXT_RACE} —
     * and from the rule behind it: a patch is a race COMPLETED AND EARNED, so a page that
     * shows booked outlines beside earned bibs was never wholly a wall of patches. That
     * holds whatever the mix is on the day, which is why this sentence no longer counts
     * them — it used to, and the count went stale the first time the calendar grew.
     * The heading now names what is on the page; {@link lede} names the earned
     * bib, and the bibs themselves carry the character the old heading was carrying.
     * "Patch wall" survives in the URL, in this prose and in the metaphor.
     */
    heading: "My events",
    /*
     * "FINISHER PATCH", TWO WORDS AND NO APOSTROPHE — the maintainer's spelling, and it is
     * the site's name for the object rather than a description of the drawing. What this
     * replaced was "the solid bibs are the ones I have finished", which named the fill.
     *
     * A rule, not a caption: "every one I finish becomes" is true on a wall with nothing
     * earned yet and on one with nothing left booked, where a sentence describing what is
     * currently on screen would be false half the year.
     *
     * "I HAVE NOT FINISHED" RATHER THAN "STILL AHEAD OF ME", AND THE PRECISION IS THE POINT.
     * An outline used to mean exactly one thing and now means two: a race still to come, and
     * one that was started and not completed ({@link dnf_result}). "Still ahead of me" was
     * true of every outline on the wall the day it was written and became false the day the
     * second kind arrived — the failure mode this file's comments keep recording, where copy
     * describes the data as it happened to stand. The replacement is true of BOTH kinds
     * without enumerating them, which is what keeps it from turning back into a legend: a
     * DNF bib prints its own three letters in the largest type it has, so the sentence does
     * not have to tell them apart.
     *
     * BOTH CLAUSES TURN ON THE SAME VERB, WRITTEN OUT BOTH TIMES. Finishing is the axis the
     * whole wall is sorted and drawn by, so the sentence says it twice rather than eliding
     * the second one. "every one I DO" was tried and reverted: `do` reads as VP-anaphora for
     * `finish` to one reader and as "every race I take part in" to another, and the second
     * reading is a promise the DNF bib beside it disproves — on a cycling site, where "I did
     * the Round Island" is the ordinary way to say you rode it, that reading is the likelier
     * one. A wall whose whole subject is the difference between finishing and not cannot
     * afford a sentence with a reading that collapses it.
     */
    lede: "The outlines are races I have not finished; every one I finish becomes a Finisher Patch.",
    description_all: "Every race Calvin has entered, finished or not, drawn as race bibs.",
    description_sport: "Every {sport} race Calvin has entered, finished or not, drawn as race bibs.",
    all_label: "All",
    booked_label: "Booked",
    dnf_result: "DNF",
    dnf_name: "Did not finish",
    home_label: "Home",
    home_icon: "ri:arrow-left-line",
    filter_label: "Filter by sport",
    official_row: "Official",
    recorded_row: "Recorded",
    time_head: "Time",
    strava_icon: "fa6-brands:strava",
    strava_name: "View on Strava",
    race_name: "{race}, {date}",
    official_icon: "ri:file-list-3-line",
    official_link: "View official result",
    official_name: "{clock} time {time}, {race}, {date}",
    net_clock: "net",
    gun_clock: "gun",
    split_name: "on Strava, {race}, {date}",
    split_line: "View {distance}",
}

/**
 * THE GOAL CARD'S LINE ABOUT ITS SPORT'S NEXT RACE, PLUS THE CONTROL BENEATH IT, and
 * every string here is budgeted against **182px** — the goal card's row content width at
 * 1024px wide, which is the narrowest the lg layout produces. It was 158px until this
 * revision: the figures column sat inside a wrapper with 12px of side padding, and that
 * wrapper went with the pill, so the row is the card's own content box now. Measured on the
 * built page: 182 at 1024, 201 at 1100, 214 from 1152 up; below lg the row is 254px or wider,
 * so 182 really is the floor.
 *
 * THE COUNTDOWN AND THE WAY OUT ARE TWO OBJECTS NOW, and that split is the point rather
 * than a layout detail. One element was reporting a figure AND navigating; each of these
 * does one job. The countdown is the card's fourth figure and is not interactive at all;
 * {@link control} is a quiet link that names where it goes.
 *
 * IT COUNTS IN WEEKS FROM A FORTNIGHT OUT. Two reasons, and the second is the load-bearing
 * one. A training block is written in weeks, and the line directly above this one already
 * reads "N km/wk to go", so the card speaks one unit throughout. And the exact date is on
 * the bib, one click away on the wall this card links to — so the card answers "how long
 * have I got" and the bib answers "which day", which are different questions about the
 * same race. See {@link nextRaceLine} for where the fortnight boundary is and why.
 *
 * `{days}`, `{weeks}`, `{count}` and `{sport}` are substituted. There is a separate
 * singular for one patch because "1 patches earned" is the kind of thing that ships and
 * stays; there is deliberately NO singular week, because the ladder hands days to
 * anything under a fortnight and so the smallest week count this can print is two.
 *
 * `earned` IS NOT A FALLBACK, it is the other half of the year. Nothing is booked for a
 * sport every January before its first race and again from the morning after its last,
 * and on those days the honest thing for this line to offer is what has been earned. The
 * link out no longer depends on it either way, which is what makes `none` free to say the
 * plain true thing rather than repeat the control's words.
 */
export const NEXT_RACE: {
    today: string
    tomorrow: string
    in_days: string
    in_weeks: string
    under_way: string
    earned: string
    earned_one: string
    none: string
    /**
     * The control's whole visible label, and its whole accessible name. `{sport}` is the
     * goal's own name lowercased.
     *
     * "Events" rather than "patches" is a correctness fix, not a preference: a patch is a
     * race that has been COMPLETED AND EARNED, and the page this opens shows booked
     * outlines beside earned bibs. Calling the set "patches" would have named it after
     * the half of it that exists. It is also the word the calendar itself uses — see
     * `src/data/races/` and {@link RaceEvent} — and the word Garmin uses, so a visitor meets
     * it already knowing it. The wall's three headings were renamed to match; the URL
     * stays `/patches`, which is a path rather than a claim.
     *
     * Measured at 1024: 114.4px of ink for cycling and 117.5px for running in a 182px
     * row, so every candidate considered fitted and this was decided on meaning.
     */
    control: string
    /**
     * The control's affordance, and it is not decoration. It is the one thing on the button
     * the words do not already say: the label names the destination, and this says that
     * pressing leaves the card to reach it. A shape rather than a colour, because SC 1.4.1
     * does not accept colour as a sole carrier and a phone cannot produce the hover state.
     * Safelisted in uno.config.ts like every other icon.
     *
     * IT IS A FULL ARROW NOW, not the `-s-` chevron, and the reason is the box around it. A
     * chevron at 13px was sized to sit inside a run of 12px words without shouting; the mark
     * is now alone at the far edge of a 48px control, where a chevron reads as a leftover
     * rather than as the button's one mark. It also lands the pair on the wall's own
     * vocabulary — {@link PATCHES.home_icon} is `ri:arrow-left-line`, and the two are meant
     * to be mirrored, one going out and one coming back.
     *
     * A SEMANTIC GLYPH WAS TRIED HERE AND REJECTED, which is worth recording because it is
     * the obvious idea. `ri:calendar-event-line` leading the label was built and rendered:
     * it restates the word "events" standing beside it, and a mark that repeats its own
     * label is the decoration this button has no room for. A medal was rejected earlier and
     * harder — the wall shows booked outlines beside earned patches, so a medal names half
     * of what is there, which is the same defect the control-and-heading gate in
     * tests/build-output.test.ts exists to catch.
     */
    icon: string
} = {
    today: "Next race is today",
    tomorrow: "Next race is tomorrow",
    in_days: "Next race in {days} days",
    in_weeks: "Next race in {weeks} weeks",
    under_way: "Race under way now",
    earned: "{count} patches earned",
    earned_one: "1 patch earned",
    none: "No races booked",
    control: "My {sport} events",
    icon: "ri:arrow-right-line",
}
