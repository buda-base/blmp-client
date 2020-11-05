import React, { useState, useEffect, useMemo } from "react"
import PropTypes from "prop-types"
import { atom, useRecoilState, useRecoilValue, selectorFamily } from "recoil"
import { Helmet } from "react-helmet"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import Alarm from "@material-ui/icons/Alarm"

import PersonHeader from "../components/PersonHeader"
import { extractDisplayName } from "../../helpers/formatters"
import DataGrid from "../components/DataGrid"
import { extractTextLiteral, labelsForPerson } from "../../helpers/formatters"
import { TimeTravelObserver } from "../../helpers/observer"
import LabelList from "../../helpers/shapes/skos/label"
import NoteList from "../../helpers/shapes/bdo/note"
import NameList from "../../helpers/shapes/bdo/name"
import EventList from "../../helpers/shapes/bdo/event"
import * as constants from "../../helpers/vocabulary"
import useDataFetcher from "../helpers/useDataFetcherPerson"

const debug = require("debug")("bdrc:person:edit")

// RDF nodes
const personGraph = atom({
  key: "person",
  default: [], // iterable for many RDF nodes
})

// eslint-disable-next-line no-unused-vars
const getNodeByID = selectorFamily({
  key: "personNodeByID",
  get: (id) => ({ get }) => {
    return get(personGraph).find((listItem) => listItem["@id"] === id)
  },

  // optional set
  set: (id) => ({ get, set }, newValue) => {
    const arr = get(personGraph)
    const index = arr.findIndex((listItem) => listItem["@id"] === id)
    set(personGraph, [...arr.slice(0, index), newValue, ...arr.slice(index + 1)])
  },
})

const getNodesByPredicateType = selectorFamily({
  key: "personNodeByPredicateType",
  get: (predicate) => ({ get }) => {
    return get(personGraph).filter((listItem) => listItem.type === predicate)
  },
})

const getNodesStartingWith = selectorFamily({
  key: "getNodesStartingWith",
  get: (prefix) => ({ get }) => {
    return get(personGraph).filter((listItem) => listItem["@id"].startsWith(prefix))
  },
})

function PersonEditContainer(props) {
  const [id] = useState(props.match.params.id.toUpperCase())
  const { loadingState, person } = useDataFetcher(id)

  // atoms linked
  const [rootNodes, setRootNodes] = useRecoilState(personGraph)

  const notes = useRecoilValue(getNodesByPredicateType("Note"))
  const allNames = useRecoilValue(getNodesStartingWith("bdr:NM")) // TEMP TODO Check if this catches all
  const allEvents = useRecoilValue(getNodesStartingWith("bdr:EV")) // TEMP TODO Check if this catches all

  debug("nodes: %O", rootNodes)
  debug("allNames: %O", allNames)

  useEffect(() => {
    function atomize(p) {
      debug("Initializing atoms for:", p.id)
      setRootNodes(p.data)
    }
    if (person && person.data) atomize(person)
  }, [person, setRootNodes])

  /** DEBUG */
  const rowsDebug = useMemo(() => {
    if (!person || !person.data) return []
    return person.data.map((b) => ({
      "@id": b["@id"],
      id: b["@id"],
      type: b.type,
      values: labelsForPerson.map((e) => extractTextLiteral(b[e], e, { convertWylie: true })),
    }))
  }, [person])
  /** DEBUG */

  if (loadingState.status === "fetching") return <span>Loading</span>
  if (loadingState.status === "error")
    return (
      <p className="text-center text-muted">
        <NotFoundIcon className="icon mr-2" />
        {loadingState.error}
      </p>
    )

  if (!person) return null

  debug("person atoms:", id, rootNodes)
  return (
    <React.Fragment>
      <Helmet>
        <title>Edit Person {id}</title>
        <meta name="description" content={"Person edit"} />
      </Helmet>
      <div role="main">
        <section className="album pt-2 mt-2">
          <div className="container col-md-6 col-lg-4 pb-2">
            <PersonHeader name={extractDisplayName(person.prefLabel)} id={person.id} />
          </div>
        </section>
        <section className="album py-2 my-2">
          <TimeTravelObserver />
        </section>
        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12" style={{ border: "dashed 1px none" }}>
            <div className="row card my-4">
              <p className="col-4 text-uppercase small my-2">
                {constants.preferredLabel}
                <sup>*</sup>
              </p>
              <div className="col">
                <LabelList className="col col-md-6 mt-0 mt-0" id="prefLabel" initialState={person.prefLabel} />
              </div>
            </div>

            <div className="row card my-4">
              <p className="col-4 text-uppercase small my-2 pb-2">Names</p>
              <div className="col">
                <NameList
                  className="col col-md-6 mt-0 mt-0"
                  id={"names"}
                  initialState={allNames.map((item) => ({
                    "@id": item["@id"],
                    type: item["type"],
                    ...item["rdfs:label"],
                  }))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12">
            <div className="row card my-4">
              <p className="col-4 text-uppercase text-danger small my-2">
                Events - Work in Progress
                <Alarm className="icon" style={{ fontSize: "1.5em" }} />
              </p>
              <div className="col">
                <EventList className="col col-md-6 mt-0 mt-0" id="event" initialState={allEvents} />
              </div>
            </div>
          </div>
        </section>

        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12">
            <div className="row card my-4">
              <p className="col-4 text-uppercase small my-2">Notes</p>
              <div className="col">
                <NoteList className="col col-md-6 mt-0 mt-0" id="note" initialState={notes} />
              </div>
            </div>
          </div>
        </section>

        <section className="album py-4 my-4">
          <div className="text-center text-contrast small pt-1 pb-0 mb-0">DEBUG</div>
          <div className="col-lg-6 col-md-6 col-sm-12 mx-auto mt-0 mt-0" style={{ border: "dashed 1px red" }}>
            <DataGrid columns={colsDebug} data={rowsDebug} />
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}

PersonEditContainer.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string,
    }),
  }),
} // FIXME REMOVE

/** DEBUG */ const colsDebug = [
  {
    Header: "id",
    accessor: "@id", // accessor is the "key" in the data
  },
  {
    Header: "Type",
    accessor: "type",
  },
  {
    Header: "Values",
    accessor: "values",
  },
]

export default PersonEditContainer
