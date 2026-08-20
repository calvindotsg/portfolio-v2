import {existsSync, readFileSync, readdirSync} from "node:fs";
import {parse} from "yaml";
import {describe, expect, it} from "vitest";

/**
 * THE EXECUTABLE CONTENT THIS REPOSITORY SHIPS TO WHOEVER CHECKS IT OUT.
 *
 * `.claude/skills/` is tracked, so a skill is not a setting on somebody's workstation — it
 * travels with the branch, and checking out an untrusted branch puts that branch's skills on
 * disk. Two properties make that more than a documentation question. A skill can execute shell
 * at LOAD time, before the agent has read the policy it is about to apply; and a skill is
 * invoked precisely when an agent is about to act, which is the moment authority is highest.
 *
 * WHAT MAKES THE DEPENDABOT SKILL THE WORKED EXAMPLE, and the argument generalises to any
 * successor: it reads a large volume of prose written by people who are not the maintainer —
 * pull request bodies, upstream release notes, registry JSON — and then merges, which in this
 * repository is an unreviewed production deploy. The tempting dismissal is that anyone who can
 * put text in a release note could already run code at build time. That is false, and the
 * reason is an ACTOR SET rather than a severity: publishing a package needs the maintainer's
 * credentials, while getting prose into GitHub's auto-generated notes needs only a merged typo
 * fix to any upstream repository, which Dependabot then reproduces verbatim into a body the
 * agent reads. The set who can author the prose is strictly larger than the set who can publish
 * the package.
 *
 * WHAT THIS SUITE CAN AND CANNOT DO, said here rather than discovered later. The frontmatter
 * assertions are structural and have real teeth: a declaration is present or it is not, and an
 * entry either narrows a launcher or does not. The consent assertions are SHAPE checks over
 * prose. They catch the carve-out being reintroduced in the words it was written in and in the
 * obvious rewordings, and they cannot read meaning — a paraphrase that grants standing consent
 * in different words passes. That limit is real and is not papered over: their worth is that
 * removing the rule now costs a deliberate edit to a test, which is the whole difference
 * between a policy and a preference.
 *
 * DISCOVERED RATHER THAN LISTED, like every other sweep here. One skill lives in this
 * directory today; the second one joins these gates by existing rather than by being
 * remembered, which is the argument `uno.config.ts` makes when it safelists a class another
 * constant already emits.
 */

const SKILL_DIR = ".claude/skills";

const read = (p: string) => readFileSync(p, "utf8");

interface Skill {
    /** The directory name, which is what a person types after the slash. */
    name: string;
    path: string;
    /** Everything after the closing frontmatter fence. */
    body: string;
    frontmatter: Record<string, unknown> | undefined;
}

/**
 * EVERY TRACKED SKILL, PARSED ONCE.
 *
 * The frontmatter fence is matched anchored at the start of the file, because that is the only
 * place the loader reads one; a `---` further down is a horizontal rule in the prose and
 * matching it would hand every gate below a slice of the document as though it were config.
 */
function skills(): Skill[] {
    if (!existsSync(SKILL_DIR)) return [];
    return readdirSync(SKILL_DIR, {withFileTypes: true})
        .filter((e) => e.isDirectory())
        .map((e) => ({name: e.name, path: `${SKILL_DIR}/${e.name}/SKILL.md`}))
        .filter((s) => existsSync(s.path))
        .map(({name, path}) => {
            const text = read(path);
            const fence = /^---\n([\s\S]*?)\n---\n/.exec(text);
            return {
                name,
                path,
                body: fence === undefined || fence === null ? text : text.slice(fence[0].length),
                frontmatter: fence ? (parse(fence[1]) as Record<string, unknown>) : undefined,
            };
        });
}

const ALL = skills();

/**
 * `allowed-tools` TAKES TWO SPELLINGS AND BOTH ARE LEGAL. The documented form is a
 * space-separated string; a YAML list is what the personal skills on this machine use, and it
 * is the safer one here because an entry can contain spaces of its own — an entry naming a
 * host, like a curl restricted to one registry, is unsplittable in the string form. Read both
 * so this gate is about the BOUND rather than about the author's spelling.
 */
function toolsOf(skill: Skill): string[] | undefined {
    const raw = skill.frontmatter?.["allowed-tools"];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") return raw.split(/\s+/).filter(Boolean);
    return undefined;
}

/**
 * A SKILL THAT CAN MERGE. Detected from the command it documents rather than from its name, so
 * a second skill that grows a merge step is caught the day it does. `gh pr merge` is the only
 * way anything lands on `main` here — there is no staging branch, so it is also the deploy.
 */
const canMerge = (skill: Skill): boolean => /\bgh\s+pr\s+merge\b/.test(skill.body);

describe("the skills this repository ships", () => {
    it("finds any at all, so every sweep below is not inspecting an empty directory", () => {
        expect(ALL.length, `${SKILL_DIR} holds no SKILL.md, so every assertion in this file is vacuous. `
            + "If the skills moved, re-point this suite rather than deleting it").toBeGreaterThan(0);
        for (const skill of ALL) {
            expect(skill.frontmatter, `${skill.path} has no frontmatter fence at the top of the file, so `
                + "the loader reads no metadata for it at all").toBeDefined();
        }
    });

    /**
     * THE DECLARATION IS THE ONLY BOUND A SKILL FILE CARRIES, and its absence is silent. A skill
     * with no `allowed-tools` is not obviously unbounded when you read it — it simply says
     * nothing, and nothing is what an injected instruction needs.
     *
     * Deliberately NOT asserted: that the declaration is ENFORCED. The published documentation
     * describes the field both as granting temporary permission and as restricting the available
     * set, and which one it is has not been measured here. So this holds that the author made a
     * decision and wrote it down; it does not claim a sandbox, and no comment in this repository
     * should either.
     */
    it("bounds every skill with an allowed-tools declaration", () => {
        for (const skill of ALL) {
            expect(toolsOf(skill), `${skill.path} declares no allowed-tools. The file is tracked, so it is `
                + "on disk for anyone who checks out this branch, and a skill can execute shell at load time "
                + "before the agent reads the policy in it. Declare the tools its own documented procedure "
                + "invokes, and nothing else").toBeDefined();
            expect(toolsOf(skill)!.length, `${skill.path} declares an EMPTY allowed-tools, which reads like a `
                + "bound and states none").toBeGreaterThan(0);
        }
    });

    /**
     * A LAUNCHER NAMED BY ITS BARE BINARY IS NOT A BOUND, and this is the assertion that would
     * have caught the tempting first draft of the one declaration here.
     *
     * `Bash(pnpm:*)` looks specific and is not: `pnpm dlx` fetches and executes an arbitrary
     * package, so it is `Bash(*)` spelled in a way that passes review. The same is true of every
     * interpreter, of `npx`, and of `curl` — an unbounded `curl` is the exfiltration channel
     * itself, which is why the declaration here names its two registries instead.
     *
     * THE RULE IS "NARROW IT BEYOND THE BINARY", tested as whitespace in the matched prefix,
     * because a subcommand or a host is the only thing that can follow. `Bash(gh:*)` and
     * `Bash(git:*)` pass and should: neither is a way to run arbitrary code, and bounding them
     * further would be theatre.
     *
     * ADDING A LAUNCHER TO THE LIST IS THE INTENDED COST. This is an allow-list and it fails
     * loudly; a skill that genuinely needs one narrows the entry or the list gains a member on
     * purpose, which is the trade the deny-list version of this could not offer.
     */
    const LAUNCHERS = new Set(["pnpm", "npm", "npx", "yarn", "bun", "deno", "node", "python", "python3",
        "sh", "bash", "zsh", "env", "eval", "curl", "wget", "ssh", "docker", "make"]);

    it("lets no allowed-tools entry hand back arbitrary execution", () => {
        let inspected = 0;
        for (const skill of ALL) {
            for (const entry of toolsOf(skill) ?? []) {
                const m = /^([A-Za-z][A-Za-z0-9_-]*)(?:\((.*)\))?$/.exec(entry.trim());
                expect(m, `${skill.path} declares \`${entry}\`, which is not a tool name or a tool name with `
                    + "a parenthesised argument pattern — the loader cannot read it as a bound").not.toBeNull();
                const [, tool, argument] = m!;
                if (tool !== "Bash") continue;
                inspected++;

                expect(argument, `${skill.path} declares a bare \`Bash\`, which is every command there is`)
                    .toBeDefined();
                // The prefix is everything the pattern pins before its trailing wildcard.
                const prefix = argument!.replace(/:?\*$/, "").trim();
                expect(prefix.length, `${skill.path} declares \`${entry}\`, which pins nothing at all`)
                    .toBeGreaterThan(0);

                const binary = prefix.split(/\s+/)[0];
                if (!LAUNCHERS.has(binary)) continue;
                expect(/\s/.test(prefix), `${skill.path} declares \`${entry}\`. \`${binary}\` can run code it `
                    + "is handed — an interpreter, a package runner, or a fetch of an arbitrary URL — so "
                    + "naming it alone grants everything. Narrow the entry to the subcommand or the host the "
                    + "skill actually needs, or add a deliberate exception to LAUNCHERS").toBe(true);
            }
        }
        expect(inspected, "no skill declares a Bash entry, so the launcher rule above inspected nothing")
            .toBeGreaterThan(0);
    });

    /**
     * THE COMBINATION THAT MATTERS: READ UNTRUSTED TEXT, THEN ACT WITH AUTHORITY.
     *
     * These three are not dangerous in themselves and are not forbidden to skills generally —
     * a documentation skill wants to fetch, and a research skill wants to delegate. They are
     * forbidden to a skill that can MERGE, because merging here deploys to production and
     * because such a skill has an attacker's prose in its context by the time it decides.
     * `Task` earns its place for a second reason: a subagent does not inherit the parent's
     * declaration, so spawning one is the bound removing itself.
     */
    const NOT_BESIDE_MERGE_AUTHORITY = new Set(["WebFetch", "WebSearch", "Task", "Agent"]);

    it("gives a skill that can merge no way to fetch or delegate", () => {
        const merging = ALL.filter(canMerge);
        expect(merging.length, "no skill documents `gh pr merge`, so the three assertions keyed on merge "
            + "authority inspect nothing. If merging moved out of the skills, say so and delete them")
            .toBeGreaterThan(0);

        for (const skill of merging) {
            const granted = (toolsOf(skill) ?? [])
                .map((e) => /^([A-Za-z][A-Za-z0-9_-]*)/.exec(e.trim())?.[1] ?? "")
                .filter((tool) => NOT_BESIDE_MERGE_AUTHORITY.has(tool));
            expect(granted, `${skill.path} can merge — which here is an unreviewed production deploy — and `
                + "also grants these. Each turns prose written by somebody else into an action: a fetch of an "
                + "attacker-named URL, or a subagent that does not inherit this declaration at all").toEqual([]);
        }
    });

    /**
     * CONFIRMATION MUST NOT BE CACHEABLE ACROSS A SESSION.
     *
     * A standing "the operator already said go ahead" is exactly the state an injected
     * instruction would try hardest to establish, and it is worth almost nothing legitimately:
     * a human who is present can say yes again in one word. So the skill has to require
     * confirmation per merge and must not carry the escape hatch.
     *
     * BOTH HALVES ARE NEEDED AND NEITHER IS SUFFICIENT. The positive alone passes a document
     * that states the rule and then exempts itself a paragraph later; the negative alone passes
     * a document that has simply deleted the requirement. Together they fail on both edits.
     *
     * AND BOTH ARE SHAPE, NOT MEANING — see this file's header. The carve-out pattern is written
     * as "unless … already" and as the "already agreed" family rather than as the one sentence
     * that was removed, because a gate keyed to a single spelling catches only the author who
     * pastes it back verbatim. It still cannot catch a fresh paraphrase, and pretending
     * otherwise in a comment would be worse than the gap.
     *
     * THE COST IS THAT THE SKILL MAY NOT QUOTE THE SHAPE IT FORBIDS, and this is a real
     * constraint rather than a theoretical one: the first draft of the rewritten skill went RED
     * here on its own two sentences EXPLAINING why standing consent was removed. Nothing was
     * granted — the prose was warning about the thing — and no pattern over words can tell a
     * grant from a warning. The reword is the fix and it is the better document: state the rule
     * ("approval does not carry forward across a session") rather than quote the exception you
     * are refusing. If you hit this, do that, and do NOT loosen these patterns — an exemption
     * keyed on nearby negation is a bypass any author can type, and it would remove the rule for
     * everyone in order to save one sentence.
     */
    const CARVE_OUT = [
        /\bunless\b[^.]{0,120}\balready\b/i,
        /\balready\s+(?:said|agreed|approved|confirmed|authoris|authoriz|told|given)/i,
        /\bstanding\s+(?:consent|approval|authorisation|authorization)\s+(?:is|applies|holds)\b/i,
    ];
    const PER_MERGE = /\b(?:every time|each time|each one|before each|per merge)\b/i;

    it("makes a merge-capable skill require confirmation every time", () => {
        for (const skill of ALL.filter(canMerge)) {
            expect(PER_MERGE.test(skill.body), `${skill.path} can merge but states no per-merge confirmation `
                + "requirement. Merging here deploys to production with no staging branch and no review, so "
                + "the skill must say that each one is confirmed on its own").toBe(true);

            const escapes = CARVE_OUT.filter((pattern) => pattern.test(skill.body))
                .map((pattern) => String(pattern));
            expect(escapes, `${skill.path} can merge and carries a standing-consent carve-out matching these `
                + "patterns. Session-scoped approval is precisely what an injected instruction would establish, "
                + "and it saves a present human one word. If this is a false positive, reword the sentence — "
                + "loosening the pattern here removes the rule for everyone").toEqual([]);
        }
    });

    /**
     * AND THE RULE THE OTHER TWO REST ON: the text is data.
     *
     * A skill that reads prose somebody else wrote has to say so, in its own file, because the
     * agent applying it has no other way to know which of the words in its context are
     * instructions. Held as a positive requirement rather than as a forbidden phrase, since
     * there is no wrong spelling to hunt — only a missing statement.
     *
     * TWO ANCHORS, ACCEPTED AS AN ALTERNATIVE RATHER THAN REQUIRED TOGETHER, and the reason is a
     * measurement rather than a preference. The first draft held only the "data, not
     * instructions" shape, and a calibration showed exactly ONE line in the whole skill satisfied
     * it — its section heading. A gate resting on one heading reddens the day somebody rewords
     * that heading while keeping every word of the rule, which is this suite's own worst failure
     * mode: red on correct content. Both anchors live inside the same section, so deleting the
     * section still takes both and the gate keeps its teeth on the edit that actually matters;
     * rewording either one keeps it green. A LOOSE POSITIVE IS THE SAFE DIRECTION — its worst
     * case is failing to catch a weakened document, where a loose NEGATIVE would manufacture a
     * failure against a correct one.
     */
    it("tells a merge-capable skill that what it reads is data", () => {
        const SAYS_ITS_INPUT_IS_UNTRUSTED = [
            /\bdata\b[^.]{0,40}?\b(?:not|never|rather than)\b[^.]{0,24}?\binstruction/i,
            /\buntrusted\b[^.]{0,40}\b(?:text|prose|data|input|content|body|notes)\b/i,
        ];
        for (const skill of ALL.filter(canMerge)) {
            expect(SAYS_ITS_INPUT_IS_UNTRUSTED.some((p) => p.test(skill.body)), `${skill.path} reads pull request bodies, release `
                + "notes and registry responses — all of it written by people who are not the maintainer — and "
                + "never says that this is untrusted data rather than instruction. State it, with the reason: "
                + "the set who can author release-note prose is larger than the set who can publish the package")
                .toBe(true);
        }
    });
});
