import {
  abbreviateAddress,
  type CharacterSummary,
  resolveNewController,
  Severity,
  sameAddress,
  useCharacterSearch,
  useNotification,
  useSmartObject,
  useSponsoredTransaction,
} from '@evefrontier/dapp-kit'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useFlagVariant, useViewRole } from '../../flags'
import { addController, removeController } from '../../functions/controllers'
import { useControllerRows } from './useControllerRows'

const ADD_ERRORS = {
  invalidAddress: 'Enter a full 0x address: 0x and 64 hex digits.',
  unknownCharacter: 'No character is bound to this wallet.',
  alreadyController: 'Already a controller.',
} as const

const FULL_ADDRESS = /^0x[0-9a-fA-F]{64}$/
const MAX_RESULTS = 8

/**
 * The Access tab: the selected entity's Controllers list, in on-chain order,
 * styled with the grid console's classes (it renders inside `.gc`). The shell
 * and controllers see the same panel: they add a controller by pasting the
 * wallet address bound to its character, and remove any controller except
 * the shell, whose entry has no Remove. Visitors see nothing.
 *
 * With `assembly-controller-search` on, the field also finds characters by
 * name (or wallet prefix); picking one fills in its wallet, so adding still
 * goes through the same wallet-only check.
 *
 * @returns React.JSX.Element, or null for visitors
 */
const AccessTab = React.memo((): React.JSX.Element | null => {
  const { entity, refetch } = useSmartObject()
  const { role, characterId: viewerId } = useViewRole()
  const { notify } = useNotification()
  const { mutateAsync: sendSponsoredTransaction } = useSponsoredTransaction()

  const canManage = role === 'shell' || role === 'controller'
  const { rows, shellId, characters, isLoading } = useControllerRows(canManage)

  const [addOpen, setAddOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [picked, setPicked] = useState<CharacterSummary | null>(null)
  const addInput = useRef<HTMLInputElement>(null)

  const searchOn = useFlagVariant('assembly-controller-search') === 'on'
  const query = address.trim()
  const showResults =
    searchOn &&
    addOpen &&
    !picked &&
    query.length >= 2 &&
    !FULL_ADDRESS.test(query)
  const search = useCharacterSearch(showResults ? query : '', {
    enabled: canManage && searchOn,
  })

  useEffect(() => {
    if (addOpen) addInput.current?.focus()
  }, [addOpen])

  const controllerIds = useMemo(() => entity?.controllers ?? [], [entity])
  // Already a controller: on the access list, or the shell itself
  const isController = (characterId: string) =>
    sameAddress(characterId, shellId) ||
    controllerIds.some((id) => sameAddress(id, characterId))

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
      if (action === addController) closeAdd()
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

  function closeAdd() {
    setAddOpen(false)
    setAddress('')
    setAddError(null)
    setPicked(null)
  }

  const pick = (character: CharacterSummary) => {
    setAddress(character.walletAddress)
    setPicked(character)
    setAddError(null)
    addInput.current?.focus()
  }

  const results = search.results.slice(0, MAX_RESULTS)

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault()
    if (locked || !characters) return
    // A picked search result is added exactly: one wallet can be bound to
    // several characters, and resolving the wallet again would pick the first
    if (picked && sameAddress(query, picked.walletAddress)) {
      if (isController(picked.characterId)) {
        setAddError(ADD_ERRORS.alreadyController)
        return
      }
      send(
        addController,
        picked.characterId,
        picked.name || abbreviateAddress(picked.characterId),
        'add',
      )
      return
    }
    const result = resolveNewController(address, characters, controllerIds)
    if (!result.ok) {
      setAddError(ADD_ERRORS[result.error])
      return
    }
    const { character } = result
    if (isController(character.characterId)) {
      setAddError(ADD_ERRORS.alreadyController)
      return
    }
    send(
      addController,
      character.characterId,
      character.name || abbreviateAddress(character.characterId),
      'add',
    )
  }

  return (
    <div className="acc" id="SmartObject-Controllers">
      <div className="stack">
        <div className="bar-h">
          Controllers<span>{rows.length}</span>
        </div>

        {rows.length === 0 ? (
          <p className="none-note">
            {isLoading ? 'Loading controllers…' : 'No controllers.'}
          </p>
        ) : (
          <div className="plist">
            {rows.map((row) => {
              const isYou =
                sameAddress(row.characterId, viewerId) ||
                (row.isShell && role === 'shell')
              const label = row.name || 'Unknown character'
              const { characterId } = row
              return (
                <div key={row.key} className="person">
                  <span className="pn">
                    <b>{label}</b>
                    {row.isShell && <span className="tag on">Shell</span>}
                    {isYou && <span className="tag pend">You</span>}
                  </span>
                  <span className="pm" title={row.address ?? undefined}>
                    {abbreviateAddress(row.address ?? '')}
                  </span>
                  {!row.isShell && characterId && (
                    <span className="act">
                      <button
                        type="button"
                        className="rm"
                        disabled={locked}
                        onClick={() =>
                          send(removeController, characterId, label, 'remove')
                        }
                      >
                        Remove
                      </button>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="add">
          {addOpen ? (
            <form onSubmit={handleAdd} noValidate>
              <label htmlFor="add-wallet">
                {searchOn
                  ? 'Wallet address or character name'
                  : 'Wallet address'}
                <input
                  id="add-wallet"
                  ref={addInput}
                  value={address}
                  placeholder={searchOn ? '0x… or a name' : '0x…'}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!addError}
                  aria-describedby={addError ? 'add-wallet-error' : undefined}
                  onChange={(event) => {
                    setAddress(event.target.value)
                    setAddError(null)
                    setPicked(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') closeAdd()
                  }}
                />
              </label>
              {picked && (
                <p className="picked">
                  Adding <b>{picked.name || 'Unnamed character'}</b> #
                  {picked.characterId.slice(-6)}
                </p>
              )}
              {showResults &&
                (search.isLoading ? (
                  <p className="none-note">Loading characters…</p>
                ) : search.error ? (
                  <p className="err">Could not load characters.</p>
                ) : results.length === 0 ? (
                  <p className="none-note">No matching characters</p>
                ) : (
                  <ul className="cands" aria-label="Matching characters">
                    {results.map((character) => {
                      const isShell = sameAddress(
                        character.characterId,
                        shellId,
                      )
                      const onList = controllerIds.some((id) =>
                        sameAddress(id, character.characterId),
                      )
                      return (
                        <li key={character.characterId}>
                          <button
                            type="button"
                            className="cand"
                            disabled={isShell || onList}
                            onClick={() => pick(character)}
                          >
                            <span className="cn">
                              {character.name || 'Unnamed character'}
                              <i>#{character.characterId.slice(-6)}</i>
                            </span>
                            {(isShell || onList) && (
                              <span className={`tag${isShell ? ' on' : ''}`}>
                                {isShell ? 'Shell' : 'Controller'}
                              </span>
                            )}
                            <span className="cm">
                              {abbreviateAddress(character.walletAddress)}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ))}
              {addError && (
                <p className="err" id="add-wallet-error">
                  {addError}
                </p>
              )}
              <div className="add-acts">
                <button
                  type="submit"
                  className="gbtn"
                  disabled={!address.trim() || locked || isLoading}
                >
                  Add · 1 transaction
                </button>
                <button type="button" className="gbtn plain" onClick={closeAdd}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="add-open"
              disabled={locked}
              onClick={() => setAddOpen(true)}
            >
              + Add controller
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default AccessTab
