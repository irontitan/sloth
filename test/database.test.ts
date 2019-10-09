import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon, { SinonSandbox, SinonSpy } from 'sinon'
import { SlothDatabase } from '../src/modules/database'
import { validStateMap } from './fixtures/state-map.fixture'
import * as mongodbMemoryServer from 'mongodb-memory-server'
import { database, InvalidStateMapError, StateNotFoundError } from '../src'
import { NoStateMapProvidedError } from '../src/modules/database/errors/NoStateMapProvidedError'

chai.use(chaiAsPromised)

describe('Database module', () => {
  describe('database creation', () => {
    describe('when no database instance is passed', () => {
      let sandbox: SinonSandbox
      let db: SlothDatabase<typeof validStateMap>

      before(async () => {
        sandbox = sinon.createSandbox()
        sandbox.spy(mongodbMemoryServer, 'MongoMemoryServer')
        db = await database.init(validStateMap)
      })

      after(() => {
        db.stop()
        sandbox.restore()
      })

      it('creates a new instance and returns connection data', async () => {
        expect((mongodbMemoryServer.MongoMemoryServer as unknown as SinonSpy).calledOnce).to.be.true
        expect(db).to.have.property('config').which.is.an('object')
        expect(db.config).to.have.property('uri').which.is.a('string')
        expect(db.config).to.have.property('dbName').which.is.a('string')
        expect(db.config).to.have.property('port').which.is.a('number')
      })
    })

    describe('when a database instance is passed', () => {
      let sandbox: SinonSandbox
      let db: SlothDatabase<typeof validStateMap>
      let mongodConfig = { uri: '', dbName: '', port: 0 }

      before(async () => {
        sandbox = sinon.createSandbox()
        sandbox.spy(mongodbMemoryServer, 'MongoMemoryServer')
        const mongod = new mongodbMemoryServer.MongoMemoryServer()

        mongodConfig = {
          uri: await mongod.getUri(),
          dbName: await mongod.getDbName(),
          port: await mongod.getPort()
        }

        db = await database.init(validStateMap, mongod)
      })

      after(() => {
        db.stop()
        sinon.restore()
      })

      it('uses the provided database and returns its connection data', async () => {
        expect((mongodbMemoryServer.MongoMemoryServer as unknown as SinonSpy).callCount).to.be.equal(1)
        expect(db.config).to.eql(mongodConfig)
      })
    })
  })
  
  describe('database initialization', () => {
    describe('simple initialization', () => {
      

      describe('when a state map is provided', () => {
        let db: SlothDatabase<typeof validStateMap>

        before(async () => {
          db = await database.init(validStateMap)
        })

        after(() => {
          db.stop()
        })

        it('returns database connection data', () => {
          expect(db).to.have.property('config').which.is.an('object')
          expect(db.config).to.have.property('uri').which.is.a('string')
          expect(db.config).to.have.property('dbName').which.is.a('string')
          expect(db.config).to.have.property('port').which.is.a('number')
        })

        it('returns state manipulation methods', () => {
          expect(db).to.have.property('clear').which.is.a('function')
          expect(db).to.have.property('stop').which.is.a('function')
          expect(db).to.have.property('setState').which.is.a('function')
        })

        it('returns the mongodb Db instance', () => {
          expect(db).to.have.property('database').which.is.not.null.and.is.not.undefined
        })
      })
    })

    describe('initialization from file', () => {
      let db: SlothDatabase<typeof validStateMap>

      before(async () => {
        db = await database.initFromFile(__dirname, './fixtures/valid-state-map')
      })

      after(() => {
        db.stop()
      })

      it('loads file and returns database instance', () => {
        expect(db).to.have.property('setState')
        expect(db).to.have.property('clear')
        expect(db).to.have.property('stop')
        expect(db).to.have.property('database')
        expect(db).to.have.property('config')
      })
    })
  })

  describe('state map validation', () => {
    describe('when no state map is passed', () => {
      it('throws a NoStateMapProvidedError', () => {
        expect((database.init as any)()).to.be.rejectedWith(NoStateMapProvidedError)
      })
    })

    describe('when an invalid state map is passed', () => {
      it('throws a InvalidStateMapError', () => {
        expect(database.init({})).to.be.rejectedWith(InvalidStateMapError)
      })
    })
  })

  describe('state switching', () => {
    let db: SlothDatabase<typeof validStateMap>
    
    before(async () => {
      db = await database.init(validStateMap)
    })

    after(() => {
      db.stop()
    })

    describe('when state does not exist', () => {
      it('throws a StateNotFoundError', () => {
        expect(db.setState('unknownState' as any)).to.be.rejectedWith(StateNotFoundError)
      })
    })

    describe('when state exists', () => {
      const { myState: [ myState ] } = validStateMap
      const [ stateData ] = myState.data

      before(async () => {
        await db.database.collection(myState.collection).insertOne({ name: 'Jane Doe' })
        await db.setState('myState')
      })

      after(async () => {
        await db.clear()
      })

      it('sets the current database state correctly', async () => {
        const result = await db.database.collection(myState.collection).findOne(stateData)

        expect(result).to.be.an('object')
      })

      it('clears the database before setting the state', async () => {
        const result = await db.database.collection(myState.collection).countDocuments({})
        expect(result).to.be.equal(1)
      })
    })
  })
})