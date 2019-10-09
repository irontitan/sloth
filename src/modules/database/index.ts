/**
 * Helper functions to aid mocking a mongodb database
 *
 * @module Database
 * @preferred
 */

/**
 * Imports
 */
import path from 'path'
import mongodb, { Db, ObjectId } from 'mongodb'
import { StateMap, validateStateMap } from './state-map'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { NoStateMapProvidedError, StateNotFoundError } from './errors'

/**
 * Represents the returned config values for the created database
 */
export type DatabaseConfig = {
  uri: string,
  dbName: string,
  port: number
}

/**
 * Represents sloth's database object.
 * @typeparam TStateMap - The type of you states object
 */
export type SlothDatabase<TStateMap extends StateMap> = {
  /**
   * Generated configuration for in-memory database connection
   */
  config: DatabaseConfig,
  /**
   * Takes the name of a pre-defined state and applies it to the in-memory
   * database
   * @param stateName - Name of the desired state
   */
  setState: (stateName: keyof TStateMap) => Promise<void>
  /**
   * Clears the in-memory database by removing every document from every collection
   */
  clear: () => Promise<void>
  /**
   * Stops the in-memory database server
   */
  stop: () => Promise<boolean>,
  /**
   * Mongodb's `Db` instance
   */
  database: mongodb.Db
}

/**
 * Clears a given database
 * @param db Database to be cleared
 * @ignore
 */
async function clearDb (db: Db) {
  const collections = await db.listCollections().toArray().then(collections => collections.map(({ name }) => name as string))

  await Promise.all(collections.map(collection => db.collection(collection).deleteMany({})))
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
async function setDbState (db: Db, states: StateMap, stateName: string) {
  const state = states[ stateName ]
  if (!state) throw new StateNotFoundError(stateName)

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
 * This method does not support custom database instance passing. If you want to
 * provide a custom MongoMemoryServer, you should use the {@link init} function.
 *
 * Passed parameters will be joined using `path.join` to form the full path to
 * the file.
 *
 * *File extensions should not be necessary*
 */
export async function initFromFile<TStateMap extends StateMap = any> (...filePath: string[]): Promise<SlothDatabase<TStateMap>> {
  const actualPath = path.resolve(path.join(...filePath))
  const states = require(actualPath)

  return init<TStateMap>(states)
}

/**
 * Creates a new instance of {@link Database} with given states available
 * @param stateMap List of states that should be available for the created database instance
 * @param mongoInstance Previously initializated instance of mongodb-memory-server
 * @returns Promise resolving to an instance of {@link Database}
 */
export async function init<TStateMap extends StateMap> (stateMap: TStateMap, mongoInstance?: MongoMemoryServer): Promise<SlothDatabase<TStateMap>> {
  if (!stateMap) throw new NoStateMapProvidedError()
  validateStateMap(stateMap)
  const mongod = mongoInstance || new MongoMemoryServer()

  const uri = await mongod.getUri()
  const port = await mongod.getPort()
  const dbName = await mongod.getDbName()

  const connection = await mongodb.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  const database = connection.db(dbName)

  return {
    database,
    config: { uri, port, dbName },
    clear: () => clearDb(database),
    stop: () => { connection.close(); return mongod.stop() },
    setState: (stateName: keyof TStateMap) => setDbState(database, stateMap, stateName as string)
  }
}

export default {
  init,
  initFromFile
}
