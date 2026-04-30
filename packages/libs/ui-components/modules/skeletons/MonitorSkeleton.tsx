import { Skeleton } from "@mui/material";
import React, { useState } from "react";

const MonitorSkeleton = React.memo((): React.JSX.Element => {
  return (
    <div
      className="p-2 flex flex-col gap-4 h-screen bg-crude-60"
      id="smartassembly-monitor-skeleton"
    >
      <Skeleton variant="rectangular" height={58} />
      <Skeleton variant="rectangular" height={87} />
      <Skeleton variant="rectangular" height={32} />
    </div>
  );
});

export default MonitorSkeleton;
