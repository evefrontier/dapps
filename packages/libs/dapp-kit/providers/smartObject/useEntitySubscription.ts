import { useEffect, useRef, useState } from 'react'
import {
  getGraphqlSubscriptionAuthToken,
  getSuiGraphqlSubscriptionEndpoint,
  type SubscriptionStatus,
  type UpdateTransport,
} from '../../utils/constants'
import { entityEventTypes } from '../../utils/events/entityEvents'
import { startEntitySubscription } from '../../utils/events/entitySubscription'
import { createGraphqlSseEventStreamClient } from '../../utils/events/sseClient'
import { createLogger } from '../../utils/logger'

const log = createLogger()

/**
 * Subscribes to the selected entity's inventory and power events over the
 * GraphQL subscription endpoint and refetches when one arrives. `off` with
 * the `polling` transport or before the entity has loaded; `failed` once the
 * subscription has failed, until the entity or transport changes.
 */
export function useEntitySubscription({
  transport,
  entityId,
  tenant,
  refetch,
}: {
  transport: UpdateTransport
  entityId: string | null
  tenant: string | undefined
  refetch: () => Promise<void>
}): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>('off')
  // The latest refetch, without resubscribing when its identity changes
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    if (transport !== 'subscription' || !entityId) {
      setStatus('off')
      return
    }

    let eventTypes: string[]
    try {
      eventTypes = entityEventTypes(tenant)
    } catch (error) {
      log.warn(
        '[DappKit] No world packages to subscribe to; falling back to polling',
        error,
      )
      setStatus('failed')
      return
    }

    let subscription: ReturnType<typeof startEntitySubscription> | null = null
    const client = createGraphqlSseEventStreamClient({
      url: getSuiGraphqlSubscriptionEndpoint(),
      authToken: getGraphqlSubscriptionAuthToken(),
      onUnsupported: (error) => subscription?.fail(error),
    })
    subscription = startEntitySubscription({
      client,
      eventTypes,
      entityId,
      refetch: () => refetchRef.current(),
      onStatus: setStatus,
    })

    return () => {
      subscription?.stop()
      client.dispose()
    }
  }, [transport, entityId, tenant])

  return status
}
