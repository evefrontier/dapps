import {
  type EntityData,
  type GridSummary,
  useTypeNames,
} from '@evefrontier/dapp-kit'
import { GridView } from '@eveworld/ui-components'
import { useMemo } from 'react'

import MainBreaker from './MainBreaker'
import { buildBoard } from './model'
import { boardSections, fuelPanel, gridBanner, gridReadouts } from './viewProps'

/**
 * Is it running, and what is on? The main breaker, output, draw and headroom,
 * fuel, and every section's modules as lamp cards with their state and any
 * reason they have no power. The shell and controllers switch the main
 * breaker; the board is read-only for every role.
 */
const GridTab = ({
  entity,
  summary,
  nowMs,
  writable,
}: {
  entity: EntityData
  summary: GridSummary | null
  nowMs: number
  /** Shell or controller: the main breaker is a lever, not a lamp */
  writable: boolean
}) => {
  const board = useMemo(() => buildBoard(entity, nowMs), [entity, nowMs])
  const typeIds = useMemo(
    () =>
      board.flatMap((section) =>
        section.cards.flatMap((card) => (card.typeId ? [card.typeId] : [])),
      ),
    [board],
  )
  const names = useTypeNames(typeIds)
  const grid = entity.powerGrid

  return (
    <GridView
      grid={
        grid && summary
          ? {
              readouts: gridReadouts(summary),
              banner: gridBanner(summary),
              fuel: fuelPanel(grid, summary, nowMs),
            }
          : null
      }
      sections={boardSections(board, names)}
      breaker={
        grid && <MainBreaker entity={entity} on={grid.on} writable={writable} />
      }
    />
  )
}

export default GridTab
