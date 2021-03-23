/* eslint-disable no-extra-parens */
import React, { useState, FC, useEffect, ChangeEvent } from "react"
import { Subject, NodeShape, RDFResourceWithLabel } from "../helpers/rdf/types"
import * as shapes from "../helpers/rdf/shapes"
import { FiPower as LogoutIcon } from "react-icons/fi"
import { InputLabel, Select, MenuItem } from "@material-ui/core"
import i18n from "i18next"
import { atom, useRecoilState, useRecoilValue, selectorFamily } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import { FormHelperText, FormControl } from "@material-ui/core"
import { AppProps, IdTypeParams } from "./AppContainer"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom"
import { uiLangState, uiTabState } from "../atoms/common"
import { makeStyles } from "@material-ui/core/styles"
import Tabs from "@material-ui/core/Tabs"
import Tab from "@material-ui/core/Tab"
import * as lang from "../helpers/lang"
import * as ns from "../helpers/rdf/ns"

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
}

export const entitiesAtom = atom<Array<Entity>>({
  key: "entities",
  default: [],
})

const EntitySelector: FC<Record<string, unknown>> = () => {
  const classes = useStyles()
  const { user, isAuthenticated, isLoading, logout } = useAuth0()
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [uiLang] = useRecoilState(uiLangState)
  const [tab, setTab] = useRecoilState(uiTabState)
  const handleChange = (event: ChangeEvent<unknown>, newTab: number): void => {
    setTab(newTab)
  }

  useEffect(() => {
    setEntities([
      {
        subjectQname: "bdr:P1583",
        subject: null,
        shapeRef: shapes.shapeRefsMap["bds:PersonShape"],
        state: EditedEntityState.NotLoaded,
      },
    ])
  }, [setEntities])

  return (
    <div className="tabs-select">
      <Tabs value={tab} onChange={handleChange} aria-label="simple tabs example">
        {entities.map((entity: Entity, index) => {
          // TODO: use entityQname to highlight the selected entity
          const link = "/edit/" + entity.subjectQname + (entity.shapeRef ? "/" + entity.shapeRef.qname : "")
          let label
          if (entity.subject) {
            const prefLabels = entity?.subject?.getPropValueByLang(shapes.prefLabel)
            label = lang.ValueByLangToStrPrefLang(prefLabels, uiLang)
          }
          return (
            <Tab
              key={entity.subjectQname}
              {...a11yProps(index)}
              label={
                <Link to={link}>
                  <span>
                    <span>{label}</span>
                    <br />
                    <span className="RID">{entity.subjectQname}</span>
                  </span>
                  <span>{entity.state}</span>
                </Link>
              }
            />
          )
        })}
        <Tab key="new" {...a11yProps(entities.length)} label={<Link to="/new">NEW / LOAD</Link>} />
      </Tabs>
    </div>
  )
}

export default EntitySelector
