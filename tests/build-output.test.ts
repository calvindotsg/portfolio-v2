import {readFileSync, readdirSync, existsSync} from "node:fs";
import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import {METADATA} from "../src/lib/constants";

/**
 * Asserts on what `pnpm build` actually emits. A green build is not evidence the
 * site is correct — these checks are what make it evidence.
 */

const read = (p: string) => readFileSync(p, "utf8");

describe("dist/", () => {
    it("emits a robots.txt that points crawlers at the sitemap", () => {
        expect(existsSync("dist/robots.txt")).toBe(true);
        const robots = read("dist/robots.txt");
        expect(robots).toMatch(/User-agent:\s*\*/);
        expect(robots).toContain("Sitemap:");
        expect(robots).toContain(new URL("sitemap-index.xml", METADATA.site_url).href);
    });

    it("emits a sitemap index referencing the deployed origin", () => {
        expect(existsSync("dist/sitemap-index.xml")).toBe(true);
        expect(read("dist/sitemap-index.xml")).toContain(METADATA.site_url);
    });

    it("emits exactly one stylesheet", () => {
        const css = readdirSync("dist/_astro").filter((f) => f.endsWith(".css"));
        expect(css.length).toBe(1);
    });

    it("ships zero external JavaScript files", () => {
        const js = readdirSync("dist/_astro").filter((f) => f.endsWith(".js"));
        expect(js).toEqual([]);
    });

    it("copies the public assets the page links to", () => {
        for (const asset of ["favicon.ico", "preview.jpg", "resume.pdf"]) {
            expect(existsSync(`dist/${asset}`), `dist/${asset} must exist`).toBe(true);
        }
    });
});

/**
 * These assertions only became possible once `output: "static"` replaced the
 * Netlify SSR adapter (plan 002). Before that, `pnpm build` emitted no
 * `dist/index.html` at all — the page lived inside a 2.4 MB serverless function.
 *
 * NOTE: `dist/index.html` starts with a hoisted <script> above <html>, which
 * makes linkedom treat that script as documentElement and leaves document.body
 * empty. Element queries work; whole-document textContent does not. Assert text
 * with plain string `toContain` and elements with `querySelector`.
 */
describe("dist/index.html is prerendered", () => {
    const doc = () => parseHTML(read("dist/index.html")).document;

    it("is emitted by the build", () => {
        expect(existsSync("dist/index.html")).toBe(true);
    });

    it("carries the configured title and description", () => {
        const html = read("dist/index.html");
        expect(html).toContain(`<title>${METADATA.title}</title>`);
        expect(html).toContain(METADATA.description);
    });

    it("self-canonicalises to the configured site URL, not a request URL", () => {
        const href = doc().querySelector('link[rel="canonical"]')?.getAttribute("href");
        expect(href).toBe(METADATA.site_url);
    });

    it("serves the portrait as a build-emitted asset, not a runtime image CDN URL", () => {
        const src = doc().querySelector("main img")?.getAttribute("src") ?? "";
        expect(src).toMatch(/^\/_astro\//);
        expect(src).not.toContain(".netlify");
    });
});

describe("no on-demand rendering output", () => {
    it("emits no Netlify serverless or edge function", () => {
        expect(existsSync(".netlify/v1/functions"), "the SSR adapter is gone; no function may be emitted").toBe(false);
        expect(existsSync(".netlify/v1/edge-functions")).toBe(false);
    });

    it("emits no server bundle inside dist/", () => {
        expect(existsSync("dist/_worker.js")).toBe(false);
        expect(existsSync("dist/server")).toBe(false);
    });
});
