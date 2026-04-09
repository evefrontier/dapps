import {
  useSmartObject,
  useNotification,
  Severity,
} from "@evefrontier/dapp-kit";
import React, { useEffect } from "react";

import {
  ErrorNotice,
  ErrorNoticeTypes,
  EveContainer,
} from "@eveworld/ui-components";

import Behaviour from "../Behaviour";
import Root from "./Root";

const Overview = React.memo((): React.JSX.Element => {
  const { assembly, assemblyOwner, loading } = useSmartObject();
  const { notify, handleClose } = useNotification();

  useEffect(() => {
    if (loading) {
      notify({ type: Severity.Info, message: "Loading..." });
    } else {
      handleClose();
    }
  }, [loading]);

  if ((!loading && !assembly) || !assembly) {
    return (
      <div className="flex flex-col-reverse justify-end px-4 gap-4 lg:grid lg:grid-cols-8 h-full">
        <div className="lg:col-span-3 grid h-full">
          <ErrorNotice type={ErrorNoticeTypes.SMART_ASSEMBLY} />
        </div>
        <div className="lg:col-span-5 !hidden lg:flex">
          <EveContainer className="m-2 h-full"> </EveContainer>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col-reverse px-4 gap-4 lg:grid lg:grid-cols-8 mx-4">
        <div className="lg:col-span-3 grid">
          <Root assembly={assembly} character={assemblyOwner} />
        </div>
        <div className="lg:col-span-5">
          <Behaviour />
        </div>
      </div>
    </>
  );
});

export default React.memo(Overview);
