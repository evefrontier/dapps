/**
 * The grid console's small parts: the Creation Builder ornament, the lever,
 * the lamp plate and the icons. Everything renders inside `.gc` (or
 * `.gc-toast-host`) and is styled by `console.css`.
 */

/** The diamond ornament in the top bar's corner. */
export const Ornament = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M8 1.2 14.8 8 8 14.8 1.2 8Z"
      fill="none"
      stroke="#ff4700"
      strokeWidth="1.2"
    />
    <path d="M8 5 11 8 8 11 5 8Z" fill="#ff4700" />
  </svg>
)

/** A breaker lever: up is on. Styled by `.lever`, sized by its parent. */
export const Lever = ({
  on,
  label,
  disabled,
  onClick,
}: {
  on: boolean
  label: string
  disabled?: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    className="lever"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
  >
    <span className="h" />
  </button>
)

/** The read-only stand-in for a lever: a lamp and ON or OFF. */
export const Plate = ({ on }: { on: boolean }) => (
  <div className={`plate ${on ? '' : 'off'}`} aria-hidden="true">
    <span className={`led ${on ? 'on' : ''}`} />
    <i>{on ? 'ON' : 'OFF'}</i>
  </div>
)

/** The pencil icon for Edit details. */
export const EditIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M13.0394 5.26824L8.39549 9.95045L7.15894 8.70284L11.802 4.02148L13.0394 5.26824Z" />
    <path d="M14.9717 3.32L13.7121 4.59L12.4756 3.34238L13.7343 2.07324L14.9717 3.32Z" />
    <path d="M9.47395 3.76336H3.97353V11.0019H13.2511V7.55442H15V12.7653H3.97353V14H2.2246V12.7653H1V11.0019H2.2246V2H9.47395V3.76336Z" />
  </svg>
)

/** The cross on a dismiss button. */
export const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    aria-hidden="true"
  >
    <path d="M2 2l10 10M12 2L2 12" />
  </svg>
)
