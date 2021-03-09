const config = {
  __DEV__: false,
  API_BASEURL: "https://api.msblabs.us/bd/",
  env: process.env.NODE_ENV || "production",
  SITE_URL: "https://buda-editor.msblabs.us",
  requireAuth: true,
  LIBRARY_URL: "https://library.bdrc.io/simplesearch",
}

export default config
