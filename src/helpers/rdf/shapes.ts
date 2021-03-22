import * as rdf from "rdflib"
import {
  RDFResource,
  RDFResourceWithLabel,
  PropertyGroup,
  NodeShape,
  EntityGraph,
  ExtRDFResourceWithLabel,
} from "./types"
import * as ns from "./ns"
import { Subject } from "./types"

const debug = require("debug")("bdrc:rdf:shapes")

export const rdfLitAsNumber = (lit: rdf.Literal): number | null => {
  const n = Number(lit.value)
  if (n && !isNaN(n)) {
    return +n
  }
  return null
}

// TODO: this should be fetched somewhere... unclear where yet
export const shapeRefsMap: Record<string, RDFResourceWithLabel> = {
  "bds:PersonShape": new ExtRDFResourceWithLabel(ns.BDS("PersonShape").value, { en: "Person" }),
}

export const possibleShapeRefs: Array<RDFResourceWithLabel> = [shapeRefsMap["bds:PersonShape"]]

// TODO
// returns an array of all possible shapes that can be used to edit an entity
// depending on its type
export const shapeRefsForEntity = (subject: Subject): Array<RDFResourceWithLabel> => {
  return [shapeRefsMap["bds:PersonShape"]]
}

export const shProperty = ns.SH("property")
export const shGroup = ns.SH("group")
export const shOrder = ns.SH("order") as rdf.NamedNode
export const rdfsLabel = ns.RDFS("label") as rdf.NamedNode
export const prefLabel = ns.SKOS("prefLabel") as rdf.NamedNode
export const shName = ns.SH("name") as rdf.NamedNode
export const shPath = ns.SH("path") as rdf.NamedNode
export const dashEditor = ns.DASH("editor") as rdf.NamedNode
export const dashEnumSelectEditor = ns.DASH("EnumSelectEditor") as rdf.NamedNode
export const shDescription = ns.SH("description") as rdf.NamedNode
export const shMessage = ns.SH("message") as rdf.NamedNode
export const shMinCount = ns.SH("minCount") as rdf.NamedNode
export const shMaxCount = ns.SH("maxCount") as rdf.NamedNode
export const shDatatype = ns.SH("datatype") as rdf.NamedNode
export const dashSingleLine = ns.SH("singleLine") as rdf.NamedNode
export const shTargetObjectsOf = ns.SH("targetObjectsOf") as rdf.NamedNode
export const bdsPropertyShapeType = ns.BDS("propertyShapeType") as rdf.NamedNode
export const bdsFacetShape = ns.BDS("FacetShape") as rdf.NamedNode
export const bdsExternalShape = ns.BDS("ExternalShape") as rdf.NamedNode
export const bdsExpectedObjectType = ns.BDS("expectedObjectType") as rdf.NamedNode
export const shIn = ns.SH("in") as rdf.NamedNode

export const sortByPropValue = (
  nodelist: Array<rdf.NamedNode>,
  p: rdf.NamedNode,
  store: rdf.Store
): Array<rdf.NamedNode> => {
  const orderedGroupObjs: Record<number, rdf.NamedNode> = {}
  let orders: Array<number> = []
  for (const node of nodelist) {
    let order = 0
    const ordern: rdf.Literal | null = store.any(node, p, null) as rdf.Literal
    if (ordern) {
      const asnum = rdfLitAsNumber(ordern)
      if (asnum) order = asnum
      else debug("no order found for node and property: ", node.value, p.value)
      orders.push(order)
    }
    orderedGroupObjs[order] = node
  }
  orders = orders.sort()
  const res: Array<rdf.NamedNode> = []
  for (const order of orders) {
    res.push(orderedGroupObjs[order])
  }
  return res
}
