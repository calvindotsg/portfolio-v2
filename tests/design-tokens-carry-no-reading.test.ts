import {readFileSync} from "node:fs";

import {describe, expect, it, vi} from "vitest";

/**
 * THE GATE THAT KEEPS A LIVE READING OUT OF THE COMMITTED TOKEN DOCUMENT, AND IT LIVES IN ITS
 * OWN FILE BECAUSE IT HAS TO MOCK THE BOT'S JSON.
 *
 * `design_tokens.json` is committed AND served, and `tests/build-output.test.ts` asserts the two
 * are the same bytes. That arrangement is only sound while the render is a function of committed
 * source a person edits — because the one writer that cannot re-render it is the nightly bot,
 * which rewrites `src/data/strava-progress.json` with no toolchain in the job.
 *
 * IT ALREADY FAILED ONCE, WHICH IS WHY THIS IS A GATE RATHER THAN A COMMENT. The brand mark's
 * bar is live, and `renderDesignTokens` published that fraction. The first goals update after the
 * mark landed therefore moved a number in the built file that its own pull request had no way to
 * move in the committed one, and the branch went red on two suites at once with nothing in the
 * diff a reviewer could fix. Every nightly behind it would have done the same.
 *
 * WHY MOCKING IS THE ONLY HONEST WAY TO ASK. The suite otherwise renders against whatever the bot
 * last wrote, so a dependence on that data is invisible on every day the committed snapshot
 * happens to be current — which is most days, and always the day the regression is introduced.
 * Forcing the data somewhere it has never been is what makes the question answerable at all. This
 * is the device `tests/clock-split.test.ts` sets down first, for the same reason and with the same
 * file-scoping caution: `vi.mock` must not reach the suites that compare recomputed values against
 * pages in `dist/`, which were built with the real figures.
 *
 * THE FIGURES BELOW ARE DELIBERATELY ABSURD rather than merely different. A fill is an average of
 * two clamped fractions, so two honest sets of kilometres can land on the same rounded bytes; zero
 * against a live year cannot.
 */
vi.mock("../src/data/strava-progress.json", () => ({
    default: {cycling_km: 0, running_km: 0, updated_at: "2026-01-01"},
}));

const {renderDesignTokens} = await import("../src/lib/design-doc");
const {markFill} = await import("../src/lib/brand-mark");

describe("the token document is a drawing, not a reading", () => {
    /**
     * The mock has to actually bite, or the assertion below passes for the wrong reason — a
     * mock that silently failed to apply would leave the real figures in place and prove
     * nothing. `markFill` is the value in question, so it is the value checked.
     */
    it("mocks the bot's JSON hard enough to move the mark's own fill", () => {
        expect(markFill(), "the mock did not reach `GOALS`, so nothing below is evidence")
            .toBe(0);
    });

    it("renders the committed bytes even when the bot's kilometres are impossible", () => {
        expect(renderDesignTokens(), "`design_tokens.json` moved when `src/data/strava-progress.json` "
            + "did. It is committed and asserted byte-identical against the route it renders, and "
            + "the nightly bot runs no toolchain to regenerate it — so this value reddens a pull "
            + "request holding nothing that could fix it. Publish the geometry; leave the reading "
            + "to the surfaces that redraw it")
            .toBe(readFileSync("design_tokens.json", "utf8"));
    });
});
