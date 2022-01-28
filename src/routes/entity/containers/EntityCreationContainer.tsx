import { EntityCreator } from "../../../helpers/rdf/construct"
import { ShapeFetcher } from "../../../helpers/rdf/io"
import * as shapes from "../../../helpers/rdf/shapes"
import { RDFResourceWithLabel, Subject, EntityGraph } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import { entitiesAtom, EditedEntityState } from "../../../containers/EntitySelectorContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { useRecoilState } from "recoil"
import { AppProps } from "../../../containers/AppContainer"
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from "react-router-dom"
import React, { useEffect } from "react"
import qs from "query-string"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"

const debug = require("debug")("bdrc:entity:entitycreation")

function EntityCreationContainer(props: AppProps) {
  const subjectQname = props.match.params.subjectQname
  const propertyQname = props.match.params.propertyQname
  const index = props.match.params.index

  const shapeQname = props.match.params.shapeQname

  const unmounting = { val: false }
  useEffect(() => {
    return () => {
      //debug("unm:ecc")
      unmounting.val = true
    }
  }, [])

  const { entityLoadingState, entity } = unmounting.val
    ? { entityLoadingState: { status: "idle" }, entity: null }
    : EntityCreator(shapeQname, unmounting)
  if (entity) {
    if (subjectQname && propertyQname && index)
      return (
        <Redirect
          to={"/edit/" + entity.qname + "/" + shapeQname + "/" + subjectQname + "/" + propertyQname + "/" + index}
        />
      )
    else return <Redirect to={"/edit/" + entity.qname + "/" + shapeQname} />
  }
  if (entityLoadingState.status === "error") {
    return (
      <p className="text-center text-muted">
        <NotFoundIcon className="icon mr-2" />
        {entityLoadingState.error}
      </p>
    )
  }
  return (
    <div>
      <div>{i18n.t("types.creating")}</div>
    </div>
  )
}

export default EntityCreationContainer
