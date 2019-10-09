/**
* @module Database
 */

/** Imports */
import { SlothError } from '../../../errors/SlothError'

export class NoStateMapProvidedError extends SlothError {
  constructor () {
    super('No state map was passed to sloth\'s `database.init` function')
  }
}
