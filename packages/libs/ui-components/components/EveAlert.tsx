import React from "react";
import { Alert, Snackbar } from "@mui/material";
import { Severity, getTxUrl } from "@evefrontier/dapp-kit";
import { Close } from "../assets";

import { SUI_TESTNET_CHAIN } from "@mysten/wallet-standard";

import "../styles-ui.css";
import EveContainer from "./EveContainer";
/**
 * React component for displaying styled alerts with different severity levels.
 *
 * @param severity The severity level of the alert (Error, Warning, Info, Success).
 * @param isOpen Boolean indicating if the alert is open.
 * @param handleClose Function to handle closing the alert.
 * @param message The message to be displayed in the alert.
 * @param txHash Optional transaction hash for Success alerts.
 * @returns React.JSX.Element representing the styled alert component.
 */
const EveAlert = React.memo(
  ({
    severity,
    isOpen,
    handleClose,
    message,
    txHash,
  }: {
    severity: Severity;
    isOpen: boolean;
    handleClose: () => void;
    message: string;
    txHash?: string;
  }): React.JSX.Element => {
    const severityIcon = {
      error: {
        color: "neutral",
        bgcolor: "alert",
      },
      warning: {
        color: "neutral",
        bgcolor: "alert",
      },
      info: {
        color: "crude",
        bgcolor: "neutral",
      },
      success: {
        color: "crude",
        bgcolor: "neutral",
      },
    };

    const isSevere =
      severity === Severity.Error || severity === Severity.Warning;

    const bgColor = "bg-" + severityIcon[`${severity}`].bgcolor;
    const textColor = "text-" + severityIcon[`${severity}`].color;

    return (
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: "4.5rem !important" }}
        open={isOpen}
        onClose={() => (isSevere ? null : handleClose())}
        id="eve-alert"
        autoHideDuration={isSevere ? undefined : 2000}
      >
        <div>
          <EveContainer
            variant={severity === Severity.Error ? "warning" : undefined}
            className="bg-crude"
          >
            <Alert
              severity={severity}
              icon={false}
              sx={{
                width: "100%",
                maxWidth: "80vw",
                color: severityIcon[`${severity}`].color,
                boxShadow: 0,
                borderRadius: 0,
              }}
              onClick={() => {
                if (severity === Severity.Success && txHash) {
                  window.open(getTxUrl(SUI_TESTNET_CHAIN, txHash));
                }
              }}
            >
              <div className="w-full flex-col justify-start items-center inline-flex ">
                <div
                  className={`self-stretch p-2 border border-neutral-20 justify-between items-center inline-flex ${bgColor}`}
                  id="alert-bar"
                >
                  <div
                    className={`justify-start items-center gap-2 flex text-sm font-disket ${textColor}`}
                  >
                    {severity}
                  </div>
                  <div
                    className="w-6 p-1 justify-center items-center gap-2 flex cursor-pointer"
                    onClick={handleClose}
                  >
                    <Close className={`${textColor} w-4 h-4 relative"}`} />
                  </div>
                </div>
                <div
                  className="p-1 flex-col justify-start items-start flex"
                  onClick={() => {
                    if (severity === Severity.Success && txHash) {
                      window.open(getTxUrl(SUI_TESTNET_CHAIN, txHash));
                    }
                  }}
                  id="message-box-container"
                >
                  <div
                    className={`p-4 justify-center items-start gap-2 inline-flex`}
                    id="message-box"
                  >
                    <div className="flex-col justify-start items-start gap-4 inline-flex">
                      <div
                        className="text-sm font-light text-neutral"
                        id="message-text"
                      >
                        {message}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Alert>
          </EveContainer>
        </div>
      </Snackbar>
    );
  },
);

export default React.memo(EveAlert);
