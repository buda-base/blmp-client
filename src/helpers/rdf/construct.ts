import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import * as ns from "./ns"
import * as id from "./../id"
import { RDFResource, Subject, NodeShape, EntityGraph } from "./types"

const debug = require("debug")("bdrc:rdf:construct")

const nodeForType = (type: string, parentLname: string): rdf.NamedNode => {
  let prefix = type
  if (parentLname) {
    prefix = parentLname + "_" + type
  }
  return ns.BDR(id.shortIdGenerator(prefix)) as rdf.NamedNode
}

export const generateNew = (type: string, shape: NodeShape | null, parent?: RDFResource): Subject => {
  let graph: EntityGraph
  let parentLname = ""
  const node = nodeForType(type, parentLname)
  if (parent) {
    graph = parent.graph
    parentLname = parent.lname
  } else {
    graph = new EntityGraph(rdf.graph(), node.uri)
  }
  return new Subject(node, graph)
}
