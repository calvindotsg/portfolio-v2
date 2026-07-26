import {describe, expect, it} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {decl, isKeyframeStep, isMaxWidthGated, minWidthOf, parseRules, structuralSelector} from "./helpers/css";

/**
 * The page must be allowed to be taller than the viewport.
 *
 * THE DEFECT THIS PINS. `<body>` carried an exact viewport height from the medium
 * breakpoint up, while the single-screen bento contract it was serving is defined
 * on `<main>` against the LARGE breakpoint. Between 768px and 1023px the grid is
 * two columns, so the same content is about 1160px tall; the implicit `auto` rows
 * were compressed to fit the viewport instead, and every card's own
 * `overflow-hidden` ate the difference. Measured at 768x900: six of the eight
 * cards lost content, worst 98px on `a5c8a43` and 102px once the controls became
 * 2px taller — the intro card's entire second row of controls, the "last year's"
 * line of both goal cards, and the closing line of the Now card.
 *
 * The severity is in one detail that is easy to miss: the body was *exactly* as
 * tall as the viewport, so `document.scrollHeight` never exceeded it and the page
 * could not be scrolled. The content was not below the fold, it was unreachable —
 * silent, total loss for any visitor at a medium width, which includes a tablet
 * held in portrait at exactly 768x1024. Verified fixed at every width from 768 to
 * 1440 in both themes.
 *
 * THE SAME LOCK BROKE THE LARGE BREAKPOINT TOO, at short viewport heights, and
 * that was missed on the first pass. `<main>` carries a 736px floor, so on a
 * viewport shorter than that the exact-height body could not contain it; the
 * body centres its children, so the overflow was split top and bottom, and the
 * top half sat above the scroll origin where no scrolling can reach it. Measured
 * on production: 94px of the first card permanently unreachable at 1024x500, 69px
 * at 550, 44px at 600, 19px at 650, none from 700 up — identical at 1024, 1100,
 * 1280, 1440 and 1920 wide, so it is a function of height alone, and a laptop
 * showing ~650px of viewport after browser chrome is squarely inside it. The
 * `min-height` fix closes this as well: 0 unreachable at every one of those.
 *
 * So the earlier claim that the large breakpoint is left byte-identical holds
 * only for viewports at least 736px tall (which is where it was measured: body,
 * main and all eight card rects unchanged at 1024x768 and up, only the body's
 * resolved `min-height` differing). Below 736px tall the large-breakpoint layout
 * does change, because that is exactly where it was broken.
 *
 * WHAT THIS FILE CANNOT DO, said plainly. There is no layout engine here —
 * linkedom parses, it does not lay out — so nothing below measures a rendered box,
 * a compressed grid row, or a clipped word. It cannot recompute the 98px. What it
 * *can* do is police the structural precondition the defect needed: that the
 * outermost box be pinned to the viewport while its content is free to exceed it.
 * These are therefore assertions about the cascade, and the numbers in the prose
 * above are PINNED from browser measurement, not derived. The harness that
 * produced them (a CDP driver sweeping widths, viewport heights, themes and root
 * font-sizes against a base build) has to be re-run when this layout changes;
 * a green suite here is necessary and nowhere near sufficient.
 */
describe("the page may grow taller than the viewport", () => {
    const css = readFileSync(`dist/_astro/${readdirSync("dist/_astro").find((f) => f.endsWith(".css"))!}`, "utf8");
    const {document} = parseHTML(readFileSync("dist/index.html", "utf8"));
    const rules = parseRules(css);

    /** The breakpoint the single-screen layout is defined against. */
    const LG = 1024;

    /**
     * Every rule that can reach `el`, at any at-rule depth and from any source
     * including an Astro scoped `<style>`. Not wrapped in try/catch on purpose: a
     * selector this cannot parse must go red rather than be silently skipped,
     * which is how a guard like this stops being able to fail.
     */
    const rulesMatching = (el: Element) => rules.filter((rule) =>
        !isKeyframeStep(rule) && rule.selectors.some((selector) => {
            const structural = structuralSelector(selector);
            if (!structural) return false;
            return [...document.querySelectorAll(structural)].includes(el as never);
        }));

    /** A block-size value that ties the box to the viewport or its parent. */
    const isViewportBound = (value: string | undefined) =>
        Boolean(value) && /(?:^|[\s(])-?[\d.]+(?:vh|dvh|svh|lvh|%)/.test(value!);

    const body = document.body;
    const main = document.querySelector("main")!;
    const html = document.documentElement;

    const describeRule = (r: {at: string, selectors: string[]}, prop: string, value: string) =>
        `${r.at ? r.at + " " : ""}${r.selectors.join(",")} { ${prop}: ${value} }`;

    it("finds the elements and the height floor at all, so nothing below is vacuous", () => {
        expect(body, "no <body> in the built page").toBeTruthy();
        expect(main, "no <main> in the built page").toBeTruthy();

        // The floor itself must exist. Deleting it outright would satisfy every
        // negative assertion in this file, so this is the one that fails when the
        // fix is simply reverted to nothing.
        const floors = rulesMatching(body)
            .flatMap((r) => {
                const value = decl(r.body, "min-height");
                return isViewportBound(value) ? [{r, value: value!}] : [];
            });
        expect(
            floors.map(({r, value}) => describeRule(r, "min-height", value)),
            "<body> must carry a viewport-height FLOOR, so a short page still fills the screen and centres",
        ).not.toEqual([]);

        // And it must be gated at the breakpoint where the grid starts, not below
        // it: on a phone the page is one column and a 100vh floor there would
        // stretch the last card for no reason.
        for (const {r} of floors) {
            const gate = minWidthOf(r);
            expect(gate, `the body height floor in "${r.at || "top level"}" must be width-gated`).not.toBeNull();
            expect(gate!, "the body height floor must not apply below the medium breakpoint").toBeGreaterThanOrEqual(768);
        }

        // The rule walker must actually reach the elements, or every negative
        // assertion below passes for the wrong reason.
        expect(rulesMatching(body).length, "no rule in the sheet matches <body> — the selector walker has drifted").toBeGreaterThan(0);
        expect(rulesMatching(main).length, "no rule in the sheet matches <main> — the selector walker has drifted").toBeGreaterThan(0);
    });

    it("never fixes the body's height to the viewport", () => {
        // THE defect, in the one place it did the most damage. A floor lets the
        // page grow; an exact height forbids it, and combined with the cards'
        // overflow-hidden that destroys content rather than scrolling it.
        const offenders = rulesMatching(body).flatMap((r) => {
            const found = (["height", "max-height", "block-size", "max-block-size"] as const)
                .flatMap((prop) => {
                    const value = decl(r.body, prop);
                    return isViewportBound(value) ? [describeRule(r, prop, value!)] : [];
                });
            return found;
        });
        expect(
            [...new Set(offenders)],
            "<body> must state a viewport-height MINIMUM and never an exact or maximum one: at 768-1023px the content is ~1160px tall, and an exact 100vh body compressed the grid's auto rows until six cards clipped, with no scrollbar to recover any of it",
        ).toEqual([]);
    });

    it("keeps the single-screen contract at the large breakpoint, where the grid can hold it", () => {
        // <main> legitimately IS viewport-locked and capped at lg — that is the
        // bento design, and the four-column grid fits there. The defect was that
        // lock reaching a breakpoint lower than the grid that justifies it, so the
        // gate is the assertion. Moving the exact height off <body> and onto
        // <main> at md reproduces the original defect exactly; this is what
        // catches that.
        const offenders = rulesMatching(main).flatMap((r) => {
            if (isMaxWidthGated(r)) return [];
            const gate = minWidthOf(r);
            if (gate !== null && gate >= LG) return [];
            return (["height", "max-height", "block-size", "max-block-size"] as const)
                .flatMap((prop) => {
                    const value = decl(r.body, prop);
                    return isViewportBound(value) ? [`${describeRule(r, prop, value!)} — gated at ${gate ?? "no width"}`] : [];
                });
        });
        expect(
            [...new Set(offenders)],
            `only the large breakpoint (>=${LG}px) may tie <main>'s height to the viewport; below it the grid is two columns and the content does not fit`,
        ).toEqual([]);
    });

    it("keeps the fixed row template at the large breakpoint too", () => {
        // A fixed row template is the other way to compress the grid: eight equal
        // fraction rows in a container shorter than the content clips just as
        // effectively as an exact body height, and no assertion above would see it.
        const offenders = rulesMatching(main).flatMap((r) => {
            if (isMaxWidthGated(r)) return [];
            const gate = minWidthOf(r);
            if (gate !== null && gate >= LG) return [];
            const value = decl(r.body, "grid-template-rows");
            return value ? [`${describeRule(r, "grid-template-rows", value)} — gated at ${gate ?? "no width"}`] : [];
        });
        expect(
            [...new Set(offenders)],
            `only the large breakpoint (>=${LG}px) may impose a fixed row template on <main>`,
        ).toEqual([]);
    });

    it("lets the page scroll when it does grow", () => {
        // Growing is only a fix if the overflow is reachable. Clipping it at the
        // root restores the original symptom — content that exists, occupies
        // layout, and can never be seen — while every assertion above stays green.
        for (const [name, el] of [["html", html], ["body", body]] as const) {
            const offenders = rulesMatching(el).flatMap((r) =>
                (["overflow", "overflow-y", "overflow-block"] as const).flatMap((prop) => {
                    const value = decl(r.body, prop);
                    return value && /\b(hidden|clip)\b/.test(value) ? [describeRule(r, prop, value)] : [];
                }));
            expect(
                [...new Set(offenders)],
                `<${name}> must not clip its own overflow: the page is taller than the viewport between 768px and 1023px, and clipping here makes that content unreachable instead of scrollable`,
            ).toEqual([]);
        }
    });

    it("does not let a card opt out of clipping instead of fitting", () => {
        // The tempting cheap fix, recorded so it is rejected on purpose rather
        // than rediscovered: dropping overflow-hidden from the cards stops the
        // clipping and lets content spill across the card's own border and its
        // neighbours. The cards' clipping is load-bearing besides — the intro
        // portrait bleeds 72px past the card's right edge by design and that
        // clipping is what shapes it. Cards must clip; the layout must fit.
        const cards = [...document.querySelectorAll("main > *")];
        expect(cards.length, "no cards found").toBeGreaterThan(0);
        for (const card of cards) {
            const clips = rulesMatching(card).some((r) => /\b(hidden|clip)\b/.test(decl(r.body, "overflow") ?? ""));
            expect(clips, `<${card.tagName.toLowerCase()} class="${card.getAttribute("class")}"> must keep clipping its overflow`).toBe(true);
        }
    });
});
