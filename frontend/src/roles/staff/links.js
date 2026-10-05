// Phone links for the agent screens. Numbers are stored as 60XXXXXXXXX.

export function getWhatsAppUrl(phone, text = '', useWaBusiness = false) {
  const isAndroid = /Android/i.test(navigator.userAgent)
  const encodedText = text ? encodeURIComponent(text) : ''
  const waMeUrl = `https://wa.me/${phone}${text ? `?text=${encodedText}` : ''}`

  if (isAndroid) {
    const pkg = useWaBusiness ? 'com.whatsapp.w4b' : 'com.whatsapp'
    const fallbackUrl = encodeURIComponent(waMeUrl)
    return `intent://send?phone=${phone}${text ? `&text=${encodedText}` : ''}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${fallbackUrl};end`
  }
  return waMeUrl
}

export function getSmsUrl(phone, text = '') {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const separator = isIOS ? '&' : '?'
  const encodedText = text ? encodeURIComponent(text) : ''
  return `sms:+${phone}${separator}body=${encodedText}`
}

export function getCallUrl(phone) {
  const local = String(phone).startsWith('60') ? '0' + String(phone).slice(2) : String(phone)
  return `tel:${local}`
}
