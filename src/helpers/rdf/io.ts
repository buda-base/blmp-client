import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { useRecoilState } from "recoil"
import { RDFResource, RDFResourceWithLabel, EntityGraph, Subject, Ontology, history } from "./types"
import { NodeShape, prefLabel } from "./shapes"
import { uriFromQname, qnameFromUri, BDSH_uri } from "./ns"
import { profileIdState, uiReadyState, sessionLoadedState, reloadEntityState } from "../../atoms/common"
import { entitiesAtom, EditedEntityState, defaultEntityLabelAtom } from "../../containers/EntitySelectorContainer"
import { useAuth0, Auth0ContextInterface } from "@auth0/auth0-react"

let shapesbase = BDSH_uri
let profileshapesbase = "http://purl.bdrc.io/shapes/profile/"
if (config.TEMPLATES_BASE) {
  shapesbase = shapesbase.replace("http://purl.bdrc.io/", config.TEMPLATES_BASE)
  profileshapesbase = profileshapesbase.replace("http://purl.bdrc.io/", config.TEMPLATES_BASE)
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
  "bds:ImageInstanceShape": shapesbase + "ImageInstanceUIShapes",
  "bds:RoleShape": shapesbase + "RoleUIShapes",
  "bds:CollectionShape": shapesbase + "CollectionUIShapes",
  "bds:ImagegroupShape": shapesbase + "ImagegroupUIShapes",
  "bds:UserProfileShape": profileshapesbase + "UserProfileUIShapes",
}

export const fetchUrlFromshapeQname = (shapeQname: string): string => {
  return shapeQnameToUri[shapeQname]
}

export const fetchUrlFromEntityQname = (entityQname: string): string => {
  if (entityQname == "bdr:PTEST") return "/examples/ptest.ttl"
  // TODO: /me fails when fetched from editserv-dev, bypassing
  else if (entityQname == "tmp:user") return "//editserv.bdrc.io/resource-nc/user/me"
  return config.API_BASEURL + entityQname + "/focusGraph"
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

const acceptTtlWithToken = new Headers()
acceptTtlWithToken.set("Accept", "text/turtle")

export const loadTtl = async (
  url: string,
  allow404 = false,
  idToken = "",
  handleEtag = false
): Promise<rdf.Store | Map<string, any>> => {
  return new Promise(async (resolve, reject) => {
    if (idToken) {
      acceptTtlWithToken.set("Authorization", "Bearer " + idToken)
    } else {
      acceptTtlWithToken.delete("Authorization")
    }
    const response = await fetch(url, { headers: idToken ? acceptTtlWithToken : acceptTtl })
    const etag = response.headers.get("etag")

    // eslint-disable-next-line no-magic-numbers
    if (allow404 && response.status == 404) resolve(rdf.graph())
    // eslint-disable-next-line no-magic-numbers
    if (response.status != 200) reject(new Error("cannot fetch " + url))

    if (handleEtag && !etag) reject(new Error("no etag returned from " + url))

    const body = await response.text()
    //debug("ttl:",body)
    const store: rdf.Store = rdf.graph()
    rdf.parse(body, store, rdf.Store.defaultGraphURI, "text/turtle")
    if (handleEtag) resolve({ store, etag })
    else resolve(store)
  })
}

export const putTtl = async (
  url: string,
  s: rdf.Store,
  idToken: string,
  method = "PUT",
  message = "",
  previousEtag = false
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
    rdf.serialize(defaultRef, s, undefined, "text/turtle", async function (err, str) {
      const headers = new Headers()
      headers.set("Content-Type", "text/turtle")
      headers.set("Authorization", "Bearer " + idToken)
      if (message) headers.set("X-Change-Message", message)
      if (previousEtag) headers.set("If-Match", previousEtag)

      const response = await fetch(url, { headers, method, body: str })
      const etag = response.headers.get("etag")

      // eslint-disable-next-line no-magic-numbers
      if (response.status == 403) reject(new Error("not authorized to modify " + url))
      // eslint-disable-next-line no-magic-numbers
      if (response.status > 400) reject(new Error("error when saving " + url))

      if (!previousEtag && !etag) reject(new Error("no etag returned from " + url))

      resolve(etag)
    })
  })
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
  const [current, setCurrent] = useState(shapeQname)

  //debug("fetcher: shape ", shapeQname, current, shape)

  useEffect(() => {
    if (current != shapeQname) {
      reset()
    }
  })

  const reset = () => {
    setCurrent(shapeQname)
    setShape(undefined)
    setLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    //debug("shM:",shapesMap)
    if (shape && shapeQname === current && loadingState.status === "fetched") {
      return
    }
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
        //debug("shape:",shape,store)
        setShape(shape)
        shapesMap[shapeQname] = shape
      } catch (e) {
        setLoadingState({ status: "error", error: "error fetching shape or ontology" })
      }
    }
    if (current === shapeQname) fetchResource(shapeQname)
  }, [current])

  const retVal =
    shapeQname === current && shape && shapeQname == shape.qname
      ? { loadingState, shape, reset }
      : { loadingState: { status: "loading", error: undefined }, shape: undefined, reset }

  return retVal //{ loadingState, shape, reset }
}

/*
export const setUserLocalEntities = async (auth: Auth0) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("localEntities")
}
*/

export const getUserSession = async (auth: Auth0ContextInterface) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("session")
  if (!data) data = '{"unregistered":{}}'
  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email && data[auth.user.email]) return data[auth.user.email]
  else if (auth && !auth.isAuthenticated) return data["unregistered"]
  else return {}
}

export const setUserSession = async (
  auth: Auth0ContextInterface,
  rid: string,
  shape: string,
  label: string,
  del = false,
  etag: string
) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("session"),
    userData
  if (!data) data = '{"unregistered":{}}'

  //debug("session get:", data, rid, shape, label)

  const dataSav = data

  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email) {
    if (!data[auth.user.email]) data[auth.user.email] = {}
    userData = data[auth.user.email]
  } else userData = data["unregistered"]

  if (!del) userData[rid] = { shape, label, etag }
  else if (userData[rid]) delete userData[rid]

  const dataNew = JSON.stringify(data)
  if (dataNew != dataSav) {
    //debug("session set:", data, dataNew)
    localStorage.setItem("session", dataNew)
  }
}

export const getUserLocalEntities = async (auth: Auth0ContextInterface) => {
  //debug("auth:", auth)
  let data = localStorage.getItem("localEntities")
  if (!data) data = '{"unregistered":{}}'
  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email && data[auth.user.email]) return data[auth.user.email]
  else if (auth && !auth.isAuthenticated) return data["unregistered"]
  else return {}
}

export const setUserLocalEntities = async (
  auth: Auth0ContextInterface,
  rid: string,
  shapeQname: string,
  ttl: string,
  del: boolean,
  userId: string,
  etag: string
) => {
  debug("auth:", auth, shapeQname)
  let data = localStorage.getItem("localEntities"),
    userData
  if (!data) data = '{"unregistered":{}}'
  data = await JSON.parse(data)
  if (auth && auth.user && auth.user.email) {
    if (!data[auth.user.email]) data[auth.user.email] = {}
    userData = data[auth.user.email]
  } else userData = data["unregistered"]
  // TODO: also check if rid is current user's
  if (userId === rid && shapeQname?.includes("UserProfile")) rid = "tmp:user"
  if (!del) userData[rid] = { shapeQname, ttl, etag }
  else if (userData[rid]) delete userData[rid]
  localStorage.setItem("localEntities", JSON.stringify(data))
}

export function EntityFetcher(entityQname: string, shapeRef: RDFResourceWithLabel | null, unmounting = false) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject>(Subject.createEmpty())
  const [uiReady, setUiReady] = useRecoilState(uiReadyState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [sessionLoaded, setSessionLoaded] = useRecoilState(sessionLoadedState)
  const auth0 = useAuth0()
  const { isAuthenticated, getIdTokenClaims } = useAuth0()
  const [idToken, setIdToken] = useState("")
  const [profileId, setProfileId] = useRecoilState(profileIdState)
  const [current, setCurrent] = useState(entityQname)
  const [reloadEntity, setReloadEntity] = useRecoilState(reloadEntityState)

  useEffect(() => {
    return () => {
      //debug("unm:ef")
      unmounting = true
    }
  }, [])

  useEffect(() => {
    if (unmounting) return
    if (current != entityQname) {
      reset()
    }
  })

  useEffect(() => {
    if (unmounting) return
    async function checkSession() {
      const idToken = await getIdTokenClaims()
      setIdToken(idToken.__raw)
    }
    if (/*entityQname === "tmp:user" &&*/ isAuthenticated) checkSession()
    else getAccessTokenSilently()
  }, [getIdTokenClaims, isAuthenticated, entityQname])

  const reset = () => {
    setCurrent(entityQname)
    setEntity(Subject.createEmpty())
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    if (unmounting) return
    async function fetchResource(entityQname: string) {
      setEntityLoadingState({ status: "fetching", error: undefined })
      const fetchUrl = fetchUrlFromEntityQname(entityQname)
      const labelQueryUrl = labelQueryUrlFromEntityQname(entityQname)
      const entityUri = uriFromQname(entityQname)

      debug("fetching", entity, entityQname, fetchUrl, labelQueryUrl, entityUri, entities) //, isAuthenticated, idToken)

      // TODO: UI "save draft" / "publish"

      let loadRes, loadLabels, localRes, useLocal, notFound, etag
      const localEntities = await getUserLocalEntities(auth0)
      // 1 - check if entity has local edits (once shape is defined)
      //debug("local?", entityQname, localEntities[entityQname])
      if (shapeRef && localEntities[entityQname] !== undefined) {
        useLocal = window.confirm("found previous local edits for this resource, load them?")
        const store: rdf.Store = rdf.graph()
        if (useLocal) {
          try {
            rdf.parse(localEntities[entityQname].ttl, store, rdf.Store.defaultGraphURI, "text/turtle")
            etag = localEntities[entityQname].etag
          } catch (e) {
            debug(e)
            debug(localEntities[entityQname])
            window.alert("could not load local data, fetching remote version")
            useLocal = false
            delete localEntities[entityQname]
          }
        } else {
          rdf.parse("", store, rdf.Store.defaultGraphURI, "text/turtle")
        }
        localRes = store
      }

      // 2 - try to load data from server if not or if user wants to
      try {
        if (!useLocal) loadRes = await loadTtl(fetchUrl, false, idToken, true)
        else loadRes = localRes
        loadLabels = await loadTtl(labelQueryUrl, true)
      } catch (e) {
        // 3 - case when entity is not on server and user does not want to use local edits that already exist
        if (localRes) loadRes = { store: localRes, etag }
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
              alreadySave: obj[k].etag,
            })
          }
        }
      }

      try {
        // TODO: redirection to /new instead of "error fetching entity"? create missing entity?
        if (notFound) throw Error("not found")

        const res = await loadRes
        etag = res.etag
        const entityStore = res.store
        const labelsStore = await loadLabels

        let actualQname = entityQname,
          actualUri = entityUri
        if (entityQname === "tmp:user") {
          // TODO: in several steps with tests to avoid crash
          const keys = Object.keys(entityStore.subjectIndex)
          actualQname = qnameFromUri(keys[0].replace(/(^<)|(>$)/g, ""))
          actualUri = uriFromQname(actualQname)
          if (!profileId) setProfileId(actualQname)
        }

        const subject: Subject = new Subject(
          new rdf.NamedNode(actualUri),
          new EntityGraph(entityStore, actualUri, labelsStore)
        )
        // update state with loaded entity
        let index = _entities.findIndex((e) => e.subjectQname === actualQname)
        const newEntities = [..._entities]
        if (index === -1) {
          newEntities.push({
            subjectQname: actualQname,
            state: EditedEntityState.Loading,
            shapeRef: shapeRef,
            subject: null,
            subjectLabelState: defaultEntityLabelAtom,
            alreadySaved: etag,
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
            alreadySaved: etag,
          }

          // DONE: issue #2 fixed, fully using getEntities
          setEntities(newEntities)

          //debug("fetched")
        }
        setEntityLoadingState({ status: "fetched", error: undefined })
        setEntity(subject)
        setUiReady(true)

        if (reloadEntity) setReloadEntity("")
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
    const index = entities.findIndex(
      (e) => e.subjectQname === entityQname || entityQname == "tmp:user" && e.subjectQname === profileId
    )
    if (
      reloadEntity === entityQname && !entities[index].subject ||
      current === entityQname && (index === -1 || entities[index] && !entities[index].subject)
    ) {
      if (entityQname != "tmp:user" || idToken) fetchResource(entityQname)
    } else {
      if (unmounting) return
      else setEntityLoadingState({ status: "fetched", error: undefined })

      const subj: Subject | null = entities[index] ? entities[index].subject : null

      if (unmounting) return
      else if (subj) setEntity(subj)

      if (unmounting) return
      else setUiReady(true)
    }
  }, [current, shapeRef, idToken, profileId, reloadEntity])

  const retVal =
    entityQname === current
      ? { entityLoadingState, entity, reset }
      : { entityLoadingState: { status: "loading", error: undefined }, entity: Subject.createEmpty(), reset }

  return retVal
}
