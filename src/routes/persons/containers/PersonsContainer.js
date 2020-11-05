import React, { useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet"
import { debounce } from "throttle-debounce"

import { FaSearch } from "react-icons/fa"
import NotFoundIcon from "@material-ui/icons/BrokenImage"

import PersonCard from "../components/PersonCard"
import useDataFetcher from "../helpers/useDataFetcherPerson"

// const debug = require("debug")("bdrc:persons")

// callback will only be executed (delay) milliseconds after the last debounced-function call.
const DEBOUNCE_PERIOD = 500

function PersonsContainer(props) {
  const [search, setSearch] = useState("")
  const [inputValue, setInputValue] = useState("")
  const { loadingState, person, reset } = useDataFetcher(search)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autoCompleteDebounce = useCallback(debounce(DEBOUNCE_PERIOD, setSearch), [])

  return (
    <React.Fragment>
      <Helmet>
        <title>Search Persons</title>
        <meta name="description" content={"Persons search"} />
      </Helmet>
      <div role="main">
        <section className="jumbotron text-center pb-2">
          <div className="container small text-muted">
            <p className="mb-1">Test cases in ascending complexity:</p>
            {["P2", "P10", "P816", "P7", "P21", "P314", "P1583", "P264", "P270"].map((v) => (
              <Link className="text-contrast px-1" key={`_eg_${v}`} to={`/person/${v}`}>
                {v}
              </Link>
            ))}
          </div>
        </section>

        <div className="input-group mb-4 col-lg-4 col-md-6 col-sm-8 mx-auto">
          <input
            type="search"
            placeholder="Search by id, e.g. P314"
            value={inputValue}
            onChange={(e) => {
              const q = e.target.value.toUpperCase()
              if (q.length <= 1) reset()
              setInputValue(q)
              autoCompleteDebounce(q)
            }}
            aria-describedby="button-addon5"
            className="form-control"
          />
          <div className="input-group-append">
            <button
              id="button-addon5"
              type="submit"
              className="btn btn-primary"
              onMouseDown={(e) => {
                if (inputValue.length > 1) setSearch(inputValue.toUpperCase())
              }}
            >
              <FaSearch className="ml-1" />
            </button>
          </div>
        </div>

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

export default PersonsContainer
