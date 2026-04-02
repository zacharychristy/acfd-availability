import { useState, useEffect } from 'react'
import { monthOptions, currentYM, daysInMonth, firstDayOfWeek, monthLabel, SHIFTS, getShiftRotationForYMD } from '../lib/utils.js'
import { fetchMonthAvailability } from '../lib/data.js'
import styles from './ChiefView.module.css'

const SHIFT_OPTS = [
  { val: '', label: '— all shifts —' },
  { val: 's24', label: '24-hr  (7am – 7am)' },
  { val: 'am',  label: 'AM  (7am – 7pm)' },
  { val: 'pm',  label: 'PM  (7pm – 7am)' },
]

const shiftBadge = { s24: 'badge24', am: 'badgeAm', pm: 'badgePm' }
const shiftLabel = { s24: '24-hr', am: 'AM', pm: 'PM' }

export default function ChiefView() {
  const [ym, setYm] = useState(currentYM())
  const [day, setDay] = useState('')
  const [shift, setShift] = useState('')
  const [monthData, setMonthData] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setDay('')
    fetchMonthAvailability(ym).then(({ data }) => {
      setMonthData(data || {})
      setLoading(false)
    })
  }, [ym])

  const opts = monthOptions()
  const total = daysInMonth(ym)
  const uniqueEmployees = new Set(Object.keys(monthData)).size

  const rows = []
  if (day) {
    const d = parseInt(day)
    for (const [empName, days] of Object.entries(monthData)) {
      if (!days[d]) continue
      const matchedShifts = SHIFTS.filter(s => {
        if (shift && s.key !== shift) return false
        return days[d][s.key]
      })
      if (matchedShifts.length) rows.push({ name: empName, shifts: matchedShifts })
    }
    const shiftPriority = { s24: 0, am: 1, pm: 2 }
    rows.sort((a, b) => {
      const aPriority = Math.min(...a.shifts.map(s => shiftPriority[s.key]))
      const bPriority = Math.min(...b.shifts.map(s => shiftPriority[s.key]))
      if (aPriority !== bPriority) return aPriority - bPriority
      return a.name.localeCompare(b.name)
    })
  }

  const selectedRotation = day ? getShiftRotationForYMD(ym, parseInt(day)) : null

  function exportCSV() {
    if (!day || !rows.length) return
    const lines = ['Name,Shift']
    rows.forEach(r => r.shifts.forEach(s => lines.push(`${r.name},${shiftLabel[s.key]}`)))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ACFD_Availability_${ym}_Day${day}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDayClick(d) {
    setDay(prev => prev === String(d) ? '' : String(d))
  }

  return (
    <div className={styles.view}>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Month</label>
          <div className="select-wrap">
            <select value={ym} onChange={e => setYm(e.target.value)}>
              {opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Shift filter</label>
          <div className="select-wrap">
            <select value={shift} onChange={e => setShift(e.target.value)}>
              {SHIFT_OPTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.filterGroup} style={{ justifyContent: 'flex-end' }}>
          <label className={styles.label}>&nbsp;</label>
          <button className={styles.exportBtn} onClick={exportCSV} disabled={!day || !rows.length}>
            Export CSV
          </button>
        </div>
      </div>

      {!day ? (
        <div className={styles.prompt}>
          <div className={styles.promptIcon}>📅</div>
          <p className={styles.promptText}>Select a date to view availability</p>
          <p className={styles.promptSub}>Tap any day on the calendar below</p>
        </div>
      ) : (
        <div className={styles.resultsPanel}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsTitle}>
              <span className={styles.selectedDate}>
                {monthLabel(ym).split(' ')[0]} {day}
              </span>
              <span className={`${styles.rotTag} ${styles['rot' + selectedRotation]}`}>
                {selectedRotation}-shift
              </span>
              {shift && (
                <span className={`${styles.badge} ${styles[shiftBadge[shift]]}`}>
                  {shiftLabel[shift]} only
                </span>
              )}
            </div>
            <button className={styles.clearDay} onClick={() => setDay('')}>✕ Clear</button>
          </div>

          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : rows.length === 0 ? (
            <div className={styles.empty}>
              <p>No availability submitted for this date yet.</p>
            </div>
          ) : (
            <>
              <div className={styles.countLine}>
                {rows.length} member{rows.length !== 1 ? 's' : ''} available
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Available shifts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>
                        {r.shifts.map(s => (
                          <span key={s.key} className={`${styles.badge} ${styles[shiftBadge[s.key]]}`}>
                            {shiftLabel[s.key]}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      <div className={styles.calendarSection}>
        <div className={styles.calendarTitle}>
          {monthLabel(ym)} — tap a date
        </div>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : (
          <MiniCalendar
            ym={ym}
            monthData={monthData}
            onDayClick={handleDayClick}
            selectedDay={day}
            shiftFilter={shift}
          />
        )}
      </div>

      <div className={styles.footerStats}>
        {uniqueEmployees} member{uniqueEmployees !== 1 ? 's' : ''} submitted availability for {monthLabel(ym)}
      </div>

    </div>
  )
}

function MiniCalendar({ ym, monthData, onDayClick, selectedDay, shiftFilter }) {
  const total = daysInMonth(ym)
  const start = firstDayOfWeek(ym)
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className={styles.miniCal}>
      {DOW.map(d => <div key={d} className={styles.miniDayH}>{d}</div>)}
      {Array.from({ length: start }, (_, i) => <div key={`b${i}`} />)}
      {Array.from({ length: total }, (_, i) => {
        const d = i + 1
        let c24 = 0, cam = 0, cpm = 0, total_avail = 0
        Object.values(monthData).forEach(days => {
          if (!days[d]) return
          if (days[d].s24) c24++
          if (days[d].am) cam++
          if (days[d].pm) cpm++
        })

        if (!shiftFilter) total_avail = Object.values(monthData).filter(days => days[d] && (days[d].s24 || days[d].am || days[d].pm)).length
        else if (shiftFilter === 's24') total_avail = c24
        else if (shiftFilter === 'am') total_avail = cam
        else if (shiftFilter === 'pm') total_avail = cpm

        const isSelected = selectedDay === String(d)
        const rotation = getShiftRotationForYMD(ym, d)
        const hasData = total_avail > 0

        return (
          <div
            key={d}
            className={`${styles.miniCell} ${isSelected ? styles.miniSelected : ''} ${hasData ? styles.miniHasData : ''}`}
            onClick={() => onDayClick(d)}
          >
            <div className={styles.miniTop}>
              <div className={styles.miniNum}>{d}</div>
              <div className={`${styles.miniRotation} ${styles['rot' + rotation]}`}>{rotation}</div>
            </div>
            <div className={styles.miniBars}>
              <div className={styles.miniBar} style={{ background: c24 ? `rgba(26,96,184,${Math.min(1, 0.25 + c24 * 0.15)})` : 'var(--border)' }} />
              <div className={styles.miniBar} style={{ background: cam ? `rgba(106,153,0,${Math.min(1, 0.25 + cam * 0.15)})` : 'var(--border)' }} />
              <div className={styles.miniBar} style={{ background: cpm ? `rgba(200,120,32,${Math.min(1, 0.25 + cpm * 0.15)})` : 'var(--border)' }} />
            </div>
            {total_avail > 0 && (
              <div className={styles.miniCount}>{total_avail}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
