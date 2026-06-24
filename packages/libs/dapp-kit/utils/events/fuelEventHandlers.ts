import type { SuiEvent } from '@mysten/sui/jsonRpc'

import { Assemblies, type AssemblyType } from '../../types'
import { getEveWorldPackageId } from '../constants'
import { isRecord, normalizeObjectId } from '../utils'

type FuelEventPayload = {
  assembly_id?: string
  assembly_key?: { item_id?: string | number; tenant?: string }
  type_id?: string | number
  old_quantity?: string | number
  new_quantity?: string | number
  is_burning?: boolean
  action?: unknown
}

export type FuelEventTarget = {
  eventTypes: readonly string[]
  objectId: string
}

function parseFuelEventPayload(
  event: Pick<SuiEvent, 'parsedJson'>,
): FuelEventPayload | null {
  if (!isRecord(event.parsedJson)) return null
  return event.parsedJson as FuelEventPayload
}

export function getFuelEventType(packageId = getEveWorldPackageId()): string {
  return `${packageId}::fuel::FuelEvent`
}

export function getFuelEventTarget(
  assembly: AssemblyType<Assemblies> | null,
  eventTypes: readonly string[],
): FuelEventTarget | null {
  if (assembly?.type !== Assemblies.NetworkNode) return null
  if (!assembly.id) return null
  return { eventTypes, objectId: assembly.id }
}

export function isRelevantFuelEvent(
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
  target: FuelEventTarget,
): boolean {
  if (!target.eventTypes.includes(event.type)) return false
  const payload = parseFuelEventPayload(event)
  return (
    normalizeObjectId(payload?.assembly_id) ===
    normalizeObjectId(target.objectId)
  )
}

export function applyFuelEventToAssembly(
  assembly: AssemblyType<Assemblies> | null,
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
): AssemblyType<Assemblies> | null {
  if (assembly?.type !== Assemblies.NetworkNode) return assembly

  const payload = parseFuelEventPayload(event)
  if (!payload) return assembly

  const newQuantity = Number(payload.new_quantity)
  if (!Number.isFinite(newQuantity) || newQuantity < 0) return assembly

  return {
    ...assembly,
    networkNode: {
      ...assembly.networkNode,
      fuel: {
        ...assembly.networkNode.fuel,
        quantity: newQuantity,
        isBurning: Boolean(payload.is_burning),
      },
    },
  }
}
