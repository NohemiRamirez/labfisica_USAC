import { SECTIONS } from './ReportsPage'
import useStore from '../../store/useStore'
import styles from './ReportsPage.module.css'

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

function isFilled(sectionId, reportData) {
  switch (sectionId) {
    case 'header':       return !!(reportData.titulo && reportData.curso)
    case 'resumen':      return !!reportData.resumen?.trim()
    case 'objetivos':    return reportData.objGenerales?.some((o) => o.trim())
    default:
      return !!(reportData.latexSections?.[sectionId]?.trim())
  }
}

function SectionsPanel({ activeSection, onSelect }) {
  const reportData      = useStore((s) => s.reportData)
  const toggleSection   = useStore((s) => s.toggleSection)
  const enabledSections = reportData.enabledSections || []

  return (
    <div className={styles.sectionsPanel}>
      <div className={styles.sectionsPanelTitle}>Secciones</div>
      <ul className={styles.sectionsList}>
        {SECTIONS.map((section) => {
          const filled   = isFilled(section.id, reportData)
          const isActive = activeSection === section.id
          const enabled  = section.required ||
                           enabledSections.includes(section.id)

          return (
            <li key={section.id} className={styles.sectionListItem}>
              {!section.required ? (
                <input
                  type="checkbox"
                  className={styles.sectionToggle}
                  checked={enabled}
                  onChange={() => toggleSection(section.id)}
                  title={enabled ? 'Desactivar' : 'Activar'}
                />
              ) : (
                <div className={styles.sectionTogglePlaceholder} />
              )}

              <button
                className={`
                  ${styles.sectionItem}
                  ${isActive   ? styles.sectionActive   : ''}
                  ${!enabled   ? styles.sectionDisabled : ''}
                `}
                onClick={() => enabled && onSelect(section.id)}
                disabled={!enabled}
              >
                <div className={`
                  ${styles.sectionCheck}
                  ${filled && enabled ? styles.sectionCheckFilled : ''}
                `}>
                  {filled && enabled && <IconCheck />}
                </div>
                <span className={styles.sectionLabel}>{section.label}</span>
                {section.required && (
                  <span className={styles.sectionRequired} title="Obligatoria">
                    *
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <div className={styles.sectionsPanelNote}>* Sección obligatoria</div>
    </div>
  )
}

export default SectionsPanel