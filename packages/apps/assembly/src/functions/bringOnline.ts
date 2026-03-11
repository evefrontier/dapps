import {
  SendSponsoredTransactionFn,
  SponsoredTransactionActions,
  SponsoredTransactionOutput,
} from "@evefrontier/dapp-kit";
import type { Assemblies, AssemblyType } from "@evefrontier/dapp-kit/types";

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
    console.log("bringOnline: sending sponsored transaction");
    try {
      const result = await sendSponsoredTransaction({
        txAction: SponsoredTransactionActions.BRING_ONLINE,
        assembly,
      });

      console.log("sponsored transaction result", result);

      return result;
    } catch (error) {
      console.error("sponsored transaction error", error);

      throw error;
    }
  }
};
