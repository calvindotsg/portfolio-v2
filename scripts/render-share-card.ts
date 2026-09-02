/**
 * RENDER A SHARE CARD — a square PNG and the description that goes beside it.
 *
 *   pnpm card:render -- --demo specimen --out .scratchpad
 *   pnpm card:render -- --session <file.json> --out <dir> [--px 2160]
 *
 * RUN IT FROM THE REPOSITORY ROOT. `src/lib/palette.ts` resolves the layout it reads the colour
 * tokens out of by a path relative to the working directory, and `src/lib/share-card.ts` reads the
 * type stack the same way. The script checks and refuses rather than rendering a card in the
 * wrong face.
 *
 * IT RUNS THROUGH THE TOOLCHAIN, NOT THROUGH PLAIN `node`, and that is measured rather than a
 * preference: every module in the `share-card` -> `body-map` -> `palette` chain uses extensionless
 * relative specifiers and one of them imports JSON bare, neither of which Node's ESM resolver
 * handles. Hence `vite-node`.
 *
 * IT MAKES NO NETWORK CALL AND WRITES TO NO PLATFORM. It produces two files in a directory you
 * name; attaching them to anything is done by hand, on purpose.
 *
 * ------------------------------------------------------------------------------------------
 *
 * AND IT REFUSES TO PUBLISH ANYTHING THE PUBLISHER DID NOT PUBLISH.
 *
 * 🔴 THIS IS A REFUSAL, NOT A SCRUBBER. It raises rather than silently removing, because a card
 * or a description that quietly lost a clause is worse than one that never shipped: nobody
 * reviews what was removed.
 *
 * The risk is concrete rather than hypothetical. Both surfaces bind FREE PROSE out of a private
 * training record — `note`, `progressionNote` and `intensity` on {@link Session} — so anything a
 * future editor types into one of those cells reaches a public post.
 *
 * WHY THIS LIVES ON THE SCRIPT AND NOT IN `src/lib/share-card.ts`. The `/design` specimen is
 * invented and cannot leak, and a site build that required the list below would fail on any
 * machine that does not have it — every CI runner included. The refusal belongs on the path that
 * renders REAL sessions, which is this file and only this file.
 *
 * NAMES CANNOT BE CAUGHT BY PATTERN. They need a list, and the list is deliberately NOT in this
 * repository: it lives outside it, git-ignored, so it can never be committed anywhere. If that
 * file is absent this module says so out loud rather than reporting a clean scan.
 *
 * Ported from `bft_card_lib/redact.py`, in a declared-disposable proof of concept that is not
 * kept in sync. `tests/share-card-redaction.test.ts` carries its mutation harness.
 */

import {spawn} from "node:child_process"
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {homedir, tmpdir} from "node:os"
import {join} from "node:path"

import {SPECIMEN} from "../src/data/bft/specimen"
import {
    CARD_PX, cardHtml, cardStrings, shareDescription, type Session,
} from "../src/lib/share-card"

/** Where the protected-name list lives, outside every repository and git-ignored where it sits. */
export const PROTECTED_LIST = join(
    homedir(), "Documents/github/calvindotsg/training-sources/tools/protected.txt",
)

/**
 * WHAT MAY NOT BE PUBLISHED, BY PATTERN.
 *
 * MONEY NEEDS A CURRENCY MARKER. A bare two- or three-digit number is a session code, a rep count
 * or a date here, so matching those plainly would refuse nearly every legitimate card — which is
 * a guard people learn to switch off rather than one that catches anything.
 */
export const PATTERNS: readonly (readonly [string, RegExp])[] = [
    ["money", /(?:\b(?:sgd|usd|aud)\b|\bs?\$)\s*\d/gi],
    ["money-word", /\b(?:fortnight|fortnightly|monthly)\s+(?:rate|fee|payment)/gi],
    ["membership", /\b(?:membership|direct debit|minimum term|joining fee|lock[- ]in|contract term|cancellation fee|referral (?:credit|bonus))\b/gi],
    ["hrv", /\b(?:hrv|heart[- ]rate variability|rmssd|sdnn)\b/gi],
    ["body-comp", /\b(?:body fat|skeletal muscle mass|visceral|evolt|bmi|fat mass|body composition)\b/gi],
    ["weight", /\b\d{2,3}(?:\.\d)?\s?kg\b(?!\s*(?:plate|bar|ball|bag))/gi],
]

/** What a refusal is. It is thrown; there is no code path that returns a scrubbed string. */
export class LeakRefusal extends Error {
    constructor(message: string) {
        super(message)
        this.name = "LeakRefusal"
    }
}

/** One thing that matched, and which class it matched as. */
export type Finding = {kind: string, matched: string}

/**
 * THE PROTECTED NAMES, AND WHETHER THE LIST COULD BE CONSULTED AT ALL.
 *
 * `available: false` is not "no names" — it is "nobody looked", and every caller has to treat the
 * two differently or an absent file reads as a clean scan.
 */
export function protectedNames(): {names: Set<string>, available: boolean} {
    if (!existsSync(PROTECTED_LIST)) return {names: new Set(), available: false}
    const names = new Set<string>()
    for (const raw of readFileSync(PROTECTED_LIST, "utf8").split("\n")) {
        const line = raw.trim()
        if (!line || line.startsWith("#")) continue
        // Entries may be written `kind: value`; the value is what must not be published.
        const value = line.includes(":") ? line.slice(line.indexOf(":") + 1).trim() : line
        if (value.length >= 3) names.add(value.toLowerCase())
    }
    return {names, available: true}
}

/** Everything that matched in one string. An empty list means nothing matched — not that it is safe. */
export function scan(text: string, options: {
    names: ReadonlySet<string>
    patterns?: boolean
    nameCheck?: boolean
}): Finding[] {
    const {names, patterns = true, nameCheck = true} = options
    const found: Finding[] = []
    if (patterns) {
        for (const [kind, rx] of PATTERNS) {
            for (const m of (text ?? "").matchAll(rx)) found.push({kind, matched: m[0]})
        }
    }
    if (nameCheck) {
        const low = (text ?? "").toLowerCase()
        for (const name of names) if (low.includes(name)) found.push({kind: "protected-name", matched: name})
    }
    return found
}

/** Everything, over text that WILL be published. */
export const scanPublished = (text: string, names: ReadonlySet<string>) => scan(text, {names})

/**
 * 🔴 NAMES ONLY, over source fields this renderer does not currently publish.
 *
 * WHY THE TWO CLASSES DIFFER IN REACH, measured rather than assumed:
 *
 * A protected name is another person who did not agree to be anywhere near this. It cannot be
 * caught downstream, and it is the one class where the harm lands on somebody other than the
 * author. So it is refused wherever it appears in the source record, even in a field no layout
 * binds today — because "no layout binds it today" is an accident of the layout rather than a
 * guarantee.
 *
 * The pattern classes are the author's OWN data. Scanning unpublished fields for them refuses
 * real cards over content that provably never leaves: one week's calendar column carried a body
 * composition scan's name, which blocked 2 of 90 legitimate sessions. A guard that cries wolf on
 * 2% of a corpus is one people learn to switch off, so those are scanned over what is actually
 * published, and there only.
 */
export const scanSource = (text: string, names: ReadonlySet<string>) =>
    scan(text, {names, patterns: false, nameCheck: true})

/**
 * EVERY STRING IN THE SESSION RECORD, whether or not today's renderer binds it.
 *
 * 🔴 Scanning only the bound fields makes the guard depend on which fields the layout happens to
 * use. A name typed into a "what it is, as published" cell reaches a public surface ONLY for
 * sessions with no format quote — so a field-by-field guard would pass eighty-nine times and leak
 * on the ninetieth. Scan the record.
 */
export function recordText(session: Session): string {
    const out: string[] = []
    for (const value of Object.values(session as Record<string, unknown>)) {
        if (typeof value === "string") out.push(value)
        else if (Array.isArray(value)) out.push(...value.filter((v): v is string => typeof v === "string"))
    }
    return out.join("\n")
}

/**
 * THE GATE BOTH SURFACES PASS THROUGH. It throws or it returns; there is no third outcome and no
 * scrubbed string.
 *
 * `requireNames` defaults on. Turning it off is for a caller that has already established the
 * list is unavailable and is deliberately proceeding — which nothing in this repository does.
 */
/**
 * BOTH SURFACES AS PUBLISHED TEXT — the card's own words and the description, and NOT the card's
 * markup. See `cardStrings` in `src/lib/share-card.ts` for the measurement that forced the
 * distinction: the card embeds an anatomical drawing, so scanning its HTML scans tens of
 * thousands of path coordinates and a short protected value matches one immediately.
 */
export function publishedText(session: Session): string {
    return [...cardStrings(session), shareDescription(session)].join("\n")
}

export function assertPublishable(session: Session, published: string, options?: {
    names?: ReadonlySet<string>
    namesAvailable?: boolean
    requireNames?: boolean
    where?: string
}): void {
    const supplied = options?.names !== undefined
    const {names, available} = supplied
        ? {names: options!.names!, available: options?.namesAvailable ?? true}
        : protectedNames()
    const where = options?.where ?? "this surface"
    if ((options?.requireNames ?? true) && !available) {
        throw new LeakRefusal(
            `refusing to publish ${where} — the protected-name list is absent (${PROTECTED_LIST}), `
            + "so names were not checked. A clean pattern scan is not evidence of a clean surface.",
        )
    }
    const onSurface = scanPublished(published, names)
    if (onSurface.length) {
        throw new LeakRefusal(`refusing to publish ${where} — `
            + onSurface.map((f) => `${f.kind}: ${JSON.stringify(f.matched)}`).join("; "))
    }
    const inRecord = scanSource(recordText(session), names)
    if (inRecord.length) {
        throw new LeakRefusal(
            `refusing to publish ${where} — a protected name appears in the source record `
            + `(${inRecord.map((f) => f.matched).join("; ")}). It is not on the rendered surface, `
            + "but the record it was built from carries it.",
        )
    }
}

/* ------------------------------------------------------------------------------------------ *
 * THE RENDERER. Everything above is the gate it passes through first.
 * ------------------------------------------------------------------------------------------ */

/**
 * THE CAPTURE SIZE IS DECLARED, NEVER INHERITED, and this is the one figure a renderer like this
 * gets wrong silently.
 *
 * A browser screenshots at the DISPLAY's backing scale, so the same command yields 2160 on a
 * Retina Mac and 1080 headless on a build machine — the same card at half the resolution, soft in
 * a feed, with nothing reporting it. The scale factor is therefore computed from the pixel size
 * the caller asked for and the card's own CSS size, and set explicitly.
 */
const DEFAULT_PX = 2160

/**
 * WHERE THE HEADLESS BROWSER IS, FOUND RATHER THAN PASTED.
 *
 * `CHROME_PATH` wins if it is set, because a machine that keeps its browser somewhere else should
 * not need this file edited. Otherwise the Playwright cache is searched — the inner directory is
 * `chrome-headless-shell-<platform>`, which is easy to guess wrong — and then the two ordinary
 * application paths. It THROWS with every candidate named rather than falling back to something
 * else: a card that did not render is obvious, and one that rendered in another engine is not.
 */
function findBrowser(): string {
    const fromEnv = process.env.CHROME_PATH
    if (fromEnv && existsSync(fromEnv)) return fromEnv
    const candidates: string[] = []
    const cache = join(homedir(), "Library/Caches/ms-playwright")
    if (existsSync(cache)) {
        for (const entry of readdirSync(cache)) {
            if (!entry.startsWith("chromium_headless_shell")) continue
            const versioned = join(cache, entry)
            for (const platform of readdirSync(versioned)) {
                candidates.push(join(versioned, platform, "chrome-headless-shell"))
            }
        }
    }
    candidates.push(
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    )
    const found = candidates.find((path) => existsSync(path))
    if (found) return found
    throw new Error(
        "no headless browser found. Set CHROME_PATH, or install one where this looked:\n  "
        + candidates.join("\n  "),
    )
}

/** One connection to a browser, and the four calls this script makes over it. */
async function capture(html: string, cssPx: number, px: number): Promise<Buffer> {
    const browser = findBrowser()
    const dir = mkdtempSync(join(tmpdir(), "share-card-"))
    const page = join(dir, "card.html")
    writeFileSync(page, html)
    // A fixed port would collide with a second run; the process id is unique among the runs that
    // could overlap, so it picks the port.
    const port = 9500 + (process.pid % 400)
    const child = spawn(browser, [
        `--remote-debugging-port=${port}`, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--no-sandbox", "about:blank",
    ], {stdio: "ignore"})
    try {
        let targets: {webSocketDebuggerUrl: string}[] = []
        for (let attempt = 0; attempt < 100; attempt++) {
            try {
                targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
                if (targets.length) break
            } catch { /* the browser has not opened its port yet */ }
            await new Promise((resolve) => setTimeout(resolve, 100))
        }
        if (!targets.length) throw new Error(`the browser never answered on port ${port}`)
        const socket = new WebSocket(targets[0]!.webSocketDebuggerUrl)
        let id = 0
        const pending = new Map<number, (value: Record<string, unknown>) => void>()
        socket.addEventListener("message", (event) => {
            const message = JSON.parse(String(event.data))
            if (message.id && pending.has(message.id)) pending.get(message.id)!(message.result ?? {})
        })
        await new Promise((resolve) => socket.addEventListener("open", () => resolve(null)))
        const send = (method: string, params: Record<string, unknown> = {}) =>
            new Promise<Record<string, unknown>>((resolve) => {
                const next = ++id
                pending.set(next, resolve)
                socket.send(JSON.stringify({id: next, method, params}))
            })
        await send("Emulation.setDeviceMetricsOverride",
            {width: cssPx, height: cssPx, deviceScaleFactor: px / cssPx, mobile: false})
        await send("Page.enable")
        await send("Page.navigate", {url: `file://${page}`})
        // The card loads no font file, no image and no script, so there is nothing to wait ON —
        // this is slack for layout and paint rather than for a network the card does not use.
        await new Promise((resolve) => setTimeout(resolve, 900))
        const shot = await send("Page.captureScreenshot",
            {format: "png", captureBeyondViewport: false})
        socket.close()
        return Buffer.from(String(shot.data), "base64")
    } finally {
        child.kill()
        rmSync(dir, {recursive: true, force: true})
    }
}

/** `HIIT 000` -> `hiit-000`, so two cards from one block do not overwrite each other. */
const slug = (code: string) =>
    code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card"

/**
 * A SESSION READ OFF DISK IS UNTYPED, so it is checked rather than cast.
 *
 * The compiler cannot see a JSON file, and the one thing it would have caught is exactly the one
 * that matters: a `format`-shaded session carrying a movement list means the card draws a figure
 * from that list while printing that it did not. So the discriminant is checked in both
 * directions, at the boundary where the type stops applying.
 */
export function parseSession(raw: unknown, where: string): Session {
    const fail = (why: string): never => {
        throw new Error(`${where} is not a session: ${why}`)
    }
    if (typeof raw !== "object" || raw === null) return fail("it is not an object")
    const value = raw as Record<string, unknown>
    for (const field of ["code", "progressionCounter", "progressionNote", "intensity", "note",
        "block", "span", "readDate"]) {
        if (typeof value[field] !== "string") fail(`\`${field}\` is missing or is not a string`)
    }
    if (value.shading === "movements") {
        if (!Array.isArray(value.movements)
            || value.movements.some((m) => typeof m !== "string")) {
            fail('`shading` is "movements" and `movements` is not a list of strings')
        }
    } else if (value.shading === "format") {
        if (value.movements !== undefined) {
            fail('`shading` is "format" and it carries a movement list. Those are the two accounts '
                + "of a session's muscles and it may only give one: the card would draw a figure "
                + "from that list while printing that it was shaded from the class type")
        }
    } else {
        fail('`shading` must be "movements" or "format"')
    }
    return value as unknown as Session
}

/** The flags, parsed the way `scripts/fetch-strava-weeks.mjs` parses its own. */
function flag(name: string): string | undefined {
    const at = process.argv.indexOf(`--${name}`)
    return at < 0 ? undefined : process.argv[at + 1]
}

const USAGE = "usage:\n"
    + "  pnpm card:render -- --demo specimen --out <dir>\n"
    + "  pnpm card:render -- --session <file.json> --out <dir> [--px 2160]\n"
    + "run it from the repository root."

async function main(): Promise<void> {
    const out = flag("out")
    const demo = flag("demo")
    const sessionFile = flag("session")
    if (!out || (demo === undefined) === (sessionFile === undefined)) {
        console.error(USAGE)
        process.exitCode = 1
        return
    }
    // The palette and the type stack are read relative to the working directory, so a run from
    // anywhere else would render a card with no colours rather than fail outright.
    if (!existsSync("src/layouts/BasicLayout.astro")) {
        throw new Error("run this from the repository root — the colour tokens and the type stack "
            + "are read out of src/layouts/BasicLayout.astro by a path relative to the working "
            + "directory.")
    }
    const px = Number(flag("px") ?? DEFAULT_PX)
    if (!Number.isFinite(px) || px <= 0) {
        throw new Error(`--px must be a positive number, got ${JSON.stringify(flag("px"))}`)
    }

    let session: Session
    if (demo !== undefined) {
        if (demo !== "specimen") {
            throw new Error(`there is no demo called ${JSON.stringify(demo)}. The only one is `
                + "`specimen`, which is the invented session /design draws.")
        }
        session = SPECIMEN
    } else {
        session = parseSession(JSON.parse(readFileSync(sessionFile!, "utf8")), sessionFile!)
    }

    // THE GATE, BEFORE ANYTHING IS WRITTEN. It throws; there is no scrubbed output.
    assertPublishable(session, publishedText(session), {where: session.code})

    const html = `<!doctype html><meta charset="utf-8">`
        + `<style>html,body{margin:0;padding:0;width:${CARD_PX}px;height:${CARD_PX}px;`
        + `overflow:hidden}</style>`
        + cardHtml(session, {theme: "light"})

    mkdirSync(out, {recursive: true})
    const base = join(out, `share-card-${slug(session.code)}`)
    writeFileSync(`${base}.png`, await capture(html, CARD_PX, px))
    writeFileSync(`${base}.txt`, `${shareDescription(session)}\n`)
    console.log(`${base}.png  ${px}x${px}`)
    console.log(`${base}.txt`)
}

/**
 * ONLY WHEN INVOKED, NEVER ON IMPORT. `tests/share-card-redaction.test.ts` imports the gate above
 * out of this file, and a module that rendered a card as a side effect of being imported would
 * make the suite depend on a browser.
 *
 * 🔴 THE ORDINARY GUARD DOES NOT WORK HERE, AND IT FAILS SILENTLY. The usual test is
 * `import.meta.url === pathToFileURL(process.argv[1]).href`, and under `vite-node` `argv[1]` is
 * VITE-NODE'S OWN BIN — the script path is consumed by its CLI and never reaches the module. So
 * the comparison is false on every real invocation: the first run of this script printed nothing,
 * exited 0, and wrote no files. Measured, not guessed.
 *
 * So the guard asks the question that actually distinguishes the two callers. There are exactly
 * two — this script's CLI and the suite — and the suite identifies itself in the environment.
 */
if (!process.env.VITEST) {
    await main()
}
