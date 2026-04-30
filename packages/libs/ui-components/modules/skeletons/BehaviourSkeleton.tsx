import { Skeleton } from "@mui/material";
import React from "react";

const BehaviourSkeleton = React.memo((): React.JSX.Element => {
  return (
    <div
      className="p-4 flex flex-col gap-2 h-screen bg-crude-60"
      id="smartassembly-behaviour-skeleton"
    >
      <Skeleton variant="rectangular" height={16} width={100} />
      <Skeleton variant="rectangular" className="grow" />
    </div>
  );
});

export default BehaviourSkeleton;
