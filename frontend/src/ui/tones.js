// One colour per status tone, used the same way wherever a status shows, so a
// status looks the same on every dashboard. Which status gets which tone is
// decided in status.js; the colours themselves are tokens in index.css.
//
//   TONE_RING    a coloured outline with a soft halo: filter chips, status dropdowns
//   TONE_WASH    a pale fill: a counter cell, a table column's header, the
//                chosen half of a WhatsApp or SMS switch, a toned button
//   TONE_LABEL   the darker text that sits on the wash
//   TONE_COLUMN  the same wash, fainter: the cells down a table column, so a
//                long column stays quiet and a hovered row still shows through
//   TONE_BAR     a solid colour: a bar in a chart
//   TONE_PICK    a thin edge in the status colour: the counter cell that is
//                the current filter, the chosen switch half, a toned button
//   TONE_HOVER   the wash a shade deeper: a toned button under the pointer
//
// `solid` is the finished-and-won tone (Accepted, Disbursed, Converted): a
// filled badge and a full-strength edge, so it never reads as WhatsApp's green.
//
// Class names are written out in full so Tailwind can see them.

export const TONE_RING = {
  neutral: 'border-line-strong ring-3 ring-neutral-halo',
  info: 'border-info-line ring-3 ring-info-halo',
  whatsapp: 'border-whatsapp-line ring-3 ring-whatsapp-halo',
  warning: 'border-warning-line ring-3 ring-warning-halo',
  success: 'border-success-line ring-3 ring-success-halo',
  solid: 'border-success ring-3 ring-success-halo',
  danger: 'border-danger-line ring-3 ring-danger-halo',
  accent: 'border-accent-line ring-3 ring-accent-halo',
}

export const TONE_WASH = {
  neutral: 'bg-sunken',
  info: 'bg-info-subtle',
  whatsapp: 'bg-whatsapp-subtle',
  warning: 'bg-warning-subtle',
  success: 'bg-success-subtle',
  solid: 'bg-success-subtle',
  danger: 'bg-danger-subtle',
  accent: 'bg-accent-subtle',
}

export const TONE_COLUMN = {
  neutral: 'bg-sunken/60',
  info: 'bg-info-subtle/60',
  whatsapp: 'bg-whatsapp-subtle/60',
  warning: 'bg-warning-subtle/60',
  success: 'bg-success-subtle/60',
  solid: 'bg-success-subtle/60',
  danger: 'bg-danger-subtle/60',
  accent: 'bg-accent-subtle/60',
}

// Blue, green and amber are the three chart colours, matched to Called,
// WhatsApp and SMS; the rest are the semantic colours.
export const TONE_BAR = {
  neutral: 'bg-fg-subtle',
  info: 'bg-chart-1',
  whatsapp: 'bg-chart-3',
  warning: 'bg-chart-2',
  success: 'bg-success',
  solid: 'bg-success',
  danger: 'bg-danger',
  accent: 'bg-accent',
}

export const TONE_PICK = {
  neutral: 'ring-line-strong',
  info: 'ring-info-line',
  whatsapp: 'ring-whatsapp-line',
  warning: 'ring-warning-line',
  success: 'ring-success-line',
  solid: 'ring-success',
  danger: 'ring-danger-line',
  accent: 'ring-accent-line',
}

export const TONE_HOVER = {
  neutral: 'hover:bg-neutral-halo',
  info: 'hover:bg-info-halo',
  whatsapp: 'hover:bg-whatsapp-halo',
  warning: 'hover:bg-warning-halo',
  success: 'hover:bg-success-halo',
  solid: 'hover:bg-success-halo',
  danger: 'hover:bg-danger-halo',
  accent: 'hover:bg-accent-halo',
}

export const TONE_LABEL = {
  neutral: 'text-fg-muted',
  info: 'text-info',
  whatsapp: 'text-whatsapp',
  warning: 'text-warning',
  success: 'text-success',
  solid: 'text-success',
  danger: 'text-danger',
  accent: 'text-on-accent',
}
