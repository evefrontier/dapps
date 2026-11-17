import type { ReactNode } from 'react'
import { createContext, useCallback, useState } from 'react'
import {
  type NotificationContextType,
  type NotificationState,
  Severity,
} from '../types'

/** @category Providers */
export const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
  notification: {
    message: '',
    txHash: '',
    onSuccess: () => {},
    severity: Severity.Success,
    handleClose: () => {},
    isOpen: false,
  },
  handleClose: () => {},
})

/** Message shown when notify() is called without one. */
const DEFAULT_MESSAGES: Record<Severity, string> = {
  [Severity.Success]: 'Operation completed successfully.',
  [Severity.Error]: 'An error occurred.',
  [Severity.Warning]: 'Warning.',
  [Severity.Info]: 'Processing...',
}

/**
 * NotificationProvider manages notifications for transactions and messages.
 *
 * @category Providers
 */
const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [severity, setSeverity] = useState<Severity>(Severity.Info)
  const [txHash, setTxHash] = useState<string>('')
  const [onSuccess, setOnSuccess] = useState<NotificationState['onSuccess']>(
    () => () => {},
  )

  const handleClose = useCallback(() => {
    setIsOpen(false)
    if (severity === Severity.Success) {
      onSuccess()
    }
    setOnSuccess(() => () => {})
  }, [onSuccess, severity])

  const notify = useCallback(
    ({
      type,
      message,
      txHash,
      onSuccess,
    }: {
      type: Severity
      message?: string
      txHash?: string
      onSuccess?: () => void
    }) => {
      setSeverity(type)
      setIsOpen(true)
      setOnSuccess(() => onSuccess ?? (() => {}))

      // If success with txHash, show success message with transaction hash
      if (type === Severity.Success && txHash) {
        setMessage(
          `Transaction was successful. ${message ?? ''} Transaction hash: ${txHash}`,
        )
        setTxHash(txHash)
        return
      }

      // Otherwise, show the passed message or a default based on severity
      setMessage(message || (DEFAULT_MESSAGES[type] ?? 'Processing...'))
      setTxHash(txHash ?? '')
    },
    [],
  )

  const notification: NotificationState = {
    message,
    txHash,
    onSuccess,
    severity,
    handleClose,
    isOpen,
  }

  return (
    <NotificationContext.Provider value={{ notify, handleClose, notification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export default NotificationProvider
