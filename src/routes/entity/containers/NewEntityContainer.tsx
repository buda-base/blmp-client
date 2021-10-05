import { useState, useEffect } from "react"
import { EntityCreator } from "../../../helpers/rdf/construct"
import * as shapes from "../../../helpers/rdf/shapes"
import { getUserSession } from "../../../helpers/rdf/io"
import { RDFResourceWithLabel } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import { entitiesAtom, EditedEntityState, defaultEntityLabelAtom } from "../../../containers/EntitySelectorContainer"
import { uiLangState, uiTabState, sessionLoadedState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { useRecoilState } from "recoil"
import { AppProps } from "../../../containers/AppContainer"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom"
import React, { ChangeEvent } from "react"
import qs from "query-string"
import i18n from "i18next"
import { TextField, MenuItem } from "@material-ui/core"
import { useAuth0 } from "@auth0/auth0-react"

const debug = require("debug")("bdrc:entity:newentity")

function NewEntityContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)
  const [tab, setTab] = useRecoilState(uiTabState)
  const handleNewtab = (event: ChangeEvent<unknown>): void => {
    setTab(0)
  }
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [RID, setRID] = useState("")
  const [sessionLoaded, setSessionLoaded] = useRecoilState(sessionLoadedState)
  const auth0 = useAuth0()

  // restore user session on startup
  useEffect(() => {
    // no need for doing it more than once - fixes loading session from open entity tab
    //if (!isLoading && !entities.length) {

    const session = getUserSession(auth0)
    session.then((obj) => {
      debug("session:", obj)
      if (!obj) return
      const newEntities = []
      for (const k of Object.keys(obj)) {
        newEntities.push({
          subjectQname: k,
          subject: null,
          shapeRef: obj[k].shape,
          subjectLabelState: defaultEntityLabelAtom,
          state: EditedEntityState.NotLoaded,
          preloadedLabel: obj[k].label,
        })
      }
      if (newEntities.length) setEntities(newEntities)
      if (!sessionLoaded) setSessionLoaded(true)
    })
  }, [])

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
          <TextField
            style={{ width: "100%" }}
            value={RID}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => setRID(e.target.value)}
            helperText={"select an entity to load here by its RID"}
            onKeyDown={(event) => {
              if (event.key === "Enter") props.history.push("/edit/" + (RID.startsWith("bdr:") ? "" : "bdr:") + RID)
            }}
          />
        </div>
        <div>
          <Link
            to={"/edit/" + (RID.startsWith("bdr:") ? "" : "bdr:") + RID}
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
