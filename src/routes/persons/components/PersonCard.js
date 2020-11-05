import React, { useMemo } from "react"
import PropTypes from "prop-types"
import { Link } from "react-router-dom"
import { FaExternalLinkAlt } from "react-icons/fa"

import DataGrid from "./DataGrid"
import PersonHeader from "./PersonHeader"
import { extractTextLiteral, extractDisplayName, labelsForPerson } from "../../helpers/formatters"

const columns = [
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

function PersonCard(props) {
  const { person, grid = true } = props

  const rows = useMemo(() => {
    if (!person || !person.data || !grid) return []
    return person.data.map((b) => ({
      "@id": b["@id"],
      id: b["@id"],
      type: b.type,
      values: labelsForPerson.map((e) => extractTextLiteral(b[e], e, { convertWylie: true })),
    }))
  }, [person, grid])

  if (!person) return null

  return (
    <React.Fragment>
      <div className="container col-md-6 col-lg-4">
        <PersonHeader name={extractDisplayName(person.prefLabel)} id={person.id} />
      </div>
      <div className="text-center mx-auto col-md-6 pb-2">
        <Link className="btn btn-sm btn-contrast" to={`/person/${person.id}/edit`}>
          Edit
        </Link>
        <a
          className="btn btn-sm btn-primary ml-2"
          href={`https://library.bdrc.io/show/bdr:${person.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Library
          <FaExternalLinkAlt className="icon mr-1" />
        </a>
      </div>

      {grid ? (
        <div className="col-md-8 mx-auto py-2 mt-2 border">
          <DataGrid columns={columns} data={rows} />
        </div>
      ) : null}
    </React.Fragment>
  )
}

PersonCard.propTypes = {
  person: PropTypes.object.isRequired,
  grid: PropTypes.bool,
}

export default PersonCard
