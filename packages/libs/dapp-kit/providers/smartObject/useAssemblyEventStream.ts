import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'
import type { Assemblies, AssemblyType } from '../../types'
import { createLogger } from '../../utils'
import type { EventTransport } from '../../utils/constants'
import {
  type AssemblyEventTargets,
  type AssemblyStreamEventTypes,
  applyAssemblyEvents,
  countRelevantAssemblyEvents,
  getAssemblyStreamEventTypes,
  selectRelevantAssemblyEvents,
} from '../../utils/events/assemblyEvents'
import {
  createEventRefetchScheduler,
  subscribeToAssemblyEvents,
} from '../../utils/events/eventRefresh'
import { getFuelEventTarget } from '../../utils/events/fuelEventHandlers'
import type { EventUnsubscribe } from '../../utils/events/graphqlEventStream'
import { getInventoryEventTarget } from '../../utils/events/inventoryEventHandlers'
import { getStatusEventTarget } from '../../utils/events/statusEventHandlers'
import type {
  FetchObjectDataInput,
  ObjectSelection,
} from '../../utils/smartObject'

const log = createLogger()

function getEventTargets(
  assembly: AssemblyType<Assemblies> | null,
  eventTypes: AssemblyStreamEventTypes,
  selection: ObjectSelection,
): AssemblyEventTargets {
  return {
    inventory: getInventoryEventTarget({
      assembly,
      eventTypes: eventTypes.inventory,
      isObjectIdDirect: selection.isObjectIdDirect,
      selectedObjectId: selection.objectId,
      selectedTenant: selection.tenant,
    }),
    fuel: getFuelEventTarget(assembly, eventTypes.fuel),
    status: getStatusEventTarget(assembly, eventTypes.status),
  }
}

/**
 * Applies this assembly's inventory, fuel and status events optimistically as
 * they stream in, then schedules a refetch to confirm them. Polling remains
 * the fallback/source of truth if stream events are missed or unavailable.
 */
export function useAssemblyEventStream({
  selection,
  input,
  isConnected,
  eventTransport,
  assembly,
  setAssembly,
  fetchObjectData,
}: {
  selection: ObjectSelection | null
  input: FetchObjectDataInput | null
  isConnected: boolean
  eventTransport: EventTransport
  assembly: AssemblyType<Assemblies> | null
  setAssembly: Dispatch<SetStateAction<AssemblyType<Assemblies> | null>>
  fetchObjectData: (
    input: FetchObjectDataInput,
    isInitialFetch?: boolean,
  ) => Promise<void>
}): void {
  // Event targets depend on the latest assembly without resubscribing.
  const assemblyRef = useRef(assembly)
  assemblyRef.current = assembly

  useEffect(() => {
    if (!selection || !input || !isConnected) return

    const eventTypes = getAssemblyStreamEventTypes(selection.tenant)
    const allEventTypes = [
      ...eventTypes.inventory,
      ...eventTypes.fuel,
      ...eventTypes.status,
    ]
    const abortController = new AbortController()
    const triggerRefetch = createEventRefetchScheduler(
      () => fetchObjectData(input, false),
      undefined,
      (error) => {
        log.warn(
          '[DappKit] SmartObjectProvider: Event-triggered refetch failed:',
          error,
        )
      },
    )
    let unsubscribe: EventUnsubscribe | null = null

    log.debug(
      '[DappKit] SmartObjectProvider: Starting assembly checkpoint stream',
      {
        allEventTypes,
        selectedObjectId: selection.objectId,
        selectedTenant: selection.tenant,
      },
    )

    subscribeToAssemblyEvents({
      eventTypes: allEventTypes,
      transport: eventTransport,
      signal: abortController.signal,
      onGap: () => {
        triggerRefetch()
      },
      onEvents: (events) => {
        const targets = getEventTargets(
          assemblyRef.current,
          eventTypes,
          selection,
        )
        const relevant = selectRelevantAssemblyEvents(events, targets)

        if (countRelevantAssemblyEvents(relevant) === 0) {
          if (events.length > 0) {
            log.debug(
              '[DappKit] SmartObjectProvider: Ignoring stream events for other assemblies',
              {
                count: events.length,
                inventoryEventTarget: targets.inventory,
                fuelEventTarget: targets.fuel,
                statusEventTarget: targets.status,
              },
            )
          }
          return
        }

        log.info(
          '[DappKit] SmartObjectProvider: Applying assembly stream events',
          {
            inventoryCount: relevant.inventory.length,
            fuelCount: relevant.fuel.length,
            statusCount: relevant.status.length,
          },
        )
        setAssembly((currentAssembly) =>
          applyAssemblyEvents(currentAssembly, relevant),
        )
        triggerRefetch()
      },
    })
      .then((eventUnsubscribe) => {
        if (abortController.signal.aborted) {
          void eventUnsubscribe()
          return
        }
        unsubscribe = eventUnsubscribe
        log.debug(
          '[DappKit] SmartObjectProvider: Inventory checkpoint stream active',
        )
      })
      .catch((error) => {
        if (abortController.signal.aborted) return
        log.warn(
          '[DappKit] SmartObjectProvider: Inventory checkpoint stream unavailable; polling remains active:',
          error,
        )
      })

    return () => {
      abortController.abort()
      triggerRefetch.cancel()
      if (unsubscribe) {
        void unsubscribe()
      }
    }
  }, [
    selection,
    input,
    isConnected,
    eventTransport,
    setAssembly,
    fetchObjectData,
  ])
}
