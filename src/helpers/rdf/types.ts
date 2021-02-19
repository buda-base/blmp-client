import * as rdf from 'rdflib'

export interface RDFResource {
	node: rdf.NamedNode,
	store: rdf.Store
}

export interface PropertyGroup extends RDFResource {
  node: rdf.NamedNode,
  store: rdf.Store,
  prefLabels: Record<string,string>
}
