import React, { useEffect } from "react"
import PropTypes from "prop-types"
import is from "is_js"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../../helpers/atoms"
import { AddIcon, RemoveIcon } from "../../../layout/icons"

const defaultComponentValue= { "@value": "", "@language": "en" }

const family = atomFamily({
  key: 'label',
  default: [] // must be iterable for a List component
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
      setList(initialState.map((item) => ({ ...item, id: getId() })))
    }
  }, [initialState, setList])

  return (
    <div role="main">
      {list.map((todoItem) => (
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
function Create({ defaultValue, parentId }) {
  const setList = useSetRecoilState(family(parentId))

  const addItem = () => {

    setList((oldTodoList) => [
      ...oldTodoList,
      {
        id: getId(),
        ...defaultValue,
      },
    ])
  }

  return (
    <div className="text-right">
      <button size="small"
        className="btn btn-link ml-2 px-0"
        onClick={addItem}
      >
        <AddIcon />
      </button>
    </div>
  )
}

Create.propTypes = {
  parentId: PropTypes.string.isRequired,
  defaultValue: PropTypes.object.isRequired
}

const useStyles = makeStyles((theme) => ({
  root: {

  },
}))

const lang = [
  { value: "bo-x-ewts" },
  { value: "bo" } ,
  { value: "en" },
  { value: "zh-hans" },
  { value: "zh-hant" }
];

/**
 * Edit component
 */
function Edit({ value, onChange }) {
  const classes = useStyles()
  return (
    <React.Fragment>
      <TextField
        className={classes.root}
        label={value["@id"]}
        style = {{ width: 300 }}
        color={'secondary'}
        value={value["@value"]}
        onChange={(e) => onChange({ ...value, "@value": e.target.value })}
      />
      <TextField
          select
          className="ml-2"
          label={value["@id"] ? " ": null }
          value={value["@language"] || ""}
          style = {{ width: 120 }}
          onChange={(e) => onChange({ ...value, "@language": e.target.value })}
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
    <div>
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
