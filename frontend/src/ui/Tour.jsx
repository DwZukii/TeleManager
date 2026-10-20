import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { cn } from './cn'
import { useT } from '../i18n/useT'

const PAD = 6 // room around the lit item
const RADIUS = 12 // the lit area's corners, as rounded-card
const GAP = 12 // between the lit item and the box
const EDGE = 16 // the box keeps this far from the screen edges
const WIDTH = 340 // the box from `sm` up; on phones it spans the screen

// The next frame, or a moment from now if frames have stopped (a tab in the
// background, a phone saving power), so the tour never stalls. Returns a cancel.
function soon(fn) {
  let done = false
  const run = () => {
    if (done) return
    done = true
    fn()
  }
  const frame = requestAnimationFrame(run)
  const timer = setTimeout(run, 100)
  return () => {
    done = true
    cancelAnimationFrame(frame)
    clearTimeout(timer)
  }
}

const shown = (el) => {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

// The dimmed screen with a rounded hole over the lit area.
function dimPath(vw, vh, hole) {
  const outer = `M0 0H${vw}V${vh}H0Z`
  if (!hole) return outer
  const { x, y, w, h } = hole
  const r = Math.min(RADIUS, w / 2, h / 2)
  return (
    `${outer}M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  )
}

// Below the lit item if it fits, else above, else beside it (from `sm` up),
// else on whichever edge of the screen has more room.
function place(hole, height, vw, vh) {
  const phone = vw < 640
  const width = phone ? vw - EDGE * 2 : Math.min(WIDTH, vw - EDGE * 2)
  if (!hole) return { top: Math.max(EDGE, (vh - height) / 2), left: (vw - width) / 2, width }

  const middle = hole.x + hole.w / 2
  const left = Math.min(Math.max(middle - width / 2, EDGE), vw - width - EDGE)
  const arrowX = Math.min(Math.max(middle - left, 20), width - 20)
  if (hole.y + hole.h + GAP + height <= vh - EDGE) return { top: hole.y + hole.h + GAP, left, width, arrow: 'top', arrowX }
  if (hole.y - GAP - height >= EDGE) return { top: hole.y - GAP - height, left, width, arrow: 'bottom', arrowX }
  if (!phone) {
    const top = Math.min(Math.max(hole.y + hole.h / 2 - height / 2, EDGE), vh - height - EDGE)
    if (hole.x + hole.w + GAP + width <= vw - EDGE) return { top, left: hole.x + hole.w + GAP, width }
    if (hole.x - GAP - width >= EDGE) return { top, left: hole.x - GAP - width, width }
  }
  const roomBelow = vh - hole.y - hole.h
  return { top: roomBelow >= hole.y ? vh - height - EDGE : EDGE, left, width }
}

/**
 * Tour — a step-by-step walk through a screen. The page dims, the item each
 * step is about stays lit, and a box beside it explains it, with Back, Next
 * and Skip.
 *
 *   <Tour
 *     open
 *     steps={[{ id: 'call', target: 'row-call', title: 'Call', body: '…' }]}
 *     step={step}
 *     onStepChange={setStep}
 *     onClose={(finished) => …}
 *     label="Tour of the app"
 *   />
 *
 * A step's `target` names an element marked data-tour="…". Give an array to
 * light the first of them that is on screen (the sidebar on a computer, the
 * bottom bar on a phone), and add `union: true` to light all of them as one
 * area. A step without a target, or whose target never shows, puts the box in
 * the middle of the screen. A target that is still on its way (a panel
 * opening) is waited for briefly, then scrolled into view.
 *
 * Nothing under the tour can be tapped while it is open, so a tour only ever
 * points at things; it never presses them. Escape skips it, the arrow keys
 * step through it, and focus goes back where it was when it closes.
 */
export function Tour({ open, steps, step, onStepChange, onClose, label }) {
  const t = useT()
  const titleId = useId()
  const bodyId = useId()
  const boxRef = useRef(null)
  const targets = useRef([])
  const [layout, setLayout] = useState(null) // { key, hole, vw, vh, height }

  const current = open ? steps[step] : null
  const key = current ? `${step}:${current.id}` : null
  const targetIds = current?.target ? [].concat(current.target).join(' ') : ''
  const union = Boolean(current?.union)
  const last = step === steps.length - 1

  // Find this step's item, bring it into view, then follow it as the page
  // settles (a panel sliding in, a smooth scroll) and whenever it moves.
  useEffect(() => {
    if (!key) return undefined
    const ids = targetIds ? targetIds.split(' ') : []
    const started = performance.now()
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancel = () => {}
    let stopped = false

    function find() {
      const lists = ids.map((id) => [...document.querySelectorAll(`[data-tour="${id}"]`)].filter(shown))
      return union ? lists.flat() : (lists.find((list) => list.length) ?? []).slice(0, 1)
    }
    function measure() {
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight
      // The box's height decides where it fits, and changes with each step's text.
      const height = boxRef.current?.offsetHeight ?? 0
      const rects = targets.current.filter((el) => el.isConnected && shown(el)).map((el) => el.getBoundingClientRect())
      let hole = null
      if (rects.length) {
        const x = Math.min(...rects.map((r) => r.left)) - PAD
        const y = Math.min(...rects.map((r) => r.top)) - PAD
        hole = { x, y, w: Math.max(...rects.map((r) => r.right)) + PAD - x, h: Math.max(...rects.map((r) => r.bottom)) + PAD - y }
      }
      setLayout((old) =>
        old &&
        old.key === key &&
        old.vw === vw &&
        old.vh === vh &&
        old.height === height &&
        (old.hole === hole || (old.hole && hole && old.hole.x === hole.x && old.hole.y === hole.y && old.hole.w === hole.w && old.hole.h === hole.h))
          ? old
          : { key, hole, vw, vh, height }
      )
    }
    function settle(from) {
      measure()
      if (!stopped && performance.now() - from < 900) cancel = soon(() => settle(from))
    }
    function locate() {
      if (stopped) return
      const found = find()
      if (!found.length && ids.length && performance.now() - started < 1500) {
        cancel = soon(locate)
        return
      }
      targets.current = found
      found[0]?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
      settle(performance.now())
    }

    cancel = soon(locate)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      stopped = true
      cancel()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [key, targetIds, union])

  const ready = Boolean(layout && layout.key === key && layout.height > 0)

  // Each step is read out: focus moves to the box, which is named by the
  // step's title and described by its text.
  useEffect(() => {
    if (ready) boxRef.current?.focus({ preventScroll: true })
  }, [ready, key])

  // Focus goes back where it was when the tour ends.
  useEffect(() => {
    if (!open) return undefined
    const returnTo = document.activeElement
    return () => {
      if (returnTo?.isConnected && returnTo !== document.body) returnTo.focus({ preventScroll: true })
    }
  }, [open])

  // Escape skips the tour from anywhere, ahead of any panel underneath.
  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      onClose(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!current) return null

  const next = () => (last ? onClose(true) : onStepChange(step + 1))
  const back = () => step > 0 && onStepChange(step - 1)

  // Keyboard: the arrows step through; Tab stays inside the box.
  function onKeyDown(event) {
    if (event.key === 'ArrowRight') next()
    else if (event.key === 'ArrowLeft') back()
    else if (event.key === 'Tab') {
      const items = [...boxRef.current.querySelectorAll('button:not([disabled])')]
      const first = items[0]
      const final = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === boxRef.current)) {
        event.preventDefault()
        final.focus()
      } else if (!event.shiftKey && document.activeElement === final) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  const vw = layout?.vw ?? document.documentElement.clientWidth
  const vh = layout?.vh ?? window.innerHeight
  const hole = ready ? layout.hole : null
  const spot = place(hole, ready ? layout.height : 0, vw, vh)

  return createPortal(
    <div className="font-sans text-fg">
      {/* Taps anywhere under the tour land here and do nothing. */}
      <svg
        aria-hidden="true"
        className="fixed inset-0 z-50 size-full animate-fade-in motion-reduce:animate-none"
        onMouseDown={(event) => event.preventDefault()}
      >
        <rect width="100%" height="100%" className="fill-transparent" />
        <path d={dimPath(vw, vh, hole)} fillRule="evenodd" className="fill-brand/40" />
        {hole && (
          <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={Math.min(RADIUS, hole.w / 2, hole.h / 2)} className="fill-none stroke-accent" strokeWidth={2} />
        )}
      </svg>

      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn('fixed z-50 outline-hidden', !ready && 'invisible')}
        style={{ top: spot.top, left: spot.left, width: spot.width }}
      >
        <div className="relative rounded-card border border-line bg-surface p-4 shadow-popover">
          {spot.arrow && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute size-3 rotate-45 border-line bg-surface',
                spot.arrow === 'top' ? '-top-1.5 border-l border-t' : '-bottom-1.5 border-b border-r'
              )}
              style={{ left: spot.arrowX - 6 }}
            />
          )}
          <p className="text-xs text-fg-subtle">{t('tour.progress', { current: step + 1, total: steps.length })}</p>
          <h2 id={titleId} className="mt-1 text-base font-semibold text-fg">
            {current.title}
          </h2>
          <p id={bodyId} className="mt-1 text-sm text-fg-muted">
            {current.body}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className="-ml-2 max-sm:h-11" onClick={() => onClose(false)}>
              {t('tour.skip')}
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="secondary" size="sm" className="max-sm:h-11" onClick={back}>
                  {t('tour.back')}
                </Button>
              )}
              <Button size="sm" className="max-sm:h-11" onClick={next}>
                {last ? t('tour.finish') : t('tour.next')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
