import { ReactFlowProvider } from 'reactflow'
import ERCanvas from './components/canvas/ERCanvas'
import Sidebar from './components/sidebar/Sidebar'
import Toolbar from './components/toolbar/Toolbar'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function AppShell() {
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-950">
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
      <AppShell />
    </ReactFlowProvider>
  )
}
