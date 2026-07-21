# Plan 008: Serve the portrait at device resolution

> Raised from a production PageSpeed Insights report, not from the 2026-07-21
> audit. Written and executed together, so this file is a record of the change
> and its evidence rather than instructions for an executor.

## Status

- **Priority**: P2
- **Effort**: XS
- **Risk**: LOW — additive. The 1x asset keeps its content hash, so a DPR-1
  visitor downloads byte-identical bytes to what production serves today.
- **Depends on**: 002 (build-emitted assets) and 004 (which removed the inert
  `sizes` attribute this change would otherwise have conflicted with).
- **Category**: correctness / performance
- **Raised at**: commit `3f45874`, 2026-07-21

## The finding

PageSpeed Insights, Best Practices → *"Serves images with low resolution"*:

| | |
|---|---|
| URL | `/_astro/me.D44fd81e_1hBdqr.webp` |
| Displayed size | 275 × 275 |
| Actual size | 275 × 275 |
| **Expected size** | **413 × 413** |

`src/assets/me.webp` is **1000 × 1000**. The pixels were always there — the
`<Image>` call simply never asked for them:

```astro
<Image src={portfolioImage} width="275" height="275" format="webp" … />
```

One candidate, no `srcset`. Every screen got the 275 px bitmap, so a DPR-2 phone
painted it into a 550 px box and it rendered soft. This is invisible to
`pnpm build`, to `pnpm check`, and to the 48 assertions in `tests/` — all of
which passed while it was live.

The portrait is `loading="eager"` and is the visual centrepiece of the page, so
this is the one image on the site where softness is most visible.

## The change

`src/components/IntroCard.astro`:

```diff
                     width="275"
                     height="275"
+                    densities={[2]}
                     format="webp"
```

Emitted markup:

```html
<img src="/_astro/me.D44fd81e_1hBdqr.webp"
     srcset="/_astro/me.D44fd81e_1iSPVs.webp 2x"
     … width="275" height="275">
```

| asset | dimensions | bytes | fetched by |
|---|---|---|---|
| `me.D44fd81e_1hBdqr.webp` | 275 × 275 | 8,892 | DPR 1 |
| `me.D44fd81e_1iSPVs.webp` | 550 × 550 | 20,860 | DPR ≥ 1.5 |

550 ≥ the 413 Lighthouse asked for, so the audit is satisfied with margin.

### Why `densities` and not `widths`

`widths` requires a `sizes` attribute describing the layout. Plan 004 deleted a
`sizes` attribute from this exact element precisely because it was inert without
`widths`, and re-introducing the pair would mean encoding the bento breakpoints
into a media-query string that must then be kept in sync with the class list by
hand. The portrait is laid out at a **fixed** 275 px at every breakpoint, so the
only axis that varies is device pixel ratio — which is what `densities` is for.

### Why 2x and not `[1.5, 2]` or `[2, 3]`

- `[1.5, 2]` emits a third asset (413 px) so that DPR-1.5 screens save ~7 KB.
  Almost no device is exactly 1.5; not worth a third build artifact.
- 3x would need 825 px, which the source can supply, but at roughly 40 KB it
  more than doubles the cost for a difference no one can see on a 275 px element.

### The byte cost, stated honestly

`dist/` grows 592 KB → 616 KB. A retina visitor downloads **+11,968 bytes** for
the portrait (20,860 instead of 8,892) — they fetch the 2x candidate *instead
of*, not in addition to, the 1x. A DPR-1 visitor downloads nothing new: the `src`
hash is unchanged.

## Also in this change

`src/components/IntroCard.astro:16` mapped `(item, index)` while never using
`index` — the repository's only eslint warning, and one **no plan owned**
(plan 005's scope excludes `src/components/`, and plan 006 touches this file only
to remove the `astro-icon` import). Since this change already opens the file, the
parameter is dropped here. `pnpm eslint` now reports zero problems, which is the
end state plan 007 expects.

## Test

One assertion added to `tests/build-output.test.ts`, bringing the suite to **49**.
It asserts *pixels*, not markup, using `sharp` — already a direct dependency and
resolvable from the project root.

```ts
const candidate = (img?.getAttribute("srcset") ?? "").match(/(\S+)\s+2x/)?.[1];
expect(candidate, "the portrait must offer a 2x srcset candidate").toBeTruthy();
expect(existsSync(`dist${candidate}`)).toBe(true);
const {width: emitted} = await sharp(`dist${candidate}`).metadata();
expect(emitted, "the 2x candidate must carry twice the layout pixels").toBe(width * 2);
```

**Mutation-tested three ways**, each turning exactly this test red and no other:

| mutation | result |
|---|---|
| delete `densities={[2]}` | `expected undefined to be truthy` |
| `densities={[4]}` (1100 px — upscales past the 1000 px source) | `expected undefined to be truthy` |
| assert `width * 3` instead of `width * 2` | `expected 550 to be 825` |

The second mutation is the load-bearing one. **Astro silently discards a density
that would upscale the source**, so raising the layout width past 500 px would
delete the `srcset` and revert this fix *with a completely green build*. That is
the same class of silent failure as every regression that has reached calvin.sg.
The third mutation proves the `sharp` call really reads the emitted file rather
than passing vacuously on `undefined`.

## Verification

- `pnpm check` → 0 errors, 0 warnings
- `pnpm eslint` → **0 problems** (was 1 warning)
- `pnpm test` → 49 passed (was 48)
- `pnpm build` → exit 0

## Noted, deliberately not changed

`max-h-[415px]` on the portrait is dead. The element is `w-auto` with a 275 px
intrinsic width and no CSS height, so it renders at 275 px and the 415 px cap is
never approached. Making the portrait genuinely 415 px tall would be a **design**
change to a page nobody asked to redesign, and it is not what PageSpeed flagged —
Lighthouse measured the displayed size at 275 and asked only for more pixels
inside it. Left alone; recorded here so the next reader does not have to
re-derive it.
