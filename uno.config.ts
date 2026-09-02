import {defineConfig, presetIcons, presetWind3} from "unocss";

import {ICON_IDS, iconClass} from "./src/lib/icons";
import {SHORTCUTS} from "./src/lib/shortcuts";

export default defineConfig({
    /**
     * Icon classes are derived from constants at render time, so UnoCSS never
     * sees them literally in source — every configured icon is safelisted here.
     *
     * THE CENSUS ITSELF IS NO LONGER WRITTEN HERE. It is `ICON_IDS` in
     * `src/lib/icons.ts`, beside the function that turns an id into a class, because
     * this list stopped being its only reader: `/design` renders the same set as the
     * marks a designer may reach for. Two hand-kept lists answering that question
     * differently is the defect this safelist exists to prevent, arriving one page at
     * a time — a presetIcons class with no rule renders as a mask box at zero size, an
     * icon that is silently absent with correct markup and a green build. What each
     * entry is doing in the census, and what is deliberately NOT in it, is written out
     * beside the list.
     */
    safelist: ICON_IDS.map(iconClass),
    /** UnoCSS extracts from the text of `<style>` blocks too, so the declaration
     *  `position: static` in IntroCard emits a utility rule for a class no
     *  element wears. A comment can be reworded around; a real declaration
     *  cannot, so the token is blocked instead.
     *
     *  `tabular-nums` is the same case, from `font-variant-numeric: tabular-nums`
     *  on the goal card's hero figure (Goal.astro). The property is written out
     *  rather than taken as a utility because the rest of that rule — weight,
     *  tracking, line height — is authored CSS, and splitting one type treatment
     *  across two mechanisms is how the pair drifts. */
    /*
     * `underline` IS BLOCKED AS AN ENGLISH WORD, not as a declaration value, and the difference
     * decides whether the entry survives its own reason.
     *
     * `static` and `tabular-nums` are blocked for the declaration-value reason: this codebase has
     * to write them in authored CSS, and the extractor reads `src/**`. `underline` was briefly in
     * that category too — the bib's action row carried `text-decoration: underline` — but the
     * owner rejected a decoration on a bib as the wrong vocabulary for a printed artifact, that
     * declaration was deleted, and the justification here was left behind describing code that no
     * longer exists. A review panel found it five times over.
     *
     * The entry still earns its place on the remaining reason alone: the treatment is this site's
     * named idiom, so the components wearing it explain themselves in prose, and any sentence
     * containing the word emits a real `.underline{}` rule that no element wears — which the
     * orphan gate in tests/build-output.test.ts fails the build on.
     *
     * Blocking the token does NOT disarm the shortcut: a shortcut's expansion is resolved after
     * extraction, so `.text-link` still ships `text-decoration-line: underline`. That is
     * asserted rather than trusted — tests/rendered-html.test.ts reads the declaration back out
     * of the built stylesheet, so the day this interaction changes, the affordance does not
     * quietly disappear.
     *
     * KNOWN_ORPHANS was the wrong tool and was considered first: it suppresses the gate for a
     * rule that really is dead, where blocking stops the rule being emitted at all.
     */
    blocklist: ["static", "tabular-nums", "underline"],
    /**
     * EVERY BREAKPOINT IS TEXT-RELATIVE, and these five values are presetWind3's
     * own defaults restated in `rem`: 640/768/1024/1280/1536 CSS pixels are
     * 40/48/64/80/96rem at the 16px root every browser ships. So at the default
     * text size this is not a change at all — it re-spells the same five numbers.
     *
     * It stops being a re-spelling exactly when the reader has asked for larger
     * text. A media-query `rem` resolves against the INITIAL font-size — the
     * user's own default, the thing a browser's "Font size" setting moves — so a
     * `rem` breakpoint asks "how much text fits across this viewport", where a
     * `px` breakpoint asks "how many device pixels". The layout only ever cared
     * about the first question: this page's four-column grid needs roughly 64
     * characters of width to work, and at a 24px root a 1024px viewport offers
     * about 42. It was still being handed the four-column grid there, and the
     * cards lost 846px of text off their bottom edges as a result — the columns
     * were too narrow for the type, every line wrapped, and nothing could grow.
     *
     * Note what this does NOT respond to: an AUTHOR setting `font-size` on
     * `:root`. That moves every `rem` LENGTH and no `rem` media query, which is
     * per spec and is worth knowing because it is also how a probe is most
     * easily written — measuring text zoom that way silently tests the other
     * mechanism. Verified both ways on a synthetic page with a known answer
     * before any of this was measured.
     *
     * The hand-written media queries in the codebase were converted in the same pass
     * and have to stay in step by hand. There is ONE left — in IntroCard.astro, and it
     * deliberately mirrors `md`. A px query left among rem ones does not fail loudly:
     * it simply parts company with its variant siblings once the reader enlarges the
     * text, which is why the count is worth keeping small and worth stating here.
     *
     * It was four. Three of them granted the control row a column count — 3, 2 and 1 at
     * 40rem, 25rem and 13rem, with the 4-column rule unconditional and so not a query at
     * all — and all three are gone: that row wraps now, so it needs
     * no bound at all and there is nothing left to keep in step. Two of those bounds
     * had no variant sibling to move with in the first place, which is the shape of
     * hand-maintained CSS worth deleting rather than converting — see BasicLayout.astro.
     */
    theme: {
        breakpoints: {sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem", "2xl": "96rem"},
    },
    shortcuts: SHORTCUTS,
    presets: [
        /**
         * EVERY `hover:` UTILITY ON THIS SITE IS EMITTED INSIDE `@media (hover: hover)`, AND THIS
         * SHORT PRESET IS THE WHOLE MECHANISM.
         *
         * THE DEFECT. A touch browser has no pointer to move away, so it applies `:hover` on tap
         * and holds it until the reader taps elsewhere. Reported on a physical iPhone 15 Pro Max
         * against a deploy preview: one goal card's way out sat in accent red while its sibling
         * did not, which reads as a selected state on a control that has none. It is not one
         * component's bug — every `hover:` token in this file and every hand-written `:hover` in
         * `src/**` has it. Counted against the built DOM rather than from the source: TWELVE hovered
         * elements on the home page — seven plated icon controls, the two goal cards' calls to action,
         * two role-card company links, and the Now card's info link, which wears a bare `hover:` utility
         * and belongs to neither named idiom — plus six more on the wall (the back link, three sport
         * chips, and the linked bibs). COUNT THE PAGE YOU MEAN: a home-page total labelled as the
         * whole site's is the mistake this breakdown is written out to prevent.
         *
         * WHY THE FIX BELONGS IN THE CONFIG AND NOT IN THE SHORTCUTS. Guarding each of the two
         * shortcuts would fix today's wearers and leave the next `hover:` token anyone writes
         * unguarded — the same shape as the column-count ladder this file deleted, a rule that has
         * to be re-applied by hand every time the site grows. A variant is the one place the
         * decision can be made once. `presetWind3` ships its own `hover:` variant and variants
         * resolve in PRESET ORDER, so this has to sit above it in the list to win; below it the
         * probe emitted zero guarded rules and looked exactly like a working config.
         *
         * THIS IS NOT A LOSS ON TOUCH, and the site's own prose has been saying so for three
         * revisions: `text-link` exists because a hover colour is the one cue that cannot survive
         * a phone, Patch.astro says "there is no hover on a phone", and tests/build-output.test.ts
         * rejects a `:hover` rule offered as proof of an affordance. On a device that cannot
         * hover, the state is never information — only ever a misfire — so guarding it removes
         * nothing a reader could have meant to produce.
         *
         * THE HAND-WRITTEN `:hover` RULES DO NOT COME THROUGH HERE. Two of them exist, both on the
         * patch wall, and they carry the guard in their own preludes; tests/build-output.test.ts
         * walks every built sheet and fails the build on any `:hover` rule outside a
         * `(hover: hover)` context, which is what keeps the next authored one honest.
         *
         * ONE MEASUREMENT NOTE WORTH MORE THAN THE REST. `Emulation.setEmulatedMedia` CANNOT set
         * this feature — it reports `hover: hover` in both states, so a probe written that way
         * passes on a completely unguarded build. `setDeviceMetricsOverride({mobile: true})` plus
         * `setTouchEmulationEnabled` is the lever whose read-back actually differs.
         */
        {
            name: "hover-needs-a-pointer",
            variants: [
                (matcher) => {
                    if (!matcher.startsWith("hover:")) return;
                    return {
                        matcher: matcher.slice("hover:".length),
                        selector: (sel) => `${sel}:hover`,
                        parent: "@media (hover: hover)",
                    };
                },
            ],
        },
        presetWind3(),
        /**
         * `display` is NOT part of presetIcons' default output. Without it the
         * icon <span> stays an inline box, width/height are ignored, and the icon
         * renders at zero size — i.e. invisibly. This line is load-bearing.
         *
         * `vertical-align` is here for the consequence of that inline-block: the
         * box is 1em tall and its BOTTOM sits on the text baseline, while capital
         * letters only reach cap-height above it. The icon therefore overhangs the
         * cap line by (1em - cap)/2 and reads as riding high beside its text. The
         * offset scales with font-size, so it was one defect in four places, at
         * two sizes: measured 2.954px on the 20px greeting and both 20px job
         * titles, and 1.772px on the 12px footer heart — a uniform 0.1477em.
         *
         * Shifting the box down by half the leftover centres it on the cap band.
         * -0.145em is the midpoint of the ideal shift for the faces this stack can
         * actually resolve, and it is NOT tuned to one machine: the ideal is
         * (1 - cap/em)/2, and cap/em was measured here at 0.705 for the system
         * face, 0.717 Helvetica, 0.716 Arial — a 0.1415–0.1475em span. Across a
         * cap ratio anywhere in 0.68–0.73, which brackets every sans-serif in the
         * declared stack, the residual stays under a third of a pixel at 20px.
         *
         * Three alternatives were built and measured against the live page before
         * this one, and the numbers are the reason it is a length:
         *   - `middle` is browser-computed and so adapts per font, but it aligns
         *     to half the X-height, not half the cap height. It overshoots the
         *     other way: 1.83px LOW at 20px. Trading high for low is not a fix.
         *   - -0.125em, the constant Font Awesome and Bootstrap Icons ship, leaves
         *     0.45px. It is not derived from a cap height at all: 0.125em is Font
         *     Awesome's own webfont DESCENT — 64 of 512 units, read off
         *     fa-solid-900.ttf, with the ascent the exact complement at 448/512 —
         *     so the value drops its SVG box onto the font box its webfont glyphs
         *     used to occupy. FA's actual cap height is 421/512 = 0.82em, nowhere
         *     near 0.75em, and FA6 kept the same -0.125em while moving its descent
         *     to 0.1465em, which a cap-derived constant would not do. Note also
         *     where FA ships it: on `.svg-inline--fa` in its SVG sheet, not on the
         *     webfont classes, which carry no vertical alignment at all. Bootstrap
         *     Icons does put it on its main `.bi::before` rule — over a glyph box
         *     that is a FULL em with zero descent (300/300, 0/300), i.e. the same
         *     shape as our Iconify artwork. So the number is an inherited
         *     convention, and inheriting it here under-shifts by that 0.45px.
         *   - `calc((1cap - 1em) / 2)` is exact by construction and Chromium does
         *     accept it — it computed -2.9541px against an ink-measured 2.954, two
         *     independent instruments agreeing to four decimals. It was still
         *     rejected on its support floor: per MDN browser-compat-data the `cap`
         *     unit needs Chrome/Edge 118+, Safari 17.2+ or Firefox 97+ — Baseline
         *     Widely Available only since 2026-06-11 — and the browsers that lack
         *     it keep the whole defect. (Do not quote Chrome 111 / Safari 16.4 for
         *     this: those are the floors of OTHER length units in the same BCD
         *     file, `rex`/`rch`/`ric`/`rlh` and `lh`/`rlh`, and reading one of those
         *     rows for this unit makes the swap look about two years safer than it
         *     is.) What the exact spelling buys over the constant is
         *     0.0027em of residual, which is 0.05px on the 20px greeting at the
         *     default root size and grows with the text — 0.07px at root 20,
         *     0.08px at root 24 — so it is a fixed em fraction, not a fixed 0.06px.
         *     Elegance is not worth a support floor for that.
         *
         * This belongs in the preset rather than at the three call sites because
         * baseline alignment is a property of "a 1em icon in a line of text", not
         * of any one heading — and because the alternative is remembering a token
         * every future inline icon needs. It is also the mechanism presetIcons
         * documents for this: `vertical-align` is the example property in its own
         * "set extra CSS properties" section, with `middle` as the illustrative
         * value. The mechanism is taken from the docs; the value is measured.
         *
         * It is applied to all fourteen icons and does nothing to ten of them: the
         * six social links, both toggle glyphs and both progress-bar icons sit in
         * flex containers, so they are BLOCKIFIED — their computed `display` is
         * `block`, not the declared `inline-block`, verified by reading it off the
         * live page — and `vertical-align` has no effect on a block-level box that
         * is not in an inline formatting context. They are centred by their
         * containers instead.
         *
         * Measured rather than argued from the spec, because the wording "does not
         * apply to flex items" is loose enough to hide a mistake: forcing an absurd
         * `-3em` onto every icon moves the four inline ones by 57px and 34px and
         * leaves nine of the ten flex ones exactly where they were, relative to
         * their own parent. The tenth is whichever toggle glyph the current theme
         * hides, which is `display:none` and has no box to move at all — and note
         * that measuring it ABSOLUTELY says all ten moved, because the reflow above
         * them is real; a hidden element's all-zero rect at the viewport origin then
         * fakes a shift in the relative measurement too. At the value actually
         * shipped none of this arises: nothing on the page moves at all.
         *
         * One side effect to expect rather than rediscover: presetIcons writes
         * every extra property onto the inlined `<svg>` in the mask data URI as an
         * attribute as well as into the rule. So each icon's data URI now carries
         * a `vertical-align='-0.145em'` attribute, which is inert there — the SVG
         * is only ever a mask, and this is already true of `display`. It is why the
         * raw sheet grows 686 bytes (14 attributes at 26 bytes, 14 declarations at
         * 23) for a change worth 23 bytes brotli on the wire.
         *
         * Quote that total and not a split between the two halves: the split is not
         * stable. Measured on this build, deleting all 364 bytes of attribute
         * repetition changes brotli by +4 bytes — it compresses to less than
         * nothing — while deleting the 14 declarations alone saves 13. A review
         * panel measured the reverse on the previous revision and concluded the
         * whole 13 was the attribute. Both readings are compression context, not a
         * property of the change. (presetIcons' documented `processor` option would
         * emit the declaration without the attribute if the raw bytes ever matter;
         * `extraProperties` is kept because it is the documented spelling for this
         * and the wire difference is inside the noise.)
         */
        presetIcons({scale: 1, extraProperties: {"display": "inline-block", "vertical-align": "-0.145em"}}),
    ],
});
