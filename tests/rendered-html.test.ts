import {experimental_AstroContainer as AstroContainer} from "astro/container";
import {parseHTML} from "linkedom";
import {beforeAll, describe, expect, it} from "vitest";

import Index from "../src/pages/index.astro";
import {ABOUT_ME, CAREER, FOOTER, GOAL, LINKS, METADATA, WELCOME} from "../src/lib/constants";

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

    it("renders the goal figures", () => {
        expect(text).toContain(String(GOAL.current_progress));
        expect(text).toContain(String(GOAL.total_goal));
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
});
