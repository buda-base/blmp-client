/* eslint-disable no-extra-parens */
import React, { useState, FC, useEffect } from "react"
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
import { uiLangState } from "../atoms/common"

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
  highlighted: boolean
}

export const entitiesAtom = atom<Array<Entity>>({
  key: "entities",
  default: [],
})

const EntitySelector: FC<Record<string, unknown>> = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth0()

  const [entities, setEntities] = useRecoilState(entitiesAtom)

  useEffect(() => {
    setEntities([
      {
        subjectQname: "bdr:P1583",
        subject: null,
        shapeRef: shapes.shapeRefsMap["bds:PersonShape"],
        state: EditedEntityState.NotLoaded,
        highlighted: false,
      },
    ])
  }, [setEntities])

  return (
    <React.Fragment>
      {entities.map((entity: Entity, index) => {
        // TODO: use entityQname to highlight the selected entity
        const link = "/edit/" + entity.subjectQname + (entity.shapeRef ? "/" + entity.shapeRef.qname : "")
        return (
          <Link key={entity.subjectQname} to={link}>
            {entity.subjectQname} ({entity.state}) {entity.highlighted ? "(h)" : ""}
          </Link>
        )
      })}
      <Link key="new" to="/new">
        New / Load
      </Link>
    </React.Fragment>
  )
}

export default EntitySelector
