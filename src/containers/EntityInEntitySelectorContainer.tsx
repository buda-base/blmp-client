/* eslint-disable no-extra-parens */
import React, { useState, FC, useEffect, ChangeEvent } from "react"
import { Subject, RDFResourceWithLabel, RDFResource } from "../helpers/rdf/types"
import { setUserSession, setUserLocalEntities } from "../helpers/rdf/io"
import * as shapes from "../helpers/rdf/shapes"
import { FiPower as LogoutIcon } from "react-icons/fi"
import { InputLabel, Select, MenuItem } from "@material-ui/core"
import i18n from "i18next"
import { atom, useRecoilState, useRecoilValue, selectorFamily } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import { FormHelperText, FormControl } from "@material-ui/core"
import { AppProps, IdTypeParams } from "./AppContainer"
import { BrowserRouter as Router, Switch, Route, Link, useHistory } from "react-router-dom"
import { uiLangState, uiTabState } from "../atoms/common"
import { makeStyles } from "@material-ui/core/styles"
import Tabs from "@material-ui/core/Tabs"
import Tab from "@material-ui/core/Tab"
import * as lang from "../helpers/lang"
import * as ns from "../helpers/rdf/ns"
import { Entity, EditedEntityState, entitiesAtom, defaultEntityLabelAtom } from "./EntitySelectorContainer"
import * as rdf from "rdflib"
import { CloseIcon } from "../routes/layout/icons"

const debug = require("debug")("bdrc:entity:selector")

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  }
}

export const getIcon = (entity: Entity) => {
  if (!entity) return
  let icon
  if (entity.subject) {
    const rdfType = ns.RDF("type") as rdf.NamedNode
    for (const s of entity.subject.graph.store.statements) {
      if (s.predicate.value === rdfType.value && s.subject.value === entity.subject.node.value) {
        icon = s.object.value.replace(/.*?[/]([^/]+)$/, "$1").toLowerCase()
      }
    }
  }
  let shapeQname = entity.shapeRef
  if (entity.shapeRef && entity.shapeRef.qname) shapeQname = entity.shapeRef.qname
  if (!icon && shapeQname) {
    // TODO: might be something better than that...
    icon = shapeQname.replace(/^[^:]+:([^:]+?)Shape[^/]*$/, "$1").toLowerCase()
  }
  return icon
}

export const EntityInEntitySelectorContainer: FC<{ entity: Entity; index: number }> = ({ entity, index }) => {
  const [uiLang] = useRecoilState(uiLangState)
  const [labelValues] = useRecoilState(!entity.preloadedLabel ? entity.subjectLabelState : defaultEntityLabelAtom)
  const [tab, setTab] = useRecoilState(uiTabState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const history = useHistory()
  const auth0 = useAuth0()

  const prefLabels = labelValues ? RDFResource.valuesByLang(labelValues) : ""
  const label = !entity.preloadedLabel ? lang.ValueByLangToStrPrefLang(prefLabels, uiLang) : entity.preloadedLabel
  const shapeQname = entity.shapeRef ? (entity.shapeRef.qname ? entity.shapeRef.qname : entity.shapeRef) : ""
  const link = "/edit/" + entity.subjectQname + (shapeQname ? "/" + shapeQname : "")

  const handleClick = (event: ChangeEvent<unknown>, newTab: number): void => {
    setTab(newTab)
  }

  const icon = getIcon(entity)

  const closeEntity = () => {
    if (entity.state === EditedEntityState.NeedsSaving) {
      const go = window.confirm("unsaved data will be lost")
      if (!go) return
    }
    const newList = [...entities.filter((e, i) => i !== index)]
    setEntities(newList)
    const newTab = index === tab ? index : index && newList.length ? index - 1 : 0
    setTab(newTab)
    if (!newList.length) history.push("/")
    else {
      let shapeName = newList[newTab].shapeQname
      if (!shapeName && newList[newTab].shapeRef) {
        if (newList[newTab].shapeRef.qname) shapeName = newList[newTab].shapeRef.qname
        else shapeName = newList[newTab].shapeRef
      }
      history.push("/edit/" + newList[newTab].subjectQname + (shapeName ? "/" + shapeName : ""))
    }
    // WIP
    // update user session
    //setUserSession(auth0, entity.subjectQname, shapeQname, !entity.preloadedLabel ? label : entity.preloadedLabel, true)
    // remove data in local storage
    //setUserLocalEntities(auth0, entity.subjectQname, shapeQname, "")
  }

  // update user session
  setUserSession(auth0, entity.subjectQname, shapeQname, !entity.preloadedLabel ? label : entity.preloadedLabel)

  return (
    <Tab
      key={entity.subjectQname}
      {...a11yProps(index)}
      className={index === tab ? "Mui-selected" : ""}
      onClick={(e) => handleClick(e, index)}
      label={
        <>
          <Link to={link}>
            {icon && <img className="entity-type" src={"/icons/" + icon + (index === tab ? "_" : "") + ".svg"} />}
            <span style={{ marginLeft: 30, marginRight: "auto", textAlign: "left" }}>
              <span>{label}</span>
              <br />
              <span className="RID">{entity.subjectQname}</span>
            </span>
          </Link>
          <span className={"state state-" + entity.state}></span>
          <CloseIcon className="close-facet-btn" onClick={closeEntity} />
        </>
      }
    />
  )
}

export default EntityInEntitySelectorContainer
