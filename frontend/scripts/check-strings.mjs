#!/usr/bin/env node
// Checks src/i18n/strings.js: no key defined twice in a language (a later
// duplicate silently wins), and every English key exists in Bahasa Melayu.
// Singular `.one` keys are English-only by design.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const path = fileURLToPath(new URL('../src/i18n/strings.js', import.meta.url))
const source = readFileSync(path, 'utf8')
const { STRINGS } = await import(path)

let problems = 0
const msStart = source.indexOf('\n  ms: {')
for (const [lang, text] of [['en', source.slice(0, msStart)], ['ms', source.slice(msStart)]]) {
  const seen = new Set()
  for (const [, key] of text.matchAll(/^\s+'([^']+)':/gm)) {
    if (seen.has(key)) {
      console.log(`${lang}: "${key}" is defined more than once`)
      problems++
    }
    seen.add(key)
  }
}
for (const key of Object.keys(STRINGS.en)) {
  if (!key.endsWith('.one') && !(key in STRINGS.ms)) {
    console.log(`ms: missing "${key}"`)
    problems++
  }
}
console.log(problems ? `${problems} problem(s)` : `strings ok: ${Object.keys(STRINGS.en).length} keys`)
process.exitCode = problems ? 1 : 0
