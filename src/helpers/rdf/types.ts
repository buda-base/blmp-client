import React, { FC } from "react"
import * as rdf from "rdflib"
import * as ns from "./ns"
import { PropertyShape, Path } from "./shapes"
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
import { uiHistoryState } from "../../atoms/common"
import { getParentPath } from "../../routes/helpers/observer"
import { nanoid } from "nanoid"

const debug = require("debug")("bdrc:rdf:types")

const defaultGraphNode = new rdf.NamedNode(rdf.Store.defaultGraphURI)
const prefLabel = ns.SKOS("prefLabel") as rdf.NamedNode
const rdfsLabel = ns.RDFS("label") as rdf.NamedNode

export const history: Record<string, Array<Record<string, any>>> = {}
export const errors: Record<string, Array<Record<string, boolean>>> = {}

/* // DONE: finally not needed 
const topUndoHasEmptyVal = (histo: Array<Record<string, any>>) => {
  if (histo.length >= 1 + 1) {
    const h1 = histo[histo.length - 1],
      h2 = histo[histo.length - 1 - 1]

    const h1_k = Object.keys(h1),
      h2_k = Object.keys(h2)
    if (h1_k.length === h2_k.length) {
      if (!h1_k.some((uri) => !h2_k.includes(uri))) {
        for (const k of h1_k) {
          if (!["tmp:parentPath", "tmp:undone"].includes(k)) {
            const h1_k_p = Object.keys(h1[k]),
              h2_k_p = Object.keys(h2[k])
            if (!h1_k_p.some((prop) => !h2_k_p.includes(prop))) {
              for (const p of h1_k_p) {
                const h1_k_p_v = h1[k][p],
                  h2_k_p_v = h2[k][p]
                if (h1_k_p_v.length - 1 === h2_k_p_v.length) {
                  const isNew = h1_k_p_v[0] as ExtRDFResourceWithLabel
                  if (isNew.uri === "tmp:uri") {
                    for (const i in h2_k_p_v) {
                      const v1 = h1_k_p_v[i + 1],
                        v2 = h2_k_p_v[i]
                      if (
                        v1 instanceof ExtRDFResourceWithLabel &&
                        v2 instanceof ExtRDFResourceWithLabel &&
                        v1.uri !== v2.uri
                      ) {
                        return false
                      }
                    }
                    debug("same with empty val", h1_k_p_v, h2_k_p_v)
                    return true
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return false
}
*/

const updateHistory = (
  entity: string,
  qname: string,
  prop: string,
  val: Array<Value>,
  noHisto: boolean | number = true
) => {
  if (!history[entity]) history[entity] = []
  else {
    while (history[entity].length && history[entity][history[entity].length - 1]["tmp:undone"]) {
      history[entity].pop()
    }
  }
  const newVal = {
    [qname]: { [prop]: val },
    ...entity != qname ? { "tmp:parentPath": getParentPath(entity, qname) } : {},
  }

  if (noHisto === -1) {
    const first = history[entity].findIndex((h) => h["tmp:allValuesLoaded"])
    if (first > 0) history[entity].splice(first, 0, newVal)
    else history[entity].push(newVal)
  } else history[entity].push(newVal)

  /* // DONE: lets try not to use this...
  while (topUndoHasEmptyVal(history[entity])) {
    history[entity].pop()
  }
  */

  //debug("history:", entity, qname, prop, val, history, noHisto)
}

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
  subjectUri = ""
  noHisto: boolean | number = false

  constructor(subjectUri: string) {
    this.subjectUri = subjectUri
  }

  onGetInitialValues = (subjectUri: string, pathString: string, values: Array<Value>) => {
    if (!(subjectUri in this.oldSubjectProps)) this.oldSubjectProps[subjectUri] = {}
    if (!(subjectUri in this.newSubjectProps)) this.newSubjectProps[subjectUri] = {}
    this.oldSubjectProps[subjectUri][pathString] = values
    this.newSubjectProps[subjectUri][pathString] = values
  }

  onUpdateValues = (subjectUri: string, pathString: string, values: Array<Value>) => {
    //debug("oUv:", this.subjectUri, this.noHisto, this)
    if (this.noHisto === true) {
      this.noHisto = false
      return
    }
    if (!(subjectUri in this.newSubjectProps)) this.newSubjectProps[subjectUri] = {}
    this.newSubjectProps[subjectUri][pathString] = values
    updateHistory(this.subjectUri, subjectUri, pathString, values, this.noHisto)
    if (this.noHisto === 1) this.noHisto = -1
  }

  isInitialized = (subjectUri: string, pathString: string) => {
    return subjectUri in this.oldSubjectProps && pathString in this.oldSubjectProps[subjectUri]
  }

  addNewValuestoStore(store: rdf.Store, subjectUri: string) {
    if (!(subjectUri in this.newSubjectProps)) return
    const subject = new rdf.NamedNode(subjectUri)
    for (const pathString in this.newSubjectProps[subjectUri]) {
      // handling inverse path vs. direct path
      if (pathString.startsWith("^")) {
        const property = new rdf.NamedNode(pathString.substring(1))
        const values: Array<Value> = this.newSubjectProps[subjectUri][pathString]
        for (const val of values) {
          if (val instanceof LiteralWithId) {
            throw "can't add literals in inverse path, something's wrong with the data!"
          } else {
            if (val.node.value == "tmp:uri") continue
            store.add(val.node, property, subject, defaultGraphNode)
            if (val instanceof Subject) {
              this.addNewValuestoStore(store, val.uri)
            }
          }
        }
      } else {
        const property = new rdf.NamedNode(pathString)
        const values: Array<Value> = this.newSubjectProps[subjectUri][pathString]
        for (const val of values) {
          if (val instanceof LiteralWithId) {
            store.add(subject, property, val, defaultGraphNode)
          } else {
            if (val.node.value == "tmp:uri") continue
            store.add(subject, property, val.node, defaultGraphNode)
            if (val instanceof Subject) {
              this.addNewValuestoStore(store, val.uri)
            }
          }
        }
      }
    }
  }

  propsUpdateEffect: (subjectUri: string, pathString: string) => AtomEffect<Array<Value>> = (
    subjectUri: string,
    pathString: string
  ) => ({ setSelf, onSet }: setSelfOnSelf) => {
    onSet((newValues: Array<Value> | DefaultValue): void => {
      if (!(newValues instanceof DefaultValue)) {
        this.onUpdateValues(subjectUri, pathString, newValues)
      }
    })
  }

  @Memoize((pathString: string, subjectUri: string) => {
    return subjectUri + pathString
  })
  getAtomForSubjectProperty(pathString: string, subjectUri: string) {
    //debug(this)
    return atom<Array<Value>>({
      key: subjectUri + pathString,
      default: [],
      effects_UNSTABLE: [this.propsUpdateEffect(subjectUri, pathString)],
      // disable immutability in production
      dangerouslyAllowMutability: !config.__DEV__,
    })
  }

  hasSubject(subjectUri: string): boolean {
    return subjectUri in this.newSubjectProps
  }
}

type setSelfOnSelf = {
  setSelf: (arg: any) => void
  onSet: (newValues: (arg: Array<Value> | DefaultValue) => void) => void
}

// a proxy to an EntityGraph that updates the entity graph but is purely read-only, so that React is happy
export class EntityGraph {
  onGetInitialValues: (subjectUri: string, pathString: string, values: Array<Value>) => void
  getAtomForSubjectProperty: (pathString: string, subjectUri: string) => RecoilState<Array<Value>>

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
    const values = new EntityGraphValues(topSubjectUri)
    this.topSubjectUri = topSubjectUri
    this.onGetInitialValues = values.onGetInitialValues
    this.getAtomForSubjectProperty = (pathString, subjectUri) =>
      values.getAtomForSubjectProperty(pathString, subjectUri)
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

  hasSubject(subjectUri: string): boolean {
    if (this.values.hasSubject(subjectUri)) return true
    return this.store.any(new rdf.NamedNode(subjectUri), null, null) != null
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
    if (this.values.isInitialized(s.uri, path.sparqlString)) {
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
        if (!p.path.directPathNode) {
          // I'm not so sure about this exception but well... it's ok in our current rules
          throw "can't have non-direct path for property " + p.uri
        }
        const fromRDFResExt: Array<rdf.NamedNode> = s.getPropResValuesFromPath(p.path)
        const fromRDFResExtwData = EntityGraph.addExtDataFromGraph(fromRDFResExt, s.graph)
        this.onGetInitialValues(s.uri, p.path.sparqlString, fromRDFResExtwData)
        return fromRDFResExtwData
        break
      case ObjectType.Facet:
        const fromRDFSubNode: Array<rdf.NamedNode> = s.getPropResValuesFromPath(p.path)
        const fromRDFSubs = EntityGraph.subjectify(fromRDFSubNode, s.graph)
        this.onGetInitialValues(s.uri, p.path.sparqlString, fromRDFSubs)
        return fromRDFSubs
        break
      case ObjectType.ResInList:
        if (!p.path.directPathNode) {
          throw "can't have non-direct path for property " + p.uri
        }
        const fromRDFResList: Array<rdf.NamedNode> = s.getPropResValues(p.path.directPathNode)
        // TODO: p.graph should be the graph of the ontology instead
        const fromRDFReswLabels = EntityGraph.addLabelsFromGraph(fromRDFResList, p.graph)
        this.onGetInitialValues(s.uri, p.path.sparqlString, fromRDFReswLabels)
        return fromRDFReswLabels
        break
      case ObjectType.Literal:
      default:
        if (!p.path.directPathNode) {
          throw "can't have non-direct path for property " + p.uri
        }
        const fromRDFLits: Array<rdf.Literal> = s.getPropLitValues(p.path.directPathNode)
        const fromRDFLitIDs = EntityGraph.addIdToLitList(fromRDFLits)
        this.onGetInitialValues(s.uri, p.path.sparqlString, fromRDFLitIDs)
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

  public get namespace(): string {
    return ns.namespaceFromUri(this.node.value)
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

  public getPropStringValue(p: rdf.NamedNode): string | null {
    const lit: rdf.Literal | null = this.graph.store.any(this.node, p, null) as rdf.Literal | null
    if (lit === null) return null
    return lit.value
  }

  public getPropResValue(p: rdf.NamedNode): rdf.NamedNode | null {
    const res: rdf.NamedNode | null = this.graph.store.any(this.node, p, null) as rdf.NamedNode | null
    return res
  }

  public getPropResValuesFromPath(p: Path): Array<rdf.NamedNode> {
    if (p.directPathNode) {
      return this.graph.store.each(this.node, p.directPathNode, null) as Array<rdf.NamedNode>
    }
    return this.graph.store.each(this.node, p.inversePathNode, null) as Array<rdf.NamedNode>
  }

  public getPropResValueFromPath(p: Path): rdf.NamedNode | null {
    if (p.directPathNode) {
      return this.graph.store.any(this.node, p.directPathNode, null) as rdf.NamedNode | null
    }
    return this.graph.store.any(this.node, p.inversePathNode, null) as rdf.NamedNode | null
  }

  public getPropBooleanValue(p: rdf.NamedNode, dflt = false): boolean {
    const lit: rdf.Literal = this.graph.store.any(this.node, p, null) as rdf.Literal
    if (!lit) return dflt
    const n = Boolean(lit.value)
    if (n) {
      return n
    }
    return dflt
  }
}

export class RDFResourceWithLabel extends RDFResource {
  private labelProp: rdf.NamedNode

  constructor(node: rdf.NamedNode, graph: EntityGraph, labelProp?: rdf.NamedNode) {
    super(node, graph)
    if (!labelProp) {
      if (node.value.startsWith("http://purl.bdrc.io/res") || node.value.startsWith("http://purl.bdrc.io/admindata/")) {
        labelProp = prefLabel
      } else {
        labelProp = rdfsLabel
      }
    }
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
    //debug("data", data)
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
      this.id = nanoid()
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

  getAtomForProperty(pathString: string) {
    return this.graph.getAtomForSubjectProperty(pathString, this.uri)
  }

  noHisto(force = false, start: boolean | number = true) {
    const current = this.graph.getValues().noHisto
    //debug("noHisto:", force, start, this.qname, this, current)
    if (!force && current === -1) return
    // DONE: default values need to be added to history when entity is loading
    if (start !== true) this.graph.getValues().noHisto = start
    // TODO: update test to be true when adding empty val after having selected ExtEntity in a Facet (use getParentPath?)
    else if (force || history[this.uri] && history[this.uri].some((h) => h["tmp:allValuesLoaded"]))
      this.graph.getValues().noHisto = true
  }

  static createEmpty(): Subject {
    return new Subject(new rdf.NamedNode("tmp:uri"), new EntityGraph(new rdf.Store(), "tmp:uri"))
  }
}

export class Ontology {
  graph: EntityGraph

  constructor(store: rdf.Store, url: string) {
    this.graph = new EntityGraph(store, url)
  }
}
