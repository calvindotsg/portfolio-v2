import {readFileSync, readdirSync, existsSync} from "node:fs";
import {parseHTML} from "linkedom";
import sharp from "sharp";
import {describe, expect, it} from "vitest";

import {CAREER, PROJECTS, WELCOME} from "../src/content/home";
import {PATCHES} from "../src/content/races";
import {FOOTER, LINKS, METADATA} from "../src/content/site";
import {GOALS} from "../src/lib/goal";
import {EVENTS} from "../src/data/races";
import {raceKm, recordingsOf} from "../src/lib/race";
import stravaProgress from "../src/data/strava-progress.json";
import {patchState} from "../src/lib/projection";
import {iconClass} from "../src/lib/icons";
import {contrast, expandHex} from "./helpers/contrast";
import {decl, isStateful, pageCss, parseRules, splitSelectorList, structuralSelector} from "./helpers/css";
import {builtPages, classTokens, cssChunks} from "./helpers/pages";

/**
 * Asserts on what `pnpm build` actually emits. A green build is not evidence the
 * site is correct — these checks are what make it evidence.
 */

const read = (p: string) => readFileSync(p, "utf8");

/**
 * THE ONE PAGE TWO BUILD-WIDE GATES BELOW CANNOT HOLD, and it is named here rather than
 * described, so the exemption is a fact about THIS page and a second unlisted or
 * unreachable page still fails.
 *
 * `src/pages/404.astro` exists because Cloudflare Pages answers an unknown path by serving
 * `/index.html` with a 200 where no `404.html` is present — see the note in that file. What
 * it cannot be is a page in the sitemap or a page anything links to: it is the answer to a
 * URL the site does not have, so a crawler must not index it and no reader can be sent to
 * it deliberately. Both properties are asserted positively beside the loops that skip it —
 * the gates keep their reach, and this page keeps having to earn its exemption.
 */
const NOT_FOUND_PAGE = "dist/404.html";

/**
 * The shared decorative-mark rules in `BasicLayout.astro` — an `[aria-hidden]` presetIcons mask,
 * matched by the attribute pair that scopes them (`[class^="i-"]` / `[class*=" i-"]`) rather than
 * by a class name, because the whole point of those rules is that they name no component. Every
 * page wears them, so a per-page forced-colours count that includes them cannot discriminate.
 */
const SHARED_MARK_SELECTOR = /\[aria-hidden\]\[class[\^*]=/;

describe("dist/", () => {
    it("emits a robots.txt that points crawlers at the sitemap", () => {
        expect(existsSync("dist/robots.txt")).toBe(true);
        const robots = read("dist/robots.txt");
        expect(robots).toMatch(/User-agent:\s*\*/);
        expect(robots).toContain("Sitemap:");
        expect(robots).toContain(new URL("sitemap-index.xml", METADATA.site_url).href);
    });

    it("emits a sitemap index referencing the deployed origin", () => {
        expect(existsSync("dist/sitemap-index.xml")).toBe(true);
        expect(read("dist/sitemap-index.xml")).toContain(METADATA.site_url);
    });

    /**
     * ROBOTS.TXT MUST NOT GIVE ANY CRAWLER ITS OWN GROUP. A draft of the generated
     * `robots.txt` listed eight answer-engine agents -- GPTBot, ClaudeBot,
     * PerplexityBot and friends -- each with `Allow: /`, meaning to say that citation
     * is welcome. It said nothing `User-agent: *` was not already saying, and it armed
     * a trap: under the robots protocol a crawler obeys the single most specific group
     * matching its name and IGNORES `*` entirely. The day a `Disallow:` is added to
     * `*`, every separately-named agent would sail past it.
     *
     * So this asserts the shape rather than the wording: exactly ONE `User-agent`
     * group. Naming an agent is legitimate only to give it rules that DIFFER from `*`,
     * and on a site where everything is public there are none -- so if this ever needs
     * to change, the reason belongs beside the change.
     */
    it("grants the whole site to one group, and gives no crawler its own", () => {
        const directives = read("dist/robots.txt").split("\n")
            .map((line) => line.trim().replace(/\s+/g, " "))
            .filter((line) => line && !line.startsWith("#"));
        expect(directives.map((line) => line.toLowerCase()),
            "robots.txt must say exactly this and nothing else").toEqual([
            "user-agent: *",
            "allow: /",
            `sitemap: ${new URL("sitemap-index.xml", METADATA.site_url).href}`.toLowerCase(),
        ]);
    });

    /**
     * THE SITEMAP CARRIES NO `lastmod`, AND THAT IS THE ASSERTION -- an absent date is
     * ignored at no cost, while a wrong one is a claim. The reasoning is in
     * `astro.config.mjs`; the short version is that both candidate dates fail Google's
     * own "consistently and verifiably accurate" test on this site, measured:
     *
     *   `BUILD_DATE` claims all four pages changed on every nightly rebuild.
     *   `updated_at` is worse than it looks. Move the kilometres and the three patch
     *   pages get a new stamp while coming out BYTE-IDENTICAL -- they contain no Strava
     *   kilometre at all. Freeze the kilometres and run the calendar forward six days and
     *   all four pages change -- countdowns tick, a bib flips to earned -- while the stamp
     *   does not move. The second direction is the harmful one: a frozen `lastmod` on a
     *   page that did change is an instruction not to come back.
     *
     * So this gate is pointed at the thing most likely to be re-added by someone who
     * reads "the sitemap has no lastmod" as an oversight. If a real per-URL date ever
     * exists -- derived from the built OUTPUT, not from an input -- this is the test to
     * rewrite, and the config comment says what to watch out for.
     */
    it("puts no date on the sitemap, having none it can stand behind", () => {
        for (const file of ["dist/sitemap-0.xml", "dist/sitemap-index.xml"]) {
            expect(read(file), `${file} carries a <lastmod> this site cannot justify per URL`)
                .not.toContain("<lastmod>");
        }
    });

    /**
     * `/llms.txt` IS DERIVED, AND THIS IS WHAT MAKES THAT TRUE RATHER THAN INTENDED.
     * It replaced a hand-written `public/llms.txt` that had drifted on every axis --
     * wrong job title, paraphrased project descriptions, a whole project missing --
     * and none of that was detectable because a file in `public/` has no relationship
     * to the constants it paraphrases. These assertions are that relationship.
     *
     * WHAT THIS CANNOT CATCH, AND WHY THAT IS CORRECT — found by calibrating it wrongly
     * first. Editing a description in `constants.ts` leaves this GREEN, because the
     * endpoint regenerates from the same constant the assertion reads: both sides move
     * together and the comparison is a tautology. That is not a hole to plug. Pinning
     * the literal string here would put the description in two places again, which is
     * the precise defect the endpoint was written to remove.
     *
     * So the axis this DOES gate is omission, and the calibration has to mutate the
     * ENDPOINT rather than the constant. Executed: deleting the `PROJECTS` map, the
     * completed-race list, and the `full_name` H1 each turn it red, with the messages
     * naming which. A green here means every constant still reaches the file — not that
     * any constant is right.
     */
    it("emits an llms.txt carrying the constants it claims to summarise", () => {
        expect(existsSync("dist/llms.txt")).toBe(true);
        const llms = read("dist/llms.txt");

        const lines = llms.split("\n");

        // ASSOCIATION, NOT PRESENCE, and this is the correction that matters. Asserting
        // each constant independently only says every token is SOMEWHERE in the file, so
        // the endpoint may pair any name with another row's url, description or distance
        // and stay green. Each row is therefore found by its own key and the rest of the
        // row asserted ON THAT LINE.
        //
        // THE KEY IS A CONJUNCTION, because a race's NAME IS NOT UNIQUE and a single-key
        // lookup silently resolves to the wrong row. An annual race entered in more than
        // one year gives several events the same `name`, so `.find()` on it returns the
        // FIRST edition for all of them and every assertion below compares one year's row
        // against another year's facts — green when the endpoint is wrong, red when it is
        // right. This is the same defect tests/patch-wall.test.ts records fixing in its own
        // `.find()`; it survived here because THIS file keyed on the name too, and nothing
        // caught it until one race appeared twice. Key on whatever combination
        // is unique for the row, never on a display string alone.
        const rowFor = (what: string, ...keys: string[]) => {
            const row = lines.find((line) => keys.every((key) => line.includes(key)));
            expect(row, `${what} must appear in llms.txt, keyed by ${keys.join(" + ")}`).toBeDefined();
            return row as string;
        };

        expect(llms.startsWith(`# ${METADATA.full_name}\n`), "H1 must be the full name").toBe(true);
        expect(lines[2].startsWith("> "), "a blockquote summary must follow the H1").toBe(true);
        expect(lines[2], "the blockquote must say who this is").toContain(CAREER[0].job_name);
        expect(lines[2], "the blockquote must carry the summary").toContain(METADATA.professional_summary);
        expect(llms).toContain(METADATA.description);
        expect(llms).toContain(CAREER[0].company);
        expect(llms).toContain(stravaProgress.updated_at);

        // NON-EMPTY, because `toContain("")` is true of every string. An emptied
        // `professional_summary` shipped three blank-ish lines with the whole suite green.
        expect(METADATA.professional_summary.length, "the summary must say something").toBeGreaterThan(0);
        expect(PROJECTS.length, "there must be projects to list").toBeGreaterThan(0);
        expect(GOALS.length, "there must be goals to list").toBeGreaterThan(0);
        expect(EVENTS.length, "there must be events to list").toBeGreaterThan(0);

        for (const goal of GOALS) {
            const row = rowFor(`${goal.goal_name}'s progress`, `- ${goal.goal_name}:`);
            expect(row, `${goal.goal_name}'s own numbers must be on its own line`)
                .toContain(`${goal.raw_progress} of ${goal.total_goal} ${goal.measurable_unit}`);
        }
        for (const event of EVENTS) {
            // Name AND date, which is what makes the row unique — see the note on `rowFor`.
            // FINDING the row is therefore also the date assertion that used to sit below
            // this loop: no line carrying both means the endpoint has separated a race from
            // its own date, and `rowFor` fails naming both keys. Re-adding a
            // `toContain(event.date)` here would only restate the key.
            const row = rowFor(`${event.name} (${event.date})`, event.name, event.date);
            // NOT EVERY RACE HAS A DISTANCE TO PRINT. An abandoned race with nothing recorded
            // has no honest figure — `raceKm` would hand back the ADVERTISED distance, i.e.
            // the claim that he covered a route he did not finish — so the endpoint omits the
            // clause entirely and this asserts the omission rather than demanding a number.
            if (patchState(event) === "dnf" && recordingsOf(event).length === 0) {
                expect(row, `${event.name} was abandoned with nothing recorded, so no distance may be claimed`)
                    .not.toMatch(/\d+\.\d\d km/);
            } else {
                expect(row, `${event.name}'s distance must be on its own line`)
                    .toContain(`${raceKm(event).toFixed(2)} km`);
            }
            expect(row, `${event.name}'s country must be on its own line`).toContain(event.country);
        }
        for (const project of PROJECTS) {
            const row = rowFor(`${project.name}'s repo link`, `](${project.repo_url})`);
            expect(row, `${project.name} must be the label on its own repo link`)
                .toContain(`[${project.name}](`);
            expect(row, `${project.name} must quote its description`).toContain(project.description);
        }

        // EVERY BUILT PAGE MUST BE LINKED, which nothing asserted: the whole `## Pages`
        // section could be deleted and the suite stayed green. llms.txt is a map of the
        // site, and a map missing the wall is the one failure it exists to prevent.
        for (const page of builtPages().filter((p) => p !== NOT_FOUND_PAGE)) {
            const url = new URL(page.replace(/^dist/, "").replace(/index\.html$/, ""), METADATA.site_url).href;
            expect(llms, `${page} is built but ${url} is linked from nowhere in llms.txt`)
                .toContain(`](${url})`);
        }
    });

    /**
     * llms.txt MUST SPLIT RACES THE WAY THE WALL DOES. The endpoint asks `patchState`;
     * the first draft compared `end_date ?? date` against `BUILD_DATE` instead, and that
     * is wrong on exactly one day — the day of a race. `patchState` asks `hasRecording`
     * BEFORE the clock, because a race run this morning is a patch today (#97). A date
     * comparison misses it, so the wall would read "finished" while llms.txt still read
     * "still to come".
     *
     * It was invisible when written: the most recent race already had yesterday's date.
     *
     * WHAT THIS GATE IS AND IS NOT, because the calibration came back green and that is
     * worth reporting rather than burying. Restoring the date comparison leaves this
     * PASSING on an ordinary day — the two predicates agree on every day that is not a
     * race day, so there is nothing to catch. It goes red on the day it matters, which is
     * the day the bug appears, and that is the whole of its value: it is a correct
     * assertion with a CALENDAR-DEPENDENT reach, not a proof that ran.
     *
     * Making it fire every day would need a synthetic event injected into the built
     * artifact, which `EVENTS` does not allow. The compensating cover is that
     * `patchState` itself — including the `hasRecording`-before-the-clock rule this
     * depends on — is unit-tested against pinned days in `tests/projection.test.ts`.
     */
    it("splits llms.txt races by patchState, not by a date comparison", () => {
        const llms = read("dist/llms.txt");
        // FIND THE BOUNDS BEFORE SLICING BETWEEN THEM. A missing marker makes `indexOf`
        // return -1, and `slice(-1, n)` is a silently empty or wildly wrong window rather
        // than an error -- so renaming a heading would have degraded this gate into one
        // that reports on a string nobody meant, instead of failing.
        //
        // THE MIDDLE SECTION IS CONDITIONAL, and asserting THAT is half of this gate. The
        // endpoint omits the DNF list when nothing was abandoned — an empty heading would
        // advertise a category the record does not hold — so the marker list is built from
        // the calendar and the presence of the heading is itself checked, both directions.
        // Deriving the markers without that check would let the section silently vanish.
        const dnfHeading = `${PATCHES.dnf_name}:`;
        const anyDnf = EVENTS.some((event) => patchState(event) === "dnf");
        expect(
            llms.includes(dnfHeading),
            `llms.txt must carry a "${dnfHeading}" section when, and only when, a race on the calendar was abandoned`,
        ).toBe(anyDnf);

        const markers = ["completed:", ...(anyDnf ? [dnfHeading] : []), "Still to come:", "## Pages"];
        const bounds = markers.map((marker) => {
            const at = llms.indexOf(marker);
            expect(at, `llms.txt must contain the "${marker}" marker this gate slices on`)
                .toBeGreaterThan(-1);
            return at;
        });
        // Keyed by the STATE each section holds, so the loop below can ask one question per
        // event instead of enumerating pairs — and so a fourth state fails the coverage
        // check underneath rather than quietly landing in no section at all.
        const sections: Record<string, string> = {
            finished: llms.slice(bounds[0], bounds[1]),
            ...(anyDnf ? {dnf: llms.slice(bounds[1], bounds[2])} : {}),
            booked: llms.slice(bounds[markers.length - 2], bounds[markers.length - 1]),
        };
        for (const state of new Set(EVENTS.map((event) => patchState(event)))) {
            expect(Object.keys(sections), `llms.txt has no section for the "${state}" state`).toContain(state);
        }

        // THESE LISTS ARE THE WHOLE CALENDAR, SO THEIR HEADINGS MAY NOT NAME A YEAR.
        // `EVENTS` is every race in any year -- the scope rule above `eventsInYear` --
        // while `GOAL_YEAR` is what a goal card counts, and the first draft wrote "Races
        // and challenges in 2026" over the unfiltered list. That reads true only while
        // every race falls in one year, which is exactly why the wall dropped "My events
        // · 2026" from its own title. Unlike the split below, this fires on any day.
        //
        // TAKE THE WHOLE LINE, NOT THE SLICE. Written against `completed.split("\n")[0]`
        // this passed the very mutation it exists to catch: the slice begins AT the
        // "completed:" marker, so a heading of "Races and challenges in 2026, completed:"
        // puts the year BEFORE the window and the assertion inspects "completed:" alone.
        const headings = llms.split("\n")
            .filter((line) => line.endsWith("completed:") || line === "Still to come:" || line === dnfHeading);
        expect(headings, "every race-list heading must be found").toHaveLength(markers.length - 1);
        for (const heading of headings) {
            expect(heading, `"${heading}" names a year over the whole-calendar EVENTS list`)
                .not.toMatch(/\d{4}/);
        }

        // MATCHED ON DATE AND NAME, NOT ON NAME ALONE, and the calendar forces it: the
        // round-island ride appears THREE times under one name, and they are no longer all
        // in the same section — the 2023 running of it was abandoned. A bare
        // `section.includes(event.name)` reports every one of them as present in every
        // section that holds any of them, which is an assertion that cannot fail and
        // cannot discriminate. Reconstructing the rendered line also means a change to the
        // endpoint's format goes red here instead of degrading this into a check on a
        // string nobody emits.
        // AND THE DISTANCE CLAUSE, BECAUSE A DNF's KILOMETRES MEAN SOMETHING ELSE. In every
        // other bucket the figure is how long the race WAS; on an abandoned one it is how far
        // he got, and the row has to carry that itself — this file is written to be chunked,
        // so a row quoted away from its heading keeps the number and loses the meaning. The
        // second `expect` is what makes this discriminate rather than merely pass: without
        // it, labelling EVERY row is as green as labelling the right ones.
        // THE ADVERTISED FIGURE IS REACHED ONLY WHERE THERE ARE NO METRES, and that guard is
        // now the whole invariant rather than a convenience. A recorded race used to be unable
        // to carry a stored distance at all — the type forbade it — so reading the field
        // unconditionally gave `undefined km` for every one of them, which is what this
        // assertion caught when the two changes met. A recorded race CAN carry one now (it is
        // the organiser's own division, printed on the bib's ledger beside the ride), so
        // reading it unconditionally would no longer be loudly wrong: it would quietly print
        // 21.10 for a race that ran 22.45. The `parts.length > 0` branch is what keeps this
        // oracle independent of that, mirroring the precedence `raceKm` documents.
        /*
         * AN INDEPENDENT ORACLE, NOT A SECOND CALL TO THE ENDPOINT'S OWN EXPRESSION.
         *
         * This used to be `raceKm(event)` interpolated exactly as `llms.txt.ts` interpolates
         * it — byte-identical source on both sides. That gate could only ever see WHICH
         * expression the endpoint used, never what the expression PRODUCES, so it was green
         * on the day the endpoint told a crawler that an abandoned race had covered its full
         * advertised distance. A test that re-derives its expectation from the code under
         * test asserts nothing about the output.
         *
         * So the kilometres are re-derived here from the row's OWN STORED FIELDS, applying
         * Strava's rounding rule (metres, truncated DOWN to two places) rather than calling
         * the function that applies it. If `kmFromMetres` ever changes its rule, this goes
         * red — which is the point: the rule has been reversed twice, and a gate that
         * follows it silently is a gate that cannot notice.
         *
         * AND THE MICRON SNAP IS PART OF THE RULE, not part of the implementation. An oracle
         * that re-derives the arithmetic has to re-derive ALL of it: adding doubles is not
         * exact, so a three-part race can sum to 158469.99999999997 where the metres say
         * 158470, and a bare `Math.floor` then expects 158.46 for a race the site correctly
         * prints as 158.47. The first draft of this oracle omitted the snap and would have
         * turned the DEPLOY red against a correct build the day such a race was entered —
         * confidently wrong, in the direction that looks most rigorous. `raceKm` documents
         * the snap and why it is 1e-6; this mirrors it rather than calling it, and the
         * mirroring is the whole reason the oracle is worth having.
         */
        const expectedKm = (event: typeof EVENTS[number]): string => {
            const parts = recordingsOf(event);
            const metres = parts.reduce((m, r) => m + r.metres, 0);
            const km = parts.length > 0
                ? Math.floor(Math.round(metres * 1e6) / 1e6 / 10) / 100
                : (event as {advertised_km?: number}).advertised_km ?? NaN;
            return km.toFixed(2);
        };

        /*
         * AND THE ORACLE IS ITSELF GUARDED, because the calendar cannot guard it.
         *
         * The snap above only changes an answer for a race of THREE OR MORE parts — two doubles
         * cannot land on the wrong side of a hundredth, as `raceKm` says in place. When this was
         * written the calendar held seven one-part races and three two-part ones and nothing
         * else, so deleting the snap from this oracle left the whole suite green: measured, and
         * the same defect class three of this file's other gates had just been repaired for.
         *
         * NOTHING HERE ASSERTS THE CALENDAR STILL LOOKS LIKE THAT, deliberately. A first draft
         * of this block did — `EVENTS.every(e => recordingsOf(e).length < 3)` — and that is a
         * gate that goes RED THE DAY A CORRECT DATA EDIT LANDS, since a race split across three
         * activities is an ordinary thing this repo supports (a mechanical, then a lost signal).
         * It would have reddened the deploy on a true row while accusing a comment of being
         * stale, which is how a reader gets trained to loosen a gate. The fixture below does not
         * care either way: if such a race is entered, this simply stops being the ONLY thing
         * exercising the snap.
         *
         * `tests/content.test.ts` guards the snap inside `raceKm` with a synthetic fixture for
         * exactly this reason. This is the mirror's half, and it has to be a HAND-COMPUTED
         * figure rather than a second call to `raceKm` — the moment this asks `raceKm` what the
         * answer is, the oracle stops being independent and the gate below means nothing.
         *
         * 86432.4 + 47793.2 + 24244.4 is 158470 m exactly, which is 158.47 km. IEEE sums it to
         * 158469.99999999997, so an unsnapped floor prints 158.46 — a hundredth of a kilometre
         * the rider did not lose, and a DEPLOY reddened against a correct build.
         */
        const BOUNDARY = {
            date: "2020-01-01", name: "Float-boundary fixture", sport: "cycling", country: "Nowhere",
            elapsed_time: "1:00:00",
            recordings: [{id: "a", metres: 86432.4}, {id: "b", metres: 47793.2}, {id: "c", metres: 24244.4}],
        } as unknown as typeof EVENTS[number];
        expect(expectedKm(BOUNDARY),
            "the oracle must snap the summed metres to a micron before truncating, or a three-part "
            + "race prints a hundredth less than it rode and reddens the deploy against a correct build")
            .toBe("158.47");

        // "" means THE ROW MUST CARRY NO DISTANCE AT ALL — an abandoned race with nothing
        // recorded has no honest figure to give, and the advertised one would be the exact
        // claim the bib refuses. Asserted as an absence below rather than as a substring.
        const clauseFor = (event: typeof EVENTS[number]): string =>
            patchState(event) === "dnf"
                ? (recordingsOf(event).length === 0
                    ? ""
                    : `${PATCHES.recorded_row.toLowerCase()} ${expectedKm(event)} km`)
                : `${expectedKm(event)} km`;
        for (const event of EVENTS) {
            const state = patchState(event);
            const when = event.end_date ? `${event.date} to ${event.end_date}` : event.date;
            const line = `${when} — ${event.name}`;
            expect(llms.split(line).length - 1, `"${line}" must be listed exactly once in llms.txt`).toBe(1);
            for (const [bucket, text] of Object.entries(sections)) {
                expect(text.includes(line), `"${line}" is ${state}: wrong side of the "${bucket}" list`)
                    .toBe(bucket === state);
            }
            const row = llms.split("\n").find((l) => l.includes(line));
            expect(row, `"${line}" must be on a line of its own`).toBeDefined();
            const clause = clauseFor(event);
            if (clause === "") {
                expect(row, `${event.name} was abandoned with nothing recorded, so its row must claim no `
                    + `distance at all — the advertised figure would say he covered a route he did not finish`)
                    .not.toMatch(/\d+\.\d\d km/);
            } else {
                expect(row, `${event.name} (${state}) must print "${clause}"`).toContain(clause);
            }
            if (state !== "dnf") {
                expect(row, `${event.name} is ${state}, so its distance takes no "${PATCHES.recorded_row}" label`)
                    .not.toContain(PATCHES.recorded_row.toLowerCase());
            }
        }
    });

    /**
     * THE llms.txt FORMAT IS A SPEC, NOT A VIBE (llmstxt.org): H1, then a blockquote,
     * then free prose, then `##` sections whose every list item carries a REQUIRED
     * `[name](url)` link. The first draft of the endpoint put the goals under a
     * `## Goals` heading as bare `- Running: 168.8 of 600 km` bullets, which is exactly
     * what an H2 section may not contain -- they are facts, not links. This catches
     * that shape, which review did not.
     */
    it("keeps llms.txt to the spec: every H2 list item is a markdown link", () => {
        const lines = read("dist/llms.txt").split("\n");
        const firstH2 = lines.findIndex((line) => line.startsWith("## "));
        expect(firstH2, "llms.txt must have at least one H2 section").toBeGreaterThan(-1);

        // ASSERT THE WHOLE POPULATION BELOW THE FIRST H2, not the lines that happen to
        // begin "- ". The spec says an H2 section IS a file list, so every non-blank,
        // non-heading line down there must be a link item -- and stating it that way is
        // what makes the list MARKER irrelevant. Matching `- ` alone gated the spelling
        // rather than the rule: markdown treats `*`, `+` and `1.` as the same construct,
        // and the exact violation this test exists to catch shipped green written `* `.
        const LINK_ITEM = /^- \[[^\]]+]\(https?:\/\/[^)]+\)(: .+)?$/;
        const offenders = lines.slice(firstH2)
            .filter((line) => line.trim() && !line.startsWith("## "))
            .filter((line) => !LINK_ITEM.test(line));
        expect(offenders, `every line under an H2 must be a [name](url) item: ${offenders.join(" ;; ")}`)
            .toEqual([]);

        // AND NO SECTION MAY BE EMPTY. Deleting a section's items leaves the heading with
        // nothing under it, which the offender sweep above reads as clean -- an empty
        // population has no offenders in it.
        const sections = lines.slice(firstH2).join("\n").split(/^## /m).filter(Boolean);
        for (const section of sections) {
            const [name, ...rest] = section.split("\n");
            expect(rest.filter((line) => LINK_ITEM.test(line)).length,
                `## ${name} has no link items`).toBeGreaterThan(0);
        }
    });

    /**
     * EVERY BUILT PAGE MUST BE IN THE SITEMAP. This was once the wall's ONLY discovery
     * path — nothing on the home page linked to it — and the goal cards' next-race chips
     * have since closed that, which is why the assertion after this one exists. The
     * sitemap still matters and is still asserted; it is no longer load-bearing alone.
     *
     * The gate above only greps the index for the origin, which one page satisfies. A
     * review panel dropped three of four pages out of `sitemap-0.xml` through an
     * integration filter and the whole suite stayed green — the PR quadrupled the route
     * count and this was the assertion that did not widen with it.
     */
    it("lists every built page in the sitemap", () => {
        const urls = new Set(
            [...read("dist/sitemap-0.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
        );
        expect(urls.size, "the sitemap must list something").toBeGreaterThan(0);

        // The status page must be ABSENT, which is the assertion its exemption below is
        // worth. `@astrojs/sitemap` already excludes it — `STATUS_CODE_PAGES` is its own
        // set, nothing here configures it — so this pins behaviour the site depends on and
        // does not control.
        expect(
            [...urls].filter((u) => /\/404(\.html)?\/?$/.test(u)),
            "the 404 page is in the sitemap, which asks crawlers to index the page that says a page does not exist",
        ).toEqual([]);

        for (const page of builtPages().filter((p) => p !== NOT_FOUND_PAGE)) {
            // dist/index.html -> "/", dist/patches/cycling/index.html -> "/patches/cycling/"
            const path = page.replace(/^dist/, "").replace(/index\.html$/, "");
            const expected = new URL(path, METADATA.site_url).href;
            expect(urls.has(expected), `${page} is built but ${expected} is not in the sitemap`).toBe(true);
        }
    });

    /**
     * THE SITEMAP IS NOT THE CONTROL, which is what this test exists to say. A sitemap is a
     * hint about what to CRAWL; it says nothing about what to index, and nothing stops a
     * crawler reaching a URL it was linked to. The 404 was kept out of the sitemap — with an
     * assertion — while shipping `robots: index, follow`, a self-canonical to `/404/` and an
     * `og:url` to match. `/404/` is a URL the build never emits, and a page that answers 200
     * when fetched directly, declares itself indexable and canonicalises to a dead address is
     * the textbook soft-404 signal that `src/pages/404.astro` exists to prevent. Caught by a
     * review panel rather than by any of this file's gates.
     *
     * Its own test rather than a clause inside the sitemap one, because these three failures
     * used to report under "lists every built page in the sitemap" — a name that describes
     * neither the defect nor the fix, and would send the next reader to the wrong file.
     */
    it("asks crawlers not to index the page that says a page does not exist", () => {
        const head = parseHTML(read(NOT_FOUND_PAGE)).document;
        expect(head.querySelector('meta[name="robots"]')?.getAttribute("content"),
            "the 404 page asks crawlers to index it, which is the soft-404 signal it exists to prevent")
            .toContain("noindex");
        expect(head.querySelector('link[rel="canonical"]'),
            "the 404 page self-canonicalises to a URL the build does not emit — there is no dist/404/index.html")
            .toBe(null);
        expect(head.querySelector('meta[property="og:url"]'),
            "the 404 page advertises an og:url the build does not emit — the canonical's twin, same defect")
            .toBe(null);
    });

    /** …and the flag that does it must not leak onto a page that SHOULD be found. */
    it("leaves every real page indexable", () => {
        for (const page of builtPages().filter((p) => p !== NOT_FOUND_PAGE)) {
            expect(parseHTML(read(page)).document.querySelector('meta[name="robots"]')?.getAttribute("content"),
                `${page} is no longer indexable — the 404's noindex flag has leaked onto a real page`)
                .toBe("index, follow");
        }
    });

    /**
     * EVERY BUILT PAGE IS REACHABLE FROM `/` BY FOLLOWING LINKS — a walk, not a
     * "somebody links to it" check.
     *
     * The wall shipped with nothing on the home page pointing at it, so it was an indexed
     * page a reader could only arrive at from a search result; the goal cards' next-race
     * chips closed that, and a fix nothing asserts has a shelf life.
     *
     * IT HAS TO BE A WALK FROM THE ROOT, and that is not pedantry — the first version of
     * this gate asked only whether some other page linked to each one, and the mutation
     * that removes the chips SURVIVED it: `/patches` and `/patches/cycling` link to each
     * other, so an island of pages satisfies "linked from somewhere else" while being
     * exactly as unreachable as before. Verified by injecting that mutation both before
     * and after this rewrite.
     *
     * Stated over the whole build rather than as "the home page links to
     * /patches/cycling", so a fourth route joins the gate by existing.
     */
    it("reaches every built page from the site root by following links", () => {
        const pathOf = (page: string) => page.replace(/^dist/, "").replace(/index\.html$/, "");
        const byPath = new Map(builtPages().filter((p) => p !== NOT_FOUND_PAGE).map((page) => [pathOf(page), page]));
        expect(byPath.has("/"), "the site root must be built").toBe(true);

        // THE EXEMPTION EARNS ITSELF HERE. The 404 page is unreachable by design, but a
        // reader who lands on it by mistyping must not be stranded — it is the one page
        // whose whole job is to point back into the site, so it is required to link home
        // rather than merely permitted to be an island.
        // AN ANCHOR, NOT ANY href. Regexing the raw HTML for `href="/..."` also matched
        // `<link>` elements in <head>, and this page ships `<link rel="canonical">` — so the
        // assertion whose stated job is "what a stranded reader can click" was satisfied by
        // something no reader can click. The document is parsed instead, as everywhere else
        // in this file.
        const notFoundLinks = [...parseHTML(read(NOT_FOUND_PAGE)).document.querySelectorAll("a[href]")]
            .map((a) => a.getAttribute("href"));
        expect(notFoundLinks, `${NOT_FOUND_PAGE} is reachable from nothing, so a reader who lands on it can only `
            + "leave by an anchor it carries — and it carries none to the site root").toContain("/");

        const seen = new Set<string>(["/"]);
        const queue = ["/"];
        let followed = 0;
        while (queue.length > 0) {
            const path = queue.shift()!;
            for (const m of read(byPath.get(path)!).matchAll(/href="(\/[^"#?]*)"/g)) {
                const href = m[1].endsWith("/") ? m[1] : `${m[1]}/`;
                followed++;
                if (!byPath.has(href) || seen.has(href)) continue;
                seen.add(href);
                queue.push(href);
            }
        }
        expect(followed, "no internal links followed — this assertion would be vacuous").toBeGreaterThan(1);
        expect(
            [...byPath.keys()].filter((path) => !seen.has(path)),
            "these pages are built and in the sitemap but cannot be reached from / by following links",
        ).toEqual([]);
    });

    /**
     * THE ONE DAY THE BUILD WAS DRAWN FOR, asserted on the artifact rather than recomputed.
     *
     * `<meta name="build-date">` is what the wall assertions read to avoid comparing a page
     * built yesterday against today's clock, and nothing gated the tag itself: delete it, or
     * emit a different day per page, and the only symptom was a helper throwing elsewhere.
     * One build must stamp exactly one Singapore day on every page.
     *
     * Deliberately CLOCK-FREE — it compares the pages to each other and checks the shape, so
     * it can never redden on a future build day. A red suite blocks the deploy.
     */
    it("stamps every page with the one day the build was drawn for", () => {
        const stamps = new Map<string, string>();
        for (const page of builtPages()) {
            const found = [...read(page).matchAll(/<meta name="build-date" content="([^"]*)"/g)];
            expect(found.length, `${page} must carry exactly one <meta name="build-date">`).toBe(1);
            expect(found[0][1], `${page}'s build date must be an ISO day`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            stamps.set(page, found[0][1]);
        }
        expect(new Set(stamps.values()).size,
            `one build, one day: saw ${[...new Set(stamps.values())].join(", ")}`).toBe(1);
    });

    /**
     * A CONTROL AND THE PAGE IT OPENS MUST USE THE SAME WORDS, and this is the assertion
     * the previous revision needed and did not have.
     *
     * The goal cards offered "My cycling events" and the page that opened was headed
     * "Cycling patches", so a reader was handed one name and shown another the moment
     * they arrived. Both strings were individually defensible, both were reviewed, and
     * nothing could see the pair because no test read two pages at once.
     *
     * The rename that fixed it was not a preference either: a patch is a race COMPLETED
     * AND EARNED, and that page shows booked outlines beside earned bibs, so "patches"
     * named the wall after a subset of what is on it.
     *
     * Asserted across the built pages, in both directions — every goal control must be
     * headed by its destination, and no OTHER page may claim the same heading, which is
     * what stops the three walls collapsing back onto one title.
     */
    it("heads each destination with the words the control that reaches it wears", () => {
        const home = parseHTML(read("dist/index.html")).document;
        const controls = [...home.querySelectorAll(".events-link")];
        expect(controls.length, "no events controls on the home page — this assertion would be vacuous")
            .toBe(GOALS.length);

        const headings = new Map<string, string>();
        for (const control of controls) {
            const href = control.getAttribute("href")!;
            const label = (control.textContent ?? "").replace(/\s+/g, " ").trim();
            const page = `dist${href.replace(/\/$/, "")}/index.html`;
            expect(existsSync(page), `${href} is linked from a goal card but ${page} was not built`).toBe(true);

            const doc = parseHTML(read(page)).document;
            expect(
                doc.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim(),
                `the control says "${label}" and ${href} is headed differently — a reader is told one name and shown another`,
            ).toBe(label);
            headings.set(href, label);
        }

        const all = builtPages().map((page) => ({
            page,
            h1: parseHTML(read(page)).document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim(),
        })).filter((p) => p.h1);
        expect(new Set(all.map((p) => p.h1)).size, `two pages share a heading: ${all.map((p) => `${p.page} "${p.h1}"`).join(", ")}`)
            .toBe(all.length);
    });

    /**
     * NO PAGE'S CSS IS DUPLICATED ACROSS PAGES — which is what "how much does a visitor
     * download" actually reduces to, and it is NOT the same claim as "exactly one chunk".
     *
     * THIS ASSERTION USED TO SAY `css.length === 1` and the docstring called that "a
     * claim about how much a visitor downloads". It was really a claim about a BYTE
     * COUNT: Astro's `inlineStylesheets: "auto"` inlines a component's scoped CSS up to
     * ~4kB and emits a chunk past it, so "one chunk" held only while `Patch.astro`'s
     * block stayed under the threshold. Adding one 15px line to the bib crossed it, and
     * the count went to two with nothing wrong.
     *
     * Measured both ways before rewriting this, because the change had to be shown to be
     * neutral rather than assumed:
     *
     *     visitor path            before (1 chunk + inline)      after (2 chunks)
     *     / only                  26.3kB                         26.3kB
     *     / then /patches         26.3 + 4.1 inline = 30.4kB     26.3 + 4.2 = 30.5kB
     *     all three patch pages   26.3 + 3 x 4.1 = 38.6kB        26.3 + 4.2 = 30.5kB
     *
     * So the split costs one extra request on the first wall page and SAVES 8kB across
     * the wall, because a chunk is cached where an inline block is re-sent per page. The
     * old assertion would have blocked that as a regression.
     *
     * What is left is the property that cannot be satisfied by luck: the same rule must
     * not ship twice. `pageCss()` stays per-page for the separate question of what the
     * cascade does on one page.
     */
    it("ships no CSS rule on more than one route's worth of files", () => {
        // Selector text is the unit: a rule duplicated across two chunks is bytes every
        // visitor to both pages pays twice, which is the thing the old count stood in for.
        const selectorsOf = (css: string) =>
            new Set([...css.matchAll(/(^|})\s*([^{}@]+)\{/g)].map((m) => m[2].trim()).filter(Boolean));
        const seen = new Map<string, string>();
        const shared: string[] = [];
        for (const {file, css} of cssChunks()) {
            for (const selector of selectorsOf(css)) {
                const first = seen.get(selector);
                if (first !== undefined && first !== file) shared.push(`${selector} in ${first} and ${file}`);
                else seen.set(selector, file);
            }
        }
        expect(shared.slice(0, 5), "these rules are emitted in more than one chunk").toEqual([]);

        // And no page may load a chunk while also inlining the same rules.
        for (const page of builtPages()) {
            const html = read(page);
            const inline = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
            if (inline === "") continue;
            const linked = [...html.matchAll(/rel="stylesheet" href="([^"]+)"/g)]
                .map((m) => read(`dist${m[1]}`)).join("\n");
            const both = [...selectorsOf(inline)].filter((sel) => selectorsOf(linked).has(sel));
            expect(both.slice(0, 5), `${page} both inlines and links these rules`).toEqual([]);
        }
    });

    /**
     * KEEPS `pageCss()` HONEST, because every other CSS assertion in this suite is
     * only as complete as it is.
     *
     * Astro's default `inlineStylesheets: "auto"` decides at build time how much of
     * a page's CSS ships as a linked chunk and how much is inlined into a `<style>`.
     * That balance is not stable: measured, adding one four-line route moved 2,889
     * bytes — the whole layout block, `body`, and every theme custom property on
     * `:root[data-theme]` — out of the chunk and into the page, and turned 16 tests
     * across four files red with nothing wrong with the site.
     *
     * So the invariant is not "there is one stylesheet"; the one above covers that.
     * It is that whatever the page loads, `pageCss()` returns ALL of it. Then the
     * flip is invisible to every caller.
     *
     * THE BLIND SPOT IS CLOSED. When this was written the single-route build carried
     * no inline block at all, so the inline loop below was vacuous and said so. The
     * patch wall's three routes are the build that changed it: every page now ships
     * one inline `<style>` alongside the shared chunk, and the loop below is live on
     * all four. Asserted over every page rather than the home page, since the
     * rebalancing is Astro's decision per page and not a property of any one of them.
     */
    it("hands callers every byte of CSS each page loads, linked and inlined alike", () => {
        let inlineBlocks = 0;
        for (const page of builtPages()) {
            const html = read(page);
            const css = pageCss(page);
            const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!);
            const linked = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]!);
            inlineBlocks += inline.length;

            expect(inline.length + linked.length, `${page} must load CSS from somewhere`).toBeGreaterThan(0);
            for (const block of inline) expect(css, `${page}: an inlined <style> block is missing from pageCss()`).toContain(block);
            for (const href of linked) expect(css, `${page}: ${href} is missing from pageCss()`).toContain(read(`dist${href}`));

            // Coverage by length too, so a source cannot be dropped while its bytes
            // happen to appear inside another one.
            const bytes = [...inline, ...linked.map((h) => read(`dist${h}`))].reduce((n, s) => n + s.length, 0);
            expect(css.length, `${page}: pageCss() is shorter than its own sources`).toBeGreaterThanOrEqual(bytes);
        }
        // Non-vacuity for the half that used to be dead: if Astro stops inlining, the
        // loop above proves nothing about inline blocks and this says so rather than
        // passing quietly.
        expect(inlineBlocks, "no page ships an inlined <style> — the inline half of this test is vacuous again").toBeGreaterThan(0);
    });

    /**
     * The old idiom this replaced — `readdirSync("dist/_astro").find(…endsWith(".css"))`
     * — reads ONE arbitrary chunk and never sees an inlined block. It is green today
     * and wrong the moment a second route exists, which is the worst shape a test
     * helper can have. Fifteen call sites had it; this stops the sixteenth.
     *
     * The survivors in this file are deliberate: they count emitted files as an
     * output-hygiene check and never read a rule out of one. A test that legitimately
     * needs the rules PER FILE — "is this selector shipped twice" is such a question, and
     * `pageCss()` cannot answer it because a shared chunk is inside every page's union —
     * goes through `cssChunks()` in the helpers layer instead.
     */
    it("routes every CSS read in the suite through pageCss()", () => {
        const files = readdirSync("tests", {recursive: true, encoding: "utf8"})
            .filter((f) => f.endsWith(".ts"));
        const offenders = files.filter((f) => {
            // The HELPERS layer owns build-level reads — `pageCss()` is defined in one of
            // them and `cssChunks()` in another — and each says which question it answers.
            // Exempting the directory rather than a growing list of filenames is what keeps
            // this gate structural: a test that needs chunk files goes through a named
            // helper, which is the behaviour being enforced, not an exception to it.
            if (f.startsWith("helpers/")) return false;
            const src = read(`tests/${f}`);
            // ANY literal path INTO the asset directory, whichever function does the
            // reading. The previous pattern matched two spellings only — a
            // readdirSync-then-readFileSync chain, and this file's own `read` helper — so a
            // plain readFileSync of a named chunk inside that directory walked straight
            // through it while the docstring above claimed "every CSS read in the suite".
            // Verified by injecting exactly that in a scratch test file: the old pattern
            // passed it, this one fails it.
            //
            // LISTING the directory stays legal, which is why the path has to go DEEPER
            // than the directory itself: the JavaScript-count gate below lists it and never
            // opens a file, and that is the output-hygiene use this rule was always fine
            // with.
            //
            // NOTE THE SELF-REFERENCE TRAP — this comment cannot spell the path it is
            // matching, or the gate reports this file. It did, once.
            //
            // A computed path still evades this, and that is stated rather than papered
            // over: a regex over source cannot follow a variable. The helpers layer is
            // where computed chunk paths are supposed to live, and it is exempt.
            return /["'`]dist\/_astro\/[^"'`]/.test(src);
        });
        expect(offenders, "read the page's CSS with pageCss(), not by guessing a chunk filename").toEqual([]);
    });

    it("ships zero external JavaScript files", () => {
        const js = readdirSync("dist/_astro").filter((f) => f.endsWith(".js"));
        expect(js).toEqual([]);
    });

    it("copies the public assets the page links to", () => {
        for (const asset of ["favicon.ico", "preview.jpg", "resume.pdf"]) {
            expect(existsSync(`dist/${asset}`), `dist/${asset} must exist`).toBe(true);
        }
    });

    /**
     * Plan 011 migrated every emoji to presetIcons mask classes. This is the
     * gate that keeps them out: emoji pictographs must never appear in the
     * shipped page or stylesheet again. FE0F is the emoji variation selector; the
     * F000-block ranges cover pictographs, transport symbols and skin tones.
     *
     * `dist/llms.txt` IS SCANNED TOO, and the excuse this used to carry for skipping it
     * -- "the constants it quotes are gated elsewhere" -- was simply false. `PROJECTS`
     * and `METADATA.professional_summary` reach no page, so an emoji in either would have
     * been shipped by nothing else and read by nobody's test. Scanning the file is a
     * cheaper answer than the sentence explaining why it was not.
     */
    const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

    it("ships no emoji in any page, stylesheet or text endpoint", () => {
        for (const page of builtPages()) {
            expect(read(page), `${page} ships an emoji pictograph`).not.toMatch(EMOJI);
            expect(pageCss(page), `${page}'s stylesheet ships an emoji pictograph`).not.toMatch(EMOJI);
        }
        for (const file of ["dist/llms.txt", "dist/robots.txt"]) {
            expect(read(file), `${file} ships an emoji pictograph`).not.toMatch(EMOJI);
        }
    });

    it("ships no HTML comments — rationale is source-side only (plan 016)", () => {
        for (const page of builtPages()) {
            expect(read(page), `${page} ships an HTML comment`).not.toContain("<!--");
        }
    });

    it("emits a usable CSS rule for every safelisted icon class", () => {
        const css = pageCss();
        const wanted = new Set([
            ...LINKS.map(({logo}) => iconClass(logo)),
            ...GOALS.map(({goal_logo}) => iconClass(goal_logo)),
            ...CAREER.map(({icon}) => iconClass(icon)),
            iconClass(WELCOME.greeting_icon),
            iconClass(FOOTER.icon),
        ]);
        for (const cls of wanted) {
            const rule = css.match(new RegExp(`\\.${cls}\\{([^}]*)\\}`))?.[1];
            expect(rule, `${cls} has no CSS rule — the safelist in uno.config.ts stopped matching`).toBeTruthy();
            expect(rule, `${cls} must be inline-block or it renders at zero size`).toMatch(/display:\s*inline-block/);
            expect(rule, `${cls} must carry a mask image`).toContain("--un-icon:url(");
        }
    });

    /**
     * 3:1 is the bar SC 1.4.11 sets for graphical objects. Strict conformance is
     * arguable here — the icon is aria-hidden and each card also names its sport in
     * the heading — so treat 3:1 as the standard we hold, not as a citation: it is
     * still the only visual cue on the bar itself.
     *
     * The icon is a presetIcons mask painted with `background-color: currentColor`,
     * so whatever `color` reaches the span IS the icon — and with no ink of its own
     * it inherited --text, which is #FAFAFA in dark mode: 1.89:1 on the pink fill.
     *
     * Resolved from the BUILT stylesheet, never from source: a utility UnoCSS
     * fails to generate ships no rule at all, and this has to go red when that
     * happens. It reads no progress value, so the daily Strava commit to
     * src/data/strava-progress.json cannot flip it.
     */
    // `expandHex` and `contrast` are helpers/contrast.ts's. The minifier shortens
    // #111111 to #111 and unquotes [data-theme='dark'], so a token read out of the
    // sheet has to be expanded before it can be compared with anything.

    /** The built stylesheet. Read lazily: the build runs in vitest's globalSetup. */
    const sheet = () => pageCss();

    const themeTokens = (css: string, theme: string): Record<string, string> => {
        const block = css.match(new RegExp(`\\[data-theme=['"]?${theme}['"]?\\]\\{([^}]*)\\}`))?.[1];
        expect(block, `the ${theme} theme block must ship its color tokens`).toBeTruthy();
        return Object.fromEntries(
            [...block!.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)].map((m) => [m[1], expandHex(m[2])]),
        );
    };

    /**
     * The footer heart's ink, read from the shipped stylesheet in both themes.
     *
     * Three failures this catches, all silent. Deleting `--brand-ink` from a theme
     * block leaves the heart's rule emitted and the class worn, but `color:
     * var(--brand-ink)` with nothing behind it is invalid at computed-value time —
     * and `color` inherits, so the glyph quietly goes back to the body text colour
     * with the markup still perfect. Re-toning the token far enough to stop reading
     * as ink would pass any structural assertion. And pointing the glyph's wrapper at
     * a DIFFERENT token would leave `--brand-ink` perfectly defined and perfectly
     * contrasting while nothing on the page used it.
     *
     * That third one is why the ink is resolved THROUGH THE WEARER'S CLASSES rather
     * than by looking the token up by name. An earlier version read
     * `themeTokens(css)["--brand-ink"]` directly and so certified a hex that nothing
     * was guaranteed to paint — the same shape as the 1.89:1 defect the palette work
     * fixed, and the exact pattern `painted()` below exists to replace.
     *
     * Measured as text (4.5:1) rather than as a graphic (3:1): the glyph stands in
     * for the word "love", which the `sr-only` span beside it supplies, so it is
     * prose that happens to be drawn.
     */
    it("gives the footer heart ink that reads as text on its card, in both themes", () => {
        const css = sheet();
        const {document: page} = parseHTML(read("dist/index.html"));
        const glyph = page.querySelector(`span[class~="${iconClass(FOOTER.icon)}"]`);
        expect(glyph, "the footer must render the configured heart icon").toBeTruthy();

        for (const theme of ["light", "dark"]) {
            const t = themeTokens(css, theme);

            // Walk the glyph and its ancestors in cascade order and take the first
            // element that actually paints a colour — that is the ink the glyph
            // inherits, because its own rule is `color: inherit`.
            let ink: ReturnType<typeof painted> = undefined;
            for (let el: Element | null = glyph; el && !ink; el = el.parentElement) {
                ink = painted(css, el.getAttribute("class"), "color", t);
            }
            expect(ink, `${theme}: nothing in the heart's ancestry paints a colour`).toBeTruthy();
            expect(ink!.via, `${theme}: the heart paints ${ink!.via} — it must take its own token`).toBe("--brand-ink");

            const card = t["--card-background"];
            expect(card, `${theme}: --card-background must be defined`).toBeTruthy();
            const ratio = contrast(ink!.hex, card);
            expect(
                ratio,
                `${theme}: heart ink ${ink!.hex} is ${ratio.toFixed(3)}:1 on its card ${card} — it stands in for a word, so it is held to the text floor`,
            ).toBeGreaterThanOrEqual(4.5);
        }
    });

    /**
     * What a class list actually paints for `prop`, per the shipped rules —
     * both the resolved hex and the custom property it came through.
     *
     * Everything downstream resolves through the ELEMENT's classes rather than
     * through a token name, and that is the point: a token can be re-toned
     * perfectly while the element quietly paints a different one.
     */
    const painted = (css: string, classes: string | null | undefined, prop: string, tokens: Record<string, string>) => {
        for (const token of classes?.split(/\s+/) ?? []) {
            const selector = `.${token.replace(/[^\w-]/g, (c) => `\\${c}`)}{`;
            const at = css.indexOf(selector);
            if (at < 0) continue; // UnoCSS generated nothing for this token.
            const body = css.slice(at + selector.length, css.indexOf("}", at));
            const value = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+?)\\s*(?:;|$)`))?.[1];
            const named = value?.match(/^var\((--[\w-]+)\)/)?.[1];
            // A palette colour ships as rgb(r g b / var(--un-bg-opacity)).
            const rgb = value?.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
            const hex = named
                ? tokens[named]
                : rgb
                    ? `#${rgb.slice(1).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`
                    : value?.match(/^#[0-9a-fA-F]{3,6}$/)?.[0];
            // `color: inherit` on the icon rule resolves to nothing and falls through.
            if (hex) return {hex: expandHex(hex), via: named};
        }
        return undefined;
    };

    /** The raw value a class list resolves for `prop`, per the shipped rules. */
    const decl = (css: string, classes: string | null | undefined, prop: string) => {
        for (const token of classes?.split(/\s+/) ?? []) {
            const selector = `.${token.replace(/[^\w-]/g, (c) => `\\${c}`)}{`;
            const at = css.indexOf(selector);
            if (at < 0) continue;
            const body = css.slice(at + selector.length, css.indexOf("}", at));
            const value = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+?)\\s*(?:;|$)`))?.[1];
            if (value) return value;
        }
        return undefined;
    };

    /**
     * THIS USED TO ASSERT THE GLYPH'S 3:1 AGAINST THE FILL IT RODE. The bar is a 2px rule
     * now and carries no ink at all, so that pair no longer exists — but the assertion is
     * kept in this inverted form rather than deleted, because the defect it caught is one
     * step away at all times. The icon inherited --text, near-white in dark mode, and sat
     * at 1.89:1 on the fill; an ink token was introduced for it, and has been deleted with
     * the glyph, because THIS assertion is the keeper of that obligation rather than the
     * token was.
     *
     * So: the bar must stay a pure graphic. Put a glyph back and this goes red with the
     * instruction to restore the ratio check, instead of the ratio check silently passing
     * over an element it can no longer find. A conditional test that skips when the glyph
     * is absent would have looked like coverage and been none.
     */
    it("keeps the bar a pure graphic, so no ink has to read on the fill", () => {
        const bars = [...parseHTML(read("dist/index.html")).document.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);

        for (const bar of bars) {
            const fill = bar.querySelector(".progress-fill");
            expect(fill, "each progress bar must render a fill").toBeTruthy();
            expect(
                (bar.textContent ?? "").trim(),
                "the bar must carry no text — if it does, it needs the ink-on-fill ratio check this test replaced",
            ).toBe("");
            expect(
                bar.querySelectorAll("*").length,
                "the bar is the track and the fill and nothing else; a third element means ink is back on it "
                + "and SC 1.4.11 needs measuring against whatever ink it carries (it was 1.89:1 in dark mode once)",
            ).toBe(1);
        }
    });

    /**
     * This replaces an assertion that the icon cleared 3:1 against the TRACK as
     * well as the fill. That was never a live case — the note it carried said so
     * — and it is not satisfiable: the ink is chosen to read on the fill, the
     * fill flips polarity between themes, and the only way to make one ink clear
     * both regions is to drive the track toward the opposite pole from its own
     * card. Doing that in light mode makes the *unfilled* remainder the loudest
     * thing on the card, which is the defect this palette exists to fix.
     *
     * What actually kept the icon off the track is structural, so that is what
     * the next test asserts. These are the three ratios that are real: the
     * marked region must dominate, the two regions must be distinguishable from
     * each other, and the track must stay quiet against its card.
     */
    it("keeps the bar's polarity: the filled region reads as the mark", () => {
        const css = sheet();
        const doc = parseHTML(read("dist/index.html")).document;
        const bars = [...doc.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);

        for (const bar of bars) {
            const fill = bar.querySelector(".progress-fill")!;
            // The surface the bar is judged against is the card it sits on, found
            // by walking up rather than named, so a layout change cannot leave
            // this comparing the bar to a card it is no longer inside.
            let card = bar.parentElement;
            while (card && !painted(css, card.getAttribute("class"), "background-color", themeTokens(css, "light"))) {
                card = card.parentElement;
            }
            expect(card, "the bar must sit on an element that paints a surface").toBeTruthy();

            for (const theme of ["light", "dark"]) {
                const t = themeTokens(css, theme);
                const track = painted(css, bar.getAttribute("class"), "background-color", t)!;
                const mark = painted(css, fill.getAttribute("class"), "background-color", t)!;
                const surface = painted(css, card!.getAttribute("class"), "background-color", t)!;

                // The bar's colours must be the bar's OWN. It used to paint
                // --shadow, so re-toning the portrait's offset plate silently
                // re-toned the data; a ratio check cannot see that coupling,
                // because the borrowed colour can happen to measure fine.
                expect(mark.via, `${theme}: the fill paints ${mark.via} — the bar must own its fill colour`).toBe("--progress-fill");
                expect(track.via, `${theme}: the track paints ${track.via} — the bar must own its track colour`).toBe("--progress-track");

                const fillVsCard = contrast(mark.hex, surface.hex);
                const trackVsCard = contrast(track.hex, surface.hex);

                // Dominance. A ratio gate alone certifies a bar painted backwards:
                // whichever region stands further from the card is the one a reader
                // takes for the mark, so the FILL has to be that region.
                expect(
                    fillVsCard,
                    `${theme}: fill ${mark.hex} at ${fillVsCard.toFixed(2)}:1 vs card must exceed track ${track.hex} at ${trackVsCard.toFixed(2)}:1 — otherwise the empty part reads as full`,
                ).toBeGreaterThan(trackVsCard);
                // Quiet channel: the track is ground, not a second mark.
                expect(
                    trackVsCard,
                    `${theme}: track is ${trackVsCard.toFixed(2)}:1 against its card — too loud for the unmarked region`,
                ).toBeLessThanOrEqual(2);
                // And the boundary between them still has to be findable.
                const fillVsTrack = contrast(mark.hex, track.hex);
                expect(fillVsTrack, `${theme}: fill against track is ${fillVsTrack.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
            }
        }
    });

    /**
     * --accent is the control's border and its hover ink, both non-text
     * graphics, so 3:1 against the surface they sit on. It shipped at 1.89:1 in
     * light mode for as long as the palette existed: hovering a control turned
     * its icon #F3A3AA on a #FAFAFA field. Nothing caught it because neither the
     * border nor the icon is text, and no contrast checker looks at either.
     */
    it("holds the control's accent at 3:1 against the surface it sits on", () => {
        const css = sheet();
        for (const theme of ["light", "dark"]) {
            const t = themeTokens(css, theme);
            const ratio = contrast(t["--accent"], t["--background"]);
            expect(
                ratio,
                `${theme}: accent ${t["--accent"]} on ${t["--background"]} is ${ratio.toFixed(2)}:1 — the control border and its hover icon need 3:1`,
            ).toBeGreaterThanOrEqual(3);
        }
    });

    /**
     * The Now card's live dot is a non-text status graphic, so SC 1.4.11 asks
     * 3:1 of it against the card it sits on. It went unmeasured for as long as
     * it existed because it borrowed --shadow, a token whose own job (a
     * decorative offset plate) carries no such requirement — at #EC7981 it sat
     * at 2.53:1 and nobody was looking. Splitting --status-live off is what
     * makes this assertable; pinning `.via` is what stops a future re-coupling
     * from quietly reintroducing the same blind spot.
     */
    it("holds the live status dot at 3:1 against the card it sits on", () => {
        const css = sheet();
        const doc = parseHTML(read("dist/index.html")).document;
        const dot = doc.querySelector('[class*="status-live"]');
        expect(dot, "the Now card must render a live indicator").toBeTruthy();

        let card = dot!.parentElement;
        while (card && !painted(css, card.getAttribute("class"), "background-color", themeTokens(css, "light"))) {
            card = card.parentElement;
        }
        expect(card, "the dot must sit on an element that paints a surface").toBeTruthy();

        for (const theme of ["light", "dark"]) {
            const t = themeTokens(css, theme);
            const ink = painted(css, dot!.getAttribute("class"), "background-color", t)!;
            const surface = painted(css, card!.getAttribute("class"), "background-color", t)!;
            expect(ink?.via, `${theme}: the dot paints ${ink?.via} — the indicator must own its colour`).toBe("--status-live");
            const ratio = contrast(ink.hex, surface.hex);
            expect(
                ratio,
                `${theme}: live dot ${ink.hex} on ${surface.hex} is ${ratio.toFixed(2)}:1 — a status indicator needs 3:1`,
            ).toBeGreaterThanOrEqual(3);
        }
    });

    it("keeps the fill inside the bar, whatever width it resolves to", () => {
        // The fill's width comes from an inline custom property computed from bot data.
        // The track's clip is what makes that safe structurally rather than arithmetically:
        // it holds however the percentage is derived, including if the clamp in
        // ProgressBar.astro is ever removed or gets a sign wrong.
        //
        // Resolved out of the built stylesheet, not from the class token: a utility
        // UnoCSS fails to emit must go red here. An earlier version of this test asserted
        // a layout token instead, which made the guard depend on a second token it never
        // checked — and removing that one left the suite green while putting 8px of the
        // then-glyph on bare track at 1.76:1 (light) and 1.61:1 (dark).
        const css = sheet();
        const bars = [...parseHTML(read("dist/index.html")).document.querySelectorAll('[role="progressbar"]')];
        expect(bars.length, "every goal must render a progress bar").toBe(GOALS.length);
        for (const track of bars) {
            expect(track.querySelector(".progress-fill"), "each progress bar must render a fill").toBeTruthy();
            expect(
                decl(css, track.getAttribute("class"), "overflow"),
                "the track must clip, so a fill wider than its box cannot paint outside the bar",
            ).toBe("hidden");
        }
    });
});

/**
 * The controls' offset plate was invisible from the day the surface was written:
 * presetWind3 expands a geometry-only shadow to
 * `--un-shadow: <offsets> var(--un-shadow-color)` with NO fallback, nothing on
 * the page ever defines `--un-shadow-color`, and an unresolvable var makes the
 * whole `box-shadow` invalid at computed-value time — so it computed to `none`.
 * The portrait escaped because its shadow was written as one complete arbitrary
 * value, which emits `var(--un-shadow-color, <colour>)`.
 *
 * A rendered-colour test cannot see this (there is no browser here) and a class
 * test cannot either (the classes were present the whole time). So this asserts
 * the mechanism: every offset plate must ship a resolvable colour.
 */
/**
 * A hover style is a promise that something happens if you click. The eight
 * bento cards are plain containers — nothing about one responds to a pointer —
 * and they nonetheless grew an accent border on hover, which reads as "this is
 * a link" to anyone with a mouse and means nothing to anyone without one.
 *
 * Written against every hover rule in the sheet rather than against the card,
 * so the same mistake on a future element is caught too.
 */
/**
 * THE GATE WHOSE ABSENCE LET FIVE LINKS SHIP LOOKING LIKE PROSE.
 *
 * Two friends reviewing the site reported that they did not know the goal cards' "My cycling
 * events" could be clicked, and did not know a bib could be. Auditing the class rather than the
 * two instances found three more, of which the worst was never reported because nobody could
 * guess it was a link at all: the company name on each role card carried exactly `text-xs
 * font-light`, the same two classes as the date line directly above it — no colour delta, no
 * glyph, no hover. Measured on the shipped build at 1024x600, the goal-card control against its
 * neighbouring figure line: both rgb(250,250,250), both 12px, no decoration. A contrast ratio of
 * 1.00:1 between a link and a sentence.
 *
 * Every one of those passed every assertion in this suite, because nothing asked the question.
 *
 * WHAT COUNTS AS A SIGNIFIER, and the list is deliberately of KINDS rather than of elements:
 *
 *   1. `.control`          the styled 64x48 box with the offset plate — six social links
 *   1b. `.control-cta`     the same surface holding a label and a trailing mark — the two goal
 *      cards' way out. A separate class rather than a modifier of the first, because the two
 *      declare different boxes; `classList.contains` is exact, so the check below needs both
 *      names and the goal cards' links went unsignified until it had them
 *   2. `.text-link`        the shared text-link idiom — the wall's Home link, the role cards
 *   3. `.patch-filter a`   a bordered chip; the class is on the NAV, so this needs `closest`
 *   4. an icon-only control whose accessible name is carried by an `sr-only` span (the Now
 *      card's explainer, which is a 24px icon target and is legitimately not a text link)
 *   5. `.bib-stub-link`    a line on a bib's stub, whose signifier is the stub itself — the
 *      mark, the label at the bib's emphatic weight, and the perforation the list is drawn
 *      with. Required to be INSIDE a `.bib-stub`, so wearing the class is not enough
 *
 * NO PER-CATEGORY FLOOR. Asserting that some link of each kind exists would be a hand-counted
 * property of today's content: zero bibs carry any destination at all every January after the
 * rollover, and
 * a red suite BLOCKS THE DEPLOY, so that failure is a failed production deploy caused by ordinary
 * data entry. The loop is vacuous only if a page has no links, which IS checked.
 *
 * It reads the shipped stylesheet through `parseRules` and matches selectors by regex rather
 * than using this file's local `decl(css, classes, prop)` helper, which does a literal `.token{`
 * lookup and so cannot see `.patch-filter[data-astro-cid-…] a[…]{border:…}` — the exact form
 * every Astro scoped style in this repo takes.
 */
/**
 * FORCED COLOURS MUST NOT PAINT A SYSTEM COLOUR ON TOP OF ITSELF.
 *
 * The defect this exists for, measured on this branch before it was closed: the goal card's
 * control had `@media (forced-colors: active) { .events-link span { forced-color-adjust: none;
 * background-color: LinkText } }`. That was written when the anchor had one child — the
 * decorative arrow. Wrapping the label in an element for the text-zoom fix gave it a second,
 * and the label took the arrow's treatment: a LinkText background under the anchor's inherited
 * `color: LinkText`, so the words painted on their own colour. Label ink rgb(0,0,159) on
 * background rgb(0,0,159), 102.95 x 16px, a ratio of exactly 1.00:1 — the whole of the home
 * page's primary call to action reduced to a solid block, on both cards, in a mode this repo
 * deliberately supports.
 *
 * WHY NOTHING CAUGHT IT. Eleven mutations had been run against that component and all were
 * killed; every one of them deleted or altered a DECLARATION, and this defect lived in a
 * SELECTOR's reach. The nearest gate matched the rule by regex and read declarations out of
 * it without ever asking which elements it hits, so it certified the broken selector and the
 * fixed one identically. Resolving the selector against the built DOM is the whole point.
 *
 * THE INVARIANT IS NOT "SUCH A RULE MAY NOT REACH TEXT", and getting that wrong would fail
 * correct code: `.patch-filter a[aria-current="page"]` legitimately paints `background-color:
 * Highlight` on a chip that has words. It is safe because it also declares `color:
 * HighlightText` — the PAIRED system colour, which is the pairing forced-colours mode
 * guarantees a contrast for. So the rule is: opt out and paint a background, and you owe the
 * matched element a foreground that is its background's documented pair.
 */
describe("forced colours never paint a system colour on top of itself", () => {
    // CSS Color 4's system colour pairs, as the pairs a UA guarantees to contrast.
    const PAIRS: Record<string, string[]> = {
        canvas: ["canvastext", "linktext", "visitedtext", "activetext"],
        canvastext: ["canvas"],
        highlight: ["highlighttext"],
        highlighttext: ["highlight"],
        linktext: ["canvas"],
        buttonface: ["buttontext"],
        buttontext: ["buttonface"],
        field: ["fieldtext"],
        fieldtext: ["field"],
    };

    /**
     * THIS IS AN ADDITION, NOT A REPLACEMENT, AND THE DIFFERENCE WAS A REAL DEFECT.
     *
     * The per-page floor below was once relaxed BUILD-WIDE, to "some page has such rules",
     * with this comment claiming nothing was weakened. That claim was false, and a review
     * caught it by measurement: with the floor relaxed, every forced-colours rule can be
     * deleted from all three patch-wall pages and the full suite still passes 327/327. Because
     * `pageCss()` resolves per page, the per-page floor is the ONLY assertion reaching the
     * wall's forced-colours rules at all.
     *
     * What survives from that attempt is genuinely worth keeping, which is why it is still
     * here: a build-wide check that the `at` filter matches SOMETHING. The floor alone could
     * not catch a filter that stopped recognising `forced-colors` — every page would fail
     * identically and the failure would read as a site-wide styling regression rather than as
     * a broken test. And `rules.length > 0` per page is the question the floor is standing in
     * for: did `pageCss()` resolve this page's CSS at all.
     *
     * THE FLOOR COUNTS RULES THE PAGE OWNS, NOT RULES THE LAYOUT GIVES IT, and that distinction
     * IS the assertion. When the eight per-component rules for decorative marks became one block
     * in `BasicLayout.astro`, every page started shipping forced-colours rules for free — so a
     * floor counting ALL of them is satisfied everywhere by three rules no page owns, and the
     * patch wall's own rules go back to being reachable by nothing. Measured: with the shared
     * block in place, every forced-colours rule the wall owns (`.bib`'s border-width pair —
     * which `Patch.astro` argues is the ONLY channel separating an earned bib from an outline in
     * this mode — `.bib-stub-link`'s LinkText, `.bib-stub`'s perforation, the focus ring, and the
     * sport chip's Highlight pin) can be deleted and the suite stays green at 475. Against the
     * revision before the consolidation the same deletion is RED on all three wall pages.
     *
     * So the count excludes the shared mark rules by selector, and THE 404 IS EXEMPT BY NAME
     * AGAIN — but asserted rather than skipped. `toBe(0)` on the page that owns none is what
     * proves `SHARED_MARK_SELECTOR` still matches the layout's rules: mutate that regex to match
     * nothing and, without this arm, the floor silently goes back to counting the shared block
     * and the hole reopens green. A named exemption loses exactly one page; a predicate nobody
     * checks loses every page, which is the same trade this comment already calls the easy
     * mistake.
     */
    it("ships forced-colors rules somewhere, so the per-page assertion below can bite", () => {
        const pagesWithRules = builtPages()
            .filter((page) => parseRules(pageCss(page)).some((r) => (r.at ?? "").includes("forced-colors")));
        expect(pagesWithRules.length, "no page in the build ships a single forced-colors rule — either the site "
            + "stopped declaring them or the `at` filter below stopped recognising them, and every per-page "
            + "assertion has gone vacuous").toBeGreaterThan(0);
    });

    it.each(builtPages())("pairs every opted-out background with a readable foreground (%s)", (page) => {
        const doc = parseHTML(read(page)).document;
        const rules = parseRules(pageCss(page));
        expect(rules.length, `${page} resolved to no CSS at all — pageCss() found nothing, so every assertion `
            + "in this test would pass by having nothing to look at").toBeGreaterThan(0);
        const forced = rules.filter((r) => (r.at ?? "").includes("forced-colors"));
        // The per-page floor, counting only what the PAGE owns. See the note above this test.
        const pageOwned = forced.filter((r) => !r.selectors.every((s) => SHARED_MARK_SELECTOR.test(s)));
        if (page === NOT_FOUND_PAGE) {
            expect(pageOwned.length, `${NOT_FOUND_PAGE} now owns a forced-colors rule, or `
                + "SHARED_MARK_SELECTOR stopped matching the layout's shared mark rules — either way the "
                + "floor below has gone back to counting rules no page owns").toBe(0);
        } else {
            expect(pageOwned.length, `${page} ships no forced-colors rules of its OWN — the shared mark `
                + "block in BasicLayout.astro does not count, so this assertion would be vacuous")
                .toBeGreaterThan(0);
        }

        const matches = (sel: string, el: Element) => {
            try {
                return el.matches(structuralSelector(sel));
            } catch {
                return false;
            }
        };

        const offenders: string[] = [];
        for (const rule of forced) {
            if (decl(rule.body, "forced-color-adjust") !== "none") continue;
            const bg = (decl(rule.body, "background-color") ?? decl(rule.body, "background"))?.trim().toLowerCase();
            if (bg === undefined || /^(transparent|none|0)$/.test(bg)) continue;

            for (const sel of rule.selectors) {
                let hit: Element[];
                try {
                    hit = [...doc.querySelectorAll(structuralSelector(sel))];
                } catch {
                    continue;
                }
                for (const el of hit) {
                    // A mark, a bar, a glyph mask — nothing to read, nothing to lose.
                    if (!(el.textContent ?? "").trim()) continue;

                    // It has words. The last forced-colors rule reaching it must give it an ink
                    // that is this background's documented pair.
                    const ink = forced
                        .filter((r) => r.selectors.some((s) => matches(s, el)))
                        .map((r) => decl(r.body, "color"))
                        .filter((v): v is string => v !== undefined)
                        .map((v) => v.trim().toLowerCase())
                        .pop();

                    if (ink === undefined || ink === bg || !(PAIRS[bg] ?? []).includes(ink)) {
                        offenders.push(
                            `${sel} paints ${bg} behind "${(el.textContent ?? "").trim().slice(0, 26)}" `
                            + `(<${el.tagName.toLowerCase()} class="${(el.getAttribute("class") ?? "").slice(0, 30)}">) `
                            + `whose forced-colors ink is ${ink ?? "inherited"}`,
                        );
                    }
                }
            }
        }

        expect(
            [...new Set(offenders)],
            "an element that opts out of forced colours and paints a background must declare the PAIRED "
            + "system foreground. Measured on this branch before the fix: the goal control's label rendered "
            + "LinkText on LinkText across 102.95x16px — contrast exactly 1.00:1, the words gone",
        ).toEqual([]);
    });
});

describe("every link on every page says that it is one", () => {
    it.each(builtPages())("gives each link a signifier a reader can perceive (%s)", (page) => {
        const doc = parseHTML(read(page)).document;
        const links = [...doc.querySelectorAll("a")];
        expect(links.length, `${page} has no links — this assertion would be vacuous`).toBeGreaterThan(0);

        // The bordered-chip case is only a signifier while the border is really shipped, so the
        // rule is read rather than assumed. Same reasoning as the decoration check on the goal
        // card's control: a class proves intent and a rule proves the drawing.
        //
        // AND THE RULE MUST BE UNCONDITIONAL, which the first version of this probe did not
        // require. It accepted ANY `.patch-filter` rule carrying a border — including
        // `.patch-filter a:hover`, which is a signifier only for a reader who has a pointer.
        // A hover-only affordance is the precise defect this whole gate exists to catch, so a
        // gate that accepts one is worse than no gate: deleting the chips' permanent border left
        // the suite green at 264/264. It also matched `.patch-filter-count`, a sibling class that
        // draws nothing, because `\b` treats the hyphen as a boundary — hence the descendant-`a`
        // requirement rather than a bare class match.
        //
        // THE STATE TEST IS STRUCTURAL NOW, AND IT HAD TO BECOME SO. It was a list of pseudo-
        // classes, which was complete for the states that existed when it was written and
        // silently incomplete the moment a held-press state spelled `[data-leaving]` arrived:
        // an attribute is not a pseudo-class, so the held rule read as unconditional and
        // satisfied this check on its own. Measured — with the chips' permanent border deleted
        // the wall shipped borderless prose on all three pages and the suite stayed green at
        // 290/290, which is exactly the "worse than no gate" case the paragraph above names.
        // `isStateful` asks the inverted question (is everything here structure?), so the next
        // state cannot walk through it either. See tests/helpers/css.ts.
        const chipIsDrawn = parseRules(pageCss(page)).some(
            (r) => r.selectors.some((sel) => /\.patch-filter\b[^,]*\ba\b/.test(sel) && !isStateful(sel))
                && (decl(r.body, "border") ?? decl(r.body, "border-color")) !== undefined,
        );

        const unsignified = links.filter((a) => {
            if (a.classList.contains("control")) return false;
            if (a.classList.contains("control-cta")) return false;
            if (a.classList.contains("text-link")) return false;
            if (chipIsDrawn && a.closest(".patch-filter")) return false;
            // An icon-only control: no visible words at all, and its name comes from an sr-only
            // span. If it ever grows visible text it stops qualifying here and must wear an
            // idiom like everything else.
            //
            // "VISIBLE" MEANS WHAT A READER CAN SEE, NOT WHAT IS A DIRECT TEXT NODE, and the
            // difference is not academic — it was measured. This read `a.childNodes` filtered to
            // `nodeType === 3`, so a link whose words sit inside SPANS scored as having none and
            // took this branch as though it were a bare glyph. The patch wall's stub lines are
            // exactly that shape (`<span class="bib-stub-label">17.90 km</span>`): they carry
            // visible words and were being exempted here as icon-only, so the affordance this
            // gate exists to check was never checked for them. Excluding `.sr-only` subtrees and
            // reading the rest of `textContent` is what the branch always meant. The genuinely
            // icon-only controls are unaffected — they have no visible text under either reading,
            // and they are caught by `.control` a few lines above in any case.
            const srOnly = a.querySelector(".sr-only");
            const seen = a.cloneNode(true) as Element;
            for (const hidden of [...seen.querySelectorAll(".sr-only")]) hidden.remove();
            const visibleText = (seen.textContent ?? "").trim();
            if (srOnly && !visibleText) return false;
            // A BIB'S LINKS ARE THE LINES ON ITS STUB, AND THE STUB IS THE SIGNIFIER. This used
            // to be TWO exemptions — one for the whole bib as an anchor wrapping a visible action
            // row, one for a split race's lines — because a bib was sometimes the control and
            // sometimes held them. It is never the control now: a race can have a results sheet
            // AND a recording, anchors do not nest, so every destination is a line. One exemption
            // is what is left, and it is the narrower of the two.
            //
            // WHAT MAKES IT A SIGNIFIER IS NOT THE CLASS. The line is drawn in the bib's own
            // idiom rather than as prose — a mark, an imperative label at the bib's emphatic
            // weight, and the perforated stub it sits on, which is the material vocabulary for
            // "this part comes away". A ruled link was built first and rejected: a bib is a
            // printed artifact and a rule is a web convention imported into a paper one.
            //
            // KEYED ON THE LINE BEING INSIDE A STUB, so a `.bib-stub-link` that ever escaped one
            // would still be caught — the perforation is on the list, so a line outside it has no
            // signifier at all.
            if (a.classList.contains("bib-stub-link") && a.closest(".bib-stub")) return false;
            return true;
        });

        expect(
            unsignified.map((a) => `${a.getAttribute("href")} "${(a.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 46)}"`),
            `${page} ships links drawn like static text. A link needs one of: .control, .control-cta, .text-link, `
            + "a drawn .patch-filter chip, an sr-only-named icon control, or a .bib-stub-link on a "
            + "bib's .bib-stub. This is the gate whose absence let five links ship unreadable as links",
        ).toEqual([]);
    });
});

describe("hover styles promise only interactions that exist", () => {
    const INTERACTIVE = new Set(["a", "button", "input", "select", "textarea", "summary", "label"]);

    /**
     * Run against EVERY page. The patch wall is the first thing on this site to put a
     * hover style on something other than `.control` — the filter row's links and the
     * back link both take one — and a home-page-only check would never look at either.
     */
    it.each(builtPages())("applies no hover rule to an element that cannot be interacted with (%s)", (page) => {
        const css = pageCss(page);

        // Match on SELECTORS, not class tokens. An earlier version only
        // recognised `.token:hover`, so an Astro scoped <style> — the idiomatic
        // form in this repo, ProgressBar already ships one — could put the accent
        // border back on all eight cards as `div[data-astro-cid-…]:hover` with
        // the suite green. Verified: that mutation now goes red.
        //
        // A chunk between two `}` is `<at-rule preamble>{<selector list>{<decls>`,
        // so the selector list is always the penultimate `{`-separated part.
        const hovered = css
            .split("}")
            .flatMap((chunk) => {
                const parts = chunk.split("{");
                return parts.length < 2 ? [] : parts[parts.length - 2].split(",");
            })
            .map((s) => s.trim())
            // Only real state pseudo-classes. `\:hover` inside an escaped UnoCSS
            // token (`.md\:hover\:border-…`) is part of the class NAME, and
            // stripping it blindly yields a selector linkedom cannot parse —
            // which would fail the build on a legitimate hover utility.
            .filter((s) => /(?<!\\):hover(?![\w-])/.test(s))
            .map((s) => s.replace(/(?<!\\)::?[\w-]+(?:\([^)]*\))?/g, ""));
        expect(hovered.length, "the sheet must ship at least one hover rule — the controls have one").toBeGreaterThan(0);

        const doc = parseHTML(read(page)).document;
        const offenders: string[] = [];
        const matched = new Set<Element>();
        // Deliberately not wrapped in try/catch: a selector this cannot parse
        // must go red and be handled, because swallowing the throw is exactly
        // how this guard would become unable to fail.
        for (const selector of hovered) {
            for (const el of doc.querySelectorAll(selector)) matched.add(el as Element);
        }
        for (const el of matched) {
            const worn = el.getAttribute("class") || `<${el.tagName.toLowerCase()}>`;
            let node: Element | null = el;
            let interactive = false;
            while (node && !interactive) {
                interactive = INTERACTIVE.has(node.tagName.toLowerCase()) || node.hasAttribute("tabindex");
                node = node.parentElement;
            }
            if (!interactive) offenders.push(`<${el.tagName.toLowerCase()}> wears ${worn}`);
        }
        expect(offenders, "a hover style here advertises an affordance that does not exist").toEqual([]);
    });
});

/**
 * A HOVER STYLE MUST NEED A POINTER TO PRODUCE IT.
 *
 * THE DEFECT, reported from a physical iPhone 15 Pro Max against a deploy preview: one goal
 * card's way out sat in accent red while its sibling did not. A touch browser has no pointer
 * to move away, so it applies `:hover` on tap and holds it until the reader taps something
 * else — which draws a persistent selected-looking state on a control that has no such state.
 * On the patch wall it is worse than cosmetic: the sport chips DO have a real current state
 * (`[aria-current="page"]`), and a stuck hover fakes exactly the distinction that row exists
 * to draw.
 *
 * IT WAS SITE-WIDE AND PRE-EXISTING — nine plated controls, three text links, and the wall's
 * chips and bibs — twelve hovered elements on the home page and six more on the wall, counted
 * against the built DOM — with no `(hover: hover)` query anywhere in
 * the repository. So the fix is site-wide too: a variant in `uno.config.ts` emits every
 * `hover:` utility inside the query, and the two hand-written rules carry it in their own
 * preludes.
 *
 * WHY THE GATE IS A UNIVERSAL WITH NO CARVE-OUTS. The two mode overrides on the wall
 * (`@media print`, `@media (forced-colors: active)`) could not misfire on a phone even
 * unguarded — one paints only on paper, the other only recolours an outline that the guard
 * already prevents. Both were still split and guarded, because "this particular hover rule is
 * inert" is an argument that has to be re-made by hand for every future exemption, and the
 * exemption list is where a gate like this rots. A universal is checkable; a universal with
 * two footnotes is a habit.
 *
 * WHAT THIS CANNOT SEE, stated so it is not trusted further than it goes: it reads the sheet,
 * not the screen. It cannot tell whether the guarded rule still paints for a reader who DOES
 * have a pointer — that is a browser measurement, and it is in the PR (mouse held over each
 * control, computed colour read in both device states, with the `(hover: hover)` value read
 * back per state so the emulation lever is proven to have applied).
 */
describe("a hover style needs a pointer to produce it", () => {
    // Matches `:hover` as a real state pseudo-class only. Inside an escaped UnoCSS token
    // (`.hover\:text-...`) the same characters are part of the class NAME — the sibling gate
    // above records the same trap, and getting it wrong here would fail the build on the very
    // utility this rule exists to guard.
    const HOVER = /(?<!\\):hover(?![\w-])/;

    /**
     * IS THIS AT-RULE CONTEXT A POSITIVE HOVER GATE? — and the reason this is a function
     * rather than one regex is that the regex it replaces certified the exact inverse of
     * the invariant.
     *
     * It was `GUARDED = /\(\s*hover\s*:\s*hover\s*\)/`, tested as a SUBSTRING against the
     * joined prelude. That asks whether the text `(hover: hover)` appears, not whether the
     * query is true only where a pointer exists — and three real preludes contain the text
     * while being false, or partly false, on a phone:
     *
     *   @media not (hover: hover)              true ONLY on touch. The defect, inverted.
     *   @media (hover: hover), (hover: none)   a query list is a DISJUNCTION, so it matches touch.
     *   @media (hover: hover) or (hover: none) same, in Media Queries 4 spelling.
     *
     * Built and measured: the first ships a hover style that fires only on a phone, with all
     * 290 tests green. Two review dimensions found this independently.
     *
     * It was also too NARROW in one direction, which is the red-on-correct-code half:
     * `@media (hover)` is the Media Queries 4 boolean form and means exactly `(hover: hover)`
     * (true when the value is not `none`), and it was rejected.
     *
     * THE SHAPE THAT IS ACTUALLY CORRECT, and each clause is here because dropping it breaks
     * a measured case:
     *
     *  - Test each enclosing at-rule SEPARATELY, not the joined string. The PR's own preset
     *    emits the guard as a PARENT at-rule, so an ordinary responsive utility like
     *    `md:hover:font-bold` lands inside TWO nested at-rules — `@media (hover:hover)` around
     *    `@media (min-width:48rem)`. Requiring every at-rule to gate hover reds that correct
     *    code; requiring SOME at-rule to gate it does not.
     *  - Within one prelude, every comma branch must gate hover, because a query list is a
     *    disjunction and one unguarded branch admits touch.
     *  - Reject any prelude carrying `not`. A negation is the cheapest way to invert a
     *    substring test, and nothing in this codebase needs a negated media query.
     *  - Accept `(hover)` and `(hover: hover)`; reject `(hover: none)` and `(any-hover: …)`.
     *    `any-hover` is true if ANY input can hover, which is not the same guarantee.
     */
    const gatesHover = (at: string): boolean => {
        if (!at) return false;
        // `at` is the enclosing preludes joined; split it back into individual at-rules.
        const preludes = at.split("@").map((p) => p.trim()).filter(Boolean);
        return preludes.some((prelude) => {
            if (/\bnot\b/i.test(prelude)) return false;
            if (/\bor\b/i.test(prelude)) return false;
            const branches = prelude.split(",").map((b) => b.trim()).filter(Boolean);
            return branches.length > 0
                && branches.every((b) => /\(\s*hover\s*(?::\s*hover\s*)?\)/.test(b));
        });
    };

    const hoverRules = (page: string) =>
        parseRules(pageCss(page)).filter((r) => r.selectors.some((s) => HOVER.test(s)));

    it("finds hover rules at all, so the assertion below is not vacuous", () => {
        // Counted across every page rather than per page. A per-page floor is a hand-counted
        // one, and it goes red on correct code the day a page legitimately has no hovered
        // element — the same shape as the `toBeGreaterThan(0)` floors this suite has been
        // bitten by before. What must never be zero is the whole site's supply of hover rules,
        // because that is the only thing that makes the guard below mean anything.
        const total = builtPages().reduce((n, page) => n + hoverRules(page).length, 0);
        expect(total, "no page ships a single :hover rule — every assertion below is vacuous").toBeGreaterThan(0);
    });

    it.each(builtPages())("ships no :hover rule outside a (hover: hover) query (%s)", (page) => {
        const unguarded = hoverRules(page)
            .filter((r) => !gatesHover(r.at))
            .map((r) => `${r.at ? `${r.at} ` : "(top level) "}{ ${r.selectors.join(", ")} }`);
        expect(
            [...new Set(unguarded)],
            "a touch browser applies :hover on tap and holds it until the reader taps elsewhere, so an "
            + "unguarded hover rule ships a state that reads as selected on whatever was last pressed. "
            + "Wrap the rule in @media (hover: hover). If this is a UnoCSS utility, there are two causes "
            + "and they need different fixes: a plain `hover:` token that is NOT guarded means the "
            + "hover-needs-a-pointer preset in uno.config.ts has stopped sitting ABOVE presetWind3 "
            + "(variants resolve in preset order, and below it that preset emits nothing at all); "
            + "whereas `group-hover:`, `peer-hover:` and any other token where `hover` is not the "
            + "LEADING variant bypass that preset by design — the preset matches a leading `hover:` "
            + "only, so those must be written as hand-guarded CSS instead. No token of the second kind "
            + "exists in this repository today, and this gate is what keeps it that way",
        ).toEqual([]);
    });
});

describe("the offset plate actually paints", () => {
    // One entry per plated SELECTOR, not per plated element: `.control` is worn by
    // every control (it was two classes until they were unified, and the toggle's
    // narrower variant was the reason they were not one size).
    const PLATED = [".control", ".md\\:shadow-\\[10px_10px_0_var\\(--shadow\\)\\]"];

    /** The `--un-shadow` value the built sheet gives `selector`. */
    const plate = (css: string, selector: string) => {
        const at = css.indexOf(`${selector}{`);
        expect(at, `${selector} must ship a rule`).toBeGreaterThanOrEqual(0);
        const body = css.slice(at + selector.length + 1, css.indexOf("}", at));
        const shadow = body.match(/--un-shadow:\s*([^;]+)/)?.[1];
        expect(shadow, `${selector} must declare an offset plate`).toBeTruthy();
        return shadow!;
    };

    const sheet = () => pageCss();

    /**
     * Check the VALUE, not the shape. There are four ways to write this shortcut
     * so that nothing is painted, and each earlier draft of this test caught
     * only some of them:
     *
     *   2px 2px 0 var(--un-shadow-color)   geometry utility, no fallback — the
     *                                      ORIGINAL bug; unresolvable var makes
     *                                      the whole declaration invalid
     *   var(--shadow)                      colour utility, no geometry — also
     *                                      not a valid box-shadow
     *   2px 2px -1px var(…)                negative blur; invalid, drops to none
     *   0 0 0 var(…)                       valid CSS that paints entirely behind
     *                                      the border box, i.e. invisible
     *
     * The last two pass any regex that only asks "offsets, then a colour with a
     * fallback", which is what a review panel caught here. Parsing the numbers
     * is barely more code and is the difference between a gate and a comment.
     *
     * Zero offsets are only fatal together with zero spread — a spread-only
     * plate is legitimate — so the condition is x === 0 && y === 0 && spread === 0,
     * not "the offsets are non-zero".
     *
     * This stays a stylesheet parse rather than a browser assertion on purpose:
     * `pnpm test` is the deploy gate, and putting playwright and a chromium
     * download inside a zero-client-JS static site's production build is a worse
     * trade than coupling to presetWind3's emit format.
     */
    const LEN = String.raw`(-?[\d.]+)(?:px|r?em)?`;
    const COMPLETE_PLATE = new RegExp(
        `^${LEN}\\s+${LEN}(?:\\s+${LEN})?(?:\\s+${LEN})?\\s+var\\(--un-shadow-color,\\s*(.+)\\)$`,
    );

    /** Why this plate paints nothing, or "" if it does. */
    const dead = (shadow: string) => {
        const m = shadow.match(COMPLETE_PLATE);
        if (!m) return "that is not offsets plus a colour with a fallback, so it computes to box-shadow: none";
        const [x, y, blur, spread] = [m[1], m[2], m[3], m[4]].map((v) => (v === undefined ? 0 : Number(v)));
        if (blur < 0 || spread < 0) return "blur and spread may not be negative — the declaration is invalid and drops to none";
        if (x === 0 && y === 0 && spread === 0) return "a zero-offset, zero-spread plate hides entirely behind the border box";
        return "";
    };

    it("gives every plated rule a complete, resolvable, visible shadow value", () => {
        const css = sheet();
        for (const selector of PLATED) {
            const shadow = plate(css, selector);
            expect(dead(shadow), `${selector} ships "--un-shadow: ${shadow}" — ${dead(shadow)}`).toBe("");
        }
    });

    it("paints the plate from the theme token, so it re-tones with the theme", () => {
        const css = sheet();
        for (const selector of PLATED) {
            expect(plate(css, selector), `${selector} must cast the plate in --shadow, not a hard-coded colour`)
                .toContain("var(--shadow)");
        }
        for (const theme of ["light", "dark"]) {
            const block = css.match(new RegExp(`\\[data-theme=['"]?${theme}['"]?\\]\\{([^}]*)\\}`))?.[1];
            expect(block, `${theme} must define --shadow for the plate to resolve`).toMatch(/--shadow:\s*#[0-9a-fA-F]{3,6}/);
        }
    });
});

/**
 * The converse of the existing "no class without a rule" gate: no RULE without a
 * wearer. UnoCSS extracts from every word of a source file, including prose in
 * `.astro` frontmatter comments, so an ordinary English word that happens to be
 * a utility name ships a real CSS rule for a class no element has. It has cost
 * this repo twice: a dead `perspective` rule that survived a cleanup because it
 * was named in a comment, and — while writing the change this test ships with —
 * a `flex-grow` rule emitted by the word "grow" in a paragraph explaining why a
 * hover style was removed. Both were invisible to every other gate.
 *
 * Comparing against the class tokens actually worn in dist/index.html is the
 * only check that sees it, because the defect is a rule with no corresponding
 * markup rather than markup with no corresponding rule.
 */
describe("the stylesheet ships no rule nobody wears", () => {
    /**
     * A ratchet, not a clean sweep. The entries below predate this gate; each
     * comes from ordinary text UnoCSS happens to read as a class name. Deliberately
     * not counted in this sentence — the list shrinks whenever prose changes (`my`
     * came off it in this very change), and a number here would be stale the moment
     * it did:
     *
     *   transition    `transition: …` declarations in <style> blocks
     *   ease          same, though this one is NOT a dead rule — it is a
     *                 redundant selector riding the live `.ease,.ease-in-out{…}`,
     *                 so it costs nothing but still has no wearer of its own
     *   inline        `is:inline` on the theme script, plus prose about it
     *   inline-block  `display: inline-block` in ThemeSwitcher's <style>
     *   me            the `me.webp` import path and the "About me" heading
     *   my            template prose — "Follow my running on Strava", "My Running goal"
     *
     * Recorded rather than fixed: the fixes are unrelated to this change, and
     * blocklisting a real utility means a future author writing it as a class
     * silently gets nothing, which is how `static` already behaves here.
     *
     * KNOWN COST, stated so nobody is surprised by it: `pnpm test` is the deploy
     * gate, and UnoCSS reads English. Editing prose in an .astro file can
     * turn the deploy red — appending ", visible to all" to an sr-only string
     * emits `.visible`. That is a real trade, accepted because the gate has
     * already caught three dead rules this change would otherwise have shipped
     * (`grow`, `container`, and a reversed-row utility, all from comments written
     * while fixing the previous one). The failure names the token; the fix is a
     * one-word reword, or a `blocklist` entry in uno.config.ts when the word
     * cannot be avoided. Note constants.ts prose is NOT scanned, so Calvin's own
     * copy cannot trip this — only text inside .astro files.
     */
    // `my` came off this list when the goal CTA's sr-only name stopped being
    // built from a sentence ("Follow my running on Strava") and became the shared
    // label in constants.ts — that removed the last lowercase "my" from any .astro
    // file, so the rule stopped being emitted and the guard below demanded the
    // entry go. `me` survives it: "About me" is still a card title. Exactly the
    // rot this pair of assertions exists to prevent.
    // Four came off the patch wall, and each is a REAL DECLARATION rather than a word
    // in a sentence — the shape that cannot be reworded, which is why they are
    // recorded here rather than fixed at source:
    //
    //   container     `container-type: inline-size` on the bib, which is what makes
    //                 its distance size against the bib instead of the viewport
    //   transform     `transform: rotate(180deg)`, the vertical "KM" down the edge
    //   uppercase     `text-transform: uppercase`, on three of the bib's own elements —
    //                 its meta row, its unit and its name
    //   outline       the one word in this group that is prose. It names the treatment
    //                 Calvin chose for an un-earned bib and appears in the reasoning
    //                 for every part of it; rewording it would cut the code loose from
    //                 the decision it implements.
    //
    // Blocklisting these instead was rejected. `static` is blocklisted because nothing
    // would ever legitimately want it; `uppercase`, `transform` and `outline` are
    // utilities a future author could reasonably write, and a blocklist entry makes
    // that silently do nothing. A known orphan costs a few dead bytes and keeps the
    // utility working.
    const KNOWN_ORPHANS = ["container", "ease", "inline", "inline-block", "me", "outline", "transform", "transition", "uppercase"];

    /**
     * SCOPED TO THE WHOLE BUILD, not to one page, and the widening is the correct
     * reading of the question rather than a way to keep a gate quiet.
     *
     * Astro emits one shared CSS chunk for every page here. So "this rule has no
     * wearer" is a fact about the OUTPUT: a class worn only on `/patches` is present
     * in the home page's stylesheet and absent from its markup, and an index-only
     * check calls it dead. It called four live classes dead on the first build of the
     * patch wall. See `builtPages()` for the distinction from `pageCss()`, which is
     * per-page on purpose and must stay that way.
     */
    /**
     * A SECOND, DIFFERENT KIND OF EXCUSE, kept apart from KNOWN_ORPHANS on purpose.
     *
     * These are STATE classes: an element wears one when the site is in a state it can
     * legitimately be out of. `bib--booked` and `bib-tag` mark a race that has not been
     * run yet, and on 7 December 2026 — the morning after the last race on the calendar
     * — nothing on the site is in that state, so both rules ship with no wearer and this
     * gate goes red on a correct page.
     *
     * That is not hypothetical and it is not merely a red test: a red suite blocks the
     * deploy, and the Strava bot pushes unattended, so it is a failed production deploy
     * triggered by a bot on a day nobody is watching. Found by simulating eight future
     * bot pushes rather than by reasoning about it.
     *
     * WHY NOT KNOWN_ORPHANS: that list means "a rule that should not exist and we have
     * not got round to removing", and its anti-rot test demands the rule still ship. A
     * state class is the opposite — the rule *must* exist, and its absence from the
     * markup is information about today rather than a defect. Collapsing the two would
     * make the ratchet mean two things.
     *
     * WHY NOT WEAKEN THE GATE: it exists to catch a rule emitted by an ordinary English
     * word, and it still does. What is excused here is narrow and named, and the class
     * is not left uncovered — `tests/patch-wall.test.ts` renders `Patch` directly in
     * every state, so an actually-dead state class fails there, on a page and not on a
     * date.
     */
    /**
     * Rather than a hand-kept list. A list works, and I shipped one first — but it
     * defers the defect instead of closing it: the next component with a state class
     * reddens this gate on some future date, unattended, and the author discovers the
     * rule by reading a failed deploy. A review panel proposed this discriminator and
     * it is strictly better, so it replaced mine.
     *
     * Two conditions, and both are needed:
     *   - the selector is SCOPED (`[data-astro-cid-…]`), so it came from a component's
     *     own `<style>` block. UnoCSS output is never scoped, so the gate's real job —
     *     an ordinary English word in .astro text emitting a utility rule — is untouched.
     *   - the token appears as an authored quoted literal in some `.astro` file with its
     *     `<style>` block stripped, i.e. somebody deliberately wrote it into markup.
     *
     * A class that exists only inside a `<style>` block and is worn by nothing is still
     * caught, which is the case that matters: that is a typo or a leftover.
     */
    const authoredClasses = (): Set<string> => {
        const out = new Set<string>();
        const files = readdirSync("src", {recursive: true, encoding: "utf8"})
            .filter((f) => f.endsWith(".astro"));
        for (const f of files) {
            const src = read(`src/${f}`).replace(/<style[\s\S]*?<\/style>/g, "");
            for (const m of src.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
                for (const token of m[1].split(/\s+/)) if (/^[\w-]+$/.test(token)) out.add(token);
            }
        }
        return out;
    };

    it("emits a class rule only for classes some page actually uses", () => {
        const css = builtPages().map((p) => pageCss(p)).join("\n");
        const worn = new Set(builtPages().flatMap((p) => [...classTokens(p)]));
        const authored = authoredClasses();

        // Every selector the sheet defines, split on the commas that SEPARATE them,
        // with the leading class token extracted. Non-class selectors (`body`,
        // `:root[…]`, `main > *`, keyframe stops) are not this test's business.
        //
        // The split has to honour escapes: `grid-rows-[repeat(8,min-content)]` carries
        // a comma of its own, and splitting on it invented two orphan classes that no
        // rule defines and no element could ever wear. See splitSelectorList.
        const orphans = new Set<string>();
        for (const m of css.matchAll(/(^|[{}])([^{}@]+)\{/g)) {
            for (const selector of splitSelectorList(m[2])) {
                const cls = selector.trim().match(/^\.((?:\\.|[\w-])+)/)?.[1];
                if (!cls) continue;
                const token = cls.replace(/\\(.)/g, "$1");
                if (worn.has(token) || KNOWN_ORPHANS.includes(token)) continue;
                // A component's own state class, on a day nothing is in that state.
                if (selector.includes("[data-astro-cid-") && authored.has(token)) continue;
                orphans.add(token);
            }
        }
        expect(
            [...orphans].sort(),
            "these classes have a CSS rule but no element — almost always a utility name written as an ordinary English word in .astro text. Reword it, or add it to `blocklist` in uno.config.ts if the word cannot be avoided",
        ).toEqual([]);
    });

    it("still needs every entry on the known-orphan list, so the list cannot rot", () => {
        // Without this, a token fixed at source stays on the list forever and
        // quietly re-opens the hole it was excusing.
        const css = builtPages().map((p) => pageCss(p)).join("\n");
        for (const token of KNOWN_ORPHANS) {
            const selector = `.${token.replace(/[^\w-]/g, (c) => `\\${c}`)}`;
            expect(
                css.includes(`${selector}{`) || css.includes(`${selector},`),
                `${token} no longer ships a rule — remove it from KNOWN_ORPHANS`,
            ).toBe(true);
        }
    });
});

/**
 * These assertions only became possible once `output: "static"` replaced the
 * SSR adapter (plan 002). Before that, `pnpm build` emitted no `dist/index.html`
 * at all — the page lived inside a 2.4 MB serverless function.
 *
 * NOTE: `dist/index.html` starts with a hoisted <script> above <html>, which
 * makes linkedom treat that script as documentElement and leaves document.body
 * empty. Element queries work; whole-document textContent does not. Assert text
 * with plain string `toContain` and elements with `querySelector`.
 */
describe("dist/index.html is prerendered", () => {
    const doc = () => parseHTML(read("dist/index.html")).document;

    it("is emitted by the build", () => {
        expect(existsSync("dist/index.html")).toBe(true);
    });

    it("carries the configured title and description", () => {
        const html = read("dist/index.html");
        expect(html).toContain(`<title>${METADATA.title}</title>`);
        expect(html).toContain(METADATA.description);
    });

    /*
     * The assertion above compares the artifact to METADATA.title, which is a comparison of
     * the pipeline against itself: it holds whatever the title says. This one holds the
     * SHIPPED bytes against the two facts the title is derived from, which is the property
     * the deploy actually needs — the tab and the JSON-LD in this same file must answer
     * "what is his job" and "which Calvin" identically.
     *
     * It is deliberately duplicated from tests/rendered-html.test.ts rather than trusted
     * from there: that file renders in-process through the Container API and never opens
     * dist/. A reviewer proved the difference by rewriting this file's <title> by hand — the
     * render test stayed green on an artifact serving the pre-promotion title.
     */
    it("agrees with CAREER and the full name in the bytes that ship", () => {
        const title = parseHTML(read("dist/index.html")).document.querySelector("title")?.textContent;
        expect(title, "dist/index.html must carry a <title>").toBeTruthy();
        expect(title).toContain(CAREER[0].job_name);
        expect(title).toContain(METADATA.full_name);
    });

    it("self-canonicalises to the configured site URL, not a request URL", () => {
        const href = doc().querySelector('link[rel="canonical"]')?.getAttribute("href");
        expect(href).toBe(METADATA.site_url);
    });

    it("declares a default theme so no-JS visitors keep the designed colors", () => {
        // Every color token is defined under :root[data-theme=…]; without this
        // attribute a visitor whose JS never runs gets unstyled, transparent cards.
        expect(doc().querySelector("html")?.getAttribute("data-theme")).toBe("light");
    });

    /**
     * The toggle's pressed state is the one thing on this page that a script has to
     * keep true, and the server cannot do it: the pre-paint script in BasicLayout
     * runs before the button exists, so a visitor who prefers dark is served
     * `aria-pressed="false"` and the toggle's own deferred script is what corrects
     * it. Delete that line and the attribute becomes a lie for exactly the visitors
     * who did not accept the default — with the markup, the suite and the rendered
     * page all still looking right.
     *
     * Asserted against the shipped bundle rather than the source, because that is
     * where the line has to survive minification — and by EXECUTING it, not by
     * grepping it. An earlier version of this test only looked for the strings
     * `aria-pressed` and `dataset.theme` in the bundle, and a review panel defeated it
     * three ways with the suite green: deleting the once-on-load call, hard-coding
     * `"false"` while the click handler still read the theme, and replacing the whole
     * script with one that writes a constant. All three ship a bundle containing both
     * strings, and Chrome confirmed all three leave a dark-preferring visitor with
     * `pressed: false` under an active dark theme — the exact inversion the paragraph
     * above says this test protects against. No substring can express "reports the
     * theme it is actually in".
     *
     * Both visitor directions are asserted, because a dark visitor alone would be
     * satisfied by a script hard-coding `"true"` — the mirror of the bug being fixed.
     */
    it("ships a script that reports the toggle's state from the live theme", () => {
        const html = read("dist/index.html");
        const modules = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
        expect(modules.length, "the toggle's behaviour ships as an inline module script").toBeGreaterThan(0);
        const syncing = modules.filter((s) => s.includes("aria-pressed"));
        // Kept as the first assertion purely for its diagnosis: if nothing writes the
        // attribute at all, this says so plainly rather than failing an execution below.
        expect(
            syncing.length,
            "no shipped script writes aria-pressed — the state cannot follow the theme",
        ).toBeGreaterThan(0);

        /**
         * Runs the shipped module against a stub document standing in for one visitor,
         * and reports what the button ends up saying. `new Function` cannot evaluate a
         * bundle containing real `import`/`export` statements, so if Astro ever stops
         * inlining this script as bare statements the test fails loudly rather than
         * passing silently — which is the direction to fail in.
         */
        const visit = (theme: string) => {
            const {document: stub} = parseHTML(
                `<html data-theme="${theme}"><body>
                    <button id="theme-toggle" type="button" aria-pressed="false"></button>
                </body></html>`,
            );
            const store = new Map<string, string>();
            const storage = {
                getItem: (k: string) => store.get(k) ?? null,
                setItem: (k: string, v: string) => void store.set(k, v),
            };
            for (const src of syncing) new Function("document", "localStorage", src)(stub, storage);
            const button = stub.querySelector("#theme-toggle")!;
            const state = () => ({
                theme: stub.querySelector("html")?.getAttribute("data-theme"),
                pressed: button.getAttribute("aria-pressed"),
            });
            const before = state();
            button.dispatchEvent(new stub.defaultView!.Event("click"));
            return {before, after: state()};
        };

        const dark = visit("dark");
        expect(dark.before.pressed, "a dark visitor's toggle must report pressed before any click").toBe("true");
        expect(dark.after, "a click must move the theme and the reported state together").toEqual({theme: "light", pressed: "false"});

        const light = visit("light");
        expect(light.before.pressed, "a light visitor's toggle must report not-pressed").toBe("false");
        expect(light.after, "a click must move the theme and the reported state together").toEqual({theme: "dark", pressed: "true"});
    });

    it("emits the social-preview tags unfurls depend on", () => {
        const meta = (sel: string) => doc().querySelector(sel)?.getAttribute("content");
        expect(meta('meta[property="og:title"]')).toBe(METADATA.title);
        expect(meta('meta[property="og:description"]')).toBe(METADATA.description);
        expect(meta('meta[property="og:image"]')).toBe(METADATA.image_url);
        expect(meta('meta[name="twitter:image"]')).toBe(meta('meta[property="og:image"]'));
        expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image");
        // og:url NAMES THE PAGE, and must agree with the canonical. It was origin-only
        // from plan 002 — correct while the site had one page, and a defect once it had
        // four: the three /patches routes each advertised the home page to a social
        // card while their own rel=canonical said otherwise. Asserted against the
        // canonical rather than against a literal, so the two cannot drift apart again.
        //
        // THE 404 IS EXEMPT AND MUST CARRY NEITHER. `Astro.url.href` resolves to `…/404/`
        // there and the build emits `dist/404.html` — no `404/index.html` — so a canonical
        // would point at a URL that does not exist, and `og:url` is the same claim made to a
        // social card. Both are dropped by the layout's `noindex` prop, and both are asserted
        // ABSENT beside the sitemap gate rather than merely skipped here.
        for (const page of builtPages().filter((p) => p !== NOT_FOUND_PAGE)) {
            const doc = parseHTML(read(page)).document;
            const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
            const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute("content");
            expect(canonical, `${page} must self-canonicalise`).toBeTruthy();
            expect(ogUrl, `${page}: og:url ${ogUrl} disagrees with canonical ${canonical}`).toBe(canonical);
        }
    });

    it("serves the portrait as a build-emitted asset, not a runtime image CDN URL", () => {
        // The anchored `/_astro/` prefix IS the whole assertion, and it holds against every
        // host: an on-demand image service answers on a path of its own (`/.netlify/images`,
        // `/cdn-cgi/image`, `/_image`), so none of them can match it. A second line naming one
        // vendor's path used to sit here and could not fail without this one failing first.
        const src = doc().querySelector("main img")?.getAttribute("src") ?? "";
        expect(src, "the portrait is being fetched from an image service at request time rather "
            + "than emitted by the build, so it is neither hashed nor covered by dist/_headers").toMatch(/^\/_astro\//);
    });

    /**
     * The portrait is laid out at 275 CSS px, so a DPR-2 screen needs 550 real
     * pixels or it renders soft — which is what PageSpeed's "Serves images with
     * low resolution" audit flagged in production.
     *
     * This asserts pixels, not markup, because Astro silently *drops* a density
     * that would upscale the source. Raise the layout width past half the
     * source's 1000 px and the srcset disappears with a green build; this test is
     * the only thing that would say so.
     */
    it("offers the portrait at 2x density for high-DPI screens", async () => {
        const img = doc().querySelector("main img");
        const width = Number(img?.getAttribute("width"));
        expect(width, "the portrait must declare a layout width").toBeGreaterThan(0);

        const candidate = (img?.getAttribute("srcset") ?? "").match(/(\S+)\s+2x/)?.[1];
        expect(candidate, "the portrait must offer a 2x srcset candidate").toBeTruthy();

        expect(existsSync(`dist${candidate}`), `dist${candidate} must be emitted`).toBe(true);
        const {width: emitted} = await sharp(`dist${candidate}`).metadata();
        expect(emitted, "the 2x candidate must carry twice the layout pixels").toBe(width * 2);
    });
});

describe("no on-demand rendering output", () => {
    /*
     * ONE PROPERTY, EVERY SHAPE IT COULD TAKE. `output: "static"` with no adapter is the
     * decision (plan 002); an adapter is how it gets undone, and each one writes somewhere
     * different, so a guard naming a single path only holds against the adapter it was
     * written for. `tests/setup/build.ts` clears `.netlify/` before the build, which is what
     * makes the first two lines a question about THIS build rather than about whatever is
     * left on the machine from the SSR era.
     *
     * The Netlify paths are kept although that host is gone: they cost two lines, they are
     * the only thing that would notice `@astrojs/netlify` coming back, and the failure they
     * describe — the page shipping inside a serverless function instead of as HTML — is the
     * one this repo spent a plan removing. `dist/_worker.js` is the same question asked of
     * the host that ships the site today.
     */
    it("emits no server runtime for any host", () => {
        expect(existsSync(".netlify/v1/functions"), "the SSR adapter is gone; no function may be emitted").toBe(false);
        expect(existsSync(".netlify/v1/edge-functions")).toBe(false);
        expect(existsSync("dist/_worker.js"), "a Cloudflare adapter would put the whole site in here").toBe(false);
        expect(existsSync("dist/server")).toBe(false);
    });
});

describe("source hygiene", () => {
    /**
     * These class names look like utilities but generate no CSS rule at all —
     * each was verified against the built stylesheet. They are typos, not
     * shortcuts: `text-sm-1` should be `text-sm`. UnoCSS fails silently on them,
     * so this is the only gate that can catch a reintroduction.
     */
    const DEAD_CLASSES = ["text-sm-1", "custom-btn", "transform-y-["];

    it("references no utility class that generates no CSS", () => {
        const files = readdirSync("src", {recursive: true, encoding: "utf8"})
            .filter((f) => /\.(astro|ts|css)$/.test(f))
            .map((f) => `src/${f}`);
        expect(files.length, "src/ must contain source files").toBeGreaterThan(0);
        for (const file of files) {
            const source = read(file);
            for (const dead of DEAD_CLASSES) {
                expect(source, `${file} references the dead class "${dead}"`).not.toContain(dead);
            }
        }
    });

    it("covers every card on every page with an entrance-stagger delay rule", () => {
        // PR #41 added an 8th <main> child while the delay ladder stopped at
        // nth-child(7), so the footer animated on the same frame as the hero.
        // The ladder is hand-written CSS; this is the lockstep check.
        //
        // `main > *` is a GLOBAL rule in BasicLayout, so it animates the children of
        // every page's <main>, not just the home page's. A page whose main outgrew
        // the ladder would animate its tail on frame zero — the same defect, on a
        // page nobody thought to re-check. Ask the widest main in the build.
        const layout = read("src/layouts/BasicLayout.astro");
        const rungs = [...layout.matchAll(/nth-child\((\d+)\)\s*\{\s*animation-delay/g)].map((m) => Number(m[1]));
        expect(rungs.length, "the entrance cascade must exist").toBeGreaterThan(0);
        // A page with no <main> is not a defect — a 404 page is the obvious one — so it
        // is skipped rather than failed, and the non-vacuity floor moves to "at least
        // one page was actually checked". Demanding a <main> everywhere would turn an
        // ordinary future addition into a failed deploy.
        let checked = 0;
        for (const page of builtPages()) {
            const main = parseHTML(read(page)).document.querySelector("main");
            if (!main) continue;
            const cards = main.children.length;
            expect(cards, `${page} renders an empty <main>`).toBeGreaterThan(0);
            expect(
                Math.max(...rungs),
                `${page}: main renders ${cards} children but the delay ladder stops at nth-child(${Math.max(...rungs)})`,
            ).toBeGreaterThanOrEqual(cards);
            checked++;
        }
        expect(checked, "no page has a <main> — the ladder check is vacuous").toBeGreaterThan(0);
    });

    /**
     * ONE ENTRANCE, TWO PAGES — asserted as SAMENESS rather than as two sets of numbers.
     *
     * The wall's bibs stagger too, and the whole requirement is that they do it in the
     * ladder's own vocabulary: a second cascade with its own duration or step is two
     * cascades that disagree, which is what this exists to stop. So nothing here pins a
     * literal — it reads the ladder's keyframe, duration and step out of the sheet and
     * demands the bib rule match. Change the ladder and the bibs must follow; change one
     * of them alone and this is red.
     *
     * The CEILING is asserted as a `min()` rather than by re-deriving a delay per bib,
     * because the bib count moves with the calendar and a gate that counts races is a
     * gate that has to be edited when one is entered.
     */
    it("gives the wall's bibs the home page's entrance, not a second one of their own", () => {
        const layout = read("src/layouts/BasicLayout.astro");
        const ladder = layout.match(/main\s*>\s*\*\s*\{\s*animation:\s*([^;]+);/)?.[1]?.trim();
        expect(ladder, "the home page's entrance shorthand must be readable").toBeTruthy();
        const rungs = [...layout.matchAll(/nth-child\((\d+)\)\s*\{\s*animation-delay:\s*([\d.]+)s/g)]
            .map((m) => ({n: Number(m[1]), d: Number(m[2])}))
            .sort((a, b) => a.n - b.n);
        const step = Math.round((rungs[1].d - rungs[0].d) * 1000) / 1000;
        const ceiling = rungs[rungs.length - 1].d;

        const bib = layout.match(/\.bib-cell\s*\{([^}]*)\}/)?.[1] ?? "";
        expect(bib.match(/animation:\s*([^;]+);/)?.[1]?.trim(),
            `the bibs must wear the ladder's own animation shorthand ("${ladder}"), or the two pages `
            + `arrive differently`).toBe(ladder);
        const delay = bib.match(/animation-delay:\s*([^;]+);/)?.[1]?.trim() ?? "";
        expect(delay, "a bib's delay must come from its render index, not a hand-written ladder")
            .toContain("var(--i)");
        expect(delay, `the bibs' step must be the ladder's ${step}s`).toContain(`${step}s`);
        // min(--i, N) * step must land the tail on the ladder's own last rung.
        const cap = Number(delay.match(/min\(\s*var\(--i\)\s*,\s*(\d+)\s*\)/)?.[1]);
        expect(cap, "the bib delay must cap, or a long calendar runs a cascade for over a second")
            .toBeGreaterThan(0);
        expect(Math.round(cap * step * 1000) / 1000,
            `the bibs must stop at the ladder's own ${ceiling}s ceiling so the two pages cannot drift`)
            .toBe(ceiling);

        // AND THE REDUCED-MOTION ARM MUST REACH THEM. It named `main > *` only, and a bib
        // cell is not a child of main — so the wall would have kept animating for a reader
        // who asked it not to, with every other assertion here green.
        const reduced = layout.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\s{4}\}/)?.[1] ?? "";
        expect(reduced, "the reduced-motion arm must switch the bibs off too").toContain(".bib-cell");

        /*
         * AND THE INDEX HAS TO REACH THE MARKUP — the half everything above is structurally
         * blind to. Those assertions resolve the DECLARATION: they prove the sheet asks for
         * `min(var(--i), 7)`. Nothing in a declaration can prove that anything SETS `--i`,
         * and an unset one is not a small defect: `calc()` over an unresolved custom property
         * is invalid at computed-value time, so `animation-delay` takes its initial `0s` and
         * all thirteen bibs arrive together. That is the whole cascade gone, not a wrong step.
         *
         * MEASURED, not reasoned: deleting `style={"--i:" + index}` from `Patch.astro` and
         * rebuilding left the suite at 451 passed / 7 skipped — every assertion above green
         * over a wall with no stagger at all. This loop is what that mutation now fails.
         *
         * THE VALUES ARE ASSERTED AS THE RENDER ORDER, not merely as present, because a
         * constant `--i` is also a set property and also a dead cascade.
         */
        const walls = builtPages().filter((p) => p.startsWith("dist/patches"));
        expect(walls.length, "no wall page was built, so the entrance has nothing to reach")
            .toBeGreaterThan(0);
        for (const page of walls) {
            const cells = [...parseHTML(read(page)).document.querySelectorAll(".bib-cell")];
            expect(cells.length, `${page} renders no bib cells, so its entrance is untested`)
                .toBeGreaterThan(0);
            expect(
                cells.map((c) => c.getAttribute("style")?.match(/--i:\s*(\d+)/)?.[1]),
                `${page}: every bib must carry its own render index as --i, or the delay is `
                + `invalid and the whole wall arrives at once`,
            ).toEqual(cells.map((_, i) => String(i)));
        }
    });

    /**
     * A CONTROL WHOSE ONLY VISIBLE NAME IS A GLYPH MUST STILL HAVE ONE IN FORCED COLOURS.
     *
     * presetIcons paints an icon as a MASK over `background-color`, and a forced-colours mode
     * overrides `background-color` — so the glyph goes to the ground colour and the control
     * becomes an empty box of exactly the icon's size. Where the glyph IS the on-screen name,
     * that erases the control: the reader cannot tell what it does, or that it is a control.
     *
     * DERIVED FROM THE BUILT MARKUP, NOT FROM A LIST, and that is the whole point of writing
     * it this way. A hand-fixed sweep repainted seven such controls and missed an eighth — the
     * Now card's explainer link — because it wore no shared class and so appeared in nobody's
     * grep. A list would have to be remembered; this is a question asked of every page.
     *
     * THE DISCRIMINATOR IS "IS THE GLYPH THE NAME", not "does the control hold a glyph", and
     * the difference is what keeps this gate honest. A bib holds a sport mark and reads
     * "Ride 158.10 km …" beside it; a text link holds an arrow and reads "My events", and
     * `.text-link` also carries an underline that forced colours preserves. Those lose
     * decoration. An icon-only control loses its name. Requiring cover for every glyph would
     * redden this build on correct code — measured: 13 such controls on `/patches` alone,
     * every one of them labelled.
     *
     * `sr-only` TEXT IS NOT VISIBLE TEXT, so it is subtracted before asking. Counting it would
     * make every icon-only control here look labelled and the gate would assert nothing at all.
     */
    it("keeps a name on every icon-only control when colours are forced", () => {
        // Every selector inside any @media block that mentions forced-colors, from this page's
        // inline component styles AND the shared chunks it loads. Component CSS on this site is
        // largely INLINE, so reading only dist/_astro/*.css finds a fraction of the rules.
        const forcedSelectors = (css: string): string[] => {
            const out: string[] = [];
            const at = /@media[^{]*forced-colors[^{]*\{/g;
            // The match itself is not wanted, only where it ENDS — `at.lastIndex` is the first
            // byte inside the block, and the brace walk below finds the matching close.
            while (at.exec(css) !== null) {
                let i = at.lastIndex, depth = 1;
                while (i < css.length && depth > 0) {
                    if (css[i] === "{") depth++;
                    else if (css[i] === "}") depth--;
                    i++;
                }
                for (const rule of css.slice(at.lastIndex, i - 1).matchAll(/([^{}]+)\{[^{}]*\}/g)) {
                    out.push(...rule[1].split(",").map((s) => s.trim()).filter(Boolean));
                }
            }
            return out;
        };
        const shared = cssChunks().map((c) => c.css).join("\n");

        let iconOnly = 0;
        for (const page of builtPages()) {
            const html = read(page);
            const {document} = parseHTML(html);
            const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((s) => s[1]).join("\n");
            const selectors = forcedSelectors(`${inline}\n${shared}`);
            for (const glyph of [...document.querySelectorAll('[aria-hidden="true"]')]) {
                if (![...glyph.classList].some((c) => c.startsWith("i-"))) continue;
                const control = glyph.closest("a,button");
                if (!control) continue;
                const spoken = [...control.querySelectorAll(".sr-only")].map((n) => n.textContent ?? "").join("");
                const seen = (control.textContent ?? "").replace(spoken, "").replace(/\s+/g, " ").trim();
                if (seen !== "") continue;   // it has words; the glyph is decoration
                iconOnly++;
                const covered = selectors.some((s) => {
                    try { return glyph.matches(s); } catch { return false; }
                });
                expect(covered,
                    `${page}: <${control.tagName.toLowerCase()} class="${control.getAttribute("class")}"> has no `
                    + `visible name but its glyph, and no @media (forced-colors: active) rule repaints that glyph. `
                    + `A forced-colours reader gets an empty box where the control is.`).toBe(true);
            }
        }
        // CALIBRATION. Every assertion above is inside two `continue`s; if the shape of the
        // markup moved, this test would pass by never asking anything.
        expect(iconOnly, "no icon-only control was found on any page, so this gate is vacuous")
            .toBeGreaterThan(0);
    });

    /**
     * A `grid-template-areas` WHOSE ROWS DISAGREE ON COLUMN COUNT IS THROWN AWAY WHOLE.
     *
     * The rows of that property form a rectangle; a row with a different number of tokens
     * makes the declaration invalid, and an invalid declaration is DROPPED — not clamped, not
     * partially applied. The element then falls back to whatever earlier rule set the property,
     * so the page still renders, still looks broadly right, and every named area the rule was
     * introducing silently does not exist.
     *
     * THIS SHIPPED. A spacer row was written `"."` among two-column rows, meaning to leave one
     * flexible gap above the stub. It invalidated the bib templates that carried it, so the
     * affected bibs computed the BASE five-row template with no stub area at all and the stub
     * auto-placed into implicit tracks. Measured before the fix: `grid-template-areas` computed as
     * the base template with the two new rows absent
     * — and the wall pages carried 125-446px of height nobody asked for. Nothing was red. The
     * correct spelling is one token PER COLUMN: `". ."`.
     *
     * ASKED OF THE EMITTED CSS, not of the `.astro` source, because the source is not what the
     * browser parses and this is a parsing failure.
     */
    it("gives every grid-template-areas rows of equal width, or the browser drops it whole", () => {
        const sheets = [
            ...cssChunks().map((c) => ({where: c.file, css: c.css})),
            ...builtPages().map((p) => ({
                where: p,
                css: [...read(p).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((s) => s[1]).join("\n"),
            })),
        ];
        let checked = 0;
        for (const {where, css} of sheets) {
            for (const decl of css.matchAll(/grid-template-areas\s*:\s*([^;}]+)/g)) {
                const rows = [...decl[1].matchAll(/"([^"]*)"/g)].map((r) => r[1].trim());
                if (rows.length === 0) continue;   // `none`, or a var() this cannot read
                checked++;
                const widths = rows.map((r) => r.split(/\s+/).filter(Boolean).length);
                expect(new Set(widths).size,
                    `${where}: grid-template-areas rows are ${widths.join("/")} tokens wide. They must all `
                    + `match or the whole declaration is invalid and silently dropped — a "." spacer in a `
                    + `two-column template has to be written ". ." — rows were: ${rows.map((r) => `"${r}"`).join(" ")}`)
                    .toBe(1);
            }
        }
        expect(checked, "no grid-template-areas was found in any emitted sheet, so this gate is vacuous")
            .toBeGreaterThan(0);
    });

    it("gives every class token on every page a rule in the stylesheet it loads", () => {
        // UnoCSS fails silently on unknown utilities and Astro drops nothing:
        // a dead class ships as markup bytes with no effect. After plan 012
        // every remaining token is load-bearing; this keeps it that way.
        // The stylesheet escapes special chars in selectors (`.md\:pr-8`), so
        // unescape before comparing.
        //
        // PER-PAGE, unlike the orphan gate above, and the asymmetry is the point. The
        // question here is "does this page's own cascade define what its own markup
        // wears", which a union of every sheet would answer wrong: a rule another
        // page loaded would excuse a class this one cannot resolve. It is also the
        // only gate that would catch a presetIcons class the safelist never saw —
        // an icon with no rule is a mask box at zero size, invisible and green.
        let checked = 0;
        for (const page of builtPages()) {
            const css = pageCss(page);
            const cssClasses = new Set(
                [...css.matchAll(/\.((?:[\w-]|\\.)+)/g)].map((m) => m[1].replace(/\\(.)/g, "$1")),
            );
            const tokens = classTokens(page);
            // Non-vacuity without a hand-counted number: a page that wears any class at
            // all is enough for the loop below to mean something, and a legitimate new
            // page smaller than today's smallest must not fail a gate about rules.
            expect(tokens.size, `${page} ships no class tokens at all`).toBeGreaterThan(0);
            for (const token of tokens) {
                expect(cssClasses.has(token), `${page}: class "${token}" has no rule in the stylesheet it loads`).toBe(true);
            }
            checked += tokens.size;
        }
        expect(checked, "the home page alone ships more tokens than this — the walk is not reaching every page").toBeGreaterThan(50);
    });
});

/**
 * A TAP HAS TO SHOW SOMETHING, AND IT HAS TO KEEP SHOWING IT UNTIL THE PAGE GOES.
 *
 * Two defects behind one report ("no feedback after I tap", from a phone, with a visitor
 * tapping the goal card's way out several times):
 *
 *   1. `text-link` drew NOTHING on press. Measured on the shipped build, full-viewport pixel
 *      diff between idle and pressed, each row carrying a positive control (an injected garish
 *      `:active`) and a negative one (two captures, no press) so a zero could be told apart
 *      from a broken probe: control-cta 15,243px changed, control 3,336/3,773, bib 8,794,
 *      text-link 0 — on both its wearers. It carried only `hover:`, which PR #95 correctly put
 *      behind a pointer, so on a phone it had nothing at all.
 *   2. Every press ends at touchend, and the reader then waits — 376ms to first paint on a
 *      phone at Slow-4G with a warm cache, unbounded on a worse connection — with nothing on
 *      screen saying the tap landed.
 *
 * These gates hold both halves. They are written against the gate's own PREDICATE as well as
 * what it guards, which is the lesson PR #95 paid for: three gates there passed 290 green
 * tests while accepting the exact defect they existed for.
 */
describe("a press is acknowledged, and the acknowledgement outlives the finger", () => {
    // `:active` as a real state pseudo-class. NOT a substring test: `@media (forced-colors:
    // active)` contains the text and is a mode, not a press, and an escaped UnoCSS token
    // (`.active\:shadow-none`) contains it as part of a class NAME. The sibling hover gate
    // records the same trap for the same reason.
    const ACTIVE = /(?<!\\):active(?![\w-])/;
    const HELD = /\[data-leaving\]/;

    /**
     * WHICH ELEMENTS THE HELD PRESS IS *FOR*, derived from the script's own refusals rather
     * than listed. A list would have to name the bib, and the bib's exclusion is not a fact
     * about bibs — it is a fact about `target="_blank"`, which is Patch.astro's to change.
     * Stating it as a universal over `:active` instead fails the deploy on today's correct
     * code: `.bib-stub-link:active` is a press this change deliberately never twins, because a
     * new tab means this page does not go anywhere. (It said `.bib--linked` while the whole
     * bib was the anchor; the class moved and the reason did not.)
     */
    const scriptWouldHold = (a: Element): boolean => {
        const target = a.getAttribute("target");
        if (target && target !== "_self") return false;
        if (a.hasAttribute("download")) return false;
        const href = a.getAttribute("href") ?? "";
        if (href.startsWith("#")) return false;
        return href.length > 0;
    };

    // A rule's declarations as a comparable set. Rule bodies are compared, never their
    // positions: the chips' twin deliberately sits ABOVE `[aria-current="page"]` where its
    // `:active` sibling sits below, so a gate keyed on adjacency would forbid the fix.
    const declSet = (body: string): string =>
        body.split(";").map((d) => d.trim()).filter(Boolean).sort().join(";");

    // The elements a selector reaches, ignoring the state that gates it.
    const reach = (sel: string): string => structuralSelector(sel).replace(HELD, "").trim();

    /*
     * WHAT THE INVARIANT ACTUALLY IS: a press that repaints must still repaint while held.
     * NOT "the two carry identical declarations" — that was the first wording and it forbids a
     * divergence the site deliberately needs. The current sport chip presses to a readable label
     * on its inverted fill and holds to the accent border alone, because holding the label
     * change would sit at 1.37:1 for the whole navigation. Identical-declarations reds on that,
     * i.e. it forbids the accessibility fix it was meant to permit.
     *
     * The overlap requirement is what stops the weaker form being trivially satisfiable: a twin
     * has to touch at least one property the press touches, so it cannot "repaint" with something
     * unrelated and call the obligation discharged.
     */
    //
    // `transition` IS EXCLUDED, and a mutation is why. Every press here also declares
    // `transition: none` (the snap gate above requires it), so counting it made the overlap
    // satisfiable by a twin that repaints NOTHING: replacing the chips' held declarations with
    // `letter-spacing` still shared `transition` and the gate went green. A transition is not
    // ink — it says how a change is timed, not that there is one.
    const PAINTS_NOTHING = new Set(["transition", "transition-property", "transition-duration",
                                    "transition-timing-function", "transition-delay", "will-change"]);
    const props = (bodies: string[]) => new Set(
        bodies.flatMap((b) => b.split(";")).map((d) => d.split(":")[0].trim())
            .filter((p) => p && !PAINTS_NOTHING.has(p)),
    );

    it.each(builtPages())("gives every held-eligible link's press a twin that outlives it (%s)", (page) => {
        const doc = parseHTML(read(page)).document;
        const rules = parseRules(pageCss(page));
        const matching = (el: Element, state: RegExp) => rules
            .filter((r) => r.selectors.some((sel) => state.test(sel) && el.matches(reach(sel))))
            .map((r) => declSet(r.body));

        let checked = 0;
        for (const a of [...doc.querySelectorAll("a")]) {
            if (!scriptWouldHold(a)) continue;
            const press = matching(a, ACTIVE);
            if (!press.length) continue;
            checked++;
            const held = matching(a, HELD);
            const where = `${page}: <a href="${a.getAttribute("href")}">`;
            expect(
                held.length,
                `${where} repaints on :active but has no [data-leaving] twin, so its press vanishes `
                + "the instant the finger lifts and the reader waits with nothing. Add the twin in the "
                + "same shortcut (uno.config.ts) or beside the rule that draws the press.",
            ).toBeGreaterThan(0);
            const shared = [...props(held)].filter((p) => props(press).has(p));
            expect(
                shared.length,
                `${where} has a [data-leaving] rule, but it touches none of the properties the press `
                + `touches (held: ${[...props(held)].join(",")}; press: ${[...props(press)].join(",")}), `
                + "so the held state is not the press outliving the finger — it is something else.",
            ).toBeGreaterThan(0);
        }
        expect(checked, `${page}: no link both draws a press and is held — this assertion is vacuous`).toBeGreaterThan(0);
    });

    it("draws the press on a run of words, not merely a rule that exists", () => {
        // AN EXISTENCE CHECK IS SATISFIED BY THE DEFECT. `.text-link:active {}` ships a rule
        // and paints nothing, which is precisely the state this idiom was measured in at 0
        // changed pixels. So the declaration is what is asserted.
        const rules = parseRules(pageCss()).filter(
            (r) => r.selectors.some((sel) => /\.text-link\b/.test(sel) && ACTIVE.test(sel)),
        );
        expect(rules.length, "`text-link` ships no :active rule — on a phone it acknowledges a tap with nothing").toBeGreaterThan(0);
        expect(
            rules.some((r) => (decl(r.body, "color") ?? "").includes("--accent")),
            "`text-link`'s :active paints no accent ink; the rule exists but the press is invisible",
        ).toBe(true);
    });

    it("snaps the press ink instead of ramping it over the colour transition", () => {
        /*
         * THE ONE CHANNEL THAT NEEDED THIS. Both shortcuts carry `transition-colors
         * duration-300`, and `color` really is in the emitted property list — so on
         * `cubic-bezier(.4,0,.2,1)` a reader gets 8.5% of the accent at a 50ms tap and 36.7%
         * at 90ms. Every press that already worked comes from `transform`, `box-shadow` or
         * `outline`, none of which is in any transition list, which is why they were
         * instantaneous and this one would not have been.
         *
         * A PIXEL PROBE CANNOT SEE THIS, which is why it is asserted statically: the diff
         * thresholds far below 8.5% of the delta, so a ramped press and a snapped one both
         * come back as "something changed".
         */
        for (const page of builtPages()) {
            for (const r of parseRules(pageCss(page))) {
                const gated = r.selectors.some((sel) => ACTIVE.test(sel) || HELD.test(sel));
                if (!gated || decl(r.body, "color") === undefined) continue;
                const transition = decl(r.body, "transition") ?? decl(r.body, "transition-property");
                expect(
                    transition,
                    `${page}: ${r.selectors.join(",")} paints press ink but does not cancel the inherited `
                    + "300ms colour transition, so the press fades in over three times the length of a tap. "
                    + "Pair `active:transition-none` and `data-[leaving]:transition-none` with the ink.",
                ).toBe("none");
            }
        }
    });

    it.each(builtPages())("only clears the held press on a RESTORE, not on every load (%s)", (page) => {
        /*
         * THE ONE ASSERTION IN THIS FILE THAT READS SCRIPT RATHER THAN CSS, and it is here
         * because the defect it names actually shipped and no gate saw it.
         *
         * `pageshow` fires on EVERY presentation of a document, including the ordinary first
         * load, immediately after `load` — measured at 44ms warm and 468ms on Slow-4G against
         * the built site. Registered unguarded it deleted the hold of any tap that landed
         * before `load`, and cleared the 8s fallback with it, so the feature was off for
         * precisely the reader it exists for: the one whose page is still loading when they
         * tap. A device check does not catch it, because a human taps a page that has settled.
         *
         * A text assertion is a blunt instrument and is the right one here: there is no browser
         * in this suite, the handler is four tokens long, and the failure it guards is a
         * silently-absent conditional rather than anything a DOM could show.
         */
        // Comments are NOT stripped from an `is:inline` script, and the handler carries a long
        // one — a fixed-width window after the event name matched nothing on any page and broke
        // the baseline. Strip comments first, then the statement is four tokens.
        const script = read(page)
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
        const handler = script.match(/addEventListener\(\s*["']pageshow["'][\s\S]*?\}\s*\)\s*;/);
        expect(handler, `${page} registers no pageshow handler — the held press now survives a `
            + "bfcache restore, so a reader who goes back finds a control still drawn pressed").not.toBeNull();
        expect(
            /\bpersisted\b/.test(handler![0]),
            `${page} clears the held press on EVERY pageshow, not only a bfcache restore. `
            + "pageshow fires on the ordinary first load too, so this deletes the hold of any tap "
            + "that lands before `load` — the slow-connection reader the whole mechanism is for. "
            + "Guard it with `if (event.persisted)`.",
        ).toBe(true);
    });

    it("keeps the platform's own tap flash, and keeps it last", () => {
        /*
         * The preflight sets `-webkit-tap-highlight-color: transparent` on `html, :host`, and
         * both it and the override are one element selector — equal specificity, so ORDER is
         * the entire mechanism. Asserting only that the declaration ships would pass on a
         * build where the preflight still wins, which is the build this fixes.
         */
        const css = pageCss();
        const rules = parseRules(css).filter((r) => decl(r.body, "-webkit-tap-highlight-color") !== undefined);
        expect(rules.length, "nothing sets -webkit-tap-highlight-color — the preflight's `transparent` is unopposed").toBeGreaterThan(1);
        const winner = (decl(rules[rules.length - 1].body, "-webkit-tap-highlight-color") ?? "").trim();
        // The WHOLE value, not a substring of it — `color-mix(in srgb, var(--accent) 18%,
        // transparent)` legitimately names `transparent` as the thing it mixes toward, and a
        // substring test therefore reds on exactly the correct value. (It did, first run.)
        expect(
            winner === "transparent" || /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(winner),
            `the last tap-highlight rule in the sheet resolves to ${winner} — a press paints nothing on a `
            + "touch device that has no other affordance for it",
        ).toBe(false);
        expect(winner, "the surviving tap highlight is not the themed one").toContain("--accent");
    });

    it("lets the entrance paint at full ink rather than fading in", () => {
        /*
         * Chromium records no contentful paint for a composited opacity animation until it
         * resolves, so a `from { opacity: 0 }` here is a wait the reader pays on arrival:
         * measured tap-to-full-contrast-ink ~870ms before, ~500ms after, on a phone at
         * Slow-4G. (FCP reads 788 -> 396ms cold, but that delta is exactly the 0.4s duration
         * in both the cold and warm runs — quote it as FCP, not as legibility.)
         *
         * Scoped to `card-in` by name rather than to every keyframe: a fade is a perfectly
         * good device elsewhere, and the broad form reds on correct code the moment anything
         * else animates opacity.
         */
        // `\b` does not survive a trailing `%` — it needs a word character on one side, and
        // `0%` ends the token. The first draft of this line therefore matched nothing and
        // failed with "has it been renamed?" on a keyframe that was right there.
        const step = parseRules(pageCss()).find(
            (r) => /@keyframes\s+card-in\b/.test(r.at)
                && r.selectors.some((sel) => /^(0%|from)$/.test(sel.trim())),
        );
        expect(step, "the card-in entrance has no from-step — has it been renamed?").toBeDefined();
        expect(
            decl(step!.body, "opacity"),
            "card-in starts from an opacity again. That defers first contentful paint to the END of the "
            + "animation: measured tap-to-full-contrast-ink ~500ms -> ~870ms on a phone at Slow-4G.",
        ).toBeUndefined();
        // The rise is the half worth keeping, and it must stay an absolute length: `40%` is 40%
        // of each child's OWN height, which drew the whole page up to 282px out of place with
        // 327.6px clipped by `main` once the fade stopped hiding it.
        const travel = decl(step!.body, "transform") ?? "";
        expect(travel, "card-in no longer moves anything — the entrance is gone, not fixed").toContain("translateY");
        expect(travel, "card-in's travel is proportional again; at 40% the first frame is the page drawn "
            + "up to 282px out of place, with 327.6px of it clipped by main's own overflow").not.toMatch(/%/);
    });
});

describe("hashed assets are cached forever, and are hashed", () => {
    it("declares the immutable header for /_astro/", () => {
        /*
         * ASSERTED AGAINST THE EMITTED ARTIFACT, not against the source file, and that is
         * the whole point of the port. The old form read `netlify.toml` — a file the host
         * parsed and the build never touched, so the assertion proved a rule was WRITTEN
         * rather than SHIPPED. `public/_headers` is copied verbatim by Astro, so reading
         * `dist/_headers` proves the header reached the output the deploy uploads. It also
         * survives the next host change: nothing here names a platform.
         */
        // Asked with existsSync rather than by reading, because `read` throws ENOENT and a
        // stack trace does not tell you WHICH file the deploy will be missing or why it
        // matters. The first draft of this line asserted on the contents and the message
        // below was unreachable.
        expect(existsSync("dist/_headers"), "dist/_headers is missing — public/_headers did not "
            + "reach the build, so Cloudflare Pages will serve /_astro/ with no cache header at "
            + "all").toBe(true);
        /*
         * PARSED THE WAY BOTH HOSTS PARSE IT, which the first draft of this test did not.
         * That draft split the file on indentation and prefix-matched the path, inventing a
         * third grammar that neither host implements — both `trim()` every line and decide
         * path-vs-header on a leading `/` and the presence of a colon. Executed against
         * Cloudflare's own `parseHeaders.ts`, the old form gave four wrong verdicts: GREEN on
         * a file whose rule was COMMENTED OUT (the header text inside the `#` line satisfied
         * an unanchored regex), GREEN when only `/_astro/*.css` was cached (`startsWith`
         * matched the narrower path), and RED on two files both hosts serve correctly
         * (unindented headers, and a narrower rule listed above the real one).
         * The three calibrations that passed it were all mutations of PRESENCE, so none of
         * them entered the divergent region.
         */
        const rules = new Map<string, Record<string, string>>();
        let current: Record<string, string> | undefined;
        for (const raw of read("dist/_headers").split("\n")) {
            const line = raw.trim();
            if (line === "" || line.startsWith("#")) continue;
            if (line.startsWith("/")) {
                current = rules.get(line) ?? {};
                rules.set(line, current);
                continue;
            }
            const colon = line.indexOf(":");
            if (colon === -1 || current === undefined) continue;
            const name = line.slice(0, colon).trim().toLowerCase();
            const value = line.slice(colon + 1).trim();
            if (name && value) current[name] = current[name] === undefined ? value : `${current[name]}, ${value}`;
        }
        const rule = rules.get("/_astro/*");
        expect(rule, "dist/_headers installs no rule for exactly /_astro/*; every hashed asset "
            + "costs a render-blocking round trip to be told it has not changed (measured 168ms "
            + "and 175ms, transferSize 300 — a 304 carrying no content)").toBeDefined();
        // Byte equality is DELIBERATE and is stricter than HTTP: `public,max-age=31536000,immutable`
        // means the same thing to every cache and would redden here. The gate's job is the bytes
        // the deploy installs, not their semantics — loosen it and it stops being able to see a
        // value that drifted. The calibration that shows this parser bought something over the
        // old one is commenting the `cache-control:` line out of `public/_headers`: RED here,
        // GREEN under both the shipped-in-#101 and the pre-#101 assertions.
        expect(rule!["cache-control"], "the /_astro/* rule exists but does not cache immutably — "
            + "a narrowed, overridden or removed cache-control here is the same regression as "
            + "having no rule at all").toBe("public, max-age=31536000, immutable");
    });

    it("only emits content-addressed filenames there, which is what makes that safe", () => {
        /*
         * THE PRECONDITION IS THE THING WORTH GATING, not the header. `immutable` for a year is
         * correct exactly while a URL can never mean two things, and that holds because Astro
         * puts a hash of the file's own contents in its name. The day one asset lands there
         * without a hash, this rule serves a stale file for a year and nothing else would say so.
         */
        const files = readdirSync("dist/_astro");
        expect(files.length, "dist/_astro is empty — this assertion is vacuous").toBeGreaterThan(0);
        const unhashed = files.filter((f) => !/\.[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(f));
        expect(unhashed, "these /_astro/ assets carry no content hash, so the immutable header in "
            + "dist/_headers would pin a stale file for a year").toEqual([]);
    });

    it("ships no file the host would execute rather than serve", () => {
        /*
         * THE ARTIFACT IS SUPPOSED TO BE INERT, and two filenames break that. Cloudflare
         * Pages reads `_worker.js` as advanced-mode server code and `_routes.json` as
         * routing configuration — both arriving from `public/`, which is PR-authored, and
         * neither validated at deploy time: `wrangler pages deploy` appends the directory
         * and lets the server decide. So the deploy jobs' "no repository source runs" only
         * covers the RUNNER; these two would run at the edge instead.
         *
         * This site is a static build with no adapter and should never grow either. Asserted
         * here rather than in the workflow because an assertion about the artifact belongs
         * with the rest of them, and because this way it is caught locally before it ships.
         */
        for (const forbidden of ["_worker.js", "_routes.json"]) {
            expect(existsSync(`dist/${forbidden}`), `dist/${forbidden} exists — Cloudflare Pages `
                + `treats it as executable configuration rather than a static file, so this build `
                + `would stop being the inert artifact the deploy jobs assume. If an adapter was `
                + `added on purpose, the deploy design needs revisiting, not this assertion`).toBe(false);
        }
    });
});
