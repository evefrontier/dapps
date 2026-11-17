import React from 'react'
import StackSkeleton from './StackSkeleton'

const BehaviourSkeleton = React.memo(
  (): React.JSX.Element => (
    <StackSkeleton
      id="smartassembly-behaviour-skeleton"
      className="p-4 gap-2"
      blocks={[{ height: 16, width: 100 }, { className: 'grow' }]}
    />
  ),
)

export default BehaviourSkeleton
