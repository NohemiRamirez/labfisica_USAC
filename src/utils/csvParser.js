
// Detecta automáticamente el delimitador del archivo
function detectDelimiter(text) {
  const firstLine = text.split('\n')[0]
  const commas    = (firstLine.match(/,/g)  || []).length
  const semicolons= (firstLine.match(/;/g)  || []).length
  return semicolons > commas ? ';' : ','
}

// Normaliza el nombre de una columna para comparación
function normalizeHeader(header) {
  return header.trim().toLowerCase().replace(/\s+/g, '_')
}

// Mapea los encabezados del CSV a los campos del store
function mapHeader(header) {
  const normalized = normalizeHeader(header)
  const mapping = {
    'x':       'x',
    'y':       'y',
    'error_x': 'errorX',
    'errorx':  'errorX',
    'error x': 'errorX',
    'err_x':   'errorX',
    'errx':    'errorX',
    'error_y': 'errorY',
    'errory':  'errorY',
    'error y': 'errorY',
    'err_y':   'errorY',
    'erry':    'errorY',
  }
  return mapping[normalized] ?? null
}

// Parsea el texto del CSV y retorna un array de filas
export function parseCsv(text) {
  const delimiter = detectDelimiter(text)
  const lines     = text.split('\n').filter((l) => l.trim() !== '')

  if (lines.length < 2) {
    throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos.')
  }

  // Procesa los encabezados
  const headers = lines[0].split(delimiter).map((h) => h.trim())
  const fieldMap = headers.map(mapHeader)

  // Verifica que existan las columnas obligatorias x e y
  const hasX = fieldMap.includes('x')
  const hasY = fieldMap.includes('y')

  if (!hasX || !hasY) {
    throw new Error('El archivo CSV debe contener al menos las columnas "x" e "y".')
  }

  // Procesa cada fila de datos
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim())
    if (values.every((v) => v === '')) continue // Ignora filas vacías

    const row = {
      id:     crypto.randomUUID(),
      x:      '',
      y:      '',
      errorX: '',
      errorY: '',
    }

    fieldMap.forEach((field, index) => {
      if (field && values[index] !== undefined) {
        row[field] = values[index]
      }
    })

    rows.push(row)
  }

  if (rows.length === 0) {
    throw new Error('El archivo CSV no contiene filas de datos válidas.')
  }

  return rows
}