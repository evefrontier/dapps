import type { SuiEvent } from '@mysten/sui/jsonRpc'

import { Assemblies, type AssemblyType, State } from '../../types'
import { getEveWorldPackageId } from '../constants'
import { isRecord, normalizeObjectId } from '../utils'

type StatusEventPayload = {
  assembly_id?: string
  assembly_key?: { item_id?: string | number; tenant?: string }
  status?: unknown
  action?: unknown
}

export type StatusEventTarget = {
  eventTypes: readonly string[]
  objectId: string
}

function parseStatusEventPayload(
  event: Pick<SuiEvent, 'parsedJson'>,
): StatusEventPayload | null {
  if (!isRecord(event.parsedJson)) return null
  return event.parsedJson as StatusEventPayload
}

function statusKindToState(status: unknown): State | null {
  if (!isRecord(status)) return null
  const kind = (status as Record<string, unknown>)['$kind']
  if (kind === 'ONLINE') return State.ONLINE
  if (kind === 'OFFLINE') return State.ANCHORED
  return null
}

export function getStatusEventType(packageId = getEveWorldPackageId()): string {
  return `${packageId}::status::StatusChangedEvent`
}

export function getStatusEventTarget(
  assembly: AssemblyType<Assemblies> | null,
  eventTypes: readonly string[],
): StatusEventTarget | null {
  if (!assembly?.id) return null
  return { eventTypes, objectId: assembly.id }
}

export function isRelevantStatusEvent(
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
  target: StatusEventTarget,
): boolean {
  if (!target.eventTypes.includes(event.type)) return false
  const payload = parseStatusEventPayload(event)
  return (
    normalizeObjectId(payload?.assembly_id) ===
    normalizeObjectId(target.objectId)
  )
}

export function applyStatusEventToAssembly(
  assembly: AssemblyType<Assemblies> | null,
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
): AssemblyType<Assemblies> | null {
  if (!assembly) return assembly
  const payload = parseStatusEventPayload(event)
  if (!payload) return assembly
  const nextState = statusKindToState(payload.status)
  if (!nextState) return assembly
  return { ...assembly, state: nextState }
}
