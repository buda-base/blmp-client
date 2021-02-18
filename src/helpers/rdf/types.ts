import * as rdf from 'rdflib'

export interface INamedNode {
	value: string
}

export interface RDFResource {
	node: INamedNode,
	store: rdf.Store
}