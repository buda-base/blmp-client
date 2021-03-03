import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { fetchUrlFromTypeQname } from "./shapes"
import * as ns from "./ns"
import * as id from "./../id"
import { RDFResource, Subject } from "./types"

const debug = require("debug")("bdrc:rdf:construct")

const nodeForType = (type: string, parentLname: string): rdf.NamedNode => {
  let prefix = type
  if (parentLname) {
    prefix = parentLname + "_" + type
  }
  return ns.BDR(id.shortIdGenerator(prefix)) as rdf.NamedNode
}

export const generateNew = (type: string, parent?: RDFResource): Subject => {
  let store: rdf.Store
  let parentLname = ""
  if (parent) {
    store = parent.store
    parentLname = parent.lname
  } else {
    store = rdf.graph()
  }
  const node = nodeForType(type, parentLname)
  return new Subject(node, store)
}
