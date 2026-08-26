/**
 * WHAT THE DESIGN SYSTEM MEANS. Not one value of it — no colour, no length, no class.
 *
 * The site describes its own vocabulary in two surfaces that are both DERIVED from this
 * module: the `/design` page, which draws live specimens out of the stylesheet it ships,
 * and `.design-sync/conventions.md`, the document handed to a design agent that builds
 * screens from an exported palette. Before this module those two were a hand-written
 * markdown file and nothing else, and the file could disagree with the code the moment a
 * token was renamed. Now the meaning is authored once and the values are never authored at
 * all — a swatch is `background: var(--token)`, the ramp wears the real utility classes,
 * and the marks come off the census in `src/lib/icons.ts`.
 *
 * SO THE ONE RULE THIS FILE HAS: if you find yourself typing a hex, a rem, a pixel count
 * or a class name that the page could read out of the build instead, it does not belong
 * here. That is the whole defect this module exists to prevent, and the reason the four
 * generated reference cards it replaced were retired rather than repaired.
 *
 * NO COUNTS EITHER, in any string a reader can see. "Fifteen tokens" and "eighteen marks"
 * are both true today and neither is gated anywhere, so both are a stale sentence waiting
 * for the next token or the next icon. Say the property; let the page render the set.
 *
 * `uno.config.ts` READS THE CONTENT MODULES THROUGH unconfig/jiti RATHER THAN VITE, and
 * that is a standing constraint on anything written in this directory: no
 * `import.meta.glob`, no `astro:content`, no top-level `await`, and no `.astro` import —
 * directly or through anything this file pulls in. jiti has no `import.meta.glob`, so one
 * reaching that graph kills `astro build` with four lines of `glob is not a function`
 * before a single test runs. The rule and the failure are written out above `EVENTS` in
 * `src/data/races/index.ts`.
 */

import {METADATA} from "./site"

/**
 * THE PAGE'S NAME, WORN THREE TIMES ON PURPOSE — the browser tab, the heading a reader
 * lands on, and the words on the link that reaches it. They are one constant because the
 * site already learned what happens when they are three strings: a goal card offered "My
 * cycling events" and the page that opened was headed "Cycling patches", so the vocabulary
 * broke at the click. `tests/build-output.test.ts` holds that pairing for the goal cards
 * and cannot see this one, which is exactly why it is made impossible here rather than
 * merely checked.
 */
const NAME = "How this site is drawn"

export const DESIGN_PAGE: {
    /** The whole `<title>`, composed here so no page has to remember the suffix. */
    title: string
    /** The `<h1>`. */
    heading: string
    /** The words the home page's footer link wears. Identical to {@link DESIGN_PAGE.heading}. */
    link_label: string
    /** The sentence under the heading — the page's thesis, in one breath. */
    lede: string
    /** The meta description. A crawler reads it with no heading beside it. */
    description: string
    /** The two column headings every section's guidance sits under. */
    does_label: string
    donts_label: string
} = {
    title: `${NAME} — ${METADATA.name}`,
    heading: NAME,
    link_label: NAME,
    lede: "Everything below is the real thing. The swatches resolve the same custom properties "
        + "every other page does, the ramp wears the real classes, and the controls are the "
        + "controls. Nothing here restates a value, so nothing here can go out of date — change "
        + "the theme and the whole page re-tones with the site.",
    description: "The colours, the type ramp, the controls and the marks this site is built from, "
        + "drawn live from the stylesheet it ships.",
    does_label: "Do",
    donts_label: "Don't",
}

/**
 * THE PRECONDITION EVERY OTHER SENTENCE HERE DEPENDS ON, and the one thing about this system
 * that will silently produce an unstyled page rather than a wrong-looking one.
 *
 * It is rendered on `/design` above the token list and it opens
 * `.design-sync/conventions.md`, because it is equally true of the site and of the stylesheet
 * the design tool is handed — which is not true of everything in that document, and is the
 * test for whether something belongs in this module at all.
 *
 * THE TWO SURFACES RENDER {@link THEMING.themes} DIFFERENTLY AND THE COPY HAS TO SURVIVE BOTH.
 * The page shows the ONE line matching the theme the reader is actually in, revealed in CSS,
 * so pressing the toggle demonstrates the precondition rather than describing it. The document
 * has no reader and no live theme, so it lists both. That is why the lede ends on an
 * instruction that reads correctly above one line or two, and why it says nothing like "the
 * page you are looking at" — a sentence true of one surface is a sentence false on the other.
 */
export const THEMING: {
    heading: string
    lede: string
    /** The line to copy, with `{theme}` standing in for one of {@link THEMING.themes}. */
    example: string
    /**
     * THE ONLY TWO LEGAL VALUES, AND THE ONE PLACE IN THIS MODULE THAT NAMES SOMETHING THE
     * STYLESHEET ALSO NAMES. That makes it a second home, so it is gated rather than trusted:
     * `tests/design-system.test.ts` parses the `:root[data-theme=…]` block names out of the
     * built CSS and holds this list against them, both ways — the same treatment the mark
     * census gets. A third theme added to the layout and forgotten here is red.
     *
     * Ordered, and the order is what the page and the document render in. The first is the
     * one the site serves with no stored preference.
     */
    themes: readonly string[]
} = {
    heading: "Set data-theme, or nothing is styled",
    lede: "Every token is defined only under the two theme blocks — there is no bare :root "
        + "fallback — so a page without the attribute resolves every colour to an invalid value "
        + "and renders unstyled text on unstyled ground. Both themes are equal citizens and "
        + "every design has to work in each; light is what the site serves by default. Put it "
        + "on the root element:",
    example: `<html data-theme="{theme}">`,
    themes: ["light", "dark"],
}

/**
 * EVERY THEME TOKEN AND THE ONE JOB IT HAS, in the order the stylesheet declares them.
 *
 * The wording for all but the first four is the wording already in the theme-variables
 * block of `src/layouts/BasicLayout.astro`, which is where the values live and where the
 * polarity argument is written out. The first four are named here because that block says,
 * in as many words, that they are the obvious ones and does not bother.
 *
 * THE NAMES ARE THE GATED HALF. `tests/design-system.test.ts` holds this list against the
 * tokens the built stylesheet actually defines, in BOTH directions, so a token renamed in
 * the layout and forgotten here is red — and so is one named here that no longer exists.
 * The ROLES are prose and nothing can check them; that asymmetry is stated rather than
 * hidden, because a role sentence that has quietly stopped being true is the failure this
 * module can still have.
 */
export const TOKEN_ROLES: readonly {token: string, role: string}[] = [
    {token: "--background", role: "the page ground"},
    {token: "--card-background", role: "a card's plate, one step off the ground"},
    {token: "--card-border", role: "that plate's edge"},
    {token: "--shadow", role: "the offset plate cast by the portrait and the controls"},
    {token: "--accent", role: "the interactive affordance: control border, hover ink"},
    {token: "--text", role: "body ink"},
    {token: "--progress-fill", role: "the marked region of a progress bar"},
    {token: "--progress-track", role: "the unmarked remainder of that bar"},
    {token: "--status-live", role: "the Now card's live indicator dot"},
    {token: "--status-halo", role: "that dot's decorative pulsing halo"},
    {token: "--brand-ink", role: "a brand-coloured glyph standing in for a word in prose"},
    {token: "--sport-ride", role: "the cycling mark where it sits on a card"},
    {token: "--sport-ride-on-ink", role: "the same mark on an ink-coloured surface"},
    {token: "--sport-run", role: "the running mark on a card"},
    {token: "--sport-run-on-ink", role: "the same mark on ink"},
]

/**
 * THE SITE'S KINDS OF CONTROL, said in the vocabulary `uno.config.ts` uses for them.
 *
 * A box metric belongs to the shortcut, not to this sentence: `control` is pinned because
 * its content is one mark and never a word, and saying WHICH numbers it is pinned to would
 * put a second home under a value the config already owns. The page draws the real thing
 * beside each of these, so a reader gets the measurement by looking at it.
 */
export const CONTROLS: readonly {name: string, role: string}[] = [
    {
        name: "control",
        role: "The plated surface at a box the design picks, icon-only: its content is one mark "
            + "and never a word, so its width is a number rather than a guess. The social links "
            + "and the theme toggle wear it.",
    },
    {
        name: "control-cta",
        role: "That same surface at the width of whatever contains it, holding a label and its "
            + "mark centred together as one legend. Its label comes from data and must be "
            + "allowed to wrap, so its height is floored rather than pinned. The goal cards' "
            + "way out.",
    },
    {
        name: "text-link",
        role: "A link that is a run of words inside a sentence or a column of figures. The wall's "
            + "way back, and each role card's company name.",
    },
]

/**
 * THE FOUR THINGS THERE ARE TO SAY, and the guidance that goes with each.
 *
 * `does` and `donts` are the half a design agent actually acts on, and each entry is a
 * complete instruction rather than a slogan: the reason is in the sentence, because the
 * agent reading `.design-sync/conventions.md` cannot open this repository to look one up.
 * `tests/design-system.test.ts` refuses a section with an empty list on either side, so a
 * heading cannot ship with nothing under it.
 */
export const SECTIONS: Readonly<Record<"palette" | "type" | "controls" | "icons", {
    heading: string
    lede: string
    does: readonly string[]
    donts: readonly string[]
}>> = {
    palette: {
        heading: "Colour",
        lede: "The tokens below carry the whole design. Each is defined twice — once per theme — "
            + "and nowhere else, so a design is on-brand exactly to the degree it reaches for "
            + "these and nothing else. A mark meant for an ink-flooded surface is drawn on one "
            + "here, because showing it against the page ground renders the pale half of every "
            + "pair as a mistake.",
        does: [
            "Reach for the token whose role matches what you are drawing, not the one whose colour you like.",
            "Design in both themes. Every token is defined in each, and several swap polarity rather than merely darkening.",
            "Use an -on-ink variant on a surface flooded with --text, which is the only place it is right.",
        ],
        donts: [
            "Hardcode a hex. There is no token here whose value is worth restating.",
            "Reach for --brand-ink to draw something interactive. That is --accent's job, and the two only coincide in light mode.",
            "Assume dark is light with the lightness inverted. --progress-fill and --progress-track deliberately trade places.",
        ],
    },
    type: {
        heading: "Type",
        lede: "A deliberately short ramp. There is no webfont and no display face — the system "
            + "sans stack is the typeface, and restraint in the ramp is what carries hierarchy "
            + "instead. Each step below is set in the size it names.",
        does: [
            "Carry hierarchy with size, weight and space, taken from the ramp as it stands.",
            "Let the reader's own text size drive the layout: every breakpoint and every box here is sized in rem for exactly that reason.",
            "Space sibling groups with a gap on a flex or grid parent.",
        ],
        donts: [
            "Introduce a decorative or display face. There is no webfont to pair one with.",
            "Invent an intermediate step because something is a little too big.",
            "Pin a height in pixels. Text that grows then clips instead of pushing.",
        ],
    },
    controls: {
        heading: "Controls",
        lede: "Three kinds, and which one to use is decided by what the control CONTAINS rather "
            + "than by how important it is. All three share one surface: a hairline in --accent, "
            + "a hard offset plate in --shadow, and colour moving over 300ms. Every specimen "
            + "below is a working link to the page it names.",
        does: [
            "Give every link a signifier a reader can perceive: an underline, a mark, or a border.",
            "Let a labelled control wrap. Its width belongs to its container; its height belongs to its text.",
            "Draw the press, and snap it. A tap is over long before a 300ms colour ramp finishes, so a pressed state must not ease.",
        ],
        donts: [
            "Reach for control-surface. It is a source-level shortcut the other two compose, nothing wears it directly, and it is not in the shipped stylesheet.",
            "Draw a link exactly like the prose beside it.",
            "Pin a control's height in pixels. The box is sized in rem so that it grows with the reader's text.",
        ],
    },
    icons: {
        heading: "Marks",
        lede: "Every mark here is in the stylesheet because some page uses it, so the set grows "
            + "with the site rather than ahead of it. Nothing outside this set is available: a "
            + "class with no rule renders as a mask box at zero size, which is an absent icon "
            + "with correct markup and a green build.",
        does: [
            "Size a mark with font-size. They are background images scaled to the text box.",
            "Pair a mark with a word wherever the mark alone would be a guess.",
            "Give an icon-only control an accessible name, since the mark is the whole control.",
        ],
        donts: [
            "Substitute an emoji for a mark that is not in the set.",
            "Mix another icon family in. The ones that ship do different jobs and were chosen against each other.",
            "Recolour a brand mark away from what the surface it sits on needs for contrast.",
        ],
    },
}

/**
 * WHAT THIS DESIGN SYSTEM DELIBERATELY DOES NOT PUBLISH AS A VALUE, and why each one is a
 * decision rather than a gap.
 *
 * The markdown rendering follows the DESIGN.md format, whose front matter carries typed token
 * groups — colours, typography, spacing, rounding, components — and whose `omitted` key exists
 * precisely so a system can say which of those it is leaving out and mean it. Every group is
 * omitted here, and the reasons below are the whole of the argument this module's header makes,
 * said once more in the format's own vocabulary for a reader who arrives through it.
 *
 * THE COLOUR REASON IS THE LOAD-BEARING ONE AND IT IS NOT SQUEAMISHNESS ABOUT COPYING A HEX.
 * That format maps one name to one value. Every token here has TWO, one per theme, and several
 * trade places rather than darkening — so a single map would not be a lossy rendering of this
 * palette, it would be a false one, and it would be false in the direction that makes a design
 * fail in whichever theme was not written down. Saying so is worth more than shipping half.
 *
 * The keys are the format's, not this repository's, so they are spelled the way it spells them.
 */
export const OMISSIONS: readonly {section: string, reason: string}[] = [
    {
        section: "colors",
        reason: "Every token is defined twice, once per theme, and several swap polarity rather "
            + "than darkening. One name to one value cannot say that, so the roles are published "
            + "here and the values stay in the stylesheet, where both themes are.",
    },
    {
        section: "typography",
        reason: "There is no webfont and no display face: the ramp is a handful of steps over the "
            + "system sans stack, and each step is drawn at its own size on the page this renders "
            + "from rather than restated as a measurement.",
    },
    {
        section: "spacing",
        reason: "There is no authored spacing scale. Space comes from the utility engine's own "
            + "steps and from gaps on flex and grid parents, so a scale written down here would "
            + "be an invention rather than a record.",
    },
    {
        section: "rounded",
        reason: "One radius, worn by the controls, and one two-pixel corner that is a bib's mark "
            + "rather than a measurement. Neither is a scale.",
    },
    {
        section: "components",
        reason: "The site is built in Astro, whose components compile to a server render and have "
            + "no runtime form, so there is nothing to mount and the component namespace is empty "
            + "by construction. Build with plain elements and the named classes below.",
    },
]
