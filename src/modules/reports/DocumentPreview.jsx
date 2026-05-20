// =============================================
// PREVISUALIZACIÓN Y EXPORTACIÓN A PDF
// Renderiza HTML estilizado desde contenido LaTeX
// =============================================

import { useRef, useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { SECTIONS } from './ReportsPage'
import styles from './ReportsPage.module.css'

// ── Escapa HTML ────────────────────────────────
function esc(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
}

// ── Convierte LaTeX a HTML legible ─────────────
function latexToHtml(text, images, counters) {
  if (!text) return ''
  let html = text

  // ── Subsecciones ──────────────────────────────
  html = html.replace(
    /\\subsection\*?\{([^}]+)\}/g,
    '<h3 class="doc-subsection">$1</h3>'
  )
  html = html.replace(
    /\\subsubsection\*?\{([^}]+)\}/g,
    '<h4 class="doc-subsubsection">$1</h4>'
  )

  // ── Formato de texto ──────────────────────────
  html = html.replace(/\\textbf\{([^}]+)\}/g,   '<strong>$1</strong>')
  html = html.replace(/\\textit\{([^}]+)\}/g,   '<em>$1</em>')
  html = html.replace(/\\underline\{([^}]+)\}/g,'<u>$1</u>')
  html = html.replace(/\\emph\{([^}]+)\}/g,     '<em>$1</em>')
  html = html.replace(/\\text\{([^}]+)\}/g,     '$1')
  html = html.replace(/\\textrm\{([^}]+)\}/g,   '$1')

  // ── Ambiente equation / equation* ─────────────
  html = html.replace(
    /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,
    (_, content) => {
      counters.eq++
      const cleaned = content.trim()
        .replace(/\\label\{[^}]+\}/g, '')
        .trim()
      return `<div class="doc-equation">
        <span class="doc-eq-body">${renderMath(cleaned)}</span>
        <span class="doc-eq-num">(${counters.eq})</span>
      </div>`
    }
  )

  // ── Ambiente align / align* ───────────────────
  html = html.replace(
    /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,
    (_, content) => {
      counters.eq++
      const lines = content.trim()
        .split('\\\\')
        .map((l) => l.replace(/&/g, '').replace(/\\label\{[^}]+\}/g, '').trim())
        .filter(Boolean)
        .map((l) => `<div class="doc-align-line">${renderMath(l)}</div>`)
        .join('')
      return `<div class="doc-equation">
        <div class="doc-align-body">${lines}</div>
        <span class="doc-eq-num">(${counters.eq})</span>
      </div>`
    }
  )

  // ── Ecuaciones inline $...$ ───────────────────
  html = html.replace(
    /\$([^$\n]+)\$/g,
    (_, content) => `<span class="doc-inline-eq">${renderMath(content)}</span>`
  )

  // ── Ambiente table con tabular ─────────────────
  html = html.replace(
    /\\begin\{table\}[^]*?\\begin\{tabular\}\{([^}]+)\}([\s\S]*?)\\end\{tabular\}[\s\S]*?\\caption\{([^}]*)\}[\s\S]*?\\end\{table\}/g,
    (_, colSpec, tabContent, caption) => {
      counters.tab++
      return buildTable(tabContent, caption, counters.tab)
    }
  )

  // ── tabular sin table ──────────────────────────
  html = html.replace(
    /\\begin\{tabular\}\{([^}]+)\}([\s\S]*?)\\end\{tabular\}/g,
    (_, colSpec, tabContent) => {
      counters.tab++
      return buildTable(tabContent, '', counters.tab)
    }
  )

  // ── Ambiente figure ────────────────────────────
  html = html.replace(
    /\\begin\{figure\}[\s\S]*?\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}[\s\S]*?\\caption\{([^}]*)\}[\s\S]*?\\end\{figure\}/g,
    (_, filename, caption) => {
      counters.fig++
      const cleanFilename = filename.trim()
      const img = images.find((i) =>
        i.filename === cleanFilename ||
        i.filename.endsWith(cleanFilename)
      )
      if (img) {
        return `<div class="doc-figure">
          <img src="${img.dataUrl}" class="doc-img" alt="${esc(caption)}" />
          <p class="doc-caption">Figura ${counters.fig}: ${esc(caption)}</p>
        </div>`
      }
      return `<div class="doc-figure">
        <div class="doc-img-placeholder">[Figura: ${esc(cleanFilename)}]</div>
        <p class="doc-caption">Figura ${counters.fig}: ${esc(caption)}</p>
      </div>`
    }
  )

  // ── includegraphics sin figure ─────────────────
  html = html.replace(
    /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g,
    (_, filename) => {
      counters.fig++
      const cleanFilename = filename.trim()
      const img = images.find((i) =>
        i.filename === cleanFilename ||
        i.filename.endsWith(cleanFilename)
      )
      if (img) {
        return `<img src="${img.dataUrl}" class="doc-img" alt="${esc(cleanFilename)}" />`
      }
      return `<div class="doc-img-placeholder">[Figura: ${esc(cleanFilename)}]</div>`
    }
  )

  // ── Listas itemize ─────────────────────────────
  html = html.replace(
    /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
    (_, content) => {
      const items = content
        .split(/\\item/)
        .slice(1)
        .map((i) => i.replace(/^\[[^\]]*\]\s*/, '').trim())
        .filter(Boolean)
        .map((i) => `<li>${latexInline(i)}</li>`)
        .join('')
      return `<ul class="doc-list">${items}</ul>`
    }
  )

  // ── Listas enumerate ───────────────────────────
  html = html.replace(
    /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
    (_, content) => {
      const items = content
        .split(/\\item/)
        .slice(1)
        .map((i) => i.replace(/^\[[^\]]*\]\s*/, '').trim())
        .filter(Boolean)
        .map((i) => `<li>${latexInline(i)}</li>`)
        .join('')
      return `<ol class="doc-list">${items}</ol>`
    }
  )

  // ── thebibliography ────────────────────────────
  html = html.replace(
    /\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g,
    (_, content) => {
      const items = content
        .split(/\\bibitem\{[^}]*\}/)
        .slice(1)
        .map((i) => i.trim())
        .filter(Boolean)
        .map((i) => `<li>${latexInline(i)}</li>`)
        .join('')
      return `<ul class="doc-bib">${items}</ul>`
    }
  )

  // ── Comandos de formato restantes ─────────────
  html = html.replace(/\\newline|\\\\(?!\s*[\[{])/g, '<br/>')
  html = html.replace(/\\noindent\s*/g, '')
  html = html.replace(/\\medskip|\\bigskip|\\smallskip/g, '<br/>')
  html = html.replace(/\\label\{[^}]+\}/g, '')
  html = html.replace(/\\ref\{([^}]+)\}/g, '<span class="doc-ref">[ref]</span>')
  html = html.replace(/\\cite\{([^}]+)\}/g, '<span class="doc-ref">[$1]</span>')
  html = html.replace(/\\decimalpoint/g, '')
  html = html.replace(/\\[a-zA-Z]+\*?\{([^}]*)\}/g, '$1')
  html = html.replace(/\\[a-zA-Z]+\*/g, '')
  html = html.replace(/\\[a-zA-Z]+/g, '')
  html = html.replace(/\{|\}/g, '')

  // ── Párrafos ───────────────────────────────────
  const paragraphs = html
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('<h') && !p.startsWith('<div') &&
                   !p.startsWith('<ul') && !p.startsWith('<ol') &&
                   !p.startsWith('<table'))

  // Envuelve en párrafos solo el texto plano
  html = html.replace(/([^\n<>]{20,})\n\n/g, '<p class="doc-text">$1</p>\n')

  return `<div class="doc-section-content">${html}</div>`
}

// ── Renderiza matemáticas básicas ──────────────
// Convierte notación LaTeX a símbolos Unicode/HTML
function renderMath(latex) {
  if (!latex) return ''
  let m = latex.trim()

  // Fracciones
  m = m.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,
    '<span class="doc-frac"><span class="doc-num">$1</span><span class="doc-den">$2</span></span>')

  // Raíces
  m = m.replace(/\\sqrt\{([^}]+)\}/g,
    '<span class="doc-sqrt">√<span class="doc-sqrt-content">$1</span></span>')

  // Superíndices y subíndices
  m = m.replace(/\^{([^}]+)}/g,  '<sup>$1</sup>')
  m = m.replace(/\^([^{\\])/g,   '<sup>$1</sup>')
  m = m.replace(/_{([^}]+)}/g,   '<sub>$1</sub>')
  m = m.replace(/_([^{\\])/g,    '<sub>$1</sub>')

  // Símbolos griegos
  const greek = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
    '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
    '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
    '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Pi': 'Π', '\\Sigma': 'Σ',
    '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  }
  Object.entries(greek).forEach(([cmd, sym]) => {
    m = m.replace(new RegExp(cmd.replace('\\', '\\\\') + '(?![a-zA-Z])', 'g'), sym)
  })

  // Operadores matemáticos
  const ops = {
    '\\pm': '±', '\\times': '×', '\\div': '÷', '\\cdot': '·',
    '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
    '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
    '\\sum': 'Σ', '\\prod': 'Π', '\\int': '∫',
    '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒',
    '\\leftrightarrow': '↔', '\\cdots': '⋯', '\\ldots': '…',
    '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\cup': '∪',
    '\\cap': '∩', '\\forall': '∀', '\\exists': '∃',
  }
  Object.entries(ops).forEach(([cmd, sym]) => {
    m = m.replace(new RegExp(cmd.replace('\\', '\\\\') + '(?![a-zA-Z])', 'g'), sym)
  })

  // Funciones matemáticas
  const funcs = ['sin','cos','tan','cot','sec','csc','log','ln','exp',
                 'lim','max','min','sup','inf','det','mod']
  funcs.forEach((f) => {
    m = m.replace(new RegExp(`\\\\${f}(?![a-zA-Z])`, 'g'),
      `<span class="doc-mathfunc">${f}</span>`)
  })

  // Limpiar comandos restantes
  m = m.replace(/\\[a-zA-Z]+\*?\{([^}]*)\}/g, '$1')
  m = m.replace(/\\[a-zA-Z]+/g, '')
  m = m.replace(/[{}]/g, '')

  return `<span class="doc-math">${m}</span>`
}

// ── Aplica formato inline básico ───────────────
function latexInline(text) {
  let t = text
  t = t.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
  t = t.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
  t = t.replace(/\$([^$]+)\$/g, (_, m) => `<span class="doc-inline-eq">${renderMath(m)}</span>`)
  t = t.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
  return t
}

// ── Construye tabla HTML desde contenido tabular ─
function buildTable(tabContent, caption, tabNum) {
  const lines = tabContent
    .split('\\\\')
    .map((l) => l.trim())
    .filter((l) => l && !l.match(/^\\(toprule|midrule|bottomrule|hline)\s*$/))

  if (lines.length === 0) return ''

  const [headerLine, ...dataLines] = lines

  const parseRow = (line) =>
    line.split('&').map((cell) => {
      let c = cell.trim()
      c = c.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
      c = c.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
      c = c.replace(/\$([^$]+)\$/g, (_, m) => `<span class="doc-inline-eq">${renderMath(m)}</span>`)
      c = c.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
      c = c.replace(/\\[a-zA-Z]+/g, '')
      c = c.replace(/[{}]/g, '')
      return c.trim()
    })

  const headers  = parseRow(headerLine)
  const dataRows = dataLines
    .filter((l) => l.trim())
    .map(parseRow)

  const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${dataRows.map((row) =>
    `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`
  ).join('')}</tbody>`

  const captionHtml = caption
    ? `<p class="doc-caption">Tabla ${tabNum}: ${esc(caption)}</p>`
    : ''

  return `<div class="doc-table-wrap">
    <table class="doc-table">${thead}${tbody}</table>
    ${captionHtml}
  </div>`
}

// ── Construye el HTML del documento completo ───
function buildDocumentHTML(reportData, tableData, axisLabels) {
  const {
    curso           = '',
    seccion         = '',
    titulo          = '',
    autores         = [],
    fecha           = '',
    resumen         = '',
    objGenerales    = [],
    objEspecificos  = [],
    enabledSections = [],
    latexSections   = {},
    images          = [],
  } = reportData

  const autoresStr = autores
    .filter((a) => a.nombre || a.carnet)
    .map((a) => `${esc(a.carnet)} ${esc(a.nombre)}`.trim())
    .join(', ')

  const isEnabled = (id) =>
    ['header', 'resultados'].includes(id) || enabledSections.includes(id)

  // Contadores globales compartidos entre secciones
  const counters = { eq: 0, tab: 0, fig: 0, sec: 0 }

  let body = ''

  // ── Resumen ──────────────────────────────────
  if (isEnabled('resumen') && resumen) {
    body += `
      <div class="doc-abstract">
        <p class="doc-abstract-title">Resumen</p>
        <p class="doc-abstract-text">${esc(resumen)}</p>
      </div>`
  }

  // ── Objetivos ────────────────────────────────
  if (isEnabled('objetivos')) {
    const gen = objGenerales.filter((o) => o.trim())
    const esp = objEspecificos.filter((o) => o.trim())
    if (gen.length || esp.length) {
      counters.sec++
      body += `<div class="doc-section">
        <h2 class="doc-section-title">${counters.sec}. Objetivos</h2>
        ${gen.length ? `<h3 class="doc-subsection">Generales</h3>
          <ul class="doc-list">${gen.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        ${esp.length ? `<h3 class="doc-subsection">Específicos</h3>
          <ul class="doc-list">${esp.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
      </div>`
    }
  }

  // ── Secciones LaTeX ───────────────────────────
  const latexOrder = [
    { id: 'marcoTeorico', label: 'Marco Teórico'           },
    { id: 'disenio',      label: 'Diseño Experimental'     },
    { id: 'resultados',   label: 'Resultados'              },
    { id: 'discusion',    label: 'Discusión de Resultados' },
    { id: 'conclusiones', label: 'Conclusiones'            },
    { id: 'bibliografia', label: 'Bibliografía'            },
  ]

  latexOrder.forEach(({ id, label }) => {
    if (!isEnabled(id)) return
    const content = latexSections[id]
    if (!content?.trim()) return
    counters.sec++
    body += `<div class="doc-section">
      <h2 class="doc-section-title">${counters.sec}. ${label}</h2>
      ${latexToHtml(content, images, counters)}
    </div>`
  })

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #000;
    background: #fff;
    padding: 72px 80px;
    max-width: 780px;
    margin: 0 auto;
  }
  .doc-header { text-align: center; margin-bottom: 28px; }
  .doc-course  { font-size: 10pt; color: #333; margin-bottom: 6px; text-align: center; }
  .doc-title   { font-size: 14pt; font-weight: bold; line-height: 1.3;
                 margin: 8px auto; text-align: center; }
  .doc-authors { font-size: 10pt; margin: 6px 0; text-align: center; }
  .doc-date    { font-size: 10pt; color: #555; margin: 4px 0; text-align: center; }

  .doc-abstract { margin: 20px 0; padding: 0 40px; }
  .doc-abstract-title {
    font-size: 10pt; font-weight: bold;
    text-align: center; margin-bottom: 6px;
  }
  .doc-abstract-text { font-size: 10pt; text-align: justify; }

  .doc-section { margin-top: 24px; }
  .doc-section-title {
    font-size: 12pt; font-weight: bold; margin-bottom: 10px; text-align: left;
  }
  .doc-subsection {
    font-size: 11pt; font-weight: bold; margin: 12px 0 6px; text-align: left;
  }
  .doc-subsubsection {
    font-size: 11pt; font-style: italic; margin: 10px 0 4px;
  }
  .doc-section-content p,
  .doc-text { margin: 6px 0; text-align: justify; font-size: 11pt; }

  /* Matemáticas */
  .doc-inline-eq { font-style: italic; }
  .doc-math { font-style: italic; }
  .doc-mathfunc { font-style: normal; font-weight: normal; }
  .doc-equation {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 14px 0;
    position: relative;
    min-height: 2em;
  }
  .doc-eq-body { font-style: italic; font-size: 11pt; flex: 1; text-align: center; }
  .doc-align-body { text-align: center; flex: 1; }
  .doc-align-line { margin: 4px 0; }
  .doc-eq-num  { font-size: 10pt; color: #333; white-space: nowrap; padding-left: 1rem; }

  /* Fracciones */
  .doc-frac {
    display: inline-flex; flex-direction: column;
    align-items: center; vertical-align: middle;
    margin: 0 2px; font-style: italic;
  }
  .doc-num { border-bottom: 1px solid #000; padding: 0 4px; }
  .doc-den { padding: 0 4px; }

  /* Raíces */
  .doc-sqrt { font-style: italic; }
  .doc-sqrt-content { border-top: 1px solid #000; padding: 0 2px; }

  /* Figuras */
  .doc-figure  { text-align: center; margin: 18px 0; }
  .doc-img     { max-width: 80%; max-height: 360px; object-fit: contain; }
  .doc-img-placeholder {
    padding: 20px; background: #f5f5f5; border: 1px dashed #ccc;
    color: #888; font-size: 10pt; display: inline-block;
  }

  /* Tablas */
  .doc-table-wrap { margin: 16px auto; text-align: center; }
  .doc-table {
    border-collapse: collapse; margin: 0 auto; font-size: 10pt;
  }
  .doc-table th {
    border-top: 2px solid #000; border-bottom: 1px solid #000;
    padding: 4px 14px; font-weight: bold;
  }
  .doc-table td { padding: 3px 14px; }
  .doc-table tbody tr:last-child td { border-bottom: 1px solid #000; }

  /* Captions */
  .doc-caption {
    font-size: 9pt; color: #333; text-align: center; margin-top: 6px;
  }

  /* Listas */
  .doc-list { padding-left: 24px; margin: 8px 0; font-size: 11pt; }
  .doc-list li { margin: 3px 0; text-align: justify; }

  /* Bibliografía */
  .doc-bib { list-style: none; padding: 0; }
  .doc-bib li {
    margin: 8px 0; padding-left: 16px; text-indent: -16px; font-size: 10pt;
  }

  /* Referencias */
  .doc-ref { font-size: 9pt; color: #555; }
</style>
</head>
<body>
  <div class="doc-header">
    <p class="doc-course">${esc(curso)}${seccion ? `, Lab ${esc(seccion)}` : ''}</p>
    <h1 class="doc-title">${esc(titulo) || 'Sin título'}</h1>
    <p class="doc-authors">${autoresStr}</p>
    <p class="doc-date">${esc(fecha)}</p>
  </div>
  ${body}
</body>
</html>`
}

// ── Componente principal ───────────────────────
function DocumentPreview({ reportData, tableData, axisLabels, fitResult, onClose }) {
  const iframeRef    = useRef(null)
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

  async function handleDownloadPDF() {
    if (!iframeRef.current) return
    setGenerating(true)
    try {
      const iframeDoc  = iframeRef.current.contentDocument
      const iframeBody = iframeDoc?.body
      if (!iframeBody) return

      await Promise.all(
        [...iframeBody.querySelectorAll('img')].map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => { img.onload = res; img.onerror = res })
        )
      )

      const canvas = await html2canvas(iframeBody, {
        scale:           2,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: '#ffffff',
        width:           iframeBody.scrollWidth,
        height:          iframeBody.scrollHeight,
      })

      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const pageW  = pdf.internal.pageSize.getWidth()
      const pageH  = pdf.internal.pageSize.getHeight()
      const margin = 10
      const imgW   = pageW - margin * 2
      const ratio  = canvas.width / imgW
      const pageHpx= (pageH - margin * 2) * ratio

      let offset = 0
      while (offset < canvas.height) {
        if (offset > 0) pdf.addPage()
        const sliceH      = Math.min(pageHpx, canvas.height - offset)
        const tmp         = document.createElement('canvas')
        tmp.width         = canvas.width
        tmp.height        = sliceH
        const ctx         = tmp.getContext('2d')
        ctx.fillStyle     = '#ffffff'
        ctx.fillRect(0, 0, tmp.width, tmp.height)
        ctx.drawImage(canvas, 0, -offset)
        const sliceImgH   = sliceH / ratio
        pdf.addImage(tmp.toDataURL('image/png'), 'PNG', margin, margin, imgW, sliceImgH)
        offset += sliceH
      }

      pdf.save(`reporte-${reportData.titulo || 'laboratorio'}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
      alert('Error al generar el PDF.')
    } finally {
      setGenerating(false)
    }
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
            {generating ? 'Generando PDF...' : '⬇ Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocumentPreview