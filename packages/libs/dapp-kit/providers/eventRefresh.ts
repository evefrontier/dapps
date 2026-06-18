import { SuiGrpcClient } from '@mysten/sui/grpc'
import type { SuiEvent } from '@mysten/sui/jsonRpc'

import { Assemblies, type AssemblyType, type InventoryItem } from '../types'
import {
  DEFAULT_GRAPHQL_NETWORK,
  getEveWorldPackageId,
  getSuiGrpcBaseUrl,
} from '../utils/constants'
import {
  adjustInventoryUsedCapacity,
  sortInventoryItemsByQuantity,
} from '../utils/inventory'
import {
  decodeInventoryEventBcs,
  inventoryEventBcsToParsedJson,
} from '../utils/inventoryEventBcs'
import { createLogger } from '../utils/logger'

const log = createLogger()

const INVENTORY_EVENT_NAMES = ['ItemBurnedEvent', 'ItemMintedEvent'] as const
const EVENT_REFETCH_DELAYS_MS = [250, 1500, 3500] as const
const CHECKPOINT_STREAM_RECONNECT_MS = 1_000
// Rotate before the public fullnode ~30s stream cutoff.
const CHECKPOINT_STREAM_MAX_SESSION_MS = 28_000
// Backup if a session stops yielding without closing cleanly.
const CHECKPOINT_STREAM_IDLE_MS = 35_000
// Bound the dedupe set so long-lived sessions don't grow it unbounded.
const CHECKPOINT_STREAM_MAX_SEEN_EVENTS = 5_000
const CHECKPOINT_STREAM_READ_MASK_PATHS = [
  'transactions.digest',
  'transactions.events',
  'sequence_number',
] as const

type AssemblyEventKey = {
  item_id?: string | number
  tenant?: string
}

type AssemblyEventPayload = {
  assembly_id?: string
  assembly_key?: AssemblyEventKey
  item_id?: string
  quantity?: number
  type_id?: string | number
}

type ProtobufValue = {
  kind?: {
    oneofKind?: string
    nullValue?: unknown
    numberValue?: number
    stringValue?: string
    boolValue?: boolean
    structValue?: ProtobufStruct
    listValue?: { values?: ProtobufValue[] }
  }
}

type ProtobufStruct = {
  fields?: Record<string, ProtobufValue>
}

export type CheckpointStreamTransaction = {
  digest?: string
  events?: {
    events?: Array<{
      eventType?: string
      event_type?: string
      json?: ProtobufValue
      contents?: {
        value?: Uint8Array
      }
    }>
  }
}

export type CheckpointStreamMessage = {
  checkpoint?: {
    sequenceNumber?: number | bigint
    sequence_number?: number | bigint
    transactions?: CheckpointStreamTransaction[]
  }
}

export type AssemblyEventTarget = {
  eventTypes: readonly string[]
  itemId?: string
  objectId?: string
  tenant?: string
}

export type EventUnsubscribe = () => Promise<void>
export type ScheduledRefetch = (() => void) & { cancel: () => void }
export type InventoryEvent = Pick<SuiEvent, 'id' | 'type' | 'parsedJson'>
export type InventoryEventBatchHandler = (events: InventoryEvent[]) => void
export type CheckpointGapHandler = (
  lastCheckpoint: number,
  nextCheckpoint: number,
) => void
export type CheckpointStreamSession = {
  cancel: () => void
  responses: AsyncIterable<CheckpointStreamMessage>
}
export type SubscribeCheckpoints = (request: {
  readMask: { paths: readonly string[] }
}) => CheckpointStreamSession

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function protobufValueToJson(value: ProtobufValue | undefined): unknown {
  const kind = value?.kind
  if (!kind?.oneofKind) return null

  switch (kind.oneofKind) {
    case 'nullValue':
      return null
    case 'numberValue':
      return kind.numberValue
    case 'stringValue':
      return kind.stringValue
    case 'boolValue':
      return kind.boolValue
    case 'structValue':
      return protobufStructToJson(kind.structValue)
    case 'listValue':
      return (kind.listValue?.values ?? []).map((entry) =>
        protobufValueToJson(entry),
      )
    default:
      return null
  }
}

function protobufStructToJson(
  struct: ProtobufStruct | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  Object.entries(struct?.fields ?? {}).forEach(([key, value]) => {
    result[key] = protobufValueToJson(value)
  })

  return result
}

function parseAssemblyEventPayload(
  event: Pick<SuiEvent, 'parsedJson'>,
): AssemblyEventPayload | null {
  const parsedJson = event.parsedJson
  if (!isRecord(parsedJson)) return null

  const assemblyKeyRaw = parsedJson['assembly_key']
  let assemblyKey: AssemblyEventKey | undefined
  if (isRecord(assemblyKeyRaw)) {
    const itemId = assemblyKeyRaw['item_id']
    const tenant = assemblyKeyRaw['tenant']
    if (
      (typeof itemId === 'string' || typeof itemId === 'number') &&
      typeof tenant === 'string'
    ) {
      assemblyKey = { item_id: itemId, tenant }
    }
  }

  const payload: AssemblyEventPayload = {}

  if (typeof parsedJson['assembly_id'] === 'string') {
    payload.assembly_id = parsedJson['assembly_id']
  }
  if (assemblyKey) {
    payload.assembly_key = assemblyKey
  }
  if (typeof parsedJson['item_id'] === 'string') {
    payload.item_id = parsedJson['item_id']
  }
  if (typeof parsedJson['quantity'] === 'number') {
    payload.quantity = parsedJson['quantity']
  }
  if (
    typeof parsedJson['type_id'] === 'string' ||
    typeof parsedJson['type_id'] === 'number'
  ) {
    payload.type_id = parsedJson['type_id']
  }

  return payload
}

function normalizeObjectId(value: string | undefined) {
  return value?.toLowerCase()
}

function parseInventoryEventPayloadFromStream(event: {
  json?: ProtobufValue
  contents?: {
    value?: Uint8Array
  }
}): Record<string, unknown> | null {
  const parsedJsonFromProtobuf = protobufValueToJson(event.json)
  if (isRecord(parsedJsonFromProtobuf)) {
    return parsedJsonFromProtobuf
  }

  const bcsBytes = event.contents?.value
  if (!bcsBytes) return null

  try {
    return inventoryEventBcsToParsedJson(decodeInventoryEventBcs(bcsBytes))
  } catch {
    return null
  }
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timeoutId)
      reject(signal?.reason)
    }

    if (signal?.aborted) {
      clearTimeout(timeoutId)
      reject(signal.reason)
      return
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function getInventoryEventTypes(
  packageId = getEveWorldPackageId(),
): string[] {
  return INVENTORY_EVENT_NAMES.map(
    (eventName) => `${packageId}::inventory::${eventName}`,
  )
}

export function isRelevantAssemblyInventoryEvent(
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
  target: AssemblyEventTarget,
): boolean {
  if (!target.eventTypes.includes(event.type)) return false

  const payload = parseAssemblyEventPayload(event)
  if (!payload) return false

  if (
    target.objectId &&
    normalizeObjectId(payload.assembly_id) ===
      normalizeObjectId(target.objectId)
  ) {
    return true
  }

  if (!target.itemId || !target.tenant) return false

  const eventItemId = String(payload.assembly_key?.item_id ?? '')
  const targetItemId = String(target.itemId)

  return (
    eventItemId === targetItemId &&
    payload.assembly_key?.tenant === target.tenant
  )
}

export function getInventoryEventTarget({
  assembly,
  eventTypes,
  isObjectIdDirect,
  selectedObjectId,
  selectedTenant,
}: {
  assembly: AssemblyType<Assemblies> | null
  eventTypes: readonly string[]
  isObjectIdDirect: boolean
  selectedObjectId: string
  selectedTenant: string
}): AssemblyEventTarget {
  if (assembly?.type === Assemblies.SmartStorageUnit) {
    if (assembly.id) {
      return { eventTypes, objectId: assembly.id }
    }

    if (assembly.item_id) {
      return {
        eventTypes,
        itemId: String(assembly.item_id),
        tenant: selectedTenant,
      }
    }
  }

  if (isObjectIdDirect) {
    return { eventTypes, objectId: selectedObjectId }
  }

  return {
    eventTypes,
    itemId: selectedObjectId,
    tenant: selectedTenant,
  }
}

function parseInventoryEventDelta(
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
) {
  const payload = parseAssemblyEventPayload(event)
  if (!payload) return null

  const typeId = Number(payload.type_id)
  const quantity = Number(payload.quantity)
  if (!Number.isFinite(typeId) || !Number.isFinite(quantity) || quantity <= 0) {
    return null
  }

  if (event.type.endsWith('::inventory::ItemMintedEvent')) {
    return {
      itemId: payload.item_id ?? String(typeId),
      quantity,
      tenant: payload.assembly_key?.tenant ?? '',
      typeId,
      operation: 'add' as const,
    }
  }

  if (event.type.endsWith('::inventory::ItemBurnedEvent')) {
    return {
      itemId: payload.item_id ?? String(typeId),
      quantity,
      tenant: payload.assembly_key?.tenant ?? '',
      typeId,
      operation: 'subtract' as const,
    }
  }

  return null
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function isOptimisticInventoryItem(item: InventoryItem): boolean {
  return item.id.startsWith('optimistic-')
}

function mergeInventoryItemsByTypeId(items: InventoryItem[]): InventoryItem[] {
  const itemsByTypeId = new Map<number, InventoryItem>()

  items.forEach((item) => {
    const typeId = toFiniteNumber(item.type_id, Number.NaN)
    if (!Number.isFinite(typeId)) return

    const existingItem = itemsByTypeId.get(typeId)
    if (!existingItem) {
      itemsByTypeId.set(typeId, {
        ...item,
        quantity: toFiniteNumber(item.quantity),
        type_id: typeId,
      })
      return
    }

    const preferredItem =
      isOptimisticInventoryItem(existingItem) &&
      !isOptimisticInventoryItem(item)
        ? item
        : existingItem

    const quantity =
      toFiniteNumber(existingItem.quantity) + toFiniteNumber(item.quantity)
    if (quantity <= 0) {
      itemsByTypeId.delete(typeId)
      return
    }

    itemsByTypeId.set(typeId, {
      ...preferredItem,
      quantity,
      type_id: typeId,
    })
  })

  return Array.from(itemsByTypeId.values())
}

export function applyInventoryEventToAssembly(
  assembly: AssemblyType<Assemblies> | null,
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
): AssemblyType<Assemblies> | null {
  if (!assembly || assembly.type !== Assemblies.SmartStorageUnit) {
    return assembly
  }

  const delta = parseInventoryEventDelta(event)
  if (!delta) return assembly

  const items = assembly.storage.mainInventory.items ?? []
  const itemIndex = items.findIndex(
    (item) => toFiniteNumber(item.type_id) === delta.typeId,
  )

  if (itemIndex === -1 && delta.operation === 'subtract') {
    return assembly
  }

  const nextItems =
    itemIndex === -1
      ? [
          ...items,
          {
            id: `optimistic-${delta.typeId}`,
            item_id: delta.itemId,
            location: { location_hash: '' },
            quantity: delta.quantity,
            tenant: delta.tenant,
            type_id: delta.typeId,
            name: `Type ${delta.typeId}`,
          } satisfies InventoryItem,
        ]
      : items.flatMap((item, index) => {
          if (index !== itemIndex) return [item]

          const quantity =
            delta.operation === 'add'
              ? toFiniteNumber(item.quantity) + delta.quantity
              : Math.max(0, toFiniteNumber(item.quantity) - delta.quantity)

          if (quantity === 0) return []

          return [
            {
              ...item,
              quantity,
            },
          ]
        })

  return {
    ...assembly,
    storage: {
      ...assembly.storage,
      mainInventory: {
        ...assembly.storage.mainInventory,
        usedCapacity: adjustInventoryUsedCapacity(
          assembly.storage.mainInventory.usedCapacity,
          delta.quantity,
          delta.typeId,
          delta.operation,
        ),
        items: sortInventoryItemsByQuantity(
          mergeInventoryItemsByTypeId(nextItems),
        ),
      },
    },
  }
}

export function createEventRefetchScheduler(
  refetch: () => Promise<void>,
  delaysMs: readonly number[] = EVENT_REFETCH_DELAYS_MS,
  onError?: (error: unknown) => void,
): ScheduledRefetch {
  let timeouts: ReturnType<typeof setTimeout>[] = []

  const scheduledRefetch = () => {
    scheduledRefetch.cancel()

    timeouts = delaysMs.map((delayMs) => {
      const timeoutId = setTimeout(() => {
        timeouts = timeouts.filter((timeout) => timeout !== timeoutId)
        refetch().catch((error) => onError?.(error))
      }, delayMs)
      return timeoutId
    })
  }

  scheduledRefetch.cancel = () => {
    for (const timeout of timeouts) {
      clearTimeout(timeout)
    }
    timeouts = []
  }

  return scheduledRefetch
}

function getStreamEventType(event: {
  eventType?: string
  event_type?: string
}) {
  return event.eventType ?? event.event_type ?? ''
}

function getCheckpointSequenceNumber(
  checkpoint: CheckpointStreamMessage['checkpoint'],
) {
  const sequenceNumber =
    checkpoint?.sequenceNumber ?? checkpoint?.sequence_number
  if (typeof sequenceNumber === 'bigint') {
    return Number(sequenceNumber)
  }
  return typeof sequenceNumber === 'number' && Number.isFinite(sequenceNumber)
    ? sequenceNumber
    : null
}

async function readNextCheckpointMessage(
  iterator: AsyncIterator<CheckpointStreamMessage>,
  session: CheckpointStreamSession,
  idleMs: number,
  signal?: AbortSignal,
): Promise<IteratorResult<CheckpointStreamMessage>> {
  const pendingNext = iterator.next()

  if (idleMs <= 0 || !Number.isFinite(idleMs)) {
    return pendingNext
  }

  try {
    return await Promise.race([
      pendingNext,
      wait(idleMs, signal).then(() => {
        session.cancel()
        throw new Error('checkpoint stream idle timeout')
      }),
    ])
  } catch (error) {
    session.cancel()
    throw error
  }
}

export function extractInventoryEventsFromCheckpoint(
  checkpoint: CheckpointStreamMessage['checkpoint'],
  eventTypes: readonly string[],
): InventoryEvent[] {
  const inventoryEvents: InventoryEvent[] = []
  const checkpointSequence = getCheckpointSequenceNumber(checkpoint)

  ;(checkpoint?.transactions ?? []).forEach((transaction, txIndex) => {
    const txDigest =
      transaction.digest ??
      (checkpointSequence != null
        ? `checkpoint-${checkpointSequence}-${txIndex}`
        : `checkpoint-tx-${txIndex}`)

    ;(transaction.events?.events ?? []).forEach((event, eventSeq) => {
      const type = getStreamEventType(event)
      if (!eventTypes.includes(type)) return

      const parsedJson = parseInventoryEventPayloadFromStream(event)
      if (!parsedJson) return

      inventoryEvents.push({
        id: { txDigest, eventSeq: String(eventSeq) },
        type,
        parsedJson,
      })
    })
  })

  return inventoryEvents
}

function getInventoryEventId(
  event: InventoryEvent,
  checkpointSequence?: number | null,
) {
  if (event.id.txDigest) {
    return `${event.id.txDigest}:${event.id.eventSeq}`
  }

  return `checkpoint-${checkpointSequence ?? 'unknown'}:${event.id.eventSeq}:${event.type}`
}

function collectUnseenInventoryEvents(
  events: InventoryEvent[],
  seenEventIds: Set<string>,
  checkpointSequence?: number | null,
) {
  return events.filter((event) => {
    const eventId = getInventoryEventId(event, checkpointSequence)
    if (seenEventIds.has(eventId)) return false
    seenEventIds.add(eventId)
    // Evict oldest ids (insertion order) once the set exceeds its cap.
    while (seenEventIds.size > CHECKPOINT_STREAM_MAX_SEEN_EVENTS) {
      const oldest = seenEventIds.values().next().value
      if (oldest === undefined) break
      seenEventIds.delete(oldest)
    }
    return true
  })
}

export function createInventoryCheckpointStream({
  eventTypes,
  idleMs = CHECKPOINT_STREAM_IDLE_MS,
  maxSessionMs = CHECKPOINT_STREAM_MAX_SESSION_MS,
  onError,
  onEvents,
  onGap,
  reconnectMs = CHECKPOINT_STREAM_RECONNECT_MS,
  signal,
  subscribeCheckpoints,
}: {
  eventTypes: readonly string[]
  idleMs?: number
  maxSessionMs?: number
  onError?: (error: unknown) => void
  onEvents?: InventoryEventBatchHandler
  onGap?: CheckpointGapHandler
  reconnectMs?: number
  signal?: AbortSignal
  subscribeCheckpoints: SubscribeCheckpoints
}): EventUnsubscribe {
  let stopped = false
  let streamTask: Promise<void> | null = null
  let activeSession: CheckpointStreamSession | null = null

  const run = async () => {
    const seenEventIds = new Set<string>()
    let lastCheckpointSequence: number | null = null
    let isInitialSession = true

    while (!stopped && !signal?.aborted) {
      let session: CheckpointStreamSession | null = null

      try {
        session = subscribeCheckpoints({
          readMask: { paths: CHECKPOINT_STREAM_READ_MASK_PATHS },
        })
        activeSession = session

        const iterator = session.responses[Symbol.asyncIterator]()
        const sessionStartedAt = Date.now()

        while (!stopped && !signal?.aborted) {
          const elapsedMs = Date.now() - sessionStartedAt
          const hasRotationLimit = maxSessionMs > 0
          const hasIdleLimit = idleMs > 0
          const msUntilRotation = hasRotationLimit
            ? maxSessionMs - elapsedMs
            : Number.POSITIVE_INFINITY
          const readTimeoutMs =
            hasRotationLimit || hasIdleLimit
              ? Math.min(
                  hasIdleLimit ? idleMs : Number.POSITIVE_INFINITY,
                  msUntilRotation,
                )
              : null

          if (readTimeoutMs != null && readTimeoutMs <= 0) {
            break
          }

          let nextCheckpoint: IteratorResult<CheckpointStreamMessage>

          try {
            nextCheckpoint = await readNextCheckpointMessage(
              iterator,
              session,
              readTimeoutMs ?? 0,
              signal,
            )
          } catch (error) {
            if (stopped || signal?.aborted) return

            if (
              hasRotationLimit &&
              Date.now() - sessionStartedAt >= maxSessionMs
            ) {
              break
            }

            onError?.(error)
            break
          }

          if (nextCheckpoint.done) {
            break
          }

          if (!('value' in nextCheckpoint) || !nextCheckpoint.value) continue

          const sequenceNumber = getCheckpointSequenceNumber(
            nextCheckpoint.value.checkpoint,
          )

          if (isInitialSession) {
            isInitialSession = false
            if (sequenceNumber != null) {
              lastCheckpointSequence = sequenceNumber
            }
            continue
          }

          if (
            lastCheckpointSequence != null &&
            sequenceNumber != null &&
            sequenceNumber > lastCheckpointSequence + 1
          ) {
            onGap?.(lastCheckpointSequence, sequenceNumber)
          }

          const inventoryEvents = collectUnseenInventoryEvents(
            extractInventoryEventsFromCheckpoint(
              nextCheckpoint.value.checkpoint,
              eventTypes,
            ),
            seenEventIds,
            sequenceNumber,
          )

          if (inventoryEvents.length > 0) {
            onEvents?.(inventoryEvents)
          }

          if (sequenceNumber != null) {
            lastCheckpointSequence = sequenceNumber
          }
        }
      } catch (error) {
        if (stopped || signal?.aborted) return

        onError?.(error)
      } finally {
        session?.cancel()
        if (activeSession === session) {
          activeSession = null
        }
      }

      if (stopped || signal?.aborted) return

      try {
        await wait(reconnectMs, signal)
      } catch {
        return
      }
    }
  }

  streamTask = run().catch((error) => {
    log.error(
      '[DappKit] Inventory checkpoint stream task exited unexpectedly:',
      error,
    )
  })

  return async () => {
    stopped = true
    activeSession?.cancel()
    await streamTask
  }
}

export async function subscribeToInventoryEvents({
  eventTypes,
  network = DEFAULT_GRAPHQL_NETWORK,
  onEvents,
  onGap,
  signal,
}: {
  eventTypes: readonly string[]
  network?: string
  onEvents?: InventoryEventBatchHandler
  onGap?: CheckpointGapHandler
  signal?: AbortSignal
}): Promise<EventUnsubscribe> {
  const unsubscribe = createInventoryCheckpointStream({
    eventTypes,
    ...(onEvents !== undefined ? { onEvents } : {}),
    ...(onGap !== undefined ? { onGap } : {}),
    ...(signal !== undefined ? { signal } : {}),
    onError: (error) => {
      log.warn('[DappKit] Inventory checkpoint stream error:', error)
    },
    subscribeCheckpoints: (request) => {
      const abortController = new AbortController()
      const grpcClient = new SuiGrpcClient({
        network,
        baseUrl: getSuiGrpcBaseUrl(network),
      })
      const call = grpcClient.subscriptionService.subscribeCheckpoints(
        {
          readMask: {
            paths: [...request.readMask.paths],
          },
        },
        { abort: abortController.signal },
      )

      return {
        responses: call.responses as AsyncIterable<CheckpointStreamMessage>,
        cancel: () => {
          abortController.abort()
        },
      }
    },
  })

  signal?.addEventListener('abort', () => {
    void unsubscribe()
  })

  return unsubscribe
}
