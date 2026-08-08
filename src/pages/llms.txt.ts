import type {APIRoute} from "astro"
import {ABOUT_ME, CAREER, PROJECTS} from "../content/home"
import {NEXT_RACE, PATCHES} from "../content/races"
import {LINKS, METADATA} from "../content/site"
import {GOAL_YEAR} from "../data/goals"
import {GOALS} from "../lib/goal"
import {EVENTS} from "../data/races"
import {raceKm, recordingsOf} from "../lib/race"
import stravaProgress from "../data/strava-progress.json"
import {patchState} from "../lib/projection"
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
 * every axis at once — it stated a job title `CAREER[0].job_name` had already moved past
 * (the pair of the day: "Business Systems Analyst" in the file, "Founding Business Systems
 * Analyst" in the source), it paraphrased two project descriptions instead of quoting them,
 * and it omitted a third project entirely.
 * Nothing detected any of that, because nothing looked — and "nothing COULD" is the
 * stronger claim this comment used to make and cannot support. A test could always have
 * grepped `public/llms.txt` for `CAREER[0].job_name`; run the assertion below against the
 * old file and it goes red. What a flat file in `public/` really costs is that every such
 * check has to be written and remembered one fact at a time, against a copy that has no
 * relationship to its source. Deriving it closes the class instead;
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
    const previous = CAREER[1]
    const isExternal = (link: string) => /^https?:\/\//.test(link)
    const run = (event: typeof EVENTS[number]) => {
        const when = event.end_date ? `${event.date} to ${event.end_date}` : event.date
        const time = event.elapsed_time ? `, ${event.elapsed_time}` : ""
        // A DNF's KILOMETRES ARE NOT THE RACE'S, AND THE ROW HAS TO SAY SO ITSELF. In every
        // other bucket this figure is how long the race was; on an abandoned race it is how
        // far he got, which is the distinction the bib draws by naming whose account each of
        // its figures is. The section heading carries it for a reader of the whole file — but
        // this file is written to be CHUNKED and quoted, and a row lifted out of its section
        // takes the heading's context with it and none of its meaning. The word is the bib's
        // own constant rather than a second string, so the page and this file cannot drift
        // into describing the same number two ways.
        //
        // IT NAMES THE SOURCE NOW RATHER THAN THE PARTICIPLE, following the bib. `Covered`
        // said what happened to the kilometres; `Recorded` says which instrument produced
        // them, which is the stronger claim and the one the ledger is built on. Note what
        // this file does NOT carry: the OTHER account. A results sheet's own distance and
        // clock are on the bib and are not repeated here, because a crawler quoting one line
        // per race is owed the rider's figures — the site's own claim — rather than two
        // sources it would have to reconcile in a sentence.
        //
        // AND ON AN ABANDONED RACE WITH NOTHING RECORDED THERE IS NO FIGURE TO GIVE. `raceKm`
        // falls back to the race's ADVERTISED distance when no metres exist, which is the right
        // answer for a booked race and the worst possible one here: the row would tell a crawler
        // he covered the whole of a route he abandoned — the exact claim the bib beside it is
        // built to refuse, printed in the file written for machines that cannot see the bib.
        // NO ROW IN `EVENTS` IS THAT SHAPE TODAY. The guard is here because the TYPE reaches it:
        // `outcome` is legal on the booked shape, so this is one data edit away rather than a
        // defect that shipped, and on the calendar's longest advertised race it would publish
        // four figures of distance he did not ride. The condition is `Patch.astro`'s own, so
        // the two cannot drift.
        //
        // TWO DECIMALS, because the wall prints two and this file is quoted beside it. `raceKm`
        // returns a NUMBER, and a number has no trailing zero to keep: `130.03` prints itself,
        // but Krabi to Phuket reaches a reader as `158.1 km` against the bib's own `158.10` —
        // one race described two ways by one site.
        const dnfWithNothingRecorded = patchState(event) === "dnf" && recordingsOf(event).length === 0
        const far = dnfWithNothingRecorded
            ? ""
            : patchState(event) === "dnf"
                ? `, ${PATCHES.recorded_row.toLowerCase()} ${raceKm(event).toFixed(2)} km`
                : `, ${raceKm(event).toFixed(2)} km`
        return `- ${when} — ${event.name}${far}, ${event.country}${time}`
    }
    // "Has it happened" is `patchState`, NOT a date comparison — asking the site's own
    // predicate rather than restating it, which is the whole point of this endpoint.
    //
    // A DATE COMPARISON IS WRONG HERE AND WAS WRONG IN THE FIRST DRAFT. `patchState` asks
    // `hasRecording` BEFORE it asks the clock, because a race run this morning is a patch
    // today (#97, "let a race be recorded the day it is run"). A plain
    // `end < BUILD_DATE` misses exactly that case, so on the day of a race the wall would
    // have said "finished" while this file still said "still to come". Masked on the day
    // it was written — the 2026-07-29 Garmin run already had yesterday's date by then —
    // which is precisely how it would have shipped.
    //
    // THREE BUCKETS, ALL THREE BY EQUALITY — and the middle one is why `upcoming` no longer
    // asks `!== "finished"`. That negation was a binary split of a predicate that had two
    // answers when it was written, so the day `patchState` gained a third it silently filed a
    // race abandoned in 2023 under "Still to come". Nothing would have gone red: the endpoint
    // still emits, the counts still add up, and the only witness is a line claiming a race
    // three years past is ahead of him. A catch-all branch inherits every state added after
    // it; equality forces the author of the next one to come back here.
    const done = EVENTS.filter((event) => patchState(event) === "finished")
    const abandoned = EVENTS.filter((event) => patchState(event) === "dnf")
    const upcoming = EVENTS.filter((event) => patchState(event) === "booked")

    const body = [
        `# ${METADATA.full_name}`,
        "",
        // THE BLOCKQUOTE CARRIES THE IDENTITY. The spec calls it "a short summary …
        // containing key information necessary for understanding the rest of the file",
        // and it used to carry `METADATA.description` — the meta description, written to
        // earn a click from a person who can already see the page. An agent that reads
        // only this line should come away knowing who this is, which is a thing the
        // hand-written file this replaced actually did better.
        `> ${job.job_name} at ${job.company} in ${METADATA.address_locality}. `
        + METADATA.professional_summary,
        "",
        // THE COMPANY IS LINKED, NOT DESCRIBED. This line used to call HeyMax "a loyalty
        // and travel rewards platform" — the one hand-written fact left in an endpoint
        // whose whole purpose is that facts are derived, and a claim no constant, test or
        // page could contradict. `company_url` already exists and names a resolvable
        // entity, which is worth more to an answer engine than an adjective it has to
        // take on trust.
        `${job.job_name} at [${job.company}](${job.company_url}) since ${job.start_date}. `
        + `Previously ${previous.job_name} at [${previous.company}](${previous.company_url}) `
        + `(${previous.start_date}–${previous.end_date}).`,
        "",
        METADATA.description,
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
        // NO YEAR ON THIS HEADING, and the site has already made this exact mistake once.
        // `EVENTS` is the WHOLE calendar — see the scope rule above `eventsInYear` — while
        // `GOAL_YEAR` is what a goal card counts. Writing "Races and challenges in 2026"
        // over the unfiltered list marries one consumer's scope to the other's label, and
        // it reads true only for as long as every race happens to fall in one year. The
        // wall's own title carried "My events · 2026" and dropped it for this reason; the
        // note is in `[...sport].astro`. The dates carry the year, one race at a time.
        "Races and challenges, completed:",
        "",
        ...(done.length ? done.map(run) : ["- none yet"]),
        "",
        // THE ONLY SECTION THAT DISAPPEARS WHEN IT IS EMPTY, and the asymmetry is deliberate.
        // The other two have a floor — "none yet", "nothing scheduled" — because their absence
        // is itself an answer an agent asked "what has he done" needs. An empty DNF list is not
        // information about a person; printing a heading over it advertises a category the
        // record does not contain. It also spares the file a permanent line of nothing on the
        // outcome most riders would rather it never had to hold.
        //
        // The heading is `dnf_name` rather than the bib's three letters: this is read by a
        // machine with no wall around it, and `DNF` is unambiguous only inside its own venue.
        ...(abandoned.length ? [`${PATCHES.dnf_name}:`, "", ...abandoned.map(run), ""] : []),
        "Still to come:",
        "",
        ...(upcoming.length ? upcoming.map(run) : ["- nothing scheduled"]),
        "",
        "## Pages",
        "",
        // EACH PAGE IS CALLED WHAT THE SITE CALLS IT. These labels were hand-written as
        // "Patches" and "Running patches" — names no reader can see anywhere, because the
        // wall is headed "My events" and each sport page answers to the very string the
        // goal card's control wears. See the note above `heading` in `[...sport].astro`,
        // which fixed that break once already. An answer engine citing "the Patches page"
        // would be naming something that exists under no such name.
        `- [${PATCHES.home_label}](${abs("/")}): the goals, the day job, and where to find me`,
        `- [${PATCHES.heading}](${abs("/patches/")}): every race and challenge, finished or not`,
        ...GOALS.map((goal) =>
            `- [${NEXT_RACE.control.replace("{sport}", goal.goal_name.toLowerCase())}]`
            + `(${abs(`/patches/${goal.sport}/`)}): ${goal.goal_name.toLowerCase()} events only`),
        "",
        "## Projects",
        "",
        ...PROJECTS.map((project) => `- [${project.name}](${project.repo_url}): ${project.description}`),
        "",
        "## Elsewhere",
        "",
        ...LINKS.filter((item) => isExternal(item.link)).map((item) => `- [${item.name}](${item.link})`),
        "",
        // `## Optional` IS RESERVED BY THE SPEC for "secondary information … can be
        // skipped if a shorter context is needed", so it holds the one thing here an agent
        // can afford to miss. Its path comes off `LINKS` rather than being typed a second
        // time: the résumé already has a home, and this endpoint exists because a fact in
        // two places drifts.
        "## Optional",
        "",
        ...LINKS.filter((item) => !isExternal(item.link)).map((item) =>
            `- [${item.name}](${abs(item.link)}): the same career history, formatted for a person`),
        "",
    ].join("\n")

    // THE STATIC BUILD DISCARDS THIS HEADER, and it is worth saying so rather than
    // leaving a line that looks load-bearing. With `output: "static"` and no adapter,
    // Astro keeps a route's response headers only for an adapter that asks for them, so
    // nothing here reaches `dist/`. Measured: setting this to `application/x-nonsense`
    // and rebuilding leaves `dist/` byte-identical. What actually serves the file is the
    // host, from the `.txt` extension — Cloudflare Pages answers `text/plain;
    // charset=utf-8` for `/llms.txt` today, which is the value below by coincidence
    // rather than by cause. The header stays because it is the correct answer the day
    // this site gains an adapter, and because deleting it would leave the question
    // unanswered somewhere else.
    return new Response(body, {headers: {"content-type": "text/plain; charset=utf-8"}})
}
