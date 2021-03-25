import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher, debugStore, EntityFetcher } from "../../../helpers/rdf/io"
import { setDefaultPrefixes } from "../../../helpers/rdf/ns"
import { RDFResource, Subject } from "../../../helpers/rdf/types"
import * as shapes from "../../../helpers/rdf/shapes"
import { generateNew } from "../../../helpers/rdf/construct"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import { entitiesAtom, EditedEntityState, Entity } from "../../../containers/EntitySelectorContainer"
import PropertyGroupContainer from "./PropertyGroupContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { AppProps, IdTypeParams } from "../../../containers/AppContainer"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"

const debug = require("debug")("bdrc:entity:edit")

function EntityEditContainer(props: AppProps) {
  //const [shapeQname, setShapeQname] = useState(props.match.params.shapeQname)
  //const [entityQname, setEntityQname] = useState(props.match.params.entityQname)
  const shapeQname = props.match.params.shapeQname
  const entityQname = props.match.params.entityQname

  const [uiLang] = useRecoilState(uiLangState)

  // useEffect(() => {
  //   debug("params", props.match.params.entityQname)
  //   if (props.match.params.entityQname) setEntityQname(props.match.params.entityQname)
  //   if (props.match.params.shapeQname) setShapeQname(props.match.params.shapeQname)
  // }, [props.match.params])

  if (!(shapeQname in shapes.shapeRefsMap)) return <span>invalid shape!</span>

  // TODO: update highlighted tab

  const { entityLoadingState, entity } = EntityFetcher(entityQname, shapes.shapeRefsMap[shapeQname])
  const { loadingState, shape } = ShapeFetcher(shapeQname)

  // TODO: check that shape can be properly applied to entuty

  if (loadingState.status === "fetching" || entityLoadingState.status === "fetching") {
    return <span>{i18n.t("loading")}</span>
  }
  if (loadingState.status === "error" || entityLoadingState.status === "error") {
    return (
      <p className="text-center text-muted">
        <NotFoundIcon className="icon mr-2" />
        {loadingState.error}

        {entityLoadingState.error}
      </p>
    )
  }

  if (!shape || !entity) return null

  const shapeLabel = lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)

  // creating new entity
  //const subject: Subject = generateNew("P", shape)

  const save = (): void => {
    const store = new rdf.Store()
    entity.graph.addNewValuestoStore(store)
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
