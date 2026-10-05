import { DropdownMenu } from 'radix-ui'
import { cn } from './cn'

/**
 * Menu — a short list of actions that opens from a button.
 *
 *   <Menu trigger={<IconButton label="More actions" icon={MoreHorizontal} />}>
 *     <MenuItem icon={Pencil} onSelect={edit}>Edit</MenuItem>
 *     <MenuSeparator />
 *     <MenuItem icon={Trash2} tone="danger" onSelect={remove}>Delete</MenuItem>
 *   </Menu>
 *
 * Arrow keys move, Enter picks, Escape closes and returns focus to the trigger.
 */
export function Menu({ trigger, align = 'end', open, onOpenChange, className, children }) {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'z-50 min-w-48 max-w-[calc(100vw-1rem)] rounded-control bg-surface p-1 font-sans text-sm text-fg shadow-popover',
            'animate-pop-in motion-reduce:animate-none',
            className
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

const ITEM =
  'flex h-9 cursor-default select-none items-center gap-2.5 rounded-control px-2.5 outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

export function MenuItem({ icon: Icon, tone = 'default', onSelect, disabled, hint, children }) {
  const danger = tone === 'danger'
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        ITEM,
        danger ? 'text-danger data-[highlighted]:bg-danger-subtle' : 'data-[highlighted]:bg-sunken'
      )}
    >
      {Icon && <Icon className={cn('size-4 shrink-0', !danger && 'text-fg-muted')} aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
    </DropdownMenu.Item>
  )
}

/** MenuLabel — names a group of items. Sentence case, quiet. */
export function MenuLabel({ children }) {
  return <DropdownMenu.Label className="px-2.5 pb-1 pt-2 text-xs text-fg-subtle">{children}</DropdownMenu.Label>
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-line" />
}
