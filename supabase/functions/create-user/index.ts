// create-user: makes a login and its staff profile in one go.
//
// Public sign-up is switched off, so this is the only way an account is made.
// It runs with the service role, so it checks the caller itself:
//
//   admin (super_admin)  any of agent, manager or general manager. An agent can
//                        get a manager; a general manager a set of managers.
//   manager              an agent on their own team, nothing else
//
// The email is saved in lower case, the way sign-in stores it, so the profile
// always matches the login. The password is the one typed, and the account is
// ready to use at once (no confirmation email).
//
// An email that already has a staff profile is refused. An old login with that
// email but no profile can't use the app; it is replaced by a new one, so only
// the password typed here works and nobody stays signed in to it.
//
// Request (POST, JSON):
//   { email, password, fullName?, role?, managerEmail?, gmManagers? }
//   role, managerEmail and gmManagers are only read from an admin.
//
// Answers { ok: true, email } or { error, code }, where code is one of
// unauthorized, forbidden, bad_email, short_password, bad_role, bad_manager,
// exists (with role), auth, profile, gm_link (account made, managers not linked).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ROLES = ['agent', 'manager', 'general_manager']
// No spaces, one @, a dot in the domain. `*` is left out because the profile
// lookup below uses it as a wildcard.
const EMAIL = /^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/
const MIN_PASSWORD = 6

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// For an ilike match that means "this exact text, any capitals".
const literal = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`)

async function findLogin(admin: SupabaseClient, email: string) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < 1000) return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.', code: 'method' })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return reply(401, { error: 'Not signed in.', code: 'unauthorized' })

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const callerClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()
    if (!caller?.email) return reply(401, { error: 'Not signed in.', code: 'unauthorized' })

    const { data: callerProfile } = await admin.from('profiles').select('role').eq('email', caller.email).maybeSingle()
    const callerRole = callerProfile?.role
    if (callerRole !== 'super_admin' && callerRole !== 'manager') {
      return reply(403, { error: 'Only admins and managers can create accounts.', code: 'forbidden' })
    }

    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const fullName = String(body.fullName ?? '').trim()
    if (!EMAIL.test(email)) return reply(400, { error: 'That email address does not look right.', code: 'bad_email' })
    if (password.length < MIN_PASSWORD) {
      return reply(400, { error: `The password needs at least ${MIN_PASSWORD} characters.`, code: 'short_password' })
    }

    // What the new account is. A manager can only add an agent to their own team.
    let role = 'agent'
    let managerEmail: string | null = caller.email
    let gmManagers: string[] = []
    if (callerRole === 'super_admin') {
      role = String(body.role ?? '')
      if (!ROLES.includes(role)) return reply(400, { error: 'Pick agent, manager or general manager.', code: 'bad_role' })
      managerEmail = role === 'agent' && body.managerEmail ? String(body.managerEmail) : null
      gmManagers = role === 'general_manager' && Array.isArray(body.gmManagers) ? [...new Set(body.gmManagers.map(String))] : []
      const wanted = [...(managerEmail ? [managerEmail] : []), ...gmManagers]
      if (wanted.length > 0) {
        const { data: found, error } = await admin.from('profiles').select('email').eq('role', 'manager').in('email', wanted)
        if (error) throw error
        if ((found ?? []).length !== wanted.length) {
          return reply(400, { error: 'One of the chosen managers is no longer a manager.', code: 'bad_manager' })
        }
      }
    }

    // An existing staff profile, however its email is capitalised.
    const { data: existing, error: existingError } = await admin
      .from('profiles')
      .select('email, role')
      .ilike('email', literal(email))
      .limit(1)
    if (existingError) throw existingError
    if (existing && existing.length > 0) {
      return reply(409, { error: 'This email already has an account.', code: 'exists', email: existing[0].email, role: existing[0].role })
    }

    let { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (createError && (createError.code === 'email_exists' || /already/i.test(createError.message))) {
      const old = await findLogin(admin, email)
      if (old) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(old.id)
        if (deleteError) return reply(400, { error: deleteError.message, code: 'auth' })
        ;({ data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true }))
      }
    }
    if (createError || !created?.user) return reply(400, { error: createError?.message ?? 'Could not create the login.', code: 'auth' })

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ email, role, manager_email: managerEmail, ...(fullName && { full_name: fullName }) })
    if (profileError) {
      // No login without a profile is left behind.
      await admin.auth.admin.deleteUser(created.user.id)
      return reply(500, { error: profileError.message, code: 'profile' })
    }

    if (gmManagers.length > 0) {
      const { error: gmError } = await admin.from('profiles').update({ general_manager_email: email }).in('email', gmManagers)
      if (gmError) return reply(500, { error: gmError.message, code: 'gm_link', email })
    }

    return reply(200, { ok: true, email })
  } catch (err) {
    return reply(500, { error: err instanceof Error ? err.message : String(err), code: 'server' })
  }
})
