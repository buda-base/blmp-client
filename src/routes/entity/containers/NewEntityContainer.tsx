import { useState, useEffect } from "react"
import { EntityCreator } from "../../../helpers/rdf/construct"
import * as shapes from "../../../helpers/rdf/shapes"
import { RDFResourceWithLabel } from "../../../helpers/rdf/types"
import { entitiesAtom, EditedEntityState, defaultEntityLabelAtom } from "../../../containers/EntitySelectorContainer"
import { uiDisabledTabsState, uiLangState, uiTabState, RIDprefixState, userIdState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { useRecoilState } from "recoil"
import { AppProps } from "../../../containers/AppContainer"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom"
import React, { ChangeEvent } from "react"
import qs from "query-string"
import i18n from "i18next"
import { Trans } from "react-i18next"
import { TextField, MenuItem } from "@material-ui/core"

const debug = require("debug")("bdrc:entity:newentity")

function NewEntityContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)
  const [RID, setRID] = useState("")
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)
  const [userId, setUserId] = useRecoilState(userIdState)

  const disabled = !RIDprefix

  /* // no need
  const [disabled, setDisabled] = useRecoilState(uiDisabledTabsState)
  useEffect(() => {
    if (disabled) setDisabled(false)
  })
  */

  /* // no need
  const urlParams = qs.parse(props.history.location.search)
  let search = ""
  if (urlParams.subject) search = props.history.location.search
  */

  // otherwise we want the user to select the appropriate shape
  
  const expr = RID?.match(/^(.*:)?(.*)$/);
  const loadRID = expr && expr[2] ? (expr[1] || "bdr:") + expr[2]?.toUpperCase() : RID // eslint-disable-line no-magic-numbers
  //debug("loadRID:",expr,loadRID)
  
  // "here is a list of all possible shapes" "to choose from in order to create a new entity":
  return (
    <div className="new-fix">
      <div>
        <b>New entity:</b>
        <span>
          <TextField
            {...(disabled ? { disabled: true } : {})}
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
                <Link to={"/new/" + shape.qname} className="popLink">
                  {lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)}
                </Link>
              </MenuItem>
            ))}
          </TextField>
          {disabled && RIDprefix === "" && (
            <span className="pl-2" style={{ fontStyle: "italic", fontWeight: 500, color: "#d73449", fontSize: 14 }}>
              <Trans i18nKey="error.prefix" components={{ res: <Link className="profile-link" to="/profile" /> }} />
            </span>
          )}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <div style={{ marginRight: "10px" }}>
          <b>Load entity:</b>{" "}
        </div>
        <div>
          <TextField
            style={{ width: "100%" }}
            value={RID}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => setRID(e.target.value)}
            helperText={"select an entity to load here by its RID"}
            onKeyDown={(event) => {
              if (event.key === "Enter") props.history.push("/edit/" +loadRID)
            }}
          />
        </div>
        <div>
          <Link
            to={"/edit/"+loadRID}
            className={"btn btn-sm btn-outline-primary py-3 ml-2 lookup btn-rouge " + (!RID ? "disabled" : "")}
            style={{ boxShadow: "none", alignSelf: "center", marginBottom: "15px" }}
          >
            {i18n.t("search.open")}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NewEntityContainer
