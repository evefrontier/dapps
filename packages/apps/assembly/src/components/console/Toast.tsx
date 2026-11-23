import { getTxUrl } from '@evefrontier/dapp-kit'
import { ToastView } from '@eveworld/ui-components'
import { useToast } from './ToastContext'
import { toastData } from './toastModel'

/** The console's transaction toast: the current toast, drawn by ToastView. */
const Toast = () => {
  const { toast, dismiss } = useToast()
  return (
    <ToastView
      toast={
        toast
          ? {
              ...toastData(toast, (digest) => getTxUrl('sui:testnet', digest)),
              id: toast.id,
            }
          : null
      }
      onDismiss={dismiss}
    />
  )
}

export default Toast
