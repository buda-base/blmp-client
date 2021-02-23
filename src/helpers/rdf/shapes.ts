import * as rdf from 'rdflib'
import { RDFResource, RDFResourceWithLabel, PropertyGroup } from "./types"
import * as ns from "./ns"

const debug = require("debug")("bdrc:rdf:shapes")

export const fetchUrlFromTypeQname = (typeQname: string): string => {
  return "/shapes/personpreflabel.ttl"
}

export const getShape = (typeQname:string, store: rdf.Store):RDFResource => {
  const uri:string = ns.uriFromQname(typeQname)
  return new RDFResource(rdf.sym(uri), store); 
}

export const rdfLitAsNumber = (lit:rdf.Literal):number|null => {
  const n = Number(lit.value)
  if (n && !isNaN(n)) {
    return +n
  }
  return null
}

export const shProperty = ns.SH('property')
export const shGroup = ns.SH('group')
export const shOrder = ns.SH('order') as rdf.NamedNode
export const prefLabel = ns.SKOS('prefLabel') as rdf.NamedNode
export const shName = ns.SH('node') as rdf.NamedNode
export const shPath = ns.SH('path') as rdf.NamedNode
export const dashEditor = ns.DASH('editor') as rdf.NamedNode
export const shDescription = ns.SH('description') as rdf.NamedNode
export const shMessage = ns.SH('message') as rdf.NamedNode
export const shMinCount = ns.SH('minCount') as rdf.NamedNode
export const shMaxCount = ns.SH('maxCount') as rdf.NamedNode
export const shDatatype = ns.SH('datatype') as rdf.NamedNode
export const dashSingleLine = ns.SH('singleLine') as rdf.NamedNode

export const sortByPropValue = (nodelist:Array<rdf.NamedNode>, p:rdf.NamedNode, store:rdf.Store): Array<rdf.NamedNode> => {
  const orderedGroupObjs:Record<number,rdf.NamedNode> = {}
  let orders:Array<number> = []
  for (const node of nodelist) {
    let order = 0
    const ordern:rdf.Literal|null = store.any(node, p, null) as rdf.Literal
    if (ordern) {
      const asnum = rdfLitAsNumber(ordern)
      if (asnum)
        order = asnum
      else
        debug("no order found for node and property: ", node.value, p.value)
      orders.push(order)
    }
    orderedGroupObjs[order] = node
  }
  orders = orders.sort()
  const res:Array<rdf.NamedNode> = []
  for (const order of orders) {
    res.push(orderedGroupObjs[order])
  }
  return res
}

export const getPropValueByLang = (r: RDFResource, p:rdf.NamedNode): Record<string,string> => {
  const lits:Array<rdf.Literal> = r.store.each(r.node, p, null) as Array<rdf.Literal>
  const res :Record<string,string> = {}
  for (const lit of lits) {
    res[lit.language] = lit.value
  }
  return res
}

export const getGroups = (shape: RDFResource): Array<PropertyGroup> => {
  const res: Array<PropertyGroup> = []
  // get all ?shape sh:property/sh:group ?group
  const props:Array<rdf.NamedNode> = shape.store.each(shape.node, shProperty, null) as Array<rdf.NamedNode>
  let grouplist:Array<rdf.NamedNode> = []
  for (const prop of props) {
    // we assume there's only one group per property, by construction of the shape (maybe it's wrong?)
    const group:rdf.NamedNode|null = shape.store.any(prop, shGroup, null) as rdf.NamedNode
    if (group && !grouplist.includes(group)) {
      grouplist.push(group)
    }
  }
  grouplist = sortByPropValue(grouplist, shOrder, shape.store)
  for (const group of grouplist) {
    const prefLabels = getPropValueByLang(new RDFResource(group, shape.store), prefLabel)
    res.push(new PropertyGroup(group, shape.store, prefLabels))
  }
  return res
}
