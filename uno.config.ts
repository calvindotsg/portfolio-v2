import {defineConfig, presetIcons, presetWind3} from "unocss";

import {CAREER, FOOTER, GOALS, LINKS, WELCOME} from "./src/lib/constants";
import {iconClass} from "./src/lib/icons";

export default defineConfig({
    /** Icon classes are derived from constants at render time, so UnoCSS never
     *  sees them literally in source — every configured icon is safelisted here. */
    safelist: [
        ...LINKS.map((l) => iconClass(l.logo)),
        ...GOALS.map((g) => iconClass(g.cta_logo)),
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
     * The one styled control. Nine elements wear it: eight navigating anchors
     * (six social links in the intro card, two goal CTAs) and the theme toggle,
     * which is a real button. It is a class and not a component because those
     * elements legitimately differ — only the look is shared, and a component
     * that picks the caller's element is how a `button` ended up illegally
     * nested inside an `a` in the first place.
     *
     * There used to be a `control-surface` base plus `control` and
     * `control-compact` box variants, and the two variants disagreed about every
     * box metric: the anchors rendered 57–62 x 46 (five different widths) and the
     * toggle 60 x 40. Three separate mechanisms produced that, all of them now
     * gone:
     *
     *   1. Nothing declared a width. `w-max` plus horizontal padding made each
     *      button `42px + its icon's width`, and presetIcons emits each icon at
     *      the ARTWORK's aspect ratio — 0.75em for strava, 0.88em for
     *      linkedin/instagram, 0.97em for github/telegram, 1em for the two Remix
     *      icons. So the icon's proportions leaked into the button's.
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
     * `w-16 h-12` is 64 x 48px, which is 2px larger on each axis than the widest
     * button that used to ship, so nothing shrank. Both numbers are rem, and the
     * old caps were px against rem contents — `max-h-[50px]` began clipping the
     * anchors at any root font-size above 17.45px, i.e. text-only zoom broke them
     * before this change. 48px also clears the 48-CSS-pixel finger Lighthouse's
     * tap-target audit uses, where 46px was merely escaping report because its
     * neighbours were far enough away, and it clears WCAG 2.2 SC 2.5.5's 44x44
     * (SC 2.5.8's 24x24 floor was never the binding constraint here).
     *
     * Two things follow from declaring the box, and both are load-bearing:
     * the icon has to be centred by the CONTAINER, because `text-center` cannot
     * centre anything in an inline-block whose content box equals its content;
     * and `w-max` had to be REMOVED rather than overridden, because inside a
     * shortcut it beats a width utility in either authoring order.
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
     * The icon spans carry `shrink-0` at all three call sites rather than relying
     * on there being slack. It costs one already-emitted rule and it is what stops
     * mechanism 3 above from ever recurring on a future wider icon.
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
        // `display` is NOT part of presetIcons' default output. Without it the
        // icon <span> stays an inline box, width/height are ignored, and the icon
        // renders at zero size — i.e. invisibly. This line is load-bearing.
        presetIcons({scale: 1, extraProperties: {display: "inline-block"}}),
    ],
});
