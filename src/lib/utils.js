export function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function firstDayOfWeek(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).getDay()
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function monthOptions(back = 1, forward = 5) {
  const now = new Date()
  const opts = []
  for (let i = -back; i <= forward; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    opts.push({ val, label })
  }
  return opts
}

export function currentYM() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const SHIFTS = [
  { key: 's24', label: '24-hr', short: '24hr', desc: '7am – 7am', colorClass: 'shift-24' },
  { key: 'am',  label: 'AM',    short: 'AM',   desc: '7am – 7pm', colorClass: 'shift-am' },
  { key: 'pm',  label: 'PM',    short: 'PM',   desc: '7pm – 7am', colorClass: 'shift-pm' },
]

// Anchor: April 2, 2026 = B-shift
// Rotation cycles A -> B -> C -> A -> B -> C every 24 hours
const ANCHOR_DATE = new Date(2026, 3, 2) // months are 0-indexed
const ANCHOR_SHIFT = 1 // 0=A, 1=B, 2=C

export function getShiftRotation(year, month, day) {
  const date = new Date(year, month - 1, day)
  const diffDays = Math.round((date - ANCHOR_DATE) / (1000 * 60 * 60 * 24))
  const shiftIndex = ((ANCHOR_SHIFT + diffDays) % 3 + 3) % 3
  return ['A', 'B', 'C'][shiftIndex]
}

export function getShiftRotationForYMD(ym, day) {
  const [y, m] = ym.split('-').map(Number)
  return getShiftRotation(y, m, day)
}
