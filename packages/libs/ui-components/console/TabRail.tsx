export type ConsoleTab = 'dapp' | 'grid' | 'airlock' | 'access'

const LABEL: Record<ConsoleTab, string> = {
  dapp: 'Dapp',
  grid: 'Grid',
  airlock: 'Airlock',
  access: 'Access',
}

// Glyph drawn inside each diamond, in the diamond's 80×80 box
const GLYPH: Record<ConsoleTab, string> = {
  grid: 'M43 27 34 41h6.5l-2.5 12 9-14.5h-6.5z',
  airlock:
    'M28 34 40 28 52 34v12l-12 6-12-6zM28 34l12 6 12-6M40 40v12M34 31l12 6',
  access: 'M33 39h14v12H33zM35.5 39v-4a4.5 4.5 0 0 1 9 0v4M40 43.5v3',
  dapp: 'M28.5 31h23v18h-23zM28.5 35.5h23M31.5 33.2h1M34.5 33.2h1',
}

// Small crosses at the diamond's four points
const TIPS = [
  [40, 5],
  [75, 40],
  [40, 75],
  [5, 40],
]
  .map(([x, y]) => `M${x - 3} ${y}h6M${x} ${y - 3}v6`)
  .join('')

/** The diamond tab rail from the Creation Builder. */
const TabRail = ({
  tabs,
  active,
  onSelect,
}: {
  tabs: ConsoleTab[]
  active: ConsoleTab
  onSelect: (tab: ConsoleTab) => void
}) => (
  <div className="rail" role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab}
        type="button"
        className="tab"
        role="tab"
        aria-selected={tab === active}
        onClick={() => onSelect(tab)}
      >
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <path className="dia" d="M40 5 75 40 40 75 5 40Z" />
          <path d={TIPS} />
          <path d={GLYPH[tab]} />
        </svg>
        <span className="tl">{LABEL[tab]}</span>
      </button>
    ))}
  </div>
)

export default TabRail
