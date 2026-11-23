import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import type { Toast } from './toastModel'

/** A shown toast; `id` changes with every toast so each one starts fresh. */
export type ShownToast = Toast & { id: number }

interface ToastContextValue {
  toast: ShownToast | null
  show: (toast: Toast | null) => void
  dismiss: () => void
  /** True while any console action is being sent or refetched */
  pending: boolean
  setPending: (pending: boolean) => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: null,
  show: () => {},
  dismiss: () => {},
  pending: false,
  setPending: () => {},
})

/**
 * Holds the console's one toast, and the lock its writes share. Writes lock
 * the whole console while they are in flight, so there is never more than one
 * to show: a new toast replaces the last.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ShownToast | null>(null)
  const [pending, setPending] = useState(false)

  const show = useCallback((next: Toast | null) => {
    setToast((last) => (next ? { ...next, id: (last?.id ?? 0) + 1 } : null))
  }, [])
  const dismiss = useCallback(() => setToast(null), [])

  const value = useMemo(
    () => ({ toast, show, dismiss, pending, setPending }),
    [toast, show, dismiss, pending],
  )
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

/**
 * The console's toast, `show` / `dismiss` to change it, and the shared
 * `pending` lock.
 */
export const useToast = () => useContext(ToastContext)
