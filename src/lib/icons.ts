/**
 * Maps an Iconify id (`collection:name`, as stored in `src/lib/constants.ts`) to
 * the UnoCSS `presetIcons` utility class that renders it.
 *
 * Both the `safelist` in `uno.config.ts` and the components that render icons
 * must call this — UnoCSS only generates rules for class names it can see
 * literally, so a mismatch here produces an icon with no CSS rule.
 */
export const iconClass = (logo: string): string => `i-${logo.replace(":", "-")}`;
