/**
 * @module Database
 */

/** Imports */
import { SlothError } from '../../../errors/SlothError'

/**
 * Thrown by `setState` whenever the given state cannot be found
 */
export class StateNotFoundError extends SlothError {
  /**
   * @param stateName Name of the state that couldn't be found
   */
  constructor (readonly stateName: string) {
    super(`State ${stateName} does not exist`)
  }
}
