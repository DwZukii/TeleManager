import { useId, useMemo, useRef, useState } from 'react'
import { Popover } from 'radix-ui'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn, CONTROL } from './cn'
import { useFieldControl } from './fieldContext'
import { useT } from '../i18n/useT'

const LIMIT = 50

function matches(option, query) {
  if (!query) return true
  const haystack = `${option.label} ${option.description ?? ''}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

/**
 * Combobox — pick one item from a long list by typing. Built for choosing an
 * agent or manager out of a few hundred: search runs in memory on every
 * keystroke, and only the first 50 matches are drawn so it stays fast.
 *
 *   <Field label="Assign to">
 *     <Combobox
 *       options={agents.map((a) => ({ value: a.email, label: a.full_name, description: a.email }))}
 *       value={agentEmail}
 *       onChange={setAgentEmail}
 *     />
 *   </Field>
 *
 * Picks up its id, error and description from an enclosing Field.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled = false,
  className,
  ...props
}) {
  const t = useT()
  const control = useFieldControl(props)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef(null)

  const selected = options.find((option) => option.value === value)

  const filtered = useMemo(() => options.filter((option) => matches(option, query)), [options, query])
  const shown = filtered.slice(0, LIMIT)

  function changeOpen(next) {
    setOpen(next)
    if (next) {
      setQuery('')
      const index = options.findIndex((option) => option.value === value)
      setActive(index >= 0 && index < LIMIT ? index : 0)
    }
  }

  function pick(option) {
    if (!option || option.disabled) return
    onChange?.(option.value, option)
    setOpen(false)
  }

  function moveTo(index) {
    const next = Math.max(0, Math.min(shown.length - 1, index))
    setActive(next)
    listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  function onKeyDown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveTo(active + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveTo(active - 1)
        break
      case 'Home':
        event.preventDefault()
        moveTo(0)
        break
      case 'End':
        event.preventDefault()
        moveTo(shown.length - 1)
        break
      case 'Enter':
        event.preventDefault()
        pick(shown[active])
        break
      default:
    }
  }

  const optionId = (index) => `${listId}-option-${index}`

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-haspopup="listbox"
          disabled={disabled}
          {...control}
          className={cn(CONTROL, 'flex h-11 items-center gap-2 pl-3 pr-2.5 text-left sm:h-10', className)}
        >
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-fg-subtle')}>
            {selected ? selected.label : placeholder ?? t('combobox.placeholder')}
          </span>
          {selected?.description && (
            <span className="hidden min-w-0 max-w-[45%] truncate text-sm text-fg-subtle sm:inline">
              {selected.description}
            </span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            'z-50 flex w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-control bg-surface font-sans text-fg shadow-popover',
            'max-h-[min(22rem,var(--radix-popover-content-available-height))] animate-pop-in motion-reduce:animate-none'
          )}
        >
          <div className="relative border-b border-line">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <input
              autoFocus
              type="text"
              role="searchbox"
              aria-controls={listId}
              aria-activedescendant={shown.length ? optionId(active) : undefined}
              aria-label={searchPlaceholder ?? t('combobox.search')}
              placeholder={searchPlaceholder ?? t('combobox.search')}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
                if (listRef.current) listRef.current.scrollTop = 0
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full bg-transparent pl-9 pr-3 text-base text-fg outline-hidden placeholder:text-fg-subtle sm:h-10 sm:text-sm"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1">
            {shown.map((option, index) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onPointerMove={() => active !== index && setActive(index)}
                  onClick={() => pick(option)}
                  className={cn(
                    'flex cursor-default items-center gap-2.5 rounded-control px-2.5 py-2 text-sm',
                    index === active && 'bg-sunken',
                    option.disabled && 'opacity-50'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fg">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-fg-subtle">{option.description}</span>
                    )}
                  </span>
                  {isSelected && <Check className="size-4 shrink-0 text-brand" aria-hidden="true" />}
                </li>
              )
            })}
          </ul>
          {shown.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-fg-muted">{emptyText ?? t('common.noMatches')}</p>
          )}
          {filtered.length > shown.length && (
            <p className="border-t border-line px-3 py-2 text-xs text-fg-subtle">
              {t('combobox.more', { shown: shown.length, total: filtered.length })}
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
