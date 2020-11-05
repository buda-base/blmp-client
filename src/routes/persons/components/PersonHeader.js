import React from "react"
import PropTypes from "prop-types"

import { PersonIcon } from "../../layout/icons"

function PersonHeader(props) {
  const { id, name } = props

  if (!name) return null;

  return (
    <div className="d-flex justify-content-center">
      <div className="float-left"><PersonIcon className="icon-left py-1 pr-1" height="50px"/></div>
      <div className="float-left">
      <p className="h4 my-0">{id}</p>
        <p className="">{name}</p>
      </div>
    </div>
  )
}

PersonHeader.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired
}

export default PersonHeader
