/**
 * Maps an Iconify id (`collection:name`, as authored beside the copy or the data it
 * decorates) to the UnoCSS `presetIcons` utility class that renders it.
 *
 * The `safelist` in `uno.config.ts` is the census of every id the site uses; read that
 * rather than a list of directories here, which is a second copy of the same set and
 * would be the one that goes stale.
 *
 * Both the `safelist` in `uno.config.ts` and the components that render icons
 * must call this — UnoCSS only generates rules for class names it can see
 * literally, so a mismatch here produces an icon with no CSS rule.
 *
 * `uno.config.ts` READS THIS MODULE THROUGH unconfig/jiti RATHER THAN VITE, so the standing
 * constraint the other modules in that graph carry applies here too: no `import.meta.glob`,
 * no `astro:content`, no top-level `await` and no `.astro` import, directly or through
 * anything this file pulls in. This one had no such note while every sibling did, and the
 * gap was not theoretical — importing `EVENTS` here fails `pnpm build` with
 * `glob is not a function` before a single test runs. The rule and the failure are written
 * out above `EVENTS` in `src/data/races/index.ts`.
 */
export const iconClass = (logo: string): string => `i-${logo.replace(":", "-")}`;
