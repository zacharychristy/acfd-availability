import styles from './Header.module.css'

export default function Header({ activeTab, onTabChange }) {
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <div className={styles.logoWrap}>
          <img src="/acfd-logo.png" alt="ACFD Seal" className={styles.logo} />
        </div>
        <div className={styles.text}>
          <div className={styles.deptLine}>
            <span className={styles.town}>Town of</span>
            <h1>Ashland City Fire Department</h1>
          </div>
          <p>Part-Time Staff Availability System</p>
        </div>
      </div>
      <div className={styles.stripe} />
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'employee' ? styles.active : ''}`}
          onClick={() => onTabChange('employee')}
        >
          Employee Submission
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'chief' ? styles.active : ''}`}
          onClick={() => onTabChange('chief')}
        >
          Chief's Dashboard
        </button>
      </div>
    </header>
  )
}
