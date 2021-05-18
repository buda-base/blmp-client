import React, { useEffect, FC, ChangeEvent, useState, useRef } from "react"
import PropTypes from "prop-types"
import * as rdf from "rdflib"
import {
  LiteralWithId,
  Subject,
  Value,
  ObjectType,
  RDFResourceWithLabel,
  ExtRDFResourceWithLabel,
} from "../../../helpers/rdf/types"
import { PropertyShape } from "../../../helpers/rdf/shapes"
import * as ns from "../../../helpers/rdf/ns"
import { generateNew } from "../../../helpers/rdf/construct"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem, InputLabel, Select } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../helpers/atoms"
import {
  AddIcon,
  RemoveIcon,
  ErrorIcon,
  CloseIcon,
  VisibilityIcon,
  VisibilityOffIcon,
  MDIcon,
} from "../../layout/icons"
import i18n from "i18next"
import PropertyContainer from "./PropertyContainer"
import * as lang from "../../../helpers/lang"
import { uiLangState, uiEditState } from "../../../atoms/common"
import ResourceSelector from "./ResourceSelector"
import { entitiesAtom, Entity } from "../../../containers/EntitySelectorContainer"

import { fromWylie } from "jsewts"
import MDEditor from "@uiw/react-md-editor"

export const MinimalAddButton: FC<{
  add: React.MouseEventHandler<HTMLButtonElement>
  className: string
  disable?: boolean
}> = ({ add, className, disable }) => {
  return (
    <div
      className={
        "minimalAdd " + "disable_" + disable + (className !== undefined ? className : " text-right")
      } /*style={{ width: "100%" }}*/
    >
      <button className="btn btn-link ml-2 px-0" onClick={add} {...(disable ? { disabled: true } : {})}>
        <AddIcon />
      </button>
    </div>
  )
}

export const BlockAddButton: FC<{ add: React.MouseEventHandler<HTMLButtonElement> /*; label: string*/ }> = ({
  add,
  //label,
}) => {
  return (
    <div className="blockAdd text-center pb-1 mt-3" style={{ width: "100%" }}>
      <button className="btn btn-sm btn-block btn-outline-primary px-0" style={{ boxShadow: "none" }} onClick={add}>
        {i18n.t("general.add_another")} <AddIcon /> {/* label */}
      </button>
    </div>
  )
}

export const OtherButton: FC<{ onClick: React.MouseEventHandler<HTMLButtonElement>; label: string }> = ({
  onClick,
  label,
}) => {
  return (
    <div className="blockAdd text-center pb-1" style={{ margin: "0 15px" }}>
      <button
        className="btn btn-sm btn-block btn-outline-primary mb-2 px-0 py-2"
        style={{ boxShadow: "none" }}
        onClick={onClick}
      >
        {label}
      </button>
    </div>
  )
}

/* // breaks history
export const updateEntitiesRDF = (
  subject: Subject,
  updateFunction: (rdf: string) => Subject,
  rdf: string,
  entities: Array<Entity>,
  setEntities: (newEntities: Array<Entity>) => void
) => {
  debug("update with RDF:", rdf)
  const nEnt = entities.findIndex((e) => e.subjectQname === subject.qname)
  if (nEnt >= 0 && entities[nEnt].subject) {
    const subject = entities[nEnt].subject
    if (subject) {
      const newSubject = updateFunction.call(subject, rdf)
      const newEntities = [...entities]
      newEntities[nEnt] = { ...entities[nEnt], subject: newSubject }
      setEntities(newEntities)
    }
  }
}
*/

const debug = require("debug")("bdrc:entity:property:litlist")

const generateDefault = (property: PropertyShape, parent: Subject): Value => {
  switch (property.objectType) {
    case ObjectType.ResExt:
      /*
      // to speed up dev/testing
      return new ExtRDFResourceWithLabel("bdr:P2JM192", { "en":"Delek Gyatso", "bo-x-ewts":"bde legs rgya mtsho/" },
        { PersonBirth: { onYear: "1724" }, PersonDeath: { onYear: "1777" } })
      */

      // TODO might be a better way but "" isn't authorized
      return new ExtRDFResourceWithLabel("tmp:uri", {})
      break
    case ObjectType.Facet:
      return generateNew("EV", property.targetShape, parent)
      break
    case ObjectType.ResInList:
      const propIn: Array<RDFResourceWithLabel> | null = property.in
      if (!propIn) throw "can't find a list for " + property.uri
      return propIn[0]
      break
    case ObjectType.Literal:
    default:
      if (property.datatype == ns.RDF("langString")) {
        return new LiteralWithId("", "bo-x-ewts")
      } else {
        return new LiteralWithId("", null, property.datatype ? property.datatype : undefined)
      }
      break
  }
}

/**
 * List component
 */

const ValueList: FC<{
  subject: Subject
  property: PropertyShape
  embedded?: boolean
  force?: boolean
  editable: boolean
  owner?: Subject
}> = ({ subject, property, embedded, force, editable, owner }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  //debug(subject)
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)
  const propLabel = lang.ValueByLangToStrPrefLang(property.prefLabels, uiLang)

  const alreadyHasEmptyValue: () => boolean = (): boolean => {
    for (const val of list) {
      if (val instanceof LiteralWithId && val.value === "") return true
    }
    return false
  }

  // TODO: handle the creation of a new value in a more sophisticated way (with the iframe and such)
  const canAdd =
    alreadyHasEmptyValue() ||
    property.readOnly && property.readOnly === true ||
    property.displayPriority && property.displayPriority > 1
      ? false
      : property.objectType != ObjectType.ResExt && property.maxCount
      ? list.length < property.maxCount
      : true

  const canDel = (!property.minCount || property.minCount < list.length) && !property.readOnly && editable

  // DONE save multiple external resource for property
  const onChange: (value: RDFResourceWithLabel, idx: number, removeFirst: boolean | undefined) => void = (
    value: RDFResourceWithLabel,
    idx: number,
    removeFirst: boolean | undefined
  ) => {
    const newList = replaceItemAtIndex(list, idx, value)
    //if(removeFirst) newList.shift()
    setList(newList)
  }

  // DONE prevent adding same resource twice
  const exists: (uri: string) => boolean = (uri: string): boolean => {
    for (const val of list) {
      if (val instanceof RDFResourceWithLabel && val.uri === uri) return true
    }
    return false
  }

  let firstValueIsEmptyField = true

  useEffect(() => {
    // TODO: check maxCount
    if (list.length) {
      const first = list[0]
      if (first instanceof ExtRDFResourceWithLabel && first.uri !== "tmp:uri") firstValueIsEmptyField = false
    }

    // reinitializing the property values atom if it hasn't been initialized yet
    const vals: Array<Value> | null = subject.getUnitializedValues(property)
    if (vals && vals.length) {
      if (property.minCount && vals.length < property.minCount) {
        setList([...vals, generateDefault(property, subject)])
      } else {
        setList(vals)
      }
    } else if (
      property.objectType != ObjectType.Facet &&
      (!property.displayPriority ||
        property.displayPriority === 0 ||
        property.displayPriority === 1 && (list.length || force)) &&
      (property.minCount && list.length < property.minCount || !list.length || !firstValueIsEmptyField) &&
      (!property.maxCount || property.maxCount >= list.length)
    ) {
      if (!firstValueIsEmptyField) setList((oldList) => [generateDefault(property, subject), ...oldList])
      else setList((oldList) => [...oldList, generateDefault(property, subject)])
    } else if (property.displayPriority && property.displayPriority === 1 && list.length === 1 && !force) {
      if (firstValueIsEmptyField) setList([])
    }
  }, [subject, list, force])

  let addBtn = property.objectType === ObjectType.Facet

  //debug("prop:", property.qname, subject, property, force)

  /* eslint-disable no-magic-numbers */
  const showLabel =
    !property.displayPriority ||
    property.displayPriority === 0 ||
    property.displayPriority === 1 && (force || list.length > 1) ||
    property.displayPriority === 2 && list.length >= 1

  const isEmptyValue = (val: Value): boolean => {
    if (val instanceof RDFResourceWithLabel) return val.uri === "tmp:uri"
    else if (val instanceof LiteralWithId) return !val.value && !val.language
    return false
  }
  const isErrorValue = (val: Value): boolean => {
    // TODO: to be continued
    if (val instanceof LiteralWithId && property?.datatype?.value === ns.RDF("langString").value) return !val.value
    return false
  }

  // scroll back to top when loosing focus
  const scrollElem = useRef<null | HTMLDivElement>(null)
  const [edit, setEdit] = useRecoilState(uiEditState)
  useEffect(() => {
    if (property?.group?.value !== edit && scrollElem?.current) {
      scrollElem.current.scrollTo({ top: 0, left: 0, behavior: "smooth" })
    }
  }, [edit])

  const hasEmptyExtEntityAsFirst =
    list.length > 0 &&
    list[0] instanceof RDFResourceWithLabel &&
    property.objectType == ObjectType.ResExt &&
    list[0].uri === "tmp:uri"

  const renderListElem = (val: Value, i: number) => {
    if (val instanceof RDFResourceWithLabel) {
      if (property.objectType == ObjectType.ResExt)
        return (
          <ExtEntityComponent
            key={val.id + ":" + i}
            subject={subject}
            property={property}
            extRes={val as ExtRDFResourceWithLabel}
            canDel={canDel && (i > 0 || val.uri !== "tmp:uri")}
            onChange={onChange}
            idx={i}
            exists={exists}
            editable={editable}
            {...(owner ? { owner } : {})}
          />
        )
      else {
        addBtn = true
        return (
          <ResSelectComponent
            key={val.id}
            subject={subject}
            property={property}
            res={val}
            canDel={canDel}
            editable={editable}
          />
        )
      }
    } else if (val instanceof Subject) {
      addBtn = true
      return (
        <FacetComponent
          key={val.id}
          subject={subject}
          property={property}
          subNode={val}
          canDel={canDel && editable}
          {...(force ? { force } : {})}
          editable={editable}
        />
      )
    } else if (val instanceof LiteralWithId) {
      addBtn = val && val.value !== ""
      const isUnique =
        list.filter((l) => l instanceof LiteralWithId && /*l.value === val.value &&*/ l.language === val.language)
          .length === 1
      return (
        <LiteralComponent
          key={val.id}
          subject={subject}
          property={property}
          lit={val}
          label={propLabel}
          canDel={canDel}
          isUnique={isUnique}
          create={<Create disable={!canAdd || !addBtn} subject={subject} property={property} embedded={embedded} />}
          editable={editable}
        />
      )
    }
  }

  return (
    <React.Fragment>
      <div
        className={
          "ValueList " +
          (property.maxCount && property.maxCount < list.length ? "maxCount" : "") +
          (list.filter((v) => !isEmptyValue(v) || isErrorValue(v)).length ? "" : "empty") +
          (property.objectType === ObjectType.ResExt ? " ResExt" : "") +
          (embedded ? "" : " main")
        }
        role="main"
        style={{
          display: "flex",
          flexWrap: "wrap",
          ...list.length > 1 && firstValueIsEmptyField && property.path.sparqlString !== ns.SKOS("prefLabel").value
            ? {
                /*borderBottom: "2px solid #eee", paddingBottom: "16px"*/
              }
            : {},
        }}
      >
        {showLabel && <label className="propLabel">{propLabel[0].toUpperCase() + propLabel.substring(1)}</label>}
        {hasEmptyExtEntityAsFirst && <div style={{ width: "100%" }}>{renderListElem(list[0], 0)}</div>}
        <div
          ref={scrollElem}
          className={!embedded && property.objectType !== ObjectType.Facet ? "overFauto" : ""}
          style={{
            width: "100%",
            ...!embedded && property.objectType !== ObjectType.Facet ? { maxHeight: "338px" } : {},
            ...property?.group?.value !== edit ? { paddingRight: "0.5rem" } : {},
          }}
        >
          {list.map((val, i) => {
            if (!hasEmptyExtEntityAsFirst || i > 0) return renderListElem(val, i)
          })}
        </div>
      </div>
      {canAdd && addBtn && <Create subject={subject} property={property} embedded={embedded} />}
    </React.Fragment>
  )
}

/**
 * Create component
 */
const Create: FC<{ subject: Subject; property: PropertyShape; embedded?: boolean; disable?: boolean }> = ({
  subject,
  property,
  embedded,
  disable,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [edit, setEdit] = useRecoilState(uiEditState)

  const addItem = () => {
    const item = generateDefault(property, subject)
    setList((oldList) => [...oldList, item])
    if (property.objectType === ObjectType.Facet && item instanceof Subject) {
      //setEdit(property.qname+item.qname)  // won't work...
      setImmediate(() => {
        setEdit(property.qname + item.qname)
      }) // this must be "delayed" to work
    }
  }

  if (embedded || property.path.sparqlString === ns.SKOS("prefLabel").value)
    return <MinimalAddButton disable={disable} add={addItem} className=" " />
  else return <BlockAddButton add={addItem} /*label={lang.ValueByLangToStrPrefLang(property.prefLabels, uiLang)}*/ />
}

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiFormHelperText-root": {
      color: theme.palette.secondary.main,
    },
  },
}))

export const langs = [
  { value: "bo-x-ewts" },
  { value: "bo" },
  { value: "en" },
  { value: "zh-hans" },
  { value: "zh-hant" },
]

/**
 * Edit component
 */
const EditLangString: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
  globalError?: string
  editable?: boolean
}> = ({ property, lit, onChange, label, globalError, editable }) => {
  const classes = useStyles()
  const [preview, setPreview] = useState(false)
  const [editMD, setEditMD] = useState(false)

  let error = ""
  if (!lit.value) error = i18n.t("error.empty")
  else if (globalError) error = globalError

  const errorData = {
    helperText: (
      <React.Fragment>
        <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
        &nbsp;<i>{error}</i>
      </React.Fragment>
    ),
    error: true,
  }

  let padBot = "0px"
  if (preview && lit.language === "bo-x-ewts") {
    padBot = "34px"
  } else if (property.singleLine && editMD) {
    padBot = "1px"
  }

  return (
    <div
      className="mb-0"
      style={{
        display: "flex",
        width: "100%",
        alignItems: "flex-end",
        paddingBottom: padBot,
        position: "relative",
      }}
    >
      {(property.singleLine || !editMD) && (
        <div style={{ width: "100%", position: "relative" }}>
          <TextField
            className={"preview-" + preview + (lit.language === "bo" ? " lang-bo" : "")} //classes.root }
            //label={lit.id}
            label={"Text"}
            style={{ width: "100%" }}
            value={lit.value}
            multiline={!property.singleLine}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => onChange(lit.copyWithUpdatedValue(e.target.value))}
            {...(error ? errorData : {})}
            {...(!editable ? { disabled: true } : {})}
          />
          {!property.singleLine && (
            <span
              className={"opaHover"}
              style={{ position: "absolute", right: 0, top: 0, fontSize: "0px", cursor: "pointer" }}
              onClick={() => setEditMD(!editMD)}
            >
              {!editMD && <MDIcon style={{ height: "16px" }} />}
              {editMD && <MDIcon style={{ height: "16px" }} />}
            </span>
          )}
        </div>
      )}
      {!property.singleLine && editMD && (
        <div style={{ width: "100%", position: "relative" }}>
          <MDEditor
            minHeight={120}
            height={120}
            maxHeight={1000}
            value={lit.value}
            onChange={(e) => {
              if (e) onChange(lit.copyWithUpdatedValue(e))
            }}
          />
          <span
            className={"opaHover on"}
            style={{ position: "absolute", right: "5px", top: "11px", fontSize: "0px", cursor: "pointer" }}
            onClick={() => setEditMD(!editMD)}
          >
            <MDIcon style={{ height: "14px" }} />
          </span>
        </div>
      )}
      <LangSelect
        value={lit.language || ""}
        onChange={(value) => {
          if (preview) setPreview(false)
          onChange(lit.copyWithUpdatedLanguage(value))
        }}
        {...(error ? { error: true } : {})}
        editable={editable}
        preview={preview}
        updatePreview={setPreview}
      />
      {preview &&
        lit.language === "bo-x-ewts" && ( // TODO see if fromWylie & MD can both be used ('escape' some chars?)
          <div style={{ width: "100%", position: "absolute", bottom: 0, opacity: "55%", fontSize: "20px" }}>
            {fromWylie(lit.value)}
            {/*editMD && <MDEditor.Markdown source={fromWylie(lit.value)} /> // not really working  */}
          </div>
        )}
    </div>
  )
}

export const LangSelect: FC<{
  onChange: (value: string) => void
  value: string
  disabled?: boolean
  error?: boolean
  editable?: boolean
  preview?: boolean
  updatePreview?: React.Dispatch<React.SetStateAction<boolean>>
}> = ({ onChange, value, disabled, error, editable, preview, updatePreview }) => {
  const onChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange(event.target.value as string)
  }
  return (
    <div style={{ position: "relative" }}>
      <TextField
        select
        InputLabelProps={{ shrink: true }}
        className={"ml-2"}
        //label={lit.id}
        label={"Language"}
        value={value}
        style={{ minWidth: 100, flexShrink: 0 }}
        onChange={onChangeHandler}
        {...(disabled ? { disabled: true } : {})}
        {...(error ? { error: true, helperText: <br /> } : {})}
        {...(!editable ? { disabled: true } : {})}
      >
        {langs.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.value}
          </MenuItem>
        ))}
      </TextField>
      {updatePreview && value === "bo-x-ewts" && (
        <span
          style={{ position: "absolute", right: 0, top: 0, fontSize: "0px", cursor: "pointer" }}
          {...(updatePreview ? { onClick: () => updatePreview(!preview) } : {})}
        >
          {!preview && <VisibilityIcon style={{ height: "16px", color: "#aaa" }} />}
          {preview && <VisibilityOffIcon style={{ height: "16px", color: "#333" }} />}
        </span>
      )}
    </div>
  )
}

const EditString: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
  editable?: boolean
}> = ({ property, lit, onChange, label, editable }) => {
  const classes = useStyles()

  const dt = property.datatype

  const changeCallback = (val: string) => {
    onChange(lit.copyWithUpdatedValue(val))
  }
  return (
    <TextField
      //className={/*classes.root +*/ " mt-2"}
      label={label}
      style={{ width: "100%" }}
      value={lit.value}
      InputLabelProps={{ shrink: true }}
      onChange={(e) => changeCallback(e.target.value)}
      {...(!editable ? { disabled: true } : {})}
    />
  )
}

const EditBool: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
  editable?: boolean
}> = ({ property, lit, onChange, label, editable }) => {
  const classes = useStyles()

  const dt = property.datatype

  const changeCallback = (val: string) => {
    onChange(lit.copyWithUpdatedValue(val))
  }
  return (
    <TextField
      select
      label={i18n.t("types.boolean")}
      value={!lit.value ? false : true}
      InputLabelProps={{ shrink: true }}
      onChange={(e) => changeCallback(e.target.value)}
      {...(!editable ? { disabled: true } : {})}
    >
      {["true", "false"].map((v) => (
        <MenuItem key={v} value={v}>
          {i18n.t("types." + v)}
        </MenuItem>
      ))}
    </TextField>
  )
}

const EditInt: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
  editable?: boolean
}> = ({ property, lit, onChange, label, editable }) => {
  // used for integers and gYear

  const classes = useStyles()

  const dt = property.datatype
  const minInclusive = property.minInclusive
  const maxInclusive = property.maxInclusive

  let error
  if (lit.value) {
    const valueInt = parseInt(lit.value)
    if (minInclusive && minInclusive > valueInt) {
      error = i18n.t("error.superiorTo", { val: minInclusive })
    } else if (maxInclusive && maxInclusive < valueInt) {
      error = i18n.t("error.inferiorTo", { val: maxInclusive })
    }
  }

  const changeCallback = (val: string) => {
    if (dt && dt.value == xsdgYear) {
      //pad to four digits in the case of xsdgYear
      /* eslint-disable no-magic-numbers */
      if (val.startsWith("-")) {
        val = "-" + val.substring(1).padStart(4, "0")
      } else {
        val = val.padStart(4, "0")
      }
      /* eslint-enable no-magic-numbers */
      if (val.match(/^-?[0-9]{4}$/)) error = i18n.t("error.gYear")
    }
    onChange(lit.copyWithUpdatedValue(val))
  }

  let value = lit.value
  if (dt && dt.value == xsdgYear) {
    // don't display the leading 0
    value = value.replace(/^(-?)0+/, "$1")
  }

  return (
    <TextField
      //className={/*classes.root +*/ " mt-2"}
      //label={label}
      label={"Number"}
      style={{ width: 150 }}
      value={value}
      {...(error
        ? {
            helperText: (
              <React.Fragment>
                {/*eventType*/ "Number"} <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
                <br />
                <i>{error}</i>
              </React.Fragment>
            ),
            error: true,
          }
        : {})}
      type="number"
      InputProps={{ inputProps: { min: minInclusive, max: maxInclusive } }}
      InputLabelProps={{ shrink: true }}
      onChange={(e) => changeCallback(e.target.value)}
      {...(!editable ? { disabled: true } : {})}
    />
  )
}

const xsdgYear = ns.XSD("gYear").value
const rdflangString = ns.RDF("langString").value
const xsdinteger = ns.XSD("integer").value
const xsddecimal = ns.XSD("decimal").value
const xsdint = ns.XSD("int").value
const xsdboolean = ns.XSD("boolean").value

const intishTypeList = [xsdinteger, xsddecimal, xsdint]

/**
 * Display component, with DeleteButton
 */
const LiteralComponent: FC<{
  lit: LiteralWithId
  subject: Subject
  property: PropertyShape
  label: string
  canDel: boolean
  isUnique: boolean
  create?: unknown
  editable: boolean
}> = ({ lit, subject, property, label, canDel, isUnique, create, editable }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const index = list.findIndex((listItem) => listItem === lit)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const onChange: (value: LiteralWithId) => void = (value: LiteralWithId) => {
    const newList = replaceItemAtIndex(list, index, value)
    setList(newList)
  }

  const deleteItem = () => {
    /* // no need for updateEntitiesRDF
    const rdf =
      "<" +
      subject.uri +
      "> <" +
      property?.path?.sparqlString +
      '> "' +
      lit.value +
      '"' +
      (lit.language ? "@" + lit.language : "") +
      "."
    debug("delI", rdf)
    updateEntitiesRDF(subject, subject.removeWithTTL, rdf, entities, setEntities)
    */
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  const t = property.datatype
  let edit, classN

  if (t?.value === rdflangString) {
    classN = "langString"
    edit = (
      <EditLangString
        property={property}
        lit={lit}
        onChange={onChange}
        label={"Text"}
        {...(property.uniqueLang && !isUnique ? { globalError: i18n.t("error.unique") } : {})}
        editable={editable && !property.readOnly}
      />
    )
    // eslint-disable-next-line no-extra-parens
  } else if (t?.value === xsdgYear || (t && t?.value in intishTypeList)) {
    classN = "gYear"
    edit = (
      <EditInt
        property={property}
        lit={lit}
        onChange={onChange}
        label={label}
        editable={editable && !property.readOnly}
      />
    )
  } else if (t?.value === xsdboolean) {
    edit = (
      <EditBool
        property={property}
        lit={lit}
        onChange={onChange}
        label={label}
        editable={editable && !property.readOnly}
      />
    )
  } else {
    edit = (
      <EditString
        property={property}
        lit={lit}
        onChange={onChange}
        label={label}
        editable={editable && !property.readOnly}
      />
    )
  }

  return (
    <div className={classN} style={{ display: "flex", alignItems: "flex-end" /*, width: "100%"*/ }}>
      {edit}
      <div className="hoverPart">
        <button className="btn btn-link ml-2 px-0" onClick={deleteItem} {...(!canDel ? { disabled: true } : {})}>
          <RemoveIcon />
        </button>
        {create}
      </div>
    </div>
  )
}

//TODO: should probably go to another file
const FacetComponent: FC<{
  subNode: Subject
  subject: Subject
  property: PropertyShape
  canDel: boolean
  //force?: boolean
  editable: boolean
}> = ({ subNode, subject, property, canDel, /*force,*/ editable }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)
  const index = list.findIndex((listItem) => listItem === subNode)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const deleteItem = () => {
    /* // no need for updateEntitiesRDF
    const rdf =
      "<" + subject.uri + "> <" + property?.path?.sparqlString + "> <" + ns.uriFromQname(subNode.qname) + "> ."
    debug("delI", rdf)
    updateEntitiesRDF(subject, subject.removeWithTTL, rdf, entities, setEntities)
    */
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  const targetShape = property.targetShape
  if (!targetShape) throw "unable to find target shape of " + property.lname

  const targetShapeLabel = lang.ValueByLangToStrPrefLang(targetShape.prefLabels, uiLang)

  const withDisplayPriority: PropertyShape[] = [],
    withoutDisplayPriority: PropertyShape[] = []
  targetShape.properties.map((subprop) => {
    if (subprop.displayPriority && subprop.displayPriority >= 1) {
      withDisplayPriority.push(subprop)
    } else {
      withoutDisplayPriority.push(subprop)
    }
  })

  const [force, setForce] = useState(false)
  const hasExtra = withDisplayPriority.length > 0 // && isSimplePriority
  const toggleExtra = () => {
    setForce(!force)
  }

  const [edit, setEdit] = useRecoilState(uiEditState)

  //debug("facet:", edit, property.qname, withDisplayPriority, withoutDisplayPriority)

  return (
    <React.Fragment>
      <div
        className={"facet " + (edit === property?.qname + subNode.qname ? "edit" : "") + " editable-" + editable}
        onClick={(e) => {
          setEdit(property.qname + subNode.qname)
          e.stopPropagation()
        }}
      >
        <div className={"card pt-2 pb-3 pr-3 mt-2 pl-2 " + (hasExtra ? "hasDisplayPriority" : "")}>
          {hasExtra && (
            <span className="toggle-btn" onClick={toggleExtra}>
              {i18n.t("general.toggle", { show: force ? i18n.t("general.hide") : i18n.t("general.show") })}
            </span>
          )}
          {withoutDisplayPriority.map((p, index) => (
            <PropertyContainer
              key={p.uri}
              property={p}
              subject={subNode}
              embedded={true}
              force={force}
              editable={editable && !property.readOnly}
              owner={subject}
            />
          ))}
          {withDisplayPriority.map((p, index) => (
            <PropertyContainer
              key={p.uri}
              property={p}
              subject={subNode}
              embedded={true}
              force={force}
              editable={editable && !property.readOnly}
              owner={subject}
            />
          ))}
          <div className="close-btn">
            <button className="btn btn-link ml-2 px-0" onClick={deleteItem} {...(!canDel ? { disabled: true } : {})}>
              <CloseIcon />
            </button>
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

//TODO: component to display an external entity that has already been selected, with a delete button to remove it
// There should probably be a ExtEntityCreate or something like that to allow an entity to be selected
const ExtEntityComponent: FC<{
  extRes: ExtRDFResourceWithLabel
  subject: Subject
  property: PropertyShape
  canDel: boolean
  onChange: (value: ExtRDFResourceWithLabel, idx: number, removeFirst: boolean | undefined) => void
  idx: number
  exists: (uri: string) => boolean
  editable: boolean
  owner?: Subject
}> = ({ extRes, subject, property, canDel, onChange, idx, exists, editable, owner }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const index = list.findIndex((listItem) => listItem === extRes)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const deleteItem = () => {
    let newList = removeItemAtIndex(list, index)
    // DONE: remove first empty field if alone & displayPriority >= 1
    if (idx === 1 && newList.length === 1) {
      const first = newList[0]
      if (first instanceof ExtRDFResourceWithLabel && first.uri === "tmp:uri") newList = []
    }
    setList(newList)

    /* // no need for updateEntitiesRDF

    // DONE: update entity at RDF level
    // (actually it was not enough, entity had also to be updated from Recoil/entities in top level Container)

    const rdf = "<" + subject.uri + "> <" + property?.path?.sparqlString + "> <" + ns.uriFromQname(extRes.qname) + "> ."
    updateEntitiesRDF(subject, subject.removeWithTTL, rdf, entities, setEntities)
    */
  }

  //, ...extRes.uri === "tmp:uri" ? { /*width: "100%"*/ } : {} }}>
  return (
    <div className={"extEntity" + (extRes.uri === "tmp:uri" ? " new" : "")} style={{ position: "relative" }}>
      <div
        style={{
          ...extRes.uri !== "tmp:uri"
            ? {
                display: "inline-flex",
                width: "auto",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
                border: "1px solid #ccc",
                flexDirection: "row",
                position: "static",
              }
            : {
                display: "flex",
              },
        }}
        {...(extRes.uri !== "tmp:uri" ? { className: "px-2 py-1 mr-2 mt-2 card" } : {})}
      >
        <ResourceSelector
          value={extRes}
          onChange={onChange}
          property={property}
          idx={idx}
          exists={exists}
          subject={subject}
          editable={editable}
          {...(owner ? { owner } : {})}
        />
        {extRes.uri !== "tmp:uri" && (
          <button className={"btn btn-link ml-2 px-0"} onClick={deleteItem} {...(!canDel ? { disabled: true } : {})}>
            {extRes.uri === "tmp:uri" ? <RemoveIcon /> : <CloseIcon />}
          </button>
        )}
      </div>
    </div>
  )
}

//TODO: component to display an external entity that has already been selected, with a delete button to remove it
// There should probably be a ExtEntityCreate or something like that to allow an entity to be selected
const ResSelectComponent: FC<{
  res: RDFResourceWithLabel
  subject: Subject
  property: PropertyShape
  canDel: boolean
  editable: boolean
}> = ({ res, subject, property, canDel, editable }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)
  const index = list.findIndex((listItem) => listItem === res)

  const propLabel = lang.ValueByLangToStrPrefLang(property.prefLabels, uiLang)

  const possibleValues = property.in
  if (!possibleValues) throw "can't find possible list for " + property.uri

  const deleteItem = () => {
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  const getResourceFromUri = (uri: string) => {
    for (const r of possibleValues) {
      if (r.uri === uri) {
        return r
      }
    }
    return null
  }

  const onChange: (event: ChangeEvent<{ name?: string | undefined; value: unknown }>) => void = (event) => {
    const resForNewValue = getResourceFromUri(event.target.value as string)
    if (resForNewValue == null) {
      throw "getting value from ResSelectComponent that's not in the list of possible values " + event.target.value
    }
    const newList = replaceItemAtIndex(list, index, resForNewValue)
    setList(newList)
  }

  const classes = useStyles()

  return (
    <React.Fragment>
      <TextField
        select
        className={/*classes.root +*/ "selector mr-2"}
        value={res.uri}
        style={{ padding: "1px" }}
        onChange={onChange}
        label="Select"
        {...(!editable ? { disabled: true } : {})}
      >
        {possibleValues.map((r) => (
          <MenuItem key={r.uri} value={r.uri}>
            {lang.ValueByLangToStrPrefLang(r.prefLabels, uiLang)}
          </MenuItem>
        ))}
      </TextField>
      {canDel && (
        <button className="btn btn-link ml-0 mr-3 px-0" onClick={deleteItem}>
          <RemoveIcon />
        </button>
      )}
    </React.Fragment>
  )
}

export default ValueList
