import type { ReactNode } from 'react'

import type { LampState } from './IdentityView'

const FUEL_SEGMENTS = 30

/** Output, draw and headroom (MW, already formatted) and the gauge fill. */
export interface GridReadouts {
  outputMw: string
  drawMw: string
  headroomMw: string
  /** Draw as a share of output, 0 to 100. */
  gaugePercent: number
}

/** At most one banner: why the grid is not running, or that fuel is low. */
export interface GridBanner {
  tone: 'red' | 'amber'
  title: string
  body: string
}

export interface FuelPanelData {
  /** When the fuel was last settled, e.g. "3 min ago". */
  settledAgo: string
  /** How full the tank is, 0 to 1. */
  fraction: number
  low: boolean
  /** The projected amount now, e.g. "≈ 4,200". */
  amount: string
  capacity: string
  /** What `amount` and `capacity` count, e.g. "kg". Defaults to "units". */
  unit?: string
  /** The burn row: fuel burned per hour, the draw that burns it, and how long it runs at that rate. */
  burn: {
    /** Lights the Burn figure while something burns */
    burning: boolean
    /** e.g. "40.0" */
    rate: string
    /** e.g. "kg/h" */
    rateUnit: string
    /** MW drawn while burning, else "0" */
    drawMw: string
    /** e.g. "2 h 03 m", or "—" while nothing burns */
    runsFor: string
  }
  /** Under the burn row: the burn per MW-hour while burning, else why nothing burns. */
  burnNote: string
  /** Each fuel source and what it holds, e.g. `{ label: "Fuel bay #612625", units: "1,000.00 kg" }`. */
  sources: { id: string; label: string; units: string }[]
}

/** A breaker card on the board. `lamp` is null for a part with no breaker. */
export interface BreakerCardData {
  id: string
  lamp: LampState | null
  name: string
  code: string
  status: string
  specLabel: string
  specValue: string
  detail: string | null
  /** `burn`: the detail is the card's share of the fuel burn, set in a quieter tone */
  detailTone?: 'burn'
}

export interface BoardSectionData {
  id: string
  name: string
  drawMw: string
  cards: BreakerCardData[]
}

const Readouts = ({ readouts }: { readouts: GridReadouts }) => (
  <>
    <div className="ro">
      <div>
        <span>Output</span>
        <b>
          {readouts.outputMw}
          <small>MW</small>
        </b>
      </div>
      <div>
        <span>Draw</span>
        <b>
          {readouts.drawMw}
          <small>MW</small>
        </b>
      </div>
      <div>
        <span>Headroom</span>
        <b>
          {readouts.headroomMw}
          <small>MW</small>
        </b>
      </div>
    </div>
    <div className="gauge-row">
      <div>
        <span>Power grid</span>
        <b>
          {readouts.drawMw} / {readouts.outputMw} MW
        </b>
      </div>
      <div className="gauge">
        <i style={{ width: `${readouts.gaugePercent.toFixed(1)}%` }} />
      </div>
    </div>
  </>
)

const FuelPanel = ({ fuel }: { fuel: FuelPanelData }) => {
  const filled = Math.round(fuel.fraction * FUEL_SEGMENTS)
  return (
    <div className="fuel">
      <div className="fuel-h">
        <b>Fuel</b>
        <span>Settled {fuel.settledAgo}</span>
      </div>
      <div
        className={`segs ${fuel.low ? 'low' : ''}`}
        role="img"
        aria-label={`Fuel ${Math.round(fuel.fraction * 100)} percent`}
      >
        {Array.from({ length: FUEL_SEGMENTS }, (_, i) => (
          <i key={i} className={i < filled ? 'f' : ''} />
        ))}
      </div>
      <div className="fuel-n">
        <span>
          <b>{fuel.amount}</b>{' '}
          <small>
            / {fuel.capacity} {fuel.unit ?? 'units'}
          </small>
        </span>
      </div>
      <div
        className={`ro burn ${fuel.burn.burning ? 'on' : ''}`}
        title="Fuel burned per hour at the current draw: MW drawn × 3600 ÷ fuel impulse, split across the running generators"
      >
        <div className="bn">
          <span>Burn</span>
          <b>
            {fuel.burn.rate}
            <small>{fuel.burn.rateUnit}</small>
          </b>
        </div>
        <div>
          <span>At draw</span>
          <b>
            {fuel.burn.drawMw}
            <small>MW</small>
          </b>
        </div>
        <div>
          <span>Runs for</span>
          <b>{fuel.burn.runsFor}</b>
        </div>
      </div>
      <p className="burn-k">{fuel.burnNote}</p>
      <div className="src">
        {fuel.sources.map((source) => (
          <div key={source.id}>
            <span>{source.label}</span>
            <b>{source.units}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

const BreakerCard = ({ card }: { card: BreakerCardData }) => (
  <div className="card" data-state={card.lamp ?? undefined}>
    <span className="card-l">{card.lamp && <span className="led" />}</span>
    <span className="card-b">
      <span className="card-n">
        <b>
          {card.name}
          <i>{card.code}</i>
        </b>
        <span>{card.status}</span>
      </span>
      <span className="card-u">
        <span>{card.specLabel}</span>
        <span>{card.specValue}</span>
      </span>
      {card.detail && (
        <span
          className={`card-s ${card.detailTone === 'burn' ? 'burn-s' : ''}`}
        >
          {card.detail}
        </span>
      )}
    </span>
  </div>
)

/**
 * The Grid tab: the main breaker (the `breaker` slot), readouts, at most one
 * banner and fuel on the left; the board of sections and breaker cards on
 * the right. With no `grid`, a note that there is no power grid.
 */
const GridView = ({
  grid,
  sections,
  breaker,
}: {
  grid: {
    readouts: GridReadouts
    banner: GridBanner | null
    fuel: FuelPanelData
  } | null
  sections: BoardSectionData[]
  breaker: ReactNode
}) => {
  if (!grid) {
    return <p className="none-note">This Assembly has no power grid.</p>
  }

  return (
    <div className="cols">
      <div className="stack ctl">
        {breaker}
        <Readouts readouts={grid.readouts} />
        {grid.banner && (
          <p className={`banner ${grid.banner.tone}`}>
            <b>{grid.banner.title}</b>
            {grid.banner.body}
          </p>
        )}
        <FuelPanel fuel={grid.fuel} />
      </div>
      <div className="stack">
        {sections.length ? (
          <div className="board">
            {sections.map((section) => (
              <section key={section.id} className="col">
                <div className="col-h">
                  <b>{section.name}</b>
                  <span>{section.drawMw} MW</span>
                </div>
                {section.cards.map((card) => (
                  <BreakerCard key={card.id} card={card} />
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

export default GridView
