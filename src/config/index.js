const debug = require("debug")("bdrc:config")

const appEnv = process.env.NODE_ENV || "development"
let priv = {}
try {
  priv = require("./config.private").default
  //debug("private:",priv)
} catch (e) {
  debug("config.private not found")
}
const config = { ...require(`./config.${appEnv}`).default, ...priv }

export default config
