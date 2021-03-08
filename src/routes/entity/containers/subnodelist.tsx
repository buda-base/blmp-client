import React, { useEffect, FC } from "react"
import PropTypes from "prop-types"
import * as rdf from "rdflib"
import { PropertyShape, Subject } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import * as ns from "../../../helpers/rdf/ns"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../helpers/atoms"
import { AddIcon, RemoveIcon } from "../../layout/icons"
import i18n from "i18next"

const debug = require("debug")("bdrc:entity:property:subnodelist")

const generateOne = (property: PropertyShape): Subject => {
  const targetShape = property.targetShape
  if (!targetShape) throw "can't find target shape of " + property.uri
  return generateNew("P", targetShape)
}

/**
 * List component
 */

const List: FC<{ subject: Subject; property: PropertyShape }> = ({ subject, property }) => {
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.id))

  const canAdd = property.maxCount ? list.length < property.maxCount : true

  useEffect(() => {
    // reinitializing the property values atom if it hasn't been initialized yet
    // TODO: this probably shouldn't appear in the history
    if (!subject.hasBeenInitializedForProperty(property)) {
      subject.initForProperty(property)
      setList(subject.getPropValues(property.uri))
    }
  }, [subject, setList])

  return (
    <React.Fragment>
      <div role="main">
        {list.map((lit) => (
          <Component key={lit.id} subject={subject} property={property} lit={lit} />
        ))}

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
    setList((oldList) => [...oldList, generateOne(property)])
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

const lang = [{ value: "bo-x-ewts" }, { value: "bo" }, { value: "en" }, { value: "zh-hans" }, { value: "zh-hant" }]

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
        {lang.map((option) => (
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
const Component: FC<{ lit: LiteralWithId; subject: Subject; property: Property }> = ({ lit, subject, property }) => {
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

export default List
