import { create } from 'zustand'

const defaultEnabledSections = [
  'resumen', 'objetivos', 'marcoTeorico',
  'disenio', 'discusion', 'conclusiones', 'bibliografia'
]

const initialReportData = {
  // ── Encabezado ──────────────────────────────
  curso:    '',
  seccion:  '',
  titulo:   '',
  autores:  [{ id: crypto.randomUUID(), carnet: '', nombre: '' }],
  fecha:    '',

  // ── Resumen (texto plano) ────────────────────
  resumen: '',

  // ── Objetivos (listas simples) ───────────────
  objGenerales:   [''],
  objEspecificos: [''],

  // ── Secciones opcionales habilitadas ─────────
  enabledSections: [...defaultEnabledSections],

  // ── Contenido LaTeX libre por sección ────────
  // El estudiante escribe LaTeX directamente
  latexSections: {
    marcoTeorico: '',
    disenio:      '',
    resultados:   '',
    discusion:    '',
    conclusiones: '',
    bibliografia: '',
  },

  // ── Imágenes guardadas (para compilación) ─────
  // [{ id, filename, dataUrl }]
  images: [],
}

const initialState = {
  currentLab: null,
  tableData:  [],
  fitResult:  null,
  axisLabels: { x: 'x', y: 'y' },
  reportData: { ...initialReportData },
  graphImage: null, // ◄── [AGREGADO AQUÍ]
}

const useStore = create((set, get) => ({
  ...initialState,

  // ─── TABLA DE DATOS ───────────────────────────
  setTableData: (data) => set({ tableData: data }),
  addRow: () => set((s) => ({
    tableData: [
      ...s.tableData,
      { id: crypto.randomUUID(), x: '', y: '', errorX: '', errorY: '' }
    ]
  })),
  updateRow: (id, field, value) => set((s) => ({
    tableData: s.tableData.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    )
  })),
  deleteRow: (id) => set((s) => ({
    tableData: s.tableData.filter((r) => r.id !== id)
  })),

  // ─── ANÁLISIS GRÁFICO ─────────────────────────
  setFitResult:  (result) => set({ fitResult: result }),
  setAxisLabels: (labels) => set({ axisLabels: labels }),

  // ─── REPORTE — encabezado ──────────────────────
  setReportField: (field, value) => set((s) => ({
    reportData: { ...s.reportData, [field]: value }
  })),

  // ─── REPORTE — autores ─────────────────────────
  addAutor: () => set((s) => ({
    reportData: {
      ...s.reportData,
      autores: [
        ...s.reportData.autores,
        { id: crypto.randomUUID(), carnet: '', nombre: '' }
      ]
    }
  })),
  updateAutor: (id, field, value) => set((s) => ({
    reportData: {
      ...s.reportData,
      autores: s.reportData.autores.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      )
    }
  })),
  deleteAutor: (id) => set((s) => ({
    reportData: {
      ...s.reportData,
      autores: s.reportData.autores.filter((a) => a.id !== id)
    }
  })),

  // ─── REPORTE — objetivos ───────────────────────
  addObjItem: (field) => set((s) => ({
    reportData: {
      ...s.reportData,
      [field]: [...s.reportData[field], '']
    }
  })),
  updateObjItem: (field, index, value) => set((s) => {
    const list = [...s.reportData[field]]
    list[index] = value
    return { reportData: { ...s.reportData, [field]: list } }
  }),
  deleteObjItem: (field, index) => set((s) => ({
    reportData: {
      ...s.reportData,
      [field]: s.reportData[field].filter((_, i) => i !== index)
    }
  })),

  // ─── REPORTE — secciones habilitadas ──────────
  toggleSection: (sectionId) => set((s) => {
    const enabled = s.reportData.enabledSections
    const updated = enabled.includes(sectionId)
      ? enabled.filter((id) => id !== sectionId)
      : [...enabled, sectionId]
    return {
      reportData: { ...s.reportData, enabledSections: updated }
    }
  }),

  // ─── REPORTE — contenido LaTeX por sección ────
  setLatexSection: (sectionId, content) => set((s) => ({
    reportData: {
      ...s.reportData,
      latexSections: {
        ...s.reportData.latexSections,
        [sectionId]: content,
      }
    }
  })),

  // ─── REPORTE — imágenes ───────────────────────
  addImage: (image) => set((s) => ({
    reportData: {
      ...s.reportData,
      images: [...s.reportData.images, image]
    }
  })),

  // ─── IMAGEN DE LA GRÁFICA ───────────────────── [AGREGADO AQUÍ]
  graphImage: null,
  setGraphImage: (image) => set({ graphImage: image }),

  // ─── LABORATORIO ──────────────────────────────
  setCurrentLab: (lab) => set({ currentLab: lab }),

  loadLabIntoStore: (data) => set({
    currentLab: data.currentLab ?? null,
    tableData:  data.tableData  ?? [],
    fitResult:  data.fitResult  ?? null,
    axisLabels: data.axisLabels ?? { x: 'x', y: 'y' },
    reportData: data.reportData ?? { ...initialReportData },
    graphImage: data.graphImage ?? null, // ◄── [RECOMENDADO] Mantiene consistencia al cargar labs
  }),

  exportStoreAsLab: () => {
    const s = get()
    return {
      currentLab: s.currentLab,
      tableData:  s.tableData,
      fitResult:  s.fitResult,
      axisLabels: s.axisLabels,
      reportData: s.reportData,
      graphImage: s.graphImage, // ◄── [RECOMENDADO] Para que se guarde la gráfica en el JSON exportado
    }
  },

  resetStore: () => set({
    ...initialState,
    graphImage: null, // ◄── [AGREGADO AQUÍ] Asegura limpieza total
    reportData: {
      ...initialReportData,
      autores: [{ id: crypto.randomUUID(), carnet: '', nombre: '' }],
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
    },
  }),
}))

export { useStore as default, useStore }