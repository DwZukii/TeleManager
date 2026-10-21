import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { supabase } from '../../supabase'
import { Banner, Button, Card, CardHeader, DataTable, Dialog, EmptyState, Input, PageHeader, Pagination, Person, sortRows } from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatWhen } from '../../i18n/format'
import { COMPANY, SCRIPT_KINDS, builtIn, useSaveScript } from '../../hooks/useMyScript'
import ScriptDialog from '../staff/ScriptDialog'

const PAGE_SIZE = 20

// Every saved script, and everyone's name to go with it. Admins can read all
// of them; the database refuses this to anyone else.
function useAllScripts() {
  return useQuery({
    queryKey: ['scripts-all'],
    queryFn: async () => {
      const [scripts, people] = await Promise.all([
        supabase.from('message_scripts').select('owner, kind, body, updated_at, updated_by'),
        supabase.from('profiles').select('email, full_name, role'),
      ])
      if (scripts.error) throw scripts.error
      if (people.error) throw people.error
      return { rows: scripts.data ?? [], people: people.data ?? [] }
    },
  })
}

/**
 * AdminScriptsPage — the company's standard messages, which an admin can
 * change for everyone, and the scripts each person has saved for themselves,
 * which an admin can read but only the person can change.
 */
export default function AdminScriptsPage() {
  const t = useT()
  const { data, isLoading, isError } = useAllScripts()
  const rows = useMemo(() => data?.rows ?? [], [data])
  const people = useMemo(() => new Map((data?.people ?? []).map((p) => [p.email, p])), [data])

  return (
    <div className="space-y-5">
      <PageHeader title={t('scripts.title')} description={t('scripts.description')} />
      {isError && <Banner tone="danger">{t('scripts.loadFailed')}</Banner>}
      <CompanyScripts rows={rows} people={people} loading={isLoading} />
      <StaffScripts rows={rows} people={people} loading={isLoading} />
    </div>
  )
}

function CompanyScripts({ rows, people, loading }) {
  const t = useT()
  const { lang } = useLanguage()
  const saveScript = useSaveScript()
  const [editing, setEditing] = useState(null)
  const company = Object.fromEntries(rows.filter((r) => r.owner === COMPANY && r.body).map((r) => [r.kind, r]))

  async function save(kind, text) {
    // Saving the original unchanged (or nothing) goes back to following it.
    const value = text.trim() === builtIn(kind, t).trim() ? '' : text.trim()
    try {
      await saveScript(COMPANY, kind, value)
    } catch (error) {
      toast.error(t('lead.scriptFailed', { error: error.message }))
      throw error
    }
    setEditing(null)
    toast.success(t('scripts.saved'))
  }

  return (
    <Card>
      <CardHeader title={t('scripts.company')} description={t('scripts.companyBody')} />
      {SCRIPT_KINDS.map((kind) => {
        const row = company[kind]
        const who = row?.updated_by ? people.get(row.updated_by)?.full_name || row.updated_by : null
        return (
          <div key={kind} className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-fg">{t(`scripts.kind.${kind}`)}</h3>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {loading
                  ? ' '
                  : row
                    ? who
                      ? t('scripts.changedBy', { when: formatWhen(row.updated_at, t, lang), who })
                      : t('scripts.changed', { when: formatWhen(row.updated_at, t, lang) })
                    : t('scripts.original')}
              </p>
              <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm text-fg-muted">{row?.body || builtIn(kind, t)}</p>
            </div>
            <Button variant="secondary" className="sm:shrink-0" disabled={loading} onClick={() => setEditing(kind)}>
              {t('common.edit')}
            </Button>
          </div>
        )
      })}
      <ScriptDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? t(`scripts.kind.${editing}`) : ''}
        hint={editing === 'birthday' ? t('scripts.birthdayHint') : t('scripts.companyHint')}
        value={editing ? company[editing]?.body || builtIn(editing, t) : ''}
        onSave={(text) => save(editing, text)}
      />
    </Card>
  )
}

function StaffScripts({ rows, people, loading }) {
  const t = useT()
  const { lang } = useLanguage()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'updated', dir: 'desc' })
  const [viewing, setViewing] = useState(null)

  // One row per person who has written at least one script.
  const staff = useMemo(() => {
    const byOwner = new Map()
    for (const r of rows) {
      if (r.owner === COMPANY || !r.body) continue
      const entry = byOwner.get(r.owner) ?? { email: r.owner, scripts: {}, updated: r.updated_at }
      entry.scripts[r.kind] = r.body
      if (r.updated_at > entry.updated) entry.updated = r.updated_at
      byOwner.set(r.owner, entry)
    }
    return [...byOwner.values()].map((entry) => ({
      ...entry,
      name: people.get(entry.email)?.full_name || '',
      role: people.get(entry.email)?.role,
    }))
  }, [rows, people])

  const saved = (kind) => (s) =>
    s.scripts[kind] ? <span className="text-fg">{t('scripts.yes')}</span> : <span className="text-fg-subtle">—</span>
  const columns = [
    {
      key: 'person',
      header: t('scripts.person'),
      primary: true,
      sortable: true,
      sortValue: (s) => s.name || s.email,
      render: (s) => <Person name={s.name} email={s.email} />,
    },
    { key: 'role', header: t('account.role'), hideOnMobile: true, render: (s) => (s.role ? t(`role.${s.role}`, null, s.role) : '—') },
    { key: 'wa', header: t('scripts.col.wa'), render: saved('wa') },
    { key: 'sms', header: t('scripts.col.sms'), render: saved('sms') },
    { key: 'birthday', header: t('scripts.col.birthday'), render: saved('birthday') },
    {
      key: 'updated',
      header: t('scripts.updated'),
      sortable: true,
      hideOnMobile: true,
      render: (s) => <span className="text-fg-muted">{formatWhen(s.updated, t, lang)}</span>,
    },
  ]

  // Sorted as a whole, then a page at a time.
  const q = query.trim().toLowerCase()
  const filtered = sortRows(
    q ? staff.filter((s) => s.email.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) : staff,
    columns,
    sort
  )
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const open = staff.find((s) => s.email === viewing)

  return (
    <Card>
      <CardHeader title={t('scripts.staff')} description={t('scripts.staffBody')} />
      <div className="border-t border-line p-3 sm:p-4">
        <Input
          icon={Search}
          type="search"
          aria-label={t('scripts.search')}
          placeholder={t('scripts.search')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          className="sm:max-w-xs"
        />
      </div>
      <DataTable
        label={t('scripts.staff')}
        rows={filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)}
        rowKey="email"
        loading={loading}
        sort={sort}
        onSortChange={(next) => {
          setSort(next)
          setPage(1)
        }}
        onRowClick={(s) => setViewing(s.email)}
        columns={columns}
        empty={<EmptyState title={staff.length === 0 ? t('scripts.none') : t('scripts.noMatch')} />}
      />
      {filtered.length > PAGE_SIZE && (
        <div className="border-t border-line px-4 py-3 sm:px-5">
          <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </div>
      )}

      <Dialog
        open={Boolean(open)}
        onOpenChange={(value) => !value && setViewing(null)}
        placement="side"
        title={open ? open.name || open.email : ''}
        description={open ? [open.name && open.email, open.role && t(`role.${open.role}`, null, open.role)].filter(Boolean).join(' · ') : undefined}
        bodyClassName="space-y-5 pb-5"
      >
        {open &&
          SCRIPT_KINDS.map((kind) => (
            <section key={kind}>
              <h3 className="text-sm font-medium text-fg">{t(`scripts.mine.${kind}`)}</h3>
              {open.scripts[kind] ? (
                <p className="mt-1.5 whitespace-pre-wrap break-words rounded-control bg-sunken p-3 text-sm text-fg">{open.scripts[kind]}</p>
              ) : (
                <p className="mt-1 text-sm text-fg-subtle">{t('scripts.notWritten')}</p>
              )}
            </section>
          ))}
      </Dialog>
    </Card>
  )
}
