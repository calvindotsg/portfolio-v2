import {readFileSync, readdirSync} from "node:fs";
import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

/**
 * Below `md` the portrait is painted behind the tagline. Whether that type is
 * readable is not a matter of taste — it is arithmetic over three shipped
 * numbers: the portrait's mobile opacity, the scrim's mix percentage, and the
 * theme tokens. Get any of them wrong and 20px/300 type lands near 3:1, which
 * is exactly what shipped before this (measured 2.75:1 at 390px, light theme).
 *
 * These recompute WCAG 1.4.3 from the built stylesheet against the worst pixel
 * a photograph can contain — pure black under the light theme, pure white under
 * the dark one — so the guarantee holds for any future portrait. They then pin
 * the structural facts that arithmetic assumes: that the scrim is a child of the
 * copy so it grows with it, that its six geometry numbers are the measured ones,
 * that it paints above the portrait, that it survives a browser without
 * color-mix and forced-colors mode, and that none of it escapes past md.
 *
 * Known limit, stated so nobody mistakes green for proof: vitest has no layout
 * engine here (linkedom only), so nothing below actually computes whether the
 * scrim's box covers the words. The geometry test pins the numbers that were
 * validated by pixel measurement; it cannot re-derive them. Changing any of them
 * means re-running the composited-background harness, not just this suite.
 */
const sheet = () => {
    const f = readdirSync("dist/_astro").find((n) => n.endsWith(".css"))!;
    return readFileSync(`dist/_astro/${f}`, "utf8");
};

const html = () => readFileSync("dist/index.html", "utf8");

/** Bodies of every at-rule whose prelude matches, brace-matched and concatenated. */
const atRule = (css: string, prelude: RegExp) => {
    const bodies: string[] = [];
    for (const at of css.matchAll(new RegExp(prelude, "g"))) {
        let i = css.indexOf("{", at.index!) + 1;
        for (let depth = 1, start = i; i < css.length; i++) {
            if (css[i] === "{") depth++;
            else if (css[i] === "}" && --depth === 0) {
                bodies.push(css.slice(start, i));
                break;
            }
        }
    }
    return bodies.join("\n");
};

/** Declarations of `.intro-type::after` (or `.intro-type`) within some scope. */
const rule = (scope: string, selector: string) =>
    scope.match(new RegExp(`\\.${selector}[^{}]*\\{([^{}]*)\\}`))?.[1] ?? "";

/** Fraction of the page colour the scrim lays over the photo; 0 if absent. */
const scrimMix = (css: string) => {
    const decls = rule(css, "intro-type[^{}]*:{1,2}after");
    if (!decls) return 0;
    const pct = decls.match(/color-mix\(in srgb,\s*var\(--background\)\s*([\d.]+)%/)?.[1];
    expect(pct, "the scrim must mix a percentage of --background, not a literal colour").toBeTruthy();
    return Number(pct) / 100;
};

const token = (css: string, theme: string, name: string) => {
    const block = css.match(new RegExp(`\\[data-theme=['\"]?${theme}['\"]?\\]\\s*\\{([^}]*)\\}`))?.[1] ?? "";
    const hex = block.match(new RegExp(`${name}:\\s*#([0-9a-fA-F]{3,6})`))?.[1];
    expect(hex, `${name} must be defined for the ${theme} theme`).toBeTruthy();
    // The minifier folds #111111 to #111.
    const full = hex!.length === 3 ? [...hex!].map((c) => c + c).join("") : hex!;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

/** Class tokens on the portrait that carry no breakpoint prefix, i.e. what phones get. */
const portraitClasses = () => {
    const {document} = parseHTML(html());
    return (document.querySelector("main img")?.getAttribute("class") ?? "")
        .split(/\s+/)
        .filter((c) => c && !c.includes(":"));
};

/** The portrait's opacity at mobile: any `opacity-NN` utility not behind `md:`. */
const mobileOpacity = () => {
    const mobile = portraitClasses().filter((c) => /^opacity-\d+$/.test(c));
    return mobile.length ? Math.min(...mobile.map((c) => Number(c.split("-")[1]) / 100)) : 1;
};

const srgb = (v: number) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const lum = (c: number[]) => 0.2126 * srgb(c[0]) + 0.7152 * srgb(c[1]) + 0.0722 * srgb(c[2]);
const ratio = (a: number[], b: number[]) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};
const over = (top: number[], alpha: number, bottom: number[]) => top.map((t, i) => alpha * t + (1 - alpha) * bottom[i]);

describe("mobile hero legibility", () => {
    /** Worst case per theme: the photo pixel that fights the text colour hardest. */
    const WORST_PHOTO: Record<string, number[]> = {light: [0, 0, 0], dark: [255, 255, 255]};

    it.each(["light", "dark"])("keeps the tagline at 4.5:1 over any photo (%s theme)", (theme) => {
        const css = sheet();

        const photo = over(WORST_PHOTO[theme], mobileOpacity(), token(css, theme, "--card-background"));
        const behindType = over(token(css, theme, "--background"), scrimMix(css), photo);

        expect(ratio(token(css, theme, "--text"), behindType)).toBeGreaterThanOrEqual(4.5);
    });

    /**
     * The arithmetic is worthless if the scrim stops covering the words. It is a
     * pseudo-element of the type block precisely so it cannot drift from what it
     * protects: lengthen or add a WELCOME.description line and the protected
     * area grows with it. Pin that relationship, not a pixel size.
     */
    it("anchors the scrim to the type block, so it grows with the copy", () => {
        const {document} = parseHTML(html());
        const type = document.querySelector("main .intro-type");
        expect(type, "the welcome copy must sit in a scrim-carrying block").toBeTruthy();

        expect(type!.querySelector("h6"), "the eyebrow must be inside it").toBeTruthy();
        const inside = type!.querySelectorAll("h1").length;
        expect(inside).toBe(document.querySelectorAll("main h1").length);
        expect(inside).toBeGreaterThan(0);
        expect(type!.querySelector("img"), "the portrait must stay outside the scrimmed block").toBeNull();
    });

    /**
     * DOM ancestry says the scrim belongs to the copy; it does not say the scrim
     * COVERS it. That gap is not theoretical — a review panel mutated each of the
     * six numbers below one at a time and the whole suite stayed green while the
     * measured contrast fell to 1.00:1, i.e. the tagline became invisible, worse
     * than the 2.75:1 that motivated this change. vitest has no layout engine
     * (linkedom only), so coverage cannot be computed here; instead every number
     * the 68% arithmetic silently assumes is pinned to the value that was
     * validated by pixel measurement.
     *
     * These are not magic constants to be tuned by eye. If you change one, re-run
     * the composited-background measurement at 360/390/430 in BOTH themes before
     * updating the expectation — that harness is the only thing that can tell you
     * whether the scrim still covers the words.
     *
     * The suite is the deploy gate (netlify.toml runs `pnpm check && pnpm test`),
     * so a silent hole here ships straight to production.
     */
    it("pins the scrim geometry the 68% arithmetic depends on", () => {
        const scrim = rule(sheet(), "intro-type[^{}]*:{1,2}after");
        expect(scrim, "the scrim rule must ship").toBeTruthy();

        // Reach the card's inner edges (its padding is 24px) and finish the
        // downward fade below the last line of copy.
        expect(scrim, "top must clear the card's padding").toMatch(/top:\s*-24px/);
        expect(scrim, "left must clear the card's padding").toMatch(/left:\s*-24px/);
        expect(scrim, "the box must extend below the copy for the fade").toMatch(/bottom:\s*-56px/);
        expect(scrim, "24px left bleed + 52px right ramp").toMatch(/width:\s*calc\(100% \+ 76px\)/);

        // The two mask stops are what actually shape the soft edges.
        expect(scrim, "the downward fade must start 40px before the bottom")
            .toMatch(/linear-gradient\([^)]*calc\(100% - 40px\)/);
        expect(scrim, "the right ramp must start 44px before the right edge")
            .toMatch(/linear-gradient\([^)]*calc\(100% - 44px\)/);
        expect(scrim, "both edges must be cut by the mask, so they survive forced-colors")
            .toMatch(/mask-composite:\s*intersect/);
    });

    /**
     * Both layers live behind the card's content on purpose, and the order
     * between them is the whole fix: scrim over portrait. Swap them and the
     * page still builds, still looks nearly right, and is unreadable again.
     */
    it("paints the scrim above the portrait, both behind the copy", () => {
        const css = sheet();

        const z = portraitClasses().map((c) => c.match(/^z-\[(-?\d+)\]$/)?.[1]).find(Boolean);
        expect(z, "the portrait must carry an explicit negative z-index at phone width").toBeTruthy();
        const portraitZ = Number(z);
        const scrimZ = Number(rule(css, "intro-type[^{}]*:{1,2}after").match(/z-index:\s*(-?\d+)/)?.[1]);

        expect(portraitZ).toBeLessThan(0);
        expect(scrimZ).toBeGreaterThan(portraitZ);
        expect(scrimZ).toBeLessThan(0);
    });

    /**
     * Two rendering modes delete the scrim's gradient outright: a browser
     * without color-mix() drops the declaration, and forced-colors mode forces
     * background-image to none. Images are exempt from colour forcing, so in
     * both cases the type would land straight on the photograph. Each needs an
     * opaque fallback surface, and neither may reintroduce a knocked-back photo.
     */
    it("survives a browser without color-mix and forced-colors mode", () => {
        const css = sheet();

        const fallback = rule(atRule(css, /@supports\s+not\s*\(background(?:-color)?:\s*color-mix/), "intro-type[^{}]*:{1,2}after");
        expect(fallback, "a no-color-mix fallback scrim must ship").toBeTruthy();
        expect(fallback).toContain("var(--card-background)");
        expect(fallback, "the fallback must not depend on the feature it stands in for").not.toContain("color-mix");

        const forced = rule(atRule(css, /@media\s*\(forced-colors\s*:\s*active\)/), "intro-type[^{}]*:{1,2}after");
        expect(forced, "forced-colors mode must repaint the scrim").toBeTruthy();
        // Anchored: an unanchored /canvas/ also matches `canvastext`, the one system
        // colour that would paint the scrim the same colour as the forced text.
        expect(forced.toLowerCase(), "with an opaque system surface, not an author colour")
            .toMatch(/background(?:-color)?:\s*canvas\s*(?:;|$)/);
        expect(forced.toLowerCase(), "CanvasText would make the scrim the colour of the text")
            .not.toMatch(/canvastext/);
    });

    /**
     * The desktop composition (in-flow portrait, pink offset shadow) is the one
     * thing this change may not touch. Every mobile-only declaration is undone
     * inside the md query — including `position: static`, which is not cosmetic:
     * a positioned block paints in a later phase, and where the md grid squeezes
     * this card that flips the tagline and the button row past each other.
     */
    it("confines the mobile treatment to below the md breakpoint", () => {
        const css = sheet();
        // lightningcss emits min-width as range syntax.
        const desktop = atRule(css, /@media\s*\((?:min-width:\s*768px|width\s*>=\s*768px)\)/);
        expect(desktop, "an md-and-up block must exist to undo the mobile treatment").toBeTruthy();

        expect(rule(desktop, "intro-type[^{}]*:{1,2}after")).toMatch(/display:\s*none/);
        expect(rule(desktop, "intro-type[^{}:]*"), "the type block must go back in flow").toMatch(/position:\s*static/);
        expect(rule(desktop, "portrait"), "the feather is mobile-only").toMatch(/mask-image:\s*none/);

        expect(mobileOpacity(), "the phone portrait must run at full strength").toBe(1);
    });
});
