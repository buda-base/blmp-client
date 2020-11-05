import React from "react"
import { Link } from "react-router-dom"
import PropTypes from "prop-types"

export const Alert = ({ type, text }) => {
  const name = `alert ${type} alert-dismissible fade show`

  return (
    <div className={name} role="alert">
      {text}
      <button type="button" className="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  )
}

Alert.propTypes = {
  type: PropTypes.string,
  text: PropTypes.string
}

export const AlertError = ({ text }) => {
  return (
    <div className="alert alert-danger fade show rounded-0" role="alert">
      {text}
    </div>
  )
}

AlertError.propTypes = {
  text: PropTypes.string
}

export function AlertBacklink({ text, goBack }) {
  return (
    <div className="alert alert-info alert-dismissible" role="alert">
      {text} Click&nbsp;
      <Link className="text-info" to={"#"} onClick={goBack}>
        here
      </Link>
      &nbsp;to go back.
    </div>
  )
}

export function AlertErrorForm({ text, dismissable = false }) {
  return (
    <div className="alert alert-danger alert-dismissible fade show small text-center" role="alert">
      {text}
      {dismissable ? (
        <button type="button" className="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      ) : null}
    </div>
  )
}
