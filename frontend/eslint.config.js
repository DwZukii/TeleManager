import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'


// Styling guardrail for all app code (docs/ui-guidelines.md).
// Each pattern is checked against every string and template literal, because
// class names also live in lookup objects, not only in className attributes.
const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const BANNED_CLASSES = [
  ['\\bfont-(black|extrabold|bold)\\b', 'Use font-medium or font-semibold. Nothing heavier than 600.'],
  ['(^|\\s)uppercase\\b', 'No uppercase labels. Write the text in sentence case.'],
  ['(^|\\s)tracking-', 'No letter-spacing utilities.'],
  ['\\bbg-(gradient|linear|radial|conic)-', 'No gradients. Use a flat token colour.'],
  ['\\bbackdrop-blur', 'No backdrop blur.'],
  ['\\bshadow-(xs|sm|md|lg|xl|2xl|inner)\\b', 'Cards use a border. Floating things use shadow-popover or shadow-dialog.'],
  ['\\btext-\\[\\d+(\\.\\d+)?px\\]', 'No arbitrary font sizes. Use text-xs, text-sm, text-base, text-xl or text-2xl.'],
  ['\\bz-\\[', 'No arbitrary z-index. Use z-10 (sticky), z-40 (overlay) or z-50 (popover, toast).'],
  ['\\brounded-(xs|sm|md|lg|xl|2xl|3xl)\\b|(^|\\s)rounded(\\s|$)', 'Use rounded-control, rounded-card or rounded-full.'],
  [`\\b(bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|shadow)-(${PALETTE})-\\d{2,3}\\b`, 'Raw palette colour. Use a token (bg-surface, text-fg-muted, border-line, bg-brand ...).'],
  ['\\b(bg|text|border|ring)-(white|black)\\b', 'Use a token: bg-surface, text-on-brand, text-fg.'],
]
const guardrail = BANNED_CLASSES.flatMap(([pattern, message]) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
])

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...guardrail],
    },
  },
])
