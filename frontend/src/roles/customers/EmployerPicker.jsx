import { Combobox } from '../../ui'
import { useT } from '../../i18n/useT'
import { EMPLOYER_MAX, employerKey, tidyEmployer } from '../../hooks/useEmployerNames'

/**
 * EmployerPicker — choose an employer the team has used, or type a new one.
 * Goes inside a Field. `value` is the name ('' for none).
 */
export default function EmployerPicker({ value, onChange, names }) {
  const t = useT()
  const current = tidyEmployer(value)
  const known = names.some((name) => employerKey(name) === employerKey(current))
  const options = [
    // Only offered once there is something to clear.
    ...(current ? [{ value: '', label: t('customer.employerNone') }] : []),
    ...names.map((name) => ({ value: name, label: name })),
    ...(current && !known ? [{ value: current, label: current }] : []),
  ]
  // A typed name that matches a known one keeps the known spelling.
  const selected = current ? (names.find((name) => employerKey(name) === employerKey(current)) ?? current) : ''

  return (
    <Combobox
      options={options}
      value={selected}
      onChange={onChange}
      onCreate={onChange}
      maxLength={EMPLOYER_MAX}
      placeholder={t('customer.employerPlaceholder')}
      searchPlaceholder={t('customer.employerSearch')}
      emptyText={t('customer.employerEmpty')}
    />
  )
}
