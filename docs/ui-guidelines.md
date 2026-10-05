# UI guidelines

Read this before adding or changing a screen. The full background is in `docs/ui-redesign-plan.md`; this page is the short version.

## The look

Quiet and text-first. The screen should read like a well-kept ledger, not a marketing page.

- **Colour.** Navy (`brand`) does the work: primary buttons, links, selected state. Gold (`accent`) is used sparingly: the active tab underline, badge counts, focus rings. The page sits on sand (`canvas`), content on white (`surface`).
- **Type.** DM Sans, self-hosted. Weights 400, 500 and 600 only. Sizes `text-xs`, `text-sm`, `text-base`, `text-xl`, `text-2xl`.
- **Shape.** Two radii: `rounded-control` (8px, inputs, buttons, badges) and `rounded-card` (12px, cards, dialogs). `rounded-full` for avatars and dots.
- **Depth.** Cards use a border, not a shadow. Only things that float get a shadow: `shadow-popover` (menus, pickers, toasts) and `shadow-dialog`.
- **Never:** gradients, emoji or arrow glyphs as icons, uppercase or letter-spaced labels, `font-bold` or heavier, backdrop blur, raw palette classes such as `bg-blue-600`, arbitrary `text-[13px]` or `z-[999]`.

ESLint enforces the "never" list on every string in `src/`. If lint flags a class, use the token or component instead of silencing it.

## Tokens

All defined once in `frontend/src/index.css` under `@theme`.

| Use | Classes |
|---|---|
| Backgrounds | `bg-canvas` (page), `bg-surface` (cards, sidebar, dialogs), `bg-sunken` (table header, hover row) |
| Text | `text-fg`, `text-fg-muted`, `text-fg-subtle` (all pass 4.5:1) |
| Lines | `border-line`, `border-line-strong` |
| Brand | `bg-brand`, `hover:bg-brand-hover`, `bg-brand-subtle`, `text-on-brand` |
| Accent | `bg-accent`, `bg-accent-subtle`, `text-on-accent` |
| Status | `text-success` / `bg-success-subtle`, same for `info`, `warning`, `danger` |
| Charts | `chart-1`, `chart-2`, `chart-3` (checked for colour-blind separation; charts keep a legend and a table view) |
| Layers | `z-10` sticky bars, `z-40` overlays and dialogs, `z-50` popovers and toasts |
| Motion | `animate-fade-in`, `animate-pop-in`, `animate-sheet-in`, `animate-drawer-in`, overlays only, always with `motion-reduce:animate-none` |

## Components

Screens import from `src/ui` (the barrel `ui/index.js`) and nowhere else in that folder.

| Need | Use |
|---|---|
| Page title and actions | `PageHeader` |
| Grouped content | `Card`, `CardHeader`, `CardBody`, `CardFooter` |
| Numbers at the top of a page | `StatGroup` with `Stat` |
| Buttons | `Button` (primary, secondary, ghost, accent, danger, dangerOutline), `IconButton` (needs `label`) |
| Form fields | `Field` around `Input`, `PasswordInput`, `Textarea`, `Select`; `Checkbox`. `Field` connects the label, hint and error for you. |
| Picking from a long list (agents, managers) | `Combobox`. It only draws 50 matches, so it stays fast with hundreds of people. |
| Lists of records | `DataTable`: a table from `md` up, stacked rows below. Columns can be `sortable`, `numeric`, `wide`, `hideOnMobile`. Add `Pagination` for long lists. |
| Switching views | `Tabs` (sections of a page), `SegmentedControl` (two or three modes), `FilterChips` (filters with counts) |
| Status of a lead, customer or web lead | `StatusBadge` with `kind`. Labels and tones live in `ui/status.js`. |
| Messages on the page | `Banner` (info, success, warning, danger) |
| Short confirmation after an action | `toast` from `sonner` |
| Asking "are you sure" | `useConfirm()` (destructive wording turns the button red) or `ConfirmDialog` |
| Anything that pops up | `Dialog` (becomes a bottom sheet on phones) or `Menu`. Never a hand-built `fixed inset-0` overlay. |
| Nothing to show / still loading | `EmptyState`, `Skeleton`, `PageSkeleton`. Never "Loading..." text. |

To see every component in every state, run the dev server and open `/?ui`. It needs no Supabase credentials and is not in the production build.

## Words

- Every visible string goes through `t()` from `src/i18n/useT`, with English and Bahasa Melayu in `src/i18n/strings.js`. Add a `key.one` entry when the singular reads differently ("1 file" vs "2 files").
- Sentence case everywhere. Plain words: "Numbers", "Take back", "Couldn't save the note". Say what happened and what to do next.
- New BM text should be read by a native speaker before it ships.
- `npm run check:strings` catches duplicate keys and keys missing from BM.

## Phones

Agents work on phones all day, and admins and managers use both. Every screen is checked at 375px wide.

- Tap targets at least 44px on phones (`Button size="lg"` for the main action).
- `DataTable` handles the phone layout; don't build a second mobile list.
- Agents get bottom tabs; everyone else gets the slide-in menu.

## Accessibility

- Every control has a name: `Field` gives inputs a label, `IconButton` requires `label`, a hidden file input gets `aria-label`.
- Focus is always visible. Don't remove outlines; in Tailwind v4 don't combine `outline-none` with `focus-visible:outline-2`.
- Dialogs and menus come from Radix, which handles focus and Escape.
- Links look like links (underlined), and colour is never the only signal: badges have text, charts have a legend.

## Behaviour

This was a redesign of the interface, not of how the app works. In particular:

- Tapping **Call** marks the lead **Called**. Sending WhatsApp or SMS marks it too.
- Retired statuses (`Thinking`, `Called (No Answer)`) still exist in the data. They are display aliases in `ui/status.js`. Don't rewrite rows without the owner's say-so.

## Before you push

From `frontend/`:

```
npm run lint            # includes the styling guardrail
npm run check:strings   # translations
npm run ui:audit        # styling metrics; all should be on target
npx vite build
```

To look at real screens without touching the live database, start a dev server against the fake backend and shoot every role at 375px and 1280px:

```
VITE_SUPABASE_URL=http://fake.supabase.test VITE_SUPABASE_ANON_KEY=fake npx vite --port 5174 --strictPort
npm run screens -- <out-dir> [role] [paths] [en|ms]
```

Then open the screenshots and look at them.
