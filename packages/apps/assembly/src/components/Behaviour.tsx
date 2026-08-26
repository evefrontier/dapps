import {
  Assemblies,
  AssemblyType,
  getDappUrl,
  QueryParams,
  useSmartObject,
} from '@evefrontier/dapp-kit'
import {
  EveButton,
  EveContainer,
  GateView,
  Graph,
  InventoryView,
  TurretView,
} from '@eveworld/ui-components'
import { useCurrentAccount } from '@mysten/dapp-kit-react'
import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useFlagVariant } from '../flags'

const DAPP_INDEX_URL = import.meta.env.VITE_DAPP_INDEX_URL

function withAssemblyContext(url: string, tenant: string): string {
  const itemId = new URLSearchParams(window.location.search).get(
    QueryParams.ITEM_ID,
  )
  if (!itemId) return url

  const hasProtocol = /^((http|https|ftp):\/\/)/i.test(url)
  try {
    const target = new URL(hasProtocol ? url : `https://${url}`)
    target.searchParams.set(QueryParams.ITEM_ID, itemId)
    target.searchParams.set(QueryParams.TENANT, tenant)
    return target.toString()
  } catch {
    return url
  }
}

interface DappIframeProps {
  url: string
}

const DappIframe: React.FC<DappIframeProps> = ({ url }) => (
  <div className="flex flex-col gap-4">
    <iframe
      src={url}
      id="dapp-iframe"
      title="Operation Config"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      className="w-full min-h-[520px] grow"
      allowFullScreen
    />
    <EveButton
      variant="secondary"
      onClick={() => {
        window.open(url, '_blank', 'noopener,noreferrer')
      }}
    >
      Open in new tab
    </EveButton>
  </div>
)

interface ModuleRendererProps {
  assembly: AssemblyType<Assemblies>
  currentAddress: `0x${string}`
  selectedSmartGate: string | undefined
  setSelectedSmartGate: (id: string) => void
  showContainer: boolean
  tenant: string
}

const ModuleRenderer: React.FC<ModuleRendererProps> = ({
  assembly,
  currentAddress,
  showContainer = true,
  tenant,
}) => {
  const isNetworkNode = assembly.type === Assemblies.NetworkNode
  const dappIndexEnabled =
    useFlagVariant('assembly-dapp-index-fallback') === 'on'
  const fallbackUrl =
    dappIndexEnabled && DAPP_INDEX_URL
      ? withAssemblyContext(DAPP_INDEX_URL, tenant)
      : undefined
  const dappUrl = isNetworkNode ? '' : getDappUrl(assembly, fallbackUrl)
  // Dapp Index is first-party, so only a player-set dappURL gets the warning.
  const isExternalDapp = !!dappUrl && !!assembly.dappURL?.trim()

  const getContainerVariant = () => {
    if (isExternalDapp) return 'warning' as const
    return 'default' as const
  }

  const getContainerProps = () => ({
    className: 'flex flex-col min-h-full',
    id: 'Eve-Assembly-Module',
    variant: getContainerVariant(),
    showBorder: showContainer,
    showHeader: showContainer,
    ...(isExternalDapp && {
      statusTextTop: 'BEHAVIOR',
      statusTextBottom:
        'ATT. Pilot, you are interacting with an interface outside of Frontier.',
    }),
  })

  const renderModule = () => {
    const result = (() => {
      switch (assembly.type) {
        case 'SmartStorageUnit':
          return {
            component: (
              <InventoryView
                assembly={assembly as AssemblyType<Assemblies.SmartStorageUnit>}
                currentAddress={currentAddress}
              />
            ),
            headerText: 'STORAGE',
          }
        case 'SmartGate':
          return {
            component: (
              <GateView
                assembly={assembly as AssemblyType<Assemblies.SmartGate>}
                viewerAddress={currentAddress}
              />
            ),
            headerText: 'GATE',
          }
        case Assemblies.SmartTurret:
          return {
            component: (
              <TurretView
                assembly={assembly as AssemblyType<Assemblies.SmartTurret>}
              />
            ),
            headerText: 'TURRET',
          }
        case Assemblies.NetworkNode:
          return {
            component: (
              <Graph
                width={712}
                height={500}
                assembly={assembly as AssemblyType<Assemblies.NetworkNode>}
              />
            ),
            headerText: 'GENERATOR',
          }
        default:
          return {
            component: <></>,
            headerText: '',
          }
      }
    })()

    return result
  }

  const { component, headerText } = renderModule()
  return (
    <EveContainer {...getContainerProps()} headerText={headerText}>
      {dappUrl ? <DappIframe url={dappUrl} /> : component}
    </EveContainer>
  )
}

const Behaviour = React.memo((): React.JSX.Element => {
  const [selectedSmartGate, setSelectedSmartGate] = useState<
    string | undefined
  >(undefined)
  const { assembly, tenant } = useSmartObject()
  const currentAccount = useCurrentAccount()
  const showContainer = !useLocation().pathname.includes('client')

  if (!assembly || !currentAccount) {
    return <div className="Eve-Module" />
  }

  return (
    <ModuleRenderer
      assembly={assembly}
      currentAddress={currentAccount?.address as `0x${string}`}
      selectedSmartGate={selectedSmartGate}
      setSelectedSmartGate={setSelectedSmartGate}
      showContainer={showContainer}
      tenant={tenant}
    />
  )
})

export default Behaviour
