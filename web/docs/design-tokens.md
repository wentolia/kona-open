# Size tokens: spacing, radius, control size

Defined in `:root` of `src/style.css`. UI CSS uses these names instead of literal pixel values. Illustration CSS (room, cats, shelves, objects) is exempt.

## Spacing `--sp-*` (4 px grid)

| Name | Value | Name | Value |
|---|---|---|---|
| `--sp-0h` | 2 | `--sp-4` | 16 |
| `--sp-1` | 4 | `--sp-5` | 20 |
| `--sp-1h` | 6 | `--sp-6` | 24 |
| `--sp-2` | 8 | `--sp-8` / `-10` / `-12` | 32 / 40 / 48 |
| `--sp-3` | 12 | | |

Half steps (`0h`, `1h`) exist only below 8 px, for the inside of dense controls.

## Spacing by role

| Name | Value (vertical horizontal) | Used for |
|---|---|---|
| `--pad-chip` | 4 8 | Chips, tags, small text controls, speech bubbles |
| `--pad-btn-sm` | 4 12 | Small buttons, segmented-control items, round chips with text |
| `--pad-btn` | 6 12 | Regular buttons, header tabs |
| `--pad-btn-lg` | 8 16 | Primary button (`.btn`) |
| `--pad-field` | 6 8 | Inputs and selects |
| `--pad-item` | 8 12 | Menu and list rows |
| `--inset-card` | 12 | Inside cards and popovers |
| `--inset-panel` | 20 (16 at 600 px wide or less) | Inside dialogs, settings and party cards |
| `--gap-stack` / `--gap-section` | 12 / 24 | Within a group / between groups |

## Radius `--r-*` (chosen by surface size)

| Name | Value | Used for |
|---|---|---|
| `--r-xs` | 2 | Marks, thin bars |
| `--r-sm` | 4 | Buttons, inputs, chips, menu items |
| `--r-md` | 8 | Menus, popovers, cards |
| `--r-lg` | 12 | Dialogs, large surfaces |
| `--r-xl` | 16 | Bottom sheets |
| `--r-pill` | 999px | Round buttons and chips (circles use `50%`) |

Nested corners follow inner radius ≈ outer radius − padding. Example: menu `md` 8 with padding 4 → item `sm` 4.

## Control size `--ctl-*` (side of an icon button)

`--ctl-xs` 24 / `--ctl-sm` 28 / `--ctl-md` 32 / `--ctl-lg` 40 / `--ctl-touch` 44. Touch targets on phones are never smaller than 44.
