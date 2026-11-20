import {
  abbreviateAddress,
  type EntityData,
  type EntityOwner,
  type EntityRole,
  type GridSummary,
} from '@evefrontier/dapp-kit'

import { ago, hostOf, mw } from './format'
import { gridLamp } from './model'

/** The shell's character name, or its wallet when the character has none. */
const shellLabel = (owner: EntityOwner | null): string =>
  owner?.character?.metadata?.name ||
  abbreviateAddress(owner?.walletAddress ?? owner?.holder ?? '') ||
  'Unknown'

/**
 * The Assembly at a glance, on every tab: code, name, whether it is running,
 * description, shell, controller count, dapp link, sections, fuel and when the
 * grid last settled. Read-only; editing the details comes later.
 */
const IdentityPanel = ({
  entity,
  entityOwner,
  role,
  summary,
  nowMs,
}: {
  entity: EntityData
  entityOwner: EntityOwner | null
  role: EntityRole
  summary: GridSummary | null
  nowMs: number
}) => {
  const metadata = entity.metadata
  const state = gridLamp(summary)
  const url = metadata?.url?.trim()
  const fuelPct =
    summary && summary.fuelCapacity > 0n
      ? Math.round(
          (Number(summary.fuelNow) / Number(summary.fuelCapacity)) * 100,
        )
      : null

  return (
    <aside className="ident">
      <div className="id-head">
        <div className="code">Assembly · {entity.key.id}</div>
        <div className="name-row">
          {metadata?.name ? (
            <h2>{metadata.name}</h2>
          ) : (
            <h2 className="unnamed">Unnamed Assembly</h2>
          )}
        </div>
      </div>

      <div className="state-big" data-state={state.lamp}>
        <span className="led" />
        <b>{state.word}</b>
        {summary && (
          <span>
            {summary.modulesOnline} of {summary.modulesTotal} online
            <br />
            {mw(summary.drawMw)} / {mw(summary.outputMw)} MW
          </span>
        )}
      </div>

      {metadata?.description && <p className="desc">{metadata.description}</p>}

      <dl className="kv">
        <dt>Shell</dt>
        <dd>{shellLabel(entityOwner)}</dd>
        {role !== 'visitor' && (
          <>
            <dt>Controllers</dt>
            <dd>{entity.controllers?.length ?? 0}</dd>
          </>
        )}
        {url && (
          <>
            <dt>Dapp</dt>
            <dd>
              <a
                className="lnk"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {hostOf(url)}
              </a>
            </dd>
          </>
        )}
      </dl>

      <dl className="kv more">
        <dt>Sections</dt>
        <dd>{entity.layout?.sections.length ?? 0}</dd>
        {fuelPct !== null && (
          <>
            <dt>Fuel</dt>
            <dd>{fuelPct}%</dd>
          </>
        )}
        {entity.powerGrid && (
          <>
            <dt>Settled</dt>
            <dd>{ago(nowMs - Number(entity.powerGrid.lastSettledMs))}</dd>
          </>
        )}
      </dl>
    </aside>
  )
}

export default IdentityPanel
