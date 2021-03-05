import * as rdf from "rdflib"
import * as shapes from "./shapes"
import * as ns from "./ns"
import { idGenerator } from "../id"
import { Memoize } from "typescript-memoize"
import { atom, useRecoilState, useRecoilValue, selectorFamily, atomFamily, DefaultValue, AtomEffect } from "recoil"

const debug = require("debug")("bdrc:rdf:types")

export class RDFResource {
  node: rdf.NamedNode
  store: rdf.Store

  constructor(node: rdf.NamedNode, store: rdf.Store) {
    this.node = node
    this.store = store
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
    const lits: Array<rdf.Literal> = this.store.each(this.node, p, null) as Array<rdf.Literal>
    const res: Record<string, string> = {}
    for (const lit of lits) {
      res[lit.language] = lit.value
    }
    return res
  }

  public getPropLitValues(p: rdf.NamedNode): Array<rdf.Literal> {
    return this.store.each(this.node, p, null) as Array<rdf.Literal>
  }

  public getPropResValues(p: rdf.NamedNode): Array<rdf.NamedNode> {
    return this.store.each(this.node, p, null) as Array<rdf.NamedNode>
  }

  public getPropIntValue(p: rdf.NamedNode): number | null {
    const lit: rdf.Literal = this.store.any(this.node, p, null) as rdf.Literal
    return shapes.rdfLitAsNumber(lit)
  }

  public getPropResValue(p: rdf.NamedNode): rdf.NamedNode | null {
    const res: rdf.NamedNode = this.store.any(this.node, p, null) as rdf.NamedNode
    return res
  }

  public getPropBooleanValue(p: rdf.NamedNode, dflt = false): boolean {
    const lit: rdf.Literal = this.store.any(this.node, p, null) as rdf.Literal
    const n = Boolean(lit.value)
    if (n) {
      return n
    }
    return dflt
  }

  public getPropValueLname(p: rdf.NamedNode): string | null {
    const val: rdf.NamedNode = this.store.any(this.node, p, null) as rdf.NamedNode
    if (val == null) return null

    return ns.lnameFromUri(val.value)
  }
}

export class RDFResourceWithLabel extends RDFResource {
  @Memoize()
  public get prefLabels(): Record<string, string> {
    return this.getPropValueByLang(shapes.prefLabel)
  }
}

export class Property extends RDFResourceWithLabel {
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

  @Memoize()
  public get path(): rdf.NamedNode | null {
    return this.getPropResValue(shapes.shPath)
  }
}

export class PropertyGroup extends RDFResourceWithLabel {
  @Memoize()
  public get properties(): Array<Property> {
    const res: Array<Property> = []
    let propsingroup: Array<rdf.NamedNode> = this.store.each(null, shapes.shGroup, this.node) as Array<rdf.NamedNode>
    propsingroup = shapes.sortByPropValue(propsingroup, shapes.shOrder, this.store)
    for (const prop of propsingroup) {
      res.push(new Property(prop, this.store))
    }
    return res
  }

  // different property for prefLabels, property shapes are using sh:name
  @Memoize()
  public get prefLabels(): Record<string, string> {
    return this.getPropValueByLang(shapes.rdfsLabel)
  }
}

export class TopShape extends RDFResourceWithLabel {
  @Memoize()
  public get groups(): Array<PropertyGroup> {
    const res: Array<PropertyGroup> = []
    // get all ?shape sh:property/sh:group ?group
    const props: Array<rdf.NamedNode> = this.store.each(this.node, shapes.shProperty, null) as Array<rdf.NamedNode>
    let grouplist: Array<rdf.NamedNode> = []
    for (const prop of props) {
      // we assume there's only one group per property, by construction of the shape (maybe it's wrong?)
      const group: rdf.NamedNode | null = this.store.any(prop, shapes.shGroup, null) as rdf.NamedNode
      if (group && !grouplist.includes(group)) {
        grouplist.push(group)
      }
    }
    grouplist = shapes.sortByPropValue(grouplist, shapes.shOrder, this.store)
    for (const group of grouplist) {
      res.push(new PropertyGroup(group, this.store))
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

type setSelfOnSelf = {
  setSelf: (arg: any) => void
  onSet: (newValues: (arg: Array<LiteralWithId> | DefaultValue) => void) => void
}

export class Subject extends RDFResource {
  propValues: Record<string, Array<LiteralWithId>> = {}

  setPropValues(propertyUri: string, values: Array<LiteralWithId>): void {
    this.propValues[propertyUri] = values
  }

  constructor(node: rdf.NamedNode, store: rdf.Store, propValues?: Record<string, Array<LiteralWithId>>) {
    super(node, store)
    if (propValues) {
      this.propValues = propValues
    }
  }

  // cloneWithUpdatedPropertyValues = (propertyUri: string, values: Array<LiteralWithId>): Subject => {
  //   const propValues: Record<string, Array<LiteralWithId>> = { ...this.propValues, propertyUri: values }
  //   return new Subject(this.node, this.store, propValues)
  // }

  static addIdToLitList = (litList: Array<rdf.Literal>): Array<LiteralWithId> => {
    return litList.map(
      (lit: rdf.Literal): LiteralWithId => {
        return new LiteralWithId(lit.value, lit.language, lit.datatype)
      }
    )
  }

  getPropValuesFromStore(propertyUri: string): Array<LiteralWithId> {
    const fromRDF: Array<rdf.Literal> = this.getPropLitValues(new rdf.NamedNode(propertyUri))
    return Subject.addIdToLitList(fromRDF)
  }

  initForProperty(p: Property) {
    if (p.uri in this.propValues) return
    const propValues: Array<LiteralWithId> = this.getPropValuesFromStore(p.uri)
    this.propValues[p.uri] = propValues
  }

  hasBeenInitializedForProperty(p: Property) {
    return p.uri in this.propValues
  }

  getAllPropValuesFromStore(): Record<string, Array<LiteralWithId>> {
    // TODO
    return {}
  }

  getPropValues(propertyUri: string): Array<LiteralWithId> {
    if (propertyUri in this.propValues) {
      return this.propValues[propertyUri]
    }
    return []
  }

  initializedPropertyUris(): Array<string> {
    return Object.keys(this.propValues)
  }

  propValuesToStore(store: rdf.Store, graphNode?: rdf.NamedNode, propertyUri?: string): void {
    if (!propertyUri) {
      for (propertyUri in this.propValues) {
        this.propValuesToStore(store, graphNode, propertyUri)
      }
      return
    }
    for (const lit of this.propValues[propertyUri]) {
      store.add(this.node, new rdf.NamedNode(propertyUri), lit)
    }
  }

  propsUpdateEffect: (propertyUri: string) => AtomEffect<Array<LiteralWithId>> = (propertyUri: string) => ({
    setSelf,
    onSet,
  }: setSelfOnSelf) => {
    onSet((newValues: Array<LiteralWithId> | DefaultValue): void => {
      if (!(newValues instanceof DefaultValue)) {
        debug("newalues for property ", propertyUri, newValues)
        this.propValues[propertyUri] = newValues
      }
    })
  }

  @Memoize()
  getAtomForProperty(propertyUri: string) {
    return atom<Array<LiteralWithId>>({
      key: this.id + propertyUri,
      default: [],
      effects_UNSTABLE: [this.propsUpdateEffect(propertyUri)],
    })
  }
}
