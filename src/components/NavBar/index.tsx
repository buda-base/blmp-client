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
import { AppProps } from "../../containers/AppContainer"
import { HistoryHandler } from "../../routes/helpers/observer"
import { profileIdState, uiLangState, uiTabState } from "../../atoms/common"
import { entitiesAtom, EditedEntityState } from "../../containers/EntitySelectorContainer"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"
import * as ns from "../../helpers/rdf/ns"
import { langs } from "../../helpers/lang"
import { debugStore, setUserLocalEntities } from "../../helpers/rdf/io"

const debug = require("debug")("bdrc:NavBar")

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
      <a href="https://bdrc.io">
        <img className="" src="/images/BDRC.svg" alt="bdrc" height="50" />
        <span>BDRC</span>
      </a>
      <Link to={"/"} className="navbar-left">
        <span>EDITOR</span>
        <img className="" src="/images/BUDA-small.svg" height="50px" alt="buda editor" />
      </Link>
      <FormControl className="ml-auto">
        <Select labelId="uilanglabel" id="select" value={uiLang} onChange={uiLangOnChange}>
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
  const [profileId, setProfileId] = useRecoilState(profileIdState)
  const entity = entities.findIndex((e, i) => i === uiTab)
  const entitySubj = entities[entity]?.subject
  const entityUri = entities[entity]?.subject?.uri || "tmp:uri"
  const auth0 = useAuth0()
  const [message, setMessage] = useState("")
  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  const [lang, setLang] = useState(uiLang)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLang(uiLang)
  }, [uiLang])

  //debug("bottombar:", props, entitySubj?.qname, message, lang, uiLang) //,entityQname)

  const save = (): void => {
    //debug("save:",entities[entity])

    if (entities[entity].state === EditedEntityState.Error) {
      if (!window.confirm("errors are detected in this entity, save anyway?")) return
    }

    if (!saving) {
      setSaving(true)
      return
    }

    const store = new rdf.Store()
    ns.setDefaultPrefixes(store)
    entitySubj?.graph.addNewValuestoStore(store)
    debugStore(store)
    const newEntities = [...entities]
    newEntities[entity] = { ...newEntities[entity], state: EditedEntityState.Saved }
    setEntities(newEntities)

    // save ttl to localStorage
    const defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
    rdf.serialize(defaultRef, store, undefined, "text/turtle", async function (err, str) {
      setUserLocalEntities(auth0, entities[entity].subjectQname, entities[entity].shapeRef.qname, str)
    })

    setSaving(false)
    setMessage("")
  }

  const onLangChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    setLang(event.target.value as string)
  }

  const onMessageChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    setMessage(event.target.value as string)
  }

  return (
    <nav className="bottom navbar navbar-dark navbar-expand-md">
      <HistoryHandler entityUri={entityUri} />
      <span />
      {saving && (
        <div style={{ marginTop: "-9px", marginLeft: "auto" }}>
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
        </div>
      )}
      <Button
        variant="outlined"
        onClick={save}
        className="btn-rouge"
        {...((entities[entity] &&
          [EditedEntityState.Saved, EditedEntityState.NotLoaded, EditedEntityState.Loading].includes(
            entities[entity].state
          )) ||
        (message === "" && saving)
          ? { disabled: true }
          : {})}
      >
        {saving ? "Ok" : "Save"}
      </Button>
      {saving && (
        <Button
          variant="outlined"
          onClick={() => {
            setSaving(false)
            setMessage("")
          }}
          className="btn-blanc ml-2"
          style={{ position: "absolute", left: "calc(100% - (100% - 1225px)/2)" }}
        >
          Cancel
        </Button>
      )}
    </nav>
  )
}
export const BottomBarContainer = withRouter(BottomBar)
