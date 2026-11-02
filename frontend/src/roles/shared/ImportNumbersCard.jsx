import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { supabase } from '../../supabase'
import { Banner, Button, Card, CardBody, CardFooter, CardHeader, Field, IconButton, Input, SegmentedControl, Select } from '../../ui'
import { useT } from '../../i18n/useT'
import { extractFromFiles } from './extraction'
import ImportPreview from './ImportPreview'

const SETS = ['Set A', 'Set B', 'Set C']
const MAX_FILES = 10
const MAX_NUMBERS = 10_000
const PREVIEW_SIZE = 24

// A count for t(): t() picks the singular wording only for the number 1.
const shown = (n) => (n === 1 ? 1 : n.toLocaleString())

// Where a number already in the database is, as locate_phones reports it.
const PLACES = ['yours', 'agents', 'admin', 'others']

/** "500 in the admin pool, 200 with other teams", for the import messages. */
function placesText(places, t, addedMeanwhile = 0) {
  const counts = {}
  for (const place of places.values()) counts[place] = (counts[place] || 0) + 1
  const parts = PLACES.filter((place) => counts[place]).map((place) =>
    t(`import.place.${place}`, { count: counts[place].toLocaleString() })
  )
  if (addedMeanwhile > 0) parts.push(t('import.place.justAdded', { count: addedMeanwhile.toLocaleString() }))
  return parts.join(', ')
}

/**
 * ImportNumbersCard — spreadsheets in, clean numbers out, added to your own
 * pool. Shared by admins and managers; the extraction rules, the 10-file and
 * 10,000-number limits and the duplicate check are the same for both.
 *
 *   refreshKey  the query to refresh after an import (['adminData', email])
 */
export default function ImportNumbersCard({ userEmail, refreshKey }) {
  const t = useT()
  const queryClient = useQueryClient()
  const inputRef = useRef(null)

  const [set, setSet] = useState('Set A')
  const [mode, setMode] = useState('all')
  const [minAge, setMinAge] = useState(25)
  const [maxAge, setMaxAge] = useState(55)
  const [files, setFiles] = useState([])
  const [needsRead, setNeedsRead] = useState(false)
  const [reading, setReading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [items, setItems] = useState([]) // [{ phone, age? }]
  const [page, setPage] = useState(1)
  const [pushing, setPushing] = useState(false)
  const [status, setStatus] = useState(null) // { tone, text }

  const resetFileInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  function clearAll() {
    setItems([])
    setPage(1)
    setFiles([])
    setNeedsRead(false)
    resetFileInput()
  }

  function changeMode(next) {
    setMode(next)
    clearAll()
    setStatus(null)
  }

  function addFiles(event) {
    const picked = Array.from(event.target.files)
    resetFileInput()
    if (picked.length === 0) return
    const merged = [...files, ...picked]
    if (merged.length > MAX_FILES) {
      setStatus({ tone: 'warning', text: t('import.tooManyFiles', { count: files.length }) })
      return
    }
    setFiles(merged)
    setNeedsRead(true)
    setItems([])
    setStatus({ tone: 'info', text: t('import.toReview', { count: merged.length }) })
  }

  function removeFile(index) {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    setNeedsRead(next.length > 0)
    setItems([])
    setStatus(next.length ? { tone: 'info', text: t('import.toReview', { count: next.length }) } : null)
  }

  async function readFiles() {
    if (files.length === 0) return
    setReading(true)
    setProgress(0)
    setItems([])
    try {
      const { unique, rows, withIc, matched } = await extractFromFiles(files, {
        mode,
        minAge,
        maxAge,
        onFile: (i) => setStatus({ tone: 'info', text: t('import.scanning', { index: i + 1, total: files.length, name: files[i].name }) }),
        onProgress: setProgress,
      })
      setNeedsRead(false)

      if (unique.length > MAX_NUMBERS) {
        setStatus({ tone: 'danger', text: t('import.limit', { count: unique.length.toLocaleString() }) })
      } else if (unique.length === 0) {
        setStatus({
          tone: 'warning',
          text: mode === 'all' ? t('import.none') : t('import.noneAge', { rows, withIc, min: minAge, max: maxAge }),
        })
      } else {
        setItems(unique)
        setPage(1)
        setStatus({
          tone: 'success',
          text:
            mode === 'all'
              ? t('import.found', { count: unique.length.toLocaleString() })
              : t('import.foundAge', { rows, withIc, matched, min: minAge, max: maxAge, count: unique.length }),
        })
      }
    } catch {
      setStatus({ tone: 'danger', text: t('import.readFailed') })
    }
    setReading(false)
  }

  async function push() {
    const numbers = items.map((item) => item.phone)
    if (numbers.length === 0) return
    setPushing(true)
    setStatus({ tone: 'info', text: t('import.checking', { count: numbers.length.toLocaleString() }) })

    // Skip anything already in the database, checked 1,000 at a time. If the
    // check fails, stop here: nothing has been added, so it is safe to retry.
    const chunks = []
    for (let i = 0; i < numbers.length; i += 1000) chunks.push(numbers.slice(i, i + 1000))
    const results = await Promise.all(chunks.map((chunk) => supabase.rpc('locate_phones', { phone_numbers: chunk })))
    const failedCheck = results.find(({ error }) => error)
    if (failedCheck) {
      setStatus({ tone: 'danger', text: t('import.checkFailed', { error: failedCheck.error.message }) })
      setPushing(false)
      return
    }
    const existing = new Map(results.flatMap(({ data }) => data.map((row) => [row.phone_number, row.place])))
    const fresh = numbers.filter((phone) => !existing.has(phone))
    const skipped = numbers.length - fresh.length

    if (fresh.length === 0) {
      setStatus({
        tone: 'warning',
        text: t('import.allDuplicates', { count: shown(numbers.length), where: placesText(existing, t) }),
      })
      clearAll()
      setPushing(false)
      return
    }

    const rows = fresh.map((phone) => ({
      phone_number: phone,
      assigned_to: 'unassigned',
      status: 'Pending',
      agent_notes: '',
      document_url: null,
      admin_reviewed: true,
      manager_reviewed: true,
      lead_set: set,
      pool_owner: userEmail,
    }))

    // A number someone else adds after the check is skipped, not an error, so
    // one clash can't lose the rest of its batch.
    let added = 0
    let failure = null
    for (let i = 0; i < rows.length; i += 500) {
      setStatus({
        tone: 'info',
        text: t('import.pushing', { done: Math.min(i + 500, rows.length), total: rows.length, skipped }),
      })
      const batch = rows.slice(i, i + 500)
      const { error, count } = await supabase
        .from('leads')
        .upsert(batch, { onConflict: 'phone_number', ignoreDuplicates: true, count: 'exact' })
      if (error) {
        failure = error
        break
      }
      added += count ?? batch.length
    }

    if (added > 0) queryClient.invalidateQueries({ queryKey: refreshKey })

    if (failure) {
      // What went in stays in. The numbers are kept, and pressing the button
      // again skips the ones already added.
      setStatus({
        tone: 'danger',
        text:
          added > 0
            ? t('import.failedPartway', { count: added.toLocaleString(), total: fresh.length.toLocaleString(), error: failure.message })
            : t('import.failed', { error: failure.message }),
      })
    } else {
      setStatus({
        tone: 'success',
        text:
          added < numbers.length
            ? t('import.doneSkipped', { count: shown(added), set, where: placesText(existing, t, fresh.length - added) })
            : t('import.done', { count: shown(added), set }),
      })
      clearAll()
    }
    setPushing(false)
  }

  function removeNumber(index) {
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    const pages = Math.max(1, Math.ceil(next.length / PREVIEW_SIZE))
    if (page > pages) setPage(pages)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader title={t('import.title')} description={t('import.description')} />
      <CardBody className="flex-1 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('import.set')}>
            <Select value={set} onChange={(e) => setSet(e.target.value)}>
              {SETS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t('import.mode')}</p>
            <SegmentedControl
              label={t('import.mode')}
              value={mode}
              onChange={changeMode}
              options={[
                { value: 'all', label: t('import.modeAll') },
                { value: 'age', label: t('import.modeAge') },
              ]}
            />
            <p className="text-xs text-fg-subtle">{mode === 'all' ? t('import.modeAllHint') : t('import.modeAgeHint')}</p>
          </div>
        </div>

        {mode === 'age' && (
          <div className="space-y-3">
            <Banner tone="warning">{t('import.ageWarning')}</Banner>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('import.minAge')}>
                <Input type="number" min="1" max="100" value={minAge} onChange={(e) => setMinAge(parseInt(e.target.value) || 0)} />
              </Field>
              <Field label={t('import.maxAge')}>
                <Input type="number" min="1" max="100" value={maxAge} onChange={(e) => setMaxAge(parseInt(e.target.value) || 0)} />
              </Field>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">{t('import.files')}</p>
            <p className="text-xs tabular-nums text-fg-subtle">
              {files.length} / {MAX_FILES}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            aria-label={t('import.choose')}
            onChange={addFiles}
            className="sr-only"
            tabIndex={-1}
          />
          {files.length > 0 && (
            <ul className="divide-y divide-line rounded-control border border-line">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-2 py-1 pl-3 pr-1 text-sm">
                  <FileSpreadsheet className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <IconButton
                    label={t('import.removeFile', { name: file.name })}
                    icon={X}
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={reading || pushing}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={Upload}
              onClick={() => inputRef.current?.click()}
              disabled={reading || pushing || files.length >= MAX_FILES}
            >
              {t('import.choose')}
            </Button>
            {needsRead && (
              <Button onClick={readFiles} loading={reading}>
                {reading ? `${t('import.reading')} ${progress}%` : t('import.read', { count: files.length })}
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-subtle">{t('import.filesHint')}</p>
          {reading && (
            <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {status && <Banner tone={status.tone}>{status.text}</Banner>}

        {items.length > 0 && (
          <ImportPreview items={items} page={page} pageSize={PREVIEW_SIZE} onPageChange={setPage} onRemove={removeNumber} />
        )}
      </CardBody>
      {items.length > 0 && (
        <CardFooter className="justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              clearAll()
              setStatus(null)
            }}
            disabled={pushing}
          >
            {t('import.discard')}
          </Button>
          <Button onClick={push} loading={pushing}>
            {t('import.push', { set })}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
