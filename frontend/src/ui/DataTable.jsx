import { isValidElement, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cn, focusRing } from './cn'
import { Button } from './Button'
import { EmptyState, Skeleton } from './Misc'
import { useT } from '../i18n/useT'
import { sortRows } from './tableSort'

function cellOf(column, row) {
  if (column.render) return column.render(row)
  const value = row[column.key]
  return value == null || value === '' ? <span className="text-fg-subtle">—</span> : value
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' }

/**
 * DataTable — one column definition, two layouts. A table from `md` up; below
 * that each row becomes a stacked item with the `primary` column as its title.
 *
 *   <DataTable
 *     label="Agents"
 *     rows={agents}
 *     rowKey="email"
 *     onRowClick={openAgent}
 *     columns={[
 *       { key: 'name', header: 'Agent', primary: true, sortable: true },
 *       { key: 'total', header: 'Total', numeric: true, sortable: true },
 *       { key: 'called', header: 'Called', numeric: true, hideOnMobile: true },
 *     ]}
 *     actions={(row) => <Button size="sm" variant="secondary">Revoke</Button>}
 *   />
 *
 * Column options:
 *   primary      the row's title on mobile, and the cell that opens the row
 *   numeric      right-aligned, tabular figures
 *   align        left | right | center (numeric implies right)
 *   sortable     header becomes a sort button; sorts on sortValue(row) or row[key]
 *   render(row)  custom cell content
 *   hideOnMobile left out of the stacked layout
 *   wide         takes a full row in the stacked layout (e.g. a select)
 *   mobileLabel  false hides the label in the stacked layout, for a control
 *                that already says what it is (still read out by screen readers)
 *   className    extra classes for the cell, e.g. a width
 *
 * Sorting is client-side, on the rows passed in. For server-paginated data,
 * pass `sort` and `onSortChange` to control it from outside instead.
 */
export function DataTable({
  label,
  rows,
  columns,
  rowKey = 'id',
  onRowClick,
  actions,
  loading = false,
  loadingRows = 5,
  empty,
  initialSort,
  sort: controlledSort,
  onSortChange,
  className,
}) {
  const t = useT()
  const [localSort, setLocalSort] = useState(initialSort ?? null)
  const sort = controlledSort !== undefined ? controlledSort : localSort
  const setSort = onSortChange ?? setLocalSort

  const keyOf = (row) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey])
  const primary = columns.find((column) => column.primary) ?? columns[0]
  const secondary = columns.filter((column) => column !== primary && !column.hideOnMobile)
  // Numbers line up in an even grid; names and phone numbers need their own
  // width, so a row with any text in it wraps instead of squeezing columns.
  const textual = secondary.some((column) => !column.numeric && !column.wide)

  const sorted = useMemo(() => (onSortChange ? rows : sortRows(rows, columns, sort)), [rows, columns, sort, onSortChange])

  function toggleSort(column) {
    if (sort?.key !== column.key) {
      // Numbers are usually wanted biggest first; text A to Z.
      setSort({ key: column.key, dir: column.numeric ? 'desc' : 'asc' })
    } else {
      setSort({ key: column.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' })
    }
  }

  const showEmpty = !loading && sorted.length === 0
  const emptyNode =
    empty && typeof empty === 'object' && !isValidElement(empty) ? (
      <EmptyState {...empty} />
    ) : (
      empty ?? <EmptyState title={t('common.noResults')} />
    )

  function openRow(event, row) {
    // React bubbles clicks from portalled popovers (a Combobox list, a menu)
    // up to this row; those are not clicks on the row.
    if (!event.currentTarget.contains(event.target)) return
    // Clicks on a button, link or field inside the row do their own thing.
    if (event.target.closest('button, a, input, select, textarea, [role="menu"], [role="listbox"]')) return
    onRowClick?.(row)
  }

  function primaryContent(row) {
    const content = cellOf(primary, row)
    if (!onRowClick) return content
    return (
      <button
        type="button"
        onClick={() => onRowClick(row)}
        className={cn('-mx-1 rounded-control px-1 text-left font-medium text-fg hover:underline', focusRing)}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={className} aria-busy={loading || undefined}>
      {/* ── md and up: a real table ─────────────────────────────────────── */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          {label && <caption className="sr-only">{label}</caption>}
          <thead>
            <tr className="border-b border-line bg-sunken">
              {columns.map((column) => {
                const align = column.numeric ? 'right' : column.align ?? 'left'
                const active = sort?.key === column.key
                const SortIcon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('h-10 px-4 font-medium text-fg-muted', ALIGN[align], column.className)}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-control hover:text-fg',
                          active && 'text-fg',
                          align === 'right' && 'flex-row-reverse',
                          focusRing
                        )}
                      >
                        {column.header}
                        <SortIcon className={cn('size-3.5', !active && 'text-fg-subtle')} aria-hidden="true" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
              {actions && (
                <th scope="col" className="h-10 px-4 text-right font-medium text-fg-muted">
                  <span className="sr-only">{t('table.actions')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: loadingRows }, (_, i) => (
                <tr key={`loading-${i}`} className="border-b border-line last:border-0">
                  {columns.map((column) => (
                    <td key={column.key} className="h-12 px-4">
                      <Skeleton className={cn('h-4', column.numeric ? 'ml-auto w-10' : 'w-3/4')} />
                    </td>
                  ))}
                  {actions && <td className="h-12 px-4" />}
                </tr>
              ))}
            {!loading &&
              sorted.map((row) => (
                <tr
                  key={keyOf(row)}
                  onClick={onRowClick ? (event) => openRow(event, row) : undefined}
                  className={cn(
                    'border-b border-line last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-sunken/60'
                  )}
                >
                  {columns.map((column) => {
                    const align = column.numeric ? 'right' : column.align ?? 'left'
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          'h-12 px-4 py-2 text-fg',
                          ALIGN[align],
                          column.numeric && 'tabular-nums',
                          column.className
                        )}
                      >
                        {column === primary ? primaryContent(row) : cellOf(column, row)}
                      </td>
                    )
                  })}
                  {actions && (
                    <td className="h-12 px-4 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-2">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
        {showEmpty && emptyNode}
      </div>

      {/* ── below md: stacked rows ──────────────────────────────────────── */}
      <div className="md:hidden">
        {loading && (
          <ul aria-label={t('table.loading')}>
            {Array.from({ length: loadingRows }, (_, i) => (
              <li key={i} className="space-y-2 border-b border-line px-4 py-3.5 last:border-0">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </li>
            ))}
          </ul>
        )}
        {!loading && sorted.length > 0 && (
          <ul aria-label={label}>
            {sorted.map((row) => (
              <li
                key={keyOf(row)}
                onClick={onRowClick ? (event) => openRow(event, row) : undefined}
                className={cn(
                  'border-b border-line px-4 py-3.5 last:border-0',
                  onRowClick && 'cursor-pointer active:bg-sunken'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-base font-medium text-fg">{primaryContent(row)}</div>
                  {onRowClick && !actions && (
                    <ChevronRight className="mt-1 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  )}
                </div>
                {secondary.length > 0 && (
                  <dl
                    className={cn(
                      'mt-2 gap-y-2',
                      textual ? 'flex flex-wrap gap-x-6' : 'grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-x-3'
                    )}
                  >
                    {secondary.map((column) => (
                      <div
                        key={column.key}
                        className={cn(
                          'flex min-w-0 flex-col',
                          textual && 'min-w-16 max-w-full',
                          column.wide && (textual ? 'basis-full' : 'col-span-full')
                        )}
                      >
                        <dt className={cn('text-xs text-fg-subtle', column.mobileLabel === false && 'sr-only')}>{column.header}</dt>
                        <dd className={cn('mt-auto pt-0.5 text-sm text-fg', column.numeric && 'tabular-nums')}>
                          {cellOf(column, row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {actions && <div className="mt-3 flex flex-wrap gap-2">{actions(row)}</div>}
              </li>
            ))}
          </ul>
        )}
        {showEmpty && emptyNode}
      </div>
    </div>
  )
}

/**
 * Pagination — "1–25 of 700" with previous and next. `page` is 1-based.
 */
export function Pagination({ page, pageSize, total, onPageChange, className }) {
  const t = useT()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <nav
      aria-label={t('pagination.label')}
      className={cn('flex items-center justify-between gap-3 text-sm text-fg-muted', className)}
    >
      <p className="tabular-nums">
        {t('pagination.range', {
          from: from.toLocaleString(),
          to: to.toLocaleString(),
          total: total.toLocaleString(),
        })}
      </p>
      <div className="flex items-center gap-2">
        <span className="sr-only" aria-live="polite">
          {t('pagination.page', { page, pages })}
        </span>
        <Button
          variant="secondary"
          icon={ChevronLeft}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <span className="max-sm:sr-only">{t('common.previous')}</span>
        </Button>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="max-sm:sr-only">{t('common.next')}</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
