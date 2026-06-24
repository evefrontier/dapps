import { describe, expect, it } from 'vitest'
import { Assemblies, type AssemblyType } from '../../../types'
import {
  applyFuelEventToAssembly,
  getFuelEventTarget,
  getFuelEventType,
  isRelevantFuelEvent,
} from '../fuelEventHandlers'

const PACKAGE_ID =
  '0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c'
const NODE_OBJECT_ID =
  '0x34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b'
const OTHER_OBJECT_ID =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

const FUEL_EVENT_TYPE = `${PACKAGE_ID}::fuel::FuelEvent`

function createNetworkNodeAssembly(
  quantity = 10,
  isBurning = false,
): AssemblyType<Assemblies.NetworkNode> {
  return {
    type: Assemblies.NetworkNode,
    id: NODE_OBJECT_ID,
    networkNode: {
      fuel: {
        quantity,
        isBurning,
        burnTimeInMs: 60_000,
        burnStartTime: 0,
        lastUpdated: 0,
        maxCapacity: 100,
        previousCycleElapsedTime: 0,
        unitVolume: 1,
        typeId: 77810,
      },
      energyProduction: 0,
      energyMaxCapacity: 0,
      totalReservedEnergy: 0,
      linkedAssemblies: [],
    },
  } as unknown as AssemblyType<Assemblies.NetworkNode>
}

function createFuelEvent(
  assemblyId: string,
  newQuantity: number,
  isBurning: boolean,
) {
  return {
    type: FUEL_EVENT_TYPE,
    parsedJson: {
      assembly_id: assemblyId,
      assembly_key: { item_id: '1', tenant: 'stillness' },
      type_id: '77810',
      old_quantity: '10',
      new_quantity: String(newQuantity),
      is_burning: isBurning,
      action: 0,
    },
  }
}

describe('getFuelEventType', () => {
  it('returns the correct event type string', () => {
    expect(getFuelEventType(PACKAGE_ID)).toBe(`${PACKAGE_ID}::fuel::FuelEvent`)
  })
})

describe('getFuelEventTarget', () => {
  it('returns target for a NetworkNode assembly', () => {
    const assembly = createNetworkNodeAssembly()
    const target = getFuelEventTarget(assembly, [FUEL_EVENT_TYPE])
    expect(target).toEqual({
      eventTypes: [FUEL_EVENT_TYPE],
      objectId: NODE_OBJECT_ID,
    })
  })

  it('returns null for a non-NetworkNode assembly', () => {
    const assembly = {
      type: Assemblies.SmartStorageUnit,
      id: NODE_OBJECT_ID,
    } as unknown as AssemblyType<Assemblies>
    expect(getFuelEventTarget(assembly, [FUEL_EVENT_TYPE])).toBeNull()
  })

  it('returns null for null assembly', () => {
    expect(getFuelEventTarget(null, [FUEL_EVENT_TYPE])).toBeNull()
  })
})

describe('isRelevantFuelEvent', () => {
  const target = { eventTypes: [FUEL_EVENT_TYPE], objectId: NODE_OBJECT_ID }

  it('matches an event for the correct assembly', () => {
    const event = createFuelEvent(NODE_OBJECT_ID, 5, false)
    expect(isRelevantFuelEvent(event, target)).toBe(true)
  })

  it('rejects an event for a different assembly', () => {
    const event = createFuelEvent(OTHER_OBJECT_ID, 5, false)
    expect(isRelevantFuelEvent(event, target)).toBe(false)
  })

  it('rejects an event with a different type', () => {
    const event = {
      type: `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      parsedJson: { assembly_id: NODE_OBJECT_ID },
    }
    expect(isRelevantFuelEvent(event, target)).toBe(false)
  })

  it('matches case-insensitively on assembly_id', () => {
    const event = createFuelEvent(NODE_OBJECT_ID.toUpperCase(), 5, false)
    expect(isRelevantFuelEvent(event, target)).toBe(true)
  })
})

describe('applyFuelEventToAssembly', () => {
  it('updates quantity and isBurning from the event', () => {
    const assembly = createNetworkNodeAssembly(10, false)
    const event = createFuelEvent(NODE_OBJECT_ID, 15, true)

    const result = applyFuelEventToAssembly(assembly, event)

    expect(result?.type).toBe(Assemblies.NetworkNode)
    if (result?.type !== Assemblies.NetworkNode) return

    expect(result.networkNode.fuel.quantity).toBe(15)
    expect(result.networkNode.fuel.isBurning).toBe(true)
  })

  it('reflects a burn event reducing quantity to zero', () => {
    const assembly = createNetworkNodeAssembly(1, true)
    const event = createFuelEvent(NODE_OBJECT_ID, 0, false)

    const result = applyFuelEventToAssembly(assembly, event)

    if (result?.type !== Assemblies.NetworkNode) return
    expect(result.networkNode.fuel.quantity).toBe(0)
    expect(result.networkNode.fuel.isBurning).toBe(false)
  })

  it('preserves other fuel fields unchanged', () => {
    const assembly = createNetworkNodeAssembly()
    const event = createFuelEvent(NODE_OBJECT_ID, 5, false)

    const result = applyFuelEventToAssembly(assembly, event)

    if (result?.type !== Assemblies.NetworkNode) return
    expect(result.networkNode.fuel.burnTimeInMs).toBe(60_000)
    expect(result.networkNode.fuel.typeId).toBe(77810)
  })

  it('is a no-op for non-NetworkNode assemblies', () => {
    const assembly = {
      type: Assemblies.SmartStorageUnit,
      id: NODE_OBJECT_ID,
    } as unknown as AssemblyType<Assemblies>
    const event = createFuelEvent(NODE_OBJECT_ID, 5, false)

    expect(applyFuelEventToAssembly(assembly, event)).toBe(assembly)
  })

  it('is a no-op for null assembly', () => {
    const event = createFuelEvent(NODE_OBJECT_ID, 5, false)
    expect(applyFuelEventToAssembly(null, event)).toBeNull()
  })

  it('is a no-op when new_quantity is missing', () => {
    const assembly = createNetworkNodeAssembly(10, false)
    const event = {
      type: FUEL_EVENT_TYPE,
      parsedJson: { assembly_id: NODE_OBJECT_ID },
    }
    expect(applyFuelEventToAssembly(assembly, event)).toBe(assembly)
  })
})
