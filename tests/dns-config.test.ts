import {execFileSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Evaluator, Lexer, Parser, data} from "@actions/expressions";
import {truthy} from "@actions/expressions/result";
import {parse} from "yaml";
import {describe, expect, it} from "vitest";

/**
 * THE ZONE IS THE ONE THING THIS REPOSITORY CAN BREAK THAT NO TEST HERE COULD OTHERWISE SEE.
 *
 * Everything else the suite guards is observable in `dist/`: a wrong colour, a missing tag, a
 * stale date. DNS is not. A bad apply does not fail a build — it produces a green run and a
 * domain that resolves to the wrong place, or a mailbox that stops receiving, for as long as it
 * takes a human to notice. There is no artifact to assert against, so the assertions have to be
 * about the CONFIGURATION, before anything runs.
 *
 * The division of labour with `dns/test_filters.py` is deliberate and neither half is redundant:
 *
 *   - The Python half proves octoDNS BEHAVES as claimed, by executing a real plan against a
 *     fixture of the live zone on the pinned version. It is the only thing that can catch a
 *     library upgrade changing what a reject list means. It needs Python, so it runs in
 *     `dns.yml` rather than here.
 *   - This half proves the SHIPPED FILES still ask for that behaviour, and that the workflow
 *     around them cannot write DNS by a route nobody reviewed. It runs in `pnpm test`, on every
 *     PR, including the ones that touch nothing under `dns/` — which matters, because the way
 *     this breaks is a refactor of `dns.yml`, and `dns.yml` only triggers itself on `dns/**`.
 *
 * That second point is the whole reason this file is not just more Python. A change that guts
 * the safety of the DNS workflow does not necessarily run the DNS workflow.
 */

interface Step {
    name?: string;
    uses?: string;
    run?: string;
    if?: string;
    env?: Record<string, string>;
    with?: Record<string, string>;
    "continue-on-error"?: boolean | string;
}

interface Job {
    needs?: string | string[];
    if?: string;
    environment?: string | {name?: string; url?: string};
    steps?: Step[];
    "continue-on-error"?: boolean | string;
}

const DNS_WORKFLOW = ".github/workflows/dns.yml";
const WF = parse(readFileSync(DNS_WORKFLOW, "utf8")) as {
    on: Record<string, unknown>;
    env?: Record<string, string>;
    concurrency?: {group?: string; "cancel-in-progress"?: boolean};
    jobs: Record<string, Job>;
};

const CONFIG_PATH = "dns/config.yaml";
const CONFIG = parse(readFileSync(CONFIG_PATH, "utf8")) as {
    manager?: Record<string, unknown>;
    providers: Record<string, Record<string, unknown>>;
    processors: Record<string, {class: string; rejectlist?: string[]; include_target?: boolean}>;
    zones: Record<string, {sources: string[]; processors: string[]; targets: string[]}>;
};

const ZONE_PATH = "dns/zones/calvin.sg.yaml";
const ZONE_TEXT = readFileSync(ZONE_PATH, "utf8");
const ZONE = parse(ZONE_TEXT) as Record<string, unknown>;

const REQUIREMENTS = readFileSync("dns/requirements.txt", "utf8");

const needsOf = (id: string): string[] => {
    const n = WF.jobs[id]?.needs;
    return n === undefined ? [] : typeof n === "string" ? [n] : n;
};

const stepsOf = (id: string): Step[] => WF.jobs[id]?.steps ?? [];
const runScript = (id: string): string => stepsOf(id).map((s) => s.run ?? "").join("\n");
/**
 * The run scripts with comment-only lines dropped. A script NAMED in a comment is not a script
 * CALLED, and the difference is not academic: the first version of the drift assertions below
 * matched `dns/drift.sh` anywhere in the step, so deleting the invocation while leaving the
 * comment that explains it kept them green. Caught by mutating the workflow and watching only
 * one of three guards go red.
 */
const runCommands = (id: string): string =>
    runScript(id)
        .split("\n")
        .filter((line) => !/^\s*#/.test(line))
        .join("\n");

const envText = (id: string): string =>
    stepsOf(id)
        .flatMap((s) => Object.values(s.env ?? {}))
        .join("\n");

describe("the DNS workflow cannot write the zone by an unreviewed route", () => {
    /**
     * DISCOVERED FROM THE CAPABILITY, not from the job's name — the same rule
     * `tests/workflow-guards.test.ts` uses to find publishing jobs. A job that can change DNS is
     * exactly a job that can read the write-scoped token; a second one called `sync` or
     * `reconcile` would be found by this and missed by any list of names.
     *
     * Both index spellings, because `secrets.X` and `secrets['X']` are equivalent and matching
     * only the dot form is a naming convention wearing a capability check.
     */
    const canWriteDns = Object.keys(WF.jobs).filter((id) =>
        /secrets\s*(\.\s*CLOUDFLARE_DNS_WRITE_TOKEN|\[\s*['"]CLOUDFLARE_DNS_WRITE_TOKEN['"]\s*\])/.test(envText(id)),
    );

    it("has exactly one job that can write, and it is the apply job", () => {
        expect(canWriteDns).toEqual(["apply"]);
    });

    it("keeps the write token behind the dns environment", () => {
        for (const id of canWriteDns) {
            const env = WF.jobs[id].environment;
            const name = typeof env === "string" ? env : env?.name;
            expect(name, `job "${id}" reads the DNS write token without an environment`).toBe("dns");
        }
    });

    /**
     * THE EDGE. `apply` must wait for both gates. `semantics` alone would let an apply run
     * against a zone file nobody had planned; `plan` alone would let one run on a config whose
     * reject lists had been gutted in the same PR.
     */
    it("makes apply wait for both the semantics proof and the plan", () => {
        expect(needsOf("apply").sort()).toEqual(["plan", "semantics"]);
        expect(needsOf("plan")).toEqual(["semantics"]);
    });

    /**
     * THREE THINGS VOID A `needs:` EDGE and none of them is removing it: `continue-on-error` on
     * the upstream job makes a failure count as success, an `always()` in the downstream guard
     * detaches it from the result, and a trailing `|| true` in a run step means the step cannot
     * fail in the first place. All three read as green.
     */
    it("leaves nothing that would let a red gate pass as green", () => {
        for (const id of Object.keys(WF.jobs)) {
            expect(WF.jobs[id]["continue-on-error"], `job "${id}"`).toBeUndefined();
            expect(WF.jobs[id].if ?? "", `job "${id}" guard`).not.toMatch(/always\s*\(/);
            for (const step of stepsOf(id)) {
                expect(step["continue-on-error"], `step "${step.name ?? step.run}" in "${id}"`).toBeUndefined();
            }
            expect(runScript(id), `run steps in "${id}"`).not.toMatch(/\|\|\s*true/);
        }
    });
});

describe("the checksum is what separates planning from applying", () => {
    /**
     * WITH `enable_checksum: true` THE `--doit` FLAG STOPS DECIDING ANYTHING — octoDNS' own help
     * calls it "ignored" in that mode, and `Manager.sync` has no dry-run guard on its apply loop.
     * What decides is whether the invocation was handed a `--checksum`. So the assertion that
     * matters is not "the plan job lacks --doit" but "the plan job lacks --checksum", and a
     * future reader reaching for `--doit` as the safety needs this to be the thing that fails.
     */
    it("never passes a checksum to the planning job", () => {
        expect(runScript("plan")).not.toMatch(/--checksum/);
    });

    it("passes one in the apply job, taken from the dispatch input", () => {
        expect(runScript("apply")).toMatch(/--checksum/);
        expect(envText("apply")).toMatch(/inputs\.checksum/);
    });

    it("enables the checksum in the octoDNS config, or none of the above means anything", () => {
        expect(CONFIG.manager?.enable_checksum).toBe(true);
    });
});

describe("the weekly drift run cannot be evicted by pull request traffic", () => {
    /**
     * `cancel-in-progress: false` protects a RUNNING job and nothing else. GitHub's own words:
     * "any existing pending job or workflow in the same concurrency group will be canceled and
     * the new queued job or workflow will take its place", and at most one run stays pending per
     * group. So under a single `group: dns` the Monday drift run, queued behind a busy afternoon,
     * is dropped — as a grey cancelled run, not a red one — in exactly the weeks most likely to
     * contain a change worth noticing.
     */
    it("keys the concurrency group on the event, so a schedule shares no queue with a PR", () => {
        expect(WF.concurrency?.group).toMatch(/github\.event_name/);
    });

    it("still refuses to cancel a run already in progress", () => {
        expect(WF.concurrency?.["cancel-in-progress"]).toBe(false);
    });
});

describe("the drift decision is delegated, so that it can be executed", () => {
    /**
     * WHY THIS READS THE WORKFLOW RATHER THAN TRUSTING THE BEHAVIOURAL CASES BELOW. Those prove
     * `dns/drift.sh` behaves; they say nothing about whether the workflow still CALLS it. Restore
     * the bare `grep -o 'checksum=...'` this replaced and every behavioural check stays green
     * while the plan job goes back to reporting a drifted zone as "No changes" — the redundancy
     * is invisible from below, so one assertion has to look at the config itself.
     *
     * The original was fail-open in a way exit codes cannot catch: octodns-sync exits 0 whether
     * or not it found changes, so a grep that stops matching is indistinguishable from a clean
     * zone. `drift.sh` requires octodns' two signals to agree and exits non-zero when it cannot
     * tell, which fails the step instead of reporting a zone it never checked.
     */
    it("the plan job asks drift.sh, instead of parsing octodns' output inline", () => {
        expect(runCommands("plan")).toMatch(/dns\/drift\.sh/);
    });

    it("does not go back to reading the checksum line as the only drift signal", () => {
        expect(runCommands("plan")).not.toMatch(/grep[^\n]*checksum=/);
    });

    /**
     * THE SAME SYMMETRY, FOR THE PROOF THAT CANNOT MOVE HERE. `dns/test_filters.py` needs Python
     * and octoDNS, so it stays in the workflow — and CLAUDE.md calls it the only evidence a DNS
     * change is safe. Nothing else in this repository reads the `semantics` job's commands, so
     * without this the job can be emptied of every offline proof while `plan` and `apply` keep
     * their `needs:` edge and go on presenting a green gate.
     */
    it("the semantics job still executes the reject-list proof", () => {
        expect(runCommands("semantics")).toMatch(/dns\/test_filters\.py/);
    });
});

/**
 * `dns/drift.sh` EXECUTED, against fixtures of every output shape it can be handed.
 *
 * These were a hand-rolled bash harness — `check()`, pass/fail counters, ANSI colour codes and a
 * summary line, for six cases — run only by `.github/workflows/dns.yml`, which triggers itself on
 * `dns/**`. So the way this actually breaks was uncovered: a refactor that changes the script's
 * behaviour and does not touch `dns/` never ran them. They cost nothing to re-host here, they run
 * on every PR now, and the assertion library was already in the repository.
 *
 * THE FIXTURES ARE NOT INVENTED. The clean and drifted ones are the literal lines octodns 1.21.0
 * printed on 2026-07-31 — the first from the live plan job against calvin.sg, the second from a
 * local run of two YamlProviders differing by one added record. The three failures are the shapes
 * a format change would produce, and they are the whole point: octodns-sync exits 0 whether or not
 * it found changes, so an output this parser cannot read must go RED rather than fall through to
 * "clean". That fall-through is what once took a Monday drift run green while the zone had moved.
 */
describe("drift.sh reads octodns' two signals, and refuses when they do not agree", () => {
    const CS = "3ba77b5bb4a88d80ad9b14733236ee74e88e0237e8d0e69a88a073308820f595";

    /** drift.sh's answer to one plan file, or to a path it cannot read when `plan` is null. */
    const drift = (plan: string | null) => {
        const dir = mkdtempSync(join(tmpdir(), "drift-"));
        const file = join(dir, "plan.txt");
        if (plan !== null) writeFileSync(file, plan);
        try {
            const stdout = execFileSync("bash", ["dns/drift.sh", file], {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            });
            return {status: 0, stdout: stdout.trim()};
        } catch (e) {
            const err = e as {status?: number, stdout?: string};
            return {status: err.status ?? -1, stdout: (err.stdout ?? "").trim()};
        } finally {
            rmSync(dir, {recursive: true, force: true});
        }
    };

    it.each([
        {
            name: "a matching zone reports CLEAN",
            plan: "INFO  CloudflareProvider[cloudflare] plan:   No changes\nNo changes were planned\n",
            status: 0,
            stdout: "CLEAN",
        },
        {
            name: "a drifted zone reports DRIFT and the checksum to apply",
            plan: "INFO  Plan\n"
                + "********************************************************************************\n"
                + "* calvin.sg.\n"
                + "********************************************************************************\n"
                + "Create <CNAME gallery.calvin.sg.>\n"
                + `INFO  Checksum checksum=${CS}\n`,
            status: 0,
            stdout: `DRIFT ${CS}`,
        },
        {
            name: "a plan with changes whose checksum line changed format is not reported clean",
            plan: `INFO  Plan\nCreate <CNAME gallery.calvin.sg.>\nINFO  Checksum sha256:${CS}\n`,
            status: 2,
            stdout: "",
        },
        {
            name: "both signals at once is a contradiction, not a coin toss",
            plan: `No changes were planned\nINFO  Checksum checksum=${CS}\n`,
            status: 2,
            stdout: "",
        },
        {name: "an empty plan file is unreadable, not clean", plan: "", status: 2, stdout: ""},
        {name: "a missing plan file is an error", plan: null, status: 2, stdout: ""},
    ])("$name", ({plan, status, stdout}) => {
        expect(drift(plan)).toEqual({status, stdout});
    });
});

/**
 * The Evaluator wants a `Dictionary` specifically. Copied in shape from
 * `tests/workflow-guards.test.ts`, which explains why these guards are EXECUTED rather than
 * read: a guard that dereferences an absent object yields null, the job skips, and a skipped
 * job renders as a grey tick that reads as a pass.
 */
const toData = (v: unknown): data.ExpressionData => {
    if (v === null || v === undefined) return new data.Null();
    if (typeof v === "string") return new data.StringData(v);
    if (typeof v === "number") return new data.NumberData(v);
    if (typeof v === "boolean") return new data.BooleanData(v);
    if (Array.isArray(v)) return new data.Array(...v.map(toData));
    return new data.Dictionary(...Object.entries(v as object).map(([key, value]) => ({key, value: toData(value)})));
};

const evaluate = (expr: string, github: unknown, inputs: unknown): boolean => {
    const parser = new Parser(new Lexer(expr).lex().tokens, ["github", "inputs"], []);
    const context = new data.Dictionary(
        {key: "github", value: toData(github)},
        {key: "inputs", value: toData(inputs)},
    );
    return truthy(new Evaluator(parser.parse(), context).evaluate());
};

const REPO = "calvindotsg/portfolio-v2";
const CHECKSUM = "a".repeat(64);

/**
 * The last row is the one this table exists for. A dispatch with the input left blank is the
 * ordinary way to ask for a plan, and it must NOT apply — if `apply`'s guard tested only
 * `event_name == 'workflow_dispatch'`, every plan-only dispatch would write the zone, and the
 * run would look exactly the same either way.
 */
const CONTEXTS: Record<string, {github: unknown; inputs: unknown}> = {
    "weekly drift schedule": {
        github: {actor: "calvindotsg", event_name: "schedule", repository: REPO, ref: "refs/heads/main", event: {}},
        inputs: {},
    },
    "dispatch with no checksum (plan only)": {
        github: {actor: "calvindotsg", event_name: "workflow_dispatch", repository: REPO, ref: "refs/heads/main", event: {}},
        inputs: {checksum: ""},
    },
    "dispatch with a checksum (apply)": {
        github: {actor: "calvindotsg", event_name: "workflow_dispatch", repository: REPO, ref: "refs/heads/main", event: {}},
        inputs: {checksum: CHECKSUM},
    },
    // A dispatch runs against whatever ref the Actions tab was pointed at, and `apply` writes the
    // zone file from THAT ref. The checksum cannot catch it — the plan job computed it from the
    // same branch, so it matches honestly. Only a ref test stops unreviewed DNS reaching the zone.
    "dispatch with a checksum on a feature branch": {
        github: {actor: "calvindotsg", event_name: "workflow_dispatch", repository: REPO, ref: "refs/heads/feat/dns-as-code", event: {}},
        inputs: {checksum: CHECKSUM},
    },
    "same-repo PR touching dns/": {
        github: {
            actor: "calvindotsg", event_name: "pull_request", repository: REPO, ref: "refs/pull/1/merge",
            event: {number: 1, pull_request: {number: 1, head: {repo: {full_name: REPO}}}},
        },
        inputs: {},
    },
    "fork PR touching dns/": {
        github: {
            actor: "someone", event_name: "pull_request", repository: REPO, ref: "refs/pull/2/merge",
            event: {number: 2, pull_request: {number: 2, head: {repo: {full_name: "someone/portfolio-v2"}}}},
        },
        inputs: {},
    },
    "Dependabot PR": {
        github: {
            actor: "dependabot[bot]", event_name: "pull_request", repository: REPO, ref: "refs/pull/3/merge",
            event: {number: 3, pull_request: {number: 3, head: {repo: {full_name: REPO}}}},
        },
        inputs: {},
    },
    // Not listed under `on:`, and here so it stays that way. It carries a `pull_request` object
    // AND runs with secrets available, so a guard written as a deny-list would admit it.
    "pull_request_target": {
        github: {
            actor: "someone", event_name: "pull_request_target", repository: REPO, ref: "refs/heads/main",
            event: {number: 9, pull_request: {number: 9, head: {repo: {full_name: "someone/portfolio-v2"}}}},
        },
        inputs: {checksum: CHECKSUM},
    },
};

/** Exactly which credential-holding jobs should run in each context. `semantics` needs none. */
const INTENDED: Record<string, string[]> = {
    "weekly drift schedule": ["plan"],
    "dispatch with no checksum (plan only)": ["plan"],
    "dispatch with a checksum (apply)": ["plan", "apply"],
    "dispatch with a checksum on a feature branch": ["plan"],
    "same-repo PR touching dns/": ["plan"],
    "fork PR touching dns/": [],
    "Dependabot PR": [],
    "pull_request_target": [],
};

const GUARDED = ["plan", "apply"];

describe("the DNS guards, executed in GitHub's own evaluator", () => {
    it("names an intended outcome for every context", () => {
        expect(Object.keys(INTENDED).sort()).toEqual(Object.keys(CONTEXTS).sort());
    });

    it.each(Object.keys(CONTEXTS))("runs exactly what it should on: %s", (name) => {
        const {github, inputs} = CONTEXTS[name];
        const ran = GUARDED.filter((id) => {
            const guard = WF.jobs[id]?.if;
            if (typeof guard !== "string") throw new Error(`job "${id}" holds credentials and has no if: guard`);
            return evaluate(guard.replace(/^\s*success\s*\(\s*\)\s*&&\s*/, ""), github, inputs);
        });
        expect(ran).toEqual(INTENDED[name]);
    });

    /**
     * CALIBRATION. If the table above were satisfiable by a guard that does nothing, it would
     * prove nothing — so this asserts the contexts actually discriminate: at least one row must
     * flip each guard both ways. A guard hardcoded to `true` or deleted entirely fails here.
     */
    it("has contexts that tell each guard apart from a constant", () => {
        for (const id of GUARDED) {
            const outcomes = Object.keys(CONTEXTS).map((name) => INTENDED[name].includes(id));
            expect(outcomes, `nothing in the table would notice if "${id}" always ran`).toContain(false);
            expect(outcomes, `nothing in the table would notice if "${id}" never ran`).toContain(true);
        }
    });
});

describe("the octoDNS config still asks for the exclusions it documents", () => {
    const processors = CONFIG.zones["calvin.sg."].processors.map((n) => CONFIG.processors[n]);

    it("applies both reject lists to the zone", () => {
        expect(processors.map((p) => p.class).sort()).toEqual([
            "octodns.processor.filter.NameRejectlistFilter",
            "octodns.processor.filter.TypeRejectlistFilter",
        ]);
    });

    it("keeps MX on the type reject list, so Email Routing keeps its records", () => {
        const types = processors.find((p) => p.class.endsWith("TypeRejectlistFilter"))?.rejectlist ?? [];
        expect(types).toContain("MX");
    });

    /**
     * PORTS octoDNS' OWN MATCHING RULE rather than comparing strings: an entry wrapped in `/` is
     * a regex applied with `search`, anything else is an exact name
     * (`octodns/processor/filter.py:124`). Asserting `toContain("cf2024-1._domainkey")` is what
     * this used to do, and it pinned the test to one year's selector just as the config pinned
     * the exclusion — so the assertion agreed with the bug instead of catching it.
     */
    const rejects = (patterns: string[], name: string): boolean =>
        patterns.some((p) => (p.startsWith("/") ? new RegExp(p.slice(1, -1)).test(name) : p === name));

    it("keeps every DKIM selector off the managed set, not just this year's", () => {
        const names = processors.find((p) => p.class.endsWith("NameRejectlistFilter"))?.rejectlist ?? [];
        expect(rejects(names, "cf2024-1._domainkey")).toBe(true);
        // The rotation. Cloudflare moves this on its own schedule, and the old exclusion did not.
        expect(rejects(names, "cf2025-1._domainkey")).toBe(true);
        // The control: a pattern that excluded everything would pass the two above and be useless.
        expect(rejects(names, "www")).toBe(false);
        expect(rejects(names, "battleship")).toBe(false);
    });

    /**
     * THE POLARITY TRAP. `include_target` defaults to true, which is the SAFE value: it drops
     * the record from both sides of the diff, so no Delete can be generated for it. The
     * docstring's own words are that false "allow[s] deletion of existing records". It reads
     * like a tidy-up and it is the difference between excluding the MX records and deleting
     * them. `dns/test_filters.py` executes both polarities; this refuses to ship the wrong one.
     */
    it("never sets include_target to false", () => {
        for (const [name, p] of Object.entries(CONFIG.processors)) {
            expect(p.include_target, `processor "${name}"`).not.toBe(false);
        }
    });

    /**
     * NOT A DEFAULT, AND THE REASON IS NOT DNS. `pagerules` defaults to TRUE, which adds URLFWD
     * to the provider's supported types and makes it read the zone's legacy Page Rules as
     * records it owns — then delete the ones absent from `dns/zones/`. This zone file declares
     * no URLFWD and never will, so on the default the plan proposes deleting the redirect rules,
     * including the one that makes www 301 to the apex. No reject list can defend them: the rule
     * surfaces under the name of the host it matches, so excluding it means unmanaging the www
     * CNAME as well.
     */
    it("keeps pagerules off, so the redirect rules are invisible to octoDNS", () => {
        expect(CONFIG.providers.cloudflare.pagerules).toBe(false);
    });

    it("reads its token from the environment rather than carrying one", () => {
        expect(CONFIG.providers.cloudflare.token).toBe("env/CLOUDFLARE_DNS_TOKEN");
        expect(readFileSync(CONFIG_PATH, "utf8")).not.toMatch(/[0-9a-zA-Z_-]{40,}/);
    });
});

describe("the zone file holds what it claims and nothing it excluded", () => {
    it("keeps the apex pointing at the Pages project", () => {
        const apex = ZONE[""] as Array<Record<string, unknown>>;
        const alias = apex.find((r) => r.type === "ALIAS");
        expect(alias?.value).toBe("calvindotsg.pages.dev.");
    });

    /**
     * www IS NOT A LEFTOVER. It was detached from the Pages project on 2026-07-30 so the
     * redirect rule could answer for it, but the DNS record must remain and must remain PROXIED
     * — an unproxied record would resolve straight past Cloudflare's edge and the redirect
     * would never fire. Deleting this record does not tidy the redirect away; it strands it.
     */
    it("keeps www proxied so the redirect has something to intercept", () => {
        const www = ZONE.www as Record<string, Record<string, Record<string, unknown>>>;
        expect(www.type).toBe("CNAME");
        expect(www.octodns.cloudflare.proxied).toBe(true);
    });

    it("proxies every record that fronts a website", () => {
        for (const name of ["battleship", "diving", "garden", "model", "slickshots", "www"]) {
            const rec = ZONE[name] as {octodns?: {cloudflare?: {proxied?: boolean}}};
            expect(rec?.octodns?.cloudflare?.proxied, `${name}.calvin.sg`).toBe(true);
        }
    });

    /**
     * The excluded records must not appear here even though a reject list would make them inert.
     * A record present in the file but silently unmanaged is worse than one that is simply
     * absent: it reads as the source of truth for something it has no effect on, and the first
     * person to edit it will believe they have changed DNS.
     */
    it("contains none of the records the config excludes", () => {
        expect(Object.keys(ZONE)).not.toContain("_dmarc");
        expect(Object.keys(ZONE)).not.toContain("cf2024-1._domainkey");
        const apex = ZONE[""] as Array<Record<string, unknown>>;
        expect(apex.map((r) => r.type)).not.toContain("MX");
    });

    /**
     * The DMARC record's `rua=` is a personal mailbox and no email address appears anywhere else
     * in this public repository. Excluding it from the zone file is only half the decision — it
     * must not arrive by the back door in a comment or a fixture either. Scoped to an
     * `@`-bearing address so it cannot be satisfied by the absence of the word "mailto".
     */
    it("publishes no email address, which is why _dmarc is excluded at all", () => {
        expect(ZONE_TEXT).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
    });
});

describe("the toolchain is pinned, because the safety argument is about versions", () => {
    it("pins every requirement exactly", () => {
        const lines = REQUIREMENTS.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) expect(line, `"${line}" is not an exact pin`).toMatch(/^[A-Za-z0-9._-]+==[0-9]/);
    });

    it("names octodns and the cloudflare provider", () => {
        expect(REQUIREMENTS).toMatch(/^octodns==/m);
        expect(REQUIREMENTS).toMatch(/^octodns-cloudflare==/m);
    });

    /**
     * ONE HOME FOR THE INTERPRETER. The version that proves the filter semantics must be the one
     * that plans and the one that applies — a proof obtained on 3.13 says nothing about an apply
     * running on whatever `setup-python` resolves by default. This is the same defect the Node
     * version had across `ci.yml` before `tests/workflow-guards.test.ts` closed it.
     */
    it("gives every job the same Python, from the workflow env", () => {
        const pythonSteps = Object.keys(WF.jobs).flatMap((id) =>
            stepsOf(id).filter((s) => s.uses?.startsWith("actions/setup-python")).map((s) => ({id, s})),
        );
        expect(pythonSteps.length).toBe(Object.keys(WF.jobs).length);
        for (const {id, s} of pythonSteps) {
            expect(s.with?.["python-version"], `job "${id}"`).toBe("${{ env.PYTHON_VERSION }}");
        }
        expect(WF.env?.PYTHON_VERSION).toMatch(/^3\.\d+$/);
    });

    /*
     * THE SHA-PIN ASSERTION USED TO LIVE HERE AND IS NOW IN `tests/workflow-guards.test.ts`,
     * which owns cross-workflow properties. It is not a tidying move. "Every action is pinned to
     * a commit" is a property of the repository, and writing it in the DNS suite scoped it to
     * `dns.yml` — so the repository's only such assertion iterated the workflow that touches no
     * production artifact, while `ci.yml`, which deploys the site, and `strava-progress.yml`,
     * which holds `contents: write` and both Strava secrets, had none at all. A repository-wide
     * assertion living in a single-subject suite is how it came to be scoped to one file, and
     * leaving a second copy behind would only recreate the drift one level up. `dns.yml` is
     * still covered, by the directory sweep that replaced this.
     */
});
