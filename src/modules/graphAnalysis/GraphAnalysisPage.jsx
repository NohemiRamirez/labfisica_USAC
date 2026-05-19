import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import ScatterPlot from './ScatterPlot'
import { linearFit, quadraticFit, customFit } from '../../utils/fitCalculator'
import styles from './GraphAnalysisPage.module.css'


const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)


const FIT_MODELS = [
  { id: 'linear',    label: 'Ajuste lineal',     desc: 'y = ax + b' },
  { id: 'quadratic', label: 'Ajuste cuadrático', desc: 'y = ax² + bx + c' },
  { id: 'custom',    label: 'Expresión manual',  desc: 'Ingresa tu propia función' },
]

function FitPanel({ selectedModel, onSelect, onCalculate, fitError, customExpr, onCustomExprChange }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Modelo de ajuste</div>
      <div className={styles.panelBody}>

        {FIT_MODELS.map((model) => (
          <div
            key={model.id}
            className={`${styles.fitOption} ${selectedModel === model.id ? styles.fitSelected : ''}`}
            onClick={() => onSelect(model.id)}
          >
            <div className={styles.fitLabel}>{model.label}</div>
            <div className={styles.fitDesc}>{model.desc}</div>
          </div>
        ))}

        {selectedModel === 'custom' && (
          <div className={styles.customExprField}>
            <label className={styles.customExprLabel}>
              Expresión en función de x
            </label>
            <input
              className={styles.customExprInput}
              value={customExpr}
              onChange={(e) => onCustomExprChange(e.target.value)}
              placeholder="ej. a*x + b"
              spellCheck={false}
            />
            <div className={styles.customExprHint}>
              Usa <strong>x</strong> como variable y letras como{' '}
              <strong>a, b, c</strong> como parámetros a optimizar.<br />
              Ej: <code>a*x + b</code> &nbsp;|&nbsp;
              <code>a*x^2 + b*x + c</code> &nbsp;|&nbsp;
              <code>a*sin(b*x) + c</code><br />
              Funciones: sin, cos, tan, exp, log, sqrt, abs &nbsp;|&nbsp;
              Constantes: pi, e
            </div>
          </div>
        )}

        {fitError && (
          <div className={styles.fitError}>⚠ {fitError}</div>
        )}

        <button className={styles.btnCalculate} onClick={onCalculate}>
          <IconPlay /> Calcular ajuste
        </button>
      </div>
    </div>
  )
}

function ResultsPanel({ fitResult }) {
  if (!fitResult) return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Resultados del análisis</div>
      <div className={styles.panelBodyEmpty}>
        Calcula un ajuste para ver los resultados aquí.
      </div>
    </div>
  )

  const { params, paramErrors, r2, equation, type } = fitResult

  const r2Color = r2 >= 0.95
    ? 'var(--color-success)'
    : r2 >= 0.80
    ? 'var(--color-warning)'
    : 'var(--color-error)'

  const rows = Object.entries(params).map(([key, val]) => ({
    label: key,
    value: val,
    error: paramErrors?.[key],
  }))

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Resultados del análisis</div>
      <div className={styles.panelBody}>

        <div className={styles.equation}>{equation}</div>

        {rows.length > 0 && (
          <div className={styles.resultsList}>
            {rows.map(({ label, value, error }) => (
              <div key={label} className={styles.resultRow}>
                <span className={styles.resultLabel}>
                  Parámetro <em>{label}</em>
                </span>
                <span className={styles.resultValue}>
                  {value.toFixed(5)}
                  {error != null && error > 0 && (
                    <span className={styles.resultError}> ±{error.toFixed(5)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.resultsList}>
          <div className={`${styles.resultRow} ${styles.r2Row}`}>
            <span className={styles.resultLabel}>Coef. R²</span>
            <span
              className={styles.resultValue}
              style={{ color: r2Color, fontWeight: 600 }}
            >
              {r2.toFixed(6)}
            </span>
          </div>

          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Tipo</span>
            <span className={styles.resultValue}>
              {type === 'linear'    && 'Lineal'}
              {type === 'quadratic' && 'Cuadrático'}
              {type === 'custom'    && 'Personalizado'}
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}

function GraphAnalysisPage() {
  const navigate       = useNavigate()
  const tableData      = useStore((s) => s.tableData)
  const axisLabels     = useStore((s) => s.axisLabels)
  const fitResult      = useStore((s) => s.fitResult)
  const setFitResult   = useStore((s) => s.setFitResult)
  const setGraphImage  = useStore((s) => s.setGraphImage)

  const [selectedModel, setSelectedModel] = useState('linear')
  const [fitError, setFitError]           = useState(null)
  const [customExpr, setCustomExpr]       = useState('')

  if (tableData.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2>No hay datos cargados</h2>
        <p>Debes cargar datos experimentales antes de realizar el análisis gráfico.</p>
        <button className={styles.btnPrimary} onClick={() => navigate('/data-table')}>
          Ir a tabla de datos
        </button>
      </div>
    )
  }

  async function handleCalculate() {
  try {
    setFitError(null)
    let result
    if (selectedModel === 'linear') {
      result = linearFit(tableData)
    } else if (selectedModel === 'quadratic') {
      result = quadraticFit(tableData)
    } else {
      result = customFit(tableData, customExpr)
    }
    setFitResult(result)

    // Exporta la gráfica como PNG y la guarda en el store
    // Se hace después de setFitResult para que D3 redibuje la curva primero
    setTimeout(() => exportGraphToStore(), 600)

  } catch (err) {
    setFitError(err.message)
    setFitResult(null)
  }
}

function exportGraphToStore() {
  const svgEl = document.querySelector('.labfisica-scatter-svg')
  if (!svgEl) return

  try {
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url     = URL.createObjectURL(svgBlob)
    const img     = new Image()

    img.onload = () => {
      const canvas  = document.createElement('canvas')
      const scale   = 2 // Alta resolución
      canvas.width  = (svgEl.width?.baseVal?.value  || 600) * scale
      canvas.height = (svgEl.height?.baseVal?.value || 400) * scale
      const ctx     = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      const dataUrl = canvas.toDataURL('image/png')
      setGraphImage({ dataUrl, filename: 'grafica_ajuste.png' })
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  } catch (err) {
    console.error('Error exportando gráfica:', err)
  }
}

  return (
    <div className={styles.page}>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Análisis gráfico</h1>
          <p className={styles.pageSubtitle}>
            Visualiza tus datos y calcula el ajuste de curva.
          </p>
        </div>
        <button className={styles.btnBack} onClick={() => navigate('/data-table')}>
          <IconBack /> Volver a datos
        </button>
      </div>

      <div className={styles.layout}>

        <div className={styles.chartArea}>
          <ScatterPlot
            data={tableData}
            fitResult={fitResult}
            axisLabels={axisLabels}
          />
        </div>

        <div className={styles.sidebar}>
          <FitPanel
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
            onCalculate={handleCalculate}
            fitError={fitError}
            customExpr={customExpr}
            onCustomExprChange={setCustomExpr}
          />
          <ResultsPanel fitResult={fitResult} />
        </div>

      </div>
    </div>
  )
}

export default GraphAnalysisPage