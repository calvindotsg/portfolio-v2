import {describe, expect, it} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {parseHTML} from "linkedom";

import {GOALS, LINKS} from "../src/lib/constants";

/**
 * The nine styled controls must all be ONE box.
 *
 * They were not, for as long as the surface existed: the eight anchors rendered
 * at five different widths (57.00, 59.59, 61.39, 62.00 px) because nothing
 * declared a width and `presetIcons` emits each icon at its artwork's aspect
 * ratio, so the icon's proportions leaked into the button's; and the theme
 * toggle rendered 60 x 40 from a second class whose max-width was below its own
 * content width, which squashed its 1em icon to 18px. Nothing in the suite read
 * a single box metric of any control, so the whole defect class was invisible to
 * it — `uno.config.ts` said as much in a comment.
 *
 * WHAT THIS FILE CANNOT PROVE, stated so nobody trusts it further than it goes.
 * There is no layout engine here (linkedom parses, it does not lay out), so
 * nothing below measures a rendered box. It reads the DECLARATIONS and checks
 * they are self-consistent and absolute. It therefore cannot see: a control
 * shrunk below its declared width by a flex parent (`flex-shrink` — which really
 * did shrink the two goal CTAs to 47.80px at lg until the surface was pinned, and
 * is why `flex-shrink: 0` is asserted here rather than assumed); grid track
 * sizing; whether a card clips a control; or anything about a rendered pixel.
 * Browser measurement at 320/390/640/768/1024/1440 in both themes is the other
 * half of this and is not optional.
 *
 * It is deliberately written to name NO class of its own. The control set is
 * discovered from the surface's own signature — the offset plate plus the accent
 * border — so a renamed class is still covered, and a SECOND divergent variant
 * (exactly how this defect happened) is caught by the uniformity assertion
 * rather than slipping past a hard-coded list.
 */
describe("every styled control is one declared box", () => {
    const read = (p: string) => readFileSync(p, "utf8");
    const css = read(`dist/_astro/${readdirSync("dist/_astro").find((f) => f.endsWith(".css"))!}`);
    const html = read("dist/index.html");

    /**
     * Split the minified sheet into top-level rules, tracking at-rule depth so a
     * `@media` body is never mistaken for a top-level rule. `build-output.test.ts`
     * has a `decl()` helper, but it is attribute-order-based and at-rule-blind, so
     * it can answer with a rule from inside a media query — not good enough for a
     * geometry assertion.
     */
    type Rule = {selectors: string[], body: string, nested: boolean};
    const rules: Rule[] = [];
    {
        let i = 0, prelude = "", atDepth = 0;
        while (i < css.length) {
            const ch = css[i];
            if (ch === "{") {
                const head = prelude.trim();
                prelude = "";
                if (head.startsWith("@")) {
                    atDepth++;
                    i++;
                    continue;
                }
                // Body runs to the matching close brace.
                let depth = 1, j = i + 1;
                while (j < css.length && depth > 0) {
                    if (css[j] === "{") depth++;
                    else if (css[j] === "}") depth--;
                    j++;
                }
                rules.push({
                    selectors: head.split(",").map((s) => s.trim()),
                    body: css.slice(i + 1, j - 1),
                    nested: atDepth > 0,
                });
                i = j;
                continue;
            }
            if (ch === "}") {
                if (atDepth > 0) atDepth--;
                prelude = "";
                i++;
                continue;
            }
            prelude += ch;
            i++;
        }
    }

    const decl = (body: string, prop: string) =>
        body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))?.[1]?.trim();

    /** The surface signature: an offset plate whose colour resolves, on an accent border. */
    const isControlRule = (r: Rule) =>
        !r.nested
        && /--un-shadow:\s*2px 2px 0/.test(r.body)
        && /border-color:\s*var\(--accent\)/.test(r.body);

    const controlClasses = [...new Set(
        rules.filter(isControlRule)
            .flatMap((r) => r.selectors)
            .map((s) => s.match(/^\.((?:\\.|[\w-])+)$/)?.[1])
            .filter((s): s is string => Boolean(s))
            .map((s) => s.replace(/\\(.)/g, "$1")),
    )];

    const px = (value: string | undefined) => {
        if (!value) return null;
        const m = value.match(/^(-?[\d.]+)(px|rem)$/);
        if (!m) return null;
        return parseFloat(m[1]) * (m[2] === "rem" ? 16 : 1);
    };

    const boxOf = (cls: string) => {
        const r = rules.find((rule) => !rule.nested && rule.selectors.includes(`.${cls}`))!;
        return {
            cls,
            body: r.body,
            width: decl(r.body, "width"),
            height: decl(r.body, "height"),
            maxWidth: decl(r.body, "max-width"),
            maxHeight: decl(r.body, "max-height"),
            padding: decl(r.body, "padding"),
            borderWidth: decl(r.body, "border-width"),
            fontSize: decl(r.body, "font-size"),
            display: decl(r.body, "display"),
            justify: decl(r.body, "justify-content"),
            align: decl(r.body, "align-items"),
            placeItems: decl(r.body, "place-items"),
            flexShrink: decl(r.body, "flex-shrink"),
        };
    };

    it("finds the control surface at all, so the assertions below are not vacuous", () => {
        // If the signature ever stops matching, every other test here would pass
        // trivially over an empty set. This is the guard against that.
        expect(controlClasses.length, "no rule carries the offset-plate + accent-border signature").toBeGreaterThan(0);
        const worn = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
        for (const cls of controlClasses) {
            expect(worn.has(cls), `.${cls} is styled as a control but no element wears it`).toBe(true);
        }
    });

    it("declares an absolute width and height, rather than capping a content-sized box", () => {
        for (const box of controlClasses.map(boxOf)) {
            expect(px(box.width), `.${box.cls} width must be an absolute length, got ${box.width ?? "nothing"}`).not.toBeNull();
            expect(px(box.height), `.${box.cls} height must be an absolute length, got ${box.height ?? "nothing"}`).not.toBeNull();
            // A max-* cap instead of a real size is the original defect in both of
            // its forms: it leaves the box content-sized, and it deforms the
            // content when the cap bites (the toggle's 20px icon became 18px).
            expect(box.maxWidth, `.${box.cls} must not cap its width; declare it`).toBeUndefined();
            expect(box.maxHeight, `.${box.cls} must not cap its height; declare it`).toBeUndefined();
        }
    });

    it("gives every control the same box", () => {
        const boxes = controlClasses.map(boxOf);
        const tuples = new Set(boxes.map((b) => `${b.width}/${b.height}/${b.padding ?? "0"}/${b.borderWidth ?? "0"}/${b.fontSize}`));
        expect(
            [...tuples],
            `${boxes.length} control classes resolve ${tuples.size} different boxes — a second variant is how the toggle ended up 6px shorter than the anchors`,
        ).toHaveLength(1);
    });

    it("meets the enhanced target size on both axes", () => {
        // WCAG 2.2 SC 2.5.5 Target Size (Enhanced, AAA) is 44x44 CSS px; SC 2.5.8
        // (Minimum, AA) asks only 24x24 and was never the binding constraint here,
        // because the anchors already shipped at 46px tall. 48px additionally
        // clears the 48-CSS-px finger that Lighthouse's tap-target audit uses.
        for (const box of controlClasses.map(boxOf)) {
            expect(px(box.width)!, `.${box.cls} is ${box.width} wide`).toBeGreaterThanOrEqual(44);
            expect(px(box.height)!, `.${box.cls} is ${box.height} tall`).toBeGreaterThanOrEqual(44);
        }
    });

    it("centres its icon with the container, and never squeezes it", () => {
        for (const box of controlClasses.map(boxOf)) {
            expect(box.display, `.${box.cls} must lay its icon out, not rely on text alignment`).toMatch(/^(inline-)?(flex|grid)$/);
            const centred = box.placeItems === "center" || (box.justify === "center" && box.align === "center");
            expect(centred, `.${box.cls} must centre on both axes (got justify=${box.justify}, align=${box.align})`).toBe(true);

            // The content box must hold the widest icon outright. `box-sizing:
            // border-box` is set by the preflight, so the declared width already
            // includes padding and border.
            const fontPx = px(box.fontSize) ?? 16;
            const border = px(box.borderWidth) ?? 0;
            const pad = box.padding ? (box.padding.trim().split(/\s+/).map((p) => px(p) ?? 0)) : [0];
            const sidePad = pad.length > 1 ? pad[1] : pad[0];
            const content = px(box.width)! - 2 * border - 2 * sidePad;

            const widestIconEm = Math.max(...rules
                .filter((r) => !r.nested && r.selectors.some((s) => /^\.i-/.test(s)))
                .map((r) => parseFloat(decl(r.body, "width")?.match(/^([\d.]+)em$/)?.[1] ?? "0")));
            expect(widestIconEm, "no icon rule declares an em width — the parser has drifted").toBeGreaterThan(0);
            expect(
                content,
                `.${box.cls} has ${content}px of content box for a ${widestIconEm}em (${widestIconEm * fontPx}px) icon`,
            ).toBeGreaterThanOrEqual(widestIconEm * fontPx);
        }
    });

    it("pins the box and the icon against a flex parent", () => {
        // The goal CTAs sit in a flex row, where flex-shrink outranks a declared
        // width: they measured 47.80px at lg with the width already declared.
        for (const box of controlClasses.map(boxOf)) {
            expect(box.flexShrink, `.${box.cls} must not be shrinkable below its declared width`).toBe("0");
        }

        const {document} = parseHTML(html);
        const shrinkProof = new Set(rules
            .filter((r) => !r.nested && /flex-shrink:\s*0/.test(r.body))
            .flatMap((r) => r.selectors)
            .map((s) => s.match(/^\.((?:\\.|[\w-])+)$/)?.[1])
            .filter((s): s is string => Boolean(s))
            .map((s) => s.replace(/\\(.)/g, "$1")));

        const controls = [...document.querySelectorAll(controlClasses.map((c) => `.${c}`).join(","))];
        expect(controls.length, "one control per social link, goal CTA and the theme toggle")
            .toBe(LINKS.length + GOALS.length + 1);

        for (const control of controls) {
            const icons = [...control.querySelectorAll("span")]
                .filter((s) => /(^|\s)i-/.test(s.getAttribute("class") ?? ""));
            expect(icons.length, "every control renders at least one icon span").toBeGreaterThan(0);
            for (const icon of icons) {
                const tokens = (icon.getAttribute("class") ?? "").split(/\s+/);
                expect(
                    tokens.some((t) => shrinkProof.has(t)),
                    `${tokens.join(" ")} may be squeezed by its control — pin it, as the toggle's 1em icon rendered at 18px without this`,
                ).toBe(true);
            }
        }
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
});
