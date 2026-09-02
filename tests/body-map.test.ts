import {existsSync, readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {
    bodyMapSvg, DUAL_BOX, muscleSlugsIn, OPACITIES, SKIPPED_REGIONS, slugsIn,
} from "../src/lib/body-map";

/**
 * THE MUSCLE MAP, AND THE THREE THINGS ABOUT IT THAT CANNOT BE READ OFF THE DRAWING.
 *
 * This suite exists because the map is the one element of the share card whose correctness is
 * invisible in a screenshot. A figure with a muscle missing, a figure lit from the wrong side,
 * and a figure letterboxed inside its own box all render as "a body with some red on it", which
 * is exactly what a correct one renders as. So the assertions here are about the things a
 * picture cannot show:
 *
 *   - EVERY SLUG THE CARD SHADES RESOLVES. The alias table maps movements onto slugs; a slug
 *     that is not in the vendored data lights nothing, and the map draws a plausible figure with
 *     one group silently unshaded. Nothing downstream can tell that from a movement that really
 *     does not work that group.
 *   - THE BOX IS SQUARE. `preserveAspectRatio` renders a box at its SMALLER dimension, so a
 *     non-square dual box letterboxes both figures and shrinks the map with no error anywhere.
 *     That is measured history rather than theory — it shrank every map in the proof of
 *     concept's first two design rounds.
 *   - THE MODULE CHOOSES NO COLOUR. It takes three and must emit those three and nothing else,
 *     which is what lets `src/lib/palette.ts` stay the only home for a value. A hex that crept
 *     into the renderer would be right in at most one theme and would never be noticed, because
 *     the light card is the one anybody looks at.
 *
 * The vendored data itself is asserted here too — its licence and the absence of any Apache
 * text — because that directory is third-party content in a public MIT repository and the
 * obligation travels with the files rather than with the module that reads them.
 */

/** The slugs the card's front figure can light, from the card's own list. */
const NEEDED_FRONT = "abs adductors biceps calves chest deltoids forearm neck obliques"
    + " quadriceps tibialis trapezius triceps";
const NEEDED_BACK = "adductors calves deltoids forearm gluteal hamstring lower-back neck"
    + " trapezius triceps upper-back";

const SENTINEL = {fillOn: "SENTINEL-ON", fillOff: "SENTINEL-OFF", outline: "SENTINEL-OUTLINE"};

describe("the muscle map", () => {
    it("holds every slug the card shades, in the view that shades it", () => {
        const front = new Set(slugsIn("front"));
        const back = new Set(slugsIn("back"));
        expect(NEEDED_FRONT.split(" ").filter((slug) => !front.has(slug)),
            "the card lights these on the front figure and the vendored data has no path for "
            + "them, so they shade nothing and the map draws a body with a group silently missing")
            .toEqual([]);
        expect(NEEDED_BACK.split(" ").filter((slug) => !back.has(slug)),
            "the card lights these on the back figure and the vendored data has no path for them")
            .toEqual([]);
    });

    /**
     * THE SQUARE BOX, ASSERTED AS ARITHMETIC RATHER THAN AS A STRING. Comparing the constant to
     * itself would pass whatever it said; the width and the height are pulled apart and compared,
     * which is the only form of this assertion that can fail.
     */
    it("draws the dual view in a square box", () => {
        const [minX, minY, width, height] = DUAL_BOX.split(/\s+/).map(Number);
        expect([minX, minY], "the dual box no longer starts at the origin").toEqual([0, 0]);
        expect(width, "the dual view's box is not square. preserveAspectRatio renders a box at "
            + "its smaller dimension, so both figures letterbox inside their own frame and the "
            + "map shrinks with nothing reporting it")
            .toBe(height);
        const svg = bodyMapSvg({front: new Set(), back: new Set(), colours: SENTINEL, px: 600});
        expect(svg).toContain(`viewBox="${DUAL_BOX}"`);
        expect(svg, "the map is sized by one number because the box is square")
            .toContain(`width="600" height="600"`);
    });

    /**
     * THE SIX NON-MUSCLE REGIONS ARE ABSENT FROM THE OUTPUT, not merely unlit. Drawing a head at
     * the unlit fill would say somebody measured it and found it unworked, which is a claim the
     * data cannot support — see NOT_A_MUSCLE in the module.
     */
    it("draws none of the six regions no movement can light", () => {
        const paths = JSON.parse(readFileSync("src/lib/anatome/body-paths.json", "utf8"));
        const svg = bodyMapSvg({
            front: new Set(SKIPPED_REGIONS),
            back: new Set(SKIPPED_REGIONS),
            colours: SENTINEL,
            px: 600,
        });
        expect(SKIPPED_REGIONS.length, "SKIPPED_REGIONS is empty — this gate would assert nothing")
            .toBe(6);
        for (const view of ["front", "back"] as const) {
            for (const entry of paths.male[view]) {
                if (!SKIPPED_REGIONS.includes(entry.slug)) continue;
                for (const runs of Object.values(entry.path) as string[][]) {
                    for (const d of runs) {
                        expect(svg.includes(d),
                            `${entry.slug} is drawn on the ${view} figure. It is not a muscle `
                            + "group, nothing can light it, so drawing it at the unlit fill "
                            + "claims it was measured and found unworked")
                            .toBe(false);
                    }
                }
            }
        }
        expect(muscleSlugsIn("front").some((slug) => SKIPPED_REGIONS.includes(slug))).toBe(false);
    });

    /**
     * THE SENTINEL PASS, WHICH IS WHAT MAKES THE "NO COLOUR" CLAIM CHECKABLE. Three values that
     * are not colours go in; the output must carry those three and nothing that could be a
     * colour. Asserting only that the sentinels appear would pass a module that ALSO typed a hex.
     */
    it("emits the three colours it is handed and no colour of its own", () => {
        const svg = bodyMapSvg({
            front: new Set(["chest", "abs"]),
            back: new Set(["gluteal"]),
            colours: SENTINEL,
            px: 400,
        });
        for (const value of Object.values(SENTINEL)) expect(svg).toContain(value);
        expect(svg.match(/#[0-9A-Fa-f]{3,8}\b/g),
            "the map emitted a literal colour. Every value it draws with is an argument, so a "
            + "hex here has no home in src/lib/palette.ts and is right in at most one theme")
            .toBeNull();
        const source = readFileSync("src/lib/body-map.ts", "utf8");
        expect(source.match(/#[0-9A-Fa-f]{3,8}\b/g),
            "src/lib/body-map.ts contains a literal colour").toBeNull();
    });

    /**
     * THE POLARITY RULE, AS A COMPARISON RATHER THAN AS TWO NUMBERS. `/design`'s Data
     * Visualization section requires the marked region to stand further from the surface than the
     * remainder; a map drawn the other way round reads as a whole body worked. Asserting `0.28`
     * would pass a swap that kept both figures.
     */
    it("draws the worked regions with more presence than the remainder", () => {
        expect(OPACITIES.lit, "the worked regions must stand further from the ground than the "
            + "remainder, or the map reads as a whole body worked")
            .toBeGreaterThan(OPACITIES.unlit);
        expect(OPACITIES.outline, "the silhouette is context and must not out-draw the shading "
            + "it frames").toBeLessThan(OPACITIES.lit);
        const svg = bodyMapSvg({front: new Set(["chest"]), back: new Set(), colours: SENTINEL, px: 10});
        expect(svg).toContain(`fill="${SENTINEL.fillOn}" opacity="${OPACITIES.lit}"`);
        expect(svg).toContain(`fill="${SENTINEL.fillOff}" opacity="${OPACITIES.unlit}"`);
    });

    /**
     * THE VENDORED LICENCE IS THE ATTRIBUTION MIT REQUIRES, and it travels with the data rather
     * than with this module — so it is asserted over the directory. The Apache half is the
     * decision recorded in `src/lib/anatome/README.md`: taking the paths from the MIT original
     * removes an obligation, and a file that arrived from the other project would reintroduce it
     * with nothing else noticing.
     */
    it("carries the upstream's MIT licence and no Apache text", () => {
        expect(existsSync("src/lib/anatome/LICENSE"),
            "the vendored data has no licence beside it, which is the attribution MIT requires")
            .toBe(true);
        const licence = readFileSync("src/lib/anatome/LICENSE", "utf8");
        expect(licence).toContain("MIT License");
        expect(licence, "the copyright line is the attribution itself")
            .toContain("Copyright (c) 2022 ELABBASSI Hicham");
        for (const file of ["LICENSE", "README.md", "body-paths.json", "body-wrappers.json",
            "refresh.mjs"]) {
            expect(readFileSync(`src/lib/anatome/${file}`, "utf8").toLowerCase(),
                `src/lib/anatome/${file} names Apache. The paths are vendored from the MIT `
                + "original precisely so that obligation stays out of this repository")
                .not.toContain("apache");
        }
    });
});
