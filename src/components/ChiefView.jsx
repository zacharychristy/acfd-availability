import { useState, useEffect } from 'react'
import { monthOptions, currentYM, daysInMonth, firstDayOfWeek, monthLabel, SHIFTS } from '../lib/utils.js'
import { fetchMonthAvailability } from '../lib/data.js'
import styles from './ChiefView.module.css'

const SHIFT_OPTS = [
  { val: '', label: '— all shifts —' },
  { val: 's24', label: '24-hr  (7am – 7am)' },
  { val: 'am',  label: 'AM  (7am – 7pm)' },
  { val: 'pm',  label: 'PM  (7pm – 7am)' },
]

export default function ChiefView() {
  const [ym, setYm] = useState(currentYM())
  const [day, setDay] = useState('')
  const [shift, setShift] = useState('')
  const [monthData, setMonthData] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchMonthAvailability(ym).then(({ data }) => {
      setMonthData(data || {})
      setLoading(false)
    })
  }, [ym])

  const opts = monthOptions()
  const total = daysInMonth(ym)
  const dayOpts = [{ val: '', label: '— all days —' }]
  for (let d = 1; d <= total; d++) dayOpts.push({ val: String(d), label: String(d) })

  // Build result rows
  const rows = []
  const daysToCheck = day ? [parseInt(day)] : Array.from({ length: total }, (_, i) => i + 1)

  for (const d of daysToCheck) {
    for (const [empName, days] of Object.entries(monthData)) {
      if (!days[d]) continue
      const dayShifts = days[d]
      const matchedShifts = SHIFTS.filter(s => {
        if (shift && s.key !== shift) return false
        return dayShifts[s.key]
      })
      if (matchedShifts.length) rows.push({ name: empName, day: d, shifts: matchedShifts })
    }
  }
  if (!day) rows.sort((a, b) => a.day - b.day || a.name.localeCompare(b.name))
  else rows.sort((a, b) => a.name.localeCompare(b.name))

  // Stats for summary cards
  const uniqueEmployees = new Set(Object.keys(monthData)).size
  const totalSubmissions = rows.length
  const coverageByShift = {}
  SHIFTS.forEach(s => {
    coverageByShift[s.key] = new Set()
    for (const [, days] of Object.entries(monthData)) {
      for (let d = 1; d <= total; d++) {
        if (days[d] && days[d][s.key]) coverageByShift[s.key].add(d)
      }
    }
  })

  const shiftBadge = { s24: styles.badge24, am: styles.badgeAm, pm: styles.badgePm }
  const shiftLabel = { s24: '24-hr', am: 'AM', pm: 'PM' }

  function exportCSV() {
    const lines = ['Name,Day,Shift']
    rows.forEach(r => r.shifts.forEach(s => lines.push(`${r.name},${r.day},${shiftLabel[s.key]}`)))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ACFD_Availability_${ym}${day ? `_Day${day}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.view}>

      {/* Summary cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Employees submitted</div>
          <div className={styles.cardVal}>{uniqueEmployees}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Days with 24-hr coverage</div>
          <div className={styles.cardVal} style={{ color: '#9dc9f0' }}>{coverageByShift.s24.size}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Days with AM coverage</div>
          <div className={styles.cardVal} style={{ color: '#9cd49b' }}>{coverageByShift.am.size}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Days with PM coverage</div>
          <div className={styles.cardVal} style={{ color: '#d0a0ee' }}>{coverageByShift.pm.size}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Month</label>
          <div className="select-wrap">
            <select value={ym} onChange={e => { setYm(e.target.value); setDay('') }}>
              {opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Day</label>
          <div className="select-wrap">
            <select value={day} onChange={e => setDay(e.target.value)}>
              {dayOpts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Shift</label>
          <div className="select-wrap">
            <select value={shift} onChange={e => setShift(e.target.value)}>
              {SHIFT_OPTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.filterGroup} style={{ justifyContent: 'flex-end' }}>
          <label className={styles.label}>&nbsp;</label>
          <button className={styles.exportBtn} onClick={exportCSV} disabled={!rows.length}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Results */}
      <div className={styles.resultsHeader}>
        <span style={{ color: 'var(--gold)' }}>{monthLabel(ym)}</span>
        {' — '}
        {day ? `Day ${day}` : 'All days'}
        {' · '}
        {shift ? SHIFT_OPTS.find(o => o.val === shift)?.label.split(' ')[0] : 'All shifts'}
        {' — '}
        <span style={{ color: 'var(--gold)' }}>{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p>No availability data matches this filter.</p>
          <p style={{ marginTop: 6, fontSize: 12, color: 'var(--hint)' }}>Employees submit via the "Employee Submission" tab.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              {!day && <th>Day</th>}
              <th>Available Shifts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.name}</td>
                {!day && <td className={styles.dayNum}>{r.day}</td>}
                <td>
                  {r.shifts.map(s => (
                    <span key={s.key} className={`${styles.badge} ${shiftBadge[s.key]}`}>
                      {shiftLabel[s.key]}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Month overview mini-calendar */}
      <div className={styles.divider} />
      <div className={styles.overviewTitle}>Month at a glance — click a day to filter</div>
      <MiniCalendar ym={ym} monthData={monthData} onDayClick={d => setDay(day === String(d) ? '' : String(d))} selectedDay={day} />
    </div>
  )
}

function MiniCalendar({ ym, monthData, onDayClick, selectedDay }) {
  const total = daysInMonth(ym)
  const start = firstDayOfWeek(ym)
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className={styles.miniCal}>
      {DOW.map(d => <div key={d} className={styles.miniDayH}>{d}</div>)}
      {Array.from({ length: start }, (_, i) => <div key={`b${i}`} />)}
      {Array.from({ length: total }, (_, i) => {
        const d = i + 1
        let c24 = 0, cam = 0, cpm = 0
        Object.values(monthData).forEach(days => {
          if (!days[d]) return
          if (days[d].s24) c24++
          if (days[d].am) cam++
          if (days[d].pm) cpm++
        })
        const isSelected = selectedDay === String(d)
        return (
          <div
            key={d}
            className={`${styles.miniCell} ${isSelected ? styles.miniSelected : ''}`}
            title={`Day ${d}: ${c24} 24-hr, ${cam} AM, ${cpm} PM`}
            onClick={() => onDayClick(d)}
          >
            <div className={styles.miniNum}>{d}</div>
            <div className={styles.miniBars}>
              <div className={styles.miniBar} style={{ background: c24 ? `rgba(58,106,154,${Math.min(1, 0.3 + c24 * 0.15)})` : '#1a2030' }} />
              <div className={styles.miniBar} style={{ background: cam ? `rgba(58,122,57,${Math.min(1, 0.3 + cam * 0.15)})` : '#1a2030' }} />
              <div className={styles.miniBar} style={{ background: cpm ? `rgba(90,58,122,${Math.min(1, 0.3 + cpm * 0.15)})` : '#1a2030' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
