import { AxisLeft, AxisBottom } from "@visx/axis";
import * as allCurves from "@visx/curve";
import { GridColumns, GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import React, { useState, useRef, useEffect } from "react";

import {
  AssemblyType,
  Assemblies,
  State,
  EXCLUDED_TYPEIDS,
  abbreviateAddress,
  SmartAssemblyResponse,
} from "@evefrontier/dapp-kit";
import ClickToCopy from "../components/ClickToCopy";
import { Square, MoreVertical } from "../assets";

interface DataPoint {
  timestamp: number;
  fuel: number;
  secondsAgo?: number;
}

export type GraphProps = {
  assembly: AssemblyType<Assemblies.NetworkNode>;
  width: number;
  height: number;
  showControls?: boolean;
};

const GRID_SPACING_X = 24;
const GRID_SPACING_Y = 20;
const LEFT_AXIS_WIDTH = 58;
const GRID_STYLES = {
  stroke: "#FAFAE533",
  fill: "none",
  strokeWidth: 1,
};

const GRID_BORDER_STYLES = {
  fill: "none",
  stroke: "rgba(88, 87, 87, 0.55)",
  strokeWidth: 1,
};

const TEXT_STYLES = {
  fill: "rgba(250, 250, 229, 0.5)",
  fontSize: 11,
  className: "font-favorit",
  texttransform: "uppercase",
};

const initialData = [
  {
    timestamp: Date.now(),
    fuel: 0,
  },
];

const IdDisplay = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-4 top-0 h-full items-center justify-end text-neutral-60 text-sm bg-crude border border-neutral-5 flex p-1"
      onClick={(e) => e.stopPropagation()}
    >
      {abbreviateAddress(id)}{" "}
      <ClickToCopy text={id} className="text-neutral-60" />
    </div>
  );
};

const StatBox = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-row w-full items-center justify-between gap-4 border border-neutral-5 px-2 py-2 bg-neutral-5">
    <div className="text-xs text-neutral-50 font-disket">{label}</div>
    <div className="text-sm text-neutral font-disket">{value} GJ</div>
  </div>
);

const AssemblyRow = ({
  assembly,
  showId,
  setShowId,
}: {
  assembly: SmartAssemblyResponse;
  showId: string | undefined;
  setShowId: (id: string | undefined) => void;
}) => {
  const isOnline = assembly.state === State.ONLINE;
  const textColor = isOnline ? "text-neutral" : "text-neutral-80";

  return (
    <div
      className={`w-full border border-neutral-5 px-2 py-[6.5px] grid grid-cols-3 ${
        isOnline ? "bg-neutral-5" : ""
      }`}
      style={{ gridTemplateColumns: "60% 20% 20%" }}
    >
      <div className={`text-sm w-full ${textColor}`}>
        {assembly.name || assembly.typeDetails?.name || assembly.typeId}
      </div>
      <div className={`text-sm w-auto ${textColor}`}>
        {assembly.energyUsage} GJ
      </div>
      <div
        className={`text-sm w-auto ${
          isOnline ? "text-martianred" : "text-alert"
        } capitalize flex items-center gap-2 relative`}
      >
        <Square className="w-2 h-2" />
        {assembly.state === State.ANCHORED ? "Offline" : assembly.state}
        <div
          className="w-full h-full flex items-center justify-end cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowId(showId === assembly.id ? undefined : assembly.id);
          }}
        >
          <MoreVertical className="w-4 h-4 text-neutral-80" />
        </div>
        {showId === assembly.id && (
          <IdDisplay id={assembly.id} onClose={() => setShowId(undefined)} />
        )}
      </div>
    </div>
  );
};

const EmptyRow = ({ index }: { index: number }) => (
  <div
    key={`empty-${index}`}
    className="w-full border border-neutral-5 px-2 py-[6.5px] grid grid-cols-3"
    style={{ gridTemplateColumns: "60% 20% 20%" }}
  >
    <div className="text-sm w-full text-neutral-80">&nbsp;</div>
    <div />
    <div />
  </div>
);

const Graph = React.memo(({ width, height, assembly }: GraphProps) => {
  const [data, setData] = useState<DataPoint[]>(initialData);
  const [curveType] = useState<keyof typeof allCurves>("curveStepBefore");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showId, setShowId] = useState<string | undefined>();

  const INTERVAL_IN_SEC = 5;

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = Date.now();
      setCurrentTime(newTime);
      setData((prevData) => {
        const recentPoints = prevData.filter(
          (point) => newTime - point.timestamp <= 240000,
        );
        return [
          ...recentPoints,
          {
            timestamp: newTime,
            fuel: assembly.networkNode.totalReservedEnergy,
          },
        ];
      });
    }, INTERVAL_IN_SEC * 1000);

    return () => clearInterval(interval);
  }, [assembly.networkNode.totalReservedEnergy]);

  const margin = { top: 26, right: 0, bottom: 36, left: LEFT_AXIS_WIDTH };
  const FIXED_COLS = Math.floor(
    (width - margin.left - margin.right) / GRID_SPACING_X,
  );
  const FIXED_ROWS = Math.floor(
    (height - margin.top - margin.bottom) / GRID_SPACING_Y,
  );
  const innerWidth = FIXED_COLS * GRID_SPACING_X;
  const innerHeight = FIXED_ROWS * GRID_SPACING_Y;
  const widthReal = innerWidth + margin.left + margin.right;
  const heightReal = innerHeight + margin.top + margin.bottom;

  const dataTransformed = data
    .map((d) => ({
      ...d,
      secondsAgo:
        Math.round((currentTime - d.timestamp) / 5000) * INTERVAL_IN_SEC,
    }))
    .filter((d) => d.secondsAgo <= 240)
    .sort((a, b) => a.secondsAgo - b.secondsAgo);

  const xScale = scaleLinear({
    range: [innerWidth, 0],
    domain: [FIXED_COLS * INTERVAL_IN_SEC, 0],
    clamp: true,
  });

  const yScale = scaleLinear({
    range: [innerHeight, 0],
    domain: [0, assembly.networkNode.energyMaxCapacity],
    round: true,
  });

  const sortedAssemblies: (SmartAssemblyResponse | null)[] = [
    ...assembly.networkNode.linkedAssemblies
      .filter((a) => a.state === State.ANCHORED || a.state === State.ONLINE) // Only show online or anchored (offline) assemblies
      .filter((a) => !EXCLUDED_TYPEIDS.includes(a.typeId)) // Do not show excluded assemblies
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) =>
        a.energyUsage < b.energyUsage
          ? -1
          : b.energyUsage < a.energyUsage
            ? 1
            : 0,
      )
      .sort((a, b) =>
        a.state === State.ONLINE ? -1 : b.state === State.ONLINE ? 1 : 0,
      ),
    ...Array(
      Math.max(0, 8 - assembly.networkNode.linkedAssemblies.length),
    ).fill(null),
  ];

  return (
    <div id="Eve-Graph-Module" className="w-full overflow-hidden">
      <div className="flex flex-col mb-4 gap-4">
        <div className="flex w-full justify-between gap-1">
          <StatBox
            label="Max capacity"
            value={assembly.networkNode.energyMaxCapacity}
          />
          <StatBox
            label="Cur. Production"
            value={assembly.networkNode.energyProduction}
          />
          <StatBox
            label="Cur. Usage"
            value={assembly.networkNode.totalReservedEnergy}
          />
        </div>
      </div>

      <div
        className="w-full overflow-x-scroll mb-4"
        style={{ overflowX: "scroll" }} // Has to be inline style to work
      >
        <div
          className="min-w-full w-fit"
          style={{ width: Math.max(width, widthReal) }}
        >
          <svg width={widthReal} height={heightReal}>
            <Group left={margin.left} top={margin.top}>
              <rect
                x={0}
                y={-(GRID_SPACING_Y + 1)}
                width={innerWidth}
                height={GRID_SPACING_Y + 1}
                fill="rgba(0, 0, 255, 0.2)"
                stroke={GRID_STYLES.stroke}
              />
              <GridColumns
                scale={xScale}
                width={innerWidth}
                height={GRID_SPACING_Y + 1}
                stroke={GRID_STYLES.stroke}
                numTicks={FIXED_COLS}
                top={-(GRID_SPACING_Y + 1)}
              />
              <GridRows
                scale={yScale}
                width={innerWidth}
                height={innerHeight}
                stroke={GRID_STYLES.stroke}
                numTicks={FIXED_ROWS}
              />
              <GridColumns
                scale={xScale}
                width={innerWidth}
                height={innerHeight}
                stroke={GRID_STYLES.stroke}
                numTicks={FIXED_COLS}
              />
              <AxisLeft
                scale={yScale}
                label="Fuel (GJ)"
                stroke={TEXT_STYLES.fill}
                numTicks={FIXED_ROWS}
                tickComponent={({ formattedValue, y }) => (
                  <g transform={`translate(-${LEFT_AXIS_WIDTH}, ${y})`}>
                    <rect
                      width={LEFT_AXIS_WIDTH}
                      height={GRID_SPACING_Y + 1}
                      x={0}
                      y={-(GRID_SPACING_Y + 1)}
                      {...GRID_BORDER_STYLES}
                    />
                    <text
                      {...TEXT_STYLES}
                      x={LEFT_AXIS_WIDTH - 8}
                      y={-(GRID_SPACING_Y / 2)}
                      textAnchor="end"
                      dominantBaseline="middle"
                    >
                      {formattedValue}
                    </text>
                  </g>
                )}
                labelOffset={56}
                labelProps={TEXT_STYLES}
              />
              <g
                transform={`translate(-${LEFT_AXIS_WIDTH}, ${innerHeight + 20})`}
              >
                <rect
                  width={LEFT_AXIS_WIDTH}
                  height={32}
                  x={0}
                  y={-20}
                  {...GRID_BORDER_STYLES}
                />
                <text
                  {...TEXT_STYLES}
                  textAnchor="start"
                  x={LEFT_AXIS_WIDTH - 32}
                  y={0}
                  dominantBaseline="middle"
                >
                  SEC
                </text>
              </g>
              <AxisBottom
                top={innerHeight}
                scale={xScale}
                stroke={TEXT_STYLES.fill}
                tickFormat={(value) => `${value}`}
                label="Seconds Ago"
                numTicks={FIXED_COLS}
                tickComponent={({ formattedValue, x }) => (
                  <g transform={`translate(${x - 6}, 25 )`}>
                    <rect
                      width={24}
                      height={32}
                      x={6}
                      y={-25}
                      {...GRID_BORDER_STYLES}
                    />
                    <text
                      {...TEXT_STYLES}
                      x={6}
                      y={24}
                      textAnchor="middle"
                      transform="rotate(270)"
                    >
                      {formattedValue}
                    </text>
                  </g>
                )}
              />

              <LinePath<DataPoint>
                curve={allCurves[curveType]}
                data={dataTransformed}
                x={(d) => xScale(d.secondsAgo ?? 0)}
                y={(d) => yScale(d.fuel)}
                stroke="rgba(255, 71, 0, 1)"
                strokeWidth={2}
                strokeOpacity={0.6}
                shapeRendering="geometricPrecision"
              />
            </Group>
          </svg>
        </div>
      </div>

      <div className="flex flex-col w-full gap-4 px-2">
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-full border border-neutral-5 p-1 grid grid-cols-3 bg-neutral-5"
            style={{ gridTemplateColumns: "60% 20% 20%" }}
          >
            <div className="font-disket text-neutral-30 text-xs w-full">
              Assembly name
            </div>
            <div className="font-disket text-neutral-30 text-xs w-auto">
              Energy Usage
            </div>
            <div className="font-disket text-neutral-30 text-xs w-auto">
              Status
            </div>
          </div>
          <div className="w-full">
            <div
              style={
                (assembly.networkNode.linkedAssemblies?.length ?? 0) > 7
                  ? {
                      maxHeight: "258px",
                      overflowY: "auto",
                    }
                  : { overflowY: "hidden" }
              } // Has to be inline style to work
            >
              {sortedAssemblies.map((assembly, index) =>
                assembly ? (
                  <AssemblyRow
                    key={assembly.id}
                    assembly={assembly}
                    showId={showId}
                    setShowId={setShowId}
                  />
                ) : (
                  <EmptyRow key={`empty-${index}`} index={index} />
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Graph;
