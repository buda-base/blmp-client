import * as rdf from 'rdflib'
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { fetchUrlFromTypeQname } from "./shapes"
import { RDFResource } from "./types"
import { getShape } from "./shapes"

const debug = require("debug")("bdrc:rdf:io")

export const debugStore = (s: rdf.Store, debugNs: String) => {
	const defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
  const debug = require("debug")(debugNs)
	rdf.serialize(defaultRef, s, undefined, 'text/turtle', function(err, str) { debug(str); });
}

export const loadTtl = async (url: string): Promise<rdf.Store> => {
  const response = await fetch(url);
  const body = await response.text();
  const store: rdf.Store = rdf.graph();
  rdf.parse(body, store, rdf.Store.defaultGraphURI, 'text/turtle');
  return store;
}

interface IFetchState {
    status: string;
    error?: string;
}

export function ShapeFetcher(typeQname: string) {
  const [loadingState, setLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [shape, setShape] = useState<RDFResource>()

  const reset = () => {
    setShape(undefined)
    setLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    async function fetchResource(typeQname: string) {
      setLoadingState({ status: "fetching", error: undefined })
      const url = fetchUrlFromTypeQname(typeQname)

      await loadTtl(url)
        .then(function (store: rdf.Store) {
          if (store) {
            const shape: RDFResource = getShape(typeQname, store)
            debug(store)
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
    fetchResource(typeQname)
  }, [typeQname])

  return { loadingState, shape, reset }
}
