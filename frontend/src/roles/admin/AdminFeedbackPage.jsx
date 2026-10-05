import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bug, Lightbulb, MessageSquare, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { Badge, Card, DataTable, EmptyState, FilterChips, IconButton, PageHeader, Select } from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatDate } from '../../i18n/format'

const STATUSES = ['New', 'In Progress', 'Resolved']
const TYPE_ICON = { Bug, Suggestion: Lightbulb, Other: MessageSquare }

/** AdminFeedbackPage — reports sent from "Report a problem", with a status each. */
export default function AdminFeedbackPage({ allFeedback, userRole, userEmail, confirm }) {
  const t = useT()
  const { lang } = useLanguage()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('All')
  const queryKey = ['adminData', userEmail]

  async function changeStatus(id, status) {
    queryClient.setQueryData(queryKey, (old) =>
      old ? { ...old, allFeedback: old.allFeedback.map((f) => (f.id === id ? { ...f, status } : f)) } : null
    )
    const { error } = await supabase.from('feedback').update({ status }).eq('id', id)
    if (error) {
      toast.error(t('feedbackAdmin.updateFailed', { error: error.message }))
      queryClient.invalidateQueries({ queryKey })
    }
  }

  async function remove(id) {
    if (!(await confirm(t('feedbackAdmin.deleteConfirm')))) return
    queryClient.setQueryData(queryKey, (old) => (old ? { ...old, allFeedback: old.allFeedback.filter((f) => f.id !== id) } : null))
    const { error } = await supabase.from('feedback').delete().eq('id', id)
    if (error) {
      toast.error(t('feedbackAdmin.updateFailed', { error: error.message }))
      queryClient.invalidateQueries({ queryKey })
    }
  }

  const counts = Object.fromEntries(STATUSES.map((s) => [s, allFeedback.filter((f) => f.status === s).length]))
  const rows = filter === 'All' ? allFeedback : allFeedback.filter((f) => f.status === filter)

  return (
    <div className="space-y-5">
      <PageHeader title={t('feedbackAdmin.title')} description={t('feedbackAdmin.description')} />
      <FilterChips
        label={t('feedbackAdmin.filter')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'All', label: t('common.all'), count: allFeedback.length },
          ...STATUSES.map((s) => ({ value: s, label: t(`feedbackAdmin.status.${s}`), count: counts[s] })),
        ]}
      />
      <Card>
        <DataTable
          label={t('feedbackAdmin.title')}
          rows={rows}
          columns={[
            {
              key: 'message',
              header: t('feedbackAdmin.message'),
              primary: true,
              className: 'min-w-64',
              render: (f) => <span className="block whitespace-pre-wrap font-normal">{f.message}</span>,
            },
            {
              key: 'user_email',
              header: t('feedbackAdmin.from'),
              render: (f) => (
                <span className="block min-w-0">
                  <span className="block truncate">{f.user_email}</span>
                  <span className="block text-xs text-fg-subtle">{t(`role.${f.user_role}`, null, f.user_role)}</span>
                </span>
              ),
            },
            {
              key: 'type',
              header: t('feedbackAdmin.type'),
              render: (f) => (
                <Badge tone={f.type === 'Bug' ? 'danger' : 'neutral'} icon={TYPE_ICON[f.type] ?? MessageSquare}>
                  {t(`feedback.type.${f.type}`, null, f.type)}
                </Badge>
              ),
            },
            {
              key: 'created_at',
              header: t('feedbackAdmin.date'),
              sortable: true,
              render: (f) => <span className="whitespace-nowrap text-fg-muted">{formatDate(f.created_at, lang)}</span>,
            },
            {
              key: 'status',
              header: t('feedbackAdmin.status'),
              wide: true,
              mobileLabel: false,
              className: 'w-40',
              render: (f) => (
                <Select size="sm" value={f.status} onChange={(e) => changeStatus(f.id, e.target.value)} aria-label={t('feedbackAdmin.status')}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`feedbackAdmin.status.${s}`)}
                    </option>
                  ))}
                </Select>
              ),
            },
          ]}
          actions={
            userRole === 'super_admin'
              ? (f) => <IconButton label={t('feedbackAdmin.delete')} icon={Trash2} size="sm" onClick={() => remove(f.id)} />
              : undefined
          }
          empty={<EmptyState title={t('feedbackAdmin.empty')} />}
        />
      </Card>
    </div>
  )
}
