/**
 * THE COPY EVERY PAGE WEARS, plus the page that answers a URL this site does not have.
 * The social links, the new-tab notice, the theme toggle's name, the 404 page, the footer
 * and the SEO metadata — none of it belongs to one card, which is what separates it from
 * `src/content/home.ts` next door.
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
 * TYPE-ONLY, AND ONLY SO THE `{@link}`s BELOW RESOLVE — the same device, for the same
 * reason, as the import at the head of `src/content/races.ts`, where the argument is
 * written out.
 */
import type {RaceEvent} from "../lib/race"
import type {ABOUT_ME, WELCOME} from "./home"
import type {PATCHES} from "./races"

import {CAREER} from "./home"

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
 * The theme toggle's accessible name — the whole of what a screen reader announces
 * for it, since the sun and moon are decorative and the button has no visible text.
 *
 * It names the theme the button turns ON, and it must keep doing that, because the
 * button reports its state through `aria-pressed` and the two are read together:
 * "Dark theme, toggle button, pressed" means dark is active. Rename it to the other
 * theme and the polarity inverts with nothing to catch it — the announcement would
 * be exactly backwards while every structural assertion still held. That is the one
 * thing `tests/content.test.ts` pins about this string.
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
     * `BasicLayout.astro` reads {@link CAREER}[0] and served the job title of the day,
     * "Founding Business Systems Analyst"; this string was a hand-typed copy of the same
     * fact and still served the one before it. A reader saw one in the tab and a search
     * engine parsed the other out of the same document. (Both those strings are history:
     * the record of what the job is has only ever been `CAREER[0]`, and it has moved since.)
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
     * now makes the same assertion there. WHICH TEST READS WHICH IS NOT DECORATIVE: the
     * render test does NOT read the built page, which a reviewer proved by corrupting
     * `dist/index.html` by hand and watching it stay green.
     *
     * THE BUDGET IS PIXELS, AND THIS TITLE HAS NEVER FIT ONE. A desktop Google result
     * renders a title link in Arial 20px and cuts what does not fit. **~600px is an SEO
     * convention, not a documented constant** — Google states only that a title link is
     * "truncated… typically to fit the device width", and the vendor figures in circulation
     * disagree (580–600px, and a 2014 measurement of 482px at 18px Arial). Treat it as an
     * estimate that tells you to front-load, not as a specification with slack to spend.
     * Against that estimate, measured in Chrome: the four-part title this replaces ran
     * **724px**, and the pre-promotion one it inherited from ran **635px**, so on a desktop
     * result "Enthusiastic Learner" was never shown to anyone. The copy here runs **489px**,
     * and every figure in the paragraph below predates that: they were all measured while
     * `CAREER[0].job_name` still carried a "Founding " prefix, worth **89px** of this string.
     *
     * WHAT THE REWRITE DROPPED AND WHY. "Enthusiastic Learner" went first because no card,
     * page, goal or event on this site is about it, and it is now cut from {@link WELCOME}
     * too rather than surviving in the copy the title had to drop for width. Cycling stayed
     * because it is what the intro card's own h1 claims and what half the site is — a goal
     * card and a wall of race bibs. Running has an equal claim and was cut for width alone:
     * five phrasings naming both sports were measured and the cheapest was 601px — against
     * the longer job title, so that reason has expired rather than been overturned. Naming
     * both sports is now a copy decision; re-measure the phrasings before calling it a
     * width one again. The name is the FULL one because a title is where a search engine
     * decides which Calvin this is, which is the same reason
     * {@link METADATA.full_name} exists for the schema. The em dash is the separator every
     * other page's title already uses — those pages are `<heading> — Calvin`, so this one
     * inverts the order and takes the full name deliberately: the home page is the entity,
     * not a section of it.
     *
     * A LONGER JOB TITLE NOW LENGTHENS THIS AUTOMATICALLY, which is the cost of deriving it,
     * and `tests/content.test.ts` measures the width rather than counting characters. It
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
