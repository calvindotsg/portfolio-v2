import {experimental_AstroContainer as AstroContainer} from "astro/container";
import {parseHTML} from "linkedom";
import {beforeAll, describe, expect, it} from "vitest";

import Index from "../src/pages/index.astro";
import {ABOUT_ME, CAREER, FOOTER, GOALS, LINKS, METADATA, WELCOME} from "../src/lib/constants";
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
        }
    });

    it("renders the footer", () => {
        expect(text).toContain(FOOTER.footer);
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
        for (const goal of GOALS) {
            const bar = bars.find((b) => b.getAttribute("aria-valuenow") === String(goal.current_progress));
            expect(bar, `a progressbar must carry aria-valuenow ${goal.current_progress}`).toBeTruthy();
            expect(bar?.getAttribute("aria-valuemin")).toBe("0");
            expect(bar?.getAttribute("aria-valuemax"), "max is in km, not 100, so it must be the goal target").toBe(String(goal.total_goal));
            expect(bar?.getAttribute("aria-valuetext")).toBe(`${goal.current_progress} of ${goal.total_goal} ${goal.measurable_unit}`);
            expect(bar?.getAttribute("aria-label"), "progressbar needs an accessible name").toBeTruthy();
            const percent = Math.max(0, Math.min(100, (goal.current_progress / goal.total_goal) * 100));
            expect(bar?.querySelector(".progress-fill")?.getAttribute("style"), "the fill width must derive from the goal's own figures")
                .toBe(`--progress: ${percent}%`);
        }
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

    it("renders a decorative icon element for every configured icon", () => {
        const wanted = [...LINKS.map(({logo}) => iconClass(logo)), ...GOALS.map(({cta_logo}) => iconClass(cta_logo))];
        // Count *references*, not distinct classes. `fa6-brands:strava` is used
        // once in LINKS plus once per goal CTA, so the references collapse to
        // fewer classes. Asserting per class lets querySelector return the first
        // copy and leaves the later elements, the Goal CTA icons, unchecked:
        // deleting one outright kept the whole suite green.
        const els = [...doc.querySelectorAll("span")]
            .filter((s) => wanted.includes(s.getAttribute("class") ?? ""));
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

    it("labels every button from its own content, without an overriding aria-label", () => {
        const buttons = [...doc.querySelectorAll("button")];
        expect(buttons.length, "the page renders icon buttons").toBeGreaterThan(0);
        for (const button of buttons) {
            const srOnly = button.querySelector(".sr-only")?.textContent?.trim() ?? "";
            const ariaLabel = button.getAttribute("aria-label") ?? "";
            expect(ariaLabel || srOnly, "every button needs an accessible name").not.toBe("");
            // aria-label wins outright over content, so it must never replace a
            // *different* sr-only name — that silently downgrades the name
            // ("Github Profile" -> "Github"). Carrying both with identical text is
            // redundant but harmless, and the theme toggle does exactly that.
            if (srOnly && ariaLabel) {
                expect(ariaLabel, "aria-label must not override a different sr-only name").toBe(srOnly);
            }
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
