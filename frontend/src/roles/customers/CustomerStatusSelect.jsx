import { CUSTOMER_STATUSES, Select } from '../../ui'
import { useT } from '../../i18n/useT'

/** CustomerStatusSelect — the six pipeline statuses, labelled in the current language. */
export default function CustomerStatusSelect({ value, onChange, size = 'sm', ...rest }) {
  const t = useT()
  const current = value || 'New'
  const options = CUSTOMER_STATUSES.includes(current) ? CUSTOMER_STATUSES : [current, ...CUSTOMER_STATUSES]
  return (
    <Select size={size} value={current} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((status) => (
        <option key={status} value={status}>
          {t(`status.customer.${status}`, null, status)}
        </option>
      ))}
    </Select>
  )
}
