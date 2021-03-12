import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher, debugStore, EntityFetcher } from "../../../helpers/rdf/io"
import * as shapes from "../../../helpers/rdf/shapes"
import { setDefaultPrefixes } from "../../../helpers/rdf/ns"
import { RDFResource, Subject, RDFResourceWithLabel, ExtRDFResourceWithLabel } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import { entitiesAtom, EditedEntityState } from "../../../containers/EntitySelectorContainer"
import PropertyGroupContainer from "./PropertyGroupContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { AppProps, IdTypeParams } from "../../../containers/AppContainer"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom"

const debug = require("debug")("bdrc:entity:newentity")

function NewEntityContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const shapeQname = props.match.params.shapeQname
  if (shapeQname) {
    let shapeRef = null
    if (shapeQname in shapes.shapeRefsMap) shapeRef = shapes.shapeRefsMap[shapeQname]
    else return <span>invalid shape!</span>
    // if we know what shape we want, we can just create the entity:
    // TODO: perhaps the shape should be fetched there too, so that we can
    // properly generate the ID
    const newSubject = generateNew("P", null)
    debug(newSubject)
    const newEntity = {
      subjectQname: newSubject.qname,
      highlighted: true,
      state: EditedEntityState.NeedsSaving,
      shapeRef: shapeRef,
      subject: newSubject,
    }
    // TODO: unhighlight if highglight already present
    setEntities([newEntity, ...entities])
    props.history.push("/edit/" + newSubject.qname + "/" + shapeQname)
    return <span>creating...</span>
  }

  // otherwise we want the user to select the appropriate shape
  return (
    <React.Fragment>
      <div>
        {shapes.possibleShapeRefs.map((shape: RDFResourceWithLabel, index: number) => (
          <Link key={shape.qname} to={"/new/" + shape.qname}>
            {lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)}
          </Link>
        ))}
      </div>
    </React.Fragment>
  )
}

export default NewEntityContainer
