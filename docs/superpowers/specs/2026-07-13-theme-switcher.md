# Theme Switcher — Design Spec

**Date:** 2026-07-13
**Status:** Approved (palettes reviewed in browser preview; Matcha and Reading Nook backgrounds deepened per feedback)

## Goal

Let the user pick one of five app-wide themes (colors + fonts). The choice persists across sessions and applies instantly, with no flash of the wrong theme on load.

## The five themes

| id | Label | Feel | Display font | Body font |
|----|-------|------|--------------|-----------|
| `cream` | Café Cream | current warm cream (default) | DM Serif Display | DM Sans |
| `matcha` | Matcha Garden | soft sage, pine-green text, matcha accent | Shippori Mincho | Zen Kaku Gothic New |
| `dark-roast` | Dark Roast | near-black espresso, cream text, caramel accent | Fraunces | Outfit |
| `reading-nook` | Reading Nook | aged paper, ink text, oxblood accent | Libre Caslon Text | Lora |
| `berry` | Berry Hibiscus | blush + plum, hibiscus-pink accent | Young Serif | Nunito Sans |

Full palette values live in the theme blocks in `src/index.css` (source of truth). They were approved via the browser preview mockups, including the revised backgrounds: Matcha Garden `#e7eeda`, Reading Nook `#efe3c8`.

## Mechanism

- **CSS custom properties**: `:root` holds the Café Cream defaults (as today). Each other theme is a `:root[data-theme="<id>"]` block overriding the same variables. Switching themes = setting `data-theme` on `<html>`.
- **New variables** introduced so every themed surface is variable-driven (currently some are hardcoded):
  - `--badge-coffee-bg`, `--badge-matcha-bg` — entry-card badge backgrounds (currently hardcoded hex)
  - `--on-accent` — text/icon color on accent-filled controls (currently `white`/`#fff`)
  - `--shadow-fab` — FAB shadow (currently hardcoded rgba)
  - `--accent-primary` — the theme's "primary" accent used by the FAB, save button, active type toggle, and star rating. Defaults to `var(--accent-coffee)`; Matcha Garden points it at `var(--accent-matcha)` (green-led theme).
- **Fonts**: the default DM fonts stay in `index.html`. Non-cream themes lazily inject/swap a single `<link id="theme-fonts">` stylesheet pointing at Google Fonts for that theme's two families.
- **Persistence**: `localStorage` key `brewlog:theme`. Unknown/missing values fall back to `cream`. Storage errors (private mode) are swallowed — theme still applies for the session.
- **Boot**: `main.jsx` calls `applyTheme(getStoredTheme())` before rendering React, so the app never paints in the wrong palette.
- **PWA chrome**: `applyTheme` updates `<meta name="theme-color">` to the theme's background. The dark theme also sets `color-scheme: dark` so native form controls match.

## Code layout

- `src/lib/theme.js` — theme table (`THEMES`), `DEFAULT_THEME`, `normalizeThemeId`, `getStoredTheme`, `applyTheme`. DOM/storage are injectable parameters so logic is unit-testable in the node vitest environment.
- `src/lib/theme.test.js` — unit tests.
- `src/components/ThemePicker.jsx` — "Theme" section on the feed page (above Backup): five tappable swatches (background circle with accent dot) with labels; active one highlighted.
- `src/pages/FeedPage.jsx` — renders `<ThemePicker />` above `<BackupControls />`.
- `src/index.css` — new vars in `:root`, hardcoded values replaced with vars, four theme override blocks.
- `src/components/StarRating.jsx` — filled-star color becomes `var(--accent-primary)`.

## Out of scope

- Per-entry theming, custom user palettes, auto dark mode via `prefers-color-scheme`, syncing the theme choice to Supabase.
