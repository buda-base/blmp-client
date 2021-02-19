import * as rdf from 'rdflib'
import { RDFResource } from "./types"
import { uriFromQname } from "./ns"

const debug = require("debug")("bdrc:rdf:shapes")

export const fetchUrlFromTypeQname = (typeQname: string): string => {
  return "/shapes/personpreflabel.ttl"
}

export const getShape = (typeQname:string, store: rdf.Store):RDFResource => {
  const uri:string = uriFromQname(typeQname)
  return { node: { value: uri }, store: store }
}
