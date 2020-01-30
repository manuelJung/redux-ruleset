import * as utils from './utils'

// dependencies

let registerRule 
let rule
let lastRuleContext // last created ruleContext from registerRule.default
let ruleContext
let saga
let appUtils
let ruleDB

const initTest = () => {
  jest.resetModules()
  registerRule = require('../registerRule')
  saga = require('../saga')
  ruleDB = require('../ruleDB')
  ruleDB.addRule = jest.fn()
  appUtils = require('../utils')
  ruleContext = utils.createContext()
  rule = {
    id: 'TEST_RULE',
    target: 'TEST_TYPE',
    consequence: () => ({type: 'RESPONSE_TYPE'})
  }
  { // setup lastRuleContext
    const original = appUtils.createRuleContext
    appUtils.createRuleContext = jest.fn((...args) => {
      const context = original(...args)
      context.events.trigger = jest.fn(context.events.trigger)
      context.events.once = jest.fn(context.events.once)
      context.events.on = jest.fn(context.events.on)
      lastRuleContext = context
      return context
    })
  }
}

describe('registerRule', () => {
  beforeEach(initTest)

  test('returns the given rulerule', () => {
    const result = registerRule.default(rule)
    expect(result).toEqual(rule)
  })

  test('starts addWhen saga when rule has prop "addWhen"', () => {
    rule.addWhen = function* () {}
    rule.addUntil = function* () {}
    saga.startSaga = jest.fn()
    registerRule.default(rule)
    expect(saga.startSaga).toBeCalledWith('addWhen', expect.anything(), expect.anything())
  })

  test('starts addUntil saga when rule has prop "addUntil"', () => {
    rule.addUntil = function* () {}
    saga.startSaga = jest.fn()
    registerRule.default(rule)
    expect(saga.startSaga).toBeCalledWith('addUntil', expect.anything(), expect.anything())
  })

  test('triggers REGISTER_RULE', () => {
    registerRule.default(rule)
    const ruleContext = lastRuleContext
    expect(ruleContext.events.trigger).toBeCalledWith('REGISTER_RULE')
  })

  test('clears context "addWhen" only when saga yields REAPPLY_ADD_WHEN', () => {
    registerRule.default(rule)
    const ruleContext = lastRuleContext
    ruleContext.publicContext.addWhen = {foo:'bar'}
    
    ruleContext.events.trigger('SAGA_END', 'ADD_RULE', 'addWhen')
    expect(ruleContext.publicContext.addWhen).toEqual({foo:'bar'})

    ruleContext.events.trigger('SAGA_END', 'REAPPLY_ADD_WHEN', 'addWhen')
    expect(ruleContext.publicContext.addWhen).toEqual({})
  })

  test('clears context "addUntil" only when saga yields REAPPLY_ADD_UNTIL, READD_RULE, READD_RULE_BEFORE', () => {
    registerRule.default(rule)
    const ruleContext = lastRuleContext
    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.publicContext.addWhen = {foo:'bar'}

    ruleContext.events.trigger('SAGA_END', 'REAPPLY_ADD_UNTIL', 'addUntil')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({foo:'bar'})

    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.events.trigger('SAGA_END', 'READD_RULE', 'addUntil')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({foo:'bar'})

    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.events.trigger('SAGA_END', 'READD_RULE_BEFORE', 'addUntil')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({foo:'bar'})
  })

  test('clears context "addUntil" and "addWhen" only when saga yields RECREATE_RULE, RECREATE_RULE_BEFORE', () => {
    registerRule.default(rule)
    const ruleContext = lastRuleContext
    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.publicContext.addWhen = {foo:'bar'}

    ruleContext.events.trigger('SAGA_END', 'RECREATE_RULE', 'addUntil')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({})

    ruleContext.publicContext.addUntil = {foo:'bar'}
    ruleContext.publicContext.addWhen = {foo:'bar'}

    ruleContext.events.trigger('SAGA_END', 'RECREATE_RULE_BEFORE', 'addUntil')
    expect(ruleContext.publicContext.addUntil).toEqual({})
    expect(ruleContext.publicContext.addWhen).toEqual({})
  })
})

describe.only('startAddWhen', () => {
  beforeEach(initTest)

  test('add rule after action-execution for logic ADD_RULE', () => {
    saga.startSaga = (_,__,cb) => cb({logic:'ADD_RULE'})
    registerRule.testing.startAddWhen(ruleContext)
    expect(ruleDB.addRule).not.toBeCalled()
    ruleContext.events.trigger('END_ACTION_EXECUTION')
    expect(ruleDB.addRule).toBeCalledWith(ruleContext)
  })

  test('add rule instantly for logic ADD_RULE_BEFORE', () => {
    saga.startSaga = (_,__,cb) => cb({logic:'ADD_RULE_BEFORE'})
    registerRule.testing.startAddWhen(ruleContext)
    expect(ruleDB.addRule).toBeCalledWith(ruleContext)
  })

  test.skip('recalls startAddWhen after action-execution for logic REAPPLY_ADD_WHEN', () => {
    // INFINIT LOOP
    saga.startSaga = (_,__,cb) => cb({logic:'REAPPLY_ADD_WHEN'})
    registerRule.testing.startAddWhen = jest.fn(registerRule.testing.startAddWhen)
    registerRule.testing.startAddWhen(ruleContext)
    expect(registerRule.testing.startAddWhen).toBeCalledTimes(1)
    // ruleContext.events.trigger('END_ACTION_EXECUTION')
    expect(registerRule.testing.startAddWhen).toBeCalledTimes(2)
  })
})