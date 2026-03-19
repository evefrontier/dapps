import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import React from "react";

import {
  useSmartObject,
  Assemblies,
  State,
  formatDuration,
  TYPEIDS,
  useSponsoredTransaction,
  getDatahubGameInfo,
  DatahubGameInfo,
  getFuelEfficiencyForType,
  getAdjustedBurnRate,
  createLogger,
} from "@evefrontier/dapp-kit";
import { EveButton } from "@eveworld/ui-components";
import { ButtonCorner } from "@eveworld/ui-components/assets";

import { bringOffline } from "../../functions/bringOffline";
import { bringOnline } from "../../functions/bringOnline";

const log = createLogger();

const FuelBar = ({ filled }: { filled: boolean }) => (
  <svg
    width="6.5"
    height="32"
    viewBox="0 0 9 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      width="6"
      height="32"
      fill={filled ? "rgba(255, 71, 0, 1)" : "rgba(250, 250, 229, 1)"}
      fillOpacity={filled ? 1 : 0.2}
    />
  </svg>
);

// Types for time calculations
type TimeRemaining = {
  total: number;
  thisUnit: number;
};

// Constants for calculations
const MILLISECONDS_TO_SECONDS = 1000;

const MonitorView = React.memo(() => {
  const { assembly, refetch } = useSmartObject();

  const [fuel, setFuel] = useState<DatahubGameInfo | null>(null);
  const [frozenTimeRemaining, setFrozenTimeRemaining] = useState<number | null>(
    null,
  );
  // Efficiency-adjusted ms to burn one unit; set together with unitsPerHour from getAdjustedBurnRate.
  const [burnTimeInMs, setburnTimeInMs] = useState(0);
  const [unitsPerHour, setUnitsPerHour] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalBars, setTotalBars] = useState(0);
  const [filledBars, setFilledBars] = useState(0);
  const [timeLeftThisUnitInPercentage, setTimeLeftThisUnitInPercentage] =
    useState(0);

  const containerRef = useRef<null | HTMLDivElement>(null);
  const { mutateAsync: sendSponsoredTransaction } = useSponsoredTransaction();

  // Get the fuel efficiency-adjusted burn time per unit (and rate derived from it)
  useEffect(() => {
    if (!assembly || assembly.type !== Assemblies.NetworkNode) return;

    const rawBurnTimeInMs = assembly.networkNode.fuel.burnTimeInMs;
    const initial = getAdjustedBurnRate(rawBurnTimeInMs, null);
    setburnTimeInMs(initial.burnTimePerUnitMs);
    setUnitsPerHour(initial.unitsPerHour);

    const applyEfficiency = async () => {
      const fuelEfficiency = await getFuelEfficiencyForType(
        assembly.networkNode.fuel.typeId,
      );
      const { burnTimePerUnitMs, unitsPerHour: rate } = getAdjustedBurnRate(
        rawBurnTimeInMs,
        fuelEfficiency,
      );
      setburnTimeInMs(burnTimePerUnitMs);
      setUnitsPerHour(rate);
    };

    applyEfficiency();
  }, [assembly]);

  // Calculate time remaining (all values in seconds)
  const calculateTimeRemaining = useCallback((): TimeRemaining | undefined => {
    if (!assembly || assembly.type !== Assemblies.NetworkNode) {
      return undefined;
    }

    const { fuel } = assembly.networkNode;
    const burnTimeInSec = burnTimeInMs / MILLISECONDS_TO_SECONDS;
    const queuedBurnTimeSec = fuel.quantity * burnTimeInSec;

    if (burnTimeInSec <= 0 || !Number.isFinite(burnTimeInSec)) {
      return { total: 0, thisUnit: 0 };
    }

    if (fuel.isBurning) {
      const nowSec = Date.now() / MILLISECONDS_TO_SECONDS;
      const startSec = fuel.burnStartTime / MILLISECONDS_TO_SECONDS;
      const previousCycleSec =
        fuel.previousCycleElapsedTime / MILLISECONDS_TO_SECONDS;
      const totalElapsedTime = nowSec - startSec + previousCycleSec;

      const remainder = totalElapsedTime % burnTimeInSec;
      const thisUnitRaw = remainder === 0 ? 0 : burnTimeInSec - remainder;
      const thisUnit = Math.max(0, Math.min(burnTimeInSec, thisUnitRaw));
      const total = Math.max(
        0,
        queuedBurnTimeSec + burnTimeInSec - totalElapsedTime,
      );

      return { total, thisUnit };
    }

    if (fuel.previousCycleElapsedTime === 0) {
      if (fuel.quantity === 0) {
        return { total: 0, thisUnit: 0 };
      }
      return {
        total: queuedBurnTimeSec,
        thisUnit: burnTimeInSec,
      };
    }

    const previousCycleSec =
      fuel.previousCycleElapsedTime / MILLISECONDS_TO_SECONDS;
    const thisUnit = Math.max(
      0,
      Math.min(burnTimeInSec, burnTimeInSec - previousCycleSec),
    );
    return {
      total: queuedBurnTimeSec + burnTimeInSec - previousCycleSec,
      thisUnit,
    };
  }, [assembly, burnTimeInMs]);

  useEffect(() => {
    if (!containerRef.current) return setTotalBars(20);

    const BAR_WIDTH = 11; // Width of each bar 9px + gap 2px

    const updateWidth = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newTotalBars = Math.floor(rect.width / BAR_WIDTH);
      setTotalBars(newTotalBars);
    };

    // Initial measurement
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Empty dependency array since we only want to set up the observer once

  useEffect(() => {
    if (
      assembly?.type !== Assemblies.NetworkNode ||
      !assembly?.networkNode?.fuel
    )
      return;

    const getFuelInfo = async () => {
      const fuelResponse = await getDatahubGameInfo(
        assembly.networkNode.fuel.typeId,
      );
      setFuel(fuelResponse);
    };

    getFuelInfo();
  }, [
    assembly?.type === Assemblies.NetworkNode &&
      assembly?.networkNode.fuel.typeId,
  ]);

  useEffect(() => {
    const updateTimeRemaining = () => {
      if (assembly?.type !== Assemblies.NetworkNode) return;

      // If we have a frozen time, don't update
      if (frozenTimeRemaining !== null) return;

      const remaining = calculateTimeRemaining();
      if (remaining === undefined) return;

      setTimeRemaining(remaining.total);

      const burnTimeInSec = burnTimeInMs / MILLISECONDS_TO_SECONDS;
      const thisUnitPercentage = Math.max(
        0,
        (burnTimeInSec > 0 ? remaining.thisUnit / burnTimeInSec : 0) * 100,
      );

      setTimeLeftThisUnitInPercentage(thisUnitPercentage);

      const filledBars = Math.floor((thisUnitPercentage / 100) * totalBars);
      setFilledBars(filledBars);
    };

    // Initial calculation
    updateTimeRemaining();

    // Set up interval
    const intervalId = setInterval(updateTimeRemaining, 1000);

    // Clean up interval on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [
    calculateTimeRemaining,
    totalBars,
    assembly,
    assembly?.type === Assemblies.NetworkNode &&
      assembly?.networkNode.fuel.isBurning,
    assembly?.type === Assemblies.NetworkNode &&
      assembly?.networkNode.fuel.quantity,
    frozenTimeRemaining,
  ]);

  if (!assembly || assembly.type !== Assemblies.NetworkNode) {
    log.error("Cannot find NetworkNode");
    return <div className="Eve-NetworkNode-Monitor" />;
  }

  const isOnline = assembly.state === State.ONLINE;
  //** Time left can be negative if the cron job has yet to catch up. In these instances, return 00:00:00 instead of negative value */
  const isNegativeTime = timeRemaining < 0 || timeLeftThisUnitInPercentage < 0;

  const hasMoreFuel = assembly.networkNode.fuel.quantity > 0;

  const hasCurrentFuel =
    assembly.networkNode.fuel.isBurning ||
    (assembly.networkNode.fuel.previousCycleElapsedTime > 0 &&
      assembly.networkNode.fuel.previousCycleElapsedTime < burnTimeInMs);

  //** Can start burn if the assembly is anchored, and either there are fuel units left to burn, or the elapsed time for the current unit has not reached the maximum burn time
  const canStartBurn = hasMoreFuel || hasCurrentFuel;

  const handleToggleBurn = async () => {
    if (isOnline) {
      // Freeze the current time remaining when stopping
      setFrozenTimeRemaining(timeRemaining);
      await bringOffline({ assembly, sendSponsoredTransaction });
      await refetch();
    } else {
      // Unfreeze the time when bringing online
      setFrozenTimeRemaining(null);
      await bringOnline({ assembly, sendSponsoredTransaction });
      await refetch();
    }
  };

  return (
    <div id="Eve-Monitor-Module" className="w-[21.125rem] overflow-hidden">
      <div className="flex flex-col mb-4 gap-4 p-2">
        <div className="flex w-full flex-col space-between items-center border border-neutral-20 px-2 py-2">
          <div className="flex w-full flex-row justify-between items-center gap-2">
            <div className="text-neutral-50 text-xs font-disket">
              Set to burn
            </div>
            <div className="text-neutral text-sm">
              {canStartBurn ? fuel?.name : "N/A"}
            </div>
          </div>
          <div className="flex w-full flex-row justify-between items-center gap-2">
            <div className="text-neutral-50 text-xs font-disket">Rate</div>
            <div className="text-neutral text-sm">
              {unitsPerHour && canStartBurn
                ? `${unitsPerHour.toFixed(2)}/H`
                : "N/A"}
            </div>
          </div>
          <div className="flex w-full flex-row justify-between items-center gap-2">
            <div className="text-neutral-50 text-xs font-disket">
              Total Time Remaining
            </div>
            <div className="text-neutral text-sm">
              {formatDuration(
                isNegativeTime || (!isOnline && !canStartBurn)
                  ? 0
                  : frozenTimeRemaining ?? timeRemaining,
              )}
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col space-between items-center border border-neutral-20 px-2 py-2 gap-2 bg-crude-60">
          <div className="flex w-full flex-row justify-between items-center gap-2">
            <div ref={containerRef} className="flex w-full items-center gap-2">
              <div className="relative">
                <img
                  src={
                    assembly.networkNode.fuel.isBurning
                      ? fuel?.iconUrl
                      : assembly.networkNode.fuel.quantity > 0
                        ? fuel?.iconUrl
                        : `https://artifacts.evefrontier.com/types/${TYPEIDS.NETWORK_NODE}.png`
                  }
                  alt={fuel?.name}
                  className="border border-neutral-20"
                  style={{
                    minWidth: "48px",
                    height: "48px",
                  }}
                />{" "}
                <ButtonCorner className="absolute top-0 left-0 -rotate-90 button-corner" />
                <ButtonCorner className="absolute top-0 right-0 button-corner" />
                <ButtonCorner className="absolute bottom-0 left-0 rotate-180 button-corner" />
                <ButtonCorner className="absolute bottom-0 right-0 rotate-90 button-corner" />
              </div>
              <div className="flex w-full flex-row gap-[2px]">
                {Array.from({ length: Math.max(0, totalBars) }).map((_, i) => (
                  <FuelBar key={i} filled={i < filledBars} />
                ))}
              </div>
              <div className="flex w-[64px] h-full justify-center items-center border border-neutral-20 p-2 text-neutral font-disket">
                {isNegativeTime
                  ? "0%"
                  : `${Math.floor(timeLeftThisUnitInPercentage)}%`}
              </div>
            </div>
          </div>

          {assembly.networkNode.fuel.isBurning && (
            <div className="bg-neutral-5 text-neutral text-sm px-2 w-full">
              Burning single unit...
            </div>
          )}
          <EveButton
            variant="primary"
            cooldown={3000}
            onClick={handleToggleBurn}
            disabled={assembly.state == State.ANCHORED && !canStartBurn}
          >
            <div className="flex flex-row items-center gap-4">
              <svg
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.4999 4.00008L6.09991 7.11777L6.09991 0.882385L11.4999 4.00008Z"
                  fill="#0B0B0B"
                />
                <path
                  d="M6.10001 4.00002L0.700012 7.11771L0.700012 0.882324L6.10001 4.00002Z"
                  fill="#0B0B0B"
                />
              </svg>

              {isOnline ? "Stop Generating" : "Start"}
              <svg
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.500147 4.00011L5.90015 0.882415L5.90015 7.1178L0.500147 4.00011Z"
                  fill="#0B0B0B"
                />
                <path
                  d="M5.90005 4.00011L11.3 0.882415L11.3 7.1178L5.90005 4.00011Z"
                  fill="#0B0B0B"
                />
              </svg>
            </div>
          </EveButton>
        </div>
      </div>
    </div>
  );
});

export default MonitorView;
