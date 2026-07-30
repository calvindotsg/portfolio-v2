import type {APIRoute} from "astro"
import {ABOUT_ME, CAREER, EVENTS, GOAL_YEAR, GOALS, LINKS, METADATA, PROJECTS} from "../lib/constants"
import stravaProgress from "../data/strava-progress.json"
import {BUILD_DATE} from "../lib/today"

/**
 * `/llms.txt` — the site as plain text, for an agent that would otherwise scrape a bento
 * grid of absolutely-positioned cards and guess.
 *
 * THE FORMAT IS THE SPEC'S, NOT AN APPROXIMATION OF IT (llmstxt.org): an H1, then a
 * blockquote summary, then "zero or more markdown sections of any type EXCEPT headings",
 * then `##` sections whose list items each carry a REQUIRED `[name](url)` hyperlink with
 * optional notes after a colon. A first draft of this file put the goals and races under
 * a `## Goals` heading as bare `- Running: 168.8 of 600 km` bullets, which is exactly what
 * the spec forbids of an H2 section. They are facts, not links, so they belong in the
 * free-prose region above the first heading — which is where they now are, and which also
 * puts the most citable content first.
 *
 * `## Optional` IS LOAD-BEARING, not a dumping ground: the spec gives that exact heading
 * the meaning "safe to skip when a shorter context is needed". The résumé PDF is the one
 * thing here an agent can afford to miss.
 *
 * WHY THIS IS GENERATED. The hand-written `public/llms.txt` it replaces had drifted on
 * every axis at once — it called the job "Business Systems Analyst" where
 * `CAREER[0].job_name` says "Founding Business Systems Analyst", it paraphrased two
 * project descriptions instead of quoting them, and it omitted a third project entirely.
 * Nothing detected any of that, because nothing could: a flat file in `public/` has no
 * relationship to the constants it paraphrases. Deriving it closes the class;
 * `tests/build-output.test.ts` then asserts the emitted file still carries the constants
 * it claims to summarise.
 *
 * HONEST ABOUT WHAT THIS BUYS, because the field is full of claims. No major model
 * provider has committed to consuming `llms.txt`; it is a community convention, and this
 * file is a cheap bet rather than a ranking factor. What it definitely does is give any
 * agent that DOES fetch it a correct answer to "who is this and what has he done"
 * instead of one inferred from CSS-positioned divs.
 *
 * TWO DATES, DELIBERATELY. The progress figures are stamped with `updated_at` — the day
 * the kilometres last moved, which is also what the sitemap's `lastmod` uses — while the
 * page list is stamped with the build day. A number without a date is the kind of thing
 * an answer engine will repeat for a year.
 */
export const GET: APIRoute = ({site}) => {
    if (!site) throw new Error("`site` must be set in astro.config.mjs for llms.txt to emit absolute URLs")
    const abs = (path: string) => new URL(path, site).href

    const job = CAREER[0]
    const isExternal = (link: string) => /^https?:\/\//.test(link)
    const run = (event: typeof EVENTS[number]) => {
        const when = event.end_date ? `${event.date} to ${event.end_date}` : event.date
        const time = event.elapsed_time ? `, ${event.elapsed_time}` : ""
        return `- ${when} — ${event.name}, ${event.km} km, ${event.country}${time}`
    }
    // `EVENTS` is chronological, so "has it happened" is a date comparison, not a flag.
    const done = EVENTS.filter((e) => (e.end_date ?? e.date) < BUILD_DATE)
    const upcoming = EVENTS.filter((e) => (e.end_date ?? e.date) >= BUILD_DATE)

    const body = [
        `# ${METADATA.full_name}`,
        "",
        `> ${METADATA.description}`,
        "",
        `${job.job_name} at ${job.company}, a loyalty and travel rewards platform in `
        + `${METADATA.address_locality}, since ${job.start_date}. Previously ${CAREER[1].job_name} `
        + `at ${CAREER[1].company} (${CAREER[1].start_date}–${CAREER[1].end_date}).`,
        "",
        METADATA.professional_summary,
        "",
        ABOUT_ME.description.join(" "),
        "",
        `Goals for ${GOAL_YEAR} (kilometres as of ${stravaProgress.updated_at}; page list `
        + `built ${BUILD_DATE}):`,
        "",
        ...GOALS.map((goal) =>
            `- ${goal.goal_name}: ${goal.raw_progress} of ${goal.total_goal} `
            + `${goal.measurable_unit} (${Math.round(goal.raw_progress / goal.total_goal * 100)}%)`),
        "",
        `Races and challenges in ${GOAL_YEAR}, completed:`,
        "",
        ...(done.length ? done.map(run) : ["- none yet"]),
        "",
        "Still to come:",
        "",
        ...(upcoming.length ? upcoming.map(run) : ["- nothing scheduled"]),
        "",
        `## Pages`,
        "",
        `- [Home](${abs("/")}): the goals, the day job, and where to find me`,
        `- [Patches](${abs("/patches/")}): every race and challenge, earned and upcoming`,
        ...GOALS.map((goal) =>
            `- [${goal.goal_name} patches](${abs(`/patches/${goal.sport}/`)}): `
            + `${goal.goal_name.toLowerCase()} events only`),
        "",
        "## Projects",
        "",
        ...PROJECTS.map((project) => `- [${project.name}](${project.repo_url}): ${project.description}`),
        "",
        "## Elsewhere",
        "",
        ...LINKS.filter((item) => isExternal(item.link)).map((item) => `- [${item.name}](${item.link})`),
        "",
        "## Optional",
        "",
        `- [Résumé (PDF)](${abs("/resume.pdf")}): the same career history, formatted for a person`,
        "",
    ].join("\n")

    return new Response(body, {headers: {"content-type": "text/plain; charset=utf-8"}})
}
