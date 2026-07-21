import {defineConfig, presetWind3} from "unocss";

export default defineConfig({
    theme: {
        boxShadow: {custom: "2px 2px 0"},
        colors: {gray: {300: "#D4D4D4"}},
    },
    presets: [presetWind3()],
});
