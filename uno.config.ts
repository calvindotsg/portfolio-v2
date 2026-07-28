import {defineConfig, presetIcons, presetWind3} from "unocss";

import {CAREER, FOOTER, GOALS, LINKS, NEXT_RACE, NOW, PATCHES, WELCOME} from "./src/lib/constants";
import {iconClass} from "./src/lib/icons";

export default defineConfig({
    /**
     * Icon classes are derived from constants at render time, so UnoCSS never
     * sees them literally in source — every configured icon is safelisted here.
     *
     * NOTE WHAT IS NOT IN THIS LIST: `EVENTS`. The patch wall draws a sport's icon,
     * and it gets it from the GOAL that owns the sport (`goalForSport` in
     * constants.ts) rather than from a table of its own, so the two entries below
     * for GOALS already cover every bib on the wall. A second sport→icon map beside
     * EVENTS would ship class tokens this list never saw, and a presetIcons class
     * with no rule renders as a mask box at zero size — an icon that is silently
     * absent, with correct markup and a green build.
     */
    safelist: [
        ...LINKS.map((l) => iconClass(l.logo)),
        ...GOALS.map((g) => iconClass(g.goal_logo)),
        ...CAREER.map((c) => iconClass(c.icon)),
        iconClass(WELCOME.greeting_icon),
        iconClass(FOOTER.icon),
        iconClass(NOW.explainer_icon),
        iconClass(PATCHES.home_icon),
        iconClass(PATCHES.strava_icon),
        iconClass(NEXT_RACE.icon),
    ],
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
    blocklist: ["static", "tabular-nums"],
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
     *      shipped squashed 10% horizontally. An earlier version of this comment
     *      read that backwards and called it "an 18px icon"; the icon is 1em and
     *      the cap was deforming it.
     *
     * So the box is now DECLARED rather than capped, once, for every control:
     * 64 x 48px, which is 2px larger on each axis than the widest button that used
     * to ship, so nothing shrank. 48px clears WCAG 2.2 SC 2.5.5's 44x44 AAA
     * target, which the 40px toggle was the one control to fail; SC 2.5.8's 24x24
     * AA floor was never the binding constraint here, and 48px is also exactly
     * Material's 48dp.
     *
     * An earlier version of this comment justified the 48 with "the 48-CSS-pixel
     * finger Lighthouse's tap-target audit uses". Do not restore that: the
     * tap-target audit was REMOVED in Lighthouse v12.0.0 (2024-04-01), so no
     * automated tool ships a 48px check any more — axe's `target-size` measures
     * 24px. The number stands on SC 2.5.5 and on nothing shrinking, not on a tool.
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
     * and the card starts shearing a BUTTON at 28 — an onset an earlier draft of this note
     * put at 32, which was the first root its text-only sweep happened to sample. The two
     * claims are not opposites by accident: BOTH rest on comparing a rem bound against a
     * rem control, and the sweep that seemed to confirm the optimistic one measured the
     * bottom edge while the damage was on the right.
     *
     * THE BOUND IS GONE ENTIRELY NOW, which is the answer to the class rather than to the
     * instance. The ladder was first extended to reach one column, with the bound derived
     * from a fitted budget and asserted at every width; then the counting was deleted
     * outright — the control row wraps, so its minimum content width is one control at
     * every text size, and there is no number left to get wrong. That is what makes the
     * rem box safe to keep rather than merely preferable. What the old paragraph got right
     * is its conclusion: a px bound left behind to part company with every other
     * breakpoint was never the answer. What it got wrong generalises past the sign of the
     * error — a hand-tuned count compared against a text-relative box has to be re-tuned
     * every time either side moves, and the two times it was wrong here were in opposite
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
     * looks like the width surviving. An earlier draft of this comment claimed the
     * width could never win; it can, and that is exactly why the token has to be
     * absent rather than merely early.
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
     * An earlier draft of this paragraph claimed the token was load-bearing again, which
     * overstated it in the direction that invites someone to "verify" it by deleting it,
     * seeing nothing change, and concluding the note is stale. It is worth knowing that it
     * has been all three things in turn — necessary, inert, and applicable-but-unexercised —
     * because that is why it was never removed. It was added for a real measured failure: the
     * two goal CTAs were flex items, flex-shrink outranks a declared width, and they
     * measured 47.80px at lg with the width already in place. Removing those CTAs left
     * all seven remaining controls as grid items of a column ladder, where nothing
     * shrinks, and the token went inert — an earlier draft of this note said so and
     * argued for keeping it anyway, on the grounds that the next control dropped into a
     * flex row would silently lose its box.
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
    shortcuts: {
        "control": "text-xl w-16 h-12 shrink-0 inline-flex justify-center items-center text-[var(--text)] bg-[var(--background)] border border-[var(--accent)] hover:text-[var(--accent)] shadow-[2px_2px_0_var(--shadow)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-colors duration-300 ease-in-out cursor-pointer rounded-lg",
    },
    presets: [
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
         *     file, `rex`/`rch`/`ric`/`rlh` and `lh`/`rlh`. An earlier draft of
         *     this comment conflated them and made the swap look about two years
         *     safer than it is.) What the exact spelling buys over the constant is
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
