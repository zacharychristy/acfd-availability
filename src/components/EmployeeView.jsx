import { useState, useEffect, useRef } from 'react'
import { monthOptions, currentYM, daysInMonth, firstDayOfWeek, SHIFTS } from '../lib/utils.js'
import { submitAvailability, fetchKnownNames, fetchEmployeeMonth } from '../lib/data.js'
import { showToast } from './Toast.jsx'
import styles from './EmployeeView.module.css'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildEmptySelections(ym) {
  const total = daysInMonth(ym)
  const sel = {}
  for (let d = 1; d <= total; d++) sel[d] = { s24: false, am: false, pm: false }
  return sel
}

export default function EmployeeView() {
  const [name, setName] = useState('')
  const [ym, setYm] = useState(currentYM())
  const [selections, setSelections] = useState(() => buildEmptySelections(currentYM()))
  const [knownNames, setKnownNames] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingPrev, setLoadingPrev] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    fetchKnownNames().then(setKnownNames)
  }, [])

  // When month changes, reset calendar
  useEffect(() => {
    setSelections(buildEmptySelections(ym))
  }, [ym])

  // When name + month both set, pre-fill if prior submission exists
  useEffect(() => {
    if (!name.trim()) return
    let cancelled = false
    setLoadingPrev(true)
    fetchEmployeeMonth(name.trim(), ym).then(prev => {
      if (cancelled) return
      setLoadingPrev(false)
      if (!prev || !Object.keys(prev).length) return
      setSelections(cur => {
        const next = { ...cur }
        Object.entries(prev).forEach(([day, shifts]) => {
          if (next[day]) next[day] = { ...shifts }
        })
        return next
      })
    })
    return () => { cancelled = true }
  }, [name, ym])

  function onNameChange(val) {
    setName(val)
    if (!val.trim()) { setSuggestions([]); return }
    const lower = val.toLowerCase()
    setSuggestions(knownNames.filter(n => n.toLowerCase().includes(lower) && n.toLowerCase() !== lower).slice(0, 6))
  }

  function pickSuggestion(n) {
    setName(n)
    setSuggestions([])
  }

  function toggleShift(day, shiftKey) {
    setSelections(prev => ({
      ...prev,
      [day]: { ...prev[day], [shiftKey]: !prev[day][shiftKey] }
    }))
  }

  function selectAll(shiftKey) {
    setSelections(prev => {
      const next = { ...prev }
      const anyOff = Object.values(next).some(d => !d[shiftKey])
      Object.keys(next).forEach(d => { next[d] = { ...next[d], [shiftKey]: anyOff } })
      return next
    })
  }

  function clearAll() {
    setSelections(buildEmptySelections(ym))
  }

  async function handleSubmit() {
    if (!name.trim()) { showToast('Please enter your name.', 'error'); return }
    const hasAny = Object.values(selections).some(d => d.s24 || d.am || d.pm)
    if (!hasAny) { showToast('Please select at least one shift.', 'error'); return }

    setSubmitting(true)
    const { error } = await submitAvailability(name.trim(), ym, selections)
    setSubmitting(false)

    if (error) {
      console.error(error)
      showToast('Submission failed — please try again.', 'error')
    } else {
      showToast(`Availability submitted for ${name.trim()}!`)
      if (!knownNames.includes(name.trim())) {
        setKnownNames(prev => [...prev, name.trim()].sort())
      }
    }
  }

  const total = daysInMonth(ym)
  const startDay = firstDayOfWeek(ym)
  const opts = monthOptions()

  const selectedCount = Object.values(selections).filter(d => d.s24 || d.am || d.pm).length

  return (
    <div className={styles.view}>

      <div className={styles.topRow}>
        <div className={styles.field}>
          <label className={styles.label}>Your name</label>
          <div className={styles.nameWrap}>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="First and last name..."
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div className={styles.suggestions}>
                {suggestions.map(n => (
                  <div key={n} className={styles.suggestion} onMouseDown={() => pickSuggestion(n)}>{n}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Month</label>
          <div className="select-wrap">
            <select value={ym} onChange={e => setYm(e.target.value)}>
              {opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loadingPrev && <div className={styles.loadingNote}>Loading your previous submission…</div>}

      <div className={styles.calHeader}>
        <div>
          <div className={styles.label}>Select your available shifts</div>
          <div className={styles.legend}>
            {SHIFTS.map(s => (
              <span key={s.key} className={`${styles.legendItem} ${styles[s.colorClass]}`}>
                {s.label} <span className={styles.legendDesc}>{s.desc}</span>
              </span>
            ))}
          </div>
        </div>
        <div className={styles.quickActions}>
          {SHIFTS.map(s => (
            <button key={s.key} className={styles.quickBtn} onClick={() => selectAll(s.key)}>
              Toggle all {s.short}
            </button>
          ))}
          <button className={styles.quickBtnDanger} onClick={clearAll}>Clear all</button>
        </div>
      </div>

      <div className={styles.calendar}>
        {DAYS_OF_WEEK.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}

        {Array.from({ length: startDay }, (_, i) => (
          <div key={`blank-${i}`} className={styles.blankCell} />
        ))}

        {Array.from({ length: total }, (_, i) => {
          const day = i + 1
          const sel = selections[day] || { s24: false, am: false, pm: false }
          return (
            <div key={day} className={styles.dayCell}>
              <div className={styles.dayNum}>{day}</div>
              <div className={styles.shiftBtns}>
                {SHIFTS.map(s => (
                  <button
                    key={s.key}
                    className={`${styles.shiftBtn} ${styles[s.colorClass]} ${sel[s.key] ? styles.on : ''}`}
                    onClick={() => toggleShift(day, s.key)}
                  >
                    {s.short}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        <span className={styles.countNote}>
          {selectedCount > 0 ? `${selectedCount} day${selectedCount !== 1 ? 's' : ''} selected` : 'No days selected yet'}
        </span>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit Availability'}
        </button>
      </div>
    </div>
  )
}
