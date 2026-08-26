import {defineConfig, presetIcons, presetWind3} from "unocss";

import {ICON_IDS, iconClass} from "./src/lib/icons";

export default defineConfig({
    /**
     * Icon classes are derived from constants at render time, so UnoCSS never
     * sees them literally in source — every configured icon is safelisted here.
     *
     * THE CENSUS ITSELF IS NO LONGER WRITTEN HERE. It is `ICON_IDS` in
     * `src/lib/icons.ts`, beside the function that turns an id into a class, because
     * this list stopped being its only reader: `/design` renders the same set as the
     * marks a designer may reach for. Two hand-kept lists answering that question
     * differently is the defect this safelist exists to prevent, arriving one page at
     * a time — a presetIcons class with no rule renders as a mask box at zero size, an
     * icon that is silently absent with correct markup and a green build. What each
     * entry is doing in the census, and what is deliberately NOT in it, is written out
     * beside the list.
     */
    safelist: ICON_IDS.map(iconClass),
    /** UnoCSS extracts from the text of `<style>` blocks too, so the declaration
     *  `position: static` in IntroCard emits a utility rule for a class no
     *  element wears. A comment can be reworded around; a real declaration
     *  cannot, so the token is blocked instead.
     *
     *  `tabular-nums` is the same case, from `font-variant-numeric: tabular-nums`
     *  on the goal card's hero figure (Goal.astro). The property is written out
     *  rather than taken as a utility because the rest of that rule — weight,
     *  tracking, line height — is authored CSS, and splitting one type treatment
     *  across two mechanisms is how the pair drifts. */
    /*
     * `underline` IS BLOCKED AS AN ENGLISH WORD, not as a declaration value, and the difference
     * decides whether the entry survives its own reason.
     *
     * `static` and `tabular-nums` are blocked for the declaration-value reason: this codebase has
     * to write them in authored CSS, and the extractor reads `src/**`. `underline` was briefly in
     * that category too — the bib's action row carried `text-decoration: underline` — but the
     * owner rejected a decoration on a bib as the wrong vocabulary for a printed artifact, that
     * declaration was deleted, and the justification here was left behind describing code that no
     * longer exists. A review panel found it five times over.
     *
     * The entry still earns its place on the remaining reason alone: the treatment is this site's
     * named idiom, so the components wearing it explain themselves in prose, and any sentence
     * containing the word emits a real `.underline{}` rule that no element wears — which the
     * orphan gate in tests/build-output.test.ts fails the build on.
     *
     * Blocking the token does NOT disarm the shortcut: a shortcut's expansion is resolved after
     * extraction, so `.text-link` still ships `text-decoration-line: underline`. That is
     * asserted rather than trusted — tests/rendered-html.test.ts reads the declaration back out
     * of the built stylesheet, so the day this interaction changes, the affordance does not
     * quietly disappear.
     *
     * KNOWN_ORPHANS was the wrong tool and was considered first: it suppresses the gate for a
     * rule that really is dead, where blocking stops the rule being emitted at all.
     */
    blocklist: ["static", "tabular-nums", "underline"],
    /**
     * EVERY BREAKPOINT IS TEXT-RELATIVE, and these five values are presetWind3's
     * own defaults restated in `rem`: 640/768/1024/1280/1536 CSS pixels are
     * 40/48/64/80/96rem at the 16px root every browser ships. So at the default
     * text size this is not a change at all — it re-spells the same five numbers.
     *
     * It stops being a re-spelling exactly when the reader has asked for larger
     * text. A media-query `rem` resolves against the INITIAL font-size — the
     * user's own default, the thing a browser's "Font size" setting moves — so a
     * `rem` breakpoint asks "how much text fits across this viewport", where a
     * `px` breakpoint asks "how many device pixels". The layout only ever cared
     * about the first question: this page's four-column grid needs roughly 64
     * characters of width to work, and at a 24px root a 1024px viewport offers
     * about 42. It was still being handed the four-column grid there, and the
     * cards lost 846px of text off their bottom edges as a result — the columns
     * were too narrow for the type, every line wrapped, and nothing could grow.
     *
     * Note what this does NOT respond to: an AUTHOR setting `font-size` on
     * `:root`. That moves every `rem` LENGTH and no `rem` media query, which is
     * per spec and is worth knowing because it is also how a probe is most
     * easily written — measuring text zoom that way silently tests the other
     * mechanism. Verified both ways on a synthetic page with a known answer
     * before any of this was measured.
     *
     * The hand-written media queries in the codebase were converted in the same pass
     * and have to stay in step by hand. There is ONE left — in IntroCard.astro, and it
     * deliberately mirrors `md`. A px query left among rem ones does not fail loudly:
     * it simply parts company with its variant siblings once the reader enlarges the
     * text, which is why the count is worth keeping small and worth stating here.
     *
     * It was four. Three of them granted the control row a column count — 3, 2 and 1 at
     * 40rem, 25rem and 13rem, with the 4-column rule unconditional and so not a query at
     * all — and all three are gone: that row wraps now, so it needs
     * no bound at all and there is nothing left to keep in step. Two of those bounds
     * had no variant sibling to move with in the first place, which is the shape of
     * hand-maintained CSS worth deleting rather than converting — see BasicLayout.astro.
     */
    theme: {
        breakpoints: {sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem", "2xl": "96rem"},
    },
    /**
     * The one styled control. Seven elements wear it: the six social-link anchors
     * in the intro card, and the theme toggle, which is a real button. It is a
     * class and not a component because those elements legitimately differ — only
     * the look is shared, and a component that picks the caller's element is how a
     * `button` ended up illegally nested inside an `a` in the first place.
     *
     * It was nine until the two goal cards' calls to action were removed: both
     * pointed at the same Strava profile the intro card's social link already
     * reaches, and a logged-out visitor meets a login wall there. Every measured
     * figure below was taken when there were nine, and the numbers are still the
     * numbers — the box is declared, so it does not depend on how many elements
     * wear it. Read "nine" in the history below as "the nine that then existed",
     * not as a count to re-derive.
     *
     * There used to be a `control-surface` base plus `control` and
     * `control-compact` box variants, and the two variants disagreed about every
     * box metric: the anchors rendered four different widths across 57–62 at 46
     * tall, and the toggle 60 x 40 — five distinct boxes over nine elements.
     * Three separate mechanisms produced that, all of them now gone:
     *
     *   1. Nothing declared a width. `w-max` plus horizontal padding made each
     *      button `42px + its icon's width`, and presetIcons emits each icon at
     *      the ARTWORK's aspect ratio — 0.75em for strava, 0.88em for
     *      linkedin/instagram, 0.97em for github/telegram, and 1em for all three
     *      Remix icons (sun, moon, and the résumé PDF glyph, which is why that
     *      link was the widest anchor at 62.00px). So the icon's proportions
     *      leaked into the button's.
     *   2. `max-h-[40px]` on the compact variant, not its padding, is what made
     *      the toggle 6px shorter. Both call sites make the control a grid or
     *      flex item, so its height came from stretching, and the vertical
     *      padding was inert; the cap was the whole difference.
     *   3. `max-w-[60px]` on the same variant was BELOW that button's own content
     *      width (2px border + 40px padding + a 20px icon = 62px), so under
     *      border-box the icon child shrank to 18px — the sun and moon artwork
     *      shipped squashed 10% horizontally. The icon is 1em; the cap was
     *      deforming it, rather than the icon being authored small.
     *
     * So the box is now DECLARED rather than capped, once, for every control:
     * 64 x 48px, which is 2px larger on each axis than the widest button that used
     * to ship, so nothing shrank. 48px clears WCAG 2.2 SC 2.5.5's 44x44 AAA
     * target, which the 40px toggle was the one control to fail; SC 2.5.8's 24x24
     * AA floor was never the binding constraint here, and 48px is also exactly
     * Material's 48dp.
     *
     * DO NOT JUSTIFY THE 48 WITH A TOOL. Lighthouse's tap-target audit — the source of
     * the "48-CSS-pixel finger" — was REMOVED in v12.0.0 (2024-04-01), and axe's
     * `target-size` measures 24px, so no automated check ships a 48px floor any more. The
     * number stands on SC 2.5.5 and on nothing shrinking.
     *
     * THE BOX IS FONT-RELATIVE — `w-16 h-12`, which is 4rem x 3rem, the same
     * 64 x 48 at the 16px root every browser ships. It spent one revision in px and
     * the reason it did is worth keeping, because it was a good reason that has since
     * expired.
     *
     * The cards' heights used to come from an lg page grid clamped between two
     * absolute lengths, so they did NOT grow with the root font-size while every card
     * clips (`overflow-hidden` on Card) — a control that grew under text-only zoom was
     * simply sheared off. Measured then, worst bottom shear at 1440x900 for the old
     * build / a 3rem box / a 48px box: root 20px 0 / 16.0 / 0; root 22px
     * 25.5 / 57.5 / 21.5; root 24px 55 / 99 / 51. A px box was the only one of the
     * three that never did worse than what shipped before, so px it was, and the note
     * ended "the real defect is that a card cannot grow with its contents, and until
     * that changes a growing control only buys a clipped one".
     *
     * That is what changed. The height budget and the breakpoints are both
     * text-relative now (the breakpoint note above; `main` in index.astro), the page
     * grows and scrolls instead of clipping, and the sweep measures 0 ink lost from a
     * 16px root to a 40px one at each card's BOTTOM clip edge. So the protection a px
     * box bought no longer exists to buy: what it costs instead is a tap target that
     * shrinks against the type beside it, since 64 x 48 next to 40px text is a smaller
     * target in the reader's terms than 64 x 48 next to 16px text. Every figure below
     * about the declared box — 64 x 48, the 2px clearance, the target-size arithmetic —
     * is unchanged, because at the default root size this is the same box.
     *
     * THE KNOCK-ON THIS PARAGRAPH USED TO PREDICT WAS BACKWARDS, and it cost a shipped
     * defect, so it is corrected here rather than quietly replaced. It said the control
     * row's column-count queries "drop a column slightly before the controls
     * actually stop fitting", costing height and no ink. They dropped a column far too
     * LATE: the ladder stopped at two columns, two text-relative controls plus their gap
     * are 9rem, and a card is only ever as wide as the viewport allows — so once the text
     * is large enough two controls no longer fit a narrow card, the grid held the intro
     * card's copy column open at its own min-content width, and the card sheared the hero
     * copy. 136.84 of text ink at 320px wide and a 40px root; 47.44 at a 32px root, inside
     * the WCAG 1.4.4 bracket. On a 320px viewport two controls stop fitting at a 25px root
     * and the card starts shearing a BUTTON at 28. SAMPLE THE ONSET, DO NOT TAKE THE FIRST
     * ROOT A SWEEP HAPPENS TO HIT: that onset was reported at 32 from a sweep whose lowest
     * sample it was, and the same sweep measured the bottom edge while the damage was on
     * the right.
     *
     * THE BOUND IS GONE ENTIRELY NOW, which is the answer to the class rather than to the
     * instance. The ladder was first extended to reach one column, with the bound derived
     * from a fitted budget and asserted at every width; then the counting was deleted
     * outright — the control row wraps, so its minimum content width is one control at
     * every text size, and there is no number left to get wrong. That is what makes the
     * rem box safe to keep rather than merely preferable. The conclusion that survives: a
     * px bound left behind to part company with every other breakpoint was never the
     * answer, and a hand-tuned count compared against a text-relative box has to be
     * re-tuned every time either side moves — it was wrong twice here, in opposite
     * directions. `tests/control-geometry.test.ts` asserts the invariant that replaced it.
     *
     * What the build before last did here was accidental and is still worth knowing:
     * `max-h-[50px]` let the anchors grow to 50px and then stopped them, which is why
     * they survived zoom at all.
     *
     * Two things follow from declaring the box, and both are load-bearing:
     * the icon has to be centred by the CONTAINER, because `text-center` cannot
     * centre anything in an inline-block whose content box equals its content;
     * and `w-max` had to be REMOVED rather than out-ordered. Within one shortcut
     * UnoCSS emits BOTH conflicting declarations in authoring order and the LAST
     * one wins by the cascade (the minifier then drops the dead one) — so
     * `w-16 w-max` really does resolve to max-content, and only the reverse order
     * looks like the width surviving. The width CAN win, which is exactly why the token
     * has to be absent rather than merely early.
     *
     * NOTHING OUTSIDE THIS SHORTCUT MAY RESTATE THE WIDTH, and the container the
     * controls sit in is where that would most naturally happen. It used to size
     * them with `auto` tracks for exactly this reason; it is a wrapping row now
     * (BasicLayout) and the same rule holds with one fewer moving part — an item's
     * width comes from here, so a track size, a basis or a hard-coded 4rem on the
     * row would let the two drift apart and bring back the ragged columns. The
     * control-geometry test forbids all three on a control.
     *
     * The offset plate is written as ONE complete arbitrary value — offsets,
     * blur and colour together. Splitting it into a geometry utility and a
     * colour-only one is what made the plate invisible for as long as it
     * existed: presetWind3 expands the geometry to
     * `--un-shadow: 2px 2px 0 var(--un-shadow-color)` with no fallback, and a
     * colour-only arbitrary shadow does not define `--un-shadow-color`, so the
     * whole declaration was invalid at computed-value time and the controls
     * rendered flat. A complete value emits its own fallback and survives. The
     * portrait always did this and always cast its plate; the controls did not.
     *
     * `active:shadow-none` still wins: it sets the same `--un-shadow` variable
     * from a `:active` selector, which outranks the shortcut's own rule.
     *
     * box-shadow is deliberately OUTSIDE the colour transition, so the plate
     * snaps rather than fading. Two reasons, both measured. Press/release
     * symmetry: the press state and its 3px offset are both instant, and adding
     * box-shadow to the transition list makes the plate re-inflate over 300ms
     * after the button has already sprung back — on every click of all nine
     * plated elements. And it would buy nothing during a theme change anyway:
     * the card behind sweeps through mid-grey, so at the midpoint the border
     * sits at 1.01:1 and the label at 1.31:1 whatever the plate does. The plate
     * is not the outlier there.
     *
     * The declared box replaces the old `w-max`, whose removal no test caught at
     * the time. It was defended on the grounds that a control stretches to its
     * grid track without it, which is true and is now handled by the width
     * itself; a stretched control is also what the target-size audit used to
     * object to. There is no horizontal padding any more either: at 64px wide the
     * content box is 62px and holds any of these icons with room to spare, and
     * padding cannot survive alongside a box this size without contradicting it
     * (a 44px square, for comparison, has room for 2px of content beside the old
     * `px-5`, which is why that number was rejected).
     *
     * `shrink-0` on the surface is a LIVE GUARD, and the distinction from "load-bearing"
     * is the whole point: the mechanism it defends against became APPLICABLE again with the
     * wrapping row, but no reachable configuration currently triggers it. Removing the token
     * changes no control's rendered width at any measured configuration; force the row
     * narrower than one control and a control goes 64 -> 40 without it and holds 64 with it.
     * DO NOT OVERSTATE IT TO "load-bearing" — that invites someone to "verify" it by
     * deleting it, seeing nothing change, and concluding the note is stale. It is worth
     * knowing that it has been all three things in turn — necessary, inert, and
     * applicable-but-unexercised — because that is why it was never removed. It was added
     * for a real measured failure: the two goal CTAs were flex items, flex-shrink outranks
     * a declared width, and they measured 47.80px at lg with the width already in place.
     * Removing those CTAs left all seven remaining controls as grid items of a column
     * ladder, where nothing shrinks, and the token went inert — kept anyway, on the grounds
     * that the next control dropped into a flex row would silently lose its box.
     *
     * That is exactly what happened, to all seven at once: the ladder is gone and the
     * control row wraps, so every control is a flex item again and flex-shrink is once
     * more the one thing standing between a declared 64px box and a compressed one on a
     * narrow viewport. Keeping a token whose justification had expired turned out to
     * cost nothing and save the defect; `tests/control-geometry.test.ts` asserts it
     * (`pins the box against a flex parent`) rather than leaving it to hold by luck.
     *
     * The icon spans carry `shrink-0` at both call sites rather than relying on
     * there being slack. It costs one already-emitted rule and it is what stops
     * mechanism 3 above from ever recurring on a future wider icon.
     *
     * WHY 64 WIDE AND NOT A 48 SQUARE — asked and deliberately answered "leave
     * it", so the next person does not have to redo the research.
     *
     * 64 was never an aesthetic number: it was picked as 2px clear of the widest
     * button that shipped before, so that nothing shrank when the sizes were
     * unified. A 48px square is a one-token change (`w-[48px]`) and was built and
     * measured — all nine controls land 48.000 x 48.000, icons undeformed, tracks
     * 48px, the whole suite green, no clipping at any width.
     *
     * The two are accessibility-EQUIVALENT, which is the part worth recording:
     * both clear SC 2.5.8 (AA, 24px) and SC 2.5.5 (AAA, 44px) on bounding-box
     * measurement, and 48 lands exactly on Android's and Material's 48dp
     * recommendation while clearing Apple's 44pt. Nothing in the HCI literature
     * favours either aspect ratio — the one study that varies width and height
     * independently (MacKenzie & Buxton, CHI '92) yields two co-equal models that
     * disagree, and it explicitly rejects the "bigger total area is easier" model.
     *
     * The single geometric asymmetry, and it is thin: SC 2.5.8's size test asks
     * whether a solid axis-aligned square can be inscribed in the target, and with
     * `rounded-lg` (8px) a 48x48 box inscribes only 43.31px — 0.69px under the AAA
     * number — where 64x48 inscribes 48. That construction is only stated under
     * the 24px criterion, no shipping tool computes it, and both sizes clear 24 by
     * a mile, so it is not a reason on its own. It just happens to lean the same
     * way as leaving things alone.
     *
     * So the choice rests on grounds outside WCAG, i.e. it is purely aesthetic,
     * and the wider-than-tall silhouette is the one that shipped. Flip the width
     * token if the square is wanted; `public/preview.jpg` has to be regenerated
     * with it, because it is both the README hero and the OG image.
     *
     * Comments in THIS file are safe to write tokens in: the extraction pipeline
     * does not read the config (probed — a token planted in a config comment
     * emitted no rule). Inside `src/**` it does, including .astro frontmatter,
     * which is what the blocklist above is about. The orphan-rule test is the
     * backstop if that ever changes.
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
    shortcuts: {
        "control-surface": "text-[var(--text)] bg-[var(--background)] border border-[var(--accent)] hover:text-[var(--accent)] shadow-[2px_2px_0_var(--shadow)] active:text-[var(--accent)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:transition-none data-[leaving]:text-[var(--accent)] data-[leaving]:shadow-none data-[leaving]:translate-x-[3px] data-[leaving]:translate-y-[3px] data-[leaving]:transition-none transition-colors duration-300 ease-in-out cursor-pointer rounded-lg",
        "control": "control-surface text-xl w-16 h-12 shrink-0 inline-flex justify-center items-center",
        "control-cta": "control-surface text-xs min-h-12 w-full px-3 py-1 inline-flex flex-wrap items-center justify-center gap-x-2",
        "text-link": "underline decoration-from-font underline-offset-[0.18em] self-start text-[var(--text)] hover:text-[var(--accent)] active:text-[var(--accent)] active:transition-none data-[leaving]:text-[var(--accent)] data-[leaving]:transition-none transition-colors duration-300 ease-in-out",
        "chip-surface": "border border-[color-mix(in_srgb,var(--text)_32%,transparent)] rounded-[2px] text-[var(--text)] bg-[var(--background)] no-underline cursor-pointer hover:text-[var(--accent)] hover:border-[var(--accent)] active:text-[var(--accent)] active:border-[var(--accent)] active:transition-none data-[leaving]:text-[var(--accent)] data-[leaving]:border-[var(--accent)] data-[leaving]:transition-none transition-colors duration-300 ease-in-out",
        "chip": "chip-surface inline-flex items-center gap-[0.4em] min-h-11 min-w-11 px-[0.7rem] py-[0.3rem] text-xs font-bold tracking-[0.1em] uppercase",
        "chip-icon": "chip-surface inline-flex items-center justify-center shrink-0 w-11 h-11",
    },
    presets: [
        /**
         * EVERY `hover:` UTILITY ON THIS SITE IS EMITTED INSIDE `@media (hover: hover)`, AND THIS
         * SHORT PRESET IS THE WHOLE MECHANISM.
         *
         * THE DEFECT. A touch browser has no pointer to move away, so it applies `:hover` on tap
         * and holds it until the reader taps elsewhere. Reported on a physical iPhone 15 Pro Max
         * against a deploy preview: one goal card's way out sat in accent red while its sibling
         * did not, which reads as a selected state on a control that has none. It is not one
         * component's bug — every `hover:` token in this file and every hand-written `:hover` in
         * `src/**` has it. Counted against the built DOM rather than from the source: TWELVE hovered
         * elements on the home page — seven plated icon controls, the two goal cards' calls to action,
         * two role-card company links, and the Now card's info link, which wears a bare `hover:` utility
         * and belongs to neither named idiom — plus six more on the wall (the back link, three sport
         * chips, and the linked bibs). COUNT THE PAGE YOU MEAN: a home-page total labelled as the
         * whole site's is the mistake this breakdown is written out to prevent.
         *
         * WHY THE FIX BELONGS IN THE CONFIG AND NOT IN THE SHORTCUTS. Guarding each of the two
         * shortcuts would fix today's wearers and leave the next `hover:` token anyone writes
         * unguarded — the same shape as the column-count ladder this file deleted, a rule that has
         * to be re-applied by hand every time the site grows. A variant is the one place the
         * decision can be made once. `presetWind3` ships its own `hover:` variant and variants
         * resolve in PRESET ORDER, so this has to sit above it in the list to win; below it the
         * probe emitted zero guarded rules and looked exactly like a working config.
         *
         * THIS IS NOT A LOSS ON TOUCH, and the site's own prose has been saying so for three
         * revisions: `text-link` exists because a hover colour is the one cue that cannot survive
         * a phone, Patch.astro says "there is no hover on a phone", and tests/build-output.test.ts
         * rejects a `:hover` rule offered as proof of an affordance. On a device that cannot
         * hover, the state is never information — only ever a misfire — so guarding it removes
         * nothing a reader could have meant to produce.
         *
         * THE HAND-WRITTEN `:hover` RULES DO NOT COME THROUGH HERE. Two of them exist, both on the
         * patch wall, and they carry the guard in their own preludes; tests/build-output.test.ts
         * walks every built sheet and fails the build on any `:hover` rule outside a
         * `(hover: hover)` context, which is what keeps the next authored one honest.
         *
         * ONE MEASUREMENT NOTE WORTH MORE THAN THE REST. `Emulation.setEmulatedMedia` CANNOT set
         * this feature — it reports `hover: hover` in both states, so a probe written that way
         * passes on a completely unguarded build. `setDeviceMetricsOverride({mobile: true})` plus
         * `setTouchEmulationEnabled` is the lever whose read-back actually differs.
         */
        {
            name: "hover-needs-a-pointer",
            variants: [
                (matcher) => {
                    if (!matcher.startsWith("hover:")) return;
                    return {
                        matcher: matcher.slice("hover:".length),
                        selector: (sel) => `${sel}:hover`,
                        parent: "@media (hover: hover)",
                    };
                },
            ],
        },
        presetWind3(),
        /**
         * `display` is NOT part of presetIcons' default output. Without it the
         * icon <span> stays an inline box, width/height are ignored, and the icon
         * renders at zero size — i.e. invisibly. This line is load-bearing.
         *
         * `vertical-align` is here for the consequence of that inline-block: the
         * box is 1em tall and its BOTTOM sits on the text baseline, while capital
         * letters only reach cap-height above it. The icon therefore overhangs the
         * cap line by (1em - cap)/2 and reads as riding high beside its text. The
         * offset scales with font-size, so it was one defect in four places, at
         * two sizes: measured 2.954px on the 20px greeting and both 20px job
         * titles, and 1.772px on the 12px footer heart — a uniform 0.1477em.
         *
         * Shifting the box down by half the leftover centres it on the cap band.
         * -0.145em is the midpoint of the ideal shift for the faces this stack can
         * actually resolve, and it is NOT tuned to one machine: the ideal is
         * (1 - cap/em)/2, and cap/em was measured here at 0.705 for the system
         * face, 0.717 Helvetica, 0.716 Arial — a 0.1415–0.1475em span. Across a
         * cap ratio anywhere in 0.68–0.73, which brackets every sans-serif in the
         * declared stack, the residual stays under a third of a pixel at 20px.
         *
         * Three alternatives were built and measured against the live page before
         * this one, and the numbers are the reason it is a length:
         *   - `middle` is browser-computed and so adapts per font, but it aligns
         *     to half the X-height, not half the cap height. It overshoots the
         *     other way: 1.83px LOW at 20px. Trading high for low is not a fix.
         *   - -0.125em, the constant Font Awesome and Bootstrap Icons ship, leaves
         *     0.45px. It is not derived from a cap height at all: 0.125em is Font
         *     Awesome's own webfont DESCENT — 64 of 512 units, read off
         *     fa-solid-900.ttf, with the ascent the exact complement at 448/512 —
         *     so the value drops its SVG box onto the font box its webfont glyphs
         *     used to occupy. FA's actual cap height is 421/512 = 0.82em, nowhere
         *     near 0.75em, and FA6 kept the same -0.125em while moving its descent
         *     to 0.1465em, which a cap-derived constant would not do. Note also
         *     where FA ships it: on `.svg-inline--fa` in its SVG sheet, not on the
         *     webfont classes, which carry no vertical alignment at all. Bootstrap
         *     Icons does put it on its main `.bi::before` rule — over a glyph box
         *     that is a FULL em with zero descent (300/300, 0/300), i.e. the same
         *     shape as our Iconify artwork. So the number is an inherited
         *     convention, and inheriting it here under-shifts by that 0.45px.
         *   - `calc((1cap - 1em) / 2)` is exact by construction and Chromium does
         *     accept it — it computed -2.9541px against an ink-measured 2.954, two
         *     independent instruments agreeing to four decimals. It was still
         *     rejected on its support floor: per MDN browser-compat-data the `cap`
         *     unit needs Chrome/Edge 118+, Safari 17.2+ or Firefox 97+ — Baseline
         *     Widely Available only since 2026-06-11 — and the browsers that lack
         *     it keep the whole defect. (Do not quote Chrome 111 / Safari 16.4 for
         *     this: those are the floors of OTHER length units in the same BCD
         *     file, `rex`/`rch`/`ric`/`rlh` and `lh`/`rlh`, and reading one of those
         *     rows for this unit makes the swap look about two years safer than it
         *     is.) What the exact spelling buys over the constant is
         *     0.0027em of residual, which is 0.05px on the 20px greeting at the
         *     default root size and grows with the text — 0.07px at root 20,
         *     0.08px at root 24 — so it is a fixed em fraction, not a fixed 0.06px.
         *     Elegance is not worth a support floor for that.
         *
         * This belongs in the preset rather than at the three call sites because
         * baseline alignment is a property of "a 1em icon in a line of text", not
         * of any one heading — and because the alternative is remembering a token
         * every future inline icon needs. It is also the mechanism presetIcons
         * documents for this: `vertical-align` is the example property in its own
         * "set extra CSS properties" section, with `middle` as the illustrative
         * value. The mechanism is taken from the docs; the value is measured.
         *
         * It is applied to all fourteen icons and does nothing to ten of them: the
         * six social links, both toggle glyphs and both progress-bar icons sit in
         * flex containers, so they are BLOCKIFIED — their computed `display` is
         * `block`, not the declared `inline-block`, verified by reading it off the
         * live page — and `vertical-align` has no effect on a block-level box that
         * is not in an inline formatting context. They are centred by their
         * containers instead.
         *
         * Measured rather than argued from the spec, because the wording "does not
         * apply to flex items" is loose enough to hide a mistake: forcing an absurd
         * `-3em` onto every icon moves the four inline ones by 57px and 34px and
         * leaves nine of the ten flex ones exactly where they were, relative to
         * their own parent. The tenth is whichever toggle glyph the current theme
         * hides, which is `display:none` and has no box to move at all — and note
         * that measuring it ABSOLUTELY says all ten moved, because the reflow above
         * them is real; a hidden element's all-zero rect at the viewport origin then
         * fakes a shift in the relative measurement too. At the value actually
         * shipped none of this arises: nothing on the page moves at all.
         *
         * One side effect to expect rather than rediscover: presetIcons writes
         * every extra property onto the inlined `<svg>` in the mask data URI as an
         * attribute as well as into the rule. So each icon's data URI now carries
         * a `vertical-align='-0.145em'` attribute, which is inert there — the SVG
         * is only ever a mask, and this is already true of `display`. It is why the
         * raw sheet grows 686 bytes (14 attributes at 26 bytes, 14 declarations at
         * 23) for a change worth 23 bytes brotli on the wire.
         *
         * Quote that total and not a split between the two halves: the split is not
         * stable. Measured on this build, deleting all 364 bytes of attribute
         * repetition changes brotli by +4 bytes — it compresses to less than
         * nothing — while deleting the 14 declarations alone saves 13. A review
         * panel measured the reverse on the previous revision and concluded the
         * whole 13 was the attribute. Both readings are compression context, not a
         * property of the change. (presetIcons' documented `processor` option would
         * emit the declaration without the attribute if the raw bytes ever matter;
         * `extraProperties` is kept because it is the documented spelling for this
         * and the wire difference is inside the noise.)
         */
        presetIcons({scale: 1, extraProperties: {"display": "inline-block", "vertical-align": "-0.145em"}}),
    ],
});
