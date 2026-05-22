// =============================================
// STORE GLOBAL — Zustand
// =============================================

import { create } from 'zustand'
import { saveCurrentLabState } from '../utils/labStorage'

const defaultEnabledSections = [
  'resumen', 'objetivos', 'marcoTeorico',
  'disenio', 'discusion', 'conclusiones', 'bibliografia'
]

const initialReportData = {
  curso:    '',
  seccion:  '',
  titulo:   '',
  autores:  [{ id: crypto.randomUUID(), carnet: '', nombre: '' }],
  fecha:    '',
  resumen:  '',
  objGenerales:   [''],
  objEspecificos: [''],
  enabledSections: [...defaultEnabledSections],
  latexSections: {
    marcoTeorico: '',
    disenio:      '',
    resultados:   '',
    discusion:    '',
    conclusiones: '',
    bibliografia: '',
  },
  images: [],
}

const initialState = {
  currentLab: null,
  tableData:  [],
  fitResult:  null,
  axisLabels: { x: 'x', y: 'y' },
  reportData: { ...initialReportData },
}

// ── Guarda en localStorage con debounce ────────
let saveTimeout = null
function debouncedSave(getState) {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    const state = getState()
    if (state.currentLab?.id) {
      saveCurrentLabState(state)
    }
  }, 800)
}

const useStore = create((set, get) => ({
  ...initialState,

  // ─── TABLA DE DATOS ───────────────────────────
  setTableData: (data) => {
    set({ tableData: data })
    debouncedSave(get)
  },
  addRow: () => {
    set((s) => ({
      tableData: [
        ...s.tableData,
        { id: crypto.randomUUID(), x: '', y: '', errorX: '', errorY: '' }
      ]
    }))
    debouncedSave(get)
  },
  updateRow: (id, field, value) => {
    set((s) => ({
      tableData: s.tableData.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      )
    }))
    debouncedSave(get)
  },
  deleteRow: (id) => {
    set((s) => ({
      tableData: s.tableData.filter((r) => r.id !== id)
    }))
    debouncedSave(get)
  },

  // ─── ANÁLISIS GRÁFICO ─────────────────────────
  setFitResult: (result) => {
    set({ fitResult: result })
    debouncedSave(get)
  },
  setAxisLabels: (labels) => {
    set({ axisLabels: labels })
    debouncedSave(get)
  },
  setGraphImage: (image) => set({ graphImage: image }),
  graphImage: null,

  // ─── REPORTE — campos simples ──────────────────
  setReportField: (field, value) => {
    set((s) => ({
      reportData: { ...s.reportData, [field]: value }
    }))
    debouncedSave(get)
  },

  // ─── REPORTE — autores ─────────────────────────
  addAutor: () => {
    set((s) => ({
      reportData: {
        ...s.reportData,
        autores: [
          ...s.reportData.autores,
          { id: crypto.randomUUID(), carnet: '', nombre: '' }
        ]
      }
    }))
    debouncedSave(get)
  },
  updateAutor: (id, field, value) => {
    set((s) => ({
      reportData: {
        ...s.reportData,
        autores: s.reportData.autores.map((a) =>
          a.id === id ? { ...a, [field]: value } : a
        )
      }
    }))
    debouncedSave(get)
  },
  deleteAutor: (id) => {
    set((s) => ({
      reportData: {
        ...s.reportData,
        autores: s.reportData.autores.filter((a) => a.id !== id)
      }
    }))
    debouncedSave(get)
  },

  // ─── REPORTE — secciones habilitadas ──────────
  toggleSection: (sectionId) => {
    set((s) => {
      const enabled = s.reportData.enabledSections
      const updated = enabled.includes(sectionId)
        ? enabled.filter((id) => id !== sectionId)
        : [...enabled, sectionId]
      return {
        reportData: { ...s.reportData, enabledSections: updated }
      }
    })
    debouncedSave(get)
  },

  // ─── REPORTE — contenido LaTeX ─────────────────
  setLatexSection: (sectionId, content) => {
    set((s) => ({
      reportData: {
        ...s.reportData,
        latexSections: {
          ...s.reportData.latexSections,
          [sectionId]: content,
        }
      }
    }))
    debouncedSave(get)
  },

  // ─── REPORTE — objetivos ───────────────────────
  addObjItem: (field) => {
    set((s) => ({
      reportData: {
        ...s.reportData,
        [field]: [...s.reportData[field], '']
      }
    }))
    debouncedSave(get)
  },
  updateObjItem: (field, index, value) => {
    set((s) => {
      const list = [...s.reportData[field]]
      list[index] = value
      return { reportData: { ...s.reportData, [field]: list } }
    })
    debouncedSave(get)
  },
  deleteObjItem: (field, index) => {
    set((s) => ({
      reportData: {
        ...s.reportData,
        [field]: s.reportData[field].filter((_, i) => i !== index)
      }
    }))
    debouncedSave(get)
  },

  // ─── REPORTE — imágenes ────────────────────────
  addImage: (image) => {
    set((s) => ({
      reportData: {
        ...s.reportData,
        images: [...s.reportData.images, image]
      }
    }))
    debouncedSave(get)
  },

  // ─── LABORATORIO ──────────────────────────────
  setCurrentLab: (lab) => set({ currentLab: lab }),

  loadLabIntoStore: (data) => {
    // Asegura que el reportData tenga todos los campos necesarios
    const reportData = {
      ...initialReportData,
      ...(data.reportData || {}),
      latexSections: {
        ...initialReportData.latexSections,
        ...(data.reportData?.latexSections || {}),
      },
      images: data.reportData?.images || [],
      enabledSections: data.reportData?.enabledSections || [...defaultEnabledSections],
    }

    set({
      currentLab: data.currentLab ?? {
        id:          data.id,
        name:        data.name,
        description: data.description,
        createdAt:   data.createdAt,
        updatedAt:   data.updatedAt,
      },
      tableData:  data.tableData  ?? [],
      fitResult:  data.fitResult  ?? null,
      axisLabels: data.axisLabels ?? { x: 'x', y: 'y' },
      reportData,
    })
  },

  exportStoreAsLab: () => {
    const s = get()
    return {
      ...(s.currentLab || {}),
      tableData:  s.tableData,
      fitResult:  s.fitResult,
      axisLabels: s.axisLabels,
      reportData: s.reportData,
    }
  },

  // Guarda inmediatamente (sin debounce) el estado actual
  saveNow: () => {
    const state = get()
    if (state.currentLab?.id) {
      saveCurrentLabState(state)
    }
  },

  resetStore: () => set({
    ...initialState,
    graphImage: null,
    reportData: {
      ...initialReportData,
      autores: [{ id: crypto.randomUUID(), carnet: '', nombre: '' }],
      enabledSections: [...defaultEnabledSections],
      latexSections: {
        marcoTeorico: '', disenio: '', resultados: '',
        discusion: '', conclusiones: '', bibliografia: '',
      },
      images: [],
    },
  }),

  
}))
// Expone el store para guardado al cerrar el navegador
if (typeof window !== 'undefined') {
  useStore.subscribe((state) => {
    window.__labfisicaStore = state
  })
}

export default useStore