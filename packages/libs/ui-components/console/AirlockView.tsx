/** One airlock card. `items` undefined hides the contents (visitors). */
export interface AirlockData {
  id: string
  name: string
  code: string
  sectionName: string | null
  used: string
  capacity: string
  /** How full it is, 0 to 1. */
  fraction: number
  items?: { id: string; name: string; quantity: string; volume: string }[]
}

/**
 * The Airlock tab: one card per airlock with its section, how full it is in
 * m³ and, when `items` is given, what it holds.
 */
const AirlockView = ({ airlocks }: { airlocks: AirlockData[] }) => (
  <div className="secs">
    {airlocks.map((airlock) => (
      <div key={airlock.id} className="sec">
        <div className="sec-h">
          <b>{airlock.name}</b>
          <span>
            {airlock.code}
            {airlock.sectionName && ` · ${airlock.sectionName}`}
          </span>
        </div>
        <div className="inv-r">
          <span>Used</span>
          <b>
            {airlock.used} / {airlock.capacity} m³
          </b>
          <div className="meter">
            <i
              style={{
                width: `${Math.min(100, airlock.fraction * 100).toFixed(1)}%`,
              }}
            />
          </div>
        </div>
        {airlock.items &&
          (airlock.items.length ? (
            <ul className="inv-items">
              {airlock.items.map((item) => (
                <li key={item.id}>
                  <span className="itm-ic" aria-hidden="true" />
                  <span className="in">{item.name}</span>
                  <span className="iq">×{item.quantity}</span>
                  <span className="iv">{item.volume} m³</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="none-note">Empty</p>
          ))}
      </div>
    ))}
  </div>
)

export default AirlockView
