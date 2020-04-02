import configureStore from 'redux-mock-store'




let store
let index
let devtools

const wait = ms => new Promise(resolve => setTimeout(() => resolve(), ms))

const initTest = () => {
  jest.resetModules()
  index = require('../index')
  devtools = require('../devtools')
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

  test('EXEC_ACTION_START', () => {
    index.addRule({
      id: 'RULE_1',
      target: 'TYPE_1',
      consequence: () => ({ type: 'TYPE_2'})
    })
    index.addRule({
      id: 'RULE_2',
      target: 'TYPE_2',
      consequence: () => null
    })
    store.dispatch({type:'TYPE_1'})
    const buffer = devtools.testing.getBuffer().filter(e => e.type === 'EXEC_ACTION_START')

    expect(buffer).toHaveLength(2)

    expect(buffer[0]).toEqual({
      type: 'EXEC_ACTION_START',
      timestamp: expect.anything(),
      actionExecId: 1,
      ruleExecId: null,
      action: { type: 'TYPE_1'}
    })
    
    expect(buffer[1]).toEqual({
      type: 'EXEC_ACTION_START',
      timestamp: expect.anything(),
      actionExecId: 2,
      ruleExecId: 1,
      action: { type: 'TYPE_2'}
    })
  })
})