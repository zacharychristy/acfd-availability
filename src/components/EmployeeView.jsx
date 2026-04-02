import { useState, useEffect, useRef } from 'react'
import { monthOptions, currentYM, daysInMonth, firstDayOfWeek, SHIFTS, getShiftRotationForYMD } from '../lib/utils.js'
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

function capitalize(val) {
  return val
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export default function EmployeeView() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [ym, setYm] = useState(currentYM())
  const [selections, setSelections] = useState(() => buildEmptySelections(currentYM()))
  const [knownNames, setKnownNames] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingPrev, setLoadingPrev] = useState(false)

  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')

  useEffect(() => {
    fetchKnownNames().then(setKnownNames)
  }, [])

  useEffect(() => {
    setSelections(buildEmptySelections(ym))
  }, [ym])

  useEffect(() => {
    if (!fullName) return
    let cancelled = false
    setLoadingPrev(true)
    fetchEmployeeMonth(fullName, ym).then(prev => {
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
  }, [fullName, ym])

  function handleFirstName(val) { setFirstName(capitalize(val)) }
  function handleLastName(val) { setLastName(capitalize(val)) }

  function toggleShift(day, shiftKey) {
    setSelections(prev => {
      const current = prev[day] || { s24: false, am: false, pm: false }
      const alreadySelected = current[shiftKey]
      return {
        ...prev,
        [day]: {
          s24: !alreadySelected && shiftKey === 's24',
          am:  !alreadySelected && shiftKey === 'am',
          pm:  !alreadySelected && shiftKey === 'pm',
        }
      }
    })
  }

  function selectAllRotation(rotation) {
    setSelections(prev => {
      const next = { ...prev }
      const rotationDays = Object.keys(next).filter(d => getShiftRotationForYMD(ym, parseInt(d)) === rotation)
      const anyOff = rotationDays.some(d => !next[d].s24)
      rotationDays.forEach(d => {
        next[d] = { ...next[d], s24: anyOff }
      })
      return next
    })
  }

  function clearAll() {
    setSelections(buildEmptySelections(ym))
  }

  async function handleSubmit() {
    if (!firstName.trim()) { showToast('Please enter your first name.', 'error'); return }
    if (!lastName.trim()) { showToast('Please enter your last name.', 'error'); return }
    const hasAny = Object.values(selections).some(d => d.s24 || d.am || d.pm)
    if (!hasAny) { showToast('Please select at least one shift.', 'error'); return }

    setSubmitting(true)
    const { error } = await submitAvailability(fullName, ym, selections)
    setSubmitting(false)

    if (error) {
      console.error(error)
      showToast('Submission failed — please try again.', 'error')
    } else {
      showToast(`Availability submitted for ${fullName}!`)
      if (!knownNames.includes(fullName)) {
        setKnownNames(prev => [...prev, fullName].sort())
      }
    }
  }

  const total = daysInMonth(ym)
  const startDay = firstDayOfWeek(ym)
  const opts = monthOptions()
  const selectedCount = Object.values(selections).filter(d => d.s24 || d.am || d.pm).length

  const rotLetterClass = { A: styles.rotLetterA, B: styles.rotLetterB, C: styles.rotLetterC }

  return (
    <div className={styles.view}>

      <div className={styles.topRow}>
        <div className={styles.nameRow}>
          <div className={styles.field}>
            <label className={styles.label}>First name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => handleFirstName(e.target.value)}
              autoComplete="given-name"
              autoCapitalize="words"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={e => handleLastName(e.target.value)}
              autoComplete="family-name"
              autoCapitalize="words"
            />
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
          <div className={styles.rotationLegend}>
            <span className={styles.rotationLegendLabel}>Rotation:</span>
            <span className={`${styles.rotationBadge} ${styles.rotationA}`}>A</span>
            <span className={`${styles.rotationBadge} ${styles.rotationB}`}>B</span>
            <span className={`${styles.rotationBadge} ${styles.rotationC}`}>C</span>
            <span className={styles.rotationLegendNote}>shown on each date</span>
          </div>
        </div>
        <div className={styles.quickActions}>
          {['A', 'B', 'C'].map(rot => (
            <button
              key={rot}
              className={`${styles.quickBtn} ${styles['quickBtn' + rot]}`}
              onClick={() => selectAllRotation(rot)}
            >
              Toggle all {rot}-shifts
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
          const rotation = getShiftRotationForYMD(ym, day)
          return (
            <div key={day} className={styles.dayCell}>
              <div className={styles.dayCellTop}>
                <div className={styles.dayNum}>{day}</div>
                <div className={`${styles.rotLetter} ${rotLetterClass[rotation]}`}>{rotation}</div>
              </div>
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
        <div className={styles.footerLeft}>
          {firstName.trim() && lastName.trim() && (
            <div className={styles.namePreview}>
              Submitting as <strong>{fullName}</strong>
            </div>
          )}
          <div className={styles.countNote}>
            {selectedCount > 0 ? `${selectedCount} day${selectedCount !== 1 ? 's' : ''} selected` : 'No days selected yet'}
          </div>
        </div>
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
