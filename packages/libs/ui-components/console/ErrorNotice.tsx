import { Ornament } from './primitives'

/**
 * A full-page error in the grid console's look: the console frame with a red
 * banner. For an error boundary's fallback, so it needs nothing but
 * `console.css`.
 */
const ErrorNotice = ({
  title = 'Something went wrong',
  message,
}: {
  title?: string
  message: string
}) => (
  <div className="gc-page">
    <div className="gc">
      <div className="c-top">
        <div className="orn" aria-hidden="true">
          <Ornament />
          <Ornament />
        </div>
        <div className="screen-title">Assembly</div>
      </div>
      <div className="note">
        <p className="banner red" role="alert">
          <b>{title}</b>
          {message}
        </p>
      </div>
    </div>
  </div>
)

export default ErrorNotice
