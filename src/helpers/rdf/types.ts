import * as rdf from "rdflib"
import * as shapes from "./shapes"
import * as ns from "./ns"
import { idGenerator } from "../id"
import { Memoize } from "typescript-memoize"
import { atom, useRecoilState, useRecoilValue, selectorFamily, atomFamily, DefaultValue, AtomEffect } from "recoil"
import config from "../../config"

const debug = require("debug")("bdrc:rdf:types")

const defaultGraphNode = new rdf.NamedNode(rdf.Store.defaultGraphURI)

// an EntityGraphValues represents the global state of an entity we're editing, in a javascript object (and not an RDF store)
export class EntityGraphValues {
  oldSubjectProps: Record<string, Record<string, Array<Value>>> = {}
  newSubjectProps: Record<string, Record<string, Array<Value>>> = {}

  onGetInitialValues = (subjectUri: string, propertyUri: string, values: Array<Value>) => {
    if (!(subjectUri in this.oldSubjectProps)) this.oldSubjectProps[subjectUri] = {}
    if (!(subjectUri in this.newSubjectProps)) this.newSubjectProps[subjectUri] = {}
    this.oldSubjectProps[subjectUri][propertyUri] = values
    this.newSubjectProps[subjectUri][propertyUri] = values
  }

  onUpdateValues = (subjectUri: string, propertyUri: string, values: Array<Value>) => {
    if (!(subjectUri in this.newSubjectProps)) this.newSubjectProps[subjectUri] = {}
    this.newSubjectProps[subjectUri][propertyUri] = values
  }

  isInitialized = (subjectUri: string, propertyUri: string) => {
    return subjectUri in this.oldSubjectProps && propertyUri in this.oldSubjectProps[subjectUri]
  }

  addNewValuestoStore(store: rdf.Store, subjectUri: string) {
    if (!(subjectUri in this.newSubjectProps)) return
    const subject = new rdf.NamedNode(subjectUri)
    for (const propertyUri in this.newSubjectProps[subjectUri]) {
      const property = new rdf.NamedNode(propertyUri)
      const values: Array<Value> = this.newSubjectProps[subjectUri][propertyUri]
      for (const val of values) {
        if (val instanceof LiteralWithId) {
          const test = store.add(subject, property, val, defaultGraphNode)
        } else {
          store.add(subject, property, val.node)
          if (val instanceof Subject) {
            this.addNewValuestoStore(store, val.uri)
          }
        }
      }
    }
  }
}

type setSelfOnSelf = {
  setSelf: (arg: any) => void
  onSet: (newValues: (arg: Array<Value> | DefaultValue) => void) => void
}

// a proxy to an EntityGraph that updates the entity graph but is purely read-only, so that React is happy
export class EntityGraph {
  onGetInitialValues: (subjectUri: string, propertyUri: string, values: Array<Value>) => void
  onUpdateValues: (subjectUri: string, propertyUri: string, values: Array<Value>) => void

  getValues: () => EntityGraphValues

  get values(): EntityGraphValues {
    return this.getValues()
  }

  // where to start when reconstructing the tree
  topSubjectUri: string
  store: rdf.Store

  constructor(store: rdf.Store, topSubjectUri: string) {
    this.store = store
    // strange code: we're keeping values in the closure so that when the object freezes
    // the freeze doesn't proagate to it
    const values = new EntityGraphValues()
    this.topSubjectUri = topSubjectUri
    this.onGetInitialValues = values.onGetInitialValues
    this.onUpdateValues = values.onUpdateValues
    this.getValues = () => {
      return values
    }
  }

  addNewValuestoStore(store: rdf.Store): void {
    this.values.addNewValuestoStore(store, this.topSubjectUri)
  }

  static addIdToLitList = (litList: Array<rdf.Literal>): Array<LiteralWithId> => {
    return litList.map(
      (lit: rdf.Literal): LiteralWithId => {
        return new LiteralWithId(lit.value, lit.language, lit.datatype)
      }
    )
  }

  static addLabelsFromGraph = (resList: Array<rdf.NamedNode>, graph: EntityGraph): Array<RDFResourceWithLabel> => {
    return resList.map(
      (res: rdf.NamedNode): RDFResourceWithLabel => {
        return new RDFResourceWithLabel(res, graph)
      }
    )
  }

  static subjectify = (resList: Array<rdf.NamedNode>, graph: EntityGraph): Array<Subject> => {
    return resList.map(
      (res: rdf.NamedNode): Subject => {
        return new Subject(res, graph)
      }
    )
  }

  // only returns the values that were not initalized before
  getUnitializedValues(s: RDFResource, p: PropertyShape): Array<Value> | null {
    const path = p.path
    if (!path) return null
    if (this.values.isInitialized(s.uri, path.uri)) {
      return null
    }
    return this.getPropValuesFromStore(s, p)
  }

  getPropValuesFromStore(s: RDFResource, p: PropertyShape): Array<Value> {
    if (!p.path) {
      throw "can't find path of " + p.uri
    }
    switch (p.objectType) {
      // TODO: ObjectType.ResExt, not an easy one!
      case ObjectType.Facet:
        const fromRDFSubNode: Array<rdf.NamedNode> = s.getPropResValues(p.path)
        const fromRDFSubs = EntityGraph.subjectify(fromRDFSubNode, s.graph)
        this.onGetInitialValues(s.uri, p.path.uri, fromRDFSubs)
        return fromRDFSubs
        break
      case ObjectType.ResInList:
        const fromRDFRes: Array<rdf.NamedNode> = s.getPropResValues(p.path)
        const fromRDFIDs = EntityGraph.addLabelsFromGraph(fromRDFRes, p.graph)
        this.onGetInitialValues(s.uri, p.path.uri, fromRDFIDs)
        return fromRDFIDs
        break
      case ObjectType.Literal:
      default:
        const fromRDFLits: Array<rdf.Literal> = s.getPropLitValues(p.path)
        const fromRDFLitIDs = EntityGraph.addIdToLitList(fromRDFLits)
        this.onGetInitialValues(s.uri, p.path.uri, fromRDFLitIDs)
        return fromRDFLitIDs
        break
    }
  }

  propsUpdateEffect: (subjectUri: string, propertyUri: string) => AtomEffect<Array<Value>> = (
    subjectUri: string,
    propertyUri: string
  ) => ({ setSelf, onSet }: setSelfOnSelf) => {
    onSet((newValues: Array<Value> | DefaultValue): void => {
      if (!(newValues instanceof DefaultValue)) {
        this.onUpdateValues(subjectUri, propertyUri, newValues)
      }
    })
  }

  @Memoize((propertyUri: string, subjectUri: string) => {
    return subjectUri + propertyUri
  })
  getAtomForSubjectProperty(propertyUri: string, subjectUri: string) {
    return atom<Array<Value>>({
      key: subjectUri + propertyUri,
      default: [],
      effects_UNSTABLE: [this.propsUpdateEffect(subjectUri, propertyUri)],
      // disable immutability in production
      dangerouslyAllowMutability: !config.__DEV__,
    })
  }
}

export class RDFResource {
  node: rdf.NamedNode
  graph: EntityGraph

  constructor(node: rdf.NamedNode, graph: EntityGraph) {
    this.node = node
    this.graph = graph
  }

  public get id(): string {
    return this.node.value
  }

  public get lname(): string {
    return ns.lnameFromUri(this.node.value)
  }

  public get qname(): string {
    return ns.qnameFromUri(this.node.value)
  }

  public get uri(): string {
    return this.node.value
  }

  public getPropValueByLang(p: rdf.NamedNode): Record<string, string> {
    const lits: Array<rdf.Literal> = this.graph.store.each(this.node, p, null) as Array<rdf.Literal>
    const res: Record<string, string> = {}
    for (const lit of lits) {
      res[lit.language] = lit.value
    }
    return res
  }

  public getPropLitValues(p: rdf.NamedNode): Array<rdf.Literal> {
    return this.graph.store.each(this.node, p, null) as Array<rdf.Literal>
  }

  public getPropResValues(p: rdf.NamedNode): Array<rdf.NamedNode> {
    return this.graph.store.each(this.node, p, null) as Array<rdf.NamedNode>
  }

  public getPropResValuesFromList(p: rdf.NamedNode): Array<rdf.NamedNode> | null {
    const colls = this.graph.store.each(this.node, p, null) as Array<rdf.Collection>
    for (const coll of colls) {
      return coll.elements as Array<rdf.NamedNode>
    }
    return null
  }

  public getPropIntValue(p: rdf.NamedNode): number | null {
    const lit: rdf.Literal | null = this.graph.store.any(this.node, p, null) as rdf.Literal | null
    if (lit === null) return null
    return shapes.rdfLitAsNumber(lit)
  }

  public getPropResValue(p: rdf.NamedNode): rdf.NamedNode | null {
    const res: rdf.NamedNode | null = this.graph.store.any(this.node, p, null) as rdf.NamedNode | null
    return res
  }

  public getPropBooleanValue(p: rdf.NamedNode, dflt = false): boolean {
    const lit: rdf.Literal = this.graph.store.any(this.node, p, null) as rdf.Literal
    const n = Boolean(lit.value)
    if (n) {
      return n
    }
    return dflt
  }

  public getPropValueLname(p: rdf.NamedNode): string | null {
    const val: rdf.NamedNode = this.graph.store.any(this.node, p, null) as rdf.NamedNode
    if (val == null) return null

    return ns.lnameFromUri(val.value)
  }
}

export class RDFResourceWithLabel extends RDFResource {
  private labelProp: rdf.NamedNode

  constructor(node: rdf.NamedNode, graph: EntityGraph, labelProp: rdf.NamedNode = shapes.prefLabel) {
    super(node, graph)
    this.labelProp = labelProp
  }

  @Memoize()
  public get prefLabels(): Record<string, string> {
    return this.getPropValueByLang(this.labelProp)
  }
}

// this class allows to create a resource from just a URI and labels, we need it for external entities
export class ExtRDFResourceWithLabel extends RDFResourceWithLabel {
  private thisPrefLabels: Record<string, string>

  public get prefLabels(): Record<string, string> {
    return this.thisPrefLabels
  }

  constructor(uri: string, prefLabels: Record<string, string>) {
    super(new rdf.NamedNode(uri), new EntityGraph(new rdf.Store(), uri))
    this.thisPrefLabels = prefLabels
  }
}

export enum ObjectType {
  Literal,
  Facet,
  ResInList,
  ResExt,
}

export class PropertyShape extends RDFResourceWithLabel {
  // different property for prefLabels, property shapes are using sh:name
  @Memoize()
  public get prefLabels(): Record<string, string> {
    return this.getPropValueByLang(shapes.shName)
  }

  @Memoize()
  public get descriptions(): Record<string, string> {
    return this.getPropValueByLang(shapes.shDescription)
  }

  @Memoize()
  public get singleLine(): boolean {
    return this.getPropBooleanValue(shapes.dashSingleLine)
  }

  @Memoize()
  public get minCount(): number | null {
    return this.getPropIntValue(shapes.shMinCount)
  }

  @Memoize()
  public get maxCount(): number | null {
    return this.getPropIntValue(shapes.shMaxCount)
  }

  @Memoize()
  public get editorLname(): string | null {
    return this.getPropValueLname(shapes.dashEditor)
  }

  @Memoize()
  public get datatype(): rdf.NamedNode | null {
    return this.getPropResValue(shapes.shDatatype)
  }

  public static resourcizeWithInit(nodes: Array<rdf.NamedNode>, graph: EntityGraph): Array<RDFResourceWithLabel> {
    const res: Array<RDFResourceWithLabel> = []
    for (const node of nodes) {
      const r = new RDFResourceWithLabel(node, graph, shapes.rdfsLabel)
      // just a way to intialize the value before the object gets frozen like a yogurt by Recoil
      const justforinit = r.prefLabels
      res.push(r)
    }
    return res
  }

  @Memoize()
  public get in(): Array<RDFResourceWithLabel> | null {
    const nodes = this.getPropResValuesFromList(shapes.shIn)
    if (!nodes) return null
    return PropertyShape.resourcizeWithInit(nodes, this.graph)
  }

  @Memoize()
  public get expectedObjectType(): Array<RDFResourceWithLabel> | null {
    const nodes = this.getPropResValuesFromList(shapes.bdsExpectedObjectType)
    if (!nodes) return null
    return PropertyShape.resourcizeWithInit(nodes, this.graph)
  }

  @Memoize()
  public get path(): rdf.NamedNode | null {
    return this.getPropResValue(shapes.shPath)
  }

  @Memoize()
  public get objectType(): ObjectType {
    const propertyShapeType = this.getPropResValue(shapes.bdsPropertyShapeType)
    if (!propertyShapeType) {
      const editor = this.getPropResValue(shapes.dashEditor)
      if (!editor) return ObjectType.Literal
      if (editor.value == shapes.dashEnumSelectEditor.value) return ObjectType.ResInList
      return ObjectType.Literal
    }
    // for some reason direct comparison doesn't work...
    if (propertyShapeType.value == shapes.bdsFacetShape.value) return ObjectType.Facet
    else if (propertyShapeType.value == shapes.bdsExternalShape.value) return ObjectType.ResExt
    // TODO: other cases
    return ObjectType.Literal
  }

  @Memoize()
  public get targetShape(): NodeShape | null {
    const val: rdf.NamedNode | null = this.graph.store.any(
      null,
      shapes.shTargetObjectsOf,
      this.path
    ) as rdf.NamedNode | null
    if (val == null) return null
    return new NodeShape(val, this.graph)
  }
}

export class PropertyGroup extends RDFResourceWithLabel {
  @Memoize()
  public get properties(): Array<PropertyShape> {
    const res: Array<PropertyShape> = []
    let propsingroup: Array<rdf.NamedNode> = this.graph.store.each(
      null,
      shapes.shGroup,
      this.node
    ) as Array<rdf.NamedNode>
    propsingroup = shapes.sortByPropValue(propsingroup, shapes.shOrder, this.graph.store)
    for (const prop of propsingroup) {
      res.push(new PropertyShape(prop, this.graph))
    }
    return res
  }

  // different property for prefLabels, property shapes are using sh:name
  @Memoize()
  public get prefLabels(): Record<string, string> {
    return this.getPropValueByLang(shapes.rdfsLabel)
  }
}

export class NodeShape extends RDFResourceWithLabel {
  @Memoize()
  public get properties(): Array<PropertyShape> {
    const res: Array<PropertyShape> = []
    // get all ?shape sh:property/sh:group ?group
    let props: Array<rdf.NamedNode> = this.graph.store.each(this.node, shapes.shProperty, null) as Array<rdf.NamedNode>
    props = shapes.sortByPropValue(props, shapes.shOrder, this.graph.store)
    for (const prop of props) {
      res.push(new PropertyShape(prop, this.graph))
    }
    return res
  }

  @Memoize()
  public get groups(): Array<PropertyGroup> {
    const res: Array<PropertyGroup> = []
    // get all ?shape sh:property/sh:group ?group
    const props: Array<rdf.NamedNode> = this.graph.store.each(
      this.node,
      shapes.shProperty,
      null
    ) as Array<rdf.NamedNode>
    let grouplist: Array<rdf.NamedNode> = []
    for (const prop of props) {
      // we assume there's only one group per property, by construction of the shape (maybe it's wrong?)
      const group: rdf.NamedNode | null = this.graph.store.any(prop, shapes.shGroup, null) as rdf.NamedNode
      if (group && !grouplist.includes(group)) {
        grouplist.push(group)
      }
    }
    grouplist = shapes.sortByPropValue(grouplist, shapes.shOrder, this.graph.store)
    for (const group of grouplist) {
      res.push(new PropertyGroup(group, this.graph))
    }
    return res
  }
}

export class LiteralWithId extends rdf.Literal {
  id: string

  constructor(value: string, language?: string | null, datatype?: rdf.NamedNode, id?: string) {
    super(value, language, datatype)
    if (id) {
      this.id = id
    } else {
      this.id = idGenerator()
    }
  }

  public copyWithUpdatedValue(value: string) {
    return new LiteralWithId(value, this.language, this.datatype, this.id)
  }

  public copyWithUpdatedLanguage(language: string) {
    return new LiteralWithId(this.value, language, this.datatype, this.id)
  }
}

export type Value = Subject | LiteralWithId | RDFResourceWithLabel

export class Subject extends RDFResource {
  getUnitializedValues(property: PropertyShape): Array<Value> | null {
    return this.graph.getUnitializedValues(this, property)
  }

  getAtomForProperty(propertyUri: string) {
    return this.graph.getAtomForSubjectProperty(propertyUri, this.uri)
  }
}
