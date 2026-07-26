import {describe, expect, it} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {decl, isKeyframeStep, minWidthOf, parseRules, type Rule, structuralSelector} from "./helpers/css";

/**
 * A card takes its content's height, never its grid area's.
 *
 * THE DEFECT THIS PINS. At the large breakpoint the page's rows have a set height,
 * so every card's area is taller than its content. A grid item stretches to fill
 * its area by default, and the difference showed up as an empty band under the
 * last line a reader can see. Measured on the previous build at 1440x900, from
 * that last line down to the card's INNER edge — its content box, so the 24px of
 * padding below it is excluded: running goal 63px, cycling goal 63px, NCS role
 * 111px, HeyMax role 43px, about-me 24px. Against the outer padding edge every
 * figure is 24px larger — quoting the wrong edge is an easy way to look wrong.
 *
 * Calvin reported the two goal cards; the role and about-me cards had it too, and
 * between 768px and 1023px the NCS card had 79px of it, because there it shares a
 * six-row span with the taller HeyMax card and gets pulled to its height.
 *
 * WHY THE BANDS CANNOT BE RE-SPANNED AWAY, since that is the fix everyone reaches
 * for first. They sit in different columns, so they cannot be pooled. In the
 * right-hand column the three cards want 206, 206 and 170px against a row that
 * costs 92px including its gap, so each needs three rows — nine rows for the
 * eight the column has. It is over-subscribed at every row height the container
 * can take (76/72/68px, i.e. row costs of 92/88/84), which is why Now already
 * ends 2px inside its own bottom padding and the footer 5px. Cutting a goal card
 * to two rows slices a measured 29px off its last line.
 *
 * So the cards stop stretching. Each sizes to its content and sits at the top of
 * its area. The freed height must NOT reappear as a gap between cards, which is
 * the second half of the fix: shared rows mean the right-hand column's row heights
 * are decided by the intro and role cards beside it, so content-sized cards inside
 * a shared template sat 74px and 53px apart. That column is therefore wrapped in
 * its own stack (index.astro), and the three cards there sit at the page gap with
 * the leftover collecting once beneath the last of them. Measured after: 16px and
 * 16px, with 138px at the foot of the column.
 *
 * That was the maintainer's call over the two alternatives — leaving the band
 * alone, and splitting it above and below the body — and its cost is that a
 * column's cards no longer end on a shared bottom edge.
 *
 * THE BLOCK-SIZE CAP IS NOT DECORATION, which is the assertion most worth keeping
 * here. Three cards want slightly MORE than their area — the intro card by 5px,
 * Now by 2px, the footer by 6px — and a card that no longer stretches is also
 * free to exceed its area and eat into the gap below it. The cap stops that. It is
 * a percentage, so it resolves against the grid area only where the rows have a
 * set height: it binds at the large breakpoint and does nothing below it, where
 * rows already size to their content. That is exactly the split we want.
 *
 * WHAT THIS FILE CANNOT DO. linkedom parses, it does not lay out, so nothing here
 * re-measures a band; the figures above are pinned from a CDP sweep against a
 * build of the previous revision and must be re-taken when the spans change. What
 * it can do is police the cascade facts the fix is made of. Note this is
 * deliberately NOT a class-token assertion: an earlier attempt at this fix used a
 * utility spelling that parses as a class name and emits no CSS rule at all, so
 * the page was unchanged with the whole suite green. Only the emitted sheet knows.
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

    /** The breakpoint the empty band lives at, and where these rules must bite. */
    const LG = 1024;

    /**
     * The UPPER width bound of a rule's media conditions, or Infinity. The lower
     * bound already has `minWidthOf` in the helper; both are needed here, because
     * "is this declared" and "does this apply where the defect is" are different
     * questions and only the second one matters.
     */
    const maxWidthOf = (rule: Rule) => {
        const widths = [
            ...rule.at.matchAll(/max-width:\s*([\d.]+)px/g),
            ...rule.at.matchAll(/width\s*<=\s*([\d.]+)px/g),
        ].map((m) => parseFloat(m[1]));
        return widths.length ? Math.min(...widths) : Infinity;
    };

    const appliesAt = (rule: Rule, width: number) =>
        (minWidthOf(rule) ?? 0) <= width && maxWidthOf(rule) >= width;

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
    const valuesFor = (el: Element, prop: string, width = LG) => {
        const found = new Map<string, string>();
        for (const r of rulesMatching(el)) {
            if (!appliesAt(r, width)) continue;
            const v = decl(r.body, prop);
            if (v !== undefined) found.set(v.trim(), `${r.at ? r.at + " " : ""}${r.selectors.join(",")} { ${prop}: ${v.trim()} }`);
        }
        return found;
    };

    /**
     * The value that actually WINS for `prop` on `el`: the last one declared among
     * the rules that apply, since `parseRules` preserves sheet order and every
     * utility rule here is one class, i.e. equal specificity, so order decides.
     *
     * Needed because asking "does SOME rule declare the value I want" is not the
     * same question as "is that the value". Adding one more utility beside the
     * existing one — a second overflow, say — leaves the first rule in the sheet
     * and satisfies any `some()` check, while the later rule quietly overrides it.
     * Verified rather than assumed: the clipping utility emits at byte 17913 of the
     * sheet and its opposite at 17946, so the opposite would win.
     */
    const effectiveValue = (el: Element, prop: string, width = LG) => {
        let winner: string | undefined;
        for (const r of rulesMatching(el)) {
            if (!appliesAt(r, width)) continue;
            const v = decl(r.body, prop);
            if (v !== undefined) winner = v.trim();
        }
        return winner;
    };

    // Cards at ANY depth: the right-hand column is wrapped in a layout box, so a
    // card is no longer necessarily a direct child of <main>. Selected by the
    // marker the component itself renders, not by depth and not by a utility class
    // that a restyle could rename.
    const allCards = [...document.querySelectorAll("main [data-card]")];
    const label = (card: Element) => `<${card.tagName.toLowerCase()} class="${card.getAttribute("class")?.slice(0, 48)}…">`;

    /**
     * The intro card, found by the portrait it is the only card to contain — NOT by
     * the tokens under test, which would make the exemption circular and let any
     * future card excuse itself simply by opting out.
     */
    const introCard = allCards.filter((c) => c.querySelector("img"));
    const cards = allCards.filter((c) => !introCard.includes(c));

    it("exempts exactly one card, and it is the intro card", () => {
        // The exemption exists because the intro card's inner column sizes itself
        // as a percentage of the card, which needs a height the row has already
        // decided; sized to its own content instead, it shears 5.5px off the
        // portrait at 1024x600. It is affordable only because that card had no
        // band to reclaim. Pinning the count stops the exemption spreading.
        expect(introCard.length, "expected exactly one card to contain the portrait").toBe(1);
        expect(
            allCards.length - cards.length,
            "exactly one card may keep filling its grid area. Another card opting out is how the empty band comes back one card at a time",
        ).toBe(1);
        expect(cards.length, "no non-exempt cards left to assert about — the exemption has swallowed the page").toBeGreaterThan(5);

        // And the exempt card must ACTUALLY still stretch. Without this the
        // exemption is unpoliced in the other direction: the intro card is
        // identified by its portrait, so it is simply excluded from the assertions
        // below, and handing it the tokens after all would put 5.5px of the
        // portrait back under the knife at 1024x600 with nothing here objecting.
        const intro = introCard[0]!;
        expect(
            [...valuesFor(intro, "align-self").keys()].filter((v) => /^(flex-)?start$/.test(v)),
            "the intro card must keep filling its grid area: its inner column resolves its own height as a percentage, and with nothing deciding that height the portrait falls back to its intrinsic size and is sheared by 5.5px at 1024x600",
        ).toEqual([]);
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

    it("stops every card stretching to fill its grid area", () => {
        for (const card of cards) {
            const values = valuesFor(card, "align-self");
            expect(
                [...values.values()],
                `${label(card)} has no align-self that applies at ${LG}px, so it stretches to its grid row there and the empty band under its last line comes back`,
            ).not.toEqual([]);
            // Every value is checked, not just one of them: a second rule reaching
            // the same card with `stretch` would win or lose on emission order
            // alone, and the measured behaviour would stop being the one measured.
            // `self-start` compiles to flex-start, which on a grid item is start.
            for (const [value, where] of values) {
                expect(
                    value,
                    `${label(card)} must be start-aligned in its grid area; found "${value}" from ${where}`,
                ).toMatch(/^(flex-)?start$/);
            }
        }
    });

    it("stops a card growing past its grid area and eating the gap below it", () => {
        for (const card of cards) {
            const values = valuesFor(card, "max-height");
            expect(
                [...values.values()],
                `${label(card)} has no max-height that applies at ${LG}px. Three cards want more than their area — the intro card by 5px, Now by 2px, the footer by 6px — and a card that no longer stretches is free to exceed its area and close the gap below it`,
            ).not.toEqual([]);
            for (const [value, where] of values) {
                // A percentage specifically: it resolves against the grid area, so
                // it binds where the rows have a set height and is inert below
                // that, where rows already size to their content. An absolute
                // length here would cap every breakpoint at the same number.
                expect(
                    value,
                    `${label(card)} must cap its block size against its grid AREA, i.e. as a percentage; found "${value}" from ${where}`,
                ).toBe("100%");
            }
        }
    });

    it("stacks the wrapped column, and leaves the smaller layouts alone", () => {
        // The wrapper is what stops the freed height turning into a gap. Two facts
        // about it are load-bearing and neither is visible from the card side.
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
        expect(effectiveValue(wrapper, "display"), "the stacked column must be a flex box at lg").toBe("flex");
        expect(effectiveValue(wrapper, "flex-direction"), "the stacked column must stack, not sit in a row").toBe("column");
        expect(effectiveValue(wrapper, "gap"), "the stacked column must separate its cards by a gap").toBeDefined();

        // Below it, the wrapper must generate NO box, or it becomes a grid item at
        // the smaller widths and changes layouts that were verified unchanged.
        const MD = 768;
        expect(
            effectiveValue(wrapper, "display", MD - 1),
            `below the md breakpoint the wrapper must be display:contents, so its cards stay direct grid items and the one-column layout is untouched`,
        ).toBe("contents");
    });

    it("gives every card heading the same space beneath it", () => {
        // The cards did not agree about this and it showed: the goal cards had 16px
        // under the heading because the progress bar supplied its own top margin,
        // while about-me and both role cards had 1px and read as cramped. The space
        // belongs to the heading, once, so that every titled card gets it.
        const headed = allCards.filter((c) => [...c.children].some((k) => k.tagName.toLowerCase() === "h2"));
        expect(headed.length, "no card renders a heading — this assertion would be vacuous").toBeGreaterThan(2);
        const gaps = new Set<string>();
        for (const card of headed) {
            const h2 = [...card.children].find((k) => k.tagName.toLowerCase() === "h2")!;
            const mb = effectiveValue(h2, "margin-bottom");
            expect(mb, `the heading of ${label(card)} declares no bottom margin at ${LG}px`).toBeDefined();
            expect(
                parseFloat(mb!),
                `the heading of ${label(card)} must hold the body off it; found "${mb}"`,
            ).toBeGreaterThan(0);
            gaps.add(mb!);
        }
        expect(
            [...gaps],
            "every card heading must reserve the SAME space beneath it, or the cards disagree again",
        ).toHaveLength(1);
    });

    it("does not let the progress bar add a second helping of that space", () => {
        // The bar used to supply the goal cards' 16px itself. Now that the heading
        // does it for every card, a top margin here would stack with it and give the
        // goal cards 32px while the others keep 16 — the same inconsistency, wider.
        const bar = document.querySelector("[role=progressbar]");
        expect(bar, "no progress bar found — this assertion would be vacuous").toBeTruthy();
        const mt = effectiveValue(bar as Element, "margin-top");
        expect(
            mt === undefined || parseFloat(mt) === 0,
            `the progress bar must not add its own top margin now that the heading reserves the space; found "${mt}"`,
        ).toBe(true);
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
            const overflow = effectiveValue(card, "overflow");
            expect(
                overflow,
                `${label(card)} declares no overflow that applies at ${LG}px`,
            ).toBeDefined();
            expect(
                overflow,
                `${label(card)} must keep clipping its overflow; the winning declaration is "${overflow}". The block-size cap above is geometric only — a card that stops clipping honours the cap and still paints over its neighbour`,
            ).toMatch(/\b(hidden|clip)\b/);
        }
    });
});
