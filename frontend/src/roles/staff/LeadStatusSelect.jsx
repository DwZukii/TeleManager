import { LEAD_STATUSES, Select, getStatusMeta } from '../../ui'
import { useT } from '../../i18n/useT'

/**
 * LeadStatusSelect — the agent's status picker. A retired value still on the
 * row (Thinking, Called (No Answer)) stays selected and labelled until the
 * agent picks something else, so nothing is rewritten by just looking at it.
 */
export default function LeadStatusSelect({ value, onChange, size = 'sm', className, ...rest }) {
  const t = useT()
  const options = LEAD_STATUSES.includes(value) || !value ? LEAD_STATUSES : [value, ...LEAD_STATUSES]
  return (
    <Select size={size} value={value} onChange={(e) => onChange(e.target.value)} className={className} {...rest}>
      {options.map((status) => (
        <option key={status} value={status}>
          {t(`status.lead.${getStatusMeta('lead', status).canonical}`, null, status)}
        </option>
      ))}
    </Select>
  )
}
