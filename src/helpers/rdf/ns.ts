import * as rdf from "rdflib"

export const BDR_uri = "http://purl.bdrc.io/resource/"
export const BDR = rdf.Namespace(BDR_uri)
export const BDS_uri = "http://purl.bdrc.io/ontology/shapes/core/"
export const BDS = rdf.Namespace(BDS_uri)
export const BDO_uri = "http://purl.bdrc.io/ontology/core/"
export const BDO = rdf.Namespace(BDO_uri)
export const ADM_uri = "http://purl.bdrc.io/ontology/admin/"
export const ADM = rdf.Namespace(ADM_uri)
export const DASH_uri = "http://datashapes.org/dash#"
export const DASH = rdf.Namespace(DASH_uri)
export const OWL_uri = "http://www.w3.org/2002/07/owl#"
export const OWL = rdf.Namespace(OWL_uri)
export const RDFS_uri = "http://www.w3.org/2000/01/rdf-schema#"
export const RDFS = rdf.Namespace(RDFS_uri)
export const SH_uri = "http://www.w3.org/ns/shacl#"
export const SH = rdf.Namespace(SH_uri)
export const RDF_uri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
export const RDF = rdf.Namespace(RDF_uri)
export const SKOS_uri = "http://www.w3.org/2004/02/skos/core#"
export const SKOS = rdf.Namespace(SKOS_uri)
export const XSD_uri = "http://www.w3.org/2001/XMLSchema#"
export const XSD = rdf.Namespace(XSD_uri)
export const BDG_uri = "http://purl.bdrc.io/graph/"
export const BDG = rdf.Namespace(BDG_uri)
export const BDA_uri = "http://purl.bdrc.io/admindata/"
export const BDA = rdf.Namespace(BDA_uri)

const debug = require("debug")("bdrc:rdf:ns")

export const prefixToURI: { [key: string]: string } = {
  bdr: BDR_uri,
  bdo: BDO_uri,
  bds: BDS_uri,
  adm: ADM_uri,
  dash: DASH_uri,
  owl: OWL_uri,
  rdfs: RDFS_uri,
  sh: SH_uri,
  rdf: RDF_uri,
  skos: SKOS_uri,
  xsd: XSD_uri,
  bdg: BDG_uri,
  bda: BDA_uri,
}

export const URItoPrefix: { [key: string]: string } = {}
for (const [prefix, uri] of Object.entries(prefixToURI)) {
  URItoPrefix[uri] = prefix
}

export const setDefaultPrefixes = (s: rdf.Store): void => {
  for (const [prefix, uri] of Object.entries(prefixToURI)) {
    s.setPrefixForURI(prefix, uri)
  }
  s.setPrefixForURI("", BDO_uri)
}

export const qnameFromUri = (uri = ""): string => {
  if (uri.match(/^[^:/#]+:[^:/#]+$/)) return uri

  let j = uri.indexOf("#")
  if (j < 0) j = uri.lastIndexOf("/")
  if (j < 0) throw new Error("Cannot make qname out of <" + uri + ">")

  const localid = uri.slice(j + 1)
  const namesp = uri.slice(0, j + 1)
  const prefix = URItoPrefix[namesp]
  if (!prefix) throw new Error("Cannot make qname out of <" + uri + ">")

  return prefix + ":" + localid
}

export const lnameFromUri = (uri: string): string => {
  let j = uri.indexOf("#")
  if (j < 0) j = uri.lastIndexOf("/")
  if (j < 0) throw new Error("Cannot make qname out of <" + uri + ">")

  return uri.slice(j + 1)
}

export const namespaceFromUri = (uri: string): string => {
  let j = uri.indexOf("#")
  if (j < 0) j = uri.lastIndexOf("/")
  if (j < 0) throw new Error("Cannot make namespace out of <" + uri + ">")

  return uri.slice(0, j)
}

export const uriFromQname = (qname = ""): string => {
  const j = qname.indexOf(":")

  if (j < 0) throw new Error("Cannot make uri out of <" + qname + ">")

  const localid = qname.slice(j + 1)
  const prefix = qname.slice(0, j)
  const uri_base = prefixToURI[prefix]

  if (!uri_base) throw new Error("Cannot make uri out of <" + qname + ">")

  return uri_base + localid
}
