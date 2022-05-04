const enTranslations = {
  home: {
    title: "BUDA Editor",
    uilang: "UI Language",
    nav: "navigation",
  },
  types: {
    person: "Person",
    person_plural: "Persons",
    work: "Work",
    work_plural: "Works",
    place: "Place",
    place_plural: "Places",
    version: "Version",
    version_plural: "Versions",
    loading: "Loading...",
    creating: "Creating...",
    redirect: "Redirecting...",
    boolean: "Boolean",
    true: "True",
    false: "False",
  },
  search: {
    help: {
      preview: "Preview resource",
      open: "Open in Library",
      replace: "Replace",
      edit: "Edit resource",
    },
    lookup: "lookup",
    cancel: "cancel",
    change: "change",
    create: "...",
    new: "new {{type}}",
    open: "open",
  },
  error: {
    inferiorTo: "must be inferior to {{val}}",
    superiorTo: "must be superior to {{val}}",
    inferiorToStrict: "must be inferior and not equal to {{val}}",
    superiorToStrict: "must be superior and not equal to {{val}}",
    empty: "should not be empty",
    unique: "duplicate language",
    exist: "Entity {{id}} does not exist",
    shape: "Cannot find any appropriate shape for entity {{id}}",
    redirect: "Create new or load another entity",
    minC: "at least {{count}} value must be provided",
    maxC: "at most {{count}} value can be provided",
    prefix: "RID prefix must be set in <res>user profile</res>",
    notF: "Resource {{RID}} not found",
    type: "{{id}} is a {{actual}}; but a {{allow}} is required here",
    preview: "This entity is not on BUDA because it has not been saved yet",
  },
  general: {
    add_another: "Add {{val}}",
    add_another_plural: "Add N {{val}}",
    toggle: "{{show}} empty secondary properties",
    show: "Show",
    hide: "Hide",
    add_nb: "Number of {{val}} to add",
    close: "Close all open entities",
    import: "Import labels",
    preview: "View on BUDA",
  },
}

export default enTranslations
