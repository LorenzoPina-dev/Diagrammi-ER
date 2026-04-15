import { useEffect, useRef, useState } from 'react'
import { toPng, toSvg } from 'html-to-image'
import {
  Cloud,
  Download,
  FileJson,
  FolderOpen,
  ImageIcon,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import shallow from 'zustand/shallow'
import { useDiagramStore } from '../../store/diagramStore'
import type { EREdge, ERNode, ERProject } from '../../types/er.types'

function buildProjectExport(
  name: string,
  nodes: ERNode[],
  edges: EREdge[],
  viewport: ERProject['viewport'],
): ERProject {
  const now = new Date().toISOString()

  return {
    version: '1.0',
    name,
    createdAt: now,
    updatedAt: now,
    nodes: nodes as ERProject['nodes'],
    edges: edges as ERProject['edges'],
    viewport,
  }
}

function downloadHref(href: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.click()
}

async function exportViewportImage(format: 'png' | 'svg', filename: string) {
  const element = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!element) return

  try {
    const dataUrl =
      format === 'png'
        ? await toPng(element, { backgroundColor: '#0f172a', pixelRatio: 2 })
        : await toSvg(element)

    downloadHref(dataUrl, filename)
  } catch (error) {
    console.error(`Export ${format.toUpperCase()} fallito`, error)
  }
}

export default function Toolbar() {
  const {
    nodes,
    edges,
    viewport,
    projectName,
    setProjectName,
    undo,
    resetProject,
    loadProject,
  } = useDiagramStore(
    (state) => ({
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
      projectName: state.projectName,
      setProjectName: state.setProjectName,
      undo: state.undo,
      resetProject: state.resetProject,
      loadProject: state.loadProject,
    }),
    shallow,
  )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setSavedFlash(true)
    const timeoutId = window.setTimeout(() => setSavedFlash(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [nodes, edges, projectName])

  const handleExportJson = () => {
    const project = buildProjectExport(projectName, nodes, edges, viewport)
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    })

    downloadHref(URL.createObjectURL(blob), `${projectName}.er.json`)
  }

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      try {
        loadProject(JSON.parse(loadEvent.target?.result as string) as ERProject)
      } catch {
        alert('File JSON non valido.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <header className="flex h-12 flex-shrink-0 items-center gap-1 border-b border-gray-800 bg-gray-950 px-4">
      <span className="mr-3 select-none text-sm font-bold text-blue-400">ER</span>

      <input
        type="text"
        value={projectName}
        onChange={(event) => setProjectName(event.target.value)}
        title="Rinomina progetto"
        className="w-44 border-b border-gray-700 bg-transparent px-1 py-0.5 text-sm text-gray-200 transition-colors focus:border-blue-500 focus:outline-none"
      />

      <div
        className={`ml-2 flex items-center gap-1 text-xs transition-all duration-500 ${
          savedFlash ? 'text-green-400' : 'text-gray-600'
        }`}
        title="Salvato automaticamente su localStorage"
      >
        <Cloud size={13} />
        <span className="hidden sm:inline">{savedFlash ? 'Salvato' : 'Auto-save'}</span>
      </div>

      <div className="flex-1" />

      <ToolbarButton onClick={undo} title="Annulla (Ctrl+Z)">
        <RotateCcw size={14} />
        <span className="ml-1 hidden text-xs md:inline">Annulla</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        title="Importa progetto JSON"
      >
        <FolderOpen size={14} />
        <span className="ml-1 hidden text-xs md:inline">Importa</span>
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJson}
        className="hidden"
      />

      <ToolbarButton onClick={handleExportJson} title="Esporta progetto JSON">
        <FileJson size={14} />
        <span className="ml-1 hidden text-xs md:inline">JSON</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => exportViewportImage('png', `${projectName}.png`)}
        title="Esporta immagine PNG"
      >
        <ImageIcon size={14} />
        <span className="ml-1 hidden text-xs md:inline">PNG</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => exportViewportImage('svg', `${projectName}.svg`)}
        title="Esporta immagine SVG"
      >
        <Download size={14} />
        <span className="ml-1 hidden text-xs md:inline">SVG</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => {
          if (confirm("Azzerare il diagramma? L'operazione non e reversibile.")) {
            resetProject()
          }
        }}
        title="Nuovo diagramma (azzera tutto)"
        danger
      >
        <Trash2 size={14} />
        <span className="ml-1 hidden text-xs md:inline">Nuovo</span>
      </ToolbarButton>
    </header>
  )
}

interface ToolbarButtonProps {
  children: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}

function ToolbarButton({ children, onClick, title, danger }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center rounded px-2 py-1.5 text-xs font-medium transition-colors ${
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
  return <div className="mx-1 h-5 w-px bg-gray-800" />
}
