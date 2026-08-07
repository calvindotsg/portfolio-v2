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
 */
export const iconClass = (logo: string): string => `i-${logo.replace(":", "-")}`;
