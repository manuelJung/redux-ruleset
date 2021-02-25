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
      consequence: action => Object.assign({}, action, {foo:'bar'})
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
      onExecute:'REMOVE_RULE',
      consequence: () => ({type:'PONG'})
    })

    console.log('test')

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

describe('onExecute', () => {
  beforeEach(initTest)
  
  test('REMOVE_RULE prevents further executions', () => {
    index.addRule({
      id: 'PING_PONG',
      target: 'PING',
      onExecute: 'REMOVE_RULE',
      consequence: () => ({type:'PONG'})
    })

    store.dispatch({type: 'PING'})
    store.dispatch({type: 'PING'})
    
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PONG'})
    expect(actions[2]).toEqual({type:'PING'})
    expect(actions[3]).toEqual(undefined)
  })

  test('REMOVE_RULE prevents further async executions', async () => {
    index.addRule({
      id: 'PING_PONG',
      target: 'PING',
      onExecute: 'REMOVE_RULE',
      consequence: () => Promise.resolve({type:'PONG'})
    })

    store.dispatch({type: 'PING'})
    store.dispatch({type: 'PING'})

    await wait(50)
    
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PING'})
    expect(actions[2]).toEqual({type:'PONG'})
    expect(actions[3]).toEqual(undefined)
  })

  test('RECREATE_RULE prevents further async executions while not resolved', async () => {
    index.addRule({
      id: 'PING_PONG',
      target: 'PING',
      onExecute: 'RECREATE_RULE',
      consequence: () => Promise.resolve({type:'PONG'})
    })

    store.dispatch({type: 'PING'})
    store.dispatch({type: 'PING'})

    await wait(50)

    store.dispatch({type: 'PING'})

    await wait(50)
    
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PING'})
    expect(actions[2]).toEqual({type:'PONG'})
    expect(actions[3]).toEqual({type:'PING'})
    expect(actions[4]).toEqual({type:'PONG'})
    expect(actions[5]).toEqual(undefined)
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
      consequence: jest.fn((action,{getState}) => {
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

  test('sagas can send context to consequence and sagas', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'TEST_TYPE',
      consequence: jest.fn((_,{context}) => {
        expect(context.get('foo')).toBe('bar')
      }),
      addWhen: jest.fn(function* (next, {context}){
        context.set('foo', 'bar')
        return 'ADD_RULE'
      }),
      addUntil: jest.fn(function* (next, {context}){
        expect(context.get('foo')).toBe('bar')
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
      addWhen: function* (next, {context}) {
        context.set('name', 'manu')
        return 'ADD_RULE_BEFORE'
      },
      addUntil: function* (next, {context}) {
        yield next('RESET')
        context.set('name', 'alex')
        yield next('RESET')
        return 'REAPPLY_ADD_UNTIL'
      },
      consequence: (action, {context}) => {
        const name = context.get('name')
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
      consequence: jest.fn((_,{context}) => {
        expect(() => context.set('key', 'val')).toThrow('you cannot call setContext within a consequence or condition. check rule UNIT_TEST')
      })
    })

    store.dispatch({type:'START'})
    expect(rule.consequence).toBeCalled()
  })

  test('setContext cannot be called within condition', () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'START',
      condition: jest.fn((_,{context}) => {
        expect(() => context.set('key', 'val')).toThrow('you cannot call setContext within a consequence or condition. check rule UNIT_TEST')
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
      consequence: jest.fn((_,{addRule}) => addRule('test')),
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
      consequence: jest.fn((_,{addRule}) => addRule('test', {foo:'bar'})),
      subRules: {
        test: {
          target: 'PING',
          consequence: jest.fn((_,{context}) => {
            expect(context.get('foo')).toBe('bar')
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
      consequence: (_,{addRule}) => addRule('sub'),
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
      consequence: (action, {addRule}) => addRule('inner', {key: action.key}),
      subRules: {
        inner: {
          target: 'INNER_TYPE',
          consequence: (_,{context}) => ({
            type: 'RETURN_TYPE', 
            key: context.get('key')
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

describe('concurrency', () => {
  beforeEach(initTest)

  test('SWITCH', async () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      concurrency: 'SWITCH',
      consequence: (action, {dispatch}) => {
        return new Promise(resolve => {
          setTimeout(() => {
            dispatch({type:'PONG', timeout:action.timeout})
          }, action.timeout)
        })
      }
    })

    store.dispatch({type:'PING', timeout: 10})
    store.dispatch({type:'PING', timeout: 100})
    store.dispatch({type:'PING', timeout: 50})
    await new Promise(resolve => setTimeout(() => resolve(), 200))

    const actions = store.getActions()
    expect(actions).toHaveLength(5)
    expect(actions[0]).toEqual({type: 'PING', timeout: 10})
    expect(actions[1]).toEqual({type: 'PING', timeout: 100})
    expect(actions[2]).toEqual({type: 'PING', timeout: 50})
    expect(actions[3]).toEqual({type: 'PONG', timeout: 10})
    expect(actions[4]).toEqual({type: 'PONG', timeout: 50})
  })

  test('FIRST', async () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      concurrency: 'FIRST',
      consequence: (action, {dispatch}) => {
        return new Promise(resolve => {
          setTimeout(() => {
            dispatch({type:'PONG', timeout:action.timeout})
          }, action.timeout)
        })
      }
    })

    store.dispatch({type:'PING', timeout: 100})
    store.dispatch({type:'PING', timeout: 10})
    store.dispatch({type:'PING', timeout: 50})
    await new Promise(resolve => setTimeout(() => resolve(), 200))

    const actions = store.getActions()
    expect(actions).toHaveLength(4)
    expect(actions[0]).toEqual({type: 'PING', timeout: 100})
    expect(actions[1]).toEqual({type: 'PING', timeout: 10})
    expect(actions[2]).toEqual({type: 'PING', timeout: 50})
    expect(actions[3]).toEqual({type: 'PONG', timeout: 100})
  })

  test('LAST', async () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      concurrency: 'LAST',
      consequence: (action, {dispatch}) => {
        return new Promise(resolve => {
          setTimeout(() => {
            dispatch({type:'PONG', timeout:action.timeout})
          }, action.timeout)
        })
      }
    })

    store.dispatch({type:'PING', timeout: 100})
    store.dispatch({type:'PING', timeout: 10})
    store.dispatch({type:'PING', timeout: 50})
    await new Promise(resolve => setTimeout(() => resolve(), 200))

    const actions = store.getActions()
    expect(actions).toHaveLength(4)
    expect(actions[0]).toEqual({type: 'PING', timeout: 100})
    expect(actions[1]).toEqual({type: 'PING', timeout: 10})
    expect(actions[2]).toEqual({type: 'PING', timeout: 50})
    expect(actions[3]).toEqual({type: 'PONG', timeout: 50})
  })

  test('ONCE', async () => {
    const rule = index.addRule({
      id: 'UNIT_TEST',
      target: 'PING',
      concurrency: 'ONCE',
      consequence: (action, {dispatch}) => {
        return new Promise(resolve => {
          setTimeout(() => {
            dispatch({type:'PONG', timeout:action.timeout})
          }, action.timeout)
        })
      }
    })

    store.dispatch({type:'PING', timeout: 100})
    store.dispatch({type:'PING', timeout: 10})
    store.dispatch({type:'PING', timeout: 50})
    await new Promise(resolve => setTimeout(() => resolve(), 200))

    const actions = store.getActions()
    expect(actions).toHaveLength(4)
    expect(actions[0]).toEqual({type: 'PING', timeout: 100})
    expect(actions[1]).toEqual({type: 'PING', timeout: 10})
    expect(actions[2]).toEqual({type: 'PING', timeout: 50})
    expect(actions[3]).toEqual({type: 'PONG', timeout: 100})
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
      onExecute: 'REMOVE_RULE',
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

  test('two sagas can react to the same action', () => {
    index.addRule({
      id: 'UNIT_TEST_1',
      target: 'PING',
      weight: 1,
      addWhen: function* (next) {
        yield next('START')
        return 'ADD_RULE'
      },
      consequence: () => ({type:'PONG_1'})
    })
    index.addRule({
      id: 'UNIT_TEST_2',
      target: 'PING',
      weight: 2,
      addWhen: function* (next) {
        yield next('START')
        return 'ADD_RULE'
      },
      consequence: () => ({type:'PONG_2'})
    })

    store.dispatch({type:'START'})
    store.dispatch({type:'PING'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'START'})
    expect(actions[1]).toEqual({type:'PING'})
    expect(actions[2]).toEqual({type:'PONG_1'})
    expect(actions[3]).toEqual({type:'PONG_2'})
  })

  test('two rules can react to the same action', () => {
    index.addRule({
      id: 'UNIT_TEST_1',
      target: 'PING',
      weight: 1,
      consequence: () => ({type:'PONG_1'})
    })
    index.addRule({
      id: 'UNIT_TEST_2',
      target: 'PING',
      weight: 2,
      consequence: () => ({type:'PONG_2'})
    })

    store.dispatch({type:'PING'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PONG_1'})
    expect(actions[2]).toEqual({type:'PONG_2'})
  })

  test('ADD_RULE_BEFORE does not skip next rule execution', () => {
    index.addRule({
      id: 'RULE_1',
      target: 'PING',
      weight: 1,
      addWhen: function* (next) {
        yield next('PING')
        return 'ADD_RULE_BEFORE'
      },
      consequence: () => ({type: 'PONG_1'})
    })
    index.addRule({
      id: 'RULE_2',
      target: 'PING',
      weight: 2,
      consequence: () => ({type: 'PONG_2'})
    })
    index.addRule({
      id: 'RULE_3',
      target: 'PING',
      weight: 3,
      consequence: () => ({type: 'PONG_3'})
    })

    store.dispatch({type:'PING'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'PING'})
    expect(actions[1]).toEqual({type:'PONG_1'})
    expect(actions[2]).toEqual({type:'PONG_2'})
    expect(actions[3]).toEqual({type:'PONG_3'})
    expect(actions.length).toBe(4)
  })

  test('ADD_UNTIL persist context until action execution ends', () => {
    index.addRule({
      id: 'RULE_1',
      target: 'FETCH_REQUEST',
      output: 'END',
      addWhen: function* (next, {context}) {
        yield next('WIDGET_CLICK', action => {
          context.set('msg', action.msg)
          return true
        })
        return 'ADD_RULE'
      },
      addUntil: function* (next) {
        yield next('FETCH_REQUEST')
        return 'RECREATE_RULE'
      },
      consequence: (_, {context}) => ({type: 'FETCH_SUCCESS', msg: context.get('msg')})
    })

    store.dispatch({type:'WIDGET_CLICK', msg: 'my-msg'})
    store.dispatch({type:'FETCH_REQUEST'})
    const actions = store.getActions()
    expect(actions[0]).toEqual({type:'WIDGET_CLICK', msg: 'my-msg'})
    expect(actions[1]).toEqual({type:'FETCH_REQUEST'})
    expect(actions[2]).toEqual({type:'FETCH_SUCCESS', msg: 'my-msg'})
    expect(actions.length).toBe(3)
  })
})