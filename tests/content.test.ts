import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";

import {describe, expect, it} from "vitest";

import {ABOUT_ME, CAREER, NOW, WELCOME} from "../src/content/home";
import {NEXT_RACE, PATCHES} from "../src/content/races";
import {FOOTER, LINKS, METADATA, THEME_TOGGLE} from "../src/content/site";
import {clampToGoal, GOALS, goalForSport, type Sport} from "../src/lib/goal";
import {kmFromMetres, type RaceEvent, raceKm, type Recording, recordingKm} from "../src/lib/race";
import stravaProgress from "../src/data/strava-progress.json";
import {kmFromMeters} from "../scripts/fetch-strava-progress.mjs";
import {arial20pxWidth} from "./helpers/arial-20px";

/**
 * THE SITE'S CONTENT, AGAINST THE INVARIANTS ITS COMPONENTS SILENTLY RELY ON. The copy is
 * authored in `src/content/`, the goals in `src/data/goals.ts` and what a card reads is
 * derived in `src/lib/goal.ts`; nothing else validates any of it, and a typo reaches
 * production.
 *
 * IT SPANS THOSE MODULES ON PURPOSE rather than being split to match them, because the
 * invariants do: the SEO title is assembled from a career entry, the description has to name
 * every goal's target, and the sport join has to be total across the goals that exist. A
 * suite per module could assert none of those.
 */

const ICON_COLLECTIONS = ["fa6-brands", "ri"];

describe("LINKS", () => {
    it("is non-empty", () => {
        expect(LINKS.length).toBeGreaterThan(0);
    });

    it("uses absolute URLs or root-relative paths", () => {
        for (const {link, name} of LINKS) {
            expect(link, `${name} link must be absolute or root-relative`).toMatch(/^(https?:\/\/|\/)/);
        }
    });

    it("names icons from an installed iconify collection", () => {
        for (const {logo, name} of LINKS) {
            const [collection] = logo.split(":");
            expect(logo, `${name} logo must be "collection:icon"`).toContain(":");
            expect(ICON_COLLECTIONS, `${name} uses collection "${collection}"`).toContain(collection);
        }
    });

    it("has a unique name per entry", () => {
        expect(new Set(LINKS.map((l) => l.name)).size).toBe(LINKS.length);
    });

    /**
     * `name` is announced verbatim (IntroCard renders it into the sr-only span
     * and the icon is aria-hidden), so it has to describe what the link reaches.
     * A document is not a profile, and calling the résumé one is the defect this
     * encodes.
     *
     * Keyed on the FILE EXTENSION, not on a leading slash. The earlier version
     * asked whether the URL was root-relative, which silently stopped applying
     * the moment the same PDF moved to an absolute URL — a hosting change, not a
     * content change, would have re-admitted "Resume Profile".
     */
    const DOCUMENT = /\.(pdf|docx?|pptx?|xlsx?|csv|txt|epub)(\?|#|$)/i;

    it("calls no entry a profile unless it leads to one", () => {
        const documents = LINKS.filter(({link}) => DOCUMENT.test(link));
        expect(documents.length, "LINKS must still contain the résumé, or this test guards nothing").toBeGreaterThan(0);
        for (const {link, name} of documents) {
            expect(name.toLowerCase(), `${link} is a document, not somebody's profile`).not.toContain("profile");
        }
    });

    it("names every entry with something announceable", () => {
        for (const {link, name} of LINKS) {
            expect(name.trim(), `${link} needs a non-empty accessible name`).not.toBe("");
        }
    });
});

/**
 * THE RÉSUMÉ DECLARES A TITLE OF ITS OWN, AND IT IS PUBLISHED. public/resume.pdf is tracked,
 * served at the site's own root and linked from the home page, and a PDF's /Title — not its
 * filename — is what a browser tab and a search result put in front of a reader. It shipped
 * reading Calvin_Loh_Technical_Customer_Support_Resume while every surface the site renders
 * said Business Systems Analyst.
 *
 * WHAT IS REACHABLE HERE IS THE METADATA AND NOT THE DOCUMENT. The job title appears in the raw
 * bytes zero times and in none of this file's ten inflated content streams — the fonts are
 * subsetted and the text is stored as glyph indices, so no check written against the bytes can
 * see a word of the body. The note beside "keeps the README's lede in step with the current job
 * title" in tests/docs-drift.test.ts used to conclude from that measurement that the whole file
 * was out of reach. Half of it is; this half is a plain literal in the document information
 * dictionary and needs no dependency to read.
 *
 * IT IS THE FIRST THING IN THIS REPOSITORY TO READ A BINARY, so it is deliberately a few
 * regexes over bytes decoded as latin1 — that encoding is byte-faithful, which is the only
 * property being asked of it — rather than a PDF library the site would then have to carry.
 */
describe("public/resume.pdf", () => {
    /**
     * IT RESOLVES THE TRAILER RATHER THAN TAKING THE FIRST /Title IN THE FILE, and that is not
     * fastidiousness. This document carries FOUR /Title keys: one is the information dictionary
     * and the other three are outline entries the exporter wrote — a literal reading "EDUCATION "
     * and two UTF-16 hex strings. A first-match regex picks the right one today only because
     * Google Docs happens to emit the information dictionary as object 1 at the top of the file,
     * which is a fact about one exporter rather than about PDF. Following /Info is what makes the
     * gate about the field it names.
     *
     * EVERY FAILURE PATH THROWS RATHER THAN RETURNING EMPTY, which is the whole point of writing
     * it this way. A PDF whose cross-reference section is a stream has no `trailer` keyword and
     * may hold its information dictionary inside an object stream, where none of this can reach
     * it — a future export in that shape must fail loudly and be given a real reader, not pass
     * silently as "no title, therefore no mismatch".
     */
    const declaredTitle = (path: string): string => {
        const bytes = readFileSync(path).toString("latin1");

        const trailer = bytes.lastIndexOf("trailer");
        if (trailer < 0) throw new Error(`${path} has no trailer keyword, so its cross-reference `
            + "section is a stream and this reader cannot follow it. Give the gate a real PDF reader");

        const info = /\/Info\s+(\d+)\s+(\d+)\s+R/.exec(bytes.slice(trailer));
        if (info === null) throw new Error(`${path}'s trailer names no /Info, so the export dropped `
            + "the document information dictionary and the title a reader sees is now the filename");

        const object = new RegExp(`(?:^|[\\r\\n])${info[1]}\\s+${info[2]}\\s+obj\\b([\\s\\S]*?)endobj`)
            .exec(bytes);
        if (object === null) throw new Error(`${path}'s /Info points at object ${info[1]}, which is `
            + "not at the top level of the file — it is inside an object stream. Give the gate a real PDF reader");

        const title = /\/Title\s*\(((?:\\.|[^)\\])*)\)/.exec(object[1]);
        if (title === null) throw new Error(`${path}'s information dictionary carries no literal `
            + "/Title. If the exporter now writes it as a hex string, this reader needs that case");

        return title[1].replace(/\\([()\\\r\n])/g, "$1");
    };

    /** Punctuation-blind, because the title is filename-shaped and the job title is not. */
    const words = (s: string): string => s.replace(/[^A-Za-z0-9]+/g, " ").trim().toLowerCase();

    it("holds the résumé's declared title to the job CAREER records", () => {
        const current = CAREER[0].job_name;
        expect(current.length, "CAREER[0] has no job title — this gate is vacuous").toBeGreaterThan(3);

        const title = declaredTitle("public/resume.pdf");
        expect(title.length, "public/resume.pdf declares an empty /Title, so a browser tab and a "
            + "search result fall back to the filename — and an empty string would satisfy every "
            + "comparison below without asserting anything").toBeGreaterThan(0);

        expect(words(title), `public/resume.pdf declares itself "${title}", which does not state the `
            + `job CAREER[0] records ("${current}"). This is the maintainer's file to re-export — never `
            + "resolve the disagreement by editing CAREER").toContain(words(current));

        // The same nesting rule the README's lede gate uses: a past title is looked for only in
        // what is left once the current one is removed, so a promotion that contains the junior
        // title verbatim is not punished for being correct.
        const remainder = words(title).split(words(current)).join(" ");
        const stale = CAREER.slice(1).map((job) => job.job_name)
            .filter((past) => past !== current && remainder.includes(words(past)));
        expect(stale, `public/resume.pdf declares a job title held in the past as though it were `
            + "current. The file has both agreed and disagreed with CAREER before").toEqual([]);
    });
});

describe("GOALS", () => {
    it("is non-empty", () => {
        expect(GOALS.length).toBeGreaterThan(0);
    });

    it("has a unique goal name per entry", () => {
        expect(new Set(GOALS.map((g) => g.goal_name)).size).toBe(GOALS.length);
    });

    it("has finite numeric progress values", () => {
        for (const goal of GOALS) {
            for (const key of ["total_goal", "current_progress"] as const) {
                expect(Number.isFinite(goal[key]), `${goal.goal_name} ${key} must be a finite number`).toBe(true);
            }
            // null means "no comparable figure" and is rendered as a dash; any
            // other non-number would render literally.
            if (goal.progress_last_year !== null) {
                expect(Number.isFinite(goal.progress_last_year), `${goal.goal_name} progress_last_year must be a finite number or null`).toBe(true);
            }
        }
    });

    it("has a positive target", () => {
        for (const goal of GOALS) {
            expect(goal.total_goal, `${goal.goal_name} total_goal`).toBeGreaterThan(0);
        }
    });

    /**
     * THE FIGURE A POISONED FEED ACTUALLY MOVES IS THE UNCLAMPED ONE, and nothing bounded it.
     *
     * What stood here bounded current_progress against total_goal. current_progress IS
     * `Math.min(raw_progress, total_goal)`, so that was a value compared against its own
     * second argument — true for every input this codebase can produce. Measured rather than
     * argued: setting a goal's km in src/data/strava-progress.json to 9999999.9 left the whole
     * suite green and the card rendering as met.
     *
     * THE CLAMP IS STILL STATED, TWICE, AND NOT HERE. Further down this file, "feeds
     * current_progress from the bot-owned JSON" compares the displayed figure through
     * {@link clampToGoal}, and "caps an overshot year at the goal" exercises an overshoot
     * directly and repeats the upper bound on current_progress. A third copy in this file would
     * restate a rule two other assertions already own.
     *
     * THE CEILING IS LOOSE ON PURPOSE, AND IT IS A CLAIM ABOUT CORRUPTION RATHER THAN ABOUT
     * FITNESS. It is a multiple of the maintainer's own target, because that target is the only
     * statement of the year's scale this repository holds — a bound tight enough to judge a
     * season would redden on a good one, which is punishing the very edit this gate exists to
     * let through. What a loose bound still catches is the whole class that has ever gone wrong
     * here: a unit slip writing metres into a kilometre field, a fetch that summed more than one
     * athlete, a hand-typed digit. Every one of those clears ten times the target by orders of
     * magnitude. A year that genuinely beat 5000 km ten times over is the maintainer's news, not
     * this suite's problem, and moving the multiple is the correct response to it.
     */
    it("bounds the unclamped figure the bot writes", () => {
        expect(GOALS.length, "no goals were walked, so this bound is vacuous").toBeGreaterThan(0);
        for (const goal of GOALS) {
            expect(goal.raw_progress, `${goal.goal_name} raw_progress`).toBeGreaterThanOrEqual(0);
            expect(
                goal.raw_progress,
                `${goal.goal_name} raw_progress is ${goal.raw_progress} ${goal.measurable_unit} against a `
                + `${goal.total_goal} ${goal.measurable_unit} target — more than ten times the scale the year `
                + "was authored at. Read it as a corrupt figure in src/data/strava-progress.json rather than a "
                + "season, and if the season is real, move the multiple deliberately",
            ).toBeLessThanOrEqual(goal.total_goal * 10);
        }
    });

    it("names an icon from an installed iconify collection", () => {
        for (const goal of GOALS) {
            expect(ICON_COLLECTIONS, `${goal.goal_name} goal_logo`).toContain(goal.goal_logo.split(":")[0]);
        }
    });

    /**
     * A goal card no longer links out. It carried a call to action beside its
     * numbers, as did the other card, and both pointed at the same Strava profile
     * the intro card's social link already reaches — a destination a logged-out
     * visitor cannot see. So there is no `website_url`, `cta_label` or `cta_logo`
     * here, and this asserts their absence rather than leaving three fields that a
     * future editor would fill in expecting them to render.
     */
    it("carries no call-to-action fields, since a goal card no longer links out", () => {
        for (const goal of GOALS) {
            for (const dead of ["website_url", "cta_label", "cta_logo"]) {
                expect(goal, `${goal.goal_name} ${dead} would be read by nothing`).not.toHaveProperty(dead);
            }
        }
    });

    /**
     * `short_name` reaches the page: it is the word beside the sport icon on every bib,
     * and that icon is aria-hidden. An empty string therefore ships a bib whose sport is
     * carried by colour and an icon nobody announces — an SC 1.1.1 hole with a green
     * build. It had no gate at all until a review panel asked for one.
     *
     * Shorter than `goal_name` is asserted because that is WHY the field exists: the long
     * word wrapped the bib's meta line. A `short_name` equal to or longer than the goal's
     * name is the field being filled in without its reason.
     */
    it("gives every goal a short name that is announceable and actually shorter", () => {
        for (const goal of GOALS) {
            expect(goal.short_name.trim(), `${goal.goal_name} short_name is the word beside an aria-hidden icon`).not.toBe("");
            expect(
                goal.short_name.length,
                `${goal.goal_name} short_name "${goal.short_name}" is not shorter than the goal name — the field exists because the long word does not fit a bib`,
            ).toBeLessThan(goal.goal_name.length);
        }
        expect(new Set(GOALS.map((g) => g.short_name)).size, "two sports sharing a short name are indistinguishable on a bib").toBe(GOALS.length);
    });

    it("has a visible progress icon and unit", () => {
        for (const goal of GOALS) {
            expect(goal.goal_logo, `${goal.goal_name} goal_logo`).not.toBe("");
            expect(goal.measurable_unit, `${goal.goal_name} measurable_unit`).not.toBe("");
        }
    });

    /**
     * `goalForSport` is total by construction — `Sport` is read off `RAW_GOALS`, so the
     * type admits nothing `GOALS` lacks — and a review of the patch wall pointed out
     * that the type was the ONLY thing saying so. What breaks it is an edit rather than
     * an input: a `.filter(…)` added to the map that builds `GOALS` leaves the type
     * unchanged and the lookup empty. So the totality is checked here, and the function
     * throws with the sport's name instead of handing back a non-null `undefined`.
     *
     * Derived from GOALS rather than from a list of sports written here, so a third goal
     * joins this assertion by existing.
     */
    it("resolves every sport a goal declares, and names the sport when it cannot", () => {
        expect(GOALS.length, "no goals — this assertion would be vacuous").toBeGreaterThan(0);
        for (const goal of GOALS) {
            expect(goalForSport(goal.sport), `${goal.sport} must resolve to its own goal`).toBe(goal);
        }
        // The unreachable branch, reached the only way it can be: past the type.
        expect(() => goalForSport("swimming" as Sport)).toThrow(/swimming/);
    });
});

describe("THEME_TOGGLE", () => {
    /**
     * The toggle has no visible text and its icons are decorative, so this string is
     * the whole of what a screen reader gets for it.
     */
    /**
     * Not "is non-empty" — that was strictly implied by the assertion below it, so it
     * added a test to the count without adding a detectable failure. This is the one
     * hazard in this space that nothing else catches: "Dark theme on" satisfies every
     * other assertion here (it contains "dark", not "light", is not action-phrased) and
     * would be announced as "Dark theme on, toggle button, pressed" — the state said
     * twice, once by the name and once by `aria-pressed`, and contradicting itself as
     * soon as it is not pressed.
     */
    it("leaves the state to aria-pressed instead of spelling it into the name", () => {
        expect(THEME_TOGGLE.name.trim(), "the name is announced verbatim").not.toBe("");
        expect(
            THEME_TOGGLE.name.toLowerCase(),
            "the name says WHICH theme; aria-pressed says whether it is on",
        ).not.toMatch(/\b(on|off|active|inactive|enabled|disabled|pressed|selected)\b/);
    });

    /**
     * Coupled to English on purpose, because the alternative is a silent inversion.
     * The name is read together with `aria-pressed`, which the toggle sets true when
     * the DARK theme is active — so the name has to be the dark one. Renaming it to
     * "Light theme" would leave every structural assertion satisfied while the button
     * announced precisely the opposite of the truth, which is worse than the
     * stateless "Toggle Theme" this replaced. Nothing but the word can catch that.
     */
    it("names the theme its pressed state means, so the polarity cannot invert unnoticed", () => {
        expect(THEME_TOGGLE.name.toLowerCase(), "aria-pressed is true when dark is active").toContain("dark");
        expect(THEME_TOGGLE.name.toLowerCase(), "naming the other theme would invert what pressed means").not.toContain("light");
    });

    /**
     * A control carrying a pressed state must keep ONE name across both states —
     * WAI-ARIA's toggle-button guidance offers a changing name as the alternative to
     * that state, not an addition to it. A name phrased as an action is the tell that
     * someone has started down the other road while the state is still in place.
     */
    it("names a state rather than an action, since the state is what changes", () => {
        expect(THEME_TOGGLE.name.toLowerCase(), "a name that changes and a pressed state contradict each other").not.toMatch(/^(switch|toggle|change|turn|enable|activate)\b/);
    });
});

describe("CAREER", () => {
    it("has at least one entry", () => {
        expect(CAREER.length).toBeGreaterThan(0);
    });

    /*
     * `job_name` is asserted here because three assertions elsewhere check it with
     * `toContain` — the title, the career card and the llms.txt blockquote — and
     * `"anything".includes("")` is true, so an empty job title satisfies all three at once
     * while shipping `<title>Calvin Loh —  | Road Cyclist</title>`, `"jobTitle":""` and an
     * llms blockquote that starts " at HeyMax". A reviewer set it empty and watched the
     * whole suite stay green. A degenerate value is where a `toContain` gate goes quiet.
     */
    it("gives every entry a company, a job title, dates and at least one bullet", () => {
        for (const job of CAREER) {
            expect(job.company, "company must be set").toBeTruthy();
            expect(job.job_name, `${job.company} job_name must be set`).toBeTruthy();
            expect(job.company_url).toMatch(/^https?:\/\//);
            expect(job.start_date).toBeTruthy();
            expect(job.end_date).toBeTruthy();
            expect(job.description.length).toBeGreaterThan(0);
        }
    });

    it("names a title icon from an installed iconify collection", () => {
        for (const job of CAREER) {
            expect(ICON_COLLECTIONS, `${job.company} icon`).toContain(job.icon.split(":")[0]);
        }
    });
});

describe("METADATA", () => {
    it("uses an absolute site URL matching the deployed origin", () => {
        expect(METADATA.site_url).toBe("https://calvin.sg/");
    });

    it("uses an absolute preview image URL", () => {
        expect(METADATA.image_url).toMatch(/^https:\/\//);
    });

    /*
     * The name reaches five shipped strings — <title>, og:title, twitter:title, the schema's
     * `name` and llms.txt's H1 — and every assertion on those compares them back to
     * `METADATA.full_name` itself, which proves only that the pipeline is consistent. Set it
     * to "" and the suite stayed green at 363 while the title shipped as " — Founding
     * Business Systems Analyst | Road Cyclist" and llms.txt opened with a bare "#".
     *
     * `METADATA.name` is an independent literal, so relating the two is the cheapest
     * non-tautological check available: the full name must contain the short one, and must
     * actually be more than one word.
     */
    it("states a full name that agrees with the short one and is more than a first name", () => {
        expect(METADATA.name, "the short name must be set").toBeTruthy();
        expect(METADATA.full_name.startsWith(METADATA.name)).toBe(true);
        expect(METADATA.full_name.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
    });

    /*
     * THE TITLE IS GATED ON WIDTH, NOT ON LENGTH, because that is the quantity a search
     * result actually truncates on: roughly 600px of Arial 20px on desktop. This started
     * as a character cap pinned at the shipped string's own length, and a review panel
     * broke it in both directions with job titles nobody would blink at — "Warehouse
     * Automation Manager, WMS" is 33 characters — the length of the job title the cap was
     * calibrated against — and renders 606px (the cap passed it, truncated); "Institutional
     * Litigation Field Officer I" is 40 characters, renders 565px, and the cap failed it
     * with 35px to spare. A count cannot stand in for a width when one character spans
     * 3.8px to 20.3px.
     *
     * The 600 is an SEO convention rather than a documented constant (see the note on
     * METADATA.title), so it is a tripwire, not a specification. What it protects against
     * is real: the job title is interpolated from CAREER, so a promotion lengthens this
     * string with nobody editing it.
     */
    it("keeps the title and description within useful SEO lengths", () => {
        expect(METADATA.title.length).toBeGreaterThan(10);
        const width = arial20pxWidth(METADATA.title);
        expect(width, `the title renders ${width.toFixed(1)}px of Arial 20px; a desktop result cuts near 600`)
            .toBeLessThanOrEqual(600);
        expect(METADATA.description.length).toBeGreaterThan(50);
        expect(METADATA.description.length).toBeLessThanOrEqual(200);
    });

    it("does not expose a plain email address", () => {
        expect(METADATA.email_obfuscated).not.toMatch(/@/);
    });

    it("mentions each goal's target figure, so the description cannot drift from GOALS", () => {
        // On origin/main the description advertised a 3000km goal while the
        // card said 5000km — this exact drift shipped silently.
        for (const goal of GOALS) {
            expect(METADATA.description).toContain(`${goal.total_goal}${goal.measurable_unit}`);
        }
    });
});

describe("prose blocks", () => {
    it("are non-empty", () => {
        expect(WELCOME.description.length).toBeGreaterThan(0);
        expect(ABOUT_ME.description.length).toBeGreaterThan(0);
        expect(NOW.description.length).toBeGreaterThan(0);
        expect((FOOTER.prefix + FOOTER.suffix).length).toBeGreaterThan(0);
    });
});

/**
 * `public/preview.jpg` IS A RENDER OF THE INTRO CARD, AND NOTHING BUILDS IT. It is used twice —
 * README.md's hero and the site's `og:image`/`twitter:image` through METADATA.image_url — so it is
 * the first thing both a GitHub visitor and a link unfurl see, and it is the one artefact here
 * that no build step produces and no other assertion reads. It has gone stale silently twice: once
 * three design changes behind (an emoji greeting the icon migration had replaced), and again in
 * #149, where both job titles were corrected and the hero went on showing the old one.
 *
 * THE FIX IS NOT A LOUDER COMMENT. There was already a comment — the note above WELCOME in
 * src/content/home.ts says any edit there owes a regeneration — and the hero went stale anyway,
 * because a comment cannot fail. This records WHAT THE IMAGE DEPICTS as a fingerprint over the
 * content that reaches that card, so changing any of it turns the suite red with the recipe in
 * hand rather than shipping a hero that disagrees with the page.
 *
 * WHAT IS IN THE FINGERPRINT is exactly what a screenshot would differ over: the three lines of
 * the h1 stack, the greeting mark beside the first of them, the words and mark of the link out to
 * the wall, the social glyphs IN ORDER, and the portrait's own bytes. Names and URLs are
 * deliberately out — an `sr-only` name and an `href` change no pixel, and a gate that reddened on
 * them would train the next reader to update the constant without looking at the image.
 *
 * AND WHAT IS NOT, stated so nobody reads more into a green run: this watches the CONTENT, not the
 * drawing. A theme token, a font size, the card's padding, the control geometry — every one of
 * those restyles the hero without moving this fingerprint. The honest claim is that the commonest
 * cause of staleness, an edit to the copy, can no longer ship unnoticed.
 *
 * THE RECIPE, kept here because the record the home.ts note used to point at was never written.
 * Confirmed unchanged across #113 and #149, so treat these as the acceptance criteria of a RETAKE
 * rather than as history — a regeneration that cannot reproduce them is recomposing the hero:
 *
 *   Build, serve `dist/`, and capture the intro card — `main > div:first-child`, asserted to
 *   contain an `<img>` rather than assumed — in the DARK theme at a 1200px-wide viewport at least
 *   ~848px tall, with animations frozen (the cards run an entrance with per-child delays).
 *   The card measures 824x357. Capture at 4x and DOWNSCALE, never up: resize to 1180x511 and
 *   composite at (10, 63) on a 1200x630 canvas filled with #111111. 1200x630 is the OG aspect
 *   ratio and is load-bearing; the 1.43x enlargement is what makes it a recognisable hero.
 *   Encode with `sharp` — already a devDependency — at `{quality: 82, chromaSubsampling: "4:4:4",
 *   mozjpeg: true}`, which lands around 54-56 KB. 4:4:4 because the subject is UI text and icon
 *   edges. Then diff the new render against the committed file and look at the BOUNDING BOX of
 *   the changed pixels, not a whole-image metric: a copy change should move one band the height
 *   of one line. Anything taller means the composition moved.
 */
describe("public/preview.jpg", () => {
    it("still depicts the content the intro card renders", () => {
        const depicted = JSON.stringify({
            lines: WELCOME.description,
            greeting: WELCOME.greeting_icon,
            wall: [PATCHES.heading, NEXT_RACE.icon],
            glyphs: LINKS.map(({logo}) => logo),
            portrait: createHash("sha256").update(readFileSync("src/assets/me.webp")).digest("hex"),
        });
        const fingerprint = createHash("sha256").update(depicted).digest("hex").slice(0, 16);

        expect(fingerprint, "the intro card's content has changed, so public/preview.jpg now "
            + "disagrees with the page it is a render of. Regenerate it by the recipe above, then "
            + `record the new fingerprint here: ${fingerprint}`).toBe("1719ed42abd3422c");
    });
});

describe("NOW", () => {
    it("is a single string, so a second sentence cannot silently run together", () => {
        expect(typeof NOW.description).toBe("string");
        expect(Array.isArray(NOW.description)).toBe(false);
    });

    it("points its explainer somewhere absolute, at an installed icon", () => {
        expect(NOW.explainer_url, "the explainer leaves the site, so it must be absolute").toMatch(/^https?:\/\//);
        expect(NOW.explainer_icon, 'explainer_icon must be "collection:icon"').toContain(":");
        expect(ICON_COLLECTIONS, `explainer_icon uses collection "${NOW.explainer_icon.split(":")[0]}"`)
            .toContain(NOW.explainer_icon.split(":")[0]);
    });

    /**
     * The explainer is an icon with no visible words, so this string OPENS what a screen
     * reader announces for it — the whole name is this plus NEW_TAB_NOTICE, which the
     * anchor carries as a second sr-only span. Two things are asserted, and the second
     * is the one worth having.
     *
     * It must SAY WHAT THE DESTINATION EXPLAINS, not gesture at it. The wording this
     * replaced was "what's that ?", which reads fine sitting under the word "Now" and
     * says nothing at all in a list of links read out of context — and an icon link has
     * no context to sit under. Pinning "what" out of the name is the cheap version of
     * that rule and would reject a perfectly good rewrite, so what is pinned instead is
     * that the name names its subject: a /now page.
     */
    it("gives the explainer a name that survives being read out of context", () => {
        expect(NOW.explainer_name.trim().length, "an icon-only link with no accessible name announces as its URL").toBeGreaterThan(0);
        expect(
            NOW.explainer_name.toLowerCase(),
            `the explainer's accessible name opens with "${NOW.explainer_name}"; it has to name what the link explains, because there is no visible text beside it to supply the subject`,
        ).toContain("now page");
    });
});

describe("strava progress wiring", () => {
    it("feeds current_progress from the bot-owned JSON", () => {
        const written = {Cycling: stravaProgress.cycling_km, Running: stravaProgress.running_km};
        for (const goal of GOALS) {
            const raw = written[goal.goal_name as keyof typeof written];
            // Guards the JSON's shape: a renamed or dropped key arrives here as
            // undefined, which would otherwise satisfy the comparison below.
            expect(Number.isFinite(raw), `${goal.goal_name} km must be a finite number`).toBe(true);
            expect(raw, goal.goal_name).toBeGreaterThanOrEqual(0);
            // Compared through the clamp so an overshot year is not a test failure.
            expect(goal.current_progress, goal.goal_name).toBe(clampToGoal(raw, goal.total_goal));
        }
    });

    it("caps an overshot year at the goal, so total_goal is the only knob", () => {
        // The bot writes raw km; the clamp lives next to total_goal rather
        // than in the script, which holds no configuration of its own.
        expect(clampToGoal(6000, 5000)).toBe(5000);
        expect(clampToGoal(2246.4, 5000)).toBe(2246.4);
        for (const goal of GOALS) {
            expect(goal.current_progress, `${goal.goal_name}`).toBeLessThanOrEqual(goal.total_goal);
        }
    });

    /**
     * THE BOT'S CONVERSION, HELD TO THE SAME DIRECTION AS THE SITE'S. One decimal here against
     * `kmFromMetres`'s two — a year's total against a four-figure target — but both round DOWN,
     * so the goal card and the wall quote Strava the same way.
     *
     * EACH CASE SAYS WHAT IT ACTUALLY SEPARATES, because an earlier revision labelled them by
     * what they were meant to separate and two of the three labels were false. There are TWO
     * rival rules here, not one: true half-up, and the `toFixed(1)` this script used to use —
     * and `toFixed` is not half-up, because it rounds a double that is already below the
     * midpoint. 2246450 m is 2246.4 through `toFixed` and 2246.5 through true half-up, so the
     * case that pins the change this PR made is 2246480, not 2246450.
     */
    it("converts meters to km rounded DOWN to 1 decimal, and rejects garbage", () => {
        expect(kmFromMeters(2246412.3, "ride"), "the shipped figure; agrees under every rule").toBe(2246.4);
        expect(kmFromMeters(2246450.0, "ride"), "separates this from TRUE half-up only").toBe(2246.4);
        expect(kmFromMeters(2246480.0, "ride"), "separates this from the toFixed(1) it replaced").toBe(2246.4);
        expect(kmFromMeters(2246400.0, "ride"), "a whole tenth must not fall to the tenth below")
            .toBe(2246.4);
        expect(kmFromMeters(0, "ride")).toBe(0);
        for (const bad of [undefined, null, NaN, Infinity, -1, "138"]) {
            expect(() => kmFromMeters(bad, "ride"), String(bad)).toThrow();
        }
    });

    /**
     * NEITHER CONVERSION MAY EVER CLAIM A METRE THAT WAS NOT RIDDEN, which is the one property
     * both sides of the repository share and the reason the rule is "down" rather than
     * "nearest". Asserted over the same inputs for both functions, so a future edit that
     * flips one of them in isolation is red here as well as in its own test.
     */
    it("never rounds either figure UP past the distance it was given", () => {
        for (const metres of [0, 1, 99, 100, 2246412.3, 2246450, 78595, 22115.1, 160566]) {
            expect(kmFromMeters(metres, "ride"), `bot, ${metres} m`).toBeLessThanOrEqual(metres / 1000);
            expect(kmFromMetres(metres), `site, ${metres} m`).toBeLessThanOrEqual(metres / 1000);
        }
    });
});

/**
 * THE SITE'S ONE DISTANCE CONVERSION, TESTED WHERE IT NOW LIVES.
 *
 * These assertions are the ones `EVENTS` used to make by carrying converted figures: the rows
 * hold the API's metres and every kilometre a reader sees is computed, so the rule is code and
 * belongs in a unit test rather than in the data. Every input below is a real activity's
 * `distance` off the API — a rule can only be said to be tested on inputs that DISCRIMINATE it,
 * and half of these do nothing of the kind, which is why they are labelled.
 */
describe("kmFromMetres", () => {
    /** [metres, rounded down (the rule), half-up (the rule this repository does not hold)] */
    const CASES: readonly [number, number, number][] = [
        [22454.7, 22.45, 22.45],    // agrees either way
        [117411.0, 117.41, 117.41], // agrees either way
        [130033.0, 130.03, 130.03], // agrees either way
        [158100.0, 158.10, 158.10], // agrees either way, and lands exactly on a hundredth
        [22115.1, 22.11, 22.12],    // DISCRIMINATES
        [17908.4, 17.90, 17.91],    // DISCRIMINATES
        [78595.0, 78.59, 78.60],    // DISCRIMINATES, and sits exactly on the half-up midpoint
        [22558.8, 22.55, 22.56],    // DISCRIMINATES
        [140498.0, 140.49, 140.50], // DISCRIMINATES
        [10166.6, 10.16, 10.17],    // DISCRIMINATES
        [160566.0, 160.56, 160.57], // DISCRIMINATES
    ];

    it("drops the third decimal rather than rounding it", () => {
        let discriminating = 0;
        for (const [metres, down, halfUp] of CASES) {
            expect(kmFromMetres(metres), `${metres} m`).toBe(down);
            if (down !== halfUp) discriminating++;
        }
        // Without this the table could drift to inputs that agree under both rules and the
        // suite would go on passing whichever one shipped — which is exactly how the earlier
        // "measured on four cases" claim about this rule turned out to be self-confirmation.
        expect(discriminating, "no case here tells the two rounding rules apart").toBeGreaterThan(0);
    });

    /**
     * A WHOLE MULTIPLE OF 10 m MUST NOT FALL TO THE HUNDREDTH BENEATH IT, and this assertion
     * has been wrong twice in the same six lines — both ways are worth keeping written down.
     *
     * IT COMPARED AGAINST `kmFromMetres(m) * 100`, which is itself a float operation, so the
     * gate manufactured the error it was checking for: `kmFromMetres(158110) * 100` is
     * 15811.000000000002 and the assertion was RED ON CORRECT CODE. To assert an exact value,
     * compare against the exact value — a 2dp literal — never a computation over the result.
     *
     * AND ITS SIX INPUTS ALL AGREED UNDER THE WRONG RULE, which is the worse half. Every one of
     * 0, 10, 1000, 158100, 22450 and 999990 gives the same answer through
     * `Math.floor(metres / 1000 * 100) / 100` — the natural "convert to km first, then floor"
     * spelling that `kmFromMetres`'s own comment says is not a spelling. That substitution
     * differs on 1145 of the 21001 whole multiples of 10 m between 0 and 210000, and the whole
     * suite stayed green under it. A table proves its rows and nothing else, so the rows must
     * be chosen to DISCRIMINATE, and the count below fails if a future edit lets them drift
     * back to agreeing inputs.
     */
    it("is exact where the quotient is a whole number of hundredths", () => {
        /** [metres, the exact km, does this input separate the shipped rule from `m / 1000 * 100`?] */
        const EXACT: readonly [number, number, boolean][] = [
            [0, 0, false],
            [10, 0.01, false],
            [1000, 1, false],
            [158100, 158.10, false],   // the live row: a whole tenth of a km, agrees either way
            [999990, 999.99, false],
            [10030, 10.03, true],
            [10120, 10.12, true],
            [16060, 16.06, true],
            [10200, 10.20, true],
        ];
        const viaKmFirst = (metres: number) => Math.floor(metres / 1000 * 100) / 100;
        let discriminating = 0;
        for (const [metres, km, discriminates] of EXACT) {
            expect(kmFromMetres(metres), `${metres} m`).toBe(km);
            expect(viaKmFirst(metres) !== km, `${metres} m is labelled ${discriminates}`).toBe(discriminates);
            if (discriminates) discriminating++;
        }
        expect(discriminating, "no input here separates the two spellings, so this proves nothing")
            .toBeGreaterThan(0);
    });

    /**
     * A SPLIT RACE'S SUMMED METRES, WHICH IS WHERE FLOAT ADDITION BITES AND `kmFromMetres`
     * ALONE CANNOT SEE IT. Every input above is a single stored value; a race sums several
     * before converting, and adding doubles is not exact. Three parts whose exact decimal sum
     * is a whole multiple of 10 m are the case: 86432.4 + 47793.2 + 24244.4 adds to
     * 158469.99999999997 in IEEE, which floors to 158.46 for a ride of 158.47.
     *
     * THE ORDER ASSERTION IS THE REAL ONE. A bib's distance must not depend on the sequence
     * the parts were ridden in, and before the micron snap in `raceKm` one permutation of
     * these three gave 158.46 while the other five gave 158.47. Both races on the wall today
     * have two parts, which cannot reach this — so nothing in the shipped data would have
     * caught it, which is exactly why the fixture is synthetic.
     */
    it("sums a 3-part race exactly, and to the same figure in any order", () => {
        const metres = [86432.4, 47793.2, 24244.4];
        const race = (order: readonly number[]): RaceEvent => ({
            date: "2026-06-01", name: "Fixture", sport: "cycling", country: "Nowhere",
            recordings: order.map((m, i) => ({id: `${i}`, metres: m, elapsed_time: "1:00:00"})) as
                [Recording, ...Recording[]],
        });
        expect(raceKm(race(metres)), "the exact decimal sum is 158470.0 m").toBe(158.47);
        expect(raceKm(race([...metres].reverse())), "reversed").toBe(158.47);
        expect(raceKm(race([metres[1], metres[0], metres[2]])), "and any other order").toBe(158.47);
    });

    /**
     * `toFixed` IS THE TRAP, and it is not the trap you expect: it agrees with this rule on one
     * of the rows that ships. 78595.0 m gives `78.59` through both, because 78.595 lands just
     * below the decimal midpoint once it is a binary double — so a reviewer sampling that row
     * to check "does toFixed do the same thing" gets a yes. It differs on others.
     */
    it("is not Number((metres / 1000).toFixed(2)), on the rows where that matters", () => {
        const viaToFixed = (metres: number) => Number((metres / 1000).toFixed(2));
        expect(viaToFixed(78595.0), "the row that hides the difference").toBe(kmFromMetres(78595.0));
        for (const metres of [22115.1, 140498.0, 10166.6, 160566.0]) {
            expect(viaToFixed(metres), `${metres} m must expose it`).not.toBe(kmFromMetres(metres));
        }
    });
});

/**
 * A RACE'S DISTANCE, WHICHEVER SHAPE THE RACE IS. The accessor every consumer reads — the bib,
 * llms.txt and the projection all go through it — so the two shapes are pinned here rather than
 * left to whichever page happens to render one.
 */
describe("raceKm", () => {
    const part = (metres: number, id = "1"): Recording => ({id, metres, elapsed_time: "1:00:00"});
    const base = {date: "2026-06-01", name: "Fixture", sport: "cycling" as const, country: "Nowhere"};
    // Spelled as a rest parameter so the array reaches `RaceEvent` as the non-empty TUPLE the
    // recorded shape asks for; a plain `Recording[]` satisfies neither half of the union.
    const recorded = (...parts: [Recording, ...Recording[]]): RaceEvent => ({...base, recordings: parts});

    it("takes a booked race's advertised distance as it is written", () => {
        expect(raceKm({...base, advertised_km: 21.10})).toBe(21.10);
        expect(raceKm({...base, advertised_km: 1022.00})).toBe(1022.00);
    });

    it("derives a recorded race's distance from its metres", () => {
        expect(raceKm(recorded(part(22115.1)))).toBe(22.11);
    });

    /**
     * THE METRES WIN WHEREVER BOTH FIGURES EXIST, AND THIS IS WHERE A DELETED TYPE GUARD WENT.
     *
     * A recorded race used to carry `km?: never`, so a stored distance beside stored metres was
     * a COMPILE error and this function could not be handed the ambiguity at all. The ledger
     * needs the organiser's own division printed beside the ride, so the pair is now legal and
     * the invariant is a runtime one — which means it needs a test, and it needs this one
     * rather than a stronger-sounding one.
     *
     * WHY THE ADVERTISED FIGURE IS DELIBERATELY THE MORE PLAUSIBLE OF THE TWO. 21.10 is what a
     * half marathon IS; 22.45 is what a watch recorded running it. An implementation that
     * reached for the advertised figure would look right on the page and be wrong about what
     * the site claims to know, so the fixture is chosen to make the substitution invisible to
     * anything but this assertion. Mutating the accessor to prefer `advertised_km` reddens
     * three gates including llms.txt's independent oracle, but only this one names the rule.
     */
    it("prefers the recorded metres over an advertised distance on the same row", () => {
        expect(raceKm({...recorded(part(22454.7)), advertised_km: 21.10}),
            "a race that was ridden reports the ride, whatever the organiser advertised").toBe(22.45);
        expect(raceKm({...base, advertised_km: 21.10, recordings: []}),
            "and an EMPTY list is not a recording, so the advertised figure is all there is").toBe(21.10);
    });

    /**
     * THE SUMMING RULE, AND THE ROW IN `EVENTS` THAT DEPENDS ON IT. Convert the summed metres
     * ONCE: each conversion drops a third decimal, so adding the parts' printed figures drops
     * one per part and lands under the race. This pair is the live 10 July row's arithmetic.
     */
    it("sums a split race's metres BEFORE converting, which its parts' figures do not", () => {
        const parts: [Recording, Recording] = [part(22558.8, "a"), part(140498.0, "b")];
        expect(raceKm(recorded(...parts)), "the summed metres, converted once").toBe(163.05);
        const addedUp = parts.reduce((total, r) => total + recordingKm(r), 0);
        expect(Number(addedUp.toFixed(2)), "the parts' own printed figures, added up").toBe(163.04);
    });

    /**
     * THE TYPE CLOSES THIS AND THE BRANCH STAYS ANYWAY. The false reason for keeping it is
     * that "`recordings: []` is a legal booked race, so a row could carry an empty list and
     * no `km`" — it is not legal: `BookedRace` REQUIRES `km` and `RecordedRace` requires a
     * non-empty tuple, so that shape satisfies neither arm and `pnpm check` rejects it.
     *
     * The `?? NaN` branch is kept because the type is not the only door. `EVENTS` is authored
     * behind one cast in this suite and several in the others, `JSON.parse` reaches none of
     * this, and a `raceKm` handed a malformed row should say "no distance" rather than 0 —
     * which would silently book a race for nothing. So this asserts the FALLBACK, on a shape
     * reached through `unknown` on purpose, and `tests/projection.test.ts` sweeps the real
     * `EVENTS` to prove no shipped row takes it.
     */
    it("answers NaN for a malformed row with neither a recording nor an advertised distance", () => {
        // Through `unknown` because the union rejects this shape outright — the cast is the
        // test reaching past a compile-time guarantee to check what runtime does anyway.
        expect(Number.isNaN(raceKm({...base, recordings: []} as unknown as RaceEvent))).toBe(true);
    });
});
