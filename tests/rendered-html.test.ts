import {experimental_AstroContainer as AstroContainer} from "astro/container";
import {parseHTML} from "linkedom";
import {beforeAll, describe, expect, it} from "vitest";

import Index from "../src/pages/index.astro";
import {ABOUT_ME, CAREER, FOOTER, GOALS, LINKS, METADATA, NEW_TAB_NOTICE, NEXT_RACE, NOW, THEME_TOGGLE, WELCOME} from "../src/lib/constants";
import {nextRace, nextRaceLine, patchesEarned} from "../src/lib/projection";
import {decl, isStateful, pageCss, parseRules} from "./helpers/css";
import {iconClass} from "../src/lib/icons";

let doc: Document;
let html: string;
/** Decoded, whitespace-normalised visible text — assert content against this, not raw HTML. */
let text: string;

beforeAll(async () => {
    const container = await AstroContainer.create();
    html = await container.renderToString(Index);
    doc = parseHTML(html).document as unknown as Document;

    // Re-parse the markup inside a real body so textContent is reliable
    // regardless of any leading non-element content in the rendered string.
    const wrapper = parseHTML("<html><body></body></html>").document;
    wrapper.body.innerHTML = html;
    text = (wrapper.body.textContent ?? "").replace(/\s+/g, " ");
});

/**
 * The accessible name of an anchor, resolved in the order accname-1.2 resolves it:
 * `aria-label` (step 2C) outranks the element's own content. The two agree on every
 * anchor of this page today — Chrome's own computation was diffed against this — but
 * the inverted order leaves a test that disagrees with a screen reader the moment an
 * aria-label and a naming span coexist and differ. The fixtures below pin BOTH
 * directions of that precedence, because a review panel showed the page's own anchors
 * cannot distinguish them: inverting these two branches left the suite green.
 *
 * There is deliberately no separate `.sr-only` branch. Name-from-content already
 * concatenates every non-hidden descendant's text, so this repo's naming span is
 * *included* by the content branch rather than needing one of its own — and a
 * dedicated branch would be actively wrong, since accname computes
 * `<a>visible <span class="sr-only">extra</span></a>` as "visible extra", not
 * "extra". Two branches is the accname-correct shape as well as the simpler one.
 */
const accessibleName = (a: Element): string =>
    a.getAttribute("aria-label")?.trim()
    || a.textContent?.trim().replace(/\s+/g, " ")
    || "";

/** Every destination in `d` reached by anchors that do not agree on its name. */
const destinationsWithSeveralNames = (d: Document): string[] => {
    const byHref = new Map<string, Set<string>>();
    for (const a of d.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href")!;
        if (!byHref.has(href)) byHref.set(href, new Set());
        byHref.get(href)!.add(accessibleName(a));
    }
    return [...byHref.entries()]
        .filter(([, names]) => names.size > 1)
        .map(([href, names]) => `${href} is announced as ${[...names].map((n) => `"${n}"`).join(" and ")}`);
};

/** Every name in `d` worn by anchors that do not agree on where they go. */
const namesWithSeveralDestinations = (d: Document): string[] => {
    const byName = new Map<string, Set<string>>();
    for (const a of d.querySelectorAll("a[href]")) {
        const name = accessibleName(a);
        if (name === "") continue;
        if (!byName.has(name)) byName.set(name, new Set());
        byName.get(name)!.add(a.getAttribute("href")!);
    }
    return [...byName.entries()]
        .filter(([, hrefs]) => hrefs.size > 1)
        .map(([name, hrefs]) => `"${name}" navigates to ${[...hrefs].join(" and ")}`);
};

/**
 * A two-anchor document, for proving the two checkers above can actually fail.
 *
 * They are asserted against the rendered page, where they must find nothing — and
 * an assertion that finds nothing needs separate evidence that it CAN find
 * something, or it is indistinguishable from a checker that silently returns an
 * empty array. Both used to get that evidence from the page itself, which repeated
 * one Strava URL across three anchors; it now appears once, so a page-derived
 * non-vacuity guard would report the honest fact that the page no longer exercises
 * either rule, and go red for a reason unrelated to the rule being broken. Proving
 * it on a fixture keeps the rule policed for the next anchor that shares a href or
 * a name, without pretending today's page is the proof.
 */
type Anchor = {href: string, name: string, label?: string};

const twoAnchors = (a: Anchor, b: Anchor): Document => {
    const one = ({href, name, label}: Anchor) =>
        `<a href="${href}"${label === undefined ? "" : ` aria-label="${label}"`}><span class="sr-only">${name}</span></a>`;
    return parseHTML(`<html><body>${one(a)}${one(b)}</body></html>`).document as unknown as Document;
};

describe("document head", () => {
    it("renders the configured title", () => {
        expect(doc.querySelector("title")?.textContent).toBe(METADATA.title);
    });

    it("renders the meta description", () => {
        expect(doc.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(METADATA.description);
    });

    it("renders a canonical link", () => {
        expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBeTruthy();
    });
});

describe("JSON-LD structured data", () => {
    let schema: Record<string, any>;

    beforeAll(() => {
        const raw = doc.querySelector('script[type="application/ld+json"]')?.textContent;
        expect(raw, "a JSON-LD block must be present").toBeTruthy();
        schema = JSON.parse(raw!);
    });

    it("describes a Person with the configured name", () => {
        expect(schema["@type"]).toBe("Person");
        expect(schema.name).toBe(METADATA.name);
    });

    it("exposes sameAs as a flat list of the absolute LINKS URLs", () => {
        const absolute = LINKS.filter((l) => /^https?:\/\//.test(l.link)).map((l) => l.link);
        expect(absolute.length, "LINKS must contain at least one absolute URL").toBeGreaterThan(0);
        // Flat array of strings — not [[…]], and no site-relative paths.
        expect(schema.sameAs).toEqual(absolute);
        for (const entry of schema.sameAs) expect(entry).toMatch(/^https?:\/\//);
    });

    it("names the employer in worksFor, and the job title in jobTitle", () => {
        expect(schema.worksFor.name).toBe(CAREER[0].company);
        expect(schema.jobTitle).toBe(CAREER[0].job_name);
        expect(schema.worksFor.name).not.toBe(schema.jobTitle);
    });

    it("uses the https schema.org context", () => {
        expect(schema["@context"]).toBe("https://schema.org");
    });
});

describe("page content", () => {
    it("renders every welcome line", () => {
        for (const line of WELCOME.description) expect(text).toContain(line);
    });

    it("renders every about-me bullet", () => {
        for (const line of ABOUT_ME.description) expect(text).toContain(line);
    });

    it("renders one card per career entry, with its bullets", () => {
        for (const job of CAREER) {
            expect(text).toContain(job.job_name);
            for (const line of job.description) expect(text).toContain(line);
            expect(text).toContain(`${job.start_date} - ${job.end_date}`);
            expect(text).toContain(job.company);
            expect([...doc.querySelectorAll("a")].map((a) => a.getAttribute("href")), `${job.company} link`).toContain(job.company_url);
        }
    });

    it("renders the Now card's status line", () => {
        // NOW.description is a substring of METADATA.description, which only
        // reaches <meta content> attributes — `text` is body-only, so this
        // fails if <Now/> is dropped from the page.
        expect(text).toContain(NOW.description);
    });

    /**
     * The Now card's explainer is an icon link with no visible words, so the whole of
     * what a screen reader gets is the sr-only name. An icon link that loses its name
     * announces as its URL, or as nothing at all, and no layout assertion notices.
     *
     * This is the one card that used to write its own heading, purely so the explainer
     * could share the heading's row — which is why it was also the one card whose
     * heading did not reserve the same space beneath it. So the structural half is
     * asserted too: the heading has to come from `Card`, i.e. be a direct child of the
     * card element like the other five, not a descendant of some row inside it.
     */
    it("gives the Now card's explainer an accessible name and no visible words", () => {
        const now = [...doc.querySelectorAll("[data-card]")]
            .find((c) => (c.querySelector("h2")?.textContent ?? "").trim() === "Now");
        expect(now, "no card titled Now — every assertion below would be vacuous").toBeTruthy();

        const link = [...now!.querySelectorAll("a")]
            .find((a) => a.getAttribute("href") === NOW.explainer_url);
        expect(link, `the Now card must link to ${NOW.explainer_url}`).toBeTruthy();

        expect(link!.getAttribute("target"), "the warning is only true while the link opens a new tab").toBe("_blank");

        // EXACTLY the name, not merely containing it. A computed accessible name is the
        // CONCATENATION of the subtree, so a second sr-only span beside this one is
        // announced as part of the name — "Link Link Link. What's a /now page?" satisfied a
        // `toContain` check while constants.ts no longer owned what a reader hears.
        //
        // BOTH strings are named here, IN ORDER, for that reason. The second is the
        // new-tab warning, and it goes last on purpose: it says what the link DOES, which
        // is only useful once the reader knows what the link IS. Ordering the pair the
        // other way announces "opens in a new tab, what's a /now page?", and a set
        // comparison would call that correct.
        const srOnly = [...link!.querySelectorAll(".sr-only")].map((s) => s.textContent?.trim()).filter(Boolean);
        expect(
            srOnly,
            "the explainer link's announced text must come from constants.ts and be the whole of it, in order; extra hidden text concatenates into what is announced",
        ).toEqual([NOW.explainer_name, NEW_TAB_NOTICE]);

        // The anchor holds exactly two things: the glyph and the name. Asserted on the
        // shape rather than on the text, because the "no visible words" check below
        // classifies DIRECT children by class token — a visible span nested inside an
        // `sr-only` wrapper (`.not-sr-only` genuinely un-hides: position:static, clip:auto,
        // overflow:visible) painted "huh ?" while that check reported no visible text.
        const kids = [...link!.children];
        expect(
            kids.map((k) => k.tagName.toLowerCase()),
            "the explainer anchor must contain exactly a glyph, an sr-only name and the sr-only new-tab warning",
        ).toEqual(["span", "span", "span"]);
        expect(kids[0].getAttribute("class"), "the first child must be the icon glyph").toMatch(/(^|\s)i-/);
        expect(kids[0].textContent?.trim(), "the glyph carries no text of its own").toBe("");
        for (const i of [1, 2]) {
            expect(kids[i].getAttribute("class"), `child ${i} must be sr-only`).toMatch(/(^|\s)sr-only(\s|$)/);
            expect(kids[i].children.length, "hidden text must be plain, not a wrapper a child can un-hide").toBe(0);
        }
        expect(
            kids[kids.length - 1].textContent?.trim(),
            "the new-tab warning must be the anchor's LAST child, so it lands at the end of the accessible name",
        ).toBe(NEW_TAB_NOTICE);

        // NEITHER SR-ONLY SPAN MAY BE HIDDEN FROM THE TREE. `aria-hidden="true"` on the
        // notice deletes the announcement from the AX tree on both pages with every other
        // assertion here green, because they read textContent and class tokens and
        // `aria-hidden` touches neither. The same guard is on the NAME span for a bigger
        // reason: hiding that one leaves the link with an EMPTY accessible name, and
        // nothing before this caught it. linkedom computes no AX tree, so this cannot
        // police `hidden` / `display:none` / `role=presentation` — those need a
        // browser-driven check, which is why the PR reads the real tree over CDP.
        for (const i of [1, 2]) {
            expect(kids[i].getAttribute("aria-hidden"), "an sr-only span that is aria-hidden announces nothing").toBeNull();
            expect(kids[i].closest('[aria-hidden="true"]'), "and neither may an ancestor hide it").toBeNull();
        }

        // No `title` either. It paints a tooltip — visible words back — and per HTML-AAM it
        // is a name/description fallback that some AT combinations append, i.e. exactly the
        // double announcement the assertion above prevents.
        expect(link!.getAttribute("title"), "a title attribute competes with the sr-only name and paints a tooltip").toBeNull();

        // No visible text of its own. A link that still carries words does not need an
        // sr-only name, and having both would announce the name twice.
        const visible = [...link!.childNodes]
            .filter((n) => n.nodeType === 3 || !(n as Element).classList?.contains("sr-only"))
            .map((n) => (n.nodeType === 3 ? n.textContent : (n as Element).textContent) ?? "")
            .join("").trim();
        expect(visible, "the explainer is an icon; visible words beside it would be announced twice").toBe("");

        // The icon itself must be hidden from the accessibility tree, or it competes
        // with the name above.
        const icon = link!.querySelector('[class*="i-"]');
        expect(icon, "the explainer must render an icon").toBeTruthy();
        expect(icon!.getAttribute("aria-hidden"), "the glyph is decorative beside an sr-only name").toBe("true");

        // THE HEADING MUST COME FROM `Card`, which is what makes the space under it the
        // same as every other card's. The invariant is "one heading implementation", and
        // it is asserted as such: every card heading on the page carries the identical
        // class string, so a hand-rolled one — the shape that caused the reported
        // inconsistency — shows up as a second spelling.
        //
        // This deliberately does NOT assert `h2.parentElement === card`. That was the
        // first spelling and it pinned an incidental DOM shape rather than the property:
        // the Now card's heading now shares a flex row with the card's corner marks, so
        // it is a grandchild, and it was the ABSOLUTE positioning that row replaced which
        // painted the marks over the heading at large text. Re-pointing the assertion at
        // the real invariant is not the same as loosening it to match the code — the
        // "written out in Now.astro" regression still fails here, because a hand-rolled
        // heading would not carry Card's class string.
        const headings = [...doc.querySelectorAll("[data-card] h2")];
        expect(headings.length, "expected a heading on every titled card").toBe(6);
        expect(headings, "the Now card must render a heading").toContain(now!.querySelector("h2"));
        const spellings = new Set(headings.map((h) => h.getAttribute("class")));
        expect(
            [...spellings],
            "every card heading must be rendered by Card, so they all carry one class string; a second spelling means a card is writing its own heading again and will not inherit Card's spacing",
        ).toHaveLength(1);

        // Rot guard: the words the icon replaced must be gone. Leaving them anywhere
        // reads as a half-applied change, and "what's that ?" is exactly the string a
        // future edit would paste back beside the icon.
        //
        // Over the RAW HTML, not over body.textContent — which is what it read first, and
        // `title="what's that ?"` walked straight past it while sitting in the shipped
        // markup. A guard whose message says "anywhere in the page" has to look at the page.
        expect(html, 'the explainer\'s old visible wording must not survive anywhere in the page, including in an attribute').not.toContain("what's that");
    });

    it("renders the footer", () => {
        expect(text).toContain(FOOTER.prefix);
        expect(text).toContain(FOOTER.suffix.replace(/^, /, ""));
    });

    it("renders one card per goal, with its figures", () => {
        for (const goal of GOALS) {
            expect(text).toContain(`My ${goal.goal_name} goal this year`);
            // Composed phrases, not bare numbers: "1000" alone also appears in
            // ABOUT_ME prose, so a bare containment cannot fail for the card.
            //
            // The card prints its fraction as a hero pair now — "2279.7 / 5000 km" — where
            // it used to print "2279.7 km of 5000 km". This is the gate on the card's
            // central figure, so it moved with the copy rather than being loosened: both
            // numbers and the unit must still be on the page, in that order, in one run.
            expect(text).toContain(`${goal.current_progress} / ${goal.total_goal} ${goal.measurable_unit}`);
        }
    });

    /**
     * THE HERO IS aria-hidden AND THE METER SAYS IT INSTEAD, which is only safe while the
     * meter is actually there saying it. "2279.7 / 5000 km" announces a slash and repeats
     * what the progress bar beside it already carries in words, so the visual figure is
     * taken out of the accessibility tree — but that is a pairing, not a property of the
     * paragraph, and nothing else in this suite would notice if the other half left.
     *
     * So: hide the figure only while an element in the same card carries the same two
     * numbers in an accessible name. Delete the bar, drop its `aria-valuetext`, or reword
     * it out of agreement with the visible copy, and this goes red.
     */
    it("never hides the card's figure without an accessible equivalent beside it", () => {
        const heroes = [...doc.querySelectorAll(".goal-figure")];
        expect(heroes.length, "every goal card must print its figure").toBe(GOALS.length);

        for (const hero of heroes) {
            if (hero.getAttribute("aria-hidden") !== "true") continue;
            const card = hero.closest("[data-card]");
            const meter = card?.querySelector('[role="progressbar"]');
            expect(meter, "the hero is hidden, so the card must carry a meter to announce it").toBeTruthy();

            // AND THE METER MUST BE IN THE ACCESSIBILITY TREE. Asserting only that a
            // `[role=progressbar]` element EXISTS lets both halves be hidden at once — put
            // `aria-hidden` on the bar and the card announces neither its figure nor its meter,
            // with this gate still green. The whole point of the pairing is that exactly one of
            // them is hidden.
            for (let el: Element | null = meter!; el && el !== card; el = el.parentElement) {
                expect(
                    el.getAttribute("aria-hidden"),
                    "the meter (or an ancestor inside the card) is aria-hidden while the hero is too, "
                    + "so the card's central figure is announced by nothing at all",
                ).not.toBe("true");
            }

            const spoken = meter!.getAttribute("aria-valuetext") ?? "";
            const digits = (hero.textContent ?? "").match(/[\d.]+/g) ?? [];
            expect(digits.length, "the hero must print two figures").toBe(2);
            for (const d of digits) {
                expect(spoken, `the hero shows ${d} but the meter announces "${spoken}"`).toContain(d);
            }
        }
    });

    /**
     * THE COUNTDOWN AND THE WAY OUT ARE TWO ELEMENTS NOW. The card used to carry one
     * bordered chip that reported the countdown AND navigated; the countdown is an
     * ordinary line of the card's figures column, and this is the control.
     *
     * The visible label IS the accessible name — there is no sr-only completion left to
     * check — so what this asserts is that the words name the sport whose wall they open,
     * and that they are the same words that page is headed with. That agreement is the
     * defect being guarded: the previous pairing said "events" on the control and
     * "Cycling patches" at the destination, so the vocabulary broke at the click.
     */
    it("gives every goal card a control leading to its own sport's events", () => {
        for (const goal of GOALS) {
            const control = [...doc.querySelectorAll(".events-link")]
                .find((a) => a.getAttribute("href") === `/patches/${goal.sport}`);
            expect(control, `${goal.goal_name} must offer a way to its events`).toBeTruthy();

            const name = (control!.textContent ?? "").replace(/\s+/g, " ").trim();
            expect(name, "the control must name where it goes").toContain(goal.goal_name.toLowerCase());
            expect(name, "no aria-label: the announced name is the visible label")
                .toBe(NEXT_RACE.control.replace("{sport}", goal.goal_name.toLowerCase()));
            expect(control!.getAttribute("aria-label"), "an aria-label would REPLACE the visible words, not extend them")
                .toBeNull();

            // That the DESTINATION is headed with these same words is asserted where the
            // built pages can be read — see tests/build-output.test.ts. Here there is only
            // the home page.
        }
        expect([...doc.querySelectorAll(".events-link")].length, "one control per goal, no more")
            .toBe(GOALS.length);
    });

    /**
     * The countdown is a FIGURE now, not a control, so it must not be inside the link and
     * must not be a link of its own. Splitting them is the whole design change; a future
     * tidy-up that wraps the line back into the anchor would restore the element that was
     * doing two jobs, with every other assertion here still green.
     *
     * Asserted against the same derivation the card used rather than against a phrase
     * written here: which race is next is a function of the bot's stamp, and a literal
     * would be a bot-triggered failed deploy the morning after any race.
     */
    it("prints the countdown as a figure, outside the control", () => {
        for (const goal of GOALS) {
            const line = nextRaceLine(nextRace(goal.sport), patchesEarned(goal.sport));
            expect(text, `${goal.goal_name} must print its countdown`).toContain(line);
        }
        for (const control of [...doc.querySelectorAll(".events-link")]) {
            const said = (control.textContent ?? "").replace(/\s+/g, " ").trim();
            expect(said, "the countdown must not be inside the control").not.toMatch(/next race|patch|booked/i);
            expect(control.querySelector("a"), "and the control holds no nested link").toBeNull();
        }
    });

    /**
     * Every branch of the countdown, asked of the component instead of the calendar.
     * Reading these off the built page would make the coverage depend on where in the
     * year the build happens — "under way" is true for nine days of it.
     */
    it("words the countdown for every state a year passes through", () => {
        const race = (daysAway: number, underWay = false) =>
            ({event: {date: "2026-06-01", name: "Fixture", km: 10, sport: "cycling" as const, country: "Nowhere"}, daysAway, underWay});

        expect(nextRaceLine(race(0), 0)).toBe("Next race is today");
        expect(nextRaceLine(race(1), 0)).toBe("Next race is tomorrow");
        expect(nextRaceLine(race(5), 0)).toBe("Next race in 5 days");
        expect(nextRaceLine(race(-3, true), 2), "under way outranks the day count").toBe("Race under way now");
        expect(nextRaceLine(null, 0)).toBe("No races booked");
        expect(nextRaceLine(null, 1), "not \"1 patches\"").toBe("1 patch earned");
        expect(nextRaceLine(null, 4)).toBe("4 patches earned");

        // THE FORTNIGHT BOUNDARY, pinned from both sides. 13 days is the last day count and
        // 14 is the first week count, which is what keeps the ladder from ever printing
        // "in 1 week" — a rung that reads worse than the nine days it would replace, and
        // the reason there is no singular string to print it with.
        expect(nextRaceLine(race(13), 0), "the last day count").toBe("Next race in 13 days");
        expect(nextRaceLine(race(14), 0), "the first week count, and never \"1 week\"").toBe("Next race in 2 weeks");

        // FLOORED, NOT ROUNDED, and the direction is the point: 61 days is 8w 5d, so
        // "in 8 weeks" says the race arrives sooner than it does and "in 9 weeks" would
        // promise a week of preparation that does not exist. Of the two ways to be wrong
        // by up to six days, this is the one that leaves the reader early.
        expect(nextRaceLine(race(61), 0), "8w 5d floors to 8, it does not round to 9").toBe("Next race in 8 weeks");
        expect(nextRaceLine(race(20), 0), "2w 6d floors to 2").toBe("Next race in 2 weeks");
        expect(nextRaceLine(race(21), 0)).toBe("Next race in 3 weeks");

        // No branch may leak a placeholder or count backwards, whatever the copy becomes.
        const every = [race(0), race(1), race(5), race(13), race(14), race(37), race(-9, true), null];
        for (const n of every) {
            for (const earned of [0, 1, 4]) {
                const line = nextRaceLine(n, earned);
                expect(line, "a line the card would print blank").not.toBe("");
                expect(line, `"${line}" leaks a placeholder`).not.toMatch(/\{[a-z]+}/);
                expect(line, `"${line}" counts backwards`).not.toMatch(/-\d/);
            }
        }
    });

    /**
     * THIS REPLACES A BORDER-CONTRAST ASSERTION, and the replacement is not a relaxation.
     *
     * The chip identified itself as a control with a hairline border, which is a COLOUR,
     * so SC 1.4.11 held it to 3:1 against the card — and the test that enforced it had to
     * composite `color-mix(… var(--text) N%, transparent)` by hand, because the authored
     * value reads as 18:1 before the alpha touches it. It caught two real failures: 32%
     * composites to 2.13:1 in light and 2.81:1 in dark, 40% to 2.68:1 in light.
     *
     * The box is gone, so that obligation is gone with it — but the underlying question
     * is not "is the border dark enough", it is "what tells a reader this is a control,
     * other than colour". SC 1.4.1 is the one that never lapses, and the answer has to
     * survive a phone, where there is no hover to reveal anything. So the chevron is now
     * load-bearing rather than decorative, and this asserts it is there, that it is a
     * shape rather than a word, and that no rule has quietly put a border back without
     * the ratio check that a border needs.
     */
    it("identifies the control by a shape, not by colour alone", () => {
        const controls = [...doc.querySelectorAll(".events-link")];
        expect(controls.length, "no controls found — this assertion would be vacuous").toBe(GOALS.length);

        for (const control of controls) {
            const glyph = control.querySelector(`span[class~="${iconClass(NEXT_RACE.icon)}"]`);
            expect(glyph, "the control must ship its chevron").toBeTruthy();
            expect(glyph?.getAttribute("aria-hidden"), "and the shape is decorative; the label carries the meaning")
                .toBe("true");

            // THE GLYPH WAS NEVER ENOUGH, WHICH IS WHY THIS CLAUSE EXISTS. The old version of
            // this test called the glyph "the only cue there is" and passed on a build where two
            // reviewers did not know the control could be clicked. Measured at 1024x600 on that
            // build: the control and the figure line above it were both rgb(250,250,250) at 12px
            // — a contrast ratio of 1.00:1 between a link and a sentence — with a 13px glyph the
            // whole of the difference.
            //
            // THE IDIOM IT MUST WEAR IS `control-cta` NOW, NOT `text-link`, and the clause is
            // kept rather than relaxed because the defect it names is unchanged: the control
            // must be drawn as something other than the sentence beside it. What changed is
            // which of the site's two answers it uses. `text-link` underlines a run of words;
            // `control-cta` gives it the accent border, the offset plate and the press, which
            // is a strictly larger delta from a line of prose than an underline is — a phone
            // reader sees a box where before they saw one underlined line among three.
            //
            // Asserted on the ELEMENT, so moving the treatment into a different shortcut stays
            // a deliberate edit rather than a silent loss. The DRAWING behind the name is
            // asserted in tests/control-geometry.test.ts, which discovers this class from the
            // plate-and-border signature in the sheet and would not find it if the surface
            // were emptied out under it.
            expect(control.classList.contains("control-cta"),
                "the control must wear the site's styled-control idiom — a glyph alone did not tell "
                + "two readers this was a link, and on a phone there is no hover to help")
                .toBe(true);
        }

        // A DRAWN EDGE IS BACK, SO THIS GATE ASKS THE QUESTION IT WAS ALWAYS REALLY ASKING.
        //
        // It used to forbid `border`, `border-color`, `border-width` and `outline` outright,
        // on the stated grounds that "the box is gone, so the assertion that used to police
        // SC 1.4.11 lives only in this file's history — if one returns, restore that too."
        // One has returned, deliberately: the control is a plated box again. So this is that
        // restoration rather than a relaxation, and it is stricter in the way that matters —
        // a forbidden property can be reintroduced by any rule with any colour in it, where
        // this pins the colour.
        //
        // `--accent` IS THE ONLY EDGE COLOUR ALLOWED, and the reason is that it is the only
        // one whose contrast is measured anywhere: build-output.test.ts holds it at 3:1
        // against the surface it sits on, in BOTH themes, which is exactly the SC 1.4.11
        // obligation a drawn edge carries. A literal hex, a second token, or `currentColor`
        // would all draw an edge no test has ever composited — which is the defect, not the
        // border. `transparent`, `0` and `none` are edges that are not drawn and pass.
        //
        // The focus outline is held to the same rule and for a second reason: SC 2.4.11 makes
        // a focus indicator's own contrast normative, and it is drawn against the card rather
        // than against the control, so it needs a measured colour at least as much as the
        // border does.
        //
        // WIDENED TO THE ELEMENT'S WHOLE CLASS LIST. Scoping this to `.events-link` rules alone
        // was safe only while the control's treatment lived entirely under that class; it does
        // not any more, so an edge added to the SHARED shortcut would land on both goal-card
        // controls with this guard still green.
        const guarded = /\.(events-link|control-cta|text-link)\b/;
        const rules = parseRules(pageCss()).filter((r) => r.selectors.some((s) => guarded.test(s)));
        expect(rules.length, "no rules for any of those classes — this assertion would be vacuous").toBeGreaterThan(0);
        const UNDRAWN = /^(0|none|transparent)$/;
        const MEASURED = /var\(\s*--accent\s*\)/;
        let drawnEdges = 0;
        for (const rule of rules) {
            for (const prop of ["border", "border-color", "border-width", "outline", "outline-color"] as const) {
                const value = decl(rule.body, prop);
                if (value === undefined || UNDRAWN.test(value.trim())) continue;
                // A width alone draws nothing without a colour, and UnoCSS emits the two as
                // separate longhands — so `border-width` is only counted as an edge when the
                // same rule names a colour for it.
                if (prop === "border-width" && decl(rule.body, "border-color") === undefined) continue;
                if (prop === "border-width") continue;
                drawnEdges += 1;
                expect(
                    value,
                    `${rule.selectors.join(",")} declares ${prop}: ${value} — a drawn edge on a control is an `
                    + "identifying mark under SC 1.4.11 (and a focus indicator under SC 2.4.11), so it must be "
                    + "painted with var(--accent), the one edge colour this suite composites and holds at 3:1",
                ).toMatch(MEASURED);
            }
        }
        expect(
            drawnEdges,
            "no drawn edge found on the control at all — the border and the focus outline are both "
            + "gone, and this assertion has nothing left to police",
        ).toBeGreaterThan(0);

        // AND THE DECORATION MUST ACTUALLY SHIP. The class on the element proves intent; this
        // proves the rule exists, which is a different claim — `underline` is blocklisted in
        // uno.config.ts (as an English word — the idiom is explained in prose all over `src/`), and
        // an over-broad block would silently empty the shortcut with every class check green.
        //
        // BOTH SPELLINGS, because which one ships is a minifier decision rather than an authored
        // one: a `text-decoration` shorthand and a `text-decoration-line` longhand are the same
        // declaration, and a gate that knew only one would go red on correct CSS.
        //
        // AND IT MUST BE UNCONDITIONAL. The first version of this probe accepted any matching
        // rule, so a `:hover` decoration satisfied it — which is exactly the affordance this
        // change exists to replace, since neither reader who reported the defect had a pointer.
        //
        // THE STATE TEST IS SHARED AND STRUCTURAL. It was a local list of pseudo-classes, and
        // a held-press state spelled `[data-leaving]` walked straight through it: the shipped
        // rule is `.control-cta[data-leaving],.control[data-leaving],.control:active,
        // .control-cta:active`, so two of its four selectors carry no pseudo-class, `.every()`
        // is false, and the whole rule read as UNCONDITIONAL here. Measured: moving
        // `text-decoration-line` out of `.text-link` into that rule left this assertion green.
        // `isStateful` asks whether everything in the selector is structure, which no future
        // state can outrun. See tests/helpers/css.ts.
        const decorated = rules.some((r) => {
            if (r.selectors.every((sel) => isStateful(sel))) return false;
            const v = decl(r.body, "text-decoration-line") ?? decl(r.body, "text-decoration");
            return v !== undefined && /underline/i.test(v);
        });
        expect(decorated,
            "no rule gives the control a text decoration — the blocklist entry for `underline` in "
            + "uno.config.ts can empty the shortcut without breaking any class assertion, and the "
            + "control then goes back to being drawn exactly like the sentence above it")
            .toBe(true);
    });

    /**
     * FORCED COLOURS DELETE THE CHEVRON UNLESS SOMETHING OPTS IT OUT, and the chevron is the
     * control's only non-colour cue — so without this the control is identified by colour
     * alone, which is exactly what SC 1.4.1 forbids and exactly what NEXT_RACE.icon's comment
     * claims the glyph prevents.
     *
     * The mechanism is presetIcons': an icon class paints its artwork as a mask over
     * `background-color: currentColor`, and `background-color` is a forced property. Measured
     * on the built page with the mode emulated, before the fix: glyph `rgb(255,255,255)` on a
     * card of `rgb(255,255,255)` — a ratio of exactly 1. The old bordered chip survived because
     * its BOX did; this control has no box, so it is a regression rather than an inherited gap.
     *
     * Asserted against the shipped stylesheet rather than in a browser because the suite has no
     * browser — and this is the half that can rot silently. `parseRules` keeps at-rule context,
     * which is the whole reason the guard can tell a forced-colours rule from an ordinary one.
     */
    it("keeps the control's chevron painted when forced colours override background-color", () => {
        // MATCHED ON THE CONTROL PLUS A DESCENDANT, not on a class of the glyph's own.
        // The glyph carried `.events-link-go` while this was a text link; the icon-span
        // allowlist in tests/control-geometry.test.ts admits a control's icon exactly its
        // `i-` utility and `shrink-0`, so a class existing only to be styled is no longer
        // available and the rule reaches the span structurally. Written as "a rule under
        // forced-colors whose selector names the control AND goes on to select something
        // inside it", which is what the old pattern was really asserting.
        const forced = parseRules(pageCss()).filter(
            (r) => (r.at ?? "").includes("forced-colors")
                && r.selectors.some((sel) => /\.events-link\b[^,]*\s+\S/.test(sel)),
        );
        expect(
            forced.length,
            "no forced-colors rule targets the chevron — an icon mask paints via background-color, "
            + "which the mode overrides, so the glyph vanishes and the control is left identified "
            + "by colour alone",
        ).toBeGreaterThan(0);

        const adjust = forced.map((r) => decl(r.body, "forced-color-adjust")).find((v) => v !== undefined);
        expect(adjust, "the glyph must opt out of the override with forced-color-adjust: none").toBe("none");

        const paint = forced.map((r) => decl(r.body, "background-color") ?? decl(r.body, "background")).find((v) => v !== undefined);
        // Case-INSENSITIVE, and that is not defensive: the minifier lowercases system colour
        // keywords, so the sheet ships `linktext` however it was authored. A case-sensitive
        // match here fails on correct CSS — which is how this assertion first went red.
        expect(paint, "and it must name what it paints instead — a system colour, since tokens are discarded")
            .toMatch(/linktext|canvastext|highlight/i);
    });

    /**
     * The control is 24px on purpose and the number is font-relative, so the card can clip
     * it if either becomes absolute. This is the CSS half of that; the geometry half is a
     * browser sweep in the PR, since the suite has no layout engine.
     */
    /**
     * THE CONTROL'S LABEL MUST BE ALLOWED TO BREAK, and this is the one assertion standing
     * between the reader's text size and clipped ink.
     *
     * The control is a box of chrome — horizontal padding, a gap and a 1em mark — around words
     * that come from data. As the root font-size rises the card gets NARROWER (its padding is
     * font-relative too) while the words get wider, and at a 32px root the space left for the
     * label is smaller than the word "running". A flex item cannot go below its min-content
     * width, so without this the label is laid out at a whole word and overflows into a card
     * that clips. Measured at 1024x797, ink lost past the card's right edge across root sizes
     * 16/20/24/28/32/36/40: `0 0 0 0 0 12.7 42.2` px without it, `0` everywhere with it, and
     * `0` everywhere for the run of words this control replaced — so it is a REGRESSION the
     * declaration prevents rather than a limit it improves on.
     *
     * IT TAKES TWO DECLARATIONS AND THE FIRST IS THE ONE THAT IS EASY TO LOSE. A bare text node
     * inside a flex container becomes an ANONYMOUS flex item, whose `min-width: auto` resolves
     * to a whole word and which no selector can reach. So the label is wrapped in an element
     * for one reason: to be given `min-width: 0`. Without it `overflow-wrap` alone does not
     * help, because the item is never offered a width narrower than a word in the first place —
     * measured: the same `0 0 0 0 0 12.7 42.2` with `overflow-wrap` present and the wrapper
     * absent.
     *
     * Both are asserted, and the wrapper is asserted as an ELEMENT rather than as a rule,
     * because deleting the `<span>` and leaving the CSS behind is the edit that looks harmless.
     *
     * There is no layout engine here, so this cannot measure the clipping — it asserts the two
     * declarations that prevent it, which is the half that can rot silently in a stylesheet.
     */
    it("lets the control's label break rather than clip when the reader enlarges their text", () => {
        for (const control of doc.querySelectorAll(".events-link")) {
            const label = control.querySelector(".events-link-label");
            expect(
                label?.textContent?.trim(),
                "the label must sit in its own element — a bare text node is an anonymous flex item, "
                + "whose min-width resolves to a whole word and which no rule can reach",
            ).toBeTruthy();
        }

        const rules = parseRules(pageCss())
            .filter((r) => r.selectors.some((s) => /\.(events-link|events-link-label|control-cta)\b/.test(s)));
        expect(rules.length, "no control rules — this assertion would be vacuous").toBeGreaterThan(0);

        expect(
            rules.some((r) => (decl(r.body, "min-width") ?? "").trim() === "0"),
            "the label element must declare min-width: 0. Without it a flex item is never offered a width "
            + "narrower than its longest word, and at a 32px root that word is wider than the space the "
            + "card leaves — so the label spills into a card that clips it",
        ).toBe(true);

        const breaks = rules.map((r) => decl(r.body, "overflow-wrap") ?? decl(r.body, "word-break")).filter(Boolean);
        expect(
            breaks.some((v) => /\b(break-word|anywhere)\b/.test(v!)),
            `the label is broken with "${breaks.join(", ") || "nothing"}" — a word that still does not fit `
            + "the narrowed item has to be allowed to break, or it overflows the element that was just "
            + "narrowed to make room for it",
        ).toBe(true);

        // AND ONCE IT BREAKS, ITS LINES MUST BE CENTRED TOO — the third declaration in the same
        // rule, and the one whose absence nothing could see.
        //
        // The shortcut centres the control's two FLEX ITEMS. This span is not a box that shrinks
        // to its words: it is the control's whole content width, so its text starts at the
        // leading rail unless told otherwise. While the label is one line that is invisible;
        // the moment it wraps, the control draws flush-left lines under a centred mark, which is
        // the one arrangement that reads as neither centred nor packed.
        //
        // Measured across six viewports x seven root sizes: the label wraps in 15 of 42 per-card
        // cells, and in every one the worst line's centre sat 24.4-61.1px off the control's
        // centre while the mark sat at 0.00. A review panel found this; it is invisible at every
        // default configuration and only appears under the text enlargement SC 1.4.4 requires,
        // which is exactly why it needs an assertion rather than an eye.
        const centred = rules.map((r) => decl(r.body, "text-align")).filter(Boolean);
        expect(
            centred.some((v) => v!.trim() === "center"),
            `the control's label declares text-align "${centred.join(", ") || "nothing"}". The shortcut `
            + "centres the flex items, not the text inside one of them, and this span is the control's "
            + "full content width — so without this a wrapped label draws flush-left lines beneath a "
            + "centred mark",
        ).toBe(true);
    });

    it("sizes the control in the reader's own text, never in device pixels", () => {
        // READ EVERY CLASS THE ELEMENT WEARS, not just `.events-link`. The four properties this
        // guards used to be declared under that one class; the box moved into the shared
        // `control-cta` shortcut and this filter did not follow it, which left the assertion
        // scanning rules that no longer declare any of them — green, and blind. A reviewer
        // demonstrated it rather than argued it: `text-xs` -> `text-[12px]` in the shortcut
        // gives the label a device-pixel font-size that ignores the reader's browser setting,
        // which is precisely the SC 1.4.4 failure this test is named for, and the suite stayed
        // green. Nothing else covered it either — control-geometry's font-relative loop reads
        // only the width and height axes, and its font-size comparison is icon-controls-only.
        const scoped = /\.(events-link|events-link-label|control-cta)\b/;
        const rules = parseRules(pageCss()).filter((r) => r.selectors.some((s) => scoped.test(s)));
        expect(rules.length, "no control rules found — this assertion would be vacuous").toBeGreaterThan(0);

        // AND THE SCOPE MUST STILL REACH THE PROPERTIES. The hole above was not an empty rule
        // set — it was a non-empty set that happened to declare none of the four. So require
        // that at least one in-scope rule declares at least one of them: the day the box moves
        // again, this goes red instead of quietly certifying nothing.
        const GUARDED = ["height", "min-height", "max-height", "font-size"] as const;
        expect(
            rules.some((r) => GUARDED.some((p) => decl(r.body, p) !== undefined)),
            `no rule reaching the control declares any of ${GUARDED.join(", ")} — the box has moved out `
            + "from under this assertion again and it is certifying nothing",
        ).toBe(true);

        for (const rule of rules) {
            for (const prop of GUARDED) {
                const value = decl(rule.body, prop);
                if (value === undefined) continue;
                expect(value, `${rule.selectors.join(",")} { ${prop}: ${value} } must be text-relative`)
                    .not.toMatch(/\d\s*(px|pt|pc|in|cm|mm|q)\b/i);
            }
            expect(decl(rule.body, "height"), "a fixed height in a clipping card deletes text")
                .toBeUndefined();
        }

        // AND ITS BOX MUST BE ITS WORDS. The control is a flex ITEM of the card's figures
        // column, and a column stretches its items across the cross axis by default, so
        // `inline-flex` on the anchor does not shrink-wrap it — the parent decides. Shipped
        // without this it measured 182px wide at 1024 for 115px of ink, and 67px of empty
        // card navigated when clicked. Nothing else in this suite can see that: the box is
        // not text, so no ink assertion moves, and there is no layout engine here to catch
        // it either. This is the CSS half; the geometry half is in the PR.
        //
        // ASSERT THE VALUE, NOT THE PRESENCE. `align-self: stretch` is a declaration too, and it
        // is the DEFAULT — so a presence check passes on the exact edit it exists to forbid, and
        // the 182px click target comes straight back with the suite green. Only the values that
        // actually shrink-wrap the item count.
        //
        // THE DEFECT IS A TARGET A READER CANNOT SEE THE EDGES OF, WHICH IS NOT THE SAME AS A
        // WIDE ONE — and the difference is the whole of why this assertion is now a disjunction
        // rather than a single clause. What made 67px of blank card a defect was that nothing
        // on screen said the card was where the link ended: the reader aimed at words and the
        // box quietly extended past them. Shrink-wrapping was one fix for that. Drawing the box
        // is the other, and it is the one this control now uses — a full-width, bordered,
        // plated 48px bar whose edges are exactly where they appear to be. It is the same
        // argument the bib makes (`.bib--linked` in Patch.astro): the whole object is the
        // anchor, and a reader can tell because it looks like one.
        //
        // SO THE ESCAPE HATCH IS NARROW ON PURPOSE. A stretched box qualifies only if the
        // control's OWN rules draw a border, unconditionally — a `:hover` border is a
        // signifier only for a reader who has a pointer, which is the precise defect the
        // link-signifier gate in build-output.test.ts was written for after one accepted a
        // hover rule as proof. Delete the border and this goes red rather than silently
        // permitting the invisible 182px target again.
        const SHRINK_WRAPS = ["start", "flex-start", "self-start", "baseline", "end", "flex-end", "center"];
        const shrinkWraps = rules.some((r) => {
            const align = decl(r.body, "align-self");
            return (align !== undefined && SHRINK_WRAPS.includes(align.trim()))
                || decl(r.body, "width") === "max-content"
                || decl(r.body, "width") === "fit-content";
        });
        //
        // READ FROM THE ELEMENT'S WHOLE CLASS LIST, not from `rules` above. `rules` is scoped
        // to `.events-link`, and the border lives in the shared `control-cta` shortcut — so a
        // check against `rules` would report "no border" on a control that visibly has one,
        // which is how this assertion first went red on correct code.
        // Shared, structural statefulness — same reason as the sibling walk above: the
        // held-press rule merges `[data-leaving]` selectors into the same rule as `:active`,
        // which flipped this `.every()` to false and made the rule read as permanent.
        const drawnRules = parseRules(pageCss())
            .filter((r) => r.selectors.some((s) => /\.(events-link|control-cta)\b/.test(s)));
        const boxIsDrawn = drawnRules.some((r) => {
            if (r.selectors.every((sel) => isStateful(sel))) return false;
            if (r.at) return false;
            const border = decl(r.body, "border-width") ?? decl(r.body, "border") ?? decl(r.body, "border-color");
            return border !== undefined && !/^(0|none)$/.test(border.trim());
        });
        expect(
            shrinkWraps || boxIsDrawn,
            "the control's clickable box must either shrink-wrap to its words, or be DRAWN so a reader "
            + "can see where it ends. Neither holds: no shrink-wrapping value, and no unconditional "
            + "border on the control's own rules. `align-self: stretch` is the default and does not "
            + "count, and a :hover border is not a border a phone reader ever sees",
        ).toBe(true);

        // AND THE SHARED IDIOM MUST SHRINK-WRAP TOO, which the assertion above cannot see.
        //
        // It reads `.events-link` rules, and this control keeps its own `align-self` in its scoped
        // sheet — so the shortcut could lose the property entirely and every clause above would
        // still pass. That is not hypothetical: the role cards' company link is a flex item of a
        // column with no cross-axis control of its own, and before `self-start` was folded into
        // `text-link` it presented 182px of navigating card for 45px of ink. A review panel found
        // it by hand because nothing here was looking, and the mutation that removes `self-start`
        // from the shortcut survived a full green run — twice.
        //
        // Asserted on the SHORTCUT's own rule, since that is what every future wearer inherits.
        const shared = parseRules(pageCss()).filter((r) => r.selectors.some((sel) => /\.text-link\b/.test(sel)));
        expect(shared.length, "no .text-link rule — this assertion would be vacuous").toBeGreaterThan(0);
        const sharedOptsOut = shared.some((r) => {
            const align = decl(r.body, "align-self");
            return (align !== undefined && SHRINK_WRAPS.includes(align.trim()))
                || decl(r.body, "width") === "max-content"
                || decl(r.body, "width") === "fit-content";
        });
        expect(
            sharedOptsOut,
            "the text-link idiom must shrink-wrap. A treatment that tells a reader this is a link has "
            + "to be honest about WHERE the link is, and a column flex container stretches its items — "
            + "so without this a wearer advertises its words and navigates on blank space",
        ).toBe(true);
    });

    it("renders an accessible progress bar per goal", () => {
        const bars = [...doc.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "one progressbar element per goal").toBe(GOALS.length);
        GOALS.forEach((goal, i) => {
            // Positional, not a lookup by aria-valuenow: the figures are
            // bot-driven and can tie — Strava's YTD totals reset both goals to 0
            // every 1 January — and a value-based find() then returns the first
            // bar for both goals, failing the assertions below on the second.
            const bar = bars[i];
            expect(bar?.getAttribute("aria-valuenow"), `a progressbar must carry aria-valuenow ${goal.current_progress}`).toBe(String(goal.current_progress));
            expect(bar?.getAttribute("aria-valuemin")).toBe("0");
            expect(bar?.getAttribute("aria-valuemax"), "max is in km, not 100, so it must be the goal target").toBe(String(goal.total_goal));
            expect(bar?.getAttribute("aria-valuetext")).toBe(`${goal.current_progress} of ${goal.total_goal} ${goal.measurable_unit}`);
            expect(bar?.getAttribute("aria-label"), "progressbar needs an accessible name").toBeTruthy();
            const percent = Math.max(0, Math.min(100, (goal.current_progress / goal.total_goal) * 100));
            expect(bar?.querySelector(".progress-fill")?.getAttribute("style"), "the fill width must derive from the goal's own figures")
                .toBe(`--progress: ${percent}%`);
        });
    });

    it("renders an anchor for every configured link", () => {
        const hrefs = [...doc.querySelectorAll("a")].map((a) => a.getAttribute("href"));
        for (const {link} of LINKS) expect(hrefs).toContain(link);
    });

    it("renders the portrait with explicit dimensions", () => {
        const img = doc.querySelector("main img");
        expect(img?.getAttribute("width")).toBeTruthy();
        expect(img?.getAttribute("height")).toBeTruthy();
        expect(img?.getAttribute("alt")).toBeTruthy();
    });

    /**
     * `goal_logo` LEFT THIS LIST DELIBERATELY, and the narrowing is the interesting part.
     * The sport's icon used to ride the end of the goal card's progress fill; the bar is
     * a 2px rule now and carries no ink, so neither goal glyph appears on the home page
     * at all. Both are still configured, still safelisted, and still drawn on every bib —
     * tests/patch-wall.test.ts asserts that, which is why removing them here loses no
     * coverage rather than quietly dropping two icons off the site.
     *
     * This file renders the HOME page and can only speak for it. An assertion that keeps
     * naming an icon the page no longer wears is a red build on correct code.
     */
    it("renders an aria-hidden icon for every icon migrated off emoji", () => {
        const migrated = [
            ...CAREER.map(({icon}) => iconClass(icon)),
            iconClass(WELCOME.greeting_icon),
            iconClass(FOOTER.icon),
        ];
        for (const cls of migrated) {
            const el = doc.querySelector(`span[class~="${cls}"]`);
            expect(el, `no element carries the icon class ${cls}`).toBeTruthy();
            expect(el?.getAttribute("aria-hidden"), `${cls} must be decorative`).toBe("true");
        }
    });

    it("renders a decorative icon element for every configured icon", () => {
        const wanted = LINKS.map(({logo}) => iconClass(logo));
        // Count *references*, not distinct classes. This mattered acutely when
        // `fa6-brands:strava` was used once in LINKS plus once per goal CTA, so the
        // references collapsed to fewer classes and asserting per class let
        // querySelector return the first copy while leaving the later elements, the
        // goal CTA icons, unchecked — deleting one outright kept the whole suite
        // green. Every reference is distinct now that those CTAs have gone, so the
        // two countings agree; the reference form is kept because it is the one
        // that stays correct when they do not.
        // Matched on class TOKENS, not on the whole attribute. The earlier
        // exact-string form silently forbade an icon span from carrying any
        // second utility, so giving the icons `shrink-0` — which is what keeps a
        // control from squeezing its icon — read as "every icon element has
        // disappeared" rather than as the one-token change it was.
        const els = [...doc.querySelectorAll("span")]
            .filter((s) => (s.getAttribute("class") ?? "").split(/\s+/).some((token) => wanted.includes(token)));
        expect(els.length, "one icon element per configured icon reference").toBe(wanted.length);
        for (const cls of wanted) {
            expect(doc.querySelector(`span[class~="${cls}"]`), `no element carries the icon class ${cls}`).toBeTruthy();
        }
        for (const el of els) {
            expect(el.getAttribute("aria-hidden"), `${el.getAttribute("class")} must be aria-hidden so the sr-only label remains the accessible name`).toBe("true");
        }
    });
});

describe("no client runtime", () => {
    it("sets data-theme from an inline script in <head>", () => {
        const inline = [...doc.querySelectorAll("script")].filter((s) => !s.getAttribute("src"));
        expect(inline.some((s) => (s.textContent ?? "").includes("dataset.theme"))).toBe(true);
    });

    it("renders no loader overlay", () => {
        expect(doc.querySelector(".loader")).toBeNull();
    });
});

describe("markup defects fixed by plan 004", () => {
    it("styles every bullet list with a class the stylesheet actually defines", () => {
        const lists = [...doc.querySelectorAll("main ul")];
        expect(lists.length, "the about-me and career cards render <ul>s").toBeGreaterThan(0);
        for (const ul of lists) {
            // Token-wise, not substring-wise: "text-sm-1" contains "text-sm".
            const tokens = (ul.getAttribute("class") ?? "").split(/\s+/);
            expect(tokens).toContain("text-sm");
            expect(tokens).not.toContain("text-sm-1");
        }
    });

    it("labels every control from its own content, without an overriding aria-label", () => {
        // Widened from `button` to every control: after the interactive-nesting
        // fix only the theme toggle is a <button>, so a button-scoped query here
        // would silently drop every navigating control from this test's coverage.
        const buttons = [...doc.querySelectorAll("a[href], button")];
        expect(buttons.length, "the page renders icon controls").toBeGreaterThan(0);
        for (const button of buttons) {
            const srOnly = button.querySelector(".sr-only")?.textContent?.trim() ?? "";
            const ownText = button.textContent?.trim() ?? "";
            expect(srOnly || ownText, "every control needs an accessible name").not.toBe("");
            // Stated as a prohibition rather than as "if both are present they must
            // agree". aria-label wins outright over content, so on an element that
            // also carries an sr-only span the two can silently disagree and the
            // span becomes dead markup — which is exactly what happened on the
            // theme toggle, where an aria-label and a span said the same thing until
            // one of them would have been edited alone. Every control on this page
            // is now named by its content, so there is no case to reconcile and the
            // trap is removed instead of asserted around.
            expect(
                button.getAttribute("aria-label"),
                "controls on this page are named by their content; an aria-label would override it and go stale unnoticed",
            ).toBeNull();
        }
    });

    it("never emits a sizes attribute without a srcset to select from", () => {
        for (const img of [...doc.querySelectorAll("img")]) {
            if (img.hasAttribute("sizes")) {
                expect(img.hasAttribute("srcset"), "sizes is inert without srcset").toBe(true);
            }
        }
    });
});

describe("control semantics", () => {
    /**
     * The `a` content model, per the HTML Standard: "Transparent, but there must
     * be no interactive content descendant, `a` element descendant, or descendant
     * with the tabindex attribute specified."
     *
     * This selector covers the cases this site can plausibly grow — a nested
     * anchor, a stray tabindex, a future input or button inside a link — and it
     * walks every anchor on the page, so a partial fix still fails. It is NOT the
     * spec-complete list: the clause bars *any* `a` descendant (not only one with
     * an href) and interactive content includes conditional cases (`img[usemap]`,
     * `video`/`audio` without controls under some conditions) that are not here.
     * Broaden it if one of those ever becomes reachable.
     */
    const INTERACTIVE = "a, button, input, select, textarea, details, embed, iframe, label, audio[controls], video[controls], [tabindex]";

    it("nests no interactive content inside an anchor", () => {
        const offenders = [...doc.querySelectorAll("a")].flatMap((a) =>
            [...a.querySelectorAll(INTERACTIVE)].map(
                (child) => `<a href="${a.getAttribute("href")}"> contains <${child.tagName.toLowerCase()}>`,
            ));
        expect(offenders, "an anchor may not contain interactive content").toEqual([]);
    });

    it("puts the control surface on the navigating element itself", () => {
        // The converse guard: unwrapping the button but leaving the anchor
        // unstyled, or re-nesting a styled child inside it, both fail here.
        //
        // Counts anchors per href and requires EVERY one of them to be styled,
        // rather than deduplicating by URL and asserting `> 0`. That earlier form
        // let one styled social link vouch for both of the goal cards' calls to
        // action, which shared the Strava URL with it, and left them entirely
        // unguarded. Those CTAs have since gone and LINKS holds no duplicate URL,
        // so every count below is currently 1 — the per-href form is kept because
        // it is what stays correct the next time two entries agree.
        const hrefs = LINKS.map(({link}) => link);
        for (const href of new Set(hrefs)) {
            const anchors = [...doc.querySelectorAll(`a[href="${href}"]`)];
            expect(anchors.length, `${href} needs one anchor per source entry`)
                .toBe(hrefs.filter((h) => h === href).length);

            const controls = anchors.filter((a) => (a.getAttribute("class") ?? "").split(/\s+/).includes("control"));
            expect(controls.length, `every ${href} anchor must be a styled control, not a wrapper around one`)
                .toBe(anchors.length);

            for (const control of controls) {
                expect(control.querySelector(".control"), `${href} must not wrap a second styled control`).toBeNull();
            }
        }
    });

    /**
     * The naming mechanism is the whole reason the anchors' `aria-label`s were
     * removed: on one element `aria-label` would override the `sr-only` span that
     * this repo uses to name controls. So the sr-only text is now the sole
     * accessible name, and nothing above asserts what it actually SAYS — a
     * reworded span, or a reinstated aria-label, would change every announced
     * name with the suite still green.
     */
    it("names every control from its sr-only text, matching constants.ts", () => {
        const named = [...doc.querySelectorAll("a.control")].map((a) => ({
            href: a.getAttribute("href"),
            name: a.querySelector(".sr-only")?.textContent?.trim(),
            label: a.getAttribute("aria-label"),
        }));

        expect(named.length, "one styled anchor per social link").toBe(LINKS.length);
        expect(named.every(({label}) => label === null), "an aria-label here would silently override the sr-only name").toBe(true);

        const expected = [
            // Verbatim: the template no longer decorates the name. The old
            // `${name} Profile` was itself the defect — it called a PDF a profile.
            ...LINKS.map(({name}) => name),
        ].sort();
        expect(named.map(({name}) => name).sort(), "announced names must come from constants.ts").toEqual(expected);
    });

    /**
     * Name and destination are a bijection across the page's anchors: two anchors
     * going to one place must announce one name, and two anchors announcing one
     * name must go to one place. Neither half implies the other, which is why both
     * are asserted — grouping by href cannot see a name that has been pointed at a
     * second URL, and grouping by name cannot see a URL that has been given a
     * second name.
     *
     * There was a case on this page: one Strava URL under three anchors, announcing
     * "Strava Profile", "Follow my running on Strava" and "Follow my cycling on
     * Strava". Nothing was broken by that — SC 3.2.4 Consistent Identification is
     * scoped to a *set* of web pages and this site is a single page, and each name
     * did state its own purpose, so 2.4.4 and 2.4.9 were satisfied too. It was the
     * best practice that was missed: Understanding 2.4.4 ("a best practice for
     * links with the same destination to have consistent text"), Understanding
     * 2.4.9 (so the names still make sense in the flat links list a screen reader
     * can pull up), and GOV.UK's editorial rule ("if you have more than one link to
     * the same page, use identical link text or similar link text that conveys the
     * same meaning").
     *
     * That case is gone — two of those three anchors were the goal cards' calls to
     * action and the page keeps one Strava link — so these two now find nothing on
     * the rendered page BY CONSTRUCTION, and each is paired with a fixture that
     * proves it can still find something. The rules are kept rather than deleted
     * because the next anchor added beside an existing one revives both instantly,
     * and because the failure they describe is silent: a visitor gets a control
     * that lies about where it goes and no build notices.
     */
    it("gives anchors that share a destination the same accessible name", () => {
        expect(
            destinationsWithSeveralNames(doc),
            "one destination, one name: a screen reader user pulling up the page's links list sees one entry per anchor, and several names for one URL read as several places",
        ).toEqual([]);
    });

    it("would notice one destination announced under two names", () => {
        const found = destinationsWithSeveralNames(twoAnchors(
            {href: "/same", name: "One name"},
            {href: "/same", name: "Another name"},
        ));
        expect(found, "the checker above must be able to fail").toHaveLength(1);
        expect(found[0]).toContain("/same");
    });

    /**
     * The two fixtures below pin the NAME RESOLUTION the checkers group by, which the
     * fixture above cannot: its anchors are named only by content, so it reads the same
     * under any branch order. A review panel inverted `accessibleName`'s precedence, and
     * separately deleted each branch, with the whole suite green — the page's own anchors
     * never exercise the aria-label branch because none of them carries one.
     *
     * Together they force the accname-1.2 order rather than merely describing it: an
     * aria-label that differs must be visible to the checker, and a naming span that
     * differs *underneath* an agreeing aria-label must not be, because the label wins
     * outright and no screen reader would read the span.
     */
    it("resolves an anchor's name from aria-label ahead of its content", () => {
        const found = destinationsWithSeveralNames(twoAnchors(
            {href: "/same", name: "Agreed", label: "One label"},
            {href: "/same", name: "Agreed", label: "Another label"},
        ));
        expect(found, "a differing aria-label is a differing name").toHaveLength(1);
    });

    it("ignores content when an aria-label overrides it", () => {
        const found = destinationsWithSeveralNames(twoAnchors(
            {href: "/same", name: "One span", label: "Agreed"},
            {href: "/same", name: "Another span", label: "Agreed"},
        ));
        expect(found, "an aria-label wins outright, so the spans underneath cannot diverge the name").toEqual([]);
    });

    it("gives anchors that share an accessible name the same destination", () => {
        expect(
            namesWithSeveralDestinations(doc),
            "one name, one destination: a name pointing at two URLs means the same control announces itself for two different places",
        ).toEqual([]);
    });

    it("would notice one name pointing at two destinations", () => {
        const found = namesWithSeveralDestinations(twoAnchors(
            {href: "/here", name: "Same name"},
            {href: "/there", name: "Same name"},
        ));
        expect(found, "the checker above must be able to fail").toHaveLength(1);
        expect(found[0]).toContain("Same name");
    });

    /**
     * The decision the two rules above no longer exercise, asserted directly: the
     * page reaches Strava from exactly ONE control. Three was the state that made
     * the naming rules bite, and re-adding a second link is a design change worth
     * noticing rather than something to discover from a diff.
     */
    it("links to Strava exactly once", () => {
        // The name is DERIVED from constants.ts, not written here. An earlier version
        // hard-coded "Strava Profile", which made renaming the link in its sanctioned
        // single home red the deploy gate for a content edit that broke nothing — and
        // the failure message claimed the value came from constants.ts when it did not.
        const configured = LINKS.filter(({link}) => link.includes("strava.com"));
        expect(configured, "constants.ts declares exactly one Strava control").toHaveLength(1);

        const rendered = [...doc.querySelectorAll("a[href]")]
            .filter((a) => (a.getAttribute("href") ?? "").includes("strava.com"));
        expect(rendered.map((a) => accessibleName(a)), "one Strava control, named from constants.ts")
            .toEqual(configured.map(({name}) => name));
    });

    it("keeps the theme toggle the page's only button, since it acts rather than navigates", () => {
        const buttons = [...doc.querySelectorAll("button")];
        expect(buttons.map((b) => b.getAttribute("id")), "only the theme toggle performs an in-page action").toEqual(["theme-toggle"]);
        expect(buttons[0].getAttribute("type"), "a bare button would submit a form if one is ever added").toBe("button");
        expect(buttons[0].hasAttribute("href")).toBe(false);
        // The toggle wears the SAME styled-control class as the six anchors.
        // It used to wear a narrower variant of its own, which is what made it
        // the one control that was a different size; this assertion is what stops
        // a second variant being reintroduced for it.
        expect((buttons[0].getAttribute("class") ?? "").split(/\s+/)).toContain("control");
    });

    it("names the theme toggle from constants.ts, with one name for both states", () => {
        const toggle = doc.querySelector("#theme-toggle")!;
        const names = [...toggle.querySelectorAll(".sr-only")].map((s) => s.textContent?.trim());
        // Exactly one, not merely "includes the right one". A second name span is how
        // the changing-name pattern would start to grow back beside the pressed
        // state, which is the combination WAI-ARIA's guidance warns against.
        expect(names, "one state-independent name, from constants.ts").toEqual([THEME_TOGGLE.name]);
    });

    /**
     * The toggle reports which theme is active, and this is the pair of attributes
     * that does it. Both halves of the assertion are failures that shipped:
     * `aria-live="polite"` sat here and could never fire — every descendant that
     * changes on activation is decorative and the one text node never changed — so
     * the button read as announcing while announcing nothing.
     */
    it("reports the theme toggle's state, and agrees with the theme the layout renders", () => {
        const toggle = doc.querySelector("#theme-toggle")!;
        expect(toggle.hasAttribute("aria-live"), "an inert live region misrepresents this button as announcing").toBe(false);

        const pressed = toggle.getAttribute("aria-pressed");
        expect(pressed, "the toggle must report whether the dark theme is on").not.toBeNull();

        // The server can only describe the theme it renders, because the pre-paint
        // script in BasicLayout runs before this button exists and the toggle's own
        // deferred script is what corrects the attribute afterwards. So the two
        // literals have to agree at render time, or the button ships asserting a
        // state the page contradicts — for however long it takes that script to run,
        // and permanently if it is ever removed.
        const rendered = doc.querySelector("html")?.getAttribute("data-theme");
        expect(["light", "dark"], "the layout must render a known theme").toContain(rendered);
        expect(pressed, `data-theme is "${rendered}", so aria-pressed must say so`).toBe(String(rendered === "dark"));
    });
});

describe("footer", () => {
    /**
     * The heart stands in for the word "love" — the span beside it supplies that word
     * for a screen reader — so it is prose, not ornament, and it is toned as ink from
     * its own theme token rather than inheriting the body text colour.
     *
     * Asserted as "a colour utility bound to that token", never as a hex: the hexes
     * live in `BasicLayout.astro` where both themes are defined together, and a copy
     * here would let the two drift with the suite still green.
     *
     * The token has to be on an ANCESTOR of the glyph, not on the glyph. An icon is a
     * mask box whose own rule both paints with the current colour and sets that colour
     * to the inherited one; a colour utility on the same element competes with it at
     * equal specificity, so which one wins is decided by emission order alone. On an
     * ancestor the two cooperate — the glyph inherits, which is what its rule asks to
     * do. This is the second assertion below, and it is the one that would notice the
     * fragile arrangement being reintroduced by someone tidying away the wrapper.
     */
    it("tones the heart from the brand-ink token, inherited rather than contested", () => {
        const heart = doc.querySelector(`span[class~="${iconClass(FOOTER.icon)}"]`);
        expect(heart, "the footer renders the configured heart icon").toBeTruthy();
        expect(heart!.getAttribute("aria-hidden"), "the sr-only word beside it is what gets announced").toBe("true");

        const INK = "text-[var(--brand-ink)]";
        const tokensOf = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
        expect(tokensOf(heart), "a colour utility on the glyph itself is order-dependent").not.toContain(INK);

        // The glyph's OWN PARENT, not "some ancestor". A review panel showed that
        // `ancestors.some(...)` is equally satisfied by the <p>, the card div, <main> or
        // <body> — arrangements in which every character of the footer sentence turns
        // brand red, not just the glyph, with this test green. Requiring the wrapper to
        // paint nothing but the glyph is what makes the sentence's colour safe.
        const inkEl = heart!.parentElement;
        expect(tokensOf(inkEl), "the ink token belongs on the glyph's own wrapper").toContain(INK);

        // Screen-reader-only descendants are exempt: they are never painted, so moving
        // the "love" span inside the wrapper is visually identical and must stay legal.
        const painted = [...inkEl!.childNodes]
            .filter((n) => !(n.nodeType === 1 && (n as Element).classList.contains("sr-only")))
            .map((n) => n.textContent ?? "")
            .join("")
            .trim();
        expect(painted, "the ink wrapper must paint only the glyph, or the whole sentence is re-toned").toBe("");
    });
});

/**
 * THE SILENCE IS A DECISION, so it needs a gate too.
 *
 * Six of this page's outbound links open a new tab and say nothing about it: the
 * intro card's social row. That is deliberate — the context change is conventional for
 * a social row, and six identical suffixes in a row is the noise technique G201's own
 * guidance warns about, making the list harder to scan by voice rather than easier.
 * NEW_TAB_NOTICE in constants.ts carries the reasoning.
 *
 * Without this assertion the obvious "improvement" is to announce it everywhere, which
 * nothing else here would catch: every other test on this page is satisfied by MORE
 * hidden text, not less.
 */
describe("the new-tab warning is on the two links that earn it, and no others", () => {
    it("stays off the intro card's social row", () => {
        const intro = [...doc.querySelectorAll("[data-card]")].find((c) => c.querySelector("h1"));
        expect(intro, "no intro card — the assertion below would be vacuous").toBeTruthy();

        const social = [...intro!.querySelectorAll("a")]
            .filter((a) => a.getAttribute("target") === "_blank");
        expect(
            social.length,
            "the intro card must still hold the outbound social links this asserts silence about",
        ).toBe(LINKS.length);

        for (const a of social) {
            expect(
                a.textContent?.includes(NEW_TAB_NOTICE),
                `${a.getAttribute("href")} announces the new tab; the social row is deliberately silent — see NEW_TAB_NOTICE`,
            ).toBe(false);
        }
    });

    it("is on exactly one link on this page", () => {
        // The home page has one: the Now card's explainer. The bib is on /patches and is
        // asserted at component level in patch-wall.test.ts, where it is date-independent.
        const announcing = [...doc.querySelectorAll("a")]
            .filter((a) => a.textContent?.includes(NEW_TAB_NOTICE));
        expect(
            announcing.map((a) => a.getAttribute("href")),
            "exactly the Now explainer announces a new tab on the home page",
        ).toEqual([NOW.explainer_url]);
    });
});

