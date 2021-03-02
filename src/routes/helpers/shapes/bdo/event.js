import React, { useEffect, useState } from "react"
import PropTypes from "prop-types"
import is from "is_js"
import { useRecoilState, useSetRecoilState, atomFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem } from "@material-ui/core"
import i18n from "i18next"

import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../../helpers/atoms"
import { entityIdGenerator } from "../../../../helpers/id"
import { AddIcon, RemoveIcon } from "../../../layout/icons"
import * as constants from "../../vocabulary"
import { MUI_FIELD_SPACER, SectionDivider } from "../../../layout/theme"

import { Edit as LangEdit } from "../skos/label"
import config from "../../../../config"
import { uiLangState } from "../../../../atoms/common"
import { ResourceSelector } from "./ResourceSelector"

const debug = require("debug")("bdrc:atom:event")

const defaultComponentValue = {
  "@id": "",
  type: "",
  status: "pristine",
  notAfter: { type: "xsd:gYear", "@value": "" },
  notBefore: { type: "xsd:gYear", "@value": "" },
  onDate: { type: "xsd:gYear", "@value": "" },
  onOrAbout: { type: "xsd:gYear", "@value": "" },
  onYear: { type: "xsd:gYear", "@value": "" },
  eventText: { "@language": "en", "@value": "" },
  eventWhere: "",
  personEventRole: "",
  eventWho: [],
}

const family = atomFamily({
  key: "event",
  default: [], // must be iterable for a List component
})

/**
 * List component
 */

function List({ id, initialState, defaultValue = defaultComponentValue, hideEmpty = true }) {
  const [list, setList] = useRecoilState(family(id))
  const [hidden, setHidden] = useState(hideEmpty)

  useEffect(() => {
    if (is.undefined(initialState) || is.empty(initialState)) {
      setList([])
    } else {
      setList(initialState.map((item) => ({ ...defaultValue, ...item, id: getId(), status: "filled" })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState, setList])

  return (
    <React.Fragment>
      <div className="text-right mb-2 pb-2">
        <button className="btn btn-sm btn-link" onClick={(e) => setHidden((prevState) => !prevState)}>
          <u>{hidden ? "Show all properties" : "Hide empty properties"}</u>
        </button>
      </div>
      <div role="main">
        {list.map((todoItem) => (
          <Component key={todoItem.id} parentId={id} item={todoItem} hideEmpty={hidden} />
        ))}

        <Create parentId={id} defaultValue={defaultValue} hideEmpty={hidden} />
      </div>
    </React.Fragment>
  )
}

List.propTypes = {
  id: PropTypes.string.isRequired,
  initialState: PropTypes.array,
  hideEmpty: PropTypes.bool,
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
        "@id": entityIdGenerator("EV"),
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
function Edit({ value, onChange, hideEmpty = true, parentId }) {
  debug(value.id, value)
  const classes = useStyles()

  return (
    <React.Fragment>
      {value.status === "pristine" ? <SectionDivider text="NEW" /> : null}
      {!hideEmpty ? <SectionDivider text={value["@id"]} className="text-muted" /> : null}

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
          {Object.keys(constants.EventTypes).map((option) => (
            <MenuItem key={option} value={option}>
              {constants.EventTypes[option]}
            </MenuItem>
          ))}
        </TextField>
      ) : null}

      {constants.EventDateTypes.map((option, i) => {
        if (hideEmpty && (!value[option.value] || !value[option.value]["@value"])) return null
        return (
          <TextField
            key={option.value}
            className={classes.root}
            InputLabelProps={{ shrink: true }}
            label={option.label}
            value={value[option.value]["@value"] || ""}
            style={{ width: 119, marginRight: i < constants.EventDateTypes.length - 1 ? MUI_FIELD_SPACER : 0 }}
            onChange={(e) => onChange({ ...value, [option.value]: { type: "xsd:gYear", "@value": e.target.value } })}
            helperText={constants.EventTypes[value.type] || "n/a"}
          />
        )
      })}

      {hideEmpty && !value["eventText"]["@value"] ? null : ( // hide empty for now
        <div className="pt-4">
          <TextField
            className={classes.root}
            //label={value.status === "filled" ? value["@id"] : null}
            style={{ width: "100%", marginRight: MUI_FIELD_SPACER }}
            value={value["eventText"]["@value"]}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => onChange({ ...value, eventText: { ...value["eventText"], "@value": e.target.value } })}
            helperText={constants.EventTypes[value.type] + " (Text)" || "n/a"}
          />
        </div>
      )}

      {hideEmpty && !value["personEventRole"] ? null : ( // hide empty for now
        <ResourceSelector
          value={value}
          onChange={onChange}
          propid={"personEventRole"}
          helperTxt={"Role"}
          type={"Role"}
          parentId={parentId}
        />
      )}

      {hideEmpty && !value["eventWhere"] ? null : ( // hide empty for now
        <ResourceSelector
          value={value}
          onChange={onChange}
          propid={"eventWhere"}
          helperTxt={"At"}
          type={"Place"}
          parentId={parentId}
        />
      )}

      {value["eventWho"] && value["eventWho"].length ? ( // hide empty for now // TODO Unpack list
        <div className="pt-4" style={{ display: "flex", justifyContent: "space-between" }}>
          <TextField
            className={classes.root}
            label={value.status === "filled" ? value["@id"] : null}
            style={{ width: "90%", marginRight: MUI_FIELD_SPACER }}
            value={value["eventWho"]}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => onChange({ ...value, eventWho: e.target.value })}
            helperText={constants.EventTypes[value.type] + " (With)" || "n/a"}
          />
          <button
            className="btn btn-sm btn-outline-primary py-3"
            style={{ boxShadow: "none", alignSelf: "center" }}
            //onClick={add}
          >
            {i18n.t("search.lookup")}
          </button>
        </div>
      ) : null}
    </React.Fragment>
  )
}

Edit.propTypes = {
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  hideEmpty: PropTypes.bool,
}

/**
 * Display component, with DeleteButton
 */
function Component({ item, parentId, hideEmpty }) {
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
      <Edit value={item} onChange={onChange} hideEmpty={hideEmpty} parentId={parentId} />
      <button className="btn btn-link ml-2 px-0 float-right" onClick={deleteItem}>
        <RemoveIcon />
      </button>
    </div>
  )
}

Component.propTypes = {
  parentId: PropTypes.string.isRequired,
  hideEmpty: PropTypes.bool.isRequired,
}

export default List
