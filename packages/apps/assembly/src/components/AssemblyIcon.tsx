import { Assemblies, AssemblyType, State } from '@evefrontier/dapp-kit'

interface AssemblyIconProps {
  assembly: AssemblyType<Assemblies>
  isOnline: boolean
  size?: number
  className?: string
}

interface BannerProps {
  message: string
  variant: 'alert' | 'martianred'
}

const Banner: React.FC<BannerProps> = ({ message, variant }) => (
  <div
    className={`col-span-2 font-disket flex justify-center items-center text-xs px-2 py-1.5 ${variant === 'martianred' ? 'bg-martianred text-crude' : 'bg-alert'}`}
  >
    {message}
  </div>
)

const NetworkNodeBanner = ({
  assembly,
}: {
  assembly: AssemblyType<Assemblies.NetworkNode>
}) => {
  if (assembly.state === State.ANCHORED) {
    const hasNoFuel = Number(assembly.networkNode.fuel.quantity) === 0
    return (
      <Banner
        message={hasNoFuel ? 'Fuel assembly' : 'Start generating'}
        variant="alert"
      />
    )
  }

  if (assembly.state === State.ONLINE) {
    return (
      <Banner message="Online and generating energy" variant="martianred" />
    )
  }

  return null
}

const AssemblyIcon = ({
  assembly,
  isOnline,
  size = 432,
  className = '',
}: AssemblyIconProps): React.JSX.Element => {
  const { typeDetails } = assembly
  const { iconUrl, name } = typeDetails ?? {}
  const isNetworkNode = assembly.type === Assemblies.NetworkNode

  const src =
    iconUrl || `https://artifacts.evefrontier.com/types/${typeDetails?.id}.png`
  const blurClass = isNetworkNode ? 'blur-bg-alert' : 'blur-bg-sm'

  const icon = (
    <div className="relative">
      <img
        src={src}
        alt={name}
        className={`w-full h-full object-cover ${className}`}
        width={size}
        height={size}
      />
      {!isOnline && <div className={`absolute inset-0 ${blurClass}`} />}
    </div>
  )

  if (!isNetworkNode) return icon

  // Network node is rendered with an additional border and banner
  const borderClass =
    assembly.state === State.ONLINE
      ? 'border border-martianred-30'
      : 'border border-alert'
  return (
    <div className="p-1 bg-black">
      <div className={borderClass}>
        {icon}
        <NetworkNodeBanner
          assembly={assembly as AssemblyType<Assemblies.NetworkNode>}
        />
      </div>
    </div>
  )
}

export default AssemblyIcon
