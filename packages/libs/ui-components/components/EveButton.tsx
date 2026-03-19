import React, { ButtonHTMLAttributes, FC, useEffect, useState } from "react";
import { ButtonWrap, ButtonCorner } from "../assets";
import { createLogger } from "@evefrontier/dapp-kit";

const log = createLogger();

interface EveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: "primary" | "secondary" | "tertiary" | "ghost";
  cooldown?: number;
  isCta?: boolean;
  size?: "sm" | "md";
}

const EveButton: FC<EveButtonProps> = ({ children, ...props }) => {
  const [coolingDown, setCoolingDown] = useState(false);

  const { variant, disabled, onClick, style, className, id, isCta, cooldown } =
    props;

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick) return;

    try {
      await onClick(e);
      if (cooldown && cooldown > 0) {
        setCoolingDown(true);
        setTimeout(() => {
          setCoolingDown(false);
        }, cooldown);
      }
    } catch (error) {
      log.error("Error in button click handler:", error);
    }
  };

  return (
    <button
      className={`Eve-Button relative ${variant} ${
        coolingDown ? "cooldown" : ""
      } ${className ? className : ""} ${isCta ? "cta" : ""}`}
      style={style}
      onClick={handleClick}
      disabled={disabled || coolingDown}
      id={id}
    >
      {variant === "primary" && (
        <>
          <ButtonWrap className="absolute -left-[5px]" />
          <ButtonWrap className="absolute -right-[5px] rotate-180" />
        </>
      )}

      {variant === "secondary" && (
        <>
          <ButtonCorner className="absolute -top-[1px] -left-[1px] -rotate-90 button-corner" />
          <ButtonCorner className="absolute -top-[1px] -right-[1px] button-corner" />
          <ButtonCorner className="absolute -bottom-[1px] -left-[1px] rotate-180 button-corner" />
          <ButtonCorner className="absolute -bottom-[1px] -right-[1px] rotate-90 button-corner" />
        </>
      )}

      {children}
    </button>
  );
};

export default React.memo(EveButton);
