import {describe, expect, it} from "vitest";

import {ABOUT_ME, CAREER, FOOTER, GOAL, LINKS, METADATA, NOW, WELCOME} from "../src/lib/constants";

/**
 * `src/lib/constants.ts` is the single source of truth for every piece of site
 * content, and nothing else validates it. A typo here reaches production. These
 * assertions encode the invariants the components silently rely on.
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
});

describe("GOAL", () => {
    it("has finite numeric progress values", () => {
        for (const key of ["total_goal", "current_progress", "progress_last_year"] as const) {
            expect(Number.isFinite(GOAL[key]), `GOAL.${key} must be a finite number`).toBe(true);
        }
    });

    it("has a positive target", () => {
        expect(GOAL.total_goal).toBeGreaterThan(0);
    });

    it("keeps progress within [0, total_goal]", () => {
        expect(GOAL.current_progress).toBeGreaterThanOrEqual(0);
        expect(GOAL.current_progress).toBeLessThanOrEqual(GOAL.total_goal);
    });

    it("names an icon from an installed iconify collection", () => {
        expect(ICON_COLLECTIONS).toContain(GOAL.cta_logo.split(":")[0]);
    });

    it("links to an absolute tracking URL", () => {
        expect(GOAL.website_url).toMatch(/^https:\/\//);
    });
});

describe("CAREER", () => {
    it("has at least one entry", () => {
        expect(CAREER.length).toBeGreaterThan(0);
    });

    it("gives every entry a company, dates and at least one bullet", () => {
        for (const job of CAREER) {
            expect(job.company, "company must be set").toBeTruthy();
            expect(job.company_url).toMatch(/^https?:\/\//);
            expect(job.start_date).toBeTruthy();
            expect(job.end_date).toBeTruthy();
            expect(job.description.length).toBeGreaterThan(0);
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

    it("keeps the title and description within useful SEO lengths", () => {
        expect(METADATA.title.length).toBeGreaterThan(10);
        expect(METADATA.description.length).toBeGreaterThan(50);
        expect(METADATA.description.length).toBeLessThanOrEqual(200);
    });

    it("does not expose a plain email address", () => {
        expect(METADATA.email_obfuscated).not.toMatch(/@/);
    });
});

describe("prose blocks", () => {
    it("are non-empty", () => {
        expect(WELCOME.description.length).toBeGreaterThan(0);
        expect(ABOUT_ME.description.length).toBeGreaterThan(0);
        expect(NOW.description.length).toBeGreaterThan(0);
        expect(FOOTER.footer.length).toBeGreaterThan(0);
    });
});
