'use client'

import { useState, useEffect } from 'react'
import { Participant, Relationship } from '@/lib/types'
import { fetchOrgGraph } from '@/lib/api'

interface LiveOrgMapProps {
  orgId: string
  onNodeClick: (participant: Participant) => void
}

const stateColors = {
  active: 'bg-green-500',
  at_risk: 'bg-yellow-500',
  stalled: 'bg-gray-500',
  inactive: 'bg-blue-500',
}

// Simple force-directed layout (no hierarchy)
function calculateLayout(
  nodes: Participant[],
  edges: Relationship[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  
  // Simple grid layout for now (can be enhanced with force-directed algorithm)
  const cols = Math.ceil(Math.sqrt(nodes.length))
  const spacing = Math.min(width / (cols + 1), height / (cols + 1))
  
  nodes.forEach((node, idx) => {
    const row = Math.floor(idx / cols)
    const col = idx % cols
    positions.set(node.id, {
      x: (col + 1) * spacing,
      y: (row + 1) * spacing,
    })
  })
  
  return positions
}

export default function LiveOrgMap({ orgId, onNodeClick }: LiveOrgMapProps) {
  const [dismissed, setDismissed] = useState(false)
  const [nodes, setNodes] = useState<Participant[]>([])
  const [edges, setEdges] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map())

  useEffect(() => {
    async function loadGraph() {
      try {
        setLoading(true)
        setError(null)
        const graph = await fetchOrgGraph(orgId)
        setNodes(graph.nodes)
        setEdges(graph.edges)
        
        // Calculate layout
        const layout = calculateLayout(graph.nodes, graph.edges, 600, 400)
        setPositions(layout)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load graph')
        console.error('Graph load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadGraph()
    
    // Refresh every 60 seconds
    const interval = setInterval(loadGraph, 60000)
    return () => clearInterval(interval)
  }, [orgId])

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-900">
        <div className="text-gray-400">Loading organization graph...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-900">
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Tooltip */}
      {!dismissed && (
        <div className="absolute top-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-sm z-10">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-white">About this view</h3>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            This view shows real-time engagement and operational flow across your organization.
            It reflects behavior, not hierarchy or compensation.
          </p>
        </div>
      )}

      {/* Canvas */}
      <svg className="w-full h-full" viewBox="0 0 600 400">
        {/* Edges (rendered neutrally, no arrows) */}
        {edges.map((edge) => {
          const fromPos = positions.get(edge.from_participant_id)
          const toPos = positions.get(edge.to_participant_id)
          if (!fromPos || !toPos) return null
          
          return (
            <line
              key={edge.id}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="#4b5563"
              strokeWidth="1"
            />
          )
        })}
        
        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id)
          if (!pos) return null
          
          return (
            <g key={node.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={20}
                className={`${stateColors[node.status]} cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => onNodeClick(node)}
              />
              <text
                x={pos.x}
                y={pos.y + 40}
                textAnchor="middle"
                className="text-xs fill-gray-400"
              >
                {node.display_name || 'Participant'}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

