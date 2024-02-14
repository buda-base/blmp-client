import React from "react"
import * as rdf from "rdflib"
import config from "../config"
import {
  NodeShape,
  LocalEntityInfo,
  fetchTtl,
  RDFResource,
  Subject,
  EntityGraph,
  ExtRDFResourceWithLabel,
  Entity,
  ns
} from "rdf-document-editor"
import i18n from "i18next"
import "./jsewts.d.ts"
import { SetterOrUpdater } from "recoil"
import { fromWylie } from "jsewts"

import { customAlphabet } from "nanoid"
import edtf, { parse } from "edtf" // see https://github.com/inukshuk/edtf.js/issues/36#issuecomment-1073778277
import { debug as debugFactory } from "debug"
import fetchToCurl from "fetch-to-curl"

const debug = debugFactory("rde:entity:container:demo")

class HttpError extends Error {

  public status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

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

export const preferredUiLang = BDOU("preferredUiLang") as rdf.NamedNode
export const preferredUiLiteralLangs = BDOU("preferredUiLiteralLangs") as rdf.NamedNode
export const localNameDefaultPrefix = BDOU("localNameDefaultPrefix") as rdf.NamedNode
export const userProfile = BDOU("User") as rdf.NamedNode

export const gisPropertyGroup = BDS("GISPropertyGroup") as rdf.NamedNode
export const latProp = BDO("placeLat") as rdf.NamedNode
export const lngProp = BDO("placeLong") as rdf.NamedNode

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
  "bds:PersonShapeTest": new ExtRDFResourceWithLabel(BDS("PersonShapeTest").value, { en: "Test (Person)" },{},null,prefixMap),
  "bds:PersonShape": new ExtRDFResourceWithLabel(BDS("PersonShape").value, { en: "Person" },{},null,prefixMap),
  "bds:CorporationShape": new ExtRDFResourceWithLabel(BDS("CorporationShape").value, { en: "Corporation" },{},null,prefixMap),
  "bds:CollectionShape": new ExtRDFResourceWithLabel(BDS("CollectionShape").value, { en: "Collection" },{},null,prefixMap),
  "bds:RoleShape": new ExtRDFResourceWithLabel(BDS("RoleShape").value, { en: "Role" },{},null,prefixMap),
  "bds:TopicShape": new ExtRDFResourceWithLabel(BDS("TopicShape").value, { en: "Topic" },{},null,prefixMap),
  "bds:PlaceShape": new ExtRDFResourceWithLabel(BDS("PlaceShape").value, { en: "Place" },{},null,prefixMap),
  "bds:WorkShape": new ExtRDFResourceWithLabel(BDS("WorkShape").value, { en: "Work (Conceptual)" },{},null,prefixMap),
  "bds:SerialWorkShape": new ExtRDFResourceWithLabel(BDS("SerialWorkShape").value, { en: "Serial Work" },{},null,prefixMap),
  "bds:InstanceShape": new ExtRDFResourceWithLabel(BDS("InstanceShape").value, { en: "Instance (Version)" },{},null,prefixMap),
  "bds:ImageInstanceShape": new ExtRDFResourceWithLabel(BDS("ImageInstanceShape").value, {
    en: "Image instance (Scans)",
  },{},null,prefixMap),
  "bds:EtextInstanceShape": new ExtRDFResourceWithLabel(BDS("EtextInstanceShape").value, {
    en: "Etext instance",
  },{},null,prefixMap),
  "bds:ImagegroupShape": new ExtRDFResourceWithLabel(BDS("ImagegroupShape").value, { en: "Image group" },{},null,prefixMap),
  "bds:UserProfileShape": new ExtRDFResourceWithLabel(BDS("UserProfileShape").value, { en: "User profile" },{},null,prefixMap),
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
  shapeRefsMap["bds:WorkShape"],
  // removed from the UI
  //shapeRefsMap["bds:ImageInstanceShape"],
  //shapeRefsMap["bds:UserProfileShape"],
  //shapeRefsMap["bds:ImagegroupShape"],
  //shapeRefsMap["bds:PersonShapeTest"],
]

export const typeUriToShape: Record<string, Array<ExtRDFResourceWithLabel>> = {}
typeUriToShape[BDO_uri + "Person"] = [shapeRefsMap["bds:PersonShape"]]
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
typeUriToShape[BDOU_uri + "UserProfile"] = [shapeRefsMap["bds:UserProfileShape"]]
// for getShapesDocument to work:
typeUriToShape[BDS_uri + "PersonShape"] = [shapeRefsMap["bds:PersonShape"]]
typeUriToShape[BDS_uri + "TopicShape"] = [shapeRefsMap["bds:TopicShape"]]
typeUriToShape[BDS_uri + "PlaceShape"] = [shapeRefsMap["bds:PlaceShape"]]
typeUriToShape[BDS_uri + "InstanceShape"] = [shapeRefsMap["bds:InstanceShape"]]
typeUriToShape[BDS_uri + "ImageInstanceShape"] = [shapeRefsMap["bds:ImageInstanceShape"]]
typeUriToShape[BDS_uri + "EtextInstanceShape"] = [shapeRefsMap["bds:EtextInstanceShape"]]
typeUriToShape[BDS_uri + "RoleShape"] = [shapeRefsMap["bds:RoleShape"]]
typeUriToShape[BDS_uri + "CollectionShape"] = [shapeRefsMap["bds:CollectionShape"]]
typeUriToShape[BDS_uri + "ImagegroupShape"] = [shapeRefsMap["bds:ImagegroupShape"]]
typeUriToShape[BDS_uri + "CorporationShape"] = [shapeRefsMap["bds:CorporationShape"]]
typeUriToShape[BDS_uri + "WorkShape"] = [shapeRefsMap["bds:WorkShape"]]
typeUriToShape[BDS_uri + "SerialWorkShape"] = [shapeRefsMap["bds:SerialWorkShape"]]
typeUriToShape[BDS_uri + "UserProfileShape"] = [shapeRefsMap["bds:UserProfileShape"]] // not sure about BDS_uri prefix for this one?

export const reserveLname = async (
  prefix: string,
  proposedLname: string | null,
  token: string,
  n = 1
): Promise<string> => {
  let url = config.API_BASEURL + "ID/" + prefix
  if (proposedLname) url = config.API_BASEURL + "ID/full/" + proposedLname
  else if (n > 1) url += "?n=" + n
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  // eslint-disable-next-line no-magic-numbers
  if (response.status == 422) throw new HttpError("422 error while reserving lname", 422)
  const body = await response.text()
  return body
}

export const generateSubnodesFactory = (idToken: string | null, RIDprefix: string | null) => async (
  subshape: NodeShape,
  parent: RDFResource,
  n = 1
): Promise<Subject[]> => {
  if (subshape.node.value.startsWith("http://purl.bdrc.io/ontology/shapes/adm/AdmEntityShape")) {
    // special case for admin entities
    // in that case n can never be 1
    const res = new Subject(new rdf.NamedNode(BDA_uri + parent.lname), parent.graph)
    return [res]
  }
  let prefix = subshape.getPropStringValue(ns.rdeIdentifierPrefix)
  if (prefix == null) throw new Error("cannot find entity prefix for " + subshape.qname)
  let namespace = subshape.getPropStringValue(ns.shNamespace)
  if (namespace == null) namespace = parent.namespace
  if (subshape.independentIdentifiers) {
    prefix += RIDprefix ? RIDprefix : ""
    if (!idToken) throw new Error("no token when reserving id")
    const reservedId = await reserveLname(prefix, null, idToken, n)
    if (n == 1) {
    const res = new Subject(new rdf.NamedNode(namespace + reservedId), parent.graph)
      return [res]
    } else {
      return reservedId.split(/[ \n]+/).map((id) => new Subject(new rdf.NamedNode(namespace + id), parent.graph))
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
  return res
}

const entity_prefix_3 = ["WAS", "ITW", "PRA"]
const entity_prefix_2 = ["WA", "MW", "PR", "IE", "UT", "IT"]

export const removeEntityPrefix = (lname: string): string => {
  if (lname.length > 3 && entity_prefix_3.includes(lname.substring(0, 3))) return lname.substring(3)
  if (lname.length > 2 && entity_prefix_2.includes(lname.substring(0, 2))) return lname.substring(2)
  return lname.substring(1)
}

export const getEntityPrefix = (lname: string): string => {
  if (lname.length > 3) {
    const prefix_3 = lname.substring(0, 3)
    if (entity_prefix_3.includes(prefix_3))
      return prefix_3
  }
  if (lname.length > 2) {
    const prefix_2 = lname.substring(0, 2)
    if (entity_prefix_2.includes(prefix_2))
      return prefix_2
  }
  return lname.substring(0, 1)
}

const entityPrefixToType: Record<string,rdf.NamedNode> = {
  "WAS": BDO("SerialWork") as rdf.NamedNode,
  //"ITW": BDO("Item") as rdf.NamedNode,
  //"PRA": BDO("Item") as rdf.NamedNode,
  "WA": BDO("Work") as rdf.NamedNode,
  "MW": BDO("Instance") as rdf.NamedNode,
  "PR": BDO("Collection") as rdf.NamedNode,
  "IE": BDO("EtextInstance") as rdf.NamedNode,
  "UT": BDO("Etext") as rdf.NamedNode,
  "IT": BDO("Item") as rdf.NamedNode,
  "W": BDO("ImageInstance") as rdf.NamedNode,
  "G": BDO("Place") as rdf.NamedNode,
  "C": BDO("Corporation") as rdf.NamedNode,
  "P": BDO("Person") as rdf.NamedNode,
  "T": BDO("Topic") as rdf.NamedNode,
  "R": BDO("Role") as rdf.NamedNode,
  "L": BDO("Lineage") as rdf.NamedNode,
  "U": BDOU("UserProfile") as rdf.NamedNode,
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

export const entityToType = (entity: rdf.NamedNode): rdf.NamedNode | null => {
  if(entity.uri === "tmp:uri") return null
  const lname = prefixMap.lnameFromUri(entity.uri)
  const entityPrefix = getEntityPrefix(lname)
  if (!(entityPrefix in entityPrefixToType))
    return null
  return entityPrefixToType[entityPrefix]
}

export const generateConnectedID = async (old_resource: RDFResource, old_shape: NodeShape, type: RDFResource): Promise<rdf.NamedNode> => {
  const unprefixedLname = removeEntityPrefix(old_resource.lname)
  const newURI = typeToURIPrefix(type)
  if (newURI == null)
    throw new Error("cannot generate connected ID for "+old_resource.uri)
  return rdf.sym(newURI + unprefixedLname)
}

let shapesbase = BDSH_uri
let profileshapesbase = "http://purl.bdrc.io/shapes/profile/"
if (config.TEMPLATES_BASE) {
  shapesbase = shapesbase.replace("http://purl.bdrc.io/", config.TEMPLATES_BASE)
  profileshapesbase = profileshapesbase.replace("http://purl.bdrc.io/", config.TEMPLATES_BASE)
}

export const shapeUriToFetchUri: Record<string, string> = {
  [BDS_uri+"PersonShape"]: shapesbase + "PersonUIShapes",
  [BDS_uri+"CorporationShape"]: shapesbase + "CorporationUIShapes",
  [BDS_uri+"TopicShape"]: shapesbase + "TopicUIShapes",
  [BDS_uri+"PlaceShape"]: shapesbase + "PlaceUIShapes",
  [BDS_uri+"WorkShape"]: shapesbase + "WorkUIShapes",
  [BDS_uri+"SerialWorkShape"]: shapesbase + "SerialWorkUIShapes",
  [BDS_uri+"InstanceShape"]: shapesbase + "InstanceUIShapes",
  [BDS_uri+"ImageInstanceShape"]: shapesbase + "ImageInstanceUIShapes",
  [BDS_uri+"RoleShape"]: shapesbase + "RoleUIShapes",
  [BDS_uri+"CollectionShape"]: shapesbase + "CollectionUIShapes",
  [BDS_uri+"ImagegroupShape"]: shapesbase + "ImagegroupUIShapes",
  [BDS_uri+"UserProfileShape"]: profileshapesbase + "UserProfileUIShapes",
}

export const possibleShapeRefsForType = (type: rdf.NamedNode) => {
  if (! (type.uri in typeUriToShape))
    return []
  return typeUriToShape[type.uri]
}

export const possibleShapeRefsForEntity = (entity: rdf.NamedNode) => {
  const type = entityToType(entity)
  if (!type)
    return []
  return possibleShapeRefsForType(type)
}

export const getShapesDocument = async (entity: rdf.NamedNode): Promise<NodeShape> => {
  let key = entity.uri
  if(!key) key = entity.value
  debug(typeUriToShape)
  if (! (key in typeUriToShape))
    throw new Error("cannot find appropriate shape for "+key)
  const shaperef = typeUriToShape[key][0]
  if (! (shaperef.uri in shapeUriToFetchUri))
    throw new Error("cannot find fetch url for shape "+shaperef.uri)
  // this should be cached
  const loadRes = fetchTtl(shapeUriToFetchUri[shaperef.uri])
  const { store } = await loadRes
  const shape = new NodeShape(shaperef.node as rdf.NamedNode, 
      new EntityGraph(store, shaperef.uri, prefixMap, undefined, undefined, descriptionProperties))
  return shape
}

export const getDocumentGraphFactory = (idToken: string) => async (entity: rdf.NamedNode): Promise<{subject:Subject, etag: string | null}> => {
  let uri = config.API_BASEURL + prefixMap.qnameFromUri(entity.uri) + "/focusgraph"
  if (entity.uri == TMP_uri+"user")
    uri = config.API_BASEURL + "me/focusgraph"
  const headers = new Headers()
  headers.set("Content-Type", "text/turtle")
  headers.set("Authorization", "Bearer " + idToken)
  const loadRes = fetchTtl(uri, true, headers)
  const { store, etag } = await loadRes
  const connexGraph: rdf.Store = await getConnexGraph(entity)
  const subject = new Subject(entity, new EntityGraph(store, entity.uri, prefixMap, connexGraph, undefined, config.descriptionProperties))
  return { subject, etag }
}

export const getConnexGraph = async (entity: rdf.NamedNode): Promise<rdf.Store> => {
  const uri = "//ldspdi.bdrc.io/query/graph/getAssociatedLabels?R_GR=bdg:" +
    prefixMap.lnameFromUri(entity.uri) + "&format=ttl"
  const loadRes = fetchTtl(uri, true)
  const { store, etag } = await loadRes
  return store
}

const defaultRef = rdf.sym(rdf.Store.defaultGraphURI)

export let latestcurl = ""

export const putDocumentFactory = (
    idToken: string,
    userQname: string | null,
    setUiLang: SetterOrUpdater<string>,
    setUiLitLang: SetterOrUpdater<string[]>,
    setRIDprefix: SetterOrUpdater<string|null>,
    setReloadProfile: SetterOrUpdater<boolean>
    ) => async (
    entity: rdf.NamedNode,
    document: rdf.Store,
    etag: string | null,
    message: string | undefined
  ): Promise<string> => {
  return new Promise(async (resolve, reject) => {
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

      const entityQname = prefixMap.qnameFromUri(entity.uri)
      const qnameForAPI = entityQname
      const url = config.API_BASEURL + qnameForAPI + "/focusgraph"

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

      if (entityQname == userQname) {
        // TODO: not sure about the setReloadProfile
        setReloadProfile(true)
        const uiLang = document.any(entity, preferredUiLang, null) as rdf.Literal | null
        setUiLang(uiLang ? uiLang.value : "en")
        const ridPrefix = document.any(entity, localNameDefaultPrefix, null) as rdf.Literal | null
        setRIDprefix(ridPrefix ? ridPrefix.value : "")
        // TODO: this could be made more efficient by not using the whole EntityGraph thing
        const userRes = new RDFResource(entity, new EntityGraph(document, entity.uri, prefixMap))
        const uiLitLangs = userRes.getPropLitValuesFromList(preferredUiLiteralLangs)
        if (uiLitLangs) {
            const uiLitLangsStr = uiLitLangs.map((lit: rdf.Literal): string => {
            return lit.value
          })
          setUiLitLang(uiLitLangsStr)
        }
        setReloadProfile(false)
      }

      resolve(newetag)

      try {
        const ccach_ldspdi = fetch("https://ldspdi.bdrc.io/clearcache", { method: "POST" })
        if (url.match(/[/]bdr:((MW)|(W[^A]))[^/]+[/]focusgraph$/)) {
          const ccache_iiif = fetch("http://iiif.bdrc.io/cache/clear", { method: "POST" })
          const ccache_iiifpres = fetch("http://iiifpres.bdrc.io/clearcache", { method: "POST" })
          await ccach_ldspdi
          await ccache_iiifpres
          await ccache_iiif
        } else {
          await ccach_ldspdi
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
  if(icon) {
    if(icon.match(/^user/i)) icon = "/icons/userprofile.png" 
    else icon = "/icons/"+icon.toLowerCase()+".svg"
  }
  return icon as string
}

export const getUserMenuStateFactory = (userId: string | null) => async (): Promise<Record<string, Entity>> => {
  const datastr = localStorage.getItem("rde_menu_state_"+userId)
  debug("datastr:",datastr)
  return datastr ? await JSON.parse(datastr) : {}
}

export const setUserMenuStateFactory = (userId: string | null) => async (
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

export const getUserLocalEntitiesFactory = (userId: string | null) => async (): Promise<Record<string, LocalEntityInfo>> => {
  const datastr = localStorage.getItem("rde_entities_"+userId)
  return datastr ? await JSON.parse(datastr) : {}
}

export const setUserLocalEntityFactory = (userId: string | null) => async (
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

export const previewLiteral = (lit: rdf.Literal, uiLang: string) => {
  if (lit.datatype.value == EDTF_DT.value) {
    try {
      const obj = parse(lit.value)
      const edtfObj = edtf(lit.value)
      const edtfMin = edtf(edtfObj.min)?.values[0]
      const edtfMax = edtf(edtfObj.max)?.values[0]
      if (edtfMin <= -4000 || edtfMax >= 2100) throw Error(i18n.t("error.year", { min: -4000, max: 2100 })) // eslint-disable-line no-magic-numbers
      return { value: humanizeEDTF(obj, lit.value, uiLang), error: null }
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
            { warns.map((warn, index) => (
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

export const descriptionProperties: Array<rdf.NamedNode> = [
  ns.shDescription,
  ns.skosDefinition,
  ADM('CatalogingConvention') as rdf.NamedNode,
  ADM('userTooltip') as rdf.NamedNode,
  ns.rdfsComment,
]

export const labelProperties: Array<rdf.NamedNode> = [
  ns.prefLabel,
  ns.rdfsLabel,
]

export const getPreviewLink = (entity: rdf.NamedNode) => {
  const qname = prefixMap.qnameFromUri(entity.uri)
  if(!qname.startsWith("bdu:")) return config.LIBRARY_URL+"/show/"+qname
  return ""
}
