import {describe, expect, it} from "vitest";

import {ABOUT_ME, CAREER, FOOTER, GOALS, LINKS, METADATA, NOW, WELCOME} from "../src/lib/constants";

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

    it("keeps progress within [0, total_goal]", () => {
        for (const goal of GOALS) {
            expect(goal.current_progress, `${goal.goal_name} current_progress`).toBeGreaterThanOrEqual(0);
            expect(goal.current_progress, `${goal.goal_name} current_progress`).toBeLessThanOrEqual(goal.total_goal);
        }
    });

    it("names an icon from an installed iconify collection", () => {
        for (const goal of GOALS) {
            expect(ICON_COLLECTIONS, `${goal.goal_name} cta_logo`).toContain(goal.cta_logo.split(":")[0]);
            expect(ICON_COLLECTIONS, `${goal.goal_name} goal_logo`).toContain(goal.goal_logo.split(":")[0]);
        }
    });

    it("links to an absolute tracking URL", () => {
        for (const goal of GOALS) {
            expect(goal.website_url, `${goal.goal_name} website_url`).toMatch(/^https:\/\//);
        }
    });

    it("has a visible progress icon and unit", () => {
        for (const goal of GOALS) {
            expect(goal.goal_logo, `${goal.goal_name} goal_logo`).not.toBe("");
            expect(goal.measurable_unit, `${goal.goal_name} measurable_unit`).not.toBe("");
        }
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

    it("keeps the title and description within useful SEO lengths", () => {
        expect(METADATA.title.length).toBeGreaterThan(10);
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

describe("NOW", () => {
    it("is a single string, so a second sentence cannot silently run together", () => {
        expect(typeof NOW.description).toBe("string");
        expect(Array.isArray(NOW.description)).toBe(false);
    });
});
