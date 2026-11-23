import {
  abbreviateAddress,
  type CharacterSummary,
  canManage as canManageRole,
  isController,
  resolveNewController,
  sameAddress,
  useCharacterSearch,
  useSmartObject,
} from '@evefrontier/dapp-kit'
import { AccessView } from '@eveworld/ui-components'
import React, { useState } from 'react'

import { useFlagVariant, useViewRole } from '../../flags'
import { addController, removeController } from '../../functions/controllers'
import { shortCode } from './format'
import { useControllerRows } from './useControllerRows'
import { useSponsoredAction } from './useSponsoredAction'
import { accessRows, candidates } from './viewProps'

const ADD_ERRORS = {
  invalidAddress: 'Enter a full 0x address: 0x and 64 hex digits.',
  unknownCharacter: 'No character is bound to this wallet.',
  alreadyController: 'Already a controller.',
} as const

const MAX_RESULTS = 8

/**
 * The Access tab: the selected entity's Controllers list, in on-chain order.
 * The shell and controllers see the same panel: they add a controller by
 * pasting the wallet address bound to its character, and remove any
 * controller except the shell, whose entry has no Remove. Visitors see
 * nothing.
 *
 * With `assembly-controller-search` on, the field also finds characters by
 * name; picking one fills in its wallet and adds exactly that character.
 *
 * @returns React.JSX.Element, or null for visitors
 */
const AccessTab = React.memo((): React.JSX.Element | null => {
  const { entity } = useSmartObject()
  const { role, characterId: viewerId } = useViewRole()
  const { run, pending } = useSponsoredAction()

  const canManage = canManageRole(role)
  const {
    rows,
    shellId,
    characters,
    isLoading,
    error: directoryError,
  } = useControllerRows(canManage)

  const [addOpen, setAddOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [picked, setPicked] = useState<CharacterSummary | null>(null)

  const searchOn = useFlagVariant('assembly-controller-search') === 'on'
  const query = address.trim()
  const showResults =
    searchOn &&
    addOpen &&
    !picked &&
    query.length >= 2 &&
    !query.startsWith('0x')
  const search = useCharacterSearch(showResults ? query : '', {
    enabled: canManage && searchOn,
    limit: MAX_RESULTS,
  })

  if (!entity || !canManage) return null

  const locked = pending || entity.inFlight
  const controllers = entity.controllers

  function closeAdd() {
    setAddOpen(false)
    setAddress('')
    setAddError(null)
    setPicked(null)
  }

  const add = (character: CharacterSummary) => {
    const name = character.name || abbreviateAddress(character.characterId)
    return run(
      {
        sending: `Adding ${name}`,
        done: `${name} added as a controller`,
        failed: `Couldn't add ${name}`,
      },
      (sendSponsoredTransaction) =>
        addController({
          entity,
          characterId: character.characterId,
          sendSponsoredTransaction,
        }),
      closeAdd,
    )
  }

  const remove = (characterId: string, label: string) =>
    run(
      {
        sending: `Removing ${label}`,
        done: `${label} removed from controllers`,
        failed: `Couldn't remove ${label}`,
      },
      (sendSponsoredTransaction) =>
        removeController({ entity, characterId, sendSponsoredTransaction }),
    )

  const pick = (character: CharacterSummary) => {
    setAddress(character.walletAddress)
    setPicked(character)
    setAddError(null)
  }

  const submit = () => {
    if (locked || !characters) return
    // A picked search result is added exactly: one wallet can be bound to
    // several characters, and resolving the wallet again would pick the first
    if (picked && sameAddress(query, picked.walletAddress)) {
      if (isController(picked.characterId, controllers, shellId)) {
        setAddError(ADD_ERRORS.alreadyController)
        return
      }
      add(picked)
      return
    }
    const result = resolveNewController(
      address,
      characters,
      controllers,
      shellId,
    )
    if (!result.ok) {
      setAddError(ADD_ERRORS[result.error])
      return
    }
    add(result.character)
  }

  return (
    <AccessView
      rows={accessRows(rows, { viewerId, role, onRemove: remove })}
      loading={isLoading}
      locked={locked}
      add={{
        open: addOpen,
        onOpen: () => setAddOpen(true),
        onClose: closeAdd,
        searchOn,
        value: address,
        onChange: (value) => {
          setAddress(value)
          setAddError(null)
          setPicked(null)
        },
        error: addError,
        picked: picked
          ? {
              name: picked.name || 'Unnamed character',
              code: shortCode(picked.characterId),
            }
          : null,
        search: showResults
          ? {
              status: search.isLoading
                ? 'loading'
                : search.error
                  ? 'error'
                  : 'ready',
              candidates: candidates(search.results, {
                controllers,
                shellId,
                onPick: pick,
              }),
            }
          : null,
        directoryError: !!directoryError,
        canSubmit: !!query && !locked && !isLoading && !!characters,
        onSubmit: submit,
      }}
    />
  )
})

export default AccessTab
