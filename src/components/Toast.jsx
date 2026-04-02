import { useState, useEffect, useCallback } from 'react'

let _setToast = null

export function useToast() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    _setToast = setToast
    return () => { _setToast = null }
  }, [setToast])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  return toast
}

export function showToast(msg, type = 'success') {
  _setToast && _setToast({ msg, type })
}

export default function Toast() {
  const toast = useToast()

  const styles = {
    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    whiteSpace: 'nowrap', zIndex: 1000, pointerEvents: 'none',
    transition: 'opacity 0.3s',
    opacity: toast ? 1 : 0,
    background: toast?.type === 'error' ? '#2a1010' : '#1a3322',
    border: `1px solid ${toast?.type === 'error' ? '#7a2020' : '#3a7a39'}`,
    color: toast?.type === 'error' ? '#e08080' : '#9cd49b',
  }

  return <div style={styles}>{toast?.msg || ''}</div>
}
