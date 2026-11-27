import { describe, expect, it } from 'vitest'
import {
  ENTITY_EVENT_NAMES,
  entityEventMatcher,
  entityEventTypes,
  isEventForEntity,
} from '../entityEvents'
import { deriveEventFilters, type StreamEvent } from '../graphqlEventStream'

const INVENTORY = `0x${'1'.repeat(64)}`
const POWER = `0x${'2'.repeat(64)}`
const UPGRADED_POWER = `0x${'3'.repeat(64)}`
const ENTITY =
  '0x227b6c65c26044a03f1cfc358cb2db1da6e6d21f9c323b9be26095c84307af83'

const packageIds = (pkg: 'inventory' | 'power') =>
  pkg === 'inventory' ? INVENTORY : POWER
const TYPES = entityEventTypes(undefined, packageIds)

const event = (type: string, json: Record<string, unknown>): StreamEvent => ({
  id: { txDigest: 'tx', eventSeq: '0' },
  type,
  parsedJson: json,
})

describe('entityEventTypes', () => {
  it('names every inventory and power event under its package', () => {
    expect(TYPES).toHaveLength(
      ENTITY_EVENT_NAMES.inventory.length + ENTITY_EVENT_NAMES.power.length,
    )
    expect(TYPES).toContain(`${INVENTORY}::item::ItemsDeposited`)
    expect(TYPES).toContain(`${INVENTORY}::inventory::InventoryMigrated`)
    expect(TYPES).toContain(`${POWER}::power_grid::PowerToggled`)
    expect(TYPES).toContain(`${POWER}::grid_fuel::FuelAdded`)
  })

  it('needs one subscription per package', () => {
    expect(deriveEventFilters(TYPES)).toEqual([
      { type: INVENTORY },
      { type: POWER },
    ])
  })

  it('passes the tenant to the package resolver', () => {
    const tenants: (string | undefined)[] = []
    entityEventTypes('stillness', (pkg, tenant) => {
      tenants.push(tenant)
      return packageIds(pkg)
    })
    expect(tenants).toEqual(['stillness', 'stillness'])
  })
})

describe('entityEventMatcher', () => {
  const isTracked = entityEventMatcher(TYPES)

  it('matches the tracked types', () => {
    expect(isTracked(`${POWER}::power_grid::DrawChanged`)).toBe(true)
  })

  it('matches a tracked module::Struct from an upgraded package', () => {
    expect(isTracked(`${UPGRADED_POWER}::grid_fuel::FuelAdded`)).toBe(true)
  })

  it('ignores untracked events', () => {
    expect(isTracked(`${INVENTORY}::item::ItemTransferred`)).toBe(false)
    expect(isTracked(`${POWER}::fuel::Fuel`)).toBe(false)
  })
})

describe('isEventForEntity', () => {
  it("matches the entity's own events", () => {
    expect(
      isEventForEntity(
        event(`${INVENTORY}::item::ItemsDeposited`, { entity_id: ENTITY }),
        ENTITY,
      ),
    ).toBe(true)
  })

  it('compares ids however they are padded or cased', () => {
    expect(
      isEventForEntity(
        event(`${POWER}::power_grid::PowerToggled`, { entity_id: '0x0abc' }),
        '0xABC',
      ),
    ).toBe(true)
  })

  it('matches either side of an inventory migration', () => {
    const migrated = (from: string, to: string) =>
      event(`${INVENTORY}::inventory::InventoryMigrated`, {
        from_entity_id: from,
        to_entity_id: to,
      })
    expect(isEventForEntity(migrated(ENTITY, '0x9'), ENTITY)).toBe(true)
    expect(isEventForEntity(migrated('0x9', ENTITY), ENTITY)).toBe(true)
    expect(isEventForEntity(migrated('0x8', '0x9'), ENTITY)).toBe(false)
  })

  it("ignores other entities' events and events without an entity", () => {
    expect(
      isEventForEntity(
        event(`${INVENTORY}::item::ItemsDeposited`, { entity_id: '0x9' }),
        ENTITY,
      ),
    ).toBe(false)
    expect(
      isEventForEntity(
        event(`${INVENTORY}::item::ItemsDeposited`, { quantity: '1' }),
        ENTITY,
      ),
    ).toBe(false)
    expect(
      isEventForEntity(
        event(`${INVENTORY}::item::ItemsDeposited`, { entity_id: 'not-an-id' }),
        ENTITY,
      ),
    ).toBe(false)
  })
})
