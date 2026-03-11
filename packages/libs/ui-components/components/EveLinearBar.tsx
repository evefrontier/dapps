import React from "react";

const EveLinearBar = React.memo(
  ({
    nominator,
    denominator,
    label,
  }: {
    nominator: number;
    denominator: number;
    label?: string;
  }) => {
    const percentage =
      denominator === 0 && nominator === 0
        ? "0%"
        : `${(nominator / denominator) * 100}%`;

    return (
      <div className="relative">
        <div className="w-full h-4 bg-neutral-10 my-2">
          <div
            className={`h-full bg-neutral-20`}
            style={{ width: percentage, maxWidth: "100%" }}
            id="progress-bar"
          />
        </div>
        <div className="absolute right-1 bottom-2 text-neutral text-xs">
          {Intl.NumberFormat().format(nominator)} /{" "}
          {Intl.NumberFormat().format(denominator)} {label}
        </div>
      </div>
    );
  }
);

export default React.memo(EveLinearBar);
