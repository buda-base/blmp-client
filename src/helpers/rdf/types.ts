import * as rdf from "rdflib"
import * as ns from "./ns"
import { idGenerator } from "../id"
import { PropertyShape } from "./shapes"
import { Memoize } from "typescript-memoize"
import {
  atom,
  useRecoilState,
  useRecoilValue,
  selectorFamily,
  atomFamily,
  DefaultValue,
  AtomEffect,
  RecoilState,
} from "recoil"
import config from "../../config"

const debug = require("debug")("bdrc:rdf:types")

const defaultGraphNode = new rdf.NamedNode(rdf.Store.defaultGraphURI)
const prefLabel = ns.SKOS("prefLabel") as rdf.NamedNode

export const rdfLitAsNumber = (lit: rdf.Literal): number | null => {
  const n = Number(lit.value)
  if (!isNaN(n)) {
    return +n
  }
  return null
}

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
    debug(this)
    return atom<Array<Value>>({
      key: subjectUri + propertyUri,
      default: [],
      effects_UNSTABLE: [this.propsUpdateEffect(subjectUri, propertyUri)],
      // disable immutability in production
      dangerouslyAllowMutability: !config.__DEV__,
    })
  }
}

type setSelfOnSelf = {
  setSelf: (arg: any) => void
  onSet: (newValues: (arg: Array<Value> | DefaultValue) => void) => void
}

// a proxy to an EntityGraph that updates the entity graph but is purely read-only, so that React is happy
export class EntityGraph {
  onGetInitialValues: (subjectUri: string, propertyUri: string, values: Array<Value>) => void
  getAtomForSubjectProperty: (propertyUri: string, subjectUri: string) => RecoilState<Array<Value>>

  getValues: () => EntityGraphValues

  get values(): EntityGraphValues {
    return this.getValues()
  }

  // where to start when reconstructing the tree
  topSubjectUri: string
  store: rdf.Store
  // associatedLabelsStore is the store that contains the labels of associated resources
  // (ex: students, teachers, etc.), it's not present in all circumstances
  associatedLabelsStore?: rdf.Store

  constructor(store: rdf.Store, topSubjectUri: string, associatedLabelsStore: rdf.Store = rdf.graph()) {
    this.store = store
    // strange code: we're keeping values in the closure so that when the object freezes
    // the freeze doesn't proagate to it
    const values = new EntityGraphValues()
    this.topSubjectUri = topSubjectUri
    this.onGetInitialValues = values.onGetInitialValues
    this.getAtomForSubjectProperty = (propertyUri, subjectUri) =>
      values.getAtomForSubjectProperty(propertyUri, subjectUri)
    this.associatedLabelsStore = associatedLabelsStore
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

  static addExtDataFromGraph = (resList: Array<rdf.NamedNode>, graph: EntityGraph): Array<RDFResourceWithLabel> => {
    return resList.map(
      (res: rdf.NamedNode): RDFResourceWithLabel => {
        if (!graph.associatedLabelsStore) {
          throw "trying to access inexistant associatedStore"
        }
        const lits: Array<rdf.Literal> = graph.associatedLabelsStore.each(res, prefLabel, null) as Array<rdf.Literal>
        const perLang: Record<string, string> = {}
        for (const lit of lits) {
          perLang[lit.language] = lit.value
        }
        return new ExtRDFResourceWithLabel(res.uri, perLang)
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
      case ObjectType.ResExt:
        const fromRDFResExt: Array<rdf.NamedNode> = s.getPropResValues(p.path)
        const fromRDFResExtwData = EntityGraph.addExtDataFromGraph(fromRDFResExt, s.graph)
        this.onGetInitialValues(s.uri, p.path.uri, fromRDFResExtwData)
        return fromRDFResExtwData
        break
      case ObjectType.Facet:
        const fromRDFSubNode: Array<rdf.NamedNode> = s.getPropResValues(p.path)
        const fromRDFSubs = EntityGraph.subjectify(fromRDFSubNode, s.graph)
        this.onGetInitialValues(s.uri, p.path.uri, fromRDFSubs)
        return fromRDFSubs
        break
      case ObjectType.ResInList:
        const fromRDFRes: Array<rdf.NamedNode> = s.getPropResValues(p.path)
        // TODO: p.graph should be the graph of the ontology instead
        const fromRDFReswLabels = EntityGraph.addLabelsFromGraph(fromRDFRes, p.graph)
        this.onGetInitialValues(s.uri, p.path.uri, fromRDFReswLabels)
        return fromRDFReswLabels
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

  static valuesByLang(values: Array<Value>): Record<string, string> {
    const res: Record<string, string> = {}
    for (const value of values) {
      if (value instanceof LiteralWithId) {
        res[value.language] = value.value
      }
    }
    return res
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
    return rdfLitAsNumber(lit)
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

  constructor(node: rdf.NamedNode, graph: EntityGraph, labelProp: rdf.NamedNode = prefLabel) {
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
  private _prefLabels: Record<string, string>
  private _otherData: Record<string, any>

  public get prefLabels(): Record<string, string> {
    return this._prefLabels
  }

  public get otherData(): Record<string, any> {
    return this._otherData
  }

  constructor(uri: string, prefLabels: Record<string, string>, data: Record<string, any> = {}) {
    super(new rdf.NamedNode(uri), new EntityGraph(new rdf.Store(), uri))
    this._prefLabels = prefLabels
    debug("data", data)
    this._otherData = data
  }

  public addOtherData(key: string, value: any): ExtRDFResourceWithLabel {
    return new ExtRDFResourceWithLabel(this.node.uri, this._prefLabels, { ...this._otherData, [key]: value })
  }
}

export enum ObjectType {
  Literal,
  Facet,
  ResInList,
  ResExt,
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

  // returns new subject extended with some TTL
  extendWithTTL(ttl: string): Subject {
    const newStore: rdf.Store = rdf.graph()
    // DONE: merge with current store
    newStore.addAll(this.graph.store.statements)
    rdf.parse(ttl, newStore, rdf.Store.defaultGraphURI, "text/turtle")
    const newGraph = new EntityGraph(newStore, this.graph.topSubjectUri, this.graph.associatedLabelsStore)
    const newSubject = new Subject(this.node, newGraph)
    return newSubject
  }
}

export class Ontology {
  store: rdf.Store

  constructor(store: rdf.Store) {
    this.store = store
  }
}
