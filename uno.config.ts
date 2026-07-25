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
     * The one styled control surface. Two different elements wear it: the eight
     * navigating controls are anchors, the theme toggle is a real button. It is a
     * class and not a component because those elements legitimately differ — only
     * the look is shared, and a component that picks the caller's element is how a
     * `button` ended up illegally nested inside an `a` in the first place.
     *
     * `control` and `control-compact` are never worn together, and every box
     * metric lives in the variant rather than in the surface: no two conflicting
     * utilities land on one element, so nothing here depends on emit order.
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
     * `w-max` on `control` IS load-bearing, and no test in this repo catches its
     * removal. Both call sites make the anchor a grid/flex item, so it blockifies
     * and stretches to its track: dropping `w-max` widens controls by up to 5.0px
     * (worst at 320-390px, the commonest phone widths), which is the same stretch
     * that made Lighthouse's target-size audit fail before this change.
     *
     * `inline-block` beside it is defensive only — measured inert at both current
     * call sites, since each blockifies the anchor anyway. Kept so the shortcut
     * stays correct if a control is ever used outside a grid or flex container;
     * do not cite it as load-bearing.
     *
     * `control-compact` omits `w-max` because it would be a no-op: the toggle's
     * max-content width (2x20px padding + 2px border + an 18px icon) is exactly
     * its own `max-w-[60px]` cap. Both theme icons measure 18px, so the width is
     * 60.00px in every theme and at every width either way.
     */
    shortcuts: {
        "control-surface": "text-xl px-5 text-[var(--text)] bg-[var(--background)] border border-[var(--accent)] hover:text-[var(--accent)] shadow-[2px_2px_0_var(--shadow)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-colors duration-300 ease-in-out cursor-pointer rounded-lg",
        "control": "control-surface inline-block w-max text-center py-2 max-h-[50px]",
        "control-compact": "control-surface inline-flex justify-center items-center py-1 max-h-[40px] max-w-[60px]",
    },
    presets: [
        presetWind3(),
        // `display` is NOT part of presetIcons' default output. Without it the
        // icon <span> stays an inline box, width/height are ignored, and the icon
        // renders at zero size — i.e. invisibly. This line is load-bearing.
        presetIcons({scale: 1, extraProperties: {display: "inline-block"}}),
    ],
});
