const debug = require("debug")("bdrc:rdf:lang")

export const ValueByLangToStrPrefLang = (vbl: Record<string,string>, prefLang:string) => {
  if (prefLang in vbl) return vbl[prefLang]
  if (prefLang === "bo" && "bo-x-ewts" in vbl) {
    // TODO: convert to Unicode from EWTS
    return vbl["bo-x-ewts"]
  }
  if ("en" in vbl) return vbl["en"]
  return "[no label]"
}
