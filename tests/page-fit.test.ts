import {describe, expect, it} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {appliesBelow, decl, effectiveDecl, isKeyframeStep, minWidthOf, parseRules, structuralSelector} from "./helpers/css";

/**
 * The page must be allowed to be taller than the viewport.
 *
 * THE DEFECT THIS PINS. `<body>` carried an exact viewport height from the medium
 * breakpoint up, while the single-screen bento contract it was serving is defined
 * on `<main>` against the LARGE breakpoint. Between 768px and 1023px the grid is
 * two columns, so the same content is about 1160px tall; the implicit `auto` rows
 * were compressed to fit the viewport instead, and every card's own
 * `overflow-hidden` ate the difference. Measured on production at 768x900, each
 * card's descendants against that card's own PADDING box: FOUR of the eight lost
 * content — the intro card 98.45px (its entire second row of controls), the Now
 * card 9.23px (the closing line of its copy), and each goal card 5.86px (the
 * "last year's" line). The intro card's figure becomes 102.45px once the controls
 * are 2px taller. From 800 to 1023px it is two cards, worst 76.13px falling to
 * 62.58px; at 768x1024 it is one, 36.61px.
 *
 * An earlier revision of this comment said "six of the eight", which was wrong and
 * is worth recording as a method failure rather than a typo: the six came from a
 * `scrollHeight - clientHeight` probe, which over-reports because an inline-block
 * icon inflates the scrollable-overflow rectangle. That instrument was retired
 * for exactly this reason and its NUMBER was kept anyway. Retiring a measuring
 * tool means re-deriving every figure it produced.
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
 * outermost box be given a DEFINITE height — one its content cannot grow past.
 * Definiteness is the invariant, not the unit it is written in: an earlier
 * revision of this file policed only viewport-relative values, and an exact
 * `height: 900px` alongside the floor walked straight through it and put 102.45px
 * of clipping back on the intro card with the whole suite green — see
 * `isDefiniteSize`, and `appliesBelow` for the same mistake made about how a rule
 * is gated rather than what it declares.
 *
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

    /**
     * A block-size value that ties the box to the viewport or its parent. Used
     * only for the FLOOR, where being viewport-relative is the point: the floor
     * exists so a short page still fills the screen, which a length cannot do.
     */
    const isViewportBound = (value: string | undefined) =>
        Boolean(value) && /(?:^|[\s(])-?[\d.]+(?:vh|dvh|svh|lvh|%)/.test(value!);

    /**
     * A block-size value that makes the box DEFINITE, i.e. able to cap its
     * content — any length or percentage, in any unit, at any depth inside
     * `calc()`/`min()`/`max()`/`clamp()`.
     *
     * This is deliberately much wider than `isViewportBound`, and the width is
     * the whole point. An earlier revision policed only viewport-relative
     * values, which let the defect straight back in: keeping the floor and
     * adding an exact `height: 900px` beside it reproduced the original symptom
     * — 37 overflowing elements at 768x600 and 102.45px sheared off the intro
     * card's second row of controls — with the whole suite green. What
     * compresses the grid is *definiteness*, not the unit it is written in, so
     * that is what this matches.
     */
    const isDefiniteSize = (value: string | undefined) => {
        if (value === undefined) return false;
        const v = value.trim().toLowerCase();
        if (v === "") return false;
        // INVERTED on purpose: everything is definite except the keywords that
        // leave a box free to size to its content. Enumerating units instead was
        // tried and leaks by construction — a list containing `dvh` and `vh` still
        // let `100dvb`, `100vb` and `50vi` through green, and CSS keeps adding
        // units. This way a value nobody anticipated is treated as capping, which
        // is the safe direction: the cost of a false positive is one deliberate
        // keyword added here, and the cost of a false negative is shipping the
        // defect through a green deploy gate.
        //
        // `auto` and `none` must stay exempt for a second reason beyond being
        // correct: the preflight ships `img,video{height:auto}` and
        // `::-webkit-inner-spin-button{height:auto}`, and a pseudo-element
        // selector reduces to `*`, which reaches <body> and <main>. Keying on
        // "is the property declared at all" reds the clean build for that reason.
        return !/^(auto|none|inherit|initial|unset|revert|revert-layer|fit-content|max-content|min-content|stretch|-webkit-fill-available)$/.test(v);
    };

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
        // Two bounds, and they belong at different scopes.
        //
        // PER RULE, a lower bound: no floor may reach below the medium breakpoint,
        // where the page is one column and a viewport floor would stretch the last
        // card for no reason.
        const MD = 768;
        for (const {r} of floors) {
            const gate = minWidthOf(r);
            expect(gate, `the body height floor in "${r.at || "top level"}" must be width-gated`).not.toBeNull();
            expect(gate!, "the body height floor must not apply below the medium breakpoint").toBeGreaterThanOrEqual(MD);
        }

        // ACROSS THE SET, an upper bound: some floor must start AT the medium
        // breakpoint, so the whole md range is covered. The per-rule check alone
        // is one-sided — moving the only floor to the large breakpoint left every
        // md viewport with no floor at all and the suite green.
        //
        // Asserted on the set rather than per rule on purpose: per rule it also
        // forbids a redundant second floor at a higher breakpoint, which renders
        // identically to one floor and is not a defect.
        const gates = floors.map(({r}) => minWidthOf(r)!).filter((g) => g !== null);
        expect(
            Math.min(...gates),
            `a body height floor must start exactly at the medium breakpoint (${MD}px), or the md range — where the clipping was — has no floor; found floors gated at ${JSON.stringify(gates)}`,
        ).toBe(MD);

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
                    return isDefiniteSize(value) ? [describeRule(r, prop, value!)] : [];
                });
            return found;
        });
        expect(
            [...new Set(offenders)],
            "<body> must state a height MINIMUM and never a definite height or maximum, in any unit: at 768-1023px the content is ~1160px tall, and a body that cannot exceed the space it is given compressed the grid's auto rows until four of the eight cards clipped, with no scrollbar to recover any of it",
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
            // Anything that can reach a viewport narrower than lg is in scope,
            // however it is gated. See `appliesBelow` — the predicate this
            // replaced excluded any rule carrying a max-width condition, which
            // let a lock scoped to exactly the md range through untested.
            if (!appliesBelow(r, LG)) return [];
            const gate = minWidthOf(r);
            return (["height", "max-height", "block-size", "max-block-size"] as const)
                .flatMap((prop) => {
                    const value = decl(r.body, prop);
                    return isDefiniteSize(value) ? [`${describeRule(r, prop, value!)} — gated at ${gate ?? "no width"}`] : [];
                });
        });
        expect(
            [...new Set(offenders)],
            `only the large breakpoint (>=${LG}px) may give <main> a definite height, in any unit; below it the grid is two columns and the content does not fit`,
        ).toEqual([]);
    });

    it("keeps the fixed row template at the large breakpoint too", () => {
        // A fixed row template is the other way to compress the grid: eight equal
        // fraction rows in a container shorter than the content clips just as
        // effectively as an exact body height, and no assertion above would see it.
        const offenders = rulesMatching(main).flatMap((r) => {
            if (!appliesBelow(r, LG)) return [];
            const gate = minWidthOf(r);
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

    it("does not let a card opt out of clipping instead of fitting, at any width", () => {
        // The tempting cheap fix, recorded so it is rejected on purpose rather
        // than rediscovered: dropping overflow-hidden from the cards stops the
        // clipping and lets content spill across the card's own border and its
        // neighbours. The cards' clipping is load-bearing besides — the intro
        // portrait bleeds 72px past the card's right edge by design and that
        // clipping is what shapes it. Cards must clip; the layout must fit.
        // Every card at any depth — one column is wrapped in a layout box, and a
        // wrapper is not a card and does not need to clip.
        //
        // WIDTH AND ORDER BOTH DECIDE, and an earlier revision of this assertion
        // asked for neither: it took the first shape that comes to mind, "SOME
        // rule matching this card declares an overflow that clips", with no
        // viewport and no resolution of which rule wins. Three ways through it,
        // each measured with the whole suite at 136 green:
        //   - gating the clipping to the large breakpoint stops every card
        //     clipping at every width below it, and the intro portrait then runs
        //     past the card's own border-box right edge with nothing to shape it —
        //     71px of it, CDP-measured by the review that found this hole and
        //     quoted rather than re-derived here;
        //   - keeping the clipping and adding a later override below lg does the
        //     same, because a first rule that declares the right value satisfies
        //     any `some()` while the later rule is what the browser uses;
        //   - overriding one AXIS below lg does it too, since the portrait bleeds
        //     sideways and this only ever read the shorthand.
        // So the question has to be "what value WINS, at the widths this file is
        // about" — see `effectiveDecl`.
        const cards = [...document.querySelectorAll("main [data-card]")];
        expect(cards.length, "no cards found").toBeGreaterThan(0);

        // The md range is where the clipping ate content (768 is its lower edge,
        // 1023 its upper one, and the emitted `lt-lg` bound is 1023.9px, so 1023
        // is inside it); 375 is a phone, where the portrait's deliberate bleed is
        // shaped by the same clipping; LG is the single-screen layout itself.
        const CLIP_WIDTHS = [375, 768, 1023, LG] as const;
        const AXIS_INDEX = {"overflow-x": 0, "overflow-y": 1} as const;

        for (const card of cards) {
            const matching = rulesMatching(card);
            const where = `<${card.tagName.toLowerCase()} class="${card.getAttribute("class")}">`;

            // THE PRECONDITION `effectiveDecl` NEEDS, asserted rather than
            // assumed: it resolves by sheet order, which is only the cascade's
            // answer while every competing rule has the same specificity. Every
            // rule that reaches a card today is one class, so this holds — and if
            // a higher-specificity or element-plus-class override ever declares
            // an overflow here, this fails loudly instead of letting the resolver
            // quietly report the wrong winner. An escaped `\:` inside a variant
            // token is part of the class name, so `.lt-lg\:overflow-x-visible`
            // still counts as one class.
            const singleClass = /^\.(?:\\.|[\w-])+$/;
            const overflowRules = matching.filter((r) => ["overflow", "overflow-x", "overflow-y", "overflow-block", "overflow-inline"]
                .some((prop) => decl(r.body, prop) !== undefined));
            for (const r of overflowRules) {
                const reaching = r.selectors.map(structuralSelector)
                    .filter((s) => Boolean(s) && [...document.querySelectorAll(s)].includes(card as never));
                expect(
                    reaching.every((s) => singleClass.test(s)),
                    `${JSON.stringify(reaching)} declares an overflow on a card through more than a single class, so this test's by-sheet-order resolution no longer decides the winner — resolve specificity here before trusting it again`,
                ).toBe(true);
            }

            for (const width of CLIP_WIDTHS) {
                for (const axis of ["overflow-x", "overflow-y"] as const) {
                    // The shorthand and this axis's longhand compete as one; the
                    // shorthand's two-value form gives x then y.
                    const won = effectiveDecl(matching, ["overflow", axis], width);
                    const parts = won?.value.split(/\s+/) ?? [];
                    const value = won === null
                        ? "nothing declared"
                        : (won.prop === "overflow" ? parts[AXIS_INDEX[axis]] ?? parts[0] : parts[0]);
                    expect(
                        /^(hidden|clip)$/.test(value),
                        `at ${width}px ${where} resolves ${axis}: ${value}${won ? ` — from ${describeRule(won.rule, won.prop, won.value)}` : ""}; every card must clip on both axes at every width, or the md-range overflow spills instead of being contained and the intro portrait's bleed loses the edge that shapes it`,
                    ).toBe(true);
                }
            }
        }
    });
});
