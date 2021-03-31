import * as rdf from "rdflib"
import {
  RDFResource,
  RDFResourceWithLabel,
  EntityGraph,
  ExtRDFResourceWithLabel,
  Subject,
  rdfLitAsNumber,
  ObjectType,
} from "./types"
import * as ns from "./ns"
import { Memoize } from "typescript-memoize"

const debug = require("debug")("bdrc:rdf:shapes")

// TODO: this should be fetched somewhere... unclear where yet
export const shapeRefsMap: Record<string, RDFResourceWithLabel> = {
  "bds:PersonShapeTest": new ExtRDFResourceWithLabel(ns.BDS("PersonShapeTest").value, { en: "Person (test)" }),
  "bds:PersonShape": new ExtRDFResourceWithLabel(ns.BDS("PersonShape").value, { en: "Person" }),
}

export const possibleShapeRefs: Array<RDFResourceWithLabel> = [
  shapeRefsMap["bds:PersonShapeTest"],
  shapeRefsMap["bds:PersonShape"],
]

// TODO
// returns an array of all possible shapes that can be used to edit an entity
// depending on its type
export const shapeRefsForEntity = (subject: Subject): Array<RDFResourceWithLabel> => {
  return [shapeRefsMap["bds:PersonShapeTest"], shapeRefsMap["bds:PersonShape"]]
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
export const shClass = ns.SH("class") as rdf.NamedNode
export const shMaxCount = ns.SH("maxCount") as rdf.NamedNode
export const shDatatype = ns.SH("datatype") as rdf.NamedNode
export const dashSingleLine = ns.SH("singleLine") as rdf.NamedNode
export const shTargetObjectsOf = ns.SH("targetObjectsOf") as rdf.NamedNode
export const shTargetSubjectsOf = ns.SH("targetSubjectsOf") as rdf.NamedNode
export const bdsPropertyShapeType = ns.BDS("propertyShapeType") as rdf.NamedNode
export const bdsFacetShape = ns.BDS("FacetShape") as rdf.NamedNode
export const bdsExternalShape = ns.BDS("ExternalShape") as rdf.NamedNode
export const bdsClassIn = ns.BDS("classIn") as rdf.NamedNode
export const shIn = ns.SH("in") as rdf.NamedNode
export const shInversePath = ns.SH("inversePath") as rdf.NamedNode

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
      if (asnum !== null) order = asnum
      else debug("no order found for node and property: ", node.value, p.value, asnum)
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

export class Path {
  sparqlString: string

  directPathNode: rdf.NamedNode | null = null
  inversePathNode: rdf.NamedNode | null = null

  static fromSparqlString() {
    // TODO
  }

  constructor(node: rdf.Node, graph: EntityGraph) {
    if (node instanceof rdf.BlankNode) {
      // inverse path
      const invpaths = graph.store.each(node, shInversePath, null) as Array<rdf.NamedNode>
      if (invpaths.length != 1) {
        throw "too many inverse path in shacl path:" + invpaths
      }
      const invpath = invpaths[0]
      this.sparqlString = "^" + invpath.value
      this.inversePathNode = invpath
    } else {
      this.directPathNode = node as rdf.NamedNode
      this.sparqlString = node.value
    }
  }
}

export class PropertyShape extends RDFResourceWithLabel {
  ontologyGraph: EntityGraph

  constructor(node: rdf.NamedNode, graph: EntityGraph, ontologyGraph: EntityGraph) {
    super(node, graph, rdfsLabel)
    this.ontologyGraph = ontologyGraph
  }

  // different property for prefLabels, property shapes are using sh:name
  @Memoize()
  public get prefLabels(): Record<string, string> {
    return this.getPropValueByLang(shName)
  }

  @Memoize()
  public get descriptions(): Record<string, string> {
    return this.getPropValueByLang(shDescription)
  }

  @Memoize()
  public get singleLine(): boolean {
    return this.getPropBooleanValue(dashSingleLine)
  }

  @Memoize()
  public get minCount(): number | null {
    return this.getPropIntValue(shMinCount)
  }

  @Memoize()
  public get maxCount(): number | null {
    return this.getPropIntValue(shMaxCount)
  }

  @Memoize()
  public get editorLname(): string | null {
    const val = this.getPropResValue(dashEditor)
    if (!val) return null
    return ns.lnameFromUri(val.value)
  }

  @Memoize()
  public get datatype(): rdf.NamedNode | null {
    return this.getPropResValue(shDatatype)
  }

  public static resourcizeWithInit(nodes: Array<rdf.NamedNode>, graph: EntityGraph): Array<RDFResourceWithLabel> {
    const res: Array<RDFResourceWithLabel> = []
    for (const node of nodes) {
      const r = new RDFResourceWithLabel(node, graph, rdfsLabel)
      // just a way to intialize the value before the object gets frozen like a yogurt by Recoil
      const justforinit = r.prefLabels
      res.push(r)
    }
    return res
  }

  @Memoize()
  public get in(): Array<RDFResourceWithLabel> | null {
    const nodes = this.getPropResValuesFromList(shIn)
    if (!nodes) return null
    return PropertyShape.resourcizeWithInit(nodes, this.ontologyGraph)
  }

  @Memoize()
  public get expectedObjectTypes(): Array<RDFResourceWithLabel> | null {
    let nodes = this.getPropResValuesFromList(bdsClassIn)
    if (!nodes) {
      const cl = this.getPropResValues(shClass)
      if (cl.length) nodes = cl
    }
    if (!nodes) return null
    return PropertyShape.resourcizeWithInit(nodes, this.ontologyGraph)
  }

  @Memoize()
  public get path(): Path | null {
    const pathNode = this.getPropResValue(shPath)
    if (!pathNode) return null
    return new Path(pathNode, this.graph)
  }

  @Memoize()
  public get objectType(): ObjectType {
    const propertyShapeType = this.getPropResValue(bdsPropertyShapeType)
    if (!propertyShapeType) {
      const editor = this.getPropResValue(dashEditor)
      if (!editor) return ObjectType.Literal
      if (editor.value == dashEnumSelectEditor.value) return ObjectType.ResInList
      return ObjectType.Literal
    }
    // for some reason direct comparison doesn't work...
    if (propertyShapeType.value == bdsFacetShape.value) return ObjectType.Facet
    else if (propertyShapeType.value == bdsExternalShape.value) return ObjectType.ResExt
    throw "can't handle propert shape type " + propertyShapeType.value + " for property shape " + this.qname
  }

  @Memoize()
  public get targetShape(): NodeShape | null {
    const path = this.path
    if (!path) return null
    let val: rdf.NamedNode | null
    if (path.directPathNode) {
      val = this.graph.store.any(null, shTargetObjectsOf, path.directPathNode) as rdf.NamedNode | null
      if (val == null) return null
      return new NodeShape(val, this.graph, this.ontologyGraph)
    }
    if (path.inversePathNode) {
      val = this.graph.store.any(null, shTargetSubjectsOf, path.inversePathNode) as rdf.NamedNode | null
      if (val == null) return null
      return new NodeShape(val, this.graph, this.ontologyGraph)
    }
    return null
  }
}

export class PropertyGroup extends RDFResourceWithLabel {
  ontologyGraph: EntityGraph

  constructor(node: rdf.NamedNode, graph: EntityGraph, ontologyGraph: EntityGraph) {
    super(node, graph, rdfsLabel)
    this.ontologyGraph = ontologyGraph
  }

  @Memoize()
  public get properties(): Array<PropertyShape> {
    const res: Array<PropertyShape> = []
    let propsingroup: Array<rdf.NamedNode> = this.graph.store.each(null, shGroup, this.node) as Array<rdf.NamedNode>
    propsingroup = sortByPropValue(propsingroup, shOrder, this.graph.store)
    for (const prop of propsingroup) {
      res.push(new PropertyShape(prop, this.graph, this.ontologyGraph))
    }
    return res
  }

  // different property for prefLabels, property shapes are using sh:name
  @Memoize()
  public get prefLabels(): Record<string, string> {
    return this.getPropValueByLang(rdfsLabel)
  }
}

export class NodeShape extends RDFResourceWithLabel {
  ontologyGraph: EntityGraph

  constructor(node: rdf.NamedNode, graph: EntityGraph, ontologyGraph: EntityGraph) {
    super(node, graph, rdfsLabel)
    this.ontologyGraph = ontologyGraph
  }

  @Memoize()
  public get properties(): Array<PropertyShape> {
    const res: Array<PropertyShape> = []
    // get all ?shape sh:property/sh:group ?group
    let props: Array<rdf.NamedNode> = this.graph.store.each(this.node, shProperty, null) as Array<rdf.NamedNode>
    props = sortByPropValue(props, shOrder, this.graph.store)
    for (const prop of props) {
      res.push(new PropertyShape(prop, this.graph, this.ontologyGraph))
    }
    return res
  }

  @Memoize()
  public get groups(): Array<PropertyGroup> {
    const res: Array<PropertyGroup> = []
    // get all ?shape sh:property/sh:group ?group
    const props: Array<rdf.NamedNode> = this.graph.store.each(this.node, shProperty, null) as Array<rdf.NamedNode>
    let grouplist: Array<rdf.NamedNode> = []
    for (const prop of props) {
      // we assume there's only one group per property, by construction of the shape (maybe it's wrong?)
      const group: rdf.NamedNode | null = this.graph.store.any(prop, shGroup, null) as rdf.NamedNode
      // for some reason grouplist.includes(group) doesn't work, I suppose new objects are created by rdflib
      if (group && !grouplist.some((e) => e.value === group.value)) {
        grouplist.push(group)
      }
    }
    grouplist = sortByPropValue(grouplist, shOrder, this.graph.store)
    for (const group of grouplist) {
      res.push(new PropertyGroup(group, this.graph, this.ontologyGraph))
    }
    return res
  }
}
