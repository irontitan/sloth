/**
 * Helper functions to aid mocking a mongodb database
 *
 * @module Database
 */

/** Imports */
import path from 'path'
import mongodb, { Db, ObjectId } from 'mongodb'
import { OneOrMore } from '../../types/OneOrMore'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { StateNotFoundError } from './errors/StateNotFoundError'

/**
 * Defines a collection affected by a state and its data
 */
export type Content = {
  collection: string,
  data: OneOrMore<Record<string, any>>
}

/**
 * Describes the states file
 */
export type States = {
  [ stateName: string ]: Content[]
}

/**
 * Represents the returned config values for the created database
 */
export type DatabaseConfig = {
  uri: string,
  dbName: string,
  port: number
}

/**
 * Represents the toolbox's database object.
 * @typeparam TStates - The type of you states object
 */
export type Database<TStates extends States> = {
  /**
   * Generated configuration for in-memory database connection
   */
  config: DatabaseConfig,
  /**
   * Takes the name of a pre-defined state and applies it to the in-memory
   * database
   * @param stateName - Name of the desired state
   */
  setState: (stateName: keyof TStates) => Promise<void>
  /**
   * Clears the in-memory database by removing every document from every collection
   */
  clear: () => Promise<void>
  /**
   * Stops the in-memory database server
   */
  stop: () => Promise<boolean>
}

/**
 * Clears a given database
 * @param db Database to be cleared
 * @ignore
 */
async function clearDb (db: Db) {
  const collections = await db.listCollections().toArray().then(collections => collections.map(({ name }) => name as string))

  await Promise.all(collections.map(collection => db.collection(collection).remove({})))
}

/**
 * Translates fields from javascript objects to mongodb values
 * @param dataEntry Object to be translated
 * @returns The converted object
 * @ignore
 */
function prepareContentDataEntry (dataEntry: any) {
  if ('_id' in dataEntry && typeof dataEntry._id === 'string') {
    return {
      ...dataEntry,
      _id: new ObjectId(dataEntry._id)
    }
  }

  return dataEntry
}

/**
 * Applies a given state to a database
 * @param db Database to set the state on
 * @param states List of pre-defined states
 * @param stateName Name of the state to apply
 * @ignore
 */
async function setDbState (db: Db, states: States, stateName: string) {
  if (!stateName) throw new StateNotFoundError(stateName)

  const state = states[ stateName ]

  await clearDb(db)

  await Promise.all(state.map(async ({ collection: collectionName, data }) => {
    const isArray = Array.isArray(data)
    const collection = db.collection(collectionName)
    const preparedData = isArray ? data.map(prepareContentDataEntry) : prepareContentDataEntry(data)

    await isArray
      ? collection.insertMany(preparedData)
      : collection.insertOne(preparedData)
  }))
}

/**
 *
 * @param filePath Exploded path of the file to load.
 * **The first parameter should always be __dirname**.
 *
 * Passed parameters will be joined using `path.join` to form the full path to
 * the file.
 *
 * *File extensions should not be necessary*
 */
export async function initFromFile<TStates extends States = any> (...filePath: string[]): Promise<Database<TStates>> {
  const actualPath = path.resolve(path.join(...filePath))
  const states = require(actualPath)

  return init<TStates>(states)
}

/**
 * Creates a new instance of {@link Database} with given states available
 * @param states List of states that should be available for the created database instance
 * @returns Promise resolving to an instance of {@link Database}
 */
export async function init<TStates extends States> (states: TStates): Promise<Database<TStates>> {
  const mongod = new MongoMemoryServer()

  const uri = await mongod.getUri()
  const port = await mongod.getPort()
  const dbName = await mongod.getDbName()

  const connection = await mongodb.connect(uri)
  const database = connection.db(dbName)

  return {
    config: { uri, port, dbName },
    setState: (stateName: keyof TStates) => setDbState(database, states, stateName as string),
    clear: () => clearDb(database),
    stop: mongod.stop
  }
}

export default {
  init,
  initFromFile
}
