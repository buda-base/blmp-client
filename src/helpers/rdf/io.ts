import * as rdf from 'rdflib'
import config from "../../config"
import { useState, useEffect, useContext } from "react"

const debug = require("debug")("bdrc:rdf:io")

export const debugStore = (s: rdf.Store, ns: String) => {
	const defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
  const debug = require("debug")(ns)
	rdf.serialize(defaultRef, s, undefined, 'text/turtle', function(err, str) { debug(str); });
}

export const loadTtl = async (url: string): Promise<rdf.Store> => {
  const response = await fetch(url);
  const body = await response.text();
  const store: rdf.Store = rdf.graph();
  rdf.parse(body, store, rdf.Store.defaultGraphURI, 'text/turtle');
  return store;
}

const urlFromType = (type:string): string => {
  return "/shapes/personpreflabel.ttl"
}

interface IFetchState {
    status: string;
    error?: string;
}

interface IStore {
    store?: rdf.Store
}

export function ShapeFetcher(type: string) {
  const [loadingState, setLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [resource, setResource] = useState<IStore>({ store: undefined })

  const reset = () => {
    setResource({ store: undefined })
    setLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    async function fetchResource(type: string) {
      setLoadingState({ status: "fetching", error: undefined })
      const url = urlFromType(type)

      await loadTtl(url)
        .then(function (response) {
          if (response) {
            setLoadingState({ status: "fetched", error: undefined })
            setResource({ store: response })
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
    fetchResource(type)
  }, [type])

  return { loadingState, resource, reset }
}
