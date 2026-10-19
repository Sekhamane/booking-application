import { addYears, format } from 'date-fns'

export function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'GIFT-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export function getVoucherExpiry(purchaseDate = new Date()) {
  return addYears(purchaseDate, 1)
}

export function formatVoucherExpiry(date) {
  return format(date, 'dd MMM yyyy')
}
