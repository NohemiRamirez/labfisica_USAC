// =============================================
// PREVISUALIZACIÓN Y EXPORTACIÓN A PDF
// =============================================

import { useRef, useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import styles from './ReportsPage.module.css'

function esc(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Renderiza matemáticas ──────────────────────
function renderMath(latex) {
  if (!latex) return ''
  let m = latex.trim()

  // Fracciones — debe ir primero
  m = m.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,
    '<span class="frac"><span class="num">$1</span><span class="den">$2</span></span>')

  // Raíces
  m = m.replace(/\\sqrt\{([^}]+)\}/g,
    '√<span style="border-top:1px solid #000;padding:0 2px">$1</span>')

  // Superíndices y subíndices con llaves
  m = m.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
  m = m.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
  // Sin llaves — solo un carácter
  m = m.replace(/\^([^{\\,\s\d])(?![a-zA-Z])/g, '<sup>$1</sup>')
  m = m.replace(/_([^{\\,\s\d])(?![a-zA-Z])/g, '<sub>$1</sub>')

  // Símbolos griegos (orden importa: más largos primero)
  const greek = [
    ['\\alpha', 'α'], ['\\beta', 'β'], ['\\gamma', 'γ'], ['\\delta', 'δ'],
    ['\\epsilon', 'ε'], ['\\varepsilon', 'ε'], ['\\zeta', 'ζ'], ['\\eta', 'η'],
    ['\\theta', 'θ'], ['\\vartheta', 'θ'], ['\\iota', 'ι'], ['\\kappa', 'κ'],
    ['\\lambda', 'λ'], ['\\mu', 'μ'], ['\\nu', 'ν'], ['\\xi', 'ξ'],
    ['\\pi', 'π'], ['\\varpi', 'π'], ['\\rho', 'ρ'], ['\\sigma', 'σ'],
    ['\\tau', 'τ'], ['\\upsilon', 'υ'], ['\\phi', 'φ'], ['\\varphi', 'φ'],
    ['\\chi', 'χ'], ['\\psi', 'ψ'], ['\\omega', 'ω'],
    ['\\Gamma', 'Γ'], ['\\Delta', 'Δ'], ['\\Theta', 'Θ'], ['\\Lambda', 'Λ'],
    ['\\Xi', 'Ξ'], ['\\Pi', 'Π'], ['\\Sigma', 'Σ'], ['\\Upsilon', 'Υ'],
    ['\\Phi', 'Φ'], ['\\Psi', 'Ψ'], ['\\Omega', 'Ω'],
  ]
  greek.forEach(([cmd, sym]) => {
    m = m.replace(new RegExp(cmd.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g'), sym)
  })

  // Operadores
  const ops = [
    ['\\pm', '±'], ['\\mp', '∓'], ['\\times', '×'], ['\\div', '÷'],
    ['\\cdot', '·'], ['\\leq', '≤'], ['\\geq', '≥'], ['\\neq', '≠'],
    ['\\approx', '≈'], ['\\equiv', '≡'], ['\\infty', '∞'], ['\\partial', '∂'],
    ['\\nabla', '∇'], ['\\sum', 'Σ'], ['\\prod', 'Π'], ['\\int', '∫'],
    ['\\oint', '∮'], ['\\rightarrow', '→'], ['\\leftarrow', '←'],
    ['\\Rightarrow', '⇒'], ['\\Leftarrow', '⇐'], ['\\leftrightarrow', '↔'],
    ['\\cdots', '⋯'], ['\\ldots', '…'], ['\\vdots', '⋮'], ['\\ddots', '⋱'],
    ['\\in', '∈'], ['\\notin', '∉'], ['\\subset', '⊂'], ['\\supset', '⊃'],
    ['\\cup', '∪'], ['\\cap', '∩'], ['\\forall', '∀'], ['\\exists', '∃'],
    ['\\neg', '¬'], ['\\wedge', '∧'], ['\\vee', '∨'],
  ]
  ops.forEach(([cmd, sym]) => {
    m = m.replace(new RegExp(cmd.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g'), sym)
  })

  // Funciones matemáticas
  const funcs = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln',
    'exp', 'lim', 'max', 'min', 'sup', 'inf', 'det', 'mod', 'sen']
  funcs.forEach((f) => {
    m = m.replace(new RegExp(`\\\\${f}(?![a-zA-Z])`, 'g'), f)
  })

  // Limpiar comandos restantes
  m = m.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
  m = m.replace(/\\[a-zA-Z]+/g, '')
  m = m.replace(/[{}]/g, '')

  return `<i>${m}</i>`
}

// ── Formato inline ─────────────────────────────
function latexInline(text) {
  let t = String(text || '')
  t = t.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
  t = t.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
  t = t.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>')
  t = t.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>')
  // Math inline
  t = t.replace(/\$([^$\n]+)\$/g, (_, m) => renderMath(m))
  // Operadores comunes fuera de $ (en tablas)
  t = t.replace(/\\pm(?![a-zA-Z])/g, '±')
  t = t.replace(/\\times(?![a-zA-Z])/g, '×')
  t = t.replace(/\\leq(?![a-zA-Z])/g, '≤')
  t = t.replace(/\\geq(?![a-zA-Z])/g, '≥')
  t = t.replace(/\\approx(?![a-zA-Z])/g, '≈')
  // Limpiar
  t = t.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
  t = t.replace(/\\[a-zA-Z]+/g, '')
  t = t.replace(/[{}]/g, '')
  return t
}

// ── Construye tabla HTML ───────────────────────
function buildTable(tabContent, caption, tabNum) {
  const lines = tabContent
    .split('\\\\')
    .map((l) => l.trim())
    .filter((l) => l && !/^\\(toprule|midrule|bottomrule|hline)\s*$/.test(l))

  if (!lines.length) return ''

  const parseRow = (line) =>
    line.split('&').map((cell) => latexInline(cell.trim()))

  const [headerLine, ...dataLines] = lines
  const headers = parseRow(headerLine)
  const dataRows = dataLines.filter((l) => l.trim()).map(parseRow)

  const thead = `<thead><tr>${headers.map((h) =>
    `<th>${h}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${dataRows.map((row) =>
    `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`
  ).join('')}</tbody>`

  return `<div class="doc-table-wrap">
    <table class="doc-table">${thead}${tbody}</table>
    ${caption ? `<p class="doc-caption">Tabla ${tabNum}: ${esc(caption)}</p>` : ''}
  </div>`
}

// ── Convierte LaTeX a HTML ──────────────────────
function latexToHtml(text, images, counters, secNum) {
  if (!text) return ''
  let html = text

  // Subsecciones numeradas
  let subCount = 0
  html = html.replace(/\\subsection\*?\{([^}]+)\}/g, (_, title) => {
    subCount++
    return `<h3 class="doc-subsection">${secNum}.${subCount}. ${title}</h3>`
  })

  // Subsubsecciones
  html = html.replace(/\\subsubsection\*?\{([^}]+)\}/g, (_, title) =>
    `<h4 class="doc-subsubsection">${title}</h4>`
  )

  // Formato
  html = html.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
  html = html.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
  html = html.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>')
  html = html.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>')

  // Ecuaciones numeradas
  html = html.replace(
    /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,
    (_, content) => {
      counters.eq++
      const c = content.trim().replace(/\\label\{[^}]+\}/g, '').trim()
      return `<div class="doc-equation">
        <span class="doc-eq-body">${renderMath(c)}</span>
        <span class="doc-eq-num">(${counters.eq})</span>
      </div>`
    }
  )

  // Align
  html = html.replace(
    /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,
    (_, content) => {
      counters.eq++
      const lines = content.trim()
        .split('\\\\')
        .map((l) => l.replace(/&/g, '').replace(/\\label\{[^}]+\}/g, '').trim())
        .filter(Boolean)
        .map((l) => `<div style="margin:2px 0">${renderMath(l)}</div>`)
        .join('')
      return `<div class="doc-equation">
        <div style="flex:1;text-align:center">${lines}</div>
        <span class="doc-eq-num">(${counters.eq})</span>
      </div>`
    }
  )

  // Inline math
  html = html.replace(/\$([^$\n]+)\$/g, (_, m) => renderMath(m))

  // Tablas
  // --- Tablas ---
  html = html.replace(
    /\\begin\{table\}(?:\[.*?\])?([\s\S]*?)\\end\{table\}/g,
    (_, content) => {
      counters.tab++
      // Buscamos el tabular y el caption específicamente dentro de este bloque
      const tabMatch = content.match(/\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/)
      const capMatch = content.match(/\\caption\{([^}]*)\}/)

      const tabularData = tabMatch ? tabMatch[1] : ''
      const caption = capMatch ? capMatch[1].trim() : ''

      return buildTable(tabularData, caption, counters.tab)
    }
  )

  // Fallback: tabular sin estar envuelto en \begin{table}
  html = html.replace(
    /\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/g,
    (_, tabContent) => {
      // Evitar contar doble si ya fue procesado
      counters.tab++
      return buildTable(tabContent, '', counters.tab)
    }
  )

  // --- Figuras ---
  html = html.replace(
    /\\begin\{figure\}(?:\[.*?\])?([\s\S]*?)\\end\{figure\}/g,
    (_, content) => {
      counters.fig++
      const imgMatch = content.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/)
      const capMatch = content.match(/\\caption\{([^}]*)\}/)

      const fn = imgMatch ? imgMatch[1].trim() : ''
      const caption = capMatch ? capMatch[1].trim() : ''
      const img = images.find((i) => i.filename === fn || i.filename.endsWith(fn))

      return `<div class="doc-figure">
        ${img
          ? `<img src="${img.dataUrl}" class="doc-img" alt="${esc(caption)}" />`
          : `<div class="doc-img-placeholder">[Figura: ${esc(fn)}]</div>`}
        <p class="doc-caption">Figura ${counters.fig}: ${esc(caption)}</p>
      </div>`
    }
  )

  // includegraphics sin figure
  html = html.replace(
    /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g,
    (_, filename) => {
      // Solo procesa si no fue parte de un \begin{figure} ya procesado
      counters.fig++
      const fn = filename.trim()
      const img = images.find((i) => i.filename === fn || i.filename.endsWith(fn))
      return `<div class="doc-figure">
        ${img
          ? `<img src="${img.dataUrl}" class="doc-img" />`
          : `<div class="doc-img-placeholder">[${esc(fn)}]</div>`}
      </div>`
    }
  )

  // Listas
  html = html.replace(
    /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
    (_, content) => {
      const items = content.split(/\\item/).slice(1)
        .map((i) => `<li>${latexInline(i.replace(/^\[[^\]]*\]\s*/, '').trim())}</li>`)
        .join('')
      return `<ul class="doc-list">${items}</ul>`
    }
  )

  html = html.replace(
    /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
    (_, content) => {
      const items = content.split(/\\item/).slice(1)
        .map((i) => `<li>${latexInline(i.replace(/^\[[^\]]*\]\s*/, '').trim())}</li>`)
        .join('')
      return `<ol class="doc-list">${items}</ol>`
    }
  )

  // Bibliografía
  html = html.replace(
    /\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g,
    (_, content) => {
      const items = content.split(/\\bibitem\{[^}]*\}/).slice(1)
        .map((i, idx) => `<li>[${idx + 1}] ${latexInline(i.trim())}</li>`)
        .join('')
      return `<ul class="doc-bib">${items}</ul>`
    }
  )

  // Operadores sueltos (fuera de $)
  html = html.replace(/\\pm(?![a-zA-Z])/g, '±')
  html = html.replace(/\\times(?![a-zA-Z])/g, '×')
  html = html.replace(/\\leq(?![a-zA-Z])/g, '≤')
  html = html.replace(/\\geq(?![a-zA-Z])/g, '≥')
  html = html.replace(/\\approx(?![a-zA-Z])/g, '≈')

  // Limpiar
  html = html.replace(/\\newline/g, '<br/>')
  html = html.replace(/\\label\{[^}]+\}/g, '')
  html = html.replace(/\\ref\{([^}]+)\}/g, '<span class="doc-ref">[ref]</span>')
  html = html.replace(/\\cite\{([^}]+)\}/g, '<span class="doc-ref">[$1]</span>')
  html = html.replace(/\\noindent\s*/g, '')
  html = html.replace(/\\(medskip|bigskip|smallskip)/g, '')
  html = html.replace(/\\decimalpoint/g, '')
  html = html.replace(/\\[a-zA-Z]+\*?\{([^}]*)\}/g, '$1')
  html = html.replace(/\\[a-zA-Z]+\*/g, '')
  html = html.replace(/\\[a-zA-Z]+/g, '')
  html = html.replace(/[{}]/g, '')

  // Párrafos
  const parts = html.split(/\n\n+/)
  html = parts.map((part) => {
    const t = part.trim()
    if (!t) return ''
    if (/^<(h[2-4]|div|ul|ol|table|p)/.test(t)) return t
    return `<p class="doc-text">${t.replace(/\n/g, ' ')}</p>`
  }).join('\n')

  return html
}

// ── Construye HTML del documento completo ──────
function buildDocumentHTML(reportData, tableData, axisLabels) {
  const {
    curso = '', seccion = '', titulo = '',
    autores = [], fecha = '', resumen = '',
    objGenerales = [], objEspecificos = [],
    enabledSections = [], latexSections = {}, images = [],
  } = reportData

  const autoresStr = autores
    .filter((a) => a.nombre || a.carnet)
    .map((a) => `${esc(a.carnet)} ${esc(a.nombre)}`.trim())
    .join(', ')

  const isEnabled = (id) =>
    ['header', 'resultados'].includes(id) || enabledSections.includes(id)

  const counters = { eq: 0, tab: 0, fig: 0, sec: 0 }
  let body = ''

  // Resumen
  if (isEnabled('resumen') && resumen) {
    body += `<div class="doc-abstract">
      <p class="doc-abstract-title">Resumen</p>
      <p class="doc-abstract-text">${esc(resumen)}</p>
    </div>`
  }

  // Objetivos
  if (isEnabled('objetivos')) {
    const gen = objGenerales.filter((o) => o.trim())
    const esp = objEspecificos.filter((o) => o.trim())
    if (gen.length || esp.length) {
      counters.sec++
      const s = counters.sec
      body += `<div class="doc-section">
        <h2 class="doc-section-title">${s}. Objetivos</h2>
        ${gen.length ? `
          <h3 class="doc-subsection">${s}.1. Generales</h3>
          <ul class="doc-list">${gen.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
        ` : ''}
        ${esp.length ? `
          <h3 class="doc-subsection">${s}.${gen.length ? 2 : 1}. Específicos</h3>
          <ul class="doc-list">${esp.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
        ` : ''}
      </div>`
    }
  }

  // Secciones LaTeX
  const latexOrder = [
    { id: 'marcoTeorico', label: 'Marco Teórico' },
    { id: 'disenio', label: 'Diseño Experimental' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'discusion', label: 'Discusión de Resultados' },
    { id: 'conclusiones', label: 'Conclusiones' },
    { id: 'bibliografia', label: 'Bibliografía' },
  ]

  latexOrder.forEach(({ id, label }) => {
    if (!isEnabled(id)) return
    const content = latexSections[id]
    if (!content?.trim()) return
    counters.sec++
    body += `<div class="doc-section">
      <h2 class="doc-section-title">${counters.sec}. ${label}</h2>
      ${latexToHtml(content, images, counters, counters.sec)}
    </div>`
  })

  // ── CSS del documento ────────────────────────
  const css = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #000;
  background: #fff;
  width: 210mm;
  padding: 0;
  margin: 0;
}
.doc-page {
  width: 210mm;
  min-height: 297mm;
  padding: 25mm 25mm 30mm 25mm;
  position: relative;
}
.doc-header { text-align: center; margin-bottom: 20px; }
.doc-course  { font-size: 10pt; color: #333; margin-bottom: 4px; }
.doc-title   { font-size: 14pt; font-weight: bold; line-height: 1.3; margin: 6px 0; }
.doc-authors { font-size: 10pt; margin: 4px 0; }
.doc-date    { font-size: 10pt; color: #555; }
.doc-abstract { margin: 16px 0; }
.doc-abstract-title { font-weight: bold; font-size: 10pt; text-align: center; margin-bottom: 4px; }
.doc-abstract-text  { font-size: 10pt; text-align: justify; }
.doc-section { margin-top: 18px; }
.doc-section-title { font-size: 12pt; font-weight: bold; margin-bottom: 8px; text-align: left; }
.doc-subsection    { font-size: 11pt; font-weight: bold; margin: 10px 0 5px; text-align: left; }
.doc-subsubsection { font-size: 11pt; font-style: italic; margin: 8px 0 4px; }
.doc-text { margin: 5px 0; text-align: justify; font-size: 11pt; }
/* Fracciones */
.frac { display: inline-flex; flex-direction: column; align-items: center;
        vertical-align: middle; margin: 0 2px; }
.num  { border-bottom: 1px solid #000; padding: 0 3px; font-size: 10pt; line-height: 1.2; }
.den  { padding: 0 3px; font-size: 10pt; line-height: 1.2; }
/* Ecuaciones */
.doc-equation {
  display: flex; align-items: center; justify-content: center;
  margin: 10px 0; width: 100%;
}
.doc-eq-body { flex: 1; text-align: center; font-style: italic; padding: 0 20px; }
.doc-eq-num  { font-size: 10pt; white-space: nowrap; min-width: 40px; text-align: right; }
/* Figuras */
.doc-figure  { text-align: center; margin: 14px 0; width: 100%; }
.doc-img     { max-width: 80%; max-height: 280px; object-fit: contain;
               display: block; margin: 0 auto; }
.doc-img-placeholder {
  padding: 14px; background: #f5f5f5; border: 1px dashed #ccc;
  color: #888; font-size: 10pt; display: inline-block;
}
/* Tablas */
.doc-table-wrap { margin: 12px auto; text-align: center; width: 100%; }
.doc-table { border-collapse: collapse; margin: 0 auto; font-size: 10pt; }
.doc-table th {
  border-top: 2px solid #000; border-bottom: 1px solid #000;
  padding: 4px 12px; font-weight: bold;
}
.doc-table td { padding: 3px 12px; }
.doc-table tbody tr:last-child td { border-bottom: 1px solid #000; }
/* Captions */
.doc-caption { font-size: 9pt; color: #333; text-align: center; margin-top: 5px; display: block; }
/* Listas */
.doc-list { padding-left: 20px; margin: 6px 0; font-size: 11pt; }
.doc-list li { margin: 2px 0; text-align: justify; }
.doc-bib { list-style: none; padding: 0; }
.doc-bib li { margin: 6px 0; padding-left: 16px; text-indent: -16px; font-size: 10pt; }
.doc-ref { font-size: 9pt; color: #555; }
/* Número de página */
.doc-page-num {
  position: absolute; bottom: 12mm; left: 0; right: 0;
  text-align: center; font-size: 10pt; color: #333;
}
  /* Añade esto al final de tus estilos CSS */
.doc-section, .doc-text, .doc-figure, .doc-table-wrap, .doc-equation {
  page-break-inside: avoid;
  break-inside: avoid;
}
h2, h3, h4 {
  page-break-after: avoid;
  break-after: avoid;
}
`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/>
<style>${css}</style>
</head>
<body>
  <div class="doc-page">
    <div class="doc-header">
      <p class="doc-course">${esc(curso)}${seccion ? `, Lab ${esc(seccion)}` : ''}</p>
      <h1 class="doc-title">${esc(titulo) || 'Sin título'}</h1>
      <p class="doc-authors">${autoresStr}</p>
      <p class="doc-date">${esc(fecha)}</p>
    </div>
    ${body}
  </div>
</body>
</html>`
}

// ── Componente principal ───────────────────────
function DocumentPreview({ reportData, tableData, axisLabels, fitResult, onClose }) {
  const iframeRef = useRef(null)
  const [generating, setGenerating] = useState(false)

  const htmlContent = buildDocumentHTML(reportData, tableData, axisLabels)

  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(htmlContent)
    doc.close()
  }, [htmlContent])

  // ── Genera PDF dividiendo en páginas ──────────
  async function handleDownloadPDF() {
    if (!iframeRef.current) return

    const iframeDoc = iframeRef.current.contentDocument
    if (!iframeDoc) return

    // Agrega CSS de impresión temporalmente al iframe
    const printStyle = iframeDoc.createElement('style')
    printStyle.id = 'print-style'
    printStyle.textContent = `
    @page {
      size: letter;
      margin: 25mm 25mm 25mm 25mm;
    }
    @media print {
      html, body {
        width: 100%;
        padding: 0 !important;
        margin: 0 !important;
      }
      .doc-page {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        min-height: auto !important;
      }
      /* Evita cortes en elementos importantes */
      .doc-figure,
      .doc-table-wrap,
      .doc-equation {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      h2, h3, h4 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      p {
        orphans: 3;
        widows: 3;
      }
    }
  `
    iframeDoc.head.appendChild(printStyle)

    // Usa el diálogo de impresión del iframe
    iframeRef.current.contentWindow.print()

    // Limpia el estilo después
    setTimeout(() => {
      const s = iframeDoc.getElementById('print-style')
      if (s) s.remove()
    }, 1000)
  }

  return (
    <div className={styles.modalOverlay} style={{ zIndex: 200 }}>
      <div className={styles.modal} style={{ maxWidth: '900px', height: '92vh' }}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Previsualización del documento</h3>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.previewScroll}>
          <iframe
            ref={iframeRef}
            className={styles.previewIframe}
            title="Previsualización"
          />
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondaryModal} onClick={onClose}>
            Cerrar
          </button>
          <button
            className={styles.btnPrimaryModal}
            onClick={handleDownloadPDF}
            disabled={generating}
          >
            🖨 Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocumentPreview