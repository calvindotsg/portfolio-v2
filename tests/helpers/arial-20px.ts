/**
 * Advance widths of every character a page title can contain, in Arial 20px — the face and size
 * a desktop Google result renders a title link in.
 *
 * WHY A TABLE AND NOT A CHARACTER COUNT. A result truncates by WIDTH, and a character count cannot
 * express that: in this table a character is anywhere between 3.818px (`'`) and 20.303px (`@`), so
 * a 61-character title spans roughly 350px to 1152px. The cap this replaced was calibrated at one
 * string's length and admitted a title 6px over budget while rejecting one 35px under it — measured,
 * not hypothesised, by two independent reviewers who each found a plausible job title that broke it
 * in a different direction.
 *
 * SUMMING ADVANCES IS AN UPPER BOUND, which is the property that makes this safe to gate on. Kerning
 * only ever pulls glyphs closer, so the sum can overestimate and cannot underestimate. Measured
 * against Chrome's own `measureText` on five real titles: four agreed to 0.000px and the fifth — the
 * only one containing a kerned pair (`Wa` in "Warehouse") — summed 1.846px high. A gate that errs
 * high fails a title that would just barely have fitted; it never passes one that would not.
 *
 * PROVENANCE. Emitted from `chrome-headless-shell` over raw CDP: `ctx.font = "20px Arial"`, then
 * `measureText(ch).width` per character, with two checks that make the numbers meaningful — canvas
 * was proved to resolve the same face the DOM lays out (a laid-out span of the same string agreed to
 * 0.34%), and 20px Times was measured as a negative control so "the face resolved" is a real
 * observation rather than a tautology. Regenerate the same way if the budget or the face ever
 * changes; do not hand-edit a number.
 */
export const ARIAL_20PX_ADVANCE: Readonly<Record<string, number>> = {
    " ": 5.557, "!": 5.557, "\"": 7.1, "#": 11.123, "$": 11.123, "%": 17.783, "&": 13.34, "'": 3.818,
    "(": 6.66, ")": 6.66, "*": 7.783, "+": 11.68, ",": 5.557, "-": 6.66, ".": 5.557, "/": 5.557,
    "0": 11.123, "1": 11.123, "2": 11.123, "3": 11.123, "4": 11.123, "5": 11.123, "6": 11.123,
    "7": 11.123, "8": 11.123, "9": 11.123, ":": 5.557, ";": 5.557, "<": 11.68, "=": 11.68, ">": 11.68,
    "?": 11.123, "@": 20.303, "A": 13.34, "B": 13.34, "C": 14.443, "D": 14.443, "E": 13.34, "F": 12.217,
    "G": 15.557, "H": 14.443, "I": 5.557, "J": 10, "K": 13.34, "L": 11.123, "M": 16.66, "N": 14.443,
    "O": 15.557, "P": 13.34, "Q": 15.557, "R": 14.443, "S": 13.34, "T": 12.217, "U": 14.443, "V": 13.34,
    "W": 18.877, "X": 13.34, "Y": 13.34, "Z": 12.217, "[": 5.557, "\\": 5.557, "]": 5.557, "^": 9.385,
    "_": 11.123, "`": 6.66, "a": 11.123, "b": 11.123, "c": 10, "d": 11.123, "e": 11.123, "f": 5.557,
    "g": 11.123, "h": 11.123, "i": 4.443, "j": 4.443, "k": 10, "l": 4.443, "m": 16.66, "n": 11.123,
    "o": 11.123, "p": 11.123, "q": 11.123, "r": 6.66, "s": 10, "t": 5.557, "u": 11.123, "v": 10,
    "w": 14.443, "x": 10, "y": 10, "z": 10, "{": 6.68, "|": 5.195, "}": 6.68, "~": 11.68, "—": 20,
};

/**
 * The width of `text` in Arial 20px, as an upper bound (see the note above on kerning).
 *
 * Throws on a character the table does not carry rather than scoring it as zero. A silent zero is
 * how a width gate passes a string it never measured — the table covers printable ASCII and the em
 * dash, which is every character a title on this site has ever used, and anything else is a
 * deliberate decision that deserves a re-measure rather than a default.
 */
export const arial20pxWidth = (text: string): number =>
    [...text].reduce((total, ch) => {
        const advance = ARIAL_20PX_ADVANCE[ch];
        if (advance === undefined) {
            throw new Error(`arial20pxWidth: no measured advance for ${JSON.stringify(ch)} — re-generate the table`);
        }
        return total + advance;
    }, 0);
