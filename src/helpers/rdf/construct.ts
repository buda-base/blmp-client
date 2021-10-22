import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { useRecoilState } from "recoil"
import * as ns from "./ns"
import { RDFResource, Subject, EntityGraph, RDFResourceWithLabel } from "./types"
import { NodeShape } from "./shapes"
import { IFetchState, shapesMap, fetchUrlFromshapeQname, loadOntology, loadTtl, setUserLocalEntities } from "./io"
import * as shapes from "./shapes"
import { entitiesAtom, EditedEntityState } from "../../containers/EntitySelectorContainer"
import { useAuth0 } from "@auth0/auth0-react"
import { nanoid, customAlphabet } from "nanoid"

const debug = require("debug")("bdrc:rdf:construct")

const NANOID_LENGTH = 8
const nanoidCustom = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", NANOID_LENGTH)

export const generateSubnode = (subshape: NodeShape, parent: RDFResource): Subject => {
  if (subshape.node.uri == "http://purl.bdrc.io/ontology/shapes/adm/AdmEntityShape") {
    // special case for admin entities
    return new Subject(new rdf.NamedNode(ns.BDA_uri + parent.lname), parent.graph)
  }
  let parentLname = ""
  let prefix = subshape.getPropStringValue(shapes.bdsIdentifierPrefix)
  if (prefix == null) throw "cannot find entity prefix for " + subshape.qname
  prefix += parentLname
  let namespace = subshape.getPropStringValue(shapes.shNamespace)
  parentLname = parent.lname
  if (namespace == null) namespace = parent.namespace
  let uri = namespace + prefix + nanoidCustom()
  while (parent.graph.hasSubject(uri)) {
    uri = namespace + prefix + nanoidCustom()
  }
  return new Subject(new rdf.NamedNode(uri), parent.graph)
}

export const reserveId = async (prefix: string, token: string): Promise<string> => {
  const url = "//editserv.bdrc.io/ID/prefix/" + prefix
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const body = await response.text()
  return body
}

export function EntityCreator(shapeQname: string) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject>()
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const { getAccessTokenSilently } = useAuth0()
  const [shape, setShape] = useState<NodeShape>()
  const auth0 = useAuth0()

  const reset = () => {
    debug("resetting")
    setEntity(undefined)
    setShape(undefined)
    setEntityLoadingState({ status: "idle", error: undefined })
    debug("resetted")
  }

  useEffect(() => {
    debug("constructing")
    let abort = false
    // we need to load the shape at the same time, which means we need to also
    // load the ontology
    async function createResource(shapeQname: string) {
      setEntityLoadingState({ status: "fetching shape", error: undefined })
      const url = fetchUrlFromshapeQname(shapeQname)
      const loadShape = loadTtl(url)
      const loadOnto = loadOntology()
      let shape: NodeShape
      try {
        const store = await loadShape
        const ontology = await loadOnto
        const shapeUri = ns.uriFromQname(shapeQname)
        shape = new NodeShape(rdf.sym(shapeUri), new EntityGraph(store, shapeUri), ontology)
        if (!abort) setShape(shape)
        debug("end 1st try", abort)
      } catch (e) {
        debug(e, abort)
        if (!abort) setEntityLoadingState({ status: "error", error: "error fetching shape" })
        return
      }

      const shapePrefix = shape.getPropStringValue(shapes.bdsIdentifierPrefix)
      let namespace = shape.getPropStringValue(shapes.shNamespace)
      if (namespace == null) namespace = ns.BDR_uri
      if (!abort) setEntityLoadingState({ status: "creating", error: undefined })
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
        debug("end 2nd try", abort)
      } catch (e) {
        debug(e, abort)
        if (!abort) setEntityLoadingState({ status: "error", error: "error logging or reserving id" })
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
      debug("before setEntities", abort)
      if (!abort) setEntities([newEntity, ...entities])
      debug("before setEntity", abort)
      if (!abort) setEntity(newSubject)
      debug("before setEntityLoadingState", abort)
      if (!abort) setEntityLoadingState({ status: "created", error: undefined })
      debug("after setEntities", abort)

      // save to localStorage
      if (!abort) setUserLocalEntities(auth0, newSubject.qname, shape.qname, "")
      debug("constructed", abort)
    }
    createResource(shapeQname)

    return () => {
      abort = true
      debug("aborting construct")
    }
  }, [shapeQname])

  return { entityLoadingState, entity, reset }
}
