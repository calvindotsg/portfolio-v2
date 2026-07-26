import {describe, expect, it} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {decl, isKeyframeStep, parseRules, type Rule, structuralSelector} from "./helpers/css";

/**
 * An icon in a line of text is centred on that text's capitals.
 *
 * THE DEFECT THIS PINS. presetIcons renders an icon as an inline-block one em
 * tall, and an inline-block's BOTTOM sits on the text baseline. Capital letters
 * only reach cap-height above that baseline — 0.705em in the face this stack
 * resolves to — so the icon box overhangs the cap line by (1em - cap)/2 at the top
 * and reads as riding high beside its own words. Measured on the previous build at
 * 1440x900, as the distance from the icon's centre up to the centre of the cap
 * band: 2.954px on the greeting, 2.954px on each of the two job titles, 1.772px on
 * the footer heart. That is one number, 0.1477em, appearing at two font sizes.
 *
 * Calvin reported the two job titles. The greeting and the heart had it too and
 * were the same defect, so the fix is at the emission point (`uno.config.ts`)
 * rather than at the call sites, and this file's job is to keep it there.
 *
 * WHY A RESIDUAL AND NOT AN EQUALITY. The ideal shift is
 * (1 - cap/em)/2, and cap/em is a property of whichever font actually paints. It
 * was measured here at 0.705 for the system face, 0.717 Helvetica and 0.716 Arial,
 * so the ideal spans 0.1415–0.1475em and no single constant is exactly right
 * everywhere. The shipped -0.145em is the midpoint of that span. Pinning the exact
 * string would fail a legitimate re-tune, and pinning nothing would let the defect
 * back, so what is asserted instead is the residual: how far off cap-band centre
 * the icon would sit on each face actually measured. That admits a correction of
 * the same kind and rejects all four alternatives that were built and measured
 * against the live page:
 *
 *   baseline / 0 / unset  the defect itself, 2.95px high
 *   middle                1.83px LOW — it centres on half the X-height, not the
 *                         cap band, so it trades high for low. This is the value
 *                         presetIcons' own docs use as an example, which is a good
 *                         reason to state why it is not the value here.
 *   -0.125em              0.45px high. The Font Awesome / Bootstrap Icons
 *                         constant, drawn for a 0.75em cap assumption.
 *   calc((1cap - 1em)/2)  exact by construction, and Chromium accepts it — it
 *                         computed -2.9541px against an ink-measured 2.954. Not
 *                         shipped because the `cap` unit needs Safari 16.4+, so
 *                         older browsers would keep the whole defect to buy 0.06px
 *                         in newer ones. A future change to this form is fine, and
 *                         the em-length assertion deliberately does NOT admit it —
 *                         swapping to it should have to come here and say so.
 *
 * WHAT THIS FILE CANNOT DO. linkedom parses, it does not lay out, so nothing here
 * re-measures an offset; the figures above come from a CDP sweep over 26
 * viewport/theme/root-size configurations against builds of both revisions. What
 * it can police is that the declaration is emitted, that it reaches every icon,
 * that it is of the right kind and magnitude, and that the premise it depends on —
 * the icon being an inline-block one em tall — still holds. Note this is
 * deliberately not a class-token assertion: only the emitted sheet knows whether a
 * token produced a rule.
 */
describe("an inline icon is centred on its text's cap band", () => {
    const css = readFileSync(`dist/_astro/${readdirSync("dist/_astro").find((f) => f.endsWith(".css"))!}`, "utf8");
    const {document} = parseHTML(readFileSync("dist/index.html", "utf8"));
    const rules = parseRules(css);

    /**
     * The cap-height-to-em ratios measured on this machine for the faces the
     * declared stack can resolve: 0.705 for the system face that actually paints
     * here, 0.717 Helvetica, 0.716 Arial. The Windows and Android members of the
     * stack are not installed and so are deliberately not asserted about.
     */
    const MEASURED_CAP_RATIOS = [0.705, 0.716, 0.717] as const;

    /** The largest font size an icon is hosted at, for turning em into pixels. */
    const HOST_PX = 20;

    /**
     * How far off cap-band centre the icon may still sit, at the largest size it is
     * hosted at, on any face measured above. A third of a pixel: below the device
     * pixel that the defect reports at, and comfortably below perception.
     *
     * This single bound replaced a pair of assertions that disagreed with each
     * other. The first admitted any shift between 0.135em and 0.16em — the ideals
     * for a generous 0.68–0.73 cap-ratio bracket — while this one, applied over that
     * same bracket, only admitted 0.143–0.152em. So the stated window was not the
     * real one, and the mutation that exposed it was a legitimate re-tune to
     * -0.14em, which the header claimed to allow and the suite rejected. A single
     * constant cannot be within a third of a pixel of ideal across a 0.05 spread of
     * cap ratios — the spread alone is half a pixel — so demanding it over the
     * bracket, rather than over the faces actually measured, is a requirement no
     * value can meet and an easy way to look precise while being wrong.
     */
    const TOLERANCE_PX = 0.34;

    /**
     * A length in em as a number, or null. Separate from the helper's `px()`
     * because that one deliberately rejects anything but px and rem, and because
     * the minifier drops the leading zero: the emitted text is `-.145em`.
     */
    const em = (value: string | undefined): number | null => {
        const m = value?.trim().match(/^(-?(?:\d*\.)?\d+)em$/);
        return m ? parseFloat(m[1]) : null;
    };

    /** Every icon class actually worn by an element in the built page. */
    const iconClassesInPage = [...new Set(
        [...document.querySelectorAll("[class]")]
            .flatMap((el) => [...el.classList])
            .filter((c) => /^i-[a-z0-9]+-/.test(c))
    )].sort();

    /**
     * The rules that style those classes. Keyed off the classes the PAGE wears, so
     * a safelist that stops matching the components, or a renamed collection, shows
     * up as a missing rule rather than as an empty set that satisfies everything.
     */
    const iconRules = iconClassesInPage.map((cls) => {
        const matching = rules.filter((rule) =>
            !isKeyframeStep(rule) && rule.selectors.some((s) => structuralSelector(s) === `.${cls}`));
        return {cls, matching};
    });

    it("finds an emitted rule for every icon class the page wears", () => {
        // Non-vacuity for everything below: most of what follows is of the form
        // "every icon rule does X", which an empty set passes for free. The page
        // renders 14 icons wearing 14 distinct classes — no glyph is used twice — so
        // the floor is set below that rather than at it, to leave room for a link or
        // a goal being removed without this becoming the assertion that fails.
        expect(iconClassesInPage.length).toBeGreaterThanOrEqual(12);
        const unstyled = iconRules.filter((r) => r.matching.length === 0).map((r) => r.cls);
        expect(unstyled).toEqual([]);
    });

    it("declares a vertical-align on every icon", () => {
        const missing = iconRules
            .filter(({matching}) => !matching.some((rule) => decl(rule.body, "vertical-align") !== undefined))
            .map(({cls}) => cls);
        expect(missing).toEqual([]);
    });

    /**
     * The value that WINS for `prop` on an icon class. Last declared, since these
     * are single-class selectors — equal specificity — and `parseRules` preserves
     * sheet order. Asking whether SOME rule declares the right value would let a
     * later rule quietly override it: the same hole `effectiveValue` closes in
     * card-fill.test.ts, where the opposite of a clipping utility emitted 33 bytes
     * after it and would have won.
     */
    const winning = (matching: Rule[], prop: string) => {
        const declared = matching.map((rule) => decl(rule.body, prop)).filter((v): v is string => v !== undefined);
        return declared[declared.length - 1];
    };

    it("shifts the icon DOWN, by an em length so it tracks font-size", () => {
        for (const {cls, matching} of iconRules) {
            const effective = winning(matching, "vertical-align");
            const shift = em(effective);

            expect(shift, `${cls} declares vertical-align: ${effective}, which is not an em length. `
                + `A keyword (baseline, middle, top), a px length or a calc() is not admitted — see this file's header. `
                + `The unit matters: the overhang is a fraction of the em, so it has to scale with the text.`).not.toBeNull();
            // Negative is DOWN for vertical-align. A positive value moves the icon
            // further above the cap line, i.e. makes the reported defect worse, so
            // the direction is asserted separately from the magnitude.
            expect(-shift!, `${cls} shifts the icon by ${shift}em; it must move DOWN, so the value must be negative`)
                .toBeGreaterThan(0);
        }
    });

    it("lands within a third of a pixel of cap-band centre on every measured face", () => {
        const shifts = new Set(iconRules.map(({matching}) => em(winning(matching, "vertical-align"))));
        expect(shifts.size, "every icon should carry the SAME shift; a per-icon value would show as a split here").toBe(1);

        const shift = -[...shifts][0]!;
        for (const capRatio of MEASURED_CAP_RATIOS) {
            const residualPx = Math.abs((1 - capRatio) / 2 - shift) * HOST_PX;
            expect(residualPx, `on a face with cap/em ${capRatio} the icon would sit ${residualPx.toFixed(2)}px `
                + `off cap-band centre at ${HOST_PX}px, over the ${TOLERANCE_PX}px this allows`)
                .toBeLessThan(TOLERANCE_PX);
        }
    });

    it("still rests on the premise the shift corrects", () => {
        // If an icon stops being an inline-block box exactly one em tall, the
        // arithmetic above stops describing it: vertical-align does not apply to a
        // block, and a box that is not 1em tall overhangs by a different amount.
        // This is not decoration — it is the input to the constant.
        for (const {cls, matching} of iconRules) {
            const value = (prop: string) => {
                const declared = matching.map((r) => decl(r.body, prop)).filter(Boolean) as string[];
                return declared[declared.length - 1];
            };
            expect(value("display"), `${cls}`).toBe("inline-block");
            expect(value("height"), `${cls}`).toBe("1em");
        }
    });

    /** Every rule that can reach `el`, at any at-rule depth. See card-fill.test.ts. */
    const rulesMatching = (el: Element) => rules.filter((rule) =>
        !isKeyframeStep(rule) && rule.selectors.some((selector) => {
            const structural = structuralSelector(selector);
            if (!structural) return false;
            return [...document.querySelectorAll(structural)].includes(el as never);
        }));

    /**
     * The `display` that wins for `el`, or "" when nothing declares one. Last rule
     * wins: single-class utilities are equal specificity and `parseRules` preserves
     * sheet order.
     */
    const effectiveDisplay = (el: Element) => {
        let winner = "";
        for (const rule of rulesMatching(el)) {
            const value = decl(rule.body, "display");
            if (value !== undefined) winner = value.trim();
        }
        return winner;
    };

    /**
     * The split the fix depends on, derived from the cascade rather than from a
     * list of tag names.
     *
     * `vertical-align` has no effect on a flex item, so this one declaration is
     * live on the icons their parent lays out inline and inert on the rest. That is
     * not a caveat, it is the reason the fix can sit at the emission point and
     * still be safe: the six social links, the two theme-toggle glyphs and the two
     * progress-bar icons are all flex items, already centred by their containers,
     * and their rects are unchanged across the whole sweep.
     *
     * Hard-coding "h1, h2 and the paragraph" here would pass while saying nothing —
     * the property that matters is the parent's display, and that lives in the
     * sheet. If a future card wraps a heading in a flex row, the count below moves
     * and this test asks for the reasoning to be revisited, which is correct: the
     * icon would then need centring by its container instead.
     */
    it("is live on exactly the icons laid out inline, and inert on the flex ones", () => {
        const hosted = [...document.querySelectorAll("[class]")]
            .filter((el) => [...el.classList].some((c) => /^i-[a-z0-9]+-/.test(c)))
            .map((el) => ({
                cls: [...el.classList].find((c) => /^i-[a-z0-9]+-/.test(c))!,
                parentDisplay: el.parentElement ? effectiveDisplay(el.parentElement) : "",
                parentTag: el.parentElement?.tagName ?? "",
            }));

        expect(hosted.length, "icons rendered in the page").toBe(14);

        const flexHosted = hosted.filter((h) => ["flex", "inline-flex"].includes(h.parentDisplay));
        const inlineHosted = hosted.filter((h) => !["flex", "inline-flex"].includes(h.parentDisplay));

        // 6 social links + 2 toggle glyphs + 2 progress-bar icons, and the greeting,
        // two job titles and the heart. Counted, because the interesting failure is
        // an icon crossing from one group to the other, which no per-element check
        // would notice.
        expect(flexHosted.length, `flex-hosted icons: ${JSON.stringify(flexHosted)}`).toBe(10);
        expect(inlineHosted.length, `inline-hosted icons: ${JSON.stringify(inlineHosted)}`).toBe(4);

        // The greeting and both job titles are headings; the heart is not, and it is
        // the one the reported instance did not include.
        expect(inlineHosted.filter((h) => /^H[1-6]$/.test(h.parentTag)).length).toBe(3);

        for (const {cls, parentTag} of inlineHosted) {
            const rule = iconRules.find((r) => r.cls === cls);
            expect(rule, `${cls} in ${parentTag} has no emitted rule`).toBeDefined();
            const declared = rule!.matching.map((r) => decl(r.body, "vertical-align")).filter(Boolean) as string[];
            expect(em(declared[declared.length - 1]), `${cls} in ${parentTag}`).toBeLessThan(0);
        }
    });
});
