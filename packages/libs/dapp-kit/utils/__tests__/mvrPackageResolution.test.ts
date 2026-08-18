import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const MVR_NAME = '@evefrontier/world-test'
const LATEST_ID =
  '0x1111111111111111111111111111111111111111111111111111111111111111'
const ORIGIN_ID =
  '0x2222222222222222222222222222222222222222222222222222222222222222'
const HEX_ENV =
  '0x3333333333333333333333333333333333333333333333333333333333333333'

/** A `Response`-like stub good enough for the resolver / shared GraphQL client. */
function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response
}

const mvrOk = (id: string = LATEST_ID) =>
  jsonResponse({ resolution: { [MVR_NAME]: { package_id: id } } })

const graphqlOk = (address: string = ORIGIN_ID) =>
  jsonResponse({ data: { package: { packageAt: { address } } } })

const isMvr = (url: unknown): boolean =>
  typeof url === 'string' && url.includes('mvr.mystenlabs.com')

/** Fresh module instance per test so the module-level resolution cache resets. */
async function loadResolver() {
  vi.resetModules()
  return import('../mvrPackageResolution')
}

describe('resolveWorldPackageId', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', MVR_NAME)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('resolves an MVR name to its original (version 1) package id', async () => {
    const fetchMock = vi.fn((url: unknown) =>
      Promise.resolve(isMvr(url) ? mvrOk() : graphqlOk()),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { resolveWorldPackageId } = await loadResolver()
    await expect(resolveWorldPackageId()).resolves.toBe(ORIGIN_ID)

    // Two round-trips: MVR name -> latest, then GraphQL latest -> origin.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(isMvr(fetchMock.mock.calls[0]?.[0])).toBe(true)
    expect(isMvr(fetchMock.mock.calls[1]?.[0])).toBe(false)
  })

  it('uses a raw 0x address verbatim without any network calls', async () => {
    vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', HEX_ENV)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { resolveWorldPackageId } = await loadResolver()
    await expect(resolveWorldPackageId()).resolves.toBe(HEX_ENV)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('caches the resolved id — a second call makes no further requests', async () => {
    const fetchMock = vi.fn((url: unknown) =>
      Promise.resolve(isMvr(url) ? mvrOk() : graphqlOk()),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { resolveWorldPackageId } = await loadResolver()
    await resolveWorldPackageId()
    await expect(resolveWorldPackageId()).resolves.toBe(ORIGIN_ID)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws permanently (no request) on a network MVR does not serve', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { resolveWorldPackageId } = await loadResolver()
    await expect(resolveWorldPackageId('devnet')).rejects.toThrow(
      /not supported on "devnet"/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails after MAX attempts when MVR returns no package_id', async () => {
    const fetchMock = vi.fn((url: unknown) =>
      Promise.resolve(
        isMvr(url) ? jsonResponse({ resolution: {} }) : graphqlOk(),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const { resolveWorldPackageId } = await loadResolver()
    const promise = resolveWorldPackageId()
    const assertion = expect(promise).rejects.toThrow(/after 3 attempts/)
    await vi.runAllTimersAsync()
    await assertion

    // Failed on the MVR step each time, so the GraphQL step is never reached.
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls.every((c) => isMvr(c[0]))).toBe(true)
  })

  it('surfaces GraphQL errors from the origin lookup', async () => {
    const fetchMock = vi.fn((url: unknown) =>
      Promise.resolve(
        isMvr(url) ? mvrOk() : jsonResponse({ errors: [{ message: 'boom' }] }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const { resolveWorldPackageId } = await loadResolver()
    const promise = resolveWorldPackageId()
    const assertion = expect(promise).rejects.toThrow(/boom/)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('retries transient failures and eventually succeeds', async () => {
    let mvrCalls = 0
    const fetchMock = vi.fn((url: unknown) => {
      if (isMvr(url)) {
        mvrCalls += 1
        if (mvrCalls === 1) return Promise.reject(new Error('network blip'))
        return Promise.resolve(mvrOk())
      }
      return Promise.resolve(graphqlOk())
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const { resolveWorldPackageId } = await loadResolver()
    const promise = resolveWorldPackageId()
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe(ORIGIN_ID)
    expect(mvrCalls).toBe(2)
  })
})

describe('tryResolveWorldPackageIdSync', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true for a raw 0x env (resolving synchronously)', async () => {
    vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', HEX_ENV)
    const { tryResolveWorldPackageIdSync } = await loadResolver()
    expect(tryResolveWorldPackageIdSync()).toBe(true)
  })

  it('returns false for an unresolved MVR name', async () => {
    vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', MVR_NAME)
    const { tryResolveWorldPackageIdSync } = await loadResolver()
    expect(tryResolveWorldPackageIdSync()).toBe(false)
  })

  it('returns false when the env var is unset', async () => {
    vi.stubEnv('VITE_EVE_WORLD_PACKAGE_ID', '')
    const { tryResolveWorldPackageIdSync } = await loadResolver()
    expect(tryResolveWorldPackageIdSync()).toBe(false)
  })
})
