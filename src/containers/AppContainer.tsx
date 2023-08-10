import React, { useEffect, useRef, useState } from "react"
import {
  Route,
  Routes,
  RouteProps,
  useLocation,
  Link,
} from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import * as rde_config from "../helpers/config"
import { EntityCreator } from "../helpers/EntityCreator"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { useRecoilState } from "recoil"
import { Shuffle as ShuffleIcon  } from '@mui/icons-material'
import { ClearCacheProvider } from "react-clear-cache"

import config from "../config"

import { AuthRequest } from "../routes/account/components/AuthRequest"
import { NavBarContainer } from "../components/NavBar"
import { EntityEditContainerMayUpdate, enTranslations, atoms, getHistoryStatus, history, EntitySelectorContainer, EntityEditContainer, NewEntityContainer, EntityCreationContainer, EntityShapeChooserContainer, BottomBarContainer, HistoryStatus, RDEConfig, BUDAResourceSelector } from "rdf-document-editor"
import WithdrawingEditorContainer from "../containers/WithdrawingEditorContainer"
import ScanRequestContainer from "../containers/ScanRequestContainer"
import {
  userQnameState,
  RIDprefixState,
  reloadProfileState,
  idTokenAtom
} from "../atoms/common"

import {
  numtobo,
  ValueByLangToStrPrefLang,
  langs,
} from "../helpers/lang"

import { default as blmpEnTranslations } from "../translations/en"

import { default as BVMT } from "../libs/bvmt/src/App"
import { debug as debugfactory } from "debug"
import _ from "lodash"
import { HistoryHandler } from "../helpers/observer"

import "../stylesheets/app.scss"

const debug = debugfactory("blmp:app")

const i18nSrc = { ...enTranslations }
_.merge(i18nSrc, blmpEnTranslations ) 

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    debug:true,
    resources: {
      en: {
        translation: i18nSrc
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
}

const undoTimer = 0

function App(props: RouteProps) {
  const auth = useAuth0()
  const { isAuthenticated, isLoading } = auth
  const [undos, setUndos] = useRecoilState(atoms.uiUndosState)
  const [entities, setEntities] = useRecoilState(atoms.entitiesAtom)
  const [uiTab, setTab] = useRecoilState(atoms.uiTabState)
  const entity = entities.findIndex((e, i) => i === uiTab)
  const entityUri = entities[entity]?.subject?.uri || "tmp:uri"
  const undo = undos[entityUri]
  const setUndo = (s: atoms.undoPN) => setUndos({ ...undos, [entityUri]: s })
  const [disabled, setDisabled] = useRecoilState(atoms.uiDisabledTabsState)
  const appEl = useRef<HTMLDivElement>(null)
  const [userQname, setUserQname] = useRecoilState(userQnameState)
  const [RIDPrefix, setRIDPrefix] = useRecoilState(RIDprefixState)
  const [uiLang, setUiLang] = useRecoilState(atoms.uiLangState)
  const [uiLitLang, setUiLitLang] = useRecoilState(atoms.uiLitLangState)
  const [idToken, setIdToken] = useRecoilState(idTokenAtom)
  const [reloadProfile, setReloadProfile] = useRecoilState(reloadProfileState)
  const location = useLocation()

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

  if (isLoading) return <div>Loading...</div>
  if (config.requireAuth && !isAuthenticated) return <AuthRequest />  

  debug("App:", entities, userQname)

  // check if latest version every 5 min
  const checkVersionInterval = 5 * 60 * 1000 // eslint-disable-line no-magic-numbers

  const config_rde: RDEConfig = {
    generateSubnodes: rde_config.generateSubnodesFactory(idToken, RIDPrefix),
    valueByLangToStrPrefLang: ValueByLangToStrPrefLang,
    possibleLiteralLangs: langs,
    labelProperties: rde_config.labelProperties,
    descriptionProperties: rde_config.descriptionProperties,
    prefixMap: rde_config.prefixMap,
    getConnexGraph: rde_config.getConnexGraph,
    generateConnectedID: rde_config.generateConnectedID,
    getShapesDocument: rde_config.getShapesDocument,
    getDocument: rde_config.getDocumentGraphFactory(idToken||""),
    entityCreator: EntityCreator,
    iconFromEntity: rde_config.iconFromEntity,
    getUserMenuState: rde_config.getUserMenuStateFactory(userQname),
    setUserMenuState: rde_config.setUserMenuStateFactory(userQname),
    getUserLocalEntities: rde_config.getUserLocalEntitiesFactory(userQname),
    setUserLocalEntity: rde_config.setUserLocalEntityFactory(userQname),
    possibleShapeRefs: rde_config.possibleShapeRefs,
    possibleShapeRefsForEntity: rde_config.possibleShapeRefsForEntity,
    possibleShapeRefsForType: rde_config.possibleShapeRefsForEntity,
    libraryUrl: "https://library.bdrc.io",
    resourceSelector: BUDAResourceSelector,
    previewLiteral: rde_config.previewLiteral,
    putDocument: rde_config.putDocumentFactory(idToken||"", userQname, setUiLang, setUiLitLang, setRIDPrefix, setReloadProfile),
    getPreviewLink: rde_config.getPreviewLink,
  }

  return (
    <ClearCacheProvider duration={checkVersionInterval}>
      <div
        ref={appEl}
        data-route={location.pathname}
        className={
          "App " + (location.pathname === "/" ? "home" : "")
        }
      >
        <NavBarContainer />
        <main>
          <div>
            {!location.pathname.startsWith("/bvmt") && <EntitySelectorContainer config={config_rde} />}
            <Routes>
              <Route path="/" element={<HomeContainer/>} />
              <Route
                path="/profile"
                element={
                  <EntityEditContainer
                    entityQname={userQname ? userQname : "tmp:uri"}
                    shapeQname="bds:UserProfileShape"
                    config={config_rde}
                  />
                }
              />
              <Route path="/new" element={<NewEntityContainer config={config_rde} />} />
              <Route path="/new/:shapeQname" element={<EntityCreationContainer config={config_rde}/>} />
              <Route // we need that route to link back value to property where entity was created
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index"
                element={<EntityCreationContainer config={config_rde} />}
              />
              <Route // this one as well
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname"
                element={<EntityCreationContainer config={config_rde} />}
              />
              <Route // same with entityQname
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/named/:entityQname"
                element={<EntityCreationContainer config={config_rde} />}
              />
              <Route // same with entityQname
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname/named/:entityQname"
                element={<EntityCreationContainer config={config_rde} />}
              />
              <Route
                path="/edit/:entityQname/:shapeQname/:subjectQname/:propertyQname/:index"
                element={<EntityEditContainerMayUpdate config={config_rde} />}
              />
              <Route
                path="/edit/:entityQname/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname"
                element={<EntityEditContainerMayUpdate config={config_rde} />}
              />
              <Route path="/edit/:entityQname/:shapeQname" element={<EntityEditContainer config={config_rde} />} />
              <Route path="/edit/:entityQname" element={<EntityShapeChooserContainer config={config_rde} />} />
              <Route
                path="/bvmt/:volume"
                element={<BVMT auth={auth} history={location} />}
              />
              <Route path="/bvmt" element={<BVMT auth={auth} history={location} />} />
              <Route path="/withdraw" element={<WithdrawingEditorContainer />} />
              <Route path="/scanrequest" element={<ScanRequestContainer  config={config_rde}  />} />
            </Routes>
          </div>
        </main>
        {!location.pathname.startsWith("/new") && 
          <BottomBarContainer config={config_rde} /*extraElement={<HistoryHandler entityUri={entityUri}/>}*/ />}
      </div>
    </ClearCacheProvider>
  )
}
export default App
