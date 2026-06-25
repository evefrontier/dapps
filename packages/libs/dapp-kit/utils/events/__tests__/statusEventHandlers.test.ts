import { describe, expect, it } from 'vitest'
import { Assemblies, type AssemblyType, State } from '../../../types'
import {
  applyStatusEventToAssembly,
  getStatusEventTarget,
  getStatusEventType,
  isRelevantStatusEvent,
} from '../statusEventHandlers'

const PACKAGE_ID =
  '0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c'
const NODE_OBJECT_ID =
  '0x34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b'
const OTHER_OBJECT_ID =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

const STATUS_EVENT_TYPE = `${PACKAGE_ID}::status::StatusChangedEvent`

function createAssembly(
  state = State.ANCHORED,
): AssemblyType<Assemblies.NetworkNode> {
  return {
    type: Assemblies.NetworkNode,
    id: NODE_OBJECT_ID,
    state,
  } as unknown as AssemblyType<Assemblies.NetworkNode>
}

function createStatusEvent(assemblyId: string, statusKind: string) {
  return {
    type: STATUS_EVENT_TYPE,
    parsedJson: {
      assembly_id: assemblyId,
      assembly_key: { item_id: '1', tenant: 'stillness' },
      status: { $kind: statusKind, [statusKind]: true },
      action: { $kind: 'ANCHORED', ANCHORED: true },
    },
  }
}

describe('getStatusEventType', () => {
  it('returns the correct event type string', () => {
    expect(getStatusEventType(PACKAGE_ID)).toBe(
      `${PACKAGE_ID}::status::StatusChangedEvent`,
    )
  })
})

describe('getStatusEventTarget', () => {
  it('returns target for an assembly with an id', () => {
    const assembly = createAssembly()
    const target = getStatusEventTarget(assembly, [STATUS_EVENT_TYPE])
    expect(target).toEqual({
      eventTypes: [STATUS_EVENT_TYPE],
      objectId: NODE_OBJECT_ID,
    })
  })

  it('returns null for null assembly', () => {
    expect(getStatusEventTarget(null, [STATUS_EVENT_TYPE])).toBeNull()
  })
})

describe('isRelevantStatusEvent', () => {
  const target = { eventTypes: [STATUS_EVENT_TYPE], objectId: NODE_OBJECT_ID }

  it('matches an event for the correct assembly', () => {
    const event = createStatusEvent(NODE_OBJECT_ID, 'ONLINE')
    expect(isRelevantStatusEvent(event, target)).toBe(true)
  })

  it('rejects an event for a different assembly', () => {
    const event = createStatusEvent(OTHER_OBJECT_ID, 'ONLINE')
    expect(isRelevantStatusEvent(event, target)).toBe(false)
  })

  it('rejects an event with a different type', () => {
    const event = {
      type: `${PACKAGE_ID}::fuel::FuelEvent`,
      parsedJson: { assembly_id: NODE_OBJECT_ID },
    }
    expect(isRelevantStatusEvent(event, target)).toBe(false)
  })

  it('matches case-insensitively on assembly_id', () => {
    const event = createStatusEvent(NODE_OBJECT_ID.toUpperCase(), 'ONLINE')
    expect(isRelevantStatusEvent(event, target)).toBe(true)
  })
})

describe('applyStatusEventToAssembly', () => {
  it('applies ONLINE status to the assembly', () => {
    const assembly = createAssembly(State.ANCHORED)
    const event = createStatusEvent(NODE_OBJECT_ID, 'ONLINE')
    const result = applyStatusEventToAssembly(assembly, event)
    expect(result?.state).toBe(State.ONLINE)
  })

  it('applies OFFLINE status as ANCHORED state', () => {
    const assembly = createAssembly(State.ONLINE)
    const event = createStatusEvent(NODE_OBJECT_ID, 'OFFLINE')
    const result = applyStatusEventToAssembly(assembly, event)
    expect(result?.state).toBe(State.ANCHORED)
  })

  it('preserves other assembly fields unchanged', () => {
    const assembly = createAssembly(State.ANCHORED)
    const event = createStatusEvent(NODE_OBJECT_ID, 'ONLINE')
    const result = applyStatusEventToAssembly(assembly, event)
    expect(result?.type).toBe(Assemblies.NetworkNode)
    expect(result?.id).toBe(NODE_OBJECT_ID)
  })

  it('is a no-op for an unknown status kind', () => {
    const assembly = createAssembly(State.ANCHORED)
    const event = {
      type: STATUS_EVENT_TYPE,
      parsedJson: {
        assembly_id: NODE_OBJECT_ID,
        status: { $kind: 'NULL', NULL: true },
      },
    }
    expect(applyStatusEventToAssembly(assembly, event)).toBe(assembly)
  })

  it('is a no-op for null assembly', () => {
    const event = createStatusEvent(NODE_OBJECT_ID, 'ONLINE')
    expect(applyStatusEventToAssembly(null, event)).toBeNull()
  })

  it('is a no-op when status is missing', () => {
    const assembly = createAssembly(State.ANCHORED)
    const event = {
      type: STATUS_EVENT_TYPE,
      parsedJson: { assembly_id: NODE_OBJECT_ID },
    }
    expect(applyStatusEventToAssembly(assembly, event)).toBe(assembly)
  })
})
