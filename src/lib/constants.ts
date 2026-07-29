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
 * there; the distance, the date and the time are not. Checked on both of the owner's two
 * finished 2026 rides (19279762093 and 19254155835) on 2026-07-28.
 *
 * So a status code is not an answer to "can a reader see this" — READ THE PAGE.
 *
 * THE FINISHED BIBS LINK ANYWAY, and that is a decision taken with this paragraph in
 * front of it rather than in ignorance of it. See {@link RaceEvent.strava_activity_id},
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
 * Where a finished bib's link points, with {@link RaceEvent.strava_activity_id} appended.
 *
 * It is a base rather than a full URL per event so the domain lives in one place: two
 * spellings of the same host is how one of them ends up on `strava.app.link` or a stale
 * regional subdomain years later, with nothing failing. The ids themselves stay beside
 * the races they belong to, because that is the fact being recorded.
 */
const STRAVA_ACTIVITY_URL = "https://www.strava.com/activities/";

/** A finished bib's link, or null where the race has no verified activity. */
export const stravaActivityUrl = (event: RaceEvent): string | null =>
    event.strava_activity_id === undefined ? null : STRAVA_ACTIVITY_URL + event.strava_activity_id;

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
 * annotation. `pnpm check` is the first half of Netlify's build command, so a real
 * type error here cannot reach production; a widened one is not a type error at all.
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
 * `strava_activity_id` are both optional, so a race remembered without a recording is
 * a complete bib rather than a broken one — which is what makes filling in a back
 * catalogue a data edit and not a code change.
 *
 * RECORDING A RACE YOU HAVE JUST RUN IS A TWO-STEP EDIT, AND THE ORDER IS THE POINT.
 * Run the `strava-progress` workflow by hand FIRST (`gh workflow run strava-progress.yml`,
 * or the Run workflow button — it has always taken `workflow_dispatch`), and only then
 * add the race here with its time and its activity id.
 *
 * Why that order. The two fields together are what tells the site the race has been RUN
 * (see `hasRecording` in projection.ts), and a run race stops being counted as booked
 * ahead. Its kilometres have to be somewhere: the bot's total is the only other place
 * they can be. Edit this file first and, until the next fetch, the distance is in
 * NEITHER — the goal card asks for a rate that is too high by the length of the race,
 * and stays wrong until the bot next pushes, which is itself not guaranteed to be
 * tomorrow. Fetch first and the kilometres are already banked when the race stops being
 * booked, so no figure on the page is ever wrong. The rate erring HIGH is the safe
 * direction rather than a harmless one — do not use it as a reason to skip the step.
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
 * `strava_activity_id` SHIPS WITH A KNOWN COST, AND THE COST IS NOT A MISTAKE. Keep both
 * halves of this paragraph: the evidence, so nobody re-proposes the link as an oversight,
 * and the decision, so nobody removes it as one.
 *
 * The evidence. A logged-out reader who follows one of these lands on a LOGIN WALL. This
 * was recorded the other way first, on good-looking evidence: `curl` gets HTTP 200 with no
 * redirect from `strava.com/activities/<id>`, which reads as "public". Fetched and READ,
 * the page is *"Log in to see 'MBG DCR 2026 Krabi to Phuket'"* and a sign-up prompt — the
 * title is there, the distance and the time are not. Checked on both ids below, 2026-07-28.
 * A status code is not an answer to "can a reader see this".
 *
 * The decision. The owner read that and asked for the links anyway. A visitor who has
 * Strava — which is most of the audience for a wall of race bibs — gets the ride; one who
 * does not gets a page that at least names it. That is a smaller loss than it looked,
 * because the bib already prints the distance, the date and the time, so the link adds to
 * a complete object rather than being the only way to learn anything.
 *
 * (The wall leaking the title is also the technique for VERIFYING an id without an
 * account, which is how the two below were checked rather than trusted: fetch the page and
 * read which race it names. Two valid ids transposed between events would otherwise
 * produce a wall nothing on this site could catch.)
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
    km: number
    sport: Sport
    /**
     * Where the race is, as a country name a reader would say out loud.
     *
     * REQUIRED RATHER THAN OPTIONAL, deliberately. Every bib prints it, so an event
     * without one is a bib with a blank line — and `pnpm check` is the first half of
     * Netlify's build command, so making it required means the next race added cannot
     * quietly omit it. Optional would put that guarantee in a test that has to be
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
     * reader to divide it into the distance printed beside it and get 18.8 km/h, where
     * the recorded ride actually moved at 27.7 (140.49 km / 5:03:55). The label is not
     * decoration; it names which clock.
     *
     * THOSE TWO FIGURES DELIBERATELY DO NOT SHARE A SCOPE, and that is the point rather
     * than a defect in the comparison. 18.8 is the EVENT's 160.59 km over the ACTIVITY's
     * 8:32:05 — precisely the two numbers this bib prints side by side, which is why a
     * reader computes it. 27.7 is that activity's own 140.49 km over its own 5:03:55,
     * and it is the only moving speed anything here recorded.
     *
     * DO NOT "FIX" THE MISMATCH BY DIVIDING THE EVENT DISTANCE INTO THE MOVING CLOCK.
     * A revision of this comment did exactly that and quoted 160.59 / 5:03:55 = 31.7 as
     * the event-scope moving speed. No ride held 31.7: both clocks belong to the 140.49
     * km activity, and the paragraph below says so — the day holds a second activity, so
     * the event over the day's whole moving time lands somewhere near 26–28.5 km/h.
     * The one genuinely same-scope pair is 16.5 against 27.7, and neither of those
     * appears on a bib.
     *
     * NOTE WHICH SCOPE THIS IS. It is the race's own time, from the activity the race was
     * recorded as. The bib prints it beside the EVENT's distance, and on 10 July those
     * come from slightly different scopes: the day holds two Strava activities — a 22.55km
     * escort out of Phuket and the 140.49km ride — totalling 163.04 against the event's
     * 160.59, and whole-day elapsed would be 9:55 rather than 8:32:05. The residual is
     * +2.45km and it is left alone deliberately; engineering it away would mean the bib
     * printing a number that is not the race.
     *
     * (That day is also why a 20km "silent disagreement" was once reported here and was
     * not one. A single Strava activity is not a day. Before concluding that a
     * hand-entered figure disagrees with a recorded one, ask whether the recording is
     * split.)
     */
    elapsed_time?: string
    /**
     * The Strava activity this race was recorded as. Present only where the mapping has
     * been VERIFIED by reading the page — see the note above the type for how, and for
     * the login wall this knowingly accepts.
     *
     * IT IS ALSO HALF OF THE PROOF THAT THE RACE WAS RUN, so it is no longer only a link.
     * Beside an `elapsed_time` it earns the bib outright, whatever day it is — see
     * `hasRecording` in projection.ts. Do not paste one in ahead of a race because the
     * mapping happens to exist: with a time already present that draws a solid patch for
     * a race nobody has run, which is the one failure this file works hardest to avoid.
     * The build refuses it (tests/projection.test.ts), so the cost is a red deploy.
     *
     * A string rather than a number: it is an opaque identifier that only ever goes into
     * a URL, and 19-digit ids are close enough to `Number.MAX_SAFE_INTEGER` that treating
     * them as arithmetic is a category error waiting to round one.
     */
    strava_activity_id?: string
}

export const EVENTS: readonly RaceEvent[] = [
    {date: "2026-07-10", name: "MBG DCR 2026 - Phuket to Krabi", km: 160.59, sport: "cycling", country: "Thailand", elapsed_time: "8:32:05", strava_activity_id: "19254155835"},
    {date: "2026-07-12", name: "MBG DCR 2026 - Krabi to Phuket", km: 158.13, sport: "cycling", country: "Thailand", elapsed_time: "9:41:31", strava_activity_id: "19279762093"},
    {date: "2026-08-02", name: "Round the Island Bike Adventure", km: 121.98, sport: "cycling", country: "Singapore"},
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

export const WELCOME: {
    greeting_icon: string
    description: string[]
} = {
    greeting_icon: "ri:open-arm-line",
    description: ["Hi, I'm Calvin", "Business Systems Analyst.", "Road cyclist.", "Enthusiastic learner."]
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
 *     "12 JUL 2026 RIDE ON STRAVA 158.13 KM MBG DCR 2026 - KRABI TO PHUKET
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
 * events" and a filter row reading `All 6 / Ride 4 / Run 2` had not already said. The
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
     * Elapsed and moving are far apart on a long ride — 8:32:05 against 5:03:55 — so a
     * bare time invites a reader to divide it into the distance and get an average that
     * is 9 km/h wrong. See {@link RaceEvent.elapsed_time}.
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
} = {
    /**
     * "My events", not "Patch wall", and the sport pages take `My {sport} events` from the
     * same words. The rename came from the goal card's control — see {@link NEXT_RACE} —
     * and from the rule behind it: a patch is a race COMPLETED AND EARNED, so a page that
     * shows four booked outlines beside two earned bibs was never wholly a wall of
     * patches. The heading now names what is on the page; {@link lede} names the earned
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

export const FOOTER: {
    prefix: string
    icon: string
    suffix: string
} = {
    prefix: "Built with",
    icon: "ri:heart-fill",
    suffix: ", more love to Astro template by Gianmarco"
}

export const METADATA: {
    title: string
    description: string
    site_url: string
    name: string
    image_url: string
    address_locality: string
    address_country: string
    email_obfuscated: string
} = {
    title: "Calvin - Business Systems Analyst | Road Cyclist | Enthusiastic Learner",
    description: "Building things at a startup, probably cycling when you find me. Join my 5000km cycling and 600km running goals this year.",
    site_url: "https://calvin.sg/",
    name: "Calvin",
    image_url: "https://calvin.sg/preview.jpg",
    address_locality: "Singapore",
    address_country: "SG",
    email_obfuscated: "hello[at]calvin.sg"
}
