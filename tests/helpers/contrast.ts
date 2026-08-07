/**
 * WCAG 2.x RELATIVE LUMINANCE AND CONTRAST RATIO, once.
 *
 * It was implemented three times, in three files, with three different contracts:
 * `build-output.test.ts` took a hex string and indexed it FROM 1 because it kept the `#`,
 * `patch-wall.test.ts` took one and indexed FROM 0 because it stripped it, and
 * `mobile-hero-contrast.test.ts` took an RGB triple and hand-rolled the alpha blend the
 * other two also hand-rolled inline. Three conventions is three chances to read a colour
 * one channel out and never know: every one of them returns a plausible number.
 *
 * The settling mutation is the sRGB linearisation threshold below. Move `0.03928` to
 * `0.04045` — the value WCAG 2.2 actually publishes, and a change that moves real ratios
 * in the fourth decimal — and before this file three files had to be edited and two of
 * the three hex conventions re-checked. Now it is one line, and every assertion in the
 * repository that quotes a ratio moves together or not at all.
 *
 * COLOURS ARE ACCEPTED IN EITHER SPELLING and normalised here rather than at the call
 * site. A hex is what the theme blocks ship; a triple is what compositing produces. Which
 * one a caller holds is an accident of where the colour came from, and making that
 * accident visible in the API is what produced the three conventions.
 */

/** `#111` -> `#111111`, `abc` -> `#aabbcc`. The minifier folds a repeated pair. */
export function expandHex(value: string): string {
    const h = value.replace("#", "");
    return `#${h.length === 3 ? [...h].map((c) => c + c).join("") : h}`;
}

/** The three 8-bit channels of a colour, whichever way it is spelled. */
export function channels(color: string | readonly number[]): [number, number, number] {
    if (typeof color !== "string") {
        const [r, g, b] = color;
        return [r!, g!, b!];
    }
    const h = expandHex(color).slice(1);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return [r!, g!, b!];
}

/** Channels back to the `#rrggbb` a failure message can be read in. */
export function toHex(color: readonly number[]): string {
    return `#${channels(color).map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG 2.x relative luminance, 0 for black and 1 for white. */
export function luminance(color: string | readonly number[]): number {
    const [r, g, b] = channels(color).map((c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/**
 * WCAG 2.x contrast ratio. Order-independent: the lighter colour is found rather than
 * assumed, so a caller cannot get a ratio below 1 by passing its pair the other way up.
 */
export function contrast(a: string | readonly number[], b: string | readonly number[]): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * `top` at `alpha` composited over `bottom`, as channels — the colour a reader's eye
 * actually receives where something is dimmed rather than recoloured. Measuring the ink
 * instead is how a line at `opacity: .5` reads as passing on a ratio nothing renders.
 */
export function over(
    top: string | readonly number[],
    alpha: number,
    bottom: string | readonly number[],
): [number, number, number] {
    const [t, b] = [channels(top), channels(bottom)];
    const [r, g, bl] = t.map((c, i) => alpha * c + (1 - alpha) * b[i]!);
    return [r!, g!, bl!];
}
