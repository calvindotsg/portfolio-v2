import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {CAREER, FOOTER, GOALS, LINKS, NOW, WELCOME} from "../src/lib/constants";
import {appliesAt, decl, isKeyframeStep, maxWidthOf, minWidthOf, pageCss, parseRules, type Rule, structuralSelector} from "./helpers/css";

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
 *   -0.125em              0.45px high. Font Awesome ships it on `.svg-inline--fa`
 *                         and Bootstrap Icons on `.bi::before`; FA's webfont
 *                         classes carry no vertical-align at all. It is FA's own
 *                         font descent — 64 of 512 units in FA5, exactly 0.125em,
 *                         against an 0.875em ascent — so it lines an SVG box up
 *                         with the font box, not with a cap band. FA's cap height
 *                         is 0.822em, and FA6 kept -0.125em after moving its
 *                         descent to 0.1465em, which a cap-derived number would
 *                         not do. Bootstrap Icons' own glyph box is a full em with
 *                         zero descent, exactly like this repo's icons, and it
 *                         still ships 0.125 — so the constant is inherited, not
 *                         derived, on both sides.
 *   calc((1cap - 1em)/2)  exact by construction, and Chromium accepts it — it
 *                         computed -2.9541px against an ink-measured 2.954. Not
 *                         shipped because the `cap` unit needs Chrome/Edge 118,
 *                         Safari 17.2 or Firefox 97 — MDN browser-compat-data,
 *                         and webstatus.dev has it Baseline Widely Available only
 *                         since 2026-06-11, six weeks before this change. Older
 *                         browsers would keep the whole defect to buy a tenth of
 *                         a pixel in newer ones. (Not Chrome 111/Safari 16.4, as
 *                         an earlier version of this note said: those belong to
 *                         other units — 111 is the rex/rch/ric/rlh family and
 *                         16.4 is lh/rlh. Checked against BCD, which is also why
 *                         the floor is quoted per engine.) A future change to
 *                         this form is fine, and the em-length assertion
 *                         deliberately does NOT admit it — swapping to it should
 *                         have to come here and say so.
 *
 * WHAT THE SHIPPED CONSTANT LEAVES, re-measured over the CDP probe described
 * below at 1440x900 in the light theme, as the icon's distance above cap-band
 * centre. It is a fixed fraction of the em, so in pixels it grows with the
 * browser's default font size and the figure has to be quoted with one:
 *
 *   default font size   16      20      24
 *   20px hosts        0.06px  0.07px  0.09px   (greeting, both job titles)
 *   12px host         0.04px  0.04px  0.05px   (footer heart)
 *
 * A single figure for all three root sizes would be wrong: 0.06px is the root-16
 * number. Every one of them is an order of magnitude below a device pixel, which
 * is the claim that matters.
 *
 * WHAT THIS FILE CANNOT DO. linkedom parses, it does not lay out, so nothing here
 * re-measures an offset; the figures above come from chrome-headless-shell driven
 * over raw CDP, with animations frozen, the baseline located by a zero-size
 * `vertical-align: baseline` sibling probe and cap height from
 * `measureText("H").actualBoundingBoxAscent`. That probe reproduces this fix's
 * published before-and-after — 2.954 and 1.772 with the declaration overridden back
 * to `baseline`, 1.83 LOW on the greeting with `middle`, 0.06 and 0.04 as shipped —
 * so it responds to the defect rather than merely agreeing with itself.
 *
 * What this file polices instead is the cascade the browser would resolve: for
 * every icon ELEMENT in the built page, at a sweep of viewport widths, which rule
 * actually decides `vertical-align`, `display` and `height`. Three things make
 * that different from asking whether the right declaration exists somewhere:
 *
 *   per element, not per class   a second class on the same element — a call-site
 *                                `align-middle`, `h-8`, `inline` — is a rule that
 *                                reaches the icon and can outrank the icon rule.
 *                                Measured: `align-middle` at the call site puts
 *                                the greeting icon 1.83px LOW, the value rejected
 *                                above, and `inline` gives it zero width.
 *   at every swept width         a declaration inside `@media (min-width:1024px)`
 *                                is a real declaration that does nothing on a
 *                                phone. UnoCSS compiles a range variant to NESTED
 *                                queries, so both bounds have to be read.
 *   from an unconditional rule   `@media print` carries no width bound at all, so
 *                                a width sweep alone cannot see it. The predicate
 *                                below therefore says which at-rule shapes are
 *                                allowed rather than which are banned: a denylist
 *                                of `print` and `hover` leaks `@container`,
 *                                `(orientation: portrait)`, `(forced-colors:
 *                                active)` and `(min-resolution: 2dppx)`, each of
 *                                which gates a declaration just as effectively.
 *
 * Note this is deliberately not a class-token assertion: only the emitted sheet
 * knows whether a token produced a rule.
 */
describe("an inline icon is centred on its text's cap band", () => {
    const css = pageCss();
    const {document} = parseHTML(readFileSync("dist/index.html", "utf8"));
    const rules = parseRules(css);

    /**
     * The cap-height-to-em ratios measured on this machine for the faces the
     * declared stack can resolve: 0.705 for the system face that actually paints
     * here, 0.717 Helvetica, 0.716 Arial. The Windows and Android members of the
     * stack are not installed and so are deliberately not asserted about.
     *
     * These are measurements, not a property of the repository, so on their own
     * they are an assumption about a file that can change without them. The stack
     * they were taken from is therefore pinned below, against the built sheet: a
     * font change has to come here and re-measure rather than silently detuning
     * the constant. Swapping the stack for a serif face was tried, and it leaves a
     * 0.49px residual — above the bound below — which nothing here would otherwise
     * have noticed.
     */
    const MEASURED_CAP_RATIOS = [0.705, 0.716, 0.717] as const;

    /**
     * The stack those ratios were measured against, as the minifier emits it on
     * `body` — quotes dropped, one space after each comma removed. Recorded here
     * rather than read off the sheet, which would make the assertion vacuous.
     */
    const MEASURED_FONT_STACK = "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,"
        + "Cantarell,Fira Sans,Droid Sans,Helvetica,Arial,sans-serif";

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
     * -0.14em, which the header claimed to allow and the suite rejected.
     *
     * What is NOT true, since an earlier version of this comment said it: that no
     * constant can meet this bound over the whole bracket. -0.145em meets it, at a
     * worst case of 0.300px on cap 0.68. The bracket is half a pixel WIDE, but a
     * midpoint constant is only ever half of that from either end, and halving it
     * is the point of picking a midpoint. The domain is the faces actually
     * measured because of how much re-tune room that leaves — shifts of
     * 0.1305–0.1585em, against 0.143–0.152em for the bracket — and -0.14em is
     * inside the first window and outside the second. That is a deliberate choice
     * about tuning room, not a claim of impossibility.
     */
    const TOLERANCE_PX = 0.34;

    /**
     * The viewport widths every one of these declarations has to survive. An icon
     * beside a word is misaligned at every width, so a rule that only lands at some
     * of them has not fixed it: gating the shift behind `@media (min-width:1024px)`
     * leaves 100% of the measured defect on every phone and tablet. Both sides of
     * each breakpoint the page uses are here, since the emitted queries land on
     * exactly those edges.
     */
    const WIDTHS = [320, 639, 640, 767, 768, 1023, 1024, 1279, 1280, 1440, 1535, 1536, 2560];

    /** The width the figures in the header were measured at. */
    const REFERENCE_WIDTH = 1440;

    /**
     * A length in em as a number, or null. Separate from the helper's `px()`
     * because that one deliberately rejects anything but px and rem, and because
     * the minifier drops the leading zero: the emitted text is `-.145em`.
     */
    const em = (value: string | undefined): number | null => {
        const m = value?.trim().match(/^(-?(?:\d*\.)?\d+)em$/);
        return m ? parseFloat(m[1]) : null;
    };

    /**
     * True when a rule's enclosing at-rules can only ever narrow it by WIDTH, so a
     * width sweep is enough to know where it applies.
     *
     * Written as "which shapes are allowed" rather than "which media features are
     * banned", because the banned list leaks by construction — see the header. A
     * media type of `screen` is allowed: the defect is a screen-medium defect.
     */
    const WIDTH_CONDITION = /^\((?:(?:min|max)-width:[\d.]+px|width(?:<=|>=|<|>)[\d.]+px)\)$/;

    const widthOnly = (at: string) => {
        for (const prelude of at.split(/(?=@)/).map((s) => s.trim()).filter(Boolean)) {
            if (!/^@media\b/.test(prelude)) return false;
            const rest = prelude.slice("@media".length);
            const conditions = rest.match(/\([^()]*\)/g) ?? [];
            if (conditions.some((c) => !WIDTH_CONDITION.test(c.replace(/\s+/g, "")))) return false;
            if (rest.replace(/\([^()]*\)/g, " ").replace(/\b(?:only|screen|and)\b/g, " ").trim()) return false;
        }
        return true;
    };

    /**
     * A selector's specificity as one comparable number: ids, then classes,
     * attributes and pseudo-classes, then type selectors and pseudo-elements.
     *
     * An approximation of the real algorithm, and deliberately a conservative one:
     * `:where()` is dropped as it should be, and `:not(x)`/`:is(x)` count as one
     * rather than as their argument's own specificity. It exists so that a rule
     * which cannot possibly win is not treated as a contender — the preflight ships
     * `::-webkit-inner-spin-button{height:auto}`, whose selector reduces to `*` and
     * so reaches every element on the page, and an order-only resolver has to
     * either see it as a rival to `height:1em` or ignore at-rule provenance to get
     * rid of it.
     */
    const specificity = (selector: string) => {
        let s = selector.replace(/:where\([^()]*\)/g, " ");
        const pseudoElements = s.match(/::[\w-]+/g)?.length ?? 0;
        s = s.replace(/::[\w-]+/g, " ");
        const ids = s.match(/#[\w-]+/g)?.length ?? 0;
        const classes = s.match(/\.(?:[\w-]|\\.)+|\[[^\]]*\]|:[\w-]+(?:\([^()]*\))?/g)?.length ?? 0;
        const types = (s.match(/(?:^|[\s>+~,])[a-z][\w-]*/gi)?.length ?? 0) + pseudoElements;
        return ids * 1e4 + classes * 1e2 + types;
    };

    /** Every icon-bearing element in the built page, in document order. */
    type Icon = {el: Element, cls: string, where: string};
    const icons: Icon[] = [...document.querySelectorAll("[class]")]
        .filter((el) => [...el.classList].some((c) => /^i-[a-z0-9]+-/.test(c)))
        .map((el) => ({
            el: el as never as Element,
            cls: [...el.classList].find((c) => /^i-[a-z0-9]+-/.test(c))!,
            where: `${el.parentElement?.tagName ?? "?"} > .${[...el.classList].join(".")}`,
        }));

    /** Every icon class actually worn by an element in the built page. */
    const iconClassesInPage = [...new Set(icons.map((i) => i.cls))].sort();

    /**
     * How many icons the page's own data asks for. Derived, not counted off the
     * built page, and not written here as a floor either: a floor of 12 against a
     * hard 14 elsewhere in this file could never bind, and the slack it claimed to
     * leave was not there — removing one social link made this file the failure.
     * Now a content edit moves both sides and lands nowhere near here.
     *
     * The two theme-toggle glyphs are the only icons not named in constants.ts: the
     * toggle carries a sun and a moon and hides whichever one is not current.
     *
     * The Now card's explainer icon belongs in the FLEX group, and it is worth saying
     * why rather than leaving it to the count: its anchor is a flex box, so the glyph
     * inside is a flex item and is blockified like the other ten in this derived group.
     * It sits in the card's corner, not in a line of prose, so there is no cap line for
     * the baseline nudge to centre it on — its container centres it instead.
     *
     * Be careful quoting a number here, because two files legitimately count differently.
     * This group TOTALS eleven — six social links, two goal bars, both toggle glyphs and
     * this one — so there are ten others. Only ten are ever laid out at once, since the
     * toggle hides whichever glyph is not current, which is why `Now.astro` says "nine
     * other icons" for the set that sentence is about: the ones that actually rely on a
     * container to centre them.
     */
    const TOGGLE_GLYPHS = 2;
    const EXPECTED_FLEX_HOSTED = LINKS.length + GOALS.length + TOGGLE_GLYPHS
        + [NOW.explainer_icon].length;
    const EXPECTED_INLINE_HOSTED = [WELCOME.greeting_icon, ...CAREER.map((c) => c.icon), FOOTER.icon].length;
    const EXPECTED_ICONS = EXPECTED_FLEX_HOSTED + EXPECTED_INLINE_HOSTED;

    /**
     * Which rules can reach which of the elements this file asks about — the icons
     * and their parents. Every selector is matched against the document ONCE and
     * the result inverted, rather than re-running the selector engine per element.
     */
    const interesting = new Set<Element>(icons.flatMap(({el}) => el.parentElement ? [el, el.parentElement] : [el]));
    const reach = new Map<Element, {rule: Rule, selector: string, spec: number}[]>();
    rules.forEach((rule) => {
        if (isKeyframeStep(rule)) return;
        for (const selector of rule.selectors) {
            const structural = structuralSelector(selector);
            if (!structural) continue;
            for (const node of document.querySelectorAll(structural)) {
                const el = node as never as Element;
                if (!interesting.has(el)) continue;
                const seen = reach.get(el) ?? [];
                const last = seen.at(-1);
                // One entry per rule per element: a rule whose selector list reaches the
                // same element twice is one rule, and it is the strongest of its
                // selectors that decides whether it can be outranked.
                if (last?.rule === rule) last.spec = Math.max(last.spec, specificity(selector));
                else seen.push({rule, selector, spec: specificity(selector)});
                reach.set(el, seen);
            }
        }
    });

    /**
     * Every declaration of `prop` that reaches `el`, in sheet order, with what it
     * would take to beat it: importance first, then specificity, then position.
     */
    const declarations = (el: Element, prop: string) => (reach.get(el) ?? []).flatMap(({rule, selector, spec}) => {
        const raw = decl(rule.body, prop);
        if (raw === undefined) return [];
        const important = /!\s*important$/.test(raw);
        return [{
            rule,
            selector,
            value: raw.replace(/!\s*important$/, "").trim(),
            rank: (important ? 1e9 : 0) + spec,
            source: `${rule.at ? rule.at + " " : ""}${selector} { ${prop}: ${raw} }`,
        }];
    });

    /**
     * The declarations of `prop` on `el` that nothing else applying at `width` can
     * outrank — one of them decides the value, and if there is more than one, only
     * emission order separates them.
     */
    const contested = (el: Element, prop: string, width: number) => {
        const applying = declarations(el, prop).filter(({rule}) => appliesAt(rule, width));
        const top = Math.max(...applying.map(({rank}) => rank));
        return applying.filter(({rank}) => rank === top);
    };

    /** The value that wins for `prop` on `el` at `width`, or "" if nothing sets it. */
    const winnerAt = (el: Element, prop: string, width: number) =>
        contested(el, prop, width).at(-1)?.value ?? "";

    /**
     * The declaration that DECIDES `prop` on an ICON at a viewport `width`,
     * asserting on the way that it is decided in a way this file can trust:
     * something declares it at that width, the winner is not gated behind a
     * conditional at-rule, and nothing tied with the winner disagrees with it.
     *
     * The tie check is what makes the answer independent of emission order, which
     * matters because two single-class utilities on the same element — `.i-ri-*`
     * and a call-site `.h-8` — have equal specificity, so whichever the bundler
     * happens to emit second wins. Asserting the winner alone would make this test
     * a hostage to that ordering.
     */
    const deciding = (icon: Icon, prop: string, width: number) => {
        const tied = contested(icon.el, prop, width);
        const winner = tied.at(-1);

        expect(winner, `nothing declares ${prop} on ${icon.where} at ${width}px wide. `
            + `A declaration that does not apply here has not fixed anything here: `
            + `${JSON.stringify(declarations(icon.el, prop).map(({source}) => source))}`).toBeDefined();
        expect(widthOnly(winner!.rule.at), `${prop} on ${icon.where} at ${width}px is decided by `
            + `${winner!.source}, which sits inside a conditional at-rule. Only width conditions are `
            + `admitted: any other at-rule leaves the page it does not apply to with the whole defect.`).toBe(true);
        // ...and not even a width condition, which is the difference between closing
        // the reported instance and closing the class. A sweep is a list of sample
        // points, so a rule pair gated `(max-width: 800px)` and `(min-width: 1000px)`
        // satisfies every sample above while leaving 801–999px — iPad-class portrait
        // widths — carrying 100% of the defect, measured at 2.9541px on the headings
        // with the whole suite green. Enumerating widths leaks by construction, the
        // same way enumerating length units did in page-fit; the invariant that does
        // not is that the deciding rule is not width-gated AT ALL, so it applies at
        // every width there is and no band exists to hide in.
        expect(
            {min: minWidthOf(winner!.rule), max: maxWidthOf(winner!.rule)},
            `${prop} on ${icon.where} is decided at ${width}px by ${winner!.source}, which is gated by `
            + `width. Even a width-only gate only fixes the widths inside it — the widths outside keep `
            + `the defect, and a sweep cannot see a band that falls between its samples. This icon's `
            + `alignment does not depend on viewport width, so the rule that sets it should not either.`,
        ).toEqual({min: null, max: Infinity});
        expect(tied.filter(({value}) => value !== winner!.value).map(({source}) => source),
            `${prop} on ${icon.where} at ${width}px is contested at equal precedence by rules that disagree, `
            + `so which one wins is decided by emission order alone. Winner: ${winner!.source}`).toEqual([]);
        return winner!.value;
    };

    /**
     * The rules that style each icon class. Keyed off the classes the PAGE wears, so
     * a safelist that stops matching the components, or a renamed collection, shows
     * up as a missing rule rather than as an empty set that satisfies everything.
     *
     * This is an EMISSION question — did presetIcons produce a rule for this class —
     * and it is asked per class for that reason. Everything about which value an
     * icon ends up with goes through `deciding` above instead, per element: a walk
     * over selectors that are exactly `.<icon-class>` cannot see a second class on
     * the same element, and that blindness let three separate overrides restore the
     * full 2.954px defect with this file green.
     */
    const iconRules = iconClassesInPage.map((cls) => {
        const matching = rules.filter((rule) =>
            !isKeyframeStep(rule) && rule.selectors.some((s) => structuralSelector(s) === `.${cls}`));
        return {cls, matching};
    });

    it("finds an emitted rule for every icon class the page wears", () => {
        // Non-vacuity for everything below: most of what follows is of the form
        // "every icon does X", which an empty set passes for free. The count comes
        // from the data that produces the icons, so it is a real assertion about the
        // page and not a floor chosen to be unreachable.
        expect(icons.length, `icons rendered in the page: ${JSON.stringify(icons.map((i) => i.cls))}`)
            .toBe(EXPECTED_ICONS);
        const unstyled = iconRules.filter((r) => r.matching.length === 0).map((r) => r.cls);
        expect(unstyled).toEqual([]);
    });

    it("declares a vertical-align on every icon", () => {
        const missing = iconRules
            .filter(({matching}) => !matching.some((rule) => decl(rule.body, "vertical-align") !== undefined))
            .map(({cls}) => cls);
        expect(missing).toEqual([]);
    });

    it("shifts the icon DOWN, by an em length so it tracks font-size, at every width", () => {
        const shifts = new Set<number | null>();
        for (const icon of icons) {
            for (const width of WIDTHS) {
                const effective = deciding(icon, "vertical-align", width);
                const shift = em(effective);

                expect(shift, `${icon.where} at ${width}px resolves vertical-align: ${effective}, which is not an `
                    + `em length. A keyword (baseline, middle, top), a px length or a calc() is not admitted — see `
                    + `this file's header. The unit matters: the overhang is a fraction of the em, so it has to `
                    + `scale with the text.`).not.toBeNull();
                // Negative is DOWN for vertical-align. A positive value moves the icon
                // further above the cap line, i.e. makes the reported defect worse, so
                // the direction is asserted separately from the magnitude.
                expect(-shift!, `${icon.where} at ${width}px shifts the icon by ${shift}em; it must move DOWN, `
                    + `so the value must be negative`).toBeGreaterThan(0);
                shifts.add(shift);
            }
        }
        expect(shifts.size, `every icon should carry the SAME shift at every width; a per-icon or per-breakpoint `
            + `value would show as a split here: ${JSON.stringify([...shifts])}`).toBe(1);
    });

    it("lands within a third of a pixel of cap-band centre on every measured face", () => {
        const shifts = new Set(icons.map((icon) => em(deciding(icon, "vertical-align", REFERENCE_WIDTH))));
        expect(shifts.size, `one shift for every icon, or the residual below is not one number: `
            + `${JSON.stringify([...shifts])}`).toBe(1);

        const shift = -[...shifts][0]!;
        for (const capRatio of MEASURED_CAP_RATIOS) {
            const residualPx = Math.abs((1 - capRatio) / 2 - shift) * HOST_PX;
            expect(residualPx, `on a face with cap/em ${capRatio} the icon would sit ${residualPx.toFixed(2)}px `
                + `off cap-band centre at ${HOST_PX}px, over the ${TOLERANCE_PX}px this allows`)
                .toBeLessThan(TOLERANCE_PX);
        }
    });

    it("still ships the font stack those faces were measured on", () => {
        // The ratios above are the only reason -0.145em is the right number. They
        // were measured, so nothing in the repository makes them true; this is the
        // assertion that makes a font change come back here.
        const body = rules.filter((rule) => rule.selectors.includes("body") && !rule.nested)
            .map((rule) => decl(rule.body, "font-family"))
            .filter((value): value is string => value !== undefined);
        expect(body, "the built sheet declares a font-family on body").toHaveLength(1);
        expect(body[0].replace(/["']/g, "").replace(/,\s+/g, ","),
            `the page paints in a different stack from the one MEASURED_CAP_RATIOS was taken from, so the cap `
            + `ratios above — and with them the shipped -0.145em — are no longer known to be right. Re-measure `
            + `cap height on the new stack and update both, or put the old stack back. A serif stack was tried: `
            + `it leaves a 0.49px residual, over the ${TOLERANCE_PX}px bound above.`).toBe(MEASURED_FONT_STACK);
    });

    it("still rests on the premise the shift corrects", () => {
        // If an icon stops being an inline-block box exactly one em tall, the
        // arithmetic above stops describing it: vertical-align does not apply to a
        // block, and a box that is not 1em tall overhangs by a different amount.
        // This is not decoration — it is the input to the constant.
        //
        // Asked twice, because the two halves fail differently. Per CLASS, of the
        // emitted rule: presetIcons has to keep producing the box the constant
        // assumes. Per ELEMENT, of the resolved cascade: a call-site utility can
        // leave that emission untouched and still make the icon 32px tall (measured:
        // the greeting then rides 6.06px high, twice the original defect) or
        // zero-width (`inline`, which does not misalign the icon so much as delete
        // it — its rect is all zeroes). Both of those tokens are already in the
        // sheet, so the built CSS comes out byte-identical and only the markup
        // moves: a walk over the sheet's icon rules cannot see either one.
        for (const {cls, matching} of iconRules) {
            const value = (prop: string) => {
                const declared = matching.map((r) => decl(r.body, prop)).filter(Boolean) as string[];
                return declared[declared.length - 1];
            };
            expect(value("display"), `${cls} is not emitted as an inline-block`).toBe("inline-block");
            expect(value("height"), `${cls} is not emitted one em tall`).toBe("1em");
        }

        for (const icon of icons) {
            for (const width of WIDTHS) {
                expect(deciding(icon, "height", width), `${icon.where} at ${width}px`).toBe("1em");
            }
        }

        // `display` is resolved only for the icons laid out inline, which are the
        // ones the shift is live on. The theme toggle deliberately resolves
        // `display: none` on whichever of its two glyphs is not current, so the
        // flex-hosted set cannot be asked this question — see the split below.
        for (const icon of inlineHosted()) {
            for (const width of WIDTHS) {
                expect(deciding(icon, "display", width), `${icon.where} at ${width}px`).toBe("inline-block");
            }
        }

        // Both -0.145em and 1em resolve against the ICON's font-size, and the cap
        // band they are aiming at belongs to its host's. Nothing may set a font-size
        // on an inline-hosted icon, or the two come apart: `text-base` on the
        // greeting shrinks it to 16px in a 20px line and it then sits 1.36px LOW,
        // four times the bound above, with every assertion so far satisfied.
        for (const icon of inlineHosted()) {
            expect(declarations(icon.el, "font-size").map(({source}) => source),
                `${icon.where} is given a font-size of its own, so it no longer scales with the text it sits in`)
                .toEqual([]);
        }
    });

    /**
     * Whether the icon's parent lays it out as a flex item at `width`, read off the
     * same cascade. Width-aware because the answer is allowed to be, and if it ever
     * differs between widths the split below says so rather than silently picking
     * the reference viewport's answer.
     */
    const isFlexHostedAt = (icon: Icon, width: number) => ["flex", "inline-flex"]
        .includes(icon.el.parentElement ? winnerAt(icon.el.parentElement, "display", width) : "");

    const inlineHosted = () => icons.filter((icon) => !isFlexHostedAt(icon, REFERENCE_WIDTH));

    /**
     * The split the fix depends on, derived from the cascade rather than from a
     * list of tag names.
     *
     * An icon in a flex container is blockified — its computed `display` becomes
     * `block` whatever the sheet declares — and `vertical-align` has no effect on a
     * block-level box outside an inline formatting context. So this one declaration
     * is live on the icons their parent lays out inline and does nothing to the
     * rest. That is not a caveat, it is the reason the fix can sit at the emission
     * point and still be safe: the six social links, the two theme-toggle glyphs
     * and the two progress-bar icons are centred by their containers, and their
     * rects are unchanged across the whole sweep.
     *
     * Hard-coding "h1, h2 and the paragraph" here would pass while saying nothing —
     * the property that matters is the parent's display, and that lives in the
     * sheet. If a future card wraps a heading in a flex row, the counts below move
     * and this test asks for the reasoning to be revisited, which is correct: the
     * icon would then need centring by its container instead.
     */
    it("is live on exactly the icons laid out inline, and inert on the flex ones", () => {
        const flexHosted = icons.filter((icon) => isFlexHostedAt(icon, REFERENCE_WIDTH));

        // Which group an icon is in must not depend on the viewport. A parent that
        // becomes a flex row at one breakpoint only would put the icon in both
        // groups, and the reasoning above holds for neither.
        for (const icon of icons) {
            const groups = new Set(WIDTHS.map((width) => isFlexHostedAt(icon, width)));
            expect(groups.size, `${icon.where} is laid out inline at some widths and as a flex item at others, so `
                + `neither half of the argument above covers it: ${JSON.stringify(WIDTHS.map((width) =>
                    [width, isFlexHostedAt(icon, width)]))}`).toBe(1);
        }

        // One per social link, one per goal bar, the two toggle glyphs and the Now
        // card's corner explainer, against
        // the greeting, one per job title and the footer heart. Counted from the
        // data, because the interesting failure is an icon crossing from one group
        // to the other, which no per-element check would notice — and because a
        // content edit should not land in this file.
        expect(flexHosted.length, `flex-hosted icons: ${JSON.stringify(flexHosted.map((i) => i.where))}`)
            .toBe(EXPECTED_FLEX_HOSTED);
        expect(inlineHosted().length, `inline-hosted icons: ${JSON.stringify(inlineHosted().map((i) => i.where))}`)
            .toBe(EXPECTED_INLINE_HOSTED);

        // The greeting and both job titles are headings; the heart is not, and it is
        // the one the reported instance did not include.
        expect(inlineHosted().filter(({el}) => /^H[1-6]$/.test(el.parentElement?.tagName ?? "")).length)
            .toBe(1 + CAREER.length);

        for (const icon of inlineHosted()) {
            for (const width of WIDTHS) {
                expect(em(deciding(icon, "vertical-align", width)), `${icon.where} at ${width}px`).toBeLessThan(0);
            }
        }

        // An inline `style` attribute outranks every rule this file reads and leaves
        // the emitted sheet byte-identical, so no amount of stylesheet resolution can
        // see it: `style="vertical-align:baseline"` on the greeting span restores the
        // full 2.954px defect with the whole suite green. Closed here rather than left
        // as a documented limit, and not a new idea — control-geometry.test.ts closes
        // exactly this route for the controls and their icon spans, for the same
        // reason. Every icon on this page is decorative and takes its geometry from a
        // class, so there is no legitimate inline style for one to carry.
        for (const {el, where} of icons) {
            expect(
                el.getAttribute("style"),
                `${where} carries an inline style attribute (${el.getAttribute("style")}). It wins over the `
                + `icon rule and is invisible to every stylesheet assertion in this file.`,
            ).toBeNull();
        }
    });
});
