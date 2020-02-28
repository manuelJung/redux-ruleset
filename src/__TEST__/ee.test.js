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
    expect(rule.consequence).toBeCalled()
    
    const actions = store.getActions()
    expect(actions[0]).toEqual({type: 'PING'})
    expect(actions[1]).toEqual({type: 'PONG'})
  })

  test('dispatch promise wrapped action', async () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: ['PING'],
      consequence: jest.fn(() => Promise.resolve({type: 'PONG'}))
    })

    store.dispatch({type:'PING'})

    await wait(1)

    expect(rule.consequence).toBeCalled()

    const actions = store.getActions()
    expect(actions[0]).toEqual({type: 'PING'})
    expect(actions[1]).toEqual({type: 'PONG'})
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
      consequence: ({action}) => Object.assign({}, action, {foo:'bar'})
    })

    store.dispatch({type:'TEST_TYPE'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'TEST_TYPE', foo:'bar'})
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
    expect(actions[0]).toEqual({type:'ONE'}, {type:'THREE'})
  })

  test('sagas manage active state', () => {
    index.addRule({
      id: 'PING_PONG',
      target: 'PING',
      consequence: () => ({type:'PONG'}),
      addWhen: function* (next) {
        yield next('START_GAME')
        return 'ADD_RULE'
      },
      addUntil: function* (next) {
        yield next('STOP_GAME')
        return 'RECREATE_RULE'
      }
    })

    store.dispatch({type:'PING'})
    store.dispatch({type:'START_GAME'})
    store.dispatch({type:'PING'})
    store.dispatch({type:'STOP_GAME'})
    store.dispatch({type:'PING'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type: 'PING'})
    expect(actions[1]).toEqual({type: 'START_GAME'})
    expect(actions[2]).toEqual({type: 'PING'})
    expect(actions[3]).toEqual({type: 'PONG'})
    expect(actions[4]).toEqual({type: 'STOP_GAME'})
    expect(actions[5]).toEqual({type: 'PING'})
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

  test('addOnce rules are only executed once', () => {
    index.addRule({
      id: 'PING_PONG',
      target: 'PING',
      addOnce:true,
      consequence: () => ({type:'PONG'})
    })

    store.dispatch({type:'PING'})
    store.dispatch({type:'PING'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PONG'})
    expect(actions[2]).toEqual({type:'PING'})
    expect(actions[3]).toEqual(undefined)
  })

  test('skip rule', () => {
    index.addRule({
      id: 'PING_PONG',
      target: 'PING',
      consequence: () => ({type:'PONG'})
    })

    const action = {type:'PING'}
    store.dispatch(index.skipRule('*', action)) // all
    store.dispatch(index.skipRule('PING_PONG', action)) // single
    store.dispatch(index.skipRule(['PING_PONG'], action)) // multi
    store.dispatch(index.skipRule('G_P', action)) // partial

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING', meta: {skipRule:'*'}})
    expect(actions[1]).toEqual({type:'PING', meta: {skipRule:'PING_PONG'}})
    expect(actions[2]).toEqual({type:'PING', meta: {skipRule:['PING_PONG']}})
    expect(actions[3]).toEqual({type:'PING', meta: {skipRule:'G_P'}})
    expect(actions[4]).toEqual(undefined)
  })
})

describe('access state', () => {
  beforeEach(initTest)

  test('condition can access state', () => {
    const rule = index.addRule({
      id:'UNIT_TEST',
      target:'TEST_TYPE',
      condition: jest.fn((action, getState) => {
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
      consequence: jest.fn(({action,getState}) => {
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
      addWhen: jest.fn(function*(next,getState){
        const state = getState()
        expect(state.todos.filter).toBe('all')
        yield next('ADD')
        return 'ADD_RULE'
      }),
      addUntil: jest.fn(function*(next,getState){
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

  test('sagas can send context to consequence and sagas', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'TEST_TYPE',
      consequence: jest.fn(({context}) => {
        expect(context.getContext('foo')).toBe('bar')
      }),
      addWhen: jest.fn(function* (next, _, context){
        context.setContext('foo', 'bar')
        return 'ADD_RULE'
      }),
      addUntil: jest.fn(function* (next, _, context){
        expect(context.getContext('foo')).toBe('bar')
        yield next('UNKNOWN')
        return 'REMOVE_RULE'
      })
    })

    store.dispatch({type:'START'})
    store.dispatch({type:'TEST_TYPE'})
    expect(rule.consequence).toBeCalled()
    expect(rule.addWhen).toBeCalled()
    expect(rule.addUntil).toBeCalled()
  })

  test('context can be cleared', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'SHOW',
      addWhen: function* (next, _, context) {
        context.setContext('name', 'manu')
        return 'ADD_RULE_BEFORE'
      },
      addUntil: function* (next, _, context) {
        yield next('RESET')
        context.setContext('name', 'alex')
        yield next('RESET')
        return 'REAPPLY_ADD_UNTIL'
      },
      consequence: ({action,context}) => {
        const name = context.getContext('name')
        return {type:'SHOW_NAME', name}
      }
    })

    store.dispatch({type:'SHOW'})
    store.dispatch({type:'RESET'})
    store.dispatch({type:'SHOW'})
    store.dispatch({type:'RESET'})
    store.dispatch({type:'SHOW'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'SHOW'})
    expect(actions[1]).toEqual({type:'SHOW_NAME', name: 'manu'})
    expect(actions[2]).toEqual({type:'RESET'})
    expect(actions[3]).toEqual({type:'SHOW'})
    expect(actions[4]).toEqual({type:'SHOW_NAME', name: 'alex'})
    expect(actions[5]).toEqual({type:'RESET'})
    expect(actions[6]).toEqual({type:'SHOW'})
    expect(actions[7]).toEqual({type:'SHOW_NAME', name: 'manu'})
  })

  test('setContext cannot be called within consequence', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      consequence: jest.fn(({context}) => {
        expect(() => context.setContext('key', 'val')).toThrow('you cannot call setContext within a consequence or condition. check rule UNIT_TEST')
      })
    })

    store.dispatch({type:'START'})
    expect(rule.consequence).toBeCalled()
  })

  test('setContext cannot be called within condition', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      condition: jest.fn((_,__,context) => {
        expect(() => context.setContext('key', 'val')).toThrow('you cannot call setContext within a consequence or condition. check rule UNIT_TEST')
      }),
      consequence: () => null
    })

    store.dispatch({type:'START'})
    expect(rule.condition).toBeCalled()
  })
})

describe('subRules', () => {
  beforeEach(initTest)

  test('subRules can be added', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'TRIGGER',
      consequence: jest.fn(({addRule}) => addRule('test')),
      subRules: {
        test: {
          target: 'PING',
          consequence: jest.fn(() => ({type:'PONG'}))
        }
      }
    })
    store.dispatch({type:'PING'})
    expect(store.getActions()).toEqual([{type:'PING'}])

    store.clearActions()
    store.dispatch({type:'TRIGGER'})
    store.dispatch({type:'PING'})
    expect(store.getActions()).toEqual([
      {type:'TRIGGER'},
      {type:'PING'},
      {type:'PONG'}
    ])
  })

  test('addRule can set global sub-rule context', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'TRIGGER',
      consequence: jest.fn(({addRule}) => addRule('test', {foo:'bar'})),
      subRules: {
        test: {
          target: 'PING',
          consequence: jest.fn(({context}) => {
            expect(context.getContext('foo')).toBe('bar')
          })
        }
      }
    })

    store.dispatch({type:'TRIGGER'})
    store.dispatch({type:'PING'})
    expect(rule.consequence).toBeCalled()
    expect(rule.subRules.test.consequence).toBeCalled()
  })

  test('subRules are removed when parent rule gets removed', () => {
    index.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      concurrency: 'ONCE',
      consequence: ({addRule}) => addRule('sub'),
      addUntil: function*(next){
        yield next('STOP')
        return 'REMOVE_RULE'
      },
      subRules: {
        sub: {
          target: 'PING',
          consequence: () => ({type:'PONG'})
        }
      }
    })

    store.dispatch({type:'PING'})
    store.dispatch({type:'START'})
    store.dispatch({type:'PING'})
    store.dispatch({type:'STOP'})
    store.dispatch({type:'PING'})

    expect(store.getActions()).toEqual([
      {type:'PING'},
      {type:'START'},
      {type:'PING'},
      {type:'PONG'},
      {type:'STOP'},
      {type:'PING'}
    ])
  })

  test('multiple instances of same subrule can be added', () => {
    index.addRule({
      id: 'UNIT_TEST',
      target: 'INIT_TYPE',
      consequence: ({action, addRule}) => addRule('inner', {key: action.key}),
      subRules: {
        inner: {
          target: 'INNER_TYPE',
          consequence: ({context}) => ({
            type: 'RETURN_TYPE', 
            key: context.getContext('key')
          })
        }
      }
    })

    store.dispatch({type:'INNER_TYPE'})
    store.dispatch({type:'INIT_TYPE', key: 'first'})
    store.dispatch({type:'INNER_TYPE'})
    store.dispatch({type:'INIT_TYPE', key: 'second'})
    store.dispatch({type:'INNER_TYPE'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type: 'INNER_TYPE'})
    expect(actions[1]).toEqual({type: 'INIT_TYPE', key: 'first'})
    expect(actions[2]).toEqual({type: 'INNER_TYPE'})
    expect(actions[3]).toEqual({type: 'RETURN_TYPE', key: 'first'})
    expect(actions[4]).toEqual({type: 'INIT_TYPE', key: 'second'})
    expect(actions[5]).toEqual({type: 'INNER_TYPE'})
    expect(actions[6]).toEqual({type: 'RETURN_TYPE', key: 'second'})
    expect(actions[7]).toEqual({type: 'RETURN_TYPE', key: 'first'})
    expect(actions[8]).toBe(undefined)
  })
})

describe('bugs', () => {
  beforeEach(initTest)

  test('condition + INSTEAD does not throw away action if it does not resolve', () => {
    index.addRule({
      id: 'UNIT_TEST',
      target: 'INIT_TYPE',
      position: 'INSTEAD',
      condition: () => false,
      consequence: () => ({type:'FAKE_TYPE'})
    })

    store.dispatch({type:'INIT_TYPE'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'INIT_TYPE'})
  })

  test('addOnce is not invoked for skipped consequences', () => {
    index.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      addOnce: true,
      condition: action => action.status === 'resolved',
      consequence: () => ({type:'PONG'})
    })

    store.dispatch({type:'PING', status: 'not-resolved'})
    store.dispatch({type:'PING', status: 'resolved'})

    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING', status: 'not-resolved'})
    expect(actions[1]).toEqual({type:'PING', status: 'resolved'})
    expect(actions[2]).toEqual({type:'PONG'})
  })
})