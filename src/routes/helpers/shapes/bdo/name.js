import React, { useEffect } from "react"
import PropTypes from "prop-types"
import is from "is_js"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../../helpers/atoms"
import { entityIdGenerator } from "../../../../helpers/id"
import { AddIcon, RemoveIcon } from "../../../layout/icons"
import * as constants from "../../../helpers/vocabulary"
import { MUI_FIELD_SPACER, SectionDivider } from "../../../../routes/layout/theme"

const debug = require("debug")("bdrc:atom:name")

const defaultComponentValue = {
  "@id": "",
  type: "RequiredNameStar",
  status: "pristine",
  "@value": "",
  "@language": "en",
}

const family = atomFamily({
  key: "name",
  default: [], // must be iterable for a List component
})

/**
 * List component
 */

function List({ id, initialState, defaultValue = defaultComponentValue }) {
  const [list, setList] = useRecoilState(family(id))

  useEffect(() => {
    if (is.undefined(initialState) || is.empty(initialState)) {
      setList([])
    } else {
      setList(initialState.map((item) => ({ ...item, id: getId(), status: "filled" })))
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

// eslint-disable-next-line no-unused-vars
function MinimalAddButton({ add }) {
  return (
    <div className="text-right">
      <button size="small" className="btn btn-link ml-2 px-0" onClick={add}>
        <AddIcon />
      </button>
    </div>
  )
}

function BlockAddButton({ add }) {
  return (
    <div className="text-center pb-1">
      <button
        size="small"
        className="btn btn-sm btn-block btn-outline-primary mb-2 px-0"
        style={{ boxShadow: "none" }}
        onClick={add}
      >
        {constants.AddAnother} <AddIcon />
      </button>
    </div>
  )
}

function Create({ defaultValue, parentId }) {
  const setList = useSetRecoilState(family(parentId))

  const addItem = () => {
    setList((oldTodoList) => [
      ...oldTodoList,
      {
        id: getId(),
        ...defaultValue,
        "@id": entityIdGenerator("NM"),
        status: "pristine",
      },
    ])
  }

  return <BlockAddButton add={addItem} />
}

Create.propTypes = {
  parentId: PropTypes.string.isRequired,
  defaultValue: PropTypes.object.isRequired,
}

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiFormHelperText-root": {
      color: theme.palette.secondary.main,
    },
  },
}))

/**
 * Edit component
 */
function Edit({ value, onChange }) {
  debug(value.id, value)
  const classes = useStyles()
  return (
    <React.Fragment>
      {value.status === "pristine" ? <SectionDivider text="NEW" /> : null}

      {value.status === "pristine" ? (
        <TextField
          className={classes.root}
          style={{ width: 200 }}
          label={null}
          color={"secondary"}
          value={value["@id"]}
          onChange={(e) => onChange({ ...value, "@id": e.target.value })}
          helperText="ID"
        />
      ) : null}

      {value.status === "pristine" ? (
        <TextField
          select
          className="ml-2 mr-2"
          label={null}
          value={value["type"] || ""}
          style={{ width: 150 }}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
          helperText="Type"
        >
          {Object.keys(constants.sanitizedNameTypes).map((option) => (
            <MenuItem key={option} value={option}>
              {constants.sanitizedNameTypes[option]}
            </MenuItem>
          ))}
        </TextField>
      ) : null}

      <TextField
        className={classes.root}
        label={value.status === "filled" ? value["@id"] : null}
        style={{ width: "60%", marginRight: MUI_FIELD_SPACER }}
        color={"secondary"}
        value={value["@value"]}
        onChange={(e) => onChange({ ...value, "@value": e.target.value })}
        helperText={constants.NameTypes[value.type] || "n/a"}
      />

      <TextField
        select
        className=""
        label={value.status === "filled" ? " " : null}
        value={value["@language"] || ""}
        style={{ width: 120 }}
        onChange={(e) => onChange({ ...value, "@language": e.target.value })}
        helperText="Language"
      >
        {constants.languageDefaults.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.value}
          </MenuItem>
        ))}
        {!constants.languageDefaults.map((l) => l.value).includes(value["@language"]) && (
          <MenuItem key={value["@language"]} value={value["@language"]}>
            {value["@language"]}
          </MenuItem>
        )}
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
