# TeleManager

Telemarketing CRM for one sales team: agents call leads, managers and admins hand out numbers and track the work. React 19 + Vite + Tailwind v4 in `frontend/`, Supabase for data and auth, deployed on Vercel.

## Rules

- `main` is what live users get. Work on a branch and let the owner review before anything is merged.
- Don't change database rows or schema without asking the owner first.
- Keep behaviour as it is unless asked. Tapping Call marks a lead "Called"; that is how the team's numbers are counted.

## UI

Read `docs/ui-guidelines.md` before adding or changing a screen. In short: build screens from the kit in `frontend/src/ui` (import from `src/ui`), use the colour and shape tokens in `frontend/src/index.css`, put every visible string through `t()` with English and Bahasa Melayu in `frontend/src/i18n/strings.js`, and check the result at 375px and 1280px. Don't invent new styles; ESLint will flag most of the ways that goes wrong.

## Layout

- `frontend/src/App.jsx`: session, role lookup, and which role app to load.
- `frontend/src/roles/<Role>App.jsx`: each role's routes. Screens live in `roles/staff`, `roles/manager`, `roles/admin`, `roles/gm`, with shared ones in `roles/shared` and `roles/customers`.
- `frontend/src/shell/`: the app frame, user menu and account dialogs.
- `frontend/src/hooks/`: data loading with React Query.
- `docs/ui-redesign-plan.md`: why the UI looks the way it does, decisions made, and progress.

## Checks

From `frontend/`: `npm run lint`, `npm run check:strings`, `npm run ui:audit`, `npx vite build`. `npm run screens` screenshots every role against a fake backend (see `scripts/screens/shoot.mjs`), so screens can be checked without touching live data.
