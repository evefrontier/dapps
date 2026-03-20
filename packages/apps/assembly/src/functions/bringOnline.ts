import {
  createLogger,
  SendSponsoredTransactionFn,
  SponsoredTransactionActions,
  SponsoredTransactionOutput,
} from "@evefrontier/dapp-kit";
import type { Assemblies, AssemblyType } from "@evefrontier/dapp-kit/types";

const log = createLogger();

/** BRING ONLINE SPONSORED TRANSACTION FUNCTION */
export const bringOnline = async ({
  assembly,
  sendSponsoredTransaction,
}: {
  assembly: AssemblyType<Assemblies>;
  sendSponsoredTransaction: SendSponsoredTransactionFn;
}): Promise<SponsoredTransactionOutput | undefined> => {
  if (!assembly) return;

  {
    log.info("bringOnline: sending sponsored transaction");
    try {
      const result = await sendSponsoredTransaction({
        txAction: SponsoredTransactionActions.BRING_ONLINE,
        assembly,
      });

      log.info("sponsored transaction result", result);

      return result;
    } catch (error) {
      log.error("sponsored transaction error", error);

      throw error;
    }
  }
};
