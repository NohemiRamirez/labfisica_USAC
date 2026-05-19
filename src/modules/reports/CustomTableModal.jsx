import { useState } from 'react'
import useStore from '../../store/useStore'
import { generateCustomTableLatex } from '../../utils/latexGenerator'
import styles from './ReportsPage.module.css'

function CustomTableModal({ onInsert, onClose }) {
  const fitResult  = useStore((s) => s.fitResult)

  const [caption, setCaption] = useState('')
  const [cols,    setCols]    = useState(2)
  const [rows,    setRows]    = useState(3)
  const [headers, setHeaders] = useState(['Columna 1', 'Columna 2'])
  const [data,    setData]    = useState(
    Array.from({ length: 3 }, () => Array(2).fill(''))
  )

  function updateDims(nc, nr) {
    const newCols = Math.max(1, Math.min(10, nc))
    const newRows = Math.max(1, Math.min(20, nr))
    setHeaders(Array.from({ length: newCols }, (_, i) => headers[i] ?? `Col ${i + 1}`))
    setData(Array.from({ length: newRows }, (_, r) =>
      Array.from({ length: newCols }, (_, c) => data[r]?.[c] ?? '')
    ))
    setCols(newCols)
    setRows(newRows)
  }

  // ── Pre-llena con datos del ajuste ────────────
  function loadFitData() {
    if (!fitResult) {
      alert('No hay resultados de ajuste disponibles.')
      return
    }

    const { type, params, paramErrors, r2 } = fitResult
    const newHeaders = ['Parámetro', 'Valor', 'Incerteza']
    const newData    = []

    if (type === 'linear') {
      newData.push(['Pendiente (a)', params.a?.toFixed(6) ?? '—', `±${paramErrors?.a?.toFixed(6) ?? '0'}`])
      newData.push(['Intercepto (b)', params.b?.toFixed(6) ?? '—', `±${paramErrors?.b?.toFixed(6) ?? '0'}`])
    } else if (type === 'quadratic') {
      newData.push(['Coef. cuadrático (a)', params.a?.toFixed(6) ?? '—', `±${paramErrors?.a?.toFixed(6) ?? '0'}`])
      newData.push(['Coef. lineal (b)',     params.b?.toFixed(6) ?? '—', `±${paramErrors?.b?.toFixed(6) ?? '0'}`])
      newData.push(['Intercepto (c)',       params.c?.toFixed(6) ?? '—', `±${paramErrors?.c?.toFixed(6) ?? '0'}`])
    } else {
      Object.entries(params).forEach(([key, val]) => {
        newData.push([`Parámetro (${key})`, val?.toFixed(6) ?? '—', `±${paramErrors?.[key]?.toFixed(6) ?? '0'}`])
      })
    }
    newData.push([`Coef. R²`, r2?.toFixed(6) ?? '—', '—'])

    setHeaders(newHeaders)
    setData(newData)
    setCols(3)
    setRows(newData.length)
    setCaption('Resultados del ajuste de curva')
  }

  function handleInsert() {
    if (!caption.trim()) { alert('Ingresa un título para la tabla.'); return }
    onInsert(generateCustomTableLatex(headers, data, caption))
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: '720px' }}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Tabla personalizada</h3>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>

          {/* Botón de carga rápida desde ajuste */}
          {fitResult && (
            <div className={styles.fitDataBanner}>
              <span>✓ Hay resultados de ajuste disponibles</span>
              <button
                className={styles.fitDataBtn}
                onClick={loadFitData}
              >
                Cargar datos del ajuste
              </button>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Título (caption) <span className={styles.req}>*</span>
            </label>
            <input className={styles.textInput} value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="ej. Comparativa valor experimental vs teórico" />
          </div>

          <div className={styles.tableDimensions}>
            <div className={styles.dimField}>
              <label className={styles.fieldLabel}>Columnas</label>
              <input type="number" className={styles.dimInput}
                value={cols} min={1} max={10}
                onChange={(e) => updateDims(Number(e.target.value), rows)} />
            </div>
            <div className={styles.dimField}>
              <label className={styles.fieldLabel}>Filas</label>
              <input type="number" className={styles.dimInput}
                value={rows} min={1} max={20}
                onChange={(e) => updateDims(cols, Number(e.target.value))} />
            </div>
          </div>

          <div className={styles.customTableWrap}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  {headers.map((h, ci) => (
                    <th key={ci}>
                      <input className={styles.tableHeaderInput} value={h}
                        onChange={(e) => {
                          const h2 = [...headers]; h2[ci] = e.target.value
                          setHeaders(h2)
                        }}
                        placeholder={`Col ${ci + 1}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>
                        <input className={styles.tableCellInput} value={cell}
                          onChange={(e) => {
                            const d = data.map((r) => [...r])
                            d[ri][ci] = e.target.value
                            setData(d)
                          }}
                          placeholder="—" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondaryModal} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.btnPrimaryModal} onClick={handleInsert}>
            Insertar código LaTeX
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomTableModal