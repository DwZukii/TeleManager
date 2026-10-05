#!/usr/bin/env node
// Prints the styling metrics from docs/ui-redesign-plan.md section 13, so each
// redesign PR can show how far the old patterns have been removed.
//
//   npm run ui:audit
//
// "Screens" means everything in src/ except the new kit (src/ui, src/i18n),
// which is held to the rules by ESLint instead. Counts come from regexes over
// the source, so they are approximate; the trend is what matters.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const src = join(root, 'src')
const KIT = [join(src, 'ui'), join(src, 'i18n')]

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

const files = walk(src)
  .filter((path) => !KIT.some((kit) => path.startsWith(kit)))
  .map((path) => ({ path, text: readFileSync(path, 'utf8') }))

const count = (re) => files.reduce((sum, f) => sum + (f.text.match(re) ?? []).length, 0)
const distinct = (re, pick = (m) => m[0]) => {
  const seen = new Set()
  for (const f of files) for (const m of f.text.matchAll(re)) seen.add(pick(m))
  return seen
}

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

const radii = distinct(/\brounded(?:-(?:none|xs|sm|md|lg|xl|2xl|3xl|full|control|card))?(?=[\s"'`])/g)
radii.delete('rounded-none')
const shadows = distinct(/\bshadow(?:-(?:xs|sm|md|lg|xl|2xl|inner|popover|dialog))?(?=[\s"'`])/g)
const families = distinct(new RegExp(`\\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline)-(${PALETTE})-\\d{2,3}\\b`, 'g'), (m) => m[1])
const zLiterals = distinct(/\bz-(?:\[\d+\]|\d+)(?![\w-])/g)

// Emoji and the arrow/cross glyphs used as icons, inside JSX text or strings.
const emoji = count(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2715}\u{2716}]/gu)

const labels = count(/<label\b/g)
const connectedLabels = count(/<label\b[^>]*\bhtmlFor=/g)

// A list drawn once for phones (`sm:hidden`) and again for desktop
// (`hidden sm:block`), at any breakpoint. Counted as pairs per file.
const duplicatedViews = files.reduce((sum, f) => {
  const mobile = (f.text.match(/\b(?:sm|md|lg):hidden\b/g) ?? []).length
  const desktop = (f.text.match(/\bhidden (?:sm|md|lg):(?:block|table|flex|grid)\b/g) ?? []).length
  return sum + Math.min(mobile, desktop)
}, 0)

const largest = files
  .map((f) => ({ path: relative(root, f.path), lines: f.text.split('\n').length }))
  .sort((a, b) => b.lines - a.lines)[0]

const html = readFileSync(join(root, 'index.html'), 'utf8')
const interWeights = (html.match(/family=Inter:wght@([\d;]+)/)?.[1] ?? '').split(';').filter(Boolean).length

const rows = [
  ['font-black + font-extrabold', count(/\bfont-(?:black|extrabold)\b/g), '0'],
  ['font-bold', count(/\bfont-bold\b/g), '0'],
  ['uppercase', count(/(?<![\w-])uppercase\b/g), '0'],
  ['tracking-* (letter-spacing)', count(/\btracking-\w+/g), '0'],
  ['Arbitrary pixel font sizes', count(/\btext-\[\d+(?:\.\d+)?px\]/g), '0'],
  ['Gradients', count(/\bbg-(?:gradient|linear|radial|conic)-/g), '0'],
  ['backdrop-blur', count(/\bbackdrop-blur/g), '0'],
  ['animate-in', count(/\banimate-in\b/g), '0 outside src/ui'],
  ['Distinct radius values', radii.size, '2, plus full'],
  ['Distinct shadow levels', shadows.size, '2'],
  ['Colour families referenced', families.size, '0 raw'],
  ['Hex or rgba literals', count(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])|rgba?\(/g), '0'],
  ['Emoji or glyph icons', emoji, '0'],
  ['Duplicated mobile/desktop views', duplicatedViews, '0'],
  ['Hand-built overlays (fixed inset-0)', count(/\bfixed inset-0\b/g), '0'],
  ['Distinct z-index literals', zLiterals.size, '3 named'],
  ['Labels connected to inputs', `${connectedLabels} of ${labels}`, 'all'],
  ['aria-label uses', count(/\baria-label=/g), 'every icon-only button'],
  ['"Loading..." text states', count(/Loading[\w ]{0,30}(?:\.\.\.|…)/g), '0'],
  ['Inter weights loaded', interWeights, '0 (DM Sans, self-hosted)'],
  ['Largest screen file', `${largest.lines} lines (${largest.path})`, 'under 300'],
]

const w0 = Math.max(...rows.map((r) => r[0].length), 'Metric'.length)
const w1 = Math.max(...rows.map((r) => String(r[1]).length), 'Now'.length)
const line = (a, b, c) => `| ${a.padEnd(w0)} | ${String(b).padEnd(w1)} | ${c} |`

console.log(`UI audit: ${files.length} screen files (src/ui and src/i18n excluded)\n`)
console.log(line('Metric', 'Now', 'Target'))
console.log(`|${'-'.repeat(w0 + 2)}|${'-'.repeat(w1 + 2)}|--------|`)
for (const [a, b, c] of rows) console.log(line(a, b, c))
