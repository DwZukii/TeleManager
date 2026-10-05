// Made-up rows for screenshot runs. No real people, numbers or customers.
// Shapes follow the public schema (leads, profiles, customers, ...).

const DAY = 86_400_000
const now = Date.now()
const iso = (msAgo) => new Date(now - msAgo).toISOString()
const date = (msAgo) => iso(msAgo).slice(0, 10)

export const USERS = {
  admin: { email: 'admin@example.test', role: 'super_admin' },
  manager: { email: 'manager.a@example.test', role: 'manager' },
  gm: { email: 'gm@example.test', role: 'general_manager' },
  agent: { email: 'agent01@example.test', role: 'agent' },
}

const NAMES = [
  'Test Agent One', 'Sample Agent Two', 'Demo Agent Three', 'Example Agent Four', 'Placeholder Agent Five',
  'Test Agent Six', 'Sample Agent Seven', 'Demo Agent Eight', 'Example Agent Nine', 'Placeholder Agent Ten',
  'Test Agent Eleven', 'Sample Agent Twelve',
]

let id = 1
export const profiles = [
  { id: id++, email: USERS.admin.email, role: 'super_admin', full_name: 'Test Admin', contact_number: '0120000000', manager_email: null, general_manager_email: null },
  { id: id++, email: USERS.gm.email, role: 'general_manager', full_name: 'Test General Manager', contact_number: '0120000001', manager_email: null, general_manager_email: null },
  { id: id++, email: USERS.manager.email, role: 'manager', full_name: 'Test Manager A', contact_number: '0120000002', manager_email: null, general_manager_email: USERS.gm.email },
  { id: id++, email: 'manager.b@example.test', role: 'manager', full_name: 'Test Manager B', contact_number: null, manager_email: null, general_manager_email: USERS.gm.email },
  ...NAMES.map((full_name, i) => ({
    id: id++,
    email: `agent${String(i + 1).padStart(2, '0')}@example.test`,
    role: 'agent',
    full_name,
    contact_number: i % 5 === 3 ? null : `01200001${String(i).padStart(2, '0')}`,
    manager_email: i < 7 ? USERS.manager.email : 'manager.b@example.test',
    general_manager_email: null,
  })),
]

const agents = profiles.filter((p) => p.role === 'agent')
const STATUSES = ['Pending', 'Pending', 'Pending', 'Called', 'WhatsApp Sent', 'SMS Sent', 'Accepted', 'Rejected', 'Invalid Number', 'Thinking', 'Called (No Answer)']
const SETS = ['Set A', 'Set B', 'Set C']

export const leads = []
let leadId = 1000
agents.forEach((agent, a) => {
  const n = a === 0 ? 64 : 12
  for (let i = 0; i < n; i++) {
    const status = STATUSES[(i + a) % STATUSES.length]
    leads.push({
      id: leadId++,
      phone_number: `6012${String(3000000 + a * 1000 + i).padStart(7, '0')}`,
      assigned_to: agent.email,
      pool_owner: agent.manager_email,
      status,
      lead_set: SETS[i % 3],
      agent_notes: i % 6 === 1 ? 'Asked to call back after lunch.' : '',
      document_url: i % 13 === 2 ? `docs/${leadId}.pdf` : null,
      created_at: iso((i + 1) * 3_600_000),
      updated_at: iso(i * 1_800_000),
      staff_reviewed: i > 4,
      admin_reviewed: !(status === 'Accepted' || i % 6 === 1),
      manager_reviewed: !(status === 'Accepted' || i % 6 === 1),
      is_reviewed: false,
    })
  }
})
for (let i = 0; i < 30; i++) {
  leads.push({
    id: leadId++,
    phone_number: `6013${String(4000000 + i).padStart(7, '0')}`,
    assigned_to: 'unassigned',
    pool_owner: i < 15 ? USERS.admin.email : USERS.manager.email,
    status: 'Pending',
    lead_set: SETS[i % 3],
    agent_notes: '',
    document_url: null,
    created_at: iso(i * 600_000),
    updated_at: iso(i * 600_000),
    staff_reviewed: true,
    admin_reviewed: true,
    manager_reviewed: i % 2 === 0,
    is_reviewed: false,
  })
}

const CUSTOMER_STATUSES = ['New', 'Process', 'Pending', 'Approved', 'Disbursed', 'Rejected']
export const customers = []
for (let i = 0; i < 28; i++) {
  const agent = agents[i % 6]
  const cid = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
  const birthdayToday = i === 4
  const dob = birthdayToday
    ? `1988-${date(0).slice(5)}`
    : `19${70 + (i % 25)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`
  customers.push({
    id: cid,
    full_name: `Sample Customer ${i + 1}`,
    ic_number: `${dob.slice(2, 4)}${dob.slice(5, 7)}${dob.slice(8, 10)}-10-${String(1000 + i)}`,
    date_of_birth: dob,
    phone_number: `6017${String(5000000 + i).padStart(7, '0')}`,
    last_salary: 3000 + i * 250,
    last_disbursement_date: i % 4 === 0 ? date(i * 20 * DAY) : null,
    next_review_date: i % 3 === 0 ? date(-((i % 10) + 1) * DAY) : null,
    status: CUSTOMER_STATUSES[i % CUSTOMER_STATUSES.length],
    agent_email: agent.email,
    created_by: agent.email,
    created_at: iso((i + 2) * DAY),
    last_updated_at: iso((i % 9) * DAY + i * 3_600_000),
    customer_documents: i % 5 === 0 ? [{ id: `doc-${i}`, storage_path: `customers/${cid}/payslip.pdf`, created_at: iso(DAY) }] : [],
    customer_notes:
      i % 2 === 0
        ? [
            { id: `note-${i}-1`, note_text: 'Customer asked for a lower monthly instalment.', created_at: iso(2 * DAY) },
            { id: `note-${i}-2`, note_text: 'Payslip received, waiting on bank statement.', created_at: iso(DAY / 2) },
          ]
        : [],
    customer_reminders:
      i % 7 === 0
        ? [{ id: `rem-${i}`, reminder_date: date(0), reminder_note: 'Follow up on documents', dismissed: false, created_at: iso(3 * DAY) }]
        : [],
  })
}

export const customer_reminders = customers.flatMap((c) =>
  c.customer_reminders.map((r) => ({ ...r, customer_id: c.id, agent_email: c.agent_email, customers: { full_name: c.full_name } }))
)

export const feedback = [
  { id: 'fb-1', user_email: 'agent02@example.test', user_role: 'agent', type: 'Bug', message: 'The call button did nothing once on my phone.', status: 'New', created_at: iso(3_600_000) },
  { id: 'fb-2', user_email: USERS.manager.email, user_role: 'manager', type: 'Suggestion', message: 'Could the team list be sorted by calls made?', status: 'New', created_at: iso(DAY) },
  { id: 'fb-3', user_email: 'agent05@example.test', user_role: 'agent', type: 'Other', message: 'Thanks for the new script editor.', status: 'Resolved', created_at: iso(4 * DAY) },
]

export const web_leads = [
  { id: 'wl-1', full_name: 'Sample Enquirer One', phone_number: '60191110001', email: 'one@example.test', employer_name: 'Example Sdn Bhd', age: 34, location: 'bandar', gross_salary: 4800, existing_commitment: 600, deduction_type: 'bpa', tenure_years: 10, estimated_low: 40000, estimated_high: 60000, affordable_installment: 900, status: 'New', admin_notes: '', already_in_pool: false, source: 'landing_page_v1', lang: 'ms', utm_source: 'facebook', created_at: iso(2 * 3_600_000), updated_at: iso(2 * 3_600_000), handled_by: null },
  { id: 'wl-2', full_name: 'Sample Enquirer Two', phone_number: '60191110002', email: null, employer_name: 'Demo Corp', age: 41, location: 'luarBandar', gross_salary: 3600, existing_commitment: 1200, deduction_type: 'direct', tenure_years: 7, estimated_low: 20000, estimated_high: 30000, affordable_installment: 500, status: 'Contacted', admin_notes: 'Called, will send payslip.', already_in_pool: true, source: 'landing_page_v1', lang: 'en', utm_source: 'google', created_at: iso(DAY), updated_at: iso(DAY / 2), handled_by: USERS.admin.email },
]

export const tables = { profiles, leads, customers, customer_reminders, feedback, web_leads, customer_notes: [], customer_documents: [] }

// ─── RPCs ────────────────────────────────────────────────────────────────────

function statsFor(emails) {
  const rows = {}
  for (const lead of leads) {
    if (!emails.includes(lead.assigned_to)) continue
    const key = `${lead.assigned_to}|${lead.status}`
    rows[key] = rows[key] ?? { assigned_to: lead.assigned_to, status: lead.status, count: 0 }
    rows[key].count++
  }
  return Object.values(rows)
}

export const rpc = {
  get_set_counts: ({ p_owner }) =>
    ['Set A', 'Set B', 'Set C', 'External / Manual'].map((lead_set) => ({
      lead_set,
      set_count: leads.filter((l) => l.pool_owner === p_owner && l.assigned_to === 'unassigned' && l.lead_set === lead_set).length * 37,
    })),
  get_manager_unassigned_counts: () =>
    profiles
      .filter((p) => p.role === 'manager')
      .map((m) => ({ manager_email: m.email, unassigned_count: leads.filter((l) => l.pool_owner === m.email && l.assigned_to === 'unassigned').length * 11 })),
  get_agent_stats: ({ agent_emails }) => statsFor(agent_emails),
  get_gm_agent_stats: ({ manager_emails }) =>
    statsFor(profiles.filter((p) => manager_emails.includes(p.manager_email)).map((p) => p.email)),
  check_duplicate_phones: () => [],
}
