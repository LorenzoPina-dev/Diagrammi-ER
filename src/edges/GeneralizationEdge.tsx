// ============================================================
// EDGE — Generalizzazione
//
// Questo componente funge solo da contenitore dati per React Flow.
// Il rendering visivo (struttura a T con freccia triangolare verso
// il padre, linea orizzontale condivisa tra i figli) è gestito dal
// componente GeneralizationLayer nel canvas.
// ============================================================
import { memo } from 'react'
import type { EdgeProps } from 'reactflow'
import type { GeneralizationEdgeData } from '../types/er.types'

/**
 * L'edge di generalizzazione non si auto-renderizza:
 * il disegno reale è fatto da GeneralizationLayer (ERCanvas).
 * Restituiamo null ma l'edge resta nello store di React Flow
 * così i dati (coverage, disjoint, waypoints) sono accessibili.
 */
const GeneralizationEdge = memo((_props: EdgeProps<GeneralizationEdgeData>) => null)

GeneralizationEdge.displayName = 'GeneralizationEdge'
export default GeneralizationEdge
