import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RawEntity } from '../entity'
import { fetchEntity, fetchEntityOwner, isEntity, parseEntity } from '../entity'
import testnetEntity from './fixtures/entity.testnet.json'

// Real GetEntity response for a dev-deployment entity on testnet
const ENTITY_ID =
  '0x08c7bf9636c37ecff92482a62340e5a1a2e8561da687a1c0a6e97758e67ae331'
const PKG = '0x0a4f1548929e834800da94990c419bc1ca63a836eeed517aada08788e2f00bca'

// ============================================================================
// Fetch mock helpers
// ============================================================================

type Responder = (variables: Record<string, unknown>) => unknown

/** Stubs fetch, answering each GraphQL operation by its name. */
function mockGraphql(responders: Record<string, Responder>) {
  const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
    const { query, variables } = JSON.parse(init.body)
    const operation = Object.keys(responders).find((name) =>
      query.includes(`query ${name}(`),
    )
    if (!operation) throw new Error(`Unexpected query: ${query}`)
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(responders[operation]!(variables)),
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const page = (nodes: unknown[], endCursor: string | null = null) => ({
  pageInfo: { hasNextPage: endCursor !== null, endCursor },
  nodes,
})

const tableRef = (nodes: unknown[], endCursor: string | null = null) => ({
  asAddress: { addressAt: { dynamicFields: page(nodes, endCursor) } },
})

function componentNode(
  id: string,
  kind: string,
  inner: unknown,
  extra: { name?: string | null; sections?: unknown; items?: unknown } = {},
) {
  return {
    contents: {
      name: {
        type: { repr: `${PKG}::entity::ComponentKey` },
        json: { pos0: id },
      },
      value: {
        type: { repr: `${PKG}::component::Component<0xabc::${kind}>` },
        json: { version: '1', inner, name: extra.name ?? null },
        sections: extra.sections ?? null,
        items: extra.items ?? null,
      },
    },
  }
}

function entityResponse(
  id: string,
  nodes: unknown[],
  endCursor: string | null = null,
  json: Record<string, unknown> = {},
) {
  return {
    data: {
      latestVersion: { nodes: [{ version: 7 }] },
      object: {
        asMoveObject: {
          contents: {
            type: { repr: `${PKG}::entity::Entity` },
            json: {
              id,
              version: '1',
              key: { id: '42', tenant: 'test' },
              access_cap_id: null,
              component_ids: { contents: [] },
              ...json,
            },
          },
        },
        dynamicFields: page(nodes, endCursor),
      },
    },
  }
}

const NO_OBJECT = { data: { latestVersion: { nodes: [] }, object: null } }

afterEach(() => {
  vi.unstubAllGlobals()
})

// ============================================================================
// fetchEntity + parseEntity on a real entity
// ============================================================================

describe('parseEntity (testnet entity)', () => {
  async function loadFixture() {
    mockGraphql({ GetEntity: () => testnetEntity })
    const raw = await fetchEntity(ENTITY_ID)
    if (!raw) throw new Error('fixture did not load')
    return raw
  }

  it('reads the entity fields', async () => {
    const raw = await loadFixture()

    expect(isEntity(raw)).toBe(true)
    const entity = parseEntity(raw)
    expect(entity.id).toBe(ENTITY_ID)
    expect(entity.version).toBe(1084995310)
    expect(entity.key).toEqual({
      id: '1000000070926',
      tenant: 'johannk-ws-ccp',
    })
    expect(entity.accessCapId).toBe(
      '0x7997908a376886909d250525b9c038be1a35cbbb1d1c689013d09ee1d21de219',
    )
    expect(entity.inFlight).toBe(false)
    expect(entity.metadata).toBeNull()
    expect(entity.identity).toBeNull()
  })

  it('lists every component with its kind', async () => {
    const entity = parseEntity(await loadFixture())

    expect(entity.components).toHaveLength(10)
    const kinds = entity.components.map((c) => c.kind).sort()
    expect(kinds).toEqual([
      'fuel::Fuel',
      'generator::Generator',
      'generic_module::GenericModule',
      'generic_module::GenericModule',
      'generic_module::GenericModule',
      'generic_module::GenericModule',
      'generic_module::GenericModule',
      'inventory::Inventory',
      'layout::Layout',
      'power_grid::PowerGrid',
    ])
    expect(entity.genericModules).toHaveLength(5)
    expect(entity.genericModules[0]?.typeId).toBe('97517')
  })

  it('parses the layout sections in layout order', async () => {
    const entity = parseEntity(await loadFixture())

    expect(entity.layout).toEqual({
      shellId: null,
      sections: [
        {
          id: '1000000070927',
          moduleIds: [
            '1000000070928',
            '1000000070929',
            '1000000070930',
            '1000000070931',
            '1000000070932',
            '1000000070960',
            '1000000070968',
          ],
        },
        { id: '1000000070964', moduleIds: ['1000000070965'] },
      ],
    })
  })

  it('parses the power grid', async () => {
    const { powerGrid } = parseEntity(await loadFixture())

    expect(powerGrid?.on).toBe(false)
    expect(powerGrid?.fuelCapacity).toBe('10000000')
    expect(powerGrid?.fuelImpulse).toBe('0')
    expect(powerGrid?.fuelContainmentBurden).toBe('0')
    expect(Object.keys(powerGrid?.modules ?? {})).toHaveLength(6)
    expect(powerGrid?.modules['1000000070932']).toEqual({
      desiredOnline: false,
      activeDraw: '0',
      powerReq: '12000',
      drawKind: 'Elastic',
      priority: '0',
      lineLoss: '0',
    })
    expect(
      Object.values(powerGrid?.modules ?? {}).map((m) => m.drawKind),
    ).toEqual(['Firm', 'Firm', 'Elastic', 'Firm', 'Firm', 'Firm'])
    expect(powerGrid?.generators).toEqual({
      '1000000070929': {
        online: false,
        maxOutputMw: '150000',
        containmentReduction: '100000',
        baseFuelRate: '10000',
      },
    })
    expect(powerGrid?.fuelSources).toEqual({ '1000000070931': '10000000' })
  })

  it('parses the empty inventory and action names', async () => {
    const entity = parseEntity(await loadFixture())

    expect(entity.inventories).toEqual([
      {
        componentId: '1000000070968',
        name: null,
        typeId: '98662',
        capacity: '100000',
        used: '0',
        items: [],
      },
    ])
    expect(entity.adminActions).toContain('deposit_fuel')
    expect(entity.adminActions).toHaveLength(8)
    expect(entity.ownerActions).toEqual([])
  })

  it('keeps each action with its requirements', async () => {
    const { actions, adminActions } = parseEntity(await loadFixture())

    expect(actions.map((action) => action.name)).toEqual(adminActions)
    expect(actions.every((action) => action.scope === 'admin')).toBe(true)
    expect(actions.find((action) => action.name === 'set_power_grid')).toEqual({
      name: 'set_power_grid',
      scope: 'admin',
      requirements: [
        {
          typeName:
            '652f9bbd18bf5b22ee20df4bdf2a750825b3157c0db085de139646ac3245cfcd::power_grid::OperateGrid',
          componentId: '13330415371254569694',
        },
      ],
    })
  })
})

// ============================================================================
// parseEntity component parsers
// ============================================================================

describe('parseEntity', () => {
  function raw(fields: RawEntity['fields']): RawEntity {
    return {
      version: 3,
      contents: {
        type: { repr: `${PKG}::entity::Entity` },
        json: {
          id: '0xe',
          key: { id: '1', tenant: 't' },
          access_cap_id: '0xcap',
        },
      },
      fields,
    }
  }

  const component = (
    id: string,
    kind: string,
    inner: unknown,
    table: RawEntity['fields'][number]['table'] = null,
  ): RawEntity['fields'][number] => ({
    name: {
      type: { repr: `${PKG}::entity::ComponentKey` },
      json: { pos0: id },
    },
    value: {
      type: { repr: `${PKG}::component::Component<0xabc::${kind}>` },
      json: { version: '1', inner, name: 'label' },
    },
    table,
  })

  it('parses inventory items from LinkedTable nodes', () => {
    const entity = parseEntity(
      raw([
        component(
          '9',
          'inventory::Inventory',
          { type_id: '5', capacity: '100', used: '30' },
          [
            {
              name: { type: { repr: 'u64' }, json: '77' } as never,
              value: {
                type: { repr: 'LinkedTableNode' },
                json: {
                  prev: null,
                  next: null,
                  value: { quantity: '3', volume: '10' },
                },
              },
            },
          ],
        ),
      ]),
    )

    expect(entity.inventories[0]).toEqual({
      componentId: '9',
      name: 'label',
      typeId: '5',
      capacity: '100',
      used: '30',
      items: [{ typeId: '77', quantity: '3', volume: '10' }],
    })
  })

  it('skips inventory entries without a readable balance', () => {
    const entity = parseEntity(
      raw([
        component(
          '9',
          'inventory::Inventory',
          { type_id: '5', capacity: '100', used: '30' },
          [
            {
              name: { type: { repr: 'u64' }, json: '76' },
              value: null,
            } as never,
            {
              name: { type: { repr: 'u64' }, json: '77' } as never,
              value: {
                type: { repr: 'LinkedTableNode' },
                json: {
                  prev: null,
                  next: null,
                  value: { quantity: '3', volume: '10' },
                },
              },
            },
          ],
        ),
      ]),
    )

    expect(entity.inventories[0]?.items).toEqual([
      { typeId: '77', quantity: '3', volume: '10' },
    ])
  })

  it('parses metadata and identity', () => {
    const entity = parseEntity(
      raw([
        component('1', 'metadata::Metadata', {
          name: 'Pilot',
          description: 'd',
          url: 'u',
        }),
        component('2', 'identity::Identity', {
          tribe_id: 98000001,
          owner: '0xwallet',
        }),
      ]),
    )

    expect(entity.metadata).toEqual({
      name: 'Pilot',
      description: 'd',
      url: 'u',
    })
    expect(entity.identity).toEqual({ tribeId: 98000001, owner: '0xwallet' })
  })

  it('treats an unknown draw kind as Firm instead of trusting the cast', () => {
    const entity = parseEntity(
      raw([
        component('5', 'power_grid::PowerGrid', {
          on: true,
          fuel_quantity_at_last_settled: '0',
          fuel_capacity: '0',
          fuel_impulse: '0',
          fuel_containment_burden: '0',
          capacity_mw: '0',
          last_settled_ms: '0',
          modules: {
            contents: [
              {
                key: '9',
                value: {
                  module_spec: {
                    power_req: '1000',
                    draw_kind: { '@variant': 'Surge' },
                    priority: '2',
                    line_loss: '10',
                  },
                  desired_online: true,
                  active_draw_at_last_settled: '0',
                },
              },
            ],
          },
          generators: { contents: [] },
          fuel_sources: { contents: [] },
        }),
      ]),
    )

    expect(entity.powerGrid?.modules['9']).toEqual({
      desiredOnline: true,
      activeDraw: '0',
      powerReq: '1000',
      drawKind: 'Firm',
      priority: '2',
      lineLoss: '10',
    })
  })

  it('parses the access list, or leaves it null when absent', () => {
    const entity = parseEntity(
      raw([
        component('4', 'access_list::AccessList', {
          controllers: { contents: ['0xc1', '0xc2'] },
        }),
      ]),
    )

    expect(entity.controllers).toEqual(['0xc1', '0xc2'])
    expect(parseEntity(raw([])).controllers).toBeNull()
  })

  it('keeps unknown components and reads the in-flight flag', () => {
    const entity = parseEntity(
      raw([
        component('3', 'killmail::Killmail', { kill_timestamp: '1' }),
        {
          name: { type: { repr: `${PKG}::entity::InFlight` }, json: {} },
          value: { type: { repr: 'bool' }, json: true as never },
          table: null,
        },
      ]),
    )

    expect(entity.components).toEqual([
      expect.objectContaining({ id: '3', kind: 'killmail::Killmail' }),
    ])
    expect(entity.inFlight).toBe(true)
  })

  it('treats the in-flight key as the lock, whatever its value', () => {
    const entity = parseEntity(
      raw([
        {
          name: { type: { repr: `${PKG}::entity::InFlight` }, json: {} },
          value: { type: { repr: 'bool' }, json: false as never },
          table: null,
        },
      ]),
    )

    expect(entity.inFlight).toBe(true)
  })
})

// ============================================================================
// fetchEntity paging
// ============================================================================

describe('fetchEntity', () => {
  it('pages dynamic fields and nested tables', async () => {
    const layout = (sections: unknown) =>
      componentNode(
        '2',
        'layout::Layout',
        {
          section_ids: { contents: ['10', '11'] },
          sections: { id: '0xtable', size: '2' },
          shell: null,
        },
        { sections },
      )
    const section = (id: string) => ({
      name: { type: { repr: 'u64' }, json: id },
      value: {
        type: { repr: 'Section' },
        json: { module_ids: { contents: [id] } },
      },
    })

    const fetchMock = mockGraphql({
      GetEntity: ({ cursor }) =>
        cursor === null
          ? entityResponse(
              '0xe',
              [layout(tableRef([section('10')], 'tc1'))],
              'c1',
            )
          : entityResponse('0xe', [
              componentNode('3', 'fuel::Fuel', { dummy_field: false }),
            ]),
      GetTableEntries: ({ address, after }) => {
        expect(address).toBe('0xtable')
        expect(after).toBe('tc1')
        return { data: { address: { dynamicFields: page([section('11')]) } } }
      },
    })

    const raw = await fetchEntity('0xe')
    const entity = parseEntity(raw as RawEntity)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(entity.components.map((c) => c.id)).toEqual(['2', '3'])
    expect(entity.layout?.sections).toEqual([
      { id: '10', moduleIds: ['10'] },
      { id: '11', moduleIds: ['11'] },
    ])
  })

  it('throws when a nested table has more pages but no table id', async () => {
    mockGraphql({
      GetEntity: () =>
        entityResponse('0xe', [
          componentNode(
            '2',
            'layout::Layout',
            { section_ids: { contents: [] }, shell: null },
            { sections: tableRef([], 'tc1') },
          ),
        ]),
    })

    await expect(fetchEntity('0xe')).rejects.toThrow('no table id')
  })

  it('returns null when there is no object', async () => {
    mockGraphql({ GetEntity: () => NO_OBJECT })

    expect(await fetchEntity('0xwallet')).toBeNull()
  })

  it('throws on GraphQL errors', async () => {
    mockGraphql({ GetEntity: () => ({ errors: [{ message: 'boom' }] }) })

    await expect(fetchEntity('0xe')).rejects.toThrow('boom')
  })
})

// ============================================================================
// fetchEntityOwner
// ============================================================================

describe('fetchEntityOwner', () => {
  const ownedBy = (address: string) => ({
    data: {
      object: {
        owner: { __typename: 'AddressOwner', address: { address } },
      },
    },
  })

  it('returns the wallet when the cap is held by an address', async () => {
    mockGraphql({
      GetObjectOwner: () => ownedBy('0xwallet'),
      GetEntity: () => NO_OBJECT,
    })

    expect(await fetchEntityOwner('0xcap')).toEqual({
      kind: 'wallet',
      holder: '0xwallet',
      walletAddress: '0xwallet',
      character: null,
    })
  })

  it('resolves the character when the cap is parked on one', async () => {
    mockGraphql({
      GetObjectOwner: () => ownedBy('0xchar'),
      GetEntity: ({ address }) =>
        entityResponse(address as string, [
          componentNode('1', 'identity::Identity', {
            tribe_id: '5',
            owner: '0xwallet',
          }),
          componentNode('2', 'metadata::Metadata', {
            name: 'Pilot',
            description: '',
            url: '',
          }),
        ]),
    })

    const owner = await fetchEntityOwner('0xcap')

    expect(owner.kind).toBe('character')
    expect(owner.holder).toBe('0xchar')
    expect(owner.walletAddress).toBe('0xwallet')
    expect(owner.character?.id).toBe('0xchar')
    expect(owner.character?.metadata?.name).toBe('Pilot')
  })

  it('reuses the previous owner when the holder is unchanged', async () => {
    const previous = {
      kind: 'wallet' as const,
      holder: '0xwallet',
      walletAddress: '0xwallet',
      character: null,
    }
    const fetchMock = mockGraphql({
      GetObjectOwner: () => ownedBy('0xwallet'),
    })

    expect(await fetchEntityOwner('0xcap', previous)).toBe(previous)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolves again when the cap moved to another holder', async () => {
    mockGraphql({
      GetObjectOwner: () => ownedBy('0xother'),
      GetEntity: () => NO_OBJECT,
    })

    const owner = await fetchEntityOwner('0xcap', {
      kind: 'wallet',
      holder: '0xwallet',
      walletAddress: '0xwallet',
      character: null,
    })

    expect(owner.holder).toBe('0xother')
    expect(owner.walletAddress).toBe('0xother')
  })

  it('returns no owner when the cap is not address-owned', async () => {
    mockGraphql({
      GetObjectOwner: () => ({
        data: { object: { owner: { __typename: 'Shared' } } },
      }),
    })

    expect(await fetchEntityOwner('0xcap')).toEqual({
      kind: 'none',
      holder: null,
      walletAddress: null,
      character: null,
    })
  })

  it('reports an ObjectOwner holder as an object without fetching it', async () => {
    const fetchMock = mockGraphql({
      GetObjectOwner: () => ({
        data: {
          object: {
            owner: {
              __typename: 'ObjectOwner',
              address: { address: '0xwrapper' },
            },
          },
        },
      }),
    })

    expect(await fetchEntityOwner('0xcap')).toEqual({
      kind: 'object',
      holder: '0xwrapper',
      walletAddress: null,
      character: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports a non-entity object holder as an object', async () => {
    mockGraphql({
      GetObjectOwner: () => ownedBy('0xthing'),
      GetEntity: () => {
        const response = entityResponse('0xthing', [])
        response.data.object.asMoveObject.contents.type.repr = '0x2::foo::Foo'
        return response
      },
    })

    expect(await fetchEntityOwner('0xcap')).toEqual({
      kind: 'object',
      holder: '0xthing',
      walletAddress: null,
      character: null,
    })
  })

  it('resolves a character with no identity to no wallet', async () => {
    mockGraphql({
      GetObjectOwner: () => ownedBy('0xchar'),
      GetEntity: ({ address }) => entityResponse(address as string, []),
    })

    const owner = await fetchEntityOwner('0xcap')

    expect(owner.kind).toBe('character')
    expect(owner.walletAddress).toBeNull()
    expect(owner.character?.id).toBe('0xchar')
  })
})
