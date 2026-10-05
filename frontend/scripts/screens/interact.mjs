// Small helper: open a page as a role and hand it to a callback.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { installMock } from './mock.mjs'

const require = createRequire(import.meta.url)
let playwright
try {
  playwright = require('playwright')
} catch {
  playwright = require(execSync('npm root -g').toString().trim() + '/playwright')
}
const BASE = process.env.SCREENS_BASE || 'http://localhost:5174'

export async function withPage({ role, width = 1280, height = 900, lang = 'en', path = '/' }, fn) {
  const browser = await playwright.chromium.launch()
  const context = await browser.newContext({ viewport: { width, height } })
  await installMock(context, { as: role, lang })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && !/ERR_CERT|fonts.g/.test(m.text()) && errors.push(m.text()))
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  try {
    await fn(page)
  } finally {
    if (errors.length) console.log('errors:', errors)
    await browser.close()
  }
}
