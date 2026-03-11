import React, { useState } from "react";
import { Skeleton } from "@mui/material";

const RootSkeleton = React.memo((): React.JSX.Element => {
  return (
    <div
      className="p-4 flex flex-col gap-2 h-screen bg-crude-60"
      id="smartassembly-root-skeleton"
    >
      <Skeleton variant="rectangular" height={495} />
      <Skeleton variant="rectangular" height={34} />
      <Skeleton variant="rectangular" height={342} />
    </div>
  );
});

export default RootSkeleton;
