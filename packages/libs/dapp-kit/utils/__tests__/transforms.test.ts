import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../graphql', () => ({
  getObjectWithJson: vi.fn(),
}))

vi.mock('../config', () => ({
  getEnergyConfig: vi.fn(),
  getEnergyUsageForType: vi.fn(),
}))

vi.mock('../datahub', () => ({
  getDatahubGameInfo: vi.fn(),
}))

import { getObjectWithJson } from '../../graphql'
import type {
  CharacterInfo,
  DynamicFieldNode,
  MoveObjectData,
} from '../../graphql/types'
import {
  Assemblies,
  type DatahubGameInfo,
  type InventoryItem,
  State,
} from '../../types'
import { getEnergyConfig, getEnergyUsageForType } from '../config'
import { getDatahubGameInfo } from '../datahub'
import { transformToAssembly, transformToCharacter } from '../transforms'

// ============================================================================
// Test helpers
// ============================================================================

/** Minimal CharacterInfo fixture */
function makeCharacter(overrides: Partial<CharacterInfo> = {}): CharacterInfo {
  return {
    id: '0xchar1',
    address: '0xcharaddr',
    name: 'Alpha',
    tribeId: 7,
    characterId: 42,
    ...overrides,
  }
}

/** Build a MoveObjectData fixture. */
function makeMoveObject(
  json: Record<string, unknown>,
  typeRepr: string,
  dynamicFields?: DynamicFieldNode[],
): MoveObjectData {
  return {
    contents: {
      json,
      type: { repr: typeRepr },
    },
    ...(dynamicFields ? { dynamicFields: { nodes: dynamicFields } } : {}),
  }
}

/** Minimal raw assembly JSON that satisfies the base transform. */
function makeRawJson(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: '0xobj1',
    type_id: '77917',
    key: { item_id: '999', tenant: 'tauceti' },
    metadata: { name: 'MyUnit', description: 'Desc', url: 'https://x.com' },
    status: { status: { '@variant': 'ONLINE' } },
    ...overrides,
  }
}

const SSU_TYPE = '0xpkg::storage_unit::StorageUnit'
const TURRET_TYPE = '0xpkg::turret::Turret'
const GATE_TYPE = '0xpkg::gate::Gate'
const NODE_TYPE = '0xpkg::network_node::NetworkNode'
const DEFAULT_TYPE = '0xpkg::assembly::Assembly'

const datahubInfo: DatahubGameInfo = {
  id: 77917,
  name: 'Smart Storage Unit',
  description: 'A deployable storage assembly',
  mass: 0,
  radius: 0,
  volume: 0,
  portionSize: 1,
  groupName: 'Structures',
  groupId: 0,
  categoryName: 'Deployables',
  categoryId: 0,
  iconUrl: 'https://example.com/icon.png',
}

// ============================================================================
// Setup / teardown
// ============================================================================

beforeEach(() => {
  vi.stubEnv(
    'VITE_EVE_WORLD_PACKAGE_ID',
    '0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107',
  )
  vi.mocked(getEnergyUsageForType).mockResolvedValue(0)
  vi.mocked(getEnergyConfig).mockResolvedValue({})
  vi.mocked(getDatahubGameInfo).mockResolvedValue(datahubInfo)
  vi.mocked(getObjectWithJson).mockResolvedValue({})
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

// ============================================================================
// transformToCharacter
// ============================================================================

describe('transformToCharacter', () => {
  it('maps id, address, name, and tribeId from CharacterInfo', () => {
    const char = makeCharacter()
    const result = transformToCharacter(char)
    expect(result.id).toBe(char.id)
    expect(result.address).toBe(char.address)
    expect(result.name).toBe(char.name)
    expect(result.tribeId).toBe(char.tribeId)
  })

  it('always sets smartAssemblies to an empty array', () => {
    expect(transformToCharacter(makeCharacter()).smartAssemblies).toEqual([])
  })

  it('always sets portrait to an empty string', () => {
    expect(transformToCharacter(makeCharacter()).portrait).toBe('')
  })
})

// ============================================================================
// transformToAssembly — null case
// ============================================================================

describe('transformToAssembly — null contents', () => {
  it('returns null when contents.json is undefined', async () => {
    const moveObj: MoveObjectData = {
      contents: { type: { repr: SSU_TYPE } },
    }
    const result = await transformToAssembly('0x1', moveObj)
    expect(result).toBeNull()
  })
})

// ============================================================================
// transformToAssembly — SmartStorageUnit
// ============================================================================

describe('transformToAssembly — SmartStorageUnit', () => {
  it('includes storage module with inventory data when dynamic field is present', async () => {
    const inventoryKey = 'inv_key_1'
    const inventoryDynField: DynamicFieldNode = {
      name: { json: inventoryKey, type: { repr: '0x::String' } },
      contents: {
        json: {
          key: inventoryKey,
          value: {
            max_capacity: '1000',
            used_capacity: '250',
            items: {
              contents: [
                { key: 'item1', value: { id: '0xitem', quantity: 5 } },
              ],
            },
          },
        },
        type: { layout: '' },
      },
    }

    const rawJson = makeRawJson({ inventory_keys: [inventoryKey] })
    const moveObj = makeMoveObject(rawJson, SSU_TYPE, [inventoryDynField])

    const result = (await transformToAssembly('0x1', moveObj)) as Extract<
      Awaited<ReturnType<typeof transformToAssembly>>,
      { type: Assemblies.SmartStorageUnit }
    >

    expect(result?.type).toBe(Assemblies.SmartStorageUnit)
    expect(result?.storage.mainInventory.capacity).toBe('1000')
    expect(result?.storage.mainInventory.usedCapacity).toBe('250')
    expect(result?.storage.mainInventory.items).toHaveLength(1)
  })

  it('includes storage module with undefined capacity when dynamic field is missing', async () => {
    const moveObj = makeMoveObject(
      makeRawJson({ inventory_keys: ['missing_key'] }),
      SSU_TYPE,
    )

    const result = (await transformToAssembly('0x1', moveObj)) as Extract<
      Awaited<ReturnType<typeof transformToAssembly>>,
      { type: Assemblies.SmartStorageUnit }
    >

    expect(result?.type).toBe(Assemblies.SmartStorageUnit)
    expect(result?.storage.mainInventory.capacity).toBeUndefined()
    expect(result?.storage.mainInventory.usedCapacity).toBeUndefined()
  })

  it('orders storage inventory items by quantity from GraphQL data', async () => {
    function createInventoryItem(
      typeId: number,
      quantity: number,
    ): InventoryItem {
      return {
        id: `item-${typeId}`,
        item_id: `item-${typeId}`,
        location: { location_hash: 'main' },
        name: `Item ${typeId}`,
        quantity,
        tenant: 'stillness',
        type_id: typeId,
      }
    }

    const inventoryKey = 'main-inventory'
    const inventoryDynField: DynamicFieldNode = {
      name: { json: inventoryKey, type: { repr: '0x::String' } },
      contents: {
        json: {
          key: inventoryKey,
          value: {
            max_capacity: '1000000',
            used_capacity: '1000',
            items: {
              contents: [
                { key: 'low', value: createInventoryItem(77810, 20) },
                { key: 'high', value: createInventoryItem(82128, 500) },
                { key: 'mid', value: createInventoryItem(88082, 50) },
              ],
            },
          },
        },
        type: { layout: '' },
      },
    }

    const moveObj = makeMoveObject(
      makeRawJson({ inventory_keys: [inventoryKey] }),
      SSU_TYPE,
      [inventoryDynField],
    )

    const result = (await transformToAssembly('0x1', moveObj)) as Extract<
      Awaited<ReturnType<typeof transformToAssembly>>,
      { type: Assemblies.SmartStorageUnit }
    >

    expect(
      result?.storage.mainInventory.items.map((item) => item.type_id),
    ).toEqual([82128, 88082, 77810])
  })
})

// ============================================================================
// transformToAssembly — SmartTurret
// ============================================================================

describe('transformToAssembly — SmartTurret', () => {
  it('returns type SmartTurret with an empty turret object', async () => {
    const moveObj = makeMoveObject(makeRawJson(), TURRET_TYPE)
    const result = await transformToAssembly('0x1', moveObj)
    expect(result?.type).toBe(Assemblies.SmartTurret)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).turret).toEqual({})
  })
})

// ============================================================================
// transformToAssembly — SmartGate
// ============================================================================

describe('transformToAssembly — SmartGate', () => {
  it('sets gate.destinationId and gate.destinationGate from options', async () => {
    const rawJson = makeRawJson({ linked_gate_id: '0xlinked' })
    const moveObj = makeMoveObject(rawJson, GATE_TYPE)
    const destGateData = { id: '0xdest', type_id: '83907' }

    const result = await transformToAssembly('0x1', moveObj, {
      destinationGate: destGateData as never,
    })

    expect(result?.type).toBe(Assemblies.SmartGate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gate = (result as any).gate
    expect(gate.destinationId).toBe('0xlinked')
    expect(gate.destinationGate).toBe(destGateData)
  })
})

// ============================================================================
// transformToAssembly — NetworkNode
// ============================================================================

describe('transformToAssembly — NetworkNode', () => {
  it('calls getObjectWithJson for each connected assembly and getDatahubGameInfo per type', async () => {
    vi.mocked(getEnergyConfig).mockResolvedValue({ 88092: 100 })
    vi.mocked(getObjectWithJson).mockResolvedValue({
      data: {
        object: {
          address: '0xlinked',
          version: 1,
          digest: '',
          asMoveObject: {
            contents: {
              json: {
                id: '0xlinked',
                type_id: '88092',
                key: { item_id: '50', tenant: 'tauceti' },
                metadata: { name: 'Node2' },
                status: { status: { '@variant': 'ONLINE' } },
              },
              type: { repr: NODE_TYPE },
              bcs: '',
            },
          },
        },
      },
    } as never)

    const rawJson = makeRawJson({
      type_id: '88092',
      connected_assembly_ids: ['0xlinked'],
      fuel: {
        burn_rate_in_ms: '5000',
        burn_start_time: '100',
        is_burning: true,
        last_updated: '200',
        max_capacity: '9999',
        previous_cycle_elapsed_time: '50',
        quantity: '300',
        type_id: '79193',
        unit_volume: '1',
      },
      energy_source: {
        current_energy_production: '400',
        max_energy_production: '1000',
        total_reserved_energy: '200',
      },
    })

    const moveObj = makeMoveObject(rawJson, NODE_TYPE)
    const result = await transformToAssembly('0x1', moveObj)

    expect(result?.type).toBe(Assemblies.NetworkNode)
    expect(getObjectWithJson).toHaveBeenCalledWith('0xlinked')
    expect(getDatahubGameInfo).toHaveBeenCalled()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nn = (result as any).networkNode
    expect(nn.fuel.burnTimeInMs).toBe(5000)
    expect(nn.fuel.burnStartTime).toBe(100)
    expect(nn.fuel.isBurning).toBe(true)
    expect(nn.fuel.lastUpdated).toBe(200)
    expect(nn.fuel.maxCapacity).toBe(9999)
    expect(nn.fuel.previousCycleElapsedTime).toBe(50)
    expect(nn.fuel.quantity).toBe(300)
    expect(nn.fuel.typeId).toBe(79193)
    expect(nn.fuel.unitVolume).toBe(1)
    expect(nn.energyProduction).toBe(400)
    expect(nn.energyMaxCapacity).toBe(1000)
    expect(nn.totalReservedEnergy).toBe(200)
    expect(nn.linkedAssemblies).toHaveLength(1)
  })
})

// ============================================================================
// transformToAssembly — Default (Assembly)
// ============================================================================

describe('transformToAssembly — Default / Assembly', () => {
  it('returns base object only with type Assembly for an unknown type repr', async () => {
    const moveObj = makeMoveObject(makeRawJson(), DEFAULT_TYPE)
    const result = await transformToAssembly('0x1', moveObj)
    expect(result?.type).toBe(Assemblies.Assembly)
    // No extra module keys
    const r = result as unknown as {
      storage?: unknown
      turret?: unknown
      gate?: unknown
      networkNode?: unknown
    }
    expect(r.storage).toBeUndefined()
    expect(r.turret).toBeUndefined()
    expect(r.gate).toBeUndefined()
    expect(r.networkNode).toBeUndefined()
  })

  it('maps base fields: id, item_id, name, description, state, type', async () => {
    const moveObj = makeMoveObject(makeRawJson(), DEFAULT_TYPE)
    const result = await transformToAssembly('0x1', moveObj)
    expect(result?.id).toBe('0xobj1')
    expect(result?.item_id).toBe(999)
    expect(result?.name).toBe('MyUnit')
    expect(result?.description).toBe('Desc')
    expect(result?.state).toBe(State.ONLINE)
  })
})
