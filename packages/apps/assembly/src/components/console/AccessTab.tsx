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
import React, { useEffect, useRef, useState } from 'react'

import { useFlagVariant, useViewRole } from '../../flags'
import { addController, removeController } from '../../functions/controllers'
import { shortCode } from './format'
import { useControllerRows } from './useControllerRows'
import { useSponsoredAction } from './useSponsoredAction'

const ADD_ERRORS = {
  invalidAddress: 'Enter a full 0x address: 0x and 64 hex digits.',
  unknownCharacter: 'No character is bound to this wallet.',
  alreadyController: 'Already a controller.',
} as const

const MAX_RESULTS = 8

/**
 * The Access tab: the selected entity's Controllers list, in on-chain order,
 * styled with the grid console's classes (it renders inside `.gc`). The shell
 * and controllers see the same panel: they add a controller by pasting the
 * wallet address bound to its character, and remove any controller except
 * the shell, whose entry has no Remove. Visitors see nothing.
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
  const addInput = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (addOpen) addInput.current?.focus()
  }, [addOpen])

  if (!entity || !canManage) return null

  const locked = pending || entity.inFlight

  const controllers = entity.controllers

  const add = (character: CharacterSummary) =>
    run(
      `add ${character.name || abbreviateAddress(character.characterId)}`,
      (sendSponsoredTransaction) =>
        addController({
          entity,
          characterId: character.characterId,
          sendSponsoredTransaction,
        }),
      closeAdd,
    )

  const remove = (characterId: string, label: string) =>
    run(`remove ${label}`, (sendSponsoredTransaction) =>
      removeController({ entity, characterId, sendSponsoredTransaction }),
    )

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

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault()
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
                        onClick={() => remove(characterId, label)}
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
                  Adding <b>{picked.name || 'Unnamed character'}</b>{' '}
                  {shortCode(picked.characterId)}
                </p>
              )}
              {showResults &&
                (search.isLoading ? (
                  <p className="none-note">Loading characters…</p>
                ) : search.error ? (
                  <p className="err">Could not load characters.</p>
                ) : search.results.length === 0 ? (
                  <p className="none-note">No matching characters</p>
                ) : (
                  <ul className="cands" aria-label="Matching characters">
                    {search.results.map((character) => {
                      const isShell = sameAddress(
                        character.characterId,
                        shellId,
                      )
                      const onList = isController(
                        character.characterId,
                        controllers,
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
                              <i>{shortCode(character.characterId)}</i>
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
              {directoryError && (
                <p className="err">Could not load characters.</p>
              )}
              {addError && (
                <p className="err" id="add-wallet-error">
                  {addError}
                </p>
              )}
              <div className="add-acts">
                <button
                  type="submit"
                  className="gbtn"
                  disabled={
                    !address.trim() || locked || isLoading || !characters
                  }
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
