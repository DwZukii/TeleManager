import { useId, useState } from 'react'
import { Link } from 'react-router'
import { Cake, ChevronDown, MessageCircle, Phone } from 'lucide-react'
import { Badge, Button, Card, CardFooter, CountBadge, Skeleton, cn, focusRing } from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { useWaBusiness } from '../../hooks/useWaBusiness'
import { fillName, useMyScript } from '../../hooks/useMyScript'
import { getCallUrl, getWhatsAppUrl, toWaNumber } from '../staff/links'

const SHOWN = 5

// Whether the list was left open, so it is still open after looking at a
// customer and coming back. Forgotten on reload.
let leftOpen = false

/**
 * BirthdaysCard — customers with a birthday in the next 7 days, soonest
 * first. A single line at the top of the customers page (title, count, how
 * many are today) that opens into the list, so it is always in reach without
 * pushing the rest of the page down. Anyone can call or send a WhatsApp
 * greeting from a row; managers and admins also see whose customer it is.
 *
 * `birthdays` is the Map of customer id to getBirthdayInfo() the page already
 * builds, so the card and the "Birthdays this week" filter always agree.
 */
export default function BirthdaysCard({ customers, birthdays, scope, userEmail, agentName, isLoading, onViewAll }) {
  const t = useT()
  const { lang } = useLanguage()
  const business = useWaBusiness(userEmail)
  // This person's own greeting from Settings, or the standard one.
  const greeting = useMyScript('birthday', userEmail) || t('alerts.wishesText')
  const own = scope === 'own'
  const listId = useId()
  const [open, setOpen] = useState(leftOpen)
  const toggle = () => {
    leftOpen = !open
    setOpen(!open)
  }

  const rows = customers
    .filter((c) => birthdays.has(c.id))
    .sort(
      (a, b) =>
        birthdays.get(a.id).diffDays - birthdays.get(b.id).diffDays || (a.fullName || '').localeCompare(b.fullName || '')
    )

  function when(info) {
    if (info.diffDays === 1) return t('birthday.tomorrow')
    const date = info.nextDate.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    return t('birthday.inDays', { days: info.diffDays, date })
  }

  const todayCount = rows.filter((c) => birthdays.get(c.id).diffDays === 0).length
  const canOpen = !isLoading && rows.length > 0
  const expanded = canOpen && open
  const title = (
    <span className="inline-flex min-w-0 items-center gap-2 text-base font-semibold text-fg">
      <span className="truncate">{t('customers.birthdays')}</span>
      <CountBadge count={isLoading ? 0 : rows.length} />
    </span>
  )
  const rowClass = 'flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5'

  return (
    <Card>
      <h2>
        {canOpen ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={toggle}
            className={cn(rowClass, 'rounded-card hover:bg-sunken/60', focusRing)}
          >
            {title}
            <span className="inline-flex shrink-0 items-center gap-2 text-sm font-normal text-fg-muted">
              {todayCount > 0 && t('birthdays.today', { count: todayCount })}
              <ChevronDown className={cn('size-4 text-fg-subtle', expanded && 'rotate-180')} aria-hidden="true" />
            </span>
          </button>
        ) : (
          <span className={rowClass}>
            {title}
            {isLoading ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <span className="shrink-0 text-sm font-normal text-fg-subtle">{t('birthdays.none')}</span>
            )}
          </span>
        )}
      </h2>

      {expanded && (
        <ul id={listId} aria-label={t('customers.birthdays')} className="border-t border-line">
          {rows.slice(0, SHOWN).map((c) => {
            const info = birthdays.get(c.id)
            const today = info.diffDays === 0
            const details = [
              !today && when(info),
              t('birthday.turning', { age: info.turningAge }),
              !own && c.agentEmail && c.agentEmail !== 'UNASSIGNED' && agentName(c.agentEmail),
              !c.phoneNumber && t('birthdays.noPhone'),
            ].filter(Boolean)
            return (
              <li
                key={c.id}
                className="flex flex-col gap-3 border-b border-line px-4 py-3.5 last:border-0 sm:px-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      to={String(c.id)}
                      className={cn('min-w-0 truncate rounded-control text-base font-medium text-fg hover:underline md:text-sm', focusRing)}
                    >
                      {c.fullName}
                    </Link>
                    {today && (
                      <Badge tone="accent" icon={Cake} className="shrink-0">
                        {t('birthday.today')}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-fg-muted">{details.join(' · ')}</p>
                </div>
                {c.phoneNumber && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      as="a"
                      href={getWhatsAppUrl(c.phoneNumber, fillName(greeting, c.fullName), business)}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="secondary"
                      icon={MessageCircle}
                      className="max-md:h-11 max-md:flex-1"
                    >
                      {t('alerts.sendWishes')}
                    </Button>
                    <Button as="a" href={getCallUrl(toWaNumber(c.phoneNumber))} icon={Phone} className="max-md:h-11 max-md:flex-1">
                      {t('leads.call')}
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {expanded && rows.length > SHOWN && onViewAll && (
        <CardFooter>
          <p className="text-sm text-fg-muted">{t('birthdays.showing', { shown: SHOWN, count: rows.length })}</p>
          <Button variant="secondary" size="sm" onClick={onViewAll}>
            {t('birthdays.viewAll')}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
