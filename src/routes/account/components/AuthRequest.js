import React from "react"
import { Link } from "react-router-dom"

export function AuthRequest(props) {
  return (
    <React.Fragment>
      <div role="main">
        <section className="jumbotron pb-1 mb-0">
          <div className="container text-center">
            <p className="text-muted">
              You must be signed in to your account to access this feature.
            </p>
            <div className="container col-md-4">
              <Link
                className="btn btn-danger px-4"
                to={"/login?redirect=" + window.location.pathname}
              >
                Login
              </Link>
              <p className="card-text small text-center pt-1 pb-4 mt-3">
                <a href="/register" className="text-secondary">
                  Don’t have a user account yet? Create one now.
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}
