import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher, debugStore, EntityFetcher } from "../../../helpers/rdf/io"
import { setDefaultPrefixes } from "../../../helpers/rdf/ns"
import { RDFResource, Subject, RDFResourceWithLabel } from "../../../helpers/rdf/types"
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
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from "react-router-dom"

const debug = require("debug")("bdrc:entity:edit")

function EntityShapeChooserContainer(props: AppProps) {
  const [entityQname, setEntityQname] = useState(props.match.params.entityQname)
  const [uiLang] = useRecoilState(uiLangState)
  const [entities] = useRecoilState(entitiesAtom)

  useEffect(() => {
    debug("params", props.match.params.entityQname)
    if (props.match.params.entityQname) setEntityQname(props.match.params.entityQname)
  }, [props.match.params])

  // here we create the entity in the list if it's not there yet:
  const entityFromList = entities.find((e) => e.subjectQname === entityQname)
  if (entityFromList && entityFromList.shapeRef) {
    const shapeQname = entityFromList.shapeRef.qname
    props.history.replace("/edit/" + entityQname + "/" + shapeQname)
    return <span>redirecting...</span>
  }
  const { entityLoadingState, entity } = EntityFetcher(entityQname, null)

  if (entity) {
    const possibleShapes = shapes.shapeRefsForEntity(entity)
    if (!possibleShapes) {
      return <span>cannot find any appropriate shape for this entity</span>
    }
    if (possibleShapes.length > 1) {
      return (
        <div>
          {shapes.possibleShapeRefs.map((shape: RDFResourceWithLabel, index: number) => (
            <Link key={shape.qname} to={"/edit/" + entityQname + "/" + shape.qname}>
              {lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)}
            </Link>
          ))}
        </div>
      )
    } else {
      return <Redirect to={"/edit/" + entityQname + "/" + possibleShapes[0].qname} />
    }
  }

  return <span>loading...</span>
}

export default EntityShapeChooserContainer
