import React from 'react'
import StackSkeleton from './StackSkeleton'

const MonitorSkeleton = React.memo(
  (): React.JSX.Element => (
    <StackSkeleton
      id="smartassembly-monitor-skeleton"
      className="p-2 gap-4"
      blocks={[{ height: 58 }, { height: 87 }, { height: 32 }]}
    />
  ),
)

export default MonitorSkeleton
