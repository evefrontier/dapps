import type { UpdateTransport } from '@evefrontier/dapp-kit'

/**
 * The update transport named by the `assembly-update-transport` variant. Only
 * an explicit `polling` turns the subscription off; anything else, including
 * an unknown variant, keeps the default `subscription`.
 */
export function resolveUpdateTransport(variant: string): UpdateTransport {
  return variant === 'polling' ? 'polling' : 'subscription'
}
