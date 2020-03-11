import configureStore from 'redux-mock-store'




let store
let index

const wait = ms => new Promise(resolve => setTimeout(() => resolve(), ms))

const initTest = () => {
  jest.resetModules()
  index = require('../index')
  const mockStore = configureStore([index.middleware])
  const defaultState = {
    todos: {
      filter: 'all',
      data: [{id:'one'}, {id:'two'}]
    }
  }
  store = mockStore(defaultState)
}

describe('basic', () => {
  beforeEach(initTest)

  test('REGISTER_RULE', () => {
    index.addRule({
      id: 'TEST_RULE',
      target: 'TEST_TYPE',
      consequence: () => null
    })

    
  })
})