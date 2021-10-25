import "./jsewts.d.ts"

import { fromWylie } from "jsewts"

const debug = require("debug")("bdrc:rdf:lang")

export const ValueByLangToStrPrefLang = (vbl: Record<string, string> | null, prefLang: string) => {
  if (vbl == null) return ""
  if (prefLang in vbl) return vbl[prefLang]
  if (prefLang === "bo" && "bo-x-ewts" in vbl) {
    return fromWylie(vbl["bo-x-ewts"])
  }
  if ("en" in vbl) return vbl["en"]

  // TODO language preference list?

  if (prefLang === "en")
    for (const k of Object.keys(vbl)) if (k.endsWith("-x-ewts") || k.endsWith("-x-iast")) return vbl[k]

  const vals = Object.values(vbl)
  if (vals[0]) return vals[0]

  return ""
}
