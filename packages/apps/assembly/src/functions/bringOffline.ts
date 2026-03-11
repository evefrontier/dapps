import {
  Assemblies,
  AssemblyType,
  SendSponsoredTransactionFn,
  SponsoredTransactionActions,
} from "@evefrontier/dapp-kit";

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
    console.log("bringOffline: sending sponsored transaction");
    try {
      const result = await sendSponsoredTransaction({
        txAction: SponsoredTransactionActions.BRING_OFFLINE,
        assembly: assembly,
      });
      console.log("sponsored transaction result", result);
      return result;
    } catch (error) {
      console.error("sponsored transaction error", error);
      throw error;
    }
  }
};
