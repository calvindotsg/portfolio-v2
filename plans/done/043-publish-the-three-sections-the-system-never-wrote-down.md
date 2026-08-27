# Plan 043: Publish the three sections the system never wrote down

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving to the next step. If anything in the "STOP conditions"
> section occurs, stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md` — **except in this repository, where you must NOT.** That file's status
> table is the reviewer's alone; it says so in its own words, and it is gated in full, so an edit
> from you can redden a branch you cannot then make green. Report your status in the pull request
> body instead and leave the index untouched.
>
> **Drift check (run first)**:
> `git diff --stat 71bc7e1..HEAD -- src tests CLAUDE.md DESIGN.md .design-sync`
> If any file named in "Scope" changed, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.
>
> **This plan does not stand alone.** It adds three entries to `SECTIONS`, and until plan 040 has
> landed a new section reaches `/design` and none of the three generated documents, with a green
> suite — measured. If `tests/design-system.test.ts` has no gate asserting that every entry of
> `SECTIONS` reaches `renderDesignDoc("full")`, **STOP**.
>
> **Do not push, open a pull request, or merge unless the operator has instructed it.** Finish
> every step up to that point.

## Status

- **Priority**: P2
- **Effort**: M — the work is almost entirely writing, and the writing is the hard part.
- **Risk**: LOW mechanically, MED editorially. Nothing structural changes; the risk is shipping
  guidance that restates what the code already says, which is the failure mode this module's own
  header names.
- **Depends on**: **040** (hard — see the STOP above). Sequenced after **042**, which redraws the
  page; a section added before the redraw would have to be drawn twice. Executing before 042 is
  possible but wasteful, and creates a merge conflict in `src/pages/design.astro`.
- **Category**: docs
- **Planned at**: commit `71bc7e1`, 2026-08-26
- **Baseline**: re-measure `pnpm test` on your own branch point. Do not quote a total from here.

## Why this matters

`src/content/design.ts` describes this design system in four sections: Colour, Type, Controls,
Marks. **The two things this site has argued hardest about are in none of them, and a third
subject it holds itself to is in none of them either.**

**Interaction.** The repository's most emphatic rules are about hover and press, and every one of
them exists because a defect shipped:

- A hover style must need a pointer to produce it. A touch browser applies `:hover` on tap and
  holds it until the reader taps elsewhere, so every `hover:` utility is emitted inside
  `@media (hover: hover)` by a preset that **must stay above `presetWind3`** or it silently emits
  nothing.
- A press must be drawn, and it must snap. Both control surfaces transition `color` over 300ms, so
  a bare press ink ramps: measured at **8.5% of the delta at a 50ms tap and 36.7% at 90ms**. That
  is why `active:transition-none` is mandatory rather than tidy.
- A press must outlive the finger. A press ends at touchend and the reader then waits — measured
  **376–788ms to first paint on a phone**, unbounded on a worse connection — with nothing on screen
  saying the tap landed. A friend tapped a goal card's way out repeatedly; `[data-leaving]` is the
  answer, and it is an attribute rather than a class because the orphan gate reads a selector's
  leading class token.

All of that is enforced by `tests/build-output.test.ts` and argued in `uno.config.ts`. **None of it
is published.** A design agent handed this system's brief is told which colours to use and nothing
about the one behaviour this site has repeatedly got wrong.

**Words.** The site's most distinctive design work is its naming, and it is invisible to every
surface that describes the system:

- The wall's headings say *events*, not *patches*, because a Finisher Patch is a race **completed
  and earned** — so a page listing races you have entered cannot be headed with the word for the
  ones you finished.
- An outline is a bib with no patch on it and that is **two different facts** — a race still to
  come, or one started and not finished. They share a treatment because the treatment means "not
  earned"; what tells them apart is the word each one prints: `Booked` in the meta row, `DNF` in the
  hero slot.
- A control's label survives the click. A goal card offered "My cycling events" and the page that
  opened was headed "Cycling patches", so the vocabulary broke at the click — and the fix was to
  make the two one constant, which is why `DESIGN_PAGE.heading` and `DESIGN_PAGE.link_label` are
  the same string today.

That last one is already an argument written inside `src/content/design.ts`, about itself, in a
module that has no section for it.

**Access.** The maintainer asked for a third section on 2026-08-26, overruling this plan's original
recommendation to defer it. The recommendation was that most of what would go in it is already
distributed through the other sections as the *reason* for a rule, so a section collecting those
restatements would be the enumeration-in-two-places failure under a virtuous name. **That reasoning
is not discarded — it becomes the section's brief**: it may carry only what the others cannot, which
is reaching and reading rather than drawing. Target size on both axes, one landmark per skippable
region, an accessible name on an icon-only control, text that can double without a pinned height;
and on the other side, reading order drifting from visual order, depending on a colour a
forced-colours mode will replace, and hiding from the accessibility tree something a sighted reader
can act on. If a line you are about to write is already a `does` or `donts` entry under another
heading, it does not belong here.

**After this plan the system publishes the half a reader has to get right to build with it**, and —
because of 040 — it publishes it to every surface at once or goes red.

## Current state

### The section list

`src/content/design.ts:199`:

```ts
export const SECTIONS: Readonly<Record<"palette" | "type" | "controls" | "icons", {
    heading: string
    lede: string
    does: readonly string[]
    donts: readonly string[]
}>> = {
```

A closed union. Adding a key requires widening it, and after 040 the renderer iterates rather than
hand-listing, so widening is the whole mechanical change.

### What each section looks like

`SECTIONS.type`, in full, as the shape to match:

```ts
    type: {
        heading: "Type",
        lede: "A deliberately short ramp. There is no webfont and no display face — the system "
            + "sans stack is the typeface, and restraint in the ramp is what carries hierarchy "
            + "instead. Each step below is set in the size it names.",
        does: [
            "Carry hierarchy with size, weight and space, taken from the ramp as it stands.",
            "Let the reader's own text size drive the layout: every breakpoint and every box here is sized in rem for exactly that reason.",
            "Space sibling groups with a gap on a flex or grid parent.",
        ],
        donts: [
            "Introduce a decorative or display face. There is no webfont to pair one with.",
            "Invent an intermediate step because something is a little too big.",
            "Pin a height in pixels. Text that grows then clips instead of pushing.",
        ],
    },
```

Note the register: **each entry is a complete instruction, and the reason is inside the sentence.**
That is deliberate and stated in the module — the agent reading `.design-sync/conventions.md`
cannot open this repository to look a reason up.

### The budget, which decides what the agent audience gets

`tests/design-system.test.ts` asserts `renderDesignDoc("agent")` is at most **4,096** characters.
Measured against the merged tree at `b1eea8a` [reconciled]: the rendering is **3,859** characters,
so **237 spare**. Two whole sections in the agent audience do not fit in that, and step 4 is where
that is decided rather than discovered.

**Re-measure anyway, and treat every figure here as a lead.** This number has already moved twice
while these plans were being written — it was 163 spare at `71bc7e1`, and 039 bought 74 characters,
which is far less than the two hundred that was estimated before it landed. That is exactly why the
figure is measured rather than reasoned about. 041 also rewrites the palette "Don't" this audience
carries and is required to report the resulting count in its pull request body; **that** is the
number to start from, not this one.

### What already carries the argument, and must not be copied wholesale

- `uno.config.ts` — the press and hover arguments, at length, with the measurements.
- `CLAUDE.md` — the Styling System section, and the `patchState` / `Booked` / `DNF` vocabulary.
- `src/components/Patch.astro` — `.bib--dnf`, the stub, the ledger.
- `src/content/design.ts`'s own `DESIGN_PAGE` block — the heading/link_label argument.

These are the sources. **The sections you write are guidance for someone building something else**,
not a summary of this repository. If a line only makes sense to someone who has read
`uno.config.ts`, it is the wrong line.

### Repo conventions this plan must honour

- **No counts, no values, no class names the build already owns**, in any string a reader can see.
  The module header states this. "8.5% of the delta at 50ms" is a *measurement of a general
  behaviour* and is allowed the way `--brand-ink`'s contrast figures are allowed in the layout —
  but a figure that is really a config value in disguise is not. When in doubt, state the property.
- **Guidance is a complete instruction with its reason inside it.**
- **A section needs a non-empty heading, lede, `does` and `donts`** — gated at
  `tests/design-system.test.ts:302`.
- `pnpm test:update` regenerates; drift fails `pnpm test`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm check` | exit 0 |
| Lint | `pnpm eslint` | exit 0 |
| Full gate | `pnpm test` | exit 0; it builds first |
| Iterate | `SKIP_BUILD=1 pnpm test <filter>` | reuses `dist/` |
| Build only | `pnpm build` | exit 0 |
| Preview | `pnpm preview` | serves `dist/` on http://localhost:4321 |
| Regenerate the generated docs | `pnpm test:update` | rewrites `DESIGN.md` and `.design-sync/conventions.md` |
| Measure the agent document | `node -e "console.log(require('fs').readFileSync('.design-sync/conventions.md','utf8').length)"` | a character count |

## Scope

**In scope** (the only files you may modify):

- `src/content/design.ts` (modify — two new `SECTIONS` entries and the widened union)
- `src/lib/design-doc.ts` (modify — the agent audience's declared subset from 040's step 3, and
  its recorded reasons)
- `src/pages/design.astro` (modify — **only** if a new section wants a specimen; see step 3)
- `tests/design-system.test.ts` (modify — only if step 4 changes what the budget decision asserts)
- `.design-sync/NOTES.md` (modify — record the budget trade)
- `DESIGN.md`, `.design-sync/conventions.md` (regenerate — never hand-edit)
- `CLAUDE.md` (modify — one sentence, step 6)

**Out of scope** (do NOT touch, even though they look related):

- The four existing sections' wording. If a new section makes an old line redundant, say so in the
  pull request and leave it; deleting guidance is a separate decision.
- `uno.config.ts`, `src/components/Patch.astro`, `src/layouts/BasicLayout.astro`. This plan
  publishes what they already argue; it does not change any behaviour.
- The page's drawing. 042 owns it.
- `AGENT_BUDGET`'s value. **Raising the budget is not a way to fit two sections into it** — the
  number is somebody else's context window and its provenance is written beside it.

## Git workflow

- Branch: `advisor/043-publish-the-two-missing-sections`
- Conventional commits — e.g. `feat(design): publish the interaction rules the system enforces`
- Do NOT push or open a pull request unless the operator instructed it.

## Steps

### Step 1: Confirm 040's gate is live

Add a throwaway fifth section to `SECTIONS` — a heading, a lede, one `does`, one `donts` — and run
`pnpm test`.

**Expected: red**, naming the section as absent from `renderDesignDoc("full")`. If the suite is
green, 040 has not landed and this plan cannot be executed safely — **STOP** and report.

Revert by editing the file. Do not run a bare `git checkout --`.

### Step 2: Write the interaction section

Key: `motion`. Heading: a plain-word noun phrase in the register of "Colour", "Type", "Controls",
"Marks" — one or two words. Do not call it "Motion & interaction" if a shorter true word exists;
the site's vocabulary preference is plain domain words.

The lede says what the section is about in one breath: this system's controls have states, the
states are what tell a reader something is pressable and that a press landed, and getting them
wrong is invisible on a desktop with a mouse and obvious on a phone.

`does` — three to four complete instructions, each carrying its reason:

- A press must be drawn, and it must not ease. A tap is over long before a 300ms colour ramp
  finishes, so a pressed state that transitions shows a fraction of itself and reads as nothing.
- A press on a link that navigates must be held until the page actually goes. The press ends at
  touchend and the reader then waits several hundred milliseconds with nothing saying the tap
  landed.
- Keyboard focus is drawn on every device and is a separate thing from hover.
- Respect a reduced-motion preference.

`donts` — three, each naming an output that looks right and is wrong, which is the criterion the
module's header sets for a don't:

- Do not write a hover style that a touch device will apply. A touch browser applies `:hover` on
  tap and keeps it until the reader taps elsewhere, so a hover-only affordance becomes a stuck
  state.
- Do not put a hover rule and a focus rule in one selector list. One of them is a pointer
  affordance and the other is a keyboard indicator every device needs.
- Do not use motion to carry information a still frame does not also carry.

**Check every line against the criterion before writing it**: would this line change what somebody
builds, if they had the token table and the class list and nothing else? A line that only restates
the class list is the thing this module exists not to do.

### Step 3: Write the words section

Key: `words`. Heading: one plain word.

The lede: the words in this interface are design material, and the site's own vocabulary is decided
rather than incidental — a control's label is the name of the thing it opens, and two states that
share a treatment are told apart by the word each one prints.

`does`:

- Name a destination with the same words on both ends. A control that says one thing and opens a
  page headed with another breaks the vocabulary at the click.
- Where two states share a treatment, let the word carry the difference, and print it where the
  reader is already looking.
- Say what a thing is in the reader's terms, not the system's.

`donts`:

- Do not use the word for the earned thing as the heading for the whole set.
- Do not rely on a colour or a shape alone to distinguish two states that mean different things.
- Do not let a label change between the control and its destination.

**A specimen is optional and probably wrong here.** The page draws real things; a "words" section
has no specimen that is not a screenshot of prose. Heading, lede and two guidance columns is the
honest shape, and after 042 the page's generic section renderer produces exactly that with no page
edit at all. **Only touch `src/pages/design.astro` if you find a specimen that is a real element
rather than an illustration** — and if you do, say what it is in the pull request.

### Step 3b: Write the access section

Key: `access`. Heading: one plain word — the mockup the maintainer approved drew it as **Access**,
which is the site's register and fits the chip row; `Accessibility` is the other candidate and is
longer than any other section name.

**Its brief is a boundary before it is a topic.** Read every `does` and `donts` line already in the
module first. If a line you want to write is one of those said again, it belongs where it already
is. What survives is about *reaching and reading* rather than about drawing:

`does`:

- Give every control a target a fingertip can find, on both axes, and let it grow with the reader's
  text.
- Put one landmark around each region a reader might skip to, and make the page's own heading its
  first heading.
- Give an icon-only control an accessible name, since the mark is the whole control. **This one is
  a re-add rather than a new line**: it was dropped from the agent audience for budget and is named
  in `.design-sync/NOTES.md` as the first thing to restore when there is room. Putting it here gives
  it a home in the full rendering as well.
- Let a reader double their text size without touching a font-size: size boxes in rem, and never pin
  a height.

`donts`:

- Do not let reading order drift from visual order. A keyboard meets the markup, not the layout.
- Do not depend on a colour surviving. A forced-colours mode replaces every one of them, so anything
  a colour alone carries is gone.
- Do not hide from the accessibility tree something a sighted reader can act on.

**The fourth `does` overlaps `type`'s "let the reader's own text size drive the layout" and the
controls "Don't pin a control's height in pixels".** That overlap is real and is the exact risk the
deferral argued. Resolve it by writing the line about the *reader's* limit (doubling the text size
without the page seeing a font-size change) rather than about the *unit*, which the other two own.
If you cannot make it distinct, drop it and say so in the pull request.

**Verify**: for every line you wrote, `grep` the module for its key phrase and confirm you have not
produced a second copy of an existing instruction.

### Step 4: Decide what the agent audience carries, by measuring

Run `pnpm test:update`, then measure `.design-sync/conventions.md`.

Three new sections cannot all be in the agent audience. Resolve it with this order of preference,
and **record the measured numbers for whichever you take**:

1. **Carry the `donts` of the interaction section only.** That audience already keeps don'ts and
   drops dos, for a reason written in `src/lib/design-doc.ts`: a don't names an output that looks
   right and is wrong, which is the one thing a token table cannot imply. The interaction don'ts
   are the highest-value lines in this plan for an agent building screens.
2. **Drop the words section from the agent audience**, recording the reason: that agent is handed a
   bundle and writes screens, not this site's copy, and the vocabulary rules are about this site's
   own domain words.
2b. **Carry the access `donts` if anything is left**, and prefer them over the interaction `donts` if
   only one set fits — a forced-colours mode and a drifted reading order are failures that agent
   cannot see in its own output at all, where a stuck hover state at least shows up on a phone.
   Record which way round you went and why.
3. **Only if 1 and 2 still do not fit**, drop something already carried — and name what, and why
   the claim survives elsewhere in the same document, which is the standard the existing drops in
   that file are held to.

Whatever you choose, 040's gate 4 requires every section key to be either declared-carried or
recorded-dropped. A section in neither is red.

**Do not raise `AGENT_BUDGET`.** If you believe the budget is wrong, that is a finding for the pull
request body, not an edit.

**Verify**: `SKIP_BUILD=1 pnpm test design-system` → all pass, including the budget assertion, and
`node -e "…"` reports a count at or under the budget with the headroom stated in the pull request.

### Step 5: Check the new sections reach all four surfaces

This is what 040 bought and it should now be automatic — verify it rather than assume it.

**Verify**: for each new key,
`grep -c '<heading>' dist/design/index.html DESIGN.md dist/design.md` returns a non-zero count for
all three, and `.design-sync/conventions.md` matches whatever step 4 decided — non-zero if carried,
zero if dropped.

### Step 6: Tell `CLAUDE.md`

The Content Management section describes what `src/content/design.ts` holds. Add one sentence:
that the system publishes interaction and vocabulary alongside colour, type, controls and marks —
**without counting them**, because a count in prose is the failure `docs-drift` cannot see and this
file has a standing rule about.

**Verify**: `SKIP_BUILD=1 pnpm test docs-drift` → all pass.

### Step 7: Full gate

**Verify**: `pnpm test` → exit 0; `pnpm check` → exit 0; `pnpm eslint` → exit 0.
`git diff --name-only` lists only In-scope files.

## Test plan

No new test file. The gates that must now cover the new sections already exist:

- 040's gate 1 — every section reaches `renderDesignDoc("full")`
- 040's gate 2 — every section reaches the built page
- 040's gates 3 and 4 — the agent audience's subset is declared and complete
- the existing content gate at `tests/design-system.test.ts:302` — non-empty heading, lede, does,
  donts
- the existing budget assertion

**That is the point of the ordering, and it is the thing to verify rather than trust.** Step 1
proves the gate bites before you rely on it; step 5 proves it covered the sections you added.

**Verification**: `pnpm test` → exit 0, with the delta against your own re-measured baseline
accounted for and the new sections named in the diff to `DESIGN.md`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm eslint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `Object.keys(SECTIONS)` has two more entries than at the branch point
- [ ] Both new headings appear in `dist/design/index.html`, in `DESIGN.md` and in `dist/design.md`
- [ ] `.design-sync/conventions.md` is at or under `AGENT_BUDGET`, and `AGENT_BUDGET` is unchanged
- [ ] `.design-sync/NOTES.md` records the budget trade with its measured numbers
- [ ] Step 1's throwaway section was run and reddened the suite; the message is in the pull request
- [ ] `git diff --name-only` lists only files from the In-scope section
- [ ] `plans/README.md` is **unmodified**

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's throwaway section leaves the suite green. 040 has not landed; adding sections now would
  ship them to one surface with nothing noticing.
- You cannot fit the agent audience under budget without dropping something whose claim does not
  survive elsewhere in the same document. Report the measurement and the candidates; do not raise
  the budget and do not trim `src/content/design.ts`, which would take guidance off `/design` to
  buy room in a third document.
- A guidance line you are about to write is a restatement of the token table or the class list.
  That is the module's stated failure mode; report the line rather than shipping it.
- You find yourself writing a count, a hex, a rem or a class name into a reader-visible string.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **Every future section is now a two-decision change**: the content, and whether the agent audience
  carries it. The budget is the constraint on the second, and it will get tighter, not looser.
- **The interaction section is the one most likely to go stale**, because it describes behaviour
  that `uno.config.ts` and `tests/build-output.test.ts` enforce. If a gate there is relaxed or
  retired, this section becomes a claim nothing backs — grep this module when you touch either.
- **What a reviewer should scrutinise**: whether each guidance line would change what somebody
  builds; whether any line is a measurement of a general behaviour (allowed) or a configured value
  in disguise (not); and that the budget decision was measured rather than assumed.
- **Deliberately deferred**: an accessibility section. Most of what would go in it is already
  distributed through the other sections' guidance as the reason for a rule, and a section that
  collects those restatements would be the enumeration-in-two-places failure under a virtuous name.
  If it is written, it should carry what the others cannot — targets, landmarks, reading order —
  and nothing they already say.
