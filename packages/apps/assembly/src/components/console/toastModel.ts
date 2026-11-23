import type { SponsoredTransactionOutput } from '@evefrontier/dapp-kit'

/** The console's one transaction toast, in each of its three states. */
export type Toast =
  | { kind: 'sending'; title: string }
  | { kind: 'done'; title: string; digest: string }
  | { kind: 'failed'; title: string; detail: string; raw?: string }

/** What the toast says for one action, e.g. "Main breaker switched off". */
export interface ActionLabels {
  sending: string
  done: string
  failed: string
}

/** The detail line when a long error is folded under Show details. */
export const CHAIN_REJECTED = 'The chain rejected the transaction.'
export const TRANSACTION_FAILED = 'The transaction failed.'
export const UNKNOWN_ERROR = 'Unknown error.'

/** Errors longer than this are folded under Show details. */
const SHORT_ERROR_MAX = 120
const CHAIN_ERROR = /MoveAbort|Dry run failed|ExecutionError|InsufficientGas/i

/**
 * Splits an error into the toast's detail line and, for a raw chain error or
 * any long one, the full text behind Show details. A short wallet error such
 * as "No wallet connected." is shown as it is.
 */
export function splitError(error: unknown): { detail: string; raw?: string } {
  const message = error instanceof Error ? error.message.trim() : ''
  if (!message) return { detail: UNKNOWN_ERROR }
  if (CHAIN_ERROR.test(message)) return { detail: CHAIN_REJECTED, raw: message }
  if (message.length > SHORT_ERROR_MAX) {
    return { detail: TRANSACTION_FAILED, raw: message }
  }
  return { detail: message }
}

/** A transaction digest shortened for the toast, e.g. "8Kx2…Qm4T". */
export function shortDigest(digest: string): string {
  return digest.length > 12
    ? `${digest.slice(0, 4)}…${digest.slice(-4)}`
    : digest
}

/**
 * Runs one console action through the toast: Sending, then Done (and a
 * refetch of the entity straight away) or Failed. A send that returns no
 * digest clears the toast. It resolves only once the refetch has, so a caller
 * that locks its controls until then never unlocks them on the old state.
 *
 * @returns True when the transaction was sent
 */
export async function performAction({
  labels,
  send,
  show,
  refetch,
}: {
  labels: ActionLabels
  send: () => Promise<SponsoredTransactionOutput>
  show: (toast: Toast | null) => void
  refetch: () => Promise<void>
}): Promise<boolean> {
  show({ kind: 'sending', title: labels.sending })
  let result: SponsoredTransactionOutput
  try {
    result = await send()
  } catch (error) {
    show({ kind: 'failed', title: labels.failed, ...splitError(error) })
    return false
  }
  if (result?.digest) {
    show({ kind: 'done', title: labels.done, digest: result.digest })
    await refetch().catch(() => {})
  } else {
    show(null)
  }
  return true
}
