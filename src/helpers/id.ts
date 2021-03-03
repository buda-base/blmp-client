import { nanoid, customAlphabet } from "nanoid"

const NANOID_LENGTH = 8
const NANOID_ENTITY_LENGTH = 16
const nanoidCustom = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", NANOID_ENTITY_LENGTH)

export function idGenerator(prefix = "") {
  return `${prefix}${nanoid()}`
}

export function shortIdGenerator(prefix = "") {
  return `${prefix}${nanoidCustom()}`
}

export function entityIdGenerator(prefix = "") {
  return `${prefix}${nanoidCustom()}`
}
