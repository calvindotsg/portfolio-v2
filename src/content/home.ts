/**
 * THE HOME PAGE'S CARDS, IN THEIR OWN WORDS: the intro card's h1 stack and its about
 * bullets, the two career entries, the open-source list that reaches no card at all, and
 * the Now card. Copy that belongs to no single card is next door in `src/content/site.ts`.
 *
 * `uno.config.ts` READS THIS MODULE THROUGH unconfig/jiti RATHER THAN VITE, and that is a
 * standing constraint on what may ever be written here: no `import.meta.glob`, no
 * `astro:content`, no top-level `await`, and no `.astro` import — directly or through
 * anything this file pulls in. jiti has no `import.meta.glob`, so one reaching this graph
 * kills `astro build` and vitest itself, four lines of `glob is not a function` with no test
 * executed. The collector over `src/data/races/` is the module that constraint is really
 * about; the rule and the failure are written out above `EVENTS` in `src/data/races/index.ts`.
 */

/**
 * `CAREER[0].job_name` IS THE SITE'S ONLY RECORD OF THE CURRENT JOB, and five surfaces derive from
 * it: the JSON-LD `jobTitle` in `BasicLayout.astro`, the `/llms.txt` blockquote and career line,
 * the intro card's h1 ({@link WELCOME}), and the page title ({@link METADATA.title}) — which also
 * feeds `og:title` and `twitter:title`. Change it here and every one of them moves.
 *
 * ONE THING IS NOT AUTOMATIC: the title has a width budget, so a longer job title can fail
 * `tests/content.test.ts` with a measured overflow. That is the gate working, not a bug — read
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
 * and the alternative is me summarising a summary. DO NOT REBUILD IT FROM THE GITHUB
 * REPOS API: that gets the membership wrong in both directions, because it needs an
 * invented inclusion rule ("public, not a fork, has a description") which pulls in tools
 * he does not lead with and drops `portfolio-v2` and `homebrew-tap`, which he does. A
 * curated list is not a stale API — it is the answer to a different question, and it is
 * the question `llms.txt` asks.
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
