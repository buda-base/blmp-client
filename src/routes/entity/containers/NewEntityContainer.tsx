import { EntityCreator } from "../../../helpers/rdf/construct"
import * as shapes from "../../../helpers/rdf/shapes"
import { RDFResourceWithLabel } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import { entitiesAtom, EditedEntityState } from "../../../containers/EntitySelectorContainer"
import { uiLangState, uiTabState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { useRecoilState } from "recoil"
import { AppProps } from "../../../containers/AppContainer"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom"
import React, { ChangeEvent } from "react"
import qs from "query-string"
import { TextField, MenuItem } from "@material-ui/core"

const debug = require("debug")("bdrc:entity:newentity")

function NewEntityContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)
  const [tab, setTab] = useRecoilState(uiTabState)
  const handleNewtab = (event: ChangeEvent<unknown>): void => {
    setTab(0)
  }
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  /* // no need
  const urlParams = qs.parse(props.history.location.search)
  let search = ""
  if (urlParams.subject) search = props.history.location.search
  */

  // otherwise we want the user to select the appropriate shape

  // "here is a list of all possible shapes" "to choose from in order to create a new entity":
  return (
    <div className="new-fix">
      <div>
        <b>New entity:</b>
        <TextField
          select
          //label="Choose a shape"
          helperText={"List of all possible shapes"}
          id="shapeSelec"
          className="shapeSelector"
          value={shapes.possibleShapeRefs[0].qname}
          style={{ marginTop: "3px", marginLeft: "10px" }}
        >
          {/* <MenuItem disabled key={"init"} value={"init"} >Choose a shape</MenuItem> */}
          {shapes.possibleShapeRefs.map((shape: RDFResourceWithLabel, index: number) => (
            <MenuItem key={shape.qname} value={shape.qname} style={{ padding: 0 }}>
              <Link to={"/new/" + shape.qname} onClick={handleNewtab} className="popLink">
                {lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)}
              </Link>
            </MenuItem>
          ))}
        </TextField>
      </div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <div style={{ marginRight: "10px" }}>
          <b>Load entity:</b>{" "}
        </div>
        <div>
          {" "}
          select an entity to load here by its RID:&nbsp;
          <input type="text" />
          <br />
          <i>for the sake of the demo, we are going to pretend that you did input </i>
          <Link key="edit" to="/edit/bdr:PTEST">
            PTEST
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NewEntityContainer
