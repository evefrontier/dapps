import { useEffect, useMemo, useState } from 'react'
import { createLogger } from '../../utils'
import {
  type FetchObjectDataInput,
  type ObjectSelection,
  readObjectSelection,
  toFetchObjectDataInput,
} from '../../utils/smartObject'

const log = createLogger()

/**
 * Reads the object to show once on mount: a Sui object ID from VITE_OBJECT_ID,
 * else ?itemId= with ?tenant= (fallback DEFAULT_TENANT).
 */
export function useObjectSelection(): {
  selection: ObjectSelection | null
  /** Fetch input for the selection, or null until an object is selected. */
  input: FetchObjectDataInput | null
} {
  const [selection, setSelection] = useState<ObjectSelection | null>(null)

  useEffect(() => {
    log.info('[DappKit] SmartObjectProvider: Checking for item ID')

    const next = readObjectSelection(
      window.location.search,
      import.meta.env.VITE_OBJECT_ID,
    )

    if (!next) {
      log.error('[DappKit] SmartObjectProvider: No object ID provided')
      return
    }

    if (next.isObjectIdDirect) {
      log.info(
        '[DappKit] SmartObjectProvider: Using Sui object ID from env:',
        next.objectId,
      )
    }
    setSelection(next)
  }, [])

  const input = useMemo(
    () =>
      selection
        ? toFetchObjectDataInput(
            selection.objectId,
            selection.tenant,
            selection.isObjectIdDirect,
          )
        : null,
    [selection],
  )

  return { selection, input }
}
