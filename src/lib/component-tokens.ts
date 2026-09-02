/**
 * THE `components` TOKEN GROUP, DERIVED FROM THE ENGINE THAT DRAWS THE CONTROLS.
 *
 * The DESIGN.md format's `components` group is a map from a component identifier to a group of
 * style tokens — `backgroundColor`, `textColor`, `rounded`, `padding`, `height`, `width`. This
 * module produces it by asking UnoCSS what each of this site's kinds of control ACTUALLY
 * resolves to, and mapping the declarations it gets back. Nothing here is authored: a value in
 * this file would be a second home for a number `uno.config.ts` already owns, which is the one
 * defect the whole design-system publishing chain exists to prevent.
 *
 * THAT GROUP WAS DECLARED OMITTED AND THE STATED REASON ANSWERED A DIFFERENT QUESTION. It said
 * the site is built in Astro, whose components compile to a server render and have no runtime
 * form, so there is nothing to mount and the namespace is empty by construction. That is true,
 * and it is true of the EXPORTED BUNDLE rather than of this format — the format's group has no
 * notion of mounting anything. It is a map of style tokens, and this site has four kinds of
 * control with real ones. The claim about the bundle keeps its home in this file's header; the
 * omission is retracted.
 *
 * WHY THE GENERATOR AND NOT THE SHIPPED SHEET. The stylesheet only exists after a build, and
 * this module is read DURING one — `DESIGN.md` and `/design.md` are rendered by the same
 * function, at build time, with no `dist/` to parse. Driving the generator asks the same engine
 * the same question the build asks it, so the answer cannot be a stale copy of one.
 *
 * FIVE THINGS THE SPIKE MEASURED, each of which is a trap you would otherwise hit one at a time:
 *
 *   1. `createGenerator` comes from `unocss`, a direct dependency. NOT from `@unocss/core`,
 *      which is transitive — pnpm's strict layout fails that import outright.
 *   2. It is ASYNC in v66, which is why this module resolves its work once at load rather than
 *      exporting a function. Everything downstream — the renderer, the routes, the tests — is
 *      synchronous and stays that way.
 *   3. The config's `safelist` must be stripped before generating, or every call emits the
 *      whole icon layer: 44 KB of `data:` URIs with the rule you asked for buried in it.
 *   4. `generate(name, {preflights: false})` then yields exactly the declarations mapped below,
 *      with `var(--token)` intact and lengths already resolved to `rem` and `px`.
 *   5. `padding` arrives as four longhands rather than a shorthand, and `transition-duration` is
 *      emitted twice. Neither is a bug to route around; both are just what the output looks like.
 *
 * TOP-LEVEL `await` IS LEGAL HERE AND ILLEGAL TWO MODULES AWAY, so state the boundary rather
 * than the directory: the constraint binds everything `uno.config.ts` drags through unconfig/jiti,
 * and this module sits on the other side of that config rather than inside it. Nothing the config
 * reaches imports this file — it is read by `src/lib/design-doc.ts`, which the config does not
 * reach either. Importing this from anything under `src/content/` would close that loop and kill
 * `astro build` with `glob is not a function`; the rule is written out above `EVENTS` in
 * `src/data/races/index.ts`.
 */

import {createGenerator} from "unocss"

import unoConfig from "../../uno.config"
import {SIZE_LADDER} from "./brand-mark"
import {CARD_PADDING_PX, CARD_PX} from "./share-card"
import {SHORTCUTS} from "./shortcuts"

/**
 * WHICH CSS PROPERTY BECOMES WHICH OF THE FORMAT'S TOKEN NAMES.
 *
 * A FIXED SET, DELIBERATELY, rather than everything the engine emits. A control's rule carries
 * thirty-odd declarations — transitions, transforms, four pressed-state variants — and a
 * `components` group that carried all of them would be the stylesheet with different key names,
 * which is not a token group and helps nobody. These are the properties the format names.
 *
 * A CONTROL PINS ITS BOX OR FLOORS IT, and both spellings map to the same token because the
 * format has one name for the axis. Which of the two a control uses is a real distinction this
 * site gates elsewhere (`tests/control-geometry.test.ts`) and is not something a token name can
 * carry; publishing `height` for a floor is the honest reading of the format's own word, since
 * that IS the height the component takes at its smallest.
 */
const PROPERTY_TOKENS: readonly (readonly [string, string])[] = [
    ["background-color", "backgroundColor"],
    ["color", "textColor"],
    ["border-radius", "rounded"],
    ["min-height", "height"],
    ["height", "height"],
    ["min-width", "width"],
    ["width", "width"],
]

/** The four longhands, in the order a `padding` shorthand writes them. */
const PADDING_SIDES = ["padding-top", "padding-right", "padding-bottom", "padding-left"] as const

/**
 * A BASE IS A SHORTCUT ANOTHER SHORTCUT COMPOSES, AND IT IS DERIVED RATHER THAN LISTED.
 *
 * `control-surface` and `chip-surface` are bases: nothing wears either directly, neither reaches
 * the shipped stylesheet, and the Controls section of `src/content/design.ts` tells a reader not
 * to reach for them. Publishing them as components would advertise two identifiers that resolve
 * to no element on the site.
 *
 * The test for a base is that its NAME appears inside another shortcut's value, which is exactly
 * what composition looks like in this config. Deriving it means a third base — or a base
 * promoted to a worn kind — needs no edit here, which a hand-kept exclusion list would.
 */
function isBase(name: string): boolean {
    return Object.entries(SHORTCUTS).some(([other, value]) =>
        other !== name && value.split(/\s+/).includes(name))
}

/**
 * Every declaration in the rule UnoCSS emits for one class name.
 *
 * The generated sheet holds one rule per name once `safelist` is out of the way, but it may hold
 * variant rules beside it — `@media (hover: hover)` arms, `[data-leaving]` twins — and those are
 * states rather than the component's resting style. Only the UNCONDITIONAL rule is read, which is
 * what makes the result a token group rather than a state machine.
 */
function declarations(css: string, name: string): Record<string, string> {
    const out: Record<string, string> = {}
    // Anchored at a line start: rules are newline-separated, and `\\.chip\\{` cannot match
    // `.chip-icon{` or `.chip[data-leaving]{` because the brace has to follow the name directly.
    const rule = new RegExp(`^\\.${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)\\}`, "m")
        .exec(css)
    if (!rule) return out
    for (const declaration of rule[1]!.split(";")) {
        const at = declaration.indexOf(":")
        if (at < 0) continue
        // Last wins, which is what a browser does with a property declared twice in one rule.
        out[declaration.slice(0, at).trim()] = declaration.slice(at + 1).trim()
    }
    return out
}

/**
 * A VALUE IN THE FORMAT'S OWN VOCABULARY. A bare `var(--token)` becomes a `{colors.<theme>-…}`
 * reference against the `colors` group this document already publishes, so no component entry
 * repeats a hex or pins one theme's value onto a control that has two.
 *
 * ANYTHING ELSE IS PASSED THROUGH VERBATIM, and the case that forces it is the chips' hairline:
 * `color-mix(in srgb,var(--text) 32%,transparent)` is a computed colour with a token inside it,
 * not a reference to one. Rewriting it would be inventing a value; dropping it would publish a
 * border with no colour. It is what the browser resolves, so it is what this says.
 */
function referenceOrValue(value: string, theme: string): string {
    const bare = /^var\(\s*--([\w-]+)\s*\)$/.exec(value)
    return bare ? `{colors.${theme}-${bare[1]}}` : value
}

/**
 * ONE COMPONENT'S TOKENS. `padding` is recombined from its four longhands here because the format
 * names the shorthand and the engine emits the parts; the two-value form is collapsed when the
 * opposite sides agree, which is what anybody writing that padding by hand would have typed.
 */
function componentFrom(css: string, name: string, theme: string): Record<string, string> {
    const found = declarations(css, name)
    const tokens: Record<string, string> = {}
    for (const [property, token] of PROPERTY_TOKENS) {
        const value = found[property]
        if (value !== undefined && tokens[token] === undefined) {
            tokens[token] = referenceOrValue(value, theme)
        }
    }
    const sides = PADDING_SIDES.map((side) => found[side])
    if (sides.every((side) => side !== undefined)) {
        const [top, right, bottom, left] = sides as [string, string, string, string]
        tokens.padding = top === bottom && right === left
            ? (top === right ? top : `${top} ${right}`)
            : `${top} ${right} ${bottom} ${left}`
    }
    return tokens
}

/**
 * THE BRAND MARK'S ENTRY, WHICH IS THE ONE COMPONENT THAT IS NOT A CONTROL.
 *
 * It is here because the format's group is the only place this document can publish a drawing's
 * dimensions in a form a consumer can lay out from, and `/brand/mark.svg` — the thing it should
 * actually fetch — answers "what does it look like" rather than "how big is it and what is the
 * bar". The figures come off `SIZE_LADDER`; nothing is typed. The DRAWING's geometry is not
 * here, because the format's property tokens are a fixed set of colours and dimensions and a
 * viewBox is neither: it goes to `/design_tokens.json`, which has no such schema to violate.
 *
 * `height` and `width` are the LARGEST step of the ladder rather than a chosen size, because the
 * mark has no intrinsic size: it is a square sized by the `font-size` of whatever holds it, and
 * the largest step is the only figure in that list this system has actually drawn it at.
 */
function brandMark(): Record<string, string> {
    const largest = Math.max(...SIZE_LADDER)
    return {
        height: `${largest}px`,
        width: `${largest}px`,
        textColor: "{colors.light-brand-ink}",
        backgroundColor: "{colors.light-progress-track}",
    }
}

/**
 * THE SHARE CARD'S ENTRY, WHICH IS THE ONE COMPONENT THAT IS NOT ON THE SITE.
 *
 * It is a raster artifact posted on somebody else's platform, and it is here for the reason the
 * brand mark is: the format's group is where this document can publish a drawing's dimensions in a
 * form a consumer can lay out from, and a card's box is the whole of what another surface would
 * need to reserve room for one. Both figures come off `src/lib/share-card.ts`'s frame constants;
 * nothing is typed.
 *
 * ITS SIZE IS PINNED RATHER THAN FLOORED, and it is the only thing this system publishes that is.
 * Every control on the site takes its box from the reader's own text size, because a reader can
 * change that; a card is an image at a fixed pixel size on a platform that will scale it however
 * it likes, so there is no reader setting for it to answer to.
 *
 * THE COLOURS ARE THE FIRST THEME'S, matching the `colors` aliases and every other entry here, and
 * for the recorded reason: a reference has to name one theme and the first is what the site serves
 * with no stored preference. The card itself is drawn in whichever theme its caller asks for.
 */
function shareCard(): Record<string, string> {
    return {
        height: `${CARD_PX}px`,
        width: `${CARD_PX}px`,
        padding: `${CARD_PADDING_PX}px`,
        backgroundColor: "{colors.light-background}",
        textColor: "{colors.light-text}",
    }
}

/**
 * A generator over the site's own config with the icon safelist removed. Built ONCE: creating one
 * per component would load presetIcons' collections per call for an answer that cannot differ.
 */
const generator = await createGenerator({...(unoConfig as Record<string, unknown>), safelist: []} as never)

/**
 * EVERY PUBLISHED KIND OF CONTROL, PLUS THE BRAND MARK, AS THE FORMAT'S `components` GROUP.
 *
 * The names are `SHORTCUTS`' own keys minus the bases, so this list cannot fall out of step with
 * the engine: add a seventh kind and it appears here, rename one and the identifier follows.
 * `tests/component-tokens.test.ts` holds it in both directions and against the shipped sheet.
 *
 * THE THEME IS THE FIRST ONE, matching the `colors` aliases, and for the same recorded reason:
 * a reference has to name one theme, and the first is what the site serves with no stored
 * preference. The instruction is about the token, never about that theme.
 */
export const COMPONENT_TOKENS: Readonly<Record<string, Readonly<Record<string, string>>>> =
    await (async () => {
        const names = Object.keys(SHORTCUTS).filter((name) => !isBase(name))
        const {css} = await generator.generate(names.join(" "), {preflights: false})
        const out: Record<string, Record<string, string>> = {}
        for (const name of names) out[name] = componentFrom(css, name, "light")
        out["brand-mark"] = brandMark()
        out["share-card"] = shareCard()
        return out
    })()
