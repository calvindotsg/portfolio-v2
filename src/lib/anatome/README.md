# Vendored anatomy

Muscle path data for the share card's body map. Third-party, MIT, and **copied rather than
read from a cache** — the reason is below and it is the whole point of this directory.

## What is here, and where each file came from

| File | Source upstream | Converted how |
|---|---|---|
| `body-paths.json` | `assets/bodyFront.ts`, `assets/bodyBack.ts` | the array literal evaluated as data; `slug` and `path` kept, `color` dropped |
| `body-wrappers.json` | `components/SvgMaleWrapper.tsx` | the two viewBoxes out of the `side === "front" ? … : …` ternary, and the two silhouette outlines out of the `<Path>` elements their own accessibility labels name |
| `LICENSE` | `LICENSE` | copied verbatim |

Upstream is [`HichamELBSI/react-native-body-highlighter`](https://github.com/HichamELBSI/react-native-body-highlighter),
MIT, © 2022 ELABBASSI Hicham. Vendored 2026-09-03.

`refresh.mjs` re-derives all three:

```sh
node src/lib/anatome/refresh.mjs [--root <path to the upstream checkout>]
```

It defaults to the `opensrc` cache and refuses rather than writing a partial set. Run it only
when deliberately taking an upstream change — nothing in a build runs it.

## Why a copy and not a cache read

The proof of concept this was ported from read `~/.opensrc` directly. That cache measured
7.9 GB on 2026-09-02 and `mac-upkeep` runs weekly against user caches, so a cleared cache
would have broken the renderer **silently**: the map would have failed to draw with nothing
in the tree explaining why. The same reasoning applies here identically, and it applies
harder — this repository is public and is checked out by people whose machines have no such
cache at all.

## The conversion, and the two things it deliberately changes

**`color` is dropped.** Upstream carries a default fill per entry. `src/lib/body-map.ts`
takes both colours from its caller and reads none, so vendoring the fills would put
thirty-five literal hexes in the tree that nothing resolves.

**The `.ts` files are converted, not copied.** They open with `import { BodyPart } from ".."`,
which does not resolve here, and carry a type annotation this repository has no declaration
for. JSON is the form that has neither problem.

## What was NOT taken, and must never be

The same paths are redistributed by [`Rippy1911/anatome`](https://github.com/Rippy1911/anatome)
under Apache-2.0. **They are taken from the MIT original instead**, on evidence: Anatome's own
terms document records, in its second section, that the anatomical SVG paths are MIT,
© Hicham El Boussarghini, originally from this upstream. Taking them from here rather than from there removes an Apache
`NOTICE` a redistributor must reproduce — one that carries a separate commercial product's
advertising — from a public MIT repository, for exactly the same pixels.

So: **no Apache text belongs in this directory**, and a test asserts there is none. Anatome's
bundled exercise photography must never be vendored anywhere — its own terms say the origin is
unverified and it is not cleared for redistribution. The female figure upstream ships is also
not here: the card draws the male figure, and adding a second is a separate decision rather
than a free copy.
