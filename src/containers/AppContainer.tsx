import React, { useEffect, useRef, useState } from "react"
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
} from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import i18n from "i18next"
import { useTranslation, initReactI18next } from "react-i18next"
import { useRecoilState } from "recoil"
import ShuffleIcon from "@material-ui/icons/Shuffle"
import { ClearCacheProvider } from "react-clear-cache"

import config from "../config"

import { AuthRequest } from "../routes/account/components/AuthRequest"
import { NavBarContainer } from "../components/NavBar"
import { enTranslations, atoms, RDEProps, getHistoryStatus, history, IdTypeParams, EntitySelectorContainer, EntityEditContainer, NewEntityContainer, EntityCreationContainer, EntityShapeChooserContainer, BottomBarContainer } from "rdf-document-editor"
import DemoContainer from "../containers/DemoContainer"
import OutlineEditorContainer from "../containers/OutlineEditorContainer"
import WithdrawingEditorContainer from "../containers/WithdrawingEditorContainer"
import ScanRequestContainer from "../containers/ScanRequestContainer"
import Home from "../routes/home"
import {
  profileIdState,
  userIdState,
  demoAtom,
} from "../atoms/common"

import { default as BVMT } from "../libs/bvmt/src/App"
import { demoUserId } from "./DemoContainer"
import { debug as debugfactory } from "debug"

const debug = debugfactory("blmp:app")

const numtobodic: Record<string, string> = {
  "0": "༠",
  "1": "༡",
  "2": "༢",
  "3": "༣",
  "4": "༤",
  "5": "༥",
  "6": "༦",
  "7": "༧",
  "8": "༨",
  "9": "༩",
}

const numtobo = function (cstr: string): string {
  let res = ""
  for (const ch of cstr) {
    if (numtobodic[ch]) res += numtobodic[ch]
    else res += ch
  }
  return res
}

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
      format: function (value, format, lng) {
        if (format === "counttobo") {
          return numtobo("" + value)
        } else if (format === "counttozh" && value) {
          return value.toLocaleString("zh-u-nu-hanidec")
        } else if (format === "lowercase") return value.toLowerCase()
        else if (format === "uppercase") return value.toUpperCase()
        return value
      },
    },
  })

function HomeContainer() {

  const [userId, setUserId] = useRecoilState(userIdState)

  if (userId === demoUserId)
    return (
      <><div className="centered-ctn">
        <div>
          <h1>Welcome to RDF document editor demo!</h1>
          <span><>{i18n.t("home.title")}</></span>
          <p>
            You can click the <em>New / Load</em> button on the left, or the link to an example entity below.
          </p>
          {/* <PreviewImage i={0 as never} iiif={iiif as never} /> */}
          <p className="menu">
            <Link className="menu-link" to="/edit/bdr:P1583">
              <img src="/icons/person.svg" style={{ height: "31px", marginRight: "15px", marginLeft: "7px" }} />
              Open example entity
            </Link>
          </p>
        </div>
      </div></>
    )
  else
    return (
      <><div className="centered-ctn">
        <div>
          <h1>Welcome!</h1>
          <span><>{i18n.t("home.title")}</></span>
          <p>
            To start the editor, you must first set up the RID prefix in your user profile (ex: <em>3KG</em>), and then
            click on the <em>New / Load</em> button.
          </p>
          {/* <PreviewImage i={0 as never} iiif={iiif as never} /> */}
          <p className="menu">
            <Link className="menu-link" to="/scanrequest">
              <img src="/icons/images.svg" style={{ height: "31px", marginRight: "15px", marginLeft: "7px" }} />
              Scan Request
            </Link>
            <Link className="menu-link iiif" to="/bvmt">
              <img src="/icons/iiif.png" />
              BUDA Volume Manifest Tool
            </Link>
            <Link className="menu-link" to="/outline">
              <img src="/icons/outline.svg" width="64" />
              Outline Editor
            </Link>
            <Link className="menu-link" to="/withdraw">
              <span style={{ width: "44px", marginRight: "15px", display: "inline-flex", justifyContent: "center" }}>
                <ShuffleIcon style={{ fontSize: "44px", color: "black" }} />
              </span>
              Withdrawing Editor
            </Link>
          </p>
        </div>
      </div></>
    )
  //}
}

let undoTimer = 0,
  undoEntity = "tmp:uri"

function App(props: RDEProps) {
  const auth = useAuth0()
  const { isAuthenticated, isLoading } = auth
  const [undos, setUndos] = useRecoilState(atoms.uiUndosState)
  const [entities, setEntities] = useRecoilState(atoms.entitiesAtom)
  const [uiTab, setTab] = useRecoilState(atoms.uiTabState)
  const entity = entities.findIndex((e, i) => i === uiTab)
  const entityUri = entities[entity]?.subject?.uri || "tmp:uri"
  const [profileId, setProfileId] = useRecoilState(profileIdState)
  const undo = undos[entityUri]
  const setUndo = (s: atoms.undoPN) => setUndos({ ...undos, [entityUri]: s })
  const [disabled, setDisabled] = useRecoilState(atoms.uiDisabledTabsState)
  const appEl = useRef<HTMLDivElement>(null)
  const [userId, setUserId] = useRecoilState(userIdState)
  const [demo, setDemo] = useRecoilState(demoAtom)

  // DONE: update undo buttons status after selecting entity in iframe
  useEffect(() => {
    const updateUndoOnMsg = (ev: MessageEvent) => {
      appEl?.current?.click()
    }
    window.addEventListener("message", updateUndoOnMsg)
    return () => {
      if (undoTimer) clearInterval(undoTimer)
      window.removeEventListener("message", updateUndoOnMsg)
    }
  }, [])

  // this is needed to initialize undo/redo without any button being clicked
  // (link between recoil/react states and data updates automatically stored in EntityGraphValues)
  useEffect(() => {
    //if (undoTimer === 0 || entityUri !== undoEntity) {
    //debug("clear:",entities[entity]?.subject,undoTimer, entity, entityUri,entities)
    undoEntity = entityUri
    clearInterval(undoTimer)
    const delay = 150
    undoTimer = window.setInterval(() => {
      //debug("timer", undoTimer, entity, entityUri, profileId, history[entityUri], history)
      if (!history[entityUri]) return
      const { top, first, current } = getHistoryStatus(entityUri)
      //debug("disable:",disabled,first)
      if (first === -1) return
      if (disabled) setDisabled(false)
      // check if flag is on top => nothing modified
      if (history[entityUri][history[entityUri].length - 1]["tmp:allValuesLoaded"]) {
        if (!atoms.sameUndo(undo, atoms.noUndoRedo)) { //
          //debug("no undo:",undo)
          setUndo(atoms.noUndoRedo)
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
                if (!atoms.sameUndo(undo, newUndo)) {
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
                      next: atoms.noUndo,
                      prev: { enabled: true, subjectUri: sub[0], propertyPath: prop[0], parentPath },
                    }
                    if (!atoms.sameUndo(undo, newUndo)) {
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
  }, [disabled, entities, undos, profileId, uiTab])

  if (isLoading) return <div></div>
  if (config.requireAuth && !isAuthenticated && props.location.pathname !== "/demo" && userId != demoUserId)
    return <AuthRequest />

  debug("App:", entities)

  // check if latest version every 5 min
  const checkVersionInterval = 5 * 60 * 1000 // eslint-disable-line no-magic-numbers

  return (
    <ClearCacheProvider duration={checkVersionInterval}>
      <div
        ref={appEl}
        data-route={props.location.pathname}
        /*onClick={updateUndo} onKeyUp={updateUndo}*/ className={
          "App " + (props.location.pathname === "/" ? "home" : "")
        }
      >
        <NavBarContainer />
        <main>
          <div>
            {!props.location.pathname.startsWith("/bvmt") && <EntitySelector {...props} />}
            <Routes>
              <Route path="/" element={<HomeContainer/>} />
              <Route
                path="/profile"
                render={(rprops) => (
                  <EntityEditContainer
                    {...rprops}
                    entityQname={demo ? demoUserId : "tmp:user"}
                    shapeQname="bds:UserProfileShape"
                  />
                )}
              />
              <Route path="/new" element={<NewEntityContainer/>} />
              <Route path="/new/:shapeQname" element={<EntityCreationContainer/>} />
              <Route // we need that route to link back value to property where entity was created
                exact
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index"
                component={EntityCreationContainerRoute}
              />
              <Route // this one as well
                exact
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname"
                component={EntityCreationContainerRoute}
              />
              <Route // same with entityQname
                exact
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/named/:entityQname"
                component={EntityCreationContainerRoute}
              />
              <Route // same with entityQname
                exact
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname/named/:entityQname"
                component={EntityCreationContainerRoute}
              />
              <Route
                exact
                path="/edit/:entityQname/:shapeQname/:subjectQname/:propertyQname/:index"
                component={EntityEditContainerMayUpdate}
              />
              <Route
                exact
                path="/edit/:entityQname/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname"
                component={EntityEditContainerMayUpdate}
              />
              <Route exact path="/edit/:entityQname/:shapeQname" component={EntityEditContainer} />
              <Route exact path="/edit/:entityQname" component={EntityShapeChooserContainer} />
              <Route
                exact
                path="/bvmt/:volume"
                render={(rprops) => (
                  <BVMT {...rprops} auth={auth} history={routerHistory} volume={rprops.match.params.volume} />
                )}
              />
              <Route path="/bvmt" render={(rprops) => <BVMT {...rprops} auth={auth} history={routerHistory} />} />
              <Route path="/outline" component={OutlineEditorContainer} />
              <Route path="/withdraw" component={WithdrawingEditorContainer} />
              <Route path="/scanrequest" component={ScanRequestContainer} />
              <Route path="/demo" component={DemoContainer} />
            </Routes>
          </div>
        </main>
        {!props.location.pathname.startsWith("/new") && <BottomBarContainer />}
      </div>
    </ClearCacheProvider>
  )
}
export default App
