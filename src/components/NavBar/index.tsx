/* eslint-disable no-extra-parens */
import React from "react"
import { withRouter } from "react-router"
import { Link } from "react-router-dom"
import { FiPower as LogoutIcon } from "react-icons/fi"
import { InputLabel, Select, MenuItem } from "@material-ui/core"
import i18n from "i18next"
import { useRecoilState, useRecoilValue, selectorFamily } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import { FormHelperText, FormControl } from "@material-ui/core"
import { AppProps } from "../../containers/AppContainer"
import { HistoryHandler } from "../../routes/helpers/observer"
import { uiLangState, uiTabState } from "../../atoms/common"
import { entitiesAtom } from "../../containers/EntitySelectorContainer"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"
import * as ns from "../../helpers/rdf/ns"
import { debugStore } from "../../helpers/rdf/io"

function NavBar(props: AppProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth0()

  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  // https://github.com/mui-org/material-ui/issues/15400
  const uiLangOnChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setUiLang(event.target.value as string)
  }

  const [entities] = useRecoilState(entitiesAtom)
  const [uiTab] = useRecoilState(uiTabState)

  return (
    <nav className="navbar navbar-dark navbar-expand-md">
      <Link to={"/"} className="navbar-left">
        <img className="mx-auto" src="/images/BUDA-small.svg" height="50px" alt="buda editor" />
      </Link>
      <FormControl className="ml-3">
        <Select labelId="uilanglabel" id="select" value={uiLang} onChange={uiLangOnChange}>
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="bo">བོད་ཡིག</MenuItem>
          <MenuItem value="zh-Hans">中文</MenuItem>
        </Select>
        <FormHelperText>{i18n.t("home.uilang")}</FormHelperText>
      </FormControl>

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
export const NavBarContainer = withRouter(NavBar)

function BottomBar(props: AppProps) {
  const [entities] = useRecoilState(entitiesAtom)
  const [uiTab] = useRecoilState(uiTabState)
  const entity = entities.findIndex((e, i) => i === uiTab)
  const entitySubj = entities[entity]?.subject
  const entityUri = entities[entity]?.subject?.uri || "tmp:uri"

  const save = (): void => {
    const store = new rdf.Store()
    ns.setDefaultPrefixes(store)
    entitySubj?.graph.addNewValuestoStore(store)
    debugStore(store)
  }

  return (
    <nav className="bottom navbar navbar-dark navbar-expand-md">
      <HistoryHandler entityUri={entityUri} />
      <Button variant="outlined" onClick={save}>
        Save
      </Button>
    </nav>
  )
}
export const BottomBarContainer = withRouter(BottomBar)
