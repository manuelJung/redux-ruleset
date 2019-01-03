// @flow
import createStoreCreator from 'redux-mock-store'
import consequence from '../consequence'
import type {RuleContext} from '../types'

const createStore = createStoreCreator()

declare var describe: any
declare var beforeEach: any
declare var test: any
declare var expect: any
declare var jest: any

const createContext = (alterContext?:Object, alterRule?:Object):RuleContext => {
  const listeners = {}
  const rule = {
    id: 'consequence-test',
    target: 'ANY_TYPE',
    consequence: jest.fn(),
    ...alterRule
  }
  return {
    rule: rule,
    childRules: [],
    running: 0,
    active: false,
    pendingSaga: false,
    sagaStep: 0,
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
    }),
    ...alterContext
  }
}


let store
let context
let action = {type:'ANY_TYPE'}
let ruleDB

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
    expect(result).toBe(false)
  })
  test('skip rule when action has a matching skip rule', () => {
    { // string skip type
      let action = {type:'ANY_RULE', meta:{skipRule:'consequence-test'}}
      const result = consequence(context, action, store, 1)
      expect(result).toBe(false)
    }
    { // array skip type
      let action = {type:'ANY_RULE', meta:{skipRule:['consequence-test']}}
      const result = consequence(context, action, store, 1)
      expect(result).toBe(false)
    }
    { // all skip type
      let action = {type:'ANY_RULE', meta:{skipRule:'*'}}
      const result = consequence(context, action, store, 1)
      expect(result).toBe(false)
    }
  })
  test('skip rule when concurrency is FIRST and the rule is already executing', () => {
    context.rule.concurrency = 'FIRST'
    context.running = 1
    const result = consequence(context, action, store, 1)
    expect(result).toBe(false)
  })
  test('skip rule when concurrency is ONCE and the rule already has been executed', () => {
    context.rule.concurrency = 'ONCE'
    const result1 = consequence(context, action, store, 1)
    const result2 = consequence(context, action, store, 1)
    expect(result1).toBe(true)
    expect(result2).toBe(false)
  })
  test('skip rule when "addOnce" flag is set and the rule already has been executed', () => {
    context.rule.addOnce = true
    context.running = 1
    const result = consequence(context, action, store, 1)
    expect(result).toBe(false)
  })
})

describe('consequence injection', () => {
  beforeEach(initTest)
  test('a store, action, addRule, removeRule and efect fn should be injected', () => {
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
})

describe('ORDERED concurrency', () => {
  const wait = ms => new Promise(resolve => setTimeout(() => resolve(),ms))
  beforeEach(initTest)
  test('consequence should be executed in order', done => {
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
})