import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {NOW} from "../src/content/home";
import {LINKS} from "../src/content/site";
import {GOALS} from "../src/lib/goal";
import {appliesAt, decl, effectiveDecl, isKeyframeStep, pageCss, parseRules, px, ROOT_PX, type Rule, structuralSelector} from "./helpers/css";

/**
 * Every styled control must be ONE box. There are seven today — six social-link
 * anchors and the theme toggle; the figures below were measured when there were
 * nine, before the two goal cards' calls to action were removed, and they are
 * quoted as history rather than as a count to re-derive.
 *
 * They were not one box, for as long as the surface existed: the eight anchors rendered
 * at four different widths (57.00, 59.59, 61.40, 62.00 px) because nothing
 * declared a width and `presetIcons` emits each icon at its artwork's aspect
 * ratio, so the icon's proportions leaked into the button's; and the theme
 * toggle rendered 60 x 40 from a second class whose max-width was below its own
 * content width, which squashed its 1em icon to 18px. Five distinct boxes over
 * nine elements. Nothing in the suite read a single box metric of any control, so
 * the whole defect class was invisible to it — `uno.config.ts` said as much.
 *
 * THE CENTRAL INVARIANT, and the reason this file is shaped the way it is:
 * **exactly one rule in the whole stylesheet may declare a control's box, and it
 * is the top-level control rule.** An earlier version of this file asserted only
 * that that one rule was self-consistent, and a skeptic pass defeated it five
 * ways with the suite green every time — `md:w-max md:px-5` in the shortcut (a
 * media-query rule the parser skipped, reproducing the ragged 57/59.59/61.40/62
 * widths bit-for-bit above 768px), `h-16` added to the toggle ELEMENT, a scoped
 * `<style>` sizing `button.theme-toggle`, `w-2.5` on an icon span, and `hidden`
 * on the goal CTAs' icons. Policing one rule is not the same as policing the box;
 * the cascade has more than one way in, so the assertions below walk every rule
 * that matches a control at any at-rule depth.
 *
 * WHAT THIS FILE STILL CANNOT PROVE, stated so nobody trusts it further than it
 * goes. There is no layout engine (linkedom parses, it does not lay out), so
 * nothing here measures a rendered box. It therefore cannot see: a control shrunk
 * below its declared width by a flex parent (`flex-shrink` — which really did
 * shrink the two goal CTAs to 47.80px at lg, and is why `flex-shrink: 0` is
 * asserted rather than assumed); grid track sizing; a control clipped by an
 * ancestor's `overflow-hidden` (the cards all clip, and they do shear the controls
 * under text-only zoom — see the box-in-px rationale in `uno.config.ts`); or
 * anything about a rendered pixel. Browser measurement across breakpoints, themes
 * and root font-sizes is the other half of this and is not optional.
 *
 * It names NO control class of its own: the set is discovered from the surface's
 * own signature — the offset plate plus the accent border — so a rename stays
 * covered and a second divergent variant is caught rather than skipped.
 *
 * THERE ARE TWO KINDS OF CONTROL NOW, AND THE TITLE ABOVE IS DELIBERATELY NOT
 * "one box" ANY MORE. The goal cards' way out became a styled control — a label
 * and a trailing mark on the same surface — so a second box joined the sheet on
 * purpose, which is the exact shape of the thing this file was written to forbid.
 * Read the difference carefully, because "a second variant appeared" is the alarm
 * and also the intended change:
 *
 *   ICON CONTROLS   width and height both DECLARED LENGTHS, and identical across
 *                   every one of them. Six social links and the theme toggle.
 *   LABEL CONTROLS  height a declared length, identical to the icon controls';
 *                   width exactly `100%`, because the label comes from data and
 *                   grows with the reader's text, so any length would be a guess
 *                   that clips. The two goal cards.
 *
 * The partition is taken from the DECLARED WIDTH rather than from a class name, so
 * it inherits the discovery above and a rename cannot slip a third kind past it:
 * `100%` is a label control, a length is an icon control, and ANY OTHER ANSWER —
 * no width at all, a `max-width` cap, `max-content`, `auto` — fails, which is the
 * original defect stated as a rule instead of as a count. `w-max` plus padding is
 * precisely how the eight anchors got four different widths.
 *
 * WHAT IS ASSERTED OF BOTH KINDS is the whole of what "one control" now means: the
 * same surface (that is the discovery signature), the same HEIGHT, the same border,
 * no cap on either axis, and no other rule anywhere in the sheet touching the box.
 * The toggle's 6px shortfall — the defect the single-box assertion existed for — is
 * caught by the shared-height assertion, not by the shared-width one.
 *
 * WHAT IS ASSERTED OF ICON CONTROLS ONLY is everything that presumes a fixed width:
 * one identical box across them, centring on both axes, the content-box room for a
 * 1em glyph, `flex-shrink: 0`, and the whole control-row group at the foot of this
 * file. A label control is a stretched item of a card's column, not an item of that
 * wrapping row, and it has no fixed width for a glyph to be measured against.
 */
describe("every styled control declares its box", () => {
    const read = (p: string) => readFileSync(p, "utf8");
    const css = pageCss();
    const html = read("dist/index.html");
    const {document} = parseHTML(html);

    /**
     * The sheet split into rules, keeping at-rule depth AND the prelude so a
     * failure can name the media query it came from. `build-output`'s `decl()`
     * helper is attribute-order-based and at-rule-blind, so it can answer with a
     * rule from inside a media query — not good enough here. Shared with
     * `page-fit.test.ts` via `helpers/css`: both need to walk the whole cascade,
     * and the pseudo-stripper in particular is too subtle to keep two copies of.
     */
    const rules: Rule[] = parseRules(css);

    /** Horizontal padding in px, whichever spelling the sheet used. UnoCSS emits
     *  `px-*` as padding-left/right longhands, never the shorthand — an earlier
     *  version read only the shorthand and scored a 14px content box as 62px. */
    const horizontalPadding = (body: string): number => {
        const one = (prop: string) => px(decl(body, prop));
        const shorthand = decl(body, "padding");
        const fromShorthand = shorthand
            ? (() => {
                const parts = shorthand.trim().split(/\s+/).map((p) => px(p));
                return parts.length > 1 ? parts[1] : parts[0];
            })()
            : null;
        const candidates = [
            one("padding-left"), one("padding-right"),
            one("padding-inline"), one("padding-inline-start"), one("padding-inline-end"),
            fromShorthand,
        ].filter((n): n is number => n !== null);
        return candidates.length ? Math.max(...candidates) : 0;
    };

    /** The surface signature: an offset plate whose colour resolves, on an accent border. */
    const isControlRule = (r: Rule) =>
        !r.nested
        && /--un-shadow:\s*2px 2px 0/.test(r.body)
        && /border-color:\s*var\(--accent\)/.test(r.body);

    const classOf = (selector: string) =>
        selector.match(/^\.((?:\\.|[\w-])+)$/)?.[1]?.replace(/\\(.)/g, "$1");

    const controlClasses = [...new Set(
        rules.filter(isControlRule)
            .flatMap((r) => r.selectors)
            .map(classOf)
            .filter((s): s is string => Boolean(s)),
    )];

    const canonicalRule = (cls: string) =>
        rules.find((r) => !r.nested && r.selectors.includes(`.${cls}`))!;

    const boxOf = (cls: string) => {
        const r = canonicalRule(cls);
        return {
            cls,
            width: decl(r.body, "width"),
            height: decl(r.body, "height"),
            minHeight: decl(r.body, "min-height"),
            maxWidth: decl(r.body, "max-width"),
            maxHeight: decl(r.body, "max-height"),
            padding: horizontalPadding(r.body),
            borderWidth: decl(r.body, "border-width"),
            fontSize: decl(r.body, "font-size"),
            display: decl(r.body, "display"),
            justify: decl(r.body, "justify-content"),
            align: decl(r.body, "align-items"),
            placeItems: decl(r.body, "place-items"),
            flexShrink: decl(r.body, "flex-shrink"),
            wraps: /\bwrap\b/.test(decl(r.body, "flex-wrap") ?? decl(r.body, "flex-flow") ?? ""),
        };
    };

    const controlElements = () =>
        [...document.querySelectorAll(controlClasses.map((c) => `.${c}`).join(","))];

    /**
     * The two kinds, split on the declared width and on nothing else. See the header.
     * `FULL_BLEED` is written as an exact match rather than "not a length" so that a
     * width this file has no opinion about — `auto`, `max-content`, a percentage that
     * is not 100 — lands in `iconBoxes` and is failed by the declared-length assertion
     * below, instead of being quietly waved through as a label control.
     */
    const FULL_BLEED = "100%";
    const allBoxes = () => controlClasses.map(boxOf);
    const iconBoxes = () => allBoxes().filter((b) => b.width !== FULL_BLEED);
    const labelBoxes = () => allBoxes().filter((b) => b.width === FULL_BLEED);

    /**
     * A CONTROL'S HEIGHT IS A PIN OR A FLOOR, AND WHICH ONE IS DECIDED BY ITS KIND.
     *
     * An icon control holds a glyph the design picked the size of, so its height is a pin and
     * a `min-height` beside it would be a second declared box — exactly the "declared twice"
     * defect the cap loop at the foot of this file exists for.
     *
     * A label control holds words that come from data and grow with the reader's text, so its
     * height must be a FLOOR. Measured on the built page at 1024x797 with a pinned height: ink
     * lost past the card's right edge went 0 / 0 / 0 / 0 / 0 / 12.7 / 42.2px across root sizes
     * 16 to 40, against 0 everywhere for the run of words this control replaced. A pinned box
     * cannot take the extra lines a broken label needs, so it spills them into a clipping card.
     * See EventsLink.astro, which carries the table and the `overflow-wrap` half of the fix.
     *
     * A FLOOR IS NOT A CAP, and that distinction is the whole reason this is allowed at all.
     * The defect the header recounts is `max-h-[40px]` making the toggle 6px short and
     * `max-w-[60px]` squashing its glyph to 18px: a cap makes a control SMALLER than its
     * content and deforms it. A floor guarantees the size and lets the content exceed it, so
     * it can only ever produce a target that is too big — which is not a failure mode this
     * file has, and not one WCAG has either.
     */
    const declaredHeight = (b: ReturnType<typeof boxOf>) => b.height ?? b.minHeight;

    const elementsOf = (boxes: ReturnType<typeof boxOf>[]) =>
        [...document.querySelectorAll(boxes.map((b) => `.${b.cls}`).join(",") || "\\:none")];

    const iconSpansOf = (control: Element) =>
        [...control.querySelectorAll("span")]
            .filter((s) => (s.getAttribute("class") ?? "").split(/\s+/).some((t) => /^i-/.test(t)));

    it("finds the control surface at all, so the assertions below are not vacuous", () => {
        expect(controlClasses.length, "no rule carries the offset-plate + accent-border signature").toBeGreaterThan(0);
        const worn = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
        for (const cls of controlClasses) {
            expect(worn.has(cls), `.${cls} is styled as a control but no element wears it`).toBe(true);
        }
        expect(elementsOf(iconBoxes()).length, "one icon control per social link, plus the theme toggle")
            .toBe(LINKS.length + 1);
        expect(elementsOf(labelBoxes()).length, "one label control per goal card — the way out to that sport's events")
            .toBe(GOALS.length);
        // Belt and braces: the two kinds must ACCOUNT FOR every control, or a third
        // kind could exist and be measured by neither of the groups below.
        expect(iconBoxes().length + labelBoxes().length, "every discovered control class must fall into exactly one kind")
            .toBe(controlClasses.length);
        expect(elementsOf(iconBoxes()).length + elementsOf(labelBoxes()).length, "every control element must belong to a kind")
            .toBe(controlElements().length);
    });

    it("declares a real width and height, rather than capping a content-sized box", () => {
        for (const box of iconBoxes()) {
            expect(px(box.width), `.${box.cls} width must be a declared length, got ${box.width ?? "nothing"}`).not.toBeNull();
        }
        // A label control's width is its container's, and that is a declaration too — what
        // it must never be is absent or capped, which is what leaves a box content-sized.
        for (const box of labelBoxes()) {
            expect(box.width, `.${box.cls} is a label control, so its width must be exactly ${FULL_BLEED}`).toBe(FULL_BLEED);
        }
        // An icon control pins its height; a label control floors it. Each must do exactly
        // one of the two, so neither can quietly acquire the other and be sized by whichever
        // wins — which is the "declared twice" defect one property along.
        for (const box of iconBoxes()) {
            expect(box.minHeight, `.${box.cls} is an icon control, so its height is a pin and must not also be floored`).toBeUndefined();
        }
        for (const box of labelBoxes()) {
            expect(box.height, `.${box.cls} is a label control, so its height must be a FLOOR — a pinned height clips a label the reader has enlarged`).toBeUndefined();
            expect(box.minHeight, `.${box.cls} must declare a min-height floor`).toBeDefined();
        }
        for (const box of allBoxes()) {
            const h = declaredHeight(box);
            expect(px(h), `.${box.cls} height must be a declared length, got ${h ?? "nothing"}`).not.toBeNull();
            // A max-* cap instead of a real size is the original defect in both of
            // its forms: it leaves the box content-sized, and it deforms the
            // content when the cap bites (the toggle's 20px icon became 18px).
            expect(box.maxWidth, `.${box.cls} must not cap its width; declare it`).toBeUndefined();
            expect(box.maxHeight, `.${box.cls} must not cap its height; declare it`).toBeUndefined();
        }
    });

    it("sizes that box in the reader's text, not in device pixels", () => {
        // This box was in px, deliberately, and the reason was recorded at length:
        // the cards' heights came from a page grid that did not grow with the root
        // font size while every card clipped, so a control that grew under text-only
        // zoom was simply sheared off — a 3rem box lost 16px to the card edge at
        // 1440x900 at a 20px root where the px box lost nothing.
        //
        // That premise is gone. The grid's height budget and every breakpoint are
        // font-relative now (see page-fit.test.ts), so the card grows with the text
        // and the page scrolls instead of clipping: measured 0 ink lost anywhere from
        // a 16px root to a 40px one. A px box under those conditions is no longer
        // protective, it is just a tap target that shrinks relative to the type it
        // sits beside — 64x48 against 40px text is a smaller target, in the reader's
        // terms, than 64x48 against 16px text.
        //
        // At the default root size this is the same 64x48 that shipped: `w-16 h-12`
        // resolves to exactly 4rem x 3rem. The target-size assertions above are
        // unaffected and still measure 64 and 48.
        // A label control's `100%` is exempt on this axis and only on this axis, because it
        // is not a size at all — it is a deferral to the card, whose own width comes from a
        // grid whose breakpoints are themselves font-relative (uno.config.ts). Its HEIGHT is
        // held to the same rule as every other control, which is the axis a clipping card
        // shears along and therefore the one this assertion exists for.
        for (const box of allBoxes()) {
            const axes = box.width === FULL_BLEED
                ? [["height", declaredHeight(box)]] as const
                : [["width", box.width], ["height", declaredHeight(box)]] as const;
            for (const [axis, value] of axes) {
                expect(
                    value,
                    `.${box.cls} ${axis} must be font-relative so the control keeps its size against the text beside it; found "${value}"`,
                ).toMatch(/\d\s*r?em\b/);
            }
        }
    });

    /**
     * A DECLARED `rem` IS ONLY THE READER'S TEXT WHILE THE ROOT FONT-SIZE IS THE READER'S.
     *
     * Every assertion above about the box being "font-relative" reads the DECLARED UNIT and
     * stops there. That is a claim about the stylesheet, not about the rendered page, and one
     * declaration collapses the difference: `html { font-size: 16px }` freezes every `rem`
     * LENGTH on the page while every `rem` MEDIA QUERY keeps re-resolving against the reader's
     * own default (which is per spec — a media-query `rem` never consults any element).
     *
     * So the page would pick its layout tier by the reader's text and then render every box in
     * device pixels — the exact mismatch the text-relative box exists to prevent, and the gate
     * stays green because the declared unit is still `rem`. Measured at 414px with a 40px
     * browser default: the control renders 160x120 with the reader's root, and 64x48 with this
     * one declaration added, while the breakpoints still move.
     *
     * `%`, `em` and `rem` on the root all resolve against the reader's default and keep
     * tracking it, so they are allowed; an absolute length or a keyword replaces it.
     */
    it("leaves the root font-size to the reader, so a declared rem IS the reader's text", () => {
        for (const r of rules) {
            const root = r.selectors.filter((s) => /^(html|:root)\b/.test(structuralSelector(s).trim()));
            if (!root.length) continue;
            const fs = decl(r.body, "font-size");
            if (fs === undefined) continue;
            expect(
                fs,
                `${root.join(", ")}${r.at ? ` inside ${r.at}` : ""} sets font-size: ${fs} — an absolute root `
                + `font-size freezes every rem LENGTH on the page while every rem media query still moves, so `
                + `the layout tier tracks the reader's text and the boxes inside it do not`,
            ).toMatch(/^[\d.]+(%|r?em)$/);
        }
    });

    it("gives every icon control the same box", () => {
        const boxes = iconBoxes();
        const tuples = new Set(boxes.map((b) => `${b.width}/${b.height}/${b.padding}/${b.borderWidth ?? "0"}/${b.fontSize}`));
        expect(
            [...tuples],
            `${boxes.length} icon-control classes resolve ${tuples.size} different boxes — a second variant is how the toggle ended up 6px shorter than the anchors`,
        ).toHaveLength(1);
    });

    /**
     * THE ASSERTION THAT CARRIES THE OLD ONE'S DEFECT, now that width is allowed to differ.
     *
     * The single-box assertion above was written for the toggle rendering 60 x 40 beside
     * anchors at 62 x 46, and the part of that which actually hurt was the HEIGHT: 40px was
     * the one control to fail SC 2.5.5, and a row of controls that do not share a height
     * reads as broken whatever their widths do. Width is now a legitimate axis of variation
     * and height is not, so the invariant moves here rather than being weakened away.
     *
     * The border goes with it because it is half the surface: a control with the plate and a
     * different border weight is a second visual object wearing the first one's mark, which
     * is the same class of defect one level up from the box.
     */
    it("gives every control the same height and the same border, whatever its width", () => {
        const boxes = allBoxes();
        const heights = new Set(boxes.map((b) => declaredHeight(b)));
        expect(
            [...heights],
            `controls resolve ${heights.size} different heights (${boxes.map((b) => `.${b.cls} ${declaredHeight(b)}`).join(", ")}) — `
            + "one shared height is what the 40px-tall toggle failed, and it is the axis a card shears along",
        ).toHaveLength(1);

        const borders = new Set(boxes.map((b) => b.borderWidth ?? "0"));
        expect(
            [...borders],
            `controls resolve ${borders.size} different border widths — the border is half the surface that identifies a control`,
        ).toHaveLength(1);
    });

    it("meets the enhanced target size on both axes", () => {
        // WCAG 2.2 SC 2.5.5 Target Size (Enhanced, AAA) is 44x44 CSS px; SC 2.5.8
        // (Minimum, AA) asks only 24x24 and was never binding here, because the
        // anchors already shipped 46px tall. 48 also lands exactly on Android's and
        // Material's 48dp recommendation and above Apple's 44pt.
        //
        // DO NOT JUSTIFY 48 WITH "the 48-CSS-px finger Lighthouse's tap-target audit
        // uses": that audit no longer exists. `tap-targets`, with its `FINGER_SIZE_PX = 48`,
        // was deleted in Lighthouse v12.0.0 (commit acfd1fb5ea, 2024-04-01) and
        // replaced by the axe-backed `target-size` audit, which measures bounding
        // rects against 24px. So no shipping tool checks 48 — the AAA number 44 is
        // the only threshold above the AA minimum that any of this is measured on.
        // Height is the axis every control declares, so it is checked for every control.
        for (const box of allBoxes()) {
            expect(px(declaredHeight(box))!, `.${box.cls} is ${declaredHeight(box)} tall`).toBeGreaterThanOrEqual(44);
        }
        // Width only where a length is declared. A label control's width is its card's, and
        // this file has no layout engine to resolve that — measured in the browser instead,
        // at 182.00px inside the goal card at 1024x797, which is the narrowest card on the
        // site. Do not convert that measurement into an assertion here: it would be reading
        // a rendered number out of a file that cannot render, which is how a gate starts
        // lying. The card's own width is gated by card-fill.test.ts and page-fit.test.ts.
        for (const box of iconBoxes()) {
            expect(px(box.width)!, `.${box.cls} is ${box.width} wide`).toBeGreaterThanOrEqual(44);
        }
    });

    /**
     * A LABEL CONTROL'S LABEL AND MARK ARE ONE LEGEND, CENTRED — and this assertion is the
     * reverse of the one it replaces, so the reason is recorded rather than swapped.
     *
     * THE RETIRED CLAIM. "A label control puts its mark on the far edge … the label names the
     * destination and the mark says the press leaves the card, so they are two statements and
     * not one phrase. Centred together they read as a single run of words with a decoration
     * after it — which is what the element looked like before it became a control." Every
     * clause of that was reasoned at the lg card, where the control is 182px and `justify-
     * content: space-between` opens a 41px gap, so the two arrangements draw nearly the same
     * object and the argument was never tested against a case that could refute it.
     *
     * WHAT IT LOOKS LIKE WHERE IT WAS NOT TESTED. Below `lg` the page is one column and this
     * card is as wide as the viewport, so the same rule strands the label at the left rail and
     * the mark at the right one:
     *
     *     viewport   320    375    390    430    640    768   1024
     *     control    254    309    324    364    558    304    182
     *     gap        113    168    183    223    417    163     41
     *
     * A wide bordered box with a small label at the left rail and a lone glyph at the right is
     * the silhouette of a select or a text field. So the retired claim's own premise — that
     * this must not read as something it is not — is what overturns it: on a phone, "two
     * statements at opposite ends" IS the wrong object, and the decoration-after-a-phrase risk
     * it was guarding against belongs to an element with no box, which this one has.
     *
     * IT IS PAINT AND NOT GEOMETRY, which is why the change is safe to make on an assertion
     * this old: `justify-content` distributes free space that already exists and cannot create
     * or consume any. Measured across three viewports x seven root sizes, the control's box is
     * identical in both builds at all 21 configurations, and ink lost past the card's clip edge
     * is 0 in every cell of both.
     *
     * THE AUTO MARGIN THIS USED TO REQUIRE IS NOW FORBIDDEN, and it is the same declaration in
     * both cases. Under `space-between` an auto inline-start margin was the only thing holding
     * the mark on the trailing edge once the control wrapped (`justify-content` has nothing to
     * distribute between when an item is alone on a line — measured, the mark landed at the LEFT
     * padding edge from a 20px root upward). Under centring that identical declaration pushes
     * the mark to the very rail the centring exists to move it off, so the assertion inverts
     * with the design rather than being deleted.
     */
    it("centres a label control's legend on both axes, and lets nothing push its mark to a rail", () => {
        expect(labelBoxes().length, "no label controls — every assertion here would be vacuous").toBeGreaterThan(0);
        for (const box of labelBoxes()) {
            expect(box.display, `.${box.cls} must lay its children out`).toMatch(/^(inline-)?(flex|grid)$/);
            expect(
                box.justify,
                `.${box.cls} packs its children at "${box.justify}". The label and the mark are one legend: `
                + "at 430px wide, pushing them apart parks a 12px glyph 223px from the words it belongs to and "
                + "draws the silhouette of a select rather than of something to press",
            ).toBe("center");
            expect(
                box.placeItems === "center" || box.align === "center",
                `.${box.cls} must centre its children on the cross axis (got align=${box.align})`,
            ).toBe(true);
            // WRAPPING IS ANTI-CLIPPING AND NOTHING WAS GATING IT. It is half of the pair that
            // keeps an enlarged label out of a card that clips — the height floor is the other
            // half, and that one IS asserted above. Rebuilt with `flex-wrap` deleted from the
            // shortcut and measured at 1024x797, a 32px root: the CONTROL is 402px tall on the
            // cycling card and 434 on the running one, against 202 with wrapping; with a pinned
            // height it was clipped outright. The previous version of this test read `flex-wrap`
            // only to decide whether a further assertion applied, so deleting the token would
            // have made that assertion vanish rather than fail.
            //
            // (418px is NOT "the cycling label" and is not a label at all: it does not
            // reproduce by any route as one, it is a CONTROL height, and it comes from
            // EventsLink.astro on origin/main where it was written as "the same label"
            // without naming a card. Restating it here pins it to the one card it does not
            // match.)
            expect(
                box.wraps,
                `.${box.cls} must let its children wrap. A label comes from data and grows with the `
                + "reader's text; with one line to fit it in, the control pushes the words sideways into a "
                + "card that clips them",
            ).toBe(true);
        }

        // AND NOTHING MAY RE-PACK THE MARK AGAINST A RAIL. An auto margin on a flex item absorbs
        // the free space on whatever line the item lands on, so a single declaration anywhere in
        // the sheet undoes the centring above on every wrapped line while `justify-content` still
        // reads "center" and every assertion above stays green. That is not hypothetical — it is
        // the declaration this control shipped with, for the arrangement this one replaces.
        //
        // Matched STRUCTURALLY against the built DOM rather than by selector text, because the
        // rule that shipped named `[aria-hidden]` and the next one need not: what matters is
        // whether it reaches something inside a label control.
        const labelControls = new Set(elementsOf(labelBoxes()));
        /**
         * AN OVER-APPROXIMATION ON PURPOSE: every margin property that CAN carry an inline
         * `auto`, and a value test that only asks whether the token appears.
         *
         * The first version of this listed the four longhands and compared the value with
         * `=== "auto"`, and a review panel defeated it three ways, each of which re-pins the
         * mark to a rail with all 290 tests green:
         *
         *   margin: 0 0 0 auto           the shorthand is never consulted — `decl` matches a
         *                                property NAME at a boundary, and lightningcss ships
         *                                the shorthand verbatim rather than expanding it
         *   margin-inline: auto 0        same, one property along
         *   margin-inline-start: auto !important   the ENUMERATED longhand, failing only the
         *                                exact-value test — the minifier ships `auto!important`
         *
         * Measured on the third: the mark's inset goes from 231.5/120.5 back to 339/13 at a
         * 430px viewport, which is verbatim the arrangement this component's own prose records
         * as the pre-fix state.
         *
         * So both halves are widened. A margin SHORTHAND that mentions `auto` anywhere is
         * treated as suspect even though `margin: auto` (all four sides) would centre rather
         * than rail — nothing in this codebase needs an auto margin inside a control, so a
         * false positive here costs a rewording and a false negative costs the defect back.
         */
        const AUTO_MARGIN = [
            "margin", "margin-inline",
            "margin-inline-start", "margin-inline-end", "margin-left", "margin-right",
        ] as const;
        const offenders: string[] = [];
        for (const rule of rules) {
            if (isKeyframeStep(rule)) continue;
            const auto = AUTO_MARGIN.filter((p) => /(?:^|\s)auto(?:\s|$|!)/.test((decl(rule.body, p) ?? "").trim()));
            if (!auto.length) continue;
            for (const selector of rule.selectors) {
                const structural = structuralSelector(selector);
                if (!structural) continue;
                for (const el of document.querySelectorAll(structural)) {
                    const owner = (el as Element).closest(labelBoxes().map((b) => `.${b.cls}`).join(","));
                    if (!owner || !labelControls.has(owner)) continue;
                    offenders.push(`${rule.at ? `${rule.at} ` : ""}${selector} {${auto.join(", ")}: auto}`);
                }
            }
        }
        expect(
            [...new Set(offenders)],
            "an auto inline margin inside a label control absorbs the line's free space and pushes the item "
            + "to a rail, which is the arrangement the centring above replaced — and it does so with "
            + "justify-content still reading \"center\", so nothing else here would notice",
        ).toEqual([]);
    });

    it("centres its icon with the container, and leaves room for the largest one", () => {
        // A fixed reference, NOT the sheet's own widest icon: an earlier version
        // took the yardstick from the same rules it was checking, so shrinking
        // every icon shrank the yardstick with it and a 45% global shrink passed.
        // presetIcons' contract for these collections is height 1em with width
        // <= 1em (the artwork's aspect ratio), so 1em is the reference.
        const ICON_REFERENCE_EM = 1;

        // Icon controls only: every line below divides the DECLARED width, and a label
        // control has none to divide. Its glyph is guarded instead by the icon-span
        // allowlist further down, which is the assertion that does not need a box.
        for (const box of iconBoxes()) {
            expect(box.display, `.${box.cls} must lay its icon out, not rely on text alignment`).toMatch(/^(inline-)?(flex|grid)$/);
            const centred = box.placeItems === "center" || (box.justify === "center" && box.align === "center");
            expect(centred, `.${box.cls} must centre on both axes (got justify=${box.justify}, align=${box.align})`).toBe(true);

            const fontPx = px(box.fontSize) ?? 16;
            const border = px(box.borderWidth) ?? 0;
            const content = px(box.width)! - 2 * border - 2 * box.padding;
            expect(
                content,
                `.${box.cls} leaves ${content}px of content box for a ${ICON_REFERENCE_EM}em (${ICON_REFERENCE_EM * fontPx}px) icon`,
            ).toBeGreaterThanOrEqual(ICON_REFERENCE_EM * fontPx);
            expect(fontPx * ICON_REFERENCE_EM, `.${box.cls} renders its icon at ${fontPx * ICON_REFERENCE_EM}px — too small to read`).toBeGreaterThanOrEqual(16);
        }
    });

    it("keeps every icon utility at its declared aspect, height 1em", () => {
        // Guards the icon side of the contract the assertion above relies on, and
        // catches a presetIcons `scale`/`customizations` change that shrinks every
        // glyph uniformly (aspect preserved, so no other assertion here notices).
        const iconRules = rules.filter((r) => !r.nested && r.selectors.some((s) => /^\.i-/.test(s)));
        expect(iconRules.length, "no icon utilities in the sheet — the parser has drifted").toBeGreaterThan(0);
        for (const r of iconRules) {
            const w = decl(r.body, "width"), h = decl(r.body, "height");
            expect(h, `${r.selectors[0]} must be 1em tall`).toBe("1em");
            const em = parseFloat(w?.match(/^([\d.]+)em$/)?.[1] ?? "0");
            expect(em, `${r.selectors[0]} width ${w} must be an em fraction of at most 1`).toBeGreaterThan(0);
            expect(em, `${r.selectors[0]} width ${w} must not exceed 1em`).toBeLessThanOrEqual(1);
        }
    });

    it("pins the box against a flex parent", () => {
        // Icon controls only, and the asymmetry is the point. These sit in a wrapping row
        // where a flex parent really did shrink two of them to 47.80px, so a declared width
        // that can be overridden is not a declared width. A label control has no width to
        // defend — it is asking for its container's — so `flex-shrink: 0` on one would be a
        // declaration with nothing to say, and on a narrow card it would be the thing that
        // pushes the control past the clip edge.
        for (const box of iconBoxes()) {
            expect(box.flexShrink, `.${box.cls} must not be shrinkable below its declared width`).toBe("0");
        }
    });

    /**
     * The assertion the five defeating mutations all needed. Every rule in the
     * sheet that MATCHES a control element — at any at-rule depth, from any source
     * including an Astro scoped `<style>` — must leave the box alone. Only the one
     * canonical control rule may declare it.
     */
    it("lets no other rule anywhere in the sheet touch a control's box", () => {
        const BOX_PROPS = [
            "width", "height", "min-width", "min-height", "max-width", "max-height",
            "padding", "padding-left", "padding-right", "padding-top", "padding-bottom",
            "padding-inline", "padding-inline-start", "padding-inline-end", "padding-block",
            "border-width", "border-left-width", "border-right-width", "border-top-width", "border-bottom-width",
            "display", "flex", "flex-shrink", "flex-basis", "flex-grow", "aspect-ratio", "font-size", "zoom",
            // `box-sizing` belongs here for the same reason a declared width does:
            // border-box and content-box give one declaration two rendered boxes.
            "box-sizing",
            /*
             * THE LAYOUT PROPERTIES BELONG HERE FOR THE SAME REASON THE BOX ONES DO, and
             * leaving them out was a hole two review dimensions found independently.
             *
             * `boxOf()` reads `canonicalRule(cls)` — the FIRST top-level rule naming the
             * shortcut class — so `display`, `justify`, `align` and `wraps` were resolved
             * from one rule with nothing resolving the cascade around them. This walk is
             * what polices the cascade, and it listed no layout property at all. So a
             * `justify-content` in a media query, on the element as a utility, or in a
             * component's scoped `<style>` won in the browser while the centring assertion
             * above still read "center".
             *
             * That is not a hypothetical: the defect this control was changed to fix lives
             * ENTIRELY below `lg`, which is exactly where a `@media (max-width: …)` override
             * bites and exactly where a single-rule read cannot look. A skeptic rebuilt the
             * pre-fix layout below `lg` with all 290 tests green.
             */
            "justify-content", "align-items", "place-items", "place-content",
            "flex-wrap", "flex-flow", "flex-direction",
            // `scale` and `zoom` are kept as a net for HAND-WRITTEN CSS only, and
            // are dead against anything UnoCSS emits: generating from this config
            // shows `scale-125`, `scale-[2]` and `zoom-150` all compile to
            // `transform`, never to a bare `scale` or `zoom` longhand. `rotate` and
            // `translate` are deliberately NOT here — they compile the same way, so
            // adding them would repeat the mistake while catching nothing, and
            // neither changes a box's size anyway. Scaling is handled below.
            "scale", "zoom",
        ];

        /**
         * Whether a rule scales a control, which no property name can answer.
         *
         * `scale` is in the list above and never fires, because UnoCSS compiles
         * `scale-125` to a `transform`, not to the `scale` longhand. But adding
         * `transform` to the list is wrong too, and measurably so: the emitted
         * `transform` VALUE for `scale-125` is byte-identical to the one for the
         * control's own `:active` press affordance — both are UnoCSS's full
         * composite string, `translateX(var(--un-translate-x)) … scaleX(var(--un-scale-x))
         * scaleY(var(--un-scale-y)) …`. Listing `transform` therefore reds the
         * suite on a 3px press translate that changes no box at all.
         *
         * What actually differs is the custom property the utility sets, so that
         * is what this reads: `--un-scale-*` bound to anything but 1. The second
         * clause catches a hand-written `transform: scale(2)` in a scoped
         * `<style>`, which goes through no custom property — the negative
         * lookahead is what keeps the composite string from matching itself.
         */
        const scalesTheBox = (body: string) => {
            const viaVar = (["--un-scale-x", "--un-scale-y", "--un-scale-z"] as const)
                .some((v) => {
                    const d = decl(body, v);
                    return d !== undefined && parseFloat(d) !== 1;
                });
            const literal = /(?:^|[^-\w])(?:scale[XYZ]?|scale3d|matrix3d?)\s*\(\s*(?!var\(\s*--un-scale)/
                .test(decl(body, "transform") ?? "");
            return viaVar || literal;
        };
        const canonical = new Set(controlClasses.map((c) => canonicalRule(c)));
        const controls = new Set(controlElements());
        const offenders: string[] = [];

        for (const rule of rules) {
            if (canonical.has(rule)) continue;
            // A `@keyframes` step's "selector" is an offset, not a selector. The
            // `/[.#[]/` filter below rejects `from`, `to` and `100%` by accident
            // rather than by design, and a FRACTIONAL stop defeats it — `33.3%`
            // contains a dot, so it reaches querySelectorAll and throws
            // `Unmatched selector: %`. That is a false red on the deploy gate,
            // caused by adding perfectly legal CSS, so the skip is explicit.
            if (isKeyframeStep(rule)) continue;
            const declared = BOX_PROPS.filter((p) => decl(rule.body, p) !== undefined);
            if (scalesTheBox(rule.body)) declared.push("transform (scaling)");
            if (!declared.length) continue;
            for (const selector of rule.selectors) {
                // Only specific selectors: the preflight's universal and
                // element-only reset rules legitimately set padding and
                // border-width on everything.
                if (!/[.#[]/.test(selector)) continue;
                const structural = structuralSelector(selector);
                if (!structural) continue;
                // Deliberately not wrapped in try/catch: a selector this cannot
                // parse must go red and be handled, because swallowing the throw
                // is how this guard would become unable to fail.
                for (const el of document.querySelectorAll(structural)) {
                    if (!controls.has(el as Element)) continue;
                    offenders.push(`${rule.at ? rule.at + " " : ""}${selector} {${declared.join(", ")}} matches <${(el as Element).tagName.toLowerCase()} class="${(el as Element).getAttribute("class")}">`);
                }
            }
        }
        // An inline `style` attribute is a route into the box that no amount of
        // stylesheet reading can see, and it outranks every rule above. Cheap to
        // close, so it is closed here rather than left as a documented limit.
        for (const el of controls) {
            const inline = (el as Element).getAttribute("style");
            expect(
                inline,
                `<${(el as Element).tagName.toLowerCase()}> carries an inline style attribute (${inline}); it wins over the control rule and is invisible to every stylesheet assertion in this file`,
            ).toBeNull();
        }
        for (const el of controls) {
            for (const span of iconSpansOf(el as Element)) {
                expect(
                    span.getAttribute("style"),
                    "a control's icon span carries an inline style attribute, which can deform the glyph inside a correctly-sized box",
                ).toBeNull();
            }
        }

        expect(
            [...new Set(offenders)],
            "only the control shortcut may declare a control's box — a media-query variant, an extra utility on the element, or a scoped <style> all reintroduce the ragged sizes with every other assertion here still green",
        ).toEqual([]);
    });

    /**
     * Same argument one level down. An icon span carries its glyph, its pin, and
     * (for the toggle) the class that swaps it per theme — nothing else. An
     * allowlist rather than a property scan, because `w-2.5` and `hidden` both
     * defeated the property-free version, and the theme-icon rules legitimately
     * set `display` on these very spans.
     */
    it("lets no utility resize or hide a control's icon", () => {
        const ALLOWED = /^(i-[\w-]+|shrink-0|theme-icon-(light|dark))$/;
        const offenders: string[] = [];
        for (const control of controlElements()) {
            const icons = iconSpansOf(control);
            expect(icons.length, `a control renders no icon span: ${control.getAttribute("class")}`).toBeGreaterThan(0);
            for (const icon of icons) {
                const tokens = (icon.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
                expect(tokens.some((t) => t === "shrink-0"), `${tokens.join(" ")} must be pinned, as the toggle's 1em icon rendered at 18px without it`).toBe(true);
                for (const token of tokens) {
                    if (!ALLOWED.test(token)) offenders.push(`${token} (on ${tokens.join(" ")})`);
                }
            }
        }
        expect(
            [...new Set(offenders)],
            "an icon span may carry only its glyph utility, shrink-0, and the theme-icon selector — anything else can resize or hide the glyph with the box still measuring correctly",
        ).toEqual([]);
    });

    /**
     * THE ROW EVERY CONTROL SITS IN, discovered from the controls rather than named.
     *
     * Naming it was a hole twice over in the version this replaces. `.button-grid` as a
     * selector STRING missed the Astro scoped `.button-grid[data-astro-cid-…]`; and the
     * class has since been renamed, which would have left every assertion keyed on the
     * old name quietly vacuous rather than red. The control set is already discovered
     * from its own surface signature, so deriving the row from the controls inherits
     * that and there is no name left to rot.
     *
     * That all of them share ONE parent is the first thing worth asserting rather than
     * assuming: a control moved out of the row sits outside everything below it.
     *
     * ICON CONTROLS ONLY, and this is where the two kinds part company hardest. "The control
     * row" is the intro card's wrapping row; the label controls live one per goal card, in a
     * different card, in the other column. Discovering the row from EVERY control would find
     * three parents and fail — correctly, under the old one-kind reading, and uselessly under
     * this one. Narrowing it here keeps the row's own assertions (wrapping, packing, the
     * minimum-width bound) pointed at the box they were measured against.
     */
    const controlRow = () => {
        const controls = elementsOf(iconBoxes());
        expect(controls.length, "no icon-control elements — every assertion about their row would be vacuous").toBeGreaterThan(1);
        const parents = [...new Set(controls.map((c) => c.parentElement))];
        expect(
            parents.map((p) => `<${p?.tagName.toLowerCase()} class="${p?.getAttribute("class")}">`),
            "every control must share one parent, or \"the control row\" names more than one box and the "
            + "minimum-width argument below covers only whichever one it happened to find",
        ).toHaveLength(1);
        return parents[0]!;
    };

    /**
     * Every rule that can reach each of `elements`, in SHEET ORDER, matched STRUCTURALLY
     * so an Astro scoped selector counts. Built in one pass over the sheet rather than
     * once per element.
     *
     * ELEMENT-ONLY AND UNIVERSAL SELECTORS ARE INCLUDED, unlike in the box guard above.
     * That guard asks "does any rule touch this element", where a preflight reset is
     * noise; this asks "what is the EFFECTIVE value", where a reset is a real declaration
     * that `effectiveDecl` orders correctly. Excluding them left every gutter on `body`
     * and `html` uncharged, and a `padding-inline` on `body` then shipped 192px of sheared
     * copy with the gate green.
     *
     * Deliberately not wrapped in try/catch: a selector this cannot parse must go red
     * rather than be silently skipped.
     */
    const reachingRules = (elements: Element[]): Map<Element, Rule[]> => {
        const wanted = new Set(elements);
        const out = new Map<Element, Rule[]>([...wanted].map((e) => [e, []]));
        for (const rule of rules) {
            if (isKeyframeStep(rule)) continue;
            const matched = new Set<Element>();
            for (const selector of rule.selectors) {
                const structural = structuralSelector(selector);
                if (!structural) continue;
                for (const el of document.querySelectorAll(structural)) {
                    if (wanted.has(el as Element)) matched.add(el as Element);
                }
            }
            for (const el of matched) out.get(el)!.push(rule);
        }
        return out;
    };

    /** The wide sample, for declarations that must resolve the same at every width. */
    const WIDE = 1440;

    /**
     * The row's flow at a width: direction and wrapping, from either the shorthand or the
     * longhands, defaulting to the CSS initial values.
     *
     * Defaulting `flex-wrap` to `nowrap` is the load-bearing half. An ABSENT declaration
     * is the failure this file's whole argument turns on — a row that does not wrap takes
     * its minimum width from the sum of its items — so it has to resolve to something the
     * assertion rejects, not to something it skips.
     */
    const flowOf = (rowRules: Rule[], width: number) => {
        const pick = (won: {value: string} | null, vocab: RegExp) =>
            won === null ? null : (won.value.trim().split(/\s+/).find((t) => vocab.test(t)) ?? null);
        const dir = effectiveDecl(rowRules, ["flex-direction", "flex-flow"], width);
        const wrap = effectiveDecl(rowRules, ["flex-wrap", "flex-flow"], width);
        return {
            display: effectiveDecl(rowRules, ["display"], width),
            direction: pick(dir, /^(row|row-reverse|column|column-reverse)$/) ?? "row",
            wrapping: pick(wrap, /^(nowrap|wrap|wrap-reverse)$/) ?? "nowrap",
        };
    };

    /**
     * THE ROW WRAPS, AND ITS LAYOUT IS DECLARED UNCONDITIONALLY.
     *
     * This replaces an assertion that each rung of a column ladder used content-sized
     * tracks. There are no rungs: three hand-written width queries granted the row
     * 4/3/2/1 columns and all three are gone, because a count of how many controls fit
     * is an approximation that has to be re-tuned whenever either side of it moves, and
     * it was wrong in both directions in turn (uno.config.ts records both).
     *
     * UNCONDITIONAL IS THE POINT, and asserting it is what makes the next test's model
     * small enough to be true. The previous version had to parse each rung's media
     * prelude, because the layout was width-gated by design — and that parsing was itself
     * a hole: `@media (max-width: 13rem) and (pointer: coarse)` looked live to every
     * assertion while the browser never applied it on a desktop, a complete revert of the
     * fix with the gate green. `@layer` was the same defect by another route, since
     * unlayered styles beat layered ones regardless of source order and nothing here can
     * model that.
     *
     * A wrapping row needs no bound at all, so the assertion becomes "no at-rule of any
     * kind may decide this row's layout" — one line that closes `@media`, `@layer`,
     * `@supports` and `@container` together, where the version it replaces needed a
     * prelude grammar plus a separate guard for the other three and still let a
     * non-width condition through.
     */
    it("wraps the control row instead of counting columns into it", () => {
        const rowEl = controlRow();
        const rowRules = reachingRules([rowEl]).get(rowEl)!;
        expect(rowRules.length, "no rule in the sheet reaches the control row").toBeGreaterThan(0);

        // Resolved as an EFFECTIVE value, not found as a declaration: among rules that all
        // match, source order decides; `flex-flow` is a shorthand that beats both
        // longhands; and Astro emits a scoped rule after the utilities.
        const flow = flowOf(rowRules, WIDE);
        expect(
            flow.display?.value,
            `the control row's display resolves to "${flow.display?.value ?? "(nothing)"}" — every argument in `
            + `this file about its minimum width is an argument about a flex container`,
        ).toMatch(/^(inline-)?flex$/);
        expect(
            flow.wrapping,
            `the control row's flex-wrap resolves to "${flow.wrapping}". A row that does not wrap takes its `
            + `minimum width from ALL of its items at once, which is the defect: seven controls plus their `
            + `separation would hold the intro card's copy column open and the card would clip it`,
        ).toBe("wrap");
        // MAIN-START PACKING IS THE OTHER HALF, and it was neither declared nor asserted. The
        // minimum-width invariant says the row cannot be wider than one control; packing is what
        // decides where a line's items sit inside the row, and centre or end packing pushes a
        // control toward the clip edge whenever the copy column itself overruns the card. The
        // flex initial value already renders main-start — verified identical to the pre-change
        // build at all 56 configurations — so this pins the default rather than declaring one.
        const packing = effectiveDecl(rowRules, ["justify-content", "place-content"], WIDE);
        expect(
            packing === null ? "normal" : (packing.value.trim().split(/\s+/).pop() ?? ""),
            `the control row packs its items at "${packing?.value ?? "normal"}". Main-start packing is `
            + `what keeps a control inside the card's clip edge when the copy column overruns it`,
        ).toMatch(/^(normal|flex-start|start|left)$/);

        expect(
            flow.direction,
            `the control row's flex-direction resolves to "${flow.direction}". A reversed or vertical flow `
            + `keeps the minimum width but is a different layout, so it must be an explicit decision rather `
            + `than something this assertion waves through`,
        ).toBe("row");

        // NO AT-RULE MAY DECIDE THIS ROW'S LAYOUT. One assertion for four mechanisms —
        // see the note above. `@media` is the one that shipped a defect; `@layer` is the
        // one `effectiveDecl` cannot model even in principle.
        const LAYOUT_PROPS = [
            "display", "flex-wrap", "flex-flow", "flex-direction", "justify-content", "place-content",
            "grid-template", "grid-template-columns", "grid-auto-flow",
            "columns", "column-count", "column-width",
        ];
        expect(
            [...new Set(rowRules
                .filter((r) => r.at !== "" && LAYOUT_PROPS.some((p) => decl(r.body, p) !== undefined))
                .map((r) => `${r.at} { ${r.selectors.join(",")} }`))],
            "an at-rule decides the control row's layout. The row wraps unconditionally so that nothing has "
            + "to be kept in step with a breakpoint by hand, and a conditional layout here reopens both the "
            + "tuning it removed and the prelude-parsing hole that let a dead rung look live",
        ).toEqual([]);

        // Inert while the row is a flex container, and forbidden anyway: a track list or a
        // column count reappearing here is the ladder coming back, and it would be dead
        // CSS in the meantime.
        for (const prop of ["grid-template", "grid-template-columns", "grid-auto-flow", "columns", "column-count", "column-width"]) {
            const won = effectiveDecl(rowRules, [prop], WIDE);
            expect(
                won ? `${won.prop}: ${won.value}` : null,
                `the control row declares ${prop}, which does nothing to a flex container. Either the row is `
                + `going back to counting columns — see uno.config.ts for why that was deleted — or this is `
                + `dead CSS`,
            ).toBeNull();
        }

        // A control's width lives in the control shortcut and nowhere else. The row is the
        // place that would most naturally restate it, and while it was a grid it did so on
        // purpose with content-sized tracks; there is nothing to restate now, so any
        // width-like declaration here is a second source of truth.
        for (const prop of ["width", "min-width", "inline-size", "min-inline-size", "flex-basis"]) {
            const won = effectiveDecl(rowRules, [prop], WIDE);
            if (won && prop === "width" && won.value === "100%") continue; // stretches, does not size
            expect(
                won ? `${won.prop}: ${won.value}` : null,
                `the control row declares ${prop}; a control's box is declared once, in the control shortcut, `
                + `and a second declaration here lets the two drift apart`,
            ).toBeNull();
        }
    });

    /**
     * THE CONTROL ROW MAY NEVER HOLD THE COPY COLUMN WIDER THAN ONE CONTROL.
     *
     * This is the assertion whose absence shipped a defect. Read the shape before changing
     * it: two method audits between them defeated its predecessor sixteen ways with the
     * whole suite green, and most of the machinery below is one of those holes closed.
     *
     * THE DEFECT. The control's box is text-relative, so N controls plus their separation
     * are a fixed number of REM — but a card's width is not: a card grows vertically with
     * its content and never horizontally, because it is as wide as the viewport allows.
     * Past some reader text size N controls stop fitting, the row's minimum content width
     * becomes the minimum width of the intro card's whole copy column, and the card's
     * clipping shears the hero copy and the controls both. Measured on the revision that
     * shipped it: 136.84 of hero copy lost at 320px wide and a 40px root, 47.44 at a 32px
     * root — inside the WCAG 1.4.4 bracket — and up to 142 of control box, which no
     * text-node sweep can see at all.
     *
     * WHAT IS ASSERTED NOW, and why it is a smaller claim than the one it replaces. The
     * row wraps, so its minimum content width is its LARGEST ITEM rather than the sum of
     * a row of them. Every item is one declared box, so that minimum is exactly one
     * control at every viewport and every text size, and there is no count and no bound
     * to check. What remains checkable — and what this asserts — is that the invariant's
     * three preconditions hold, and that even ONE control still fits:
     *
     *   1. every rendered child of the row IS a control, so "largest item" means one box;
     *   2. nothing reaching an item can raise its minimum contribution above that box;
     *   3. the chain from the viewport down to the row leaves room for one control.
     *
     * The previous version had to prove a per-width inequality between a granted column
     * count and a fitted budget. Four holes in that, all measured, all green: SOURCE ORDER
     * (two `max-width` rungs both match a narrow viewport, so the last declared wins, and
     * reordering them reverted the fix while a rung-walking test saw the same set and
     * passed); THE SHORTHAND (`grid-template` beats the longhand it read, inside the same
     * rule after minification); THE SELECTOR STRING (an Astro scoped rule emits
     * `.button-grid[data-astro-cid-…]`); and THE BUDGET (comparing against the raw
     * viewport width ignored everything between the viewport and the row, and any bound in
     * [9rem, ~11.56rem) passed while re-shipping the defect — 11rem was built and measured
     * shearing 7.44px). `effectiveDecl` plus a structural match closes the first three;
     * charging the real chain closes the fourth, and all four are still needed for
     * precondition 3.
     *
     * THE BUDGET, and why the card's RIGHT padding is not charged. Ink is lost where the
     * card clips, and `overflow: hidden` clips at the PADDING box — so content may extend
     * through the card's right padding without losing a pixel, while its left padding
     * really does push content rightward. Everything else between the viewport and the row
     * is charged on both sides, margins included. Walking the real ancestor chain rather
     * than pinning a constant is what makes `md:pr-8` on the intro row count itself in.
     * That model is not reasoned, it is FITTED TO EIGHT MEASURED OUTCOMES on the unfixed
     * revision, negatives included: it predicts loss at 320/360 at a 32px root and at
     * 320/360/375/414 at a 40px root, and NO loss at 375/414 at a 32px root.
     *
     * WHY THE ARITHMETIC MAY IGNORE THE ROOT FONT-SIZE. Every term is normalised to a 16px
     * root, so a width here means "viewport width in CSS pixels at a 16px root", and a
     * viewport of W at a root of R enters the sweep as W * 16/R. That reindexing is valid
     * only while every term scales with the root together, which is why the unit assertion
     * below is a PRECONDITION and not a tidiness check. It is also exactly what failed
     * before: an absolute control box under text-relative bounds satisfies the inequality
     * at a 16px root and violates it at 40.
     *
     * TWO THINGS THIS DELIBERATELY NO LONGER ASSERTS, both consequences of the change
     * rather than omissions.
     *
     * The GAP, and READ THE WHOLE OF THIS before concluding the gap is now harmless. It is
     * the conclusion the first half invites, and it is wrong.
     *
     * A column gap only separates items that SHARE a line, and a wrapping row's minimum is
     * one item on a line by itself, so the gap can make this row taller and never WIDER.
     * That much is measured under both layouts: `gap: 6rem` clips a control past the card's
     * right edge at 12 of 32 configurations under the column grid, worst 89px, including
     * 12px at 414px and the DEFAULT text size — and 0 at all 32 under this row. So the
     * predecessor's per-width gap resolution genuinely has nothing left to protect on the
     * horizontal axis, which is why it is gone.
     *
     * BUT TALLER IS NOT FREE. Above `md` this card's height comes from its grid row and
     * `overflow: hidden` clips the bottom as well, so the same 6rem widening puts 174px of
     * control box past the BOTTOM clip edge at 1024x768 and hides the résumé control
     * outright there and at 768x1024 and 1024x900. The gate is green throughout, and no
     * assertion in this repo reads a bottom edge — nor can one here, since linkedom does not
     * lay out. The honest statement is therefore narrow: the gap can no longer cost
     * horizontal ink, and a browser sweep at desktop widths is the only thing that sees what
     * it costs vertically. Do not restate this as "a class of change stopped being
     * dangerous"; that generalises one edge to both.
     *
     * And the COLUMN COUNT, which no longer exists.
     *
     * WHAT IT STILL CANNOT PROVE, stated so nobody trusts it further than it goes.
     * `available()` sums horizontal box edges down the ancestor chain, and above the `md`
     * breakpoint one of those ancestors is a flex row that the in-flow portrait shares —
     * so from there up `available()` is an UPPER bound on the room, i.e. permissive. It is
     * tight exactly where the defect lives: below `md` the portrait is out of flow and the
     * copy column has the whole width, which is also where the sweep's floor sits. And
     * nothing here models the copy column's other contents — one long unbreakable hero
     * word overruns the card at large text whatever this row does (BasicLayout.astro names
     * that residual and its size). Browser measurement at every width, theme and root
     * font-size is the other half of this and is not optional.
     */
    it("never lets the control row hold the copy column wider than one control", () => {
        const rowEl = controlRow();
        const mainEl = document.querySelector("main");
        expect(mainEl, "no <main> in the built page").not.toBeNull();
        const cardEl = rowEl.closest("[data-card]");
        expect(cardEl, "the control row must sit inside a card, or nothing clips it").not.toBeNull();

        // The chain STARTS AT THE ROW and runs to the document root. Both ends were wrong
        // in an earlier version and both were exploited: starting at the parent left the
        // row's own padding, border and margin free, and stopping at <main> left anything
        // on <body> or <html> free. The card is flagged because its right padding is inside
        // its own clip box and therefore usable; everything else costs space on both sides.
        const chain: {el: Element, chargeRight: boolean, label: string}[] = [];
        for (let e: Element | null = rowEl; e; e = e.parentElement) {
            chain.push({
                el: e,
                chargeRight: e !== cardEl,
                label: `<${e.tagName.toLowerCase()} class="${(e.getAttribute("class") ?? "").slice(0, 40)}">`,
            });
        }
        expect(
            chain.some((c) => c.el === cardEl) && chain.some((c) => c.el === mainEl),
            "the walk up from the control row must reach both the card and <main>, or the budget below is missing a term",
        ).toBe(true);

        // THE UA STYLESHEET IS OUTSIDE THE SHEET THIS TEST READS, so a non-rendered child
        // is exempted by TAG NAME and not by any declaration it could find: `script` is
        // `display: none` in every browser's own stylesheet and nothing in dist/*.css says
        // so. ThemeSwitcher's inline module script really is a child of this row, and it
        // has already fooled one instrument — a browser probe that counted it reported
        // every row as a row of one, because a display:none child still returns an all-zero
        // rect at the viewport origin, which became the minimum top.
        const NOT_RENDERED = new Set(["script", "style", "template", "link", "meta", "title"]);
        const items = [...rowEl.children].filter((c) => !NOT_RENDERED.has(c.tagName.toLowerCase()));
        const controls = new Set(controlElements());
        expect(
            items.filter((el) => !controls.has(el))
                .map((el) => `<${el.tagName.toLowerCase()} class="${el.getAttribute("class")}">`),
            "every rendered child of the control row must BE a control. The row's minimum width is one "
            + "control ONLY because every item in it is that one box — a single wider item restores exactly "
            + "the defect this test exists for, and no column count or wrapping mode would prevent it",
        ).toEqual([]);
        expect(items.length, "the control row must hold more than one item, or wrapping is untested by construction").toBeGreaterThan(1);

        const reaching = reachingRules([...chain.map((c) => c.el), ...items]);

        /**
         * A declared length in px, or a LOUD failure.
         *
         * An earlier version coerced an unreadable value to 0 with `?? 0`, which charges a
         * real gutter as free space and hands the budget slack it does not have. That was
         * exploited: `p-6` respelled `p-[1.5em]` renders byte-identically (the card
         * inherits the root font-size) while the card's 24px of left padding was charged as
         * nothing, and the 24px of phantom budget was exactly enough to accept a bound that
         * had been measured shearing 7.44px. `px()` reads only px and rem, so em, %, calc()
         * and custom properties all arrive here as null — and every one of them is a real
         * length the browser will honour.
         */
        const unreadable: string[] = [];
        const length = (raw: string | undefined, where: string, el?: Element): number => {
            if (raw === undefined) return 0;
            // A UNITLESS ZERO is a valid length and `px()` requires a unit, so the
            // preflight's `margin: 0` / `border-width: 0` would otherwise read as
            // unresolvable. Zero is the one value that needs no unit to be unambiguous.
            if (/^-?0(?:\.0+)?$/.test(raw)) return 0;
            // `auto` MARGINS on <main> are how the page centres, and they only consume
            // space once the viewport exceeds main's own max-width — which is the sweep's
            // ceiling, so inside the swept range they are exactly 0. Anywhere else, an auto
            // margin consumes an amount this budget cannot know, so it stays unreadable.
            if (raw === "auto" && el === mainEl) return 0;
            const n = px(raw);
            if (n === null) {
                unreadable.push(`${where}: "${raw}"`);
                return 0;
            }
            return n;
        };

        /**
         * One side of a box-edge property for an element at a width, shorthand-aware.
         *
         * THE LOGICAL AND PHYSICAL SHORTHANDS PUT THE SIDES IN DIFFERENT PLACES, and reading
         * one as the other is a hole rather than a rounding error. `padding: A B` is
         * block-then-inline, so BOTH horizontal sides are the second token; `padding-inline: A B`
         * is start-then-end, so in LTR the LEFT side is the FIRST token. An earlier version ran
         * both through the physical branch, which charged a real `padding-inline: 8rem 0` — 128px
         * of left padding — as 0, and put 262px of control box past the clip edge at 320 wide and
         * a 40px root with the whole gate green. Found by inspection, then reproduced: it clips at
         * 12 of the 32 configurations, worst 262px.
         *
         * LTR is assumed, consistently with mapping `-inline-start` to the left in `props` below.
         * The page declares `lang="en"` and no `dir`, so that holds; it would need revisiting for
         * an RTL locale, and the assumption is stated rather than buried.
         */
        const edge = (el: Element, prop: "padding" | "margin", side: "left" | "right", width: number): number => {
            const props = [prop, `${prop}-inline`, `${prop}-inline-${side === "left" ? "start" : "end"}`, `${prop}-${side}`];
            const won = effectiveDecl(reaching.get(el)!, props, width);
            if (!won) return 0;
            const parts = won.value.trim().split(/\s+/);
            const where = `${won.prop} on ${el.tagName.toLowerCase()}`;
            let pick: string;
            if (won.prop === `${prop}-inline`) {
                // At most two values are valid here. More than two is something this cannot
                // read, and an unreadable edge must be loud rather than charged as free space.
                if (parts.length > 2) {
                    unreadable.push(`${where}: "${won.value}" — a logical inline shorthand takes at most two values`);
                    return 0;
                }
                pick = parts.length === 1 ? parts[0] : (side === "left" ? parts[0] : parts[1]);
            } else if (won.prop === prop) {
                // top / right / bottom / left, with the usual 1-, 2- and 3-value fallbacks.
                pick = parts.length === 1 ? parts[0]
                    : parts.length === 4 ? (side === "left" ? parts[3] : parts[1])
                        : parts[1];
            } else {
                pick = parts[0]; // a single-side longhand
            }
            // `auto` on a margin is legitimate and centres rather than consuming a knowable
            // amount, so it is reported as unmodelled rather than silently read as zero.
            return length(pick, where, el);
        };
        /**
         * One side's border width, SHORTHANDS INCLUDED.
         *
         * Reading only `border-width` and `border-<side>-width` missed every shorthand
         * spelling — `border`, `border-left`, `border-inline`, `border-inline-start` — each
         * of which sets the used width and any of which a hand-written scoped `<style>` would
         * plausibly use. It also always took `parts[0]`, so the four-value form of
         * `border-width` charged the TOP width for both horizontal sides.
         *
         * In a shorthand like `border: 2rem solid red` the width is the token that reads as a
         * length, so that is what is picked; an unreadable one still reaches `length()` and is
         * reported through `unreadable` rather than charged as zero. Bare `border` is safe to
         * list because `decl()` anchors on `(?:^|;)\s*border\s*:`, so the sheet's
         * `--card-border:` custom properties cannot match it.
         */
        const border = (el: Element, side: "left" | "right", width: number): number => {
            const flow = side === "left" ? "start" : "end";
            const props = [
                "border", "border-width", "border-inline", "border-inline-width",
                `border-${side}`, `border-${side}-width`,
                `border-inline-${flow}`, `border-inline-${flow}-width`,
            ];
            const won = effectiveDecl(reaching.get(el)!, props, width);
            if (!won) return 0;
            const parts = won.value.trim().split(/\s+/);
            const isLength = (t: string) => /^-?0(?:\.0+)?$/.test(t) || px(t) !== null;
            const pick = /(?:^|-)width$/.test(won.prop)
                ? (parts.length === 4 ? (side === "left" ? parts[3] : parts[1])
                    : parts.length >= 2 ? parts[1] : parts[0])
                : (parts.find(isLength) ?? parts[0]);
            return length(pick, `${won.prop} on ${el.tagName.toLowerCase()}`, el);
        };

        /**
         * Space the row may occupy at `width` before the card starts clipping it — the sum
         * of every horizontal box edge between the document root and the row's content.
         * MARGINS are charged as well as padding and border: a `margin-left` on the row
         * shifts its content rightward exactly as the card's padding does, and leaving them
         * out let a 2rem margin push a control 22px past the clip edge with the gate green.
         *
         * WHAT CHARGING THEM BUYS HERE IS NARROWER THAN THAT HISTORY SUGGESTS, and saying so
         * is the point. That 2rem margin is caught by the per-width inequality the ladder
         * needed and this file no longer has. The surviving sweep asks only "does ONE control
         * fit", and `gutters` is derived from `available()` itself at a narrow width — so a
         * margin added to the row raises the chrome and the floor together and the comparison
         * cannot fail below `md` by construction. Margins are still charged because
         * `available()` is also what the zoom-ceiling figure is computed from, and an
         * uncharged margin overstates that; but a margin mutation goes red on the parent
         * commit and green here, and that is a coverage loss the invariant does not replace.
         */
        const available = (width: number): number => width - chain.reduce((spent, c) => spent
            + edge(c.el, "padding", "left", width) + edge(c.el, "margin", "left", width)
            + border(c.el, "left", width) + border(c.el, "right", width)
            + (c.chargeRight ? edge(c.el, "padding", "right", width) + edge(c.el, "margin", "right", width) : 0), 0);

        // --- precondition 1: the row wraps, at every width in the sweep ----------------
        // The sibling test above proves this is declared unconditionally and resolves
        // correctly at one width. It is re-resolved at every swept width here rather than
        // taken on trust, because the two assertions fail for different reasons and this
        // one is the premise of everything below it.
        const rowRules = reaching.get(rowEl)!;

        // --- precondition 2: every item's minimum contribution is one control ----------
        // ICON CONTROLS ONLY, for the reason `controlRow()` gives: the row holds those and
        // nothing else. Reading every control here would find `100%` beside `4rem` and fail
        // on a width belonging to a control in another card entirely.
        const boxes = iconBoxes();
        expect(
            [...new Set(boxes.map((b) => b.width))],
            "the row's controls declare more than one width, so \"the largest item\" is not a single number and "
            + "the row's minimum width is whichever of them is biggest",
        ).toHaveLength(1);
        const declaredWidth = boxes[0].width;
        const controlWidth = px(declaredWidth);
        expect(controlWidth, "the control must declare a readable width").not.toBeNull();

        // PRECONDITION OF THE NORMALISATION. If the control's box stops scaling with the
        // root, every comparison below is a statement about a 16px root only — which is the
        // defect this test exists for — so it refuses to run rather than reporting a pass.
        expect(
            /rem$/.test(declaredWidth ?? ""),
            `the control's width is "${declaredWidth}"; in device pixels the arithmetic below holds at a `
            + `16px root and breaks at every larger one, which is the shape of the shipped defect`,
        ).toBe(true);

        /**
         * WHAT COULD RAISE AN ITEM'S MINIMUM CONTRIBUTION, refused rather than modelled.
         *
         * An allowlist, not a blocklist, and for the same reason the chain has one below: a
         * blocklist is a list of the mechanisms somebody already thought of. A flex item's
         * minimum contribution comes from its flex basis clamped by its own min and max
         * sizes, so anything that can raise any of those raises the row's minimum width and
         * puts the copy column back where it was.
         *
         * `box-sizing: border-box` is asserted positively rather than allowed, because it is
         * what makes the declared width the OUTER width — with `content-box` the border and
         * any padding would sit outside it and the one number this whole file protects would
         * not be the number that renders.
         */
        const ITEM_DECIDING = [
            "min-width", "min-inline-size", "width", "inline-size", "flex", "flex-basis",
            "margin", "margin-left", "margin-right", "margin-inline", "margin-inline-start", "margin-inline-end",
            "padding", "padding-left", "padding-right", "padding-inline", "padding-inline-start", "padding-inline-end",
            "box-sizing", "display", "position", "float",
            // `order` reorders the row without touching any box: it desynchronises
            // visual reading order from DOM and tab order (WCAG 1.3.2 / 2.4.3) while every
            // geometric assertion here stays green. Measured: `order-last` on the theme
            // toggle moves it from visual position 1/7 to 7/7 at six widths while it
            // remains the first tab stop. Nothing reaching a control declares it today,
            // so no exemption clause is needed. It is a PRE-EXISTING gap, not one this
            // change opened — the same mutation is equally green on the column ladder.
            "order",
        ];
        const itemOffenders: string[] = [];
        for (const el of items) {
            const sizing = effectiveDecl(reaching.get(el)!, ["box-sizing"], WIDE);
            expect(
                sizing?.value,
                `an item of the control row resolves box-sizing to "${sizing?.value ?? "(nothing)"}". The `
                + `control's declared width is only its outer width under border-box, and this test compares `
                + `outer widths`,
            ).toBe("border-box");
            for (const rule of reaching.get(el)!) {
                for (const prop of ITEM_DECIDING) {
                    const value = decl(rule.body, prop);
                    if (value === undefined) continue;
                    // The declarations an item legitimately carries, each harmless for a
                    // stated reason.
                    if (/^(min-)?(width|inline-size)$/.test(prop) && value === declaredWidth) continue;
                    if (prop === "box-sizing" && value === "border-box") continue;
                    if (prop === "display" && /^(inline-)?flex$/.test(value)) continue;
                    if (prop === "position" && /^(relative|static)$/.test(value)) continue;
                    // Zero on every side, whichever spelling: the preflight resets the
                    // button's margin and padding, and border-box makes padding irrelevant
                    // to the outer width anyway. A NON-zero one is a real term and is
                    // reported rather than reasoned about.
                    if (/^(margin|padding)/.test(prop)
                        && value.trim().split(/\s+/).every((t) => length(t, `${prop} on an item of the control row`, el) === 0)) continue;
                    itemOffenders.push(`${rule.at ? rule.at + " " : ""}${rule.selectors[0]} { ${prop}: ${value} } on <${el.tagName.toLowerCase()} class="${(el.getAttribute("class") ?? "").slice(0, 40)}">`);
                }
            }
        }
        expect(
            [...new Set(itemOffenders)].slice(0, 4),
            `${new Set(itemOffenders).size} declaration(s) reaching an item of the control row can raise its `
            + `minimum contribution above the one control box this test compares against. The row's minimum `
            + `width is its largest item, so any of these holds the copy column open exactly as the deleted `
            + `column ladder did`,
        ).toEqual([]);

        // A FLOOR is a second declared box and beats the declared width for the used value,
        // exactly as a cap does. The canonical rule is checked here because the sheet-wide
        // guard above deliberately exempts it.
        // EVERY control, with a label control exempt from `min-height` ALONE, on the reasoning
        // recorded at `declaredHeight`. Its width and both caps are policed like anyone else's.
        //
        // This loop read `iconBoxes()` for one revision and the comment beside it claimed the
        // narrower scope was `min-height` only — the code exempted the label kind from all four
        // properties. A reviewer proved the hole rather than arguing it: `min-w-[20rem]` on the
        // `control-cta` shortcut resolves the control to 320px inside a 182px goal card, past
        // the card's clip edge at every lg width, and the whole suite stayed green at 281/281.
        // The identical mutation on `.control` was still caught, which is what made it this
        // diff's regression rather than an inherited gap.
        const labelClasses = new Set(labelBoxes().map((b) => b.cls));
        for (const cls of controlClasses) {
            for (const prop of ["min-width", "min-height", "max-width", "max-height"] as const) {
                if (prop === "min-height" && labelClasses.has(cls)) continue;
                expect(
                    decl(canonicalRule(cls).body, prop),
                    `.${cls} declares ${prop}; the control's box must be declared once, not floored or capped, `
                    + `or the width this test compares is not the width that renders`,
                ).toBeUndefined();
            }
        }
        // No stylesheet reading can see an inline style, and it outranks all of it. On the
        // row it decides the layout outright — `display: block` alone makes every argument
        // above vacuous — and on an item it decides the box.
        for (const el of [rowEl, ...items]) {
            const inline = el.getAttribute("style") ?? "";
            expect(
                inline.match(/(?:^|;)\s*(flex[\w-]*|display|width|min-width|inline-size|min-inline-size|grid[\w-]*|margin[\w-]*)\s*:/i)?.[1] ?? null,
                `<${el.tagName.toLowerCase()}> in the control row carries an inline style (${inline}) that decides `
                + `its layout or its box, and is invisible to every stylesheet assertion in this file`,
            ).toBeNull();
        }

        /**
         * WHAT THE CHAIN WALK STILL CANNOT MODEL, refused rather than approximated.
         *
         * `available()` sums horizontal box edges. Anything else on the chain that decides
         * the row's used inline size is outside the model, and each of these was exploited
         * with the gate green: `min-width: 20rem` on the row held the copy column open and
         * sheared 334px of prose; `grid-auto-flow: column` made a template irrelevant and
         * put 266px of control box past the clip edge AT THE DEFAULT TEXT SIZE;
         * `transform: scale(1.35)` grew the painted boxes without touching layout.
         *
         * An allowlist of what may appear, not a blocklist of what may not — an earlier
         * version guarded `grid-auto-flow` in the inline style attribute only, and the
         * stylesheet route walked straight past it.
         */
        const LAYOUT_DECIDING = [
            "min-width", "max-width", "width", "min-inline-size", "max-inline-size", "inline-size",
            "grid-auto-flow", "grid-auto-columns", "columns", "column-count", "column-width",
            "transform", "zoom", "scale", "box-sizing", "position", "float", "display", "flex-basis", "flex",
        ];
        const unmodelled: string[] = [];
        for (const c of chain) {
            for (const rule of reaching.get(c.el)!) {
                for (const prop of LAYOUT_DECIDING) {
                    const value = decl(rule.body, prop);
                    if (value === undefined) continue;
                    // The declarations this page legitimately carries, each harmless over
                    // the swept range for a stated reason.
                    if (prop === "display" && /^(grid|flex|block|contents)$/.test(value) && c.el !== rowEl) continue;
                    if (prop === "display" && /^(inline-)?flex$/.test(value) && c.el === rowEl) continue;
                    if (prop === "box-sizing" && value === "border-box") continue;
                    if (prop === "position" && /^(relative|static)$/.test(value)) continue;
                    if (prop === "width" && value === "100%") continue;
                    // `main` is `max-width: 72rem` + auto margins, i.e. it centres once the
                    // viewport exceeds that. The sweep stops below it so the clamp cannot
                    // bind, which is asserted rather than assumed just below.
                    if (prop === "max-width" && c.el === mainEl) continue;
                    unmodelled.push(`${rule.at ? rule.at + " " : ""}${rule.selectors[0]} { ${prop}: ${value} } on ${c.label}`);
                }
            }
        }
        expect(
            [...new Set(unmodelled)].slice(0, 4),
            `${new Set(unmodelled).size} declaration(s) on the chain from the control row to the document root `
            + `decide its used width in a way this test's budget does not model. Model it or remove it — `
            + `every one of these has shipped a measured defect through a green gate`,
        ).toEqual([]);

        // --- precondition 3: the chain leaves room for one control --------------------
        // Below one control there is nothing left to wrap to: the control itself is
        // clipped, and no layout on this page can prevent it. So this is the floor, it is
        // a real limitation rather than a fudge, and the zoom assertion after the sweep
        // states which text size it corresponds to.
        // Sampled at a narrow width deliberately: below `md` the chain carries no
        // width-gated padding, so this is the chrome the binding case actually pays.
        const gutters = 300 - available(300);
        expect(gutters, "the card's chrome must resolve to a positive number of pixels").toBeGreaterThan(0);
        const floor = Math.ceil(controlWidth! + gutters);
        // THE SWEEP'S CEILING. Above `main`'s own max-width the page centres and the budget
        // above stops describing it, so the sweep stops there.
        const mainMax = px(effectiveDecl(reaching.get(mainEl!)!, ["max-width"], WIDE)?.value);
        expect(mainMax, "<main> must declare a readable max-width for the sweep to bound itself by").not.toBeNull();
        const ceiling = mainMax!;
        const widths: number[] = [];
        for (let w = floor; w <= Math.min(700, ceiling); w++) widths.push(w);
        for (let w = 704; w <= ceiling; w += 8) widths.push(w);
        expect(
            widths.length,
            `the sweep covers ${widths.length} widths from ${floor} to ${ceiling}; a range this small means the `
            + `floor and the ceiling have collapsed together and every per-width assertion below is near-vacuous`,
        ).toBeGreaterThan(100);

        const offenders: string[] = [];
        for (const width of widths) {
            const flow = flowOf(rowRules, width);
            if (flow.wrapping !== "wrap" || !/^(inline-)?flex$/.test(flow.display?.value ?? "")) {
                offenders.push(
                    `at ${width}px (16px root) the control row resolves to display "${flow.display?.value ?? "(nothing)"}" `
                    + `and flex-wrap "${flow.wrapping}", so at that width its minimum width is not one control`,
                );
                continue;
            }
            const room = available(width);
            if (room < controlWidth!) {
                offenders.push(
                    `at ${width}px (16px root) the chain between the viewport and the control row leaves ${room}px, `
                    + `less than the ${controlWidth}px one control needs — there is nothing below one item to wrap `
                    + `to, so the control itself is clipped`,
                );
            }
        }
        expect(offenders.slice(0, 4), `${offenders.length} of ${widths.length} widths cannot seat one control`).toEqual([]);

        // AFTER the sweep, deliberately: `unreadable` is populated by `edge()`, which
        // nothing calls until the sweep runs. Asserted where it was first written — above
        // the sweep — it was empty every time and could not fail, which is how an
        // em-respelled padding charged as zero survived a hardening pass aimed at it.
        expect(
            [...new Set(unreadable)].slice(0, 4),
            "a box edge between the control row and the document root is declared in a unit this test cannot "
            + "resolve, so it was charged as FREE SPACE. That is exactly how respelling the card's `p-6` as "
            + "`p-[1.5em]` — byte-identical rendering — bought back a bound measured shearing 7.44px",
        ).toEqual([]);

        // THE LIMITATION, stated as a number so it cannot rot. A 320px phone reaches this
        // floor at a root of 320 * 16 / floor; below that the single control is clipped and
        // no layout here can prevent it. 200% (a 32px root) is the WCAG 1.4.4 bracket and
        // must stay comfortably clear.
        const zoomCeiling = (320 * ROOT_PX) / floor;
        expect(
            zoomCeiling,
            `one control plus the card's chrome needs ${floor}px, so on a 320px viewport this layout only `
            + `holds to a ${zoomCeiling.toFixed(1)}px root. SC 1.4.4 asks for 32px (200%)`,
        ).toBeGreaterThanOrEqual(32);
    });

    /**
     * THE NOW CARD'S EXPLAINER IS A TARGET TOO, and it is deliberately not a `.control`.
     *
     * It is an icon-only link in a card corner with no visible words, which makes it the
     * one interactive element on the page whose whole hit area is decided by a box nobody
     * else's tests look at. Shrink it to the glyph and it becomes a 16px target.
     *
     * 24px, and NOT the 48px tall the plated controls get (they are 64x48; only the
     * shorter axis bears on target size), which is a real inconsistency and worth stating
     * rather than hiding. 24x24 is exactly WCAG 2.2 SC 2.5.8 (Minimum, AA)
     * and is the number axe's `target-size` audit measures; SC 2.5.5 (Enhanced, AAA) asks
     * 44 and this does not meet it. The reason is position, not principle, and the binding
     * constraint is HORIZONTAL. Measured at 1440x900, everything from the card's
     * border-box left edge: the marks occupy 191–239px, the heading's own text box ends at
     * 175px, and widening the target to 44px would move the marks' left edge to 171px —
     * i.e. under the heading. The controls are a card's primary affordances in a grid of
     * their own and have the room; this is a supplementary link beside a heading.
     *
     * THE VERTICAL DIRECTION IS NOT A REASON. "At 44px the box would run down into the
     * first line of the body copy" is the plausible objection and it is false. Measured with
     * a 44px override injected, the heading box runs 25->53px, the
     * 16px heading margin puts the paragraph's first line box at 69, and a 44px mark
     * starting at 25 ends at exactly 69 — it abuts the line box and clears its first ink by
     * 1px. Structurally that is not a coincidence: the mark starts at the heading's top and
     * the heading plus its margin is 44px tall at the default text size, so the two are the
     * same height by construction. It touches nothing.
     *
     * Those last two figures read 176 and 172 in the first draft, derived from the card's
     * padding without counting its 1px border. The conclusion is unchanged — 4px of
     * overlap either way — but the numbers were wrong, and they are measured now rather
     * than reasoned.
     *
     * The heading's right padding is what keeps the two apart, and it was verified rather
     * than assumed: a deliberately long title wraps to four lines and its ink reaches
     * 168.5px, clear of the corner at 191px. It does NOT protect against a single
     * unbreakable word, which reaches 677px and overruns the whole card — but such a word
     * overflows a card heading with or without this slot, so that is a property of long
     * unbreakable words here, not of the corner.
     *
     * The box is font-relative for the same reason everything else on this page is: a
     * target that stays 24px while the reader's text doubles is a target that has
     * halved. `w-6 h-6` is 1.5rem, so it grows with the type.
     */
    it("gives the Now card's icon-only explainer a real target, sized in text", () => {
        const link = [...document.querySelectorAll("[data-card] a")]
            .find((a) => a.getAttribute("href") === NOW.explainer_url);
        expect(link, `no link to ${NOW.explainer_url} — this assertion would be vacuous`).toBeTruthy();

        // THE INLINE `style` ATTRIBUTE FIRST, because a sheet-only walk cannot see it and
        // it beats every author rule short of `!important`. `style="width:16px"` was the
        // cheapest way found to break the one number this test exists to protect.
        const inline = (link!.getAttribute("style") ?? "").toLowerCase();
        expect(
            inline,
            `the explainer must not size itself from a style attribute, which outranks every rule this test reads; found "${inline}"`,
        ).not.toMatch(/(^|;)\s*(min-|max-)?(width|height|block-size|inline-size)\s*:/);

        // Every rule that can reach the element, kept WITH its at-rule prelude.
        const reaching = rules.filter((r) => !isKeyframeStep(r) && r.selectors.some((s) => {
            const structural = structuralSelector(s);
            return Boolean(structural) && [...document.querySelectorAll(structural)].includes(link as never);
        }));
        expect(reaching.length, "no rule in the sheet reaches the explainer link — the walker has drifted").toBeGreaterThan(0);

        // AT EVERY WIDTH, not once over the union of all at-rule depths. Gating the box
        // behind `lg:` left every phone and tablet declaring no size at all — the target
        // collapsed to the 1em glyph, 16px, exactly where SC 2.5.8 bites — with the suite
        // green. This file's own header records the same hole in the control path
        // (`md:w-max md:px-5`), and `appliesAt` exists for it.
        for (const width of [320, 375, 768, 1024, 1440]) {
            const applying = reaching.filter((r) => appliesAt(r, width));

            for (const prop of ["width", "height"] as const) {
                const declared = applying.flatMap((r) => {
                    const v = decl(r.body, prop);
                    return v ? [v] : [];
                });
                expect(
                    declared,
                    `the explainer link declares no ${prop} at ${width}px. An inline box's padding hit-tests but adds nothing to the line box, so a target with no declared box is only as big as its glyph`,
                ).not.toEqual([]);
                const winner = declared[declared.length - 1];
                expect(
                    px(winner),
                    `the explainer's ${prop} at ${width}px resolves to "${winner}", which is not a length this can measure`,
                ).not.toBeNull();
                expect(
                    px(winner)!,
                    `the explainer's ${prop} at ${width}px is ${winner} (${px(winner)}px at a 16px root); SC 2.5.8 asks 24`,
                ).toBeGreaterThanOrEqual(24);
                expect(
                    winner,
                    `the explainer's ${prop} at ${width}px must be font-relative, or the target shrinks against the reader's text; found "${winner}"`,
                ).toMatch(/\d\s*r?em\b/);

                // A `max-*` BELOW the declared size wins the used value with no
                // specificity or ordering involved. This is the theme-toggle defect this
                // whole file was written for — `max-h-[40px]` made that button 6px short —
                // and `max-w-4 max-h-4` beside a 1.5rem box renders 16px with every
                // assertion above still green.
                for (const cap of applying.flatMap((r) => {
                    const v = decl(r.body, `max-${prop}`);
                    return v ? [{v, r}] : [];
                })) {
                    const capPx = px(cap.v);
                    expect(
                        capPx === null || capPx >= 24,
                        `the explainer's max-${prop} at ${width}px is "${cap.v}", below the 24px this target must keep; a max cap under the declared size wins the used value outright`,
                    ).toBe(true);
                }
            }

            // PAINTED AND REACHABLE. Every assertion above passes on a box that is not
            // displayed, or that hit-tests nothing, or that cannot be tabbed to — and each
            // of those is strictly worse than the visible-text link this replaced.
            //
            // Walked up the ANCESTOR CHAIN, not just over the link's own rules. `display:
            // none` on the marks group hides the link without any rule reaching the link
            // itself, so a link-only check stayed green while both marks vanished from the
            // page AND from the accessibility tree — measured, that is exactly what
            // happened on the first version of this assertion.
            for (let el: Element | null = link!; el && el !== document.body; el = el.parentElement) {
                const chainRules = rules.filter((r) => !isKeyframeStep(r) && appliesAt(r, width) && r.selectors.some((s) => {
                    const structural = structuralSelector(s);
                    return Boolean(structural) && [...document.querySelectorAll(structural)].includes(el as never);
                }));
                for (const r of chainRules) {
                    for (const [prop, forbidden] of [["display", /^none$/], ["visibility", /^(hidden|collapse)$/], ["pointer-events", /^none$/]] as const) {
                        const v = decl(r.body, prop);
                        if (v === undefined) continue;
                        expect(
                            v.trim(),
                            `<${el!.tagName.toLowerCase()}> above the explainer resolves ${prop}: ${v} at ${width}px, which leaves a correctly-sized target that no reader can see or use`,
                        ).not.toMatch(forbidden);
                    }
                }
            }
        }

        // Keyboard reachable. A negative tabindex removes it from the tab order while
        // every geometric assertion stays green.
        const tabindex = link!.getAttribute("tabindex");
        expect(
            tabindex === null || Number(tabindex) >= 0,
            `the explainer carries tabindex="${tabindex}", so it is sized correctly and cannot be reached by keyboard`,
        ).toBe(true);
    });
});

/**
 * THE SECOND KIND OF CONTROL, AND THE REASON IT NEEDS A ROUTE OF ITS OWN.
 *
 * Everything above discovers a control by the PLATE'S signature — an offset shadow on an
 * `--accent` border. The chip has neither: it is a hairline at a fraction of the ink on the
 * page's own ground, deliberately quiet, because the plate is this site's mark for a page's
 * one action and a filter row is not one. So for as long as the chip existed it was invisible
 * here, and the whole of its box was a descendant selector in one page's scoped `<style>`
 * that no gate in this file could reach.
 *
 * THE TWO ROUTES ARE NOT COLLAPSED, and that is deliberate rather than duplication. The kinds
 * have different contracts: a plate declares one shared height across every wearer and carries
 * a resolvable shadow, and a chip declares neither and must not. Merging them would mean
 * weakening whichever assertions the other kind cannot satisfy, which is how a gate stops
 * being about anything.
 *
 * IT IS KEYED ON THE SURFACE'S SIGNATURE RATHER THAN ON A CLASS NAME, exactly as the plate
 * route is. A hard-coded `.chip` would certify a renamed shortcut by finding nothing, which is
 * the vacuity this file's header spends most of its length on. The signature is the three
 * things that make this surface that surface: a border colour mixed from the ink, an opaque
 * page ground, and NO plate. The bib's own outline shares the first of those and is excluded
 * by the other two — checked, not assumed; see the calibration assertion below.
 *
 * IT READS THE WALL rather than the home page, because that is where chips are worn. The home
 * page carries none and will not after this change either, so pointing the existing route's
 * `dist/index.html` at this kind would have made every assertion below vacuous on day one.
 */
describe("every chip declares its box, and wears no plate", () => {
    const read = (p: string) => readFileSync(p, "utf8");
    const PAGE = "dist/patches/index.html";
    const css = pageCss();
    const {document} = parseHTML(read(PAGE));
    const rules: Rule[] = parseRules(css);

    /**
     * The quiet surface: a hairline mixed from the ink, on an opaque page ground.
     *
     * BOTH CLAUSES EARN THEIR PLACE. `.bib--booked` and `.bib--dnf` carry the identical
     * `border-color` — the outline of a race not yet earned is drawn in the same hairline on
     * purpose — and declare no background, so the second clause is what keeps a bib out of a
     * set of controls. The plate's own surface satisfies the second and not the first, since
     * its border is `--accent` rather than a mix of the ink.
     *
     * THE ABSENCE OF A PLATE IS DELIBERATELY *NOT* IN THE SIGNATURE, and that is the one
     * subtle thing here. Adding `!/--un-shadow/` reads as a tightening and is the opposite: it
     * would make "wears no plate" below unfalsifiable, because a chip that grew a plate would
     * stop matching and simply vanish from the set. Measured — with that clause in, plating
     * the chip failed the vacuity floor instead of the assertion written for it. Discover on
     * what the surface IS; assert what it must not have.
     */
    const isChipRule = (r: Rule) =>
        !r.nested
        && /border-color:\s*color-mix\([^)]*var\(--text\)/.test(r.body)
        && /background-color:\s*var\(--background\)/.test(r.body);

    const classOf = (selector: string) =>
        selector.match(/^\.((?:\\.|[\w-])+)$/)?.[1]?.replace(/\\(.)/g, "$1");

    const chipClasses = [...new Set(
        rules.filter(isChipRule)
            .flatMap((r) => r.selectors)
            .map(classOf)
            .filter((s): s is string => Boolean(s)),
    )];

    const canonicalRule = (cls: string) =>
        rules.find((r) => !r.nested && r.selectors.includes(`.${cls}`))!;

    const boxOf = (cls: string) => {
        const r = canonicalRule(cls);
        return {
            cls,
            width: decl(r.body, "width"),
            height: decl(r.body, "height"),
            minWidth: decl(r.body, "min-width"),
            minHeight: decl(r.body, "min-height"),
            maxWidth: decl(r.body, "max-width"),
            maxHeight: decl(r.body, "max-height"),
            shadow: decl(r.body, "box-shadow") ?? decl(r.body, "--un-shadow"),
        };
    };

    const allBoxes = () => chipClasses.map(boxOf);
    /** A glyph box PINS, because its content is one mark the design picked the size of. */
    const pinned = () => allBoxes().filter((b) => b.width !== undefined || b.height !== undefined);
    /** A labelled box FLOORS, because its label comes from data and has to be free to grow. */
    const floored = () => allBoxes().filter((b) => b.width === undefined && b.height === undefined);

    const chipElements = () =>
        [...document.querySelectorAll(chipClasses.map((c) => `.${c}`).join(",") || "\\:none")];

    it("finds the chip surface at all, and does not mistake a bib for one", () => {
        expect(chipClasses.length, "no rule carries the quiet-surface signature").toBeGreaterThan(0);
        // The calibration this whole route turns on. `.bib--booked` and `.bib--dnf` carry the
        // same hairline; if the signature ever widened to catch them, every box assertion
        // below would start failing on an element that is not a control at all — which reads
        // as a real defect and is not one.
        for (const cls of chipClasses) {
            expect(cls, `${cls} is not a control — the chip signature has widened to catch a bib`)
                .not.toMatch(/^bib/);
        }
        expect(chipElements().length, `${PAGE} wears no chip, so every assertion here would be vacuous`)
            .toBeGreaterThan(0);
        // Belt and braces, as the plate route does it: the two kinds must ACCOUNT for every
        // chip class, or a third box could exist and be measured by neither group.
        expect(pinned().length + floored().length, "every chip class must fall into exactly one kind")
            .toBe(chipClasses.length);
    });

    it("wears no plate, which is the whole distinction from the other kind", () => {
        for (const box of allBoxes()) {
            expect(box.shadow, `.${box.cls} carries a plate. That mark is reserved for a page's `
                + "one action; a chip is chrome and spending the mark on it dilutes it")
                .toBeUndefined();
        }
    });

    it("declares its own box on both axes, flooring a label and pinning a mark", () => {
        expect(floored().length, "no labelled chip — this assertion would be vacuous").toBeGreaterThan(0);
        for (const box of floored()) {
            expect(box.minWidth, `.${box.cls} holds a label from data, so it must FLOOR its width`).toBeDefined();
            expect(box.minHeight, `.${box.cls} holds a label from data, so it must FLOOR its height`).toBeDefined();
        }
        for (const box of pinned()) {
            expect(box.width, `.${box.cls} holds one mark, so it must PIN its width`).toBeDefined();
            expect(box.height, `.${box.cls} holds one mark, so it must PIN its height`).toBeDefined();
            // A pin and a floor together are two declared boxes sized by whichever wins —
            // the "declared twice" defect the plate route names one property along.
            expect(box.minWidth, `.${box.cls} pins its width and must not also floor it`).toBeUndefined();
            expect(box.minHeight, `.${box.cls} pins its height and must not also floor it`).toBeUndefined();
        }
        // A cap instead of a real size is the original defect this whole file exists for: it
        // leaves the box content-sized, and it deforms the content when the cap bites.
        for (const box of allBoxes()) {
            expect(box.maxWidth, `.${box.cls} must not cap its width; declare it`).toBeUndefined();
            expect(box.maxHeight, `.${box.cls} must not cap its height; declare it`).toBeUndefined();
        }
    });

    it("sizes that box in the reader's text, not in device pixels", () => {
        for (const box of allBoxes()) {
            for (const [axis, value] of [
                ["width", box.width ?? box.minWidth],
                ["height", box.height ?? box.minHeight],
            ] as const) {
                expect(value, `.${box.cls} declares no ${axis}`).toBeDefined();
                expect(
                    value!.trim(),
                    `.${box.cls} declares its ${axis} as "${value}". A box pinned in device pixels `
                    + "stops growing when the reader enlarges the type, which is a target that "
                    + "shrinks in the reader's own terms",
                ).toMatch(/rem$/);
            }
        }
    });

    /**
     * 44 AND NOT 24, AND THE DIFFERENCE IS A DECISION RATHER THAN A SPECIFICATION.
     *
     * SC 2.5.8 (Minimum, AA) asks 24x24 and the chip cleared it for as long as it existed at
     * 29.59px tall. SC 2.5.5 (Enhanced, AAA) asks 44, which every plated control on this site
     * already met and this kind never had. The maintainer chose to floor the chip at 44 so the
     * whole vocabulary clears the enhanced criterion — which made the wall's filter row visibly
     * taller, and is the one visible cost of publishing this kind.
     *
     * SO THE GATE ASSERTS THE DECISION, NOT THE SPECIFICATION. At 24 this would pass a silent
     * return to 30px and the decision would be unguarded — which is the same shape as a gate
     * that certifies a rule nobody wears. Both axes, for both boxes, because a row mixing a
     * labelled chip with a glyph chip has to sit level and that is the other half of why 44
     * was chosen over 30.
     */
    it("meets the enhanced target size on both axes", () => {
        for (const box of allBoxes()) {
            for (const [axis, value] of [
                ["width", box.width ?? box.minWidth],
                ["height", box.height ?? box.minHeight],
            ] as const) {
                expect(px(value)!, `.${box.cls} declares a ${axis} of ${value}`).toBeGreaterThanOrEqual(44);
            }
        }
    });

    /**
     * THE INVARIANT THE CHIP HAS NEVER HAD, and the one the plate route calls central: exactly
     * one rule in the whole stylesheet may declare a control's box. While the chip was
     * `.patch-filter a`, its box was declared in a component `<style>` and any other rule in
     * that same file could have resized it with nothing to notice.
     */
    it("lets no other rule anywhere in the sheet touch a chip's box", () => {
        const BOX_PROPS = [
            "width", "height", "min-width", "min-height", "max-width", "max-height",
            "padding", "padding-left", "padding-right", "padding-top", "padding-bottom",
            "padding-inline", "padding-inline-start", "padding-inline-end", "padding-block",
            "border-width", "border-left-width", "border-right-width", "border-top-width", "border-bottom-width",
            "display", "flex", "flex-shrink", "flex-basis", "flex-grow", "aspect-ratio", "font-size", "zoom",
            "box-sizing", "justify-content", "align-items", "place-items", "place-content",
            "flex-wrap", "flex-flow", "flex-direction", "scale",
        ];
        const canonical = new Set(chipClasses.map((c) => canonicalRule(c)));
        const chips = new Set(chipElements());
        const offenders: string[] = [];

        for (const rule of rules) {
            if (canonical.has(rule)) continue;
            if (isKeyframeStep(rule)) continue;
            const declared = BOX_PROPS.filter((p) => decl(rule.body, p) !== undefined);
            if (!declared.length) continue;
            for (const selector of rule.selectors) {
                // Only specific selectors: the preflight's universal and element-only reset
                // rules legitimately set padding and border-width on everything.
                if (!/[.#[]/.test(selector)) continue;
                const structural = structuralSelector(selector);
                if (!structural) continue;
                for (const el of document.querySelectorAll(structural)) {
                    if (!chips.has(el as Element)) continue;
                    offenders.push(`${rule.at ? rule.at + " " : ""}${selector} {${declared.join(", ")}}`);
                }
            }
        }
        // An inline style attribute outranks every rule above and no amount of stylesheet
        // reading can see it.
        for (const el of chips) {
            expect(
                (el as Element).getAttribute("style"),
                `a chip carries an inline style attribute, which wins over the shortcut and is `
                + "invisible to every stylesheet assertion in this file",
            ).toBeNull();
        }
        expect(
            [...new Set(offenders)],
            "only the chip shortcut may declare a chip's box — a media-query variant, an extra "
            + "utility on the element, or a page's scoped <style> all reintroduce the local "
            + "override that publishing this kind was meant to remove",
        ).toEqual([]);
    });
});

/**
 * THE SHEET READER'S OWN CONTRACT, held here because this is the file `helpers/css.ts`
 * was extracted from and the invariant above is what pays for it: every assertion in this
 * suite is "no rule anywhere may do X", and a rule the parser cannot see reads as a rule
 * that does not exist — a silent pass.
 *
 * Both directions are asserted, because a nested block gets two different answers on
 * purpose. A nested AT-RULE is descended into: its declarations belong to the enclosing
 * selector under the accumulated prelude, which is what the browser does. Folding them
 * into the parent's body text instead is what let four lines of nested
 * `@media (max-width:40rem)` on the control row shear 266px of control box at 320 wide
 * and the default text size, with the whole suite green. A nested STYLE rule is refused:
 * its subject is relative to the parent and a `Rule` here is a selector list with nothing
 * to relativise against, so its declarations would be attributed to the wrong elements.
 */
describe("parseRules reads a nested block or refuses it, and never folds one away", () => {
    it("gives a nested at-rule's declarations the parent's selectors and the prelude", () => {
        expect(parseRules(".control{width:4rem;@media (max-width:40rem){flex-wrap:nowrap}}")).toEqual([
            {selectors: [".control"], body: "width:4rem", nested: false, at: ""},
            {selectors: [".control"], body: "flex-wrap:nowrap", nested: true, at: "@media (max-width:40rem)"},
        ]);
    });

    /**
     * THE MIRROR ARRANGEMENT, and it is the one that was wrong. Pinning only the shape above
     * reads as though source order were proved in general; it is not, because a declaration
     * written AFTER a nested at-rule is the case a parent-first emitter inverts. The resolved
     * value is asserted as well as the array, because that is the property a reader has: at
     * 320px this control is 3rem, which is what Chromium paints and what the array order has
     * to produce.
     */
    it("keeps a declaration that FOLLOWS a nested at-rule after it, so the cascade resolves", () => {
        const css = ".control{@media (max-width:40rem){width:7rem}width:3rem}";
        expect(parseRules(css)).toEqual([
            {selectors: [".control"], body: "width:7rem", nested: true, at: "@media (max-width:40rem)"},
            {selectors: [".control"], body: "width:3rem", nested: false, at: ""},
        ]);
        expect(effectiveDecl(parseRules(css), "width", 320)).toMatchObject({value: "3rem"});
    });

    it("still yields exactly one empty Rule for a selector that declares nothing itself", () => {
        expect(parseRules(".control{}")).toEqual([{selectors: [".control"], body: "", nested: false, at: ""}]);
        expect(parseRules(".control{@media print{width:1rem}}")).toEqual([
            {selectors: [".control"], body: "width:1rem", nested: true, at: "@media print"},
            {selectors: [".control"], body: "", nested: false, at: ""},
        ]);
    });

    it("refuses a nested style rule rather than mis-attributing it", () => {
        expect(() => parseRules(".control{color:red;& span{width:2px}}")).toThrow(/nested style rule/);
    });
});
