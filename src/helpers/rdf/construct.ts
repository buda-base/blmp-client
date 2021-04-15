import * as rdf from "rdflib"
import config from "../../config"
import { useState, useEffect, useContext } from "react"
import { useRecoilState } from "recoil"
import * as ns from "./ns"
import { RDFResource, Subject, EntityGraph, RDFResourceWithLabel } from "./types"
import { NodeShape } from "./shapes"
import * as id from "./../id"
import { IFetchState } from "./io"
import * as shapes from "./shapes"
import { entitiesAtom, EditedEntityState } from "../../containers/EntitySelectorContainer"

const debug = require("debug")("bdrc:rdf:construct")

export const nodeForType = (type: string, parentLname: string): rdf.NamedNode => {
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

export function EntityCreator(shapeRef: RDFResourceWithLabel) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject>()
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const reset = () => {
    setEntity(undefined)
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    // TODO: in the future this can be async
    function fetchResource(shapeRef: RDFResourceWithLabel) {
      setEntityLoadingState({ status: "creating", error: undefined })
      const newSubject = generateNew("P", null)
      const newEntity = {
        subjectQname: newSubject.qname,
        state: EditedEntityState.NeedsSaving,
        shapeRef: shapeRef,
        subject: newSubject,
        subjectLabelState: newSubject.getAtomForProperty(shapes.prefLabel.uri),
      }
      setEntities([newEntity, ...entities])
      setEntity(newSubject)
      setEntityLoadingState({ status: "created", error: undefined })
    }
    fetchResource(shapeRef)
  }, [shapeRef])

  return { entityLoadingState, entity, reset }
}
