// Obviously fake data for the review page. None of these people or numbers exist.

const FIRST = ['Test', 'Sample', 'Demo', 'Example', 'Placeholder']
const LAST = ['Agent', 'Person', 'User', 'Caller', 'Staff']

export const AGENTS = Array.from({ length: 240 }, (_, i) => {
  const n = i + 1
  const name = `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]} ${n}`
  const total = 40 + ((n * 37) % 160)
  const called = Math.min(total, (n * 13) % 90)
  const accepted = Math.min(called, (n * 7) % 12)
  return {
    email: `agent${String(n).padStart(3, '0')}@example.test`,
    name,
    manager: `Manager ${String.fromCharCode(65 + (i % 4))}`,
    total,
    pending: total - called,
    called,
    accepted,
    status: ['Pending', 'Called', 'WhatsApp Sent', 'Accepted', 'Rejected'][i % 5],
  }
})

export const LEADS = [
  { id: 1, phone: '012-000 0001', status: 'Pending', updated: '2 min ago' },
  { id: 2, phone: '013-000 0002', status: 'Called', updated: '14 min ago' },
  { id: 3, phone: '014-000 0003', status: 'WhatsApp Sent', updated: '1 h ago' },
  { id: 4, phone: '016-000 0004', status: 'SMS Sent', updated: '3 h ago' },
  { id: 5, phone: '017-000 0005', status: 'Accepted', updated: 'Yesterday' },
  { id: 6, phone: '018-000 0006', status: 'Rejected', updated: 'Yesterday' },
  { id: 7, phone: '019-000 0007', status: 'Invalid Number', updated: '2 days ago' },
]

// Sample-screen copy. Component strings come from src/i18n; these are only
// for the made-up page on the review screen.
export const SAMPLE_COPY = {
  en: {
    title: 'Performance',
    description: 'How each agent is doing with their assigned leads.',
    export: 'Export',
    assign: 'Assign leads',
    agents: 'Agents',
    assigned: 'Assigned',
    pending: 'Pending',
    called: 'Called',
    accepted: 'Accepted',
    manager: 'Manager',
    all: 'All',
    search: 'Search agents',
    vsLastWeek: '+12 on last week',
    view: 'View',
    noAgentsTitle: 'No agents match',
    noAgentsBody: 'Try a different name, or clear the filter.',
    clear: 'Clear filter',
  },
  ms: {
    title: 'Prestasi',
    description: 'Prestasi setiap ejen dengan nombor yang diberikan.',
    export: 'Eksport',
    assign: 'Agih nombor',
    agents: 'Ejen',
    assigned: 'Diberikan',
    pending: 'Belum dihubungi',
    called: 'Telah dihubungi',
    accepted: 'Diterima',
    manager: 'Pengurus',
    all: 'Semua',
    search: 'Cari ejen',
    vsLastWeek: '+12 berbanding minggu lepas',
    view: 'Lihat',
    noAgentsTitle: 'Tiada ejen yang sepadan',
    noAgentsBody: 'Cuba nama lain, atau kosongkan penapis.',
    clear: 'Kosongkan penapis',
  },
}
