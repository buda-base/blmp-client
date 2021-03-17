import React, { useEffect, useState } from "react"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import i18n from "i18next"

import * as lang from "../../../helpers/lang"
import * as constants from "../../helpers/vocabulary"
import { Edit as LangEdit } from "../../helpers/shapes/skos/label"
import { uiLangState } from "../../../atoms/common"
import { ExtRDFResourceWithLabel } from "../../../helpers/rdf/types"
import { SearchIcon, LaunchIcon, InfoIcon, InfoOutlinedIcon } from "../../layout/icons"

import config from "../../../config"

const debug = require("debug")("bdrc:atom:event:RS")

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiFormHelperText-root": {
      color: theme.palette.secondary.main,
    },
  },
}))

// DONE dedicated subcomponent + keep previous keyword/language searched
export function ResourceSelector({ value, onChange, propid, label, types }) {
  const classes = useStyles()
  const [keyword, setKeyword] = useState("")
  const [language, setLanguage] = useState("")
  const [type, setType] = useState(types ? types[0].qname : "")
  const [libraryURL, setLibraryURL] = useState()
  const [uiLang, setUiLang] = useRecoilState(uiLangState)

  const updateRes = (data) => {
    const newRes = new ExtRDFResourceWithLabel(
      data["@id"],
      {
        ...data["skos:prefLabel"]
          ? { ...data["skos:prefLabel"].reduce((acc, l) => ({ ...acc, [l["@language"]]: l["@value"] }), {}) }
          : {},
      },
      { "tmp:keyword": { ...data["tmp:keyword"] }, ...data["tmp:otherData"] }
    )
    onChange(newRes)
    setLibraryURL("")
  }

  /* // TODO close iframe when clicking anywhere else
  const closeIframe = (ev) => {
    if(libraryURL) {
      setLibraryURL("")
      ev.preventDefault();
      ev.stopPropagation();
      return false;
    }
  }
  */

  useEffect(() => {
    if (value.otherData["tmp:keyword"]) {
      setKeyword(value.otherData["tmp:keyword"]["@value"])
      setLanguage(value.otherData["tmp:keyword"]["@language"])
    }

    // DONE: allow listeners for multiple properties
    const msgHandler = (ev) => {
      try {
        if (!window.location.href.includes(ev.origin)) {
          //debug("message: ", ev, value, JSON.stringify(value))

          const data = JSON.parse(ev.data)
          if (data["tmp:propid"] === propid && data["@id"]) {
            debug("received msg: %o %o", propid, data, ev)
            updateRes(data)
          }
        }
      } catch (err) {
        debug("error: %o", err)
      }
    }

    if (!window.blmp_msg_listener) {
      window.blmp_msg_listener = true
      window.addEventListener("message", msgHandler)
      //document.addEventListener("click", closeIframe)
    }
    // clean up
    return () => {
      delete window.blmp_msg_listener
      window.removeEventListener("message", msgHandler)
      //document.removeEventListener("click", closeIframe)
    }
  }, []) // empty array => run only once

  const updateLibrary = (ev, newlang, newtype) => {
    debug("updLib: %o", propid)
    if (ev && libraryURL) {
      setLibraryURL("")
    } else if (propid) {
      let lang = language
      if (newlang) lang = newlang
      else if (!lang) lang = "bo-x-ewts"
      let key = encodeURIComponent(keyword)
      key = '"' + key + '"'
      if (lang.startsWith("bo")) key = key + "~1"
      lang = encodeURIComponent(lang)
      let t = type
      if (newtype) t = newtype
      if (!t) throw "there should be a type here"
      t = t.replace(/^bdo:/, "")
      // DONE move url to config + use dedicated route in library
      // TODO get type from ontology
      setLibraryURL(config.LIBRARY_URL + "/simplesearch?q=" + key + "&lg=" + lang + "&t=" + t + "&for=" + propid)
    }
  }

  let dates
  if (value.uri && value.uri !== "tmp:uri" && value.otherData) {
    dates = ""

    const getDate = (d) => {
      if (d.onYear) return d.onYear
      // TODO use notBefore/notAfter
      return ""
    }

    if (value.otherData.PersonBirth) dates += getDate(value.otherData.PersonBirth) + "-"

    if (value.otherData.PersonDeath) {
      if (!dates) dates = "- "
      dates += getDate(value.otherData.PersonDeath)
    }

    if (dates) dates = "(" + dates + ")"
  }

  return (
    <React.Fragment>
      <div style={{ position: "relative", ...value.uri === "tmp:uri" ? { width: "100%" } : {} }}>
        {value.uri === "tmp:uri" && (
          <div className="py-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <React.Fragment>
              <TextField
                className={classes.root}
                InputLabelProps={{ shrink: true }}
                //label={value.status === "filled" ? value["@id"] : null}
                style={{ width: "90%" }}
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value)
                  if (libraryURL) updateLibrary(e)
                }}
                helperText={label}
              />
              <LangEdit
                value={{ "@language": language }}
                onChange={(e) => {
                  setLanguage(e["@language"])
                  if (libraryURL) updateLibrary(null, language)
                }}
                langOnly={true}
              />
              <TextField
                style={{ width: "150px" }}
                select
                value={type}
                className={"mx-2"}
                onChange={(e) => {
                  setType(e.target.value)
                  if (libraryURL) updateLibrary(null, null, e.target.value)
                }}
                helperText="Type"
                // TODO we need some prefLabels for types here (ontology? i18n?)
              >
                {types.map((r) => (
                  <MenuItem key={r.qname} value={r.qname}>
                    {r.qname.replace(/^bdo:/, "")}
                  </MenuItem>
                ))}
              </TextField>
              <button
                {...(!keyword || !language || !type ? { disabled: "disabled" } : {})}
                className="btn btn-sm btn-outline-primary py-3 ml-2"
                style={{ boxShadow: "none", alignSelf: "center" }}
                onClick={updateLibrary}
              >
                {i18n.t(libraryURL ? "search.cancel" : "search.lookup")}
              </button>
            </React.Fragment>
          </div>
        )}
        {value.uri !== "tmp:uri" && (
          <React.Fragment>
            {/*           
            <TextField
              className={classes.root}
              InputLabelProps={{ shrink: true }}
              style={{ width: "90%" }}
              value={lang.ValueByLangToStrPrefLang(value.prefLabels, uiLang) + " " + dates + " | " + value.uri}
              helperText={label}
              disabled
            /> */}
            <div>
              <div style={{ fontSize: "16px" /*, borderBottom:"1px solid #ccc"*/ }}>
                {lang.ValueByLangToStrPrefLang(value.prefLabels, uiLang) + " " + dates}
              </div>
              <div style={{ fontSize: "12px", opacity: "0.5", display: "flex", alignItems: "center" }}>
                {value.uri}
                &nbsp;
                {!libraryURL && (
                  <a title={i18n.t("search.help.preview")}>
                    <InfoOutlinedIcon
                      style={{ width: "18px", cursor: "pointer" }}
                      onClick={(ev) => {
                        if (libraryURL) setLibraryURL("")
                        else setLibraryURL(config.LIBRARY_URL + "/show/" + value.uri)
                      }}
                    />
                  </a>
                )}
                {libraryURL && (
                  <a title={i18n.t("search.help.preview")}>
                    <InfoIcon
                      style={{ width: "18px", cursor: "pointer" }}
                      onClick={(ev) => {
                        if (libraryURL) setLibraryURL("")
                        else setLibraryURL(config.LIBRARY_URL + "/show/" + value.uri)
                      }}
                    />
                  </a>
                )}
                &nbsp;
                <a
                  title={i18n.t("search.help.open")}
                  href={config.LIBRARY_URL + "/show/" + value.uri}
                  rel="noreferrer"
                  target="_blank"
                >
                  <LaunchIcon style={{ width: "16px" }} />
                </a>
                &nbsp;
                {value.otherData["tmp:keyword"] && (
                  <a title={i18n.t("search.help.replace")}>
                    <SearchIcon
                      style={{ width: "18px", cursor: "pointer" }}
                      onClick={(ev) =>
                        onChange(
                          new ExtRDFResourceWithLabel(
                            "tmp:uri",
                            {},
                            {
                              ...value.otherData["tmp:keyword"]
                                ? { "tmp:keyword": { ...value.otherData["tmp:keyword"] } }
                                : {},
                            }
                          )
                        )
                      }
                    />
                  </a>
                )}
              </div>
            </div>
            {/* <button
              className="btn btn-sm btn-outline-primary py-3 ml-2"
              style={{ boxShadow: "none", alignSelf: "center" }}
               */}
            {/* {i18n.t("search.change")}
            </button> */}
          </React.Fragment>
        )}
      </div>
      {libraryURL && (
        <div
          className="row card px-3 py-3"
          style={{
            position: "absolute",
            zIndex: 10,
            maxWidth: "800px", //minWidth: "670px",
            ...value.uri === "tmp:uri"
              ? { right: "calc(1rem - 1px + 34px)", width: "calc(100% - 34px)", bottom: "calc(100% - 1rem)" }
              : {},
            ...value.uri !== "tmp:uri" ? { left: "1rem", width: "calc(100%)", bottom: "100%" } : {},
          }}
        >
          <iframe style={{ border: "none" }} height="400" src={libraryURL} />
        </div>
      )}
    </React.Fragment>
  )
}

export default ResourceSelector
