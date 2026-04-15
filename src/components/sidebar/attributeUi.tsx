import type { ReactNode } from 'react'
import {
  Circle,
  Hash,
  Key,
  KeyRound,
  Layers,
  Minus,
  Sigma,
} from 'lucide-react'
import { ATTRIBUTE_KINDS_WITH_CHILDREN } from '../../lib/er'
import type { AttributeKind } from '../../types/er.types'

export interface AttributeKindOption {
  kind: AttributeKind
  label: string
  icon: ReactNode
  title?: string
}

export const ATTRIBUTE_KIND_OPTIONS: AttributeKindOption[] = [
  {
    kind: 'normal',
    label: 'Semplice',
    icon: <Circle size={12} />,
    title: 'Attributo semplice',
  },
  {
    kind: 'primary-key',
    label: 'Chiave (PK)',
    icon: <Key size={12} />,
    title: 'Chiave primaria',
  },
  {
    kind: 'optional',
    label: '(0,1)',
    icon: <Minus size={12} />,
    title: 'Attributo opzionale',
  },
  {
    kind: 'multivalued',
    label: '(1,N)',
    icon: <Hash size={12} />,
    title: 'Attributo multivalore',
  },
  {
    kind: 'optional-multi',
    label: '(0,N)',
    icon: <Hash size={12} />,
    title: 'Attributo opzionale multivalore',
  },
  {
    kind: 'derived',
    label: 'Derivato',
    icon: <Sigma size={12} />,
    title: 'Attributo derivato',
  },
  {
    kind: 'composite',
    label: 'Composto',
    icon: <Layers size={12} />,
    title: 'Attributo composto',
  },
  {
    kind: 'composite-key',
    label: 'Chiave comp.',
    icon: <KeyRound size={12} />,
    title: 'Chiave composta',
  },
]

export function AttributeKindIcon({ kind }: { kind: AttributeKind }) {
  switch (kind) {
    case 'primary-key':
      return <Key size={12} className="text-green-400" />
    case 'optional':
      return <Minus size={12} className="text-gray-400" />
    case 'multivalued':
      return <Hash size={12} className="text-sky-400" />
    case 'optional-multi':
      return <Hash size={12} className="text-gray-500" />
    case 'derived':
      return <Sigma size={12} className="text-gray-400" />
    case 'composite':
      return <Layers size={12} className="text-indigo-400" />
    case 'composite-key':
      return <KeyRound size={12} className="text-green-400" />
    default:
      return <Circle size={12} className="text-green-500" />
  }
}

export function AttributeKindPicker({
  value,
  onChange,
  accentClassName,
}: {
  value: AttributeKind
  onChange: (kind: AttributeKind) => void
  accentClassName: string
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {ATTRIBUTE_KIND_OPTIONS.map(({ kind, label, icon, title }) => (
        <button
          key={kind}
          type="button"
          title={title}
          onClick={() => onChange(kind)}
          className={`flex flex-col items-center justify-center gap-0.5 rounded border py-1.5 text-xs font-medium transition-colors ${
            value === kind
              ? accentClassName
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
          }`}
        >
          {icon}
          <span className="truncate text-[10px] leading-tight">{label}</span>
        </button>
      ))}
    </div>
  )
}

export { ATTRIBUTE_KINDS_WITH_CHILDREN }
