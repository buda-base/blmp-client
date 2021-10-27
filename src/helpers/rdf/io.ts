import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { useRecoilState } from "recoil"
import { RDFResource, RDFResourceWithLabel, EntityGraph, Subject, Ontology, history } from "./types"
import { NodeShape, prefLabel } from "./shapes"
import { uriFromQname, BDSH_uri } from "./ns"
import { uiReadyState, sessionLoadedState } from "../../atoms/common"
import { entitiesAtom, EditedEntityState, defaultEntityLabelAtom } from "../../containers/EntitySelectorContainer"
import { useAuth0 } from "@auth0/auth0-react"

let shapesbase = BDSH_uri
if (config.TEMPLATES_BASE) {
  shapesbase = shapesbase.replace("http://purl.bdrc.io/", config.TEMPLATES_BASE)
}

export const shapeQnameToUri: Record<string, string> = {
  "bds:PersonShapeTest": "/shapes/personpreflabel.ttl",
  "bds:PersonShape": shapesbase + "PersonUIShapes",
  "bds:CorporationShape": shapesbase + "CorporationUIShapes",
  "bds:TopicShape": shapesbase + "TopicUIShapes",
  "bds:PlaceShape": shapesbase + "PlaceUIShapes",
  "bds:WorkShape": shapesbase + "WorkUIShapes",
  "bds:SerialWorkShape": shapesbase + "SerialWorkUIShapes",
  "bds:InstanceShape": shapesbase + "InstanceUIShapes",
  "bds:ImagegroupShape": shapesbase + "ImagegroupUIShapes",
}

export const fetchUrlFromshapeQname = (shapeQname: string): string => {
  return shapeQnameToUri[shapeQname]
}

export const fetchUrlFromEntityQname = (entityQname: string): string => {
  if (entityQname == "bdr:PTEST") return "/examples/ptest.ttl"
  return "//editserv-dev.bdrc.io/focusGraph/" + entityQname
}

export const labelQueryUrlFromEntityQname = (entityQname: string): string => {
  if (entityQname == "bdr:PTEST") return "/examples/ptest-assocLabels.ttl"
  // TODO: a little approximative... but should work for now
  return (
    "//ldspdi.bdrc.io/query/graph/getAssociatedLabels?R_GR=bdg:" +
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

export const loadTtl = async (url: string, allow404 = false): Promise<rdf.Store> => {
  const response = await fetch(url, { headers: acceptTtl })
  // eslint-disable-next-line no-magic-numbers
  if (allow404 && response.status == 404) return rdf.graph()
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

export const getUserSession = async (auth: Auth0) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("session")
  if (!data) data = '{"unregistered":{}}'
  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email && data[auth.user.email]) return data[auth.user.email]
  else if (auth && !auth.isAuthenticated) return data["unregistered"]
  else return {}
}

export const setUserSession = async (auth: Auth0, rid: string, shape: string, label: string, del? = false) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("session"),
    userData
  if (!data) data = '{"unregistered":{}}'
  //debug("get:",data)

  const dataSav = data

  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email) {
    if (!data[auth.user.email]) data[auth.user.email] = {}
    userData = data[auth.user.email]
  } else userData = data["unregistered"]

  if (!del) userData[rid] = { shape, label }
  else if (userData[rid]) delete userData[rid]

  const dataNew = JSON.stringify(data)
  if (dataNew != dataSav) {
    //debug("set:", data, dataNew)
    localStorage.setItem("session", dataNew)
  }
}

export const getUserLocalEntities = async (auth: Auth0) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("localEntities")
  if (!data) data = '{"unregistered":{}}'
  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email && data[auth.user.email]) return data[auth.user.email]
  else if (auth && !auth.isAuthenticated) return data["unregistered"]
  else return {}
}

export const setUserLocalEntities = async (auth: Auth0, rid: string, shape: string, ttl: string, del?: boolean) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("localEntities"),
    userData
  if (!data) data = '{"unregistered":{}}'
  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email) {
    if (!data[auth.user.email]) data[auth.user.email] = {}
    userData = data[auth.user.email]
  } else userData = data["unregistered"]
  if (!del) userData[rid] = { [shape]: ttl }
  else if (userData[rid]) delete userData[rid]
  localStorage.setItem("localEntities", JSON.stringify(data))
}

export function EntityFetcher(entityQname: string, shapeRef: RDFResourceWithLabel | null) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject>(Subject.createEmpty())
  const [uiReady, setUiReady] = useRecoilState(uiReadyState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [sessionLoaded, setSessionLoaded] = useRecoilState(sessionLoadedState)
  const auth0 = useAuth0()

  const reset = () => {
    setEntity(Subject.createEmpty())
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    async function fetchResource(entityQname: string) {
      //debug("fetching", entityQname, entities)

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
        if (useLocal) {
          try {
            rdf.parse(localEntities[entityQname][shapeRef.qname], store, rdf.Store.defaultGraphURI, "text/turtle")
          } catch (e) {
            debug(e)
            debug(localEntities[entityQname][shapeRef.qname])
            window.alert("could not load local data, fetching remote version")
            useLocal = false
            delete localEntities[entityQname][shapeRef.qname]
          }
        } else {
          rdf.parse("", store, rdf.Store.defaultGraphURI, "text/turtle")
        }
        localRes = store
      }

      // 2 - try to load data from server if not or if user wants to
      try {
        if (!useLocal) loadRes = await loadTtl(fetchUrl)
        else loadRes = localRes
        loadLabels = await loadTtl(labelQueryUrl, true)
      } catch (e) {
        // 3 - case when entity is not on server and user does not want to use local edits that already exist
        if (localRes) loadRes = localRes
        else notFound = true
      }

      // load session before updating entities
      let _entities = entities
      if (!sessionLoaded) {
        const obj = await getUserSession(auth0)
        //debug("session:", obj)
        if (obj) {
          _entities = []
          for (const k of Object.keys(obj)) {
            _entities.push({
              subjectQname: k,
              subject: null,
              shapeRef: obj[k].shape,
              subjectLabelState: defaultEntityLabelAtom,
              state: EditedEntityState.NotLoaded,
              preloadedLabel: obj[k].label,
            })
          }
        }
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
        let index = _entities.findIndex((e) => e.subjectQname === entityQname)
        const newEntities = [..._entities]
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
            preloadedLabel: "",
          }

          // DONE: issue #2 fixed, fully using getEntities
          setEntities(newEntities)

          //debug("fetched")
        }
      } catch (e) {
        debug("e:", e.message, e)
        setEntityLoadingState({
          status: "error",
          error: e.message !== "not found" ? "error fetching entity" : "not found",
        })
        if (!entities.length && _entities.length) setEntities(_entities)
      }
      if (!sessionLoaded) setSessionLoaded(true)
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
