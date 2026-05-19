import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import { generateFullLatex } from '../../utils/latexGenerator'
import SectionsPanel from './SectionsPanel'
import SectionEditor from './SectionEditor'
import DocumentPreview from './DocumentPreview'
import styles from './ReportsPage.module.css'

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

export const SECTIONS = [
  { id: 'header',       label: 'Encabezado',             required: true  },
  { id: 'resumen',      label: 'Resumen',                required: false },
  { id: 'objetivos',    label: 'Objetivos',              required: false },
  { id: 'marcoTeorico', label: 'Marco Teórico',          required: false },
  { id: 'disenio',      label: 'Diseño Experimental',    required: false },
  { id: 'resultados',   label: 'Resultados',             required: true  },
  { id: 'discusion',    label: 'Discusión de Resultados',required: false },
  { id: 'conclusiones', label: 'Conclusiones',           required: false },
  { id: 'bibliografia', label: 'Bibliografía',           required: false },
]

function ReportsPage() {
  const navigate   = useNavigate()
  const reportData = useStore((s) => s.reportData)
  const tableData  = useStore((s) => s.tableData)
  const axisLabels = useStore((s) => s.axisLabels)
  const fitResult  = useStore((s) => s.fitResult)

  const [activeSection, setActiveSection] = useState('header')
  const [showPreview,   setShowPreview]   = useState(false)

  function handleDownloadTex() {
    const latex = generateFullLatex(reportData, tableData, axisLabels, fitResult)
    const blob  = new Blob([latex], { type: 'text/plain;charset=utf-8' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `reporte-${reportData.titulo || 'laboratorio'}.tex`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Generador de reporte</h1>
          <p className={styles.pageSubtitle}>
            Completa las secciones y genera tu reporte LaTeX y PDF.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnBack}
            onClick={() => navigate('/graph-analysis')}>
            <IconBack /> Volver
          </button>
          <button className={styles.btnSecondary}
            onClick={() => setShowPreview(true)}>
            <IconEye /> Previsualizar / PDF
          </button>
          <button className={styles.btnPrimary}
            onClick={handleDownloadTex}>
            <IconDownload /> Descargar .tex
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <SectionsPanel
          activeSection={activeSection}
          onSelect={setActiveSection}
        />
        <div className={styles.editorArea}>
          <SectionEditor activeSection={activeSection} />
        </div>
      </div>

      {showPreview && (
        <DocumentPreview
          reportData={reportData}
          tableData={tableData}
          axisLabels={axisLabels}
          fitResult={fitResult}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}

export default ReportsPage