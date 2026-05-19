// ── Escapa caracteres especiales ───────────────
export function escapeLaTeX(text) {
  if (!text) return ''
  return String(text)
    .replace(/\\/g,  '\\textbackslash{}')
    .replace(/&/g,   '\\&')
    .replace(/%/g,   '\\%')
    .replace(/\$/g,  '\\$')
    .replace(/#/g,   '\\#')
    .replace(/_/g,   '\\_')
    .replace(/\{/g,  '\\{')
    .replace(/\}/g,  '\\}')
    .replace(/~/g,   '\\textasciitilde{}')
    .replace(/\^/g,  '\\textasciicircum{}')
}

// ── Genera tabla de datos del store ────────────
export function generateDataTableLatex(tableData, axisLabels, caption) {
  if (!tableData || tableData.length === 0) return '% Sin datos cargados'

  const hasEX = tableData.some((r) => r.errorX && r.errorX !== '' && r.errorX !== '0')
  const hasEY = tableData.some((r) => r.errorY && r.errorY !== '' && r.errorY !== '0')

  const headers = [
    `\\textbf{${escapeLaTeX(axisLabels?.x || 'x')}}`,
    `\\textbf{${escapeLaTeX(axisLabels?.y || 'y')}}`,
  ]
  const colSpec = ['c', 'c']

  if (hasEX) { headers.push('\\textbf{Error x}'); colSpec.push('c') }
  if (hasEY) { headers.push('\\textbf{Error y}'); colSpec.push('c') }

  const rows = tableData.map((row) => {
    const cells = [row.x, row.y]
    if (hasEX) cells.push(row.errorX || '0')
    if (hasEY) cells.push(row.errorY || '0')
    return cells.join(' & ')
  })

  return `\\begin{table}[H]
\\centering
\\begin{tabular}{${colSpec.join('')}}
\\toprule
${headers.join(' & ')} \\\\
\\midrule
${rows.join(' \\\\\n')} \\\\
\\bottomrule
\\end{tabular}
\\caption{${escapeLaTeX(caption || 'Datos experimentales')}}
\\label{tab:datos}
\\end{table}`
}

// ── Genera tabla personalizada n×m ─────────────
export function generateCustomTableLatex(headers, rows, caption) {
  if (!headers || headers.length === 0) return ''

  const colSpec  = headers.map(() => 'c').join('')
  const headerRow= headers.map((h) => `\\textbf{${escapeLaTeX(h)}}`).join(' & ')
  const dataRows = rows.map((row) =>
    row.map((cell) => escapeLaTeX(cell)).join(' & ')
  )

  return `\\begin{table}[H]
\\centering
\\begin{tabular}{${colSpec}}
\\toprule
${headerRow} \\\\
\\midrule
${dataRows.join(' \\\\\n')} \\\\
\\bottomrule
\\end{tabular}
\\caption{${escapeLaTeX(caption || 'Tabla')}}
\\label{tab:custom}
\\end{table}`
}

// ── Genera tabla de resultados del ajuste ──────
export function generateFitResultsLatex(fitResult, caption) {
  if (!fitResult) return '% Sin resultados de ajuste'

  const { type, params, paramErrors, r2, equation } = fitResult
  const rows = []

  if (type === 'linear') {
    rows.push(`Pendiente (a) & $${params.a?.toFixed(6)}$ & $\\pm ${paramErrors?.a?.toFixed(6) || '0'}$`)
    rows.push(`Intercepto (b) & $${params.b?.toFixed(6)}$ & $\\pm ${paramErrors?.b?.toFixed(6) || '0'}$`)
  } else if (type === 'quadratic') {
    rows.push(`Coeficiente (a) & $${params.a?.toFixed(6)}$ & $\\pm ${paramErrors?.a?.toFixed(6) || '0'}$`)
    rows.push(`Coeficiente (b) & $${params.b?.toFixed(6)}$ & $\\pm ${paramErrors?.b?.toFixed(6) || '0'}$`)
    rows.push(`Coeficiente (c) & $${params.c?.toFixed(6)}$ & $\\pm ${paramErrors?.c?.toFixed(6) || '0'}$`)
  } else {
    Object.entries(params).forEach(([key, val]) => {
      rows.push(`Parámetro (${key}) & $${val?.toFixed(6)}$ & $\\pm ${paramErrors?.[key]?.toFixed(6) || '0'}$`)
    })
  }
  rows.push(`Coeficiente $R^2$ & $${r2?.toFixed(6)}$ & —`)

  return `\\begin{table}[H]
\\centering
\\begin{tabular}{lcc}
\\toprule
\\textbf{Parámetro} & \\textbf{Valor} & \\textbf{Incerteza} \\\\
\\midrule
${rows.join(' \\\\\n')} \\\\
\\bottomrule
\\end{tabular}
\\caption{${escapeLaTeX(caption || 'Resultados del ajuste de curva')}}
\\label{tab:ajuste}
\\end{table}
% Ecuación del ajuste: ${equation}`
}

// ── Genera código para figura ──────────────────
export function generateFigureLatex(filename, caption) {
  return `\\begin{figure}[H]
\\centering
\\includegraphics[width=0.8\\textwidth]{${filename}}
\\caption{${escapeLaTeX(caption || 'Figura')}}
\\label{fig:${filename.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')}}
\\end{figure}`
}

// ── Genera código para ecuación ────────────────
export function generateEquationLatex(latex, caption) {
  return `\\begin{equation}
${latex}
\\end{equation}
${caption ? `% ${caption}` : ''}`
}

// ── Genera lista itemize ───────────────────────
function generateItemize(items, bullet = '\\bullet') {
  const filtered = items.filter((i) => i.trim())
  if (filtered.length === 0) return ''
  return `\\begin{itemize}
${filtered.map((i) => `\\item[$${bullet}$] ${escapeLaTeX(i)}`).join('\n')}
\\end{itemize}`
}

// ── Genera lista enumerate ─────────────────────
function generateEnumerate(items) {
  const filtered = items.filter((i) => i.trim())
  if (filtered.length === 0) return ''
  return `\\begin{enumerate}
${filtered.map((i) => `\\item ${escapeLaTeX(i)}`).join('\n')}
\\end{enumerate}`
}

// ── Genera documento LaTeX completo ───────────
export function generateFullLatex(reportData, tableData, axisLabels, fitResult) {
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
  } = reportData

  const autoresStr = autores
    .filter((a) => a.nombre || a.carnet)
    .map((a) => `${a.carnet} ${a.nombre}`.trim())
    .join(', ')

  const isEnabled = (id) =>
    ['header', 'resultados'].includes(id) || enabledSections.includes(id)

  // Sección de resultados siempre incluida
  const resultadosContent = latexSections.resultados || ''

  return `\\documentclass[letterpaper,11pt]{article}
\\usepackage{tabularx}
\\usepackage{subcaption}
\\usepackage{graphicx}
\\usepackage[margin=1in,letterpaper]{geometry}
\\usepackage[final]{hyperref}
\\hypersetup{
\tcolorlinks=true,
\tlinkcolor=blue,
\tcitecolor=blue,
\tfilecolor=magenta,
\turlcolor=blue
}
\\usepackage{dcolumn}
\\usepackage{bm}
\\usepackage{microtype}
\\usepackage[spanish]{babel}
\\renewcommand\\spanishtablename{Tabla}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{makeidx}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{float}
\\usepackage{booktabs}
\\decimalpoint

\\begin{document}

\\title{${escapeLaTeX(curso)}${seccion ? `, Lab ${escapeLaTeX(seccion)}` : ''} \\\\\\textbf{${escapeLaTeX(titulo)}}}
\\author{${escapeLaTeX(autoresStr)}}
\\date{${escapeLaTeX(fecha)}}
\\maketitle

${isEnabled('resumen') && resumen ? `\\begin{abstract}\n${escapeLaTeX(resumen)}\n\\end{abstract}` : ''}

${isEnabled('objetivos') ? `\\section{Objetivos}

\\subsection{Generales}
${generateItemize(objGenerales)}

\\subsection{Específicos}
${generateItemize(objEspecificos, '*')}` : ''}

${isEnabled('marcoTeorico') && latexSections.marcoTeorico ? `\\section{Marco Teórico}

${latexSections.marcoTeorico}` : ''}

${isEnabled('disenio') && latexSections.disenio ? `\\section{Diseño Experimental}

${latexSections.disenio}` : ''}

\\section{Resultados}

${resultadosContent}

${isEnabled('discusion') && latexSections.discusion ? `\\section{Discusión de Resultados}

${latexSections.discusion}` : ''}

${isEnabled('conclusiones') && latexSections.conclusiones ? `\\section{Conclusiones}

${latexSections.conclusiones}` : ''}

${isEnabled('bibliografia') && latexSections.bibliografia ? `\\begin{thebibliography}{99}

${latexSections.bibliografia}

\\end{thebibliography}` : ''}

\\end{document}`
}