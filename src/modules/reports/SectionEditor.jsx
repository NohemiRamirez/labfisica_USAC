import useStore from '../../store/useStore'
import LatexSectionEditor from './LatexSectionEditor'
import styles from './ReportsPage.module.css'

// ── Encabezado ─────────────────────────────────
function HeaderSection() {
  const reportData  = useStore((s) => s.reportData)
  const setField    = useStore((s) => s.setReportField)
  const addAutor    = useStore((s) => s.addAutor)
  const updateAutor = useStore((s) => s.updateAutor)
  const deleteAutor = useStore((s) => s.deleteAutor)

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Encabezado del documento</h2>

      {[
        { label: 'Nombre del curso', field: 'curso',    ph: 'ej. Física Uno',      req: true  },
        { label: 'Sección',          field: 'seccion',  ph: 'ej. F1-H1',           req: true  },
        { label: 'Nombre práctica',  field: 'titulo',   ph: 'ej. Cinemática MCUV', req: true  },
        { label: 'Fecha',            field: 'fecha',    ph: 'ej. Febrero 10, 2026',req: false },
      ].map(({ label, field, ph, req }) => (
        <div key={field} className={styles.field}>
          <label className={styles.fieldLabel}>
            {label}{req && <span className={styles.req}> *</span>}
          </label>
          <input className={styles.textInput}
            value={reportData[field]}
            onChange={(e) => setField(field, e.target.value)}
            placeholder={ph} />
        </div>
      ))}

      <div className={styles.field}>
        <label className={styles.fieldLabel}>
          Autores <span className={styles.req}>*</span>
        </label>
        <div className={styles.autoresList}>
          {reportData.autores.map((autor) => (
            <div key={autor.id} className={styles.autorRow}>
              <input className={styles.autorInput}
                value={autor.carnet}
                onChange={(e) => updateAutor(autor.id, 'carnet', e.target.value)}
                placeholder="Carné" />
              <input className={`${styles.autorInput} ${styles.autorNombre}`}
                value={autor.nombre}
                onChange={(e) => updateAutor(autor.id, 'nombre', e.target.value)}
                placeholder="Nombre completo" />
              {reportData.autores.length > 1 && (
                <button className={styles.deleteListBtn}
                  onClick={() => deleteAutor(autor.id)}>×</button>
              )}
            </div>
          ))}
          <button className={styles.addListBtn} onClick={addAutor}>
            + Agregar autor
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resumen ────────────────────────────────────
function ResumenSection() {
  const resumen  = useStore((s) => s.reportData.resumen)
  const setField = useStore((s) => s.setReportField)
  const words    = resumen.trim() ? resumen.trim().split(/\s+/).length : 0

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Resumen</h2>
      <p className={styles.sectionHint}>
        Máximo 250 palabras. Redactar en pasado. No citar referencias.
      </p>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Contenido</label>
        <textarea className={styles.textArea} rows={8}
          value={resumen}
          onChange={(e) => setField('resumen', e.target.value)}
          placeholder="Escribe el resumen de la práctica..." />
      </div>
      <div className={styles.wordCount}
        style={{ color: words > 250 ? 'var(--color-error)' : '' }}>
        {words} / 250 palabras
      </div>
    </div>
  )
}

// ── Objetivos ──────────────────────────────────
function ObjetivosSection() {
  const reportData   = useStore((s) => s.reportData)
  const addObjItem   = useStore((s) => s.addObjItem)
  const updateObjItem= useStore((s) => s.updateObjItem)
  const deleteObjItem= useStore((s) => s.deleteObjItem)

  function DynamicList({ field, items, placeholder, bullet }) {
    return (
      <div className={styles.dynamicList}>
        {items.map((item, index) => (
          <div key={index} className={styles.dynamicListItem}>
            {bullet && <span className={styles.bullet}>{bullet}</span>}
            <input className={styles.listInput}
              value={item}
              onChange={(e) => updateObjItem(field, index, e.target.value)}
              placeholder={`${placeholder} ${index + 1}`} />
            {items.length > 1 && (
              <button className={styles.deleteListBtn}
                onClick={() => deleteObjItem(field, index)}>×</button>
            )}
          </div>
        ))}
        <button className={styles.addListBtn}
          onClick={() => addObjItem(field)}>
          + Agregar
        </button>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Objetivos</h2>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Generales</label>
        <DynamicList
          field="objGenerales"
          items={reportData.objGenerales}
          placeholder="Objetivo general"
          bullet="•"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Específicos</label>
        <DynamicList
          field="objEspecificos"
          items={reportData.objEspecificos}
          placeholder="Objetivo específico"
          bullet="*"
        />
      </div>
    </div>
  )
}

// ── Mapa de secciones ──────────────────────────
const LATEX_SECTIONS = {
  marcoTeorico: { title: 'Marco Teórico',           hint: 'Escribe el contenido en LaTeX. Usa los botones para insertar elementos.' },
  disenio:      { title: 'Diseño Experimental',     hint: 'Puedes usar \\subsection{} para Materiales, Magnitudes y Procedimiento.' },
  resultados:   { title: 'Resultados',              hint: 'Inserta tablas, gráficas y figuras con los botones de la barra.' },
  discusion:    { title: 'Discusión de Resultados', hint: 'Analiza los resultados contrastándolos con el marco teórico.' },
  conclusiones: { title: 'Conclusiones',            hint: 'Puedes usar \\begin{enumerate} \\item ... \\end{enumerate}' },
  bibliografia: { title: 'Bibliografía',            hint: 'Usa \\bibitem{} para cada referencia dentro de thebibliography.' },
}

const SECTION_COMPONENTS = {
  header:    HeaderSection,
  resumen:   ResumenSection,
  objetivos: ObjetivosSection,
}

function SectionEditor({ activeSection }) {
  // Secciones con formulario simple
  const SimpleComponent = SECTION_COMPONENTS[activeSection]
  if (SimpleComponent) return <SimpleComponent />

  // Secciones con editor LaTeX libre
  const latexConfig = LATEX_SECTIONS[activeSection]
  if (latexConfig) {
    return (
      <LatexSectionEditor
        sectionId={activeSection}
        title={latexConfig.title}
        hint={latexConfig.hint}
      />
    )
  }

  return null
}

export default SectionEditor