import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher } from "../../../helpers/rdf/io"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"

const debug = require("debug")("bdrc:entity:edit")

function EntityEditContainer(props) {
  const [typeQname] = useState(props.match.params.type)
  const { loadingState, shape } = ShapeFetcher(typeQname)

  if (loadingState.status === "fetching") return <span>{i18n.t("loading")}</span>
  if (loadingState.status === "error") {
    return (
      <p className="text-center text-muted">
        <NotFoundIcon className="icon mr-2" />
        {loadingState.error}
      </p>
    )
  }

  if (!shape) return null

  return (
    <React.Fragment>
      <div role="main">Hello world entity edit</div>
    </React.Fragment>
  )
}

export default EntityEditContainer
