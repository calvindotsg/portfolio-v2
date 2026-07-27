import {describe, expect, it} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {LINKS, NOW} from "../src/lib/constants";
import {decl, isKeyframeStep, parseRules, px, type Rule, structuralSelector} from "./helpers/css";

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
 */
describe("every styled control is one declared box", () => {
    const read = (p: string) => readFileSync(p, "utf8");
    const css = read(`dist/_astro/${readdirSync("dist/_astro").find((f) => f.endsWith(".css"))!}`);
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
        };
    };

    const controlElements = () =>
        [...document.querySelectorAll(controlClasses.map((c) => `.${c}`).join(","))];

    const iconSpansOf = (control: Element) =>
        [...control.querySelectorAll("span")]
            .filter((s) => (s.getAttribute("class") ?? "").split(/\s+/).some((t) => /^i-/.test(t)));

    it("finds the control surface at all, so the assertions below are not vacuous", () => {
        expect(controlClasses.length, "no rule carries the offset-plate + accent-border signature").toBeGreaterThan(0);
        const worn = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
        for (const cls of controlClasses) {
            expect(worn.has(cls), `.${cls} is styled as a control but no element wears it`).toBe(true);
        }
        expect(controlElements().length, "one control per social link, plus the theme toggle")
            .toBe(LINKS.length + 1);
    });

    it("declares a real width and height, rather than capping a content-sized box", () => {
        for (const box of controlClasses.map(boxOf)) {
            expect(px(box.width), `.${box.cls} width must be a declared length, got ${box.width ?? "nothing"}`).not.toBeNull();
            expect(px(box.height), `.${box.cls} height must be a declared length, got ${box.height ?? "nothing"}`).not.toBeNull();
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
        for (const box of controlClasses.map(boxOf)) {
            for (const [axis, value] of [["width", box.width], ["height", box.height]] as const) {
                expect(
                    value,
                    `.${box.cls} ${axis} must be font-relative so the control keeps its size against the text beside it; found "${value}"`,
                ).toMatch(/\d\s*r?em\b/);
            }
        }
    });

    it("gives every control the same box", () => {
        const boxes = controlClasses.map(boxOf);
        const tuples = new Set(boxes.map((b) => `${b.width}/${b.height}/${b.padding}/${b.borderWidth ?? "0"}/${b.fontSize}`));
        expect(
            [...tuples],
            `${boxes.length} control classes resolve ${tuples.size} different boxes — a second variant is how the toggle ended up 6px shorter than the anchors`,
        ).toHaveLength(1);
    });

    it("meets the enhanced target size on both axes", () => {
        // WCAG 2.2 SC 2.5.5 Target Size (Enhanced, AAA) is 44x44 CSS px; SC 2.5.8
        // (Minimum, AA) asks only 24x24 and was never binding here, because the
        // anchors already shipped 46px tall. 48 also lands exactly on Android's and
        // Material's 48dp recommendation and above Apple's 44pt.
        //
        // CORRECTION to an earlier version of this comment, which claimed 48px
        // "clears the 48-CSS-px finger Lighthouse's tap-target audit uses": that
        // audit no longer exists. `tap-targets`, with its `FINGER_SIZE_PX = 48`,
        // was deleted in Lighthouse v12.0.0 (commit acfd1fb5ea, 2024-04-01) and
        // replaced by the axe-backed `target-size` audit, which measures bounding
        // rects against 24px. So no shipping tool checks 48 — the AAA number 44 is
        // the only threshold above the AA minimum that any of this is measured on.
        for (const box of controlClasses.map(boxOf)) {
            expect(px(box.width)!, `.${box.cls} is ${box.width} wide`).toBeGreaterThanOrEqual(44);
            expect(px(box.height)!, `.${box.cls} is ${box.height} tall`).toBeGreaterThanOrEqual(44);
        }
    });

    it("centres its icon with the container, and leaves room for the largest one", () => {
        // A fixed reference, NOT the sheet's own widest icon: an earlier version
        // took the yardstick from the same rules it was checking, so shrinking
        // every icon shrank the yardstick with it and a 45% global shrink passed.
        // presetIcons' contract for these collections is height 1em with width
        // <= 1em (the artwork's aspect ratio), so 1em is the reference.
        const ICON_REFERENCE_EM = 1;

        for (const box of controlClasses.map(boxOf)) {
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
        for (const box of controlClasses.map(boxOf)) {
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

    it("lets the button grid take its track width from the control", () => {
        // The grid's tracks are intentionally content-sized in all three of its
        // scopes: with one control size they come out equal on their own, so the
        // width is stated once. Hard-coding track widths would let the two drift
        // and bring back the ragged columns this file exists to prevent.
        const gridRules = rules.filter((r) => r.selectors.includes(".button-grid"));
        expect(gridRules.length, "the button grid must still be styled").toBeGreaterThan(0);
        for (const r of gridRules) {
            const tracks = decl(r.body, "grid-template-columns");
            if (!tracks) continue;
            expect(tracks, "a fixed track duplicates the control's declared width").toMatch(/^repeat\(\d+,\s*auto\)$/);
        }
    });

    /**
     * THE NOW CARD'S EXPLAINER IS A TARGET TOO, and it is deliberately not a `.control`.
     *
     * It is an icon-only link in a card corner with no visible words, which makes it the
     * one interactive element on the page whose whole hit area is decided by a box nobody
     * else's tests look at. Shrink it to the glyph and it becomes a 16px target.
     *
     * 24px, and NOT the 48px the plated controls get, which is a real inconsistency and
     * worth stating rather than hiding. 24x24 is exactly WCAG 2.2 SC 2.5.8 (Minimum, AA)
     * and is the number axe's `target-size` audit measures; SC 2.5.5 (Enhanced, AAA) asks
     * 44 and this does not meet it. The reason is position, not principle: at 44px the
     * box would run from the card's top padding edge down into the first line of the
     * body copy, and sideways past where a longer card title can reach — measured, the
     * heading's text can extend to 176px from the card's left edge and a 44px box would
     * start at 172. The controls are the card's primary affordances in a grid of their
     * own and have the room; this is a supplementary link in a corner and does not.
     *
     * The box is font-relative for the same reason everything else on this page is: a
     * target that stays 24px while the reader's text doubles is a target that has
     * halved. `w-6 h-6` is 1.5rem, so it grows with the type.
     */
    it("gives the Now card's icon-only explainer a real target, sized in text", () => {
        const link = [...document.querySelectorAll("[data-card] a")]
            .find((a) => a.getAttribute("href") === NOW.explainer_url);
        expect(link, `no link to ${NOW.explainer_url} — this assertion would be vacuous`).toBeTruthy();

        // Resolved over every rule that can reach the element, so a later utility that
        // overrides the box is caught rather than merely the first one that agrees.
        const reaching = rules.filter((r) => !isKeyframeStep(r) && r.selectors.some((s) => {
            const structural = structuralSelector(s);
            return Boolean(structural) && [...document.querySelectorAll(structural)].includes(link as never);
        }));
        expect(reaching.length, "no rule in the sheet reaches the explainer link — the walker has drifted").toBeGreaterThan(0);

        for (const prop of ["width", "height"] as const) {
            const declared = reaching.flatMap((r) => {
                const v = decl(r.body, prop);
                return v ? [v] : [];
            });
            expect(declared, `the explainer link must declare a ${prop}; an inline box's padding hit-tests but adds nothing to the line box`).not.toEqual([]);
            const winner = declared[declared.length - 1];
            expect(
                px(winner),
                `the explainer's ${prop} resolves to "${winner}", which is not a length this can measure`,
            ).not.toBeNull();
            expect(
                px(winner)!,
                `the explainer's ${prop} is ${winner} (${px(winner)}px at a 16px root); SC 2.5.8 asks 24`,
            ).toBeGreaterThanOrEqual(24);
            expect(
                winner,
                `the explainer's ${prop} must be font-relative, or the target shrinks against the reader's text; found "${winner}"`,
            ).toMatch(/\d\s*r?em\b/);
        }
    });
});
