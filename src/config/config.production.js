const config = {
  __DEV__: false,
  API_BASEURL: "https://editserv-dev.bdrc.io/",
  env: process.env.NODE_ENV || "production",
  SITE_URL: "https://editor.bdrc.io",
  requireAuth: true,
  LIBRARY_URL: "https://library.bdrc.io",
  TEMPLATES_BASE: "https://purl.bdrc.io/",
}

export default config
