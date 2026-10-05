import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, ChevronLeft, FileText, Paperclip, Phone, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { Button, Card, CardBody, CardHeader, Field, StatusBadge, Textarea } from '../../ui'
import { useT } from '../../i18n/useT'
import { formatPhone } from '../../utils'
import { getCallUrl } from './links'
import LeadStatusSelect from './LeadStatusSelect'
import MessagePanel from './MessagePanel'

const MAX_BYTES = 2 * 1024 * 1024

/** Updates one lead in the agent's cached list without a refetch. */
function usePatchLead(userEmail) {
  const queryClient = useQueryClient()
  return (id, patch) =>
    queryClient.setQueryData(['staffData', userEmail], (old) => {
      if (!old) return { leads: [], staffNotifications: [] }
      return { ...old, leads: old.leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)) }
    })
}

/** StaffLeadPage — one number: call, message, notes, document. */
export default function StaffLeadPage({ lead, userEmail, onStatusChange, confirm }) {
  const t = useT()

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Button as={Link} to="/leads" variant="ghost" size="sm" icon={ChevronLeft} className="-ml-2">
        {t('lead.back')}
      </Button>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tabular-nums">{formatPhone(lead.phone_number)}</h1>
              <div className="mt-1.5">
                <StatusBadge kind="lead" status={lead.status} />
              </div>
            </div>
            <Field label={t('lead.statusLabel')} className="w-full sm:w-56">
              <LeadStatusSelect size="md" value={lead.status} onChange={(status) => onStatusChange(lead.id, status)} />
            </Field>
          </div>
          <Button
            as="a"
            href={getCallUrl(lead.phone_number)}
            onClick={() => onStatusChange(lead.id, 'Called')}
            icon={Phone}
            size="lg"
            fullWidth
          >
            {t('leads.call')}
          </Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('lead.message')} />
          <CardBody>
            <MessagePanel lead={lead} userEmail={userEmail} onStatusChange={onStatusChange} />
          </CardBody>
        </Card>

        <div className="space-y-5">
          <NotesCard key={`notes-${lead.id}`} lead={lead} userEmail={userEmail} />
          <DocumentCard key={`doc-${lead.id}`} lead={lead} userEmail={userEmail} confirm={confirm} />
        </div>
      </div>
    </div>
  )
}

/**
 * NotesCard — the agent's notes on this number. Saves on its own when the box
 * loses focus, when the page is left, or when the agent switches to another
 * app, but only if the text changed: every save puts the lead back in the
 * admin and manager review queue, as the Save button always did.
 */
function NotesCard({ lead, userEmail }) {
  const t = useT()
  const patchLead = usePatchLead(userEmail)
  const [note, setNote] = useState(lead.agent_notes || '')
  const [state, setState] = useState({ status: 'idle' }) // idle | saving | saved | error
  const noteRef = useRef(note)
  const savedRef = useRef(lead.agent_notes || '')
  const queue = useRef(Promise.resolve())

  // Saves run one after another, so an older text can never land last.
  const save = () => {
    queue.current = queue.current.then(async () => {
      const text = noteRef.current
      if (text === savedRef.current) return
      setState({ status: 'saving' })
      const { error } = await supabase
        .from('leads')
        .update({ agent_notes: text, admin_reviewed: false, manager_reviewed: false })
        .eq('id', lead.id)
      if (error) {
        setState({ status: 'error' })
        toast.error(t('lead.noteFailed', { error: error.message }))
        return
      }
      savedRef.current = text
      patchLead(lead.id, { agent_notes: text })
      setState({ status: noteRef.current === text ? 'saved' : 'idle' })
    })
    return queue.current
  }

  // Leaving the page or switching to WhatsApp or the dialer saves too.
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && saveRef.current()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      saveRef.current()
    }
  }, [])

  return (
    <Card>
      <CardHeader title={t('lead.notes')} />
      <CardBody className="space-y-2">
        <Textarea
          aria-label={t('lead.notes')}
          aria-describedby={`note-status-${lead.id}`}
          rows={5}
          value={note}
          onChange={(e) => {
            noteRef.current = e.target.value
            setNote(e.target.value)
            if (state.status === 'saved') setState({ status: 'idle' })
          }}
          onBlur={save}
          placeholder={t('lead.notesPlaceholder')}
        />
        <p id={`note-status-${lead.id}`} aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-fg-subtle">
          {state.status === 'saving' && t('lead.noteSaving')}
          {state.status === 'saved' && (
            <>
              <Check className="size-3.5 text-success" aria-hidden="true" />
              {t('lead.noteSaved')}
            </>
          )}
          {state.status === 'error' && (
            <span className="text-danger">
              {t('lead.noteNotSaved')}{' '}
              <button type="button" onClick={save} className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-accent">
                {t('lead.noteRetry')}
              </button>
            </span>
          )}
          {state.status === 'idle' && t('lead.noteAuto')}
        </p>
      </CardBody>
    </Card>
  )
}

function DocumentCard({ lead, userEmail, confirm }) {
  const t = useT()
  const patchLead = usePatchLead(userEmail)
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

  function choose(event) {
    const picked = event.target.files[0]
    if (!picked) return
    if (picked.size > MAX_BYTES) {
      toast.warning(t('lead.tooLarge'))
      event.target.value = null
      return
    }
    setFile(picked)
  }

  async function upload() {
    if (!file) return
    setBusy(true)
    const ext = file.name.split('.').pop()
    const fileName = `${lead.id}-${Math.random()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(fileName, file)
    if (error) {
      toast.error(t('lead.uploadFailed', { error: error.message }))
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase
      .from('leads')
      .update({ document_url: data.publicUrl, admin_reviewed: false, manager_reviewed: false })
      .eq('id', lead.id)
    patchLead(lead.id, { document_url: data.publicUrl })
    setFile(null)
    if (inputRef.current) inputRef.current.value = null
    setBusy(false)
  }

  async function remove() {
    if (!(await confirm(t('lead.removeConfirm')))) return
    setBusy(true)
    const fileName = lead.document_url.split('/').pop()
    await supabase.storage.from('documents').remove([fileName])
    await supabase.from('leads').update({ document_url: null, admin_reviewed: false, manager_reviewed: false }).eq('id', lead.id)
    patchLead(lead.id, { document_url: null })
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader title={t('lead.document')} description={t('lead.documentHint')} />
      <CardBody>
        {lead.document_url ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-3 py-2.5">
            <a
              href={lead.document_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-2 text-sm text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
            >
              <FileText className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('lead.view')}</span>
            </a>
            <Button variant="dangerOutline" size="sm" icon={Trash2} loading={busy} onClick={remove}>
              {t('lead.remove')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              id={`lead-file-${lead.id}`}
              type="file"
              accept=".pdf, image/png, image/jpeg"
              aria-label={t('lead.chooseFile')}
              onChange={choose}
              disabled={busy}
              className="sr-only"
              tabIndex={-1}
            />
            <Button variant="secondary" icon={Paperclip} onClick={() => inputRef.current?.click()} disabled={busy}>
              {t('lead.chooseFile')}
            </Button>
            {file && <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{file.name}</span>}
            {file && (
              <Button onClick={upload} loading={busy}>
                {t('lead.upload')}
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
