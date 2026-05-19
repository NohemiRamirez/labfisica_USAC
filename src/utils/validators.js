// Verifica si un valor es numérico y no está vacío
export function isNumeric(value) {
  if (value === '' || value === null || value === undefined) return false
  return !isNaN(Number(value)) && value.toString().trim() !== ''
}

// Valida una fila completa de la tabla de datos
// errorX y errorY son opcionales pero si se ingresan deben ser numéricos y >= 0
export function validateRow(row) {
  const errors = []

  if (!isNumeric(row.x)) {
    errors.push('El campo x debe ser un valor numérico')
  }

  if (!isNumeric(row.y)) {
    errors.push('El campo y debe ser un valor numérico')
  }

  if (row.errorX !== '' && row.errorX !== undefined) {
    if (!isNumeric(row.errorX)) {
      errors.push('El Error x debe ser un valor numérico')
    } else if (Number(row.errorX) < 0) {
      errors.push('El Error x no puede ser negativo')
    }
  }

  if (row.errorY !== '' && row.errorY !== undefined) {
    if (!isNumeric(row.errorY)) {
      errors.push('El Error y debe ser un valor numérico')
    } else if (Number(row.errorY) < 0) {
      errors.push('El Error y no puede ser negativo')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Valida todas las filas y retorna un resumen
export function validateAllRows(tableData) {
  const results = tableData.map((row, index) => ({
    index: index + 1,
    id: row.id,
    ...validateRow(row),
  }))

  return {
    allValid: results.every((r) => r.valid),
    results,
  }
}