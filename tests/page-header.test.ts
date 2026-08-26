import {readFileSync} from "node:fs";
import {parseHTML} from "linkedom";
import {describe, expect, it} from "vitest";

import {builtPages} from "./helpers/pages";
import {decl, isStateful, pageCss, parseRules} from "./helpers/css";

/**
 * THE PAGE HEADER: ONE COMPONENT, FOUR CONSUMERS, AND TWO DELIBERATE EXCEPTIONS.
 *
 * `/design` and the wall's three routes each drew their own way back before this, and only one
 * of the four also carried a theme toggle — so a reader who arrived on the wall from a search
 * result could not change theme without navigating to a different page first. That functional
 * gap was possible BECAUSE of the duplication, which is what makes this suite worth having:
 * the defect it guards is not "the header looks wrong", it is "a fifth page grew a fifth way
 * back by hand and nobody noticed".
 *
 * THE ASSERTION THAT MATTERS MOST IS POSITIONAL, AND IT IS INVISIBLE TO EVERY OTHER GATE HERE.
 * A `<header>` that is a child of `<body>` is a `banner` landmark; move it inside `<main>` —
 * for a layout reason that will look excellent at the time — and it is silently demoted to a
 * generic box. Nothing renders differently, no class changes, no snapshot moves, and assistive
 * technology loses a landmark. So this file asserts the RELATIONSHIP rather than the markup:
 * the element exists, its parent is the body, it is not inside `main`, and it precedes `main`
 * in document order.
 *
 * THE TWO PAGES WITHOUT ONE ARE ASSERTED AS FACTS ABOUT THOSE PAGES, not skipped. The home
 * page's `<main>` has a measured height budget with zero slack and its chrome lives in the
 * intro card; the 404's way back IS its content. Writing them as a named pair means a THIRD
 * bare page fails here rather than passing as one more exemption — the same shape the two
 * 404 exemptions in `tests/build-output.test.ts` are written in.
 *
 * THE TOGGLE'S BOX IS READ FROM THE SHEET RATHER THAN NAMED, and the reason has since been
 * paid out rather than merely anticipated. Phrasing it as "wears the chip, not the plate" would
 * have hard-coded a class this repository was planning to retire — and did retire, in the pass
 * that made this toggle's box its only box — and a gate that names a class with no rule
 * certifies whatever it finds. So the glyph box is discovered by its own signature — the quiet
 * surface at a pinned square — and the toggle is held to wearing whatever class that rule
 * defines. That retirement was a rewording here and nothing more, which is what this phrasing
 * bought.
 */

const read = (p: string) => readFileSync(p, "utf8");

/** The two pages that carry no header, and why. Asserted, so a third one fails. */
const BARE = ["dist/index.html", "dist/404.html"];

const headerOf = (page: string) => {
    const {document} = parseHTML(read(page));
    return {document, headers: [...document.querySelectorAll("header")]};
};

describe("the page header is one component, on every page but two", () => {
    it("puts exactly one header on every page that is not deliberately bare", () => {
        const pages = builtPages();
        expect(pages.length, "no built pages — every assertion here would be vacuous")
            .toBeGreaterThan(4);
        for (const page of BARE) {
            expect(pages, `${page} is not in the build, so its exemption below is about nothing`)
                .toContain(page);
        }
        const headed = pages.filter((p) => !BARE.includes(p));
        expect(headed.length, "fewer than four headed pages — the header has stopped being shared")
            .toBeGreaterThanOrEqual(4);
        for (const page of headed) {
            const {headers} = headerOf(page);
            expect(headers.length, `${page} carries ${headers.length} headers. A page has one or, `
                + "if it is one of the two named exceptions, none").toBe(1);
        }
    });

    it("leaves the home page and the 404 bare, as facts about those two pages", () => {
        for (const page of BARE) {
            const {headers} = headerOf(page);
            expect(headers.length, `${page} has grown a header. The home page's <main> has a `
                + "measured height budget with zero slack and its chrome is the intro card; the "
                + "404's way back is its content. If a third page should be bare, it needs its own "
                + "reason here rather than being added to a list").toBe(0);
        }
    });

    /**
     * THE BANNER LANDMARK, WHICH IS A POSITION AND NOT A CLASS. This is the assertion the whole
     * file is for: `<header>` maps to `banner` only when it is not a descendant of an
     * `article`, `aside`, `main`, `nav` or `section`. Nesting it inside `<main>` changes nothing
     * a reader can see and deletes the landmark.
     */
    it("keeps the header a sibling of main, ahead of it, so it stays a banner landmark", () => {
        const headed = builtPages().filter((p) => !BARE.includes(p));
        let checked = 0;
        for (const page of headed) {
            const {document, headers} = headerOf(page);
            const header = headers[0];
            const main = document.querySelector("main");
            expect(main, `${page} has no <main> to be a sibling of`).toBeTruthy();

            expect(header.closest("main"), `${page} nests its <header> inside <main>, which demotes `
                + "it out of the banner role. Nothing renders differently and no other gate here "
                + "can see it").toBeNull();
            expect(header.parentElement?.tagName?.toLowerCase(),
                `${page} does not hang its <header> off the body`).toBe("body");
            expect(main!.parentElement?.tagName?.toLowerCase(),
                `${page} does not hang its <main> off the body, so the two are not siblings`).toBe("body");

            // Document order: the header must come first. `compareDocumentPosition` returns
            // FOLLOWING (4) when the argument comes after the node it is called on.
            const order = [...document.body.children];
            expect(order.indexOf(header), `${page} places its <header> after <main>`)
                .toBeLessThan(order.indexOf(main!));
            checked++;
        }
        expect(checked, "no page was checked — this assertion would be vacuous").toBeGreaterThanOrEqual(4);
    });

    it("gives every headed page exactly one theme toggle, inside the header", () => {
        const headed = builtPages().filter((p) => !BARE.includes(p));
        for (const page of headed) {
            const {document, headers} = headerOf(page);
            const toggles = [...document.querySelectorAll("#theme-toggle")];
            expect(toggles.length, `${page} carries ${toggles.length} theme toggles`).toBe(1);
            expect(headers[0].contains(toggles[0]), `${page} puts its theme toggle outside the header`)
                .toBe(true);
        }
    });

    /**
     * The glyph box, discovered by the quiet surface's own signature at a pinned square rather
     * than by naming a class. Phrased this way deliberately, and the plated icon box it was
     * guarding against has since gone: an assertion reading "wears the plate, not the chip"
     * would now name a class with no rule at all, which is a gate that certifies whatever it
     * finds.
     */
    it("puts the toggle in the header's own icon box, whatever that box is called", () => {
        const rules = parseRules(pageCss("dist/patches/index.html"));
        const glyphBox = rules.filter((r) =>
            !r.nested
            && /border-color:\s*color-mix\([^)]*var\(--text\)/.test(r.body)
            && /background-color:\s*var\(--background\)/.test(r.body)
            && decl(r.body, "width") !== undefined
            && decl(r.body, "width") === decl(r.body, "height"));
        const names = [...new Set(glyphBox.flatMap((r) => r.selectors)
            .filter((s) => !isStateful(s))
            .map((s) => s.match(/^\.((?:\\.|[\w-])+)$/)?.[1])
            .filter((s): s is string => Boolean(s)))];
        expect(names.length, "no square icon box on the quiet surface ships a rule, so this "
            + "assertion has nothing to hold the toggle to").toBe(1);

        for (const page of builtPages().filter((p) => !BARE.includes(p))) {
            const {document} = parseHTML(read(page));
            const toggle = document.querySelector("#theme-toggle")!;
            expect([...toggle.classList], `${page}: the header's toggle does not wear the icon box `
                + `the sheet defines (${names[0]})`).toContain(names[0]);
        }
    });

    /**
     * ONE ADDRESS PER PAGE. The layout receives `markdown` once and hands it to BOTH the head's
     * `rel="alternate"` and the header's chip, so the announcement and the link are one value
     * passed once. A page that derived the chip's href separately would be one edit away from
     * advertising one URL and linking another, and both would still be real pages.
     */
    it("links the same markdown address the head announces, byte for byte", () => {
        let checked = 0;
        for (const page of builtPages().filter((p) => !BARE.includes(p))) {
            const {document, headers} = headerOf(page);
            const announced = document.querySelector('link[rel="alternate"][type="text/markdown"]')
                ?.getAttribute("href");
            const chip = [...headers[0].querySelectorAll("a")]
                .map((a) => a.getAttribute("href"))
                .filter((h) => h?.endsWith(".md"));
            if (announced === undefined || announced === null) {
                expect(chip, `${page} announces no twin but its header links one`).toEqual([]);
                continue;
            }
            expect(chip, `${page} announces ${announced} and its header offers ${chip.length} `
                + "markdown links").toHaveLength(1);
            expect(chip[0], `${page}: the header's markdown chip and the head's alternate are two `
                + "different addresses for one document").toBe(announced);
            checked++;
        }
        expect(checked, "no page announced a twin — this assertion would be vacuous")
            .toBeGreaterThan(1);
    });

    /**
     * THE LOCAL HALF OF THE BOX RULE. `tests/control-geometry.test.ts` owns the general form —
     * exactly one rule in the sheet may declare a control's box — and this is the same property
     * asked of this component's own two layout classes, which are the rules most likely to
     * acquire a width "just for the header".
     */
    it("declares no box on anything inside the header", () => {
        const FORBIDDEN = ["width", "height", "min-width", "min-height", "max-width", "max-height",
            "padding", "border"];
        const rules = parseRules(pageCss("dist/patches/index.html"));
        const local = rules.filter((r) => r.selectors.some((s) => /\.page-head(-actions)?\b/.test(s)));
        expect(local.length, "no rule reaches .page-head at all — this component's styles are not "
            + "in the sheet, so the assertion below is vacuous").toBeGreaterThan(0);

        const offenders: string[] = [];
        for (const rule of local) {
            // Only a rule that reaches a DESCENDANT. The header's own padding is its business;
            // a control's box is not.
            const touchesDescendant = rule.selectors.some((s) => /\.page-head(-actions)?\b[^,]*[\s>+~]/.test(s));
            if (!touchesDescendant) continue;
            const declared = FORBIDDEN.filter((p) => decl(rule.body, p) !== undefined);
            if (declared.length) offenders.push(`${rule.selectors.join(",")} {${declared.join(", ")}}`);
        }
        expect(offenders, "the header declares part of a control's box. That box belongs to the "
            + "shortcut alone — a second rule declaring it is the 'declared twice' defect this "
            + "repository has already paid for once").toEqual([]);
    });
});
