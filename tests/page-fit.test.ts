import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {appliesBelow, decl, effectiveDecl, isKeyframeStep, minWidthOf, pageCss, parseRules, ROW_TEMPLATE_PROPS, rowTracks, structuralSelector, widthConditions} from "./helpers/css";

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
    const css = pageCss();
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

    /**
     * Split a track list at the TOP level, on commas or whitespace, without
     * cutting inside `repeat()`/`minmax()`/`fit-content()`.
     */
    const trackTokens = (value: string) => {
        const out: string[] = [];
        let depth = 0, cur = "";
        for (const ch of value) {
            if (ch === "(") depth++;
            if (ch === ")") depth--;
            if (depth === 0 && (ch === "," || /\s/.test(ch))) {
                if (cur) out.push(cur);
                cur = "";
                continue;
            }
            cur += ch;
        }
        if (cur) out.push(cur);
        return out;
    };

    /**
     * Is ONE track function free to grow to its content?
     *
     * INVERTED for the same reason `isDefiniteSize` is: an allowlist of the
     * things that are safe, so anything unanticipated is red. Policing the
     * spelling `fr` instead leaks by construction — `repeat(8,4.75rem)` has no
     * `fr` in it and reproduces the whole defect (243.1px of ink deleted at
     * 1024x600) with the suite green.
     *
     * `fit-content(limit)` is deliberately NOT here, and the reason is caution
     * rather than measurement: it is the one track function that both names a
     * length and usually ignores it. Measured, `repeat(8,fit-content(4.75rem))`
     * deletes 0.8px and `repeat(8,fit-content(1rem))` 5px — the automatic
     * minimum wins, so it is a false-positive risk here, not a missed defect.
     * Add the keyword if a template ever legitimately wants it; that costs one
     * line, where the leak this list replaced cost 243.1px of deleted ink.
     */
    const isGrowableTrack = (t: string): boolean => {
        if (/^(min-content|max-content|auto)$/.test(t)) return true;
        const mm = /^minmax\((.*)\)$/.exec(t);
        if (mm) {
            const parts = trackTokens(mm[1]);
            return parts.length === 2 && isGrowableTrack(parts[1]);
        }
        return false;
    };

    /** Every track in a template that cannot grow for its content. */
    const fixedTracksIn = (value: string) => {
        const bad: string[] = [];
        for (const tok of trackTokens(value.trim().toLowerCase())) {
            if (/^\[.*\]$/.test(tok)) continue; // line names carry no size
            const rep = /^repeat\((.*)\)$/.exec(tok);
            if (rep) {
                const inner = trackTokens(rep[1]);
                inner.shift(); // the count, or auto-fill/auto-fit
                bad.push(...inner.filter((t) => !isGrowableTrack(t)));
                continue;
            }
            if (!isGrowableTrack(tok)) bad.push(tok);
        }
        return bad;
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

    /**
     * THE CHANNEL THE CASCADE READER STRUCTURALLY CANNOT SEE.
     *
     * Every other assertion in this file reads `pageCss()` — the `<link>`ed sheets
     * and the `<style>` blocks. A `style` attribute is in neither, is unconditional
     * (no media query can gate it) and beats every non-`!important` author rule, so
     * it is at once the highest-specificity way to put a ceiling back and the only
     * one nothing above can read.
     *
     * Measured, not argued. `style="max-height:50rem"` on `<main>` at this revision,
     * with the SC 1.4.12 metrics applied: 858.2px of ink past a clip edge at 1024x600
     * and at 1024x768, 215.6px from 1280x800 up, against 0 on the clean build. The
     * defect this file's budget assertions close measures 1157.7px at 1024x600, so the
     * attribute restores about three quarters of it — and the whole suite stayed green.
     */
    it("lets no inline style attribute cap the page either", () => {
        const props = ["height", "max-height", "block-size", "max-block-size"] as const;
        // <body> and <main> are the two the cascade assertions above name, and they
        // are NOT the whole channel. The same attribute on the right-hand column's
        // flex wrapper — an element no assertion in this file mentions — measures
        // 105.5px of deleted ink at the DEFAULT text size and 860.4px under the SC
        // 1.4.12 metrics, worse than capping <main>. So the sweep is over every
        // element that carries the attribute at all, which is also the only version
        // that cannot rot when a card or a wrapper is added.
        const carriers: [string, Element][] = [["<body>", body], ["<main>", main],
            ...[...main.querySelectorAll("[style]")].map((el): [string, Element] =>
                [`<${el.tagName.toLowerCase()} class="${el.getAttribute("class") ?? ""}">`, el])];
        const inlineOffenders = carriers.flatMap(([name, el]) => {
            const style = el.getAttribute("style");
            if (!style) return [];
            return props.flatMap((prop) => {
                const value = decl(style, prop);
                return isDefiniteSize(value) ? [`${name} style="${style}" — ${prop}: ${value}`] : [];
            });
        });
        expect(
            [...new Set(inlineOffenders)],
            "no element on this page may carry a definite height or maximum in a style attribute: it is unconditional, it outranks every rule the assertions above read, and none of them can see it — measured at 858.2px of deleted ink at 1024x600 on <main>, and 860.4 on the right-hand stack wrapper, with the whole suite green",
        ).toEqual([]);

        // Non-vacuity: the reader has to be able to SEE an attribute at all, or the
        // assertion above passes because `getAttribute` drifted rather than because
        // the page is clean. Proven against a fixture, since the page is forbidden
        // from carrying the real thing.
        const fixture = parseHTML(`<main style="max-height:50rem"></main>`).document.querySelector("main")!;
        expect(isDefiniteSize(decl(fixture.getAttribute("style")!, "max-height"))).toBe(true);
        // And the same reader must not red a harmless attribute, or the guard gets
        // deleted the first time someone sets a custom property inline.
        const benign = parseHTML(`<main style="--x:3;min-height:46rem"></main>`).document.querySelector("main")!;
        expect(props.some((p) => isDefiniteSize(decl(benign.getAttribute("style")!, p)))).toBe(false);
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
            return ROW_TEMPLATE_PROPS.flatMap((prop) => {
                const raw = decl(r.body, prop);
                return raw ? [`${describeRule(r, prop, rowTracks(prop, raw))} — gated at ${gate ?? "no width"}`] : [];
            });
        });
        expect(
            [...new Set(offenders)],
            `only the large breakpoint (>=${LG}px) may impose a fixed row template on <main>`,
        ).toEqual([]);
    });

    /**
     * THE HEIGHT BUDGET MUST BE SPELLED IN THE READER'S OWN TEXT SIZE.
     *
     * `<main>` is deliberately height-locked at lg — clamped between a floor and a
     * cap around a viewport height — and that lock is the bento design, not a
     * defect. What WAS a defect is that the two ends of the clamp were absolute
     * lengths while everything inside the cards is font-relative: the grid's height
     * budget could not move, the type inside it could, and every card clips. So a
     * reader who had asked for larger text got the difference deleted. Measured
     * before, as ink past each card's clip edge summed over the page, at a 1024x800
     * viewport: 4.8px at a 17px root, 196 at 18, 457 at 20, 966 at 22, 1596 at 24 —
     * and the page did not scroll, so none of it was recoverable.
     *
     * With both ends in `rem` the budget grows at the same rate as the text, the
     * page becomes taller than the viewport, and `<body>`'s floor (above) lets it
     * scroll. Measured after: 0 at every one of those, and 0 out to a 40px root
     * across eight viewports from 320 to 2560 wide.
     *
     * The assertion is "no absolute length", not "must be rem". A viewport-relative
     * term is not only allowed but required — the `100vh` in the middle of the
     * clamp is what makes the page single-screen in the first place — and writing
     * the allowed set as an enumeration of units is the mistake `isDefiniteSize`
     * above already records: the list leaks, the inversion does not.
     *
     * A UNIT WAS NEVER GOING TO BE ENOUGH, and the assertions added at the foot of this
     * test are the half that was missing. Everything above is about text ZOOM, which
     * moves the root font-size and so moves anything written in rem. SC 1.4.12 is a
     * different reader doing a different thing: setting line-height, letter-spacing,
     * word-spacing and paragraph spacing directly, none of which the page can see. The
     * type grows and every font-relative length on the page holds still. So the budget
     * has to have no CEILING at all, in any unit, and the rows have to be able to ask
     * for room — measured before the fix at 1157.7px of ink deleted at 1024x600.
     */
    it("spells the grid's height budget in a unit the reader's text size can move", () => {
        // A length no font-size can move. Zero is exempt: it is unit-agnostic and
        // caps nothing.
        const hasAbsoluteLength = (value: string) =>
            [...value.matchAll(/(?:^|[\s(,])(-?[\d.]+)(px|pt|pc|in|cm|mm|q)\b/gi)]
                .some((m) => parseFloat(m[1]) !== 0);

        const props = ["height", "min-height", "max-height", "block-size", "min-block-size", "max-block-size"] as const;
        const offenders = rulesMatching(main).flatMap((r) =>
            props.flatMap((prop) => {
                const value = decl(r.body, prop);
                return value && hasAbsoluteLength(value) ? [describeRule(r, prop, value)] : [];
            }));
        expect(
            [...new Set(offenders)],
            "<main>'s height budget must contain no absolute length: the cards inside it are sized in text, they clip, and a budget the reader's font size cannot move turns their content into deleted ink rather than a scrollbar",
        ).toEqual([]);

        // Non-vacuity, in the direction that matters. Deleting the budget entirely
        // satisfies the negative assertion above, so the floor has to be shown to
        // exist — and to exist at lg, which is the only place the four-column grid
        // can hold a single screen.
        const atLg = rulesMatching(main).filter((r) => (minWidthOf(r) ?? 0) === LG);
        // At or ABOVE lg. A ceiling gated at xl or 2xl never applies below lg, so
        // `appliesBelow` skips it, and `=== LG` cannot see it either: an
        // `xl:max-h-[50rem]` walked through all three assertions green and put
        // 215.6px of SC 1.4.12 ink loss back at every viewport >= 1280.
        const atLgUp = rulesMatching(main).filter((r) => (minWidthOf(r) ?? 0) >= LG);
        const floors = atLg.flatMap((r) => {
            const value = decl(r.body, "min-height");
            return value ? [value] : [];
        });
        expect(
            floors,
            "<main> must declare a min-height at the large breakpoint; without it the single-screen contract is gone, and this file's negative assertions all pass for a page that no longer has one",
        ).not.toEqual([]);
        // And it must actually be font-relative, which "no absolute length" alone
        // does not give: `min-height: 100vh` contains no absolute length and does not
        // grow with the text either.
        for (const value of floors) {
            expect(
                value,
                `<main>'s min-height at the large breakpoint must be font-relative so the budget grows with the reader's text; found "${value}"`,
            ).toMatch(/\d\s*r?em\b/);
        }

        /*
         * THE BUDGET IS A FLOOR ONLY, and the two halves below are what make that true
         * rather than decorative.
         *
         * It used to be a clamp — a floor, a viewport term and a CAP — and the cap is
         * how the page failed SC 1.4.12. A reader who applies the criterion's four
         * metrics changes no font-size, so nothing font-relative moves; the type inside
         * the cards grows anyway and the grid cannot. Measured on the shipped page, as
         * ink past each card's clip edge summed over the page: 1157.7px deleted at
         * 1024x600, 850.7 at 1024x768, 63 at 1440x900 and above. All of it at the BOTTOM
         * edge — the right edge was 0 at every viewport, because a card grows vertically
         * with its content and never horizontally.
         *
         * So a ceiling of any kind is forbidden here, and so is a definite `height`,
         * which is the same ceiling spelled differently.
         */
        for (const prop of ["max-height", "max-block-size", "height", "block-size"] as const) {
            const ceilings = atLgUp.flatMap((r) => {
                const value = decl(r.body, prop);
                return value && value !== "auto" ? [describeRule(r, prop, value)] : [];
            });
            expect(
                [...new Set(ceilings)],
                `<main> must not declare ${prop} at the large breakpoint: the grid has to be free to get taller than the viewport when the text inside it does, and a ceiling turns that growth back into deleted ink. Text spacing (SC 1.4.12) moves no font-size, so a font-relative ceiling does not help — it has to be absent`,
            ).toEqual([]);
        }

        /*
         * A CEILING NEED NOT BE A LENGTH, and the property list above can only see
         * lengths. `contain: size` (and `strict`, which includes it, and
         * `content-visibility`, which applies it) makes the box's used block size
         * independent of its content altogether: the grid resolves as if `<main>` held
         * nothing, and `<main>`'s own `overflow-hidden` deletes the rest. Measured on a
         * build carrying `@media (width>=64rem){main{contain:size}}` — 2188.7px of ink
         * deleted at 1024x600 against 1157.7 for the clamp this test replaced, 1462.7 at
         * 1024x768, 215.6 from 1280 up, and 78px lost at the DEFAULT text size with no
         * user stylesheet at all. So the invariant is stated against CONTAINMENT rather
         * than against lengths: nothing here may make `<main>`'s used block size
         * independent of its content.
         *
         * `contain: inline-size` is deliberately allowed — it contains the inline axis,
         * which is not the axis that clips here, and it was measured at 0 lost ink at
         * all five viewports, identical to the page without it.
         *
         * `aspect-ratio` is on the list for the same reason and was measured the same
         * way: a definite inline size plus a ratio is a definite BLOCK size, so
         * `main{aspect-ratio:2/1}` reproduces the contain-size numbers to the decimal —
         * both collapse the grid onto the `min-height` floor and clip everything above
         * it. It is a ceiling written as a ratio.
         *
         * AT EVERY WIDTH, not just at lg — unlike the length ceilings above, which are
         * allowed at lg's sibling assertion's discretion and policed there. There is no
         * width at which the grid wants its height to stop depending on its content, and
         * an UNGATED `main{contain:size}` is exactly the rule a `atLg`-scoped version of
         * this check cannot see (verified: it stayed green until this was widened, while
         * the same rule spelled `max-height` went red on the sibling assertion).
         */
        const containments = rulesMatching(main).flatMap((r) => {
            const found: string[] = [];
            const contain = decl(r.body, "contain");
            if (contain && /(?<![\w-])size(?![\w-])|(?<![\w-])strict(?![\w-])/i.test(contain)) {
                found.push(describeRule(r, "contain", contain));
            }
            const visibility = decl(r.body, "content-visibility");
            if (visibility && visibility.trim().toLowerCase() !== "visible") {
                found.push(describeRule(r, "content-visibility", visibility));
            }
            const ratio = decl(r.body, "aspect-ratio");
            if (ratio && ratio.trim().toLowerCase() !== "auto") {
                found.push(describeRule(r, "aspect-ratio", ratio));
            }
            return found;
        });
        expect(
            [...new Set(containments)],
            "<main>'s used block size must keep depending on its content at every width: `contain: size`, `contain: strict`, `content-visibility` and `aspect-ratio` each cap the grid exactly as a max-height does — harder, in fact, because the height stops being a function of the content at all — and the ink goes past `<main>`'s own overflow-hidden and is deleted",
        ).toEqual([]);

        /*
         * The other half, and the one with no obvious name. A budget free to grow buys
         * nothing while the ROWS cannot: `grid-rows-8` compiles to
         * `repeat(8, minmax(0,1fr))`, whose tracks always sum to exactly the container
         * and never ask it for more. Both halves were measured separately — the floor
         * alone leaves 1157.7px lost, the rows alone make it WORSE (they overflow a
         * still-capped container), and together it is 0 at every viewport.
         */
        /*
         * READ THE SHORTHANDS TOO, and read them ALONGSIDE the longhand rather than
         * instead of it. `grid-template` and `grid` both reset `grid-template-rows`,
         * and inside one rule after minification the later declaration wins — so
         * preferring either spelling lets the other through. Every spelling present is
         * collected and every one is screened; only the ROWS half of a shorthand is
         * taken (everything before the first `/`), because the columns half is
         * legitimately `repeat(4, minmax(0,1fr))` and screening it would red the
         * clean build.
         */
        const templates = atLg.flatMap((r) => ROW_TEMPLATE_PROPS.flatMap((prop) => {
            const raw = decl(r.body, prop);
            return raw ? [rowTracks(prop, raw)] : [];
        }));
        expect(
            templates,
            "<main> must declare a row template at the large breakpoint, or the grid it is asserted about does not exist",
        ).not.toEqual([]);
        const templatesUp = atLgUp.flatMap((r) => {
            const value = decl(r.body, "grid-template-rows");
            return value ? [value] : [];
        });
        for (const value of templatesUp) {
            expect(
                fixedTracksIn(value),
                `<main>'s row template must let every row grow for its content; "${value}" contains a track that cannot`,
            ).toEqual([]);
        }
    });

    /**
     * AND SO MUST EVERY BREAKPOINT.
     *
     * The height budget above is only half of it. The four-column grid needs a
     * certain amount of TEXT across the viewport, not a certain number of device
     * pixels: at a 24px root a 1024px viewport carries about 42 characters where the
     * layout wants 64, and the page was still being handed four columns there. Every
     * line wrapped, and with the budget fixed the cards lost 846px of ink at
     * 1024x800 even after the budget itself was freed. Keying the breakpoints to the
     * reader's text instead drops that viewport to the two-column layout, which
     * flows, and takes the loss to 0.
     *
     * This polices the whole SHEET rather than one rule, because the property is a
     * property of the sheet: a single absolute bound left among the rest — most
     * likely a hand-written media query in an .astro `<style>` block, of which there
     * is now exactly one — does not fail loudly. It simply parts company with its
     * variant siblings the moment a reader enlarges the text, and every other
     * assertion in this suite stays green.
     *
     * Do not restate that count anywhere it can rot: uno.config.ts owns it, and the
     * assertion below deliberately derives its own floor from the sheet instead.
     */
    /**
     * The width parser must fail LOUDLY on a unit it cannot read.
     *
     * Against a FIXTURE, not against the page, because the page is not allowed to
     * contain such a bound — the assertion below forbids it — so there is nothing
     * real left to prove this on. The property is still worth pinning: a bound the
     * helper reads as "not width-gated" turns `appliesAt`, `appliesBelow` and every
     * cascade assertion built on them into a no-op that passes. This file has been
     * bitten twice by that shape already, once on the SYNTAX (range vs `min-width:`)
     * and once on the UNIT (px vs rem). Third time it should shout.
     */
    it("refuses to read a width bound whose unit it does not understand", () => {
        const fixture = {selectors: [".x"], body: "color:red", nested: true, at: "@media (min-width: 60ch)"};
        expect(() => minWidthOf(fixture)).toThrow(/unreadable unit/);
        // And the readable ones still resolve, so the throw is not just "throws on
        // everything" — which would pass the line above and break the whole suite.
        expect(minWidthOf({...fixture, at: "@media (width>=64rem)"})).toBe(1024);
        expect(minWidthOf({...fixture, at: "@media (min-width: 768px)"})).toBe(768);
        expect(minWidthOf({...fixture, at: ""})).toBeNull();
    });

    it("decides every breakpoint in the reader's text size too", () => {
        const conditions = widthConditions(css);

        /**
         * NON-VACUITY, counted a second and independent way rather than compared against
         * a literal.
         *
         * This used to require at least five conditions, described as "five breakpoints
         * plus two hand-written bounds". Both halves of that number were wrong. A
         * breakpoint only emits a query if some variant actually uses it, so the five are
         * never all present; and the hand-written count moved twice — this row's own bounds
         * went two, then three, then none — at which point the sheet held four conditions and
         * a correct sheet failed a non-vacuity floor. (uno.config.ts counts the same history
         * as "it was four", because it counts every hand-written query in the codebase and
         * this counts only the control row's. Neither is wrong; both are why a literal here
         * was the wrong instrument.)
         *
         * A literal is simply the wrong instrument for "did the scan find everything". So
         * the sheet is scanned again here, by a DELIBERATELY LOOSER pattern — any at-rule
         * prelude mentioning a width at all — and every prelude that scan sees has to be
         * accounted for by `widthConditions`. It self-calibrates as the sheet changes, and
         * it catches the failure the literal was aiming at and could not express: a bound
         * whose SYNTAX the numeric patterns do not recognise (an interval like
         * `(400px <= width <= 800px)` matches neither `min-width:` nor `width>=`) reads as
         * "not width-gated", which turns every assertion built on it into a green no-op.
         */
        const mentionsWidth = new Set([...css.matchAll(/@(?:media|container)[^{]*/g)]
            .map((m) => m[0].trim())
            .filter((at) => /\bwidth\b/.test(at)));
        expect(
            mentionsWidth.size,
            "no at-rule in the sheet mentions a width at all, so this assertion has nothing to check — either "
            + "the page has stopped being responsive or the scan below is reading the wrong thing",
        ).toBeGreaterThan(0);
        const accounted = new Set(conditions.map((c) => c.at));
        expect(
            [...mentionsWidth].filter((at) => !accounted.has(at)),
            "an at-rule prelude mentions a width that widthConditions() did not report. It is gating layout on "
            + "a viewport width in a spelling the helper cannot read, and an unreadable bound reads as "
            + "unconditional — silently, and green, for every assertion built on it",
        ).toEqual([]);

        const absolute = conditions.filter((c) => !/^r?em$/.test(c.unit));
        expect(
            [...new Set(absolute.map((c) => `${c.value}${c.unit} in "${c.at}"`))],
            "every width bound must be font-relative, so the layout tier is chosen by how much text fits rather than by device pixels. A px bound here keeps the four-column grid on a viewport that can no longer hold four columns of the reader's type",
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
