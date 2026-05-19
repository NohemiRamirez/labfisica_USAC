import { useRef, useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { SECTIONS } from './ReportsPage'
import styles from './ReportsPage.module.css'

// ── Escapa HTML ────────────────────────────────
function esc(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── Construye el HTML del documento ───────────
function buildHTML(reportData, tableData, axisLabels, fitResult) {
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

  // Convierte referencias de imágenes en tags img con dataUrl
  function resolveImages(text) {
    let result = esc(text)
    images.forEach((img) => {
      const pattern = new RegExp(
        `\\\\includegraphics[^{]*\\{${img.filename.replace('.', '\\.')}\\}`,
        'g'
      )
      result = result.replace(
        pattern,
        `<img src="${img.dataUrl}" class="doc-img" alt="${esc(img.filename)}" />`
      )
    })
    return result
  }

  // Convierte texto LaTeX básico a HTML legible
  function latexToHtml(text) {
    if (!text) return ''
    let html = text

    // Subsecciones
    html = html.replace(/\\subsection\{([^}]+)\}/g,
      '<h3 class="doc-subsection">$1</h3>')

    // Negrita e itálica
    html = html.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
    html = html.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')

    // Ecuaciones inline $...$
    html = html.replace(/\$([^$]+)\$/g,
      '<span class="doc-inline-eq"><em>$1</em></span>')

    // Ambiente equation
    html = html.replace(
      /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g,
      (_, content) => {
        equationCounter++
        return `<div class="doc-equation">
          <span class="doc-eq-body"><em>${content.trim()}</em></span>
          <span class="doc-eq-num">(${equationCounter})</span>
        </div>`
      }
    )

    // Tablas booktabs → HTML table
    html = html.replace(
      /\\begin\{table\}[\s\S]*?\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}[\s\S]*?\\caption\{([^}]*)\}[\s\S]*?\\end\{table\}/g,
      (_, tabContent, caption) => {
        tableCounter++
        const lines = tabContent
          .split('\\\\')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('\\toprule') &&
                         !l.startsWith('\\midrule') &&
                         !l.startsWith('\\bottomrule'))

        const [headerLine, ...dataLines] = lines
        const headers = (headerLine || '').split('&')
          .map((h) => h.trim().replace(/\\textbf\{([^}]+)\}/g, '$1'))

        const rows = dataLines
          .filter((l) => l.trim())
          .map((l) => l.split('&').map((c) => c.trim()))

        return `
          <div class="doc-table-wrap">
            <table class="doc-table">
              <thead>
                <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.map((r) =>
                  `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`
                ).join('')}
              </tbody>
            </table>
            <p class="doc-caption">Tabla ${tableCounter}: ${esc(caption)}</p>
          </div>`
      }
    )

    // Figuras includegraphics
    html = html.replace(
      /\\begin\{figure\}[\s\S]*?\\includegraphics[^{]*\{([^}]+)\}[\s\S]*?\\caption\{([^}]*)\}[\s\S]*?\\end\{figure\}/g,
      (_, filename, caption) => {
        figureCounter++
        const img = images.find((i) => i.filename === filename)
        if (img) {
          return `
            <div class="doc-figure">
              <img src="${img.dataUrl}" class="doc-img" alt="${esc(caption)}" />
              <p class="doc-caption">Figura ${figureCounter}: ${esc(caption)}</p>
            </div>`
        }
        return `
          <div class="doc-figure">
            <div class="doc-img-placeholder">[Figura: ${esc(filename)}]</div>
            <p class="doc-caption">Figura ${figureCounter}: ${esc(caption)}</p>
          </div>`
      }
    )

    // Itemize
    html = html.replace(
      /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
      (_, content) => {
        const items = content.split('\\item')
          .map((i) => i.replace(/^\[[^\]]*\]\s*/, '').trim())
          .filter(Boolean)
        return `<ul class="doc-list">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
      }
    )

    // Enumerate
    html = html.replace(
      /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
      (_, content) => {
        const items = content.split('\\item')
          .map((i) => i.replace(/^\[[^\]]*\]\s*/, '').trim())
          .filter(Boolean)
        return `<ol class="doc-list">${items.map((i) => `<li>${i}</li>`).join('')}</ol>`
      }
    )

    // thebibliography
    html = html.replace(
      /\\begin\{thebibliography\}[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g,
      (_, content) => {
        const items = content.split('\\bibitem{}')
          .map((i) => i.trim())
          .filter(Boolean)
        return `<ul class="doc-bib">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
      }
    )

    // Saltos de línea dobles → párrafos
    html = html.replace(/\n\n+/g, '</p><p class="doc-text">')

    // Comandos LaTeX restantes (limpieza)
    html = html.replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '')

    return `<p class="doc-text">${html}</p>`
  }

  // Contadores globales
  let equationCounter = 0
  let tableCounter    = 0
  let figureCounter   = 0
  let sectionCounter  = 0

  let body = ''

  // Resumen
  if (isEnabled('resumen') && resumen) {
    body += `
      <div class="doc-abstract">
        <p class="doc-abstract-title">Resumen</p>
        <p class="doc-abstract-text">${esc(resumen)}</p>
      </div>`
  }

  // Objetivos
  if (isEnabled('objetivos')) {
    const genItems  = objGenerales.filter((o) => o.trim())
    const espItems  = objEspecificos.filter((o) => o.trim())
    if (genItems.length || espItems.length) {
      sectionCounter++
      body += `
        <div class="doc-section">
          <h2 class="doc-section-title">${sectionCounter}. Objetivos</h2>
          ${genItems.length ? `
            <h3 class="doc-subsection">Generales</h3>
            <ul class="doc-list">
              ${genItems.map((o) => `<li>${esc(o)}</li>`).join('')}
            </ul>` : ''}
          ${espItems.length ? `
            <h3 class="doc-subsection">Específicos</h3>
            <ul class="doc-list">
              ${espItems.map((o) => `<li>${esc(o)}</li>`).join('')}
            </ul>` : ''}
        </div>`
    }
  }

  // Secciones LaTeX
  const latexSectionOrder = [
    { id: 'marcoTeorico', label: 'Marco Teórico'          },
    { id: 'disenio',      label: 'Diseño Experimental'    },
    { id: 'resultados',   label: 'Resultados'             },
    { id: 'discusion',    label: 'Discusión de Resultados'},
    { id: 'conclusiones', label: 'Conclusiones'           },
    { id: 'bibliografia', label: 'Bibliografía'           },
  ]

  latexSectionOrder.forEach(({ id, label }) => {
    if (!isEnabled(id)) return
    const content = latexSections[id]
    if (!content?.trim()) return

    sectionCounter++
    body += `
      <div class="doc-section">
        <h2 class="doc-section-title">${sectionCounter}. ${label}</h2>
        ${latexToHtml(content)}
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
    padding: 72px 96px;
    max-width: 820px;
    margin: 0 auto;
  }
  .doc-header {
    text-align: center;
    margin-bottom: 28px;
    width: 100%;
  }
  .doc-course  {
    font-size: 10pt;
    color: #333;
    margin-bottom: 6px;
    text-align: center;
  }
  .doc-title   {
    font-size: 14pt;
    font-weight: bold;
    line-height: 1.3;
    margin: 8px auto;
    text-align: center;
    max-width: 80%;
  }
  .doc-authors {
    font-size: 10pt;
    margin: 4px 0;
    text-align: center;
  }
  .doc-date    {
    font-size: 10pt;
    color: #555;
    margin: 4px 0;
    text-align: center;
  }
  .doc-abstract {
    margin: 20px 0;
    padding: 0 40px;
  }
  .doc-abstract-title {
    font-size: 10pt; font-weight: bold;
    text-align: center; margin-bottom: 6px;
  }
  .doc-abstract-text {
    font-size: 10pt; text-align: justify;
  }
  .doc-section { margin-top: 24px; }
  .doc-section-title {
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 10px;
    text-align: left;
  }
  .doc-subsection {
    font-size: 11pt; font-weight: bold; margin: 12px 0 6px;
  }
  .doc-text { margin: 6px 0; text-align: justify; font-size: 11pt; }
  .doc-inline-eq { font-style: italic; }
  .doc-equation {
    display: flex; justify-content: center;
    align-items: center; margin: 14px 0;
    position: relative;
  }
  .doc-eq-body { font-style: italic; font-size: 11pt; flex: 1; text-align: center; }
  .doc-eq-num  { font-size: 10pt; color: #333; white-space: nowrap; }
  .doc-figure  { text-align: center; margin: 18px 0; }
  .doc-img     { max-width: 80%; max-height: 320px; object-fit: contain; }
  .doc-img-placeholder {
    padding: 20px; background: #f5f5f5;
    border: 1px dashed #ccc; color: #888;
    font-size: 10pt; display: inline-block;
  }
  .doc-caption {
    font-size: 9pt; color: #333; text-align: center; margin-top: 6px;
  }
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
  .doc-list { padding-left: 24px; margin: 8px 0; font-size: 11pt; }
  .doc-list li { margin: 3px 0; }
  .doc-bib { list-style: none; padding: 0; }
  .doc-bib li {
    margin: 8px 0; padding-left: 16px;
    text-indent: -16px; font-size: 10pt;
  }
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

function DocumentPreview({ reportData, tableData, axisLabels, fitResult, onClose }) {
  const iframeRef    = useRef(null)
  const [generating, setGenerating] = useState(false)

  const htmlContent = buildHTML(reportData, tableData, axisLabels, fitResult)

  // Escribe el HTML en el iframe
  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(htmlContent)
    doc.close()
  }, [htmlContent])

  // ── Descarga PDF ───────────────────────────────
  async function handleDownloadPDF() {
    if (!iframeRef.current) return
    setGenerating(true)

    try {
      const iframeDoc  = iframeRef.current.contentDocument
      const iframeBody = iframeDoc?.body
      if (!iframeBody) return

      // Espera a que las imágenes carguen
      await Promise.all(
        [...iframeBody.querySelectorAll('img')].map(
          (img) => img.complete
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

      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const pageW   = pdf.internal.pageSize.getWidth()
      const pageH   = pdf.internal.pageSize.getHeight()
      const margin  = 10
      const imgW    = pageW - margin * 2
      const ratio   = canvas.width / imgW
      const pageHpx = (pageH - margin * 2) * ratio

      let offset = 0
      while (offset < canvas.height) {
        if (offset > 0) pdf.addPage()

        const sliceH = Math.min(pageHpx, canvas.height - offset)
        const tmpCanvas   = document.createElement('canvas')
        tmpCanvas.width   = canvas.width
        tmpCanvas.height  = sliceH
        const ctx         = tmpCanvas.getContext('2d')
        ctx.fillStyle     = '#ffffff'
        ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height)
        ctx.drawImage(canvas, 0, -offset)

        const sliceImgH = (sliceH / ratio)
        pdf.addImage(
          tmpCanvas.toDataURL('image/png'),
          'PNG', margin, margin, imgW, sliceImgH
        )
        offset += sliceH
      }

      pdf.save(`reporte-${reportData.titulo || 'laboratorio'}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
      alert('Error al generar el PDF. Intenta de nuevo.')
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