/**
 * Global namespace
 * @module testToolbox
 */

/** Dummy comment to please typedoc */
export * from './errors'
import database from './modules/database'

export { database }

/**
 * Default export
 */
export default {
  database
}
