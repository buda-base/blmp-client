import React, { useEffect } from "react"
import PropTypes from "prop-types"
import is from "is_js"

import { useRecoilState, useSetRecoilState } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, Select, MenuItem, FormControl, FormHelperText } from "@material-ui/core"
import { AddIcon, RemoveIcon } from "../../layout/icons"
import * as constants from "../../helpers/vocabulary"
import { atomListWithID, getId, replaceItemAtIndex, removeItemAtIndex } from "../../../helpers/atoms"

function TodoList({ id, initialState, fullWidth = false }) {
  const [todoList, setTodoList] = useRecoilState(atomListWithID(id))

  useEffect(() => {
    if (is.undefined(initialState) || is.empty(initialState)) {
      setTodoList([])
    } else
    {
      setTodoList(initialState.map((item) => ({ ...item, id: getId() })))
    }
  }, [initialState, setTodoList])

  return (
    <div role="main">
      {todoList.map((todoItem) => (
        <TodoItem key={todoItem.id} parentId={id} item={todoItem} />
      ))}

      <TodoItemCreator parentId={id} defaultValue={{ "@value": "", "@language": "en" }} fullWidth={fullWidth} />
    </div>
  )
}

TodoList.propTypes = {
  id: PropTypes.string.isRequired,
  initialState: PropTypes.array,
}

function MinimalAddButton({ add }) {
  return (
    <div className="text-right">
      <button size="small" className="btn btn-link ml-2 px-0"
        onClick={add} >
        <AddIcon />
      </button>
    </div>
  )
}

function BlockAddButton({ add }) {
  return (
    <div className="text-center mt-2">
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

function TodoItemCreator({ defaultValue, parentId, fullWidth = false }) {
  const setTodoList = useSetRecoilState(atomListWithID(parentId))

  const addItem = () => {
    setTodoList((oldTodoList) => [
      ...oldTodoList,
      {
        id: getId(),
        ...defaultValue,
      },
    ])
  }

  return (
    <div className="text-right">
      {fullWidth ? <BlockAddButton add={addItem} /> : <MinimalAddButton add={addItem} /> }
    </div>
  )
}

TodoItemCreator.propTypes = {
  parentId: PropTypes.string.isRequired,
  defaultValue: PropTypes.object.isRequired,
  fullWidth: PropTypes.bool
}

/* const useStyles = makeStyles((theme) => ({
  root: {
    '& label.Mui-focused': {
      color: 'green',
    },
    '& .MuiInput-underline:after': {
      borderBottomColor: 'green',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'red',
      },
      '&:hover fieldset': {
        borderColor: 'yellow',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'green',
      },
    },
  },
})) */

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiTextField-root": {
      margin: theme.spacing(1),
      width: "25ch",
    },
  },
}))

function TodoItemInput({ value, onChange }) {
  const classes = useStyles()
  return (
    <React.Fragment>
      <TextField
        className={classes.root}
        required={true}
        value={value["@value"]}
        onChange={(e) => onChange({ ...value, "@value": e.target.value })}
        helperText="Preferred Label"
      />
      <FormControl required className="ml-2">
        <Select
          value={value["@language"] || ""}
          label="Required"
          onChange={(e) => onChange({ ...value, "@language": e.target.value })}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value={"bo-x-ewts"}>bo-x-ewts</MenuItem>
          <MenuItem value={"bo"}>bo</MenuItem>
          <MenuItem value={"en"}>en</MenuItem>
          <MenuItem value={"zh-hans"}>zh-hans</MenuItem>
          <MenuItem value={"zh-hant"}>zh-hant</MenuItem>
        </Select>
        <FormHelperText>Language</FormHelperText>
      </FormControl>
    </React.Fragment>
  )
}

function TodoItem({ item, parentId }) {
  const [todoList, setTodoList] = useRecoilState(atomListWithID(parentId))
  const index = todoList.findIndex((listItem) => listItem === item)

  const onChange = (value) => {
    const newList = replaceItemAtIndex(todoList, index, value)
    setTodoList(newList)
  }

  const deleteItem = () => {
    const newList = removeItemAtIndex(todoList, index)
    setTodoList(newList)
  }

  return (
    <div>
      <TodoItemInput value={item} onChange={onChange} />
      <button className="btn btn-link px-0 float-right" onClick={deleteItem}>
        <RemoveIcon />
      </button>
    </div>
  )
}

TodoItem.propTypes = {
  parentId: PropTypes.string.isRequired,
}

export default TodoList
