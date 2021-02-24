/* eslint-disable no-extra-parens */
import React from "react"
import { withRouter } from "react-router"
import { Link } from "react-router-dom"
import { FiPower as LogoutIcon } from "react-icons/fi"
import { InputLabel, Select, MenuItem } from "@material-ui/core"
import i18n from "i18next"
import { atom, useRecoilState, useRecoilValue, selectorFamily } from "recoil"

import { useAuth0 } from "@auth0/auth0-react"

const uiLangState = atom({
  key: "uiLangState",
  default: "en",
})

function NavBar(props) {
  const { user, isAuthenticated, isLoading, logout } = useAuth0()

  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  const uiLangOnChange = (event) => {
    setUiLang(event.target.value)
  }

  return (
    <nav className="navbar navbar-dark navbar-expand-md">
      <Link to={"/"} className="navbar-left">
        <img className="mx-auto" src="/images/BUDA-small.svg" height="50px" alt="buda editor" />
      </Link>

      <InputLabel id="uilanglabel">{i18n.t("home.uilang")}</InputLabel>
      <Select labelId="uilanglabel" id="select" value={uiLang} onChange={uiLangOnChange}>
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="bo">བོད་ཡིག</MenuItem>
        <MenuItem value="zh">中文</MenuItem>
      </Select>

      {isAuthenticated ? (
        <div className="btn-group ml-auto" role="group">
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
          <Link className="btn btn-light mx-1 ml-auto" to="/login">
            Login
          </Link>
        </React.Fragment>
      ) : null}
    </nav>
  )
}

export default withRouter(NavBar)
