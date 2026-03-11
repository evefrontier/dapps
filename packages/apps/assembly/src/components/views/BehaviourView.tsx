import React from "react";

import Behaviour from "../Behaviour";

const BehaviourView = React.memo((): React.JSX.Element => {
  return (
    <div className="p-4">
      <Behaviour />
    </div>
  );
});

export default BehaviourView;
