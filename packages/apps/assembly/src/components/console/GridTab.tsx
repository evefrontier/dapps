import {
  type EntityData,
  type EntityPowerGrid,
  type GridSummary,
  type NoPowerReason,
  useTypeNames,
} from '@evefrontier/dapp-kit'
import { useMemo } from 'react'

import { ago, hoursMinutes, mw, shortCode, units } from './format'
import MainBreaker from './MainBreaker'
import { type BoardCard, buildBoard, NO_POWER_LABEL } from './model'

const FUEL_SEGMENTS = 30
const LOW_FUEL = 0.1

const Readouts = ({ summary }: { summary: GridSummary }) => (
  <>
    <div className="ro">
      <div>
        <span>Output</span>
        <b>
          {mw(summary.outputMw)}
          <small>MW</small>
        </b>
      </div>
      <div>
        <span>Draw</span>
        <b>
          {mw(summary.drawMw)}
          <small>MW</small>
        </b>
      </div>
      <div>
        <span>Headroom</span>
        <b>
          {mw(summary.headroomMw)}
          <small>MW</small>
        </b>
      </div>
    </div>
    <div className="gauge-row">
      <div>
        <span>Power grid</span>
        <b>
          {mw(summary.drawMw)} / {mw(summary.outputMw)} MW
        </b>
      </div>
      <div className="gauge">
        <i
          style={{
            width: `${
              summary.outputMw > 0n
                ? Math.min(
                    100,
                    (Number(summary.drawMw) / Number(summary.outputMw)) * 100,
                  ).toFixed(1)
                : 0
            }%`,
          }}
        />
      </div>
    </div>
  </>
)

/** What each no-power banner adds under its title (the title is NO_POWER_LABEL). */
const NO_POWER_BODY: Partial<Record<NoPowerReason, string>> = {
  outOfFuel:
    'The generator has stopped. Modules that are switched on resume when fuel is added in the game.',
  generatorOff:
    'No generator is switched on. Modules that are switched on resume when one is.',
}

/** At most one banner: why the grid is not running, or that fuel is low. */
const Banner = ({ summary }: { summary: GridSummary }) => {
  if (summary.status === 'off') {
    return (
      <p className="banner red">
        <b>Power off</b>The main breaker is open. Every module is offline and
        each breaker keeps its setting.
      </p>
    )
  }
  const body = summary.reason ? NO_POWER_BODY[summary.reason] : undefined
  if (summary.reason && body) {
    return (
      <p className="banner amber">
        <b>{NO_POWER_LABEL[summary.reason]}</b>
        {body}
      </p>
    )
  }
  if (summary.fuelFraction < LOW_FUEL && summary.msUntilEmpty !== null) {
    return (
      <p className="banner amber">
        <b>Fuel low · ≈ {hoursMinutes(summary.msUntilEmpty)} left</b>
        At the current draw of {mw(summary.drawMw)} MW. Add fuel in the game to
        keep it running.
      </p>
    )
  }
  return null
}

const FuelPanel = ({
  grid,
  summary,
  nowMs,
}: {
  grid: EntityPowerGrid
  summary: GridSummary
  nowMs: number
}) => {
  const fuelPct = summary.fuelFraction
  const filled = Math.round(fuelPct * FUEL_SEGMENTS)
  const estimate =
    summary.msUntilEmpty !== null && summary.fuelNow > 0n ? (
      <>
        ≈ <em>{units(summary.fuelNow)}</em> now ·{' '}
        <em>{hoursMinutes(summary.msUntilEmpty)}</em> left
      </>
    ) : summary.fuelNow === 0n ? (
      'Empty'
    ) : !grid.on ? (
      'Not burning · main breaker off'
    ) : (
      'Not burning'
    )
  return (
    <div className="fuel">
      <div className="fuel-h">
        <b>Fuel</b>
        <span>Settled {ago(nowMs - Number(grid.lastSettledMs))}</span>
      </div>
      <div
        className={`segs ${fuelPct < LOW_FUEL ? 'low' : ''}`}
        role="img"
        aria-label={`Fuel ${Math.round(fuelPct * 100)} percent`}
      >
        {Array.from({ length: FUEL_SEGMENTS }, (_, i) => (
          <i key={i} className={i < filled ? 'f' : ''} />
        ))}
      </div>
      <div className="fuel-n">
        <span>
          <b>{units(summary.fuelSettled)}</b>{' '}
          <small>/ {units(summary.fuelCapacity)} units</small>
        </span>
        <span className="est">{estimate}</span>
      </div>
      <div className="src">
        {Object.entries(grid.fuelSources).map(([id, capacity]) => (
          <div key={id}>
            <span>Fuel {shortCode(id)}</span>
            <b>{units(capacity)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

const BreakerCard = ({ card, name }: { card: BoardCard; name: string }) => (
  <div className="card" data-state={card.lamp ?? undefined}>
    <span className="card-l">{card.lamp && <span className="led" />}</span>
    <span className="card-b">
      <span className="card-n">
        <b>
          {name}
          <i>{card.code}</i>
        </b>
        <span>{card.statusLabel}</span>
      </span>
      <span className="card-u">
        <span>{card.spec.label}</span>
        <span>{card.spec.value}</span>
      </span>
      {card.detail && <span className="card-s">{card.detail}</span>}
    </span>
  </div>
)

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

  if (!grid || !summary) {
    return <p className="none-note">This Assembly has no power grid.</p>
  }

  return (
    <div className="cols">
      <div className="stack ctl">
        <MainBreaker entity={entity} on={grid.on} writable={writable} />
        <Readouts summary={summary} />
        <Banner summary={summary} />
        <FuelPanel grid={grid} summary={summary} nowMs={nowMs} />
      </div>
      <div className="stack">
        {board.length ? (
          <div className="board">
            {board.map((section) => (
              <section key={section.id} className="col">
                <div className="col-h">
                  <b>{section.name}</b>
                  <span>{mw(section.drawMw)} MW</span>
                </div>
                {section.cards.map((card) => (
                  <BreakerCard
                    key={card.componentId}
                    card={card}
                    name={
                      (card.typeId && names[card.typeId]) || card.fallbackName
                    }
                  />
                ))}
              </section>
            ))}
          </div>
        ) : (
          <p className="none-note">No modules are installed.</p>
        )}
      </div>
    </div>
  )
}

export default GridTab
