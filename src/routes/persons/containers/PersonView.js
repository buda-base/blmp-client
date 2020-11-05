import React, { useState } from "react"
import PropTypes from "prop-types"

import { Helmet } from "react-helmet"
import NotFoundIcon from "@material-ui/icons/BrokenImage"

import PersonCard from "../components/PersonCard"
import useDataFetcher from "../helpers/useDataFetcherPerson"

function PersonView(props) {
  const [id] = useState(props.match.params.id.toUpperCase())
  const { loadingState, person } = useDataFetcher(id)

  if (loadingState && loadingState.status === "fetching") return <span>Loading</span>

  return (
    <React.Fragment>
      <Helmet>
        <title>View Person {id}</title>
        <meta name="description" content={"Person view"} />
      </Helmet>
      <div role="main">
        {loadingState && loadingState.status === "error" ? (
          <p className="text-center text-muted">
            <NotFoundIcon className="icon mr-2" />
            {loadingState.error}
          </p>
        ) : null}
        {person ? (
          <section className="album py-4 my-4">
            <PersonCard person={person} />
          </section>
        ) : null}
      </div>
    </React.Fragment>
  )
}

PersonView.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string,
    }),
  }),
}
export default PersonView
