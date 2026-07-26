/**
 * Reading the BUILT stylesheet as data.
 *
 * Extracted from `control-geometry.test.ts`, which needed all of this to state an
 * invariant over the cascade rather than over a single rule — and got it wrong the
 * first time in ways that are easy to repeat. Anything asserting "no rule anywhere
 * may do X to element Y" needs the same four pieces, so they live here once:
 *
 *   parseRules          every rule, WITH its at-rule depth and prelude
 *   decl                one declaration out of a rule body
 *   px                  a length as a number, or null if it isn't absolute
 *   structuralSelector  a selector reduced to what decides which elements it hits
 *
 * The two traps these exist to avoid, both of which produced a test that could not
 * fail:
 *
 * 1. Filtering out nested rules. A rule inside `@media` is a real rule; skipping
 *    them let `md:w-max md:px-5` reproduce a defect above 768px with the suite
 *    green. `parseRules` keeps the prelude so a failure message can name the query.
 *
 * 2. Stripping pseudos with a regex. The preflight ships
 *    `[hidden]:where(:not([hidden=until-found]))`; a non-nesting strip leaves an
 *    unbalanced `)` and the selector engine throws, which invites a `try/catch`
 *    that swallows exactly the rules a guard most needs to see.
 */

export type Rule = {
    /** Comma-separated selectors, split and trimmed. */
    selectors: string[],
    /** Declarations between the braces, as text. */
    body: string,
    /** True when the rule sits inside at least one at-rule. */
    nested: boolean,
    /** The enclosing at-rule preludes, joined — "" at top level. */
    at: string,
};

/** Every rule in a minified sheet, at every at-rule depth. */
export function parseRules(css: string): Rule[] {
    const rules: Rule[] = [];
    let i = 0, prelude = "";
    const atStack: string[] = [];
    while (i < css.length) {
        const ch = css[i];
        if (ch === "{") {
            const head = prelude.trim();
            prelude = "";
            if (head.startsWith("@")) {
                atStack.push(head);
                i++;
                continue;
            }
            let depth = 1, j = i + 1;
            while (j < css.length && depth > 0) {
                if (css[j] === "{") depth++;
                else if (css[j] === "}") depth--;
                j++;
            }
            rules.push({
                selectors: head.split(",").map((s) => s.trim()).filter(Boolean),
                body: css.slice(i + 1, j - 1),
                nested: atStack.length > 0,
                at: atStack.join(" "),
            });
            i = j;
            continue;
        }
        if (ch === "}") {
            atStack.pop();
            prelude = "";
            i++;
            continue;
        }
        prelude += ch;
        i++;
    }
    return rules;
}

/** One declaration's value out of a rule body, or undefined. */
export function decl(body: string, prop: string): string | undefined {
    return body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))?.[1]?.trim();
}

/**
 * A length in px, or null when it is not an absolute length. Returning null for
 * `max-content`, `100vh` or `auto` is the point: callers assert on it, so a
 * content-sized or viewport-relative value can never be mistaken for a number.
 */
export function px(value: string | undefined): number | null {
    if (!value) return null;
    const m = value.match(/^(-?[\d.]+)(px|rem)$/);
    if (!m) return null;
    return parseFloat(m[1]) * (m[2] === "rem" ? 16 : 1);
}

/**
 * A selector reduced to what decides WHICH elements it can reach: state and
 * pseudo-element parts removed, so `.control:hover` and `.control` share a
 * subject. Paren-balanced, for the preflight selector above. A compound that was
 * nothing BUT a pseudo becomes `*` — `.space-y-1>:not([hidden])~:not([hidden])`
 * has to reduce to `.space-y-1>*~*`, not to a dangling pair of combinators. An
 * escaped `\:` inside a UnoCSS variant token is part of the class name and must
 * survive.
 */
export function structuralSelector(selector: string): string {
    let out = "";
    for (let i = 0; i < selector.length;) {
        const ch = selector[i];
        if (ch === "\\") {
            out += selector.slice(i, i + 2);
            i += 2;
            continue;
        }
        if (ch === ":") {
            i++;
            if (selector[i] === ":") i++;
            while (i < selector.length && /[\w-]/.test(selector[i])) i++;
            if (selector[i] === "(") {
                let depth = 0;
                do {
                    if (selector[i] === "(") depth++;
                    else if (selector[i] === ")") depth--;
                    i++;
                } while (i < selector.length && depth > 0);
            }
            continue;
        }
        out += ch;
        i++;
    }
    return out.replace(/(^|[>+~]\s*)(?=[>+~]|$)/g, "$1*").trim();
}

/**
 * The lower width bound of a rule's enclosing media queries in px, or null when
 * it is not width-gated. Used to assert that a declaration only takes effect at
 * or above a given breakpoint — the difference between the page's single-screen
 * contract applying from 1024px and applying from 768px, which is a defect.
 *
 * BOTH spellings are matched deliberately. This project's minifier emits the
 * modern range form, `@media (width>=768px)`; a regex for `min-width:` alone
 * returns null for every rule in the sheet, which silently turns every assertion
 * built on this into a no-op. Authored UnoCSS output and hand-written media
 * queries elsewhere still use the legacy form, so neither can be dropped.
 */
export function minWidthOf(rule: Rule): number | null {
    const widths = [
        ...rule.at.matchAll(/min-width:\s*([\d.]+)px/g),
        ...rule.at.matchAll(/width\s*>=\s*([\d.]+)px/g),
    ].map((m) => parseFloat(m[1]));
    return widths.length ? Math.max(...widths) : null;
}

/**
 * True when the rule can take effect at any viewport narrower than `width`.
 *
 * This replaced an `isMaxWidthGated` predicate that asked whether a rule carried
 * *any* `max-width` condition and excluded it if so. That was the wrong question
 * and it left a hole big enough to drive the original defect back through: UnoCSS
 * compiles a range variant to NESTED queries, so a lock scoped to exactly the
 * medium range emits
 *
 *     @media (width<=1023.9px){@media (width>=768px){ … height:100vh }}
 *
 * which the old predicate saw as "max-width gated, cannot matter" and skipped
 * entirely. Measured consequence on `<main>`: 37 overflowing elements and
 * 102.45px sheared off the intro card's second row of controls at 768x900, with
 * the whole suite green.
 *
 * Only the LOWER bound decides this, which is why no `max-width` is consulted. A
 * rule whose lower bound is below `width` applies somewhere below it, whatever
 * upper bound it also carries; a rule whose lower bound is at or above `width`
 * cannot. An ungated rule has a lower bound of 0 and so always qualifies.
 */
export function appliesBelow(rule: Rule, width: number): boolean {
    return (minWidthOf(rule) ?? 0) < width;
}

/**
 * True for the steps inside a `@keyframes` block. `parseRules` reports these like
 * any other rule, but their "selectors" are offsets (`from`, `to`, `100%`), and
 * handing one to a selector engine throws `Unmatched selector: %`. Any walker that
 * matches rules against real elements has to skip them — and must skip them
 * explicitly rather than by swallowing the throw, which would also hide the
 * genuinely unparseable selectors it needs to see.
 */
export function isKeyframeStep(rule: Rule): boolean {
    return /@(-\w+-)?keyframes\b/.test(rule.at);
}
