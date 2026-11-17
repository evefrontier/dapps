import { TENANT_CONFIG, type TenantId } from '@evefrontier/wallet-core/tenant'
import type { SuiEvent } from '@mysten/sui/jsonRpc'

import type { Assemblies, AssemblyType } from '../../types'
import {
  applyFuelEventToAssembly,
  type FuelEventTarget,
  getFuelEventType,
  isRelevantFuelEvent,
} from './fuelEventHandlers'
import {
  type AssemblyEventTarget,
  applyInventoryEventToAssembly,
  getInventoryEventTypes,
  isRelevantAssemblyInventoryEvent,
} from './inventoryEventHandlers'
import {
  applyStatusEventToAssembly,
  getStatusEventType,
  isRelevantStatusEvent,
  type StatusEventTarget,
} from './statusEventHandlers'

type AssemblyEvent = Pick<SuiEvent, 'type' | 'parsedJson'>

function getStreamEventTypes(
  tenant: string,
  getTypes: (packageId?: string) => string[],
): string[] {
  // World events: no packageId arg → each type resolved to its type-origin tag.
  const types = new Set(getTypes())
  // Tenant events (if any): the tenant's own package id, interpolated verbatim.
  const tenantPackageId = TENANT_CONFIG[tenant as TenantId]?.packageId
  if (tenantPackageId) for (const t of getTypes(tenantPackageId)) types.add(t)
  return [...types]
}

/** Stream event types for an assembly, grouped by the handler that applies them. */
export type AssemblyStreamEventTypes = {
  inventory: string[]
  fuel: string[]
  status: string[]
}

export function getAssemblyStreamEventTypes(
  tenant: string,
): AssemblyStreamEventTypes {
  return {
    inventory: getStreamEventTypes(tenant, getInventoryEventTypes),
    fuel: getStreamEventTypes(tenant, (pkg) => [getFuelEventType(pkg)]),
    status: getStreamEventTypes(tenant, (pkg) => [getStatusEventType(pkg)]),
  }
}

export type AssemblyEventTargets = {
  inventory: AssemblyEventTarget
  fuel: FuelEventTarget | null
  status: StatusEventTarget | null
}

export type RelevantAssemblyEvents<E extends AssemblyEvent = AssemblyEvent> = {
  inventory: E[]
  fuel: E[]
  status: E[]
}

/** Keeps only the events that target this assembly, grouped by kind. */
export function selectRelevantAssemblyEvents<E extends AssemblyEvent>(
  events: E[],
  targets: AssemblyEventTargets,
): RelevantAssemblyEvents<E> {
  const { fuel, status } = targets
  return {
    inventory: events.filter((event) =>
      isRelevantAssemblyInventoryEvent(event, targets.inventory),
    ),
    fuel: fuel
      ? events.filter((event) => isRelevantFuelEvent(event, fuel))
      : [],
    status: status
      ? events.filter((event) => isRelevantStatusEvent(event, status))
      : [],
  }
}

export function countRelevantAssemblyEvents(
  relevant: RelevantAssemblyEvents,
): number {
  return (
    relevant.inventory.length + relevant.fuel.length + relevant.status.length
  )
}

/** Applies inventory, then fuel, then status events to the assembly. */
export function applyAssemblyEvents(
  assembly: AssemblyType<Assemblies> | null,
  relevant: RelevantAssemblyEvents,
): AssemblyType<Assemblies> | null {
  let next = assembly
  next = relevant.inventory.reduce(applyInventoryEventToAssembly, next)
  next = relevant.fuel.reduce(applyFuelEventToAssembly, next)
  next = relevant.status.reduce(applyStatusEventToAssembly, next)
  return next
}
