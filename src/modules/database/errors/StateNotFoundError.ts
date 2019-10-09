/**
 * Errors thrown in various situations
 *
 * @module Database/Errors
 */

/** Imports */
import { TestToolboxError } from '../../../errors/TestToolboxError'

/**
 * Thrown by `setState` whenever the given state cannot be found
 */
export class StateNotFoundError extends TestToolboxError {
  /**
   * @param stateName Name of the state that couldn't be found
   */
  constructor (readonly stateName: string) {
    super(`State ${stateName} does not exist`)
  }
}
