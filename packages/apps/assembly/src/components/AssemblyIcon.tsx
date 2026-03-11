import { Assemblies, AssemblyType, State } from "@evefrontier/dapp-kit";

interface AssemblyIconProps {
  assembly: AssemblyType<Assemblies>;
  isOnline: boolean;
  size?: number;
  className?: string;
}

interface BannerProps {
  message: string;
  variant: "alert" | "martianred";
}

const Banner: React.FC<BannerProps> = ({ message, variant }) => (
  <div
    className={`col-span-2 font-disket flex justify-center items-center text-xs px-2 py-1.5 bg-${variant} ${variant === "martianred" ? "text-crude" : ""}`}
  >
    {message}
  </div>
);

const AssemblyIcon = ({
  assembly,
  isOnline,
  size = 432,
  className = "",
}: AssemblyIconProps): React.JSX.Element => {
  const { typeDetails } = assembly;
  const { iconUrl, name } = typeDetails ?? {};
  const isNetworkNode = assembly.type === Assemblies.NetworkNode;
  const networkNode = isNetworkNode
    ? (assembly as AssemblyType<Assemblies.NetworkNode>)
    : null;

  const offline = !isOnline;

  const getNetworkNodeBanner = () => {
    if (!isNetworkNode) return null;

    if (assembly.state === State.ANCHORED) {
      const hasNoFuel = Number(networkNode?.networkNode.fuel.quantity) === 0;
      return (
        <Banner
          message={hasNoFuel ? "Fuel assembly" : "Start generating"}
          variant="alert"
        />
      );
    }

    if (assembly.state === State.ONLINE) {
      return (
        <Banner message="Online and generating energy" variant="martianred" />
      );
    }

    return null;
  };

  const getNetworkNodeBorder = () => {
    if (!isNetworkNode) return "";
    return assembly.state === State.ONLINE
      ? "border border-martianred-30"
      : "border border-alert";
  };

  const getBlurClass = () => {
    if (!offline) return "";
    return isNetworkNode ? "blur-bg-alert" : "blur-bg-sm";
  };

  // Network node is rendered with an additional border and banner
  return isNetworkNode ? (
    <div className="p-1 bg-black">
      <div className={getNetworkNodeBorder()}>
        <div className="relative">
          <img
            src={
              iconUrl ||
              `https://artifacts.evefrontier.com/types/${typeDetails?.id}.png`
            }
            alt={name}
            className={`w-full h-full object-cover ${className}`}
            min-width={size}
            min-height={size}
          />
          {offline && <div className={`absolute inset-0 ${getBlurClass()}`} />}
        </div>
        {getNetworkNodeBanner()}
      </div>
    </div>
  ) : (
    <div className="relative">
      <img
        src={iconUrl}
        alt={name}
        className={`w-full h-full object-cover ${className}`}
        min-width={size}
        min-height={size}
      />
      {offline && <div className={`absolute inset-0 ${getBlurClass()}`} />}
    </div>
  );
};

export default AssemblyIcon;
