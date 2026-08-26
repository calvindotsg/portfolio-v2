import {CONTROLS, DESIGN_PAGE, OMISSIONS, SECTIONS, THEMING, TOKEN_ROLES} from "../content/design"
import {ICON_IDS, iconClass} from "./icons"
import {PALETTE, valueIn} from "./palette"

/**
 * THE DESIGN SYSTEM AS MARKDOWN, RENDERED TWICE FOR TWO READERS THAT CANNOT SHARE A DOCUMENT.
 *
 * `src/content/design.ts` is the one authored description of this system and `/design` is one
 * rendering of it. This is the other two, and they exist because the readers `/design` does not
 * serve are the ones that do not read HTML: a coding agent with this checkout open, and a design
 * agent that has never seen it.
 *
 * ONE FUNCTION WITH AN AUDIENCE, NOT TWO FUNCTIONS. The moment two of these produce design prose
 * they will disagree, and the disagreement will be invisible — both would still render, both
 * would still match their own committed copy. Add an audience here rather than a second renderer.
 *
 *   "full"   the whole spec. `DESIGN.md` at the repository root and `/design.md` on the web are
 *            the SAME BYTES of this rendering: one is committed and gated by a file snapshot,
 *            the other is served by a route. It may point at paths in this tree, because both
 *            of its readers can open them.
 *
 *   "agent"  `.design-sync/conventions.md`, which is prepended to a generated README and inlined
 *            into the SYSTEM PROMPT of a design agent that gets that README and the bound
 *            artifacts and nothing else. It cannot open this repository, so it may not be sent
 *            to a path in it; and it is spending someone's context window, so it is held to a
 *            budget by `tests/design-system.test.ts` rather than trusted to stay short.
 *
 * WHAT EACH AUDIENCE DROPS IS THE ONLY REAL DECISION IN THIS FILE, AND IT WAS ARITHMETIC BEFORE
 * IT WAS JUDGEMENT. Measured, before a word of this document's own was written: the module's own
 * strings — both theme lines, every token role, every control role and both guidance lists —
 * already overrun the agent's budget on their own. "Carry everything" was never on the table, so
 * what follows is what was kept and why, and a future run can disagree with the reason rather
 * than re-derive it. Re-measure rather than trusting that sentence; every input to it can move.
 *
 *   THE AGENT KEEPS THE DON'TS AND DROPS THE DOS. A don't names an output that looks right and
 *   is wrong — reaching for the brand ink to draw something interactive, assuming dark is light
 *   inverted — which is the one thing no table of tokens can imply. A do largely restates what
 *   the token table and the class list beside it already say. Both survive in full in the "full"
 *   rendering, so nothing is lost from the repository; what is being rationed is a system
 *   prompt.
 *
 *   THE AGENT DROPS THE SECTION LEDES AND THE MARK INVENTORY. The ledes are written for a person
 *   reading a page; the mark classes are in the stylesheet that agent is handed, which the closed
 *   set section sends it to. An inventory a reader can enumerate for itself is the most expensive
 *   kind of sentence to inline, and only its SIZE survives here.
 *
 *   WHAT THAT COST, NAMED RATHER THAN GLOSSED. Every dropped do but one is carried by a don't
 *   that says the same thing from the other side, or by the token table. The exception is the
 *   instruction to give an icon-only control an accessible name, which no don't twins and which
 *   the agent rendering therefore no longer carries. That is the price of the budget, and it is
 *   recorded in `.design-sync/NOTES.md` so that a future run with more room re-adds it knowingly.
 *
 *   AND IT DROPS THE TYPE SECTION AND THE MARKS GUARDRAILS, which the chip's two entries paid
 *   for. Publishing a fourth kind of control put two more roles into the one list this audience
 *   carries whole, and the arithmetic was settled before a word was written: 4537 characters
 *   against a 4096 budget. The two drops are measured at 242 and 251 characters and land the
 *   document back on the headroom it had before the chip existed — which is the point, because
 *   a budget spent down to nothing reddens on the next token role somebody adds.
 *
 *   WHICH TWO, AND WHY THOSE. Both were chosen on how much of the claim survives elsewhere in
 *   the same document rather than on what was easiest to cut. Type: "no decorative or display
 *   face" and "no intermediate step" both restate the closed set declared two sections above,
 *   and "don't pin a height in pixels" is twinned almost verbatim by the controls don't that
 *   remains. Marks: "don't mix another icon family in" is the closed set again, and "don't
 *   recolour a brand mark away from what its surface needs" is the positive form of the
 *   `--sport-*-on-ink` roles the token table still carries in full.
 *
 *   THE ONE GENUINE LOSS IS THE EMOJI INSTRUCTION — "don't substitute an emoji for a mark that
 *   is not in the set" — which nothing else here twins, and which joins the accessible-name
 *   instruction above as the second thing to re-add if a future run finds room. Both are named
 *   in `.design-sync/NOTES.md` in that order.
 *
 *   THE STANDALONE `control-surface` WARNING WENT WITH IT, and that one is a strict improvement
 *   rather than a cost. It was a sentence authored here naming one class; the module's own
 *   controls don't now names BOTH surfaces and says the same thing, so the claim survives wider
 *   than it was. `tests/design-system.test.ts` reads that don't and holds every surface it names
 *   against the shipped sheet — do not restore a hand-written line here in front of it.
 *
 * TWO PASSAGES ARE AUTHORED HERE RATHER THAN IN THE MODULE, and this is the rule for which ones:
 * the module holds what is true of the site AND of the exported bundle, and an audience's own
 * framing belongs with the rendering for that audience. The empty component namespace and the
 * closed stylesheet are facts about the BUNDLE and false of the site — a utility engine really is
 * running here — so putting them in `src/content/design.ts` would put a sentence on `/design`
 * that is false of the page a reader is looking at. The full rendering's own Overview is the
 * same rule for the other audience: it addresses a reader holding a checkout, which `/design`'s
 * lede does not, because that lede is about the page you are looking at.
 *
 * NOTHING HERE MAY STATE A VALUE OR A COUNT IT DOES NOT DERIVE. Every figure below is computed
 * from the census in `src/lib/icons.ts` at render time, which is safe in a way the same figure
 * typed into a markdown file was not: the snapshots fail the moment the census moves, so a stale
 * count cannot be committed.
 *
 * THE FULL RENDERING FOLLOWS THE DESIGN.md FORMAT, which is an open convention for exactly this
 * document and is what makes the file legible to tooling that globs for it by name. Two things
 * that format asks for are done deliberately here: an `Overview` before anything else, and a
 * front matter block that uses the format's own `omitted` key to say which typed token groups
 * this system leaves out and why, beside the `colors` group it publishes — see `OMISSIONS` for
 * why each remaining group is a decision. The agent rendering carries no front matter
 * at all: it is prepended to a README, where a second document's metadata block is noise.
 */

/** `full` may point into this tree; `agent` may not, because its reader has no copy of it. */
export type DocAudience = "full" | "agent"

/**
 * WHICH OF THIS SITE'S TOKENS PLAY THE FORMAT'S SEMANTIC COLOUR ROLES.
 *
 * AUTHORED HERE RATHER THAN IN `src/content/design.ts`, by that module's own rule: it holds what
 * is true of the site AND of the exported bundle, and this pair is true of neither — it is a fact
 * about the front matter of ONE rendering, in a vocabulary (`primary`, `neutral`) that belongs to
 * the DESIGN.md format rather than to this design system. `/design` never says it and the agent's
 * document has no front matter to say it in.
 *
 * WHY THESE TWO TOKENS. `primary` is the format's required role and its linter warns without one,
 * saying the agent will otherwise auto-generate key colours; the interactive affordance is the
 * nearest thing this palette has to a driver colour, and it is what a reader would reach for
 * first. `neutral` is the page ground, which is what the format's own example uses that role for.
 * Nothing else here maps: there is no secondary or tertiary palette to claim.
 */
const PALETTE_ALIASES: readonly (readonly [string, string])[] = [
    ["primary", "--accent"],
    ["neutral", "--background"],
]

const bullets = (lines: readonly string[]) => lines.map((line) => `- ${line}`).join("\n")

const listing = (label: string, lines: readonly string[]) => [`${label}:`, "", bullets(lines)].join("\n")

/** Every mark the build ships, deduplicated — `ICON_IDS` is a census and keeps its duplicates. */
const marks = () => [...new Set(ICON_IDS.map(iconClass))].sort()

/**
 * A YAML folded scalar, wrapped so the block reads as prose rather than as one very long line.
 * Folding joins the lines back with spaces, so the wrap width is presentation and nothing else —
 * but the indent is not: a line indented further than the first would be taken literally.
 */
function folded(text: string, indent: string, width = 84): string {
    const words = text.split(" ")
    const lines: string[] = []
    let line = ""
    for (const word of words) {
        if (line && `${line} ${word}`.length > width) {
            lines.push(line)
            line = word
        } else {
            line = line ? `${line} ${word}` : word
        }
    }
    if (line) lines.push(line)
    return lines.map((l) => `${indent}${l}`).join("\n")
}

/**
 * The front matter, in the DESIGN.md format's own schema. No token group is present, so every
 * one of them is declared omitted with its reason — which is what that key is for, and is the
 * difference between a document that looks unfinished and one that says what it is doing.
 *
 * NO `version` KEY. The format's is a moving value owned by somebody else, and a claim about
 * which revision this file conforms to is exactly the kind of sentence this repository refuses
 * to write down: nothing here could keep it true.
 */
function frontMatter(): string {
    return [
        "---",
        `name: "${DESIGN_PAGE.heading}"`,
        `description: "${DESIGN_PAGE.description}"`,
        ...colorTokens(),
        "omitted:",
        ...OMISSIONS.flatMap(({section, reason}) => [
            `  - section: ${section}`,
            "    reason: >-",
            folded(reason, "      "),
        ]),
        "---",
    ].join("\n")
}

/**
 * THE `colors` GROUP, IN THE FORMAT'S OWN SCHEMA — a flat `<token-name>: <Color>` map.
 *
 * THIS GROUP USED TO BE DECLARED OMITTED, AND THE STATED REASON WAS FALSE. It said one name to
 * one value cannot say that a token has two, one per theme, several of them trading places. The
 * premise sounds right and the format does not impose it: its own words are that "the exact
 * mapping from color palettes to color tokens may follow any consistent naming convention", so a
 * theme prefix IS such a convention and a two-theme palette is expressible. Measured with
 * `@google/design.md` v0.4.0 — a thirty-token map named this way lints at zero errors and zero
 * warnings once a `primary` exists, and `export --format css-vars` emits one custom property per
 * token. Declaring the group omitted cost the format's whole toolchain: Tailwind themes, W3C
 * design tokens and CSS custom properties, all generable from values and none from prose.
 *
 * THE NAMES ARE DERIVED, NOT WRITTEN. The prefix is one string and the rest is `PALETTE`; the
 * leading `--` is stripped because a YAML key beginning with a dash is not what the format's
 * `<token-name>` means. Which themes exist comes off `THEMING.themes`, the list gated against the
 * stylesheet's own selectors.
 *
 * THE TWO ALIASES ARE THE FORMAT'S `{colors.x}` REFERENCE SYNTAX, so neither repeats a hex. They
 * exist because the linter warns when colours are defined and no `primary` is: without one "the
 * agent will auto-generate key colors", which is control over the palette given away for a line.
 * THEY POINT AT THE FIRST THEME, AND THAT IS A DECISION RATHER THAN AN ACCIDENT — it is what the
 * site serves with no stored preference, which `THEMING.themes` states in as many words and
 * `THEMING.lede` repeats for a reader.
 */
function colorTokens(): string[] {
    const key = (theme: string, token: string) => `${theme}-${token.replace(/^--/, "")}`
    const first = THEMING.themes[0]!
    const alias = ([role, token]: readonly [string, string]) => {
        if (!PALETTE.some((t) => t.token === token)) {
            throw new Error(
                `src/lib/design-doc.ts points the ${role} alias at ${token}, which the stylesheet `
                + "no longer defines. A reference to a key that is not there is a broken-ref error "
                + "in the DESIGN.md format — pick a token that exists.",
            )
        }
        return `  ${role}: "{colors.${key(first, token)}}"`
    }
    return [
        "colors:",
        ...PALETTE_ALIASES.map(alias),
        ...THEMING.themes.flatMap((theme) =>
            PALETTE.map((values) => `  ${key(theme, values.token)}: "${valueIn(values, theme)}"`)),
    ]
}

/**
 * The precondition every other sentence depends on, and the one thing about this system that
 * produces an unstyled page rather than a wrong-looking one.
 *
 * BOTH VALUES, WHERE THE PAGE SHOWS ONE. `/design` reveals whichever line matches the reader's
 * live theme, which is a demonstration only a rendered page can make; a document has no theme
 * and no toggle, so the legal set has to be stated outright or it is guessable from nothing.
 */
const themingBlock = () => [
    `## ${THEMING.heading}`,
    "",
    THEMING.lede,
    "",
    ...THEMING.themes.map((theme) => `    ${THEMING.example.replace("{theme}", theme)}`),
].join("\n")

/**
 * THE TOKEN TABLE, AND THE ONE PLACE THE TWO AUDIENCES DRAW A DIFFERENT SHAPE.
 *
 * The full rendering carries each token's two values beside its role, read out of the theme
 * blocks by `src/lib/palette.ts`. The agent's carries the roles alone, and THAT IS A MEASURED
 * DECISION RATHER THAN AN OMISSION — measured before the change: that document stood at 3,859
 * characters against the 4,096 budget `tests/design-system.test.ts` asserts, so 237 spare, and
 * two value columns over the current token list cost about 384. They do not fit. Re-measure the
 * spare rather than reading it here; it has already moved once, and `.design-sync/NOTES.md`
 * records what moved it.
 *
 * THEY ALSO SHOULD NOT. That audience is handed the bundle's own stylesheet, and the closed-set
 * section a few lines down tells it so in as many words: the sheet "restates both themes' tokens
 * above its rules". Spending a system prompt on a table its reader can read out of an artifact it
 * is already holding is the most expensive duplication available. `tests/palette.test.ts` holds
 * this in BOTH directions so the decision cannot quietly reverse itself.
 *
 * AN AUDIENCE PARAMETER RATHER THAN A SECOND FUNCTION, which is this file's own rule stated at
 * the top: two functions producing design prose will disagree, and the disagreement is invisible
 * because each still matches its own committed copy.
 */
const tokenTable = (audience: DocAudience) => {
    if (audience === "agent") {
        return [
            "| Token | Role |",
            "|---|---|",
            ...TOKEN_ROLES.map(({token, role}) => `| \`${token}\` | ${role} |`),
        ].join("\n")
    }
    // THE COLUMNS COME OFF `THEMING.themes`, which is the list gated against the stylesheet's own
    // `:root[data-theme=…]` blocks in both directions — so a theme is named once in this
    // repository and this table follows it. `valueIn` throws on a name it cannot read, which
    // makes a third theme a failed build rather than a table with a column of blanks.
    const value = (token: string, theme: string) => {
        const values = PALETTE.find((t) => t.token === token)
        if (!values) {
            throw new Error(
                `src/content/design.ts gives ${token} a role and src/lib/palette.ts read no value `
                + "for it, so this table would publish a blank cell.",
            )
        }
        return `\`${valueIn(values, theme)}\``
    }
    const column = (theme: string) => `${theme.charAt(0).toUpperCase()}${theme.slice(1)}`
    return [
        `| Token | ${THEMING.themes.map(column).join(" | ")} | Role |`,
        `|${"---|".repeat(THEMING.themes.length + 2)}`,
        ...TOKEN_ROLES.map(({token, role}) =>
            `| \`${token}\` | ${THEMING.themes.map((t) => value(token, t)).join(" | ")} | ${role} |`),
    ].join("\n")
}

const controlList = () => CONTROLS.map(({name, role}) => `- **\`${name}\`** — ${role}`).join("\n")

/**
 * The marks, grouped by the family their class prefix names. THE GROUPING IS STRUCTURE RATHER
 * THAN A VALUE, and it is the one thing here that a third icon family would silently break:
 * a mark belonging to neither prefix would be counted in the total and listed under nothing.
 * `tests/design-system.test.ts` holds the census against the built stylesheet, which catches a
 * mark that has no rule — not a mark this reader cannot see. Look here when a family is added.
 */
function markInventory(): string {
    const all = marks()
    const family = (prefix: string) => all.filter((m) => m.startsWith(prefix))
    const remix = family("i-ri-"), brands = family("i-fa6-brands-")
    return [
        `These ${all.length} ship and no others. Remix Icon (${remix.length}):`,
        "",
        `${remix.map((m) => `\`${m}\``).join(", ")}.`,
        "",
        `Brand marks (${brands.length}):`,
        "",
        `${brands.map((m) => `\`${m}\``).join(", ")}.`,
    ].join("\n")
}

/**
 * THE BLOCK A SECTION CARRIES BETWEEN ITS LEDE AND ITS GUIDANCE, KEYED BY SECTION.
 *
 * A LOOKUP RATHER THAN A CHAIN OF CONDITIONALS, so adding one is adding an entry — and a section
 * with no entry renders its heading, its lede and its guidance and nothing else, which is the
 * right default and is the shape `src/pages/design.astro` already has, where each of these is a
 * per-key block beside a loop over the same list.
 */
const SECTION_BLOCKS: Partial<Record<keyof typeof SECTIONS, () => string>> = {
    palette: () => tokenTable("full"),
    controls: controlList,
    icons: markInventory,
}

/**
 * WHICH SECTIONS THE AGENT RENDERING CARRIES, AND THE RECORDED REASON FOR EVERY ONE IT DROPS.
 *
 * The subset used to be whichever lines somebody happened to write, which was the last way a
 * section could go missing from a document with nothing noticing: the full rendering iterates
 * now and `/design` always did, so this is the only hand-decided list of sections left. Declaring
 * it turns the drop into a decision a reader can find rather than an absence they have to infer,
 * and `tests/design-system.test.ts` holds the rendering to this list in BOTH directions and
 * refuses a section that appears in neither one.
 *
 * A DECLARED SUBSET IS NOT A COMPLETE ONE, and the difference is the whole point: the agent is
 * meant to carry less than the repository's own spec. What is forbidden is carrying less than it
 * says it does. The reasons below are this file's header said once, not re-authored — each entry
 * points at the passage that argues it.
 */
export const AGENT_SECTIONS: readonly (keyof typeof SECTIONS)[] = ["palette", "controls", "icons"]

export const AGENT_DROPS: Partial<Record<keyof typeof SECTIONS, string>> = {
    type: "The budget took it, and it was chosen on how much of the claim survives elsewhere in "
        + "the same document: two of its don'ts restate the closed set declared above, and the "
        + "third is twinned almost verbatim by the controls don't that remains. The arithmetic "
        + "that forced the trade, and what it cost, are in this file's header.",
}

/** The complete spec, for a reader who can open this repository. */
function renderFull(): string {
    const guidance = (section: typeof SECTIONS[keyof typeof SECTIONS]) => [
        listing(DESIGN_PAGE.does_label, section.does),
        "",
        listing(DESIGN_PAGE.donts_label, section.donts),
    ].join("\n")

    return [
        frontMatter(),
        "",
        `# ${DESIGN_PAGE.heading}`,
        "",
        "## Overview",
        "",
        "This is one site's whole design vocabulary: a palette of theme tokens, a short type ramp,",
        "a handful of kinds of control and a set of marks. It is deliberately quiet — no webfont,",
        "no display face and no decoration that carries meaning on its own — and it is drawn to work",
        "identically in a light theme and a dark one, which is the constraint most of what follows",
        "exists to protect.",
        "",
        "It authors no value. What each token is FOR is authored in `src/content/design.ts`; what",
        "each token IS lives in the theme block of `src/layouts/BasicLayout.astro`, and the classes",
        "come from `uno.config.ts`. This document and the page at `/design` are both rendered from",
        "the first of those, so neither can disagree with it — and the table below can still carry",
        "both of a token's values, in the front matter and in prose, because every one of them is",
        "READ out of that theme block by `src/lib/palette.ts` rather than written down again here.",
        "",
        themingBlock(),
        "",
        // EVERY SECTION THE MODULE HOLDS, IN THE ORDER IT HOLDS THEM, rather than four keys named
        // by hand. Naming them let a section be added to `src/content/design.ts` and reach
        // `/design` — which has always iterated — while this rendering and the agent's carried on
        // without it, with both file snapshots green, because a snapshot only ever compares a
        // document with itself. The module's key order IS the document's section order, which the
        // format this rendering follows cares about, so a section's position is decided where the
        // section is authored and nowhere else.
        ...(Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]).flatMap((key) => {
            const section = SECTIONS[key]
            const block = SECTION_BLOCKS[key]
            return [
                `## ${section.heading}`,
                "",
                section.lede,
                "",
                ...(block ? [block(), ""] : []),
                guidance(section),
                "",
            ]
        }),
    ].join("\n")
}

/** The terse spec, for a design agent holding an exported bundle and no checkout. */
function renderAgent(): string {
    const guardrails = (section: typeof SECTIONS[keyof typeof SECTIONS]) =>
        listing(DESIGN_PAGE.donts_label, section.donts)

    return [
        "# calvin.sg — building with this system",
        "",
        // The opening names what this rendering ACTUALLY carries. It said "colour, type and
        // controls" while the type section was still here; the budget took that section, so the
        // sentence had to follow it or the document would open by promising a heading it does
        // not have.
        "**Colour, controls and marks; no components** — the source is Astro, so nothing mounts.",
        "The token table and the class list are complete; every other list is a guardrail.",
        "",
        themingBlock(),
        "",
        `## ${SECTIONS.palette.heading}`,
        "",
        tokenTable("agent"),
        "",
        guardrails(SECTIONS.palette),
        "",
        "## The stylesheet is a closed set",
        "",
        "**No utility engine runs here.** These classes came from the source site's markup and",
        "shipped as static CSS, so one that site never used does not exist: the stylesheet is the",
        "only authority on what a class does, and it restates both themes' tokens above its rules.",
        "",
        `Guaranteed present: ${CONTROLS.map((c) => `\`${c.name}\``).join(", ")}, \`sr-only\`,`,
        "`break-anywhere`, the mark classes, and a reset over a system sans stack.",
        "",
        `## ${SECTIONS.controls.heading}`,
        "",
        controlList(),
        "",
        guardrails(SECTIONS.controls),
        "",
        `## ${SECTIONS.icons.heading}`,
        "",
        `${marks().length} marks ship and no others, each a \`.i-\` class sized with \`font-size\`.`,
        "",
    ].join("\n")
}

/** @see DocAudience for what each rendering may say, and the header for what each one drops. */
export function renderDesignDoc(audience: DocAudience): string {
    return audience === "full" ? renderFull() : renderAgent()
}
