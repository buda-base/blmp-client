import * as shapes from "../../../helpers/rdf/shapes"
import { RDFResourceWithLabel } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import { entitiesAtom, EditedEntityState } from "../../../containers/EntitySelectorContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { useRecoilState } from "recoil"
import { AppProps } from "../../../containers/AppContainer"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom"
import React from "react"

const debug = require("debug")("bdrc:entity:newentity")

function NewEntityContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const shapeQname = props.match.params.shapeQname
  if (shapeQname) {
    let shapeRef = null
    if (shapeQname in shapes.shapeRefsMap) shapeRef = shapes.shapeRefsMap[shapeQname]
    else return <span>invalid shape!</span>
    // if we know what shape we want, we can just create the entity:
    // TODO: perhaps the shape should be fetched there too, so that we can
    // properly generate the ID
    const newSubject = generateNew("P", null)
    debug(newSubject)
    const newEntity = {
      subjectQname: newSubject.qname,
      state: EditedEntityState.NeedsSaving,
      shapeRef: shapeRef,
      subject: newSubject,
    }
    setEntities([newEntity, ...entities])
    props.history.push("/edit/" + newSubject.qname + "/" + shapeQname)
    return <span>creating...</span>
  }

  // otherwise we want the user to select the appropriate shape
  return (
    <React.Fragment>
      <div>
        New entity: here is a list of all possible shapes to choose from in order to create a new entity:
        {shapes.possibleShapeRefs.map((shape: RDFResourceWithLabel, index: number) => (
          <Link key={shape.qname} to={"/new/" + shape.qname}>
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
