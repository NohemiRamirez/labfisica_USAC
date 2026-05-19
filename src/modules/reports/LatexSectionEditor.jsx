import { useRef, useState } from 'react'
import useStore from '../../store/useStore'
import {
  generateDataTableLatex,
  generateCustomTableLatex,
  generateFitResultsLatex,
  generateFigureLatex,
  generateEquationLatex,
} from '../../utils/latexGenerator'
import CustomTableModal from './CustomTableModal'
import EquationModal    from './EquationModal'
import styles from './ReportsPage.module.css'

function LatexSectionEditor({ sectionId, title, hint }) {
  const content        = useStore((s) => s.reportData.latexSections[sectionId] || '')
  const setLatexSection= useStore((s) => s.setLatexSection)
  const tableData      = useStore((s) => s.tableData)
  const axisLabels     = useStore((s) => s.axisLabels)
  const fitResult      = useStore((s) => s.fitResult)
  const addImage       = useStore((s) => s.addImage)
  const svgRef         = useStore((s) => s.svgRef)

  const textareaRef = useRef(null)
  const fileRef     = useRef(null)
  const graphRef    = useRef(null)

  const [showTableModal, setShowTableModal] = useState(false)
  const [showEqModal,    setShowEqModal]    = useState(false)

  // ── Inyecta código en la posición del cursor ──
  function injectCode(code) {
    const ta    = textareaRef.current
    if (!ta) { setLatexSection(sectionId, content + '\n' + code); return }

    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const newContent =
      content.substring(0, start) + '\n' + code + '\n' +
      content.substring(end)

    setLatexSection(sectionId, newContent)

    // Restaura el foco y mueve el cursor al final del código insertado
    setTimeout(() => {
      ta.focus()
      const pos = start + code.length + 2
      ta.setSelectionRange(pos, pos)
    }, 10)
  }

  // ── Tabla de datos ─────────────────────────────
  function handleInsertDataTable() {
    if (tableData.length === 0) {
      alert('No hay datos cargados en la tabla de datos.')
      return
    }
    const caption = prompt('Caption de la tabla:', 'Datos experimentales') ?? 'Datos experimentales'
    injectCode(generateDataTableLatex(tableData, axisLabels, caption))
  }

  // ── Resultados del ajuste ──────────────────────
  function handleInsertFitResults() {
    if (!fitResult) {
      alert('No hay resultados de ajuste. Ve al módulo de análisis gráfico.')
      return
    }
    const caption = prompt('Caption de la tabla:', 'Resultados del ajuste de curva') ?? 'Resultados del ajuste de curva'
    injectCode(generateFitResultsLatex(fitResult, caption))
  }

  // ── Figura/foto ────────────────────────────────
  function handleFigureFile(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      // Guarda la imagen en el store
      addImage({
        id:       crypto.randomUUID(),
        filename: file.name,
        dataUrl:  ev.target.result,
      })
      const caption = prompt('Caption de la figura:', file.name.replace(/\.[^.]+$/, '')) ?? ''
      injectCode(generateFigureLatex(file.name, caption))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Gráfica D3 ────────────────────────────────
  async function handleInsertGraph() {
  // getState() permite acceder al store fuera del ciclo de React
  const graphImage = useStore.getState().graphImage

  if (!graphImage) {
    alert('No hay gráfica guardada. Ve al módulo de análisis gráfico y presiona "Calcular ajuste" primero.')
    return
  }

  addImage({
    id:       crypto.randomUUID(),
    filename: graphImage.filename,
    dataUrl:  graphImage.dataUrl,
  })

  const caption = prompt('Caption de la gráfica:', 'Gráfica de ajuste de curva') ?? ''
  injectCode(generateFigureLatex(graphImage.filename, caption))
}

  // ── Subsección ────────────────────────────────
  function handleInsertSubsection() {
    injectCode('\\subsection{Título de subsección}')
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {hint && <p className={styles.sectionHint}>{hint}</p>}

      {/* ── Barra de herramientas ────────────── */}
      <div className={styles.latexToolbar}>
        <span className={styles.latexToolbarLabel}>Insertar:</span>

        <button className={styles.latexToolbarBtn}
          onClick={handleInsertDataTable}
          title="Inserta la tabla de datos experimentales">
          📊 Tabla de datos
        </button>

        <button className={styles.latexToolbarBtn}
          onClick={() => setShowTableModal(true)}
          title="Crea una tabla personalizada">
          📋 Tabla personalizada
        </button>

        <button className={styles.latexToolbarBtn}
          onClick={handleInsertFitResults}
          title="Inserta los resultados del ajuste de curva">
          📉 Resultados del ajuste
        </button>

        <button className={styles.latexToolbarBtn}
          onClick={() => fileRef.current?.click()}
          title="Inserta una figura o foto">
          🖼 Figura / Foto
        </button>
        <input ref={fileRef} type="file" accept="image/*"
          onChange={handleFigureFile} style={{ display: 'none' }} />

        <button className={styles.latexToolbarBtn}
          onClick={handleInsertGraph}
          title="Exporta e inserta la gráfica D3">
          📈 Gráfica D3
        </button>

        <button className={styles.latexToolbarBtn}
          onClick={() => setShowEqModal(true)}
          title="Inserta una ecuación numerada">
          ∑ Ecuación
        </button>

        <button className={styles.latexToolbarBtn}
          onClick={handleInsertSubsection}
          title="Inserta una subsección">
          § Subsección
        </button>
      </div>

      {/* ── Editor LaTeX ─────────────────────── */}
      <div className={styles.latexEditorWrap}>
        <textarea
          ref={textareaRef}
          className={styles.latexEditor}
          value={content}
          onChange={(e) => setLatexSection(sectionId, e.target.value)}
          placeholder={`Escribe el contenido en LaTeX...\n\nEjemplo:\nEl movimiento circular \\textbf{uniformemente variado} se define como...\n\n\\subsection{Magnitudes angulares}\nLa posición angular $\\theta$ se mide en radianes.`}
          spellCheck={false}
        />
        <div className={styles.latexEditorFooter}>
          <span>{content.length} caracteres</span>
          <span className={styles.latexHint}>
            Tip: usa los botones para insertar elementos en la posición del cursor
          </span>
        </div>
      </div>

      {/* Modales */}
      {showTableModal && (
        <CustomTableModal
          onInsert={(latex) => { injectCode(latex); setShowTableModal(false) }}
          onClose={() => setShowTableModal(false)}
        />
      )}

      {showEqModal && (
        <EquationModal
          onInsert={(latex) => { injectCode(latex); setShowEqModal(false) }}
          onClose={() => setShowEqModal(false)}
        />
      )}
    </div>
  )
}

export default LatexSectionEditor