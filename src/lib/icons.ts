/**
 * THE CENSUS OF EVERY MARK THE SITE USES, and the map from an Iconify id to the class that
 * renders it.
 *
 * Both halves live here because they are one fact. UnoCSS only generates a rule for a class
 * name it can see LITERALLY in a scanned file, and every icon on this site is computed at
 * render time from an id authored beside the copy — so nothing is ever literal, and
 * `uno.config.ts` has to safelist the lot. A class with no rule is not a build error: a
 * `presetIcons` class that generated nothing renders as a mask box at zero size, which is an
 * icon that is silently absent, with correct markup and a green build.
 *
 * `ICON_IDS` HAS TWO CONSUMERS AND MUST NEVER HAVE A SECOND COPY. `uno.config.ts` safelists
 * it, and `/design` renders it as the set a designer may reach for. Those two answering
 * differently is precisely the defect above, one page at a time — so the list is exported
 * rather than computed at either call site, and the comment this replaced in `uno.config.ts`
 * said so about a hypothetical second sport-icon map before there was anywhere to put the
 * first.
 *
 * WHAT IS NOT IN IT: `EVENTS`. The patch wall draws a sport's mark, and it gets it from the
 * GOAL that owns the sport (`goalForSport` in `src/lib/goal.ts`) rather than from a table of
 * its own, so the two `GOALS` entries below already cover every bib on the wall.
 *
 * `uno.config.ts` READS THIS MODULE THROUGH unconfig/jiti RATHER THAN VITE, so the standing
 * constraint the content modules carry applies here too: no `import.meta.glob`, no
 * `astro:content`, no top-level `await` and no `.astro` import, directly or through anything
 * this file pulls in. This one had no such note while every sibling did, and the gap was not
 * theoretical — importing `EVENTS` here fails `pnpm build` with `glob is not a function`
 * before a single test runs. The rule and the failure are written out above `EVENTS` in
 * `src/data/races/index.ts`.
 */

import {MARKDOWN_TWIN} from "../content/design"
import {CAREER, NOW, WELCOME} from "../content/home"
import {NEXT_RACE, PATCHES} from "../content/races"
import {FOOTER, LINKS, NOT_FOUND} from "../content/site"
import {GOALS} from "./goal"

export const iconClass = (logo: string): string => `i-${logo.replace(":", "-")}`;

/**
 * Every Iconify id any page renders. Duplicates are left in rather than deduplicated: an
 * entry earns its place by naming the constant that reaches for it, so a constant relying on
 * ANOTHER constant having already listed the same id would ship a zero-size mask box the day
 * the other one changed — with correct markup and a green build. `NOT_FOUND.home_icon` and
 * `PATCHES.home_icon` resolve to the same class today and are both here for that reason.
 * Consumers that need the set rather than the census dedupe at the point of use.
 */
export const ICON_IDS: readonly string[] = [
    ...LINKS.map((l) => l.logo),
    ...GOALS.map((g) => g.goal_logo),
    ...CAREER.map((c) => c.icon),
    WELCOME.greeting_icon,
    FOOTER.icon,
    NOW.explainer_icon,
    PATCHES.home_icon,
    PATCHES.strava_icon,
    PATCHES.official_icon,
    NEXT_RACE.icon,
    NOT_FOUND.home_icon,
    MARKDOWN_TWIN.icon,
    MARKDOWN_TWIN.copied_icon,
    /*
     * THE THEME TOGGLE'S TWO MARKS, WHICH ARE THE ONLY ONES ON THIS SITE THAT DO NOT COME
     * FROM A CONTENT CONSTANT — and until `/design` existed, the only ones nothing had to
     * enumerate. `ThemeSwitcher.astro` writes its sun and moon out as literal class names, so
     * UnoCSS extracts them itself and the safelist never needed to hear about them. That is
     * still true of the safelist and stopped being true of the CENSUS the moment a page began
     * rendering the set as the marks a designer may reach for: without these two, that page
     * showed sixteen of the eighteen the site ships, and the generated document told a design
     * agent that sixteen was all there was.
     *
     * SO THIS IS A SECOND HOME, DELIBERATELY, AND IT IS GATED RATHER THAN TRUSTED. The class
     * these ids resolve to is also written in that component's markup, and a pair like that
     * drifts in silence by default — neither the orphan gate nor the class-token gate can see
     * it, because both halves are worn by SOMETHING. `tests/design-system.test.ts` holds this
     * list against every `i-` rule the built stylesheet ships, in both directions, which is
     * what makes the census complete rather than merely centralised. The single-home fix is to
     * give `THEME_TOGGLE` its two icon ids and have the component call `iconClass`, the way
     * every other mark on the site is authored; that is a change to a component and to
     * `src/content/site.ts` and belongs to whoever makes it deliberately.
     */
    "ri:sun-line",
    "ri:moon-line",
];
