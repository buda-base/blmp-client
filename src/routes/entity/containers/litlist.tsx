import React, { useEffect, FC } from "react"
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
import { TextField, MenuItem } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../helpers/atoms"
import { AddIcon, RemoveIcon } from "../../layout/icons"
import i18n from "i18next"
import PropertyContainer from "./PropertyContainer"
import * as lang from "../../../helpers/lang"
import { uiLangState } from "../../../atoms/common"

const debug = require("debug")("bdrc:entity:property:litlist")

const generateDefault = (property: PropertyShape, parent: Subject): Value => {
  switch (property.objectType) {
    case ObjectType.Facet:
      const res = generateNew("EV", property.targetShape, parent)
      return res
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

const ValueList: FC<{ subject: Subject; property: PropertyShape }> = ({ subject, property }) => {
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.id))

  // TODO: handle the creation of a new value in a more sophisticated way (with the iframe and such)
  const canAdd = property.objectType != ObjectType.ResExt && property.maxCount ? list.length < property.maxCount : true

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
          if (val instanceof RDFResourceWithLabel)
            return <ExtEntityComponent key={val.id} subject={subject} property={property} extRes={val} />
          if (val instanceof Subject)
            return <FacetComponent key={val.id} subject={subject} property={property} subNode={val} />
          else if (val instanceof LiteralWithId)
            return <LiteralComponent key={val.id} subject={subject} property={property} lit={val} />
        })}
        {canAdd && <Create subject={subject} property={property} />}
      </div>
    </React.Fragment>
  )
}

/**
 * Create component
 */
const Create: FC<{ subject: Subject; property: PropertyShape }> = ({ subject, property }) => {
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.uri))

  const addItem = () => {
    setList((oldList) => [...oldList, generateDefault(property, subject)])
  }

  return (
    <div className="text-right">
      <button className="btn btn-link ml-2 px-0" onClick={addItem}>
        <AddIcon />
      </button>
    </div>
  )
}

const useStyles = makeStyles((theme) => ({
  root: {},
}))

const langs = [{ value: "bo-x-ewts" }, { value: "bo" }, { value: "en" }, { value: "zh-hans" }, { value: "zh-hant" }]

/**
 * Edit component
 */
const EditLangString: FC<{ lit: LiteralWithId; onChange: (value: LiteralWithId) => void }> = ({ lit, onChange }) => {
  const classes = useStyles()
  return (
    <React.Fragment>
      <TextField
        className={classes.root}
        //label={lit.id}
        style={{ width: "100%" }}
        color={"secondary"}
        value={lit.value}
        onChange={(e) => onChange(lit.copyWithUpdatedValue(e.target.value))}
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
    </React.Fragment>
  )
}

const EditYear: FC<{ lit: LiteralWithId; onChange: (value: LiteralWithId) => void }> = ({ lit, onChange }) => {
  const classes = useStyles()

  let error
  if (lit.value && !lit.value.match(/^[0-9]{4}$/)) error = i18n.t("error.gYear")

  return (
    <React.Fragment>
      <TextField
        className={classes.root}
        //label={lit.id}
        style={{ width: 150 }}
        color={"secondary"}
        value={lit.value}
        {...(error ? { helperText: error, error: true } : {})}
        onChange={(e) => onChange(lit.copyWithUpdatedValue(e.target.value))}
      />
    </React.Fragment>
  )
}

/**
 * Display component, with DeleteButton
 */
const LiteralComponent: FC<{ lit: LiteralWithId; subject: Subject; property: PropertyShape }> = ({
  lit,
  subject,
  property,
}) => {
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.uri))
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

  if (t?.value === ns.RDF("langString").value) edit = <EditLangString lit={lit} onChange={onChange} />
  else if (t?.value === ns.XSD("gYear").value) edit = <EditYear lit={lit} onChange={onChange} />

  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      {edit}
      <button className="btn btn-link ml-2 px-0 float-right" onClick={deleteItem}>
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
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.uri))
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
    <React.Fragment>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{subNode.qname}</span>
        <div>
          {targetShape.properties.map((p, index) => (
            <PropertyContainer key={p.uri} property={p} subject={subNode} />
          ))}
        </div>
        <button className="btn btn-link ml-2 px-0 float-right" onClick={deleteItem}>
          <RemoveIcon />
        </button>
      </div>
    </React.Fragment>
  )
}

//TODO: component to display an external entity that has already been selected, with a delete button to remove it
// There should probably be a ExtEntityCreate or something like that to allow an entity to be selected
const ExtEntityComponent: FC<{ extRes: RDFResourceWithLabel; subject: Subject; property: PropertyShape }> = ({
  extRes,
  subject,
  property,
}) => {
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.uri))
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

export default ValueList
