// SHORTCUTS
export const preferredLabel = "Preferred Label"
export const AddAnother = "Add another"
export const Required = "Required"
export const RequiredName = "Required Name*"
export const RequiredNote = "Note*"

// GENERAL
export const title = "Title"
export const note = "Note"

// LANGUAGES
export const languageDefaults = [
  { value: "bo-x-ewts" },
  { value: "bo" },
  { value: "en" },
  { value: "en-x-mixed" },
  { value: "bo-x-phon-en-m-tbrc" },
  { value: "zh-hans" },
  { value: "zh-hant" },
]

export const EventDateTypes = [
  { value: "notBefore", label: "Not Before" },
  { value: "notAfter", label: "Not After" },
  { value: "onDate", label: "On Date" },
  { value: "onOrAbout", label: "On Or About" },
  { value: "onYear", label: "On Year" },
]

export const EventTypes = {
  PersonAffiliation: "Affiliation",
  PersonAssumesOffice: "Assumes office",
  PersonAssumesSeat: "Assumes seat",
  PersonBirth: "Birth",
  PersonDeath: "Death",
  PersonDivorce: "Divorce",
  PersonEventNotSpecified: "Unspecified Event",
  PersonFinalOrdination: "Final Ordination",
  PersonFoundsMonastery: "Founds Monastery",
  PersonGterMaDiscovery: "Discovers Terma",
  PersonInResidence: "In Residence",
  PersonLeavesOffice: "Leaves Office",
  PersonLeavesSeat: "Leaves Seat",
  PersonMarriage: "Marriage",
  PersonOccupiesSeat: "Occupies Seat",
  PersonRabByungOrdination: "Preliminary Ordination",
}

export const NameTypes = {
  PersonBodhisattvaVowName: "Bodhisattva Vow Name",
  PersonChineseName: "Chinese Name",
  PersonCommonName: "Common Name",
  PersonCorporateName: "Corporate Name",
  PersonFamilyName: "Family Name",
  PersonFinalOrdinationName: "Final Ordination Name",
  PersonFirstOrdinationName: "First Ordination Name",
  PersonGterStonTitle: "Terton title",
  PersonOfficeTitle: "Office Title",
  PersonOtherName: "Other Name",
  PersonPenName: "Pen Name",
  PersonPersonalName: "Personal Name",
  PersonPrimaryName: "Primary Name",
  PersonPrimaryTitle: "Primary Title",
  PersonReversal: "Reversal",
  PersonSecretInitiatoryName: "Secret Initiatory Name",
  PersonTitle: "Other Title",
  PersonTulkuTitle: "Tulku Title",
  PersonVariantOrthography: "Variant Orthography",
  //
  RequiredNameStar: "Required Name*",
}

const sanitizeNameTypes = ({
  RequiredNameStar,
  PersonBodhisattvaVowName,
  PersonChineseName,
  PersonCorporateName,
  PersonFamilyName,
  PersonFinalOrdinationName,
  PersonFirstOrdinationName,
  PersonGterStonTitle,
  PersonOfficeTitle,
  PersonPenName,
  PersonReversal,
  PersonTulkuTitle,
  PersonVariantOrthography,
  ...rest
}) => rest

export const sanitizedNameTypes = sanitizeNameTypes(NameTypes)

export const GenderTypes = {
  GenderFemale: "female",
  GenderMale: "male",
  GenderMixed: "mixed gender",
  GenderNotSpecified: "gender not specified",
}
