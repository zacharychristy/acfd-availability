import { useState } from 'react'
import Header from './components/Header.jsx'
import EmployeeView from './components/EmployeeView.jsx'
import ChiefView from './components/ChiefView.jsx'
import Toast from './components/Toast.jsx'

export default function App() {
  const [tab, setTab] = useState('employee')

  return (
    <>
      <Header activeTab={tab} onTabChange={setTab} />
      {tab === 'employee' ? <EmployeeView /> : <ChiefView />}
      <Toast />
    </>
  )
}
