import {
  abbreviateAddress,
  resolveNewController,
  Severity,
  sameAddress,
  useCharacterDirectory,
  useNotification,
  useSmartObject,
  useSponsoredTransaction,
} from '@evefrontier/dapp-kit'
import { EveButton } from '@eveworld/ui-components'
import { TextField } from '@mui/material'
import React, { useMemo, useState } from 'react'

import { useViewRole } from '../flags'
import { addController, removeController } from '../functions/controllers'

const ADD_ERRORS = {
  invalidAddress: 'Enter a full 0x address: 0x and 64 hex digits.',
  unknownCharacter: 'No character is bound to this wallet.',
  alreadyController: 'Already a controller.',
} as const

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="border border-neutral-30 px-1 text-xs uppercase opacity-80">
    {children}
  </span>
)

/**
 * The selected entity's Controllers list, in on-chain order. The shell and
 * controllers see the same panel: they add a controller by pasting the
 * wallet address bound to its character, and remove any controller except
 * the shell, whose entry has no Remove. Visitors see nothing.
 *
 * @returns React.JSX.Element, or null for visitors
 */
const Controllers = React.memo((): React.JSX.Element | null => {
  const { entity, entityOwner, refetch } = useSmartObject()
  const { role, characterId: viewerId } = useViewRole()
  const { notify } = useNotification()
  const { mutateAsync: sendSponsoredTransaction } = useSponsoredTransaction()

  const canManage = role === 'shell' || role === 'controller'
  const directory = useCharacterDirectory({ enabled: canManage })

  const [address, setAddress] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const controllerIds = useMemo(() => entity?.controllers ?? [], [entity])
  const characters = directory.data ?? []
  const characterOf = (id: string) =>
    characters.find((c) => sameAddress(c.characterId, id))

  // The shell's character: the cap's holder when it is parked on a
  // character, otherwise the character bound to the holding wallet
  const shellId =
    entityOwner?.kind === 'character'
      ? entityOwner.holder
      : (characters.find((c) =>
          sameAddress(c.walletAddress, entityOwner?.walletAddress),
        )?.characterId ?? null)

  if (!entity || !canManage) return null

  const locked = pending || entity.inFlight

  const send = async (
    action: typeof addController,
    characterId: string,
    label: string,
    verb: string,
  ) => {
    setPending(true)
    try {
      const result = await action({
        entity,
        characterId,
        sendSponsoredTransaction,
      })
      if (result?.digest) {
        notify({
          type: Severity.Success,
          txHash: result.digest,
          onSuccess: async () => {
            await refetch()
          },
        })
      }
      if (action === addController) setAddress('')
    } catch (e) {
      notify({
        type: Severity.Error,
        message: `Failed to ${verb} ${label}: ${
          e instanceof Error ? e.message : 'Unknown error'
        }`,
      })
    } finally {
      setPending(false)
    }
  }

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault()
    if (locked || !directory.data) return
    const result = resolveNewController(address, directory.data, controllerIds)
    if (!result.ok) {
      setAddError(ADD_ERRORS[result.error])
      return
    }
    const { character } = result
    send(
      addController,
      character.characterId,
      character.name || abbreviateAddress(character.characterId),
      'add',
    )
  }

  return (
    <div className="flex flex-col gap-4" id="SmartObject-Controllers">
      <span className="text-sm uppercase">
        Controllers · {controllerIds.length}
      </span>

      {controllerIds.length === 0 ? (
        <span className="text-xs opacity-60">
          Only the shell controls this assembly.
        </span>
      ) : (
        <ul className="flex flex-col gap-2">
          {controllerIds.map((id) => {
            const character = characterOf(id)
            const isShell = sameAddress(id, shellId)
            const isYou =
              sameAddress(id, viewerId) || (isShell && role === 'shell')
            const label = character?.name || 'Unknown character'
            return (
              <li key={id} className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2">
                    {label}
                    {isShell && <Tag>Shell</Tag>}
                    {isYou && <Tag>You</Tag>}
                  </span>
                  <span className="text-xs opacity-60" title={id}>
                    {abbreviateAddress(character?.walletAddress ?? id)}
                  </span>
                </div>
                {!isShell && (
                  <EveButton
                    variant="secondary"
                    size="sm"
                    disabled={locked}
                    onClick={() => send(removeController, id, label, 'remove')}
                  >
                    Remove
                  </EveButton>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form className="flex items-start gap-2" onSubmit={handleAdd} noValidate>
        <TextField
          className="grow"
          size="small"
          label="Wallet address"
          placeholder="0x…"
          value={address}
          onChange={(event) => {
            setAddress(event.target.value)
            setAddError(null)
          }}
          error={!!addError}
          helperText={addError ?? ' '}
          slotProps={{
            htmlInput: { spellCheck: false, autoComplete: 'off' },
          }}
        />
        <EveButton
          type="submit"
          variant="primary"
          size="sm"
          disabled={!address.trim() || locked || directory.isLoading}
        >
          Add
        </EveButton>
      </form>
    </div>
  )
})

export default Controllers
