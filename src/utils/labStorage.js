const STORAGE_KEY = 'labfisica_labs'

// Obtiene todos los laboratorios guardados
export function getAllLabs() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error al leer laboratorios:', error)
    return []
  }
}

// Guarda o actualiza un laboratorio
export function saveLab(lab) {
  try {
    const labs = getAllLabs()
    const index = labs.findIndex((l) => l.id === lab.id)
    const updatedLab = { ...lab, updatedAt: new Date().toISOString() }

    if (index >= 0) {
      // Actualiza el laboratorio existente
      labs[index] = updatedLab
    } else {
      // Agrega el nuevo laboratorio
      labs.unshift(updatedLab)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(labs))
    return updatedLab
  } catch (error) {
    console.error('Error al guardar laboratorio:', error)
    return null
  }
}

// Obtiene un laboratorio por su id
export function getLabById(id) {
  const labs = getAllLabs()
  return labs.find((l) => l.id === id) ?? null
}

// Elimina un laboratorio por su id
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

// Formatea una fecha ISO a texto legible en español
export function formatDate(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleDateString('es-GT', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}