import {
  BehaviourSkeleton,
  MonitorSkeleton,
  RootSkeleton,
} from "@eveworld/ui-components";
import React, { useEffect } from "react";

interface SkeletonConnectProps {
  handleConnect: () => void;
  hasEveVault: boolean;
  path: string;
}

/**
 * Skeleton loader component that displays different loading states based on the provided path.
 *
 * This component renders different skeleton UI elements depending on the route path,
 * providing visual feedback during loading states for various sections of the application.
 *
 * @param handleConnect - Function to handle wallet connection
 * @param path - Current route path to determine which skeleton to display
 * @returns React.JSX.Element representing the appropriate skeleton UI for the current path
 */
const SkeletonConnect = React.memo(
  ({
    handleConnect,
    path,
    hasEveVault,
  }: SkeletonConnectProps): React.JSX.Element => {
    useEffect(() => {
      if (hasEveVault) {
        handleConnect();
      }
    }, [hasEveVault]);

    if (path.includes("/client/networknode/monitor")) {
      return <MonitorSkeleton />;
    }
    if (path.includes("/client/root")) {
      return <RootSkeleton />;
    }
    if (path.includes("/client/behaviour")) {
      return <BehaviourSkeleton />;
    }
    return <BehaviourSkeleton />;
  },
);

export default React.memo(SkeletonConnect);
