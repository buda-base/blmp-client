/* eslint-disable no-extra-parens */
import React, { useState, FC, useEffect } from "react"
import { Link } from "react-router-dom"
import { Subject, NodeShape } from "../helpers/rdf/types"
import { FiPower as LogoutIcon } from "react-icons/fi"
import { InputLabel, Select, MenuItem } from "@material-ui/core"
import i18n from "i18next"
import { atom, useRecoilState, useRecoilValue, selectorFamily } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import { FormHelperText, FormControl } from "@material-ui/core"

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
  shape: NodeShape | null
  state: EditedEntityState
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
        shape: null,
        state: EditedEntityState.NotLoaded,
      },
    ])
  }, [setEntities])

  return (
    <React.Fragment>
      {entities.map((entity, index) => (
        <span key={entity.subjectQname}>{entity.subjectQname}</span>
      ))}
      Create / Load Entity
    </React.Fragment>
  )
}

export default EntitySelector
