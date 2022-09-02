import React, { useEffect, useRef, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useHistory } from "react-router-dom"
import { connect } from "react-redux"
import { DndProvider } from "react-dnd"
import Backend from "react-dnd-html5-backend"
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles"
import CircularProgress from "@material-ui/core/CircularProgress"
import InfiniteScroll from "react-infinite-scroller"
import { lensPath, view, map, addIndex } from "ramda"

//import { default as BVMT } from "../libs/bvmt/src/App"
import VolumeSearch from "../libs/bvmt/src/components/VolumeSearch"
import UpdateManifestError from "../libs/bvmt/src/components/UpdateManifestError"
import { setManifest } from "../libs/bvmt/src/redux/actions/manifest"
import { getOrInitManifest } from "../libs/bvmt/src/api/getManifest"
import Card from "../libs/bvmt/src/components/Card"

import OutlineInfo from "../components/OutlineInfo"

const mapIndex = addIndex(map)
const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#212121",
    },
  },
})

const imageListLens = lensPath(["view", "view1", "imagelist"])

// there's nothing to extend because it's a functional component...
// so let's copy/paste what we need instead
function OutlineApp(props: any) {
  const { manifest } = props

  const imageList = view(imageListLens, manifest) as Buda.Image[] || []
  const [isFetching, setIsFetching] = React.useState(false)
  const [fetchErr, setFetchErr] = React.useState(null)
  const [renderToIdx, setRenderToIdx] = React.useState(9) // eslint-disable-line no-magic-numbers
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [postErr, setPostErr] = React.useState(null)

  const search = window.location.search
  const params = new URLSearchParams(search)
  const volume = params.get("volume") || props.volume

  const { dispatch } = props

  //console.log("vol:",volume,props,manifest)

  if (!volume && !manifest.isDefault) {
    manifest.isDefault = true
    if (manifest.imggroup) delete manifest.imggroup
  }

  // fix for hot reload triggering "Cannot have two HTML5 backends at the same time" error
  // (see https://github.com/react-dnd/react-dnd/issues/894#issuecomment-386698852)
  window.__isReactDndBackendSetUp = false

  React.useEffect(() => {
    return () => {
      //console.log("unmounting BVMT")
    }
  }, [])

  React.useEffect(() => {
    setFetchErr(null)
    if (!volume) {
      setIsFetching(false)
    } else {
      const getData = async () => {
        setIsFetching(true)
        try {
          const { manifest } = await getOrInitManifest(volume, {
            uiLanguage: "en",
          })
          setIsFetching(false)
          dispatch(setManifest(manifest))
        } catch (err) {
          setIsFetching(false)
          setFetchErr(err.message)
        }
      }
      getData()
    }
  }, [dispatch, volume])

  const handleLoadMore = () => {
    setRenderToIdx(renderToIdx + 10) // eslint-disable-line no-magic-numbers
    // setting this isfetching stops the infinite scroll from getting caught in a loop
    setIsLoadingMore(true)
    setTimeout(() => {
      setIsLoadingMore(false)
    }, 3000) // eslint-disable-line no-magic-numbers
  }

  const imageListLength = imageList.length

  return (
    <ThemeProvider theme={theme}>
      <DndProvider backend={Backend}>
        <UpdateManifestError postErr={postErr} setPostErr={setPostErr} />
        {manifest.isDefault ? (
          <VolumeSearch
            history={props.history}
            isFetching={isFetching}
            fetchErr={fetchErr}
            {...(manifest && manifest["imggroup"] ? { forVolume: manifest["imggroup"] } : {})}
          />
        ) : (
          <div className="App" style={{ paddingTop: 125 }}>
            <div>
              <div className="container mx-auto">
                <InfiniteScroll
                  pageStart={0}
                  key={0}
                  loadMore={handleLoadMore}
                  hasMore={imageList.length > renderToIdx && !isLoadingMore}
                  loader={
                    <div key="circular" className="container mx-auto flex items-center justify-center">
                      <CircularProgress />
                    </div>
                  }
                  useWindow={true}
                >
                  {mapIndex(
                    (item: Buda.Image, i: number) => (
                      <React.Fragment key={i}>
                        <Card imageListLength={imageListLength} data={item} key={item.id} i={i} />
                        <OutlineInfo
                          imageListLength={imageListLength}
                          data={item}
                          key={item.id + "_outline-info"}
                          i={i}
                        />
                      </React.Fragment>
                    ),
                    imageList.slice(0, renderToIdx)
                  )}
                </InfiniteScroll>
              </div>
            </div>
          </div>
        )}
      </DndProvider>
    </ThemeProvider>
  )
}

const mapStateToProps = function (state: any) {
  return {
    manifest: state.manifest,
  }
}

const OutlineAppContainer = connect(mapStateToProps)(OutlineApp)

function OutlineEditorContainer(props) {
  const auth = useAuth0()
  const routerHistory = useHistory()

  return (
    <div>
      <div>
        <h1>Outline Editor</h1>
        <p>Work in progress</p>
        <OutlineAppContainer {...props} auth={auth} history={routerHistory} />
      </div>
    </div>
  )
}

export default OutlineEditorContainer
