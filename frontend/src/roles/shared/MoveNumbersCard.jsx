import { useId, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { Banner, Button, Card, CardBody, CardFooter, CardHeader, Combobox, Field, Input, Select } from '../../ui'
import { useT } from '../../i18n/useT'

const SETS = ['Set A', 'Set B', 'Set C']
const CHUNK = 500

/**
 * MoveNumbersCard — moves unassigned numbers out of your pool, 500 at a time.
 *
 *   mode="assign"    to an agent (sets assigned_to)
 *   mode="transfer"  to a manager's pool (sets pool_owner, flags it for them)
 *
 * `people` is [{ email, full_name }]. `canClear` adds the "Clear set" button,
 * which deletes every unassigned number in the chosen set after a confirm.
 */
export default function MoveNumbersCard({
  mode,
  title,
  description,
  people,
  personLabel,
  amounts = [50, 100, 200, 300],
  userEmail,
  unassignedCounts,
  refreshKey,
  confirm,
  canClear = false,
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const listId = useId()
  const [set, setSet] = useState('Set A')
  const [amount, setAmount] = useState('50')
  const [person, setPerson] = useState('')
  const [busy, setBusy] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [status, setStatus] = useState(null)
  const available = unassignedCounts[set] || 0

  const options = people.map((p) => ({
    value: p.email,
    label: p.full_name || p.email,
    description: p.full_name ? p.email : undefined,
  }))

  async function move() {
    const wanted = parseInt(amount) || 0
    if (!person || wanted <= 0) return setStatus({ tone: 'warning', text: t('move.missing') })
    const total = Math.min(wanted, available)
    if (total <= 0) return setStatus({ tone: 'warning', text: t('move.empty', { set }) })

    setBusy(true)
    let moved = 0
    let failure = null
    for (let i = 0; i < total; i += CHUNK) {
      const limit = Math.min(CHUNK, total - i)
      setStatus({ tone: 'info', text: t('move.progress', { done: moved, total }) })
      const { data: batch, error: fetchError } = await supabase
        .from('leads')
        .select('id')
        .eq('assigned_to', 'unassigned')
        .eq('pool_owner', userEmail)
        .eq('lead_set', set)
        .limit(limit)
      if (fetchError) {
        failure = fetchError
        break
      }
      if (!batch || batch.length === 0) break

      const ids = batch.map((lead) => lead.id)
      const patch = mode === 'transfer' ? { pool_owner: person, manager_reviewed: false } : { assigned_to: person }
      const { error: updateError } = await supabase.from('leads').update(patch).in('id', ids)
      if (updateError) {
        failure = updateError
        break
      }
      moved += ids.length
      if (batch.length < limit) break
    }

    if (!failure || moved > 0) {
      setStatus({
        tone: 'success',
        text: mode === 'transfer' ? t('move.transferred', { count: moved }) : t('move.assigned', { count: moved }),
      })
      if (mode === 'transfer') {
        setAmount('50')
        setPerson('')
      }
      queryClient.invalidateQueries({ queryKey: refreshKey })
    } else {
      setStatus({ tone: 'danger', text: t('move.failed', { error: failure.message }) })
    }
    setBusy(false)
  }

  async function clearSet() {
    if (!(await confirm(t('move.clearConfirm', { set })))) return
    setClearing(true)
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('assigned_to', 'unassigned')
      .eq('pool_owner', userEmail)
      .eq('lead_set', set)
    if (error) {
      toast.error(t('move.clearFailed', { set, error: error.message }))
    } else {
      toast.success(t('move.cleared', { set }))
      queryClient.invalidateQueries({ queryKey: refreshKey })
    }
    setClearing(false)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader title={title} description={description} />
      <CardBody className="flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('move.from')} hint={t('move.available', { count: available.toLocaleString() })}>
            <Select value={set} onChange={(e) => setSet(e.target.value)}>
              {SETS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('move.amount')}>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              list={listId}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <datalist id={listId}>
            {amounts.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <Field label={personLabel}>
          <Combobox options={options} value={person} onChange={setPerson} placeholder={t('move.pick')} />
        </Field>
        {status && <Banner tone={status.tone}>{status.text}</Banner>}
      </CardBody>
      <CardFooter className="flex-wrap">
        {canClear && available > 0 ? (
          <Button variant="dangerOutline" size="sm" icon={Trash2} onClick={clearSet} loading={clearing} disabled={busy}>
            {t('move.clear', { set })}
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={move} loading={busy}>
          {mode === 'transfer' ? t('move.transfer') : t('move.assign')}
        </Button>
      </CardFooter>
    </Card>
  )
}
