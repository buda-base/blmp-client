/* eslint-disable no-extra-parens */
import React from "react"
import { Link, useNavigate } from "react-router-dom"
import { FiPower as LogoutIcon } from "react-icons/fi"
import {
  Select,
  MenuItem,
  FormHelperText, FormControl
} from "@material-ui/core"
import i18n from "i18next"
import { useRecoilState } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import { useClearCache } from "react-clear-cache"

import {
  userIdState,
} from "../../atoms/common"
import { atoms } from "rdf-document-editor"
import { debug as debugfactory } from "debug"

const debug = debugfactory("bdrc:NavBar")

export const NavBarContainer = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth0()
  const [uiLang, setUiLang] = useRecoilState(atoms.uiLangState)
  const [entities] = useRecoilState(atoms.entitiesAtom)
  const [uiTab, setUiTab] = useRecoilState(atoms.uiTabState)
  const [userId, setUserId] = useRecoilState(userIdState)
  const { latestVersion, isLatestVersion, emptyCacheStorage } = useClearCache()
  const navigate = useNavigate()
  const uiLangOnChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setUiLang(event.target.value as string)
  }

  return (
    <nav className={"navbar navbar-dark navbar-expand-md "}>
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
          <Select labelId="uilanglabel" id="select" value={uiLang.toLowerCase()} onChange={uiLangOnChange}>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="bo">བོད་ཡིག</MenuItem>
            <MenuItem value="zh-hans">中文</MenuItem>
          </Select>
          <FormHelperText><>{i18n.t("home.uilang")}</></FormHelperText>
        </FormControl>
      </div>

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
            {user?.email ? user.email : userId}
          </button>
          <div className="dropdown-menu" aria-labelledby="userDropDown">
            <Link
              className="btn btn-sm dropdown-item py-0"
              to="/profile"
              onClick={() => {
                entities.map((e, i): void => {
                  // TODO: userId is now the URI
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
                navigate("/")
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
