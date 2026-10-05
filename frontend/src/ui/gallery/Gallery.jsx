import { useMemo, useState } from 'react'
import {
  Activity,
  Download,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import LanguageProvider from '../../i18n/LanguageProvider'
import { useLanguage, useT } from '../../i18n/useT'
import { LANGUAGES } from '../../i18n/strings'
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Combobox,
  ConfirmDialog,
  CountBadge,
  CUSTOMER_STATUSES,
  DataTable,
  Dialog,
  DialogClose,
  EmptyState,
  Field,
  FilterChips,
  IconButton,
  Input,
  LEAD_STATUSES,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  NavItem,
  PageHeader,
  Pagination,
  SegmentedControl,
  Select,
  Skeleton,
  Stat,
  StatGroup,
  StatusBadge,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  WEB_LEAD_STATUSES,
} from '../index'
import { AGENTS, LEADS, SAMPLE_COPY } from './sampleData'

// Dev-only review page, opened at /?ui. Shows every component in every state
// so the look can be judged in one place before any real screen is touched.

export default function Gallery() {
  return (
    <LanguageProvider>
      <GalleryPage />
    </LanguageProvider>
  )
}

const SECTIONS = [
  ['sample', 'Sample screen'],
  ['buttons', 'Buttons'],
  ['fields', 'Fields'],
  ['badges', 'Badges'],
  ['cards', 'Cards and stats'],
  ['navigation', 'Tabs, chips, nav'],
  ['table', 'Data table'],
  ['overlays', 'Dialogs and menus'],
  ['feedback', 'Banners, empty, loading'],
]

function GalleryPage() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="min-h-screen bg-canvas font-sans text-fg">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-base font-semibold">UI review</p>
            <p className="text-xs text-fg-subtle">Dev only. Sample data is made up.</p>
          </div>
          <SegmentedControl
            label="Language"
            value={lang}
            onChange={setLang}
            options={LANGUAGES.map((l) => ({ value: l.code, label: l.code === 'en' ? 'English' : 'BM' }))}
          />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 pb-2 text-sm text-fg-muted [scrollbar-width:none] sm:px-6">
          {SECTIONS.map(([id, title]) => (
            <a key={id} href={`#${id}`} className="shrink-0 whitespace-nowrap hover:text-fg">
              {title}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6">
        <SampleScreen />
        <ButtonsSection />
        <FieldsSection />
        <BadgesSection />
        <CardsSection />
        <NavigationSection />
        <TableSection />
        <OverlaysSection />
        <FeedbackSection />
      </main>
    </div>
  )
}

function Section({ id, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p className="w-28 shrink-0 text-sm text-fg-subtle">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

// ─── Sample screen ───────────────────────────────────────────────────────────

const PAGE_SIZE = 10

function SampleScreen() {
  const { lang } = useLanguage()
  const c = SAMPLE_COPY[lang]
  const [manager, setManager] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const managers = ['Manager A', 'Manager B', 'Manager C', 'Manager D']
  const filtered = useMemo(
    () =>
      AGENTS.filter(
        (a) =>
          (manager === 'all' || a.manager === manager) &&
          (!query || `${a.name} ${a.email}`.toLowerCase().includes(query.toLowerCase()))
      ),
    [manager, query]
  )
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totals = AGENTS.reduce(
    (sum, a) => ({ total: sum.total + a.total, pending: sum.pending + a.pending, called: sum.called + a.called, accepted: sum.accepted + a.accepted }),
    { total: 0, pending: 0, called: 0, accepted: 0 }
  )

  return (
    <Section id="sample" title="Sample screen" description="Every part below is a shared component. Nothing on this screen is styled by hand.">
      <div className="space-y-5 rounded-card border border-dashed border-line-strong p-4 sm:p-6">
        <PageHeader
          title={c.title}
          description={c.description}
          actions={
            <>
              <Button variant="secondary" icon={Download}>
                {c.export}
              </Button>
              <Button icon={UserPlus}>{c.assign}</Button>
            </>
          }
        />
        <StatGroup>
          <Stat label={c.assigned} value={totals.total.toLocaleString()} hint={c.vsLastWeek} />
          <Stat label={c.pending} value={totals.pending.toLocaleString()} />
          <Stat label={c.called} value={totals.called.toLocaleString()} />
          <Stat label={c.accepted} value={totals.accepted.toLocaleString()} tone="success" />
        </StatGroup>
        <FilterChips
          label={c.manager}
          value={manager}
          onChange={(v) => {
            setManager(v)
            setPage(1)
          }}
          options={[
            { value: 'all', label: c.all, count: AGENTS.length },
            ...managers.map((m) => ({ value: m, label: m, count: AGENTS.filter((a) => a.manager === m).length })),
          ]}
        />
        <Card>
          <div className="border-b border-line p-3 sm:p-4">
            <Input
              icon={Search}
              type="search"
              aria-label={c.search}
              placeholder={c.search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              className="sm:max-w-xs"
            />
          </div>
          <DataTable
            label={c.agents}
            rows={pageRows}
            rowKey="email"
            onRowClick={() => {}}
            initialSort={{ key: 'total', dir: 'desc' }}
            empty={{
              title: c.noAgentsTitle,
              description: c.noAgentsBody,
              action: (
                <Button variant="secondary" onClick={() => { setQuery(''); setManager('all') }}>
                  {c.clear}
                </Button>
              ),
            }}
            columns={[
              {
                key: 'name',
                header: c.agents,
                primary: true,
                sortable: true,
                render: (a) => (
                  <span className="inline-flex items-center gap-2.5">
                    <Avatar name={a.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate">{a.name}</span>
                      <span className="block truncate text-xs font-normal text-fg-subtle">{a.email}</span>
                    </span>
                  </span>
                ),
              },
              { key: 'manager', header: c.manager, hideOnMobile: true, sortable: true },
              { key: 'total', header: c.assigned, numeric: true, sortable: true },
              { key: 'pending', header: c.pending, numeric: true, sortable: true },
              { key: 'called', header: c.called, numeric: true, sortable: true },
              { key: 'accepted', header: c.accepted, numeric: true, sortable: true, hideOnMobile: true },
            ]}
          />
          <CardFooter>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} className="w-full" />
          </CardFooter>
        </Card>
      </div>
    </Section>
  )
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

function ButtonsSection() {
  return (
    <Section id="buttons" title="Buttons" description="Primary is navy. Gold is for the one thing on a screen that matters most, used rarely.">
      <Card>
        <CardBody className="space-y-4">
          <Row label="Variants">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="danger">Delete</Button>
          </Row>
          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg" icon={Phone}>
              Call
            </Button>
          </Row>
          <Row label="With icon">
            <Button icon={Plus}>Add customer</Button>
            <Button variant="secondary" icon={Download}>
              Export
            </Button>
          </Row>
          <Row label="Loading">
            <Button loading>Saving</Button>
            <Button variant="secondary" loading>
              Loading
            </Button>
          </Row>
          <Row label="Disabled">
            <Button disabled>Primary</Button>
            <Button variant="secondary" disabled>
              Secondary
            </Button>
          </Row>
          <Row label="Icon only">
            <IconButton label="Edit" icon={Pencil} />
            <IconButton label="More actions" icon={MoreHorizontal} variant="secondary" />
            <IconButton label="Delete" icon={Trash2} variant="danger" size="sm" />
          </Row>
        </CardBody>
      </Card>
    </Section>
  )
}

// ─── Fields ──────────────────────────────────────────────────────────────────

function FieldsSection() {
  const t = useT()
  const [agent, setAgent] = useState('')
  const [agentError, setAgentError] = useState('')
  const options = useMemo(
    () => AGENTS.map((a) => ({ value: a.email, label: a.name, description: a.email })),
    []
  )

  return (
    <Section id="fields" title="Fields" description="Labels are always connected to their control. Errors sit under the field that caused them.">
      <Card>
        <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Full name">
            <Input placeholder="As on IC" />
          </Field>
          <Field label="Phone number" hint="Example: 012-345 6789" required>
            <Input type="tel" defaultValue="012-000 0001" />
          </Field>
          <Field label="IC number" error="IC number should be 12 digits.">
            <Input defaultValue="900101-01" />
          </Field>
          <Field label="Email" hint="Cannot be changed after the account is created.">
            <Input defaultValue="agent001@example.test" disabled />
          </Field>
          <Field label="Search with icon">
            <Input icon={Search} placeholder="Search" />
          </Field>
          <Field label="Lead set">
            <Select defaultValue="A">
              <option value="A">Set A</option>
              <option value="B">Set B</option>
              <option value="C">Set C</option>
            </Select>
          </Field>
          <Field
            label="Assign to agent"
            hint={`${AGENTS.length} agents. Try typing "demo 2".`}
            error={agentError}
          >
            <Combobox
              options={options}
              value={agent}
              onChange={(v) => {
                setAgent(v)
                setAgentError('')
              }}
            />
          </Field>
          <Field label="Assign to agent (error)" error="Choose an agent first.">
            <Combobox options={options} value="" onChange={() => {}} />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <Textarea placeholder="Anything the next person should know" />
          </Field>
          <div className="space-y-3 md:col-span-2">
            <Checkbox label="Send a welcome email" defaultChecked />
            <Checkbox label="Mark as reviewed" description="Hides it from the review queue." />
            <Checkbox label="Disabled option" disabled />
          </div>
        </CardBody>
        <CardFooter className="justify-end">
          <Button variant="secondary" onClick={() => setAgentError(agent ? '' : 'Choose an agent first.')}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => setAgentError(agent ? '' : 'Choose an agent first.')}>{t('common.save')}</Button>
        </CardFooter>
      </Card>
    </Section>
  )
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function BadgesSection() {
  return (
    <Section id="badges" title="Badges" description="Colour carries the outcome, the icon carries the channel. Labels follow the language toggle.">
      <Card>
        <CardBody className="space-y-4">
          <Row label="Lead">
            {LEAD_STATUSES.map((s) => (
              <StatusBadge key={s} kind="lead" status={s} />
            ))}
          </Row>
          <Row label="Old values">
            <StatusBadge kind="lead" status="Thinking" />
            <StatusBadge kind="lead" status="Called (No Answer)" />
          </Row>
          <Row label="Customer">
            {CUSTOMER_STATUSES.map((s) => (
              <StatusBadge key={s} kind="customer" status={s} />
            ))}
          </Row>
          <Row label="Web lead">
            {WEB_LEAD_STATUSES.map((s) => (
              <StatusBadge key={s} kind="webLead" status={s} />
            ))}
          </Row>
          <Row label="Plain">
            <Badge>Neutral</Badge>
            <Badge tone="info">Info</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
            <Badge tone="accent">Accent</Badge>
          </Row>
          <Row label="Counts">
            <CountBadge count={3} />
            <CountBadge count={42} />
            <CountBadge count={240} />
          </Row>
        </CardBody>
      </Card>
    </Section>
  )
}

// ─── Cards and stats ─────────────────────────────────────────────────────────

function CardsSection() {
  return (
    <Section id="cards" title="Cards and stats">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Import numbers"
            description="Paste a list or upload a spreadsheet."
            actions={<Button size="sm" variant="secondary">Template</Button>}
          />
          <CardBody>
            <p className="text-sm text-fg-muted">A card is a white surface with one hairline border. No shadow.</p>
          </CardBody>
          <CardFooter className="justify-end">
            <Button>Import</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader title="Team" />
          <ul>
            {AGENTS.slice(0, 4).map((a) => (
              <li key={a.email} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:px-5">
                <Avatar name={a.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-fg-subtle">{a.email}</p>
                </div>
                <StatusBadge kind="lead" status={a.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <StatGroup>
        <Stat label="Unassigned" value="1,204" />
        <Stat label="Assigned today" value="86" hint="Across 12 agents" />
        <Stat label="Awaiting review" value="7" tone="warning" />
      </StatGroup>
      <StatGroup>
        <Stat label="Approved" value="18" tone="success" />
        <Stat label="Rejected" value="4" tone="danger" />
      </StatGroup>
    </Section>
  )
}

// ─── Tabs, chips, nav ────────────────────────────────────────────────────────

function NavigationSection() {
  const [segment, setSegment] = useState('paste')
  const [chip, setChip] = useState('all')
  const [nav, setNav] = useState('overview')

  return (
    <Section id="navigation" title="Tabs, chips, nav">
      <Card>
        <CardBody className="space-y-6">
          <Tabs defaultValue="agents">
            <TabList>
              <Tab value="agents" count={240}>
                Agents
              </Tab>
              <Tab value="managers" count={4}>
                Managers
              </Tab>
              <Tab value="charts">Charts</Tab>
            </TabList>
            <TabPanel value="agents">
              <p className="text-sm text-fg-muted">Agents panel. The active tab has a gold underline.</p>
            </TabPanel>
            <TabPanel value="managers">
              <p className="text-sm text-fg-muted">Managers panel.</p>
            </TabPanel>
            <TabPanel value="charts">
              <p className="text-sm text-fg-muted">Charts panel.</p>
            </TabPanel>
          </Tabs>
          <Row label="Segmented">
            <SegmentedControl
              label="Extract mode"
              value={segment}
              onChange={setSegment}
              options={[
                { value: 'paste', label: 'Paste list' },
                { value: 'file', label: 'Upload file' },
              ]}
            />
          </Row>
          <div className="space-y-2">
            <p className="text-sm text-fg-subtle">Filter chips</p>
            <FilterChips
              label="Status"
              value={chip}
              onChange={setChip}
              options={[
                { value: 'all', label: 'All', count: 700 },
                { value: 'Pending', label: 'Pending', count: 50 },
                { value: 'Called', label: 'Called', count: 0 },
                { value: 'WhatsApp Sent', label: 'WhatsApp sent', count: 12 },
                { value: 'Accepted', label: 'Accepted', count: 3 },
                { value: 'Rejected', label: 'Rejected', count: 9 },
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-fg-subtle">Sidebar items</p>
            <div className="w-60 space-y-0.5 rounded-card border border-line p-2">
              <NavItem icon={LayoutDashboard} label="Overview" active={nav === 'overview'} onClick={() => setNav('overview')} />
              <NavItem icon={Users} label="Team" active={nav === 'team'} onClick={() => setNav('team')} />
              <NavItem icon={Activity} label="Activity" count={7} active={nav === 'activity'} onClick={() => setNav('activity')} />
            </div>
          </div>
        </CardBody>
      </Card>
    </Section>
  )
}

// ─── Data table ──────────────────────────────────────────────────────────────

function TableSection() {
  const columns = [
    { key: 'phone', header: 'Phone', primary: true, sortable: true, className: 'tabular-nums' },
    { key: 'status', header: 'Status', sortable: true, render: (l) => <StatusBadge kind="lead" status={l.status} /> },
    { key: 'updated', header: 'Last activity' },
  ]

  return (
    <Section id="table" title="Data table" description="One column list renders a table from 768px and stacked rows below it.">
      <Card>
        <CardHeader title="With actions" />
        <DataTable
          label="Leads"
          rows={LEADS}
          columns={columns}
          onRowClick={() => {}}
          actions={(l) => (
            <>
              <Button size="sm" variant="secondary" icon={Phone}>
                Call
              </Button>
              <Menu trigger={<IconButton label="More actions" icon={MoreHorizontal} size="sm" />}>
                <MenuItem icon={Pencil}>Edit</MenuItem>
                <MenuSeparator />
                <MenuItem icon={Trash2} tone="danger">
                  Remove {l.phone}
                </MenuItem>
              </Menu>
            </>
          )}
        />
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Loading" />
          <DataTable label="Leads" rows={[]} columns={columns} loading loadingRows={3} />
        </Card>
        <Card>
          <CardHeader title="Empty" />
          <DataTable
            label="Leads"
            rows={[]}
            columns={columns}
            empty={{ title: 'No leads yet', description: 'Numbers assigned to you will show here.' }}
          />
        </Card>
      </div>
    </Section>
  )
}

// ─── Dialogs and menus ───────────────────────────────────────────────────────

function OverlaysSection() {
  const [open, setOpen] = useState(false)
  const [agent, setAgent] = useState('')
  const options = useMemo(() => AGENTS.map((a) => ({ value: a.email, label: a.name, description: a.email })), [])

  return (
    <Section id="overlays" title="Dialogs and menus" description="On a phone, dialogs rise from the bottom as a sheet.">
      <Card>
        <CardBody className="space-y-4">
          <Row label="Dialog">
            <Dialog
              open={open}
              onOpenChange={setOpen}
              trigger={<Button variant="secondary">Create account</Button>}
              title="Create account"
              description="They will be able to sign in straight away."
              footer={
                <>
                  <DialogClose>
                    <Button variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button onClick={() => setOpen(false)}>Create account</Button>
                </>
              }
            >
              <div className="space-y-4 py-2">
                <Field label="Full name">
                  <Input />
                </Field>
                <Field label="Email">
                  <Input type="email" />
                </Field>
                <Field label="Manager">
                  <Combobox options={options} value={agent} onChange={setAgent} />
                </Field>
              </div>
            </Dialog>
          </Row>
          <Row label="Confirm">
            <ConfirmDialog
              trigger={<Button variant="secondary">Remove agent</Button>}
              title="Remove Test Agent 1?"
              description="Their leads go back to the unassigned pool."
              confirmLabel="Remove"
              tone="danger"
              onConfirm={() => new Promise((resolve) => setTimeout(resolve, 800))}
            />
            <ConfirmDialog
              trigger={<Button variant="danger" icon={Trash2}>Delete old rejected leads</Button>}
              title="Delete old rejected leads?"
              description="Deletes rejected leads older than 30 days, and any files attached to them. This cannot be undone."
              confirmLabel="Delete"
              tone="danger"
              confirmWord="DELETE"
              onConfirm={() => new Promise((resolve) => setTimeout(resolve, 800))}
            />
          </Row>
          <Row label="Menu">
            <Menu trigger={<Button variant="secondary" icon={MoreHorizontal}>Actions</Button>} align="start">
              <MenuLabel>Agent</MenuLabel>
              <MenuItem icon={Pencil}>Edit details</MenuItem>
              <MenuItem icon={Users} hint="4">Move to another manager</MenuItem>
              <MenuItem disabled>Reset password</MenuItem>
              <MenuSeparator />
              <MenuItem icon={Trash2} tone="danger">
                Delete account
              </MenuItem>
            </Menu>
          </Row>
        </CardBody>
      </Card>
    </Section>
  )
}

// ─── Banners, empty, loading ─────────────────────────────────────────────────

function FeedbackSection() {
  return (
    <Section id="feedback" title="Banners, empty, loading">
      <div className="space-y-3">
        <Banner tone="info" title="A new version is available">
          Reload to get the latest changes.
        </Banner>
        <Banner tone="success">Saved. The agent can sign in now.</Banner>
        <Banner tone="warning" title="7 changes are waiting for review" action={<Button size="sm" variant="secondary">Review</Button>} />
        <Banner tone="danger" title="Could not save">
          Phone number is already used by another customer.
        </Banner>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <EmptyState
            title="No customers yet"
            description="Customers you add, or that are assigned to you, will show here."
            action={<Button icon={Plus}>Add customer</Button>}
          />
        </Card>
        <Card>
          <CardBody className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-9 w-28" />
          </CardBody>
        </Card>
      </div>
    </Section>
  )
}
