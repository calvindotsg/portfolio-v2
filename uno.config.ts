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
     * `shadow-[var(--shadow)]` is listed BEFORE `shadow-custom` deliberately. As
     * separate classes the sheet emits `.shadow-[var(--shadow)]` first and
     * `.shadow-custom` wins `--un-shadow`; a shortcut collapses to ONE rule where
     * the LAST-listed utility wins instead. This order reproduces today's winner.
     * (Both forms currently compute to `box-shadow: none`, because
     * `--un-shadow-color` is never defined — a separate, pre-existing bug. The
     * ordering is what keeps this change neutral once that bug is repaired.)
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
        "control-surface": "text-xl px-5 text-[var(--text)] bg-[var(--background)] border border-[var(--accent)] hover:text-[var(--accent)] shadow-[var(--shadow)] shadow-custom active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-colors duration-300 ease-in-out cursor-pointer rounded-lg",
        "control": "control-surface inline-block w-max text-center py-2 max-h-[50px]",
        "control-compact": "control-surface inline-flex justify-center items-center py-1 max-h-[40px] max-w-[60px]",
    },
    theme: {
        boxShadow: {custom: "2px 2px 0"},
        colors: {gray: {300: "#D4D4D4"}},
    },
    presets: [
        presetWind3(),
        // `display` is NOT part of presetIcons' default output. Without it the
        // icon <span> stays an inline box, width/height are ignored, and the icon
        // renders at zero size — i.e. invisibly. This line is load-bearing.
        presetIcons({scale: 1, extraProperties: {display: "inline-block"}}),
    ],
});
