/* eslint-disable no-extra-parens */
import React, { useState, useEffect } from "react"
import { withRouter } from "react-router"
import { Link } from "react-router-dom"
import { FiPower as LogoutIcon } from "react-icons/fi"
import { InputLabel, Select, MenuItem } from "@material-ui/core"
import i18n from "i18next"
import { useRecoilState, useRecoilValue, selectorFamily } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import { FormHelperText, FormControl, TextField } from "@material-ui/core"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"
import axios from "axios"

import { AppProps } from "../../containers/AppContainer"
import { HistoryHandler } from "../../routes/helpers/observer"
import {
  reloadEntityState,
  reloadProfileState,
  uiLangState,
  uiLitLangState,
  uiTabState,
  userIdState,
} from "../../atoms/common"
import { entitiesAtom, EditedEntityState } from "../../containers/EntitySelectorContainer"
import * as ns from "../../helpers/rdf/ns"
import { langs } from "../../helpers/lang"
import { debugStore, setUserLocalEntities, putTtl } from "../../helpers/rdf/io"
import { history } from "../../helpers/rdf/types"
import config from "../../config"
import { ErrorIcon } from "../../routes/layout/icons"

const debug = require("debug")("bdrc:NavBar")

function NavBar(props: AppProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth0()

  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  const [uiLitLang, setUiLitLang] = useRecoilState(uiLitLangState)
  // https://github.com/mui-org/material-ui/issues/15400
  const uiLangOnChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setUiLang([event.target.value as string, uiLang.slice(1)])
    setUiLitLang([event.target.value as string, uiLitLang.slice(1)])
  }

  //debug("uiL:",uiLang,uiLitLang)

  const [entities] = useRecoilState(entitiesAtom)
  const [uiTab, setUiTab] = useRecoilState(uiTabState)

  return (
    <nav className="navbar navbar-dark navbar-expand-md">
      <a href="https://bdrc.io">
        <img className="" src="/images/BDRC.svg" alt="bdrc" height="50" />
        <span>BDRC</span>
      </a>
      <Link to={"/"} onClick={() => setUiTab(-1)} className="navbar-left">
        <span>EDITOR</span>
        <img className="" src="/images/BUDA-small.svg" height="50px" alt="buda editor" />
      </Link>
      <FormControl className="ml-auto">
        <Select labelId="uilanglabel" id="select" value={uiLang[0]} onChange={uiLangOnChange}>
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="bo">བོད་ཡིག</MenuItem>
          <MenuItem value="zh-hans">中文</MenuItem>
        </Select>
        <FormHelperText>{i18n.t("home.uilang")}</FormHelperText>
      </FormControl>

      {isAuthenticated ? (
        <div className="btn-group ml-1" role="group">
          <button
            id="userDropDown"
            type="button"
            className="btn btn-sm btn-light shadow-none dropdown-toggle"
            data-toggle="dropdown"
            aria-haspopup="false"
            aria-expanded="false"
          >
            {user ? user.email : null}
          </button>
          <div className="dropdown-menu" aria-labelledby="userDropDown">
            <Link className="btn btn-sm dropdown-item py-0" to="/profile">
              Profile
            </Link>

            <div className="dropdown-divider"></div>

            <button
              className="btn btn-sm text-contrast dropdown-item py-0"
              id="button-logout"
              onClick={(e) => {
                e.preventDefault()
                logout({ returnTo: window.location.origin })
                props.history.push("/")
              }}
            >
              {user ? <LogoutIcon size={16} className="icon-left mr-1" /> : null}
              Logout
            </button>
          </div>
        </div>
      ) : !isLoading ? (
        <React.Fragment>
          <Link className="btn btn-light mx-1 btn-rouge" to="/login">
            Login
          </Link>
        </React.Fragment>
      ) : null}
    </nav>
  )
}
export const NavBarContainer = withRouter(NavBar)

function BottomBar(props: AppProps) {
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [uiTab] = useRecoilState(uiTabState)
  const entity = entities.findIndex((e, i) => i === uiTab)
  const entitySubj = entities[entity]?.subject
  const entityUri = entities[entity]?.subject?.uri || "tmp:uri"
  const auth0 = useAuth0()
  const [message, setMessage] = useState("")
  const [nbVolumes, setNbVolumes] = useState("")
  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  const [lang, setLang] = useState(uiLang)
  const [saving, setSaving] = useState(false)
  const [gen, setGen] = useState(false)
  const [popupOn, setPopupOn] = useState(false)
  const [userId, setUserId] = useRecoilState(userIdState)
  const [reloadProfile, setReloadProfile] = useRecoilState(reloadProfileState)
  const [reloadEntity, setReloadEntity] = useRecoilState(reloadEntityState)
  const shapeQname = entities[entity]?.shapeRef?.qname ? entities[entity]?.shapeRef?.qname : entities[entity]?.shapeRef
  const [error, setError] = useState("")

  const isUserProfile = userId === entities[entity]?.subjectQname

  const isIInstance = shapeQname === "bds:ImageInstanceShape"

  const { isAuthenticated, getIdTokenClaims } = useAuth0()
  const [idToken, setIdToken] = useState("")

  useEffect(() => {
    async function checkSession() {
      const idToken = await getIdTokenClaims()
      setIdToken(idToken.__raw)
    }
    if (isAuthenticated) checkSession()
  }, [isAuthenticated])

  useEffect(() => {
    setLang(uiLang)
  }, [uiLang])

  //debug("bottombar:", isUserProfile, userId, entitySubj, shapeQname)

  const delay = 300
  const closePopup = (delay1 = delay, delay2 = delay) => {
    setTimeout(() => {
      setPopupOn(false)
      setTimeout(() => {
        setSaving(false)
        setMessage("")
        setGen(false)
        setNbVolumes("")
        setError("")
      }, delay2)
    }, delay1)
  }

  const generate = async (): Promise<undefined> => {
    debug("gen:", entities[entity])

    if (disabled) {
      if (!gen) {
        setPopupOn(true)
        setGen(true)
      } else {
        const entityQname = entitySubj.qname

        await axios
          .request({
            method: "get",
            responseType: "blob",
            timeout: 4000,
            baseURL: config.API_BASEURL,
            url: "scanrequest/" + entityQname + "?addVolumes=" + nbVolumes,
            //url: "resource-nc/user/me", // to test file download
            headers: {
              Authorization: `Bearer ${idToken}`,
              //Accept: "application/zip", // not sure we need this here?
            },
          })
          .then(function (response) {
            debug("loaded:", response.data)

            // download file
            const temp = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement("a")
            link.href = temp
            link.setAttribute(
              "download",
              "ScanRequest-" + entityQname.replace(/^bdr:/, "") + "-" + nbVolumes + "vol.zip"
            )
            link.click()
            window.URL.revokeObjectURL(link)

            closePopup(1, delay)

            // reload entity
            if (history && history[entityUri]) delete history[entityUri]
            const newEntities = [...entities]
            newEntities[entity] = { ...newEntities[entity], subject: null }
            setEntities(newEntities)

            // use delay to avoid freezing popup UI in intermediate state
            setTimeout(() => setReloadEntity(entityQname), delay) // eslint-disable-line no-magic-numbers
          })
          .catch(function (error) {
            debug("error:", error.message)
            setError(error.message)
          })
      }
    } else {
      save()
    }
  }

  const save = async (): Promise<undefined> => {
    //debug("save:",entities[entity])

    if (entities[entity].state === EditedEntityState.Error && (!saving || isUserProfile)) {
      if (!window.confirm("errors are detected in this entity, save anyway?")) return
    }

    if (!saving && !isUserProfile) {
      setPopupOn(true)
      setSaving(true)
      return
    }

    const store = new rdf.Store()
    ns.setDefaultPrefixes(store)
    entitySubj?.graph.addNewValuestoStore(store)
    debugStore(store)
    if (entitySubj && entitySubj.qname == "tmp:user" && false) {
      // TODO: /me fails when fetched from editserv-dev, bypassing
      const url = entitySubj.qname == "tmp:user" ? "//editserv.bdrc.io/resource-nc/user/me" : entityUri
      try {
        const idTokenF = await auth0.getIdTokenClaims()
        const loadRes = await putTtl(url, store, idTokenF.__raw)
      } catch (e) {
        // TODO: better error handling

        closePopup()

        return
      }
    }
    const newEntities = [...entities]
    newEntities[entity] = { ...newEntities[entity], state: EditedEntityState.Saved }
    setEntities(newEntities)

    // save ttl to localStorage
    const defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
    rdf.serialize(defaultRef, store, undefined, "text/turtle", async function (err, str) {
      setUserLocalEntities(auth0, entities[entity].subjectQname, shapeQname, str, false, userId)
    })

    history[entityUri] = history[entityUri].filter((h) => !h["tmp:allValuesLoaded"])
    history[entityUri].push({ "tmp:allValuesLoaded": true })

    if (!isIInstance) closePopup()
    else {
      setSaving(false)
      setGen(true)
    }

    if (isUserProfile) setReloadProfile(true)
  }

  const onLangChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    setLang(event.target.value as string)
  }

  const onMessageChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    setMessage(event.target.value as string)
  }

  const onNbVolumesChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNbVolumes(event.target.value as string)
  }

  const disabled =
    (entities[entity] &&
      [EditedEntityState.Saved, EditedEntityState.NotLoaded, EditedEntityState.Loading].includes(
        entities[entity].state
      )) ||
    (message === "" && saving && !isUserProfile)

  return (
    <nav className="bottom navbar navbar-dark navbar-expand-md">
      <HistoryHandler entityUri={entityUri} />
      <span />
      <div className={"popup " + (popupOn ? "on " : "") + (error ? "error " : "")}>
        <div>
          {gen && isIInstance && (
            <>
              <TextField
                label={"Number of volumes to add"}
                type="number"
                value={nbVolumes}
                onChange={onNbVolumesChangeHandler}
                InputProps={{ inputProps: { min: 0, max: 999 } }}
                InputLabelProps={{ shrink: true }}
                style={{ minWidth: 275 }}
                {...(error
                  ? {
                      helperText: (
                        <React.Fragment>
                          <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
                          <i>{error}</i>
                        </React.Fragment>
                      ),
                      error: true,
                    }
                  : {})}
              />
            </>
          )}
          {saving && !isUserProfile && (
            <>
              <TextField
                label={"commit message"}
                value={message}
                onChange={onMessageChangeHandler}
                InputLabelProps={{ shrink: true }}
                style={{ minWidth: 300 }}
              />

              <TextField
                select
                value={lang}
                onChange={onLangChangeHandler}
                InputLabelProps={{ shrink: true }}
                style={{ minWidth: 100, marginTop: "16px", marginLeft: "15px", marginRight: "15px" }}
              >
                {langs.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.value}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </div>
      </div>
      <div className="buttons">
        <Button
          variant="outlined"
          onClick={isIInstance ? generate : save}
          className="btn-rouge"
          {...(disabled && (!isIInstance || (gen && !nbVolumes)) ? { disabled: true } : {})}
        >
          {saving
            ? "Ok"
            : !isIInstance
            ? "Save"
            : disabled
            ? gen
              ? "Generate scan request"
              : "Scan Request"
            : "Save & Scan Request"}
        </Button>
        {(saving || gen) && (
          <Button
            variant="outlined"
            onClick={closePopup}
            className="btn-blanc ml-2"
            //style={{ position: "absolute", left: "calc(100% - (100% - 1225px)/2)" }}
          >
            Cancel
          </Button>
        )}
      </div>
    </nav>
  )
}
export const BottomBarContainer = withRouter(BottomBar)
