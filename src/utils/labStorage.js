// =============================================
// UTILIDADES DE LOCALSTORAGE
// =============================================

const STORAGE_KEY = 'labfisica_labs'

export function getAllLabs() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error al leer laboratorios:', error)
    return []
  }
}

export function saveLab(lab) {
  try {
    const labs  = getAllLabs()
    const index = labs.findIndex((l) => l.id === lab.id)
    const updated = { ...lab, updatedAt: new Date().toISOString() }
    if (index >= 0) {
      labs[index] = updated
    } else {
      labs.unshift(updated)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labs))
    return updated
  } catch (error) {
    console.error('Error al guardar laboratorio:', error)
    return null
  }
}

export function getLabById(id) {
  return getAllLabs().find((l) => l.id === id) ?? null
}

export function deleteLab(id) {
  try {
    const labs = getAllLabs().filter((l) => l.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labs))
    return true
  } catch (error) {
    console.error('Error al eliminar laboratorio:', error)
    return false
  }
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleDateString('es-GT', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// ── Guarda el estado actual del store en el laboratorio activo ──
export function saveCurrentLabState(storeState) {
  const { currentLab, tableData, fitResult, axisLabels, reportData } = storeState
  if (!currentLab?.id) return

  const labToSave = {
    ...currentLab,
    tableData,
    fitResult,
    axisLabels,
    reportData,
  }
  saveLab(labToSave)
}