/**
 * RE-VENDOR THE ANATOMY FROM THE MIT UPSTREAM. Run by hand, never by a build.
 *
 *   node src/lib/anatome/refresh.mjs [--root <path to the upstream checkout>]
 *
 * The default root is the `opensrc` cache. `opensrc path HichamELBSI/react-native-body-highlighter`
 * repopulates it; this script exists so the conversion beside it is REPRODUCIBLE rather than a
 * one-time hand edit — see README.md for why the result is a copy and not a cache read.
 *
 * IT REFUSES RATHER THAN WRITING A PARTIAL SET. Every extraction below is checked before
 * anything is written, because a silently-empty `outline` or a dropped slug would render a
 * figure that is merely wrong rather than obviously broken, and nothing downstream can tell the
 * difference between a muscle nobody lit and a muscle nobody vendored.
 */

import {mkdirSync, readFileSync, writeFileSync} from "node:fs"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_ROOT = join(
    process.env.HOME ?? "",
    ".opensrc/repos/github.com/HichamELBSI/react-native-body-highlighter/main",
)

const rootFlag = process.argv.indexOf("--root")
const ROOT = rootFlag < 0 ? DEFAULT_ROOT : process.argv[rootFlag + 1]

function read(relative) {
    try {
        return readFileSync(join(ROOT, relative), "utf8")
    } catch {
        throw new Error(
            `cannot read ${relative} under ${ROOT}. The upstream cache is empty or moved — run `
            + "`opensrc path HichamELBSI/react-native-body-highlighter`, or pass --root.",
        )
    }
}

/**
 * ONE `assets/body*.ts` FILE AS DATA.
 *
 * The upstream module is `import {BodyPart} from ".."` followed by `export const … = [ … ]`, and
 * neither the import nor the type annotation resolves here — which is why the vendored form is
 * JSON rather than a copy of the `.ts`. The array literal itself is ordinary JavaScript, so it
 * is evaluated as an expression: a parser for a subset of object-literal syntax would be a
 * second thing to keep correct for no gain over the file this repository already trusts enough
 * to draw with.
 *
 * `color` IS DROPPED. Upstream carries a default fill per entry; this site's renderer takes both
 * colours from its caller and never reads one, so vendoring it would put thirty-five literal
 * hexes in the tree that nothing resolves — values with no reader, which is the defect the whole
 * palette chain exists to prevent.
 */
function entries(relative) {
    const text = read(relative)
    const literal = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)
    const parsed = new Function(`return ${literal}`)()
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(`${relative} yielded no entries — its shape changed upstream.`)
    }
    return parsed.map(({slug, path}) => {
        if (!slug || !path) throw new Error(`${relative} has an entry with no slug or no path.`)
        return {slug, path}
    })
}

/**
 * THE TWO viewBoxes AND THE TWO SILHOUETTE OUTLINES, out of the React wrapper.
 *
 * The viewBoxes are a JS ternary rather than an attribute, so a `viewBox="…"` search finds
 * nothing upstream and that is not drift. THE OUTLINES ARE TWO PATHS, NOT ONE — front and back
 * are separate `<Path>` elements told apart by their own accessibility labels, which is the only
 * anchor in that file naming which side it draws. The `d` is the first attribute and the label
 * the last, so the match runs between them.
 */
function wrappers() {
    const text = read("components/SvgMaleWrapper.tsx")
    const box = /side === "front" \? "([^"]+)" : "([^"]+)"/.exec(text)
    if (!box) throw new Error("no front/back viewBox ternary in components/SvgMaleWrapper.tsx.")
    const outlines = {}
    const anchored = /d="([^"]+)"[\s\S]{0,160}?accessibilityLabel="male-body-outline-(front|back)"/g
    for (const m of text.matchAll(anchored)) outlines[m[2]] = m[1]
    for (const side of ["front", "back"]) {
        if (!outlines[side]) {
            throw new Error(`no ${side} silhouette outline in components/SvgMaleWrapper.tsx.`)
        }
    }
    return {
        front: {viewBox: box[1], outline: outlines.front},
        back: {viewBox: box[2], outline: outlines.back},
    }
}

function write(name, data) {
    mkdirSync(HERE, {recursive: true})
    writeFileSync(join(HERE, name), `${JSON.stringify(data, null, 2)}\n`)
    console.log(`wrote ${name}`)
}

const paths = {male: {front: entries("assets/bodyFront.ts"), back: entries("assets/bodyBack.ts")}}
write("body-paths.json", paths)
write("body-wrappers.json", wrappers())
writeFileSync(join(HERE, "LICENSE"), read("LICENSE"))
console.log("wrote LICENSE")
console.log(`re-vendored from ${ROOT}`)
