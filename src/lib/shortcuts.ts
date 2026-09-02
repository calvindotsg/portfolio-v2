/**
 * THE SITE'S KINDS OF CONTROL, IN ONE PLACE, BECAUSE THEY NOW HAVE TWO READERS.
 *
 * `uno.config.ts` composes these into utility rules, and the module that derives the
 * `components` token group reads the same object to publish what each kind resolves to.
 * That is the `ICON_IDS` situation exactly — a census with two consumers must have ONE
 * home, or the day someone adds a seventh kind the engine learns about it and the published
 * tokens do not, with correct markup and a green build.
 *
 * `uno.config.ts` READS THIS MODULE THROUGH unconfig/jiti RATHER THAN VITE, and that is a
 * standing constraint on what may ever be written here: no `import.meta.glob`, no
 * `astro:content`, no top-level `await`, and no `.astro` import — directly or through
 * anything this file pulls in. jiti has no `import.meta.glob`, so one reaching this graph
 * kills `astro build` and vitest itself, four lines of `glob is not a function` with no test
 * executed. The rule and the failure are written out above `EVENTS` in
 * `src/data/races/index.ts`. This module imports nothing at all, which is the cheapest way
 * to keep that true.
 *
 * WHAT EACH ONE IS FOR is the prose below, moved here unedited with the object it describes.
 */

/**
 * THE PLATED SURFACE — an offset plate under an `--accent` hairline, and the site's mark
 * for a page's ONE ACTION. It is a base: nothing wears it directly, and exactly one box
 * composes it today, `control-cta`.
 *
 * THE RULE THE WHOLE VOCABULARY NOW RESTS ON is that a card spends this mark once. Three
 * cards on the home page have an action and three plates are drawn: the intro card's way
 * into the wall, and each goal card's way out to its sport. Everything that is chrome —
 * getting somewhere, and setting a preference — wears the quiet surface below instead. A
 * fourth plate on that page is the rule broken, not a fourth wearer.
 *
 * IT USED TO HAVE AN ICON-ONLY SIBLING AND THAT IS THE SHAPE OF THE DEFECT, so it is
 * recorded rather than deleted with it. A 4rem x 3rem plated glyph box was worn nine times
 * on one screen — six outbound destinations, the theme toggle and the two goal cards —
 * which drew six ways to LEAVE the site exactly as loud as each card's one action, and
 * louder than the way further in. `/patches` ships zero plated controls and is the proof
 * the site can do without them. The measurement that settled it: at 1024x797 the intro
 * card's row of them was 339 x 112 over two lines against a 275px portrait, so the buttons
 * and not the photograph set that card's height.
 *
 * WHAT THE ICON BOX ESTABLISHED THAT STILL GOVERNS, because the arguments outlived the
 * class and the quiet glyph box inherited every one of them:
 *
 *   1. A CONTROL'S BOX IS DECLARED, NOT CAPPED. Three variants once disagreed about every
 *      metric and produced five distinct boxes over nine elements: nothing declared a
 *      width, so `w-max` plus padding made each button "padding + its icon's own aspect"
 *      and presetIcons emits each glyph at the ARTWORK's ratio; a height cap made the
 *      toggle 6px shorter than its neighbours and the one control to fail SC 2.5.5; and a
 *      width cap BELOW the content width squashed that toggle's artwork 10% horizontally
 *      under border-box. A cap makes a control smaller than its content and deforms it.
 *   2. THE BOX IS FONT-RELATIVE. It spent one revision in device pixels for a good reason
 *      that has since expired: the cards' heights came from a page grid clamped between
 *      two absolute lengths while every card clips, so a control that grew under text-only
 *      zoom was simply sheared off. The height budget and every breakpoint are
 *      text-relative now, the page grows and scrolls instead of clipping, and a swept 16px
 *      to 40px root loses 0 ink at each card's bottom clip edge. What an absolute box costs
 *      instead is a target that shrinks against the type beside it.
 *   3. NOTHING OUTSIDE THE SHORTCUT MAY RESTATE THE BOX, and the container is where that
 *      would most naturally happen. It once sized its items with `auto` tracks for exactly
 *      that reason; a track size, a basis or a hard-coded length on the row lets the two
 *      drift apart. `tests/control-geometry.test.ts` forbids all three, for a plate and for
 *      a chip alike.
 *   4. A HAND-TUNED COUNT AGAINST A TEXT-RELATIVE BOX HAS TO BE RE-TUNED WHENEVER EITHER
 *      SIDE MOVES, and it was wrong twice here in opposite directions. Three media queries
 *      granted that row 3/2/1 columns; the ladder stopped at two, two text-relative boxes
 *      plus their separation were 9rem, and a card is only ever as wide as the viewport
 *      allows — so past some reader text size two no longer fitted, the grid held the intro
 *      card's copy column open at its own min-content width, and the card sheared the hero
 *      copy. 136.84px of text ink at 320 wide and a 40px root, 47.44 at 32, inside the
 *      WCAG 1.4.4 bracket, and a BUTTON shearing from a 28px root on a 320px phone. SAMPLE
 *      THE ONSET rather than taking the first root a sweep happens to hit: that onset was
 *      reported at 32 from a sweep whose lowest sample it was, and the same sweep measured
 *      the bottom edge while the damage was on the right. The counting is gone entirely —
 *      the row wraps, so its minimum content width is one item at every text size and there
 *      is no number left to get wrong.
 *
 * DO NOT JUSTIFY A TARGET SIZE WITH A TOOL. Lighthouse's tap-target audit — the source of
 * the "48-CSS-pixel finger" — was REMOVED in v12.0.0 (2024-04-01), and axe's `target-size`
 * measures 24px, so no automated check ships a 48px floor any more. Every box here stands
 * on SC 2.5.5's 44 and on nothing shrinking.
 *
 * THE OFFSET PLATE IS WRITTEN AS ONE COMPLETE ARBITRARY VALUE — offsets, blur and colour
 * together. Splitting it into a geometry utility and a colour-only one is what made the
 * plate invisible for as long as it existed: presetWind3 expands the geometry to
 * `--un-shadow: 2px 2px 0 var(--un-shadow-color)` with no fallback, and a colour-only
 * arbitrary shadow does not define `--un-shadow-color`, so the whole declaration was
 * invalid at computed-value time and the controls rendered flat. A complete value emits its
 * own fallback and survives. The portrait always did this and always cast its plate.
 *
 * `active:shadow-none` still wins: it sets the same `--un-shadow` variable from a `:active`
 * selector, which outranks the shortcut's own rule.
 *
 * box-shadow is deliberately OUTSIDE the colour transition, so the plate snaps rather than
 * fading. Two reasons, both measured. Press/release symmetry: the press state and its 3px
 * offset are both instant, and adding box-shadow to the transition list makes the plate
 * re-inflate over 300ms after the button has already sprung back. And it would buy nothing
 * during a theme change anyway: the card behind sweeps through mid-grey, so at the midpoint
 * the border sits at 1.01:1 and the label at 1.31:1 whatever the plate does. The plate is
 * not the outlier there.
 *
 * `shrink-0` IS NOT ON THIS SURFACE AND MUST NOT BE, which is the one thing the label box
 * needs said in the opposite direction from its retired sibling. A glyph box has a declared
 * width to defend against a flex parent — measured, two of them went 64 -> 47.80px as flex
 * items with the width already in place — and a label box is ASKING for its container's
 * width, so pinning it against shrinking is a declaration with nothing to say, and on a
 * narrow card it is the thing that pushes the control past the clip edge. The quiet glyph
 * box below carries the token for the reason the plated one did.
 *
 * Comments in THIS file are safe to write tokens in: the extraction pipeline does not read
 * the config (probed — a token planted in a config comment emitted no rule). Inside `src/**`
 * it does, including .astro frontmatter, which is what the blocklist above is about. The
 * orphan-rule test is the backstop if that ever changes.
 */
/*
 * WHY `text-link` EXISTS: THREE LINKS WERE DRAWN EXACTLY LIKE STATIC TEXT. Two friends
 * reviewing the site did not know the goal card's "My cycling events" could be clicked, and
 * that turned out to be one instance of a class. Measured on the shipped build at 1024x600,
 * the goal-card control against the figure line directly above it:
 *
 *     colour     rgb(250,250,250)  vs  rgb(250,250,250)   — a contrast ratio of 1.00:1
 *     font-size  12px              vs  12px
 *     decoration none
 *
 * So the only thing separating a link from a sentence was a 13px chevron. The company name
 * on the role cards was worse still — the same `text-xs font-light` as the date line above
 * it, no glyph, no hover, nothing. Both cited sources say the same thing: a text decoration
 * is the remedy when the colour delta is under 3:1 (Berkeley DAP's card-UI guidance), and a
 * link must "differ from static text" (NN/g, "Beyond Blue Links"). It is also the ONLY cue
 * here that survives a phone, where the hover colour cannot happen — and a phone is where
 * both reports came from.
 *
 * `from-font` rather than a length: the face ships its own decoration position and
 * thickness, so this tracks the type instead of pinning a hairline that would go wrong at
 * another size. The offset is in `em` for the same reason every length in a card is
 * font-relative here.
 *
 * `self-start` IS THE HIT BOX, AND IT BELONGS IN THE SHORTCUT RATHER THAN ON EACH WEARER.
 * A column flex container stretches its items across the cross axis, so an anchor that is a
 * flex item has a box the full width of its parent however narrow its words are — 182px of
 * navigating card for ~45px of ink on the role cards, where the rest is blank. EventsLink
 * records this at length and fixed it locally; the wall's Home link is not a flex item and
 * never had the problem; the role cards' company link had it, silently, until making the
 * link VISIBLE turned a box nobody aimed at into one people will.
 *
 * That asymmetry is the argument for putting it here: a treatment that tells a reader "this
 * is a link" has to also be honest about where the link is, so the two belong in the same
 * object. EventsLink keeps its own `align-self` as well — it is tested there, against a
 * selector this shortcut's rule would not satisfy, and the two agree.
 *
 * NOT the `control` box, and the reason is the one EventsLink.astro gives for having no
 * border: the offset plate is this site's mark for a 48px styled control, and wearing it on
 * a 24px text link would either dilute the mark or claim a size these are not.
 */
/*
 * THE SHORTCUTS ARE THE SITE'S KINDS OF CONTROL, AND THE SURFACE IS A BASE RATHER THAN ONE
 * OF THEM. The `shortcuts` object below is the census; this list says what each one is FOR,
 * which is the half the object cannot carry. (It read "there are three now" while listing
 * four — a count in a heading is a count that rots, and the CTA is what made it wrong.)
 *
 *   `control-surface`  the plate, the accent border, the hover ink and the press. No box.
 *   `control`          that surface at 64 x 48, icon-only. Six social links, the toggle.
 *   `control-cta`      that surface at 48 tall and the width of what contains it, holding
 *                      a label and its mark centred as one legend. The two goal cards' way out.
 *   `text-link`        a link that is a run of words inside a sentence or a column of
 *                      figures. The wall's way back, and each role card's company name.
 *   `chip-surface`     the quiet surface: a hairline at a fraction of the ink, the bib's
 *                      own 2px corner, an opaque ground, and the same hover, press and
 *                      held press the plate has. No box, and NO PLATE.
 *   `chip`             that surface at a 44px floor on both axes, holding a label set
 *                      small and tracked wide. The wall's filter row, and every item in
 *                      the page header.
 *   `chip-icon`        the same surface pinned at 44 x 44, holding one mark. The theme
 *                      toggle where a header carries it.
 *
 * THE CHIP IS THE FOURTH KIND, AND IT EXISTED FOR A YEAR BEFORE IT WAS PUBLISHED. It was
 * spelled `.patch-filter a` — a descendant selector in one page's scoped `<style>`, in
 * none of the places this vocabulary is written down, and invisible to
 * `tests/control-geometry.test.ts`, which discovers controls by the PLATE'S signature in
 * the shipped sheet. The tell was in the gate one file along: the build-wide "every link
 * says it is one" check had to name the chip as a special case, so the gate knew about a
 * kind the design system did not. Anything drawn as a chip anywhere else would have been
 * a fourth undocumented copy.
 *
 * IT DOES NOT WEAR THE PLATE, AND THAT IS THE WHOLE DISTINCTION. The paragraphs above say
 * the offset plate is this site's mark for a PRIMARY ACTION — the intro card's links out,
 * a goal card's one way out — and that wearing it elsewhere either dilutes the mark or
 * claims a size the thing is not. Going home, switching theme and fetching a markdown
 * rendering are not primary actions; they are furniture, and furniture recedes so the
 * page's own subject stays the loudest thing on it. The wall is the proof: it ships zero
 * plated controls, and putting three on it would have introduced the plate one rung above
 * a filter row drawn deliberately in the bib's own two treatments.
 *
 * 44px ON BOTH AXES IS A DECISION, NOT AN INHERITANCE. The chip measured 29.59px tall for
 * as long as it was a descendant selector, which clears SC 2.5.8 (Minimum, AA, 24px) and
 * misses SC 2.5.5 (Enhanced, AAA, 44px) that every plated control already meets. Two
 * options were measured before choosing: at 30px the wall is untouched and a whole class
 * of control stays at AA; at 44 every control on the site clears AAA and a row mixing a
 * labelled chip with a glyph chip sits level. The second was chosen, and it made the
 * wall's filter row visibly taller — a change to three pages nobody asked to redesign,
 * and the price of publishing this as a real, gated kind.
 *
 * A FLOOR ON THE LABELLED BOX AND A PIN ON THE GLYPH BOX, which is the distinction
 * `control-cta` and `control` already draw and for the identical reason: `chip`'s label
 * comes from data and must be allowed to grow with the reader's text, so a pinned height
 * would clip it; `chip-icon` holds one mark the design picked the size of.
 * `tests/control-geometry.test.ts` discovers both from this surface's signature and holds
 * that line, so a third box is caught rather than skipped.
 *
 * IT IS OPAQUE, AND THAT MATTERS SOMEWHERE ELSE THAN WHERE IT SHOWS. `.patch-filter a`
 * declared no background and was transparent against whatever it sat on — survivable on
 * the wall, where the filter row sits directly on the page ground, so `--background` is
 * the colour it was already resolving to. It is NOT survivable in the intro card, where
 * below `md` the portrait is painted behind the copy column and a transparent chip would
 * put a hairline box over a photograph. The ground belongs to the surface rather than to
 * one wearer's local override, which is the whole reason this shortcut exists.
 *
 * WHAT THE EXTRACTION CHANGED BESIDES THE HEIGHT, because "behaviour-neutral" would have
 * been a claim rather than a measurement. Everything below is the chip joining the
 * vocabulary the other three shortcuts already speak, and each was checked against the
 * rendered box rather than reasoned about:
 *
 *   - `transition-colors` widens the property list from three names to the engine's six
 *     and moves the curve from CSS's own `ease-in-out` (0.42, 0, 0.58, 1) to this file's
 *     (0.4, 0, 0.2, 1). The three extra properties are ones the chip never animates, and
 *     the curve is the one every other control on the site already eases on — the note
 *     below quotes its 8.5%-at-50ms figure, which is what `active:transition-none` exists
 *     to defeat.
 *   - `cursor-pointer` was absent because an anchor gets it from the user agent. The
 *     glyph box goes on a `<button>`, which does not.
 *   - `text-xs` brings a `line-height` the hand-written rule had no opinion about. It
 *     cannot move anything here: the box is a flex container floored at 44px with its
 *     items centred on the cross axis, so the line box is not what sets the height.
 *
 * THE FOUR STATE RULES ON THE WALL STAY WHERE THEY ARE, retargeted and not moved. Their
 * ORDER relative to `[aria-current="page"]` is measured, is argued in place, and is what
 * keeps the current chip's label readable under a held press — see
 * `src/pages/patches/[...sport].astro`. They out-specify everything this shortcut emits,
 * so the cascade they were written against is unchanged; the duplication that creates is
 * expected rather than a tidy-up waiting to happen.
 *
 * A BASE IS NOT THE THING THAT WENT WRONG LAST TIME, and the distinction matters because
 * the paragraphs above retire a `control-surface` by name. Read the three mechanisms listed
 * there: nothing declared a width, `max-h-[40px]` capped one variant's height, and
 * `max-w-[60px]` capped a width below its own content. All three are CAPPED BOXES. None of
 * them is the factoring — the surface was the one part those two variants agreed about.
 * What is restored here is only that agreement, and the rule that replaced the caps is kept
 * intact: every variant DECLARES its box, and `tests/control-geometry.test.ts` fails the
 * build if any rule anywhere caps one instead.
 *
 * UnoCSS resolves a shortcut reference before it emits, so `.control-surface` ships no rule
 * of its own — nothing wears it, and the orphan gate in tests/build-output.test.ts would
 * fail the build if it did. `.control` and `.control-cta` each ship one flat rule carrying
 * the whole expansion, which is also what keeps the control-geometry surface probe working:
 * it discovers controls by the plate-and-border signature in the sheet, and both variants
 * still carry it literally.
 *
 * WHY THE CTA IS A CONTROL AND THE TEXT LINK IS NOT. The sentence above says the plate is
 * this site's mark for a 48px styled control and must not go on a 24px text link. That
 * still holds; what changed is that the goal card's way out IS a 48px styled control now.
 * Two reviewers could not tell the old run of words was pressable, the underline fixed the
 * "this is a link" half, and this fixes the other half — it is the card's one action, and
 * an action on this site wears the plate. Wearing the mark at the size the mark means is
 * the opposite of diluting it.
 *
 * `w-full` RATHER THAN A DECLARED LENGTH, and it is the one place these two variants differ
 * in kind. `control` is icon-only, so its width is a number the design picks; this one holds
 * a label that comes from data and grows with the reader's text, so any length would be a
 * guess that clips. Full width is a declared box all the same — the card's content width is
 * definite — and it buys the thing a content-width button cannot: the whole box is visibly
 * the anchor, which is the bib's own idiom (see Patch.astro), rather than a sliver of dead
 * card beside a content-width button. (That sliver was first quoted as "29px beside a 153px
 * button" from the chevron revision; built as `w-fit` and measured on the current one it is
 * 33px beside 148.95, and the running and cycling cards disagree by 3px. Use the measured
 * pair, not the remembered one.) Measured at 1024x797: the card goes 232.8 -> 256.8px and `main`
 * stays 797, because the right-hand stack's height is set by the taller left column. 3rem
 * is the LAST size that is free THERE — at 3.5rem `main` goes to 807.59 and the page
 * scrolls.
 *
 * "FREE" IS A STATEMENT ABOUT THE DEFAULT TEXT SIZE AND NOTHING ELSE, which the sentence
 * above did not say and a reviewer was right to call out. The absorption depends entirely
 * on the left column still being the taller one, and text-only zoom is what ends that:
 *
 *     root 16   the stack has 53.4px of slack and swallows the whole +48. Page unmoved.
 *     root 20   the stack IS the binding constraint, so +60 passes into `main` 1:1
 *               (926.67 -> 986.67 at 1440 wide) and lg viewport heights 928-987 go from
 *               fitting to scrolling — up to 59px of content below the fold at h=928.
 *     root 24   the same at 1440 (heights 1152-1180) and 1920 (heights 1104-1148).
 *
 * That cost was measured and accepted rather than fixed. The candidate fix — zeroing the
 * control's `margin-top` in Goal.astro — was built and measured: it reclaims 15px of the
 * 60, still scrolls at 1440x960, and spends a decision that file documents in prose. 12px
 * is not worth it. Note also that no test can see this: there is no layout engine in the
 * suite, so the boundary lives in the PR's browser sweep and in this paragraph.
 *
 * `justify-center`, AND THE `justify-between` IT REPLACES IS THE ONE DECISION IN THIS FILE
 * THAT WAS MEASURED AT EXACTLY ONE WIDTH AND WAS WRONG AT EVERY OTHER.
 *
 * The retired note read: the mark "is pushed away from [the words] so it reads as the edge
 * the press leads over" — the label and the mark as two statements rather than one phrase.
 * That was chosen against the lg card, where the control is 182px and the gap it opens is
 * 41px, so "between" and "centred" draw almost the same object. Below lg there is one column
 * and the card is as wide as the viewport, and the same rule parks a 12px glyph a long way
 * from the words it belongs to:
 *
 *     viewport   320    375    390    430    640    768   1024
 *     control    254    309    324    364    558    304    182
 *     gap        113    168    183    223    417    163     41
 *
 * WHAT THAT DRAWS IS NOT A BUTTON. A wide bordered box with a small label at the left rail
 * and a lone glyph at the right rail is the silhouette of a select or a text field, not of a
 * control you press — and the reader meets it directly under two lines of plain text, which
 * is where a form would put one. Owner-reported from a physical iPhone 15 Pro Max; the
 * screenshots are in the PR. Centring the pair makes the label and the mark one legend, which
 * is what a button has, at every width.
 *
 * IT COSTS NO GEOMETRY, and that is measured rather than assumed: the control's box is
 * IDENTICAL to the build it replaces at all 21 configurations of the zoom sweep (three
 * viewports x seven root sizes; 182x48 through 74x652 is the 1024 column of that sweep, and the
 * control is wider than 182 at every viewport below lg), and ink lost past the card's clip
 * edge stays 0 in every cell. `justify-content` distributes free space that already exists;
 * it cannot create or consume any.
 *
 * THE TWO ALTERNATIVES WERE BUILT AS REAL PAGES AND RENDERED, not sketched. Content-width
 * (`w-fit` on this shortcut) draws a proper button at every width too, and was rejected on
 * two measurements: it loses 23.2px of ink past the card's right edge at 1024 at a 40px root
 * where both other builds lose none, and at lg it stacks the two goal cards' controls at
 * 148.95 and 145.94px — a 3px disagreement, one directly above the other, which is the ragged
 * pair this file spent three paragraphs removing from the icon controls. Keeping full width
 * also keeps the control's right edge flush with the progress rule above it, which is the
 * only other full-bleed thing on the card.
 *
 * `min-h-12` RATHER THAN `h-12`, AND `flex-wrap`, ARE BOTH ANTI-CLIPPING. They look like
 * slack and they are not: a label that comes from data and grows with the reader's text
 * needs somewhere to go, and a control that cannot get taller pushes it sideways into a
 * card that clips. Measured, ink lost past the card's right edge at a 40px root: 42.2px
 * pinned, 0 floored. A floor is also not the capped box the paragraphs above retire — a cap
 * makes a control smaller than its content and deformed the toggle's glyph; a floor
 * guarantees the size and lets content exceed it. `tests/control-geometry.test.ts` holds
 * the line: an icon control must PIN its height, this one must FLOOR it, and neither may
 * cap either axis.
 */
/*
 * A PRESS IS THE ONLY AFFORDANCE A TOUCH READER CAN PRODUCE DELIBERATELY, AND UNTIL NOW
 * ONE OF THE FOUR IDIOMS PRODUCED NOTHING AT ALL.
 *
 * Measured on the shipped build, full-viewport pixel diff between idle and pressed, every
 * row carrying a positive control (an injected garish `:active`) and a negative one (two
 * captures with no press) so that a zero could be told apart from a broken probe:
 *
 *     control-cta   364x48    15,243 px changed
 *     control       64x48      3,336 / 3,773
 *     bib           364x173    8,794
 *     text-link     60x24, 45x16     0        <- both wearers, valid instrument
 *
 * `text-link` carried only `hover:`, which PR #95 correctly put behind a pointer, so on a
 * phone the wall's way back and both role-card company names acknowledged a tap with
 * nothing. `active:text-*` is the press the other three already had, said in the one
 * channel a reader notices around a fingertip.
 *
 * `active:transition-none` IS NOT TIDINESS AND THE PAIR IS MANDATORY. Both shortcuts
 * carry `transition-colors duration-300`, and `color` really is in the emitted property
 * list — so without this the new ink RAMPS: on `cubic-bezier(.4,0,.2,1)` a reader gets
 * 8.5% of the delta at a 50ms tap and 36.7% at 90ms. Note this is the one channel that
 * had the problem: every press measured above comes from `transform`, `box-shadow` or
 * `outline`, none of which is in any transition list, which is why they were already
 * instantaneous. A pixel probe CANNOT see this — the diff thresholds well below 8.5% of
 * the delta — so `tests/build-output.test.ts` asserts it statically instead.
 *
 * `data-[leaving]` IS THE PRESS, HELD UNTIL THE PAGE ACTUALLY GOES. A press ends at
 * touchend, and the reader then waits — measured 376-788ms to first paint on a phone, and
 * unbounded on a worse connection — with nothing on screen saying the tap landed. That is
 * the reported defect: a friend tapped the goal card's way out repeatedly. The attribute is
 * set by the inline script in BasicLayout.astro and every declaration here is the twin of an
 * `active:` one, in the same shortcut, so the two cannot drift.
 *
 * AN ATTRIBUTE RATHER THAN A CLASS, AND THAT IS FORCED RATHER THAN PREFERRED. The orphan
 * gate in tests/build-output.test.ts reads the LEADING CLASS TOKEN of every selector and
 * fails the build when no element wears it; its state-class excuse requires a scoped
 * `[data-astro-cid-…]` selector, and UnoCSS output is never scoped. So `.is-leaving{}`
 * would redden a correct deploy on the day nothing is mid-navigation — which is every
 * build — while `.control[data-leaving]` leads with `control` and passes.
 *
 * `.control[data-leaving]` is EMITTED BUT UNREACHABLE, and that is expected rather than
 * dead: `control` and `control-cta` both compose this surface, so the pair is one rule.
 * Removing it would remove `.control-cta[data-leaving]`, which is the one the goal cards'
 * way out actually wears. The six icon controls are all `target="_blank"` or the theme
 * toggle, and the script marks neither.
 */
export const SHORTCUTS = {
    "control-surface": "text-[var(--text)] bg-[var(--background)] border border-[var(--accent)] hover:text-[var(--accent)] shadow-[2px_2px_0_var(--shadow)] active:text-[var(--accent)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:transition-none data-[leaving]:text-[var(--accent)] data-[leaving]:shadow-none data-[leaving]:translate-x-[3px] data-[leaving]:translate-y-[3px] data-[leaving]:transition-none transition-colors duration-300 ease-in-out cursor-pointer rounded-lg",
    "control-cta": "control-surface text-xs min-h-12 w-full px-3 py-1 inline-flex flex-wrap items-center justify-center gap-x-2",
    "text-link": "underline decoration-from-font underline-offset-[0.18em] self-start text-[var(--text)] hover:text-[var(--accent)] active:text-[var(--accent)] active:transition-none data-[leaving]:text-[var(--accent)] data-[leaving]:transition-none transition-colors duration-300 ease-in-out",
    "chip-surface": "border border-[color-mix(in_srgb,var(--text)_32%,transparent)] rounded-[2px] text-[var(--text)] bg-[var(--background)] no-underline cursor-pointer hover:text-[var(--accent)] hover:border-[var(--accent)] active:text-[var(--accent)] active:border-[var(--accent)] active:transition-none data-[leaving]:text-[var(--accent)] data-[leaving]:border-[var(--accent)] data-[leaving]:transition-none transition-colors duration-300 ease-in-out",
    "chip": "chip-surface inline-flex items-center gap-[0.4em] min-h-11 min-w-11 px-[0.7rem] py-[0.3rem] text-xs font-bold tracking-[0.1em] uppercase",
    "chip-icon": "chip-surface inline-flex items-center justify-center shrink-0 w-11 h-11",
}
