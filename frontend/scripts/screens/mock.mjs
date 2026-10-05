// A fake Supabase for Playwright. Every request to the fake project URL is
// answered from fixtures.mjs, so screenshot runs never touch the real database.

import { USERS, profiles, rpc, tables } from './fixtures.mjs'

export const FAKE_URL = 'http://fake.supabase.test'
const STORAGE_KEY = 'sb-fake-auth-token' // supabase-js: sb-<first host label>-auth-token

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')

function session(email) {
  const profile = profiles.find((p) => p.email === email)
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 365
  const user = {
    id: `user-${profile.id}`,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  }
  return {
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email, role: 'authenticated', exp })}.fake`,
    refresh_token: 'fake-refresh',
    token_type: 'bearer',
    expires_in: 3600 * 24 * 365,
    expires_at: exp,
    user,
  }
}

// ─── PostgREST, roughly ──────────────────────────────────────────────────────

function parseValue(raw) {
  if (raw === 'null') return null
  if (raw === 'true') return true
  if (raw === 'false') return false
  return raw.replace(/^"|"$/g, '')
}

function matches(row, column, expr) {
  const dot = expr.indexOf('.')
  let op = expr.slice(0, dot)
  let raw = expr.slice(dot + 1)
  let negate = false
  if (op === 'not') {
    negate = true
    const next = raw.indexOf('.')
    op = raw.slice(0, next)
    raw = raw.slice(next + 1)
  }
  const value = row[column]
  let ok
  switch (op) {
    case 'eq':
      ok = String(value) === String(parseValue(raw))
      break
    case 'neq':
      ok = String(value) !== String(parseValue(raw))
      break
    case 'in': {
      const list = raw.replace(/^\(|\)$/g, '').split(',').map(parseValue)
      ok = list.map(String).includes(String(value))
      break
    }
    case 'is':
      ok = parseValue(raw) === null ? value == null : value === parseValue(raw)
      break
    case 'lte':
      ok = String(value) <= raw
      break
    case 'gte':
      ok = String(value) >= raw
      break
    case 'lt':
      ok = String(value) < raw
      break
    case 'gt':
      ok = String(value) > raw
      break
    case 'ilike':
    case 'like': {
      const re = new RegExp('^' + raw.replace(/[%*]/g, '.*') + '$', op === 'ilike' ? 'i' : '')
      ok = re.test(String(value ?? ''))
      break
    }
    default:
      ok = true // filters the mock does not understand are ignored
  }
  return negate ? !ok : ok
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'or', 'and', 'on_conflict', 'columns'])

function query(table, params) {
  let rows = tables[table] ?? []
  for (const [key, expr] of params) {
    if (RESERVED.has(key) || key.includes('.')) continue
    rows = rows.filter((row) => matches(row, key, expr))
  }
  const order = params.get('order')
  if (order) {
    const [column, dir] = order.split(',')[0].split('.')
    rows = [...rows].sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * (dir === 'desc' ? -1 : 1))
  }
  return rows
}

async function handleRest(route, request, url) {
  const path = url.pathname.replace('/rest/v1/', '')
  const method = request.method()
  const headers = request.headers()

  if (path.startsWith('rpc/')) {
    const name = path.slice(4)
    const body = request.postDataJSON?.() ?? {}
    const data = rpc[name] ? rpc[name](body) : []
    return route.fulfill({ json: data })
  }

  const table = path
  const params = url.searchParams
  let rows = query(table, params)

  if (method === 'PATCH') {
    const patch = request.postDataJSON() ?? {}
    rows.forEach((row) => Object.assign(row, patch))
    return route.fulfill({ status: 200, headers: { 'content-range': `*/${rows.length}` }, json: rows })
  }
  if (method === 'POST') {
    const body = request.postDataJSON()
    const inserted = (Array.isArray(body) ? body : [body]).map((row, i) => ({ id: `new-${Date.now()}-${i}`, created_at: new Date().toISOString(), ...row }))
    tables[table]?.push(...inserted)
    return route.fulfill({ status: 201, json: inserted })
  }
  if (method === 'DELETE') {
    return route.fulfill({ status: 200, headers: { 'content-range': `*/${rows.length}` }, json: rows })
  }

  const total = rows.length
  const range = headers['range']
  if (range) {
    const [from, to] = range.split('-').map(Number)
    rows = rows.slice(from, to + 1)
  } else if (params.get('limit')) {
    const offset = Number(params.get('offset') || 0)
    rows = rows.slice(offset, offset + Number(params.get('limit')))
  }
  const contentRange = `0-${Math.max(0, rows.length - 1)}/${total}`

  if (method === 'HEAD') {
    return route.fulfill({ status: 200, headers: { 'content-range': contentRange }, body: '' })
  }
  if ((headers['accept'] || '').includes('vnd.pgrst.object')) {
    if (!rows[0]) return route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'No rows' } })
    return route.fulfill({ json: rows[0], headers: { 'content-range': contentRange } })
  }
  return route.fulfill({ json: rows, headers: { 'content-range': contentRange } })
}

/**
 * Wire the fake backend into a Playwright context. With `as`, the browser
 * starts signed in as that user ('admin' | 'manager' | 'gm' | 'agent').
 */
export async function installMock(context, { as, lang = 'en' } = {}) {
  await context.route(`${FAKE_URL}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.startsWith('/rest/v1/')) return handleRest(route, request, url)
    if (url.pathname.startsWith('/auth/v1/token')) {
      const { email } = request.postDataJSON() ?? {}
      if (!profiles.some((p) => p.email === email)) {
        return route.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } })
      }
      return route.fulfill({ json: session(email) })
    }
    if (url.pathname.startsWith('/auth/v1/user')) {
      const auth = request.headers()['authorization'] || ''
      const payload = JSON.parse(Buffer.from(auth.split('.')[1] || 'e30', 'base64url').toString())
      return route.fulfill({ json: session(payload.email ?? USERS.admin.email).user })
    }
    if (url.pathname.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204, body: '' })
    if (url.pathname.startsWith('/storage/v1/')) return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await context.routeWebSocket(/fake\.supabase\.test/, () => {})

  const stored = as ? JSON.stringify(session(USERS[as].email)) : null
  await context.addInitScript(
    ([key, value, language]) => {
      try {
        localStorage.setItem('telemanager_lang', language)
        if (value) localStorage.setItem(key, value)
        else localStorage.removeItem(key)
      } catch {
        // ignore
      }
    },
    [STORAGE_KEY, stored, lang]
  )
}
