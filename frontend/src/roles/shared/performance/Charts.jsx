import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader, LEAD_STATUSES } from '../../../ui'
import { useT } from '../../../i18n/useT'

const TOP = 15

// Series colours come from the chart tokens in index.css.
const SERIES = [
  { key: 'called', label: 'perf.called', color: 'var(--color-chart-1)' },
  { key: 'whatsapp', label: 'perf.whatsapp', color: 'var(--color-chart-2)' },
  { key: 'thinking', label: 'perf.sms', color: 'var(--color-chart-3)' },
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-control bg-surface px-3 py-2 font-sans text-sm shadow-popover">
      <p className="mb-1 font-medium text-fg">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-fg-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
          <span className="flex-1">{p.name}</span>
          <span className="tabular-nums text-fg">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

/** Agent name on one line, cut with an ellipsis, in text colour. */
function NameTick({ x, y, payload }) {
  const name = String(payload.value)
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="var(--color-fg-muted)" fontSize={12}>
      <title>{name}</title>
      {name.length > 18 ? `${name.slice(0, 17)}…` : name}
    </text>
  )
}

/**
 * ActivityChart — calls, WhatsApp and SMS per agent, stacked, for the most
 * active agents. Horizontal so long names stay readable on a phone.
 */
export function ActivityChart({ agentStats }) {
  const t = useT()
  const rows = [...agentStats]
    .map((a) => ({ ...a, name: a.full_name || a.email.split('@')[0], activity: a.called + a.whatsapp + a.thinking }))
    .filter((a) => a.activity > 0)
    .sort((a, b) => b.activity - a.activity)
    .slice(0, TOP)

  return (
    <Card>
      <CardHeader title={t('perf.activityTitle')} description={t('perf.activityDesc', { count: Math.min(TOP, rows.length) })} />
      <CardBody className="space-y-3">
        {rows.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            {SERIES.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                {t(s.label)}
              </li>
            ))}
          </ul>
        )}
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">{t('perf.noChart')}</p>
        ) : (
          <div style={{ height: rows.length * 32 + 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={6}>
                <CartesianGrid horizontal={false} stroke="var(--color-line)" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: 'var(--color-fg-subtle)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis type="category" dataKey="name" width={124} tick={<NameTick />} axisLine={false} tickLine={false} interval={0} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-sunken)' }} />
                {SERIES.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={t(s.label)}
                    stackId="activity"
                    fill={s.color}
                    stroke="var(--color-surface)"
                    strokeWidth={1}
                    radius={i === SERIES.length - 1 ? [0, 4, 4, 0] : 0}
                    maxBarSize={18}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

const STATUS_FIELDS = {
  Pending: 'pending',
  Called: 'called',
  'WhatsApp Sent': 'whatsapp',
  'SMS Sent': 'thinking',
  Accepted: 'accepted',
  Rejected: 'rejected',
  'Invalid Number': 'invalid',
}

/**
 * StatusBreakdown — how many assigned numbers sit in each status. A sorted
 * bar list in one colour: the job is comparing amounts, not telling series apart.
 */
export function StatusBreakdown({ agentStats }) {
  const t = useT()
  const rows = LEAD_STATUSES.map((status) => ({
    status,
    value: agentStats.reduce((sum, a) => sum + (a[STATUS_FIELDS[status]] || 0), 0),
  }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...rows.map((r) => r.value))
  const total = rows.reduce((sum, r) => sum + r.value, 0)

  return (
    <Card>
      <CardHeader title={t('perf.statusTitle')} description={t('perf.statusDesc')} />
      <CardBody>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">{t('perf.noChart')}</p>
        ) : (
          <dl className="space-y-3">
            {rows.map((r) => (
              <div key={r.status}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className="text-fg-muted">{t(`status.lead.${r.status}`)}</dt>
                  <dd className="tabular-nums">
                    {r.value.toLocaleString()}
                    <span className="ml-1.5 text-xs text-fg-subtle">{Math.round((r.value / total) * 100)}%</span>
                  </dd>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </dl>
        )}
      </CardBody>
    </Card>
  )
}
