import {readFileSync, readdirSync, existsSync} from "node:fs";
import {parseHTML} from "linkedom";
import sharp from "sharp";
import {describe, expect, it} from "vitest";

import {CAREER, FOOTER, GOALS, LINKS, METADATA, WELCOME} from "../src/lib/constants";
import {iconClass} from "../src/lib/icons";

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

    /**
     * Plan 011 migrated every emoji to presetIcons mask classes. This is the
     * gate that keeps them out: emoji pictographs must never appear in the
     * shipped page or stylesheet again (llms.txt is maintainer-owned prose and
     * deliberately not scanned). FE0F is the emoji variation selector; the
     * F000-block ranges cover pictographs, transport symbols and skin tones.
     */
    const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

    it("ships no emoji in the page or stylesheet", () => {
        expect(read("dist/index.html")).not.toMatch(EMOJI);
        const sheet = readdirSync("dist/_astro").find((f) => f.endsWith(".css"));
        expect(read(`dist/_astro/${sheet}`)).not.toMatch(EMOJI);
    });

    it("emits a usable CSS rule for every safelisted icon class", () => {
        const sheet = readdirSync("dist/_astro").find((f) => f.endsWith(".css"));
        expect(sheet, "dist/_astro must contain a stylesheet").toBeTruthy();
        const css = read(`dist/_astro/${sheet}`);
        const wanted = new Set([
            ...LINKS.map(({logo}) => iconClass(logo)),
            ...GOALS.map(({cta_logo}) => iconClass(cta_logo)),
            ...GOALS.map(({goal_logo}) => iconClass(goal_logo)),
            ...CAREER.map(({icon}) => iconClass(icon)),
            iconClass(WELCOME.greeting_icon),
            iconClass(FOOTER.icon),
        ]);
        for (const cls of wanted) {
            const rule = css.match(new RegExp(`\\.${cls}\\{([^}]*)\\}`))?.[1];
            expect(rule, `${cls} has no CSS rule — the safelist in uno.config.ts stopped matching`).toBeTruthy();
            expect(rule, `${cls} must be inline-block or it renders at zero size`).toMatch(/display:\s*inline-block/);
            expect(rule, `${cls} must carry a mask image`).toContain("--un-icon:url(");
        }
    });

    /**
     * 3:1 is the bar SC 1.4.11 sets for graphical objects. Strict conformance is
     * arguable here — the icon is aria-hidden and each card also names its sport in
     * the heading — so treat 3:1 as the standard we hold, not as a citation: it is
     * still the only visual cue on the bar itself.
     *
     * The icon is a presetIcons mask painted with `background-color: currentColor`,
     * so whatever `color` reaches the span IS the icon — and with no ink of its own
     * it inherited --text, which is #FAFAFA in dark mode: 1.89:1 on the pink fill.
     *
     * Resolved from the BUILT stylesheet, never from source: a utility UnoCSS
     * fails to generate ships no rule at all, and this has to go red when that
     * happens. It reads no progress value, so the daily Strava commit to
     * src/data/strava-progress.json cannot flip it.
     */
    const expandHex = (hex: string) => {
        // The minifier shortens #111111 to #111 and unquotes [data-theme='dark'].
        const h = hex.replace("#", "");
        return `#${h.length === 3 ? [...h].map((c) => c + c).join("") : h}`;
    };

    const channel = (hex: string, at: number) => {
        const v = parseInt(expandHex(hex).slice(at, at + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };

    const luminance = (hex: string) =>
        0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);

    const contrast = (a: string, b: string) => {
        const x = luminance(a);
        const y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };

    it("paints the goal icon at 3:1 against the progress bar in both themes", () => {
        const sheet = readdirSync("dist/_astro").find((f) => f.endsWith(".css"))!;
        const css = read(`dist/_astro/${sheet}`);

        const themeTokens = (theme: string): Record<string, string> => {
            const block = css.match(new RegExp(`\\[data-theme=['"]?${theme}['"]?\\]\\{([^}]*)\\}`))?.[1];
            expect(block, `the ${theme} theme block must ship its color tokens`).toBeTruthy();
            return Object.fromEntries(
                [...block!.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)].map((m) => [m[1], expandHex(m[2])]),
            );
        };

        /** The hex a class list actually paints for `prop`, per the shipped rules. */
        const paints = (classes: string | null | undefined, prop: string, tokens: Record<string, string>) => {
            for (const token of classes?.split(/\s+/) ?? []) {
                const selector = `.${token.replace(/[^\w-]/g, (c) => `\\${c}`)}{`;
                const at = css.indexOf(selector);
                if (at < 0) continue; // UnoCSS generated nothing for this token.
                const body = css.slice(at + selector.length, css.indexOf("}", at));
                const value = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+?)\\s*(?:;|$)`))?.[1];
                const named = value?.match(/^var\((--[\w-]+)\)/)?.[1];
                // bg-gray-300 ships as rgb(212 212 212 / var(--un-bg-opacity)).
                const rgb = value?.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
                const hex = named
                    ? tokens[named]
                    : rgb
                        ? `#${rgb.slice(1).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`
                        : value?.match(/^#[0-9a-fA-F]{3,6}$/)?.[0];
                // `color: inherit` on the icon rule resolves to nothing and falls through.
                if (hex) return expandHex(hex);
            }
            return undefined;
        };

        const bars = [...parseHTML(read("dist/index.html")).document.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);

        for (const track of bars) {
            const fill = track.querySelector(".progress-fill");
            expect(fill, "each progress bar must render a fill").toBeTruthy();
            for (const theme of ["light", "dark"]) {
                const tokens = themeTokens(theme);
                const trackBg = paints(track.getAttribute("class"), "background-color", tokens);
                const fillBg = paints(fill?.getAttribute("class"), "background-color", tokens);
                // Resolve in CASCADE order: an element's own `color` beats one inherited
                // from its parent, so the span must be consulted BEFORE the fill. Reading
                // the fill first would let an ink utility added to the span reintroduce
                // the exact 1.89:1 defect with this test still green. Falling through both
                // means the icon inherits --text from <body> — the original defect.
                const ink = paints(fill?.querySelector("span")?.getAttribute("class"), "color", tokens)
                    ?? paints(fill?.getAttribute("class"), "color", tokens)
                    ?? tokens["--text"];
                expect(fillBg, `${theme}: the fill must paint a resolvable background`).toBeTruthy();
                expect(trackBg, `${theme}: the track must paint a resolvable background`).toBeTruthy();
                expect(ink, `${theme}: the icon must resolve an ink color`).toBeTruthy();

                expect(
                    contrast(ink!, fillBg!),
                    `${theme}: icon ${ink} on fill ${fillBg} is ${contrast(ink!, fillBg!).toFixed(2)}:1 — SC 1.4.11 needs 3:1`,
                ).toBeGreaterThanOrEqual(3);
                // Defensive, not a live case: the fill's left edge is coincident with the
                // track's, so at low progress the icon is CLIPPED by the track's
                // overflow-hidden rather than spilling onto bare grey. Asserted anyway so a
                // future layout change that does expose the icon there cannot land silently.
                expect(
                    contrast(ink!, trackBg!),
                    `${theme}: icon ${ink} overhanging onto track ${trackBg} is ${contrast(ink!, trackBg!).toFixed(2)}:1`,
                ).toBeGreaterThanOrEqual(3);
            }
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

    it("declares a default theme so no-JS visitors keep the designed colors", () => {
        // Every color token is defined under :root[data-theme=…]; without this
        // attribute a visitor whose JS never runs gets unstyled, transparent cards.
        expect(doc().querySelector("html")?.getAttribute("data-theme")).toBe("light");
    });

    it("emits the social-preview tags unfurls depend on", () => {
        const meta = (sel: string) => doc().querySelector(sel)?.getAttribute("content");
        expect(meta('meta[property="og:title"]')).toBe(METADATA.title);
        expect(meta('meta[property="og:description"]')).toBe(METADATA.description);
        expect(meta('meta[property="og:image"]')).toBe(METADATA.image_url);
        expect(meta('meta[name="twitter:image"]')).toBe(meta('meta[property="og:image"]'));
        expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image");
        // og:url is origin-only BY DESIGN (plan 002) — never assert it against the
        // canonical URL or METADATA.site_url, which carry a trailing slash.
        expect(meta('meta[property="og:url"]')).toBe(new URL(METADATA.site_url).origin);
    });

    it("serves the portrait as a build-emitted asset, not a runtime image CDN URL", () => {
        const src = doc().querySelector("main img")?.getAttribute("src") ?? "";
        expect(src).toMatch(/^\/_astro\//);
        expect(src).not.toContain(".netlify");
    });

    /**
     * The portrait is laid out at 275 CSS px, so a DPR-2 screen needs 550 real
     * pixels or it renders soft — which is what PageSpeed's "Serves images with
     * low resolution" audit flagged in production.
     *
     * This asserts pixels, not markup, because Astro silently *drops* a density
     * that would upscale the source. Raise the layout width past half the
     * source's 1000 px and the srcset disappears with a green build; this test is
     * the only thing that would say so.
     */
    it("offers the portrait at 2x density for high-DPI screens", async () => {
        const img = doc().querySelector("main img");
        const width = Number(img?.getAttribute("width"));
        expect(width, "the portrait must declare a layout width").toBeGreaterThan(0);

        const candidate = (img?.getAttribute("srcset") ?? "").match(/(\S+)\s+2x/)?.[1];
        expect(candidate, "the portrait must offer a 2x srcset candidate").toBeTruthy();

        expect(existsSync(`dist${candidate}`), `dist${candidate} must be emitted`).toBe(true);
        const {width: emitted} = await sharp(`dist${candidate}`).metadata();
        expect(emitted, "the 2x candidate must carry twice the layout pixels").toBe(width * 2);
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

describe("source hygiene", () => {
    /**
     * These class names look like utilities but generate no CSS rule at all —
     * each was verified against the built stylesheet. They are typos, not
     * shortcuts: `text-sm-1` should be `text-sm`. UnoCSS fails silently on them,
     * so this is the only gate that can catch a reintroduction.
     */
    const DEAD_CLASSES = ["text-sm-1", "custom-btn", "transform-y-["];

    it("references no utility class that generates no CSS", () => {
        const files = readdirSync("src", {recursive: true, encoding: "utf8"})
            .filter((f) => /\.(astro|ts|css)$/.test(f))
            .map((f) => `src/${f}`);
        expect(files.length, "src/ must contain source files").toBeGreaterThan(0);
        for (const file of files) {
            const source = read(file);
            for (const dead of DEAD_CLASSES) {
                expect(source, `${file} references the dead class "${dead}"`).not.toContain(dead);
            }
        }
    });

    it("covers every card with an entrance-stagger delay rule", () => {
        // PR #41 added an 8th <main> child while the delay ladder stopped at
        // nth-child(7), so the footer animated on the same frame as the hero.
        // The ladder is hand-written CSS; this is the lockstep check.
        const layout = read("src/layouts/BasicLayout.astro");
        const rungs = [...layout.matchAll(/nth-child\((\d+)\)\s*\{\s*animation-delay/g)].map((m) => Number(m[1]));
        expect(rungs.length, "the entrance cascade must exist").toBeGreaterThan(0);
        const cards = parseHTML(read("dist/index.html")).document.querySelector("main")?.children.length ?? 0;
        expect(cards, "main must render cards").toBeGreaterThan(0);
        expect(Math.max(...rungs), `main renders ${cards} children but the delay ladder stops at nth-child(${Math.max(...rungs)})`).toBeGreaterThanOrEqual(cards);
    });

    it("gives every class token in the shipped HTML a rule in the stylesheet", () => {
        // UnoCSS fails silently on unknown utilities and Astro drops nothing:
        // a dead class ships as markup bytes with no effect. After plan 012
        // every remaining token is load-bearing; this keeps it that way.
        // The stylesheet escapes special chars in selectors (`.md\:pr-8`), so
        // unescape before comparing.
        const html = read("dist/index.html");
        const sheet = readdirSync("dist/_astro").find((f) => f.endsWith(".css"))!;
        const css = read(`dist/_astro/${sheet}`);
        const cssClasses = new Set(
            [...css.matchAll(/\.((?:[\w-]|\\.)+)/g)].map((m) => m[1].replace(/\\(.)/g, "$1")),
        );
        const tokens = new Set(
            [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean)),
        );
        expect(tokens.size, "the page must ship class tokens").toBeGreaterThan(50);
        for (const token of tokens) {
            expect(cssClasses.has(token), `class "${token}" has no rule in the stylesheet`).toBe(true);
        }
    });
});
