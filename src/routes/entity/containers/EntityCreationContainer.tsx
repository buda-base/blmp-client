import { EntityCreator } from "../../../helpers/rdf/construct"
import { ShapeFetcher, EntityFetcher } from "../../../helpers/rdf/io"
import * as shapes from "../../../helpers/rdf/shapes"
import { RDFResourceWithLabel, Subject, EntityGraph } from "../../../helpers/rdf/types"
import { entitiesAtom, EditedEntityState } from "../../../containers/EntitySelectorContainer"
import { uiLangState, userIdState, RIDprefixState, uiTabState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { useRecoilState } from "recoil"
import { AppProps } from "../../../containers/AppContainer"
import { Dialog422 } from "../../../components/Dialog"
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useParams, useHistory } from "react-router-dom"
import React, { useEffect, useState } from "react"
import qs from "query-string"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import queryString from "query-string"
import Button from "@material-ui/core/Button"

const debug = require("debug")("bdrc:entity:entitycreation")

export function EntityCreationContainer(props: AppProps) {
  const subjectQname = props.match.params.subjectQname
  const shapeQname = props.match.params.shapeQname
  const propertyQname = props.match.params.propertyQname
  const index = props.match.params.index
  const subnodeQname = props.match.params.subnodeQname

  // entityQname is an ID desired by the user. In that case we must:
  // - if an entity with the same qname is already open in the editor, just redirect to it
  // - else call EntityCreator
  const entityQname = props.match.params.entityQname
  const [userId, setUserId] = useRecoilState(userIdState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)
  const [uiTab, setUiTab] = useRecoilState(uiTabState)

  const routerHistory = useHistory()

  const unmounting = { val: false }
  useEffect(() => {
    return () => {
      //debug("unm:ecc")
      unmounting.val = true
    }
  }, [])

  if (RIDprefix == "") return <Redirect to="/new" />

  const { entityLoadingState, entity } = unmounting.val
    ? { entityLoadingState: { status: "idle" }, entity: null }
    : EntityCreator(shapeQname, entityQname, unmounting)

  debug("new:", entityLoadingState, entity, entityQname, entity?.qname, shapeQname)

  // TODO: if EntityCreator throws a 422 exception (the entity already exists),
  // we must give a choice to the user:
  //    * open the existing entity
  //    * create an entity with a different id, in which case we call reserveLname again
  if (entityLoadingState.error === "422") {
    // eslint-disable-line no-magic-numbers

    const editUrl =
      subjectQname && propertyQname && index != undefined
        ? "/edit/" +
          entityQname +
          "/" +
          shapeQname +
          "/" +
          subjectQname +
          "/" +
          propertyQname +
          "/" +
          index +
          (subnodeQname ? "/" + subnodeQname : "") +
          (props.copy ? "?copy=" + props.copy : "")
        : "/edit/" + (entityQname ? entityQname : entity.qname) + "/" + shapeQname

    const newUrl = routerHistory.location.pathname.replace(/\/named\/.*/, "") + routerHistory.location.search

    return <Dialog422 open={true} shaped={shapeQname} named={entityQname} editUrl={editUrl} newUrl={newUrl} />
  } else if (entity) {
    if (subjectQname && propertyQname && index != undefined)
      return (
        <Redirect
          to={
            "/edit/" +
            (entityQname ? entityQname : entity.qname) +
            "/" +
            shapeQname +
            "/" +
            subjectQname +
            "/" +
            propertyQname +
            "/" +
            index +
            (subnodeQname ? "/" + subnodeQname : "") +
            (props.copy ? "?copy=" + props.copy : "")
          }
        />
      )
    else if(routerHistory.location.pathname.includes("/named/")) {
      return <Redirect to={"/edit/" + entityQname + "/" + shapeQname} />
    } else {
      return <Redirect to={"/edit/" + (entityQname ? entityQname : entity.qname) + "/" + shapeQname} />
    }
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
export function EntityCreationContainerAlreadyOpen(props: AppProps) {
  const subjectQname = props.match.params.subjectQname
  const shapeQname = props.match.params.shapeQname
  const propertyQname = props.match.params.propertyQname
  const index = props.match.params.index
  const subnodeQname = props.match.params.subnodeQname

  // entityQname is an ID desired by the user. In that case we must:
  // - if an entity with the same qname is already open in the editor, just redirect to it
  // - else call EntityCreator
  const entityQname = props.match.params.entityQname
  const [userId, setUserId] = useRecoilState(userIdState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)
  const [uiTab, setUiTab] = useRecoilState(uiTabState)

  const routerHistory = useHistory()

  const unmounting = { val: false }
  useEffect(() => {
    return () => {
      //debug("unm:ecc")
      unmounting.val = true
    }
  }, [])

  if (subjectQname && propertyQname && index != undefined)
    return (
      <Redirect
        to={
          "/edit/" +
          entityQname +
          "/" +
          shapeQname +
          "/" +
          subjectQname +
          "/" +
          propertyQname +
          "/" +
          index +
          (subnodeQname ? "/" + subnodeQname : "") +
          (props.copy ? "?copy=" + props.copy : "")
        }
      />
    )
  else if(routerHistory.location.pathname.includes("/named/")) {
    return <Redirect to={"/edit/" + entityQname + "/" + shapeQname} />
  } 
  else return <Redirect to={"/edit/" + entity.qname + "/" + shapeQname} />

  return (
    <div>
      <div>{i18n.t("types.loading")}</div>
    </div>
  )
}

export function EntityCreationContainerRoute(props: AppProps) {
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const i = entities.findIndex((e) => e.subjectQname === props.match.params.entityQname)
  const theEntity = entities[i]

  const { copy } = queryString.parse(props.location.search, { decode: false })

  //debug("search/copy:", copy)

  if (theEntity) return <EntityCreationContainerAlreadyOpen {...props} entity={theEntity.subject} copy={copy} />
  else return <EntityCreationContainer {...props} copy={copy} />
}

export default EntityCreationContainer
