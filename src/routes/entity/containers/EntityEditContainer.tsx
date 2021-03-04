import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher, debugStore } from "../../../helpers/rdf/io"
import { RDFResource, Subject } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import PropertyGroupContainer from "./PropertyGroupContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { AppProps, IdTypeParams } from "../../../containers/AppContainer"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"

const debug = require("debug")("bdrc:entity:edit")

function EntityEditContainer(props: AppProps) {
  const [typeQname] = useState(props.match.params.type)
  const [uiLang] = useRecoilState(uiLangState)
  if (!typeQname) return null
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

  const shapeLabel = lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)

  // creating new entity
  const subject: Subject = generateNew("P")

  const save = (): void => {
    debug("save!")
    const store = new rdf.Store()
    subject.propValuesToStore(store)
    debug("save2!")
    debugStore(store)
    debug("save3!")
  }

  return (
    <React.Fragment>
      <div role="main">
        {subject.qname} -- {shapeLabel}
      </div>
      <div>
        {shape.groups.map((group, index) => (
          <PropertyGroupContainer key={index} group={group} subject={subject} />
        ))}
      </div>
      <Button variant="outlined" onClick={save}>
        Save
      </Button>
    </React.Fragment>
  )
}

export default EntityEditContainer
