import { describe, expect, it } from 'vitest'
import { Assemblies } from '../../types'
import {
  getAssemblyTypeApiString,
  supportsSponsoredTransaction,
} from '../features'
import { makeArrayWallet } from './testHelpers'

// ============================================================================
// getAssemblyTypeApiString
// ============================================================================

describe('getAssemblyTypeApiString', () => {
  it.each([
    [Assemblies.SmartStorageUnit, 'storage-units'],
    [Assemblies.SmartTurret, 'turrets'],
    [Assemblies.SmartGate, 'gates'],
    [Assemblies.NetworkNode, 'network-nodes'],
    [Assemblies.Assembly, 'assemblies'],
  ])('maps %s to API value %s', (assemblyKey, expected) => {
    expect(getAssemblyTypeApiString(assemblyKey)).toBe(expected)
  })
})

// ============================================================================
// supportsSponsoredTransaction
// ============================================================================

describe('supportsSponsoredTransaction', () => {
  it('returns false for null', () => {
    expect(supportsSponsoredTransaction(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(supportsSponsoredTransaction(undefined)).toBe(false)
  })

  it('returns true for array-shaped features containing the feature name', () => {
    expect(supportsSponsoredTransaction(makeArrayWallet().features)).toBe(true)
  })

  it('returns false for an array that does not include the feature name', () => {
    expect(supportsSponsoredTransaction(['some:other-feature'])).toBe(false)
  })

  it('returns false for object-shaped features missing the sponsored-tx key', () => {
    expect(supportsSponsoredTransaction({ other: 'value' })).toBe(false)
  })
})
