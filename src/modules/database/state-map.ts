/**
 * @module Database
 */

/** Imports */
import Ajv from 'ajv'
import { OneOrMore } from '../../types/OneOrMore'
import { InvalidStateMapError } from './errors/InvalidStateMapError'

/**
 * Defines a collection affected by a state and its data
 */
export type Content = {
  collection: string,
  data: OneOrMore<Record<string, any>>
}

/**
 * Describes a mapping of state name to state content
 *
 * The following JSON Schema describes a valid StateMap
 * ```json
 * {
 *     "type": "object",
 *     "patternProperties": {
 *         ".*": {
 *             "type": "array",
 *             "minItems": 1,
 *             "items": {
 *                 "type": "object",
 *                 "properties": {
 *                     "collection": {
 *                         "type": "string",
 *                         "minLength": 1
 *                     },
 *                     "data": {
 *                         "oneOf": [
 *                             {
 *                                 "type": "object",
 *                                 "minProperties": 1
 *                             },
 *                             {
 *                                 "type": "array",
 *                                 "minItems": 1,
 *                                 "items": {
 *                                     "type": "object",
 *                                     "minProperties": 1
 *                                 }
 *                             }
 *                         ]
 *                     }
 *                 },
 *                 "required": [
 *                     "collection",
 *                     "data"
 *                 ]
 *             }
 *         }
 *     },
 *     "minProperties": 1
 * }
 * ```
 */
export type StateMap = {
  [ stateName: string ]: Content[]
}

/**
 * JSON Schema of a state map entry's content
 * @ignore
 */
const CONTENT_SCHEMA = {
  type: 'object',
  minProperties: 1
}

/**
 * JSON Schema of a state map
 * @ignore
 */
const SCHEMA = {
  type: 'object',
  patternProperties: {
    ".*": {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          collection: { type: 'string', minLength: 1 },
          data: {
            oneOf: [
              CONTENT_SCHEMA,
              { type: 'array', minItems: 1, items: CONTENT_SCHEMA }
            ]
          }
        },
        required: [ 'collection', 'data' ]
      }
    }
  },
  minProperties: 1
}

/**
 * Validates a given object to check if it is a valid state map
 * @param obj Object to be validated
 * @ignore
 */
export function validateStateMap (obj: any): obj is StateMap {
  const ajv = new Ajv()
  if (ajv.validate(SCHEMA, obj)) return true

  throw new InvalidStateMapError(ajv.errors || [])
}
