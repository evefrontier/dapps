import {
  type SendSponsoredTransactionFn,
  type SponsoredTransactionOutput,
  useSmartObject,
  useSponsoredTransaction,
} from '@evefrontier/dapp-kit'
import { useToast } from './ToastContext'
import { type ActionLabels, performAction } from './toastModel'

/**
 * Runs one sponsored action from the console: marks it pending and reports
 * it in the toast, Sending, then Done (refetching the entity straight away)
 * or Failed. The console's transactions all report the same way. `pending`
 * is shared by every caller and holds, and `onSent` waits, until the refetch
 * lands, so nothing in the console shows or unlocks on the old state.
 *
 * @returns
 *   - `run(labels, send, onSent?)` - `labels` are the toast's Sending, Done
 *     and Failed titles; `send` gets the wallet's sponsored-transaction
 *     function; `onSent` runs after a successful send, once the entity is
 *     refetched
 *   - `pending` - True while any console action is being sent or refetched
 */
export function useSponsoredAction(): {
  run: (
    labels: ActionLabels,
    send: (
      sendSponsoredTransaction: SendSponsoredTransactionFn,
    ) => Promise<SponsoredTransactionOutput>,
    onSent?: () => void,
  ) => Promise<void>
  pending: boolean
} {
  const { refetch } = useSmartObject()
  const { show, pending, setPending } = useToast()
  const { mutateAsync: sendSponsoredTransaction } = useSponsoredTransaction()

  const run = async (
    labels: ActionLabels,
    send: (
      sendSponsoredTransaction: SendSponsoredTransactionFn,
    ) => Promise<SponsoredTransactionOutput>,
    onSent?: () => void,
  ) => {
    if (pending) return
    setPending(true)
    try {
      const sent = await performAction({
        labels,
        send: () => send(sendSponsoredTransaction),
        show,
        refetch,
      })
      if (sent) onSent?.()
    } finally {
      setPending(false)
    }
  }

  return { run, pending }
}
