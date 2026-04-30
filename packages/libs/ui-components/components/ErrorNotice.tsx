import { DetailedAssemblyResponse } from "@evefrontier/dapp-kit";
import React from "react";
import EveContainer from "./EveContainer";

import "../styles-ui.css";

export enum ErrorNoticeTypes {
  SMART_ASSEMBLY,
  MESSAGE,
}
/**
 * Renders an error notice component based on the provided type.
 *
 * @param {ErrorNoticeTypes} type - The type of error notice to render (ENVIRONMENT or SMART_ASSEMBLY).
 * @returns {JSX.Element} The JSX element representing the error notice component.
 */
const ErrorNotice = React.memo(
  ({
    type,
    errorMessage,
    loading,
    assembly,
  }: {
    type?: ErrorNoticeTypes;
    errorMessage?: string;
    loading?: boolean;
    assembly?: DetailedAssemblyResponse | null;
  }) => {
    let message: string | undefined;

    switch (type) {
      case ErrorNoticeTypes.SMART_ASSEMBLY:
        // TODO: World api must differentiate between SSU undefined and SSU not found
        // Unit not found or not defined
        message = `! Assembly not found !`;
        break;
      case ErrorNoticeTypes.MESSAGE:
        message = errorMessage;
        break;
      default:
        message = errorMessage;
        break;
    }

    if (type === ErrorNoticeTypes.SMART_ASSEMBLY)
      return (
        <EveContainer className="flex flex-col m-2 font-disket justify-center items-center h-full">
          Assembly not found
        </EveContainer>
      );

    return (
      <div className="Absolute-Center flex items-center justify-center w-full mx-0 h-full">
        <div className="translate-y-0 mx-auto top-0 m-6 max-w-2/3 border border-martianred">
          <div
            className="text-crude uppercase m-2 bg-martianred text-center font-bold p-2"
            id="error-notice"
          >
            {message}
          </div>
        </div>
      </div>
    );
  },
);

export default React.memo(ErrorNotice);
