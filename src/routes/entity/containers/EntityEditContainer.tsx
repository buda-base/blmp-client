import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher, debugStore, EntityFetcher } from "../../../helpers/rdf/io"
import { setDefaultPrefixes } from "../../../helpers/rdf/ns"
import { RDFResource, Subject, ExtRDFResourceWithLabel } from "../../../helpers/rdf/types"
import * as shapes from "../../../helpers/rdf/shapes"
import { generateNew } from "../../../helpers/rdf/construct"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import { entitiesAtom, EditedEntityState, Entity } from "../../../containers/EntitySelectorContainer"
import PropertyGroupContainer from "./PropertyGroupContainer"
import { uiLangState, uiEditState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { AppProps, IdTypeParams } from "../../../containers/AppContainer"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"
import qs from "query-string"
import * as ns from "../../../helpers/rdf/ns"
import { Redirect } from "react-router-dom"
import { replaceItemAtIndex } from "../../../helpers/atoms"

const debug = require("debug")("bdrc:entity:edit")

export function EntityEditContainerMayUpdate(props: AppProps) {
  const shapeQname = props.match.params.shapeQname
  const entityQname = props.match.params.entityQname
  const subjectQname = props.match.params.subjectQname
  const propertyQname = props.match.params.propertyQname
  const index = props.match.params.index

  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const entity = entities.filter((e) => e.subjectQname === subjectQname)
  if (entity.length && entity[0].subject && propertyQname && entityQname && index)
    return (
      <EntityEditContainerDoUpdate
        subject={entity[0].subject}
        propertyQname={propertyQname}
        objectQname={entityQname}
        index={Number(index)}
        {...props}
      />
    )
  // TODO: add 'could not find subject' warning?
  else return <Redirect to={"/edit/" + subjectQname + "/" + shapeQname} />
}

interface AppPropsDoUpdate extends AppProps {
  subject: Subject
  propertyQname: string
  objectQname: string
  index: number
}

function EntityEditContainerDoUpdate(props: AppPropsDoUpdate) {
  const shapeQname = props.match.params.shapeQname
  const atom = props.subject.getAtomForProperty(ns.uriFromQname(props.propertyQname))
  const [list, setList] = useRecoilState(atom)

  debug("LIST:", list, atom)

  const newObject = new ExtRDFResourceWithLabel(props.objectQname, {}, {})
  // DONE: must also give set index in url
  const newList = replaceItemAtIndex(list, props.index, newObject)
  setList(newList)

  return <Redirect to={"/edit/" + props.objectQname + "/" + shapeQname} />
}

function EntityEditContainer(props: AppProps) {
  //const [shapeQname, setShapeQname] = useState(props.match.params.shapeQname)
  //const [entityQname, setEntityQname] = useState(props.match.params.entityQname)
  const shapeQname = props.match.params.shapeQname
  const entityQname = props.match.params.entityQname
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const [uiLang] = useRecoilState(uiLangState)
  const [edit, setEdit] = useRecoilState(uiEditState)

  // useEffect(() => {
  //   debug("params", props.match.params.entityQname)
  //   if (props.match.params.entityQname) setEntityQname(props.match.params.entityQname)
  //   if (props.match.params.shapeQname) setShapeQname(props.match.params.shapeQname)
  // }, [props.match.params])

  if (!(shapeQname in shapes.shapeRefsMap)) return <span>invalid shape!</span>

  // TODO: update highlighted tab

  // eslint-disable-next-line prefer-const
  let { entityLoadingState, entity } = EntityFetcher(entityQname, shapes.shapeRefsMap[shapeQname])
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

  //debug("entity:", entity)

  /* // no need for updateEntitiesRDF

  // DONE: add new entity as object for property where it was created
  const urlParams = qs.parse(props.history.location.search)
  const index = entities.findIndex((e) => e.subjectQname === urlParams.subject)
  // DONE: ok if subject for property is a new one
  if (index >= 0 && entities[index].subject) {
    const subject = entities[index].subject
    if (subject) {
      const rdf = "<" + subject.uri + "> <" + urlParams.propid + "> <" + ns.uriFromQname(entity.qname) + "> ."
      // DONE: fix deleted property reappearing
      updateEntitiesRDF(subject, subject.extendWithTTL, rdf, entities, setEntities)
      props.history.replace(props.history.location.pathname)
    }
  }
  */

  const shapeLabel = lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)

  // creating new entity
  //const subject: Subject = generateNew("P", shape)

  const save = (): void => {
    const store = new rdf.Store()
    ns.setDefaultPrefixes(store)
    entity.graph.addNewValuestoStore(store)
    debugStore(store)
  }

  //debug("entity.store", entity.graph.store.statements)

  return (
    <React.Fragment>
      <div role="main" className="pt-4" style={{ textAlign: "center" }}>
        {entity.qname} -- {shapeLabel}
      </div>
      <section className="album py-2 my-2">
        <TimeTravelObserver />
      </section>
      <div>
        {edit && (
          <div
            className="group-edit-BG"
            onClick={(e) => {
              setEdit("")
              e.stopPropagation()
            }}
          ></div>
        )}
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
