import React from "react";

/**
 * Renders a Divider that separates content.
 * @returns A React element representing a Divider.
 */
const Divider = React.memo(() => {
  return <div className="Eve-Divider w-full h-[1px] bg-neutral-10 my-4" />;
});

export default React.memo(Divider);
