import * as rdf from "rdflib"
import { EntityCreator } from "../../../helpers/rdf/construct"
import {
  ShapeFetcher,
  fetchUrlFromshapeQname,
  loadTtl,
  loadOntology,
  setUserLocalEntities,
} from "../../../helpers/rdf/io"
import * as ns from "../../../helpers/rdf/ns"
import * as shapes from "../../../helpers/rdf/shapes"
import { RDFResourceWithLabel, Subject, EntityGraph } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import { entitiesAtom, EditedEntityState } from "../../../containers/EntitySelectorContainer"
import { uiRouteState, uiTabState, uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { useRecoilState } from "recoil"
import { AppProps } from "../../../containers/AppContainer"
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from "react-router-dom"
import React, { useEffect, useState } from "react"
import qs from "query-string"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import { useAuth0 } from "@auth0/auth0-react"

import { nanoid, customAlphabet } from "nanoid"

const NANOID_LENGTH = 8
const nanoidCustom = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", NANOID_LENGTH)

const debug = require("debug")("bdrc:entity:entitycreation")

function EntityCreationContainer(props: AppProps) {
  const subjectQname = props.match.params.subjectQname
  const propertyQname = props.match.params.propertyQname
  const index = props.match.params.index
  const shapeQname = props.match.params.shapeQname

  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject>()
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const { getAccessTokenSilently } = useAuth0()
  //const [shape, setShape] = useState<shapes.NodeShape>()
  const auth0 = useAuth0()
  const [tab, setTab] = useRecoilState(uiTabState)
  const [route, setRoute] = useRecoilState(uiRouteState)
  const [cleanable, setCleanable] = useState(false)

  const reset = () => {
    debug("reset in EntityCreationContainer")

    setEntity(undefined)
    //setShape(undefined)
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    return () => {
      debug("cleaning EntityCreationContainer")
    }
  }, [])

  debug("in EntityCreationContainer")

  useEffect(() => {
    debug("shapeQname effect", shapeQname)

    // we need to load the shape at the same time, which means we need to also
    // load the ontology
    async function createResource(shapeQname: string) {
      debug("begin createResource", shapeQname)

      setEntityLoadingState({ status: "fetching shape", error: undefined })
      const url = fetchUrlFromshapeQname(shapeQname)
      const loadShape = loadTtl(url)
      const loadOnto = loadOntology()
      let shape: shapes.NodeShape
      try {
        const store = await loadShape
        const ontology = await loadOnto
        const shapeUri = ns.uriFromQname(shapeQname)
        shape = new shapes.NodeShape(rdf.sym(shapeUri), new EntityGraph(store, shapeUri), ontology)
        //setShape(shape)
      } catch (e) {
        debug(e)
        setEntityLoadingState({ status: "error", error: "error fetching shape" })
        return
      }

      const shapePrefix = shape.getPropStringValue(shapes.bdsIdentifierPrefix)
      let namespace = shape.getPropStringValue(shapes.shNamespace)
      if (namespace == null) namespace = ns.BDR_uri
      setEntityLoadingState({ status: "creating", error: undefined })
      let userPrefix
      let lname
      try {
        // TODO: uncomment for prod
        //const token = await getAccessTokenSilently()
        // TODO: get userPrefix from user profile
        userPrefix = ""
        const prefix = shapePrefix + userPrefix
        // TODO: uncomment for prod
        //lname = await reserveId(prefix, token)
        lname = prefix + nanoidCustom()
      } catch (e) {
        debug(e)
        setEntityLoadingState({ status: "error", error: "error logging or reserving id" })
        return
      }
      const prefix = shapePrefix + userPrefix
      const uri = namespace + lname
      const graph = new EntityGraph(rdf.graph(), uri)
      const node = new rdf.NamedNode(uri)
      const newSubject = new Subject(node, graph)
      // TODO: create adminInfo

      const newEntity = {
        subjectQname: newSubject.qname,
        state: EditedEntityState.NeedsSaving,
        shapeRef: shape,
        subject: newSubject,
        subjectLabelState: newSubject.getAtomForProperty(shapes.prefLabel.uri),
      }
      setEntities([newEntity, ...entities])
      setEntityLoadingState({ status: "created", error: undefined })

      // save to localStorage
      setUserLocalEntities(auth0, newSubject.qname, shape.qname, "")

      // update highlighted tab
      if (tab !== 0) setTab(0)

      debug("before setEntity")
      await new Promise((resolve) => setTimeout(resolve, 3000)) // eslint-disable-line no-magic-numbers

      // go! redirect
      setEntity(newSubject)

      setCleanable(true)

      debug("end createResource")
    }
    createResource(shapeQname)
    debug("end createResource effect")
  }, [shapeQname])

  useEffect(() => {
    debug("updating EntityCreationContainer", entity, cleanable)
  })

  useEffect(() => {
    debug("useEffect cleanable", cleanable)

    const redirect = async () => {
      debug("before setRoute", cleanable)
      await new Promise((resolve) => setTimeout(resolve, 3000)) // eslint-disable-line no-magic-numbers

      if (subjectQname && propertyQname && index) {
        debug("redirect1")
        setRoute("/edit/" + entity.qname + "/" + shapeQname + "/" + subjectQname + "/" + propertyQname + "/" + index)
        /*
        return (
          <Redirect 
            to={"/edit/" + entity.qname + "/" + shapeQname + "/" + subjectQname + "/" + propertyQname + "/" + index}
          />
        )
        */
      } else {
        debug("redirect2")
        setRoute("/edit/" + entity.qname + "/" + shapeQname)
        /*
        return <Redirect to={"/edit/" + entity.qname + "/" + shapeQname} />
        */
      }
      debug("end redirect", cleanable)
    }
    if (entity && cleanable) {
      redirect()
    }
  }, [cleanable])

  if (entityLoadingState.status === "error") {
    debug("error")
    return (
      <p className="text-center text-muted">
        <NotFoundIcon className="icon mr-2" />
        {entityLoadingState.error}
      </p>
    )
  }
  debug("'creating'")
  return (
    <div>
      <div>{i18n.t("types.creating")}</div>
    </div>
  )
}

export default EntityCreationContainer
