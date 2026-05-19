import { useState } from 'react'
import { generateEquationLatex } from '../../utils/latexGenerator'
import styles from './ReportsPage.module.css'

const SYMBOLS = [
  { label: 'α', latex: '\\alpha' },   { label: 'β',  latex: '\\beta'  },
  { label: 'γ', latex: '\\gamma' },   { label: 'δ',  latex: '\\delta' },
  { label: 'θ', latex: '\\theta' },   { label: 'λ',  latex: '\\lambda'},
  { label: 'μ', latex: '\\mu'    },   { label: 'π',  latex: '\\pi'    },
  { label: 'σ', latex: '\\sigma' },   { label: 'ω',  latex: '\\omega' },
  { label: 'Δ', latex: '\\Delta' },   { label: 'Σ',  latex: '\\Sigma' },
  { label: 'Ω', latex: '\\Omega' },   { label: '±',  latex: '\\pm'    },
  { label: '×', latex: '\\times' },   { label: '≈',  latex: '\\approx'},
  { label: '≠', latex: '\\neq'   },   { label: '≤',  latex: '\\leq'   },
  { label: '≥', latex: '\\geq'   },   { label: '∂',  latex: '\\partial'},
  { label: 'a/b',  latex: '\\frac{a}{b}'    },
  { label: '√a',   latex: '\\sqrt{a}'       },
  { label: 'aⁿ',   latex: 'a^{n}'           },
  { label: 'aₙ',   latex: 'a_{n}'           },
  { label: '∑',    latex: '\\sum_{i=1}^{n}' },
  { label: '∫',    latex: '\\int_{a}^{b}'   },
  { label: 'sin',  latex: '\\sin'            },
  { label: 'cos',  latex: '\\cos'            },
  { label: 'tan',  latex: '\\tan'            },
  { label: 'log',  latex: '\\log'            },
  { label: 'ln',   latex: '\\ln'             },
  { label: 'vec',  latex: '\\vec{a}'         },
  { label: 'Δr/r', latex: '\\frac{\\Delta r}{r} = \\sqrt{\\left(\\frac{\\Delta a}{a}\\right)^2 + \\left(\\frac{\\Delta b}{b}\\right)^2}' },
]

function EquationModal({ onInsert, onClose }) {
  const [latex,   setLatex]   = useState('')
  const [caption, setCaption] = useState('')

  function handleInsert() {
    if (!latex.trim()) return
    onInsert(generateEquationLatex(latex, caption))
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Editor de ecuación</h3>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>

          {/* Símbolos */}
          <div>
            <div className={styles.fieldLabel} style={{ marginBottom: '0.5rem' }}>
              Símbolos y operadores
            </div>
            <div className={styles.symbolGrid}>
              {SYMBOLS.map((s) => (
                <button key={s.latex} className={styles.symbolBtn}
                  onClick={() => setLatex((prev) => prev + s.latex)}
                  title={s.latex}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campo LaTeX */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Código LaTeX de la ecuación</label>
            <textarea className={`${styles.textArea} ${styles.monoArea}`}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="ej. F = ma&#10;\frac{\Delta r}{r} = \sqrt{\left(\frac{\Delta a}{a}\right)^2}"
              rows={4}
              spellCheck={false}
            />
          </div>

          {/* Preview del código */}
          <div className={styles.latexPreviewSmall}>
            <code>{`\\begin{equation}\n${latex || '...'}\n\\end{equation}`}</code>
          </div>

          {/* Caption */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Descripción (opcional)</label>
            <input className={styles.textInput} value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="ej. Segunda ley de Newton" />
          </div>

        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnSecondaryModal} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.btnPrimaryModal}
            onClick={handleInsert} disabled={!latex.trim()}>
            Insertar ecuación
          </button>
        </div>
      </div>
    </div>
  )
}

export default EquationModal