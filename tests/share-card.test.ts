import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {SPECIMEN} from "../src/data/bft/specimen";
import {
    BACK_SLUGS, CARD_PX, cardHtml, CHIP_CORNER, FRONT_SLUGS, PROVENANCE, PUBLISHER,
    shareDescription, stationsOf, TYPE_FLOOR_PX, workedBy, type Session,
} from "../src/lib/share-card";
import {PALETTE, valueIn} from "../src/lib/palette";

/**
 * THE SHARE CARD, AND THE FOUR CLAIMS IT MAKES THAT A SCREENSHOT CANNOT CHECK.
 *
 * The card is a picture, so almost everything about it is verified by looking. These are the
 * things looking cannot reach:
 *
 *   - IT CONTAINS NO COLOUR OF ITS OWN. The module this was ported from typed eleven hexes over
 *     twenty-eight occurrences, every one a published token. A hex that crept back in would be
 *     right in the light theme — the only one anybody renders — and silently wrong in the other.
 *   - THE TWO SURFACES ARE DISJOINT. A fact that appears on both the card and the description is
 *     one the reader is told twice and one that can drift; the contract is that they share the
 *     session code and the publisher's name and nothing else. This runs BOTH REAL RENDERERS
 *     rather than a fixture, which is the whole reason the proof of concept's version of this
 *     test was rewritten: it used to assert against a hand-written stand-in, so it could pass
 *     while the shipping renderer drifted away from it.
 *   - AN UNMAPPED MOVEMENT FALLS BACK RATHER THAN GUESSING, and the card prints that it did. The
 *     fallback is honest only while the sentence is there.
 *   - EVERY TEXT FIELD IS ESCAPED. `/design` embeds this with `set:html`, which does not escape,
 *     and the next person to add a session will be thinking about muscles rather than markup.
 *
 * THE DISJOINTNESS PROXY HAS A DOCUMENTED LIMIT AND IT IS CARRIED ACROSS DELIBERATELY — see
 * {@link cardWords}. Widening it silently is the failure this comment exists to prevent.
 */

const CARD = cardHtml(SPECIMEN, {theme: "light"});

/** Every `font-size` the card emits, in px. */
const typeSteps = (html: string) =>
    [...html.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));

/**
 * WHAT A READER SEES: the card with its markup removed and its entities decoded.
 *
 * Asserting against the raw HTML would compare a sentence to its escaped form — the provenance
 * line contains an apostrophe, so `session's` is on the card as `session&#39;s` — and the
 * mismatch reads as a missing line rather than as a working escape.
 */
const cardText = (html: string) => html
    .replace(/<svg\b[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&ldquo;|&rdquo;/g, `"`)
    .replace(/&mdash;/g, "—")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, `"`)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * WORDS THAT ARE NOT FACTS. Function words, plus the site's own name and the words the two
 * surfaces are allowed to share because they are furniture rather than content.
 */
const STOP = new Set(["of", "the", "a", "an", "and", "or", "to", "from", "in", "on", "at", "for",
    "with", "by", "is", "was", "it", "not", "no", "this", "that", "final", "calvin", "sg",
    "calvin.sg", "derived", "shaded"]);

function words(text: string): Set<string> {
    const plain = (text ?? "")
        .replace(/&ldquo;|&rdquo;|&mdash;|&amp;|&quot;|&#39;/g, " ")
        .replace(/[·—]/g, " ")
        .replace(/’/g, "'");
    const found = plain.toLowerCase().match(/[a-z0-9#%]+/g) ?? [];
    // Bare integers are excluded: "6 stations" and a "6/6" counter are two different facts that
    // happen to share a numeral. Anything carrying a unit or a % is kept.
    return new Set(found.filter((t) => !STOP.has(t) && t.length > 1 && !/^\d+$/.test(t)));
}

/**
 * THE CARD'S OWN WORDS, EXCLUDING THE QUOTE.
 *
 * 🔴 A DOCUMENTED LIMIT OF THIS TEST, NOT A LOOPHOLE. The quote is the one card element that is
 * QUOTED rather than derived — the publisher's own marketing prose. Comparing marketing English
 * against factual English yields coincidental overlaps that are not duplicated facts: one
 * program's quote says "muscles", another's says "performance", another's says "heavier
 * weights". Measured across all ninety published sessions in the proof of concept, that is 11 of
 * the 13 remaining collisions. The quote is still covered by the leak gate; what is dropped here
 * is only the word-overlap proxy over it.
 */
function cardWords(session: Session): Set<string> {
    const html = cardHtml(session, {theme: "light"});
    const quote = /&ldquo;(.*?)&rdquo;/s.exec(html)?.[1] ?? "";
    const text = html
        .replace(/<svg\b[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(quote, " ");
    return words(text);
}

describe("the share card", () => {
    it("is square at the size the platform shows", () => {
        expect(CARD_PX).toBe(1080);
        expect(CARD).toContain(`width:${CARD_PX}px;height:${CARD_PX}px`);
    });

    /**
     * THE MODULE CONTAINS NO COLOUR, AND EVERY COLOUR IT EMITS IS A PUBLISHED TOKEN'S VALUE. Both
     * halves are needed: the first catches a hex typed into the source, the second catches one
     * assembled at runtime, which the first cannot see.
     */
    it("draws in published tokens and holds no colour of its own", () => {
        expect(readFileSync("src/lib/share-card.ts", "utf8").match(/#[0-9A-Fa-f]{3,8}\b/g),
            "src/lib/share-card.ts contains a literal colour. Every value it draws with is a "
            + "token src/lib/palette.ts publishes, which is the whole reason the card moved into "
            + "the repository that owns the palette")
            .toBeNull();
        const emitted = new Set(CARD.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []);
        expect(emitted.size, "the card emitted no colour at all — this gate would be vacuous")
            .toBeGreaterThan(3);
        const published = new Set(PALETTE.map((values) => valueIn(values, "light").toUpperCase()));
        expect([...emitted].filter((hex) => !published.has(hex.toUpperCase())),
            "the card drew with colours that are not in this palette")
            .toEqual([]);
    });

    /**
     * THE TYPE FLOOR, ASSERTED AGAINST A CONSTANT RATHER THAN AGAINST THE SMALLEST STEP. Comparing
     * every step to `Math.min(...steps)` would pass whatever the card printed, which is the shape
     * of assertion this suite exists to avoid.
     */
    it("sets nothing below the type floor", () => {
        const steps = typeSteps(CARD);
        expect(steps.length, "the card emitted no font-size — this gate would be vacuous")
            .toBeGreaterThan(4);
        expect(steps.filter((px) => px < TYPE_FLOOR_PX),
            `the card renders about 350pt wide in the feed, so a step at 1080 arrives at roughly `
            + `a third of it. Below ${TYPE_FLOOR_PX}px that is under 6.5pt, which is not quiet — `
            + "it is unreadable")
            .toEqual([]);
    });

    /**
     * THE CHIP GOES TOP-RIGHT BECAUSE THE PLATFORM OWNS TOP-LEFT. It overlays its own attribution
     * chip there on every activity photo, which covered the wordmark completely when it was drawn
     * on that side. The declaration is asserted rather than the constant alone, so moving the
     * chip in the markup reddens even if the constant is left saying `top-right`.
     */
    it("puts the brand chip in the corner the platform does not own", () => {
        expect(CHIP_CORNER).toBe("top-right");
        expect(CARD, "the chip row no longer pushes its content to the trailing edge, so the mark "
            + "sits where the platform draws its own attribution chip over it")
            .toContain("justify-content:flex-end");
        const chipAt = CARD.indexOf("justify-content:flex-end");
        const heroAt = CARD.indexOf("&ldquo;");
        expect(chipAt).toBeGreaterThan(-1);
        expect(chipAt, "the chip must be the card's first region, above the hero")
            .toBeLessThan(heroAt);
    });

    /**
     * AN UNMAPPED MOVEMENT CONTRIBUTES NOTHING AND THE CARD SAYS SO. Both halves are asserted:
     * the shading falls back, AND the sentence admitting it is printed. A fallback with no
     * sentence is the card claiming a measurement it did not make.
     */
    it("falls back to the class type when nothing resolves, and prints that it did", () => {
        const unmapped: Session = {
            ...SPECIMEN,
            shading: "movements",
            movements: ["a movement nobody has ever mapped", "another one"],
        };
        expect(workedBy(unmapped).shading).toBe("format");
        expect(stationsOf(unmapped), "an unmapped label is not a station").toEqual([]);
        expect(cardText(cardHtml(unmapped, {theme: "light"}))).toContain(PROVENANCE.format);
        expect(workedBy(SPECIMEN).shading,
            "the specimen's movements all resolve, so it must be shaded from its own list")
            .toBe("movements");
        expect(cardText(CARD)).toContain(PROVENANCE.movements);
        expect(cardText(CARD)).not.toContain(PROVENANCE.format);
    });

    it("escapes every text field it prints", () => {
        const hostile: Session = {
            ...SPECIMEN,
            code: `<script>alert(1)</script>`,
            progressionCounter: `1 of "2" & 3`,
        };
        const html = cardHtml(hostile, {theme: "light"});
        expect(html, "/design embeds this with set:html, which does not escape")
            .not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
        expect(html).toContain("&quot;2&quot;");
        expect(html).toContain("&amp;");
    });

    /**
     * THE MAP IS LIT FROM THE SESSION'S OWN SLUGS, split across the two figures. A slug that
     * exists in both views is lit in both; one that exists in neither is a slug nothing draws,
     * which `tests/body-map.test.ts` refuses.
     */
    it("lights only slugs the two figures hold", () => {
        const {slugs} = workedBy(SPECIMEN);
        expect(slugs.length, "the specimen shades nothing — this gate would be vacuous")
            .toBeGreaterThan(4);
        expect(slugs.filter((slug) => !FRONT_SLUGS.has(slug) && !BACK_SLUGS.has(slug)),
            "the specimen works muscles neither figure can draw")
            .toEqual([]);
    });

    /**
     * THE DISJOINTNESS CONTRACT, OVER BOTH REAL RENDERERS.
     *
     * The allowed intersection is the session code and the publisher's name — a join key and a
     * citation, which are the two things both surfaces owe. Anything else appearing on both is a
     * fact the reader is told twice and a fact that can drift, since nothing makes the two
     * renderings of it agree.
     */
    it("keeps the card and the description disjoint but for the join key and the citation", () => {
        const description = shareDescription(SPECIMEN);
        expect(description.length, "the description is empty — this gate would be vacuous")
            .toBeGreaterThan(80);
        const allowed = new Set([...words(SPECIMEN.code), ...words(PUBLISHER)]);
        const shared = [...cardWords(SPECIMEN)]
            .filter((word) => words(description).has(word) && !allowed.has(word))
            .sort();
        expect(shared,
            "these words appear on the card AND in the description. The two surfaces share a "
            + "join key and a citation; every other fact belongs to exactly one of them, or the "
            + "reader is told it twice and the two copies can drift")
            .toEqual([]);
    });

    /**
     * THE MUTATION THE ASSERTION ABOVE MUST SURVIVE, RUN IN PLACE RATHER THAN BY HAND. An
     * assertion that cannot fail is decoration, and this one is a set intersection over prose —
     * the kind that goes quietly empty when a renderer changes shape.
     */
    it("reddens when a card-owned fact is appended to the description", () => {
        const leaked = `${shareDescription(SPECIMEN)}\n`
            + `${PROVENANCE.movements}. ${SPECIMEN.progressionCounter}.`;
        const allowed = new Set([...words(SPECIMEN.code), ...words(PUBLISHER)]);
        const shared = [...cardWords(SPECIMEN)]
            .filter((word) => words(leaked).has(word) && !allowed.has(word));
        expect(shared.length,
            "appending the card's own provenance line and progression counter to the description "
            + "did not register as an overlap, so the disjointness assertion above is decoration")
            .toBeGreaterThan(0);
    });

    /** The description owns the stations, the muscles in words, and the citation with its date. */
    it("puts the stations, the muscles and the citation in the description", () => {
        const description = shareDescription(SPECIMEN);
        expect(description).toContain("6 stations");
        expect(description).toMatch(/^Muscles: .+\.$/m);
        expect(description).toContain(SPECIMEN.code);
        expect(description, "the read date is the citation's whole point")
            .toContain("31 Aug 2026");
    });
});
