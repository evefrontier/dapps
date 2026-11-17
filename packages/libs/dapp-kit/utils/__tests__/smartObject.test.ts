import { describe, expect, it } from 'vitest'

import { Assemblies, type AssemblyType, State } from '../../types'
import { DEFAULT_TENANT } from '../constants'
import {
  EMPTY_CONFIRMED_SIGNATURES,
  readObjectSelection,
  reconcileRefetchedAssembly,
  toFetchObjectDataInput,
} from '../smartObject'

function createNetworkNode(
  quantity: number,
  isBurning: boolean,
  state = State.ONLINE,
): AssemblyType<Assemblies.NetworkNode> {
  return {
    id: '0xnode',
    type: Assemblies.NetworkNode,
    state,
    networkNode: { fuel: { quantity, isBurning } },
  } as unknown as AssemblyType<Assemblies.NetworkNode>
}

function createTurret(state: State): AssemblyType<Assemblies> {
  return {
    id: '0xturret',
    type: Assemblies.SmartTurret,
    state,
  } as unknown as AssemblyType<Assemblies>
}

describe('readObjectSelection', () => {
  it('prefers the env object ID and reads the tenant from the query', () => {
    expect(readObjectSelection('?itemId=42&tenant=utopia', '0xabc')).toEqual({
      objectId: '0xabc',
      tenant: 'utopia',
      isObjectIdDirect: true,
    })
  })

  it('falls back to the itemId query param', () => {
    expect(readObjectSelection('?itemId=42', undefined)).toEqual({
      objectId: '42',
      tenant: DEFAULT_TENANT,
      isObjectIdDirect: false,
    })
  })

  it('returns null when no object is selected', () => {
    expect(readObjectSelection('?tenant=utopia', undefined)).toBeNull()
  })
})

describe('toFetchObjectDataInput', () => {
  it('builds an objectId or itemId input', () => {
    expect(toFetchObjectDataInput('0xabc', 'utopia', true)).toEqual({
      objectId: '0xabc',
    })
    expect(toFetchObjectDataInput('42', 'utopia', false)).toEqual({
      itemId: '42',
      selectedTenant: 'utopia',
    })
  })
})

describe('reconcileRefetchedAssembly', () => {
  it('takes the fetched assembly on an initial fetch and records it', () => {
    const fetched = createNetworkNode(10, true)
    const result = reconcileRefetchedAssembly(
      null,
      fetched,
      true,
      EMPTY_CONFIRMED_SIGNATURES,
    )

    expect(result.assembly).toBe(fetched)
    expect(result.confirmed).toEqual({
      state: State.ONLINE,
      fuel: '10:true',
      inventory: null,
    })
  })

  it('keeps optimistic state when a refetch returns the last confirmed state', () => {
    const optimistic = createTurret(State.ANCHORED)
    const stale = createTurret(State.ONLINE)
    const confirmed = { ...EMPTY_CONFIRMED_SIGNATURES, state: State.ONLINE }

    const result = reconcileRefetchedAssembly(
      optimistic,
      stale,
      false,
      confirmed,
    )

    expect(result.assembly.state).toBe(State.ANCHORED)
    expect(result.confirmed).toBe(confirmed)
  })

  it('takes a new state from a refetch once the indexer catches up', () => {
    const current = createTurret(State.ANCHORED)
    const fresh = createTurret(State.ANCHORED)
    const result = reconcileRefetchedAssembly(current, fresh, false, {
      ...EMPTY_CONFIRMED_SIGNATURES,
      state: State.ONLINE,
    })

    expect(result.assembly).toBe(fresh)
    expect(result.confirmed.state).toBe(State.ANCHORED)
  })

  it('keeps optimistic fuel when a refetch returns the last confirmed fuel', () => {
    const optimistic = createNetworkNode(5, false)
    const stale = createNetworkNode(10, true)

    const result = reconcileRefetchedAssembly(optimistic, stale, false, {
      state: State.ONLINE,
      fuel: '10:true',
      inventory: null,
    })

    expect(result.assembly).toBe(optimistic)
    expect(result.confirmed.fuel).toBe('10:true')
  })

  it('takes new fuel from a refetch and records it', () => {
    const current = createNetworkNode(5, false)
    const fresh = createNetworkNode(4, true)

    const result = reconcileRefetchedAssembly(current, fresh, false, {
      state: State.ONLINE,
      fuel: '10:true',
      inventory: null,
    })

    expect(result.assembly).toEqual(fresh)
    expect(result.confirmed.fuel).toBe('4:true')
  })
})
