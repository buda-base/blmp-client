import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { useRecoilState } from "recoil"
import { RDFResource, RDFResourceWithLabel, EntityGraph, Subject, Ontology } from "./types"
import { NodeShape, prefLabel } from "./shapes"
import { uriFromQname } from "./ns"
import { uiReadyState } from "../../atoms/common"
import { entitiesAtom, EditedEntityState, defaultEntityLabelAtom } from "../../containers/EntitySelectorContainer"

export const fetchUrlFromshapeQname = (shapeQname: string): string => {
  if (shapeQname == "bds:PersonShape") return "http://purl.bdrc.io/shapes/core/PersonUIShapes"
  return "/shapes/personpreflabel.ttl"
}

export const fetchUrlFromEntityQname = (shapeQname: string): string => {
  return "/examples/ptest.ttl"
}

export const labelQueryUrlFromEntityQname = (shapeQname: string): string => {
  return "/examples/ptest-assocLabels.ttl"
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

export let ontologyConst: Ontology | undefined = undefined
export const ontologyUrl = "http://purl.bdrc.io/ontology/core.ttl"

async function loadOntology(): Promise<Ontology> {
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
  const res = new Ontology(store)
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
        const shape: NodeShape = new NodeShape(rdf.sym(shapeUri), new EntityGraph(store, shapeUri))
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

export function EntityFetcher(entityQname: string, shapeRef: RDFResourceWithLabel | null) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject>()
  const [uiReady, setUiReady] = useRecoilState(uiReadyState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const reset = () => {
    setEntity(undefined)
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    async function fetchResource(entityQname: string) {
      setEntityLoadingState({ status: "fetching", error: undefined })
      if (entityQname != "bdr:P1583") throw "can't find " + entityQname
      const fetchUrl = fetchUrlFromEntityQname(entityQname)
      const labelQueryUrl = labelQueryUrlFromEntityQname(entityQname)
      const entityUri = uriFromQname(entityQname)

      const loadRes = loadTtl(fetchUrl)
      const loadLabels = loadTtl(labelQueryUrl)

      try {
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
          index = 0
          newEntities.push({
            subjectQname: entityQname,
            state: EditedEntityState.Loading,
            shapeRef: shapeRef,
            subject: null,
            subjectLabelState: defaultEntityLabelAtom,
          })
        }
        if (index >= 0 && newEntities[index] && !newEntities[index].subject) {
          newEntities[index] = {
            ...newEntities[index],
            subject,
            state: EditedEntityState.Saved,
            subjectLabelState: subject.getAtomForProperty(prefLabel.uri),
          }
          debug("newEntities ready", newEntities, entities)

          // TODO: better fix issue #2 before fully using getEntities....
          setEntities(newEntities)
        }
      } catch (e) {
        setEntityLoadingState({ status: "error", error: "error fetching entity" })
      }
    }
    const index = entities.findIndex((e) => e.subjectQname === entityQname)
    debug("entities", entities)
    if (index === -1 || entities[index] && !entities[index].subject) {
      debug("index", index)
      debug("entity", entities[index])
      //debug("entity.subject", entities[index])
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
