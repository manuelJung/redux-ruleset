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

describe('skip rule', () => {
  beforeEach(() => {
    jest.resetModules()
    store = createStore()
    context = createContext()
    ruleDB = require('../ruleDB')
  })
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
  beforeEach(() => {
    jest.resetModules()
    store = createStore()
    context = createContext()
    ruleDB = require('../ruleDB')
  })
  test('a store, action, addRule, removeRule and efect fn should be injected', () => {
    consequence(context, action, store, 1)
    const args = context.rule.consequence.mock.calls[0][0]
    expect(args).toHaveProperty('store')
    expect(args).toHaveProperty('action')
    expect(args).toHaveProperty('addRule')
    expect(args).toHaveProperty('removeRule')
    expect(args).toHaveProperty('effect')
  })
})

describe('abort consequence', () => {
  let resolve
  beforeEach(() => {
    jest.resetModules()
    store = createStore()
    context = createContext()
    ruleDB = require('../ruleDB')
  })
  test('abort when rule has been removed', done => {
    let effectVal = 'no_val'
    const parentStore = store
    jest.spyOn(parentStore, 'dispatch')
    context.rule.consequence = ({store, effect}) => {
      return Promise.resolve().then(() => {
        effect(() => {effectVal = 'val'}) 
        store.dispatch({type: 'SOME_ACTION'})
        expect(effectVal).toBe('no_val')
        expect(parentStore.dispatch).not.toHaveBeenCalled()
        done()
      })
    }
    consequence(context, action, store, 1)
    context.trigger('REMOVE_RULE')
  })
})