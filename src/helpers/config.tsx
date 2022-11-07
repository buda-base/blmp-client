import React, { useState, useEffect } from "react"
import * as rdf from "rdflib"
import config from "../config"
import {
  NodeShape,
  RDEConfig,
  LocalEntityInfo,
  fetchTtl,
  IFetchState,
  RDFResource,
  Subject,
  EntityGraph,
  ExtRDFResourceWithLabel,
  Entity,
  BUDAResourceSelector,
  ValueByLangToStrPrefLang,
  ns,
} from "rdf-document-editor"

import { customAlphabet } from "nanoid"
import edtf, { parse } from "edtf" // see https://github.com/inukshuk/edtf.js/issues/36#issuecomment-1073778277
import { debug as debugFactory } from "debug"

const debug = debugFactory("rde:entity:container:demo")

const NANOID_LENGTH = 8
const nanoidCustom = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", NANOID_LENGTH)

export const BDR_uri = "http://purl.bdrc.io/resource/"
export const BDR = rdf.Namespace(BDR_uri)
export const BDS_uri = "http://purl.bdrc.io/ontology/shapes/core/"
export const BDS = rdf.Namespace(BDS_uri)
export const BDSA_uri = "http://purl.bdrc.io/ontology/shapes/adm/"
export const BDSA = rdf.Namespace(BDSA_uri)
export const BDSH_uri = "http://purl.bdrc.io/shapes/core/"
export const BDSH = rdf.Namespace(BDSH_uri)
export const BDO_uri = "http://purl.bdrc.io/ontology/core/"
export const BDO = rdf.Namespace(BDO_uri)
export const ADM_uri = "http://purl.bdrc.io/ontology/admin/"
export const ADM = rdf.Namespace(ADM_uri)
export const BDG_uri = "http://purl.bdrc.io/graph/"
export const BDG = rdf.Namespace(BDG_uri)
export const BDA_uri = "http://purl.bdrc.io/admindata/"
export const BDA = rdf.Namespace(BDA_uri)
export const TMP_uri = "http://purl.bdrc.io/ontology/tmp/"
export const TMP = rdf.Namespace(TMP_uri)
export const BDOU_uri = "http://purl.bdrc.io/ontology/ext/user/"
export const BDOU = rdf.Namespace(BDOU_uri)
export const BDU_uri = "http://purl.bdrc.io/resource-nc/user/"
export const BDU = rdf.Namespace(BDU_uri)
export const FOAF_uri = "http://xmlns.com/foaf/0.1/"
export const FOAF = rdf.Namespace(FOAF_uri)

export const prefixMap = new ns.PrefixMap({
  rdfs: ns.RDFS_uri,
  rdf: ns.RDF_uri,
  skos: ns.SKOS_uri,
  bdr: BDR_uri,
  bdo: BDO_uri,
  bds: BDS_uri,
  bdsh: BDSH_uri,
  adm: ADM_uri,
  dash: ns.DASH_uri,
  owl: ns.OWL_uri,
  sh: ns.SH_uri,
  xsd: ns.XSD_uri,
  bdg: BDG_uri,
  bda: BDA_uri,
  bdsa: BDSA_uri,
  tmp: TMP_uri,
  bdou: BDOU_uri,
  bdu: BDU_uri,
  foaf: FOAF_uri,
})

export const shapeRefsMap: Record<string, ExtRDFResourceWithLabel> = {
  "bds:PersonShapeTest": new ExtRDFResourceWithLabel(BDS("PersonShapeTest").value, { en: "Test (Person)" }),
  "bds:PersonShape": new ExtRDFResourceWithLabel(BDS("PersonShape").value, { en: "Person" }),
  "bds:CorporationShape": new ExtRDFResourceWithLabel(BDS("CorporationShape").value, { en: "Corporation" }),
  "bds:CollectionShape": new ExtRDFResourceWithLabel(BDS("CollectionShape").value, { en: "Collection" }),
  "bds:RoleShape": new ExtRDFResourceWithLabel(BDS("RoleShape").value, { en: "Role" }),
  "bds:TopicShape": new ExtRDFResourceWithLabel(BDS("TopicShape").value, { en: "Topic" }),
  "bds:PlaceShape": new ExtRDFResourceWithLabel(BDS("PlaceShape").value, { en: "Place" }),
  "bds:WorkShape": new ExtRDFResourceWithLabel(BDS("WorkShape").value, { en: "Work" }),
  "bds:SerialWorkShape": new ExtRDFResourceWithLabel(BDS("SerialWorkShape").value, { en: "Serial Work" }),
  "bds:InstanceShape": new ExtRDFResourceWithLabel(BDS("InstanceShape").value, { en: "Instance (Version)" }),
  "bds:ImageInstanceShape": new ExtRDFResourceWithLabel(BDS("ImageInstanceShape").value, {
    en: "Image instance (Scans)",
  }),
  "bds:EtextInstanceShape": new ExtRDFResourceWithLabel(BDS("EtextInstanceShape").value, {
    en: "Etext instance",
  }),
  "bds:ImagegroupShape": new ExtRDFResourceWithLabel(BDS("ImagegroupShape").value, { en: "Image group" }),
  "bds:UserProfileShape": new ExtRDFResourceWithLabel(BDS("UserProfileShape").value, { en: "User profile" }),
}

export const possibleShapeRefs: Array<ExtRDFResourceWithLabel> = [
  shapeRefsMap["bds:InstanceShape"],
  shapeRefsMap["bds:PersonShape"],
  shapeRefsMap["bds:PlaceShape"],
  shapeRefsMap["bds:TopicShape"],
  shapeRefsMap["bds:SerialWorkShape"],
  shapeRefsMap["bds:CorporationShape"],
  shapeRefsMap["bds:RoleShape"],
  shapeRefsMap["bds:CollectionShape"],
  // removed from the UI
  //shapeRefsMap["bds:WorkShape"],
  //shapeRefsMap["bds:ImageInstanceShape"],
  //shapeRefsMap["bds:UserProfileShape"],
  //shapeRefsMap["bds:ImagegroupShape"],
  //shapeRefsMap["bds:PersonShapeTest"],
]

export const typeUriToShape: Record<string, Array<ExtRDFResourceWithLabel>> = {}
typeUriToShape[BDO_uri + "Person"] = [shapeRefsMap["bds:PersonShape"] /*, shapeRefsMap["bds:PersonShapeTest"] */]
typeUriToShape[BDO_uri + "Topic"] = [shapeRefsMap["bds:TopicShape"]]
typeUriToShape[BDO_uri + "Place"] = [shapeRefsMap["bds:PlaceShape"]]
typeUriToShape[BDO_uri + "Instance"] = [shapeRefsMap["bds:InstanceShape"]]
typeUriToShape[BDO_uri + "ImageInstance"] = [shapeRefsMap["bds:ImageInstanceShape"]]
typeUriToShape[BDO_uri + "EtextInstance"] = [shapeRefsMap["bds:EtextInstanceShape"]]
typeUriToShape[BDO_uri + "Role"] = [shapeRefsMap["bds:RoleShape"]]
typeUriToShape[BDO_uri + "Collection"] = [shapeRefsMap["bds:CollectionShape"]]
typeUriToShape[BDO_uri + "Imagegroup"] = [shapeRefsMap["bds:ImagegroupShape"]]
typeUriToShape[BDO_uri + "Corporation"] = [shapeRefsMap["bds:CorporationShape"]]
typeUriToShape[BDO_uri + "Work"] = [shapeRefsMap["bds:WorkShape"]]
typeUriToShape[BDO_uri + "SerialWork"] = [shapeRefsMap["bds:SerialWorkShape"]]

export const reserveLname = async (
  prefix: string,
  proposedLname: string | null,
  token: string,
  n = 1
): Promise<string> => {
  let url = config.API_BASEURL + "ID/" + prefix
  if (proposedLname) url += "/" + proposedLname
  else if (n > 1) url += "?n=" + n
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  // eslint-disable-next-line no-magic-numbers
  if (response.status == 422) throw "422"
  const body = await response.text()
  return body
}

export const generateSubnodes = async (
  subshape: NodeShape,
  parent: RDFResource,
  userPrefix: string,
  idToken: string | null,
  n = 1
): Promise<Subject[]> => {
  if (subshape.node.uri.startsWith("http://purl.bdrc.io/ontology/shapes/adm/AdmEntityShape")) {
    // special case for admin entities
    // in that case n can never be 1
    const res = new Subject(new rdf.NamedNode(BDA_uri + parent.lname), parent.graph)
    return Promise.resolve([res])
  }
  let prefix = subshape.getPropStringValue(ns.rdeIdentifierPrefix)
  if (prefix == null) throw "cannot find entity prefix for " + subshape.qname
  let namespace = subshape.getPropStringValue(ns.shNamespace)
  if (namespace == null) namespace = parent.namespace
  if (subshape.independentIdentifiers) {
    prefix += userPrefix
    if (!idToken) return Promise.reject("no token when reserving id")
    const reservedId = await reserveLname(prefix, null, idToken, n)
    if (n == 1) {
    const res = new Subject(new rdf.NamedNode(namespace + reservedId), parent.graph)
      return Promise.resolve([res])
    } else {
      const res = reservedId.split(/[ \n]+/).map((id) => new Subject(new rdf.NamedNode(namespace + id), parent.graph))
      return Promise.resolve(res)
    }
  }
  const res: Subject[] = []
  for (let i = 0 ; i < n ; i ++) {
    let uri = namespace + prefix + parent.lname + nanoidCustom()
    while (parent.graph.hasSubject(uri)) {
      // make sure there's no duplicates
      uri = namespace + prefix + nanoidCustom()
    }
    res.push(new Subject(new rdf.NamedNode(uri), parent.graph))
  }
  return Promise.resolve(res)
}

const entity_prefix_3 = ["WAS", "ITW", "PRA"]
const entity_prefix_2 = ["WA", "MW", "PR", "IE", "UT", "IT"]

export const removeEntityPrefix = (lname: string): string => {
  if (lname.length > 3 && entity_prefix_3.includes(lname.substring(0, 3))) return lname.substring(3)
  if (lname.length > 2 && entity_prefix_2.includes(lname.substring(0, 2))) return lname.substring(2)
  return lname.substring(1)
}

const typeToURIPrefix = (type: RDFResource): string | null => {
  const typeLname = type.lname
  if (typeLname == "Work") return BDR_uri+"WA"
  if (typeLname == "Instance") return BDR_uri+"MW"
  if (typeLname == "ImageInstance") return BDR_uri+"W"
  if (typeLname == "EtextInstance") return BDR_uri+"IE"
  if (typeLname == "SerialWork") return BDR_uri+"WAS"
  return null
}

const generateConnectedID = async (old_resource: RDFResource, old_shape: NodeShape, type: RDFResource): Promise<rdf.NamedNode> => {
  const unprefixedLname = removeEntityPrefix(old_resource.lname)
  const newURI = typeToURIPrefix(type)
  if (newURI == null)
    return Promise.reject("cannot generate connected ID for "+old_resource.uri)
  return Promise.resolve(rdf.sym(newURI + unprefixedLname))
}
