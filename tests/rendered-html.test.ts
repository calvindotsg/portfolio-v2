import {experimental_AstroContainer as AstroContainer} from "astro/container";
import {parseHTML} from "linkedom";
import {beforeAll, describe, expect, it} from "vitest";

import Index from "../src/pages/index.astro";
import {ABOUT_ME, CAREER, FOOTER, GOALS, LINKS, METADATA, NOW, THEME_TOGGLE, WELCOME} from "../src/lib/constants";
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
 * `aria-label` (step 2C) outranks the element's own content, which is where this
 * repo's `sr-only` naming span lives. The two agree on every anchor of this page
 * today — Chrome's own computation was diffed against this — but writing the
 * inverted order leaves a test that disagrees with a screen reader the moment an
 * aria-label and an sr-only span coexist and differ.
 */
const accessibleName = (a: Element): string =>
    a.getAttribute("aria-label")?.trim()
    || a.querySelector(".sr-only")?.textContent?.trim()
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
const twoAnchors = (a: {href: string, name: string}, b: {href: string, name: string}): Document =>
    parseHTML(
        `<html><body>
            <a href="${a.href}"><span class="sr-only">${a.name}</span></a>
            <a href="${b.href}"><span class="sr-only">${b.name}</span></a>
        </body></html>`,
    ).document as unknown as Document;

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

    it("renders the footer", () => {
        expect(text).toContain(FOOTER.prefix);
        expect(text).toContain(FOOTER.suffix.replace(/^, /, ""));
    });

    it("renders one card per goal, with its figures", () => {
        for (const goal of GOALS) {
            expect(text).toContain(`My ${goal.goal_name} goal this year`);
            // Composed phrases, not bare numbers: "1000" alone also appears in
            // ABOUT_ME prose, so a bare containment cannot fail for the card.
            expect(text).toContain(`${goal.current_progress} ${goal.measurable_unit} of ${goal.total_goal} ${goal.measurable_unit}`);
            if (goal.progress_last_year !== null) {
                expect(text).toContain(`Last year's: ${goal.progress_last_year} ${goal.measurable_unit}`);
            } else {
                // null renders as a visible dash (with an sr-only explanation),
                // never as a literal "null" or an empty figure.
                expect(text).toContain("Last year's: –");
            }
        }
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

    it("renders an aria-hidden icon for every icon migrated off emoji", () => {
        const migrated = [
            ...CAREER.map(({icon}) => iconClass(icon)),
            ...GOALS.map(({goal_logo}) => iconClass(goal_logo)),
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
        // would silently drop 8 of the 9 controls from this test's coverage.
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
        const strava = [...doc.querySelectorAll("a[href]")]
            .filter((a) => (a.getAttribute("href") ?? "").includes("strava.com"));
        expect(strava.map((a) => accessibleName(a)), "one Strava control, named from constants.ts").toEqual(["Strava Profile"]);
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

        const ancestors: Element[] = [];
        for (let el = heart!.parentElement; el; el = el.parentElement) ancestors.push(el);
        expect(
            ancestors.some((el) => tokensOf(el).includes(INK)),
            "some ancestor of the heart must set the brand-ink colour for it to inherit",
        ).toBe(true);
    });
});
