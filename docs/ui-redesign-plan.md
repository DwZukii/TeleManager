# TeleManager UI/UX Redesign Plan

Written 2026-10-05, against `main` at `2d9f7c9` plus the uncommitted sidebar and Web Leads work.
Nothing in this document has been implemented yet.

---

## 1. Summary

The app works, and the data layer underneath it is in decent shape. The problem is the surface: every screen was styled on its own, with no shared rules, so the same handful of decorative habits got repeated a few hundred times. That repetition is what reads as "AI slop".

The fix is not a new coat of paint per screen. It is:

1. **One small set of rules** (colour, type, spacing, radius, elevation) written down as tokens.
2. **About 20 shared components** that are the only place styling lives.
3. **Every screen rebuilt from those components**, most-used screens first.
4. **A handful of real workflow fixes** done at the same time, because a restyle that keeps the awkward flows is half a job.
5. **Guardrails** (a lint rule and an audit script) so it cannot drift back.

Seven phases, each one shippable on its own. Staff screens go early because 157 of the 179 accounts are agents and they are on phones.

---

## 2. Why it looks generated: the evidence

Counts are from a grep over `frontend/src` (about 11,700 lines of JSX). Approximate, but the proportions are the point.

### 2.1 No typographic hierarchy: everything is bold

| Class | Uses |
|---|---|
| `font-bold` | 492 |
| `font-black` | 209 |
| `font-extrabold` | 61 |
| `font-medium` | 151 |
| `font-semibold` | 29 |

762 heavy-weight uses against 180 regular ones. When labels, values, buttons, table cells and headings are all bold, nothing is. `index.html` loads seven Inter weights (300 to 900) to support this.

### 2.2 Shouting micro-labels

`uppercase` 180 times, `tracking-widest` / `tracking-wider` 123 times, and 88 arbitrary sizes like `text-[10px]` and `text-[11px]`. Tiny, uppercase, letter-spaced, black-weight labels above every value is the single most recognisable tell.

### 2.3 Decoration standing in for design

| Thing | Uses |
|---|---|
| `bg-gradient-to-*` (headers, every avatar circle, buttons) | 37 |
| `animate-in` (whole pages fade and slide in on every tab switch) | 47 |
| `backdrop-blur` | 16 |
| `shadow-2xl` | 23 |
| Emoji and text glyphs used as icons (📭 🔍 ✅ ⚡ 🏢 📱 🖥️ → ✕) | 125 |
| Inline `style={{}}` with hard-coded colours | 32 |

Plus the pattern of a tinted square with an icon in it beside every section heading.

### 2.4 No system: every value was picked fresh

- **Radius:** seven different values in use. Bare `rounded` 243, `rounded-md` 138, `rounded-full` 122, `rounded-sm` 72, `rounded-lg` 54, `rounded-xl` 32, `rounded-2xl` 8. Neighbouring cards on the same screen have different corners.
- **Shadows:** six levels (`sm` 169, `md` 29, `2xl` 23, `lg` 5, `xl` 4, `inner` 4).
- **Neutrals:** `gray-*` (957) and `slate-*` (289) mixed, sometimes in one component.
- **Brand colour:** `indigo-*` (679) and `blue-*` (206) both act as "primary". Some primary buttons are indigo, some blue.
- **Colour families in use:** 16. Stat tiles on the agent profile are grey, blue, purple, green, yellow and red in one row.
- **Hex literals in JSX:** about 80, including `#1e1b4b` 17 times.
- **z-index:** eight different magic numbers (`60`, `70`, `90`, `100`, `110`, `200`, `999`, `9999`).
- **Borders:** `border` and `border-2` used interchangeably for the same kind of input.

### 2.5 Copy-paste instead of components

- 14 places render the same list twice, once as "Mobile Card View" and once as "Desktop Table View", each maintained by hand.
- 13 hand-built modal overlays, none with focus trapping or Escape handling.
- The feedback modal and its submit handler are pasted into three dashboards.
- Three separate hand-built searchable agent pickers.
- 29 native `<select>` elements each styled differently.
- There is no `Button`, `Input`, `Card`, `Badge`, `Modal` or `Table` component anywhere.

### 2.6 Accessibility was never a consideration

- 62 `<label>` elements, **zero** with `htmlFor`. No label is actually connected to its field.
- 2 `aria-label`s in the whole app. Icon-only buttons are unnamed.
- 0 `role` attributes. Modals are plain `div`s.
- Light grey text on white for secondary content in many places.

### 2.7 The copy sounds like a pitch deck

Real strings currently in the product:

- "Permanently incinerate all Rejected leads older than 30 days"
- "Transfer robust leads from your Admin pool directly into a Manager's command pool seamlessly."
- "Real-time performance intelligence across your entire operation."
- "completely eradicate {email} from the system"
- "Building account securely..."
- "Protected by end-to-end Supabase Encryption" (this is also not accurate; it is TLS plus row-level security)
- Section names: Data Centre, Global Matrix, Activity Hub, Feedback Hub, Cold Storage

### 2.8 The app is now three different apps

- Admin, Manager and GM have the new light sidebar.
- Staff still has the dark indigo top bar with the sliding pill.
- The user menu inside the light sidebar is still a dark indigo glass panel.
- The Web Leads tab is emerald with a gradient header.

**To be straight about my own part in this:** the sidebar and the Web Leads tab were both written in this session, and both carry the same tells (gradient header, uppercase micro-labels, `font-black` numbers, an emerald theme invented on the spot). They get rebuilt with everything else.

---

## 3. Goals and non-goals

### Goals

1. An agent on a phone can work a list of leads faster and with fewer taps than today.
2. Any screen looks like it belongs to the same product as any other screen.
3. A new screen can be built from existing parts without writing new styling.
4. Errors say what went wrong and where. No more silent failures.
5. It cannot drift back: banned patterns fail lint.

### Non-goals

- No dark mode. It doubles the QA surface and nobody has asked for it.
- No new features, charts or dashboards beyond what is listed in section 8.
- No TypeScript migration, no state-management change. React Query stays.
- No database or RLS changes, except where section 8 calls one out explicitly.
- No animation library. Motion is limited to overlays opening and closing.
- No off-the-shelf component kit dropped in wholesale. Its default look is the same generic look we are leaving.

### What stays

- The React Query data hooks, lazy-loaded tabs, realtime subscriptions.
- Lucide icons (and only Lucide).
- Sonner for toasts.
- Inter. The typeface is not the problem; the weights are.
- The light sidebar layout for desktop, restyled.
- The centred-card login. You rejected the split-screen version, so it gets tokens and nothing else.

---

## 4. Design direction

One sentence: **a quiet, dense, text-first working tool.** Think a well-made spreadsheet, not a marketing site. The An Nur sidebar you pointed at is the right register: white, thin borders, one accent, regular-weight text.

### 4.1 Principles

1. **Hierarchy comes from size and spacing, not weight and colour.** Default weight is regular.
2. **Colour means something.** One accent for "this is selected or interactive". Green, amber and red only for outcomes. Everything else is neutral.
3. **Borders, not shadows.** Cards are a 1px border on white. Shadow is reserved for things that float (menus, dialogs).
4. **One icon set, used sparingly.** An icon appears when it helps you find or recognise something, not beside every heading.
5. **Say it plainly.** Labels are sentence case and say what the thing is.
6. **Numbers line up.** Tabular figures everywhere numbers are compared.
7. **Touch first for staff.** 44px minimum targets, thumb-reachable primary actions.

### 4.2 Typography

Inter, three weights loaded instead of seven: 400, 500, 600.

| Role | Size / line | Weight | Used for |
|---|---|---|---|
| Page title | 20 / 28 | 600 | One per screen |
| Section title | 16 / 24 | 600 | Card and panel headings |
| Body | 14 / 20 | 400 | Default text, table cells |
| Label | 14 / 20 | 500 | Field labels, buttons, table headers, nav items |
| Meta | 12 / 16 | 400 | Timestamps, helper text, counts |
| Big number | 24 / 32 | 600, tabular | Stat values only |

Rules: no weight above 600. No `uppercase`. No letter-spacing utilities. No arbitrary pixel sizes. Inputs stay at 16px on mobile so iOS does not zoom (the fix already shipped in `2d9f7c9`).

### 4.3 Colour

**Neutrals:** one family. Replace both `gray` and `slate` with a single neutral scale exposed only through tokens.

**Accent:** see open question 1. My recommendation is that primary buttons become near-black ink and indigo is demoted to selection, focus rings and links. That one change removes most of the "indigo everywhere" feel while keeping the colour people already associate with the product.

**Status tones:** five semantic tones, each with a text colour and a pale background.

| Tone | Meaning |
|---|---|
| neutral | not started, inactive |
| info | in progress, contacted |
| success | positive outcome |
| warning | needs attention, waiting |
| danger | negative outcome, destructive |

**Status mapping.** Colour carries the outcome; an icon carries the channel. Today Called is blue, WhatsApp is purple and SMS is yellow, which is three colours for one idea ("contacted").

| Lead status | Tone | Icon |
|---|---|---|
| Pending | neutral | none |
| Called | info | phone |
| WhatsApp Sent | info | message-circle |
| SMS Sent | info | message-square |
| Accepted | success | check |
| Rejected | danger | x |
| Invalid Number | neutral, muted text | phone-off |

| Pipeline status | Tone |
|---|---|
| New | neutral |
| Process | info |
| Pending | warning |
| Approved | success |
| Disbursed | success, solid fill (the one "done" state) |
| Rejected | danger |

| Web lead status | Tone |
|---|---|
| New | accent |
| Contacted | info |
| Qualified, Converted | success |
| Junk | neutral |

Badges are a small dot plus text on a pale background. No pill with a coloured border and a coloured fill and bold coloured text.

### 4.4 Shape, depth, spacing

- **Radius:** two values. 6px for controls and badges, 10px for cards and dialogs. Full round only for avatars and status dots.
- **Borders:** 1px, one colour, with a slightly stronger variant for inputs.
- **Shadow:** none on cards. One soft shadow for menus and popovers, one larger for dialogs.
- **Spacing:** Tailwind's 4px scale, but only 4, 8, 12, 16, 24, 32, 48. Card padding is 16 on mobile and 20 on desktop. Gap between cards is 16.
- **Layers:** three named z-levels: sticky (10), overlay (40), toast (50).
- **Content width:** fluid inside the shell with 24px gutters, capped at 1280px. Not `max-w-6xl` centred in a wide window with dead space either side.

### 4.5 Icons, avatars, motion

- Lucide only, 16px inline and 18px in navigation, stroke 1.75, text colour.
- All 125 emoji and glyph icons removed. Empty states get a line of text and, where useful, one action.
- Avatars are a flat neutral circle with initials. No gradients.
- Motion: dialogs and menus fade and scale over 120ms. Nothing else moves. Page content does not animate in on tab change. `prefers-reduced-motion` turns even that off.

### 4.6 Voice

Sentence case. Verb-first buttons. Say what happens.

| Now | Proposed |
|---|---|
| Data Centre | Leads |
| Global Matrix / My Team Matrix | Performance |
| Activity Hub | Activity |
| Feedback Hub / Feedback Center | Feedback |
| Directory | Team |
| Cold Storage | Delete old rejected leads |
| "Permanently incinerate all Rejected leads older than 30 days across the system." | "Deletes rejected leads older than 30 days, and any files attached to them. This cannot be undone." |
| "Transfer robust leads from your Admin pool directly into a Manager's command pool seamlessly." | "Move unassigned leads from your pool to a manager's pool." |
| "Real-time performance intelligence across your entire operation." | (removed; the page title is enough) |
| "Building account securely..." | "Creating account..." |
| "Protected by end-to-end Supabase Encryption" | (removed) |
| "completely eradicate {email} from the system" | "Delete {email}? Their leads return to the unassigned pool. This cannot be undone." |
| "Welcome back !" | "Sign in" |
| "Connection Lost or Update Required" | "A new version is available" + Reload |

Renaming navigation is the one change here users will notice straight away. See open question 5.

---

## 5. Foundations: tokens

All in `frontend/src/index.css` using Tailwind v4's `@theme`. Components use the token names and never a raw palette class. Values below are a starting proposal; the accent depends on open question 1.

```css
@import "tailwindcss";

@theme {
  /* type */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

  /* surfaces */
  --color-canvas: #f7f7f8;        /* page background */
  --color-surface: #ffffff;       /* cards, sidebar, dialogs */
  --color-sunken: #f4f4f5;        /* table header, hover row, disabled field */

  /* text */
  --color-fg: #18181b;
  --color-fg-muted: #52525b;
  --color-fg-subtle: #8b8b94;     /* still 4.5:1 on white */
  --color-fg-on-accent: #ffffff;

  /* lines */
  --color-line: #e4e4e7;
  --color-line-strong: #d1d1d6;

  /* interaction */
  --color-ink: #18181b;           /* primary button */
  --color-ink-hover: #2e2e33;
  --color-accent: #4f46e5;        /* selection, links, focus */
  --color-accent-subtle: #eef2ff;

  /* tones: text + pale background */
  --color-info: #1d4ed8;     --color-info-subtle: #eff6ff;
  --color-success: #15803d;  --color-success-subtle: #f0fdf4;
  --color-warning: #a16207;  --color-warning-subtle: #fefce8;
  --color-danger: #b91c1c;   --color-danger-subtle: #fef2f2;

  /* shape */
  --radius-control: 6px;
  --radius-card: 10px;

  /* depth */
  --shadow-popover: 0 4px 16px rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.04);
  --shadow-dialog: 0 16px 48px rgb(0 0 0 / 0.16);
}
```

That yields utilities like `bg-surface`, `text-fg-muted`, `border-line`, `rounded-card`, `shadow-popover`.

Also in this step:

- `index.html`: load Inter 400, 500, 600 only.
- Delete the empty `App.css`.
- Chart colours read from the same tokens instead of the hex values hard-coded in `GlobalMatrixTab.jsx` and `GMDashboard.jsx`.

---

## 6. Foundations: component library

New folder `frontend/src/ui/`. These are the only files allowed to contain visual styling decisions. Roughly 20 components.

For the overlay components (Dialog, Menu, Popover, Tooltip, Tabs) I recommend building on a headless library, Radix or Base UI, so focus trapping, Escape, outside click, scroll lock and ARIA are correct without us hand-writing them 13 times. It adds no visual opinion. See open question 7.

| Component | Replaces | Notes |
|---|---|---|
| `Button` | ~150 hand-styled buttons | Variants: primary (ink), secondary (bordered), ghost, danger. Sizes sm (32px), md (40px), lg (44px, default on touch). `loading` prop shows a spinner and disables. |
| `IconButton` | icon-only buttons | Requires `label`, rendered as `aria-label` and tooltip. |
| `Field` | 62 loose labels | Wraps label + control + hint + error. Wires `htmlFor`, `aria-describedby`, `aria-invalid`. |
| `Input`, `Textarea` | every input | One border, one focus ring. |
| `Select` | 29 native selects | Styled native select. Native is right on phones. |
| `Combobox` | 3 hand-built agent pickers | Search, keyboard navigation, shows name and email. |
| `Checkbox`, `Switch` | ad hoc | |
| `Card`, `CardHeader` | every `bg-white rounded shadow-sm border` | Title, optional description, optional actions slot. No icon tile. |
| `PageHeader` | per-screen headings | Title, optional description, primary action on the right. |
| `Stat` | rainbow stat tiles | Label, value, optional delta. Neutral. Colour only when the number is a status. |
| `Badge`, `StatusBadge` | pastel pills | `StatusBadge` takes a status string and looks up tone and icon from one map. |
| `Avatar` | gradient circles | Flat, initials. |
| `Tabs` | in-page tab strips | Underline style. |
| `DataTable` | 14 tables + 14 duplicate card views | See below. |
| `Pagination` | several hand-built | "1 to 10 of 700", previous, next. |
| `Dialog` | 13 overlays | Title, body, footer. Becomes a bottom sheet under 640px. |
| `ConfirmDialog` | `ConfirmModal` + `useConfirm` | Adds a `destructive` mode requiring a typed word for irreversible bulk actions. |
| `Menu` | `UserDropdown` menu | |
| `EmptyState` | emoji placeholders | Title, one line, optional action. |
| `Skeleton` | 27 "Loading..." strings | Row and card shapes. |
| `Banner` | inline alerts | Tones as above. Used for form-level errors. |
| `Toaster` | Sonner config | One place for position and style. |

### `DataTable` is the big win

One column definition renders both layouts:

```jsx
<DataTable
  rows={agents}
  rowKey="email"
  onRowClick={openAgent}
  columns={[
    { key: 'email',   header: 'Agent',   primary: true },
    { key: 'total',   header: 'Total',   align: 'right', numeric: true },
    { key: 'pending', header: 'Pending', align: 'right', numeric: true },
    { key: 'called',  header: 'Called',  align: 'right', numeric: true, hideOnMobile: true },
  ]}
  actions={(row) => <Button size="sm" variant="secondary">Revoke</Button>}
/>
```

At 768px and up it is a table. Below that, the same definition renders each row as a stacked item: the `primary` column as the title, the rest as label and value pairs, actions underneath. That deletes the 14 hand-maintained duplicates and guarantees the two layouts never disagree.

### Shared feature components

Not primitives, but currently pasted in several places:

- `FeedbackDialog` (three copies today).
- `AgentPicker` (the Combobox bound to the agent list).
- `StaffContactCard` (two copies).
- `LeadSetPicker` (the Set A / B / C select, about eight copies).

---

## 7. App shell, navigation and routing

### 7.1 One shell for every role

`AppShell` takes a nav config and renders:

- **Desktop (1024px and up):** the left sidebar for all four roles, including Staff.
- **Mobile, Admin / Manager / GM:** slim top bar and slide-in drawer (what exists now).
- **Mobile, Staff:** a **bottom tab bar** with Leads, Customers, Alerts. Three destinations do not need a hamburger, and bottom tabs are reachable with a thumb.

The user menu becomes a light `Menu` matching the sidebar. Profile and Change password become proper `Dialog`s.

### 7.2 Navigation

| Role | Now | Proposed |
|---|---|---|
| Staff | Leads, Pipeline, Notifications | Leads, Customers, Alerts |
| Manager | Data Centre, My Team Matrix, Activity, Customer Pipeline, Directory | Leads, Performance, Activity, Customers, Team |
| Admin | Data Centre, Global Matrix, Activity Hub, Customer Pipeline, Directory, Feedback Hub, Web Leads | Overview, Leads, Performance, Activity, Customers, Web leads, Team, Feedback, Settings |
| GM | Global Matrix, Directory | Performance, Team |

"Pipeline" becomes "Customers" because that is what the table holds and what people call them. Keep "Pipeline" if that is the word your team actually uses.

### 7.3 Put the location in the URL

Today only Staff stores the active tab in the URL. For everyone else, refresh drops you back on the first tab, the back button leaves the app, and you cannot send someone a link to a screen. Opening an agent profile replaces the entire dashboard, sidebar included.

Proposal: add React Router.

- `/leads`, `/performance`, `/activity`, `/customers`, `/customers/:id`, `/team`, `/team/:email`, `/web-leads`, `/feedback`, `/settings`
- Agent profile and customer detail become routes inside the shell, so the sidebar stays and Back works.
- Needs a `vercel.json` rewrite so deep links resolve.

This is the only structural change in the plan. See open question 6 for a lighter alternative.

---

## 8. Screen by screen

Each entry: what is wrong, what it becomes, and any behaviour change. Behaviour changes are marked **[behaviour]** and each needs your yes before it is built.

### 8.1 Staff: Leads list (`StaffLeadsTab`, 237 lines)

The most-used screen in the product.

**Now:** five coloured count tiles, a search box, a filter, then ten cards per page. Every card has a coloured left border, a tinted background, a `#` index chip, a native status select and two buttons. Tapping Call marks the lead "Called" the instant the link is tapped, whether or not the call connects.

**Proposed:**

- Header row: title, total count, search. Filter becomes a horizontally scrolling row of chips with counts (All 700, Pending 50, Called 0 ...), which replaces the five tiles and the select in one control.
- Each row: phone number in 16px medium with tabular figures, status badge on the right, last-activity time underneath in meta text. No tinted backgrounds, no left stripe.
- One primary action per row: a 44px Call button. Tapping anywhere else on the row opens the detail.
- 25 per page, with "Load more" on mobile instead of numbered pagination.
- Pull the count tiles' information into the chips so nothing is lost.

**[behaviour] Outcome sheet.** Instead of marking "Called" on tap, when the agent returns to the app after the dialer, a bottom sheet asks "How did it go?" with large buttons: No answer, Not interested, Interested, Wrong number. One tap sets the status and closes. This stops "Called" counts being inflated by accidental taps and saves opening the select. It changes what the "Called" number means, so it needs your decision (open question 3).

**[behaviour] Work-through mode.** A "Start calling" button that shows one lead at a time, full screen, with Call, WhatsApp, SMS, the outcome buttons and Next. An agent with 700 pending leads should not be scrolling a list. This is the highest-value UX item in the plan and also the one most worth trying with two or three real agents before rolling out (open question 4).

### 8.2 Staff: Lead detail (`StaffLeadDetailView`, 311 lines)

**Now:** a separate page with a 36px black-weight phone number, three differently coloured expandable panels (blue call, slate SMS, green WhatsApp), each with its own script editor in its own colour, then notes, then a file upload.

**Proposed:** a bottom sheet on mobile and a side panel on desktop, so the list stays in place behind it.

- Top: number, status badge, Call button.
- "Message" section with a WhatsApp / SMS toggle, the script preview, Send, and an "Edit my script" link that opens one shared editor. One layout instead of two colour-coded copies.
- Notes: textarea that saves on blur with a small "Saved" confirmation, instead of a separate Save button that is easy to forget.
- Document: one upload row with file name, View and Remove.
- The WhatsApp / WhatsApp Business choice moves to the profile, since it is a per-person setting and not a per-lead one.

### 8.3 Staff: Alerts (`StaffNotificationsTab`, 140 lines)

Plain list grouped by day. Birthday reminders lose the party emoji and get a cake icon and a "Send wishes" action. Empty state is one line of text.

### 8.4 Customers (pipeline): shared by all roles

The largest area: `CustomerDetailsModal` (787), `AllCasesTable` (412), `AddCustomerForm` (392), `OverviewStats` (359), plus three near-identical page wrappers.

**Now:** three page components that differ by a few lines. The detail modal is 787 lines with view mode and edit mode as two separate layouts. A whole-form validator blocks unrelated edits, which is the bug fixed in `40b26cd`.

**Proposed:**

- One `CustomersPage` taking a `scope` prop (own, team, all) instead of three files.
- Stat row: four neutral `Stat`s. "Birthdays this week" becomes a filter chip, not a stat tile.
- Table through `DataTable`: Customer, IC, Agent (hidden for staff), Status, Updated.
- Detail becomes a route (`/customers/:id`) as a side panel on desktop and a full page on mobile, split into sections: Details, Financials, Documents, Notes, Reminders.
- **[behaviour] Edit per section, not one global edit mode.** Each section has its own Edit and Save. Reassigning an agent can never again be blocked by a phone field in a different section. This removes the class of bug, not just the one instance.
- Field-level validation with the message under the field, plus a `Banner` at the top of the section if save fails.
- Add customer becomes a `Dialog` with the same `Field` components, and IC number auto-fills date of birth as it does now.

### 8.5 Manager

- **Leads** (was Data Centre): two cards, "Import numbers" and "Distribute to team", restyled. The import card's "Extract mode" pair of big buttons becomes a two-option segmented control with one line of help text.
- **Performance** (was My Team Matrix): one sortable `DataTable` of agents. Charts move below the table and lose their gradient frames.
- **Activity:** review queue as a list. Each item says who, what changed and when, with Mark reviewed. Bulk "Mark all reviewed" at the top.
- **Team** (was Directory): table of agents with contact number and a Reassign action.

### 8.6 Admin

- **Overview (new landing page).** Today the admin lands on an upload form. An admin opening the app wants to know the state of things. Four `Stat`s (unassigned by set, assigned today, awaiting review, new web leads) and a short "Needs attention" list linking to the relevant screen. Built entirely from data already fetched by `useAdminData` and `useWebLeadsData`; no new queries.
- **Leads** (was Data Centre): Import, Assign to agent, Move to manager as three cards in that order, since that is the order the work happens. The pool counts appear once, at the top, instead of inside the Assign card.
- **Performance** (was Global Matrix): the dark gradient hero banner with five tiles becomes a plain `PageHeader` and a `Stat` row. Tabs for Agents, Managers, Charts. Tables are sortable by any numeric column.
- **Team** (was Directory, 598 lines): this file currently holds four unrelated things. Split into Tabs: Managers, Agents, General managers. "Create account" becomes a `Dialog` opened from the page header. Manager cards with nested staff lists become a table with an expandable row.
- **Activity:** same component as Manager's, with wider scope.
- **Web leads:** rebuilt with `DataTable` and neutral styling. The emerald gradient header goes. It stays visually separate from cold-call leads by being its own nav item and its own page title, which is enough.
- **Feedback:** list with type, who, when, message, and a status select.
- **Settings (new):** the two maintenance actions move here, out of the daily landing page. Each uses the destructive `ConfirmDialog` that requires typing the word DELETE. "Clear selected set", which today deletes every unassigned number in a set behind a single OK, moves here too and gets the same treatment. **[behaviour]**

### 8.7 General manager

Same Performance and Team components as Admin, scoped to their managers. The 312-line `GMDashboard` mostly disappears into shared components.

### 8.8 Login, gates and system screens

- **Login:** the centred card stays. It gets tokens, `Field` components, the title "Sign in", and loses the encryption line.
- **Contact-number gate** (`App.jsx`): restyled as a `Dialog`. Same behaviour.
- **Error boundary:** plain message and a Reload button. Distinguish "new version available" from a real error, since they are different situations and the current screen calls both "Connection Lost".
- **Loading:** skeletons shaped like the content instead of centred "Loading workspace..." text.

---

## 9. Cross-cutting UX fixes

These apply everywhere and are built into the components, not done screen by screen.

1. **No silent failures.** Several handlers do `if (!error) { ... }` and do nothing otherwise (for example `handleAssignManager` in `AdminDirectoryTab`). Every mutation gets a failure path that tells the user. A small `useMutationWithToast` helper makes the right thing the easy thing.
2. **Errors next to the cause.** Field errors under the field. Form-level errors in a `Banner` at the top of the form. Toasts are for confirmations ("Saved"), not for telling someone their form is invalid.
3. **Buttons show progress.** `Button loading` replaces the mix of text swaps ("Assigning...", "Creating...") and disabled-with-no-feedback.
4. **Destructive actions are graded.** Reversible: just do it and offer Undo in the toast. Single-item irreversible: confirm. Bulk irreversible: typed confirm.
5. **Consistent dates and numbers.** One `formatDate`, one `formatRelative`, one `formatCount` in `utils.js`. Today there are several `toLocaleDateString` variants.
6. **Keyboard.** Escape closes overlays. Enter submits forms. Focus is visible and returns to the trigger when a dialog closes.
7. **Long lists.** Tables that can exceed a few hundred rows paginate on the server, the way the agent profile now does.

---

## 10. Accessibility baseline

Not a separate project; these fall out of the components.

- Every input has a connected label (`Field`).
- Every icon-only button has a name (`IconButton` requires it).
- Dialogs trap focus, close on Escape, restore focus, and are announced.
- Text contrast is at least 4.5:1, including muted text. The token values in section 5 meet this.
- Touch targets are at least 44px on staff screens.
- Status is never colour alone: every badge has text.
- `prefers-reduced-motion` respected.
- Visible focus ring on everything focusable.

---

## 11. Rollout

Seven phases. Each is its own branch and PR, each can ship alone, and the app is fully working between any two. Estimates are focused working time and are ranges because phases 3 and 4 depend on how the behaviour questions are answered.

### Phase 0: Decisions and baseline (half a day)

- Answer the open questions in section 14.
- Test accounts for agent, manager and GM (I only have admin).
- Screenshot every screen for every role at 375px and 1280px as the "before" set.
- Add `scripts/ui-audit.mjs`, which prints the counts from section 13.

**Done when:** questions answered, screenshots saved, audit script prints today's baseline.

### Phase 1: Foundations (2 to 3 days)

- Tokens in `index.css`, font weights trimmed, `App.css` deleted.
- All `ui/` components built, with a private `/ui` route that shows every component in every state, for review.
- ESLint guardrail added in warn mode (section 12).

**Done when:** you have looked at the `/ui` page and are happy with how a button, a field, a table, a badge and a dialog look. **This is the checkpoint that matters most.** Changing direction here costs an hour. Changing it after phase 4 costs days.

Nothing users see changes in this phase.

### Phase 2: Shell and routing (2 days)

- `AppShell` for all four roles, bottom tabs for Staff on mobile.
- React Router, `vercel.json` rewrite.
- New user menu, Profile and Change password dialogs, one `FeedbackDialog`.
- Navigation renames, if approved.
- Delete `NavSlider`, the three pasted feedback modals, the scroll-hide logic in `StaffDashboard`.

**Done when:** all four roles have the same frame, refresh keeps your place, Back works, and the content inside is still the old screens.

### Phase 3: Staff (3 to 4 days)

Leads list, lead detail, alerts. Outcome sheet and work-through mode if approved.

**Done when:** an agent can sign in on a phone, call, record an outcome, send a WhatsApp script, add a note and upload a document, entirely on new components. Tested on a real iPhone and a real Android, not just the emulator.

Tell the agents before this ships. It is the screen they use all day.

### Phase 4: Customers (3 days)

The shared pipeline screens for all roles, per-section editing.

**Done when:** the three page wrappers are one, `CustomerDetailsModal.jsx` is gone, and add, edit, reassign, document upload, notes and reminders all work for staff, manager and admin.

### Phase 5: Manager (2 days)

Leads, Performance, Activity, Team.

### Phase 6: Admin and GM (4 days)

Overview, Leads, Performance, Team, Activity, Web leads, Feedback, Settings. GM falls out of the shared components.

### Phase 7: Finish (2 days)

- Login, gate, error and loading screens.
- Accessibility pass with a keyboard and a screen reader on the main flows.
- Delete dead code. Guardrail switched from warn to error.
- "After" screenshots beside the "before" set.

**Done when:** the audit script shows the targets in section 13 and lint is clean with the guardrail on error.

### Total

Roughly 18 to 21 working days. Phases 1 to 3 (about 8 days) deliver the foundation and the screen most of your users live in. If you had to stop anywhere, stop there.

---

## 12. Guardrails

Without these it drifts back within a month, because the next feature gets written the fast way.

1. **Lint rule.** `no-restricted-syntax` on `className` strings outside `src/ui/`, banning: `font-black`, `font-extrabold`, `uppercase`, `tracking-*`, `bg-gradient-*`, `backdrop-blur*`, `shadow-2xl`, arbitrary `text-[..px]`, arbitrary `z-[..]`, and raw palette classes such as `bg-indigo-600` or `text-gray-500`. Warn in phase 1, error in phase 7.
2. **Audit script.** `npm run ui:audit` prints the table in section 13. Run it in every PR description so progress is visible.
3. **A short `docs/ui-guidelines.md`.** One page: the tokens, the component list, the voice rules. This is what gets handed to anyone, human or AI, before they add a screen.
4. **`CLAUDE.md` note** pointing at that file, so future sessions use `ui/` components instead of inventing styles again. This is the specific failure that produced the current state.

---

## 13. Baseline and targets

| Metric | Today | Target |
|---|---|---|
| `font-black` + `font-extrabold` | 270 | 0 |
| `font-bold` | 492 | 0 (500 and 600 only, via components) |
| `uppercase` | 180 | 0 |
| `tracking-wide*` | 123 | 0 |
| Arbitrary pixel font sizes | 88 | 0 |
| Gradients | 37 | 0 |
| `backdrop-blur` | 16 | 0 |
| `animate-in` | 47 | overlays only, inside `ui/` |
| Distinct radius values | 7 | 2, plus full |
| Distinct shadow levels | 6 | 2 |
| Colour families referenced in screens | 16 | 0 raw; tokens only |
| Hex or rgba literals in JSX | ~80 | 0 |
| Emoji or glyph icons | 125 | 0 |
| Duplicated mobile and desktop views | 14 | 0 |
| Hand-built modal overlays | 13 | 0 |
| Distinct z-index literals | 8 | 3 named |
| Labels connected to inputs | 0 of 62 | all |
| `aria-label` on icon-only buttons | 2 | all |
| "Loading..." text states | 27 | 0 |
| Inter weights loaded | 7 | 3 |
| Largest component file | 787 lines | under 300 |

---

## 14. Open questions

These need your answer before phase 1 or the phase noted. My recommendation is given for each so you can just say "go with your picks".

1. **Brand colour.** (a) Keep indigo as the main colour. (b) Near-black primary buttons with indigo only for selection and links. (c) Match the FZS landing page: navy and amber. **Recommend (b).** If this may ever be sold to another company, (b) is also the easiest to re-skin.
2. **Is this FZS-only, or might it be resold?** Affects whether "Tele Manager" and the globe logo are hard-coded or configurable. **Recommend** making the name and accent one config value regardless; it costs nothing now.
3. **Outcome sheet instead of auto-marking "Called"** (8.1). Changes what the Called number means. **Recommend yes**, but it is your reporting, so it is your call.
4. **Work-through mode** (8.1). **Recommend yes**, piloted with two or three agents first.
5. **Rename navigation** (4.6, 7.2). **Recommend yes**, once, with a heads-up to the team. Keep any term your staff genuinely use, especially "Pipeline".
6. **Routing.** (a) React Router. (b) Extend the `?tab=` approach Staff already uses. **Recommend (a).** (b) is less work and still fixes refresh, but not the agent-profile takeover.
7. **Headless library for overlays.** Radix or Base UI, about 30 KB. **Recommend yes.** The alternative is hand-writing focus management.
8. **Language.** The UI is English; the landing page and likely most agents are Bahasa Melayu. A BM option is out of scope here, but if you want it later I will keep all strings in one place now so it is cheap to add. **Recommend** keeping strings together, no translation yet.
9. **Which lead statuses are real?** `SMS Sent` and `Thinking` are treated as the same thing in several places. Worth cleaning up while the status map is being centralised. Needs your knowledge of how the team uses them.
10. **Admin and manager devices.** If managers mostly use phones, their tables get the same care as staff screens. If desktop, they can be denser.
11. **Web lead statuses.** You removed Qualified, Converted and Junk from the header. Remove them from the dropdown too?

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| 157 agents use the staff screen all day; a regression there stops work. | Staff phase tested on real phones against a checklist; shipped at a quiet time; previous deployment kept one click away on Vercel. |
| Restyle and behaviour change tangled together make bugs hard to trace. | Behaviour changes are listed and marked in section 8. Everything else is like-for-like. Each lands in its own commit. |
| I can only sign in as admin. | Test accounts for the other three roles in phase 0. Without them, phases 3 and 5 cannot be verified. |
| Another session edits the same files, as happened with Web Leads. | One session works on the redesign branch at a time. |
| Direction is wrong and it is discovered late. | The `/ui` review at the end of phase 1 exists for exactly this. |
| Scope creep into new features. | Section 3 non-goals. New ideas go on a list for afterwards. |

---

## 16. What I need from you to start

1. Answers to section 14, or "go with your recommendations".
2. Test logins for one agent, one manager and one GM.
3. A yes on phase 1, after which the first thing you will see is the `/ui` review page.

---

## 17. Decisions (answered 2026-10-05)

The owner's overall steer: **this is a redesign of the interface, not a change to how the app works.** Keep behaviour as it is unless listed here.

| # | Question | Decision |
|---|---|---|
| 1 | Brand colour | **Match the FZS landing page: navy and gold.** Indigo is out. Values taken from `landing page fzs/tailwind.config.js`: navy `#0A1F3D`, gold `#F5A524`, sand `#FBF8F3`. The landing page's typeface is DM Sans, so the redesign uses **DM Sans** (self-hosted) instead of Inter. This supersedes sections 4.2, 4.3 and 5 where they say Inter or indigo; `src/index.css` holds the real token values. |
| 2 | Resale | Product name and accent stay in one config place. |
| 3 | Outcome sheet | **No.** Tapping Call keeps marking the lead "Called", exactly as today. |
| 4 | Work-through mode | Yes, as an addition, piloted with a few agents. The list stays. |
| 5 | Rename navigation | Yes. |
| 6 | Routing | React Router. |
| 7 | Headless overlays | Yes. `radix-ui` is installed. |
| 8 | Language | **A Bahasa Melayu toggle is wanted.** `src/i18n/` exists; every new string goes through `t()`. The BM text needs a read-through by a native speaker. |
| 9 | Lead statuses | Remove `Thinking`. It displays as "SMS sent" via an alias in `ui/status.js`. 6 rows still hold `Thinking` and 10 hold `Called (No Answer)`; **the data has not been changed**. Ask before running any update. |
| 10 | Devices | Admins and managers use both phone and desktop, so their tables get the same mobile care as staff screens. |
| 11 | Web lead statuses | Dropdown keeps New, Contacted, Converted, Junk. Qualified is dropped from the UI only. |

How to work, as asked by the owner: after building anything visible, **look at it** (screenshots at 375px and 1280px), judge whether it is good enough, fix what is wrong, and sign in to the running app to see real screens live.

## 18. Progress

Branch: `ui-redesign`. Nothing here is merged to `main`, and `main` must not be pushed without the owner's say-so.

**Phase 1 (foundations), in progress.**

Done:

- Tokens in `src/index.css` (`@theme`). Old screens are unaffected: they keep Inter through the `html, body` rule until the shell is migrated.
- `src/i18n/`: `strings.js` (en, ms), `LanguageProvider`, `useT`.
- `src/ui/`: `cn.js`, `Button.jsx` (Button, IconButton), `fieldContext.js`, `Field.jsx` (Field, Input, Textarea, Select, Checkbox), `status.js`, `Badge.jsx` (Badge, StatusBadge, CountBadge), `Card.jsx` (Card, CardHeader, CardBody, CardFooter, PageHeader), `Stat.jsx`, `Misc.jsx` (Avatar, EmptyState, Skeleton, Banner), `Controls.jsx` (Tabs, SegmentedControl, FilterChips, NavItem).
- Dependencies: `radix-ui`, `@fontsource-variable/dm-sans`.

**None of the above has been rendered or looked at yet.** It is written but unverified.

Still to do in phase 1:

1. `ui/DataTable.jsx` (one column definition renders a table at `md` and up and stacked rows below; client-side sort; loading and empty states) and `Pagination`.
2. `ui/Dialog.jsx` on Radix (bottom sheet under `sm`) and `ConfirmDialog` with a typed-word mode.
3. `ui/Menu.jsx` (Radix dropdown) and `ui/Combobox.jsx` (Radix popover, searchable, keyboard navigable, works inside `Field`).
4. `ui/index.js` barrel.
5. `import '@fontsource-variable/dm-sans'` in `main.jsx`.
6. Review page at `/?ui`, dev only: every component in every state, plus one composed sample screen (page header, stats, filter chips, table, pagination) and a language toggle. Lazy-load both it and `App` from `main.jsx`, so the review page opens without Supabase env vars.
7. ESLint guardrail (`no-restricted-syntax` on class strings) as an **error**, scoped to `src/ui/**` and `src/i18n/**` for now; widen the glob as each screen is migrated. This replaces the "warn everywhere" idea in section 12, which would bury real lint output.
8. `frontend/scripts/ui-audit.mjs` and an `npm run ui:audit` script printing the section 13 metrics.
9. Screenshot the review page at 375px and 1280px, in English and BM, and fix what looks wrong. Things to judge specifically: whether the warm line and sunken colours sit well on white cards, the gold tab underline, badge radius, and focus rings.

Then **stop for the owner's review** of the look before touching any real screen.

Tailwind v4 notes learned so far:

- Do not combine `outline-none` with `focus-visible:outline-2`; v4's `outline-none` zeroes the style variable. Use `outline-hidden`, or leave it off.
- `-translate-x-1/2` uses the `translate` property, so keyframes must not also set `transform: translate(...)` or the offsets stack.
- Use `aria-[invalid=true]:` rather than `aria-invalid:`.

Still needed from the owner: test logins for an agent, a manager and a GM.
