import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { to: '/home',           label: 'Inicio' },
  { to: '/data-table',     label: 'Tabla de datos' },
  { to: '/graph-analysis', label: 'Análisis gráfico' },
  { to: '/reports',        label: 'Reportes' },
  { to: '/laboratories',   label: 'Laboratorios' },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>

        <div className={styles.brand}>
          <img
            src="/assets/image.png"
            alt="Logo USAC"
            className={styles.logo}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className={styles.title}>LabFísica USAC</span>
        </div>

        <ul className={styles.navLinks}>
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menú"
        >
          <span className={`${styles.bar} ${menuOpen ? styles.bar1Open : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.bar2Open : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.bar3Open : ''}`} />
        </button>
      </div>

      {menuOpen && (
        <ul className={styles.mobileMenu}>
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  isActive ? `${styles.mobileLink} ${styles.active}` : styles.mobileLink
                }
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}

export default Navbar