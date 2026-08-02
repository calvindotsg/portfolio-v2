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
     * It exists for the patch wall, where the sport is announced inside a 13rem bib
     * on a line that already carries a date and sometimes a status tag. `goal_name`
     * uppercased is what that line held first, and "CYCLING" wrapped it; there is no
     * room for the long word and no reason to spend it, because the icon beside this
     * is carrying the same meaning a second time.
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
 * history, so it belongs beside `km` and `name` here rather than in the bot's JSON: the
 * bot exists to track a total that MOVES, and fetching an unchanging number nightly would
 * add a second API endpoint, an event-to-activity mapping, a new bot-owned key, and a new
 * way for an unattended push to turn the deploy red — for a figure that stopped changing
 * when the race ended.
 *
 * Named `RaceEvent` because `Event` is a live DOM global in this module.
 */
export type RaceEvent = {
    /** ISO `YYYY-MM-DD`, the day the event starts. */
    date: string
    /** ISO `YYYY-MM-DD`, the last day — multi-day events only. */
    end_date?: string
    name: string
    /**
     * How far the race was, and WHICH distance that means is the maintainer's decision
     * rather than an obvious reading — so it is written down here.
     *
     * WHERE THERE IS A RECORDING, THIS IS THE RECORDED DISTANCE, not the event's advertised
     * one. The bib then prints one ride's own figures: this beside the `elapsed_time` off the
     * same activity. Where a race has no recording it can only be the event's distance, which
     * is what every booked race carries.
     *
     * THAT REVERSED AN EARLIER RULE, and the reversal is his — do not "restore" the old one
     * from the reasoning still recorded under {@link elapsed_time}. This used to be the
     * EVENT's distance always, on the argument that a bib should print the race rather than
     * the ride, and the gap is not small: the round-island ride's own 160.57 km against the
     * 121.98 km route, a 21 km half marathon recorded as 22.45. Both readings are defensible
     * and he chose the recorded one, because it is the figure the linked activity will show a
     * reader who follows the bib.
     *
     * IT IS THE LINKED ACTIVITY'S DISTANCE, NOT THE DAY'S. A race day very often holds more
     * than the race, so ask what a day's other activities ARE before touching a row that looks
     * short — TWO DIFFERENT THINGS LOOK LIKE A SPLIT DAY and they take opposite answers.
     *
     *   THE DAY HOLDS THE RACE PLUS SOMETHING ELSE, which is 10 July: one activity is the whole
     *   race, and the 22.56 km escort out of Phuket is a separate ride that happens to share the
     *   date. This row prints the 140.50 the link goes to; the day's 163.06 was never a
     *   candidate, and there is no exception to make. See {@link elapsed_time} for that day's
     *   whole arithmetic.
     *
     *   THE RACE ITSELF WAS RECORDED IN PARTS — the rider stopped and restarted, so no single
     *   activity holds the ride. Then this is the SUMMED METRES CONVERTED ONCE, not the sum of
     *   the parts' printed figures: two roundings can compound where one cannot. The 2024
     *   round-island ride is the case — it broke a bike, was repaired at a shop and finished,
     *   and 17908.4 + 117411.0 gives 135.32 where truncation would give 135.31.
     *
     *   THE ARITHMETIC WAS NEVER THE HARD PART. A bib printing an aggregate while linking to
     *   ONE part sends a reader to a smaller number, which is the mismatch {@link elapsed_time}
     *   exists to prevent, one layer up — so this row could not be corrected until the bib could
     *   SAY it was recorded in parts. It can: {@link Recording} carries each part's own distance
     *   and clock, and the bib lists them, so every link promises what it delivers. That is why
     *   the parts' figures are stored rather than derived.
     *
     * SO "NO EXCEPTION FOR A SPLIT DAY" IS THE RULE, AND IT IS NOT A RULE ABOUT SPLIT RACES —
     * the first case needs no exception and the second needs a model. Which shape a day is, is
     * the rider's call and not a reading of the data: `GET /api/v3/athlete/activities?after=&before=`
     * lists a day, but the titles do not settle it. 2023's parts are named `1/2` and `2/2`, while
     * 2024's second recording is named for the mechanical — and both are one race.
     *
     * TWO PLACES, ROUNDED FROM THE API'S METRES. The activity reports whole metres and a
     * fraction — 78595.0, 140498.0, 10166.6 — and this field is that value in kilometres to
     * two places, rounded half-up. `tests/strava-verify.test.ts` asserts exactly that
     * conversion, so a figure typed in by any other route turns it red.
     *
     * THE RULE IS THE MAINTAINER'S, AND IT DELIBERATELY DOES NOT DEPEND ON WHAT STRAVA RENDERS.
     * That independence is the point, because the rendering question is genuinely unsettled and
     * this field was already reversed once over it.
     *
     * The field held TRUNCATION for four commits, on the argument that Strava's page truncates
     * and so truncating kept a promise: a reader following a bib's link sees the same digits the
     * bib showed them. Four rows were written that way, then rewritten. What is actually
     * measurable:
     *
     *   Strava's EMBED renderer truncates, on 5 of 5 discriminating activities in this account
     *   — 78595.0 m renders `78.5 km`, 140498.0 `140.4`, 10166.6 `10.1`, 160566.0 `160.5`,
     *   22558.8 `22.5`, where rounding would give `.6`, `.5`, `.2`, `.6`, `.6`. Three imperial
     *   readings truncate too, and they derive from the metres rather than from the km, so the
     *   widget is formatting the same quantity the API reports.
     *
     *   The ACTIVITY PAGE — the surface a bib actually links to — could not be read at all
     *   without the owner's session, and the one 2dp figure ever compared against its own raw
     *   metres went the other way: 22619.7 m shown as `22.62`, where truncation gives 22.61.
     *   One sample, on a `followers_only` activity, not reproducible by a reviewer.
     *
     * So the honest position is that the embed truncates, the page is unread, and the two need
     * not agree. **Do not restore truncation on the strength of the embed** — and equally, do
     * not write into this comment that the page rounds. The rule stands on the API being the
     * source of record, which needs no reading of any renderer.
     *
     * The lesson generalises past this field: a rule with a persuasive rationale attached is
     * harder to re-examine than a bare one. The truncation rule survived a review because its
     * story was doing the arguing — and then the sentence replacing it made a renderer claim on
     * one unreproducible sample, which a review panel promptly took apart. Twice in one change.
     */
    km: number
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
     * rides — 8:32:05 elapsed against 5:03:55 moving — so an unlabelled time invites a
     * reader to divide it into the distance printed beside it and get 16.5 km/h, where
     * the recorded ride actually moved at 27.7 (140.50 km / 5:03:55). The label is not
     * decoration; it names which clock.
     *
     * BOTH FIGURES NOW COME OFF ONE ACTIVITY, which is what {@link km} changed and it settled
     * a long argument in this comment rather than continuing it. 16.5 is that activity's own
     * 140.50 km over its own 8:32:05, and 27.7 is the same distance over its own moving time:
     * a reader dividing the two numbers on the bib gets a real elapsed speed for a real ride.
     * They used to be different scopes — the EVENT's 160.59 km over the ACTIVITY's clock, which
     * is 18.8 and belonged to nothing — and three revisions of this paragraph went wrong
     * inside that mismatch, one of them quoting 160.59 / 5:03:55 = 31.7 as a speed no ride
     * held. Keep the two figures on a bib coming from the same activity and that whole class
     * of error is gone.
     *
     * WHICH ACTIVITY, WHERE A DAY HOLDS MORE THAN ONE: the ones in `recordings`, the
     * ones these times came off, the ones the bib links to. 10 July is the case that names the
     * rule — the day holds a 22.56 km escort out of Phuket AND the 140.50 km ride, 163.06
     * together against the event's advertised 160.59, and whole-day elapsed would be 9:55
     * rather than 8:32:05. The row prints 140.50, because that is the ride a reader who
     * follows the link will see. Neither the day's total nor the event's figure is a number
     * any single recording holds.
     *
     * (That day is also why a 20km "silent disagreement" was once reported here and was
     * not one. A single Strava activity is not a day. Before concluding that a
     * hand-entered figure disagrees with a recorded one, ask whether the recording is
     * split.)
     */
    elapsed_time?: string
    /**
     * Every Strava activity this race was recorded as, in the order they were ridden.
     *
     * ONE ELEMENT FOR ALMOST EVERY RACE. More where the rider stopped and restarted — a
     * mechanical, a lost signal, a watch that died. This replaced a single
     * `strava_activity_id?: string`, which asserted that a race has at most ONE recording;
     * that was false for two of the owner's round-island rides, and the wall printed one
     * part of a race as though it were the whole thing. A `string | readonly string[]`
     * union was considered and rejected — it pushes normalisation onto every consumer —
     * as was keeping the singular field and adding a second one beside it, which is the
     * positional-multiplicity smell.
     *
     * PRESENT ONLY WHERE THE MAPPING HAS BEEN VERIFIED against the activity itself:
     * `tests/strava-verify.test.ts` holds every element against the API, on its own
     * distance, its own elapsed time and the day it was recorded, and holds the RACE's
     * {@link km} against the summed metres. See the note above the type for the login
     * wall a reader following the link knowingly accepts.
     *
     * IT IS ALSO HALF OF THE PROOF THAT THE RACE WAS RUN, so it is not only a link.
     * Beside an `elapsed_time` it earns the bib outright, whatever day it is — see
     * `hasRecording` in projection.ts. Do not paste one in ahead of a race because the
     * mapping happens to exist: with a time already present that draws a solid patch for
     * a race nobody has run, which is the one failure this file works hardest to avoid.
     * The build refuses it (tests/projection.test.ts), so the cost is a red deploy.
     */
    recordings?: readonly Recording[]
}

/**
 * ONE STRAVA ACTIVITY A RACE WAS RECORDED AS, carrying its own figures and not only its id.
 *
 * THE FIGURES ARE HERE BECAUSE THE BIB PRINTS THEM, and that is the whole reason this is a
 * record rather than a bare id. A race recorded in parts prints the SUMMED {@link km} and a
 * first-start-to-last-stop {@link elapsed_time}, while each link opens ONE part — so a
 * reader who follows one meets a smaller distance and a shorter clock than the bib showed
 * them. That mismatch is exactly what `elapsed_time`'s note exists to prevent, one layer up.
 * The answer is that the bib lists the parts and each line prints what is at the other end
 * of it, which it can only do if the parts' own figures are here.
 *
 * HAND-ENTERED, for the reason {@link RaceEvent.elapsed_time} is: these stopped changing
 * when the race ended, and the bot exists to track a total that MOVES. Nothing fetches them
 * at build.
 *
 * A SINGLE-RECORDING RACE STILL CARRIES THEM, and they will equal the race's own two
 * figures. That redundancy is deliberate: the alternative is a shape where the fields
 * appear only above some threshold, which is a rule every reader and every test has to
 * learn. `tests/projection.test.ts` asserts the agreement rather than trusting it.
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
     * THIS ACTIVITY's distance in km, the API's metres rounded half-up to two places —
     * the same conversion {@link RaceEvent.km} takes, and for the same reason.
     *
     * NOTE THE RACE'S `km` IS NOT THE SUM OF THESE. It is the summed METRES converted
     * once, because two roundings can compound where one cannot. The two agree on both
     * races currently in `EVENTS` and are not guaranteed to in general, so do not derive
     * one from the other — `tests/strava-verify.test.ts` holds each against the API
     * separately, which is the only check that can tell them apart.
     */
    km: number
    /** THIS ACTIVITY's elapsed time, `H:MM:SS`. Not the race's — see the type note. */
    elapsed_time: string
}

export const EVENTS: readonly RaceEvent[] = [
    {date: "2022-12-04", name: "Standard Chartered Singapore Half Marathon", km: 22.45, sport: "running", country: "Singapore", elapsed_time: "3:44:25",
     recordings: [{id: "8204481233", km: 22.45, elapsed_time: "3:44:25"}]},
    // THE SPLIT RACE. The bike broke down at Lim Chu Kang, was repaired at a shop, and the
    // ride finished — two recordings with 2:43:19 of workshop between them. `km` is the
    // summed metres (17908.4 + 117411.0 = 135319.4) converted ONCE, and `elapsed_time` is
    // first start to last stop, NOT the sum of the two elapsed times (7:22:15): elapsed
    // already contains stops, so it must not depend on where the rider pressed the button.
    // This row carried only the post-repair recording until the wall could draw a split,
    // and under-reported the race by 17.91 km and four hours.
    {date: "2024-08-04", name: "Pesta Sukan Round Island Bike Adventure", km: 135.32, sport: "cycling", country: "Singapore", elapsed_time: "10:05:34",
     recordings: [{id: "12058884605", km: 17.91, elapsed_time: "1:28:41"},
                  {id: "12058885236", km: 117.41, elapsed_time: "5:53:34"}]},
    {date: "2025-12-14", name: "OCBC Cycle Johor Bahru", km: 78.60, sport: "cycling", country: "Malaysia", elapsed_time: "7:40:25",
     recordings: [{id: "16736512210", km: 78.60, elapsed_time: "7:40:25"}]},
    {date: "2026-05-09", name: "OCBC Cycle Singapore Virtual Ride", km: 130.03, sport: "cycling", country: "Malaysia", elapsed_time: "8:14:15",
     recordings: [{id: "18433212592", km: 130.03, elapsed_time: "8:14:15"}]},
    {date: "2026-07-10", name: "MBG DCR 2026 - Phuket to Krabi", km: 140.50, sport: "cycling", country: "Thailand", elapsed_time: "8:32:05",
     recordings: [{id: "19254155835", km: 140.50, elapsed_time: "8:32:05"}]},
    {date: "2026-07-12", name: "MBG DCR 2026 - Krabi to Phuket", km: 158.10, sport: "cycling", country: "Thailand", elapsed_time: "9:41:31",
     recordings: [{id: "19279762093", km: 158.10, elapsed_time: "9:41:31"}]},
    {date: "2026-07-29", name: "Garmin Run Virtual Challenge", km: 10.17, sport: "running", country: "Singapore", elapsed_time: "0:58:26",
     recordings: [{id: "19513789157", km: 10.17, elapsed_time: "0:58:26"}]},
    {date: "2026-08-02", name: "Pesta Sukan Round Island Bike Adventure", km: 160.57, sport: "cycling", country: "Singapore", elapsed_time: "10:56:17",
     recordings: [{id: "19566067972", km: 160.57, elapsed_time: "10:56:17"}]},
    {date: "2026-09-27", name: "The Kiprun Singapore 2026", km: 21.10, sport: "running", country: "Singapore"},
    {date: "2026-11-07", end_date: "2026-11-15", name: "Formosa – The Extended Cycling de Taiwan", km: 1022.00, sport: "cycling", country: "Taiwan"},
    {date: "2026-12-06", name: "BYD Singapore International Marathon", km: 42.20, sport: "running", country: "Singapore"},
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
 * The two that wear it are the ones where the destination is unexpected: a race bib
 * that reads as page content, and an information icon that reads as a disclosure.
 *
 * IT IS A SEPARATE ELEMENT, NOT A SUFFIX ON AN EXISTING STRING, and that is measured
 * rather than stylistic. Appending it to {@link PATCHES.strava_name} would bury it
 * mid-name, because `.bib-strava` sits in the meta row and the accessible name is
 * assembled in DOM order:
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
 * been run still rendering as still-to-come. And there are no per-sport headings or
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
    home_label: string
    home_icon: string
    filter_label: string
    /**
     * The word before a finished bib's time, and it is load-bearing rather than a caption.
     * Elapsed and moving are far apart on a long ride — 8:32:05 against 5:03:55 over the
     * same 140.50 km — so a bare time invites a reader to divide it into the distance and
     * get an average that is 11 km/h wrong (16.5 against 27.7). It read 9 while the bib
     * printed the EVENT's distance over the activity's clock; both figures now come off one
     * activity, which makes the pair honest and the gap wider. See
     * {@link RaceEvent.elapsed_time}.
     */
    elapsed_label: string
    /**
     * The glyph on the bib's action row. It names the destination — it no longer has to
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
     * report — only a bib with a recording carries this row, so the row is what tells a
     * reader which bibs are clickable, in text rather than by inference from a treatment.
     *
     * Announced last now rather than third: it sits at the foot of the bib, where a call to
     * action belongs, instead of interrupting the meta row between the sport and the
     * distance. See Patch.astro, which records the whole accessible name.
     */
    strava_name: string
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
     */
    split_name: string
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
     */
    lede: "The outlines are races still ahead of me; every one I finish becomes a Finisher Patch.",
    description_all: "Every race Calvin has entered, finished and still to come, drawn as race bibs.",
    description_sport: "Every {sport} race Calvin has entered, finished and still to come, drawn as race bibs.",
    all_label: "All",
    booked_label: "Booked",
    home_label: "Home",
    home_icon: "ri:arrow-left-line",
    filter_label: "Filter by sport",
    elapsed_label: "Elapsed",
    strava_icon: "fa6-brands:strava",
    strava_name: "View on Strava",
    split_name: "on Strava, {race}",
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
