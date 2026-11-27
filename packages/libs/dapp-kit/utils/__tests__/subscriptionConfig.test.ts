import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  backstopInterval,
  DEFAULT_UPDATE_TRANSPORT,
  getGraphqlSubscriptionAuthToken,
  getSubscriptionBackstopInterval,
  getSuiGraphqlEndpoint,
  getSuiGraphqlSubscriptionEndpoint,
  POLLING_INTERVAL,
  SUBSCRIPTION_BACKSTOP_INTERVAL,
} from '../constants'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getSuiGraphqlSubscriptionEndpoint', () => {
  it('serves subscriptions at /graphql/subscriptions beside the query URL', () => {
    for (const network of ['testnet', 'devnet', 'mainnet']) {
      expect(getSuiGraphqlSubscriptionEndpoint(network)).toBe(
        `https://graphql.${network}.sui.io/graphql/subscriptions`,
      )
    }
    expect(getSuiGraphqlEndpoint('mainnet')).toBe(
      'https://graphql.mainnet.sui.io/graphql',
    )
  })

  it('defaults to testnet, also for an unknown network', () => {
    expect(getSuiGraphqlSubscriptionEndpoint()).toBe(
      'https://graphql.testnet.sui.io/graphql/subscriptions',
    )
    expect(getSuiGraphqlSubscriptionEndpoint('unknown-net')).toBe(
      'https://graphql.testnet.sui.io/graphql/subscriptions',
    )
  })

  it('takes VITE_SUI_GRAPHQL_SUBSCRIPTION_URL over the default', () => {
    vi.stubEnv('VITE_SUI_GRAPHQL_SUBSCRIPTION_URL', 'http://127.0.0.1:9125/sse')
    expect(getSuiGraphqlSubscriptionEndpoint('mainnet')).toBe(
      'http://127.0.0.1:9125/sse',
    )
  })
})

describe('getGraphqlSubscriptionAuthToken', () => {
  it('is unset by default and read from the env', () => {
    vi.stubEnv('VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN', '')
    expect(getGraphqlSubscriptionAuthToken()).toBeUndefined()
    vi.stubEnv('VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN', 'secret')
    expect(getGraphqlSubscriptionAuthToken()).toBe('secret')
  })
})

describe('update transport intervals', () => {
  it('defaults to the subscription', () => {
    expect(DEFAULT_UPDATE_TRANSPORT).toBe('subscription')
  })

  it('reads the backstop interval from the env, 0 included', () => {
    expect(getSubscriptionBackstopInterval()).toBe(
      SUBSCRIPTION_BACKSTOP_INTERVAL,
    )
    vi.stubEnv('VITE_SUBSCRIPTION_POLLING_INTERVAL', '90000')
    expect(getSubscriptionBackstopInterval()).toBe(90_000)
    vi.stubEnv('VITE_SUBSCRIPTION_POLLING_INTERVAL', '0')
    expect(getSubscriptionBackstopInterval()).toBe(0)
    vi.stubEnv('VITE_SUBSCRIPTION_POLLING_INTERVAL', 'soon')
    expect(getSubscriptionBackstopInterval()).toBe(
      SUBSCRIPTION_BACKSTOP_INTERVAL,
    )
  })

  it('polls slowly while the subscription is connecting or live', () => {
    expect(backstopInterval('subscription', 'connecting')).toBe(60_000)
    expect(backstopInterval('subscription', 'live')).toBe(60_000)
  })

  it('polls normally with polling, before the entity loads, or once the subscription failed', () => {
    expect(backstopInterval('polling', 'off')).toBe(POLLING_INTERVAL)
    expect(backstopInterval('subscription', 'off')).toBe(POLLING_INTERVAL)
    expect(backstopInterval('subscription', 'failed')).toBe(POLLING_INTERVAL)
  })
})
