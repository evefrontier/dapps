import { Skeleton, type SkeletonProps } from '@mui/material'
import type React from 'react'

type StackSkeletonProps = {
  id: string
  /** Padding and gap classes; the full-height column layout is shared. */
  className: string
  /** One rectangular placeholder per entry, top to bottom. */
  blocks: Pick<SkeletonProps, 'height' | 'width' | 'className'>[]
}

const StackSkeleton = ({
  id,
  className,
  blocks,
}: StackSkeletonProps): React.JSX.Element => {
  return (
    <div className={`${className} flex flex-col h-screen bg-crude-60`} id={id}>
      {blocks.map((block, index) => (
        <Skeleton key={index} variant="rectangular" {...block} />
      ))}
    </div>
  )
}

export default StackSkeleton
