// @flow
// $FlowFixMe
import createStoreCreator from 'redux-mock-store'
import consequence, {getRuleExecutionId} from '../consequence'
import type {RuleContext} from '../types'

const createStore = createStoreCreator()

declare var describe: any
declare var beforeEach: any
declare var test: any
declare var expect: any
declare var jest: any

const createContext = ():RuleContext => {
  const listeners = {}
  const rule = {
    id: 'consequence-test',
    target: 'ANY_TYPE',
    consequence: jest.fn()
  }
  return {
    rule: rule,
    childRules: [],
    active: false,
    pendingSaga: false,
    sagaStep: 0,
    concurrency: {
      default: {
        running: 0,
        debounceTimeoutId: null
      }
    },
    on: jest.fn((e, cb) => {
      if(!listeners[e]) listeners[e] = []
      listeners[e].push(cb)
    }),
    off: jest.fn((e, cb) => {
      listeners[e] = listeners[e].filter(l => l !== cb)
    }),
    trigger: jest.fn((e, payload) => {
      if(!listeners[e]) return
      for(let i=0;i<listeners[e].length;i++){
        const cb = listeners[e][i]
        cb(payload)
      }
    })
  }
}


let store
let context
let action = {type:'ANY_TYPE'}
let ruleDB

const wait = ms => new Promise(resolve => setTimeout(() => resolve(),ms))

const initTest = () => {
  jest.resetModules()
  store = createStore()
  context = createContext()
  ruleDB = require('../ruleDB')
}

describe('skip rule', () => {
  beforeEach(initTest)
  test('skip rule when condition does not match', () => {
    context.rule.condition = () => false
    const result = consequence(context, action, store, 1)
    expect(result.resolved).toBe(false)
  })
  test('skip rule when action has a matching skip rule', () => {
    { // string skip type
      let action = {type:'ANY_RULE', meta:{skipRule:'consequence-test'}}
      const result = consequence(context, action, store, 1)
      expect(result.resolved).toBe(false)
    }
    { // array skip type
      let action = {type:'ANY_RULE', meta:{skipRule:['consequence-test']}}
      const result = consequence(context, action, store, 1)
      expect(result.resolved).toBe(false)
    }
    { // all skip type
      let action = {type:'ANY_RULE', meta:{skipRule:'*'}}
      const result = consequence(context, action, store, 1)
      expect(result.resolved).toBe(false)
    }
  })
  test('skip rule when concurrency is FIRST and the rule is already executing', () => {
    context.rule.concurrency = 'FIRST'
    context.concurrency.default.running = 1
    const result = consequence(context, action, store, 1)
    expect(result.resolved).toBe(false)
  })
  test('skip rule when concurrency is ONCE and the rule already has been executed', () => {
    context.rule.concurrency = 'ONCE'
    const result1 = consequence(context, action, store, 1)
    const result2 = consequence(context, action, store, 1)
    expect(result1.resolved).toBe(true)
    expect(result2.resolved).toBe(false)
  })
  test('skip rule when "addOnce" flag is set and the rule already has been executed', () => {
    context.rule.addOnce = true
    context.concurrency.default.running = 1
    const result = consequence(context, action, store, 1)
    expect(result.resolved).toBe(false)
  })
})

describe('consequence injection', () => {
  beforeEach(initTest)
  test('a dispatch, getState, action, addRule, removeRule and efect fn should be injected', () => {
    consequence(context, action, store, 1)
    const args = context.rule.consequence.mock.calls[0][0]
    expect(args).toHaveProperty('dispatch')
    expect(args).toHaveProperty('getState')
    expect(args).toHaveProperty('action')
    expect(args).toHaveProperty('addRule')
    expect(args).toHaveProperty('removeRule')
    expect(args).toHaveProperty('effect')
  })
})

describe('abort consequence', () => {
  let resolve
  beforeEach(initTest)
  test('abort when rule has been removed', done => {
    let effectVal = 'no_val'
    const parentStore = store
    jest.spyOn(parentStore, 'dispatch')
    context.rule.consequence = ({dispatch, effect}) => {
      return Promise.resolve().then(() => {
        effect(() => {effectVal = 'val'}) 
        dispatch({type: 'SOME_ACTION'})
        expect(effectVal).toBe('no_val')
        expect(parentStore.dispatch).not.toHaveBeenCalled()
        done()
      })
    }
    consequence(context, action, store, 1)
    context.trigger('REMOVE_RULE')
  })
  test('abort when consequence was canceled', done => {
    let effectVal = 'no_val'
    const parentStore = store
    jest.spyOn(parentStore, 'dispatch')
    context.rule.consequence = ({dispatch, effect}) => {
      return Promise.resolve().then(() => {
        effect(() => {effectVal = 'val'}) 
        dispatch({type: 'SOME_ACTION'})
        expect(effectVal).toBe('no_val')
        expect(parentStore.dispatch).not.toHaveBeenCalled()
        done()
      })
    }
    consequence(context, action, store, 1)
    context.trigger('CANCEL_CONSEQUENCE')
  })
})

describe('return types', () => {
  beforeEach(initTest)
  test('when a action with same type as original action was returned and the position is "INSERT_INSTEAD" the result should contain this action and nothing should be dispatched', () => {
    jest.spyOn(store, 'dispatch')
    context.rule.position = 'INSERT_INSTEAD'
    context.rule.consequence = () => ({type:'ANY_TYPE'})
    const result = consequence(context, action, store, 1)
    expect(store.dispatch).not.toBeCalled()
    expect(result.action).toEqual({type:'ANY_TYPE'})
  })
  test('when a action was returned it should be dispatched', () => {
    jest.spyOn(store, 'dispatch')
    context.rule.consequence = () => ({type:'ACTION_RETURN'})
    consequence(context, action, store, 1)
    expect(store.dispatch).toBeCalledTimes(1)
    expect(store.dispatch).toBeCalledWith({type:'ACTION_RETURN'})
  })
  test('when a promise wrapped action was returned it should be dispatched', done => {
    jest.spyOn(store, 'dispatch')
    context.rule.consequence = () => Promise.resolve({type:'ACTION_RETURN'})
    consequence(context, action, store, 1)
    setTimeout(() => {
      expect(store.dispatch).toBeCalledTimes(1)
      expect(store.dispatch).toBeCalledWith({type:'ACTION_RETURN'})
      done()
    }, 1)
  })
  test('when function was returned it should be called, after the rule was removed', () => {
    jest.spyOn(store, 'dispatch')
    const cb = jest.fn()
    context.rule.consequence = () => cb
    consequence(context, action, store, 1)
    expect(cb).not.toBeCalled()
    context.trigger('REMOVE_RULE')
    expect(cb).toBeCalledTimes(1)
  })
  test('when function was returned it should be called, after the consequence was canceled', () => {
    jest.spyOn(store, 'dispatch')
    const cb = jest.fn()
    context.rule.consequence = () => cb
    consequence(context, action, store, 1)
    expect(cb).not.toBeCalled()
    context.trigger('CANCEL_CONSEQUENCE')
    expect(cb).toBeCalledTimes(1)
  })
})

describe('debounce, delay and throttle consequence', () => {
  beforeEach(initTest)
  test('throttle should work correctly', async () => {
    context.rule.throttle = 10
    const cb = jest.fn()
    context.rule.consequence = () => cb('ONE')
    consequence(context, action, store, 1)
    context.rule.consequence = () => cb('TWO')
    consequence(context, action, store, 1)
    expect(cb).not.toBeCalled()
    await wait(5)
    context.rule.consequence = () => cb('THREE')
    consequence(context, action, store, 1)
    await wait(15)
    context.rule.consequence = () => cb('FOUR')
    consequence(context, action, store, 1)
    context.rule.consequence = () => cb('FIVE')
    consequence(context, action, store, 1)
    await wait(15)
    expect(cb).toBeCalledWith('THREE')
    expect(cb).toBeCalledWith('FIVE')
    expect(cb).toBeCalledTimes(2)
  })
  test('delay should work correctly', async () => {
    context.rule.delay = 5
    consequence(context, action, store, 1)
    consequence(context, action, store, 2)
    expect(context.rule.consequence).not.toBeCalled()
    await wait(10)
    expect(context.rule.consequence).toBeCalledTimes(2)
  })
  test('debounce should work correctly', async () => {
    context.rule.debounce = 10
    const cb = jest.fn()
    context.rule.consequence = () => cb('ONE')
    consequence(context, action, store, 1)
    expect(cb).not.toBeCalled()
    await wait(5)
    context.rule.consequence = () => cb('TWO')
    consequence(context, action, store, 1)
    expect(cb).not.toBeCalled()
    await wait(5)
    context.rule.consequence = () => cb('THREE')
    consequence(context, action, store, 1)
    expect(cb).not.toBeCalled()
    await wait(5)
    context.rule.consequence = () => cb('FOUR')
    consequence(context, action, store, 1)
    expect(cb).not.toBeCalled()
    await wait(15)
    expect(cb).toBeCalledWith('FOUR')
    expect(cb).toBeCalledTimes(1)
  })
})

describe('concurrency', () => {
  beforeEach(initTest)
  test('ORDERED: consequence should be executed in order', done => {
    jest.spyOn(store, 'dispatch')
    context.rule.concurrency = 'ORDERED'
    context.rule.consequence = () => wait(1).then(() => ({type: 'ONE'}))
    consequence(context, action, store, 1)
    context.rule.consequence = () => wait(20).then(() => ({type: 'TWO'}))
    consequence(context, action, store, 1)
    context.rule.consequence = ({dispatch}) => wait(10).then(() => {
      dispatch({type:'THREE'})
      dispatch({type:'FOUR'})
    })
    consequence(context, action, store, 1)
    context.rule.consequence = ({dispatch, effect}) => wait(1).then(() => {
      dispatch({type: 'FIVE'})
      effect(() => {
        expect(store.dispatch.mock.calls[0][0]).toEqual({type:'ONE'})
        expect(store.dispatch.mock.calls[1][0]).toEqual({type:'TWO'})
        expect(store.dispatch.mock.calls[2][0]).toEqual({type:'THREE'})
        expect(store.dispatch.mock.calls[3][0]).toEqual({type:'FOUR'})
        expect(store.dispatch.mock.calls[4][0]).toEqual({type:'FIVE'})
        expect(store.dispatch).toBeCalledTimes(5)
        done()
      })
    })
    consequence(context, action, store, 1)
  })
  test('SWITCH: when the first effect was executed, the previous consequences should be canceled', async () => {
    context.rule.concurrency = 'SWITCH'
    jest.spyOn(store, 'dispatch')
    context.rule.consequence = async ({dispatch}):Promise<*> => {
      dispatch({type:'ONE'})
      await wait(10)
      dispatch({type:'TWO'})
      return {type:'THREE'}
    }
    consequence(context, action, store, 1)
    context.rule.consequence = () => wait(2).then(() => ({type:'FOUR'}))
    consequence(context, action, store, 1)
    await wait(20)
    expect(store.dispatch).toBeCalledWith({type:'ONE'})
    expect(store.dispatch).toBeCalledWith({type:'FOUR'})
    expect(store.dispatch).toBeCalledTimes(2)
  })
  test('ONCE: after the first call, no other concurrency should be ever called', async () => {
    context.rule.concurrency = 'ONCE'
    consequence(context, action, store, 1)
    consequence(context, action, store, 1)
    await wait(5)
    consequence(context, action, store, 1)
    expect(context.rule.consequence).toBeCalledTimes(1)
  })
  test('LAST: as soon, as a consequence will be executed, all previous ones should be canceled', async () => {
    jest.spyOn(store, 'dispatch')
    context.rule.concurrency = 'LAST'
    context.rule.consequence = () => wait(5).then(() => ({type:'ONE'}))
    consequence(context, action, store, 1)
    context.rule.consequence = () => wait(10).then(() => ({type:'TWO'}))
    consequence(context, action, store, 1)
    await wait(20)
    context.rule.consequence = () => wait(10).then(() => ({type:'THREE'}))
    consequence(context, action, store, 1)
    context.rule.consequence = () => wait(5).then(() => ({type:'FOUR'}))
    consequence(context, action, store, 1)
    await wait(20)
    expect(store.dispatch).toBeCalledWith({type:'TWO'})
    expect(store.dispatch).toBeCalledWith({type:'FOUR'})
    expect(store.dispatch).toBeCalledTimes(2)
  })
  test('FIRST: as long as the previous consequence did not resolve, no other consequences should be invoked', async () => {
    jest.spyOn(store, 'dispatch')
    context.rule.concurrency = 'FIRST'
    context.rule.consequence = () => wait(5).then(() => ({type:'ONE'}))
    consequence(context, action, store, 1)
    context.rule.consequence = () => wait(10).then(() => ({type:'TWO'}))
    consequence(context, action, store, 1)
    await wait(20)
    context.rule.consequence = () => wait(10).then(() => ({type:'THREE'}))
    consequence(context, action, store, 1)
    context.rule.consequence = () => wait(5).then(() => ({type:'FOUR'}))
    consequence(context, action, store, 1)
    await wait(20)
    expect(store.dispatch).toBeCalledWith({type:'ONE'})
    expect(store.dispatch).toBeCalledWith({type:'THREE'})
    expect(store.dispatch).toBeCalledTimes(2)
  })
})

describe('getRuleExecutionId()', () => {
  test('it should return the rule execution id of a dispatched action while dispatching', () => {
    let execId = getRuleExecutionId()
    const store = createStoreCreator([() => next => action => {
      execId = getRuleExecutionId()
      return next(action)
    }])()
    context.rule.consequence = () => ({type:'ACTION'})
    expect(execId).toBe(null)
    consequence(context, action, store, 1)
    expect(typeof execId).toBe('number')
    expect(getRuleExecutionId()).toBe(null)
  })
})

describe('concurrencyFilter', () => {
  beforeEach(initTest)
  test('it should split the concurrency logic by id', async () => {
    context.rule.concurrency = 'ONCE'
    // $FlowFixMe
    context.rule.concurrencyFilter = action => action.id
    const action1 = {type: 'ACTION', id: 'id1'}
    const action2 = {type: 'ACTION', id: 'id2'}
    const action3 = {type: 'ACTION', id: 'id3'}
    consequence(context, action1, store, 1)
    consequence(context, action2, store, 2)
    await wait(5)
    consequence(context, action3, store, 3)
    expect(context.rule.consequence).toBeCalledTimes(3)
  })
})