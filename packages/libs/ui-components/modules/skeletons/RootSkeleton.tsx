import React from 'react'
import StackSkeleton from './StackSkeleton'

const RootSkeleton = React.memo(
  (): React.JSX.Element => (
    <StackSkeleton
      id="smartassembly-root-skeleton"
      className="p-4 gap-2"
      blocks={[{ height: 495 }, { height: 34 }, { height: 342 }]}
    />
  ),
)

export default RootSkeleton
