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
 *   3. Add the new year's races to {@link EVENTS} and remove the old ones. Events
 *      from a past year are inert (they are all behind `today`), so leaving them
 *      costs nothing but noise.
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
 * are ahead. One array serves both consumers: the projection folds the BOOKED
 * distance of future events into what is already accounted for, and completion is
 * derived from the date rather than stored, so no flag can go stale.
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
     * IT IS ELAPSED, NOT MOVING, AND THE BIB SAYS SO. The two are far apart on these
     * rides — 8:32:05 elapsed against 5:03:55 moving — so an unlabelled time invites a
     * reader to divide it into the distance and get 18.8 km/h where the ride was 27.7.
     * The label is not decoration; it names which clock.
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
 * The Now card. `description` is the status line; the three `explainer_*` fields
 * are the link out to what a "/now page" even is.
 *
 * That link used to be the visible words "what's that ?", sitting on a second line
 * directly under a hand-rolled heading — which is what made this the one card whose
 * heading did not reserve the same space beneath it as the other five. The heading
 * was hand-rolled precisely because the link had to share its row. See
 * `src/components/Now.astro`.
 *
 * `explainer_name` is the link's WHOLE accessible name, announced verbatim: the icon
 * beside it is aria-hidden and there is no visible text left, so this string is all a
 * screen reader gets. It says what the destination explains rather than gesturing at
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
 * `heading` NO LONGER NAMES THE METAPHOR, and the two `scope_*` strings plus `key` are
 * what carry it instead. It used to read "Patch wall", on the argument that the phrase is
 * a cyclist's rather than a self-evident one and so wants explaining underneath. The
 * explanation is still there and still in that order; what changed is that the heading
 * itself now says what is on the page — races, some run and some booked — rather than
 * naming the drawing. See {@link heading} for why that is a correctness fix and not a
 * preference, and {@link NEXT_RACE.control}, which is literally the same string.
 *
 * THE LEDE IS TWO SENTENCES BECAUSE ONE OF THEM IS NOT TRUE ON EVERY PAGE. It began
 * as a single string saying "every race I have entered this year", which is a claim
 * `/patches/cycling` cannot make — it shows four of six. The heading and the filter
 * row both say which page you are on, so the overclaim is survivable and it is still
 * an overclaim, written where a reader looks for what the page contains.
 *
 * `key` NAMES THE OUTLINES FIRST because the wall shows them first: it is sorted next
 * race first, so a legend that opened with the solid bibs would introduce the two
 * treatments in the opposite order to the one the reader meets them in. The sentence
 * is otherwise about treatment rather than order, so it survives the booked run
 * emptying on the day after the last race.
 *
 * So `scope_all` and `scope_sport` are alternatives and `key` follows either. The
 * `{sport}` in `scope_sport` is replaced with the goal's own name, which is the same
 * string the heading uses — a sport is called one thing on this site.
 *
 * `description_*` is the same split for the META description, and it needs its own
 * pair rather than reusing the lede: a review panel found the single `description`
 * shipping unnarrowed on all three routes, so the copy a CRAWLER reads made exactly
 * the overclaim the visible copy had just been fixed to avoid. Two dimensions
 * reported it independently. Fixing the sentence a reader sees and leaving the one a
 * machine reads is the shape to watch for — they are different strings in different
 * places and only one of them is on screen.
 */
export const PATCHES: {
    heading: string
    scope_all: string
    scope_sport: string
    key: string
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
     * The mark on a bib that links out, and it is what makes the link visible at all.
     *
     * A hover state is not an option — there is no hover on a phone, and this site has
     * already removed one card hover for advertising an affordance that did not exist;
     * the opposite failure is an affordance that exists and is never advertised. A glyph
     * is a shape, so it satisfies SC 1.4.1 without leaning on colour, and it names the
     * destination rather than merely marking one. Safelisted in uno.config.ts: this is a
     * second reference to a class LINKS already carries, and relying on that coincidence
     * is how a bib ships a mask box at zero size with a green build.
     */
    strava_icon: string
    /** sr-only, transcribing {@link strava_icon}. The glyph is information, not decoration. */
    strava_name: string
} = {
    /**
     * "My events", not "Patch wall", and the sport pages take `My {sport} events` from the
     * same words. The rename came from the goal card's control — see {@link NEXT_RACE} —
     * and from the rule behind it: a patch is a race COMPLETED AND EARNED, so a page that
     * shows four booked outlines beside two earned bibs was never wholly a wall of
     * patches. The heading now names what is on the page; {@link key} still explains what
     * the two drawings mean, and the bibs themselves carry the character the old heading
     * was carrying. "Patch wall" survives in the URL, in this prose and in the metaphor.
     */
    heading: "My events",
    scope_all: "Every race I have entered this year.",
    scope_sport: "Every {sport} race I have entered this year.",
    key: "The outlines are still ahead of me; the solid bibs are the ones I have finished.",
    description_all: "Every race Calvin has entered this year, finished and still to come, drawn as race bibs.",
    description_sport: "Every {sport} race Calvin has entered this year, finished and still to come, drawn as race bibs.",
    all_label: "All",
    booked_label: "Booked",
    home_label: "Home",
    home_icon: "ri:arrow-left-line",
    filter_label: "Filter by sport",
    elapsed_label: "Elapsed",
    strava_icon: "fa6-brands:strava",
    strava_name: "on Strava",
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
     * The control's affordance, and it is not decoration. Nothing else about this element
     * says it leads somewhere — it has no border and no box — so without a glyph the only
     * remaining cue would be the hover colour, which SC 1.4.1 does not accept as a sole
     * carrier and which a phone has no way to produce. A chevron is a shape and inherits
     * the text colour. Safelisted in uno.config.ts like every other icon.
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
    icon: "ri:arrow-right-s-line",
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
