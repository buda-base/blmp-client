import React, { useEffect, FC } from "react"
import PropTypes from "prop-types"
import * as rdf from "rdflib"
import {
  LiteralWithId,
  Property,
  Subject,
  valuesAtomBySubjectPropertyUri,
  subjectAtomByUri,
} from "../../../helpers/rdf/types"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../helpers/atoms"
import { AddIcon, RemoveIcon } from "../../layout/icons"

const generateDefault = (property?: Property): LiteralWithId => {
  return new LiteralWithId("", "bo-x-ewts")
}

const family = atomFamily<Array<LiteralWithId>, string>({
  key: "literals",
  default: [], // must be iterable for a List component
})

/**
 * List component
 */

const List: FC<{ subject: Subject; property: Property }> = ({ subject, property }) => {
  const [list, setList] = useRecoilState(valuesAtomBySubjectPropertyUri([subject.id, property.id]))
  const [sub, setSub] = useRecoilState(subjectAtomByUri(subject.id))

  useEffect(() => {
    // reinitializing the atom
    // TODO: this probably shouldn't appear in the history
    if (!(property.uri in subject.propValues)) {
      // the subject needs to be intialized for the property:
      subject = subject.cloneWithUpdatedPropertyValues(property.uri, [])
    }
    setSub(subject)
  }, [subject, setSub])

  return (
    <React.Fragment>
      <div role="main">
        {list.map((lit) => (
          <Component key={lit.id} subjectUri={subject.id} propertyUri={property.id} lit={lit} />
        ))}

        <Create subjectUri={subject.id} propertyUri={property.id} />
      </div>
    </React.Fragment>
  )
}

/**
 * Create component
 */
const Create: FC<{ subjectUri: string; propertyUri: string }> = ({ subjectUri, propertyUri }) => {
  const [list, setList] = useRecoilState(valuesAtomBySubjectPropertyUri([subjectUri, propertyUri]))

  const addItem = () => {
    setList((oldList) => [...oldList, generateDefault()])
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
export const Edit: FC<{ lit: LiteralWithId; onChange: (value: LiteralWithId) => void }> = ({ lit, onChange }) => {
  const classes = useStyles()
  return (
    <React.Fragment>
      <TextField
        className={classes.root}
        //label={lit.id}
        style={{ width: 300 }}
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

/**
 * Display component, with DeleteButton
 */
const Component: FC<{ lit: LiteralWithId; subjectUri: string; propertyUri: string }> = ({
  lit,
  subjectUri,
  propertyUri,
}) => {
  const [list, setList] = useRecoilState(valuesAtomBySubjectPropertyUri([subjectUri, propertyUri]))
  const index = list.findIndex((listItem) => listItem === lit)

  const onChange: (value: LiteralWithId) => void = (value: LiteralWithId) => {
    const newList = replaceItemAtIndex(list, index, value)
    setList(newList)
  }

  const deleteItem = () => {
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  return (
    <div>
      <Edit lit={lit} onChange={onChange} />
      <button className="btn btn-link ml-2 px-0 float-right" onClick={deleteItem}>
        <RemoveIcon />
      </button>
    </div>
  )
}

export default List
