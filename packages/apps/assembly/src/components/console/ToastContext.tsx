import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  /** Takes the console's write lock; false when another write holds it */
  lock: () => boolean
  unlock: () => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: null,
  show: () => {},
  dismiss: () => {},
  pending: false,
  lock: () => true,
  unlock: () => {},
})

/**
 * Holds the console's one toast, and the lock its writes share. Writes lock
 * the whole console while they are in flight, so there is never more than one
 * to show: a new toast replaces the last. The lock is a ref, so two writes
 * started in the same tick can't both take it; `pending` mirrors it for
 * rendering.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ShownToast | null>(null)
  const [pending, setPending] = useState(false)
  const locked = useRef(false)

  const show = useCallback((next: Toast | null) => {
    setToast((last) => (next ? { ...next, id: (last?.id ?? 0) + 1 } : null))
  }, [])
  const dismiss = useCallback(() => setToast(null), [])
  const lock = useCallback(() => {
    if (locked.current) return false
    locked.current = true
    setPending(true)
    return true
  }, [])
  const unlock = useCallback(() => {
    locked.current = false
    setPending(false)
  }, [])

  const value = useMemo(
    () => ({ toast, show, dismiss, pending, lock, unlock }),
    [toast, show, dismiss, pending, lock, unlock],
  )
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

/**
 * The console's toast, `show` / `dismiss` to change it, and the shared
 * write lock: `lock` / `unlock`, and `pending` while it is held.
 */
export const useToast = () => useContext(ToastContext)
