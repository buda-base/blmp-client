import React, { useEffect, useRef } from "react"
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
import { uiTabState, uiUndosState, noUndo, noUndoRedo, undoState } from "../atoms/common"

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
  const [undos, setUndos] = useRecoilState(uiUndosState)
  const [entities] = useRecoilState(entitiesAtom)
  const [uiTab] = useRecoilState(uiTabState)
  const entity = entities.findIndex((e, i) => i === uiTab)
  const entityUri = entities[entity]?.subject?.uri || "tmp:uri"
  const undo = undos[entityUri]
  const setUndo = (s: Record<string, undoState>) => setUndos({ ...undos, [entityUri]: s })
  const appEl = useRef<HTMLDivElement>(null)

  // DONE: update undo buttons status after selecting entity in iframe
  useEffect(() => {
    const updateUndoOnMsg = (ev: MessageEvent) => appEl?.current?.click()
    window.addEventListener("message", updateUndoOnMsg)
    return () => {
      window.removeEventListener("message", updateUndoOnMsg)
    }
  }, [])

  if (isLoading) return <span>Loading</span>
  if (config.requireAuth && !isAuthenticated) return <AuthRequest />

  const delay = 10,
    updateUndo = (ev: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent | MessageEvent) => {
      //debug("ev:", ev.currentTarget, ev.target, history, undos)
      if (!(ev instanceof MessageEvent)) ev.persist()
      const timer = setTimeout(() => {
        //debug("timer", timer, entityUri)

        const target = ev.target as Element
        if (target?.classList?.contains("undo-btn")) {
          return
        }

        if (!history[entityUri] || !history[entityUri].some((h) => h["tmp:allValuesLoaded"])) return

        if (history[entityUri][history[entityUri].length - 1]["tmp:allValuesLoaded"]) {
          //debug("no undo")
          setUndo(noUndoRedo)
        } else {
          const first = history[entityUri].findIndex((h) => h["tmp:allValuesLoaded"]),
            top = history[entityUri].length - 1,
            current = history[entityUri].findIndex((h) => h["tmp:undone"]) - 1
          //debug("has undo:", JSON.stringify(undo, null, 1), first, top, history, current)
          if (first !== -1) {
            if (current < 0 && first < top) {
              const histo = history[entityUri][top]
              if (history[entityUri][top][entityUri]) {
                const prop = Object.keys(history[entityUri][top][entityUri])
                if (prop && prop.length && entities[entity].subject !== null)
                  setUndo({
                    next: noUndo,
                    prev: { enabled: true, subjectUri: entityUri, propertyPath: prop[0], parentPath: [] },
                  })
              } else {
                // TODO: enable undo when change in subnode
                const parentPath = history[entityUri][top]["tmp:parentPath"]
                if (parentPath && parentPath[0] === entityUri) {
                  const sub = Object.keys(history[entityUri][top]).filter(
                    (k) => !["tmp:parentPath", "tmp:undone"].includes(k)
                  )
                  if (sub && sub.length) {
                    const prop = Object.keys(history[entityUri][top][sub[0]])
                    if (prop && prop.length && entities[entity].subject !== null)
                      setUndo({
                        next: noUndo,
                        prev: { enabled: true, subjectUri: sub[0], propertyPath: prop[0], parentPath },
                      })
                  }
                }
              }
            }
          }
        }
      }, delay)
    }

  //debug("hello?", props)

  return (
    <div ref={appEl} onClick={updateUndo} onKeyUp={updateUndo}>
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
