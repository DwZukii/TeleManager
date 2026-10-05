import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { Banner, Button, Card, CardBody, CardFooter, CardHeader, PageHeader } from '../../ui'
import { useT } from '../../i18n/useT'

/**
 * Deletes every lead a query finds, its files first, 500 rows at a time.
 * Reports progress through `report({ tone, text })`.
 */
async function purge(select, t, report) {
  report({ tone: 'info', text: t('settings.scanning') })
  const { data: rows, error: fetchError } = await select()
  if (fetchError) throw fetchError
  if (!rows || rows.length === 0) {
    report({ tone: 'success', text: t('settings.nothing') })
    return 0
  }
  report({ tone: 'info', text: t('settings.removingFiles', { count: rows.length }) })
  const files = rows.filter((r) => r.document_url).map((r) => r.document_url.split('/').pop())
  if (files.length > 0) await supabase.storage.from('documents').remove(files)

  const ids = rows.map((r) => r.id)
  for (let i = 0; i < ids.length; i += 500) {
    const { error } = await supabase.from('leads').delete().in('id', ids.slice(i, i + 500))
    if (error) throw error
    report({ tone: 'info', text: t('settings.deleting', { done: Math.min(i + 500, ids.length), total: ids.length }) })
  }
  report({ tone: 'success', text: t('settings.done', { count: ids.length }) })
  return ids.length
}

function CleanupCard({ title, body, confirmText, runLabel, select, confirm, onDone }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  async function run() {
    if (!(await confirm(confirmText))) return
    setBusy(true)
    try {
      await purge(select, t, setStatus)
      onDone()
    } catch (err) {
      setStatus({ tone: 'danger', text: t('settings.failed', { error: err.message }) })
    }
    setBusy(false)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader title={title} />
      <CardBody className="flex-1 space-y-3">
        <p className="text-sm text-fg-muted">{body}</p>
        {status && <Banner tone={status.tone}>{status.text}</Banner>}
      </CardBody>
      <CardFooter className="justify-end">
        <Button variant="danger" icon={Trash2} loading={busy} onClick={run}>
          {runLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}

/** AdminSettingsPage — maintenance jobs, kept away from the daily screens. */
export default function AdminSettingsPage({ agentStats, userEmail, confirm }) {
  const t = useT()
  const queryClient = useQueryClient()
  const invalidCount = agentStats.reduce((sum, a) => sum + (a.invalid || 0), 0)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] })

  return (
    <div className="space-y-5">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        <CleanupCard
          title={t('settings.rejectedTitle')}
          body={t('settings.rejectedBody')}
          confirmText={t('settings.rejectedConfirm')}
          runLabel={t('settings.rejectedRun')}
          confirm={confirm}
          onDone={refresh}
          select={() => {
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - 30)
            return supabase.from('leads').select('id, document_url').eq('status', 'Rejected').lt('created_at', cutoff.toISOString())
          }}
        />
        <CleanupCard
          title={t('settings.invalidTitle')}
          body={t('settings.invalidBody', { count: invalidCount })}
          confirmText={t('settings.invalidConfirm')}
          runLabel={t('settings.invalidRun')}
          confirm={confirm}
          onDone={refresh}
          select={() => supabase.from('leads').select('id, document_url').eq('status', 'Invalid Number')}
        />
      </div>
    </div>
  )
}
