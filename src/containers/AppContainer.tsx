import React, { useEffect, useRef, useState } from "react"
import { BrowserRouter as Router, Route, RouteComponentProps, Switch } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import i18n from "i18next"
import { useTranslation, initReactI18next } from "react-i18next"
import { useRecoilState } from "recoil"

import config from "../config"

import { AuthRequest } from "../routes/account/components/AuthRequest"
import { NavBarContainer, BottomBarContainer } from "../components/NavBar"
import EntitySelector, { entitiesAtom, EditedEntityState } from "../containers/EntitySelectorContainer"
import Home from "../routes/home"
import ProfileContainer from "../routes/account/containers/Profile"
import EntityEditContainer, { EntityEditContainerMayUpdate } from "../routes/entity/containers/EntityEditContainer"
import NewEntityContainer from "../routes/entity/containers/NewEntityContainer"
import EntityCreationContainer from "../routes/entity/containers/EntityCreationContainer"
import EntityShapeChooserContainer from "../routes/entity/containers/EntityShapeChooserContainer"
import { uiTabState, uiUndosState, noUndo, noUndoRedo, undoState, sameUndo } from "../atoms/common"

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

// get info from history (values modified? values undone?)
export const getHistoryStatus = (entityUri) => {
  if (!history[entityUri]) return {}

  // DONE: optimizing a bit (1 for instead of 2 .findIndex + 1 .some)
  const top = history[entityUri].length - 1
  let first = -1,
    current = -1
  for (const i in history[entityUri]) {
    const h = history[entityUri][i]
    if (h["tmp:allValuesLoaded"]) first = i
    else if (h["tmp:undone"]) current = i - 1
    if (first != -1 && current != -1) break
  }
  return { top, first, current }
}

let undoTimer = 0,
  undoEntity = "tmp:uri"

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
  // see https://medium.com/swlh/how-to-store-a-function-with-the-usestate-hook-in-react-8a88dd4eede1 for the wrapping anonymous function
  const [warning, setWarning] = useState(() => (event) => {}) // eslint-disable-line @typescript-eslint/no-empty-function

  useEffect(() => {
    let warn = false
    for (const e of entities) {
      if (e.state !== EditedEntityState.Saved) {
        warn = true
        break
      }
    }
    if (warn) {
      window.removeEventListener("beforeunload", warning, true)
      setWarning(() => (event) => {
        // Cancel the event as stated by the standard.
        event.preventDefault()
        // Chrome requires returnValue to be set.
        event.returnValue = ""
      })
    } else {
      window.removeEventListener("beforeunload", warning, true)
      setWarning(() => (event) => {}) // eslint-disable-line @typescript-eslint/no-empty-function
    }
  }, [entities])

  useEffect(() => {
    window.addEventListener("beforeunload", warning, true)
  }, [warning])

  //debug("warning:",warning)

  // DONE: update undo buttons status after selecting entity in iframe
  useEffect(() => {
    const updateUndoOnMsg = (ev: MessageEvent) => appEl?.current?.click()
    window.addEventListener("message", updateUndoOnMsg)
    return () => {
      if (undoTimer) clearInterval(undoTimer)
      window.removeEventListener("message", updateUndoOnMsg)
    }
  }, [])

  /*
  useEffect( () => {
    debug("undos!",undo,undos)
  }, [undos])
  */

  // this is needed to initialize undo/redo without any button being clicked
  // (link between recoil/react states and data updates automatically stored in EntityGraphValues)
  useEffect(() => {
    //if (undoTimer === 0 || entityUri !== undoEntity) {
    undoEntity = entityUri
    clearInterval(undoTimer)
    const delay = 350
    undoTimer = setInterval(() => {
      //debug("timer",undoTimer, entityUri)
      if (!history[entityUri]) return
      const { top, first, current } = getHistoryStatus(entityUri)
      if (first === -1) return
      // check if flag is on top => nothing modified
      if (history[entityUri][history[entityUri].length - 1]["tmp:allValuesLoaded"]) {
        if (!sameUndo(undo, noUndoRedo)) {
          //debug("no undo:",undo)
          setUndo(noUndoRedo)
        }
      } else {
        if (first !== -1) {
          if (current < 0 && first < top) {
            const histo = history[entityUri][top]
            if (history[entityUri][top][entityUri]) {
              // we can undo a modification of simple property value
              const prop = Object.keys(history[entityUri][top][entityUri])
              if (prop && prop.length && entities[entity].subject !== null) {
                const newUndo = {
                  prev: { enabled: true, subjectUri: entityUri, propertyPath: prop[0], parentPath: [] },
                  next: noUndo,
                }
                if (!sameUndo(undo, newUndo)) {
                  //debug("has undo1:", undo, newUndo, first, top, history, current, entities[entity])
                  setUndo(newUndo)
                }
              }
            } else {
              // TODO: enable undo when change in subnode
              const parentPath = history[entityUri][top]["tmp:parentPath"]
              if (parentPath && parentPath[0] === entityUri) {
                const sub = Object.keys(history[entityUri][top]).filter(
                  (k) => !["tmp:parentPath", "tmp:undone"].includes(k)
                )
                if (sub && sub.length) {
                  // we can undo a modification of simple value of subproperty of a property
                  const prop = Object.keys(history[entityUri][top][sub[0]])
                  if (prop && prop.length && entities[entity].subject !== null) {
                    const newUndo = {
                      next: noUndo,
                      prev: { enabled: true, subjectUri: sub[0], propertyPath: prop[0], parentPath },
                    }
                    if (!sameUndo(undo, newUndo)) {
                      //debug("has undo2:", undo, newUndo, first, top, history, current, entities[entity])
                      setUndo(newUndo)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }, delay)
    //}

    return () => {
      clearInterval(undoTimer)
    }
  }, [entities, undos])

  if (isLoading) return <span>Loading</span>
  if (config.requireAuth && !isAuthenticated) return <AuthRequest />

  //debug(props)

  return (
    <div
      ref={appEl}
      /*onClick={updateUndo} onKeyUp={updateUndo}*/ className={props.location.pathname === "/" ? "home" : ""}
    >
      <NavBarContainer />
      <main>
        <div>
          <EntitySelector />
          <Switch>
            <Route
              exact
              path="/"
              /* component={NewEntityContainer} */ render={(props) => {
                return (
                  <div className="centered-ctn">
                    <div>
                      <h1>Welcome!</h1>
                      <span>BDCR Editor</span>
                      <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus
                        tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam.
                        Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec
                        nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis
                        arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus
                        volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede.
                        Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante
                        ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac
                        mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit.
                      </p>
                    </div>
                  </div>
                )
              }}
            />
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
      <BottomBarContainer />
    </div>
  )
}
export default App
