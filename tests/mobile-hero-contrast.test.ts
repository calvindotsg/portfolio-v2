import {readFileSync} from "node:fs";
import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";
import {WELCOME} from "../src/content/home";
import {contrast, over} from "./helpers/contrast";
import {pageCss, parseRules} from "./helpers/css";

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
const sheet = () => pageCss();

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

/**
 * The prelude of the media query whose lower width bound RESOLVES to `wantPx` at a
 * 16px root, whatever unit and syntax it is written in, or null.
 *
 * Resolving rather than pattern-matching is the point. Two independent spellings
 * are already in play — lightningcss rewrites `min-width` to range syntax, and the
 * breakpoints are authored in `rem` so they move with the reader's text size — and
 * a literal pattern for one of them does not report "the bound changed unit", it
 * reports that the whole block is missing. `em` and `rem` are the same length here:
 * a media query resolves both against the initial font-size.
 */
const mediaPreludeAt = (css: string, wantPx: number): string | null => {
    for (const m of css.matchAll(/@media\s*\([^)]*\)/g)) {
        const bound = m[0].match(/(?:min-width:\s*|width\s*>=\s*)(-?[\d.]+)(px|r?em)/);
        if (!bound) continue;
        const scale = bound[2] === "px" ? 1 : 16;
        if (parseFloat(bound[1]) * scale === wantPx) return m[0];
    }
    return null;
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


describe("mobile hero legibility", () => {
    /** Worst case per theme: the photo pixel that fights the text colour hardest. */
    const WORST_PHOTO: Record<string, number[]> = {light: [0, 0, 0], dark: [255, 255, 255]};

    it.each(["light", "dark"])("keeps the tagline at 4.5:1 over any photo (%s theme)", (theme) => {
        const css = sheet();

        const photo = over(WORST_PHOTO[theme], mobileOpacity(), token(css, theme, "--card-background"));
        const behindType = over(token(css, theme, "--background"), scrimMix(css), photo);

        expect(contrast(token(css, theme, "--text"), behindType)).toBeGreaterThanOrEqual(4.5);
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

        // EVERY LINE OF THE HERO COPY, counted rather than sampled by tag. This asserted
        // an eyebrow and a count of `h1`s, which pinned the hero's MARKUP where the
        // property is about its EXTENT: the scrim has to cover whatever the copy column
        // holds. The eyebrow has since gone and the two taglines are paragraphs — the
        // scrim's job did not change, so the assertion should not have been able to fail.
        const lines = type!.querySelectorAll("h1, p");
        expect(lines.length, "every line of the hero copy must sit inside the scrimmed block")
            .toBe(WELCOME.description.length);

        /*
         * THE WAY TO THE WALL LEFT THIS BLOCK, AND THE MECHANISM THAT LETS IT IS WHAT IS
         * ASSERTED IN ITS PLACE.
         *
         * It used to be counted as a line of the copy — "a link over an un-scrimmed photo is
         * the same legibility problem as a tagline over one" — and that was true of what it
         * WAS: a run of underlined words with no ground of its own. It is a plated control
         * now, so it paints an OPAQUE page ground and an accent edge before any of its ink
         * lands, exactly as the destinations beside it do and always did. Those have sat
         * outside this block for as long as it has existed, for this reason and no other.
         *
         * SO THE PROPERTY IS UNCHANGED AND THE ASSERTION MOVED WITH THE MECHANISM: nothing
         * legible sits on an unveiled photo. What is asserted is the GROUND rather than the
         * placement, because placement is what changed and the ground is what makes it safe —
         * a control moved out of this block that did NOT declare its own ground would fail
         * here, which is the case that would otherwise ship silently.
         *
         * It must ALSO be outside, and that half is not about contrast at all: this block is
         * stretched by whatever it holds and below `md` the scrim is a pseudo-element of it,
         * so a full-width control inside drags the veil across the photograph — measured at
         * 97.55% of the photo veiled against 81.63%, i.e. the mask's job undone and the
         * portrait's focal point with it.
         */
        const wall = document.querySelector('main a[href="/patches"]');
        expect(wall, "the hero's way to the whole wall must be on the page").toBeTruthy();
        expect(type!.querySelector('a[href="/patches"]'),
            "the way to the wall is a plated control and must stay OUT of the type block: this "
            + "block stretches to what it holds and the scrim is a pseudo-element of it, so a "
            + "full-width control inside drags the veil across the portrait").toBeNull();

        const grounded = [wall!, ...document.querySelectorAll("main .link-strip a")];
        expect(grounded.length, "no control sits outside the scrim — this assertion would be vacuous")
            .toBeGreaterThan(1);
        const sheetRules = parseRules(sheet());
        for (const el of grounded) {
            const classes = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
            const opaque = sheetRules.some((r) => !r.nested
                && r.selectors.some((sel) => classes.some((c) => sel === `.${c}`))
                && /background-color:\s*var\(--background\)/.test(r.body));
            expect(opaque, `<${el.tagName.toLowerCase()} class="${el.getAttribute("class")}"> sits outside the `
                + "scrim and declares no opaque page ground, so its ink lands straight on the photograph "
                + "below md — which is the legibility problem the scrim exists for").toBe(true);
        }
        expect(type!.querySelectorAll("h1").length, "the greeting is the page's one top-level heading")
            .toBe(1);
        expect(document.querySelectorAll("main h1").length,
            "the page must ship exactly one top-level heading, and it must be the greeting").toBe(1);
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
     * The suite is the deploy gate — a red run blocks the deploy — so a silent
     * hole here ships straight to production.
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
        // The md block is found by the width its bound RESOLVES to, not by how that
        // bound is spelled. Two spellings are in play — lightningcss emits
        // `min-width` as range syntax, and the breakpoints are authored in `rem`
        // (uno.config.ts) — and a pattern naming either one literally reports "no
        // md block at all" when the other ships, which reads as a missing safety
        // net rather than the re-spelling it is.
        const mdPrelude = mediaPreludeAt(css, 768);
        expect(mdPrelude, "an md-and-up block must exist to undo the mobile treatment").toBeTruthy();
        const desktop = atRule(css, new RegExp(mdPrelude!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        expect(desktop, "an md-and-up block must exist to undo the mobile treatment").toBeTruthy();

        expect(rule(desktop, "intro-type[^{}]*:{1,2}after")).toMatch(/display:\s*none/);
        expect(rule(desktop, "intro-type[^{}:]*"), "the type block must go back in flow").toMatch(/position:\s*static/);
        expect(rule(desktop, "portrait"), "the feather is mobile-only").toMatch(/mask-image:\s*none/);

        expect(mobileOpacity(), "the phone portrait must run at full strength").toBe(1);
    });
});
