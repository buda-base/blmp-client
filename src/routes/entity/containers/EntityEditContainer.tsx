import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher, debugStore, EntityFetcher } from "../../../helpers/rdf/io"
import { setDefaultPrefixes } from "../../../helpers/rdf/ns"
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
  const { entityLoadingState, entity } = EntityFetcher("bdr:P1583")

  if (loadingState.status === "fetching" || entityLoadingState.status === "fetching")
    return <span>{i18n.t("loading")}</span>
  if (loadingState.status === "error" || entityLoadingState.status === "error") {
    return (
      <p className="text-center text-muted">
        <NotFoundIcon className="icon mr-2" />
        {loadingState.error}

        {entityLoadingState.error}
      </p>
    )
  }

  if (!shape) return null
  if (!entity) return null

  const shapeLabel = lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)

  // creating new entity
  //const subject: Subject = generateNew("P", shape)

  const save = (): void => {
    const store = new rdf.Store()
    setDefaultPrefixes(store)
    entity.graph.addNewValuestoStore(store)
    debug(store.statements)
    debugStore(store)
  }

  return (
    <React.Fragment>
      <div role="main" className="pt-4" style={{ textAlign: "center" }}>
        {entity.qname} -- {shapeLabel}
      </div>
      <section className="album py-2 my-2">
        <TimeTravelObserver />
      </section>
      <div>
        {shape.groups.map((group, index) => (
          <PropertyGroupContainer key={group.uri} group={group} subject={entity} />
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        <Button variant="outlined" onClick={save}>
          Save
        </Button>
      </div>
    </React.Fragment>
  )
}

export default EntityEditContainer
