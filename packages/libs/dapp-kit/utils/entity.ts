import { getEntity, getObjectOwner, getTableEntries } from '../graphql/client'
import type {
  ContentsTypeAndJson,
  DynamicFieldTableEntryNode,
  GraphQLResponse,
  NestedTableRef,
} from '../graphql/types'
import type {
  EntityAction,
  EntityComponent,
  EntityData,
  EntityDrawKind,
  EntityFuelBay,
  EntityGenerator,
  EntityInventory,
  EntityLayout,
  EntityOwner,
  EntityPowerGrid,
  EntityPowerModule,
} from '../types'
import { projectGrid } from './fuel'
import { createLogger } from './logger'

/**
 * An entity as fetched: contents plus every dynamic field, with nested
 * tables (layout sections, inventory items) fully paged in.
 *
 * @category Utilities - Entity
 */
export interface RawEntity {
  version: number
  contents: ContentsTypeAndJson
  fields: Array<{
    name: ContentsTypeAndJson
    value: ContentsTypeAndJson
    table: DynamicFieldTableEntryNode[] | null
  }>
}

type Json = Record<string, unknown>
type VecMap<V> = { contents: Array<{ key: string; value: V }> }
type VecSet<V> = { contents: V[] }

// GraphQL JSON of the Move structs read below (world-contracts)
interface EntityJson {
  id: string
  key: { id: string; tenant: string }
  access_cap_id: string | null
}
interface ComponentJson<T = unknown> {
  inner: T
  name: string | null
}
interface MetadataJson {
  name: string
  description: string
  url: string
}
interface IdentityJson {
  tribe_id: string | number
  owner: string
}
interface PowerGridJson {
  on: boolean
  fuel_quantity_at_last_settled: string
  fuel_capacity: string
  fuel_impulse: string
  fuel_containment_burden: string
  capacity_mw: string
  last_settled_ms: string
  modules: VecMap<{
    module_spec: {
      power_req: string
      draw_kind: { '@variant': string }
      priority: string
      line_loss: string
    }
    desired_online: boolean
    active_draw_at_last_settled: string
  }>
  generators: VecMap<{
    online: boolean
    max_output_mw: string
    containment_reduction: string
    base_fuel_rate: string
  }>
  fuel_sources: VecMap<string>
}
interface ActionJson {
  requirements: Array<{ type_name: string; component_id: string }>
}
interface LayoutJson {
  section_ids: VecSet<string>
  shell: { shell_id: string } | null
}
interface SectionJson {
  module_ids: VecSet<string>
}
interface InventoryJson {
  type_id: string
  capacity: string
  used: string
}
interface LinkedTableNodeJson {
  value: { quantity: string; volume: string }
}
interface GenericModuleJson {
  type_id: string
}
// TODO(contract): assumed shape of the access-list component, which world-contracts does not define yet
interface AccessListJson {
  controllers: VecSet<string>
}

const log = createLogger()

const ENTITY_TYPE = /::entity::Entity$/
const COMPONENT_INNER = /::component::Component<0x[0-9a-fA-F]+::(\w+)::(\w+)/

function throwOnErrors(response: GraphQLResponse<unknown>): void {
  if (response.errors?.length) {
    throw new Error(response.errors.map((e) => e.message).join('; '))
  }
}

/** Reads a nested field such as `inner.sections.id` from component JSON. */
function readPath(json: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) => (value as Json | null | undefined)?.[key],
      json,
    )
}

/** Pages in the rest of a nested table once its inline first page is full. */
async function completeTable(
  ref: NestedTableRef,
  tableId: unknown,
): Promise<DynamicFieldTableEntryNode[] | null> {
  const page = ref?.asAddress?.addressAt?.dynamicFields
  if (!page) return null

  const entries = [...page.nodes]
  let after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  if (!after) return entries
  if (typeof tableId !== 'string') {
    // Paging needs the table id; stopping here would return partial entries
    throw new Error('Nested table has more pages but no table id in its JSON')
  }
  while (after) {
    const response = await getTableEntries(tableId, { after })
    throwOnErrors(response)
    const next = response.data?.address?.dynamicFields
    entries.push(...(next?.nodes ?? []))
    after = next?.pageInfo.hasNextPage ? next.pageInfo.endCursor : null
  }
  return entries
}

/**
 * Fetches an object as a world entity, paging through all of its dynamic
 * fields and any layout section or inventory item tables.
 *
 * Pages after the first are read at the latest version rather than pinned to
 * `version`, so an entity that changes mid-fetch can mix fields from two
 * versions. Polling callers converge on the next fetch, as the newer version
 * no longer matches.
 *
 * @category Utilities - Entity
 * @param objectId - The Sui object ID
 * @returns The raw entity, or null if there is no Move object at that address
 * @throws If a GraphQL response has errors, or a nested table cannot be paged
 */
export async function fetchEntity(objectId: string): Promise<RawEntity | null> {
  let raw: RawEntity | null = null
  let cursor: string | undefined

  do {
    const response = await getEntity(objectId, cursor ? { cursor } : {})
    throwOnErrors(response)
    const object = response.data?.object
    if (!object?.asMoveObject) return null

    raw ??= {
      version: response.data?.latestVersion.nodes[0]?.version ?? 0,
      contents: object.asMoveObject.contents,
      fields: [],
    }

    for (const { contents } of object.dynamicFields.nodes) {
      const { sections, items, ...value } = contents.value
      const table = sections
        ? await completeTable(
            sections,
            readPath(value.json, 'inner.sections.id'),
          )
        : await completeTable(
            items,
            readPath(value.json, 'inner.items.balances.id'),
          )
      raw.fields.push({ name: contents.name, value, table })
    }

    const { pageInfo } = object.dynamicFields
    cursor = pageInfo.hasNextPage
      ? (pageInfo.endCursor ?? undefined)
      : undefined
  } while (cursor)

  return raw
}

/** True when the raw object is a `core::entity::Entity`. @category Utilities - Entity */
export function isEntity(raw: RawEntity): boolean {
  return ENTITY_TYPE.test(raw.contents.type.repr)
}

/**
 * The draw kind, checked rather than cast. An unknown variant (say, from a
 * contract upgrade) is treated as Firm, the stricter rule, and logged.
 */
function parseDrawKind(variant: string, moduleId: string): EntityDrawKind {
  if (variant === 'Firm' || variant === 'Elastic') return variant
  log.warn(
    `[DappKit] Unknown draw kind "${variant}" on module ${moduleId}; treating it as Firm`,
  )
  return 'Firm'
}

/**
 * The grid as world-contracts dev-v1.1.16+ stores it (the `pools` model): fuel
 * bays pooled by fuel type, Generators with a fuel type and limits, plain MW.
 * dev-v1.1.12 to v1.1.15 use the same layout at a different scale; see
 * `PowerGridModel`.
 */
interface PoolsPowerGridJson {
  on_at_last_settled: boolean
  last_settled_ms: string
  modules: PowerGridJson['modules']
  generators: VecMap<{
    fuel_type: string
    max_output_mw: string
    impulse_limit: string
    volatility_limit: string
    online: boolean
  }>
  bays: VecMap<{
    capacity: string
    online: boolean
    fuel: {
      fuel_type: string | null
      quantity: string
      impulse: string
      containment_burden: string
      volatility: string
    }
  }>
}

function parseModules(
  json: PowerGridJson['modules'],
): Record<string, EntityPowerModule> {
  const modules: Record<string, EntityPowerModule> = {}
  for (const { key, value } of json.contents) {
    modules[key] = {
      desiredOnline: value.desired_online,
      activeDraw: value.active_draw_at_last_settled,
      powerReq: value.module_spec.power_req,
      drawKind: parseDrawKind(value.module_spec.draw_kind['@variant'], key),
      priority: String(value.module_spec.priority),
      lineLoss: String(value.module_spec.line_loss),
    }
  }
  return modules
}

function parsePoolsGrid(raw: PoolsPowerGridJson): EntityPowerGrid {
  const generators: Record<string, EntityGenerator> = {}
  for (const { key, value } of raw.generators?.contents ?? []) {
    generators[key] = {
      online: value.online,
      maxOutputMw: value.max_output_mw,
      containmentReduction: '0',
      baseFuelRate: '0',
      fuelType: String(value.fuel_type),
      impulseLimit: value.impulse_limit,
      volatilityLimit: value.volatility_limit,
    }
  }
  const bays: Record<string, EntityFuelBay> = {}
  const fuelSources: Record<string, string> = {}
  let quantity = 0n
  let capacity = 0n
  let impulse = 0n
  let burden = 0n
  for (const { key, value } of raw.bays?.contents ?? []) {
    const fuel = value.fuel
    bays[key] = {
      capacity: value.capacity,
      online: value.online,
      fuel: {
        fuelType: fuel.fuel_type == null ? null : String(fuel.fuel_type),
        quantity: fuel.quantity,
        impulse: fuel.impulse,
        containmentBurden: fuel.containment_burden,
        volatility: fuel.volatility,
      },
    }
    fuelSources[key] = value.capacity
    if (value.online) {
      // `online_fuel`: online bays, stats weighted by quantity
      const held = BigInt(fuel.quantity)
      quantity += held
      capacity += BigInt(value.capacity)
      impulse += held * BigInt(fuel.impulse)
      burden += held * BigInt(fuel.containment_burden)
    }
  }
  const grid: EntityPowerGrid = {
    model: 'pools',
    on: raw.on_at_last_settled,
    fuelQuantity: quantity.toString(),
    fuelCapacity: capacity.toString(),
    capacityMw: '0',
    lastSettledMs: raw.last_settled_ms,
    fuelImpulse: quantity > 0n ? (impulse / quantity).toString() : '0',
    fuelContainmentBurden: quantity > 0n ? (burden / quantity).toString() : '0',
    modules: parseModules(raw.modules),
    generators,
    fuelSources,
    bays,
  }
  // `capacity_mw`: the generators' output as of the last settle
  grid.capacityMw = projectGrid(
    grid,
    Number(raw.last_settled_ms),
  ).capacityMw.toString()
  return grid
}

function parsePowerGrid(
  raw: PowerGridJson | PoolsPowerGridJson,
): EntityPowerGrid {
  if ('on_at_last_settled' in raw) return parsePoolsGrid(raw)
  const inner = raw
  const modules = parseModules(inner.modules)
  const generators: Record<string, EntityGenerator> = {}
  for (const { key, value } of inner.generators.contents) {
    generators[key] = {
      online: value.online,
      maxOutputMw: value.max_output_mw,
      containmentReduction: value.containment_reduction,
      baseFuelRate: value.base_fuel_rate,
    }
  }
  const fuelSources: Record<string, string> = {}
  for (const { key, value } of inner.fuel_sources.contents) {
    fuelSources[key] = value
  }
  return {
    on: inner.on,
    fuelQuantity: inner.fuel_quantity_at_last_settled,
    fuelCapacity: inner.fuel_capacity,
    capacityMw: inner.capacity_mw,
    lastSettledMs: inner.last_settled_ms,
    fuelImpulse: inner.fuel_impulse,
    fuelContainmentBurden: inner.fuel_containment_burden,
    modules,
    generators,
    fuelSources,
  }
}

function parseActions(
  json: VecMap<ActionJson>,
  scope: EntityAction['scope'],
): EntityAction[] {
  return json.contents.map(({ key, value }) => ({
    name: key,
    scope,
    requirements: value.requirements.map((requirement) => ({
      typeName: requirement.type_name,
      componentId: requirement.component_id,
    })),
  }))
}

function parseLayout(
  inner: LayoutJson,
  table: DynamicFieldTableEntryNode[] | null,
): EntityLayout {
  const moduleIds = new Map(
    (table ?? []).map((entry) => [
      String(entry.name.json),
      (entry.value?.json as SectionJson | undefined)?.module_ids.contents ?? [],
    ]),
  )
  return {
    shellId: inner.shell?.shell_id ?? null,
    // Keep the layout's own section order
    sections: inner.section_ids.contents.map((id) => ({
      id,
      moduleIds: moduleIds.get(id) ?? [],
    })),
  }
}

function parseInventory(
  component: EntityComponent,
  inner: InventoryJson,
  table: DynamicFieldTableEntryNode[] | null,
): EntityInventory {
  return {
    componentId: component.id,
    name: component.name,
    typeId: inner.type_id,
    capacity: inner.capacity,
    used: inner.used,
    // LinkedTable nodes: { prev, next, value: Balance { quantity, volume } }.
    // Entries without a readable balance are skipped rather than failing the entity.
    items: (table ?? []).flatMap((entry) => {
      const balance = (entry.value?.json as LinkedTableNodeJson | undefined)
        ?.value
      return balance
        ? [
            {
              typeId: String(entry.name.json),
              quantity: balance.quantity,
              volume: balance.volume,
            },
          ]
        : []
    }),
  }
}

/**
 * Parses a fetched entity into typed components. Components without a
 * parser still appear in `components`.
 *
 * @category Utilities - Entity
 * @param raw - The entity from {@link fetchEntity}
 * @returns The parsed entity
 */
export function parseEntity(raw: RawEntity): EntityData {
  const json = raw.contents.json as unknown as EntityJson
  const entity: EntityData = {
    id: json.id,
    version: raw.version,
    key: { id: json.key.id, tenant: json.key.tenant },
    accessCapId: json.access_cap_id ?? null,
    inFlight: false,
    metadata: null,
    identity: null,
    powerGrid: null,
    layout: null,
    inventories: [],
    genericModules: [],
    controllers: null,
    components: [],
    adminActions: [],
    ownerActions: [],
    actions: [],
  }

  for (const { name, value, table } of raw.fields) {
    const keyType = name.type.repr
    if (keyType.endsWith('::entity::AdminActionsKey')) {
      const actions = parseActions(value.json as VecMap<ActionJson>, 'admin')
      entity.adminActions = actions.map((action) => action.name)
      entity.actions.push(...actions)
      continue
    }
    if (keyType.endsWith('::entity::OwnerActionsKey')) {
      const actions = parseActions(value.json as VecMap<ActionJson>, 'owner')
      entity.ownerActions = actions.map((action) => action.name)
      entity.actions.push(...actions)
      continue
    }
    if (keyType.endsWith('::entity::InFlight')) {
      // The lock is `df::exists(InFlight())`; the stored bool is a placeholder
      entity.inFlight = true
      continue
    }
    if (!keyType.endsWith('::entity::ComponentKey')) continue

    const match = COMPONENT_INNER.exec(value.type.repr)
    const wrapper = value.json as unknown as ComponentJson
    const component: EntityComponent = {
      id: (name.json as { pos0: string }).pos0,
      name: wrapper.name,
      kind: match ? `${match[1]}::${match[2]}` : value.type.repr,
      type: value.type.repr,
      json: wrapper.inner,
    }
    entity.components.push(component)

    const inner = wrapper.inner
    switch (component.kind) {
      case 'metadata::Metadata': {
        const { name, description, url } = inner as MetadataJson
        entity.metadata = { name, description, url }
        break
      }
      case 'identity::Identity': {
        const { tribe_id, owner } = inner as IdentityJson
        entity.identity = { tribeId: Number(tribe_id), owner }
        break
      }
      case 'power_grid::PowerGrid':
        entity.powerGrid = parsePowerGrid(inner as PowerGridJson)
        break
      case 'layout::Layout':
        entity.layout = parseLayout(inner as LayoutJson, table)
        break
      case 'inventory::Inventory':
        entity.inventories.push(
          parseInventory(component, inner as InventoryJson, table),
        )
        break
      case 'generic_module::GenericModule':
        entity.genericModules.push({
          componentId: component.id,
          name: component.name,
          typeId: (inner as GenericModuleJson).type_id,
        })
        break
      case 'access_list::AccessList':
        entity.controllers = (inner as AccessListJson).controllers.contents
        break
    }
  }

  return entity
}

/**
 * Resolves who controls an entity from the holder of its AccessCap. A cap
 * parked on a Character is held by the Character's object id; its wallet is
 * the Character's `Identity.owner`. See {@link EntityOwner} `kind` for the
 * cases.
 *
 * @category Utilities - Entity
 * @param accessCapId - The entity's `accessCapId`
 * @param previous - The last owner resolved for this cap; returned as-is when
 *   the holder hasn't changed, skipping the Character fetch
 * @returns The holder, its wallet, and the Character entity when there is one
 * @throws If a GraphQL response has errors
 */
export async function fetchEntityOwner(
  accessCapId: string,
  previous?: EntityOwner | null,
): Promise<EntityOwner> {
  const response = await getObjectOwner(accessCapId)
  throwOnErrors(response)
  const owner = response.data?.object?.owner
  const holder = owner && 'address' in owner ? owner.address.address : null
  if (!owner || !holder) {
    return { kind: 'none', holder: null, walletAddress: null, character: null }
  }
  // An ObjectOwner holder is a dynamic-field wrapper, not the Character
  if (owner.__typename === 'ObjectOwner') {
    return { kind: 'object', holder, walletAddress: null, character: null }
  }
  if (previous && previous.kind !== 'object' && previous.holder === holder) {
    return previous
  }

  // A wallet has no object at its address; an object holder should be a Character
  const raw = await fetchEntity(holder)
  if (!raw) {
    return { kind: 'wallet', holder, walletAddress: holder, character: null }
  }
  if (!isEntity(raw)) {
    return { kind: 'object', holder, walletAddress: null, character: null }
  }

  const character = parseEntity(raw)
  return {
    kind: 'character',
    holder,
    walletAddress: character.identity?.owner ?? null,
    character,
  }
}
