/* eslint-disable no-extra-parens */
import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { FiPower as LogoutIcon } from "react-icons/fi"
import {
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  CircularProgress,
  FormHelperText, FormControl, TextField , Button
} from "@material-ui/core"
import i18n from "i18next"
import { useRecoilState, useRecoilValue, selectorFamily } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import * as rdf from "rdflib"
import { useClearCache } from "react-clear-cache"

import { AppProps } from "../../containers/AppContainer"
import {
  reloadEntityState,
  reloadProfileState,
  uiLangState,
  uiLitLangState,
  uiTabState,
  userIdState,
  RIDprefixState,
  savePopupState,
  demoAtom,
} from "../../atoms/common"
import { entitiesAtom, EditedEntityState } from "../../containers/EntitySelectorContainer"
import * as ns from "../../helpers/rdf/ns"
import { langs } from "../../helpers/lang"
import { debugStore, setUserLocalEntities, putTtl } from "../../helpers/rdf/io"
import { history, errors } from "../../helpers/rdf/types"
import config from "../../config"
import { ErrorIcon, InfoIcon } from "../../routes/layout/icons"
import { demoUserId } from "../../containers/DemoContainer"

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

  const [userId, setUserId] = useRecoilState(userIdState)

  const { latestVersion, isLatestVersion, emptyCacheStorage } = useClearCache()

  const [demo, setDemo] = useRecoilState(demoAtom)

  return (
    <nav className={"navbar navbar-dark navbar-expand-md " + (demo ? "demo" : "")}>
      <a href="https://bdrc.io">
        <img className="" src="/images/BDRC.svg" alt="bdrc" height="50" />
        <span>BDRC</span>
      </a>
      <Link to={"/"} onClick={() => setUiTab(-1)} className="navbar-left">
        <span>EDITOR</span>
        <img className="" src="/images/BUDA-small.svg" height="50px" alt="buda editor" />
      </Link>
      <div className="ml-auto" style={{ fontSize: "13px", alignItems: "center", display: "flex" }}>
        {isLatestVersion ? (
          <span title={latestVersion}>(your editor is up-to-date)</span>
        ) : (
          <a
            className="btn-rouge px-2 py-2"
            href="#"
            style={{ width: "auto" }}
            onClick={(e) => {
              e.preventDefault()
              emptyCacheStorage()
            }}
          >
            update&nbsp;editor
          </a>
        )}
        <FormControl style={{ marginLeft: "30px" }}>
          <Select labelId="uilanglabel" id="select" value={uiLang[0].toLowerCase()} onChange={uiLangOnChange}>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="bo">བོད་ཡིག</MenuItem>
            <MenuItem value="zh-hans">中文</MenuItem>
          </Select>
          <FormHelperText>{i18n.t("home.uilang")}</FormHelperText>
        </FormControl>
      </div>

      {isAuthenticated || (demo && userId == demoUserId) ? (
        <div className="btn-group ml-1" role="group">
          <button
            id="userDropDown"
            type="button"
            className="btn btn-sm btn-light shadow-none dropdown-toggle"
            data-toggle="dropdown"
            aria-haspopup="false"
            aria-expanded="false"
          >
            {user?.email ? user.email : userId}
          </button>
          <div className="dropdown-menu" aria-labelledby="userDropDown">
            <Link
              className="btn btn-sm dropdown-item py-0"
              to="/profile"
              onClick={() => {
                entities.map((e, i) => {
                  if (e.subjectQname === userId) {
                    debug("found:", i, e)
                    if (uiTab != i) {
                      setUiTab(i)
                      return
                    }
                  }
                  debug("not found:", entities, userId)
                })
              }}
            >
              Profile
            </Link>

            <div className="dropdown-divider"></div>

            <button
              className="btn btn-sm text-contrast dropdown-item py-0"
              id="button-logout"
              onClick={(e) => {
                e.preventDefault()
                logout({ returnTo: window.location.origin })
                if (localStorage.getItem("BLMPidToken")) localStorage.removeItem("BLMPidToken")
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
