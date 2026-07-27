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

/** The root font-size every width bound below is normalised to. */
export const ROOT_PX = 16;

/**
 * A media-query width bound as a number of CSS pixels at a 16px root.
 *
 * `em` and `rem` are the SAME length in a media query: both resolve against the
 * initial font-size — the reader's own default — and never against any element,
 * which is the whole reason a `rem` breakpoint moves under text-only zoom while a
 * `rem` LENGTH set by an author does not.
 *
 * An unrecognised unit THROWS rather than returning null. That direction is
 * load-bearing: every predicate below feeds an assertion, and a null bound reads
 * as "not width-gated", which silently converts the assertion into a no-op that
 * passes. This file's own history is the argument — see `minWidthOf` — and the
 * unit is the second way in: when the breakpoints moved from px to rem, a
 * px-only regex made every lg-gated rule in the sheet look unconditional.
 */
function widthPx(num: string, unit: string): number {
    if (unit === "px") return parseFloat(num);
    if (unit === "rem" || unit === "em") return parseFloat(num) * ROOT_PX;
    throw new Error(
        `unreadable unit in a media-query width bound: "${num}${unit}". Teach ` +
        `widthPx() about it — a bound this file cannot parse disables every ` +
        `assertion that reads it, silently and green.`,
    );
}

const LOWER = [/min-width:\s*(-?[\d.]+)([a-z%]*)/g, /width\s*>=\s*(-?[\d.]+)([a-z%]*)/g];
const UPPER = [/max-width:\s*(-?[\d.]+)([a-z%]*)/g, /width\s*<=\s*(-?[\d.]+)([a-z%]*)/g];

const bounds = (at: string, patterns: RegExp[]): number[] =>
    patterns.flatMap((re) => [...at.matchAll(re)].map((m) => widthPx(m[1], m[2])));

/**
 * Every width condition in a whole sheet, as `{value, unit}` pairs. Exported so a
 * test can assert what the breakpoints are SPELLED in, which is the property this
 * page's text-zoom behaviour actually rests on — a single px bound left among rem
 * ones parts company with its variant siblings the moment a reader enlarges the
 * text, and nothing else in the suite would notice.
 */
export function widthConditions(css: string): {value: number, unit: string, at: string}[] {
    const out: {value: number, unit: string, at: string}[] = [];
    // Only at-rule PRELUDES. Scanning the whole sheet also matches the `max-width`
    // and `min-width` DECLARATIONS in it — `.max-w-6xl` alone would contribute a
    // spurious "72rem condition" — which would make this read as three more
    // breakpoints than the page has.
    for (const at of css.matchAll(/@(?:media|container)[^{]*/g)) {
        for (const re of [...LOWER, ...UPPER]) {
            for (const m of at[0].matchAll(new RegExp(re.source, "g"))) {
                out.push({value: parseFloat(m[1]), unit: m[2], at: at[0].trim()});
            }
        }
    }
    return out;
}

/**
 * The lower width bound of a rule's enclosing media queries in CSS pixels at a
 * 16px root, or null when it is not width-gated. Used to assert that a
 * declaration only takes effect at or above a given breakpoint — the difference
 * between the page's single-screen contract applying from 1024px and applying
 * from 768px, which is a defect.
 *
 * BOTH spellings are matched deliberately. This project's minifier emits the
 * modern range form, `@media (width>=48rem)`; a regex for `min-width:` alone
 * returns null for every rule in the sheet, which silently turns every assertion
 * built on this into a no-op. Authored UnoCSS output and hand-written media
 * queries elsewhere still use the legacy form, so neither can be dropped.
 */
export function minWidthOf(rule: Rule): number | null {
    const widths = bounds(rule.at, LOWER);
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
 * The UPPER width bound of a rule's enclosing media queries in px, or Infinity
 * when it has none. Both spellings, for the reason `minWidthOf` gives.
 *
 * The asymmetry with `minWidthOf` — Infinity here, `null` there — is deliberate.
 * `minWidthOf`'s callers ask "is this rule width-gated AT ALL", and need a value
 * they can distinguish from a real bound to assert on. The only question asked of
 * an upper bound is "does this rule still reach that width", where Infinity is the
 * right identity and a `null` would just be `?? Infinity` at every call site.
 */
export function maxWidthOf(rule: Rule): number {
    const widths = bounds(rule.at, UPPER);
    return widths.length ? Math.min(...widths) : Infinity;
}

/**
 * True when the rule can take effect at EXACTLY `width`.
 *
 * `appliesBelow` above answers a different question — "could this rule bite
 * anywhere under this breakpoint" — and consults only the lower bound, which is
 * correct for a rule that must not exist below lg and wrong for anything asserting
 * what a page actually does at a stated viewport. Both bounds are read here
 * because UnoCSS compiles a range variant to NESTED queries: `lt-lg:` emits
 * `@media (width<=1023.9px)`, so a declaration gated to below lg is invisible to a
 * lower-bound-only reading (its lower bound is 0) yet decides the layout at every
 * width the defect lives at.
 */
export function appliesAt(rule: Rule, width: number): boolean {
    return (minWidthOf(rule) ?? 0) <= width && maxWidthOf(rule) >= width;
}

/**
 * The declaration that WINS for `props` on a set of already-matched rules at a
 * given viewport width — the last one declared among the rules that apply there.
 *
 * This exists to stop `.some()`. "Does SOME rule declare the value I want" is not
 * "is that the value": a second utility beside the first leaves the first rule in
 * the sheet, so a `some()` check stays green while the later rule overrides it.
 * Measured with that second utility actually added to a card: the clipping one
 * emits at byte 18677 of the sheet and its opposite at 18710, so the opposite
 * wins. Pair that with a missing width filter and one class name gates the whole
 * invariant out of existence at the widths it was written for, suite green.
 *
 * `props` may be a LIST, in which case they compete as one: pass
 * `["overflow", "overflow-x"]` and the winner is whichever of the shorthand or the
 * longhand was declared last, which is what decides that axis. Checking a
 * shorthand alone lets a longhand override slip past.
 *
 * The rule is returned alongside the value, not just the value: a guard that
 * cannot name the declaration that beat it leaves the reader grepping minified
 * CSS. `!important` is honoured; specificity is NOT resolved, only sheet order,
 * which is sound only while every rule reaching the element is a single-class
 * utility. That is a precondition callers must assert rather than assume — see
 * the single-class tripwire in page-fit.test.ts.
 */
export function effectiveDecl(
    rules: Rule[],
    props: string | string[],
    width: number,
): {prop: string, value: string, rule: Rule} | null {
    const wanted = typeof props === "string" ? [props] : props;
    let winner: {prop: string, value: string, rule: Rule} | null = null;
    let winnerImportant = false;
    for (const rule of rules) {
        if (!appliesAt(rule, width)) continue;
        for (const prop of wanted) {
            const raw = decl(rule.body, prop);
            if (raw === undefined) continue;
            const important = /!\s*important$/i.test(raw);
            if (winnerImportant && !important) continue;
            winner = {prop, value: raw.replace(/!\s*important$/i, "").trim(), rule};
            winnerImportant = important;
        }
    }
    return winner;
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
