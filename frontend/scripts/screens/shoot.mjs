#!/usr/bin/env node
// Screenshots of real screens, signed in as each role, against fake data.
//
//   1. Start a dev server pointed at the fake backend (never the real one):
//        VITE_SUPABASE_URL=http://fake.supabase.test VITE_SUPABASE_ANON_KEY=fake \
//          npx vite --port 5174 --strictPort
//   2. node scripts/screens/shoot.mjs <outDir> [role] [path,path] [lang]
//
// With no role, shoots every role's main screens at 375px and 1280px.
// Also prints any page errors and horizontal overflow it finds.

import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { installMock } from './mock.mjs'

const require = createRequire(import.meta.url)
let playwright
try {
  playwright = require('playwright')
} catch {
  playwright = require(execSync('npm root -g').toString().trim() + '/playwright')
}

const BASE = process.env.SCREENS_BASE || 'http://localhost:5174'

export const ROUTES = {
  login: ['/'],
  admin: ['/overview', '/leads', '/performance', '/performance/agent01%40example.test', '/activity', '/customers', '/customers/00000000-0000-4000-8000-000000000001', '/web-leads', '/team', '/feedback', '/settings'],
  manager: ['/leads', '/performance', '/performance/agent01%40example.test', '/activity', '/customers', '/customers/00000000-0000-4000-8000-000000000001', '/team'],
  gm: ['/performance', '/team'],
  agent: ['/leads', '/leads/1003', '/customers', '/customers/00000000-0000-4000-8000-000000000001', '/alerts'],
}

const [outDir = 'screens-out', onlyRole, onlyPaths, lang = 'en'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const browser = await playwright.chromium.launch()
const roles = onlyRole ? [onlyRole] : Object.keys(ROUTES)
let problems = 0

for (const role of roles) {
  const paths = onlyPaths ? onlyPaths.split(',') : ROUTES[role]
  for (const width of [375, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await installMock(context, { as: role === 'login' ? null : role, lang })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && !/ERR_CERT|fonts.g/.test(m.text()) && errors.push(m.text()))

    for (const path of paths) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      const overflow = await page.evaluate(() => {
        const clipped = (e) => {
          for (let p = e.parentElement; p; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true
          return false
        }
        return [...document.querySelectorAll('body *')]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !clipped(e))
          .slice(0, 3)
          .map((e) => `${e.tagName}.${String(e.className).slice(0, 60)}`)
      })
      const name = `${role}${path.replace(/[^a-z0-9]+/gi, '-')}-${lang}-${width}`.replace(/-+$/, '')
      await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
      const issues = [...errors.splice(0), ...overflow.map((o) => `overflow: ${o}`)]
      if (issues.length) problems++
      console.log(`${issues.length ? '✗' : '✓'} ${name}${issues.length ? '\n    ' + issues.join('\n    ') : ''}`)
    }
    await context.close()
  }
}

await browser.close()
process.exitCode = problems ? 1 : 0
