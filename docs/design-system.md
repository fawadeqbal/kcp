# The Organic design system

Meray's revamp (October 2026) gives every surface the same warm, rounded look: a cream-and-sand ground, a terracotta accent, a sage second voice, Caprasimo headings over Figtree text, big radii and pills. This page says where each part lives and what to keep in step when something changes.

## One source for the tokens

`packages/ui/src/theme.css` holds every colour, radius, font stack and shadow, for light **and** dark:

- the `@theme` block is the light set (Tailwind turns `--color-brand-100` into `bg-brand-100`, `text-brand-100`…);
- the `@media (prefers-color-scheme: dark)` block redefines the same names for dark. The 100–900 ramps flip (100↔900, 200↔800…), so "a tinted fill with 100, its text in 800" reads well in both.

The apps follow the phone's or computer's light/dark setting; there is no switch.

Colour classes are checked: `packages/ui/src/tokens.spec.ts` fails when an app uses a colour class that isn't in `theme.css` (a stock Tailwind colour, or a retired name), because Tailwind would silently drop it.

### Where copies live (keep them in step)

| Where                                                                                                       | How it gets the tokens                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app, admin panel, marketing site                                                                        | `@import '@kcp/ui/theme.css'`                                                                                                                                                                                           |
| Flutter app                                                                                                 | `node apps/mobile/tool/shared.mjs` (`melos run shared`) writes `lib/theme/tokens.g.dart` (light and dark palettes, radii, avatar colours) and `lib/theme/icons.g.dart` (the icons). CI fails when they are out of date. |
| Emails (`apps/api/src/mail/templates.ts`)                                                                   | Inline colours (email apps ignore stylesheets): cream page, soft card, terracotta pill button, a dark version where the mail app supports it                                                                            |
| Certificate PDF (`apps/api/src/certificates/certificate-pdf.ts`)                                            | The light colours, as constants at the top                                                                                                                                                                              |
| Public portfolio page (`apps/sandbox/public/portfolio/index.html`)                                          | CSS variables, light and dark                                                                                                                                                                                           |
| App icons (`apps/mobile/tool/make_icons.py`), Android launch colours, favicons (`icon.svg` in each web app) | The brand and page colours                                                                                                                                                                                              |

## Colours

| Name                         | Light                 | Dark                  | Use                                                                      |
| ---------------------------- | --------------------- | --------------------- | ------------------------------------------------------------------------ |
| `canvas`                     | `#f5ead8`             | `#1a1815`             | The page                                                                 |
| `surface`                    | `#ebddc5`             | `#25221e`             | Cards on the page                                                        |
| `raised`                     | `#f9f4ed`             | `#2e2a25`             | Rows and wells inside a card, inputs                                     |
| `ink` / `muted`              | `#201e1d` / `#645c50` | `#f2e8d8` / `#b9ae9c` | Text; `muted` keeps 4.5:1 on all three grounds                           |
| `brand`                      | `#c67139`             | `#e08d55`             | Terracotta: decoration only (the mark, circles, icons, focus ring)       |
| `primary`                    | `#a05626`             | `#e08d55`             | Solid fills that carry text (buttons, the current step, the lesson card) |
| `sage`                       | `#7a8a5e`             | `#a3b485`             | The second voice: done, safe, correct                                    |
| `danger`, `warn-*`, `code-*` |                       |                       | Errors, notices, the code editor                                         |

**One deliberate change from the design boards:** the boards use the terracotta `#c67139` for buttons with cream text, which is only 3.5:1. Text-bearing fills use the deeper `primary` `#a05626` instead: 5.25:1 for the label, and 4.58:1 against the cream page, so a button's edge stands out too. The lighter terracotta stays for everything without text on it. Dark mode keeps the design's `#e08d55` with dark text (6.8:1).

## Type

- **Caprasimo** for headings, big numbers and buttons; **Figtree** for everything else. Both are self-hosted (`@fontsource`), never loaded from Google.
- **Arabic:** headings in the rounded **Baloo Bhaijaan 2**, text in **Noto Sans Arabic**.
- **Urdu:** **Noto Nastaliq Urdu** throughout, with more room between lines (Nastaliq is tall).
- Latin letters inside Arabic or Urdu (nicknames, code words) keep Caprasimo and Figtree.
- Caprasimo has one weight: it is never faked bolder. In the Flutter app it is registered as bold too, for the same reason.
- The browser downloads a script's font files only when a page has letters of that script (`unicode-range`).

## Icons

Lucide (ISC licence), drawn with a round 2.75 stroke. The web's set is `packages/ui/src/icons.tsx`; the Flutter app draws the same SVG paths (`KcpIcon`, from `icons.g.dart`). Arrows and chevrons are mirrored in Arabic and Urdu. Icons are decorative: the words next to them, or a label on the button, say what they mean.

## Shape and depth

Radii: cards 32px, panels and dialogs 28px, a card inside a card 26px, rows and options 22px, code wells 20px, the "continue" hero 36px; controls are pills. Shadows are few and soft (`elev-sm`, `elev-md`, `elev-lg`), with a thin light ring in dark mode.
