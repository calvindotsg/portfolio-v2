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

**The `.ts` files are converted, not copied.** They open with an import that does not resolve
here and carry a type annotation this repository has no declaration for. JSON is the form that
has neither problem.

## The one rule this directory is gated on

**Every file here comes from the MIT upstream named above, and no other project's licence text
may appear in this directory.** `tests/body-map.test.ts` asserts that, and it asserts it by
searching for the other licence's own name — which is why this document states the rule rather
than quoting it, and why the argument FOR the rule is written down where the gate cannot reach:
the "Vendored third-party data" section of the root `README.md`, and the share-card block in
`CLAUDE.md`.

The short version. A second project redistributes these same paths under terms obliging a
redistributor to reproduce a notice that carries a separate commercial product's advertising.
Its own terms record that the paths are not its work — they are MIT, © Hicham El Boussarghini,
originally from the upstream named above. Taking them from the original sheds that obligation
for exactly the same pixels, which is why the decision runs this way round and why reversing it
is not a free copy.

## What was NOT taken, and must never be

**That other project's bundled exercise photography.** Its own terms say the origin is
unverified and it is not cleared for redistribution, and it is not upstream either. Its
exercise catalogue is deliberately absent too: fuzzy-matching the studio's vocabulary against
it was measured at 13 hits against 26 misses with several actively wrong, which is the failure
`src/data/bft/aliases.ts` exists to close.

**The female figure.** Upstream ships one; this vendors the male figure only, because that is
what the card draws. Adding a second is a separate decision rather than a free copy.
