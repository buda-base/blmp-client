import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { useRecoilState } from "recoil"
import { RDFResource, RDFResourceWithLabel, EntityGraph, Subject, Ontology, history } from "./types"
import { NodeShape, prefLabel } from "./shapes"
import { uriFromQname, BDSH_uri } from "./ns"
import { uiReadyState } from "../../atoms/common"
import { entitiesAtom, EditedEntityState, defaultEntityLabelAtom } from "../../containers/EntitySelectorContainer"
import { useAuth0 } from "@auth0/auth0-react"

export const shapeQnameToUri: Record<string, string> = {
  "bds:PersonShapeTest": "/shapes/personpreflabel.ttl",
  "bds:PersonShape": BDSH_uri + "PersonUIShapes",
  "bds:CorporationShape": BDSH_uri + "CorporationUIShapes",
  "bds:TopicShape": BDSH_uri + "TopicUIShapes",
  "bds:PlaceShape": BDSH_uri + "PlaceUIShapes",
  "bds:WorkShape": BDSH_uri + "WorkUIShapes",
  "bds:SerialWorkShape": BDSH_uri + "SerialWorkUIShapes",
}

export const fetchUrlFromshapeQname = (shapeQname: string): string => {
  return shapeQnameToUri[shapeQname]
}

export const fetchUrlFromEntityQname = (entityQname: string): string => {
  if (entityQname == "bdr:PTEST") return "/examples/ptest.ttl"
  return "http://editserv-dev.bdrc.io/focusGraph/" + entityQname
}

export const labelQueryUrlFromEntityQname = (entityQname: string): string => {
  if (entityQname == "bdr:PTEST") return "/examples/ptest-assocLabels.ttl"
  // TODO: a little approximative... but should work for now
  return (
    "https://ldspdi.bdrc.io/query/graph/getAssociatedLabels?R_GR=bdg:" +
    entityQname.substring(entityQname.indexOf(":") + 1) +
    "&format=ttl"
  )
}

const debug = require("debug")("bdrc:rdf:io")

export const debugStore = (s: rdf.Store, debugNs?: string) => {
  const defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
  const thisDebug = debugNs ? require("debug")(debugNs) : debug
  rdf.serialize(defaultRef, s, undefined, "text/turtle", function (err, str) {
    thisDebug(str)
  })
}

const acceptTtl = new Headers()
acceptTtl.set("Accept", "text/turtle")

export const loadTtl = async (url: string): Promise<rdf.Store> => {
  const response = await fetch(url, { headers: acceptTtl })
  // eslint-disable-next-line no-magic-numbers
  if (response.status != 200) throw "cannot fetch " + url
  const body = await response.text()
  const store: rdf.Store = rdf.graph()
  rdf.parse(body, store, rdf.Store.defaultGraphURI, "text/turtle")
  return store
}

export interface IFetchState {
  status: string
  error?: string
}

// maps of the shapes and entities that have been downloaded so far, with no gc
export const shapesMap: Record<string, NodeShape> = {}

export let ontologyConst: EntityGraph | undefined = undefined
export const ontologyUrl = "https://purl.bdrc.io/ontology/data/ttl"

export async function loadOntology(): Promise<EntityGraph> {
  debug("loading ontology")
  if (ontologyConst) {
    return Promise.resolve(ontologyConst)
  }
  const response = await fetch(ontologyUrl, { headers: acceptTtl })
  let body = await response.text()
  if (body.startsWith("BASE")) {
    const firstlineidx: number = body.indexOf("\n")
    if (firstlineidx > 1) body = body.substring(firstlineidx + 1)
  }
  const store: rdf.Store = rdf.graph()
  rdf.parse(body, store, rdf.Store.defaultGraphURI, "text/turtle")
  const res = new EntityGraph(store, ontologyUrl)
  ontologyConst = res
  debug("ontology loaded")
  return Promise.resolve(res)
}

export function ShapeFetcher(shapeQname: string) {
  const [loadingState, setLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [shape, setShape] = useState<NodeShape>()

  const reset = () => {
    setShape(undefined)
    setLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    if (shapeQname in shapesMap) {
      setLoadingState({ status: "fetched", error: undefined })
      setShape(shapesMap[shapeQname])
      return
    }
    async function fetchResource(shapeQname: string) {
      setLoadingState({ status: "fetching", error: undefined })
      const url = fetchUrlFromshapeQname(shapeQname)
      const loadRes = loadTtl(url)
      const loadOnto = loadOntology()
      try {
        const store = await loadRes
        const ontology = await loadOnto
        const shapeUri = uriFromQname(shapeQname)
        const shape: NodeShape = new NodeShape(rdf.sym(shapeUri), new EntityGraph(store, shapeUri), ontology)
        setLoadingState({ status: "fetched", error: undefined })
        setShape(shape)
      } catch (e) {
        setLoadingState({ status: "error", error: "error fetching shape or ontology" })
      }
    }
    fetchResource(shapeQname)
  }, [shapeQname])

  return { loadingState, shape, reset }
}

/*
export const setUserLocalEntities = async (auth: Auth0) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("localEntities")
}
*/

export const getUserLocalEntities = async (auth: Auth0) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("localEntities")
  if (!data) data = '{"unregistered":{}}'
  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email && data[auth.user.email]) return data[auth.user.email]
  return data["unregistered"]
}

export const setUserLocalEntities = async (auth: Auth0, rid: string, shape: string, ttl: string) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("localEntities"),
    userData
  if (!data) data = '{"unregistered":{}}'
  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email) {
    if (!data[auth.user.email]) data[auth.user.email] = {}
    userData = data[auth.user.email]
  } else userData = data["unregistered"]
  userData[rid] = { [shape]: ttl }
  localStorage.setItem("localEntities", JSON.stringify(data))
}

export function EntityFetcher(entityQname: string, shapeRef: RDFResourceWithLabel | null) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject>(Subject.createEmpty())
  const [uiReady, setUiReady] = useRecoilState(uiReadyState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const auth0 = useAuth0()

  const reset = () => {
    setEntity(Subject.createEmpty())
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    async function fetchResource(entityQname: string) {
      setEntityLoadingState({ status: "fetching", error: undefined })
      const fetchUrl = fetchUrlFromEntityQname(entityQname)
      const labelQueryUrl = labelQueryUrlFromEntityQname(entityQname)
      const entityUri = uriFromQname(entityQname)

      // TODO: UI "save draft" / "publish"

      let loadRes, loadLabels, localRes, useLocal, notFound
      const localEntities = await getUserLocalEntities(auth0)
      // 1 - check if entity has local edits (once shape is defined)
      if (shapeRef && localEntities[entityQname] !== undefined) {
        useLocal = window.confirm("found previous local edits for this resource, load them?")
        const store: rdf.Store = rdf.graph()
        if (useLocal)
          rdf.parse(localEntities[entityQname][shapeRef.qname], store, rdf.Store.defaultGraphURI, "text/turtle")
        else rdf.parse("", store, rdf.Store.defaultGraphURI, "text/turtle")
        localRes = store
      }

      // 2 - try to load data from server if not or if user wants to
      try {
        if (!useLocal) loadRes = await loadTtl(fetchUrl)
        else loadRes = localRes
        loadLabels = await loadTtl(labelQueryUrl)
      } catch (e) {
        // 3 - case when entity is not on server and user does not want to use local edits that already exist
        if (localRes) loadRes = localRes
        else notFound = true
      }

      try {
        // TODO: redirection to /new instead of "error fetching entity"? create missing entity?
        if (notFound) throw Error("not found")

        const entityStore = await loadRes
        const labelsStore = await loadLabels
        const subject: Subject = new Subject(
          new rdf.NamedNode(entityUri),
          new EntityGraph(entityStore, entityUri, labelsStore)
        )
        setEntityLoadingState({ status: "fetched", error: undefined })
        setEntity(subject)
        setUiReady(true)

        // update state with loaded entity
        let index = entities.findIndex((e) => e.subjectQname === entityQname)
        const newEntities = [...entities]
        if (index === -1) {
          newEntities.push({
            subjectQname: entityQname,
            state: EditedEntityState.Loading,
            shapeRef: shapeRef,
            subject: null,
            subjectLabelState: defaultEntityLabelAtom,
          })
          index = newEntities.length - 1
        }
        if (index >= 0 && newEntities[index] && !newEntities[index].subject) {
          newEntities[index] = {
            ...newEntities[index],
            subject,
            state: EditedEntityState.Saved,
            subjectLabelState: subject.getAtomForProperty(prefLabel.uri),
          }

          // DONE: issue #2 fixed, fully using getEntities
          setEntities(newEntities)

          debug("fetched")
        }
      } catch (e) {
        debug(e)
        setEntityLoadingState({ status: "error", error: "error fetching entity" })
      }
    }
    const index = entities.findIndex((e) => e.subjectQname === entityQname)
    if (index === -1 || entities[index] && !entities[index].subject) {
      fetchResource(entityQname)
    } else {
      setEntityLoadingState({ status: "fetched", error: undefined })
      const subj: Subject | null = entities[index].subject
      if (subj) setEntity(subj)
      setUiReady(true)
    }
  }, [entityQname, shapeRef])

  return { entityLoadingState, entity, reset }
}
