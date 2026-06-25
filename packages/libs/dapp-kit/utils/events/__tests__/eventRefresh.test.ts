import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Assemblies, type AssemblyType } from '../../../types'
import {
  clearInventoryTypeVolumeM3Cache,
  setInventoryTypeVolumeM3,
} from '../../inventory'
import {
  type CheckpointStreamMessage,
  createInventoryCheckpointStream,
  extractInventoryEventsFromCheckpoint,
} from '../checkpointStream'
import { createEventRefetchScheduler } from '../eventRefresh'
import { getFuelEventType } from '../fuelEventHandlers'
import {
  applyInventoryEventToAssembly,
  getInventoryEventTarget,
  getInventoryEventTypes,
  isRelevantAssemblyInventoryEvent,
} from '../inventoryEventHandlers'

const PACKAGE_ID =
  '0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c'
const ASSEMBLY_OBJECT_ID =
  '0x34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function createStorageAssembly(
  quantity = 20,
): AssemblyType<Assemblies.SmartStorageUnit> {
  return {
    type: Assemblies.SmartStorageUnit,
    storage: {
      mainInventory: {
        capacity: '1000000',
        usedCapacity: '1000',
        items: [
          {
            id: 'existing-item',
            item_id: 'existing-item',
            location: { location_hash: 'main' },
            quantity,
            tenant: 'stillness',
            type_id: 77810,
            name: 'Existing Item',
          },
        ],
      },
      ephemeralInventories: [],
    },
  } as unknown as AssemblyType<Assemblies.SmartStorageUnit>
}

function expectStorageAssembly(
  assembly: AssemblyType<Assemblies> | null,
): AssemblyType<Assemblies.SmartStorageUnit> {
  expect(assembly?.type).toBe(Assemblies.SmartStorageUnit)
  return assembly as AssemblyType<Assemblies.SmartStorageUnit>
}

function createUnsortedStorageAssembly(): AssemblyType<Assemblies.SmartStorageUnit> {
  const assembly = createStorageAssembly()
  assembly.storage.mainInventory.items = [
    {
      id: 'type-88082',
      item_id: 'type-88082',
      location: { location_hash: 'main' },
      quantity: 10,
      tenant: 'stillness',
      type_id: 88082,
      name: 'High Type',
    },
    {
      id: 'type-77810',
      item_id: 'type-77810',
      location: { location_hash: 'main' },
      quantity: 20,
      tenant: 'stillness',
      type_id: 77810,
      name: 'Low Type',
    },
  ]
  return assembly
}

describe('event refresh helpers', () => {
  beforeEach(() => {
    clearInventoryTypeVolumeM3Cache()
  })

  it('subscribes to inventory burn and mint events', () => {
    expect(getInventoryEventTypes(PACKAGE_ID)).toEqual([
      `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      `${PACKAGE_ID}::inventory::ItemMintedEvent`,
    ])
  })

  it('matches inventory events for the selected Sui assembly object id', () => {
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      parsedJson: {
        assembly_id: ASSEMBLY_OBJECT_ID,
        assembly_key: {
          item_id: '1000001842554',
          tenant: 'stillness',
        },
      },
    }

    expect(
      isRelevantAssemblyInventoryEvent(event, {
        objectId: ASSEMBLY_OBJECT_ID,
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
      }),
    ).toBe(true)
  })

  it('matches inventory events for the selected itemId and tenant', () => {
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      parsedJson: {
        assembly_id: ASSEMBLY_OBJECT_ID,
        assembly_key: {
          item_id: '1000001842554',
          tenant: 'stillness',
        },
      },
    }

    expect(
      isRelevantAssemblyInventoryEvent(event, {
        itemId: '1000001842554',
        tenant: 'stillness',
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
      }),
    ).toBe(true)
  })

  it('prefers the loaded assembly object id when building event targets', () => {
    const assembly = createStorageAssembly()
    assembly.id = ASSEMBLY_OBJECT_ID
    assembly.item_id = 1000001842554

    expect(
      getInventoryEventTarget({
        assembly,
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
        isObjectIdDirect: false,
        selectedObjectId: 'wrong-item-id',
        selectedTenant: 'stillness',
      }),
    ).toEqual({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      objectId: ASSEMBLY_OBJECT_ID,
    })
  })

  it('falls back to the assembly item id and tenant when no object id is loaded', () => {
    const assembly = createStorageAssembly()
    assembly.item_id = 1000001842554

    expect(
      getInventoryEventTarget({
        assembly,
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
        isObjectIdDirect: false,
        selectedObjectId: 'selected-item-id',
        selectedTenant: 'stillness',
      }),
    ).toEqual({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      itemId: '1000001842554',
      tenant: 'stillness',
    })
  })

  it('targets the direct object id when no assembly is loaded yet', () => {
    expect(
      getInventoryEventTarget({
        assembly: null,
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
        isObjectIdDirect: true,
        selectedObjectId: ASSEMBLY_OBJECT_ID,
        selectedTenant: 'stillness',
      }),
    ).toEqual({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      objectId: ASSEMBLY_OBJECT_ID,
    })
  })

  it('targets the selected item id and tenant when no assembly is loaded yet', () => {
    expect(
      getInventoryEventTarget({
        assembly: null,
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
        isObjectIdDirect: false,
        selectedObjectId: '1000001842554',
        selectedTenant: 'stillness',
      }),
    ).toEqual({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      itemId: '1000001842554',
      tenant: 'stillness',
    })
  })

  it('matches minted inventory events for deposits', () => {
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      parsedJson: {
        assembly_id: ASSEMBLY_OBJECT_ID,
        assembly_key: {
          item_id: '1000001842554',
          tenant: 'stillness',
        },
        character_id:
          '0xa60609a1b94ffca8ed2daf4963a2b9deffce23de76ef9f3d040d7250edb7b2c7',
        character_key: {
          item_id: '2112077441',
          tenant: 'stillness',
        },
        item_id: '0',
        quantity: 500,
        type_id: '77810',
      },
    }

    expect(
      isRelevantAssemblyInventoryEvent(event, {
        itemId: '1000001842554',
        tenant: 'stillness',
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
      }),
    ).toBe(true)
  })

  it('ignores inventory events for other assemblies or tenants', () => {
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      parsedJson: {
        assembly_id: ASSEMBLY_OBJECT_ID,
        assembly_key: {
          item_id: '1000001842554',
          tenant: 'stillness',
        },
      },
    }

    expect(
      isRelevantAssemblyInventoryEvent(event, {
        itemId: '1000001842554',
        tenant: 'nebula',
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
      }),
    ).toBe(false)
    expect(
      isRelevantAssemblyInventoryEvent(event, {
        objectId: '0x111',
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
      }),
    ).toBe(false)
  })

  it('ignores non-inventory event types', () => {
    const event = {
      type: `${PACKAGE_ID}::storage_unit::SomeOtherEvent`,
      parsedJson: {
        assembly_id: ASSEMBLY_OBJECT_ID,
      },
    }

    expect(
      isRelevantAssemblyInventoryEvent(event, {
        objectId: ASSEMBLY_OBJECT_ID,
        eventTypes: getInventoryEventTypes(PACKAGE_ID),
      }),
    ).toBe(false)
  })

  it('optimistically adds minted item quantities by type id', () => {
    const assembly = createStorageAssembly()
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      parsedJson: {
        quantity: 500,
        type_id: '77810',
      },
    }

    const updated = expectStorageAssembly(
      applyInventoryEventToAssembly(assembly, event),
    )

    expect(updated.storage.mainInventory.items).toEqual([
      expect.objectContaining({ type_id: 77810, quantity: 520 }),
    ])
    expect(assembly.storage.mainInventory.items[0]?.quantity).toBe(20)
  })

  it('optimistically updates used capacity when type volume is cached', () => {
    setInventoryTypeVolumeM3(77810, 0.1)
    const assembly = createStorageAssembly()
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      parsedJson: {
        quantity: 10,
        type_id: '77810',
      },
    }

    const updated = expectStorageAssembly(
      applyInventoryEventToAssembly(assembly, event),
    )

    expect(updated.storage.mainInventory.usedCapacity).toBe('2000')
  })

  it('merges duplicate rows when minting an existing item type', () => {
    const assembly = createStorageAssembly()
    assembly.storage.mainInventory.items = [
      {
        id: 'existing-item',
        item_id: 'existing-item',
        location: { location_hash: 'main' },
        quantity: 20,
        tenant: 'stillness',
        type_id: 77810,
        name: 'Existing Item',
      },
      {
        id: 'optimistic-77810',
        item_id: '0',
        location: { location_hash: '' },
        quantity: 500,
        tenant: 'stillness',
        type_id: 77810,
        name: 'Type 77810',
      },
    ]
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      parsedJson: {
        quantity: 10,
        type_id: '77810',
      },
    }

    const updated = expectStorageAssembly(
      applyInventoryEventToAssembly(assembly, event),
    )

    expect(updated.storage.mainInventory.items).toHaveLength(1)
    expect(updated.storage.mainInventory.items[0]).toEqual(
      expect.objectContaining({
        id: 'existing-item',
        name: 'Existing Item',
        quantity: 530,
        type_id: 77810,
      }),
    )
  })

  it('optimistically subtracts burned item quantities by type id', () => {
    const assembly = createStorageAssembly(20)
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      parsedJson: {
        quantity: 5,
        type_id: '77810',
      },
    }

    const updated = expectStorageAssembly(
      applyInventoryEventToAssembly(assembly, event),
    )

    expect(updated.storage.mainInventory.items).toEqual([
      expect.objectContaining({ type_id: 77810, quantity: 15 }),
    ])
  })

  it('optimistically removes burned item rows when quantity reaches zero', () => {
    const assembly = createStorageAssembly(20)
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      parsedJson: {
        quantity: 20,
        type_id: '77810',
      },
    }

    const updated = expectStorageAssembly(
      applyInventoryEventToAssembly(assembly, event),
    )

    expect(updated.storage.mainInventory.items).toEqual([])
  })

  it('optimistically removes burned item rows when GraphQL item ids are strings', () => {
    const assembly = createStorageAssembly(20)
    assembly.storage.mainInventory.items = [
      {
        id: 'string-item',
        item_id: 'string-item',
        location: { location_hash: 'main' },
        quantity: '20',
        tenant: 'stillness',
        type_id: '77810',
        name: 'String Item',
      },
    ] as unknown as typeof assembly.storage.mainInventory.items
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      parsedJson: {
        quantity: 20,
        type_id: '77810',
      },
    }

    const updated = expectStorageAssembly(
      applyInventoryEventToAssembly(assembly, event),
    )

    expect(updated.storage.mainInventory.items).toEqual([])
  })

  it('optimistically adds a placeholder row for a new minted item type', () => {
    const assembly = createStorageAssembly()
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      parsedJson: {
        assembly_key: {
          item_id: '1000001842554',
          tenant: 'stillness',
        },
        item_id: '0',
        quantity: 500,
        type_id: '88082',
      },
    }

    const updated = expectStorageAssembly(
      applyInventoryEventToAssembly(assembly, event),
    )

    expect(updated.storage.mainInventory.items).toEqual([
      expect.objectContaining({
        item_id: '0',
        quantity: 500,
        tenant: 'stillness',
        type_id: 88082,
        name: 'Type 88082',
      }),
      expect.objectContaining({ type_id: 77810, quantity: 20 }),
    ])
  })

  it('orders optimistically updated inventory rows by quantity', () => {
    const assembly = createUnsortedStorageAssembly()
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      parsedJson: {
        assembly_key: {
          item_id: '1000001842554',
          tenant: 'stillness',
        },
        item_id: '0',
        quantity: 500,
        type_id: '82128',
      },
    }

    const updated = expectStorageAssembly(
      applyInventoryEventToAssembly(assembly, event),
    )

    expect(
      updated.storage.mainInventory.items.map((item) => item.type_id),
    ).toEqual([82128, 77810, 88082])
  })

  it('schedules multiple event-driven refetch attempts', async () => {
    vi.useFakeTimers()
    const refetch = vi.fn().mockResolvedValue(undefined)
    const scheduledRefetch = createEventRefetchScheduler(refetch, [100, 300])

    scheduledRefetch()

    await vi.advanceTimersByTimeAsync(99)
    expect(refetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(refetch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(200)
    expect(refetch).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('reschedules pending event-driven refetch attempts for event bursts', async () => {
    vi.useFakeTimers()
    const refetch = vi.fn().mockResolvedValue(undefined)
    const scheduledRefetch = createEventRefetchScheduler(refetch, [100, 300])

    scheduledRefetch()
    await vi.advanceTimersByTimeAsync(50)
    scheduledRefetch()

    await vi.advanceTimersByTimeAsync(99)
    expect(refetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(refetch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(200)
    expect(refetch).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('streams inventory events without replaying the first checkpoint on startup', async () => {
    const historicalCheckpoint: CheckpointStreamMessage = {
      checkpoint: {
        sequenceNumber: 1,
        transactions: [
          {
            digest: 'old',
            events: {
              events: [
                {
                  eventType: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
                  json: {
                    kind: {
                      oneofKind: 'structValue',
                      structValue: {
                        fields: {
                          assembly_id: {
                            kind: {
                              oneofKind: 'stringValue',
                              stringValue: ASSEMBLY_OBJECT_ID,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    }
    const liveCheckpoint: CheckpointStreamMessage = {
      checkpoint: {
        sequenceNumber: 2,
        transactions: [
          {
            digest: 'new',
            events: {
              events: [
                {
                  eventType: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
                  json: {
                    kind: {
                      oneofKind: 'structValue',
                      structValue: {
                        fields: {
                          assembly_id: {
                            kind: {
                              oneofKind: 'stringValue',
                              stringValue: ASSEMBLY_OBJECT_ID,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    }
    const onEvents = vi.fn()

    let releaseStream: (() => void) | undefined
    const cancel = vi.fn(() => {
      releaseStream?.()
    })

    function subscribeCheckpoints() {
      return {
        responses: (async function* () {
          yield historicalCheckpoint
          yield liveCheckpoint
          await new Promise<void>((resolve) => {
            releaseStream = resolve
          })
        })(),
        cancel,
      }
    }

    const stop = createInventoryCheckpointStream({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      idleMs: 0,
      maxSessionMs: 0,
      onEvents,
      subscribeCheckpoints,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onEvents).toHaveBeenCalledTimes(1)
    expect(onEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        id: { txDigest: 'new', eventSeq: '0' },
        type: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      }),
    ])

    await stop()
  })

  it('delivers inventory events from a checkpoint as one batch', async () => {
    const checkpoint: CheckpointStreamMessage = {
      checkpoint: {
        sequenceNumber: 2,
        transactions: [
          {
            digest: 'new',
            events: {
              events: [
                {
                  eventType: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
                  json: {
                    kind: {
                      oneofKind: 'structValue',
                      structValue: {
                        fields: {
                          assembly_id: {
                            kind: {
                              oneofKind: 'stringValue',
                              stringValue: ASSEMBLY_OBJECT_ID,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  eventType: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
                  json: {
                    kind: {
                      oneofKind: 'structValue',
                      structValue: {
                        fields: {
                          assembly_id: {
                            kind: {
                              oneofKind: 'stringValue',
                              stringValue: ASSEMBLY_OBJECT_ID,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  eventType: `${PACKAGE_ID}::storage_unit::SomeOtherEvent`,
                  json: {
                    kind: {
                      oneofKind: 'structValue',
                      structValue: {
                        fields: {
                          assembly_id: {
                            kind: {
                              oneofKind: 'stringValue',
                              stringValue: ASSEMBLY_OBJECT_ID,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    }
    const onEvents = vi.fn()

    let releaseStream: (() => void) | undefined
    const cancel = vi.fn(() => {
      releaseStream?.()
    })

    function subscribeCheckpoints() {
      return {
        responses: (async function* () {
          yield { checkpoint: { sequenceNumber: 1, transactions: [] } }
          yield checkpoint
          await new Promise<void>((resolve) => {
            releaseStream = resolve
          })
        })(),
        cancel,
      }
    }

    const stop = createInventoryCheckpointStream({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      idleMs: 0,
      maxSessionMs: 0,
      onEvents,
      subscribeCheckpoints,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onEvents).toHaveBeenCalledTimes(1)
    expect(onEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        type: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
      }),
      expect.objectContaining({
        type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      }),
    ])

    await stop()
  })

  it('reconnects after stream errors', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    const onEvents = vi.fn()
    let session = 0

    let releaseStream: (() => void) | undefined

    const stop = createInventoryCheckpointStream({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      reconnectMs: 100,
      idleMs: 0,
      maxSessionMs: 0,
      onError,
      onEvents,
      subscribeCheckpoints: () => {
        session += 1
        if (session === 1) {
          return {
            cancel: vi.fn(),
            responses: (async function* () {
              yield { checkpoint: { sequenceNumber: 1, transactions: [] } }
              throw new Error('network error')
            })(),
          }
        }

        return {
          cancel: vi.fn(() => {
            releaseStream?.()
          }),
          responses: (async function* () {
            yield {
              checkpoint: {
                sequenceNumber: 2,
                transactions: [
                  {
                    digest: 'reconnected',
                    events: {
                      events: [
                        {
                          eventType: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
                          json: {
                            kind: {
                              oneofKind: 'structValue',
                              structValue: {
                                fields: {
                                  assembly_id: {
                                    kind: {
                                      oneofKind: 'stringValue',
                                      stringValue: ASSEMBLY_OBJECT_ID,
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
            await new Promise<void>((resolve) => {
              releaseStream = resolve
            })
          })(),
        }
      },
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(onError).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(100)
    expect(onEvents).toHaveBeenCalledTimes(1)

    await stop()
    vi.useRealTimers()
  })

  it('rotates sessions before the public fullnode stream timeout', async () => {
    vi.useFakeTimers()
    let session = 0
    let releaseStream: (() => void) | undefined

    const stop = createInventoryCheckpointStream({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      maxSessionMs: 100,
      reconnectMs: 50,
      idleMs: 0,
      subscribeCheckpoints: () => {
        session += 1
        return {
          cancel: vi.fn(),
          responses: (async function* () {
            yield { checkpoint: { sequenceNumber: session, transactions: [] } }
            await new Promise<void>((resolve) => {
              releaseStream = resolve
            })
          })(),
        }
      },
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(session).toBe(1)

    await vi.advanceTimersByTimeAsync(100)
    await vi.advanceTimersByTimeAsync(50)
    expect(session).toBe(2)

    releaseStream?.()
    await stop()
    vi.useRealTimers()
  })

  it('reconnects when a checkpoint read goes idle', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    let session = 0
    let releaseStream: (() => void) | undefined

    const stop = createInventoryCheckpointStream({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      idleMs: 100,
      maxSessionMs: 0,
      reconnectMs: 50,
      onError,
      subscribeCheckpoints: () => {
        session += 1
        return {
          cancel: vi.fn(),
          responses: (async function* () {
            yield {
              checkpoint: {
                sequenceNumber: session === 1 ? 1 : 3,
                transactions: [],
              },
            }
            if (session === 1) {
              yield { checkpoint: { sequenceNumber: 2, transactions: [] } }
            }
            await new Promise<void>((resolve) => {
              releaseStream = resolve
            })
          })(),
        }
      },
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(onError).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(50)
    expect(session).toBe(2)

    releaseStream?.()
    await stop()
    vi.useRealTimers()
  })

  it('backfills through onGap when checkpoint sequence jumps', async () => {
    const onGap = vi.fn()
    const onEvents = vi.fn()
    const checkpoint: CheckpointStreamMessage = {
      checkpoint: {
        sequenceNumber: 5,
        transactions: [
          {
            digest: 'gap',
            events: {
              events: [
                {
                  eventType: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
                  json: {
                    kind: {
                      oneofKind: 'structValue',
                      structValue: {
                        fields: {
                          assembly_id: {
                            kind: {
                              oneofKind: 'stringValue',
                              stringValue: ASSEMBLY_OBJECT_ID,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    }

    let releaseStream: (() => void) | undefined
    const cancel = vi.fn(() => {
      releaseStream?.()
    })

    const stop = createInventoryCheckpointStream({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      idleMs: 0,
      maxSessionMs: 0,
      reconnectMs: 0,
      onGap,
      onEvents,
      subscribeCheckpoints: () => ({
        cancel,
        responses: (async function* () {
          yield { checkpoint: { sequenceNumber: 1, transactions: [] } }
          yield checkpoint
          await new Promise<void>((resolve) => {
            releaseStream = resolve
          })
        })(),
      }),
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onGap).toHaveBeenCalledWith(1, 5)
    expect(onEvents).toHaveBeenCalledTimes(1)

    releaseStream?.()
    await stop()
  })

  it('deduplicates inventory events across reconnects', async () => {
    const onEvents = vi.fn()
    const checkpoint: CheckpointStreamMessage = {
      checkpoint: {
        sequenceNumber: 2,
        transactions: [
          {
            digest: 'shared',
            events: {
              events: [
                {
                  eventType: `${PACKAGE_ID}::inventory::ItemBurnedEvent`,
                  json: {
                    kind: {
                      oneofKind: 'structValue',
                      structValue: {
                        fields: {
                          assembly_id: {
                            kind: {
                              oneofKind: 'stringValue',
                              stringValue: ASSEMBLY_OBJECT_ID,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    }

    let releaseStream: (() => void) | undefined
    const cancel = vi.fn(() => {
      releaseStream?.()
    })

    let session = 0
    const stop = createInventoryCheckpointStream({
      eventTypes: getInventoryEventTypes(PACKAGE_ID),
      idleMs: 0,
      maxSessionMs: 0,
      reconnectMs: 0,
      onEvents,
      subscribeCheckpoints: () => {
        session += 1
        return {
          cancel,
          responses: (async function* () {
            if (session === 1) {
              yield { checkpoint: { sequenceNumber: 1, transactions: [] } }
              yield checkpoint
              return
            }
            yield { checkpoint: { sequenceNumber: 3, transactions: [] } }
            yield checkpoint
            await new Promise<void>((resolve) => {
              releaseStream = resolve
            })
          })(),
        }
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onEvents).toHaveBeenCalledTimes(1)

    releaseStream?.()
    await stop()
  })

  it('extracts inventory events from checkpoint transactions', () => {
    const events = extractInventoryEventsFromCheckpoint(
      {
        transactions: [
          {
            digest: 'abc123',
            events: {
              events: [
                {
                  eventType: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
                  json: {
                    kind: {
                      oneofKind: 'structValue',
                      structValue: {
                        fields: {
                          quantity: {
                            kind: {
                              oneofKind: 'numberValue',
                              numberValue: 500,
                            },
                          },
                          type_id: {
                            kind: {
                              oneofKind: 'stringValue',
                              stringValue: '77810',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      getInventoryEventTypes(PACKAGE_ID),
    )

    expect(events).toEqual([
      {
        id: { txDigest: 'abc123', eventSeq: '0' },
        type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
        parsedJson: {
          quantity: 500,
          type_id: '77810',
        },
      },
    ])
  })

  it('extracts inventory events from gRPC BCS bytes when json is absent', () => {
    const events = extractInventoryEventsFromCheckpoint(
      {
        transactions: [
          {
            digest: 'abc123',
            events: {
              events: [
                {
                  eventType: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
                  contents: {
                    value: hexToBytes(
                      '34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b7a2dc1d4e8000000097374696c6c6e657373a60609a1b94ffca8ed2daf4963a2b9deffce23de76ef9f3d040d7250edb7b2c781bee37d00000000097374696c6c6e6573730000000000000000f22f010000000000f4010000',
                    ),
                  },
                },
              ],
            },
          },
        ],
      },
      getInventoryEventTypes(PACKAGE_ID),
    )

    expect(events).toEqual([
      {
        id: { txDigest: 'abc123', eventSeq: '0' },
        type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
        parsedJson: {
          assembly_id:
            '0x34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b',
          assembly_key: {
            item_id: '1000001842554',
            tenant: 'stillness',
          },
          character_id:
            '0xa60609a1b94ffca8ed2daf4963a2b9deffce23de76ef9f3d040d7250edb7b2c7',
          character_key: {
            item_id: '2112077441',
            tenant: 'stillness',
          },
          item_id: '0',
          quantity: 500,
          type_id: '77810',
        },
      },
    ])
  })

  it('extracts fuel events from gRPC BCS bytes when json is absent', () => {
    // Manually constructed FuelEvent BCS: assembly_id 0x34d0...951b,
    // assembly_key { item_id: 1, tenant: "stillness" }, type_id: 77810,
    // old_quantity: 10, new_quantity: 5, is_burning: false, action: WITHDRAWN
    const FUEL_EVENT_BCS_HEX =
      '34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b' +
      '0100000000000000' +
      '09' +
      '7374696c6c6e657373' +
      'f22f010000000000' +
      '0a00000000000000' +
      '0500000000000000' +
      '00' +
      '01'

    const events = extractInventoryEventsFromCheckpoint(
      {
        transactions: [
          {
            digest: 'abc123',
            events: {
              events: [
                {
                  eventType: getFuelEventType(PACKAGE_ID),
                  contents: {
                    value: hexToBytes(FUEL_EVENT_BCS_HEX),
                  },
                },
              ],
            },
          },
        ],
      },
      [getFuelEventType(PACKAGE_ID)],
    )

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe(getFuelEventType(PACKAGE_ID))
    expect(events[0].parsedJson).toMatchObject({
      assembly_id: ASSEMBLY_OBJECT_ID,
      assembly_key: { item_id: '1', tenant: 'stillness' },
      type_id: '77810',
      old_quantity: '10',
      new_quantity: '5',
      is_burning: false,
    })
  })
})
