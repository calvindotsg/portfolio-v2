import stravaProgress from "../data/strava-progress.json"

/**
 * The one Strava destination, named once.
 *
 * Three controls point at it: the social link below and both goal cards' calls to
 * action. That URL used to be written out three times in this file, so the three
 * accessible names drifted apart — "Strava Profile" beside "Follow my running on
 * Strava" and "Follow my cycling on Strava". Same destination, three names.
 *
 * The reason it is worth one constant is the repo's own rule: a configurable
 * value has exactly one home, and a URL pasted three times has three — changing
 * the athlete id meant finding all of them, and nothing kept the three names in
 * step. Naming the destination once makes them agree structurally instead of by
 * coincidence.
 *
 * The single name is also the better practice, though be clear that **the old
 * names were not a defect**. No success criterion was violated: 3.2.4 Consistent
 * Identification is scoped to a *set* of web pages and this site is one page, and
 * F31 notes that consistent text "not always identical" is fine — its own example
 * blesses "Print receipt" beside "Print invoice", which is the pattern the two
 * goal CTAs followed. What tips it is the case for identical text where the
 * destination is genuinely the same: Understanding 3.2.4's Example 6 asks for it
 * "so that when users encounter the second one, it is clear that it goes to the
 * same place as the first", Understanding 2.4.9 wants names that survive being
 * read out of context in a links list, and GOV.UK states it outright — "if you
 * have more than one link to the same page, use identical link text or similar
 * link text that conveys the same meaning". Free to follow here, because all
 * three controls are icon-only: the name is `sr-only`, so nothing about the
 * page's appearance depends on it and there is no sighted-scanning cost to trade.
 *
 * `tests/rendered-html.test.ts` asserts the invariant rather than the string:
 * anchors that share an href share an accessible name. A future goal that points
 * somewhere else is free to name itself differently.
 *
 * Worth knowing before adding a per-activity link: Strava has no public per-sport
 * URL for an athlete. `?activity_type=Run` and `?activity_type=Ride` return
 * byte-identical pages, and every sport-scoped subpath redirects to /login. A
 * logged-out visitor gets a login wall either way, as they do for the LinkedIn
 * and Instagram links beside it.
 */
const STRAVA = {
    url: "https://www.strava.com/athletes/37641259/",
    /** The accessible name every control pointing at {@link STRAVA.url} announces. */
    name: "Strava Profile",
} as const;

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
    link: STRAVA.url, logo: "fa6-brands:strava", name: STRAVA.name
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

export type Goal = {
    total_goal: number
    current_progress: number
    /** null when there is no comparable figure — e.g. first year back at the sport */
    progress_last_year: number | null
    website_url: string
    /**
     * The CTA's whole accessible name. Separate from `website_url` so a goal that
     * points somewhere new can say so, but any two goals sharing a destination
     * must share this string — see {@link STRAVA}.
     */
    cta_label: string
    goal_name: string
    goal_logo: string
    cta_logo: string
    measurable_unit: string
}

/**
 * A year that overshoots its target is clamped here rather than in the bot
 * script, so `total_goal` below stays the single place the number is
 * configured. `ProgressBar.astro` caps the bar at 100% for the same reason.
 */
export const clampToGoal = (progress: number, total_goal: number): number => Math.min(progress, total_goal)

// current_progress is bot-owned — see .github/workflows/strava-progress.yml; edit the JSON, not this file, to bump it manually.
const RAW_GOALS: Goal[] = [{
    total_goal: 600,
    current_progress: stravaProgress.running_km,
    progress_last_year: null,
    website_url: STRAVA.url,
    cta_label: STRAVA.name,
    goal_name: "Running",
    goal_logo: "ri:run-line",
    cta_logo: "fa6-brands:strava",
    measurable_unit: "km"
}, {
    total_goal: 5000,
    current_progress: stravaProgress.cycling_km,
    progress_last_year: 1440.8,
    website_url: STRAVA.url,
    cta_label: STRAVA.name,
    goal_name: "Cycling",
    goal_logo: "ri:riding-line",
    cta_logo: "fa6-brands:strava",
    measurable_unit: "km"
}]

export const GOALS: Goal[] = RAW_GOALS.map((goal) => ({
    ...goal,
    current_progress: clampToGoal(goal.current_progress, goal.total_goal)
}))

export const WELCOME: {
    greeting_icon: string
    description: string[]
} = {
    greeting_icon: "ri:open-arm-line",
    description: ["Hi, I'm Calvin", "Business Systems Analyst.", "Road cyclist.", "Enthusiastic learner."]
}

export const NOW: {
    description: string
} = {
    description: "Building processes at a startup, probably running when you find me"
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
