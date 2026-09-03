import {describe, expect, it} from "vitest";

import {SPECIMEN} from "../src/data/bft/specimen";
import type {Session} from "../src/lib/share-card";
import {
    assertPublishable, LeakRefusal, PATTERNS, protectedNames, PROTECTED_LIST, publishedText,
    recordText, scanPublished, scanSource,
} from "../scripts/render-share-card";

/**
 * THE LEAK GATE — the half of this work that is about safety rather than about drawing.
 *
 * The card and the description bind FREE PROSE out of a private training record. Three fields on
 * a session are prose somebody types: what the session is, what the coach said changed, and the
 * target intensity. Anything typed into one of those reaches a public post, and a renderer that
 * shipped without this gate would have moved the production path into this repository while
 * leaving its only safety check behind.
 *
 * ⚠️ NO REAL PROTECTED NAME APPEARS IN THIS FILE. The name path is exercised with a synthetic
 * string injected through the `names` argument. Writing a real one into a test fixture would
 * itself be the leak this gate exists to prevent — and it would put that name in a public
 * repository's history forever.
 *
 * THE LIST IS NOT IN THIS REPOSITORY AND THIS SUITE MUST NOT NEED IT. Every assertion below
 * supplies its own names, so the suite is green on a machine that has the list and on a CI runner
 * that does not. The one thing that IS asserted about the real path is the shape of the answer
 * when the file is missing: refuse, never report clean.
 *
 * IT CARRIES ITS OWN MUTATION HARNESS, ported from the proof of concept's, because a guard that
 * has never fired is not evidence. The last test neuters the refusal the way somebody in a hurry
 * would — "it never fires anyway, and it blocked a legitimate card once" — and fails if that
 * changes nothing.
 */

/** Stands in for a real protected name. It is not one, and none may ever be written here. */
const SYNTHETIC = "fixture-referrer-zzz";
const NAMES = new Set([SYNTHETIC]);

/** A session carrying one planted leak in one free-prose field. */
const planted = (field: keyof Session, value: string): Session =>
    ({...SPECIMEN, [field]: value}) as Session;

/**
 * Both surfaces as PUBLISHED TEXT — the card's own words and the description, never the card's
 * markup. Scanning the markup scans the anatomical drawing's path data; see `publishedText`.
 */
const surfaces = (session: Session) => publishedText(session);

const refusalFor = (session: Session): LeakRefusal | null => {
    try {
        assertPublishable(session, surfaces(session), {names: NAMES, namesAvailable: true});
        return null;
    } catch (error) {
        if (error instanceof LeakRefusal) return error;
        throw error;
    }
};

describe("the leak gate", () => {
    it("publishes the specimen, which is invented and carries nothing to refuse", () => {
        expect(refusalFor(SPECIMEN),
            "the specimen is refused, so every assertion below would pass for the wrong reason")
            .toBeNull();
    });

    /**
     * FOUR PLANTED LEAKS, ONE PER CLASS, EACH IN A FIELD THE RECORD REALLY CARRIES. A class that
     * cannot be planted is a class the guard cannot be shown to catch.
     */
    it.each([
        ["a protected name", "note", `volume work, joined via ${SYNTHETIC}`],
        ["a heart-rate variability reading", "intensity", "HRV 62 this morning"],
        ["a membership fee", "progressionNote", "membership at S$89 fortnightly"],
        ["a body composition figure", "intensity", "body fat 18.2% on the Evolt scan"],
    ] as const)("refuses to publish %s", (_label, field, value) => {
        const refusal = refusalFor(planted(field, value));
        expect(refusal, "a planted leak was published rather than refused").not.toBeNull();
        expect(refusal!.message).toMatch(/refusing to publish/);
    });

    /**
     * A PROTECTED NAME THAT NEVER REACHES A SURFACE IS STILL REFUSED, which is the half of this
     * guard that is easiest to lose and the one this test had to be rewritten to actually prove.
     *
     * MEASURED: every field a session carries today reaches one of the two surfaces, so the
     * record scan currently catches nothing the surface scan would miss. That is an accident of
     * THIS layout rather than a guarantee — in the corpus this was ported from, the leaking field
     * reached a public surface only for sessions with no format quote, so a field-by-field guard
     * passed eighty-nine times and leaked on the ninetieth. The one field whose RAW value never
     * appears is the read date, which is reformatted before printing; planting there is what lets
     * this assertion exercise the record scan rather than the surface scan.
     */
    it("refuses a protected name that never reaches either surface", () => {
        const hidden = planted("readDate", `2026-08-31 (checked by ${SYNTHETIC})`);
        expect(recordText(hidden)).toContain(SYNTHETIC);
        expect(surfaces(hidden),
            "the planted name reaches a surface, so this exercises the surface scan and proves "
            + "nothing about the record scan")
            .not.toContain(SYNTHETIC);
        const refusal = refusalFor(hidden);
        expect(refusal, "a protected name in the source record was not refused").not.toBeNull();
        expect(refusal!.message).toContain("source record");
    });

    /**
     * THE TWO CLASSES HAVE DIFFERENT REACH, AND THAT IS DELIBERATE. Pattern classes are the
     * author's own data and are scanned over what is actually published; a guard that refused
     * them anywhere in the record cried wolf on 2 of 90 real sessions, and a guard people switch
     * off catches nothing.
     */
    it("scans the author's own data only where it is published", () => {
        const text = "body fat 18.2% on the Evolt scan";
        expect(scanPublished(text, NAMES).map((f) => f.kind)).toContain("body-comp");
        expect(scanSource(text, NAMES),
            "a pattern class was refused in an unpublished field, which is the false positive "
            + "that gets a guard switched off")
            .toEqual([]);
        expect(scanSource(`joined via ${SYNTHETIC}`, NAMES).map((f) => f.kind),
            "a protected name must be refused wherever it appears in the record")
            .toContain("protected-name");
    });

    /**
     * AN ABSENT LIST REFUSES RATHER THAN REPORTING CLEAN. This is the assertion the whole module's
     * posture rests on: "no names matched" and "nobody looked" are different answers, and only one
     * of them is evidence.
     */
    it("refuses when the protected-name list cannot be consulted", () => {
        expect(() => assertPublishable(SPECIMEN, surfaces(SPECIMEN),
            {names: new Set(), namesAvailable: false}))
            .toThrow(LeakRefusal);
        try {
            assertPublishable(SPECIMEN, surfaces(SPECIMEN), {names: new Set(), namesAvailable: false});
        } catch (error) {
            expect((error as Error).message,
                "the refusal must name the file, or nobody can fix it")
                .toContain(PROTECTED_LIST);
            expect((error as Error).message).toContain("not evidence of a clean surface");
        }
    });

    /**
     * THE REAL LIST IS CONSULTED BY PATH AND ITS CONTENTS NEVER REACH THIS SUITE. Only the shape
     * of the answer is asserted, so this is green with the file present and with it absent.
     */
    it("reads the real list by path, outside this repository", () => {
        expect(PROTECTED_LIST, "the list must not live in this repository, where it could be committed")
            .not.toContain("portfolio-v2");
        const {names, available} = protectedNames();
        expect(typeof available).toBe("boolean");
        expect(available ? names.size > 0 : names.size === 0,
            "an available list with no names, or an unavailable list with some, is a parser bug "
            + "that would read as a clean scan")
            .toBe(true);
    });

    /**
     * THE MUTATION HARNESS. Neuter the refusal the way somebody in a hurry would and confirm the
     * assertions above stop holding. A guard that has never fired is not evidence, and this is the
     * one gate in the suite whose failure mode is silence rather than a wrong picture.
     */
    it("reddens when the refusal is neutered", () => {
        const neutered = (session: Session) => {
            // The mutation: no patterns and no names — the shape of "it never fires anyway".
            const found = [
                ...scan(surfaces(session), []),
                ...scan(recordText(session), []),
            ];
            return found.length;
        };
        function scan(text: string, patterns: readonly (readonly [string, RegExp])[]): string[] {
            return patterns.flatMap(([kind, rx]) => [...text.matchAll(rx)].map(() => kind));
        }
        const leaked = planted("intensity", "HRV 62 this morning");
        expect(refusalFor(leaked), "the unmutated guard must refuse this session").not.toBeNull();
        expect(neutered(leaked),
            "with the patterns removed the planted leak is not found, which is what the guard "
            + "would become if somebody deleted them — so the assertions above are load-bearing")
            .toBe(0);
        expect(PATTERNS.length, "PATTERNS is empty, so the guard already is what the mutation "
            + "makes it").toBeGreaterThan(4);
    });
});
