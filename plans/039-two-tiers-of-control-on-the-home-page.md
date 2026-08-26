# Plan 039: Give the home page two tiers of control, and retire the icon plate

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md` — **except in this repository, where you must NOT.** That file's status
> table is the reviewer's alone; it says so in its own words, and it is gated in full, so an edit
> from you can redden a branch you cannot then make green. Report your status in the pull request
> body instead and leave the index untouched.
>
> **Drift check (run first)**:
> `git diff --stat 03c8885..HEAD -- src tests uno.config.ts CLAUDE.md`
>
> **RECONCILED AT `03c8885`, 2026-08-26**, after 038 merged (`0e78e22`) and was archived
> (`1f5d620`). What that pass changed is marked **[reconciled]** throughout; the measurements
> table was re-taken on production and is unchanged. Read "What the reconcile found" below
> before step 4 — one of this plan's own knock-ons is already done, one claim about 038 is
> wrong, and one gate fails in a way step 5 does not describe.
>
> **This plan does not stand alone.** It consumes the chip that plan 038 publishes. If
> `uno.config.ts` has no `chip-surface`, `chip` and `chip-icon` shortcuts, or `CONTROLS` in
> `src/content/design.ts` has no chip entries, **STOP** — 038 has not landed and nothing here can be
> executed.
>
> **Do not push, open a pull request, or merge unless the operator has instructed it.** Finish
> every step up to that point.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — the intro card is the one card exempt from the fill gate, it carries the mobile
  hero's contrast machinery, and its rendering is fingerprinted by a gate that will go red on purpose
- **Depends on**: **038**, which publishes the chip and teaches the geometry gate to find a control
  that carries no plate. Hard dependency.
- **Category**: dx
- **Planned at**: commit `f767cf2`, 2026-08-26
- **Decided by the maintainer on 2026-08-26** against measured, rendered alternatives. The decisions
  are in "What was decided" below. Do not re-open them.

## Why this matters

**The home page draws the site's boldest mark nine times.** Seven plated controls in the intro card,
one on each goal card. Measured at 1024x797: the intro card's control row is **339 x 112 over two
lines**, and the copy column it sits in is 339 x 300 against a 275px portrait — so **the buttons, not
the photograph, set the intro card's height**. On a 430px phone the same 112px block sits on top of
the portrait.

**The hierarchy is close to inverted.** Six secondary destinations — **five social profiles and the
résumé PDF**, which is worth saying because "social profiles" is how the rest of this plan reads and
`LINKS` is not that: its sixth entry is `View résumé (PDF)` at `/resume.pdf`, the one internal,
non-social link in the set [reconciled] — are drawn
exactly as loud as each goal card's one action, and louder than `My events`, the way into the site's
signature content, which is a plain underlined link. `uno.config.ts` says in its own words that the
plate is "this site's mark for a 48px styled control", withheld from smaller things so as not to
"dilute the mark". Nine wearers on one screen is that dilution, and `/patches` — which ships zero
plated controls — is the proof the site can do without them.

**And one of the seven is not a destination.** The theme toggle sits *first* in a row of six places
to find Calvin, drawn identically to them. A preference wearing a profile's clothes, in the most
prominent slot in the row.

After this plan the site's vocabulary is **smaller than it is today** and every kind has one
sentence: the plate means *this card's one action*, the chip means *quiet — a member of a set, or a
preference*, and the text link means *a link inside a run of words*.

## What was decided

Rendered as live specimens at the site's own metrics and chosen by the maintainer on 2026-08-26:

1. **`My events` is the intro card's one action** — chosen over the résumé, explicitly. It becomes a
   plated `control-cta`, drawn exactly like the two goal cards' way out.
2. **The six destinations become glyph chips**, one line.
3. **The strip comes first; the action closes the card.** Identity → where to find me → the one way
   in. The deciding argument: strip-first ends the card on *the way further into the site*,
   action-first ends it on *six ways to leave it*. It also matches the two goal cards, where the
   plated action is already the last element — three cards, three plated bars, all at the foot.
   **The accepted cost is focus order**: a keyboard user meets six external links before the card's
   own action, where today `My events` comes first. Neither order breaks SC 2.4.3; this was a
   preference, and it was made knowingly.
4. **The theme chip sits on the greeting line, hard right**, opposite the identity — the same shape
   the page header takes on every other page after 038, and it costs no new row. It is **not** a
   seventh item in the strip: measured, seven 44px boxes with 8px gaps need 356px against a 339px
   column and wrap, stranding the theme on a line of its own.
5. **Every chip is 44px on both axes** (038's decision), so the greeting line becomes 44px tall
   against the taglines' 30px. **That unevenness was measured and accepted** — 44px box: hero row 44,
   taglines 30; 30px box: 30 and 30. The greeting line is a masthead row rather than a line of the
   paragraph, which is the reading that makes it defensible; say so in the component rather than
   leaving it to be rediscovered as a defect.

Rejected, so they are not re-derived: labelling the six destinations (measured — six labels need three
lines in a 339px column); keeping the plate and only moving the toggle (fixes the labelling and none
of the weighting); and a neutral-bordered plate (flattens a card's one action and a social link into
one drawing, and leaves the 112px density untouched).

## What the reconcile found (2026-08-26, at `03c8885`)

038 touched 12 of this plan's 16 in-scope files. Four findings, each measured rather than read:

1. **The intro-card excerpt below is still accurate.** 038 changed exactly one line in
   `IntroCard.astro` and it was a comment. `.intro-type`, `.control-row`, `<ThemeSwitcher/>` and
   `class="control"` are all as quoted.
2. **The measurements table is still accurate**, re-taken on production after 038 shipped: `main`
   829, intro card 728 x 357, control row 339 x 112 with 7 items on 2 lines, portrait 275 x 275,
   document 1698 at 430x932. 038 did not move the home page, which is what it was scoped to avoid.
   *(One instrument warning: `.control-row` has EIGHT element children, not seven — the eighth is
   ThemeSwitcher's own inline `<script>`, which renders at top 0. Count `.control`, or filter the
   script, or you will report a phantom third line.)*
3. **Step 4.2's first knock-on is already done, and its quotation is stale.** It says the `donts`
   list calls `control-surface` "a source-level shortcut the other two compose". 038 already
   rewrote that line to name BOTH surfaces and to say "the boxes compose" — which carries no count,
   so deleting `control` needs no further edit there. Do not go looking for the old sentence.
4. **Step 5.3's claim about 038 is wrong.** It says `.chip-icon` is already on the link-signifier
   allow-list. It is not: 038 put `.chip` there, matched as an exact class token, and the rule
   probe uses `\.chip(?![\w-])` which deliberately excludes `.chip-icon`. The intro card's links
   survive anyway — they take the earlier icon-only branch, having an `sr-only` name and no visible
   text — so this is an imprecise reason for a correct outcome rather than a defect. Confirm it the
   way that step already says to, and do not "fix" the allow-list without a wearer that needs it.

**And one thing step 5 does not describe.** Deleting the `control` shortcut makes the plate route's
own vacuity floor fail — `it("finds the control surface at all, so the assertions below are not
vacuous")` — because `dist/index.html` then carries only `control-cta`, so `iconBoxes()` is EMPTY
and five assertions that loop over it would otherwise pass by looping over nothing. That floor is
038's, and it firing is the gate working exactly as intended. **Step 5 says every gate goes red;
this one is the reason that is true rather than a nuisance** — treat the empty icon population as
the thing to fix (retarget those assertions at the chip strip), never the floor.

*Measured by simulating step 4.1 alone — deleting the shortcut and nothing else — which reddened 11
assertions across five files. That is NOT a prediction of a correct execution: with the markup still
saying `class="control"`, several of those are artifacts of an incoherent intermediate state that
this plan never produces. Two of the five files are in no scope list here —
`tests/design-system.test.ts` and `tests/icon-alignment.test.ts` — and both may well self-heal once
steps 1–4 are done together. **Re-run the full suite after step 4 and add whatever is genuinely red
to the scope list deliberately**, rather than trusting either that figure or this note.*

## Current state

### The intro card today

`src/components/IntroCard.astro` — the copy column is a `justify-between` flex column with two
children:

```astro
<!-- src/components/IntroCard.astro, the copy column -->
<div class="intro-type flex flex-col h-full self-start md:self-auto">
    ... h1 + two taglines ...
    <p class="m-0 mt-2">
        <a href="/patches" class="text-link inline-flex items-center gap-2 min-h-6 text-sm">
            {PATCHES.heading}
            <span class={`${iconClass(NEXT_RACE.icon)} shrink-0`} aria-hidden="true"></span>
        </a>
    </p>
</div>
<div class="control-row">
    <ThemeSwitcher/>
    {LINKS.map(({link, logo, name}) => (<a href={link} target="_blank" class="control">
        <span class={`${iconClass(logo)} shrink-0`} aria-hidden="true"></span>
        <span class="sr-only">{name}</span>
    </a>))}
</div>
```

`.intro-type` carries `h-full` so it absorbs the column's slack; that is why the control row sits at
the foot of the card with no void above it. **Preserve that mechanism** — the first draft of the
specimen for this plan dropped it and opened a 130px hole between the two control groups.

Three classes on that markup exist because the control row wraps rather than counting columns, and
each was measured: `shrink-0` on the portrait's wrapper, `self-start md:self-auto` on `.intro-type`,
and `max-h-full md:max-h-[415px]` on the portrait. **All three are about the row's MAX-content width**
— every control on one line. Six 44px chips at an 8px gap is 304px where seven 64px plates at a 16px
gap were 544px, so the row's maximum SHRINKS by this plan. Re-measure all three rather than assuming
they are still needed, and say what you found; do not delete one on the argument alone.

### Measurements to beat

On the built site at `f767cf2`, and **re-taken on production at `1f5d620` after 038 shipped —
every row below is unchanged** [reconciled]:

| | measured |
|---|---|
| `main` at 1024 wide | 829px |
| intro card at 1024x797 | 728 x 357 |
| copy column | 339 x 300 (type 172, gap 16, control row 112, slack 16) |
| control row | 339 x 112, **7 items over 2 lines** |
| portrait | 275 x 275 |
| free space right of the `My events` link | 251px |
| document at 430x932 | 1698px; intro card 414 x 295; control row 332 x 112, 2 lines |

**The card's height is set by the copy column (300) rather than the portrait (275).** The target of
this plan is that the portrait becomes the binding constraint again.

### Repo conventions this plan must honour

1. **Never restate a value the build already knows** — no hex, rem, class name or count in any
   authored string a reader can see.
2. **A `.astro` comment is scanned by UnoCSS.** A class name — or a CSS property name — written in a
   comment emits a rule nothing wears and the orphan gate fails the build.
3. **A hover style must need a pointer**; a press must be drawn and must outlive the finger. Both come
   free from the shortcuts — do not hand-write either.
4. **Exactly one rule may declare a control's box.**
5. **Every length is font-relative.**
6. **Do not edit `plans/README.md`.**

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Full gate | `pnpm test` | exit 0; it builds first |
| Iterate | `SKIP_BUILD=1 pnpm test <filter>` | reuses `dist/` |
| Preview | `pnpm preview` | serves `dist/` on http://localhost:4321 |
| Regenerate the design docs | `pnpm test:update` | rewrites `DESIGN.md` and `.design-sync/conventions.md` |

## Scope

**In scope**:

- `uno.config.ts` (modify — `control` is deleted)
- `src/content/design.ts` (modify — `CONTROLS` loses `control`)
- `src/pages/design.astro` (modify — the icon-plate specimen goes)
- `src/components/IntroCard.astro` (modify — the subject of this plan)
- `src/components/ThemeSwitcher.astro` (modify — the home page's instance takes the chip box)
- `src/components/EventsLink.astro` (modify — only if step 3 reuses it; see that step)
- `src/layouts/BasicLayout.astro` (modify — `.control-row` becomes the chip strip's rule, or is renamed)
- `public/preview.jpg` (regenerate — **required**, see step 6)
- `tests/control-geometry.test.ts`, `tests/build-output.test.ts`, `tests/content.test.ts`,
  `tests/rendered-html.test.ts`, `tests/card-fill.test.ts`, `tests/page-header.test.ts` (modify as
  each goes red)
- `tests/design-system.test.ts` and `tests/icon-alignment.test.ts` — **admitted to scope by the
  reconcile, conditionally** [reconciled]. Simulating step 4.1 alone reddened both, and neither was
  on this list; that simulation is not a correct execution, so both MAY self-heal once steps 1–4 are
  done together (`design-system` regenerates from `CONTROLS`, and `icon-alignment` reasons about
  which icons sit in a flex container, which the chip strip still provides). Change either only if
  it is genuinely red after step 4, and say in the pull request which of the two you touched and why
- `CLAUDE.md` (modify — the shortcut count and the control vocabulary)
- `DESIGN.md` and `.design-sync/conventions.md` (regenerate — committed snapshots of `CONTROLS`,
  which step 4 changes)

**Out of scope**:

- `src/pages/patches/**`, `src/pages/design.md.ts`, `src/lib/patch-doc.ts` — 038's territory.
- **The two goal cards and `control-cta`.** They already wear the plate correctly and are the reason
  the rule generalises. Do not touch their box, their label or their position.
- **The Now card's 24x24 explainer.** It is a fifth drawing on this page and it is below the target
  size every other control clears — recorded here deliberately, and left for a later plan so this one
  stays reviewable. Do not fold it in.
- **The mobile hero's mask and scrim** (`.portrait`, `.intro-type::after`). This plan changes what
  sits over the portrait, not how the portrait is veiled. If a contrast assertion goes red, that is a
  STOP condition, not an invitation to retune the scrim.
- `src/content/site.ts`'s `LINKS` — the six destinations and their order are content, unchanged.

## Git workflow

- Branch: `advisor/039-two-tiers-of-control-on-the-home-page`
- Work in an isolated worktree, and enter it before reading any file by absolute path.
- Conventional commits, one per step.
- **Do NOT push or open a pull request unless the operator instructed it.**

## Steps

### Step 1: Turn the six destinations into a chip strip

In `src/components/IntroCard.astro`, replace `class="control"` on the mapped `LINKS` anchors with
`class="chip-icon"`. Nothing else about those anchors changes — same `href`, same `target="_blank"`,
same aria-hidden glyph, same `sr-only` name.

Rename `.control-row` to a name that says what it now holds, and move its rule with it. It is declared
in `src/layouts/BasicLayout.astro`'s global block and it is `display: flex; flex-wrap: wrap; gap: 1rem`
— the gap becomes `0.5rem`, which is what fits six 44px boxes in a 339px column (304px against 339;
at 1rem it is 344px and wraps). **Read the long comment above that rule before you touch it**: it
records that the separation can make the row taller but never wider, and that a widened gap pushed a
control past the card's bottom clip edge at 1024x768 with every gate green. A NARROWED gap is the safe
direction, but re-measure rather than trusting that sentence.

**Verify**:
- `pnpm build`, then `pnpm preview`, and with `cmux browser` on `/` at 1024x797: the strip is **one
  line**, six items, and its height equals the chip's declared box.
- `grep -c 'class="control"' src/components/IntroCard.astro` → `0`.

### Step 2: Move the theme control to the greeting line

`ThemeSwitcher` takes a `kind` prop from 038 whose glyph value is `"chip-icon"` — the same value the
page header already passes. The home page's instance moves out of the strip and onto the greeting
line, hard right, and takes that same value; no new prop value is introduced here.

The greeting line becomes a row: the `h1` on the left, the toggle on the right, `justify-content:
space-between`, `align-items: center`. Write the comment that says **why the row is 44px tall while
the taglines are 30px** — the toggle's box is the site's target-size floor, and this line is a
masthead row rather than a line of the paragraph. That unevenness was measured and accepted by the
maintainer; a future reader must find the reason here rather than filing it as a defect.

**`ThemeSwitcher` keeps its ARIA contract**: `aria-pressed`, the state-independent `THEME_TOGGLE.name`
in an `sr-only` span, both glyphs, its glyph-swapping style and its script. Only the box class
changes. Three assertions in `tests/content.test.ts` pin that name, and the file's own comment records
the measured screen-reader survey behind the choice.

**Verify**:
- `pnpm build`, then on `/`: exactly one theme toggle, it is inside the greeting row and not inside
  the strip, and it wears the chip's glyph box and not the plate.
- The strip holds exactly `LINKS.length` items.

### Step 3: Make `My events` the card's one action, and put it last

Replace the `text-link` paragraph with a plated `control-cta` carrying `PATCHES.heading` and
`NEXT_RACE.icon`, and **place it after the strip** in DOM order so it closes the card. That order is
the maintainer's decision and it is also the focus order — do not reorder visually with `order` or
`flex-direction: row-reverse`; the DOM sequence and the visual sequence must agree (SC 1.3.2, 2.4.3).

`src/components/EventsLink.astro` already renders `class="events-link control-cta"` with a label and
that same mark, and it carries a measured argument for wrapping its label in a span rather than
leaving a bare text node. **Prefer reusing it** over writing a second CTA: if its props allow a
caller-supplied `href` and label, use it; if they do not, widen them minimally and say so. If widening
it would change what the goal cards render, STOP and report — the goal cards are out of scope.

The CTA leaves `.intro-type`. That is required, not cosmetic: below `md` the scrim is a
pseudo-element of `.intro-type` and stretching that column drags it across the portrait — measured at
97.55% of the photo veiled against 81.63%. Keep `.intro-type` holding the type only, and keep its
`h-full` so it goes on absorbing the column's slack.

**Verify**:
- `pnpm build`, then on `/`: `main` has the same number of children as before; the copy column's
  children are, in order, the type block, the strip, the CTA.
- The CTA's label is `PATCHES.heading` — the same words the page it opens is headed with.
- `grep -c "text-link" src/components/IntroCard.astro` → `0`.

### Step 4: Retire the icon plate

Nothing wears `control` any more: the six links are chips, the toggle is a chip, and 038 already made
the header's controls chips.

1. Delete the `control` shortcut from `uno.config.ts`. **Confirm it is orphaned first** —
   `grep -rn 'class="[^"]*\bcontrol\b' src/` must return nothing before you delete it, and remember
   that `control-cta` and `control-surface` are different tokens that must survive.
2. Delete its entry from `CONTROLS` in `src/content/design.ts` and its specimen from
   `src/pages/design.astro`. **One knock-on left in the same module, not two** [reconciled]: the
   `donts` sentence about `control-surface` was rewritten by 038 to name both surfaces and to say
   "the boxes compose", which carries no count and needs no further edit — do not go hunting for
   the old wording. What remains is to re-read `SECTIONS.controls.lede`, also 038's, and check it
   is still true of the smaller set. **And mind the ORDER**: deleting the shortcut without deleting
   this entry leaves the generated documents promising a class the sheet no longer has, which
   reddens `tests/design-system.test.ts` in between. Do both, then run `pnpm test:update` and commit
   the two regenerated documents — `DESIGN.md` and `.design-sync/conventions.md` are committed
   snapshots of `CONTROLS`, and the "guaranteed present" line inside them is derived, so never
   hand-edit either.
3. `CLAUDE.md`'s shortcut count drops by one and the vocabulary list loses the plate's icon box.
   Derive the number from `uno.config.ts`; never type it.

**If `control` turns out to still have a wearer**, stop and report which — the plan's premise is that
this class is empty, and a survivor means either 038 did not land as specified or something on the
site was missed.

**Verify**:
- `pnpm test` → the orphan-rule gate in `tests/build-output.test.ts` passes, which is the gate that
  would have caught a rule with no wearer, and the class-token gate passes, which is the one that
  catches a class with no rule. Both directions matter here.
- `grep -c '"control":' uno.config.ts` → `0`.

### Step 5: Make the gates cover the new shape

Each of these is red after steps 1–4 and each needs a real fix rather than a loosened assertion.

1. **`tests/control-geometry.test.ts`** reads `dist/index.html` and discovers controls by the plate's
   signature. After this plan the home page has **two plated controls** (the goal cards' CTAs) and
   **seven chips**. Its `controlRow()` helper requires every rendered child of the row to BE a
   discovered control and requires all discovered icon controls to share one parent — both are false
   now. Retarget the row assertions at the chip strip, keep the minimum-width argument (it is the
   reason the row wraps rather than counting columns), and keep the assertion that every rendered
   child of the strip is a control of one kind.
2. **The "one icon control per social link, plus the theme toggle" count** is now "one chip per social
   link", with the toggle outside the strip. Change what it counts; keep it counting.
2b. **The plate route's VACUITY FLOOR fails, and that is the load-bearing failure of this step**
   [reconciled]. `it("finds the control surface at all, so the assertions below are not vacuous")`
   goes red because `dist/index.html` then carries only `control-cta`, leaving `iconBoxes()` EMPTY —
   and five assertions loop over that population, so without the floor they would all pass by
   iterating over nothing. **The fix is to retarget those five at the chip strip, never to relax the
   floor.** A green suite reached by deleting the only thing that noticed the emptiness is the exact
   defect this repository names most often.
3. **`tests/build-output.test.ts`**'s link-signifier gate: the intro card's anchors move from
   `.control` to `.chip-icon`. **038 did NOT put `.chip-icon` on that allow-list** [reconciled] — it
   put `.chip`, matched as an exact class token, and the rule probe's `\.chip(?![\w-])` excludes the
   glyph box on purpose. The anchors pass anyway, via the icon-only branch, because each has an
   `sr-only` name and no visible text. So the outcome is right and the stated reason was wrong;
   confirm which branch is carrying them, and add `.chip-icon` to the allow-list only if you create
   a wearer that needs it. Two more gates in this file also read `.control` — the plate-paint pair —
   so check the whole file rather than this one assertion.
4. **`tests/card-fill.test.ts`** exempts exactly one card and asserts it is the intro card. That
   should be unaffected; if it is not, you have changed the card's fill behaviour and must say how.
5. **`tests/page-header.test.ts`**, the suite 038 creates. The home page still carries no `<header>`,
   so that half is unchanged. If any assertion in it discriminates the toggle's box by naming the
   plate, re-express it against the glyph chip's signature in the shipped stylesheet — **do not delete
   or loosen it.** It is the gate that stops the header's toggle and the home page's toggle being
   swapped, and 038 was written so this retarget is a rewording rather than a rescue.
6. **`tests/rendered-html.test.ts`** — "renders an anchor for every configured link", "labels every
   control from its own content", "nests no interactive content inside an anchor". Expect the first to
   pass unchanged and check the other two against the new markup.

Add one assertion this shape needs and nothing currently has: **the theme toggle is not inside the
strip, and the strip's item count equals `LINKS.length`** — so a future edit that quietly puts a
seventh box in the row is caught, which is the exact defect the 356px measurement predicts.

**Verify**: `pnpm test` → all pass. Report the new total in the pull request body; **write no absolute
suite count into any file.**

### Step 6: Regenerate `public/preview.jpg` — this is required, not optional

`tests/content.test.ts` fingerprints what the intro card depicts — the h1 stack, the greeting mark,
**the link out to the wall**, the social glyphs in order, and the portrait's bytes — precisely so that
changing any of them reddens the suite until the hero is regenerated. This plan changes the link out
to the wall and the social glyphs' drawing, so **that gate will go red on purpose**.

`public/preview.jpg` is both README's hero and the site's `og:image`. It has gone stale invisibly
twice. The regeneration recipe sits beside the gate and is acceptance criteria rather than advice: a
regeneration that cannot reproduce the composition is recomposing the hero, not refreshing it. Follow
it, and put the before/after images in the pull request body.

**Verify**: `pnpm test` → `tests/content.test.ts` passes, and the new image is committed.

### Step 7: Measure what moved, in a browser

`pnpm build && pnpm preview`, then with `cmux browser`, on `/`:

| Viewport | Root font-size | Record |
|---|---|---|
| 1024 x 797 | 16 | `main` height, intro card box, copy column box, strip box and line count, portrait box |
| 1440 x 900 | 16, 20 | intro card box; nothing clipped at the card's bottom edge |
| 430 x 932 | 16, 24 | document height, intro card box, strip line count, and **whether any chip overlaps the portrait's face** |
| 320 x 700 | 16, 24, 32, 40 | `document.documentElement.scrollWidth - clientWidth` is 0 |

Put every figure beside the "Measurements to beat" table in the pull request body. **The claim to
test is that the copy column now measures less than 275px at 1024, so the portrait sets the card's
height again** — if it does not, say so plainly rather than reporting the pieces and leaving the
conclusion implied.

Also check, in both themes: the strip's chips are drawn identically to the wall's filter chips and to
the page header's chips, and the two goal-card CTAs are unchanged.

### Step 8: Say what the vocabulary now is

`CLAUDE.md`'s Styling System section: the shortcut count (derived, never typed), and the list of the
site's kinds of control with **one sentence each** —

- the plate at the width of its container: *this card's one action*
- the chip, labelled: *a quiet control that names itself*
- the chip, glyph: *one of a set, or a preference*
- the text link: *a link inside a run of words*

Add the rule that makes it hold: **the plate is spent on a card's single action and nothing else**.
Do not add a count of wearers — that is a number that rots.

**Verify**: `pnpm check && pnpm eslint && pnpm test` → all three exit 0.

## Test plan

No new suite. This plan retargets existing gates rather than adding a class of assertion, and the one
new assertion it does add (step 5) belongs in `tests/control-geometry.test.ts` beside the row's
existing minimum-width argument.

Every retargeted assertion must keep its **non-vacuity floor** — several of these gates have been
found checking nothing, and the comments record which. When you change what an assertion counts, check
that its floor still fails on an empty population.

**One mutation proof is required** and it is the plan's own premise: after step 5, put a seventh box
in the chip strip and confirm `pnpm test` goes RED; remove it and confirm green. Report both runs.

## Done criteria

- [ ] `pnpm check` exits 0; `pnpm eslint` exits 0; `pnpm test` exits 0
- [ ] `grep -c '"control":' uno.config.ts` → `0`, and `control-cta` and `control-surface` both survive
- [ ] `grep -rn 'class="[^"]*\bcontrol\b' src/` → no matches for the bare token
- [ ] `grep -c "text-link" src/components/IntroCard.astro` → `0`
- [ ] On the built home page: exactly two plated controls (the goal cards'), `LINKS.length` chips in
      the strip, one theme chip outside it
- [ ] The copy column's children are, in DOM order: type block, strip, CTA
- [ ] `public/preview.jpg` regenerated and committed; `tests/content.test.ts` green
- [ ] Adding a seventh box to the strip turns `pnpm test` RED; removing it turns it green — both runs
      reported
- [ ] The step 7 sweep reports 0 horizontal document overflow at 320px out to a 40px root
- [ ] `CLAUDE.md`'s shortcut count equals `Object.keys(unoConfig.shortcuts).length` spelled out
- [ ] `DESIGN.md` and `.design-sync/conventions.md` regenerated and committed; their diff shows only
      the removed control entry and the derived guaranteed-present line
- [ ] No file outside the "In scope" list is modified; `plans/README.md` untouched

## STOP conditions

- 038 has not landed — no chip shortcuts, or no chip entries in `CONTROLS`.
- `control` still has a wearer when you come to delete it (step 4).
- `tests/mobile-hero-contrast.test.ts` goes red. That suite recomputes the mobile hero's contrast from
  the built stylesheet, and its floor is a property of the theme tokens rather than of this
  photograph. A chip that fails it is a chip whose ground is wrong — report it; do not retune the
  scrim, which is out of scope.
- Widening `EventsLink`'s props would change what the goal cards render (step 3).
- The intro card's three measured classes — `shrink-0` on the portrait wrapper, `self-start
  md:self-auto` on `.intro-type`, `max-h-full md:max-h-[415px]` on the portrait — turn out to be
  load-bearing in a way this plan did not predict. Report the measurement; do not delete one on the
  argument alone.
- The copy column does NOT drop below the portrait's height at 1024 (step 7). The plan's central claim
  is that it does; if it does not, the height saving this plan promises is not there and the maintainer
  should hear that before the rest lands.
- `pnpm test` fails twice on the same assertion after a reasonable fix attempt.

## Maintenance notes

- **The rule is now one sentence: the plate is a card's single action.** Three cards, three plates. The
  moment a fourth plate appears on the home page, the rule has been broken and the vocabulary starts
  drifting back to where it was.
- **The strip holds six because six fit.** Seven 44px boxes need 356px against a 339px column and
  wrap, stranding the last one. That is why the theme control is on the greeting line and not in the
  row, and step 5's assertion is what stops someone putting it back.
- **The greeting line is deliberately taller than the taglines.** It is a masthead row carrying a
  control at the site's target-size floor, not a line of the paragraph. The measurement and the
  decision are in the component; do not "fix" the leading by shrinking the toggle below the floor.
- **`public/preview.jpg` is a render of this card and nothing builds it.** Any future change to the h1
  stack, the greeting mark, the way out or the social glyphs reddens the fingerprint gate on purpose.
  That is the mechanism working.
- **What a reviewer should scrutinise**: that the DOM order and the visual order agree; that
  `ThemeSwitcher`'s ARIA is untouched; that the retargeted gates kept their non-vacuity floors; and
  that the step 7 figures actually support the claim that the portrait sets the card's height again.

### Deferred, with reasons

- **The Now card's 24x24 explainer** — a fifth drawing on this page, below the target size every other
  control clears. Left out to keep this plan reviewable; it is the obvious next one.
- **The theme toggle's visible label.** SC 2.5.3 requires the accessible name to contain the visible
  label, and the name here is deliberately "Dark theme". The idea worth revisiting is fixing the glyph
  to a moon, labelling it with `THEME_TOGGLE.name` so the two names are one string, and letting the
  chip's own filled state carry `aria-pressed` — which would make the toggle's state visible for the
  first time. It costs a mark from the census and a rewrite of the glyph-swapping style.
- **The résumé's visibility.** It stays a glyph among six. The maintainer chose `My events` as the
  card's one action knowing this; if the résumé's prominence becomes a problem, the cheap answer is
  its position in `LINKS`, not a second plate.
