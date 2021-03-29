/* eslint-disable no-extra-parens */
import React, { useState, FC, useEffect, ChangeEvent } from "react"
import { Subject, RDFResourceWithLabel, RDFResource } from "../helpers/rdf/types"
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
import { Entity, EditedEntityState } from "./EntitySelectorContainer"

const debug = require("debug")("bdrc:entity:selector")

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  }
}

export const EntityInEntitySelectorContainer: FC<{ entity: Entity; index: number }> = ({ entity, index }) => {
  const [uiLang] = useRecoilState(uiLangState)
  const [labelValues] = useRecoilState(entity.subjectLabelState)
  const prefLabels = RDFResource.valuesByLang(labelValues)
  const label = lang.ValueByLangToStrPrefLang(prefLabels, uiLang)
  const link = "/edit/" + entity.subjectQname + (entity.shapeRef ? "/" + entity.shapeRef.qname : "")
  const [tab, setTab] = useRecoilState(uiTabState)
  const handleClick = (event: ChangeEvent<unknown>, newTab: number): void => {
    setTab(newTab)
  }

  return (
    <Tab
      key={entity.subjectQname}
      {...a11yProps(index)}
      className={index === tab ? "Mui-selected" : ""}
      onClick={(e) => handleClick(e, index)}
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
}

export default EntityInEntitySelectorContainer
