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
  "bds:PersonShapeTest": new ExtRDFResourceWithLabel(ns.BDS("PersonShapeTest").value, { en: "Test (Person" }),
  "bds:PersonShape": new ExtRDFResourceWithLabel(ns.BDS("PersonShape").value, { en: "Person" }),
  "bds:CorporationShape": new ExtRDFResourceWithLabel(ns.BDS("CorporationShape").value, { en: "Corporation" }),
  "bds:TopicShape": new ExtRDFResourceWithLabel(ns.BDS("TopicShape").value, { en: "Topic" }),
  "bds:PlaceShape": new ExtRDFResourceWithLabel(ns.BDS("PlaceShape").value, { en: "Place" }),
  "bds:WorkShape": new ExtRDFResourceWithLabel(ns.BDS("WorkShape").value, { en: "Work" }),
  "bds:SerialWorkShape": new ExtRDFResourceWithLabel(ns.BDS("SerialWorkShape").value, { en: "Serial Work" }),
  "bds:InstanceShape": new ExtRDFResourceWithLabel(ns.BDS("InstanceShape").value, { en: "Instance" }),
  "bds:ImagegroupShape": new ExtRDFResourceWithLabel(ns.BDS("ImagegroupShape").value, { en: "Imagegroup" }),
}

export const possibleShapeRefs: Array<RDFResourceWithLabel> = [
  shapeRefsMap["bds:PersonShapeTest"],
  shapeRefsMap["bds:PersonShape"],
  shapeRefsMap["bds:CorporationShape"],
  shapeRefsMap["bds:TopicShape"],
  shapeRefsMap["bds:PlaceShape"],
  shapeRefsMap["bds:WorkShape"],
  shapeRefsMap["bds:SerialWorkShape"],
  shapeRefsMap["bds:InstanceShape"],
  shapeRefsMap["bds:ImagegroupShape"],
]

export const rdfType = ns.RDF("type") as rdf.NamedNode
export const shProperty = ns.SH("property")
export const shGroup = ns.SH("group")
export const shOrder = ns.SH("order") as rdf.NamedNode
export const rdfsLabel = ns.RDFS("label") as rdf.NamedNode
export const prefLabel = ns.SKOS("prefLabel") as rdf.NamedNode
export const shName = ns.SH("name") as rdf.NamedNode
export const shPath = ns.SH("path") as rdf.NamedNode
export const dashEditor = ns.DASH("editor") as rdf.NamedNode
export const dashEnumSelectEditor = ns.DASH("EnumSelectEditor") as rdf.NamedNode
export const shMessage = ns.SH("message") as rdf.NamedNode
export const bdsDisplayPriority = ns.BDS("displayPriority") as rdf.NamedNode
export const shMinCount = ns.SH("minCount") as rdf.NamedNode
export const shMinInclusive = ns.SH("minInclusive") as rdf.NamedNode
export const shMinExclusive = ns.SH("minExclusive") as rdf.NamedNode
export const shClass = ns.SH("class") as rdf.NamedNode
export const shMaxCount = ns.SH("maxCount") as rdf.NamedNode
export const shMaxInclusive = ns.SH("maxInclusive") as rdf.NamedNode
export const shMaxExclusive = ns.SH("maxExclusive") as rdf.NamedNode
export const shDatatype = ns.SH("datatype") as rdf.NamedNode
export const dashSingleLine = ns.DASH("singleLine") as rdf.NamedNode
export const shTargetObjectsOf = ns.SH("targetObjectsOf") as rdf.NamedNode
export const shTargetSubjectsOf = ns.SH("targetSubjectsOf") as rdf.NamedNode
export const bdsPropertyShapeType = ns.BDS("propertyShapeType") as rdf.NamedNode
export const bdsFacetShape = ns.BDS("FacetShape") as rdf.NamedNode
export const bdsExternalShape = ns.BDS("ExternalShape") as rdf.NamedNode
export const bdsIgnoreShape = ns.BDS("IgnoreShape") as rdf.NamedNode
export const bdsClassIn = ns.BDS("classIn") as rdf.NamedNode
export const shIn = ns.SH("in") as rdf.NamedNode
export const shInversePath = ns.SH("inversePath") as rdf.NamedNode
export const shUniqueLang = ns.SH("uniqueLang") as rdf.NamedNode
export const bdsReadOnly = ns.BDS("readOnly") as rdf.NamedNode
export const bdsIdentifierPrefix = ns.BDS("identifierPrefix") as rdf.NamedNode
export const bdsAllowMarkDown = ns.BDS("allowMarkDown") as rdf.NamedNode
export const shNamespace = ns.SH("namespace") as rdf.NamedNode

export const typeUriToShape: Record<string, Array<RDFResourceWithLabel>> = {}
typeUriToShape[ns.BDO_uri + "Person"] = [shapeRefsMap["bds:PersonShape"], shapeRefsMap["bds:PersonShapeTest"]]
typeUriToShape[ns.BDO_uri + "Topic"] = [shapeRefsMap["bds:TopicShape"]]
typeUriToShape[ns.BDO_uri + "Corporation"] = [shapeRefsMap["bds:CorporationShape"]]
typeUriToShape[ns.BDO_uri + "Work"] = [shapeRefsMap["bds:WorkShape"]]
typeUriToShape[ns.BDO_uri + "SerialWork"] = [shapeRefsMap["bds:SerialWorkShape"]]

export const shapeRefsForEntity = (subject: Subject): Array<RDFResourceWithLabel> | null => {
  const type = subject.getPropResValue(rdfType)
  if (type == null) return null
  return typeUriToShape[type.uri]
}

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
  orders = orders.sort((a, b) => a - b)
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
    let res = {}
    if (this.path && (this.path.directPathNode || this.path.inversePathNode)) {
      const pathNode = this.path.directPathNode || this.path.inversePathNode
      if (pathNode) {
        const propInOntology = new RDFResourceWithLabel(pathNode, this.ontologyGraph)
        res = propInOntology.prefLabels
      }
    }
    const resFromShape = this.getPropValueByLang(shName)
    res = { ...res, ...resFromShape }
    return res
  }

  @Memoize()
  public get singleLine(): boolean {
    return this.getPropBooleanValue(dashSingleLine)
  }

  @Memoize()
  public get displayPriority(): number | null {
    return this.getPropIntValue(bdsDisplayPriority)
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
  public get minInclusive(): number | null {
    return this.getPropIntValue(shMinInclusive)
  }

  @Memoize()
  public get maxInclusive(): number | null {
    return this.getPropIntValue(shMaxInclusive)
  }

  @Memoize()
  public get minExclusive(): number | null {
    return this.getPropIntValue(shMinExclusive)
  }

  @Memoize()
  public get maxExclusive(): number | null {
    return this.getPropIntValue(shMaxExclusive)
  }

  @Memoize()
  public get allowMarkDown(): boolean | null {
    return this.getPropBooleanValue(bdsAllowMarkDown)
  }

  @Memoize()
  public get uniqueLang(): boolean | null {
    return this.getPropBooleanValue(shUniqueLang)
  }

  @Memoize()
  public get readOnly(): boolean {
    return this.getPropBooleanValue(bdsReadOnly)
  }

  @Memoize()
  public get editorLname(): string | null {
    const val = this.getPropResValue(dashEditor)
    if (!val) return null
    return ns.lnameFromUri(val.value)
  }

  @Memoize()
  public get group(): rdf.NamedNode | null {
    return this.getPropResValue(shGroup as rdf.NamedNode)
  }

  @Memoize()
  public get datatype(): rdf.NamedNode | null {
    return this.getPropResValue(shDatatype)
  }

  public static resourcizeWithInit(nodes: Array<rdf.NamedNode>, graph: EntityGraph): Array<RDFResourceWithLabel> {
    const res: Array<RDFResourceWithLabel> = []
    for (const node of nodes) {
      const r = new RDFResourceWithLabel(node, graph)
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
    else if (propertyShapeType.value == bdsIgnoreShape.value) return ObjectType.ResIgnore
    throw "can't handle property shape type " + propertyShapeType.value + " for property shape " + this.qname
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
