import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import useStore from '../../store/useStore'
import { getAllLabs, formatDate } from '../../utils/labStorage'
import styles from './HomePage.module.css'

// Íconos SVG inline
const IconNewReport = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
)

const IconOpenFile = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)

const IconRecent = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const IconFlask = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 3h6M9 3v8l-4 9h14L15 11V3"/>
    <path d="M9 14h6"/>
  </svg>
)

function HomePage() {
  const navigate   = useNavigate()
  const resetStore = useStore((s) => s.resetStore)
  const loadLabIntoStore = useStore((s) => s.loadLabIntoStore)
  const fileInputRef = useRef(null)

  // Obtiene los 3 laboratorios más recientes del localStorage
  const recentLabs = getAllLabs().slice(0, 3)

  // Nuevo reporte: resetea el store y navega a la tabla de datos
  function handleNewReport() {
    resetStore()
    navigate('/data-table')
  }

  // Abre el selector de archivos JSON
  function handleOpenFile() {
    fileInputRef.current?.click()
  }

  // Lee el archivo JSON y carga el laboratorio en el store
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const labData = JSON.parse(event.target.result)
        loadLabIntoStore(labData)
        navigate('/data-table')
      } catch {
        alert('El archivo seleccionado no es un laboratorio válido.')
      }
    }
    reader.readAsText(file)

    // Limpia el input para permitir cargar el mismo archivo otra vez
    e.target.value = ''
  }

  // Abre un laboratorio reciente desde localStorage
  function handleOpenRecent(lab) {
    loadLabIntoStore(lab)
    navigate('/data-table')
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <IconFlask />
            Física Básica — Facultad de Ingeniería, USAC
          </div>
          <h1 className={styles.heroTitle}>
            Sistema de apoyo a<br />laboratorios de física
          </h1>
          <p className={styles.heroSubtitle}>
            Carga tus datos experimentales, genera gráficas con ajuste de curva
            y exporta tu reporte en LaTeX, todo desde el navegador sin
            instalar nada.
          </p>
        </div>
      </section>

      <section className={styles.actionsSection}>
        <div className={styles.actionsGrid}>

          <div className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.iconPrimary}`}>
              <IconNewReport />
            </div>
            <h2 className={styles.cardTitle}>Nuevo reporte</h2>
            <p className={styles.cardDesc}>
              Comienza un laboratorio desde cero con un espacio de trabajo vacío.
            </p>
            <button className={styles.btnPrimary} onClick={handleNewReport}>
              Comenzar
            </button>
          </div>

          <div className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.iconAccent}`}>
              <IconOpenFile />
            </div>
            <h2 className={styles.cardTitle}>Abrir guardado</h2>
            <p className={styles.cardDesc}>
              Carga un laboratorio exportado previamente desde un archivo JSON.
            </p>
            <button className={styles.btnSecondary} onClick={handleOpenFile}>
              Seleccionar archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.iconMuted}`}>
              <IconRecent />
            </div>
            <h2 className={styles.cardTitle}>Laboratorios</h2>
            <p className={styles.cardDesc}>
              Administra, edita y exporta todos tus laboratorios guardados.
            </p>
            <button className={styles.btnSecondary} onClick={() => navigate('/laboratories')}>
              Ver laboratorios
            </button>
          </div>

        </div>
      </section>

      <section className={styles.recentSection}>
        <div className={styles.recentInner}>
          <div className={styles.recentHeader}>
            <h2 className={styles.recentTitle}>Laboratorios recientes</h2>
            <button
              className={styles.recentLink}
              onClick={() => navigate('/laboratories')}
            >
              Ver todos →
            </button>
          </div>

          {recentLabs.length === 0 ? (
            <div className={styles.emptyRecent}>
              <p>No hay laboratorios recientes. Crea uno nuevo para comenzar.</p>
            </div>
          ) : (
            <ul className={styles.recentList}>
              {recentLabs.map((lab) => (
                <li key={lab.id} className={styles.recentItem}>
                  <div className={styles.recentInfo}>
                    <span className={styles.recentName}>{lab.name}</span>
                    <span className={styles.recentMeta}>
                      Modificado: {formatDate(lab.updatedAt)}
                      {lab.tableData?.length > 0 &&
                        ` · ${lab.tableData.length} puntos de datos`}
                    </span>
                  </div>
                  <button
                    className={styles.btnOpen}
                    onClick={() => handleOpenRecent(lab)}
                  >
                    Abrir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

    </div>
  )
}

export default HomePage