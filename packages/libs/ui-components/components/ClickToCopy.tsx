import React, { CSSProperties, useState } from "react";

import { CopyIcon } from "../assets";
import { clickToCopy } from "@evefrontier/dapp-kit";

/**
 * Renders a Copy icon that copies text to clipboard on click.
 * @param text - The text to be copied to clipboard.
 * @param className (optional) Additional Tailwind CSS class names for styling.
 * @param style (optional) Inline CSS styles for the component.
 * @returns A React element representing a CopyIcon with click-to-copy functionality.
 */
const ClickToCopy = React.memo(
  ({
    text,
    className,
    style,
  }: {
    text: string | undefined;
    className?: string;
    style?: CSSProperties;
  }) => {
    const [clicked, setClicked] = useState(false);

    const handleClick = () => {
      setClicked(true);
      clickToCopy(text ?? "");
      setTimeout(() => {
        setClicked(false);
      }, 3000);
    };

    return (
      <CopyIcon
        className={`Eve-Copy ml-2 cursor-pointer ${className} ${clicked ? "clicked" : ""}`}
        style={style}
        onClick={() => handleClick()}
      />
    );
  }
);

export default React.memo(ClickToCopy);
