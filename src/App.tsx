// ============================================================
// ROOT COMPONENT
// ============================================================
import { ReactFlowProvider } from 'reactflow'
import ERCanvas from './components/canvas/ERCanvas'
import Sidebar  from './components/sidebar/Sidebar'
import Toolbar  from './components/toolbar/Toolbar'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function AppInner() {
  useKeyboardShortcuts()
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <ERCanvas />
        <Sidebar />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  )
}