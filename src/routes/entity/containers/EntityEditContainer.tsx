import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher } from "../../../helpers/rdf/io"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import PropertyGroupContainer from "./PropertyGroupContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { AppProps , IdTypeParams } from "../../../containers/AppContainer"

const debug = require("debug")("bdrc:entity:edit")

function EntityEditContainer(props: AppProps) {
  const [typeQname] = useState(props.match.params.type)
  const [uiLang] = useRecoilState(uiLangState)
  if (!typeQname)
    return null
  const { loadingState, shape } = ShapeFetcher(typeQname)

  if (loadingState.status === "fetching")
    return (<span>{i18n.t("loading")}</span>)
  if (loadingState.status === "error") {
    return (
      <p className="text-center text-muted">
        <NotFoundIcon className="icon mr-2" />
        {loadingState.error}
      </p>
    )
  }

  if (!shape) return null

  const label = lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)

  return (
    <React.Fragment>
      <div role="main">{label}</div>
      <div>
        {shape.groups.map((group, index) => (
          <PropertyGroupContainer key={index} group={group} />
        ))}
      </div>
    </React.Fragment>
  )
}

export default EntityEditContainer