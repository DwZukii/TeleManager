import { X } from 'lucide-react'
import { Pagination } from '../../ui'
import { useT } from '../../i18n/useT'

/** ImportPreview — the numbers found, a page at a time, each one removable. */
export default function ImportPreview({ items, page, pageSize, onPageChange, onRemove }) {
  const t = useT()
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize)
  const showAges = items.some((i) => i.age != null)

  return (
    <div className="space-y-3 rounded-control border border-line">
      <div className="flex items-baseline justify-between gap-3 border-b border-line bg-sunken px-3 py-2">
        <p className="text-sm font-medium">{t('import.ready', { count: items.length.toLocaleString() })}</p>
        {showAges && <p className="text-xs text-fg-subtle">{t('import.withAge')}</p>}
      </div>
      <ul className="flex flex-wrap gap-1.5 px-3">
        {pageItems.map((item, idx) => (
          <li
            key={item.phone}
            className="inline-flex h-7 items-center gap-1 rounded-control border border-line pl-2 pr-0.5 text-xs tabular-nums"
          >
            {item.phone}
            {item.age != null && <span className="text-fg-subtle">· {item.age}</span>}
            <button
              type="button"
              aria-label={t('import.removeNumber', { phone: item.phone })}
              onClick={() => onRemove((page - 1) * pageSize + idx)}
              className="inline-flex size-6 items-center justify-center rounded-control text-fg-subtle hover:bg-sunken hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="px-3 pb-3">
        {items.length > pageSize && <Pagination page={page} pageSize={pageSize} total={items.length} onPageChange={onPageChange} />}
      </div>
    </div>
  )
}
