const appEnv = process.env.NODE_ENV || "development"
const config = require(`./config.${appEnv}`).default

export default config
