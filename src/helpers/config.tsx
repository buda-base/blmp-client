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
  HttpError
} from "rdf-document-editor"
import i18n from "i18next"
import "./jsewts.d.ts"

import { fromWylie } from "jsewts"

import { customAlphabet } from "nanoid"
import edtf, { parse } from "edtf" // see https://github.com/inukshuk/edtf.js/issues/36#issuecomment-1073778277
import { debug as debugFactory } from "debug"
import fetchToCurl from "fetch-to-curl"

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

let shapesbase = BDSH_uri
let profileshapesbase = "http://purl.bdrc.io/shapes/profile/"
if (config.TEMPLATES_BASE) {
  shapesbase = shapesbase.replace("http://purl.bdrc.io/", config.TEMPLATES_BASE)
  profileshapesbase = profileshapesbase.replace("http://purl.bdrc.io/", config.TEMPLATES_BASE)
}

export const shapeUriToFetchUri: Record<string, string> = {
  [BDS_uri+"PersonShape"]: shapesbase + "PersonUIShapes",
  [BDS_uri+"bds:CorporationShape"]: shapesbase + "CorporationUIShapes",
  [BDS_uri+"bds:TopicShape"]: shapesbase + "TopicUIShapes",
  [BDS_uri+"bds:PlaceShape"]: shapesbase + "PlaceUIShapes",
  [BDS_uri+"bds:WorkShape"]: shapesbase + "WorkUIShapes",
  [BDS_uri+"bds:SerialWorkShape"]: shapesbase + "SerialWorkUIShapes",
  [BDS_uri+"bds:InstanceShape"]: shapesbase + "InstanceUIShapes",
  [BDS_uri+"bds:ImageInstanceShape"]: shapesbase + "ImageInstanceUIShapes",
  [BDS_uri+"bds:RoleShape"]: shapesbase + "RoleUIShapes",
  [BDS_uri+"bds:CollectionShape"]: shapesbase + "CollectionUIShapes",
  [BDS_uri+"bds:ImagegroupShape"]: shapesbase + "ImagegroupUIShapes",
  [BDS_uri+"bds:UserProfileShape"]: profileshapesbase + "UserProfileUIShapes",
}

const getShapesDocument = async (entity: rdf.NamedNode): Promise<NodeShape> => {
  if (! (entity.uri in typeUriToShape))
    return Promise.reject("cannot find appropriate shape for "+entity.uri)
  const shaperef = typeUriToShape[entity.uri][0]
  if (! (shaperef.uri in shapeUriToFetchUri))
    return Promise.reject("cannot find fetch url for shape "+shaperef.uri)
  // we always load the example shape in the demo
  const loadRes = fetchTtl(shapeUriToFetchUri[shaperef.uri])
  const { store, etag } = await loadRes
  const shape = new NodeShape(shaperef.node, new EntityGraph(store, shaperef.uri, prefixMap))
  return Promise.resolve(shape)
}

const getDocumentGraph = async (entity: rdf.NamedNode): Promise<{subject:Subject, etag: string | null}> => {
  let uri = config.API_BASEURL + prefixMap.qnameFromUri(entity.uri) + "/focusgraph"
  if (entity.uri == TMP_uri+"user")
    uri = config.API_BASEURL + "me/focusgraph"
  const loadRes = fetchTtl(uri, true)
  const { store, etag } = await loadRes
  const subject = new Subject(entity, new EntityGraph(store, entity.uri, prefixMap))
  return Promise.resolve({subject, etag})
}

const getConnexGraph = async (entity: rdf.NamedNode): Promise<rdf.Store> => {
  const uri = "//ldspdi.bdrc.io/query/graph/getAssociatedLabels?R_GR=bdg:" +
    prefixMap.lnameFromUri(entity.uri) + "&format=ttl"
  const loadRes = fetchTtl(uri, true)
  const { store, etag } = await loadRes
  return Promise.resolve(store)
}

const defaultRef = rdf.sym(rdf.Store.defaultGraphURI)

export let latestcurl = ""

const putDocument = async (idToken: string, entity: rdf.NamedNode, document: rdf.Store, etag: string | null, message: string | undefined): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
    rdf.serialize(defaultRef, document, undefined, "text/turtle", async function (err, str) {
      const headers = new Headers()
      headers.set("Content-Type", "text/turtle")
      headers.set("Authorization", "Bearer " + idToken)
      if (message)
        headers.set("X-Change-Message", encodeURIComponent(message))
      let method = "PUT"
      if (etag) {
        method = "POST"
        headers.set("If-Match", etag)
      }

      let url = config.API_BASEURL + prefixMap.qnameFromUri(entity.uri) + "/focusgraph"
      if (entity.uri == TMP_uri+"user")
        url = config.API_BASEURL + "me/focusgraph"

      const response = await fetch(url, { headers, method, body: str })

      latestcurl =
        fetchToCurl(url, { headers, method, body: str }).replace(
          /--data-binary '((.|[\n\r])+)'$/gm,
          (m, g1) => "--data-raw $'" + g1.replace(/(['"])/g, "\\$1") + "'"
        ) + " --verbose"

      const newetag = response.headers.get("etag")

      // eslint-disable-next-line no-magic-numbers
      if (response.status == 403) {
        reject(new HttpError(i18n.t("error.unauthorized", { url }), response.status))
        return
      }

      // eslint-disable-next-line no-magic-numbers
      if (response.status == 412) {
        reject(new HttpError(i18n.t("error.modified"), response.status))
        return
      }

      // eslint-disable-next-line no-magic-numbers
      if (response.status > 400) {
        reject(new HttpError("error " + response.status + " when saving " + url, response.status))
        return
      }

      //debug("response:",response,etag)

      const text = await response.text()
      if (text) {
        reject(new Error(text))
        return
      }

      if (!newetag) {
        reject(new Error("no etag returned from " + url))
        return
      }

      resolve(newetag)

      try {
        let clear = await fetch("https://ldspdi.bdrc.io/clearcache", { method: "POST" })
        if (url.match(/[/]bdr:((MW)|(W[^A]))[^/]+[/]focusgraph$/)) {
          clear = await fetch("http://iiif.bdrc.io/cache/clear", { method: "POST" })
          clear = await fetch("http://iiifpres.bdrc.io/clearcache", { method: "POST" })
        }
      } catch (e) {
        debug("error when cleaning cache:", e)
      }
    })
  })
}

export const iconFromEntity = (entity: Entity | null): string => {
  if (!entity) return ""
  let icon
  if (entity.subject) {
    const rdfType = ns.RDF("type") as rdf.NamedNode
    if (entity?.subject?.graph?.store?.statements)
      for (const s of entity.subject.graph.store.statements) {
        if (s.predicate.value === rdfType.value && s.subject.value === entity.subject.node.value) {
          icon = s.object.value.replace(/.*?[/]([^/]+)$/, "$1") // .toLowerCase()
          if (icon.toLowerCase() === "user") break
        }
      }
  }
  const shapeQname = entity.shapeQname
  if (!icon && shapeQname) {
    // TODO: might be something better than that...
    icon = shapeQname.replace(/^[^:]+:([^:]+?)Shape[^/]*$/, "$1")
  }
  return icon as string
}

export const getUserMenuState = async (userId: string): Promise<Record<string, Entity>> => {
  const datastr = localStorage.getItem("rde_menu_state_"+userId)
  return datastr ? await JSON.parse(datastr) : {}
}

export const setUserMenuState = async (
  userId: string,
  subjectQname: string,
  shapeQname: string | null,
  labels: string | undefined,
  del: boolean,
  etag: string | null
): Promise<void> => {
  const datastr = localStorage.getItem("rde_menu_state_"+userId)
  const data = datastr ? await JSON.parse(datastr) : {}
  if (!del) data[subjectQname] = { shapeQname, labels, etag }
  else if (data[subjectQname]) delete data[subjectQname]
  const dataNewStr = JSON.stringify(data)
  localStorage.setItem("rde_menu_state_"+userId, dataNewStr)
}

export const getUserLocalEntities = async (userId: string): Promise<Record<string, LocalEntityInfo>> => {
  const datastr = localStorage.getItem("rde_entities_"+userId)
  return datastr ? await JSON.parse(datastr) : {}
}

export const setUserLocalEntity = async (
  userId: string,
  subjectQname: string,
  shapeQname: string | null,
  ttl: string | undefined,
  del: boolean,
  etag: string | null,
  needsSaving: boolean
): Promise<void> => {
  const datastr = localStorage.getItem("rde_entities_"+userId)
  const data = datastr ? await JSON.parse(datastr) : {}
  if (!del) data[subjectQname] = { shapeQname, ttl, etag, needsSaving }
  else if (data[subjectQname]) delete data[subjectQname]
  const dataNewStr = JSON.stringify(data)
  localStorage.setItem("rde_entities_"+userId, dataNewStr)
}

const EDTF_DT_uri = "http://id.loc.gov/datatypes/edtf/EDTF"
const EDTF_DT = rdf.sym("http://id.loc.gov/datatypes/edtf/EDTF")

export const humanizeEDTF = (obj: Record<string, any>, str = "", locale = "en-US", dbg = false): string => {
  if (!obj) return ""

  const conc = (values: Array<any>, separator?: string) => {
    separator = separator ? " " + separator + " " : ""
    return values.reduce((acc: string, v, i, array) => {
      if (i > 0) acc += i < array.length - 1 ? ", " : separator
      acc += humanizeEDTF(v, "", locale)
      return acc
    }, "")
  }

  // just output EDTF object
  if (dbg) return JSON.stringify(obj, null, 3) // eslint-disable-line no-magic-numbers

  if (obj.type === "Set") return conc(obj.values, "or")
  else if (obj.type === "List") return conc(obj.values, "and")
  else if (obj.type === "Interval" && !obj.values[0]) return "not after " + conc([obj.values[1]])
  else if (obj.type === "Interval" && !obj.values[1]) return "not before " + conc([obj.values[0]])
  else if (obj.type === "Interval") return "between " + conc(obj.values, "and")
  else if (obj.approximate) {
    if (obj.type === "Century") return "circa " + (Number(obj.values[0]) + 1) + "th c."
    return "circa " + humanizeEDTF({ ...obj, approximate: false }, str, locale, dbg)
  } else if (obj.uncertain) {
    if (obj.type === "Century") return Number(obj.values[0]) + 1 + "th c. ?"
    return humanizeEDTF({ ...obj, uncertain: false }, str, locale, dbg) + "?"
  } else if (obj.unspecified === 12) return obj.values[0] / 100 + 1 + "th c." // eslint-disable-line no-magic-numbers
  else if (obj.type === "Century") return Number(obj.values[0]) + 1 + "th c."
  else if (obj.unspecified === 8) return obj.values[0] + "s" // eslint-disable-line no-magic-numbers
  else if (obj.type === "Decade") return obj.values[0] + "0s"
  else if (!obj.unspecified && obj.values.length === 1) return obj.values[0]
  else if (!obj.unspecified && obj.values.length === 3) {
    // eslint-disable-line no-magic-numbers
    try {
      const event = new Date(Date.UTC(obj.values[0], obj.values[1], obj.values[2], 0, 0, 0)) // eslint-disable-line no-magic-numbers
      const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric" }
      const val = event.toLocaleDateString(locale, options)
      return val
    } catch (e) {
      debug("locale error:", e, str, obj)
    }
    return str
  } else {
    return str
  }
}

const locales: Record<string, string> = { en: "en-US", "zh-hans": "zh-Hans-CN", bo: "bo-CN" }

const previewLiteral = (lit: rdf.Literal, uiLangs: string[]) => {
  if (lit.datatype.value == EDTF_DT.value) {
    try {
      const obj = parse(lit.value)
      const edtfObj = edtf(lit.value)
      const edtfMin = edtf(edtfObj.min)?.values[0]
      const edtfMax = edtf(edtfObj.max)?.values[0]
      if (edtfMin <= -4000 || edtfMax >= 2100) throw Error(i18n.t("error.year", { min: -4000, max: 2100 })) // eslint-disable-line no-magic-numbers
      return { value: humanizeEDTF(obj, lit.value, uiLangs[0]), error: null }
    } catch (e: any) {
      return {
        value: null,
        error: (
          <>
            This field must be in EDTF format, see&nbsp;
            <a href="https://www.loc.gov/standards/datetime/" rel="noopener noreferrer" target="_blank">
              https://www.loc.gov/standards/datetime/
            </a>
            .
            {!["No possible parsing", "Syntax error"].some((err) => e.message?.includes(err)) && (
              <>
                <br />[{e.message}]
              </>
            )}
          </>
        ),
      }
    }
  } else if (lit.language === "bo-x-ewts") {
    const warns: string[] = []
    const uni = fromWylie(lit.value, undefined, warns)
    if (warns.length > 0) {
      return {
        value: uni,
        error: (
          <>
            Warnings during conversion to Unicode:
            {warns.map((warn, index) => (
              <>warn</>
              ))}
          </>
        ),
      }
    }
    return { value: uni, error: null }
  }
  return { value: null, error: null }
}
