import {describe, expect, it} from "vitest";

import {TOKEN_ROLES} from "../src/content/design";
import {renderDesignDoc} from "../src/lib/design-doc";
import {PALETTE} from "../src/lib/palette";
import {expandHex} from "./helpers/contrast";
import {pageCss} from "./helpers/css";

/**
 * THE VALUES `/design` AND `DESIGN.md` PRINT ARE THE VALUES A BROWSER RESOLVES, OR THIS IS RED.
 *
 * `src/lib/palette.ts` reads the two `:root[data-theme=…]` blocks out of
 * `src/layouts/BasicLayout.astro` as text, so that a page and a spec can publish a token's colour
 * without anybody typing one into a second place. That is only safe while the reading is
 * faithful, and a parser is exactly the kind of thing that is quietly wrong: a regex that
 * captured a trailing comment, a name present in one theme and missing in the other, or a light
 * block read twice would each produce a palette that renders perfectly and says the wrong thing.
 *
 * SO THE SOURCE IS NOT THE AUTHORITY HERE — THE BUILT STYLESHEET IS. The load-bearing assertion
 * below compares this module against the theme blocks in the sheet the site actually ships,
 * names and values, in both directions. Everything above it is a floor that stops that
 * comparison from being satisfied by an empty array, and the two below it hold the surfaces:
 * every value has to reach the full markdown rendering, and none of them may reach the agent's,
 * which is a budget decision recorded in `.design-sync/NOTES.md` rather than an oversight.
 *
 * `tests/design-system.test.ts` owns the other end of the same chain — that the module NAMES
 * every token the stylesheet defines — and the page-side gate that each token's row carries its
 * own pair. Read its header for how the two divide.
 */

/** The one form both sides of the stylesheet comparison are reduced to before comparing. */
const canonical = (value: string) => expandHex(value.trim()).toLowerCase();

/** Every `--token: value` declared under a `:root[data-theme=…]` block in the BUILT CSS. */
function builtTheme(css: string, theme: string): Record<string, string> {
    const block = css.match(new RegExp(`:root\\[data-theme=['"]?${theme}['"]?\\]\\s*\\{([^}]*)\\}`))?.[1];
    expect(block, `the built stylesheet ships no ${theme} theme block — this suite would be vacuous`)
        .toBeTruthy();
    // No trailing `;` on the last declaration once the sheet is minified, so stop at `}` too.
    return Object.fromEntries(
        [...block!.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map((m) => [m[1]!, canonical(m[2]!)]),
    );
}

describe("the palette read out of the block that declares it", () => {
    it("parsed something at all", () => {
        expect(PALETTE.length,
            "src/lib/palette.ts parsed no tokens, so every assertion below would be satisfied by "
            + "an empty array and the page would print blank cells")
            .toBeGreaterThan(10);
    });

    it("gives every token two values that are colours", () => {
        const hex = /^#[0-9A-Fa-f]{3,8}$/;
        expect(PALETTE.filter(({light, dark}) => !hex.test(light) || !hex.test(dark))
            .map(({token, light, dark}) => `${token}: ${light} / ${dark}`),
            "these parsed to something that is not a hex colour — the capture ran past the `;` "
            + "into a comment, or the stylesheet has stopped declaring plain hex")
            .toEqual([]);
    });

    it("names each token once", () => {
        const names = PALETTE.map(({token}) => token);
        expect(names.length - new Set(names).size,
            "a token was parsed twice, so one of its two rows is a value nothing resolves to")
            .toBe(0);
    });

    /**
     * THE READER AND THE ROLE LIST DESCRIBE THE SAME SET. `TOKEN_ROLES` is what every surface
     * joins these values onto, so a token in one and not the other is a row with a role and no
     * colour, or a colour nothing will draw.
     */
    it("carries exactly the tokens the module gives a role", () => {
        const roled = new Set(TOKEN_ROLES.map(({token}) => token));
        const parsed = new Set(PALETTE.map(({token}) => token));
        expect([...parsed].filter((t) => !roled.has(t)).sort(),
            "src/lib/palette.ts reads values for these and src/content/design.ts gives them no "
            + "role, so nothing would draw them")
            .toEqual([]);
        expect([...roled].filter((t) => !parsed.has(t)).sort(),
            "src/content/design.ts gives these a role and src/lib/palette.ts read no value for "
            + "them, so their row would print a blank cell")
            .toEqual([]);
    });

    /**
     * THE ASSERTION THE WHOLE PLAN RESTS ON: what this module says a token is, and what the
     * shipped stylesheet says it is, agree — names AND values, both themes, both directions.
     * Without it a page could publish a colour the browser has never resolved.
     *
     * COMPARED CANONICALLY, NOT VERBATIM. The minifier lower-cases hex and folds `#111111` to
     * `#111`, so a literal comparison is red on correct code for most of these thirty. Both
     * sides are lower-cased and expanded to six digits at the comparison; the module itself
     * keeps the source spelling, because that spelling is what the page and the spec print.
     */
    it("agrees with the built stylesheet, token for token and value for value", () => {
        const css = pageCss();
        for (const theme of ["light", "dark"] as const) {
            const built = builtTheme(css, theme);
            expect(Object.keys(built).length,
                `no declarations parsed out of the built ${theme} block — this gate would be vacuous`)
                .toBeGreaterThan(10);
            const parsed = Object.fromEntries(PALETTE.map((t) => [t.token, canonical(t[theme])]));
            expect(Object.keys(built).filter((t) => !(t in parsed)).sort(),
                `the built stylesheet declares these in ${theme} and src/lib/palette.ts did not `
                + "read them")
                .toEqual([]);
            expect(Object.keys(parsed).filter((t) => !(t in built)).sort(),
                `src/lib/palette.ts reads these and the built stylesheet declares none of them in `
                + `${theme}`)
                .toEqual([]);
            expect(Object.entries(parsed)
                .filter(([token, value]) => token in built && built[token] !== value)
                .map(([token, value]) => `${token}: published ${value}, shipped ${built[token]}`),
                `/design and DESIGN.md would print a ${theme} value the browser does not resolve`)
                .toEqual([]);
        }
    });

    /**
     * A LIGHT BLOCK READ TWICE PASSES EVERY ASSERTION ABOVE. Both themes would parse, both would
     * carry every token, and both would agree with the sheet's light block — so the one property
     * that catches it is that the two are not the same palette. Asserted as a property rather
     * than on a named pair, so a repalette does not have to come back here.
     */
    it("reads two different themes, not one twice", () => {
        expect(PALETTE.filter(({light, dark}) => canonical(light) !== canonical(dark)).length,
            "every token resolves to the same value in both themes, which means one block was "
            + "parsed twice — the site has no dark mode if this is true")
            .toBeGreaterThan(0);
    });

    /**
     * THE DOCUMENT-SIDE TWIN OF THE PAGE GATE IN `tests/design-system.test.ts`. A value that
     * reached the page and not the spec would leave both files matching their own snapshots and
     * the two surfaces disagreeing, which is the hole plan 040 was ordered first to close.
     *
     * THE AGENT RENDERING CARRIES NONE OF THEM, AND THAT IS THE MEASURED DECISION IN BOTH
     * DIRECTIONS. Two value columns cost more than that document's remaining headroom against
     * the budget it is inlined into, and its own closed-set section already tells that reader the
     * stylesheet it was handed restates both themes' tokens above its rules. See
     * `.design-sync/NOTES.md`.
     */
    it("reaches the full spec with every value, and the agent's document with none", () => {
        expect(PALETTE.length, "PALETTE is empty — this gate would assert nothing").toBeGreaterThan(10);
        const full = renderDesignDoc("full");
        expect(PALETTE.flatMap(({token, light, dark}) => [light, dark].map((v) => `${token} ${v}`))
            .filter((pair) => !full.includes(pair.split(" ")[1]!)),
            "the full rendering does not print these values, so DESIGN.md and /design.md describe "
            + "a palette a reader still cannot get a colour out of")
            .toEqual([]);

        const agent = renderDesignDoc("agent");
        expect(PALETTE.flatMap(({light, dark}) => [light, dark]).filter((v) => agent.includes(v)),
            "the agent's document prints these values. It is inlined into a design agent's system "
            + "prompt with no room for them, and the stylesheet it is handed already carries both "
            + "themes' tokens — see .design-sync/NOTES.md")
            .toEqual([]);
        expect(agent.match(/#[0-9A-Fa-f]{6}\b/g) ?? [],
            "the agent's document has acquired a hex literal from somewhere other than the palette")
            .toEqual([]);
    });
});
