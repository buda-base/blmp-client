import React from "react"
import { BrowserRouter as Router, Route, RouteComponentProps, Switch } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import i18n from "i18next"
import { useTranslation, initReactI18next } from "react-i18next"
import { useRecoilState } from "recoil"

import config from "../config"

import { AuthRequest } from "../routes/account/components/AuthRequest"
import NavBarContainer from "../components/NavBar"
import EntitySelector, { entitiesAtom } from "../containers/EntitySelectorContainer"
import Home from "../routes/home"
import ProfileContainer from "../routes/account/containers/Profile"
import EntityEditContainer, { EntityEditContainerMayUpdate } from "../routes/entity/containers/EntityEditContainer"
import NewEntityContainer from "../routes/entity/containers/NewEntityContainer"
import EntityCreationContainer from "../routes/entity/containers/EntityCreationContainer"
import EntityShapeChooserContainer from "../routes/entity/containers/EntityShapeChooserContainer"
import { uiTabState, uiUndoState, uiCurrentState, canUndo, canRedo, canUndoRedo } from "../atoms/common"

import { Subject, history } from "../helpers/rdf/types"

import enTranslations from "../translations/en"

const debug = require("debug")("bdrc:router")

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  })

export interface IdTypeParams {
  shapeQname: string
  entityQname: string
  subjectQname?: string
  propertyQname?: string
  index?: string
}

export interface AppProps extends RouteComponentProps<IdTypeParams> {}

function App(props: AppProps) {
  const { isAuthenticated, isLoading } = useAuth0()
  const [undo, setUndo] = useRecoilState(uiUndoState)
  const [current, setCurrent] = useRecoilState(uiCurrentState)
  const [entities] = useRecoilState(entitiesAtom)
  const [uiTab] = useRecoilState(uiTabState)
  const entity = entities.findIndex((e, i) => i === uiTab)
  const entityUri = entities[entity]?.subject?.uri || "tmp:uri"

  if (isLoading) return <span>Loading</span>
  if (config.requireAuth && !isAuthenticated) return <AuthRequest />

  // TODO: refresh when switching between two open resources
  //debug("hello?", props)

  const delay = 150,
    updateUndo = () =>
      setTimeout(() => {
        if (!history[entityUri]) setUndo(0)
        else if (history[entityUri][history[entityUri].length - 1]["tmp:allValuesLoaded"]) setUndo(0)
        else {
          const first = history[entityUri].findIndex((h) => h["tmp:allValuesLoaded"])
          debug(":", current, first, history[entityUri].length - 1)
          if (current === -1) setUndo(canUndo)
          //else if(current >=== first) setUndo(canRedo)
          //else setUndo(canUndoRedo)
        }
      }, delay)

  return (
    <div onClick={updateUndo} onKeyUp={updateUndo}>
      <NavBarContainer />
      <EntitySelector />
      <main>
        <div>
          <Switch>
            <Route exact path="/" component={NewEntityContainer} />
            <Route exact path="/profile" component={ProfileContainer} />
            <Route exact path="/new" component={NewEntityContainer} />
            <Route exact path="/new/:shapeQname" component={EntityCreationContainer} />
            <Route
              exact
              path="/new/:shapeQname/:subjectQname/:propertyQname/:index"
              component={EntityCreationContainer}
            />
            <Route
              exact
              path="/edit/:entityQname/:shapeQname/:subjectQname/:propertyQname/:index"
              component={EntityEditContainerMayUpdate}
            />
            <Route exact path="/edit/:entityQname/:shapeQname" component={EntityEditContainer} />
            <Route exact path="/edit/:entityQname" component={EntityShapeChooserContainer} />
          </Switch>
        </div>
      </main>
    </div>
  )
}
export default App
