import React, { useEffect, useState, FC, ChangeEvent, useRef, useLayoutEffect } from "react"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import i18n from "i18next"
import { useHistory, Link } from "react-router-dom"
import { fromWylie } from "jsewts"
import * as shapes from "../../../helpers/rdf/shapes"
import * as lang from "../../../helpers/lang"
import { uiLangState, uiLitLangState, uiTabState } from "../../../atoms/common"
import { RDFResource, ExtRDFResourceWithLabel, RDFResourceWithLabel, Subject } from "../../../helpers/rdf/types"
import { PropertyShape } from "../../../helpers/rdf/shapes"
import {
  SearchIcon,
  LaunchIcon,
  InfoIcon,
  InfoOutlinedIcon,
  ErrorIcon,
  EditIcon,
  LookupIcon,
  CloseIcon,
} from "../../layout/icons"
import { entitiesAtom, Entity } from "../../../containers/EntitySelectorContainer"
import { LangSelect } from "./ValueList"
import { qnameFromUri } from "../../../helpers/rdf/ns"
import * as ns from "../../../helpers/rdf/ns"

import config from "../../../config"

const debug = require("debug")("bdrc:atom:event:RS")

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiFormHelperText-root": {
      color: theme.palette.secondary.main,
    },
  },
}))

type valueLang = {
  "@value": string
  "@language": string
}

type dateDate = {
  onYear: string
  notBefore: string
  notAfter: string
}

type messagePayload = {
  "tmp:propid": string
  "@id": string
  "skos:prefLabel"?: Array<valueLang>
  "tmp:keyword": valueLang
  "tmp:otherData": Record<string, string | string[]>
}

// DONE dedicated subcomponent + keep previous keyword/language searched
const ResourceSelector: FC<{
  value: ExtRDFResourceWithLabel
  onChange: (value: ExtRDFResourceWithLabel, idx: number, removeFirst: boolean | undefined) => void
  property: PropertyShape
  idx: number
  exists: (uri: string) => boolean
  subject: Subject
  editable: boolean
  owner?: Subject
  title: string
  globalError: string
  updateEntityState: (es: EditedEntityState) => void
}> = ({ value, onChange, property, idx, exists, subject, editable, owner, title, globalError, updateEntityState }) => {
  const classes = useStyles()
  const [keyword, setKeyword] = useState("")
  const [language, setLanguage] = useState("bo-x-ewts") // TODO: default value should be from the user profile or based on the latest value used
  const [type, setType] = useState(property.expectedObjectTypes ? property.expectedObjectTypes[0].qname : "")
  const [libraryURL, setLibraryURL] = useState("")
  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  const [uiLitLang, setUiLitLang] = useRecoilState(uiLitLangState)
  const [error, setError] = useState()
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const history = useHistory()
  const msgId = subject.qname + property.qname + idx
  const [popupNew, setPopupNew] = useState(false)
  const [tab, setTab] = useRecoilState(uiTabState)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const isRid = keyword.startsWith("bdr:") || keyword.match(/^([cpgwrti]|mw|wa|was|ut|ie|pr)(\d|eap)[^ ]*$/i)

  //debug("gE:", error, globalError)
  useEffect(() => {
    if (globalError && !error) setError(globalError)
  }, [globalError])

  if (!property.expectedObjectTypes) {
    debug(property)
    throw "can't get the types for property " + property.qname
  }

  // TODO close iframe when clicking anywhere else
  const closeFrame = () => {
    if (iframeRef.current && isRid) {
      debug("if:", iframeRef.current)
      iframeRef.current.click()
      const wn = iframeRef.current.contentWindow
      wn.postMessage("click", "*") //https://editor.bdrc.io/")
      /*
      try {
        const iDocument = iWindow.document
        const elem = iDocument.getElementByClassName("resource simple")
        elem.click()
      } catch (e) {
        debug("does not work on localhost, you must click in iframe", e.message)
      }
      */
    } else {
      if (libraryURL) setLibraryURL("")
    }
  }

  //debug("ext:", value.qname)

  let updateRes, msgHandler
  useEffect(() => {
    //debug("url:", libraryURL)

    updateRes = (data: messagePayload) => {
      let isTypeOk = false,
        actual,
        allow
      if (property.expectedObjectTypes) {
        allow = property.expectedObjectTypes.map((t) => t.qname)
        if (!Array.isArray(allow)) allow = [allow]
        actual = data["tmp:otherData"]["tmp:type"]
        if (!Array.isArray(actual)) actual = [actual]
        if (actual.filter((t) => allow.includes(t)).length) isTypeOk = true
        //debug("typeOk",isTypeOk,actual,allow)
        const displayTypes = (t: string[]) =>
          t
            .filter((a) => a)
            .map((a) => a.replace(/^bdo:/, ""))
            .join(", ") // TODO: translation (ontology?)
        if (!isTypeOk)
          setError("Has type: " + displayTypes(actual) + "; but should have one of: " + displayTypes(allow))
      }

      if (isTypeOk) {
        if (data["@id"] && !exists(data["@id"])) {
          const newRes = new ExtRDFResourceWithLabel(
            data["@id"].replace(/bdr:/, ns.BDR_uri),
            {
              ...data["skos:prefLabel"]
                ? {
                    ...data["skos:prefLabel"].reduce(
                      (acc: Record<string, string>, l: valueLang) => ({ ...acc, [l["@language"]]: l["@value"] }),
                      {}
                    ),
                  }
                : {},
            },
            { "tmp:keyword": { ...data["tmp:keyword"] }, ...data["tmp:otherData"] }
          )
          onChange(newRes, idx, false)
          //debug("url?",libraryURL)
        } else if (isTypeOk) {
          // TODO translation with i18n
          if (data["@id"]) setError(data["@id"] + " already selected")
          else throw "no '@id' field in data"
          setLibraryURL("")
        } else {
          setLibraryURL("")
        }
      }
    }

    if (msgHandler) window.removeEventListener("message", msgHandler, true)

    msgHandler = (ev: MessageEvent) => {
      try {
        if (!window.location.href.includes(ev.origin)) {
          //debug("message: ", ev, value, JSON.stringify(value))

          const data = JSON.parse(ev.data) as messagePayload
          if (data["tmp:propid"] === msgId && data["@id"]) {
            debug("received msg: %o %o", msgId, data, ev, property.qname, libraryURL)
            updateRes(data)
            //debug("URL:",libraryURL)
          } else {
            setLibraryURL("")
          }
        }
      } catch (err) {
        debug("error: %o", err)
      }
    }

    window.addEventListener("message", msgHandler, true)

    return () => {
      if (msgHandler) window.removeEventListener("message", msgHandler, true)
      //document.removeEventListener("click", closeIframe)
    }
  }, [libraryURL])

  // DONE: allow listeners for multiple properties
  useEffect(() => {
    if (value.otherData["tmp:keyword"]) {
      setKeyword(value.otherData["tmp:keyword"]["@value"])
      setLanguage(value.otherData["tmp:keyword"]["@language"])
    }
    /*

    // moved to effect on libraryURL
    window.addEventListener("message", msgHandler)

    //document.addEventListener("click", closeIframe)

    // clean up
    return () => {
      if(msgHandler) window.removeEventListener("message", msgHandler, true)
      //document.removeEventListener("click", closeIframe)
    }
    */
  }, []) // empty array => run only once

  const updateLibrary = (ev?: Event | React.FormEvent, newlang?: string, newtype?: string) => {
    debug("updLib: %o", msgId)
    if (ev && libraryURL) {
      setLibraryURL("")
    } else if (msgId) {
      if (isRid) {
        // TODO: return dates in library
        setLibraryURL(
          config.LIBRARY_URL + "/simple/" + (!keyword.startsWith("bdr:") ? "bdr:" : "") + keyword + "?for=" + msgId
        )
      } else {
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

        // #529: how to find scans
        if (t.includes("ImageInstance")) t = "Scan"
        else if (t.includes("EtextInstance")) t = "Etext"

        // DONE move url to config + use dedicated route in library
        // TODO get type from ontology
        setLibraryURL(config.LIBRARY_URL + "/simplesearch?q=" + key + "&lg=" + lang + "&t=" + t + "&for=" + msgId)
      }
    }
  }

  let dates
  if (value.uri && value.uri !== "tmp:uri" && value.otherData) {
    dates = ""

    const getDate = (d: dateDate) => {
      if (d.onYear) return d.onYear
      // TODO use notBefore/notAfter
      else if (d.notBefore || d.notAfter) {
        let date = ""
        if (d.notBefore) date = d.notBefore
        date += "~"
        if (d.notAfter) date += d.notAfter
        return date
      }
      return ""
    }

    if (value.otherData.PersonBirth) dates += getDate(value.otherData.PersonBirth) + " – "

    if (value.otherData.PersonDeath) {
      if (!dates) dates = "– "
      dates += getDate(value.otherData.PersonDeath)
    }

    if (dates) dates = "(" + dates + ")"
  }

  const createAndUpdate = (type: RDFResourceWithLabel) => () => {
    let url = "/new/" + shapes.typeUriToShape[type.uri][0].qname
    if (property.connectIDs) {
      const lname = subject.lname
      const prefix = property.targetShape?.getPropStringValue(shapes.bdsIdentifierPrefix)
      if (prefix == null)
        throw "cannot find prefix for target shape of property "+property.qname
      const targetLname = prefix + ns.removeEntityPrefix(lname)
      // the bdr: here should be more safe
      url += "/bdr:"+targetLname
    }
    history.push(url)
  }

  const chooseEntity = (ent: Entity, prefLabels: Record<string, string>) => () => {
    //debug("choose",ent)
    togglePopup()
    const newRes = new ExtRDFResourceWithLabel(ent.subjectQname, prefLabels, {})
    onChange(newRes, idx, false)
  }

  const togglePopup = () => {
    setPopupNew(!popupNew)
  }

  const label = lang.ValueByLangToStrPrefLang(property.prefLabels, uiLitLang)

  const textOnChange: React.ChangeEventHandler<HTMLInputElement> = (e: React.FormEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value
    setKeyword(newValue)
    if (libraryURL) updateLibrary(e)
  }

  const textOnChangeType: React.ChangeEventHandler<HTMLInputElement> = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setType(newValue)
    if (libraryURL) updateLibrary(undefined, undefined, newValue)
  }

  const onClick: React.MouseEventHandler<HTMLButtonElement> = (e: React.MouseEvent<HTMLButtonElement>) => {
    updateLibrary(e)
  }

  let name = (
    <div style={{ fontSize: "16px" /*, borderBottom:"1px solid #ccc"*/ }}>
      {lang.ValueByLangToStrPrefLang(value.prefLabels, uiLitLang) + " " + dates}
    </div>
  )

  const entity = entities.filter((e) => e.subjectQname === value.qname)
  if (entity.length) {
    name = <LabelWithRID entity={entity[0]} />
  }

  useEffect(() => {
    if (error) {
      debug("error:", error)
    } else {
      //
    }
  }, [error])

  const inputRef = useRef<HTMLInputElement>()
  const [withPreview, setWithPreview] = useState(false)
  useLayoutEffect(() => {
    setWithPreview(language === "bo-x-ewts" && keyword && !isRid && document.activeElement === inputRef.current)
  })

  return (
    <React.Fragment>
      <div
        className={"resSelect " + (error ? "error" : "")}
        style={{ position: "relative", ...value.uri === "tmp:uri" ? { width: "100%" } : {} }}
      >
        {value.uri === "tmp:uri" && (
          <div
            className={withPreview ? "withPreview" : ""}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}
          >
            <React.Fragment>
              {withPreview && (
                <div className="preview-ewts">
                  <TextField disabled value={fromWylie(keyword)} />
                </div>
              )}
              <TextField
                onKeyPress={(e) => {
                  if (e.key === "Enter") onClick(e)
                }}
                onFocus={() => setWithPreview(language === "bo-x-ewts" && keyword && !isRid)}
                onBlur={() => setWithPreview(false)}
                inputRef={inputRef}
                //className={classes.root}
                InputLabelProps={{ shrink: true }}
                style={{ width: "90%" }}
                value={keyword}
                onChange={textOnChange}
                //label={value.status === "filled" ? value["@id"] : null}
                placeholder={"Search name or RID for " + title}
                {...(error
                  ? {
                      helperText: (
                        <React.Fragment>
                          {/*label*/} <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
                          {/* <br /> */}
                          <i>{error}</i>
                        </React.Fragment>
                      ),
                      error: true,
                    }
                  : {})}
                {...(!editable ? { disabled: true } : {})}
              />
              <LangSelect
                value={language}
                onChange={(lang: string) => {
                  setLanguage(lang)
                  debug("yeah, changing lang!!", lang)
                  debug(lang)
                  if (libraryURL) updateLibrary(undefined, lang)
                }}
                {...(isRid ? { disabled: true } : { disabled: false })}
                editable={editable}
                error={error}
              />
              {property.expectedObjectTypes?.length > 1 && (
                <TextField
                  select
                  style={{ width: 100, flexShrink: 0 }}
                  value={type}
                  className={"mx-2"}
                  onChange={textOnChangeType}
                  label="Type"
                  {...(isRid ? { disabled: true } : {})}
                  {...(!editable ? { disabled: true } : {})}
                  {...(error
                    ? {
                        helperText: <br />,
                        error: true,
                      }
                    : {})}
                  // TODO we need some prefLabels for types here (ontology? i18n?)
                >
                  {property.expectedObjectTypes?.map((r) => (
                    <MenuItem key={r.qname} value={r.qname}>
                      {r.qname.replace(/^bdo:/, "")}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <button
                {...(!keyword || !isRid && (!language || !type) ? { disabled: true } : {})}
                className="btn btn-sm btn-outline-primary ml-2 lookup btn-rouge"
                style={{ boxShadow: "none", alignSelf: "center", padding: "5px 4px 4px 4px" }}
                onClick={onClick}
                {...(!editable ? { disabled: true } : {})}
              >
                {libraryURL ? <CloseIcon /> : <LookupIcon />}
              </button>
              <button
                className="btn btn-sm btn-outline-primary py-3 ml-2 dots btn-rouge"
                style={{ boxShadow: "none", alignSelf: "center" }}
                {...(isRid ? { disabled: true } : {})}
                onClick={togglePopup}
                {...(!editable ? { disabled: true } : {})}
              >
                {i18n.t("search.create")}
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
            <div className="selected">
              {name}
              <div style={{ fontSize: "12px", opacity: "0.5", display: "flex", alignItems: "center" }}>
                {value.qname}
                &nbsp;
                <a
                  title={i18n.t("search.help.preview")}
                  onClick={() => {
                    if (libraryURL) setLibraryURL("")
                    else if (value.otherData["tmp:externalUrl"]) setLibraryURL(value.otherData["tmp:externalUrl"])
                    else setLibraryURL(config.LIBRARY_URL + "/simple/" + value.qname + "?view=true")
                  }}
                >
                  {!libraryURL && <InfoOutlinedIcon style={{ width: "18px", cursor: "pointer" }} />}
                  {libraryURL && <InfoIcon style={{ width: "18px", cursor: "pointer" }} />}
                </a>
                &nbsp;
                <a
                  title={i18n.t("search.help.open")}
                  href={config.LIBRARY_URL + "/show/" + value.qname}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <LaunchIcon style={{ width: "16px" }} />
                </a>
                &nbsp;
                <Link title={i18n.t("search.help.edit")} to={"/edit/" + value.qname}>
                  <EditIcon style={{ width: "16px" }} />
                </Link>
                &nbsp;
                {/* // deprecated
                
                  value.otherData["tmp:keyword"] && (
                  <a title={i18n.t("search.help.replace")}>
                    <SearchIcon
                      style={{ width: "18px", cursor: "pointer" }}
                      onClick={() =>
                        onChange(
                          new ExtRDFResourceWithLabel(
                            "tmp:uri",
                            {},
                            {
                              ...value.otherData["tmp:keyword"]
                                ? { "tmp:keyword": { ...value.otherData["tmp:keyword"] } }
                                : {},
                            }
                          ),
                          idx,
                          true
                        )
                      }
                    />
                  </a>
                ) */}
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
          className="row card px-3 py-3 iframe"
          style={{
            position: "absolute",
            zIndex: 10,
            maxWidth: "800px",
            minWidth: "670px",
            ...value.uri === "tmp:uri"
              ? {
                  right: "calc(52px)",
                  width: "calc(100% - 100px)",
                  bottom: "calc(100%)",
                }
              : {},
            ...value.uri !== "tmp:uri"
              ? { left: "calc(1rem)", width: "calc(100%)", bottom: "calc(100% - 0.5rem)" }
              : {},
          }}
        >
          <iframe style={{ border: "none" }} height="400" src={libraryURL} ref={iframeRef} />
          <div className="iframe-BG" onClick={closeFrame}></div>
        </div>
      )}
      {popupNew && (
        <div className="card popup-new">
          <div className="front">
            {entities.map((e, i) => {
              // DONE: check type as well with property.expectedObjectTypes
              if (
                !exists(e?.subjectQname) &&
                e?.subjectQname != subject.qname &&
                e?.subjectQname != owner?.qname &&
                property.expectedObjectTypes?.some((t) =>
                  // DONE shapeRef is updated upon shape selection
                  (e.shapeRef?.qname ?? e.shapeRef)?.startsWith(t.qname.replace(/^bdo:/, "bds:"))
                )
              ) {
                //debug("diff ok:",property.expectedObjectTypes,e,e.subjectQname,subject.qname,owner?.qname)
                return (
                  <MenuItem key={i + 1} className="px-0 py-0">
                    <LabelWithRID choose={chooseEntity} entity={e} />
                  </MenuItem>
                )
              }
            })}
            <hr className="my-1" />
            {property.expectedObjectTypes?.map((r) => (
              <MenuItem key={r.qname} value={r.qname} onClick={createAndUpdate(r)}>
                {i18n.t("search.new", { type: r.qname.replace(/^bdo:/, "") })}
              </MenuItem>
            ))}
          </div>
          <div className="popup-new-BG" onClick={togglePopup}></div>
        </div>
      )}
    </React.Fragment>
  )
}

const LabelWithRID: FC<{ entity: Entity; choose?: (e: Entity, labels: Record<string, string>) => () => void }> = ({
  entity,
  choose,
}) => {
  const [uiLang] = useRecoilState(uiLangState)
  const [uiLitLang] = useRecoilState(uiLitLangState)
  const [labelValues] = useRecoilState(entity.subjectLabelState)
  const prefLabels = RDFResource.valuesByLang(labelValues)
  const label = lang.ValueByLangToStrPrefLang(prefLabels, uiLitLang)

  if (!choose) return <span style={{ fontSize: "16px" }}>{label}</span>
  else
    return (
      <div className="px-3 py-1" style={{ width: "100%" }} onClick={choose(entity, prefLabels)}>
        <div className="label">{label}</div>
        <div className="RID">{entity.subjectQname}</div>
      </div>
    )
}

export default ResourceSelector
