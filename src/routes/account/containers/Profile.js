import React, { useEffect, useContext } from "react"
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react"
import { AuthContext } from "../../../contexts/AuthContext"

function ProfileContainer() {
  const { profile, fetchProfile } = useContext(AuthContext)
  const { user, isAuthenticated, isLoading } = useAuth0()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return
    if (!profile) fetchProfile()
  }, [isLoading, isAuthenticated, profile, fetchProfile])

  if (isLoading) return <span>Loading</span>
  if (!isAuthenticated) return

  return (
    <div role="main">
      <div
        className="container mx-auto col-12 col-md-auto"
        style={{ height: "600px", width: "400px", marginTop: "50px" }}
      >
        <div className="card mt-0 pt-0 px-0">
          <div className="card-body">
            <div className="col-auto px-0">
              <img
                className="img-fluid mx-auto d-block pb-4"
                src="/images/BUDA-small.svg"
                width="100px"
                alt="profile"
              />

              <p className="mb-2 pb-2 text-center text-contrast">Basic details</p>
              <div className="container small">
                <div className="row mb-1">
                  <div className="col">Name:</div>
                  <div className="col-9">{user && user.name ? user.name : "Not set"}</div>
                </div>
                <div className="row mb-1">
                  <div className="col">Email:</div>
                  <div className="col-9">{user ? user.email : null}</div>
                </div>
              </div>
              <hr className="pb-2" />

              <p className="mb-2 pb-2 text-center text-contrast">Preferences</p>
              <div className="container small">
                <div className="row mb-1">
                  <div className="col">Language:</div>
                  <div className="col-8">
                    {profile && profile.preferences && profile.preferences["language"]
                      ? profile.preferences["language"]
                      : "default"}
                  </div>
                </div>
              </div>
              <hr className="pb-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAuthenticationRequired(ProfileContainer, {
  onRedirecting: () => <span>Loading</span>,
})
