import React, { useState, useEffect } from "react"
import * as rdf from "rdflib"
import * as rde_config from "./config"
import { debug as debugfactory } from "debug"
import { useRecoilState } from "recoil"
import { userQnameState, RIDprefixState, idTokenAtom } from "../atoms/common"
import { useAuth0 } from "@auth0/auth0-react"
import {
  Subject,
  NodeShape,
  EntityGraph,
  IFetchState,
  ns,
  atoms
} from "rdf-document-editor"

const debug = debugfactory("blmp:app")

let creating = false

export function EntityCreator(shapeNode: rdf.NamedNode, entityNode: rdf.NamedNode | null, unmounting = { val: false }) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject | null>(null)
  const [shape, setShape] = useState<NodeShape | null>(null)
  const [entities, setEntities] = useRecoilState(atoms.entitiesAtom)
  const [idToken, setIdToken] = useRecoilState(idTokenAtom)
  const [tab, setTab] = useRecoilState(atoms.uiTabState)
  const [userQname, setUserQname] = useRecoilState(userQnameState)
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)

  useEffect(() => {
    return () => {
      unmounting.val = true
    }
  }, [])

  const reset = () => {
    setEntity(null)
    setShape(null)
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    async function createResource(shapeNode: rdf.NamedNode, entityNode: rdf.NamedNode | null) {      
      creating = true
      if (!idToken) {
        creating = false
        setEntityLoadingState({ status: "error", error: "no token when reserving id" })
        return
      }
      if (!unmounting.val) setEntityLoadingState({ status: "fetching shape", error: undefined })
      let shape: NodeShape
      try {
        shape = await rde_config.getShapesDocument(shapeNode)        
      } catch (e) {
        debug(e)
        if (!unmounting.val) setEntityLoadingState({ status: "error", error: "error fetching shape" })
        creating = false
        return
      }

      const shapePrefix = shape.getPropStringValue(ns.rdeIdentifierPrefix)
      if (!shapePrefix) {
        setEntityLoadingState({ status: "error", error: "cannot find prefix in shape" })
        creating = false
        return
      }
      let namespace = shape.getPropStringValue(ns.shNamespace)
      if (namespace == null) namespace = rde_config.BDR_uri
      if (!unmounting.val) setEntityLoadingState({ status: "creating", error: undefined })
      let lname:string
      try {
        const prefix = shapePrefix + RIDprefix
        // if entityQname is not null, we call reserveLname with the entityQname
        const proposedLname = entityNode ? rde_config.prefixMap.lnameFromUri(entityNode.uri) : null
        lname = await rde_config.reserveLname(prefix, proposedLname, idToken)
        debug("lname:", lname, prefix, proposedLname)
      } catch (e) {
        debug(e)
        // TODO: handle 422?
        if (!unmounting.val) setEntityLoadingState({ status: "error", error: e as string })
        creating = false
        return
      }
      const uri = namespace + lname
      const graph = new EntityGraph(rdf.graph(), uri, rde_config.prefixMap)
      const node = new rdf.NamedNode(uri)
      const newSubject = new Subject(node, graph)

      const newEntity: atoms.Entity = {
        subjectQname: newSubject.qname,
        state: atoms.EditedEntityState.NeedsSaving,
        shapeQname: shape.qname,
        subject: newSubject,
        subjectLabelState: newSubject.getAtomForProperty(ns.prefLabel.uri),
        etag: null,
        loadedUnsavedFromLocalStorage: false
      }
      if (!unmounting.val) {
        const newEntities = [newEntity, ...entities]
        setEntities(newEntities)
      }
      if (!unmounting.val) setEntity(newSubject)
      if (!unmounting.val) setEntityLoadingState({ status: "created", error: undefined })
      if (!unmounting.val) setShape(shape)

      // save to localStorage
      rde_config.setUserLocalEntityFactory(userQname)(newSubject.qname, shape.qname, "", false, null, true)

      if (!unmounting.val && tab !== 0) setTab(0)
      creating = false
    }

    if(creating || entityLoadingState.status === "creating" || entityLoadingState.status === "created") return

    //debug("creator?",idToken,RIDprefix,creating,entityLoadingState.status )
    
    if (idToken && RIDprefix !== null) { 
      createResource(shapeNode, entityNode)
    }
  }, [shapeNode, entityNode, RIDprefix, idToken, entityLoadingState.status, unmounting.val, userQname, tab, entities])

  return { entityLoadingState, entity, reset }
}
