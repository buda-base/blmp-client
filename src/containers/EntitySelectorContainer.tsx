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
  shapeRef: RDFResourceWithLabel | null
  state: EditedEntityState
  subjectLabelState: RecoilState<Array<Value>>
}

export const entitiesAtom = atom<Array<Entity>>({
  key: "entities",
  default: [],
})

export const defaultEntityLabelAtom = atom<Array<Value>>({
  key: "defaultEntityLabelAtom",
  default: [new LiteralWithId("...", "en")], // TODO: use the i18n stuff
})

const EntitySelector: FC<Record<string, unknown>> = () => {
  const classes = useStyles()
  const { user, isAuthenticated, isLoading, logout } = useAuth0()
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [uiLang] = useRecoilState(uiLangState)
  const [tab, setTab] = useRecoilState(uiTabState)
  const handleChange = (event: ChangeEvent<unknown>, newTab: number): void => {
    debug("newTab:", newTab)
    setTab(newTab)
  }
  const [edit, setEdit] = useRecoilState(uiEditState)

  return (
    <div className="tabs-select" onClick={() => setEdit("")}>
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
