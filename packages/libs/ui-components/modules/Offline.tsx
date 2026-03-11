import React from "react";

const Offline = React.memo(
  ({
    isParentNodeOnline,
  }: {
    isParentNodeOnline: boolean;
  }): React.JSX.Element => {
    /** If parent node is offline, show "NETWORK NODE OFFLINE"
     * else, show "ONLINE ASSEMBLY TO ACCESS"
     */
    return (
      <div className="row-span-3">
        <div className="p-2 flex justify-center w-full bg-alert font-disket text-xs">
          {isParentNodeOnline
            ? "ONLINE ASSEMBLY TO ACCESS"
            : "NETWORK NODE OFFLINE"}
        </div>
      </div>
    );
  },
);

export default Offline;
