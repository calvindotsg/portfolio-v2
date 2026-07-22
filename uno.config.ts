import {defineConfig, presetIcons, presetWind3} from "unocss";

import {GOALS, LINKS} from "./src/lib/constants";
import {iconClass} from "./src/lib/icons";

export default defineConfig({
    /** Icon classes are derived from constants at render time, so UnoCSS never
     *  sees them literally in source — every configured icon is safelisted here. */
    safelist: [...LINKS.map((l) => iconClass(l.logo)), ...GOALS.map((g) => iconClass(g.cta_logo))],
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
