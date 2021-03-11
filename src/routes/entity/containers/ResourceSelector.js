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

  const handler = (ev) => {
    try {
      if (!window.location.href.includes(ev.origin)) {
        //debug("message: ", ev, value, JSON.stringify(value))

        const data = JSON.parse(ev.data)
        if (data["tmp:propid"] === propid && data["@id"]) {
          debug("received msg: %o %o", propid, data, ev)

          onChange(
            new ExtRDFResourceWithLabel(data["@id"], {
              ...data["skos:prefLabel"]
                ? { ...data["skos:prefLabel"].reduce((acc, l) => ({ ...acc, [l["@language"]]: l["@value"] }), {}) }
                : {},
            })
          )

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
      setLibraryURL(config.LIBRARY_URL + "?q=" + key + "&lg=" + lang + "&t=" + t + "&for=" + propid)
    }
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div className="py-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {value.uri === "tmp:uri" && (
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
        )}
        {value.uri !== "tmp:uri" && (
          <React.Fragment>
            <TextField
              className={classes.root}
              InputLabelProps={{ shrink: true }}
              style={{ width: "90%" }}
              value={lang.ValueByLangToStrPrefLang(value.prefLabels, uiLang)}
              helperText={label}
              disabled
            />
            <button
              className="btn btn-sm btn-outline-primary py-3 ml-2"
              style={{ boxShadow: "none", alignSelf: "center" }}
              onClick={(ev) => onChange(new ExtRDFResourceWithLabel("tmp:uri", {}))}
            >
              {i18n.t("search.change")}
            </button>
          </React.Fragment>
        )}
      </div>
      {libraryURL && (
        <div
          className="row card px-3 py-3"
          style={{
            position: "absolute",
            right: "calc(1rem - 1px)",
            width: "100%",
            zIndex: 10,
            bottom: "calc(100% - 1rem)",
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
