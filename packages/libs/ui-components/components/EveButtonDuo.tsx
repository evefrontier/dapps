import React, { ButtonHTMLAttributes, FC } from "react";
import { ButtonCorner, ButtonWrap } from "../assets";

interface EveButtonDuoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onCancel: () => void;
  className?: string;
}

const EveButtonDuo: FC<EveButtonDuoProps> = ({
  onCancel,
  children,
  className,
  ...props
}) => {
  const { disabled, onClick, style, id } = props;

  return (
    <div
      className={`Eve-Button-Duo relative w-full items-center flex gap-2 ${className ? className : ""}`}
    >
      <button className={`Eve-Button Eve-Button-cancel`} onClick={onCancel}>
        Cancel
      </button>

      <button
        className={`Eve-Button grow`}
        style={style}
        onClick={onClick}
        disabled={disabled}
        id={id}
      >
        {children}
      </button>

      <ButtonWrap className="absolute -left-[5px]" />
      <ButtonWrap className="absolute -right-[5px] rotate-180" />
    </div>
  );
};

export default React.memo(EveButtonDuo);
