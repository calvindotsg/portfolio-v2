import stravaProgress from "../data/strava-progress.json"

export const LINKS: {
    link: string
    logo: string
    name: string
}[] = [{
    link: "https://github.com/calvindotsg/", logo: "fa6-brands:github", name: "Github"
}, {
    link: "https://www.linkedin.com/in/calvin-loh/", logo: "fa6-brands:linkedin", name: "LinkedIn"
}, {
    link: "https://www.instagram.com/calvindotsg/", logo: "fa6-brands:instagram", name: "Instagram"
}, {
    link: "https://www.strava.com/athletes/37641259/", logo: "fa6-brands:strava", name: "Strava"
}, {
    link: "https://t.me/calvindotsg/", logo: "fa6-brands:telegram", name: "Telegram"
}, {
    link: "/resume.pdf", logo: "ri:file-pdf-2-line", name: "Resume"
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
    website_url: "https://www.strava.com/athletes/37641259/",
    goal_name: "Running",
    goal_logo: "ri:run-line",
    cta_logo: "fa6-brands:strava",
    measurable_unit: "km"
}, {
    total_goal: 5000,
    current_progress: stravaProgress.cycling_km,
    progress_last_year: 1440.8,
    website_url: "https://www.strava.com/athletes/37641259/",
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
