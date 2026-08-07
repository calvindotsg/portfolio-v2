import {readFileSync} from "node:fs";
import postcss, {list, type AtRule, type Container, type Rule as CssRule} from "postcss";

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

/**
 * EVERY BYTE OF CSS A BUILT PAGE LOADS, in cascade order.
 *
 * Use this instead of reaching into `dist/_astro` for a stylesheet. The old idiom,
 * repeated at fifteen call sites, was
 *
 *     readdirSync("dist/_astro").find((f) => f.endsWith(".css"))
 *
 * and it is wrong in two independent ways the moment this site has a second page.
 *
 * WRONG ONE — `find` takes the FIRST match of an unordered directory listing. Vite
 * splits CSS per entry, so with two pages there can be several chunks and the one
 * `find` happens to return is arbitrary. Every rule in the others is invisible, and
 * a test that cannot see a rule reports that the rule does not exist — which for a
 * guard shaped "no rule anywhere may do X" is a silent pass.
 *
 * WRONG TWO, and this is the one that actually fires here — Astro's default
 * `inlineStylesheets: "auto"` moves a small sheet INTO the page as a `<style>`
 * block. Adding one four-line page to this site rebalanced the chunks and pushed
 * 2,889 bytes — the whole layout `<style>`, `body`, and every theme custom property
 * on `:root[data-theme]` — inline, where no call site was looking. Measured: 16 of
 * 176 tests went red across four files, with nothing wrong with the page. Two of
 * them were contrast assertions that could no longer resolve `--text`.
 *
 * So the question a test wants answered is not "what is in dist/_astro" but "what
 * CSS does this page load, in what order", and the page's own `<head>` is the only
 * thing that knows. Links and inline blocks are returned interleaved in document
 * order, so later-wins reasoning over the result stays sound.
 *
 * IT IS PER-PAGE ON PURPOSE. Concatenating every page's CSS would let a rule that
 * only `/patches` loads satisfy an assertion about the home page. Pass the page you
 * mean; the default is the home page because that is what every existing caller
 * meant.
 */
export function pageCss(page = "dist/index.html"): string {
    const html = readFileSync(page, "utf8");
    const parts: string[] = [];
    const re = /<link\b[^>]*>|<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    for (const m of html.matchAll(re)) {
        if (m[0].startsWith("<style")) {
            parts.push(m[1]!);
            continue;
        }
        if (!/rel=["']?stylesheet/i.test(m[0])) continue;
        const href = m[0].match(/href=["']([^"']+)["']/)?.[1];
        if (!href) continue;
        // Root-relative is what Astro emits; anything else is a remote sheet this
        // build has no business shipping, and a caller asserting over the cascade
        // must not be handed a partial answer as if it were the whole one.
        if (!href.startsWith("/")) {
            throw new Error(
                `${page} links a stylesheet this helper cannot read from disk: "${href}". `
                + `Every assertion built on pageCss() would silently lose those rules.`,
            );
        }
        parts.push(readFileSync(`dist${href}`, "utf8"));
    }
    if (parts.length === 0) {
        throw new Error(`${page} loads no CSS at all — pageCss() would hand every caller an empty sheet.`);
    }
    return parts.join("\n");
}

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

/**
 * A SELECTOR LIST SPLIT ON ITS OWN COMMAS, not on every comma it contains.
 *
 * `head.split(",")` was the idiom here, and it is wrong for any class name holding a
 * comma — which is every UnoCSS arbitrary value with more than one argument.
 * `grid-rows-[repeat(8,min-content)]` escapes to `.lg\:grid-rows-\[repeat\(8\,min-content\)\]`
 * and a naive split tears it into `.lg\:grid-rows-\[repeat\(8\` and `min-content\)\]`.
 *
 * Neither fragment is a valid selector, so every guard shaped "no rule anywhere may do
 * X to element Y" either throws — which is how this was found — or, worse, quietly
 * matches nothing and reports that the rule does not exist. That is the silent-pass
 * shape this whole file exists to prevent, and it had been sitting one arbitrary value
 * away the entire time.
 *
 * Commas inside brackets, parens and strings are not separators either; a real selector
 * list can carry all three (`:is(a,b)`, `[title="x,y"]`), and an escape wins over all of
 * them because a backslash makes the next character literal wherever it appears. All four
 * cases are `postcss`'s `list.comma`, which is what `Rule.selectors` itself is built on.
 */
export function splitSelectorList(head: string): string[] {
    return list.comma(head).map((s) => s.trim()).filter(Boolean);
}

/** The at-rule's prelude as written, so a failure message can name the query. */
const preludeOf = (at: AtRule): string => `@${at.name}${at.raws.afterName ?? " "}${at.params}`.trim();

/**
 * EVERY RULE IN A MINIFIED SHEET, AT EVERY AT-RULE DEPTH, in source order.
 *
 * The parsing is `postcss`'s. It was hand-rolled here for as long as the sheet was flat,
 * and every trap that cost this file a revision — escaped commas in a class name, a comma
 * inside a quoted attribute value or an `:is()`, a `@keyframes` step that is not a
 * selector — is a case a CSS parser is required to get right and a brace-counting scanner
 * has to be taught one at a time.
 *
 * A NESTED AT-RULE IS DESCENDED INTO rather than refused. Native CSS nesting survives this
 * project's minifier intact, and the flat scanner could only fold a nested block's braces
 * into the rule's own body text — where `decl()` reads a declaration sitting first inside
 * the block as ABSENT, a repeated property resolves to the OUTER value, and `at` stays
 * "", which makes every "no at-rule may decide this" guard skip the rule entirely.
 * Measured before this file could read nesting: four lines of nested
 * `@media (max-width:40rem){flex-wrap:nowrap}` on the control row shear 266px of control
 * box at 320 wide and the DEFAULT text size, with the whole suite green. Those
 * declarations now arrive as their own Rule, carrying the parent's selectors and the
 * accumulated prelude, so both readings are the browser's.
 *
 * A nested STYLE rule is still refused, because THAT one the model cannot represent: its
 * subject is the descendant `&` names, and a `Rule` here carries a selector list and
 * nothing to relativise it against. Refusing costs nothing today and cannot rot into a
 * silent pass — the same precedent `widthPx` sets for a unit it cannot read.
 */
export function parseRules(css: string): Rule[] {
    const rules: Rule[] = [];

    /** A container's own declarations, under the selectors and at-rules that reach it. */
    const emit = (node: Container, selectors: string[], at: string[]) => {
        const decls = (node.nodes ?? []).filter((n) => n.type === "decl");
        rules.push({
            selectors,
            body: decls.map((d) => d.toString()).join(";"),
            nested: at.length > 0,
            at: at.join(" "),
        });
    };

    const descend = (node: Container, selectors: string[] | null, at: string[]) => {
        if (selectors) emit(node, selectors, at);
        for (const child of node.nodes ?? []) {
            if (child.type === "rule") {
                if (selectors) {
                    throw new Error(
                        `nested style rule "${(child as CssRule).selector}" inside "${selectors.join(", ")}" — `
                        + `a Rule here is a selector list with nothing to relativise a nested one against, so `
                        + `its declarations would be attributed to the wrong elements, silently and green. `
                        + `Flatten it in the source, or teach parseRules to resolve "&".`,
                    );
                }
                descend(child as CssRule, (child as CssRule).selectors, at);
            } else if (child.type === "atrule" && (child as AtRule).nodes) {
                descend(child as AtRule, selectors, [...at, preludeOf(child as AtRule)]);
            }
        }
    };

    descend(postcss.parse(css), null, []);
    return rules;
}

/** One declaration's value out of a rule body, or undefined. */
export function decl(body: string, prop: string): string | undefined {
    return body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))?.[1]?.trim();
}

/**
 * THE EFFECTIVE VALUE OF A PROPERTY IN ONE RULE BODY — the LAST occurrence, which is what the
 * cascade resolves to within a single declaration block.
 *
 * {@link decl} returns the FIRST, and that is right for its callers: they mostly assert a
 * property is ABSENT, or read a body they wrote themselves. It is wrong wherever you are proving
 * a value is what SHIPS, because **the minifier merges two rules with the same selector and
 * prelude into one body**. Two `@container` arms that both name `.bib-ledger-unit` arrive as
 * `{display:revert;display:none}` — `decl` reads `revert`, the browser paints `none`, and a gate
 * built on `decl` passes a page whose unit has vanished. Measured on this repo: 465 tests green
 * while both carriers of the ledger's unit were hidden at the 200% text size the arm exists for.
 *
 * Use this for any assertion whose meaning is "the value the reader gets". This file already
 * records the same class for `grid-template` beating the longhand it read.
 */
export function lastDecl(body: string, prop: string): string | undefined {
    const all = [...body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "g"))];
    return all.at(-1)?.[1]?.trim();
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
 * EVERY SPELLING OF A ROW TRACK LIST, because two of the three are shorthands and a
 * guard that reads only the longhand cannot see them.
 *
 * `grid-template` and `grid` both RESET `grid-template-rows`, so either one overrides
 * a longhand a guard did read — inside the same rule after minification, or from a
 * later rule at the same specificity. This is not hypothetical on this repo:
 * `control-geometry.test.ts` records the identical hole (`grid-template` beating the
 * longhand it read) as one of four that defeated its predecessor with the suite green.
 *
 * Listed longhand-first only for readability; every caller must screen ALL of them
 * rather than take the first that is present, or the other spelling walks through.
 */
export const ROW_TEMPLATE_PROPS = ["grid-template-rows", "grid-template", "grid"] as const;

/**
 * The ROWS half of whatever spelling was read. The shorthands are `<rows> / <columns>`,
 * and the columns half must not be screened: this page's columns are legitimately
 * `repeat(4, minmax(0, 1fr))`, so charging a shorthand's whole value for containing
 * `fr` reds a clean build.
 */
export function rowTracks(prop: string, value: string): string {
    return prop === "grid-template-rows" ? value.trim() : value.split("/")[0]!.trim();
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
 * DOES THIS SELECTOR ONLY MATCH WHILE THE READER IS DOING SOMETHING?
 *
 * A gate that accepts a stateful rule as proof of a permanent affordance certifies the
 * defect it was written for — the chip gate in build-output.test.ts records that at length,
 * and the note there ends "a gate that accepts one is worse than no gate".
 *
 * IT IS STRUCTURAL RATHER THAN A LIST OF PSEUDO-CLASSES, and that is the whole point. The
 * list form was `/:hover|:focus|:active|:visited|:target|\[aria-current/` and it was correct
 * for exactly the states that existed when it was written. Adding a held-press state spelled
 * `[data-leaving]` walked straight through it: an attribute is not a pseudo-class, so the
 * held rule read as UNCONDITIONAL and satisfied the chip gate all by itself. Verified — with
 * the chips' permanent border deleted the wall shipped borderless prose on all three pages
 * and the suite stayed green at 290/290. The list would have needed one more alternation, and
 * so would the state after that.
 *
 * So the question is inverted: a selector is unconditional only if everything in it is
 * STRUCTURE — element names, classes, ids and combinators. Anything else (a pseudo-class, an
 * attribute, a pseudo-element) makes it conditional, and a new state cannot be invented that
 * this does not already cover.
 *
 * `[data-astro-cid-…]` is the one attribute that is not a state: Astro's scoping is how a
 * component's rule finds its own elements, and it is present on every scoped rule whether the
 * reader is touching anything or not. It is stripped before the question is asked.
 *
 * Three call sites, which used to hold two different alternation lists between them —
 * build-output.test.ts's chip gate and rendered-html.test.ts's two affordance walks.
 */
export function isStateful(selector: string): boolean {
    const scopeless = selector.replace(/\[data-astro-cid-[\w-]+(?:=(?:"[^"]*"|'[^']*'|[\w-]+))?\]/g, "");
    const token = String.raw`(?:[a-zA-Z][\w-]*|\*|[.#](?:\\.|[\w-])+)+`;
    const structural = new RegExp(String.raw`^\s*${token}(?:\s*[>+~]\s*|\s+)?(?:${token}(?:\s*[>+~]\s*|\s+)?)*$`);
    return !structural.test(scopeless.trim());
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
        // WITHIN ONE BODY THE LAST DECLARATION WINS, so the competing props must be visited
        // in the order the body declares them and NOT in the order the caller listed them.
        // Iterating `wanted` directly made array position the tie-break, which contradicts
        // this function's own docstring and is exploitable: a shorthand and a longhand in the
        // same rule that the minifier cannot fold (a `var()` in the shorthand defeats it)
        // resolved to whichever the caller happened to name first.
        const declaredAt = (p: string) => rule.body.search(new RegExp(`(?:^|;)\\s*${p}\\s*:`));
        const competing = wanted.filter((p) => declaredAt(p) >= 0).sort((a, b) => declaredAt(a) - declaredAt(b));
        for (const prop of competing) {
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
