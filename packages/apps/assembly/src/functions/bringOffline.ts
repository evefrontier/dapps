import {
  Assemblies,
  AssemblyType,
  createLogger,
  SendSponsoredTransactionFn,
  SponsoredTransactionActions,
} from "@evefrontier/dapp-kit";

const log = createLogger();

/** BRING OFFLINE SPONSORED TRANSACTION FUNCTION */
export const bringOffline = async ({
  assembly,
  sendSponsoredTransaction,
}: {
  assembly: AssemblyType<Assemblies>;
  sendSponsoredTransaction: SendSponsoredTransactionFn;
}) => {
  if (!assembly) return;

  {
    log.info("bringOffline: sending sponsored transaction");
    try {
      const result = await sendSponsoredTransaction({
        txAction: SponsoredTransactionActions.BRING_OFFLINE,
        assembly: assembly,
      });
      log.info("sponsored transaction result", result);
      return result;
    } catch (error) {
      log.error("sponsored transaction error", error);
      throw error;
    }
  }
};
