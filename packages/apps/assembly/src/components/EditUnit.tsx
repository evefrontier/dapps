import React, { useState, useRef, useEffect, RefObject } from "react";

import {
  useSmartObject,
  useConnection,
  useNotification,
  isOwner,
  useSponsoredTransaction,
  SponsoredTransactionActions,
  Severity,
} from "@evefrontier/dapp-kit";
import { EveInput, EveButtonDuo, Divider } from "@eveworld/ui-components";

/**
 * EditUnit component for handling editing of Smart Assembly properties.
 *
 * This component renders fields to edit DApp URL, unit name, and unit description.
 * It provides functionality to save the edited values in one transaction.
 *
 * Props:
 * - handleClose: () => void - Function to handle returning to the previous view.
 *
 * State:
 * - isEdited: boolean - Flag to track if any field has been edited.
 *
 * Dependencies:
 * - walletClient, publicClient: from useConnection hook.
 * - handleSendTx, notify: from useNotification hook.
 * - assembly: from useSmartObject hook.
 *
 * Side Effects:
 * - Updates the edited values in the fields.
 * - Executes a transaction to set Smart Assembly metadata.
 */
const EditUnit = React.memo(({ handleClose }: { handleClose: () => void }) => {
  const [isEdited, setIsEdited] = useState<boolean>(false);

  const { notify } = useNotification();
  const { assembly, refetch } = useSmartObject();

  const urlValueRef = useRef(assembly?.dappURL ?? "");
  const nameValueRef = useRef(assembly?.name ?? "");
  const descriptionValueRef = useRef(assembly?.description ?? "");

  const { mutateAsync: sendSponsoredTransaction } = useSponsoredTransaction();

  const handleEdit = (
    refString: RefObject<string | number>,
    eventString: string | number | null,
  ): void => {
    if (eventString == null || !assembly) return;

    setIsEdited(true);
    refString.current = eventString;
  };

  /** Async function that calls ´setEntityRecordOffchain´,
   * setting Smart Assembly URL, name, description in one transaction.
   **/
  const handleSave = async () => {
    if (!assembly) return;

    await sendSponsoredTransaction({
      txAction: SponsoredTransactionActions.UPDATE_METADATA,
      assembly: assembly,
      metadata: {
        name: nameValueRef.current as string,
        description: descriptionValueRef.current as string,
        url: urlValueRef.current as string,
      },
    })
      .then(async (result) => {
        notify({
          type: Severity.Success,
          txHash: result.digest,
          onSuccess: async () => {
            await refetch();
            handleClose();
          },
        });
        handleClose();
      })
      .catch((error) => {
        notify({
          type: Severity.Error,
          message: error.message,
        });
      });
  };

  return (
    <div className="!p-4 grid gap-2">
      <EveInput
        inputType="string"
        defaultValue={assembly?.name}
        onChange={(str) => handleEdit(nameValueRef, str)}
        fieldName="Name"
      />
      <EveInput
        inputType="multiline"
        defaultValue={assembly?.description}
        onChange={(str) => handleEdit(descriptionValueRef, str)}
        fieldName="Description"
        maxChars={100}
      />

      {assembly?.type.includes("Smart") && (
        <>
          <Divider />
          <div className="mb-4">
            <div className="text-lg font-disket text-neutral">Custom dapp</div>
            <div className="text-neutral-50 font-light">
              Link your own behaviour dApp to this assembly
            </div>
          </div>
          <EveInput
            inputType="string"
            defaultValue={assembly?.dappURL}
            onChange={(str) => handleEdit(urlValueRef, str)}
            fieldName="DApp link"
          />
        </>
      )}
      <div className="mb-2" />
      <EveButtonDuo
        onCancel={() => {
          handleClose();
        }}
        className=""
        onClick={() => handleSave()}
        disabled={!isOwner || !isEdited}
        id="send-save-tx"
      >
        Save
      </EveButtonDuo>
    </div>
  );
});

export default React.memo(EditUnit);
