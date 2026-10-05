// Ordering shared by DataTable and callers that sort before paginating.

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function valueOf(column, row) {
  if (column.sortValue) return column.sortValue(row)
  return row[column.key]
}

function compare(a, b) {
  const aEmpty = a == null || a === ''
  const bEmpty = b == null || b === ''
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a - b
  return collator.compare(String(a), String(b))
}

/**
 * sortRows — the table's own ordering, for callers that sort before they
 * paginate (pass the result in as rows, with `sort` and `onSortChange`).
 */
export function sortRows(rows, columns, sort) {
  if (!sort) return rows
  const column = columns.find((c) => c.key === sort.key)
  if (!column) return rows
  const direction = sort.dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => compare(valueOf(column, a), valueOf(column, b)) * direction)
}
