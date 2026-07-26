import {describe, expect, it} from "vitest";

import {ABOUT_ME, CAREER, clampToGoal, FOOTER, GOALS, LINKS, METADATA, NOW, THEME_TOGGLE, WELCOME} from "../src/lib/constants";
import stravaProgress from "../src/data/strava-progress.json";
import {kmFromMeters} from "../scripts/fetch-strava-progress.mjs";

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

    it("has a visible progress icon and unit", () => {
        for (const goal of GOALS) {
            expect(goal.goal_logo, `${goal.goal_name} goal_logo`).not.toBe("");
            expect(goal.measurable_unit, `${goal.goal_name} measurable_unit`).not.toBe("");
        }
    });
});

describe("THEME_TOGGLE", () => {
    /**
     * The toggle has no visible text and its icons are decorative, so this string is
     * the whole of what a screen reader gets for it.
     */
    it("is announceable", () => {
        expect(THEME_TOGGLE.name.trim(), "the name is announced verbatim").not.toBe("");
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

    it("converts meters to km rounded to 1 decimal, and rejects garbage", () => {
        expect(kmFromMeters(2246412.3, "ride")).toBe(2246.4);
        expect(kmFromMeters(0, "ride")).toBe(0);
        for (const bad of [undefined, null, NaN, Infinity, -1, "138"]) {
            expect(() => kmFromMeters(bad, "ride"), String(bad)).toThrow();
        }
    });
});
