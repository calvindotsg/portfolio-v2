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
 * THE RULE IS ABOUT AUTHORING, AND `/design` NOW PRINTS THIRTY HEXES UNDER IT. Both are
 * true and the distinction is the point: AUTHORING a value here is forbidden, DERIVING one
 * and printing it is what the page is for. A swatch has always published a value by reading
 * it — `background: var(--token)` — and `src/lib/palette.ts` publishes the same fact as text
 * by the same mechanism. Neither can drift, because neither is a second home. A future reader
 * seeing a colour on that page has not found the rule abandoned.
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
    /**
     * THE NAME OF THE ROW OF SECTION ANCHORS, and it exists because a reference document is
     * entered at a section rather than at the top. It is the page's only string that names a
     * piece of its own furniture — the same job `PATCHES.filter_label` does for the wall's
     * filter row — and it is here rather than in the route for the reason the Configuration
     * rule in README.md gives: a value a person would retune has exactly three homes and a
     * page is not one of them.
     *
     * The row is a live index of {@link SECTIONS}, so this label must stay true however many
     * sections there are. It counts nothing and names none of them.
     */
    index_label: string
    /** The two column headings every section's guidance sits under. */
    does_label: string
    donts_label: string
} = {
    title: `${NAME} — ${METADATA.name}`,
    heading: NAME,
    link_label: NAME,
    lede: "Everything below is the real thing. The color sheet prints both themes at once, the "
        + "ramp wears the real classes, and the controls are the controls. Nothing here is "
        + "authored twice — every value on this page is read out of the block that declares it, "
        + "which is why the page can tell you what each color is and still not be able to go out "
        + "of date. Change the theme and the page re-tones around a record that does not, which is "
        + "what keeps both columns readable in either one.",
    description: "The colors, the type ramp, the controls and the marks this site is built from, "
        + "drawn live from the stylesheet it ships.",
    index_label: "Jump to a section",
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
        + "fallback — so a page without the attribute resolves every color to an invalid value "
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
    {token: "--brand-ink", role: "a brand-colored glyph standing in for a word in prose"},
    {token: "--sport-ride", role: "the cycling mark where it sits on a card"},
    {token: "--sport-ride-on-ink", role: "the same mark on an ink-colored surface"},
    {token: "--sport-run", role: "the running mark on a card"},
    {token: "--sport-run-on-ink", role: "the same mark on ink"},
]

/**
 * THE SITE'S KINDS OF CONTROL, said in the vocabulary `uno.config.ts` uses for them.
 *
 * A box metric belongs to the shortcut, not to this sentence: `chip-icon` is pinned because
 * its content is one mark and never a word, and saying WHICH numbers it is pinned to would
 * put a second home under a value the config already owns. The page draws the real thing
 * beside each of these, so a reader gets the measurement by looking at it.
 */
export const CONTROLS: readonly {name: string, role: string}[] = [
    {
        name: "control-cta",
        role: "The plated surface at the width of whatever contains it, holding a label and its "
            + "mark centered together as one legend. It is the mark for a card's ONE action and "
            + "is spent nowhere else. Its label comes from data and must be allowed to wrap, so "
            + "its height is floored rather than pinned. The intro card's way in, and each goal "
            + "card's way out.",
    },
    {
        name: "text-link",
        role: "A link that is a run of words inside a sentence or a column of figures. Each role "
            + "card's company name.",
    },
    {
        name: "chip",
        role: "The quiet surface, holding a label that names it in a word. For getting somewhere "
            + "and for setting a preference — chrome rather than a page's one action, so it wears "
            + "no plate. Its label comes from data, so its box is floored rather than pinned. The "
            + "patch wall's filter row, and every item in a page header.",
    },
    {
        name: "chip-icon",
        role: "That same quiet surface holding one mark, for a member of a set where the marks "
            + "are the vocabulary, and for a preference. Its content is a glyph the design "
            + "picked the size of, so its box is pinned. The intro card's row of destinations, "
            + "and the theme toggle wherever it appears.",
    },
]

/**
 * EVERYTHING THERE IS TO SAY ABOUT THIS SYSTEM, and the guidance that goes with each of them.
 *
 * `does` and `donts` are the half a design agent actually acts on, and each entry is a
 * complete instruction rather than a slogan: the reason is in the sentence, because the
 * agent reading `.design-sync/conventions.md` cannot open this repository to look one up.
 * `tests/design-system.test.ts` refuses a section with an empty list on either side, so a
 * heading cannot ship with nothing under it.
 *
 * THE HALF THAT IS NOT A DRAWING IS PUBLISHED HERE TOO, and it was the last of it to arrive.
 * What a control DOES when it is touched, what the interface CALLS things, and what it takes
 * to reach and read any of it are decided in this system as deliberately as its colours are —
 * and every one of them was argued somewhere in this repository and published nowhere, which
 * left a reader handed the vocabulary holding the drawing and none of the behaviour. They are
 * ordinary sections rather than an appendix for that reason.
 *
 * NO ENTRY MAY BE ANOTHER ENTRY SAID AGAIN, WHEREVER IT SITS. The sections are subjects, not
 * owners: a line about a control's height belongs where it was first written down, and a later
 * section that wants it has to find the thing only it can say instead. That rule is why the
 * states section never tells anybody to draw a press — the controls section already does — and
 * why the access section says nothing about giving an icon-only control an accessible name,
 * which is a mark's instruction and has been under Marks all along.
 *
 * A SECTION'S KEY IS A PUBLIC ADDRESS AND ITS HEADING IS NOT, WHICH IS WHY THEY MAY DIFFER.
 * `/design` derives one anchor per key, so `palette` is a URL somebody may have bookmarked and
 * renaming it breaks that link for nothing. The heading above it is prose, and where the DESIGN.md
 * format names the section, the heading is the FORMAT'S name — see below. So `palette` is headed
 * `Colors`, `type` is headed `Typography`, and `icons` has been headed `Marks` since before either.
 * Rename a key only for a reason worth a dead bookmark.
 *
 * WHERE THE FORMAT NAMES A SECTION, THIS MODULE USES THE FORMAT'S NAME AND ITS REGISTER — which is
 * a reversal, and the reversal is the point. These headings were `Colour` and `Type`: the site's own
 * words, in British English, in the voice every other page is written in. The document rendered from
 * them claimed the DESIGN.md format, and for a while it satisfied the format by MAPPING those names
 * in the renderer, so the page said one word and the document said another about the same section.
 * That is not two registers serving two readers; it is one design system that cannot be quoted
 * consistently — a reader who reads the page and then the spec finds them disagreeing on what the
 * thing is called, and neither is wrong, which is worse than either being wrong.
 *
 * So the whole published design system speaks the format's register: `Colors`, `Typography`, and
 * American spelling in every string below that a reader or an agent is shown. **The COMMENTS in this
 * repository do not**, this one included — they are the repository talking to whoever maintains it,
 * in the voice the rest of the tree is written in. The line is between what is PUBLISHED as the
 * design system and what is written ABOUT it, and `tests/design-system.test.ts` holds the published
 * side, over the renderings and the built page rather than over this file, because the population
 * that matters is what ships.
 *
 * A SECTION THE FORMAT DOES NOT NAME TAKES THE INDUSTRY'S WORD, NOT THIS SITE'S. `Iconography`,
 * `Interaction States`, `Voice & Tone` and `Accessibility` were `Marks`, `States`, `Words` and
 * `Access` — terser, better prose, and each one a word a reader arriving from another design system
 * has to be taught before they can look anything up. The format's own philosophy leaves these
 * categories open precisely so a system can define them, and defining them in private vocabulary is
 * how a document stops being quotable. `Controls` is unchanged because it already IS the common
 * term for what it holds, and `Components` is the one name it may not take — see
 * `CANONICAL_SECTIONS` in `src/lib/design-doc.ts` for why that would assert something false.
 *
 * THE PAGE STILL TEACHES THE SHORT WORDS. A heading is a lookup key; the prose under it is where
 * this system says `a mark`, `a word`, `a press`. Nothing about renaming the headings costs the
 * vocabulary — it costs only the assumption that a reader already knows it.
 */
export const SECTIONS: Readonly<Record<
    "palette" | "type" | "controls" | "icons" | "states" | "words" | "access", {
    heading: string
    lede: string
    does: readonly string[]
    donts: readonly string[]
}>> = {
    palette: {
        heading: "Colors",
        lede: "The tokens below carry the whole design. Each is defined twice — once per theme — "
            + "and nowhere else, so a design is on-brand exactly to the degree it reaches for "
            + "these and nothing else. A mark meant for an ink-flooded surface is drawn on one "
            + "here, because showing it against the page ground renders the pale half of every "
            + "pair as a mistake. Each token has two keys in this document, {colors.light-accent} "
            + "and {colors.dark-accent} for one token; in CSS it is var(--accent), and the live "
            + "theme decides which of the two you get. Guidance below cites the light key, because "
            + "a reference has to name one and light is what this site serves by default — the "
            + "instruction is about the token, never about that theme.",
        does: [
            "Reach for the token whose role matches what you are drawing, not the one whose color you like.",
            "Design in both themes. Every token is defined in each, and several swap polarity rather than merely darkening.",
            "Use an -on-ink variant on a surface flooded with {colors.light-text}, which is the only place it is right.",
        ],
        donts: [
            "Hardcode a hex, even one printed here. Only the token name carries BOTH values, so a literal is right in at most one theme and wrong in the other.",
            "Reach for {colors.light-brand-ink} to draw something interactive. That is {colors.light-accent}'s job, and the two only coincide in the light theme.",
            "Assume dark is light with the lightness inverted. {colors.light-progress-fill} and {colors.light-progress-track} deliberately trade places.",
        ],
    },
    type: {
        heading: "Typography",
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
        lede: "Which kind to reach for is decided by what the control CONTAINS and by how loud it "
            + "should be. The surface belongs to the kind rather than to all of them: the offset "
            + "plate under an --accent hairline is the mark for a page's ONE action and is spent "
            + "on nothing else, and a quiet hairline at a fraction of the ink is for chrome — "
            + "getting somewhere, and setting a preference. So there is no plated box for a mark "
            + "alone: an action names itself in words, and a control that is only a glyph is a "
            + "member of a set or a preference, which is the quiet kind. Every specimen below is "
            + "a working link to the page it names.",
        does: [
            "Give every link a signifier a reader can perceive: an underline, a mark, or a border.",
            "Let a labeled control wrap. Its width belongs to its container; its height belongs to its text.",
            "Draw the press, and snap it. A tap is over long before a 300ms color ramp finishes, so a pressed state must not ease.",
        ],
        donts: [
            "Reach for a surface class. control-surface and chip-surface are source-level shortcuts the boxes compose, nothing wears either directly, and neither is in the shipped stylesheet.",
            "Draw a link exactly like the prose beside it.",
            "Pin a control's height in pixels. The box is sized in rem so that it grows with the reader's text.",
        ],
    },
    icons: {
        heading: "Iconography",
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
            "Recolor a brand mark away from what the surface it sits on needs for contrast.",
        ],
    },
    states: {
        heading: "Interaction States",
        lede: "Every control here has states, and the states are what tell a reader that "
            + "something can be pressed and that a press landed. This is the half of the system "
            + "that is invisible on a desktop with a mouse and obvious on a phone: hover is not "
            + "a state a finger can enter and leave, and a tap is over long before an easing "
            + "curve has finished, so a design carrying its whole affordance in hover and its "
            + "whole feedback in a transition arrives with neither.",
        does: [
            "Hold a press on anything that navigates until the page actually changes. The press ends when the finger lifts and the reader then waits, with nothing on screen saying the tap landed.",
            "Draw keyboard focus on every device, and draw it apart from hover. Hover is a pointer's affordance and some readers have no pointer; focus is how anyone driving the page from a keyboard knows where they are.",
            "Honor a reduced-motion preference. A reader who set it is saying that movement costs them something, so the design has to still work with every transition taken out.",
        ],
        donts: [
            "Write a hover style a touch device will apply. A touch browser puts hover on whatever was tapped and leaves it there until something else is tapped, so an affordance carried by hover arrives as a state stuck on the last thing the reader touched.",
            "Put a hover rule and a focus rule in one selector list. One is a pointer's affordance and the other is a keyboard indicator every device needs, so suppressing the first takes the second with it.",
            "Carry information in motion alone. A still frame — a reduced-motion preference, a screenshot, a device that dropped the animation — has to say what the moving one said.",
        ],
    },
    words: {
        heading: "Voice & Tone",
        lede: "The words in this interface are design material, and this vocabulary is decided "
            + "rather than inherited. A control's label is the name of the thing it opens; two "
            + "states that share a treatment are told apart by the word each one prints; and the "
            + "word for a thing somebody finished is not the word for the set it belongs to. "
            + "Every one of those was learned by shipping the other version first.",
        does: [
            "Name a destination with the same words at both ends. A control that says one thing and opens a page headed with another breaks the vocabulary at the click, which is the moment a reader is least able to absorb it.",
            "Where two states share a treatment, let the word carry the difference, and print it where the reader is already looking rather than somewhere they have to go and find it.",
            "Say what a thing is in the reader's terms rather than the system's. A name that only makes sense once you know how the data is stored is a name every reader has to be taught.",
        ],
        donts: [
            "Use the word for the earned thing as the heading for the whole set. A page listing everything that was entered cannot be headed with the word for the ones that were finished.",
            "Leave two states that share a treatment with no word between them. The treatment can say that neither of them is the finished thing, and nothing but a word can say which of them this one is.",
            "Let a label change between the control and its destination. Two strings that have to agree are one string, and a label that does not fit is shortened in both places at once.",
        ],
    },
    access: {
        heading: "Accessibility",
        lede: "Reaching and reading, which is the one subject here that is not about drawing. A "
            + "design is finished when somebody can get to every part of it with a finger, with "
            + "a keyboard, at the text size they chose, and with the colors replaced — and "
            + "every one of those is a different reader rather than the same one described "
            + "again.",
        does: [
            "Give every control a target a fingertip can find, on both axes. Something comfortable under a mouse can still be a target a thumb misses, and the two dimensions fail separately: a wide, thin row is the usual one.",
            "Put one landmark around each region a reader might skip to, and make the page's own name its first heading. Skipping is how a page is read without being seen, and it only works on regions that were declared.",
            "Let a reader double the text without the page seeing a font-size change. That size is the reader's own setting rather than an input the design gets to read, so every box has to survive the result already.",
        ],
        donts: [
            "Let reading order drift from visual order. A keyboard meets the markup, so a column moved by the layout is still read where it was written.",
            "Depend on a color surviving. A forced-colors mode replaces every one of them, so whatever a color alone was carrying arrives blank.",
            "Hide from the accessibility tree something a sighted reader can act on. A control nobody can name is a control only some readers have.",
        ],
    },
}

/**
 * WHAT THIS DESIGN SYSTEM DELIBERATELY DOES NOT PUBLISH AS A VALUE, and why each one is a
 * decision rather than a gap.
 *
 * The markdown rendering follows the DESIGN.md format, whose front matter carries typed token
 * groups — colours, typography, spacing, rounding, components — and whose `omitted` key exists
 * precisely so a system can say which of those it is leaving out and mean it. Every group below
 * is one this site has no scale for, and the reasons are the whole of the argument this module's
 * header makes, said once more in the format's own vocabulary for a reader who arrives through it.
 *
 * COLOURS ARE NOT AMONG THEM ANY MORE, AND THEY USED TO BE. This list once opened with `colors`
 * and called that omission the load-bearing one: the format maps one name to one value, every
 * token here has two, and a single map would be false in whichever theme was not written down.
 * The premise was measured and does not hold — the format's own words are that the mapping from
 * palettes to tokens "may follow any consistent naming convention", so a theme-prefixed pair is
 * one map with both themes in it rather than a single map missing one. The group is published
 * now, derived from the theme blocks by `src/lib/palette.ts`, with a `primary` alias written in
 * the format's own reference syntax so nothing is typed twice. What stays omitted is every group
 * this system genuinely has no scale for.
 *
 * The keys are the format's, not this repository's, so they are spelled the way it spells them.
 */
export const OMISSIONS: readonly {section: string, reason: string}[] = [
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
