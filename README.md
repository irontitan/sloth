Sloth
====

A simple but useful set of tools to aid NodeJS developers on writing tests.

> This is a WIP. Functionallity is stable, but documentation is not so good yet.

- [Sloth](#sloth)
  - [Usage](#usage)
    - [Database](#database)
      - [Example](#example)
  - [API](#api)
  - [Contributing](#contributing)

## Usage

### Database
The `database` module can be used to mock a mongodb database using
[mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server).
It works by receiving a set of states, which you can later activate easily by
name.

#### Example
Define one or more states following the `StateMap` interface.

> This can be done inline, instead of separate file. Keep things apart is,
> usually, more organized, tho

```typescript
import { Content } from '@irontitan/sloth'

export interface States {
  userAlreadyExists: Content[],
  resultsArePaginated: Content[]
}

const states: States = {
  userAlreadyExists: [
    {
      collection: 'users',
      data: {
        _id: '5d9c216721d400b621d9f8c4',
        login: 'lalala',
        password: '',
        status: 'valid'
      }
    }
  ],
  resultsArePaginated: [
    {
      collection: 'users',
      data: [
        {
          _id: '5d9c216721d400b621d9f8c4',
          login: 'lalala',
          password: '',
          status: 'invalid'
        },
        {
          _id: '5d9c216721d400b621d9f8c4',
          login: 'lalala',
          password: '',
          status: 'invalid'
        }
      ]
    }
  ]
}

export default states
```

On your test file, you can call the `init` function passing said states,
in order to receive an object implementing the `SlothDatabase` interface.

After that, whenever you need to change the state of your database, you can call
the `setState` function, which receives the name of the desired state, and sets
it for you.

```typescript
import sloth from '@irontitan/sloth'
import states, { States } from './states'
import { SlothDatabase } from './src/database'

describe('POST /', () => {
  let database: SlothDatabase<States>
  let app: AxiosInstance

  before(async () => {
    database = await sloth.database.init(states)
    axiosist(app.factory({ ...config, mongodb: database.config }))
  })

  afterEach(async () => {
    await database.clear()
  })

  describe('Some test', () => {
    before(async () => {
      await database.setState('userAlreadyExists')
    })
  })
})
```

## API
All the API is documented through TSDoc on the code. An HTML version is comming soon.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md)
