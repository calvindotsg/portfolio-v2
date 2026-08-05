import stravaProgress from "../data/strava-progress.json"

/**
 * The one Strava destination, reached from exactly one control — the social link
 * below. It is a named constant rather than a literal in that entry because the
 * athlete id inside it has a SECOND sanctioned home that nothing can check:
 * `STRAVA_ATHLETE_ID`, the repository *variable* that
 * `scripts/fetch-strava-progress.mjs` reads. The two hold the same value for
 * different jobs — this decides where a visitor lands, that decides whose
 * kilometres the goal cards show — so changing accounts means editing both, and
 * updating only the variable publishes a stranger's distances under a link to the
 * old profile. README.md's Configuration section is where that is explained; this
 * is the pointer, because this is the half a person edits here.
 *
 * Worth knowing before adding a second, more specific Strava control: there is no
 * public per-sport URL for an athlete ON STRAVA. `?activity_type=Run` and
 * `?activity_type=Ride` serve the same page — SHA-256 equal over 544,386
 * characters once the per-request tokens are normalised away — and of 25
 * sport-scoped path shapes tried, every one either 404s or redirects to /login.
 * A logged-out visitor meets a login wall whichever Strava URL they are given.
 *
 * PER-ACTIVITY URLS ARE THE SAME WALL, and this paragraph exists because the opposite
 * was believed on good-looking evidence. `curl` gets **HTTP 200 with no redirect** from
 * `strava.com/activities/<id>`, which reads as "public" and was recorded as such. It is
 * not: fetched and read, the page for a logged-out visitor is
 * *"Log in to see 'MBG DCR 2026 Krabi to Phuket'"* and a sign-up prompt. The title is
 * there; the distance, the date and the time are not. Checked on two of the owner's rides
 * (19279762093 and 19254155835) on 2026-07-28; the finding is about Strava rather than
 * about those two, and a `followers_only` activity is walled harder still — see
 * {@link RaceEvent.recordings}'s note.
 *
 * So a status code is not an answer to "can a reader see this" — READ THE PAGE.
 *
 * THE FINISHED BIBS LINK ANYWAY, and that is a decision taken with this paragraph in
 * front of it rather than in ignorance of it. See {@link RaceEvent.recordings},
 * which carries the reasoning and the accepted cost; do not delete those links as an
 * oversight, and do not delete this evidence as obsolete. What it still rules out is a
 * second link to the PROFILE — that one adds a wall and reaches nothing the intro card's
 * social link does not already reach.
 *
 * THAT NEVER SETTLED WHAT A GOAL CARD MAY LINK TO, and the note used to read as
 * though it did. This site serves its own per-sport page — `/patches/cycling` and
 * `/patches/running`, one prerendered route each, no login anywhere — and each goal
 * card now carries a link to its own, so "there is nowhere to send them" has stopped
 * being true twice over. The paragraph above is still the answer for STRAVA: a second
 * Strava control would go to this same profile and meet the same wall.
 */
const STRAVA_PROFILE_URL = "https://www.strava.com/athletes/37641259/";

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
 * The cost of doing so is now this line rather than every row in {@link EVENTS}.
 *
 * `Math.floor` OVER `Math.trunc` is only a spelling — a distance is never negative — but it is
 * the one that keeps saying "drop the third decimal" if a signed value ever reaches it. Scaling
 * to integer hundredths first is NOT a spelling: `Number((metres / 1000).toFixed(2))` rounds the
 * double it is handed, which agrees with this on some rides and not others. And the division is
 * exact where it has to be: `metres / 10` can only land below an integer if that integer is not
 * representable, and every quotient here is far under 2^53, so a whole multiple of 10 m does not
 * fall to the hundredth beneath it. `tests/constants.test.ts` executes both claims.
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
 * recorded to convert — and `tests/constants.test.ts` holds that by handing a recorded race
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
 * `name` is the control's whole accessible name, announced verbatim — the icon
 * beside it is aria-hidden, so this string is all a screen reader gets. It used
 * to be a bare noun that the template suffixed with " Profile", which is why the
 * résumé link announced as "Resume Profile": a PDF is not a profile, and the
 * suffix lived in markup where nobody editing this file could see it.
 */
export const LINKS: {
    link: string
    logo: string
    name: string
}[] = [{
    link: "https://github.com/calvindotsg/", logo: "fa6-brands:github", name: "Github Profile"
}, {
    link: "https://www.linkedin.com/in/calvin-loh/", logo: "fa6-brands:linkedin", name: "LinkedIn Profile"
}, {
    link: "https://www.instagram.com/calvindotsg/", logo: "fa6-brands:instagram", name: "Instagram Profile"
}, {
    link: STRAVA_PROFILE_URL, logo: "fa6-brands:strava", name: "Strava Profile"
}, {
    link: "https://t.me/calvindotsg/", logo: "fa6-brands:telegram", name: "Telegram Profile"
}, {
    // "View", not "Download": the file opens in a tab rather than saving.
    link: "/resume.pdf", logo: "ri:file-pdf-2-line", name: "View résumé (PDF)"
},];

/**
 * `CAREER[0].job_name` IS THE SITE'S ONLY RECORD OF THE CURRENT JOB, and five surfaces derive from
 * it: the JSON-LD `jobTitle` in `BasicLayout.astro`, the `/llms.txt` blockquote and career line,
 * the intro card's h1 ({@link WELCOME}), and the page title ({@link METADATA.title}) — which also
 * feeds `og:title` and `twitter:title`. Change it here and every one of them moves.
 *
 * ONE THING IS NOT AUTOMATIC: the title has a width budget, so a longer job title can fail
 * `tests/constants.test.ts` with a measured overflow. That is the gate working, not a bug — read
 * the note on {@link METADATA.title} before shortening anything to get past it.
 */
export const CAREER: {
    company: string
    company_url: string
    description: string[]
    end_date: string
    job_name: string
    start_date: string
    icon: string
}[] = [{
    company: "HeyMax",
    company_url: "https://www.heymax.ai",
    description: [
        "Started as a community member, now an engineer turning your pain points into processes",
        "Built customer support and ops from scratch, growing towards 6 figure weekly active users"
    ],
    end_date: "Present",
    job_name: "Founding Business Systems Analyst",
    start_date: "Aug 2023",
    icon: "ri:tools-line"
}, {
    company: "NCS Group",
    company_url: "https://www.ncs.co/en-sg/",
    description: [
        "I'm your solution when you hear users say 'I'm trying to do my job but your app is so buggy'",
        "I'm your Sherlock with data and logs to solve tricky technical problems"
    ],
    end_date: "Aug 2023",
    job_name: "Business Systems Analyst",
    start_date: "Jun 2022",
    icon: "ri:search-line"
}]

/**
 * The open-source tools, for `/llms.txt`. Not rendered on any page — the bento grid has
 * no room and gained none for this.
 *
 * WHY IT LIVES HERE AND NOT IN `llms.txt` ITSELF. The file it feeds used to be a
 * hand-written `public/llms.txt`, and it had drifted twice over: it paraphrased the
 * descriptions rather than quoting them, and it omitted `homebrew-tap` completely — while
 * listing `granola-to-minutes`, which the profile README does not. A fact
 * written down in two places diverges; this file is the one place the rest of the site
 * already treats as the source of truth, so putting it here means the endpoint is
 * derived and the drift class is closed rather than the wording merely corrected.
 *
 * THE SOURCE IS CALVIN'S OWN PROFILE README (github.com/calvindotsg/calvindotsg), read
 * 2026-07-30 — his selection, in his wording, because `llms.txt` is a self-description
 * and the alternative is me summarising a summary. An earlier draft of this list was
 * built from the GitHub repos API instead and got the membership WRONG in both
 * directions: it invented an inclusion rule ("public, not a fork, has a description"),
 * which pulled in tools he does not lead with and dropped `portfolio-v2` and
 * `homebrew-tap`, which he does. A curated list is not a stale API — it is the answer to
 * a different question, and it is the question `llms.txt` asks.
 *
 * TWO PUBLIC REPOS ARE DELIBERATELY ABSENT because the README omits them:
 * `granola-to-minutes` (3 stars, his most-starred) and `cc-menubar`. That is his editorial
 * call to revisit, not a bug to fix here — but it is written down so the next person does
 * not "helpfully" re-add them from the API and undo the curation.
 *
 * MAINTAINED BY HAND, with the cost named. The obvious alternative is the pattern
 * {@link GOALS} uses — a scheduled job writing a bot-owned JSON — and it was built here
 * and then deleted, because these change a few times a year where kilometres change
 * daily, and because a bot cannot curate. The cost is that this list is exactly as
 * current as the profile README; when that changes, change this.
 */
export const PROJECTS: {
    name: string
    description: string
    repo_url: string
}[] = [{
    name: "portfolio-v2",
    description: "My personal landing page calvin.sg: who I am, what I'm working on now, and a live tracker for this year's cycling and running goals.",
    repo_url: "https://github.com/calvindotsg/portfolio-v2"
}, {
    name: "mac-upkeep",
    description: "Why do dev tools scatter caches and updates across macOS with no coordinated cleanup? A zero-config CLI that runs unified maintenance on boot and weekly via launchd.",
    repo_url: "https://github.com/calvindotsg/mac-upkeep"
}, {
    name: "homebrew-tap",
    description: "Why ship install instructions when `brew install` exists? A personal tap that turns every CLI above into a one-line install on macOS, auto-bumped by release-please dispatch.",
    repo_url: "https://github.com/calvindotsg/homebrew-tap"
}]

/**
 * The intro card's own voice — and the second line NAMES A CHALLENGE THAT IS STILL ON.
 *
 * ITS AGE IS NOT EVIDENCE OF DRIFT. A copy audit reached for this line because it had
 * not changed in over a year, which measures the git log rather than the challenge:
 * the ride it names is one the maintainer is still riding, so the sentence is current
 * and was kept. The only thing that can settle this line is the challenge itself —
 * check that before rewriting it, and do not take a commit date as the answer.
 */
export const ABOUT_ME: {
    description: string[]
} = {
    description: [
        "If you tell me to wake up before sunrise, I'd say you're crazy. But if it's for cycling? Count me in!",
        "Join me in my latest cycling challenge 1000km in 5 weeks, helping vulnerable teens #cyclehome"
    ]
}

/**
 * A goal card's way out is this site's own patch wall, not the service the figure came
 * from — and the absence of `website_url`, `cta_label` and `cta_logo` here is what that
 * decision looks like in the data.
 *
 * Each card used to carry a call to action pointing at {@link STRAVA_PROFILE_URL}, the
 * same place the intro card's social link reaches, so the page spent three of its nine
 * controls on one destination a logged-out visitor cannot see. Both were removed. The
 * link that replaced them is a component rather than three fields on this type
 * (`components/EventsLink.astro`) because it is not a configured destination: the href
 * is derived from the goal's own `sport`, and its label from the goal's own name. There
 * is nothing for an editor to fill in, which is the point — see {@link NEXT_RACE} for
 * the strings, which are the only part a person edits.
 *
 * SETTLED 2026-07-28, so the earlier "what has NOT been decided is whether a goal card
 * should carry a link at all" is spent. It does. The budget question that paragraph
 * raised was real and was answered by measurement rather than by taste: the card gave a
 * line back to pay for it. Goal.astro records the arithmetic.
 */
export type Goal = {
    total_goal: number
    /** Clamped to `total_goal` — what the bar and the "x of y" line read. */
    current_progress: number
    /**
     * UNCLAMPED km, straight from the bot JSON, and what `projection.ts` reads.
     *
     * Be precise about why, because the obvious justification is wrong and was
     * written here first: it is NOT that the clamped figure would misreport a met
     * goal. `clampToGoal` is `min(raw, total_goal)`, and the projection's met test
     * is `>= total_goal`, so the two agree on every input — mutation-verified.
     *
     * The reason is that `current_progress` is a DISPLAY value. It exists so an
     * overshot year cannot push the bar past 100%, and arithmetic that reads a value
     * shaped for a progress bar inherits that shaping. The agreement above is a
     * coincidence of two facts that are free to move independently: the clamp's
     * formula, and the threshold the projection happens to compare against. Reading
     * the source figure means neither can be changed into a silent wrong answer, and
     * it is what lets a future "met, and 200 km past it" say the second half at all.
     */
    raw_progress: number
    /** null when there is no comparable figure — e.g. first year back at the sport */
    progress_last_year: number | null
    goal_name: string
    /**
     * The sport in as few letters as it can be said — "Ride", not "Cycling".
     *
     * It exists for THE BIB, and only for the bib: the sport is announced inside a 13rem
     * bib on a line that already carries a date and sometimes a status tag. `goal_name`
     * uppercased is what that line held first, and "CYCLING" wrapped it; there is no
     * room for the long word and no reason to spend it, because the icon beside this
     * is carrying the same meaning a second time.
     *
     * IT IS NOT THE WALL'S NAVIGATION WORD, and it was read that way once. The filter
     * chips took this field too, so the wall's own "where am I" control said RIDE while
     * the control that opened it, the page's heading and the URL all said cycling. A
     * space constraint that is real inside a bib does not transfer to a row with a line
     * to itself — the chips read `goal_name` now. Before reaching for this field, check
     * that the place you are putting it is short of room.
     *
     * It lives on the GOAL rather than beside {@link EVENTS} because the goal is
     * already the one place a sport is described — icon, unit, display name — and a
     * second table keyed by sport is how those descriptions start to disagree. See
     * {@link goalForSport}, which is the join every consumer should use.
     */
    short_name: string
    goal_logo: string
    measurable_unit: string
    /** Joins this goal to {@link EVENTS}. See {@link Sport}. */
    sport: Sport
}

/**
 * The calendar year every figure on this page is year-to-date against: the bot's
 * km, `progress_last_year`, and the races in {@link EVENTS}.
 *
 * It is a constant rather than `new Date().getFullYear()` on purpose. A derived
 * year rolls over at midnight UTC on 1 January and the page silently starts
 * reporting a fresh year's target against last year's races and last year's
 * closing kilometres, with every test still green. Pinned, the January rollover is
 * a deliberate edit.
 *
 * THE JANUARY CHECKLIST LIVES HERE, not in README.md — an earlier draft pointed
 * there and the section did not exist. Three steps, and only the first is gated:
 *
 *   1. Bump this constant. `tests/projection.test.ts` asserts it matches the year
 *      in the bot's `updated_at`, so forgetting it fails the suite, which is the
 *      build command — the page cannot ship with the two out of step.
 *   2. Set each goal's `progress_last_year` from the closing totals. NOTHING checks
 *      this: the repo has no memory of last year's kilometres, so a stale figure
 *      renders happily. Read them off the bot JSON before step 1 overwrites it.
 *   3. Add the new year's races to {@link EVENTS}. DO NOT REMOVE LAST YEAR'S — this
 *      step said to until the wall became the whole calendar, and deleting a past
 *      race now deletes a Finisher Patch that was earned. They cost the goal cards
 *      nothing: `eventsInYear` in projection.ts hands those only the races that START
 *      in this year, so a past race contributes to no projection and a race booked for
 *      NEXT year cannot lower this year's required rate.
 */
export const GOAL_YEAR = 2026

/**
 * The join between a goal and a race, and the reason it is DERIVED rather than
 * declared.
 *
 * `Sport` is read off the literals in `RAW_GOALS` below, so the set of legal
 * values is exactly the set of goals that exist. Declaring
 * `type Sport = "running" | "cycling"` independently would let the two drift: a
 * renamed goal would leave events pointing at a sport nothing renders, and the
 * mismatch is invisible — an event whose sport matches no goal contributes to no
 * projection and throws nothing.
 *
 * That derivation only works because `RAW_GOALS` is declared `as const satisfies`
 * rather than with a plain `: Goal[]` annotation. An annotation WIDENS the string
 * literals to `string`, and `Sport` would resolve to `string` — accepting every
 * typo while still type-checking. This is the load-bearing half of the pattern and
 * it looks like a style choice, so: do not "tidy" the declaration back to an
 * annotation. `pnpm check` runs in CI ahead of the tests and gates the deploy, so a
 * real type error here cannot reach production; a widened one is not a type error at all.
 */
export type Sport = typeof RAW_GOALS[number]["sport"]

/**
 * A race the site owner has entered — completed ones are in the past, booked ones
 * are ahead. Completion is derived from the date rather than stored, so no flag can
 * go stale.
 *
 * THIS IS THE WHOLE CALENDAR, NOT THIS YEAR'S, and that changed in the same revision
 * that gave the earned bib its name. Every race he has entered, in any year, stays
 * here: the wall draws all of it, because a Finisher Patch is a thing you keep. It
 * held one year until then, and the January checklist above said to delete the old
 * races — see {@link GOAL_YEAR}, where that step is now the opposite instruction.
 *
 * ONE ARRAY, TWO SCOPES, AND THE SPLIT IS ENFORCED IN projection.ts RATHER THAN HERE.
 * The wall reads all of it; a goal card reads only the races that start in
 * {@link GOAL_YEAR}, because its target, its kilometres, its day count and its own
 * heading are all that year's. The rule and the failure it prevents are written out
 * above `eventsInYear`; the short version is that a race booked for next November
 * must not pay off this year's deficit.
 *
 * SO A PAST RACE NEEDS NOTHING BUT ITS FACTS. `elapsed_time` and
 * `recordings` are both optional, so a race remembered without a recording is
 * a complete bib rather than a broken one — which is what makes filling in a back
 * catalogue a data edit and not a code change.
 *
 * RECORDING A RACE YOU HAVE JUST RUN IS A TWO-STEP EDIT, AND WHICH STEP GOES FIRST
 * DEPENDS ON WHETHER THE RACE IS ALREADY ON THIS LIST. There is no order that is right at
 * both moments — the page is out by the length of the race until the second step lands,
 * and the only choice is which way it is out. An earlier draft of this note gave one
 * unconditional order and claimed "no figure on the page is ever wrong"; that was false,
 * and measured wrong by 5 km/wk in the case it got backwards — 66 against the honest 71
 * below, which is where that figure comes from and why it moves when they do.
 *
 * The two fields together are what tells the site the race has been RUN (see
 * `hasRecording` in projection.ts), and a run race stops being counted as booked ahead.
 * Its kilometres have to be somewhere: the bot's total is the only other place they can
 * be. So:
 *
 *   A RACE NOT YET ON THIS LIST — a one-off, or a back-catalogue entry. FETCH FIRST:
 *   `gh workflow run strava-progress.yml` (or the Run workflow button; it has always
 *   taken `workflow_dispatch`), then add it here. Exact for the whole window, because a
 *   race that is not in `EVENTS` was never booked, so banking its kilometres first can
 *   double nothing. This is the Garmin Run case.
 *
 *   A RACE ALREADY ON THIS LIST — every planned race, which is the common case. ADD THE
 *   RECORDING FIRST, then let the 05:13 cron move the kilometres. Fetching first puts the
 *   distance in BOTH places while the race sits here without its recording: measured on
 *   the 2 August ride, 66 km/wk against an honest 71 — the deficit subtracted twice, in
 *   the FLATTERING direction this file guards against everywhere else. Recording-first
 *   errs the other way (79) until the next push, and the push is guaranteed here because
 *   the race itself moved the kilometres, so `git diff --quiet` cannot suppress it.
 *
 *   THOSE ARE THE FIGURES THE MISTAKE ACTUALLY PRODUCED, not a simulation of it. This note
 *   first quoted 67 against 73, modelled before the ride from the event's ADVERTISED
 *   distance; the ride came in longer than the route, so the real pair landed one and two
 *   km/wk below the model. The hazard and its direction are unchanged — which is the point
 *   worth keeping: a simulated measurement is worth less than the incident's own, so when
 *   the hazard finally happens, replace the model with what it did.
 *
 * The rate erring HIGH is the safe direction rather than a harmless one — do not read it
 * as licence to skip the second step. And note this procedure quietly falsified a premise
 * stated elsewhere: the note above `daysRemaining` in projection.ts justifies counting the
 * stamped day by saying the cron "names a day whose riding is entirely ahead of anyone
 * reading the page". A hand-dispatched run after a race names a day whose riding is partly
 * done. That is why fetch-first double-counts at all.
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
 * with a 14-byte body: no page, no title, nothing to read. Both kinds are in {@link EVENTS},
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
     * anyway, which is exactly this string. {@link METADATA.address_country} is an ISO
     * code for the opposite reason: schema.org's `addressCountry` is consumed by a
     * machine. Same fact, two audiences, so two spellings is correct here rather than a
     * duplication to unify.
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
     * rule in the {@link PATCHES} note below and the next reader deletes it. That rule forbids a
     * STORED `done` flag, because such a flag "goes stale in the one direction nobody
     * notices — a race that has been run still rendering as still-to-come". A DNF cannot go
     * stale in that direction or in any other: it is immutable history, settled the day the
     * rider stopped, exactly like the {@link elapsed_time} beside it. Storing a fact that
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
     * above {@link EVENTS} before adding either to a race you have just finished.
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
     * The build refuses it (tests/projection.test.ts), so the cost is a red deploy.
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

export const EVENTS: readonly RaceEvent[] = [
    // THE ROW THE LEDGER WAS DESIGNED AROUND: two accounts of one race that disagree about
    // everything and are both correct. The course is certified at 21.10 km and the watch
    // recorded 22.45; the chip says 3:30:59, the watch 3:44:25 and the gun 3:48:04. Nothing
    // here is a correction of anything else — see `OfficialResult`.
    //
    // THE DATE IS RIGHT AND THE PAGE IT LINKS TO IS ALSO RIGHT. sportsplits heads that result
    // "3rd December 2022"; the 3rd was the FULL marathon and the half was the 4th. This is the
    // same shape as the `OCBC Cycle Singapore Virtual Ride` / `Malaysia` pairing below, which
    // a reviewer once proposed "fixing" — do not change the date to match the heading.
    {date: "2022-12-04", name: "Standard Chartered Singapore Half Marathon", sport: "running", country: "Singapore", elapsed_time: "3:44:25",
     advertised_km: 21.10,
     official: {net_time: "3:30:59", gun_time: "3:48:04",
                url: "https://www.sportsplits.com/races/singapore-marathon-2022/events/3/results/individuals/23925"},
     recordings: [{id: "8204481233", metres: 22454.7, elapsed_time: "3:44:25"}]},
    // 22.11 km IS NOT A TYPO FOR A 40 km SPORTIVE. The activity's own description reads
    // "Rainy rainy morning! Our 40km sportive ride turns out to be a 20km scenic ride!" —
    // so this row is `raceKm` doing exactly what it says: the bib prints the ride that was
    // ridden, not the route that was entered. Do not "correct" it to the event's advertised
    // distance, and note there is nothing here to correct — the 22115.1 m is what the API
    // said, and 22.11 is what the conversion makes of it.
    {date: "2023-05-07", name: "OCBC Cycle Singapore", sport: "cycling", country: "Singapore", elapsed_time: "1:53:15",
     recordings: [{id: "9024119101", metres: 22115.1, elapsed_time: "1:53:15"}]},
    // A RACE THAT WAS NOT FINISHED, and the one that shows the split and the abandonment are
    // independent: it was ridden in two parts and the split has nothing to do with why it
    // ended. (The other `outcome` row below is a single recording.) Its distance is the
    // summed metres converted ONCE (87422.6 + 22619.7 = 110042.3, so 110.04) and `elapsed_time`
    // is first start to last stop, 13:14:12, NOT the 13:07:06 the parts sum to. The race figure
    // does NOT discriminate the rounding rule here — 110042.3 m is 110.04 either way — but the
    // second RECORDING does: 22619.7 m is 22.61 rounded down and 22.62 half-up, and 22.62 is
    // also the one figure ever read off Strava's own page that disagrees with the rule this
    // file follows. It is the API's metres that decide, so the bib prints 22.61.
    // Nothing in the recordings says it ended early: Strava stores an abandoned ride exactly
    // like a completed one, which is the whole reason `outcome` is hand-entered.
    {date: "2023-08-06", name: "Pesta Sukan Round Island Bike Adventure", sport: "cycling", country: "Singapore", outcome: "dnf", elapsed_time: "13:14:12",
     recordings: [{id: "9593519661", metres: 87422.6, elapsed_time: "10:47:28"},
                  {id: "9599925310", metres: 22619.7, elapsed_time: "2:19:38"}]},
    // THE SPLIT RACE. The bike broke down at Lim Chu Kang, was repaired at a shop, and the
    // ride finished — two recordings with 2:43:19 of workshop between them. The race's
    // distance is the summed metres converted once (17908.4 + 117411.0 = 135319.4, so
    // 135.31), and `elapsed_time` is first start to last stop, NOT the sum of the two elapsed
    // times (7:22:15): elapsed already contains stops, so it must not depend on where the
    // rider pressed the button. This row carried only the post-repair recording until the
    // wall could draw a split, and under-reported the race by 17.90 km and four hours.
    {date: "2024-08-04", name: "Pesta Sukan Round Island Bike Adventure", sport: "cycling", country: "Singapore", elapsed_time: "10:05:34",
     recordings: [{id: "12058884605", metres: 17908.4, elapsed_time: "1:28:41"},
                  {id: "12058885236", metres: 117411.0, elapsed_time: "5:53:34"}]},
    // THE ROW THAT SHOWS WHY `outcome` IS TOLD RATHER THAN LOOKED UP. The 42 km road ride was
    // not completed: the rider was past the cut-off and marshalled onto the shortcut. The
    // OFFICIAL RESULT DISAGREES — checkpointspot prints `Status: Finished` against bib 2192,
    // because a timing sheet records the mat you crossed, not the course you rode, and a
    // diverted rider crosses the same finish mat. So the results page is not a second opinion
    // this row could be checked against; it is a third device that cannot see the fact either,
    // alongside Strava and the calendar. Do not "correct" this to `finished` on the strength of
    // that page. The recording is the rider's own 78.59 km of the day, which is why the bib's
    // RECORDED row reads further than the race advertised while the hero still says DNF — that
    // row names an account, not a result.
    //
    // THE SHEET IS CITED HERE ANYWAY, AND THAT IS THE LEDGER EARNING ITS KEEP RATHER THAN
    // CONTRADICTING THE PARAGRAPH ABOVE. Printing `OFFICIAL 42.00 2:19:11` beside
    // `RECORDED 78.59 7:40:25` under a hero reading DNF says exactly what happened: the
    // organiser recorded a finish over the advertised course, the rider rode nearly twice that
    // and did not complete it. A design that had to pick ONE of those figures would have to
    // suppress the other; this one does not, which is why `outcome` stays hand-entered and the
    // sheet stays quotable. What is NOT taken from the page is its `Status` field — the bib
    // already answers that question and the sheet answers it wrongly.
    //
    // A GUN TIME, NOT A NET ONE. checkpointspot prints one time and a `Start 00:01:18` split,
    // so the mat crossing is 1:18 into the clock it publishes. Deriving a net time by
    // subtraction would print a figure as though the organiser had stated it, so `net_time`
    // stays absent and the ledger prints the gun time it actually has.
    {date: "2025-12-14", name: "OCBC Cycle Johor Bahru", sport: "cycling", country: "Malaysia", outcome: "dnf", elapsed_time: "7:40:25",
     advertised_km: 42.00,
     official: {gun_time: "2:19:11",
                url: "https://results.checkpointspot.asia/myresults.aspx?CId=17036&RId=10723&EId=1&AId=2308571"},
     recordings: [{id: "16736512210", metres: 78595.0, elapsed_time: "7:40:25"}]},
    {date: "2026-05-09", name: "OCBC Cycle Singapore Virtual Ride", sport: "cycling", country: "Malaysia", elapsed_time: "8:14:15",
     recordings: [{id: "18433212592", metres: 130033.0, elapsed_time: "8:14:15"}]},
    // THE SECOND SPLIT RACE, and it was classified the other way first. The day holds a
    // 22.55 km escort out of Phuket and the 140.49 km ride, and this row printed only the
    // ride on the reading that the escort was a separate outing sharing the date. The rider
    // says otherwise: the escort IS part of the event. The race's distance is the summed
    // metres converted once (22558.8 + 140498.0 = 163056.8, so 163.05), and `elapsed_time` is
    // first start to last stop, 10:09:34, against 9:55:09 summed and a 14:25 gap between the
    // two. This is the row where converting once and adding the parts DISAGREE: the two bib
    // lines below read 22.55 and 140.49 and add to 163.04. That is the rule working.
    {date: "2026-07-10", name: "MBG DCR 2026 - Phuket to Krabi", sport: "cycling", country: "Thailand", elapsed_time: "10:09:34",
     recordings: [{id: "19250544118", metres: 22558.8, elapsed_time: "1:23:04"},
                  {id: "19254155835", metres: 140498.0, elapsed_time: "8:32:05"}]},
    {date: "2026-07-12", name: "MBG DCR 2026 - Krabi to Phuket", sport: "cycling", country: "Thailand", elapsed_time: "9:41:31",
     recordings: [{id: "19279762093", metres: 158100.0, elapsed_time: "9:41:31"}]},
    // THE ROW THAT DELIBERATELY GAINS NOTHING FROM THE LEDGER, and it is not an omission to be
    // filled in later. A VIRTUAL RACE CERTIFIES THE FILE YOU UPLOADED. Its certificate reads
    // 00:58:26, which is this recording's own elapsed time to the second, and its "10 km
    // division" is a rounding of what the same file said — so there is no second instrument
    // and nothing to disagree with. Giving it an `official` block would print one account
    // twice under two names, which is precisely the thing the ledger exists to avoid. No
    // `advertised_km` either, for the same reason: 10 km here is the file, not a course.
    {date: "2026-07-29", name: "Garmin Run Virtual Challenge", sport: "running", country: "Singapore", elapsed_time: "0:58:26",
     recordings: [{id: "19513789157", metres: 10166.6, elapsed_time: "0:58:26"}]},
    {date: "2026-08-02", name: "Pesta Sukan Round Island Bike Adventure", sport: "cycling", country: "Singapore", elapsed_time: "10:56:17",
     recordings: [{id: "19566067972", metres: 160566.0, elapsed_time: "10:56:17"}]},
    {date: "2026-09-27", name: "The Kiprun Singapore 2026", advertised_km: 21.10, sport: "running", country: "Singapore"},
    // THE RACE THE DNF ROW ABOVE BELONGS TO, ENTERED AGAIN. Same name, ten months later, and
    // the wall now prints that name twice in two different states: an outline for October
    // beside December's DNF. Nothing in the data disambiguates them and nothing needs to —
    // every bib carries its own date, and the wall's tests key on POSITION rather than on
    // `name` precisely because an annual race makes the name ambiguous.
    //
    // 42.00 IS THE DIVISION ENTERED, not the whole of what the event sells. It is two laps of
    // a 21 km city circuit and both distances are on offer, so this figure is a fact about the
    // entry rather than about the event — the same name with a 21.10 beside it would be a
    // different race to ride and a correct row.
    {date: "2026-10-11", name: "OCBC Cycle Johor Bahru", advertised_km: 42.00, sport: "cycling", country: "Malaysia"},
    {date: "2026-11-07", end_date: "2026-11-15", name: "Formosa – The Extended Cycling de Taiwan", advertised_km: 1022.00, sport: "cycling", country: "Taiwan"},
    {date: "2026-12-06", name: "BYD Singapore International Marathon", advertised_km: 42.20, sport: "running", country: "Singapore"},
]

/**
 * A year that overshoots its target is clamped here rather than in the bot
 * script, so `total_goal` below stays the single place the number is
 * configured. `ProgressBar.astro` caps the bar at 100% for the same reason.
 */
export const clampToGoal = (progress: number, total_goal: number): number => Math.min(progress, total_goal)

/**
 * The shape `RAW_GOALS` is checked against. It is a separate type from {@link Goal}
 * so the source can be `as const satisfies` — see {@link Sport} for why an
 * annotation here would silently widen `sport` to `string` and break the join.
 * `raw_progress` is absent because it is derived below, not authored.
 */
type GoalSource = {
    total_goal: number
    current_progress: number
    progress_last_year: number | null
    goal_name: string
    short_name: string
    goal_logo: string
    measurable_unit: string
    sport: string
}

// current_progress is bot-owned — see .github/workflows/strava-progress.yml; edit the JSON, not this file, to bump it manually.
const RAW_GOALS = [{
    total_goal: 600,
    current_progress: stravaProgress.running_km,
    progress_last_year: null,
    goal_name: "Running",
    short_name: "Run",
    goal_logo: "ri:run-line",
    measurable_unit: "km",
    sport: "running"
}, {
    total_goal: 5000,
    current_progress: stravaProgress.cycling_km,
    progress_last_year: 1440.8,
    goal_name: "Cycling",
    short_name: "Ride",
    goal_logo: "ri:riding-line",
    measurable_unit: "km",
    sport: "cycling"
}] as const satisfies readonly GoalSource[]

export const GOALS: Goal[] = RAW_GOALS.map((goal) => ({
    ...goal,
    raw_progress: goal.current_progress,
    current_progress: clampToGoal(goal.current_progress, goal.total_goal)
}))

/**
 * THE ONE JOIN FROM A SPORT TO HOW IT IS DESCRIBED — its icon, its display name and
 * its {@link Goal.short_name}.
 *
 * Every consumer that has a {@link Sport} in hand and needs to draw it goes through
 * here, and the patch wall is the reason it exists. The obvious alternative is a
 * literal map beside {@link EVENTS} —
 *
 *     const SPORT_ICON = {cycling: "ri:riding-line", running: "ri:run-line"}
 *
 * — and it has a failure mode that is invisible in every direction that matters.
 * `uno.config.ts` safelists icon classes by reading LINKS, GOALS, CAREER, WELCOME,
 * FOOTER, NOW and PATCHES; it does not read EVENTS and has no reason to. So a second
 * table ships icon classes UnoCSS never generated a rule for: correct markup, correct
 * class token, and a mask box painted at zero size. Deriving from the goal means
 * the safelist already covers the wall — there is exactly one place a sport's icon
 * is named, and it is a place the config reads. (Read that list off `uno.config.ts`
 * rather than trusting it here; an earlier revision of this sentence was stale in the
 * same commit that added `PATCHES` to the safelist.)
 *
 * TOTAL BY CONSTRUCTION: {@link Sport} is `typeof RAW_GOALS[number]["sport"]`, so the
 * only values the type admits are the sports of goals that exist, and {@link GOALS}
 * is an unfiltered 1:1 map of `RAW_GOALS`. The `find` therefore cannot miss for any
 * value the compiler will pass it.
 *
 * BUT THE TYPE IS THE ONLY THING SAYING SO, which is why this throws rather than
 * asserting non-null. A review of the patch wall put it as the premise resting on
 * something no gate enforces, and the useful half of that is true: nothing stops a
 * future edit adding a `.filter(…)` to the map above, at which point `Sport` admits a
 * value `GOALS` lacks. With `!` the caller then reads a property of `undefined` two
 * frames away; with the throw it fails at the line that knows what went wrong, and
 * `tests/constants.test.ts` covers every sport so the totality is checked rather than
 * merely stated. The condition stays unreachable through the type — this is the
 * failure mode of an edit, not of an input.
 */
export const goalForSport = (sport: Sport): Goal => {
    const goal = GOALS.find((g) => g.sport === sport)
    if (goal === undefined) throw new Error(`goalForSport: no goal declares the sport "${sport}"`)
    return goal
}

/**
 * The intro card's h1 stack — one `<h1>` per line, and THE JOB LINE IS DERIVED like every other
 * statement of the job on this site.
 *
 * IT USED TO BE A TYPED COPY, AND IT WAS WRONG. The line read "Business Systems Analyst." —
 * character-identical to {@link CAREER}[1].job_name, the title held at NCS until Aug 2023 — while
 * the role card a few hundred pixels below it announced the current "Founding Business Systems
 * Analyst" and showed the NCS one with its own dates. The page stated the previous employer's job
 * title as the present tense, in its own largest type. A review panel found it while the fix for
 * the identical defect in `<title>` was in flight: correcting one typed copy of a fact and leaving
 * the other is not a fix, it is a relocation.
 *
 * "ENTHUSIASTIC LEARNER" IS GONE, and the reason is the one the maintainer gave: it is not a
 * reference worth keeping anywhere. It named nothing else on the site — no card, no page, no goal,
 * no event — and it was already cut from {@link METADATA.title} for the pixels. Cutting it here too
 * is what makes that a decision about the copy rather than a truncation forced by a budget, and it
 * pays for the longer job line: the stack is three h1s where it was four.
 *
 * ANY EDIT HERE OWES A `public/preview.jpg` REGENERATION. That file is both the OG/social image and
 * README's hero, and it is a render of this very card, so it goes stale invisibly — nothing builds
 * it and no test reads what it depicts. The recipe is recorded with the file.
 */
export const WELCOME: {
    greeting_icon: string
    description: string[]
} = {
    greeting_icon: "ri:open-arm-line",
    description: ["Hi, I'm Calvin", `${CAREER[0].job_name}.`, "Road cyclist."]
}

/**
 * WHAT A LINK SAYS WHEN IT WILL OPEN A NEW TAB, and it is deliberately worn by only
 * two of this site's nine outbound links.
 *
 * The tab itself stays. The usual objection — that forcing a new tab destroys the
 * back button — has a PREMISE, that the reader needs to get back, and it does not
 * hold here: the source page is never left, so closing or switching a tab is both
 * cheaper and more certain than Back. That was the maintainer's call and the
 * argument is his.
 *
 * What the tab does leave is a reader who cannot see it happen, finds Back does
 * nothing, and is told nothing about why. WCAG SC 3.2.5 (AAA) and technique G201
 * ask for the warning in advance; this is it.
 *
 * WHY NOT ON THE SIX INTRO-CARD LINKS. Their context change is conventional for a row
 * of outbound icons, and six identical suffixes in a row is exactly the noise G201's
 * own guidance warns about — it makes the list harder to scan by voice, not easier.
 *
 * "Social" is the wrong word for one of them and the exception is worth naming rather
 * than papering over: `/resume.pdf` is same-origin and is not a social profile. It gets
 * the same silence for a DIFFERENT reason — its own name already says "View résumé
 * (PDF)", so the format is announced and a PDF opening in its own tab is the behaviour
 * a reader expects from that name. If the six are ever split, that is the seam.
 * The ones that wear it are those where the destination is unexpected: a race bib that
 * reads as page content, an information icon that reads as a disclosure, and — since a
 * race can be recorded in parts — each split line on a bib that lists its recordings
 * rather than being one link itself. That last is the same case as the first, arriving
 * once per recording; deliberately NOT counted here, because the count moves with the
 * data and this paragraph is about which KIND of destination earns the warning.
 *
 * IT IS A SEPARATE ELEMENT, NOT A SUFFIX ON AN EXISTING STRING, and that is measured
 * rather than stylistic. Appending it to {@link PATCHES.strava_name} would bury it
 * mid-name, because the accessible name is assembled in DOM order and the destination was
 * announced from the meta row at the time this was measured:
 *
 *     "12 JUL 2026 RIDE ON STRAVA 158.10 KM MBG DCR 2026 - KRABI TO PHUKET
 *      THAILAND ELAPSED 9:41:31"
 *
 * As the anchor's LAST child it lands where a warning is useful — at the end, after
 * the reader knows what the link is. Read the result off the accessibility tree, not
 * off `textContent`: accname is not string concatenation, and it is the AX tree that
 * showed the mid-string position in the first place.
 */
export const NEW_TAB_NOTICE = "(opens in a new tab)";

/**
 * The Now card. `description` is the status line; the three `explainer_*` fields
 * are the link out to what a "/now page" even is.
 *
 * That link used to be the visible words "what's that ?", sitting on a second line
 * directly under a hand-rolled heading — which is what made this the one card whose
 * heading did not reserve the same space beneath it as the other five. The heading
 * was hand-rolled precisely because the link had to share its row. See
 * `src/components/Now.astro`.
 *
 * `explainer_name` is the SUBJECT HALF of the link's accessible name, announced
 * verbatim and FIRST: the icon beside it is aria-hidden and there is no visible text,
 * so a screen reader gets this string followed by {@link NEW_TAB_NOTICE}. Read off the
 * accessibility tree, the whole name is "What's a /now page? (opens in a new tab)".
 * It used to be the whole name, and the sentence saying so outlived the second span. It says what the destination explains rather than gesturing at
 * it — "what's that ?" reads fine beside the word it follows and says nothing at all
 * when read out of a list of links.
 */
export const NOW: {
    description: string
    explainer_url: string
    explainer_name: string
    explainer_icon: string
} = {
    description: "Building processes at a startup, probably running when you find me",
    explainer_url: "https://sive.rs/nowff",
    explainer_name: "What's a /now page?",
    explainer_icon: "ri:information-line"
}

/**
 * The patch wall at `/patches`, and the two per-sport pages beside it.
 *
 * WHAT IS DELIBERATELY NOT HERE is the interesting half. There is no list of races
 * — that is {@link EVENTS}, which the projection also reads, so a second copy could
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
     * {@link RaceEventCommon.elapsed_time} spends four paragraphs protecting on a bib that
     * only had one account to protect.
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
     * because {@link RaceEventCommon.outcome} is on the shared event shape and a cycling verb
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
     * {@link EVENTS} and {@link RaceEvent} — and the word Garmin uses, so a visitor meets
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

/**
 * The theme toggle's accessible name — the whole of what a screen reader announces
 * for it, since the sun and moon are decorative and the button has no visible text.
 *
 * It names the theme the button turns ON, and it must keep doing that, because the
 * button reports its state through `aria-pressed` and the two are read together:
 * "Dark theme, toggle button, pressed" means dark is active. Rename it to the other
 * theme and the polarity inverts with nothing to catch it — the announcement would
 * be exactly backwards while every structural assertion still held. That is the one
 * thing `tests/constants.test.ts` pins about this string.
 *
 * Deliberately NOT phrased as an action ("Switch to dark theme"). WAI-ARIA's
 * toggle-button guidance is explicit that a control carrying a pressed state must
 * keep one name across both states, and offers the changing name as the alternative
 * to that state rather than an addition to it. See
 * `src/components/ThemeSwitcher.astro` for why the state was the one chosen.
 */
export const THEME_TOGGLE: {
    name: string
} = {
    name: "Dark theme"
}

/**
 * THE PAGE THAT ANSWERS A URL THIS SITE DOES NOT HAVE, and it exists because of what the
 * host does WITHOUT it rather than because a 404 is nice to have.
 *
 * Cloudflare Pages resolves an unknown path by walking up looking for `${dir}/404.html`
 * and, finding none, serving `/index.html` instead — with a **200**. Measured on a real
 * preview deployment: `/does-not-exist` and `/patches/nonsense` both returned 200 and the
 * home page, while the same two paths on the outgoing host returned 404. So without this
 * page every dead link becomes a soft success that no uptime monitor, crawler or link
 * checker can ever see. Astro emits `dist/404.html` from this file, which both hosts pick
 * up, so the fix is one page rather than a per-host redirect rule.
 *
 * THE COPY SAYS WHAT THE HEADING DOES NOT. "Page not found" already carries the apology,
 * so the line under it spends its words on the only thing a reader can act on — that this
 * site is small enough to list in full, and here it is.
 *
 * {@link home_icon} is deliberately the same glyph as {@link PATCHES.home_icon}: the two
 * are the site's only ways back, and drawing them alike is the same argument the wall's
 * back link makes about `EventsLink`. It still gets its OWN entry in `uno.config.ts`'s
 * safelist rather than riding on the wall's — the note there is explicit that relying on
 * another constant to have already emitted a class is how an icon ships as a zero-size
 * mask box behind a green build.
 */
export const NOT_FOUND: {
    /**
     * THE STATUS CODE, DRAWN AS A RACE NUMBER. It is content rather than plumbing because
     * it is the largest thing a reader sees — see the page's own note for why a bib is the
     * right object for it. Nothing derives this from the response: the page is prerendered
     * and the host decides the status, so these two agree by being written down once.
     */
    code: string
    heading: string
    lede: string
    description: string
    home_label: string
    home_icon: string
} = {
    code: "404",
    heading: "Page not found",
    /*
     * A START LIST is what a race publishes: every number that will be on the course. A URL
     * this site does not have is a number that was never on it, which is the same sentence
     * in the subject's own words — and it says what happened rather than apologising for it
     * or blaming the reader for typing.
     *
     * "DID NOT START" WAS THE FIRST DRAFT AND IS THE EXACT TERM — DNS is what a results
     * sheet prints against a bib that never crossed the line. It is cut because on a WEB
     * error page those three letters read as Domain Name System, and a reader who takes it
     * that way has been told their network is broken. The right word in the wrong venue.
     */
    lede: "That number is not on the start list. The rest of the site is:",
    description: "That page is not part of Calvin's site.",
    home_label: "Home",
    home_icon: "ri:arrow-left-line"
}

export const FOOTER: {
    prefix: string
    icon: string
    suffix: string
} = {
    prefix: "Built with",
    icon: "ri:heart-fill",
    suffix: ", more love to Astro template by Gianmarco"
}

/**
 * Written once, read twice: as {@link METADATA.full_name} and inside
 * {@link METADATA.title}. A field of an object literal cannot reference a sibling field,
 * and the whole point of the title below is that it stops carrying its own copy of a fact.
 */
const FULL_NAME = "Calvin Loh"

export const METADATA: {
    /**
     * The page title — and THE JOB IN IT IS DERIVED, not typed.
     *
     * ONE PAGE USED TO GIVE TWO ANSWERS TO "WHAT IS HIS JOB". The JSON-LD in
     * `BasicLayout.astro` reads {@link CAREER}[0] and served "Founding Business Systems
     * Analyst"; this string was a hand-typed copy of the same fact and still served the
     * pre-promotion "Business Systems Analyst". A reader saw one in the tab and a search
     * engine parsed the other out of the same document.
     *
     * A copy of a fact drifts the moment the fact moves, and a title is the last place
     * anyone thinks to edit — so the copy is gone rather than corrected. `CAREER[0]` is
     * where a job title changes, once; `FULL_NAME` is where the name does; and
     * {@link WELCOME} derives the h1 from the same place, so the page now has one record
     * of the job rather than a corrected one and a forgotten one.
     *
     * TWO TESTS, AND THEY GUARD DIFFERENT HALVES. `tests/rendered-html.test.ts` renders
     * this page in-process and asserts the `<title>` it produces carries both
     * `CAREER[0].job_name` and `METADATA.full_name` — that is a gate on the RENDER, which
     * is what catches this expression being re-typed as a literal.
     * `tests/build-output.test.ts` is the one that reads `dist/index.html` off disk, and it
     * now makes the same assertion there. Neither sentence is decorative: the first version
     * of this comment claimed the render test read the built page, and a reviewer disproved
     * it by corrupting `dist/index.html` by hand and watching that test stay green.
     *
     * THE BUDGET IS PIXELS, AND THIS TITLE HAS NEVER FIT ONE. A desktop Google result
     * renders a title link in Arial 20px and cuts what does not fit. **~600px is an SEO
     * convention, not a documented constant** — Google states only that a title link is
     * "truncated… typically to fit the device width", and the vendor figures in circulation
     * disagree (580–600px, and a 2014 measurement of 482px at 18px Arial). Treat it as an
     * estimate that tells you to front-load, not as a specification with slack to spend.
     * Against that estimate, measured in Chrome: the four-part title this replaces ran
     * **724px**, and the pre-promotion one it inherited from ran **635px**, so on a desktop
     * result "Enthusiastic Learner" was never shown to anyone; the copy here runs **578px**.
     *
     * WHAT THE REWRITE DROPPED AND WHY. "Enthusiastic Learner" went first because no card,
     * page, goal or event on this site is about it, and it is now cut from {@link WELCOME}
     * too rather than surviving in the copy the title had to drop for width. Cycling stayed
     * because it is what the intro card's own h1 claims and what half the site is — a goal
     * card and a wall of race bibs. Running has an equal claim and does not fit: five
     * phrasings naming both sports were measured and the cheapest is 601px, which is the
     * real reason only one sport is named. The name is the FULL one because a title is
     * where a search engine decides which Calvin this is, which is the same reason
     * {@link METADATA.full_name} exists for the schema. The em dash is the separator every
     * other page's title already uses — those pages are `<heading> — Calvin`, so this one
     * inverts the order and takes the full name deliberately: the home page is the entity,
     * not a section of it.
     *
     * A LONGER JOB TITLE NOW LENGTHENS THIS AUTOMATICALLY, which is the cost of deriving it,
     * and `tests/constants.test.ts` measures the width rather than counting characters. It
     * used to count: a cap pinned at this string's own length, which two reviewers
     * independently broke in both directions — a 33-character job title that renders 606px
     * passed it, and a 40-character one that renders 565px failed it. The advance-width
     * table behind the gate is `tests/helpers/arial-20px.ts`.
     */
    title: string
    description: string
    site_url: string
    name: string
    /**
     * The entity name: schema.org's `name`, `/llms.txt`'s H1, and the HOME page's title.
     *
     * SEPARATE FROM {@link METADATA.name} BECAUSE THEY HAVE DIFFERENT JOBS, and the split
     * is by page rather than by audience. `name` is the site-name slot in a SECONDARY
     * page's title — "Page not found — Calvin", "My cycling events — Calvin" — where the
     * surname would be stiff and the reader already knows whose site they are on. The home
     * page is the opposite case, and it is the one a stranger meets first: "Calvin" alone
     * is a first name shared by millions and is close to useless as an entity for a search
     * or answer engine trying to decide which Calvin this is. The `sameAs` profiles already
     * say `calvin-loh`; the title and the schema should agree with them.
     *
     * This comment used to say `name` is "what a page title says" full stop, which
     * {@link METADATA.title} then made false — a rule and the code disagreeing, with
     * nothing to catch it. If a future title changes which name it takes, change this
     * sentence in the same edit.
     *
     * Read from his own profile README (github.com/calvindotsg/calvindotsg), which opens
     * "Hi, I'm Calvin Loh".
     */
    full_name: string
    /**
     * One sentence on the work, in his own words, for `/llms.txt`.
     *
     * NOT {@link ABOUT_ME}, WHICH IS THE WRONG REGISTER FOR THIS. That copy is the
     * page's voice — waking before sunrise, #cyclehome — and it is right there and wrong
     * here: an agent asked "what does Calvin do professionally" should not have to infer
     * it from cycling banter. {@link METADATA.description} is no better; it is a meta
     * description, written to earn a click.
     *
     * Quoted from the profile README rather than paraphrased, so the sentence GitHub
     * shows and the sentence an answer engine reads are the same string.
     */
    professional_summary: string
    image_url: string
    address_locality: string
    address_country: string
    email_obfuscated: string
} = {
    title: `${FULL_NAME} — ${CAREER[0].job_name} | Road Cyclist`,
    description: "Building things at a startup, probably cycling when you find me. Join my 5000km cycling and 600km running goals this year.",
    site_url: "https://calvin.sg/",
    name: "Calvin",
    full_name: FULL_NAME,
    professional_summary: "I build the systems that keep operations running and improving: docs-as-code platforms, workflow automation, and tooling that helps teams work with less friction.",
    image_url: "https://calvin.sg/preview.jpg",
    address_locality: "Singapore",
    address_country: "SG",
    email_obfuscated: "hello[at]calvin.sg"
}
