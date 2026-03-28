// ============================================================
// TOOLBAR — Barra superiore
// Export PNG/SVG/JSON, Import, Undo, Reset, indicatore salvataggio
// ============================================================
import { useRef, useEffect, useState } from 'react'
import { toPng, toSvg } from 'html-to-image'
import {
  Download, FileJson, RotateCcw, Trash2, FolderOpen,
  ImageIcon, Cloud,
} from 'lucide-react'
import { useDiagramStore } from '../../store/diagramStore'
import type { ERProject }  from '../../types/er.types'

export default function Toolbar() {
  const {
    nodes, edges, viewport,
    projectName, setProjectName,
    undo, resetProject, loadProject,
  } = useDiagramStore()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Indicatore "salvato automaticamente" ──────────────────
  // Ogni volta che nodes/edges cambiano il persist di Zustand
  // scrive su localStorage. Mostriamo un flash visivo.
  const [savedFlash, setSavedFlash] = useState(false)
  useEffect(() => {
    setSavedFlash(true)
    const t = setTimeout(() => setSavedFlash(false), 1800)
    return () => clearTimeout(t)
  }, [nodes, edges, projectName])

  // ── Export PNG ────────────────────────────────────────────
  const handleExportPng = async () => {
    const el = document.querySelector<HTMLElement>('.react-flow__viewport')
    if (!el) return
    try {
      const url = await toPng(el, { backgroundColor: '#0f172a', pixelRatio: 2 })
      downloadHref(url, `${projectName}.png`)
    } catch (err) {
      console.error('Export PNG fallito', err)
    }
  }

  // ── Export SVG ────────────────────────────────────────────
  const handleExportSvg = async () => {
    const el = document.querySelector<HTMLElement>('.react-flow__viewport')
    if (!el) return
    try {
      const url = await toSvg(el)
      downloadHref(url, `${projectName}.svg`)
    } catch (err) {
      console.error('Export SVG fallito', err)
    }
  }

  // ── Export JSON ───────────────────────────────────────────
  const handleExportJson = () => {
    const project: ERProject = {
      version:   '1.0',
      name:       projectName,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      nodes:      nodes as ERProject['nodes'],
      edges:      edges as ERProject['edges'],
      viewport,
    }
    const blob = new Blob(
      [JSON.stringify(project, null, 2)],
      { type: 'application/json' },
    )
    downloadHref(URL.createObjectURL(blob), `${projectName}.er.json`)
  }

  // ── Import JSON ───────────────────────────────────────────
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const project: ERProject = JSON.parse(ev.target?.result as string)
        loadProject(project)
      } catch {
        alert('File JSON non valido.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header className="h-12 flex-shrink-0 bg-gray-950 border-b border-gray-800 flex items-center gap-1 px-4">

      {/* ── Logo ── */}
      <span className="text-blue-400 font-bold text-sm mr-3 select-none">ER</span>

      {/* ── Nome progetto ── */}
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        title="Rinomina progetto"
        className="bg-transparent border-b border-gray-700 text-sm text-gray-200 px-1 py-0.5 focus:outline-none focus:border-blue-500 w-44 transition-colors"
      />

      {/* ── Indicatore salvataggio automatico ── */}
      <div
        className={`flex items-center gap-1 ml-2 text-xs transition-all duration-500 ${
          savedFlash ? 'text-green-400' : 'text-gray-600'
        }`}
        title="Salvato automaticamente su localStorage"
      >
        <Cloud size={13} />
        <span className="hidden sm:inline">
          {savedFlash ? 'Salvato' : 'Auto-save'}
        </span>
      </div>

      <div className="flex-1" />

      {/* ── Undo ── */}
      <ToolbarBtn onClick={undo} title="Annulla (Ctrl+Z)">
        <RotateCcw size={14} />
        <span className="hidden md:inline text-xs ml-1">Annulla</span>
      </ToolbarBtn>

      <Divider />

      {/* ── Import JSON ── */}
      <ToolbarBtn onClick={() => fileInputRef.current?.click()} title="Importa progetto JSON">
        <FolderOpen size={14} />
        <span className="hidden md:inline text-xs ml-1">Importa</span>
      </ToolbarBtn>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJson}
        className="hidden"
      />

      {/* ── Export JSON ── */}
      <ToolbarBtn onClick={handleExportJson} title="Esporta progetto JSON">
        <FileJson size={14} />
        <span className="hidden md:inline text-xs ml-1">JSON</span>
      </ToolbarBtn>

      {/* ── Export PNG ── */}
      <ToolbarBtn onClick={handleExportPng} title="Esporta immagine PNG">
        <ImageIcon size={14} />
        <span className="hidden md:inline text-xs ml-1">PNG</span>
      </ToolbarBtn>

      {/* ── Export SVG ── */}
      <ToolbarBtn onClick={handleExportSvg} title="Esporta immagine SVG">
        <Download size={14} />
        <span className="hidden md:inline text-xs ml-1">SVG</span>
      </ToolbarBtn>

      <Divider />

      {/* ── Nuovo diagramma ── */}
      <ToolbarBtn
        onClick={() => {
          if (confirm('Azzerare il diagramma? L\'operazione non è reversibile.'))
            resetProject()
        }}
        title="Nuovo diagramma (azzera tutto)"
        danger
      >
        <Trash2 size={14} />
        <span className="hidden md:inline text-xs ml-1">Nuovo</span>
      </ToolbarBtn>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// Sub-componenti
// ─────────────────────────────────────────────────────────────
interface BtnProps {
  children: React.ReactNode
  onClick:  () => void
  title:    string
  danger?:  boolean
}

function ToolbarBtn({ children, onClick, title, danger }: BtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center px-2 py-1.5 rounded text-xs font-medium transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-800 mx-1" />
}

function downloadHref(href: string, filename: string) {
  const a     = document.createElement('a')
  a.href      = href
  a.download  = filename
  a.click()
}
