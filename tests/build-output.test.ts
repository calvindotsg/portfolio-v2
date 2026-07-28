import {readFileSync, readdirSync, existsSync} from "node:fs";
import {parseHTML} from "linkedom";
import sharp from "sharp";
import {describe, expect, it} from "vitest";

import {CAREER, FOOTER, GOALS, LINKS, METADATA, WELCOME} from "../src/lib/constants";
import {iconClass} from "../src/lib/icons";
import {pageCss} from "./helpers/css";
import {builtPages, classTokens} from "./helpers/pages";

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

    /**
     * ONE CHUNK FOR THE WHOLE SITE, which is a claim about how much a visitor
     * downloads rather than about tidiness: with four pages sharing one layout, one
     * stylesheet means the second page a reader opens costs no CSS at all.
     *
     * IT SURVIVED THE PATCH WALL — measured, because the handover this route was
     * built from predicted it would not. Adding three routes left the count at one
     * and renamed the chunk (`index.*.css` to `projection.*.css`, after whichever
     * module Vite now treats as the entry). What DID change is that Astro's
     * `inlineStylesheets: "auto"` began inlining a block into every page, where
     * there was none before. That is the reason `pageCss()` exists and the reason
     * this assertion is not the interesting one; see the next test.
     */
    it("emits exactly one stylesheet, so a second page costs no CSS", () => {
        const css = readdirSync("dist/_astro").filter((f) => f.endsWith(".css"));
        expect(css.length).toBe(1);
    });

    /**
     * KEEPS `pageCss()` HONEST, because every other CSS assertion in this suite is
     * only as complete as it is.
     *
     * Astro's default `inlineStylesheets: "auto"` decides at build time how much of
     * a page's CSS ships as a linked chunk and how much is inlined into a `<style>`.
     * That balance is not stable: measured, adding one four-line route moved 2,889
     * bytes — the whole layout block, `body`, and every theme custom property on
     * `:root[data-theme]` — out of the chunk and into the page, and turned 16 tests
     * across four files red with nothing wrong with the site.
     *
     * So the invariant is not "there is one stylesheet"; the one above covers that.
     * It is that whatever the page loads, `pageCss()` returns ALL of it. Then the
     * flip is invisible to every caller.
     *
     * THE BLIND SPOT IS CLOSED. When this was written the single-route build carried
     * no inline block at all, so the inline loop below was vacuous and said so. The
     * patch wall's three routes are the build that changed it: every page now ships
     * one inline `<style>` alongside the shared chunk, and the loop below is live on
     * all four. Asserted over every page rather than the home page, since the
     * rebalancing is Astro's decision per page and not a property of any one of them.
     */
    it("hands callers every byte of CSS each page loads, linked and inlined alike", () => {
        let inlineBlocks = 0;
        for (const page of builtPages()) {
            const html = read(page);
            const css = pageCss(page);
            const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!);
            const linked = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]!);
            inlineBlocks += inline.length;

            expect(inline.length + linked.length, `${page} must load CSS from somewhere`).toBeGreaterThan(0);
            for (const block of inline) expect(css, `${page}: an inlined <style> block is missing from pageCss()`).toContain(block);
            for (const href of linked) expect(css, `${page}: ${href} is missing from pageCss()`).toContain(read(`dist${href}`));

            // Coverage by length too, so a source cannot be dropped while its bytes
            // happen to appear inside another one.
            const bytes = [...inline, ...linked.map((h) => read(`dist${h}`))].reduce((n, s) => n + s.length, 0);
            expect(css.length, `${page}: pageCss() is shorter than its own sources`).toBeGreaterThanOrEqual(bytes);
        }
        // Non-vacuity for the half that used to be dead: if Astro stops inlining, the
        // loop above proves nothing about inline blocks and this says so rather than
        // passing quietly.
        expect(inlineBlocks, "no page ships an inlined <style> — the inline half of this test is vacuous again").toBeGreaterThan(0);
    });

    /**
     * The old idiom this replaced — `readdirSync("dist/_astro").find(…endsWith(".css"))`
     * — reads ONE arbitrary chunk and never sees an inlined block. It is green today
     * and wrong the moment a second route exists, which is the worst shape a test
     * helper can have. Fifteen call sites had it; this stops the sixteenth.
     *
     * The two survivors in this file are deliberate: they count emitted files as an
     * output-hygiene check, and never read a rule out of one.
     */
    it("routes every CSS read in the suite through pageCss()", () => {
        const files = readdirSync("tests", {recursive: true, encoding: "utf8"})
            .filter((f) => f.endsWith(".ts"));
        const offenders = files.filter((f) => {
            if (f === "helpers/css.ts") return false;                     // defines pageCss; documents the idiom
            const src = read(`tests/${f}`);
            return /readdirSync\("dist\/_astro"\)[\s\S]{0,120}?endsWith\("\.css"\)[\s\S]{0,120}?readFileSync|read\(`dist\/_astro\//.test(src);
        });
        expect(offenders, "read the page's CSS with pageCss(), not by guessing a chunk filename").toEqual([]);
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

    it("ships no emoji in any page or its stylesheet", () => {
        for (const page of builtPages()) {
            expect(read(page), `${page} ships an emoji pictograph`).not.toMatch(EMOJI);
            expect(pageCss(page), `${page}'s stylesheet ships an emoji pictograph`).not.toMatch(EMOJI);
        }
    });

    it("emits a usable CSS rule for every safelisted icon class", () => {
        const css = pageCss();
        const wanted = new Set([
            ...LINKS.map(({logo}) => iconClass(logo)),
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

    /** The built stylesheet. Read lazily: the build runs in vitest's globalSetup. */
    const sheet = () => pageCss();

    const themeTokens = (css: string, theme: string): Record<string, string> => {
        const block = css.match(new RegExp(`\\[data-theme=['"]?${theme}['"]?\\]\\{([^}]*)\\}`))?.[1];
        expect(block, `the ${theme} theme block must ship its color tokens`).toBeTruthy();
        return Object.fromEntries(
            [...block!.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)].map((m) => [m[1], expandHex(m[2])]),
        );
    };

    /**
     * The footer heart's ink, read from the shipped stylesheet in both themes.
     *
     * Three failures this catches, all silent. Deleting `--brand-ink` from a theme
     * block leaves the heart's rule emitted and the class worn, but `color:
     * var(--brand-ink)` with nothing behind it is invalid at computed-value time —
     * and `color` inherits, so the glyph quietly goes back to the body text colour
     * with the markup still perfect. Re-toning the token far enough to stop reading
     * as ink would pass any structural assertion. And pointing the glyph's wrapper at
     * a DIFFERENT token would leave `--brand-ink` perfectly defined and perfectly
     * contrasting while nothing on the page used it.
     *
     * That third one is why the ink is resolved THROUGH THE WEARER'S CLASSES rather
     * than by looking the token up by name. An earlier version read
     * `themeTokens(css)["--brand-ink"]` directly and so certified a hex that nothing
     * was guaranteed to paint — the same shape as the 1.89:1 defect the palette work
     * fixed, and the exact pattern `painted()` below exists to replace.
     *
     * Measured as text (4.5:1) rather than as a graphic (3:1): the glyph stands in
     * for the word "love", which the `sr-only` span beside it supplies, so it is
     * prose that happens to be drawn.
     */
    it("gives the footer heart ink that reads as text on its card, in both themes", () => {
        const css = sheet();
        const {document: page} = parseHTML(read("dist/index.html"));
        const glyph = page.querySelector(`span[class~="${iconClass(FOOTER.icon)}"]`);
        expect(glyph, "the footer must render the configured heart icon").toBeTruthy();

        for (const theme of ["light", "dark"]) {
            const t = themeTokens(css, theme);

            // Walk the glyph and its ancestors in cascade order and take the first
            // element that actually paints a colour — that is the ink the glyph
            // inherits, because its own rule is `color: inherit`.
            let ink: ReturnType<typeof painted> = undefined;
            for (let el: Element | null = glyph; el && !ink; el = el.parentElement) {
                ink = painted(css, el.getAttribute("class"), "color", t);
            }
            expect(ink, `${theme}: nothing in the heart's ancestry paints a colour`).toBeTruthy();
            expect(ink!.via, `${theme}: the heart paints ${ink!.via} — it must take its own token`).toBe("--brand-ink");

            const card = t["--card-background"];
            expect(card, `${theme}: --card-background must be defined`).toBeTruthy();
            const ratio = contrast(ink!.hex, card);
            expect(
                ratio,
                `${theme}: heart ink ${ink!.hex} is ${ratio.toFixed(3)}:1 on its card ${card} — it stands in for a word, so it is held to the text floor`,
            ).toBeGreaterThanOrEqual(4.5);
        }
    });

    /**
     * What a class list actually paints for `prop`, per the shipped rules —
     * both the resolved hex and the custom property it came through.
     *
     * Everything downstream resolves through the ELEMENT's classes rather than
     * through a token name, and that is the point: a token can be re-toned
     * perfectly while the element quietly paints a different one.
     */
    const painted = (css: string, classes: string | null | undefined, prop: string, tokens: Record<string, string>) => {
        for (const token of classes?.split(/\s+/) ?? []) {
            const selector = `.${token.replace(/[^\w-]/g, (c) => `\\${c}`)}{`;
            const at = css.indexOf(selector);
            if (at < 0) continue; // UnoCSS generated nothing for this token.
            const body = css.slice(at + selector.length, css.indexOf("}", at));
            const value = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+?)\\s*(?:;|$)`))?.[1];
            const named = value?.match(/^var\((--[\w-]+)\)/)?.[1];
            // A palette colour ships as rgb(r g b / var(--un-bg-opacity)).
            const rgb = value?.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
            const hex = named
                ? tokens[named]
                : rgb
                    ? `#${rgb.slice(1).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`
                    : value?.match(/^#[0-9a-fA-F]{3,6}$/)?.[0];
            // `color: inherit` on the icon rule resolves to nothing and falls through.
            if (hex) return {hex: expandHex(hex), via: named};
        }
        return undefined;
    };

    const paints = (css: string, classes: string | null | undefined, prop: string, tokens: Record<string, string>) =>
        painted(css, classes, prop, tokens)?.hex;

    /** The raw value a class list resolves for `prop`, per the shipped rules. */
    const decl = (css: string, classes: string | null | undefined, prop: string) => {
        for (const token of classes?.split(/\s+/) ?? []) {
            const selector = `.${token.replace(/[^\w-]/g, (c) => `\\${c}`)}{`;
            const at = css.indexOf(selector);
            if (at < 0) continue;
            const body = css.slice(at + selector.length, css.indexOf("}", at));
            const value = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+?)\\s*(?:;|$)`))?.[1];
            if (value) return value;
        }
        return undefined;
    };

    it("paints the goal icon at 3:1 against the progress bar in both themes", () => {
        const css = sheet();
        const bars = [...parseHTML(read("dist/index.html")).document.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);

        for (const track of bars) {
            const fill = track.querySelector(".progress-fill");
            expect(fill, "each progress bar must render a fill").toBeTruthy();
            for (const theme of ["light", "dark"]) {
                const tokens = themeTokens(css, theme);
                const trackBg = paints(css, track.getAttribute("class"), "background-color", tokens);
                const fillBg = paints(css, fill?.getAttribute("class"), "background-color", tokens);
                // Resolve in CASCADE order: an element's own `color` beats one inherited
                // from its parent, so the span must be consulted BEFORE the fill. Reading
                // the fill first would let an ink utility added to the span reintroduce
                // the exact 1.89:1 defect with this test still green. Falling through both
                // means the icon inherits --text from <body> — the original defect.
                const ink = paints(css, fill?.querySelector("span")?.getAttribute("class"), "color", tokens)
                    ?? paints(css, fill?.getAttribute("class"), "color", tokens)
                    ?? tokens["--text"];
                expect(fillBg, `${theme}: the fill must paint a resolvable background`).toBeTruthy();
                expect(trackBg, `${theme}: the track must paint a resolvable background`).toBeTruthy();
                expect(ink, `${theme}: the icon must resolve an ink color`).toBeTruthy();

                expect(
                    contrast(ink!, fillBg!),
                    `${theme}: icon ${ink} on fill ${fillBg} is ${contrast(ink!, fillBg!).toFixed(2)}:1 — SC 1.4.11 needs 3:1`,
                ).toBeGreaterThanOrEqual(3);
            }
        }
    });

    /**
     * This replaces an assertion that the icon cleared 3:1 against the TRACK as
     * well as the fill. That was never a live case — the note it carried said so
     * — and it is not satisfiable: the ink is chosen to read on the fill, the
     * fill flips polarity between themes, and the only way to make one ink clear
     * both regions is to drive the track toward the opposite pole from its own
     * card. Doing that in light mode makes the *unfilled* remainder the loudest
     * thing on the card, which is the defect this palette exists to fix.
     *
     * What actually kept the icon off the track is structural, so that is what
     * the next test asserts. These are the three ratios that are real: the
     * marked region must dominate, the two regions must be distinguishable from
     * each other, and the track must stay quiet against its card.
     */
    it("keeps the bar's polarity: the filled region reads as the mark", () => {
        const css = sheet();
        const doc = parseHTML(read("dist/index.html")).document;
        const bars = [...doc.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);

        for (const bar of bars) {
            const fill = bar.querySelector(".progress-fill")!;
            // The surface the bar is judged against is the card it sits on, found
            // by walking up rather than named, so a layout change cannot leave
            // this comparing the bar to a card it is no longer inside.
            let card = bar.parentElement;
            while (card && !painted(css, card.getAttribute("class"), "background-color", themeTokens(css, "light"))) {
                card = card.parentElement;
            }
            expect(card, "the bar must sit on an element that paints a surface").toBeTruthy();

            for (const theme of ["light", "dark"]) {
                const t = themeTokens(css, theme);
                const track = painted(css, bar.getAttribute("class"), "background-color", t)!;
                const mark = painted(css, fill.getAttribute("class"), "background-color", t)!;
                const surface = painted(css, card!.getAttribute("class"), "background-color", t)!;

                // The bar's colours must be the bar's OWN. It used to paint
                // --shadow, so re-toning the portrait's offset plate silently
                // re-toned the data; a ratio check cannot see that coupling,
                // because the borrowed colour can happen to measure fine.
                expect(mark.via, `${theme}: the fill paints ${mark.via} — the bar must own its fill colour`).toBe("--progress-fill");
                expect(track.via, `${theme}: the track paints ${track.via} — the bar must own its track colour`).toBe("--progress-track");

                const fillVsCard = contrast(mark.hex, surface.hex);
                const trackVsCard = contrast(track.hex, surface.hex);

                // Dominance. A ratio gate alone certifies a bar painted backwards:
                // whichever region stands further from the card is the one a reader
                // takes for the mark, so the FILL has to be that region.
                expect(
                    fillVsCard,
                    `${theme}: fill ${mark.hex} at ${fillVsCard.toFixed(2)}:1 vs card must exceed track ${track.hex} at ${trackVsCard.toFixed(2)}:1 — otherwise the empty part reads as full`,
                ).toBeGreaterThan(trackVsCard);
                // Quiet channel: the track is ground, not a second mark.
                expect(
                    trackVsCard,
                    `${theme}: track is ${trackVsCard.toFixed(2)}:1 against its card — too loud for the unmarked region`,
                ).toBeLessThanOrEqual(2);
                // And the boundary between them still has to be findable.
                const fillVsTrack = contrast(mark.hex, track.hex);
                expect(fillVsTrack, `${theme}: fill against track is ${fillVsTrack.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
            }
        }
    });

    /**
     * --accent is the control's border and its hover ink, both non-text
     * graphics, so 3:1 against the surface they sit on. It shipped at 1.89:1 in
     * light mode for as long as the palette existed: hovering a control turned
     * its icon #F3A3AA on a #FAFAFA field. Nothing caught it because neither the
     * border nor the icon is text, and no contrast checker looks at either.
     */
    it("holds the control's accent at 3:1 against the surface it sits on", () => {
        const css = sheet();
        for (const theme of ["light", "dark"]) {
            const t = themeTokens(css, theme);
            const ratio = contrast(t["--accent"], t["--background"]);
            expect(
                ratio,
                `${theme}: accent ${t["--accent"]} on ${t["--background"]} is ${ratio.toFixed(2)}:1 — the control border and its hover icon need 3:1`,
            ).toBeGreaterThanOrEqual(3);
        }
    });

    /**
     * The Now card's live dot is a non-text status graphic, so SC 1.4.11 asks
     * 3:1 of it against the card it sits on. It went unmeasured for as long as
     * it existed because it borrowed --shadow, a token whose own job (a
     * decorative offset plate) carries no such requirement — at #EC7981 it sat
     * at 2.53:1 and nobody was looking. Splitting --status-live off is what
     * makes this assertable; pinning `.via` is what stops a future re-coupling
     * from quietly reintroducing the same blind spot.
     */
    it("holds the live status dot at 3:1 against the card it sits on", () => {
        const css = sheet();
        const doc = parseHTML(read("dist/index.html")).document;
        const dot = doc.querySelector('[class*="status-live"]');
        expect(dot, "the Now card must render a live indicator").toBeTruthy();

        let card = dot!.parentElement;
        while (card && !painted(css, card.getAttribute("class"), "background-color", themeTokens(css, "light"))) {
            card = card.parentElement;
        }
        expect(card, "the dot must sit on an element that paints a surface").toBeTruthy();

        for (const theme of ["light", "dark"]) {
            const t = themeTokens(css, theme);
            const ink = painted(css, dot!.getAttribute("class"), "background-color", t)!;
            const surface = painted(css, card!.getAttribute("class"), "background-color", t)!;
            expect(ink?.via, `${theme}: the dot paints ${ink?.via} — the indicator must own its colour`).toBe("--status-live");
            const ratio = contrast(ink.hex, surface.hex);
            expect(
                ratio,
                `${theme}: live dot ${ink.hex} on ${surface.hex} is ${ratio.toFixed(2)}:1 — a status indicator needs 3:1`,
            ).toBeGreaterThanOrEqual(3);
        }
    });

    it("clips the goal icon inside the fill instead of letting it paint on the track", () => {
        // The structural reason the ink never has to read on the track: the glyph
        // lives inside the fill and the FILL clips to itself, so overflow in any
        // direction, under any display/justify/direction, is cut at the fill's
        // own painted edge and can never land on bare track.
        //
        // Resolved out of the built stylesheet, not from the class token: a
        // utility UnoCSS fails to emit must go red here. An earlier version of
        // this test asserted the token `justify-end` instead, which made the
        // guard depend on `flex` — a token it never checked. Removing `flex`
        // left the suite green while putting 8px of the glyph on bare track at
        // 1.76:1 (light) and 1.61:1 (dark).
        const css = sheet();
        const bars = [...parseHTML(read("dist/index.html")).document.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);
        for (const track of bars) {
            const fill = track.querySelector(".progress-fill")!;
            expect(
                decl(css, fill.getAttribute("class"), "overflow"),
                "the fill must clip its own overflow — that is what keeps the glyph off the track under any layout",
            ).toBe("hidden");
            expect(
                decl(css, track.getAttribute("class"), "overflow"),
                "the track clips too, so a fill wider than its box cannot escape the bar",
            ).toBe("hidden");

            const icons = [...track.querySelectorAll("span")];
            expect(icons.length, "the bar renders exactly one glyph").toBe(1);
            expect(fill.contains(icons[0]), "the glyph must live inside the fill, not beside it").toBe(true);
        }
    });

    it("keeps the glyph riding the fill's leading edge", () => {
        // A second, separate claim: the clip above guarantees the glyph is never
        // on the track, but not that it sits where the design puts it. Without
        // `flex` the glyph would be clipped away entirely at low progress rather
        // than marking the leading edge.
        const css = sheet();
        for (const track of [...parseHTML(read("dist/index.html")).document.querySelectorAll('[role="progressbar"]')]) {
            const classes = track.querySelector(".progress-fill")!.getAttribute("class");
            expect(decl(css, classes, "display"), "the fill lays its glyph out as a flex item").toMatch(/^(inline-)?flex$/);
            expect(decl(css, classes, "justify-content"), "the glyph rides the leading edge").toBe("flex-end");
        }
    });
});

/**
 * The controls' offset plate was invisible from the day the surface was written:
 * presetWind3 expands a geometry-only shadow to
 * `--un-shadow: <offsets> var(--un-shadow-color)` with NO fallback, nothing on
 * the page ever defines `--un-shadow-color`, and an unresolvable var makes the
 * whole `box-shadow` invalid at computed-value time — so it computed to `none`.
 * The portrait escaped because its shadow was written as one complete arbitrary
 * value, which emits `var(--un-shadow-color, <colour>)`.
 *
 * A rendered-colour test cannot see this (there is no browser here) and a class
 * test cannot either (the classes were present the whole time). So this asserts
 * the mechanism: every offset plate must ship a resolvable colour.
 */
/**
 * A hover style is a promise that something happens if you click. The eight
 * bento cards are plain containers — nothing about one responds to a pointer —
 * and they nonetheless grew an accent border on hover, which reads as "this is
 * a link" to anyone with a mouse and means nothing to anyone without one.
 *
 * Written against every hover rule in the sheet rather than against the card,
 * so the same mistake on a future element is caught too.
 */
describe("hover styles promise only interactions that exist", () => {
    const INTERACTIVE = new Set(["a", "button", "input", "select", "textarea", "summary", "label"]);

    /**
     * Run against EVERY page. The patch wall is the first thing on this site to put a
     * hover style on something other than `.control` — the filter row's links and the
     * back link both take one — and a home-page-only check would never look at either.
     */
    it.each(builtPages())("applies no hover rule to an element that cannot be interacted with (%s)", (page) => {
        const css = pageCss(page);

        // Match on SELECTORS, not class tokens. An earlier version only
        // recognised `.token:hover`, so an Astro scoped <style> — the idiomatic
        // form in this repo, ProgressBar already ships one — could put the accent
        // border back on all eight cards as `div[data-astro-cid-…]:hover` with
        // the suite green. Verified: that mutation now goes red.
        //
        // A chunk between two `}` is `<at-rule preamble>{<selector list>{<decls>`,
        // so the selector list is always the penultimate `{`-separated part.
        const hovered = css
            .split("}")
            .flatMap((chunk) => {
                const parts = chunk.split("{");
                return parts.length < 2 ? [] : parts[parts.length - 2].split(",");
            })
            .map((s) => s.trim())
            // Only real state pseudo-classes. `\:hover` inside an escaped UnoCSS
            // token (`.md\:hover\:border-…`) is part of the class NAME, and
            // stripping it blindly yields a selector linkedom cannot parse —
            // which would fail the build on a legitimate hover utility.
            .filter((s) => /(?<!\\):hover(?![\w-])/.test(s))
            .map((s) => s.replace(/(?<!\\)::?[\w-]+(?:\([^)]*\))?/g, ""));
        expect(hovered.length, "the sheet must ship at least one hover rule — the controls have one").toBeGreaterThan(0);

        const doc = parseHTML(read(page)).document;
        const offenders: string[] = [];
        const matched = new Set<Element>();
        // Deliberately not wrapped in try/catch: a selector this cannot parse
        // must go red and be handled, because swallowing the throw is exactly
        // how this guard would become unable to fail.
        for (const selector of hovered) {
            for (const el of doc.querySelectorAll(selector)) matched.add(el as Element);
        }
        for (const el of matched) {
            const worn = el.getAttribute("class") || `<${el.tagName.toLowerCase()}>`;
            let node: Element | null = el;
            let interactive = false;
            while (node && !interactive) {
                interactive = INTERACTIVE.has(node.tagName.toLowerCase()) || node.hasAttribute("tabindex");
                node = node.parentElement;
            }
            if (!interactive) offenders.push(`<${el.tagName.toLowerCase()}> wears ${worn}`);
        }
        expect(offenders, "a hover style here advertises an affordance that does not exist").toEqual([]);
    });
});

describe("the offset plate actually paints", () => {
    // One entry per plated SELECTOR, not per plated element: `.control` is worn by
    // every control (it was two classes until they were unified, and the toggle's
    // narrower variant was the reason they were not one size).
    const PLATED = [".control", ".md\\:shadow-\\[10px_10px_0_var\\(--shadow\\)\\]"];

    /** The `--un-shadow` value the built sheet gives `selector`. */
    const plate = (css: string, selector: string) => {
        const at = css.indexOf(`${selector}{`);
        expect(at, `${selector} must ship a rule`).toBeGreaterThanOrEqual(0);
        const body = css.slice(at + selector.length + 1, css.indexOf("}", at));
        const shadow = body.match(/--un-shadow:\s*([^;]+)/)?.[1];
        expect(shadow, `${selector} must declare an offset plate`).toBeTruthy();
        return shadow!;
    };

    const sheet = () => pageCss();

    /**
     * Check the VALUE, not the shape. There are four ways to write this shortcut
     * so that nothing is painted, and each earlier draft of this test caught
     * only some of them:
     *
     *   2px 2px 0 var(--un-shadow-color)   geometry utility, no fallback — the
     *                                      ORIGINAL bug; unresolvable var makes
     *                                      the whole declaration invalid
     *   var(--shadow)                      colour utility, no geometry — also
     *                                      not a valid box-shadow
     *   2px 2px -1px var(…)                negative blur; invalid, drops to none
     *   0 0 0 var(…)                       valid CSS that paints entirely behind
     *                                      the border box, i.e. invisible
     *
     * The last two pass any regex that only asks "offsets, then a colour with a
     * fallback", which is what a review panel caught here. Parsing the numbers
     * is barely more code and is the difference between a gate and a comment.
     *
     * Zero offsets are only fatal together with zero spread — a spread-only
     * plate is legitimate — so the condition is x === 0 && y === 0 && spread === 0,
     * not "the offsets are non-zero".
     *
     * This stays a stylesheet parse rather than a browser assertion on purpose:
     * `netlify.toml` runs `pnpm test` as the deploy gate, and putting playwright
     * and a chromium download inside a zero-client-JS static site's production
     * build is a worse trade than coupling to presetWind3's emit format.
     */
    const LEN = String.raw`(-?[\d.]+)(?:px|r?em)?`;
    const COMPLETE_PLATE = new RegExp(
        `^${LEN}\\s+${LEN}(?:\\s+${LEN})?(?:\\s+${LEN})?\\s+var\\(--un-shadow-color,\\s*(.+)\\)$`,
    );

    /** Why this plate paints nothing, or "" if it does. */
    const dead = (shadow: string) => {
        const m = shadow.match(COMPLETE_PLATE);
        if (!m) return "that is not offsets plus a colour with a fallback, so it computes to box-shadow: none";
        const [x, y, blur, spread] = [m[1], m[2], m[3], m[4]].map((v) => (v === undefined ? 0 : Number(v)));
        if (blur < 0 || spread < 0) return "blur and spread may not be negative — the declaration is invalid and drops to none";
        if (x === 0 && y === 0 && spread === 0) return "a zero-offset, zero-spread plate hides entirely behind the border box";
        return "";
    };

    it("gives every plated rule a complete, resolvable, visible shadow value", () => {
        const css = sheet();
        for (const selector of PLATED) {
            const shadow = plate(css, selector);
            expect(dead(shadow), `${selector} ships "--un-shadow: ${shadow}" — ${dead(shadow)}`).toBe("");
        }
    });

    it("paints the plate from the theme token, so it re-tones with the theme", () => {
        const css = sheet();
        for (const selector of PLATED) {
            expect(plate(css, selector), `${selector} must cast the plate in --shadow, not a hard-coded colour`)
                .toContain("var(--shadow)");
        }
        for (const theme of ["light", "dark"]) {
            const block = css.match(new RegExp(`\\[data-theme=['"]?${theme}['"]?\\]\\{([^}]*)\\}`))?.[1];
            expect(block, `${theme} must define --shadow for the plate to resolve`).toMatch(/--shadow:\s*#[0-9a-fA-F]{3,6}/);
        }
    });
});

/**
 * The converse of the existing "no class without a rule" gate: no RULE without a
 * wearer. UnoCSS extracts from every word of a source file, including prose in
 * `.astro` frontmatter comments, so an ordinary English word that happens to be
 * a utility name ships a real CSS rule for a class no element has. It has cost
 * this repo twice: a dead `perspective` rule that survived a cleanup because it
 * was named in a comment, and — while writing the change this test ships with —
 * a `flex-grow` rule emitted by the word "grow" in a paragraph explaining why a
 * hover style was removed. Both were invisible to every other gate.
 *
 * Comparing against the class tokens actually worn in dist/index.html is the
 * only check that sees it, because the defect is a rule with no corresponding
 * markup rather than markup with no corresponding rule.
 */
describe("the stylesheet ships no rule nobody wears", () => {
    /**
     * A ratchet, not a clean sweep. The entries below predate this gate; each
     * comes from ordinary text UnoCSS happens to read as a class name. Deliberately
     * not counted in this sentence — the list shrinks whenever prose changes (`my`
     * came off it in this very change), and a number here would be stale the moment
     * it did:
     *
     *   transition    `transition: …` declarations in <style> blocks
     *   ease          same, though this one is NOT a dead rule — it is a
     *                 redundant selector riding the live `.ease,.ease-in-out{…}`,
     *                 so it costs nothing but still has no wearer of its own
     *   inline        `is:inline` on the theme script, plus prose about it
     *   inline-block  `display: inline-block` in ThemeSwitcher's <style>
     *   me            the `me.webp` import path and the "About me" heading
     *   my            template prose — "Follow my running on Strava", "My Running goal"
     *
     * Recorded rather than fixed: the fixes are unrelated to this change, and
     * blocklisting a real utility means a future author writing it as a class
     * silently gets nothing, which is how `static` already behaves here.
     *
     * KNOWN COST, stated so nobody is surprised by it: `pnpm test` is the Netlify
     * deploy gate, and UnoCSS reads English. Editing prose in an .astro file can
     * turn the deploy red — appending ", visible to all" to an sr-only string
     * emits `.visible`. That is a real trade, accepted because the gate has
     * already caught three dead rules this change would otherwise have shipped
     * (`grow`, `container`, and a reversed-row utility, all from comments written
     * while fixing the previous one). The failure names the token; the fix is a
     * one-word reword, or a `blocklist` entry in uno.config.ts when the word
     * cannot be avoided. Note constants.ts prose is NOT scanned, so Calvin's own
     * copy cannot trip this — only text inside .astro files.
     */
    // `my` came off this list when the goal CTA's sr-only name stopped being
    // built from a sentence ("Follow my running on Strava") and became the shared
    // label in constants.ts — that removed the last lowercase "my" from any .astro
    // file, so the rule stopped being emitted and the guard below demanded the
    // entry go. `me` survives it: "About me" is still a card title. Exactly the
    // rot this pair of assertions exists to prevent.
    // Four came off the patch wall, and each is a REAL DECLARATION rather than a word
    // in a sentence — the shape that cannot be reworded, which is why they are
    // recorded here rather than fixed at source:
    //
    //   container     `container-type: inline-size` on the bib, which is what makes
    //                 its distance size against the bib instead of the viewport
    //   transform     `transform: rotate(180deg)`, the vertical "KM" down the edge
    //   uppercase     `text-transform: uppercase`, on four of the bib's own elements
    //   outline       the one word in this group that is prose. It names the treatment
    //                 Calvin chose for an un-earned bib and appears in the reasoning
    //                 for every part of it; rewording it would cut the code loose from
    //                 the decision it implements.
    //
    // Blocklisting these instead was rejected. `static` is blocklisted because nothing
    // would ever legitimately want it; `uppercase`, `transform` and `outline` are
    // utilities a future author could reasonably write, and a blocklist entry makes
    // that silently do nothing. A known orphan costs a few dead bytes and keeps the
    // utility working.
    const KNOWN_ORPHANS = ["container", "ease", "inline", "inline-block", "me", "outline", "transform", "transition", "uppercase"];

    /**
     * SCOPED TO THE WHOLE BUILD, not to one page, and the widening is the correct
     * reading of the question rather than a way to keep a gate quiet.
     *
     * Astro emits one shared CSS chunk for every page here. So "this rule has no
     * wearer" is a fact about the OUTPUT: a class worn only on `/patches` is present
     * in the home page's stylesheet and absent from its markup, and an index-only
     * check calls it dead. It called four live classes dead on the first build of the
     * patch wall. See `builtPages()` for the distinction from `pageCss()`, which is
     * per-page on purpose and must stay that way.
     */
    /**
     * A SECOND, DIFFERENT KIND OF EXCUSE, kept apart from KNOWN_ORPHANS on purpose.
     *
     * These are STATE classes: an element wears one when the site is in a state it can
     * legitimately be out of. `bib--booked` and `bib-tag` mark a race that has not been
     * run yet, and on 7 December 2026 — the morning after the last race on the calendar
     * — nothing on the site is in that state, so both rules ship with no wearer and this
     * gate goes red on a correct page.
     *
     * That is not hypothetical and it is not merely a red test: `netlify.toml` runs the
     * suite as the build command, and the Strava bot pushes unattended, so it is a
     * failed production deploy triggered by a bot on a day nobody is watching. Found by
     * simulating eight future bot pushes rather than by reasoning about it.
     *
     * WHY NOT KNOWN_ORPHANS: that list means "a rule that should not exist and we have
     * not got round to removing", and its anti-rot test demands the rule still ship. A
     * state class is the opposite — the rule *must* exist, and its absence from the
     * markup is information about today rather than a defect. Collapsing the two would
     * make the ratchet mean two things.
     *
     * WHY NOT WEAKEN THE GATE: it exists to catch a rule emitted by an ordinary English
     * word, and it still does. What is excused here is narrow and named, and the class
     * is not left uncovered — `tests/patch-wall.test.ts` renders `Patch` directly in
     * both states, so an actually-dead `bib--booked` fails there, on a page and not on a
     * date.
     */
    /**
     * Rather than a hand-kept list. A list works, and I shipped one first — but it
     * defers the defect instead of closing it: the next component with a state class
     * reddens this gate on some future date, unattended, and the author discovers the
     * rule by reading a failed deploy. A review panel proposed this discriminator and
     * it is strictly better, so it replaced mine.
     *
     * Two conditions, and both are needed:
     *   - the selector is SCOPED (`[data-astro-cid-…]`), so it came from a component's
     *     own `<style>` block. UnoCSS output is never scoped, so the gate's real job —
     *     an ordinary English word in .astro text emitting a utility rule — is untouched.
     *   - the token appears as an authored quoted literal in some `.astro` file with its
     *     `<style>` block stripped, i.e. somebody deliberately wrote it into markup.
     *
     * A class that exists only inside a `<style>` block and is worn by nothing is still
     * caught, which is the case that matters: that is a typo or a leftover.
     */
    const authoredClasses = (): Set<string> => {
        const out = new Set<string>();
        const files = readdirSync("src", {recursive: true, encoding: "utf8"})
            .filter((f) => f.endsWith(".astro"));
        for (const f of files) {
            const src = read(`src/${f}`).replace(/<style[\s\S]*?<\/style>/g, "");
            for (const m of src.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
                for (const token of m[1].split(/\s+/)) if (/^[\w-]+$/.test(token)) out.add(token);
            }
        }
        return out;
    };

    it("emits a class rule only for classes some page actually uses", () => {
        const css = builtPages().map((p) => pageCss(p)).join("\n");
        const worn = new Set(builtPages().flatMap((p) => [...classTokens(p)]));
        const authored = authoredClasses();

        // Every selector the sheet defines, split on commas, with the leading
        // class token extracted. Non-class selectors (`body`, `:root[…]`,
        // `main > *`, keyframe stops) are not this test's business.
        const orphans = new Set<string>();
        for (const m of css.matchAll(/(^|[{}])([^{}@]+)\{/g)) {
            for (const selector of m[2].split(",")) {
                const cls = selector.trim().match(/^\.((?:\\.|[\w-])+)/)?.[1];
                if (!cls) continue;
                const token = cls.replace(/\\(.)/g, "$1");
                if (worn.has(token) || KNOWN_ORPHANS.includes(token)) continue;
                // A component's own state class, on a day nothing is in that state.
                if (selector.includes("[data-astro-cid-") && authored.has(token)) continue;
                orphans.add(token);
            }
        }
        expect(
            [...orphans].sort(),
            "these classes have a CSS rule but no element — almost always a utility name written as an ordinary English word in .astro text. Reword it, or add it to `blocklist` in uno.config.ts if the word cannot be avoided",
        ).toEqual([]);
    });

    it("still needs every entry on the known-orphan list, so the list cannot rot", () => {
        // Without this, a token fixed at source stays on the list forever and
        // quietly re-opens the hole it was excusing.
        const css = builtPages().map((p) => pageCss(p)).join("\n");
        for (const token of KNOWN_ORPHANS) {
            const selector = `.${token.replace(/[^\w-]/g, (c) => `\\${c}`)}`;
            expect(
                css.includes(`${selector}{`) || css.includes(`${selector},`),
                `${token} no longer ships a rule — remove it from KNOWN_ORPHANS`,
            ).toBe(true);
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

    /**
     * The toggle's pressed state is the one thing on this page that a script has to
     * keep true, and the server cannot do it: the pre-paint script in BasicLayout
     * runs before the button exists, so a visitor who prefers dark is served
     * `aria-pressed="false"` and the toggle's own deferred script is what corrects
     * it. Delete that line and the attribute becomes a lie for exactly the visitors
     * who did not accept the default — with the markup, the suite and the rendered
     * page all still looking right.
     *
     * Asserted against the shipped bundle rather than the source, because that is
     * where the line has to survive minification — and by EXECUTING it, not by
     * grepping it. An earlier version of this test only looked for the strings
     * `aria-pressed` and `dataset.theme` in the bundle, and a review panel defeated it
     * three ways with the suite green: deleting the once-on-load call, hard-coding
     * `"false"` while the click handler still read the theme, and replacing the whole
     * script with one that writes a constant. All three ship a bundle containing both
     * strings, and Chrome confirmed all three leave a dark-preferring visitor with
     * `pressed: false` under an active dark theme — the exact inversion the paragraph
     * above says this test protects against. No substring can express "reports the
     * theme it is actually in".
     *
     * Both visitor directions are asserted, because a dark visitor alone would be
     * satisfied by a script hard-coding `"true"` — the mirror of the bug being fixed.
     */
    it("ships a script that reports the toggle's state from the live theme", () => {
        const html = read("dist/index.html");
        const modules = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
        expect(modules.length, "the toggle's behaviour ships as an inline module script").toBeGreaterThan(0);
        const syncing = modules.filter((s) => s.includes("aria-pressed"));
        // Kept as the first assertion purely for its diagnosis: if nothing writes the
        // attribute at all, this says so plainly rather than failing an execution below.
        expect(
            syncing.length,
            "no shipped script writes aria-pressed — the state cannot follow the theme",
        ).toBeGreaterThan(0);

        /**
         * Runs the shipped module against a stub document standing in for one visitor,
         * and reports what the button ends up saying. `new Function` cannot evaluate a
         * bundle containing real `import`/`export` statements, so if Astro ever stops
         * inlining this script as bare statements the test fails loudly rather than
         * passing silently — which is the direction to fail in.
         */
        const visit = (theme: string) => {
            const {document: stub} = parseHTML(
                `<html data-theme="${theme}"><body>
                    <button id="theme-toggle" type="button" aria-pressed="false"></button>
                </body></html>`,
            );
            const store = new Map<string, string>();
            const storage = {
                getItem: (k: string) => store.get(k) ?? null,
                setItem: (k: string, v: string) => void store.set(k, v),
            };
            for (const src of syncing) new Function("document", "localStorage", src)(stub, storage);
            const button = stub.querySelector("#theme-toggle")!;
            const state = () => ({
                theme: stub.querySelector("html")?.getAttribute("data-theme"),
                pressed: button.getAttribute("aria-pressed"),
            });
            const before = state();
            button.dispatchEvent(new stub.defaultView!.Event("click"));
            return {before, after: state()};
        };

        const dark = visit("dark");
        expect(dark.before.pressed, "a dark visitor's toggle must report pressed before any click").toBe("true");
        expect(dark.after, "a click must move the theme and the reported state together").toEqual({theme: "light", pressed: "false"});

        const light = visit("light");
        expect(light.before.pressed, "a light visitor's toggle must report not-pressed").toBe("false");
        expect(light.after, "a click must move the theme and the reported state together").toEqual({theme: "dark", pressed: "true"});
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

    it("covers every card on every page with an entrance-stagger delay rule", () => {
        // PR #41 added an 8th <main> child while the delay ladder stopped at
        // nth-child(7), so the footer animated on the same frame as the hero.
        // The ladder is hand-written CSS; this is the lockstep check.
        //
        // `main > *` is a GLOBAL rule in BasicLayout, so it animates the children of
        // every page's <main>, not just the home page's. A page whose main outgrew
        // the ladder would animate its tail on frame zero — the same defect, on a
        // page nobody thought to re-check. Ask the widest main in the build.
        const layout = read("src/layouts/BasicLayout.astro");
        const rungs = [...layout.matchAll(/nth-child\((\d+)\)\s*\{\s*animation-delay/g)].map((m) => Number(m[1]));
        expect(rungs.length, "the entrance cascade must exist").toBeGreaterThan(0);
        for (const page of builtPages()) {
            const cards = parseHTML(read(page)).document.querySelector("main")?.children.length ?? 0;
            expect(cards, `${page} must render a main with children`).toBeGreaterThan(0);
            expect(
                Math.max(...rungs),
                `${page}: main renders ${cards} children but the delay ladder stops at nth-child(${Math.max(...rungs)})`,
            ).toBeGreaterThanOrEqual(cards);
        }
    });

    it("gives every class token on every page a rule in the stylesheet it loads", () => {
        // UnoCSS fails silently on unknown utilities and Astro drops nothing:
        // a dead class ships as markup bytes with no effect. After plan 012
        // every remaining token is load-bearing; this keeps it that way.
        // The stylesheet escapes special chars in selectors (`.md\:pr-8`), so
        // unescape before comparing.
        //
        // PER-PAGE, unlike the orphan gate above, and the asymmetry is the point. The
        // question here is "does this page's own cascade define what its own markup
        // wears", which a union of every sheet would answer wrong: a rule another
        // page loaded would excuse a class this one cannot resolve. It is also the
        // only gate that would catch a presetIcons class the safelist never saw —
        // an icon with no rule is a mask box at zero size, invisible and green.
        let checked = 0;
        for (const page of builtPages()) {
            const css = pageCss(page);
            const cssClasses = new Set(
                [...css.matchAll(/\.((?:[\w-]|\\.)+)/g)].map((m) => m[1].replace(/\\(.)/g, "$1")),
            );
            const tokens = classTokens(page);
            expect(tokens.size, `${page} must ship class tokens`).toBeGreaterThan(20);
            for (const token of tokens) {
                expect(cssClasses.has(token), `${page}: class "${token}" has no rule in the stylesheet it loads`).toBe(true);
            }
            checked += tokens.size;
        }
        expect(checked, "the home page alone ships more tokens than this — the walk is not reaching every page").toBeGreaterThan(50);
    });
});
