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

  test('dispatch returned action', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      consequence: jest.fn(() => ({type: 'PONG'}))
    })

    store.dispatch({type:'PING'})
    const actions = store.getActions()

    expect(rule.consequence).toBeCalled()
    expect(actions).toEqual([
      {type: 'PING'},
      {type: 'PONG'}
    ])
  })

  test('dispatch promise wrapped action', async () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: ['PING'],
      consequence: jest.fn(() => Promise.resolve({type: 'PONG'}))
    })

    store.dispatch({type:'PING'})

    await wait(1)

    const actions = store.getActions()

    expect(rule.consequence).toBeCalled()
    expect(actions).toEqual([
      {type: 'PING'},
      {type: 'PONG'}
    ])
  })

  test('consequence cb is called when the rule gets removed', () => {
    const callback = jest.fn()
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      addOnce: true,
      consequence: jest.fn(() => callback),
      addUntil: function* (next) {
        yield next('END')
        return 'REMOVE_RULE'
      }
    })

    store.dispatch({type:'START'})
    expect(rule.consequence).toBeCalled()
    expect(callback).not.toBeCalled()

    store.dispatch({type:'END'})
    expect(callback).toBeCalled()
  })

  test('actions can be manipulated', () => {
    index.addRule({
      id: 'UNIT_TEST',
      target: 'TEST_TYPE',
      position: 'INSTEAD',
      consequence: () => ({type:'TEST_TYPE', foo:'bar'})
    })

    store.dispatch({type:'TEST_TYPE'})
    const actions = store.getActions()
    expect(actions).toEqual([{type:'TEST_TYPE', foo:'bar'}])
  })

  test('actions can be canceled', () => {
    index.addRule({
      id: 'UNIT_TEST',
      target: 'TWO',
      position: 'INSTEAD',
      consequence: () => null
    })

    store.dispatch({type:'ONE'})
    store.dispatch({type:'TWO'})
    store.dispatch({type:'THREE'})
    
    const actions = store.getActions()
    expect(actions).toEqual([{type:'ONE'}, {type:'THREE'}])
  })

  test('throw error on endless loops', () => {
    index.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      consequence: () => ({type:'TEST_TYPE'})
    })

    console.warn = jest.fn()
    expect(() => store.dispatch({type:'TEST_TYPE'})).toThrow('detected endless cycle')
  })
})

describe('access state', () => {
  beforeEach(initTest)

  test('condition can access state', () => {
    const rule = index.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      condition: jest.fn((action, {getState}) => {
        const state = getState()
        expect(state.todos.filter).toBe('all')
      }),
      consequence: () => null
    })

    store.dispatch({type:'TEST_TYPE'})
    expect(rule.condition).toBeCalled()
  })

  test('consequence can access state', () => {
    const rule = index.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      consequence: jest.fn((action, {getState}) => {
        const state = getState()
        expect(state.todos.filter).toBe('all')
      })
    })

    store.dispatch({type:'TEST_TYPE'})
    expect(rule.consequence).toBeCalled()
  })

  test('saga can access state', () => {
    const rule = index.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      consequence: () => null,
      addWhen: jest.fn(function*(next,{getState}){
        const state = getState()
        expect(state.todos.filter).toBe('all')
        yield next('ADD')
        return 'ADD_RULE'
      }),
      addUntil: jest.fn(function*(next,{getState}){
        const state = getState()
        expect(state.todos.filter).toBe('all')
        yield next('REMOVE')
        return 'ADD_RULE'
      })
    })

    expect(rule.addWhen).toBeCalled()
    expect(rule.addUntil).not.toBeCalled()

    store.dispatch({type:'ADD'})

    expect(rule.addUntil).toBeCalled()
  })
})

describe('context', () => {
  beforeEach(initTest)

  test.skip('todo', () => {})
})