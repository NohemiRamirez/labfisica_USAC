import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import { validateRow, validateAllRows } from '../../utils/validators'
import { parseCsv } from '../../utils/csvParser'
import styles from './DataTablePage.module.css'

// ── Íconos SVG inline ──────────────────────────────────
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const IconUpload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

// ── Componente fila editable ───────────────────────────
function DataRow({ row, index, onUpdate, onDelete }) {
  const [errors, setErrors] = useState({})

  // Valida el campo al perder el foco
  function handleBlur(field, value) {
    onUpdate(row.id, field, value)
    const updated = { ...row, [field]: value }
    const { errors: rowErrors } = validateRow(updated)

    // Mapea los mensajes de error a campos específicos
    const fieldErrors = {}
    rowErrors.forEach((msg) => {
      if (msg.includes('campo x'))      fieldErrors.x      = msg
      if (msg.includes('campo y'))      fieldErrors.y      = msg
      if (msg.includes('Error x'))      fieldErrors.errorX = msg
      if (msg.includes('Error y'))      fieldErrors.errorY = msg
    })
    setErrors(fieldErrors)
  }

  return (
    <tr className={Object.keys(errors).length > 0 ? styles.rowError : ''}>
      <td className={styles.rowNum}>{index + 1}</td>

      {['x', 'y', 'errorX', 'errorY'].map((field) => (
        <td key={field}>
          <input
            className={`${styles.cellInput} ${errors[field] ? styles.inputError : ''}`}
            defaultValue={row[field]}
            onBlur={(e) => handleBlur(field, e.target.value)}
            placeholder={field.startsWith('error') ? '0' : '—'}
          />
        </td>
      ))}

      <td>
        <button
          className={styles.deleteBtn}
          onClick={() => onDelete(row.id)}
          title="Eliminar fila"
        >
          <IconTrash />
        </button>
      </td>
    </tr>
  )
}

// ── Componente principal ───────────────────────────────
function DataTablePage() {
  const navigate    = useNavigate()
  const tableData   = useStore((s) => s.tableData)
  const setTableData= useStore((s) => s.setTableData)
  const addRow      = useStore((s) => s.addRow)
  const updateRow   = useStore((s) => s.updateRow)
  const deleteRow   = useStore((s) => s.deleteRow)
  const axisLabels  = useStore((s) => s.axisLabels)
  const setAxisLabels = useStore((s) => s.setAxisLabels)

  const fileInputRef  = useRef(null)
  const [dragOver, setDragOver]   = useState(false)
  const [csvError, setCsvError]   = useState(null)

  // Validación global de todas las filas
  const { allValid, results } = validateAllRows(tableData)
  const errorRows = results.filter((r) => !r.valid)

  // ── Manejo de CSV ──────────────────────────
  const processCsvFile = useCallback((file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setCsvError('Por favor selecciona un archivo con extensión .csv')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = parseCsv(e.target.result)
        setTableData(rows)
        setCsvError(null)
      } catch (err) {
        setCsvError(err.message)
      }
    }
    reader.readAsText(file)
  }, [setTableData])

  function handleFileInput(e) {
    processCsvFile(e.target.files[0])
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    processCsvFile(e.dataTransfer.files[0])
  }

  // ── Etiquetas de ejes ──────────────────────
  function handleAxisLabel(axis, value) {
    setAxisLabels({ ...axisLabels, [axis]: value })
  }

  // ── Continuar al análisis ──────────────────
  function handleContinue() {
    if (allValid && tableData.length > 0) {
      navigate('/graph-analysis')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Tabla de datos experimentales</h1>
            <p className={styles.pageSubtitle}>
              Ingresa tus datos manualmente o importa un archivo CSV.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.btnSecondary}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload /> Importar CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <button className={styles.btnPrimary} onClick={addRow}>
              <IconPlus /> Nueva fila
            </button>
          </div>
        </div>

        <div
          className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload />
          <p>Arrastra tu archivo CSV aquí</p>
          <span>o haz clic para seleccionar</span>
          <small>Columnas requeridas: x, y — Opcionales: error_x, error_y</small>
        </div>

        {csvError && (
          <div className={styles.csvError}>
            ⚠ {csvError}
          </div>
        )}

        <div className={styles.axisLabels}>
          <div className={styles.axisField}>
            <label>Etiqueta eje X</label>
            <input
              value={axisLabels.x}
              onChange={(e) => handleAxisLabel('x', e.target.value)}
              placeholder="ej. Tiempo (s)"
            />
          </div>
          <div className={styles.axisField}>
            <label>Etiqueta eje Y</label>
            <input
              value={axisLabels.y}
              onChange={(e) => handleAxisLabel('y', e.target.value)}
              placeholder="ej. Posición (m)"
            />
          </div>
        </div>

        {tableData.length === 0 ? (
          <div className={styles.emptyTable}>
            <p>No hay datos cargados. Agrega una fila o importa un CSV para comenzar.</p>
            <button className={styles.btnPrimary} onClick={addRow}>
              <IconPlus /> Agregar primera fila
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thNum}>#</th>
                  <th>x</th>
                  <th>y</th>
                  <th>Error x</th>
                  <th>Error y</th>
                  <th className={styles.thAction}></th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <DataRow
                    key={row.id}
                    row={row}
                    index={index}
                    onUpdate={updateRow}
                    onDelete={deleteRow}
                  />
                ))}
              </tbody>
            </table>

            {/* Agregar fila desde la tabla */}
            <button className={styles.addRowBtn} onClick={addRow}>
              <IconPlus /> Agregar fila
            </button>
          </div>
        )}

        {errorRows.length > 0 && (
          <div className={styles.errorSummary}>
            <strong>Se encontraron errores en {errorRows.length} fila(s):</strong>
            <ul>
              {errorRows.map((r) => (
                <li key={r.id}>
                  Fila {r.index}: {r.errors.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            <span className={styles.totalCount}>
              {tableData.length} fila{tableData.length !== 1 ? 's' : ''} cargada{tableData.length !== 1 ? 's' : ''}
            </span>
            {tableData.length > 0 && (
              <>
                <span className={styles.badgeSuccess}>
                  ✓ {results.filter((r) => r.valid).length} válidas
                </span>
                {errorRows.length > 0 && (
                  <span className={styles.badgeError}>
                    ✕ {errorRows.length} con errores
                  </span>
                )}
              </>
            )}
          </div>

          <button
            className={styles.btnContinue}
            onClick={handleContinue}
            disabled={!allValid || tableData.length === 0}
          >
            Continuar al análisis <IconArrow />
          </button>
        </div>

      </div>
    </div>
  )
}

export default DataTablePage