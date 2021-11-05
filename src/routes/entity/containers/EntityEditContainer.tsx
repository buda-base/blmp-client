import React, { useState, useEffect, useMemo } from "react"
import { ShapeFetcher, EntityFetcher } from "../../../helpers/rdf/io"
import { setDefaultPrefixes } from "../../../helpers/rdf/ns"
import { RDFResource, Subject, ExtRDFResourceWithLabel, history } from "../../../helpers/rdf/types"
import * as shapes from "../../../helpers/rdf/shapes"
import { generateNew } from "../../../helpers/rdf/construct"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import { entitiesAtom, EditedEntityState, Entity } from "../../../containers/EntitySelectorContainer"
import { getIcon } from "../../../containers/EntityInEntitySelectorContainer"
import PropertyGroupContainer from "./PropertyGroupContainer"
import {
  profileIdState,
  uiLangState,
  uiEditState,
  uiUndosState,
  noUndoRedo,
  uiTabState,
  uiNavState,
} from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { AppProps, IdTypeParams } from "../../../containers/AppContainer"
import * as rdf from "rdflib"
import qs from "query-string"
import * as ns from "../../../helpers/rdf/ns"
import { Redirect } from "react-router-dom"
import { replaceItemAtIndex } from "../../../helpers/atoms"
import { HashLink as Link } from "react-router-hash-link"
import { useAuth0 } from "@auth0/auth0-react"

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
  const shapeQname = props.shapeQname ?? props.match.params.shapeQname
  const entityQname = props.entityQname ?? props.match.params.entityQname
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const { isAuthenticated } = useAuth0()

  const [uiLang] = useRecoilState(uiLangState)
  const [edit, setEdit] = useRecoilState(uiEditState)

  const [undos, setUndos] = useRecoilState(uiUndosState)

  const [nav, setNav] = useRecoilState(uiNavState)

  const [profileId, setProfileId] = useRecoilState(profileIdState)
  const [tab, setTab] = useRecoilState(uiTabState)

  //debug("EntityEditContainer:", JSON.stringify(props), entityQname, isAuthenticated, profileId)

  useEffect(() => {
    entities.map((e, i) => {
      if (e.subjectQname === entityQname || e.subjectQname === profileId && entityQname === "tmp:user") {
        if (tab != i) {
          setTab(i)
          return
        }
      }
    })
  }, [entities, profileId])

  let init = 0
  useEffect(() => {
    if (entityQname === "tmp:user" && !profileId) return

    const delay = 350
    let n = -1 // is this used at all??
    const entityUri = ns.uriFromQname(entityQname === "tmp:user" ? profileId : entityQname)

    // wait for all data to be loaded then add flag in history
    if (init) clearInterval(init)
    init = setInterval(() => {
      if (history[entityUri]) {
        if (history[entityUri].some((h) => h["tmp:allValuesLoaded"])) {
          clearInterval(init)
          debug("(no init)", entityUri, n, history[entityUri])
        } else if (n === history[entityUri].length) {
          clearInterval(init)
          history[entityUri].push({ "tmp:allValuesLoaded": true })
          debug("init:", entityUri, n, history[entityUri])
          setUndos({ ...undos, [entityUri]: noUndoRedo })
        } else {
          n = history[entityUri].length
        }
      }
    }, delay)
  }, [entities, tab, profileId, entityQname])

  if (entityQname === "tmp:user" && !isAuthenticated) return <span>unauthorized</span>

  // useEffect(() => {
  //   debug("params", props.match.params.entityQname)
  //   if (props.match.params.entityQname) setEntityQname(props.match.params.entsityQname)
  //   if (props.match.params.shapeQname) setShapeQname(props.match.params.shapeQname)
  // }, [props.match.params])

  if (!(shapeQname in shapes.shapeRefsMap)) return <span>invalid shape!</span>

  // TODO: update highlighted tab

  // eslint-disable-next-line prefer-const
  let { entityLoadingState, entity } = EntityFetcher(entityQname, shapes.shapeRefsMap[shapeQname])
  const { loadingState, shape } = ShapeFetcher(shapeQname)

  // TODO: check that shape can be properly applied to entuty

  if (loadingState.status === "fetching" || entityLoadingState.status === "fetching" || entity.isEmpty()) {
    return (
      <div>
        <div>{i18n.t("types.loading")}</div>
      </div>
    )
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

  //debug("entity:", entity, shape)

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
  //const entityLabel = lang.ValueByLangToStrPrefLang(entity.prefLabels, uiLang)

  // creating new entity
  //const subject: Subject = generateNew("P", shape)

  const entityObj = entities.filter(
    (e) => e.subjectQname === entityQname || e.subjectQname === profileId && entityQname === "tmp:user"
  )
  const icon = getIcon(entityObj.length ? entityObj[0] : null)

  return (
    <React.Fragment>
      <div role="main" className="pt-4" style={{ textAlign: "center" }}>
        <div className={"header " + icon} {...(!icon ? { "data-shape": shape.qname } : {})}>
          <div className="shape-icon"></div>
          <div>
            <h1>{shapeLabel}</h1>
            <span>{entity.qname}</span>
          </div>
        </div>
      </div>
      <div role="navigation" className="innerNav">
        <p className="text-uppercase small my-2">{i18n.t("home.nav")}</p>
        {shape.groups.map((group, index) => {
          const label = lang.ValueByLangToStrPrefLang(group.prefLabels, uiLang)
          return (
            <Link
              key={group.qname}
              to={"#" + group.qname}
              // eslint-disable-next-line no-magic-numbers
              onClick={() => setTimeout(() => setNav(group.qname), 150)}
              className={nav === group.qname ? "on" : ""}
            >
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
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
    </React.Fragment>
  )
}

export default EntityEditContainer
