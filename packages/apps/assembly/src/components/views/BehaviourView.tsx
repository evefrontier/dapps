import React from 'react'

import { useFlagVariant } from '../../flags'
import Behaviour from '../Behaviour'
import Controllers from '../Controllers'

const BehaviourView = React.memo((): React.JSX.Element => {
  const showControllers = useFlagVariant('assembly-controllers') === 'on'

  return (
    <div className="flex flex-col gap-8 p-4">
      <Behaviour />
      {showControllers && <Controllers />}
    </div>
  )
})

export default BehaviourView
