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
import * as rdf from "rdflib"

const debug = require("debug")("bdrc:entity:entitycreation")

function EntityCreationContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const shapeQname = props.match.params.shapeQname
  let shapeRef = null
  if (shapeQname in shapes.shapeRefsMap) shapeRef = shapes.shapeRefsMap[shapeQname]
  else return <span>invalid shape!</span>
  // if we know what shape we want, we can just create the entity:
  // TODO: perhaps the shape should be fetched there too, so that we can
  // properly generate the ID
  const { entityLoadingState, entity } = EntityCreator(shapeRef)

  if (entity) {
    // TODO: add new entity as object for property where it was created
    const urlParams = qs.parse(props.history.location.search)
    const index = entities.findIndex((e) => e.subjectQname === urlParams.subject)
    if (index >= 0 && entities[index].subject) {
      const subject = entities[index].subject
      const graph = subject?.graph
      if (subject && graph) {
        const store: rdf.Store = rdf.graph()
        const statement = "<" + subject.uri + "> <" + urlParams.propid + "> <" + entity.qname + "> ."
        debug("rdf:", statement)
        rdf.parse(statement, store, rdf.Store.defaultGraphURI, "text/turtle")
        graph.addNewValuestoStore(store)
        const newSubject = new Subject(subject?.node, graph)
        debug("subject:", subject, newSubject)
        const newEntities = [...entities]
        newEntities[index] = { ...entities[index], subject: newSubject }
        setEntities(newEntities)
        return <Redirect to={"/edit/" + entity.qname + "/" + shapeQname} />
      }
    } else {
      return <Redirect to={"/edit/" + entity.qname + "/" + shapeQname} />
    }
  }

  // TODO: check if entityLoadingState is in error
  return <span>creating...</span>
}

export default EntityCreationContainer
