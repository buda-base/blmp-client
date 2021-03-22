import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { useRecoilState } from "recoil"
import { RDFResource, NodeShape, EntityGraph, Subject } from "./types"
import { uriFromQname } from "./ns"
import { uiReadyState } from "../../atoms/common"

export const fetchUrlFromshapeQname = (shapeQname: string): string => {
  return "/shapes/personpreflabel.ttl"
}

export const fetchUrlFromEntityQname = (shapeQname: string): string => {
  return "/examples/ptest.ttl"
}

const debug = require("debug")("bdrc:rdf:io")

export const debugStore = (s: rdf.Store, debugNs?: string) => {
  const defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
  const thisDebug = debugNs ? require("debug")(debugNs) : debug
  rdf.serialize(defaultRef, s, undefined, "text/turtle", function (err, str) {
    debug(str)
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

interface IFetchState {
  status: string
  error?: string
}

// maps of the shapes and entities that have been downloaded so far, with no gc
export const shapesMap: Record<string, NodeShape> = {}

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

      await loadTtl(url)
        .then(function (store: rdf.Store) {
          if (store) {
            const shapeUri = uriFromQname(shapeQname)
            const shape: NodeShape = new NodeShape(rdf.sym(shapeUri), new EntityGraph(store, shapeUri))
            setLoadingState({ status: "fetched", error: undefined })
            setShape(shape)
          } else {
            setLoadingState({ status: "error", error: "can't find shape" })
          }
        })
        .catch(function (error) {
          if (error.response && error.response.data.output.payload.error === "Not Found") {
            setLoadingState({ status: "error", error: "No records found" })
          } else {
            setLoadingState({ status: "error", error: "Unable to process" })
          }
        })
    }
    fetchResource(shapeQname)
  }, [shapeQname])

  return { loadingState, shape, reset }
}

export function EntityFetcher(entityQname: string) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject>()
  const [uiReady, setUiReady] = useRecoilState(uiReadyState)
  // TODO: use to update state & subject
  // const [entities, setEntities] = useRecoilState(entitiesAtom)

  const reset = () => {
    setEntity(undefined)
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    async function fetchResource(entityQname: string) {
      setEntityLoadingState({ status: "fetching", error: undefined })
      const url = fetchUrlFromEntityQname(entityQname)

      await loadTtl(url)
        .then(function (store: rdf.Store) {
          if (store) {
            const uri = uriFromQname(entityQname)
            const subject: Subject = new Subject(new rdf.NamedNode(uri), new EntityGraph(store, uri))
            debug(subject)
            setEntityLoadingState({ status: "fetched", error: undefined })
            setEntity(subject)
            setUiReady(true)
          } else {
            setEntityLoadingState({ status: "error", error: "can't find shape" })
          }
        })
        .catch(function (error) {
          debug(error)
          if (error.response && error.response.data.output.payload.error === "Not Found") {
            setEntityLoadingState({ status: "error", error: "No records found" })
          } else {
            setEntityLoadingState({ status: "error", error: "Unable to process" })
          }
        })
    }
    fetchResource(entityQname)
  }, [entityQname])

  return { entityLoadingState, entity, reset }
}
