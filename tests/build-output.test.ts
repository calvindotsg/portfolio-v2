import {readFileSync, readdirSync, existsSync} from "node:fs";
import {parseHTML} from "linkedom";
import sharp from "sharp";
import {describe, expect, it} from "vitest";

import {CAREER, FOOTER, GOALS, LINKS, METADATA, WELCOME} from "../src/lib/constants";
import {iconClass} from "../src/lib/icons";
import {decl, isStateful, pageCss, parseRules, splitSelectorList, structuralSelector} from "./helpers/css";
import {builtPages, classTokens, cssChunks} from "./helpers/pages";

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
     * EVERY BUILT PAGE MUST BE IN THE SITEMAP. This was once the wall's ONLY discovery
     * path — nothing on the home page linked to it — and the goal cards' next-race chips
     * have since closed that, which is why the assertion after this one exists. The
     * sitemap still matters and is still asserted; it is no longer load-bearing alone.
     *
     * The gate above only greps the index for the origin, which one page satisfies. A
     * review panel dropped three of four pages out of `sitemap-0.xml` through an
     * integration filter and the whole suite stayed green — the PR quadrupled the route
     * count and this was the assertion that did not widen with it.
     */
    it("lists every built page in the sitemap", () => {
        const urls = new Set(
            [...read("dist/sitemap-0.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
        );
        expect(urls.size, "the sitemap must list something").toBeGreaterThan(0);
        for (const page of builtPages()) {
            // dist/index.html -> "/", dist/patches/cycling/index.html -> "/patches/cycling/"
            const path = page.replace(/^dist/, "").replace(/index\.html$/, "");
            const expected = new URL(path, METADATA.site_url).href;
            expect(urls.has(expected), `${page} is built but ${expected} is not in the sitemap`).toBe(true);
        }
    });

    /**
     * EVERY BUILT PAGE IS REACHABLE FROM `/` BY FOLLOWING LINKS — a walk, not a
     * "somebody links to it" check.
     *
     * The wall shipped with nothing on the home page pointing at it, so it was an indexed
     * page a reader could only arrive at from a search result; the goal cards' next-race
     * chips closed that, and a fix nothing asserts has a shelf life.
     *
     * IT HAS TO BE A WALK FROM THE ROOT, and that is not pedantry — the first version of
     * this gate asked only whether some other page linked to each one, and the mutation
     * that removes the chips SURVIVED it: `/patches` and `/patches/cycling` link to each
     * other, so an island of pages satisfies "linked from somewhere else" while being
     * exactly as unreachable as before. Verified by injecting that mutation both before
     * and after this rewrite.
     *
     * Stated over the whole build rather than as "the home page links to
     * /patches/cycling", so a fourth route joins the gate by existing.
     */
    it("reaches every built page from the site root by following links", () => {
        const pathOf = (page: string) => page.replace(/^dist/, "").replace(/index\.html$/, "");
        const byPath = new Map(builtPages().map((page) => [pathOf(page), page]));
        expect(byPath.has("/"), "the site root must be built").toBe(true);

        const seen = new Set<string>(["/"]);
        const queue = ["/"];
        let followed = 0;
        while (queue.length > 0) {
            const path = queue.shift()!;
            for (const m of read(byPath.get(path)!).matchAll(/href="(\/[^"#?]*)"/g)) {
                const href = m[1].endsWith("/") ? m[1] : `${m[1]}/`;
                followed++;
                if (!byPath.has(href) || seen.has(href)) continue;
                seen.add(href);
                queue.push(href);
            }
        }
        expect(followed, "no internal links followed — this assertion would be vacuous").toBeGreaterThan(1);
        expect(
            [...byPath.keys()].filter((path) => !seen.has(path)),
            "these pages are built and in the sitemap but cannot be reached from / by following links",
        ).toEqual([]);
    });

    /**
     * THE ONE DAY THE BUILD WAS DRAWN FOR, asserted on the artifact rather than recomputed.
     *
     * `<meta name="build-date">` is what the wall assertions read to avoid comparing a page
     * built yesterday against today's clock, and nothing gated the tag itself: delete it, or
     * emit a different day per page, and the only symptom was a helper throwing elsewhere.
     * One build must stamp exactly one Singapore day on every page.
     *
     * Deliberately CLOCK-FREE — it compares the pages to each other and checks the shape, so
     * it can never redden on a future build day. The suite is the Netlify build command.
     */
    it("stamps every page with the one day the build was drawn for", () => {
        const stamps = new Map<string, string>();
        for (const page of builtPages()) {
            const found = [...read(page).matchAll(/<meta name="build-date" content="([^"]*)"/g)];
            expect(found.length, `${page} must carry exactly one <meta name="build-date">`).toBe(1);
            expect(found[0][1], `${page}'s build date must be an ISO day`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            stamps.set(page, found[0][1]);
        }
        expect(new Set(stamps.values()).size,
            `one build, one day: saw ${[...new Set(stamps.values())].join(", ")}`).toBe(1);
    });

    /**
     * A CONTROL AND THE PAGE IT OPENS MUST USE THE SAME WORDS, and this is the assertion
     * the previous revision needed and did not have.
     *
     * The goal cards offered "My cycling events" and the page that opened was headed
     * "Cycling patches", so a reader was handed one name and shown another the moment
     * they arrived. Both strings were individually defensible, both were reviewed, and
     * nothing could see the pair because no test read two pages at once.
     *
     * The rename that fixed it was not a preference either: a patch is a race COMPLETED
     * AND EARNED, and that page shows booked outlines beside earned bibs, so "patches"
     * named the wall after a subset of what is on it.
     *
     * Asserted across the built pages, in both directions — every goal control must be
     * headed by its destination, and no OTHER page may claim the same heading, which is
     * what stops the three walls collapsing back onto one title.
     */
    it("heads each destination with the words the control that reaches it wears", () => {
        const home = parseHTML(read("dist/index.html")).document;
        const controls = [...home.querySelectorAll(".events-link")];
        expect(controls.length, "no events controls on the home page — this assertion would be vacuous")
            .toBe(GOALS.length);

        const headings = new Map<string, string>();
        for (const control of controls) {
            const href = control.getAttribute("href")!;
            const label = (control.textContent ?? "").replace(/\s+/g, " ").trim();
            const page = `dist${href.replace(/\/$/, "")}/index.html`;
            expect(existsSync(page), `${href} is linked from a goal card but ${page} was not built`).toBe(true);

            const doc = parseHTML(read(page)).document;
            expect(
                doc.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim(),
                `the control says "${label}" and ${href} is headed differently — a reader is told one name and shown another`,
            ).toBe(label);
            headings.set(href, label);
        }

        const all = builtPages().map((page) => ({
            page,
            h1: parseHTML(read(page)).document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim(),
        })).filter((p) => p.h1);
        expect(new Set(all.map((p) => p.h1)).size, `two pages share a heading: ${all.map((p) => `${p.page} "${p.h1}"`).join(", ")}`)
            .toBe(all.length);
    });

    /**
     * NO PAGE'S CSS IS DUPLICATED ACROSS PAGES — which is what "how much does a visitor
     * download" actually reduces to, and it is NOT the same claim as "exactly one chunk".
     *
     * THIS ASSERTION USED TO SAY `css.length === 1` and the docstring called that "a
     * claim about how much a visitor downloads". It was really a claim about a BYTE
     * COUNT: Astro's `inlineStylesheets: "auto"` inlines a component's scoped CSS up to
     * ~4kB and emits a chunk past it, so "one chunk" held only while `Patch.astro`'s
     * block stayed under the threshold. Adding one 15px line to the bib crossed it, and
     * the count went to two with nothing wrong.
     *
     * Measured both ways before rewriting this, because the change had to be shown to be
     * neutral rather than assumed:
     *
     *     visitor path            before (1 chunk + inline)      after (2 chunks)
     *     / only                  26.3kB                         26.3kB
     *     / then /patches         26.3 + 4.1 inline = 30.4kB     26.3 + 4.2 = 30.5kB
     *     all three patch pages   26.3 + 3 x 4.1 = 38.6kB        26.3 + 4.2 = 30.5kB
     *
     * So the split costs one extra request on the first wall page and SAVES 8kB across
     * the wall, because a chunk is cached where an inline block is re-sent per page. The
     * old assertion would have blocked that as a regression.
     *
     * What is left is the property that cannot be satisfied by luck: the same rule must
     * not ship twice. `pageCss()` stays per-page for the separate question of what the
     * cascade does on one page.
     */
    it("ships no CSS rule on more than one route's worth of files", () => {
        // Selector text is the unit: a rule duplicated across two chunks is bytes every
        // visitor to both pages pays twice, which is the thing the old count stood in for.
        const selectorsOf = (css: string) =>
            new Set([...css.matchAll(/(^|})\s*([^{}@]+)\{/g)].map((m) => m[2].trim()).filter(Boolean));
        const seen = new Map<string, string>();
        const shared: string[] = [];
        for (const {file, css} of cssChunks()) {
            for (const selector of selectorsOf(css)) {
                const first = seen.get(selector);
                if (first !== undefined && first !== file) shared.push(`${selector} in ${first} and ${file}`);
                else seen.set(selector, file);
            }
        }
        expect(shared.slice(0, 5), "these rules are emitted in more than one chunk").toEqual([]);

        // And no page may load a chunk while also inlining the same rules.
        for (const page of builtPages()) {
            const html = read(page);
            const inline = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
            if (inline === "") continue;
            const linked = [...html.matchAll(/rel="stylesheet" href="([^"]+)"/g)]
                .map((m) => read(`dist${m[1]}`)).join("\n");
            const both = [...selectorsOf(inline)].filter((sel) => selectorsOf(linked).has(sel));
            expect(both.slice(0, 5), `${page} both inlines and links these rules`).toEqual([]);
        }
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
     * The survivors in this file are deliberate: they count emitted files as an
     * output-hygiene check and never read a rule out of one. A test that legitimately
     * needs the rules PER FILE — "is this selector shipped twice" is such a question, and
     * `pageCss()` cannot answer it because a shared chunk is inside every page's union —
     * goes through `cssChunks()` in the helpers layer instead.
     */
    it("routes every CSS read in the suite through pageCss()", () => {
        const files = readdirSync("tests", {recursive: true, encoding: "utf8"})
            .filter((f) => f.endsWith(".ts"));
        const offenders = files.filter((f) => {
            // The HELPERS layer owns build-level reads — `pageCss()` is defined in one of
            // them and `cssChunks()` in another — and each says which question it answers.
            // Exempting the directory rather than a growing list of filenames is what keeps
            // this gate structural: a test that needs chunk files goes through a named
            // helper, which is the behaviour being enforced, not an exception to it.
            if (f.startsWith("helpers/")) return false;
            const src = read(`tests/${f}`);
            // ANY literal path INTO the asset directory, whichever function does the
            // reading. The previous pattern matched two spellings only — a
            // readdirSync-then-readFileSync chain, and this file's own `read` helper — so a
            // plain readFileSync of a named chunk inside that directory walked straight
            // through it while the docstring above claimed "every CSS read in the suite".
            // Verified by injecting exactly that in a scratch test file: the old pattern
            // passed it, this one fails it.
            //
            // LISTING the directory stays legal, which is why the path has to go DEEPER
            // than the directory itself: the JavaScript-count gate below lists it and never
            // opens a file, and that is the output-hygiene use this rule was always fine
            // with.
            //
            // NOTE THE SELF-REFERENCE TRAP — this comment cannot spell the path it is
            // matching, or the gate reports this file. It did, once.
            //
            // A computed path still evades this, and that is stated rather than papered
            // over: a regex over source cannot follow a variable. The helpers layer is
            // where computed chunk paths are supposed to live, and it is exempt.
            return /["'`]dist\/_astro\/[^"'`]/.test(src);
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

    it("ships no HTML comments — rationale is source-side only (plan 016)", () => {
        for (const page of builtPages()) {
            expect(read(page), `${page} ships an HTML comment`).not.toContain("<!--");
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

    /**
     * THIS USED TO ASSERT THE GLYPH'S 3:1 AGAINST THE FILL IT RODE. The bar is a 2px rule
     * now and carries no ink at all, so that pair no longer exists — but the assertion is
     * kept in this inverted form rather than deleted, because the defect it caught is one
     * step away at all times. The icon inherited --text, near-white in dark mode, and sat
     * at 1.89:1 on the fill; --on-brand exists because of it.
     *
     * So: the bar must stay a pure graphic. Put a glyph back and this goes red with the
     * instruction to restore the ratio check, instead of the ratio check silently passing
     * over an element it can no longer find. A conditional test that skips when the glyph
     * is absent would have looked like coverage and been none.
     */
    it("keeps the bar a pure graphic, so no ink has to read on the fill", () => {
        const bars = [...parseHTML(read("dist/index.html")).document.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);

        for (const bar of bars) {
            const fill = bar.querySelector(".progress-fill");
            expect(fill, "each progress bar must render a fill").toBeTruthy();
            expect(
                (bar.textContent ?? "").trim(),
                "the bar must carry no text — if it does, it needs the ink-on-fill ratio check this test replaced",
            ).toBe("");
            expect(
                bar.querySelectorAll("*").length,
                "the bar is the track and the fill and nothing else; a third element means ink is back on it "
                + "and SC 1.4.11 needs measuring against --on-brand again (it was 1.89:1 in dark mode once)",
            ).toBe(1);
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

    it("keeps the fill inside the bar, whatever width it resolves to", () => {
        // The fill's width comes from an inline custom property computed from bot data.
        // The track's clip is what makes that safe structurally rather than arithmetically:
        // it holds however the percentage is derived, including if the clamp in
        // ProgressBar.astro is ever removed or gets a sign wrong.
        //
        // Resolved out of the built stylesheet, not from the class token: a utility
        // UnoCSS fails to emit must go red here. An earlier version of this test asserted
        // a layout token instead, which made the guard depend on a second token it never
        // checked — and removing that one left the suite green while putting 8px of the
        // then-glyph on bare track at 1.76:1 (light) and 1.61:1 (dark).
        const css = sheet();
        const bars = [...parseHTML(read("dist/index.html")).document.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);
        for (const track of bars) {
            expect(track.querySelector(".progress-fill"), "each progress bar must render a fill").toBeTruthy();
            expect(
                decl(css, track.getAttribute("class"), "overflow"),
                "the track must clip, so a fill wider than its box cannot paint outside the bar",
            ).toBe("hidden");
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
/**
 * THE GATE WHOSE ABSENCE LET FIVE LINKS SHIP LOOKING LIKE PROSE.
 *
 * Two friends reviewing the site reported that they did not know the goal cards' "My cycling
 * events" could be clicked, and did not know a bib could be. Auditing the class rather than the
 * two instances found three more, of which the worst was never reported because nobody could
 * guess it was a link at all: the company name on each role card carried exactly `text-xs
 * font-light`, the same two classes as the date line directly above it — no colour delta, no
 * glyph, no hover. Measured on the shipped build at 1024x600, the goal-card control against its
 * neighbouring figure line: both rgb(250,250,250), both 12px, no decoration. A contrast ratio of
 * 1.00:1 between a link and a sentence.
 *
 * Every one of those passed every assertion in this suite, because nothing asked the question.
 *
 * WHAT COUNTS AS A SIGNIFIER, and the list is deliberately of KINDS rather than of elements:
 *
 *   1. `.control`          the styled 64x48 box with the offset plate — six social links
 *   1b. `.control-cta`     the same surface holding a label and a trailing mark — the two goal
 *      cards' way out. A separate class rather than a modifier of the first, because the two
 *      declare different boxes; `classList.contains` is exact, so the check below needs both
 *      names and the goal cards' links went unsignified until it had them
 *   2. `.text-link`        the shared text-link idiom — the wall's Home link, the role cards
 *   3. `.patch-filter a`   a bordered chip; the class is on the NAV, so this needs `closest`
 *   4. an icon-only control whose accessible name is carried by an `sr-only` span (the Now
 *      card's explainer, which is a 24px icon target and is legitimately not a text link)
 *   5. `.bib--linked`      the whole bib is the anchor, and its signifier is the visible action
 *      row inside it — required as a DESCENDANT, so wearing the class is not enough
 *
 * NO PER-CATEGORY FLOOR. Asserting that some link of each kind exists would be a hand-counted
 * property of today's content: zero bibs carry a Strava id every January after the rollover, and
 * this suite is the Netlify BUILD COMMAND, so that failure is a failed production deploy caused
 * by ordinary data entry. The loop is vacuous only if a page has no links, which IS checked.
 *
 * It reads the shipped stylesheet through `parseRules` and matches selectors by regex rather
 * than using this file's local `decl(css, classes, prop)` helper, which does a literal `.token{`
 * lookup and so cannot see `.patch-filter[data-astro-cid-…] a[…]{border:…}` — the exact form
 * every Astro scoped style in this repo takes.
 */
/**
 * FORCED COLOURS MUST NOT PAINT A SYSTEM COLOUR ON TOP OF ITSELF.
 *
 * The defect this exists for, measured on this branch before it was closed: the goal card's
 * control had `@media (forced-colors: active) { .events-link span { forced-color-adjust: none;
 * background-color: LinkText } }`. That was written when the anchor had one child — the
 * decorative arrow. Wrapping the label in an element for the text-zoom fix gave it a second,
 * and the label took the arrow's treatment: a LinkText background under the anchor's inherited
 * `color: LinkText`, so the words painted on their own colour. Label ink rgb(0,0,159) on
 * background rgb(0,0,159), 102.95 x 16px, a ratio of exactly 1.00:1 — the whole of the home
 * page's primary call to action reduced to a solid block, on both cards, in a mode this repo
 * deliberately supports.
 *
 * WHY NOTHING CAUGHT IT. Eleven mutations had been run against that component and all were
 * killed; every one of them deleted or altered a DECLARATION, and this defect lived in a
 * SELECTOR's reach. The nearest gate matched the rule by regex and read declarations out of
 * it without ever asking which elements it hits, so it certified the broken selector and the
 * fixed one identically. Resolving the selector against the built DOM is the whole point.
 *
 * THE INVARIANT IS NOT "SUCH A RULE MAY NOT REACH TEXT", and getting that wrong would fail
 * correct code: `.patch-filter a[aria-current="page"]` legitimately paints `background-color:
 * Highlight` on a chip that has words. It is safe because it also declares `color:
 * HighlightText` — the PAIRED system colour, which is the pairing forced-colours mode
 * guarantees a contrast for. So the rule is: opt out and paint a background, and you owe the
 * matched element a foreground that is its background's documented pair.
 */
describe("forced colours never paint a system colour on top of itself", () => {
    // CSS Color 4's system colour pairs, as the pairs a UA guarantees to contrast.
    const PAIRS: Record<string, string[]> = {
        canvas: ["canvastext", "linktext", "visitedtext", "activetext"],
        canvastext: ["canvas"],
        highlight: ["highlighttext"],
        highlighttext: ["highlight"],
        linktext: ["canvas"],
        buttonface: ["buttontext"],
        buttontext: ["buttonface"],
        field: ["fieldtext"],
        fieldtext: ["field"],
    };

    it.each(builtPages())("pairs every opted-out background with a readable foreground (%s)", (page) => {
        const doc = parseHTML(read(page)).document;
        const forced = parseRules(pageCss(page)).filter((r) => (r.at ?? "").includes("forced-colors"));
        expect(forced.length, `${page} ships no forced-colors rules — this assertion would be vacuous`)
            .toBeGreaterThan(0);

        const matches = (sel: string, el: Element) => {
            try {
                return el.matches(structuralSelector(sel));
            } catch {
                return false;
            }
        };

        const offenders: string[] = [];
        for (const rule of forced) {
            if (decl(rule.body, "forced-color-adjust") !== "none") continue;
            const bg = (decl(rule.body, "background-color") ?? decl(rule.body, "background"))?.trim().toLowerCase();
            if (bg === undefined || /^(transparent|none|0)$/.test(bg)) continue;

            for (const sel of rule.selectors) {
                let hit: Element[];
                try {
                    hit = [...doc.querySelectorAll(structuralSelector(sel))];
                } catch {
                    continue;
                }
                for (const el of hit) {
                    // A mark, a bar, a glyph mask — nothing to read, nothing to lose.
                    if (!(el.textContent ?? "").trim()) continue;

                    // It has words. The last forced-colors rule reaching it must give it an ink
                    // that is this background's documented pair.
                    const ink = forced
                        .filter((r) => r.selectors.some((s) => matches(s, el)))
                        .map((r) => decl(r.body, "color"))
                        .filter((v): v is string => v !== undefined)
                        .map((v) => v.trim().toLowerCase())
                        .pop();

                    if (ink === undefined || ink === bg || !(PAIRS[bg] ?? []).includes(ink)) {
                        offenders.push(
                            `${sel} paints ${bg} behind "${(el.textContent ?? "").trim().slice(0, 26)}" `
                            + `(<${el.tagName.toLowerCase()} class="${(el.getAttribute("class") ?? "").slice(0, 30)}">) `
                            + `whose forced-colors ink is ${ink ?? "inherited"}`,
                        );
                    }
                }
            }
        }

        expect(
            [...new Set(offenders)],
            "an element that opts out of forced colours and paints a background must declare the PAIRED "
            + "system foreground. Measured on this branch before the fix: the goal control's label rendered "
            + "LinkText on LinkText across 102.95x16px — contrast exactly 1.00:1, the words gone",
        ).toEqual([]);
    });
});

describe("every link on every page says that it is one", () => {
    it.each(builtPages())("gives each link a signifier a reader can perceive (%s)", (page) => {
        const doc = parseHTML(read(page)).document;
        const links = [...doc.querySelectorAll("a")];
        expect(links.length, `${page} has no links — this assertion would be vacuous`).toBeGreaterThan(0);

        // The bordered-chip case is only a signifier while the border is really shipped, so the
        // rule is read rather than assumed. Same reasoning as the decoration check on the goal
        // card's control: a class proves intent and a rule proves the drawing.
        //
        // AND THE RULE MUST BE UNCONDITIONAL, which the first version of this probe did not
        // require. It accepted ANY `.patch-filter` rule carrying a border — including
        // `.patch-filter a:hover`, which is a signifier only for a reader who has a pointer.
        // A hover-only affordance is the precise defect this whole gate exists to catch, so a
        // gate that accepts one is worse than no gate: deleting the chips' permanent border left
        // the suite green at 264/264. It also matched `.patch-filter-count`, a sibling class that
        // draws nothing, because `\b` treats the hyphen as a boundary — hence the descendant-`a`
        // requirement rather than a bare class match.
        //
        // THE STATE TEST IS STRUCTURAL NOW, AND IT HAD TO BECOME SO. It was a list of pseudo-
        // classes, which was complete for the states that existed when it was written and
        // silently incomplete the moment a held-press state spelled `[data-leaving]` arrived:
        // an attribute is not a pseudo-class, so the held rule read as unconditional and
        // satisfied this check on its own. Measured — with the chips' permanent border deleted
        // the wall shipped borderless prose on all three pages and the suite stayed green at
        // 290/290, which is exactly the "worse than no gate" case the paragraph above names.
        // `isStateful` asks the inverted question (is everything here structure?), so the next
        // state cannot walk through it either. See tests/helpers/css.ts.
        const chipIsDrawn = parseRules(pageCss(page)).some(
            (r) => r.selectors.some((sel) => /\.patch-filter\b[^,]*\ba\b/.test(sel) && !isStateful(sel))
                && (decl(r.body, "border") ?? decl(r.body, "border-color")) !== undefined,
        );

        const unsignified = links.filter((a) => {
            if (a.classList.contains("control")) return false;
            if (a.classList.contains("control-cta")) return false;
            if (a.classList.contains("text-link")) return false;
            if (chipIsDrawn && a.closest(".patch-filter")) return false;
            // An icon-only control: no visible words at all, and its name comes from an sr-only
            // span. If it ever grows visible text it stops qualifying here and must wear an
            // idiom like everything else.
            const srOnly = a.querySelector(".sr-only");
            const visibleText = [...a.childNodes]
                .filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();
            if (srOnly && !visibleText) return false;
            // The whole bib is the anchor; its signifier is the row inside it, not the class.
            if (a.classList.contains("bib--linked") && a.querySelector(".bib-go")) return false;
            return true;
        });

        expect(
            unsignified.map((a) => `${a.getAttribute("href")} "${(a.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 46)}"`),
            `${page} ships links drawn like static text. A link needs one of: .control, .control-cta, .text-link, `
            + "a drawn .patch-filter chip, an sr-only-named icon control, or .bib--linked wrapping a "
            + "visible .bib-go row. This is the gate whose absence let five links ship unreadable as links",
        ).toEqual([]);
    });
});

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

/**
 * A HOVER STYLE MUST NEED A POINTER TO PRODUCE IT.
 *
 * THE DEFECT, reported from a physical iPhone 15 Pro Max against a deploy preview: one goal
 * card's way out sat in accent red while its sibling did not. A touch browser has no pointer
 * to move away, so it applies `:hover` on tap and holds it until the reader taps something
 * else — which draws a persistent selected-looking state on a control that has no such state.
 * On the patch wall it is worse than cosmetic: the sport chips DO have a real current state
 * (`[aria-current="page"]`), and a stuck hover fakes exactly the distinction that row exists
 * to draw.
 *
 * IT WAS SITE-WIDE AND PRE-EXISTING — nine plated controls, three text links, and the wall's
 * chips and bibs — twelve hovered elements on the home page and six more on the wall, counted
 * against the built DOM — with no `(hover: hover)` query anywhere in
 * the repository. So the fix is site-wide too: a variant in `uno.config.ts` emits every
 * `hover:` utility inside the query, and the two hand-written rules carry it in their own
 * preludes.
 *
 * WHY THE GATE IS A UNIVERSAL WITH NO CARVE-OUTS. The two mode overrides on the wall
 * (`@media print`, `@media (forced-colors: active)`) could not misfire on a phone even
 * unguarded — one paints only on paper, the other only recolours an outline that the guard
 * already prevents. Both were still split and guarded, because "this particular hover rule is
 * inert" is an argument that has to be re-made by hand for every future exemption, and the
 * exemption list is where a gate like this rots. A universal is checkable; a universal with
 * two footnotes is a habit.
 *
 * WHAT THIS CANNOT SEE, stated so it is not trusted further than it goes: it reads the sheet,
 * not the screen. It cannot tell whether the guarded rule still paints for a reader who DOES
 * have a pointer — that is a browser measurement, and it is in the PR (mouse held over each
 * control, computed colour read in both device states, with the `(hover: hover)` value read
 * back per state so the emulation lever is proven to have applied).
 */
describe("a hover style needs a pointer to produce it", () => {
    // Matches `:hover` as a real state pseudo-class only. Inside an escaped UnoCSS token
    // (`.hover\:text-...`) the same characters are part of the class NAME — the sibling gate
    // above records the same trap, and getting it wrong here would fail the build on the very
    // utility this rule exists to guard.
    const HOVER = /(?<!\\):hover(?![\w-])/;

    /**
     * IS THIS AT-RULE CONTEXT A POSITIVE HOVER GATE? — and the reason this is a function
     * rather than one regex is that the regex it replaces certified the exact inverse of
     * the invariant.
     *
     * It was `GUARDED = /\(\s*hover\s*:\s*hover\s*\)/`, tested as a SUBSTRING against the
     * joined prelude. That asks whether the text `(hover: hover)` appears, not whether the
     * query is true only where a pointer exists — and three real preludes contain the text
     * while being false, or partly false, on a phone:
     *
     *   @media not (hover: hover)              true ONLY on touch. The defect, inverted.
     *   @media (hover: hover), (hover: none)   a query list is a DISJUNCTION, so it matches touch.
     *   @media (hover: hover) or (hover: none) same, in Media Queries 4 spelling.
     *
     * Built and measured: the first ships a hover style that fires only on a phone, with all
     * 290 tests green. Two review dimensions found this independently.
     *
     * It was also too NARROW in one direction, which is the red-on-correct-code half:
     * `@media (hover)` is the Media Queries 4 boolean form and means exactly `(hover: hover)`
     * (true when the value is not `none`), and it was rejected.
     *
     * THE SHAPE THAT IS ACTUALLY CORRECT, and each clause is here because dropping it breaks
     * a measured case:
     *
     *  - Test each enclosing at-rule SEPARATELY, not the joined string. The PR's own preset
     *    emits the guard as a PARENT at-rule, so an ordinary responsive utility like
     *    `md:hover:font-bold` lands inside TWO nested at-rules — `@media (hover:hover)` around
     *    `@media (min-width:48rem)`. Requiring every at-rule to gate hover reds that correct
     *    code; requiring SOME at-rule to gate it does not.
     *  - Within one prelude, every comma branch must gate hover, because a query list is a
     *    disjunction and one unguarded branch admits touch.
     *  - Reject any prelude carrying `not`. A negation is the cheapest way to invert a
     *    substring test, and nothing in this codebase needs a negated media query.
     *  - Accept `(hover)` and `(hover: hover)`; reject `(hover: none)` and `(any-hover: …)`.
     *    `any-hover` is true if ANY input can hover, which is not the same guarantee.
     */
    const gatesHover = (at: string): boolean => {
        if (!at) return false;
        // `at` is the enclosing preludes joined; split it back into individual at-rules.
        const preludes = at.split("@").map((p) => p.trim()).filter(Boolean);
        return preludes.some((prelude) => {
            if (/\bnot\b/i.test(prelude)) return false;
            if (/\bor\b/i.test(prelude)) return false;
            const branches = prelude.split(",").map((b) => b.trim()).filter(Boolean);
            return branches.length > 0
                && branches.every((b) => /\(\s*hover\s*(?::\s*hover\s*)?\)/.test(b));
        });
    };

    const hoverRules = (page: string) =>
        parseRules(pageCss(page)).filter((r) => r.selectors.some((s) => HOVER.test(s)));

    it("finds hover rules at all, so the assertion below is not vacuous", () => {
        // Counted across every page rather than per page. A per-page floor is a hand-counted
        // one, and it goes red on correct code the day a page legitimately has no hovered
        // element — the same shape as the `toBeGreaterThan(0)` floors this suite has been
        // bitten by before. What must never be zero is the whole site's supply of hover rules,
        // because that is the only thing that makes the guard below mean anything.
        const total = builtPages().reduce((n, page) => n + hoverRules(page).length, 0);
        expect(total, "no page ships a single :hover rule — every assertion below is vacuous").toBeGreaterThan(0);
    });

    it.each(builtPages())("ships no :hover rule outside a (hover: hover) query (%s)", (page) => {
        const unguarded = hoverRules(page)
            .filter((r) => !gatesHover(r.at))
            .map((r) => `${r.at ? `${r.at} ` : "(top level) "}{ ${r.selectors.join(", ")} }`);
        expect(
            [...new Set(unguarded)],
            "a touch browser applies :hover on tap and holds it until the reader taps elsewhere, so an "
            + "unguarded hover rule ships a state that reads as selected on whatever was last pressed. "
            + "Wrap the rule in @media (hover: hover). If this is a UnoCSS utility, there are two causes "
            + "and they need different fixes: a plain `hover:` token that is NOT guarded means the "
            + "hover-needs-a-pointer preset in uno.config.ts has stopped sitting ABOVE presetWind3 "
            + "(variants resolve in preset order, and below it that preset emits nothing at all); "
            + "whereas `group-hover:`, `peer-hover:` and any other token where `hover` is not the "
            + "LEADING variant bypass that preset by design — the preset matches a leading `hover:` "
            + "only, so those must be written as hand-guarded CSS instead. No token of the second kind "
            + "exists in this repository today, and this gate is what keeps it that way",
        ).toEqual([]);
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
    //   uppercase     `text-transform: uppercase`, on three of the bib's own elements —
    //                 its meta row, its unit and its name
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

        // Every selector the sheet defines, split on the commas that SEPARATE them,
        // with the leading class token extracted. Non-class selectors (`body`,
        // `:root[…]`, `main > *`, keyframe stops) are not this test's business.
        //
        // The split has to honour escapes: `grid-rows-[repeat(8,min-content)]` carries
        // a comma of its own, and splitting on it invented two orphan classes that no
        // rule defines and no element could ever wear. See splitSelectorList.
        const orphans = new Set<string>();
        for (const m of css.matchAll(/(^|[{}])([^{}@]+)\{/g)) {
            for (const selector of splitSelectorList(m[2])) {
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
        // og:url NAMES THE PAGE, and must agree with the canonical. It was origin-only
        // from plan 002 — correct while the site had one page, and a defect once it had
        // four: the three /patches routes each advertised the home page to a social
        // card while their own rel=canonical said otherwise. Asserted against the
        // canonical rather than against a literal, so the two cannot drift apart again.
        for (const page of builtPages()) {
            const doc = parseHTML(read(page)).document;
            const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
            const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute("content");
            expect(canonical, `${page} must self-canonicalise`).toBeTruthy();
            expect(ogUrl, `${page}: og:url ${ogUrl} disagrees with canonical ${canonical}`).toBe(canonical);
        }
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
        // A page with no <main> is not a defect — a 404 page is the obvious one — so it
        // is skipped rather than failed, and the non-vacuity floor moves to "at least
        // one page was actually checked". Demanding a <main> everywhere would turn an
        // ordinary future addition into a failed deploy.
        let checked = 0;
        for (const page of builtPages()) {
            const main = parseHTML(read(page)).document.querySelector("main");
            if (!main) continue;
            const cards = main.children.length;
            expect(cards, `${page} renders an empty <main>`).toBeGreaterThan(0);
            expect(
                Math.max(...rungs),
                `${page}: main renders ${cards} children but the delay ladder stops at nth-child(${Math.max(...rungs)})`,
            ).toBeGreaterThanOrEqual(cards);
            checked++;
        }
        expect(checked, "no page has a <main> — the ladder check is vacuous").toBeGreaterThan(0);
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
            // Non-vacuity without a hand-counted number: a page that wears any class at
            // all is enough for the loop below to mean something, and a legitimate new
            // page smaller than today's smallest must not fail a gate about rules.
            expect(tokens.size, `${page} ships no class tokens at all`).toBeGreaterThan(0);
            for (const token of tokens) {
                expect(cssClasses.has(token), `${page}: class "${token}" has no rule in the stylesheet it loads`).toBe(true);
            }
            checked += tokens.size;
        }
        expect(checked, "the home page alone ships more tokens than this — the walk is not reaching every page").toBeGreaterThan(50);
    });
});

/**
 * A TAP HAS TO SHOW SOMETHING, AND IT HAS TO KEEP SHOWING IT UNTIL THE PAGE GOES.
 *
 * Two defects behind one report ("no feedback after I tap", from a phone, with a visitor
 * tapping the goal card's way out several times):
 *
 *   1. `text-link` drew NOTHING on press. Measured on the shipped build, full-viewport pixel
 *      diff between idle and pressed, each row carrying a positive control (an injected garish
 *      `:active`) and a negative one (two captures, no press) so a zero could be told apart
 *      from a broken probe: control-cta 15,243px changed, control 3,336/3,773, bib 8,794,
 *      text-link 0 — on both its wearers. It carried only `hover:`, which PR #95 correctly put
 *      behind a pointer, so on a phone it had nothing at all.
 *   2. Every press ends at touchend, and the reader then waits — 376ms to first paint on a
 *      phone at Slow-4G with a warm cache, unbounded on a worse connection — with nothing on
 *      screen saying the tap landed.
 *
 * These gates hold both halves. They are written against the gate's own PREDICATE as well as
 * what it guards, which is the lesson PR #95 paid for: three gates there passed 290 green
 * tests while accepting the exact defect they existed for.
 */
describe("a press is acknowledged, and the acknowledgement outlives the finger", () => {
    // `:active` as a real state pseudo-class. NOT a substring test: `@media (forced-colors:
    // active)` contains the text and is a mode, not a press, and an escaped UnoCSS token
    // (`.active\:shadow-none`) contains it as part of a class NAME. The sibling hover gate
    // records the same trap for the same reason.
    const ACTIVE = /(?<!\\):active(?![\w-])/;
    const HELD = /\[data-leaving\]/;

    /**
     * WHICH ELEMENTS THE HELD PRESS IS *FOR*, derived from the script's own refusals rather
     * than listed. A list would have to name the bib, and the bib's exclusion is not a fact
     * about bibs — it is a fact about `target="_blank"`, which is Patch.astro's to change.
     * Stating it as a universal over `:active` instead fails the deploy on today's correct
     * code: `.bib--linked:active` is a press this change deliberately never twins, because a
     * new tab means this page does not go anywhere.
     */
    const scriptWouldHold = (a: Element): boolean => {
        const target = a.getAttribute("target");
        if (target && target !== "_self") return false;
        if (a.hasAttribute("download")) return false;
        const href = a.getAttribute("href") ?? "";
        if (href.startsWith("#")) return false;
        return href.length > 0;
    };

    // A rule's declarations as a comparable set. Rule bodies are compared, never their
    // positions: the chips' twin deliberately sits ABOVE `[aria-current="page"]` where its
    // `:active` sibling sits below, so a gate keyed on adjacency would forbid the fix.
    const declSet = (body: string): string =>
        body.split(";").map((d) => d.trim()).filter(Boolean).sort().join(";");

    // The elements a selector reaches, ignoring the state that gates it.
    const reach = (sel: string): string => structuralSelector(sel).replace(HELD, "").trim();

    /*
     * WHAT THE INVARIANT ACTUALLY IS: a press that repaints must still repaint while held.
     * NOT "the two carry identical declarations" — that was the first wording and it forbids a
     * divergence the site deliberately needs. The current sport chip presses to a readable label
     * on its inverted fill and holds to the accent border alone, because holding the label
     * change would sit at 1.37:1 for the whole navigation. Identical-declarations reds on that,
     * i.e. it forbids the accessibility fix it was meant to permit.
     *
     * The overlap requirement is what stops the weaker form being trivially satisfiable: a twin
     * has to touch at least one property the press touches, so it cannot "repaint" with something
     * unrelated and call the obligation discharged.
     */
    //
    // `transition` IS EXCLUDED, and a mutation is why. Every press here also declares
    // `transition: none` (the snap gate above requires it), so counting it made the overlap
    // satisfiable by a twin that repaints NOTHING: replacing the chips' held declarations with
    // `letter-spacing` still shared `transition` and the gate went green. A transition is not
    // ink — it says how a change is timed, not that there is one.
    const PAINTS_NOTHING = new Set(["transition", "transition-property", "transition-duration",
                                    "transition-timing-function", "transition-delay", "will-change"]);
    const props = (bodies: string[]) => new Set(
        bodies.flatMap((b) => b.split(";")).map((d) => d.split(":")[0].trim())
            .filter((p) => p && !PAINTS_NOTHING.has(p)),
    );

    it.each(builtPages())("gives every held-eligible link's press a twin that outlives it (%s)", (page) => {
        const doc = parseHTML(read(page)).document;
        const rules = parseRules(pageCss(page));
        const matching = (el: Element, state: RegExp) => rules
            .filter((r) => r.selectors.some((sel) => state.test(sel) && el.matches(reach(sel))))
            .map((r) => declSet(r.body));

        let checked = 0;
        for (const a of [...doc.querySelectorAll("a")]) {
            if (!scriptWouldHold(a)) continue;
            const press = matching(a, ACTIVE);
            if (!press.length) continue;
            checked++;
            const held = matching(a, HELD);
            const where = `${page}: <a href="${a.getAttribute("href")}">`;
            expect(
                held.length,
                `${where} repaints on :active but has no [data-leaving] twin, so its press vanishes `
                + "the instant the finger lifts and the reader waits with nothing. Add the twin in the "
                + "same shortcut (uno.config.ts) or beside the rule that draws the press.",
            ).toBeGreaterThan(0);
            const shared = [...props(held)].filter((p) => props(press).has(p));
            expect(
                shared.length,
                `${where} has a [data-leaving] rule, but it touches none of the properties the press `
                + `touches (held: ${[...props(held)].join(",")}; press: ${[...props(press)].join(",")}), `
                + "so the held state is not the press outliving the finger — it is something else.",
            ).toBeGreaterThan(0);
        }
        expect(checked, `${page}: no link both draws a press and is held — this assertion is vacuous`).toBeGreaterThan(0);
    });

    it("draws the press on a run of words, not merely a rule that exists", () => {
        // AN EXISTENCE CHECK IS SATISFIED BY THE DEFECT. `.text-link:active {}` ships a rule
        // and paints nothing, which is precisely the state this idiom was measured in at 0
        // changed pixels. So the declaration is what is asserted.
        const rules = parseRules(pageCss()).filter(
            (r) => r.selectors.some((sel) => /\.text-link\b/.test(sel) && ACTIVE.test(sel)),
        );
        expect(rules.length, "`text-link` ships no :active rule — on a phone it acknowledges a tap with nothing").toBeGreaterThan(0);
        expect(
            rules.some((r) => (decl(r.body, "color") ?? "").includes("--accent")),
            "`text-link`'s :active paints no accent ink; the rule exists but the press is invisible",
        ).toBe(true);
    });

    it("snaps the press ink instead of ramping it over the colour transition", () => {
        /*
         * THE ONE CHANNEL THAT NEEDED THIS. Both shortcuts carry `transition-colors
         * duration-300`, and `color` really is in the emitted property list — so on
         * `cubic-bezier(.4,0,.2,1)` a reader gets 8.5% of the accent at a 50ms tap and 36.7%
         * at 90ms. Every press that already worked comes from `transform`, `box-shadow` or
         * `outline`, none of which is in any transition list, which is why they were
         * instantaneous and this one would not have been.
         *
         * A PIXEL PROBE CANNOT SEE THIS, which is why it is asserted statically: the diff
         * thresholds far below 8.5% of the delta, so a ramped press and a snapped one both
         * come back as "something changed".
         */
        for (const page of builtPages()) {
            for (const r of parseRules(pageCss(page))) {
                const gated = r.selectors.some((sel) => ACTIVE.test(sel) || HELD.test(sel));
                if (!gated || decl(r.body, "color") === undefined) continue;
                const transition = decl(r.body, "transition") ?? decl(r.body, "transition-property");
                expect(
                    transition,
                    `${page}: ${r.selectors.join(",")} paints press ink but does not cancel the inherited `
                    + "300ms colour transition, so the press fades in over three times the length of a tap. "
                    + "Pair `active:transition-none` and `data-[leaving]:transition-none` with the ink.",
                ).toBe("none");
            }
        }
    });

    it.each(builtPages())("only clears the held press on a RESTORE, not on every load (%s)", (page) => {
        /*
         * THE ONE ASSERTION IN THIS FILE THAT READS SCRIPT RATHER THAN CSS, and it is here
         * because the defect it names actually shipped and no gate saw it.
         *
         * `pageshow` fires on EVERY presentation of a document, including the ordinary first
         * load, immediately after `load` — measured at 44ms warm and 468ms on Slow-4G against
         * the built site. Registered unguarded it deleted the hold of any tap that landed
         * before `load`, and cleared the 8s fallback with it, so the feature was off for
         * precisely the reader it exists for: the one whose page is still loading when they
         * tap. A device check does not catch it, because a human taps a page that has settled.
         *
         * A text assertion is a blunt instrument and is the right one here: there is no browser
         * in this suite, the handler is four tokens long, and the failure it guards is a
         * silently-absent conditional rather than anything a DOM could show.
         */
        // Comments are NOT stripped from an `is:inline` script, and the handler carries a long
        // one — a fixed-width window after the event name matched nothing on any page and broke
        // the baseline. Strip comments first, then the statement is four tokens.
        const script = read(page)
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
        const handler = script.match(/addEventListener\(\s*["']pageshow["'][\s\S]*?\}\s*\)\s*;/);
        expect(handler, `${page} registers no pageshow handler — the held press now survives a `
            + "bfcache restore, so a reader who goes back finds a control still drawn pressed").not.toBeNull();
        expect(
            /\bpersisted\b/.test(handler![0]),
            `${page} clears the held press on EVERY pageshow, not only a bfcache restore. `
            + "pageshow fires on the ordinary first load too, so this deletes the hold of any tap "
            + "that lands before `load` — the slow-connection reader the whole mechanism is for. "
            + "Guard it with `if (event.persisted)`.",
        ).toBe(true);
    });

    it("keeps the platform's own tap flash, and keeps it last", () => {
        /*
         * The preflight sets `-webkit-tap-highlight-color: transparent` on `html, :host`, and
         * both it and the override are one element selector — equal specificity, so ORDER is
         * the entire mechanism. Asserting only that the declaration ships would pass on a
         * build where the preflight still wins, which is the build this fixes.
         */
        const css = pageCss();
        const rules = parseRules(css).filter((r) => decl(r.body, "-webkit-tap-highlight-color") !== undefined);
        expect(rules.length, "nothing sets -webkit-tap-highlight-color — the preflight's `transparent` is unopposed").toBeGreaterThan(1);
        const winner = (decl(rules[rules.length - 1].body, "-webkit-tap-highlight-color") ?? "").trim();
        // The WHOLE value, not a substring of it — `color-mix(in srgb, var(--accent) 18%,
        // transparent)` legitimately names `transparent` as the thing it mixes toward, and a
        // substring test therefore reds on exactly the correct value. (It did, first run.)
        expect(
            winner === "transparent" || /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(winner),
            `the last tap-highlight rule in the sheet resolves to ${winner} — a press paints nothing on a `
            + "touch device that has no other affordance for it",
        ).toBe(false);
        expect(winner, "the surviving tap highlight is not the themed one").toContain("--accent");
    });

    it("lets the entrance paint at full ink rather than fading in", () => {
        /*
         * Chromium records no contentful paint for a composited opacity animation until it
         * resolves, so a `from { opacity: 0 }` here is a wait the reader pays on arrival:
         * measured tap-to-full-contrast-ink ~870ms before, ~500ms after, on a phone at
         * Slow-4G. (FCP reads 788 -> 396ms cold, but that delta is exactly the 0.4s duration
         * in both the cold and warm runs — quote it as FCP, not as legibility.)
         *
         * Scoped to `card-in` by name rather than to every keyframe: a fade is a perfectly
         * good device elsewhere, and the broad form reds on correct code the moment anything
         * else animates opacity.
         */
        // `\b` does not survive a trailing `%` — it needs a word character on one side, and
        // `0%` ends the token. The first draft of this line therefore matched nothing and
        // failed with "has it been renamed?" on a keyframe that was right there.
        const step = parseRules(pageCss()).find(
            (r) => /@keyframes\s+card-in\b/.test(r.at)
                && r.selectors.some((sel) => /^(0%|from)$/.test(sel.trim())),
        );
        expect(step, "the card-in entrance has no from-step — has it been renamed?").toBeDefined();
        expect(
            decl(step!.body, "opacity"),
            "card-in starts from an opacity again. That defers first contentful paint to the END of the "
            + "animation: measured tap-to-full-contrast-ink ~500ms -> ~870ms on a phone at Slow-4G.",
        ).toBeUndefined();
        // The rise is the half worth keeping, and it must stay an absolute length: `40%` is 40%
        // of each child's OWN height, which drew the whole page up to 282px out of place with
        // 327.6px clipped by `main` once the fade stopped hiding it.
        const travel = decl(step!.body, "transform") ?? "";
        expect(travel, "card-in no longer moves anything — the entrance is gone, not fixed").toContain("translateY");
        expect(travel, "card-in's travel is proportional again; at 40% the first frame is the page drawn "
            + "up to 282px out of place, with 327.6px of it clipped by main's own overflow").not.toMatch(/%/);
    });
});

describe("hashed assets are cached forever, and are hashed", () => {
    it("declares the immutable header for /_astro/", () => {
        /*
         * ASSERTED AGAINST THE EMITTED ARTIFACT, not against the source file, and that is
         * the whole point of the port. The old form read `netlify.toml` — a file the host
         * parsed and the build never touched, so the assertion proved a rule was WRITTEN
         * rather than SHIPPED. `public/_headers` is copied verbatim by Astro, so reading
         * `dist/_headers` proves the header reached the output the deploy uploads. It also
         * survives the next host change: nothing here names a platform.
         */
        // Asked with existsSync rather than by reading, because `read` throws ENOENT and a
        // stack trace does not tell you WHICH file the deploy will be missing or why it
        // matters. The first draft of this line asserted on the contents and the message
        // below was unreachable.
        expect(existsSync("dist/_headers"), "dist/_headers is missing — public/_headers did not "
            + "reach the build, so Cloudflare Pages will serve /_astro/ with no cache header at "
            + "all").toBe(true);
        const headers = read("dist/_headers");
        const rule = headers.split(/\n(?=\S)/).find((block) => block.startsWith("/_astro/*"));
        expect(rule, "dist/_headers no longer caches /_astro/*; every hashed asset costs a "
            + "render-blocking round trip to be told it has not changed (measured 168ms and 175ms, "
            + "transferSize 300 — a 304 carrying no content)").toBeDefined();
        expect(rule!.replace(/\s+/g, " ")).toMatch(/Cache-Control: public, max-age=31536000, immutable/i);
    });

    it("only emits content-addressed filenames there, which is what makes that safe", () => {
        /*
         * THE PRECONDITION IS THE THING WORTH GATING, not the header. `immutable` for a year is
         * correct exactly while a URL can never mean two things, and that holds because Astro
         * puts a hash of the file's own contents in its name. The day one asset lands there
         * without a hash, this rule serves a stale file for a year and nothing else would say so.
         */
        const files = readdirSync("dist/_astro");
        expect(files.length, "dist/_astro is empty — this assertion is vacuous").toBeGreaterThan(0);
        const unhashed = files.filter((f) => !/\.[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(f));
        expect(unhashed, "these /_astro/ assets carry no content hash, so the immutable header in "
            + "dist/_headers would pin a stale file for a year").toEqual([]);
    });
});
