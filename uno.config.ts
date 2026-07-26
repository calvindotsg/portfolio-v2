import {defineConfig, presetIcons, presetWind3} from "unocss";

import {CAREER, FOOTER, GOALS, LINKS, WELCOME} from "./src/lib/constants";
import {iconClass} from "./src/lib/icons";

export default defineConfig({
    /** Icon classes are derived from constants at render time, so UnoCSS never
     *  sees them literally in source — every configured icon is safelisted here. */
    safelist: [
        ...LINKS.map((l) => iconClass(l.logo)),
        ...GOALS.map((g) => iconClass(g.goal_logo)),
        ...CAREER.map((c) => iconClass(c.icon)),
        iconClass(WELCOME.greeting_icon),
        iconClass(FOOTER.icon),
    ],
    /** UnoCSS extracts from the text of `<style>` blocks too, so the declaration
     *  `position: static` in IntroCard emits a utility rule for a class no
     *  element wears. A comment can be reworded around; a real declaration
     *  cannot, so the token is blocked instead. */
    blocklist: ["static"],
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
     * The box is in PX, deliberately, and a rem box was tried first and measured
     * worse. The cards' heights come from the lg page grid and do NOT grow with
     * the root font-size, and every card clips (`overflow-hidden` on Card), so a
     * control that grows under text-only zoom is simply sheared off. `h-12` — 3rem
     * — grows to 60px at a 20px root and the bottom control row loses 16px to the
     * card edge at 1440x900, where the old build lost nothing. Measured worst
     * bottom shear at 1440x900, old build / 3rem box / this 48px box: root 20px
     * 0 / 16.0 / 0; root 22px 25.5 / 57.5 / 21.5; root 24px 55 / 99 / 51. The px
     * box is the only one of the three that never does worse than what shipped
     * before, at any root size.
     *
     * What the old build did here was accidental: `max-h-[50px]` let the anchors
     * grow to 50px and then stopped them, which is why they survived zoom. Do not
     * read this as "px good, rem bad" — the real defect is that a card cannot grow
     * with its contents, and until that changes a growing control only buys a
     * clipped one. Residual shear above a 22px root is that same pre-existing
     * defect, now marginally smaller than before.
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
     * `.button-grid` deliberately keeps `auto` tracks (BasicLayout). Now that
     * every item is one size the tracks are equal without being told, so the
     * width lives in exactly one place; hard-coding 4rem tracks there would let
     * the two drift apart and bring back the ragged columns.
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
     * `shrink-0` on the surface was NOT belt-and-braces when it was added, and it
     * is worth keeping now that the case which proved it has gone: the two goal
     * CTAs were flex items, flex-shrink outranks a declared width, and they
     * measured 47.80px at lg with the width already in place. Nothing wearing this
     * class is a flex item today — all seven are direct children of `.button-grid`
     * and therefore grid items — so the token is currently inert. It stays because the next
     * control to be dropped into a flex row would silently lose the box otherwise,
     * and because the failure it prevents is invisible until measured.
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
        "control": "text-xl w-[64px] h-[48px] shrink-0 inline-flex justify-center items-center text-[var(--text)] bg-[var(--background)] border border-[var(--accent)] hover:text-[var(--accent)] shadow-[2px_2px_0_var(--shadow)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-colors duration-300 ease-in-out cursor-pointer rounded-lg",
    },
    presets: [
        presetWind3(),
        // `display` is NOT part of presetIcons' default output. Without it the
        // icon <span> stays an inline box, width/height are ignored, and the icon
        // renders at zero size — i.e. invisibly. This line is load-bearing.
        presetIcons({scale: 1, extraProperties: {display: "inline-block"}}),
    ],
});
