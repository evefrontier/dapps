import { useSmartObject } from "@evefrontier/dapp-kit";
import React from "react";

import { ErrorNoticeTypes } from "@eveworld/ui-components";
import { ErrorNotice } from "@eveworld/ui-components";

import Root from "./Root";

const RootView = React.memo((): React.JSX.Element => {
  const { assembly, assemblyOwner } = useSmartObject();

  if (!assembly || !assemblyOwner) {
    return <ErrorNotice type={ErrorNoticeTypes.SMART_ASSEMBLY} />;
  }

  return <Root assembly={assembly} character={assemblyOwner} />;
});

export default React.memo(RootView);
