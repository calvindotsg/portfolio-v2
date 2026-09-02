import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {MARK_GEOMETRY, SIZE_LADDER, markFill, markSvg} from "../src/lib/brand-mark";
import {GOALS} from "../src/lib/goal";
import {PALETTE, valueIn} from "../src/lib/palette";
import {pageCss} from "./helpers/css";

/**
 * THE BRAND MARK IS THE ONE PLACE THIS REPOSITORY AUTHORS GEOMETRY, AND THIS SUITE IS WHAT
 * KEEPS THAT SINGULAR.
 *
 * `src/lib/brand-mark.ts` owns the drawing; `src/lib/palette.ts` owns the values; between
 * them nothing about the mark is written down twice. Two failure modes follow from that
 * split, and every assertion here is aimed at one of them:
 *
 *   1. A COLOUR GETS TYPED IN. The mark is served as three files a consumer fetches without
 *      a stylesheet, so those files must contain literal hexes — which is exactly the
 *      condition under which somebody types one rather than reading it. The palette checks
 *      below read `PALETTE` and refuse any hex that is not in it, so a typo that happens to
 *      look plausible is red rather than shipped.
 *   2. THE DRAWING FORKS. Decision 7 of plan 048 is that there is ONE drawing at every size,
 *      accepting that the rays close up at 16px. A size-conditional shape would be a second
 *      mark to keep in step, so the ray count is asserted at every step of the ladder rather
 *      than once.
 *
 * The fill is checked against `GOALS` rather than against a number, because a figure typed
 * here would be a third home for the year's progress and would go stale on the bot's next
 * commit — the same reason `tests/derived-figures.test.ts` computes rather than quotes.
 */

/** Every hex-like token in a string, uppercased, so a comparison is case-insensitive. */
function hexes(svg: string): string[] {
    return (svg.match(/#[0-9A-Fa-f]{3,8}/g) ?? []).map((h) => h.toUpperCase());
}

/** The set of values the palette actually publishes, in both themes. */
function paletteHexes(): Set<string> {
    const out = new Set<string>();
    for (const token of PALETTE) {
        out.add(token.light.toUpperCase());
        out.add(token.dark.toUpperCase());
    }
    return out;
}

const built = (path: string): string => readFileSync(path, "utf8");

describe("the mark's fill is the year, derived", () => {
    /**
     * The average of each goal's OWN fraction — not the sum of kilometres over the sum of
     * targets. Cycling's target is an order of magnitude above running's, so a sum-based
     * ratio would be the cycling goal with a rounding error attached and a doubled running
     * year would be invisible in it. Computed here from `GOALS` so this test cannot be the
     * place the figure is written down.
     */
    it("averages the two goals' clamped fractions", () => {
        const expected = GOALS.reduce((acc, g) => acc + g.current_progress / g.total_goal, 0) / GOALS.length;
        expect(markFill()).toBeCloseTo(expected, 12);
    });

    /**
     * `GOALS` clamps `current_progress` to `total_goal`, so an overshot year cannot push the
     * bar past its track. Asserted here as well as there because the bar is drawn from this
     * function and a future unclamped source would be silent otherwise.
     */
    it("stays inside 0..1", () => {
        expect(markFill()).toBeGreaterThanOrEqual(0);
        expect(markFill()).toBeLessThanOrEqual(1);
    });

    /** The filled rect is a fraction of the TRACK's width, never of the viewBox. */
    it("draws the filled bar as a fraction of the track", () => {
        const svg = markSvg({ink: "INK", track: "TRACK", fill: 0.5});
        const widths = [...svg.matchAll(/<rect [^>]*y="73"[^>]*width="([\d.]+)"/g)].map((m) => Number(m[1]));
        const fills = [...svg.matchAll(/<rect [^>]*y="73"[^>]*width="([\d.]+)"[^>]*fill="([A-Z]+)"/g)];
        expect(widths).toContain(MARK_GEOMETRY.barTrack.width);
        expect(fills.map((m) => m[2])).toEqual(["TRACK", "INK"]);
        expect(Number(fills[1][1])).toBeCloseTo(MARK_GEOMETRY.barTrack.width / 2, 6);
    });

    /** A fill outside the range is clamped rather than drawn past the track. */
    it("clamps a fill it is handed out of range", () => {
        const over = markSvg({ink: "INK", track: "TRACK", fill: 2});
        const under = markSvg({ink: "INK", track: "TRACK", fill: -1});
        expect(over).toContain(`width="${MARK_GEOMETRY.barTrack.width}" height="13" fill="INK"`);
        expect(under).toContain(`width="0" height="13" fill="INK"`);
    });
});

describe("one drawing at every size", () => {
    /**
     * Decision 7: there is no ray-less small variant. A size argument may change the box and
     * nothing else, so the shape is asserted at every step of the ladder — including 16,
     * where the rays are known to close up visually. Softness is accepted; a fork is not.
     */
    it.each(SIZE_LADDER)("emits five rays at %ipx", (px) => {
        const svg = markSvg({ink: "INK", track: "TRACK", fill: 0.5, px});
        const rays = [...svg.matchAll(/transform="rotate\((-?[\d.]+) 50 62\)"/g)].map((m) => Number(m[1]));
        expect(rays).toEqual([...MARK_GEOMETRY.rayAngles]);
        expect(svg).toContain(`width="${px}" height="${px}"`);
    });

    /** The dome and the bar are the same at every size too — the whole drawing, or none. */
    it("draws the same dome and bar at every size", () => {
        const shapes = SIZE_LADDER.map((px) =>
            markSvg({ink: "INK", track: "TRACK", fill: 0.5, px}).replace(/ width="\d+" height="\d+"/, ""));
        expect(new Set(shapes).size).toBe(1);
    });

    /** The ladder is largest-first, which is what makes "the rays fill in last" readable. */
    it("is ordered largest first", () => {
        expect([...SIZE_LADDER]).toEqual([...SIZE_LADDER].sort((a, b) => b - a));
    });
});

describe("the module never chooses a colour", () => {
    /**
     * Sentinels in, sentinels out. If the drawing ever grows a hardcoded hex — an outline, a
     * shadow, a "just this once" — this is where it surfaces, because a real colour in the
     * output is a token this test never handed it.
     */
    it("emits no colour it was not given", () => {
        const svg = markSvg({ink: "__INK__", track: "__TRACK__", fill: 0.5, px: 48});
        expect(hexes(svg)).toEqual([]);
        expect(svg).toContain("__INK__");
        expect(svg).toContain("__TRACK__");
    });

    /**
     * Named or hidden, never neither. A mark with no accessible name and no `aria-hidden` is
     * announced as an unlabelled image, which is worse than either choice.
     */
    it("is either named or hidden", () => {
        const hidden = markSvg({ink: "I", track: "T", fill: 0.5});
        const named = markSvg({ink: "I", track: "T", fill: 0.5, title: "52% of the way"});
        expect(hidden).toContain(`aria-hidden="true"`);
        expect(hidden).not.toContain("role=");
        expect(named).toContain(`role="img"`);
        expect(named).toContain(`aria-label="52% of the way"`);
        expect(named).not.toContain("aria-hidden");
    });

    /** The name reaches an attribute, so it is escaped rather than trusted. */
    it("escapes the accessible name", () => {
        const svg = markSvg({ink: "I", track: "T", fill: 0.5, title: `a "b" & <c>`});
        expect(svg).toContain(`aria-label="a &quot;b&quot; &amp; &lt;c&gt;"`);
    });
});

describe("the files a consumer fetches", () => {
    /**
     * The three `/brand` routes are the mark as files. They must carry literal hexes — a
     * consumer without a stylesheet cannot resolve `var(--brand-ink)` — which is precisely
     * why they are the place a colour gets typed in. Every hex is checked against `PALETTE`.
     */
    it.each(["mark.svg", "mark-light.svg", "mark-dark.svg"])("draws %s only in published tokens", (file) => {
        const svg = built(`dist/brand/${file}`);
        const published = paletteHexes();
        const found = hexes(svg);
        expect(found.length).toBeGreaterThan(0);
        for (const hex of found) expect(published).toContain(hex);
    });

    /** The pinned files are pinned: one theme's pair each, and nothing from the other. */
    it("pins mark-light.svg to the light pair and mark-dark.svg to the dark one", () => {
        const ink = PALETTE.find((t) => t.token === "--brand-ink");
        const track = PALETTE.find((t) => t.token === "--progress-track");
        expect(ink).toBeDefined();
        expect(track).toBeDefined();
        for (const [file, theme] of [["mark-light.svg", "light"], ["mark-dark.svg", "dark"]] as const) {
            const found = new Set(hexes(built(`dist/brand/${file}`)));
            expect([...found].sort()).toEqual([
                valueIn(ink!, theme).toUpperCase(),
                valueIn(track!, theme).toUpperCase(),
            ].sort());
        }
    });

    /**
     * `/brand/mark.svg` is the favicon, and a favicon is loaded outside any stylesheet this
     * site controls, so it carries its own theme switch. Without this block the tab shows the
     * light mark on a dark browser chrome.
     */
    it("gives mark.svg its own dark-mode block, carrying the dark pair", () => {
        const svg = built("dist/brand/mark.svg");
        const ink = PALETTE.find((t) => t.token === "--brand-ink")!;
        const track = PALETTE.find((t) => t.token === "--progress-track")!;
        expect(svg).toContain("prefers-color-scheme: dark");
        const dark = svg.slice(svg.indexOf("prefers-color-scheme: dark"));
        expect(dark.toUpperCase()).toContain(ink.dark.toUpperCase());
        expect(dark.toUpperCase()).toContain(track.dark.toUpperCase());
        const light = svg.slice(0, svg.indexOf("prefers-color-scheme: dark"));
        expect(light.toUpperCase()).toContain(ink.light.toUpperCase());
        expect(light.toUpperCase()).toContain(track.light.toUpperCase());
    });

    /** All three are the same drawing; only their colours and their fill differ. */
    it.each(["mark.svg", "mark-light.svg", "mark-dark.svg"])("draws five rays in %s", (file) => {
        const rays = [...built(`dist/brand/${file}`).matchAll(/rotate\((-?[\d.]+) 50 62\)/g)]
            .map((m) => Number(m[1]));
        expect(rays).toEqual([...MARK_GEOMETRY.rayAngles]);
    });
});

describe("the mark as the intro card wears it", () => {
    const home = (): string => built("dist/index.html");

    /**
     * Decision 6, measured rather than tasted: at `text-xl` a 1em mark puts each of the five
     * rays under 2px and they close against the dome. 1.4em is where the fan survives in a
     * run of text. Read from the BUILT page rather than the component source, because what
     * ships is what a reader sees.
     */
    it("is 1.4em on the text's own baseline", () => {
        const html = home();
        const mark = html.slice(html.indexOf("<h1"), html.indexOf("</h1>"));
        expect(mark).toContain("<svg");
        expect(mark).toMatch(/font-size:\s*1\.4em/);

        /*
         * The box and the baseline nudge live in the component's own scoped rule rather than
         * at the call site, so they are read out of the shipped sheet. `-0.145em` is exactly
         * what `presetIcons` puts on every mask in `uno.config.ts`: the brand mark sits where
         * the icon it replaced sat, and `tests/icon-alignment.test.ts` records why that
         * number and not another.
         */
        const rule = /\.brand-mark(?:\[[^\]]+\])?\{([^}]*)\}/.exec(pageCss());
        expect(rule, "the brand mark's own rule is not in the shipped sheet").not.toBeNull();
        expect(rule![1]).toMatch(/vertical-align:\s*-0?\.145em/);
        expect(rule![1]).toMatch(/width:\s*1em/);
        expect(rule![1]).toMatch(/height:\s*1em/);
    });

    /**
     * The one placement with a reader who can be told what the bar measures. `/design`'s
     * Brand Mark section argues that the mark stands outside the Data Visualization rules
     * BECAUSE a favicon has no room for a caption — that argument only holds if the mark
     * takes the caption wherever there IS room.
     */
    it("prints the figure and names its scale in its accessible name", () => {
        const html = home();
        const h1 = html.slice(html.indexOf("<h1"), html.indexOf("</h1>"));
        const label = /aria-label="([^"]+)"/.exec(h1);
        expect(label).not.toBeNull();
        expect(label![1]).toMatch(/\d+%/);
        expect(Number(/(\d+)%/.exec(label![1])![1])).toBe(Math.round(markFill() * 100));
    });

    /** It re-tones with the theme from one markup rather than shipping two variants. */
    it("draws from the theme's own custom properties", () => {
        const html = home();
        const h1 = html.slice(html.indexOf("<h1"), html.indexOf("</h1>"));
        expect(h1).toContain("var(--brand-ink)");
        expect(h1).toContain("var(--progress-track)");
        expect(hexes(h1)).toEqual([]);
    });
});
