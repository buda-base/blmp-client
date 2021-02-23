import * as rdf from 'rdflib'
import * as shapes from './shapes'
import * as ns from './ns'
import {Memoize} from 'typescript-memoize';

export class RDFResource {
  node: rdf.NamedNode
  store: rdf.Store

  constructor(node: rdf.NamedNode, store: rdf.Store) {
    this.node = node
    this.store = store
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

  public getPropValueByLang(p:rdf.NamedNode): Record<string,string> {
    const lits:Array<rdf.Literal> = this.store.each(this.node, p, null) as Array<rdf.Literal>
    const res :Record<string,string> = {}
    for (const lit of lits) {
      res[lit.language] = lit.value
    }
    return res
  }

  public getPropValueLname(p:rdf.NamedNode): string|null {
    const val:rdf.NamedNode = this.store.any(this.node, p, null) as rdf.NamedNode
    if (val == null)
      return null

    return ns.lnameFromUri(val.value)
  }
}

export class RDFResourceWithLabel extends RDFResource {

  @Memoize()
  public get prefLabels(): Record<string,string> {
    return this.getPropValueByLang(shapes.prefLabel)
  }
}

export class Property extends RDFResourceWithLabel {

  // different property for prefLabels, property shapes are using sh:name
  @Memoize()
  public get prefLabels(): Record<string,string> {
    return this.getPropValueByLang(shapes.shName)
  }

  @Memoize()
  public get editorLname(): string|null {
    return this.getPropValueLname(shapes.dashEditor)
  }

}

export class PropertyGroup extends RDFResourceWithLabel {

  @Memoize()
  public get props(): Array<Property> {
    const res: Array<Property> = []
    let propsingroup:Array<rdf.NamedNode> = this.store.each(null, shapes.shGroup, this.node) as Array<rdf.NamedNode>
    propsingroup = shapes.sortByPropValue(propsingroup, shapes.shOrder, this.store)
    for (const prop of propsingroup) {
      res.push(new Property(prop, this.store))
    }
    return res
  }

}

export class TopShape extends RDFResourceWithLabel {

  @Memoize()
  public get groups(): Array<PropertyGroup> {
    const res: Array<PropertyGroup> = []
    // get all ?shape sh:property/sh:group ?group
    const props:Array<rdf.NamedNode> = this.store.each(this.node, shapes.shProperty, null) as Array<rdf.NamedNode>
    let grouplist:Array<rdf.NamedNode> = []
    for (const prop of props) {
      // we assume there's only one group per property, by construction of the shape (maybe it's wrong?)
      const group:rdf.NamedNode|null = this.store.any(prop, shapes.shGroup, null) as rdf.NamedNode
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
