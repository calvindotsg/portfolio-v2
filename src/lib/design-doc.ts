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
 *   AND THE THREE SECTIONS PUBLISHED AFTER IT ARE ALL DECLARED DROPPED, WHICH IS A REFUSAL AND
 *   NOT AN OVERSIGHT. States, Words and Access reach `/design` and the full spec and none of them
 *   reaches this audience. Every one was measured in the shape a carried section is drawn in —
 *   heading, label, its don'ts and nothing else — against the spare that existed when they were
 *   written, and the CHEAPEST of the three overruns that spare by more than the spare itself. So
 *   there was no arithmetic to do: carrying any one of them means dropping something already
 *   here, and nothing already here has a claim that survives elsewhere in this document, which is
 *   the standard every drop above was held to. The figures and the candidates that were weighed
 *   and refused are in `.design-sync/NOTES.md`; each section's own entry in `AGENT_DROPS` says
 *   what its reader is losing.
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
 * document and is what makes the file legible to tooling that globs for it by name. What that
 * format asks for is done deliberately here rather than incidentally: an `Overview` before
 * anything else; a front matter block that uses the format's own `omitted` key to say which typed
 * token groups this system leaves out and why, beside the `colors` group it publishes — see
 * `OMISSIONS` for why each remaining group is a decision; the format's own position for every
 * section it names, and its guardrail section at the end, in the shape that format's own examples
 * draw it — see `CANONICAL_SECTIONS` and `guardrailSection` for both arguments. The format's own
 * NAMES are not done here at all any more: `src/content/design.ts` authors them, so the page says
 * them too. The agent rendering carries no front matter and no guardrail section: it is prepended
 * to a README, where a second document's metadata block is noise, and its reader is a design agent
 * rather than a consumer of this format.
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
    mark: "Dropped because that agent can FETCH it, which is true of no other section here. It "
        + "is handed a bundle and builds screens; what it needs of the brand mark is the file, "
        + "and the file is served — self-theming, in this palette, with its bar at whatever this "
        + "year actually is. Every other section is guidance that only exists as prose, so "
        + "dropping one loses the claim; dropping this one replaces a description of a drawing "
        + "with the drawing. The one line kept in its place is the URL, which is the only part "
        + "that document could not derive. What is lost is the argument for why the mark stands "
        + "outside the rules about quantities — and that argument is aimed at somebody deciding "
        + "whether to draw a bar this way, which is not what this reader is doing.",
    data: "The budget refused it outright, and the arithmetic is not close: the rendering had 134 "
        + "characters of headroom the day this section arrived and the section is an order of "
        + "magnitude larger than that. It is also the one section here whose subject that agent "
        + "may never meet — it is handed a token bundle and asked for screens, and a screen with "
        + "no data on it has no quantity to draw. What is lost if it ever does draw one is the "
        + "polarity rule, which is the failure a token table cannot warn anybody about: a bar "
        + "painted the other way round reads as full when it is empty.",
    type: "The budget took it, and it was chosen on how much of the claim survives elsewhere in "
        + "the same document: two of its don'ts restate the closed set declared above, and the "
        + "third is twinned almost verbatim by the controls don't that remains. The arithmetic "
        + "that forced the trade, and what it cost, are in this file's header.",
    states: "The budget refused it and nothing here is glad about that — for an agent building "
        + "screens out of an exported bundle these are the most valuable lines this system has, "
        + "since a stuck hover state and a press that never draws are exactly what a token table "
        + "cannot warn anybody about. Its don'ts alone were measured and do not fit, by a margin "
        + "wider than the whole spare. It is FIRST in the re-add queue in `.design-sync/NOTES.md`, "
        + "ahead of the two single instructions that were queued before it, because it is a "
        + "subject this document does not mention at all rather than a line missing from one it "
        + "does.",
    words: "Dropped on merit rather than on arithmetic, and it would be dropped at any budget. "
        + "That agent is handed a bundle and writes screens; it does not write this site's copy, "
        + "and every instruction here is about the site's own domain words — what a finished race "
        + "is called, which word separates two states that share a treatment. The reader who needs "
        + "them is a person naming things in this interface, and that reader has `/design` and the "
        + "full spec.",
    access: "The budget refused it, and it is the cheapest of the three by measurement — so it is "
        + "SECOND in the re-add queue and the one to try first if room appears. What is lost is "
        + "worth naming: a forced-colours mode replacing every colour, and a reading order that "
        + "has drifted from the visual one, are failures that agent cannot see anywhere in its own "
        + "output, where a stuck hover state at least shows up the first time somebody taps it.",
}

/**
 * THE SECTIONS THE DESIGN.md FORMAT NAMES ITSELF, IN THE ORDER IT WANTS THEM — ONE TABLE, BECAUSE
 * a canonical name and a canonical position are that format's two claims about the same section,
 * and writing them as two lists is writing one enumeration twice.
 *
 * THIS TABLE NO LONGER RENAMES ANYTHING, AND THAT IS THE WHOLE HISTORY OF IT. It was a mapping:
 * `src/content/design.ts` authored `Colour` and `Type` in the site's own British voice, and the
 * full rendering swapped in the format's names, so `/design` and `DESIGN.md` said different words
 * above the same section. The argument for that was that a canonical name is a wire format and the
 * page keeps the site's voice. What it produced was a design system that cannot be quoted
 * consistently — the page, the spec and the agent's brief disagreeing about what the thing is
 * called, with none of them wrong. The module now authors the format's names directly, so every
 * surface says `Colors`, and this table's job changed from PERFORMING that to HOLDING it:
 * `tests/design-system.test.ts` asserts `SECTIONS[key].heading` equals the name below, in both
 * directions. Renaming a heading back in the content module is red, which is what the mapping
 * could never be.
 *
 * SO THERE IS NO `headingFor`. A section's heading comes off the module, the way every other line
 * of it does, and the one thing this file still decides is ORDER.
 *
 * A SECTION THAT IS NOT HERE KEEPS ITS OWN WORD and follows the named ones in the module's key
 * order. That is the format working rather than a gap in this table: its "Consumer Behavior for
 * Unknown Content" preserves an unknown section heading rather than rejecting it, and that format's
 * own philosophy is explicit that the categories it standardises are a minimum and everything
 * beyond is the system's to define. So `Controls`, `Marks`, `States`, `Words` and `Access` travel
 * intact under this system's own coinages — and a section added to `src/content/design.ts` needs no
 * edit here to reach this document correctly.
 *
 * WHY `Controls` IS NOT NAMED `Components`, which is the mapping a reader will reach for first.
 * Those are mountable things carrying property tokens; this site's component namespace is empty by
 * construction — the source is Astro and nothing mounts — and the front matter above declares that
 * group omitted for exactly that reason. Claiming the name would assert something this same
 * document denies two screens earlier.
 *
 * IT IS A CLAIM ABOUT SOMEBODY ELSE'S FORMAT AND IT WILL GO STALE. Stamped against
 * `@google/design.md` v0.4.0, whose `spec` subcommand prints the canonical list on demand. Re-read
 * it from the tool rather than trusting this table, and do not paraphrase that spec into this
 * repository — a copied convention is one that goes stale in silence.
 */
export const CANONICAL_SECTIONS: readonly (readonly [keyof typeof SECTIONS, string])[] = [
    ["palette", "Colors"],
    ["type", "Typography"],
]

/**
 * THE SEQUENCE THE FULL RENDERING EMITS. A canonically named section takes the format's own
 * position; every other one follows in the module's key order, which is where a section's place
 * is decided whenever the format has no opinion about it.
 */
const sectionOrder = (): (keyof typeof SECTIONS)[] => {
    const canonical = CANONICAL_SECTIONS.map(([key]) => key)
    return [
        ...canonical,
        ...(Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]).filter((key) => !canonical.includes(key)),
    ]
}

/** The heading the format reserves for the guardrails, and the last section this document emits. */
export const GUARDRAILS_HEADING = "Do's and Don'ts"

/**
 * THE FORMAT'S CANONICAL GUARDRAIL SECTION, AGGREGATED OUT OF EVERY SECTION'S OWN TWO LISTS.
 *
 * THIS SAYS EVERY GUIDANCE LINE A SECOND TIME, AND THAT IS THE DECISION RATHER THAN AN OVERSIGHT.
 * The format makes this the section a consumer reads for guardrails, and for a consumer that reads
 * only the canonical sections it is the ONLY one: every line this system has was sitting under a
 * heading that format has never heard of, so that reader got none of it. A person reading `/design`
 * needs the opposite arrangement — each instruction beside the thing it is about, where its reason
 * is — and both readers are real.
 *
 * THE OTHER OPTION WAS TO MOVE THE GUIDANCE HERE AND LEAVE THE SECTIONS WITHOUT IT. Refused: it
 * strips every reason out of the section that holds it and leaves the body a list of rules with no
 * subject, which is the opposite of what the per-section register was written for.
 *
 * THE DUPLICATION CANNOT DISAGREE WITH ITSELF, which is what makes it payable. Both renderings of
 * a line come out of the same `SECTIONS` entry in one pass, so there is nothing to keep in step —
 * the same shape the token table already has, drawn for both audiences without either being a
 * second home. Nothing here is authored: a line that needs changing is changed where it was
 * written.
 *
 * EACH LINE NAMES THE SECTION IT CAME FROM, in bold at the head of the bullet, because this list is
 * an aggregation where a real DESIGN.md's is authored flat. Without it a reader meeting
 * "let a labeled control wrap" here has no way back to the paragraph that says why.
 *
 * THE SHAPE IS THE FORMAT'S OWN, not this file's invention: `## Do's and Don'ts` carrying `### Do`
 * and `### Don't`, each a plain bullet list. That is what `docs/spec.md` shows, what the format's
 * PHILOSOPHY shows, and what real published DESIGN.md files do — checked against several in
 * `voltagent/awesome-design-md` before it was written this way. It replaced a flat list whose every
 * bullet restated "Do:" or "Don't:" inline, which said the same thing in a shape nothing else in the
 * ecosystem uses. The two labels come from `DESIGN_PAGE`, so the page's columns and this document's
 * subheadings cannot drift apart.
 */
const guardrailSection = () => {
    const group = (label: string, pick: (s: typeof SECTIONS[keyof typeof SECTIONS]) => readonly string[]) => [
        `### ${label}`,
        "",
        sectionOrder()
            .flatMap((key) => pick(SECTIONS[key]).map((line) => `- **${SECTIONS[key].heading}** — ${line}`))
            .join("\n"),
    ]
    return [
        `## ${GUARDRAILS_HEADING}`,
        "",
        "Every line below is repeated from the section it names, which is where its reason is. This",
        "section exists because the format this document follows makes it the one place a consumer",
        "reads for guardrails, and guidance that sits only under a heading that format does not know",
        "reaches that reader not at all.",
        "",
        ...group(DESIGN_PAGE.does_label, (s) => s.does),
        "",
        ...group(DESIGN_PAGE.donts_label, (s) => s.donts),
    ].join("\n")
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
        // EVERY SECTION THE MODULE HOLDS, rather than four keys named by hand. Naming them let a
        // section be added to `src/content/design.ts` and reach `/design` — which has always
        // iterated — while this rendering and the agent's carried on without it, with both file
        // snapshots green, because a snapshot only ever compares a document with itself.
        //
        // THE ORDER IS THE FORMAT'S WHERE THE FORMAT HAS ONE and the module's everywhere else; see
        // `sectionOrder`. So a section's position is decided where the section is authored, EXCEPT
        // for the two the DESIGN.md format names and sequences itself. The HEADING is not that
        // division any more and used to be: it comes straight off the module now, because the
        // module authors the format's names itself.
        ...sectionOrder().flatMap((key) => {
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
        // LAST, because the format sequences it last, and because a guardrail aggregated from
        // sections a reader has not met yet is a list of rules about nothing.
        guardrailSection(),
        "",
    ].join("\n")
}

/**
 * THE FORMAT'S `{colors.x}` REFERENCE IS FOR A READER HOLDING THE FRONT MATTER, and this one is
 * not. `.design-sync/conventions.md` is prepended to a README: it has no front matter, nothing to
 * resolve a reference against, and its own token table lists the CSS custom properties. So a
 * reference is rendered back to the property its reader can actually type — `{colors.light-accent}`
 * becomes `--accent`, dropping the theme prefix that only exists to give one token two keys in a
 * document this audience never sees.
 *
 * ONE SOURCE, TWO FORMS, WHICH IS THIS FILE'S WHOLE RULE. The guidance is authored once in
 * `src/content/design.ts` and each audience is handed the form it can use, rather than the module
 * carrying two spellings of one sentence for two readers to pick from.
 */
const toCssNames = (line: string) => line.replace(/\{colors\.(?:light|dark)-([a-z0-9-]+)\}/gi, "--$1")

/** The terse spec, for a design agent holding an exported bundle and no checkout. */
function renderAgent(): string {
    const guardrails = (section: typeof SECTIONS[keyof typeof SECTIONS]) =>
        listing(DESIGN_PAGE.donts_label, section.donts.map(toCssNames))

    return [
        "# calvin.sg — building with this system",
        "",
        // The opening names what this rendering ACTUALLY carries. It said "colour, type and
        // controls" while the type section was still here; the budget took that section, so the
        // sentence had to follow it or the document would open by promising a heading it does
        // not have.
        "**Colors, controls and marks; no components** — the source is Astro, so nothing mounts.",
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
