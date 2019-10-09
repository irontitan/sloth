/**
* @module Database
 */

/** Imports */
import { ErrorObject } from 'ajv'
import { SlothError } from '../../../errors'

export class InvalidStateMapError extends SlothError {
  constructor (errors: ErrorObject[]) {
    super(`Passed state map is not valid. Errors: \n\n${errors.map(error => error.message).join(`\n - `)}`)
  }
}
