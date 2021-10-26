/* eslint-disable no-extra-parens */
import React, { useState, FC, useEffect, ChangeEvent } from "react"
import { Subject, RDFResourceWithLabel, RDFResource, Value, LiteralWithId } from "../helpers/rdf/types"
import * as shapes from "../helpers/rdf/shapes"
import { FiPower as LogoutIcon } from "react-icons/fi"
import { InputLabel, Select, MenuItem } from "@material-ui/core"
import i18n from "i18next"
import { atom, useRecoilState, useRecoilValue, selectorFamily, RecoilState } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import { FormHelperText, FormControl } from "@material-ui/core"
import { AppProps, IdTypeParams } from "./AppContainer"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom"
import { uiLangState, uiTabState, uiEditState } from "../atoms/common"
import { makeStyles } from "@material-ui/core/styles"
import Tabs from "@material-ui/core/Tabs"
import Tab from "@material-ui/core/Tab"
import * as lang from "../helpers/lang"
import * as ns from "../helpers/rdf/ns"
import { EntityInEntitySelectorContainer } from "./EntityInEntitySelectorContainer"
import { getUserSession } from "../helpers/rdf/io"
import { sessionLoadedState } from "../atoms/common"

const debug = require("debug")("bdrc:entity:selector")

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  }
}

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
}))

export enum EditedEntityState {
  Error,
  Saved,
  NeedsSaving,
  Loading,
  NotLoaded,
}

export type Entity = {
  subjectQname: string
  subject: Subject | null
  shapeRef: RDFResourceWithLabel | null | string
  state: EditedEntityState
  subjectLabelState: RecoilState<Array<Value>> | null
  preloadedLabel?: string
}

export const entitiesAtom = atom<Array<Entity>>({
  key: "entities",
  default: [],
})

export const defaultEntityLabelAtom = atom<Array<Value>>({
  key: "defaultEntityLabelAtom",
  default: [new LiteralWithId("...", "en")], // TODO: use the i18n stuff
})

const EntitySelector: FC<Record<string, unknown>> = (props: AppProps) => {
  const classes = useStyles()
  const { user, isAuthenticated, isLoading, logout } = useAuth0()
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [sessionLoaded, setSessionLoaded] = useRecoilState(sessionLoadedState)
  const [uiLang] = useRecoilState(uiLangState)
  const [tab, setTab] = useRecoilState(uiTabState)
  const handleChange = (event: ChangeEvent<unknown>, newTab: number): void => {
    debug("newTab:", newTab)
    setTab(newTab)
  }
  const [edit, setEdit] = useRecoilState(uiEditState)

  const auth0 = useAuth0()

  // restore user session on startup
  useEffect(() => {
    // no need for doing it more than once - fixes loading session from open entity tab
    //if (!isLoading && !entities.length) {

    const session = getUserSession(auth0)
    session.then((obj) => {
      debug("session:", obj, props, props.location)
      if (!obj) return
      const newEntities = []
      for (const k of Object.keys(obj)) {
        newEntities.push({
          subjectQname: k,
          subject: null,
          shapeRef: obj[k].shape,
          subjectLabelState: defaultEntityLabelAtom,
          state: EditedEntityState.NotLoaded,
          preloadedLabel: obj[k].label,
        })
      }
      if (newEntities.length) setEntities(newEntities)
      if (!sessionLoaded) setSessionLoaded(true)
      if (props.location?.pathname == "/new") setTab(newEntities.length)
      if (props.location?.pathname.startsWith("/edit/")) {
        const id = props.location.pathname.split("/")[2] // eslint-disable-line no-magic-numbers
        let found = false
        newEntities.map((e, i) => {
          if (e.subjectQname === id) {
            found = true
            setTab(i)
          }
        })
        // case of opening an entity not in session yet
        if (!found) setTab(newEntities.length)
      }
    })
  }, [])

  return (
    <div className="tabs-select" onClick={() => setEdit("")}>
      <h3>Edition</h3>
      <h4>Open entities</h4>
      <Tabs value={tab} onChange={handleChange} aria-label="simple tabs example">
        {entities.map((entity: Entity, index) => {
          return <EntityInEntitySelectorContainer entity={entity} index={index} key={index} />
        })}
        <Tab
          key="new"
          {...a11yProps(entities.length)}
          label={
            <Link to="/new" className="btn-rouge">
              NEW / LOAD
            </Link>
          }
        />
      </Tabs>
    </div>
  )
}

export default EntitySelector
