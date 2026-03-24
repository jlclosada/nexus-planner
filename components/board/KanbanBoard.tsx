'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { KanbanColumn } from './KanbanColumn'
import { TicketCard } from './TicketCard'
import type { TicketWithRelations, TicketStatus } from '@/types'

const COLUMNS: Array<{ id: TicketStatus; title: string }> = [
  { id: 'BACKLOG',     title: 'Backlog' },
  { id: 'TODO',        title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW',   title: 'In Review' },
  { id: 'BLOCKED',     title: 'Blocked' },
  { id: 'DONE',        title: 'Done' },
]

const COLUMN_IDS = new Set(COLUMNS.map((c) => c.id as string))

interface KanbanBoardProps {
  tickets: TicketWithRelations[]
  onTicketClick: (ticket: TicketWithRelations) => void
  onAddTicket: (status: TicketStatus) => void
  onTicketUpdate: (id: string, data: Partial<TicketWithRelations>) => Promise<void>
}

export function KanbanBoard({ tickets, onTicketClick, onAddTicket, onTicketUpdate }: KanbanBoardProps) {
  const [items, setItems] = useState<TicketWithRelations[]>(tickets)
  const [activeId, setActiveId] = useState<string | null>(null)
  const lastOverId = useRef<UniqueIdentifier | null>(null)

  // Sync external tickets changes (after API updates) without disrupting active drag
  useEffect(() => {
    if (!activeId) setItems(tickets)
  }, [tickets, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeTicket = items.find((t) => t.id === activeId) ?? null

  const columnTickets = (status: TicketStatus) =>
    items.filter((t) => t.status === status).sort((a, b) => a.order - b.order)

  // Custom collision detection: prefer columns when dragging over empty space
  const collisionDetection = (args: Parameters<typeof pointerWithin>[0]) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      lastOverId.current = pointerCollisions[0].id
      return pointerCollisions
    }
    const rectCollisions = rectIntersection(args)
    const first = getFirstCollision(rectCollisions)
    if (first) lastOverId.current = first.id
    return rectCollisions
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return

    const activeTicket = items.find((t) => t.id === active.id)
    if (!activeTicket) return

    // Target is a column header
    if (COLUMN_IDS.has(over.id as string)) {
      const newStatus = over.id as TicketStatus
      if (activeTicket.status !== newStatus) {
        setItems((prev) =>
          prev.map((t) => t.id === active.id ? { ...t, status: newStatus } : t)
        )
      }
      return
    }

    // Target is another ticket
    const overTicket = items.find((t) => t.id === over.id)
    if (overTicket && activeTicket.status !== overTicket.status) {
      setItems((prev) =>
        prev.map((t) => t.id === active.id ? { ...t, status: overTicket.status } : t)
      )
    }
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null)

    if (!over) {
      setItems(tickets) // revert
      return
    }

    const draggedId = active.id as string
    const current = items.find((t) => t.id === draggedId)
    const original = tickets.find((t) => t.id === draggedId)
    if (!current || !original) return

    // Determine final target status
    let targetStatus = current.status
    if (COLUMN_IDS.has(over.id as string)) {
      targetStatus = over.id as TicketStatus
    } else {
      const overTicket = items.find((t) => t.id === over.id)
      if (overTicket) targetStatus = overTicket.status
    }

    // Status changed → persist to API
    if (targetStatus !== original.status) {
      // Apply status change optimistically
      setItems((prev) =>
        prev.map((t) => t.id === draggedId ? { ...t, status: targetStatus } : t)
      )
      try {
        await onTicketUpdate(draggedId, { status: targetStatus })
        toast.success(`Moved to ${targetStatus.replace(/_/g, ' ')}`)
      } catch {
        setItems(tickets)
        toast.error('Failed to move ticket')
      }
      return
    }

    // Reorder within same column
    if (!COLUMN_IDS.has(over.id as string)) {
      const col = columnTickets(current.status)
      const oldIdx = col.findIndex((t) => t.id === draggedId)
      const newIdx = col.findIndex((t) => t.id === over.id)

      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(col, oldIdx, newIdx).map((t, i) => ({ ...t, order: i + 1 }))
        setItems((prev) => [
          ...prev.filter((t) => t.status !== current.status),
          ...reordered,
        ])
        await fetch('/api/tickets/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickets: reordered.map((t) => ({ id: t.id, order: t.order })) }),
        }).catch(() => setItems(tickets))
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 px-1 h-full">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            status={col.id}
            tickets={columnTickets(col.id)}
            onTicketClick={onTicketClick}
            onAddTicket={onAddTicket}
          />
        ))}
      </div>

      {/* dropAnimation=null: overlay disappears instantly on drop — no snap-back.
          Framer Motion handles the lift + tilt on pickup. */}
      <DragOverlay dropAnimation={null}>
        {activeTicket ? (
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ scale: 1.04, rotate: 1.5 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
            style={{
              filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.55)) drop-shadow(0 8px 16px rgba(0,0,0,0.35))',
              transformOrigin: 'center center',
            }}
          >
            <TicketCard ticket={activeTicket} onClick={() => {}} isDragOverlay />
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
