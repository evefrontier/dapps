import {
  type SendSponsoredTransactionFn,
  Severity,
  type SponsoredTransactionOutput,
  useNotification,
  useSmartObject,
  useSponsoredTransaction,
} from '@evefrontier/dapp-kit'
import { useState } from 'react'

/** The error notice text for a failed action, e.g. "Failed to add Oro: …". */
export function failureMessage(what: string, error: unknown): string {
  return `Failed to ${what}: ${
    error instanceof Error ? error.message : 'Unknown error'
  }`
}

/**
 * Runs one sponsored action from the console: marks it pending, shows the
 * success notice and refetches the entity, or shows the error notice. The
 * console's transactions all report the same way. It stays pending, and
 * `onSent` waits, until the refetch lands, so nothing shows the old state as
 * if it were current.
 *
 * @returns
 *   - `run(what, send, onSent?)` - `what` finishes "Failed to …"; `send` gets
 *     the wallet's sponsored-transaction function; `onSent` runs after a
 *     successful send, once the entity is refetched
 *   - `pending` - True while an action is being sent or refetched
 */
export function useSponsoredAction(): {
  run: (
    what: string,
    send: (
      sendSponsoredTransaction: SendSponsoredTransactionFn,
    ) => Promise<SponsoredTransactionOutput>,
    onSent?: () => void,
  ) => Promise<void>
  pending: boolean
} {
  const { refetch } = useSmartObject()
  const { notify } = useNotification()
  const { mutateAsync: sendSponsoredTransaction } = useSponsoredTransaction()
  const [pending, setPending] = useState(false)

  const run = async (
    what: string,
    send: (
      sendSponsoredTransaction: SendSponsoredTransactionFn,
    ) => Promise<SponsoredTransactionOutput>,
    onSent?: () => void,
  ) => {
    setPending(true)
    try {
      const result = await send(sendSponsoredTransaction)
      if (result?.digest) {
        notify({ type: Severity.Success, txHash: result.digest })
        await refetch().catch(() => {})
      }
      onSent?.()
    } catch (error) {
      notify({ type: Severity.Error, message: failureMessage(what, error) })
    } finally {
      setPending(false)
    }
  }

  return { run, pending }
}
