import {describe, expect, it} from "vitest";

import {COMPONENT_TOKENS} from "../src/lib/component-tokens";
import {SHORTCUTS} from "../src/lib/shortcuts";
import {SIZE_LADDER} from "../src/lib/brand-mark";
import {CARD_PADDING_PX, CARD_PX} from "../src/lib/share-card";
import {PALETTE} from "../src/lib/palette";
import {renderDesignDoc} from "../src/lib/design-doc";
import {pageCss} from "./helpers/css";

/**
 * THE `components` GROUP IS A CENSUS WITH TWO CONSUMERS, SO IT GETS THE `ICON_IDS` TREATMENT.
 *
 * `src/lib/shortcuts.ts` is the one home for the site's kinds of control; `uno.config.ts`
 * composes them into utility rules and `src/lib/component-tokens.ts` publishes what each one
 * resolves to. The failure this suite exists for is the two disagreeing — a seventh kind added
 * to the engine and absent from the published tokens, or an identifier published for a class no
 * page wears. Both are silent: the site renders correctly and the document renders correctly,
 * and only a reader building against the document finds out.
 *
 * SO EVERY ASSERTION HERE IS EITHER A BOTH-DIRECTIONS SET COMPARISON OR A CHECK AGAINST THE
 * SHIPPED SHEET. Nothing in this file states a value: a length typed here would be a third home
 * for a figure `uno.config.ts` owns, which is precisely the defect being guarded against.
 *
 * THE ONE THING IT CANNOT SEE is whether the format's own consumers accept the group. That needs
 * `@google/design.md`'s linter, a network round trip and somebody else's toolchain — the same
 * division of labour `tests/design-system.test.ts` argues for with the design-tool export.
 */

/** A shortcut whose name another shortcut composes: a base, and deliberately not published. */
const isBase = (name: string): boolean =>
    Object.entries(SHORTCUTS).some(([other, value]) =>
        other !== name && value.split(/\s+/).includes(name));

const WORN = Object.keys(SHORTCUTS).filter((name) => !isBase(name));

/** The identifier the mark takes. */
const MARK = "brand-mark";

/** The identifier the share card takes. */
const CARD = "share-card";

/**
 * THE TWO MEMBERS THAT ARE NOT CONTROLS, AND WHAT THEY HAVE IN COMMON.
 *
 * Neither is a shortcut and neither has a rule in any stylesheet: the mark is an SVG drawn from
 * geometry, and the card is a raster artifact posted somewhere else entirely. They are in this
 * group because the format's `components` map is the only place this document can publish a
 * drawing's box in a form a consumer can lay out from. Every assertion below that reads the
 * shipped sheet skips them for that reason, and each gets its own describe block instead.
 */
const NOT_A_CONTROL = [MARK, CARD];

describe("the published components are the worn kinds of control, and nothing else", () => {
    /**
     * FORWARD: everything the engine draws a worn box for is published. Add a seventh kind to
     * `SHORTCUTS` and this reddens until the document learns about it.
     */
    it("publishes every shortcut that is not a base", () => {
        for (const name of WORN) {
            expect(COMPONENT_TOKENS[name], `${name} is a worn kind of control and the components `
                + "group does not publish it").toBeDefined();
        }
    });

    /**
     * BACKWARD: nothing is published that is not one. An identifier here that resolves to no
     * shortcut is a component a reader would reach for and find nothing behind.
     */
    it("publishes nothing but those, the brand mark and the share card", () => {
        for (const name of Object.keys(COMPONENT_TOKENS)) {
            if (NOT_A_CONTROL.includes(name)) continue;
            expect(WORN, `the components group publishes "${name}", which is not a worn shortcut`)
                .toContain(name);
        }
    });

    /**
     * THE TWO BASES ARE REFUSED, AND THAT IS THE POINT OF DERIVING RATHER THAN LISTING. Nothing
     * wears `control-surface` or `chip-surface`, neither reaches the shipped stylesheet, and the
     * Controls section tells a reader not to reach for them — so publishing either as a component
     * would advertise an identifier with no element behind it.
     */
    it("refuses the bases", () => {
        const bases = Object.keys(SHORTCUTS).filter(isBase);
        expect(bases.length, "no shortcut is composed by another any more, so the base/worn "
            + "distinction this group is derived from has stopped meaning anything").toBeGreaterThan(0);
        for (const base of bases) expect(COMPONENT_TOKENS[base]).toBeUndefined();
    });

    /** Both drawings are always present; a group of controls alone would publish neither box. */
    it("publishes the brand mark and the share card", () => {
        expect(COMPONENT_TOKENS[MARK]).toBeDefined();
        expect(COMPONENT_TOKENS[CARD]).toBeDefined();
    });
});

describe("every published value is one the browser resolves", () => {
    const css = (): string => pageCss("dist/design/index.html");

    /**
     * THE DECLARATIONS ARE READ BACK OUT OF THE SHIPPED SHEET, which is the assertion that makes
     * the whole group trustworthy: the generator this module drives and the generator the build
     * ran are the same engine, so if these ever differ the group has stopped describing the site.
     *
     * `min-` IS ACCEPTED BESIDE THE BARE PROPERTY because the format has one name per axis and
     * this site has controls that PIN and controls that FLOOR. Which is which is gated by
     * `tests/control-geometry.test.ts`; this only asks that the figure be the shipped one.
     */
    const PROPERTIES: Readonly<Record<string, readonly string[]>> = {
        backgroundColor: ["background-color"],
        textColor: ["color"],
        rounded: ["border-radius"],
        height: ["min-height", "height"],
        width: ["min-width", "width"],
    };

    /**
     * THE SHIPPED SHEET IS MINIFIED AND THE DERIVED VALUES ARE NOT, so the comparison is
     * normalised rather than exact — the same bargain `src/lib/palette.ts` records for its hexes,
     * for the same reason: the source spelling is what ships, and folding it here would change
     * what every surface prints. Three differences, all measured on this build: a leading zero is
     * dropped (`0.5rem` -> `.5rem`), a shorthand replaces longhands, and a `var()` can come back
     * with a trailing space.
     */
    const same = (value: string): string => value.trim().replace(/\s+/g, " ").replace(/\b0\./g, ".");

    it.each(Object.keys(COMPONENT_TOKENS).filter((n) => !NOT_A_CONTROL.includes(n)))(
        "matches the shipped rule for %s", (name) => {
            const rule = new RegExp(`[{}\\n]\\.${name}\\{([^}]*)\\}`).exec(css());
            expect(rule, `${name} has no rule in the stylesheet /design ships`).not.toBeNull();
            const found: Record<string, string> = {};
            for (const d of rule![1]!.split(";")) {
                const at = d.indexOf(":");
                if (at > 0) found[d.slice(0, at).trim()] = d.slice(at + 1).trim();
            }
            let checked = 0;
            for (const [token, properties] of Object.entries(PROPERTIES)) {
                const published = COMPONENT_TOKENS[name]![token];
                if (published === undefined) continue;
                const shipped = properties.map((p) => found[p]).find((v) => v !== undefined);
                expect(shipped, `${name} publishes ${token} and the sheet declares none of `
                    + properties.join("/")).toBeDefined();
                // A reference is checked by resolving it back to the token it names.
                const reference = /^\{colors\.\w+?-(.+)\}$/.exec(published);
                expect(same(reference ? `var(--${reference[1]})` : published),
                    `${name}.${token} does not match the shipped declaration`).toBe(same(shipped!));
                checked++;
            }
            expect(checked, `${name} published nothing this test could check`).toBeGreaterThan(0);
        });

    /**
     * PADDING IS RECOMBINED FROM FOUR LONGHANDS, so it is the one value that is not a declaration
     * read straight off the sheet and it gets its own check.
     */
    it.each(Object.keys(COMPONENT_TOKENS)
        .filter((n) => !NOT_A_CONTROL.includes(n) && COMPONENT_TOKENS[n]!.padding !== undefined))(
        "recombines %s's padding into what the sheet ships", (name) => {
            const rule = new RegExp(`[{}\\n]\\.${name}\\{([^}]*)\\}`).exec(css())![1]!;
            // The minifier collapses the four longhands the generator emits into a shorthand, so
            // read whichever form this build produced rather than assuming one.
            const shorthand = /(?:^|;)padding:([^;]*)/.exec(rule)?.[1];
            const side = (p: string) => new RegExp(`(?:^|;)padding-${p}:([^;]*)`).exec(rule)?.[1];
            const shipped = shorthand ?? (() => {
                const [top, right] = [side("top"), side("right")];
                expect(top, `${name} declares neither a padding shorthand nor longhands`).toBeDefined();
                return top === right ? top! : `${top} ${right}`;
            })();
            expect(same(COMPONENT_TOKENS[name]!.padding!)).toBe(same(shipped));
        });

    /**
     * A COLOUR IS EITHER A REFERENCE INTO THE `colors` GROUP OR A COMPUTED VALUE, NEVER A HEX.
     * A literal here would pin one theme's value onto a control that has two — the exact thing
     * the Colors section's first don't forbids.
     */
    it("states no colour literally", () => {
        for (const [name, tokens] of Object.entries(COMPONENT_TOKENS)) {
            for (const [token, value] of Object.entries(tokens)) {
                expect(value, `${name}.${token} carries a hex, so it is right in at most one theme`)
                    .not.toMatch(/#[0-9A-Fa-f]{3,8}/);
            }
        }
    });

    /**
     * EVERY REFERENCE RESOLVES. The format calls a reference to a key that is not there a
     * broken-ref error, and the `colors` group's own key shape is `<theme>-<token minus the
     * leading dashes>` — so this is the same check `colorTokens`' alias lookup already throws on,
     * applied to the other group that uses the syntax.
     */
    it("points every reference at a token the colors group publishes", () => {
        const published = new Set(PALETTE.map((t) => t.token.replace(/^--/, "")));
        for (const [name, tokens] of Object.entries(COMPONENT_TOKENS)) {
            for (const [token, value] of Object.entries(tokens)) {
                const reference = /^\{colors\.\w+?-(.+)\}$/.exec(value);
                if (!reference) continue;
                expect(published, `${name}.${token} references a token the stylesheet no longer `
                    + "defines, which is a broken ref in this format").toContain(reference[1]);
            }
        }
    });
});

describe("the brand mark's entry", () => {
    /** Its box is the ladder's largest step — the only size this system has drawn it at. */
    it("takes its box from the size ladder", () => {
        const largest = `${Math.max(...SIZE_LADDER)}px`;
        expect(COMPONENT_TOKENS[MARK]!.height).toBe(largest);
        expect(COMPONENT_TOKENS[MARK]!.width).toBe(largest);
    });

    /** Ink and track, as references, so the entry says which tokens draw it rather than what they are. */
    it("names its two tokens rather than their values", () => {
        expect(COMPONENT_TOKENS[MARK]!.textColor).toMatch(/^\{colors\.\w+-brand-ink\}$/);
        expect(COMPONENT_TOKENS[MARK]!.backgroundColor).toMatch(/^\{colors\.\w+-progress-track\}$/);
    });
});

describe("the share card's entry", () => {
    /**
     * ITS BOX COMES OFF THE FRAME CONSTANTS, so the published figures cannot disagree with the
     * card the renderer draws. Asserted against the module rather than against 1080, which would
     * be the second home this whole group exists to avoid.
     */
    it("takes its box and its inset from the card's own frame", () => {
        expect(COMPONENT_TOKENS[CARD]!.height).toBe(`${CARD_PX}px`);
        expect(COMPONENT_TOKENS[CARD]!.width).toBe(`${CARD_PX}px`);
        expect(COMPONENT_TOKENS[CARD]!.padding).toBe(`${CARD_PADDING_PX}px`);
    });

    /**
     * IT IS SQUARE, ASSERTED AS A COMPARISON. The card is square because the platform's carousel
     * crops a portrait; equality is the claim, and pinning both to a literal would pass a build
     * where the card had quietly become a rectangle in agreement with itself.
     */
    it("publishes a square box", () => {
        expect(COMPONENT_TOKENS[CARD]!.width).toBe(COMPONENT_TOKENS[CARD]!.height);
    });

    /** Its two colours are references, so the entry names tokens rather than repeating values. */
    it("names its two tokens rather than their values", () => {
        expect(COMPONENT_TOKENS[CARD]!.backgroundColor).toMatch(/^\{colors\.\w+-background\}$/);
        expect(COMPONENT_TOKENS[CARD]!.textColor).toMatch(/^\{colors\.\w+-text\}$/);
    });
});

describe("the group reaches the document", () => {
    const doc = (): string => renderDesignDoc("full");

    /** One `components:` key, in the front matter, and no leftover omission claiming otherwise. */
    it("publishes the group and no longer declares it omitted", () => {
        const rendered = doc();
        expect(rendered.match(/^components:$/gm)?.length).toBe(1);
        expect(rendered).not.toMatch(/^\s*- section: components$/m);
    });

    /** Every component and every one of its tokens is in the rendering, at the format's indents. */
    it("renders every component and token", () => {
        const rendered = doc();
        for (const [name, tokens] of Object.entries(COMPONENT_TOKENS)) {
            expect(rendered, `${name} is derived and not rendered`).toContain(`\n  ${name}:\n`);
            for (const [token, value] of Object.entries(tokens)) {
                expect(rendered, `${name}.${token} is derived and not rendered`)
                    .toContain(`\n    ${token}: "${value}"`);
            }
        }
    });

    /**
     * IT SITS BEFORE `omitted`, which is where the format's own schema puts the value groups. A
     * group after the omissions is still valid YAML and still parses; it is simply not the shape
     * a reader of that format scans.
     */
    it("puts the group ahead of the omissions", () => {
        const rendered = doc();
        expect(rendered.indexOf("\ncomponents:")).toBeLessThan(rendered.indexOf("\nomitted:"));
    });
});
