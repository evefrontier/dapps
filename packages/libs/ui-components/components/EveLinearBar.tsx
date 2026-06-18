import React from 'react'

const EveLinearBar = React.memo(
  ({
    nominator,
    denominator,
    label,
    wholeNumbers = false,
  }: {
    nominator: number
    denominator: number
    label?: string
    wholeNumbers?: boolean
  }) => {
    const percentage =
      denominator === 0 && nominator === 0
        ? '0%'
        : `${(nominator / denominator) * 100}%`

    const displayNominator = wholeNumbers ? Math.round(nominator) : nominator
    const displayDenominator = wholeNumbers
      ? Math.round(denominator)
      : denominator

    return (
      <div className="relative">
        <div className="w-full h-4 bg-neutral-10 my-2">
          <div
            className={`h-full bg-neutral-20`}
            style={{ width: percentage, maxWidth: '100%' }}
            id="progress-bar"
          />
        </div>
        <div className="absolute right-1 bottom-2 text-neutral text-xs">
          {Intl.NumberFormat().format(displayNominator)} /{' '}
          {Intl.NumberFormat().format(displayDenominator)} {label}
        </div>
      </div>
    )
  },
)

export default React.memo(EveLinearBar)
