import * as rdf from 'rdflib'


export const debugStore = (s: rdf.Store, ns: String) => {
	let defaultRef = new rdf.NamedNode(rdf.Store.defaultGraphURI)
  const debug = require("debug")(ns)
	rdf.serialize(defaultRef, s, undefined, 'text/turtle', function(err, str) { debug(str); });
}

export const loadTtl = async (url: string): Promise<rdf.Store> => {
  const response = await fetch(url);
  const body = await response.text();
  let store: rdf.Store = rdf.graph();
  rdf.parse(body, store, rdf.Store.defaultGraphURI, 'text/turtle');
  return store;
}
