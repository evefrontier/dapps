import React, { HtmlHTMLAttributes, ReactNode } from "react";
import "../styles-ui.css";
import { Union } from "../assets";

type ContainerVariant = "default" | "warning" | "minimal";

interface EveContainerProps extends HtmlHTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: ContainerVariant;
  statusTextTop?: string;
  statusTextBottom?: string;
  headerText?: string;
  showBorder?: boolean;
  showHeader?: boolean;
}

const EveContainer: React.FC<EveContainerProps> = ({
  className = "",
  children,
  id,
  variant = "default",
  statusTextTop,
  statusTextBottom,
  headerText,
  showBorder = true,
  showHeader = true,
  ...rest
}) => {
  const getBorderClasses = () => {
    if (!showBorder) return "";
    return variant === "warning"
      ? "border border-alert"
      : "border border-neutral-20";
  };

  const getBackgroundClass = () => {
    return variant === "minimal" ? "" : "blur-bg";
  };

  const renderHeader = () => {
    if (!showHeader || !headerText) return null;
    return (
      <div className="Title flex p-2 border border-neutral-20">
        {headerText}
      </div>
    );
  };

  const renderCorners = () => {
    if (!showBorder) return null;
    return (
      <>
        <Union className="absolute -top-[5px] -left-[5px]" />
        <Union className="absolute -top-[5px] -right-[5px]" />
        <Union className="absolute -bottom-[5px] -left-[5px]" />
        <Union className="absolute -bottom-[5px] -right-[5px]" />
      </>
    );
  };

  return (
    <div
      className={`flex gap-2 p-2 align-center ${getBorderClasses()} ${getBackgroundClass()} relative ${className}`}
      id={id}
      {...rest}
    >
      {renderCorners()}
      {statusTextTop && (
        <div className="text-sm font-disket bg-alert p-2">{statusTextTop}</div>
      )}
      <div className="flex flex-col gap-2 w-full">
        {renderHeader()}
        {children}
      </div>
      {statusTextBottom && (
        <div className="text-sm font-disket bg-alert text-center p-1">
          {statusTextBottom}
        </div>
      )}
    </div>
  );
};

export default EveContainer;
