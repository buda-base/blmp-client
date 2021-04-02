import React, { useEffect, FC, ChangeEvent } from "react"
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
import { AddIcon, RemoveIcon, ErrorIcon, CloseIcon } from "../../layout/icons"
import i18n from "i18next"
import PropertyContainer from "./PropertyContainer"
import * as lang from "../../../helpers/lang"
import { uiLangState } from "../../../atoms/common"
import ResourceSelector from "./ResourceSelector"
import { entitiesAtom } from "../../../containers/EntitySelectorContainer"

export const MinimalAddButton: FC<{ add: React.MouseEventHandler<HTMLButtonElement>; className: string }> = ({
  add,
  className,
}) => {
  return (
    <div className={className !== undefined ? className : "text-right"} style={{ width: "100%" }}>
      <button className="btn btn-link ml-2 px-0" onClick={add}>
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
    <div className="blockAdd text-center pb-1" style={{ width: "100%" }}>
      <button
        className="btn btn-sm btn-block btn-outline-primary mb-2 px-0"
        style={{ boxShadow: "none" }}
        onClick={add}
      >
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

const ValueList: FC<{ subject: Subject; property: PropertyShape; embedded?: boolean; force?: boolean }> = ({
  subject,
  property,
  embedded,
  force,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  //debug(subject)
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)
  const propLabel = lang.ValueByLangToStrPrefLang(property.prefLabels, uiLang)

  // TODO: handle the creation of a new value in a more sophisticated way (with the iframe and such)
  const canAdd = property.objectType != ObjectType.ResExt && property.maxCount ? list.length < property.maxCount : true

  const canDel = !property.minCount || property.minCount < list.length

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
      (!property.displayPriority || property.displayPriority === 0 || list.length || force) &&
      (property.minCount && list.length < property.minCount || !list.length || !firstValueIsEmptyField)
    ) {
      if (!firstValueIsEmptyField) setList((oldList) => [generateDefault(property, subject), ...oldList])
      else setList((oldList) => [...oldList, generateDefault(property, subject)])
    } else if (property.displayPriority && property.displayPriority >= 1 && list.length === 1 && !force) {
      if (firstValueIsEmptyField) setList([])
    }
  }, [subject, list, force])

  let addBtn = property.objectType === ObjectType.Facet

  return (
    <React.Fragment>
      <div
        role="main"
        style={{
          display: "flex",
          flexWrap: "wrap",
          ...list.length > 1 && firstValueIsEmptyField
            ? { borderBottom: "2px solid #eee", paddingBottom: "16px" }
            : {},
        }}
      >
        {list.map((val, i) => {
          if (val instanceof RDFResourceWithLabel) {
            if (property.objectType == ObjectType.ResExt)
              return (
                <ExtEntityComponent
                  key={val.id + ":" + i}
                  subject={subject}
                  property={property}
                  extRes={val as ExtRDFResourceWithLabel}
                  canDel={canDel && i > 0 || val.uri !== "tmp:uri"}
                  onChange={onChange}
                  idx={i}
                  exists={exists}
                />
              )
            else
              return <ResSelectComponent key={val.id} subject={subject} property={property} res={val} canDel={canDel} />
          }
          if (val instanceof Subject) {
            addBtn = true
            return <FacetComponent key={val.id} subject={subject} property={property} subNode={val} canDel={canDel} />
          } else if (val instanceof LiteralWithId) {
            addBtn = val && val.value !== ""
            return (
              <LiteralComponent
                key={val.id}
                subject={subject}
                property={property}
                lit={val}
                label={propLabel}
                canDel={canDel}
              />
            )
          }
        })}
      </div>
      {canAdd && addBtn && <Create subject={subject} property={property} embedded={embedded} />}
    </React.Fragment>
  )
}

/**
 * Create component
 */
const Create: FC<{ subject: Subject; property: PropertyShape; embedded?: boolean }> = ({
  subject,
  property,
  embedded,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)

  const addItem = () => {
    setList((oldList) => [...oldList, generateDefault(property, subject)])
  }

  if (embedded)
    // || property.path.sparqlString === ns.SKOS("prefLabel").value)
    return <MinimalAddButton add={addItem} className=" " />
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
}> = ({ property, lit, onChange, label }) => {
  const classes = useStyles()

  let error
  if (!lit.value) error = i18n.t("error.empty")

  return (
    <div className="mb-2" style={{ display: "flex", width: "100%", alignItems: "end" }}>
      <TextField
        className={classes.root}
        //label={lit.id}
        helperText={label}
        style={{ width: "100%" }}
        value={lit.value}
        InputLabelProps={{ shrink: true }}
        onChange={(e) => onChange(lit.copyWithUpdatedValue(e.target.value))}
        {...(error
          ? {
              helperText: (
                <React.Fragment>
                  {label} <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
                  <br />
                  <i>{error}</i>
                </React.Fragment>
              ),
              error: true,
            }
          : {})}
      />
      <LangSelect value={lit.language || ""} onChange={(value) => onChange(lit.copyWithUpdatedLanguage(value))} />
    </div>
  )
}

export const LangSelect: FC<{
  onChange: (value: string) => void
  value: string
  disabled?: boolean
}> = ({ onChange, value, disabled }) => {
  const onChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange(event.target.value as string)
  }
  return (
    <TextField
      select
      className="ml-2"
      //label={lit.id}
      helperText={"Language"}
      value={value}
      style={{ width: 100, flexShrink: 0 }}
      onChange={onChangeHandler}
      {...(disabled ? { disabled: true } : {})}
    >
      {langs.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.value}
        </MenuItem>
      ))}
    </TextField>
  )
}

const EditYear: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
}> = ({ property, lit, onChange, label }) => {
  const classes = useStyles()

  let error
  if (lit.value && !lit.value.match(/^-?[0-9]{4}$/)) error = i18n.t("error.gYear")

  const eventType = "<the event type/s>"

  return (
    <TextField
      className={classes.root + " mt-2"}
      label={label}
      helperText={eventType}
      style={{ width: 150 }}
      value={lit.value}
      {...(error
        ? {
            helperText: (
              <React.Fragment>
                {eventType} <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
                <br />
                <i>{error}</i>
              </React.Fragment>
            ),
            error: true,
          }
        : {})}
      type="number"
      InputProps={{ inputProps: { min: -2000, max: 2100 } }}
      InputLabelProps={{ shrink: true }}
      onChange={(e) => onChange(lit.copyWithUpdatedValue(e.target.value))}
    />
  )
}

/**
 * Display component, with DeleteButton
 */
const LiteralComponent: FC<{
  lit: LiteralWithId
  subject: Subject
  property: PropertyShape
  label: string
  canDel: boolean
}> = ({ lit, subject, property, label, canDel }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const index = list.findIndex((listItem) => listItem === lit)

  const onChange: (value: LiteralWithId) => void = (value: LiteralWithId) => {
    const newList = replaceItemAtIndex(list, index, value)
    setList(newList)
  }

  const deleteItem = () => {
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  const t = property.datatype
  let edit

  if (t?.value === ns.RDF("langString").value)
    edit = <EditLangString property={property} lit={lit} onChange={onChange} label={label} />
  else if (t?.value === ns.XSD("gYear").value)
    edit = <EditYear property={property} lit={lit} onChange={onChange} label={label} />
  else throw "literal with unknown datatype value:" + JSON.stringify(t)
  //else if (t?.value === ns.RDF("type").value)
  //  edit = <EditType property={property} lit={lit} onChange={onChange} label={label} />

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {edit}
      {canDel && (
        <button className="btn btn-link ml-2 px-0 mb-3" onClick={deleteItem}>
          <RemoveIcon />
        </button>
      )}
    </div>
  )
}

//TODO: should probably go to another file
const FacetComponent: FC<{ subNode: Subject; subject: Subject; property: PropertyShape; canDel: boolean }> = ({
  subNode,
  subject,
  property,
  canDel,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)
  const index = list.findIndex((listItem) => listItem === subNode)

  const deleteItem = () => {
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  const targetShape = property.targetShape
  if (!targetShape) throw "unable to find target shape of " + property.lname

  const targetShapeLabel = lang.ValueByLangToStrPrefLang(targetShape.prefLabels, uiLang)

  return (
    <div className="facet mb-4 py-2" style={{ borderBottom: "2px solid rgb(238, 238, 238)", width: "100%" }}>
      <div>
        {targetShape.properties.map((p, index) => (
          <PropertyContainer key={p.uri} property={p} subject={subNode} embedded={true} />
        ))}
      </div>
      {canDel && (
        <div className="text-center">
          <button className="btn btn-link ml-2 px-0" onClick={deleteItem}>
            <RemoveIcon />
          </button>
        </div>
      )}
    </div>
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
}> = ({ extRes, subject, property, canDel, onChange, idx, exists }) => {
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

    // DONE: update entity at RDF level
    // (actually it was not enough, entity had also to be updated from Recoil/entities in top level Container)

    const nEnt = entities.findIndex((e) => e.subjectQname === subject.qname)
    if (nEnt >= 0 && entities[nEnt].subject) {
      const subject = entities[nEnt].subject
      if (subject) {
        debug("subject to update:", subject.graph.store.statements)
        const newSubject = subject.removeWithTTL(
          "<" + subject.uri + "> <" + property?.path?.sparqlString + "> <" + ns.uriFromQname(extRes.qname) + "> ."
        )
        const newEntities = [...entities]
        newEntities[nEnt] = { ...entities[nEnt], subject: newSubject }
        setEntities(newEntities)
      }
    }
  }

  return (
    <div style={{ position: "relative", ...extRes.uri === "tmp:uri" ? { width: "100%" } : {} }}>
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
            : {},
          ...extRes.uri === "tmp:uri" ? { display: "flex" } : {},
        }}
        {...(extRes.uri !== "tmp:uri" ? { className: "px-2 py-1 mr-2 mb-2 card" } : {})}
      >
        <ResourceSelector value={extRes} onChange={onChange} p={property} idx={idx} exists={exists} subject={subject} />
        {canDel && (
          <button className="btn btn-link ml-2 px-0" onClick={deleteItem}>
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
}> = ({ res, subject, property, canDel }) => {
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
        className={classes.root + " mr-2"}
        value={res.uri}
        style={{ width: 150 }}
        onChange={onChange}
        helperText="Type"
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
