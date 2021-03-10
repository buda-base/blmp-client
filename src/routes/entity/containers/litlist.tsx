import React, { useEffect, FC, ChangeEvent } from "react"
import PropTypes from "prop-types"
import * as rdf from "rdflib"
import {
  LiteralWithId,
  PropertyShape,
  Subject,
  Value,
  ObjectType,
  RDFResourceWithLabel,
} from "../../../helpers/rdf/types"
import * as ns from "../../../helpers/rdf/ns"
import { generateNew } from "../../../helpers/rdf/construct"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem, InputLabel, Select } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../helpers/atoms"
import { AddIcon, RemoveIcon, ErrorIcon } from "../../layout/icons"
import i18n from "i18next"
import PropertyContainer from "./PropertyContainer"
import * as lang from "../../../helpers/lang"
import { uiLangState } from "../../../atoms/common"
import * as constants from "../../helpers/vocabulary"
import { MinimalAddButton, BlockAddButton } from "../../helpers/shapes/bdo/event.js"

const debug = require("debug")("bdrc:entity:property:litlist")

const generateDefault = (property: PropertyShape, parent: Subject): Value => {
  switch (property.objectType) {
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

const ValueList: FC<{ subject: Subject; property: PropertyShape; embedded?: boolean }> = ({
  subject,
  property,
  embedded,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.uri))
  const [uiLang] = useRecoilState(uiLangState)
  const propLabel = lang.ValueByLangToStrPrefLang(property.prefLabels, uiLang)

  // TODO: handle the creation of a new value in a more sophisticated way (with the iframe and such)
  const canAdd = property.objectType != ObjectType.ResExt && property.maxCount ? list.length < property.maxCount : true

  if (property.minCount && !list.length) {
    setList((oldList) => [...oldList, generateDefault(property, subject)])
  }

  useEffect(() => {
    // reinitializing the property values atom if it hasn't been initialized yet
    // TODO: this probably shouldn't appear in the history
    // initialize
    //if (!subject.hasBeenInitializedForProperty(property)) {
    //  subject.initForProperty(property)
    //  setList(subject.getPropValues(property.uri))
    //}
  }, [subject, setList])

  return (
    <React.Fragment>
      <div role="main">
        {list.map((val) => {
          if (val instanceof RDFResourceWithLabel) {
            if (property.objectType == ObjectType.ResExt)
              return <ExtEntityComponent key={val.id} subject={subject} property={property} extRes={val} />
            else return <ResSelectComponent key={val.id} subject={subject} property={property} res={val} />
          }
          if (val instanceof Subject)
            return <FacetComponent key={val.id} subject={subject} property={property} subNode={val} />
          else if (val instanceof LiteralWithId)
            return <LiteralComponent key={val.id} subject={subject} property={property} lit={val} label={propLabel} />
        })}
        {canAdd && <Create subject={subject} property={property} embedded={embedded} />}
      </div>
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
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.uri))

  const addItem = () => {
    setList((oldList) => [...oldList, generateDefault(property, subject)])
  }

  if (embedded || property.path.value === ns.SKOS("prefLabel").value)
    return <MinimalAddButton add={addItem} className=" " />
  else return <BlockAddButton add={addItem} />
}

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiFormHelperText-root": {
      color: theme.palette.secondary.main,
    },
  },
}))

const langs = [{ value: "bo-x-ewts" }, { value: "bo" }, { value: "en" }, { value: "zh-hans" }, { value: "zh-hant" }]

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
    <div className="mb-2" style={{ display: "flex", width: "100%" }}>
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
      <TextField
        select
        className="ml-2"
        //label={lit.id}
        value={lit.language || ""}
        style={{ width: 120 }}
        onChange={(e) => onChange(lit.copyWithUpdatedLanguage(e.target.value))}
        helperText="Language"
      >
        {langs.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.value}
          </MenuItem>
        ))}
      </TextField>
    </div>
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
  if (lit.value && !lit.value.match(/^[0-9]{4}$/)) error = i18n.t("error.gYear")

  const eventType = "<the event type>"

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
      InputLabelProps={{ shrink: true }}
      onChange={(e) => onChange(lit.copyWithUpdatedValue(e.target.value))}
    />
  )
}

/**
 * Display component, with DeleteButton
 */
const LiteralComponent: FC<{ lit: LiteralWithId; subject: Subject; property: PropertyShape; label: string }> = ({
  lit,
  subject,
  property,
  label,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.uri))
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
  //else if (t?.value === ns.RDF("type").value)
  //  edit = <EditType property={property} lit={lit} onChange={onChange} label={label} />

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {edit}
      <button className="btn btn-link ml-2 px-0 mb-3" onClick={deleteItem}>
        <RemoveIcon />
      </button>
    </div>
  )
}

//TODO: should probably go to another file
const FacetComponent: FC<{ subNode: Subject; subject: Subject; property: PropertyShape }> = ({
  subNode,
  subject,
  property,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.uri))
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
    <div className="mb-4 py-2" style={{ borderBottom: "2px solid rgb(238, 238, 238)" }}>
      <div>
        {targetShape.properties.map((p, index) => (
          <PropertyContainer key={p.uri} property={p} subject={subNode} embedded={true} />
        ))}
      </div>
      <div className="text-center">
        <button className="btn btn-link ml-2 px-0" onClick={deleteItem}>
          <RemoveIcon />
        </button>
      </div>
    </div>
  )
}

//TODO: component to display an external entity that has already been selected, with a delete button to remove it
// There should probably be a ExtEntityCreate or something like that to allow an entity to be selected
const ExtEntityComponent: FC<{ extRes: RDFResourceWithLabel; subject: Subject; property: PropertyShape }> = ({
  extRes,
  subject,
  property,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.uri))
  const [uiLang] = useRecoilState(uiLangState)
  const index = list.findIndex((listItem) => listItem === extRes)

  const deleteItem = () => {
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  return (
    <React.Fragment>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>External resource component</span>
        <button className="btn btn-link ml-2 px-0 float-right" onClick={deleteItem}>
          <RemoveIcon />
        </button>
      </div>
    </React.Fragment>
  )
}

//TODO: component to display an external entity that has already been selected, with a delete button to remove it
// There should probably be a ExtEntityCreate or something like that to allow an entity to be selected
const ResSelectComponent: FC<{ res: RDFResourceWithLabel; subject: Subject; property: PropertyShape }> = ({
  res,
  subject,
  property,
}) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.uri))
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
        label={null}
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

      <button className="btn btn-link ml-0 mr-3 px-0" onClick={deleteItem}>
        <RemoveIcon />
      </button>
    </React.Fragment>
  )
}

export default ValueList
