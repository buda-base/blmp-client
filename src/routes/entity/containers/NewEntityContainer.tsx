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

const debug = require("debug")("bdrc:entity:newentity")

function NewEntityContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)
  const [tab, setTab] = useRecoilState(uiTabState)
  const handleNewtab = (event: ChangeEvent<unknown>): void => {
    setTab(0)
  }

  /* // no need
  const urlParams = qs.parse(props.history.location.search)
  let search = ""
  if (urlParams.subject) search = props.history.location.search
  */

  // otherwise we want the user to select the appropriate shape
  return (
    <React.Fragment>
      <div>
        New entity: here is a list of all possible shapes to choose from in order to create a new entity:
        {shapes.possibleShapeRefs.map((shape: RDFResourceWithLabel, index: number) => (
          <Link key={shape.qname} to={"/new/" + shape.qname} onClick={handleNewtab}>
            {lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)}
          </Link>
        ))}
      </div>
      <div>
        Load entity: select an entity to load here by its RID:
        <input type="text" />
        for the sake of the demo, we are going to pretend that you did input{" "}
        <Link key="demofoo" to="/edit/bdr:P1583">
          P1583
        </Link>
      </div>
    </React.Fragment>
  )
}

export default NewEntityContainer
