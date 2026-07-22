# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website built with Astro, featuring a bento-style, minimal, single-page design. The site showcases Calvin's professional background, cycling goals, and personal interests.

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm check

# Tests (renders the page and asserts on the output)
pnpm test

# Linting
pnpm eslint
```

Note: `pnpm preview` serves the built `dist/` directory locally on
http://localhost:4321 — the site is a static build with no adapter, so the
preview is byte-identical to what Netlify serves.

## Tech Stack & Architecture

- **Framework**: Astro with static output (`output: "static"`) — every page is
  prerendered at build time; there is no adapter and no server runtime
- **UI Components**: Astro components only — no client-side UI framework
- **Styling**: UnoCSS (atomic CSS framework)
- **Icons**: Iconify collections `@iconify-json/fa6-brands` and `@iconify-json/ri`
- **Animation**: CSS animations only
- **Deployment**: Netlify, serving the prerendered `dist/` directory

## Key Architecture Points

### Component Structure
- **Astro Components**: Main UI components (`.astro` files) for static content
- **Card System**: Reusable card layout in `src/components/Card/index.astro`

### Configuration & Content
- **Constants**: All site content and configuration centralized in `src/lib/constants.ts`
- **Personal Data**: Update `constants.ts` to modify personal details, career info, goals, and metadata
- **Site Config**: Main site configuration in `astro.config.mjs` (site URL, integrations)

### Styling System
- **UnoCSS**: Atomic CSS with custom theme configuration in `uno.config.ts`
- **Theme Support**: dark/light mode via CSS custom properties defined in
  `src/layouts/BasicLayout.astro`; the active theme is written to
  `<html data-theme>` by an inline `<script is:inline>` in `<head>` before first
  paint
- **Custom Design System**: theme tokens (colors, shadows) defined in
  `uno.config.ts`

### Layout Hierarchy
- `src/layouts/BasicLayout.astro` wraps the single page `src/pages/index.astro`
- Responsive bento grid layout for different screen sizes

## Content Management

All site content is managed through `src/lib/constants.ts`:
- `LINKS`: Social media and external links
- `CAREER`: Professional experience
- `ABOUT_ME`: Personal description
- `GOALS`: Goal progress tracking (cycling, running)
- `WELCOME`: Hero section content  
- `NOW`: Current status
- `METADATA`: SEO and site metadata

## Deployment

The site is a fully static build deployed to Netlify:
- Every page is prerendered to `dist/` at build time
- No adapter, no serverless function, and no middleware
- Automatic sitemap generation
- `robots.txt` shipped in the build output

## Memories

- Any user configurable variable belongs in one of exactly three places: a
  GitHub repository secret, a GitHub repository variable, or
  `src/lib/constants.ts`. Scripts and workflows hold no configuration of their
  own — see README.md "Configuration".