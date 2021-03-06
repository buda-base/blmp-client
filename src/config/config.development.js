const config = {
  __DEV__: true,
  API_BASEURL: "http://localhost:4061/api/",
  env: process.env.NODE_ENV || "development",
  SITE_URL: "http://localhost:3001",
  requireAuth: false,
  LIBRARY_URL: "http://localhost:3000/simplesearch",
  //LIBRARY_URL: "http://library-dev.bdrc.io/simplesearch",
}

export default config
