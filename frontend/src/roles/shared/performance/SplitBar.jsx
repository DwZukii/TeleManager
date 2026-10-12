import { TONE_BAR, cn } from '../../../ui'

// Worked numbers first, in their status colours, then what is still waiting in
// grey, so the coloured part of the bar reads as progress.
const PARTS = [
  { field: 'called', label: 'perf.called', bar: TONE_BAR.info },
  { field: 'whatsapp', label: 'perf.whatsapp', bar: TONE_BAR.whatsapp },
  { field: 'thinking', label: 'perf.sms', bar: TONE_BAR.warning },
  { field: 'accepted', label: 'status.lead.Accepted', bar: TONE_BAR.solid },
  { field: 'rejected', label: 'status.lead.Rejected', bar: TONE_BAR.danger },
  { field: 'pending', label: 'perf.pending', bar: 'bg-line-strong' },
  { field: 'invalid', label: 'status.lead.Invalid Number', bar: 'bg-line' },
]

/**
 * SplitBar — one agent's numbers as a thin bar split by status, so a long
 * table can be scanned for who is mostly waiting without reading every column.
 * The same split is spelled out for screen readers and on hover.
 */
export default function SplitBar({ agent, t }) {
  const parts = PARTS.map((part) => ({ ...part, value: agent[part.field] || 0 })).filter((part) => part.value > 0)
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  if (total === 0) return null

  // Shares that round to nothing are left out of the spoken summary.
  const summary = parts
    .map((part) => ({ label: t(part.label), percent: Math.round((part.value / total) * 100) }))
    .filter((part) => part.percent > 0)
    .map((part) => `${part.label} ${part.percent}%`)
    .join(', ')
  return (
    <span role="img" aria-label={summary} title={summary} className="flex h-1.5 w-full overflow-hidden rounded-full bg-sunken">
      {parts.map((part) => (
        <span key={part.field} className={cn('h-full', part.bar)} style={{ width: `${(part.value / total) * 100}%` }} />
      ))}
    </span>
  )
}
