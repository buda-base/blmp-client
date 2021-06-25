import { EntityCreator } from "../../../helpers/rdf/construct"
import * as shapes from "../../../helpers/rdf/shapes"
import { RDFResourceWithLabel, Subject, EntityGraph } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import { entitiesAtom, EditedEntityState } from "../../../containers/EntitySelectorContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { useRecoilState } from "recoil"
import { AppProps } from "../../../containers/AppContainer"
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from "react-router-dom"
import React from "react"
import qs from "query-string"

const debug = require("debug")("bdrc:entity:entitycreation")

function EntityCreationContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)

  const subjectQname = props.match.params.subjectQname
  const propertyQname = props.match.params.propertyQname
  const index = props.match.params.index

  const shapeQname = props.match.params.shapeQname
  let shapeRef = null
  if (shapeQname in shapes.shapeRefsMap) shapeRef = shapes.shapeRefsMap[shapeQname]
  else return <span>invalid shape!</span>
  // if we know what shape we want, we can just create the entity:
  // TODO: perhaps the shape should be fetched there too, so that we can
  // properly generate the ID
  const { entityLoadingState, entity } = EntityCreator(shapeRef)
  if (entity) {
    if (subjectQname && propertyQname && index)
      return (
        <Redirect
          to={"/edit/" + entity.qname + "/" + shapeQname + "/" + subjectQname + "/" + propertyQname + "/" + index}
        />
      )
    else return <Redirect to={"/edit/" + entity.qname + "/" + shapeQname} />
  }

  // TODO: check if entityLoadingState is in error
  return <span className="new-fix">creating...</span>
}

export default EntityCreationContainer
