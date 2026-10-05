import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { supabase } from '../../supabase'
import {
  Banner,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  IconButton,
  Input,
  Pagination,
  SegmentedControl,
  Select,
} from '../../ui'
import { useT } from '../../i18n/useT'
import { runAgeFilteredExtraction, runAllNumbersExtraction } from './extraction'

const SETS = ['Set A', 'Set B', 'Set C']
const MAX_FILES = 10
const MAX_NUMBERS = 10_000
const PREVIEW_SIZE = 24

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
      const XLSX = await import('xlsx')
      const readSheet = (file) =>
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (evt) => {
            try {
              const workbook = XLSX.read(evt.target.result, { type: 'binary' })
              resolve(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }))
            } catch {
              resolve([])
            }
          }
          reader.onerror = () => resolve([])
          reader.readAsBinaryString(file)
        })

      let extracted = []
      let rows = 0
      let withIc = 0
      let matched = 0
      for (let i = 0; i < files.length; i++) {
        setStatus({ tone: 'info', text: t('import.scanning', { index: i + 1, total: files.length, name: files[i].name }) })
        const base = i / files.length
        const slice = 1 / files.length
        setProgress(Math.round(base * 100))
        await new Promise((resolve) => setTimeout(resolve, 50))
        const data = await readSheet(files[i])
        const onRow = (done, total) => setProgress(Math.round((base + (total > 0 ? done / total : 1) * slice) * 100))
        if (mode === 'all') {
          extracted = extracted.concat((await runAllNumbersExtraction(data, onRow)).map((phone) => ({ phone })))
        } else {
          const result = await runAgeFilteredExtraction(data, minAge, maxAge, onRow)
          extracted = extracted.concat(result.numbers)
          rows += result.rowsScanned
          withIc += result.rowsWithIC
          matched += result.rowsMatched
        }
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
      setNeedsRead(false)

      const seen = new Set()
      const unique = extracted.filter((item) => (seen.has(item.phone) ? false : seen.add(item.phone)))

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

    // Skip anything already in the database, checked 1,000 at a time.
    const chunks = []
    for (let i = 0; i < numbers.length; i += 1000) chunks.push(numbers.slice(i, i + 1000))
    const results = await Promise.all(chunks.map((chunk) => supabase.rpc('check_duplicate_phones', { phone_numbers: chunk })))
    const existing = new Set(results.flatMap(({ data }) => (data ? data.map((l) => l.phone_number) : [])))
    const fresh = numbers.filter((phone) => !existing.has(phone))
    const skipped = numbers.length - fresh.length

    if (fresh.length === 0) {
      setStatus({ tone: 'warning', text: t('import.allDuplicates', { count: numbers.length.toLocaleString() }) })
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

    let failure = null
    for (let i = 0; i < rows.length; i += 500) {
      setStatus({
        tone: 'info',
        text: t('import.pushing', { done: Math.min(i + 500, rows.length), total: rows.length, skipped }),
      })
      const { error } = await supabase.from('leads').insert(rows.slice(i, i + 500), { ignoreDuplicates: true })
      if (error) {
        failure = error
        break
      }
    }

    if (failure) {
      setStatus({ tone: 'danger', text: t('import.failed', { error: failure.message }) })
    } else {
      setStatus({ tone: 'success', text: t('import.done', { count: fresh.length.toLocaleString(), set, skipped }) })
      clearAll()
      queryClient.invalidateQueries({ queryKey: refreshKey })
    }
    setPushing(false)
  }

  const pageItems = items.slice((page - 1) * PREVIEW_SIZE, page * PREVIEW_SIZE)
  const showAges = items.some((i) => i.age != null)

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
          <div className="space-y-3 rounded-control border border-line">
            <div className="flex items-baseline justify-between gap-3 border-b border-line bg-sunken px-3 py-2">
              <p className="text-sm font-medium">{t('import.ready', { count: items.length.toLocaleString() })}</p>
              {showAges && <p className="text-xs text-fg-subtle">{t('import.withAge')}</p>}
            </div>
            <ul className="flex flex-wrap gap-1.5 px-3">
              {pageItems.map((item, idx) => {
                const realIdx = (page - 1) * PREVIEW_SIZE + idx
                return (
                  <li
                    key={item.phone}
                    className="inline-flex h-7 items-center gap-1 rounded-control border border-line pl-2 pr-0.5 text-xs tabular-nums"
                  >
                    {item.phone}
                    {item.age != null && <span className="text-fg-subtle">· {item.age}</span>}
                    <button
                      type="button"
                      aria-label={t('import.removeNumber', { phone: item.phone })}
                      onClick={() => {
                        const next = items.filter((_, i) => i !== realIdx)
                        setItems(next)
                        const pages = Math.max(1, Math.ceil(next.length / PREVIEW_SIZE))
                        if (page > pages) setPage(pages)
                      }}
                      className="inline-flex size-6 items-center justify-center rounded-control text-fg-subtle hover:bg-sunken hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="px-3 pb-3">
              {items.length > PREVIEW_SIZE && (
                <Pagination page={page} pageSize={PREVIEW_SIZE} total={items.length} onPageChange={setPage} />
              )}
            </div>
          </div>
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
