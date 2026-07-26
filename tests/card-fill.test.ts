import {describe, expect, it} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {appliesAt, decl, isKeyframeStep, maxWidthOf, minWidthOf, parseRules, px, structuralSelector} from "./helpers/css";

/**
 * A card takes its content's height, never its grid area's.
 *
 * ONE METRIC FOR EVERY FIGURE BELOW, because mixing two is how the first draft of
 * this docstring went wrong. A card's "band" is the distance from the bottom of
 * its LAST TEXT LINE down to the card's inner edge — its content box, so the 24px
 * of padding beneath it is excluded. Every number here was re-measured over raw
 * CDP with the entrance animation switched off, on a cold build of the previous
 * revision (a192a89, stylesheet md5 f940851dc7168c9a97dbdc7bb8689bad) and on this
 * one, both at 1440x900 unless another viewport is named.
 *
 * THE DEFECT THIS PINS. At the large breakpoint the page's rows have a set height,
 * so every card's area is taller than its content. A grid item stretches to fill
 * its area by default, and the difference showed up as an empty band under the
 * last line a reader can see: running goal 63px, cycling goal 63px, NCS role
 * 111px, HeyMax role 43px, about-me 24px. Against the OUTER padding edge every
 * figure is 24px larger — quoting the wrong edge is the easiest way to look wrong
 * in this file, and the 29px below is exactly that mistake, caught by a review.
 * After the fix the same five bands are 9, 9, 1, 1 and 2px.
 *
 * Calvin reported the two goal cards; the role and about-me cards had it too, and
 * the NCS card had a band below the lg breakpoint as well, because there it shares
 * a six-row span with the taller HeyMax card and gets pulled to its height. That
 * one is width-dependent, so it needs a viewport named too: 79px at exactly 768px
 * wide, 111px by 900px wide. Both are 1px after the fix.
 *
 * WHY THE BANDS CANNOT BE RE-SPANNED AWAY, since that is the fix everyone reaches
 * for first. They sit in different columns, so they cannot be pooled. In the
 * right-hand column the three cards want 206, 206 and 170px, and a row there
 * costs its own height plus the 16px gap, so each of them needs three rows —
 * nine rows for the eight the column has. The row height is a CONTINUUM, not a
 * short list of values: `main` takes the viewport height clamped between 736 and
 * 800px, and 8 rows share what is left after 48px of padding and 9 gaps (8 rows
 * plus two implicit zero-height ones make 10 tracks), so the row is
 * (clamp(736,vh,800) - 48 - 144) / 8, i.e. anything in 68…76px and a row cost of
 * 84…92px. Measured: 68px at a 600px-tall viewport (the 736px floor), 69.75px at
 * 750px — a FRACTIONAL row height, which is what makes an enumeration of values
 * wrong rather than merely incomplete — and 76px from 800px up (the cap). The
 * column is over-subscribed at every one of them (three rows each, nine against
 * eight, checked by arithmetic across the range).
 *
 * Cutting a goal card to two rows does not help: it gets 168px and pushes its last
 * line 29px past its INNER edge, of which 5px falls outside the clip and is ink
 * the reader loses. The 29px is the figure this file used to call "sliced off the
 * last line", which was the outer-edge mistake again — 24px of it is padding.
 *
 * So the cards stop stretching. Each sizes to its content and sits at the top of
 * its area. The freed height must NOT reappear as a gap between cards, which is
 * the second half of the fix: shared rows mean the right-hand column's row heights
 * are decided by the intro and role cards beside it, so content-sized cards inside
 * a shared row template sat 70px and 70px apart — the page gap is 16px, so the
 * problem is that they are four times too wide, not that they are unequal (an
 * earlier draft claimed 74px and 53px; reproduced on the previous revision with
 * the fix injected and no wrapper, both gaps measure 70px). That column is
 * therefore wrapped in its own stack (index.astro), and the three cards there sit
 * at the page gap with the leftover collecting once beneath the last of them.
 * Measured after: gaps of 16px and 16px, and 106px beneath the last card. The
 * wrapper is 720px tall (8 rows of 76 plus 7 gaps) against 582px of cards, so
 * 138px is unspent — but 32px of that is the two gaps BETWEEN the cards, and only
 * the remaining 106px collects at the foot.
 *
 * That was the maintainer's call over the two alternatives — leaving the band
 * alone, and splitting it above and below the body — and its cost is that a
 * column's cards no longer end on a shared bottom edge.
 *
 * THE BLOCK-SIZE CAP, and what it can and cannot reach. A card that no longer
 * stretches is also free to exceed its area and eat into the gap below it, and two
 * cards' content did want more than its box on the previous revision: Now by 2px
 * and the footer by 6px (scroll height against client height, one metric for
 * both). The cap stops that. But a percentage max-height resolves against the
 * card's CONTAINING BLOCK, and for the three cards in the stack that is now the
 * wrapper, not a grid area: measured on this revision, all three have a 720px-tall
 * parent, so the cap resolves to 720px and cannot bind on a 206px card. It binds
 * only on cards that are still direct grid items — remove it at 1440x900 and
 * exactly one card changes, the footer, 76px to 82px; at 1024x600, where the rows
 * are at their shortest, it also holds about-me and the HeyMax role card, whose
 * content wants 18px and 6px more than their rows. Now is 2px TALLER on this
 * revision than before it (168px to 170px) and its 2px of overflow is gone, so it
 * is not a card the cap holds. The assertions below still require the cap on every
 * non-exempt card, because which cards are direct grid items is a property of the
 * wrapper, not of the cards: re-parenting one must not silently uncap it.
 *
 * WHAT THIS FILE CANNOT DO. linkedom parses, it does not lay out, so nothing here
 * re-measures a band; the figures above are pinned from the CDP sweeps described
 * and must be re-taken when the spans change. What it can do is police the cascade
 * facts the fix is made of. Note this is deliberately NOT a class-token assertion:
 * an earlier attempt at this fix used a utility spelling that parses as a class
 * name and emits no CSS rule at all, so the page was unchanged with the whole
 * suite green. Only the emitted sheet knows.
 */
describe("a card sizes to its content, not to its grid area", () => {
    const css = readFileSync(`dist/_astro/${readdirSync("dist/_astro").find((f) => f.endsWith(".css"))!}`, "utf8");
    const {document} = parseHTML(readFileSync("dist/index.html", "utf8"));
    const rules = parseRules(css);

    /** Every rule that can reach `el`, at any at-rule depth. See page-fit.test.ts. */
    const rulesMatching = (el: Element) => rules.filter((rule) =>
        !isKeyframeStep(rule) && rule.selectors.some((selector) => {
            const structural = structuralSelector(selector);
            if (!structural) return false;
            return [...document.querySelectorAll(structural)].includes(el as never);
        }));

    /** The breakpoint the empty band starts at, and where these rules must bite. */
    const LG = 1024;

    /**
     * THE WIDTHS THE CASCADE OVER `el` HAS TO BE READ AT, and why this is not just
     * `[LG]`.
     *
     * Evaluating at one width — 1024px, as this file did — leaves the whole lg
     * range above it unchecked. Measured: gating the two sizing utilities to the
     * lg..lt-xl range instead satisfied every assertion in this file while at
     * 1440x900, the viewport every band figure above is measured at, all eight
     * cards reported `align-self: auto` and `max-height: none` and the bands came
     * back in full. A fixed list of extra widths cannot close that, because a
     * range gate can always be authored to fall between the samples.
     *
     * So the sample points are DERIVED from the sheet: every width bound declared
     * by any rule that reaches this element, plus one pixel above each. A gate has
     * to state its bounds to exist, so stating them is what puts a probe just
     * inside and just outside every band the cascade can switch on. Bounds below
     * LG are dropped — this fix is not supposed to apply there.
     */
    const widthsToCheck = (el: Element) => {
        const points = new Set<number>([LG]);
        for (const rule of rulesMatching(el)) {
            for (const bound of [minWidthOf(rule), maxWidthOf(rule)]) {
                if (bound === null || bound === Infinity) continue;
                if (bound < LG) continue;
                points.add(bound);
                points.add(Math.floor(bound) + 1);
            }
        }
        return [...points].sort((a, b) => a - b);
    };

    /**
     * Every value declared for `prop` on `el` BY A RULE THAT APPLIES AT `width`,
     * mapped to the rule that declared it.
     *
     * The width filter is the whole point and it was missing at first. Without it,
     * moving these declarations behind a variant that only applies below the medium
     * breakpoint satisfies every assertion in this file — the values are declared,
     * they are reachable, the value set is exactly right — while the large
     * breakpoint, the only place the band exists, gets nothing at all. UnoCSS
     * compiles a range variant to nested queries, so the upper bound has to be read
     * as well as the lower one; `appliesBelow` in the helper deliberately consults
     * only the lower bound, which is correct for its question and wrong for this.
     */
    const valuesFor = (el: Element, prop: string, width: number) => {
        const found = new Map<string, string>();
        for (const r of rulesMatching(el)) {
            if (!appliesAt(r, width)) continue;
            const v = decl(r.body, prop);
            if (v !== undefined) found.set(v.trim(), `${r.at ? r.at + " " : ""}${r.selectors.join(",")} { ${prop}: ${v.trim()} }`);
        }
        return found;
    };

    /**
     * The value that actually WINS for `prop` on `el` at `width`: the last one
     * declared among the rules that apply, since `parseRules` preserves sheet order
     * and every utility rule here is one class, i.e. equal specificity, so order
     * decides.
     *
     * Needed because asking "does SOME rule declare the value I want" is not the
     * same question as "is that the value". Adding one more utility beside the
     * existing one — a second overflow, say — leaves the first rule in the sheet
     * and satisfies any `some()` check, while the later rule quietly overrides it.
     * Verified rather than assumed, and re-verified after this file's byte offsets
     * for it went stale: put a second overflow utility on the card and UnoCSS emits
     * it AFTER the clipping one, so the winning value is `visible` while every
     * `some()`-shaped check stays green.
     */
    const effectiveValue = (el: Element, prop: string, width: number) => {
        let winner: string | undefined;
        for (const r of rulesMatching(el)) {
            if (!appliesAt(r, width)) continue;
            const v = decl(r.body, prop);
            if (v !== undefined) winner = v.trim();
        }
        return winner;
    };

    /**
     * A length in px, counting a bare `0` as zero. `px` in the helper returns null
     * for it, correctly — `0` carries no unit — but a minifier writes every zero
     * that way, so a gap or margin of zero would otherwise read as "not a length"
     * and produce a failure message about the wrong thing.
     */
    const lengthPx = (value: string | undefined) =>
        px(value) ?? (value !== undefined && parseFloat(value) === 0 ? 0 : null);

    // Cards at ANY depth: the right-hand column is wrapped in a layout box, so a
    // card is no longer necessarily a direct child of <main>. Selected by the
    // marker the component itself renders, not by depth and not by a utility class
    // that a restyle could rename.
    const allCards = [...document.querySelectorAll("main [data-card]")];
    const label = (card: Element) => `<${card.tagName.toLowerCase()} class="${card.getAttribute("class")?.slice(0, 48)}…">`;
    const main = document.querySelector("main")!;

    /**
     * The intro card, found by the page's one headline, which it is the only card
     * to hold — NOT by the tokens under test, which would make the exemption
     * circular and let any future card excuse itself simply by opting out.
     *
     * It used to be found by "the card containing an image", and that identified
     * the right card for the wrong reason: adding a 12px image to the FOOTER card
     * reddened this file with a message about a second portrait, a failure with no
     * relationship to the grid-area exemption. A headline is a document-structure
     * fact — one page, one h1 — rather than a content detail any card might grow.
     */
    const introCard = allCards.filter((c) => c.querySelector("h1"));
    const cards = allCards.filter((c) => !introCard.includes(c));

    it("exempts exactly one card, and it is the intro card", () => {
        // The exemption exists because the intro card's inner column sizes itself
        // as a percentage of the card, which needs a height the row has already
        // decided. Sized to its own content instead, that column grows from 270px
        // to 300px at 1024x600 and pushes the row of controls 6px past the card's
        // OUTER edge, where the clip destroys it. The portrait is not the victim:
        // it renders at 275px either way and its bottom stays 3px inside the clip.
        // The exemption is affordable only because this card had no band to
        // reclaim: at 1440x900 its deepest painted box ends exactly on its inner
        // edge, 0px, on both revisions. (The last-line metric the other seven
        // figures use says nothing about this card — its last line of type sits
        // above the control row, 173px up — which is why an earlier draft's "1.5px"
        // for it could not be reproduced by any instrument.)
        expect(introCard.length, "expected exactly one card to hold the page headline").toBe(1);
        expect(cards.length, "no non-exempt cards left to assert about — the exemption has swallowed the page").toBeGreaterThan(5);

        // The exemption is counted FROM THE CASCADE, not from the identification.
        // `allCards.length - cards.length` used to stand here carrying the message
        // below, and it could say nothing about it: `cards` is `allCards` minus the
        // identified card by construction, so the subtraction returned 1 whatever
        // the sheet said. What can actually spread is the ABSENCE of a
        // start-alignment, so that is what gets counted.
        const stillStretching = allCards.filter((card) =>
            ![...valuesFor(card, "align-self", LG).keys()].some((v) => /^(flex-)?start$/.test(v)));
        expect(
            stillStretching.map(label),
            "exactly one card may keep filling its grid area. Another card opting out is how the empty band comes back one card at a time",
        ).toHaveLength(1);
        expect(
            stillStretching[0],
            `the card that keeps filling its grid area must be the intro card; found ${stillStretching[0] ? label(stillStretching[0]) : "nothing"}`,
        ).toBe(introCard[0]);

        // And the exempt card must ACTUALLY still stretch. Without this the
        // exemption is unpoliced in the other direction: the intro card is
        // identified by its headline, so it is simply excluded from the assertions
        // below, and handing it the tokens after all would put 6px of its control
        // row back under the knife at 1024 wide by 600 tall, with nothing objecting.
        const intro = introCard[0]!;
        for (const width of widthsToCheck(intro)) {
            expect(
                [...valuesFor(intro, "align-self", width).keys()].filter((v) => /^(flex-)?start$/.test(v)),
                `the intro card must keep filling its grid area, and at ${width}px it does not: its inner column resolves its own height as a percentage, and with nothing deciding that height the column falls back to its content and shears 6px off the control row at 1024x600`,
            ).toEqual([]);
        }
    });

    it("finds the cards and reaches them from the sheet, so nothing below is vacuous", () => {
        expect(allCards.length, "no cards found under <main>").toBeGreaterThan(0);
        for (const card of allCards) {
            // Counting the rules that reach a card proves NOTHING and used to be
            // asserted here anyway: the preflight ships `*,:before,:after`, and a
            // pseudo-only compound reduces to `*`, so eleven rules reach every
            // element in the document no matter what it wears. The floor can never
            // be crossed, which makes the failure message a lie. What is worth
            // asserting is that the walker can still reach a card through a CLASS,
            // since that is the route every assertion below depends on.
            const viaClass = rulesMatching(card).filter((r) => r.selectors.some((s) => s.includes(".")));
            expect(
                viaClass.length,
                `no CLASS-keyed rule in the sheet reaches ${label(card)} — the selector walker has drifted, and every assertion below would pass by finding nothing`,
            ).toBeGreaterThan(0);
        }
        // The floor that fails when the fix is reverted to nothing. Deliberately
        // weaker than it looks: a declaration can be present in the sheet and still
        // never apply, which is why the per-card assertions below filter on the
        // breakpoint instead of trusting a substring.
        expect(css, "the sheet declares no self-alignment at all — the fix is gone, or its utility emitted nothing").toMatch(/align-self:\s*(flex-)?start/);
        expect(css, "the sheet declares no full block-size cap at all — the fix is gone, or its utility emitted nothing").toMatch(/max-height:\s*100%/);
    });

    it("stops every card stretching to fill its grid area, at every width from lg up", () => {
        for (const card of cards) {
            for (const width of widthsToCheck(card)) {
                const values = valuesFor(card, "align-self", width);
                expect(
                    [...values.values()],
                    `${label(card)} has no align-self that applies at ${width}px, so it stretches to its grid row there and the empty band under its last line comes back. Checked widths: ${widthsToCheck(card).join(", ")}`,
                ).not.toEqual([]);
                // Every value is checked, not just one of them: a second rule reaching
                // the same card with `stretch` would win or lose on emission order
                // alone, and the measured behaviour would stop being the one measured.
                // `self-start` compiles to flex-start, which on a grid item is start.
                for (const [value, where] of values) {
                    expect(
                        value,
                        `${label(card)} must be start-aligned in its grid area at ${width}px; found "${value}" from ${where}`,
                    ).toMatch(/^(flex-)?start$/);
                }
            }
        }
    });

    it("stops a card growing past its grid area and eating the gap below it", () => {
        for (const card of cards) {
            for (const width of widthsToCheck(card)) {
                const values = valuesFor(card, "max-height", width);
                expect(
                    [...values.values()],
                    `${label(card)} has no max-height that applies at ${width}px. A card that no longer stretches is free to exceed its area and close the gap below it: on the previous revision Now's content wanted 2px more than its box and the footer's 6px, and removing this cap today grows the footer from 76px to 82px`,
                ).not.toEqual([]);
                for (const [value, where] of values) {
                    // A percentage specifically: it resolves against the card's
                    // containing block, so it binds where that block has a definite
                    // height — a grid area at the large breakpoint — and is inert
                    // below that, where rows already size to their content. An
                    // absolute length here would cap every breakpoint at the same
                    // number.
                    expect(
                        value,
                        `${label(card)} must cap its block size against its containing block, i.e. as a percentage; found "${value}" from ${where} at ${width}px`,
                    ).toBe("100%");
                }
            }
        }
    });

    it("stacks the wrapped column, and leaves the smaller layouts alone", () => {
        // The wrapper is what stops the freed height turning into a gap. Several
        // facts about it are load-bearing and none is visible from the card side.
        const wrappers = [...document.querySelectorAll("main > *")].filter((el) => !el.hasAttribute("data-card"));
        expect(
            wrappers.length,
            "expected exactly one layout wrapper under <main> — the stacked column. More than one, and the reasoning about which cards share row heights no longer holds",
        ).toBe(1);
        const wrapper = wrappers[0]!;
        expect(
            [...wrapper.querySelectorAll("[data-card]")].length,
            "the stacked column must hold the cards it was built for",
        ).toBeGreaterThan(1);

        // At the large breakpoint it is a column with a gap: that is what puts its
        // cards at the page gap instead of at row boundaries.
        for (const width of widthsToCheck(wrapper)) {
            expect(effectiveValue(wrapper, "display", width), `the stacked column must be a flex box at ${width}px`).toBe("flex");
            expect(effectiveValue(wrapper, "flex-direction", width), `the stacked column must stack, not sit in a row, at ${width}px`).toBe("column");

            // The gap is PINNED TO THE PAGE GAP, not merely present. `toBeDefined`
            // was the assertion here and `gap: 0` satisfied it: measured, the three
            // cards' borders then touch (tops 74/280/486 instead of 74/296/518),
            // which is the layout this wrapper exists to avoid. The page gap is
            // read off <main> rather than written down, so the rhythm is one fact
            // stated once — and a zero would have to be a zero on <main> too, which
            // page-fit would notice.
            const pageGap = lengthPx(effectiveValue(main, "gap", width));
            expect(pageGap, `<main> declares no absolute gap at ${width}px, so there is nothing to hold the stack's gap to`).not.toBeNull();
            expect(pageGap, `<main>'s gap collapsed to zero at ${width}px`).toBeGreaterThan(0);
            expect(
                lengthPx(effectiveValue(wrapper, "gap", width)),
                `the stacked column must separate its cards by the page gap (${pageGap}px) at ${width}px, or the three cards abut`,
            ).toBe(pageGap);
        }

        // THE PLACEMENT IS THE OTHER HALF, and all three tokens were unpoliced.
        // Measured at 1440x900, one token removed at a time:
        //   row span   the column collapses into a single 76px row, the three cards
        //              are capped at 50px and 124px of each one's content is
        //              destroyed by the clip this file insists on
        //   col start  the stack lands in column 1 and the intro card in column 2;
        //              nothing is clipped, every card on the page moves
        //   row start  no visible change today, because the wrapper is the second
        //              item in source order and auto-placement puts it in row 1
        //              anyway. Asserted so the column's extent stops depending on
        //              that coincidence: add one grid item before the wrapper and
        //              auto-placement decides where a full-height column starts.
        // The row and column counts are read off <main>'s own template rather than
        // written down here, so re-balancing the grid moves both sides at once.
        const countOf = (template: string | undefined) => {
            const m = /repeat\(\s*(\d+)\s*,/.exec(template ?? "");
            return m ? parseInt(m[1], 10) : null;
        };
        const spanOf = (value: string | undefined) => {
            const m = /span\s+(\d+)/.exec(value ?? "");
            return m ? parseInt(m[1], 10) : null;
        };
        for (const width of widthsToCheck(wrapper)) {
            const rowCount = countOf(effectiveValue(main, "grid-template-rows", width));
            const colCount = countOf(effectiveValue(main, "grid-template-columns", width));
            expect(rowCount, `<main> declares no repeated row template at ${width}px, so the stack's span cannot be checked against it`).not.toBeNull();
            expect(colCount, `<main> declares no repeated column template at ${width}px`).not.toBeNull();

            const rowEnd = effectiveValue(wrapper, "grid-row-end", width)
                ?? effectiveValue(wrapper, "grid-row", width)?.split("/")[1];
            expect(
                spanOf(rowEnd),
                `the stacked column must span all ${rowCount} of <main>'s rows at ${width}px; found grid-row-end "${rowEnd}". One row instead of ${rowCount} caps its three cards at 50px and the clip eats 124px of each`,
            ).toBe(rowCount);
            expect(
                effectiveValue(wrapper, "grid-row-start", width),
                `the stacked column must start in the first row at ${width}px, not wherever auto-placement puts it`,
            ).toBe("1");
            expect(
                effectiveValue(wrapper, "grid-column-start", width),
                `the stacked column must be the last of <main>'s ${colCount} columns at ${width}px; without this every card on the page changes column`,
            ).toBe(String(colCount));
        }

        // Below it, the wrapper must generate NO box, or it becomes a grid item at
        // the smaller widths and changes layouts that were verified unchanged.
        const MD = 768;
        expect(
            effectiveValue(wrapper, "display", MD - 1),
            `below the md breakpoint the wrapper must generate no box of its own, so its cards stay direct grid items and the one-column layout is untouched`,
        ).toBe("contents");
    });

    it("gives every card heading the same space beneath it, sized to the page gap", () => {
        // The cards did not agree about this and it showed: the goal cards had 16px
        // under the heading because the progress bar supplied its own top margin,
        // while about-me and both role cards had 1px and read as cramped. The space
        // belongs to the heading, once, so that every titled card gets it.
        const headed = allCards.filter((c) => [...c.children].some((k) => k.tagName.toLowerCase() === "h2"));
        expect(headed.length, "no card renders a heading — this assertion would be vacuous").toBeGreaterThan(2);
        const gaps = new Set<string>();
        for (const card of headed) {
            const h2 = [...card.children].find((k) => k.tagName.toLowerCase() === "h2")!;
            const mb = effectiveValue(h2, "margin-bottom", LG);
            expect(mb, `the heading of ${label(card)} declares no bottom margin at ${LG}px`).toBeDefined();

            // SIZED, not merely non-zero. "More than zero and the same everywhere"
            // was the assertion, and 2px everywhere satisfied it — measured, and
            // 1px away from the cramped reading this change was reported to fix.
            // The amount is held to the page's own spacing step, read off <main>,
            // so the rhythm is one fact stated once rather than a literal here.
            const pageGap = lengthPx(effectiveValue(main, "gap", LG));
            expect(pageGap, `<main> declares no absolute gap at ${LG}px`).toBeGreaterThan(0);
            expect(
                lengthPx(mb),
                `the heading of ${label(card)} must hold the body off it by the page's spacing step (${pageGap}px); found "${mb}"`,
            ).toBe(pageGap);

            // And an ABSOLUTE length, which is the fix in a29a5b3: a card's height
            // comes from the page rows and does not scale with the root font size,
            // while every card clips, so a gap that DOES scale is content lost.
            expect(
                mb,
                `the heading of ${label(card)} must reserve its space as an absolute length, not one that scales with the root font size; found "${mb}"`,
            ).toMatch(/^\d+(\.\d+)?px$/);
            gaps.add(mb!);
        }
        expect(
            [...gaps],
            "every card heading must reserve the SAME space beneath it, or the cards disagree again",
        ).toHaveLength(1);
    });

    it("does not let anything under the heading add a second helping of that space", () => {
        // The bar used to supply the goal cards' 16px itself. Now that the heading
        // does it for every card, a top margin here would stack with it and give the
        // goal cards 32px while the others keep 16 — the same inconsistency, wider.
        //
        // Asserted over the PATH, not over the bar. Reading margin-top on the
        // progressbar element alone left the hole open one element up: putting the
        // removed margin on the div between the heading and the bar measured 32px
        // under both goal headings against 16px everywhere else, with the suite
        // green. Every element whose top edge coincides with the body's top edge —
        // the first-child chain below the heading — can add to that space, so all
        // of them are checked. A later sibling cannot, and is not.
        const bars = [...document.querySelectorAll("[role=progressbar]")];
        expect(bars.length, "no progress bar found — this assertion would be vacuous").toBeGreaterThan(0);

        const headed = allCards.filter((c) => [...c.children].some((k) => k.tagName.toLowerCase() === "h2"));
        expect(headed.length, "no card renders a heading — the path below one would be vacuous").toBeGreaterThan(2);

        const topEdgeChain = (card: Element) => {
            const kids = [...card.children];
            const h2 = kids.findIndex((k) => k.tagName.toLowerCase() === "h2");
            const chain: Element[] = [];
            for (let el = kids[h2 + 1]; el; el = el.children[0]) chain.push(el);
            return chain;
        };

        const checked: Element[] = [];
        for (const card of headed) {
            const chain = topEdgeChain(card);
            expect(chain.length, `nothing follows the heading in ${label(card)} — the path assertion would be vacuous`).toBeGreaterThan(0);
            checked.push(...chain);
            for (const el of chain) {
                for (const prop of ["margin-top", "padding-top"]) {
                    for (const width of widthsToCheck(el)) {
                        const v = effectiveValue(el, prop, width);
                        expect(
                            v === undefined || lengthPx(v) === 0,
                            `<${el.tagName.toLowerCase()} class="${el.getAttribute("class")?.slice(0, 40)}…"> sits directly under the heading of ${label(card)} and declares ${prop}: ${v} at ${width}px. That stacks with the space the heading already reserves, which is how the goal cards ended up with twice what every other card gets`,
                        ).toBe(true);
                    }
                }
            }
        }
        // Non-vacuity in the direction that matters: every bar must be on a path we
        // actually walked, or the assertion could be true of nothing.
        for (const bar of bars) {
            expect(
                checked.some((el) => el === bar || el.contains(bar as never)),
                "a progress bar sits outside every heading-to-body path this assertion walks, so its own top margin is unchecked",
            ).toBe(true);
        }
    });

    it("keeps clipping its overflow, so the cap cannot be defeated by spilling", () => {
        // Asserted over EVERY card including the exempt one: the exemption is about
        // how tall a card is, never about whether it contains what it holds.
        // The cap only means anything while the card still clips: one that stopped
        // clipping would honour the cap geometrically and paint over its
        // neighbour. page-fit.test.ts asserts this too, for the md defect; it is
        // restated here because THIS fix now depends on it as well.
        for (const card of allCards) {
            // The EFFECTIVE value, not merely a declared one. Asking whether some
            // rule says "hidden" passes while a later rule overrides it, and that
            // mutation is green in this suite otherwise — measured, it is the one
            // vector of fourteen that survived a first pass.
            for (const width of widthsToCheck(card)) {
                const overflow = effectiveValue(card, "overflow", width);
                expect(
                    overflow,
                    `${label(card)} declares no overflow that applies at ${width}px`,
                ).toBeDefined();
                expect(
                    overflow,
                    `${label(card)} must keep clipping its overflow at ${width}px; the winning declaration is "${overflow}". The block-size cap above is geometric only — a card that stops clipping honours the cap and still paints over its neighbour`,
                ).toMatch(/\b(hidden|clip)\b/);
            }
        }
    });
});
