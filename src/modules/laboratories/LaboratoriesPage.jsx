// =============================================
// MÓDULO LABORATORIOS
// Gestión de laboratorios guardados en localStorage
// =============================================

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import styles from './LaboratoriesPage.module.css'
import { getAllLabs, saveLab, deleteLab, getLabById, formatDate } from '../../utils/labStorage'

// ── Íconos SVG ────────────────────────────────
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconUpload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)
const IconOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconFlask = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 3h6M9 3v8l-4 9h14L15 11V3"/><path d="M9 14h6"/>
  </svg>
)

// ── Determina el estado de un laboratorio ──────
function getLabStatus(lab) {
  const hasData   = lab.tableData?.length > 0
  const hasFit    = !!lab.fitResult
  const hasReport = Object.values(lab.reportData?.latexSections || {})
    .some((s) => s?.trim())
  if (hasData && hasFit && hasReport) return 'completado'
  if (hasData || hasFit || hasReport)  return 'progreso'
  return 'nuevo'
}

// ── Modal para crear nuevo laboratorio ─────────
function NewLabModal({ onClose, onCreated }) {
  const [name, setName]   = useState('')
  const [desc, setDesc]   = useState('')
  const [error, setError] = useState('')
  const inputRef          = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleCreate() {
    if (!name.trim()) {
      setError('El nombre del laboratorio es obligatorio.')
      return
    }

    const newLab = {
      id:          crypto.randomUUID(),
      name:        name.trim(),
      description: desc.trim(),
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      tableData:   [],
      fitResult:   null,
      axisLabels:  { x: 'x', y: 'y' },
      reportData:  {
        curso: '', seccion: '', titulo: name.trim(),
        autores: [{ id: crypto.randomUUID(), carnet: '', nombre: '' }],
        fecha: '', resumen: '',
        objGenerales: [''], objEspecificos: [''],
        enabledSections: ['resumen','objetivos','marcoTeorico','disenio','discusion','conclusiones','bibliografia'],
        latexSections: {
          marcoTeorico: '', disenio: '', resultados: '',
          discusion: '', conclusiones: '', bibliografia: '',
        },
        images: [],
      },
    }

    saveLab(newLab)
    onCreated(newLab)
    onClose()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Nuevo laboratorio</h3>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Nombre <span className={styles.req}>*</span>
            </label>
            <input
              ref={inputRef}
              className={`${styles.textInput} ${error ? styles.inputError : ''}`}
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="ej. Laboratorio 3 — Movimiento MRUV"
            />
            {error && <span className={styles.errorMsg}>{error}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Descripción (opcional)</label>
            <textarea
              className={styles.textArea}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descripción breve del laboratorio..."
              rows={3}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.btnPrimary} onClick={handleCreate}>
            Crear laboratorio
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de laboratorio ─────────────────────
function LabCard({ lab, selected, onClick }) {
  const status = getLabStatus(lab)

  const statusConfig = {
    completado: { label: 'Completado',   color: styles.badgeSuccess },
    progreso:   { label: 'En progreso',  color: styles.badgeWarning },
    nuevo:      { label: 'Nuevo',        color: styles.badgeInfo    },
  }

  const { label, color } = statusConfig[status]

  return (
    <div
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      onClick={onClick}
    >
      <div className={styles.cardIcon}>
        <IconFlask />
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.cardName}>{lab.name}</h3>
        {lab.description && (
          <p className={styles.cardDesc}>{lab.description}</p>
        )}
        <div className={styles.cardMeta}>
          <span className={styles.cardDate}>
            Modificado: {formatDate(lab.updatedAt)}
          </span>
          {lab.tableData?.length > 0 && (
            <span className={styles.cardPoints}>
              · {lab.tableData.length} punto{lab.tableData.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className={`${styles.badge} ${color}`}>{label}</span>
      </div>

      {selected && (
        <div className={styles.cardSelectedIndicator} />
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────
function LaboratoriesPage() {
  const navigate         = useNavigate()
  const loadLabIntoStore = useStore((s) => s.loadLabIntoStore)
  const setCurrentLab    = useStore((s) => s.setCurrentLab)
  const resetStore       = useStore((s) => s.resetStore)

  const [labs,        setLabs]        = useState([])
  const [search,      setSearch]      = useState('')
  const [selectedId,  setSelectedId]  = useState(null)
  const [showNewModal,setShowNewModal]= useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const fileInputRef = useRef(null)

  // Carga laboratorios al montar
  useEffect(() => {
    setLabs(getAllLabs())
  }, [])

  // Laboratorios filtrados por búsqueda
  const filtered = labs.filter((lab) =>
    lab.name.toLowerCase().includes(search.toLowerCase()) ||
    (lab.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const selectedLab = labs.find((l) => l.id === selectedId) ?? null

  // ── Abrir laboratorio ──────────────────────────
  function handleOpen(lab) {
  // Recarga desde localStorage para tener la versión más reciente
  const freshLab = getLabById(lab.id) || lab
  loadLabIntoStore(freshLab)
  setCurrentLab({
    id:          freshLab.id,
    name:        freshLab.name,
    description: freshLab.description,
    createdAt:   freshLab.createdAt,
    updatedAt:   freshLab.updatedAt,
  })
  navigate('/data-table')
}

  // ── Nuevo laboratorio creado ───────────────────
  function handleLabCreated(lab) {
    setLabs(getAllLabs())
    setSelectedId(lab.id)
    // Carga inmediatamente al store y navega
    loadLabIntoStore(lab)
    setCurrentLab(lab)
    navigate('/data-table')
  }

  // ── Importar laboratorio desde JSON ───────────
  function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const labData = JSON.parse(ev.target.result)
        if (!labData.id || !labData.name) {
          alert('El archivo no es un laboratorio válido.')
          return
        }
        // Si ya existe, actualiza; si no, agrega
        labData.updatedAt = new Date().toISOString()
        saveLab(labData)
        setLabs(getAllLabs())
        setSelectedId(labData.id)
      } catch {
        alert('Error al leer el archivo. Asegúrate de que sea un archivo JSON válido.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Exportar laboratorio como JSON ────────────
  function handleExport() {
    if (!selectedLab) return
    const json = JSON.stringify(selectedLab, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${selectedLab.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Eliminar laboratorio ───────────────────────
  function handleDelete() {
    if (!selectedLab) return
    deleteLab(selectedLab.id)
    setLabs(getAllLabs())
    setSelectedId(null)
    setShowConfirm(false)
  }

  return (
    <div className={styles.page}>
      {/* ── Encabezado ─────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Gestión de laboratorios</h1>
          <p className={styles.pageSubtitle}>
            Administra, importa y exporta tus laboratorios guardados.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.btnSecondary}
            onClick={() => fileInputRef.current?.click()}
          >
            <IconUpload /> Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <button
            className={styles.btnPrimary}
            onClick={() => setShowNewModal(true)}
          >
            <IconPlus /> Nuevo laboratorio
          </button>
        </div>
      </div>

      {/* ── Buscador ───────────────────────────── */}
      <div className={styles.searchBar}>
        <IconSearch />
        <input
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar laboratorio..."
        />
        {search && (
          <button
            className={styles.searchClear}
            onClick={() => setSearch('')}
          >×</button>
        )}
      </div>

      {/* ── Grid de tarjetas ───────────────────── */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <IconFlask />
          <h2>
            {search
              ? 'No se encontraron laboratorios'
              : 'No tienes laboratorios guardados'}
          </h2>
          <p>
            {search
              ? 'Intenta con otro término de búsqueda.'
              : 'Crea un nuevo laboratorio o importa uno existente para comenzar.'}
          </p>
          {!search && (
            <button
              className={styles.btnPrimary}
              onClick={() => setShowNewModal(true)}
            >
              <IconPlus /> Crear primer laboratorio
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              selected={selectedId === lab.id}
              onClick={() => setSelectedId(
                selectedId === lab.id ? null : lab.id
              )}
            />
          ))}
        </div>
      )}

      {/* ── Barra de acciones ──────────────────── */}
      {selectedLab && (
        <div className={styles.actionBar}>
          <div className={styles.actionBarInfo}>
            <strong>{selectedLab.name}</strong>
            {selectedLab.description && (
              <span> — {selectedLab.description}</span>
            )}
          </div>
          <div className={styles.actionBarBtns}>
            <button
              className={styles.btnDanger}
              onClick={() => setShowConfirm(true)}
              title="Eliminar laboratorio"
            >
              <IconTrash /> Eliminar
            </button>
            <button
              className={styles.btnSecondary}
              onClick={handleExport}
              title="Exportar como JSON"
            >
              <IconDownload /> Exportar
            </button>
            <button
              className={styles.btnPrimary}
              onClick={() => handleOpen(selectedLab)}
              title="Abrir laboratorio"
            >
              <IconOpen /> Abrir laboratorio
            </button>
          </div>
        </div>
      )}

      {/* ── Modal nuevo laboratorio ────────────── */}
      {showNewModal && (
        <NewLabModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleLabCreated}
        />
      )}

      {/* ── Confirmación de eliminación ────────── */}
      {showConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.modal} style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Eliminar laboratorio</h3>
              <button className={styles.modalClose}
                onClick={() => setShowConfirm(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                ¿Estás seguro de que deseas eliminar
                <strong> "{selectedLab?.name}"</strong>?
                Esta acción es permanente e irreversible.
              </p>
              <p className={styles.confirmHint}>
                💡 Te recomendamos exportar el laboratorio antes de eliminarlo.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary}
                onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
              <button className={styles.btnDanger} onClick={handleDelete}>
                <IconTrash /> Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LaboratoriesPage