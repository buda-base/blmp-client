import React, { useEffect, useState } from "react"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import i18n from "i18next"

import * as constants from "../../helpers/vocabulary"
import { Edit as LangEdit } from "../../helpers/shapes/skos/label"
import { uiLangState } from "../../../atoms/common"

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
export function ResourceSelector({ value, onChange, propid, type, helperTxt, parentId }) {
  const classes = useStyles()
  const [keyword, setKeyword] = useState("")
  const [language, setLanguage] = useState("")
  const [libraryURL, setLibraryURL] = useState()
  const [uiLang, setUiLang] = useRecoilState(uiLangState)

  const handler = (ev) => {
    try {
      if (!window.location.href.includes(ev.origin)) {
        //debug("message: ", ev, value, JSON.stringify(value))

        const data = JSON.parse(ev.data)
        if (data["tmp:propid"] === propid && data["@id"]) {
          //debug("received msg: %o %o", propid, data, ev)

          // DONE this erases other changes when handler is defined in useEffect
          onChange({ ...value, [propid]: { ...value[propid], ...data } })

          setLibraryURL("")
        }
      }
    } catch (err) {
      debug("error: %o", err)
    }
  }

  window.addEventListener("message", handler)

  useEffect(() => {
    // clean up
    return () => window.removeEventListener("message", handler)
  }, []) // empty array => run only once

  const updateLibrary = (ev, newlang) => {
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
      // DONE move url to config + use dedicated route in library
      // TODO get type from ontology
      setLibraryURL(config.LIBRARY_URL + "?q=" + key + "&lg=" + lang + "&t=" + type + "&for=" + propid)
    }
  }

  // TODO use pdl functions
  const getLocalizedValue = (values) => {
    let val = values.filter((v) => v["@language"] === uiLang)
    if (val.length) val = val[0]["@value"]
    else if (values.length) val = values[0]["@value"]
    else val = "?"
    return val
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div className="py-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {value === "tmp:uri" && (
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
              helperText={constants.EventTypes[value.type] + " (" + helperTxt + ")" || "n/a"}
            />
            <LangEdit
              value={{ "@language": language }}
              onChange={(e) => {
                setLanguage(e["@language"])
                if (libraryURL) updateLibrary(null, language)
              }}
              langOnly={true}
            />
            <button
              {...(!keyword || !language ? { disabled: "disabled" } : {})}
              className="btn btn-sm btn-outline-primary py-3 ml-2"
              style={{ boxShadow: "none", alignSelf: "center" }}
              onClick={updateLibrary}
            >
              {i18n.t(libraryURL ? "search.cancel" : "search.lookup")}
            </button>
          </React.Fragment>
        )}
        {/*(typeof value[propid] === "string" || value[propid]["@id"]) && (
          <React.Fragment>
            <TextField
              className={classes.root}
              InputLabelProps={{ shrink: true }}
              //label={value.status === "filled" ? value["@id"] : null}
              style={{ width: "90%" }}
              value={
                !value[propid]["@id"]
                  ? value[propid]
                  : getLocalizedValue(value[propid]["skos:prefLabel"]) + " | " + value[propid]["@id"]
              }
              helperText={constants.EventTypes[value.type] + " (" + helperTxt + ")" || "n/a"}
              disabled
            />
            <button
              className="btn btn-sm btn-outline-primary py-3 ml-2"
              style={{ boxShadow: "none", alignSelf: "center" }}
              onClick={(ev) => {
                debug("click: %o %o", value[propid])
                let propVal = value[propid]
                if (propVal["@id"]) {
                  propVal = { ...propVal["tmp:keyword"] }
                  delete propVal["@id"]
                  delete propVal["skos:prefLabel"]
                  delete propVal["tmp:keyword"]
                } else {
                  propVal = { "@value": "", "@language": "" }
                }
                onChange({ ...value, [propid]: propVal })
              }}
            >
              {i18n.t("search.change")}
            </button>
          </React.Fragment>
        ) */}
      </div>
      {libraryURL && (
        <div
          className="row card px-3 py-3"
          style={{
            position: "absolute",
            right: "calc(1rem - 1px)",
            width: "100%",
            zIndex: 10,
            bottom: "calc(100% - 1.5rem)",
            maxWidth: "800px",
          }}
        >
          <iframe style={{ border: "none" }} height="400" src={libraryURL} />
        </div>
      )}
    </div>
  )
}

export default ResourceSelector
