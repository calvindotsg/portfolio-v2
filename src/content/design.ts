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
    lede: "Everything below is the real thing, with one captioned exception. The color sheet "
        + "prints both themes at once, the "
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
/**
 * WHAT EACH REGION OF THE BRAND MARK'S BAR IS, IN WORDS.
 *
 * This is the Data Visualization section's own requirement — "say what a bar is measured
 * against, in words the reader meets before the bars" — discharged in the one placement of the
 * mark that has room for words. The Brand Mark section argues that the mark stands OUTSIDE
 * those rules because a browser tab has room for none; that argument is only honest if the
 * page which does have room says it anyway.
 *
 * It is a list of TOKENS rather than of colours, so `/design` reads each value out of the
 * stylesheet the way every other swatch on that page does and nothing here is a second home
 * for one.
 */
export const MARK_REGIONS: readonly {token: string, says: string}[] = [
    {
        token: "--brand-ink",
        says: "The part of this year that has been ridden and run — the two goals' own "
            + "fractions, averaged so a strong year in the shorter sport is visible rather "
            + "than rounded away by the longer one.",
    },
    {
        token: "--progress-track",
        says: "The whole year, which is what the filled part is measured against. It is the "
            + "quieter of the pair in both themes, so the region that stands further from the "
            + "ground is always the one that has been earned.",
    },
]

/**
 * THE CAPTION UNDER EACH STEP OF THE MARK'S SIZE LADDER, and it lives in this module for a
 * reason that has nothing to do with copy.
 *
 * UnoCSS extracts from the text of `.astro` files and NOT from `.ts` ones. Writing the unit
 * inline on `/design` — `{`${size}px`}` — puts the bare token `px` in a scanned file, the
 * engine emits a `.px` rule, no element wears it, and the orphan gate in
 * `tests/build-output.test.ts` fails the DEPLOY. It is the same trap the `blocklist` in
 * `uno.config.ts` exists for, with a cheaper answer available: a string here is invisible to
 * the extractor, so the unit reaches the page without the engine ever seeing the word.
 *
 * `{size}` is substituted with each step of the ladder, which the page reads from
 * `src/lib/brand-mark.ts`. No size is written down here.
 */
export const MARK_SIZE_LABEL = "{size}px"

/**
 * The sentence that prints the figure. `{percent}` is substituted by the page from the same
 * function the mark itself is drawn from, so the words and the drawing cannot disagree.
 */
export const MARK_READING = "The bar on every mark above is at {percent}% today, and it moves "
    + "with the kilometres rather than with a redraw. The one exception is the icon file the "
    + "oldest browsers fall back to, which is a raster frozen at the proportion the mark was "
    + "designed at."

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
/**
 * THE ONE CAPTION THIS PAGE OWES ITSELF.
 *
 * `/design` opens by saying everything on it is the real thing, and that sentence is the page's
 * whole claim. The share card's specimen is the single exception, so the exception is stated
 * where a reader meets it rather than being left for somebody to notice. The lede is qualified
 * too — captioning alone would leave the page's own opening sentence asserting a rule it no
 * longer keeps.
 *
 * IT SAYS WHAT IS INVENTED AND WHAT IS NOT, because "this is a mockup" would be worse than no
 * caption: the drawing, the palette, the type and the figure are all real, and only the session
 * is made up. A reader has to know which half they can trust.
 */
export const CARD_SPECIMEN_CAPTION = "The session on this card never happened. Every other "
    + "specimen here is the real thing; this one is invented, because a real session is a private "
    + "training record and publishing one to make a picture is a poor trade. What is real is "
    + "everything except the facts: the card is drawn by the same function that renders the "
    + "posted ones, in these tokens, at its true size, and it fills every slot the layout has. "
    + "It stays in the light theme when the rest of this page changes, because a card is an "
    + "image and an image does not re-tone once it has been posted."

export const SECTIONS: Readonly<Record<
    "palette" | "type" | "mark" | "controls" | "icons" | "data" | "states" | "words" | "access"
    | "card", {
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
    mark: {
        heading: "Brand Mark",
        lede: "A sunrise over a bar, and the bar is not ornament: it is filled to how far this "
            + "year's two goals have come, averaged, so the mark moves as the year does. That "
            + "makes it the one drawing here the rules below about quantities do not govern. "
            + "Those rules ask that a bar name its scale in words the reader meets first, and "
            + "the smallest place this mark appears is a browser tab, which has room for no "
            + "words at all — so it is an identity device whose proportion happens to be "
            + "measured, rather than a quantity offered for reading. Where there IS room to say "
            + "so, it is said: the mark in the home page's own heading carries the figure and "
            + "its scale in its accessible name. One drawing serves every size below. The rays "
            + "are its thinnest ink and are the first thing to close against the dome as the box "
            + "shrinks; at the smallest step they are barely ink at all, and that is accepted "
            + "rather than answered with a second drawing to keep in step.",
        does: [
            "Fetch the mark rather than redrawing it. /brand/mark.svg carries its own dark-mode block and is what a browser should be pointed at; the pinned light and dark files beside it are for a consumer that cannot evaluate CSS at all.",
            "Draw it in {colors.light-brand-ink} over {colors.light-progress-track}, which is the one place this palette's brand ink is spent on identity rather than on a flourish.",
            "Let it take its size from the font-size of whatever contains it, the way every mark here is sized, so it grows with the reader's text instead of being pinned beside it.",
        ],
        donts: [
            "Recolor it. The ink token is the only one carrying this mark in both themes, so any other choice is a different mark in one of them — and {colors.light-accent} in particular would claim the mark is interactive.",
            "Draw it where a control's own mark belongs. The way back in a page header, and the way home on a missing page, are their control's signifier; identity is not, and putting it there adds a thing to press that does nothing.",
            "Take /favicon.ico as the live mark or redraw the mark from the geometry printed here. That file is a raster fallback, frozen at the proportion the mark was designed at; the geometry is published so a consumer can lay the mark out, not so the drawing can be retyped and quietly stop agreeing with this year.",
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
    data: {
        heading: "Data Visualization",
        lede: "A quantity is drawn as a flat two-pixel stroke: a marked region over the "
            + "remainder, and nothing else in the box. The same stroke answers two different "
            + "questions, and which one it is answering is the whole of what a reader has to be "
            + "told. A FRACTION is drawn once and measured against a target the design chose — "
            + "how much of a year's goal is banked. A SERIES is drawn many times and measured "
            + "against its own largest member, so the lengths are comparable to each other and "
            + "to nothing outside the set: that is what makes a ramp, a taper and a gap visible, "
            + "and it is the one thing a grid of cards cannot show however the cards are sorted. "
            + "The brand mark's bar is the one drawing this section does not govern, and the "
            + "Brand Mark section says why.",
        does: [
            "Say what a bar is measured against, in words the reader meets before the bars. A length means nothing until the scale is named, and a target and the largest value in the set are two different pictures drawn identically.",
            "Give the marked region more contrast against the surface than the unmarked remainder has. Whichever region stands further from the ground is the one a reader takes for the mark, so a bar drawn the other way round reads as full when it is empty.",
            "Draw a value that does not exist yet as an absence rather than as a zero, and print the word for it. A quantity nobody has measured and a measured zero are different facts, and the drawing can only separate them by leaving one of them undrawn.",
        ],
        donts: [
            "Split one bar into segments a reader can only separate by hue. Two categories at the same lightness arrive as one bar in two indistinguishable halves; give each category its own view and let the reader choose one.",
            "Put ink inside a bar. The fill flips polarity between the themes, so a label on it has to be legible against both poles, and the same words have more room beside the bar than on it.",
            "Let the drawing be the only carrier of a figure it encodes. Print the number as well: a bar is a shape, and the reader who cannot resolve the shape is the reader who most needs the value.",
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
    card: {
        heading: "Share Cards",
        lede: "A square image posted beside an activity on somebody else's platform, drawn from "
            + "these tokens and wearing this mark. It is the only thing this system draws that "
            + "will be read somewhere it cannot control: about a third of its drawn size, in a "
            + "feed, under a chip the platform puts there itself. So the constraints are the "
            + "container's rather than the design's, and the guidance below is mostly about "
            + "them. One rule here is not, and it is the one that generalizes: a card and the "
            + "text posted with it are two renderings of one dataset, and the discipline that "
            + "keeps them honest is that no fact appears on both.",
        does: [
            "When one dataset feeds two surfaces, let no fact appear on both. They share a join key and a citation; everything else belongs to exactly one of them, because a fact told twice is a fact that can drift and nothing makes the two renderings of it agree.",
            "Size the type for where the card is read rather than where it is drawn. It arrives at about a third of its drawn size, so a step that is comfortable at full size is decoration by the time anybody sees it.",
            "Say where a drawing's data came from, in the drawing's own words. A figure shaded from a published list and one shaded from a category look identical, and only the sentence beside them separates a measurement from an assumption.",
        ],
        donts: [
            "Put identity where the container draws its own. The platform overlays an attribution chip on the top-left of every activity photo, so a mark there is a mark nobody ever sees.",
            "Make the card taller than it is wide. The feed's carousel crops a portrait, which hands the choice of what to lose to somebody else.",
            "Move a fact into the image to make it fit. There is no alt text on the other side, so anything drawn rather than written is unreachable to a reader who cannot see it.",
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
]
