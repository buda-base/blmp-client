const config = {
  __DEV__: false,
  API_BASEURL: "https://editserv.bdrc.io/",
  env: process.env.NODE_ENV || "production",
  SITE_URL: "https://editor.bdrc.io",
  requireAuth: true,
  LIBRARY_URL: "https://library-dev.bdrc.io",
  TEMPLATES_BASE: "https://purl.bdrc.io/",
  LDSPDI_URL: "https://ldspdi-dev.bdrc.io"
}

export default config
