import React, { useEffect } from "react"
import PropTypes from "prop-types"
import is from "is_js"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../../helpers/atoms"
import { AddIcon, RemoveIcon } from "../../../layout/icons"
import * as constants from "../../../helpers/vocabulary"
import { entityIdGenerator } from "../../../../helpers/id"
import { MUI_FIELD_SPACER, SectionDivider } from "../../../../routes/layout/theme"

const debug = require("debug")("bdrc:atom:note")

const defaultComponentValue = {
  "@id": "",
  status: "pristine",
  noteText: { "@value": "", "@language": "" },
  noteSource: "",
  contentLocationStatement: "",
}

const family = atomFamily({
  key: 'note',
  default: []
});

/**
 * List component
 */

function List({ id, initialState, defaultValue = defaultComponentValue }) {
  const [list, setList] = useRecoilState(family(id))

  useEffect(() => {
    if (is.undefined(initialState) || is.empty(initialState)) {
      setList([])
    } else {
      setList(initialState.map((item) => ({ ...defaultValue, ...item, id: getId(), status: "filled" })))
    }
  }, [defaultValue, initialState, setList])

  return (
    <div role="main">
      {list.map((todoItem, index) => (
        <Component key={todoItem.id} parentId={id} item={todoItem} />
      ))}

      <Create parentId={id} defaultValue={defaultValue} />
    </div>
  )
}

List.propTypes = {
  id: PropTypes.string.isRequired,
  initialState: PropTypes.array,
}

/**
 * Create component
 */

function BlockAddButton({ add }) {
  return (
    <div className="text-center pb-1">
      <button size="small"
        className="btn btn-sm btn-block btn-outline-primary mb-2 px-0"
        style= {{ boxShadow: 'none' }}
        onClick={add}
      >
        {constants.AddAnother} <AddIcon />
      </button>
    </div>
  )
}
function Create({ defaultValue, parentId }) {
  const setList = useSetRecoilState(family(parentId))

  // const validateItem = () => inputValue['noteText']['@value'].length && inputValue['noteText']['@language'].length

  const addItem = () => {
    setList((oldTodoList) => [
      ...oldTodoList,
      {
        id: getId(),
        ...defaultValue,
        '@id': entityIdGenerator('NT'),
        status: "pristine"
      },
    ])
  }

  return (
    <BlockAddButton add={addItem} />
  )
}

Create.propTypes = {
  parentId: PropTypes.string.isRequired,
  defaultValue: PropTypes.object.isRequired
}

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiInput-multiline": {
      fontSize: '1em'
    },
    "& .MuiFormHelperText-root": {
      color: theme.palette.secondary.main
    },
  },
  resize: { // resize English with small text
    "& .MuiInput-multiline": {
      fontSize: '0.8em'
    },
    "& .MuiFormHelperText-root": {
      color: theme.palette.secondary.main
    },
  }
}))

/**
 * Edit component
 */
function Edit({ value, onChange }) {
  const classes = useStyles()
  debug(value)
  return (
    <React.Fragment>
      {value.status === "pristine" ? <SectionDivider text="NEW" /> : null}

      {value.status === "pristine" ?
        <TextField
          className={classes.root}
          style = {{ width: 200 }}
          label={null}
          color={'secondary'}
          value={value["@id"]}
          onChange={(e) => onChange({ ...value, "@id": e.target.value })}
          helperText="ID"
        />
      : null}

      <TextField
        className={value['noteText']["@language"] === 'en' ? classes.resize : classes.root}
        label={value.status === "filled" ? value["@id"] : null }
        fullWidth
        InputLabelProps={{ shrink: true }}
        color={'secondary'}
        multiline
        value={value['noteText']["@value"]}
        onChange={(e) => onChange({ ...value, noteText: { ...value.noteText, "@value": e.target.value } } )}
        helperText={value.status === "pristine" ? constants.RequiredNote: null }
      />

      <TextField
        select
        value={value['noteText']["@language"] || ""}
        style = {{ width: 120, marginRight: MUI_FIELD_SPACER }}
        margin="dense"
        onChange={(e) => onChange({ ...value, noteText: { ...value.noteText, "@language": e.target.value } } )}
        helperText="Language"
      >
        {constants.languageDefaults.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.value}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        style = {{ width: 300, marginRight: MUI_FIELD_SPACER }}
        multiline
        margin="dense"
        value={value["contentLocationStatement"]}
        helperText="Content Location Statement"
        onChange={(e) => onChange({ ...value, contentLocationStatement: e.target.value })}
      />

      <TextField
        style = {{ width: 150 }}
        margin="dense"
        value={value["noteSource"]}
        helperText="Source"
        onChange={(e) => onChange({ ...value, noteSource: e.target.value })}
      />
    </React.Fragment>
  )
}

/**
 * Display component, with DeleteButton
 */
function Component({ item, parentId }) {
  const [list, setList] = useRecoilState(family(parentId))
  const index = list.findIndex((listItem) => listItem === item)

  const onChange = (value) => {
    const newList = replaceItemAtIndex(list, index, value)
    setList(newList)
  }

  const deleteItem = () => {
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  return (
    <div className="pb-4">
      <Edit value={item} onChange={onChange} />
      <button className="btn btn-link ml-2 px-0 float-right" onClick={deleteItem}>
        <RemoveIcon />
      </button>
    </div>
  )
}

Component.propTypes = {
  parentId: PropTypes.string.isRequired,
}

export default List
